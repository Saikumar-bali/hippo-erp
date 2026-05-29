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
  role?: string;
}

export interface ProductCategory {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  parent_category_id: string | null;
  sort_order: number;
  category_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface UnitOfMeasure {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  symbol: string | null;
  decimal_precision: number;
  uom_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Product {
  id: string;
  // Internal schema naming: `tenant_id` maps to company context.
  tenant_id: string;
  category_id: string;
  uom_id: string;
  sku: string;
  name: string;
  description: string | null;
  barcode: string | null;
  qr_value: string | null;
  reorder_point: number;
  reorder_quantity: number;
  batch_tracking: boolean;
  expiry_tracking: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Warehouse {
  id: string;
  // Internal schema naming: `tenant_id` maps to company context.
  tenant_id: string;
  warehouse_code: string;
  name: string;
  is_active: boolean;
}
