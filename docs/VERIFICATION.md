# Release verification

## Filter panel and collection radar — 2026-10-20

- Replaced the scattered filter controls with one bordered panel: consistently labeled/aligned search, topic and sort controls; grouped audience range; selectable email/post chips; separated count and bulk-save actions. Responsive containment checked at 320/390/768/1440px.
- Selected-platform empty results now distinguish active collection, paused/restored jobs, collection errors, and confirmed terminal empty results. Animated radar uses real `discovering`/`enriching` state; no fabricated percentage or spinner for paused/failed work. Visible partial results retain an inline collection status. Initial collection also uses the radar. Reduced-motion preference disables the decorative animation.
- `npm run check`: **64 unit/integration checks passed**, TypeScript/build passed. New desktop/mobile regression suite: **8 passed**, including pause while another platform's discovery response remains pending. Final full browser suite: **142 passed / 10 intentional viewport-specific skips**.
- Independent code review identified the paused-platform idle-phase edge case; corrected to an explicit active-phase allowlist and covered before the held request is released. Follow-up verdict: **SHIP**, no remaining code findings in scope.
- Independent live UX walkthrough captured 25 states across 1440px desktop, 390px mobile and 320px containment, with screenshots/ARIA and no page errors or overflow. It confirmed radar/paused/error/empty distinctions, 44px targets, focus and reduced motion. Two follow-ups were corrected: shared control borders now use `#7d8da5` for at least 3:1 contrast on white; mobile topic/sort controls stack to avoid truncated selections. Both have browser regressions. Evidence: `/tmp/opencode/signal-scout-filters-ux`.
- Targeted independent visual follow-up: **PASS**, both findings resolved, zero new regressions. Actual border contrast is **3.37:1 on white / 3.23:1 on search fill**; desktop alignment within 1px, mobile selection text fully visible. Evidence: `/tmp/opencode/signal-scout-filters-ux-followup`.
- Deployed Worker version: `4ab51ca6-d8da-44f7-950a-b3ebd2e80d89` at https://signal-scout.yaron-been.workers.dev. Production filter/loading/shortlist browser suite: **28 passed**, with mocked provider responses for collection scenarios. Hosted desktop/mobile smoke passed with no page errors, overflow or attempted paid calls.
- No paid provider calls or collection-path changes. The prior scan success/warning overlap remains outside this filter/loading change; see the residual review section below.

## Residual feature review fixes — 2026-10-20

- Follow-up independent audits identified two P2 failure paths and one malformed-storage robustness finding. All reproduced in executable regressions before correction: merged search/post evidence lost earlier topic matches after error/missing profile enrichment; automatic shortlist writes ignored persistence failures; malformed optional fields and inherited note properties could break rendering.
- Post-author merge now recomputes topic matches against the active keywords before relevance sorting and truncation. Automatic refresh/scan persistence failures keep the updated shortlist in memory and display a persistent export-before-closing warning in the main view and active details dialog. Restored optional fields are type-checked; both UI note lookups require own properties.
- `npm run check`: **64 unit/integration checks passed**, TypeScript and production build passed. Content/shortlist targeted run: **32 passed**, followed by **2 automatic-refresh regression passes**. Final complete browser suite: **134 passed / 10 intentional viewport-specific skips**.
- Fresh-context code reviews returned **SHIP** for the corrected data/storage paths. Independent UX review found an additional warning-visibility defect. Moving the warning beside scan feedback and scrolling it into view fixed viewport containment but did not fully resolve readability: sticky success feedback occludes the export instruction on desktop/mobile. **One medium-priority UX finding remains unresolved after the third review round; overall acceptance is NEEDS WORK.** Recommended next decision: prioritize persistence failure over scan-success feedback, with an occlusion-aware regression. Existing geometry assertions do not detect overlays.
- Latest deployed Worker version: `532e848c-1bea-441c-851c-d5c849d0bbc9` at https://signal-scout.yaron-been.workers.dev. All **34 content/shortlist desktop/mobile browser tests passed against this production version**, using mocked provider responses for failure/recovery scenarios. Hosted release smoke also passed with no browser errors, horizontal overflow, external fonts, or attempted paid API calls. These automated passes do not override the independent UX finding. Production dependency audit reported zero vulnerabilities.
- The final build passed a complete browser rerun (**134 passed / 10 intentional skips**). An earlier run while a build ran concurrently had one reconnect-test timeout; the unchanged-code complete rerun passed. No claim of zero test flakiness is made.
- UX evidence: `/tmp/opencode/signal-scout-residual-ux-followup/occlusion-confirmation/results.json`. Notes and newly found contacts remain exportable in-session; the warning becomes readable after success feedback clears or details reopen. No further automatic fix iteration after round three.
- No new dependencies, services, paid requests, collection expansion, or Worker route changes.

