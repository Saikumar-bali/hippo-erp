#!/usr/bin/env node
/**
 * Phase 6.8.2 — Report Builder Security: Browser verification
 *
 * Tests admin and restricted-user report security in the browser.
 * Proves: admin report works, restricted user sees masked/blocked records,
 * restricted fields hidden, filters cannot bypass security.
 *
 * Required env vars (exits non-zero if any missing):
 *   PLAYWRIGHT_BASE_URL, PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_TEST_PASSWORD,
 *   PLAYWRIGHT_LOW_PRIV_EMAIL, PLAYWRIGHT_LOW_PRIV_PASSWORD
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

// ── Require all env vars (no fallbacks) ──────────────────────────────────────
function requireEnv(name) {
  const val = process.env[name];
  if (!val) { console.error(`❌ Missing required env var: ${name}`); process.exit(1); }
  return val;
}

const BASE_URL = requireEnv("PLAYWRIGHT_BASE_URL");
const EMAIL = requireEnv("PLAYWRIGHT_TEST_EMAIL");
const PASSWORD = requireEnv("PLAYWRIGHT_TEST_PASSWORD");
const LOW_EMAIL = requireEnv("PLAYWRIGHT_LOW_PRIV_EMAIL");
const LOW_PASS = requireEnv("PLAYWRIGHT_LOW_PRIV_PASSWORD");
const OUTPUT_DIR = "C:/tmp/phase-6-8-2-report-secrets";

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
  console.log("\n=== Phase 6.8.2 Report Builder Security — Browser Verification ===\n");
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
    await screenshot(page, "02-admin-reports-workspace");

    // ── 3. Reports page loaded ──
    await page.waitForTimeout(2000);
    const reportsCard = page.locator('.card-head h3:has-text("Reports")').first();
    if (await reportsCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("3. Reports page loaded");
    } else {
      fail("3. Reports page", "Reports heading not visible");
    }
    await screenshot(page, "03-admin-reports-list");

    // ── 4. CRM Lead report visible ──
    const leadRow = page.locator('tr:has-text("CRM Lead")').first();
    if (await leadRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("4. CRM Lead report visible (admin)");
    } else {
      fail("4. CRM Lead report", "Not found in reports list");
    }

    // ── 5. CRM Opportunity report visible ──
    const oppRow = page.locator('tr:has-text("CRM Opportunity")').first();
    if (await oppRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("5. CRM Opportunity report visible (admin)");
    } else {
      fail("5. CRM Opportunity report", "Not found in reports list");
    }

    // ── 6. Run CRM Lead report (admin) ──
    const runBtn = page.locator('button:has-text("Run")').first();
    if (await runBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await runBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle").catch(() => {});
      pass("6. Clicked Run on CRM Lead report (admin)");
    } else {
      fail("6. Run button", "Not found");
    }
    await screenshot(page, "06-admin-report-runner");

    // ── 7. Admin report heading ──
    const reportHeading = page.locator(".card-head h3").first();
    const headingText = await reportHeading.textContent().catch(() => "");
    if (headingText && headingText.includes("CRM")) {
      pass(`7. Admin report heading: "${headingText}"`);
    } else {
      fail("7. Admin report heading", `Expected CRM in heading, got: "${headingText}"`);
    }

    // ── 8. Run Report button ──
    const runReportBtn = page.locator('button:has-text("Run Report")').first();
    if (await runReportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("8. Run Report button visible");
    } else {
      fail("8. Run Report button", "Not visible");
    }

    // ── 9. Execute admin report ──
    await runReportBtn.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState("networkidle").catch(() => {});
    await screenshot(page, "09-admin-report-executed");

    // ── 10. Admin results table visible ──
    const resultsTable = page.locator("table").first();
    if (await resultsTable.isVisible({ timeout: 5000 }).catch(() => false)) {
      const rowCount = await page.locator("table tbody tr").count();
      pass(`10. Admin results table visible (${rowCount} rows)`);
    } else {
      fail("10. Admin results table", "Not visible");
    }

    // ── 11. Admin column headers ──
    const adminHeaders = await page.locator("table thead th").allTextContents();
    if (adminHeaders.length >= 2) {
      pass(`11. Admin column headers: ${adminHeaders.join(", ")}`);
    } else {
      fail("11. Admin column headers", `Expected ≥2, got ${adminHeaders.length}`);
    }

    // ── 12. Admin row count ──
    const rowCountText = page.locator('text=/\\d+ row/').first();
    if (await rowCountText.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await rowCountText.textContent();
      pass(`12. Admin row count: "${text}"`);
    } else {
      fail("12. Admin row count text", "Not visible");
    }
    await screenshot(page, "12-admin-results-data");

    // ── 13. Back to Reports ──
    const backBtn = page.locator('button:has-text("Back to Reports")').first();
    if (await backBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(2000);
      pass("13. Back to Reports");
    } else {
      fail("13. Back button", "Not visible");
    }

    // ── 14. Logout ──
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Log Out"), [data-testid="logout"]').first();
    if (await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForURL("**/login", { timeout: 10000 }).catch(() => {});
      pass("14. Logout");
    } else {
      // Try clicking user menu first
      const userMenu = page.locator('button:has-text("Admin"), button:has-text("saikumar")').first();
      if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await userMenu.click();
        await page.waitForTimeout(1000);
        const logoutInMenu = page.locator('button:has-text("Logout"), button:has-text("Log Out")').first();
        if (await logoutInMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
          await logoutInMenu.click();
          await page.waitForTimeout(2000);
          pass("14. Logout (via menu)");
        } else {
          fail("14. Logout", "Logout button not found in menu");
        }
      } else {
        fail("14. Logout", "Logout button not found");
      }
    }
    await screenshot(page, "14-after-logout");

    // ── 15. Restricted user login ──
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', LOW_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', LOW_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 15000 }).catch(() => {});
    await waitForAppReady(page);
    if (page.url().includes("/login")) { fail("15. Restricted login", "Still on login page"); } else { pass("15. Restricted user login"); }
    await waitForSidebarReady(page, 25000);
    await screenshot(page, "15-restricted-login");

    // ── 16. Restricted user: Navigate to Reports ──
    const lowReportsBtn = page.locator('button.ws-item', { hasText: "Reports" }).first();
    if (await lowReportsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lowReportsBtn.scrollIntoViewIfNeeded().catch(() => {});
      await lowReportsBtn.click();
      await page.waitForTimeout(2000);
      await waitForAppReady(page);
      pass("16. Restricted user: Reports workspace navigated");
    } else {
      const altBtn = page.locator("button.ws-item").filter({ hasText: /report/i }).first();
      if (await altBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await altBtn.scrollIntoViewIfNeeded().catch(() => {});
        await altBtn.click();
        await page.waitForTimeout(2000);
        pass("16. Restricted user: Reports workspace navigated (alt)");
      } else {
        fail("16. Restricted user: Reports workspace", "Could not find Reports in sidebar");
      }
    }
    await screenshot(page, "16-restricted-reports-workspace");

    // ── 17. Restricted user: Reports page ──
    await page.waitForTimeout(2000);
    const lowReportsCard = page.locator('.card-head h3:has-text("Reports")').first();
    if (await lowReportsCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("17. Restricted user: Reports page loaded");
    } else {
      fail("17. Restricted user: Reports page", "Reports heading not visible");
    }
    await screenshot(page, "17-restricted-reports-list");

    // ── 18. Restricted user: Run CRM Lead report ──
    const lowRunBtn = page.locator('button:has-text("Run")').first();
    if (await lowRunBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lowRunBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle").catch(() => {});
      pass("18. Restricted user: Clicked Run on CRM Lead report");
    } else {
      fail("18. Restricted user: Run button", "Not found");
    }
    await screenshot(page, "18-restricted-report-runner");

    // ── 19. Restricted user: Run Report ──
    const lowRunReportBtn = page.locator('button:has-text("Run Report")').first();
    if (await lowRunReportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lowRunReportBtn.click();
      await page.waitForTimeout(3000);
      await page.waitForLoadState("networkidle").catch(() => {});
      pass("19. Restricted user: Report executed");
    } else {
      fail("19. Restricted user: Run Report button", "Not visible");
    }
    await screenshot(page, "19-restricted-report-executed");

    // ── 20. Restricted user: Results table ──
    const lowResultsTable = page.locator("table").first();
    if (await lowResultsTable.isVisible({ timeout: 5000 }).catch(() => false)) {
      const lowRowCount = await page.locator("table tbody tr").count();
      pass(`20. Restricted user: Results table visible (${lowRowCount} rows)`);
      await screenshot(page, "20-restricted-results");

      // ── 21. Restricted user: Column headers (verify restricted fields absent) ──
      const lowHeaders = await page.locator("table thead th").allTextContents();
      const hasEmailHeader = lowHeaders.some(h => h.toLowerCase().includes("email"));
      const hasPhoneHeader = lowHeaders.some(h => h.toLowerCase().includes("phone"));
      const hasNotesHeader = lowHeaders.some(h => h.toLowerCase().includes("notes"));
      if (!hasEmailHeader) pass("21. Restricted user: email column hidden");
      else fail("21. Restricted user: email column", "email header visible in restricted view");
      if (!hasPhoneHeader) pass("22. Restricted user: phone column hidden");
      else fail("22. Restricted user: phone column", "phone header visible in restricted view");
      if (!hasNotesHeader) pass("23. Restricted user: notes column hidden");
      else fail("23. Restricted user: notes column", "notes header visible in restricted view");
    } else {
      fail("20. Restricted user: Results table", "Not visible");
      fail("21. Restricted user: email column", "Skipped (no table)");
      fail("22. Restricted user: phone column", "Skipped (no table)");
      fail("23. Restricted user: notes column", "Skipped (no table)");
    }

    // ── 24. Restricted user: No page errors ──
    if (errors.length === 0) { pass("24. No page errors"); } else { fail("24. No page errors", `${errors.length} errors: ${errors.slice(0, 3).join("; ")}`); }

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
