# Mare Infinitus — A Living Simulation

A living, fixed-pixel material simulation of the violet ocean world from Dan
Simmons's *Endymion*. The viewport reveals more or less of the world at
different screen sizes. Desktop and screensaver views use a three-screen-pixel
grid; narrow mobile views use a one-screen-pixel grid so the phone becomes a
wider camera rather than a magnifying glass.

**Live:** [bensonperry.com/mareinfinitus](https://bensonperry.com/mareinfinitus/)

**Second scene:** [The Time Tombs](https://bensonperry.com/mareinfinitus/?scene=time-tombs)

**Screensaver downloads:** [Windows and macOS release archives](https://github.com/benson/mareinfinitus/releases)

The station design follows the books: a large, multitiered fishing platform on
roughly twenty pylons above the waves, supported by a deep submerged foundation
and keel weights.

## Run locally

```powershell
npm run dev
```

Then open `http://localhost:3000/`.

## Controls

- `W`: choose a living world without leaving the simulator
- `T`: open or close the compact settings panel in the bottom-right corner
- ecosystem-density slider: continuously blends from sparse through balanced to teeming while preserving the same palette and object opacity
- `A`: open the About introduction
- drag through the ocean: inject momentum and suspended material
- `F`: fullscreen
- `H`: hide or show the interface
- `M`: enable or mute the optional procedural soundscape (sound never autoplays)
- `P`: enter photo mode; press `C` to save the clean canvas and `P` or `Escape` to leave
- hold `Control` and hover: identify the creature, traveler, structure, or material beneath the pointer and trace its visible pixel silhouette
- `G`: open or close the bestiary and glossary; every entry has a stable `MI-##` feedback code and can be clicked to copy its label
- `PIN` in the glossary: keep the field index open across reloads; hovering an entry outlines every visible instance of that category

## Simulated systems

- projected 2D current field with solid platform boundaries
- free surface coupled to currents, tides, rain, wind, wakes, and pointer input
- buoyant raft and mooring buoy with an iterative rope constraint, clean velocity-only wake, and sparse stern bubbles
- platform sway, load sag, storm stress, wear, and gradual maintenance
- suspended sediment that deposits on and erodes from the foundation
- clustered violet phytoplankton blooms, pylon bubble trails, low-water silt, grazing schools, and feeding leviathans
- a depth-sorted fauna ladder from high-water fish and jellyfish through rainbow sharks and hectapus to deep sea giants and kilometer-scale gigacanth silhouettes
- cohesive fish schools with separation and alignment, shark pursuit, prey panic, and colossal advance-pressure reactions
- deterministic individual body plans: proportions, fins, tails, segments, tentacles, patterns, glow organs, scars, age classes, and species-specific swim cadence
- six legible animal states—wandering, feeding, curious, startled/fleeing, sheltering, and resting—driven by food, storms, nearby travelers, predators, cover, and temperament
- long-running ecological events including jelly blooms, migrations, feeding frenzies, deep quiet, distant breaches, and abyssal shadow passages
- depth optics with attenuated fauna, broken pixel caustics, and plankton displacement that can reveal a deep body before the body itself becomes clear
- fauna-driven wakes at every scale, from tight fish and jelly pulses to broad, subdued deep-background displacement
- mutually exclusive colossal encounters separated by long quiet intervals, with breathing contours, articulated fins, water-obscured whiskers, and current-driven rope-physics tendrils
- two exceptionally rare abyssal titans that pass like moving landscapes behind the ordinary ecosystem
- slowly evolving weather, tidal current reversal, mostly vertical pixel rain, and rare storms
- a slowly setting moon that passes behind the ocean horizon and cycles back only while off-screen
- a world-anchored cellular storm front with advected rain and raster lightning
- platform rooms, workers, fishers, guards, cranes, doors, fishing lines, and beacons that react to the raft, Raul, storms, structural stress, and nearby large animals
- persistent world memory: weathering, disturbance, vitality, quiet periods, and rare encounters decay over real time instead of resetting into an identical loop on every visit
- a shared cinematic director that paces quiet, material build, reveal, and aftermath across long cycles

## The Time Tombs

The first independent scene pack proves that the simulation is not an ocean
reskin engine. Open `?scene=time-tombs` or choose **WORLDS** in the interface.
It is a ground-up Phaser 4 world with a fixed pixel grid, one coherent pixel-art
valley, depth-sorted actors, alpha-aware inspection, and its own interaction model:

- a single seamless valley composition whose terrain, architecture, human
  scale, sky, and foreground share one pixel language
- the Sphinx, Shrike Palace, Crystal Monolith, Obelisk, Jade Tomb, Cave Tombs,
  camp, and chronotropic instruments at deliberately different scales and depths
- seven individually inspectable pilgrims with distinct fixed-pixel sprites
- staged time tides: instrument warnings, lifted dust and footprint impressions,
  pilgrim reactions, and a quiet recovery; click echoes retain the depth clicked
- paired pilgrim vignettes, restrained tomb glints and interior lights, and rare
  distant Shrike glimpses
- contextual walks to the fire and instruments, kneeling and sketching poses,
  inspectable wind-worn stones, and click-triggered monument responses
- distinct patched shelters, bedding and travel cases, with sun-linked shadows
- optional spatial wind, campfire and instrument sound through **M**; silent on
  entry, while hidden, and in screensaver mode
- a stable camera aperture: resizing reveals or hides the same world without
  reconstructing, reseeding, or stretching it

The monument order and field-guide descriptions were checked against Benson's
local four-book *Hyperion Cantos* edition. Short excerpts remain identified as
book text; the connective material is clearly labeled as simulation.

## Raster/world contract

- one art pixel maps to an exact integer display-pixel cell: `3 × 3` on desktop
  and screensavers, `2 × 2` on short mobile landscapes, and `1 × 1` on narrow
  portrait phones
- world objects live at stable world coordinates; the viewport is only a camera crop
- resizing reveals or hides world area and preserves the running material state
- water darkness reaches its abyssal value at a fixed world depth; a taller
  viewport reveals darker, sparsely inhabited water instead of stretching the
  same gradient and fauna across the additional height
- structures are assembled from fixed integer-pixel modules, panels, discs, and raster lines
- viewport-sized rectangles are reserved for environmental fields such as sky and water
- water depth transitions use ordered dithering between exact palette pixels
- objects use irregular sprite masks; materials and currents use stippled clusters
- surface objects are rendered in submerged, wave, and above-water depth passes
- the fishing platform is the deliberate exception to world anchoring: it keeps a fixed visible footprint against the right edge so wider viewports reveal more open ocean

## Field index

The in-simulator bestiary separates `BOOK` entries—animals, people, places, or
details named or described in *Endymion*—from `SIM` entries invented for this
simulation. Major entries include contextual excerpts from the arrival,
station, open-ocean, and Lamp Mouth passages rather than isolated definition
fragments. A first-visit introduction gives the spoiler warning and scene
context; the `ABOUT` control opens it again later.

The passive interface is limited to a small bottom-right action dock and fades
away automatically. Settings and the field guide appear only when explicitly
opened.
Control-inspected subjects show the same concise field-guide description used
by the glossary, without collection counts or implementation-state labels.

## Native screensavers

The web simulation and both native shells share the same `?screensaver=1`
runtime. In that mode the welcome screen, controls, field guide, pointer input,
cursor, and debug API are absent while the material simulation continues
full-bleed from bundled local assets. Neither native build needs the live site
after installation.

### Windows

From a Visual Studio 2022 Developer PowerShell:

```powershell
./screensaver/windows/build.ps1 -Architecture x64 -Clean
```

This produces `screensaver/windows/release/MareInfinitus-Screensaver-Windows-x64.zip`.
Extract it and run `Install.cmd`; the package contains a native WebView2 `.scr`,
offline web assets, and per-user install/uninstall scripts. It implements the
standard `/s`, `/p HWND`, and `/c` screensaver switches. See
[`screensaver/windows/README.md`](screensaver/windows/README.md) for prerequisites
and testing commands.

### macOS

On a Mac with Xcode installed:

```bash
bash screensaver/macos/build.sh
bash screensaver/macos/install.sh
```

The first command creates a universal `arm64` + `x86_64`
`Mare Infinitus.saver`; the second installs it into the current user's Screen
Savers folder. Developer ID signing and notarized distribution are supported by
`screensaver/macos/package-release.sh`. See
[`screensaver/macos/README.md`](screensaver/macos/README.md).

Apple currently has a reported macOS 26.4 regression in which `WKWebView`
content inside the public `ScreenSaverView` host can disappear after a few
seconds. The bundle uses the only public third-party `.saver` architecture, but
26.4 and later should be smoke-tested before calling the Mac release stable.

Tagging a commit `screensaver-v*` runs the cross-platform build workflow and
publishes both ZIPs as a prerelease. Manual workflow runs build downloadable
test artifacts without creating a release.

## Release validation

```powershell
npm test
```

The validator syntax-checks every script, checks the 33-entry Mare field guide for
duplicate IDs and retired debug copy, verifies subpath-safe metadata and exact
asset dimensions, regenerates the icon set deterministically, validates native
packaging inputs, stress-tests Mare’s simulation, and validates the Time Tombs
native rasters, temporal events, spatial audio mix, and paired interactions plus
a deterministic ten-minute expedition replay.

## Project structure

- `app.js` — the mature Mare Infinitus renderer and its scene-specific interaction layer
- `scenes/` — registered scene packs; Time Tombs owns a complete independent renderer while Mare preserves its established composition
- `systems/scene-runtime.js` — scene registry, navigation, shared sound/photo controls, and active-scene lifecycle
- `systems/world-memory.js` — namespaced persistent state with real-time decay and slow environmental consequences
- `systems/soundscape.js` — optional, gesture-gated procedural ambience
- `systems/silhouette-library.js` — authored pixel masks shared by scene renderers
- `systems/creature-variation.js` — restrained, deterministic species body plans and animation cadence
- `systems/ecology.js` — behaviors, food relationships, schooling, and long-running ecological events
- `systems/ambient-life.js` — platform residents, room lighting, weather reactions, and background activity
- `systems/light-field.js` — inertial light aiming, live wave intersections, refraction, attenuation, and reusable volumetric emitters
- `systems/motion-engine.js` — mass-aware locomotion, articulated spines, direction continuity, and shared soft-body chains
- `systems/world-physics.js` — spatial perception, depth-aware separation, hydrodynamic body wakes, and buoyancy contacts
- `systems/scene-engine.js` — shared depth compositing and the evolving water-material field
- `src/time-tombs/` — the Phaser 4 Time Tombs scene, world data, actors, interactions, and fixed-camera contract
- `dist/time-tombs/time-tombs.js` — the production ESM bundle loaded only when Time Tombs is selected
- `src/time-tombs/art/` — native indexed rasters, material ramps, terrain, six tombs, props, and 75 pilgrim poses
- `scripts/render-time-tombs-art.mjs` — lossless nearest-neighbor review sheets; no image reduction
- `systems/event-director.js` — long-form quiet/build/reveal/recovery pacing and rare-encounter spacing

The coupling and stability contracts are documented in
[`docs/SIMULATION.md`](docs/SIMULATION.md).
The scene-pack contract and expansion workflow are documented in
[`docs/SCENE-PACKS.md`](docs/SCENE-PACKS.md).

- `public/` — favicon and social preview artwork
- `screensaver/windows/` — native Win32/WebView2 `.scr`, installer, and release build
- `screensaver/macos/` — native ScreenSaver.framework/WKWebView `.saver` and packaging
- `scripts/` — deterministic icon generation and release validation

Mare Infinitus remains plain Canvas JavaScript. Time Tombs is compiled with
Vite and TypeScript: run `npm run assets:time-tombs` after changing its source
or world art, then `npm run assets:stamp`. Review sheets go to `output/time-tombs/`.
The art is constructed at native sizes in code, with no image-generation or
external-editor step. The view stays at 4×; drag or use arrow keys to explore
in either axis, and middle-click or press Home to return to the valley. The extended world has
real sky and foreground for taller windows. Walk cycles follow distance traveled;
sun-driven shadows, brief sand gusts, wind-driven cloth, and campfire smoke share
the scene’s slow environmental rhythms.
The paired conversations and atmospheric choreography are supplemental visual
interpretations, not scenes quoted from the novels. Run the browser smoke checks
with `scripts/qa-time-tombs.cjs` and `scripts/qa-time-tombs-life.cjs` through
Playwright CLI; the latter advances the debug-only clock through the full event
sequence. `node scripts/render-time-tombs-art.mjs life` creates native, 4× and
grayscale material/character review sheets.
The resulting static files run locally, from GitHub Pages, and
inside the native screensaver shells without a server-side runtime.

## Source and attribution

Mare Infinitus, the River Tethys travelers, and book-derived creatures and
structures are from Dan Simmons's *Hyperion Cantos*, principally *Endymion*.
Short excerpts are identified as `BOOK TEXT` in the field index. Supplemental
wildlife and ecological events are labeled `SIM`. This is a noncommercial fan
project and is not affiliated with Dan Simmons or his publishers.

## Hosting

This is a dependency-light static site hosted through GitHub Pages at
`https://bensonperry.com/mareinfinitus/`. GitHub Pages publishes the root of the
default branch; all asset paths are relative so local and subpath hosting behave
the same way.
## Time Tombs camera and screensaver

- Wheel over the canvas: step between crisp 1×, 2× and 4× zoom around the pointer.
- `F` or the Fullscreen control: enter/exit fullscreen.
- Click a field-guide entry: center the visible subject (nearest matching prop
  for groups). Absent encounters center their area without forcing a spawn.
- Screensaver mode: hidden controls, silent playback and slow valley panning.

Windows installation: `Install-MareInfinitus.ps1 -SetAsDefault -Scene time-tombs`.
Both worlds are bundled offline; `-Scene mare-infinitus` selects the ocean.
macOS builds select the valley with `SCENE=time-tombs bash screensaver/macos/build.sh`.

Production uses GitHub Pages Actions: `npm ci`, `npm run build:web`, `npm test`,
then `npm run stage:site`. Only runtime files are deployed; the Phaser bundle
is built for every deployment and screensaver package. Do not publish the raw
source checkout without building its dynamic runtime bundle.
