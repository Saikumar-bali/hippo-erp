import { supabase } from "./supabase";
import type { AccessControlMatrixRow, AccessControlTarget, UserRoleAssignmentRecord } from "./access-control";
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
