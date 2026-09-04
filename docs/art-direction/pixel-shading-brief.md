# Time Tombs: drawing like a Genesis artist (brief for Sol)

Status: 2026-09-04. Composition, scale, placement, world size, sand drift and the
pilgrim rules are settled and wired in. Do not change them. This brief is about
the surfaces: every monument and ground form still looks like filled polygons
with dither on top. This document says exactly how to fix that.

## 0. References first

Benson will put five Sega Genesis screenshots into `docs/art-direction/reference/genesis/`:
`pitfall.png`, `sonic-spinball.png`, `castlevania-bloodlines.png`, `streets-of-rage.png`,
`earthworm-jim.png`. They are 320x224 native, so one reference pixel is one of our
logical pixels. Nothing in this brief is accepted without one of these beside it.

Write `scripts/render-compare.mjs`: given a reference file, a crop rectangle, and one
of our sprites, it saves a sheet with the reference crop on the left and our sprite on
the right, both at 1x, then a second copy at 3x nearest-neighbour, then a grayscale
copy. Every acceptance check in this brief uses that sheet. You do not grade the sheet.
Benson does.

## 1. What the references do that our art does not

Read this list, then look at the five screenshots until you can point to each item.

1. **Volume, not planes.** Every column in Castlevania, pipe in Spinball, trunk in
   Pitfall is a cylinder with five steps across its width: highlight stripe, light, mid,
   core shadow, then a thin reflected light at the far edge. Even flat walls have a
   falloff gradient and a bevel at the corners. Ours: one flat value per face and a
   one-pixel rim.
2. **Full value range with hue rotation.** Earthworm Jim's sun runs white, yellow,
   orange, red, violet, near-black. Pitfall's leaves run pale yellow-green in light to
   deep blue-green in shadow. Highlights are warm and pale; shadows are cool and
   saturated. Ours: four tan steps for sand, four blue-greys for obsidian, nothing
   near white, no hue change.
3. **Drawn shapes, not computed ones.** A leaf cluster is a specific silhouette with
   three values arranged to read as leaves. Ours are sine profiles, dither gradients
   and seeded random streaks: statistically uniform, no decision per pixel.
4. **Dither only in large gradients.** Sky, water, big background fades, at coarse
   regular spacing. Objects are shaded in solid bands. Ours dithers faces, bases,
   shadows and edges, which reads as noise.
5. **Clean, decisive edges.** Crisp silhouettes, often a dark contour against the
   background, curves smoothed with a few hand-placed antialiasing pixels, no orphan
   pixels. Ours chips and dithers edges as "weathering", which reads as jaggies.
6. **Detail concentrated at focal points**, broad and simple elsewhere.

## 2. Palette v2

Replace the material ramps in `src/time-tombs/art/palette.js` with these. Every channel
is still on the 3-bit ladder (0 36 73 109 146 182 219 255). Seven steps each, index 0
is the core shadow, index 6 the highlight. Shadows lean cool, highlights lean warm.
Keep `sky`, `anomaly`, `sun`, `fire`, `skin`, `cloth`, `linen`, `uniform`, `accent` as they are.

```js
sand:     [[36,0,36],[73,36,36],[109,73,36],[146,109,73],[182,146,109],[219,182,146],[255,219,182]],
stone:    [[36,36,36],[73,73,36],[109,109,73],[146,146,109],[182,182,146],[219,219,182],[255,255,219]],
obsidian: [[0,0,36],[36,36,73],[73,73,109],[109,109,146],[146,146,182],[182,182,219],[219,219,255]],
crystal:  [[36,36,109],[73,73,146],[109,109,182],[146,146,219],[182,182,255],[219,219,255],[255,255,255]],
jade:     [[0,36,36],[0,73,36],[36,109,73],[73,146,73],[109,182,109],[182,219,146],[219,255,182]],
ridge:    [[73,36,109],[109,73,146],[146,109,146]]
```

Usage rule per sprite: index 6 on at most 3% of its pixels, indices 0 and 1 on about
25 to 30%, the middle three on the rest. If a sprite uses fewer than five steps of its
ramp, it is not finished.

Pilgrim garments keep their current ramps; the `recolorPilgrim` targets must be
re-pointed at the new indices so their colors do not shift.

## 3. The shading library

