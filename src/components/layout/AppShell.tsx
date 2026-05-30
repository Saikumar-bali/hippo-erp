import type { ReactNode } from "react";

type Props = {
  sidebar: ReactNode;
  topbar: ReactNode;
  content: ReactNode;
};

export function AppShell({ sidebar, topbar, content }: Props) {
  return (
    <div className="app-shell">
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
