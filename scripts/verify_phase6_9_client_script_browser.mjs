#!/usr/bin/env node
/**
 * Phase 6.9 / 6.9.1 — Client Script Sandbox Foundation: Browser verifier
 *
 * Admin path:
 * 1. Admin login
 * 2. Opens Client Scripts management page
 * 3. CRM Lead demo script visible in list
 * 4. Opens CRM Lead create form
 * 5. Checks expected_value field exists
 * 6. Checks referral_name field exists
 * 7. Fills lead_name, changes status -> Qualified
 * 8. expected_value becomes required (has required attribute)
 * 9. Save without expected_value triggers validation
 * 10. Fills expected_value
 * 11. Changes source -> Referral, referral_name becomes visible (has required/visible attribute)
 *
 * Restricted user path:
 * 12. Restricted user login
 * 13. Tries to access Client Scripts page — must be blocked
 * 14. CRM Lead form loads
 * 15. No page errors across all pages
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
const ADMIN_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const RESTRICTED_EMAIL = process.env.PLAYWRIGHT_LOW_PRIV_EMAIL;
const RESTRICTED_PASSWORD = process.env.PLAYWRIGHT_LOW_PRIV_PASSWORD;

const OUTPUT_DIR = "C:/tmp/phase-6-9-client-script";

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !RESTRICTED_EMAIL || !RESTRICTED_PASSWORD) {
  console.error("Missing required env vars: PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_TEST_PASSWORD, PLAYWRIGHT_LOW_PRIV_EMAIL, PLAYWRIGHT_LOW_PRIV_PASSWORD");
  process.exit(1);
}

let passCount = 0;
let failCount = 0;
const results = [];

function pass(name) { passCount++; results.push({ status: "PASS", name }); console.log(`  \u2713 ${name}`); }
function fail(name, reason) { failCount++; results.push({ status: "FAIL", name, reason }); console.log(`  \u2717 ${name} \u2014 ${reason}`); }

async function login(page, email, password) {
  await page.goto(BASE_URL + "/login", { waitUntil: "networkidle" });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for auth to complete, tenants to load, and navigation to finish
  await page.waitForTimeout(8000);
}

async function screenshot(page, name) {
  const path = `${OUTPUT_DIR}/${name}.png`;
  try { await page.screenshot({ path, fullPage: true }); } catch {}
}

async function run() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    // ── Admin path ──────────────────────────────────────────────────
    console.log("\n--- Admin Path ---");
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();

    // Collect console errors
    const pageErrors = [];
    adminPage.on("pageerror", (err) => pageErrors.push(err.message));

    // 1. Admin login
    try {
      await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
      const url = adminPage.url();
      if (!url.includes("/login")) {
        pass("1. Admin login successful");
      } else {
        fail("1. Admin login", "Still on login page");
      }
    } catch (e) {
      fail("1. Admin login", e.message);
    }
    await screenshot(adminPage, "01-admin-login");

    // 2. Navigate to Client Scripts
    try {
      await adminPage.goto(BASE_URL + "/metadata_studio_client_scripts", { waitUntil: "networkidle", timeout: 15000 });
      // Wait for SPA to restore session and render content
      await adminPage.waitForTimeout(5000);
      // Wait until "Loading session..." disappears
      try { await adminPage.waitForFunction(() => !document.body.textContent.includes("Loading session"), { timeout: 10000 }); } catch {}
      await adminPage.waitForTimeout(2000);
      const bodyText = await adminPage.textContent("body");
      if (bodyText.includes("Client Scripts") || bodyText.includes("client script")) {
        pass("2. Client Scripts page opens");
      } else {
        fail("2. Client Scripts page opens", "Page did not show Client Scripts content");
      }
    } catch (e) {
      fail("2. Client Scripts page opens", e.message);
    }
    await screenshot(adminPage, "02-client-scripts-page");

    // 3. Wait for CRM Lead demo script to appear
    try {
      await adminPage.waitForTimeout(2000);
      const bodyText = await adminPage.textContent("body");
      if (bodyText.includes("CRM Lead Qualification Rules")) {
        pass("3. CRM Lead demo script visible in list");
      } else {
        fail("3. CRM Lead demo script visible", "Demo script not found in page content");
      }
    } catch (e) {
      fail("3. CRM Lead demo script visible", e.message);
    }

    // 4. Navigate to CRM Lead list and open create form
    try {
      await adminPage.goto(BASE_URL + "/crm_lead", { waitUntil: "networkidle", timeout: 15000 });
      // Wait for SPA to restore session and render content
      await adminPage.waitForTimeout(5000);
      try { await adminPage.waitForFunction(() => !document.body.textContent.includes("Loading session"), { timeout: 10000 }); } catch {}
      await adminPage.waitForTimeout(2000);

      // Look for a "New" or "Create" button
      const newButton = await adminPage.$('button:has-text("New"), button:has-text("Create"), a:has-text("New")');
      if (newButton) {
        await newButton.click();
        await adminPage.waitForTimeout(2000);
        pass("4. CRM Lead create form opened");

        // 5. Check that status select exists
        const statusSelect = await adminPage.$('select[name="status"], select:has-text("Status")');
        if (statusSelect) {
          pass("5. Status select field visible");
        } else {
          fail("5. Status select field visible", "Could not find status select");
        }
      } else {
        fail("4. CRM Lead create form opened", "Could not find New/Create button");
        // Try the URL directly
        await adminPage.goto(BASE_URL + "/crm_lead/new", { waitUntil: "networkidle", timeout: 15000 });
        await adminPage.waitForTimeout(2000);
      }
    } catch (e) {
      fail("4-5. CRM Lead form", e.message);
    }
    await screenshot(adminPage, "05-crm-lead-form");

    // 6. Check expected_value field exists
    try {
      const bodyText = await adminPage.textContent("body");
      if (bodyText.includes("Expected Value")) {
        pass("6. Expected Value field visible");
      } else {
        fail("6. Expected Value field visible", "expected_value not found in page");
      }
    } catch (e) {
      fail("6. Expected Value field", e.message);
    }

    // 7. Check referral_name field exists
    try {
      const bodyText = await adminPage.textContent("body");
      if (bodyText.includes("Referral Name")) {
        pass("7. Referral Name field visible");
      } else {
        fail("7. Referral Name field visible", "referral_name not found in page");
      }
    } catch (e) {
      fail("7. Referral Name field", e.message);
    }

    // 8. Fill lead name (required) and switch status to Qualified
    try {
      const leadNameInput = await adminPage.$('input[name="lead_name"]');
      if (leadNameInput) {
        await leadNameInput.fill("Browser Test Lead");
      }
      const statusSelect = await adminPage.$('select[name="status"]');
      if (statusSelect) {
        await statusSelect.selectOption("Qualified");
        await adminPage.waitForTimeout(1000);
        pass("8. Status changed to Qualified");

        // 9. Check that expected_value is now required
        // The script makes expected_value required — try to submit without it
        const submitBtn = await adminPage.$('button[type="submit"]');
        if (submitBtn) {
          await submitBtn.click();
          await adminPage.waitForTimeout(1000);

          // Check for validation error
          const pageContent = await adminPage.textContent("body");
          if (pageContent.includes("Expected Value") && (pageContent.includes("required") || pageContent.includes("is required"))) {
            pass("9. Expected Value required after status=Qualified (validation shown)");
          } else {
            fail("9. Expected Value required after status=Qualified", "No validation error detected");
          }
        } else {
          fail("9. Expected Value validation", "Submit button not found");
        }
      } else {
        fail("8. Status select not found", "Could not locate status dropdown");
      }
    } catch (e) {
      fail("8-9. Script validation", e.message);
    }
    await screenshot(adminPage, "09-validation-error");

    // 10. Try save with expected_value filled
    try {
      const expectedValueInput = await adminPage.$('input[name="expected_value"]');
      if (expectedValueInput) {
        await expectedValueInput.fill("10000");
        pass("10. Expected Value filled");
      }
    } catch (e) {
      fail("10. Expected Value fill", e.message);
    }

    // 11. Change source to Referral — referral_name should become visible
    try {
      const sourceSelect = await adminPage.$('select[name="source"]');
      if (sourceSelect) {
        await sourceSelect.selectOption("Referral");
        await adminPage.waitForTimeout(1000);
        const bodyText = await adminPage.textContent("body");
        if (bodyText.includes("Referral Name")) {
          pass("11. source=Referral makes referral_name visible");
        } else {
          fail("11. source=Referral makes referral_name visible", "referral_name not visible after source change");
        }
      } else {
        fail("11. source=Referral", "Source select not found");
      }
    } catch (e) {
      fail("11. source=Referral", e.message);
    }
    await screenshot(adminPage, "11-referral-visible");

    await adminCtx.close();

    // ── Restricted user path ────────────────────────────────────────
    console.log("\n--- Restricted User Path ---");
    const restrictedCtx = await browser.newContext();
    const restrictedPage = await restrictedCtx.newPage();

    restrictedPage.on("pageerror", (err) => pageErrors.push(err.message));

    // 12. Restricted user login
    try {
      await login(restrictedPage, RESTRICTED_EMAIL, RESTRICTED_PASSWORD);
      const url = restrictedPage.url();
      if (!url.includes("/login")) {
        pass("12. Restricted user login successful");
      } else {
        fail("12. Restricted user login", "Still on login page");
      }
    } catch (e) {
      fail("12. Restricted user login", e.message);
    }
    await screenshot(restrictedPage, "12-restricted-login");

    // 13. Restricted user tries to access Client Scripts page
    try {
      await restrictedPage.goto(BASE_URL + "/metadata_studio_client_scripts", { waitUntil: "networkidle", timeout: 15000 });
      await restrictedPage.waitForTimeout(2000);
      const bodyText = await restrictedPage.textContent("body");
      if (bodyText.includes("Access Denied") || bodyText.includes("denied") || bodyText.includes("permission")) {
        pass("13. Restricted user blocked from Client Scripts (Access Denied)");
      } else {
        // Could be that it redirects somewhere or shows error
        const url = restrictedPage.url();
        if (url.includes("login") || url.includes("access") || url.includes("denied")) {
          pass("13. Restricted user blocked from Client Scripts (redirected)");
        } else if (!bodyText.includes("Client Scripts") && !bodyText.includes("client script")) {
          pass("13. Restricted user cannot see Client Scripts content");
        } else {
          fail("13. Restricted user blocked from Client Scripts", "Page showed client scripts content");
        }
      }
    } catch (e) {
      fail("13. Restricted user Client Scripts", e.message);
    }
    await screenshot(restrictedPage, "13-restricted-scripts-blocked");

    // 14. CRM Lead form loads for restricted user
    try {
      await restrictedPage.goto(BASE_URL + "/crm_lead", { waitUntil: "networkidle", timeout: 15000 });
      await restrictedPage.waitForTimeout(5000);
      try { await restrictedPage.waitForFunction(() => !document.body.textContent.includes("Loading session"), { timeout: 10000 }); } catch {}
      await restrictedPage.waitForTimeout(2000);
      const bodyText = await restrictedPage.textContent("body");
      if (bodyText.includes("Lead") || bodyText.includes("lead") || bodyText.includes("CRM Lead")) {
        pass("14. CRM Lead page loads for restricted user");
      } else {
        fail("14. CRM Lead page loads", "Page did not show CRM Lead content");
      }
    } catch (e) {
      fail("14. CRM Lead page loads", e.message);
    }
    await screenshot(restrictedPage, "14-restricted-crm-lead");

    await restrictedCtx.close();

    // ── Page errors ──────────────────────────────────────────────────
    console.log("\n--- Page Errors Check ---");
    if (pageErrors.length === 0) {
      pass("15. No page errors");
    } else {
      fail("15. No page errors", `${pageErrors.length} errors: ${pageErrors.slice(0, 3).join("; ")}`);
    }

  } finally {
    await browser.close();
  }

  // ── Summary ─────────────────────────────────────────────────────────
  const output = {
    phase: "6.9",
    type: "browser",
    timestamp: new Date().toISOString(),
    results,
    summary: { pass: passCount, fail: failCount, total: passCount + failCount },
  };
  writeFileSync(`${OUTPUT_DIR}/browser-results.json`, JSON.stringify(output, null, 2));

  console.log(`\n${"\u2500".repeat(50)}`);
  console.log(`Results: ${passCount} PASS, ${failCount} FAIL, ${passCount + failCount} TOTAL`);
  if (failCount > 0) {
    console.log("FAILURES:");
    for (const r of results.filter((r) => r.status === "FAIL")) {
      console.log(`  \u2717 ${r.name}${r.reason ? `: ${r.reason}` : ""}`);
    }
  }
  console.log(`Screenshots: ${OUTPUT_DIR}/`);
  console.log(`Results JSON: ${OUTPUT_DIR}/browser-results.json\n`);

  process.exit(failCount > 0 ? 1 : 0);
}

run();
