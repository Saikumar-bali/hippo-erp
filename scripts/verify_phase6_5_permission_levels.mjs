import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const outDir = process.env.PLAYWRIGHT_RESULTS_DIR || "C:/tmp/phase-6-5-permission-levels";
await fs.mkdir(outDir, { recursive: true });

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
const adminEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
const lowPrivEmail = process.env.PLAYWRIGHT_LOW_PRIV_EMAIL;
const lowPrivPassword = process.env.PLAYWRIGHT_LOW_PRIV_PASSWORD;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const roleName = `Sales Restricted ${Date.now()}`;
const leadSuffix = Date.now();
const allowedLeadName = `Phase65 Allowed ${leadSuffix}`;
const blockedLeadName = `Phase65 Blocked ${leadSuffix}`;

if (!adminEmail || !adminPassword || !lowPrivEmail || !lowPrivPassword || !supabaseUrl || !supabaseKey) {
  console.error("Missing env vars.");
  process.exit(1);
}

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const pageErrors = [];
const consoleMessages = [];

page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") consoleMessages.push(`[${message.type()}] ${message.text()}`);
});

async function snap(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

async function writeResults(results) {
  await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
}

async function gotoApp(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 15_000 });
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1500);
    }
  }
  throw lastError;
}

async function waitForSession() {
  await page.waitForFunction(() => {
    const body = document.body?.innerText ?? "";
    return !body.includes("Loading session...");
  }, { timeout: 30_000 });
}

async function login(email, password) {
  await gotoApp(base);
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole("button", { name: /login|sign in/i }).first().click();
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.getByRole("button", { name: /logout/i }).waitFor({ timeout: 30_000 });
}

async function logout() {
  await page.getByRole("button", { name: /logout/i }).click();
  await page.waitForURL(/\/login$/i, { timeout: 20_000 });
}

async function waitForAccessControlReady() {
  await page.getByRole("heading", { name: /Access Control Manager/i }).waitFor({ timeout: 30_000 });
  await page.getByText(/Loading Access Control Manager/i).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => null);
}

async function openAccessControlManager() {
  await gotoApp(`${base}/metadata_studio_access_control_manager`);
  await waitForSession();
  await waitForAccessControlReady();
  await page.waitForTimeout(2000);
}

async function createRestrictedRole() {
  await page.getByPlaceholder(/Sales Coordinator/i).fill(roleName);
  await page.getByRole("button", { name: /Create role/i }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: new RegExp(roleName, "i") }).waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: new RegExp(roleName, "i") }).click();
  await page.waitForTimeout(1500);
}

async function selectCrmLeadTarget() {
  const moduleSelect = page.getByLabel(/Module/i);
  await moduleSelect.waitFor({ timeout: 20_000 });
  const moduleOptions = await moduleSelect.locator("option").allTextContents();
  const crmModule = moduleOptions.find((option) => /crm/i.test(option));
  if (!crmModule) throw new Error(`CRM module option not found.`);
  await moduleSelect.selectOption({ label: crmModule });
  await page.waitForTimeout(500);

  const screenTypeSelect = page.getByLabel(/Screen type/i);
  await screenTypeSelect.selectOption("doctype_only");
  await page.waitForTimeout(500);

  const targetSelect = page.getByLabel(/Select screen or document/i);
  await targetSelect.waitFor({ timeout: 20_000 });
  const options = await targetSelect.locator("option").allTextContents();
  const crmLead = options.find((option) => /crm/i.test(option) && /lead/i.test(option) && /doctype/i.test(option));
  if (!crmLead) throw new Error(`CRM Lead target not found.`);
  await targetSelect.selectOption({ label: crmLead });
  await page.waitForTimeout(2000);
}

async function setRight(rightKey, nextValue) {
  const row = page.locator("tbody tr").filter({
    has: page.locator("td").filter({ hasText: new RegExp(`^${rightKey}$`, "i") }),
  }).first();
  await row.waitFor({ timeout: 20_000 });
  const checkbox = row.locator('input[type="checkbox"]').first();
  const checked = await checkbox.isChecked();
  if (checked !== nextValue) await checkbox.click();
}

