# Mare Infinitus

A living, fixed-pixel material simulation of the violet ocean world from Dan
Simmons's *Hyperion Cantos*. The viewport reveals more or less of the world at
different screen sizes; the art pixels remain three physical pixels wide.

The station design follows the books: a large, multitiered fishing platform on
roughly twenty pylons above the waves, supported by deep submerged foundation
and keel weights with long drag-anchor cables rather than legs reaching the
ocean floor.

## Run locally

```powershell
npm run dev
```

Then open `http://localhost:3000/`.

## Controls

- `A`, `B`, `C`: visual-density palettes
- drag through the ocean: inject momentum and suspended material
- `S`: summon a storm to stress-test the coupled systems
- `D`: show or hide the simulated current field
- `F`: fullscreen
- `H`: hide or show the interface

## Simulated systems

- projected 2D current field with solid platform boundaries
- free surface coupled to currents, tides, rain, wind, wakes, and pointer input
- buoyant raft and mooring buoy with an iterative rope constraint
- platform sway, load sag, storm stress, wear, and gradual maintenance
- suspended sediment that deposits on and erodes from the foundation
- advected nutrients and plankton, grazing schools, and a feeding leviathan
- slowly evolving weather, tidal current reversal, rain, and rare storms

The interface also fades away automatically for screensaver-style viewing.

## Hosting

This is a dependency-light static site hosted through GitHub Pages at
`https://bensonperry.com/mare-infinitus/`.
