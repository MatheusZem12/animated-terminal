const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// These markers live inside VS Code's own workbench files, written by every
// version so far. They stay in Portuguese on purpose: changing them would make
// this version unable to find (and replace) the block an older one left there.
const START_MARK = '/* terminal-animado:inicio */';
const END_MARK = '/* terminal-animado:fim */';

const PANEL = '.monaco-workbench .split-view-view > .part.panel';
const CONTENT = PANEL + ' > .content';
// height of the panel tab bar (Problems/Output/Terminal): the effects start
// below it, so it doesn't rain on top of the tabs
const TITLE = 35;

const EFFECTS = {
    snow: { label: '❄️  Snow', detail: 'Glittering flakes drifting with the wind' },
    rain: { label: '🌧️  Rain', detail: 'Slanted rain, flashes in the sky and splashes on the river' },
    embers: { label: '🔥  Embers', detail: 'Rising sparks, smoke and glowing embers' }
};

// ─── Settings ───────────────────────────────────────────────────────────────
// Up to 0.8.1 the settings had Portuguese names and values. They are still
// declared in package.json (as deprecated) only so this version can move their
// values to the new keys and then clear them — VS Code refuses to write a key
// that isn't registered.

const LEGACY_KEYS = {
    effect: 'efeito',
    opacity: 'opacidade',
    speed: 'velocidade',
    quality: 'qualidade',
    tintInterface: 'colorirInterface'
};

const LEGACY_VALUES = {
    effect: { nenhum: 'none', neve: 'snow', chuva: 'rain', brasas: 'embers' },
    quality: { completo: 'full', leve: 'light' }
};

function fromLegacy(key, value) {
    const map = LEGACY_VALUES[key];
    return map && value in map ? map[value] : value;
}

/** A set value of `key`, falling back to its legacy key while it hasn't been migrated yet. */
function setting(cfg, key, fallback) {
    const own = cfg.inspect(key);
    const value = own && (own.workspaceFolderValue ?? own.workspaceValue ?? own.globalValue);
    if (value !== undefined) return value;
    const legacy = cfg.inspect(LEGACY_KEYS[key]);
    const old = legacy && (legacy.workspaceFolderValue ?? legacy.workspaceValue ?? legacy.globalValue);
    return old !== undefined ? fromLegacy(key, old) : fallback;
}

/** Moves the global values of the legacy keys to the new ones, then clears the old ones. */
async function migrateLegacySettings() {
    const cfg = vscode.workspace.getConfiguration('terminalAnimado');
    for (const [key, legacyKey] of Object.entries(LEGACY_KEYS)) {
        const old = cfg.inspect(legacyKey)?.globalValue;
        if (old === undefined) continue;
        try {
            if (cfg.inspect(key)?.globalValue === undefined) {
                await cfg.update(key, fromLegacy(key, old), vscode.ConfigurationTarget.Global);
            }
            await cfg.update(legacyKey, undefined, vscode.ConfigurationTarget.Global);
        } catch (_) {
            // updated without a reload: the window only registers the new keys
            // after reloading. Reading falls back to the legacy key meanwhile,
            // and the next activation tries again.
        }
    }
}

// ─── Interface colors ───────────────────────────────────────────────────────
// Tints the interface to match the effect, via workbench.colorCustomizations
// (the official API: it applies live, on top of any theme, and removing it
// restores the exact theme). Only COLOR keys — no size, font or layout. The
// original value of each key is stored in globalState the first time it is
// touched and given back when it leaves the scene, so the user's configuration
// comes back intact when the effect is removed or `tintInterface` is turned off.

// The globalState key holding the user's original colors. Its value predates
// the English rewrite and must stay as it is, or the backup would be lost.
const BACKUP_KEY = 'coresOriginais';

