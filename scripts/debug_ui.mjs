import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = "C:/tmp/phase-6-3-debug";
await fs.mkdir(outDir, { recursive: true });

const base = "http://localhost:5173";
const email = "saikumarbali555@gmail.com";
const password = "Hippo@123";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(`${base}/login`);
  await page.fill('input[placeholder="Email"]', email);
  await page.fill('input[placeholder="Password"]', password);
  await page.click('button.primary-action');
  await page.waitForSelector('button:has-text("Logout")', { timeout: 15000 });

  console.log("Logged in. Navigating to crm_lead...");
  await page.goto(`${base}/crm_lead`);
  await page.waitForTimeout(8000);
  await page.screenshot({ path: path.join(outDir, "lead_list.png"), fullPage: true });
  
  const body = await page.innerText('body');
  console.log("Body text snippet:", body.substring(0, 500));

  const rows = await page.locator('tr').count();
  console.log("Table rows found:", rows);

  const buttons = await page.locator('button').allTextContents();
  console.log("Buttons found:", buttons);

} catch (err) {
  console.error(err);
} finally {
  await browser.close();
}
