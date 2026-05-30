import { useCallback, useEffect, useState } from "react";
import {
  loadModuleKeys,
  loadWorkspaceKeys,
  loadExistingPermissionKeys,
  checkDuplicateDoctypeKey,
  checkDuplicateWorkspaceItem,
  checkDuplicateRoute,
  createCustomDocTypeBundle,
} from "../../lib/metadata/metadata-studio-api";

type WizardField = {
  fieldname: string;
  label: string;
  fieldtype: string;
  is_required: boolean;
  in_list_view: boolean;
  in_standard_filter: boolean;
  sort_order: number;
};

type WizardAction = {
  action_key: string;
  permission_key: string;
};

type WizardState = {
  label: string;
  doctype_key: string;
  module_key: string;
  route: string;
  storage_strategy: "generic_json" | "physical_rpc";
  is_company_scoped: boolean;
  description: string;
  fields: WizardField[];
  actions: WizardAction[];
  workspace_key: string;
  workspace_item_label: string;
};

const FIELD_TYPES = ["Data", "Text", "Int", "Float", "Check", "Select", "Link", "Date", "Datetime"];

const STEPS = [
  "Basic Info",
  "Fields",
  "List View",
  "Form Layout",
  "Actions",
  "Workspace",
  "Preview & Create",
];

function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^_|_$/g, "");
}

function pluralize(str: string): string {
  if (str.endsWith("s") || str.endsWith("x") || str.endsWith("z") || str.endsWith("ch") || str.endsWith("sh"))
    return str + "es";
  if (str.endsWith("y") && str.length > 1 && !/[aeiou]y$/i.test(str))
    return str.slice(0, -1) + "ies";
  return str + "s";
}

function getInitialState(): WizardState {
  return {
    label: "",
    doctype_key: "",
    module_key: "",
    route: "",
    storage_strategy: "generic_json",
    is_company_scoped: true,
    description: "",
    fields: [],
    actions: [
      { action_key: "read", permission_key: "" },
      { action_key: "create", permission_key: "" },
      { action_key: "update", permission_key: "" },
      { action_key: "deactivate", permission_key: "" },
    ],
    workspace_key: "",
    workspace_item_label: "",
  };
}

type Props = {
  onClose: () => void;
  onCreated?: () => void;
  onSidebarRefresh?: () => void;
  onDocTypeCreated?: (doctypeKey: string) => void;
};

