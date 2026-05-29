import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "../../lib/product-api";
import { validateCategoryForm } from "../../lib/product-validation";
import type { ProductCategory } from "../../lib/types";

type Props = {
  tenantId: string;
  categories: ProductCategory[];
  category?: ProductCategory;
  onSaved: () => void;
  onCancel: () => void;
};

export function ProductCategoryForm({ tenantId, categories, category, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code") ?? "");
    const name = String(fd.get("name") ?? "");
    let description = String(fd.get("description") ?? "");
    const parent_category_id = String(fd.get("parent_category_id") ?? "");
    const sort_order = Number(fd.get("sort_order") ?? 0);
    const category_type = String(fd.get("category_type") ?? "");

    if (description.startsWith("Description:")) {
      description = description.slice("Description:".length).trim();
    }

    const validation = validateCategoryForm({ code, name });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (category) {
        await updateCategory(category.id, {
          code,
          name,
          description: description || null,
          parent_category_id: parent_category_id || null,
          sort_order: sort_order || 0,
          category_type: category_type || null,
        });
        toast.success("Category updated.");
      } else {
        await createCategory({
          tenant_id: tenantId,
          code,
          name,
          description: description || undefined,
          parent_category_id: parent_category_id || undefined,
          sort_order: sort_order || 0,
          category_type: category_type || undefined,
        });
        toast.success("Category created.");
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

  const siblings = categories.filter((c) => c.id !== category?.id && c.is_active);

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="field">
        <span>Code *</span>
        <input name="code" defaultValue={category?.code ?? ""} required />
        {errors.code && <span className="field-error">{errors.code}</span>}
      </label>
      <label className="field">
        <span>Name *</span>
        <input name="name" defaultValue={category?.name ?? ""} required />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label className="field field--wide">
        <span>Description</span>
        <textarea name="description" defaultValue={category?.description ?? ""} rows={3} />
      </label>
      <label className="field">
        <span>Parent Category</span>
        <select name="parent_category_id" defaultValue={category?.parent_category_id ?? ""}>
          <option value="">(None)</option>
          {siblings.map((c) => (
            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Sort Order</span>
        <input name="sort_order" type="number" defaultValue={category?.sort_order ?? 0} />
      </label>
      <label className="field">
        <span>Category Type</span>
        <input name="category_type" defaultValue={category?.category_type ?? ""} placeholder="e.g. raw_material, finished_good" />
      </label>
      {errors.form && <div className="state-error">{errors.form}</div>}
      <div className="form-actions">
        <button type="submit" className="primary-action" disabled={saving}>
          {saving ? "Saving…" : category ? "Update Category" : "Create Category"}
        </button>
        <button type="button" className="logout" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
