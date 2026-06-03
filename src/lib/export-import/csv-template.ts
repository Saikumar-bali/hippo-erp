import type { DocFieldMeta } from "../metadata/types";

const SYSTEM_FIELDS = new Set(["id", "created_at", "updated_at", "is_active"]);

export function generateTemplateHeader(fields: DocFieldMeta[]): string {
  const editable = fields.filter(
    (f) =>
      !f.is_hidden &&
      !f.is_readonly &&
      !SYSTEM_FIELDS.has(f.fieldname) &&
      f.fieldtype !== "uuid" &&
      f.fieldtype !== "Status",
  );

  const headerCells = editable.map((f) => {
    let label = f.label;
    if (f.is_required) label = `*${label}`;
    return escapeCsvValue(label);
  });

  return headerCells.join(",");
}

function escapeCsvValue(value: string): string {
  if (value === "") return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadTemplate(csvHeader: string, doctypeKey: string) {
  const filename = `${doctypeKey}_template.csv`;
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvHeader + "\r\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
