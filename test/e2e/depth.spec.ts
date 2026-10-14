import { test, expect } from '@playwright/test';

test('100-profile search discovers, enriches and restores more than 20 creators', async ({page}) => {
  const triggers: {stage:string; depth:number; urls?:string[]}[] = [];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/connect')) return route.fulfill({json:{connected:true,metadataAvailable:true,searchAvailable:false,searchZones:[],unlockerZone:''}});
    if (url.pathname.endsWith('/trigger')) {
      const body = route.request().postDataJSON();
      triggers.push(body);
      return route.fulfill({json:{snapshot:body.stage === 'discover' ? 'sd_discover100' : 'sd_enrich100'}});
    }
    if (url.pathname.endsWith('/status')) return route.fulfill({json:{status:'ready'}});
    if (url.pathname.endsWith('/result')) return route.fulfill({json:{records:Array.from({length:100}, (_, i) => url.searchParams.get('id') === 'sd_discover100'
      ? {channel_url:`https://www.youtube.com/@maker${i}`,url:`https://www.youtube.com/watch?v=video${i}`,title:'AI tools for marketers',handle_name:`Maker ${i}`}
      : {url:`https://www.youtube.com/@maker${i}/about`,name:`Maker ${i}`,Description:'AI tools for marketers',subscribers:1000+i})}});
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();
  await page.getByLabel('Bright Data API key').fill('fake-depth-test-key');
  await page.getByRole('dialog').getByRole('button',{name:'Connect Bright Data'}).click();
  await expect(page.getByRole('button',{name:'Bright Data connected'})).toBeVisible();
  await page.getByLabel('Topic or keyword',{exact:true}).fill('AI tools');
  for (const name of ['Instagram','TikTok','LinkedIn','X']) await page.getByRole('button',{name,exact:true}).click();
  const depth = page.getByLabel('Search depth',{exact:true});
  await expect(depth.locator('option[value="250"]')).toHaveCount(1);
  await depth.selectOption('100');
  await page.getByRole('main').getByRole('button',{name:'Discover creators',exact:true}).click();
  await expect(page.locator('.creator-card')).toHaveCount(100);
  await expect(page.getByText('100 creators · 0 with public email',{exact:true})).toBeVisible();
  expect(triggers.map(t => [t.stage,t.depth,t.urls?.length])).toEqual([['discover',100,undefined],['enrich',100,100]]);
  await page.reload();
  await expect(page.locator('.creator-card')).toHaveCount(100);
  await page.getByRole('button',{name:'Edit search',exact:true}).click();
  await expect(depth).toHaveValue('100');
  expect(triggers).toHaveLength(2);
});

test('large SERP search resumes saved pages and preserves them after an unresolved later batch', async ({page}) => {
  await page.addInitScript(() => {
    const config = {brief:'AI',keywords:['AI'],platforms:['x'],depth:100};
    const searchRecords = [{organic:[{link:'https://twitter.com/firstmaker',title:'AI creator'}],keyword:'AI',searchKind:'profile'}];
    sessionStorage.setItem('signal-scout:v1:config',JSON.stringify(config));
    sessionStorage.setItem('signal-scout:v1:jobs',JSON.stringify([{platform:'x',stage:'discover',snapshot:'',createdAt:Date.now(),config,searchOffset:6,searchRecords}]));
  });
  const offsets: number[] = [];
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/connect')) return route.fulfill({json:{connected:true,metadataAvailable:true,searchAvailable:true,searchZones:['search'],unlockerZone:''}});
    if (path.endsWith('/discover')) {
      offsets.push(route.request().postDataJSON().offset);
      return route.fulfill({status:504,json:{error:'Unresolved batch'}});
    }
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();
  await page.getByLabel('Bright Data API key').fill('fake-depth-test-key');
  await page.getByRole('dialog').getByRole('button',{name:'Connect Bright Data'}).click();
  await page.getByRole('button',{name:'Resume search',exact:true}).click();
  await expect(page.getByText('Unresolved batch',{exact:true})).toBeVisible();
  expect(offsets).toEqual([6]);
  const jobs = await page.evaluate(() => JSON.parse(sessionStorage.getItem('signal-scout:v1:jobs')!));
  expect(jobs[0].stage).toBe('uncertain');
  expect(jobs[0].searchOffset).toBe(6);
  expect(jobs[0].searchRecords).toHaveLength(1);
});
