import type { WorkspaceItemMeta, WorkspaceTreeItem } from "../metadata/workspace-types";

export type BreadcrumbItem = {
  key: string;
  label: string;
  href?: string;
};

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getWorkspaceLabel(workspaceKey: string, tree: WorkspaceTreeItem[]) {
  return tree.find((group) => group.workspace.workspace_key === workspaceKey)?.workspace.label
    ?? titleCase(workspaceKey);
}

function getPrintLabel(item: WorkspaceItemMeta) {
  const [, doctypeKey] = item.item_key.split(":");
  return doctypeKey ? `${titleCase(doctypeKey)} Print Preview` : "Print Preview";
}

export function buildBreadcrumbs(selectedItem: WorkspaceItemMeta | null, tree: WorkspaceTreeItem[]) {
  const crumbs: BreadcrumbItem[] = [{ key: "home", label: "Home", href: "/" }];
  if (!selectedItem) return crumbs;

  const workspaceLabel = getWorkspaceLabel(selectedItem.workspace_key, tree);
  crumbs.push({
    key: `workspace:${selectedItem.workspace_key}`,
    label: workspaceLabel,
    href: `/${selectedItem.workspace_key}`,
  });

  let pageLabel = selectedItem.label;
  if (selectedItem.item_key.startsWith("print:")) {
    pageLabel = getPrintLabel(selectedItem);
  }

  if (pageLabel !== workspaceLabel) {
    crumbs.push({
      key: `item:${selectedItem.item_key}`,
      label: pageLabel,
    });
  }

  return crumbs;
}
