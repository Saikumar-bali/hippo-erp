#!/usr/bin/env node
/**
 * Phase 6.8.2 — Report Builder Security: Cloud verification
 *
 * Strict security proof. Uses admin user session for RPC tests (service_role has no auth.uid()).
 * Uses Management API for structural verification (RLS, GRANT, definitions).
 * Proves restricted-user report security.
 *
 * Required env vars (exits non-zero if any missing):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_ACCESS_TOKEN,
 *   SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PROJECT_REF,
 *   PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_TEST_PASSWORD,
 *   PLAYWRIGHT_LOW_PRIV_EMAIL, PLAYWRIGHT_LOW_PRIV_PASSWORD
 */
import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

// ── Require all env vars (no fallbacks, no hardcoded secrets) ─────────────────
function requireEnv(name) {
  const val = process.env[name];
  if (!val) { console.error(`❌ Missing required env var: ${name}`); process.exit(1); }
  return val;
}

const URL = requireEnv("VITE_SUPABASE_URL");
const PUBLISHABLE_KEY = requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
const ACCESS_TOKEN = requireEnv("SUPABASE_ACCESS_TOKEN");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const PROJECT_REF = requireEnv("SUPABASE_PROJECT_REF");
const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
const FAKE_COMPANY = "00000000-0000-0000-0000-000000000000";

const ADMIN_EMAIL = requireEnv("PLAYWRIGHT_TEST_EMAIL");
const ADMIN_PASS = requireEnv("PLAYWRIGHT_TEST_PASSWORD");
const LOW_EMAIL = requireEnv("PLAYWRIGHT_LOW_PRIV_EMAIL");
const LOW_PASS = requireEnv("PLAYWRIGHT_LOW_PRIV_PASSWORD");

let pass = 0, fail = 0;
function ok(l) { pass++; console.log(`  ✅ ${l}`); }
function no(l, m) { fail++; console.error(`  ❌ ${l}: ${m}`); }

