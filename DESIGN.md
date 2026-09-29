# YouTube Custom Light — Design Document

Status: v1.2.0 — DOM and tokens verified against YouTube web, 2026-08-09
(Chrome 151, home/watch/shorts captures in `captures/`). The adaptive
appearance layer (v1.2.0) was added afterwards against the same captures plus
the six page snapshots in `snapshots/`.

## 1. Purpose

Site-wide YouTube tuning for low-end desktops/laptops: less CPU/GPU/RAM while
watching, plus adaptive appearance driven by the page and the OS accessibility
settings. Unlike the Shorts script (zero UI), this one ships a floating panel
because several features are a taste call (hide Shorts shelf, disable
animations, accent color).

Non-goals:

- No resolution forcing, no ad/anti-sponsor logic, no network tampering.
- No per-video settings; the panel is a single global settings surface.
- No visual re-theme of YouTube itself; we surface colors only through
  YouTube's own tokens so dark/light both work.
- No filters on video pixels, at any contrast or effects level.

## 2. Feature list

### Appearance modes (adaptive, v1.2.0)

Resolved by `resolveAdaptiveProfile(state, context)`. Manual choices always win;
`smartMode === false` falls back to the `fallback` column.

| key | automatic value | fallback | effect |
|---|---|---|---|
| `contrastMode` | `system` if forced-colors, else `high` if `prefers-contrast`, else `standard` | `standard` | `high`/`maximum` add `ycl-contrast-high`/`ycl-contrast-max` on `<html>` |
| `effectsMode` | `none` if forced-colors, reduced-transparency or raised contrast, else `reduced` if `prefers-reduced-motion`, else `standard` | `standard` | `ycl-effects-reduced`/`ycl-effects-none` on `<html>` |
| `densityMode` | `compact` on wide viewports (`>760px`) for `home`/`subscriptions`/`search`/`feed`, else `comfortable` | `comfortable` | `ycl-density-compact` on `<html>` |

Raised contrast is a hard dependency of reduced effects: contrast at `high` or
`maximum` forces effects to `none` unless the user chose effects manually. This
is deliberate — bold text on a blurred translucent surface is not legible.

### Toggles (opt-in features)

| feat | default | mechanism |
|---|---|---|
| `pauseHidden` | ON | On `visibilitychange` to hidden, pause videos still playing; a capture-phase `play` listener also catches a player that starts after the tab was already hidden. YouTube keeps playing in background tabs by default — the largest battery drain on low-end hardware. |
| `subsCard` | ON | Guide "Subscriptions" button (`ytd-guide-entry-renderer#expander-item`, plus the `a#endpoint[href*="/feed/subscriptions"]` variant) gets a solid raised surface with a rim and 8px radius; `div#expanded` gets a 45% translucent raised surface. |
| `hideShortsShelf` | OFF | `ytd-reel-shelf-renderer { display:none !important }`. Deliberately global — hides every Shorts shelf wherever YouTube renders it. |
| `feedScroll` | OFF | `content-visibility: auto` + `contain-intrinsic-size` on `ytd-rich-item-renderer`. Experimental; opt-in until field-tested. |
| `motionCut` | OFF | Reduced-motion recipe: animation/transition durations 0.01ms, scroll-behavior auto. Last resort, and a whole-UI override. |

### Always on

- `REDUCED_MOTION_CSS` — a `prefers-reduced-motion: reduce` block. Independent
  of the `motionCut` toggle: honouring the OS is not a user choice, `motionCut`
  is.

### Removed in 1.2.0

The v1.1.x always-on bloat sweep (`.ytp-gated-actions-overlay`,
`#video-filtering-overlay-container`, re-run on a 10s `setInterval`) is gone.
Re-querying the DOM on a timer is exactly the cost this script exists to avoid.
A test now asserts the source contains no `setInterval` at all, and a mutation
test injects one to prove the assertion bites.

## 3. DOM inventory (verified live)

| Target | Selector | Notes |
|---|---|---|
| Subscriptions collapsible (guide) | `ytd-guide-collapsible-entry-renderer` | Contains `ytd-guide-entry-renderer#expander-item` (the button) + `div#expanded` (channel list). This replaced the old hover flyout (`ytd-guide-flyout-renderer` is GONE from the 2026 bundle). |
| Shorts shelf | `ytd-reel-shelf-renderer` | Present on Home (`ytd-rich-grid-renderer` islands) and search results. |
| Feed cards | `ytd-rich-item-renderer` | Grid wrapper around every video card on Home/search. |
| Feed grid metrics | `ytd-rich-grid-renderer` | Density is driven by the `--ytd-rich-grid-{item,row,gutter}-margin` custom properties, not by padding overrides. |
| Search box | `--ytd-searchbox-background`, `--ytd-searchbox-text-color`, `--ytd-searchbox-border-color` | Repainted by the high/maximum-contrast palettes. |
| Mini-guide entry | `ytd-mini-guide-entry-renderer` | Collapsed sidebar; has no expanded list, so the card feature intentionally does not touch it. |
| Competing FAB | `#ysu-fab` | YouTube's own floating action button. Our root docks beside it rather than overlapping. |
| Theme marker | `html[dark]` | The only reliable dark-mode signal. `darker-dark-theme` is present on light pages too; a test asserts the skin CSS never uses it. |

