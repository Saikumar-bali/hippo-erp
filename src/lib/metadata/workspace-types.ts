export type WorkspaceItemType = "doctype" | "workspace" | "page" | "report" | "external";

export interface WorkspaceMeta {
  id: string;
  workspace_key: string;
  label: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface WorkspaceItemMeta {
  id: string;
  workspace_key: string;
  item_key: string;
  label: string;
  item_type: WorkspaceItemType;
  target: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  required_permission_key: string | null;
}

export interface WorkspaceTreeItem {
  workspace: WorkspaceMeta;
  items: WorkspaceItemMeta[];
}
