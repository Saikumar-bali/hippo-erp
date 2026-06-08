import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../supabase";
import { evaluateScripts } from "./sandbox";
import type { ScriptEvent, ClientScriptBody, ScriptEvaluationResult } from "./sandbox";
import type { DocFieldMeta } from "../metadata/types";

interface LoadedScript {
  id: string;
  doctype_key: string;
  script_name: string;
  script_type: string;
  event_name: ScriptEvent;
  script_body: ClientScriptBody;
}

interface Overrides {
  requiredFields: Set<string>;
  readonlyFields: Set<string>;
  visibleFields: Set<string>;
  fieldValues: Record<string, unknown>;
  messages: Array<{ level: string; message: string }>;
}

export function useClientScripts(
  doctypeKey: string,
  formValues: Record<string, unknown>,
  fieldMap: Map<string, DocFieldMeta>,
  companyId?: string,
) {
  const [scripts, setScripts] = useState<LoadedScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<Overrides>({
    requiredFields: new Set(),
    readonlyFields: new Set(),
    visibleFields: new Set(),
    fieldValues: {},
    messages: [],
  });
  const lastChangedField = useRef<string | null>(null);

  useEffect(() => {
    if (!doctypeKey) {
      setScripts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase.rpc("erp_get_client_scripts_for_doctype", {
          p_doctype_key: doctypeKey,
          p_company_id: companyId ?? null,
        });

        if (cancelled) return;

        if (error) {
          console.warn("Failed to load client scripts:", error.message);
          setScripts([]);
          return;
        }

        const result = data as { ok: boolean; data?: LoadedScript[]; error?: string };
        if (result?.ok && Array.isArray(result.data)) {
          setScripts(result.data);
        } else {
          setScripts([]);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("Error loading client scripts:", e);
          setScripts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [doctypeKey, companyId]);

  const evaluateEvent = useCallback(
    (event: ScriptEvent, changedField?: string, changedValue?: unknown): ScriptEvaluationResult => {
      const fieldMeta = new Map<
        string,
        { fieldname: string; fieldtype: string; label: string; is_required: boolean; is_hidden: boolean; is_readonly: boolean }
      >();
      for (const [, f] of fieldMap) {
        fieldMeta.set(f.fieldname, {
          fieldname: f.fieldname,
          fieldtype: f.fieldtype,
          label: f.label,
          is_required: f.is_required,
          is_hidden: f.is_hidden,
          is_readonly: f.is_readonly,
        });
      }

      // Merge changed value into formValues immediately (avoids stale closure)
      const mergedValues = changedField && changedValue !== undefined
        ? { ...formValues, [changedField]: changedValue }
        : formValues;

      return evaluateScripts(scripts, {
        event,
        formValues: mergedValues,
        changedField,
        doctypeKey,
        fieldMeta,
      });
    },
    [scripts, formValues, doctypeKey, fieldMap],
  );

  const applyResult = useCallback((result: ScriptEvaluationResult) => {
    const newOverrides: Overrides = {
      requiredFields: new Set<string>(),
      readonlyFields: new Set<string>(),
      visibleFields: new Set<string>(),
      fieldValues: {},
      messages: [],
    };

    for (const action of result.actions) {
      if (!action.field) continue;
      if (action.type === "setRequired" && action.value === true) {
        newOverrides.requiredFields.add(action.field);
      }
      if (action.type === "setReadOnly" && action.value === true) {
        newOverrides.readonlyFields.add(action.field);
      }
      if (action.type === "setVisible" && action.value === true) {
        newOverrides.visibleFields.add(action.field);
      }
      if (action.type === "setValue") {
        newOverrides.fieldValues[action.field] = action.value;
      }
    }

    for (const msg of result.messages) {
      newOverrides.messages.push(msg);
    }

    setOverrides(newOverrides);
  }, []);

  const runOnLoad = useCallback(() => {
    if (loading || scripts.length === 0) return;
    const result = evaluateEvent("onLoad");
    applyResult(result);
  }, [loading, scripts.length, evaluateEvent, applyResult]);

  const runOnFieldChange = useCallback(
    (changedField: string, newValue?: unknown) => {
      if (loading || scripts.length === 0) return;
      lastChangedField.current = changedField;
      const result = evaluateEvent("onFieldChange", changedField, newValue);
      applyResult(result);
    },
    [loading, scripts.length, evaluateEvent, applyResult],
  );

  const runBeforeSaveValidation = useCallback((): Record<string, string> => {
    if (loading || scripts.length === 0) return {};
    const result = evaluateEvent("beforeSaveClientValidation");
    applyResult(result);
    return result.validationErrors;
  }, [loading, scripts.length, evaluateEvent, applyResult]);

  return {
    scripts,
    loading,
    overrides,
    runOnLoad,
    runOnFieldChange,
    runBeforeSaveValidation,
  };
}
