import { useState } from "react";
import { FileJson, Columns3, LayoutDashboard, ListTree, Table, LayoutTemplate, ShieldCheck, Hash, GitBranch, PlusCircle } from "lucide-react";
import { CustomDocTypeWizard } from "./CustomDocTypeWizard";

const advancedSections = [
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
  const [showWizard, setShowWizard] = useState(false);

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px",
    fontSize: "var(--font-size-sm)",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    border: "none",
    borderRadius: "var(--border-radius-sm)",
    background: "transparent",
    color: "inherit",
  };

  if (showWizard) {
    return <CustomDocTypeWizard onClose={() => setShowWizard(false)} />;
  }

  return (
    <div className="card" style={{ padding: "var(--card-padding)" }}>
      <h2>Metadata Studio</h2>
      <p style={{ marginBottom: "12px", color: "var(--muted)", fontSize: "var(--font-size-sm)" }}>
        Create and manage ERP metadata configuration.
      </p>

      <div
        className="btn"
        onClick={() => setShowWizard(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 16px",
          fontSize: "var(--font-size-sm)",
          cursor: "pointer",
          marginBottom: "16px",
          fontWeight: 600,
          border: "none",
          borderRadius: "var(--border-radius-sm)",
          background: "var(--primary, #0f5f63)",
          color: "#fff",
          width: "100%",
        }}
      >
        <PlusCircle size={18} />
        Create Custom DocType
      </div>

      <div style={{ marginBottom: "8px" }}>
        <h3 style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--muted)", margin: 0 }}>
          Advanced Metadata Tables
        </h3>
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)", margin: "2px 0 0" }}>
          Raw table inspection for debugging. Use the wizard above for creating new DocTypes.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
        {advancedSections.map((s) => (
          <button
            key={s.key}
            className="logout"
            onClick={() => onNavigate(s.key)}
            style={buttonStyle}
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
