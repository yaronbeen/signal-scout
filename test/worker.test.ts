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
test('connection detects active zones and returns no account data or keys', async () => {
  const response = await handleRequest(request('connect', {}), env, mock(() => reply([{ name: 'disabled', type: 'serp', status: 'disabled' }, { name: 'search', type: 'serp', status: 'active' }, { name: 'unlocker', type: 'unblocker', status: 'active' }])));
  assert.deepEqual(await response.json(), { connected: true, searchAvailable: true, searchZones: ['search'], unlockerZone: 'unlocker' });
});
test('SERP discovery detects user zone, pins query to platform and preserves organic evidence', async () => {
  let calls = 0;
  const response = await handleRequest(request('discover', { platform: 'linkedin', keywords: ['AI tools'], depth: 5 }), env, mock((url, init) => {
    calls++;
    if (url.endsWith('get_all_zones')) return reply([{ name: 'my_search', type: 'serp', status: 'active' }]);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.zone, 'my_search'); assert.ok(body.url.includes('brd_json=1')); assert.ok(decodeURIComponent(body.url).includes('site:linkedin.com/in'));
    return reply({ organic: [{ link: 'https://linkedin.com/in/maker/', title: 'Maker' }] });
  }));
  assert.equal(response.status, 200); assert.equal(calls, 2); assert.equal((await response.json()).records[0].organic.length, 1);
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
    assert.equal(searches, selected === 'working' ? 1 : 0);
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
  const huge = request('trigger', { value: 'x'.repeat(17_000) });
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
  assert.equal(response.status, 200); const data = await response.json(); assert.equal(data.records.length, 1); assert.equal(data.failures[0].keyword, 'failing');
});
