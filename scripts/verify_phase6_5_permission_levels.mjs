import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = process.env.PLAYWRIGHT_RESULTS_DIR || "C:/tmp/phase-6-5-permission-levels";
await fs.mkdir(outDir, { recursive: true });

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
const adminEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
const lowPrivEmail = process.env.PLAYWRIGHT_LOW_PRIV_EMAIL;
const lowPrivPassword = process.env.PLAYWRIGHT_LOW_PRIV_PASSWORD;
const roleName = `Sales Restricted ${Date.now()}`;
const leadSuffix = Date.now();
const allowedLeadName = `Phase65 Allowed ${leadSuffix}`;
const blockedLeadName = `Phase65 Blocked ${leadSuffix}`;

if (!adminEmail || !adminPassword || !lowPrivEmail || !lowPrivPassword) {
  console.error("Missing Playwright env vars. Required: PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_TEST_PASSWORD, PLAYWRIGHT_LOW_PRIV_EMAIL, PLAYWRIGHT_LOW_PRIV_PASSWORD.");
  process.exit(1);
}

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const pageErrors = [];
const consoleMessages = [];

page.on("pageerror", (error) => {
  pageErrors.push(String(error));
});

page.on("console", (message) => {
  if (message.type() === "error") {
    consoleMessages.push(`[${message.type()}] ${message.text()}`);
  }
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

async function navigateInApp(pathname) {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, pathname);
  await page.waitForLoadState("networkidle").catch(() => null);
}

async function waitForAppReady() {
  await gotoApp(base);
  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (/Missing Supabase environment variables/i.test(bodyText)) {
    throw new Error(`App loaded without required runtime variables.\nBODY:\n${bodyText}`);
  }
}

async function login(email, password) {
  await gotoApp(base);
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole("button", { name: /login|sign in/i }).first().click();
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.getByRole("button", { name: /logout/i }).waitFor({ timeout: 30_000 });
  await ensureCompanySelected();
}

async function ensureCompanySelected() {
  const tenantSelect = page.locator(".tenant-selector select");
  if (await tenantSelect.count()) {
    const current = await tenantSelect.inputValue();
    if (!current) {
      const options = await tenantSelect.locator("option").count();
      if (options > 0) {
        await tenantSelect.selectOption({ index: 0 });
        await page.waitForLoadState("networkidle").catch(() => null);
      }
    }
  }
}

async function ensureRouteReady(url) {
  const pathname = new URL(url).pathname;
  await navigateInApp(pathname);
  await ensureCompanySelected();
  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (/No company selected/i.test(bodyText) || /membership load failed/i.test(bodyText)) {
    await page.waitForTimeout(1500);
    await navigateInApp(pathname);
    await ensureCompanySelected();
  }
}

async function logout() {
  await page.getByRole("button", { name: /logout/i }).click();
  await page.waitForURL(/\/login$/i, { timeout: 20_000 });
}

async function assertVisible(locator, label) {
  if (!await locator.isVisible()) {
    throw new Error(`${label} was not visible.`);
  }
}

async function assertHidden(locator, label) {
  if (await locator.count() > 0 && await locator.first().isVisible()) {
    throw new Error(`${label} should be hidden or blocked.`);
  }
}

async function waitForAccessControlReady() {
  await page.getByRole("heading", { name: /Access Control Manager/i }).waitFor({ timeout: 30_000 });
  await page.getByText(/Loading Access Control Manager/i).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => null);
}

async function openAccessControlManager() {
  await ensureRouteReady(`${base}/metadata_studio_access_control_manager`);
  await waitForAccessControlReady();
}

async function openUserAssignments() {
  await ensureRouteReady(`${base}/users_and_roles_access_assignments`);
  await page.getByRole("heading", { name: /User Role Assignment/i }).waitFor({ timeout: 30_000 });
  await page.getByText(/Loading user assignments/i).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => null);
}

async function createRestrictedRole() {
  await page.getByPlaceholder(/Sales Coordinator/i).fill(roleName);
  await page.getByRole("button", { name: /Create role/i }).click();
  await page.getByRole("button", { name: new RegExp(roleName, "i") }).waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: new RegExp(roleName, "i") }).click();
}

