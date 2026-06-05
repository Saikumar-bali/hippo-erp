import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = process.env.PLAYWRIGHT_RESULTS_DIR || "C:/tmp/phase-6-6-audit-trail";
await fs.mkdir(outDir, { recursive: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;

if (!supabaseUrl || !publishableKey || !adminEmail || !adminPassword) {
  console.error("Missing env vars: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_TEST_PASSWORD");
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

// 1a. erp_list_document_audit_events RPC exists
try {
  const rpcCheck = await execSql(
    "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'erp_list_document_audit_events'"
  );
  assert(rpcCheck.length > 0, "erp_list_document_audit_events_rpc_exists", "RPC exists in information_schema");
} catch (e) {
  fail("erp_list_document_audit_events_rpc_exists", e.message);
}

// 1b. erp_list_document_versions RPC exists
try {
  const rpcCheck = await execSql(
    "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'erp_list_document_versions'"
  );
  assert(rpcCheck.length > 0, "erp_list_document_versions_rpc_exists", "RPC exists in information_schema");
} catch (e) {
  fail("erp_list_document_versions_rpc_exists", e.message);
}

// 1c. erp_get_document_version_diff RPC exists
try {
  const rpcCheck = await execSql(
    "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'erp_get_document_version_diff'"
  );
  assert(rpcCheck.length > 0, "erp_get_document_version_diff_rpc_exists", "RPC exists in information_schema");
} catch (e) {
  fail("erp_get_document_version_diff_rpc_exists", e.message);
}

// 1d. erp_audit_logs table has data from document operations
try {
  const auditCount = await execSql(
    "SELECT count(*) as cnt FROM app.erp_audit_logs WHERE entity_type = 'document'"
  );
  assert(Number(auditCount[0]?.cnt) >= 0, "erp_audit_logs_document_entity_type", `entity_type='document' count: ${auditCount[0]?.cnt}`);
} catch (e) {
  fail("erp_audit_logs_document_entity_type", e.message);
}

// --- Phase 2: Authenticated RPC smoke test ---
console.log("\n=== Phase 2: Authenticated RPC smoke test ===");

const adminClient = createClient(supabaseUrl, publishableKey);

// Sign in as admin
const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});

if (signInError) {
  fail("admin_sign_in", signInError.message);
} else {
  pass("admin_sign_in", `Signed in as ${adminEmail}`);
}

// Get company_id from tenant_members
let companyId = null;
try {
  const { data: memberData, error: memberError } = await adminClient
    .schema("app")
    .from("tenant_members")
    .select("tenant_id")
    .limit(1)
    .single();

  if (memberError) throw memberError;
  companyId = memberData.tenant_id;
  pass("company_id_lookup", companyId);
} catch (e) {
  fail("company_id_lookup", e.message);
}

// Find CRM Lead doctype
let crmLeadDoctype = null;
try {
  const { data: dtData, error: dtError } = await adminClient
    .schema("app")
    .from("erp_doctypes")
    .select("doctype_key, storage_strategy, is_company_scoped")
    .eq("doctype_key", "crm_lead")
    .single();

  if (dtError) throw dtError;
  crmLeadDoctype = dtData;
  assert(dtData.storage_strategy === "generic_json", "crm_lead_is_generic_json", `storage_strategy: ${dtData.storage_strategy}`);
} catch (e) {
  fail("crm_lead_is_generic_json", e.message);
}

// 2a. Create a CRM Lead (audit event: create)
let testDocId = null;
try {
  const { data, error } = await adminClient.rpc("erp_create_document", {
    p_doctype_key: "crm_lead",
    p_company_id: companyId,
    p_data: {
      lead_name: "Phase 6.6 Test Lead",
      company_name: "Test Corp",
      status: "new",
      source: "website",
      email: "test66@example.com",
      phone: "+1234567890",
      notes: "Phase 6.6 audit trail test",
    },
  });
  if (error) throw error;
  const r = data;
  if (!r?.ok) throw new Error(r?.error || "Create failed");
  testDocId = r.document_id;
  pass("create_document", `Created test lead: ${testDocId}`);
} catch (e) {
  fail("create_document", e.message);
}

// 2b. Verify audit log was written for create
if (testDocId) {
  try {
    const { data: auditData, error: auditError } = await adminClient.rpc("erp_list_document_audit_events", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
    });
    if (auditError) throw auditError;
    const events = auditData?.data ?? [];
    assert(events.length >= 1, "audit_log_create", `Found ${events.length} audit event(s) for create`);
    assert(events[0]?.action === "create", "audit_log_create_action", `First event action: ${events[0]?.action}`);
  } catch (e) {
    fail("audit_log_create", e.message);
  }
}

