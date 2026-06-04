import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = process.env.PHASE6_PRINT_OUT_DIR || "C:/tmp/phase-6-3-print-format";
await fs.mkdir(outDir, { recursive: true });

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
const email = process.env.PLAYWRIGHT_TEST_EMAIL;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD;
const tenantId = process.env.PHASE6_TEST_TENANT_ID;

if (!email || !password) {
  console.error("Missing browser-test credentials. Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD.");
  process.exit(1);
}

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const pageErrors = [];
const consoleMessages = [];

page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("console", (message) => consoleMessages.push(`[${message.type()}] ${message.text()}`));

const results = {
  leadPrintButton: false,
  leadPreviewOpens: false,
  leadBrandingVisible: false,
  leadSectionsVisible: false,
  oppPrintButton: false,
  oppPreviewOpens: false,
  oppSectionsVisible: false,
  browserPrintBtnExists: false,
  noPageErrors: true,
};

async function snap(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

const SIDEBAR_LABELS = {
  crm_lead: "Leads",
  crm_opportunity: "Opportunities",
};

async function waitForAppReady() {
  console.log("Navigating to login...");
  await page.goto(`${base}/login`, { waitUntil: "networkidle", timeout: 10_000 }).catch(() => null);
  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (/Missing Supabase environment variables/i.test(bodyText)) {
    throw new Error(`Vite app loaded without Supabase env values.\nBODY:\n${bodyText}`);
  }

  await page.goto(base, { waitUntil: "networkidle", timeout: 10_000 }).catch(() => null);

  if (await page.getByLabel(/email/i).count()) {
    await page.getByLabel(/email/i).first().fill(email);
    await page.getByLabel(/password/i).first().fill(password);
    await page.getByRole("button", { name: /login|sign in/i }).first().click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle").catch(() => null);
    if (/\/login$/i.test(page.url())) {
      const currentBody = await page.locator("body").innerText().catch(() => "");
      await snap("login-failed.png");
      throw new Error(`Login did not leave the login page.\nURL: ${page.url()}\nBODY:\n${currentBody}`);
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

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
}

async function navigateToDocType(pageKey) {
  const label = SIDEBAR_LABELS[pageKey] || pageKey.replace(/_/g, " ");
  await page.goto(base, { waitUntil: "networkidle", timeout: 15_000 });
  await page.waitForTimeout(2000);

  const crmGroupBtn = page.getByRole("button", { name: /^CRM$/i }).first();
  if (await crmGroupBtn.count()) {
    await crmGroupBtn.click();
    await page.waitForTimeout(800);
  }

  const sidebarBtn = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await sidebarBtn.count()) {
      await sidebarBtn.click();
      await page.waitForTimeout(5000);
      await snap(`${pageKey}-list.png`);
      return;
    }
    await page.waitForTimeout(1500);
  }

  throw new Error(`Sidebar item not found for ${pageKey}`);
}

try {
  await waitForAppReady();
  console.log("Logged in successfully");

  if (tenantId) {
    await page.evaluate((value) => {
      localStorage.setItem("tenant_id", value);
    }, tenantId);
    await page.goto(base, { waitUntil: "networkidle", timeout: 15_000 });
    await page.waitForTimeout(3000);
  }

  // 1. CRM Lead Verification
  console.log("Navigating to CRM Lead...");
  await navigateToDocType("crm_lead");
  
  let firstLead = page.locator("button.link-button").first();
  if (await firstLead.count() === 0) {
    firstLead = page.locator('button:has-text("View")').first();
  }
  if (await firstLead.count() === 0) {
    console.log("Creating test lead...");
    await page.click('button:has-text("+ Create")');
    await page.fill('input[name="lead_name"]', "Test Verification Lead");
    await page.fill('input[name="company_name"]', "Verify Co");
    await page.click('button.primary-action:has-text("Create")');
    await page.waitForTimeout(5000);
    firstLead = page.locator("button.link-button").first();
    if (await firstLead.count() === 0) {
      firstLead = page.locator('button:has-text("View")').first();
    }
  }
  
  if (await firstLead.count() > 0) {
    await firstLead.click();
    await page.waitForTimeout(3000);
    await snap("01-lead-detail.png");
    const printBtn = page.locator('button:has-text("Print")');
    if (await printBtn.count() > 0) {
      results.leadPrintButton = true;
      await printBtn.click();
      await page.waitForSelector('h1:has-text("Print Preview")', { timeout: 15000 });
      results.leadPreviewOpens = true;
      await page.waitForTimeout(2000);
      await snap("02-lead-print-preview.png");
      const bodyText = await page.innerText('body');
      results.leadBrandingVisible = /hippo erp/i.test(bodyText);
      results.leadSectionsVisible = /lead details/i.test(bodyText) && /qualification/i.test(bodyText) && /notes/i.test(bodyText);
      results.browserPrintBtnExists = await page.getByRole("button", { name: /^print$/i }).count() >= 1;
    }
  }

  // 2. CRM Opportunity Verification
  console.log("Navigating to CRM Opportunity...");
  await navigateToDocType("crm_opportunity");
  
  let firstOpp = page.locator("button.link-button").first();
  if (await firstOpp.count() === 0) {
    firstOpp = page.locator('button:has-text("View")').first();
  }
  if (await firstOpp.count() === 0) {
    console.log("Creating test opportunity...");
    await page.click('button:has-text("+ Create")');
    await page.fill('input[name="opportunity_name"]', "Test Verification Opportunity");
    await page.fill('input[name="account_name"]', "Verify Co");
    await page.click('button.primary-action:has-text("Create")');
    await page.waitForTimeout(5000);
    firstOpp = page.locator("button.link-button").first();
    if (await firstOpp.count() === 0) {
      firstOpp = page.locator('button:has-text("View")').first();
    }
  }

  if (await firstOpp.count() > 0) {
    await firstOpp.click();
    await page.waitForTimeout(3000);
    await snap("03-opp-detail.png");
    const printBtn = page.locator('button:has-text("Print")');
    if (await printBtn.count() > 0) {
      results.oppPrintButton = true;
      await printBtn.click();
      await page.waitForSelector('h1:has-text("Print Preview")', { timeout: 15000 });
      results.oppPreviewOpens = true;
      await page.waitForTimeout(2000);
      await snap("04-opp-print-preview.png");
      const bodyText = await page.innerText('body');
      results.oppSectionsVisible = /deal details/i.test(bodyText) && /forecast/i.test(bodyText) && /notes/i.test(bodyText);
    }
  }

  results.noPageErrors = pageErrors.length === 0;

  const output = {
    baseUrl: base,
    envNamesUsed: ["PLAYWRIGHT_TEST_EMAIL", "PLAYWRIGHT_TEST_PASSWORD", "PLAYWRIGHT_BASE_URL", "PLAYWRIGHT_HEADLESS", "PHASE6_PRINT_OUT_DIR", "PHASE6_TEST_TENANT_ID"],
    results,
    pageErrors,
    consoleMessages: consoleMessages.slice(-50),
  };

  await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(output, null, 2));

  console.log("\n══════════════════════════════════");
  console.log("  PHASE 6.3 PRINT VERIFICATION");
  console.log("══════════════════════════════════");
  for (const [key, value] of Object.entries(results)) {
    console.log(`  ${key.padEnd(24)} ${value ? "✅" : "❌"}`);
  }
  console.log("══════════════════════════════════\n");

  if (!Object.values(results).every(Boolean)) {
    console.error("Phase 6.3 print verification failed. See results.json for details.");
    process.exitCode = 1;
  } else {
    await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(output, null, 2));
  }

  const failedChecks = Object.entries(results)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failedChecks.length > 0) {
    throw new Error(`Print verification failed checks: ${failedChecks.join(", ")}`);
  }
} catch (error) {
  console.error("Verification error:", error instanceof Error ? error.message : String(error));
  await snap("error-state.png");
  const body = await page.locator("body").innerText().catch(() => "");
  await fs.writeFile(
    path.join(outDir, "error.json"),
    JSON.stringify({ error: error instanceof Error ? error.message : String(error), body, pageErrors, consoleMessages: consoleMessages.slice(-50) }, null, 2),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
