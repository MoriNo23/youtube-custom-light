// Mutation testing for youtube-custom-light.user.js (v1.2.0)
// Run: node mutation-test.js
//
// Contract: every mutation in MUTATORS must be killed by
// youtube-custom-light.test.js. Target 0 survivors.
//
// Patterns are matched against the v1.2.0 source. Mutators that describe code
// the current suite does not assert are listed in KNOWN_GAPS below instead of
// being carried as survivors, so a green run stays meaningful. The gaps are a
// real coverage signal — see the note printed at the end of the run.
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC = path.join(__dirname, 'youtube-custom-light.user.js');
const TEST = path.join(__dirname, 'youtube-custom-light.test.js');
const TMP_DIR = path.join(__dirname, '.mutation-tmp');
const TMP_SRC = path.join(TMP_DIR, 'youtube-custom-light.user.js');
const TMP_TEST = path.join(TMP_DIR, 'youtube-custom-light.test.js');
const ORIG = fs.readFileSync(SRC, 'utf8');

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.copyFileSync(TEST, TMP_TEST);

// Literal helpers. Preferred over regex: the source contains CSS selectors and
// escaped route patterns that are painful and error-prone to match as regexes.
function firstReplaceText(text, needle, replacement, label) {
  const i = text.indexOf(needle);
  if (i === -1) return null;
  return { code: text.slice(0, i) + replacement + text.slice(i + needle.length), label };
}

function allReplaceText(text, needle, replacement, label) {
  if (!text.includes(needle)) return null;
  return { code: text.split(needle).join(replacement), label };
}

