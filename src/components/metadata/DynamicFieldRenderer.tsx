import type { DocFieldMeta } from "../../lib/metadata/types";
import { getFieldDisplayValue } from "../../lib/metadata/field-types";
import { LinkField } from "./LinkField";
import { StatusField } from "./StatusField";

type Props = {
  field: DocFieldMeta;
  value: unknown;
  linkLabels?: Record<string, string>;
  asLink?: boolean;
};

export function DynamicFieldRenderer({ field, value, linkLabels, asLink }: Props) {
  if (field.is_hidden && !value) return null;
  if (field.fieldtype === "Check") {
    return (
      <span className={`mini-badge ${value ? "mini-badge--active" : "mini-badge--muted"}`}>
        {value ? "Yes" : "No"}
      </span>
    );
  }

  if (field.fieldtype === "Link") {
    return <LinkField field={field} value={value as string} linkLabels={linkLabels} asLink={asLink} />;
  }

  if (field.fieldtype === "Status" || field.fieldname === "is_active") {
    return <StatusField value={value as boolean} />;
  }

  const display = getFieldDisplayValue(field.fieldname, value, linkLabels);

  if (field.fieldtype === "Datetime" && value) {
    return <span>{new Date(value as string).toLocaleString()}</span>;
  }

  if (field.fieldtype === "Date" && value) {
    return <span>{new Date(value as string).toLocaleDateString()}</span>;
  }

  return <span>{display}</span>;
}
