import { test, expect, type Page } from '@playwright/test';
async function connect(page: Page) {
  await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.getByLabel('Bright Data API key').fill('test-key-for-recovery-only');
  await page.getByRole('dialog').getByRole('button', { name: 'Connect Bright Data' }).click();
  await expect(page.getByRole('button', { name: 'Bright Data connected' })).toBeVisible();
}
async function onlyYouTube(page: Page) {
  await page.getByLabel('Topic or keyword', { exact: true }).fill('AI tools');
  for (const name of ['Instagram', 'TikTok', 'LinkedIn', 'X']) await page.getByRole('button', { name, exact: true }).click();
}
const discovery = [{ channel_url: 'https://youtube.com/@maker', url: 'https://youtube.com/watch?v=1', handle_name: 'Maker', title: 'AI tools', subscribers: 100 }];
const profile = [{ url: 'https://youtube.com/@maker/about', name: 'Maker Enriched', Description: 'AI tools, hello@maker.io', subscribers: 10000 }];

test('pause during discovery prevents paid enrichment; resume preserves shortlist and refresh data', async ({ page }) => {
  let releaseDiscovery!: () => void;
  const delayed = new Promise<void>(resolve => { releaseDiscovery = resolve; });
  let discoveryStarted = false; let enrichmentCalls = 0;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, unlockerZone: '' } });
    if (url.pathname.endsWith('/discover')) { discoveryStarted = true; await delayed; return route.fulfill({ json: { records: [{ organic: [{ link: 'https://instagram.com/maker/', title: 'Maker', description: 'AI tools' }] }] } }); }
    if (url.pathname.endsWith('/trigger')) { enrichmentCalls++; return route.fulfill({ json: { snapshot: 'sd_enriched123' } }); }
    if (url.pathname.endsWith('/status')) return route.fulfill({ json: { status: 'ready' } });
    if (url.pathname.endsWith('/result')) return route.fulfill({ json: { records: [{ url: 'https://instagram.com/maker/', full_name: 'Maker Enriched', biography: 'AI tools hello@maker.io', followers: 10000 }] } });
  });
  await page.goto('/'); await connect(page);
  await page.getByLabel('Topic or keyword', { exact: true }).fill('AI tools');
  for (const name of ['YouTube', 'TikTok', 'LinkedIn', 'X']) await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('main').getByRole('button', { name: 'Discover creators', exact: true }).click();
  await expect.poll(() => discoveryStarted).toBeTruthy();
  await page.getByRole('button', { name: 'Pause search' }).click(); releaseDiscovery();
  await expect(page.getByRole('button', { name: 'Resume search' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Explore a sample/ })).toBeDisabled();
  expect(enrichmentCalls).toBe(0);
  await page.getByRole('button', { name: 'Save Maker', exact: true }).click();
  await page.reload(); await connect(page);
  await expect(page.locator('.creator-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Resume search' }).click();
  await expect(page.locator('.creator-card').getByRole('heading', { name: 'Maker Enriched' })).toBeVisible();
  expect(enrichmentCalls).toBe(1);
  await page.reload();
  await expect(page.locator('.creator-card').getByRole('heading', { name: 'Maker Enriched' })).toBeVisible();
  if (test.info().project.name === 'mobile') await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: /Your shortlist/ }).click();
  await expect(page.locator('.creator-card').getByRole('heading', { name: 'Maker Enriched' })).toBeVisible();
  await expect(page.locator('.creator-card').getByText('Public email', { exact: true })).toBeVisible();
});

test('ambiguous enrichment trigger is never replayed; dashboard snapshot can be reattached', async ({ page }) => {
  let enrichmentCalls = 0;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, unlockerZone: '' } });
    if (url.pathname.endsWith('/trigger')) {
      if (route.request().postDataJSON().stage === 'enrich') { enrichmentCalls++; return route.abort('failed'); }
      return route.fulfill({ json: { snapshot: 'sd_discovery123' } });
    }
    if (url.pathname.endsWith('/status')) return route.fulfill({ json: { status: 'ready' } });
    if (url.pathname.endsWith('/result')) return route.fulfill({ json: { records: url.searchParams.get('id') === 'sd_discovery123' ? discovery : profile } });
  });
  await page.goto('/'); await connect(page); await onlyYouTube(page);
  await page.getByRole('main').getByRole('button', { name: 'Discover creators', exact: true }).click();
  await expect(page.getByText('YouTube: submission needs checking.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume search' })).toBeDisabled();
  await page.reload(); await connect(page);
  await expect(page.getByRole('button', { name: 'Resume search' })).toBeDisabled();
  expect(enrichmentCalls).toBe(1);
  await page.getByRole('button', { name: 'Add existing job reference' }).click();
  await page.getByLabel('Snapshot ID').fill('sd_recovered123');
  await page.getByRole('button', { name: 'Save job reference' }).click();
  await page.getByRole('button', { name: 'Resume search' }).click();
  await expect(page.locator('.creator-card').getByRole('heading', { name: 'Maker Enriched' })).toBeVisible();
  expect(enrichmentCalls).toBe(1);
});

