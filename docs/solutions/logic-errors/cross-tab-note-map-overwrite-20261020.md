---
date: 2026-10-20
problem_type: logic_error
component: browser-local shortlist notes
root_cause: stale_tab_rewrites_shared_map
severity: medium
tags: [localStorage, concurrency, notes, persistence, data-loss]
---

# A stale tab must not rewrite unrelated saved notes

## Symptom and root cause

Open two tabs before either has notes. Save creator A's note in tab one, then creator B's note in tab two. Reload: A's explicitly saved note is gone, even though both saves reported success.

Each tab initialized its own notes map once. Saving rebuilt that whole map from the tab's stale React state and replaced the shared localStorage entry. A successful storage write did not mean unrelated research was preserved.

## Correction

Persist one creator's note per localStorage key through `storeNote`. Independent creators' saves then touch independent keys, including concurrent writes. `savedNotes` reads the original shared map first and overlays validated per-creator entries, leaving legacy data untouched. An explicitly saved empty string must override a legacy note rather than resurrecting it.

There is no live cross-tab state synchronization: reload to see changes; same-creator edits remain last-save-wins. Reload tabs running the older app before saving. Keep failed-write warnings and in-memory export recovery.

## Regression and evidence

The two-tab test in `test/e2e/shortlist-filters.spec.ts` failed before the fix on desktop and mobile. Afterward it covers stale sequential saves, concurrent save attempts, untouched legacy notes, reload, and CSV export. Unit tests cover legacy precedence, clearing, invalid values, and write failure.

Verification: 63 unit/integration checks plus TypeScript/build; 124 browser passes and 10 intentional skips; fresh-context review SHIP. The same two-tab regression passed on deployed production for desktop/mobile, without provider requests.

## Prevention

Do not persist an entire shared collection from tab-local state when the action edits one independent entity. Read-merge-write alone still races between tabs; independent storage keys avoid unrelated-entity replacement without introducing locks or services.