export function CustomDocTypeWizard({ onClose, onCreated, onSidebarRefresh, onDocTypeCreated }: Props) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(getInitialState);
  const [modules, setModules] = useState<{ value: string; label: string }[]>([]);
  const [workspaces, setWorkspaces] = useState<{ value: string; label: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateDocTypeKey, setDuplicateDocTypeKey] = useState(false);
  const [duplicateRoute, setDuplicateRoute] = useState(false);
  const [duplicateWorkspaceItem, setDuplicateWorkspaceItem] = useState(false);
  const [existingPermissionKeys, setExistingPermissionKeys] = useState<Set<string>>(new Set());
  const [bundleResult, setBundleResult] = useState<{ permissions_created: number; grants_added: number } | null>(null);
  const [sidebarRefreshed, setSidebarRefreshed] = useState(false);

  useEffect(() => {
    loadModuleKeys().then(setModules).catch(() => {});
    loadWorkspaceKeys().then(setWorkspaces).catch(() => {});
    loadExistingPermissionKeys()
      .then((keys) => setExistingPermissionKeys(new Set(keys)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!state.doctype_key) { setDuplicateDocTypeKey(false); return; }
    let cancelled = false;
    checkDuplicateDoctypeKey(state.doctype_key).then((dup) => { if (!cancelled) setDuplicateDocTypeKey(dup); }).catch(() => {});
    return () => { cancelled = true; };
  }, [state.doctype_key]);

  useEffect(() => {
    if (!state.route) { setDuplicateRoute(false); return; }
    let cancelled = false;
    checkDuplicateRoute(state.route).then((dup) => { if (!cancelled) setDuplicateRoute(dup); }).catch(() => {});
    return () => { cancelled = true; };
  }, [state.route]);

  useEffect(() => {
    if (!state.workspace_key || !state.doctype_key) { setDuplicateWorkspaceItem(false); return; }
    let cancelled = false;
    checkDuplicateWorkspaceItem(state.workspace_key, state.doctype_key).then((dup) => { if (!cancelled) setDuplicateWorkspaceItem(dup); }).catch(() => {});
    return () => { cancelled = true; };
  }, [state.workspace_key, state.doctype_key]);

  const set = useCallback(<K extends keyof WizardState>(key: K, val: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }, []);

  const updateField = useCallback((idx: number, field: Partial<WizardField>) => {
    setState((prev) => {
      const fields = [...prev.fields];
      fields[idx] = { ...fields[idx], ...field };
      return { ...prev, fields };
    });
  }, []);

  const removeField = useCallback((idx: number) => {
    setState((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== idx),
    }));
  }, []);

  const addField = useCallback(() => {
    setState((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          fieldname: "",
          label: "",
          fieldtype: "Data",
          is_required: false,
          in_list_view: false,
          in_standard_filter: false,
          sort_order: prev.fields.length + 1,
        },
      ],
    }));
  }, []);

  const updateAction = useCallback((idx: number, val: string) => {
    setState((prev) => {
      const actions = [...prev.actions];
      actions[idx] = { ...actions[idx], permission_key: val };
      return { ...prev, actions };
    });
  }, []);

  function validateStep(stepNum: number): boolean {
    const newErrors: Record<string, string> = {};

    if (stepNum === 0) {
      if (!state.label.trim()) newErrors.label = "Label is required";
      if (!state.doctype_key.trim()) newErrors.doctype_key = "DocType key is required";
      else if (!/^[a-z][a-z0-9_]*$/.test(state.doctype_key))
        newErrors.doctype_key = "Must be lowercase snake_case starting with a letter";
      else if (state.doctype_key !== state.doctype_key.toLowerCase())
        newErrors.doctype_key = "Uppercase characters are not allowed";
      else if (duplicateDocTypeKey)
        newErrors.doctype_key = "This DocType key already exists";
      if (state.route && duplicateRoute)
        newErrors.route = "This route conflicts with an existing DocType route";
      if (!state.module_key) newErrors.module_key = "Module is required";
      if (state.storage_strategy !== "generic_json")
        newErrors.storage_strategy = "Custom DocTypes must use generic_json";
    }

    if (stepNum === 1) {
      if (state.fields.length === 0) newErrors.fields = "Add at least one field";
      const hasDataField = state.fields.some((f) => f.fieldtype === "Data" || f.fieldtype === "Text");
      if (!hasDataField) newErrors.fields = "At least one Data or Text field is required for name/title";
      const names = new Set<string>();
      for (let i = 0; i < state.fields.length; i++) {
        const f = state.fields[i];
        if (!f.label.trim()) newErrors[`field_${i}_label`] = "Label is required";
        if (!f.fieldname.trim()) newErrors[`field_${i}_fieldname`] = "Fieldname is required";
        else if (!/^[a-z][a-z0-9_]*$/.test(f.fieldname))
          newErrors[`field_${i}_fieldname`] = "Must be lowercase snake_case";
        else if (names.has(f.fieldname))
          newErrors[`field_${i}_fieldname`] = "Duplicate fieldname";
        else names.add(f.fieldname);
        if (!FIELD_TYPES.includes(f.fieldtype))
          newErrors[`field_${i}_fieldtype`] = "Invalid field type";
      }
    }

    if (stepNum === 2) {
      const inListView = state.fields.filter((f) => f.in_list_view);
      if (inListView.length === 0) newErrors.list_view = "At least one field must have 'In List View' checked";
    }

    if (stepNum === 4) {
      for (let i = 0; i < state.actions.length; i++) {
        if (!state.actions[i].permission_key.trim())
          newErrors[`action_${i}`] = "Permission key is required";
      }
    }

    if (stepNum === 5) {
      if (!state.workspace_key) newErrors.workspace_key = "Workspace is required";
      else if (duplicateWorkspaceItem)
        newErrors.workspace_key = "A workspace item with this key already exists in this workspace";
      if (!state.workspace_item_label.trim())
        newErrors.workspace_item_label = "Workspace item label is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleCreate() {
    if (!validateStep(6)) return;
    if (duplicateDocTypeKey) { setError("DocType key already exists — choose a different key"); return; }
    if (duplicateWorkspaceItem) { setError("Workspace item key already exists — choose a different key"); return; }
    setCreating(true);
    setError(null);

    try {
      const result = await createCustomDocTypeBundle({
        doctype_key: state.doctype_key,
        module_key: state.module_key,
        label: state.label,
        description: state.description || null,
        route: state.route || null,
        storage_strategy: state.storage_strategy,
        is_company_scoped: state.is_company_scoped,
        fields: state.fields,
        actions: state.actions,
        workspace_key: state.workspace_key,
        workspace_item_label: state.workspace_item_label,
      });

      setBundleResult({
        permissions_created: result.permissions_created,
        grants_added: result.grants_added,
      });
      setCreated(true);
      onCreated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setCreating(false);
    }
  }

  function handleOpenCreated() {
    if (onDocTypeCreated) {
      onDocTypeCreated(state.doctype_key);
    }
    onClose();
  }

  async function handleRefreshSidebar() {
    if (onSidebarRefresh) {
      await onSidebarRefresh();
      setSidebarRefreshed(true);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    fontSize: "var(--font-size-sm)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    background: "var(--bg)",
    color: "var(--fg)",
    boxSizing: "border-box",
    minHeight: "var(--control-height)",
  };

  const btnStyle: React.CSSProperties = {
    padding: "6px 14px",
    fontSize: "var(--font-size-sm)",
    cursor: "pointer",
    minHeight: "var(--control-height)",
    borderRadius: "var(--border-radius-sm)",
  };

  const fieldBtnStyle: React.CSSProperties = {
    padding: "2px 8px",
    fontSize: "var(--font-size-xs)",
    cursor: "pointer",
    borderRadius: "var(--border-radius-sm)",
  };

  if (created) {
    const checklist = [
      { label: "DocType created", done: true },
      { label: "Fields created", done: true },
      { label: "List View created", done: true },
      { label: "Form Layout created", done: true },
      { label: "Actions created", done: true },
      { label: "Permissions created/granted", done: (bundleResult?.permissions_created ?? 0) > 0 || (bundleResult?.grants_added ?? 0) > 0 },
      { label: "Workspace Item created", done: true },
      { label: "Ready to create records", done: true },
    ];

    return (
      <div className="card" style={{ padding: "var(--card-padding)", maxWidth: "600px", margin: "0 auto" }}>
        <div className="form-success" style={{ marginBottom: "12px" }}>
          Custom DocType "<strong>{state.label}</strong>" created successfully.
          {bundleResult && (
            <span style={{ fontSize: "var(--font-size-xs)", display: "block", marginTop: "4px" }}>
              Permissions created: {bundleResult.permissions_created} | Grants added to owner/admin: {bundleResult.grants_added}
            </span>
          )}
        </div>

        <div style={{ marginBottom: "12px" }}>
          <p style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: "6px" }}>Completion Checklist:</p>
          {checklist.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--font-size-sm)", marginBottom: "3px" }}>
              <span style={{ color: item.done ? "var(--primary, #0f5f63)" : "var(--muted)" }}>
                {item.done ? "✓" : "○"}
              </span>
              <span style={{ color: item.done ? "var(--fg)" : "var(--muted)" }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button className="btn" onClick={handleOpenCreated} style={btnStyle}>
              Open Created DocType
            </button>
            <button className="btn" onClick={onClose} style={btnStyle}>
              Close
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="logout"
              onClick={handleRefreshSidebar}
              style={{ ...btnStyle, fontSize: "var(--font-size-xs)" }}
              disabled={!onSidebarRefresh}
            >
              {sidebarRefreshed ? "✓ Sidebar Refreshed" : "Refresh Sidebar"}
            </button>
            {sidebarRefreshed && (
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--primary)" }}>
                Sidebar updated — open the workspace to find your new DocType
              </span>
            )}
            {!sidebarRefreshed && (
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>
                Or refresh the page to see it in the sidebar
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderStepIndicator = () => (
    <div style={{ display: "flex", gap: "4px", marginBottom: "16px", overflow: "auto" }}>
      {STEPS.map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            borderRadius: "var(--border-radius-sm)",
            fontSize: "var(--font-size-xs)",
            fontWeight: i === step ? 700 : 400,
            background: i === step ? "var(--primary-light, #e0f2f1)" : "transparent",
            color: i <= step ? "var(--primary, #0f5f63)" : "var(--muted)",
            whiteSpace: "nowrap",
            cursor: "default",
          }}
        >
          <span
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: i <= step ? "#0f5f63" : "#d7e3f4",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            {i + 1}
          </span>
          {s}
        </div>
      ))}
    </div>
  );

  const renderFieldError = (key: string) => {
    if (!errors[key]) return null;
    return <span style={{ color: "var(--danger)", fontSize: "var(--font-size-xs)" }}>{errors[key]}</span>;
  };

  const renderStep0 = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
          DocType Label <span style={{ color: "var(--danger)" }}>*</span>
        </span>
        <input
          type="text"
          value={state.label}
          onChange={(e) => {
            const v = e.target.value;
            set("label", v);
            set("doctype_key", toSnakeCase(v));
            set("route", toSnakeCase(v));
            set("workspace_item_label", pluralize(v));
          }}
          style={inputStyle}
          placeholder="e.g. Supplier"
        />
        {renderFieldError("label")}
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
          DocType Key <span style={{ color: "var(--danger)" }}>*</span>
        </span>
        <input
          type="text"
          value={state.doctype_key}
          onChange={(e) => set("doctype_key", toSnakeCase(e.target.value))}
          style={{ ...inputStyle, fontFamily: "monospace" }}
          placeholder="supplier"
        />
        {renderFieldError("doctype_key")}
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
          Module <span style={{ color: "var(--danger)" }}>*</span>
        </span>
        <select
          value={state.module_key}
          onChange={(e) => set("module_key", e.target.value)}
          style={inputStyle}
        >
          <option value="">-- Select Module --</option>
          {modules.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {renderFieldError("module_key")}
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>Route</span>
        <input
          type="text"
          value={state.route}
          onChange={(e) => set("route", toSnakeCase(e.target.value))}
          style={inputStyle}
          placeholder="supplier"
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
          Storage Strategy <span style={{ color: "var(--danger)" }}>*</span>
        </span>
        <select
          value={state.storage_strategy}
          onChange={(e) => set("storage_strategy", e.target.value as "generic_json" | "physical_rpc")}
          style={inputStyle}
        >
          <option value="generic_json">generic_json (recommended for custom DocTypes)</option>
          <option value="physical_rpc" disabled>physical_rpc (migration-only)</option>
        </select>
        {renderFieldError("storage_strategy")}
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="checkbox"
          checked={state.is_company_scoped}
          onChange={(e) => set("is_company_scoped", e.target.checked)}
          style={{ width: "18px", height: "18px", cursor: "pointer" }}
        />
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>Company Scoped</span>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>Description</span>
        <textarea
          value={state.description}
          onChange={(e) => set("description", e.target.value)}
          style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
          placeholder="Optional description"
        />
      </label>
    </div>
  );

  const renderStep1 = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
          Fields ({state.fields.length})
        </span>
        <button className="btn" onClick={addField} style={fieldBtnStyle}>
          + Add Field
        </button>
      </div>
      {renderFieldError("fields")}
      {state.fields.length === 0 ? (
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--muted)" }}>
          No fields defined yet. Click "+ Add Field" to start.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {state.fields.map((f, i) => (
            <div
              key={i}
              style={{
                padding: "8px",
                border: "1px solid var(--border, #d7e3f4)",
                borderRadius: "var(--border-radius-sm)",
                background: "var(--bg-card, #fff)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>Field #{i + 1}</span>
                <button
                  className="logout"
                  onClick={() => removeField(i)}
                  style={{ ...fieldBtnStyle, color: "var(--danger)" }}
                >
                  Remove
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600 }}>Label *</span>
                  <input
                    type="text"
                    value={f.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateField(i, { label: v, fieldname: toSnakeCase(v) || f.fieldname });
                    }}
                    style={inputStyle}
                    placeholder="Full Name"
                  />
                  {renderFieldError(`field_${i}_label`)}
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600 }}>Fieldname *</span>
                  <input
                    type="text"
                    value={f.fieldname}
                    onChange={(e) => updateField(i, { fieldname: toSnakeCase(e.target.value) })}
                    style={{ ...inputStyle, fontFamily: "monospace" }}
                    placeholder="full_name"
                  />
                  {renderFieldError(`field_${i}_fieldname`)}
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600 }}>Field Type *</span>
                  <select
                    value={f.fieldtype}
                    onChange={(e) => updateField(i, { fieldtype: e.target.value })}
                    style={inputStyle}
                  >
                    {FIELD_TYPES.map((ft) => (
                      <option key={ft} value={ft}>{ft}</option>
                    ))}
                  </select>
                  {renderFieldError(`field_${i}_fieldtype`)}
                </label>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", paddingBottom: "2px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={f.is_required}
                      onChange={(e) => updateField(i, { is_required: e.target.checked })}
                    />
                    Req
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={f.in_list_view}
                      onChange={(e) => updateField(i, { in_list_view: e.target.checked })}
                    />
                    List
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={f.in_standard_filter}
                      onChange={(e) => updateField(i, { in_standard_filter: e.target.checked })}
                    />
                    Filter
                  </label>
                </div>
              </div>
              <div style={{ marginTop: "4px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: 600 }}>
                  Sort Order:
                  <input
                    type="number"
                    value={f.sort_order}
                    onChange={(e) => updateField(i, { sort_order: parseInt(e.target.value) || 0 })}
                    style={{
                      ...inputStyle,
                      width: "60px",
                      padding: "2px 6px",
                      minHeight: "20px",
                    }}
                    min={0}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => {
    const listFields = state.fields.filter((f) => f.in_list_view);
    const searchFields = state.fields.filter((f) => f.fieldtype === "Data" || f.fieldtype === "Text");

    return (
      <div>
        <p style={{ fontSize: "var(--font-size-sm)", marginBottom: "8px" }}>
          Columns are auto-generated from fields with <strong>List</strong> checked.
        </p>
        {renderFieldError("list_view")}
        {listFields.length === 0 ? (
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--muted)" }}>
            No list columns. Check <strong>List</strong> on at least one field in Step 2.
          </p>
        ) : (
          <div style={{ overflowX: "auto", marginBottom: "12px" }}>
            <table className="erp-table" style={{ minWidth: "100%" }}>
              <thead>
                <tr>
                  <th style={{ fontSize: "var(--font-size-xs)" }}>Field</th>
                  <th style={{ fontSize: "var(--font-size-xs)" }}>Label</th>
                </tr>
              </thead>
              <tbody>
                {listFields.map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: "monospace", fontSize: "var(--font-size-sm)" }}>{f.fieldname}</td>
                    <td style={{ fontSize: "var(--font-size-sm)" }}>{f.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ fontSize: "var(--font-size-sm)", marginBottom: "4px" }}>
          <strong>Search Fields:</strong> {searchFields.length > 0
            ? searchFields.map((f) => f.fieldname).join(", ")
            : "No Data/Text fields found"}
        </p>
      </div>
    );
  };

  const renderStep3 = () => {
    const sectionFields = state.fields.map((f) => f.fieldname);
    return (
      <div>
        <p style={{ fontSize: "var(--font-size-sm)", marginBottom: "8px" }}>
          Form layout is auto-generated with a single <strong>Basic Info</strong> section containing all fields.
        </p>
        <div
          style={{
            padding: "8px",
            border: "1px solid var(--border, #d7e3f4)",
            borderRadius: "var(--border-radius-sm)",
          }}
        >
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, marginBottom: "4px" }}>
            Section: Basic Info (1 column)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {sectionFields.length === 0 ? (
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--muted)" }}>No fields</span>
            ) : (
              sectionFields.map((fn, i) => (
                <span key={i} style={{ fontSize: "var(--font-size-sm)", fontFamily: "monospace", padding: "2px 4px", background: "#f5f7fa", borderRadius: "2px" }}>
                  {fn}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    const permStatus = (key: string) => {
      if (!key) return "";
      return existingPermissionKeys.has(key)
        ? " (exists in catalog — no new permission created)"
        : " (new — will be created and granted to owner/admin)";
    };

    return (
      <div>
        <p style={{ fontSize: "var(--font-size-sm)", marginBottom: "8px" }}>
          Map each action to a permission key. New keys will be auto-created in the permission
          catalog and granted to <strong>owner</strong> and <strong>admin</strong> roles.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {state.actions.map((a, i) => (
            <div key={a.action_key} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, textTransform: "capitalize" }}>
                {a.action_key}
              </span>
              <label style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
                <input
                  type="text"
                  value={a.permission_key}
                  onChange={(e) => updateAction(i, e.target.value)}
                  style={{ ...inputStyle, fontFamily: "monospace" }}
                  placeholder={`e.g. view_${state.doctype_key || "items"}`}
                />
                {a.permission_key && (
                  <span style={{ fontSize: "10px", color: existingPermissionKeys.has(a.permission_key) ? "var(--muted)" : "var(--primary)" }}>
                    {permStatus(a.permission_key)}
                  </span>
                )}
                {renderFieldError(`action_${i}`)}
              </label>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)", marginTop: "8px" }}>
          Permissions are granted to owner and admin roles only. Other roles must be updated
          manually via Roles & Permissions.
        </p>
      </div>
    );
  };

  const renderStep5 = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
          Workspace <span style={{ color: "var(--danger)" }}>*</span>
        </span>
        <select
          value={state.workspace_key}
          onChange={(e) => set("workspace_key", e.target.value)}
          style={inputStyle}
        >
          <option value="">-- Select Workspace --</option>
          {workspaces.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
        {renderFieldError("workspace_key")}
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
          Sidebar Item Label <span style={{ color: "var(--danger)" }}>*</span>
        </span>
        <input
          type="text"
          value={state.workspace_item_label}
          onChange={(e) => set("workspace_item_label", e.target.value)}
          style={inputStyle}
          placeholder="e.g. Suppliers"
        />
        {renderFieldError("workspace_item_label")}
      </label>

      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--muted)", padding: "8px", background: "#f5f7fa", borderRadius: "var(--border-radius-sm)" }}>
        <strong>Preview:</strong> Item type = <code>doctype</code>, target = <code>{state.doctype_key || "(doctype key)"}</code>,
        required_permission_key = <code>{state.actions.find((a) => a.action_key === "read")?.permission_key || "(read permission)"}</code>
      </div>
    </div>
  );

  const renderStep6 = () => {
    const listFields = state.fields.filter((f) => f.in_list_view);
    const sectionFields = state.fields.map((f) => f.fieldname);

    return (
      <div>
        <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, marginBottom: "8px" }}>
          Review the complete metadata that will be created:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <PreviewSection title="DocType" items={[
            { label: "Key", value: state.doctype_key },
            { label: "Label", value: state.label },
            { label: "Module", value: state.module_key },
            { label: "Route", value: state.route || "(same as key)" },
            { label: "Storage", value: state.storage_strategy },
            { label: "Company Scoped", value: state.is_company_scoped ? "Yes" : "No" },
          ]} />
          <PreviewSection title={`DocFields (${state.fields.length})`} items={state.fields.map((f) => ({
            label: f.fieldname,
            value: `${f.fieldtype}${f.is_required ? " *" : ""}${f.in_list_view ? " [list]" : ""}`,
          }))} />
          <PreviewSection title="List View" items={[
            { label: "View Key", value: `${state.doctype_key}_default` },
            { label: "Columns", value: listFields.map((f) => f.fieldname).join(", ") || "(none)" },
          ]} />
          <PreviewSection title="Form Layout" items={[
            { label: "Layout Key", value: `${state.doctype_key}_default` },
            { label: "Sections", value: `Basic Info (${sectionFields.length} fields)` },
          ]} />
          <PreviewSection title="DocType Actions" items={state.actions.map((a) => ({
            label: a.action_key,
            value: a.permission_key,
          }))} />
          <PreviewSection title="Workspace Item" items={[
            { label: "Workspace", value: state.workspace_key },
            { label: "Label", value: state.workspace_item_label },
            { label: "Target", value: state.doctype_key },
          ]} />
        </div>
      </div>
    );
  };

  const stepContent = [
    renderStep0,
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
    renderStep5,
    renderStep6,
  ];

  return (
    <div className="card" style={{ padding: "var(--card-padding)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "var(--font-size-md)" }}>
          Create Custom DocType — {STEPS[step]}
        </h3>
        <button className="logout" onClick={onClose} style={{ padding: "4px 10px", fontSize: "var(--font-size-xs)", cursor: "pointer" }}>
          Close
        </button>
      </div>

      {renderStepIndicator()}

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "var(--font-size-sm)", marginBottom: "8px", padding: "6px 8px", background: "#fff0ec", borderRadius: "var(--border-radius-sm)" }}>
          {error}
        </p>
      )}

      <div style={{ minHeight: "300px" }}>
        {stepContent[step]()}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px", paddingTop: "8px", borderTop: "1px solid var(--border, #d7e3f4)" }}>
        <button
          className="logout"
          onClick={step === 0 ? onClose : handleBack}
          style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer" }}
        >
          {step === 0 ? "Cancel" : "Back"}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            className="btn"
            onClick={handleNext}
            style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer" }}
          >
            Next
          </button>
        ) : (
          <button
            className="btn"
            onClick={handleCreate}
            disabled={creating}
            style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1 }}
          >
            {creating ? "Creating..." : "Create DocType"}
          </button>
        )}
      </div>
    </div>
  );
}

function PreviewSection({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div
      style={{
        padding: "6px 8px",
        border: "1px solid var(--border, #d7e3f4)",
        borderRadius: "var(--border-radius-sm)",
        background: "#fafbfc",
      }}
    >
      <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, marginBottom: "4px", color: "var(--primary, #0f5f63)" }}>
        {title}
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "4px", fontSize: "var(--font-size-sm)", marginBottom: "2px" }}>
          <span style={{ fontWeight: 600, color: "var(--muted)" }}>{item.label}:</span>
          <span style={{ fontFamily: "monospace" }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
