type Props = {
  status: string;
  qcStatus?: string;
};

const STATUS_CLASS: Record<string, string> = {
  draft: "status-badge--warning",
  posted: "status-badge--success",
  cancelled: "status-badge--danger",
};

const QC_CLASS: Record<string, string> = {
  pending: "status-badge--warning",
  accepted: "status-badge--success",
  rejected: "status-badge--danger",
  partial: "status-badge--warning",
};

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

export function GrnStatusBadge({ status, qcStatus }: Props) {
  return (
    <span className={`status-badge ${STATUS_CLASS[status] ?? "status-badge--muted"}`}>
      {humanize(status)}
      {qcStatus && qcStatus !== "pending" ? ` / ${humanize(qcStatus)}` : ""}
    </span>
  );
}

export function QcStatusBadge({ qcStatus }: { qcStatus: string }) {
  return (
    <span className={`status-badge ${QC_CLASS[qcStatus] ?? "status-badge--muted"}`}>
      {humanize(qcStatus)}
    </span>
  );
}
