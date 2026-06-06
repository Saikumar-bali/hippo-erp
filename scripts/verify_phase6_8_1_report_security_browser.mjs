#!/usr/bin/env node
/**
 * Phase 6.8.1 — Report Builder Security: Browser verification
 *
 * Tests that the UI works correctly after security hardening.
 * Security is enforced server-side; browser tests verify no regressions.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "http://[::1]:5174";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const OUTPUT_DIR = "C:/tmp/phase-6-8-1-report-security";

let passCount = 0;
let failCount = 0;
const results = [];

function pass(name) { passCount++; results.push({ status: "PASS", name }); console.log(`  ✓ ${name}`); }
function fail(name, reason) { failCount++; results.push({ status: "FAIL", name, reason }); console.log(`  ✗ ${name}${reason ? ` — ${reason}` : ""}`); }
async function screenshot(page, name) { try { mkdirSync(OUTPUT_DIR, { recursive: true }); await page.screenshot({ path: `${OUTPUT_DIR}/${name}.png`, fullPage: true }); } catch {} }

async function waitForAppReady(page, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const loading = await page.locator("text=Loading session...").isVisible().catch(() => false);
    if (!loading) break;
    await page.waitForTimeout(300);
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);
}

async function waitForSidebarReady(page, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await page.locator("button.ws-item").count().catch(() => 0);
    if (count > 2) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(500);
}

async function run() {
  console.log("\n=== Phase 6.8.1 Report Builder Security — Browser Verification ===\n");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  try {
    // ── 1. Admin Login ──
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 15000 }).catch(() => {});
    await waitForAppReady(page);
    if (page.url().includes("/login")) { fail("1. Admin login", "Still on login page"); } else { pass("1. Admin login"); }
    await waitForSidebarReady(page, 25000);
    await screenshot(page, "01-admin-login");

    // ── 2. Navigate to Reports workspace ──
    const reportsBtn = page.locator('button.ws-item', { hasText: "Reports" }).first();
    if (await reportsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reportsBtn.scrollIntoViewIfNeeded().catch(() => {});
      await reportsBtn.click();
      await page.waitForTimeout(2000);
      await waitForAppReady(page);
      pass("2. Reports workspace navigated");
    } else {
      const altBtn = page.locator("button.ws-item").filter({ hasText: /report/i }).first();
      if (await altBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await altBtn.scrollIntoViewIfNeeded().catch(() => {});
        await altBtn.click();
        await page.waitForTimeout(2000);
        pass("2. Reports workspace navigated (alt)");
      } else {
        fail("2. Reports workspace", "Could not find Reports in sidebar");
      }
    }
    await screenshot(page, "02-reports-workspace");

    // ── 3. Reports page loaded ──
    await page.waitForTimeout(2000);
    const reportsCard = page.locator('.card-head h3:has-text("Reports")').first();
    if (await reportsCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("3. Reports page loaded");
    } else {
      fail("3. Reports page", "Reports heading not visible");
    }
    await screenshot(page, "03-reports-page");

    // ── 4. CRM Lead report visible ──
    const leadRow = page.locator('tr:has-text("CRM Lead")').first();
    if (await leadRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("4. CRM Lead report visible");
    } else {
      fail("4. CRM Lead report", "Not found in reports list");
    }

    // ── 5. CRM Opportunity report visible ──
    const oppRow = page.locator('tr:has-text("CRM Opportunity")').first();
    if (await oppRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("5. CRM Opportunity report visible");
    } else {
      fail("5. CRM Opportunity report", "Not found in reports list");
    }
    await screenshot(page, "05-reports-list");

    // ── 6. Click Run on CRM Lead report ──
    const runBtn = page.locator('button:has-text("Run")').first();
    if (await runBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await runBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle").catch(() => {});
      pass("6. Clicked Run on CRM Lead report");
    } else {
      fail("6. Run button", "Not found");
    }
    await screenshot(page, "06-report-runner");

    // ── 7. Report runner heading ──
    const reportHeading = page.locator(".card-head h3").first();
    const headingText = await reportHeading.textContent().catch(() => "");
    if (headingText && headingText.includes("CRM")) {
      pass(`7. Report heading: "${headingText}"`);
    } else {
      fail("7. Report heading", `Expected CRM in heading, got: "${headingText}"`);
    }

    // ── 8. Run Report button visible ──
    const runReportBtn = page.locator('button:has-text("Run Report")').first();
    if (await runReportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("8. Run Report button visible");
    } else {
      fail("8. Run Report button", "Not visible");
    }

    // ── 9. Execute report ──
    await runReportBtn.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState("networkidle").catch(() => {});
    await screenshot(page, "09-report-executed");

    // ── 10. Results table visible ──
    const resultsTable = page.locator("table").first();
    if (await resultsTable.isVisible({ timeout: 5000 }).catch(() => false)) {
      const rowCount = await page.locator("table tbody tr").count();
      pass(`10. Results table visible (${rowCount} rows)`);
    } else {
      fail("10. Results table", "Not visible");
    }

    // ── 11. Column headers present ──
    const headers = await page.locator("table thead th").allTextContents();
    if (headers.length >= 2) {
      pass(`11. Column headers: ${headers.join(", ")}`);
    } else {
      fail("11. Column headers", `Expected ≥2, got ${headers.length}`);
    }

    // ── 12. Row count displayed ──
    const rowCountText = page.locator('text=/\\d+ row/').first();
    if (await rowCountText.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await rowCountText.textContent();
      pass(`12. Row count: "${text}"`);
    } else {
      fail("12. Row count text", "Not visible");
    }
    await screenshot(page, "12-results-data");

    // ── 13. Back to Reports ──
    const backBtn = page.locator('button:has-text("Back to Reports")').first();
    if (await backBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(2000);
      pass("13. Back to Reports");
    } else {
      fail("13. Back button", "Not visible");
    }
    await screenshot(page, "13-back-to-list");

    // ── 14. Back on reports list ──
    const reportsHeadingBack = page.locator('.card-head h3:has-text("Reports")').first();
    if (await reportsHeadingBack.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("14. Back on reports list page");
    } else {
      fail("14. Back to list", "Reports heading not visible");
    }

    // ── 15. Run Opportunity report ──
    const oppRunBtn = page.locator('button:has-text("Run")').nth(1);
    if (await oppRunBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await oppRunBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle").catch(() => {});
      pass("15. Clicked Run on Opportunity report");
    } else {
      fail("15. Run Opportunity", "Button not found");
    }
    await screenshot(page, "15-opp-report-runner");

    // ── 16. Execute opportunity report ──
    const runOppBtn = page.locator('button:has-text("Run Report")').first();
    if (await runOppBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await runOppBtn.click();
      await page.waitForTimeout(3000);
      await page.waitForLoadState("networkidle").catch(() => {});
      const oppTable = page.locator("table").first();
      if (await oppTable.isVisible({ timeout: 5000 }).catch(() => false)) {
        const oppRows = await page.locator("table tbody tr").count();
        pass(`16. Opportunity report executed (${oppRows} rows)`);
      } else {
        fail("16. Opportunity report", "Results table not visible");
      }
    } else {
      fail("16. Run Opportunity button", "Not found");
    }
    await screenshot(page, "16-opp-results");

    // ── 17. No page errors ──
    if (errors.length === 0) { pass("17. No page errors"); } else { fail("17. No page errors", `${errors.length} errors: ${errors.slice(0, 3).join("; ")}`); }

    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(`${OUTPUT_DIR}/results.json`, JSON.stringify({ passCount, failCount, results, pageErrors: errors }, null, 2));
  } catch (e) {
    fail("Browser error", e.message);
    await screenshot(page, "error");
  } finally {
    await browser.close();
  }

  console.log(`\n=== Results: ${passCount} PASS, ${failCount} FAIL out of ${passCount + failCount} ===`);
  console.log(`Results saved to: ${OUTPUT_DIR}/results.json\n`);
  if (failCount > 0) process.exit(1);
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
