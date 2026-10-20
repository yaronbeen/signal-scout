# Signal Scout

**Find your people. Follow the signal.**

Discover creators across **YouTube, Instagram, TikTok, LinkedIn, and X**, collect real profile data and public contact emails with Bright Data, and build your next partnership shortlist.

**[Open the app](https://signal-scout.yaron-been.workers.dev)** · **[How it works](#how-it-works)** · **[Run locally](#one-line-setup-for-your-coding-agent)**

![Signal Scout creator discovery workspace](docs/home-desktop.png)

## For marketers

1. Complete the [Bright Data account checklist](#what-your-bright-data-account-needs), then open the app and click **Connect Bright Data**.
2. Paste your own Bright Data API key.
3. Enter 1–3 topics or keywords separated by commas.
4. Choose platforms and a working search zone for Instagram/LinkedIn/X. With multiple zones, select one explicitly. Click **Discover creators**.
5. Inspect the evidence, save the good fits, and export a CSV.

No Signal Scout account. No separate AI key. Your Bright Data account pays for data collection; the app itself is open source.

You can explore the interface without a key using **Explore a sample**. Sample creators and metrics are fictional and explicitly labeled.

### What your Bright Data account needs

- An API key with **Web Scraper API** access and available credits.
- An active, working **SERP API zone** for Instagram, LinkedIn, and X discovery. Create one at [Bright Data → Create an API](https://brightdata.com/cp/web_access/new). Your key must permit account-zone metadata access so the app can list and validate your active zones. With multiple zones, you must choose one explicitly; it never silently selects the first. Active status does not guarantee successful search-engine access.
- Optional: an active **Web Unlocker API** to scan a creator's linked website for public email. This is a separate, user-triggered request.

[Find your API key](https://brightdata.com/cp/setting/users) · [Scraper API guide](https://docs.brightdata.com/products/scrapers/overview) · [SERP setup guide](https://docs.brightdata.com/scraping-automation/serp-api/quickstart) · [Optional Web Unlocker guide](https://docs.brightdata.com/scraping-automation/web-unlocker/quickstart)

If one product is unavailable, other platforms can still complete. Missing emails and metrics stay clearly marked.

### If a search needs attention

- **Choose a search zone:** select the SERP zone you configured for working Google searches. Reconnect after creating a zone to refresh the list. The app does not test or switch zones automatically.
- **Collection is still running:** keep the tab open, or pause local polling and resume the same snapshot. Provider work can continue and incur charges while paused.
- **Submission needs checking:** find the collection in your Bright Data dashboard and add its existing snapshot ID. For an unresolved SERP response, review usage before explicitly authorizing a new paid search.
- **Partial profile or no public email:** inspect available source evidence. A missing email is not fabricated, and a public address is not mailbox-verified.
- **Before closing the tab:** export useful results and retain snapshot IDs. Shortlists/history are saved in this browser, but current results and job references are tab-local.

## One-line setup for your coding agent

Paste this into **Claude Code, OpenCode, or Cursor**:

```text
Clone https://github.com/yaronbeen/signal-scout and read AGENTS.md. Check Git and Node.js 22+; explain or install missing prerequisites with my permission. Run npm ci and npm run check, start npm run dev as a persistent process, verify http://localhost:8787/api/health has ok: true, and open http://localhost:8787. Then give me the human setup steps: create a Bright Data account with available credits and Web Scraper API access, enable a SERP API zone for Instagram/LinkedIn/X, optionally enable Web Unlocker for website email scans, enter my key only in the app, and select a working search zone. Explain that connecting checks account metadata, not whether every paid service works. Keep the server running; after refresh I reconnect my key and resume existing jobs. Resume can start separately billed post or profile collection; it does not repeat submitted snapshot jobs. Current results and job references last for this browser tab; export results and keep snapshot IDs before closing it. Do not request my key in chat, store it, configure a hosted key, or submit paid test searches without asking me. No Cloudflare login is needed locally.
```

The agent handles setup; you enter your API key in the browser. Never paste the key into the agent prompt.

### Your steps after the agent finishes

1. Complete the [Bright Data account checklist](#what-your-bright-data-account-needs): credits, Web Scraper API access, and a working SERP API zone. Web Unlocker is optional.
2. Open http://localhost:8787 and click **Connect Bright Data**. Enter your key only in the app.
3. Choose your search zone for Instagram, LinkedIn, and X, then choose topics/platforms and depth. Connecting checks account metadata, not product permissions, balance, or search-zone health.
4. Keep the local server running. After a refresh, reconnect your key and resume existing jobs. Resume checks submitted snapshots and can start separately billed post/profile stages. Export results and keep snapshot IDs before closing the tab; current results and job references are tab-local.

### Visiting the live website

No installation is required. Every visitor supplies their own key and pays for their own Bright Data usage. The tab keeps the key in memory and sends it over HTTPS through the website’s stateless relay to Bright Data. The application does not save it or provide a shared owner key. Refreshing clears the key; reconnect in the same tab to resume existing jobs. Resume can start separately billed post/profile stages. Closing the tab clears the key and may lose current results and job references, while provider jobs can continue. Export results and keep snapshot IDs before closing. Sample mode needs no key.

### Manual local setup

Install [Node.js 22 or newer](https://nodejs.org/) and [Git](https://git-scm.com/downloads), then:

```bash
git clone https://github.com/yaronbeen/signal-scout.git
cd signal-scout
npm ci
npm run check
npm run dev
```

Open **http://localhost:8787**. Works on Windows, macOS, and Linux. No Docker, Python, database, or environment file required.

Keep the terminal/server running while using the app. Connect your Bright Data key in the browser and choose a working search zone for Instagram, LinkedIn, and X. A Cloudflare account/login is only needed to deploy publicly. Sample mode needs no key; live collection requires provider access and available credits. After a refresh, reconnect your key to resume the saved snapshot jobs; subsequent post/profile stages may be separately billed. Keep the tab open or export results and retain snapshot IDs before closing it.

## What you get

- Five-platform discovery with independent progress.
- Names, bios, public audience counts, profile links, and websites.
- Public emails with the URL they came from.
- Keyword-match evidence explaining why a creator surfaced.
- Per-platform filters, name/bio search, audience minimum/maximum, email availability, matched topics, and matching collected posts.
- Browser-saved shortlists and recent briefs; save filtered results in one click and add personal notes to saved creators.
- CSV export with contacts, provenance, profile-collection status, collection dates, and shortlist notes.
- Pause/resume without resubmitting existing snapshots; later post/profile stages may be separately billed.
- Responsive Clear Signal workspace with Bright Data-inspired colors, evidence-led creator cards, restrained motion, reduced-motion support, and self-hosted fonts.

The app is MIT licensed; bundled Geist fonts retain their [SIL Open Font License](public/fonts/Geist-OFL.txt).

### Data quality

Public email discovery is not mailbox verification. Some creators publish no email. Keyword matches are research signals, not a prediction of audience fit or campaign performance. Follower counts are platform-specific; they are not unique reach across platforms. Review source evidence before choosing a partner.

Profile state is retained per creator: pending means profile collection has not completed; partial means it failed or returned no usable profile; complete means a matching profile was returned. Older saved records without a collection state remain unknown. Saving a candidate or discarding job references does not turn it into a completed profile. No-email wording applies to completed collection, not unfinished research.

Search depth offers **5, 10, 20, 50, 100, or 250 candidates per platform**. Across all five platforms, 100 allows up to 500 profiles and 250 allows up to 1,250. YouTube/TikTok content discovery is capped at the selected depth per keyword. Instagram/LinkedIn/X paginate both profile and content searches: each query reads up to `ceil(depth / 20)` ten-result pages, bounded to 48 total search pages per platform across all keywords. They collect up to the selected depth of discovered posts per platform, then enrich up to that depth of profiles. Search, post collection, and profile collection are separate paid stages. Depth is a ceiling, not a promise of that many results; duplicates, indexing, and topic matching can reduce counts. The selected depth never expands automatically.

## How it works

The React frontend talks to a small same-origin Cloudflare Worker. The Worker validates requests and forwards **your key** to Bright Data. Scraping stays with Bright Data.

- **YouTube:** discover videos by keyword → deduplicate channels → collect channel profiles.
- **TikTok:** discover posts by keyword → deduplicate creators → collect profiles.
- **Instagram, LinkedIn, X:** Bright Data SERP profile/content searches → dedicated post collectors identify matching authors → deduplicate and prioritize authors with matching posts → platform-specific profile scrapers.
- **Optional contact scan:** explicitly fetch a linked public website through Bright Data Web Unlocker → extract visible public email.

Long-running scrapers return snapshot IDs. The browser polls short status requests rather than holding open a server connection. Successful platforms keep their results even if another platform fails.

Larger SERP searches run in batches of at most six pages, saving completed pages before requesting the next batch. Pause/resume continues from that point; an unresolved batch needs explicit authorization before repeating it. Snapshot downloads stream NDJSON and discard unused fields such as video transcripts and comments, keeping creator evidence and contact provenance within bounded memory.

### Discovery and platform filters

YouTube and TikTok use keyword content searches, then collect the channels/creators behind those results. Instagram, LinkedIn, and X search Google-indexed profiles and posts through the visitor's SERP zone without requiring “creator” in the query. Dedicated platform post collectors read discovered posts and identify the returned authors; LinkedIn company authors and explicit reposts are excluded from content-author discovery. X discovery uses Google's legacy `twitter.com` index and normalizes identities to `x.com`. Google indexing and bounded samples can miss relevant people. There is no dedicated hashtag discovery mode or exhaustive scan of a creator's content.

Every word of a topic must appear as a whole word in one name, bio, or evidence item; order need not be exact. Collected matching posts rank above profile-topic and search-only matches, with post dates used to break otherwise equal scores. Cards and CSV distinguish matching posts, profile matches, and search-only evidence. Source links and available post dates appear in creator details. Google snippets are not proof of a profile bio match, and post evidence is not an audience-quality score.

Results share one shortlist/export workflow, with platform tabs and counts. Audience filters say subscribers for YouTube, followers for individual other platforms, and followers/subscribers for the combined list. They are reported counts, not equivalent unique reach across networks.

Filters are grouped in one responsive panel. A radar loading state identifies active collection for the selected platform instead of presenting unfinished results as “no matches.” Paused work and collection errors show recovery guidance without animation. The radar respects reduced-motion preferences and does not imply a percentage complete.

Audience bounds are inclusive; blank means unbounded. Unknown counts are excluded when either bound is set. Matched-topic filtering uses recorded keyword evidence; combining it with “Has matching collected post” requires collected content matching that specific topic. Filters and bulk saving never collect additional data or spend credits. Notes are saved explicitly in creator details, stay separate from collected profiles, and are included in CSV exports. Browser-local notes remain available if a creator is removed and later saved again; clearing site data removes them. Different creators' notes save independently across tabs; reload to see another tab's changes. For simultaneous edits to the same creator, the last save wins. Notes from the earlier shared-map format remain readable; new writes do not rewrite that map. Reload older tabs after updating the app before saving notes.

### Key and storage behavior

- The key is kept **in memory for the current tab** and sent only in Authorization headers to the app's API and Bright Data.
- No server database, hosted owner key, or API-key browser persistence.
- Shortlists and recent briefs use local browser storage.
- Current results and pending job references use tab-local session storage; reconnect your key after refresh to resume. They are not reliably retained after tab closure. Export results and keep snapshot IDs before closing.
- Browser-local research can include public contact information. Use CSV export to retain it elsewhere.
- Pausing stops local polling. Already submitted Bright Data jobs may continue and be billed. Discarding a job reference does not cancel the upstream job.
- A lost search response is never replayed automatically. Check Bright Data usage before explicitly authorizing another paid search. Unresolved job references remain until you discard or reconcile them.

## Deploy to Cloudflare

The app uses Cloudflare Workers with static assets and is designed for the Workers free tier. Bright Data usage and any hosting above free-tier limits are separate.

```bash
npm ci
npx wrangler login
npm run deploy
```

Your API key is **not** a deployment secret. Each visitor connects their own key. The same code serves the hosted app and local version.

Change `name` in `wrangler.jsonc` to deploy under another name. See [deployment notes](docs/DEPLOYMENT.md).

## Development and testing

```bash
npm run check                # unit/integration tests, typecheck, production build
npx playwright install chromium
npm run test:e2e             # desktop and mobile user flows
```

For fast frontend iteration, run `npm run dev` in one terminal and `npm run dev:ui` in another. Vite proxies `/api` to the local Worker.

Tests cover bounded inputs, URL identity, email provenance, unknown metrics, API errors, credential handling, spreadsheet-safe CSV, partial platform failure, shortlists, filters, and responsive flows. Live verification is documented in [docs/VERIFICATION.md](docs/VERIFICATION.md).

The Clear Signal redesign and reliability fixes are described in [release notes](docs/design/RELEASE_NOTES.md), with [four triple-review iterations](docs/design/ITERATIONS.md) and explicit [live stage coverage](docs/LIVE_CONTENT_VERIFICATION.md).

## Repository consolidation

This app was informed by these existing projects:

- [bright-data-youtube-outreach](https://github.com/yaronbeen/bright-data-youtube-outreach)
- [bright-data-instagram-outreach](https://github.com/yaronbeen/bright-data-instagram-outreach)
- [bright-data-tiktok-outreach](https://github.com/yaronbeen/bright-data-tiktok-outreach)
- [bright-data-linkedin-outreach](https://github.com/yaronbeen/bright-data-linkedin-outreach)
- [bright-data-twitter-outreach](https://github.com/yaronbeen/bright-data-twitter-outreach)
- [youtube-channel-finder](https://github.com/yaronbeen/youtube-channel-finder)
- [bright-data-google-search-scraper](https://github.com/yaronbeen/bright-data-google-search-scraper)
- [bright-data-invisible-to-ai](https://github.com/yaronbeen/bright-data-invisible-to-ai)

The consolidated application adds keyword discovery to the known-profile enrichment tools and ports their useful patterns into a shared browser/edge workflow.

## License

MIT. Fonts are distributed under their included SIL Open Font Licenses.
