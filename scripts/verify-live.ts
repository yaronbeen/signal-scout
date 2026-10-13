/** Legacy discovery/profile verification. Does not exercise content-first post collection or website retrieval. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { handleRequest } from '../worker/index';
import { discoverCandidates, enrichCreators } from '../src/data';
import { platforms, type RawRecord } from '../src/types';

const secret = await readFile(`${homedir()}/.config/signal-scout/credentials.env`, 'utf8');
const key = secret.split('\n').find(s => s.startsWith('BRIGHT_DATA_API_KEY='))?.split('=').slice(1).join('=');
if (!key) throw new Error('Missing local test credentials');
const env = { ASSETS: { fetch: async () => new Response('') } };
async function request(path: string, body?: unknown) {
  const r = await handleRequest(new Request(`http://localhost/api/${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }), env);
  const data = await r.json() as Record<string, unknown>;
  if (!r.ok) throw new Error(`${r.status}: ${data.error}`);
  return data;
}
async function finish(snapshot: string): Promise<RawRecord[]> {
  const started = Date.now();
  while (Date.now() - started < 18 * 60_000) {
    const result = await request(`status?id=${snapshot}`);
    if (result.status === 'ready') {
      const data = await request(`result?id=${snapshot}`);
      if (Array.isArray(data.records)) return data.records;
    }
    if (['failed', 'canceled', 'cancelled'].includes(String(result.status))) throw new Error('Upstream collection failed');
    await new Promise(resolve => setTimeout(resolve, 12_000));
  }
  throw new Error(`Collection still pending: ${snapshot}`);
}
await mkdir('docs/live-private', { recursive: true });
console.log('CONNECT', await request('connect', {}));
const summaries = [];
for (const platform of platforms) {
 try {
  const keywords = platform === 'youtube' ? ['ai automation tutorials'] : ['AI tools'];
  let discovery: RawRecord[];
  if (platform === 'youtube' || platform === 'tiktok') {
    discovery = JSON.parse(await readFile(`docs/live-private/${platform}-discovery.json`, 'utf8'));
  } else {
    let data: Record<string, unknown> = {};
    try { discovery = JSON.parse(await readFile(`docs/live-private/${platform}-discovery.json`, 'utf8')); }
    catch {
      for (let attempt = 0; attempt < 3; attempt++) {
        try { data = await request('discover', { platform, keywords, depth: 5 }); break; }
        catch (e) { if (attempt === 2) throw e; console.log(platform, 'provider capacity unavailable; waiting before a GET-like search retry'); await new Promise(resolve => setTimeout(resolve, 60_000)); }
      }
      discovery = data.records as RawRecord[];
    }
    await writeFile(`docs/live-private/${platform}-discovery.json`, JSON.stringify(discovery, null, 2));
  }
  const candidates = discoverCandidates(platform, discovery, keywords, 5);
  console.log(platform, 'DISCOVERED', candidates.length, candidates.map(c => c.name));
  if (!candidates.length) throw new Error(`${platform}: no creator profiles discovered`);
  let snapshot: string;
  try { snapshot = JSON.parse(await readFile(`docs/live-private/${platform}-enrich-job.json`, 'utf8')).snapshot; }
  catch {
    const data = await request('trigger', { platform, stage: 'enrich', depth: 5, urls: candidates.map(c => c.url) });
    snapshot = String(data.snapshot);
    await writeFile(`docs/live-private/${platform}-enrich-job.json`, JSON.stringify({ snapshot }));
  }
  const records = await finish(snapshot);
  await writeFile(`docs/live-private/${platform}-profiles.json`, JSON.stringify(records, null, 2));
  const creators = enrichCreators(platform, records, candidates, keywords);
  await writeFile(`docs/live-private/${platform}-creators.json`, JSON.stringify(creators, null, 2));
  const summary = { platform, discovered: candidates.length, returned: records.length, errors: records.filter(r => r.error).length, publicEmails: creators.reduce((n, c) => n + c.contacts.length, 0), audienceAvailable: creators.filter(c => c.followers !== null).length, websiteAvailable: creators.filter(c => c.websites.length).length };
  if (creators.every(c => c.enrichmentError) || !records.some(r => !r.error)) throw new Error(`${platform}: no successfully correlated enriched profiles`);
  console.log(platform, 'VERIFIED', summary);
  summaries.push({ status: 'fulfilled', value: summary });
 } catch (e) { console.log(platform, 'FAILED', e); summaries.push({ status: 'rejected', reason: String(e) }); }
}
await writeFile('docs/live-private/summary.json', JSON.stringify(summaries, null, 2));
console.log(summaries.every(s => s.status === 'fulfilled') ? 'LEGACY DISCOVERY/PROFILE ADAPTER CHECKS PASSED' : 'LEGACY DISCOVERY/PROFILE CHECKS NEED ATTENTION', summaries.filter(s => s.status === 'rejected'));
console.log('Coverage: native discovery captures may be reused; hybrid SERP discovery/profile enrichment only. Content-first post collection and website retrieval are not exercised by this script. This is not an all-platform content-first verification.');
