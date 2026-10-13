# Signal Scout — Clear Signal

**A single visual direction: an editorial creator-research workspace.** Confident navy typography on luminous cool-white surfaces; Bright Data blue for action; cyan and lavender for restrained human warmth. Beautiful because the useful information is beautifully composed, not because the app has more decoration.

Reviewed 13 October 2026. Desktop **1440 × 1000**, mobile **390 × 844**. Source baseline: `96d2805`. Scope: specialist design blueprint and interactive concept, not production implementation.

## The honest diagnosis

The present site is usable, honest, and technically composed, but it does not meet an exceptional aesthetic bar. Changing border colors and spacing will not fix the underlying composition.

1. **The wrong thing owns the space.** A permanent 244px sidebar houses only three destinations and a repeated promotional message. The main page then adds a breadcrumb, an enormous hero, a radar decoration, a search panel and another explanatory section. The result is an admin template dressed as a landing page. **Krug A3, Billboard Design / A7, Home Page:** give the real task the prime space; use a horizontal product masthead and one coherent hero/search composition.
2. **There is a typographic cliff.** The large, very narrow serif headline sits above 9–13px practical content. Elegant type at the top cannot compensate for delicate, undersized product typography below. It reads as two products stitched together. **Krug A2, Users Scan / WCAG D1, Perceivable:** use one distinctive sans family, a deliberate scale, and readable 14–16px controls and body text.
3. **Blue has become wallpaper.** Tinted canvas, tinted panels, tinted chips, tinted evidence, blue labels and fine blue borders flatten the hierarchy. The radar adds yet another pale-blue rectangle. **Krug A3, Billboard Design:** mostly neutral canvas, one raised search surface, navy text, blue only for actions/selected states; cyan/lavender appear as quiet illustration and sample-mode material.
4. **The product hides its most valuable material.** Creator cards put tiny platform labels, generic avatars, chips, metric divisions and two detail links ahead of useful authored evidence. Every card has the same many-part structure, but the reason to care is visually small. **C8, Feature Discoverability / C10, Contextual Information:** enlarge identity and evidence, simplify metadata, make evidence explain relevance rather than decorating it.
5. **The landing page never yields to the work.** Sample results arrive below the full hero and search form. On mobile the user has to travel through the whole landing experience again to orient themselves in results. **C11, Transition Coherence / B3, Flexibility & Efficiency:** keep the same shell, replace the hero with a compact editable brief ribbon, and move focus to results.
6. **Onboarding is visually a document.** Connection starts with a decorative key strip, substantial explanatory text and more tinted boxes. The necessary account/setup/recovery information is present but not given a useful reading order. **A5, Omit Needless Words / B5, Help & Documentation:** key field and account-paid fact first; concise privacy explanation; two clearly named disclosures for setup and recovery.
7. **Mobile scales down the dashboard rather than recomposing it.** Platform names disappear in inactive result tabs; there is a long decorative prelude, small actions and repeated explanatory text. **A1, Don't Make Me Think / D2, Operable:** readable labels, 44px targets, a named platform selector, and an action-led single-column composition.

**Verdict:** core usability passes the basic happy path; visual direction needs substantial work. This is not a broken product. The new design must preserve its unusually good honesty and recovery behavior.

### What genuinely works

- Five-platform choice is explicit; topic input is simple, with useful preset examples.
- Sample mode is clearly fictional and requires no key.
- Public email availability is not presented as verified deliverability.
- Paid stages, provider setup and refresh behavior are disclosed.
- Platform pipelines fail independently and keep useful partial results.
- Live review produced **no page errors and no document horizontal overflow** in the scoped desktop/mobile views.

## The design thesis

### Clear Signal

Think of a well-edited research publication with the precision of premium software. Not a futuristic control room, luxury fashion landing page or collection of floating widgets. The emotional premise is **people worth understanding**. The operational premise is **evidence worth trusting**.

