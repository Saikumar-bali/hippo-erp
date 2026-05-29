import { describe, expect, it } from "vitest";
import { groupPermissions } from "../../src/lib/permissions";
import { getModulePermissionSpec, hasAnyPermission } from "../../src/lib/permission-access";

describe("groupPermissions", () => {
  it("groups permissions by module_key in defined order", () => {
    const records = [
      { permission_key: "view_stock", module_key: "inventory", module_label: "Inventory", permission_label: "View Stock", description: null, sort_order: 10, is_active: true },
      { permission_key: "view_company", module_key: "company", module_label: "Company", permission_label: "View Company", description: null, sort_order: 10, is_active: true },
      { permission_key: "view_dashboard", module_key: "dashboard", module_label: "Dashboard", permission_label: "View Dashboard", description: null, sort_order: 10, is_active: true }
    ];
    const groups = groupPermissions(records);
    expect(groups).toHaveLength(3);
    expect(groups[0].module_key).toBe("company");
    expect(groups[1].module_key).toBe("inventory");
    expect(groups[2].module_key).toBe("dashboard");
  });

  it("sorts permissions within a group by sort_order then key", () => {
    const records = [
      { permission_key: "update_company", module_key: "company", module_label: "Company", permission_label: "Update Company", description: null, sort_order: 20, is_active: true },
      { permission_key: "view_company", module_key: "company", module_label: "Company", permission_label: "View Company", description: null, sort_order: 10, is_active: true }
    ];
    const groups = groupPermissions(records);
    expect(groups[0].permissions[0].permission_key).toBe("view_company");
    expect(groups[0].permissions[1].permission_key).toBe("update_company");
  });

  it("handles empty input", () => {
    expect(groupPermissions([])).toEqual([]);
  });

  it("handles unknown modules by placing them last", () => {
    const records = [
      { permission_key: "p1", module_key: "zzz_unknown", module_label: "Unknown", permission_label: "P1", description: null, sort_order: 10, is_active: true },
      { permission_key: "p2", module_key: "company", module_label: "Company", permission_label: "P2", description: null, sort_order: 10, is_active: true }
    ];
    const groups = groupPermissions(records);
    expect(groups[0].module_key).toBe("company");
    expect(groups[1].module_key).toBe("zzz_unknown");
  });
});

describe("getModulePermissionSpec", () => {
  it("returns spec for a known module", () => {
    const spec = getModulePermissionSpec("Company profile");
    expect(spec.requiredPermissions).toEqual(["view_company"]);
    expect(spec.updatePermissions).toEqual(["update_company"]);
  });

  it("returns spec for GRN module", () => {
    const spec = getModulePermissionSpec("GRN");
    expect(spec.requiredPermissions).toEqual(["view_grn"]);
    expect(spec.createPermissions).toEqual(["create_grn"]);
    expect(spec.deletePermissions).toEqual(["post_grn"]);
  });

  it("returns spec for Cycle counts with approve_cycle_count", () => {
    const spec = getModulePermissionSpec("Cycle counts");
    expect(spec.requiredPermissions).toEqual(["view_stock"]);
    expect(spec.updatePermissions).toEqual(["approve_cycle_count"]);
  });

  it("returns empty spec for unknown module", () => {
    const spec = getModulePermissionSpec("nonexistent");
    expect(spec.requiredPermissions).toEqual([]);
  });
});

describe("hasAnyPermission", () => {
  it("returns true when at least one permission matches", () => {
    const can = (p: string | readonly string[]) => {
      const list = Array.isArray(p) ? p : [p];
      return list.some((k) => k === "view_company");
    };
    expect(hasAnyPermission(can, ["view_company", "nonexistent"])).toBe(true);
  });

  it("returns false when none match", () => {
    const can = () => false;
    expect(hasAnyPermission(can, ["view_company"])).toBe(false);
  });

  it("returns false on empty list", () => {
    const can = () => true;
    expect(hasAnyPermission(can, [])).toBe(false);
  });
});
