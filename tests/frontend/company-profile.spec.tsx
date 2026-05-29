import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  refreshTenants: vi.fn(async () => undefined),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  getCompanyProfile: vi.fn(async () => ({
    id: "c1",
    name: "Acme Company",
    slug: "acme",
    gst_number: "29ABCDE1234F2Z5",
    email: "ops@acme.com",
    phone: "+919999999999",
    address: "Bengaluru",
    logo_url: "https://example.com/logo.png",
    industry_type: "Manufacturing",
    currency_code: "INR",
    financial_year_start: "2026-04-01"
  })),
  updateCompanyProfile: vi.fn(async () => ({}))
}));

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => ({
    selectedTenantId: "c1",
    tenants: [{ id: "c1", name: "Acme Company", slug: "acme" }],
    refreshTenants: mocks.refreshTenants
  })
}));

vi.mock("../../src/lib/company-api", () => ({
  getCompanyProfile: mocks.getCompanyProfile,
  updateCompanyProfile: mocks.updateCompanyProfile
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess
  }
}));

import { CompanyProfileView } from "../../src/components/CompanyProfileView";

describe("company profile", () => {
  afterEach(() => {
    cleanup();
  });

  it("loads existing company profile and saves updates", async () => {
    render(<CompanyProfileView />);
    await waitFor(() => expect(mocks.getCompanyProfile).toHaveBeenCalledWith("c1"));
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    expect(screen.getByDisplayValue("Acme Company")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Company name"), { target: { value: "Acme Foods" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(mocks.updateCompanyProfile).toHaveBeenCalled());
    expect(mocks.refreshTenants).toHaveBeenCalled();
  });

  it("shows validation message for invalid phone", async () => {
    render(<CompanyProfileView />);
    await waitFor(() => expect(mocks.getCompanyProfile).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    fireEvent.change(screen.getByPlaceholderText("Phone"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Phone format is invalid."));
  });
});
