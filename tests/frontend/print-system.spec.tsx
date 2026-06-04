import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PrintRenderer } from "../../src/components/print/PrintRenderer";
import { FullDocTypeConfig } from "../../src/lib/metadata/types";
import { PrintFormat } from "../../src/lib/print/print-types";

afterEach(() => {
  cleanup();
});

describe("PrintRenderer", () => {
  const mockConfig: FullDocTypeConfig = {
    doctype: {
      id: "dt1",
      doctype_key: "test_dt",
      label: "Test Document",
      module_key: "test",
      schema_name: "app",
      table_name: "test_table",
      route: null,
      is_company_scoped: true,
      is_submittable: false,
      is_child_table: false,
      is_single: false,
      is_active: true,
      default_order_by: null,
      storage_strategy: "generic_json",
      description: null
    },
    fields: [
      { id: "f1", doctype_key: "test_dt", fieldname: "name", label: "Name", fieldtype: "Data", sort_order: 1, db_column: null, options: {}, is_required: false, is_unique: false, is_readonly: false, is_hidden: false, in_list_view: true, in_standard_filter: true, default_value: null, validation_rules: {}, depends_on: {} },
      { id: "f2", doctype_key: "test_dt", fieldname: "status", label: "Status", fieldtype: "Select", sort_order: 2, db_column: null, options: [{ value: "active", label: "Active" }] as any, is_required: false, is_unique: false, is_readonly: false, is_hidden: false, in_list_view: true, in_standard_filter: true, default_value: null, validation_rules: {}, depends_on: {} },
      { id: "f3", doctype_key: "test_dt", fieldname: "is_active", label: "Is Active", fieldtype: "Check", sort_order: 3, db_column: null, options: {}, is_required: false, is_unique: false, is_readonly: false, is_hidden: false, in_list_view: true, in_standard_filter: true, default_value: null, validation_rules: {}, depends_on: {} },
    ],
    actions: [],
    listView: null,
    formLayout: null,
    namingSeries: null,
    workflow: null
  };

  const mockDocument = {
    id: "123",
    name: "John Doe",
    status: "active",
    is_active: true
  };

  const mockFormat: PrintFormat = {
    id: "fmt1",
    tenant_id: "t1",
    doctype_key: "test_dt",
    format_key: "standard",
    label: "Standard",
    is_default: true,
    is_active: true,
    layout_json: {
      sections: [
        { label: "General", fields: ["name", "status"] },
        { label: "Other", fields: ["is_active"] }
      ]
    },
    header_json: {},
    footer_json: {},
    created_at: "",
    updated_at: ""
  };

  it("renders document title and branding", () => {
    render(<PrintRenderer config={mockConfig} document={mockDocument} format={mockFormat} theme={null} />);
    
    expect(screen.getByText("Test Document")).toBeDefined();
    expect(screen.getByText("#123")).toBeDefined();
    // Use getAllByText and check if at least one is present
    expect(screen.getAllByText("Hippo ERP").length).toBeGreaterThan(0);
  });

  it("renders sections and fields", () => {
    render(<PrintRenderer config={mockConfig} document={mockDocument} format={mockFormat} theme={null} />);
    
    expect(screen.getByText("General")).toBeDefined();
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("John Doe")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
    expect(screen.getByText("Active")).toBeDefined();
    
    expect(screen.getByText("Other")).toBeDefined();
    expect(screen.getByText("Is Active")).toBeDefined();
    expect(screen.getByText("Yes")).toBeDefined();
  });

  it("applies company theme", () => {
    const mockTheme = {
      company_id: "t1",
      company_name: "Acme Corp",
      logo_url: "http://logo.png",
      favicon_url: null,
      primary_color: "#ff0000",
      accent_color: "#00ff00",
      sidebar_color: "#0000ff",
      topbar_color: "#ffffff",
      density_mode: "comfortable" as const,
      custom_variables: {}
    };

    render(<PrintRenderer config={mockConfig} document={mockDocument} format={mockFormat} theme={mockTheme} />);
    
    expect(screen.getByText("Acme Corp")).toBeDefined();
    const img = screen.getByAltText("Logo") as HTMLImageElement;
    expect(img.src).toContain("logo.png");
  });
});
