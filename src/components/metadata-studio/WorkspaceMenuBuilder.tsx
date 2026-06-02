import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  METADATA_STUDIO_WORKSPACE_ITEM_TYPES,
  createRecord,
  listDocTypeActionsForDoctype,
  listWorkspaceItemsForWorkspace,
  loadDocTypeKeys,
  loadWorkspaceKeys,
  updateRecord,
} from "../../lib/metadata/metadata-studio-api";
import { nextSortOrder, toSnakeCase } from "./builder-utils";

type BuilderItem = {
  id?: string;
  workspace_key: string;
  item_key: string;
  label: string;
  item_type: "doctype" | "workspace" | "page" | "report" | "external";
  target: string;
  required_permission_key: string;
  sort_order: number;
  is_active: boolean;
};

const KNOWN_PAGE_TARGETS = [
  { value: "company_profile", label: "Company Profile" },
  { value: "users_and_roles", label: "Users and Roles" },
  { value: "grn", label: "GRN" },
  { value: "current_inventory", label: "Current Inventory" },
  { value: "movements", label: "Inventory Movements" },
  { value: "metadata_studio", label: "Metadata Studio Home" },
  { value: "metadata_studio_doctype_builder", label: "DocType Builder" },
  { value: "metadata_studio_field_builder", label: "Field Builder" },
  { value: "metadata_studio_list_view_builder", label: "List View Builder" },
  { value: "metadata_studio_form_layout_builder", label: "Form Layout Builder" },
  { value: "metadata_studio_workspace_menu_builder", label: "Workspace Menu Builder" },
  { value: "metadata_studio_access_builder", label: "Access Builder" },
  { value: "metadata_studio_doc_check", label: "Check / Repair DocType" },
];

function emptyItem(workspaceKey: string, sortOrder: number): BuilderItem {
  return {
    workspace_key: workspaceKey,
    item_key: "",
    label: "",
    item_type: "doctype",
    target: "",
    required_permission_key: "",
    sort_order: sortOrder,
    is_active: true,
  };
}

