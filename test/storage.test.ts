import test from 'node:test';
import assert from 'node:assert/strict';
import { currentResults, pendingJobs, recentSearches, savedCreators, store } from '../src/storage';
import { sampleCreators } from '../src/sample';
const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: storage, configurable: true });
test('invalid saved JSON shapes are safely dropped from every browser collection', () => {
  values.clear(); store('shortlist', [{ id: 'broken', contacts: [] }, sampleCreators[0]]); store('results', ['invalid', sampleCreators[1]], true); store('history', [null, { brief: 'broken' }]); store('jobs', [{ snapshot: 'sd_valid123', createdAt: Date.now() }], true);
  assert.equal(savedCreators().length, 1); assert.equal(currentResults().length, 1); assert.equal(recentSearches().length, 0); assert.equal(pendingJobs().length, 0);
});
test('ready, submitted and uncertain jobs restore without credentials and remain until explicitly discarded', () => {
  values.clear(); const config = { brief: 'AI', keywords: ['AI'], platforms: ['youtube'], depth: 5 };
  store('jobs', ['ready', 'uncertain', 'enrich'].map(stage => ({ platform: 'youtube', stage, snapshot: stage === 'enrich' ? 'sd_valid123' : '', createdAt: Date.now(), candidates: [sampleCreators[0]], config })), true);
  assert.equal(pendingJobs().length, 3);
  store('jobs', [{ platform: 'youtube', stage: 'enrich', snapshot: 'sd_old123', createdAt: 0, config }], true);
  assert.equal(pendingJobs().length, 1);
});
test('blocked storage returns failure instead of throwing', () => {
  const old = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', { value: { setItem: () => { throw new Error('quota'); } }, configurable: true });
  assert.equal(store('shortlist', sampleCreators), false);
  Object.defineProperty(globalThis, 'localStorage', { value: old, configurable: true });
});
