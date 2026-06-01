import { useCallback, useEffect, useMemo, useState } from "react";
import { MetadataFormDialog } from "./MetadataFormDialog";
import { TABLES, createRecord, updateRecord, deleteRecord } from "../../lib/metadata/metadata-studio-api";
import type { TableMeta } from "../../lib/metadata/metadata-studio-api";
import { Filter, PlusCircle, Search } from "lucide-react";

type Props = {
  label: string;
  tableKey: string;
  fetcher: () => Promise<Record<string, unknown>[]>;
};

function JsonPreviewModal({ value, onSave, onClose }: { value: unknown; onSave: (v: string) => void; onClose: () => void }) {
  const [text, setText] = useState(() => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") {
      try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
    }
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  });
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!text.trim()) { onSave(""); onClose(); return; }
    try {
      JSON.parse(text);
      onSave(text);
      onClose();
    } catch {
      setError("Invalid JSON — check syntax");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width: "min(760px, 92vw)", maxHeight: "82vh", overflowY: "auto", padding: "var(--card-padding)" }}>
        <h4 style={{ marginBottom: "4px" }}>Edit JSON</h4>
        <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: "var(--font-size-xs)" }}>Valid JSON required.</p>
        {error && <p style={{ color: "var(--danger)", fontSize: "var(--font-size-sm)", marginBottom: "6px" }}>{error}</p>}
        <textarea value={text} onChange={(e) => { setText(e.target.value); setError(null); }}
          style={{ width: "100%", minHeight: "300px", padding: "8px", fontSize: "var(--font-size-sm)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", lineHeight: 1.4, border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg)", color: "var(--fg)", boxSizing: "border-box", resize: "vertical" }}
          placeholder="Enter valid JSON" spellCheck={false} />
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "12px" }}>
          <button className="logout" onClick={onClose} style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer" }}>Cancel</button>
          <button className="btn" onClick={handleSave} style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function isJsonField(col: string, meta: TableMeta | undefined): boolean {
  if (!meta) return false;
  const f = meta.fields.find((ff) => ff.name === col);
  return f?.type === "json";
}

