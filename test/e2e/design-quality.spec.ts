import { test, expect, type Locator, type Page } from '@playwright/test';
import type { Creator, Job, SearchConfig } from '../../src/types';

// Production acceptance gaps from docs/design/WORLD_CLASS_REDESIGN.md.
// All provider routes are intercepted, including unexpected requests.
async function blockProviderWork(page: Page) {
  const calls: string[] = [];
  await page.route('**/api/**', async route => {
    calls.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
    await route.fulfill({ status: 500, json: { error: 'Provider work is forbidden in this acceptance flow.' } });
  });
  return calls;
}

async function expectNoHorizontalOverflow(page: Page, label: string, surface?: Locator) {
  await expect.poll(() => page.evaluate(() => Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth,
  ) - innerWidth), { message: `${label}: document and body must fit the viewport` }).toBeLessThanOrEqual(1);
  if (surface) {
    expect(await surface.evaluate(el => el.scrollWidth <= el.clientWidth + 1),
      `${label}: content must not overflow its own surface`).toBeTruthy();
  }
}

async function expectTouchTarget(control: Locator) {
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

const config: SearchConfig = {
  brief: 'AI tools', keywords: ['AI tools'], platforms: ['youtube'], depth: 5,
};

// The backend is introducing this durable optional status in the same iteration.
// Keep fixture typing valid while that parallel change is being integrated.
type FixtureCreator = Creator & { profileStatus?: 'pending' | 'complete' | 'partial' };

function liveCreator(overrides: Partial<FixtureCreator> = {}): FixtureCreator {
  return {
    id: 'youtube:https://www.youtube.com/@acceptance-maker',
    platform: 'youtube', url: 'https://www.youtube.com/@acceptance-maker',
    name: 'Acceptance Maker', handle: 'acceptance-maker', bio: 'AI tools for marketers',
    avatar: '', followers: null, location: '', verified: false,
    websites: [], contacts: [],
    evidence: [{ kind: 'search', url: 'https://www.youtube.com/@acceptance-maker', text: 'AI tools for marketers' }],
    matchedTerms: ['AI tools'], collectedAt: '2026-10-13T12:00:00.000Z', profileStatus: 'complete',
    ...overrides,
  };
}

async function restoreLiveState(page: Page, creator: Creator, jobs: Job[] = []) {
  await page.addInitScript(({ creator, jobs, config }) => {
    sessionStorage.setItem('signal-scout:v1:results', JSON.stringify([creator]));
    sessionStorage.setItem('signal-scout:v1:jobs', JSON.stringify(jobs));
    sessionStorage.setItem('signal-scout:v1:config', JSON.stringify(config));
  }, { creator, jobs, config });
}

test.describe('redesign responsive composition', () => {
  // These explicit sizes are independent of the desktop/mobile project defaults.
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    test(`${width}px: arrival, sample workspace and dialogs fit without horizontal scrolling`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', 'The explicit viewport matrix runs once.');
      const calls = await blockProviderWork(page);
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      const composer = page.locator('.search-panel');
      await expect(composer).toBeVisible();
      await expectNoHorizontalOverflow(page, `${width}px arrival`, composer);
      for (const platform of ['YouTube', 'Instagram', 'TikTok', 'LinkedIn', 'X']) {
        await expect(composer.getByRole('button', { name: platform, exact: true })).toBeVisible();
      }
      const topic = page.getByLabel('Topic or keyword', { exact: true });
      if (width <= 390) {
        expect(await topic.evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      }
      if (width === 390) {
        expect((await topic.boundingBox())!.y).toBeLessThan(844);
      }
      await composer.getByRole('button', { name: /Explore (?:a )?sample/ }).click();
      await expect(page.locator('.creator-card')).toHaveCount(8);
      await expect(composer).toBeHidden();
      await expect(page.getByRole('heading', { name: /Find your people/ })).toBeHidden();
      await expect(page.getByRole('heading', { name: 'Meet your next collaborators.', exact: true })).toBeFocused();
      await expect(page.getByRole('button', { name: 'Edit search', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'New search', exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page, `${width}px sample`);
      for (const card of await page.locator('.creator-card').all()) {
        expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${width}px creator card`).toBeTruthy();
      }
      await page.locator('.creator-card').first().getByRole('button', { name: 'View details', exact: true }).click();
      const detail = page.getByRole('dialog');
      await expect(detail).toBeVisible();
      await expect(detail).toHaveAccessibleName(/\S/);
      await expectNoHorizontalOverflow(page, `${width}px creator detail`, detail);
      await detail.getByRole('button', { name: 'Close dialog', exact: true }).click();
      await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
      const connection = page.getByRole('dialog');
      await expect(connection.getByLabel('Bright Data API key')).toBeVisible();
      await connection.locator('summary').filter({ hasText: /New to Bright Data/ }).click();
      await expect(connection.getByRole('heading', { name: 'Your Bright Data checklist' })).toBeVisible();
      await expectNoHorizontalOverflow(page, `${width}px expanded connection`, connection);
      expect(calls).toEqual([]);
    });
  }
});

test('mobile Edit search, New search, filtering and recent briefs are unpaid configuration changes', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Exercises the touch-sized production navigation.');
  const calls = await blockProviderWork(page);
  const recent = { brief: 'Restored skincare brief', keywords: ['skincare', 'beauty reviews'], platforms: ['instagram', 'x'], depth: 10 };
  await page.addInitScript(recent => {
    localStorage.setItem('signal-scout:v1:history', JSON.stringify([recent]));
  }, recent);
  await page.goto('/');
  await page.getByRole('button', { name: /Explore (?:a )?sample/ }).click();
  await page.getByLabel('Filter creators').fill('nora');
  await expect(page.locator('.creator-card')).toHaveCount(1);
  await page.getByLabel('Filter creators').fill('');
  await page.getByLabel('Has email').check();
  await expect(page.locator('.creator-card')).toHaveCount(5);
  await page.getByLabel('Has email').uncheck();
  const platformFilter = page.getByRole('combobox', { name: /Filter by platform/ });
  await expect(platformFilter).toBeVisible();
  await expect(platformFilter.getByRole('option')).toHaveCount(6);
  await platformFilter.selectOption('youtube');
  await expect(page.locator('.creator-card')).toHaveCount(2);
  await platformFilter.selectOption('all');
  await page.getByLabel('Minimum audience').selectOption('10000');
  await page.getByLabel('Sort creators').selectOption('email');
  await page.getByRole('button', { name: 'Edit search', exact: true }).click();
  const topic = page.getByLabel('Topic or keyword', { exact: true });
  await expect(topic).toHaveValue('AI tools, automation');
  await expect(topic).toBeFocused();
  await topic.fill('Custom topic');
  await page.getByLabel('Search depth', { exact: true }).selectOption('20');
  await page.locator('.search-panel').getByRole('button', { name: 'X', exact: true }).click();
  await page.getByRole('button', { name: 'Back to results', exact: true }).click();
  await page.getByRole('button', { name: 'Edit search', exact: true }).click();
  await expect(topic).toHaveValue('AI tools, automation');
  await expect(page.getByLabel('Search depth', { exact: true })).toHaveValue('5');
  await expect(page.locator('.search-panel').getByRole('button', { name: 'X', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Back to results', exact: true }).click();
  await page.getByRole('button', { name: 'New search', exact: true }).click();
  await expect(topic).toHaveValue('');
  await expect(topic).toBeFocused();
  await expect(page.getByLabel('Search depth', { exact: true })).toHaveValue('5');
  for (const platform of ['YouTube', 'Instagram', 'TikTok', 'LinkedIn', 'X']) {
    await expect(page.locator('.search-panel').getByRole('button', { name: platform, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await topic.fill('Abandoned new-search topic');
  await page.getByRole('button', { name: 'Back to results', exact: true }).click();
  await page.getByRole('button', { name: 'Edit search', exact: true }).click();
  // Cancelling a New search restores the collected sample brief, rather than
  // the abandoned New draft or the earlier unsent ordinary Edit draft.
  await expect(topic).toHaveValue('AI tools, automation');
  await expect(page.getByLabel('Search depth', { exact: true })).toHaveValue('5');
  await expect(page.locator('.search-panel').getByRole('button', { name: 'X', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Back to results', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Recent searches', exact: true }).click();
  await page.getByRole('button', { name: /Restored skincare brief/ }).click();
  await expect(topic).toBeVisible();
  await expect(topic).toHaveValue('skincare, beauty reviews');
  await expect(page.getByLabel('Search depth', { exact: true })).toHaveValue('10');
  await expect(page.locator('.search-panel').getByRole('button', { name: 'YouTube', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expectNoHorizontalOverflow(page, 'mobile restored brief', page.locator('.search-panel'));
  await page.getByRole('button', { name: 'Back to results', exact: true }).click();
  await expect(page.locator('.brief-topic')).toContainText('AI tools & automation');
  await page.getByRole('button', { name: 'Edit search', exact: true }).click();
  await expect(topic).toHaveValue('AI tools, automation');
  await expect(page.getByLabel('Search depth', { exact: true })).toHaveValue('5');
  await expect(page.locator('.search-panel').getByRole('button', { name: 'YouTube', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(calls).toEqual([]);
});

for (const state of ['pending', 'partial'] as const) {
  test(`${state} live profile keeps unavailable audience and unknown email honest in cards and detail`, async ({ page }) => {
    const calls = await blockProviderWork(page);
    const creator = liveCreator(state === 'partial'
      ? { profileStatus: 'partial', enrichmentError: 'Profile collection returned no usable profile.' }
      : { profileStatus: 'pending' });
    const jobs: Job[] = state === 'pending' ? [{
      platform: 'youtube', stage: 'enrich', snapshot: 'sd_pendingacceptance123',
      createdAt: 1791892800000, config, candidates: [creator],
    }] : [];
    await restoreLiveState(page, creator, jobs);
    await page.goto('/');
    const card = page.locator('.creator-card');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Not available');
    await expect(card).toContainText(state === 'pending' ? /email[^\n]*(?:pending|unknown)|(?:pending|unknown)[^\n]*email/i : /Partial profile/i);
    await expect(card).not.toContainText(/No (?:public )?email found/i);
    await card.getByRole('button', { name: 'View details', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Not available');
    await expect(dialog).toContainText(/email[^\n]*(?:pending|unknown|incomplete|unavailable)|(?:pending|unknown|incomplete|unavailable)[^\n]*email/i);
    await expect(dialog).not.toContainText(/No (?:public )?email found|0\s*public emails found/i);
    if (state === 'partial') await expect(dialog).toContainText('Profile collection returned no usable profile.');
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await dialog.locator('.detail-stats').evaluate(el => {
        const cells = [...el.children].map(cell => cell.getBoundingClientRect());
        const contained = [...el.querySelectorAll('strong, span')].every(text => {
          const cell = text.parentElement!.getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(text);
          return [...range.getClientRects()].every(r => r.left >= cell.left - 1 && r.right <= cell.right + 1);
        });
        return contained && cells.every((a, i) => cells.every((b, j) => i === j || a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top));
      }), `${state} metrics must stay inside nonoverlapping cells at ${width}px`).toBeTruthy();
    }
    if (state === 'pending') {
      await page.keyboard.press('Escape');
      const references = await page.evaluate(() => sessionStorage.getItem('signal-scout:v1:jobs'));
      await page.getByRole('button', { name: 'New search', exact: true }).click();
      await expect(page.getByRole('status')).toContainText(/Resume or discard.*existing job references/i);
      await expect(page.locator('.search-panel')).toBeHidden();
      expect(await page.evaluate(() => sessionStorage.getItem('signal-scout:v1:jobs'))).toBe(references);
    }
    expect(calls).toEqual([]);
  });
}

for (const width of [390, 768]) {
  test(`${width}px: long live identity, bio and source URLs remain readable and contained`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Explicit mobile/tablet sizes run once.');
    const calls = await blockProviderWork(page);
    await page.setViewportSize({ width, height: 600 });
    const name = `Alexandra ${'CreatorResearch'.repeat(10)} International Studio`;
    const handle = `creator_${'unbrokenhandle'.repeat(14)}`;
    const website = `https://creator.example/${'unbroken-source-path'.repeat(20)}`;
    const bio = `I explain AI tools. ${'UnbrokenBiography'.repeat(25)} Full biography ends here.`;
    const evidenceText = `Authored explanation of AI tools: ${website}`;
    await restoreLiveState(page, liveCreator({
      name, handle, bio, websites: [website],
      evidence: [{ kind: 'content', url: website, text: evidenceText, publishedAt: '2026-10-12T12:00:00.000Z' }],
      contacts: [{ email: 'hello@creator.example', source: 'Public website', sourceUrl: website }],
    }));
    await page.goto('/');
    const card = page.locator('.creator-card');
    await expect(card.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(card.locator('.avatar img')).toHaveCount(0);
    await expect(card).toContainText(handle);
    await expectNoHorizontalOverflow(page, `${width}px long creator card`, card);
    await card.getByRole('button', { name: 'View details', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(dialog.getByText(bio, { exact: true })).toBeVisible();
    await expect(dialog.getByRole('link', { name: /Open evidence/ })).toHaveAttribute('href', website);
    await expect(dialog.getByRole('link', { name: 'View source', exact: true })).toHaveAttribute('href', website);
    await expect(dialog.getByText(evidenceText, { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, `${width}px long creator detail`, dialog);
    await dialog.getByRole('button', { name: 'Save creator', exact: true }).scrollIntoViewIfNeeded();
    await expectTouchTarget(dialog.getByRole('button', { name: 'Save creator', exact: true }));
    expect(calls).toEqual([]);
  });
}

test('creator details contain keyboard focus, make the background inert and restore the opener on Escape', async ({ page }) => {
  const calls = await blockProviderWork(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /Explore (?:a )?sample/ }).click();
  const opener = page.locator('.creator-card').first().getByRole('button', { name: 'View details', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(/\S/);
  expect(await dialog.evaluate(el => el.matches(':modal'))).toBeTruthy();
  const backgroundScroll = await page.evaluate(() => scrollY);
  await page.mouse.move(1, 1);
  await page.mouse.wheel(0, 500);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(Math.abs(await page.evaluate(() => scrollY) - backgroundScroll),
    'Scrolling over the backdrop must not scroll the workspace').toBeLessThanOrEqual(1);
  const background = page.getByRole('navigation', { name: 'Main navigation', includeHidden: true })
    .getByRole('button', { name: /Your shortlist/, includeHidden: true });
  await background.evaluate(el => (el as HTMLElement).focus());
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBeTruthy();
  for (const key of ['Tab', 'Shift+Tab']) {
    // More than the number of modal controls exercises both wrap boundaries.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press(key);
      // Native dialogs can move focus to browser chrome at a Tab boundary;
      // Chromium then reports body as activeElement. Background UI stays inert.
      expect(await dialog.evaluate(el => document.activeElement === document.body || el.contains(document.activeElement)),
        `${key} must never focus a background control`).toBeTruthy();
    }
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(Math.abs(await page.evaluate(() => scrollY) - backgroundScroll),
    'Closing details preserves the workspace scroll position').toBeLessThanOrEqual(1);
  await page.mouse.wheel(0, backgroundScroll > 0 ? -200 : 200);
  await expect.poll(async () => Math.abs(await page.evaluate(() => scrollY) - backgroundScroll),
    { message: 'The workspace becomes scrollable again after closing details' }).toBeGreaterThan(1);
  await background.click();
  await expect(page.getByRole('heading', { name: 'Your next partnerships.', exact: true })).toBeVisible();
  expect(calls).toEqual([]);
});

test('mobile setup makes every required service, recovery limit and coding-agent handoff reachable', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'mobile', 'Checks expanded disclosures and long prompt at touch width.');
  const calls = await blockProviderWork(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Bright Data API key')).toHaveAttribute('type', 'password');
  await expect(dialog).toContainText(/own.*key.*pays for their own searches/i);
  await expect(dialog).toContainText(/memory.*HTTPS.*stateless relay.*Refreshing/i);
  await dialog.locator('summary').filter({ hasText: /New to Bright Data/ }).click();
  const checklist = dialog.getByRole('region', { name: 'Bright Data setup steps' });
  await expect(checklist.getByRole('listitem')).toHaveCount(5);
  await expect(checklist).toContainText(/account and check credits/i);
  await expect(checklist).toContainText(/Web Scraper API access for your key/i);
  await expect(checklist).toContainText(/SERP API search zone for Instagram, LinkedIn & X/i);
  await expect(checklist).toContainText(/Active.*does not guarantee/i);
  await expect(checklist).toContainText(/Optional.*Web Unlocker.*separately billed/i);
  await expect(checklist).toContainText(/key.*only in the app/i);
  for (const name of ['Web Scraper API guide', 'Set up search for Instagram, LinkedIn & X', 'Website scan setup', 'Check pricing']) {
    const link = checklist.getByRole('link', { name, exact: true });
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /^https:\/\/(?:docs\.)?brightdata\.com\//);
  }
  const recovery = dialog.locator('details').filter({ has: page.locator('summary').filter({ hasText: /After connecting.*resuming work/ }) });
  if (!(await recovery.evaluate(el => (el as HTMLDetailsElement).open))) await recovery.locator('summary').click();
  await expect(recovery).toContainText(/does not verify every product permission.*balance.*selected zone works/i);
  await expect(recovery).toContainText(/refresh.*reconnect.*resume.*paid profile-enrichment/i);
  await expect(recovery).toContainText(/closing.*tab|close.*tab/i);
  await expect(recovery).toContainText(/export.*snapshot|snapshot.*export/i);
  await expectNoHorizontalOverflow(page, '320px expanded provider checklist', dialog);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Setup guide', exact: true }).click();
  const guide = page.getByRole('dialog');
  await guide.getByRole('heading', { name: 'For your coding agent', exact: true }).scrollIntoViewIfNeeded();
  const copy = guide.getByRole('button', { name: 'Copy setup prompt', exact: true });
  await copy.click();
  const copyFeedback = guide.getByRole('status');
  await expect(copyFeedback).toContainText(/Copied to clipboard/i);
  await expect(copyFeedback).toBeVisible();
  await expect(copyFeedback).toBeInViewport();
  await expectTouchTarget(copy);
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  for (const requirement of ['Node.js 22+', 'npm ci', 'npm run check', 'npm run dev', '/api/health', 'Web Scraper API', 'SERP API', 'Web Unlocker', 'No Cloudflare login']) {
    expect(prompt).toContain(requirement);
  }
  expect(prompt).toMatch(/Do not request my key in chat.*submit paid test searches without asking/i);
  await guide.getByRole('heading', { name: 'For you: once the agent finishes', exact: true }).scrollIntoViewIfNeeded();
  await expect(guide).toContainText(/agent cannot supply your account, credits, or API key/i);
  await expect(guide).toContainText(/Select a working search zone.*choose topics\/platforms/i);
  await expect(guide).toContainText(/Keep the local server running.*refresh.*reconnect.*resume saved jobs/i);
  const localLink = guide.getByRole('link', { name: 'http://localhost:8787', exact: true });
  await localLink.scrollIntoViewIfNeeded();
  await expect(localLink).toBeVisible();
  await expect(localLink).toHaveAttribute('href', 'http://localhost:8787');
  await expectNoHorizontalOverflow(page, '320px coding-agent handoff', guide);
  expect(calls).toEqual([]);
});

test('queued SERP recovery exposes a zone selector outside the hidden composer and resumes only the chosen zone', async ({ page }) => {
  const instagramConfig: SearchConfig = {
    brief: 'AI tools', keywords: ['AI tools'], platforms: ['instagram'], depth: 5,
  };
  const creator = liveCreator({
    id: 'instagram:https://www.instagram.com/recovery-maker/', platform: 'instagram',
    url: 'https://www.instagram.com/recovery-maker/', name: 'Preserved Recovery Maker', handle: 'recovery-maker',
  });
  const queued: Job = {
    platform: 'instagram', stage: 'queued', snapshot: '',
    createdAt: 1791892800000, config: instagramConfig,
  };
  await page.addInitScript(({ creator, queued, config }) => {
    sessionStorage.setItem('signal-scout:v1:results', JSON.stringify([creator]));
    sessionStorage.setItem('signal-scout:v1:jobs', JSON.stringify([queued]));
    sessionStorage.setItem('signal-scout:v1:config', JSON.stringify(config));
  }, { creator, queued, config: instagramConfig });
  const searches: string[] = [];
  const unexpected: string[] = [];
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/connect') {
      return route.fulfill({ json: {
        connected: true, searchAvailable: true,
        searchZones: ['first-active-zone', 'explicit-working-zone'], unlockerZone: '',
      } });
    }
    if (path === '/api/discover') {
      const body = route.request().postDataJSON();
      expect(body.platform).toBe('instagram');
      searches.push(body.searchZone);
      // An empty successful result completes recovery without any enrichment.
      return route.fulfill({ json: { records: [], failures: [] } });
    }
    unexpected.push(path);
    return route.fulfill({ status: 500, json: { error: 'Unexpected provider call in queued-zone recovery.' } });
  });
  await page.goto('/');
  await expect(page.locator('.search-panel')).toBeHidden();
  await expect(page.locator('.creator-card')).toContainText('Preserved Recovery Maker');
  await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.getByLabel('Bright Data API key').fill('fixture-zone-recovery-key-only');
  await page.getByRole('dialog').getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bright Data connected', exact: true })).toBeVisible();
  await expect(page.locator('.search-panel')).toBeHidden();
  const zone = page.getByRole('combobox', { name: /Bright Data.*search zone/i });
  await expect(zone).toBeVisible();
  await expect(zone).toHaveValue('');
  const resume = page.getByRole('button', { name: 'Resume search', exact: true });
  await expect(resume).toBeDisabled();
  expect(searches).toEqual([]);
  await zone.selectOption('explicit-working-zone');
  await expect(resume).toBeEnabled();
  expect(searches).toEqual([]);
  await expectNoHorizontalOverflow(page, 'queued SERP inline recovery');
  await resume.click();
  await expect(page.getByRole('region', { name: 'Collection progress' })).toContainText(/No profiles matched/i);
  await expect(page.getByRole('button', { name: 'Pause search', exact: true })).toHaveCount(0);
  expect(searches).toEqual(['explicit-working-zone']);
  expect(unexpected).toEqual([]);
  await expect(page.locator('.creator-card')).toContainText('Preserved Recovery Maker');
});

test('abandoning a New search restores the collected live brief, platform choices and depth when editing results', async ({ page }) => {
  const calls = await blockProviderWork(page);
  const collected: SearchConfig = {
    brief: 'AI tools, workflow automation', keywords: ['AI tools', 'workflow automation'],
    platforms: ['youtube', 'linkedin'], depth: 10,
  };
  await page.addInitScript(({ creator, config }) => {
    sessionStorage.setItem('signal-scout:v1:results', JSON.stringify([creator]));
    sessionStorage.setItem('signal-scout:v1:config', JSON.stringify(config));
  }, { creator: liveCreator(), config: collected });
  await page.goto('/');
  await page.getByRole('button', { name: 'New search', exact: true }).click();
  const topic = page.getByLabel('Topic or keyword', { exact: true });
  await expect(topic).toHaveValue('');
  await topic.fill('Unsubmitted skincare search');
  await page.getByLabel('Search depth', { exact: true }).selectOption('20');
  await page.getByRole('button', { name: 'Back to results', exact: true }).click();
  await expect(page.locator('.creator-card')).toContainText('Acceptance Maker');
  await page.getByRole('button', { name: 'Edit search', exact: true }).click();
  await expect(topic).toHaveValue('AI tools, workflow automation');
  await expect(topic).toBeFocused();
  await expect(page.getByLabel('Search depth', { exact: true })).toHaveValue('10');
  for (const platform of ['YouTube', 'Instagram', 'TikTok', 'LinkedIn', 'X']) {
    await expect(page.locator('.search-panel').getByRole('button', { name: platform, exact: true }))
      .toHaveAttribute('aria-pressed', String(['YouTube', 'LinkedIn'].includes(platform)));
  }
  expect(calls).toEqual([]);
});

for (const hasResults of [false, true]) {
  test(`restored pending jobs ${hasResults ? 'with' : 'without'} results orient focus and viewport to recovery before results`, async ({ page }) => {
    const calls = await blockProviderWork(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const creator = liveCreator({ profileStatus: 'pending' });
    const job: Job = {
      platform: 'youtube', stage: 'enrich', snapshot: 'sd_focusedrecovery123',
      createdAt: 1791892800000, config, candidates: [creator],
    };
    await page.addInitScript(({ creators, job, config }) => {
      sessionStorage.setItem('signal-scout:v1:results', JSON.stringify(creators));
      sessionStorage.setItem('signal-scout:v1:jobs', JSON.stringify([job]));
      sessionStorage.setItem('signal-scout:v1:config', JSON.stringify(config));
    }, { creators: hasResults ? [creator] : [], job, config });
    await page.goto('/');
    const recovery = page.locator('.resume-banner');
    await expect(recovery).toContainText(/unfinished platform collection/i);
    await expect.poll(() => recovery.evaluate(el => el.contains(document.activeElement)),
      { message: 'Refresh recovery focuses its actionable panel, not the results heading' }).toBeTruthy();
    expect(await recovery.evaluate(el => {
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || !el.contains(focused)) return false;
      const box = focused.getBoundingClientRect();
      return box.top >= 0 && box.top < innerHeight && box.bottom > 0;
    }), 'The focused recovery target is inside the initial viewport').toBeTruthy();
    await expect(page.getByRole('button', { name: 'Resume search', exact: true })).toBeInViewport();
    await expect(page.locator('.search-panel')).toBeHidden();
    expect(calls).toEqual([]);
  });
}

test('same-platform pending work labels only its candidates and cannot override a terminal partial-profile error', async ({ page }) => {
  const calls = await blockProviderWork(page);
  const pending = liveCreator({ name: 'Pending Candidate', profileStatus: 'pending' });
  const failed = liveCreator({
    id: 'youtube:https://www.youtube.com/@failed-candidate', url: 'https://www.youtube.com/@failed-candidate',
    name: 'Failed Candidate', handle: 'failed-candidate',
    enrichmentError: 'Profile collection failed for this creator.', profileStatus: 'partial',
  });
  const completed = liveCreator({
    id: 'youtube:https://www.youtube.com/@completed-maker', url: 'https://www.youtube.com/@completed-maker',
    name: 'Completed Maker', handle: 'completed-maker', followers: 12000,
    evidence: [{ kind: 'profile', url: 'https://www.youtube.com/@completed-maker', text: 'Collected complete public profile about AI tools.' }],
  });
  const job: Job = {
    platform: 'youtube', stage: 'enrich', snapshot: 'sd_membership123',
    createdAt: 1791892800000, config, candidates: [pending, failed],
  };
  await page.addInitScript(({ creators, job, config }) => {
    sessionStorage.setItem('signal-scout:v1:results', JSON.stringify(creators));
    sessionStorage.setItem('signal-scout:v1:jobs', JSON.stringify([job]));
    sessionStorage.setItem('signal-scout:v1:config', JSON.stringify(config));
  }, { creators: [pending, failed, completed], job, config });
  await page.goto('/');
  const cardFor = (name: string) => page.locator('.creator-card').filter({
    has: page.getByRole('heading', { name, exact: true }),
  });
  await expect(cardFor('Pending Candidate')).toContainText(/Email collection pending/i);
  await expect(cardFor('Failed Candidate')).toContainText(/Partial profile/i);
  await expect(cardFor('Failed Candidate')).toContainText(/Email.*(?:unknown|unavailable|incomplete)/i);
  await expect(cardFor('Failed Candidate')).not.toContainText(/(?:email|profile) collection pending/i);
  await expect(cardFor('Completed Maker')).toContainText(/No email found/i);
  await expect(cardFor('Completed Maker')).not.toContainText(/(?:email|profile) collection pending|Partial profile/i);
  await cardFor('Failed Candidate').getByRole('button', { name: 'View details', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Profile collection failed for this creator.');
  await expect(dialog).toContainText(/Email collection.*(?:incomplete|failed|unavailable|unknown)/i);
  await expect(dialog).not.toContainText(/Email collection (?:is )?pending|No (?:public )?email found/i);
  await page.keyboard.press('Escape');
  await cardFor('Completed Maker').getByRole('button', { name: 'View details', exact: true }).click();
  await expect(dialog).toContainText(/No public email found/i);
  await expect(dialog).not.toContainText(/(?:email|profile) collection pending|Partial profile/i);
  await page.keyboard.press('Escape');
  await cardFor('Completed Maker').getByRole('button', { name: 'Save Completed Maker', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: /Your shortlist/ }).click();
  await expect(page.locator('.creator-card')).toHaveCount(1);
  await expect(page.locator('.creator-card')).toContainText('Completed Maker');
  await expect(page.locator('.creator-card')).toContainText(/No email found/i);
  await expect(page.locator('.creator-card')).not.toContainText(/(?:email|profile) collection pending|Partial profile/i);
  await page.locator('.creator-card').getByRole('button', { name: 'View details', exact: true }).click();
  await expect(dialog).toContainText(/No public email found/i);
  await expect(dialog).not.toContainText(/(?:email|profile) collection pending|Partial profile/i);
  expect(calls).toEqual([]);
});

test('saving a discovery candidate and discarding references cannot turn pending collection into a completed profile after reload', async ({ page }) => {
  const calls = await blockProviderWork(page);
  const creator = liveCreator({ name: 'Durable Pending Maker', profileStatus: 'pending' });
  const job: Job = {
    platform: 'youtube', stage: 'enrich', snapshot: 'sd_durablepending123',
    createdAt: 1791892800000, config, candidates: [creator],
  };
  await page.addInitScript(({ creator, job, config }) => {
    // Seed once: a reload must exercise the state actually written by the app.
    if (sessionStorage.getItem('signal-scout:v1:results') !== null) return;
    sessionStorage.setItem('signal-scout:v1:results', JSON.stringify([creator]));
    sessionStorage.setItem('signal-scout:v1:jobs', JSON.stringify([job]));
    sessionStorage.setItem('signal-scout:v1:config', JSON.stringify(config));
  }, { creator, job, config });
  await page.goto('/');
  await page.getByRole('button', { name: 'Save Durable Pending Maker', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('button', { name: /Your shortlist/ }).click();
  const card = page.locator('.creator-card');
  await expect(card).toContainText(/Email collection pending/i);
  await expect(card).not.toContainText(/No (?:public )?email found|Collected with Bright Data/i);
  await nav.getByRole('button', { name: /^(?:Discover|Discover creators)$/, exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Discard references', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume search', exact: true })).toHaveCount(0);
  await expect(card).toContainText(/Email collection pending/i);
  await expect(card).not.toContainText(/No (?:public )?email found|Collected with Bright Data/i);
  await page.reload();
  await expect(card).toContainText(/Email collection pending/i);
  await expect(card).not.toContainText(/No (?:public )?email found|Collected with Bright Data/i);
  await nav.getByRole('button', { name: /Your shortlist/ }).click();
  await expect(card).toContainText('Durable Pending Maker');
  await expect(card).toContainText(/Email collection pending/i);
  await card.getByRole('button', { name: 'View details', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(/Email collection (?:is )?pending/i);
  await expect(page.getByRole('dialog')).not.toContainText(/No (?:public )?email found|0\s*public emails found/i);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('signal-scout:v1:shortlist') || '[]'));
  expect(saved[0].profileStatus).toBe('pending');
  expect(calls).toEqual([]);
});

test('legacy results without collection status remain unknown after restore', async ({ page }) => {
  const calls = await blockProviderWork(page);
  await restoreLiveState(page, liveCreator({ profileStatus: undefined }));
  await page.goto('/');
  const card = page.locator('.creator-card');
  await expect(card).toContainText(/unknown|unavailable|not confirmed/i);
  await expect(card).not.toContainText(/No (?:public )?email found|Collected with Bright Data/i);
  await card.getByRole('button', { name: 'View details', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(/unknown|unavailable|not confirmed/i);
  await expect(page.getByRole('dialog')).not.toContainText(/No (?:public )?email found|0\s*public emails found/i);
  expect(calls).toEqual([]);
});

for (const supportingKind of ['content', 'profile'] as const) {
  test(`${supportingKind} relevance displays its supporting excerpt instead of the first unrelated content item`, async ({ page }) => {
    const calls = await blockProviderWork(page);
    const unrelated = 'A completely unrelated hiking story about mountain trails.';
    const supporting = supportingKind === 'content'
      ? 'How I compare AI tools for marketing research every week.'
      : 'Public profile: I teach marketers how to use AI tools.';
    await restoreLiveState(page, liveCreator({
      bio: supportingKind === 'profile' ? 'I teach marketers how to use AI tools.' : 'Marketing educator.',
      evidence: [
        { kind: 'content', url: 'https://www.youtube.com/watch?v=unrelated123', text: unrelated },
        { kind: supportingKind, url: supportingKind === 'content'
          ? 'https://www.youtube.com/watch?v=supporting123'
          : 'https://www.youtube.com/@acceptance-maker', text: supporting },
      ],
    }));
    await page.goto('/');
    const card = page.locator('.creator-card');
    await expect(card).toContainText(supporting);
    await expect(card).not.toContainText(unrelated);
    await expect(card).toContainText(supportingKind === 'content' ? /matching post/i : /profile(?: topic)? match/i);
    await card.getByRole('button', { name: 'View details', exact: true }).click();
    // Full detail preserves both source items; only the summary chooses support.
    await expect(page.getByRole('dialog')).toContainText(unrelated);
    await expect(page.getByRole('dialog')).toContainText(supporting);
    expect(calls).toEqual([]);
  });
}
