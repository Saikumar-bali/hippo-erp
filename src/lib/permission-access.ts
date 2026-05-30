export type PermissionChecker = {
  can: (required: string | readonly string[]) => boolean;
  canAny: (required: readonly string[]) => boolean;
  canAll: (required: readonly string[]) => boolean;
  isCompanyAdmin: boolean;
  loading: boolean;
  error: string;
};

export type ModulePermissionSpec = {
  requiredPermissions: readonly string[];
  createPermissions?: readonly string[];
  updatePermissions?: readonly string[];
  deletePermissions?: readonly string[];
};

export type ModuleLabel =
  | "Company profile"
  | "Dashboard KPIs"
  | "Products"
  | "Product categories"
  | "Units of measure"
  | "Warehouse hierarchy builder"
  | "Bin management"
  | "Current stock"
  | "Inventory batches and expiry"
  | "Inventory movements ledger"
  | "GRN"
  | "Stock transfers"
  | "Stock adjustments"
  | "Cycle counts"
  | "Reservations"
  | "Reorder alerts"
  | "Inventory valuation"
  | "Users and roles"
  | "Metadata Prototype";

export const MODULE_PERMISSION_MAP: Record<ModuleLabel, ModulePermissionSpec> = {
  "Company profile": {
    requiredPermissions: ["view_company"],
    updatePermissions: ["update_company"]
  },
  "Dashboard KPIs": {
    requiredPermissions: ["view_dashboard"]
  },
  "Products": {
    requiredPermissions: ["view_products"],
    createPermissions: ["create_product"],
    updatePermissions: ["update_product"],
    deletePermissions: ["delete_product"]
  },
  "Product categories": {
    requiredPermissions: ["view_products"],
    createPermissions: ["create_product"],
    updatePermissions: ["update_product"],
    deletePermissions: ["delete_product"]
  },
  "Units of measure": {
    requiredPermissions: ["view_products"],
    createPermissions: ["create_product"],
    updatePermissions: ["update_product"],
    deletePermissions: ["delete_product"]
  },
  "Warehouse hierarchy builder": {
    requiredPermissions: ["view_warehouses"],
    createPermissions: ["create_warehouse"],
    updatePermissions: ["update_warehouse"],
    deletePermissions: ["delete_warehouse"]
  },
  "Bin management": {
    requiredPermissions: ["manage_bins"]
  },
  "Current stock": {
    requiredPermissions: ["view_stock"]
  },
  "Inventory batches and expiry": {
    requiredPermissions: ["view_stock"]
  },
  "Inventory movements ledger": {
    requiredPermissions: ["view_movements"]
  },
  GRN: {
    requiredPermissions: ["view_grn"],
    createPermissions: ["create_grn"],
    updatePermissions: ["update_grn"],
    deletePermissions: ["post_grn"]
  },
  "Stock transfers": {
    requiredPermissions: ["transfer_stock"]
  },
  "Stock adjustments": {
    requiredPermissions: ["adjust_stock"],
    updatePermissions: ["approve_adjustment"]
  },
  "Cycle counts": {
    requiredPermissions: ["view_stock"],
    updatePermissions: ["approve_cycle_count"]
  },
  Reservations: {
    requiredPermissions: ["reserve_stock"]
  },
  "Reorder alerts": {
    requiredPermissions: ["view_stock"]
  },
  "Inventory valuation": {
    requiredPermissions: ["view_reports"]
  },
  "Users and roles": {
    requiredPermissions: ["view_users", "view_roles"],
    createPermissions: ["invite_user", "create_role"],
    updatePermissions: ["update_user", "update_role"],
    deletePermissions: ["deactivate_user", "delete_role"]
  },
  "Metadata Prototype": {
    requiredPermissions: ["view_products"],
    createPermissions: ["create_product"],
    updatePermissions: ["update_product"],
    deletePermissions: ["delete_product"]
  }
};

export function getModulePermissionSpec(module: string): ModulePermissionSpec {
  return MODULE_PERMISSION_MAP[module as ModuleLabel] ?? { requiredPermissions: [] };
}

export function hasAnyPermission(can: (required: string | readonly string[]) => boolean, permissions: readonly string[]) {
  return permissions.some((permission) => can(permission));
}