Create `src/time-tombs/art/shade.js`. Everything below is normalised: `u` runs -1 to 1
across a form, `t` runs 0 (top) to 1 (base). Light comes from the upper left, matching
the sky. The functions return ramp indices; they never dither.

```js
export const LIGHT = normalize({x: -0.6, y: -0.55, z: 0.58}); // upper-left, in front

// Continuous lighting to a ramp index. Ambient keeps shadows readable; the bounce
// term is the reflected light Genesis artists put on the far edge of every cylinder.
export function shadeIndex(normal, ramp, {ambient = 0.16, bounce = 0.10, gain = 1} = {}) {
  const l = Math.max(0, dot(normal, LIGHT));
  let v = ambient + (1 - ambient) * Math.pow(l, 0.85) * gain;
  if (l < 0.08 && normal.x > 0.7) v += bounce;                 // far edge catches sky
  return ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(v * (ramp.length - 1))))];
}

// Vertical cylinder. Produces highlight stripe, mid, core shadow and reflected edge
// as solid bands. `taper` narrows it toward the top.
export function shadeCylinder(r, x0, y0, w, h, ramp, {taper = 0, falloff = 0.25} = {}) {
  for (let y = y0; y < y0 + h; y++) {
    const t = (y - y0) / h, ww = w * (1 - taper * (1 - t)), xs = x0 + (w - ww) / 2;
    for (let x = Math.round(xs); x < Math.round(xs + ww); x++) {
      const u = ((x - xs + 0.5) / ww) * 2 - 1;
      const n = {x: u, y: 0, z: Math.sqrt(Math.max(0, 1 - u * u))};
      r.set(x, y, shadeIndex(n, ramp, {gain: 1 - falloff * t}));    // darker toward the base
    }
  }
}

// Box with a lit front face, a shadow side face, and 1-px bevels. Faces are not
// flat: gain falls toward the base and away from the lit edge, which quantises into
// two or three solid bands.
export function shadeBox(r, x0, y0, w, h, sideW, ramp, {falloff = 0.3, lateral = 0.15} = {}) {
  for (let y = y0; y < y0 + h; y++) {
    const t = (y - y0) / h;
    for (let x = x0; x < x0 + w; x++) {
      const a = (x - x0) / w;
      r.set(x, y, shadeIndex({x: 0, y: 0, z: 1}, ramp, {gain: (1 - falloff * t) * (1 - lateral * a)}));
    }
    for (let x = x0 + w; x < x0 + w + sideW; x++) r.set(x, y, shadeIndex({x: 1, y: 0, z: 0}, ramp, {gain: 1 - falloff * t}));
  }
  bevel(r, x0, y0, w, h, sideW, ramp);   // lit edges one step up, shadow edges one step down
}

export function shadeSphere(r, cx, cy, rad, ramp)      // domes: Jade
export function shadePyramid(r, x0, y0, w, h, ramp)    // pyramidion, Palace thorns
export function bevel(r, x0, y0, w, h, sideW, ramp)    // 1-px edge lines
export function outline(r, index)                       // dark contour on the silhouette against sky
export function antialias(r)                            // see below
```

**Antialias.** For each pixel P, if its left neighbour and its upper neighbour are the
same color A, P is color B, and A and B belong to the same ramp with an index gap of 2
or more, set P to the ramp entry halfway between them. Repeat for the other three
corner orientations. Run once per sprite, after all drawing. This is the single
pass that turns staircase curves into the smooth Genesis look.

**Falloff quantisation.** Because `shadeIndex` rounds to a ramp index, a gradient
becomes two or three solid bands. That is correct. Do not "improve" it with dither.

**Hard rules for `shade.js` users.**
- No `dither(` inside any `*-relit.js` builder. Add a check to `npm test` that greps for
  it and fails. Dither is allowed only in `stage-study.js` sky, valley floor bands,
  ground shadows and sand drift.
- No `prng` chips or random speck loops inside builders. Weathering is drawn: a
  specific crack mask placed at a specific place.
- Features are text masks via `fromMask` (doors, capitals, the Sphinx crown and
  feather tiers, Palace barbs, cave mouth arches), placed at chosen coordinates.
- Every sprite ends with `antialias(r)` and, where it meets the sky, `outline(r, ramp[0])`.

## 4. Calibration before any tomb

