import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { createProduct } = vi.hoisted(() => ({
  createProduct: vi.fn(async () => ({ id: "p1" }))
}));

vi.mock("../../src/lib/inventory-api", () => ({
  listProducts: async () => [],
  listStock: async () => [],
  listBatches: async () => [],
  listMovements: async () => [],
  listValuation: async () => [],
  createCategory: async () => ({}),
  createUom: async () => ({}),
  createWarehouse: async () => ({}),
  createProduct,
  createGrn: async () => ({})
}));

import { ModuleView } from "../../src/components/ModuleView";

describe("product form", () => {
  it("requires fields and submits valid payload", async () => {
    render(<ModuleView tenantId="t1" module="Products" />);
    fireEvent.change(screen.getByPlaceholderText("Category ID"), { target: { value: "c1" } });
    fireEvent.change(screen.getByPlaceholderText("UOM ID"), { target: { value: "u1" } });
    fireEvent.change(screen.getByPlaceholderText("SKU"), { target: { value: "SKU-1" } });
    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Item 1" } });
    fireEvent.change(screen.getByPlaceholderText("Reorder point"), { target: { value: "10" } });
    fireEvent.click(screen.getByText("Save"));
    expect(createProduct).toHaveBeenCalled();
  });
});
