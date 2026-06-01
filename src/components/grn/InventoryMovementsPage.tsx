import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listInventoryMovements } from "../../lib/inventory-api";
import type { InventoryMovementRow } from "../../lib/inventory-api";

type Props = {
  tenantId: string;
};

const movementTypeLabels: Record<string, string> = {
  GRN_RECEIPT: "GRN Receipt",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  ADJUSTMENT: "Adjustment",
  REVERSAL: "Reversal",
};

export function InventoryMovementsPage({ tenantId }: Props) {
  const [rows, setRows] = useState<InventoryMovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listInventoryMovements(tenantId);
      setRows(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load inventory movements";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (r) =>
        r.product_sku.toLowerCase().includes(q) ||
        r.product_name.toLowerCase().includes(q) ||
        r.movement_type.toLowerCase().includes(q) ||
        (r.batch_number ?? "").toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const filterStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "var(--font-size-sm, 12px)",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    background: "#fff",
    minWidth: "200px",
  };

  return (
    <div className="module-stack">
      <div className="card">
        <div className="card-head">
          <h3>Inventory Movements</h3>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product, type, or batch…"
            style={filterStyle}
          />
        </div>

        {loading && <div className="card state-info">Loading movements…</div>}
        {!!error && <div className="card state-error">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <strong>{searchQuery ? "No matching movements." : "No movements yet."}</strong>
            <p>{searchQuery ? "Try adjusting your search." : "Post a GRN to create movement records."}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table className="erp-table" style={{ width: "100%", fontSize: "var(--font-size-sm, 12px)" }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Bin</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.movement_date ? new Date(r.movement_date).toLocaleString() : "—"}</td>
                    <td>{movementTypeLabels[r.movement_type] ?? r.movement_type}</td>
                    <td>{r.source_type}</td>
                    <td>{r.product_sku} — {r.product_name}</td>
                    <td>{r.batch_number ?? "—"}</td>
                    <td>
                      {r.bin_code ? `${r.bin_code}${r.bin_name ? ` — ${r.bin_name}` : ""}` : "—"}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 600,
                        color: r.qty_delta >= 0 ? "#065f46" : "#991b1b",
                      }}
                    >
                      {r.qty_delta > 0 ? "+" : ""}{Number(r.qty_delta).toLocaleString()}
                    </td>
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
