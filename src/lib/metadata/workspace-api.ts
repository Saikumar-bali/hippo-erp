import { supabase } from "../supabase";
import type { WorkspaceMeta, WorkspaceItemMeta, WorkspaceTreeItem } from "./workspace-types";

const meta = () => supabase.schema("app");

function mapRows<T>(data: unknown): T[] {
  return (data as T[]) ?? [];
}

export async function getWorkspaces(): Promise<WorkspaceMeta[]> {
  const { data, error } = await meta()
    .from("erp_workspaces")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<WorkspaceMeta>(data);
}

export async function getWorkspaceItems(workspaceKey?: string): Promise<WorkspaceItemMeta[]> {
  let query = meta()
    .from("erp_workspace_items")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (workspaceKey) {
    query = query.eq("workspace_key", workspaceKey);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return mapRows<WorkspaceItemMeta>(data);
}

export async function getWorkspaceTree(): Promise<WorkspaceTreeItem[]> {
  const [workspaces, allItems] = await Promise.all([
    getWorkspaces(),
    getWorkspaceItems(),
  ]);

  const itemMap = new Map<string, WorkspaceItemMeta[]>();
  for (const item of allItems) {
    const list = itemMap.get(item.workspace_key) ?? [];
    list.push(item);
    itemMap.set(item.workspace_key, list);
  }

  return workspaces.map((ws) => ({
    workspace: ws,
    items: itemMap.get(ws.workspace_key) ?? [],
  }));
}