// Mid, desaturated tones on purpose: too dark (the earlier rain and embers
// versions) weighs down the whole interface, and pure white (the original
// snow) clashes with any dark theme. The goal is "disguised" — the color
// hints at the effect without shouting, including on the bottom bar.
const PALETTES = {
    embers: {
        // backgrounds in translucent red (RGBA over the theme, low opacity on
        // purpose) — the earlier solid version read as brown, not embers
        'titleBar.activeBackground': '#c42a2a2e',
        'titleBar.activeForeground': '#f3ddc9',
        'titleBar.inactiveBackground': '#c42a2a22',
        'titleBar.inactiveForeground': '#a8836f',
        'activityBar.background': '#c42a2a28',
        'activityBar.foreground': '#e8bb96',
        'activityBar.inactiveForeground': '#93705a',
        'activityBar.activeBorder': '#d97b45',
        'activityBarBadge.background': '#c96a35',
        'activityBarBadge.foreground': '#ffffff',
        'statusBar.background': '#c42a2a38',
        'statusBar.foreground': '#eeddce',
        'statusBarItem.remoteBackground': '#a85a2e',
        'statusBarItem.remoteForeground': '#ffffff',
        'button.background': '#b8622f',
        'button.foreground': '#ffffff',
        'button.hoverBackground': '#c96a35',
        'badge.background': '#b8622f',
        'badge.foreground': '#ffffff',
        'progressBar.background': '#e0975c',
        'focusBorder': '#d97b45',
        'panelTitle.activeBorder': '#d97b45',
        'panel.border': '#c42a2a40',
        'terminal.tab.activeBorder': '#d97b45'
    },
    snow: {
        'titleBar.activeBackground': '#3c4046',
        'titleBar.activeForeground': '#e4e7ea',
        'titleBar.inactiveBackground': '#33363b',
        'titleBar.inactiveForeground': '#8b929a',
        'activityBar.background': '#383c42',
        'activityBar.foreground': '#dde1e5',
        'activityBar.inactiveForeground': '#828990',
        'activityBar.activeBorder': '#8ab0cc',
        'activityBarBadge.background': '#5e8caa',
        'activityBarBadge.foreground': '#ffffff',
        'statusBar.background': '#454a50',
        'statusBar.foreground': '#dde1e5',
        'statusBarItem.remoteBackground': '#4d7691',
        'statusBarItem.remoteForeground': '#ffffff',
        'button.background': '#4d7691',
        'button.foreground': '#ffffff',
        'button.hoverBackground': '#5e8caa',
        'badge.background': '#4d7691',
        'badge.foreground': '#ffffff',
        'progressBar.background': '#8ab0cc',
        'focusBorder': '#8ab0cc',
        'panelTitle.activeBorder': '#8ab0cc',
        'panel.border': '#494d53',
        'terminal.tab.activeBorder': '#8ab0cc'
    },
    rain: {
        'titleBar.activeBackground': '#213445',
        'titleBar.activeForeground': '#d3e6f5',
        'titleBar.inactiveBackground': '#1b2b39',
        'titleBar.inactiveForeground': '#7691a8',
        'activityBar.background': '#1f313f',
        'activityBar.foreground': '#b0d2ea',
        'activityBar.inactiveForeground': '#6a8ba1',
        'activityBar.activeBorder': '#5fa3d0',
        'activityBarBadge.background': '#4088ba',
        'activityBarBadge.foreground': '#ffffff',
        'statusBar.background': '#2a4256',
        'statusBar.foreground': '#dcecf7',
        'statusBarItem.remoteBackground': '#3878a3',
        'statusBarItem.remoteForeground': '#ffffff',
        'button.background': '#3878a3',
        'button.foreground': '#ffffff',
        'button.hoverBackground': '#4088ba',
        'badge.background': '#3878a3',
        'badge.foreground': '#ffffff',
        'progressBar.background': '#71b3dd',
        'focusBorder': '#5fa3d0',
        'panelTitle.activeBorder': '#5fa3d0',
        'panel.border': '#2c4457',
        'terminal.tab.activeBorder': '#5fa3d0'
    }
};

// Palette colors from older versions, per key: they belong to the "known to
// be ours" set so the leftover sweep below can clean up remains from any
// era — including the 0.7.0–0.7.2 palette (too dark for embers/rain, white
// for snow) that this version replaces. Each list follows [0.6.0, 0.7.0–0.7.2]
// with embers/snow/rain in sequence; the 0.7.3–0.7.5 embers backgrounds
// (solid brown, replaced by translucent red) come loose at the end of each
// list that changed.
const LEGACY_COLORS = {
    'titleBar.activeBackground': ['#5a1412', '#e8edf3', '#10304d', '#331008', '#eef3f9', '#0c1f33', '#3d2a20'],
    'titleBar.activeForeground': ['#ffe3d9', '#3b4552', '#d3e7f8', '#ffe8d6', '#2e3a48', '#d6eafc'],
    'titleBar.inactiveBackground': ['#401210', '#d5dce5', '#0c2237', '#220b06', '#dde5ee', '#081522', '#332019'],
    'titleBar.inactiveForeground': ['#c9968a', '#7d8794', '#7fa2c0', '#b07a63', '#8494a7', '#6d8cab'],
    'activityBar.background': ['#451311', '#dde4ec', '#0d2941', '#2a0e07', '#e3eaf2', '#0a1a2b', '#3a2519'],
    'activityBar.foreground': ['#ffcdbd', '#3b4552', '#a4cdef', '#ffb289', '#2e3a48', '#9ccdf5'],
    'activityBar.inactiveForeground': ['#a5675c', '#8d97a5', '#5c81a3', '#8f5a44', '#93a2b4', '#4f7396'],
    'activityBar.activeBorder': ['#ff7a29', '#0ea5e9', '#38bdf8'],
    'activityBarBadge.background': ['#f05e1c', '#6d87a8', '#2f86cc', '#ff6d1f', '#0ea5e9', '#1d9bf0'],
    'activityBarBadge.foreground': ['#ffffff'],
    'statusBar.background': ['#7f1d1d', '#cdd7e2', '#155081', '#5c1a09', '#d7e1ec', '#103a5e', '#4a3125'],
    'statusBar.foreground': ['#ffe3d9', '#3b4552', '#dcecfa', '#ffddc2', '#2e3a48', '#dcefff'],
    'statusBarItem.remoteBackground': ['#c2410c', '#0284c7', '#1272c4'],
    'statusBarItem.remoteForeground': ['#ffffff'],
    'button.background': ['#c2410c', '#7c92ac', '#1f6db5', '#ea580c', '#0284c7', '#1272c4'],
    'button.foreground': ['#ffffff'],
    'button.hoverBackground': ['#ea580c', '#8fa4bc', '#2f86cc', '#ff6d1f', '#0ea5e9', '#1d9bf0'],
    'badge.background': ['#c2410c', '#7c92ac', '#1f6db5', '#ea580c', '#0ea5e9', '#1d9bf0'],
    'badge.foreground': ['#ffffff'],
    'progressBar.background': ['#fb923c', '#9fb3c8', '#3b96e0', '#ff9f43', '#38bdf8', '#4db2ff'],
    'focusBorder': ['#f97316', '#9fb3c8', '#3b96e0', '#ff8c42', '#7dd3fc', '#4db2ff'],
    'panelTitle.activeBorder': ['#fb923c', '#9fb3c8', '#3b96e0', '#ff8c42', '#38bdf8', '#4db2ff'],
    'panel.border': ['#7c2d12', '#c3d0de', '#17466e', '#4d3527'],
    'terminal.tab.activeBorder': ['#ff8c42', '#38bdf8', '#4db2ff']
};