Adaptive classes are written to `document.documentElement`, never to a YouTube
node, so a YouTube re-render cannot drop them.

## 4. Theming

All rule colors are YouTube token variables, with two-level fallbacks so the
script still renders correctly if YouTube renames a token:

- raised surface: `var(--yt-sys-color-baseline--raised-background, var(--ycl-raised-fallback, #f9f9f9))`
- rim:           `var(--yt-sys-color-baseline--tonal-rim, var(--ycl-rim-fallback, rgba(0,0,0,0.12)))`
- panel bg:      `var(--yt-sys-color-baseline--menu-background, var(--ycl-raised-fallback, #ffffff))`
- text:          `var(--yt-sys-color-baseline--text-primary, #111111)`
- muted:         `var(--yt-sys-color-baseline--text-secondary, #606060)`
- outline:       `var(--yt-sys-color-baseline--outline, var(--ycl-rim-fallback))`
- accent:        `var(--yt-sys-color-baseline--call-to-action, #065fd4)`

`--ycl-raised-fallback` / `--ycl-rim-fallback` are set once per theme in
`PANEL_CSS` (`html[dark]` → `#212121` / `rgba(255,255,255,0.18)`), so the
fallback chain does not repeat a literal at every call site.

The high/maximum contrast palettes repaint the `--yt-sys-color-baseline--*`,
`--yt-deprecated-general-background-*`, `--yt-spec-*` and `--ytd-searchbox-*`
groups with `!important`, split light/dark via `:not([dark])` / `[dark]`. They
also underline non-button links, because colour alone is not a sufficient
affordance at maximum contrast.

Effects are controlled by overriding `--yt-frosted-glass-backdrop-filter-override`
and zeroing `box-shadow` / `text-shadow` / `backdrop-filter` under
`ycl-effects-reduced` / `ycl-effects-none`.

Skins use `color-mix()` against the captured dark/light base values
(`#212121`/`#0f0f0f` dark, `#ffffff`/`#f9f9f9` light) at 5–30% accent. The mix
percentages are deliberately untested — see the coverage gaps in
`mutation-test.js`.

## 5. Panel UX spec

- Trigger: 48×38px button, bottom-right, `z-index: 2147483647`, radius
  `12px 0 0 0` (bottom-left rounded, hugs the corner). Icon: sliders. It is not
  a circle.
- Dock: when `#ysu-fab` exists, the root shifts right by
  `fabOffsetRight(width) = width + 2` and sets `--ycl-dock-offset`, which the
  panel width subtracts from `100vw` so the panel never runs under YouTube's
  button.
- Panel: `min(390px, 100vw - 20px - dock)`, `max-height: min(760px, 100dvh -
  58px)`, radius `16px 16px 0 16px`, scrolling with `overscroll-behavior:
  contain`. Below 420px viewport width the panel goes full-bleed-ish and the
  setting grid narrows.
- Sections, in order: header (mark, title, close), **Modo inteligente** card,
  **Apariencia** (three `<select>`s), **Navegación y comodidad** (five
  switches), **Color de acento** (five swatches), **Perfil aplicado** status
  card, then reset + shortcut footnote.
- The status card is `role="status" aria-live="polite"` and shows
  `profileSummary(profile)` — e.g. `Inteligente · Suscripciones · contraste
  normal · efectos de YouTube · densidad compacta`. This is the only place the
  user can see what auto-detection actually decided.
- Keyboard: `Alt+Shift+Y` toggles (focus moves into the panel on open, back to
  the button on close), `Escape` closes and restores focus. Shortcuts are
  ignored while focus is in a text field and while Ctrl/Meta is held.
- Dismissal: a document-level `pointerdown` using `composedPath()` closes the
  panel on an outside click.
- Persistence: `GM_setValue`/`GM_getValue` under `ycl-features-v1`, JSON.
  Toggling re-renders only the feature/skin CSS node (`#ycl-features`); the
  panel CSS, adaptive CSS and reduced-motion block are injected once into
  `#ycl-panel-css` and never rewritten.
- `init()` is guarded by `document.getElementById('ycl-root') || !document.body`
  so a re-injection cannot double-mount.
- No fetch, no sync, no login. Everything lives in the user's storage.

## 6. Code conventions (anti-slop)

Same as YTShorts_Ultra/DESIGN.md §6: pure core exported to Node, thin DOM
layer, no emoji/decoration in code, token vars, no GM calls inside the pure
core. The panel's user-facing strings are **Spanish**; code identifiers and
these docs are English.

### Trusted Types (pitfall, verified 2026-08-09)

