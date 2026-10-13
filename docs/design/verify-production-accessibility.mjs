import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const evidence = new URL('./evidence/', import.meta.url);
await mkdir(evidence, { recursive: true });
const report = { date: new Date().toISOString(), url: 'http://localhost:8787', scope: 'Independent narrow accessibility verification of built UI; all API requests intercepted; fictional sample and connection metadata only.', states: [], findings: [], pageerrors: [], externalFonts: [], apiRequests: [], keyboard: [], connection: {}, reducedMotion: {} };
const browser = await chromium.launch({ headless: true });
const sizes = [[320, 760], [390, 844], [768, 1024], [1440, 900], [320, 480], [720, 450]];

async function inspect(page, label, size) {
  await page.waitForTimeout(650);
  const audit = await page.evaluate(() => {
    const root = document.querySelector('dialog[open]') || document.body;
    const selector = e => e.id ? `#${e.id}` : e.parentElement?.classList.contains('platform-tabs') ? `.platform-tabs button:nth-child(${[...e.parentElement.children].indexOf(e) + 1})` : `${e.tagName.toLowerCase()}${[...e.classList].map(c => `.${c}`).join('')}`;
    const rgba = value => { const n = value.match(/[\d.]+/g)?.map(Number); return n?.length >= 3 ? [n[0], n[1], n[2], n[3] ?? 1] : [0, 0, 0, 0]; };
    const mix = (front, back) => [0, 1, 2].map(i => front[i] * front[3] + back[i] * (1 - front[3])).concat(1);
    const luminance = c => c.slice(0, 3).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
    const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
    const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
    const backgrounds = e => { const chain = []; for (let p = e; p; p = p.parentElement) chain.unshift(p); return chain.reduce((bg, p) => mix(rgba(getComputedStyle(p).backgroundColor), bg), [255, 255, 255, 1]); };
    const text = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, e = node.parentElement;
      const content = node.textContent.trim();
      if (!content || !visible(e) || e.closest('script,style,svg') || e.closest(':disabled')) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      if (![...range.getClientRects()].some(r => r.width && r.height)) continue;
      const s = getComputedStyle(e), bg = backgrounds(e), fg = mix(rgba(s.color), bg);
      const ratio = contrast(fg, bg), font = parseFloat(s.fontSize), weight = parseFloat(s.fontWeight), minimum = font >= 24 || font >= 18.66 && weight >= 700 ? 3 : 4.5;
      text.push({ selector: selector(e), text: content.slice(0, 150), foreground: s.color, background: bg.slice(0, 3), fontSize: font, fontWeight: s.fontWeight, ratio: Number(ratio.toFixed(3)), minimum, pass: ratio + 0.001 >= minimum });
    }
    for (const e of root.querySelectorAll('input,textarea')) if (visible(e)) {
      const s = getComputedStyle(e, e.value ? null : '::placeholder'), bg = backgrounds(e), ratio = contrast(mix(rgba(s.color), bg), bg);
      text.push({ selector: selector(e) + (e.value ? '' : '::placeholder'), text: e.type === 'password' ? '[fictional password field]' : e.value || e.placeholder, foreground: s.color, background: bg.slice(0, 3), fontSize: parseFloat(s.fontSize), ratio: Number(ratio.toFixed(3)), minimum: 4.5, pass: ratio >= 4.5 });
    }
    const targets = [...root.querySelectorAll('button,input,select,summary')].filter(visible).map(e => { const target = e.matches('input[type=checkbox]') && e.closest('label') ? e.closest('label') : e; const r = target.getBoundingClientRect(); return { selector: selector(target), name: e.getAttribute('aria-label') || target.innerText?.trim().slice(0, 90) || e.id, width: Number(r.width.toFixed(1)), height: Number(r.height.toFixed(1)), pass: r.width >= 43.95 && r.height >= 43.95 }; });
    const dialog = root.tagName === 'DIALOG' ? { native: root.matches(':modal'), x: root.getBoundingClientRect().x, y: root.getBoundingClientRect().y, width: root.getBoundingClientRect().width, height: root.getBoundingClientRect().height, scrollHeight: root.scrollHeight, clientHeight: root.clientHeight, overflowY: getComputedStyle(root).overflowY, userSelect: getComputedStyle(root).userSelect } : null;
    return { title: document.title, text, targets, dialog, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth, selectableSupportingCopy: [...root.querySelectorAll('p,small')].filter(visible).every(e => getComputedStyle(e).userSelect !== 'none') };
  });
  await page.screenshot({ path: new URL(`accessibility-${size[0]}x${size[1]}-${label}.png`, evidence).pathname, fullPage: !audit.dialog });
  report.states.push({ viewport: size, state: label, ...audit });
  for (const t of audit.text.filter(t => !t.pass)) report.findings.push({ type: 'contrast', viewport: size, state: label, principle: 'WCAG 1.4.3 / D1 Perceivable', ...t });
  for (const t of audit.targets.filter(t => !t.pass)) report.findings.push({ type: 'target44', viewport: size, state: label, principle: 'D2 Operable; 44px requested target size', severity: 'Low', fix: 'Apply min-width: 44px to this platform filter button.', ...t });
  if (!audit.noHorizontalOverflow) report.findings.push({ type: 'horizontalOverflow', viewport: size, state: label, width: audit.documentWidth });
  if (!audit.selectableSupportingCopy) report.findings.push({ type: 'blockedCopy', viewport: size, state: label });
  if (audit.dialog) {
    const scroll = await page.locator('dialog[open]').evaluate(d => { d.scrollTop = d.scrollHeight; const bottom = d.lastElementChild.getBoundingClientRect(); const rect = d.getBoundingClientRect(); const result = { scrollTop: d.scrollTop, scrollMaximum: d.scrollHeight - d.clientHeight, bottomAccessible: bottom.bottom <= rect.bottom + 1 }; d.scrollTop = 0; return result; });
    report.states.at(-1).scroll = scroll;
    if (!scroll.bottomAccessible) report.findings.push({ type: 'dialogBottomBlocked', viewport: size, state: label, ...scroll });
  }
}