- **Density:** balanced, 5/10. Compact through hierarchy and omission of repeated chrome, never miniature text.
- **Variance:** controlled asymmetry, 6/10. Landing combines left-side purpose with right-side action; results use a predictable two-column comparison grid.
- **Motion:** restrained but highly finished, 4/10. Short entrances, tactile feedback, explicit transitions. Only genuinely running work loops.
- **Signature:** bold two-line navy/blue headline; an offset triptych of original creator illustrations; broad evidence excerpts that read like editorial pull quotes. The human story and the research tool are one visual system.

Use the same language on every screen. The illustrations are demonstrative sample imagery, not manufactured real creators. In live cards, only use returned profile photos; fallback is initials. Never substitute attractive stock photography for a real creator's identity.

### Intentional skill adaptations

The required brand blue/navy/cyan/lavender outranks generic palette restrictions. **Blue remains the sole action accent**; cyan and lavender are material tints, not competing actions. No glow, neon gradient or gradient headline. Software UI is sans-serif throughout. Repeated animation on static controls is deliberately rejected: it undermines readability and implies activity. Symmetry in results is useful for comparison; asymmetric artistry belongs in the landing composition, not arbitrary featured-result rankings.

## Tokens and type

### Color roles

- `--canvas: #F5F7FB` — clean, cool gallery canvas.
- `--paper: #FFFFFF` — primary search surface and creator cards.
- `--ink: #102442` — all primary text and headlines; replaces both pure black and washed-out blue text.
- `--muted: #52627A` — body metadata and explanations, high contrast on white and canvas.
- `--blue: #285FD2` — primary CTA, selection indication, links, visible focus. A calibrated brand-blue implementation value, not a claim that this is Bright Data's official logo color.
- `--blue-hover: #204EAE` — primary hover/active shade.
- `--pale: #EAF0FB` — selected platform controls and interactive hover wash.
- `--line: #DBE2EC` — structural dividers, **not** the sole affordance for controls. Form controls use stronger `#AEBFD4`/`#B7C6D9` borders.
- `--cyan: #D8F2F4` — illustration material and optional positive-contact surface; no cyan body text.
- `--lavender: #E9E7F6` — sample-mode notice and illustration material; sample notice text `#493F66`.
- `--success: #24604C` — semantic public-contact status, always accompanied by text. It means found, not mailbox-verified.
- Error/warning: use existing semantic meanings, with strong readable ink. Amber for uncertain submission; red for actionable errors; never color-only distinctions.

### Typography

**Geist Regular + Geist Semibold**, locally hosted under SIL OFL. A precise contemporary grotesk: short, strong headings and unusually legible product text. Two font weights avoid an unnecessary payload. Use tabular numerals for counts. No serif in the workspace, no ultra-condensed headline, no tiny all-caps labels as decorative filler.

- Landing H1: 66px desktop / 44px mobile; weight 600; line-height 1.06–1.08; tracking −0.05em. `clamp()` between breakpoints; test actual longest copy.
- Results H1: 46px desktop / 36px mobile; line-height 1.1; tracking −0.04em.
- Dialog heading: 26px desktop / 25px mobile; line-height 1.2.
- Creator name: 23px desktop / 22px mobile; weight 600.
- Hero supporting paragraph: 18px desktop / 16px mobile; line-height 1.6; maximum 43ch.
- Evidence excerpt: 16px in cards, 17px in detail; weight 600; line-height 1.4–1.55.
- Body/bio: 14–16px, line-height 1.6–1.65; full bio in detail. Avoid fixed-height clipping unless intentionally line-clamped with complete text available.
- Control/label: 14–16px; mobile text inputs **16px**, preventing iOS input zoom.
- Metadata: 12–13px; 12px minimum for visible utility text. Use 11px only for concept annotation, not product content.

### Geometry

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Internal text rhythm follows 4px; major composition follows 8px.
- Desktop content max-width 1240px; 32–40px gutters; mobile 20px, 16px at 320px.
- Landing grid: approximately 49% copy / 51% form, 64px gutter; start at 42px below masthead.
- Navigation masthead: 88px desktop; mobile 64–76px brand/connect row plus 47px text navigation row. No permanent sidebar.
- Search panel: 20px radius, 24px padding; 16px radius, 18–20px padding mobile. One whisper shadow `0 16px 48px -20px #17365E24`.
- Cards: 16px radius; 23px desktop padding / 18px mobile; 20px grid gap / 16px mobile. Resting cards flat with visible border; no glossy glass.
- Control radius 8–10px; control heights 44px minimum; primary 50px; topic field 58px. Icons 18–20px, consistent stroke 1.65–1.8.
- Portrait: 76 × 85px desktop, 64 × 76px mobile, 12px radius. Crop returned images consistently without inventing full-bleed hero banners.

