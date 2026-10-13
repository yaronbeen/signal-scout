import { test, expect } from '@playwright/test';

test('sample, profile, saved shortlist, export and browser persistence', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Find your people/ })).toBeVisible();
  await page.getByRole('button', { name: /Explore a sample/ }).click();
  await expect(page.locator('.creator-card')).toHaveCount(8);
  await expect(page.getByText('Fictional creators and illustrative metrics.')).toBeVisible();
  await page.getByRole('button', { name: 'Save Maya Chen', exact: true }).click();
  await page.locator('.creator-card').first().getByRole('button', { name: 'View details' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('hello@mayamakes.example')).toBeVisible();
  await expect(page.getByText('Illustrative profile · Not mailbox-verified')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  if (test.info().project.name === 'mobile') await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await expect(page.locator('.creator-card')).toHaveCount(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export CSV/ }).click();
  expect((await download).suggestedFilename()).toContain('shortlist');
  await page.reload();
  if (test.info().project.name === 'mobile') await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await expect(page.locator('.creator-card')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('connection and live pipeline keep credentials out of storage and isolate platform failure', async ({ page }) => {
  let triggered = 0;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/connect')) return route.fulfill({ json: { connected: true, unlockerZone: '', searchAvailable: true } });
    if (url.pathname.endsWith('/discover')) return route.fulfill({ status: 403, json: { error: 'This platform is unavailable. Other platforms can complete.' } });
    if (url.pathname.endsWith('/trigger')) { triggered++; return route.fulfill({ json: { snapshot: triggered === 1 ? 'sd_discover123' : 'sd_enrich123' } }); }
    if (url.pathname.endsWith('/status')) return route.fulfill({ json: { status: 'ready' } });
    if (url.pathname.endsWith('/result')) return route.fulfill({ json: { records: url.searchParams.get('id') === 'sd_discover123' ? [{ channel_url: 'https://www.youtube.com/@livemaker', url: 'https://www.youtube.com/watch?v=abc', title: 'AI tools for marketers', description: 'Business: hello@livemaker.io', subscribers: 12000, handle_name: 'Live Maker' }] : [{ url: 'https://www.youtube.com/@livemaker/about', name: 'Live Maker', Description: 'AI tools and marketing automation', subscribers: 12000 }] } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.getByLabel('Bright Data API key').fill('secret-test-key-not-real');
  await page.getByRole('dialog').getByRole('button', { name: 'Connect Bright Data' }).click();
  await expect(page.getByRole('button', { name: 'Bright Data connected' })).toBeVisible();
  await page.getByLabel('Topic or keyword', { exact: true }).fill('AI tools');
  for (const name of ['TikTok', 'LinkedIn', 'X']) await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('main').getByRole('button', { name: 'Discover creators', exact: true }).click();
  await expect(page.locator('.creator-card')).toHaveCount(1);
  await expect(page.getByText('This platform is unavailable. Other platforms can complete.')).toBeVisible();
  await expect(page.locator('.creator-card').getByText('Live Maker', { exact: true })).toBeVisible();
  expect(triggered).toBe(2);
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(storage).not.toContain('secret-test-key-not-real');
});

test('filters, input validation and modal keyboard exit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('main').getByRole('button', { name: 'Discover creators', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Add a topic');
  await page.getByRole('button', { name: /Explore a sample/ }).click();
  await page.getByLabel('Filter creators').fill('nora');
  await expect(page.locator('.creator-card')).toHaveCount(1);
  await page.getByLabel('Filter creators').fill('');
  await page.getByLabel('Has email').check();
  await expect(page.locator('.creator-card')).toHaveCount(5);
  await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
