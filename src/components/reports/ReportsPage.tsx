import { useEffect, useState } from "react";
import { listReports, type ReportListItem } from "../../lib/reports-api";
import { ReportRunner } from "./ReportRunner";

type Props = {
  tenantId: string;
};

export function ReportsPage({ tenantId }: Props) {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listReports(tenantId)
      .then((data) => {
        if (!cancelled) setReports(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load reports");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tenantId]);

  if (selectedReportId) {
    return (
      <ReportRunner
        reportId={selectedReportId}
        tenantId={tenantId}
        onBack={() => setSelectedReportId(null)}
      />
    );
  }

  if (loading) return <div className="card state-info">Loading reports…</div>;
  if (error) return <div className="card state-error">{error}</div>;

  return (
    <div className="module-stack">
      <div className="card">
        <div className="card-head">
          <h3>Reports</h3>
        </div>
        {reports.length === 0 ? (
          <div className="card state-info">
            <p>No reports available. Contact your administrator to create reports.</p>
          </div>
        ) : (
          <div style={{ padding: "12px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e0e7ef" }}>Report Name</th>
                  <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e0e7ef" }}>DocType</th>
                  <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e0e7ef" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e0e7ef" }}>Standard</th>
                  <th style={{ textAlign: "center", padding: "8px", borderBottom: "1px solid #e0e7ef" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>{report.report_name}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>{report.doctype_key}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>{report.report_type}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>{report.is_standard ? "Yes" : "No"}</td>
                    <td style={{ textAlign: "center", padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                      <button
                        className="primary-action"
                        onClick={() => setSelectedReportId(report.id)}
                      >
                        Run
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