Do this first and get Benson's yes before touching a builder.

1. Crop the Castlevania column (shaft, capital, base) from `castlevania-bloodlines.png`.
2. Draw a column of the same pixel size with `shadeCylinder` for the shaft, `fromMask`
   capital and base, `bevel`, `antialias`. Use the new `stone` ramp.
3. Render the compare sheet. Iterate until Benson cannot tell which is which at 3x.
4. Repeat with a Spinball pipe segment using `obsidian`, and a Pitfall trunk section
   using `sand`.

This is the whole method in a 24x90 sprite. If it does not match here, nothing
downstream will.

## 5. Rebuild order

Same sizes, same `STANDS` placements, same `human` values, same drift. Only the
surfaces change.

1. **Obelisk.** Shaft is `shadeBox` with a narrow side face, pyramidion is
   `shadePyramid`, plinth is two thin `shadeBox` steps, door and cartouche column are
   masks. Render beside the current Obelisk and beside the Castlevania column.
2. **Crystal.** `shadeBox` in `crystal` with `gain` raised on the horizon side; three
   facet planes as long thin masks in indices 5 and 6; roof as a flat plane at index 5.
3. **Jade.** `shadeSphere` squashed to the current profile; strata as bands of index
   shift, not lines; chambers as masks with a lit lower lip; portal mask.
4. **Sphinx.** Chest and body as `shadeBox` pieces, haunch as a partial `shadeSphere`,
   wings as tapered `shadeCylinder` sections, crown tiers as `shadeBox` steps, feather
   tiers and door as masks.
5. **Palace.** Thorns as `shadePyramid`/`shadeCylinder` with heavy `falloff`, gate and
   barbs as masks, no interior texture.
6. **Canyon wall.** Each buttress fold is a `shadeCylinder` slice; ledge and cave
   mouths as masks; strata as two index bands, not lines.
7. **Ground.** Boulders via `shadeSphere` clipped to their profile. Dune crests stay,
   but their streaks are replaced by one drawn streak mask placed by hand per band.

After each rebuild: compare sheet, grayscale, squint, and Benson's yes. Do not start
the next monument on your own judgement.

## 6. What not to do

- Do not add texture to fix flatness. Flatness is fixed by shading, not by seams.
- Do not dither a monument. Ever.
- Do not randomise edges. Weathering is a drawn crack in a chosen place.
- Do not compare a render to the previous render. Compare it to the reference.
- Do not treat a passing QA script as evidence of anything visual.

---

# Part 2 (2026-09-04): build from drawn tiles, not from shaded polygons

Benson's compare sheet (Castlevania Pisa facade beside the shaded Sphinx) shows the
remaining gap. The shading is better. The forms are still six big polygons with
nothing inside them, and every edge is a mathematically straight line or a rasterised
curve. It reads as computed because it is: the unit of the code is the polygon.

Look at the Pisa facade. There is no large shape in it. It is arches, columns,
cornices and balusters, each 8 to 16 pixels, drawn once and repeated with small
variations. The building's big form is only implied by the aggregate of small drawn
things. The Genesis hardware forced this: backgrounds were 8x8 tiles on a tilemap,
and the facade is perhaps twenty unique tiles. That constraint is why the art looks
the way it does. We have been copying the output while ignoring the method.

## The rule

**A monument is a tile vocabulary plus a map.** Nothing larger than a tile is ever
filled by a function. `shape()` with a material function is no longer allowed inside
a `*-relit.js` builder. `shade.js` from Part 1 is used only to author tiles, never to
fill a region.

## What a tile vocabulary is

For each monument, 15 to 30 unique 16x16 tiles (some 16x24 or 16x8) drawn as text
masks with a legend into the material's seven-step ramp. A minimum set for a stone
monument:

- ashlar block course, three variants (different joint positions, one chip, one worn face)
- cornice with a shadow under it
- plinth course
- corner (lit edge) and corner (shadow edge)
- arched doorway, 16x24
- window or aperture, 16x16
- roof edge or parapet
- one or two ornament tiles specific to the monument (cartouche column for the Obelisk,
  feather tier for the Sphinx, thorn tip for the Palace, chamber ring for the Jade)
- silhouette edge tiles: the tiles that touch sky must carry the silhouette in their
  own pixels, drawn (a stepped cornice, a broken parapet), not a polygon cut

