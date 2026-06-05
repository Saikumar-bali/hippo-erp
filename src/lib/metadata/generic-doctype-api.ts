import { supabase } from "../supabase";
import type { DocTypeApi } from "../../components/metadata/doctype-api-map";

function handleRpcResponse(response: unknown): Record<string, unknown>[] {
  const r = response as { ok?: boolean; data?: unknown[]; error?: string } | null;
  if (!r) throw new Error("No response from server");
  if (!r.ok) throw new Error(r.error ?? "Unknown error");
  return (r.data as Record<string, unknown>[]) ?? [];
}

function handleSingleRpcResponse(response: unknown): Record<string, unknown> {
  const r = response as { ok?: boolean; data?: Record<string, unknown>; error?: string } | null;
  if (!r) throw new Error("No response from server");
  if (!r.ok) throw new Error(r.error ?? "Unknown error");
  return r.data ?? {};
}

function splitSystemFields(payload: Record<string, unknown>, tenantId?: string) {
  const { tenant_id, company_id, ...data } = payload;

  return {
    companyId: tenantId ?? (company_id as string | undefined) ?? (tenant_id as string | undefined),
    data,
  };
}

export function createGenericDocTypeApi(doctypeKey: string): DocTypeApi {
  return {
    list: async (tenantId: string) => {
      const { data, error } = await supabase.rpc("erp_list_documents", {
        p_doctype_key: doctypeKey,
        p_company_id: tenantId,
      });
      if (error) throw new Error(error.message);
      const rows = handleRpcResponse(data);
      return rows.map((r) => ({
        ...(r.data as Record<string, unknown>),
        ...r,
      }));
    },

    get: async (id: string, tenantId?: string) => {
      const { data, error } = await supabase.rpc("erp_get_document", {
        p_doctype_key: doctypeKey,
        p_document_id: id,
        p_company_id: tenantId ?? "00000000-0000-0000-0000-000000000000",
      });
      if (error) throw new Error(error.message);
      const r = handleSingleRpcResponse(data);
      return {
        ...(r.data as Record<string, unknown>),
        ...r,
      };
    },

    create: async (payload: Record<string, unknown>) => {
      const { companyId, data: cleanData } = splitSystemFields(payload);
      if (!companyId) throw new Error("Missing company context for generic document create.");

      const { data, error } = await supabase.rpc("erp_create_document", {
        p_doctype_key: doctypeKey,
        p_company_id: companyId,
        p_data: cleanData,
      });
      if (error) throw new Error(error.message);
      const r = data as { ok?: boolean; document_id?: string; error?: string } | null;
      if (!r?.ok) throw new Error(r?.error ?? "Create failed");
      return r;
    },

    update: async (id: string, payload: Record<string, unknown>, tenantId?: string) => {
      const { companyId, data: cleanData } = splitSystemFields(payload, tenantId);
      if (!companyId) throw new Error("Missing company context for generic document update.");

      const { data, error } = await supabase.rpc("erp_update_document", {
        p_doctype_key: doctypeKey,
        p_document_id: id,
        p_company_id: companyId,
        p_data: cleanData,
      });
      if (error) throw new Error(error.message);
      const r = data as { ok?: boolean; error?: string } | null;
      if (!r?.ok) throw new Error(r?.error ?? "Update failed");
    },

    deactivate: async (id: string, tenantId?: string) => {
      const { data, error } = await supabase.rpc("erp_deactivate_document", {
        p_doctype_key: doctypeKey,
        p_document_id: id,
        p_company_id: tenantId ?? "00000000-0000-0000-0000-000000000000",
      });
      if (error) throw new Error(error.message);
      const r = data as { ok?: boolean; error?: string } | null;
      if (!r?.ok) throw new Error(r?.error ?? "Deactivate failed");
    },

    reactivate: async (id: string, tenantId?: string) => {
      const { data, error } = await supabase.rpc("erp_reactivate_document", {
        p_doctype_key: doctypeKey,
        p_document_id: id,
        p_company_id: tenantId ?? "00000000-0000-0000-0000-000000000000",
      });
      if (error) throw new Error(error.message);
      const r = data as { ok?: boolean; error?: string } | null;
      if (!r?.ok) throw new Error(r?.error ?? "Reactivate failed");
    },

    listAuditEvents: async (id: string, tenantId?: string) => {
      const { data, error } = await supabase.rpc("erp_list_document_audit_events", {
        p_doctype_key: doctypeKey,
        p_document_id: id,
        p_company_id: tenantId ?? "00000000-0000-0000-0000-000000000000",
      });
      if (error) throw new Error(error.message);
      return handleRpcResponse(data);
    },

    listVersions: async (id: string, tenantId?: string) => {
      const { data, error } = await supabase.rpc("erp_list_document_versions", {
        p_doctype_key: doctypeKey,
        p_document_id: id,
        p_company_id: tenantId ?? "00000000-0000-0000-0000-000000000000",
      });
      if (error) throw new Error(error.message);
      return handleRpcResponse(data);
    },

    getVersionDiff: async (id: string, versionFrom: number, versionTo: number, tenantId?: string) => {
      const { data, error } = await supabase.rpc("erp_get_document_version_diff", {
        p_doctype_key: doctypeKey,
        p_document_id: id,
        p_company_id: tenantId ?? "00000000-0000-0000-0000-000000000000",
        p_version_from: versionFrom,
        p_version_to: versionTo,
      });
      if (error) throw new Error(error.message);
      const r = data as { ok?: boolean; diff?: Record<string, unknown>; data_from?: Record<string, unknown>; data_to?: Record<string, unknown>; error?: string } | null;
      if (!r?.ok) throw new Error(r?.error ?? "Version diff failed");
      return { diff: r.diff ?? {}, dataFrom: r.data_from ?? {}, dataTo: r.data_to ?? {} };
    },
  };
}
