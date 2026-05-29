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
    { id: "r1", tenant_id: "t1", role_key: "admin", role_name: "Admin", description: "Admin role", is_system: true, is_active: true, sort_order: 20, permission_count: 3, assignment_count: 1 },
    { id: "r2", tenant_id: "t1", role_key: "viewer", role_name: "Viewer", description: "Viewer role", is_system: true, is_active: true, sort_order: 50, permission_count: 1, assignment_count: 0 }
  ])),
  getCompanyRolePermissions: vi.fn(async () => ([
    { permission_key: "view_company", is_granted: true },
    { permission_key: "update_company", is_granted: true }
  ])),
  getCompanyUsers: vi.fn(async () => ([
    {
      user_id: "u1",
      full_name: "ERP Test User",
      email: "erp-test@example.com",
      membership_role: "admin",
      is_active: true,
      assigned_role_id: "r1",
      assigned_role_key: "admin",
      assigned_role_name: "Admin",
      assigned_role_is_system: true,
      effective_permission_keys: ["view_company", "update_company"],
      effective_permission_count: 2,
      active_assignment_count: 1
    },
    {
      user_id: "u2",
      full_name: "No Role User",
      email: "norole@example.com",
      membership_role: "viewer",
      is_active: true,
      assigned_role_id: null,
      assigned_role_key: null,
      assigned_role_name: null,
      assigned_role_is_system: null,
      effective_permission_keys: [],
      effective_permission_count: 0,
      active_assignment_count: 0
    }
  ])),
  setCompanyUserRole: vi.fn(async () => ({
    user_id: "u2",
    full_name: "No Role User",
    email: "norole@example.com",
    membership_role: "viewer",
    is_active: true,
    assigned_role_id: "r2",
    assigned_role_key: "viewer",
    assigned_role_name: "Viewer",
    assigned_role_is_system: true,
    effective_permission_keys: ["view_company"],
    effective_permission_count: 1,
    active_assignment_count: 1
  }))
}));

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => ({
    selectedTenantId: "t1",
    tenants: [{ id: "t1", name: "HIPPOCLOUDS.COM", slug: "hippoclouds-com", role: "admin" }]
  })
}));

vi.mock("../../src/lib/roles-api", () => ({
  ensureCompanyDefaultRoles: mocks.ensureCompanyDefaultRoles,
  getPermissionCatalog: mocks.getPermissionCatalog,
  listCompanyRoles: mocks.listCompanyRoles,
  getCompanyRolePermissions: mocks.getCompanyRolePermissions,
  saveCompanyRole: vi.fn(),
  deleteCompanyRole: vi.fn()
}));

vi.mock("../../src/lib/users-api", () => ({
  getCompanyUsers: mocks.getCompanyUsers,
  setCompanyUserRole: mocks.setCompanyUserRole
}));

import { UsersRolesView } from "../../src/components/UsersRolesView";

describe("users and roles", () => {
  afterEach(() => {
    cleanup();
  });

  it("loads company users and assigns a company role", async () => {
    render(<UsersRolesView />);

    await waitFor(() => expect(mocks.ensureCompanyDefaultRoles).toHaveBeenCalledWith("t1"));
    fireEvent.click(screen.getByRole("tab", { name: /users/i }));

    await waitFor(() => expect(screen.getByText("Company users")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /norole@example\.com/i }));
    fireEvent.change(screen.getByLabelText(/Company role/i), { target: { value: "r2" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Assignment/i }));

    await waitFor(() =>
      expect(mocks.setCompanyUserRole).toHaveBeenCalledWith({
        companyId: "t1",
        userId: "u2",
        roleId: "r2"
      })
    );
  });

  it("shows no-role and permissions states", async () => {
    render(<UsersRolesView />);

    fireEvent.click(screen.getByRole("tab", { name: /users/i }));
    const noRoleUser = await screen.findByRole("button", { name: /norole@example\.com/i });
    fireEvent.click(noRoleUser);
    await waitFor(() => expect(screen.getByText("No company role assigned")).toBeTruthy());
    expect(screen.getByText("No effective permissions yet. Assign a company role to grant access.")).toBeTruthy();
  });
});
