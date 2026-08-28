# Mare Infinitus

A living, fixed-pixel material simulation of the violet ocean world from Dan
Simmons's *Hyperion Cantos*. The viewport reveals more or less of the world at
different screen sizes; the art pixels remain three physical pixels wide.

**Live:** [bensonperry.com/mareinfinitus](https://bensonperry.com/mareinfinitus/)

The station design follows the books: a large, multitiered fishing platform on
roughly twenty pylons above the waves, supported by a deep submerged foundation
and keel weights.

## Run locally

```powershell
npm run dev
```

Then open `http://localhost:3000/`.

## Controls

- ecosystem-density slider: continuously blends from sparse through balanced to teeming while preserving the same palette and object opacity
- `A`, `B`, `C`: keyboard shortcuts for sparse, balanced, and teeming density presets
- drag through the ocean: inject momentum and suspended material
- `S`: summon a storm to stress-test the coupled systems
- `F`: fullscreen
- `H`: hide or show the interface
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

## Raster/world contract

- one art pixel is always exactly `3 × 3` display pixels
- world objects live at stable world coordinates; the viewport is only a camera crop
- resizing reveals or hides world area and preserves the running material state
- structures are assembled from fixed integer-pixel modules, panels, discs, and raster lines
- viewport-sized rectangles are reserved for environmental fields such as sky and water
- water depth transitions use ordered dithering between exact palette pixels
- objects use irregular sprite masks; materials and currents use stippled clusters
- surface objects are rendered in submerged, wave, and above-water depth passes
- the fishing platform is the deliberate exception to world anchoring: it keeps a fixed visible footprint against the right edge so wider viewports reveal more open ocean

## Field index

The in-simulator bestiary separates `BOOK` entries—animals, people, places, or
details named or described in *Endymion*—from `SIM` entries invented for this
material study. Major entries include contextual excerpts from the arrival,
station, open-ocean, and Lamp Mouth passages rather than isolated definition
fragments. A first-visit introduction gives the spoiler warning and scene
context; the `ABOUT` control opens it again later.

The interface also fades away automatically for screensaver-style viewing.
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

The validator syntax-checks every script, checks the 34-entry field guide for
duplicate IDs and retired debug copy, verifies subpath-safe metadata and exact
asset dimensions, regenerates the icon set deterministically, and validates the
native packaging inputs.

## Project structure

- `app.js` — world state, fluid surface, raster drawing, interaction, field index, and scene composition
- `systems/creature-variation.js` — restrained, deterministic species body plans and animation cadence
- `systems/ecology.js` — behaviors, food relationships, schooling, and long-running ecological events
- `systems/ambient-life.js` — platform residents, room lighting, weather reactions, and background activity
- `public/` — favicon and social preview artwork
- `screensaver/windows/` — native Win32/WebView2 `.scr`, installer, and release build
- `screensaver/macos/` — native ScreenSaver.framework/WKWebView `.saver` and packaging
- `scripts/` — deterministic icon generation and release validation

No build step is required. The project is plain HTML, CSS, and JavaScript so the
same simulation can run locally, from GitHub Pages, or later inside a native
screensaver shell.

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
