type Props = {
  status: string;
  qcStatus?: string;
};

const STYLES: Record<string, React.CSSProperties> = {
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "var(--font-size-xs, 11px)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  },
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#fef3c7", color: "#92400e" },
  posted: { bg: "#d1fae5", color: "#065f46" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

const QC_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: "#fef3c7", color: "#92400e" },
  accepted: { bg: "#d1fae5", color: "#065f46" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
  partial: { bg: "#ffedd5", color: "#9a3412" },
};

export function GrnStatusBadge({ status, qcStatus }: Props) {
  const sc = STATUS_COLORS[status] ?? { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{ ...STYLES.badge, backgroundColor: sc.bg, color: sc.color }}>
      {status}
      {qcStatus && qcStatus !== "pending" ? ` / ${qcStatus}` : ""}
    </span>
  );
}

export function QcStatusBadge({ qcStatus }: { qcStatus: string }) {
  const qc = QC_COLORS[qcStatus] ?? { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{ ...STYLES.badge, backgroundColor: qc.bg, color: qc.color }}>
      {qcStatus}
    </span>
  );
}
