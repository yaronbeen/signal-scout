import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalProfile, discoverCandidates, enrichCreators, extractEmails, mergeCreators, number, toCsv, websiteContacts } from '../src/data';
import { sampleCreators } from '../src/sample';

test('canonical identities deduplicate profiles and reject non-profile and deceptive URLs', () => {
  assert.equal(canonicalProfile('youtube', 'https://www.youtube.com/@Maker/about?x=1'), 'https://www.youtube.com/@maker');
  assert.equal(canonicalProfile('tiktok', 'https://www.tiktok.com/@Maker/video/123'), 'https://www.tiktok.com/@maker');
  assert.equal(canonicalProfile('linkedin', 'https://uk.linkedin.com/in/Maker'), 'https://www.linkedin.com/in/maker/');
  assert.equal(canonicalProfile('x', 'https://twitter.com/Maker/status/123'), 'https://x.com/maker');
  const credentialed = new URL('https://instagram.com/maker/');
  credentialed.username = 'fixture-user'; credentialed.password = 'fixture-password';
  for (const url of ['https://instagram.com/p/abc/', 'https://instagram.com/explore/', 'https://instagram.com.evil.test/maker/', 'javascript:alert(1)', credentialed.href]) assert.equal(canonicalProfile('instagram', url), '');
  assert.equal(canonicalProfile('x', 'https://x.com/search?q=AI'), '');
});
test('emails support public obfuscation, remove false positives, and deduplicate', () => {
  assert.deepEqual(extractEmails('hello@maker.io HELLO@maker.io yvh (at) partners.com me [at] maker [dot] co avatar@2x.png noreply@maker.io test@example.com'), ['hello@maker.io', 'yvh@partners.com', 'me@maker.co']);
});
test('unknown, zero, malformed and compact follower counts remain distinct', () => {
  assert.equal(number(undefined), null); assert.equal(number(''), null); assert.equal(number('500+'), null);
  assert.equal(number(0), 0); assert.equal(number('84.2K'), 84200); assert.equal(number('1,042,000'), 1042000);
});
test('native content discovery deduplicates and preserves contact provenance', () => {
  const records = [
    { channel_url: 'https://youtube.com/@maker', url: 'https://youtube.com/watch?v=1', title: 'AI workflows', description: 'Business: hello@maker.io', subscribers: 1000 },
    { channel_url: 'https://youtube.com/@maker/about', url: 'https://youtube.com/watch?v=2', title: 'Automation guide' },
    { error: 'dead_page' },
  ];
  const result = discoverCandidates('youtube', records, ['AI workflows'], 5);
  assert.equal(result.length, 1); assert.equal(result[0].evidence.length, 2); assert.equal(result[0].contacts[0].sourceUrl, records[0].url);
});
test('search discovery rejects post-only Instagram URLs and does not attribute snippet emails', () => {
  const result = discoverCandidates('instagram', [{ organic: [
    { link: 'https://instagram.com/p/abc', title: 'AI creator' },
    { link: 'https://instagram.com/maker/', title: 'Maker', description: 'AI workflows hello@unrelated.io' },
  ] }], ['AI workflows'], 5);
  assert.equal(result.length, 1); assert.equal(result[0].contacts.length, 0); assert.deepEqual(result[0].matchedTerms, ['AI workflows']);
});
test('enrichment handles real profile schemas, errors, source links and missing metrics', () => {
  const candidates = discoverCandidates('instagram', [{ organic: [{ link: 'https://instagram.com/maker/', title: 'Maker' }, { link: 'https://instagram.com/other/', title: 'Other' }] }], ['AI'], 5);
  const profiles = [{ url: 'https://instagram.com/maker/', full_name: 'Maker Person', biography: 'AI builder contact@maker.io', external_url: [{ url: 'https://maker.io/contact' }], followers: 0, is_verified: true }, { url: 'https://instagram.com/other/', error: 'dead_page' }];
  const result = enrichCreators('instagram', profiles, candidates, ['AI']);
  assert.equal(result[0].name, 'Maker Person'); assert.equal(result[0].followers, 0); assert.equal(result[0].contacts[0].sourceUrl, result[0].url); assert.deepEqual(result[0].websites, ['https://maker.io/contact']);
  assert.ok(result[1].enrichmentError); assert.equal(result[1].followers, null);
});
test('CSV protects spreadsheet formulas and includes source provenance and sample labels', () => {
  const creator = { ...sampleCreators[0], name: '=HYPERLINK("bad")', bio: 'A, quote " and\nnewline', followers: null };
  const csv = toCsv([creator]);
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"')); assert.ok(csv.includes('A, quote "" and\nnewline'));
  assert.ok(csv.includes('email_source')); assert.ok(csv.endsWith('"yes"'));
});
test('website extraction excludes tracking scripts but keeps visible email and mailto', () => {
  const result = websiteContacts('<script>var x="dev@tracker.com"</script><p>hello@maker.io</p><a href="mailto:book@maker.io">Contact</a>', 'https://maker.io/');
  assert.deepEqual(result.map(c => c.email), ['hello@maker.io', 'book@maker.io']);
});

test('a fallback search snippet can never be relabeled as profile email evidence', () => {
  const candidates = discoverCandidates('instagram', [{ organic: [{ link: 'https://instagram.com/maker/', title: 'AI Maker', description: 'Mentioned competitor unrelated@competitor.io' }] }], ['AI'], 5);
  const result = enrichCreators('instagram', [{ url: 'https://instagram.com/maker/', followers: 100 }], candidates, ['AI']);
  assert.equal(result[0].contacts.length, 0);
  assert.equal(result[0].evidence.filter(e => e.kind === 'profile').length, 0);
  assert.deepEqual(result[0].matchedTerms, ['AI']);
});
test('returned case changes, resolved aliases, missing rows and errors are correlated honestly', () => {
  const candidates = discoverCandidates('youtube', [
    { channel_url: 'https://youtube.com/@Maker', url: 'https://youtube.com/watch?v=1', handle_name: 'Maker' },
    { channel_url: 'https://youtube.com/channel/CaseSensitiveID', url: 'https://youtube.com/watch?v=2', handle_name: 'Other' },
    { channel_url: 'https://youtube.com/@missing', url: 'https://youtube.com/watch?v=3', handle_name: 'Missing' },
  ], ['AI'], 5);
  const result = enrichCreators('youtube', [
    { url: 'https://youtube.com/@MAKER/about', name: 'Maker Updated', subscribers: 10, Links: ['maker.io/contact'] },
    { url: 'https://youtube.com/@resolved', input_url: 'https://youtube.com/channel/CaseSensitiveID', error: 'dead_page' },
  ], candidates, ['AI']);
  assert.equal(result[0].name, 'Maker Updated'); assert.equal(result[0].enrichmentError, undefined);
  assert.deepEqual(result[0].websites, ['https://maker.io/contact']);
  assert.ok(result[1].enrichmentError); assert.ok(result[2].enrichmentError);
});
test('later enrichment preserves independently scanned website contacts and provenance', () => {
  const scanned = { ...sampleCreators[0], contacts: [{ email: 'book@maker.io', source: 'Public website', sourceUrl: 'https://maker.io/contact' }] };
  const enriched = { ...sampleCreators[0], name: 'New Name', contacts: [] };
  const result = mergeCreators([scanned], [enriched]);
  assert.equal(result[0].name, 'New Name'); assert.deepEqual(result[0].contacts, scanned.contacts);
});
