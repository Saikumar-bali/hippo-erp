import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('artifacts', 'screenshots');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const result = {
  loginLoaded: false,
  signupOpened: false,
  resetOpened: false,
  resetSubmitted: false,
  observedMessages: [],
};

await page.goto('https://hippo-erp.pages.dev/login', { waitUntil: 'networkidle' });
result.loginLoaded = page.url().includes('/login');

await page.getByRole('link', { name: /create account/i }).click();
await page.waitForLoadState('networkidle');
result.signupOpened = /signup/.test(page.url());
await page.screenshot({ path: path.join(outDir, 'signup-desktop.png'), fullPage: true });

await page.goto('https://hippo-erp.pages.dev/reset', { waitUntil: 'networkidle' });
result.resetOpened = /\/reset$/.test(page.url());
await page.fill('input[type="email"]', `noreply+${Date.now()}@gmail.com`);
await page.getByRole('button').first().click();
await page.waitForTimeout(1500);
result.resetSubmitted = true;

const content = await page.textContent('body');
if (content) {
  const lines = content
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => /email|reset|sent|error|invalid|check/i.test(s))
    .slice(0, 10);
  result.observedMessages = lines;
}

await page.screenshot({ path: path.join(outDir, 'reset-desktop.png'), fullPage: true });

await browser.close();
console.log(JSON.stringify(result, null, 2));