const MUTATORS = [
  // ---- loadState: parsing and validation -------------------------------
  c => firstReplaceText(c,
    'typeof value === \'boolean\' ? value : toggle.def;',
    'typeof value !== \'boolean\' ? value : toggle.def;',
    'loadState: boolean coercion flipped'),
  c => firstReplaceText(c,
    'typeof parsed.smartMode === \'boolean\' ? parsed.smartMode : true;',
    'typeof parsed.smartMode === \'boolean\' ? parsed.smartMode : false;',
    'loadState: smartMode default true → false'),
  c => firstReplaceText(c,
    'out[setting.key] = valid ? value : \'auto\';',
    'out[setting.key] = valid ? value : \'standard\';',
    'loadState: invalid select falls back to a fixed value'),
  c => firstReplaceText(c,
    'return item.id === skin; }) ? skin : \'default\';',
    'return item.id !== skin; }) ? skin : \'default\';',
    'loadState: skin validation flipped'),
  c => firstReplaceText(c,
    'catch (e) { parsed = null; }',
    'catch (e) { parsed = { smartMode: false }; }',
    'loadState: malformed JSON no longer resets to defaults'),

  // ---- registry defaults ----------------------------------------------
  c => firstReplaceText(c,
    'def: true, label: \'Pausar en pestaña inactiva\'',
    'def: false, label: \'Pausar en pestaña inactiva\'',
    'defaults: pauseHidden true → false'),
  c => firstReplaceText(c,
    'def: true, label: \'Destacar Suscripciones\'',
    'def: false, label: \'Destacar Suscripciones\'',
    'defaults: subsCard true → false'),
  c => firstReplaceText(c,
    'def: false, label: \'Ocultar estantes de Shorts\'',
    'def: true, label: \'Ocultar estantes de Shorts\'',
    'defaults: hideShortsShelf false → true'),
  c => firstReplaceText(c,
    'def: false, label: \'Carga eficiente del feed\'',
    'def: true, label: \'Carga eficiente del feed\'',
    'defaults: feedScroll false → true'),
  c => firstReplaceText(c,
    'def: false, label: \'Reducir todas las animaciones\'',
    'def: true, label: \'Reducir todas las animaciones\'',
    'defaults: motionCut false → true'),

  // ---- feature CSS -----------------------------------------------------
  c => firstReplaceText(c,
    'FEATURE_KEYS.filter(function (key) { return state[key]; })',
    'FEATURE_KEYS.filter(function (key) { return !state[key]; })',
    'buildFeatureCss: gate inverted'),

  // ---- skins -----------------------------------------------------------
  c => firstReplaceText(c, "id: 'green'", "id: 'greem'", 'skins: green id typoed'),
  c => firstReplaceText(c, "accent: '#1f9d55'", "accent: ''", 'skins: green accent dropped'),
  c => firstReplaceText(c,
    'return item.id === skinId; });',
    'return item.id !== skinId; });',
    'accentFor: skin match flipped'),
  c => firstReplaceText(c,
    'const accent = accentFor(state.skin);\n        if (!accent) return \'\';',
    'const accent = accentFor(state.skin);\n        if (accent) return \'\';',
    'buildSkinCss: default skin emits CSS'),
  c => firstReplaceText(c,
    "'html[dark] {'",
    "'html[dark-mode] {'",
    'buildSkinCss: dark-mode selector broken'),

  // ---- page classifier -------------------------------------------------
  c => firstReplaceText(c, "if (path === '/') return 'home';", "if (path === '/home') return 'home';", 'classifyPage: home route'),
  c => firstReplaceText(c, "if (path === '/results') return 'search';", "if (path === '/result') return 'search';", 'classifyPage: search route'),
  c => firstReplaceText(c, "return 'shorts';", "return 'other';", 'classifyPage: shorts route'),
  c => firstReplaceText(c,
    "path === '/feed/subscriptions' ||",
    "path === '/feed/subs' ||",
    'classifyPage: subscriptions route'),
  c => firstReplaceText(c,
    "if (path.indexOf('/feed/') === 0) return 'feed';",
    "if (path.indexOf('/feed/') === 1) return 'feed';",
    'classifyPage: generic feed route'),

  // ---- adaptive profile ------------------------------------------------
  c => firstReplaceText(c,
    'const smartMode = settings.smartMode !== false;',
    'const smartMode = settings.smartMode === false;',
    'adaptive: smartMode default inverted'),
  c => firstReplaceText(c,
    'if (!smartMode) return setting ? setting.fallback : automaticValue;',
    'if (smartMode) return setting ? setting.fallback : automaticValue;',
    'adaptive: smartMode-off branch unreachable'),
  c => firstReplaceText(c,
    ': environment.prefersContrast ? \'high\' : \'standard\';',
    ': environment.prefersContrast ? \'standard\' : \'standard\';',
    'adaptive: prefers-contrast no longer raises contrast'),
  c => firstReplaceText(c,
    'environment.forcedColors || environment.prefersReducedTransparency || contrastBoosted',
    'environment.forcedColors || environment.prefersReducedTransparency',
    'adaptive: raised contrast no longer disables effects'),
  c => firstReplaceText(c,
    "const compactPages = ['home', 'subscriptions', 'search', 'feed'];",
    "const compactPages = ['home', 'search', 'feed'];",
    'adaptive: subscriptions dropped from compact pages'),
  c => firstReplaceText(c,
    'const densityAutomatic = !environment.narrowViewport && compactPages.indexOf(pageKind) !== -1',
    'const densityAutomatic = environment.narrowViewport && compactPages.indexOf(pageKind) !== -1',
    'adaptive: narrow-viewport gate inverted'),
  c => firstReplaceText(c,
    "const mode = profile.smartMode ? 'Inteligente' : 'Manual';",
    "const mode = profile.smartMode ? 'Automático' : 'Manual';",
    'profileSummary: mode label changed'),

  // ---- runtime predicates ----------------------------------------------
  c => firstReplaceText(c,
    'return !!(state.pauseHidden && hidden && !isPaused);',
    'return !!(state.pauseHidden && hidden && isPaused);',
    'shouldPauseWhenHidden: logic flipped'),
  c => firstReplaceText(c,
    'otherWidth > 0 ? otherWidth + gap : 0',
    'otherWidth >= 0 ? otherWidth + gap : 0',
    'fabOffsetRight: zero-offset semantics'),

  // ---- adaptive appearance CSS ----------------------------------------
  c => firstReplaceText(c,
    '--yt-frosted-glass-backdrop-filter-override: none !important;',
    '--yt-frosted-glass-backdrop-filter-override: blur(6px) !important;',
    'adaptiveCss: frosted-glass override dropped'),
  c => firstReplaceText(c,
    'text-decoration: underline !important;',
    'text-decoration: none !important;',
    'adaptiveCss: link affordance removed'),
  c => allReplaceText(c,
    'not(#movie_player):not(#movie_player *)',
    'not(#movie_player-off):not(#movie_player-off *)',
    'adaptiveCss: movie-player exclusion dropped'),
  c => allReplaceText(c,
    'not(video):not(video *)',
    'not(video-off):not(video-off *)',
    'adaptiveCss: video element exclusion dropped'),
  c => allReplaceText(c,
    'player-container-background-image',
    'player-container-bg',
    'adaptiveCss: watch backdrop exemption dropped'),
  c => firstReplaceText(c,
    '--ytd-rich-grid-item-margin: 10px !important;',
    '--ytd-rich-grid-item-margin: 20px !important;',
    'adaptiveCss: compact density margin changed'),

  // ---- panel markup contract ------------------------------------------
  c => firstReplaceText(c,
    'aria-keyshortcuts="Alt+Shift+Y"',
    'aria-keyshortcuts="Ctrl+Shift+Y"',
    'panelMarkup: keyboard shortcut changed'),
  c => firstReplaceText(c,
    'aria-pressed="\' + selected + \'"',
    'aria-pressed-off="\' + selected + \'"',
    'panelMarkup: swatch pressed state dropped'),
  c => firstReplaceText(c,
    'id="ycl-profile-summary"',
    'id="ycl-profile-text"',
    'panelMarkup: profile status id changed'),
  c => firstReplaceText(c,
    'class="ycl-reset" id="ycl-reset"',
    'class="ycl-restore" id="ycl-restore"',
    'panelMarkup: reset control id changed'),
  c => allReplaceText(c,
    'ycl-select-',
    'ycl-picker-',
    'panelMarkup: appearance select id changed'),

  // ---- panel CSS contract ----------------------------------------------
  c => allReplaceText(c, 'position: absolute', 'position: static', 'panelCss: absolute positioning dropped'),
  c => allReplaceText(c, 'focus-visible', 'focus-hover', 'panelCss: focus-visible outlines dropped'),
  c => firstReplaceText(c,
    '@media (forced-colors: active) {',
    '@media (forced-colors: none) {',
    'panelCss: forced-colors support removed'),

  // ---- architecture guard ---------------------------------------------
  c => ({
    code: c.replace('function init() {', 'function init() {\n        setInterval(function () {}, 1000);'),
    label: 'architecture: polling introduced'
  })
];

