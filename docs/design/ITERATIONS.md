# Clear Signal — production design iterations

## Scope and acceptance

Integrate the approved Clear Signal concept into the real five-platform workspace. Preserve visitor-owned keys, bounded paid stages, honest topic evidence, successful partial results, snapshot recovery, sample isolation, and complete human/coding-agent setup.

Each production iteration receives three independent review lenses:

1. **Clarity:** a skeptical reader checks instructions, claims, and onboarding.
2. **Technical:** a domain expert checks scraper contracts, attribution, state, security, and paid recovery.
3. **Audience:** a nontechnical marketer checks usability, visual coherence, and accessibility.

Checks include automated contracts and meaningful browser flows, desktop/mobile visual inspection, six responsive widths, untidy real-data states, verified setup links, and a bounded live provider run. Real-world provider failures and unexercised paths remain recorded explicitly; no failed trigger is automatically resubmitted.

### Release gate

- The approved composition is present in production rather than only the standalone concept.
- All three independent reviewers have no unresolved blocking or material correctness/usability findings.
- Unit/integration tests, TypeScript, production build, and complete desktop/mobile browser suite pass.
- Six responsive widths, short-height dialogs, keyboard recovery, reduced motion, long/missing/partial data, and setup guidance pass inspection.
- Every shipping scraper stage has an explicit evidence status: current live call, reused real response, fixture-only contract, or unexercised/provider failure. A successful key connection never substitutes for service verification.
- Hosted health, sample/details/export/setup flows, CSP, browser errors, and absence of overflow pass after deployment.
- No credentials or private live captures enter the public repository; visitor-owned key behavior remains intact.

## Iteration 1 — concept-to-production integration

### Audience review

**Verdict: FIX.** The reviewer supported the visual direction and identified three concrete issues:

- Mobile results omitted an explicit New search action.
- The evidence preview used an external-link-looking arrow for an internal detail interaction.
- The limitation of topic relevance was explained only after the results grid.

All three were forwarded to the implementation agent. Production acceptance requires named Edit/New search actions on mobile, distinct internal/external navigation affordances, and a concise relevance explanation near the decision point.

### Setup link verification

The prototype's old Web Scraper API overview link returned HTTP 404. The canonical `https://docs.brightdata.com/products/scrapers/overview` returned successfully and was forwarded for production. SERP and optional Web Unlocker quickstarts also returned successfully. The README links to all three guides.

### Clarity review

**Verdict: FIX.** The reviewer identified misleading tab-closure recovery wording, undisclosed later paid stages on Resume, omitted zone selection in the README's primary marketer steps, and preservation of local setup instructions. The README and copied agent prompt now distinguish refresh from tab closure, disclose post/profile charges on Resume, include zone selection, and link to all required provider guides. Full local human/agent handoff is required in the production setup UI.

**Targeted follow-up: SHIP for documentation/prompt.** The reviewer found no remaining material clarity or accuracy contradictions. This follow-up does not stand in for the later production triple review or browser acceptance.

### Other verification evidence

Both `npm audit --omit=dev` and the full `npm audit` reported no vulnerabilities. An isolated installation from the current lockfile passed `npm ci` and a production build on Node 22 without a Cloudflare login. A regression check asserts that the README's coding-agent prompt exactly matches the in-app exported prompt and retains mandatory provider, key, recovery, and local-server guidance. Technical review, live provider results, and production browser checks will be recorded as they complete.

### Technical review

**Verdict: FIX.** Findings were separated into implementation work and verification scope:

- Zone choice must remain accessible during recovery when the main composer is hidden.
- Error-only post records must be a collection failure, not successful no matches.
- Profile biography must not be attributed as authored post text; TikTok publication dates need their documented field normalized.
- Successful profile discovery should display during post collection.
- A returned snapshot that cannot be persisted must remain visible for manual preservation.
- Confirmed terminal enrichment failure must end as a partial profile, distinct from transient polling errors.
- Live verification must describe individual stages and reused captures rather than claim all scraper paths passed.
- Trigger contract checks need native YouTube discovery and every profile collector covered.

UI recovery requirements were forwarded to the design implementer. Core normalization/recovery defects and contract regression checks were assigned to a separate implementation agent. The live verification agent is retaining private captures and recording per-stage exercised/unexercised paths.

### Bounded live verification

The first authorized run is documented in [LIVE_CONTENT_VERIFICATION.md](../LIVE_CONTENT_VERIFICATION.md). YouTube and X passed newly submitted content/profile stages; TikTok passed using existing exact-topic discovery/profile snapshots. Instagram had search-origin failures; LinkedIn returned no usable bounded post/profile URLs. Those paths were not labeled passed. Four new snapshots completed; there were no paid retries, website scans, or other-zone probes.

