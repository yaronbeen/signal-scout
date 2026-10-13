# Four-perspective review and design refresh — 2026-10-13

> Historical review of an earlier release. The later Clear Signal production redesign and triple-review iterations are tracked in [design/ITERATIONS.md](design/ITERATIONS.md); current release checks are in [VERIFICATION.md](VERIFICATION.md).

Four independent read-only reviewers assessed the released app: Bright Data brand marketing, a nontechnical marketer, a copywriting expert, and an engineer. The user subsequently requested Bright Data colors and a more impressive animated design.

## Findings addressed

### Brand marketing
- Full “Powered by Bright Data” attribution now appears in the hero and footer on mobile and desktop, with a provider link.
- Replaced the improvised logo character with clear typographic attribution.
- Added operator identity and explained Bright Data’s role in the connection dialog.
- Adopted the provider’s public website palette: blue `#3d7ffc`, navy `#091b36`, cyan `#15c1e6`, lavender `#9d97f4`. Action backgrounds use a darker blue for readable white text.

### Marketer instructions
- Added account creation, search-API setup, and pricing links directly to onboarding.
- Explained separate search/profile charges and made depth options explicit ceilings.
- Added a direct setup link when the account has no search API.
- Changed the workspace wording to “Saved in this browser.”
- Reset audience filters on navigation and retained accessible navigation during mobile scrolling.

### Copywriting
- Hero now names profile evidence, public email discovery, and shortlist export.
- Recovery wording distinguishes inspecting an existing job from separate paid enrichment.
- Discarding references explicitly explains continued upstream billing and loss of resume links.
- Pending cards distinguish uncollected email/bio from completed missing fields.
- A zero-result collection has outcome wording instead of first-visit promotional copy.

### Engineering
- A paid search now receives an uncertain persisted descriptor before dispatch. Lost responses never automatically repeat SERP discovery.
- Failed uncertainty persistence prevents a paid submission.
- Malformed success bodies and invalid snapshot IDs retain ambiguous-submission protection.
- Jobs no longer disappear solely because they are older than 24 hours.
- Browser requests have a 65-second deadline.
- Only search requests are sequenced; slow profile enrichment no longer holds later platform discovery.
- Open details preserve separately acquired contacts.
- Saving cannot create a mixed sample/live shortlist.

## Motion and responsive design

The discovery illustration has a rotating radar sweep, floating tiles, a pulsing center, and a gentle floating annotation. Cards and dialogs use brief transform/opacity entrances. This is CSS-based, without an additional WebGL dependency. Reduced-motion users receive a static presentation. Mobile receives a compact radar, one-column results, and sticky navigation.

Verified browser widths: 360, 700, 900, and 1440 pixels. Explicit provider attribution remains visible without opening the mobile navigation menu.

## Verification

- 29 unit/integration checks, TypeScript, and production build passed.
- 26 desktop/mobile browser checks passed, including origin 403/429 paid-search uncertainty.
- Follow-up independent targeted review found no remaining blocker in the paid-search guard and confirmed mobile attribution/layout from the recaptured screenshot.
- New regressions cover ambiguous SERP recovery, storage failure before paid trigger, malformed responses, visible provider/setup links, breakpoint overflow, and reduced motion.

## Remaining product limitations

At this historical release, company mode required manually chosen niche/audience terms and keyword badges represented loose text signals. Later releases removed company mode and tightened whole-word topic matching with collected post evidence; neither implies audience quality. Bright Data account prices vary, so pricing is linked rather than an invented fixed search estimate. Browser-based storage is device/tab dependent. Local installation assumes a coding agent or Git/Node familiarity. These are product boundaries rather than guarantees of campaign outcomes.
