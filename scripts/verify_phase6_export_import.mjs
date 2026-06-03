import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = "C:/tmp/phase-6-2-export-import";
await fs.mkdir(outDir, { recursive: true });

const base = "http://127.0.0.1:4173";
const email = "saikumarbali555@gmail.com";
const password = "Hippo@123";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const pageErrors = [];
const consoleMessages = [];

page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("console", (msg) => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));

async function snap(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

async function waitForAppReady() {
  // Wait until the app is truly ready (no "Loading" text, auth resolved)
  for (let attempt = 0; attempt < 20; attempt++) {
    const body = await page.locator("body").innerText().catch(() => "");
    if (!/loading/i.test(body) || body.length > 50) return;
    await page.waitForTimeout(1500);
  }
}

async function login() {
  console.log("Navigating to login...");
  await page.goto(`${base}/login`, { waitUntil: "networkidle", timeout: 15_000 });
  await page.waitForTimeout(2000);

  // Check if already logged in (logout button visible)
  if (await page.getByRole("button", { name: /logout/i }).count()) {
    console.log("Already logged in");
    return;
  }

  // Fill login form
  const emailInput = page.getByLabel(/email/i).first();
  await emailInput.waitFor({ timeout: 10_000 });
  await emailInput.fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole("button", { name: /login|sign in/i }).first().click();
  await page.waitForTimeout(3000);

  // Wait for logout button (indicates successful login)
  await page.getByRole("button", { name: /logout/i }).waitFor({ timeout: 30_000 });
  console.log("Logged in successfully");

  // Select tenant if needed
  const tenantSelect = page.locator("select").filter({ has: page.locator("option") }).first();
  if (await tenantSelect.count()) {
    const current = await tenantSelect.inputValue().catch(() => "");
    if (!current) {
      const opts = await tenantSelect.locator("option").count();
      if (opts > 0) {
        await tenantSelect.selectOption({ index: 0 });
        await page.waitForTimeout(3000);
      }
    }
  }
  await waitForAppReady();
}

const SIDEBAR_LABELS = { crm_lead: "Leads", crm_opportunity: "Opportunities" };

async function navigateTo(pageKey) {
  console.log(`Navigating to ${pageKey}...`);
  const label = SIDEBAR_LABELS[pageKey] || pageKey.replace(/_/g, " ");

  // Go to home base first, then use sidebar buttons (client-side navigation)
  await page.goto(base, { waitUntil: "networkidle", timeout: 15_000 });
  await page.waitForTimeout(2000);

  // Wait until sidebar renders the target item, then click it
  const sidebarBtn = page.getByRole("button", { name: new RegExp(label, "i") });
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await sidebarBtn.count()) {
      await sidebarBtn.click();
      await page.waitForTimeout(3000);
      break;
    }
    await page.waitForTimeout(1500);
  }

  await snap(`${pageKey}-list.png`);
  const body = await page.locator("body").innerText();
  console.log("Page body:", body.substring(0, 800));
  return body;
}

async function verifyExportButton() {
  console.log("Verifying Export CSV button...");
  const exportBtn = page.getByRole("button", { name: /export csv/i });
  if (await exportBtn.count()) {
    console.log("Export CSV button: VISIBLE");
    await snap("02-export-button-visible.png");
    return true;
  }
  console.log("Export CSV button: NOT VISIBLE");
  return false;
}

async function verifyTemplateButton() {
  console.log("Verifying Template button...");
  const tmplBtn = page.getByRole("button", { name: /template/i });
  if (await tmplBtn.count()) {
    console.log("Template button: VISIBLE");
    await snap("03-template-button-visible.png");
    return true;
  }
  console.log("Template button: NOT VISIBLE");
  return false;
}

async function verifyImportButton() {
  console.log("Verifying Import CSV button...");
  const importBtn = page.getByRole("button", { name: /import csv/i });
  if (await importBtn.count()) {
    console.log("Import CSV button: VISIBLE");
    await snap("04-import-button-visible.png");
    return true;
  }
  console.log("Import CSV button: NOT VISIBLE");
  return false;
}

