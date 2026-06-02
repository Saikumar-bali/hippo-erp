import { useCallback, useEffect, useMemo, useState } from "react";
import { getWorkspaceTree } from "../lib/metadata/workspace-api";
import { ERP_MODULES } from "../lib/erp-modules";
import type { WorkspaceItemMeta, WorkspaceTreeItem } from "../lib/metadata/workspace-types";
import { usePermissions } from "./usePermissions";

type LoadState = "loading" | "loaded" | "fallback" | "error";

const METADATA_STUDIO_SHORTCUTS: WorkspaceItemMeta[] = [
  {
    id: "metadata-shortcut-builder-home",
    workspace_key: "metadata_studio",
    item_key: "metadata_studio",
    label: "Builder Home",
    item_type: "page",
    target: "metadata_studio",
    icon: "LayoutDashboard",
    sort_order: 0,
    is_active: true,
    required_permission_key: "manage_metadata",
  },
  {
    id: "metadata-shortcut-doctype-builder",
    workspace_key: "metadata_studio",
    item_key: "metadata_studio_doctype_builder",
    label: "DocType Builder",
    item_type: "page",
    target: "metadata_studio_doctype_builder",
    icon: "FileJson",
    sort_order: 1,
    is_active: true,
    required_permission_key: "manage_metadata",
  },
  {
    id: "metadata-shortcut-field-builder",
    workspace_key: "metadata_studio",
    item_key: "metadata_studio_field_builder",
    label: "Field Builder",
    item_type: "page",
    target: "metadata_studio_field_builder",
    icon: "Columns3",
    sort_order: 2,
    is_active: true,
    required_permission_key: "manage_metadata",
  },
  {
    id: "metadata-shortcut-list-view-builder",
    workspace_key: "metadata_studio",
    item_key: "metadata_studio_list_view_builder",
    label: "List View Builder",
    item_type: "page",
    target: "metadata_studio_list_view_builder",
    icon: "ListTree",
    sort_order: 3,
    is_active: true,
    required_permission_key: "manage_metadata",
  },
  {
    id: "metadata-shortcut-form-layout-builder",
    workspace_key: "metadata_studio",
    item_key: "metadata_studio_form_layout_builder",
    label: "Form Layout Builder",
    item_type: "page",
    target: "metadata_studio_form_layout_builder",
    icon: "PanelTop",
    sort_order: 4,
    is_active: true,
    required_permission_key: "manage_metadata",
  },
  {
    id: "metadata-shortcut-menu-builder",
    workspace_key: "metadata_studio",
    item_key: "metadata_studio_workspace_menu_builder",
    label: "Menu Builder",
    item_type: "page",
    target: "metadata_studio_workspace_menu_builder",
    icon: "MenuSquare",
    sort_order: 5,
    is_active: true,
    required_permission_key: "manage_metadata",
  },
  {
    id: "metadata-shortcut-access-builder",
    workspace_key: "metadata_studio",
    item_key: "metadata_studio_access_builder",
    label: "Access Builder",
    item_type: "page",
    target: "metadata_studio_access_builder",
    icon: "ShieldCheck",
    sort_order: 6,
    is_active: true,
    required_permission_key: "manage_metadata",
  },
  {
    id: "metadata-shortcut-doc-check",
    workspace_key: "metadata_studio",
    item_key: "metadata_studio_doc_check",
    label: "Check / Repair DocType",
    item_type: "page",
    target: "metadata_studio_doc_check",
    icon: "Activity",
    sort_order: 7,
    is_active: true,
    required_permission_key: "manage_metadata",
  },
];

function ensureMetadataStudioShortcuts(tree: WorkspaceTreeItem[]): WorkspaceTreeItem[] {
  const copy = tree.map((ws) => ({
    ...ws,
    items: [...ws.items],
  }));

  let metadataWorkspace = copy.find((ws) => ws.workspace.workspace_key === "metadata_studio");
  if (!metadataWorkspace) {
    metadataWorkspace = {
      workspace: {
        id: "metadata_studio",
        workspace_key: "metadata_studio",
        label: "Metadata Studio",
        description: "Build and repair metadata-driven app screens",
        icon: "DatabaseZap",
        sort_order: 5,
        is_active: true,
      },
      items: [],
    };
    copy.unshift(metadataWorkspace);
  }

  const existingKeys = new Set(metadataWorkspace.items.map((item) => item.item_key));
  const existingTargets = new Set(metadataWorkspace.items.map((item) => item.target));

  for (const shortcut of METADATA_STUDIO_SHORTCUTS) {
    if (!existingKeys.has(shortcut.item_key) && !existingTargets.has(shortcut.target)) {
      metadataWorkspace.items.push(shortcut);
    }
  }

  metadataWorkspace.items.sort((a, b) => {
    const order = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (order !== 0) return order;
    return a.label.localeCompare(b.label);
  });

  return copy;
}

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
        setTree(ensureMetadataStudioShortcuts(result));
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
      } else if (mod.moduleKey.startsWith("crm")) {
        workspaceKey = "crm";
        workspaceLabel = "CRM";
        wsIcon = "UsersRound";
      }

      if (!workspaceMap.has(workspaceKey)) {
        workspaceMap.set(workspaceKey, {
          workspace: {
            id: workspaceKey,
            workspace_key: workspaceKey,
            label: workspaceLabel,
            description: null,
            icon: wsIcon,
            sort_order: workspaceKey === "product_master" ? 10 : workspaceKey === "crm" ? 35 : workspaceKey === "administration" ? 80 : 50,
            is_active: true,
          },
          items: [],
        });
      }

      if (mod.moduleKey === "metadata_prototype" && !import.meta.env.DEV) continue;

      // Add CRM Dashboard to fallback if this is a CRM item and it's not already added
      if (workspaceKey === "crm" && !workspaceMap.get("crm")?.items.some(i => i.item_key === "crm_dashboard")) {
        const crmWs = workspaceMap.get("crm")!;
        crmWs.items.push({
          id: "crm-dashboard-fallback",
          workspace_key: "crm",
          item_key: "crm_dashboard",
          label: "Dashboard",
          item_type: "page",
          target: "crm_dashboard",
          icon: "LayoutDashboard",
          sort_order: 5,
          is_active: true,
          required_permission_key: null,
        });
      }

      const entry = workspaceMap.get(workspaceKey)!;
      entry.items.push({
        id: mod.moduleKey,
        workspace_key: workspaceKey,
        item_key: mod.moduleKey,
        label: mod.label,
        item_type: mod.moduleKey === "metadata_prototype" ? "page" : "doctype",
        target: mod.route,
        icon: null,
        sort_order: 
          mod.moduleKey === "crm_lead" ? 10 :
          mod.moduleKey === "crm_account" ? 20 :
          mod.moduleKey === "crm_contact" ? 30 :
          mod.moduleKey === "crm_opportunity" ? 40 :
          mod.moduleKey === "crm_followup_task" ? 50 : 
          entry.items.length * 10 + 100,
        is_active: mod.status === "active",
        required_permission_key: mod.requiredPermissions.length > 0 ? mod.requiredPermissions[0] : null,
      });
    }
    
    // Sort items in each workspace group by sort_order
    for (const ws of workspaceMap.values()) {
      ws.items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }

    return ensureMetadataStudioShortcuts(Array.from(workspaceMap.values()));
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
