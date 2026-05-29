import { supabase } from "./supabase";
import type { PermissionCatalogRecord } from "./permissions";

export type CompanyRole = {
  id: string;
  tenant_id: string;
  role_key: string;
  role_name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  permission_count: number;
  assignment_count: number;
};

export type CompanyRolePermission = {
  permission_key: string;
  is_granted: boolean;
};

function fail(message: string): never {
  throw new Error(message);
}

export async function getPermissionCatalog(): Promise<PermissionCatalogRecord[]> {
  const { data, error } = await supabase.rpc("get_permission_catalog");
  if (error) fail(error.message);
  return (data ?? []) as PermissionCatalogRecord[];
}

export async function ensureCompanyDefaultRoles(companyId: string) {
  const { error } = await supabase.rpc("ensure_company_default_roles", { p_company_id: companyId });
  if (error) fail(error.message);
}

export async function listCompanyRoles(companyId: string): Promise<CompanyRole[]> {
  const { data, error } = await supabase.rpc("get_company_roles", { p_company_id: companyId });
  if (error) fail(error.message);
  return (data ?? []) as CompanyRole[];
}

export async function getCompanyRolePermissions(roleId: string): Promise<CompanyRolePermission[]> {
  const { data, error } = await supabase.rpc("get_company_role_permissions", { p_role_id: roleId });
  if (error) fail(error.message);
  return (data ?? []) as CompanyRolePermission[];
}

export async function saveCompanyRole(payload: {
  id?: string | null;
  tenant_id: string;
  role_key?: string;
  role_name: string;
  description?: string;
  sort_order?: number;
  is_system?: boolean;
  permission_keys: string[];
}) {
  const { data, error } = await supabase.rpc("save_company_role", {
    p_payload: {
      id: payload.id ?? null,
      tenant_id: payload.tenant_id,
      role_key: payload.role_key ?? "",
      role_name: payload.role_name,
      description: payload.description ?? "",
      sort_order: payload.sort_order ?? 0,
      is_system: payload.is_system ?? false,
      permission_keys: payload.permission_keys
    }
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data?.[0] ?? null) as CompanyRole | null;
}

export async function deleteCompanyRole(roleId: string) {
  const { error } = await supabase.rpc("delete_company_role", { p_role_id: roleId });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
}
