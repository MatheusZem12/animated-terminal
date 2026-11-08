# Changelog

## 0.9.1

- Survives VS Code updates installed by a package manager (pacman, dnf...):
  those reinstall the workbench files owned by root, which made writing the
  patch fail with a permission error and the effect disappear. The patch is
  now written to a temporary file and renamed over the original, which only
  needs write access to the folder — no `sudo chown` after every update

## 0.9.0

- Everything in English: the name shown is now **Animated Terminal**, along
  with the commands, messages, settings and docs. The extension id
  (`matheuszem.terminal-animado`) stays the same, so updating keeps the
  backup of your original interface colors
- Settings renamed: `efeito` → `effect`, `opacidade` → `opacity`,
  `velocidade` → `speed`, `qualidade` → `quality`, `colorirInterface` →
  `tintInterface`, with the values in English (`snow`, `rain`, `embers`,
  `none`, `full`, `light`). Existing values move to the new keys
  automatically on the first start; until then they are still read from the
  old keys, so the effect never goes away
- Commands renamed: **Choose Effect**, **Remove Effect** and **Toggle
  Interface Colors** (`terminalAnimado.chooseEffect`, `.removeEffect`,
  `.toggleColors`)
- The loader now reads `current.css` instead of `atual.css`; the update asks
  for one reload, and the old file is removed afterwards

## 0.8.1

- More silence between one bolt and the next: the rain flash cycle doubled
  (18s to 36s, with the same nine points), so there are close to 4s of dark
  sky between flickers, against 2s in 0.8.0. The flicker itself still lasts
  ~0.45s — the timings inside it are a percentage of the cycle, and they were
  shrunk by the same amount so they don't drag
- A much bigger flash: diameter between 620 and 1040 px, against 400 to 700.
  The brightness at the peak didn't change, so it covers more sky without
  getting brighter
- Since the circle is bigger, two flickers in a row now need 28% of the panel
  between them (it was 22%) so they don't overlap

## 0.8.0

- The rain flash doesn't move any more. It lit up at one point and went out
  at another: since `background-position` is animatable, the circle slid to
  the next flicker's place while still lit, and it read as a ball crossing
  the screen. Now the position is repeated at the end of each keyframe slice,
  so the jump happens entirely in the dark and the glow stays still while it
  flickers
- The Y axis became fixed: the flash is always born against the top of the
  panel, with its center a little above the edge, whether the terminal is tall
  or short. Only X is drawn at random, on each application
- Diameter between 400 and 700 px and brightness between 0.20 and 0.46 of the
  opacity — a fixed minimum and maximum, to vary without bursting. The peak
  dropped a lot compared to 0.7.9 (which reached 1.1× the opacity): it is
  meant to be discreet
- The lightning bolt is back, now drawn inside the flash itself: the two
  layers (bolt and light) use the same square box and the same position, so
  the bolt always comes out of the middle of the glow. Since the position is a
  percentage, the box never leaves the panel — neither the light nor the bolt
  goes past the terminal width
- It doesn't come with every flicker (about 60%), and when it does the peak
  goes up a little (0.34 to 0.62), otherwise the drawing disappears inside the
  light
- Each flicker got shorter: ~0.45s in the 18s cycle, against ~0.9s before
- A more spaced cycle (18s for nine flashes) and a draw that avoids two
  flickers in a row at almost the same X

## 0.7.9

- The rain flash became a single circle. The wide burst plus the veil that
  washed over the top strip read as a smudge coming down the screen; now it is
  a single round glow with a gradient, flickering in a corner of the panel, in
  the middle or anywhere between them, and going out
- There are seven points in a scrambled order, each with its own diameter, so
  two flashes in a row never come out of the same place or with the same size

## 0.7.8

- Fixes the rain flash, which came out with pieces missing: instead of a round
  glow, a rectangle cut in straight lines. The burst's ellipse was wider than
  the gradient box, so it was still lit when it hit the edge and `no-repeat`
  cut it there. Now it fits entirely in the box and the glow fades on its own,
  without a seam
- The flash also got taller with a softer falloff: it goes further down the
  panel and the top veil gained intermediate stops

## 0.7.7

- The rain bolt became a flash. Instead of the drawn bolt coming down the
  screen (which read more like a still scratch than lightning), now there are
  only lights flickering at the top of the panel: a concentrated burst plus a
  veil washing over the whole top strip, with a double flicker and some glow
  left after. They still change place between one burst and the next
- Both flashes are gradients in the CSS itself — the rain bolt SVG left the
  package and the animation became opacity only, with no image to rasterize