## Cross-tab shortlist note persistence fix — 2026-10-20

- Triple review identified one P2 defect: saving a note from a stale second tab replaced the shared notes map and silently deleted unrelated saved notes. Reproduced on production with sample creators and no provider requests.
- Notes now persist under creator-specific browser keys. Restoration overlays valid per-creator values on the legacy notes map, preserving existing notes without a destructive migration. Blank saved notes override legacy values correctly. No Worker, collection, dependency, or visible UI changes.
- New two-tab browser regression failed on desktop/mobile before the fix and passed afterward. It covers sequential stale-tab saves, concurrent save attempts, existing legacy notes, reload persistence, and CSV export. Unit coverage checks legacy precedence, blank notes, validation, and write failure.
- `npm run check`: **63 unit/integration checks passed**, TypeScript and production build passed. Targeted feature suite: **14 passed**. Full browser suite: **124 passed / 10 intentional viewport-specific skips**.
- Fresh-context independent review: **SHIP**, original P2 resolved, zero introduced findings. No additional UX walkthrough was needed for this storage-only fix; existing note UI and desktop/mobile flows were exercised by browser tests.
- Deployed Worker version: `18e9bfd0-cd71-4cc9-8de7-c7383f402e53` at https://signal-scout.yaron-been.workers.dev. The two-tab regression passed against actual production on desktop and mobile (**2 passed**), blocking provider requests. Hosted release smoke passed health, CSP, filters, saving, note persistence/export, setup, and visitor-key flows with no browser errors, overflow, external fonts, or attempted paid calls.
- Limits: reload to see another tab's note changes; the last save wins when two tabs edit the same creator. Reload tabs running the older app before saving. Shortlist membership synchronization is unchanged. No paid collection was rerun.

## Lightweight research improvements — 2026-10-20

- Inclusive audience minimum/maximum, matched-topic and topic-specific collected-post filters, bulk saving of visible unsaved creators, and explicit-save browser-local shortlist notes exported in CSV.
- No Worker/pipeline changes, dependencies, server persistence, or additional paid collection. Existing shortlist storage remains compatible; notes are stored separately so provider refreshes cannot overwrite them.
- `npm run check`: **62 unit/integration checks passed**, TypeScript and production build passed.
- Final complete browser suite: **122 passed / 10 intentional viewport-specific skips**, including last-topic removal, notes/export/persistence, storage failures, sample/live isolation, and a mocked website scan preserving notes. The 12 targeted desktop/mobile filter/shortlist tests also passed independently.
- Independent code/behavior/security review found one selected-topic state defect; fixed with a browser regression. Targeted follow-up returned **SHIP**, zero remaining findings.
- Updated non-billable release smoke checks audience bounds, topic/post filtering, idempotent bulk saving, note persistence/export, and original health/setup/security flows on desktop and mobile. Local run passed with no attempted paid calls or browser errors.
- Independent live UX walkthrough captured 33 screenshot/ARIA snapshot pairs across desktop/mobile plus 320px containment checks. No blockers; the visible matched-topic label was restored and rechecked at 320/390/1440px. A small vertical offset beside the sort control is accepted as nonblocking layout polish; no overlap or overflow.
- Deployed Worker version: `b26bbd4f-2389-441c-8c40-d972e3e5d55e` at https://signal-scout.yaron-been.workers.dev. The updated production smoke passed all checks on desktop/mobile, with no browser exceptions, horizontal overflow, external fonts, or attempted paid API calls. Evidence: [hosted-release-smoke.json](design/evidence/hosted-release-smoke.json).
- No paid live discovery was rerun; the provider collection paths are unchanged. The final visible-label-only CSS adjustment passed a new build, targeted independent viewport review, and local/hosted smoke after the complete browser run.

The dated sections below are historical verification of prior releases.

## Clear Signal production acceptance

The approved design is integrated and deployed. Five independent triple-review rounds are tracked in [design/ITERATIONS.md](design/ITERATIONS.md); the final clarity, technical, and audience/visual gates all returned **SHIP with no material findings**. Core corrections pass **52 unit/contract checks, TypeScript, and production build**. The main session's final complete browser run passed **106 tests**, with **10 intentional duplicate/device-specific skips**. A subsequent one-line X-filter target correction passed production build, six-width responsive checks, and 31-state accessibility checks with no failures.

