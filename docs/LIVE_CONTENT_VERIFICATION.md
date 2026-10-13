# Bounded live content-first verification — 2026-10-13

## Scope and result

Topic: **AI tools**. Depth: **5**, all five platforms. Requests used the current local Worker at `http://localhost:8787`, with the developer's visitor-owned credential held in process memory. The selected previously working SERP zone was checked through non-billable account metadata; no alternative zone was probed.

**This is partial live coverage, not an all-five-platform pass.** In the original AI-tools run, YouTube and X completed newly submitted discovery/content and correlated profile stages. TikTok completed using existing exact-topic snapshots. Instagram's search failed, and LinkedIn's partial search returned no usable platform candidates. A separately authorized follow-up successfully exercised both platforms' search responses, direct known-post collection, and bounded profile enrichment; it exposed a LinkedIn reshare-classification adapter bug that is now fixed and verified against the preserved captures without network calls. LinkedIn actual-author live enrichment remains unverified because its diagnostic profile inputs were direct fallback samples. Website retrieval had been tested previously but was explicitly excluded from both runs.

Every paid submission was persisted privately before dispatch, with request/response and snapshot references saved afterward. No paid search or trigger POST was automatically repeated. The original four and follow-up four newly created snapshots completed; no new snapshot remains pending.

## Original AI-tools run: per-platform / per-stage coverage

| Platform | Discovery | Dedicated post collection | Profile enrichment | Public-email validation |
| --- | --- | --- | --- | --- |
| YouTube | **New, verified:** one native keyword input, five video records, three authors | Included in native discovery; separate post collector not applicable | **New, verified:** three inputs, three correlated profiles | Extraction/source checks passed; zero emails observed |
| TikTok | **Reused, verified:** existing exact-topic/depth-five discovery snapshot, five records, five authors | Included in native discovery; separate post collector not applicable | **Reused, verified:** existing identical five-profile snapshot, fetched through current Worker | One email on one creator; valid source and raw-record correspondence |
| Instagram | **New, failed:** two SERP pages dispatched; no successful response pages | **Untested:** search did not produce a usable result | **Untested:** no candidates produced | Untested |
| LinkedIn | **New, partial:** two SERP pages dispatched; profile page timed out, content page returned ten organic rows | **Unexercised:** zero accepted indexed post URLs in the bounded response | **Unexercised:** zero accepted profile candidates | Untested |
| X | **New, partial:** two SERP pages dispatched; profile page returned origin HTTP 502, successful content page returned ten organic rows | **New, verified:** three inputs, three successful correlated post records, one topic-matching author | **New, verified:** five inputs, five correlated profiles | Extraction/source checks passed; zero emails observed |

“Verified” refers to the explicitly named stage and observed records. It does not establish relevance for every creator, universal service availability, or email coverage.

## Counts and provenance

- **YouTube:** five collected videos correlated to three channel authors; all three resulting creators have matching content evidence. Five matching content evidence items have publication dates. Three profile rows correlated to the requested creator identities, with three audience metrics available and no metric mismatches or profile errors.
- **TikTok:** five existing content records and five successfully correlated profiles. Two creators have matching content evidence under the current all-topic-word matcher; three remain candidates requiring topic-fit review. Five audience metrics available, no metric mismatches or profile errors. One public email has a valid source and matches the captured source data. Free re-normalization after the concurrent adapter fix retained publication dates on all five native content evidence items.
- **X:** three collected posts have requested-permalink correspondence, zero collection-error rows, and no explicit reposts. One collected post matches all topic words and produces one actual matching author; that author survives the five-creator bounded ranking/enrichment. All five resulting profile rows correlate to the requested identities, with five audience metrics and no metric mismatches or profile errors. Four resulting creators have search evidence rather than matching collected-post evidence.
- **Instagram:** no returned discovery data, so author attribution, profile correlation, metrics, and emails could not be exercised in this run.
- **LinkedIn:** no collected native posts or profiles, so author attribution, profile correlation, metrics, and emails could not be exercised in this run.

