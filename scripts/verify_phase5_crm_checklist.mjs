import { chromium } from "playwright";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
const email = process.env.PLAYWRIGHT_TEST_EMAIL;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

if (!email || !password) {
  console.error("Missing browser-test credentials. Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD.");
  process.exit(1);
}

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

page.on("console", msg => {
  console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
});

async function login() {
  console.log("Navigating to login...");
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  console.log("Current URL:", page.url());
  
  const emailInput = page.locator('input[type="email"], input[name="email"], label:has-text("Email") + input').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"], label:has-text("Password") + input').first();
  const loginButton = page.getByRole("button", { name: /login|sign in/i }).first();

  if (await emailInput.isVisible()) {
    console.log("Login form visible, performing login...");
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await loginButton.click();
    await page.waitForURL(url => url.pathname === "/" || url.pathname === "" || url.searchParams.has("tenant_id"), { timeout: 15000 });
    console.log("Login successful, reached home.");
  } else {
    console.log("Login form not visible, checking if already logged in.");
    if (page.url().includes("/login")) {
       throw new Error("Stuck on login page but form not visible");
    }
  }
  await page.waitForLoadState("networkidle");
}

async function runChecklist(doctypeKey) {
  const checkUrl = `${base}/metadata_studio_doc_check:${doctypeKey}`;
  console.log(`Checking ${doctypeKey} via ${checkUrl}...`);
  await page.goto(checkUrl, { waitUntil: "networkidle" });
  console.log("Current URL after navigation:", page.url());
  
  try {
    await page.getByText("DocType exists", { exact: true }).waitFor({ timeout: 10_000 });
    await page.getByText("Route/API can resolve", { exact: true }).waitFor({ timeout: 5_000 });
    
    // Wait for results for: <doctypeKey> to be visible to ensure it loaded
    await page.locator(`code:has-text("${doctypeKey}")`).waitFor({ timeout: 5_000 });

    const body = await page.locator("body").innerText();
    if (/error\(s\)/i.test(body)) {
      console.error(`Checklist reported errors for ${doctypeKey}:\n${body}`);
      await page.screenshot({ path: `checklist_error_${doctypeKey}.png` });
      throw new Error(`Checklist reported an error for ${doctypeKey}`);
    }
    console.log(`Checklist PASSED for ${doctypeKey}`);
  } catch (err) {
    console.error(`Failed to verify checklist for ${doctypeKey}: ${err.message}`);
    await page.screenshot({ path: `checklist_fail_${doctypeKey}.png` });
    throw err;
  }
}

try {
  await login();
  await runChecklist("crm_lead");
  await runChecklist("crm_opportunity");
  console.log(JSON.stringify({ ok: true, checked: ["crm_lead", "crm_opportunity"] }, null, 2));
} finally {
  await browser.close();
}
