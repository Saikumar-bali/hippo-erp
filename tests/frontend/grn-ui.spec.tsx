import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockListGrns = vi.fn();
const mockCreateGrnDraft = vi.fn();
const mockUpdateGrnDraft = vi.fn();
const mockGetGrn = vi.fn();
const mockPostGrn = vi.fn();

vi.mock("../../src/lib/grn-api", () => ({
  listGrns: mockListGrns,
  createGrnDraft: mockCreateGrnDraft,
  updateGrnDraft: mockUpdateGrnDraft,
  getGrn: mockGetGrn,
  postGrn: mockPostGrn,
}));

const mockListProducts = vi.fn();
const mockListUoms = vi.fn();

vi.mock("../../src/lib/product-api", () => ({
  listProducts: mockListProducts,
  listUoms: mockListUoms,
}));

vi.mock("../../src/lib/supabase", () => ({
  supabase: {
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            throwOnError: () => Promise.resolve({ data: [] }),
          }),
        }),
      }),
    }),
  },
}));

import { GrnListPage } from "../../src/components/grn/GrnListPage";

const draftGrn = {
  id: "grn-1",
  grn_number: "GRN-001",
  supplier_name: "Test Supplier",
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
  status: "posted",
  posted_by: "u1",
  posted_at: "2026-06-01T01:00:00Z",
  line_count: 1,
};

describe("GrnListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("renders GRN list with both draft and posted entries", async () => {
    render(<GrnListPage tenantId="t1" />);
    await waitFor(() => {
      expect(screen.getByText("GRN-001")).toBeTruthy();
    });
    expect(screen.getByText("GRN-002")).toBeTruthy();
    expect(screen.getByText("Test Supplier")).toBeTruthy();
  });

  it("shows create form when clicking + New GRN", async () => {
    render(<GrnListPage tenantId="t1" />);
    await waitFor(() => expect(screen.getByText("GRN-001")).toBeTruthy());
    fireEvent.click(screen.getByText("+ New GRN"));
    await waitFor(() => {
      expect(screen.getByText("New GRN")).toBeTruthy();
    });
  });

  it("shows edit form when clicking Edit on a draft GRN", async () => {
    render(<GrnListPage tenantId="t1" />);
    await waitFor(() => expect(screen.getByText("GRN-001")).toBeTruthy());
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);
    await waitFor(() => {
      expect(screen.getByDisplayValue("GRN-001")).toBeTruthy();
    });
  });

  it("calls postGrn when clicking Post", async () => {
    render(<GrnListPage tenantId="t1" />);
    await waitFor(() => expect(screen.getByText("GRN-001")).toBeTruthy());
    const postButtons = screen.getAllByText("Post");
    fireEvent.click(postButtons[0]);
    await waitFor(() => {
      expect(mockPostGrn).toHaveBeenCalledWith("grn-1");
    });
  });

  it("shows read-only detail when clicking View on posted GRN", async () => {
    render(<GrnListPage tenantId="t1" />);
    await waitFor(() => expect(screen.getByText("GRN-001")).toBeTruthy());
    const viewButtons = screen.getAllByText("View");
    fireEvent.click(viewButtons[0]);
    await waitFor(() => {
      expect(screen.getByText("Back to List")).toBeTruthy();
    });
  });

  it("filters by status", async () => {
    render(<GrnListPage tenantId="t1" />);
    await waitFor(() => expect(screen.getByText("GRN-001")).toBeTruthy());
    const select = screen.getByDisplayValue("All Statuses");
    fireEvent.change(select, { target: { value: "draft" } });
    await waitFor(() => {
      expect(mockListGrns).toHaveBeenCalledWith("t1", { status: "draft", limit: 100 });
    });
  });

  it("creates a draft via the form", async () => {
    render(<GrnListPage tenantId="t1" />);
    await waitFor(() => expect(screen.getByText("GRN-001")).toBeTruthy());
    fireEvent.click(screen.getByText("+ New GRN"));
    await waitFor(() => expect(screen.getByText("New GRN")).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText("e.g. GRN-2026-0001"), { target: { value: "GRN-NEW-1" } });
    fireEvent.change(screen.getByPlaceholderText("Supplier name"), { target: { value: "New Supplier" } });
    fireEvent.click(screen.getByText("Save Draft"));
    await waitFor(() => {
      expect(mockCreateGrnDraft).toHaveBeenCalled();
    });
  });
});
