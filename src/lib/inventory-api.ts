import { supabase } from "./supabase";
import type { Tenant, Warehouse } from "./types";

function fail(message: string): never {
  throw new Error(message);
}

function normalizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("Invalid schema: wh")) {
    return "This module uses the wh schema which is not yet exposed in the Supabase Data API.";
  }
  return msg;
}

type Id = string;
const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log("[inventory-api]", ...args);
};

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

async function unwrap<T>(p: Promise<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) fail(normalizeError(error));
  if (data === null) fail("No data returned");
  return data;
}

async function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

// ── Legacy re-exports from product-api ──────────────────────────────────────────

export {
  listProducts, createProduct,
  listCategories, createCategory,
  listUoms, createUom,
} from "./product-api";

// ── Legacy tenant/profile helpers ──────────────────────────────────────────────

export async function getMyTenants(): Promise<Tenant[]> {
  devLog("getMyTenants:start");
  const result: { data: Tenant[] | null; error: unknown } = await withTimeout(
    supabase.rpc("get_my_companies"),
    15000,
    "Company membership request timed out after 15s.",
  );
  if (result.error) {
    const message = normalizeError(result.error);
    devLog("getMyTenants:error", message);
    fail(message);
  }
  const rows = (result.data ?? []) as Tenant[];
  devLog("getMyTenants:success", { count: rows.length, ids: rows.map((r: Tenant) => r.id) });
  return rows;
}

export async function getMyProfile() {
  return unwrap(
    supabase
      .schema("app")
      .from("profiles")
      .select("id,full_name,email,created_at,updated_at")
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .single() as unknown as Promise<{ data: unknown; error: unknown }>,
  );
}

// ── Legacy warehouse helpers ────────────────────────────────────────────────────

export async function listWarehouses(tenantId: Id): Promise<Warehouse[]> {
  const { data, error } = await supabase
    .schema("wh")
    .from("warehouses")
    .select("id,tenant_id,warehouse_code,name,is_active")
    .eq("tenant_id", tenantId);
  if (error) fail(normalizeError(error.message));
  return data ?? [];
}

export async function createWarehouse(payload: { tenant_id: Id; warehouse_code: string; name: string }) {
  return unwrap(
    supabase.schema("wh").from("warehouses").insert(payload).select("*").single() as unknown as Promise<{ data: unknown; error: unknown }>,
  );
}

// ── Legacy stock helpers ────────────────────────────────────────────────────────

export async function listStock(tenantId: Id) {
  const { data, error } = await supabase
    .schema("wh")
    .from("inventory_stock")
    .select("*")
    .eq("tenant_id", tenantId);
  if (error) fail(normalizeError(error.message));
  return data ?? [];
}

export async function listBatches(tenantId: Id) {
  const { data, error } = await supabase
    .schema("wh")
    .from("inventory_batches")
    .select("*")
    .eq("tenant_id", tenantId);
  if (error) fail(normalizeError(error.message));
  return data ?? [];
}

export async function listMovements(tenantId: Id) {
  const { data, error } = await supabase
    .schema("wh")
    .from("inventory_movements")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("movement_date", { ascending: false });
  if (error) fail(normalizeError(error.message));
  return data ?? [];
}

export async function createGrn(payload: {
  tenant_id: Id;
  warehouse_id: Id;
  supplier_name: string;
  lines: Array<{ product_id: Id; qty: number; unit_cost: number }>;
}) {
  return unwrap(supabase.rpc("create_grn", { p_payload: payload }) as unknown as Promise<{ data: unknown; error: unknown }>);
}

export async function receiveGrnLine(grnLineId: Id) {
  return unwrap(supabase.rpc("receive_grn_line", { p_grn_line_id: grnLineId }) as unknown as Promise<{ data: unknown; error: unknown }>);
}

export async function allocateGrnToBin(grnLineId: Id, binId: Id, qty: number) {
  return unwrap(
    supabase.rpc("allocate_grn_to_bin", { p_grn_line_id: grnLineId, p_bin_id: binId, p_qty: qty }) as unknown as Promise<{
      data: unknown;
      error: unknown;
    }>,
  );
}

export async function reserveStock(stockId: Id, qty: number, referenceNo: string) {
  return unwrap(
    supabase.rpc("reserve_stock", { p_stock_id: stockId, p_qty: qty, p_reference_no: referenceNo }) as unknown as Promise<{
      data: unknown;
      error: unknown;
    }>,
  );
}

export async function releaseReservation(reservationId: Id) {
  return unwrap(supabase.rpc("release_reservation", { p_reservation_id: reservationId }) as unknown as Promise<{ data: unknown; error: unknown }>);
}

