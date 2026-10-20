---
date: 2026-10-20
problem_type: ui_bug
component: filtered results collection state
root_cause: global_loading_instead_of_platform_state
severity: medium
tags: [loading, filters, pause, concurrency, reduced-motion]
---

# Empty filtered results are not a terminal collection outcome

## Problem

When one platform returned profiles while another was still collecting, selecting the unfinished platform displayed “No creators match these filters.” Zero visible rows was treated as a completed outcome without checking relevant job state.

## Correction

In discovery, derive relevant jobs from the selected platform. Display the radar only when the search is running and a relevant job is in `discovering` or `enriching`. Saved/paused work gets a nonanimated recovery message; errors get an attention message; terminal empty results can state that no creators were returned. Shortlist filters do not inherit discovery loading.

The first implementation excluded only terminal phases. Review found that a paused platform becomes `idle` while another outstanding discovery request can keep global `running` true. An explicit active-phase allowlist avoids that false spinner.

## Regression

The loading browser suite checks desktop/mobile active, paused, empty, error, reduced-motion and responsive filter states. Its cross-platform regression holds Instagram's discovery response, pauses YouTube polling, and requires the YouTube radar to disappear before releasing Instagram. No paid requests are needed. Eight scoped tests and the full 142-test browser run passed, with ten intentional viewport-specific skips.

## Prevention

Qualify loading by the entity and phase being displayed, not by zero rows or global activity alone. Never animate paused, failed, restored-but-not-resumed, or unrelated saved-list state.
