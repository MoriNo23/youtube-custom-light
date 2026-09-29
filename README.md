# YouTube Custom Light

Adaptive YouTube appearance for low-end desktops and laptops. The script reads
the page you are on and your operating-system accessibility settings, then
applies contrast, effect and density choices automatically — with manual
overrides always available. All colors come from YouTube's own tokens, so dark
and light both work.

The settings panel is in **Spanish**; this file and `DESIGN.md` are in English.

## Install

1. Tampermonkey or Violentmonkey.
2. Open `youtube-custom-light.user.js`, the manager offers install.
3. Reload any youtube.com page. The button (bottom-right) opens the panel.

## Adaptive profile

By default the script runs in **Modo inteligente** (smart mode). It resolves
three appearance modes from context instead of guessing:

| Mode | Automatic value |
|---|---|
| **Contraste** | `system` under forced-colors, `high` under `prefers-contrast`, otherwise `standard` |
| **Efectos visuales** | `none` under forced-colors / reduced-transparency / raised contrast, `reduced` under `prefers-reduced-motion`, otherwise `standard` |
| **Densidad del feed** | `compact` on wide viewports for Home, Suscripciones, Resultados and Feed pages, otherwise `comfortable` |

Each mode has a manual override. A manual choice always wins over the
automatic value. Turning smart mode off falls back to fixed defaults (`standard`
contrast, `standard` effects, `comfortable` density). The panel shows the
resolved profile in the *Perfil aplicado* card.

Turning smart mode off and pressing **Restaurar ajustes inteligentes** are not
the same thing: the reset button also clears manual overrides, the switch only
stops auto-detection.

## Feature toggles

Under *Navegación y comodidad*. Defaults are conservative — the two ON features
are the two with measured wins, everything visual is opt-in.

- **Pausar en pestaña inactiva** (ON) — pauses videos still playing when the
  tab is hidden. YouTube keeps playing in background tabs by default; this is
  the biggest battery drain on low-end hardware. Also covers a player that
  starts after the tab was already hidden.
- **Destacar Suscripciones** (ON) — the guide's Subscriptions button and its
  channel list sit on a raised surface with a rim.
- **Ocultar estantes de Shorts** (OFF) — removes the Shorts rail wherever
  YouTube renders it. Does not change the Shorts page itself.
- **Carga eficiente del feed** (OFF) — `content-visibility` on grid items.
  Experimental, opt-in.
- **Reducir todas las animaciones** (OFF) — site-wide animation/transition
  reset. Last resort. Separate from the OS preference below.

Always on, no setting: a `prefers-reduced-motion` block that honours the
operating system's motion preference. It is independent of the *Reducir todas
las animaciones* toggle, which is an explicit whole-UI override.

High contrast and reduced effects restyle the interface only. Video pixels are
never filtered — the rules exclude `#movie_player` and `video` explicitly, and
under maximum contrast the watch-page backdrop is exempted too.

## Accent colors

*Original* (default), *Verde*, *Océano*, *Atardecer*, *Violeta*. A skin tints
YouTube's real token variables and the play-progress bar, switching on
YouTube's own `[dark]` marker. It is a tint, not a re-theme.

## Keyboard and storage

- `Alt + Shift + Y` opens and closes the panel.
- `Escape` closes it and returns focus to the button.
- The button docks beside YouTube's own `#ysu-fab` when that is present.

Settings persist in the script's own storage (`ycl-features-v1`) via
`GM_getValue`/`GM_setValue`. No cloud, no sync, no login. Preferences written
by 1.1.x remain readable: absent keys take their defaults.

## Files

- `youtube-custom-light.user.js` — the script (single file, no build step).
- `showcase.html` — interactive preview of the v1.2.0 panel, the adaptive
  profile and the subscriptions card (dark/light). Static mock; the userscript
  is not required to open it.
- `DESIGN.md` — DOM inventory, token table, panel spec.
- `youtube-custom-light.test.js` — unit tests, `node --test`.
- `mutation-test.js` — mutation testing, `node mutation-test.js`.
- `captures/` — YouTube captures used for verification (see DESIGN.md §11).
- `snapshots/` — the six page snapshots used to verify the route classifier.

## Development

```sh
node --test youtube-custom-light.test.js   # expect 14/14
node mutation-test.js                      # expect 45 killed, 0 survived
```

`mutation-test.js` prints a list of known coverage gaps after the run — code
the suite does not yet assert. It is a to-do, not a failure.

## License

MIT. Author: MoriNo23.
