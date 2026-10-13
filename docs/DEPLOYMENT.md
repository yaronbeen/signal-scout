# Deployment and operation

## Local
Node 22+, `npm ci`, `npm run dev`, open `http://localhost:8787`.

The local server and hosted deployment use the same Worker and built assets. No extra runtime services. The API key is entered in the UI. Keep the server and browser tab open during research. Refresh clears the key but preserves tab-local job references; reconnect to resume. Later post/profile stages may be separately billed. Closing the tab may lose current results and references while provider jobs continue; export and retain snapshot IDs first.

## Cloudflare
`npx wrangler login`, then `npm run deploy`. No key secrets, KV, D1, queues, or Durable Objects are required.

`wrangler.jsonc` serves static assets and routes `/api/*` to the Worker. API responses are not cacheable. Static assets have a CSP, frame protection, no-referrer policy, and no external font requests.

## Troubleshooting
- **401:** reconnect with a current Bright Data key.
- **403:** check key product permissions. If the key connects but account metadata is unavailable, the app cannot establish whether search zones exist; use a key with account-zone metadata access and reconnect. A restricted metadata response is not proof that no zone is configured.
- **409 on search discovery:** enable an active SERP API for Instagram/LinkedIn/X, reconnect, and select its name in the search form.
- **Search zone timeout/origin error:** active status does not prove search-engine access. Check the named zone’s configuration and usage; select another working account zone if available. Paid search retries require explicit authorization; no automatic failover.
- **No website scan available:** enable a Web Unlocker zone; optional profile email extraction still works.
- **429:** wait at least a minute. Do not repeatedly retry.
- **Slow profile scraper:** pause/resume the existing snapshot; the Bright Data dashboard shows its status.
- **Trigger timeout:** check the Bright Data dashboard before starting again. The job may already have been submitted.
- **Missing email:** the creator may not publish one. Inspect the profile or linked public website.
- **Missing results:** review source evidence and try clearer topics or another platform in a new search. SERP discovery uses one profile page and one content page per topic; collected posts and profiles are bounded by depth. No exhaustive topic coverage is implied.
- **Browser storage unavailable:** keep the tab open and export results; browser-local persistence may be blocked.

## Rollback
Use Cloudflare Workers deployment history to roll back to a prior version. There is no server-side user-data migration.

## Release verification

Run `npm run check` and `npm run test:e2e` against a fresh local build. When rebuilding assets underneath Wrangler, restart the dev Worker if its asset manifest is stale rather than interpreting HTTP 404 assets as a UI failure. After deployment, run `node docs/design/verify-hosted.mjs` for the non-billable desktop/mobile release smoke. It blocks provider calls and records the actual target URL, CSP, sample/setup/export flows, and browser-error/overflow results under `docs/design/evidence/`.

## Privacy and operation
No server database or cross-user contact cache. Cloudflare handles network access logs; application code does not log keys, request bodies, or profile payloads. Search progress and snapshot IDs are shown in the user's browser. Do not add analytics that captures input or credentials.