The user explicitly approved a second diagnostic cap to close the missing Instagram/LinkedIn stages: up to two SERP pages, two known public posts, and two profiles per platform on the same selected zone. Direct known-post checks will be distinguished from successful topic discovery. This authorization does not permit automatic retries or zone failover.

The authorized follow-up returned all four SERP pages, both Instagram/LinkedIn post snapshots, and both profile snapshots successfully. Instagram produced an actual matching author and retained two dated post-evidence items through enrichment. LinkedIn exposed a concrete adapter defect: all-null `repost` placeholder metadata was interpreted as an actual reshare and dropped valid authors. That defect is being corrected using saved responses with no additional paid requests. LinkedIn profile collection passed against known personal-profile fallback inputs; it is not mislabeled as live enrichment of those post authors. The follow-up used four search pages and four snapshots, with no automatic retries, website scans, or other-zone probes.

### What's working

- Reviewers supported the approved editorial hierarchy and evidence-first visual direction; no alternative aesthetic was required.
- Visitor-owned credentials, conservative trigger uncertainty, independent platform outcomes, and source-backed contacts remain core invariants.
- The corrected documentation gives a coherent hosted path and a separate local coding-agent/human handoff without claiming a connected key proves provider readiness.

## Iteration 2 — real-state integration

Three independent reviewers inspected the production implementation and corrected documentation.

### Technical

**Scoped verdict: SHIP**, with two material polish findings forwarded for correction: mixed native discovery errors need a partial-warning summary, and profile biography evidence must update without duplicating prior copies. The reviewer confirmed conservative paid outcomes, visible known snapshots on persistence failure, depth-capped result replacement, and terminal-versus-transient recovery. The subsequently discovered real LinkedIn placeholder defect is tracked separately above and receives saved-response regression coverage.

### Audience/visual

**Verdict: FIX.** The desktop landing matched the approved design. Remaining state-level findings were forwarded to the implementer:

- New-search drafts must not replace the collected brief when returning to Edit search.
- Focus must prioritize recovery/progress controls when work requires attention.
- Copy/save feedback from modal dialogs must appear and announce within the modal layer.
- Pending/partial labels must describe individual creator outcomes, with failure precedence.
- Small-screen audience/sort selected labels must remain readable.

Acceptance coverage is being extended for these interactions before the next complete triple-review round.

### Clarity

**Verdict: FIX.** Production-code review found that platform-level job presence could incorrectly label individual profiles completed/pending, that a card could preview nonmatching content beside a matching-post label, and that restricted account metadata was described as confirmed absence of a search zone. Corrections are being implemented through durable creator-specific collection status, supporting-evidence selection, and an explicit metadata-availability contract. Small wording findings also require distinguishing `posts-ready` from discovery and acknowledging that paid-search authorization queues work for Resume rather than immediately dispatching it.

### Independent local setup smoke

The lockfile was installed in an isolated directory with no repository credentials/private captures. Unit/integration checks and production build passed. An independent local Worker started on an alternate free port and returned `{ "ok": true }` from its health endpoint without Cloudflare login. Browser assets returned HTTP 200, eight sample creator cards rendered, and no page errors occurred. The standard port was already occupied by the main dev server; this port conflict was environmental, not an installation defect.

### Acceptance regressions

The independent browser-test author added interaction coverage for collected-brief restoration after canceling New search, recovery-first focus with and without existing results, status feedback inside native dialogs, durable pending/partial/complete labels across save/discard/reload, legacy unknown state, same-platform completed-versus-pending isolation, and selection of evidence supporting the adjacent relevance label. Tests intercept provider work; these checks do not incur Bright Data usage.

A public-source/artifact credential-pattern scan initially checked 95 text files with zero matches; the expanded production evidence/docs set was rescanned at 124 text files with zero matches. Raw live captures and developer credentials remain outside the public source set; `docs/live-private/` is ignored.

### Core corrections completed

The core implementer reported 52 passing unit/contract checks and a passing typecheck. Discovery/profile normalization now stores `profileStatus` on each creator; legacy absence remains unknown. CSV preserves that distinction in `collection_status` alongside explicit sample identity. Connection exposes `metadataAvailable` so restricted metadata is distinguished from an empty available zone list. Native mixed errors retain warnings through resume, profile biography evidence updates without stale duplicates, and known-snapshot persistence failures retain visible references while stopping further collection.

Both saved-response re-normalization runners passed with zero network requests. LinkedIn's all-null repost placeholder defect is resolved: two actual authors and two matching dated evidence items were accepted with zero attribution mismatches. Instagram, YouTube, TikTok, and X saved-response attribution/date/source checks also passed. Actual-author live LinkedIn enrichment is still not a newly verified stage; fallback profile collection and normalization remain explicitly distinguished.

### Updated production captures

Desktop/mobile home, results, details, connection, setup checklist, human handoff, connected/recovery guidance, and in-dialog feedback were recaptured from the real local production build. The setup overview capture starts at the top; deeper guidance has separate captures. The next triple-review round assesses these current images instead of stale pre-redesign screenshots.

