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
  await page.getByLabel('Bright Data API key').fill('fixture-unsent-replacement-key');
  await page.getByRole('button',{name:'Disconnect and forget key'}).click();
  await expect(page.getByRole('button',{name:'Connect Bright Data',exact:true})).toBeVisible();
  await expect(page.getByLabel('Bright Data search zone · Instagram, LinkedIn & X')).toHaveCount(0);
  expect(connects).toBe(2);
  await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();
  await expect(page.getByLabel('Bright Data API key')).toHaveValue('');
  expect(connects).toBe(2);
});

test('restricted account metadata explains unavailable website scanning without assuming a missing zone', async ({page}) => {
  const calls: string[] = [];
  await page.route('**/api/**', route => {
    calls.push(new URL(route.request().url()).pathname);
    expect(route.request().url()).toContain('/connect');
    return route.fulfill({json:{connected:true,metadataAvailable:false,searchAvailable:false,searchZones:[],unlockerZone:''}});
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('signal-scout:v1:results', JSON.stringify([{
      id:'youtube:https://www.youtube.com/@metadata-maker', platform:'youtube',
      url:'https://www.youtube.com/@metadata-maker', name:'Metadata Maker', handle:'metadata-maker',
      bio:'AI tools', avatar:'', followers:null, location:'', verified:false,
      websites:['https://maker.example/'], contacts:[], evidence:[], matchedTerms:['AI tools'],
      collectedAt:'2026-10-13T12:00:00.000Z', profileStatus:'partial',
    }]));
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();
  await page.getByLabel('Bright Data API key').fill('fixture-restricted-key-only');
  await page.getByRole('dialog').getByRole('button',{name:'Connect Bright Data',exact:true}).click();
  await page.locator('.creator-card').getByRole('button',{name:'View details',exact:true}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button',{name:'Scan public website for email'})).toBeDisabled();
  await expect(dialog.locator('.scan-note')).toContainText('Account metadata is unavailable');
  await expect(dialog.locator('.scan-note')).toContainText('Check your key’s account-metadata permissions and reconnect');
  await expect(dialog.locator('.scan-note')).not.toContainText('Enable a Web Unlocker zone');
  await expect(dialog.getByRole('status')).toHaveCount(0);
  expect(calls).toEqual(['/api/connect']);
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
  await expect(zone).toHaveValue('');
  await page.getByLabel('Topic or keyword',{exact:true}).fill('ai ugc');
  await page.getByRole('main').getByRole('button',{name:'Discover creators',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Choose your Bright Data search zone');
  expect(searches).toBe(0);
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
  expect(await page.locator('.hero').evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(650);
  for (const width of [360, 700, 900, 1440]) {
    await page.setViewportSize({width, height:900});
    await expect(page.locator('.hero').getByRole('link', {name:'Powered by Bright Data'})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await page.locator('.hero-copy').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();
  await page.getByText('New to Bright Data? Open the step-by-step setup checklist',{exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('link',{name:/Set up search/})).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('link',{name:'Check pricing'})).toBeVisible();
});

test('supporting text meets normal-text contrast on actual workspace backgrounds', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:/Explore a sample/}).click();
  const ratios=await page.locator('.creator-bio, .card-bottom > span, .usage-summary, .results-footnote, .hero-copy > p, .card-data span:not(.small-dot)').evaluateAll(els=>{
    const rgb=(value:string)=>value.match(/[\d.]+/g)!.map(Number);
    const luminance=(channels:number[])=>channels.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    return els.map(el=>{
      let parent:Element|null=el,bg=[255,255,255];
      while(parent){const value=rgb(getComputedStyle(parent).backgroundColor);if(value.length===3||value[3]===1){bg=value;break;}parent=parent.parentElement;}
      const foreground=luminance(rgb(getComputedStyle(el).color)),background=luminance(bg);
      return (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
    });
  });
  expect(ratios.length).toBeGreaterThan(20);
  for(const ratio of ratios)expect(ratio).toBeGreaterThanOrEqual(4.5);
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
