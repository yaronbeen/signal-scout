import { test, expect } from '@playwright/test';
import { sampleCreators } from '../../src/sample';

test('range, topic, matching-post and bulk save use only collected results', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/**', route => { calls++; return route.abort(); });
  await page.goto('/');
  await page.getByRole('button', { name: /Explore a sample/ }).click();
  await page.getByLabel('Minimum audience').fill('20000');
  await page.getByLabel('Maximum audience').fill('60000');
  await expect(page.locator('.creator-card')).toHaveCount(4);
  await page.getByLabel('Matched topic', { exact: true }).selectOption('ai tools');
  await page.getByLabel('Has matching collected post').check();
  await expect(page.locator('.creator-card')).toHaveCount(1);
  await page.getByLabel('Maximum audience').fill('150000');
  await expect(page.locator('.creator-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Save 2 new creators', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save 0 new creators', exact: true })).toBeDisabled();
  await page.getByLabel('Matched topic', { exact: true }).selectOption('automation');
  await expect(page.locator('.creator-card')).toHaveCount(0);
  await page.getByLabel('Has matching collected post').uncheck();
  await page.getByRole('button', { name: 'Save 5 new creators', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('signal-scout:v1:shortlist')!));
  expect(saved).toHaveLength(7);
  expect(new Set(saved.map((c: { id: string }) => c.id)).size).toBe(7);
  await page.getByLabel('Minimum audience').fill('200000');
  await expect(page.getByRole('alert')).toHaveText('Minimum audience must not exceed maximum audience.');
  await expect(page.getByRole('button', { name: 'Save 0 new creators', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click();
  await expect(page.getByLabel('Minimum audience')).toHaveValue('');
  await expect(page.getByLabel('Maximum audience')).toHaveValue('');
  await expect(page.getByLabel('Matched topic', { exact: true })).toHaveValue('');
  await expect(page.locator('.creator-card')).toHaveCount(8);
  await page.getByLabel('Maximum audience').fill('10000');
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await expect(page.getByLabel('Maximum audience')).toHaveValue('');
  expect(calls).toBe(0);
});

test('notes persist separately, appear on saved cards and export safely', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore a sample/ }).click();
  await page.getByRole('button', { name: 'Save Maya Chen', exact: true }).click();
  await page.locator('.creator-card').filter({ has: page.getByRole('heading', { name: 'Maya Chen', exact: true }) }).getByRole('button', { name: 'View details' }).click();
  const note = '=Review, "YouTube"\nAsk for examples';
  await page.getByLabel('Your shortlist note').fill(note);
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByText('Note saved in this browser.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await expect(page.locator('.card-note')).toContainText('Ask for examples');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export CSV/ }).click();
  const stream = await (await downloading).createReadStream();
  let csv = ''; for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain('shortlist_note');
  expect(csv).toContain('"\'=Review, ""YouTube""\nAsk for examples"');
  await page.reload();
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await page.getByRole('button', { name: 'View details', exact: true }).click();
  await expect(page.getByLabel('Your shortlist note')).toHaveValue(note);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('bulk save cannot mix sample and live creators', async ({ page }) => {
  await page.addInitScript(creator => localStorage.setItem('signal-scout:v1:shortlist', JSON.stringify([{ ...creator, id: 'live:fixture', sample: false }])), sampleCreators[0]);
  await page.goto('/');
  await page.getByRole('button', { name: /Explore a sample/ }).click();
  await page.getByRole('button', { name: 'Save 8 new creators', exact: true }).click();
  await expect(page.getByText(/Keep sample and live creators separate/)).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('signal-scout:v1:shortlist')!).length)).toBe(1);
});
test('two tabs save separate notes without deleting legacy or concurrent notes', async ({ page, context }) => {
  let calls = 0;
  await context.route('**/api/**', route => { calls++; return route.abort(); });
  await page.goto('/');
  await page.evaluate(creators => {
    localStorage.setItem('signal-scout:v1:shortlist', JSON.stringify(creators.slice(0, 3)));
    localStorage.setItem('signal-scout:v1:notes', JSON.stringify({ [creators[2].id]: 'Existing saved note' }));
  }, sampleCreators);
  const other = await context.newPage();
  await Promise.all([page.reload(), other.goto('/')]);
  for (const [tab, name] of [[page, 'Maya Chen'], [other, 'Alex Rivera']] as const) {
    await tab.getByRole('button', { name: /Your shortlist/ }).click();
    await tab.locator('.creator-card').filter({ has: tab.getByRole('heading', { name, exact: true }) }).getByRole('button', { name: 'View details' }).click();
  }
  await page.getByLabel('Your shortlist note').fill('First tab note');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await other.getByLabel('Your shortlist note').fill('Second tab note');
  await other.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await expect(page.locator('.card-note').filter({ hasText: 'First tab note' })).toHaveCount(1);
  await expect(page.locator('.card-note').filter({ hasText: 'Second tab note' })).toHaveCount(1);
  await expect(page.locator('.card-note').filter({ hasText: 'Existing saved note' })).toHaveCount(1);
  await page.locator('.creator-card').filter({ has: page.getByRole('heading', { name: 'Maya Chen', exact: true }) }).getByRole('button', { name: 'View details' }).click();
  await page.getByLabel('Your shortlist note').fill('First tab updated');
  await other.getByLabel('Your shortlist note').fill('Second tab updated');
  await Promise.all([page.getByRole('button', { name: 'Save note', exact: true }).click(), other.getByRole('button', { name: 'Save note', exact: true }).click()]);
  await other.reload();
  await other.getByRole('button', { name: /Your shortlist/ }).click();
  const downloading = other.waitForEvent('download');
  await other.getByRole('button', { name: /Export CSV/ }).click();
  const stream = await (await downloading).createReadStream();
  let csv = ''; for await (const chunk of stream!) csv += chunk.toString();
  for (const note of ['First tab updated', 'Second tab updated', 'Existing saved note']) expect(csv).toContain(note);
  expect(calls).toBe(0);
});
test('removing the last creator for a selected topic clears the obsolete filter', async ({ page }) => {
  await page.addInitScript(creators => localStorage.setItem('signal-scout:v1:shortlist', JSON.stringify([
    { ...creators[0], matchedTerms: ['AI tools'] },
    { ...creators[1], matchedTerms: ['automation'] },
  ])), sampleCreators);
  await page.goto('/');
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await page.getByLabel('Matched topic', { exact: true }).selectOption('ai tools');
  await page.getByRole('button', { name: 'Remove Maya Chen', exact: true }).click();
  await expect(page.getByLabel('Matched topic', { exact: true })).toHaveValue('');
  await expect(page.locator('.creator-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Alex Rivera', exact: true })).toBeVisible();
});

test('blocked browser storage warns for bulk saving and notes but permits CSV recovery', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (this === localStorage) throw new DOMException('quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Explore a sample/ }).click();
  await page.getByRole('button', { name: 'Save 8 new creators', exact: true }).click();
  await expect(page.getByText('Could not save to this browser. Export your shortlist before closing.', { exact: true })).toBeVisible();
  await page.locator('.creator-card').first().getByRole('button', { name: 'View details' }).click();
  await page.getByLabel('Your shortlist note').fill('Keep this note');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByText(/Your note is kept for this session/)).toBeVisible();
  await page.keyboard.press('Escape');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export CSV/ }).click();
  const stream = await (await downloading).createReadStream();
  let csv = ''; for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain('Keep this note');
});

test('a website scan updates collected data without overwriting a shortlist note', async ({ page }) => {
  const creator = { ...sampleCreators[0], sample: false, websites: ['https://maker.io/'] };
  await page.addInitScript(c => {
    localStorage.setItem('signal-scout:v1:shortlist', JSON.stringify([c]));
    localStorage.setItem('signal-scout:v1:notes', JSON.stringify({ [c.id]: 'Keep through refresh' }));
    sessionStorage.setItem('signal-scout:v1:results', JSON.stringify([c]));
  }, creator);
  await page.route('**/api/**', route => route.fulfill({ json: route.request().url().endsWith('/connect')
    ? { connected: true, searchAvailable: true, unlockerZone: 'unlocker' }
    : { contacts: [{ email: 'new@maker.io', source: 'Public website', sourceUrl: 'https://maker.io/' }] } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.getByLabel('Bright Data API key').fill('fixture-key-not-real');
  await page.getByRole('dialog').getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.getByRole('button', { name: 'View details', exact: true }).click();
  await page.getByRole('button', { name: 'Scan public website for email', exact: true }).click();
  await expect(page.getByText('new@maker.io', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Your shortlist note')).toHaveValue('Keep through refresh');
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem('signal-scout:v1:notes')!)[id], creator.id)).toBe('Keep through refresh');
});

test('saved-only scan warns on persistence failure and keeps contacts and notes exportable', async ({ page }) => {
  const creator = { ...sampleCreators[0], sample: false, contacts: [], websites: ['https://maker.io/'] };
  await page.addInitScript(c => {
    localStorage.setItem('signal-scout:v1:shortlist', JSON.stringify([c]));
    localStorage.setItem('signal-scout:v1:notes', JSON.stringify({ [c.id]: 'Preserve research' }));
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (this === localStorage && key === 'signal-scout:v1:shortlist') throw new DOMException('quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  }, creator);
  await page.route('**/api/**', route => route.fulfill({ json: route.request().url().endsWith('/connect')
    ? { connected: true, searchAvailable: true, unlockerZone: 'unlocker' }
    : { contacts: [{ email: 'recovered@maker.io', source: 'Public website', sourceUrl: 'https://maker.io/' }] } }));
  await page.goto('/');
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.getByLabel('Bright Data API key').fill('fixture-key-not-real');
  await page.getByRole('dialog').getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.getByRole('button', { name: 'View details', exact: true }).click();
  await page.getByRole('button', { name: 'Scan public website for email', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Could not save shortlist updates');
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('export CSV before closing');
  await expect.poll(() => page.getByRole('dialog').getByRole('alert').evaluate(el => {
    const rect = el.getBoundingClientRect();
    const dialog = el.closest('dialog')!.getBoundingClientRect();
    return rect.top >= Math.max(0, dialog.top) && rect.bottom <= Math.min(innerHeight, dialog.bottom);
  })).toBeTruthy();
  await expect(page.getByLabel('Your shortlist note')).toHaveValue('Preserve research');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alert')).toContainText('Could not save shortlist updates');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export CSV/ }).click();
  const stream = await (await downloading).createReadStream();
  let csv = ''; for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain('recovered@maker.io');
  expect(csv).toContain('Preserve research');
});

test('prototype-like creator IDs do not inherit notes or crash the shortlist', async ({ page }) => {
  await page.addInitScript(c => localStorage.setItem('signal-scout:v1:shortlist', JSON.stringify([{ ...c, id: '__proto__' }])), sampleCreators[0]);
  await page.goto('/');
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await expect(page.getByRole('heading', { name: 'Maya Chen', exact: true })).toBeVisible();
  await expect(page.locator('.card-note')).toHaveCount(0);
  await page.getByRole('button', { name: 'View details', exact: true }).click();
  await expect(page.getByLabel('Your shortlist note')).toHaveValue('');
  await page.getByLabel('Your shortlist note').fill('Own note');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await expect(page.locator('.card-note')).toContainText('Own note');
});

test('automatic profile refresh warns when the shortlist write fails', async ({ page }) => {
  const creator = { ...sampleCreators[0], sample: false, contacts: [], profileStatus: 'pending' as const };
  await page.addInitScript(c => {
    localStorage.setItem('signal-scout:v1:shortlist', JSON.stringify([c]));
    sessionStorage.setItem('signal-scout:v1:results', JSON.stringify([c]));
    sessionStorage.setItem('signal-scout:v1:jobs', JSON.stringify([{ platform: c.platform, stage: 'enrich', snapshot: 'sd_savedRefresh', candidates: [c], createdAt: Date.now(), config: { brief: 'AI tools', keywords: ['AI tools'], platforms: [c.platform], depth: 5 } }]));
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (this === localStorage && key === 'signal-scout:v1:shortlist') throw new DOMException('quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  }, creator);
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true } });
    if (path.endsWith('/status')) return route.fulfill({ json: { status: 'ready' } });
    if (path.endsWith('/result')) return route.fulfill({ json: { records: [{ url: creator.url, name: 'Refreshed creator', Description: 'AI tools tutorials', email: 'refresh@maker.io' }] } });
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.getByLabel('Bright Data API key').fill('fixture-key-not-real');
  await page.getByRole('dialog').getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.getByRole('button', { name: 'Resume search', exact: true }).click();
  await expect(page.locator('.progress-item.done')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText('Could not save shortlist updates');
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await expect(page.getByRole('heading', { name: 'Refreshed creator', exact: true })).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export CSV/ }).click();
  const stream = await (await downloading).createReadStream();
  let csv = ''; for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain('refresh@maker.io');
});
