import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { listGrns, postGrn } from "../../lib/grn-api";
import type { GrnHeader } from "../../lib/grn-api";
import { GrnStatusBadge } from "./GrnStatusBadge";
import { GrnDraftFormPage } from "./GrnDraftFormPage";
import { GrnDetailPage } from "./GrnDetailPage";

type Props = {
  tenantId: string;
};

type ViewMode = "list" | "create" | "edit" | "view";

export function GrnListPage({ tenantId }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedGrnId, setSelectedGrnId] = useState<string | null>(null);
  const [grns, setGrns] = useState<GrnHeader[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listGrns(tenantId, {
        status: statusFilter || undefined,
        limit: 100,
      });
      setGrns(result.grns);
      setTotal(result.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load GRNs";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter]);

  useEffect(() => {
    if (viewMode === "list") void loadList();
  }, [loadList, viewMode]);

  const handleView = (grnId: string) => {
    setSelectedGrnId(grnId);
    setViewMode("view");
  };

  const handleEdit = (grnId: string) => {
    setSelectedGrnId(grnId);
    setViewMode("edit");
  };

  const handleCreate = () => {
    setSelectedGrnId(null);
    setViewMode("create");
  };

  const handlePost = async (grnId: string) => {
    try {
      await postGrn(grnId);
      toast.success("GRN posted.");
      void loadList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Post failed";
      toast.error(msg);
    }
  };

  const handleSaved = () => {
    setViewMode("list");
    setSelectedGrnId(null);
    void loadList();
  };

  const handleCancel = () => {
    setViewMode("list");
    setSelectedGrnId(null);
  };

  if (viewMode === "create") {
    return (
      <GrnDraftFormPage
        tenantId={tenantId}
        onSaved={handleSaved}
        onCancel={handleCancel}
      />
    );
  }

  if (viewMode === "edit" && selectedGrnId) {
    return (
      <GrnDraftFormPage
        tenantId={tenantId}
        grnId={selectedGrnId}
        onSaved={handleSaved}
        onCancel={handleCancel}
      />
    );
  }

  if (viewMode === "view" && selectedGrnId) {
    return <GrnDetailPage grnId={selectedGrnId} onBack={handleCancel} />;
  }

  const filterStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "var(--font-size-sm, 12px)",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    background: "#fff",
    minWidth: "120px",
  };

  return (
    <div className="module-stack">
      <div className="card">
        <div className="card-head">
          <h3>Goods Receipt Notes</h3>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={filterStyle}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="primary-action" onClick={handleCreate}>
              + New GRN
            </button>
          </div>
        </div>

        {loading && <div className="card state-info">Loading GRNs…</div>}
        {!!error && <div className="card state-error">{error}</div>}

        {!loading && !error && grns.length === 0 && (
          <div className="empty-state">
            <strong>No GRNs yet.</strong>
            <p>Click "+ New GRN" to create the first Goods Receipt Note.</p>
          </div>
        )}

        {!loading && grns.length > 0 && (
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table className="erp-table" style={{ width: "100%", fontSize: "var(--font-size-sm, 12px)" }}>
              <thead>
                <tr>
                  <th>GRN Number</th>
                  <th>Supplier</th>
                  <th>Received Date</th>
                  <th>Status</th>
                  <th>QC Status</th>
                  <th style={{ textAlign: "right" }}>Lines</th>
                  <th>Posted At</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {grns.map((grn) => (
                  <tr key={grn.id}>
                    <td>
                      <button className="link-button" onClick={() => handleView(grn.id)}>
                        {grn.grn_number}
                      </button>
                    </td>
                    <td>{grn.supplier_name}</td>
                    <td>{grn.received_date?.substring(0, 10)}</td>
                    <td>
                      <GrnStatusBadge status={grn.status} qcStatus={grn.qc_status} />
                    </td>
                    <td>{grn.qc_status}</td>
                    <td style={{ textAlign: "right" }}>{(grn as any).line_count ?? "—"}</td>
                    <td>{grn.posted_at ? new Date(grn.posted_at).toLocaleString() : "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      <div className="action-group" style={{ justifyContent: "center" }}>
                        {grn.status === "draft" && (
                          <>
                            <button className="logout" onClick={() => handleEdit(grn.id)}>
                              Edit
                            </button>
                            <button
                              className="primary-action"
                              style={{ fontSize: "11px", padding: "3px 8px" }}
                              onClick={() => handlePost(grn.id)}
                            >
                              Post
                            </button>
                          </>
                        )}
                        {grn.status === "posted" && (
                          <button className="logout" onClick={() => handleView(grn.id)}>
                            View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > grns.length && (
              <div className="state-info" style={{ padding: "8px", textAlign: "center" }}>
                Showing {grns.length} of {total} GRNs.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
