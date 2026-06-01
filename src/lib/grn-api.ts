import { supabase } from "./supabase";

function fail(message: string): never {
  throw new Error(message);
}

function normalizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("duplicate key")) {
    return "This GRN number already exists.";
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

export interface GrnLineInput {
  product_id: string;
  uom_id: string;
  received_qty: number;
  accepted_qty?: number;
  rejected_qty?: number;
  batch_number?: string;
  expiry_date?: string;
  bin_id?: string;
}

export interface GrnHeader {
  id: string;
  tenant_id: string;
  grn_number: string;
  supplier_name: string;
  received_date: string;
  status: string;
  qc_status: string;
  notes: string | null;
  created_by: string;
  posted_by: string | null;
  posted_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  line_count?: number;
}

export interface GrnLine {
  id: string;
  grn_id: string;
  line_number: number;
  product_id: string;
  uom_id: string;
  received_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  batch_number: string | null;
  expiry_date: string | null;
  bin_id: string | null;
  line_status: string;
}

export interface GrnWithLines {
  grn: GrnHeader;
  lines: GrnLine[];
}

export interface GrnListResult {
  grns: GrnHeader[];
  total: number;
}

export interface CreateGrnDraftPayload {
  tenant_id: string;
  grn_number: string;
  supplier_name: string;
  received_date?: string;
  notes?: string;
  lines: GrnLineInput[];
}

export async function createGrnDraft(payload: CreateGrnDraftPayload): Promise<{ grn_id: string; grn_number: string }> {
  return rpcCall<{ grn_id: string; grn_number: string }>("wh_create_grn_draft", {
    p_tenant_id: payload.tenant_id,
    p_grn_number: payload.grn_number,
    p_supplier_name: payload.supplier_name,
    p_received_date: payload.received_date,
    p_notes: payload.notes ?? null,
    p_lines: JSON.stringify(payload.lines),
  });
}

export async function updateGrnDraft(
  grnId: string,
  payload: {
    supplier_name?: string;
    received_date?: string;
    notes?: string;
    lines?: GrnLineInput[];
  }
): Promise<{ grn_id: string }> {
  return rpcCall<{ grn_id: string }>("wh_update_grn_draft", {
    p_grn_id: grnId,
    p_supplier_name: payload.supplier_name ?? null,
    p_received_date: payload.received_date ?? null,
    p_notes: payload.notes ?? null,
    p_lines: payload.lines ? JSON.stringify(payload.lines) : null,
  });
}

export async function getGrn(grnId: string): Promise<GrnWithLines> {
  return rpcCall<GrnWithLines>("wh_get_grn", { p_grn_id: grnId });
}

export async function listGrns(
  tenantId: string,
  filters?: {
    status?: string;
    supplier_name?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }
): Promise<GrnListResult> {
  return rpcCall<GrnListResult>("wh_list_grns", {
    p_tenant_id: tenantId,
    p_status: filters?.status ?? null,
    p_supplier_name: filters?.supplier_name ?? null,
    p_date_from: filters?.date_from ?? null,
    p_date_to: filters?.date_to ?? null,
    p_limit: filters?.limit ?? 50,
    p_offset: filters?.offset ?? 0,
  });
}

export async function postGrn(grnId: string): Promise<{ grn_id: string; movements_created: number }> {
  return rpcCall<{ grn_id: string; movements_created: number }>("wh_post_grn", { p_grn_id: grnId });
}

export async function cancelGrn(grnId: string, reason: string): Promise<{ grn_id: string; reversals_created: number }> {
  return rpcCall<{ grn_id: string; reversals_created: number }>("wh_cancel_grn", {
    p_grn_id: grnId,
    p_reason: reason,
  });
}