## 0.7.6

- The tinted embers background was reading as brown, not embers. Replaced by
  translucent red (low-opacity RGBA over the theme, instead of solid brown) in
  the title bar, activity bar, status bar and panel border

## 0.7.5

- Fixes the "flickering" color: the new color showed up and, a moment later,
  went back to the old one. The cause was a lack of serialization — two
  concurrent apply calls (the window activation apply still in flight when you
  switch effects, two quick switches in a row, or the same effect changing in
  two windows at once) could finish in swapped order: the slower one, stuck
  with an older state, still won the race and wrote over the faster one. Now
  only one application runs at a time; whatever arrives while the previous one
  is in flight doesn't start a new race — it only marks "pending" and, when
  that finishes, runs once more, always picking up the latest configuration

## 0.7.4

- The lo-fi ambient sound from 0.7.3 is gone: it didn't land well. The whole
  audio engine was removed (Web Audio, the `audio.json` file, the `som` and
  `volumeSom` settings, the "Toggle Sound" command) — the extension is visual
  only again, as it always was
- The more discreet color palettes and the ice-grey snow (instead of white)
  from 0.7.3 still apply — that wasn't part of the complaint

## 0.7.3

- Lo-fi ambient sound, one per effect: rain falling with drops, gusty wind for
  the snow and a crackling fire for the embers. All **synthesized on the fly
  with Web Audio** (filtered noise + low-frequency oscillators modulating
  cutoff and gain, plus short bursts scheduled at random for drops and
  crackles) — no embedded audio file, so the extension package doesn't grow.
  A shared "vinyl needle" layer (very soft band-pass noise) gives the three
  ambiences the lo-fi touch. A very low default volume
  (`terminalAnimado.volumeSom`, 0.14) and a dedicated switch
  (`terminalAnimado.som`, the "Toggle Sound" command)
- The sound fades out on its own when the window loses focus (otherwise, with
  two VS Code windows open, both would play together) and when the terminal
  panel is closed — reacting within 1s, always with a smooth fade, no click.
  The sound state lives in a file apart from the CSS on purpose: being in the
  same file would make adjusting just the volume restart the animations (the
  same kind of stutter 0.7.1 fixed for the CSS)
- Interface palettes revised: the rain and embers ones were too dark, and the
  snow one too white (clashing with dark themes). Now all three use mid,
  discreet tones — including on the bottom bar — and snow uses ice grey
  instead of white
- The leftover color sweep (0.7.2) now also recognizes the 0.7.0–0.7.2 palette
  colors, so whoever had the old palette applied comes out clean on updating,
  without turning the colors off and on again by hand

## 0.7.2

- Turning the colors off (or switching/removing the effect) now cleans up
  EVERYTHING that belongs to the extension: besides restoring the backup, a
  sweep removes any leftover color from any palette — this version's or older
  ones — that was left behind. That is what kept the interface stuck in the
  embers colors when disabling
- The root of the leftovers was fixed too: with two windows open, both applied
  the colors at the same time and one could store as "original" the color the
  other had just written — and the restore gave back the old palette. Now one
  of the extension's colors never enters the backup as an original
- Embers back to the classic look (sharp sparks rising straight up, diffuse
  smoke and the warm glow still at the base), exactly as it was before 0.7.0

## 0.7.1

- No more "stutter" restarting the animation every now and then: the loader
  could read `atual.css` in the middle of a write (or on a transient failure)
  and apply truncated or empty CSS — the next tick reapplied the right one and
  every animation started over from zero. Now the write is atomic (it writes to
  a temporary file and renames it) and the loader ignores empty or failed
  reads, keeping the last good CSS. The window must be reloaded once for the
  new loader to go live
- Snow: the ground with only the snow mounds at three depths and the
  glittering — no snowman and no pine trees; rarer, more discreet crystals
- Rain: the drops now splash on the river in four beats (impact, crown, ring,
  fade), with six out-of-phase splash points and reflections that come and
  go — and without the paper boat
- Embers: the ground redrawn as a bed of coal with an irregular crest, glowing
  cracks snaking through it and amber rim light; in the air, spark streaks with
  a bright head (the blur of something rising fast) instead of the little
  crosses and loose flames

## 0.7.0

