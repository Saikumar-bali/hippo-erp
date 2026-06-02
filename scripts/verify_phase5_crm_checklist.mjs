import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

const base = "http://127.0.0.1:4173";
const email = "saikumarbali555@gmail.com";
const password = "Hippo@123";

async function login() {
  await page.goto(base, { waitUntil: "networkidle" });
  if (await page.getByLabel(/email/i).count()) {
    await page.getByLabel(/email/i).first().fill(email);
    await page.getByLabel(/password/i).first().fill(password);
    await page.getByRole("button", { name: /login|sign in/i }).first().click();
  }
  await page.waitForLoadState("networkidle");
}

async function openBuilderHome() {
  const openBuilderHome = page.getByRole("button", { name: /open builder home/i }).first();
  if (!await openBuilderHome.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^Metadata Studio$/i }).first().click();
    await page.waitForTimeout(250);
  }
  await openBuilderHome.waitFor({ timeout: 30_000 });
  await openBuilderHome.click();
  await page.getByRole("button", { name: /open check \/ repair/i }).first().waitFor({ timeout: 30_000 });
}

async function runChecklist(doctypeKey) {
  const checkUrl = `${base}/metadata_studio_doc_check:${doctypeKey}`;
  console.log(`Checking ${doctypeKey} via ${checkUrl}...`);
  await page.goto(checkUrl, { waitUntil: "networkidle" });
  
  await page.getByText("DocType exists", { exact: true }).waitFor({ timeout: 30_000 });
  await page.getByText("Route/API can resolve", { exact: true }).waitFor({ timeout: 30_000 });
  
  // Wait for results for: <doctypeKey> to be visible to ensure it loaded
  await page.locator(`code:has-text("${doctypeKey}")`).waitFor({ timeout: 10_000 });

  const body = await page.locator("body").innerText();
  if (/No default|Permission denied|Unknown DocType|error\(s\)/i.test(body)) {
    throw new Error(`Checklist reported an error for ${doctypeKey}\n${body}`);
  }
  console.log(`Checklist PASSED for ${doctypeKey}`);
}

try {
  await login();
  await runChecklist("crm_lead");
  await runChecklist("crm_opportunity");
  console.log(JSON.stringify({ ok: true, checked: ["crm_lead", "crm_opportunity"] }, null, 2));
} finally {
  await browser.close();
}
