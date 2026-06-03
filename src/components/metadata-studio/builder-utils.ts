export function toSnakeCase(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function toTitleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function moveItem<T>(items: T[], from: number, direction: -1 | 1) {
  const to = from + direction;
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function nextSortOrder(items: Array<{ sort_order?: number | null }>) {
  return items.reduce((max, item) => Math.max(max, Number(item.sort_order ?? 0)), 0) + 1;
}

export function normalizeSortOrder<T>(items: T[]) {
  return items.map((item, index) => ({
    ...item,
    sort_order: index + 1,
  }));
}
