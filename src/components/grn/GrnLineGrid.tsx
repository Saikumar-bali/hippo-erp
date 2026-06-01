import { useMemo } from "react";
import type { GrnLineInput } from "../../lib/grn-api";

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

type Props = {
  lines: GrnLineInput[];
  products: ProductOption[];
  uoms: UomOption[];
  bins: BinOption[];
  readOnly: boolean;
  onChange?: (lines: GrnLineInput[]) => void;
  errors?: Record<string, string>;
};

function formatDate(d: string | undefined): string {
  if (!d) return "";
  return d.substring(0, 10);
}

export function GrnLineGrid({ lines, products, uoms, bins, readOnly, onChange, errors }: Props) {
  const productMap = useMemo(() => {
    const m = new Map<string, ProductOption>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const uomMap = useMemo(() => {
    const m = new Map<string, UomOption>();
    for (const u of uoms) m.set(u.id, u);
    return m;
  }, [uoms]);

  const binMap = useMemo(() => {
    const m = new Map<string, BinOption>();
    for (const b of bins) m.set(b.id, b);
    return m;
  }, [bins]);

  const updateLine = (idx: number, patch: Partial<GrnLineInput>) => {
    if (!onChange || readOnly) return;
    const next = lines.map((line, i) => (i === idx ? { ...line, ...patch } : line));
    onChange(next);
  };

  const removeLine = (idx: number) => {
    if (!onChange || readOnly) return;
    onChange(lines.filter((_, i) => i !== idx));
  };

  const addLine = () => {
    if (!onChange || readOnly) return;
    onChange([...lines, { product_id: "", uom_id: "", received_qty: 1, accepted_qty: 1, rejected_qty: 0 }]);
  };

  const firstErrorKey = Object.keys(errors ?? {})[0];

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "4px 6px",
    fontSize: "var(--font-size-sm, 12px)",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    background: readOnly ? "#f9fafb" : "#fff",
    minHeight: "28px",
  };

  return (
    <div>
      <table className="erp-table" style={{ width: "100%", fontSize: "var(--font-size-sm, 12px)" }}>
        <thead>
          <tr>
            <th style={{ width: "30px" }}>#</th>
            <th style={{ minWidth: "180px" }}>Product</th>
            <th style={{ width: "100px" }}>UOM</th>
            <th style={{ width: "80px", textAlign: "right" }}>Received</th>
            <th style={{ width: "80px", textAlign: "right" }}>Accepted</th>
            <th style={{ width: "80px", textAlign: "right" }}>Rejected</th>
            <th style={{ width: "120px" }}>Batch</th>
            <th style={{ width: "110px" }}>Expiry</th>
            <th style={{ minWidth: "140px" }}>Bin</th>
            {!readOnly && <th style={{ width: "40px" }}></th>}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr>
              <td colSpan={readOnly ? 9 : 10} style={{ textAlign: "center", padding: "16px", color: "#6b7280" }}>
                No line items.
              </td>
            </tr>
          )}
          {lines.map((line, idx) => {
            const product = productMap.get(line.product_id);
            return (
              <tr key={idx}>
                <td style={{ textAlign: "center", color: "#6b7280" }}>{idx + 1}</td>
                <td>
                  {readOnly ? (
                    <span>{product ? `${product.sku} — ${product.name}` : line.product_id}</span>
                  ) : (
                    <select
                      value={line.product_id}
                      onChange={(e) => updateLine(idx, { product_id: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">-- Select --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  {readOnly ? (
                    <span>{uomMap.get(line.uom_id)?.code ?? line.uom_id}</span>
                  ) : (
                    <select
                      value={line.uom_id}
                      onChange={(e) => updateLine(idx, { uom_id: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">--</option>
                      {uoms.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.code}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={line.received_qty}
                    onChange={(e) => updateLine(idx, { received_qty: Number(e.target.value) })}
                    style={{ ...inputStyle, textAlign: "right" }}
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={line.accepted_qty ?? line.received_qty}
                    onChange={(e) => updateLine(idx, { accepted_qty: Number(e.target.value) })}
                    style={{ ...inputStyle, textAlign: "right" }}
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={line.rejected_qty ?? 0}
                    onChange={(e) => updateLine(idx, { rejected_qty: Number(e.target.value) })}
                    style={{ ...inputStyle, textAlign: "right" }}
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={line.batch_number ?? ""}
                    onChange={(e) => updateLine(idx, { batch_number: e.target.value })}
                    style={inputStyle}
                    placeholder="Batch/Lot"
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={formatDate(line.expiry_date)}
                    onChange={(e) => updateLine(idx, { expiry_date: e.target.value })}
                    style={inputStyle}
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  {readOnly ? (
                    <span>{binMap.get(line.bin_id ?? "")?.bin_code ?? line.bin_id ?? "—"}</span>
                  ) : (
                    <select
                      value={line.bin_id ?? ""}
                      onChange={(e) => updateLine(idx, { bin_id: e.target.value || undefined })}
                      style={inputStyle}
                    >
                      <option value="">-- Select Bin --</option>
                      {bins.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bin_code} — {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                {!readOnly && (
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="logout logout--danger"
                      style={{ padding: "2px 6px", fontSize: "11px" }}
                      onClick={() => removeLine(idx)}
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {firstErrorKey && errors && <div className="field-error" style={{ marginTop: "4px" }}>{errors[firstErrorKey]}</div>}
      {!readOnly && (
        <button
          type="button"
          className="logout"
          style={{ marginTop: "6px", fontSize: "var(--font-size-sm, 12px)" }}
          onClick={addLine}
        >
          + Add Line
        </button>
      )}
    </div>
  );
}
