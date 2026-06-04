import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = "C:/tmp/phase-5-0-crm";
await fs.mkdir(outDir, { recursive: true });

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
const email = process.env.PLAYWRIGHT_TEST_EMAIL;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

if (!email || !password) {
  console.error("Missing browser-test credentials. Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD.");
  process.exit(1);
}

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

async function snap(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

async function waitForAppReady() {
  await page.goto(base, { waitUntil: "networkidle" });
  if (await page.getByLabel(/email/i).count()) {
    await page.getByLabel(/email/i).first().fill(email);
    await page.getByLabel(/password/i).first().fill(password);
    await page.getByRole("button", { name: /login|sign in/i }).first().click();
  }
  await page.waitForLoadState("networkidle");
  await page.getByText("Hippo ERP").first().waitFor({ timeout: 30_000 });

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

async function openWorkspace(workspaceLabel, itemLabel) {
  const group = page.locator(".ws-group", { has: page.getByRole("button", { name: new RegExp(`^${workspaceLabel}$`, "i") }).first() }).first();
  const item = page.getByRole("button", { name: new RegExp(itemLabel, "i") }).first();
  const isCollapsed = await group.locator(".lucide-chevron-right").count().catch(() => 0);
  if (isCollapsed) {
    await page.getByRole("button", { name: new RegExp(workspaceLabel, "i") }).first().click();
    await page.waitForTimeout(250);
  }
  try {
    await item.waitFor({ timeout: 30_000 });
  } catch (error) {
    const buttons = await page.locator("button").allInnerTexts();
    const sidebarHtml = await page.locator(".ws-nav").innerHTML().catch(() => "");
    throw new Error(`Workspace item ${itemLabel} not visible. Buttons: ${buttons.join(" | ")}\nSIDEBAR_HTML:\n${sidebarHtml}`);
  }
  await item.click();
  await page.waitForLoadState("networkidle");
}

async function assertNoPermissionError() {
  const body = await page.locator("body").innerText();
  if (/Permission Required|Permission denied|Access denied/i.test(body)) {
    throw new Error("Permission error visible in UI");
  }
}

async function clearSearchIfPresent() {
  const search = page.getByPlaceholder(/search/i).first();
  if (await search.count()) {
    await search.fill("");
    await page.waitForTimeout(200);
  }
}

async function selectBuilderValue(value) {
  const select = page.locator(".studio-shell select").first();
  await select.waitFor({ timeout: 30_000 });
  await page.waitForFunction((optionValue) => {
    return Boolean(document.querySelector(`.studio-shell select option[value="${optionValue}"]`));
  }, value);
  await select.selectOption(value);
}

async function waitForTextOrValue(text) {
  await page.waitForFunction((needle) => {
    const bodyText = document.body?.innerText ?? "";
    if (bodyText.includes(needle)) return true;
    return Array.from(document.querySelectorAll("input, textarea, select, option")).some((element) => {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return element.value === needle;
      }
      if (element instanceof HTMLSelectElement) {
        return element.value === needle;
      }
      return element instanceof HTMLOptionElement && element.textContent?.includes(needle);
    });
  }, text);
}

async function createLead(name) {
  await openWorkspace("CRM", "Leads");
  await assertNoPermissionError();
  await clearSearchIfPresent();
  await snap("01-crm-leads-list.png");

  await page.getByRole("button", { name: /create/i }).first().click();
  await page.getByRole("heading", { name: /new lead/i }).waitFor({ timeout: 30_000 });
  await page.getByLabel(/lead name/i).fill(name);
  await page.getByLabel(/company name/i).fill("Hippo CRM Demo");
  await page.getByLabel(/^email$/i).fill("lead.phase50@example.com");
  await page.getByLabel(/^phone$/i).fill("9876543210");
  await page.getByLabel(/source/i).selectOption("Referral");
  await page.getByLabel(/status/i).selectOption("New");
  await page.getByLabel(/owner name/i).fill("CRM Owner");
  await page.getByLabel(/notes/i).fill("Phase 5.0 CRM metadata-first lead");
  await page.getByRole("button", { name: /create lead/i }).click();
  await page.waitForLoadState("networkidle");
  await page.getByText(name, { exact: true }).waitFor({ timeout: 30_000 });

  const search = page.getByPlaceholder(/search/i).first();
  await search.fill(name);
  await page.getByText(name, { exact: true }).waitFor({ timeout: 30_000 });
}

async function editLead(name) {
  const row = page.locator("tr", { hasText: name }).first();
  await row.getByRole("button", { name: /^Edit$/i }).click();
  await page.getByRole("heading", { name: /edit lead/i }).waitFor({ timeout: 30_000 });
  await page.getByLabel(/status/i).selectOption("Qualified");
  await page.getByLabel(/owner name/i).fill("CRM Admin");
  await page.getByLabel(/notes/i).fill("Lead updated during CRM verification");
  await page.getByRole("button", { name: /update lead/i }).click();
  await page.waitForLoadState("networkidle");
  await page.locator("tr", { hasText: name }).first().getByText("Qualified", { exact: true }).waitFor({ timeout: 30_000 });
}

async function deactivateLead(name) {
  const row = page.locator("tr", { hasText: name }).first();
  await row.getByRole("button", { name: /^Deactivate$/i }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  if (await page.getByText(name, { exact: true }).count()) {
    throw new Error("Lead still visible after deactivate");
  }
}

async function createOpportunity(name) {
  await openWorkspace("CRM", "Opportunities");
  await assertNoPermissionError();
  await clearSearchIfPresent();
  await snap("02-crm-opportunities-list.png");

  await page.getByRole("button", { name: /create/i }).first().click();
  await page.getByRole("heading", { name: /new opportunity/i }).waitFor({ timeout: 30_000 });
  await page.getByLabel(/opportunity name/i).fill(name);
  await page.getByLabel(/account name/i).fill("Hippo CRM Demo");
  await page.getByLabel(/contact name/i).fill("Anita Contact");
  await page.getByLabel(/stage/i).selectOption("Qualification");
  await page.getByLabel(/expected value/i).fill("125000");
  await page.getByLabel(/expected close date/i).fill("2026-06-30");
  await page.getByLabel(/probability/i).fill("60");
  await page.getByLabel(/notes/i).fill("Phase 5.0 CRM metadata-first opportunity");
  await page.getByRole("button", { name: /create opportunity/i }).click();
  await page.waitForLoadState("networkidle");
  try {
    await page.getByText(name, { exact: true }).waitFor({ timeout: 30_000 });
  } catch (error) {
    await snap("02b-crm-opportunity-create-failure.png");
    const body = await page.locator("body").innerText();
    throw new Error(`Opportunity create did not surface in list for ${name}\nBODY:\n${body}`);
  }

  const search = page.getByPlaceholder(/search/i).first();
  await search.fill(name);
  await page.getByText(name, { exact: true }).waitFor({ timeout: 30_000 });

  const filterSelects = page.locator(".filter-bar select");
  if (await filterSelects.count()) {
    await filterSelects.first().selectOption("Qualification");
    await page.getByText(name, { exact: true }).waitFor({ timeout: 30_000 });
    await filterSelects.first().selectOption("all");
  }
}

async function editOpportunity(name) {
  const row = page.locator("tr", { hasText: name }).first();
  await row.getByRole("button", { name: /^Edit$/i }).click();
  await page.getByRole("heading", { name: /edit opportunity/i }).waitFor({ timeout: 30_000 });
  await page.getByLabel(/stage/i).selectOption("Proposal");
  await page.getByLabel(/expected value/i).fill("175000");
  await page.getByLabel(/notes/i).fill("Opportunity updated during CRM verification");
  await page.getByRole("button", { name: /update opportunity/i }).click();
  await page.waitForLoadState("networkidle");
  await page.locator("tr", { hasText: name }).first().getByText("Proposal", { exact: true }).waitFor({ timeout: 30_000 });
}

async function deactivateOpportunity(name) {
  const row = page.locator("tr", { hasText: name }).first();
  await row.getByRole("button", { name: /^Deactivate$/i }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  if (await page.getByText(name, { exact: true }).count()) {
    throw new Error("Opportunity still visible after deactivate");
  }
}

async function openMetadataStudioHome() {
  const openBuilderHome = page.getByRole("button", { name: /open builder home/i }).first();
  if (!await openBuilderHome.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^Metadata Studio$/i }).first().click();
    await page.waitForTimeout(250);
  }
  await openBuilderHome.waitFor({ timeout: 30_000 });
  await openBuilderHome.click();
  await page.getByRole("button", { name: /start with doctype builder/i }).waitFor({ timeout: 30_000 });
  await snap("03-metadata-studio-home-crm.png");
}

async function inspectDocTypeBuilder(doctypeKey) {
  await page.getByRole("button", { name: /^DocTypes$/i }).first().click();
  await selectBuilderValue(doctypeKey);
  await page.waitForFunction((value) => {
    const select = document.querySelector(".studio-shell select");
    return select instanceof HTMLSelectElement && select.value === value;
  }, doctypeKey);
  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll(".studio-shell select"))
      .some((element) => element instanceof HTMLSelectElement && element.value === "generic_json");
  });
  await snap(`04-doctype-builder-${doctypeKey}.png`);
}