export async function dispatchReservation(reservationId: Id) {
  return unwrap(
    supabase.rpc("dispatch_reserved_stock", { p_reservation_id: reservationId }) as unknown as Promise<{ data: unknown; error: unknown }>,
  );
}

export async function createStockTransfer(payload: {
  tenant_id: Id;
  source_warehouse_id: Id;
  destination_warehouse_id: Id;
  lines: Array<{ product_id: Id; batch_id?: Id; quantity: number; source_bin_id?: Id; destination_bin_id?: Id }>;
}) {
  return unwrap(supabase.rpc("create_stock_transfer", { p_payload: payload }) as unknown as Promise<{ data: unknown; error: unknown }>);
}

export async function completeStockTransfer(transferId: Id) {
  return unwrap(supabase.rpc("complete_stock_transfer", { p_transfer_id: transferId }) as unknown as Promise<{ data: unknown; error: unknown }>);
}

export async function createStockAdjustment(payload: { tenant_id: Id; warehouse_id: Id; reason: string }) {
  return unwrap(supabase.rpc("create_stock_adjustment", { p_payload: payload }) as unknown as Promise<{ data: unknown; error: unknown }>);
}

export async function approveStockAdjustment(
  adjustmentId: Id,
  productId: Id,
  batchId: Id | null,
  binId: Id | null,
  deltaQty: number,
) {
  return unwrap(
    supabase.rpc("approve_stock_adjustment", {
      p_adjustment_id: adjustmentId,
      p_product_id: productId,
      p_batch_id: batchId,
      p_bin_id: binId,
      p_delta_qty: deltaQty,
    }) as unknown as Promise<{ data: unknown; error: unknown }>,
  );
}

export async function startCycleCount(tenantId: Id, warehouseId: Id) {
  return unwrap(supabase.rpc("start_cycle_count", { p_tenant_id: tenantId, p_warehouse_id: warehouseId }) as unknown as Promise<{ data: unknown; error: unknown }>);
}

export async function completeCycleCount(cycleCountId: Id) {
  return unwrap(supabase.rpc("complete_cycle_count", { p_cycle_count_id: cycleCountId }) as unknown as Promise<{ data: unknown; error: unknown }>);
}

export async function generateReorderAlerts(tenantId: Id) {
  return unwrap(supabase.rpc("generate_reorder_alerts", { p_tenant_id: tenantId }) as unknown as Promise<{ data: unknown; error: unknown }>);
}

export async function recalculateInventoryValuation(tenantId: Id) {
  return unwrap(
    supabase.rpc("recalculate_inventory_valuation", { p_tenant_id: tenantId }) as unknown as Promise<{ data: unknown; error: unknown }>,
  );
}

export async function listValuation(tenantId: Id) {
  const { data, error } = await supabase
    .schema("wh")
    .from("inventory_valuation")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("valuation_date", { ascending: false });
  if (error) fail(normalizeError(error.message));
  return data ?? [];
}

// ── Phase 4.3: GRN inventory read-only wrappers ────────────────────────────────

export interface CurrentInventoryRow {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  batch_id: string | null;
  batch_number: string | null;
  bin_id: string;
  bin_code: string;
  bin_name: string;
  on_hand_qty: number;
  available_qty: number;
  last_movement_at: string | null;
}

export interface InventoryMovementRow {
  id: string;
  movement_type: string;
  source_type: string;
  source_id: string;
  source_line_id: string | null;
  product_id: string;
  product_sku: string;
  product_name: string;
  batch_id: string | null;
  batch_number: string | null;
  bin_id: string | null;
  bin_code: string | null;
  bin_name: string | null;
  qty_delta: number;
  movement_date: string;
  created_by: string | null;
}

export async function listCurrentInventory(
  tenantId: string,
  filters?: {
    product_id?: string;
    bin_id?: string;
    limit?: number;
    offset?: number;
  },
): Promise<CurrentInventoryRow[]> {
  return rpcCall<CurrentInventoryRow[]>("wh_list_current_inventory", {
    p_tenant_id: tenantId,
    p_product_id: filters?.product_id ?? null,
    p_bin_id: filters?.bin_id ?? null,
    p_limit: filters?.limit ?? 100,
    p_offset: filters?.offset ?? 0,
  });
}

export async function listInventoryMovements(
  tenantId: string,
  filters?: {
    product_id?: string;
    movement_type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  },
): Promise<InventoryMovementRow[]> {
  return rpcCall<InventoryMovementRow[]>("wh_list_inventory_movements", {
    p_tenant_id: tenantId,
    p_product_id: filters?.product_id ?? null,
    p_movement_type: filters?.movement_type ?? null,
    p_date_from: filters?.date_from ?? null,
    p_date_to: filters?.date_to ?? null,
    p_limit: filters?.limit ?? 100,
    p_offset: filters?.offset ?? 0,
  });
}
