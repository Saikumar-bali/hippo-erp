#!/usr/bin/env node
/**
 * Phase 6.8 — Report Builder Foundation: Cloud verification
 */
import dotenv from "dotenv";
dotenv.config();

function requireEnv(name) {
  const val = process.env[name];
  if (!val) { console.error(`❌ Missing required env var: ${name}`); process.exit(1); }
  return val;
}

const ACCESS_TOKEN = requireEnv("SUPABASE_ACCESS_TOKEN");
const PROJECT_REF = requireEnv("SUPABASE_PROJECT_REF");
const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

let passed = 0;
let failed = 0;

function ok(label) { passed++; console.log(`  ✅ ${label}`); }
function fail(label, msg) { failed++; console.error(`  ❌ ${label}: ${msg}`); }

async function sql(query, label) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} — ${text}`);
  return JSON.parse(text);
}

// --- Test 1: Tables exist ---
console.log("\n🔹 Checking tables...");
try {
  const tables = await sql(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='app' AND table_name IN ('erp_reports','erp_report_columns','erp_report_filters') ORDER BY table_name;`,
    "table check"
  );
  const tableNames = tables.map((r) => r.table_name);
  if (tableNames.includes("erp_reports")) ok("erp_reports table exists"); else fail("erp_reports table", "missing");
  if (tableNames.includes("erp_report_columns")) ok("erp_report_columns table exists"); else fail("erp_report_columns table", "missing");
  if (tableNames.includes("erp_report_filters")) ok("erp_report_filters table exists"); else fail("erp_report_filters table", "missing");
} catch (e) { fail("table check", e.message); }

// --- Test 2: Seed reports exist ---
console.log("\n🔹 Checking seed reports...");
try {
  const reports = await sql(
    `SELECT report_key, report_name, doctype_key, is_standard FROM app.erp_reports WHERE company_id = '${COMPANY_ID}' ORDER BY report_key;`,
    "seed reports"
  );
  const leadReport = reports.find((r) => r.report_key === "crm_lead_list");
  const oppReport = reports.find((r) => r.report_key === "crm_opportunity_list");
  if (leadReport) ok(`CRM Lead report exists (${leadReport.report_name})`); else fail("CRM Lead report", "missing");
  if (oppReport) ok(`CRM Opportunity report exists (${oppReport.report_name})`); else fail("CRM Opportunity report", "missing");
} catch (e) { fail("seed reports", e.message); }

// --- Test 3: Report columns exist ---
console.log("\n🔹 Checking report columns...");
try {
  const leadId = (await sql(`SELECT id FROM app.erp_reports WHERE report_key='crm_lead_list' AND company_id='${COMPANY_ID}';`, "get lead id"))[0].id;
  const columns = await sql(
    `SELECT fieldname, label, fieldtype, order_index FROM app.erp_report_columns WHERE report_id='${leadId}' ORDER BY order_index;`,
    "report columns"
  );
  if (columns.length >= 6) ok(`CRM Lead report has ${columns.length} columns`);
  else fail("CRM Lead columns", `expected ≥6, got ${columns.length}`);
  if (columns.every((c) => c.label && c.fieldname && c.fieldtype)) ok("All columns have label, fieldname, fieldtype");
  else fail("column structure", "missing fields");

  const oppId = (await sql(`SELECT id FROM app.erp_reports WHERE report_key='crm_opportunity_list' AND company_id='${COMPANY_ID}';`, "get opp id"))[0].id;
  const oppColumns = await sql(
    `SELECT fieldname, label FROM app.erp_report_columns WHERE report_id='${oppId}';`,
    "opp columns"
  );
  if (oppColumns.length >= 7) ok(`CRM Opportunity report has ${oppColumns.length} columns`);
  else fail("CRM Opportunity columns", `expected ≥7, got ${oppColumns.length}`);
} catch (e) { fail("report columns", e.message); }