Lighting is done by **ramp shift per map cell**, exactly as Genesis palette-swapped
tile variants across a facade: a lit face uses the tile at shift 0, a shadow face at
shift -2, the top plane at shift +1, a base in occlusion at shift -1. The same tile
serves every face.

## Example vocabulary (rendered in `output/time-tombs/tiles-demo-6x.png`)

Legend for the `stone` ramp: `#` 0, `=` 1, `-` 2, `.` 3, `+` 4, `*` 5.

Ashlar block, two courses, offset joints, lit edge left, shadow edge right, one chip:

```
+++++++=++++++++
+.....-=+......-
+.....-=+......-
+....--=+......-
+.....-=+......-
+.....-=+..-...-
-------=--------
================
++++=+++++++=+++
+..-=+.....-=+.-
+..-=+.....-=+.-
+..-=+..--.-=+.-
+..-=+.....-=+.-
-..-=+.....-=+.-
----=-------=---
================
```

Cornice with dentils and the shadow it casts:

```
****************
++++++++++++++++
+.+.+.+.+.+.+.+.
................
--=---=---=---=-
################
=======#========
-------=--------
```

Arched doorway, 16x24, cut into the block wall with a lit reveal:

```
+++++++=++++++++
+....+*+*+.....-
+...+*#####*...-
+..+*#######*..-
+..*#########..-
---*#########---
===*#########===
+++*#########+++
+..*#########..-
+..*#########..-
+..*#########..-
+..*#########..-
-..*#########..-
---*#########---
===*#########===
++++#########+++
+..*#########..-
+..*#########..-
+..*#########..-
+..*#########..-
-..*#########..-
---*#########---
=======#========
################
```

Assembled as a 6x3 map with a cornice row, the arch in the lit face, and the two
right-hand columns at shift -2, this already reads as drawn masonry. Its one flaw is
the chip repeating on every block tile, which is why every course tile needs three
variants chosen by the map, never by random.

## Rules for drawing a tile

- Draw it at 1x in a text mask. Look at it at 6x beside a reference tile of the same
  kind cropped from the Genesis screenshots. Iterate until it belongs in that set.
- No straight run of one color longer than one block. Every edge changes at least
  every 8 pixels.
- Curves use even stair steps: run lengths like 3,2,1,1,2,3, never 4,1,3,1. Draw
  them by hand in the mask; do not rasterise a circle.
- Lit edge is one step up on the left and top of a form, shadow edge one step down on
  the right and bottom, mortar is two steps down. Highlight (index 5 or 6) only on
  a crest, a lip, or a dentil.
- No orphan pixels. A color appears in clusters of two or more.
- Variants differ in joints, chips and wear, not in style.
- Tiles that touch sky end in a drawn silhouette, with the sky color transparent.

## How a monument is built now

1. Design the vocabulary for that monument on paper first: list the tiles.
2. Draw them as masks in `src/time-tombs/art/tiles/<monument>.js`, exporting a map
   from name to `fromMask` raster.
3. Write the map: a 2D array of `[tileName, shift]` per 16px cell, plus a list of
   larger placed features (the doorway, the crown) with coordinates. The map is
   hand-written; it is where the composition decisions live.
4. `buildX()` becomes: assemble map → blit placed features → `antialias` → `outline`
   against sky. No `shape()`, no `dither()`, no `prng()`.
5. Compare sheet: the assembled monument beside the nearest reference at 1x and 3x.
   Benson judges.

## Order

1. Tile the Obelisk (smallest vocabulary: shaft course x3, cartouche, pyramidion cap
   tiles, plinth, door). Compare beside the Castlevania tower and the current Obelisk.
2. Sphinx (ashlar set, cornice, crown tiers as stepped tiles, feather tiers, paw toe
   tiles, door with stair).
3. Jade (mineral bed set, chamber ring 16x16, crest shard tiles, portal).
4. Crystal (facet plane tiles at four brightness shifts, roof edge, base seat).
5. Palace (thorn tip, thorn shaft, barb, parapet, gate; the mass is a map of shaft
   tiles at shift -2 and -3).
6. Canyon wall (buttress lit/shadow strip tiles, ledge, strata, cave mouth 16x24,
   talus).
7. Ground boulders as 3 to 5 drawn boulder sprites, placed, not generated.

