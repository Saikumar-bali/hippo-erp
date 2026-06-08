import { supabase } from "./supabase";

type RpcResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export interface ClientScriptRecord {
  id: string;
  company_id: string | null;
  doctype_key: string;
  script_name: string;
  script_type: string;
  event_name: string;
  script_body: Record<string, unknown>;
  is_enabled: boolean;
  is_standard: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function listClientScripts(): Promise<ClientScriptRecord[]> {
  const { data, error } = await supabase.rpc("erp_list_client_scripts");
  if (error) throw new Error(error.message);
  const result = data as RpcResult<ClientScriptRecord[]>;
  if (!result.ok) throw new Error(result.error ?? "Failed to list client scripts");
  return result.data ?? [];
}

export async function getClientScriptsForDoctype(
  doctypeKey: string,
  companyId?: string,
): Promise<ClientScriptRecord[]> {
  const { data, error } = await supabase.rpc("erp_get_client_scripts_for_doctype", {
    p_doctype_key: doctypeKey,
    p_company_id: companyId ?? null,
  });
  if (error) throw new Error(error.message);
  const result = data as RpcResult<ClientScriptRecord[]>;
  if (!result.ok) throw new Error(result.error ?? "Failed to get client scripts");
  return result.data ?? [];
}

export async function createClientScript(params: {
  doctype_key: string;
  script_name: string;
  script_body: Record<string, unknown>;
  event_name?: string;
  company_id?: string | null;
  script_type?: string;
  is_enabled?: boolean;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("erp_create_client_script", {
    p_doctype_key: params.doctype_key,
    p_script_name: params.script_name,
    p_script_body: params.script_body,
    p_event_name: params.event_name ?? "onLoad",
    p_company_id: params.company_id ?? null,
    p_script_type: params.script_type ?? "form",
    p_is_enabled: params.is_enabled ?? true,
  });
  if (error) throw new Error(error.message);
  const result = data as RpcResult<{ id: string }>;
  if (!result.ok) throw new Error(result.error ?? "Failed to create client script");
  return result.data!;
}

export async function updateClientScript(params: {
  id: string;
  script_name?: string;
  script_body?: Record<string, unknown>;
  event_name?: string;
  is_enabled?: boolean;
}): Promise<void> {
  const { data, error } = await supabase.rpc("erp_update_client_script", {
    p_id: params.id,
    p_script_name: params.script_name ?? null,
    p_script_body: params.script_body ?? null,
    p_event_name: params.event_name ?? null,
    p_is_enabled: params.is_enabled ?? null,
    p_is_standard: null,
  });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result.ok) throw new Error(result.error ?? "Failed to update client script");
}

export async function disableClientScript(
  id: string,
  isEnabled: boolean = false,
): Promise<void> {
  const { data, error } = await supabase.rpc("erp_disable_client_script", {
    p_id: id,
    p_is_enabled: isEnabled,
  });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result.ok) throw new Error(result.error ?? "Failed to toggle client script");
}

export async function deleteClientScript(id: string): Promise<void> {
  const { data, error } = await supabase.rpc("erp_delete_client_script", {
    p_id: id,
  });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result.ok) throw new Error(result.error ?? "Failed to delete client script");
}
