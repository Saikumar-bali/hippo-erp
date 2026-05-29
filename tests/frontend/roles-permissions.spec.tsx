import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  ensureCompanyDefaultRoles: vi.fn(async () => undefined),
  getPermissionCatalog: vi.fn(async () => ([
    { permission_key: "view_company", module_key: "company", module_label: "Company", permission_label: "View Company", description: null, sort_order: 10, is_active: true },
    { permission_key: "update_company", module_key: "company", module_label: "Company", permission_label: "Update Company", description: null, sort_order: 20, is_active: true },
    { permission_key: "view_users", module_key: "users", module_label: "Users", permission_label: "View Users", description: null, sort_order: 10, is_active: true }
  ])),
  listCompanyRoles: vi.fn(async () => ([
    { id: "r1", tenant_id: "t1", role_key: "admin", role_name: "Admin", description: "Admin role", is_system: true, is_active: true, sort_order: 20, permission_count: 3, assignment_count: 1 }
  ])),
  getCompanyRolePermissions: vi.fn(async () => ([
    { permission_key: "view_company", is_granted: true },
    { permission_key: "update_company", is_granted: true }
  ])),
  saveCompanyRole: vi.fn(async () => ({
    id: "r2",
    tenant_id: "t1",
    role_key: "ops_lead",
    role_name: "Ops Lead",
    description: "",
    is_system: false,
    is_active: true,
    sort_order: 30,
    permission_count: 0,
    assignment_count: 0
  })),
  deleteCompanyRole: vi.fn(async () => undefined)
}));

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => ({
    selectedTenantId: "t1",
    tenants: [{ id: "t1", name: "Demo Company", slug: "demo-company" }]
  })
}));

vi.mock("../../src/lib/roles-api", () => ({
  ensureCompanyDefaultRoles: mocks.ensureCompanyDefaultRoles,
  getPermissionCatalog: mocks.getPermissionCatalog,
  listCompanyRoles: mocks.listCompanyRoles,
  getCompanyRolePermissions: mocks.getCompanyRolePermissions,
  saveCompanyRole: mocks.saveCompanyRole,
  deleteCompanyRole: mocks.deleteCompanyRole
}));

import { RolesPermissionsView } from "../../src/components/RolesPermissionsView";

describe("roles permissions", () => {
  afterEach(() => {
    cleanup();
  });

  it("loads roles and opens a create form", async () => {
    render(<RolesPermissionsView />);
    await waitFor(() => expect(mocks.ensureCompanyDefaultRoles).toHaveBeenCalledWith("t1"));
    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "New Role" }));
    fireEvent.change(screen.getByPlaceholderText("Role name"), { target: { value: "Ops Lead" } });
    fireEvent.change(screen.getByPlaceholderText("role_key"), { target: { value: "ops_lead" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Role" }));
    await waitFor(() => expect(mocks.saveCompanyRole).toHaveBeenCalled());
  });

  it("shows permission matrix with grouped permissions", async () => {
    render(<RolesPermissionsView />);
    await waitFor(() => expect(screen.getByText("Company")).toBeTruthy());
    expect(screen.getByText("View Company")).toBeTruthy();
    expect(screen.getByText("Update Company")).toBeTruthy();
    expect(screen.getByText("Users")).toBeTruthy();
    expect(screen.getByText("View Users")).toBeTruthy();
  });

  it("shows empty state when no roles exist", async () => {
    mocks.listCompanyRoles.mockResolvedValueOnce([]);
    render(<RolesPermissionsView />);
    await waitFor(() => expect(screen.getByText("Role details")).toBeTruthy());
    expect(screen.getByText("0 roles")).toBeTruthy();
  });

  it("shows loading state initially", () => {
    mocks.listCompanyRoles.mockImplementationOnce(() => new Promise(() => {}));
    render(<RolesPermissionsView />);
    expect(screen.getByText("Loading roles and permissions...")).toBeTruthy();
  });
});
