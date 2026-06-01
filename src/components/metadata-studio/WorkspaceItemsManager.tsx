import { useCallback, useEffect, useMemo, useState } from "react";
import { listAllWorkspaceItems, createRecord, updateRecord, deleteRecord, loadWorkspaceKeys } from "../../lib/metadata/metadata-studio-api";
import { MetadataFormDialog } from "./MetadataFormDialog";
import { TABLES } from "../../lib/metadata/metadata-studio-api";
import { Search, Filter } from "lucide-react";
import { toast } from "sonner";

type FilterState = {
  workspace_key: string;
  item_type: string;
  active: string;
};

type GroupedRows = Record<string, Record<string, unknown>[]>;

function badgeStyle(variant: "type" | "active" | "inactive"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 6px",
    borderRadius: "10px",
    fontSize: "var(--font-size-xs)",
    fontWeight: 600,
    lineHeight: "18px",
  };
  if (variant === "type") return { ...base, background: "#e8f4f8", color: "#0a6e7a" };
  if (variant === "active") return { ...base, background: "#e6f7e6", color: "#1a7d1a" };
  return { ...base, background: "#fce8e6", color: "#c62828" };
}

export function WorkspaceItemsManager() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({ workspace_key: "", item_type: "", active: "" });
  const [workspaceOptions, setWorkspaceOptions] = useState<{ value: string; label: string }[]>([]);
  const [formState, setFormState] = useState<{ mode: "create" | "edit"; record: Record<string, unknown> } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Record<string, unknown> | null>(null);

  const tableMeta = TABLES["workspace_items"];

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listAllWorkspaceItems()
      .then((data) => { setRows(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    loadWorkspaceKeys().then(setWorkspaceOptions).catch(() => {});
  }, []);

  const handleUpdate = async (values: Record<string, unknown>) => {
    await updateRecord("workspace_items", values.id as string, values);
    load();
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const row = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteRecord("workspace_items", row.id as string);
      load();
      toast.success("Item deleted successfully", {
        action: {
          label: "Undo",
          onClick: async () => {
            await createRecord("workspace_items", row);
            load();
          },
        },
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const filteredRows = useMemo(() => {
    let list = rows;
    if (filters.workspace_key) list = list.filter((r) => r.workspace_key === filters.workspace_key);
    if (filters.item_type) list = list.filter((r) => r.item_type === filters.item_type);
    if (filters.active === "active") list = list.filter((r) => r.is_active === true);
    else if (filters.active === "inactive") list = list.filter((r) => r.is_active === false);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) =>
        ["workspace_key", "item_key", "label", "target", "required_permission_key"].some((k) => {
          const v = r[k];
          return v !== null && v !== undefined && String(v).toLowerCase().includes(q);
        })
      );
    }
    return list;
  }, [rows, filters, searchQuery]);

  const grouped = useMemo(() => {
    const g: GroupedRows = {};
    for (const row of filteredRows) {
      const key = (row.workspace_key as string) || "(none)";
      if (!g[key]) g[key] = [];
      g[key].push(row);
    }
    return g;
  }, [filteredRows]);

  const itemTypes = useMemo(() => {
    const s = new Set(rows.map((r) => r.item_type as string).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  const filterStyle: React.CSSProperties = {
    padding: "6px 10px", fontSize: "var(--font-size-sm)", border: "1px solid var(--border)",
    borderRadius: "4px", background: "var(--bg)", color: "var(--fg)", minWidth: "140px"
  };

  if (loading) return <div className="card" style={{ padding: "var(--card-padding)", textAlign: "center", color: "var(--muted)" }}><p>Loading Workspace Items...</p></div>;
  if (error) return <div className="card state-info" style={{ padding: "var(--card-padding)" }}><p style={{ color: "var(--danger)" }}>Error: {error}</p></div>;

  return (
    <div className="card" style={{ padding: "var(--card-padding)", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <h3 style={{ margin: 0 }}>Workspace Items</h3>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)", margin: "2px 0 0" }}>
            {filteredRows.length} of {rows.length} record{rows.length !== 1 ? "s" : ""}
            {Object.keys(grouped).length > 0 && ` across ${Object.keys(grouped).length} workspace${Object.keys(grouped).length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button className="btn" onClick={() => {
          const empty: Record<string, unknown> = {};
          if (tableMeta) {
            for (const f of tableMeta.fields) {
              if (f.default !== undefined) empty[f.name] = f.default;
              else empty[f.name] = f.type === "boolean" ? false : "";
            }
          }
          setFormState({ mode: "create", record: empty });
        }}
          style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer" }}>
          + New Item
        </button>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", padding: "12px", background: "var(--bg)", borderRadius: "var(--border-radius-sm)", border: "1px solid var(--border)" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", color: "var(--muted)", pointerEvents: "none" }} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search label, key, target..."
            style={{ padding: "6px 10px 6px 32px", fontSize: "var(--font-size-sm)", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg)", color: "var(--fg)", width: "220px" }} />
        </div>
        
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Filter size={14} style={{ color: "var(--muted)" }} />
          <select value={filters.workspace_key} onChange={(e) => setFilters((p) => ({ ...p, workspace_key: e.target.value }))} style={filterStyle}>
            <option value="">All Workspaces</option>
            {workspaceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filters.item_type} onChange={(e) => setFilters((p) => ({ ...p, item_type: e.target.value }))} style={filterStyle}>
            <option value="">All Types</option>
            {itemTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.active} onChange={(e) => setFilters((p) => ({ ...p, active: e.target.value }))} style={filterStyle}>
            <option value="">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          {(searchQuery || filters.workspace_key || filters.item_type || filters.active) && (
            <button className="logout" onClick={() => { setSearchQuery(""); setFilters({ workspace_key: "", item_type: "", active: "" }); }}
              style={{ padding: "6px 10px", fontSize: "var(--font-size-xs)" }}>Reset</button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "var(--border-radius-sm)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", margin: 0, fontWeight: 500 }}>No workspace items found.</p>
          <p style={{ fontSize: "var(--font-size-xs)", margin: "4px 0 0" }}>Start by creating your first navigation item.</p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "var(--border-radius-sm)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", margin: 0 }}>No items match the current filters.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 300px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
          {Object.entries(grouped).map(([wsKey, wsRows]) => (
            <div key={wsKey} style={{ border: "1px solid var(--border)", borderRadius: "var(--border-radius-sm)", overflow: "hidden" }}>
              <div style={{ background: "var(--card-bg, #f8f9fa)", padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
                <h4 style={{ fontSize: "12px", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--primary)" }}>
                  {wsKey.replace(/_/g, " ")}
                </h4>
                <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>
                  ({wsRows.length})
                </span>
              </div>
              <table className="erp-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "transparent" }}>
                    <th style={{ fontSize: "10px", padding: "8px 12px", borderBottom: "1px solid var(--border)", textAlign: "left" }}>Label & Key</th>
                    <th style={{ fontSize: "10px", padding: "8px 12px", borderBottom: "1px solid var(--border)", textAlign: "left" }}>Type</th>
                    <th style={{ fontSize: "10px", padding: "8px 12px", borderBottom: "1px solid var(--border)", textAlign: "left" }}>Target</th>
                    <th style={{ fontSize: "10px", padding: "8px 12px", borderBottom: "1px solid var(--border)", textAlign: "left" }}>Permission</th>
                    <th style={{ fontSize: "10px", padding: "8px 12px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>Sort</th>
                    <th style={{ fontSize: "10px", padding: "8px 12px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>Status</th>
                    <th style={{ width: "100px", padding: "8px 12px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wsRows.sort((a,b) => (a.sort_order as number || 0) - (b.sort_order as number || 0)).map((row) => (
                    <tr key={row.id as string}
                      style={{ 
                        opacity: row.is_active ? 1 : 0.5,
                        background: row.is_active ? "transparent" : "var(--bg-light, #fcfcfc)",
                        borderBottom: "1px solid var(--border-light, #f1f3f5)"
                      }}>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{row.label as string}</div>
                        <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "ui-monospace, monospace" }}>{row.item_key as string}</div>
                      </td>
                      <td style={{ padding: "8px 12px" }}><span style={badgeStyle("type")}>{row.item_type as string}</span></td>
                      <td style={{ padding: "8px 12px", fontSize: "11px", fontFamily: "ui-monospace, monospace", color: "var(--muted)" }}>{row.target as string}</td>
                      <td style={{ padding: "8px 12px", fontSize: "11px", fontFamily: "ui-monospace, monospace", color: "var(--muted)" }}>{row.required_permission_key as string || "—"}</td>
                      <td style={{ padding: "8px 12px", fontSize: "var(--font-size-xs)", textAlign: "center", fontWeight: 500 }}>{row.sort_order as number ?? "0"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}><span style={badgeStyle(row.is_active ? "active" : "inactive")}>{row.is_active ? "Active" : "Inactive"}</span></td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button className="logout" onClick={() => setFormState({ mode: "edit", record: { ...row } })}
                            style={{ padding: "2px 6px", fontSize: "10px", cursor: "pointer", borderRadius: "3px" }}>Edit</button>
                          <button className="logout" onClick={() => setConfirmDelete(row)}
                            style={{ padding: "2px 6px", fontSize: "10px", cursor: "pointer", color: "var(--danger)", borderRadius: "3px" }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {formState && tableMeta && (
        <MetadataFormDialog
          title={formState.mode === "create" ? "New Workspace Item" : "Edit Workspace Item"}
          fields={tableMeta.fields}
          initial={formState.record}
          onSave={formState.mode === "create"
            ? async (v) => { await createRecord("workspace_items", v); load(); }
            : handleUpdate}
          onClose={() => setFormState(null)}
        />
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
          <div className="card" style={{ width: "380px", padding: "var(--card-padding)" }}>
            <h4 style={{ margin: "0 0 8px" }}>Delete workspace item?</h4>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--muted)", margin: "0 0 16px" }}>
              Are you sure you want to delete <strong>{(confirmDelete.label as string) || (confirmDelete.item_key as string)}</strong>? This action can be undone.
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="logout" onClick={() => setConfirmDelete(null)}
                style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer" }}>Cancel</button>
              <button className="btn" onClick={handleDeleteConfirm}
                style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer", background: "var(--danger, #c62828)", color: "#fff", border: "none", borderRadius: "var(--border-radius-sm)" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
