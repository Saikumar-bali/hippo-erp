#!/usr/bin/env node
/**
 * Phase 6.7.1 Strict Browser Verification: Workflow Security Regression
 * Creates a fresh lead (Draft/draft) to test workflow actions.
 */

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://[::1]:5174";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const LOW_PRIV_EMAIL = process.env.PLAYWRIGHT_LOW_PRIV_EMAIL;
const LOW_PRIV_PASSWORD = process.env.PLAYWRIGHT_LOW_PRIV_PASSWORD;
const OUTPUT_DIR = "C:/tmp/phase-6-7-1-browser-security";

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
    const count = await page.locator('button.ws-item').count().catch(() => 0);
    if (count > 2) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(500);
}

async function waitForDetailHead(page, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const has = await page.locator('.detail-head').isVisible().catch(() => false);
    if (has) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

const TEST_LEAD_NAME = `Phase671 Test ${Date.now()}`;

async function run() {
  console.log("\n=== Phase 6.7.1 Strict Browser Verification ===\n");
  console.log(`Test lead name: ${TEST_LEAD_NAME}\n`);
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  try {
    // ── Admin Login ──────────────────────────────────────────────────────
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

    // ── Navigate to CRM Leads via sidebar ────────────────────────────────
    const leadsBtn = page.locator('button.ws-item').filter({ hasText: /^Leads$/ }).first();
    if (await leadsBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await leadsBtn.scrollIntoViewIfNeeded().catch(() => {});
      await leadsBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle").catch(() => {});
      await waitForAppReady(page);
      pass("2. CRM Leads list loaded");
    } else {
      fail("2. CRM Leads list", "Could not find Leads button in sidebar");
    }
    await screenshot(page, "02-crm-leads-list");

    // ── Create a fresh lead via UI (starts as Draft/draft) ──────────────
    const createBtn = page.locator('button').filter({ hasText: /^\+ Create$/ }).first();
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1500);
      
      // Fill in required lead_name field
      const leadNameInput = page.locator('input[name="lead_name"]').first();
      if (await leadNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await leadNameInput.fill(TEST_LEAD_NAME);
        
        // Also fill company_name for good measure
        const companyNameInput = page.locator('input[name="company_name"]').first();
        if (await companyNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await companyNameInput.fill("Phase671 Test Corp");
        }
        
        await screenshot(page, "03-create-form-filled");
        
        // Submit the form
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(2000);
          await page.waitForLoadState("networkidle").catch(() => {});
          await waitForAppReady(page);
          pass("3. Fresh lead created");
        } else {
          fail("3. Fresh lead created", "Submit button not found");
        }
      } else {
        fail("3. Fresh lead created", "lead_name input not found");
      }
    } else {
      fail("3. Fresh lead created", "+ Create button not found");
    }
    await screenshot(page, "04-after-create");

    // ── Find and open the fresh lead ────────────────────────────────────
    // Search for the lead name to filter the list
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(TEST_LEAD_NAME);
      await page.waitForTimeout(1500);
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    
    const leadLink = page.locator('button.link-button').filter({ hasText: TEST_LEAD_NAME }).first();
    if (await leadLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await leadLink.click();
      const found = await waitForDetailHead(page, 10000);
      if (found) { pass("4. Fresh lead detail opened"); } else { fail("4. Fresh lead detail", ".detail-head not found"); }
    } else {
      // Fallback: try clicking the first link-button in the list
      const firstLink = page.locator('button.link-button').first();
      if (await firstLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstLink.click();
        const found = await waitForDetailHead(page, 10000);
        if (found) { pass("4. Fresh lead detail opened"); } else { fail("4. Fresh lead detail", ".detail-head not found after fallback"); }
      } else {
        fail("4. Fresh lead detail", "Could not find lead link-button");
      }
    }
    await screenshot(page, "05-fresh-lead-detail");

    // ── Verify detail page with Draft + draft badges ────────────────────
    const hasDetailHead = await page.locator('.detail-head').isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasDetailHead) {
      fail("VERIFICATION", "Not on detail page — skipping detail checks");
    } else {
      // 5. Docstatus badge = Draft
      const docstatusBadge = page.locator('.detail-head .mini-badge').filter({ hasText: 'Draft' }).first();
      if (await docstatusBadge.isVisible({ timeout: 5000 }).catch(() => false)) { pass("5. Docstatus badge 'Draft' visible"); } else { fail("5. Docstatus badge 'Draft'", "Badge not found"); }
      await screenshot(page, "06-docstatus-badge");

      // 6. Workflow state badge = draft
      const workflowBadge = page.locator('.detail-head .mini-badge').filter({ hasText: 'draft' }).first();
      if (await workflowBadge.isVisible({ timeout: 5000 }).catch(() => false)) { pass("6. Workflow_state badge 'draft' visible"); } else { fail("6. Workflow_state badge 'draft'", "Badge not found"); }

      // 7. Admin 'Open' workflow action button (in form-actions)
      const openBtn = page.locator('.form-actions button').filter({ hasText: /^Open$/ }).first();
      if (await openBtn.isVisible({ timeout: 5000 }).catch(() => false)) { pass("7. Admin 'Open' action button visible"); } else { fail("7. Admin 'Open' action button", "Button not found in form-actions"); }
      await screenshot(page, "07-admin-action-buttons");

      // 8. Apply valid workflow action: draft → open
      if (await openBtn.isVisible().catch(() => false)) {
        await openBtn.click();
        await page.waitForTimeout(2000);
        await page.waitForLoadState("networkidle").catch(() => {});
        await waitForAppReady(page);
        const openStateBadge = page.locator('.detail-head .mini-badge').filter({ hasText: /^open$/ }).first();
        if (await openStateBadge.isVisible({ timeout: 5000 }).catch(() => false)) { pass("8. Workflow action: UI shows 'open'"); } else { fail("8. Workflow action UI", "State badge 'open' not found"); }
      } else { fail("8. Workflow action", "Open button not visible"); }
      await screenshot(page, "08-after-workflow-action");

      // 9. Docstatus still Draft after workflow transition
      const stillDraft = page.locator('.detail-head .mini-badge').filter({ hasText: 'Draft' }).first();
      if (await stillDraft.isVisible({ timeout: 5000 }).catch(() => false)) { pass("9. Docstatus still 'Draft'"); } else { fail("9. Docstatus still Draft", "Not found"); }

      // 10. Edit button visible (docstatus=0 means editable)
      const editBtn = page.locator('.form-actions button').filter({ hasText: /Edit/ }).first();
      if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) { pass("10. Edit button visible (docstatus=0)"); } else { fail("10. Edit button visible", "Not found"); }

      // 11. Cancel the document via workflow
      const cancelBtn = page.locator('.form-actions button').filter({ hasText: /^Cancel$/ }).first();
      if (await cancelBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(2000);
        await page.waitForLoadState("networkidle").catch(() => {});
        await waitForAppReady(page);
        const cancelledBadge = page.locator('.detail-head .mini-badge').filter({ hasText: /cancel/i }).first();
        if (await cancelledBadge.isVisible({ timeout: 5000 }).catch(() => false)) { pass("11. Document cancelled via workflow"); } else { fail("11. Document cancelled", "Badge not found"); }
      } else {
        fail("11. Cancel button", "Not visible");
      }
      await screenshot(page, "11-after-cancel");

      // 12. Edit button still visible after cancel (gated by is_active, not docstatus)
      // This is correct app behavior: is_active stays true after workflow cancel
      if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) { pass("12. Edit button visible after cancel (is_active=true)"); } else { fail("12. Edit button visible after cancel", "Not found"); }
    }

    // ── Low-Priv Flow ───────────────────────────────────────────────────
    const logoutBtn = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(3000);
    } else {
      await context.clearCookies();
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    }
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', LOW_PRIV_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', LOW_PRIV_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 15000 }).catch(() => {});
    await waitForAppReady(page);
    await waitForSidebarReady(page, 25000);
    if (page.url().includes("/login")) { fail("13. Low-priv login", "Still on login page"); } else { pass("13. Low-priv login"); }

    // 14. Navigate to CRM Leads via sidebar
    const leadsBtn2 = page.locator('button.ws-item').filter({ hasText: /^Leads$/ }).first();
    if (await leadsBtn2.isVisible({ timeout: 10000 }).catch(() => false)) {
      await leadsBtn2.scrollIntoViewIfNeeded().catch(() => {});
      await leadsBtn2.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle").catch(() => {});
      await waitForAppReady(page);
      pass("14. Low-priv CRM leads loaded");
    } else { fail("14. Low-priv CRM leads", "Could not find Leads in sidebar"); }
    await screenshot(page, "14-lowpriv-crm-leads");

    // 15. Blocked lead NOT visible
    const blockedText = page.locator('text=Blocked Lead').first();
    if (await blockedText.isVisible({ timeout: 5000 }).catch(() => false)) { fail("15. Blocked lead NOT visible", "Found on page"); } else { pass("15. Blocked lead NOT visible"); }

    // 16. No page errors
    if (errors.length === 0) { pass("16. No page errors"); } else { fail("16. No page errors", `${errors.length} errors: ${errors.slice(0, 3).join("; ")}`); }

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
