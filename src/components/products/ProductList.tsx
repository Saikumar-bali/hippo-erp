import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listProducts, deactivateProduct, reactivateProduct, listCategories, listUoms } from "../../lib/product-api";
import type { Product, ProductCategory, UnitOfMeasure } from "../../lib/types";
import { ProductForm } from "./ProductForm";
import { ProductDetail } from "./ProductDetail";
import { ProductStatusBadge } from "./ProductStatusBadge";

type Props = {
  tenantId: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export function ProductList({ tenantId, canCreate, canUpdate, canDelete }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [prods, cats, uomList] = await Promise.all([
        listProducts(tenantId),
        listCategories(tenantId),
        listUoms(tenantId),
      ]);
      setProducts(prods);
      setCategories(cats);
      setUoms(uomList);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load products.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, [tenantId]);

  const catMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, `${c.code} - ${c.name}`);
    return m;
  }, [categories]);

  const uomMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of uoms) m.set(u.id, u.code);
    return m;
  }, [uoms]);

  const filtered = useMemo(() => {
    let list = products;
    if (filterActive === "active") list = list.filter((p) => p.is_active);
    else if (filterActive === "inactive") list = list.filter((p) => !p.is_active);
    if (filterCategory !== "all") list = list.filter((p) => p.category_id === filterCategory);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, filterActive, filterCategory, search]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId]
  );

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateProduct(id);
      toast.success("Product deactivated.");
      void loadAll();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to deactivate.");
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await reactivateProduct(id);
      toast.success("Product reactivated.");
      void loadAll();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reactivate.");
    }
  };

  if (loading) {
    return <div className="card state-info">Loading products…</div>;
  }

  if (error) {
    return <div className="card state-error">{error}</div>;
  }

  return (
    <div className="module-stack">
      {creating ? (
        <div className="card">
          <div className="card-head">
            <h3>New Product</h3>
          </div>
          <ProductForm
            tenantId={tenantId}
            categories={categories}
            uoms={uoms}
            onSaved={() => { setCreating(false); void loadAll(); }}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : selectedProduct ? (
        <div className="card">
          <ProductDetail
            product={selectedProduct}
            categoryLabel={catMap.get(selectedProduct.category_id) ?? selectedProduct.category_id}
            uomLabel={uomMap.get(selectedProduct.uom_id) ?? selectedProduct.uom_id}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={() => setSelectedId(null)}
            onClose={() => setSelectedId(null)}
            onDeactivate={() => { setSelectedId(null); handleDeactivate(selectedProduct.id); }}
            onReactivate={() => { setSelectedId(null); handleReactivate(selectedProduct.id); }}
          />
        </div>
      ) : (
        <div className="card">
          <div className="card-head">
            <h3>Products</h3>
            {canCreate && (
              <button className="primary-action" onClick={() => setCreating(true)}>
                + New Product
              </button>
            )}
          </div>

          <div className="filter-bar">
            <input
              className="search-input"
              placeholder="Search by SKU, name, or barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">All categories</option>
              {categories
                .filter((c) => c.is_active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="state-info card state-note">
              {products.length === 0
                ? "No products yet. Create one to get started."
                : "No products match the current filters."}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>UOM</th>
                    <th>Tracking</th>
                    <th>Reorder</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.sku}</strong></td>
                      <td>
                        <button className="link-button" onClick={() => setSelectedId(p.id)}>
                          {p.name}
                        </button>
                      </td>
                      <td>{catMap.get(p.category_id) ?? "—"}</td>
                      <td>{uomMap.get(p.uom_id) ?? "—"}</td>
                      <td>
                        {p.batch_tracking && p.expiry_tracking ? (
                          <span className="tracking-badge tracking-badge--both">Batch + Expiry</span>
                        ) : p.batch_tracking ? (
                          <span className="tracking-badge tracking-badge--batch">Batch only</span>
                        ) : (
                          <span className="tracking-badge tracking-badge--none">None</span>
                        )}
                      </td>
                      <td>
                        <span className="mini-badge mini-badge--muted">
                          ROP: {p.reorder_point} / ROQ: {p.reorder_quantity}
                        </span>
                      </td>
                      <td><ProductStatusBadge isActive={p.is_active} /></td>
                      <td>
                        <div className="action-group">
                          <button className="logout" onClick={() => setSelectedId(p.id)}>
                            View
                          </button>
                          {canUpdate && p.is_active && (
                            <button className="logout" onClick={() => setSelectedId(p.id)}>
                              Edit
                            </button>
                          )}
                          {canDelete && p.is_active && (
                            <button className="logout logout--danger" onClick={() => handleDeactivate(p.id)}>
                              Deactivate
                            </button>
                          )}
                          {canUpdate && !p.is_active && (
                            <button className="logout" onClick={() => handleReactivate(p.id)}>
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
