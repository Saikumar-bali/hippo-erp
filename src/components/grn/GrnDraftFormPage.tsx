import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createGrnDraft,
  updateGrnDraft,
  getGrn,
  postGrn,
} from "../../lib/grn-api";
import type { GrnLineInput, GrnWithLines } from "../../lib/grn-api";
import { listProducts } from "../../lib/product-api";
import { listUoms } from "../../lib/product-api";
import { supabase } from "../../lib/supabase";
import { GrnLineGrid } from "./GrnLineGrid";

type Props = {
  tenantId: string;
  grnId?: string;
  onSaved: () => void;
  onCancel: () => void;
};

interface BinOption {
  id: string;
  bin_code: string;
  name: string;
}

interface ProductOption {
  id: string;
  sku: string;
  name: string;
}

interface UomOption {
  id: string;
  code: string;
  name: string;
}

export function GrnDraftFormPage({ tenantId, grnId, onSaved, onCancel }: Props) {
  const isEdit = !!grnId;

  const [grnNumber, setGrnNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<GrnLineInput[]>([]);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [uoms, setUoms] = useState<UomOption[]>([]);
  const [bins, setBins] = useState<BinOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [formError, setFormError] = useState("");

  const loadDeps = useCallback(async () => {
    try {
      const [productData, uomData, binData] = await Promise.all([
        listProducts(tenantId),
        listUoms(tenantId),
        supabase
          .schema("wh")
          .from("warehouse_bins")
          .select("id, bin_code, name")
          .eq("tenant_id", tenantId)
          .throwOnError(),
      ]);
      setProducts(productData as ProductOption[]);
      setUoms(uomData as UomOption[]);
      setBins((binData.data ?? []) as BinOption[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load form data";
      setFetchError(msg);
      toast.error(msg);
    }
  }, [tenantId]);

  const loadGrn = useCallback(async () => {
    if (!grnId) return;
    try {
      const result: GrnWithLines = await getGrn(grnId);
      const { grn, lines: gl } = result;
      setGrnNumber(grn.grn_number);
      setSupplierName(grn.supplier_name);
      setReceivedDate(grn.received_date?.substring(0, 10) ?? "");
      setNotes(grn.notes ?? "");
      setLines(
        gl.map((l) => ({
          product_id: l.product_id,
          uom_id: l.uom_id,
          received_qty: l.received_qty,
          accepted_qty: l.accepted_qty,
          rejected_qty: l.rejected_qty,
          batch_number: l.batch_number ?? undefined,
          expiry_date: l.expiry_date ?? undefined,
          bin_id: l.bin_id ?? undefined,
        }))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load GRN";
      setFetchError(msg);
      toast.error(msg);
    }
  }, [grnId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadDeps();
      if (isEdit) await loadGrn();
      setLoading(false);
    };
    void init();
  }, [loadDeps, loadGrn, isEdit]);

  const validate = (): boolean => {
    let valid = true;
    const newErrors: Record<string, string> = {};

    if (!grnNumber.trim()) {
      setFormError("GRN Number is required.");
      return false;
    }
    if (!supplierName.trim()) {
      setFormError("Supplier name is required.");
      return false;
    }
    if (lines.length === 0) {
      setFormError("At least one line item is required.");
      return false;
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.product_id) { newErrors[i] = "Product required"; valid = false; }
      if (!l.uom_id) { newErrors[i] = "UOM required"; valid = false; }
      if (!l.received_qty || l.received_qty <= 0) { newErrors[i] = "Received qty must be > 0"; valid = false; }
      if ((l.accepted_qty ?? 0) + (l.rejected_qty ?? 0) > l.received_qty) {
        newErrors[i] = "Accepted + rejected cannot exceed received";
        valid = false;
      }
    }

    setLineErrors(newErrors);
    if (valid) setFormError("");
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        tenant_id: tenantId,
        grn_number: grnNumber.trim(),
        supplier_name: supplierName.trim(),
        received_date: receivedDate || undefined,
        notes: notes.trim() || undefined,
        lines,
      };

      if (isEdit) {
        await updateGrnDraft(grnId!, {
          supplier_name: payload.supplier_name,
          received_date: payload.received_date,
          notes: payload.notes,
          lines: payload.lines,
        });
        toast.success("Draft updated.");
      } else {
        await createGrnDraft(payload);
        toast.success("Draft created.");
      }
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async () => {
    if (!isEdit) {
      toast.error("Save the draft first before posting.");
      return;
    }
    if (!validate()) return;
    setPosting(true);
    setFormError("");
    try {
      // Ensure latest data is saved before posting
      await updateGrnDraft(grnId!, {
        supplier_name: supplierName.trim(),
        received_date: receivedDate || undefined,
        notes: notes.trim() || undefined,
        lines,
      });
      await postGrn(grnId!);
      toast.success("GRN posted successfully.");
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Post failed";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setPosting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    fontSize: "var(--font-size-sm, 13px)",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    background: "#fff",
  };

  if (loading) return <div className="card state-info">Loading form…</div>;
  if (fetchError) return <div className="card state-error">{fetchError}</div>;

  return (
    <div className="module-stack">
      <div className="card">
        <div className="card-head">
          <h3>{isEdit ? `Edit GRN ${grnNumber}` : "New GRN"}</h3>
        </div>

        {formError && <div className="card state-error" style={{ marginBottom: "12px" }}>{formError}</div>}

        <div className="grid" style={{ marginBottom: "16px" }}>
          <div className="field">
            <span>GRN Number</span>
            <input
              type="text"
              value={grnNumber}
              onChange={(e) => setGrnNumber(e.target.value)}
              style={inputStyle}
              placeholder="e.g. GRN-2026-0001"
              readOnly={isEdit}
            />
          </div>
          <div className="field">
            <span>Supplier</span>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              style={inputStyle}
              placeholder="Supplier name"
            />
          </div>
          <div className="field">
            <span>Received Date</span>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div className="field field--wide">
            <span>Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...inputStyle, minHeight: "50px", resize: "vertical" }}
              placeholder="Optional notes…"
            />
          </div>
        </div>

        <h4 style={{ margin: "0 0 8px", fontSize: "var(--font-size-sm, 13px)" }}>Line Items</h4>
        <GrnLineGrid
          lines={lines}
          products={products}
          uoms={uoms}
          bins={bins}
          readOnly={false}
          onChange={setLines}
          errors={lineErrors}
        />

        <div className="form-actions" style={{ marginTop: "16px" }}>
          <button className="logout" onClick={onCancel} disabled={saving || posting}>
            Cancel
          </button>
          <button className="primary-action" onClick={handleSave} disabled={saving || posting}>
            {saving ? "Saving…" : "Save Draft"}
          </button>
          {isEdit && (
            <button
              className="primary-action"
              style={{ backgroundColor: "#065f46" }}
              onClick={handlePost}
              disabled={saving || posting}
            >
              {posting ? "Posting…" : "Post GRN"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
