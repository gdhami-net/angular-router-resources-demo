import { Page, expect, test } from '@playwright/test';

// The fake backend answers the project after 400 ms and its tasks after 600 ms
// (src/app/api.ts). These bounds leave room for a slow machine, and they still
// can't both hold unless resolvers wait for the sum and resources for the larger.
const PROJECT_MS = 400;
const TASKS_MS = 600;
const SLACK_MS = 250;
const RUNS = 5;

type Mode = 'resolvers' | 'resources' | 'nonblocking';

interface Run {
  shown: number; // NavigationStart to the first task in the DOM
  navEnd: number; // NavigationStart to NavigationEnd
  log: { t: number; what: string }[]; // relative to NavigationStart
}

// From the home page, click through to project 1's tasks tab and time it.
async function measure(page: Page, mode: Mode): Promise<Run> {
  await page.goto('/');
  await page.locator('.home').waitFor();
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    window.__log.length = 0;
    window.__shown = null;
    new MutationObserver((_, observer) => {
      if (document.querySelector('li.task')) {
        window.__shown = performance.now();
        observer.disconnect();
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.click(`a[href="/${mode}/projects/1/tasks"]`);
  await page.locator('li.task').first().waitFor();
  await page.waitForFunction(() => window.__log.some((e) => e.what.startsWith('end tasks')));
  const { log, shown } = await page.evaluate(() => ({ log: window.__log, shown: window.__shown! }));
  const t0 = log.find((e) => e.what.startsWith('NavigationStart'))!.t;
  const at = (what: string) => log.find((e) => e.what.startsWith(what))!.t - t0;
  return {
    shown: Math.round(shown - t0),
    navEnd: at('NavigationEnd'),
    log: log.map((e) => ({ t: e.t - t0, what: e.what })),
  };
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

async function runs(page: Page, mode: Mode): Promise<Run[]> {
  const out: Run[] = [];
  for (let i = 0; i < RUNS; i++) out.push(await measure(page, mode));
  const shown = out.map((r) => r.shown);
  console.log(`${mode.padEnd(11)} tasks on screen after: ${shown.join(', ')} ms (median ${median(shown)})`);
  return out;
}

const startOf = (r: Run, what: string) => r.log.find((e) => e.what === `start ${what}`)!.t;
const endOf = (r: Run, what: string) => r.log.find((e) => e.what === `end ${what}`)!.t;

test('resolvers: the child request starts only after the parent response, so the tab waits for both', async ({ page }) => {
  for (const r of await runs(page, 'resolvers')) {
    expect(startOf(r, 'tasks 1')).toBeGreaterThanOrEqual(endOf(r, 'project 1'));
    expect(r.shown).toBeGreaterThanOrEqual(PROJECT_MS + TASKS_MS);
    expect(r.shown).toBeLessThan(PROJECT_MS + TASKS_MS + SLACK_MS);
  }
});

test('router resources: both requests start together, so the tab waits for the slower one', async ({ page }) => {
  for (const r of await runs(page, 'resources')) {
    expect(Math.abs(startOf(r, 'tasks 1') - startOf(r, 'project 1'))).toBeLessThanOrEqual(5);
    expect(startOf(r, 'tasks 1')).toBeLessThan(endOf(r, 'project 1'));
    expect(r.shown).toBeGreaterThanOrEqual(TASKS_MS);
    expect(r.shown).toBeLessThan(TASKS_MS + SLACK_MS);
  }
});

test('router resources save about the parent delay on every run', async ({ page }) => {
  const resolvers = median((await runs(page, 'resolvers')).map((r) => r.shown));
  const resources = median((await runs(page, 'resources')).map((r) => r.shown));
  console.log(`median saving: ${resolvers - resources} ms`);
  expect(resolvers - resources).toBeGreaterThan(PROJECT_MS - 100);
  expect(resolvers - resources).toBeLessThan(PROJECT_MS + 100);
});

test('nonBlocking: the navigation ends with the parent, and the tab shows its loading state until the tasks arrive', async ({ page }) => {
  for (const r of await runs(page, 'nonblocking')) {
    expect(r.navEnd).toBeGreaterThanOrEqual(PROJECT_MS);
    expect(r.navEnd).toBeLessThan(TASKS_MS);
    expect(r.shown).toBeGreaterThanOrEqual(TASKS_MS);
  }
  // One more navigation, caught in the middle: the page is up, the tab is loading.
  await page.goto('/');
  await page.locator('.home').waitFor();
  // The loading state lasts about 200 ms, shorter than expect()'s retry steps,
  // so this waits on every animation frame and takes one snapshot of the page.
  await page.click('a[href="/nonblocking/projects/1/tasks"]');
  const during = await page.waitForFunction(() => {
    const loading = document.querySelector('.loading');
    return loading && {
      heading: document.querySelector('h2')?.textContent,
      loading: loading.textContent,
      tasks: document.querySelectorAll('li.task').length,
    };
  }, undefined, { polling: 'raf' });
  expect(await during.jsonValue()).toEqual({ heading: 'Project 1', loading: 'Loading tasks…', tasks: 0 });
  await expect(page.locator('li.task')).toHaveCount(3);
});
