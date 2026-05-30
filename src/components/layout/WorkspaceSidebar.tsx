import { Boxes } from "lucide-react";
import type { WorkspaceTreeItem } from "../../lib/metadata/workspace-types";
import type { WorkspaceItemMeta } from "../../lib/metadata/workspace-types";
import { WorkspaceGroup } from "./WorkspaceGroup";
import { WorkspaceItem } from "./WorkspaceItem";

type Props = {
  tree: WorkspaceTreeItem[];
  activeItemKey: string | null;
  onItemClick: (item: WorkspaceItemMeta) => void;
  onHomeClick: () => void;
};

export function WorkspaceSidebar({ tree, activeItemKey, onItemClick, onHomeClick }: Props) {
  return (
    <aside className="sidebar">
      <button className="brand ws-home-btn" onClick={onHomeClick}>
        <Boxes size={18} /> Hippo ERP
      </button>

      <nav className="ws-nav">
        {tree.map((group) => {
          if (group.items.length === 0) return null;
          if (group.items.length === 1 && !group.workspace.label) {
            return (
              <WorkspaceItem
                key={group.items[0].item_key}
                item={group.items[0]}
                isActive={activeItemKey === group.items[0].item_key}
                onClick={onItemClick}
              />
            );
          }
          return (
            <WorkspaceGroup
              key={group.workspace.workspace_key}
              group={group}
              activeItemKey={activeItemKey}
              onItemClick={onItemClick}
            />
          );
        })}
      </nav>
    </aside>
  );
}
