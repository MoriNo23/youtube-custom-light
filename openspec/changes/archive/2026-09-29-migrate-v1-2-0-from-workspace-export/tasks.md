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

## 3. Verify the migration

- [x] 3.1 `node --test` → 14/14 pass at migration time
- [x] 3.2 Module loads under CommonJS and exports the v1.2.0 surface
- [x] 3.3 No other runtime code was modified by the migration

## 4. Authorship guard

- [x] 4.1 `@author` remains exactly `MoriNo23`
- [x] 4.2 No contributor, maintainer or co-author metadata is introduced
- [x] 4.3 No additional authorship line is added to the userscript

## 5. Follow-up documentation and development structure

- [x] 5.1 Rewrite the README to document the current settings, installation and validation commands
- [x] 5.2 Move implementation notes and preview to `docs/`
- [x] 5.3 Move unit tests to `tests/` and mutation tooling to `tools/`
- [x] 5.4 Add package scripts for syntax checks, tests and validation
- [x] 5.5 Verify the relocated tests and all documented commands
