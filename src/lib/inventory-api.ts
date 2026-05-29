import { supabase } from "./supabase";
import type { Tenant, Warehouse } from "./types";

// Compatibility note: database and RPC use `tenant_*` names; they represent company context.
function fail(message: string): never {
  throw new Error(message);
}

function normalizeError(message: string) {
  if (message.includes("Invalid schema: wh")) {
    return "This module uses the wh schema which is not yet exposed in the Supabase Data API.";
  }
  return message;
}

type Id = string;
const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log("[inventory-api]", ...args);
};

async function unwrap<T>(p: any): Promise<T> {
  const { data, error } = await p;
  if (error) fail(error.message);
  if (data === null) fail("No data returned");
  return data;
}

async function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    })
  ]);
}

// Re-export product-domain functions from the public-RPC-based product-api
export {
  listProducts, createProduct,
  listCategories, createCategory,
  listUoms, createUom
} from "./product-api";

export async function getMyTenants(): Promise<Tenant[]> {
  devLog("getMyTenants:start");
  const result: any = await withTimeout(
    supabase.rpc("get_my_companies"),
    15000,
    "Company membership request timed out after 15s."
  );
  if (result.error) {
    const message = normalizeError(result.error.message);
    devLog("getMyTenants:error", message);
    fail(message);
  }
  const rows = (result.data ?? []) as Tenant[];
  devLog("getMyTenants:success", { count: rows.length, ids: rows.map((r: Tenant) => r.id) });
  return rows;
}

export async function getMyProfile() {
  return unwrap(
    supabase.schema("app").from("profiles").select("id,full_name,email,created_at,updated_at").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").single()
  );
}

export async function listWarehouses(tenantId: Id): Promise<Warehouse[]> {
  const { data, error } = await supabase.schema("wh").from("warehouses").select("id,tenant_id,warehouse_code,name,is_active").eq("tenant_id", tenantId);
  if (error) fail(normalizeError(error.message));
  return data ?? [];
}

export async function createWarehouse(payload: { tenant_id: Id; warehouse_code: string; name: string }) {
  return unwrap(supabase.schema("wh").from("warehouses").insert(payload).select("*").single());
}

export async function listStock(tenantId: Id) {
  const { data, error } = await supabase.schema("wh").from("inventory_stock").select("*").eq("tenant_id", tenantId);
  if (error) fail(normalizeError(error.message));
  return data ?? [];
}

export async function listBatches(tenantId: Id) {
  const { data, error } = await supabase.schema("wh").from("inventory_batches").select("*").eq("tenant_id", tenantId);
  if (error) fail(normalizeError(error.message));
  return data ?? [];
}

export async function listMovements(tenantId: Id) {
  const { data, error } = await supabase.schema("wh").from("inventory_movements").select("*").eq("tenant_id", tenantId).order("movement_date", { ascending: false });
  if (error) fail(normalizeError(error.message));
  return data ?? [];
}

export async function createGrn(payload: {
  tenant_id: Id;
  warehouse_id: Id;
  supplier_name: string;
  lines: Array<{ product_id: Id; qty: number; unit_cost: number }>;
}) {
  return unwrap(supabase.rpc("create_grn", { p_payload: payload }));
}

export async function receiveGrnLine(grnLineId: Id) {
  return unwrap(supabase.rpc("receive_grn_line", { p_grn_line_id: grnLineId }));
}

export async function allocateGrnToBin(grnLineId: Id, binId: Id, qty: number) {
  return unwrap(supabase.rpc("allocate_grn_to_bin", { p_grn_line_id: grnLineId, p_bin_id: binId, p_qty: qty }));
}

export async function reserveStock(stockId: Id, qty: number, referenceNo: string) {
  return unwrap(supabase.rpc("reserve_stock", { p_stock_id: stockId, p_qty: qty, p_reference_no: referenceNo }));
}

export async function releaseReservation(reservationId: Id) {
  return unwrap(supabase.rpc("release_reservation", { p_reservation_id: reservationId }));
}

export async function dispatchReservation(reservationId: Id) {
  return unwrap(supabase.rpc("dispatch_reserved_stock", { p_reservation_id: reservationId }));
}

export async function createStockTransfer(payload: {
  tenant_id: Id;
  source_warehouse_id: Id;
  destination_warehouse_id: Id;
  lines: Array<{ product_id: Id; batch_id?: Id; quantity: number; source_bin_id?: Id; destination_bin_id?: Id }>;
}) {
  return unwrap(supabase.rpc("create_stock_transfer", { p_payload: payload }));
}

export async function completeStockTransfer(transferId: Id) {
  return unwrap(supabase.rpc("complete_stock_transfer", { p_transfer_id: transferId }));
}

export async function createStockAdjustment(payload: { tenant_id: Id; warehouse_id: Id; reason: string }) {
  return unwrap(supabase.rpc("create_stock_adjustment", { p_payload: payload }));
}

export async function approveStockAdjustment(adjustmentId: Id, productId: Id, batchId: Id | null, binId: Id | null, deltaQty: number) {
  return unwrap(
    supabase.rpc("approve_stock_adjustment", {
      p_adjustment_id: adjustmentId,
      p_product_id: productId,
      p_batch_id: batchId,
      p_bin_id: binId,
      p_delta_qty: deltaQty
    })
  );
}

export async function startCycleCount(tenantId: Id, warehouseId: Id) {
  return unwrap(supabase.rpc("start_cycle_count", { p_tenant_id: tenantId, p_warehouse_id: warehouseId }));
}

export async function completeCycleCount(cycleCountId: Id) {
  return unwrap(supabase.rpc("complete_cycle_count", { p_cycle_count_id: cycleCountId }));
}

export async function generateReorderAlerts(tenantId: Id) {
  return unwrap(supabase.rpc("generate_reorder_alerts", { p_tenant_id: tenantId }));
}

export async function recalculateInventoryValuation(tenantId: Id) {
  return unwrap(supabase.rpc("recalculate_inventory_valuation", { p_tenant_id: tenantId }));
}

export async function listValuation(tenantId: Id) {
  const { data, error } = await supabase.schema("wh").from("inventory_valuation").select("*").eq("tenant_id", tenantId).order("valuation_date", { ascending: false });
  if (error) fail(normalizeError(error.message));
  return data ?? [];
}
