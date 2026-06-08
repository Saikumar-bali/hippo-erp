import { supabase } from "../supabase";
import type { ErpModuleMeta } from "./types";

type RpcResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  doctype_count?: number;
  has_doctypes?: boolean;
  module_key?: string;
  is_active?: boolean;
  deleted?: boolean;
};

async function rpcCall<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result.ok) throw new Error(result.error ?? "RPC failed");
  return result.data as T;
}

export interface ModuleRecord extends ErpModuleMeta {
  doctype_count: number;
}

export async function listModules(): Promise<ModuleRecord[]> {
  const { data, error } = await supabase.rpc("erp_list_modules");
  if (error) throw new Error(error.message);
  const result = data as RpcResult<ModuleRecord[]>;
  if (!result.ok) throw new Error(result.error ?? "Failed to list modules");
  return result.data ?? [];
}

export async function createModule(params: {
  module_key: string;
  label: string;
  description?: string;
  icon?: string;
  route?: string;
  sort_order?: number;
}): Promise<ErpModuleMeta> {
  return rpcCall<ErpModuleMeta>("erp_create_module", {
    p_module_key: params.module_key,
    p_label: params.label,
    p_description: params.description ?? null,
    p_icon: params.icon ?? null,
    p_route: params.route ?? null,
    p_sort_order: params.sort_order ?? 0,
  });
}

export async function updateModule(
  id: string,
  params: {
    label?: string;
    description?: string | null;
    icon?: string | null;
    route?: string | null;
    sort_order?: number;
    is_active?: boolean;
  }
): Promise<ErpModuleMeta> {
  return rpcCall<ErpModuleMeta>("erp_update_module", {
    p_id: id,
    p_label: params.label ?? null,
    p_description: params.description ?? null,
    p_icon: params.icon ?? null,
    p_route: params.route ?? null,
    p_sort_order: params.sort_order ?? null,
    p_is_active: params.is_active ?? null,
  });
}

export async function deactivateModule(id: string): Promise<void> {
  const { data, error } = await supabase.rpc("erp_deactivate_module", { p_id: id });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result.ok) throw new Error(result.error ?? "Failed to deactivate module");
}

export async function reactivateModule(id: string): Promise<void> {
  const { data, error } = await supabase.rpc("erp_reactivate_module", { p_id: id });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result.ok) throw new Error(result.error ?? "Failed to reactivate module");
}

export async function deleteModuleIfUnused(id: string): Promise<void> {
  const { data, error } = await supabase.rpc("erp_delete_module_if_unused", { p_id: id });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result.ok) throw new Error(result.error ?? "Failed to delete module");
}

export async function moduleHasDoctypes(moduleKey: string): Promise<{ has_doctypes: boolean; doctype_count: number }> {
  const { data, error } = await supabase.rpc("erp_module_has_doctypes", { p_module_key: moduleKey });
  if (error) throw new Error(error.message);
  const result = data as RpcResult & { has_doctypes: boolean; doctype_count: number };
  if (!result.ok) throw new Error(result.error ?? "Failed to check module");
  return { has_doctypes: result.has_doctypes ?? false, doctype_count: result.doctype_count ?? 0 };
}