Stop after each monument for Benson's yes. Do not start the next on your own.

## Worked vocabularies (2026-09-04)

Six tile vocabularies now exist in `src/time-tombs/art/tiles/`, with an assembler and
a review-sheet script. These are the examples to copy from, and the tiles themselves
are usable as-is.

```bash
node scripts/render-tile-examples.mjs
```

writes `output/time-tombs/tiles/<material>-6x.png` (tile strip on top, assembled demo
below) and `all-3x.png` with every sheet stacked.

| Module | Ramp | Tiles | Demo |
|---|---|---|---|
| `stone.js` | stone | blockA/B/C, cornice, plinth, cornerLit, cornerShadow, arch 16x24, window, parapet (silhouette), stair | 96x64 wall: parapet, cornice, two courses, plinth, window, arch, stair; shadow face by shift -2 |
| `obsidian.js` | obsidian | shaftL, shaftR, cartouche, capL, capR, plinth, door | 32x104 obelisk: cap, five shaft rows, cartouche, door, plinth; lit column shift -1, shadow column shift -3 |
| `jade.js` | jade | bedA, bedB, ring, shard (silhouette), portal | 64x56: shard crest, two bed rows, two chambers, portal |
| `wall.js` | sand | rimEdge A/B/C (silhouette), buttressLit, buttressShadow, ledge, mouth 16x24, talus | 96x64 cliff with irregular buttress rhythm, ledge, a cave mouth, talus |
| `thorn.js` | obsidian | tip 16x24 (silhouette), shaft, barbL, barbR, parapet (silhouette), gate 16x24 | 64x88: three thorns, barbs, serrated parapet, pointed gate; body at shift -3, tips at -2 |
| `crystal.js` | crystal | faceA, faceB, faceLit, roof, seat | 48x72: bright roof, lit edge column, two mid columns, shadow column at -3, seat |

`assemble.js` provides `tile(rows)`, `stamp(r, tile, x, y, ramp, shift)`,
`assemble(placements, vocab, ramp, w, h)`, `course(...)` for cycling variants, and
`sheet(...)` for review images. The legend is ramp steps, not colors:
`' '` transparent, `#` 0, `=` 1, `-` 2, `.` 3, `+` 4, `*` 5, `@` 6.

What to notice in the demos, because it is the whole method:
- The stone wall has no fill anywhere. Every block, dentil, merlon and step is a
  drawn pixel. The shadow face is the same tiles two steps darker.
- Nothing repeats side by side. Course tiles come in three variants and the map
  chooses them; the canyon rim uses three edge tiles in an irregular order and an
  irregular lit/shadow rhythm. The first draft of the rim used one tile six times and
  read as castle battlements. That is the failure to watch for.
- Silhouettes are in the tiles. The parapet, the shards, the thorn tips and the rim
  carry their own sky-facing edge; nothing is cut by a polygon afterwards.
- Curves are drawn: the chamber ring is a real pixel circle, the arch is stepped by
  hand, the thorn tip bends by changing its step run.
- The crystal's inclusions wander and break, with a spark where two meet. The first
  draft was a regular staircase diagonal and read as computed; the second draft of
  the flat inclusion read as a bird. Look at the tile at 6x before you trust it.

Building a monument from here: write `tiles/<monument>.js` if a vocabulary is missing,
write its map as a placement list in the builder, assemble, `antialias`, `outline`
against sky, sand drift as before. Compare sheet beside the reference. Benson judges.

---

# Part 3 (2026-09-04): build the world the way the hardware did

The tile method is not a style choice. It is how a Genesis background was physically
constructed, and the rest of the era's look follows from the same constraints. Adopt
the constraints, not just the tiles.

## How a Genesis background was built

- Everything was 8x8 tiles on two scrolling planes, referencing a tile library in
  64 KB of VRAM (about 1,500 tiles for everything on screen, sprites included).
  Artists built 16x16 or 32x32 blocks from tiles and larger chunks from blocks;
  level designers laid chunks on a map.
- Every tile carried a palette line (one of four lines of 15 colors plus
  transparent), a horizontal flip, a vertical flip, and a priority bit. A shadow face
  was the same tile pointed at a darker line. A mirrored variant was free.
- Scrolling was per scanline, so one plane could be split into horizontal bands that
  scroll at different speeds. Backgrounds were designed as stacked layers because of
  this. Depth came from the layers moving differently.
