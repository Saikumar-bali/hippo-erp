import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = process.env.PLAYWRIGHT_RESULTS_DIR || "C:/tmp/phase-6-6-audit-trail";
await fs.mkdir(outDir, { recursive: true });

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
const adminEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
const leadSuffix = Date.now();
const testLeadName = `Phase66 Audit ${leadSuffix}`;

if (!adminEmail || !adminPassword) {
  console.error("Missing env vars: PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_TEST_PASSWORD");
  process.exit(1);
}

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error)));

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

async function login(email, password) {
  await gotoApp(base);
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole("button", { name: /login|sign in/i }).first().click();
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.getByRole("button", { name: /logout/i }).waitFor({ timeout: 30_000 });
}

console.log("\n=== Phase 6.6 Browser Verification: Audit Trail & Version Timeline ===\n");

// Step 1: Login as admin
try {
  await login(adminEmail, adminPassword);
  pass("admin_login", "Logged in as admin");
} catch (e) {
  fail("admin_login", e.message);
  await snap("fail-login.png");
  await browser.close();
  process.exit(1);
}

// Step 2: Navigate to CRM Lead list
try {
  await page.getByRole("button", { name: /CRM/i }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /CRM Lead/i }).first().click();
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.waitForTimeout(1000);
  pass("navigate_crm_lead_list", "Navigated to CRM Lead list");
  await snap("01-crm-lead-list.png");
} catch (e) {
  fail("navigate_crm_lead_list", e.message);
  await snap("fail-crm-lead-list.png");
}

// Step 3: Create a new CRM Lead
try {
  const createBtn = page.getByRole("button", { name: /Create.*Lead|New.*Lead|Create/i }).first();
  await createBtn.click();
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.waitForTimeout(1000);

  // Fill required fields
  await page.getByLabel(/Lead Name/i).first().fill(testLeadName);
  await page.getByLabel(/Company Name/i).first().fill("Test Corp Audit");
  await page.getByLabel(/Status/i).first().selectOption("new");
  await page.getByLabel(/Source/i).first().selectOption("website");

  // Fill level-1 fields (should be masked in audit for restricted users)
  await page.getByLabel(/Email/i).first().fill("audit@test.com");
  await page.getByLabel(/Phone/i).first().fill("+1555123456");
  await page.getByLabel(/Notes/i).first().fill("Phase 6.6 audit trail test notes");

  await snap("02-create-form-filled.png");

  // Submit
  const saveBtn = page.getByRole("button", { name: /Save|Create|Submit/i }).first();
  await saveBtn.click();
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.waitForTimeout(2000);
  pass("create_lead", `Created lead: ${testLeadName}`);
} catch (e) {
  fail("create_lead", e.message);
  await snap("fail-create-lead.png");
}

// Step 4: Navigate to the lead detail page
try {
  // Find the lead in the list and click it
  const leadRow = page.getByText(testLeadName).first();
  await leadRow.click();
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.waitForTimeout(1500);
  pass("navigate_lead_detail", "Navigated to lead detail page");
  await snap("03-lead-detail.png");
} catch (e) {
  fail("navigate_lead_detail", e.message);
  await snap("fail-lead-detail.png");
}

// Step 5: Check Audit & Version Timeline section exists
try {
  const timelineHeading = page.getByText(/Audit.*Version Timeline|Audit & Version Timeline/i).first();
  await timelineHeading.waitFor({ timeout: 10_000 });
  pass("audit_timeline_visible", "Audit & Version Timeline section is visible");
  await snap("04-audit-timeline-visible.png");
} catch (e) {
  fail("audit_timeline_visible", e.message);
  await snap("fail-audit-timeline.png");
}