YouTube ships `require-trusted-types-for 'script'`: `innerHTML` AND
`createContextualFragment` throw on any element, including fresh nodes.
DO NOT use innerHTML anywhere in the injected UI — mount with DOM API
(createElement/createElementNS + textContent) only. `buildPanelMarkup()`
exists solely as a unit-tested string contract of labels/ids; the real panel
is built from the same `TOGGLES` / `SELECT_SETTINGS` / `SKINS` arrays via
`mountPanel()` so the two cannot diverge.

### No polling

The script reacts to `yt-navigate-finish`, `popstate`, a `MutationObserver` on
`documentElement` attributes `dark`/`color-version`, and `matchMedia` change
events. There is no timer anywhere. See §2 "Removed in 1.2.0".

## 7. Testing protocol

- `node --test youtube-custom-light.test.js` — 14 tests: `loadState`
  sanitization and legacy-payload tolerance, the no-`setInterval` guard,
  `buildFeatureCss` gating, `classifyPage` over the captured routes,
  `resolveAdaptiveProfile` across page/OS contexts including forced-colors,
  manual precedence and smart-mode-off, `buildSkinCss` dark/light split,
  `buildAdaptiveCss` contract (including the video-pixel exclusions), the
  pause predicate, `fabOffsetRight`, and the panel markup/CSS contract.
- `node mutation-test.js` — 45 mutations, target 0 survivors. Covers state
  sanitization, registry defaults, feature gating, skin resolution, the route
  classifier, the adaptive resolver, the appearance CSS, the panel markup/CSS
  contract, and the no-polling guard. Prints known coverage gaps afterwards.
- Smoke (live CDP, 2026-08-09, v1.1.x): `subsCard` rule applied to the live
  guide collapsible → bg `rgb(33,33,33)` (= raised token, dark), border
  `1px rgba(255,255,255,.1)`, radius 12px. Panel open/close across clicks.
  The v1.2.0 adaptive layer has not been smoke-tested against live YouTube yet.

## 8. Version history

| Version | Change |
|---|---|
| 1.0.0 | First release. Verbatim file layout as described above. |
| 1.1.0 | Trusted Types-proof panel (DOM API), corner button, skins. |
| 1.1.2 | Home icon; skins tint the real YouTube page (surface variables + `.ytp-play-progress`), no full-page overlay. |
| 1.1.3 | Skins dropped the overlay layer; selective accents only. |
| 1.1.4 | English panel labels; `GM_addStyle` grant. |
| 1.2.0 | Adaptive appearance profile: `smartMode` + `contrastMode`/`effectsMode`/`densityMode` resolved from page kind and OS accessibility preferences, with manual precedence. Spanish panel, `@name:es`/`@description:es`. `Perfil aplicado` status card, `Alt+Shift+Y`, FAB docking beside `#ysu-fab`. Always-on `prefers-reduced-motion`. Bloat sweep and its `setInterval` removed; `GM_addStyle` grant dropped. |

## 9. Browser compatibility

No external libraries, no CDN, no `@require`. Everything used is either ES6
(2016+) or platform CSS from 2023.

| Feature | Minimum | Impact below minimum |
|---|---|---|
| `color-mix()` | Chrome 111 / FF 113 / Safari 16.2 (2023) | Skin surface tints dropped; FAB accent and progress accent still work (plain hex). |
| `:has()` | Chrome 105 / FF 121 / Safari 15.4 | Subs button highlight reduced to the `#expander-item` variant only. |
| `dvh` | Chrome 108 / Safari 15.4 / FF 101 | The `max-height: 100vh` declaration above it still applies, so the panel only stops resizing with mobile browser chrome. |
| `content-visibility` (feedScroll, opt-in) | Chrome 85 / FF 125 / Safari 18 | Option simply has no effect. |
| `matchMedia` `addEventListener` | Chrome 84 / Safari 14 | Falls back to the deprecated `addListener`, so the profile still re-resolves on media change. |
| GM storage | Tampermonkey / Violentmonkey full support | Greasemonkey 4+: settings not persisted (defaults each load). CSS injection is a plain DOM `<style>` node, so styling is unaffected either way. |

Recommended managers: Tampermonkey or Violentmonkey on Chrome/Edge/Firefox,
and Tampermonkey on Safari. No polyfill library is shipped on purpose: the
degradation path is graceful (feature off) instead of a fragile runtime
shim that could break when YouTube changes its DOM.

## 10. Reverse-engineering source

- `captures/www.youtube.com/index.html` (home), `captures/www.youtube.com/watch.html`
- kevlar bundle `www.youtube.com/s/_/ytmainappweb/_/js/kytmainappweb.../*.html`
  — component strings (no flyout renderer in 2026).
- `snapshots/` — six rendered pages (home, subscriptions, search, feed,
  shorts, watch) used to verify `classifyPage` and the adaptive profile.
- Live CDP Chromium 151 verification of §3 selectors, 2026-08-09.
