#!/usr/bin/env node
/**
 * Debug script: capture DOM state at each step to understand why .detail-head is not found
 */

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://[::1]:5174";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const OUTPUT_DIR = "C:/tmp/phase-6-7-1-browser-security";

mkdirSync(OUTPUT_DIR, { recursive: true });

async function screenshot(page, name) {
  try { await page.screenshot({ path: `${OUTPUT_DIR}/${name}.png`, fullPage: true }); } catch {}
}

async function dumpDOM(page, label) {
  const info = await page.evaluate(() => {
    const body = document.body;
    const loadingEl = body.querySelector("*");
    const loadingText = body.innerText.substring(0, 500);
    const hasDetailHead = !!body.querySelector(".detail-head");
    const hasFormActions = !!body.querySelector(".form-actions");
    const hasWsItem = !!body.querySelector("button.ws-item");
    const wsItemCount = body.querySelectorAll("button.ws-item").length;
    const miniBadges = Array.from(body.querySelectorAll(".mini-badge")).map(el => el.textContent);
    const primaryActions = Array.from(body.querySelectorAll(".primary-action")).map(el => el.textContent);
    const tableRows = body.querySelectorAll("table tbody tr").length;
    const url = window.location.href;
    const title = document.title;
    return { url, title, loadingText, hasDetailHead, hasFormActions, hasWsItem, wsItemCount, miniBadges, primaryActions, tableRows };
  }).catch(e => ({ error: e.message }));
  console.log(`\n[DOM] ${label}:`, JSON.stringify(info, null, 2));
  writeFileSync(`${OUTPUT_DIR}/dom-${label.replace(/\s+/g, "_")}.json`, JSON.stringify(info, null, 2));
  return info;
}

async function run() {
  console.log("\n=== Debug: Browser Detail Page ===\n");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");
    await screenshot(page, "debug-01-login-page");
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 15000 }).catch(() => {});
    
    // Wait for loading to finish
    const startWait = Date.now();
    while (Date.now() - startWait < 15000) {
      const loading = await page.locator("text=Loading session...").isVisible().catch(() => false);
      if (!loading) break;
      await page.waitForTimeout(500);
    }
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2000);
    
    await dumpDOM(page, "after-login");
    await screenshot(page, "debug-02-after-login");

    // 2. Wait for sidebar
    const sidebarStart = Date.now();
    while (Date.now() - sidebarStart < 20000) {
      const count = await page.locator('button.ws-item').count().catch(() => 0);
      if (count > 2) break;
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1000);
    await dumpDOM(page, "sidebar-loaded");

    // 3. Click Leads
    const leadsBtn = page.locator('button.ws-item').filter({ hasText: /^Leads$/ }).first();
    const leadsVisible = await leadsBtn.isVisible({ timeout: 10000 }).catch(() => false);
    console.log(`\n[DEBUG] Leads button visible: ${leadsVisible}`);
    
    if (leadsVisible) {
      await leadsBtn.scrollIntoViewIfNeeded().catch(() => {});
      await leadsBtn.click();
      await page.waitForTimeout(3000);
      await page.waitForLoadState("networkidle").catch(() => {});
      await dumpDOM(page, "after-click-leads");
      await screenshot(page, "debug-03-after-click-leads");
    }

    // 4. Check table rows
    const rowCount = await page.locator('table tbody tr').count().catch(() => 0);
    console.log(`\n[DEBUG] Table rows: ${rowCount}`);

    // 5. Click first row
    const firstRow = page.locator('table tbody tr').first();
    const rowVisible = await firstRow.isVisible({ timeout: 8000 }).catch(() => false);
    console.log(`\n[DEBUG] First row visible: ${rowVisible}`);
    
    if (rowVisible) {
      await firstRow.click();
      console.log(`\n[DEBUG] Row clicked at ${new Date().toISOString()}`);
      
      // Wait and dump DOM at intervals
      for (const delay of [500, 1000, 2000, 3000, 5000]) {
        await page.waitForTimeout(delay === 500 ? 500 : delay - (delay === 1000 ? 500 : delay === 2000 ? 1000 : delay === 3000 ? 2000 : 3000));
        await dumpDOM(page, `after-row-click-${delay}ms`);
        await screenshot(page, `debug-04-row-click-${delay}ms`);
        
        const hasDetail = await page.evaluate(() => !!document.querySelector(".detail-head"));
        if (hasDetail) {
          console.log(`\n[DEBUG] .detail-head found after ${delay}ms!`);
          break;
        }
      }
      
      // Final check
      await page.waitForTimeout(3000);
      await dumpDOM(page, "final-state");
      await screenshot(page, "debug-05-final");
    }

  } catch (e) {
    console.error("Error:", e.message);
    await screenshot(page, "debug-error");
  } finally {
    await browser.close();
  }
  console.log("\n=== Debug complete ===\n");
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
