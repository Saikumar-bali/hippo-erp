import { useState } from "react";
import type { WorkspaceTreeItem } from "../../lib/metadata/workspace-types";
import type { WorkspaceItemMeta } from "../../lib/metadata/workspace-types";
import { WorkspaceItem } from "./WorkspaceItem";
import { ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  group: WorkspaceTreeItem;
  activeItemKey: string | null;
  onItemClick: (item: WorkspaceItemMeta) => void;
};

export function WorkspaceGroup({ group, activeItemKey, onItemClick }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (group.items.length === 0) return null;

  return (
    <div className="ws-group">
      <button
        className="ws-group-toggle"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className="ws-group-icon">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="ws-group-label">{group.workspace.label}</span>
      </button>

      {expanded && (
        <div className="ws-group-items">
          {group.items.map((item) => (
            <WorkspaceItem
              key={item.item_key}
              item={item}
              isActive={activeItemKey === item.item_key}
              depth={1}
              onClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
