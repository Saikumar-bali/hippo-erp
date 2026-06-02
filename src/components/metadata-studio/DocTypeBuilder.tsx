import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  METADATA_STUDIO_SCHEMA_OPTIONS,
  METADATA_STUDIO_STORAGE_OPTIONS,
  checkDuplicateDoctypeKey,
  createRecord,
  getDocTypeRecord,
  listAllDoctypes,
  loadModuleKeys,
  updateRecord,
} from "../../lib/metadata/metadata-studio-api";
import { toSnakeCase } from "./builder-utils";

type DocTypeFormState = {
  id?: string;
  label: string;
  doctype_key: string;
  module_key: string;
  schema_name: "app" | "wh";
  storage_strategy: "generic_json" | "physical_rpc";
  is_company_scoped: boolean;
  description: string;
};

const emptyState: DocTypeFormState = {
  label: "",
  doctype_key: "",
  module_key: "",
  schema_name: "app",
  storage_strategy: "generic_json",
  is_company_scoped: true,
  description: "",
};

function tableNameFor(storage: DocTypeFormState["storage_strategy"], doctypeKey: string) {
  return storage === "generic_json" ? "erp_documents" : doctypeKey;
}

type Props = {
  initialDocTypeKey?: string;
  onDocTypeSaved?: (doctypeKey: string) => void;
};