## Screen-by-screen implementation specification

### 1. First arrival / Discover

**Desktop:** wordmark left, three text destinations in the masthead, outlined `Connect Bright Data` right. Existing navigation remains Discover, Shortlist, Recent searches. Do not imply teams, accounts or cloud-synced workspaces.

The hero/search is a single split composition. Left: small readable category label, `Find your people. / Follow the signal.`, one paragraph naming five-platform discovery, evidence, contacts and shortlist. `Powered by Bright Data` sits directly below at a readable 14px; repeat once in the footer. An original illustration triptych sits below copy, unevenly stepped by 14px. Explicit caption identifies sample illustrations and names LinkedIn and X, so three illustrated tiles cannot imply only three platforms.

Right: immediately usable search composer. Header and `Explore sample` shortcut. Labeled topic input with short placeholder, 1–3 topic limit and three quiet topic examples. All five platform buttons show name, mark and checked state. Search depth uses clear limits, with inline label on desktop. When connected, insert the existing SERP zone field here—not in the connection dialog—and retain multiple-zone selection and explanatory text.

Before CTA: visible `Your account pays for live collection` plus the separate paid-stage fact and depth-is-not-budget distinction. Primary button is the only filled-blue CTA. `Collection limits & pricing` contains the exact existing per-platform discovery/post/profile limits; opening it does not incur spend. `Your own key required. Sample mode needs no key` is visible beneath. No disclaimer removed; disclosure hierarchy replaces a wall of repeated copy.

Below: a simple ruled, unboxed process strip. Three stages of different line length, not three promotional cards with repeated icons. Footer has provider credit and setup guide. No second decorative heading, radar or repeated partnership sales box.

**Mobile:** discard illustration before discarding readable text. Single-column hero, then composer; no decorative interstitial. Keep sample shortcut above the input and all five platform names visible. Wrap platform buttons naturally. Stack depth label and field. The visible spend summary stays before CTA. There is no fixed action obscuring spend information or the keyboard. At 390px the topic field should begin inside the initial viewport; CTA may be below the fold because legible controls and honest spend text matter more than forced compression.

### 2. Sample or live results

Keep the shell but **replace the hero/form with a compact brief ribbon**: topic, selected platforms/depth, Edit search and New search. This is a layout transition, not a new product capability. Edit restores the collected configuration shown by the ribbon; it never triggers paid work. Abandoned new/history/edit drafts cannot silently replace that configuration. New search must continue respecting unresolved jobs.

Feedback belongs to the dialog or page interaction that produced it and must not leak into newly opened dialogs. Textual missing-metric values such as Unknown must fit their own value/label grouping at small widths, rather than colliding with neighboring metrics.

Heading: `Meet your next collaborators.` A single inline summary replaces three KPI boxes: actual discovered count, actual email count and represented-platform count. These are derived from collected results; no campaign promises, fake confidence percentages or engagement estimates. Export is aligned right on desktop, underneath on mobile.

Sample banner is lavender with a named mode, fictional-data fact and no-paid-calls fact. Keep per-card sample labeling and exported sample identity. Live banner should instead explain collection state, not impersonate sample content. Never merge modes in a shortlist.

Desktop named platform filters appear as a simple ruled control row, not capsules inside a toolbar box. Search/name filter, email toggle, minimum audience and sort occupy one compact row. Mobile uses a **native named platform selector** with counts; all labels remain readable and keyboard/touch behavior comes free. Preserve all five platforms; do not reduce scope or require horizontal page scrolling. Mobile retains both named Edit search and New search actions. A concise note near the summary/control explains that topic matches are evidence signals, not audience-fit or performance scores.