// Everything the extension has ever written, as "key=color": it is what tells
// our leftovers apart from the user's legitimate customization.
const OUR_COLORS = (() => {
    const set = new Set();
    for (const palette of Object.values(PALETTES)) {
        for (const [key, color] of Object.entries(palette)) {
            set.add(`${key}=${color.toLowerCase()}`);
        }
    }
    for (const [key, colors] of Object.entries(LEGACY_COLORS)) {
        for (const color of colors) set.add(`${key}=${color}`);
    }
    return set;
})();

const OUR_KEYS = (() => {
    const set = new Set(Object.keys(LEGACY_COLORS));
    for (const palette of Object.values(PALETTES)) {
        for (const key of Object.keys(palette)) set.add(key);
    }
    return set;
})();

function isOurColor(key, value) {
    return typeof value === 'string'
        && OUR_COLORS.has(`${key}=${value.toLowerCase()}`);
}

/**
 * Brings the global colorCustomizations to the requested palette ({} = restore
 * everything): keys leaving the scene go back to their original value (null =
 * it didn't exist) and each new key is saved in the backup before being
 * overwritten. Switching snow→rain doesn't rewrite the backup — it always
 * holds the value from BEFORE the first touch.
 *
 * Two defenses against leftovers (the interface stuck in an old effect's
 * color): one of OUR colors never enters the backup as "original" — with two
 * windows open, both apply at the same time and one could store as original
 * the color the other had just written, and restoring that gave back the old
 * palette — and every application sweeps the keys that were ever ours and
 * removes any value known to be ours outside the current palette, even
 * without a backup.
 */
async function applyColors(context, palette) {
    const cfg = vscode.workspace.getConfiguration('workbench');
    const current = { ...(cfg.inspect('colorCustomizations')?.globalValue || {}) };
    const originals = { ...(context.globalState.get(BACKUP_KEY) || {}) };
    const currentBefore = JSON.stringify(current);
    const originalsBefore = JSON.stringify(originals);

    for (const key of Object.keys(originals)) {
        if (key in palette) continue;
        if (originals[key] === null || isOurColor(key, originals[key])) {
            delete current[key];
        } else {
            current[key] = originals[key];
        }
        delete originals[key];
    }
    // leftover sweep: clears what is ours and was orphaned from the backup
    for (const key of OUR_KEYS) {
        if (!(key in palette) && isOurColor(key, current[key])) {
            delete current[key];
        }
    }
    for (const [key, color] of Object.entries(palette)) {
        if (!(key in originals)) {
            originals[key] = key in current && !isOurColor(key, current[key])
                ? current[key] : null;
        }
        current[key] = color;
    }

    try {
        if (JSON.stringify(current) !== currentBefore) {
            await cfg.update('colorCustomizations',
                Object.keys(current).length ? current : undefined,
                vscode.ConfigurationTarget.Global);
        }
        if (JSON.stringify(originals) !== originalsBefore) {
            await context.globalState.update(BACKUP_KEY,
                Object.keys(originals).length ? originals : undefined);
        }
    } catch (_) {
        // settings.json unavailable: the next effect switch tries again
    }
}

/** VS Code's sandbox blocks file://; local files use vscode-file://. */
function urlOf(context, file) {
    return `vscode-file://vscode-app${path.join(context.extensionPath, 'media', file)}`;
}

