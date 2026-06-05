import type { ReactNode } from "react";
import type { BreadcrumbItem } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbBar } from "./BreadcrumbBar";

type Props = {
  sidebar: ReactNode;
  topbar: ReactNode;
  content: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  onBreadcrumbNavigate?: (item: BreadcrumbItem) => void;
  densityMode?: "compact" | "comfortable";
};

export function AppShell({ sidebar, topbar, content, breadcrumbs = [], onBreadcrumbNavigate, densityMode = "compact" }: Props) {
  return (
    <div className={`app-shell density-${densityMode}`}>
      {sidebar}
      <main className="main">
        {topbar}
        <section className="content">
          <BreadcrumbBar items={breadcrumbs} onNavigate={onBreadcrumbNavigate} />
          {content}
        </section>
      </main>
    </div>
  );
}
