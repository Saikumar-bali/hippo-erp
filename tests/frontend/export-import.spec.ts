import { describe, expect, it } from "vitest";
import { recordsToCsv, exportFilename } from "../../src/lib/export-import/csv-export";
import { generateTemplateHeader } from "../../src/lib/export-import/csv-template";
import { parseCsv } from "../../src/lib/export-import/csv-parse";
import { validateImportRows } from "../../src/lib/export-import/import-validate";
import type { DocFieldMeta, ListViewColumn } from "../../src/lib/metadata/types";

const mockFields: DocFieldMeta[] = [
  {
    id: "1", doctype_key: "crm_lead", fieldname: "lead_name", label: "Lead Name",
    fieldtype: "Data", db_column: null, options: {}, is_required: true,
    is_unique: false, is_readonly: false, is_hidden: false,
    in_list_view: true, in_standard_filter: false,
    default_value: null, validation_rules: {}, depends_on: {}, sort_order: 1,
  },
  {
    id: "2", doctype_key: "crm_lead", fieldname: "status", label: "Status",
    fieldtype: "Select", db_column: null, options: { options: ["New", "Contacted", "Qualified", "Lost"] },
    is_required: false, is_unique: false, is_readonly: false, is_hidden: false,
    in_list_view: true, in_standard_filter: false,
    default_value: "New", validation_rules: {}, depends_on: {}, sort_order: 2,
  },
  {
    id: "3", doctype_key: "crm_lead", fieldname: "expected_revenue", label: "Expected Revenue",
    fieldtype: "Float", db_column: null, options: {},
    is_required: false, is_unique: false, is_readonly: false, is_hidden: false,
    in_list_view: true, in_standard_filter: false,
    default_value: null, validation_rules: {}, depends_on: {}, sort_order: 3,
  },
  {
    id: "4", doctype_key: "crm_lead", fieldname: "is_active", label: "Is Active",
    fieldtype: "Check", db_column: null, options: {},
    is_required: false, is_unique: false, is_readonly: false, is_hidden: false,
    in_list_view: false, in_standard_filter: false,
    default_value: "true", validation_rules: {}, depends_on: {}, sort_order: 4,
  },
  {
    id: "5", doctype_key: "crm_lead", fieldname: "notes", label: "Notes",
    fieldtype: "Text", db_column: null, options: {},
    is_required: false, is_unique: false, is_readonly: false, is_hidden: false,
    in_list_view: false, in_standard_filter: false,
    default_value: null, validation_rules: {}, depends_on: {}, sort_order: 5,
  },
];

const mockColumns: ListViewColumn[] = [
  { fieldname: "lead_name", label: "Lead Name" },
  { fieldname: "status", label: "Status" },
  { fieldname: "expected_revenue", label: "Expected Revenue" },
];

describe("csv-export", () => {
  it("produces CSV with headers and rows", () => {
    const records = [
      { lead_name: "Alice Inc", status: "New", expected_revenue: 50000 },
      { lead_name: "Bob Corp", status: "Contacted", expected_revenue: 75000 },
    ];
    const csv = recordsToCsv(records, mockColumns);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Lead Name,Status,Expected Revenue");
    expect(lines[1]).toBe("Alice Inc,New,50000");
    expect(lines[2]).toBe("Bob Corp,Contacted,75000");
  });

  it("escapes commas in values", () => {
    const records = [
      { lead_name: "Smith, Jones & Co", status: "New", expected_revenue: 100 },
    ];
    const csv = recordsToCsv(records, mockColumns);
    expect(csv).toContain('"Smith, Jones & Co"');
  });

  it("escapes quotes in values", () => {
    const records = [
      { lead_name: 'Smith "The Boss"', status: "New", expected_revenue: 100 },
    ];
    const csv = recordsToCsv(records, mockColumns);
    expect(csv).toContain('"Smith ""The Boss"""');
  });

  it("generates filename with date", () => {
    const name = exportFilename("crm_lead");
    expect(name).toMatch(/^crm_lead_\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

describe("csv-template", () => {
  it("generates header with required markers", () => {
    const header = generateTemplateHeader(mockFields);
    expect(header).toContain("*Lead Name");
    expect(header).toContain("Status");
    expect(header).toContain("Expected Revenue");
    expect(header).not.toContain("is_active");
  });

  it("excludes system fields", () => {
    const header = generateTemplateHeader(mockFields);
    expect(header).not.toContain("id");
    expect(header).not.toContain("created_at");
    expect(header).not.toContain("updated_at");
  });
});

describe("csv-parse", () => {
  it("parses simple CSV", () => {
    const text = "Name,Status,Revenue\r\nAlice,New,50000\r\nBob,Contacted,75000";
    const result = parseCsv(text);
    expect(result.headers).toEqual(["Name", "Status", "Revenue"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(["Alice", "New", "50000"]);
    expect(result.errors).toHaveLength(0);
  });

  it("handles quoted fields with commas", () => {
    const text = 'Name,Note\r\n"Smith, Jones & Co","Note with, comma"\r\n';
    const result = parseCsv(text);
    expect(result.rows[0][0]).toBe("Smith, Jones & Co");
    expect(result.rows[0][1]).toBe("Note with, comma");
  });

  it("handles quoted fields with newlines", () => {
    const text = 'Name,Note\r\n"Line1\nLine2","Single line"\r\n';
    const result = parseCsv(text);
    expect(result.rows[0][0]).toBe("Line1\nLine2");
  });

  it("handles escaped quotes", () => {
    const text = 'Name,Note\r\n"Say ""Hello""","Ok"\r\n';
    const result = parseCsv(text);
    expect(result.rows[0][0]).toBe('Say "Hello"');
  });

  it("reports column count mismatch", () => {
    const text = "A,B\r\n1,2,3\r\n";
    const result = parseCsv(text);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("import-validate", () => {
  const importFields = mockFields.filter((f) => f.fieldname !== "is_active" && f.fieldname !== "notes");

  it("validates required fields", () => {
    const result = validateImportRows(
      [["", "New", "50000"]],
      ["Lead Name", "Status", "Expected Revenue"],
      importFields,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.fieldname === "lead_name" && e.message.includes("required"))).toBe(true);
  });

  it("validates Select options", () => {
    const result = validateImportRows(
      [["Alice Inc", "InvalidStatus", "50000"]],
      ["Lead Name", "Status", "Expected Revenue"],
      importFields,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.fieldname === "status" && e.message.includes("one of"))).toBe(true);
  });

  it("validates Float values", () => {
    const result = validateImportRows(
      [["Alice Inc", "New", "not-a-number"]],
      ["Lead Name", "Status", "Expected Revenue"],
      importFields,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.fieldname === "expected_revenue" && e.message.includes("number"))).toBe(true);
  });

  it("passes valid rows", () => {
    const result = validateImportRows(
      [["Alice Inc", "New", "50000"]],
      ["Lead Name", "Status", "Expected Revenue"],
      importFields,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].lead_name).toBe("Alice Inc");
    expect(result.validRows[0].status).toBe("New");
  });

  it("handles header label matching with fieldname", () => {
    const result = validateImportRows(
      [["Alice Inc", "Qualified", "100"]],
      ["Lead Name", "Status", "Expected Revenue"],
      importFields,
    );
    expect(result.valid).toBe(true);
    expect(result.validRows).toHaveLength(1);
  });
});