/**
 * A particle layer: the SVG is static (rasterized once) and what moves is the
 * whole layer, via transform — compositing work, with no repaint. The seam
 * never shows because every cycle ends at a multiple of the tile: the exact
 * height on the Y axis and, on X, either the exact width (a `diagonal` fall,
 * for the rain) or zero (the wind `sway` of the snow and the embers goes back
 * and forth, with side slack so the clipping doesn't expose the edge).
 */
function layer(selector, url, width, height, dur, opacity, name, opts = {}) {
    const { rising = false, diagonal = false, sway = 0, phase = 1, z = 1000 } = opts;
    const targetY = rising ? -height : height;
    const dx = diagonal ? -width : 0;
    // a layer pinned below the tab bar, with slack the size of the tile in
    // the direction of movement (clipped by the panel's overflow:hidden)
    const top = rising ? `${TITLE}px` : `calc(${TITLE}px - ${height}px)`;
    const left = sway ? sway + 6 : 0;
    const right = sway ? sway + 6 : -dx;

    let frames;
    if (sway) {
        // wind sway: X follows a sampled sine and Y advances linearly in ALL
        // frames — any easing here would hold the fall back along with the
        // sway and the animation would seem to stall
        const N = 8, round = (v) => Math.round(v * 10) / 10;
        const steps = [];
        for (let k = 0; k <= N; k++) {
            const x = round(phase * sway * Math.sin(2 * Math.PI * k / N));
            const y = round(targetY * k / N);
            steps.push(`    ${round(k * 100 / N)}% { transform: translate(${x}px, ${y}px); }`);
        }
        frames = `\n@keyframes ${name} {\n${steps.join('\n')}\n}`;
    } else {
        frames = `
@keyframes ${name} {
    from { transform: translate(0, 0); }
    to { transform: translate(${dx}px, ${targetY}px); }
}`;
    }

    return `
${selector} {
    content: '';
    position: absolute;
    left: ${-left}px; right: ${-right}px;
    top: ${top};
    height: calc(100% - ${TITLE}px + ${height}px);
    pointer-events: none;
    z-index: ${z};
    background-image: url("${url}");
    background-repeat: repeat;
    background-size: ${width}px ${height}px;
    opacity: ${opacity};
    will-change: transform;
    animation: ${name} ${dur}s linear infinite;
}${frames}`;
}

/** A still layer, anchored at the bottom: snow on the ground, the river, embers. */
function ground(url, height, opacity) {
    return `
${PANEL}::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1000;
    background-image: url("${url}");
    background-repeat: repeat-x;
    background-position: center bottom;
    background-size: auto ${height}px;
    opacity: ${opacity};
}`;
}

