import { describe, expect, it } from "vitest";
import { buildAccessErrorMessage, inferPermissionKeyFromError } from "../../src/lib/access-control";
import { buildBreadcrumbs } from "../../src/lib/navigation/breadcrumbs";
import type { WorkspaceItemMeta, WorkspaceTreeItem } from "../../src/lib/metadata/workspace-types";

describe("access-control helpers", () => {
  it("builds an actionable access message", () => {
    expect(buildAccessErrorMessage("view_crm_lead")).toContain("Access required: view_crm_lead");
    expect(buildAccessErrorMessage("view_crm_lead")).toContain("Access Control Manager");
  });

  it("infers the permission key from a raw backend error", () => {
    expect(inferPermissionKeyFromError("permission denied. permission: update_crm_lead", "view_crm_lead")).toBe("update_crm_lead");
    expect(inferPermissionKeyFromError("permission denied", "view_crm_lead")).toBe("view_crm_lead");
  });
});

describe("breadcrumbs", () => {
  const tree: WorkspaceTreeItem[] = [{
    workspace: {
      id: "w1",
      workspace_key: "crm",
      label: "CRM",
      description: null,
      icon: null,
      sort_order: 10,
      is_active: true,
    },
    items: [],
  }];

  const item: WorkspaceItemMeta = {
    id: "i1",
    workspace_key: "crm",
    item_key: "crm_lead",
    label: "CRM Lead",
    item_type: "doctype",
    target: "crm_lead",
    icon: null,
    sort_order: 10,
    is_active: true,
    required_permission_key: "view_crm_lead",
  };

  it("builds home workspace page breadcrumbs", () => {
    const crumbs = buildBreadcrumbs(item, tree);
    expect(crumbs.map((crumb) => crumb.label)).toEqual(["Home", "CRM", "CRM Lead"]);
  });
});
