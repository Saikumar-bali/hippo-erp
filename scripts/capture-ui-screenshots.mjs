import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('artifacts', 'screenshots');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const desktopPage = await desktop.newPage();
await desktopPage.goto('https://hippo-erp.pages.dev/login', { waitUntil: 'networkidle' });
await desktopPage.screenshot({ path: path.join(outDir, 'login-desktop.png'), fullPage: true });
await desktop.close();

const mobile = await browser.newContext({ ...devices['Pixel 7'] });
const mobilePage = await mobile.newPage();
await mobilePage.goto('https://hippo-erp.pages.dev/login', { waitUntil: 'networkidle' });
await mobilePage.screenshot({ path: path.join(outDir, 'login-mobile.png'), fullPage: true });
await mobile.close();

await browser.close();
console.log(outDir);