for (const size of sizes) {
  const context = await browser.newContext({ viewport: { width: size[0], height: size[1] }, permissions: ['clipboard-read', 'clipboard-write'] });
  await context.route('**/api/**', route => { report.apiRequests.push({ path: new URL(route.request().url()).pathname, action: 'blocked' }); return route.abort(); });
  const page = await context.newPage();
  page.on('pageerror', e => report.pageerrors.push({ viewport: size, message: e.message }));
  page.on('request', request => { if (/fonts\.(googleapis|gstatic)\.com|\.woff2?(?:\?|$)|\.ttf(?:\?|$)/i.test(request.url()) && new URL(request.url()).origin !== 'http://localhost:8787') report.externalFonts.push(request.url()); });
  await page.goto(report.url);
  await inspect(page, 'home', size);
  const opener = page.getByRole('button', { name: 'Connect Bright Data', exact: true });
  await opener.focus(); await page.keyboard.press('Enter');
  await page.locator('dialog[open]').waitFor();
  const activeInside = await page.evaluate(() => !!document.activeElement.closest('dialog[open]'));
  const tabResults = [];
  for (let i = 0; i < 25; i++) { await page.keyboard.press(i < 20 ? 'Tab' : 'Shift+Tab'); tabResults.push(await page.evaluate(() => ({ inside: !!document.activeElement.closest('dialog[open]'), browserChromeTransition: document.activeElement === document.body, backgroundControlFocused: document.activeElement !== document.body && !document.activeElement.closest('dialog[open]') }))); }
  await page.locator('dialog[open]').evaluate(d => d.scrollTop = 0);
  await page.locator('.setup-disclosure summary').click();
  await inspect(page, 'setup', size);
  await page.keyboard.press('Escape');
  const restored = await opener.evaluate(e => e === document.activeElement);
  report.keyboard.push({ viewport: size, initialFocusInside: activeInside, tabContained: tabResults.every(r => !r.backgroundControlFocused), nativeBrowserChromeTransitions: tabResults.filter(r => r.browserChromeTransition).length, tabBehaviorNote: 'Native modal dialog may tab to browser chrome (activeElement BODY); no background app control received focus.', escapeClosed: await page.locator('dialog[open]').count() === 0, openerFocusRestored: restored });
  await page.getByRole('button', { name: 'Explore a sample', exact: true }).click();
  await page.locator('.creator-card').first().waitFor();
  await inspect(page, 'sample', size);
  const detailOpener = page.locator('.creator-card').filter({ hasText: 'Lena Brooks' }).getByRole('button', { name: 'View details', exact: true });
  await detailOpener.focus(); await page.keyboard.press('Enter');
  await inspect(page, 'detail', size);
  const copy = page.getByRole('button', { name: /^Copy / }).first();
  if (await copy.count()) { await copy.click(); await page.locator('.dialog-feedback').waitFor(); report.states.at(-1).copyFeedback = { insideDialog: await page.locator('dialog[open] .dialog-feedback').count() > 0, visible: await page.locator('.dialog-feedback').isVisible() }; await inspect(page, 'detail-copy-feedback', size); }
  await page.keyboard.press('Escape');
  report.keyboard.at(-1).detailEscapeClosed = await page.locator('dialog[open]').count() === 0;
  report.keyboard.at(-1).detailOpenerFocusRestored = await detailOpener.evaluate(e => e === document.activeElement);
  await context.close();
}

