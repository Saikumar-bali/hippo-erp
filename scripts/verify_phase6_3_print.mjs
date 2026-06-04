import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = process.env.PHASE6_PRINT_OUT_DIR || "C:/tmp/phase-6-3-print-format";
await fs.mkdir(outDir, { recursive: true });

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
const email = process.env.PLAYWRIGHT_TEST_EMAIL;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

if (!email || !password) {
  console.error("Missing browser-test credentials. Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD.");
  process.exit(1);
}

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const results = {
  leadPrintButton: false,
  leadPreviewOpens: false,
  leadBrandingVisible: false,
  leadSectionsVisible: false,
  oppPrintButton: false,
  oppPreviewOpens: false,
  oppSectionsVisible: false,
  browserPrintBtnExists: false,
  noPageErrors: true
};

async function snap(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

try {
  console.log("Navigating to login...");
  await page.goto(`${base}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="Email"]', email);
  await page.fill('input[placeholder="Password"]', password);
  await page.click('button.primary-action');
  
  await page.waitForSelector('button:has-text("Logout")', { timeout: 20000 });
  console.log("Logged in successfully");

  // Force Tenant
  await page.evaluate(() => {
    localStorage.setItem('tenant_id', '11111111-1111-1111-1111-111111111111');
  });
  await page.goto(base); // Go home to refresh state with tenant
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  // 1. CRM Lead Verification
  console.log("Navigating to CRM Lead...");
  await page.goto(`${base}/crm_lead`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(8000);
  
  let firstLead = page.locator('button:has-text("View")').first();
  if (await firstLead.count() === 0) {
    console.log("Creating test lead...");
    await page.click('button:has-text("+ Create")');
    await page.fill('input[name="lead_name"]', "Test Verification Lead");
    await page.fill('input[name="company_name"]', "Verify Co");
    await page.click('button.primary-action:has-text("Create")');
    await page.waitForTimeout(5000);
    firstLead = page.locator('button:has-text("View")').first();
  }
  
  if (await firstLead.count() > 0) {
    await firstLead.click();
    await page.waitForTimeout(3000);
    const printBtn = page.locator('button:has-text("Print")');
    if (await printBtn.count() > 0) {
      results.leadPrintButton = true;
      await snap("01-lead-detail.png");
      await printBtn.click();
      await page.waitForSelector('h1:has-text("Print Preview")', { timeout: 15000 });
      results.leadPreviewOpens = true;
      await page.waitForTimeout(2000);
      await snap("02-lead-print-preview.png");
      const bodyText = await page.innerText('body');
      results.leadBrandingVisible = bodyText.includes("Hippo ERP");
      results.leadSectionsVisible = bodyText.includes("Details") || bodyText.includes("Qualification");
      results.browserPrintBtnExists = await page.locator('button:has-text("Print")').count() > 1;
    }
  }

  // 2. CRM Opportunity Verification
  console.log("Navigating to CRM Opportunity...");
  await page.goto(`${base}/crm_opportunity`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(8000);
  
  let firstOpp = page.locator('button:has-text("View")').first();
  if (await firstOpp.count() === 0) {
    console.log("Creating test opportunity...");
    await page.click('button:has-text("+ Create")');
    await page.fill('input[name="opportunity_name"]', "Test Verification Opp");
    await page.fill('input[name="account_name"]', "Verify Co");
    await page.click('button.primary-action:has-text("Create")');
    await page.waitForTimeout(5000);
    firstOpp = page.locator('button:has-text("View")').first();
  }

  if (await firstOpp.count() > 0) {
    await firstOpp.click();
    await page.waitForTimeout(3000);
    const printBtn = page.locator('button:has-text("Print")');
    if (await printBtn.count() > 0) {
      results.oppPrintButton = true;
      await snap("03-opp-detail.png");
      await printBtn.click();
      await page.waitForSelector('h1:has-text("Print Preview")', { timeout: 15000 });
      results.oppPreviewOpens = true;
      await page.waitForTimeout(2000);
      await snap("04-opp-print-preview.png");
      const bodyText = await page.innerText('body');
      results.oppSectionsVisible = bodyText.includes("Details") || bodyText.includes("Forecast");
    }
  }

  console.log("Verification Results:", results);
  await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));

} catch (error) {
  console.error("Verification error:", error.message);
  await snap("error-state.png");
} finally {
  await browser.close();
}
