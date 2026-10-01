const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const scriptPath = process.env.YCL_SCRIPT_UNDER_TEST || path.resolve(__dirname, '..', 'youtube-custom-light.user.js');
const script = require(scriptPath);

test('loadState defaults, enables the transparent smart profile, and recovers from malformed JSON', () => {
    assert.deepEqual(script.loadState(''), {
        pauseHidden: true,
        subsCard: true,
        hideShortsShelf: false,
        feedScroll: false,
        motionCut: false,
        smartMode: true,
        contrastMode: 'auto',
        effectsMode: 'auto',
        densityMode: 'auto',
        skin: 'default'
    });
    assert.deepEqual(script.loadState('{broken'), script.loadState(''));
});

test('overlay handling stays event-driven and does not add a periodic sweep', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    assert.doesNotMatch(source, /setInterval\s*\(/);
});

test('runtime reuses each context snapshot and avoids rewriting identical feature CSS', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    assert.match(source, /const context = readContext\(\);\s*applyFeatureCss\(context\);\s*const profile = applyAppearance\(context\);/);
    assert.match(source, /if \(featuresNode\.textContent !== css\) featuresNode\.textContent = css;/);
    assert.doesNotMatch(source, /applyFeatureCss\(\);/);
});

test('loadState validates booleans, appearance choices, and the selected accent', () => {
    const state = script.loadState(JSON.stringify({
        pauseHidden: false,
        hideShortsShelf: true,
        feedScroll: 'yes',
        smartMode: false,
        contrastMode: 'maximum',
        effectsMode: 'invented',
        densityMode: 'compact',
        skin: 'violet',
        extra: true
    }));
    assert.equal(state.pauseHidden, false);
    assert.equal(state.hideShortsShelf, true);
    assert.equal(state.feedScroll, false);
    assert.equal(state.smartMode, false);
    assert.equal(state.contrastMode, 'maximum');
    assert.equal(state.effectsMode, 'auto');
    assert.equal(state.densityMode, 'compact');
    assert.equal(state.skin, 'violet');
    assert.equal(Object.hasOwn(state, 'extra'), false);
});

test('legacy 1.1.5 preferences remain readable when new settings are added', () => {
    const state = script.loadState(JSON.stringify({
        pauseHidden: false,
        subsCard: false,
        hideShortsShelf: true,
        feedScroll: true,
        motionCut: true,
        skin: 'ocean'
    }));
    assert.equal(state.pauseHidden, false);
    assert.equal(state.subsCard, false);
    assert.equal(state.hideShortsShelf, true);
    assert.equal(state.feedScroll, true);
    assert.equal(state.motionCut, true);
    assert.equal(state.skin, 'ocean');
    assert.equal(state.smartMode, true);
    assert.equal(state.contrastMode, 'auto');
});

test('feature CSS is gated by the feature state', () => {
    const off = script.buildFeatureCss(script.loadState(''));
    assert.equal(off.includes('ytd-reel-shelf-renderer'), false);
    const on = script.buildFeatureCss({ ...script.loadState(''), hideShortsShelf: true });
    assert.equal(on.includes('ytd-reel-shelf-renderer'), true);
});

test('adaptive profile responds to page context and accessibility preferences', () => {
    const state = script.loadState('');
    const feed = script.resolveAdaptiveProfile(state, {
        pageKind: 'subscriptions',
        narrowViewport: false,
        prefersContrast: false,
        prefersReducedMotion: false,
        prefersReducedTransparency: false,
        forcedColors: false
    });
    assert.equal(feed.contrast, 'standard');
    assert.equal(feed.effects, 'standard');
    assert.equal(feed.density, 'compact');
    assert.match(script.profileSummary(feed), /Inteligente · Suscripciones/);

    const accessible = script.resolveAdaptiveProfile(state, {
        pageKind: 'watch',
        narrowViewport: false,
        prefersContrast: true,
        prefersReducedMotion: true,
        prefersReducedTransparency: false,
        forcedColors: false
    });
    assert.equal(accessible.contrast, 'high');
    assert.equal(accessible.effects, 'none');
    assert.equal(accessible.density, 'comfortable');
});