async function selectCrmLeadTarget() {
  const moduleSelect = page.getByLabel(/Module/i);
  const moduleOptions = await moduleSelect.locator("option").allTextContents();
  const crmModule = moduleOptions.find((option) => /crm/i.test(option));
  if (!crmModule) {
    throw new Error(`CRM module option not found. Options: ${moduleOptions.join(" | ")}`);
  }
  await moduleSelect.selectOption({ label: crmModule });

  const screenTypeSelect = page.getByLabel(/Screen type/i);
  await screenTypeSelect.selectOption("doctype_only");

  const targetSelect = page.getByLabel(/Select screen or document/i);
  const options = await targetSelect.locator("option").allTextContents();
  const crmLead = options.find((option) => /^CRM \/ Lead \(doctype\)$/i.test(option));
  if (!crmLead) {
    throw new Error(`CRM Lead target not found. Options: ${options.join(" | ")}`);
  }
  await targetSelect.selectOption({ label: crmLead });
  await page.getByText("Lead", { exact: true }).waitFor({ timeout: 20_000 });
  await page.getByText("doctype", { exact: true }).waitFor({ timeout: 20_000 });
  await page.getByText(/Field-level permissions/i).waitFor({ timeout: 20_000 });
}

async function setRight(rightKey, nextValue) {
  const row = page.locator("tbody tr").filter({
    has: page.locator("td").filter({ hasText: new RegExp(`^${rightKey}$`, "i") }),
  }).first();
  await row.waitFor({ timeout: 20_000 });
  const checkbox = row.locator('input[type="checkbox"]').first();
  const checked = await checkbox.isChecked();
  if (checked !== nextValue) {
    await checkbox.click();
  }
}

async function saveRoleAccess() {
  const saveButton = page.getByRole("button", { name: /Save role access/i });
  await saveButton.click();
  await page.getByRole("button", { name: /Saving/i }).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => null);
  await waitForAccessControlReady();
}

async function setPermlevelCheckbox(level, columnIndex, nextValue) {
  const row = page.locator(".studio-panel").filter({ hasText: /Field-level permissions/i }).locator("tbody tr").filter({
    hasText: new RegExp(`Level ${level}`, "i"),
  }).first();
  await row.waitFor({ timeout: 20_000 });
  const checkbox = row.locator('input[type="checkbox"]').nth(columnIndex);
  const checked = await checkbox.isChecked();
  if (checked !== nextValue) {
    await checkbox.click();
  }
}

async function assertPermlevelUnchecked(level, columnIndex, label) {
  const row = page.locator(".studio-panel").filter({ hasText: /Field-level permissions/i }).locator("tbody tr").filter({
    hasText: new RegExp(`Level ${level}`, "i"),
  }).first();
  await row.waitFor({ timeout: 20_000 });
  const rowText = await row.innerText();
  if (!rowText.includes(`Level ${level}`)) {
    throw new Error(`${label} row for permlevel ${level} was not visible.`);
  }
}

async function assignRestrictedRoleToLowPrivUser() {
  await openUserAssignments();
  const userButton = page.locator(".users-items .user-item").filter({ hasText: lowPrivEmail }).first();
  await userButton.waitFor({ timeout: 20_000 });
  await userButton.click();
  await page.getByRole("button", { name: /Clear All Roles/i }).click();
  const roleRow = page.locator(".studio-check").filter({ hasText: roleName }).first();
  const toggle = roleRow.locator('input[type="checkbox"]').first();
  if (!await toggle.isChecked()) {
    await roleRow.click();
    await page.waitForTimeout(300);
  }
  if (!await toggle.isChecked()) {
    await toggle.click({ force: true });
    await page.waitForTimeout(300);
  }
  if (!await toggle.isChecked()) {
    throw new Error(`Role toggle for ${roleName} did not switch on for the restricted user.`);
  }
  const saveAssignmentsButton = page.getByRole("button", { name: /Save Assignments/i });
  await saveAssignmentsButton.click();
  await page.getByRole("button", { name: /Saving/i }).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => null);
}

async function addUserPermissionRule() {
  await openUserAssignments();
  const userButton = page.locator(".users-items .user-item").filter({ hasText: lowPrivEmail }).first();
  await userButton.click();
  const panel = page.locator(".studio-panel").filter({
    has: page.getByRole("button", { name: /Save User Permission/i }),
  }).first();
  await panel.locator("select").nth(0).selectOption("crm_lead");
  await panel.locator("select").nth(1).selectOption("owner_name");
  await panel.locator("input:not([type='checkbox'])").first().fill(lowPrivEmail);
  const writeCheckbox = panel.locator(".studio-check").filter({ hasText: /^Write$/i }).locator('input[type="checkbox"]').first();
  if (await writeCheckbox.isChecked()) {
    await writeCheckbox.uncheck();
  }
  const readCheckbox = panel.locator(".studio-check").filter({ hasText: /^Read$/i }).locator('input[type="checkbox"]').first();
  if (!await readCheckbox.isChecked()) {
    await readCheckbox.check();
  }
  await panel.getByRole("button", { name: /Save User Permission/i }).click();
  await panel.getByText(lowPrivEmail).last().waitFor({ timeout: 20_000 });
}

