// Developer-only contract probe. Reads credentials outside the repository; never prints them.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
const secret = await readFile(`${homedir()}/.config/signal-scout/credentials.env`, 'utf8');
const key = secret.split('\n').find(s => s.startsWith('BRIGHT_DATA_API_KEY='))?.split('=').slice(1).join('=');
if (!key) throw new Error('Missing local test credentials');
const base = 'https://api.brightdata.com/datasets/v3';
const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const searches = [
  { name: 'youtube', id: 'gd_lk56epmy2i5g7lzu0k', by: 'keyword', input: { keyword: 'ai automation tutorials', num_of_posts: '5' } },
  { name: 'tiktok', id: 'gd_lu702nij2f790tmv9h', by: 'keyword', input: { search_keyword: 'ai tools', num_of_posts: 5 } },
  ...['instagram.com', 'linkedin.com/in', 'x.com'].map(domain => ({ name: domain.split('.')[0], id: 'gd_mfz5x93lmsjjjylob', input: { url: `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} "AI" creator`)}&num=10`, start_page: 1, end_page: 1 } })),
];
await mkdir('docs/live-private', { recursive: true });
await Promise.all(searches.map(async s => {
  const query = new URLSearchParams({ dataset_id: s.id, notify: 'false', include_errors: 'true' });
  if (s.by) { query.set('type', 'discover_new'); query.set('discover_by', s.by); }
  const response = await fetch(`${base}/trigger?${query}`, { method: 'POST', headers, body: JSON.stringify({ input: [s.input], limit_per_input: 5 }) });
  const result = await response.json();
  console.log(s.name, response.status, JSON.stringify(result));
  if (!result.snapshot_id) return;
  await writeFile(`docs/live-private/${s.name}-job.json`, JSON.stringify(result));
  const start = Date.now();
  while (Date.now() - start < 15 * 60_000) {
    await new Promise(resolve => setTimeout(resolve, 15_000));
    const status = await (await fetch(`${base}/progress/${result.snapshot_id}`, { headers })).json();
    if (status.status === 'ready') {
      const data = await (await fetch(`${base}/snapshot/${result.snapshot_id}?format=json`, { headers })).json();
      await writeFile(`docs/live-private/${s.name}-discovery.json`, JSON.stringify(data, null, 2));
      console.log(s.name, 'READY', Array.isArray(data) ? data.length : data);
      return;
    }
    if (['failed', 'canceled'].includes(status.status)) { console.log(s.name, status); return; }
  }
  console.log(s.name, 'still running; snapshot saved');
}));
