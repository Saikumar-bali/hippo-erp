import type { ListViewColumn } from "../metadata/types";

function escapeCsvValue(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str === "") return "";
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function recordsToCsv(
  records: Record<string, unknown>[],
  columns: ListViewColumn[],
): string {
  const header = columns.map((col) => escapeCsvValue(col.label)).join(",");
  const rows = records.map((record) =>
    columns.map((col) => {
      const value = record[col.fieldname];
      return escapeCsvValue(value);
    }).join(","),
  );
  return [header, ...rows].join("\r\n");
}

export function downloadCsv(content: string, filename: string) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;header=present" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportFilename(doctypeKey: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${doctypeKey}_${y}-${m}-${d}.csv`;
}
