import test from 'node:test';
import assert from 'node:assert/strict';
import { currentResults, pendingJobs, recentSearches, savedCreators, savedNotes, store, storeNote } from '../src/storage';
import { sampleCreators } from '../src/sample';
const values = new Map<string, string>();
const storage = { get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: storage, configurable: true });
test('invalid saved JSON shapes are safely dropped from every browser collection', () => {
  values.clear(); store('shortlist', [{ id: 'broken', contacts: [] }, sampleCreators[0]]); store('results', ['invalid', sampleCreators[1]], true); store('history', [null, { brief: 'broken' }]); store('jobs', [{ snapshot: 'sd_valid123', createdAt: Date.now() }], true);
  assert.equal(savedCreators().length, 1); assert.equal(currentResults().length, 1); assert.equal(recentSearches().length, 0); assert.equal(pendingJobs().length, 0);
});
test('restored creators reject malformed optional display fields', () => {
  values.clear();
  const valid = { ...sampleCreators[0], sample: false, enrichmentError: 'Unavailable' };
  const records = [valid, { ...valid, enrichmentError: {} }, { ...valid, sample: 'false' }];
  store('shortlist', records); store('results', records, true);
  assert.deepEqual(savedCreators(), [valid]);
  assert.deepEqual(currentResults(), [valid]);
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
  assert.equal(storeNote('creator', 'Keep in memory'), false);
  Object.defineProperty(globalThis, 'localStorage', { value: old, configurable: true });
});
test('shortlist notes restore separately from profile snapshots and reject invalid stored values', () => {
  values.clear();
  const creator = sampleCreators[0];
  store('notes', { [creator.id]: 'Good fit', invalid: 42, oversized: 'x'.repeat(2001) });
  store('shortlist', [{ ...creator, bio: 'Freshly collected profile' }]);
  assert.deepEqual(savedNotes(), { [creator.id]: 'Good fit' });
  assert.equal(savedCreators()[0].bio, 'Freshly collected profile');
  store('notes', []); assert.deepEqual(savedNotes(), {});
  store('notes', 'bad'); assert.deepEqual(savedNotes(), {});
});
test('per-creator note writes preserve other notes and override legacy values without destructive migration', () => {
  values.clear();
  store('notes', { first: 'Legacy first', second: 'Legacy second', untouched: 'Keep legacy' });
  assert.equal(storeNote('first', 'Tab A'), true);
  assert.equal(storeNote('second', 'Tab B'), true);
  assert.deepEqual(savedNotes(), { first: 'Tab A', second: 'Tab B', untouched: 'Keep legacy' });
  assert.equal(storeNote('first', ''), true);
  assert.deepEqual(savedNotes(), { first: '', second: 'Tab B', untouched: 'Keep legacy' });
  assert.equal(storeNote('oversized', 'x'.repeat(2001)), false);
  store('note:invalid', 42);
  assert.equal(Object.hasOwn(savedNotes(), 'invalid'), false);
  store('notes', null);
  assert.deepEqual(savedNotes(), { first: '', second: 'Tab B' });
});
test('durable creator state survives discarded job references and legacy records remain unknown', () => {
  values.clear();
  const states = ['pending', 'complete', 'partial'] as const;
  const creators = states.map(profileStatus => ({ ...sampleCreators[0], sample: false, profileStatus }));
  const legacy = { ...sampleCreators[1], sample: false };
  const invalid = { ...legacy, profileStatus: 'collected' };
  store('results', [...creators, legacy, invalid], true);
  store('shortlist', [...creators, legacy, invalid]);
  store('jobs', [], true);
  assert.equal(pendingJobs().length, 0);
  for (const restored of [currentResults(), savedCreators()]) {
    assert.equal(restored.length, 4);
    assert.deepEqual(restored.slice(0, 3).map(c => c.profileStatus), states);
    assert.equal(restored[3].profileStatus, undefined);
  }
});

test('larger searches and submitted batches survive history and snapshot restoration', () => {
  values.clear();
  const configs = [5, 20, 50, 100, 250, 251, 1000].map(depth => ({brief:'AI', keywords:['AI'], platforms:['youtube'], depth}));
  store('history', configs);
  store('jobs', configs.map(config => ({platform:'youtube', stage:'enrich', snapshot:'sd_large12345', createdAt:Date.now(), config})), true);
  assert.deepEqual(recentSearches().map(c => c.depth), [5, 20, 50, 100, 250]);
  assert.deepEqual(pendingJobs().map(j => j.config.depth), [5, 20, 50, 100, 250]);
});

test('completed SERP batches restore without a snapshot while native discovery still requires one', () => {
  values.clear();
  store('jobs', ['instagram','linkedin','x','youtube','tiktok'].map(platform => ({platform,stage:'discover',snapshot:'',createdAt:Date.now(),searchOffset:6,searchRecords:[{organic:[]}],config:{brief:'AI',keywords:['AI'],platforms:[platform],depth:100}})), true);
  assert.deepEqual(pendingJobs().map(j => j.platform), ['instagram','linkedin','x']);
  assert.ok(pendingJobs().every(j => j.searchOffset === 6 && j.searchRecords?.length === 1));
});
