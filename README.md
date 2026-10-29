# Animated Terminal

Animated backgrounds for the VS Code panel — without turning the editor into a space heater.

| Effect | What it has | Interface colors |
|---|---|---|
| ❄️ Snow | Glittering flakes at three depths drifting with the wind, crystals and snow piled up below | Ice grey |
| 🌧️ Rain | Slanted rain with drop trails, flashes flickering at the top of the panel that change place, with a lightning bolt coming out of the middle of the light, and drops splashing on the river in four beats | Greyish blue |
| 🔥 Embers | Rising sparks, diffuse smoke and the glow of the embers below | Translucent red |

## Usage

`Ctrl+Shift+P` → **Animated Terminal: Choose Effect** → reload the window once.

To take it off: **Animated Terminal: Remove Effect**.

To turn only the interface colors on or off, keeping the animation:
**Animated Terminal: Toggle Interface Colors**.

## Settings

| Key | Default | What it does |
|---|---|---|
| `terminalAnimado.effect` | `none` | `snow`, `rain`, `embers` or `none` |
| `terminalAnimado.opacity` | `0.5` | From `0.05` (ghost) to `1` (full) |
| `terminalAnimado.speed` | `1` | A multiplier — `0.5` is slow, `2` is fast |
| `terminalAnimado.quality` | `full` | `light` keeps a single animated layer |
| `terminalAnimado.tintInterface` | `true` | Tints bars, buttons and badges in the effect's color |

Up to 0.8.1 these keys had Portuguese names (`efeito`, `opacidade`, `velocidade`, `qualidade`, `colorirInterface`) and values (`neve`, `chuva`, `brasas`, `nenhum`, `completo`, `leve`). 0.9.0 moves them to the new keys on its own the first time it starts.

## Interface colors

With an effect on, the extension tints the interface to match — in mid,
discreet tones on purpose, to hint at the effect without shouting over any
theme: embers in translucent red (low-opacity RGBA, so it doesn't turn into
solid brown), snow in ice grey (never pure white), rain in greyish blue. It is
done through `workbench.colorCustomizations` (the official colors API), so it
works on top of any theme and **only touches colors**: no size, font or layout
changes.

The original value of each color is stored before it is overwritten. When you
pick "None" (or turn off `tintInterface`), your configuration comes back
exactly as it was. If you are going to uninstall the extension with an effect
on, remove the effect first — once uninstalled, it has no way to run the
restore.

## Why it is light

The first version animated inside the SVG. It looks like the obvious choice,
but when an SVG is used as a background image, the browser **repaints the
whole image on every frame** — and the cost doesn't come from the number of
particles, it comes from the mere existence of an animation. Measured in
Chromium (headless, software rendering, a 1500x350 panel — high numbers for
lack of a GPU, but comparable to each other):

| What is on screen | Cost |
|---|---|
| Empty page | 1.0% of a core |
| Static layer, no animation | 1.1% |
| Snow ground (static) | 1.3% |
| River with rings animated inside the SVG | 62.3% |
| Layer moved by `transform` in CSS | ~23% |

Hence the two architecture decisions: **no SVG has an animation inside** (they
are all static, rasterized once) and movement comes from `transform` in CSS,
which is compositing work — truly cheap when there's a GPU, which is the case
for the real VS Code. Still drawings (piled snow, embers) come for free.

The rain splashes on the river are four static frames taking turns through
`@keyframes` on the background image (impact, crown, ring, fade): each swap is
discrete (~2.5 repaints per second on the river strip), nothing like the 60
frames per second of the inner animation the table above retired — cheap
enough to stay on even in `light` mode.

The tiles have an invisible seam: whatever crosses the edge is duplicated on
the other side, and every cycle ends at an exact multiple of the tile — the
height on the vertical axis and, on the horizontal one, the exact width (the
rain's diagonal fall) or zero (the snow's wind sway goes back and forth). The
wind and the sky flashes are also just `transform` and `opacity` — compositing,
no repaint. Since `background-size` is fixed in pixels, resizing the panel
rasterizes nothing new.

If it is still heavy on your machine, `terminalAnimado.quality: "light"` keeps a
single animated layer — about half the cost.

## How it works inside

VS Code doesn't let an extension inject CSS into the workbench, so the
extension appends a small loader, delimited by markers, to the installation's
`workbench.desktop.main.js`. The loader rereads a CSS file from the extension's
global storage every second, so switching effects applies live. Consequences:

- The first time, VS Code warns that **the installation seems corrupt** — this
  is expected; the extension hides that specific notification.
- It needs write permission on the VS Code folder. Without it, the extension
  shows the `chown` command to run.
- Every VS Code update wipes the loader; the extension detects it and puts it
  back on the next start (asking for one reload).

## License

MIT