function effectCss(context, effect, opacity, speed, quality) {
    const u = (file) => urlOf(context, file);
    const v = (seconds) => (seconds / speed).toFixed(1);
    const o = (mult) => Math.min(1, opacity * mult).toFixed(2);
    // the light mode keeps only the back layer and the ground: the rest is decoration
    const full = quality !== 'light';
    // .part.panel has no position in VS Code's CSS: without this, the layers
    // anchor to the whole workbench and leak outside the terminal
    const clip = `\n${PANEL} { position: relative !important; overflow: hidden !important; }`;

    if (effect === 'snow') {
        return clip + [
            ground(u('snow-ground.svg'), 90, opacity),
            layer(`${PANEL}::after`, u('snow-a.svg'), 640, 360, v(24),
                opacity, 'ta_snow_slow', { sway: 22 }),
            full && layer(`${CONTENT}::after`, u('snow-b.svg'), 420, 250,
                v(13), opacity * 0.8, 'ta_snow_fast', { sway: 14, phase: -1 }),
            // tiny, very slow flakes in the back give the depth
            full && layer(`${CONTENT}::before`, u('snow-c.svg'), 360, 220,
                v(38), opacity * 0.55, 'ta_snow_back', { sway: 10, z: 999 })
        ].filter(Boolean).join('\n');
    }

    if (effect === 'rain') {
        // the river splashes are 4 STILL frames swapped by keyframe
        // (impact → crown → ring → fade; ~2.5 repaints/s, cheap even in
        // light mode): an animation inside the SVG re-rasterizes at 60 fps and
        // once cost 62% of a core (removed in 0.2.3)
        const splashes = `
${PANEL}::before { animation: ta_splashes ${v(1.6)}s infinite; }
@keyframes ta_splashes {
    0%, 24% { background-image: url("${u('rain-ground-a.svg')}"); }
    25%, 49% { background-image: url("${u('rain-ground-b.svg')}"); }
    50%, 74% { background-image: url("${u('rain-ground-c.svg')}"); }
    75%, 100% { background-image: url("${u('rain-ground-d.svg')}"); }
}`;
        // The flash is ONE still circle at the top of the panel. Y is fixed
        // (always against the top, whether the terminal is tall or short); only
        // X is drawn at random. Diameter and brightness vary too, between a
        // fixed minimum and maximum — no harsh bursts, which tire the eyes.
        const MIN_D = 620, MAX_D = 1040;  // circle diameter, in px
        const MIN_B = 0.20, MAX_B = 0.46; // brightness at the flicker's peak
        // the whole cycle lasts CYCLE seconds and fits one flicker per slice, so
        // doubling the cycle doubles the silence between one bolt and the next
        // (~4s in 0.8.1 against ~2s in 0.8.0). SCALE shrinks the timings inside
        // the flicker by the same amount: they are % of the cycle, and without it
        // the flash that lasted half a second would drag on for a whole second.
        const CYCLE = 36, SCALE = 18 / CYCLE;
        const between = (a, b) => a + Math.random() * (b - a);
        const points = [];
        for (let i = 0, x = 50; i < 9; i++) {
            // draws until it lands far from the previous flash, otherwise two
            // flickers in a row come out almost in the same place and it looks stuck
            let next = between(10, 90);
            for (let tries = 0; Math.abs(next - x) < 28 && tries < 8; tries++) {
                next = between(10, 90);
            }
            x = next;
            const size = Math.round(between(MIN_D, MAX_D));
            // in a little over half the flickers the bolt comes down too; in
            // the others there's only the light, otherwise every flash would be a bolt
            const bolt = Math.random() < 0.6;
            points.push({
                x: x.toFixed(1),                      // X axis: random
                y: -Math.round(size * 0.38),          // Y axis: pinned to the top
                size,
                bolt,
                // with a bolt the peak goes up a little: at the usual brightness
                // the bolt drawing barely shows
                brightness: bolt ? between(0.34, 0.62) : between(MIN_B, MAX_B)
            });
        }
        const step = 100 / points.length;
        // per point: lights up in the new place, flickers twice and goes out. The
        // position and size are repeated at the end of the slice because
        // `background-position` is animatable: without that stop the circle would
        // slide towards the next point while still lit — that was the "ball
        // crossing the screen" of 0.7.9. Now the jump happens entirely in the dark.
        const flashes = points.map((p, i) => {
            const t = (n) => (i * step + n * SCALE).toFixed(3);
            // the two layers (bolt and light) share position and size, so the
            // bolt is born exactly in the middle of the flash. Without a bolt, the
            // top layer gets size zero and draws nothing
            const box = `${p.size}px ${p.size}px`;
            const place = `background-position: ${p.x}% ${p.y}px, ${p.x}% ${p.y}px;`
                + ` background-size: ${p.bolt ? box : '0 0'}, ${box};`;
            return `
    ${t(0)}% { opacity: 0; ${place} }
    ${t(0.25)}% { opacity: ${o(p.brightness * 0.7)}; }
    ${t(0.60)}% { opacity: ${o(p.brightness * 0.25)}; }
    ${t(1.00)}% { opacity: ${o(p.brightness)}; }
    ${t(1.70)}% { opacity: ${o(p.brightness * 0.3)}; }
    ${t(2.50)}% { opacity: 0; }
    ${(i * step + step - 0.01).toFixed(2)}% { opacity: 0; ${place} }`;
        }).join('');
        return clip + [
            ground(u('rain-ground-a.svg'), 96, opacity) + splashes,
            layer(`${PANEL}::after`, u('rain-a.svg'), 160, 520, v(2.7),
                opacity, 'ta_rain_heavy', { diagonal: true }),
            full && layer(`${CONTENT}::after`, u('rain-b.svg'), 140, 460,
                v(3.4), opacity * 0.8, 'ta_rain_fine', { diagonal: true }),
            // two layers in the same square box: the bolt drawn on top and,
            // below, the light's radial gradient — `circle` keeps it round even
            // in a wide panel and `closest-side` makes the light end before the
            // tile edge, otherwise `no-repeat` cuts the glow in a straight line
            // (a bug fixed in 0.7.8). The center sits a little above the top
            // edge, so what shows is the glow (and the bolt) coming down from the
            // top. Since both layers have the same size and the same % position,
            // the bolt always comes out of the middle of the flash; and a %
            // position never pushes the box out of the panel, so neither the light
            // nor the bolt goes past the terminal width. One repaint per flicker;
            // the rest is opacity, which is cheap.
            `
${CONTENT}::before {
    content: '';
    position: absolute;
    left: 0; right: 0;
    top: ${TITLE}px;
    height: calc(100% - ${TITLE}px);
    pointer-events: none;
    z-index: 1000;
    background-image: url("${u('rain-lightning.svg')}"), radial-gradient(circle closest-side, rgba(240,249,255,0.95) 0%, rgba(200,230,255,0.62) 28%, rgba(162,209,252,0.3) 52%, rgba(142,194,246,0.09) 76%, rgba(130,185,240,0) 100%);
    background-repeat: no-repeat;
    opacity: 0;
    animation: ta_flash ${v(CYCLE)}s linear infinite;
}
@keyframes ta_flash {${flashes}
    100% { opacity: 0; }
}`
        ].filter(Boolean).join('\n');
    }

    if (effect === 'embers') {
        // the classic look: sparks rising straight up, diffuse smoke and the
        // warm glow still at the bottom — no pulse and no sway
        return clip + [
            ground(u('embers-ground.svg'), 80, opacity),
            layer(`${PANEL}::after`, u('embers-a.svg'), 620, 340, v(20),
                opacity, 'ta_ember_slow', { rising: true }),
            full && layer(`${CONTENT}::after`, u('embers-b.svg'), 400, 230,
                v(11), opacity * 0.85, 'ta_ember_fast', { rising: true })
        ].filter(Boolean).join('\n');
    }

    return '';
}