async function inspectFieldBuilder(doctypeKey, fieldText) {
  await page.getByRole("button", { name: /^DocFields$/i }).first().click();
  await selectBuilderValue(doctypeKey);
  await page.waitForFunction((value) => {
    const select = document.querySelector(".studio-shell select");
    return select instanceof HTMLSelectElement && select.value === value;
  }, doctypeKey);
  await waitForTextOrValue("Add Field");
  await snap(`05-field-builder-${doctypeKey}.png`);
}

async function inspectListViewBuilder(doctypeKey, fieldText) {
  await page.getByRole("button", { name: /^List Views$/i }).first().click();
  await selectBuilderValue(doctypeKey);
  await page.waitForFunction((value) => {
    const select = document.querySelector(".studio-shell select");
    return select instanceof HTMLSelectElement && select.value === value;
  }, doctypeKey);
  await waitForTextOrValue("Available Fields");
  await snap(`06-list-view-builder-${doctypeKey}.png`);
}

async function inspectFormLayoutBuilder(doctypeKey, sectionText) {
  await page.getByRole("button", { name: /^Form Layouts$/i }).first().click();
  await selectBuilderValue(doctypeKey);
  await page.waitForFunction((value) => {
    const select = document.querySelector(".studio-shell select");
    return select instanceof HTMLSelectElement && select.value === value;
  }, doctypeKey);
  await waitForTextOrValue("Assign Fields");
  await snap(`07-form-layout-builder-${doctypeKey}.png`);
}

