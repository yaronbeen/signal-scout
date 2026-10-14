import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionPlan, handleRequest, publicWebsite } from '../worker/index';

const env = { ASSETS: { fetch: async () => new Response('<html>app</html>') } };
const token = 'fake-key-for-tests-only';
function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://scout.test/api/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
}
function mock(fn: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof fetch { return ((url: string | URL | Request, init?: RequestInit) => Promise.resolve(fn(String(url), init))) as typeof fetch; }
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

test('health and assets provide security headers', async () => {
  const health = await handleRequest(request('health'), env);
  assert.equal(health.status, 200); assert.equal((await health.json()).ok, true); assert.equal(health.headers.get('cache-control'), 'no-store');
  const asset = await handleRequest(new Request('https://scout.test/'), env);
  assert.ok(asset.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));
});
test('rejects unauthorized, cross-origin and invalid methods before upstream access', async () => {
  let called = false; const fetcher = mock(() => { called = true; return reply({}); });
  assert.equal((await handleRequest(new Request('https://scout.test/api/status?id=sd_valid123'), env, fetcher)).status, 401);
  assert.equal((await handleRequest(request('trigger', {}, { Origin: 'https://evil.test' }), env, fetcher)).status, 403);
  assert.equal((await handleRequest(request('trigger'), env, fetcher)).status, 405);
  assert.equal(called, false);
});
test('enforces depth, term limits, platform URL identity and allowed collection stages', () => {
  assert.throws(() => collectionPlan({ platform: 'youtube', stage: 'discover', keywords: ['x'], depth: 1000 }));
  assert.throws(() => collectionPlan({ platform: 'youtube', stage: 'discover', keywords: ['a', 'b', 'c', 'd'], depth: 5 }));
  assert.throws(() => collectionPlan({ platform: 'instagram', stage: 'enrich', urls: ['https://evil.test/'], depth: 5 }));
  assert.throws(() => collectionPlan({ platform: 'youtube', stage: 'unknown', depth: 5 }));
});
test('trigger sends official bounded object schema and forwards visitor key only to Bright Data', async () => {
  const response = await handleRequest(request('trigger', { platform: 'tiktok', stage: 'discover', keywords: ['AI tools'], depth: 5 }), env, mock((url, init) => {
    assert.ok(url.startsWith('https://api.brightdata.com/datasets/v3/trigger?'));
    assert.ok(url.includes('discover_by=keyword'));
    assert.equal((init?.headers as Record<string, string>).Authorization, `Bearer ${token}`);
    assert.deepEqual(JSON.parse(String(init?.body)), { input: [{ search_keyword: 'AI tools', num_of_posts: 5 }], limit_per_input: 5 });
    return reply({ snapshot_id: 'sd_valid123' });
  }));
  assert.deepEqual(await response.json(), { snapshot: 'sd_valid123' });
});
test('YouTube native keyword discovery uses its dataset and string post counts at every supported depth', async () => {
  for (const depth of [5, 10, 20, 50, 100, 250]) {
    let calls = 0;
    const response = await handleRequest(request('trigger', { platform: 'youtube', stage: 'discover', keywords: ['AI tools', 'Meta ads'], depth }), env, mock((target, init) => {
      calls++;
      const url = new URL(target);
      assert.equal(url.origin, 'https://api.brightdata.com');
      assert.equal(url.pathname, '/datasets/v3/trigger');
      assert.equal(url.searchParams.get('dataset_id'), 'gd_lk56epmy2i5g7lzu0k');
      assert.equal(url.searchParams.get('type'), 'discover_new');
      assert.equal(url.searchParams.get('discover_by'), 'keyword');
      assert.equal(url.searchParams.get('include_errors'), 'true');
      assert.deepEqual(JSON.parse(String(init?.body)), { input: [{ keyword: 'AI tools', num_of_posts: String(depth) }, { keyword: 'Meta ads', num_of_posts: String(depth) }], limit_per_input: depth });
      return reply({ snapshot_id: 'sd_youtube123' });
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { snapshot: 'sd_youtube123' });
    assert.equal(calls, 1);
  }
});
test('all five profile triggers pin datasets, canonical inputs and one-row limits without discovery expansion', async () => {
  const fixtures = [
    { platform: 'youtube', url: 'https://youtube.com/@Maker/videos?tracking=1', input: { url: 'https://www.youtube.com/@maker/about' }, dataset: 'gd_lk538t2k2p1k3oos71' },
    { platform: 'instagram', url: 'https://instagram.com/Maker?tracking=1', input: { url: 'https://www.instagram.com/maker/' }, dataset: 'gd_l1vikfch901nx3by4' },
    { platform: 'tiktok', url: 'https://tiktok.com/@Maker', input: { url: 'https://www.tiktok.com/@maker' }, dataset: 'gd_l1villgoiiidt09ci' },
    { platform: 'linkedin', url: 'https://uk.linkedin.com/in/Maker/', input: { url: 'https://www.linkedin.com/in/maker/' }, dataset: 'gd_l1viktl72bvl7bjuj0' },
    { platform: 'x', url: 'https://twitter.com/Maker', input: { url: 'https://x.com/maker', max_number_of_posts: 3 }, dataset: 'gd_lwxmeb2u1cniijd7t4' },
  ];
  for (const fixture of fixtures) {
    for (const depth of [5, 10, 20, 50, 100, 250]) {
      const response = await handleRequest(request('trigger', { platform: fixture.platform, stage: 'enrich', urls: [fixture.url, fixture.url], depth }), env, mock((target, init) => {
        const url = new URL(target);
        assert.equal(url.searchParams.get('dataset_id'), fixture.dataset);
        assert.equal(url.searchParams.has('type'), false);
        assert.equal(url.searchParams.has('discover_by'), false);
        assert.equal((init?.headers as Record<string, string>).Authorization, `Bearer ${token}`);
        assert.deepEqual(JSON.parse(String(init?.body)), { input: [fixture.input], limit_per_input: 1 });
        return reply({ snapshot_id: 'sd_profile123' });
      }));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { snapshot: 'sd_profile123' });
    }
    for (const urls of [[], Array(6).fill(fixture.url), ['https://evil.test/maker']]) {
      let dispatched = false;
      const response = await handleRequest(request('trigger', { platform: fixture.platform, stage: 'enrich', urls, depth: 5 }), env, mock(() => { dispatched = true; return reply({}); }));
      assert.equal(response.status, 400);
      assert.equal(dispatched, false);
    }
  }
});
test('post collectors constrain platform URLs, dataset and paid row limits', async () => {
  for(const [platform,url,dataset] of [['instagram','https://instagram.com/p/abc','gd_lk5ns7kz21pck8jpis'],['linkedin','https://linkedin.com/posts/author-activity-123','gd_lyy3tktm25m4avu764'],['x','https://twitter.com/maker/status/123','gd_lwxkxvnf1cynvib9co']]) {
    const response=await handleRequest(request('trigger',{platform,stage:'posts',urls:[url],depth:5}),env,mock((target,init)=>{
      assert.ok(target.includes(`dataset_id=${dataset}`));const body=JSON.parse(String(init?.body));assert.equal(body.limit_per_input,1);assert.equal(body.input.length,1);return reply({snapshot_id:'sd_posts12345'});
    }));assert.equal(response.status,200);
  }
  for(const urls of [['https://evil.test/p/abc'],Array(6).fill('https://instagram.com/p/abc')])assert.throws(()=>collectionPlan({platform:'instagram',stage:'posts',urls,depth:5}));
});
test('connection detects active zones and returns no account data or keys', async () => {
  const response = await handleRequest(request('connect', {}), env, mock(() => reply([{ name: 'disabled', type: 'serp', status: 'disabled' }, { name: 'search', type: 'serp', status: 'active' }, { name: 'unlocker', type: 'unblocker', status: 'active' }])));
  assert.deepEqual(await response.json(), { connected: true, metadataAvailable: true, searchAvailable: true, searchZones: ['search'], unlockerZone: 'unlocker' });
});
test('connect distinguishes restricted metadata from a known empty zone list without any paid checks', async () => {
  for (const status of [200, 403]) {
    const calls: string[] = [];
    const response = await handleRequest(request('connect', {}), env, mock(url => {
      calls.push(url);
      return status === 403 ? reply({ error: 'Restricted fixture account metadata' }, 403) : reply([]);
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { connected: true, metadataAvailable: status !== 403, searchAvailable: false, searchZones: [], unlockerZone: '' });
    assert.deepEqual(calls, ['https://api.brightdata.com/zone/get_all_zones']);
  }
  const invalid = await handleRequest(request('connect', {}), env, mock(() => reply({ error: 'Invalid key' }, 401)));
  assert.equal(invalid.status, 401);
});
test('SERP discovery detects user zone, pins query to platform and preserves organic evidence', async () => {
  let calls = 0;
  const response = await handleRequest(request('discover', { platform: 'linkedin', keywords: ['AI tools'], depth: 5 }), env, mock((url, init) => {
    calls++;
    if (url.endsWith('get_all_zones')) return reply([{ name: 'my_search', type: 'serp', status: 'active' }]);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.zone, 'my_search'); assert.ok(body.url.includes('brd_json=1')); assert.ok(decodeURIComponent(body.url).includes('site:linkedin.com')); assert.ok(!decodeURIComponent(body.url).includes(' creator'));
    return reply({ organic: [{ link: 'https://linkedin.com/in/maker/', title: 'Maker' }] });
  }));
  assert.equal(response.status, 200); assert.equal(calls, 3); const data = await response.json(); assert.equal(data.records[0].organic.length, 1); assert.deepEqual(data.records.map((r: {searchKind:string})=>r.searchKind),['profile','content']);
});
test('missing SERP entitlement has an actionable partial-results error', async () => {
  const response = await handleRequest(request('discover', { platform: 'x', keywords: ['AI'], depth: 5 }), env, mock(() => reply([])));
  assert.equal(response.status, 409); assert.match((await response.json()).error, /YouTube and TikTok can still run/);
});
test('selected search zone must belong to the visitor account and never falls back or retries', async () => {
  for (const selected of ['working', 'disabled', 'someone_else']) {
    let searches = 0;
    const response = await handleRequest(request('discover', { platform: 'instagram', keywords: ['ai ugc'], depth: 5, searchZone: selected }), env, mock((url, init) => {
      if (url.endsWith('get_all_zones')) return reply([{name:'first',type:'serp',status:'active'}, {name:'working',type:'serp',status:'active'}, {name:'disabled',type:'serp',status:'disabled'}]);
      searches++;
      assert.equal(JSON.parse(String(init?.body)).zone, 'working');
      return reply({organic:[]});
    }));
    assert.equal(response.status, selected === 'working' ? 200 : 409);
    assert.equal(searches, selected === 'working' ? 2 : 0);
  }
});
test('origin error identifies the selected zone without exposing raw provider content', async () => {
  const response = await handleRequest(request('discover', {platform:'x',keywords:['ai ugc'],depth:5,searchZone:'search'}), env, mock(url => url.endsWith('get_all_zones') ? reply([{name:'search',type:'serp',status:'active'}]) : reply({status_code:403,body:'SECRET_TOKEN '+token})));
  assert.equal(response.status, 403);
  const body = await response.text();
  assert.match(body, /Search zone.*search/);
  assert.match(body, /origin HTTP 403/);
  assert.ok(!body.includes(token));
  assert.ok(!body.includes('SECRET_TOKEN'));
});
test('multiple active search zones require an explicit choice before paid dispatch', async () => {
  let searches = 0;
  const response = await handleRequest(request('discover', {platform:'instagram',keywords:['ai ugc'],depth:5}), env, mock(url => {
    if (url.endsWith('get_all_zones')) return reply([{name:'first',type:'serp',status:'active'}, {name:'second',type:'serp',status:'active'}]);
    searches++; return reply({organic:[]});
  }));
  assert.equal(response.status,409);
  assert.match((await response.json()).error,/Multiple active search zones/);
  assert.equal(searches,0);
});
test('status rejects arbitrary paths and result treats eventual-consistency response as pending', async () => {
  const invalid = await handleRequest(request('status?id=../../secrets'), env, mock(() => { throw new Error('must not fetch'); }));
  assert.equal(invalid.status, 400);
  const pending = await handleRequest(request('result?id=sd_valid123'), env, mock(() => reply({ snapshot_id: 'sd_valid123' })));
  assert.equal(pending.status, 202); assert.deepEqual(await pending.json(), { pending: true });
});
test('upstream errors never leak returned credentials or raw internal bodies', async () => {
  for (const status of [400, 401, 402, 403, 429, 500]) {
    const response = await handleRequest(request('status?id=sd_valid123'), env, mock(() => new Response('SECRET_TOKEN ' + token, { status })));
    const source = await response.text(); assert.ok(!source.includes(token)); assert.ok(!source.includes('SECRET_TOKEN')); assert.ok(response.status >= 400);
  }
});
test('website scanning only delegates public HTTPS targets to Bright Data, never direct server fetching', async () => {
  for (const url of ['http://maker.io/', 'https://127.0.0.1/', 'https://[::1]/', 'https://169.254.169.254/', 'https://metadata.google.internal/', 'https://localhost/', 'https://maker.local/', 'https://maker.io:8080/', 'https://u:p@maker.io/']) assert.throws(() => publicWebsite(url), url);
  const response = await handleRequest(request('contact', { url: 'https://maker.io/', zone: 'unlocker' }), env, mock((url, init) => {
    assert.equal(url, 'https://api.brightdata.com/request'); assert.equal(JSON.parse(String(init?.body)).url, 'https://maker.io/');
    return new Response('<p>Contact hello@maker.io</p>');
  }));
  assert.equal((await response.json()).contacts[0].sourceUrl, 'https://maker.io/');
});
test('oversized bodies and rate limits are rejected without collection', async () => {
  const huge = request('trigger', { value: 'x'.repeat(129_000) });
  assert.equal((await handleRequest(huge, env, mock(() => reply({})))).status, 502);
  const limited = await handleRequest(request('connect', {}), { ...env, API_LIMITER: { limit: async () => ({ success: false }) } }, mock(() => reply({})));
  assert.equal(limited.status, 429);
});

test('SERP origin envelope is decoded and origin errors behind HTTP 200 are detected', async () => {
  for (const originStatus of [200, 502]) {
    const response = await handleRequest(request('discover', { platform: 'x', keywords: ['AI'], depth: 5 }), env, mock(url => url.endsWith('get_all_zones') ? reply([{ name: 'search', type: 'serp', status: 'active' }]) : reply({ status_code: originStatus, body: JSON.stringify({ organic: [{ link: 'https://x.com/maker', title: 'AI creator' }] }) })));
    assert.equal(response.status, originStatus === 200 ? 200 : 502);
    if (originStatus === 200) assert.equal((await response.json()).records[0].organic.length, 1);
  }
});
test('one failed SERP term preserves paid successful keyword evidence', async () => {
  const response = await handleRequest(request('discover', { platform: 'x', keywords: ['AI', 'failing'], depth: 5 }), env, mock((url, init) => {
    if (url.endsWith('get_all_zones')) return reply([{ name: 'search', type: 'serp', status: 'active' }]);
    const b = JSON.parse(String(init?.body));
    return b.url.includes('failing') ? reply({ status_code: 502, body: '' }) : reply({ organic: [{ link: 'https://x.com/maker', title: 'AI creator' }] });
  }));
  assert.equal(response.status, 200); const data = await response.json(); assert.equal(data.records.length, 2); assert.equal(data.failures[0].keyword, 'failing');
});

test('large SERP searches paginate distinct URLs and preserve successful pages within the request budget', async () => {
  for (const platform of ['instagram', 'linkedin', 'x']) {
    for (const [depth, keywords, pages] of [[100, ['AI'], 5], [250, ['AI'], 13], [250, ['AI', 'ads', 'tools'], 8]] as const) {
      const targets: string[] = [];
      const fetcher = mock((url, init) => {
        if (url.endsWith('get_all_zones')) return reply([{name:'search',type:'serp',status:'active'}]);
        const target = JSON.parse(String(init?.body)).url;
        targets.push(target);
        const page = Number(new URL(target).searchParams.get('start')) / 10;
        return page === 1 ? reply({status_code:502,body:''}) : reply({organic:[]});
      });
      let offset: number | null = 0;
      const data: {records:{searchPage:number}[]; failures:{page:number}[]} = {records:[],failures:[]};
      while (offset !== null) {
        const before = targets.length;
        const response = await handleRequest(request('discover', {platform, keywords, depth, offset}), env, fetcher);
        assert.equal(response.status, 200);
        assert.ok(targets.length - before <= 6);
        const batch = await response.json();
        data.records.push(...batch.records);
        data.failures.push(...batch.failures);
        offset = batch.nextOffset;
      }
      assert.equal(targets.length, 2 * keywords.length * pages);
      assert.equal(new Set(targets).size, targets.length);
      assert.ok(targets.length <= 48);
      assert.equal(data.failures.length, 2 * keywords.length);
      assert.ok(data.failures.every((f: {page:number}) => f.page === 2));
      assert.equal(data.records.length, targets.length - data.failures.length);
      assert.equal(Math.max(...data.records.map((r: {searchPage:number}) => r.searchPage)), pages);
    }
  }
});

test('large native snapshots stream past 8 MB without retaining unused video payloads or retriggering', async () => {
  let calls = 0;
  const records = Array.from({length:100}, (_, i) => ({url:`https://youtube.com/watch?v=${i}`,channel_url:`https://www.youtube.com/@maker${i}`,title:'AI tools',description:'Contact hello@maker.io',transcript:'x'.repeat(90_000)}));
  const raw = records.map(r => JSON.stringify(r)).join('\n');
  assert.ok(raw.length > 8_000_000);
  const response = await handleRequest(request('result?id=sd_large12345'), env, mock(url => {
    calls++;
    assert.ok(url.includes('/snapshot/sd_large12345?format=ndjson'));
    return new Response(new ReadableStream({start(controller) {
      for (let i = 0; i < raw.length; i += 64_000) controller.enqueue(new TextEncoder().encode(raw.slice(i, i + 64_000)));
      controller.close();
    }}));
  }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.records.length, 100);
  assert.equal(data.records[99].channel_url, records[99].channel_url);
  assert.equal(data.records[0].description, 'Contact hello@maker.io');
  assert.equal(data.records[0].transcript, undefined);
  assert.equal(calls, 1);
});

test('snapshot control objects remain pending across formatting, newlines and stream boundaries', async () => {
  for (const raw of ['{"snapshot_id":"sd_valid123"}', '{"snapshot_id":"sd_valid123"}\n', '{\n  "snapshot_id": "sd_valid123"\n}\n', '{"status":"running"}\n']) {
    const response = await handleRequest(request('result?id=sd_valid123'), env, mock(() => new Response(new ReadableStream({start(controller) {
      for (const char of raw) controller.enqueue(new TextEncoder().encode(char));
      controller.close();
    }}))));
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), {pending:true});
  }
});

test('large profile and post batches fit the relay and reject over-depth input before paid dispatch', async () => {
  const urls = Array.from({length:250}, (_, i) => `https://www.linkedin.com/in/creator-${i}-${'a'.repeat(80)}/`);
  for (const [stage, batch] of [['enrich', urls], ['posts', urls.map((_, i) => `https://www.linkedin.com/posts/creator-${i}-${'a'.repeat(80)}-activity-${i}`)]] as const) {
    assert.ok(JSON.stringify(batch).length > 16_000);
    let calls = 0;
    const fetcher = mock((_, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.input.length, 250);
      assert.equal(body.limit_per_input, 1);
      return reply({snapshot_id:'sd_large12345'});
    });
    assert.equal((await handleRequest(request('trigger', {platform:'linkedin', stage, depth:250, urls:batch}), env, fetcher)).status, 200);
    assert.equal((await handleRequest(request('trigger', {platform:'linkedin', stage, depth:100, urls:batch}), env, fetcher)).status, 400);
    assert.equal(calls, 1);
  }
  for (const depth of [0, 21, 251, 1000, 100.5, '100', null]) {
    let calls = 0;
    assert.equal((await handleRequest(request('discover', {platform:'x', keywords:['AI'], depth}), env, mock(() => { calls++; return reply({}); }))).status, 400);
    assert.equal(calls, 0);
  }
});
