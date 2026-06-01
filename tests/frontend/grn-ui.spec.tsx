import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

afterEach(() => cleanup());

const mockListGrns = vi.hoisted(() => vi.fn());
const mockCreateGrnDraft = vi.hoisted(() => vi.fn());
const mockUpdateGrnDraft = vi.hoisted(() => vi.fn());
const mockGetGrn = vi.hoisted(() => vi.fn());
const mockPostGrn = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn());
const mockListProducts = vi.hoisted(() => vi.fn());
const mockListUoms = vi.hoisted(() => vi.fn());

vi.mock("../../src/lib/grn-api", () => ({
  listGrns: mockListGrns,
  createGrnDraft: mockCreateGrnDraft,
  updateGrnDraft: mockUpdateGrnDraft,
  getGrn: mockGetGrn,
  postGrn: mockPostGrn,
}));

vi.mock("../../src/lib/product-api", () => ({
  listProducts: mockListProducts,
  listUoms: mockListUoms,
}));

vi.mock("../../src/lib/supabase", () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

import { GrnListPage } from "../../src/components/grn/GrnListPage";

const draftGrn = {
  id: "grn-1",
  tenant_id: "t1",
  grn_number: "GRN-001",
  supplier_name: "Supplier A",
  received_date: "2026-06-01",
  status: "draft",
  qc_status: "pending",
  notes: null,
  created_by: "u1",
  posted_by: null,
  posted_at: null,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  line_count: 2,
};

const postedGrn = {
  ...draftGrn,
  id: "grn-2",
  grn_number: "GRN-002",
  supplier_name: "Supplier B",
  status: "posted",
  posted_by: "u1",
  posted_at: "2026-06-01T01:00:00Z",
  line_count: 1,
};

describe("GrnListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: { ok: true, data: [] }, error: null });
    mockListGrns.mockResolvedValue({ grns: [draftGrn, postedGrn], total: 2 });
    mockListProducts.mockResolvedValue([]);
    mockListUoms.mockResolvedValue([]);
    mockGetGrn.mockResolvedValue({
      grn: draftGrn,
      lines: [
        {
          id: "l1",
          grn_id: "grn-1",
          line_number: 1,
          product_id: "p1",
          uom_id: "u1",
          received_qty: 100,
          accepted_qty: 90,
          rejected_qty: 10,
          batch_number: "B001",
          expiry_date: null,
          bin_id: null,
          line_status: "pending",
        },
      ],
    });
    mockCreateGrnDraft.mockResolvedValue({ grn_id: "new-grn", grn_number: "GRN-NEW" });
    mockUpdateGrnDraft.mockResolvedValue({ grn_id: "grn-1" });
    mockPostGrn.mockResolvedValue({ grn_id: "grn-1", movements_created: 1 });
  });

  it("renders GRN list with draft and posted entries", async () => {
    render(<GrnListPage tenantId="t1" />);
    const heading = await screen.findByText("Goods Receipt Notes");
    expect(heading).toBeTruthy();
    const grnLinks = screen.getAllByRole("button", { name: /GRN-/ });
    expect(grnLinks.length).toBe(2);
    expect(screen.getByText("Supplier A")).toBeTruthy();
    expect(screen.getByText("Supplier B")).toBeTruthy();
  });

  it("shows create form when clicking + New GRN", async () => {
    render(<GrnListPage tenantId="t1" />);
    await screen.findByText("Goods Receipt Notes");
    fireEvent.click(screen.getByText("+ New GRN"));
    await screen.findByText("New GRN");
  });

  it("shows edit form when clicking Edit on a draft GRN", async () => {
    render(<GrnListPage tenantId="t1" />);
    await screen.findByText("Goods Receipt Notes");
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);
    await screen.findByDisplayValue("GRN-001");
  });

  it("shows detail view when clicking View on posted GRN", async () => {
    render(<GrnListPage tenantId="t1" />);
    await screen.findByText("Goods Receipt Notes");
    const viewButton = screen.getByRole("button", { name: "View" });
    fireEvent.click(viewButton);
    await screen.findByText("Back to List");
  });

  it("shows post confirmation dialog when clicking Post", async () => {
    render(<GrnListPage tenantId="t1" />);
    await screen.findByText("Goods Receipt Notes");
    const postButtons = screen.getAllByText("Post");
    fireEvent.click(postButtons[0]);
    await screen.findByRole("button", { name: "Confirm Post" });
  });

  it("calls postGrn after confirmation", async () => {
    render(<GrnListPage tenantId="t1" />);
    await screen.findByText("Goods Receipt Notes");
    const postButtons = screen.getAllByText("Post");
    fireEvent.click(postButtons[0]);
    await screen.findByRole("button", { name: "Confirm Post" });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Post" }));
    await waitFor(() => {
      expect(mockPostGrn).toHaveBeenCalledWith("grn-1");
    });
  });

  it("filters by status", async () => {
    render(<GrnListPage tenantId="t1" />);
    await screen.findByText("Goods Receipt Notes");
    const select = screen.getByDisplayValue("All Statuses");
    fireEvent.change(select, { target: { value: "draft" } });
    await waitFor(() => {
      expect(mockListGrns).toHaveBeenCalledWith("t1", { status: "draft", limit: 100 });
    });
  });

  it("requires at least one line item when creating draft", async () => {
    render(<GrnListPage tenantId="t1" />);
    await screen.findByText("Goods Receipt Notes");
    fireEvent.click(screen.getByText("+ New GRN"));
    await screen.findByText("New GRN");
    fireEvent.change(screen.getByPlaceholderText("e.g. GRN-2026-0001"), { target: { value: "GRN-NEW-1" } });
    fireEvent.change(screen.getByPlaceholderText("Supplier name"), { target: { value: "New Supplier" } });
    fireEvent.click(screen.getByText("Save Draft"));
    await screen.findByText("At least one line item is required.");
    expect(mockCreateGrnDraft).not.toHaveBeenCalled();
  });
});
