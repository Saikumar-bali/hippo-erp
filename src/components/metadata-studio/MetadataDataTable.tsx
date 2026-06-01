import { useCallback, useEffect, useMemo, useState } from "react";
import { MetadataFormDialog } from "./MetadataFormDialog";
import { TABLES, createRecord, updateRecord, deleteRecord } from "../../lib/metadata/metadata-studio-api";
import type { TableMeta } from "../../lib/metadata/metadata-studio-api";
import { PlusCircle, Search } from "lucide-react";

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
      <div className="card" style={{ width: "620px", maxHeight: "82vh", overflowY: "auto", padding: "var(--card-padding)" }}>
        <h4 style={{ marginBottom: "8px" }}>Edit JSON</h4>
        {error && <p style={{ color: "var(--danger)", fontSize: "var(--font-size-sm)", marginBottom: "6px" }}>{error}</p>}
        <textarea value={text} onChange={(e) => { setText(e.target.value); setError(null); }}
          style={{ width: "100%", minHeight: "260px", padding: "8px", fontSize: "var(--font-size-sm)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", lineHeight: 1.4, border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg)", color: "var(--fg)", boxSizing: "border-box", resize: "vertical" }}
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

export function MetadataDataTable({ label, tableKey, fetcher: outerFetcher }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<{ mode: "create" | "edit"; record: Record<string, unknown> } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [jsonEdit, setJsonEdit] = useState<{ row: Record<string, unknown>; col: string; val: unknown } | null>(null);

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

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const v = row[col];
        if (v === null || v === undefined) return false;
        if (typeof v === "object") return JSON.stringify(v).toLowerCase().includes(q);
        return String(v).toLowerCase().includes(q);
      })
    );
  }, [rows, searchQuery, columns]);

  const formatDisplayValue = (val: unknown): { display: string; isJson: boolean; tooltip: string | null } => {
    if (val === null || val === undefined) return { display: "—", isJson: false, tooltip: null };
    if (Array.isArray(val)) {
      const summary = `${val.length} item${val.length !== 1 ? "s" : ""}`;
      return { display: summary, isJson: true, tooltip: JSON.stringify(val, null, 2) };
    }
    if (typeof val === "object") {
      return { display: "{...}", isJson: true, tooltip: JSON.stringify(val, null, 2) };
    }
    if (typeof val === "boolean") return { display: val ? "Yes" : "No", isJson: false, tooltip: null };
    const s = String(val);
    const tooltip = s.length > 80 ? s : null;
    return { display: s.length > 80 ? s.slice(0, 77) + "..." : s, isJson: false, tooltip };
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: "var(--card-padding)", textAlign: "center", color: "var(--muted)" }}>
        <p>Loading {label}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card state-info" style={{ padding: "var(--card-padding)" }}>
        <p style={{ color: "var(--danger)" }}>Error: {error}</p>
        <button className="btn" onClick={load} style={{ marginTop: "8px" }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "var(--card-padding)", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
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
              style={{ padding: "4px 8px 4px 28px", fontSize: "var(--font-size-sm)", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg)", color: "var(--fg)", width: "180px" }} />
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

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "var(--border-radius-sm)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", margin: 0, fontWeight: 500 }}>No {label.toLowerCase()} found.</p>
          <p style={{ fontSize: "var(--font-size-xs)", margin: "4px 0 0" }}>Create a new record using the + New button above.</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "var(--border-radius-sm)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", margin: 0 }}>No records match "{searchQuery}".</p>
          <button className="logout" onClick={() => setSearchQuery("")} style={{ marginTop: "8px", padding: "4px 10px", fontSize: "var(--font-size-xs)" }}>Clear Search</button>
        </div>
      ) : (
        <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 300px)", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--border-radius-sm)" }}>
          <table className="erp-table" style={{ minWidth: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                {columns.map((col) => (
                  <th key={col} style={{ whiteSpace: "nowrap", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", background: "var(--card-bg, #f8f9fa)", borderBottom: "1px solid var(--border)", padding: "6px 10px", textAlign: "left" }}>
                    {col.replace(/_/g, " ")}
                  </th>
                ))}
                {tableMeta && <th style={{ width: "100px", background: "var(--card-bg, #f8f9fa)", borderBottom: "1px solid var(--border)", padding: "6px 10px", textAlign: "center" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--border-light, #f1f3f5)" }}>
                  {columns.map((col) => {
                    const raw = row[col];
                    const { display, isJson, tooltip } = formatDisplayValue(raw);
                    const isJsonCol = isJsonField(col, tableMeta);
                    return (
                      <td key={col} style={{ fontSize: "var(--font-size-xs)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "6px 10px" }}>
                        {isJsonCol || isJson ? (
                          <span onClick={() => setJsonEdit({ row, col, val: raw })}
                            title={tooltip ?? ""}
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
                    <td style={{ whiteSpace: "nowrap", padding: "6px 10px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
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
