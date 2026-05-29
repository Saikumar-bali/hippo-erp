import { supabase } from "./supabase";
import { getAuthRedirectUrl } from "./auth-redirect";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables for invite flow.");
}

export type InviteCompanyUserInput = {
  companyId: string;
  fullName: string;
  email: string;
  membershipRole: string;
  companyRoleId?: string | null;
};

type InviteCompanyUserResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  invite_status?: string;
  invite_id?: string;
};

export async function inviteCompanyUser(input: InviteCompanyUserInput) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Auth session missing. Please sign in again and retry the invite.");
  }

  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/invite-company-user-rpc`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...input,
      redirectTo: getAuthRedirectUrl(`/auth/callback?company_id=${encodeURIComponent(input.companyId)}`),
    }),
  });

  let data: InviteCompanyUserResponse | null = null;
  try {
    data = (await response.json()) as InviteCompanyUserResponse;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Invite request failed with status ${response.status}.`);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}
