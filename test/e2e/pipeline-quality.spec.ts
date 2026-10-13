import { test, expect, type Page } from '@playwright/test';

const post = 'https://www.instagram.com/p/qualitypost/';
const author = 'https://www.instagram.com/post_author/';
const config = { brief: 'Meta ads', keywords: ['Meta ads'], platforms: ['instagram'], depth: 5 };
const profileCandidates = Array.from({ length: 5 }, (_, i) => ({
  id: `instagram:https://www.instagram.com/candidate${i}/`, platform: 'instagram',
  url: `https://www.instagram.com/candidate${i}/`, name: `Candidate ${i}`, handle: `candidate${i}`,
  bio: 'Meta ads consultant', avatar: '', followers: null, location: '', verified: false,
  websites: [], contacts: [], evidence: [{ url: `https://www.instagram.com/candidate${i}/`, text: 'Meta ads consultant', kind: 'search' }],
  matchedTerms: ['Meta ads'], collectedAt: '2026-10-01T00:00:00Z', profileStatus: 'pending',
}));

async function connect(page: Page) {
  await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.getByLabel('Bright Data API key').fill('fixture-pipeline-quality-key');
  await page.getByRole('dialog').getByRole('button', { name: 'Connect Bright Data' }).click();
  await expect(page.getByRole('button', { name: 'Bright Data connected' })).toBeVisible();
}
async function seed(page: Page, stage: 'posts' | 'enrich', candidates = profileCandidates) {
  await page.addInitScript(({ config, stage, candidates, post }) => {
    if (sessionStorage.getItem('pipeline-quality:seeded')) return;
    sessionStorage.setItem('pipeline-quality:seeded', 'true');
    sessionStorage.setItem('signal-scout:v1:jobs', JSON.stringify([{
      platform: 'instagram', stage, snapshot: 'sd_quality12345', createdAt: Date.now(), config,
      candidates, ...(stage === 'posts' ? { postUrls: [post] } : {}),
    }]));
    sessionStorage.setItem('signal-scout:v1:config', JSON.stringify(config));
  }, { config, stage, candidates, post });
}

for (const outcome of ['error rows', 'failed', 'canceled']) {
  test(`post-only ${outcome} reports failure, ends the terminal job and never starts enrichment`, async ({ page }) => {
    await seed(page, 'posts', []);
    const paid: string[] = [];
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, searchZones: ['working'], unlockerZone: '' } });
      if (url.pathname.endsWith('/trigger') || url.pathname.endsWith('/discover')) { paid.push(url.pathname); return route.abort(); }
      if (url.pathname.endsWith('/status')) return route.fulfill({ json: { status: outcome === 'error rows' ? 'ready' : outcome } });
      return route.fulfill({ json: { records: [{ url: post, error: 'dead_page' }] } });
    });
    await page.goto('/'); await connect(page);
    await page.getByRole('button', { name: 'Resume search' }).click();
    await expect(page.locator('.progress-item.error')).toHaveCount(1);
    await expect(page.locator('.progress-item.done')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('signal-scout:v1:jobs') || '[]').length)).toBe(0);
    expect(paid).toEqual([]);
  });
}

for (const status of ['failed', 'canceled']) {
  test(`confirmed ${status} enrichment finishes partial profiles and drops the terminal snapshot`, async ({ page }) => {
    await seed(page, 'enrich');
    const requests: string[] = [];
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()); requests.push(url.pathname);
      if (url.pathname.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, searchZones: ['working'], unlockerZone: '' } });
      if (url.pathname.endsWith('/status')) return route.fulfill({ json: { status } });
      return route.abort();
    });
    await page.goto('/'); await connect(page); await page.getByRole('button', { name: 'Resume search' }).click();
    await expect(page.locator('.progress-item.done')).toContainText('5 partial profile(s)');
    await expect(page.locator('.creator-card')).toHaveCount(5);
    const saved = await page.evaluate(() => ({ jobs: JSON.parse(sessionStorage.getItem('signal-scout:v1:jobs') || '[]'), results: JSON.parse(sessionStorage.getItem('signal-scout:v1:results') || '[]') }));
    expect(saved.jobs).toEqual([]);
    expect(saved.results.every((c: { enrichmentError?: string }) => c.enrichmentError?.includes('failed or was canceled'))).toBeTruthy();
    expect(saved.results.every((c: { profileStatus?: string }) => c.profileStatus === 'partial')).toBeTruthy();
    expect(requests).toEqual(['/api/connect', '/api/status']);
  });
}