Desktop uses two generous comparison columns, not three cramped panels. Names, identity and authored evidence deserve width. Below 768px collapse to one column; between 768–1100px keep two only if minimum 330px card width and text legibility are satisfied. At smaller tablet widths prefer one column over compressed labels.

**Creator card information order:**
1. Returned photo/initials, platform, name, handle, save action (44px).
2. Two to three lines of bio; full text in details.
3. Relevance **source-type label** and authored evidence excerpt as the card's intellectual focal point. Source hierarchy must remain faithful to `relevanceLabel()` / canonical evidence: authored content above profile text above search-only. The concept's `Illustrative topic match` is for sample only.
4. Audience value with platform-correct unit; contact availability with source availability, without green “verified” status.
5. Mode/collection state and `View details` action. Evidence area may open the same detail panel using an internal-navigation right arrow; reserve northeast/external arrows for safe source links. Do not add a separate fabricated confidence action.

For missing data show `Not available`, not zero; pending collection is `Pending`, not `No email found`; enrichment failure is `Partial profile`, not a completed-looking record. Collection state belongs to each creator and remains truthful after saving, discarding references, or refreshing; platform-level job presence is not proof of that creator's completion. Legacy records without explicit state remain unknown. The focal excerpt must support the adjacent matching-post/profile/search label rather than selecting unrelated content. Platform failures must remain isolated. Card order must continue using actual relevance comparison; concept order is illustrative, not a recommendation to feature visually attractive creators.

### 3. Creator detail

Desktop 760px dialog; mobile almost full-width with bounded internal scroll. Real `<dialog>`, named with `aria-labelledby`; Escape/backdrop close when allowed; restore focus to the originating card. Keep save button unobstructed and 44px.

Identity first, explicit sample/partial state, readable bio, compact facts. Put **Why they surfaced** before contacts so discovery is explained before outreach metadata. Each live evidence row retains type (`Collected content`, `Public profile`, `Search result`), date when returned and safe external source link. Make one excerpt prominent; avoid fake thumbnails that the data does not provide.

Contacts remain source-linked, with `Not mailbox-verified`, Copy, website and optional separately billed scan. Website scan remains unavailable for sample. When Web Unlocker is absent, explain why at the action; do not let an unexplained disabled button absorb attention. Scan errors inline. Preserve scanning-close behavior and current partial-result state semantics.

Concept uses a centered dialog; production may implement the same composition as a named side sheet only if scroll lock, focus and mobile behavior match. The chosen deliverable is centered dialog, not multiple competing visual directions.

### 4. Connection dialog

Headline `Connect your Bright Data.` No decorative key strip. First paragraph: own key, own account-paid searches, sample free of key requirement. API-key label, password field, concise but complete memory/HTTPS/stateless-relay/refresh explanation, primary Connect action, `Find your API key` link.

Two explicit disclosures: **New to Bright Data? Setup checklist**, then **After connecting & resuming work**. Checklist retains credits, Web Scraper permission, working SERP zone for Instagram/LinkedIn/X, optional Web Unlocker and the final human steps. Recovery disclosure retains permissions/credits/zone-health limitations of a successful metadata connection and paid enrichment on resume. Connection remains non-billable metadata verification; no automatic service tests or other-zone probing.

On metadata success say `Key connected`, not `All platforms ready`. If metadata access is restricted, say it is unavailable rather than claiming that no zone exists or that metadata was checked. Selected SERP zone appears in composer. Do not invent account credit/balance data. In connected dialog retain `Disconnect and forget key` and its running/scanning disabled semantics.

The footer Setup guide must also expose a clearly named **Run locally** route with separate **For your coding agent** (copyable `localSetupPrompt`) and **For you** human setup steps. Retain Git/Node 22 prerequisites, persistent local server, provider guide links, no Cloudflare login locally, key entry only in the app, tab-local recovery lifetime, and later paid-stage disclosure. Local-install instructions must not replace the simpler hosted visitor path.

### 5. Running collection / partial outcomes

The brief ribbon stays in place. A compact **Collection progress** section appears above results. Desktop five platform rows/columns can use ruled dividers; mobile stacks named rows. Each contains platform, actual stage, explanatory status and snapshot reference when available. No fake completion percentage unless genuinely derivable; show actual platforms completed and elapsed time.