async function saveRoleAccess() {
  const saveButton = page.getByRole("button", { name: /Save role access/i });
  await saveButton.click();
  await page.getByRole("button", { name: /Saving/i }).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => null);
  await waitForAccessControlReady();
  await page.waitForTimeout(3000);
}

async function assertPermlevelRowVisible(level, label) {
  const row = page.getByRole("row", { name: new RegExp(`Level ${level}`, "i") }).first();
  await row.waitFor({ timeout: 20_000 });
}

async function assertPermlevelRoleReadUnchecked(level, label) {
  const row = page.getByRole("row", { name: new RegExp(`Level ${level}`, "i") }).first();
  await row.waitFor({ timeout: 20_000 });
  const checkboxes = row.locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  if (count < 1) throw new Error(`${label}: expected at least 1 checkbox in permlevel ${level} row.`);
  if (await checkboxes.nth(0).isChecked()) throw new Error(`${label}: Level ${level} Role Read should be unchecked.`);
}

async function openCrmLeadList() {
  await gotoApp(`${base}/crm_lead`);
  await waitForSession();
  await page.waitForTimeout(3000);
}

async function createLead(leadName, ownerName, notes) {
  await openCrmLeadList();
  const createButton = page.getByRole("button", { name: /\+ create/i });
  await createButton.waitFor({ timeout: 20_000 });
  await createButton.click();

  await page.getByLabel(/Lead Name/i).fill(leadName);
  await page.getByLabel(/Company Name/i).fill("Phase 6.5 Verification");
  await page.getByLabel(/^Email/i).fill(`${leadName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@example.com`);

  const phoneField = page.locator('[name="phone"]');
  if (await phoneField.count()) await phoneField.fill("9876543210");
  const sourceField = page.locator('select[name="source"]');
  if (await sourceField.count()) await sourceField.selectOption("Website");
  const statusField = page.locator('select[name="status"]');
  if (await statusField.count()) await statusField.selectOption("Qualified");

  const ownerField = page.locator('[name="owner_name"]');
  if (!await ownerField.count()) throw new Error("CRM Lead owner_name field is missing.");
  await ownerField.fill(ownerName);

  await page.locator('textarea[name="notes"]').fill(notes);
  await page.getByRole("button", { name: /Create (CRM )?Lead/i }).click();
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.waitForTimeout(1000);
}

async function openLeadByName(leadName) {
  const row = page.locator("tbody tr").filter({ hasText: leadName }).first();
  await row.waitFor({ timeout: 20_000 });
  const linkButton = row.locator(".link-button").first();
  if (await linkButton.count()) { await linkButton.click(); return; }
  await row.getByRole("button", { name: /^View$/i }).click();
}

async function assertVisible(locator, label) {
  if (!await locator.isVisible()) throw new Error(`${label} was not visible.`);
}

async function assertHidden(locator, label) {
  if (await locator.count() > 0 && await locator.first().isVisible()) throw new Error(`${label} should be hidden or blocked.`);
}

async function assertNoPageErrors() {
  const filteredErrors = pageErrors.filter((e) => !e.includes("get_company_theme"));
  const filteredConsole = consoleMessages.filter((m) => !m.includes("get_company_theme") && !m.includes("[theme]") && !m.includes("403"));
  if (filteredErrors.length > 0 || filteredConsole.length > 0) {
    throw new Error(`Page errors detected.\nPAGE_ERRORS:\n${filteredErrors.join("\n") || "none"}\nCONSOLE_ERRORS:\n${filteredConsole.join("\n") || "none"}`);
  }
}

