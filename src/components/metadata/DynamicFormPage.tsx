import { FormEvent, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useDocTypeConfig } from "../../lib/metadata/doctype-registry";
import { getDocTypeApi } from "./doctype-api-map";
import type { DocFieldMeta, FormLayoutSection } from "../../lib/metadata/types";
import { buildAccessErrorMessage, inferPermissionKeyFromError } from "../../lib/access-control";
import { useDocTypeFieldAccess } from "../../lib/metadata/use-doctype-field-access";
import { useClientScripts } from "../../lib/client-scripts/useClientScripts";

type Props = {
  doctypeKey: string;
  tenantId: string;
  recordId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
  action: "create" | "update";
  initialRecord?: Record<string, unknown> | null;
};

export function DynamicFormPage({
  doctypeKey,
  tenantId,
  recordId,
  onSaved,
  onCancel,
  action,
  initialRecord,
}: Props) {
  const { config, loading: metaLoading, error: metaError } = useDocTypeConfig(doctypeKey);
  const { readableFieldnames, writableFieldnames, loading: accessLoading, error: accessError } = useDocTypeFieldAccess(doctypeKey, tenantId);
  const [record, setRecord] = useState<Record<string, unknown> | null>(initialRecord ?? null);
  const [dataLoading, setDataLoading] = useState(action === "update" && recordId && !initialRecord);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [linkOptions, setLinkOptions] = useState<Record<string, Array<{ id: string; label: string }>>>({});
  const [linkSearch, setLinkSearch] = useState<Record<string, string>>({});
  const [linkFocus, setLinkFocus] = useState<Record<string, boolean>>({});
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const onLoadRun = useRef(false);

  const api = useMemo(() => getDocTypeApi(doctypeKey), [doctypeKey]);

  const fieldMap = useMemo(() => {
    const m = new Map<string, DocFieldMeta>();
    if (config) for (const f of config.fields) m.set(f.fieldname, f);
    return m;
  }, [config]);

  const {
    scripts: clientScripts,
    loading: csLoading,
    overrides: csOverrides,
    runOnLoad,
    runOnFieldChange,
    runBeforeSaveValidation,
  } = useClientScripts(doctypeKey, formValues, fieldMap, tenantId);

  useEffect(() => {
    if (action !== "update" || !recordId || !api) return;
    let cancelled = false;
    setDataLoading(true);
    api.get(recordId, tenantId)
      .then((data) => {
        if (!cancelled) {
          setRecord(data as Record<string, unknown>);
          setFormValues(data as Record<string, unknown>);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Failed to load record");
      })
      .finally(() => { if (!cancelled) setDataLoading(false); });
    return () => { cancelled = true; };
  }, [action, recordId, api, tenantId]);

  useEffect(() => {
    if (!config) return;
    const linkFields = config.fields.filter((f) => f.fieldtype === "Link");
    if (linkFields.length === 0) return;

    const loadOptions = async () => {
      const opts: Record<string, Array<{ id: string; label: string }>> = {};
      for (const lf of linkFields) {
        const linkTo = (lf.options as Record<string, unknown>)?.link_to as string | undefined;
        if (!linkTo) continue;
        const linkApi = getDocTypeApi(linkTo);
        if (!linkApi?.list) continue;
        try {
          const items = await linkApi.list(tenantId) as Array<Record<string, unknown>>;
          const displayField = (lf.options as Record<string, unknown>)?.display_field as string ?? "name";
          opts[lf.fieldname] = items.map((item) => ({
            id: String(item.id),
            label: `${String(item[displayField] ?? "")} - ${String(item.name ?? item.code ?? "")}`,
          }));
        } catch {
          opts[lf.fieldname] = [];
        }
        const currentValue = record?.[lf.fieldname] as string | undefined;
        if (currentValue && opts[lf.fieldname]) {
          const match = opts[lf.fieldname].find((o) => o.id === currentValue);
          if (match) {
            setLinkSearch((prev) => ({ ...prev, [lf.fieldname]: match.label }));
          }
        }
      }
      setLinkOptions(opts);
    };
    void loadOptions();
  }, [config, tenantId, record]);

  useEffect(() => {
    if (!record) return;
    const initial: Record<string, string> = {};
    for (const key of Object.keys(record)) {
      const val = record[key];
      if (val && typeof val === "string") initial[key] = val;
    }
    setLinkValues((prev) => ({ ...prev, ...initial }));
  }, [record]);

  useEffect(() => {
    if (csLoading || clientScripts.length === 0 || onLoadRun.current) return;
    if (action === "update" && !record) return;
    onLoadRun.current = true;
    runOnLoad();
  }, [csLoading, clientScripts, action, record, runOnLoad]);

  const handleFieldChange = useCallback(
    (fieldname: string, rawValue: string) => {
      let value: unknown = rawValue;
      const field = fieldMap.get(fieldname);
      if (field?.fieldtype === "Check") {
        value = rawValue === "on";
      } else if (field?.fieldtype === "Float" || field?.fieldtype === "Int") {
        value = rawValue ? Number(rawValue) : 0;
      }
      setFormValues((prev) => ({ ...prev, [fieldname]: value }));
      runOnFieldChange(fieldname, value);
    },
    [fieldMap, runOnFieldChange],
  );

  const layout = config?.formLayout;
  const sections: FormLayoutSection[] = layout?.sections_json ?? [
    { section: "Details", columns: 2, fields: config?.fields.filter((f) => !f.is_hidden).map((f) => f.fieldname) ?? [] },
  ];

  const isFieldRequired = useCallback(
    (fieldname: string, originalRequired: boolean): boolean => {
      return originalRequired || csOverrides.requiredFields.has(fieldname);
    },
    [csOverrides.requiredFields],
  );

  const isFieldReadonly = useCallback(
    (fieldname: string, originalReadonly: boolean): boolean => {
      return originalReadonly || csOverrides.readonlyFields.has(fieldname);
    },
    [csOverrides.readonlyFields],
  );

  const isFieldVisible = useCallback(
    (fieldname: string): boolean => {
      if (csOverrides.visibleFields.size === 0) return true;
      return csOverrides.visibleFields.has(fieldname);
    },
    [csOverrides.visibleFields],
  );

  useEffect(() => {
    for (const msg of csOverrides.messages) {
      if (msg.level === "error") {
        toast.error(msg.message);
      } else if (msg.level === "warning") {
        toast.warning(msg.message);
      } else {
        toast.info(msg.message);
      }
    }
  }, [csOverrides.messages]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!api) return;
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    const validationErrors: Record<string, string> = {};

    for (const f of config?.fields ?? []) {
      if (f.is_hidden || f.is_readonly || f.fieldname === "id" || !readableFieldnames.has(f.fieldname) || !writableFieldnames.has(f.fieldname)) continue;
      const raw = fd.get(f.fieldname);
      let value: unknown = raw;

      if (f.fieldtype === "Check") {
        value = fd.get(f.fieldname) === "on";
      } else if (f.fieldtype === "Float" || f.fieldtype === "Int") {
        value = raw ? Number(raw) : 0;
      } else if (f.fieldtype === "Link") {
        value = linkValues[f.fieldname] ?? raw;
      }

      if (isFieldRequired(f.fieldname, f.is_required) && (value === "" || value === null || value === undefined)) {
        validationErrors[f.fieldname] = `${f.label} is required.`;
      }

      data[f.fieldname] = value;
    }

    const scriptValidation = runBeforeSaveValidation();
    for (const [key, msg] of Object.entries(scriptValidation)) {
      validationErrors[key] = msg;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      if (action === "create") {
        await api.create?.({ tenant_id: tenantId, ...data });
        toast.success(`${config?.doctype.label} created.`);
      } else if (recordId) {
        await api.update?.(recordId, data, tenantId);
        toast.success(`${config?.doctype.label} updated.`);
      }
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      const isPermissionError = msg.toLowerCase().includes("permission denied") || msg.toLowerCase().includes("access required") || msg.toLowerCase().includes("permission");
      if (isPermissionError) {
        const inferredPrefix = action === "create" ? "create" : "update";
        const permKey = inferPermissionKeyFromError(msg, `${inferredPrefix}_${doctypeKey}`);
        const accessMessage = buildAccessErrorMessage(permKey);
        toast.error(accessMessage);
        setErrors({ form: `${accessMessage}\n\nTechnical details:\n${msg}` });
      } else {
        toast.error(msg);
        setErrors({ form: msg });
      }
    } finally {
      setSaving(false);
    }
  };

  if (metaLoading || dataLoading || accessLoading) {
    return <div className="card state-info">Loading…</div>;
  }

  if (metaError) return <div className="card state-error">{metaError}</div>;
  if (accessError) return <div className="card state-error">{accessError}</div>;
  if (!config) return <div className="card state-error">Unknown DocType: {doctypeKey}</div>;

  const renderField = (field: DocFieldMeta) => {
    if (field.is_hidden || !readableFieldnames.has(field.fieldname)) return null;
    if (!isFieldVisible(field.fieldname)) return null;
    const currentValue = record?.[field.fieldname];
    const defaultValue = field.default_value ?? "";
    const canWriteField = writableFieldnames.has(field.fieldname);
    const readonly = field.is_readonly || !canWriteField || isFieldReadonly(field.fieldname, false) || (action === "update" && (field.fieldname === "created_by" || field.fieldname === "created_at"));
    const required = isFieldRequired(field.fieldname, field.is_required);

    if (field.fieldtype === "Check") {
      return (
        <label key={field.fieldname} className="field field--checkbox">
          <input
            type="checkbox"
            name={field.fieldname}
            defaultChecked={(currentValue as boolean) ?? (defaultValue === "true")}
            disabled={readonly}
            onChange={(e) => handleFieldChange(field.fieldname, e.target.checked ? "on" : "")}
          />
          <span>{field.label}</span>
          {errors[field.fieldname] && <span className="field-error">{errors[field.fieldname]}</span>}
        </label>
      );
    }

    if (field.fieldtype === "Link") {
      const options = linkOptions[field.fieldname] ?? [];
      const search = linkSearch[field.fieldname] ?? "";
      const focused = linkFocus[field.fieldname] ?? false;
      const selectedId = linkValues[field.fieldname] ?? "";
      const filtered = focused && search.length > 0
        ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
        : options;

      return (
        <label key={field.fieldname} className="field field--link">
          <span>{field.label}{required ? " *" : ""}</span>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder={`Search ${field.label}…`}
              value={search}
              onChange={(e) => { setLinkSearch((prev) => ({ ...prev, [field.fieldname]: e.target.value })); handleFieldChange(field.fieldname, e.target.value); }}
              onFocus={() => setLinkFocus((prev) => ({ ...prev, [field.fieldname]: true }))}
              onBlur={() => setTimeout(() => setLinkFocus((prev) => ({ ...prev, [field.fieldname]: false })), 200)}
              required={required && !selectedId}
              disabled={readonly}
              autoComplete="off"
              style={selectedId ? { borderColor: "#4ade80" } : undefined}
            />
            {focused && filtered.length > 0 && (
              <div
                className="typeahead-dropdown"
                style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "#fff", border: "1px solid #e0e7ef", maxHeight: 200, overflowY: "auto" }}
              >
                {filtered.slice(0, 50).map((opt) => (
                  <div
                    key={opt.id}
                    className="typeahead-item"
                    style={{
                      padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #f0f0f0",
                      background: opt.id === selectedId ? "#e8f4fd" : "transparent"
                    }}
                    onMouseDown={() => {
                      setLinkSearch((prev) => ({ ...prev, [field.fieldname]: opt.label }));
                      setLinkFocus((prev) => ({ ...prev, [field.fieldname]: false }));
                      setLinkValues((prev) => ({ ...prev, [field.fieldname]: opt.id }));
                      handleFieldChange(field.fieldname, opt.id);
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors[field.fieldname] && <span className="field-error">{errors[field.fieldname]}</span>}
        </label>
      );
    }

    if (field.fieldtype === "Select") {
      const opts = (field.options as Record<string, unknown>)?.options as string[] ?? [];
      return (
        <label key={field.fieldname} className="field">
          <span>{field.label}{required ? " *" : ""}</span>
          <select
            name={field.fieldname}
            defaultValue={(currentValue as string) ?? defaultValue}
            required={required}
            disabled={readonly}
            onChange={(e) => handleFieldChange(field.fieldname, e.target.value)}
          >
            <option value="">Select {field.label}…</option>
            {opts.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {errors[field.fieldname] && <span className="field-error">{errors[field.fieldname]}</span>}
        </label>
      );
    }

    if (field.fieldtype === "Text") {
      return (
        <label key={field.fieldname} className="field field--wide">
          <span>{field.label}{required ? " *" : ""}</span>
          <textarea
            name={field.fieldname}
            defaultValue={(currentValue as string) ?? defaultValue}
            rows={3}
            required={required}
            disabled={readonly}
            onChange={(e) => handleFieldChange(field.fieldname, e.target.value)}
          />
          {errors[field.fieldname] && <span className="field-error">{errors[field.fieldname]}</span>}
        </label>
      );
    }

    if (field.fieldtype === "Datetime" || field.fieldtype === "Date") {
      return (
        <label key={field.fieldname} className="field">
          <span>{field.label}{required ? " *" : ""}</span>
          <input
            type={field.fieldtype === "Date" ? "date" : "datetime-local"}
            name={field.fieldname}
            defaultValue={(currentValue as string) ? (currentValue as string).slice(0, field.fieldtype === "Date" ? 10 : 16) : defaultValue}
            required={required}
            disabled={readonly}
            onChange={(e) => handleFieldChange(field.fieldname, e.target.value)}
          />
          {errors[field.fieldname] && <span className="field-error">{errors[field.fieldname]}</span>}
        </label>
      );
    }

    const inputType = field.fieldtype === "Float" || field.fieldtype === "Int" ? "number" : "text";

    return (
      <label key={field.fieldname} className="field">
        <span>{field.label}{required ? " *" : ""}</span>
        <input
          type={inputType}
          name={field.fieldname}
          defaultValue={(currentValue as string) ?? defaultValue}
          required={required}
          disabled={readonly}
          min={field.fieldtype === "Float" || field.fieldtype === "Int" ? "0" : undefined}
          step={field.fieldtype === "Float" ? "any" : undefined}
          onChange={(e) => handleFieldChange(field.fieldname, e.target.value)}
        />
        {errors[field.fieldname] && <span className="field-error">{errors[field.fieldname]}</span>}
      </label>
    );
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3>{action === "create" ? "New" : "Edit"} {config.doctype.label}</h3>
      </div>
      <form className="form-grid" onSubmit={handleSubmit} ref={formRef}>
        {sections.map((sec) => (
          <div key={sec.section} style={{ gridColumn: "1 / -1" }}>
            <h4 className="detail-section-title">{sec.section}</h4>
            <div className={sec.columns === 1 ? "" : ""} style={{ display: "contents" }}>
              {sec.fields.map((fn) => {
                const field = fieldMap.get(fn);
                return field ? renderField(field) : null;
              })}
            </div>
          </div>
        ))}
        {errors.form && <div className="state-error" style={{ gridColumn: "1 / -1" }}>{errors.form}</div>}
        <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
          <button type="submit" className="primary-action" disabled={saving}>
            {saving ? "Saving…" : action === "create" ? `Create ${config.doctype.label}` : `Update ${config.doctype.label}`}
          </button>
          <button type="button" className="logout" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
