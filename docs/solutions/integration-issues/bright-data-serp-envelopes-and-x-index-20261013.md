---
date: 2026-10-13
problem_type: integration_issue
component: worker/index.ts
root_cause: provider_response_contract
severity: high
tags: [bright-data, serp, x, origin-envelope]
---

# Decode origin status/body and use legacy X search indexing

## Problem
SERP calls returned outer HTTP 200 without readable organic results. X-specific searches repeatedly failed while other platform queries worked.

## Symptoms
- `The search API returned no readable organic results.`
- Origin status 502 behind outer HTTP 200, including browser-pool and selector errors.
- `site:x.com AI tools creator` yielded a selector timeout; equivalent legacy `site:twitter.com` returned ten organic results.

## What did not work
The Google scraper accepted requests but did not finish within the interactive wait budget. SERP `format: raw` produced an empty body on some origin errors. Treating the envelope as the parsed search result hid the actual response contract.

## Solution
Send SERP requests using `format: json` and `brd_json=1`. Check the envelope's `status_code`, decode its JSON-string `body`, then inspect `organic`. Use `site:twitter.com` for X discovery and canonicalize both legacy/new profile hosts to `https://x.com/<handle>`.

```ts
if (typeof envelope.status_code === 'number') {
  if (envelope.status_code >= 400) throw upstreamError(envelope.status_code, '');
  return typeof envelope.body === 'string' ? JSON.parse(envelope.body) : envelope.body;
}
```

## Prevention
Keep contract tests for successful envelopes, origin errors behind HTTP 200, partial keyword failures, and profile-host normalization. Preserve submitted snapshot IDs, never automatically replay an uncertain paid trigger, and use bounded independent platform pipelines.

Related: [architecture](../../ARCHITECTURE.md), [verification](../../VERIFICATION.md).