async function testImportValidation() {
  console.log("Testing Import dialog validation...");
  await page.getByRole("button", { name: /import csv/i }).click();
  await page.waitForTimeout(1000);
  await snap("05-import-dialog-opened.png");

  // Paste invalid CSV (missing required lead_name, bad Select value)
  const csv = "Lead Name,Status,Expected Revenue\n,InvalidStatus,abc\n";
  const textarea = page.locator("textarea");
  await textarea.fill(csv);
  await page.waitForTimeout(500);

  // Click Preview Import
  await page.getByRole("button", { name: /preview import/i }).click();
  await page.waitForTimeout(1000);
  await snap("06-import-preview-errors.png");

  const body = await page.locator("body").innerText();
  const hasRequiredError = body.includes("required") || body.includes("Lead Name");
  const hasSelectError = body.includes("one of") || body.includes("InvalidStatus");
  console.log(`Required field error detected: ${hasRequiredError}`);
  console.log(`Select validation error detected: ${hasSelectError}`);

  // Close dialog
  await page.getByRole("button", { name: /close|back|done/i }).first().click();
  await page.waitForTimeout(500);
  return { hasRequiredError, hasSelectError };
}

// ── Main ────────────────────────────────────────────────────────────────────────
try {
  await login();

  // Test CRM Lead
  const leadBody = await navigateTo("crm_lead");
  const hasExport = leadBody.includes("Lead") && await verifyExportButton();
  const hasTemplate = leadBody.includes("Lead") && await verifyTemplateButton();
  const hasImport = leadBody.includes("Lead") && await verifyImportButton();
  let importResult = { hasRequiredError: false, hasSelectError: false };
  if (hasImport) {
    importResult = await testImportValidation();
  }

  // Test CRM Opportunity
  const oppBody = await navigateTo("crm_opportunity");
  const oppHasExport = oppBody.includes("Opportunity") && await verifyExportButton();
  const oppHasTemplate = oppBody.includes("Opportunity") && await verifyTemplateButton();
  const oppHasImport = oppBody.includes("Opportunity") && await verifyImportButton();

  // ── Results ──
  console.log("\n══════════════════════════════════");
  console.log("  PHASE 6.2 BROWSER VERIFICATION");
  console.log("══════════════════════════════════");
  console.log(`  CRM Lead Export button:        ${hasExport ? "✅" : "❌"}`);
  console.log(`  CRM Lead Template button:      ${hasTemplate ? "✅" : "❌"}`);
  console.log(`  CRM Lead Import button:        ${hasImport ? "✅" : "❌"}`);
  console.log(`  Import missing required field: ${importResult.hasRequiredError ? "✅" : "❌"}`);
  console.log(`  Import bad Select value:       ${importResult.hasSelectError ? "✅" : "❌"}`);
  console.log(`  CRM Opp Export button:         ${oppHasExport ? "✅" : "❌"}`);
  console.log(`  CRM Opp Template button:       ${oppHasTemplate ? "✅" : "❌"}`);
  console.log(`  CRM Opp Import button:         ${oppHasImport ? "✅" : "❌"}`);
  console.log("");
  console.log(`  Page errors: ${pageErrors.length}`);
  if (pageErrors.length) pageErrors.forEach((e) => console.log(`    ${e}`));
  console.log("══════════════════════════════════\n");

  await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify({
    crmLead: { export: hasExport, template: hasTemplate, import: hasImport, importValidation: importResult },
    crmOpportunity: { export: oppHasExport, template: oppHasTemplate, import: oppHasImport },
    pageErrors,
  }, null, 2));

} catch (error) {
  console.error("Verification error:", error.message);
  await snap("error-state.png");
  const body = await page.locator("body").innerText().catch(() => "");
  console.log("Body:", body.substring(0, 500));
  console.log("Console messages:", consoleMessages.slice(-20).join("\n"));
} finally {
  await browser.close();
}
