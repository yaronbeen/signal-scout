import { test, expect } from '@playwright/test';
import { sampleCreators } from '../../src/sample';

for (const outcome of ['empty', 'failed'] as const) {
  test(`selected platform shows radar only while collecting, then ${outcome} outcome`, async ({ page }, testInfo) => {
    await page.addInitScript(c => {
      sessionStorage.setItem('signal-scout:v1:results', JSON.stringify([{ ...c, sample: false, platform: 'instagram', id: 'instagram:fixture' }]));
      sessionStorage.setItem('signal-scout:v1:jobs', JSON.stringify([{ platform: 'youtube', stage: 'discover', snapshot: 'sd_loading123', createdAt: Date.now(), config: { brief: 'AI tools', keywords: ['AI tools'], platforms: ['youtube'], depth: 5 } }]));
    }, sampleCreators[0]);
    let finish = false;
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true } });
      if (path.endsWith('/status')) return route.fulfill({ json: { status: !finish ? 'running' : outcome === 'failed' ? 'failed' : 'ready' } });
      if (path.endsWith('/result')) return route.fulfill({ json: { records: [] } });
      return route.abort();
    });
    await page.goto('/');
    if (testInfo.project.name === 'mobile') await page.getByRole('combobox', { name: 'Filter by platform', exact: true }).selectOption('youtube');
    else await page.getByRole('group', { name: 'Filter by platform' }).getByRole('button', { name: /YouTube/ }).click();
    await expect(page.getByRole('heading', { name: 'Collection is not running.' })).toBeVisible();
    await expect(page.locator('.scout-radar')).toHaveCount(0);
    await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
    await page.getByLabel('Bright Data API key').fill('fixture-only');
    await page.getByRole('dialog').getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
    await page.getByRole('button', { name: 'Resume search', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'YouTube collection in progress.' })).toBeVisible();
    await expect(page.locator('.scout-radar')).toBeVisible();
    await expect(page.getByText('No creators match these filters.', { exact: true })).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.locator('.scout-radar').evaluate(el => getComputedStyle(el, '::before').animationName)).toBe('none');
    await page.getByRole('button', { name: 'Pause search', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Collection is not running.' })).toBeVisible();
    await expect(page.locator('.scout-radar')).toHaveCount(0);
    finish = true;
    await page.getByRole('button', { name: 'Resume search', exact: true }).click();
    await expect(page.getByRole('heading', { name: outcome === 'failed' ? 'Collection needs attention.' : 'No YouTube creators in this collection.', exact: true })).toBeVisible();
    await expect(page.locator('.scout-radar')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  });
}

test('filter controls align and remain contained at narrow widths', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore a sample/ }).click();
  if (testInfo.project.name === 'desktop') {
    const controls = await page.locator('.filter-row input, .filter-row select').evaluateAll(els => els.map(el => el.getBoundingClientRect().bottom));
    expect(Math.max(...controls) - Math.min(...controls)).toBeLessThanOrEqual(2);
  }
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    if (width < 768) {
      const selects = await page.locator('.filter-selects select').evaluateAll(els => els.map(el => ({ width: el.getBoundingClientRect().width, top: el.getBoundingClientRect().top })));
      expect(selects[1].top).toBeGreaterThan(selects[0].top + 44);
      expect(selects.every(el => el.width >= 220)).toBeTruthy();
    }
  }
  const contrast = await page.locator('.filter-selects select').first().evaluate(el => {
    const luminance = (color: string) => {
      const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(n => { const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    const style = getComputedStyle(el);
    return (1.05) / (luminance(style.borderTopColor) + .05);
  });
  expect(contrast).toBeGreaterThanOrEqual(3);
});

test('paused platform stops its radar while another platform request is still settling', async ({ page }, testInfo) => {
  await page.addInitScript(c => {
    sessionStorage.setItem('signal-scout:v1:results', JSON.stringify([{ ...c, sample: false, platform: 'instagram', id: 'instagram:fixture' }]));
    const config = { brief: 'AI tools', keywords: ['AI tools'], platforms: ['youtube', 'instagram'], depth: 5 };
    sessionStorage.setItem('signal-scout:v1:jobs', JSON.stringify([
      { platform: 'youtube', stage: 'discover', snapshot: 'sd_pause123', createdAt: Date.now(), config },
      { platform: 'instagram', stage: 'queued', snapshot: '', createdAt: Date.now(), config },
    ]));
  }, sampleCreators[0]);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let discovering = false;
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/connect')) return route.fulfill({ json: { connected: true, searchAvailable: true, searchZones: ['working'] } });
    if (path.endsWith('/status')) return route.fulfill({ json: { status: 'running' } });
    if (path.endsWith('/discover')) { discovering = true; await pending; return route.fulfill({ json: { records: [] } }); }
    return route.abort();
  });
  await page.goto('/');
  if (testInfo.project.name === 'mobile') await page.getByRole('combobox', { name: 'Filter by platform', exact: true }).selectOption('youtube');
  else await page.getByRole('group', { name: 'Filter by platform' }).getByRole('button', { name: /YouTube/ }).click();
  await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.getByLabel('Bright Data API key').fill('fixture-only');
  await page.getByRole('dialog').getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
  await page.getByRole('button', { name: 'Resume search', exact: true }).click();
  await expect(page.locator('.scout-radar')).toBeVisible();
  await expect.poll(() => discovering).toBeTruthy();
  try {
    await page.getByRole('button', { name: 'Pause search', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Collection is not running.' })).toBeVisible();
    await expect(page.locator('.scout-radar')).toHaveCount(0);
  } finally { release(); }
});
