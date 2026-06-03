import { useState } from "react";
import { DynamicListPage } from "./metadata/DynamicListPage";
import type { PermissionChecker } from "../lib/permission-access";

type Props = {
  tenantId: string;
  permissions: PermissionChecker;
};

const tabs: Array<{ doctypeKey: string; label: string }> = [
  { doctypeKey: "product", label: "Products (Dynamic)" },
  { doctypeKey: "product_category", label: "Categories (Dynamic)" },
  { doctypeKey: "unit_of_measure", label: "UOM (Dynamic)" },
];

export function MetadataPrototype({ tenantId, permissions }: Props) {
  const [activeTab, setActiveTab] = useState(tabs[0].doctypeKey);

  return (
    <div className="module-stack">
      <div className="card">
        <div className="card-head">
          <h3>Metadata Prototype</h3>
          <span className="mini-badge mini-badge--active" style={{ marginLeft: 8 }}>
            Phase 2.5 - Experimental
          </span>
        </div>
        <p className="card-note" style={{ padding: "8px 16px", color: "#666" }}>
          This prototype renders Product Master data from metadata (app.erp_* tables).
          Existing Product screens still work — this is a side-by-side comparison.
        </p>
        <div className="filter-bar" style={{ borderTop: "1px solid #e0e7ef", padding: "8px 16px" }}>
          {tabs.map((tab) => (
            <button
              key={tab.doctypeKey}
              className={`logout ${activeTab === tab.doctypeKey ? "logout--active" : ""}`}
              onClick={() => setActiveTab(tab.doctypeKey)}
              style={activeTab === tab.doctypeKey ? { background: "#142033", color: "#fff" } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <DynamicListPage
        key={activeTab}
        doctypeKey={activeTab}
        tenantId={tenantId}
        canUpdate={permissions.can("update_product")}
        canDelete={permissions.can("delete_product")}
        canExport={permissions.can(`export_${activeTab}`)}
        canImport={permissions.can(`import_${activeTab}`)}
        permissionChecker={(key: string) => permissions.can(key)}
      />
    </div>
  );
}
