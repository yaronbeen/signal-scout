# Release verification — 2026-10-13

## Clear Signal production acceptance

The approved design is integrated and deployed. Five independent triple-review rounds are tracked in [design/ITERATIONS.md](design/ITERATIONS.md); the final clarity, technical, and audience/visual gates all returned **SHIP with no material findings**. Core corrections pass **52 unit/contract checks, TypeScript, and production build**. The main session's final complete browser run passed **106 tests**, with **10 intentional duplicate/device-specific skips**. A subsequent one-line X-filter target correction passed production build, six-width responsive checks, and 31-state accessibility checks with no failures.

**Current deployed Worker version:** `cb2b942a-dea4-4d1b-a929-5dc52e53dcf1`. Hosted desktop/mobile smoke passed health, actual CSP, eight labeled sample profiles, details/Escape, shortlist, collection-status CSV, human/agent setup handoffs, and visitor-key dialog. No browser exceptions, horizontal overflow, external font requests, or attempted paid API calls occurred. Evidence: [hosted-release-smoke.json](design/evidence/hosted-release-smoke.json).

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
