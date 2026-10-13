import {test, expect} from '@playwright/test';
import {localSetupPrompt} from '../../src/setup';

test('setup guide gives agent and human steps; visitor key clears on refresh and disconnect', async ({page, context}) => {
  let connects = 0;
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.route('**/api/**', async route => {
    expect(route.request().url()).toContain('/connect');
    expect(route.request().headers().authorization).toBe('Bearer fixture-visitor-key-only');
    connects++;
    return route.fulfill({json:{connected:true,searchAvailable:true,searchZones:['visitor-search'],unlockerZone:''}});
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Setup guide',exact:true}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading',{name:'Your Bright Data checklist'})).toBeVisible();
  await expect(dialog.getByRole('heading',{name:'For your coding agent'})).toBeVisible();
  await expect(dialog.getByRole('heading',{name:'For you: once the agent finishes'})).toBeVisible();
  await dialog.getByRole('button',{name:'Copy setup prompt'}).click();
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(localSetupPrompt);
  await expect(dialog.getByRole('link',{name:'http://localhost:8787',exact:true})).toBeVisible();
  expect(await dialog.evaluate(el=>el.scrollWidth <= el.clientWidth)).toBeTruthy();
  await page.getByRole('button',{name:'Close dialog'}).click();
  await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();
  await expect(page.getByRole('dialog').getByText(/It does not verify every product permission/)).toBeVisible();
  await page.getByLabel('Bright Data API key').fill('fixture-visitor-key-only');
  await page.getByRole('dialog').getByRole('button',{name:'Connect Bright Data'}).click();
  await expect(page.getByRole('button',{name:'Bright Data connected'})).toBeVisible();
  const storage = await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));
  expect(storage).not.toContain('fixture-visitor-key-only');
  expect(connects).toBe(1);
  await page.reload();
  await expect(page.getByRole('button',{name:'Connect Bright Data',exact:true})).toBeVisible();
  expect(connects).toBe(1);
  await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();
  await expect(page.getByLabel('Bright Data API key')).toHaveValue('');
  await page.getByLabel('Bright Data API key').fill('fixture-visitor-key-only');
  await page.getByRole('dialog').getByRole('button',{name:'Connect Bright Data'}).click();
  await page.getByRole('button',{name:'Bright Data connected'}).click();
  await page.getByRole('button',{name:'Disconnect and forget key'}).click();
  await expect(page.getByRole('button',{name:'Connect Bright Data',exact:true})).toBeVisible();
  await expect(page.getByLabel('Bright Data search zone · Instagram, LinkedIn & X')).toHaveCount(0);
  expect(connects).toBe(2);
});

test('visitor can select an account search zone without submitting or replaying paid requests', async ({page}) => {
  let searches = 0;
  await page.route('**/api/**', async route => {
    if (route.request().url().endsWith('/connect')) return route.fulfill({json:{connected:true,searchAvailable:true,searchZones:['first','working'],unlockerZone:''}});
    if (route.request().url().endsWith('/discover')) {
      searches++;
      expect(route.request().postDataJSON().searchZone).toBe('working');
      return route.fulfill({json:{records:[],failures:[]}});
    }
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();
  await page.getByLabel('Bright Data API key').fill('fixture-key-only');
  await page.getByRole('dialog').getByRole('button',{name:'Connect Bright Data'}).click();
  const zone = page.getByLabel('Bright Data search zone · Instagram, LinkedIn & X');
  await expect(zone).toHaveValue('first');
  await zone.selectOption('working');
  expect(searches).toBe(0);
  await page.getByLabel('Topic or keyword',{exact:true}).fill('ai ugc');
  for (const p of ['YouTube','TikTok','LinkedIn','X']) await page.locator('.search-panel').getByRole('button',{name:p,exact:true}).click();
  await page.getByRole('main').getByRole('button',{name:'Discover creators',exact:true}).click();
  await expect(page.locator('.progress-item.done')).toHaveCount(1);
  expect(searches).toBe(1);
});

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
  await page.getByText('New to Bright Data? Open the step-by-step setup checklist',{exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('link',{name:/Set up search/})).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('link',{name:'Check pricing'})).toBeVisible();
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
