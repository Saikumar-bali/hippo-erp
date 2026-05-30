import { FileJson, Columns3, LayoutDashboard, ListTree, Table, LayoutTemplate, ShieldCheck, Hash, GitBranch } from "lucide-react";

const sections = [
  { key: "metadata_studio_doctypes", label: "DocTypes", icon: FileJson, desc: "All registered DocType definitions" },
  { key: "metadata_studio_docfields", label: "DocFields", icon: Columns3, desc: "Field definitions for each DocType" },
  { key: "metadata_studio_workspaces", label: "Workspaces", icon: LayoutDashboard, desc: "Workspace navigation groups" },
  { key: "metadata_studio_workspace_items", label: "Workspace Items", icon: ListTree, desc: "Navigation items within workspaces" },
  { key: "metadata_studio_list_views", label: "List Views", icon: Table, desc: "Table column and filter configurations" },
  { key: "metadata_studio_form_layouts", label: "Form Layouts", icon: LayoutTemplate, desc: "Form section and field layouts" },
  { key: "metadata_studio_actions", label: "DocType Actions", icon: ShieldCheck, desc: "Action-to-permission mappings" },
  { key: "metadata_studio_naming_series", label: "Naming Series", icon: Hash, desc: "Document numbering configurations" },
  { key: "metadata_studio_workflows", label: "Workflows", icon: GitBranch, desc: "Document workflow state machines" },
];

type Props = {
  onNavigate: (itemKey: string) => void;
};

export function MetadataStudioHome({ onNavigate }: Props) {
  return (
    <div className="card" style={{ padding: "var(--card-padding)" }}>
      <h2>Metadata Studio</h2>
      <p style={{ marginBottom: "var(--card-padding)", color: "var(--muted)" }}>
        Inspect ERP metadata configuration. This view is read-only.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
        {sections.map((s) => (
          <button
            key={s.key}
            className="logout"
            onClick={() => onNavigate(s.key)}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px", fontSize: "var(--font-size-sm)", cursor: "pointer", textAlign: "left", width: "100%" }}
          >
            <s.icon size={16} />
            <div>
              <div style={{ fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>{s.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
