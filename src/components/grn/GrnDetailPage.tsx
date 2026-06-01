import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getGrn } from "../../lib/grn-api";
import type { GrnWithLines } from "../../lib/grn-api";
import { listProducts } from "../../lib/product-api";
import { listUoms } from "../../lib/product-api";
import { supabase } from "../../lib/supabase";
import { GrnStatusBadge } from "./GrnStatusBadge";
import { GrnLineGrid } from "./GrnLineGrid";

type Props = {
  grnId: string;
  tenantId: string;
  onBack: () => void;
};

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

interface BinOption {
  id: string;
  bin_code: string;
  name: string;
}

export function GrnDetailPage({ grnId, tenantId, onBack }: Props) {
  const [data, setData] = useState<GrnWithLines | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [uoms, setUoms] = useState<UomOption[]>([]);
  const [bins, setBins] = useState<BinOption[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [result, productData, uomData, binResult] = await Promise.all([
        getGrn(grnId),
        listProducts(tenantId),
        listUoms(tenantId),
        supabase.rpc("wh_list_bins", { p_tenant_id: tenantId }),
      ]);
      setData(result);
      setProducts(productData as ProductOption[]);
      setUoms(uomData as UomOption[]);
      if (binResult.error) throw binResult.error;
      const binPayload = binResult.data as { ok: boolean; data: BinOption[] };
      setBins(binPayload.ok ? (binPayload.data ?? []) : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load GRN";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [grnId, tenantId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="card state-info">Loading GRN details…</div>;
  if (error) return <div className="card state-error">{error}</div>;
  if (!data) return <div className="card state-error">GRN not found</div>;

  const { grn, lines } = data;
  const lineInputs = lines.map((l) => ({
    product_id: l.product_id,
    uom_id: l.uom_id,
    received_qty: l.received_qty,
    accepted_qty: l.accepted_qty,
    rejected_qty: l.rejected_qty,
    batch_number: l.batch_number ?? undefined,
    expiry_date: l.expiry_date ?? undefined,
    bin_id: l.bin_id ?? undefined,
  }));

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "var(--font-size-xs, 11px)",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const valueStyle: React.CSSProperties = {
    fontSize: "var(--font-size-sm, 13px)",
    color: "#142033",
  };

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  };

  return (
    <div className="module-stack">
      <div className="card">
        <div className="card-head">
          <h3>GRN {grn.grn_number}</h3>
          <GrnStatusBadge status={grn.status} qcStatus={grn.qc_status} />
        </div>

        <div style={rowStyle}>
          <div style={fieldStyle}>
            <span style={labelStyle}>Supplier</span>
            <span style={valueStyle}>{grn.supplier_name}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Received Date</span>
            <span style={valueStyle}>{grn.received_date?.substring(0, 10)}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Created</span>
            <span style={valueStyle}>{new Date(grn.created_at).toLocaleString()}</span>
          </div>
          {grn.posted_at && (
            <div style={fieldStyle}>
              <span style={labelStyle}>Posted At</span>
              <span style={valueStyle}>{new Date(grn.posted_at).toLocaleString()}</span>
            </div>
          )}
        </div>

        {grn.notes && (
          <div style={{ ...fieldStyle, marginBottom: "16px" }}>
            <span style={labelStyle}>Notes</span>
            <span style={valueStyle}>{grn.notes}</span>
          </div>
        )}

        <h4 style={{ margin: "0 0 8px", fontSize: "var(--font-size-sm, 13px)" }}>Line Items</h4>
        <GrnLineGrid
          lines={lineInputs}
          products={products}
          uoms={uoms}
          bins={bins}
          readOnly
        />

        <div className="form-actions" style={{ marginTop: "16px" }}>
          <button className="logout" onClick={onBack}>Back to List</button>
        </div>
      </div>
    </div>
  );
}
