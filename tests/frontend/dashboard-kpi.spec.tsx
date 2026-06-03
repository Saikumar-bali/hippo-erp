import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../src/lib/inventory-api", () => ({
  listProducts: async () => [],
  listStock: async () => [{ quantity: 12, reserved_quantity: 3 }],
  listBatches: async () => [{ expiry_date: "2026-06-01" }],
  listMovements: async () => [{ movement_type: "GRN" }],
  listValuation: async () => [{ total_value: 5060 }],
  createCategory: async () => ({}),
  createUom: async () => ({}),
  createWarehouse: async () => ({}),
  createProduct: async () => ({}),
  createGrn: async () => ({})
}));

import { ModuleView } from "../../src/components/ModuleView";

describe("dashboard data modules", () => {
  it("renders the planned-module placeholder for inventory valuation", async () => {
    render(<ModuleView tenantId="t1" module="Inventory valuation" />);
    expect(await screen.findByText(/planned for a later phase/i)).toBeTruthy();
  });
});
