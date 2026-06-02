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
  const metadataStudioHomeItem: WorkspaceItemMeta = {
    id: `${group.workspace.workspace_key}__home`,
    workspace_key: group.workspace.workspace_key,
    item_key: group.workspace.workspace_key,
    label: group.workspace.label,
    item_type: "page",
    target: group.workspace.workspace_key,
    icon: group.workspace.icon,
    sort_order: -1,
    is_active: true,
    required_permission_key: null,
  };
  const isMetadataStudioGroup = group.workspace.workspace_key === "metadata_studio";

  if (group.items.length === 0) return null;

  return (
    <div className="ws-group">
      <div className="ws-group-toggle">
        <button
          type="button"
          className="ws-group-toggle"
          onClick={() => setExpanded((prev) => !prev)}
          style={{ flex: isMetadataStudioGroup ? "0 0 auto" : "1 1 auto" }}
        >
          <span className="ws-group-icon">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
          <span className="ws-group-label">{group.workspace.label}</span>
        </button>
        {isMetadataStudioGroup && (
          <button
            type="button"
            className={`ws-item ${activeItemKey === metadataStudioHomeItem.item_key ? "ws-item--active" : ""}`}
            onClick={() => onItemClick(metadataStudioHomeItem)}
            style={{ marginTop: "8px", width: "100%", textAlign: "left" }}
            title="Open Metadata Studio builder home"
          >
            <span className="ws-item-text">Open Builder Home</span>
          </button>
        )}
      </div>

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
