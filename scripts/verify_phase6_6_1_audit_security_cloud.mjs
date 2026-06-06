import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = process.env.PLAYWRIGHT_RESULTS_DIR || "C:/tmp/phase-6-6-1-audit-security";
await fs.mkdir(outDir, { recursive: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
const lowEmail = process.env.PLAYWRIGHT_LOW_PRIV_EMAIL;
const lowPassword = process.env.PLAYWRIGHT_LOW_PRIV_PASSWORD;

if (!supabaseUrl || !publishableKey || !adminEmail || !adminPassword || !lowEmail || !lowPassword) {
  console.error("Missing env vars: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_TEST_PASSWORD, PLAYWRIGHT_LOW_PRIV_EMAIL, PLAYWRIGHT_LOW_PRIV_PASSWORD");
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

// 1a. erp_mask_audit_changes RPC exists
try {
  const rpcCheck = await execSql(
    "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'erp_mask_audit_changes'"
  );
  assert(rpcCheck.length > 0, "erp_mask_audit_changes_exists", "Helper RPC exists");
} catch (e) {
  fail("erp_mask_audit_changes_exists", e.message);
}

// 1b. erp_list_document_audit_events uses erp_mask_audit_changes (check source)
try {
  const srcCheck = await execSql(
    `SELECT prosrc FROM pg_proc WHERE proname = 'erp_list_document_audit_events' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`
  );
  const src = srcCheck[0]?.prosrc ?? "";
  assert(src.includes("erp_mask_audit_changes"), "audit_events_uses_mask", "Audit events RPC calls erp_mask_audit_changes");
  assert(src.includes("document_matches_user_permission_rules"), "audit_events_checks_record_permission", "Audit events RPC checks document_matches_user_permission_rules");
} catch (e) {
  fail("audit_events_uses_mask", e.message);
}

// 1c. erp_list_document_versions uses filter_document_data_by_user_access
try {
  const srcCheck = await execSql(
    `SELECT prosrc FROM pg_proc WHERE proname = 'erp_list_document_versions' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`
  );
  const src = srcCheck[0]?.prosrc ?? "";
  assert(src.includes("filter_document_data_by_user_access"), "versions_uses_filter", "Versions RPC calls filter_document_data_by_user_access");
  assert(src.includes("document_matches_user_permission_rules"), "versions_checks_record_permission", "Versions RPC checks document_matches_user_permission_rules");
} catch (e) {
  fail("versions_uses_filter", e.message);
}

// 1d. erp_get_document_version_diff uses filter_document_data_by_user_access
try {
  const srcCheck = await execSql(
    `SELECT prosrc FROM pg_proc WHERE proname = 'erp_get_document_version_diff' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`
  );
  const src = srcCheck[0]?.prosrc ?? "";
  assert(src.includes("filter_document_data_by_user_access"), "diff_uses_filter", "Diff RPC calls filter_document_data_by_user_access");
  assert(src.includes("document_matches_user_permission_rules"), "diff_checks_record_permission", "Diff RPC checks document_matches_user_permission_rules");
} catch (e) {
  fail("diff_uses_filter", e.message);
}

// --- Phase 2: Authenticated RPC smoke test (admin full access) ---
console.log("\n=== Phase 2: Admin smoke test (full access) ===");

const adminClient = createClient(supabaseUrl, publishableKey);
const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});

if (signInError) {
  fail("admin_sign_in", signInError.message);
} else {
  pass("admin_sign_in", `Signed in as ${adminEmail}`);
}

// Get company_id
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

// 2a. Create a CRM Lead
let testDocId = null;
try {
  const { data, error } = await adminClient.rpc("erp_create_document", {
    p_doctype_key: "crm_lead",
    p_company_id: companyId,
    p_data: {
      lead_name: "Phase 6.6.1 Security Test Lead",
      company_name: "Security Test Corp",
      status: "new",
      source: "website",
      email: "security661@example.com",
      phone: "+1999888777",
      notes: "Phase 6.6.1 security test",
    },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Create failed");
  testDocId = data.document_id;
  pass("create_test_document", `Created test lead: ${testDocId}`);
} catch (e) {
  fail("create_test_document", e.message);
}

// 2b. Update the lead (to create a diff)
if (testDocId) {
  try {
    const { data, error } = await adminClient.rpc("erp_update_document", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
      p_data: { status: "contacted", notes: "Updated for security test" },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Update failed");
    pass("update_test_document", "Updated test lead");
  } catch (e) {
    fail("update_test_document", e.message);
  }
}

// 2c. Admin can read all audit events (including level-1 fields)
if (testDocId) {
  try {
    const { data: auditData, error: auditError } = await adminClient.rpc("erp_list_document_audit_events", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
    });
    if (auditError) throw auditError;
    const events = auditData?.data ?? [];
    assert(events.length >= 2, "admin_audit_events_count", `Admin sees ${events.length} events (>=2)`);
    // Admin should see level-1 fields (email, phone, notes) in create event
    const createEvent = events.find((e) => e.action === "create");
    const createData = createEvent?.changes?.data;
    assert(!!createData?.email, "admin_sees_level1_email", "Admin sees email in create event");
    assert(!!createData?.phone, "admin_sees_level1_phone", "Admin sees phone in create event");
    assert(!!createData?.notes, "admin_sees_level1_notes", "Admin sees notes in create event");
  } catch (e) {
    fail("admin_audit_events", e.message);
  }
}

// 2d. Admin can read all versions (including level-1 fields)
if (testDocId) {
  try {
    const { data: verData, error: verError } = await adminClient.rpc("erp_list_document_versions", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
    });
    if (verError) throw verError;
    const vers = verData?.data ?? [];
    assert(vers.length >= 2, "admin_versions_count", `Admin sees ${vers.length} versions (>=2)`);
    const latestVer = vers[0];
    assert(!!latestVer?.data?.email, "admin_version_sees_level1_email", "Admin sees email in version data");
    assert(!!latestVer?.data?.phone, "admin_version_sees_level1_phone", "Admin sees phone in version data");
  } catch (e) {
    fail("admin_versions", e.message);
  }
}

// 2e. Admin can read version diff (including level-1 fields)
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
    assert(diffData?.ok === true, "admin_diff_ok", "Admin diff returned ok");
    const diff = diffData?.diff ?? {};
    // Admin should see all changed fields including level-1
    assert("status" in diff || "notes" in diff, "admin_diff_has_fields", `Admin sees diff fields: ${Object.keys(diff).join(", ")}`);
  } catch (e) {
    fail("admin_diff", e.message);
  }
}