function stringifyForSearch(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function filterableColumns(columns: string[]) {
  const preferred = [
    "doctype_key",
    "action_key",
    "permission_key",
    "workspace_key",
    "item_type",
    "target",
    "module_key",
    "fieldtype",
    "fieldname",
    "storage_strategy",
    "is_active",
    "is_default",
  ];
  return preferred.filter((c) => columns.includes(c)).slice(0, 4);
}

export function MetadataDataTable({ label, tableKey, fetcher: outerFetcher }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<{ mode: "create" | "edit"; record: Record<string, unknown> } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [jsonEdit, setJsonEdit] = useState<{ row: Record<string, unknown>; col: string; val: unknown } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const tableMeta: TableMeta | undefined = TABLES[tableKey];

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    outerFetcher()
      .then((data) => { setRows(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      });
  }, [outerFetcher]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setSearchQuery("");
    setColumnFilters({});
  }, [tableKey]);

  const handleCreate = async (values: Record<string, unknown>) => {
    await createRecord(tableKey, values);
    load();
  };

  const handleUpdate = async (values: Record<string, unknown>) => {
    await updateRecord(tableKey, values.id as string, values);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this record?")) return;
    await deleteRecord(tableKey, id);
    load();
  };

  const handleJsonSave = async (raw: string) => {
    if (!jsonEdit) return;
    const parsed = raw.trim() ? JSON.parse(raw) : null;
    const updated = { ...jsonEdit.row, [jsonEdit.col]: parsed };
    if (updated.id) {
      await updateRecord(tableKey, updated.id as string, updated);
      load();
    }
    setJsonEdit(null);
  };

  const columns = useMemo(() => {
    if (tableMeta) {
      return tableMeta.fields.filter((f) => !f.hidden).map((f) => f.name);
    }
    if (rows.length > 0) {
      return Object.keys(rows[0]).filter((k) => !["id", "created_at", "updated_at"].includes(k));
    }
    return [];
  }, [tableMeta, rows]);

  const filterColumns = useMemo(() => filterableColumns(columns), [columns]);

  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    for (const col of filterColumns) {
      const values = new Set<string>();
      for (const row of rows) {
        const raw = row[col];
        if (raw === null || raw === undefined || typeof raw === "object") continue;
        values.add(String(raw));
      }
      options[col] = Array.from(values).sort((a, b) => a.localeCompare(b)).slice(0, 100);
    }
    return options;
  }, [rows, filterColumns]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      for (const [col, expected] of Object.entries(columnFilters)) {
        if (!expected) continue;
        if (String(row[col] ?? "") !== expected) return false;
      }

      if (!q) return true;
      return columns.some((col) => stringifyForSearch(row[col]).toLowerCase().includes(q));
    });
  }, [rows, searchQuery, columns, columnFilters]);

  const hasActiveFilters = Boolean(searchQuery || Object.values(columnFilters).some(Boolean));

  const formatDisplayValue = (val: unknown): { display: string; isJson: boolean; tooltip: string | null } => {
    if (val === null || val === undefined || val === "") return { display: "—", isJson: false, tooltip: null };
    if (Array.isArray(val)) {
      const summary = `${val.length} item${val.length !== 1 ? "s" : ""}`;
      return { display: summary, isJson: true, tooltip: JSON.stringify(val, null, 2) };
    }
    if (typeof val === "object") {
      const keys = Object.keys(val as Record<string, unknown>).length;
      return { display: keys ? `{${keys} keys}` : "{...}", isJson: true, tooltip: JSON.stringify(val, null, 2) };
    }
    if (typeof val === "boolean") return { display: val ? "Yes" : "No", isJson: false, tooltip: null };
    const s = String(val);
    const tooltip = s.length > 80 ? s : null;
    return { display: s.length > 80 ? s.slice(0, 77) + "..." : s, isJson: false, tooltip };
  };

  const resetFilters = () => {
    setSearchQuery("");
    setColumnFilters({});
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: "var(--card-padding)", textAlign: "center", color: "var(--muted)", minHeight: "calc(100vh - 160px)" }}>
        <p>Loading {label}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card state-info" style={{ padding: "var(--card-padding)", minHeight: "calc(100vh - 160px)" }}>
        <p style={{ color: "var(--danger)" }}>Error: {error}</p>
        <button className="btn" onClick={load} style={{ marginTop: "8px" }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "var(--card-padding)", display: "flex", flexDirection: "column", gap: "10px", minHeight: "calc(100vh - 116px)", maxHeight: "calc(100vh - 116px)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", flexShrink: 0 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "var(--font-size-base)" }}>{label}</h3>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)", margin: "1px 0 0" }}>
            {filteredRows.length} of {rows.length} record{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={14} style={{ position: "absolute", left: "8px", color: "var(--muted)", pointerEvents: "none" }} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              style={{ padding: "4px 8px 4px 28px", fontSize: "var(--font-size-sm)", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg)", color: "var(--fg)", width: "220px" }} />
          </div>
          {tableMeta && (
            <button className="btn" onClick={() => {
              const empty: Record<string, unknown> = {};
              for (const f of tableMeta.fields) {
                if (f.default !== undefined) empty[f.name] = f.default;
                else empty[f.name] = f.type === "boolean" ? false : "";
              }
              setFormState({ mode: "create", record: empty });
            }}
              style={{ padding: "5px 12px", fontSize: "var(--font-size-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
              <PlusCircle size={14} /> New
            </button>
          )}
        </div>
      </div>

      {filterColumns.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", padding: "8px", border: "1px solid var(--border)", borderRadius: "var(--border-radius-sm)", background: "var(--bg)", flexShrink: 0 }}>
          <Filter size={14} style={{ color: "var(--muted)" }} />
          {filterColumns.map((col) => (
            <select
              key={col}
              value={columnFilters[col] ?? ""}
              onChange={(e) => setColumnFilters((prev) => ({ ...prev, [col]: e.target.value }))}
              style={{ padding: "4px 8px", fontSize: "var(--font-size-xs)", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg)", color: "var(--fg)", minWidth: "150px" }}
            >
              <option value="">All {col.replace(/_/g, " ")}</option>
              {(filterOptions[col] ?? []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ))}
          {hasActiveFilters && (
            <button className="logout" onClick={resetFilters} style={{ padding: "4px 10px", fontSize: "var(--font-size-xs)" }}>Reset</button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "var(--border-radius-sm)", flex: 1 }}>
          <p style={{ fontSize: "var(--font-size-sm)", margin: 0, fontWeight: 500 }}>No {label.toLowerCase()} found.</p>
          <p style={{ fontSize: "var(--font-size-xs)", margin: "4px 0 0" }}>Create a new record using the + New button above.</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "var(--border-radius-sm)", flex: 1 }}>
          <p style={{ fontSize: "var(--font-size-sm)", margin: 0 }}>No records match the current filters.</p>
          <button className="logout" onClick={resetFilters} style={{ marginTop: "8px", padding: "4px 10px", fontSize: "var(--font-size-xs)" }}>Clear Filters</button>
        </div>
      ) : (
        <div style={{ overflowX: "auto", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--border-radius-sm)", flex: 1, minHeight: 0 }}>
          <table className="erp-table" style={{ minWidth: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                {columns.map((col) => {
                  const field = tableMeta?.fields.find(f => f.name === col);
                  const isNumeric = field?.type === "number" || field?.type === "int";
                  return (
                    <th key={col} style={{ whiteSpace: "nowrap", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", background: "var(--card-bg, #f8f9fa)", borderBottom: "1px solid var(--border)", padding: "6px 10px", textAlign: isNumeric ? "right" : "left" }}>
                      {col.replace(/_/g, " ")}
                    </th>
                  );
                })}
                {tableMeta && <th style={{ width: "100px", background: "var(--card-bg, #f8f9fa)", borderBottom: "1px solid var(--border)", padding: "6px 10px", textAlign: "center", position: "sticky", right: 0 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--border-light, #f1f3f5)" }}>
                  {columns.map((col) => {
                    const raw = row[col];
                    const { display, isJson, tooltip } = formatDisplayValue(raw);
                    const isJsonCol = isJsonField(col, tableMeta);
                    const field = tableMeta?.fields.find(f => f.name === col);
                    const isNumeric = field?.type === "number" || field?.type === "int";
                    return (
                      <td key={col} style={{ fontSize: "var(--font-size-xs)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "6px 10px", textAlign: isNumeric ? "right" : "left" }}>
                        {isJsonCol || isJson ? (
                          <span onClick={() => setJsonEdit({ row, col, val: raw })}
                            title={tooltip ?? "Click to edit JSON"}
                            style={{ cursor: "pointer", color: "var(--primary, #0f5f63)", textDecoration: "underline dotted", fontWeight: 500 }}>
                            {display}
                          </span>
                        ) : (
                          <span title={tooltip ?? ""}>{display}</span>
                        )}
                      </td>
                    );
                  })}
                  {tableMeta && (
                    <td style={{ whiteSpace: "nowrap", padding: "6px 10px", textAlign: "center", position: "sticky", right: 0, background: "var(--card-bg, #fff)" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <button className="logout" onClick={() => setFormState({ mode: "edit", record: { ...row } })}
                          style={{ padding: "2px 6px", fontSize: "10px", cursor: "pointer", borderRadius: "3px" }}>
                          Edit
                        </button>
                        <button className="logout" onClick={() => handleDelete(row.id as string)}
                          style={{ padding: "2px 6px", fontSize: "10px", cursor: "pointer", color: "var(--danger)", borderRadius: "3px" }}>
                          Del
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formState && tableMeta && (
        <MetadataFormDialog
          title={formState.mode === "create" ? `New ${label}` : `Edit ${label}`}
          fields={tableMeta.fields}
          initial={
            formState.mode === "create"
              ? (() => {
                  const empty: Record<string, unknown> = {};
                  for (const f of tableMeta.fields) {
                    if (f.default !== undefined) empty[f.name] = f.default;
                    else empty[f.name] = f.type === "boolean" ? false : "";
                  }
                  return empty;
                })()
              : formState.record
          }
          onSave={formState.mode === "create" ? handleCreate : handleUpdate}
          onClose={() => setFormState(null)}
        />
      )}

      {jsonEdit && (
        <JsonPreviewModal value={jsonEdit.val} onSave={handleJsonSave} onClose={() => setJsonEdit(null)} />
      )}
    </div>
  );
}
