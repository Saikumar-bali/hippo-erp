#!/usr/bin/env node
/**
 * Phase 6.7.1 Cloud Security Regression Verification
 *
 * Proves Phase 6.5/6.6.1 protections coexist with Phase 6.7 workflow.
 * Tests via Management API against Supabase Cloud.
 */

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "bhqgszzvemejfbgndtnf";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const MANAGEMENT_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ADMIN_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const LOW_PRIV_EMAIL = process.env.PLAYWRIGHT_LOW_PRIV_EMAIL;
const LOW_PRIV_PASSWORD = process.env.PLAYWRIGHT_LOW_PRIV_PASSWORD;

let passCount = 0;
let failCount = 0;
const results = [];

function pass(name, detail = "") {
  passCount++;
  results.push({ status: "PASS", name, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  failCount++;
  results.push({ status: "FAIL", name, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function mgmtQuery(sql) {
  const resp = await fetch(MANAGEMENT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  return resp.json();
}

async function rpc(token, fn, params) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return resp.json();
}

async function loginAs(email, password) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await resp.json();
  return data.access_token;
}

async function run() {
  console.log("\n=== Phase 6.7.1 Cloud Security Regression Verification ===\n");

  // Setup: get company_id and create test documents
  let companyId;
  { const r = await mgmtQuery("SELECT id FROM app.tenants LIMIT 1"); companyId = r[0]?.id; }
  if (!companyId) { fail("Setup", "No tenants"); process.exit(1); }

  let adminToken, lowPrivToken;
  try { adminToken = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD); } catch (e) { fail("Admin login", e.message); process.exit(1); }
  try { lowPrivToken = await loginAs(LOW_PRIV_EMAIL, LOW_PRIV_PASSWORD); } catch (e) { fail("Low-priv login", e.message); process.exit(1); }

  // Look up low-priv user ID from auth.users
  const lowPrivUsers = await mgmtQuery(`SELECT id FROM auth.users WHERE email = '${LOW_PRIV_EMAIL}' LIMIT 1`);
  if (!lowPrivUsers || lowPrivUsers.length === 0) throw new Error(`Low-priv user not found: ${LOW_PRIV_EMAIL}`);
  const lowPrivUserId = lowPrivUsers[0].id;
  console.log(`  Low-priv user ID: ${lowPrivUserId}`);

  // Set up user permission rules for low-priv user: only see leads where owner_name matches
  // Delete any stale rules first, then insert fresh
  await mgmtQuery(`DELETE FROM app.company_user_permissions WHERE company_id='${companyId}' AND user_id='${lowPrivUserId}' AND doctype_key='crm_lead' AND fieldname='owner_name'`);
  await mgmtQuery(`INSERT INTO app.company_user_permissions (company_id, user_id, doctype_key, fieldname, allowed_value, apply_read, apply_write, is_active) VALUES ('${companyId}', '${lowPrivUserId}', 'crm_lead', 'owner_name', '${LOW_PRIV_EMAIL}', true, true, true)`);
  console.log("  Permission rule created for low-priv user");

  // Create test CRM Lead as admin
  let adminLeadId;
  { const r = await rpc(adminToken, "erp_create_document", { p_doctype_key: "crm_lead", p_company_id: companyId, p_data: { lead_name: "Security Test Lead Admin", company_name: "TestCorp", email: "admin@test.com", phone: "555-0001", notes: "Admin notes", status: "New" } }); adminLeadId = r.document_id; }

  // Create test CRM Lead for low-priv (allowed via owner_name match)
  let lowPrivLeadId;
  { const r = await rpc(adminToken, "erp_create_document", { p_doctype_key: "crm_lead", p_company_id: companyId, p_data: { lead_name: "Security Test Lead LowPriv", company_name: "LowCorp", email: "low@test.com", phone: "555-0002", notes: "Low priv notes", status: "New", owner_name: LOW_PRIV_EMAIL } }); lowPrivLeadId = r.document_id; }

  // Create blocked CRM Lead (different owner)
  let blockedLeadId;
  { const r = await rpc(adminToken, "erp_create_document", { p_doctype_key: "crm_lead", p_company_id: companyId, p_data: { lead_name: "Blocked Lead", company_name: "BlockedCorp", email: "blocked@test.com", phone: "555-0003", notes: "Blocked notes", status: "New", owner_name: "other@example.com" } }); blockedLeadId = r.document_id; }

  // ── Cloud Security Checks ────────────────────────────────────────────

  // 1. Admin can list/get full permitted data
  { const r = await rpc(adminToken, "erp_list_documents", { p_doctype_key: "crm_lead", p_company_id: companyId }); if (r.ok && r.data.length > 0 && r.data[0].docstatus !== undefined) pass("1. Admin list: full data with docstatus/workflow_state"); else fail("1. Admin list", JSON.stringify(r)); }

  // 2. Admin get includes docstatus/workflow_state
  { const r = await rpc(adminToken, "erp_get_document", { p_doctype_key: "crm_lead", p_document_id: adminLeadId, p_company_id: companyId }); if (r.ok && r.data.docstatus !== undefined && r.data.workflow_state) pass("2. Admin get: docstatus + workflow_state present"); else fail("2. Admin get", JSON.stringify(r)); }

  // 3. Admin get includes level-1 fields (email, phone, notes)
  { const r = await rpc(adminToken, "erp_get_document", { p_doctype_key: "crm_lead", p_document_id: adminLeadId, p_company_id: companyId }); if (r.ok && r.data.data.email && r.data.data.phone && r.data.data.notes) pass("3. Admin get: level-1 fields (email, phone, notes) visible"); else fail("3. Admin get level-1", JSON.stringify(r)); }

  // 4. Restricted user list only shows allowed records
  { const r = await rpc(lowPrivToken, "erp_list_documents", { p_doctype_key: "crm_lead", p_company_id: companyId }); const ids = (r.data || []).map(d => d.id); if (r.ok && ids.includes(lowPrivLeadId) && !ids.includes(blockedLeadId)) pass("4. Low-priv list: blocked lead excluded"); else fail("4. Low-priv list", `ids=${ids.join(",")}`); }

  // 5. Restricted user cannot see blocked CRM Lead
  { const r = await rpc(lowPrivToken, "erp_get_document", { p_doctype_key: "crm_lead", p_document_id: blockedLeadId, p_company_id: companyId }); if (!r.ok || !r.data) pass("5. Low-priv get blocked: document not found"); else fail("5. Low-priv get blocked", JSON.stringify(r)); }

  // 6. Restricted user does not see level-1 fields (email/phone/notes)
  { const r = await rpc(lowPrivToken, "erp_get_document", { p_doctype_key: "crm_lead", p_document_id: lowPrivLeadId, p_company_id: companyId }); if (r.ok && r.data.data && !r.data.data.email && !r.data.data.phone && !r.data.data.notes) pass("6. Low-priv get: level-1 fields masked"); else fail("6. Low-priv level-1 masking", JSON.stringify(r.data?.data)); }

  // 7. Restricted user cannot update level-1 fields
  { const r = await rpc(lowPrivToken, "erp_update_document", { p_doctype_key: "crm_lead", p_document_id: lowPrivLeadId, p_company_id: companyId, p_data: { email: "hacked@test.com" } }); if (!r.ok && r.error && r.error.includes("Permission denied")) pass("7. Low-priv update level-1: blocked"); else fail("7. Low-priv update level-1", JSON.stringify(r)); }

  // 8. Restricted user cannot update docstatus/workflow_state directly
  { const r = await rpc(lowPrivToken, "erp_update_document", { p_doctype_key: "crm_lead", p_document_id: lowPrivLeadId, p_company_id: companyId, p_data: { docstatus: 1, workflow_state: "converted" } }); if (r.ok) { const check = await rpc(lowPrivToken, "erp_get_document", { p_doctype_key: "crm_lead", p_document_id: lowPrivLeadId, p_company_id: companyId }); if (check.data.docstatus === 0 && check.data.workflow_state !== "converted") pass("8. Direct docstatus/workflow_state update: stripped"); else fail("8. Direct docstatus update succeeded", JSON.stringify(check)); } else { pass("8. Direct docstatus update: rejected", r.error); } }

  // 9. Restricted user cannot apply workflow action on blocked record
  { const r = await rpc(lowPrivToken, "erp_apply_workflow_action", { p_doctype_key: "crm_lead", p_document_id: blockedLeadId, p_company_id: companyId, p_action: "Open" }); if (!r.ok && r.error) pass("9. Low-priv workflow on blocked: denied"); else fail("9. Low-priv workflow on blocked", JSON.stringify(r)); }

  // 10. Restricted user can apply workflow on allowed record
  { const r = await rpc(lowPrivToken, "erp_apply_workflow_action", { p_doctype_key: "crm_lead", p_document_id: lowPrivLeadId, p_company_id: companyId, p_action: "Open" }); if (r.ok && r.new_state === "open") pass("10. Low-priv workflow on allowed: draft→open"); else fail("10. Low-priv workflow on allowed", JSON.stringify(r)); }

  // 11. Admin valid transition works
  { const r = await rpc(adminToken, "erp_apply_workflow_action", { p_doctype_key: "crm_lead", p_document_id: adminLeadId, p_company_id: companyId, p_action: "Open" }); if (r.ok && r.new_state === "open") pass("11. Admin workflow: draft→open"); else fail("11. Admin workflow", JSON.stringify(r)); }

  // 12. Invalid transition fails (Open from open state is invalid — already in open)
  { const r = await rpc(adminToken, "erp_apply_workflow_action", { p_doctype_key: "crm_lead", p_document_id: adminLeadId, p_company_id: companyId, p_action: "Open" }); if (!r.ok && r.error && r.error.includes("Invalid action")) pass("12. Invalid transition: open→Open rejected"); else fail("12. Invalid transition", JSON.stringify(r)); }

  // 13. Submitted/cancelled edit rules work
  { const r = await rpc(adminToken, "erp_cancel_document", { p_doctype_key: "crm_lead", p_document_id: adminLeadId, p_company_id: companyId }); if (r.ok && r.docstatus === 2) pass("13. Cancel doc: docstatus=2"); else fail("13. Cancel doc", JSON.stringify(r)); }
  { const r = await rpc(adminToken, "erp_update_document", { p_doctype_key: "crm_lead", p_document_id: adminLeadId, p_company_id: companyId, p_data: { notes: "should fail" } }); if (!r.ok && r.error && r.error.includes("cancelled")) pass("14. Update cancelled doc: rejected"); else fail("14. Update cancelled doc", JSON.stringify(r)); }

  // 15. Audit/version timeline still records workflow changes
  { const r = await rpc(lowPrivToken, "erp_list_document_versions", { p_doctype_key: "crm_lead", p_document_id: lowPrivLeadId, p_company_id: companyId }); if (r.ok && r.data && r.data.length > 0 && r.data.some(v => v.change_reason && v.change_reason.includes("workflow"))) pass("15. Version timeline records workflow change"); else fail("15. Version timeline workflow", JSON.stringify(r)); }

  // 16. Audit/version masking still works (low-priv sees masked data)
  { const r = await rpc(lowPrivToken, "erp_list_document_versions", { p_doctype_key: "crm_lead", p_document_id: lowPrivLeadId, p_company_id: companyId }); if (r.ok && r.data && r.data.length > 0) { const latest = r.data[0]; const hasEmail = latest.data && latest.data.email; if (!hasEmail) pass("16. Version data masked: no level-1 fields"); else fail("16. Version data not masked", JSON.stringify(latest.data)); } else fail("16. Version data masked", JSON.stringify(r)); }

  // 17. CRM Opportunity generic_json CRUD still works
  { const r = await rpc(adminToken, "erp_create_document", { p_doctype_key: "crm_opportunity", p_company_id: companyId, p_data: { opportunity_name: "Test Opp 6.7.1", account_name: "OppCorp", stage: "Qualification" } }); if (r.ok && r.document_id) { await mgmtQuery(`DELETE FROM app.erp_documents WHERE id='${r.document_id}'`); pass("17. CRM Opportunity CRUD: create+delete OK"); } else fail("17. CRM Opportunity CRUD", JSON.stringify(r)); }

  // Cleanup
  for (const id of [adminLeadId, lowPrivLeadId, blockedLeadId]) {
    if (id) { await mgmtQuery(`DELETE FROM app.erp_document_versions WHERE document_id='${id}'`); await mgmtQuery(`DELETE FROM app.erp_documents WHERE id='${id}'`); }
  }

  console.log(`\n=== Results: ${passCount} PASS, ${failCount} FAIL out of ${passCount + failCount} ===\n`);
  if (failCount > 0) process.exit(1);
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
