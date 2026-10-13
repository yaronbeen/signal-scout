import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { localSetupPrompt } from '../src/setup';

test('published local handoff matches the app prompt and preserves visitor-owned setup', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const published = readme.match(/```text\n([\s\S]*?)\n```/)?.[1];
  assert.equal(published, localSetupPrompt, 'The README and copied in-app instructions must not diverge');
  for (const instruction of [
    'Node.js 22+', 'npm ci', 'npm run check', 'persistent process',
    'http://localhost:8787/api/health', 'Web Scraper API access',
    'SERP API zone', 'enter my key only in the app', 'working search zone',
    'connecting checks account metadata', 'separately billed post or profile collection',
    'Current results and job references last for this browser tab',
    'Do not request my key in chat', 'No Cloudflare login is needed locally',
  ]) assert.ok(localSetupPrompt.includes(instruction), `Missing handoff requirement: ${instruction}`);
});
