import { Page, expect, test } from '@playwright/test';

type Mode = 'resolvers' | 'resources' | 'nonblocking';

async function openProject1(page: Page, mode: Mode) {
  await page.goto(`/${mode}/projects/1/tasks`);
  await expect(page.locator('li.task')).toHaveCount(3);
  await page.evaluate(() => (window.__log.length = 0));
}

const logged = (page: Page) => page.evaluate(() => window.__log.map((e) => e.what));

test('blocking resources: going from project 1 to project 2 keeps project 1 on screen until both loads finish', async ({ page }) => {
  await openProject1(page, 'resources');
  await page.click('a[href="/resources/projects/2/tasks"]');
  await page.waitForTimeout(300); // both requests are in flight now
  await expect(page).toHaveURL(/\/resources\/projects\/1\/tasks$/);
  await expect(page.locator('h2')).toHaveText('Project 1');
  await expect(page.locator('li.task').first()).toHaveText('Task 1 of project 1');
  await expect(page.locator('h2')).toHaveText('Project 2');
  await expect(page.locator('li.task').first()).toHaveText('Task 1 of project 2');
});

test('nonBlocking tasks: project 1 stays up until project 2 is in, then the tab shows loading', async ({ page }) => {
  await openProject1(page, 'nonblocking');
  await page.click('a[href="/nonblocking/projects/2/tasks"]');
  await page.waitForTimeout(200);
  await expect(page.locator('li.task').first()).toHaveText('Task 1 of project 1');
  await expect(page.locator('h2')).toHaveText('Project 2');
  await expect(page.locator('.loading')).toBeVisible();
  await expect(page.locator('li.task').first()).toHaveText('Task 1 of project 2');
});

for (const mode of ['resolvers', 'resources'] as const) {
  test(`${mode}: a failing parent request ends in NavigationError and leaves the old page in place`, async ({ page }) => {
    await openProject1(page, mode);
    await page.click(`a[href="/${mode}/projects/999/tasks"]`);
    await expect.poll(() => logged(page)).toContain(`NavigationError /${mode}/projects/999/tasks`);
    expect(await logged(page)).toContain(`navigation error handler: /${mode}/projects/999/tasks`);
    await expect(page).toHaveURL(new RegExp(`/${mode}/projects/1/tasks$`));
    await expect(page.locator('h2')).toHaveText('Project 1');
    await expect(page.locator('li.task').first()).toHaveText('Task 1 of project 1');
  });
}

test('resolvers: when the parent fails, the child request never starts', async ({ page }) => {
  await openProject1(page, 'resolvers');
  await page.click('a[href="/resolvers/projects/999/tasks"]');
  await expect.poll(() => logged(page)).toContain('NavigationError /resolvers/projects/999/tasks');
  await page.waitForTimeout(800);
  expect(await logged(page)).not.toContain('start tasks 999');
});

test('resources: when the parent fails, the child request was already sent, and the old resources fetch again', async ({ page }) => {
  await openProject1(page, 'resources');
  await page.click('a[href="/resources/projects/999/tasks"]');
  await expect.poll(() => logged(page)).toContain('NavigationError /resources/projects/999/tasks');
  await expect.poll(() => logged(page), { timeout: 2_000 }).toContain('end tasks 1');
  const log = await logged(page);
  expect(log).toContain('start tasks 999');
  expect(log).not.toContain('end tasks 999'); // cancelled when the params rolled back
  expect(log).toContain('start project 1');
  await expect(page.locator('li.task').first()).toHaveText('Task 1 of project 1');
});

test('nonBlocking tasks: a failing tasks request completes the navigation and shows the tab error state', async ({ page }) => {
  await openProject1(page, 'nonblocking');
  await page.click('a[href="/nonblocking/projects/777/tasks"]');
  await expect(page).toHaveURL(/\/nonblocking\/projects\/777\/tasks$/);
  await expect(page.locator('h2')).toHaveText('Project 777');
  await expect(page.locator('.error')).toHaveText("Couldn't load the tasks.");
  const log = await logged(page);
  expect(log).toContain('NavigationEnd /nonblocking/projects/777/tasks');
  expect(log.some((e) => e.startsWith('NavigationError'))).toBe(false);
});
