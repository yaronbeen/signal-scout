---
date: 2026-10-13
problem_type: [integration_issue, logic_error]
component: LinkedIn post author normalization
root_cause: [missing_validation, schema_placeholder]
severity: high
tags: [brightdata, linkedin, repost, attribution, live-verification]
---

# Empty repost metadata is not proof of a reshare

## Problem

The LinkedIn post collector returned successful original posts with valid personal authors, matching text, and dates, but `creatorsFromPosts()` accepted zero authors. The adapter treated every object-valued `repost` field as a real reshare.

## Observed shape

The provider emitted this placeholder on original posts:

```json
{
  "repost": {
    "repost_hangtags": null,
    "repost_attachments": null,
    "tagged_users": null,
    "tagged_companies": null
  }
}
```

Object presence alone was insufficient to determine that content was reshared. The old exclusion was too broad:

```ts
if (r.repost && typeof r.repost === "object") continue;
```

## Correction

Detect recursively meaningful repost content instead of merely object presence. Nulls, blank text, false flags, zero counts, and empty arrays/objects do not prove a reshare. Populated original content/identity/attachment metadata and an explicit repost flag remain exclusion signals. Require returned personal author identity, bounded requested-post correspondence, and matching authored text independently.

## Verification

Sanitized fixtures distinguish empty metadata from actual reposts and preserve dated evidence and profile-contact provenance. Free re-normalization of the two captured real LinkedIn posts produced two authors, two matching dated evidence items, and zero attribution mismatches. No paid trigger or search was repeated for this fix.

This verifies attribution against returned posts. It does not imply newly completed live profile enrichment for every post author; coverage remains recorded per stage in [LIVE_CONTENT_VERIFICATION.md](../../LIVE_CONTENT_VERIFICATION.md).

## Prevention

- Treat optional provider object fields as nullable schemas, not Boolean event indicators.
- Verify the actual populated shape before inferring a semantic state.
- Keep current live captures private and use sanitized regressions publicly.
- Prefer free re-normalization of accepted snapshots over repeating paid work.

## Related

- [Content-author discovery](content-author-discovery-20261013.md)
