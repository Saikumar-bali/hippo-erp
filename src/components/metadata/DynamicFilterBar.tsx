import type { ListViewFilter } from "../../lib/metadata/types";

type Props = {
  filters: ListViewFilter[];
  searchFields: string[];
  search: string;
  onSearchChange: (value: string) => void;
  filterValues: Record<string, string>;
  onFilterChange: (fieldname: string, value: string) => void;
};

export function DynamicFilterBar({
  filters,
  searchFields,
  search,
  onSearchChange,
  filterValues,
  onFilterChange,
}: Props) {
  const searchPlaceholder = searchFields.length > 0
    ? `Search by ${searchFields.join(", ")}…`
    : "Search…";

  return (
    <div className="filter-bar">
      <input
        className="search-input"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {filters.filter((f) => f.type !== "link").map((f) => (
        <select
          key={f.fieldname}
          value={filterValues[f.fieldname] ?? "all"}
          onChange={(e) => onFilterChange(f.fieldname, e.target.value)}
        >
          <option value="all">All {f.label.toLowerCase()}</option>
          {f.options?.map((opt) => (
            <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
          ))}
        </select>
      ))}
    </div>
  );
}