Display arrived creators immediately with pending/partial labels. Retain Pause search. Text explains that provider jobs may keep running and be billed after pause. Avoid looping activity on completed rows. Skeletons exactly match card dimensions; no spinner replacing the whole result page.

### 6. Refresh / uncertain submission / recovery

After refresh retain results and references, forget key. A readable outlined recovery panel above progress/results asks to reconnect and resume. Existing snapshot IDs remain intact. Resume can initiate separately billed post/profile collection and must keep that disclosure visible. Tab closure may lose current results and job references; export results and retain snapshot IDs before closing. When queued SERP discovery needs explicit zone choice, render the zone selector within recovery even if the main composer is hidden.

Uncertain submission: amber material, precise platform/stage/time, `Add existing job reference` for known snapshot stages; uncertain SERP retains explicit authorization for a **new paid search**. Never generic Retry on a potentially successful trigger POST. Keep submitted-job billing implications when pausing/discarding and existing confirmation semantics for destructive reference loss.

### 7. Shortlist / Recent searches / empty states

Shortlist reuses results cards/filters; heading identifies browser-local saving. Empty shortlist offers Discover; saving/removing gives a status announcement, and mixed sample/live saving retains the actual protective behavior. Export remains useful if browser storage fails.

Recent searches are a flat editorial list: brief, topics, platforms, and an `Edit brief` affordance. Choosing one restores configuration; no automatic paid rerun. Existing statement that running again uses credits remains.

No-results/filters-empty: name the cause; one Clear filters or return-to-edit action. Platform failure state must distinguish `No matches` from `Collection failed`. Do not disguise technical failures as an empty successful collection.

## Motion direction

The delight comes from intentional cadence, not a perpetually turning radar.

- Initial copy reveal: opacity 0→1, translateY 12→0, 550ms, `cubic-bezier(.22,1,.36,1)`. Search surface starts 70ms later.
- Result transition: 180–240ms crossfade/8px translation; focus results heading programmatically after data arrival. Do not animate a long scroll past the landing page.
- First visible cards: 420ms reveal, 40ms stagger, cap at 5 cards. Newly filtered existing cards should not replay a waterfall indefinitely; production uses stable keys and one-time mount/reveal tracking.
- Hover card: max −2px; interactive evidence arrow translates 2px; save gets a 160ms press/state change. Never move the whole card on mobile.
- Dialog: 200ms opacity/8px translation; background dim is stable, not a large animated blur.
- Actual pending jobs may use a small localized opacity/progress sweep. No activity animation on static contacts, logos or sample data. Hero illustration has a one-time entrance, no endless bobbing.
- Only transform and opacity animate. No animated shadow/layout dimensions; no canvas/WebGL dependency. Implement with existing React/CSS, no motion package required.
- Reduced motion disables translations, staggers and loops; content/state appears immediately. Offscreen/hidden work should stop animating.

## Accessibility and responsive quality bar

- 4.5:1 normal text; 3:1 large text and essential UI graphics. Border tokens may be subtle only when a distinct fill/label supplies affordance. Quantitatively test real foreground/background pairs.
- All product targets at least 44 × 44px; no mini bookmarks or isolated 12px link hit areas.
- Real form labels, `fieldset`/`legend` for platform choices, `aria-pressed` toggles, named dialogs, logical heading levels, status announcements.
- Preserve focus/scroll when closing detail; trap dialog focus natively. No hidden sidebar entries remaining in the accessibility tree on mobile.
- Test 320, 390, 768, 1024, 1440 and 1920 widths. No document overflow, no clipped topic text controls, no two-line button orphan icons, no platform-name deletion.
- Test long creator names, long handles, unbroken source URLs, no photo, absent audience, no email, pending enrichment and empty filters. Beautiful rendering must tolerate untidy real data.
- Test keyboard-only, 200% zoom, reduced motion, iOS input zoom behavior and short-height dialogs. Screenshot certification is not a WCAG compliance claim.

## Concrete implementation mapping

### `src/App.tsx`