async function openCrmLeadList() {
  await ensureRouteReady(`${base}/crm_lead`);
  await page.getByRole("heading", { name: /leads/i }).waitFor({ timeout: 20_000 }).catch(() => null);
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
  if (await phoneField.count()) {
    await phoneField.fill("9876543210");
  }
  const sourceField = page.locator('select[name="source"]');
  if (await sourceField.count()) {
    await sourceField.selectOption("Website");
  }
  const statusField = page.locator('select[name="status"]');
  if (await statusField.count()) {
    await statusField.selectOption("Qualified");
  }
  const ownerField = page.locator('[name="owner_name"]');
  if (!await ownerField.count()) {
    throw new Error("CRM Lead owner_name field is missing, so record-level permission proof cannot run.");
  }
  await ownerField.fill(ownerName);
  await page.locator('textarea[name="notes"]').fill(notes);
  await page.getByRole("button", { name: /Create (CRM )?Lead/i }).click();
  await page.waitForLoadState("networkidle").catch(() => null);
}

async function openLeadByName(leadName) {
  const row = page.locator("tbody tr").filter({ hasText: leadName }).first();
  await row.waitFor({ timeout: 20_000 });
  const linkButton = row.locator(".link-button").first();
  if (await linkButton.count()) {
    await linkButton.click();
    return;
  }
  await row.getByRole("button", { name: /^View$/i }).click();
}

async function assertNoPageErrors() {
  if (pageErrors.length > 0 || consoleMessages.length > 0) {
    throw new Error(`Page errors detected.\nPAGE_ERRORS:\n${pageErrors.join("\n") || "none"}\nCONSOLE_ERRORS:\n${consoleMessages.join("\n") || "none"}`);
  }
}

const results = {
  roleName,
  outDir,
  allowedLeadName,
  blockedLeadName,
  checks: {
    adminLogin: false,
    salesRestrictedRoleCreated: false,
    level0VisibleInManager: false,
    level1VisibleInManager: false,
    grantViewCrmLeadOnly: false,
    grantLevel0Read: false,
    level1ReadNotGranted: false,
    lowPrivRoleAssigned: false,
    normalFieldsVisible: false,
    level1FieldHiddenOrMasked: false,
    createBlocked: false,
    updateBlocked: false,
    userPermissionRuleSaved: false,
    allowedRecordVisible: false,
    blockedRecordHidden: false,
    noPageErrors: false,
  },
};

try {
  await waitForAppReady();
  await login(adminEmail, adminPassword);
  results.checks.adminLogin = true;

  await createLead(allowedLeadName, lowPrivEmail, "Allowed lead created by Phase 6.5 verification.");
  await createLead(blockedLeadName, "another.owner@example.com", "Blocked lead created by Phase 6.5 verification.");
  await snap("01-admin-leads-created.png");

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

  await selectCrmLeadTarget();
  await assertPermlevelUnchecked(1, 0, "Level 1 read");
  await assertPermlevelUnchecked(1, 1, "Level 1 write");
  results.checks.grantLevel0Read = true;
  results.checks.level1ReadNotGranted = true;
  await snap("02-access-control-configured.png");

  await assignRestrictedRoleToLowPrivUser();
  results.checks.lowPrivRoleAssigned = true;

  await addUserPermissionRule();
  results.checks.userPermissionRuleSaved = true;
  await snap("03-user-permission-rule.png");

  await logout();
  await login(lowPrivEmail, lowPrivPassword);
  await openCrmLeadList();

  await assertHidden(page.getByRole("button", { name: /\+ create/i }), "Create");
  results.checks.createBlocked = true;
  await assertHidden(page.getByRole("button", { name: /Export CSV/i }), "Export CSV");
  await assertHidden(page.getByRole("button", { name: /Import CSV/i }), "Import CSV");

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
  results.checks.level1FieldHiddenOrMasked = true;

  await openLeadByName(allowedLeadName);
  await page.getByText(/CRM Lead Detail/i).waitFor({ timeout: 20_000 }).catch(() => null);
  await assertVisible(page.getByText(/Lead Name/i).first(), "Lead Name label");
  await assertVisible(page.getByText(/Company Name/i).first(), "Company Name label");
  await assertVisible(page.getByText(/Owner Name/i).first(), "Owner Name label");
  await assertHidden(page.getByText(/^Email$/i), "Email label");
  await assertHidden(page.getByText(/^Phone$/i), "Phone label");
  await assertHidden(page.getByRole("button", { name: /Edit CRM Lead/i }), "Edit");
  results.checks.updateBlocked = true;
  await snap("04-low-priv-detail.png");

  await assertNoPageErrors();
  results.checks.noPageErrors = true;
  await writeResults({ ok: true, ...results, pageErrors, consoleMessages });
  console.log(JSON.stringify({ ok: true, ...results }, null, 2));
} catch (error) {
  await writeResults({ ok: false, ...results, error: error instanceof Error ? error.message : String(error), pageErrors, consoleMessages });
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
