// From project 1's tasks tab, click to project 2's (or the broken project 999)
// and sample what is on screen every 50 ms. Usage: node scripts/switch.mjs [target] [baseURL]
import { chromium } from '@playwright/test';

const target = process.argv[2] ?? '2';
const base = process.argv[3] ?? 'http://localhost:4260';
const browser = await chromium.launch({ channel: 'msedge' });
try {
  for (const mode of ['resolvers', 'resources', 'nonblocking']) {
    const page = await browser.newPage();
    await page.goto(`${base}/${mode}/projects/1/tasks`);
    await page.waitForSelector('li.task');
    await page.waitForTimeout(200);
    const t0 = await page.evaluate(() => { window.__log.length = 0; return performance.now(); });
    await page.click(`a[href="/${mode}/projects/${target}/tasks"]`);
    const seen = [];
    for (let i = 0; i < 24; i++) {
      seen.push(await page.evaluate((t0) => {
        const h2 = document.querySelector('h2')?.textContent ?? '-';
        const tasks = [...document.querySelectorAll('li.task')].map((l) => l.textContent).slice(0, 1).join('');
        const loading = document.querySelector('.loading') ? 'LOADING' : '';
        const error = document.querySelector('.error') ? 'ERROR' : '';
        return `${String(Math.round(performance.now() - t0)).padStart(5)} ms  url=${location.pathname}  h2=${h2}  ${tasks} ${loading}${error}`;
      }, t0));
      await page.waitForTimeout(50);
    }
    const log = await page.evaluate(() => window.__log);
    console.log(`\n${mode} -> project ${target}`);
    let last = '';
    for (const s of seen) { const k = s.slice(9); if (k !== last) console.log('  ' + s); last = k; }
    for (const e of log) console.log(`    log ${String(Math.round(e.t - t0)).padStart(5)} ms  ${e.what}`);
    await page.close();
  }
} finally {
  await browser.close();
}
