// From the home page, click to the non-blocking tasks tab and sample the screen
// every 25 ms. Usage: node scripts/fresh.mjs [baseURL]
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:4260';
const browser = await chromium.launch({ channel: 'msedge' });
try {
  const page = await browser.newPage();
  await page.goto(base + '/');
  await page.waitForSelector('.home');
  await page.waitForTimeout(200);
  const t0 = await page.evaluate(() => performance.now());
  await page.click('a[href="/nonblocking/projects/1/tasks"]');
  let last = '';
  for (let i = 0; i < 40; i++) {
    const s = await page.evaluate(() => document.querySelector('app-root > :last-child')?.outerHTML.replace(/<!--.*?-->/g, '').slice(0, 220) ?? '-');
    if (s !== last) console.log(`${Math.round((await page.evaluate(() => performance.now())) - t0)} ms  ${s}`);
    last = s;
    await page.waitForTimeout(25);
  }
} finally {
  await browser.close();
}
