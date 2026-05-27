export type RoleType =
  | "owner"
  | "admin"
  | "warehouse_manager"
  | "stock_operator"
  | "viewer"
  | "auditor";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  is_active: boolean;
}

export interface Warehouse {
  id: string;
  tenant_id: string;
  warehouse_code: string;
  name: string;
  is_active: boolean;
}
