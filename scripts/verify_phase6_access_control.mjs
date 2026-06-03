import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = "C:/tmp/phase-6-0-access-control";
await fs.mkdir(outDir, { recursive: true });

const base = "http://127.0.0.1:4173";
const email = "saikumarbali555@gmail.com";
const password = "Hippo@123";
const roleName = `Phase6 CRM Access ${Date.now()}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

async function snap(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

async function waitForAppReady() {
  let lastError = null;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await page.goto(base, { waitUntil: "networkidle", timeout: 10_000 });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1500);
    }
  }
  if (lastError) {
    throw lastError;
  }
  if (await page.getByLabel(/email/i).count()) {
    await page.getByLabel(/email/i).first().fill(email);
    await page.getByLabel(/password/i).first().fill(password);
    await page.getByRole("button", { name: /login|sign in/i }).first().click();
    await page.waitForLoadState("networkidle");
    if (/\/login$/i.test(page.url())) {
      const body = await page.locator("body").innerText().catch(() => "");
      throw new Error(`Login did not leave the login page.\nURL: ${page.url()}\nBODY:\n${body}`);
    }
  }
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /logout/i }).waitFor({ timeout: 30_000 });

  const tenantSelect = page.locator(".tenant-selector select");
  if (await tenantSelect.count()) {
    const current = await tenantSelect.inputValue();
    if (!current) {
      const options = await tenantSelect.locator("option").count();
      if (options > 0) {
        await tenantSelect.selectOption({ index: 0 });
      }
    }
  }
  await page.waitForLoadState("networkidle");
}

async function openAccessControlManager() {
  await page.goto(`${base}/metadata_studio_access_control_manager`, { waitUntil: "networkidle" });
  try {
    await page.getByRole("heading", { name: /Access Control Manager/i }).waitFor({ timeout: 30_000 });
  } catch (error) {
    await snap("debug-access-control-open-failure.png");
    const body = await page.locator("body").innerText().catch(() => "");
    throw new Error(`Access Control Manager route did not load.\nURL: ${page.url()}\nBODY:\n${body}`);
  }
}

async function findOptionLabel(selectLocator, matcher) {
  const labels = await selectLocator.locator("option").allTextContents();
  const match = labels.find((label) => matcher(label));
  if (!match) {
    throw new Error(`Expected option was not found. Options: ${labels.join(" | ")}`);
  }
  return match;
}

async function createRole() {
  await page.getByPlaceholder(/Sales Coordinator/i).fill(roleName);
  await page.getByRole("button", { name: /Create Role/i }).click();
  await page.getByRole("button", { name: new RegExp(roleName, "i") }).waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: new RegExp(roleName, "i") }).click();
  await snap("01-access-control-role-created.png");
}

async function selectCrmLeadTarget() {
  const moduleSelect = page.getByLabel(/Module/i);
  const crmModule = await findOptionLabel(moduleSelect, (label) => /crm/i.test(label));
  await moduleSelect.selectOption({ label: crmModule });

  const targetSelect = page.getByLabel(/Select DocType or Target/i);
  const crmLeadLabel = await findOptionLabel(targetSelect, (label) => /crm/i.test(label) && /lead/i.test(label) && /doctype/i.test(label));
  await targetSelect.selectOption({ label: crmLeadLabel });
  await page.getByText(/Rights here stay compatible/i).waitFor({ timeout: 30_000 });
  await snap("02-access-control-crm-lead-target.png");
}

async function setRight(rightKey, nextValue) {
  const row = page.locator("tbody tr").filter({
    has: page.locator("td").filter({ hasText: new RegExp(`^${rightKey}$`, "i") }),
  }).first();
  await row.waitFor({ timeout: 30_000 });
  const checkbox = row.locator('input[type="checkbox"]').first();
  const current = await checkbox.isChecked();
  if (current !== nextValue) {
    await checkbox.click();
  }
}

async function saveRoleChanges(screenshotName) {
  await page.getByRole("button", { name: /Save Role Changes/i }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await snap(screenshotName);
}

async function assignRoleToUser() {
  await page.goto(`${base}/users_roles`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /Users/i }).click();
  await page.getByText(/Company users/i).waitFor({ timeout: 30_000 });

  const userButtons = page.locator(".users-items .user-item");
  const userCount = await userButtons.count();
  if (userCount === 0) {
    throw new Error("No company users were available for role assignment.");
  }

  const userButton = userCount > 1 ? userButtons.nth(1) : userButtons.first();
  const userLabel = ((await userButton.innerText()).split("\n").find(Boolean) ?? "").trim();
  await userButton.click();

  const roleSelect = page.getByLabel(/^Company role$/i);
  await roleSelect.selectOption({ label: roleName });
  await page.getByRole("button", { name: /Save Assignment/i }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await snap("03-users-role-assigned.png");
  return userLabel;
}

async function selectUserInPreview(userLabel) {
  const userSelect = page.getByLabel(/Effective Rights For User/i);
  const matchingLabel = await findOptionLabel(userSelect, (label) => label.toLowerCase().includes(userLabel.toLowerCase()));
  await userSelect.selectOption({ label: matchingLabel });
  await page.waitForTimeout(500);
}

async function assertBodyIncludes(pattern, message) {
  const body = await page.locator("body").innerText();
  if (!pattern.test(body)) {
    throw new Error(`${message}\nBODY:\n${body}`);
  }
}

const result = {
  roleName,
  outDir,
  assignedUser: "",
  createdRole: false,
  grantedLeadRights: false,
  assignedRole: false,
  effectiveRightsShown: false,
  diagnosticsAfterRemoval: false,
  restoredRight: false,
};

try {
  await waitForAppReady();
  await openAccessControlManager();
  await createRole();
  result.createdRole = true;

  await selectCrmLeadTarget();
  await setRight("read", true);
  await setRight("create", true);
  await setRight("update", true);
  await saveRoleChanges("04-crm-lead-rights-granted.png");
  result.grantedLeadRights = true;

  const assignedUser = await assignRoleToUser();
  result.assignedUser = assignedUser;
  result.assignedRole = true;

  await openAccessControlManager();
  await page.getByRole("button", { name: new RegExp(roleName, "i") }).click();
  await selectCrmLeadTarget();
  await selectUserInPreview(assignedUser);
  await assertBodyIncludes(/view_crm_lead/i, "Expected effective rights preview to include CRM Lead read access.");
  await assertBodyIncludes(/create_crm_lead/i, "Expected effective rights preview to include CRM Lead create access.");
  await assertBodyIncludes(/update_crm_lead/i, "Expected effective rights preview to include CRM Lead update access.");
  await snap("05-effective-rights-preview.png");
  result.effectiveRightsShown = true;

  await setRight("read", false);
  await saveRoleChanges("06-right-removed-diagnostics.png");
  await assertBodyIncludes(/read:\s*view_crm_lead/i, "Expected diagnostics to show missing CRM Lead read access after removing it.");
  result.diagnosticsAfterRemoval = true;

  await setRight("read", true);
  await saveRoleChanges("07-right-restored.png");
  const bodyAfterRestore = await page.locator("body").innerText();
  if (/read:\s*view_crm_lead/i.test(bodyAfterRestore)) {
    throw new Error(`CRM Lead read diagnostic still present after restoring the right.\nBODY:\n${bodyAfterRestore}`);
  }
  result.restoredRight = true;

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
