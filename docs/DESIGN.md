# Implementation notes

This document describes the current userscript. The installable source of truth
is `../youtube-custom-light.user.js`; it is intentionally kept as one file so a
userscript manager can install it directly. There is no build step or runtime
dependency.

## Repository layout

- `../youtube-custom-light.user.js` — userscript metadata, pure logic, injected
  CSS, panel DOM and browser event handlers.
- `../tests/youtube-custom-light.test.js` — Node unit tests for state,
  classification, appearance decisions and the panel contract.
- `../tools/mutation-test.js` — mutation runner for the tested behavior.
- `showcase.html` — optional local panel preview; loads the root userscript.
- `../openspec/` — requirements and change history.

## Runtime flow

1. `loadState()` reads `ycl-features-v1` using `GM_getValue`, validates stored
   booleans, appearance choices and accent, and supplies defaults for absent or
   malformed values. Existing feature and skin settings remain compatible.
2. `init()` injects panel/appearance CSS once, mounts the settings panel using
   DOM APIs, and registers event-driven updates. Each update reads one context
   snapshot for both the appearance profile and feature CSS; unchanged feature
   CSS is not rewritten. It does not poll or sweep overlays on a timer.
3. `resolveAdaptiveProfile(state, context)` is pure. `readContext()` supplies
   the current route, viewport breakpoint and supported accessibility media
   preferences. Manual selections always take precedence over automatic
   decisions.
4. YouTube navigation, theme-attribute changes and media-query changes
   recompute the profile. The active classes are placed on `documentElement` so
   YouTube component re-renders do not remove them.

## Adaptive appearance rules

| Setting | Automatic result | Fixed value when smart mode is off |
|---|---|---|
| `contrastMode` | `system` for forced colors; otherwise `high` for `prefers-contrast`; otherwise `standard` | `standard` |
| `effectsMode` | `none` for forced colors, reduced transparency or raised contrast; otherwise `reduced` for reduced motion; otherwise `standard` | `standard` |
| `densityMode` | `compact` on wide viewports for Home, Subscriptions, Results and Feed; otherwise `comfortable` | `comfortable` |

Any non-`auto` value is an explicit override. `maximum` contrast adds stronger
outlines to selected cards and dialogs. When forced colors are active, the
automatic contrast choice is `system`, leaving palette control to the operating
system; custom skin CSS is omitted and reapplied when that media preference
changes.

The theme split uses YouTube's `html[dark]` attribute. The older
`darker-dark-theme` marker alone is not used because it can also be present on
light pages.

## Effect and media boundaries

The appearance CSS uses YouTube's color tokens where possible, including
`--yt-sys-color-baseline--*` and the deprecated general-background tokens as
fallbacks. The effect modes override
`--yt-frosted-glass-backdrop-filter-override` and remove selected blur,
`backdrop-filter`, `box-shadow` and `text-shadow` effects from the interface.

Broad effect rules exclude `#movie_player` and video elements. A separate rule
removes the decorative blurred watch-page backdrop; it does not filter the
video itself. Thumbnail images and player control gradients are not globally
removed. `densityMode` uses the grid variables observed in YouTube's rich-grid
markup: `--ytd-rich-grid-item-margin`, `--ytd-rich-grid-row-margin` and
`--ytd-rich-grid-gutter-margin`.

## Feature toggles

- `pauseHidden` — pauses currently playing videos when the tab becomes hidden;
  a capture-phase `play` listener also handles playback that begins while
  hidden.
- `subsCard` — styles the guide's Subscriptions entry and its expanded list.
- `hideShortsShelf` — hides `ytd-reel-shelf-renderer`; it does not hide the
  Shorts page.
- `feedScroll` — opt-in `content-visibility` for rich-grid items; marked
  experimental.
- `motionCut` — explicit site-wide animation/transition reduction. The
  separate `prefers-reduced-motion` CSS rule always respects the OS preference.

## Panel and persistence

The panel is built with `createElement`, `createElementNS` and `textContent`;
`innerHTML` is intentionally avoided for Trusted Types compatibility. The
`buildPanelMarkup()` function is a testable string contract, not the runtime
mount path. Settings are saved locally through the userscript manager; there is
no network call, account integration or cross-device sync.

The button docks beside `#ysu-fab` when present. The panel supports Escape,
outside-click dismissal, `Alt + Shift + Y`, visible keyboard focus and live
status text. User-facing panel strings are Spanish.

## Validation and known boundaries

Run `npm run validate` from the repository root. Unit tests and mutation tests
cover the behavior listed in the scripts; the mutation runner also reports
known coverage gaps. The YouTube snapshots used during implementation are not
included in this repository. YouTube can change its DOM and CSS independently,
so selectors should be rechecked when a supported page stops matching.
