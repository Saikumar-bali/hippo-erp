import { supabase } from "./supabase";

function fail(message: string): never {
  throw new Error(message);
}

export type CompanyUserRecord = {
  user_id: string;
  full_name: string;
  email: string;
  membership_role: string;
  is_active: boolean;
  assigned_role_id: string | null;
  assigned_role_key: string | null;
  assigned_role_name: string | null;
  assigned_role_is_system: boolean | null;
  effective_permission_keys: string[];
  effective_permission_count: number;
  active_assignment_count: number;
};

export type CompanyInviteRecord = {
  invite_id: string;
  full_name: string;
  email: string;
  membership_role: string;
  invite_status: string;
  company_role_id: string | null;
  company_role_name: string | null;
  invited_by_name: string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
};

export async function getCompanyUsers(companyId: string): Promise<CompanyUserRecord[]> {
  const { data, error } = await supabase.rpc("get_company_users", { p_company_id: companyId });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data ?? []) as CompanyUserRecord[];
}

export async function getCompanyInvites(companyId: string): Promise<CompanyInviteRecord[]> {
  const { data, error } = await supabase.rpc("get_company_invites", { p_company_id: companyId });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data ?? []) as CompanyInviteRecord[];
}

export async function setCompanyUserRole(payload: {
  companyId: string;
  userId: string;
  roleId: string | null;
}): Promise<CompanyUserRecord | null> {
  const { data, error } = await supabase.rpc("set_company_user_role", {
    p_company_id: payload.companyId,
    p_user_id: payload.userId,
    p_role_id: payload.roleId
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return (data?.[0] ?? null) as CompanyUserRecord | null;
}

export async function deactivateCompanyUser(companyId: string, userId: string) {
  const { data, error } = await supabase.rpc("deactivate_company_user", {
    p_company_id: companyId,
    p_user_id: userId
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return data;
}

export async function removeCompanyUser(companyId: string, userId: string) {
  const { data, error } = await supabase.rpc("remove_company_user", {
    p_company_id: companyId,
    p_user_id: userId
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return data;
}

export async function cancelCompanyInvite(companyId: string, email: string) {
  const { data, error } = await supabase.rpc("cancel_company_invite", {
    p_company_id: companyId,
    p_email: email
  });
  if (error) fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  return data;
}