const results = {
  roleName,
  outDir,
  allowedLeadName,
  blockedLeadName,
  checks: {
    adminLogin: false,
    leadsCreated: false,
    salesRestrictedRoleCreated: false,
    level0VisibleInManager: false,
    level1VisibleInManager: false,
    grantViewCrmLeadOnly: false,
    level1ReadNotGranted: false,
    lowPrivRoleAssigned: false,
    userPermissionRuleSaved: false,
    lowPrivLogin: false,
    createBlocked: false,
    exportImportBlocked: false,
    allowedRecordVisible: false,
    blockedRecordHidden: false,
    normalFieldsVisible: false,
    level1FieldHiddenInList: false,
    updateBlocked: false,
    level1FieldHiddenInDetail: false,
    noPageErrors: false,
  },
};

try {
  // --- Phase A: Admin creates leads via UI ---
  await login(adminEmail, adminPassword);
  results.checks.adminLogin = true;

  await createLead(allowedLeadName, lowPrivEmail, "Allowed lead created by Phase 6.5 verification.");
  await createLead(blockedLeadName, "another.owner@example.com", "Blocked lead created by Phase 6.5 verification.");
  results.checks.leadsCreated = true;
  await snap("01-admin-leads-created.png");

  // --- Phase B: Admin configures role via UI ---
  await openAccessControlManager();
  await createRestrictedRole();
  results.checks.salesRestrictedRoleCreated = true;

  await selectCrmLeadTarget();
  await page.getByText("Level 0", { exact: true }).waitFor({ timeout: 20_000 });
  await page.getByText("Level 1", { exact: true }).waitFor({ timeout: 20_000 });
  results.checks.level0VisibleInManager = true;
  results.checks.level1VisibleInManager = true;

  await setRight("read", true);
  await setRight("create", false);
  await setRight("update", false);
  await setRight("delete", false);
  await setRight("export", false);
  await setRight("import", false);
  await setRight("print", false);
  await saveRoleAccess();
  results.checks.grantViewCrmLeadOnly = true;

  // Re-navigate to verify permlevels persisted
  await openAccessControlManager();
  await page.getByRole("button", { name: new RegExp(roleName, "i") }).click();
  await page.waitForTimeout(1000);
  await selectCrmLeadTarget();
  await assertPermlevelRowVisible(1, "Level 1");
  await assertPermlevelRoleReadUnchecked(1, "Level 1 read");
  results.checks.level1ReadNotGranted = true;
  await snap("02-access-control-configured.png");

  // --- Phase C: Assign role + user permission via Supabase RPC ---
  const adminClient = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: adminLoginData, error: adminLoginErr } = await adminClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (adminLoginErr || !adminLoginData.user) throw adminLoginErr ?? new Error("Admin RPC login failed");
  const adminUserId = adminLoginData.user.id;

  const { data: companies } = await adminClient.rpc("get_my_companies");
  const company = (companies || []).find((c) => ["owner", "admin"].includes(String(c.role || "").toLowerCase()));
  if (!company?.id) throw new Error("Admin is not owner/admin of any company");
  const companyId = company.id;

  // Get the low-priv user ID
  const { data: allUsers } = await adminClient.rpc("get_company_users", { p_company_id: companyId });
  const lowPrivUser = (allUsers || []).find((u) => u.email === lowPrivEmail);
  if (!lowPrivUser) throw new Error(`Low-priv user ${lowPrivEmail} not found in company`);
  const lowPrivUserId = lowPrivUser.user_id;

  // Find the role ID for our created role
  const { data: roleRows, error: roleListErr } = await adminClient.rpc("get_company_roles", { p_company_id: companyId });
  if (roleListErr) throw roleListErr;
  console.log(`[RPC] get_company_roles returned:`, JSON.stringify((roleRows || []).map(r => ({ id: r.id, role_name: r.role_name })), null, 2));
  const createdRole = (roleRows || []).find((r) => r.role_name === roleName);
  if (!createdRole) throw new Error(`Role ${roleName} not found after creation. Available roles: ${(roleRows || []).map(r => r.role_name).join(", ")}`);
  const roleId = createdRole.id;
  console.log(`[RPC] Role ${roleName} id=${roleId}`);

  // Assign the restricted role to the low-priv user (replaces all existing roles)
  const { error: roleAssignErr } = await adminClient.rpc("set_company_user_roles", {
    p_company_id: companyId,
    p_user_id: lowPrivUserId,
    p_role_ids: [roleId],
  });
  if (roleAssignErr) throw new Error(`Role assignment failed: ${roleAssignErr.message}`);
  console.log(`[RPC] Assigned role ${roleId} to user ${lowPrivUserId}`);
  results.checks.lowPrivRoleAssigned = true;

  // Add user permission rule: only allow crm_lead records where owner_name = lowPrivEmail
  const { error: permErr } = await adminClient.rpc("save_company_user_permission", {
    p_company_id: companyId,
    p_payload: {
      user_id: lowPrivUserId,
      doctype_key: "crm_lead",
      fieldname: "owner_name",
      allowed_value: lowPrivEmail,
      apply_read: true,
      apply_write: false,
      is_active: true,
    },
  });
  if (permErr) throw new Error(`User permission save failed: ${permErr.message}`);
  console.log(`[RPC] Saved user permission rule for user ${lowPrivUserId}: owner_name=${lowPrivEmail}`);
  results.checks.userPermissionRuleSaved = true;

  await adminClient.auth.signOut();
  await snap("03-user-permission-rule.png");

  // --- Phase D: Login as low-priv user and verify restrictions ---
  await logout();
  await login(lowPrivEmail, lowPrivPassword);
  results.checks.lowPrivLogin = true;

  await openCrmLeadList();

  await assertHidden(page.getByRole("button", { name: /\+ create/i }), "Create");
  results.checks.createBlocked = true;
  await assertHidden(page.getByRole("button", { name: /Export CSV/i }), "Export CSV");
  await assertHidden(page.getByRole("button", { name: /Import CSV/i }), "Import CSV");
  results.checks.exportImportBlocked = true;

  const tableText = await page.locator("tbody").innerText();
  if (!tableText.includes(allowedLeadName)) {
    throw new Error(`Allowed CRM Lead was not visible to the restricted user.\nTABLE:\n${tableText}`);
  }
  if (tableText.includes(blockedLeadName)) {
    throw new Error(`Blocked CRM Lead was still visible to the restricted user.\nTABLE:\n${tableText}`);
  }
  results.checks.allowedRecordVisible = true;
  results.checks.blockedRecordHidden = true;

  const tableHeader = await page.locator("thead").innerText();
  if (!/LEAD NAME/i.test(tableHeader) || !/COMPANY NAME/i.test(tableHeader)) {
    throw new Error(`Expected normal CRM Lead fields were not visible.\nHEADER:\n${tableHeader}`);
  }
  if (/EMAIL/i.test(tableHeader) || /PHONE/i.test(tableHeader)) {
    throw new Error(`Sensitive level-1 fields were visible in the list.\nHEADER:\n${tableHeader}`);
  }
  results.checks.normalFieldsVisible = true;
  results.checks.level1FieldHiddenInList = true;

  await openLeadByName(allowedLeadName);
  await page.getByText(/CRM Lead Detail/i).waitFor({ timeout: 20_000 }).catch(() => null);
  await assertVisible(page.getByText(/Lead Name/i).first(), "Lead Name label");
  await assertVisible(page.getByText(/Company Name/i).first(), "Company Name label");
  await assertVisible(page.getByText(/Owner Name/i).first(), "Owner Name label");
  await assertHidden(page.getByText(/^Email$/i), "Email label");
  await assertHidden(page.getByText(/^Phone$/i), "Phone label");
  results.checks.level1FieldHiddenInDetail = true;

  await assertHidden(page.getByRole("button", { name: /Edit CRM Lead/i }), "Edit");
  results.checks.updateBlocked = true;
  await snap("04-low-priv-detail.png");

  await assertNoPageErrors();
  results.checks.noPageErrors = true;
  await writeResults({ ok: true, ...results, pageErrors, consoleMessages });
  console.log(JSON.stringify({ ok: true, ...results }, null, 2));
} catch (error) {
  await snap("99-error-state.png");
  await writeResults({ ok: false, ...results, error: error instanceof Error ? error.message : String(error), pageErrors, consoleMessages });
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
