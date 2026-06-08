import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listModules, createModule, updateModule, deactivateModule, reactivateModule, deleteModuleIfUnused } from "../../lib/metadata/module-manager-api";
import type { ModuleRecord } from "../../lib/metadata/module-manager-api";
import { toSnakeCase } from "./builder-utils";

type FormMode = "create" | "edit";

type ModuleFormData = {
  id: string;
  module_key: string;
  label: string;
  description: string;
  icon: string;
  route: string;
  sort_order: number;
  is_active: boolean;
};

const emptyForm: ModuleFormData = {
  id: "",
  module_key: "",
  label: "",
  description: "",
  icon: "",
  route: "",
  sort_order: 0,
  is_active: true,
};

type Props = {
  onNavigate?: (itemKey: string) => void;
};

export function ModuleManager({ onNavigate }: Props) {
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [form, setForm] = useState<ModuleFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ModuleRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listModules();
      setModules(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load modules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeModules = useMemo(() => modules.filter((m) => m.is_active), [modules]);
  const inactiveModules = useMemo(() => modules.filter((m) => !m.is_active), [modules]);

  function openCreate() {
    setFormMode("create");
    setForm(emptyForm);
  }

  function openEdit(module: ModuleRecord) {
    setFormMode("edit");
    setForm({
      id: module.id,
      module_key: module.module_key,
      label: module.label,
      description: module.description ?? "",
      icon: module.icon ?? "",
      route: module.route ?? "",
      sort_order: module.sort_order,
      is_active: module.is_active,
    });
  }

  function cancelForm() {
    setFormMode(null);
    setForm(emptyForm);
  }

  function set<K extends keyof ModuleFormData>(key: K, value: ModuleFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.label.trim()) { toast.error("Label is required"); return; }
    if (!form.module_key.trim()) { toast.error("Module key is required"); return; }
    if (!/^[a-z][a-z0-9_]*$/.test(form.module_key)) {
      toast.error("Module key must be lowercase snake_case");
      return;
    }

    setSaving(true);
    try {
      if (formMode === "create") {
        await createModule({
          module_key: form.module_key,
          label: form.label.trim(),
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || undefined,
          route: form.route.trim() || undefined,
          sort_order: form.sort_order,
        });
        toast.success(`Module "${form.label}" created`);
      } else {
        await updateModule(form.id, {
          label: form.label.trim(),
          description: form.description.trim() || null,
          icon: form.icon.trim() || null,
          route: form.route.trim() || null,
          sort_order: form.sort_order,
          is_active: form.is_active,
        });
        toast.success(`Module "${form.label}" updated`);
      }
      cancelForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save module");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(module: ModuleRecord) {
    try {
      if (module.is_active) {
        await deactivateModule(module.id);
        toast.success(`Module "${module.label}" deactivated`);
      } else {
        await reactivateModule(module.id);
        toast.success(`Module "${module.label}" reactivated`);
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle module status");
    }
  }

  async function handleDelete(module: ModuleRecord) {
    try {
      await deleteModuleIfUnused(module.id);
      toast.success(`Module "${module.label}" deleted`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Cannot delete "${module.label}"`);
      setConfirmDelete(null);
    }
  }

  function handleLabelChange(label: string) {
    setForm((prev) => ({
      ...prev,
      label,
      module_key: formMode === "edit" ? prev.module_key : toSnakeCase(label),
    }));
  }

  if (loading) {
    return (
      <div className="studio-shell">
        <div className="studio-header">
          <h3>Module Manager</h3>
        </div>
        <div className="state-info">Loading modules…</div>
      </div>
    );
  }

  return (
    <div className="studio-shell">
      <div className="studio-header">
        <div>
          <p className="studio-kicker">Metadata Studio</p>
          <h3>Module Manager</h3>
          <p style={{ marginTop: "6px", maxWidth: "720px" }}>
            Create and manage ERP modules used by DocTypes. This is a focused manager for <code>app.erp_modules</code>.
            Deactivate instead of delete when possible. Modules referenced by DocTypes cannot be deleted.
          </p>
        </div>
        <div className="studio-toolbar">
          {!formMode && (
            <button className="studio-button" type="button" onClick={openCreate} style={{ padding: "6px 14px", fontSize: "14px", fontWeight: "500", backgroundColor: "#ffffff", color: "#006666", border: "1px solid #006666", borderRadius: "6px", cursor: "pointer" }}>
              + New Module
            </button>
          )}
          {formMode && (
            <button className="studio-button" type="button" onClick={cancelForm} style={{ padding: "6px 14px", fontSize: "14px", fontWeight: "500", backgroundColor: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {formMode && (
        <div className="studio-panel studio-panel--accent" style={{ marginBottom: "16px" }}>
          <div className="studio-header" style={{ marginBottom: "12px" }}>
            <strong>{formMode === "create" ? "Create Module" : "Edit Module"}</strong>
          </div>
          <div className="studio-form-columns">
            <label className="studio-field">
              <span>Label</span>
              <input value={form.label} onChange={(e) => handleLabelChange(e.target.value)} placeholder="Inventory" />
            </label>
            <label className="studio-field">
              <span>Module Key</span>
              <input
                value={form.module_key}
                onChange={(e) => set("module_key", toSnakeCase(e.target.value))}
                placeholder="inventory"
                disabled={formMode === "edit"}
              />
            </label>
            <label className="studio-field">
              <span>Description</span>
              <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Inventory management module" />
            </label>
            <label className="studio-field">
              <span>Icon</span>
              <input value={form.icon} onChange={(e) => set("icon", e.target.value)} placeholder="Package" />
            </label>
            <label className="studio-field">
              <span>Route</span>
              <input value={form.route} onChange={(e) => set("route", e.target.value)} placeholder="inventory" />
            </label>
            <label className="studio-field">
              <span>Sort Order</span>
              <input type="number" value={form.sort_order} onChange={(e) => set("sort_order", parseInt(e.target.value) || 0)} />
            </label>
            {formMode === "edit" && (
              <label className="studio-field">
                <span>Active</span>
                <label className="studio-check">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
                  <span>{form.is_active ? "Active" : "Inactive"}</span>
                </label>
              </label>
            )}
          </div>
          <div className="studio-actions" style={{ justifyContent: "flex-end", marginTop: "12px" }}>
            <button className="studio-button" type="button" onClick={handleSave} disabled={saving} style={{ padding: "6px 14px", fontSize: "14px", fontWeight: "500", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : formMode === "create" ? "Create Module" : "Save Module"}
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="studio-panel" style={{ marginBottom: "16px", border: "1px solid #ffc9c9", background: "#fff5f5" }}>
          <div className="studio-header" style={{ marginBottom: "8px" }}>
            <strong style={{ color: "#e03131" }}>Delete Module "{confirmDelete.label}"?</strong>
          </div>
          {confirmDelete.doctype_count > 0 ? (
            <p style={{ fontSize: "14px", color: "#e03131" }}>
              Cannot delete. This module is referenced by {confirmDelete.doctype_count} active DocType(s).
              Deactivate instead.
            </p>
          ) : (
            <>
              <p style={{ fontSize: "14px", color: "#334155", marginBottom: "8px" }}>
                This will permanently delete the module. This action cannot be undone.
              </p>
              <div className="studio-toolbar" style={{ gap: "8px" }}>
                <button className="studio-button" type="button" onClick={() => handleDelete(confirmDelete)} style={{ padding: "6px 14px", fontSize: "14px", fontWeight: "500", backgroundColor: "#e03131", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                  Confirm Delete
                </button>
                <button className="studio-button" type="button" onClick={() => setConfirmDelete(null)} style={{ padding: "6px 14px", fontSize: "14px", fontWeight: "500", backgroundColor: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </>
          )}
          {confirmDelete.doctype_count > 0 && (
            <div className="studio-toolbar" style={{ marginTop: "8px" }}>
              <button className="studio-button" type="button" onClick={() => { handleToggleActive(confirmDelete); setConfirmDelete(null); }} style={{ padding: "6px 14px", fontSize: "14px", fontWeight: "500", backgroundColor: "#ffffff", color: "#006666", border: "1px solid #006666", borderRadius: "6px", cursor: "pointer" }}>
                Deactivate Instead
              </button>
            </div>
          )}
        </div>
      )}

      {!formMode && (
        <>
          {/* Active Modules */}
          <div className="studio-home-section">
            <h3 className="studio-kicker" style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "8px" }}>
              Active Modules ({activeModules.length})
            </h3>
            {activeModules.length === 0 ? (
              <div className="studio-panel studio-panel--muted" style={{ padding: "16px", textAlign: "center", color: "var(--muted)" }}>
                No active modules found. Create a module to get started.
              </div>
            ) : (
              <ModuleList
                modules={activeModules}
                onEdit={openEdit}
                onToggleActive={handleToggleActive}
                onDelete={(m) => setConfirmDelete(m)}
              />
            )}
          </div>

          {/* Inactive Modules */}
          {inactiveModules.length > 0 && (
            <div className="studio-home-section" style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
              <h3 className="studio-kicker" style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "8px" }}>
                Inactive Modules ({inactiveModules.length})
              </h3>
              <ModuleList
                modules={inactiveModules}
                onEdit={openEdit}
                onToggleActive={handleToggleActive}
                onDelete={(m) => setConfirmDelete(m)}
              />
            </div>
          )}
        </>
      )}

      {/* Navigation hint */}
      <div className="studio-panel studio-panel--warm" style={{ marginTop: "16px" }}>
        <p style={{ fontSize: "13px" }}>
          <strong>Next:</strong> After creating a module, go to <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.("metadata_studio_doctype_builder"); }} style={{ color: "#006666", textDecoration: "underline", cursor: "pointer" }}>DocType Builder</a> to create DocTypes using this module.
        </p>
      </div>
    </div>
  );
}

function ModuleList({
  modules,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  modules: ModuleRecord[];
  onEdit: (m: ModuleRecord) => void;
  onToggleActive: (m: ModuleRecord) => void;
  onDelete: (m: ModuleRecord) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="erp-table" style={{ minWidth: "100%" }}>
        <thead>
          <tr>
            <th style={{ fontSize: "var(--font-size-xs)" }}>Key</th>
            <th style={{ fontSize: "var(--font-size-xs)" }}>Label</th>
            <th style={{ fontSize: "var(--font-size-xs)" }}>Description</th>
            <th style={{ fontSize: "var(--font-size-xs)" }}>Icon</th>
            <th style={{ fontSize: "var(--font-size-xs)" }}>Route</th>
            <th style={{ fontSize: "var(--font-size-xs)" }}>Sort</th>
            <th style={{ fontSize: "var(--font-size-xs)" }}>DocTypes</th>
            <th style={{ fontSize: "var(--font-size-xs)" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((mod) => (
            <tr key={mod.id}>
              <td style={{ fontFamily: "monospace", fontSize: "var(--font-size-sm)" }}>{mod.module_key}</td>
              <td style={{ fontSize: "var(--font-size-sm)" }}>{mod.label}</td>
              <td style={{ fontSize: "var(--font-size-sm)", color: "var(--muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {mod.description ?? "—"}
              </td>
              <td style={{ fontSize: "var(--font-size-sm)" }}>{mod.icon ?? "—"}</td>
              <td style={{ fontFamily: "monospace", fontSize: "var(--font-size-sm)" }}>{mod.route ?? "—"}</td>
              <td style={{ fontSize: "var(--font-size-sm)" }}>{mod.sort_order}</td>
              <td style={{ fontSize: "var(--font-size-sm)" }}>
                <span style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  backgroundColor: mod.doctype_count > 0 ? "#e0f2f1" : "#f1f3f5",
                  color: mod.doctype_count > 0 ? "#006666" : "#868e96",
                }}>
                  {mod.doctype_count}
                </span>
              </td>
              <td>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => onEdit(mod)}
                    style={{ padding: "2px 8px", fontSize: "11px", cursor: "pointer", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff" }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleActive(mod)}
                    style={{ padding: "2px 8px", fontSize: "11px", cursor: "pointer", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff", color: mod.is_active ? "#e03131" : "#006666" }}
                  >
                    {mod.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(mod)}
                    disabled={mod.doctype_count > 0}
                    style={{
                      padding: "2px 8px", fontSize: "11px", cursor: mod.doctype_count > 0 ? "not-allowed" : "pointer",
                      border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff",
                      color: mod.doctype_count > 0 ? "#adb5bd" : "#e03131", opacity: mod.doctype_count > 0 ? 0.5 : 1,
                    }}
                    title={mod.doctype_count > 0 ? "Cannot delete: referenced by DocTypes" : "Delete module"}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
