import type { DocFieldType } from "./types";

export const FIELD_TYPE_META: Record<DocFieldType, {
  label: string;
  defaultWidth: number;
  align: "left" | "center" | "right";
  htmlInputType?: string;
}> = {
  Data: { label: "Text", defaultWidth: 150, align: "left" },
  Text: { label: "Text Area", defaultWidth: 250, align: "left" },
  Float: { label: "Decimal", defaultWidth: 100, align: "right", htmlInputType: "number" },
  Int: { label: "Integer", defaultWidth: 80, align: "right", htmlInputType: "number" },
  Check: { label: "Checkbox", defaultWidth: 70, align: "center" },
  Select: { label: "Select", defaultWidth: 150, align: "left" },
  Link: { label: "Link", defaultWidth: 150, align: "left" },
  Date: { label: "Date", defaultWidth: 120, align: "center", htmlInputType: "date" },
  Datetime: { label: "Date Time", defaultWidth: 160, align: "center" },
  uuid: { label: "UUID", defaultWidth: 100, align: "left" },
  Status: { label: "Status", defaultWidth: 100, align: "center" },
};

export function getFieldDisplayValue(
  fieldname: string,
  value: unknown,
  linkLabels?: Record<string, string>,
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (linkLabels && linkLabels[fieldname]) return linkLabels[fieldname];
  return String(value);
}
