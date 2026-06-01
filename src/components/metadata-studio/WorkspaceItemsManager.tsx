import { useCallback, useEffect, useMemo, useState } from "react";
import { listAllWorkspaceItems, createRecord, updateRecord, deleteRecord, loadWorkspaceKeys } from "../../lib/metadata/metadata-studio-api";
import { MetadataFormDialog } from "./MetadataFormDialog";
import { TABLES } from "../../lib/metadata/metadata-studio-api";
import { Filter, Search } from "lucide-react";
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
    justifyContent: "center",
    minWidth: "54px",
    padding: "1px 7px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: 700,
    lineHeight: "18px",
    textTransform: "uppercase",
    letterSpacing: "0.25px",
  };
  if (variant === "type") return { ...base, background: "#e8f4f8", color: "#0a6e7a" };
  if (variant === "active") return { ...base, background: "#e6f7e6", color: "#1a7d1a" };
  return { ...base, background: "#fce8e6", color: "#c62828" };
}

function formatWorkspaceLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function getText(row: Record<string, unknown>, key: string) {
  return String(row[key] ?? "");
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
    return Object.fromEntries(
      Object.entries(g)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [key, value.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))])
    );
  }, [filteredRows]);

  const itemTypes = useMemo(() => {
    const s = new Set(rows.map((r) => r.item_type as string).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  const filterStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "var(--font-size-xs)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    background: "var(--bg)",
    color: "var(--fg)",
    minWidth: "132px",
    height: "28px",
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilters({ workspace_key: "", item_type: "", active: "" });
  };

  const makeEmptyRecord = () => {
    const empty: Record<string, unknown> = {};
    if (tableMeta) {
      for (const f of tableMeta.fields) {
        if (f.default !== undefined) empty[f.name] = f.default;
        else empty[f.name] = f.type === "boolean" ? false : "";
      }
    }
    return empty;
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: "var(--card-padding)", textAlign: "center", color: "var(--muted)", minHeight: "calc(100vh - 116px)" }}>
        <p>Loading Workspace Items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card state-info" style={{ padding: "var(--card-padding)", minHeight: "calc(100vh - 116px)" }}>
        <p style={{ color: "var(--danger)" }}>Error: {error}</p>
        <button className="btn" onClick={load} style={{ marginTop: "8px" }}>Retry</button>
      </div>
    );
  }

  const hasActiveFilters = Boolean(searchQuery || filters.workspace_key || filters.item_type || filters.active);

  return (
    <div
      className="card"
      style={{
        padding: "var(--card-padding)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minHeight: "calc(100vh - 116px)",
        maxHeight: "calc(100vh - 116px)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexShrink: 0 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "var(--font-size-base)" }}>Workspace Items</h3>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)", margin: "1px 0 0" }}>
            {filteredRows.length} of {rows.length} records · {Object.keys(grouped).length} workspace{Object.keys(grouped).length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          className="btn"
          onClick={() => setFormState({ mode: "create", record: makeEmptyRecord() })}
          style={{ padding: "5px 12px", fontSize: "var(--font-size-sm)", cursor: "pointer" }}
        >
          + New Item
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", padding: "8px", background: "var(--bg)", borderRadius: "var(--border-radius-sm)", border: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={14} style={{ position: "absolute", left: "9px", color: "var(--muted)", pointerEvents: "none" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search label, key, target..."
            style={{ padding: "4px 8px 4px 30px", fontSize: "var(--font-size-xs)", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg)", color: "var(--fg)", width: "240px", height: "28px" }}
          />
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
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        {hasActiveFilters && (
          <button className="logout" onClick={resetFilters} style={{ padding: "4px 10px", fontSize: "var(--font-size-xs)", height: "28px" }}>Reset</button>
        )}
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "var(--border-radius-sm)", flex: 1 }}>
          <p style={{ fontSize: "var(--font-size-sm)", margin: 0, fontWeight: 500 }}>No workspace items found.</p>
          <p style={{ fontSize: "var(--font-size-xs)", margin: "4px 0 0" }}>Start by creating your first navigation item.</p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "var(--border-radius-sm)", flex: 1 }}>
          <p style={{ fontSize: "var(--font-size-sm)", margin: 0 }}>No items match the current filters.</p>
          <button className="logout" onClick={resetFilters} style={{ marginTop: "8px", padding: "4px 10px", fontSize: "var(--font-size-xs)" }}>Clear Filters</button>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: "8px", paddingRight: "2px" }}>
          {Object.entries(grouped).map(([wsKey, wsRows]) => (
            <section key={wsKey} style={{ border: "1px solid var(--border)", borderRadius: "var(--border-radius-sm)", background: "var(--card-bg, #fff)", overflow: "hidden", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f5f8fb", borderBottom: "1px solid var(--border)", padding: "6px 10px" }}>
                <h4 style={{ margin: 0, fontSize: "11px", letterSpacing: "0.7px", textTransform: "uppercase", color: "var(--primary)", fontWeight: 800 }}>
                  {formatWorkspaceLabel(wsKey)}
                </h4>
                <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700 }}>{wsRows.length} item{wsRows.length !== 1 ? "s" : ""}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1.4fr) 90px minmax(160px, 1fr) minmax(180px, 1fr) 64px 72px 96px", gap: "0", alignItems: "center", padding: "6px 10px", background: "#f9fbfd", borderBottom: "1px solid var(--border)", fontSize: "10px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.45px" }}>
                <span>Label & Key</span>
                <span>Type</span>
                <span>Target</span>
                <span>Permission</span>
                <span style={{ textAlign: "center" }}>Sort</span>
                <span style={{ textAlign: "center" }}>Status</span>
                <span style={{ textAlign: "center" }}>Actions</span>
              </div>

              {wsRows.map((row) => (
                <div
                  key={row.id as string}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 1.4fr) 90px minmax(160px, 1fr) minmax(180px, 1fr) 64px 72px 96px",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderBottom: "1px solid #eef2f6",
                    opacity: row.is_active ? 1 : 0.58,
                    background: row.is_active ? "transparent" : "#fbfbfb",
                    minHeight: "36px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "var(--font-size-xs)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getText(row, "label")}>{getText(row, "label") || "Untitled"}</div>
                    <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getText(row, "item_key")}>{getText(row, "item_key")}</div>
                  </div>
                  <span style={badgeStyle("type")}>{getText(row, "item_type") || "—"}</span>
                  <code style={{ fontSize: "10px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getText(row, "target")}>{getText(row, "target") || "—"}</code>
                  <code style={{ fontSize: "10px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getText(row, "required_permission_key")}>{getText(row, "required_permission_key") || "—"}</code>
                  <span style={{ textAlign: "center", fontSize: "var(--font-size-xs)", fontWeight: 700 }}>{String(row.sort_order ?? 0)}</span>
                  <span style={{ display: "flex", justifyContent: "center" }}><span style={badgeStyle(row.is_active ? "active" : "inactive")}>{row.is_active ? "Active" : "Inactive"}</span></span>
                  <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                    <button className="logout" onClick={() => setFormState({ mode: "edit", record: { ...row } })} style={{ padding: "2px 6px", fontSize: "10px", cursor: "pointer", borderRadius: "3px" }}>Edit</button>
                    <button className="logout" onClick={() => setConfirmDelete(row)} style={{ padding: "2px 6px", fontSize: "10px", cursor: "pointer", color: "var(--danger)", borderRadius: "3px" }}>Del</button>
                  </div>
                </div>
              ))}
            </section>
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
              <button className="logout" onClick={() => setConfirmDelete(null)} style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer" }}>Cancel</button>
              <button className="btn" onClick={handleDeleteConfirm} style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer", background: "var(--danger, #c62828)", color: "#fff", border: "none", borderRadius: "var(--border-radius-sm)" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
