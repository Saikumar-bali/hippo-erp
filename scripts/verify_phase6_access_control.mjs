import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = "C:/tmp/phase-6-4-framework-core";
await fs.mkdir(outDir, { recursive: true });

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
const adminEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
const lowPrivEmail = process.env.PLAYWRIGHT_LOW_PRIV_EMAIL;
const lowPrivPassword = process.env.PLAYWRIGHT_LOW_PRIV_PASSWORD;
const roleName = `Sales Readonly ${Date.now()}`;

if (!adminEmail || !adminPassword || !lowPrivEmail || !lowPrivPassword) {
  console.error("Missing Playwright env vars. Required: PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_TEST_PASSWORD, PLAYWRIGHT_LOW_PRIV_EMAIL, PLAYWRIGHT_LOW_PRIV_PASSWORD.");
  process.exit(1);
}

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
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
      await page.goto(url, { waitUntil: "networkidle", timeout: 12_000 });
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1500);
    }
  }
  throw lastError;
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
  await waitForAccessControlReady();
}

async function openUserAssignments() {
  await gotoApp(`${base}/users_and_roles_access_assignments`);
  await page.getByRole("heading", { name: /User Role Assignment/i }).waitFor({ timeout: 30_000 });
  await page.getByText(/Loading user assignments/i).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => null);
}

async function createReadonlyRole() {
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
  const targetSelect = page.getByLabel(/Select screen or document/i);
  const options = await targetSelect.locator("option").allTextContents();
  const crmLead = options.find((option) => /crm/i.test(option) && /lead/i.test(option) && /doctype/i.test(option));
  if (!crmLead) {
    throw new Error(`CRM Lead target not found. Options: ${options.join(" | ")}`);
  }
  await targetSelect.selectOption({ label: crmLead });
  await page.getByText(/Rights here stay compatible/i).waitFor({ timeout: 20_000 });
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

async function saveRoleAccess(screenshotName) {
  const saveButton = page.getByRole("button", { name: /Save role access/i });
  await saveButton.click();
  await page.getByRole("button", { name: /Saving/i }).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => null);
  await saveButton.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForLoadState("networkidle").catch(() => null);
  await waitForAccessControlReady();
  await snap(screenshotName);
}

async function assignReadonlyRoleToLowPrivUser() {
  await openUserAssignments();
  const userButton = page.locator(".users-items .user-item").filter({
    hasText: lowPrivEmail,
  }).first();
  await userButton.waitFor({ timeout: 20_000 });
  await userButton.click();
  await page.getByRole("button", { name: /Clear All Roles/i }).click();
  const toggle = page.locator(".studio-check").filter({ hasText: roleName }).locator('input[type="checkbox"]').first();
  if (!await toggle.isChecked()) {
    await toggle.check();
  }
  const saveAssignmentsButton = page.getByRole("button", { name: /Save Assignments/i });
  await saveAssignmentsButton.click();
  await page.getByRole("button", { name: /Saving/i }).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => null);
  await saveAssignmentsButton.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForLoadState("networkidle").catch(() => null);
}

async function ensureLeadRecordExists() {
  await gotoApp(`${base}/crm_lead`);
  await page.getByRole("heading", { name: /leads/i }).waitFor({ timeout: 20_000 }).catch(() => null);
  const hasRows = await page.locator("tbody tr").count();
  if (hasRows > 0) return;

  const createButton = page.getByRole("button", { name: /\+ create/i });
  await createButton.waitFor({ timeout: 20_000 });
  await createButton.click();
  await page.getByLabel(/Lead Name/i).fill(`Framework Gate Lead ${Date.now()}`);
  await page.getByLabel(/Company Name/i).fill("Framework Core Verification");
  await page.getByLabel(/^Email/i).fill(`framework.${Date.now()}@example.com`);
  const sourceField = page.locator('select[name="source"]');
  if (await sourceField.count()) {
    await sourceField.selectOption("Website");
  }
  const statusField = page.locator('select[name="status"]');
  if (await statusField.count()) {
    await statusField.selectOption("New");
  }
  await page.locator('textarea[name="notes"]').fill("Created by Phase 6.4 verification.");
  await page.getByRole("button", { name: /Create CRM Lead/i }).click();
  await page.waitForLoadState("networkidle").catch(() => null);
}