// ─── Applying ───────────────────────────────────────────────────────────────
// The workbench doesn't reload styles written into its files: Chromium serves
// them from cache. So the patch is a FIXED loader that rereads `current.css`
// every 1s — the workbench CSP allows same-origin fetch on vscode-file://.
// The block embeds nothing that changes between effects or versions: the
// current.css lives in globalStorage, whose path doesn't change when the
// extension updates. Switching effects is just rewriting that file — it applies
// live, with no reload. The only reload there is happens on the first install
// (or when a VS Code update wipes the patch).

function jsPath() {
    return path.join(vscode.env.appRoot, 'out', 'vs', 'workbench',
        'workbench.desktop.main.js');
}

function vsCodeCssPath() {
    return path.join(vscode.env.appRoot, 'out', 'vs', 'workbench',
        'workbench.desktop.main.css');
}

function cssFile(context) {
    // globalStorage: a valid root of the vscode-file protocol (along with appRoot
    // and the extensions folder) and, unlike the extension folder, its path
    // doesn't change on every version — the patch stays valid after updating
    return path.join(context.globalStorageUri.fsPath, 'current.css');
}

/** Up to 0.8.1 the loader read `atual.css`; removes the orphan once the new file exists. */
function removeLegacyCssFile(context) {
    try {
        fs.unlinkSync(path.join(context.globalStorageUri.fsPath, 'atual.css'));
    } catch (_) {
        // already gone
    }
}

function withoutOurBlock(text) {
    const start = text.indexOf(START_MARK);
    if (start < 0) return text;
    // the end marker only counts if it comes AFTER the start one; without that
    // pair there's no way to know where the block ends — then it is better to
    // leave the remnant alone than to chop the file (that is what tore 3.4 KB of
    // CSS out of the workbench and left the Git commit field rendering outside its box)
    const end = text.indexOf(END_MARK, start + START_MARK.length);
    if (end < 0) return text;
    return text.slice(0, start) + text.slice(end + END_MARK.length);
}

/** Old versions wrote the effect straight into VS Code's CSS; cleans up the rest. */
function cleanOldCss() {
    try {
        const file = vsCodeCssPath();
        const css = fs.readFileSync(file, 'utf8');
        const clean = withoutOurBlock(css);
        if (clean !== css) fs.writeFileSync(file, clean, 'utf8');
    } catch (_) {
        // no permission or already clean: no reason to fail
    }
}

/**
 * The old Fundo Animado extension (retired in favor of this one) wrote a
 * vscode-background block into workbench.html that drew the effect ALWAYS,
 * ignoring any setting — it was what kept snow on screen even on "None".
 * Removes only blocks that mention fundo-animado, without touching third-party patches.
 */
function cleanOldHtml() {
    for (const folder of ['electron-browser', 'electron-sandbox']) {
        try {
            const file = path.join(vscode.env.appRoot, 'out', 'vs', 'code',
                folder, 'workbench', 'workbench.html');
            const html = fs.readFileSync(file, 'utf8');
            const clean = html.replace(
                /\n?<!-- vscode-background-start[\s\S]*?<!-- vscode-background-end -->/g,
                (block) => block.includes('fundo-animado') ? '' : block);
            if (clean !== html) fs.writeFileSync(file, clean, 'utf8');
        } catch (_) {
            // a folder from another VS Code era or no permission: move on
        }
    }
}

// Touching the workbench files makes VS Code warn "installation corrupt" on
// every start. The patch here is intentional, so the warning only gets in the
// way: this CSS (always present in current.css, even with the "none" effect)
// hides that specific toast, in the translations where it exists.
const CORRUPT_WARNING = [
    'installation appears to be corrupt. Please reinstall.',
    'parece estar corrompida. Reinstale-o.',
    'parece estar dañada. Vuelva a instalar.',
    'semble être endommagée. Effectuez une réinstallation.',
    'sembra danneggiata. Reinstallare.',
    'Installation ist offenbar beschädigt. Führen Sie eine Neuinstallation durch.',
    'je pravděpodobně poškozená. Proveďte prosím přeinstalaci.',
    'prawdopodobnie jest uszkodzona. Spróbuj zainstalować ponownie.',
    'повреждена. Повторите установку.',
    'yüklemeniz bozuk gibi görünüyor. Lütfen yeniden yükleyin.',
    'インストールが壊れている可能性があります。再インストールしてください。',
    '설치가 손상된 것 같습니다. 다시 설치하세요.',
    '安装似乎损坏。请重新安装。',
    '安裝似乎已損毀。請重新安裝。'
].map((text) =>
    `.notification-toast-container:has([aria-label*='${text}']){display:none;}`
).join('\n');

