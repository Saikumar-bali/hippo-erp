import { useCallback, useEffect, useMemo, useState } from "react";
import { getWorkspaceTree } from "../lib/metadata/workspace-api";
import { ERP_MODULES } from "../lib/erp-modules";
import type { WorkspaceTreeItem } from "../lib/metadata/workspace-types";
import { usePermissions } from "./usePermissions";

type LoadState = "loading" | "loaded" | "fallback" | "error";

export function useWorkspaceNavigation() {
  const [tree, setTree] = useState<WorkspaceTreeItem[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const permissions = usePermissions();

  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await getWorkspaceTree();
      if (result.length > 0) {
        setTree(result);
        setState("loaded");
      } else {
        setState("fallback");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load workspaces";
      setError(msg);
      setState("fallback");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const fallbackTree = useMemo<WorkspaceTreeItem[]>(() => {
    const workspaceMap = new Map<string, WorkspaceTreeItem>();
    for (const mod of ERP_MODULES) {
      let workspaceKey = "other";
      let workspaceLabel = "Modules";
      let wsIcon: string | null = null;

      if (["products", "product_categories", "units_of_measure"].includes(mod.moduleKey)) {
        workspaceKey = "product_master";
        workspaceLabel = "Product Master";
        wsIcon = "PackageSearch";
      } else if (mod.moduleKey === "company_profile") {
        workspaceKey = "administration";
        workspaceLabel = "Administration";
        wsIcon = "Building2";
      } else if (mod.moduleKey === "users_and_roles") {
        workspaceKey = "administration";
        workspaceLabel = "Administration";
        wsIcon = "Building2";
      }

      if (!workspaceMap.has(workspaceKey)) {
        workspaceMap.set(workspaceKey, {
          workspace: {
            id: workspaceKey,
            workspace_key: workspaceKey,
            label: workspaceLabel,
            description: null,
            icon: wsIcon,
            sort_order: workspaceKey === "product_master" ? 10 : workspaceKey === "administration" ? 80 : 50,
            is_active: true,
          },
          items: [],
        });
      }

      if (mod.moduleKey === "metadata_prototype" && !import.meta.env.DEV) continue;

      const entry = workspaceMap.get(workspaceKey)!;
      entry.items.push({
        id: mod.moduleKey,
        workspace_key: workspaceKey,
        item_key: mod.moduleKey,
        label: mod.label,
        item_type: mod.moduleKey === "metadata_prototype" ? "page" : "doctype",
        target: mod.route,
        icon: null,
        sort_order: entry.items.length,
        is_active: mod.status === "active",
        required_permission_key: mod.requiredPermissions.length > 0 ? mod.requiredPermissions[0] : null,
      });
    }
    return Array.from(workspaceMap.values());
  }, []);

  const displayTree = state === "loaded" ? tree : fallbackTree;

  const filterTree = (tree: WorkspaceTreeItem[], canFn: (key: string) => boolean): WorkspaceTreeItem[] => {
    return tree
      .map((ws) => ({
        ...ws,
        items: ws.items.filter(
          (item) => item.is_active && (!item.required_permission_key || canFn(item.required_permission_key))
        ),
      }))
      .filter((ws) => ws.items.length > 0 || ws.workspace.is_active);
  };

  const visibleTree = useMemo(() => {
    if (permissions.loading) return [];
    return filterTree(displayTree, (key) => permissions.can(key));
  }, [displayTree, permissions]);

  return {
    tree: visibleTree,
    allWorkspaces: displayTree,
    state,
    error,
    loading: state === "loading" || permissions.loading,
    refresh: load,
  };
}
