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

import { AuthProvider } from "../../src/context/AuthContext";
import App from "../../src/App";

describe("dashboard", () => {
  it("renders KPI module", () => {
    render(<MemoryRouter><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(screen.getAllByText(/Dashboard KPIs/i).length).toBeGreaterThan(0);
  });
});