test('manual choices take precedence, and disabling smart mode uses predictable defaults', () => {
    const automatic = script.loadState('');
    const manual = {
        ...automatic,
        contrastMode: 'standard',
        effectsMode: 'standard',
        densityMode: 'comfortable'
    };
    const context = {
        pageKind: 'home',
        narrowViewport: false,
        prefersContrast: true,
        prefersReducedMotion: true,
        prefersReducedTransparency: true,
        forcedColors: false
    };
    const chosen = script.resolveAdaptiveProfile(manual, context);
    assert.equal(chosen.contrast, 'standard');
    assert.equal(chosen.effects, 'standard');
    assert.equal(chosen.density, 'comfortable');

    const fixed = script.resolveAdaptiveProfile({ ...automatic, smartMode: false }, context);
    assert.equal(fixed.contrast, 'standard');
    assert.equal(fixed.effects, 'standard');
    assert.equal(fixed.density, 'comfortable');
});

test('forced-colors leaves palette control to the operating system', () => {
    const profile = script.resolveAdaptiveProfile(script.loadState(''), {
        pageKind: 'search',
        forcedColors: true,
        prefersContrast: true,
        prefersReducedMotion: false,
        prefersReducedTransparency: false,
        narrowViewport: false
    });
    assert.equal(profile.contrast, 'system');
    assert.equal(profile.effects, 'none');
});

test('page classifier recognizes the captured YouTube routes', () => {
    assert.equal(script.classifyPage('/'), 'home');
    assert.equal(script.classifyPage('/feed/subscriptions'), 'subscriptions');
    assert.equal(script.classifyPage('/results'), 'search');
    assert.equal(script.classifyPage('/watch'), 'watch');
    assert.equal(script.classifyPage('/shorts/abc123'), 'shorts');
    assert.equal(script.classifyPage('/feed/history'), 'feed');
    assert.equal(script.classifyPage('/channel/example'), 'other');
});

test('skin CSS follows YouTube dark mode rather than the always-present darker-theme marker', () => {
    assert.equal(script.accentFor('ocean'), '#1e6ef5');
    assert.equal(script.accentFor('unknown'), '');
    const css = script.buildSkinCss({ skin: 'green' });
    assert.match(css, /html\[dark\]/);
    assert.match(css, /html:not\(\[dark\]\)/);
    assert.equal(css.includes('darker-dark-theme'), false);
    assert.equal(script.buildSkinCss({ skin: 'default' }), '');
});

test('custom skin accent is omitted in forced-colors mode', () => {
    assert.equal(script.buildSkinCss({ skin: 'green' }, { forcedColors: true }), '');
});

test('appearance CSS provides high contrast and effect controls without filtering video pixels', () => {
    const css = script.buildAdaptiveCss();
    assert.match(css, /ycl-contrast-high/);
    assert.match(css, /ycl-contrast-max/);
    assert.match(css, /--yt-frosted-glass-backdrop-filter-override: none/);
    assert.match(css, /player-container-background-image/);
    assert.match(css, /--ytd-rich-grid-item-margin: 10px/);
    assert.match(css, /text-decoration: underline/);
    assert.match(css, /not\(#movie_player\):not\(#movie_player \*\)/);
    assert.match(css, /not\(video\):not\(video \*\)/);
});

test('hidden-tab pause predicate only pauses playing videos when enabled', () => {
    assert.equal(script.shouldPauseWhenHidden({ pauseHidden: true }, true, false), true);
    assert.equal(script.shouldPauseWhenHidden({ pauseHidden: false }, true, false), false);
    assert.equal(script.shouldPauseWhenHidden({ pauseHidden: true }, false, false), false);
    assert.equal(script.shouldPauseWhenHidden({ pauseHidden: true }, true, true), false);
});

test('FAB docking offset is bounded and no longer accepts an unused own width', () => {
    assert.equal(script.fabOffsetRight(0), 0);
    assert.equal(script.fabOffsetRight(50), 52);
    assert.equal(script.fabOffsetRight(Number.NaN), 0);
});

test('panel builders expose settings, status, keyboard shortcut, and accessible controls', () => {
    const markup = script.buildPanelMarkup();
    assert.match(markup, /aria-controls="ycl-panel"/);
    assert.match(markup, /aria-expanded="false"/);
    assert.match(markup, /aria-keyshortcuts="Alt\+Shift\+Y"/);
    assert.match(markup, /aria-labelledby=/);
    assert.match(markup, /aria-describedby=/);
    assert.match(markup, /aria-pressed="true"/);
    assert.match(markup, /ycl-select-contrastMode/);
    assert.match(markup, /ycl-select-effectsMode/);
    assert.match(markup, /ycl-select-densityMode/);
    assert.match(markup, /ycl-profile-summary/);
    assert.match(markup, /ycl-reset/);
    assert.match(script.buildPanelCss(), /position: absolute/);
    assert.match(script.buildPanelCss(), /focus-visible/);
    assert.match(script.buildPanelCss(), /forced-colors: active/);
});
