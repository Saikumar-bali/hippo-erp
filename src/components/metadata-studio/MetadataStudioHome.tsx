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
    <div className="card" style={{ padding: "var(--card-padding)", display: "flex", flexDirection: "column", gap: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", alignItems: "start" }}>
        <div>
          <h2 style={{ margin: 0 }}>Metadata Studio</h2>
          <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "var(--font-size-sm)", maxWidth: "720px", lineHeight: 1.6 }}>
            Builder-first workflow for Developer Studio. Create and refine metadata through guided screens, then fall back to raw tables only when you need advanced inspection or repair.
          </p>
        </div>
        <button className="btn" type="button" onClick={() => onNavigate("metadata_studio_doctype_builder")} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <PlusCircle size={16} />
          Start With DocType Builder
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1.4fr) minmax(220px, 1fr)", gap: "14px" }}>
        <div style={{ padding: "14px", borderRadius: "var(--border-radius-sm)", border: "1px solid var(--border)", background: "linear-gradient(135deg, rgba(15,95,99,0.08), rgba(15,95,99,0.02))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <WandSparkles size={18} />
            <strong>Recommended Builder Flow</strong>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>
            <span>1. DocType Builder</span>
            <span>2. Field Builder</span>
            <span>3. List View Builder</span>
            <span>4. Form Layout Builder</span>
            <span>5. Menu Builder</span>
            <span>6. Access Builder</span>
          </div>
        </div>
        <div style={{ padding: "14px", borderRadius: "var(--border-radius-sm)", border: "1px solid #f4d7a0", background: "#fff9ef" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Blocks size={18} />
            <strong>Phase 4.8 Focus</strong>
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "#8b5e00", lineHeight: 1.6 }}>
            Keep this builder focused on metadata-driven master/demo records like Purchase Invoice learning flows. Do not add ERP transaction logic here.
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ margin: "0 0 10px", fontSize: "var(--font-size-sm)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
          Builder Screens
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
          {builderSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className="btn"
              onClick={() => onNavigate(section.key)}
              style={{ textAlign: "left", padding: "14px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "start" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <section.icon size={18} />
                <strong>{section.label}</strong>
              </div>
              <span style={{ fontSize: "var(--font-size-xs)", lineHeight: 1.6, opacity: 0.85 }}>{section.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: "var(--font-size-sm)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
          Advanced Metadata Tables
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
          {advancedSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className="logout"
              onClick={() => onNavigate(section.key)}
              style={{ textAlign: "left", padding: "12px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "start" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <section.icon size={16} />
                <strong>{section.label}</strong>
              </div>
              <span style={{ fontSize: "var(--font-size-xs)", lineHeight: 1.6, color: "var(--muted)" }}>{section.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
