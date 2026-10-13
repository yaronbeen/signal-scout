import {test, expect, type Page} from '@playwright/test';
async function setup(page: Page) {
  await page.goto('/');
  await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();
  await page.getByLabel('Bright Data API key').fill('fixture-content-key-only');
  await page.getByRole('dialog').getByRole('button',{name:'Connect Bright Data'}).click();
  await expect(page.getByRole('button',{name:'Bright Data connected'})).toBeVisible();
  await page.getByLabel('Topic or keyword',{exact:true}).fill('Meta ads');
  for(const platform of ['YouTube','TikTok','LinkedIn','X']) await page.locator('.search-panel').getByRole('button',{name:platform,exact:true}).click();
}
const post='https://www.instagram.com/p/metapost/';
const author='https://www.instagram.com/media_buyer/';
const searchRecords=[{organic:[{link:'https://www.instagram.com/profile_only/',title:'Meta ads consultant'},{link:post,title:'Someone shares ads advice'}]}];
const postRecords=[{url:post,profile_url:author,user_posted:'media_buyer',description:'How I test Meta ads every week. Contact deals@buyer.io',date_posted:'2026-10-12'}];

test('post-only authors are discovered, enriched and ranked before search-only profiles',async({page})=>{
  const stages: string[]=[];
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/connect'))return route.fulfill({json:{connected:true,searchAvailable:true,searchZones:['working'],unlockerZone:''}});
    if(url.pathname.endsWith('/discover'))return route.fulfill({json:{records:searchRecords}});
    if(url.pathname.endsWith('/trigger')){
      const body=route.request().postDataJSON();stages.push(body.stage);
      if(body.stage==='posts'){expect(body.urls).toEqual([post]);return route.fulfill({json:{snapshot:'sd_posts12345'}});}
      expect(body.urls).toEqual([author,'https://www.instagram.com/profile_only/']);
      return route.fulfill({json:{snapshot:'sd_profiles12345'}});
    }
    if(url.pathname.endsWith('/status'))return route.fulfill({json:{status:'ready'}});
    if(url.pathname.endsWith('/result'))return route.fulfill({json:{records:url.searchParams.get('id')==='sd_posts12345'?postRecords:[{url:author,full_name:'Actual Media Buyer',biography:'Marketing practitioner',followers:12000},{url:'https://www.instagram.com/profile_only/',full_name:'Search Candidate',biography:'Consultant',followers:90000}]}});
  });
  await setup(page);
  await page.getByText('Collection limits & pricing', {exact:true}).click();
  await expect(page.getByText(/2 search pages per topic/)).toBeVisible();
  await page.getByRole('main').getByRole('button',{name:'Discover creators',exact:true}).click();
  await expect(page.locator('.progress-item.done')).toHaveCount(1);
  await expect(page.locator('.creator-card')).toHaveCount(2);
  await expect(page.locator('.creator-card').first()).toContainText('Actual Media Buyer');
  await expect(page.locator('.creator-card').first()).toContainText('1 matching post');
  expect(stages).toEqual(['posts','enrich']);
  await page.locator('.creator-card').first().getByRole('button',{name:'View details'}).click();
  await expect(page.getByText('deals@buyer.io',{exact:true})).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('link',{name:/Open evidence/}).first()).toBeVisible();
  expect(await page.getByRole('dialog').getByRole('link',{name:/Open evidence/}).evaluateAll(links=>links.map(a=>a.getAttribute('href')))).toContain(post);
});

test('uncertain post trigger survives reload and reattaches without repeating paid search or posts',async({page})=>{
  let searches=0,posts=0,enrich=0;
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/connect'))return route.fulfill({json:{connected:true,searchAvailable:true,searchZones:['working'],unlockerZone:''}});
    if(url.pathname.endsWith('/discover')){searches++;return route.fulfill({json:{records:searchRecords}});}
    if(url.pathname.endsWith('/trigger')){
      if(route.request().postDataJSON().stage==='posts'){posts++;return route.abort('failed');}
      enrich++;return route.fulfill({json:{snapshot:'sd_profiles12345'}});
    }
    if(url.pathname.endsWith('/status'))return route.fulfill({json:{status:'ready'}});
    if(url.pathname.endsWith('/result'))return route.fulfill({json:{records:url.searchParams.get('id')==='sd_recovered123'?postRecords:[{url:author,full_name:'Recovered Author',biography:'Marketing',followers:5000},{url:'https://www.instagram.com/profile_only/',full_name:'Search Candidate'}]}});
  });
  await setup(page);await page.getByRole('main').getByRole('button',{name:'Discover creators',exact:true}).click();
  await expect(page.getByRole('button',{name:'Resume search'})).toBeDisabled();
  await page.reload();await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();await page.getByLabel('Bright Data API key').fill('fixture-content-key-only');await page.getByRole('dialog').getByRole('button',{name:'Connect Bright Data'}).click();
  await page.getByRole('button',{name:'Add existing job reference'}).click();await page.getByLabel('Snapshot ID').fill('sd_recovered123');await page.getByRole('button',{name:'Save job reference'}).click();await page.getByRole('button',{name:'Resume search'}).click();
  await expect(page.locator('.progress-item.done')).toHaveCount(1);
  await expect(page.locator('.creator-card').first()).toContainText('Recovered Author');
  expect(searches).toBe(1);expect(posts).toBe(1);expect(enrich).toBe(1);
});

