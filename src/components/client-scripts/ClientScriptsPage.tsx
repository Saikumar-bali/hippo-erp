import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  listClientScripts,
  createClientScript,
  updateClientScript,
  disableClientScript,
  deleteClientScript,
} from "../../lib/client-scripts-api";
import type { ClientScriptRecord } from "../../lib/client-scripts-api";
import type { ScriptEvent } from "../../lib/client-scripts/sandbox";

const EVENT_OPTIONS: ScriptEvent[] = ["onLoad", "onFieldChange", "beforeSaveClientValidation"];

type FormMode = "create" | "edit" | null;

interface FormData {
  id?: string;
  doctype_key: string;
  script_name: string;
  event_name: ScriptEvent;
  script_body: string;
  is_enabled: boolean;
}

const EMPTY_FORM: FormData = {
  doctype_key: "",
  script_name: "",
  event_name: "onLoad",
  script_body: JSON.stringify({ rules: [] }, null, 2),
  is_enabled: true,
};

export function ClientScriptsPage() {
  const [scripts, setScripts] = useState<ClientScriptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listClientScripts();
      setScripts(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load client scripts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setFormMode("create");
  }

  function openEdit(script: ClientScriptRecord) {
    setForm({
      id: script.id,
      doctype_key: script.doctype_key,
      script_name: script.script_name,
      event_name: script.event_name as ScriptEvent,
      script_body: JSON.stringify(script.script_body, null, 2),
      is_enabled: script.is_enabled,
    });
    setFormMode("edit");
  }

  function cancelForm() {
    setFormMode(null);
    setForm({ ...EMPTY_FORM });
  }

  async function handleSave() {
    if (!form.doctype_key || !form.script_name || !form.script_body) {
      toast.error("Doctype, script name, and body are required");
      return;
    }

    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(form.script_body);
    } catch {
      toast.error("Invalid JSON in script body");
      return;
    }

    if (!parsedBody.rules || !Array.isArray(parsedBody.rules)) {
      toast.error("Script body must contain a 'rules' array");
      return;
    }

    setSaving(true);
    try {
      if (formMode === "create") {
        await createClientScript({
          doctype_key: form.doctype_key,
          script_name: form.script_name,
          script_body: parsedBody,
          event_name: form.event_name,
          is_enabled: form.is_enabled,
        });
        toast.success("Client script created");
      } else if (formMode === "edit" && form.id) {
        await updateClientScript({
          id: form.id,
          script_name: form.script_name,
          script_body: parsedBody,
          event_name: form.event_name,
          is_enabled: form.is_enabled,
        });
        toast.success("Client script updated");
      }
      cancelForm();
      void load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save client script");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEnabled(script: ClientScriptRecord) {
    try {
      await disableClientScript(script.id, !script.is_enabled);
      toast.success(script.is_enabled ? "Script disabled" : "Script enabled");
      void load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle script");
    }
  }

  async function handleDelete(script: ClientScriptRecord) {
    if (!window.confirm(`Delete script "${script.script_name}"?`)) return;
    try {
      await deleteClientScript(script.id);
      toast.success("Script deleted");
      void load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete script");
    }
  }

  return (
    <div className="studio-shell">
      <div className="studio-header">
        <h2>Client Scripts</h2>
        <p>Manage client scripts for DocTypes. Scripts use a safe JSON-rule DSL — no raw JavaScript execution.</p>
        <div className="studio-toolbar">
          {formMode ? (
            <button className="logout" onClick={cancelForm}>Cancel</button>
          ) : (
            <button className="primary-action" onClick={openCreate}>+ New Script</button>
          )}
        </div>
      </div>

      {formMode && (
        <div className="studio-panel studio-panel--accent">
          <h3>{formMode === "create" ? "New Client Script" : "Edit Client Script"}</h3>
          <div className="studio-form-columns">
            <label className="field">
              <span>DocType Key *</span>
              <input
                type="text"
                value={form.doctype_key}
                onChange={(e) => setForm((p) => ({ ...p, doctype_key: e.target.value }))}
                disabled={formMode === "edit"}
                required
              />
            </label>
            <label className="field">
              <span>Script Name *</span>
              <input
                type="text"
                value={form.script_name}
                onChange={(e) => setForm((p) => ({ ...p, script_name: e.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Event *</span>
              <select
                value={form.event_name}
                onChange={(e) => setForm((p) => ({ ...p, event_name: e.target.value as ScriptEvent }))}
              >
                {EVENT_OPTIONS.map((ev) => (
                  <option key={ev} value={ev}>{ev}</option>
                ))}
              </select>
            </label>
            <label className="field field--wide">
              <span>Script Body (JSON) *</span>
              <textarea
                value={form.script_body}
                onChange={(e) => setForm((p) => ({ ...p, script_body: e.target.value }))}
                rows={12}
                style={{ fontFamily: "monospace", fontSize: "12px" }}
                required
              />
            </label>
            <label className="field field--checkbox">
              <input
                type="checkbox"
                checked={form.is_enabled}
                onChange={(e) => setForm((p) => ({ ...p, is_enabled: e.target.checked }))}
              />
              <span>Enabled</span>
            </label>
          </div>
          <div className="studio-actions">
            <button className="primary-action" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : formMode === "create" ? "Create" : "Update"}
            </button>
            <button className="logout" onClick={cancelForm}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card state-info">Loading client scripts…</div>
      ) : scripts.length === 0 ? (
        <div className="card state-info">No client scripts found. Create one to get started.</div>
      ) : (
        <table className="erp-table">
          <thead>
            <tr>
              <th>DocType</th>
              <th>Script Name</th>
              <th>Event</th>
              <th>Status</th>
              <th>Standard</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {scripts.map((s) => (
              <tr key={s.id}>
                <td>{s.doctype_key}</td>
                <td>{s.script_name}</td>
                <td>{s.event_name}</td>
                <td>{s.is_enabled ? "Enabled" : "Disabled"}</td>
                <td>{s.is_standard ? "Yes" : "No"}</td>
                <td>
                  <button className="link-button" onClick={() => openEdit(s)} style={{ marginRight: 4 }}>Edit</button>
                  <button className="link-button" onClick={() => handleToggleEnabled(s)}>
                    {s.is_enabled ? "Disable" : "Enable"}
                  </button>
                  {!s.is_standard && (
                    <button className="link-button" style={{ color: "#c00", marginLeft: 4 }} onClick={() => handleDelete(s)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="studio-panel studio-panel--muted" style={{ marginTop: 16 }}>
        <h4>About Client Scripts</h4>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          Client scripts use a JSON-rule DSL (not JavaScript) to define safe form behavior.
          Rules define conditions and actions — when a field value matches, actions like
          <code> setRequired</code>, <code> setVisible</code>, or <code> showMessage</code> are applied.
          Scripts run in a sandbox with no access to <code>window</code>, <code>document</code>,
          <code> localStorage</code>, or <code>fetch</code>. Backend permissions are never bypassed.
        </p>
      </div>
    </div>
  );
}
