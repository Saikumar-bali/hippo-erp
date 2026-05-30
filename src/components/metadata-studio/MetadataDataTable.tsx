import { useCallback, useEffect, useState } from "react";
import { MetadataFormDialog } from "./MetadataFormDialog";
import { TABLES, createRecord, updateRecord, deleteRecord } from "../../lib/metadata/metadata-studio-api";
import type { TableMeta } from "../../lib/metadata/metadata-studio-api";

type Props = {
  label: string;
  tableKey: string;
  fetcher: () => Promise<Record<string, unknown>[]>;
};

export function MetadataDataTable({ label, tableKey, fetcher: outerFetcher }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<{ mode: "create" | "edit"; record: Record<string, unknown> } | null>(null);

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

  if (loading) {
    return <div className="card"><p>Loading {label}...</p></div>;
  }

  if (error) {
    return <div className="card state-info"><p>Error: {error}</p></div>;
  }

  const columns = tableMeta
    ? tableMeta.fields.filter((f) => !f.hidden).map((f) => f.name)
    : rows.length > 0
      ? Object.keys(rows[0]).filter((k) => !["id", "created_at", "updated_at"].includes(k))
      : [];

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="card" style={{ padding: "var(--card-padding)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div>
          <h3 style={{ margin: 0 }}>{label}</h3>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)", margin: "2px 0 0" }}>
            {rows.length} record{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        {tableMeta && (
          <button
            className="btn"
            onClick={() => {
              const empty: Record<string, unknown> = {};
              for (const f of tableMeta.fields) {
                if (f.default !== undefined) empty[f.name] = f.default;
                else empty[f.name] = f.type === "boolean" ? false : "";
              }
              setFormState({ mode: "create", record: empty });
            }}
            style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer" }}
          >
            + New
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--muted)" }}>No {label.toLowerCase()} found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="erp-table" style={{ minWidth: "100%" }}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col} style={{ whiteSpace: "nowrap", fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {col.replace(/_/g, " ")}
                  </th>
                ))}
                {tableMeta && <th style={{ width: "100px" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td key={col} style={{ fontSize: "var(--font-size-sm)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {formatValue(row[col])}
                    </td>
                  ))}
                  {tableMeta && (
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="logout"
                        onClick={() => setFormState({ mode: "edit", record: { ...row } })}
                        style={{ padding: "2px 8px", fontSize: "var(--font-size-xs)", cursor: "pointer", marginRight: "4px" }}
                      >
                        Edit
                      </button>
                      <button
                        className="logout"
                        onClick={() => handleDelete(row.id as string)}
                        style={{ padding: "2px 8px", fontSize: "var(--font-size-xs)", cursor: "pointer", color: "var(--danger)" }}
                      >
                        Del
                      </button>
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
    </div>
  );
}