export function WorkspaceMenuBuilder() {
  const [workspaces, setWorkspaces] = useState<Array<{ value: string; label: string }>>([]);
  const [docTypes, setDocTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [editing, setEditing] = useState<BuilderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadWorkspaceItems(workspaceKey: string) {
    if (!workspaceKey) {
      setItems([]);
      setEditing(null);
      return;
    }
    const rows = await listWorkspaceItemsForWorkspace(workspaceKey);
    setItems(rows);
    setEditing((prev) => prev ?? emptyItem(workspaceKey, nextSortOrder(rows)));
  }

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      try {
        const [workspaceRows, doctypeRows] = await Promise.all([loadWorkspaceKeys(), loadDocTypeKeys()]);
        if (cancelled) return;
        setWorkspaces(workspaceRows);
        setDocTypes(doctypeRows);
        const first = workspaceRows[0]?.value ?? "";
        setSelectedWorkspace(first);
        await loadWorkspaceItems(first);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load Menu Builder");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentTargetOptions = useMemo(() => {
    if (!editing) return [];
    if (editing.item_type === "doctype") return docTypes;
    if (editing.item_type === "page") return KNOWN_PAGE_TARGETS;
    if (editing.item_type === "workspace") return workspaces;
    return [];
  }, [docTypes, editing, workspaces]);

  async function applyDocTypeSuggestions(doctypeKey: string) {
    if (!editing) return;
    const actions = await listDocTypeActionsForDoctype(doctypeKey);
    const readAction = actions.find((action) => String(action.action_key) === "read");
    const label = docTypes.find((docType) => docType.value === doctypeKey)?.label.split(" (")[0] ?? doctypeKey;
    setEditing((prev) => prev ? ({
      ...prev,
      target: doctypeKey,
      item_key: prev.item_key || doctypeKey,
      label: prev.label || label,
      required_permission_key: prev.required_permission_key || String(readAction?.permission_key ?? `view_${doctypeKey}`),
    }) : prev);
  }

  async function handleSave() {
    if (!editing || !selectedWorkspace) {
      toast.error("Select a workspace first.");
      return;
    }
    if (!editing.label.trim() || !editing.item_key.trim() || !editing.target.trim()) {
      toast.error("Label, item key, and target are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        workspace_key: selectedWorkspace,
        item_key: toSnakeCase(editing.item_key),
        label: editing.label.trim(),
        item_type: editing.item_type,
        target: editing.target.trim(),
        icon: null,
        sort_order: editing.sort_order,
        is_active: editing.is_active,
        required_permission_key: editing.required_permission_key.trim() || null,
      };

      if (editing.id) {
        await updateRecord("workspace_items", editing.id, payload);
      } else {
        await createRecord("workspace_items", payload);
      }

      toast.success(`Saved menu item ${editing.label}`);
      await loadWorkspaceItems(selectedWorkspace);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save menu item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="studio-shell">
      <div className="studio-header">
        <div>
          <p className="studio-kicker">Navigation</p>
          <h3>Workspace Menu Builder</h3>
          <p>
            Add and edit workspace items with dropdown targets for DocTypes and known pages.
          </p>
        </div>
        <select
          className="studio-control"
          value={selectedWorkspace}
          onChange={async (event) => {
            const workspaceKey = event.target.value;
            setSelectedWorkspace(workspaceKey);
            await loadWorkspaceItems(workspaceKey);
          }}
          style={{ minWidth: "280px" }}
        >
          <option value="">Select Workspace</option>
          {workspaces.map((workspace) => (
            <option key={workspace.value} value={workspace.value}>
              {workspace.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="state-info">Loading Workspace Menu Builder…</div>
      ) : (
        <>
          <div className="studio-grid studio-grid--two">
            <div className="studio-panel">
              <div className="studio-header" style={{ alignItems: "center", marginBottom: "10px" }}>
                <strong>Menu Items</strong>
                <button
                  className="studio-button"
                  type="button"
                  onClick={() => setEditing(emptyItem(selectedWorkspace, nextSortOrder(items)))}
                  disabled={!selectedWorkspace}
                >
                  New Item
                </button>
              </div>
              <div className="studio-item-list">
                {items.map((item) => (
                  <button
                    key={String(item.id)}
                    type="button"
                    className="studio-item"
                    onClick={() => setEditing({
                      id: String(item.id),
                      workspace_key: String(item.workspace_key),
                      item_key: String(item.item_key ?? ""),
                      label: String(item.label ?? ""),
                      item_type: String(item.item_type ?? "doctype") as BuilderItem["item_type"],
                      target: String(item.target ?? ""),
                      required_permission_key: String(item.required_permission_key ?? ""),
                      sort_order: Number(item.sort_order ?? 0),
                      is_active: Boolean(item.is_active ?? true),
                    })}
                  >
                    <span>{String(item.label ?? item.item_key)}</span>
                    <code>{String(item.target ?? "")}</code>
                  </button>
                ))}
                {items.length === 0 && <span style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>No items in this workspace yet.</span>}
              </div>
            </div>

            <div className="studio-panel">
              <strong>Edit Item</strong>
              {editing ? (
                <>
                  <div className="studio-form-columns">
                    <label className="studio-field">
                      <span>Label</span>
                      <input value={editing.label} onChange={(event) => setEditing((prev) => prev ? { ...prev, label: event.target.value } : prev)} />
                    </label>
                    <label className="studio-field">
                      <span>Item Key</span>
                      <input value={editing.item_key} onChange={(event) => setEditing((prev) => prev ? { ...prev, item_key: toSnakeCase(event.target.value) } : prev)} />
                    </label>
                    <label className="studio-field">
                      <span>Item Type</span>
                      <select
                        value={editing.item_type}
                        onChange={(event) => setEditing((prev) => prev ? {
                          ...prev,
                          item_type: event.target.value as BuilderItem["item_type"],
                          target: "",
                        } : prev)}
                      >
                        {METADATA_STUDIO_WORKSPACE_ITEM_TYPES.map((itemType) => (
                          <option key={itemType} value={itemType}>
                            {itemType}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="studio-field">
                      <span>Sort Order</span>
                      <input
                        type="number"
                        value={editing.sort_order}
                        onChange={(event) => setEditing((prev) => prev ? { ...prev, sort_order: Number(event.target.value) || 0 } : prev)}
                      />
                    </label>
                  </div>

                  {currentTargetOptions.length > 0 ? (
                    <label className="studio-field">
                      <span>Target</span>
                      <select
                        value={editing.target}
                        onChange={async (event) => {
                          const target = event.target.value;
                          if (editing.item_type === "doctype") {
                            await applyDocTypeSuggestions(target);
                            return;
                          }
                          setEditing((prev) => prev ? { ...prev, target } : prev);
                        }}
                      >
                        <option value="">Select target</option>
                        {currentTargetOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="studio-field">
                      <span>Target</span>
                      <input value={editing.target} onChange={(event) => setEditing((prev) => prev ? { ...prev, target: event.target.value } : prev)} />
                    </label>
                  )}

                  <label className="studio-field">
                    <span>Required Permission</span>
                    <input
                      value={editing.required_permission_key}
                      onChange={(event) => setEditing((prev) => prev ? { ...prev, required_permission_key: event.target.value } : prev)}
                      placeholder="view_purchase_invoice"
                    />
                  </label>

                  <label className="studio-check">
                    <input
                      type="checkbox"
                      checked={editing.is_active}
                      onChange={(event) => setEditing((prev) => prev ? { ...prev, is_active: event.target.checked } : prev)}
                    />
                    <span>{editing.is_active ? "Active" : "Inactive"}</span>
                  </label>

                  <div className="studio-hint">
                    DocType items auto-suggest the item key and read permission when you pick a target from the dropdown.
                  </div>
                </>
              ) : (
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>Choose a workspace item to edit or start a new one.</span>
              )}
            </div>
          </div>

          <div className="studio-actions" style={{ justifyContent: "flex-end" }}>
            <button className="studio-button" type="button" onClick={handleSave} disabled={saving || !editing}>
              {saving ? "Saving..." : "Save Menu Item"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
