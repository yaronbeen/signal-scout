import { test, expect } from '@playwright/test';

test('topic-only search restores legacy research keywords and labels platform audience filters', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('signal-scout:v1:history',JSON.stringify([{brief:'Legacy company label',keywords:['ai ugc','marketing'],platforms:['youtube','x'],depth:5}])));
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Company or brand',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:/Explore a sample/}).click();
  const tabs=page.getByRole('group',{name:'Filter by platform'});
  if (test.info().project.name === 'mobile') await page.getByRole('combobox', {name: 'Filter by platform'}).selectOption('youtube');
  else await tabs.getByRole('button',{name:/YouTube/}).click();
  await expect(page.locator('.creator-card')).toHaveCount(2);
  await expect(page.locator('.audience-range legend')).toHaveText('Audience size · subscribers');
  await page.getByLabel('Minimum audience').fill('10000');
  if (test.info().project.name === 'mobile') await page.getByRole('combobox', {name: 'Filter by platform'}).selectOption('x');
  else await tabs.getByRole('button',{name:/X/}).click();
  await expect(page.locator('.audience-range legend')).toHaveText('Audience size · followers');
  await page.getByRole('button',{name:'Recent searches',exact:true}).click();
  await page.getByRole('button',{name:/Legacy company label/}).click();
  await expect(page.getByLabel('Topic or keyword',{exact:true})).toHaveValue('ai ugc, marketing');
});

test('sample, profile, saved shortlist, export and browser persistence', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Find your people/ })).toBeVisible();
  await page.getByRole('button', { name: /Explore a sample/ }).click();
  await expect(page.locator('.creator-card')).toHaveCount(8);
   await expect(page.getByText('Fictional creators and illustrative metrics.', {exact: false})).toBeVisible();
  await page.getByRole('button', { name: 'Save Maya Chen', exact: true }).click();
  await page.locator('.creator-card').filter({has:page.getByRole('heading',{name:'Maya Chen',exact:true})}).getByRole('button', { name: 'View details' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('hello@mayamakes.example')).toBeVisible();
  await expect(page.getByText('Illustrative profile · Not mailbox-verified')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await expect(page.locator('.creator-card')).toHaveCount(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export CSV/ }).click();
  expect((await download).suggestedFilename()).toContain('shortlist');
  await page.reload();
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

test('abandoned new-search drafts do not overwrite the editable collected brief', async ({page}) => {
  let paidCalls = 0;
  await page.route('**/api/**', route => { paidCalls++; return route.abort(); });
  await page.goto('/');
  await page.getByRole('button', {name: /Explore a sample/}).click();
  await page.getByRole('button', {name: 'New search', exact: true}).click();
  await page.getByLabel('Topic or keyword', {exact: true}).fill('Abandoned blank replacement');
  await page.getByLabel('Search depth', {exact: true}).selectOption('20');
  await page.getByRole('button', {name: 'Back to results', exact: true}).click();
  await page.getByRole('button', {name: 'Edit search', exact: true}).click();
  await expect(page.getByLabel('Topic or keyword', {exact: true})).toHaveValue('AI tools, automation');
  await expect(page.getByLabel('Search depth', {exact: true})).toHaveValue('5');
  await page.getByLabel('Topic or keyword', {exact: true}).fill('Abandoned ordinary edit');
  await page.getByLabel('Search depth', {exact: true}).selectOption('10');
  await page.getByRole('button', {name: 'Back to results', exact: true}).click();
  await page.getByRole('button', {name: 'Edit search', exact: true}).click();
  await expect(page.getByLabel('Topic or keyword', {exact: true})).toHaveValue('AI tools, automation');
  await expect(page.getByLabel('Search depth', {exact: true})).toHaveValue('5');
  expect(paidCalls).toBe(0);
});

test('dialog copy feedback is announced inside the active modal', async ({page, context}) => {
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', {name: /Explore a sample/}).click();
  await page.locator('.creator-card').filter({has: page.getByRole('heading', {name: 'Maya Chen', exact: true})}).getByRole('button', {name: 'View details'}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', {name: 'Copy hello@mayamakes.example', exact: true}).click();
  await expect(dialog.getByRole('status')).toContainText('Copied to clipboard');
  await expect(page.getByRole('status')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Connect Bright Data', exact: true}).click();
  await expect(dialog.getByRole('status')).toHaveCount(0);
  await expect(dialog).not.toContainText('Copied to clipboard');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Setup guide', exact: true}).click();
  await expect(dialog.getByRole('status')).toHaveCount(0);
  await dialog.getByRole('button', {name: 'Copy setup prompt'}).click();
  await expect(dialog.getByRole('status')).toContainText('Copied to clipboard');
  await page.keyboard.press('Escape');
  await page.locator('.creator-card').filter({has: page.getByRole('heading', {name: 'Maya Chen', exact: true})}).getByRole('button', {name: 'View details'}).click();
  await expect(dialog.getByRole('status')).toHaveCount(0);
  await dialog.getByRole('button', {name: 'Save creator', exact: true}).click();
  await expect(dialog.getByRole('status')).toContainText('Maya Chen added to your shortlist');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Connect Bright Data', exact: true}).click();
  await expect(dialog.getByRole('status')).toHaveCount(0);
});
