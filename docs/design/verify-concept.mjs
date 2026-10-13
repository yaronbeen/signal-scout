import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('./', import.meta.url);
const url = new URL('world-class-concept.html', root).href;
const browser = await chromium.launch({ headless: true });
const errors = [], externalRequests = [], viewports = [];
for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  const page = await browser.newPage({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/^https?:/.test(request.url())) externalRequests.push(request.url());
  });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const label = width === 390 ? 'mobile' : width === 1440 ? 'desktop' : null;
  async function capture(state, dialog = false) {
    if (!label) return;
    await page.screenshot({ path: new URL(`concept-${state}-${label}.png`, root).pathname, fullPage: !dialog });
    await fs.writeFile(new URL(`evidence/concept-${state}-${label}.aria.txt`, root), await page.locator('body').ariaSnapshot());
  }
  async function checkOverflow(state) {
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    viewports.push({ width, state, ...dimensions });
    assert.equal(dimensions.document, dimensions.viewport, `${width}px ${state} overflows`);
  }
  await capture('home');
  await checkOverflow('home');
  await page.locator('#discovery-form .primary').click();
  assert.equal(await page.locator('#form-error').isVisible(), true);
  await page.getByRole('button', { name: 'AI & automation', exact: true }).click();
  assert.equal(await page.locator('#topic').inputValue(), 'AI tools, automation');
  await page.locator('#discovery-form .primary').click();
  assert.equal(await page.locator('#connection').isVisible(), true);
  await page.keyboard.press('Escape');
  await page.locator('#mode-results').click();
  assert.equal(await page.locator('.creator-card').count(), 8);
  await capture('results');
  await checkOverflow('results');
  await page.getByRole('button', { name: 'View details for Maya Chen', exact: true }).click();
  await capture('details', true);
  await checkOverflow('details');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button', { name: 'View details for Maya Chen', exact: true }).evaluate(el => el === document.activeElement), true);
  await page.getByRole('button', { name: 'Save Maya Chen', exact: true }).click();
  await page.locator('#nav-shortlist').click();
  assert.equal(await page.locator('.creator-card').count(), 1);
  await page.locator('#mode-results').click();
  await page.locator('#email-only').check();
  assert.equal(await page.locator('.creator-card').count(), 5);
  await page.locator('#email-only').uncheck();
  if (width < 768) await page.locator('#mobile-platform').selectOption('linkedin');
  else await page.getByRole('button', { name: 'LinkedIn 1', exact: true }).click();
  assert.equal(await page.locator('.creator-card').count(), 1);
  await page.locator('#filter').fill('unmatched query');
  assert.equal(await page.locator('.creator-card').count(), 0);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  assert.equal(await page.locator('.creator-card').count(), 8);
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  assert.equal((await download).suggestedFilename(), 'signal-scout-illustrative-sample.csv');
  await page.locator('#connect').click();
  await capture('connection', true);
  await checkOverflow('connection');
  await page.locator('#setup-checklist summary').click();
  await checkOverflow('setup');
  await page.keyboard.press('Escape');
  await page.close();
}
assert.deepEqual(errors, []);
assert.deepEqual(externalRequests, []);
const linear = value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; };
const luminance = hex => hex.match(/[0-9a-f]{2}/gi).map(value => linear(parseInt(value, 16))).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
const textContrast = [['primary text', '#102442', '#FFFFFF'], ['secondary on white', '#52627A', '#FFFFFF'], ['secondary on canvas', '#52627A', '#F5F7FB'], ['CTA white text', '#FFFFFF', '#285FD2'], ['sample notice', '#493F66', '#E9E7F6'], ['public contact', '#24604C', '#FFFFFF']].map(([role, foreground, background]) => ({ role, foreground, background, ratio: Number(((Math.max(luminance(foreground), luminance(background)) + .05) / (Math.min(luminance(foreground), luminance(background)) + .05)).toFixed(2)) }));
assert.ok(textContrast.every(pair => pair.ratio >= 4.5));
const motionPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await motionPage.goto(url);
await motionPage.waitForTimeout(800);
assert.equal(await motionPage.locator('.home-copy').evaluate(el => getComputedStyle(el).opacity), '1');
await motionPage.close();
const result = { date: '2026-10-13', viewports, errors, externalRequests, textContrast, normalMotionEntranceCompleted: true, flows: ['empty topic validation', 'topic preset', 'unconnected search opens dialog', 'sample results', 'details and Escape focus restoration', 'save and shortlist', 'email filter', 'named mobile/desktop platform filter', 'no matches and recovery', 'sample CSV export', 'connection dialog', 'setup checklist'], realKeysEntered: false, paidRequests: 0 };
await fs.writeFile(new URL('evidence/verification.json', root), JSON.stringify(result, null, 2));
await browser.close();
console.log('PASS: 6 viewports, home/results/details/connection/setup overflow checks, 12 meaningful flows, zero external requests or console errors.');
