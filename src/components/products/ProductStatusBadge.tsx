type Props = { isActive: boolean };

export function ProductStatusBadge({ isActive }: Props) {
  return (
    <span className={`mini-badge ${isActive ? "mini-badge--active" : "mini-badge--inactive"}`}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
