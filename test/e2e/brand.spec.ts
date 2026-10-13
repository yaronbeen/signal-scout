import {test, expect} from '@playwright/test';

test('brand attribution, animation and setup guidance remain usable across widths', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('.hero').getByRole('link', {name:'Powered by Bright Data'})).toBeVisible();
  for (const width of [360, 700, 900, 1440]) {
    await page.setViewportSize({width, height:900});
    await expect(page.locator('.hero').getByRole('link', {name:'Powered by Bright Data'})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await page.locator('.radar-sweep').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('link',{name:/Set up search/})).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('link',{name:'Bright Data pricing'})).toBeVisible();
});

for (const outcome of ['lost response', 'origin 403', 'origin 429']) test(`${outcome} never auto-repeats paid SERP discovery after reload`, async ({page}) => {
  let searches=0;
  await page.route('**/api/**',async route => {
    if(route.request().url().endsWith('/connect')) return route.fulfill({json:{connected:true,searchAvailable:true,unlockerZone:''}});
    if(route.request().url().endsWith('/discover')) { searches++; return outcome === 'lost response' ? route.abort('failed') : route.fulfill({status:outcome === 'origin 403' ? 403 : 429,json:{error:'Origin rejected an already dispatched search.'}}); }
  });
  async function connect() {await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();await page.getByLabel('Bright Data API key').fill('fixture-key-only');await page.getByRole('dialog').getByRole('button',{name:'Connect Bright Data'}).click();await expect(page.getByRole('button',{name:'Bright Data connected'})).toBeVisible();}
  await page.goto('/');await connect();await page.getByLabel('Topic or keyword',{exact:true}).fill('AI tools');
  for(const p of ['YouTube','TikTok','LinkedIn','X']) await page.locator('.search-panel').getByRole('button',{name:p,exact:true}).click();
  await page.getByRole('main').getByRole('button',{name:'Discover creators',exact:true}).click();
  await expect(page.getByRole('button',{name:'Allow a new paid search'})).toBeVisible();
  await page.reload();await connect();await expect(page.getByRole('button',{name:'Resume search'})).toBeDisabled();expect(searches).toBe(1);
});

test('failed session persistence prevents any paid trigger', async ({page}) => {
  let triggers=0;
  await page.addInitScript(() => {const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===sessionStorage)throw new DOMException('quota','QuotaExceededError');return original.call(this,k,v);};});
  await page.route('**/api/**',async route => {
    if(route.request().url().endsWith('/connect'))return route.fulfill({json:{connected:true,searchAvailable:true,unlockerZone:''}});
    if(route.request().url().endsWith('/trigger')){triggers++;return route.fulfill({json:{snapshot:'sd_fixture12345'}});}
  });
  await page.goto('/');await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();await page.getByLabel('Bright Data API key').fill('fixture-key-only');await page.getByRole('dialog').getByRole('button',{name:'Connect Bright Data'}).click();
  await expect(page.getByRole('button',{name:'Bright Data connected'})).toBeVisible();await page.getByLabel('Topic or keyword',{exact:true}).fill('AI tools');
  for(const p of ['Instagram','TikTok','LinkedIn','X'])await page.locator('.search-panel').getByRole('button',{name:p,exact:true}).click();
  await page.getByRole('main').getByRole('button',{name:'Discover creators',exact:true}).click();
  await expect(page.getByText('Cannot safely save the job reference in this browser.',{exact:false})).toBeVisible();expect(triggers).toBe(0);
});