function loaderScript(cssUrl) {
    return `;(function () {
    var ID = 'terminal-animado-style';
    var URL = ${JSON.stringify(cssUrl)};
    var last = null;
    function apply(text) {
        var el = document.getElementById(ID);
        if (!el) {
            el = document.createElement('style');
            el.id = ID;
            document.head.appendChild(el);
        }
        el.textContent = text;
    }
    function tick() {
        try {
            fetch(URL, { cache: 'no-store' })
                .then(function (r) { return r.ok ? r.text() : null; })
                .then(function (text) {
                    // an empty or failed read NEVER counts: current.css always
                    // has at least the warning CSS. Applying '' here wiped the
                    // effect for one tick and the comeback restarted the
                    // animations from zero — the periodic "stutter". Keeps the last good CSS.
                    if (text && text !== last) { last = text; apply(text); }
                })
                .catch(function () { });
        } catch (e) { }
    }
    function start() { tick(); setInterval(tick, 1000); }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();`;
}


/** The block is 100% stable: nothing in it changes with the effect or the version. */
function loaderBlock(context) {
    return `\n${START_MARK}\n${loaderScript(
        'vscode-file://vscode-app' + cssFile(context))}\n${END_MARK}\n`;
}

/**
 * Writes `text` to `file` by creating a sibling temporary file and renaming it
 * over the original. A package-manager update (pacman, dnf...) reinstalls the
 * workbench files owned by root while the folders keep the user's ownership:
 * writing into the file then fails with EACCES, but replacing it in the folder
 * still works — so the patch survives VS Code updates without sudo.
 */
function writeReplacing(file, text) {
    const temporary = `${file}.terminal-animado.tmp`;
    try {
        fs.writeFileSync(temporary, text, 'utf8');
        try {
            const { mode } = fs.statSync(file);
            fs.chmodSync(temporary, mode & 0o777);
        } catch (_) {
            // keeps the default mode
        }
        fs.renameSync(temporary, file);
    } catch (error) {
        try { fs.unlinkSync(temporary); } catch (_) { /* never created */ }
        // the folder isn't writable either: fall back to writing in place
        if (error.code !== 'EACCES' && error.code !== 'EPERM') throw error;
        fs.writeFileSync(file, text, 'utf8');
    }
}

/**
 * Makes sure the loader is in the workbench JS.
 * @returns {'present'|'first'|'updated'|'failed'} 'present' = nothing to do.
 */
async function ensureLoader(context) {
    const block = loaderBlock(context);

    let js;
    try {
        js = fs.readFileSync(jsPath(), 'utf8');
    } catch (error) {
        vscode.window.showErrorMessage(
            `Animated Terminal: couldn't read VS Code's files (${error.code}).`);
        return 'failed';
    }

    if (js.includes(block)) return 'present';
    const firstTime = !js.includes(START_MARK);

    try {
        writeReplacing(jsPath(), withoutOurBlock(js) + block);
        return firstTime ? 'first' : 'updated';
    } catch (error) {
        if (error.code === 'EACCES' || error.code === 'EPERM') {
            const command = `sudo chown -R $USER "${vscode.env.appRoot}"`;
            const choice = await vscode.window.showErrorMessage(
                'Animated Terminal needs permission to write to VS Code\'s files. ' +
                'Run the command below in a terminal and try again.',
                'Copy command');
            if (choice === 'Copy command') {
                await vscode.env.clipboard.writeText(command);
            }
        } else {
            vscode.window.showErrorMessage(
                `Animated Terminal: failed to write (${error.code}).`);
        }
        return 'failed';
    }
}

function configuration() {
    const cfg = vscode.workspace.getConfiguration('terminalAnimado');
    return {
        effect: setting(cfg, 'effect', 'none'),
        opacity: setting(cfg, 'opacity', 0.5),
        speed: setting(cfg, 'speed', 1),
        quality: setting(cfg, 'quality', 'full'),
        tint: setting(cfg, 'tintInterface', true)
    };
}

async function applyFromConfig(context) {
    const { effect, opacity, speed, quality, tint } = configuration();
    const body = EFFECTS[effect]
        ? effectCss(context, effect, opacity, speed, quality)
        : '';

    const file = cssFile(context);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // atomic write: writes to a temporary file and renames it. Writing directly
    // left a window in which the loader read the file truncated mid-write,
    // applied broken CSS and the next tick restarted the animations from zero
    const temporary = file + '.tmp';
    fs.writeFileSync(temporary, `${CORRUPT_WARNING}\n${body}`, 'utf8');
    fs.renameSync(temporary, file);

    await applyColors(context,
        tint && PALETTES[effect] ? PALETTES[effect] : {});

    // the write above already is the switch: the loader rereads current.css
    // every 1s and applies it live. A reload only exists when the patch itself
    // isn't live — first install, migration from an old version or a VS Code update.
    const state = await ensureLoader(context);
    if (state === 'first' || state === 'updated') {
        const choice = await vscode.window.showInformationMessage(
            'Animated Terminal: reload the window once to activate it. ' +
            'After that, switches apply instantly, with no reload.',
            'Reload now');
        if (choice === 'Reload now') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    } else if (state === 'present') {
        removeLegacyCssFile(context);
    }
}

