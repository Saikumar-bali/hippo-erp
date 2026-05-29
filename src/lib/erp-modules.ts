import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  DatabaseZap,
  PackageSearch,
  Ruler,
  ShieldUser,
  Truck,
  Waypoints,
  Warehouse,
  Workflow,
  LibraryBig,
  ReceiptText,
  CircleDashed,
  CalendarRange,
  Move3D,
  ListChecks
} from "lucide-react";
import type { ModuleLabel } from "./permission-access";

export type ErpModuleStatus = "active" | "pending";
export type ErpModuleScope = "company";

export type ErpModuleRegistryEntry = {
  moduleKey: string;
  label: ModuleLabel;
  route: string;
  icon: LucideIcon;
  requiredPermissions: readonly string[];
  scope: ErpModuleScope;
  status: ErpModuleStatus;
};

export const ERP_MODULE_REGISTRY: readonly ErpModuleRegistryEntry[] = [
  {
    moduleKey: "company_profile",
    label: "Company profile",
    route: "/company-profile",
    icon: Building2,
    requiredPermissions: ["view_company"],
    scope: "company",
    status: "active"
  },
  {
    moduleKey: "dashboard_kpis",
    label: "Dashboard KPIs",
    route: "/dashboard",
    icon: BarChart3,
    requiredPermissions: ["view_dashboard"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "products",
    label: "Products",
    route: "/products",
    icon: PackageSearch,
    requiredPermissions: ["view_products"],
    scope: "company",
    status: "active"
  },
  {
    moduleKey: "product_categories",
    label: "Product categories",
    route: "/products/categories",
    icon: LibraryBig,
    requiredPermissions: ["view_products"],
    scope: "company",
    status: "active"
  },
  {
    moduleKey: "units_of_measure",
    label: "Units of measure",
    route: "/products/uom",
    icon: Ruler,
    requiredPermissions: ["view_products"],
    scope: "company",
    status: "active"
  },
  {
    moduleKey: "warehouse_hierarchy",
    label: "Warehouse hierarchy builder",
    route: "/warehouse/hierarchy",
    icon: Waypoints,
    requiredPermissions: ["view_warehouses"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "bin_management",
    label: "Bin management",
    route: "/warehouse/bins",
    icon: Warehouse,
    requiredPermissions: ["manage_bins"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "current_stock",
    label: "Current stock",
    route: "/inventory/current-stock",
    icon: Boxes,
    requiredPermissions: ["view_stock"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "inventory_batches",
    label: "Inventory batches and expiry",
    route: "/inventory/batches",
    icon: CalendarRange,
    requiredPermissions: ["view_stock"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "inventory_movements",
    label: "Inventory movements ledger",
    route: "/inventory/movements",
    icon: DatabaseZap,
    requiredPermissions: ["view_movements"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "grn",
    label: "GRN",
    route: "/grn",
    icon: ReceiptText,
    requiredPermissions: ["view_grn"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "stock_transfers",
    label: "Stock transfers",
    route: "/inventory/transfers",
    icon: Truck,
    requiredPermissions: ["transfer_stock"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "stock_adjustments",
    label: "Stock adjustments",
    route: "/inventory/adjustments",
    icon: Workflow,
    requiredPermissions: ["adjust_stock"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "cycle_counts",
    label: "Cycle counts",
    route: "/inventory/cycle-counts",
    icon: CircleDashed,
    requiredPermissions: ["view_stock"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "reservations",
    label: "Reservations",
    route: "/inventory/reservations",
    icon: Move3D,
    requiredPermissions: ["reserve_stock"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "reorder_alerts",
    label: "Reorder alerts",
    route: "/inventory/reorder-alerts",
    icon: ListChecks,
    requiredPermissions: ["view_stock"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "inventory_valuation",
    label: "Inventory valuation",
    route: "/reports/inventory-valuation",
    icon: ClipboardList,
    requiredPermissions: ["view_reports"],
    scope: "company",
    status: "pending"
  },
  {
    moduleKey: "users_and_roles",
    label: "Users and roles",
    route: "/company/users-roles",
    icon: ShieldUser,
    requiredPermissions: ["view_users", "view_roles"],
    scope: "company",
    status: "active"
  }
] as const;

export const ERP_MODULES: readonly ErpModuleRegistryEntry[] = ERP_MODULE_REGISTRY;
