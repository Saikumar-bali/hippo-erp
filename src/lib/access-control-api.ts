import { supabase } from "./supabase";
import type {
  AccessControlMatrixRow,
  AccessControlTarget,
  CompanyUserPermissionPayload,
  CompanyUserPermissionRule,
  DocTypeFieldAccessRecord,
  RoleDocTypePermlevelRow,
  UserRoleAssignmentRecord,
} from "./access-control";
import type { CompanyUserRecord } from "./users-api";

function fail(message: string): never {
  throw new Error(message);
}

export async function getAccessControlTargets(companyId: string): Promise<AccessControlTarget[]> {
  const { data, error } = await supabase.rpc("get_access_control_targets", { p_company_id: companyId });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data ?? []) as AccessControlTarget[];
}

export async function getAccessControlMatrix(companyId: string, roleId?: string | null, targetType?: string, targetKey?: string): Promise<AccessControlMatrixRow[]> {
  const { data, error } = await supabase.rpc("get_access_control_matrix", {
    p_company_id: companyId,
    p_role_id: roleId ?? null,
    p_target_type: targetType ?? null,
    p_target_key: targetKey ?? null,
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data ?? []) as AccessControlMatrixRow[];
}

export async function saveAccessControlMatrix(companyId: string, roleId: string, entries: Array<{
  target_type: string;
  target_key: string;
  right_key: string;
  permission_key: string;
  is_granted: boolean;
  workspace_key?: string | null;
}>): Promise<AccessControlMatrixRow[]> {
  const { data, error } = await supabase.rpc("save_access_control_matrix", {
    p_company_id: companyId,
    p_role_id: roleId,
    p_entries: entries,
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data ?? []) as AccessControlMatrixRow[];
}

export async function getCompanyUserRoleAssignments(companyId: string, userId: string): Promise<UserRoleAssignmentRecord[]> {
  const { data, error } = await supabase.rpc("get_company_user_role_assignments", {
    p_company_id: companyId,
    p_user_id: userId,
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data ?? []) as UserRoleAssignmentRecord[];
}

export async function setCompanyUserRoles(companyId: string, userId: string, roleIds: string[]): Promise<CompanyUserRecord | null> {
  const { data, error } = await supabase.rpc("set_company_user_roles", {
    p_company_id: companyId,
    p_user_id: userId,
    p_role_ids: roleIds,
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data?.[0] ?? null) as CompanyUserRecord | null;
}

export async function getCurrentUserDocTypeFieldAccess(companyId: string, doctypeKey: string): Promise<DocTypeFieldAccessRecord[]> {
  const { data, error } = await supabase.rpc("get_current_user_doctype_field_access", {
    p_company_id: companyId,
    p_doctype_key: doctypeKey,
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data ?? []) as DocTypeFieldAccessRecord[];
}

export async function getRoleDocTypePermlevelMatrix(companyId: string, roleId: string, doctypeKey: string, userId?: string | null): Promise<RoleDocTypePermlevelRow[]> {
  const { data, error } = await supabase.rpc("get_role_doctype_permlevel_matrix", {
    p_company_id: companyId,
    p_role_id: roleId,
    p_doctype_key: doctypeKey,
    p_user_id: userId ?? null,
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data ?? []) as RoleDocTypePermlevelRow[];
}

export async function saveRoleDocTypePermlevels(companyId: string, roleId: string, doctypeKey: string, rows: Array<{
  permlevel: number;
  can_read: boolean;
  can_write: boolean;
}>): Promise<RoleDocTypePermlevelRow[]> {
  const { data, error } = await supabase.rpc("save_role_doctype_permlevels", {
    p_company_id: companyId,
    p_role_id: roleId,
    p_doctype_key: doctypeKey,
    p_rows: rows,
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data ?? []) as RoleDocTypePermlevelRow[];
}

export async function getCompanyUserPermissions(companyId: string, userId: string): Promise<CompanyUserPermissionRule[]> {
  const { data, error } = await supabase.rpc("get_company_user_permissions", {
    p_company_id: companyId,
    p_user_id: userId,
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data ?? []) as CompanyUserPermissionRule[];
}

export async function saveCompanyUserPermission(companyId: string, payload: CompanyUserPermissionPayload): Promise<CompanyUserPermissionRule | null> {
  const { data, error } = await supabase.rpc("save_company_user_permission", {
    p_company_id: companyId,
    p_payload: payload,
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data?.[0] ?? null) as CompanyUserPermissionRule | null;
}
