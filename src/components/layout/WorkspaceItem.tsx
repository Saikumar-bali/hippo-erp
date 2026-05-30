import type { WorkspaceItemMeta } from "../../lib/metadata/workspace-types";

type Props = {
  item: WorkspaceItemMeta;
  isActive: boolean;
  depth?: number;
  onClick: (item: WorkspaceItemMeta) => void;
};

export function WorkspaceItem({ item, isActive, depth = 0, onClick }: Props) {
  return (
    <button
      className={`ws-item ${isActive ? "ws-item--active" : ""}`}
      onClick={() => onClick(item)}
      style={{ paddingLeft: depth === 0 ? "12px 10px" : `calc(12px + ${depth * 14}px)` }}
      title={item.label}
    >
      <span className="ws-item-text">{item.label}</span>
    </button>
  );
}
