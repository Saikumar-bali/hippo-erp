import { render, screen } from "@testing-library/react";
import { MetadataDataTable } from "../../src/components/metadata-studio/MetadataDataTable";
import { WorkspaceItemsManager } from "../../src/components/metadata-studio/WorkspaceItemsManager";
import { MetadataStudioHome } from "../../src/components/metadata-studio/MetadataStudioHome";
import { vi, describe, it, expect } from "vitest";

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

  it("MetadataStudioHome shows primary action and helper text", () => {
    render(<MetadataStudioHome onNavigate={() => {}} />);
    expect(screen.getByText("Create Custom DocType")).toBeTruthy();
    expect(screen.getByText(/Use builders\/wizards for normal work/)).toBeTruthy();
  });
});
