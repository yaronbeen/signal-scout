# Release verification — 2026-10-13

## Automated checks

- `npm run check`: **31 unit/integration checks passed**, TypeScript passed, production build passed.
- `npm run test:e2e`: **30 browser tests passed**, covering desktop (1440px), mobile (390px), explicit agent/human setup guidance, visitor-key clearing, account search-zone selection, breakpoint widths 360/700/900/1440, and reduced motion.
- Separate read-only reviewer audited orchestration, provenance, recovery, and sample isolation. Reported blockers were fixed and regression-tested; final targeted verdict: **SHIP**.
- A subsequent four-perspective review covered branding, nontechnical onboarding, copywriting, and engineering; changes are documented in [REVIEW.md](REVIEW.md).

Browser flows cover sample exploration, profile details, shortlist persistence, CSV download, filtering, validation, credential-free storage, platform failure isolation, pause-before-enrichment, refresh/resume, uncertain-submission reconciliation, explicit rejection recovery, eventual snapshot availability, queued-platform recovery, sample/live isolation, and removal during an in-flight website scan.

## Real Bright Data verification

Live discovery and profile enrichment completed for every platform using the developer's visitor-owned key. Native discovery snapshots were reused during adapter verification to avoid duplicate collection. The final verification script required at least one successfully correlated enriched profile per platform.

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
