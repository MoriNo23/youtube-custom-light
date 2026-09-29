# Tasks

## 1. Preserve the v1.1.4 state

- [x] 1.1 Copy `youtube-custom-light.user.js` (v1.1.4) to `.backup-v1.1.4/`
- [x] 1.2 Copy `youtube-custom-light.test.js` (v1.1.4) to `.backup-v1.1.4/`
- [x] 1.3 Record the md5 of both backups to confirm they match the originals

## 2. Adopt v1.2.0

- [x] 2.1 Extract the export to a scratch directory
- [x] 2.2 Copy the export's v1.2.0 script over `youtube-custom-light.user.js`
- [x] 2.3 Copy the export's v1.2.0 test suite over `youtube-custom-light.test.js`
- [x] 2.4 Verify both files are byte-identical to the export by md5
- [x] 2.5 Normalize mtime, which the zip carried as 1980-01-02

## 3. Verify

- [x] 3.1 `node --test youtube-custom-light.test.js` → 14/14 pass
- [x] 3.2 Module loads under CommonJS and exports the v1.2.0 surface
- [x] 3.3 No other file in the repo was modified

## 4. Authorship guard

- [x] 4.1 `@author` still resolves to exactly one value: `MoriNo23`
- [x] 4.2 No `@contributor`, `@copyright`, `@maintainer` or co-author line exists
- [x] 4.3 No author line was added to the export, the backup or the docs

## 5. Deferred follow-ups (not done here)

- [ ] 5.1 Update `README.md` to the v1.2.0 feature list and Spanish panel
- [ ] 5.2 Update `DESIGN.md` with the adaptive profile DOM/token inventory
- [ ] 5.3 Rebuild `showcase.html` against the v1.2.0 panel markup
- [ ] 5.4 Repoint `mutation-test.js` at v1.2.0 source patterns to clear the
      5 surviving mutants (IDs 5, 13, 14, 15, 16)