async function inspectAccessBuilder(doctypeKey, permissionKey) {
  await page.getByRole("button", { name: /^DocType Actions$/i }).first().click();
  await selectBuilderValue(doctypeKey);
  await page.waitForFunction((value) => {
    const select = document.querySelector(".studio-shell select");
    return select instanceof HTMLSelectElement && select.value === value;
  }, doctypeKey);
  await page.getByText("Enabled").first().waitFor({ timeout: 30_000 });
  await snap(`08-access-builder-${doctypeKey}.png`);
}

async function inspectMenuBuilder() {
  await page.getByRole("button", { name: /^Workspace Items$/i }).first().click();
  await selectBuilderValue("crm");
  await page.getByText("Leads", { exact: true }).waitFor({ timeout: 30_000 });
  await page.getByText("Opportunities", { exact: true }).waitFor({ timeout: 30_000 });
  await snap("09-menu-builder-crm.png");
}

async function runChecklist(doctypeKey) {
  await page.getByRole("button", { name: /^DocType Actions$/i }).first().click();
  await selectBuilderValue(doctypeKey);
  await page.getByRole("button", { name: /open check \/ repair doctype/i }).first().click();
  await page.getByRole("heading", { name: /check \/ repair doctype/i }).waitFor({ timeout: 30_000 });
  const input = page.getByPlaceholder(/enter doctype key/i);
  if (await input.count()) {
    await input.fill(doctypeKey);
    await page.getByRole("button", { name: /^Check$/i }).click();
  }
  await page.getByText("DocType exists", { exact: true }).waitFor({ timeout: 30_000 });
  await page.getByText("Route/API can resolve", { exact: true }).waitFor({ timeout: 30_000 });
  const body = await page.locator("body").innerText();
  if (/No default|Permission denied|Unknown DocType/i.test(body)) {
    throw new Error(`Checklist reported an error for ${doctypeKey}`);
  }
  await snap(`10-checklist-${doctypeKey}.png`);
}

const leadName = `Lead Phase 5.0 ${Date.now()}`;
const oppName = `Opportunity Phase 5.0 ${Date.now()}`;
const result = { outDir, leadName, oppName };

try {
  await waitForAppReady();
  await createLead(leadName);
  await editLead(leadName);
  await deactivateLead(leadName);
  result.leadCrud = true;

  await createOpportunity(oppName);
  await editOpportunity(oppName);
  await deactivateOpportunity(oppName);
  result.opportunityCrud = true;

  await openMetadataStudioHome();
  await inspectDocTypeBuilder("crm_lead");
  await inspectFieldBuilder("crm_lead", "Lead Name");
  await inspectListViewBuilder("crm_lead", "Lead Name");
  await inspectFormLayoutBuilder("crm_lead", "Lead Details");
  await inspectAccessBuilder("crm_lead", "view_crm_lead");

  await inspectDocTypeBuilder("crm_opportunity");
  await inspectFieldBuilder("crm_opportunity", "Opportunity Name");
  await inspectListViewBuilder("crm_opportunity", "Opportunity Name");
  await inspectFormLayoutBuilder("crm_opportunity", "Deal Details");
  await inspectAccessBuilder("crm_opportunity", "view_crm_opportunity");

  await inspectMenuBuilder();
  await runChecklist("crm_lead");
  await runChecklist("crm_opportunity");
  result.builderInspection = true;

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