test('definite enrichment rejection resumes enrichment only; eventual result stays on the same snapshot', async ({ page }) => {
  let discoveries = 0; let enrichments = 0; let results = 0;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, unlockerZone: '' } });
    if (url.pathname.endsWith('/trigger')) {
      if (route.request().postDataJSON().stage === 'discover') { discoveries++; return route.fulfill({ json: { snapshot: 'sd_discovery123' } }); }
      enrichments++;
      return enrichments === 1 ? route.fulfill({ status: 403, json: { error: 'Permission denied. Fix your key and resume.' } }) : route.fulfill({ json: { snapshot: 'sd_enrichment123' } });
    }
    if (url.pathname.endsWith('/status')) return route.fulfill({ json: { status: 'ready' } });
    if (url.pathname.endsWith('/result')) {
      if (url.searchParams.get('id') === 'sd_discovery123') return route.fulfill({ json: { records: discovery } });
      results++; return results === 1 ? route.fulfill({ status: 202, json: { pending: true } }) : route.fulfill({ json: { records: profile } });
    }
  });
  await page.goto('/'); await connect(page); await onlyYouTube(page);
  await page.getByRole('main').getByRole('button', { name: 'Discover creators', exact: true }).click();
  await expect(page.getByText('Permission denied. Fix your key and resume.')).toBeVisible();
  await page.getByRole('button', { name: 'Resume search' }).click();
  await expect(page.locator('.creator-card').getByRole('heading', { name: 'Maker Enriched' })).toBeVisible({ timeout: 15_000 });
  expect(discoveries).toBe(1); expect(enrichments).toBe(2); expect(results).toBe(2);
});

test('queued platforms survive pause and reload, and never mix sample/live results', async ({ page }) => {
  const calls: string[] = []; let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, unlockerZone: '' } });
    if (url.pathname.endsWith('/discover')) {
      const p = route.request().postDataJSON().platform; calls.push(p);
      if (p === 'instagram') await delayed;
      const link = p === 'instagram' ? 'https://instagram.com/queuedmaker/' : p === 'linkedin' ? 'https://linkedin.com/in/queuedmaker/' : 'https://x.com/queuedmaker';
      return route.fulfill({ json: { records: [{ organic: [{ link, title: `${p} Maker`, description: 'AI tools' }] }] } });
    }
    if (url.pathname.endsWith('/trigger')) return route.fulfill({ json: { snapshot: `sd_${route.request().postDataJSON().platform}12345` } });
    if (url.pathname.endsWith('/status')) return route.fulfill({ json: { status: 'ready' } });
    if (url.pathname.endsWith('/result')) {
      const id = url.searchParams.get('id'); const link = id?.includes('instagram') ? 'https://instagram.com/queuedmaker/' : id?.includes('linkedin') ? 'https://linkedin.com/in/queuedmaker/' : 'https://x.com/queuedmaker';
      return route.fulfill({ json: { records: [{ url: link, name: 'Real Queued Maker', biography: 'AI tools', followers: 500 }] } });
    }
  });
  await page.goto('/'); await page.getByRole('button', { name: /Explore a sample/ }).click(); await connect(page);
  await page.getByLabel('Topic or keyword', { exact: true }).fill('AI tools');
  for (const p of ['YouTube', 'TikTok']) await page.locator('.search-panel').getByRole('button', { name: p, exact: true }).click();
  await page.getByRole('main').getByRole('button', { name: 'Discover creators', exact: true }).click();
  await expect.poll(() => calls.length).toBe(1); await page.getByRole('button', { name: 'Pause search' }).click(); release();
  await expect(page.getByRole('button', { name: 'Resume search' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Explore a sample/ })).toBeDisabled();
  await page.reload(); await connect(page); await page.getByRole('button', { name: 'Resume search' }).click();
  await expect(page.locator('.creator-card')).toHaveCount(3);
  await expect(page.locator('.progress-item.done')).toHaveCount(3);
  expect(calls).toEqual(['instagram', 'linkedin', 'x']);
  await expect(page.getByText('Illustrative sample', { exact: true })).toHaveCount(0);
  const results = await page.evaluate(() => JSON.parse(sessionStorage.getItem('signal-scout:v1:results') || '[]'));
  expect(results.every((c: { sample?: boolean }) => !c.sample)).toBeTruthy();
});

test('removing a saved creator during a website scan is preserved when the scan finishes', async ({ page }) => {
  const creator = { id: 'youtube:https://www.youtube.com/@scannedmaker', platform: 'youtube', url: 'https://www.youtube.com/@scannedmaker', name: 'Scanned Maker', handle: 'scannedmaker', bio: 'AI creator', avatar: '', followers: 500, location: '', verified: false, websites: ['https://maker.io/'], contacts: [], evidence: [], matchedTerms: ['AI'], collectedAt: new Date().toISOString() };
  await page.addInitScript(c => { localStorage.setItem('signal-scout:v1:shortlist', JSON.stringify([c])); sessionStorage.setItem('signal-scout:v1:results', JSON.stringify([c])); }, creator);
  let release!: () => void; const delayed = new Promise<void>(resolve => { release = resolve; }); let scanning = false;
  await page.route('**/api/**', async route => {
    if (route.request().url().endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, unlockerZone: 'unlocker' } });
    if (route.request().url().endsWith('/contact')) { scanning = true; await delayed; return route.fulfill({ json: { contacts: [{ email: 'book@maker.io', source: 'Public website', sourceUrl: 'https://maker.io/' }] } }); }
  });
  await page.goto('/'); await connect(page);
  await page.locator('.creator-card').getByRole('button', { name: 'View details' }).click();
  await page.getByRole('button', { name: 'Scan public website for email' }).click(); await expect.poll(() => scanning).toBeTruthy();
  await page.getByRole('dialog').getByRole('button', { name: 'Saved', exact: true }).click(); release();
  await expect(page.getByText('book@maker.io', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('signal-scout:v1:shortlist') || '[]'));
  expect(saved).toHaveLength(0);
});
