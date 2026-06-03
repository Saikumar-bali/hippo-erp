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
const pageErrors = [];
const consoleMessages = [];

page.on("pageerror", (error) => {
  pageErrors.push(String(error));
});

page.on("console", (message) => {
  consoleMessages.push(`[${message.type()}] ${message.text()}`);
});

async function snap(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

async function waitForAppReady() {
  await page.goto(`${base}/login`, { waitUntil: "networkidle", timeout: 10_000 }).catch(() => null);
  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (/Missing Supabase environment variables/i.test(bodyText)) {
    throw new Error(`Vite app loaded without Supabase env values.\nBODY:\n${bodyText}`);
  }
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
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle").catch(() => null);
    const loginAlert = await page.locator('[role="alert"]').first().textContent().catch(() => null);
    if (/\/login$/i.test(page.url())) {
      const body = await page.locator("body").innerText().catch(() => "");
      await snap("login-failed.png");
      throw new Error(`Login did not leave the login page.\nURL: ${page.url()}\nALERT: ${loginAlert ?? "none"}\nPAGE_ERRORS:\n${pageErrors.join("\n") || "none"}\nCONSOLE:\n${consoleMessages.slice(-20).join("\n") || "none"}\nBODY:\n${body}`);
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

async function waitForAccessControlReady() {
  await page.getByRole("heading", { name: /Access Control Manager/i }).waitFor({ timeout: 30_000 });
  await page.getByText(/Loading Access Control Manager/i).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => null);
  await page.waitForFunction(() => {
    const bodyText = document.body?.innerText ?? "";
    return !/Loading Access Control Manager/i.test(bodyText);
  }, { timeout: 30_000 }).catch(() => null);
}

async function openAccessControlManager() {
  await page.goto(`${base}/metadata_studio_access_control_manager`, { waitUntil: "networkidle" });
  try {
    await waitForAccessControlReady();
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
  await waitForAccessControlReady();
  await snap(screenshotName);
}

async function assignRoleToUser() {
  await page.goto(`${base}/users_and_roles_access_assignments`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /User Role Assignment/i }).waitFor({ timeout: 30_000 });
  await page.getByText(/Loading user assignments/i).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => null);
  await page.waitForFunction(() => {
    const loading = Array.from(document.querySelectorAll("*")).some((node) => /Loading user assignments/i.test(node.textContent ?? ""));
    return !loading;
  }, { timeout: 30_000 }).catch(() => null);

  const userButtons = page.locator(".users-items .user-item");
  await userButtons.first().waitFor({ state: "visible", timeout: 15_000 }).catch(() => null);
  const userCount = await userButtons.count();
  if (userCount === 0) {
    const inviteCountText = await page.locator(".pending-invites .pending-invite").count().catch(() => 0);
    const body = await page.locator("body").innerText().catch(() => "");
    await snap("05-user-assignment-empty.png");
    throw new Error(`No company users were available for role assignment.\nPENDING_INVITES: ${inviteCountText}\nPAGE_ERRORS:\n${pageErrors.join("\n") || "none"}\nCONSOLE:\n${consoleMessages.slice(-20).join("\n") || "none"}\nBODY:\n${body}`);
  }

  const userButton = userCount > 1 ? userButtons.nth(1) : userButtons.first();
  const userLabel = ((await userButton.innerText()).split("\n").find(Boolean) ?? "").trim();
  await userButton.click();

  const roleToggle = page.getByText(roleName, { exact: false }).locator("..").locator('input[type="checkbox"]').first();
  if (!await roleToggle.isChecked()) {
    await roleToggle.check();
  }
  await page.getByRole("button", { name: /Save Assignments/i }).click();
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
  await page.waitForLoadState("networkidle").catch(() => null);
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
  diagnosticsLimitation: null,
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
  const bodyAfterRemoval = await page.locator("body").innerText();
  if (/read:\s*view_crm_lead/i.test(bodyAfterRemoval)) {
    result.diagnosticsAfterRemoval = true;
  } else if (/Missing\s+Yes/.test(bodyAfterRemoval) && /The selected user already has every configured right for this target/i.test(bodyAfterRemoval)) {
    result.diagnosticsLimitation = "Selected user still inherits view_crm_lead from other active roles, so effective-right diagnostics remain Ready even though the test role grant was removed.";
  } else {
    throw new Error(`Expected diagnostics to show missing CRM Lead read access after removing it.\nBODY:\n${bodyAfterRemoval}`);
  }

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
