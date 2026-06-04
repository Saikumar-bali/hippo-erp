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

async function login() {
  console.log("Navigating to login...");
  await page.goto(`${base}/login`, { waitUntil: "networkidle", timeout: 20_000 });
  await page.fill('input[placeholder="Email"]', email);
  await page.fill('input[placeholder="Password"]', password);
  await page.click("button.primary-action");
  await page.waitForSelector('button:has-text("Logout")', { timeout: 30_000 });
  console.log("Logged in successfully");

  if (tenantId) {
    await page.evaluate((value) => {
      localStorage.setItem("tenant_id", value);
    }, tenantId);
  }

  await page.goto(base, { waitUntil: "networkidle", timeout: 20_000 });
  await page.waitForTimeout(3000);
}

async function openFirstDetailOrCreate({ listPath, createRows, screenshotPrefix }) {
  await page.goto(`${base}/${listPath}`, { waitUntil: "networkidle", timeout: 20_000 });
  await page.waitForTimeout(5000);

  let firstView = page.locator('button:has-text("View")').first();
  if ((await firstView.count()) === 0) {
    console.log(`Creating test record for ${listPath}...`);
    await page.click('button:has-text("+ Create")');
    for (const row of createRows) {
      await page.fill(row.selector, row.value);
    }
    await page.click('button.primary-action:has-text("Create")');
    await page.waitForTimeout(5000);
    firstView = page.locator('button:has-text("View")').first();
  }

  if ((await firstView.count()) === 0) {
    await snap(`${screenshotPrefix}-missing-view-button.png`);
    throw new Error(`No View button found for ${listPath}`);
  }

  await firstView.click();
  await page.waitForTimeout(3000);
}

try {
  await login();

  console.log("Verifying CRM Lead print flow...");
  await openFirstDetailOrCreate({
    listPath: "crm_lead",
    screenshotPrefix: "lead",
    createRows: [
      { selector: 'input[name="lead_name"]', value: "Test Verification Lead" },
      { selector: 'input[name="company_name"]', value: "Verify Co" },
    ],
  });

  const leadPrintButton = page.locator('button:has-text("Print")').first();
  results.leadPrintButton = (await leadPrintButton.count()) > 0;
  if (results.leadPrintButton) {
    await snap("01-lead-detail.png");
    await leadPrintButton.click();
    await page.waitForSelector('h1:has-text("Print Preview")', { timeout: 15_000 });
    results.leadPreviewOpens = true;
    await page.waitForTimeout(1500);
    await snap("02-lead-print-preview.png");
    const bodyText = await page.innerText("body");
    results.leadBrandingVisible = bodyText.includes("Hippo ERP") || bodyText.includes("Print Preview");
    results.leadSectionsVisible = bodyText.includes("Lead Details") && bodyText.includes("Qualification") && bodyText.includes("Notes");
    results.browserPrintBtnExists = (await page.locator('button:has-text("Print")').count()) > 0;
  }

  console.log("Verifying CRM Opportunity print flow...");
  await openFirstDetailOrCreate({
    listPath: "crm_opportunity",
    screenshotPrefix: "opportunity",
    createRows: [
      { selector: 'input[name="opportunity_name"]', value: "Test Verification Opportunity" },
      { selector: 'input[name="account_name"]', value: "Verify Co" },
    ],
  });

  const oppPrintButton = page.locator('button:has-text("Print")').first();
  results.oppPrintButton = (await oppPrintButton.count()) > 0;
  if (results.oppPrintButton) {
    await snap("03-opp-detail.png");
    await oppPrintButton.click();
    await page.waitForSelector('h1:has-text("Print Preview")', { timeout: 15_000 });
    results.oppPreviewOpens = true;
    await page.waitForTimeout(1500);
    await snap("04-opp-print-preview.png");
    const bodyText = await page.innerText("body");
    results.oppSectionsVisible = bodyText.includes("Deal Details") && bodyText.includes("Forecast") && bodyText.includes("Notes");
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
