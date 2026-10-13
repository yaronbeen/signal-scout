# Brief: Signal Scout

## Problem
In-house and agency marketers need relevant creators and usable public contact information across platforms. Existing tools are scattered, largely command-line based, and some require known profile URLs rather than discovering creators from a brief.

## Users
Nontechnical growth, SaaS, technology, and e-commerce marketers, both in-house and agency-side. Their current workaround is operating individual platform scripts and consolidating CSVs.

## Solution Summary
A premium, fast-to-understand influencer research app: enter topics, choose platforms, discover creators, inspect evidence, save a shortlist, and export it. Each visitor supplies their own Bright Data key. The same application runs locally and on Cloudflare.

## Scope
**In:**
- YouTube, Instagram, TikTok, LinkedIn, X.
- Topic inputs; editable discovery terms; bounded depth.
- Profile enrichment, public email extraction with source provenance, public contact alternatives.
- Independent platform progress, partial results, explicit missing data and actionable failures.
- Browser-local shortlists, filtering, CSV export, clearly labeled sample mode.
- Responsive premium UI, automated integration tests, real end-to-end validation.
- Public GitHub repository, free-tier-friendly Cloudflare deployment, single coding-agent setup prompt.

**Out:**
- Email sending, team accounts, CRM integrations, paid model dependencies, persistent server-side user data.

## Constraints
- Free application stack and hosting where practical; Bright Data usage is charged to the visitor's account.
- No sign-in; never persist the visitor's API key.
- Small searches by default; never silently initiate larger collections.
- Keep architecture and installation simple.

## Success Criteria
- A marketer can start a search with a Bright Data key and topics without editing code.
- Each of five platform paths is verified with real API responses before claiming launch readiness.
- Every displayed email has a public source; missing metrics remain missing.
- One platform's failure preserves other results.
- Shortlist, export, desktop, mobile, and local installation flows pass verification.

## Edge Cases & Risks
- Expired key, missing scraper/zone permissions, rate limiting, slow collections, malformed snapshots.
- Some existing tools enrich known profiles but do not discover profiles by topic.
- Public emails are sparse; email syntax and provenance do not establish deliverability.
- A topic mention alone does not prove suitable audience, sustained expertise, or influencer quality.
- Browser refresh loses an in-memory key; recoverable job descriptors must exclude credentials.

## Dependencies
- Bright Data Web Scraper API and search discovery capability; Cloudflare Workers/static assets.
- Existing yaronbeen platform tools and youtube-channel-finder frontend as reference.
- Visitor-owned Bright Data key, Web Scraper API access, active SERP API for three-platform search, optional Web Unlocker.

## Resolved provider choices
- YouTube/TikTok use native keyword-to-content discovery; Instagram/LinkedIn/X use bounded SERP profile/content searches, post collection to identify matching authors, then profile enrichment.
- All five platform profile paths have returned real data. Public email availability varies and is not guaranteed.

## Approved visual direction

Clear Signal: an editorial research workspace with horizontal navigation, a split arrival hero/search composer, evidence-led creator cards, and compact results context. Supporting text stays readable; compactness comes from hierarchy rather than tiny type. Bright Data attribution, spend limits, complete setup instructions, partial states, and recovery controls stay visible in the appropriate context. See [the implementation blueprint](design/WORLD_CLASS_REDESIGN.md).
