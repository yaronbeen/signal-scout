# Deployment and operation

## Local
Node 22+, `npm ci`, `npm run dev`, open `http://localhost:8787`.

The local server and hosted deployment use the same Worker and built assets. No extra runtime services. The API key is entered in the UI.

## Cloudflare
`npx wrangler login`, then `npm run deploy`. No key secrets, KV, D1, queues, or Durable Objects are required.

`wrangler.jsonc` serves static assets and routes `/api/*` to the Worker. API responses are not cacheable. Static assets have a CSP, frame protection, no-referrer policy, and no external font requests.

## Troubleshooting
- **401:** reconnect with a current Bright Data key.
- **403:** check key product permissions.
- **409 on search discovery:** enable an active SERP API for Instagram/LinkedIn/X, reconnect, and select its name in the search form.
- **Search zone timeout/origin error:** active status does not prove search-engine access. Check the named zone’s configuration and usage; select another working account zone if available. Paid search retries require explicit authorization; no automatic failover.
- **No website scan available:** enable a Web Unlocker zone; optional profile email extraction still works.
- **429:** wait at least a minute. Do not repeatedly retry.
- **Slow profile scraper:** pause/resume the existing snapshot; the Bright Data dashboard shows its status.
- **Trigger timeout:** check the Bright Data dashboard before starting again. The job may already have been submitted.
- **Missing email:** the creator may not publish one. Inspect the profile or linked public website.
- **Missing results:** loosen keywords or choose another platform. SERP discovery uses a bounded first-page sample.
- **Browser storage unavailable:** keep the tab open and export results; browser-local persistence may be blocked.

## Rollback
Use Cloudflare Workers deployment history to roll back to a prior version. There is no server-side user-data migration.

## Privacy and operation
No server database or cross-user contact cache. Cloudflare handles network access logs; application code does not log keys, request bodies, or profile payloads. Search progress and snapshot IDs are shown in the user's browser. Do not add analytics that captures input or credentials.
