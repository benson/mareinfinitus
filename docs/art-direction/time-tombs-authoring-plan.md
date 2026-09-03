# Time Tombs: procedural authoring plan (replaces the reduction pipeline)

Status: approved proof expanded into the local Phaser scene on 2026-09-02.
All six tombs, terrain/sky layers, camp, instruments, and seven named pilgrims
now use code-authored native rasters in `src/time-tombs/art/`. The proof remains
at `proof/time-tombs/`. Mare Infinitus is out of scope and untouched.
Constraints from Benson: no manual pixel touch-up, no paid generation services. Everything is code.

## Diagnosis of the current pipeline

The retired `scripts/build-time-tombs-world.mjs` was an image-reduction pipeline: illustration → median → Lanczos to 850×480 → nearest-palette quantize → neighborhood cleanup → 3× nearest. It did not establish authored pixel forms:

1. **Pixels are decided by color distance, not form.** Contours, masonry seams, and faces land wherever noise fell. Cleanup then erases pixels by neighborhood statistics with no idea whether a pixel was a contour or noise. This is the "mud."
2. **Double pixelation.** The generated source already has fake pixel texture at a non-grid scale. Resampling it to a different grid produces moiré.
3. **Logical resolution is wrong for the look.** 850×480 is 2.6× Genesis width. A 33-color palette at that density reads as speckle, and a 15×26 pilgrim is 5% of screen height with 8 colors.
4. **The palette has no value structure.** Stone, ground, cloth, and shadow share the same few dark reds.
5. **The sprite sheet is unusable regardless of extraction.** The row-boundary bug is real, but even correctly cut, the ten "walk frames" are near-identical standing poses. There is no animation to recover.
6. **It violates AGENTS.md** ("every visible surface must be pixel-authored, not merely rasterized"). Mare Infinitus obeys this and looks right.

Do not fix extraction or shape-stitching. Delete the reduction path and change the production method.

## The replacement: author every pixel in code

This is the Mare Infinitus method applied to Time Tombs. Every surface is either a text-grid mask with a palette legend, or a construction function (silhouette + material rules + hand-placed features) that emits palette indices into a logical-resolution raster. The runtime scales by an integer. There is no generated image anywhere in the pipeline, so there is nothing to quantize, clean, or extract.

Why this beats generation for this project: coded tombs can be lit by the existing light-field system, distorted by the time tide, and palette-swapped for time of day. Coherence is free because one palette, one lighting rule, and one dither function cover every surface. Hover regions come from sprite alpha, not hand-placed polygons.

### What the proof slice established

`proof/time-tombs/` is a 160×90 logical slice rendered at 4×, 2×, and grayscale, with no Phaser dependency. Rendered headlessly with `node proof/time-tombs/render.mjs <outdir>` for iteration, and live in `index.html`.

| Element | Method | File | Verdict |
|---|---|---|---|
| Palette | 9 material ramps, 27 colors, all on the 3-bit ladder | `palette.js` | Grayscale separation holds: sky light, ridges mid-light, ground mid, structures dark, pilgrim a step above ground |
| Sky | Bayer-dithered gradient, eased toward the horizon; authored sun mask; seeded stars | `scene.js` | Reads as dusk. Bands are mechanical; a cloud-streak layer would help |
| Far ridges | Two layered height functions; left-facing slopes lit | `scene.js` | Reads as distant mountains at first glance |
| Ground | 16×16 sand tiles; dune streaks in bands that continue across tiles; far row lighter | `scene.js` | Reads as a valley floor. Streaks still read as rubble more than dunes; acceptable |
| Path | Light band along a polyline with dithered broken edges | `scene.js` | Good |
| Terrace | Chipped sunlit lip, offset-block cliff face, cast shadow on the lower ground | `scene.js` | Reads as a built retaining wall between plateau and valley |
| Obelisk | Tapered shaft, two faces split off-center, lit edge, faint courses, chips, minute lights, two-step plinth, ground shadow | `buildObelisk()` | Best element in the slice. This is the template for the other tombs |
| Kassad | 12×20 text-grid masks, 4-frame walk (contact, pass, contact, pass) | `kassad.js` | Reads as a person with a facing direction and a real gait. Identity at this size comes from silhouette and color, plus the hover card |
| Instrument | Ported from the compiler unchanged | `buildInstrument()` | Fits the new palette without edits |