**Worker version for that release:** `cb2b942a-dea4-4d1b-a929-5dc52e53dcf1`. Hosted desktop/mobile smoke passed health, actual CSP, eight labeled sample profiles, details/Escape, shortlist, collection-status CSV, human/agent setup handoffs, and visitor-key dialog. No browser exceptions, horizontal overflow, external font requests, or attempted paid API calls occurred. The latest smoke evidence is at [hosted-release-smoke.json](design/evidence/hosted-release-smoke.json).

Independent accessibility evidence includes normal/large-text contrast, checked control target sizes, keyboard modal focus/Escape/scrolling, short-height viewports, reduced motion, copy feedback, and key replacement/disconnect lifetime. Final `production-accessibility.json` records zero findings, browser errors, or external font requests. These checks are scoped acceptance evidence, not a WCAG certification.

Current live evidence is in [LIVE_CONTENT_VERIFICATION.md](LIVE_CONTENT_VERIFICATION.md). The bounded original run and explicitly authorized Instagram/LinkedIn follow-up exercised all five profile collectors and the three post collectors, with TikTok native discovery/profile evidence reused from exact-topic snapshots. Initial provider search failures are retained in the report. LinkedIn's empty repost-placeholder attribution defect was fixed and verified freely against captured responses; actual-author live LinkedIn enrichment is not mislabeled as passed. No blanket claim that every topic/zone succeeds is made.

Setup validation includes a clean lockfile install, unit/contract checks and production build in an isolated directory, then local Worker health/assets/sample smoke without Cloudflare login. Provider scraper/SERP/Web Unlocker guide links were fetched successfully. README/in-app copied setup prompt consistency is regression-tested. `npm audit` reported zero vulnerabilities, and the public-source credential-pattern scan reported zero matches.

The non-billable release smoke can be repeated with `node docs/design/verify-hosted.mjs`. It verifies health, actual CSP, sample/details/shortlist/status-bearing CSV, full setup handoffs, visitor-key dialog, self-hosted fonts, and desktop/mobile overflow/errors. Provider calls are blocked. Set `SIGNAL_SCOUT_URL=http://localhost:8787` for local verification; the recorded evidence includes the actual target URL.

The historical content-first release evidence below remains useful for prior deployment checks; it is not the final certification of the redesigned UI.

## Previous content-first release checks

- `npm run check`: **39 unit/integration checks passed**, TypeScript passed, production build passed.
- `npm run test:e2e`: **44 browser tests passed**, covering desktop (1440px), mobile (390px), content-author discovery/ranking, post snapshot pause/refresh/resume, uncertain post reconciliation, terminal post failure fallback, transient polling recovery, topic-only search/legacy history, platform audience labels, explicit agent/human setup guidance, visitor-key clearing, required multi-zone selection, breakpoint widths 360/700/900/1440, and reduced motion.
- Supporting text contrast was measured against workspace backgrounds at **4.5:1 or greater** for the tested hero, bio, usage, card metadata, and results-note selectors. Compact desktop/mobile screenshots show no horizontal overflow.
- Separate read-only reviewer audited orchestration, provenance, recovery, and sample isolation. Reported blockers were fixed and regression-tested; final targeted verdict: **SHIP**.
- A subsequent four-perspective review covered branding, nontechnical onboarding, copywriting, and engineering; changes are documented in [REVIEW.md](REVIEW.md).

Browser flows cover sample exploration, profile details, shortlist persistence, CSV download, filtering, validation, credential-free storage, platform failure isolation, pause-before-enrichment, refresh/resume, uncertain-submission reconciliation, explicit rejection recovery, eventual snapshot availability, queued-platform recovery, sample/live isolation, and removal during an in-flight website scan.

## Content-first release scope

Instagram, LinkedIn, and X now search profiles plus indexed posts without a required “creator” term. Dedicated post collectors resolve actual authors; all topic words must match the collected text. Returned post URLs can be correlated through their requested input when a provider resolves a permalink. Tests cover source-linked email, rejection of unrequested posts, LinkedIn company authors, explicit reposts, and preservation through profile enrichment. CSV now includes relevance labels and matching-post counts.

Official post dataset schemas were rechecked on 2026-10-13: Instagram `gd_lk5ns7kz21pck8jpis`, LinkedIn `gd_lyy3tktm25m4avu764`, and X `gd_lwxkxvnf1cynvib9co`. Each supports collection by URL. Contract tests and browser tests use fixtures; no paid searches, post collection, or website scans were submitted for this release. Real-world relevance improvement has not been benchmarked.

