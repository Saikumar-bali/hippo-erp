import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { email: "test@example.com" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signOut: async () => ({})
    }
  }
}));
vi.mock("../../src/lib/inventory-api", () => ({
  getMyTenants: async () => [{ id: "t1", name: "Demo Tenant", slug: "demo-tenant" }]
}));
vi.mock("../../src/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    isCompanyAdmin: true,
    loading: false,
    error: "",
    currentUser: null,
    permissionKeys: [],
    membershipRole: "admin",
    companyRoleName: "Admin"
  })
}));
vi.mock("../../src/lib/company-api", () => ({
  getCompanyProfile: async () => ({
    id: "t1",
    name: "Demo Company",
    slug: "demo-company",
    gst_number: null,
    email: "ops@demo.com",
    phone: "+919999999999",
    address: "Demo Address",
    logo_url: null,
    industry_type: "Retail",
    currency_code: "INR",
    financial_year_start: "2026-04-01"
  })
}));

import { AuthProvider } from "../../src/context/AuthContext";
import App from "../../src/App";

describe("dashboard", () => {
  it("renders KPI module", () => {
    render(<MemoryRouter><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(screen.getAllByText(/Company profile/i).length).toBeGreaterThan(0);
  });

  it("keeps the sidebar visible when permissions are available", () => {
    render(<MemoryRouter><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(screen.getAllByText("Hippo ERP").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Users and roles" }).length).toBeGreaterThan(0);
  });
});