Successful profile stages had **zero source-attribution or audience-metric mismatches**. A separate captured-data pass compared each accepted native-content author to its raw channel/profile identity, and the accepted X post author to its raw `user_posted` identity: zero attribution mismatches across all exercised platforms. No raw names, profiles, emails, account metadata, credentials, or snapshot identifiers are included here. Exact snapshot references and raw responses remain in ignored private captures for free re-normalization.

## Blockers and concrete findings

1. **Instagram provider search availability:** both search requests failed; the surfaced response reports search-origin HTTP 502. Searches may have consumed credits despite failure. No rerun was made.
2. **LinkedIn provider response anomaly:** the profile page timed out. The successful page echoed the intended `site:linkedin.com` content query but returned mostly unrelated domains and a LinkedIn help page, not post/profile URLs. The URL adapter rejected those rows correctly. Zero accepted posts means this post-collector path remains untested, not proven broken.
3. **X partial search preservation exercised:** the profile page failed while successful content-page rows remained usable. Some of those rows were profiles despite the status-oriented query; the adapter safely distinguished profile URLs from post URLs.
4. **TikTok date adapter gap found and resolved:** the initial live-run normalization omitted dates despite all five raw records containing ISO-string `create_time` values. The core-adapter owner subsequently fixed this. Free re-normalization using the same raw captures retained dates on all five evidence items, with zero author-attribution mismatches and no additional network or paid calls. No core code was changed by the verification task.
5. **Recovery coverage limit:** this run did not force transient snapshot polling failures or terminal post-snapshot failure fallback. Those paths require the existing meaningful fixture/browser tests; this report does not claim live coverage of them.
6. **Legacy script claim corrected:** `scripts/verify-live.ts` now labels its result as legacy discovery/profile adapter checks. Its reused native captures and hybrid SERP/profile stages do not verify current dedicated post collection or website retrieval. The legacy script was not run for this verification.

## Original run: exact newly dispatched paid-stage totals

- **SERP:** three Worker discovery POSTs, each dispatching two upstream search-page requests: **six paid search-page requests** total (Instagram two, LinkedIn two, X two). Two pages returned usable envelopes; four failed or timed out. Provider billing for failed pages is not exposed by the relay.
- **Native discovery:** **one accepted trigger**, one YouTube keyword input, bounded to five video records; five returned.
- **Dedicated post collection:** **one accepted trigger**, three X post inputs; three successful records returned.
- **Profile enrichment:** **two accepted triggers**, eight inputs total (YouTube three, X five); eight successful correlated records returned.
- **New snapshot total:** **four accepted trigger POSTs**, twelve aggregate input objects across their stage-specific budgets, sixteen returned records across all four stages.
- **Reused paid stages:** two existing TikTok snapshots (discovery and enrichment); **zero new TikTok triggers**.
- **Paid trigger retries:** zero. **Paid search reruns:** zero. **Website scans:** zero. **Other-zone probes:** zero.

This counts dispatched requests, accepted snapshots, bounded input objects, and returned records. It is not a monetary billing statement; exact charge amounts were not available in Worker responses.

## Separately authorized Instagram / LinkedIn diagnostics

The user explicitly authorized a further ceiling of **two SERP pages, two known public post inputs, and two profile inputs per platform**, on the same selected zone, without automatic retries, alternative-zone probes, or website scans. Each fresh search used one `Meta ads` topic, dispatching the constrained Worker's fixed profile/content pair. Each direct-post stage used two real `AI tools` posts selected from existing privately captured profile data; no post URL was fabricated or collected from the fresh diagnostic search.

These stages establish **direct known-post collector coverage**, not a complete search-to-post-to-profile pipeline on the new topic.

| Platform | Fresh two-page SERP diagnostic | Direct known-post collector | Author normalization | Bounded profile enrichment |
| --- | --- | --- | --- | --- |
| Instagram | **Passed:** two pages, 20 organic rows; zero accepted profile candidates, at least five accepted post URLs within depth five | **Passed:** two requested posts, two successful correlated records | **Passed:** one actual returned author, two matching dated content evidence items, zero attribution mismatches | **Passed:** one actual post author submitted; one correlated profile; both matching content items preserved |
| LinkedIn | **Passed:** two pages, 18 organic rows; five accepted profile candidates and five accepted post URLs within depth five | **Passed:** two requested posts, two successful correlated records | **Resolved, captured-data verified:** two actual personal authors, two matching dated evidence items, zero attribution mismatches after the repost-placeholder fix | **Passed as direct fallback only:** two previously captured personal profiles submitted; two correlated profiles. These are not claimed as successful post-author live enrichment |

