import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listCategories, deactivateCategory, reactivateCategory } from "../../lib/product-api";
import type { ProductCategory } from "../../lib/types";
import { ProductCategoryForm } from "./ProductCategoryForm";
import { ProductStatusBadge } from "./ProductStatusBadge";

type Props = {
  tenantId: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export function ProductCategoryList({ tenantId, canCreate, canUpdate, canDelete }: Props) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listCategories(tenantId);
      setCategories(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load categories.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [tenantId]);

  const filtered = useMemo(() => {
    let list = categories;
    if (filterActive === "active") list = list.filter((c) => c.is_active);
    else if (filterActive === "inactive") list = list.filter((c) => !c.is_active);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    }
    return list;
  }, [categories, filterActive, search]);

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateCategory(id);
      toast.success("Category deactivated.");
      void load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to deactivate.");
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await reactivateCategory(id);
      toast.success("Category reactivated.");
      void load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reactivate.");
    }
  };

  if (loading) {
    return <div className="card state-info">Loading categories…</div>;
  }

  if (error) {
    return <div className="card state-error">{error}</div>;
  }

  return (
    <div className="module-stack">
      <div className="card">
        <div className="card-head">
          <h3>Product Categories</h3>
          {canCreate && (
            <button className="primary-action" onClick={() => setEditingId("new")}>
              + New Category
            </button>
          )}
        </div>

        {editingId === "new" && (
          <ProductCategoryForm
            tenantId={tenantId}
            categories={categories}
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
            {categories.length === 0
              ? "No categories yet. Create one to get started."
              : "No categories match the current filters."}
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
                {filtered.map((cat) => (
                  <tr key={cat.id}>
                    {editingId === cat.id ? (
                      <td colSpan={5}>
                        <ProductCategoryForm
                          tenantId={tenantId}
                          categories={categories}
                          category={cat}
                          onSaved={() => { setEditingId(null); void load(); }}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    ) : (
                      <>
                        <td><strong>{cat.code}</strong></td>
                        <td>{cat.name}</td>
                        <td>{cat.description ?? "—"}</td>
                        <td><ProductStatusBadge isActive={cat.is_active} /></td>
                        {(canUpdate || canDelete) && (
                          <td>
                            <div className="action-group">
                              {canUpdate && cat.is_active && (
                                <button className="logout" onClick={() => setEditingId(cat.id)}>
                                  Edit
                                </button>
                              )}
                              {canDelete && cat.is_active && (
                                <button className="logout logout--danger" onClick={() => handleDeactivate(cat.id)}>
                                  Deactivate
                                </button>
                              )}
                              {canUpdate && !cat.is_active && (
                                <button className="logout" onClick={() => handleReactivate(cat.id)}>
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
