import { useEffect, useState } from "react";
import {
  getReportDefinition,
  resolveReportId,
  runReport,
  type ReportDefinition,
  type ReportColumn,
  type ReportRow,
} from "../../lib/reports-api";

type Props = {
  reportId: string;
  tenantId: string;
  onBack?: () => void;
};

export function ReportRunner({ reportId, tenantId, onBack }: Props) {
  const [definition, setDefinition] = useState<ReportDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [columns, setColumns] = useState<ReportColumn[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [running, setRunning] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [hasRun, setHasRun] = useState(false);
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveReportId(reportId, tenantId)
      .then((id) => {
        if (cancelled) return;
        setResolvedId(id);
        return getReportDefinition(id, tenantId);
      })
      .then((def) => {
        if (!cancelled && def) {
          setDefinition(def);
          const defaults: Record<string, string> = {};
          for (const f of def.filters) {
            if (f.default_value) defaults[f.fieldname] = f.default_value;
          }
          setFilterValues(defaults);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load report definition");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reportId, tenantId]);

  const handleRun = async () => {
    if (!resolvedId) return;
    setRunning(true);
    setError("");
    try {
      const result = await runReport(resolvedId, tenantId, filterValues);
      setRows(result.data);
      setColumns(result.columns);
      setRowCount(result.row_count);
      setTruncated(result.truncated);
      setHasRun(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run report");
    } finally {
      setRunning(false);
    }
  };

  const formatValue = (value: unknown, fieldtype: string): string => {
    if (value === null || value === undefined) return "—";
    if (fieldtype === "Datetime" && typeof value === "string") {
      return new Date(value).toLocaleString();
    }
    if (fieldtype === "Float" && typeof value === "number") {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    if (fieldtype === "Int" && typeof value === "number") {
      if (value === 0) return "Draft";
      if (value === 1) return "Submitted";
      if (value === 2) return "Cancelled";
      return String(value);
    }
    return String(value);
  };

  if (loading) return <div className="card state-info">Loading report definition…</div>;
  if (error && !definition) return <div className="card state-error">{error}</div>;
  if (!definition) return <div className="card state-error">Report not found</div>;

  return (
    <div className="module-stack">
      <div className="card">
        <div className="card-head">
          <h3>{definition.report_name}</h3>
          <div style={{ display: "flex", gap: "6px" }}>
            {onBack && (
              <button className="logout" onClick={onBack}>Back to Reports</button>
            )}
          </div>
        </div>

        <div style={{ padding: "12px", borderBottom: "1px solid #e0e7ef" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
            {definition.filters.map((filter) => (
              <label key={filter.fieldname} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "11px", color: "#6b7280" }}>
                  {filter.fieldname.replace(/_/g, " ")}
                  {filter.is_required ? " *" : ""}
                </span>
                {filter.operator === "contains" ? (
                  <input
                    type="text"
                    value={filterValues[filter.fieldname] ?? ""}
                    onChange={(e) => setFilterValues((prev) => ({ ...prev, [filter.fieldname]: e.target.value }))}
                    placeholder={`Search ${filter.fieldname}…`}
                    style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px" }}
                  />
                ) : (
                  <input
                    type="text"
                    value={filterValues[filter.fieldname] ?? ""}
                    onChange={(e) => setFilterValues((prev) => ({ ...prev, [filter.fieldname]: e.target.value }))}
                    placeholder={filter.operator}
                    style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px" }}
                  />
                )}
              </label>
            ))}
            <button
              className="primary-action"
              onClick={handleRun}
              disabled={running}
              style={{ height: "28px" }}
            >
              {running ? "Running…" : "Run Report"}
            </button>
          </div>
        </div>

        {error && <div className="state-error" style={{ margin: "12px" }}>{error}</div>}

        {hasRun && (
          <div style={{ padding: "12px" }}>
            <div style={{ marginBottom: "8px", fontSize: "12px", color: "#6b7280" }}>
              {rowCount} row{rowCount !== 1 ? "s" : ""} returned
              {truncated && " (truncated at 500 rows)"}
            </div>
            {rows.length === 0 ? (
              <div className="card state-info">No data found for the selected filters.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.fieldname}
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderBottom: "2px solid #e0e7ef",
                            whiteSpace: "nowrap",
                            width: col.width ? `${col.width}px` : "auto",
                          }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.id ?? i}>
                        {columns.map((col) => (
                          <td
                            key={col.fieldname}
                            style={{
                              padding: "6px 8px",
                              borderBottom: "1px solid #f0f0f0",
                              maxWidth: "300px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatValue(row[col.fieldname], col.fieldtype)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