- Animations redesigned to feel truly alive:
  - **Snow**: flakes with a glow halo, six-armed crystals with branches and
    twinkling little stars, drifting with the wind (a soft sway in opposite
    phase, with the fall always constant) — and a third layer of tiny flakes in
    the back, which gives depth. Snowy little pine trees now live on the piled
    snow
  - **Rain**: slanted drops with a real drop trail (bright head, faint tail),
    a bolt with a flash that lights up the clouds and changes place between one
    burst and the next (two per cycle), and the river gained depth, gliding
    reflections and a paper boat rocking on the waves
  - **Embers**: sharp sparks with a glowing halo, little tongues of fire and
    crackles rising with the wind; below, coals with glowing cracks and the
    embers breathing slowly, with a warm light at the base
- The cost stays the same as ever: the SVGs remain static and every new
  movement (wind, diagonal, pulse, flash) is `transform`/`opacity` —
  compositing work, no repaint. The cycles always end at exact multiples of the
  tile, so the seam stays invisible
- Interface palettes modernized, with more contrast and vivid accents — embers
  in amber on charcoal, snow in ice with sky blue, rain in storm blue — and
  more complete: the panel border, the active terminal tab, the activity bar
  indicator and the status bar remote item now match the effect

## 0.6.0

- The interface now dresses up as the effect: embers tints bars, buttons and
  badges red; snow, grey and white; rain, blue — via
  `workbench.colorCustomizations`, color keys only (no size or layout
  changes), applied live on top of any theme
- The original value of each color is stored before being overwritten and
  comes back intact when "None" is chosen — including the user's own existing
  customizations, which are merged, not erased
- New `terminalAnimado.colorirInterface` setting (default `true`) for whoever
  wants the rain in the terminal without the whole editor turning blue, with
  the "Toggle Interface Colors" command in Ctrl+Shift+P

## 0.5.2

- The rain splashes on the river again: splash crowns and rings opening on the
  water, now as three static frames taking turns through `@keyframes` on the
  background image — discrete swaps (~3 repaints/s), without bringing back the
  60 fps animated SVG that 0.2.3 removed for costing 62% of a core
- The splashes follow the `velocidade` setting and stay on in `leve` mode
  too — the discrete swap costs a fraction of a particle layer

## 0.5.0

- No more reload requests on every switch: the patched block no longer embeds
  the effect's CSS (that is what changed it — and rewrote VS Code's files — on
  every click). Now it is 100% fixed; only the first install or a VS Code
  update ask for a reload, just once
- atual.css went back to globalStorage (a valid vscode-file root, with a
  stable path): updating the extension no longer invalidates the patch
- Removes the orphan block of the old Fundo Animado extension in
  workbench.html, which always drew snow, ignoring the "None" effect
- Keeps the "installation corrupt" warning hidden (it used to be the orphan
  block that hid it; now the CSS goes in atual.css itself)
- The loader rereads the CSS every 1s (it was 1.5s): a more immediate switch on click

## 0.3.0

- Live effect switching: the patch became a fixed loader that rereads the CSS
  from globalStorage every 1.5s — changing effect/opacity/speed no longer asks
  for a reload (only the first use does, once)
- Fixes switches that didn't apply and "None" showing an old effect (Chromium
  served old patches from cache)
- The effects now start below the panel tab bar, instead of raining on top of
  Problems/Output/Terminal
- A smaller rain bolt (60% of the height) and stronger clipping on the panel card
- The "Choose Effect" menu marks the current option

## 0.2.3

- The river became a static drawing: the rings animated inside the SVG cost
  62% of a core by themselves, against ~1% for the still drawing
- No SVG has an inner animation any more

## 0.2.2

- The patch started being injected through the JS: Chromium serves the
  workbench CSS from cache, so switching or removing the effect had no effect
  on screen
- The `qualidade` setting (completo/leve) to reduce animated layers
- Automatic cleanup of the old patch written into the CSS

## 0.2.0

- Renamed to Terminal Animado, with its own icon
- A snowman on the ground of the snow effect

## 0.1.2

- Reapplies the CSS when it points to an earlier version of the extension (the
  path changes on every update and the images silently disappeared)

## 0.1.1

- Two animated layers instead of three: snow crystals and smoke started being
  drawn inside the main tile, with no extra render cost

## 0.1.0

- Architecture rewrite: static SVGs + `transform` in CSS, ~2.8x cheaper per
  layer and with nothing recalculated when resizing the panel
- The extension started applying its own CSS: the dependency on the
  `background` extension is gone
- Effect, opacity and speed became real settings, which travel along with
  Settings Sync
- Automatic reapplication when a VS Code update wipes the patch

## 0.0.2

- Rain: a river at the base with splashes, rings on the water and gliding glints
- Snow: a pile of accumulated snow at the base, in two layers
- Animations anchored at the base, so the ground shows in short panels

## 0.0.1

- First version: snow, rain and embers