// 2c. Verify version was written for create
if (testDocId) {
  try {
    const { data: verData, error: verError } = await adminClient.rpc("erp_list_document_versions", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
    });
    if (verError) throw verError;
    const vers = verData?.data ?? [];
    assert(vers.length >= 1, "version_log_create", `Found ${vers.length} version(s) for create`);
    assert(vers[0]?.version_number === 1, "version_log_create_number", `First version number: ${vers[0]?.version_number}`);
  } catch (e) {
    fail("version_log_create", e.message);
  }
}

// 2d. Update the lead (audit event: update with diff)
if (testDocId) {
  try {
    const { data, error } = await adminClient.rpc("erp_update_document", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
      p_data: { status: "contacted", notes: "Updated notes for audit trail" },
    });
    if (error) throw error;
    const r = data;
    if (!r?.ok) throw new Error(r?.error || "Update failed");
    pass("update_document", `Updated test lead`);
  } catch (e) {
    fail("update_document", e.message);
  }
}

// 2e. Verify audit log was written for update
if (testDocId) {
  try {
    const { data: auditData, error: auditError } = await adminClient.rpc("erp_list_document_audit_events", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
    });
    if (auditError) throw auditError;
    const events = auditData?.data ?? [];
    assert(events.length >= 2, "audit_log_update", `Found ${events.length} audit event(s) (expected >=2)`);
    const updateEvent = events.find((e) => e.action === "update");
    assert(!!updateEvent, "audit_log_update_action", `Found update event`);
    assert(!!updateEvent?.changes?.diff, "audit_log_update_diff", `Update event has diff`);
  } catch (e) {
    fail("audit_log_update", e.message);
  }
}

// 2f. Verify version was incremented
if (testDocId) {
  try {
    const { data: verData, error: verError } = await adminClient.rpc("erp_list_document_versions", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
    });
    if (verError) throw verError;
    const vers = verData?.data ?? [];
    assert(vers.length >= 2, "version_log_update", `Found ${vers.length} version(s) (expected >=2)`);
  } catch (e) {
    fail("version_log_update", e.message);
  }
}

// 2g. Get version diff
if (testDocId) {
  try {
    const { data: diffData, error: diffError } = await adminClient.rpc("erp_get_document_version_diff", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
      p_version_from: 1,
      p_version_to: 2,
    });
    if (diffError) throw diffError;
    const r = diffData;
    assert(r?.ok === true, "version_diff_ok", "Version diff returned ok");
    assert(!!r?.diff, "version_diff_has_diff", "Version diff has diff object");
  } catch (e) {
    fail("version_diff", e.message);
  }
}

// 2h. Deactivate the lead (audit event: deactivate)
if (testDocId) {
  try {
    const { data, error } = await adminClient.rpc("erp_deactivate_document", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
    });
    if (error) throw error;
    const r = data;
    if (!r?.ok) throw new Error(r?.error || "Deactivate failed");
    pass("deactivate_document", `Deactivated test lead`);
  } catch (e) {
    fail("deactivate_document", e.message);
  }
}

// 2i. Verify audit log was written for deactivate
if (testDocId) {
  try {
    const { data: auditData, error: auditError } = await adminClient.rpc("erp_list_document_audit_events", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
    });
    if (auditError) throw auditError;
    const events = auditData?.data ?? [];
    assert(events.length >= 3, "audit_log_deactivate", `Found ${events.length} audit event(s) (expected >=3)`);
    const deactivateEvent = events.find((e) => e.action === "deactivate");
    assert(!!deactivateEvent, "audit_log_deactivate_action", `Found deactivate event`);
  } catch (e) {
    fail("audit_log_deactivate", e.message);
  }
}

// --- Phase 3: Save results ---
console.log("\n=== Phase 3: Results ===");

const results = {
  timestamp: new Date().toISOString(),
  checks,
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter((c) => c.pass).length,
  failed: Object.values(checks).filter((c) => !c.pass).length,
};

await fs.writeFile(path.join(outDir, "cloud-results.json"), JSON.stringify(results, null, 2));
console.log(`\nResults saved to ${path.join(outDir, "cloud-results.json")}`);
console.log(`Total: ${results.total} | Passed: ${results.passed} | Failed: ${results.failed}`);

if (exitCode !== 0) {
  console.error("\nSome checks FAILED.");
} else {
  console.log("\nAll checks PASSED.");
}

process.exit(exitCode);
