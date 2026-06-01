import { useState } from "react";
import { FileJson, Columns3, LayoutDashboard, ListTree, Table, LayoutTemplate, ShieldCheck, Hash, GitBranch, PlusCircle, Zap } from "lucide-react";
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

const quickKeys = new Set(["metadata_studio_doctypes", "metadata_studio_workspaces", "metadata_studio_workspace_items", "metadata_studio_list_views", "metadata_studio_form_layouts"]);

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
          justifyContent: "center",
          gap: "10px",
          padding: "14px 20px",
          fontSize: "var(--font-size-base)",
          cursor: "pointer",
          marginBottom: "16px",
          fontWeight: 700,
          border: "none",
          borderRadius: "var(--border-radius-sm)",
          background: "var(--primary, #0f5f63)",
          color: "#fff",
          width: "100%",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        }}
      >
        <PlusCircle size={20} />
        Create Custom DocType
      </div>

      <p style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)", marginBottom: "24px", lineHeight: 1.6, padding: "12px", background: "var(--bg)", borderLeft: "4px solid var(--primary)", borderRadius: "4px" }}>
        <strong>Helper:</strong> Use builders/wizards for normal work. Use raw tables only for advanced fixes.
      </p>

      <div style={{ marginBottom: "12px" }}>
        <h3 style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
          <Zap size={14} /> Recommended Workflow
        </h3>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "10px", marginBottom: "24px" }}>
        {advancedSections.filter((s) => quickKeys.has(s.key)).map((s) => (
          <button
            key={s.key}
            className="btn"
            onClick={() => onNavigate(s.key)}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", fontSize: "var(--font-size-sm)", cursor: "pointer", textAlign: "left", border: "1px solid var(--border)", borderRadius: "var(--border-radius-sm)", background: "var(--card-bg)" }}
          >
            <div style={{ padding: "8px", borderRadius: "50%", background: "var(--bg)", color: "var(--primary)" }}>
              <s.icon size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.3px" }}>{s.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: "12px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
        <h3 style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--muted)", margin: 0 }}>
          Advanced Metadata Tables
        </h3>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
        {advancedSections.map((s) => (
          <button
            key={s.key}
            className="logout"
            onClick={() => onNavigate(s.key)}
            style={buttonStyle}
          >
            <s.icon size={16} style={{ opacity: 0.7 }} />
            <div>
              <div style={{ fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>{s.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
