import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "../../lib/types";
import { ProductForm } from "./ProductForm";
import { ProductStatusBadge } from "./ProductStatusBadge";
import { listCategories, listUoms } from "../../lib/product-api";
import type { ProductCategory, UnitOfMeasure } from "../../lib/types";

type Props = {
  product: Product;
  categoryLabel: string;
  uomLabel: string;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onClose: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
};

export function ProductDetail({
  product,
  categoryLabel,
  uomLabel,
  canUpdate,
  canDelete,
  onEdit,
  onClose,
  onDeactivate,
  onReactivate,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const startEditing = async () => {
    setLoadingEdit(true);
    try {
      const [cats, uomList] = await Promise.all([
        listCategories(product.tenant_id),
        listUoms(product.tenant_id),
      ]);
      setCategories(cats);
      setUoms(uomList);
      setEditing(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load form data.");
    } finally {
      setLoadingEdit(false);
    }
  };

  if (editing) {
    return (
      <ProductForm
        tenantId={product.tenant_id}
        categories={categories}
        uoms={uoms}
        product={product}
        onSaved={() => { setEditing(false); onEdit(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString() : "—";

  return (
    <div className="module-stack">
      <div className="detail-head">
        <div>
          <p className="eyebrow">Product Detail</p>
          <h3>{product.name}</h3>
        </div>
        <ProductStatusBadge isActive={product.is_active} />
      </div>

      <div className="detail-section">
        <h4 className="detail-section-title">Basic Info</h4>
        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-label">SKU</span>
            <span className="detail-value">{product.sku}</span>
          </div>
          {product.description && (
            <div className="detail-field detail-field--full">
              <span className="detail-label">Description</span>
              <span className="detail-value">{product.description}</span>
            </div>
          )}
        </div>
      </div>

      <div className="detail-section">
        <h4 className="detail-section-title">Identification</h4>
        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-label">Category</span>
            <span className="detail-value">{categoryLabel}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">UOM</span>
            <span className="detail-value">{uomLabel}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Barcode</span>
            <span className="detail-value">{product.barcode ?? "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">QR Value</span>
            <span className="detail-value">{product.qr_value ?? "—"}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h4 className="detail-section-title">Reorder Planning</h4>
        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-label">Reorder Point</span>
            <span className="detail-value">{product.reorder_point}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Reorder Quantity</span>
            <span className="detail-value">{product.reorder_quantity}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h4 className="detail-section-title">Tracking</h4>
        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-label">Batch Tracking</span>
            <span className="detail-value">
              {product.batch_tracking ? (
                <span className="mini-badge mini-badge--active">Enabled</span>
              ) : (
                <span className="mini-badge mini-badge--muted">Disabled</span>
              )}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Expiry Tracking</span>
            <span className="detail-value">
              {product.expiry_tracking ? (
                <span className="mini-badge mini-badge--active">Enabled</span>
              ) : (
                <span className="mini-badge mini-badge--muted">Disabled</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h4 className="detail-section-title">Audit</h4>
        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-label">Created By</span>
            <span className="detail-value">{product.created_by ?? "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Created</span>
            <span className="detail-value">{formatDate(product.created_at)}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Updated By</span>
            <span className="detail-value">{product.updated_by ?? "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Updated</span>
            <span className="detail-value">{formatDate(product.updated_at)}</span>
          </div>
        </div>
      </div>

      <div className="form-actions">
        {canUpdate && product.is_active && (
          <button className="primary-action" onClick={startEditing} disabled={loadingEdit}>
            {loadingEdit ? "Loading…" : "Edit Product"}
          </button>
        )}
        {canDelete && product.is_active && (
          <button className="logout logout--danger" onClick={onDeactivate}>
            Deactivate Product
          </button>
        )}
        {canUpdate && !product.is_active && (
          <button className="logout" onClick={onReactivate}>
            Reactivate Product
          </button>
        )}
        <button className="logout" onClick={onClose}>
          Back to List
        </button>
      </div>
    </div>
  );
}
