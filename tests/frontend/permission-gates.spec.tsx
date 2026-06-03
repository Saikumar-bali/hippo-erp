import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockThemeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], error: null }));

vi.mock("../../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1", email: "locked@example.com" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signOut: async () => ({})
    },
    rpc: mockThemeRpc,
  }
}));

vi.mock("../../src/lib/inventory-api", () => ({
  getMyTenants: async () => [{ id: "c1", name: "Locked Company", slug: "locked-company" }]
}));

vi.mock("../../src/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: () => false,
    canAny: () => false,
    canAll: () => false,
    isCompanyAdmin: false,
    loading: false,
    error: "",
    currentUser: null,
    permissionKeys: [],
    membershipRole: "",
    companyRoleName: ""
  })
}));

vi.mock("../../src/lib/company-api", () => ({
  getCompanyProfile: async () => null,
  updateCompanyProfile: async () => ({})
}));

vi.mock("../../src/lib/users-api", () => ({
  getCompanyUsers: async () => []
}));

vi.mock("../../src/lib/roles-api", () => ({
  ensureCompanyDefaultRoles: async () => undefined,
  getPermissionCatalog: async () => [],
  listCompanyRoles: async () => [],
  getCompanyRolePermissions: async () => [],
  saveCompanyRole: async () => null,
  deleteCompanyRole: async () => undefined
}));

import { AuthProvider } from "../../src/context/AuthContext";
import App from "../../src/App";
import { PermissionGate } from "../../src/components/PermissionGate";
import { AccessDenied } from "../../src/components/AccessDenied";

describe("permission gates", () => {
  it("hides restricted modules and falls back to the home state", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Select a workspace item from the sidebar to get started/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Company profile" })).toBeNull();
  });

  it("renders children when allowed", () => {
    render(
      <MemoryRouter>
        <PermissionGate allowed={true} loading={false} title="Test Module" requiredPermissions={["view_test"]}>
          <p>Granted content</p>
        </PermissionGate>
      </MemoryRouter>
    );
    expect(screen.getByText("Granted content")).toBeTruthy();
  });

  it("renders AccessDenied when not allowed", () => {
    render(
      <MemoryRouter>
        <AccessDenied title="Test Module" requiredPermissions={["view_test"]} />
      </MemoryRouter>
    );
    expect(screen.getAllByText("Access denied").length).toBeGreaterThan(0);
    expect(screen.getByText("Test Module")).toBeTruthy();
    expect(screen.getByText("view_test")).toBeTruthy();
  });

  it("renders loading state", () => {
    render(
      <MemoryRouter>
        <PermissionGate allowed={false} loading={true} title="Test Module" requiredPermissions={["view_test"]}>
          <p>Granted content</p>
        </PermissionGate>
      </MemoryRouter>
    );
    expect(screen.getByText("Checking permissions...")).toBeTruthy();
  });
});

describe("AccessDenied", () => {
  it("shows required permission chips", () => {
    render(<MemoryRouter><AccessDenied title="Secret Module" requiredPermissions={["view_secret", "admin_secret"]} /></MemoryRouter>);
    expect(screen.getByText("Secret Module")).toBeTruthy();
    expect(screen.getByText("view_secret")).toBeTruthy();
    expect(screen.getByText("admin_secret")).toBeTruthy();
  });

  it("shows custom message when provided", () => {
    render(<MemoryRouter><AccessDenied title="X" requiredPermissions={[]} message="Custom denied message." /></MemoryRouter>);
    expect(screen.getByText("Custom denied message.")).toBeTruthy();
  });
});