async function openFirstLeadRecord() {
  const leadButton = page.locator("tbody tr .link-button").first();
  if (await leadButton.count()) {
    await leadButton.click();
    return;
  }
  await page.getByRole("button", { name: /^View$/i }).first().click();
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

async function assertNoPageErrors() {
  if (pageErrors.length > 0 || consoleMessages.length > 0) {
    throw new Error(`Page errors detected.\nPAGE_ERRORS:\n${pageErrors.join("\n") || "none"}\nCONSOLE_ERRORS:\n${consoleMessages.join("\n") || "none"}`);
  }
}

const results = {
  roleName,
  outDir,
  checks: {
    provisionedRole: false,
    assignedLowPrivRole: false,
    crmLeadVisible: false,
    createHidden: false,
    updateHidden: false,
    deleteHidden: false,
    exportHidden: false,
    importHidden: false,
    printHidden: false,
    forbiddenSidebarHidden: false,
    revokeReadSucceeded: false,
    crmLeadRevokedHiddenOrDenied: false,
    noPageErrors: false,
  },
};

try {
  await waitForAppReady();
  await login(adminEmail, adminPassword);
  await ensureLeadRecordExists();

  await openAccessControlManager();
  await createReadonlyRole();
  await selectCrmLeadTarget();
  await setRight("read", true);
  await setRight("create", false);
  await setRight("update", false);
  await setRight("delete", false);
  await setRight("export", false);
  await setRight("import", false);
  await setRight("print", false);
  await saveRoleAccess("01-role-configured.png");
  results.checks.provisionedRole = true;

  await assignReadonlyRoleToLowPrivUser();
  await snap("02-role-assigned.png");
  results.checks.assignedLowPrivRole = true;

  await logout();
  await login(lowPrivEmail, lowPrivPassword);
  await gotoApp(`${base}/crm_lead`);
  await page.getByText(/LEAD NAME/i).waitFor({ timeout: 20_000 });
  await assertVisible(page.getByRole("button", { name: /^View$/i }).first(), "Lead list view button");
  results.checks.crmLeadVisible = true;

  await assertHidden(page.getByRole("button", { name: /\+ create/i }), "Create");
  results.checks.createHidden = true;
  await assertHidden(page.getByRole("button", { name: /Export CSV/i }), "Export CSV");
  results.checks.exportHidden = true;
  await assertHidden(page.getByRole("button", { name: /Import CSV/i }), "Import CSV");
  results.checks.importHidden = true;

  await openFirstLeadRecord();
  await page.getByText(/CRM Lead Detail/i).waitFor({ timeout: 20_000 }).catch(() => null);
  await assertHidden(page.getByRole("button", { name: /Edit CRM Lead/i }), "Edit");
  results.checks.updateHidden = true;
  await assertHidden(page.getByRole("button", { name: /Deactivate/i }), "Deactivate");
  results.checks.deleteHidden = true;
  await assertHidden(page.getByRole("button", { name: /^Print$/i }), "Print");
  results.checks.printHidden = true;

  const sidebarText = await page.locator(".sidebar").innerText();
  if (/Opportunities/i.test(sidebarText) || /Purchase Orders/i.test(sidebarText) || /Fleet Management/i.test(sidebarText)) {
    throw new Error(`Forbidden sidebar items were visible.\nSIDEBAR:\n${sidebarText}`);
  }
  results.checks.forbiddenSidebarHidden = true;
  await snap("03-low-priv-readonly.png");

  await logout();
  await login(adminEmail, adminPassword);
  await openAccessControlManager();
  await page.getByRole("button", { name: new RegExp(roleName, "i") }).click();
  await selectCrmLeadTarget();
  await setRight("read", false);
  await saveRoleAccess("04-read-revoked.png");
  results.checks.revokeReadSucceeded = true;

  await logout();
  await login(lowPrivEmail, lowPrivPassword);
  await gotoApp(`${base}/crm_lead`);
  const afterRevokeBody = await page.locator("body").innerText();
  const sidebarAfterRevoke = await page.locator(".sidebar").innerText().catch(() => "");
  if (/Access required:\s*view_crm_lead/i.test(afterRevokeBody) || !/Leads/i.test(sidebarAfterRevoke)) {
    results.checks.crmLeadRevokedHiddenOrDenied = true;
  } else {
    throw new Error(`CRM Lead still looked accessible after revoking read.\nBODY:\n${afterRevokeBody}`);
  }

  await assertNoPageErrors();
  results.checks.noPageErrors = true;
  await snap("05-read-revoked-low-priv.png");
  await writeResults(results);
  console.log(JSON.stringify({ ok: true, ...results }, null, 2));
} catch (error) {
  await writeResults({ ok: false, ...results, error: error instanceof Error ? error.message : String(error), pageErrors, consoleMessages });
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
