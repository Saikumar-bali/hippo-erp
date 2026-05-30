import { useEffect, useState } from "react";

type Props = {
  label: string;
  fetcher: () => Promise<Record<string, unknown>[]>;
};

export function MetadataDataTable({ label, fetcher }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((data) => {
        if (!cancelled) { setRows(data); setLoading(false); }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [fetcher]);

  if (loading) {
    return <div className="card"><p>Loading {label}...</p></div>;
  }

  if (error) {
    return <div className="card state-info"><p>Error: {error}</p></div>;
  }

  if (rows.length === 0) {
    return <div className="card state-info"><p>No {label.toLowerCase()} found.</p></div>;
  }

  const columns = Object.keys(rows[0]).filter((k) => !["id"].includes(k));

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="card" style={{ padding: "var(--card-padding)" }}>
      <h3 style={{ marginBottom: "8px" }}>{label}</h3>
      <p style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)", marginBottom: "8px" }}>
        {rows.length} record{rows.length !== 1 ? "s" : ""}
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className="erp-table" style={{ minWidth: "100%" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} style={{ whiteSpace: "nowrap", fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {col.replace(/_/g, " ")}
                </th>
              ))}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