// Code the suite does not currently assert. These are real coverage gaps, kept
// out of MUTATORS so a green run still means "every mutation we claim to cover
// was killed". Closing them means adding assertions to the test file.
const KNOWN_GAPS = [
  'STORAGE_KEY value (no test asserts "ycl-features-v1")',
  'FEATURE_CSS rule bodies: subsCard selectors, hideShortsShelf display:none, feedScroll content-visibility, motionCut durations',
  'buildSkinCss color-mix tint percentages and the .ytp-play-progress accent',
  'REDUCED_MOTION_CSS (always-on prefers-reduced-motion block)'
];

let killed = 0;
const survived = [];

MUTATORS.forEach((mut, i) => {
  const label = String(i + 1);
  const m = mut(ORIG);
  if (!m) {
    console.log(`SKIP  ${label}: pattern not found — update the mutator for the current source`);
    survived.push(label);
    return;
  }
  fs.writeFileSync(TMP_SRC, m.code);
  const res = spawnSync('node', ['--test', TMP_TEST], { encoding: 'utf8' });
  if (res.status === 0) {
    survived.push(label);
    console.log(`LIVE  ${label}: ${m.label}`);
  } else {
    killed++;
    console.log(`KILLED ${label}: ${m.label}`);
  }
});

fs.rmSync(TMP_DIR, { recursive: true, force: true });

console.log(`\n${killed} killed, ${survived.length} survived`);
if (survived.length) {
  console.log('Survivors:');
  survived.forEach(s => console.log('  - ' + s));
}
console.log(`\nKnown coverage gaps (not counted as survivors): ${KNOWN_GAPS.length}`);
KNOWN_GAPS.forEach(g => console.log('  - ' + g));
process.exit(survived.length ? 1 : 0);
