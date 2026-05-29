import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_MEMBERSHIP_ROLES = new Set([
  "owner",
  "admin",
  "warehouse_manager",
  "stock_operator",
  "viewer",
  "auditor",
]);

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (!supabaseUrl || !secretKeysRaw) {
    return json(500, { error: "Missing Supabase environment configuration." });
  }

  let serviceRoleKey = "";
  try {
    const secretKeys = JSON.parse(secretKeysRaw) as Record<string, string>;
    serviceRoleKey = secretKeys.default ?? Object.values(secretKeys)[0] ?? "";
  } catch {
    return json(500, { error: "Unable to read Supabase secret keys." });
  }

  if (!serviceRoleKey) {
    return json(500, { error: "Service role key is unavailable." });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(401, { error: "Missing Authorization header." });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return json(401, { error: "Missing bearer token." });
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data: callerAuth, error: callerAuthError } = await client.auth.getUser(token);
  if (callerAuthError || !callerAuth.user) {
    return json(401, { error: callerAuthError?.message ?? "Invalid session." });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json(400, { error: "Invalid request body." });
  }

  const companyId = String((body as Record<string, unknown>).companyId ?? "").trim();
  const email = String((body as Record<string, unknown>).email ?? "").trim().toLowerCase();
  const fullName = String((body as Record<string, unknown>).fullName ?? "").trim();
  const membershipRole = String((body as Record<string, unknown>).membershipRole ?? "").trim();
  const companyRoleId = String((body as Record<string, unknown>).companyRoleId ?? "").trim();
  const redirectTo = String((body as Record<string, unknown>).redirectTo ?? "").trim() || undefined;

  if (!companyId || !email || !fullName) {
    return json(400, { error: "companyId, email, and fullName are required." });
  }

  if (!ALLOWED_MEMBERSHIP_ROLES.has(membershipRole)) {
    return json(400, { error: "Invalid membership role." });
  }

  const { data: inviteData, error: inviteError } = await client.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName,
      membership_role: membershipRole,
    },
    redirectTo,
  });

  if (inviteError) {
    return json(400, { error: inviteError.message });
  }

  const invitedUser = inviteData.user;
  if (!invitedUser) {
    return json(500, { error: "Invite succeeded but no user was returned." });
  }

  const { data: pendingInvite, error: inviteRecordError } = await client.rpc("create_company_invite", {
    p_company_id: companyId,
    p_invited_by_user_id: callerAuth.user.id,
    p_full_name: fullName,
    p_email: email,
    p_membership_role: membershipRole,
    p_company_role_id: companyRoleId || null,
  });

  if (inviteRecordError) {
    return json(500, { error: inviteRecordError.message, details: inviteRecordError.details ?? null, hint: inviteRecordError.hint ?? null });
  }

  return json(200, {
    inviteSent: true,
    userId: invitedUser.id,
    email,
    companyId,
    membershipRole,
    companyRoleId: companyRoleId || null,
    pendingInvite,
  });
});
