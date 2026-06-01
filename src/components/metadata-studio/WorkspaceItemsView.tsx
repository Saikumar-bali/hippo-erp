import { useCallback, useEffect, useMemo, useState } from "react";
import { listAllWorkspaceItems, updateRecord, deleteRecord, loadWorkspaceKeys } from "../../lib/metadata/metadata-studio-api";
import { MetadataFormDialog } from "./MetadataFormDialog";
import { TABLES } from "../../lib/metadata/metadata-studio-api";
import { Search, Filter } from "lucide-react";

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

export function WorkspaceItemsView() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({ workspace_key: "", item_type: "", active: "" });
  const [workspaceOptions, setWorkspaceOptions] = useState<{ value: string; label: string }[]>([]);
  const [formState, setFormState] = useState<{ mode: "create" | "edit"; record: Record<string, unknown> } | null>(null);

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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this workspace item?")) return;
    await deleteRecord("workspace_items", id);
    load();
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
    padding: "4px 8px", fontSize: "var(--font-size-sm)", border: "1px solid var(--border)",
    borderRadius: "4px", background: "var(--bg)", color: "var(--fg)",
  };

  if (loading) return <div className="card"><p>Loading Workspace Items...</p></div>;
  if (error) return <div className="card state-info"><p>Error: {error}</p></div>;

  return (
    <div className="card" style={{ padding: "var(--card-padding)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <h3 style={{ margin: 0 }}>Workspace Items</h3>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)", margin: "2px 0 0" }}>
            {filteredRows.length} / {rows.length} record{rows.length !== 1 ? "s" : ""}
            {Object.keys(grouped).length > 0 && ` · ${Object.keys(grouped).length} workspace${Object.keys(grouped).length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button className="btn" onClick={() => {
          const empty: Record<string, unknown> = {};
          for (const f of tableMeta.fields) {
            if (f.default !== undefined) empty[f.name] = f.default;
            else empty[f.name] = f.type === "boolean" ? false : "";
          }
          setFormState({ mode: "create", record: empty });
        }}
          style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer" }}>
          + New
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={14} style={{ position: "absolute", left: "8px", color: "var(--muted)", pointerEvents: "none" }} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            style={{ padding: "4px 8px 4px 28px", fontSize: "var(--font-size-sm)", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg)", color: "var(--fg)", width: "160px" }} />
        </div>
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
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", margin: 0 }}>No workspace items found.</p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--muted)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", margin: 0 }}>No records match the current filters.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", maxHeight: "70vh", overflowY: "auto" }}>
          {Object.entries(grouped).map(([wsKey, wsRows]) => (
            <div key={wsKey} style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, margin: "0 0 4px", padding: "4px 0", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)" }}>
                {wsKey}
                <span style={{ fontWeight: 400, marginLeft: "8px", fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>
                  ({wsRows.length} item{wsRows.length !== 1 ? "s" : ""})
                </span>
              </h4>
              <table className="erp-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Item Key</th>
                    <th style={{ fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Label</th>
                    <th style={{ fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Type</th>
                    <th style={{ fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Target</th>
                    <th style={{ fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Required Permission</th>
                    <th style={{ fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Sort</th>
                    <th style={{ fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Status</th>
                    <th style={{ width: "100px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wsRows.map((row) => (
                    <tr key={row.id as string}>
                      <td style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}>{row.item_key as string}</td>
                      <td style={{ fontSize: "var(--font-size-sm)" }}>{row.label as string}</td>
                      <td><span style={badgeStyle("type")}>{row.item_type as string}</span></td>
                      <td style={{ fontSize: "var(--font-size-xs)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{row.target as string}</td>
                      <td style={{ fontSize: "var(--font-size-xs)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{row.required_permission_key as string || "—"}</td>
                      <td style={{ fontSize: "var(--font-size-sm)", textAlign: "center" }}>{row.sort_order as number ?? "—"}</td>
                      <td><span style={badgeStyle(row.is_active ? "active" : "inactive")}>{row.is_active ? "Active" : "Inactive"}</span></td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="logout" onClick={() => setFormState({ mode: "edit", record: { ...row } })}
                          style={{ padding: "2px 8px", fontSize: "var(--font-size-xs)", cursor: "pointer", marginRight: "4px" }}>Edit</button>
                        <button className="logout" onClick={() => handleDelete(row.id as string)}
                          style={{ padding: "2px 8px", fontSize: "var(--font-size-xs)", cursor: "pointer", color: "var(--danger)" }}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {formState && (
        <MetadataFormDialog
          title={formState.mode === "create" ? "New Workspace Item" : "Edit Workspace Item"}
          fields={tableMeta.fields}
          initial={formState.record}
          onSave={formState.mode === "create"
            ? async (v) => { await updateRecord("workspace_items", v.id as string, v); load(); }
            : handleUpdate}
          onClose={() => setFormState(null)}
        />
      )}
    </div>
  );
}
