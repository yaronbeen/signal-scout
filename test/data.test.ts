import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalPost, canonicalProfile, compareRelevance, contentSignals, creatorsFromPosts, discoverCandidates, enrichCreators, extractEmails, filterCreators, matchingTerms, mergeCreators, number, relevanceLabel, relevanceScore, searchPostUrls, toCsv, websiteContacts } from '../src/data';
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
test('TikTok profile biographies are attributed to profiles and never counted as matching posts', () => {
  for (const description of [undefined, 'A day at the beach']) {
    const [creator] = discoverCandidates('tiktok', [{
      profile_url: 'https://tiktok.com/@maker', url: 'https://tiktok.com/@maker/video/123',
      profile_username: 'maker', profile_biography: 'Meta ads specialist deals@maker.io', description,
    }], ['Meta ads'], 5);
    assert.equal(contentSignals(creator).length, 0);
    assert.equal(relevanceLabel(creator), 'Profile topic match');
    assert.deepEqual(creator.evidence.find(e => e.kind === 'profile'), {
      url: creator.url, text: 'Meta ads specialist deals@maker.io', kind: 'profile',
    });
    assert.equal(creator.contacts[0].sourceUrl, creator.url);
    assert.equal(creator.contacts[0].source, 'Public profile');
  }
  const [creator] = discoverCandidates('tiktok', [{
    profile_url: 'https://tiktok.com/@maker', url: 'https://tiktok.com/@maker/video/123',
    description: 'Meta ads testing', profile_biography: 'Meta ads consultant',
  }], ['Meta ads'], 5);
  assert.equal(contentSignals(creator).length, 1);
});
test('TikTok creation dates accept documented dates and epoch variants and survive enrichment', () => {
  const iso = '2026-10-01T12:00:00.000Z';
  for (const create_time of [iso, 'Thu, 01 Oct 2026 12:00:00 GMT', Date.parse(iso) / 1000, String(Date.parse(iso) / 1000), Date.parse(iso), String(Date.parse(iso))]) {
    const candidates = discoverCandidates('tiktok', [{ profile_url: 'https://tiktok.com/@maker', url: 'https://tiktok.com/@maker/video/123', description: 'Meta ads', create_time }], ['Meta ads'], 5);
    assert.equal(contentSignals(candidates[0])[0].publishedAt, iso);
    const [enriched] = enrichCreators('tiktok', [{ url: candidates[0].url, signature: 'Marketing' }], candidates, ['Meta ads']);
    assert.equal(contentSignals(enriched)[0].publishedAt, iso);
  }
  for (const create_time of [undefined, null, '', 'not a date', {}, Infinity]) {
    const [creator] = discoverCandidates('tiktok', [{ profile_url: 'https://tiktok.com/@maker', url: 'https://tiktok.com/@maker/video/123', description: 'Meta ads', create_time }], ['Meta ads'], 5);
    assert.equal(creator.evidence[0].publishedAt, undefined);
  }
  const creators = discoverCandidates('tiktok', [
    { profile_url: 'https://tiktok.com/@older', url: 'https://tiktok.com/@older/video/123', description: 'Meta ads', create_time: '2020-01-01' },
    { profile_url: 'https://tiktok.com/@newer', url: 'https://tiktok.com/@newer/video/456', description: 'Meta ads', create_time: iso },
  ], ['Meta ads'], 5).sort(compareRelevance);
  assert.equal(creators[0].handle, '@newer');
});
test('TikTok enrichment replaces identical or changed native biography evidence without losing other sources', () => {
  const [native] = discoverCandidates('tiktok', [{
    profile_url: 'https://tiktok.com/@fixture', url: 'https://tiktok.com/@fixture/video/123',
    profile_biography: 'Meta ads consultant', description: 'Meta ads testing', create_time: '2026-10-01',
  }], ['Meta ads'], 5);
  const candidate = { ...native, evidence: [...native.evidence,
    { url: native.url, text: 'Meta ads search snippet', kind: 'search' as const },
    { url: 'https://fixture.io/about', text: 'A separate source', kind: 'profile' as const },
  ] };
  const withAlias = { ...candidate, evidence: [...candidate.evidence, { url: 'https://tiktok.com/@FIXTURE?tracking=1', text: 'Stale duplicate biography', kind: 'profile' as const }] };
  const aliasEnriched = enrichCreators('tiktok', [{ url: native.url, signature: 'Current biography' }], [withAlias], ['Meta ads']);
  const [aliasMerged] = mergeCreators([withAlias], aliasEnriched);
  assert.deepEqual(aliasMerged.evidence.filter(e => e.kind === 'profile' && canonicalProfile('tiktok', e.url) === native.url), [{ url: native.url, text: 'Current biography', kind: 'profile' }]);
  let current = candidate;
  for (const signature of ['Meta ads consultant', 'A changed current biography', 'A changed current biography']) {
    const [enriched] = enrichCreators('tiktok', [{ url: native.url, signature }], [current], ['Meta ads']);
    [current] = mergeCreators([current], [enriched]);
    assert.deepEqual(current.evidence.filter(e => e.kind === 'profile' && e.url === native.url), [
      { url: native.url, text: signature, kind: 'profile' },
    ]);
    assert.deepEqual(current.evidence.filter(e => !(e.kind === 'profile' && e.url === native.url)), candidate.evidence.filter(e => !(e.kind === 'profile' && e.url === native.url)));
    assert.equal(contentSignals(current).length, 1);
    assert.equal(contentSignals(current)[0].publishedAt, '2026-10-01T00:00:00.000Z');
  }
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
test('creator-specific enrichment state follows correlated success, error and missing profile rows', () => {
  const candidates = discoverCandidates('instagram', [{ organic: ['complete', 'error', 'missing'].map(handle => ({ link: `https://instagram.com/${handle}/`, title: handle, description: 'Meta ads' })) }], ['Meta ads'], 5);
  assert.ok(candidates.every(c => c.profileStatus === 'pending'));
  const result = enrichCreators('instagram', [
    { url: candidates[0].url, full_name: 'Collected Fixture', followers: 0 },
    { input_url: candidates[1].url, error: 'dead_page' },
  ], candidates, ['Meta ads']);
  assert.deepEqual(result.map(c => c.profileStatus), ['complete', 'partial', 'partial']);
  assert.equal(result[0].enrichmentError, undefined);
  assert.equal(result[0].contacts.length, 0);
  const retried = enrichCreators('instagram', [{ url: candidates[1].url, full_name: 'Recovered Fixture' }], [result[1]], ['Meta ads']);
  assert.equal(retried[0].profileStatus, 'complete');
  assert.equal(retried[0].enrichmentError, undefined);
});
test('CSV protects spreadsheet formulas and includes source provenance and sample labels', () => {
  const creator = { ...sampleCreators[0], name: '=HYPERLINK("bad")', bio: 'A, quote " and\nnewline', followers: null };
  const csv = toCsv([creator]);
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"')); assert.ok(csv.includes('A, quote "" and\nnewline'));
  assert.ok(csv.includes('email_source')); assert.ok(csv.endsWith('"yes","","sample"'));
});
test('audience ranges are inclusive, preserve unknowns only when unbounded, and reject invalid bounds', () => {
  const creators = [null, 0, 1000, 10000, 10001].map((followers, i) => ({ ...sampleCreators[0], id: String(i), followers }));
  const filters = { platform: 'all', query: '', emailOnly: false, minimum: null, maximum: null, topic: '', matchingPostOnly: false };
  assert.equal(filterCreators(creators, filters).length, 5);
  assert.deepEqual(filterCreators(creators, { ...filters, minimum: 1000, maximum: 10000 }).map(c => c.followers), [1000, 10000]);
  assert.deepEqual(filterCreators(creators, { ...filters, maximum: 0 }).map(c => c.followers), [0]);
  for (const [minimum, maximum] of [[-1, null], [NaN, null], [null, Infinity], [1.5, null], [10000, 1000]]) {
    assert.equal(filterCreators(creators, { ...filters, minimum, maximum }).length, 0);
  }
});
test('topic and post filters require the selected topic in collected content, not unrelated post evidence', () => {
  const creator = { ...sampleCreators[0], matchedTerms: ['AI tools', 'automation'], evidence: [
    { kind: 'profile' as const, url: sampleCreators[0].url, text: 'AI tools specialist' },
    { kind: 'content' as const, url: sampleCreators[0].url, text: 'Automation tutorial' },
  ] };
  const filters = { platform: 'all', query: '', emailOnly: false, minimum: null, maximum: null, topic: 'AI TOOLS', matchingPostOnly: false };
  assert.equal(filterCreators([creator], filters).length, 1);
  assert.equal(filterCreators([creator], { ...filters, matchingPostOnly: true }).length, 0);
  assert.equal(filterCreators([creator], { ...filters, topic: 'Automation', matchingPostOnly: true }).length, 1);
  assert.equal(filterCreators([creator], { ...filters, topic: '', matchingPostOnly: true }).length, 1);
  assert.equal(filterCreators([creator], { ...filters, platform: 'x' }).length, 0);
});
test('CSV exports separate shortlist notes with formula protection and multiline quoting', () => {
  const creator = sampleCreators[0];
  const csv = toCsv([creator], { [creator.id]: '=formula, "note"\nsecond line' });
  assert.ok(csv.includes('"shortlist_note"'));
  assert.ok(csv.includes('"\'=formula, ""note""\nsecond line"'));
  assert.equal(Object.hasOwn(creator, 'note'), false);
});
test('CSV explicitly exports pending, partial, complete, unknown legacy and sample collection states', () => {
  const statuses = ['pending', 'partial', 'complete'] as const;
  const creators = [
    ...statuses.map(profileStatus => ({ ...sampleCreators[0], name: '=formula-fixture', bio: 'Export fixture', sample: false, contacts: [], evidence: [], profileStatus })),
    { ...sampleCreators[0], name: 'Legacy fixture', bio: 'Export fixture', sample: false, contacts: [], evidence: [] },
    { ...sampleCreators[0], name: 'Sample fixture', bio: 'Export fixture', profileStatus: 'complete' as const, contacts: [], evidence: [] },
  ];
  const [header, ...rows] = toCsv(creators).slice(1).split('\r\n');
  assert.ok(header.endsWith('"collection_status"'));
  assert.deepEqual(rows.map(row => row.match(/,"([^"]+)"$/)![1]), ['pending', 'partial', 'complete', 'unknown', 'sample']);
  assert.ok(rows.slice(0, 3).every(row => row.startsWith('"\'=formula-fixture",')));
  assert.ok(rows.every(row => row.split(',').length === header.split(',').length));
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
test('post collection resolves actual matching authors, rejects mismatches and preserves post provenance', () => {
  const urls=['https://www.instagram.com/p/post1/','https://www.instagram.com/reel/post2/'];
  const records=[{url:urls[0],profile_url:'https://instagram.com/actualauthor/',user_posted:'actualauthor',description:'Meta ads experiments hello@actualauthor.io',date_posted:'2026-10-01'}, {url:urls[1],profile_url:'https://instagram.com/actualauthor/',description:'Scaling Meta ads'}, {url:'https://www.instagram.com/p/unrequested/',profile_url:'https://instagram.com/stranger/',description:'Meta ads'}, {url:urls[0],profile_url:'https://instagram.com/noise/',description:'Generic ads advice'}];
  const creators=creatorsFromPosts('instagram',records,urls,['Meta ads']);
  assert.equal(creators.length,1);assert.equal(creators[0].url,'https://www.instagram.com/actualauthor/');assert.equal(creators[0].evidence.length,2);assert.equal(creators[0].contacts[0].sourceUrl,urls[0]);assert.equal(relevanceLabel(creators[0]),'2 matching posts');
  const enriched=enrichCreators('instagram',[{url:creators[0].url,biography:'Growth strategist'}],creators,['Meta ads'])[0];
  assert.equal(relevanceLabel(enriched),'2 matching posts');assert.ok(relevanceScore(enriched)>relevanceScore({...sampleCreators[0],evidence:[],matchedTerms:['Meta ads']}));
});
test('multiword relevance needs whole words together in one evidence item', () => {
  const c={...sampleCreators[0],name:'Amy',bio:'Marketing and metadata',evidence:[{url:'https://maker.io',text:'Generic ads advice',kind:'search' as const}]};
  assert.deepEqual(matchingTerms(c,['Meta ads']),[]);
  assert.deepEqual(matchingTerms({...c,evidence:[{...c.evidence[0],text:'How Meta changes your ads'}]},['Meta ads']),['Meta ads']);
});
test('post URL validation constrains platforms and bounds discovered URLs without guessing authors', () => {
  assert.equal(canonicalPost('instagram','https://instagram.com.evil.test/p/a/'),'');
  assert.equal(canonicalPost('linkedin','https://linkedin.com/in/person/'),'');
  assert.equal(canonicalPost('x','https://twitter.com/maker/status/123?tracking=1'),'https://x.com/maker/status/123');
  const records=[{organic:[{link:'https://instagram.com/p/a/'},{link:'https://instagram.com/p/b/'},{link:'https://instagram.com/p/a/'}]}];
  assert.equal(searchPostUrls('instagram',records,1).length,1);
  assert.equal(discoverCandidates('x',[{organic:[{link:'https://x.com/maker/status/123',description:'Meta ads'}]}],['Meta ads'],5).length,0);
});
test('LinkedIn and X content collectors use returned authors and exclude reposts', () => {
  const linkedin='https://www.linkedin.com/posts/someone-activity-123';
  const li=creatorsFromPosts('linkedin',[{url:linkedin,use_url:'https://linkedin.com/in/actualperson/',user_name:'Actual Person',post_text:'Meta ads insights'},{url:linkedin,use_url:'https://linkedin.com/company/agency/',post_text:'Meta ads'},{url:linkedin,use_url:'https://linkedin.com/in/reposter/',post_text:'Meta ads',repost:{url:linkedin}}],[linkedin],['Meta ads']);
  assert.equal(li.length,1);assert.equal(li[0].handle,'actualperson');
  const x='https://x.com/maker/status/123';
  const twitter=creatorsFromPosts('x',[{url:'https://twitter.com/maker/status/123',user_posted:'@maker',description:'Meta ads insights'},{url:x,user_posted:'other',description:'Meta ads',is_repost:true}],[x],['Meta ads']);
  assert.equal(twitter.length,1);assert.equal(twitter[0].url,'https://x.com/maker');
});
test('LinkedIn empty repost schema placeholders preserve actual personal authors, dates and contacts', () => {
  const url = 'https://www.linkedin.com/posts/fixture-author-activity-123';
  const record = {
    url, input: { url }, account_type: 'Person', use_url: 'https://linkedin.com/in/fixture-author/',
    user_name: 'Fixture Author', post_text: 'AI tools for marketing', date_posted: '2026-10-01T12:00:00Z',
  };
  const placeholders = [undefined, null, false, '', {}, [], {
    repost_hangtags: null, repost_attachments: null, tagged_users: null, tagged_companies: null,
  }, {
    repost_hangtags: [], repost_attachments: { images: [], videos: [{}] },
    tagged_users: [null, { name: '', profile: {} }], tagged_companies: [],
    is_repost: false, count: 0, description: '   ',
  }];
  for (const repost of placeholders) {
    const candidates = creatorsFromPosts('linkedin', [{ ...record, repost }], [url], ['AI tools']);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].url, 'https://www.linkedin.com/in/fixture-author/');
    assert.equal(contentSignals(candidates[0]).length, 1);
    assert.equal(contentSignals(candidates[0])[0].publishedAt, '2026-10-01T12:00:00.000Z');
    const [enriched] = enrichCreators('linkedin', [{
      url: candidates[0].url, about: 'Public contact booking@fixture-author.io', followers: 100,
    }], candidates, ['AI tools']);
    assert.equal(contentSignals(enriched).length, 1);
    assert.equal(contentSignals(enriched)[0].publishedAt, '2026-10-01T12:00:00.000Z');
    assert.deepEqual(enriched.contacts, [{ email: 'booking@fixture-author.io', sourceUrl: candidates[0].url, source: 'Public profile' }]);
  }
  for (const repost of [
    { url: 'https://www.linkedin.com/posts/original-activity-456' },
    { original_post_text: 'AI tools from another author' },
    { original_author: { profile_url: 'https://linkedin.com/in/original-author/' } },
    { repost_attachments: [{ images: [{ url: 'https://fixture-author.io/original.png' }] }] },
    { is_repost: true },
  ]) {
    assert.deepEqual(creatorsFromPosts('linkedin', [{ ...record, repost }], [url], ['AI tools']), []);
  }
  assert.deepEqual(creatorsFromPosts('linkedin', [{ ...record, repost: {}, is_repost: true }], [url], ['AI tools']), []);
});
test('resolved post permalinks correlate to requested inputs and keep returned provenance', () => {
  const input='https://www.linkedin.com/feed/update/urn:li:activity:123';
  const resolved='https://www.linkedin.com/posts/maker-activity-123';
  const c=creatorsFromPosts('linkedin',[{url:resolved,input:{url:input},use_url:'https://linkedin.com/in/maker/',post_text:'Meta ads'}],[input],['Meta ads']);
  assert.equal(c.length,1);assert.equal(c[0].evidence[0].url,resolved);
  assert.equal(creatorsFromPosts('linkedin',[{url:resolved,input:{url:'https://linkedin.com/posts/other'},use_url:'https://linkedin.com/in/maker/',post_text:'Meta ads'}],[input],['Meta ads']).length,0);
});
test('rank full bounded profile pages before limiting and share post inputs across topics', () => {
  const records=[{keyword:'Meta ads',organic:[...Array.from({length:5},(_,i)=>({link:`https://instagram.com/noise${i}/`,description:'Generic ads advice'})),{link:'https://instagram.com/relevant/',description:'Meta ads consulting'}]}];
  const profiles=discoverCandidates('instagram',records,['Meta ads'],5);
  assert.equal(profiles.length,5);assert.equal(profiles[0].handle,'relevant');
  const pages=['Meta ads','skincare','AI UGC'].map((keyword,t)=>({keyword,organic:Array.from({length:6},(_,i)=>({link:`https://instagram.com/p/t${t}p${i}/`}))}));
  const urls=searchPostUrls('instagram',pages,5);
  assert.equal(urls.length,5);assert.deepEqual(urls.slice(0,3),['https://www.instagram.com/p/t0p0/','https://www.instagram.com/p/t1p0/','https://www.instagram.com/p/t2p0/']);
  assert.equal(searchPostUrls('instagram',[pages[0],{keyword:'empty',organic:[]}],5).length,5);
});
