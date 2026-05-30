type Props = {
  value: boolean | string | null;
  activeLabel?: string;
  inactiveLabel?: string;
};

export function StatusField({ value, activeLabel = "Active", inactiveLabel = "Inactive" }: Props) {
  if (typeof value === "boolean") {
    return (
      <span className={`mini-badge ${value ? "mini-badge--active" : "mini-badge--inactive"}`}>
        {value ? activeLabel : inactiveLabel}
      </span>
    );
  }

  const isActive = value === "active" || value === "Active" || value === "true";
  return (
    <span className={`mini-badge ${isActive ? "mini-badge--active" : "mini-badge--inactive"}`}>
      {String(value ?? inactiveLabel)}
    </span>
  );
}