- Replace permanent sidebar/topbar combination with one navigation masthead; reuse `go()` destinations and saved count.
- Replace `RadarArt` with small original labeled sample illustration content on arrival only. Live avatars continue through `Avatar` and `safeUrl`.
- Composer remains the existing `<form onSubmit={begin}>`, existing topics/platform/depth/zone state. Move exact usage limits into a native disclosure; retain short paid-stage summary before submit.
- Show hero only before results/work; show brief ribbon during results. Reuse existing history/config editing semantics; never discard jobs to make layout clean.
- Replace three stats cards with a derived inline count sentence. Recompose `creator-card`; preserve `relevanceLabel`, `formatCount`, save protections, evidence and partial/pending labels.
- Replace mobile icon-only filter row with native select bound to `filterPlatform`.
- Name dialogs via IDs; keep scan dismissal restrictions, status/error rendering, key lifetime and safe source URLs.

### `src/styles.css`

- Consolidate to one token set and one responsive component system. The current file contains thousands of legacy rules and late overrides; implement by component section rather than adding another theme override at its end.
- CSS Grid for hero/cards and responsive form arrangement; no percentage width arithmetic; max-width container.
- Local Geist font-face, two weights; remove production serif dependency if no longer used anywhere.
- Avoid blanket hover-color rules that accidentally recolor CTA text or badges; set states at component level.
- Leave provider logic, paid bounds, normalization, storage and transport behavior intact. Visual improvement must not weaken product truth.

## Delivery artifacts and review evidence

- `world-class-concept.html` — **self-contained, offline-capable** visual prototype, embedded fonts, inline SVG artwork, responsive desktop/mobile. Switch Home/Sample results in the top annotation bar; use actual form choices, filters, save/shortlist, details, sample CSV export and setup dialog. The annotation bar is not production chrome.
- `assets/Geist-Regular.ttf`, `assets/Geist-Semibold.ttf`, `assets/Geist-OFL.txt` — local font source and license for implementation. Embedded copies make the HTML portable.
- `concept-home-desktop.png`, `concept-home-mobile.png`, `concept-results-desktop.png`, `concept-results-mobile.png`, `concept-details-*.png`, `concept-connection-*.png` — rendered visual evidence.
- `evidence/current-{home,sample,details,connection,setup,unconnected-submit}-{desktop,mobile}.png` plus matching `.aria.txt` — actual live-flow review captures. Old `docs/*` screenshots were inspected as baseline references.
- `evidence/concept-*.aria.txt` — semantic-state captures of the prototype.
- `evidence/verification.json` — viewport/overflow, key flows, offline requests and console-error check.

Verification completed with installed Playwright Chromium: 320, 390, 768, 1024, 1440 and 1920px; home/results/details/connection/setup produced no document overflow. Twelve meaningful prototype flows passed, including Escape focus restoration, filters, empty recovery, shortlist and sample export. Zero external requests, paid calls, real keys or page errors. Normal-motion entrance completed correctly; screenshots use reduced motion for repeatability.

Measured text contrast: navy/white **15.52:1**; secondary/white **6.20:1**; secondary/canvas **5.78:1**; white/blue CTA **5.74:1**; sample notice **7.88:1**; contact status **7.36:1**. These check the chosen text pairs, not a claim of complete WCAG certification.

The prototype intentionally cannot connect to Bright Data, send keys, or run paid stages. Sample numbers, names, bios and evidence are taken from the existing `src/sample.ts`, not invented performance claims. Original illustrations are explicitly sample, and remaining records show designed initials. Concept sort order and simplified dialogs demonstrate composition; implementation must preserve canonical ranking and complete capabilities as specified above.

## Acceptance: what makes this exceptional

1. At first glance, the product reads as **creator research**, not an administration template or abstract radar engine.
2. The single blue action and search surface are unmistakable; supporting copy is legible without zoom.
3. Results devote their visual weight to names, evidence and useful context. Looking at a card answers “why this person?” before “how big are they?”
4. Results fit the research mental model; the landing page gracefully gives way to the work.
5. Mobile looks designed in its own right. Labels remain labels, contrast remains contrast, and touch targets remain usable.
6. Beauty survives missing/long/partial data and paid recovery. Nothing attractive is purchased by making the product less truthful.
