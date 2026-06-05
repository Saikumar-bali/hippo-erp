import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MetadataDataTable } from "../../src/components/metadata-studio/MetadataDataTable";
import { WorkspaceItemsManager } from "../../src/components/metadata-studio/WorkspaceItemsManager";
import { MetadataStudioHome } from "../../src/components/metadata-studio/MetadataStudioHome";
import { DocTypeBuilder } from "../../src/components/metadata-studio/DocTypeBuilder";
import { DocFieldBuilder } from "../../src/components/metadata-studio/DocFieldBuilder";
import { updateRecord } from "../../src/lib/metadata/metadata-studio-api";

afterEach(() => {
  cleanup();
});

// Mock the API calls
vi.mock("../../src/lib/metadata/metadata-studio-api", () => ({
  TABLES: {
    test: {
      fields: [
        { name: "id", label: "ID", type: "string" },
        { name: "name", label: "Name", type: "string" },
        { name: "config", label: "Config", type: "json" },
      ]
    },
    workspace_items: {
       fields: [
         { name: "workspace_key", label: "Workspace", type: "string" },
         { name: "item_key", label: "Key", type: "string" },
         { name: "label", label: "Label", type: "string" },
         { name: "item_type", label: "Type", type: "string" },
         { name: "is_active", label: "Active", type: "boolean" },
         { name: "target", label: "Target", type: "string" },
         { name: "required_permission_key", label: "Permission", type: "string" },
       ]
    }
  },
  listAllWorkspaceItems: vi.fn(async () => [
    { id: "1", workspace_key: "ws1", item_key: "ik1", label: "L1", item_type: "doctype", is_active: true, target: "t1" },
    { id: "2", workspace_key: "ws1", item_key: "ik2", label: "L2", item_type: "page", is_active: false, target: "t2" },
  ]),
  loadWorkspaceKeys: vi.fn(async () => [{ value: "ws1", label: "WS 1" }]),
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
  listAllDoctypes: vi.fn(async () => [
    { id: "dt-1", doctype_key: "purchase_invoice", label: "Purchase Invoice", module_key: "purchasing", schema_name: "app", storage_strategy: "generic_json", is_company_scoped: true },
  ]),
  getDocTypeRecord: vi.fn(async (doctypeKey: string) => ({
    id: "dt-1",
    doctype_key: doctypeKey,
    label: "Purchase Invoice",
    module_key: "purchasing",
    schema_name: "app",
    storage_strategy: "generic_json",
    is_company_scoped: true,
    description: "Demo doctype",
  })),
  loadModuleKeys: vi.fn(async () => [{ value: "purchasing", label: "purchasing (Purchasing)" }]),
  loadDocTypeKeys: vi.fn(async () => [{ value: "purchase_invoice", label: "purchase_invoice (Purchase Invoice)" }]),
  checkDuplicateDoctypeKey: vi.fn(async () => false),
  listDocFieldsForDoctype: vi.fn(async () => [
    { id: "f1", doctype_key: "purchase_invoice", fieldname: "invoice_number", label: "Invoice Number", fieldtype: "Data", is_required: true, in_list_view: true, in_standard_filter: true, is_hidden: false, sort_order: 1, options: null },
  ]),
  METADATA_STUDIO_SCHEMA_OPTIONS: ["app", "wh"],
  METADATA_STUDIO_STORAGE_OPTIONS: ["generic_json", "physical_rpc"],
  METADATA_STUDIO_FIELD_TYPES: ["Data", "Text", "Int", "Float", "Check", "Select", "Link", "Date", "Datetime"],
}));

// Mock lucide-react to avoid icon rendering issues in tests
vi.mock("lucide-react", () => ({
  Search: () => <div data-testid="search-icon" />,
  PlusCircle: () => <div data-testid="plus-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  FileJson: () => <div />,
  Columns3: () => <div />,
  LayoutDashboard: () => <div />,
  ListTree: () => <div />,
  Table: () => <div />,
  LayoutTemplate: () => <div />,
  ShieldCheck: () => <div />,
  Hash: () => <div />,
  GitBranch: () => <div />,
  Zap: () => <div />,
  Blocks: () => <div />,
  ListChecks: () => <div />,
  WandSparkles: () => <div />,
  Printer: () => <div />,
}));