## Iteration 3 — production release gate

Three independent reviewers are checking the settled production sources and current captures for clarity, technical correctness/security, and target-audience UX/visual quality. The complete browser acceptance suite includes all original recovery flows plus responsive, long-data, modal, durable-state, and supporting-evidence regressions. Final results are recorded below when complete.

### Results

- **Clarity: SHIP**, with a localized wording correction requested for website scanning when account metadata is restricted.
- **Technical: SHIP**, with a memory-only replacement-key draft that must also clear on Disconnect and forget key.
- **Audience/visual: FIX.** Edit must always start from the collected brief shown in the ribbon, including after abandoning ordinary edits or a historical draft. An actual mobile partial-profile capture showed Unknown metric text colliding with the adjacent value. Global feedback also leaked into subsequently opened dialogs.

The production build and 52 unit/contract checks passed. The complete browser run passed **104 tests**, with **10 intentionally skipped duplicate viewport instances**. Thirty production captures had no checked horizontal overflow or page errors, but the screenshot review found the within-row metric collision; document-width checks alone are insufficient for readable layout. Corrections and targeted regression coverage are required before final release approval.

Interactive Plannotator code review completed with **no changes requested**. Its feedback does not override the independent visual findings, which remain required corrections.

### Release smoke runner

`verify-hosted.mjs` now exercises the real local/hosted response CSP, health, eight labeled sample profiles, details, shortlist, collection-status CSV, full human/agent setup, visitor-key dialog, fonts, viewport fit, and browser errors. All provider endpoints except health are blocked. Its local desktop/mobile dry run passed without paid API calls or external font requests. The evidence records the actual URL to prevent local checks from being mistaken for hosted release checks.

## Iteration 4 — final corrections and sign-off

All iteration-3 findings were corrected. Edit always restores the collected brief, metrics wrap without sibling collisions at 320/390px, new dialogs clear unrelated feedback, Disconnect clears connected/replacement keys, and restricted metadata uses permission guidance for optional scans. Regressions cover each behavior, including abandoned historical drafts and actual rendered metric-text containment.

`npm run check` passed 52 checks, TypeScript, and production build. The changed browser subset passed 23 tests with seven intentionally skipped duplicate viewport cases. Thirty-two updated production captures reported no checked overflow or browser exceptions. The fourth independent triple review and complete final browser run are in progress against this settled build.

- **Final clarity gate: SHIP**, no material findings.
- **Final technical gate: SHIP**, no material findings; replacement-key clearing confirmed.
- **Final audience/visual gate: SHIP**, no material findings; collected-edit restoration, feedback isolation, and 320/390px textual metric containment confirmed from source/current captures.
- Exact developer-credential values were scanned against public source/artifact bytes with no matches; this complements the pattern scan without printing credentials.

The main session's final complete browser run passed **106 tests, with 10 intentionally skipped duplicate/device-specific instances**, across both desktop and mobile projects. All executed tests passed; no paid requests were submitted. The main session also independently reran all 52 unit/contract checks successfully. The subsequent one-line target-size correction is recorded in iteration 5.

## Iteration 5 — independent accessibility target correction

An independent browser pass checked home/sample/details/setup at four widths plus 320×480 and 720×450. All 1,918 computed text contrast checks passed the applicable thresholds. Modal focus/Escape/scrolling/copy feedback, reduced motion, key-draft clearing, self-hosted fonts, page errors, and document overflow also passed. It found one low-severity target-size defect: the X results filter measured 22×54px on desktop/tablet.

The filter rule now has `min-width: 44px`. The production build passed. A final narrow triple review and responsive/accessibility rerun validate this one-line correction before final hosted release checks. The iteration-4 complete functional result remains 106 passed tests; only the target-size CSS rule changed afterward.

**Final narrow triple review: all three SHIP**, no findings. The main session's rebuilt accessibility rerun passed 31 states with zero contrast failures, undersized checked targets, other failures, page errors, external font requests, or unexpected API calls. Keyboard, reduced motion, and connection/draft-clearing checks passed. The six-width responsive rerun also passed all six executed cases (six duplicate project instances intentionally skipped). See `evidence/production-accessibility.json`.

## Published release

Clear Signal is deployed at https://signal-scout.yaron-been.workers.dev, Worker version `cb2b942a-dea4-4d1b-a929-5dc52e53dcf1`. The hosted release smoke passed on desktop/mobile for health, CSP, sample/details/shortlist/export, both setup handoffs, key dialog, viewport fit, and absence of browser errors/external fonts/paid API calls. The final evidence records the hosted URL. No unresolved material review findings remain. Per-stage live limitations, especially actual-author LinkedIn enrichment, are retained in the live verification report rather than converted into an all-platform live-pass claim.
