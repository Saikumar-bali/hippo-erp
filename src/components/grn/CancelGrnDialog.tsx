import { useState } from "react";
import { toast } from "sonner";
import { cancelGrn } from "../../lib/grn-api";

type Props = {
  grnId: string;
  grnNumber: string;
  onClose: () => void;
  onCancelled: () => void;
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "8px",
  padding: "24px",
  minWidth: "420px",
  maxWidth: "500px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
};

export function CancelGrnDialog({ grnId, grnNumber, onClose, onCancelled }: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error("Cancellation reason is required");
      return;
    }
    setSubmitting(true);
    try {
      await cancelGrn(grnId, reason.trim());
      toast.success(`GRN ${grnNumber} cancelled`);
      onCancelled();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancellation failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 12px", fontSize: "var(--font-size-md, 14px)" }}>
          Cancel GRN {grnNumber}
        </h3>
        <p style={{ fontSize: "var(--font-size-sm, 12px)", color: "#6b7280", margin: "0 0 16px" }}>
          This will create reversal inventory entries and reduce current inventory.
          This action <strong>cannot be undone</strong>.
        </p>
        <label
          htmlFor="cancel-reason"
          style={{ display: "block", fontSize: "var(--font-size-sm, 12px)", fontWeight: 600, marginBottom: "4px" }}
        >
          Reason <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <textarea
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: "6px 8px",
            fontSize: "var(--font-size-sm, 12px)",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            resize: "vertical",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
          placeholder="Explain why this GRN is being cancelled…"
          autoFocus
        />
        <div className="form-actions" style={{ marginTop: "16px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="logout" onClick={onClose} disabled={submitting}>
            Keep GRN
          </button>
          <button
            className="primary"
            onClick={handleCancel}
            disabled={submitting || !reason.trim()}
            style={{ backgroundColor: "#dc2626", borderColor: "#dc2626" }}
          >
            {submitting ? "Cancelling…" : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}
