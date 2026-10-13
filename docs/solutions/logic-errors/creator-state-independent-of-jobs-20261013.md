---
date: 2026-10-13
problem_type: [logic_error, ui_bug]
component: creator normalization and research UI
root_cause: [derived_state_from_wrong_entity]
severity: high
tags: [profile-status, recovery, shortlist, provenance]
---

# Creator collection status must survive job-reference changes

## Problem

The UI inferred a creator's collection status from whether any pending job existed for that platform. Discarding references or reopening a saved discovery candidate could then display “Collected with Bright Data” or “No email found” without profile collection ever completing. A completed saved creator could also look pending during an unrelated new search.

## Root cause

An orchestration job and a creator's enrichment outcome are different facts. Removing a local polling reference cannot change the result of data collection, and another profile's pending job says nothing about a completed creator.

## Correction

Persist `profileStatus?: "pending" | "complete" | "partial"` on each creator:

- Discovery sets pending.
- A successfully correlated returned profile sets complete.
- A failed, missing, or terminally failed profile sets partial.
- Legacy records with no status remain unknown; no completed migration is invented.

Saving, exporting, merging, reloading, and reference removal retain the creator's actual state. The UI uses failure precedence consistently and only describes no-public-email as a completed collection outcome. Contacts with source URLs remain available independently of profile completeness.

CSV contains contacts and provenance regardless of completeness, plus a `collection_status` column with sample/pending/complete/partial/unknown values. A downstream workflow must use that explicit state rather than interpreting an empty email cell as a completed search.

## Regression coverage

Tests cover normalization and storage of explicit state, pending saved creators after discard/reload, completed creators alongside unrelated same-platform pending work, terminal enrichment becoming partial, and absent legacy state. Recovery still polls existing snapshots without repeating accepted paid triggers.

## Prevention

Store durable outcomes on the entity they describe. Derive temporary process affordances from jobs, but never derive verified collection claims from absence of a job.

## Related

- [Architecture](../../ARCHITECTURE.md)
- [Production review iterations](../../design/ITERATIONS.md)
