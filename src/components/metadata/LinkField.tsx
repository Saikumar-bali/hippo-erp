import type { DocFieldMeta } from "../../lib/metadata/types";

type Props = {
  field: DocFieldMeta;
  value: string | null;
  linkLabels?: Record<string, string>;
  asLink?: boolean;
};

export function LinkField({ field, value, linkLabels, asLink }: Props) {
  if (!value) return <span>—</span>;

  const display = linkLabels?.[field.fieldname] ?? value;

  if (asLink) {
    const linkTo = (field.options as Record<string, unknown>)?.link_to;
    const route = linkTo ? `/metadata/${String(linkTo)}/${value}` : "#";
    return <a href={route} className="link-button" onClick={(e) => e.preventDefault()}>{display}</a>;
  }

  return <span>{display}</span>;
}
