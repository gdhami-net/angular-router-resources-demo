// Prints the request/router timeline for one navigation per mode.
// Usage: node scripts/explore.mjs [baseURL]   (default http://localhost:4260)
// Playwright gives Edge a temporary profile and deletes it on close(), which
// runs in the finally block whatever happens.
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:4260';
const browser = await chromium.launch({ channel: 'msedge' });
try {
  for (const mode of ['resolvers', 'resources', 'nonblocking']) {
    const page = await browser.newPage();
    page.on('console', (m) => m.type() === 'error' && console.log('  console error:', m.text()));
    await page.goto(base + '/');
    await page.waitForSelector('.home');
    await page.waitForTimeout(300);
    const t0 = await page.evaluate(() => {
      window.__log.length = 0;
      return Math.round(performance.now());
    });
    await page.click(`a[href="/${mode}/projects/1/tasks"]`);
    await page.waitForSelector('li.task', { timeout: 5000 }).catch(() => console.log('  no tasks shown'));
    await page.waitForTimeout(200);
    const log = await page.evaluate(() => window.__log);
    console.log(`\n${mode}`);
    for (const e of log) console.log(`  ${String(e.t - t0).padStart(5)} ms  ${e.what}`);
    await page.close();
  }
} finally {
  await browser.close();
}