test('pending post snapshot resumes polling without repeating paid stages',async({page})=>{
  let ready=false;let searches=0,posts=0,enrich=0;
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/connect'))return route.fulfill({json:{connected:true,searchAvailable:true,searchZones:['working'],unlockerZone:''}});
    if(url.pathname.endsWith('/discover')){searches++;return route.fulfill({json:{records:searchRecords}});}
    if(url.pathname.endsWith('/trigger')){const stage=route.request().postDataJSON().stage;if(stage==='posts')posts++;else enrich++;return route.fulfill({json:{snapshot:stage==='posts'?'sd_posts12345':'sd_profiles12345'}});}
    if(url.pathname.endsWith('/status'))return route.fulfill({json:{status:ready?'ready':'running'}});
    if(url.pathname.endsWith('/result'))return route.fulfill({json:{records:url.searchParams.get('id')==='sd_posts12345'?postRecords:[{url:author,full_name:'Resumed Author'},{url:'https://www.instagram.com/profile_only/',full_name:'Other'}]}});
  });
  await setup(page);await page.getByRole('main').getByRole('button',{name:'Discover creators',exact:true}).click();
  await expect(page.getByText('Bright Data is collecting content evidence…')).toBeVisible();await page.getByRole('button',{name:'Pause search'}).click();await expect(page.getByRole('button',{name:'Resume search'})).toBeVisible();
  await page.reload();await page.getByRole('button',{name:'Connect Bright Data',exact:true}).click();await page.getByLabel('Bright Data API key').fill('fixture-content-key-only');await page.getByRole('dialog').getByRole('button',{name:'Connect Bright Data'}).click();
  ready=true;await page.getByRole('button',{name:'Resume search'}).click();await expect(page.locator('.progress-item.done')).toHaveCount(1);
  expect(searches).toBe(1);expect(posts).toBe(1);expect(enrich).toBe(1);
});

test('terminal post failure enriches preserved profiles without repeating paid discovery',async({page})=>{
  let searches=0,posts=0,enrich=0;
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/connect'))return route.fulfill({json:{connected:true,searchAvailable:true,searchZones:['working'],unlockerZone:''}});
    if(url.pathname.endsWith('/discover')){searches++;return route.fulfill({json:{records:searchRecords}});}
    if(url.pathname.endsWith('/trigger')){
      const body=route.request().postDataJSON();
      if(body.stage==='posts'){posts++;return route.fulfill({json:{snapshot:'sd_failedposts'}});}
      enrich++;expect(body.urls).toEqual(['https://www.instagram.com/profile_only/']);
      return route.fulfill({json:{snapshot:'sd_fallbackprofiles'}});
    }
    if(url.pathname.endsWith('/status'))return route.fulfill({json:{status:url.searchParams.get('id')==='sd_failedposts'?'failed':'ready'}});
    if(url.pathname.endsWith('/result'))return route.fulfill({json:{records:[{url:'https://www.instagram.com/profile_only/',full_name:'Preserved Consultant',biography:'Meta ads consulting',followers:15000}]}});
  });
  await setup(page);await page.getByRole('main').getByRole('button',{name:'Discover creators',exact:true}).click();
  await expect(page.locator('.progress-item.done')).toHaveCount(1);
  await expect(page.locator('.creator-card').first()).toContainText('Preserved Consultant');
  await expect(page.locator('.progress-item.done')).toContainText('Post collection failed; discovered profiles preserved');
  expect(searches).toBe(1);expect(posts).toBe(1);expect(enrich).toBe(1);
});

test('transient post polling failure keeps the snapshot and resumes without retriggering',async({page})=>{
  let fail=true,searches=0,posts=0,enrich=0;
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/connect'))return route.fulfill({json:{connected:true,searchAvailable:true,searchZones:['working'],unlockerZone:''}});
    if(url.pathname.endsWith('/discover')){searches++;return route.fulfill({json:{records:searchRecords}});}
    if(url.pathname.endsWith('/trigger')){const stage=route.request().postDataJSON().stage;if(stage==='posts')posts++;else enrich++;return route.fulfill({json:{snapshot:stage==='posts'?'sd_posts12345':'sd_profiles12345'}});}
    if(url.pathname.endsWith('/status')){
      if(fail)return route.abort('failed');
      return route.fulfill({json:{status:'ready'}});
    }
    if(url.pathname.endsWith('/result'))return route.fulfill({json:{records:url.searchParams.get('id')==='sd_posts12345'?postRecords:[{url:author,full_name:'Recovered Network Author'},{url:'https://www.instagram.com/profile_only/',full_name:'Other'}]}});
  });
  await setup(page);await page.getByRole('main').getByRole('button',{name:'Discover creators',exact:true}).click();
  await expect(page.locator('.progress-item.error')).toHaveCount(1);expect(enrich).toBe(0);
  const job=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('signal-scout:v1:jobs')!)[0]);expect(job.stage).toBe('posts');expect(job.snapshot).toBe('sd_posts12345');
  fail=false;await page.getByRole('button',{name:'Resume search'}).click();await expect(page.locator('.progress-item.done')).toHaveCount(1);
  await expect(page.locator('.creator-card').first()).toContainText('Recovered Network Author');
  expect(searches).toBe(1);expect(posts).toBe(1);expect(enrich).toBe(1);
});