/**
 * Wraps a parameterless async function so two instances never run in flight
 * at the same time: a call arriving while the previous one is still running
 * only marks "pending" — when it finishes, it runs ONE more time, picking up
 * the latest state (not once per pending call, otherwise a quick series of
 * switches queues pointless work).
 *
 * Without this, two concurrent applyFromConfig calls — the window activation
 * apply still in flight when the user switches effects, two quick switches in
 * a row, or the same global `terminalAnimado.effect` changing in two windows
 * at once — could finish in SWAPPED ORDER: the slower one, stuck with an older
 * state, still won the race and wrote over the faster one. That is what made
 * the new color show up and, a moment later, go back to the old one.
 */
function serializeWithCollapse(fn) {
    let inFlight = null;
    let pending = false;
    function schedule() {
        if (inFlight) {
            pending = true;
            return inFlight;
        }
        pending = false;
        inFlight = Promise.resolve()
            .then(fn)
            .catch((error) => {
                console.error('Animated Terminal: failed to apply the configuration.', error);
            })
            .finally(() => {
                inFlight = null;
                if (pending) schedule();
            });
        return inFlight;
    }
    return schedule;
}

function activate(context) {
    cleanOldCss();
    cleanOldHtml();
    const scheduleApplyFromConfig = serializeWithCollapse(() => applyFromConfig(context));
    // the migration rewrites settings, which triggers onDidChangeConfiguration
    // and a new (collapsed) apply; reading falls back to the legacy keys anyway
    migrateLegacySettings().finally(() => scheduleApplyFromConfig());

    context.subscriptions.push(
        vscode.commands.registerCommand('terminalAnimado.chooseEffect', () => {
            const { effect } = configuration();
            const items = Object.entries(EFFECTS).map(([key, e]) => ({
                label: e.label, detail: e.detail, key
            }));
            items.push({ label: '🚫  None', detail: 'Removes the background', key: 'none' });

            const current = items.find((i) => i.key === effect);
            if (current) current.description = '●  current';

            const picker = vscode.window.createQuickPick();
            picker.items = items;
            picker.placeholder = 'Choose the terminal background effect';
            if (current) picker.activeItems = [current];
            picker.onDidAccept(async () => {
                const choice = picker.selectedItems[0];
                picker.hide();
                if (!choice) return;
                // applying happens in onDidChangeConfiguration
                await vscode.workspace.getConfiguration('terminalAnimado')
                    .update('effect', choice.key, vscode.ConfigurationTarget.Global);
            });
            picker.onDidHide(() => picker.dispose());
            picker.show();
        }),

        vscode.commands.registerCommand('terminalAnimado.removeEffect', async () => {
            await vscode.workspace.getConfiguration('terminalAnimado')
                .update('effect', 'none', vscode.ConfigurationTarget.Global);
        }),

        vscode.commands.registerCommand('terminalAnimado.toggleColors', async () => {
            const cfg = vscode.workspace.getConfiguration('terminalAnimado');
            const on = !setting(cfg, 'tintInterface', true);
            try {
                // applying (or restoring) happens in onDidChangeConfiguration
                await cfg.update('tintInterface', on,
                    vscode.ConfigurationTarget.Global);
            } catch (_) {
                // an update installed without a reload: the extension host already
                // runs the new code, but the window only registers new
                // package.json settings on reload — until then the update is rejected
                const choice = await vscode.window.showWarningMessage(
                    'Animated Terminal: reload the window to finish updating ' +
                    'the extension.', 'Reload now');
                if (choice === 'Reload now') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
                return;
            }
            vscode.window.setStatusBarMessage(on
                ? 'Animated Terminal: interface colors on'
                : 'Animated Terminal: interface colors off', 3000);
        }),

        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('terminalAnimado')) {
                scheduleApplyFromConfig();
            }
        })
    );
}

function deactivate() { }

// _effectCss is exposed for the performance tests;
// _loaderBlock, for tools that pre-apply the patch;
// _applyColors and _palettes, for the color backup/restore tests;
// _serializeWithCollapse, for the test of the queue that avoids the write race;
// _setting and _migrateLegacySettings, for the legacy settings tests
module.exports = {
    activate, deactivate,
    _effectCss: effectCss,
    _loaderBlock: loaderBlock,
    _applyColors: applyColors,
    _palettes: PALETTES,
    _serializeWithCollapse: serializeWithCollapse,
    _setting: setting,
    _migrateLegacySettings: migrateLegacySettings
};