test('successful SERP profiles display before posts return and displaced candidates respect the final depth cap', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let profileInputs: string[] = [];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, searchZones: ['working'], unlockerZone: '' } });
    if (url.pathname.endsWith('/discover')) return route.fulfill({ json: { records: [{ organic: [...profileCandidates.map(c => ({ link: c.url, title: c.name, description: c.bio })), { link: post }] }] } });
    if (url.pathname.endsWith('/trigger')) {
      const body = route.request().postDataJSON();
      if (body.stage === 'enrich') profileInputs = body.urls;
      return route.fulfill({ json: { snapshot: body.stage === 'posts' ? 'sd_postsquality' : 'sd_enrichquality' } });
    }
    if (url.pathname.endsWith('/status')) {
      if (url.searchParams.get('id') === 'sd_postsquality') await pending;
      return route.fulfill({ json: { status: 'ready' } });
    }
    return route.fulfill({ json: { records: url.searchParams.get('id') === 'sd_postsquality'
      ? [{ url: post, profile_url: author, description: 'Meta ads weekly experiments' }]
      : profileInputs.map(url => ({ url, full_name: url === author ? 'Post Author' : 'Enriched Candidate', biography: 'Marketing' })) } });
  });
  await page.goto('/'); await connect(page);
  await page.getByLabel('Topic or keyword', { exact: true }).fill('Meta ads');
  for (const platform of ['YouTube', 'TikTok', 'LinkedIn', 'X']) await page.locator('.search-panel').getByRole('button', { name: platform, exact: true }).click();
  await page.getByRole('main').getByRole('button', { name: 'Discover creators', exact: true }).click();
  await expect(page.locator('.creator-card')).toHaveCount(5);
  await expect(page.locator('.creator-card').first()).toContainText('Profile collection pending');
  const before = await page.evaluate(() => JSON.parse(sessionStorage.getItem('signal-scout:v1:results') || '[]'));
  expect(before).toHaveLength(5);
  release();
  await expect(page.locator('.progress-item.done')).toHaveCount(1);
  await expect(page.locator('.creator-card')).toHaveCount(5);
  expect(profileInputs).toHaveLength(5);
  expect(profileInputs).toContain(author);
  expect(profileInputs).not.toContain(profileCandidates[4].url);
  const after = await page.evaluate(() => JSON.parse(sessionStorage.getItem('signal-scout:v1:results') || '[]').map((c: { url: string }) => c.url));
  expect(after.sort()).toEqual(profileInputs.sort());
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('signal-scout:v1:results') || '[]').every((c: { profileStatus?: string }) => c.profileStatus === 'complete'))).toBeTruthy();
});

test('resumed post snapshots immediately republish candidates and transient enrichment keeps the same snapshot', async ({ page }) => {
  await seed(page, 'posts');
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let failEnrichment = true;
  let triggers = 0;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, searchZones: ['working'], unlockerZone: '' } });
    if (url.pathname.endsWith('/trigger')) { triggers++; return route.fulfill({ json: { snapshot: 'sd_enrichquality' } }); }
    if (url.pathname.endsWith('/status')) {
      if (url.searchParams.get('id') === 'sd_quality12345') await pending;
      else if (failEnrichment) return route.abort();
      return route.fulfill({ json: { status: 'ready' } });
    }
    return route.fulfill({ json: { records: url.searchParams.get('id') === 'sd_quality12345' ? [] : profileCandidates.map(c => ({ url: c.url, full_name: 'Resumed Profile' })) } });
  });
  await page.goto('/'); await connect(page); await page.getByRole('button', { name: 'Resume search' }).click();
  await expect(page.locator('.creator-card')).toHaveCount(5);
  release();
  await expect(page.locator('.progress-item.error')).toHaveCount(1);
  const job = await page.evaluate(() => JSON.parse(sessionStorage.getItem('signal-scout:v1:jobs') || '[]')[0]);
  expect(job.stage).toBe('enrich'); expect(job.snapshot).toBe('sd_enrichquality');
  failEnrichment = false;
  await page.getByRole('button', { name: 'Resume search' }).click();
  await expect(page.locator('.progress-item.done')).toHaveCount(1);
  expect(triggers).toBe(1);
});

test('storage failure after an accepted trigger exposes its known snapshot and resumes without repeating paid stages', async ({ page }) => {
  await seed(page, 'posts');
  let triggers = 0, polls = 0;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, searchZones: ['working'], unlockerZone: '' } });
    if (url.pathname.endsWith('/trigger')) {
      triggers++;
      // The pre-POST uncertain save succeeded. Fail only the accepted-reference save.
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          if (key === 'signal-scout:v1:jobs' && value.includes('sd_acceptquality')) throw new DOMException('Quota exceeded', 'QuotaExceededError');
          return original.call(this, key, value);
        };
      });
      return route.fulfill({ json: { snapshot: 'sd_acceptquality' } });
    }
    if (url.pathname.endsWith('/status')) { polls++; return route.fulfill({ json: { status: 'ready' } }); }
    return route.fulfill({ json: { records: url.searchParams.get('id') === 'sd_quality12345' ? [] : profileCandidates.map(c => ({ url: c.url, full_name: 'Accepted Profile' })) } });
  });
  await page.goto('/'); await connect(page); await page.getByRole('button', { name: 'Resume search' }).click();
  await expect(page.locator('.progress-item.error')).toContainText('Collection accepted as sd_acceptquality');
  await expect(page.getByText(/Collection accepted as sd_acceptquality, but browser storage/).last()).toBeVisible();
  await expect(page.locator('.progress-item.error')).toContainText('Job sd_acceptquality');
  expect(triggers).toBe(1); expect(polls).toBe(1);
  await expect(page.getByRole('button', { name: 'Resume search' })).toBeEnabled();
  await page.getByRole('button', { name: 'Resume search' }).click();
  await expect(page.locator('.progress-item.done')).toHaveCount(1);
  expect(triggers).toBe(1); expect(polls).toBe(2);
});

