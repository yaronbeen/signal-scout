import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Non-billable release smoke: visitor/sample actions only, all paid API routes blocked.
const base = process.env.SIGNAL_SCOUT_URL || 'https://signal-scout.yaron-been.workers.dev';
const evidenceDir = fileURLToPath(new URL('./evidence/', import.meta.url));
await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch();
const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  for (const [device, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = [];
    const blocked = [];
    const externalFonts = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.resourceType() === 'font' && new URL(request.url()).origin !== new URL(base).origin) externalFonts.push(request.url());
    });
    await page.route('**/api/**', async route => {
      if (new URL(route.request().url()).pathname === '/api/health') return route.continue();
      blocked.push(new URL(route.request().url()).pathname);
      await route.abort();
    });
    const health = await page.request.get(`${base}/api/health`);
    assert(health.ok() && (await health.json()).ok === true, 'Hosted health must return ok:true');
    const response = await page.goto(base);
    assert(response?.ok(), 'Hosted homepage must return HTTP 200');
    const csp = response.headers()['content-security-policy'] || '';
    assert(csp.includes("default-src 'self'") && csp.includes("frame-ancestors 'none'"), 'Hosted response must include the constrained CSP');
    const depths = await page.locator('#depth option').evaluateAll(options => options.map(option => Number(option.value)));
    assert(JSON.stringify(depths) === JSON.stringify([5, 10, 20, 50, 100, 250]), 'Hosted search must offer all six supported depths');
    await page.getByLabel('Search depth', { exact: true }).selectOption('100');
    await page.locator('.usage-disclosure summary').click();
    assert((await page.locator('.usage-summary').innerText()).includes('Up to 100 profiles per platform'), 'Hosted collection disclosure must reflect selected depth');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${evidenceDir}hosted-${device}-depth-100.png`, fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: /Explore (?:a )?sample/ }).first().click();
    await page.locator('.creator-card').first().waitFor();
    assert(await page.locator('.creator-card').count() === 8, 'Sample must contain eight labeled creators');
    assert(/sample/i.test(await page.locator('.creator-card').first().innerText()), 'Sample cards must remain explicit');
    const first = page.locator('.creator-card').first();
    await first.getByRole('button', { name: /^Save / }).click();
    await first.getByRole('button', { name: /View details/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    assert(await dialog.getByText(/Sample profile/i).count() > 0, 'Details must disclose sample identity');
    await page.keyboard.press('Escape');
    assert(await dialog.count() === 0, 'Escape must close the detail dialog');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export CSV/ }).click();
    const download = await downloadEvent;
    const stream = await download.createReadStream();
    let csv = '';
    for await (const chunk of stream) csv += chunk.toString();
    assert(csv.includes('collection_status') && csv.includes('sample'), 'Export must include collection status and sample identity');
    await page.getByRole('button', { name: /Setup guide/ }).click();
    await page.getByRole('dialog').waitFor();
    assert(await page.getByRole('dialog').getByText(/For your coding agent/).count() > 0, 'Setup must include coding-agent handoff');
    assert(await page.getByRole('dialog').getByText(/For you/).count() > 0, 'Setup must include the human handoff');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Connect Bright Data/ }).first().click();
    await page.getByRole('dialog').waitFor();
    assert(await page.getByRole('dialog').getByLabel(/API key/i).count() > 0, 'Visitors must supply their own key');
    await page.keyboard.press('Escape');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1);
    assert(!overflow, 'Hosted workspace must fit the viewport');
    assert(errors.length === 0, 'Hosted smoke must have no browser exceptions');
    assert(blocked.length === 0, 'Sample/setup actions must not attempt paid API calls');
    assert(externalFonts.length === 0, 'Fonts must remain self-hosted');
    results.push({ device, viewport, health: true, csp: true, depths, selectedDepthDisclosure: true, sampleCreators: 8, detail: true, shortlist: true, exportCollectionStatus: true, setupHandoffs: true, visitorKeyDialog: true, horizontalOverflow: false, errors, paidApiCalls: blocked, externalFonts });
    await context.close();
  }
  await writeFile(`${evidenceDir}hosted-release-smoke.json`, JSON.stringify({ base, checkedAt: new Date().toISOString(), results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