Both profile stages returned zero collection-error records, zero audience-metric mismatches, zero email/source mismatches, and zero observed public emails. Audience counts were available on all three profiles. Successful fresh SERP diagnostics confirm that the selected zone can answer these queries; they do not invalidate the original AI-tools query failures or establish universal zone health.

### LinkedIn repost-placeholder mismatch — resolved

Both successful LinkedIn post records contain:

- `account_type: "Person"`;
- a valid personal-profile `use_url`;
- requested-permalink correspondence;
- topic-matching `post_text` and a publication date;
- a `repost` object containing only `repost_hangtags`, `repost_attachments`, `tagged_users`, and `tagged_companies`, **all null**.

At capture time, `creatorsFromPosts` rejected any object-valued `repost`, which classified both empty schema placeholders as reshares and yielded zero authors. The diagnostics runner's initial `explicitReshares: 2` field followed that same predicate; inspection proves it is not evidence of two actual reshares.

The core adapter now checks recursively for meaningful repost values rather than object presence. Nulls, blank strings, false flags, zero counts, and recursively empty arrays/objects do not establish a reshare; populated original URLs, text, identities, attachments, or an explicit repost flag still exclude it. A sanitized unit regression verifies placeholder acceptance, actual-repost exclusion, publication-date retention, and preservation of profile-sourced contacts.

Free re-normalization with `docs/live-private/renormalize-ig-li-diagnostics.ts` made **zero network requests** and produced:

- **LinkedIn:** two actual authors, two matching content evidence items, zero missing publication dates, and zero author-attribution mismatches. Both evidence items survive correlation with existing profile captures. One author overlaps an existing fallback-profile capture; the other has no matching profile capture and remains partial. This is captured-data normalization/correlation verification, **not newly exercised actual-author live enrichment**.
- **Instagram:** one actual author, two matching dated evidence items, zero attribution mismatches, and one correlated existing profile; both evidence items remain preserved.

No additional paid search, snapshot trigger, website scan, or zone probe was submitted for this fix. The existing paid totals below are unchanged.

### Exact additional and cumulative paid totals

- **Additional SERP:** two discovery POSTs, four upstream pages total; all four returned successful envelopes. No paid search retries.
- **Additional post triggers:** two accepted snapshots, four inputs total (two Instagram, two LinkedIn); four successful records returned.
- **Additional profile triggers:** two accepted snapshots, three inputs total (one Instagram actual author, two LinkedIn direct fallback samples); three successful correlated records returned.
- **Additional snapshots:** four, all ready/completed; seven aggregate stage input objects; seven returned records.
- **Cumulative across original + follow-up:** ten SERP-page requests, eight accepted snapshot triggers, nineteen aggregate snapshot input objects, twenty-three returned snapshot records. Breakdown: one native discovery input; seven dedicated-post inputs; eleven profile inputs.
- **Reused:** the same two existing TikTok snapshots. **Automatic paid retries:** zero. **Website scans:** zero. **Other-zone probes:** zero.

Exact monetary charges, including charges for failed original SERP pages, remain unavailable from the relay.

## Private reproduction artifacts

The original ignored runner is `docs/live-private/verify-content-flow.ts`; captures, pre-dispatch markers, snapshots, normalized creator records, and summaries are under `docs/live-private/content-flow-ai-tools/`. The follow-up runner is `docs/live-private/verify-ig-li-diagnostics.ts`, with artifacts under `docs/live-private/ig-li-bounded-diagnostics/`. Both refuse to repeat a completed paid request or an uncertain submission. `docs/live-private/renormalize-content-flow.ts` verifies author correspondence and normalization against original saved records with zero network calls; `docs/live-private/renormalize-ig-li-diagnostics.ts` does the same for the follow-up post captures and existing profile captures. Do not publish those private artifacts.
