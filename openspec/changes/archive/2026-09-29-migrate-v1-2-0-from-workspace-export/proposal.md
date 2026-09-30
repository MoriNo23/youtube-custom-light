# Migrate v1.2.0 from workspace export

## Why

The working copy was pinned at **v1.1.4** (20,436 bytes, 24 tests). A workspace
export, `workspace-01a0ef3f-aee9-7618-9a3a-0ceca273239d.zip`, carried a newer
**v1.2.0** of the same script (59,291 bytes, 1,073 lines, 14 tests) that had
never landed in the directory. v1.2.0 adds an adaptive appearance profile and
four new persisted settings that v1.1.4 cannot read or render.

Leaving the directory on v1.1.4 meant the script, the tests and the exported
artifact all disagreed about what "current" meant.

## What changes

- `youtube-custom-light.user.js` — v1.1.4 → v1.2.0, taken byte-for-byte from
  the export. No hand edits.
- `youtube-custom-light.test.js` — replaced with the v1.2.0 suite (14 tests),
  taken byte-for-byte from the export.
- v1.1.4 copies of both files are preserved in `.backup-v1.1.4/`.

## What does NOT change

**Authorship.** `@author MoriNo23` is the sole author, before and after. The
migration adds no contributor, co-author, copyright holder or maintainer line
anywhere in the repository. The export itself carried a single author, so
nothing was dropped and nothing was introduced.

The `uploads/youtube-custom-light.user.js` entry inside the zip is the older
v1.1.4 and is left as-is; the zip is treated as read-only input.

## Known staleness (deferred, not in scope)

These four files still describe v1.1.4 and were deliberately left untouched:

- `README.md` — documents 5 toggles and English labels; v1.2.0 has 4 more
  settings and a Spanish panel.
- `DESIGN.md` — DOM inventory predates the adaptive profile.
- `showcase.html` — static mock of the v1.1.4 panel.
- `mutation-test.js` — targets v1.1.4 source patterns. Run against v1.2.0 it
  reports **5 surviving mutants** (IDs 5, 13, 14, 15, 16) instead of the 0 the
  README claims. The survivors are pattern drift, not a v1.2.0 regression: the
  mutated selectors no longer appear in the v1.2.0 stylesheet.

## Follow-up (2026-09-29)

The deferred documentation and tooling work was completed after the migration:

- The README now describes the current userscript and its actual installation,
  privacy and validation behavior.
- Design notes and the preview are under `docs/`; unit tests and the mutation
  runner are under `tests/` and `tools/`.
- `package.json` provides reproducible Node validation commands. The mutation
  runner is kept aligned with the current v1.2.x source.

## Impact

- Affected specs: `userscript-appearance`, `userscript-metadata`
- Affected code: `youtube-custom-light.user.js`, `tests/`, `tools/`