export function DocTypeBuilder({ initialDocTypeKey = "", onDocTypeSaved }: Props) {
  const [selectedDocTypeKey, setSelectedDocTypeKey] = useState(initialDocTypeKey);
  const [docTypes, setDocTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [modules, setModules] = useState<Array<{ value: string; label: string }>>([]);
  const [state, setState] = useState<DocTypeFormState>(emptyState);
  const [manualKey, setManualKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState(false);

  async function loadOptions(preferredKey?: string) {
    setLoading(true);
    try {
      const [doctypeRows, moduleRows] = await Promise.all([listAllDoctypes(), loadModuleKeys()]);
      const nextDocTypes = doctypeRows.map((row) => ({
        value: String(row.doctype_key),
        label: `${String(row.doctype_key)} (${String(row.label ?? row.doctype_key)})`,
      }));
      setDocTypes(nextDocTypes);
      setModules(moduleRows);

      const targetKey = preferredKey ?? selectedDocTypeKey;
      if (targetKey) {
        const record = await getDocTypeRecord(targetKey);
        if (record) {
          setState({
            id: String(record.id),
            label: String(record.label ?? ""),
            doctype_key: String(record.doctype_key ?? ""),
            module_key: String(record.module_key ?? ""),
            schema_name: String(record.schema_name ?? "app") === "wh" ? "wh" : "app",
            storage_strategy: String(record.storage_strategy ?? "generic_json") === "physical_rpc" ? "physical_rpc" : "generic_json",
            is_company_scoped: Boolean(record.is_company_scoped ?? true),
            description: String(record.description ?? ""),
          });
          setManualKey(true);
          setSelectedDocTypeKey(targetKey);
          return;
        }
      }

      setState(emptyState);
      setManualKey(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load DocType Builder");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOptions(initialDocTypeKey);
    // initialDocTypeKey is only used to seed the first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state.doctype_key || (state.id && state.doctype_key === selectedDocTypeKey)) {
      setDuplicate(false);
      return;
    }
    let cancelled = false;
    checkDuplicateDoctypeKey(state.doctype_key)
      .then((value) => {
        if (!cancelled) setDuplicate(value);
      })
      .catch(() => {
        if (!cancelled) setDuplicate(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state.doctype_key, state.id, selectedDocTypeKey]);

  const routePreview = useMemo(() => state.doctype_key || "(auto route)", [state.doctype_key]);
  const tableName = useMemo(
    () => tableNameFor(state.storage_strategy, state.doctype_key || "your_doctype"),
    [state.doctype_key, state.storage_strategy],
  );

  function set<K extends keyof DocTypeFormState>(key: K, value: DocTypeFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function handleLabelChange(label: string) {
    const nextKey = toSnakeCase(label);
    setState((prev) => ({
      ...prev,
      label,
      doctype_key: manualKey ? prev.doctype_key : nextKey,
    }));
  }

  async function handleSave() {
    if (!state.label.trim() || !state.doctype_key.trim() || !state.module_key) {
      toast.error("Label, key, and module are required.");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(state.doctype_key)) {
      toast.error("DocType key must be lowercase snake_case.");
      return;
    }
    if (duplicate) {
      toast.error("This DocType key already exists.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        doctype_key: state.doctype_key,
        module_key: state.module_key,
        label: state.label.trim(),
        description: state.description.trim() || null,
        schema_name: state.storage_strategy === "generic_json" ? "app" : state.schema_name,
        table_name: tableNameFor(state.storage_strategy, state.doctype_key),
        route: state.doctype_key,
        storage_strategy: state.storage_strategy,
        is_company_scoped: state.is_company_scoped,
        is_submittable: false,
        is_child_table: false,
        is_single: false,
        is_active: true,
        default_order_by: "updated_at desc",
      };

      if (state.id) {
        await updateRecord("doctypes", state.id, payload);
        toast.success(`Updated ${state.label}`);
      } else {
        await createRecord("doctypes", payload);
        toast.success(`Created ${state.label}`);
      }

      await loadOptions(state.doctype_key);
      onDocTypeSaved?.(state.doctype_key);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save DocType");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="studio-shell">
      <div className="studio-header">
        <div>
          <p className="studio-kicker">Foundation</p>
          <h3>DocType Builder</h3>
          <p>
            Create and edit DocTypes with guided defaults instead of raw table rows.
          </p>
        </div>
        <div className="studio-toolbar">
          <select
            className="studio-control"
            value={selectedDocTypeKey}
            onChange={async (event) => {
              const key = event.target.value;
              if (!key) {
                setSelectedDocTypeKey("");
                setState(emptyState);
                setManualKey(false);
                return;
              }
              setSelectedDocTypeKey(key);
              const record = await getDocTypeRecord(key);
              if (!record) return;
              setState({
                id: String(record.id),
                label: String(record.label ?? ""),
                doctype_key: String(record.doctype_key ?? ""),
                module_key: String(record.module_key ?? ""),
                schema_name: String(record.schema_name ?? "app") === "wh" ? "wh" : "app",
                storage_strategy: String(record.storage_strategy ?? "generic_json") === "physical_rpc" ? "physical_rpc" : "generic_json",
                is_company_scoped: Boolean(record.is_company_scoped ?? true),
                description: String(record.description ?? ""),
              });
              setManualKey(true);
            }}
            style={{ minWidth: "260px" }}
          >
            <option value="">New DocType</option>
            {docTypes.map((docType) => (
              <option key={docType.value} value={docType.value}>
                {docType.label}
              </option>
            ))}
          </select>
          <button
            className="studio-button studio-button--ghost"
            onClick={() => {
              setSelectedDocTypeKey("");
              setState(emptyState);
              setManualKey(false);
            }}
            type="button"
          >
            New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="state-info">Loading DocType Builder…</div>
      ) : (
        <>
          <div className="studio-form-columns">
            <label className="studio-field">
              <span>Label</span>
              <input value={state.label} onChange={(event) => handleLabelChange(event.target.value)} placeholder="Purchase Invoice" />
            </label>
            <label className="studio-field">
              <span>Key</span>
              <input
                value={state.doctype_key}
                onChange={(event) => {
                  setManualKey(true);
                  set("doctype_key", toSnakeCase(event.target.value));
                }}
                placeholder="purchase_invoice"
              />
              {duplicate && <span style={{ fontSize: "10px", color: "var(--danger)" }}>This key already exists.</span>}
            </label>
            <label className="studio-field">
              <span>Module</span>
              <select value={state.module_key} onChange={(event) => set("module_key", event.target.value)}>
                <option value="">Select module</option>
                {modules.map((module) => (
                  <option key={module.value} value={module.value}>
                    {module.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="studio-field">
              <span>Schema</span>
              <select
                value={state.storage_strategy === "generic_json" ? "app" : state.schema_name}
                onChange={(event) => set("schema_name", event.target.value === "wh" ? "wh" : "app")}
                disabled={state.storage_strategy === "generic_json"}
              >
                {METADATA_STUDIO_SCHEMA_OPTIONS.map((schema) => (
                  <option key={schema} value={schema}>
                    {schema}
                  </option>
                ))}
              </select>
            </label>
            <label className="studio-field">
              <span>Storage</span>
              <select
                value={state.storage_strategy}
                onChange={(event) => set("storage_strategy", event.target.value === "physical_rpc" ? "physical_rpc" : "generic_json")}
              >
                {METADATA_STUDIO_STORAGE_OPTIONS.map((storage) => (
                  <option key={storage} value={storage}>
                    {storage}
                  </option>
                ))}
              </select>
            </label>
            <label className="studio-field">
              <span>Company Scoped</span>
              <label className="studio-check">
                <input
                  type="checkbox"
                  checked={state.is_company_scoped}
                  onChange={(event) => set("is_company_scoped", event.target.checked)}
                />
                <span>{state.is_company_scoped ? "Enabled" : "Disabled"}</span>
              </label>
            </label>
          </div>

          <label className="studio-field">
            <span>Description</span>
            <textarea
              value={state.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="Generic_json demo DocType for Purchase Invoices"
              style={{ minHeight: "84px", resize: "vertical" }}
            />
          </label>

          <div className="studio-metric-grid">
            <div className="studio-metric">
              <strong>Save Preview</strong>
              <div className="studio-subtle">
                <div>Route: <code>{routePreview}</code></div>
                <div>Table: <code>{tableName}</code></div>
                <div>Schema: <code>{state.storage_strategy === "generic_json" ? "app" : state.schema_name}</code></div>
              </div>
            </div>
            <div className="studio-metric studio-panel--muted">
              <strong>Builder Guidance</strong>
              <div className="studio-subtle">
                <div>`generic_json` DocTypes store records in <code>app.erp_documents</code>.</div>
                <div>`physical_rpc` is metadata-only here and should stay for advanced cases.</div>
              </div>
            </div>
          </div>

          <div className="studio-actions" style={{ justifyContent: "flex-end" }}>
            <button className="studio-button" type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : state.id ? "Save DocType" : "Create DocType"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