const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
let connectCount = 0;
await context.route('**/api/**', async route => {
  const path = new URL(route.request().url()).pathname;
  if (path !== '/api/connect') { report.apiRequests.push({ path, action: 'blocked' }); return route.abort(); }
  connectCount++;
  report.apiRequests.push({ path, action: 'fixture-only', fixtureAuthorizationMatches: route.request().headers().authorization === `Bearer fixture-key-${connectCount}` });
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: true, unlockerZone: '', searchAvailable: true, searchZones: ['fixture-search-zone'], metadataAvailable: true }) });
});
const page = await context.newPage();
page.on('pageerror', e => report.pageerrors.push({ state: 'connection-fixture', message: e.message }));
await page.goto(report.url);
report.reducedMotion.home = await page.evaluate(() => ({ preference: matchMedia('(prefers-reduced-motion: reduce)').matches, activeAnimations: document.getAnimations().filter(a => a.playState === 'running').length, cssAnimations: [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).animationName !== 'none').map(e => ({ selector: e.tagName + '.' + e.className, animation: getComputedStyle(e).animationName })) }));
await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
await page.locator('#api-key').fill('fixture-dismissed-draft');
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
report.connection.dismissedDraftCleared = await page.locator('#api-key').inputValue() === '';
await page.locator('#api-key').fill('fixture-key-1');
await page.locator('dialog[open]').getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
await page.getByRole('button', { name: 'Bright Data connected', exact: true }).waitFor();
report.connection.firstConnected = true;
await page.getByRole('button', { name: 'Bright Data connected', exact: true }).click();
report.connection.reopenDraftEmpty = await page.locator('#api-key').inputValue() === '';
await page.locator('#api-key').fill('fixture-key-2');
await page.locator('dialog[open]').getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
await page.getByRole('button', { name: 'Bright Data connected', exact: true }).click();
report.connection.replacementDraftEmpty = await page.locator('#api-key').inputValue() === '';
report.connection.storageContainsFixtureKey = await page.evaluate(() => [localStorage, sessionStorage].some(s => Object.keys(s).some(k => s.getItem(k)?.includes('fixture-key-'))));
await inspect(page, 'connected-fixture', [390, 844]);
report.reducedMotion.dialog = await page.evaluate(() => ({ activeAnimations: document.getAnimations().filter(a => a.playState === 'running').length, cssAnimations: [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).animationName !== 'none').length }));
await page.getByRole('button', { name: 'Disconnect and forget key' }).click();
report.connection.disconnected = await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).count() === 1;
await page.getByRole('button', { name: 'Connect Bright Data', exact: true }).click();
report.connection.disconnectDraftEmpty = await page.locator('#api-key').inputValue() === '';
report.connection.connectFixtureCalls = connectCount;
await context.close();
await browser.close();
report.summary = { states: report.states.length, contrastFailures: report.findings.filter(f => f.type === 'contrast').length, smallTargets: report.findings.filter(f => f.type === 'target44').length, otherFailures: report.findings.filter(f => !['contrast', 'target44'].includes(f.type)).length, pageerrors: report.pageerrors.length, externalFonts: report.externalFonts.length, blockedApiCalls: report.apiRequests.filter(r => r.action === 'blocked').length, keyboardPass: report.keyboard.every(k => ['initialFocusInside', 'tabContained', 'escapeClosed', 'openerFocusRestored', 'detailEscapeClosed', 'detailOpenerFocusRestored'].every(key => k[key])), reducedMotionPass: report.reducedMotion.home.activeAnimations === 0 && report.reducedMotion.home.cssAnimations.length === 0 && report.reducedMotion.dialog.activeAnimations === 0 && report.reducedMotion.dialog.cssAnimations === 0 };
await writeFile(new URL('production-accessibility.json', evidence), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ summary: report.summary, connection: report.connection, findings: [...new Map(report.findings.map(f => [`${f.type}:${f.selector}:${f.text || f.name || ''}`, f])).values()] }, null, 2));