// --- Test 4: Report filters exist ---
console.log("\n🔹 Checking report filters...");
try {
  const leadId = (await sql(`SELECT id FROM app.erp_reports WHERE report_key='crm_lead_list' AND company_id='${COMPANY_ID}';`, "get lead id"))[0].id;
  const filters = await sql(
    `SELECT fieldname, operator, is_required FROM app.erp_report_filters WHERE report_id='${leadId}' ORDER BY order_index;`,
    "report filters"
  );
  if (filters.length >= 3) ok(`CRM Lead report has ${filters.length} filters`);
  else fail("CRM Lead filters", `expected ≥3, got ${filters.length}`);
} catch (e) { fail("report filters", e.message); }

// --- Test 5: Workspace items ---
console.log("\n🔹 Checking workspace items...");
try {
  const wsItems = await sql(
    `SELECT item_key, label, item_type, target FROM app.erp_workspace_items WHERE workspace_key = 'reports' ORDER BY sort_order;`,
    "workspace items"
  );
  const leadWs = wsItems.find((r) => r.item_key === "crm_lead_report");
  const oppWs = wsItems.find((r) => r.item_key === "crm_opportunity_report");
  if (leadWs) ok(`CRM Lead workspace item (${leadWs.label})`); else fail("CRM Lead ws item", "missing");
  if (oppWs) ok(`CRM Opportunity workspace item (${oppWs.label})`); else fail("CRM Opportunity ws item", "missing");
  if (leadWs?.item_type === "report") ok("Workspace item type is 'report'");
  else fail("workspace item type", leadWs?.item_type ?? "wrong");
} catch (e) { fail("workspace items", e.message); }

// --- Test 6: Permission grants ---
console.log("\n🔹 Checking permission grants...");
try {
  const grants = await sql(
    `SELECT cr.role_name, crp.permission_key, crp.is_granted
     FROM app.company_role_permissions crp
     JOIN app.company_roles cr ON cr.id = crp.role_id
     WHERE crp.permission_key IN ('view_reports', 'export_reports')
     ORDER BY cr.role_name, crp.permission_key;`,
    "permission grants"
  );
  if (grants.find((r) => r.role_name === "Owner" && r.permission_key === "view_reports" && r.is_granted)) ok("Owner has view_reports");
  else fail("Owner view_reports", "not granted");
  if (grants.find((r) => r.role_name === "Admin" && r.permission_key === "view_reports" && r.is_granted)) ok("Admin has view_reports");
  else fail("Admin view_reports", "not granted");
  if (grants.find((r) => r.role_name === "Owner" && r.permission_key === "export_reports" && r.is_granted)) ok("Owner has export_reports");
  else fail("Owner export_reports", "not granted");
} catch (e) { fail("permission grants", e.message); }

// --- Test 7: RPCs exist ---
console.log("\n🔹 Checking RPCs exist...");
try {
  const rpcs = await sql(
    `SELECT routine_name FROM information_schema.routines
     WHERE routine_schema = 'public'
     AND routine_name IN ('erp_list_reports','erp_get_report_definition','erp_run_report','erp_create_report','erp_update_report','erp_delete_report')
     ORDER BY routine_name;`,
    "RPC existence"
  );
  const rpcNames = rpcs.map((r) => r.routine_name);
  const expected = ["erp_list_reports", "erp_get_report_definition", "erp_run_report", "erp_create_report", "erp_update_report", "erp_delete_report"];
  const missing = expected.filter((n) => !rpcNames.includes(n));
  if (missing.length === 0) ok(`All ${expected.length} RPCs exist`);
  else fail("RPCs", `missing: ${missing.join(", ")}`);
} catch (e) { fail("RPCs", e.message); }

// --- Summary ---
console.log(`\n════════════════════════════════`);
console.log(`  PASSED: ${passed}  FAILED: ${failed}`);
console.log(`════════════════════════════════\n`);
if (failed > 0) process.exit(1);
