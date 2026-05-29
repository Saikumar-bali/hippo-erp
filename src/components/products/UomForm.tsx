import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { createUom, updateUom } from "../../lib/product-api";
import { validateUomForm } from "../../lib/product-validation";
import type { UnitOfMeasure } from "../../lib/types";

type Props = {
  tenantId: string;
  uom?: UnitOfMeasure;
  onSaved: () => void;
  onCancel: () => void;
};

export function UomForm({ tenantId, uom, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code") ?? "");
    const name = String(fd.get("name") ?? "");
    const description = String(fd.get("description") ?? "");
    const symbol = String(fd.get("symbol") ?? "");
    const decimal_precision = Number(fd.get("decimal_precision") ?? 0);
    const uom_type = String(fd.get("uom_type") ?? "");

    const validation = validateUomForm({ code, name });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (uom) {
        await updateUom(uom.id, {
          code,
          name,
          description: description || null,
          symbol: symbol || null,
          decimal_precision: decimal_precision || 0,
          uom_type: uom_type || null,
        });
        toast.success("UOM updated.");
      } else {
        await createUom({
          tenant_id: tenantId,
          code,
          name,
          description: description || undefined,
          symbol: symbol || undefined,
          decimal_precision: decimal_precision || 0,
          uom_type: uom_type || undefined,
        });
        toast.success("UOM created.");
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
        <span>Code *</span>
        <input name="code" defaultValue={uom?.code ?? ""} required />
        {errors.code && <span className="field-error">{errors.code}</span>}
      </label>
      <label className="field">
        <span>Name *</span>
        <input name="name" defaultValue={uom?.name ?? ""} required />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label className="field">
        <span>Symbol</span>
        <input name="symbol" defaultValue={uom?.symbol ?? ""} placeholder="e.g. kg, L, pcs" />
      </label>
      <label className="field">
        <span>Decimal Precision</span>
        <input name="decimal_precision" type="number" defaultValue={uom?.decimal_precision ?? 0} />
      </label>
      <label className="field field--wide">
        <span>Description</span>
        <textarea name="description" defaultValue={uom?.description ?? ""} rows={3} />
      </label>
      <label className="field field--wide">
        <span>UOM Type</span>
        <input name="uom_type" defaultValue={uom?.uom_type ?? ""} placeholder="e.g. weight, volume, count" />
      </label>
      {errors.form && <div className="state-error">{errors.form}</div>}
      <div className="form-actions">
        <button type="submit" className="primary-action" disabled={saving}>
          {saving ? "Saving…" : uom ? "Update UOM" : "Create UOM"}
        </button>
        <button type="button" className="logout" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
