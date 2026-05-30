import { useState } from "react";
import { DynamicListPage } from "./metadata/DynamicListPage";
import type { PermissionChecker } from "../lib/permission-access";

type Props = {
  tenantId: string;
  permissions: PermissionChecker;
};

type DocTypeTab = "product" | "product_category" | "unit_of_measure";

const tabs: Array<{ key: DocTypeTab; label: string }> = [
  { key: "product", label: "Products (Dynamic)" },
  { key: "product_category", label: "Categories (Dynamic)" },
  { key: "unit_of_measure", label: "UOM (Dynamic)" },
];

export function MetadataPrototype({ tenantId, permissions }: Props) {
  const [activeTab, setActiveTab] = useState<DocTypeTab>("product");

  const doctypeKeys: Record<DocTypeTab, string> = {
    product: "product",
    product_category: "product_category",
    unit_of_measure: "unit_of_measure",
  };

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
          This prototype renders the same Product Master data from metadata (app.erp_* tables).
          Existing Product screens still work — this is a side-by-side comparison.
        </p>
        <div className="filter-bar" style={{ borderTop: "1px solid #e0e7ef", padding: "8px 16px" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`logout ${activeTab === tab.key ? "logout--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              style={activeTab === tab.key ? { background: "#142033", color: "#fff" } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <DynamicListPage
        key={activeTab}
        doctypeKey={doctypeKeys[activeTab]}
        tenantId={tenantId}
        canUpdate={permissions.can("update_product")}
        canDelete={permissions.can("delete_product")}
        permissionChecker={(key: string) => permissions.can(key)}
      />
    </div>
  );
}