describe("Metadata Studio UX Polish", () => {
  it("MetadataDataTable shows search and row count", async () => {
    const fetcher = async () => [{ id: "1", name: "Test", config: { a: 1 } }];
    render(<MetadataDataTable label="Test Table" tableKey="test" fetcher={fetcher} />);
    
    expect(await screen.findByText(/1 of 1 record/)).toBeTruthy();
    expect(screen.getByPlaceholderText("Search...")).toBeTruthy();
    expect(screen.getByText(/\d+ keys?/)).toBeTruthy(); // JSON preview: {N keys}
  });

  it("WorkspaceItemsManager shows grouped view", async () => {
    render(<WorkspaceItemsManager />);
    expect(await screen.findByText(/ws1/i)).toBeTruthy();
    expect(screen.getByText(/2 items/)).toBeTruthy(); // count in header
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText("Inactive")).toBeTruthy();
  });

  it("MetadataStudioHome is builder-first", () => {
    render(<MetadataStudioHome onNavigate={() => {}} />);
    expect(screen.getByText("DocType Builder")).toBeTruthy();
    expect(screen.getByText("Field Builder")).toBeTruthy();
    expect(screen.getByText("Advanced Metadata Tables")).toBeTruthy();
  });

  it("DocTypeBuilder uses dropdown-driven metadata inputs", async () => {
    render(<DocTypeBuilder />);
    expect(await screen.findByRole("heading", { name: "DocType Builder" })).toBeTruthy();
    expect(screen.getByText("Schema")).toBeTruthy();
    expect(screen.getByText("Storage")).toBeTruthy();
    expect(screen.getByText(/app\.erp_documents/)).toBeTruthy();
  });

  it("DocFieldBuilder uses field type dropdowns", async () => {
    render(<DocFieldBuilder />);
    expect(await screen.findByRole("heading", { name: "Field Builder" })).toBeTruthy();
    fireEvent.click(screen.getByText("Add Field"));
    expect((await screen.findAllByText("Field Type")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Supported types:/)).toBeTruthy();
  });

  it("DocFieldBuilder keeps focus while typing into a newly added field", async () => {
    render(<DocFieldBuilder />);
    await screen.findByRole("heading", { name: "Field Builder" });
    fireEvent.click(screen.getByRole("button", { name: "Add Field" }));

    const labelInputs = screen.getAllByLabelText("Label");
    const fieldnameInputs = screen.getAllByLabelText("Fieldname");
    const labelInput = labelInputs[labelInputs.length - 1] as HTMLInputElement;
    const fieldnameInput = fieldnameInputs[fieldnameInputs.length - 1] as HTMLInputElement;

    labelInput.focus();
    fireEvent.change(labelInput, { target: { value: "S" } });
    expect(document.activeElement).toBe(labelInput);
    fireEvent.change(labelInput, { target: { value: "Store Name" } });

    expect(document.activeElement).toBe(labelInput);
    expect(labelInput.value).toBe("Store Name");
    expect(fieldnameInput.value).toBe("store_name");
  });

  it("DocFieldBuilder keeps generating fieldname until it is manually customized", async () => {
    render(<DocFieldBuilder />);
    await screen.findByRole("heading", { name: "Field Builder" });

    const labelInput = await screen.findByLabelText("Label");
    const fieldnameInput = await screen.findByLabelText("Fieldname");

    fireEvent.change(labelInput, { target: { value: "Store Name" } });
    expect((fieldnameInput as HTMLInputElement).value).toBe("store_name");

    fireEvent.change(fieldnameInput, { target: { value: "custom_store_key" } });
    fireEvent.change(labelInput, { target: { value: "Retail Store Name" } });
    expect((fieldnameInput as HTMLInputElement).value).toBe("custom_store_key");
  });

  it("DocFieldBuilder saves valid options without clearing unmanaged field metadata", async () => {
    const updateRecordMock = vi.mocked(updateRecord);
    updateRecordMock.mockClear();

    render(<DocFieldBuilder />);
    await screen.findByRole("heading", { name: "Field Builder" });
    fireEvent.click(screen.getByRole("button", { name: "Save Fields" }));

    await waitFor(() => expect(updateRecordMock).toHaveBeenCalledTimes(1));
    const payload = updateRecordMock.mock.calls[0][2];
    expect(payload).toEqual(expect.objectContaining({ options: {} }));
    expect(payload).not.toHaveProperty("validation_rules");
    expect(payload).not.toHaveProperty("depends_on");
    expect(payload).not.toHaveProperty("db_column");
    expect(payload).not.toHaveProperty("default_value");
    expect(payload).not.toHaveProperty("is_unique");
    expect(payload).not.toHaveProperty("is_readonly");
  });
});