Pass criteria from the plan: every element is nameable without being told, the pilgrim reads as a person with a facing direction, stone/sand/cloth separate in grayscale, nothing exists that nobody chose. All four hold.

### Format decisions

- **Logical viewport:** 480×270. World wider (e.g. 720×270) so responsive layouts reveal more or less, per AGENTS.md. Integer display scale only. Remove the 2/3 zoom preset.
- **Palette:** `proof/time-tombs/palette.js` is the starting point. Add ramps as materials appear (crystal, jade, camp fabric, fire) and keep every asset to ≤15 colors + transparent.
- **Pilgrims stay small:** 12×20. The Time Tombs are about monuments against tiny figures. Identity is silhouette plus color code: Sol's cradled bundle, Masteen's hooded robe, Hoyt's collar, Lamia's compact build, Silenus's satyr gait, the Consul's coat. Each character: 4-frame walk, 2-frame idle, one held action. Roughly 50 small masks total.
- **Tombs as construction functions**, each its own sprite at final size: Sphinx ~160×110, Shrike Palace ~110×130, Crystal Monolith ~40×140, Jade Tomb ~120×90, Cave Tombs as a repeating 3-module. Each follows the Obelisk template: silhouette → face split by light direction → material rule (courses, facets, organic cells) → hand-placed features (door, steps, wings, face) → chips on the shadow silhouette → cast shadow.
- **Ground as world-space landforms**, with distinct material regions and quiet areas; see the terrain-region pass below. The proof's stamped 16×16 sand tiles are retired. Terrace and path modules remain from the slice.

## Build order

1. Promote `proof/time-tombs/{palette,raster}.js` to `src/time-tombs/art/` and give the Phaser scene a texture built from a `Raster` (one `Phaser.Textures.Texture` per sprite, integer scale).
2. Sky, ridges, ground tilemap, path, terraces at 720×270.
3. Tombs one at a time, each judged headlessly at 4× before the next. Order by difficulty: Obelisk (done), Crystal Monolith, Cave Tombs, Jade Tomb, Shrike Palace, Sphinx.
4. Pilgrims: Kassad (done), then Masteen, Hoyt, the Consul, Lamia, Silenus, Sol with Rachel. Idle and held actions after all seven walk.
5. Camp props, then wire the actor simulation, alpha hit testing, dust, and time tide back on.
6. Only then remove the old compiler and the plate assets.

## What to remove (at step 6)

- `buildWorld()`, `buildActors()`, `retainOwnedSilhouette`, `removeGroundShadow`, `cleanClusters`, `cleanTransparentFrame`, `limitTransparentFramePalette`, `ACTOR_SOURCE_REPLACEMENTS`.
- `docs/art-direction/time-tombs-phaser-master-v*.png` and the pilgrim atlas sources move to `reference/`; they remain useful as concept art.
- The 2/3 camera zoom preset.

Keep: Phaser scene structure, alpha-aware sprite hit testing, actor simulation, dust and temporal effects, the code-authored instrument builder.

## Local verification

Run `npm run assets:time-tombs` for 4×/grayscale review sheets and the Phaser
bundle, then `npm run assets:stamp` and `npm test`. The native art needs no
network requests. Source paintings are archived under `reference/`.

For browser QA, open `/?scene=time-tombs&debug=1` in a Playwright CLI session,
then run `run-code --filename scripts/qa-time-tombs.cjs`. It checks real
Control-hover, Guide/About, pilgrim clicks, resize continuity, arrow/drag pan,
and click-depth preservation. Screenshots stay in `output/playwright/`.

