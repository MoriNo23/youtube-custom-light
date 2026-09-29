# userscript-metadata Specification

## Purpose
TBD - created by archiving change migrate-v1-2-0-from-workspace-export. Update Purpose after archive.

## Requirements

### Requirement: Sole authorship

The userscript metadata block SHALL declare exactly one author, `MoriNo23`.
Migrations and version bumps SHALL NOT introduce a contributor, co-author,
copyright holder or maintainer entry.

Rationale: the project is single-authored. Authorship metadata is user-visible
on the script host and is not a place to record tooling or assistance.

#### Scenario: Migrating a version from an export

- **WHEN** a newer script version is adopted from a workspace export
- **THEN** the `@author` value is carried over unchanged
- **AND** no additional authorship line is added

#### Scenario: Auditing the repository

- **WHEN** the repository is searched for authorship metadata
- **THEN** every match resolves to the single value `MoriNo23`

### Requirement: Version and description localization

The metadata block SHALL carry `@version`, plus `@name`/`@description` in `en`
and `es` forms for a localized panel.

#### Scenario: Reading metadata for a localized build

- **WHEN** the metadata block is parsed
- **THEN** `@version` is present
- **AND** `@description:es` is present alongside `@description:en`
