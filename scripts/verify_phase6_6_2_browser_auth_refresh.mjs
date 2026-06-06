import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = process.env.PLAYWRIGHT_RESULTS_DIR || "C:/tmp/phase-6-6-2-browser-auth";
await fs.mkdir(outDir, { recursive: true });

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5174";
const adminEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
const lowEmail = process.env.PLAYWRIGHT_LOW_PRIV_EMAIL;
const lowPassword = process.env.PLAYWRIGHT_LOW_PRIV_PASSWORD;

if (!adminEmail || !adminPassword || !lowEmail || !lowPassword) {
  console.error("Missing env vars: PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_TEST_PASSWORD, PLAYWRIGHT_LOW_PRIV_EMAIL, PLAYWRIGHT_LOW_PRIV_PASSWORD");
  process.exit(1);
}

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error)));
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

const checks = {};
let exitCode = 0;

function pass(name, detail) {
  checks[name] = { pass: true, detail };
  console.log(`  PASS  ${name}: ${detail}`);
}

function fail(name, detail) {
  checks[name] = { pass: false, detail };
  console.error(`  FAIL  ${name}: ${detail}`);
  exitCode = 1;
}

function assert(condition, name, detail) {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

async function snap(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

async function gotoApp(url) {
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 15_000 });
      return;
    } catch {
      await page.waitForTimeout(1500);
    }
  }
}

async function clearAuthState() {
  // Clear Supabase auth tokens from localStorage
  await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("sb-") || key === "tenant_id" || key === "hippo_company_cache") {
        localStorage.removeItem(key);
      }
    }
  });
}

console.log("\n=== Phase 6.6.2: Browser Auth Refresh Verification ===\n");

// ──────────────────────────────────────────────────────────────
// PART A: Admin login without manual refresh
// ──────────────────────────────────────────────────────────────
console.log("--- Part A: Admin Login ---");

// A1. Clear any existing auth state and navigate to app
try {
  await gotoApp(base);
  await clearAuthState();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  pass("clear_auth_state", "Cleared auth state and reloaded");
  await snap("01-cleared-auth.png");
} catch (e) {
  fail("clear_auth_state", e.message);
  await snap("fail-clear-auth.png");
}

// A2. Verify we land on login page (not stuck on loading)
try {
  // Wait for either login form or loading to resolve
  const url = page.url();
  const isOnLogin = url.includes("/login") || await page.getByLabel(/email/i).first().isVisible({ timeout: 5000 }).catch(() => false);
  assert(isOnLogin, "on_login_page", `URL: ${url}`);
  await snap("02-login-page.png");
} catch (e) {
  fail("on_login_page", e.message);
  await snap("fail-login-page.png");
}

// A3. Fill login form and submit as admin
try {
  await page.getByLabel(/email/i).first().fill(adminEmail);
  await page.getByLabel(/password/i).first().fill(adminPassword);
  await snap("03-login-form-filled.png");
  await page.getByRole("button", { name: /login|sign in/i }).first().click();
  pass("admin_form_submit", "Submitted admin login form");
} catch (e) {
  fail("admin_form_submit", e.message);
  await snap("fail-admin-form.png");
}

// A4. Wait for navigation away from login (app should load without manual refresh)
try {
  // The app should navigate to "/" after login. Wait for the Logout button (proves app loaded).
  await page.getByRole("button", { name: /logout/i }).waitFor({ timeout: 30_000 });
  const url = page.url();
  assert(!url.includes("/login"), "admin_no_refresh_landed_on_app", `Landed on: ${url}`);
  await snap("04-admin-logged-in.png");
} catch (e) {
  fail("admin_no_refresh_landed_on_app", `Still on login or timed out: ${page.url()}`);
  await snap("fail-admin-login-stuck.png");
}

