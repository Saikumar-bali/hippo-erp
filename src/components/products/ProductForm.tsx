import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { createProduct, updateProduct } from "../../lib/product-api";
import { validateProductForm } from "../../lib/product-validation";
import type { Product, ProductCategory, UnitOfMeasure } from "../../lib/types";

type Props = {
  tenantId: string;
  categories: ProductCategory[];
  uoms: UnitOfMeasure[];
  product?: Product;
  onSaved: () => void;
  onCancel: () => void;
};

export function ProductForm({ tenantId, categories, uoms, product, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [batchTracking, setBatchTracking] = useState(product?.batch_tracking ?? false);
  const [expiryTracking, setExpiryTracking] = useState(product?.expiry_tracking ?? false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const data = {
      sku: String(fd.get("sku") ?? ""),
      name: String(fd.get("name") ?? ""),
      category_id: String(fd.get("category_id") ?? ""),
      uom_id: String(fd.get("uom_id") ?? ""),
      reorder_point: Number(fd.get("reorder_point") ?? 0),
      reorder_quantity: Number(fd.get("reorder_quantity") ?? 0),
      batch_tracking: fd.get("batch_tracking") === "on",
      expiry_tracking: fd.get("expiry_tracking") === "on",
    };

    const validation = validateProductForm(data);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      if (product) {
        await updateProduct(product.id, {
          ...data,
          description: String(fd.get("description") ?? "") || null,
          barcode: String(fd.get("barcode") ?? "") || null,
          qr_value: String(fd.get("qr_value") ?? "") || null,
        });
        toast.success("Product updated.");
      } else {
        await createProduct({
          tenant_id: tenantId,
          ...data,
          description: String(fd.get("description") ?? "") || undefined,
          barcode: String(fd.get("barcode") ?? "") || undefined,
          qr_value: String(fd.get("qr_value") ?? "") || undefined,
        });
        toast.success("Product created.");
      }
      onSaved();
    } catch (err: any) {
      const msg = err?.message ?? "Save failed.";
      toast.error(msg);
      setErrors({ form: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="field">
        <span>SKU *</span>
        <input name="sku" defaultValue={product?.sku ?? ""} required />
        {errors.sku && <span className="field-error">{errors.sku}</span>}
      </label>
      <label className="field">
        <span>Name *</span>
        <input name="name" defaultValue={product?.name ?? ""} required />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label className="field field--wide">
        <span>Description</span>
        <textarea name="description" defaultValue={product?.description ?? ""} rows={3} />
      </label>
      <label className="field">
        <span>Category *</span>
        <select name="category_id" defaultValue={product?.category_id ?? ""} required>
          <option value="">Select category…</option>
          {categories
            .filter((c) => c.is_active)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
        </select>
        {errors.category_id && <span className="field-error">{errors.category_id}</span>}
      </label>
      <label className="field">
        <span>UOM *</span>
        <select name="uom_id" defaultValue={product?.uom_id ?? ""} required>
          <option value="">Select UOM…</option>
          {uoms
            .filter((u) => u.is_active)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} - {u.name}
              </option>
            ))}
        </select>
        {errors.uom_id && <span className="field-error">{errors.uom_id}</span>}
      </label>
      <label className="field">
        <span>Barcode</span>
        <input name="barcode" defaultValue={product?.barcode ?? ""} />
      </label>
      <label className="field">
        <span>QR Value</span>
        <input name="qr_value" defaultValue={product?.qr_value ?? ""} />
      </label>
      <label className="field">
        <span>Reorder Point</span>
        <input name="reorder_point" type="number" min="0" step="1" defaultValue={product?.reorder_point ?? 0} />
        {errors.reorder_point && <span className="field-error">{errors.reorder_point}</span>}
      </label>
      <label className="field">
        <span>Reorder Quantity</span>
        <input name="reorder_quantity" type="number" min="0" step="1" defaultValue={product?.reorder_quantity ?? 0} />
        {errors.reorder_quantity && <span className="field-error">{errors.reorder_quantity}</span>}
      </label>
      <label className="field field--checkbox">
        <input
          type="checkbox"
          name="batch_tracking"
          checked={batchTracking}
          onChange={(e) => {
            setBatchTracking(e.target.checked);
            if (!e.target.checked) setExpiryTracking(false);
          }}
        />
        <span>Enable batch tracking</span>
      </label>
      <label className="field field--checkbox">
        <input
          type="checkbox"
          name="expiry_tracking"
          checked={expiryTracking}
          disabled={!batchTracking}
          onChange={(e) => setExpiryTracking(e.target.checked)}
        />
        <span>Enable expiry tracking</span>
        {errors.expiry_tracking && <span className="field-error">{errors.expiry_tracking}</span>}
      </label>
      {errors.form && <div className="state-error">{errors.form}</div>}
      <div className="form-actions">
        <button type="submit" className="primary-action" disabled={saving}>
          {saving ? "Saving…" : product ? "Update Product" : "Create Product"}
        </button>
        <button type="button" className="logout" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