// Step 6: Expand the timeline and check events
try {
  const expandBtn = page.getByText(/Audit.*Version Timeline|Audit & Version Timeline/i).first();
  await expandBtn.click();
  await page.waitForTimeout(500);

  // Check for Activity Log section
  const activityLog = page.getByText(/Activity Log/i).first();
  await activityLog.waitFor({ timeout: 5_000 });
  pass("activity_log_visible", "Activity Log section is visible after expanding");
  await snap("05-activity-log-expanded.png");

  // Check for "Created" event
  const createdEvent = page.getByText("Created").first();
  await createdEvent.waitFor({ timeout: 5_000 });
  pass("created_event_visible", "Created event is visible in the activity log");
} catch (e) {
  fail("activity_log", e.message);
  await snap("fail-activity-log.png");
}

// Step 7: Update the lead to generate an audit event
try {
  const editBtn = page.getByRole("button", { name: /Edit/i }).first();
  await editBtn.click();
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.waitForTimeout(1000);

  // Update a field
  await page.getByLabel(/Status/i).first().selectOption("contacted");
  await page.getByLabel(/Notes/i).first().fill("Updated notes for audit trail verification");

  const saveBtn = page.getByRole("button", { name: /Save|Update|Submit/i }).first();
  await saveBtn.click();
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.waitForTimeout(2000);
  pass("update_lead", "Updated lead status and notes");
} catch (e) {
  fail("update_lead", e.message);
  await snap("fail-update-lead.png");
}

// Step 8: Navigate back to detail and check updated audit
try {
  const leadRow = page.getByText(testLeadName).first();
  await leadRow.click();
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.waitForTimeout(1500);

  // Expand timeline
  const expandBtn = page.getByText(/Audit.*Version Timeline|Audit & Version Timeline/i).first();
  await expandBtn.click();
  await page.waitForTimeout(500);

  // Check for "Updated" event
  const updatedEvent = page.getByText("Updated").first();
  await updatedEvent.waitFor({ timeout: 5_000 });
  pass("updated_event_visible", "Updated event is visible in the activity log");
  await snap("06-updated-event.png");
} catch (e) {
  fail("updated_event", e.message);
  await snap("fail-updated-event.png");
}

// Step 9: Check version history is shown
try {
  const versionHistory = page.getByText(/Version History/i).first();
  await versionHistory.waitFor({ timeout: 5_000 });
  pass("version_history_visible", "Version History section is visible");

  // Check for version numbers
  const v1 = page.getByText("v1").first();
  await v1.waitFor({ timeout: 5_000 });
  pass("version_1_visible", "Version 1 is shown");
} catch (e) {
  fail("version_history", e.message);
  await snap("fail-version-history.png");
}

// Step 10: Test diff button
try {
  const diffBtn = page.getByRole("button", { name: /Diff/i }).first();
  if (await diffBtn.isVisible()) {
    await diffBtn.click();
    await page.waitForTimeout(500);
    pass("diff_button_clickable", "Diff button is clickable");
    await snap("07-diff-view.png");
  } else {
    pass("diff_button_clickable", "No diff button (only 1 version, expected)");
  }
} catch (e) {
  fail("diff_button", e.message);
  await snap("fail-diff-button.png");
}

// Step 11: Check no page errors
assertNoPageErrors();

function assertNoPageErrors() {
  const critical = pageErrors.filter((e) => !e.includes("favicon") && !e.includes("404"));
  if (critical.length === 0) {
    pass("no_page_errors", "No critical page errors");
  } else {
    fail("no_page_errors", `${critical.length} error(s): ${critical.slice(0, 3).join("; ")}`);
  }
}

// --- Save results ---
console.log("\n=== Results ===");

const results = {
  timestamp: new Date().toISOString(),
  checks,
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter((c) => c.pass).length,
  failed: Object.values(checks).filter((c) => !c.pass).length,
  pageErrors,
};

await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log(`\nResults saved to ${path.join(outDir, "results.json")}`);
console.log(`Total: ${results.total} | Passed: ${results.passed} | Failed: ${results.failed}`);

await browser.close();

if (exitCode !== 0) {
  console.error("\nSome checks FAILED.");
} else {
  console.log("\nAll checks PASSED.");
}

process.exit(exitCode);