for (const platform of ['youtube', 'tiktok'] as const) {
  test(`${platform} mixed native discovery retains its partial warning through a resumed enrichment`, async ({ page }) => {
    const profile = platform === 'youtube' ? 'https://www.youtube.com/@fixture' : 'https://www.tiktok.com/@fixture';
    await page.addInitScript(({ platform }) => {
      sessionStorage.setItem('signal-scout:v1:jobs', JSON.stringify([{
        platform, stage: 'discover', snapshot: 'sd_nativediscovery', createdAt: Date.now(),
        config: { brief: 'Meta ads', keywords: ['Meta ads'], platforms: [platform], depth: 5 },
      }]));
    }, { platform });
    let enrichmentReady = false, triggers = 0;
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, searchZones: ['working'], unlockerZone: '' } });
      if (url.pathname.endsWith('/trigger')) {
        triggers++;
        expect(route.request().postDataJSON().stage).toBe('enrich');
        return route.fulfill({ json: { snapshot: 'sd_nativeenrichment' } });
      }
      if (url.pathname.endsWith('/status')) {
        if (url.searchParams.get('id') === 'sd_nativeenrichment' && !enrichmentReady) return route.abort();
        return route.fulfill({ json: { status: 'ready' } });
      }
      return route.fulfill({ json: { records: url.searchParams.get('id') === 'sd_nativediscovery'
        ? [{ ...(platform === 'youtube' ? { channel_url: profile } : { profile_url: profile }), url: platform === 'youtube' ? 'https://youtube.com/watch?v=fixture' : `${profile}/video/123`, description: 'Meta ads testing' }, { error: 'dead_page' }]
        : [{ url: profile, name: 'Enriched Native Author', description: 'Marketing' }] } });
    });
    await page.goto('/'); await connect(page); await page.getByRole('button', { name: 'Resume search' }).click();
    await expect(page.locator('.progress-item.error')).toHaveCount(1);
    const job = await page.evaluate(() => JSON.parse(sessionStorage.getItem('signal-scout:v1:jobs') || '[]')[0]);
    expect(job.stage).toBe('enrich');
    expect(job.warning).toContain('1 discovery record(s) failed; successful evidence preserved');
    enrichmentReady = true;
    await page.getByRole('button', { name: 'Resume search' }).click();
    await expect(page.locator('.progress-item.done')).toContainText('1 discovery record(s) failed; successful evidence preserved');
    await expect(page.locator('.creator-card')).toHaveCount(1);
    expect(triggers).toBe(1);
  });
}

test('discarding a pending snapshot preserves pending creator state in results and saved shortlist after reload', async ({ page }) => {
  await seed(page, 'enrich');
  await page.route('**/api/**', async route => {
    if (new URL(route.request().url()).pathname.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, searchZones: ['working'], unlockerZone: '', metadataAvailable: true } });
    return route.abort();
  });
  await page.goto('/'); await connect(page); await page.getByRole('button', { name: 'Resume search' }).click();
  await expect(page.locator('.progress-item.error')).toHaveCount(1);
  await page.locator('.creator-card').first().getByRole('button', { name: 'Save Candidate 0', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Discard references', exact: true }).click();
  const stored = await page.evaluate(() => ({
    jobs: JSON.parse(sessionStorage.getItem('signal-scout:v1:jobs') || '[]'),
    results: JSON.parse(sessionStorage.getItem('signal-scout:v1:results') || '[]'),
    shortlist: JSON.parse(localStorage.getItem('signal-scout:v1:shortlist') || '[]'),
  }));
  expect(stored.jobs).toEqual([]);
  expect(stored.results.every((c: { profileStatus?: string }) => c.profileStatus === 'pending')).toBeTruthy();
  expect(stored.shortlist[0].profileStatus).toBe('pending');
  await page.reload();
  await expect(page.locator('.creator-card')).toHaveCount(5);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('signal-scout:v1:jobs') || '[]'))).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('signal-scout:v1:results') || '[]').every((c: { profileStatus?: string }) => c.profileStatus === 'pending'))).toBeTruthy();
});
