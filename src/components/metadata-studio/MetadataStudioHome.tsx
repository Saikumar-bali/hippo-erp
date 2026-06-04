import { Blocks, Columns3, FileJson, LayoutDashboard, LayoutTemplate, ListChecks, ListTree, PlusCircle, Printer, ShieldCheck, Table, WandSparkles } from "lucide-react";

const builderSections = [
  { key: "metadata_studio_doctype_builder", label: "DocType Builder", icon: FileJson, desc: "Create a business document type, then choose storage details only when needed" },
  { key: "metadata_studio_field_builder", label: "Field Builder", icon: Columns3, desc: "Add the fields users see on forms, with technical field keys shown second" },
  { key: "metadata_studio_list_view_builder", label: "List View Designer", icon: Table, desc: "Choose useful columns, filters, and search fields for daily work" },
  { key: "metadata_studio_form_layout_builder", label: "Form Layout Designer", icon: LayoutTemplate, desc: "Arrange fields into clean sections without editing JSON" },
  { key: "metadata_studio_workspace_menu_builder", label: "Workspace Menu Designer", icon: ListTree, desc: "Put pages and records where users expect to find them" },
  { key: "metadata_studio_access_builder", label: "Access Setup", icon: ShieldCheck, desc: "Create the standard actions and permission mapping for a document" },
  { key: "metadata_studio_access_control_manager", label: "Access Control Manager", icon: ShieldCheck, desc: "See effective rights, assign users, and fix missing access in plain language" },
  { key: "metadata_studio_print_formats", label: "Print Format Builder", icon: Printer, desc: "Create and manage document print layouts with sections and fields" },
  { key: "metadata_studio_doc_check", label: "Check / Repair Document Type", icon: ListChecks, desc: "Use when a screen is missing fields, list columns, actions, or menu links" },
];

const advancedSections = [
  { key: "metadata_studio_doctypes", label: "Document Types (advanced)", icon: FileJson, desc: "Advanced inspection of document type metadata rows" },
  { key: "metadata_studio_docfields", label: "Fields (advanced)", icon: Columns3, desc: "Advanced inspection of field metadata rows" },
  { key: "metadata_studio_workspaces", label: "Workspaces (advanced)", icon: LayoutDashboard, desc: "Workspace metadata and sort orders" },
  { key: "metadata_studio_workspace_items", label: "Workspace Items (advanced)", icon: ListTree, desc: "Advanced menu records and permission keys" },
  { key: "metadata_studio_list_views", label: "List Views (advanced)", icon: Table, desc: "Advanced list layout metadata" },
  { key: "metadata_studio_form_layouts", label: "Form Layouts (advanced)", icon: LayoutTemplate, desc: "Advanced form layout metadata" },
  { key: "metadata_studio_actions", label: "Actions & Permissions (advanced)", icon: ShieldCheck, desc: "Advanced action-to-permission mappings" },
];

type Props = {
  onNavigate: (itemKey: string) => void;
};

export function MetadataStudioHome({ onNavigate }: Props) {
  return (
    <div className="studio-shell">
      <div className="studio-header">
        <div>
          <p className="studio-kicker">Developer Studio</p>
          <h2>Metadata Studio</h2>
          <p style={{ marginTop: "6px", maxWidth: "720px" }}>
            Start with guided builders for business-friendly screens. Technical tables are still available below for inspection, but daily setup should happen through the guided flow.
          </p>
        </div>
        <div className="studio-toolbar">
          <button className="studio-button" type="button" onClick={() => onNavigate("metadata_studio_doc_check")} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", fontSize: "14px", fontWeight: "500", backgroundColor: "#ffffff", color: "#e03131", border: "1px solid #ffc9c9", borderRadius: "6px", cursor: "pointer" }}><ListChecks size={16} />Check or repair a screen</button>
          <button className="studio-button" type="button" onClick={() => onNavigate("metadata_studio_access_control_manager")} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", fontSize: "14px", fontWeight: "500", backgroundColor: "#ffffff", color: "#006666", border: "1px solid #006666", borderRadius: "6px", cursor: "pointer" }}>
            <ShieldCheck size={16} />
            Review role access
          </button>
          <button className="studio-button" type="button" onClick={() => onNavigate("metadata_studio_doctype_builder")} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", fontSize: "14px", fontWeight: "500", backgroundColor: "#ffffff", color: "#006666", border: "1px solid #006666", borderRadius: "6px", cursor: "pointer" }}>
            <PlusCircle size={16} />
            Start With DocType Builder
          </button>
        </div>
      </div>

      <div className="studio-grid studio-grid--two">
        <div className="studio-panel studio-panel--accent">
          <div className="studio-icon-title">
            <WandSparkles size={18} />
            <strong>Recommended setup flow</strong>
          </div>
          <div className="studio-pills">
            <span>1. DocType Builder</span>
            <span>2. Field Builder</span>
            <span>3. List View Designer</span>
            <span>4. Form Layout Designer</span>
            <span>5. Workspace Menu Designer</span>
            <span>6. Access Setup</span>
            <span>7. Access Control Manager</span>
          </div>
        </div>
        <div className="studio-panel studio-panel--warm">
          <div className="studio-icon-title">
            <Blocks size={18} />
            <strong>Professional UX guardrail</strong>
          </div>
          <div className="studio-subtle" style={{ color: "#8b5e00" }}>
            Keep this area focused on metadata and user experience. Transaction workflows belong in future phases, not in this polish pass.
          </div>
        </div>
      </div>

      <div className="studio-home-section">
        <h3 className="studio-kicker" style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          Guided builders
        </h3>
        <div className="studio-grid studio-grid--auto">
          {builderSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className="studio-card-button"
              onClick={() => onNavigate(section.key)}
            >
              <div className="studio-icon-title">
                <section.icon size={18} />
                <strong>{section.label}</strong>
              </div>
              <span className="studio-subtle">{section.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="studio-home-section" style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
        <h3 className="studio-kicker" style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          Advanced Metadata Tables
        </h3>
        <div className="studio-grid studio-grid--auto">
          {advancedSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className="studio-card-button"
              onClick={() => onNavigate(section.key)}
            >
              <div className="studio-icon-title">
                <section.icon size={16} />
                <strong>{section.label}</strong>
              </div>
              <span className="studio-subtle">{section.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
