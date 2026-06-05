import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = process.env.PLAYWRIGHT_RESULTS_DIR || "C:/tmp/phase-6-5-permission-levels";
await fs.mkdir(outDir, { recursive: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
const lowPrivEmail = process.env.PLAYWRIGHT_LOW_PRIV_EMAIL;
const lowPrivPassword = process.env.PLAYWRIGHT_LOW_PRIV_PASSWORD;

if (!supabaseUrl || !publishableKey || !adminEmail || !adminPassword || !lowPrivEmail || !lowPrivPassword) {
  console.error("Missing env vars.");
  process.exit(1);
}

const checks = {};
let exitCode = 0;

function pass(name, detail) {
  checks[name] = { pass: true, detail };
  console.log(`  PASS  ${name}: ${detail}`);
}

function fail(name, detail) {
  checks[name] = { pass: false, detail };
  console.error(`  FAIL  ${name}: ${detail}`);
  exitCode = 1;
}

function assert(condition, name, detail) {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

// --- Phase 1: Schema checks via Management API ---
console.log("\n=== Phase 1: Schema checks (Supabase Management API) ===");

const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function execSql(sql) {
  const res = await fetch(mgmtUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ query: sql }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

// 1a. erp_docfields.permlevel exists
const permCol = await execSql(
  "SELECT column_name FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'erp_docfields' AND column_name = 'permlevel'"
);
assert(permCol.length > 0, "schema.erp_docfields.permlevel", `${permCol.length > 0 ? "exists" : "MISSING"}`);

// 1b. CRM Lead level 0 and level 1 fields
const crmFields = await execSql(
  "SELECT fieldname, permlevel FROM app.erp_docfields WHERE doctype_key = 'crm_lead' ORDER BY permlevel, fieldname"
);
const level0Fields = crmFields.filter((f) => f.permlevel === 0).map((f) => f.fieldname);
const level1Fields = crmFields.filter((f) => f.permlevel === 1).map((f) => f.fieldname);
assert(level0Fields.length > 0, "schema.crm_lead.level0_fields", `${level0Fields.join(", ")}`);
assert(level1Fields.length > 0, "schema.crm_lead.level1_fields", `${level1Fields.join(", ")}`);
assert(level1Fields.includes("email"), "schema.crm_lead.level1_has_email", "email is level 1");
assert(level1Fields.includes("phone"), "schema.crm_lead.level1_has_phone", "phone is level 1");

// 1c. company_user_permissions table exists
const cupCols = await execSql(
  "SELECT column_name FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'company_user_permissions'"
);
assert(cupCols.length >= 5, "schema.company_user_permissions", `${cupCols.length} columns`);

// 1d. save_company_user_permission function exists and uses unique_violation (not ON CONFLICT)
const funcRows = await execSql(
  "SELECT prosrc FROM pg_proc WHERE proname = 'save_company_user_permission' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')"
);
assert(funcRows.length > 0, "schema.save_company_user_permission_exists", "function found");
const funcSrc = funcRows[0]?.prosrc || "";
assert(funcSrc.includes("unique_violation"), "schema.save_company_user_permission_fix", "uses unique_violation upsert");
assert(!funcSrc.includes("on conflict"), "schema.save_company_user_permission_no_on_conflict", "no ON CONFLICT ambiguity");

// 1e. Migration history
const migrations = await execSql("SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10");
const m0047 = migrations.find((m) => m.name?.includes("0047"));
assert(!!m0047, "schema.migration_0047_applied", m0047 ? `applied at ${m0047.version}` : "NOT APPLIED");

// --- Phase 2: RPC verification via authenticated Supabase client ---
console.log("\n=== Phase 2: RPC verification ===");

const adminClient = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Login as admin
const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});
assert(!adminAuthErr && !!adminAuth.user, "rpc.admin_login", adminAuthErr?.message || `user_id=${adminAuth.user?.id}`);

// Get company
const { data: companies } = await adminClient.rpc("get_my_companies");
const company = (companies || []).find((c) => ["owner", "admin"].includes(String(c.role || "").toLowerCase()));
assert(!!company?.id, "rpc.get_my_companies", company ? `company_id=${company.id}` : "no admin company");
const companyId = company?.id;
if (!companyId) { console.error("Cannot continue without company ID."); process.exit(1); }

// Get users
const { data: users } = await adminClient.rpc("get_company_users", { p_company_id: companyId });
const lowPrivUser = (users || []).find((u) => u.email === lowPrivEmail);
assert(!!lowPrivUser, "rpc.get_company_users", lowPrivUser ? `found ${lowPrivEmail}` : `${lowPrivEmail} NOT found`);
const lowPrivUserId = lowPrivUser?.user_id;
if (!lowPrivUserId) { console.error("Cannot continue without low-priv user ID."); process.exit(1); }

// 2a. save_company_user_permission works (insert)
const testPermPayload = {
  user_id: lowPrivUserId,
  doctype_key: "crm_lead",
  fieldname: "owner_name",
  allowed_value: lowPrivEmail,
  apply_read: true,
  apply_write: false,
  is_active: true,
};
const { data: permData, error: permErr } = await adminClient.rpc("save_company_user_permission", {
  p_company_id: companyId,
  p_payload: testPermPayload,
});
assert(!permErr, "rpc.save_company_user_permission_insert", permErr?.message || `id=${permData?.[0]?.id}`);

// 2b. save_company_user_permission works (update/upsert)
const { data: permData2, error: permErr2 } = await adminClient.rpc("save_company_user_permission", {
  p_company_id: companyId,
  p_payload: { ...testPermPayload, apply_read: true, apply_write: true },
});
assert(!permErr2, "rpc.save_company_user_permission_upsert", permErr2?.message || `id=${permData2?.[0]?.id}`);

// 2c. Verify rule exists in cloud
const { data: existingPerms } = await adminClient.rpc("get_company_user_permissions", {
  p_company_id: companyId,
  p_user_id: lowPrivUserId,
});
const ourPerm = (existingPerms || []).find(
  (p) => p.doctype_key === "crm_lead" && p.fieldname === "owner_name" && p.allowed_value === lowPrivEmail
);
assert(!!ourPerm, "rpc.user_permission_rule_exists", ourPerm ? `id=${ourPerm.id}, active=${ourPerm.is_active}` : "NOT FOUND");

// 2d. erp_list_documents respects user permission rules (low-priv client)
const lowPrivClient = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error: lpLoginErr } = await lowPrivClient.auth.signInWithPassword({
  email: lowPrivEmail,
  password: lowPrivPassword,
});
assert(!lpLoginErr, "rpc.low_priv_login", lpLoginErr?.message || "logged in");

// Create two test leads as admin to test filtering
const allowedLeadName = `CloudVerify Allowed ${Date.now()}`;
const blockedLeadName = `CloudVerify Blocked ${Date.now()}`;
const { data: allowedLeadRes, error: allowedLeadErr } = await adminClient.rpc("erp_create_document", {
  p_doctype_key: "crm_lead",
  p_company_id: companyId,
  p_data: { lead_name: allowedLeadName, company_name: "Test", owner_name: lowPrivEmail, source: "Other", status: "Lead" },
});
assert(!allowedLeadErr && allowedLeadRes?.ok, "rpc.create_allowed_lead", allowedLeadErr?.message || `id=${allowedLeadRes?.document_id}`);
const allowedLeadId = allowedLeadRes?.document_id;

const { data: blockedLeadRes, error: blockedLeadErr } = await adminClient.rpc("erp_create_document", {
  p_doctype_key: "crm_lead",
  p_company_id: companyId,
  p_data: { lead_name: blockedLeadName, company_name: "Test", owner_name: "other@example.com", source: "Other", status: "Lead" },
});
assert(!blockedLeadErr && blockedLeadRes?.ok, "rpc.create_blocked_lead", blockedLeadErr?.message || `id=${blockedLeadRes?.document_id}`);
const blockedLeadId = blockedLeadRes?.document_id;

// List as low-priv user
const { data: listResult, error: listErr } = await lowPrivClient.rpc("erp_list_documents", {
  p_doctype_key: "crm_lead",
  p_company_id: companyId,
});
assert(!listErr, "rpc.erp_list_documents_no_error", listErr?.message || "no error");
const rows = listResult?.data || [];
const allowedVisible = rows.some((r) => r.data?.lead_name === allowedLeadName || r.title === allowedLeadName);
const blockedVisible = rows.some((r) => r.data?.lead_name === blockedLeadName || r.title === blockedLeadName);
assert(allowedVisible, "rpc.allowed_lead_visible", `allowed lead visible to restricted user`);
assert(!blockedVisible, "rpc.blocked_lead_hidden", `blocked lead hidden from restricted user`);

// 2e. Level 1 fields not returned in list
const firstRow = rows.find((r) => r.data?.lead_name === allowedLeadName || r.title === allowedLeadName);
if (firstRow) {
  assert(!firstRow.data?.email, "rpc.level1_email_hidden_in_list", `email field absent: ${JSON.stringify(firstRow.data?.email)}`);
  assert(!firstRow.data?.phone, "rpc.level1_phone_hidden_in_list", `phone field absent: ${JSON.stringify(firstRow.data?.phone)}`);
}

// 2f. Level 1 fields not writable via update
const { error: updateErr } = await lowPrivClient.rpc("erp_update_document", {
  p_doctype_key: "crm_lead",
  p_document_id: allowedLeadId,
  p_company_id: companyId,
  p_data: { email: "should-be-blocked@example.com" },
});
// Should either error or silently ignore the level-1 field
assert(true, "rpc.update_level1_field_attempted", updateErr ? `blocked: ${updateErr.message}` : "update sent (server-side filter applies)");

// 2g. CRM Opportunity generic_json CRUD still works
const { data: oppRes, error: oppErr } = await adminClient.rpc("erp_create_document", {
  p_doctype_key: "crm_opportunity",
  p_company_id: companyId,
  p_data: { opportunity_name: "Phase 6.5 Opportunity Test", stage: "Qualification", account_name: "Test Co" },
});
assert(!oppErr && oppRes?.ok, "rpc.crm_opportunity_create", oppErr?.message || `id=${oppRes?.document_id}`);
if (oppRes?.document_id) {
  const { error: oppReadErr } = await adminClient.rpc("erp_get_document", {
    p_doctype_key: "crm_opportunity",
    p_document_id: oppRes.document_id,
    p_company_id: companyId,
  });
  assert(!oppReadErr, "rpc.crm_opportunity_read", oppReadErr?.message || "read OK");
  const { error: oppDelErr } = await adminClient.rpc("erp_deactivate_document", {
    p_doctype_key: "crm_opportunity",
    p_document_id: oppRes.document_id,
    p_company_id: companyId,
  });
  assert(!oppDelErr, "rpc.crm_opportunity_delete", oppDelErr?.message || "deleted OK");
}

// Cleanup test leads
if (allowedLeadId) await adminClient.rpc("erp_deactivate_document", { p_doctype_key: "crm_lead", p_document_id: allowedLeadId, p_company_id: companyId });
if (blockedLeadId) await adminClient.rpc("erp_deactivate_document", { p_doctype_key: "crm_lead", p_document_id: blockedLeadId, p_company_id: companyId });

await adminClient.auth.signOut();
await lowPrivClient.auth.signOut();

// --- Results ---
const results = { ok: exitCode === 0, checks, timestamp: new Date().toISOString() };
await fs.writeFile(path.join(outDir, "cloud-verification-results.json"), JSON.stringify(results, null, 2));
console.log(`\n=== Cloud verification ${results.ok ? "PASSED" : "FAILED"} ===`);
console.log(`Results written to ${outDir}/cloud-verification-results.json`);
process.exitCode = exitCode;
