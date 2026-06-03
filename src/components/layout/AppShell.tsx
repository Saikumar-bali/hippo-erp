import type { ReactNode } from "react";

type Props = {
  sidebar: ReactNode;
  topbar: ReactNode;
  content: ReactNode;
  densityMode?: "compact" | "comfortable";
};

export function AppShell({ sidebar, topbar, content, densityMode = "compact" }: Props) {
  return (
    <div className={`app-shell density-${densityMode}`}>
      {sidebar}
      <main className="main">
        {topbar}
        <section className="content">
          {content}
        </section>
      </main>
    </div>
  );
}