Following live review, the display scale is fixed at 4×. The original valley
coordinates sit within an extended 1536×1152 world starting at (-384,-384), so
larger windows reveal actual sky and foreground. Drag or arrow keys pan in both
axes; Home returns to the valley. Resize never regenerates an entity or texture.

The first animation polish pass adds full-body, distance-driven walking, three
gesture stages per pilgrim, stationary footfalls, brief sand gusts, wind-driven
tent cloth, and campfire smoke/embers. Generic stippled shadow slabs are replaced
by projections of each tomb’s raster, with direction and length driven by the
same slow sun state used to draw the sun. The initial format/build-order notes
above remain the record of the proof, not a restriction against these extensions.

This is a local full-scene implementation of the approved proof, not a public
deployment or new native screensaver release. Further aesthetic review should
edit the source masks/material rules, never filters over generated paintings.

## Connected life pass

`atmosphere.js` owns one deterministic quiet → forewarning → crossing → settling
time-tide clock. Instrument needles, local lifted dust, footprint impressions,
and pilgrim reactions consume that clock rather than independent random timers.
Keep the phenomenon local and particulate: no broad luminous river or moving
ground texture. Rare distant Shrike silhouettes use bounded appearances and
must lose inspection ownership when hidden.

`simulation.js` adds four paired vignettes with approach, exchange, and release
stages. Locomotion still uses the distance-driven gait, separation and facing
cooldown. A tide or direct character interaction interrupts the shared action;
no competing poses can run together. These are supplemental interpretations,
not canonical dialogue or passages from the book. Keep behavioral internals out
of the field guide.

`art/details.js` adds form-following reliefs, fractures, internal facets and
recesses to the existing monuments. Separate native light masks stay inside the
authored alpha; only the crystal's reflection travels, in small pixel steps.
Tent panels, repairs, bedding, cases and instrument dials use the same material
ramps as the rest of the valley. Props gain the same sun-linked ground projection
as monuments, without changing size or camera behavior.

`audio.ts` owns opt-in, scene-local Web Audio sources. Wind through stone, fire,
and occasional instrument ticks attenuate and pan in world space relative to
the camera. Mute hidden pages and screensavers, start only on a user gesture,
and dispose all nodes/listeners on scene shutdown. Do not modify Mare's audio.

Validation covers the event sequence, all paired actions over ten simulated
minutes, alpha/palette constraints, source-local light masks, world-space audio
attenuation, and real-browser audio toggles, inspection and resize continuity.

The second detail pass adds waypoint-driven camp/instrument errands with held
work poses and an actual return walk. Rest stops wait for these small actions;
the choreography yields to disturbances and direct interaction, and has a hard
timeout. Tent collision uses the ground footprint, not the upright silhouette.
Authored wind-worn stones punctuate foreground depths without changing terrain
texture or pixel scale. Clicking a monument runs a bounded response through its
own light mask, never a generic ring across the whole landscape.

The Shrike's first appearance begins at 42 simulation seconds and lasts 22
seconds; later glimpses are separated by three minutes. Its 19×30 native sprite
has four articulated arms and a clearer cold-metal silhouette. Kassad and Lamia
can notice it. Keep scheduling details here, not in the field-guide description.

## Context passages and material variation

`book-excerpts.js` now contains 29 contextual guide passages plus the welcome
passage, selected directly from the user-supplied four-book EPUB. The guide has
multiple passages where they reveal different details, including the Sphinx's
research equipment and strange interior geometry. All seven pilgrims have their
source introductions. Each passage records the actual novel, chapter, EPUB
document and contiguous paragraph indices. No page numbers are inferred.

`scripts/import-time-tombs-excerpts.ps1 -BookPath <local-epub>` reproduces this
curated collection without extracting or storing the whole book. Preserve
paragraph breaks, spelling and punctuation; only HTML/whitespace is normalized.
Keep later narrative descriptions distinct through their citations, and never
present our supplemental visual notes as quotations. The complete collection
lives in the scrollable guide. If a full primary passage cannot fit in a short
viewport's hover card, that card identifies the subject and points to the guide
instead of cropping the prose.