// A5. Verify no "Loading session..." text visible (no infinite loading)
try {
  const loadingText = page.getByText("Loading session...").first();
  const isLoadingVisible = await loadingText.isVisible({ timeout: 2000 }).catch(() => false);
  assert(!isLoadingVisible, "admin_no_infinite_loading", "No 'Loading session...' visible after login");
} catch (e) {
  fail("admin_no_infinite_loading", e.message);
}

// A6. Verify company context loaded (tenant_id in localStorage)
try {
  // tenant_id is set asynchronously by refreshTenants; poll until available
  let tenantId = null;
  for (let i = 0; i < 20; i++) {
    tenantId = await page.evaluate(() => localStorage.getItem("tenant_id"));
    if (tenantId) break;
    await page.waitForTimeout(500);
  }
  assert(!!tenantId, "admin_company_context_loaded", `tenant_id: ${tenantId}`);
} catch (e) {
  fail("admin_company_context_loaded", e.message);
}

// A7. Verify sidebar / workspace items are visible (permissions loaded)
try {
  // The sidebar should have workspace items. Look for any sidebar content.
  const sidebar = page.locator(".sidebar, [class*='sidebar'], nav").first();
  const hasSidebar = await sidebar.isVisible({ timeout: 5000 }).catch(() => false);
  // Also check for the user email in topbar (proves session is active)
  const userEmail = page.getByText(adminEmail).first();
  const hasEmail = await userEmail.isVisible({ timeout: 3000 }).catch(() => false);
  assert(hasSidebar || hasEmail, "admin_permissions_loaded", `Sidebar: ${hasSidebar}, Email visible: ${hasEmail}`);
  await snap("05-admin-workspace.png");
} catch (e) {
  fail("admin_permissions_loaded", e.message);
}

// A8. Verify no "Access Denied" or false error state
try {
  const accessDenied = page.getByText(/access denied|permission denied/i).first();
  const hasAccessDenied = await accessDenied.isVisible({ timeout: 2000 }).catch(() => false);
  assert(!hasAccessDenied, "admin_no_access_denied", "No 'Access Denied' state visible");
} catch (e) {
  fail("admin_no_access_denied", e.message);
}

// ──────────────────────────────────────────────────────────────
// PART B: Logout through real UI
// ──────────────────────────────────────────────────────────────
console.log("\n--- Part B: Logout ---");

try {
  const logoutBtn = page.getByRole("button", { name: /logout/i }).first();
  await logoutBtn.click();
  // Wait for redirect to login page
  await page.getByLabel(/email/i).first().waitFor({ timeout: 15_000 });
  const url = page.url();
  assert(url.includes("/login"), "logout_landed_on_login", `Landed on: ${url}`);
  pass("ui_logout", "Logged out through UI");
  await snap("06-after-logout.png");
} catch (e) {
  fail("ui_logout", e.message);
  await snap("fail-logout.png");
}

// ──────────────────────────────────────────────────────────────
// PART C: Restricted user login without manual refresh
// ──────────────────────────────────────────────────────────────
console.log("\n--- Part C: Restricted User Login ---");

// C1. Clear auth state for clean restricted user login
try {
  await clearAuthState();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  pass("clear_for_restricted", "Cleared auth state for restricted user");
} catch (e) {
  fail("clear_for_restricted", e.message);
}

// C2. Fill login form and submit as restricted user
try {
  await page.getByLabel(/email/i).first().fill(lowEmail);
  await page.getByLabel(/password/i).first().fill(lowPassword);
  await page.getByRole("button", { name: /login|sign in/i }).first().click();
  pass("restricted_form_submit", "Submitted restricted user login form");
} catch (e) {
  fail("restricted_form_submit", e.message);
  await snap("fail-restricted-form.png");
}

// C3. Wait for navigation away from login (app should load without manual refresh)
try {
  // Restricted user should land on an allowed page. Wait for either logout button or an allowed page.
  await page.getByRole("button", { name: /logout/i }).waitFor({ timeout: 30_000 });
  const url = page.url();
  assert(!url.includes("/login"), "restricted_no_refresh_landed_on_app", `Landed on: ${url}`);
  await snap("07-restricted-logged-in.png");
} catch (e) {
  fail("restricted_no_refresh_landed_on_app", `Still on login or timed out: ${page.url()}`);
  await snap("fail-restricted-login-stuck.png");
}

