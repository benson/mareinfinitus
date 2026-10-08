# Obelisk tile checkpoint — 2026-09-04

The Obelisk direction was accepted by Benson in this task. Benson subsequently
authorized continuing through the whole scene without individual approval stops.
See `scene-tile-checkpoint.md` for the full-scene result. Starting revision: `f44b428`.

The 42x240 Obelisk now assembles 58 placements from 19 drawn tile designs in
`tiles/obsidian.js`, with the placement data in `maps/obelisk.js`. Four edge
profiles author the taper; three front courses, a three-piece cap, inscription
panels, a seven-pixel threshold and two shallow seat courses supply the surface.
It uses six obsidian ramp colors. The builder only assembles, antialiases and
outlines. STANDS, the other monuments, camera, actors and paintSandDrift are
unchanged. No commit, push or deployment has been made for this candidate.

Review outputs live under the ignored `output/time-tombs/` directory:

- `compare/obelisk-tiled-compare.png`: reference / previous / candidate at 1x,
  3x nearest, grayscale and squint. Each row is also saved separately.
- `compare/obelisk-tiles-6x.png`: each production tile beside a Castlevania crop.
- `establishing-4x-ultrawide.png`: candidate in the accepted composition.
- `compare/obelisk-before.png`: native sprite captured before the edit at f44b428;
  retained as the comparison baseline, not as an acceptance reference.

Regenerate while that baseline is present:

```powershell
node scripts/render-compare.mjs --reference castlevania-bloodlines.png --crop 0,56,120,140 --sprite src/time-tombs/art/obelisk-relit.js#buildObeliskRelit --previous output/time-tombs/compare/obelisk-before.png --save-sprite output/time-tombs/compare/obelisk-tiled.png --output output/time-tombs/compare/obelisk-tiled-compare.png
node scripts/render-obelisk-tiles.mjs
node scripts/render-relit-studies.mjs
```

Validation: scene and geometry scripts and TypeScript passed. Tile bounds,
19-design budget, six-color ramp membership and seven-pixel threshold checked.
`npm run test:scenes` is still red at its final surface gate: cave builders contain
dither/PRNG and Palace contains PRNG, also present in f44b428. These are untouched
later checkpoints. None of these checks constitutes visual acceptance.

The prior Mare Infinitus task's six recent turns returned empty item arrays from
the task API. This candidate follows Benson's pasted handoff and the repository
briefs; task-history retrieval remains an open tooling complaint.
