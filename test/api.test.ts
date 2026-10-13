import test from 'node:test';
import assert from 'node:assert/strict';
import { api, collect, CollectionFailedError, RequestError } from '../src/api';

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
test('confirmed terminal snapshot states fail immediately without requesting results or retriggering', async () => {
  const original = globalThis.fetch;
  try {
    for (const status of ['failed', 'canceled', 'cancelled']) {
      const calls: string[] = [];
      globalThis.fetch = (async url => { calls.push(String(url)); return new Response(JSON.stringify({ status })); }) as typeof fetch;
      await assert.rejects(collect('sd_terminal123', 'fixture-key', new AbortController().signal, () => {}), CollectionFailedError);
      assert.deepEqual(calls, ['/api/status?id=sd_terminal123']);
    }
  } finally { globalThis.fetch = original; }
});
test('transient status failures remain distinct from confirmed collection failures', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'Temporary upstream failure' }), { status: 502 })) as typeof fetch;
  try {
    await assert.rejects(collect('sd_transient123', 'fixture-key', new AbortController().signal, () => {}), e => e instanceof RequestError && e.status === 502 && !(e instanceof CollectionFailedError));
  } finally { globalThis.fetch = original; }
});
