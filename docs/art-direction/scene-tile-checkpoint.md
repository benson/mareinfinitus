# Full scene tile checkpoint — 2026-09-04

Benson accepted the Obelisk direction and authorized continuing through the
whole scene without individual monument approval stops. This is the completed
local art pass from f44b428, awaiting visual review. Nothing has been committed,
pushed or deployed. The earlier Obelisk checkpoint records its intermediate state;
its outstanding surface-validation failures are resolved by this pass.

## Art and composition

All six monument builders now assemble explicit placement maps, then antialias
and outline. The maps retain the accepted STANDS positions, dimensions and small
door scale. Their production vocabularies use 19 Obelisk, 14 Sphinx, 11 Jade,
9 Crystal, 11 Palace and 10 canyon tiles. Each monument uses six ramp colors.
Tiles extend the existing material vocabularies with authored edges, courses,
thresholds and landmarks rather than procedural surface noise.

Atmosphere, ridges, canyon, dune bands, rocks, paths, cairns and tents use drawn
tile motifs. Broad atmospheric and valley gradients retain the brief's dither
exception. Monument bases meet the ground through paintSandDrift. Secondary
rock/cairn groups support the wide stretches between primary landmarks.

The existing foreground pilgrims and their pose sheets are retained. Shelf
pilgrims remain 3x7 and use nearby scene colors to fit the shelf palette; ramp
pilgrims remain 12 pixels tall. Sphinx foreground placement flags provide the
actual forepaw occlusion geometry.

## Animation and camera

Six native-pixel parallax bands use factors 0.05, 0.35, 0.7, 0.9, 1.0 and 1.2.
Layer width follows viewport width plus its share of camera travel. Resize crops
or reveals native pixels. Phaser's zoom-origin offset is accounted for in layer
placement, picking, actors and shadows, preserving the accepted camera view.

Fire, sun and tide colors use palette cycling. Monument hover
uses highlightRaster; clicks briefly hold the same steady highlight. Tent
flaps retain small drawn frame changes. Pilgrim shadows follow their depth band.

September 5 lighting correction: removed automatic monument palette cycling.
It swapped two shared stone highlight colors across Jade, Crystal, Obelisk and
Palace, making structural ridges flicker without an emitting source. Monument
surface shading now stays fixed. Future emissive animation needs explicitly
authored glow regions, separate from the stone shading palette.

## Review and validation

The palette report is 50 colors in the composed frame. Layer unions are sky 10,
far 8, shelf 31, floor 15, camp 28 and near 3. Validation checks tile budgets,
palette limits, map dimensions, forbidden procedural material operations,
palette-animation silhouettes, parallax sizing and Sphinx foreground priority.
These checks establish implementation constraints, not visual acceptance.

Run from the repository:

```powershell
npm run build:web
npm test
node scripts/render-relit-studies.mjs
node scripts/render-scene-review.mjs
```

Review artifacts are in the ignored output/time-tombs directory:

- establishing-4x-world.png: complete world at integer 4x.
- establishing-4x-ultrawide.png: accepted ultrawide viewport.
- review/live-ultrawide.png: browser capture with live actors.
- review/*-compare.png: reference, previous and current monuments at native,
  enlarged, grayscale and squint scales.
- review/*-tiles-6x.png: individual production tiles beside native reference crops.
- review/palette-report.json: sprite and layer counts.
- review/pilgrim-poses-4x.png and category-crops-4x.png: supporting visual review.
- before-tiles/: retained native baselines for the comparison renderer.

Browser checks cover monument hover before and after panning, measured parallax,
palette cycling, click response, integer scale on resize and ramp-shadow depth.
The local preview is http://localhost:3187/?scene=time-tombs while its server runs.