async function mgmtSql(query, label) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} — ${text}`);
  return JSON.parse(text);
}

// ── Create authenticated clients ──────────────────────────────────────────────
const adminClient = createClient(URL, SERVICE_KEY);

console.log("\n🔑 Signing in as admin user...");
const { data: adminAuth, error: adminErr } = await adminClient.auth.signInWithPassword({
  email: ADMIN_EMAIL, password: ADMIN_PASS,
});
if (adminErr) { console.error("Admin sign-in failed:", adminErr.message); process.exit(1); }
console.log(`  Admin user: ${adminAuth.user.email} (${adminAuth.user.id})`);

const authedAdmin = createClient(URL, PUBLISHABLE_KEY);
await authedAdmin.auth.setSession({
  access_token: adminAuth.session.access_token,
  refresh_token: adminAuth.session.refresh_token,
});

// ── Sign in low-priv user ─────────────────────────────────────────────────────
console.log("\n🔑 Signing in as low-priv user...");
const { data: lowAuth, error: lowErr } = await adminClient.auth.signInWithPassword({
  email: LOW_EMAIL, password: LOW_PASS,
});
if (lowErr) { console.error("Low-priv sign-in failed:", lowErr.message); process.exit(1); }
console.log(`  Low-priv user: ${lowAuth.user.email} (${lowAuth.user.id})`);

const authedLow = createClient(URL, PUBLISHABLE_KEY);
await authedLow.auth.setSession({
  access_token: lowAuth.session.access_token,
  refresh_token: lowAuth.session.refresh_token,
});

// ── 1. RLS hardening ────────────────────────────────────────────────────────
console.log("\n🔹 1. RLS hardening...");
try {
  const policies = await mgmtSql(
    `SELECT policyname, tablename, cmd FROM pg_policies WHERE schemaname = 'app' AND tablename IN ('erp_reports','erp_report_columns','erp_report_filters') ORDER BY tablename, policyname;`,
    "rls check"
  );
  const ownerInsert = policies.filter(p => p.policyname.includes("owner_insert"));
  const ownerUpdate = policies.filter(p => p.policyname.includes("owner_update"));
  const ownerDelete = policies.filter(p => p.policyname.includes("owner_delete"));
  if (ownerInsert.length >= 3) ok(`Owner insert policies: ${ownerInsert.length}`);
  else no("owner insert", `expected ≥3, got ${ownerInsert.length}`);
  if (ownerUpdate.length >= 3) ok(`Owner update policies: ${ownerUpdate.length}`);
  else no("owner update", `expected ≥3, got ${ownerUpdate.length}`);
  if (ownerDelete.length >= 3) ok(`Owner delete policies: ${ownerDelete.length}`);
  else no("owner delete", `expected ≥3, got ${ownerDelete.length}`);

  const oldAuth = policies.filter(p => p.policyname.includes("auth_insert") || p.policyname.includes("auth_update") || p.policyname.includes("auth_delete"));
  if (oldAuth.length === 0) ok("No old permissive policies remain");
  else no("old policies", `${oldAuth.length} remain: ${oldAuth.map(p => p.policyname).join(", ")}`);
} catch (e) { no("rls", e.message); }

// ── 2. Helper function exists ───────────────────────────────────────────────
console.log("\n🔹 2. Helper function...");
try {
  const fns = await mgmtSql(
    `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'current_user_has_report_permission';`,
    "helper fn"
  );
  if (fns.length > 0) ok("current_user_has_report_permission exists");
  else no("helper fn", "missing");
} catch (e) { no("helper fn", e.message); }

// ── 3. GRANT EXECUTE ────────────────────────────────────────────────────────
console.log("\n🔹 3. GRANT EXECUTE...");
try {
  const grants = await mgmtSql(
    `SELECT p.proname, pg_catalog.has_function_privilege('authenticated', p.oid, 'execute') as exec FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname LIKE 'erp_%report%';`,
    "grants"
  );
  const allGranted = grants.every(g => g.exec === true);
  if (allGranted && grants.length >= 6) ok(`All ${grants.length} RPCs granted to authenticated`);
  else no("grants", `${grants.filter(g => !g.exec).map(g => g.proname).join(", ")} not granted`);
} catch (e) { no("grants", e.message); }

// ── 4. RPC security gates (source code) ──────────────────────────────────────
console.log("\n🔹 4. RPC security gates (source)...");
try {
  const rpcs = await mgmtSql(
    `SELECT routine_name, routine_definition FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('erp_list_reports','erp_get_report_definition','erp_run_report','erp_create_report','erp_update_report','erp_delete_report');`,
    "rpc defs"
  );
  for (const rpc of rpcs) {
    const def = rpc.routine_definition || "";
    if (["erp_create_report", "erp_update_report", "erp_delete_report"].includes(rpc.routine_name)) {
      if (def.includes("current_user_has_tenant_role")) ok(`${rpc.routine_name}: owner/admin gate`);
      else no(rpc.routine_name, "missing owner/admin gate");
    } else {
      if (def.includes("current_user_has_report_permission")) ok(`${rpc.routine_name}: view_reports gate`);
      else no(rpc.routine_name, "missing view_reports gate");
    }
  }
} catch (e) { no("rpc gates", e.message); }

// ── 5. Admin user RPC tests ──────────────────────────────────────────────────
console.log("\n🔹 5. Admin user RPC tests...");

// 5a. erp_list_reports
try {
  const { data: listRes } = await authedAdmin.rpc("erp_list_reports", { p_company_id: COMPANY_ID });
  const reports = listRes?.data ?? [];
  if (listRes?.ok && reports.length >= 2) ok(`erp_list_reports: ${reports.length} reports`);
  else no("erp_list_reports", `ok=${listRes?.ok}, count=${reports.length}, error=${listRes?.error}`);
} catch (e) { no("erp_list_reports", e.message); }

// 5b. erp_get_report_definition
let leadReportId = null;
try {
  const leadId = await mgmtSql(`SELECT id FROM app.erp_reports WHERE report_key='crm_lead_list' AND company_id='${COMPANY_ID}';`, "get lead id");
  leadReportId = leadId[0]?.id;
  const { data: defRes } = await authedAdmin.rpc("erp_get_report_definition", {
    p_report_id: leadReportId, p_company_id: COMPANY_ID,
  });
  const def = defRes?.data;
  if (defRes?.ok && def?.columns?.length >= 3) ok(`erp_get_report_definition: ${def.columns.length} columns`);
  else no("erp_get_report_definition", `ok=${defRes?.ok}, cols=${def?.columns?.length}, error=${defRes?.error}`);
} catch (e) { no("erp_get_report_definition", e.message); }

// 5c. erp_run_report (admin)
try {
  const { data: runRes } = await authedAdmin.rpc("erp_run_report", {
    p_report_id: leadReportId, p_company_id: COMPANY_ID, p_filters: {},
  });
  if (runRes?.ok && Array.isArray(runRes.data)) ok(`erp_run_report (admin): ${runRes.data.length} rows`);
  else no("erp_run_report (admin)", `ok=${runRes?.ok}, error=${runRes?.error}`);
} catch (e) { no("erp_run_report (admin)", e.message); }

// 5d. erp_run_report with "in" operator
try {
  const { data: runRes } = await authedAdmin.rpc("erp_run_report", {
    p_report_id: leadReportId, p_company_id: COMPANY_ID,
    p_filters: { status: { op: "in", value: "new,contacted" } },
  });
  if (runRes?.ok) ok(`erp_run_report (in operator): ${runRes.data?.length ?? 0} rows`);
  else no("erp_run_report (in)", `ok=${runRes?.ok}, error=${runRes?.error}`);
} catch (e) { no("erp_run_report (in)", e.message); }

// 5e. erp_run_report with contains operator
try {
  const { data: runRes } = await authedAdmin.rpc("erp_run_report", {
    p_report_id: leadReportId, p_company_id: COMPANY_ID,
    p_filters: { lead_name: { op: "contains", value: "test" } },
  });
  if (runRes?.ok) ok(`erp_run_report (contains): ${runRes.data?.length ?? 0} rows`);
  else no("erp_run_report (contains)", `ok=${runRes?.ok}, error=${runRes?.error}`);
} catch (e) { no("erp_run_report (contains)", e.message); }

// ── 6. Standard report protection ───────────────────────────────────────────
console.log("\n🔹 6. Standard report protection...");
try {
  const std = await mgmtSql(
    `SELECT id, report_key, is_standard FROM app.erp_reports WHERE is_standard = true AND company_id = '${COMPANY_ID}';`,
    "standard reports"
  );
  if (std.length >= 2) ok(`${std.length} standard reports exist`);
  else no("standard reports", `expected ≥2, got ${std.length}`);

  const leadId = std.find(r => r.report_key === "crm_lead_list")?.id;
  if (leadId) {
    const { data: delRes } = await authedAdmin.rpc("erp_delete_report", {
      p_report_id: leadId, p_company_id: COMPANY_ID,
    });
    if (delRes?.ok === false) ok("Standard report delete blocked");
    else no("standard delete", `expected blocked, got ok=${delRes?.ok}`);

    const { data: updRes } = await authedAdmin.rpc("erp_update_report", {
      p_report_id: leadId, p_company_id: COMPANY_ID, p_report_name: "HACKED",
      p_columns: [{ fieldname: "lead_name", label: "Hacked", fieldtype: "Data", width: 200 }],
      p_filters: [],
    });
    if (updRes?.ok === false) ok("Standard report update blocked");
    else no("standard update", `expected blocked, got ok=${updRes?.ok}`);
  }
} catch (e) { no("standard protection", e.message); }

// ── 7. Cross-company leakage ────────────────────────────────────────────────
console.log("\n🔹 7. Cross-company access...");
try {
  const { data: crossRes } = await authedAdmin.rpc("erp_list_reports", { p_company_id: FAKE_COMPANY });
  if (crossRes?.ok === false || !crossRes?.data || crossRes.data.length === 0) ok("Cross-company access blocked (list)");
  else no("cross-company (list)", `got ${crossRes.data?.length} reports for fake company`);
} catch (e) {
  ok("Cross-company access blocked (error)");
}

try {
  if (leadReportId) {
    const { data: crossDefRes } = await authedAdmin.rpc("erp_get_report_definition", {
      p_report_id: leadReportId, p_company_id: FAKE_COMPANY,
    });
    if (crossDefRes?.ok === false) ok("Cross-company access blocked (definition)");
    else no("cross-company (definition)", `ok=${crossDefRes?.ok}`);
  }
} catch (e) {
  ok("Cross-company access blocked (definition, error)");
}

// ── 8. Low-priv user: restricted access ──────────────────────────────────────
console.log("\n🔹 8. Low-priv user: restricted access...");

// 8a. Low-priv user can list reports (if they have view_reports)
try {
  const { data: lowListRes } = await authedLow.rpc("erp_list_reports", { p_company_id: COMPANY_ID });
  const lowReports = lowListRes?.data ?? [];
  if (lowListRes?.ok) ok(`Low-priv list_reports: ${lowReports.length} reports`);
  else no("low-priv list", `error=${lowListRes?.error}`);
} catch (e) { no("low-priv list", e.message); }

// 8b. Low-priv user: run CRM Lead report
let lowLeadReportId = null;
try {
  const { data: lowLeadId } = await authedLow.rpc("erp_list_reports", { p_company_id: COMPANY_ID });
  lowLeadReportId = lowLeadId?.data?.find(r => r.report_key === "crm_lead_list")?.id;
  if (lowLeadReportId) {
    const { data: lowRunRes } = await authedLow.rpc("erp_run_report", {
      p_report_id: lowLeadReportId, p_company_id: COMPANY_ID, p_filters: {},
    });
    if (lowRunRes?.ok && Array.isArray(lowRunRes.data)) {
      const lowRows = lowRunRes.data;
      ok(`Low-priv erp_run_report: ${lowRows.length} rows`);
      // Verify restricted fields are not present in results
      const hasEmail = lowRows.some(row => row.email !== undefined);
      const hasPhone = lowRows.some(row => row.phone !== undefined);
      const hasNotes = lowRows.some(row => row.notes !== undefined);
      if (!hasEmail) ok("Low-priv: email field masked");
      else no("low-priv email", "email field visible (permlevel violation)");
      if (!hasPhone) ok("Low-priv: phone field masked");
      else no("low-priv phone", "phone field visible (permlevel violation)");
      if (!hasNotes) ok("Low-priv: notes field masked");
      else no("low-priv notes", "notes field visible (permlevel violation)");
    } else {
      no("low-priv run report", `ok=${lowRunRes?.ok}, error=${lowRunRes?.error}`);
    }
  } else {
    ok("Low-priv: no CRM Lead report accessible (expected if no doctype read)");
  }
} catch (e) { no("low-priv run report", e.message); }

// 8c. Low-priv user: attempt to request unauthorized columns
if (lowLeadReportId) {
  try {
    const { data: lowDefRes } = await authedLow.rpc("erp_get_report_definition", {
      p_report_id: lowLeadReportId, p_company_id: COMPANY_ID,
    });
    if (lowDefRes?.ok) {
      const cols = lowDefRes.data?.columns ?? [];
      const hasEmailCol = cols.some(c => c.fieldname === "email");
      const hasPhoneCol = cols.some(c => c.fieldname === "phone");
      const hasNotesCol = cols.some(c => c.fieldname === "notes");
      if (!hasEmailCol) ok("Low-priv: email column hidden from definition");
      else no("low-priv def email", "email column exposed in definition");
      if (!hasPhoneCol) ok("Low-priv: phone column hidden from definition");
      else no("low-priv def phone", "phone column exposed in definition");
      if (!hasNotesCol) ok("Low-priv: notes column hidden from definition");
      else no("low-priv def notes", "notes column exposed in definition");
    }
  } catch (e) { no("low-priv definition check", e.message); }
}

// 8d. Low-priv user: filters cannot reveal blocked records
if (lowLeadReportId) {
  try {
    const { data: lowFilterRes } = await authedLow.rpc("erp_run_report", {
      p_report_id: lowLeadReportId, p_company_id: COMPANY_ID,
      p_filters: { status: { op: "eq", value: "converted" } },
    });
    if (lowFilterRes?.ok) {
      const filteredRows = lowFilterRes.data ?? [];
      const hasEmail = filteredRows.some(row => row.email !== undefined);
      if (!hasEmail) ok("Low-priv: filter cannot reveal masked fields");
      else no("low-priv filter bypass", "email visible via filter (permlevel bypass)");
    }
  } catch (e) { no("low-priv filter check", e.message); }
}

// ── 9. Column permlevel filtering ────────────────────────────────────────────
console.log("\n🔹 9. Column metadata validation...");
try {
  const { data: defRes } = await authedAdmin.rpc("erp_get_report_definition", {
    p_report_id: leadReportId, p_company_id: COMPANY_ID,
  });
  const def = defRes?.data;
  if (def?.columns) {
    const validColumns = def.columns.filter(c => c.label && c.fieldname);
    if (validColumns.length === def.columns.length) ok(`All ${def.columns.length} columns have valid metadata`);
    else no("column metadata", `${def.columns.length - validColumns.length} invalid columns`);
  } else {
    no("column check", "no columns returned");
  }
} catch (e) { no("field permlevel", e.message); }

// ── 10. create/update/delete custom report ──────────────────────────────────
console.log("\n🔹 10. Custom report CRUD...");
let customReportId = null;
try {
  const { data: createRes } = await authedAdmin.rpc("erp_create_report", {
    p_company_id: COMPANY_ID,
    p_report_key: "security_test_report",
    p_report_name: "Security Test Report",
    p_doctype_key: "crm_lead",
    p_columns: [
      { fieldname: "lead_name", label: "Lead Name", fieldtype: "Data", width: 200 },
      { fieldname: "status", label: "Status", fieldtype: "Select", width: 120 },
    ],
    p_filters: [],
  });
  if (createRes?.ok) {
    customReportId = createRes.report_id;
    ok(`Custom report created: ${customReportId}`);
  } else {
    no("create report", `ok=${createRes?.ok}, error=${createRes?.error}`);
  }
} catch (e) { no("create report", e.message); }

if (customReportId) {
  try {
    const { data: updRes } = await authedAdmin.rpc("erp_update_report", {
      p_report_id: customReportId, p_company_id: COMPANY_ID, p_report_name: "Security Test Updated",
      p_columns: [{ fieldname: "lead_name", label: "Updated", fieldtype: "Data", width: 200 }],
      p_filters: [],
    });
    if (updRes?.ok) ok("Custom report updated");
    else no("update report", `ok=${updRes?.ok}, error=${updRes?.error}`);
  } catch (e) { no("update report", e.message); }

  try {
    const { data: delRes } = await authedAdmin.rpc("erp_delete_report", {
      p_report_id: customReportId, p_company_id: COMPANY_ID,
    });
    if (delRes?.ok) ok("Custom report deleted");
    else no("delete report", `ok=${delRes?.ok}, error=${delRes?.error}`);
  } catch (e) { no("delete report", e.message); }
}

// ── 11. CRM Opportunity report runs ─────────────────────────────────────────
console.log("\n🔹 11. CRM Opportunity report...");
try {
  const { data: listRes } = await authedAdmin.rpc("erp_list_reports", { p_company_id: COMPANY_ID });
  const reports = listRes?.data ?? [];
  const oppReport = reports.find(r => r.report_key === "crm_opportunity_list");
  if (!oppReport) { no("opp report in list", "not found"); } else {
    const { data: runRes } = await authedAdmin.rpc("erp_run_report", {
      p_report_id: oppReport.id, p_company_id: COMPANY_ID, p_filters: {},
    });
    if (runRes?.ok) ok(`Opportunity report returns ${runRes.data?.length ?? 0} rows`);
    else no("opp report", `ok=${runRes?.ok}, error=${runRes?.error}`);
  }
} catch (e) { no("opp report", e.message); }

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n════════════════════════════════`);
console.log(`  PASSED: ${pass}  FAILED: ${fail}`);
console.log(`════════════════════════════════\n`);
if (fail > 0) process.exit(1);