// --- Phase 3: Low-privilege user test (permlevel masking) ---
console.log("\n=== Phase 3: Low-privilege user test (permlevel masking) ===");

const lowClient = createClient(supabaseUrl, publishableKey);
const { data: lowSignInData, error: lowSignInError } = await lowClient.auth.signInWithPassword({
  email: lowEmail,
  password: lowPassword,
});

if (lowSignInError) {
  fail("low_priv_sign_in", lowSignInError.message);
} else {
  pass("low_priv_sign_in", `Signed in as ${lowEmail}`);
}

// 3a. Low-priv user can read audit events (with masked level-1 fields)
if (testDocId) {
  try {
    const { data: auditData, error: auditError } = await lowClient.rpc("erp_list_document_audit_events", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
    });
    if (auditError) throw auditError;
    const events = auditData?.data ?? [];
    assert(events.length >= 1, "low_priv_audit_events_count", `Low-priv sees ${events.length} events`);

    // Check that level-1 fields are masked in create event
    const createEvent = events.find((e) => e.action === "create");
    if (createEvent?.changes?.data) {
      const createData = createEvent.changes.data;
      // Level-1 fields (email, phone, notes) should be absent or masked
      const hasLevel1 = createData.email || createData.phone || createData.notes;
      assert(!hasLevel1, "low_priv_audit_masked_level1", "Level-1 fields masked in audit events for low-priv user");
    }

    // Check that level-1 fields are masked in update diff
    const updateEvent = events.find((e) => e.action === "update");
    if (updateEvent?.changes?.diff) {
      const diff = updateEvent.changes.diff;
      // 'notes' is level-1, should not appear in diff for low-priv user
      assert(!("notes" in diff), "low_priv_audit_masked_diff_notes", "Level-1 'notes' masked in update diff");
    }
  } catch (e) {
    fail("low_priv_audit_events", e.message);
  }
}

// 3b. Low-priv user can read versions (with masked level-1 fields)
if (testDocId) {
  try {
    const { data: verData, error: verError } = await lowClient.rpc("erp_list_document_versions", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
    });
    if (verError) throw verError;
    const vers = verData?.data ?? [];
    assert(vers.length >= 1, "low_priv_versions_count", `Low-priv sees ${vers.length} versions`);

    const latestVer = vers[0];
    if (latestVer?.data) {
      // Level-1 fields should be absent
      const hasLevel1 = latestVer.data.email || latestVer.data.phone || latestVer.data.notes;
      assert(!hasLevel1, "low_priv_versions_masked_level1", "Level-1 fields masked in version data for low-priv user");
    }
  } catch (e) {
    fail("low_priv_versions", e.message);
  }
}

// 3c. Low-priv user can read version diff (with masked level-1 fields)
if (testDocId) {
  try {
    const { data: diffData, error: diffError } = await lowClient.rpc("erp_get_document_version_diff", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
      p_version_from: 1,
      p_version_to: 2,
    });
    if (diffError) throw diffError;
    assert(diffData?.ok === true, "low_priv_diff_ok", "Low-priv diff returned ok");

    const diff = diffData?.diff ?? {};
    // Level-1 fields should not appear in diff
    assert(!("notes" in diff), "low_priv_diff_masked_notes", "Level-1 'notes' masked in diff");
    assert(!("email" in diff), "low_priv_diff_masked_email", "Level-1 'email' masked in diff");
    assert(!("phone" in diff), "low_priv_diff_masked_phone", "Level-1 'phone' masked in diff");
  } catch (e) {
    fail("low_priv_diff", e.message);
  }
}

// 3d. Low-priv user version data_from and data_to are masked
if (testDocId) {
  try {
    const { data: diffData, error: diffError } = await lowClient.rpc("erp_get_document_version_diff", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
      p_version_from: 1,
      p_version_to: 2,
    });
    if (diffError) throw diffError;
    const dataFrom = diffData?.data_from ?? {};
    const dataTo = diffData?.data_to ?? {};
    assert(!dataFrom.email, "low_priv_diff_data_from_masked", "data_from level-1 email masked");
    assert(!dataTo.email, "low_priv_diff_data_to_masked", "data_to level-1 email masked");
  } catch (e) {
    fail("low_priv_diff_data_masking", e.message);
  }
}

// --- Phase 4: Cleanup ---
console.log("\n=== Phase 4: Cleanup ===");

if (testDocId) {
  try {
    const { data, error } = await adminClient.rpc("erp_deactivate_document", {
      p_doctype_key: "crm_lead",
      p_document_id: testDocId,
      p_company_id: companyId,
    });
    if (error) throw error;
    pass("cleanup_deactivate", `Deactivated test lead ${testDocId}`);
  } catch (e) {
    fail("cleanup_deactivate", e.message);
  }
}

// --- Phase 5: Save results ---
console.log("\n=== Phase 5: Results ===");

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
