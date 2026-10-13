import test from 'node:test';
import assert from 'node:assert/strict';
import { api, RequestError } from '../src/api';

test('malformed successful responses are ambiguous failures rather than success values', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response('{"snapshot":', { status: 200 })) as typeof fetch;
  try { await assert.rejects(api('trigger', 'fixture-key', {}), e => e instanceof RequestError && e.status === 0); }
  finally { globalThis.fetch = original; }
});
test('every browser request has a bounded abort signal even without a caller signal', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => { assert.ok(init?.signal instanceof AbortSignal); return new Response('{"ok":true}'); }) as typeof fetch;
  try { assert.deepEqual(await api('connect', 'fixture-key', {}), { ok: true }); }
  finally { globalThis.fetch = original; }
});
