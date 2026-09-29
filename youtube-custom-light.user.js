// ==UserScript==
// @name         YouTube Custom Light
// @name:en      YouTube Custom Light
// @name:es      YouTube Custom Light
// @namespace    https://github.com/MoriNo23/youtube-custom-light
// @version      1.2.0
// @description  Adaptive YouTube appearance, high contrast, reduced visual effects, optional feed tools, and a settings panel.
// @description:en  Adaptive YouTube appearance, high contrast, reduced visual effects, optional feed tools, and a settings panel.
// @description:es  Apariencia adaptable, alto contraste, reducción de efectos visuales, herramientas opcionales para el feed y panel de ajustes.
// @author       MoriNo23
// @license      MIT
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @downloadURL  https://update.greasyfork.org/scripts/590557/youtube-custom-light.user.js
// @updateURL    https://update.greasyfork.org/scripts/590557/youtube-custom-light.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

/* global module */

(function () {
    'use strict';

    // ------------------------------------------------------------------
    // Settings registry: panel controls, state keys, defaults and labels.
    // ------------------------------------------------------------------
    const TOGGLES = [
        { id: 't01', feat: 'pauseHidden', def: true, label: 'Pausar en pestaña inactiva', desc: 'Pausa los videos que siguen reproduciéndose cuando cambias de pestaña.' },
        { id: 't02', feat: 'subsCard', def: true, label: 'Destacar Suscripciones', desc: 'Marca la entrada de Suscripciones en el menú lateral.' },
        { id: 't03', feat: 'hideShortsShelf', def: false, label: 'Ocultar estantes de Shorts', desc: 'Oculta las filas de Shorts; no cambia la página de Shorts.' },
        { id: 't04', feat: 'feedScroll', def: false, label: 'Carga eficiente del feed', desc: 'Difiere parte del renderizado en cuadrículas largas. Experimental.' },
        { id: 't05', feat: 'motionCut', def: false, label: 'Reducir todas las animaciones', desc: 'Reduce animaciones y transiciones de la interfaz. El video no se modifica.' }
    ];

    const SKINS = [
        { id: 'default', label: 'Original', accent: '' },
        { id: 'green', label: 'Verde', accent: '#1f9d55' },
        { id: 'ocean', label: 'Océano', accent: '#1e6ef5' },
        { id: 'sunset', label: 'Atardecer', accent: '#e85d04' },
        { id: 'violet', label: 'Violeta', accent: '#8f5bd9' }
    ];

    const SELECT_SETTINGS = [
        {
            key: 'contrastMode',
            label: 'Contraste',
            desc: 'Refuerza texto, bordes y foco sin alterar el video.',
            fallback: 'standard',
            options: [
                { value: 'auto', label: 'Automático' },
                { value: 'standard', label: 'Normal' },
                { value: 'high', label: 'Alto' },
                { value: 'maximum', label: 'Máximo' }
            ]
        },
        {
            key: 'effectsMode',
            label: 'Efectos visuales',
            desc: 'Controla desenfoques, transparencias y sombras decorativas.',
            fallback: 'standard',
            options: [
                { value: 'auto', label: 'Automático' },
                { value: 'standard', label: 'YouTube' },
                { value: 'reduced', label: 'Reducidos' },
                { value: 'none', label: 'Ninguno' }
            ]
        },
        {
            key: 'densityMode',
            label: 'Densidad del feed',
            desc: 'Ajusta el espacio entre tarjetas en cuadrículas amplias.',
            fallback: 'comfortable',
            options: [
                { value: 'auto', label: 'Automática' },
                { value: 'comfortable', label: 'Cómoda' },
                { value: 'compact', label: 'Compacta' }
            ]
        }
    ];

    const STORAGE_KEY = 'ycl-features-v1';
    const PAGE_LABELS = Object.freeze({
        home: 'Inicio',
        subscriptions: 'Suscripciones',
        search: 'Resultados',
        watch: 'Reproductor',
        shorts: 'Shorts',
        feed: 'Feed',
        other: 'YouTube'
    });

    // Theme faces use YouTube's current color tokens where available.
    const RAISED = 'var(--yt-sys-color-baseline--raised-background, var(--ycl-raised-fallback, #f9f9f9))';
    const RIM = 'var(--yt-sys-color-baseline--tonal-rim, var(--ycl-rim-fallback, rgba(0,0,0,0.12)))';

    const FEATURE_CSS = Object.freeze({
        subsCard: [
            'ytd-guide-collapsible-entry-renderer > ytd-guide-entry-renderer#expander-item,',
            'ytd-guide-entry-renderer:has(> a#endpoint[href*="/feed/subscriptions"]) {',
            '    background: ' + RAISED + ';',
            '    border: 1px solid ' + RIM + ';',
            '    border-radius: 8px;',
            '}',
            'ytd-guide-collapsible-entry-renderer > div#expanded {',
            '    background: color-mix(in srgb, ' + RAISED + ' 45%, transparent);',
            '    border-radius: 10px;',
            '    padding: 2px 4px;',
            '    margin: 4px 0 2px;',
            '}'
        ].join('\n'),
        // Deliberately global: hides every Shorts shelf wherever YouTube renders it.
        hideShortsShelf: [
            'ytd-reel-shelf-renderer {',
            '    display: none !important;',
            '}'
        ].join('\n'),
        feedScroll: [
            'ytd-rich-item-renderer {',
            '    content-visibility: auto;',
            '    contain-intrinsic-size: auto 520px;',
            '}'
        ].join('\n'),
        motionCut: [
            'html *, html *::before, html *::after {',
            '    animation-duration: 0.01ms !important;',
            '    animation-iteration-count: 1 !important;',
            '    transition-duration: 0.01ms !important;',
            '    animation-delay: 0ms !important;',
            '    transition-delay: 0ms !important;',
            '    scroll-behavior: auto !important;',
            '}'
        ].join('\n')
    });

    // Respect the operating-system reduced-motion preference. The separate
    // setting above remains an explicit override for the whole YouTube UI.
    const REDUCED_MOTION_CSS = [
        '@media (prefers-reduced-motion: reduce) {',
        '    html *, html *::before, html *::after {',
        '        animation-duration: 0.01ms !important;',
        '        animation-iteration-count: 1 !important;',
        '        transition-duration: 0.01ms !important;',
        '        animation-delay: 0ms !important;',
        '        transition-delay: 0ms !important;',
        '    }',
        '    html { scroll-behavior: auto !important; }',
        '}'
    ].join('\n');

    // ------------------------------------------------------------------
    // Pure core (unit-tested in Node)
    // ------------------------------------------------------------------
    function loadState(raw) {
        const out = {};
        let parsed = null;
        if (typeof raw === 'string' && raw !== '') {
            try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
        }
        TOGGLES.forEach(function (toggle) {
            const value = parsed && Object.prototype.hasOwnProperty.call(parsed, toggle.feat)
                ? parsed[toggle.feat]
                : toggle.def;
            out[toggle.feat] = typeof value === 'boolean' ? value : toggle.def;
        });
        out.smartMode = parsed && typeof parsed.smartMode === 'boolean' ? parsed.smartMode : true;
        SELECT_SETTINGS.forEach(function (setting) {
            const value = parsed && parsed[setting.key];
            const valid = setting.options.some(function (option) { return option.value === value; });
            out[setting.key] = valid ? value : 'auto';
        });
        const skin = parsed && parsed.skin;
        out.skin = SKINS.some(function (item) { return item.id === skin; }) ? skin : 'default';
        return out;
    }

    const FEATURE_KEYS = Object.keys(FEATURE_CSS);

    function buildFeatureCss(state) {
        return FEATURE_KEYS.filter(function (key) { return state[key]; })
            .map(function (key) { return FEATURE_CSS[key]; })
            .join('\n');
    }

    function accentFor(skinId) {
        const skin = SKINS.find(function (item) { return item.id === skinId; });
        return skin ? skin.accent : '';
    }

    function buildSkinCss(state) {
        const accent = accentFor(state.skin);
        if (!accent) return '';

        // Use YouTube's actual [dark] marker; the darker-dark-theme marker is
        // also present on light pages and is not, by itself, a dark-mode test.
        const darkOverrides = [
            'html[dark] {',
            '    --yt-sys-color-baseline--raised-background: color-mix(in srgb, ' + accent + ' 12%, #212121) !important;',
            '    --yt-deprecated-general-background-b: color-mix(in srgb, ' + accent + ' 7%, #0f0f0f) !important;',
            '    --yt-sys-color-baseline--tonal-rim: color-mix(in srgb, ' + accent + ' 30%, rgba(255,255,255,0.12)) !important;',
            '}'
        ].join('\n');
        const lightOverrides = [
            'html:not([dark]) {',
            '    --yt-sys-color-baseline--raised-background: color-mix(in srgb, ' + accent + ' 8%, #ffffff) !important;',
            '    --yt-deprecated-general-background-b: color-mix(in srgb, ' + accent + ' 5%, #f9f9f9) !important;',
            '    --yt-sys-color-baseline--tonal-rim: color-mix(in srgb, ' + accent + ' 25%, rgba(0,0,0,0.12)) !important;',
            '}'
        ].join('\n');
        return [
            darkOverrides,
            lightOverrides,
            '.ytp-play-progress { background: ' + accent + ' !important; }',
            '#ycl-root { --ycl-accent: ' + accent + '; }',
            '#ycl-fab { border-color: var(--ycl-accent); color: var(--ycl-accent); }',
            '#ycl-fab:hover { background: color-mix(in srgb, var(--ycl-accent) 18%, ' + RAISED + '); }',
            '.ycl-switch input:checked + .ycl-tr { background: var(--ycl-accent); }'
        ].join('\n');
    }

    function classifyPage(pathname) {
        const path = typeof pathname === 'string' ? pathname : '/';
        if (/^\/shorts(?:\/|$)/.test(path)) return 'shorts';
        if (path === '/watch' || /^\/(?:live|embed)(?:\/|$)/.test(path)) return 'watch';
        if (path === '/results') return 'search';
        if (path === '/feed/subscriptions' || path.indexOf('/feed/subscriptions/') === 0) return 'subscriptions';
        if (path === '/') return 'home';
        if (path.indexOf('/feed/') === 0) return 'feed';
        return 'other';
    }

    function resolveAdaptiveProfile(state, context) {
        const settings = state || {};
        const environment = context || {};
        const smartMode = settings.smartMode !== false;
        const pageKind = Object.prototype.hasOwnProperty.call(PAGE_LABELS, environment.pageKind)
            ? environment.pageKind
            : 'other';

        function resolveChoice(key, automaticValue) {
            const setting = SELECT_SETTINGS.find(function (item) { return item.key === key; });
            const configured = settings[key];
            if (setting && setting.options.some(function (option) {
                return option.value === configured && option.value !== 'auto';
            })) {
                return configured;
            }
            if (!smartMode) return setting ? setting.fallback : automaticValue;
            return automaticValue;
        }

        const contrastAutomatic = environment.forcedColors
            ? 'system'
            : environment.prefersContrast ? 'high' : 'standard';
        const contrast = resolveChoice('contrastMode', contrastAutomatic);
        const contrastBoosted = contrast === 'high' || contrast === 'maximum';
        const effectsAutomatic = environment.forcedColors || environment.prefersReducedTransparency || contrastBoosted
            ? 'none'
            : environment.prefersReducedMotion ? 'reduced' : 'standard';
        const effects = resolveChoice('effectsMode', effectsAutomatic);
        const compactPages = ['home', 'subscriptions', 'search', 'feed'];
        const densityAutomatic = !environment.narrowViewport && compactPages.indexOf(pageKind) !== -1
            ? 'compact'
            : 'comfortable';
        const density = resolveChoice('densityMode', densityAutomatic);

        return {
            smartMode: smartMode,
            pageKind: pageKind,
            pageLabel: PAGE_LABELS[pageKind],
            contrast: contrast,
            effects: effects,
            density: density
        };
    }

    function profileSummary(profile) {
        const contrastLabels = { system: 'del sistema', standard: 'normal', high: 'alto', maximum: 'máximo' };
        const effectLabels = { standard: 'de YouTube', reduced: 'reducidos', none: 'desactivados' };
        const densityLabels = { comfortable: 'cómoda', compact: 'compacta' };
        const mode = profile.smartMode ? 'Inteligente' : 'Manual';
        return mode + ' · ' + profile.pageLabel + ' · contraste ' + (contrastLabels[profile.contrast] || 'normal') +
            ' · efectos ' + (effectLabels[profile.effects] || 'de YouTube') +
            ' · densidad ' + (densityLabels[profile.density] || 'cómoda');
    }

    function shouldPauseWhenHidden(state, hidden, isPaused) {
        return !!(state.pauseHidden && hidden && !isPaused);
    }

    // Side-by-side docking: the offset is the other button's width plus a gap.
    function fabOffsetRight(otherWidth) {
        const gap = 2;
        return Number.isFinite(otherWidth) && otherWidth > 0 ? otherWidth + gap : 0;
    }

    // ------------------------------------------------------------------
    // Appearance CSS: scoped to YouTube chrome; video pixels are preserved.
    // ------------------------------------------------------------------
    function buildAdaptiveCss() {
        const lightContrastSelector = 'html.ycl-contrast-high:not([dark]), html.ycl-contrast-max:not([dark])';
        const darkContrastSelector = 'html[dark].ycl-contrast-high, html[dark].ycl-contrast-max';
        const lightPalette = [
            '    --ycl-contrast-focus: #003db8 !important;',
            '    --yt-sys-color-baseline--base-background: #ffffff !important;',
            '    --yt-sys-color-baseline--raised-background: #ffffff !important;',
            '    --yt-sys-color-baseline--menu-background: #ffffff !important;',
            '    --yt-sys-color-baseline--inverted-background: #000000 !important;',
            '    --yt-sys-color-baseline--text-primary: #000000 !important;',
            '    --yt-sys-color-baseline--text-secondary: #202020 !important;',
            '    --yt-sys-color-baseline--text-disabled: #555555 !important;',
            '    --yt-sys-color-baseline--outline: #333333 !important;',
            '    --yt-sys-color-baseline--tonal-rim: #333333 !important;',
            '    --yt-sys-color-baseline--call-to-action: #003db8 !important;',
            '    --yt-sys-color-baseline--call-to-action-inverse: #003db8 !important;',
            '    --yt-sys-color-baseline--additive-background: #e8e8e8 !important;',
            '    --yt-sys-color-baseline--overlay-background-medium: rgba(0,0,0,0.96) !important;',
            '    --yt-sys-color-baseline--overlay-text-primary: #ffffff !important;',
            '    --yt-sys-color-baseline--overlay-outline: rgba(255,255,255,0.85) !important;',
            '    --yt-deprecated-general-background-a: #ffffff !important;',
            '    --yt-deprecated-general-background-b: #f5f5f5 !important;',
            '    --yt-deprecated-general-background-c: #e9e9e9 !important;',
            '    --yt-spec-base-background: #ffffff !important;',
            '    --yt-spec-raised-background: #ffffff !important;',
            '    --yt-spec-text-primary: #000000 !important;',
            '    --yt-spec-text-secondary: #202020 !important;',
            '    --yt-spec-text-disabled: #555555 !important;',
            '    --yt-spec-outline: #333333 !important;',
            '    --yt-spec-call-to-action: #003db8 !important;',
            '    --ytd-searchbox-background: #ffffff !important;',
            '    --ytd-searchbox-text-color: #111111 !important;',
            '    --ytd-searchbox-border-color: #333333 !important;',
            '}'
        ].join('\n');
        const darkPalette = [
            '    --ycl-contrast-focus: #8ab4ff !important;',
            '    --yt-sys-color-baseline--base-background: #000000 !important;',
            '    --yt-sys-color-baseline--raised-background: #000000 !important;',
            '    --yt-sys-color-baseline--menu-background: #080808 !important;',
            '    --yt-sys-color-baseline--inverted-background: #ffffff !important;',
            '    --yt-sys-color-baseline--text-primary: #ffffff !important;',
            '    --yt-sys-color-baseline--text-secondary: #f0f0f0 !important;',
            '    --yt-sys-color-baseline--text-disabled: #c8c8c8 !important;',
            '    --yt-sys-color-baseline--outline: #d0d0d0 !important;',
            '    --yt-sys-color-baseline--tonal-rim: #d0d0d0 !important;',
            '    --yt-sys-color-baseline--call-to-action: #8ab4ff !important;',
            '    --yt-sys-color-baseline--call-to-action-inverse: #8ab4ff !important;',
            '    --yt-sys-color-baseline--additive-background: rgba(255,255,255,0.16) !important;',
            '    --yt-sys-color-baseline--overlay-background-medium: rgba(0,0,0,0.98) !important;',
            '    --yt-sys-color-baseline--overlay-text-primary: #ffffff !important;',
            '    --yt-sys-color-baseline--overlay-outline: rgba(255,255,255,0.9) !important;',
            '    --yt-deprecated-general-background-a: #000000 !important;',
            '    --yt-deprecated-general-background-b: #080808 !important;',
            '    --yt-deprecated-general-background-c: #151515 !important;',
            '    --yt-spec-base-background: #000000 !important;',
            '    --yt-spec-raised-background: #000000 !important;',
            '    --yt-spec-text-primary: #ffffff !important;',
            '    --yt-spec-text-secondary: #f0f0f0 !important;',
            '    --yt-spec-text-disabled: #c8c8c8 !important;',
            '    --yt-spec-outline: #d0d0d0 !important;',
            '    --yt-spec-call-to-action: #8ab4ff !important;',
            '    --ytd-searchbox-background: #000000 !important;',
            '    --ytd-searchbox-text-color: #ffffff !important;',
            '    --ytd-searchbox-border-color: #d0d0d0 !important;',
            '}'
        ].join('\n');
        return [
            lightContrastSelector + ' {',
            lightPalette,
            darkContrastSelector + ' {',
            darkPalette,
            'html.ycl-contrast-high ytd-app,',
            'html.ycl-contrast-max ytd-app {',
            '    color: var(--yt-sys-color-baseline--text-primary, #000000) !important;',
            '    background-color: var(--yt-sys-color-baseline--base-background, #ffffff) !important;',
            '}',
            'html.ycl-contrast-high ytd-app a:focus-visible,',
            'html.ycl-contrast-high ytd-app button:focus-visible,',
            'html.ycl-contrast-high ytd-app [role="button"]:focus-visible',
            'html.ycl-contrast-high ytd-app input:focus-visible,',
            'html.ycl-contrast-high ytd-app select:focus-visible,',
            'html.ycl-contrast-max ytd-app a:focus-visible,',
            'html.ycl-contrast-max ytd-app button:focus-visible,',
            'html.ycl-contrast-max ytd-app [role="button"]:focus-visible,',
            'html.ycl-contrast-max ytd-app input:focus-visible,',
            'html.ycl-contrast-max ytd-app select:focus-visible {',
            '    outline: 3px solid var(--ycl-contrast-focus, #005fcc) !important;',
            '    outline-offset: 2px !important;',
            '}',
            'html.ycl-contrast-high ytd-app a:not([role="button"]),',
            'html.ycl-contrast-max ytd-app a:not([role="button"]) {',
            '    color: var(--yt-sys-color-baseline--call-to-action, #003db8) !important;',
            '    text-decoration: underline !important;',
            '    text-decoration-thickness: 1.5px !important;',
            '    text-underline-offset: 2px !important;',
            '}',
            'html.ycl-contrast-max ytd-rich-item-renderer[rich-grid-hover-highlight],',
            'html.ycl-contrast-max ytd-video-renderer,',
            'html.ycl-contrast-max ytd-compact-video-renderer,',
            'html.ycl-contrast-max ytd-menu-popup-renderer,',
            'html.ycl-contrast-max tp-yt-paper-dialog {',
            '    border: 1px solid var(--yt-sys-color-baseline--outline, #333333) !important;',
            '}',
            'html.ycl-effects-reduced, html.ycl-effects-none {',
            '    --yt-frosted-glass-backdrop-filter-override: none !important;',
            '}',
            'html.ycl-effects-reduced ytd-app :not(#movie_player):not(#movie_player *),',
            'html.ycl-effects-none ytd-app :not(#movie_player):not(#movie_player *) {',
            '    box-shadow: none !important;',
            '    text-shadow: none !important;',
            '    backdrop-filter: none !important;',
            '    -webkit-backdrop-filter: none !important;',
            '}',
            'html.ycl-effects-none ytd-app :not(#movie_player):not(#movie_player *):not(video):not(video *) {',
            '    filter: none !important;',
            '}',
            'html.ycl-effects-none ytd-masthead #background.ytd-masthead {',
            '    background-color: var(--yt-sys-color-baseline--base-background, #ffffff) !important;',
            '    background-image: none !important;',
            '}',
            'html.ycl-effects-reduced .player-container-background.ytd-watch-flexy .player-container-background-image.ytd-watch-flexy,',
            'html.ycl-effects-none .player-container-background.ytd-watch-flexy .player-container-background-image.ytd-watch-flexy,',
            'html.ycl-effects-reduced .ytMiniGameCardViewModelBackgroundBlur,',
            'html.ycl-effects-none .ytMiniGameCardViewModelBackgroundBlur,',
            'html.ycl-effects-reduced .contribYtLightShapeStaticWashLight,',
            'html.ycl-effects-none .contribYtLightShapeStaticWashLight {',
            '    filter: none !important;',
            '}',
            'html.ycl-density-compact ytd-rich-grid-renderer {',
            '    --ytd-rich-grid-item-margin: 10px !important;',
            '    --ytd-rich-grid-row-margin: 24px !important;',
            '    --ytd-rich-grid-gutter-margin: 12px !important;',
            '}'
        ].join('\n');
    }

    // ------------------------------------------------------------------
    // Panel markup contract (testable without a browser) + visual design.
    // The runtime panel is created with DOM APIs for Trusted Types CSP.
    // ------------------------------------------------------------------
    const PANEL_CSS = [
        'html:not([dark]) {',
        '    --ycl-raised-fallback: #ffffff;',
        '    --ycl-rim-fallback: rgba(0,0,0,0.16);',
        '}',
        'html[dark] {',
        '    --ycl-raised-fallback: #212121;',
        '    --ycl-rim-fallback: rgba(255,255,255,0.18);',
        '}',
        '#ycl-root {',
        '    position: fixed;',
        '    right: 0;',
        '    bottom: 0;',
        '    z-index: 2147483647;',
        '    --ycl-dock-offset: 0px;',
        '    --ycl-panel-bg: var(--yt-sys-color-baseline--menu-background, var(--ycl-raised-fallback, #ffffff));',
        '    --ycl-text: var(--yt-sys-color-baseline--text-primary, #111111);',
        '    --ycl-muted: var(--yt-sys-color-baseline--text-secondary, #606060);',
        '    --ycl-line: var(--yt-sys-color-baseline--outline, var(--ycl-rim-fallback));',
        '    --ycl-accent: var(--yt-sys-color-baseline--call-to-action, #065fd4);',
        '    font-family: Roboto, Arial, sans-serif;',
        '    color: var(--ycl-text);',
        '    color-scheme: light;',
        '}',
        'html[dark] #ycl-root { color-scheme: dark; }',
        '#ycl-fab {',
        '    box-sizing: border-box;',
        '    width: 48px;',
        '    height: 38px;',
        '    border: 1px solid var(--ycl-line);',
        '    border-bottom: 0;',
        '    border-radius: 12px 0 0 0;',
        '    background: var(--ycl-panel-bg);',
        '    color: var(--ycl-accent);',
        '    cursor: pointer;',
        '    display: flex;',
        '    align-items: center;',
        '    justify-content: center;',
        '    box-shadow: 0 -4px 18px rgba(0,0,0,0.18);',
        '}',
        '#ycl-fab:hover { filter: brightness(1.08); }',
        '#ycl-fab svg { width: 20px; height: 20px; fill: currentColor; }',
        '#ycl-fab:focus-visible, #ycl-panel button:focus-visible, #ycl-panel select:focus-visible {',
        '    outline: 2px solid var(--ycl-accent);',
        '    outline-offset: 2px;',
        '}',
        '#ycl-panel {',
        '    position: absolute;',
        '    right: 0;',
        '    bottom: 38px;',
        '    width: min(390px, calc(100vw - 20px - var(--ycl-dock-offset, 0px)));',
        '    max-height: min(760px, calc(100vh - 58px));',
        '    max-height: min(760px, calc(100dvh - 58px));',
        '    box-sizing: border-box;',
        '    overflow-x: hidden;',
        '    overflow-y: auto;',
        '    overscroll-behavior: contain;',
        '    background: var(--ycl-panel-bg);',
        '    color: var(--ycl-text);',
        '    border: 1px solid var(--ycl-line);',
        '    border-radius: 16px 16px 0 16px;',
        '    box-shadow: 0 14px 44px rgba(0,0,0,0.34);',
        '    padding: 16px;',
        '    display: none;',
        '    z-index: 2147483647;',
        '}',
        '#ycl-panel.ycl-open { display: block; }',
        '.ycl-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 14px; }',
        '.ycl-brand { display: flex; gap: 11px; min-width: 0; align-items: center; }',
        '.ycl-mark { width: 38px; height: 38px; flex: none; display: grid; place-items: center; border-radius: 12px; color: #ffffff; background: var(--ycl-accent); }',
        '.ycl-mark svg { width: 21px; height: 21px; fill: currentColor; }',
        '#ycl-panel h2 { font-size: 15px; line-height: 1.25; font-weight: 700; margin: 0; color: var(--ycl-text); }',
        '.ycl-subtitle { font-size: 11px; line-height: 1.4; margin-top: 3px; color: var(--ycl-muted); }',
        '.ycl-close { flex: none; width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid var(--ycl-line); border-radius: 10px; background: transparent; color: var(--ycl-text); cursor: pointer; }',
        '.ycl-close svg { width: 16px; height: 16px; fill: currentColor; }',
        '.ycl-smart-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; margin: 0 0 15px; border: 1px solid var(--ycl-line); border-radius: 13px; background: color-mix(in srgb, var(--ycl-accent) 8%, var(--ycl-panel-bg)); }',
        '.ycl-copy { min-width: 0; }',
        '.ycl-tt { display: block; font-size: 12px; line-height: 1.35; font-weight: 650; color: var(--ycl-text); }',
        '.ycl-dd { display: block; font-size: 11px; line-height: 1.4; margin-top: 3px; color: var(--ycl-muted); }',
        '.ycl-switch { position: relative; width: 38px; height: 22px; flex: none; }',
        '.ycl-switch input { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }',
        '.ycl-tr { position: absolute; inset: 0; border: 1px solid var(--ycl-line); border-radius: 999px; background: rgba(128,128,128,0.36); transition: background 0.15s ease; }',
        '.ycl-tr::after { content: ""; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: left 0.15s ease; }',
        '.ycl-switch input:focus-visible + .ycl-tr { outline: 2px solid var(--ycl-accent); outline-offset: 3px; }',
        '.ycl-switch input:checked + .ycl-tr { border-color: var(--ycl-accent); background: var(--ycl-accent); }',
        '.ycl-switch input:checked + .ycl-tr::after { left: 19px; }',
        '.ycl-section { margin: 0 0 14px; }',
        '.ycl-section-title { display: flex; align-items: center; gap: 8px; font-size: 10px; line-height: 1.2; letter-spacing: 0.09em; font-weight: 700; text-transform: uppercase; color: var(--ycl-muted); margin: 0 0 5px; }',
        '.ycl-section-title::after { content: ""; height: 1px; flex: 1; background: var(--ycl-line); }',
        '.ycl-settings { display: grid; gap: 2px; }',
        '.ycl-setting { display: grid; grid-template-columns: minmax(0,1fr) minmax(112px,132px); align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid color-mix(in srgb, var(--ycl-line) 70%, transparent); }',
        '.ycl-setting:last-child { border-bottom: 0; }',
        '.ycl-select { width: 100%; min-width: 0; box-sizing: border-box; border: 1px solid var(--ycl-line); border-radius: 9px; padding: 8px 9px; background: var(--ycl-panel-bg); color: var(--ycl-text); font: inherit; font-size: 11px; cursor: pointer; }',
        '.ycl-rows { display: grid; }',
        '.ycl-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid color-mix(in srgb, var(--ycl-line) 70%, transparent); cursor: pointer; }',
        '.ycl-row:last-child { border-bottom: 0; }',
        '.ycl-skins { display: flex; gap: 9px; flex-wrap: wrap; padding: 7px 0 2px; }',
        '.ycl-swatch { position: relative; width: 30px; height: 30px; flex: none; border: 2px solid transparent; border-radius: 50%; color: var(--ycl-text); background: var(--ycl-panel-bg); box-shadow: inset 0 0 0 1px var(--ycl-line); cursor: pointer; }',
        '.ycl-swatch[data-accent] { box-shadow: inset 0 0 0 1px currentColor; }',
        '.ycl-swatch .dot { position: absolute; inset: 6px; border-radius: 50%; background: currentColor; }',
        '.ycl-swatch.selected { border-color: var(--ycl-text); box-shadow: 0 0 0 2px var(--ycl-panel-bg), 0 0 0 3px var(--ycl-accent); }',
        '.ycl-status-card { padding: 11px 12px; border: 1px solid var(--ycl-line); border-radius: 12px; background: color-mix(in srgb, var(--ycl-accent) 5%, var(--ycl-panel-bg)); }',
        '.ycl-status-title { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; color: var(--ycl-text); margin-bottom: 4px; }',
        '.ycl-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #2da66a; box-shadow: 0 0 0 3px color-mix(in srgb, #2da66a 15%, transparent); }',
        '.ycl-status-text { font-size: 10.5px; line-height: 1.5; color: var(--ycl-muted); overflow-wrap: anywhere; }',
        '.ycl-panel-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }',
        '.ycl-reset { border: 0; padding: 5px 0; background: transparent; color: var(--ycl-accent); font: inherit; font-size: 10.5px; font-weight: 650; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }',
        '.ycl-footnote { max-width: 190px; text-align: right; font-size: 9.5px; line-height: 1.35; color: var(--ycl-muted); }',
        '@media (max-width: 420px) {',
        '    #ycl-panel { width: calc(100vw - 12px - var(--ycl-dock-offset, 0px)); right: 0; padding: 13px; }',
        '    .ycl-setting { grid-template-columns: minmax(0,1fr) minmax(105px,124px); gap: 7px; }',
        '}',
        '@media (forced-colors: active) {',
        '    #ycl-panel, #ycl-fab, .ycl-close, .ycl-select, .ycl-smart-card, .ycl-status-card { border: 1px solid CanvasText; }',
        '    .ycl-tr { border: 1px solid ButtonText; }',
        '    .ycl-swatch.selected { outline: 2px solid Highlight; }',
        '}'
    ].join('\n');

    function buildPanelCss() { return PANEL_CSS; }

    function buildPanelMarkup() {
        const defaults = loadState('');
        const switchMarkup = function (id, label, description, checked, extraClass) {
            const labelId = id + '-label';
            const descId = id + '-desc';
            return '<label class="ycl-row' + (extraClass ? ' ' + extraClass : '') + '">' +
                '<span class="ycl-copy"><span class="ycl-tt" id="' + labelId + '">' + label + '</span>' +
                '<span class="ycl-dd" id="' + descId + '">' + description + '</span></span>' +
                '<span class="ycl-switch"><input type="checkbox" id="' + id + '" aria-labelledby="' + labelId +
                '" aria-describedby="' + descId + '"' + (checked ? ' checked' : '') + '>' +
                '<span class="ycl-tr"></span></span></label>';
        };
        const settings = SELECT_SETTINGS.map(function (setting) {
            const labelId = 'ycl-label-' + setting.key;
            const descId = 'ycl-desc-' + setting.key;
            const options = setting.options.map(function (option) {
                return '<option value="' + option.value + '"' + (option.value === defaults[setting.key] ? ' selected' : '') +
                    '>' + option.label + '</option>';
            }).join('');
            return '<label class="ycl-setting" for="ycl-select-' + setting.key + '">' +
                '<span class="ycl-copy"><span class="ycl-tt" id="' + labelId + '">' + setting.label + '</span>' +
                '<span class="ycl-dd" id="' + descId + '">' + setting.desc + '</span></span>' +
                '<select class="ycl-select" id="ycl-select-' + setting.key + '" aria-describedby="' + descId + '">' +
                options + '</select></label>';
        }).join('');
        const rows = TOGGLES.map(function (toggle) {
            return switchMarkup('ycl-' + toggle.id, toggle.label, toggle.desc, defaults[toggle.feat], '');
        }).join('');
        const skins = SKINS.map(function (skin) {
            const selected = skin.id === defaults.skin;
            const accentAttr = skin.accent ? ' data-accent="' + skin.accent + '"' : '';
            return '<button type="button" class="ycl-swatch' + (selected ? ' selected' : '') +
                '" data-skin="' + skin.id + '"' + accentAttr + ' aria-label="' + skin.label +
                '" aria-pressed="' + selected + '" title="' + skin.label + '">' +
                (skin.accent ? '<span class="dot" aria-hidden="true"></span>' : '') + '</button>';
        }).join('');
        return '<button id="ycl-fab" type="button" aria-label="Abrir ajustes de YouTube Custom Light"' +
            ' aria-controls="ycl-panel" aria-expanded="false" aria-keyshortcuts="Alt+Shift+Y" title="YouTube Custom Light">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.1 7.1 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.89 2h-3.78a.5.5 0 0 0-.49.42L9.26 4.96c-.59.23-1.14.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.72 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.05.31-.07.63-.07.95s.02.63.07.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.49.39 1.04.71 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.78a.5.5 0 0 0 .49-.42l.36-2.54c.59-.23 1.14-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.02-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/></svg>' +
            '</button><div id="ycl-panel" role="region" aria-labelledby="ycl-panel-title">' +
            '<div class="ycl-head"><div class="ycl-brand"><span class="ycl-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 14.5v-9l7 4.5-7 4.5Z"/></svg></span>' +
            '<span><h2 id="ycl-panel-title">YouTube Custom Light</h2><span class="ycl-subtitle">Ajustes de apariencia y navegación</span></span></div>' +
            '<button type="button" class="ycl-close" id="ycl-close" aria-label="Cerrar ajustes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m19 6.4-1.4-1.4L12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/></svg></button></div>' +
            '<label class="ycl-smart-card"><span class="ycl-copy"><span class="ycl-tt" id="ycl-smart-label">Modo inteligente</span>' +
            '<span class="ycl-dd" id="ycl-smart-desc">Usa página, pantalla y preferencias de accesibilidad. Las elecciones manuales siempre prevalecen.</span></span>' +
            '<span class="ycl-switch"><input type="checkbox" id="ycl-smart" aria-labelledby="ycl-smart-label" aria-describedby="ycl-smart-desc" checked><span class="ycl-tr"></span></span></label>' +
            '<section class="ycl-section" aria-labelledby="ycl-appearance-heading"><h3 class="ycl-section-title" id="ycl-appearance-heading">Apariencia</h3><div class="ycl-settings">' + settings + '</div></section>' +
            '<section class="ycl-section" aria-labelledby="ycl-navigation-heading"><h3 class="ycl-section-title" id="ycl-navigation-heading">Navegación y comodidad</h3><div class="ycl-rows">' + rows + '</div></section>' +
            '<section class="ycl-section" aria-labelledby="ycl-skins-title"><h3 class="ycl-section-title" id="ycl-skins-title">Color de acento</h3><div class="ycl-skins" role="group" aria-labelledby="ycl-skins-title">' + skins + '</div></section>' +
            '<div class="ycl-status-card" role="status" aria-live="polite"><div class="ycl-status-title"><span class="ycl-status-dot" aria-hidden="true"></span>Perfil aplicado</div>' +
            '<div class="ycl-status-text" id="ycl-profile-summary">Automático · se adapta a esta página y a las preferencias del sistema.</div></div>' +
            '<div class="ycl-panel-actions"><button type="button" class="ycl-reset" id="ycl-reset">Restaurar ajustes inteligentes</button>' +
            '<span class="ycl-footnote">Alt + Shift + Y para abrir o cerrar<br>Los ajustes se guardan en este navegador.</span></div></div>';
    }

    // ------------------------------------------------------------------
    // Browser side effects
    // ------------------------------------------------------------------
    function injectCss(css, id) {
        let style = document.getElementById(id);
        if (!style) {
            style = document.createElement('style');
            style.id = id;
            (document.head || document.documentElement).appendChild(style);
        }
        style.textContent = css;
        return style;
    }

    function saveState(state) {
        if (typeof GM_setValue === 'function') {
            GM_setValue(STORAGE_KEY, JSON.stringify(state));
        }
    }

    function makeTextElement(tagName, className, text) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        if (typeof text === 'string') element.textContent = text;
        return element;
    }

    function createSwitchRow(id, label, description, checked, className) {
        const row = document.createElement('label');
        row.className = className || 'ycl-row';
        const copy = makeTextElement('span', 'ycl-copy');
        const labelNode = makeTextElement('span', 'ycl-tt', label);
        const descriptionNode = makeTextElement('span', 'ycl-dd', description);
        labelNode.id = id + '-label';
        descriptionNode.id = id + '-desc';
        copy.appendChild(labelNode);
        copy.appendChild(descriptionNode);

        const control = makeTextElement('span', 'ycl-switch');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        input.checked = checked;
        input.setAttribute('aria-labelledby', labelNode.id);
        input.setAttribute('aria-describedby', descriptionNode.id);
        const track = makeTextElement('span', 'ycl-tr');
        control.appendChild(input);
        control.appendChild(track);
        row.appendChild(copy);
        row.appendChild(control);
        return { row: row, input: input };
    }

    function mountPanel(root, state, applyAll) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const makeSvg = function (viewBox, pathData) {
            const svg = document.createElementNS(svgNS, 'svg');
            svg.setAttribute('viewBox', viewBox);
            svg.setAttribute('aria-hidden', 'true');
            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', pathData);
            svg.appendChild(path);
            return svg;
        };
        const fab = document.createElement('button');
        fab.type = 'button';
        fab.id = 'ycl-fab';
        fab.setAttribute('aria-label', 'Abrir ajustes de YouTube Custom Light');
        fab.setAttribute('aria-controls', 'ycl-panel');
        fab.setAttribute('aria-expanded', 'false');
        fab.setAttribute('aria-keyshortcuts', 'Alt+Shift+Y');
        fab.title = 'YouTube Custom Light · Alt + Shift + Y';
        fab.appendChild(makeSvg('0 0 24 24', 'M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.1 7.1 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.89 2h-3.78a.5.5 0 0 0-.49.42L9.26 4.96c-.59.23-1.14.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.72 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.05.31-.07.63-.07.95s.02.63.07.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.49.39 1.04.71 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.78a.5.5 0 0 0 .49-.42l.36-2.54c.59-.23 1.14-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.02-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z'));

        const panel = makeTextElement('div', '');
        panel.id = 'ycl-panel';
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-labelledby', 'ycl-panel-title');

        const head = makeTextElement('div', 'ycl-head');
        const brand = makeTextElement('div', 'ycl-brand');
        const mark = makeTextElement('span', 'ycl-mark');
        mark.setAttribute('aria-hidden', 'true');
        mark.appendChild(makeSvg('0 0 24 24', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 14.5v-9l7 4.5-7 4.5Z'));
        const brandText = makeTextElement('span', '');
        const title = makeTextElement('h2', '', 'YouTube Custom Light');
        title.id = 'ycl-panel-title';
        const subtitle = makeTextElement('span', 'ycl-subtitle', 'Ajustes de apariencia y navegación');
        brandText.appendChild(title);
        brandText.appendChild(subtitle);
        brand.appendChild(mark);
        brand.appendChild(brandText);
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'ycl-close';
        closeButton.id = 'ycl-close';
        closeButton.setAttribute('aria-label', 'Cerrar ajustes');
        closeButton.appendChild(makeSvg('0 0 24 24', 'm19 6.4-1.4-1.4L12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z'));
        head.appendChild(brand);
        head.appendChild(closeButton);
        panel.appendChild(head);

        const smartRow = createSwitchRow(
            'ycl-smart',
            'Modo inteligente',
            'Usa página, pantalla y preferencias de accesibilidad. Las elecciones manuales siempre prevalecen.',
            state.smartMode,
            'ycl-smart-card'
        );
        smartRow.input.addEventListener('change', function () {
            state.smartMode = smartRow.input.checked;
            saveState(state);
            refresh();
        });
        panel.appendChild(smartRow.row);

        const appearanceSection = makeTextElement('section', 'ycl-section');
        appearanceSection.setAttribute('aria-labelledby', 'ycl-appearance-heading');
        const appearanceTitle = makeTextElement('h3', 'ycl-section-title', 'Apariencia');
        appearanceTitle.id = 'ycl-appearance-heading';
        const settingsList = makeTextElement('div', 'ycl-settings');
        const selectControls = {};
        SELECT_SETTINGS.forEach(function (setting) {
            const row = makeTextElement('label', 'ycl-setting');
            row.setAttribute('for', 'ycl-select-' + setting.key);
            const copy = makeTextElement('span', 'ycl-copy');
            const labelNode = makeTextElement('span', 'ycl-tt', setting.label);
            labelNode.id = 'ycl-label-' + setting.key;
            const descriptionNode = makeTextElement('span', 'ycl-dd', setting.desc);
            descriptionNode.id = 'ycl-desc-' + setting.key;
            copy.appendChild(labelNode);
            copy.appendChild(descriptionNode);
            const select = document.createElement('select');
            select.className = 'ycl-select';
            select.id = 'ycl-select-' + setting.key;
            select.setAttribute('aria-labelledby', labelNode.id);
            select.setAttribute('aria-describedby', descriptionNode.id);
            setting.options.forEach(function (optionData) {
                const option = document.createElement('option');
                option.value = optionData.value;
                option.textContent = optionData.label;
                select.appendChild(option);
            });
            select.value = state[setting.key];
            select.addEventListener('change', function () {
                state[setting.key] = select.value;
                saveState(state);
                refresh();
            });
            row.appendChild(copy);
            row.appendChild(select);
            settingsList.appendChild(row);
            selectControls[setting.key] = select;
        });
        appearanceSection.appendChild(appearanceTitle);
        appearanceSection.appendChild(settingsList);
        panel.appendChild(appearanceSection);

        const navigationSection = makeTextElement('section', 'ycl-section');
        navigationSection.setAttribute('aria-labelledby', 'ycl-navigation-heading');
        const navigationTitle = makeTextElement('h3', 'ycl-section-title', 'Navegación y comodidad');
        navigationTitle.id = 'ycl-navigation-heading';
        const toggleRows = makeTextElement('div', 'ycl-rows');
        TOGGLES.forEach(function (toggle) {
            const rowControl = createSwitchRow(
                'ycl-' + toggle.id,
                toggle.label,
                toggle.desc,
                state[toggle.feat],
                'ycl-row'
            );
            rowControl.input.addEventListener('change', function () {
                state[toggle.feat] = rowControl.input.checked;
                saveState(state);
                refresh();
            });
            toggleRows.appendChild(rowControl.row);
        });
        navigationSection.appendChild(navigationTitle);
        navigationSection.appendChild(toggleRows);
        panel.appendChild(navigationSection);

        const skinSection = makeTextElement('section', 'ycl-section');
        skinSection.setAttribute('aria-labelledby', 'ycl-skins-title');
        const skinTitle = makeTextElement('h3', 'ycl-section-title', 'Color de acento');
        skinTitle.id = 'ycl-skins-title';
        const skinGroup = makeTextElement('div', 'ycl-skins');
        skinGroup.setAttribute('role', 'group');
        skinGroup.setAttribute('aria-labelledby', skinTitle.id);
        const skinButtons = [];
        SKINS.forEach(function (skin) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'ycl-swatch' + (state.skin === skin.id ? ' selected' : '');
            button.setAttribute('data-skin', skin.id);
            button.setAttribute('aria-label', 'Color de acento: ' + skin.label);
            button.setAttribute('aria-pressed', state.skin === skin.id ? 'true' : 'false');
            if (skin.accent) {
                button.setAttribute('data-accent', skin.accent);
            }
            button.style.color = skin.accent || 'currentColor';
            button.title = skin.label;
            if (skin.accent) {
                const dot = makeTextElement('span', 'dot');
                dot.setAttribute('aria-hidden', 'true');
                button.appendChild(dot);
            }
            button.addEventListener('click', function () {
                state.skin = skin.id;
                saveState(state);
                refresh();
                skinButtons.forEach(function (skinButton) {
                    const selected = skinButton === button;
                    skinButton.classList.toggle('selected', selected);
                    skinButton.setAttribute('aria-pressed', selected ? 'true' : 'false');
                });
            });
            skinButtons.push(button);
            skinGroup.appendChild(button);
        });
        skinSection.appendChild(skinTitle);
        skinSection.appendChild(skinGroup);
        panel.appendChild(skinSection);

        const statusCard = makeTextElement('div', 'ycl-status-card');
        statusCard.setAttribute('role', 'status');
        statusCard.setAttribute('aria-live', 'polite');
        const statusTitle = makeTextElement('div', 'ycl-status-title');
        const statusDot = makeTextElement('span', 'ycl-status-dot');
        statusDot.setAttribute('aria-hidden', 'true');
        statusTitle.appendChild(statusDot);
        statusTitle.appendChild(document.createTextNode('Perfil aplicado'));
        const statusText = makeTextElement('div', 'ycl-status-text');
        statusText.id = 'ycl-profile-summary';
        statusCard.appendChild(statusTitle);
        statusCard.appendChild(statusText);
        panel.appendChild(statusCard);

        const actions = makeTextElement('div', 'ycl-panel-actions');
        const resetButton = makeTextElement('button', 'ycl-reset', 'Restaurar ajustes inteligentes');
        resetButton.type = 'button';
        resetButton.id = 'ycl-reset';
        resetButton.addEventListener('click', function () {
            state.smartMode = true;
            SELECT_SETTINGS.forEach(function (setting) {
                state[setting.key] = 'auto';
                selectControls[setting.key].value = 'auto';
            });
            smartRow.input.checked = true;
            saveState(state);
            refresh();
        });
        const footnote = makeTextElement('span', 'ycl-footnote');
        footnote.appendChild(document.createTextNode('Alt + Shift + Y para abrir o cerrar'));
        footnote.appendChild(document.createElement('br'));
        footnote.appendChild(document.createTextNode('Los ajustes se guardan en este navegador.'));
        actions.appendChild(resetButton);
        actions.appendChild(footnote);
        panel.appendChild(actions);

        const setPanelOpen = function (open) {
            panel.classList.toggle('ycl-open', open);
            fab.setAttribute('aria-expanded', open ? 'true' : 'false');
        };
        const updateStatus = function (profile) {
            statusText.textContent = profileSummary(profile);
        };
        function refresh() {
            applyAll();
        }
        closeButton.addEventListener('click', function () {
            setPanelOpen(false);
            fab.focus();
        });
        fab.addEventListener('click', function () {
            setPanelOpen(!panel.classList.contains('ycl-open'));
        });
        document.addEventListener('pointerdown', function (event) {
            const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
            const insideRoot = path.indexOf(root) !== -1 || root.contains(event.target);
            if (!insideRoot && panel.classList.contains('ycl-open')) setPanelOpen(false);
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !event.defaultPrevented && panel.classList.contains('ycl-open')) {
                event.preventDefault();
                setPanelOpen(false);
                fab.focus();
                return;
            }
            const target = event.target;
            const isEditable = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
            if (event.defaultPrevented || event.repeat || isEditable || event.ctrlKey || event.metaKey) return;
            if (event.altKey && event.shiftKey && String(event.key).toLowerCase() === 'y') {
                event.preventDefault();
                const opening = !panel.classList.contains('ycl-open');
                setPanelOpen(opening);
                if (opening) smartRow.input.focus();
                else fab.focus();
            }
        });

        root.appendChild(fab);
        root.appendChild(panel);
        return updateStatus;
    }

    function mediaMatches(query) {
        if (typeof window.matchMedia !== 'function') return false;
        try { return window.matchMedia(query).matches; } catch (error) { return false; }
    }

    function readContext() {
        const html = document.documentElement;
        const prefersContrast = mediaMatches('(prefers-contrast: more)') || mediaMatches('(prefers-contrast: custom)');
        return {
            pageKind: classifyPage(window.location.pathname),
            dark: html.hasAttribute('dark'),
            narrowViewport: mediaMatches('(max-width: 760px)'),
            prefersContrast: prefersContrast,
            forcedColors: mediaMatches('(forced-colors: active)'),
            prefersReducedMotion: mediaMatches('(prefers-reduced-motion: reduce)'),
            prefersReducedTransparency: mediaMatches('(prefers-reduced-transparency: reduce)')
        };
    }

    function applyProfileClasses(profile) {
        const html = document.documentElement;
        html.classList.toggle('ycl-contrast-high', profile.contrast === 'high');
        html.classList.toggle('ycl-contrast-max', profile.contrast === 'maximum');
        html.classList.toggle('ycl-effects-reduced', profile.effects === 'reduced');
        html.classList.toggle('ycl-effects-none', profile.effects === 'none');
        html.classList.toggle('ycl-density-compact', profile.density === 'compact');
    }

    function init() {
        if (document.getElementById('ycl-root') || !document.body) return;

        const stored = typeof GM_getValue === 'function' ? GM_getValue(STORAGE_KEY, '') : '';
        const state = loadState(stored);
        injectCss(buildPanelCss() + '\n' + buildAdaptiveCss() + '\n' + REDUCED_MOTION_CSS, 'ycl-panel-css');
        const featuresNode = injectCss('', 'ycl-features');
        const applyFeatureCss = function () {
            featuresNode.textContent = buildFeatureCss(state) + '\n' + buildSkinCss(state);
        };
        const applyAppearance = function () {
            const profile = resolveAdaptiveProfile(state, readContext());
            applyProfileClasses(profile);
            return profile;
        };
        let updatePanelStatus = function () {};
        const applyAll = function () {
            applyFeatureCss();
            const profile = applyAppearance();
            updatePanelStatus(profile);
            return profile;
        };
        applyFeatureCss();

        const pauseIfHidden = function (video) {
            if (video && state.pauseHidden && shouldPauseWhenHidden(state, document.hidden, video.paused)) {
                video.pause();
            }
        };
        document.addEventListener('visibilitychange', function () {
            if (!state.pauseHidden || !document.hidden) return;
            document.querySelectorAll('video').forEach(pauseIfHidden);
        });
        // Also catch a player that starts after the tab was already hidden.
        document.addEventListener('play', function (event) {
            const video = event.target;
            if (video && video.tagName === 'VIDEO') pauseIfHidden(video);
        }, true);

        const root = document.createElement('div');
        root.id = 'ycl-root';
        document.body.appendChild(root);
        updatePanelStatus = mountPanel(root, state, applyAll);
        applyAll();

        const syncDocking = function () {
            const other = document.querySelector('#ysu-fab');
            const right = other ? fabOffsetRight(other.offsetWidth) : 0;
            root.style.right = right + 'px';
            root.style.setProperty('--ycl-dock-offset', right + 'px');
        };
        const updateContext = function () {
            const profile = applyAppearance();
            updatePanelStatus(profile);
        };
        const handleNavigation = function () {
            updateContext();
            syncDocking();
        };
        syncDocking();
        window.addEventListener('yt-navigate-finish', handleNavigation);
        window.addEventListener('popstate', handleNavigation);

        if (typeof MutationObserver === 'function') {
            const observer = new MutationObserver(updateContext);
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['dark', 'color-version']
            });
        }
        if (typeof window.matchMedia === 'function') {
            [
                '(prefers-contrast: more)',
                '(prefers-contrast: custom)',
                '(forced-colors: active)',
                '(prefers-reduced-motion: reduce)',
                '(prefers-reduced-transparency: reduce)',
                '(max-width: 760px)'
            ].forEach(function (query) {
                const media = window.matchMedia(query);
                if (typeof media.addEventListener === 'function') {
                    media.addEventListener('change', updateContext);
                } else if (typeof media.addListener === 'function') {
                    media.addListener(updateContext);
                }
            });
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    // ------------------------------------------------------------------
    // Node exports for tests
    // ------------------------------------------------------------------
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            TOGGLES: TOGGLES,
            SKINS: SKINS,
            SELECT_SETTINGS: SELECT_SETTINGS,
            STORAGE_KEY: STORAGE_KEY,
            FEATURE_CSS: FEATURE_CSS,
            loadState: loadState,
            buildFeatureCss: buildFeatureCss,
            buildSkinCss: buildSkinCss,
            buildAdaptiveCss: buildAdaptiveCss,
            accentFor: accentFor,
            classifyPage: classifyPage,
            resolveAdaptiveProfile: resolveAdaptiveProfile,
            profileSummary: profileSummary,
            shouldPauseWhenHidden: shouldPauseWhenHidden,
            fabOffsetRight: fabOffsetRight,
            buildPanelCss: buildPanelCss,
            buildPanelMarkup: buildPanelMarkup
        };
    }
})();
