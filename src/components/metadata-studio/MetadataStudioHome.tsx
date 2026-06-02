import { Blocks, Columns3, FileJson, LayoutDashboard, LayoutTemplate, ListChecks, ListTree, PlusCircle, ShieldCheck, Table, WandSparkles } from "lucide-react";

const builderSections = [
  { key: "metadata_studio_doctype_builder", label: "DocType Builder", icon: FileJson, desc: "Create DocTypes with schema and storage dropdowns" },
  { key: "metadata_studio_field_builder", label: "Field Builder", icon: Columns3, desc: "Add and reorder fields with type and link pickers" },
  { key: "metadata_studio_list_view_builder", label: "List View Builder", icon: Table, desc: "Build columns, filters, and search fields visually" },
  { key: "metadata_studio_form_layout_builder", label: "Form Layout Builder", icon: LayoutTemplate, desc: "Place fields into sections without JSON" },
  { key: "metadata_studio_workspace_menu_builder", label: "Menu Builder", icon: ListTree, desc: "Add workspace items with target dropdowns" },
  { key: "metadata_studio_access_builder", label: "Access Builder", icon: ShieldCheck, desc: "Create action keys, permissions, and owner/admin grants" },
  { key: "metadata_studio_doc_check", label: "Check / Repair DocType", icon: ListChecks, desc: "Diagnose incomplete metadata and fix safe defaults" },
];

const advancedSections = [
  { key: "metadata_studio_doctypes", label: "DocTypes Table", icon: FileJson, desc: "Raw rows in app.erp_doctypes" },
  { key: "metadata_studio_docfields", label: "DocFields Table", icon: Columns3, desc: "Raw rows in app.erp_docfields" },
  { key: "metadata_studio_workspaces", label: "Workspaces Table", icon: LayoutDashboard, desc: "Workspace metadata and sort orders" },
  { key: "metadata_studio_workspace_items", label: "Workspace Items Table", icon: ListTree, desc: "Raw menu records and permissions" },
  { key: "metadata_studio_list_views", label: "List Views Table", icon: Table, desc: "JSON-backed list metadata rows" },
  { key: "metadata_studio_form_layouts", label: "Form Layouts Table", icon: LayoutTemplate, desc: "JSON-backed form layout rows" },
  { key: "metadata_studio_actions", label: "DocType Actions Table", icon: ShieldCheck, desc: "Action-to-permission mappings" },
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
            Builder-first workflow for Developer Studio. Create and refine metadata through guided screens, then fall back to raw tables only when you need advanced inspection or repair.
          </p>
        </div>
        <div className="studio-toolbar">
          <button className="studio-button studio-button--ghost" type="button" onClick={() => onNavigate("metadata_studio_doc_check")} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ListChecks size={16} />
            Open Check / Repair
          </button>
          <button className="studio-button" type="button" onClick={() => onNavigate("metadata_studio_doctype_builder")} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <PlusCircle size={16} />
            Start With DocType Builder
          </button>
        </div>
      </div>

      <div className="studio-grid studio-grid--two">
        <div className="studio-panel studio-panel--accent">
          <div className="studio-icon-title">
            <WandSparkles size={18} />
            <strong>Recommended Builder Flow</strong>
          </div>
          <div className="studio-pills">
            <span>1. DocType Builder</span>
            <span>2. Field Builder</span>
            <span>3. List View Builder</span>
            <span>4. Form Layout Builder</span>
            <span>5. Menu Builder</span>
            <span>6. Access Builder</span>
          </div>
        </div>
        <div className="studio-panel studio-panel--warm">
          <div className="studio-icon-title">
            <Blocks size={18} />
            <strong>Phase 4.8 Focus</strong>
          </div>
          <div className="studio-subtle" style={{ color: "#8b5e00" }}>
            Keep this builder focused on metadata-driven master/demo records like Purchase Invoice learning flows. Do not add ERP transaction logic here.
          </div>
        </div>
      </div>

      <div className="studio-home-section">
        <h3 className="studio-kicker" style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          Builder Screens
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