- Animation was tile swapping and palette cycling. No scaling, rotation or alpha.
- Sprites were at most 32x32 each, eighty on screen, twenty per scanline.
- Screens were 320x224. Detail density was designed for that frame.

## What we adopt

### Layers with parallax (the largest remaining depth gain)
Split `composeEstablishing` into bands, each its own raster and its own Phaser layer
with a scroll factor:

| Layer | Contents | Scroll factor |
|---|---|---|
| sky | gradient, stars, clouds, sun, moon | 0.05 |
| far | mesas, canyon wall with cave mouths | 0.35 |
| shelf | the six monuments, their shadows, drift, gravel, windstones, cairns | 0.7 |
| floor | valley floor bands, paths, wash, terrace, outcrops | 0.9 |
| camp | tents, fire, gear, 20 px pilgrims | 1.0 |
| near | foreground ledges | 1.2 |

A layer with factor f needs width `viewport + (world - viewport) * f`; slower layers
are narrower. Nothing is resampled; the factor only changes how far a layer moves.
`STANDS` bases already sit at the right depths for this split.

### Maps are data
A monument is `tiles/<material>.js` (vocabulary) plus a placement list. Move each
placement list into `src/time-tombs/art/maps/<monument>.js`, exporting an array of
`{name, x, y, shift, flipX, flipY}`. Builders shrink to `assemble(map, vocab, ramp)`
followed by `antialias` and `outline`. `assemble.js` already supports flips.

### Palette lines as a discipline
Not a hard hardware cap, but a rule that produces the unified look:
- a sprite uses at most 15 colors;
- a layer uses at most 31 (two lines);
- the whole frame uses at most 61 plus transparent (four lines).
Sky and far share a line. Each monument's tiles use only its own 7-step ramp plus two
accent colors (anomaly light, sand at the seat). Actors keep their line. Add a check
that counts colors per sprite and per layer in the compare-sheet script.

### Flip before drawing a variant
`stamp` and `assemble` take `flipX`/`flipY`. Use a mirrored tile for the opposite
face of a symmetric feature before drawing a new one. Half the variant work
disappears. Course tiles still need three drawn variants; flips are in addition.

### Palette cycling for everything that glows or moves in place
`cycleFrames(raster, [indices], frames)` in `assemble.js` returns frames with the
given ramp indices rotated. Use it for the Crystal's inner light, the campfire, the
Obelisk's minute lights, the time-tide shimmer. Do not draw animation frames for
glow. The Phaser side swaps textures per frame, which is what tile swapping was.

### Hover is a palette-line swap
`highlightRaster(raster, [ramps])` returns the same tiles one step brighter. Use
that for monument hover instead of an outline or glow. It is how a Genesis game
flashed a background object.

### A focal point every 320 pixels
The ultrawide window shows about three Genesis screens side by side, which is why the
valley can feel sparse. Rule: every 320-wide stretch of the 1120 world has one
primary focal point and one secondary. Current: 0-320 Sphinx and camp; 320-640 Jade
and Obelisk; 640-960 Crystal and cave mouths; 960-1120 Palace. Add secondaries where
a stretch has only one: a ruin, a windstone group, a cairn field, a collapsed terrace.
Do this with tiles, not with ground noise.

### Tile budget
Aim for at most 30 unique tiles per monument and 12 per ground material, and reach for
shift and flip before drawing a new tile. Reuse is not a limitation to work around;
it is where the coherence comes from.

### Priority
Pilgrims must be able to pass behind a column, an arch jamb or a windstone. Give the
shelf layer a "front" sub-layer for the few tiles that should occlude actors, or use
Phaser depth per placement. This is the era's priority bit.

## Where we deliberately differ

- More tile budget than a cartridge: thirty unique tiles where they had ten. Use it
  for variants, not for bigger shapes.
- A 1120-wide world with an 860 window. No Genesis game framed that wide, hence the
  focal-point rule above.
- Integer scale to a 1440-tall display. Our pixels are larger on the wall than theirs
  ever were, so each tile is judged more harshly. Look at 6x before trusting one.
- Sky gradients: the era used both per-scanline color changes and dithered tiles.
  Ours stays dithered tiles. It is the one place dither is correct on this project.
