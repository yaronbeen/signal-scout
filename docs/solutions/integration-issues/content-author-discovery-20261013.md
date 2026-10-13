---
date: 2026-10-13
problem_type: [integration_issue, logic_error]
component: discovery and post normalization
root_cause: [wrong_query, loose_matching, missing_content_evidence]
severity: medium
tags: [brightdata, serp, authors, relevance, snapshots]
---

# Find topic authors through collected posts

## Problem

Profile searches requiring `[topic] creator` missed people who write about a topic without describing themselves as creators. A multiword topic could match just one word, and profile collection alone did not establish authored-content relevance.

## Solution

Search two bounded Google results pages per topic through the visitor's SERP zone: profiles and posts. Collect a bounded set of post URLs through dedicated Instagram, LinkedIn, and X datasets. Require a returned author identity and all topic words in the post text before adding content evidence. Then deduplicate, rank matching authors ahead of weaker evidence, and enrich the selected profiles.

```text
Before: site:linkedin.com/in Meta ads creator -> profiles
After:  profile search + post search -> collected post text/author -> profiles
```

Use explicit evidence labels rather than confidence scores. Preserve returned source URLs and dates. Reject company-profile authors and explicit reposts in post-author discovery; do not qualify authors using comments or quoted-post text.

## Provider pitfalls

- LinkedIn's documented author URL field is `use_url`.
- Instagram and X can return `user_posted` as a username; validate it before constructing the canonical profile URL.
- Providers can resolve a feed/reel URL to a different post permalink. Match the returned URL or its explicit requested input against the bounded requested list; retain the returned source URL.
- URL-based post collectors do not provide arbitrary native keyword discovery. Google indexing remains a coverage limit.

## Recovery and spend limits

Persist `posts-ready`, submitted `posts`, and uncertain post-stage descriptors before/after dispatch. A lost trigger response requires dashboard reconciliation; resuming polls the existing snapshot instead of repeating paid search or collection. Keep profile candidates when a post stage fails. Disclose two SERP pages/topic, up to depth posts/platform, and up to depth enriched profiles/platform as separate paid stages.

Only a confirmed failed/canceled post status permits advancing preserved candidates to profile enrichment. Transient network errors retain the post snapshot. Sort the full bounded profile set before applying depth; round-robin the existing post budget across topics so the first topic cannot monopolize collection.

## Verification

Fixture tests validate attribution, whole-word topic matching, permalink correlation, source emails, repost exclusion, and limits. Desktop/mobile browser flows validate ranking plus uncertain/pending post recovery without duplicate dispatch. Real-world relevance gains require a separately authorized paid benchmark.

## Related

- [Account-specific SERP zone timeouts](active-serp-zone-timeouts-20261013.md)
- [Architecture](../../ARCHITECTURE.md)
