# userscript-appearance Specification

## Purpose
Define how YouTube Custom Light chooses and applies accessible appearance settings, while keeping user-selected overrides authoritative.

## Requirements

### Requirement: Adaptive appearance profile

The script SHALL resolve an appearance profile from four persisted settings —
`smartMode`, `contrastMode`, `effectsMode`, `densityMode` — where smart mode
derives each mode from page context and accessibility preferences, and manual
choices take precedence over automatic ones.

#### Scenario: Smart mode on, no stored override

- **WHEN** `smartMode` is true and the user has not chosen a mode manually
- **THEN** contrast, effects and density are derived from page context and
  accessibility preferences

#### Scenario: Smart mode off

- **WHEN** `smartMode` is false
- **THEN** each unset mode falls back to its documented default rather than
  being auto-detected

### Requirement: Forced-colors deference

When the operating system requests forced colors, the script SHALL leave palette
control to the system rather than imposing its own accent.

#### Scenario: OS high-contrast active

- **WHEN** the page is rendered under forced-colors mode
- **THEN** skin accent overrides are not applied

### Requirement: Settings persistence with legacy tolerance

`loadState` SHALL validate booleans and appearance choices, reject malformed
JSON by falling back to defaults, and remain able to read preferences written
by earlier versions.

#### Scenario: Malformed storage

- **WHEN** stored preferences are not valid JSON
- **THEN** `loadState` returns the defaults

#### Scenario: Preferences from an older version

- **WHEN** storage contains a legacy payload lacking the newer keys
- **THEN** the known keys are honoured and the absent keys take their defaults

### Requirement: Appearance CSS leaves video pixels untouched

Contrast and effect controls SHALL restyle the interface only. They SHALL NOT
apply filters to the video element itself.

#### Scenario: High contrast enabled

- **WHEN** contrast is raised to its highest setting
- **THEN** interface surfaces change
- **AND** no filter is applied to video pixels