// C4. Verify no "Loading session..." (no infinite loading for restricted user)
try {
  const loadingText = page.getByText("Loading session...").first();
  const isLoadingVisible = await loadingText.isVisible({ timeout: 2000 }).catch(() => false);
  assert(!isLoadingVisible, "restricted_no_infinite_loading", "No 'Loading session...' visible after login");
} catch (e) {
  fail("restricted_no_infinite_loading", e.message);
}

// C5. Verify company context loaded for restricted user
try {
  let tenantId = null;
  for (let i = 0; i < 20; i++) {
    tenantId = await page.evaluate(() => localStorage.getItem("tenant_id"));
    if (tenantId) break;
    await page.waitForTimeout(500);
  }
  assert(!!tenantId, "restricted_company_context_loaded", `tenant_id: ${tenantId}`);
} catch (e) {
  fail("restricted_company_context_loaded", e.message);
}

// C6. Verify no "Access Denied" false state
try {
  const accessDenied = page.getByText(/access denied|permission denied/i).first();
  const hasAccessDenied = await accessDenied.isVisible({ timeout: 2000 }).catch(() => false);
  assert(!hasAccessDenied, "restricted_no_access_denied", "No 'Access Denied' state visible");
} catch (e) {
  fail("restricted_no_access_denied", e.message);
}

// C7. Verify restricted user is on an allowed page (not stuck on loading)
try {
  // Check that the page has actual content (not just a loading spinner)
  const pageContent = await page.textContent("body");
  const hasContent = pageContent && pageContent.length > 100;
  assert(hasContent, "restricted_page_has_content", `Body length: ${pageContent?.length ?? 0}`);
  await snap("08-restricted-workspace.png");
} catch (e) {
  fail("restricted_page_has_content", e.message);
}

// ──────────────────────────────────────────────────────────────
// PART D: No page errors
// ──────────────────────────────────────────────────────────────
console.log("\n--- Part D: Error Summary ---");

const criticalPageErrors = pageErrors.filter((e) => !e.includes("favicon") && !e.includes("404"));
assert(criticalPageErrors.length === 0, "no_critical_page_errors", criticalPageErrors.length === 0 ? "No critical page errors" : `${criticalPageErrors.length} error(s): ${criticalPageErrors.slice(0, 3).join("; ")}`);

const criticalConsoleErrors = consoleErrors.filter((e) => !e.includes("favicon") && !e.includes("404") && !e.includes("[auth]"));
assert(criticalConsoleErrors.length === 0, "no_critical_console_errors", criticalConsoleErrors.length === 0 ? "No critical console errors" : `${criticalConsoleErrors.length} error(s): ${criticalConsoleErrors.slice(0, 3).join("; ")}`);

// ──────────────────────────────────────────────────────────────
// Save results
// ──────────────────────────────────────────────────────────────
console.log("\n=== Results ===");

const results = {
  timestamp: new Date().toISOString(),
  baseUrl: base,
  checks,
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter((c) => c.pass).length,
  failed: Object.values(checks).filter((c) => !c.pass).length,
  pageErrors: criticalPageErrors,
  consoleErrors: criticalConsoleErrors,
  screenshotsDir: outDir,
};

await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log(`\nResults saved to ${path.join(outDir, "results.json")}`);
console.log(`Screenshots saved to ${outDir}`);
console.log(`Total: ${results.total} | Passed: ${results.passed} | Failed: ${results.failed}`);

await browser.close();

if (exitCode !== 0) {
  console.error("\nSome checks FAILED.");
} else {
  console.log("\nAll checks PASSED.");
}

process.exit(exitCode);
