import type { BreadcrumbItem } from "../../lib/navigation/breadcrumbs";

type Props = {
  items: BreadcrumbItem[];
  onNavigate?: (item: BreadcrumbItem) => void;
};

export function BreadcrumbBar({ items, onNavigate }: Props) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="breadcrumb-bar">
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1;
        return (
          <span key={item.key} className="breadcrumb-segment">
            {isCurrent ? (
              <span className="breadcrumb-current" aria-current="page">{item.label}</span>
            ) : (
              <button
                type="button"
                className="breadcrumb-link"
                onClick={() => onNavigate?.(item)}
              >
                {item.label}
              </button>
            )}
            {!isCurrent ? <span className="breadcrumb-divider">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
