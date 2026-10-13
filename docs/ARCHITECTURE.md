# Architecture decision record

## 1. Problem and constraints
Deliver premium multi-platform research with BYOK and free-tier hosting. Assume modest interactive use, not unattended bulk crawling. Keys stay in browser memory and travel only to the same-origin API and Bright Data.

## 2. Design space
1. React/Vite + stateless Cloudflare Worker: optimizes cost and local parity.
2. Existing Next.js + long-lived search endpoint: optimizes initial reuse.
3. Python API + React + background worker: optimizes script reuse and durable execution.
4. Worker + database/queues + accounts: optimizes cross-device continuity.

## 3. Tradeoffs
Choose option 1. Next.js held-open polling adds edge deployment friction. Python adds hosting and installation requirements. Queues/accounts add key custody and operations. Stateless requests sacrifice server-side search continuity but permit secure browser-side orchestration and durable upstream snapshots. No database migration or infrastructure lock-in beyond a thin adapter.

## 4. Failure-first analysis
1. Expired credentials (likely/high, loud): map 401 to explicit reconnect.
2. Unsupported discovery schema (medium/high, loud): live-check every adapter.
3. Search discovers irrelevant accounts (likely/high, silent): show matching evidence and editable keywords.
4. Slow upstream collection (likely/medium, loud): poll short requests with elapsed time and bounded waits.
5. One platform failure (likely/medium, loud): independent pipelines and partial results.
6. Missing email (likely/medium, silent): explicit no-public-email state and website links.
7. Duplicate or misattributed creators (medium/high, silent): canonical per-platform profile identity and source preservation.
8. Schema changes (medium/high, silent): normalize defensively; never invent metrics.
9. Accidental excessive spend (medium/high, silent): validated depth and per-platform input caps.
10. Refresh/network loss (medium/medium, loud): recover jobs without persisting keys; avoid blind POST retries.

## 5. Boundaries and invariants
Browser owns brief, orchestration, and local saved lists. Worker owns validated requests and upstream calls. Bright Data owns snapshot processing. Never expose a hosted owner token, store a visitor token, execute arbitrary upstream paths, invent emails, equate followers with connections, or turn unknown into zero.

## 6. Observability and control
Expose platform phase, elapsed time, snapshot reference, records returned, source provenance, and actionable errors. Health endpoint verifies deployment. Worker logs contain status/phase only, no credentials or profile payloads. Cloudflare native request/error metrics suffice initially.

## 7. Reversibility and complexity
Keep provider adapters independent of UI. Standard fetch and ordinary JSON preserve migration options. Browser storage has a versioned schema. Discovery and enrichment are separate bounded actions. Avoid abstractions for hypothetical future providers.

## 8. Adversarial objections
A beautiful mockup is not a validated scraper. No public email coverage guarantee. Brand name is not audience intent. Free hosting is not free upstream data. Missing optional service permissions must be explained before making dependent calls. These are product invariants, not hidden footnotes.

## 9. AI delegation assessment
UI and typed adapters are suitable for AI implementation; live schema validation and credentials remain evidence-driven. Ranking must be explainable literal/topic evidence rather than fictional AI confidence. No extra AI API key required. Do not delegate in this session absent explicit authorization.

## 10. Decision
React/Vite, TypeScript, Cloudflare Worker, short trigger/status/result requests, browser-local storage. Native YouTube/TikTok content discovery and five profile scrapers were validated live. Instagram/LinkedIn/X discovery uses Bright Data SERP profile/content searches, bounded post collection to identify authors, and profile enrichment. One active zone is selected automatically; multiple zones require an explicit visitor choice. Website contact retrieval uses optional Web Unlocker.

## 11. Dependencies
Bright Data is the live-data single point of failure. Cloudflare hosts the app; local mode removes that dependency. Node/npm are installation dependencies only. Exported CSV is the downstream artifact.

## 12. Rollout
Create a new public repo; existing repositories remain reference sources. Validate mock contracts first, then live small-depth searches on every platform, then deploy. Labeled sample mode demonstrates interaction. Rollback through Cloudflare deployment versions; no data migration.

## 13. Threat model
Sensitive data: API keys and public contact information. Restrict API origin/method/body limits, allowlisted dataset actions, snapshot identifiers and URL schemes. Prevent arbitrary proxying, unsafe fetched URLs, injected HTML, spreadsheet formula injection, and leaked error bodies. Do not enable unrestricted CORS.

## 14. Blast radius
Each visitor spends their own credits. A platform is isolated by its pipeline. Hard input limits contain spend and response size. A failed platform does not erase successful ones. Hosted backend has no cross-user records to leak.

## 15. Operations
Own through yaronbeen repository. CI runs typecheck, unit/integration checks, build and meaningful browser flows. Diagnose credential errors, entitlements, snapshot timing, schema drift, and Cloudflare limits using sanitized errors and job references. No DB backups or on-call queue machinery needed.

## 16. Next step
The Google scraper accepted requests but was too slow for interactive discovery. SERP API is used instead, with its entitlement stated in onboarding. Google indexes X under legacy twitter.com; profile identities normalize to x.com. Origin status/body envelopes are decoded independently of outer HTTP status. SERP platforms are sequenced to reduce provider browser-pool pressure; queued descriptors survive pause and refresh.

## 17. Recovery semantics
All selected platform descriptors are saved before execution. Credential-free current results, queued jobs, ready-for-enrichment candidates and submitted snapshot IDs use session storage. Paid trigger POSTs are preceded by an uncertain descriptor. Explicit 4xx rejections may resume the rejected stage; transport failures and 5xx outcomes require dashboard reconciliation and never auto-replay. Pausing prevents the next paid stage but does not cancel already submitted upstream jobs. Sample mode is unavailable during live recovery.

Post collection adds `posts-ready` and `posts` descriptors containing bounded, credential-free post URLs. Uncertain post submissions can be reconciled to the existing snapshot. Resuming post collection preserves prior profile candidates and does not repeat SERP searches or submitted post triggers. Matching post text and returned author identity are required for content attribution; quoted/comment text is not used to qualify an author.

## 18. Clear Signal workspace

The approved redesign uses horizontal navigation, a split first-arrival composer, and an evidence-first results workspace. Results replace the arrival hero with an editable brief ribbon; editing never triggers paid work. Recovery remains independently usable when the composer is hidden, including required explicit zone choice. Complete provider/local setup, tab-local storage lifetime, separate paid-stage disclosures, and honest pending/partial card states are product requirements, not optional visual detail. See [the design blueprint](design/WORLD_CLASS_REDESIGN.md) and [iteration evidence](design/ITERATIONS.md).

## 19. Evidence and state truth

Profile collection state is stored on the creator, independently of a platform's remaining jobs, so saving or discarding references cannot manufacture a completed profile. Unknown legacy state is not treated as success. Content evidence contains actual authored title/caption/post text; profile biography retains a profile source. Relevance previews select supporting evidence rather than the first returned content item. Account connection distinguishes available metadata from restricted metadata; an inaccessible zone list is not proof that no zones exist.
