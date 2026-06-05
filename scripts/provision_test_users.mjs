import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
const lowPrivEmail = process.env.PLAYWRIGHT_LOW_PRIV_EMAIL;
const lowPrivPassword = process.env.PLAYWRIGHT_LOW_PRIV_PASSWORD;

if (!supabaseUrl || !publishableKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.");
}

if (!adminEmail || !adminPassword || !lowPrivEmail || !lowPrivPassword) {
  throw new Error("Missing Playwright user environment variables.");
}

const serviceClient = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

function createAppClient() {
  return createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensureLowPrivUserExists() {
  const lowPrivClient = createAppClient();
  const existingLogin = await lowPrivClient.auth.signInWithPassword({
    email: lowPrivEmail,
    password: lowPrivPassword,
  });

  if (!existingLogin.error && existingLogin.data.user) {
    await lowPrivClient.auth.signOut();
    return existingLogin.data.user;
  }

  if (!serviceClient) {
    const signedUp = await lowPrivClient.auth.signUp({
      email: lowPrivEmail,
      password: lowPrivPassword,
    });
    if (signedUp.error) {
      throw signedUp.error;
    }
    if (!signedUp.data.user) {
      throw new Error("Low-privilege user could not be created through public sign-up.");
    }
    if (signedUp.data.session) {
      await lowPrivClient.auth.signOut();
    }
    return signedUp.data.user;
  }

  const created = await serviceClient.auth.admin.createUser({
    email: lowPrivEmail,
    password: lowPrivPassword,
    email_confirm: true,
  });
  if (created.error) {
    throw created.error;
  }
  return created.data.user;
}

async function loginAsAdmin() {
  const adminClient = createAppClient();
  const { data, error } = await adminClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (error || !data.user) {
    throw error ?? new Error("Unable to sign in as the admin Playwright user.");
  }
  return { adminClient, adminUser: data.user };
}

async function getAdminCompanyId(adminClient) {
  const { data, error } = await adminClient.rpc("get_my_companies");
  if (error) throw error;
  const companies = Array.isArray(data) ? data : [];
  const company = companies.find((item) => ["owner", "admin"].includes(String(item.role ?? "").toLowerCase()));
  if (!company?.id) {
    throw new Error("Admin test user is not an active owner/admin of any company.");
  }
  return company.id;
}

async function ensureInvite(adminClient, adminUserId, companyId) {
  const { error } = await adminClient.rpc("create_company_invite", {
    p_company_id: companyId,
    p_invited_by_user_id: adminUserId,
    p_full_name: "Phase 6.4 Low Priv",
    p_email: lowPrivEmail,
    p_membership_role: "viewer",
    p_company_role_id: null,
  });
  if (error) throw error;
}

async function acceptInvite(companyId) {
  const lowPrivClient = createAppClient();
  const { data: authData, error: loginError } = await lowPrivClient.auth.signInWithPassword({
    email: lowPrivEmail,
    password: lowPrivPassword,
  });
  if (loginError || !authData.user) {
    throw loginError ?? new Error("Unable to sign in as the low-privilege Playwright user.");
  }

  const { error: acceptError } = await lowPrivClient.rpc("accept_company_invite", {
    p_company_id: companyId,
  });
  if (acceptError && !acceptError.message.toLowerCase().includes("no pending invitation found")) {
    throw acceptError;
  }

  await lowPrivClient.auth.signOut();
  return authData.user;
}

const lowPrivUser = await ensureLowPrivUserExists();
const { adminClient, adminUser } = await loginAsAdmin();
const companyId = await getAdminCompanyId(adminClient);
await ensureInvite(adminClient, adminUser.id, companyId);
await adminClient.auth.signOut();
await acceptInvite(companyId);

console.log(JSON.stringify({
  ok: true,
  companyId,
  adminUserId: adminUser.id,
  lowPrivUserId: lowPrivUser.id,
}, null, 2));