`art/material-patterns.js` saves a once-generated 768-letter random string.
Repeated-letter runs, mirrored triplets (ABA), and repeated pairs (ABAB) select
small form-following motifs. Runs suggest worn lips; mirrors suggest stepped
fractures or forked ripples; echoes suggest darker replacement blocks or paired
seams. Material labels and indices deterministically sample these patterns.
Masonry courses and block widths, stair wear, bank breaks, tent repairs/stitches
and windstone fractures use them. Broad quiet areas and authored faces, doors,
silhouettes and character identity remain intact. Never sample frame time or
viewport dimensions, and never add an indiscriminate noise layer.

Theo Lane's 58×24 skimmer uses the battered passenger vehicle and gold Hegemony
geodesic described in *Hyperion*, chapter 2, with red hair and horn-rimmed glasses
visible through its canopy. His valley flyby is explicitly supplemental, not a
claim that the quoted scene happened here. `traffic.js` supplies a deterministic
curved route, alternating pass directions with long absences, depth ordering,
and short dust curls released from historical ground positions. Clicking the
craft triggers a six-second held greeting; it cannot flip direction or warp to
the cursor. Rendering, hit masks and all four poses use the native pixel grid.

Review with `node scripts/render-time-tombs-art.mjs patterns` (native, 4× and
grayscale). The browser life check covers all 29 guide passages, skimmer hover
and greeting, the existing encounters/interactions, and resize continuity.

## Terrain-region pass

The first pattern-string pass still filled the desert with near-identical hooked
stamps. Changing a stamp's length/position was insufficient. `art/terrain.js`
replaces that tile loop with a stable world-space composition: smooth unmarked
sand, coherent fields of curving/forking ripples, tapered lee deposits, scoured
ribbons near obstacles, concentrated gravel in several native masks, branching
crust fissures, and layered exposed rock. Ripple fields share local direction
but have different lengths, curvature, spacing and coverage across the valley.
The camp and paths retain breathing room. The four-color sand ramp is unchanged.

Pattern-string sampling now selects bounded variation **within a landform**;
it does not choose one decoration for every tile. The world geometry is authored
once and clipped to the raster, so rendering a smaller crop is identical to
cropping the complete world. No terrain moves with the wind or camera. Existing
live dust and footprints remain independent effects.

`AGENTS.md` records the general region → connected form → detail contract for
future scenes. Tests cover quiet/detailed density contrast, distinct material
families, long connected ripple contours, deterministic palette-constrained
rasters, and exact crop agreement across former tile boundaries. Use the
`terrain` art-review mode for the native, 4× and grayscale region/contact sheets.

## Scene-wide craftsmanship pass

The contour-field approach above was still too schematic. The current ground
uses four native-size landform studies in `art/dunes.js`: a crescent, knife
ridge, double saddle, and small apron. Explicit cross-sections define filled
windward shoulders, cornices, lee faces and buried toes; short slips and scars
sit within that volume. Sheltered drifts now have shoulders as well. Crusted
ground has lifted plates, rock shelves have separate top/front/side planes,
and scoured walking routes retain irregular patches of compacted sand without
becoming bright continuous roads. The fixed palette and quiet areas remain.

The same audit covers the full scene, not just its largest sprites:

| Category | Current authoring decision |
| --- | --- |
| Sky, clouds, ridge, sun, moon | Quiet dusk planes, narrow interlocking transitions, authored ridge profiles and cloud lobes, a filled solar disc and crater clusters. Stars remain sparse native points. |
| Sphinx | Carved feather planes and overlapping coverts, collar, forepaw wear and chipped stair bevels. Retain its established silhouette and face. |
| Shrike Palace | Slatted recesses, fractures, shaded footings and stair planes. Retain stable masonry courses and spires. |
| Crystal Monolith | Broad facets, tapered internal inclusions and controlled glints, not periodic bright bars. |
| Jade Tomb, Obelisk | Rib-wrapped mineral beds and seals; narrow carved inscriptions and restrained base wear. |
| Cave Tombs | Rock-cut portals in three differently shaped outcrops, broad lit/shaded rock planes and short bedding fractures, not repeated brick domes. |
| Camp | Tension folds and fixed repairs; rolled bedding, case bevels, latch and cup handle; recessed instrument dials and articulated tripod collars. |
| Pilgrims | Identity-specific seams, straps, fasteners and bundle folds follow the torso through the existing 75 poses. Keep identity, source-grounded complexion, proportions and distance-driven gait. |
| Encounters | Preserve the already authored four-arm Shrike and skimmer hull/canopy/greeting poses; no gratuitous regeneration or speed changes. |
| Small effects | Four loosening smoke masks, heel-and-toe footprints and compact foot-contact shapes. Sand grains, embers and time-tide grains remain small independent particles rather than scrolling texture. |

`art/shadows.js` owns shadow geometry. Authored grounding bands identify the
physical base, excluding suspended wings. Each column's actual last opaque
pixel inside that band supplies its contact row; never replace those pixels
with a guessed horizontal baseline. The decorative silhouette is closed
independently, and adjacent material stays connected across contact changes.
Enclosed pinholes are filled without closing genuine exterior bays. Textures
include the original sprite height so the body and stairs retain their own
ground contacts, and their allocation remains fixed throughout the sun's orbit.
Inspection continues to use the visible sprite's separate silhouette.

Review commands:

```
node scripts/render-time-tombs-art.mjs terrain
node scripts/render-time-tombs-art.mjs life
node scripts/render-time-tombs-art.mjs pilgrims
node scripts/render-time-tombs-art.mjs craft
```

`craft` produces cross-category materials and three-sun-position shadow contact
sheets at native resolution, 4× and grayscale under the ignored review output.
Scene validation additionally checks filled dune volume, unchanged world-space
crops, fixed allocation, contact rows and absence of shadow pinholes/clipping.
The browser life check covers encounters, hover, contextual actions, the guide
and resize. Passing these tests does not replace visual judgment or imply that
there is no room for another art pass. Mare Infinitus remains outside this work.

Contact regression checks composite the actual sprite and shadow, then require
shadow immediately below every grounded column. Testing only that a shadow
matches its own configured contact rows is insufficient: the old guessed rows
were five pixels too low at some Palace/Jade edges despite passing that test.
Use the `contacts` review mode for close-ups of all six bases and
`scripts/qa-time-tombs-shadows.cjs` for browser snapshots at three sun positions.

## Shared geometry follow-through (2026-09-02)

Time Tombs now carries explicit geometry beside its native rasters in
`src/time-tombs/entities.js`: grounded edge bands, ground footprints, named
height/depth parts, pivots, per-pose feet and attachments. Shadows use those
parts and the actual frame; navigation uses every placed solid's footprint.
Smoke, light, sound and contextual chores derive positions from object anchors.
The simulation owns cloth phase as well as actor poses on one fixed-step clock.

`landforms.js`, `art/dunes.js` and `surface.js` share the terrain profiles.
The surface supplies ground elevation, slope, receiver intersections and
foreground occlusion. This is deliberately an authored 2.5D height field,
not an exact 3D reconstruction from the artwork. Rigid structures have level
foundations; wings/spires/stairs have separately authored depth planes.
All parts retain one guide identity and current visible-pixel inspection.

The corresponding proactive contracts live in AGENTS.md. Regression coverage
is in `scripts/validate-time-tombs-geometry.mjs`, including actual-raster
contacts, relocation, part partition/reprojection, terrain, swept collision,
routing, bounded replay and current-frame shadow consumption. Live QA also
checks part crossings, ground occlusion, frame-cache invalidation and resize.
