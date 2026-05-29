import { supabase } from "./supabase";
import type { Product, ProductCategory, UnitOfMeasure } from "./types";

function fail(message: string): never {
  throw new Error(message);
}

function normalizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("duplicate key")) {
    return "This value already exists for the current company.";
  }
  return msg;
}

type RpcOk<T> = { ok: true; data: T };
type RpcErr = { ok: false; error: string };
type RpcResult<T> = RpcOk<T> | RpcErr;

async function rpcCall<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) fail(normalizeError(error));
  const result = data as unknown as RpcResult<T>;
  if (!result.ok) fail(result.error);
  return (result as RpcOk<T>).data;
}

// ── Product Categories ──────────────────────────────────────────────────────────

export async function listCategories(tenantId: string): Promise<ProductCategory[]> {
  return rpcCall<ProductCategory[]>("get_product_categories", { p_tenant_id: tenantId });
}

export async function getCategory(id: string): Promise<ProductCategory> {
  return rpcCall<ProductCategory>("get_product_category", { p_id: id });
}

export async function createCategory(payload: {
  tenant_id: string;
  code: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  sort_order?: number;
  category_type?: string;
}): Promise<ProductCategory> {
  return rpcCall<ProductCategory>("create_product_category", {
    p_tenant_id: payload.tenant_id,
    p_code: payload.code,
    p_name: payload.name,
    p_description: payload.description ?? null,
    p_parent_category_id: payload.parent_category_id ?? null,
    p_sort_order: payload.sort_order ?? 0,
    p_category_type: payload.category_type ?? null,
  });
}

export async function updateCategory(
  id: string,
  payload: { code?: string; name?: string; description?: string | null; parent_category_id?: string | null; sort_order?: number; category_type?: string | null }
): Promise<ProductCategory> {
  return rpcCall<ProductCategory>("update_product_category", {
    p_id: id,
    p_code: payload.code ?? null,
    p_name: payload.name ?? null,
    p_description: payload.description ?? null,
    p_parent_category_id: payload.parent_category_id ?? null,
    p_sort_order: payload.sort_order ?? null,
    p_category_type: payload.category_type ?? null,
  });
}

export async function deactivateCategory(id: string): Promise<void> {
  await rpcCall<null>("deactivate_product_category", { p_id: id });
}

export async function reactivateCategory(id: string): Promise<void> {
  await rpcCall<null>("reactivate_product_category", { p_id: id });
}

// ── Units of Measure ────────────────────────────────────────────────────────────

export async function listUoms(tenantId: string): Promise<UnitOfMeasure[]> {
  return rpcCall<UnitOfMeasure[]>("get_units_of_measure", { p_tenant_id: tenantId });
}

export async function getUom(id: string): Promise<UnitOfMeasure> {
  return rpcCall<UnitOfMeasure>("get_unit_of_measure", { p_id: id });
}

export async function createUom(payload: {
  tenant_id: string;
  code: string;
  name: string;
  description?: string;
  symbol?: string;
  decimal_precision?: number;
  uom_type?: string;
}): Promise<UnitOfMeasure> {
  return rpcCall<UnitOfMeasure>("create_unit_of_measure", {
    p_tenant_id: payload.tenant_id,
    p_code: payload.code,
    p_name: payload.name,
    p_description: payload.description ?? null,
    p_symbol: payload.symbol ?? null,
    p_decimal_precision: payload.decimal_precision ?? 0,
    p_uom_type: payload.uom_type ?? null,
  });
}

export async function updateUom(
  id: string,
  payload: { code?: string; name?: string; description?: string | null; symbol?: string | null; decimal_precision?: number; uom_type?: string | null }
): Promise<UnitOfMeasure> {
  return rpcCall<UnitOfMeasure>("update_unit_of_measure", {
    p_id: id,
    p_code: payload.code ?? null,
    p_name: payload.name ?? null,
    p_description: payload.description ?? null,
    p_symbol: payload.symbol ?? null,
    p_decimal_precision: payload.decimal_precision ?? null,
    p_uom_type: payload.uom_type ?? null,
  });
}

export async function deactivateUom(id: string): Promise<void> {
  await rpcCall<null>("deactivate_unit_of_measure", { p_id: id });
}

export async function reactivateUom(id: string): Promise<void> {
  await rpcCall<null>("reactivate_unit_of_measure", { p_id: id });
}

// ── Products ────────────────────────────────────────────────────────────────────

export async function listProducts(tenantId: string): Promise<Product[]> {
  return rpcCall<Product[]>("get_products", { p_tenant_id: tenantId });
}

export async function getProduct(id: string): Promise<Product> {
  return rpcCall<Product>("get_product", { p_id: id });
}

export interface CreateProductPayload {
  tenant_id: string;
  category_id: string;
  uom_id: string;
  sku: string;
  name: string;
  description?: string;
  barcode?: string;
  qr_value?: string;
  reorder_point?: number;
  reorder_quantity?: number;
  batch_tracking?: boolean;
  expiry_tracking?: boolean;
}

export async function createProduct(payload: CreateProductPayload): Promise<Product> {
  return rpcCall<Product>("create_product", {
    p_tenant_id: payload.tenant_id,
    p_category_id: payload.category_id,
    p_uom_id: payload.uom_id,
    p_sku: payload.sku,
    p_name: payload.name,
    p_description: payload.description ?? null,
    p_barcode: payload.barcode ?? null,
    p_qr_value: payload.qr_value ?? null,
    p_reorder_point: payload.reorder_point ?? 0,
    p_reorder_quantity: payload.reorder_quantity ?? 0,
    p_batch_tracking: payload.batch_tracking ?? false,
    p_expiry_tracking: payload.expiry_tracking ?? false,
  });
}

export interface UpdateProductPayload {
  category_id?: string;
  uom_id?: string;
  sku?: string;
  name?: string;
  description?: string | null;
  barcode?: string | null;
  qr_value?: string | null;
  reorder_point?: number;
  reorder_quantity?: number;
  batch_tracking?: boolean;
  expiry_tracking?: boolean;
}

export async function updateProduct(
  id: string,
  payload: UpdateProductPayload
): Promise<Product> {
  return rpcCall<Product>("update_product", {
    p_id: id,
    p_category_id: payload.category_id ?? null,
    p_uom_id: payload.uom_id ?? null,
    p_sku: payload.sku ?? null,
    p_name: payload.name ?? null,
    p_description: payload.description ?? null,
    p_barcode: payload.barcode ?? null,
    p_qr_value: payload.qr_value ?? null,
    p_reorder_point: payload.reorder_point ?? null,
    p_reorder_quantity: payload.reorder_quantity ?? null,
    p_batch_tracking: payload.batch_tracking ?? null,
    p_expiry_tracking: payload.expiry_tracking ?? null,
  });
}

export async function deactivateProduct(id: string): Promise<void> {
  await rpcCall<null>("deactivate_product", { p_id: id });
}

export async function reactivateProduct(id: string): Promise<void> {
  await rpcCall<null>("reactivate_product", { p_id: id });
}

export async function searchProducts(
  tenantId: string,
  query: string
): Promise<Product[]> {
  return rpcCall<Product[]>("search_products", { p_tenant_id: tenantId, p_query: query });
}
