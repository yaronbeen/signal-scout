---
date: 2026-10-20
problem_type: logic_error
component: post-author merge and browser shortlist persistence
root_cause: [stale_derived_metadata, unchecked_storage_failure]
severity: medium
tags: [topic-filter, evidence, partial-enrichment, localStorage, recovery]
---

# Preserve evidence-derived topics and warn when automatic saves fail

## Confirmed failures

1. A creator discovered through search for AI tools also authored a collected automation post. Merging the post preserved both evidence items but replaced the topic list with automation alone. Failed or missing profile enrichment never recalculated that list, so topic filters and CSV omitted the search match.
2. A website scan for a saved-only creator displayed a new contact even when writing the updated shortlist failed. No warning explained that reloading would lose it. The automatic profile-refresh save had the same unchecked-write behavior.
3. Malformed browser records could contain an object-valued enrichment error; inherited properties of a notes object could also be treated as notes for prototype-like IDs. Both could crash rendering.

## Small corrections

- Recompute `matchingTerms` against the active keywords immediately after the post-author merge, before relevance sorting and truncation. Do not union old topic arrays in generic merging: current-profile evidence can intentionally supersede an older biography.
- Check both automatic shortlist writes. Preserve the in-memory update and show a persistent export-before-closing alert in the active details dialog and main view. A scan-success message must not hide the persistence warning.
- Put the dialog warning beside the scan feedback and scroll it into view when it appears or the dialog reopens. Relocating it alone was insufficient: the new contact expanded the section and left the warning below the viewport. Desktop/mobile tests assert its bounding rectangle is inside both dialog and viewport before any further scrolling interaction.
- **Unresolved follow-up:** viewport containment is not readability. Independent round-three UX hit-testing showed the sticky success status occludes the export instruction. The next approved iteration should prioritize persistence failure over scan success and assert the warning text is not covered by another element. Automatic iteration stopped at the review limit; do not treat passing geometry tests as UX acceptance.
- Validate optional stored display fields and use own-property note lookups, as CSV already does.

## Executable regressions

Before correction, desktop/mobile tests failed for both partial-enrichment outcomes, missing scan save warnings, and a prototype-like creator ID. The storage unit regression also failed on invalid optional fields.

The fixed tests cover both topics after enrichment error/missing profile, selected-topic collected-post semantics, saved/reloaded CSV, saved-only scan quota failure with note/contact CSV recovery, automatic profile-refresh failure, and a prototype-like ID with a real saved note. Checks passed: 64 unit/integration plus TypeScript/build; complete browser suite 134 passes with 10 intentional viewport skips.

## Prevention

Recalculate derived decision metadata whenever its source evidence changes, not only when a later provider stage succeeds. Every persistence path needs a checked result and a usable recovery action, including background refreshes. Browser-local data still needs shape validation before rendering.

Related: [Cross-tab note map overwrite](cross-tab-note-map-overwrite-20261020.md).
