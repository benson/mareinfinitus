# Porcelain Dawn — native translation, 2026-09-05

Local preview: `/?scene=time-tombs&art=porcelain`. The existing Time Tombs view
remains available without the `art` parameter. Nothing was committed or deployed.

The reference is
`reference/scene-studies/seeded-four/01-porcelain-dawn-v3.png`.
The first native translation is saved alongside it as `porcelain-native-v1.png`.
The generated reference is never loaded by the scene renderer.

## Composition and construction

The 960 × 360 native world contains a central 720 × 360 composition and authored
side terrain. The pale crystal mass and distant Palace occupy the upper left;
three warm cave openings cross the upper valley; the Obelisk, Jade and Sphinx
stand on the valley floor. The Sphinx is separate from the camp. The camp's
**back** rim has a cool lee and a continuous pale lip behind the pilgrims' heads.

All new terrain, architecture and fabric are text-mask vocabularies with placement
maps in `src/time-tombs/porcelain/`. The six monuments use 4–9 unique tiles and
5–6 palette colors each. The static composition uses 49 colors. Broad top planes,
fractured faces, connected deposits and quiet floor areas use distinct placements.
The original pilgrims' identity and complete pose sheets are retained. A new
large canvas pavilion extends the camp vocabulary.

Six background parallax factors are .05, .35, .7, .9, 1 and 1.2. Walking routes
and actors share continuous factors at the camp descent. The integer display
scale is chosen at mount; resizing preserves it. Explicit wheel zoom selects
1×, 2× or 4×. Click a pilgrim for a held response, click a monument for a steady
palette response, or hold Control to inspect. The existing Guide and shell remain.

The simulation uses one fixed 60 Hz clock. All seven pilgrims have held role
actions and complete camp cycles; Lamia and Kassad make repeated valley trips.
Footprints persist at their historical positions. The tide interrupts actions;
fabric, fire, smoke and dust use the same clock. Foundation footprints and swept
segments constrain travel. Monument shadow contact bands are separate from
inspection silhouettes and follow the grounded raster edge.

## Review and validation

`npm run art:porcelain` renders native, 4×, grayscale, a reference comparison,
material crops, full pilgrim pose sheets, and tile comparisons beside Genesis
crops into the narrowly ignored `output/time-tombs/porcelain/` directory.

Reviewed the full composition and grayscale, architecture, geology, camp rim,
fabric, props, people, atmosphere and pose continuity. Retained the restrained
dawn palette, the quiet mineral planes and the established character art.
This is a first native interpretation for Benson's visual review, not an
assertion that tests establish aesthetic acceptance. The terraces and mineral
facets remain more visibly modular than the painterly reference.

`npm test` passes, including `validate-porcelain.mjs`: native bounds and tile
budgets, palette limits, hover silhouettes, current-raster shadow contacts under
three light directions, grounded poses, swept movement, seven complete cycles,
repeated valley excursions and identical 30/120 Hz replay.

Real-browser QA passed: Crystal hover, monument and pilgrim clicks, resize with
unchanged pixels and actors, drag parallax at three subject depths, explicit 4×
zoom, Guide open/close, and two valley-depth actors after advancing the simulation.
No browser page errors occurred. The preview currently omits the old scene's
audio and incidental encounters; it is an art iteration, not the release default.

## Perspective revision — 2026-09-05

Benson found that the first translation lost the reference's depth and asked
for a fix. The native resolution is unchanged. Saved this revision as
`reference/scene-studies/seeded-four/porcelain-native-v2.png`; v1 remains intact.

Replaced jittered horizontal ledges with named landforms whose authored
cross-sections share a back edge, front lip and foot. Wide top surfaces recede
obliquely; the foreground west shoulder descends into the frame and continues
below it. The camp has an oblique left boundary and a visible return face.
Distant shelves use 4px modules and 2px courses, a compressed atmospheric ramp,
and overlapping short forms. Middle and foreground forms have stronger values.

Crystal now has a visible roof and a side whose base recedes upward. Its shadow
contact bands and sand deposits follow that new base. Jade's rear base recedes;
the Sphinx has broader front courses, a lit top and a separate dark return plane.
Deposits follow current contact rows instead of a common horizontal baseline.
The full static frame uses 54 colors. Characters and their native resolution,
identity art, schedules and paths were deliberately retained.

Reviewed native, 4x, grayscale and category/tile comparisons. The perspective
before/after is `output/time-tombs/porcelain/depth-before-after.png`. Terrain now
establishes overlap and near/far separation before its surface accents. The
translation remains a deliberately chunky interpretation of the reference.

Validation: scene suite and TypeScript pass; the focused porcelain checks also
verify that authored walking corridors do not cross visible cliff returns.
Browser QA verified both Crystal's roof and side resolve to the same inspection
identity, a click responds, resize preserves 4x and all actors, and two pilgrims
continue their valley excursion. No page errors. Build and local preview updated;
no commit, push or deployment.
