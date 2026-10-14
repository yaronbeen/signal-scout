---
date: 2026-10-14
problem_type: [integration_issue, logic_error]
component: discovery, browser checkpoints, snapshot downloads
root_cause: [request_limits, missing_validation, response_size]
severity: medium
tags: [bright-data, pagination, resume, ndjson, search-depth]
---

# Scaling discovery beyond 20 creators per platform

## Problem

The selector, Worker validation, and saved-search validator independently capped depth at 20. Google-backed discovery read only a profile page and a content page per topic, regardless of depth.

## What did not work

Raising accepted depths and dispatching all Google pages in one request exposed connection queuing and timeout risks. Saving a completed search batch as `discover` with no snapshot also failed restoration: the old validator required a snapshot for every discovery job. The new browser recovery test exposed the dropped checkpoint.

Full video results can exceed the old 8 MB response buffer because transcripts and comments are much larger than the creator fields used by this app.

## Solution

- Share supported depths (5, 10, 20, 50, 100, 250) through `src/limits.ts`.
- Paginate profile and content queries with a total ceiling of 48 pages per platform. Dispatch at most six pages per browser-to-Worker request.
- Save accumulated records, the next offset, failures, and candidates before dispatching another batch. Preserve an uncertain batch until the user explicitly authorizes repeating it.
- Restore validated snapshot-free SERP checkpoints while continuing to require snapshots for native discovery.
- Stream NDJSON snapshot downloads, prune fields unused by `src/data.ts`, and retain bounded record, network, and output sizes. JSON control responses must remain pending even with whitespace or trailing newlines.
- Increase the bounded input allowance to 128 KB for larger profile/post URL batches.

## Verification and prevention

`npm run check` covers batch budgets, 250-URL requests, saved checkpoints, oversized raw snapshots, and pending-response formatting. `test/e2e/depth.spec.ts` checks 100 creators through discovery/enrichment/refresh on desktop and mobile, plus resuming at a saved offset after a later batch fails. Provider calls are mocked; these checks do not establish live provider yield or hosted performance.

When adding new creator-normalization fields, update the retained field set in `worker/snapshot.ts`. When adding stages or checkpoint shapes, test both their persistence and restoration, not just their initial submission.
