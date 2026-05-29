import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listUoms, deactivateUom, reactivateUom } from "../../lib/product-api";
import type { UnitOfMeasure } from "../../lib/types";
import { UomForm } from "./UomForm";
import { ProductStatusBadge } from "./ProductStatusBadge";

type Props = {
  tenantId: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export function UomList({ tenantId, canCreate, canUpdate, canDelete }: Props) {
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listUoms(tenantId);
      setUoms(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load units of measure.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [tenantId]);

  const filtered = useMemo(() => {
    let list = uoms;
    if (filterActive === "active") list = list.filter((u) => u.is_active);
    else if (filterActive === "inactive") list = list.filter((u) => !u.is_active);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.code.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
    }
    return list;
  }, [uoms, filterActive, search]);

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateUom(id);
      toast.success("UOM deactivated.");
      void load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to deactivate.");
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await reactivateUom(id);
      toast.success("UOM reactivated.");
      void load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reactivate.");
    }
  };

  if (loading) {
    return <div className="card state-info">Loading units of measure…</div>;
  }

  if (error) {
    return <div className="card state-error">{error}</div>;
  }

  return (
    <div className="module-stack">
      <div className="card">
        <div className="card-head">
          <h3>Units of Measure</h3>
          {canCreate && (
            <button className="primary-action" onClick={() => setEditingId("new")}>
              + New UOM
            </button>
          )}
        </div>

        {editingId === "new" && (
          <UomForm
            tenantId={tenantId}
            onSaved={() => { setEditingId(null); void load(); }}
            onCancel={() => setEditingId(null)}
          />
        )}

        <div className="filter-bar">
          <input
            className="search-input"
            placeholder="Search by code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="state-info card state-note">
            {uoms.length === 0
              ? "No units of measure yet. Create one to get started."
              : "No units match the current filters."}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  {(canUpdate || canDelete) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((uom) => (
                  <tr key={uom.id}>
                    {editingId === uom.id ? (
                      <td colSpan={5}>
                        <UomForm
                          tenantId={tenantId}
                          uom={uom}
                          onSaved={() => { setEditingId(null); void load(); }}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    ) : (
                      <>
                        <td><strong>{uom.code}</strong></td>
                        <td>{uom.name}</td>
                        <td>{uom.description ?? "—"}</td>
                        <td><ProductStatusBadge isActive={uom.is_active} /></td>
                        {(canUpdate || canDelete) && (
                          <td>
                            <div className="action-group">
                              {canUpdate && uom.is_active && (
                                <button className="logout" onClick={() => setEditingId(uom.id)}>
                                  Edit
                                </button>
                              )}
                              {canDelete && uom.is_active && (
                                <button className="logout logout--danger" onClick={() => handleDeactivate(uom.id)}>
                                  Deactivate
                                </button>
                              )}
                              {canUpdate && !uom.is_active && (
                                <button className="logout" onClick={() => handleReactivate(uom.id)}>
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </>
                    )}
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
