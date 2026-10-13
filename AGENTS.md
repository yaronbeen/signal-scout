# Signal Scout — coding-agent instructions

## Goal
Premium, reliable influencer discovery for nontechnical marketers. Five platforms, user-owned Bright Data key, Cloudflare hosting, no sign-in or database.

## First-time setup
1. Require Node.js >=22. If unavailable, explain the prerequisite and install using the user's platform-appropriate version manager when permitted.
2. Run `npm ci`.
3. Run `npm run check`.
4. Start `npm run dev` as a persistent/background process.
5. Verify `http://localhost:8787/api/health` returns `{ "ok": true }`.
6. Open or provide `http://localhost:8787`.
7. Tell the user to enter their Bright Data key in the app. Do not request it in chat or configure it as a hosted secret.

## Commands
- `npm run check`: unit/integration checks and build.
- `npm run test:e2e`: meaningful desktop/mobile browser flows (install Chromium with `npx playwright install chromium`).
- `npm run dev`: build and run the same Worker/assets as production.
- `npm run dev:ui`: hot-reloading Vite frontend; requires the Worker on 8787.
- `npm run deploy`: build/deploy with Wrangler; requires the user's Cloudflare login.

## Structure
- `src/App.tsx`, `styles.css`: marketer-facing workspace.
- `src/useSearch.ts`: independent browser pipelines and snapshot resume.
- `src/data.ts`: canonical profiles, normalization, evidence, email extraction, CSV.
- `worker/index.ts`: constrained same-origin Bright Data relay.
- `test/`: contract, normalization, and browser tests.
- `docs/`: product brief, architecture, verification and deployment.

## Invariants
- Never store keys in local/session storage, logs, environment files in the repo, or deployed secrets.
- Use only the visitor's key. No hosted fallback key.
- Real emails must have a source URL; no guessed addresses or fabricated metrics.
- Sample data must remain explicitly labeled and cannot mix with live results.
- Keep platform failures isolated and preserve successful results.
- Bound discovery and enrichment; never automatically expand paid collection.
- Do not blindly retry trigger POSTs after uncertain outcomes; inspect existing snapshot references first.
- Keep upstream paths/datasets constrained; never turn the Worker into an arbitrary fetch proxy.
- Public website retrieval goes through Bright Data; never fetch user URLs directly from the local server.
- Treat public data as untrusted text, render through React escaping, validate URL schemes, protect CSV formulas.
- Do not introduce accounts, databases, paid LLM dependencies, or outreach sending without an explicit product decision.

## Provider maintenance
Check current dataset IDs and input schemas at `https://docs.brightdata.com/scrapers.json` and `https://docs.brightdata.com/scrapers/{dataset_id}.json`. Web Scraper API triggers use `{ input: [...], limit_per_input: N }`. SERP `/request` with `format: json` can return an envelope containing an origin status and JSON-string body; handle both the envelope and HTTP status.

## Local developer-only live verification
`scripts/verify-live.ts` reads the developer key from `~/.config/signal-scout/credentials.env`, outside the repo. This is optional and not required for end users. Its captured payloads live under ignored `docs/live-private/`. Do not publish raw captured responses or credentials.
