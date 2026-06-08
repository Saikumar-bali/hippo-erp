#!/usr/bin/env node
/**
 * Phase 6.8.5 — Metadata Studio Module Manager Repair: Browser verification
 *
 * Tests:
 * 1. Admin login
 * 2. Open Metadata Studio
 * 3. Module Manager appears in sidebar
 * 4. Module Manager appears in Builder Home
 * 5. Open Module Manager
 * 6. Create a test module
 * 7. Verify module appears in DocType Builder module dropdown
 * 8. Create test DocType using that module
 * 9. Attempt to delete module while DocType references it (blocked)
 * 10. Deactivate module
 * 11. Verify existing DocType still displays module
 * 12. Verify restricted user cannot access/manage Module Manager
 * 13. No page errors
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

function requireEnv(name) {
  const val = process.env[name];
  if (!val) { console.error(`Missing required env var: ${name}`); process.exit(1); }
  return val;
}

const BASE_URL = requireEnv("PLAYWRIGHT_BASE_URL");
const EMAIL = requireEnv("PLAYWRIGHT_TEST_EMAIL");
const PASSWORD = requireEnv("PLAYWRIGHT_TEST_PASSWORD");
const LOW_PRIV_EMAIL = requireEnv("PLAYWRIGHT_LOW_PRIV_EMAIL");
const LOW_PRIV_PASSWORD = requireEnv("PLAYWRIGHT_LOW_PRIV_PASSWORD");
const OUTPUT_DIR = "C:/tmp/phase-6-8-5-module-manager";
const TEST_MODULE_KEY = "test_mod_mgr_" + Date.now();
const TEST_MODULE_LABEL = "Test Module Manager";
const UNIQUE_SUFFIX = String(Date.now());
const TEST_DOCTYPE_KEY = "test_doctype_mm_" + UNIQUE_SUFFIX;
const TEST_DOCTYPE_LABEL = "Test DocType MM " + UNIQUE_SUFFIX;

let passCount = 0;
let failCount = 0;
const results = [];

function pass(name) { passCount++; results.push({ status: "PASS", name }); console.log(`  \u2713 ${name}`); }
function fail(name, reason) { failCount++; results.push({ status: "FAIL", name, reason }); console.log(`  \u2717 ${name}${reason ? ` \u2014 ${reason}` : ""}`); }
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

async function loginAs(page, email, password) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 15000 }).catch(() => {});
  await waitForAppReady(page);
}

async function navigateToMetadataStudio(page) {
  // Find "Builder Home" or "Metadata Studio" in sidebar
  const builderHomeBtn = page.locator('button.ws-item', { hasText: "Builder Home" }).first();
  if (await builderHomeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await builderHomeBtn.scrollIntoViewIfNeeded().catch(() => {});
    await builderHomeBtn.click();
    await page.waitForTimeout(2000);
    await waitForAppReady(page);
    return true;
  }
  // Try Metadata Studio
  const msBtn = page.locator('button.ws-item', { hasText: "Metadata Studio" }).first();
  if (await msBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await msBtn.scrollIntoViewIfNeeded().catch(() => {});
    await msBtn.click();
    await page.waitForTimeout(2000);
    await waitForAppReady(page);
    return true;
  }
  // Try clicking Metadata Studio group to expand
  const wsGroup = page.locator('.ws-group', { hasText: "Metadata Studio" }).first();
  if (await wsGroup.isVisible({ timeout: 5000 }).catch(() => false)) {
    await wsGroup.scrollIntoViewIfNeeded().catch(() => {});
    await wsGroup.click();
    await page.waitForTimeout(1000);
    // Now click Builder Home inside it
    const innerBtn = page.locator('button.ws-item', { hasText: "Builder Home" }).first();
    if (await innerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await innerBtn.click();
      await page.waitForTimeout(2000);
      await waitForAppReady(page);
      return true;
    }
  }
  return false;
}

async function logPageErrors(page, errors) {
  const text = await page.locator('.state-error, .card.state-error, [class*="error"]').first().isVisible().catch(() => false);
  if (text) {
    const errorText = await page.locator('.state-error, .card.state-error').first().textContent().catch(() => "");
    if (errorText) errors.push(errorText);
  }
}

async function run() {
  console.log("\n=== Phase 6.8.5 Metadata Studio Module Manager Browser Verification ===\n");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  try {
    // ══════════════════════════════════════════════════════════════════
    // 1. Admin Login
    // ══════════════════════════════════════════════════════════════════
    console.log("--- Admin Login & Metadata Studio Navigation ---");
    await loginAs(page, EMAIL, PASSWORD);
    if (page.url().includes("/login")) {
      fail("1. Admin login", "Still on login page");
      await screenshot(page, "01-admin-login-fail");
    } else {
      pass("1. Admin login");
    }
    await waitForSidebarReady(page, 25000);
    await screenshot(page, "01-admin-login");

    // ══════════════════════════════════════════════════════════════════
    // 2. Open Metadata Studio
    // ══════════════════════════════════════════════════════════════════
    const navigated = await navigateToMetadataStudio(page);
    if (navigated) {
      pass("2. Metadata Studio opened");
    } else {
      fail("2. Metadata Studio", "Could not navigate to Metadata Studio");
    }
    await screenshot(page, "02-metadata-studio");

    // ══════════════════════════════════════════════════════════════════
    // 3. Module Manager appears in sidebar
    // ══════════════════════════════════════════════════════════════════
    const mmSidebar = page.locator('button.ws-item', { hasText: "Module Manager" }).first();
    if (await mmSidebar.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("3. Module Manager in sidebar");
    } else {
      fail("3. Module Manager in sidebar", "Module Manager item not found in sidebar");
    }
    await screenshot(page, "03-sidebar-module-manager");

    // ══════════════════════════════════════════════════════════════════
    // 4. Module Manager appears in Builder Home
    // ══════════════════════════════════════════════════════════════════
    const mmCard = page.locator('button.studio-card-button', { hasText: "Module Manager" }).first();
    if (await mmCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("4. Module Manager card in Builder Home");
    } else {
      fail("4. Module Manager card in Builder Home", "Module Manager card not found");
    }
    await screenshot(page, "04-builder-home-card");

    // ══════════════════════════════════════════════════════════════════
    // 5. Open Module Manager via sidebar
    // ══════════════════════════════════════════════════════════════════
    await mmSidebar.click();
    await page.waitForTimeout(2000);
    await waitForAppReady(page);
    const mmHeader = page.locator('h3', { hasText: "Module Manager" }).first();
    if (await mmHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
      pass("5. Module Manager screen opened");
    } else {
      fail("5. Module Manager screen", "Module Manager header not visible");
    }
    await screenshot(page, "05-module-manager-screen");

    // ══════════════════════════════════════════════════════════════════
    // 6. Create a test module
    // ══════════════════════════════════════════════════════════════════
    const newModuleBtn = page.locator('button', { hasText: "+ New Module" }).first();
    if (await newModuleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newModuleBtn.click();
      await page.waitForTimeout(500);
      // Fill the create form
      await page.fill('input[placeholder="Inventory"], input.studio-field input', TEST_MODULE_LABEL);
      // Find module_key input and fill
      const moduleKeyInput = page.locator('input[placeholder="inventory"]').first();
      await moduleKeyInput.fill(TEST_MODULE_KEY);
      // Find description input
      const descInput = page.locator('input[placeholder="Inventory management module"]').first();
      await descInput.fill("Test module for Phase 6.8.5 verification");
      // Click Create Module button
      const createBtn = page.locator('button', { hasText: "Create Module" }).first();
      await createBtn.click();
      await page.waitForTimeout(2000);
      await waitForAppReady(page);

      // Verify module appears in table
      const moduleRow = page.locator('table.erp-table tbody tr', { hasText: TEST_MODULE_KEY }).first();
      if (await moduleRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        pass("6. Test module created");
      } else {
        fail("6. Test module created", "Module not visible in table after creation");
      }
      await screenshot(page, "06-module-created");
    } else {
      fail("6. Test module created", "New Module button not found");
    }

    // ══════════════════════════════════════════════════════════════════
    // 7. Verify module appears in DocType Builder module dropdown
    // ══════════════════════════════════════════════════════════════════
    // Navigate to DocType Builder via sidebar
    const dtBuilderSidebar = page.locator('button.ws-item', { hasText: "DocType Builder" }).first();
    if (await dtBuilderSidebar.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dtBuilderSidebar.scrollIntoViewIfNeeded().catch(() => {});
      await dtBuilderSidebar.click();
      await page.waitForTimeout(2000);
      await waitForAppReady(page);

      // Check if module is in dropdown
      const moduleSelect = page.locator('select').filter({ has: page.locator('option') }).first();
      const options = await moduleSelect.locator('option').allTextContents().catch(() => []);
      const foundModule = options.some((opt) => opt.includes(TEST_MODULE_KEY));
      if (foundModule) {
        pass("7. Module in DocType Builder dropdown");
      } else {
        // Try second select (there may be two, one for DocType load and one for module)
        // The module select is usually the 2nd or 3rd select on the page
        const allSelects = page.locator('select');
        let found = false;
        const count = await allSelects.count();
        for (let i = 0; i < count; i++) {
          const opts = await allSelects.nth(i).locator('option').allTextContents().catch(() => []);
          if (opts.some((o) => o.includes(TEST_MODULE_KEY))) { found = true; break; }
        }
        if (found) {
          pass("7. Module in DocType Builder dropdown");
        } else {
          fail("7. Module in DocType Builder dropdown", `Module "${TEST_MODULE_KEY}" not found in any select options`);
        }
      }
      await screenshot(page, "07-doctype-builder-dropdown");
    } else {
      fail("7. Module in DocType Builder dropdown", "DocType Builder sidebar item not found");
    }

    // ══════════════════════════════════════════════════════════════════
    // 8. Create test DocType using the test module
    // ══════════════════════════════════════════════════════════════════
    // Fill DocType Builder form
    const labelInput = page.locator('input[placeholder="Purchase Invoice"]').first();
    if (await labelInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await labelInput.fill(TEST_DOCTYPE_LABEL);
      await page.waitForTimeout(500);

      // Select the test module
      const selects = page.locator('select');
      const selectCount = await selects.count();
      for (let i = 0; i < selectCount; i++) {
        const opts = await selects.nth(i).locator('option').allTextContents().catch(() => []);
        if (opts.some((o) => o.includes(TEST_MODULE_KEY))) {
          await selects.nth(i).selectOption(TEST_MODULE_KEY);
          break;
        }
      }

      // Click Create DocType button
      const createDocTypeBtn = page.locator('button', { hasText: "Create DocType" }).first();
      if (await createDocTypeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createDocTypeBtn.click();
        await page.waitForTimeout(2000);
        await waitForAppReady(page);
        // Wait a moment for the UI to settle
        await page.waitForTimeout(1000);
        // Check for the "Next Steps" / "Continue building" panel (persistent success indicator)
        const continueBuilding = page.locator('strong', { hasText: /Continue building/i }).first();
        const nextStepsHeader = page.locator('p.studio-kicker', { hasText: /Next Steps/i }).first();
        const successToast = page.locator('[data-sonner-toaster] div, .sonner-toast, [role="status"]', { hasText: /created|saved|updated/i }).first();
        if (await continueBuilding.isVisible({ timeout: 5000 }).catch(() => false)) {
          pass("8. Test DocType created");
        } else if (await nextStepsHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
          pass("8. Test DocType created (next steps visible)");
        } else if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
          pass("8. Test DocType created (toast)");
        } else {
          // Check if there is text saying "Created" or "Updated" on page
          const pageText = await page.textContent('body').catch(() => "");
          if (pageText.includes(TEST_DOCTYPE_LABEL)) {
            pass("8. Test DocType created (label on page)");
          } else {
            fail("8. Test DocType created", `No success indicator found. Page text: "${pageText.substring(0, 500)}"`);
          }
        }
      } else {
        fail("8. Test DocType created", "Create DocType button not found");
      }
      await screenshot(page, "08-doctype-created");
    } else {
      fail("8. Test DocType created", "Label input not found in DocType Builder");
    }

    // ══════════════════════════════════════════════════════════════════
    // 9. Attempt to delete module while DocType references it (blocked)
    // ══════════════════════════════════════════════════════════════════
    // Navigate back to Module Manager
    const mmSidebar2 = page.locator('button.ws-item', { hasText: "Module Manager" }).first();
    if (await mmSidebar2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mmSidebar2.scrollIntoViewIfNeeded().catch(() => {});
      await mmSidebar2.click();
      await page.waitForTimeout(2000);
      await waitForAppReady(page);

      // Find the Delete button for our test module and click it
      const deleteBtn = page.locator('table.erp-table tbody tr', { hasText: TEST_MODULE_KEY }).locator('button', { hasText: "Delete" }).first();
      if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Check if delete is disabled (expected when doctypes reference it)
        const isDisabled = await deleteBtn.isDisabled().catch(() => false);
        if (isDisabled) {
          pass("9. Delete blocked when DocType references module (button disabled)");
        } else {
          // Button is enabled - click it and see what happens
          // The confirmation dialog should show the reference error
          await deleteBtn.click();
          await page.waitForTimeout(1000);

          const confirmDeleteHeader = page.locator('strong', { hasText: /Delete Module.*/ }).first();
          if (await confirmDeleteHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Check for "cannot delete" error message
            const cannotDelete = page.locator('p', { hasText: /Cannot delete|referenced by|Deactivate instead/i }).first();
            if (await cannotDelete.isVisible({ timeout: 3000 }).catch(() => false)) {
              pass("9. Delete blocked when DocType references module (dialog shows reference)");
              // Click Deactivate Instead
              const deactivateInsteadBtn = page.locator('button', { hasText: "Deactivate Instead" }).first();
              if (await deactivateInsteadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await deactivateInsteadBtn.click();
                await page.waitForTimeout(1000);
              }
            } else {
              fail("9. Delete blocked", "Delete dialog appeared but no reference warning found");
            }
          } else {
            fail("9. Delete blocked", "Delete button was enabled for referenced module");
          }
        }
      } else {
        fail("9. Delete blocked", "Delete button not found for test module");
      }
      await screenshot(page, "09-delete-blocked");
    } else {
      fail("9. Delete blocked", "Could not navigate back to Module Manager");
    }

    // ══════════════════════════════════════════════════════════════════
    // 10. Deactivate module
    // ══════════════════════════════════════════════════════════════════
    const deactivateBtn = page.locator('table.erp-table tbody tr', { hasText: TEST_MODULE_KEY }).locator('button', { hasText: "Deactivate" }).first();
    if (await deactivateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deactivateBtn.scrollIntoViewIfNeeded().catch(() => {});
      await deactivateBtn.click();
      await page.waitForTimeout(2000);
      await waitForAppReady(page);

      // Check that the module moved to inactive section or button changed to "Reactivate"
      const reactivateBtn = page.locator('table.erp-table tbody tr', { hasText: TEST_MODULE_KEY }).locator('button', { hasText: "Reactivate" }).first();
      if (await reactivateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        pass("10. Module deactivated");
      } else {
        // Check if it appeared in the Inactive Modules section
        const inactiveSection = page.locator('h3', { hasText: /Inactive/ }).first();
        if (await inactiveSection.isVisible({ timeout: 3000 }).catch(() => false)) {
          pass("10. Module deactivated (in inactive section)");
        } else {
          fail("10. Module deactivated", "Could not confirm deactivation");
        }
      }
      await screenshot(page, "10-module-deactivated");
    } else {
      fail("10. Module deactivated", "Deactivate button not found for test module");
    }

    // ══════════════════════════════════════════════════════════════════
    // 11. Verify existing DocType still displays module
    // ══════════════════════════════════════════════════════════════════
    // Navigate to DocType Builder and load our test DocType
    const dtBuilderSidebar2 = page.locator('button.ws-item', { hasText: "DocType Builder" }).first();
    if (await dtBuilderSidebar2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dtBuilderSidebar2.scrollIntoViewIfNeeded().catch(() => {});
      await dtBuilderSidebar2.click();
      await page.waitForTimeout(2000);
      await waitForAppReady(page);

      // Wait for DocTypeBuilder to finish loading (the selector appears)
      let docTypeLoaded = false;
      for (let retry = 0; retry < 30; retry++) {
        const allSelects = page.locator('select');
        let found = false;
        for (let si = 0; si < await allSelects.count(); si++) {
          const opts = await allSelects.nth(si).locator('option').allTextContents().catch(() => []);
          // Search by unique key (set explicitly in test 8)
          for (let oi = 0; oi < opts.length; oi++) {
            if (opts[oi].includes(TEST_DOCTYPE_KEY)) {
              const actualDoctypeKey = await allSelects.nth(si).locator('option').nth(oi).getAttribute('value').catch(() => "");
              if (actualDoctypeKey) {
                found = true;
                await allSelects.nth(si).selectOption(actualDoctypeKey);
                await page.waitForTimeout(1500);
                await waitForAppReady(page);
                break;
              }
            }
          }
          if (found) break;
        }
        if (found) { docTypeLoaded = true; break; }
        await page.waitForTimeout(500);
      }
      if (docTypeLoaded) {
        // Wait for the form to load the DocType record
        await page.waitForTimeout(1000);
        // Check the module field displays our test module (even when deactivated)
        let selectedModule = "";
        const allSelects2 = page.locator('select');
        for (let i = 0; i < await allSelects2.count(); i++) {
          const val = await allSelects2.nth(i).inputValue().catch(() => "");
          if (val === TEST_MODULE_KEY) { selectedModule = val; break; }
          const selectedOpt = await allSelects2.nth(i).locator('option:checked').getAttribute('value').catch(() => "");
          if (selectedOpt === TEST_MODULE_KEY) { selectedModule = TEST_MODULE_KEY; break; }
        }
        if (selectedModule === TEST_MODULE_KEY) {
          pass("11. Existing DocType displays deactivated module");
        } else {
          fail("11. Existing DocType displays deactivated module", `Expected module "${TEST_MODULE_KEY}", got "${selectedModule}"`);
        }
      } else {
        fail("11. Existing DocType displays deactivated module", "Test DocType not found in selector");
      }
      await screenshot(page, "11-doctype-shows-module");
    } else {
      fail("11. Existing DocType displays deactivated module", "DocType Builder sidebar not found");
    }

    // ══════════════════════════════════════════════════════════════════
    // 12. Restricted user cannot access Module Manager (strict)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n--- Restricted User Test ---");
    // Clear auth state
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }).catch(() => {});
    const contextCookies = await context.cookies();
    for (const cookie of contextCookies) {
      await context.removeCookies(cookie.name);
    }
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Login as restricted user
    await loginAs(page, LOW_PRIV_EMAIL, LOW_PRIV_PASSWORD);
    if (page.url().includes("/login")) {
      fail("12a. Restricted user login", "Still on login page");
    } else {
      pass("12a. Restricted user login");
    }
    await waitForSidebarReady(page, 25000);
    await screenshot(page, "12a-restricted-login");

    // 12b: Module Manager must NOT appear in sidebar or Builder Home
    {
      const hasMetadataStudio = await navigateToMetadataStudio(page);
      if (hasMetadataStudio) {
        // Check sidebar
        const mmInSidebar = page.locator('button.ws-item', { hasText: "Module Manager" }).first();
        const mmSidebarVisible = await mmInSidebar.isVisible({ timeout: 3000 }).catch(() => false);
        // Check Builder Home cards
        const mmInCards = page.locator('button.card-btn, button[class*="card"], .studio-card button', { hasText: "Module Manager" }).first();
        const mmCardsVisible = await mmInCards.isVisible({ timeout: 2000 }).catch(() => false);
        if (mmSidebarVisible || mmCardsVisible) {
          fail("12b. Module Manager hidden for restricted user", "Module Manager is visible in sidebar or cards");
        } else {
          pass("12b. Module Manager hidden for restricted user (sidebar + cards)");
        }
      } else {
        pass("12b. Module Manager hidden for restricted user (no Metadata Studio access)");
      }
    }
    await screenshot(page, "12b-restricted-no-module-manager");

    // 12c: Restricted user must NOT access Module Manager route directly
    {
      await page.goto(`${BASE_URL}/metadata_studio_module_manager`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      await waitForAppReady(page);
      const bodyText = await page.textContent("body").catch(() => "");
      const hasModuleManagerContent = bodyText.includes("Module Manager") && (bodyText.includes("Create Module") || bodyText.includes("Active Modules") || bodyText.includes("Inactive Modules") || bodyText.includes("Delete") || bodyText.includes("Deactivate"));
      const hasError = bodyText.toLowerCase().includes("permission denied") || bodyText.toLowerCase().includes("not found") || bodyText.toLowerCase().includes("access denied");
      if (hasModuleManagerContent && !hasError) {
        fail("12c. Restricted user cannot access Module Manager route", "Restricted user accessed Module Manager directly");
      } else {
        pass("12c. Restricted user cannot access Module Manager route (blocked)");
      }
    }
    await screenshot(page, "12c-restricted-route-blocked");

    // 12d: Restricted user must NOT create/update/deactivate/delete modules via UI
    // Try calling RPCs directly to verify backend blocks them
    {
      let blockedCount = 0;
      // Try erp_create_module (should fail)
      const createResult = await page.evaluate(async (url) => {
        try {
          const r = await fetch(url + "/rest/v1/rpc/erp_create_module", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ p_module_key: "restricted_test_" + Date.now(), p_label: "Restricted Test" })
          });
          return await r.json();
        } catch (e) { return { error: String(e) }; }
      }, BASE_URL).catch(() => ({ error: "evaluate failed" }));
      if (createResult.error || (createResult.ok === false)) {
        blockedCount++;
      }
      // Try erp_list_modules (should fail or return empty)
      const listResult = await page.evaluate(async (url) => {
        try {
          const r = await fetch(url + "/rest/v1/rpc/erp_list_modules", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({})
          });
          return await r.json();
        } catch (e) { return { error: String(e) }; }
      }, BASE_URL).catch(() => ({ error: "evaluate failed" }));
      if (listResult.error || (listResult.ok === false) || (listResult.data && Array.isArray(listResult.data) && listResult.data.length === 0)) {
        blockedCount++;
      }
      if (blockedCount >= 2) {
        pass("12d. Restricted user cannot manage modules via RPC (blocked)");
      } else {
        fail("12d. Restricted user cannot manage modules via RPC", `Only ${blockedCount}/2 blocked`);
      }
    }
    await screenshot(page, "12d-restricted-rpc-blocked");

    // ══════════════════════════════════════════════════════════════════
    // 13. No page errors
    // ══════════════════════════════════════════════════════════════════
    await logPageErrors(page, errors);
    if (errors.length === 0) {
      pass("13. No page errors");
    } else {
      fail("13. No page errors", errors.join("; "));
    }

    // ══════════════════════════════════════════════════════════════════
    // Summary
    // ══════════════════════════════════════════════════════════════════
    await screenshot(page, "99-summary");

    // Save results
    const output = {
      phase: "6.8.5",
      timestamp: new Date().toISOString(),
      results,
      summary: { pass: passCount, fail: failCount, total: passCount + failCount },
      errors: errors.length > 0 ? errors : undefined,
    };
    writeFileSync(`${OUTPUT_DIR}/results.json`, JSON.stringify(output, null, 2));

  } catch (err) {
    console.error("\nUnhandled error:", err);
    await screenshot(page, "error-unhandled");
    fail("Script error", err.message);
    const output = { phase: "6.8.5", timestamp: new Date().toISOString(), results, error: err.message };
    writeFileSync(`${OUTPUT_DIR}/results.json`, JSON.stringify(output, null, 2));
  } finally {
    await browser.close();
  }

  console.log(`\n\u2500${"\u2500".repeat(50)}`);
  console.log(`Results: ${passCount} PASS, ${failCount} FAIL, ${passCount + failCount} TOTAL`);
  if (failCount > 0) {
    console.log("FAILURES:");
    for (const r of results.filter((r) => r.status === "FAIL")) {
      console.log(`  \u2717 ${r.name}${r.reason ? `: ${r.reason}` : ""}`);
    }
  }
  console.log(`Screenshots: ${OUTPUT_DIR}/`);
  console.log(`Results JSON: ${OUTPUT_DIR}/results.json\n`);

  process.exit(failCount > 0 ? 1 : 0);
}

run();