An independent read-only review identified terminal post failure blocking profile enrichment, early candidate truncation, and misleading uncertain-stage timestamps. Corrections preserve candidates on confirmed terminal post failure, keep transient failures on the existing snapshot, rank the full bounded profile set before limiting, distribute the unchanged post budget across topics, and refresh submission timestamps. Regression coverage includes both terminal and transient recovery. Interactive code review returned no requested changes.

The independent targeted follow-up verdict was **SHIP**. Deployed Worker version: `6861c5ac-6f88-404b-9a4c-1041d20e462c`. Hosted desktop/mobile smoke checks passed for HTTP 200 health/assets, CSP, sample results, profile details, key dialog, current cost guidance, and no horizontal overflow or browser exceptions. Repository screenshots were refreshed from the hosted release without entering credentials or dispatching paid requests.

## Earlier real Bright Data verification

Before the content-first release, live discovery and profile enrichment completed for every platform using the developer's visitor-owned key. Native discovery snapshots were reused during adapter verification to avoid duplicate collection. The final verification script required at least one successfully correlated enriched profile per platform.

- **YouTube:** 4 discovered profiles; 4 returned; 0 collection-error records; 2 source-linked public emails; audience counts on 4; websites on 3.
- **Instagram:** 1 discovered profile; 1 returned; 0 collection-error records; no public email; audience count on 1; website on 1.
- **TikTok:** 5 discovered profiles; 5 returned; 0 collection-error records; 1 source-linked public email; audience counts on 5; websites on 4.
- **LinkedIn:** 5 discovered profiles; 5 returned; 0 collection-error records; no public email; audience counts on 4; no website returned.
- **X:** 5 discovered profiles; 5 returned; 0 collection-error records; no public email; audience counts on 5; websites on 4.

These are small contract-validation searches, not email-coverage benchmarks or a guarantee that every returned profile is a suitable influencer. Search results can include brand accounts or weak matches; source evidence enables human qualification.

### Follow-up hosted search-zone verification

After diagnosing a first-active-zone timeout, the hosted app was verified with an explicitly selected working account zone using the topic `ai ugc`. Each platform used one bounded discovery request and one enrichment snapshot, without automatic retries:

- **Instagram:** 1 discovered and successfully enriched profile; no public email.
- **LinkedIn:** 5 discovered and successfully enriched profiles; no public email.
- **X:** 5 discovered and successfully enriched profiles; 1 with public email.

All three completed through the deployed relay. This confirms the discovery/enrichment path with that working zone, not universal availability of every visitor's zone. The user's pre-existing YouTube/TikTok snapshots were not available for this check and were not resubmitted.

Optional Web Unlocker website scanning also returned HTTP 200 through the shipping Worker against a real creator-linked website. No public email was found on that page; no email was fabricated.

## Provider findings

- Web Scraper API triggers use `{ input: [...], limit_per_input: N }`.
- Google scraper jobs accepted discovery requests but remained running beyond 15 minutes. Interactive discovery therefore uses SERP API.
- `/request` with `format: json` can wrap an origin HTTP status plus a JSON-string body. Origin errors must be checked even when the outer response is HTTP 200.
- Provider browser-pool/selector errors occurred during live SERP verification. The app surfaces them and preserves successful terms/platforms. It does not blindly retry paid collection triggers.
- Google legacy `twitter.com` indexing returned useful X profile discovery where `site:x.com` caused selector timeouts. Profiles normalize to `x.com`.
- Native profile schemas vary. Missing follower counts remain null, and unmatched/error rows are explicitly marked partial.

## Hosted/local checks

- Hosted URL: https://signal-scout.yaron-been.workers.dev
- Hosted frontend and `/api/health`: HTTP 200.
- Hosted frontend CSP was confirmed on the actual network response.
- Hosted `/api/connect` authenticated successfully with the developer key; no hosted secret was configured.
- A real hosted browser search completed with **5 YouTube creators and 2 with public email**. Saving a creator and downloading the shortlist CSV succeeded, with no browser exceptions and no key found in browser storage or rendered page text.
- Desktop/mobile screenshots were captured from the deployed app.
- Local Worker and assets run at http://localhost:8787.

## Reproduction

```bash
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
```

Developer-only live captures are ignored under `docs/live-private/`. Credentials remain outside the repository in `~/.config/signal-scout/credentials.env`. End users enter their keys in the UI. Never publish raw captured provider payloads or test-browser storage.
