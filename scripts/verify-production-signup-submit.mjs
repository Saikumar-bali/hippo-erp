import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

await page.goto('https://hippo-erp.pages.dev/signup', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', `noreply+${Date.now()}@gmail.com`);
await page.fill('input[type="password"]', 'CodexDemo#12345Aa');
await page.getByRole('button').first().click();
await page.waitForTimeout(2000);

const body = (await page.textContent('body')) ?? '';
const successLike = /check your email|email sent|confirmation/i.test(body);
const invalidLike = /invalid|error/i.test(body);

console.log(
  JSON.stringify(
    {
      url: page.url(),
      successLike,
      invalidLike,
      sample: body.replace(/\s+/g, ' ').slice(0, 300),
    },
    null,
    2
  )
);

await browser.close();
