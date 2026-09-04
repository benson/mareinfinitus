# Time Tombs art review, 2026-09-02

Reviewed: the live scene at `?scene=time-tombs`, `output/time-tombs/monument-valley-native.png`, `monument-lineup-native.png`, `pilgrims.png`, and `src/time-tombs/art/tombs.js`.

Verdict: the method is right and the craft is far ahead of the reduction pipeline. Two things stop it from looking like a finished 16-bit scene. One is a staging decision (literal scale), the other is a drawing habit (texture everywhere, no value masses). Fix those two before touching anything else.

## 1. Literal scale has destroyed the picture

`time-tombs-monument-scale.md` sets ten world pixels per metre and sizes the Crystal at 220×780 and the Sphinx at 480×380 against a 20 px pilgrim. The world is 3328×1792 logical at 4× display. The default camera therefore shows a wall of bricks: at 1080p the viewport is 480×270 logical, so it frames one corner of the Sphinx and a tent. That is what the live scene looks like right now.

Pixel art has never been metric. Genesis games conveyed enormous scale with stage-set proportions plus scale cues: a tiny doorway, a staircase with 2 px risers, a figure at the base. The book's numbers are the wrong constraint. A screensaver diorama needs its establishing shot to be the default view, with the whole valley reachable in two or three slow pans.

Recommendation:
- Viewport 640×360 logical at 3× on 1080p (2× on smaller screens). World about 1600×500.
- Tallest monument (Crystal) at most 0.75 of viewport height, around 260 px. Sphinx around 180×130. Obelisk around 30×220. Palace around 200×240 but pushed far back. Jade around 150×110. Caves as a low band.
- Keep pilgrims at 20 px. Accept that a 20 m Crystal reads as 50 m because of the doorway and stairs beside it. That is how the medium works.
- Default camera is the establishing shot. Wheel zoom stays for inspection.

Everything below assumes this change. Redrawing at these sizes is cheap because the builders are procedural.

## 2. Texture everywhere, no value masses

Every tomb face is a single procedural brick pattern (`stone()` in `tombs.js`) filled edge to edge at one flat value, then the faces are joined with the same 1:2 cabinet recession. The result reads as a posterized CAD model with wallpaper, not as a lit stone monument. Under `AGENTS.md` this fails "texture must follow form": the courses do not respond to light, height, weather, or distance from the ground.

Pixel art reads in this order: big light/dark masses, then silhouette and rim, then sparse texture. Texture lives in the light. Shadow faces are nearly flat.

Recommendation, per tomb, in order:
1. **Mass shading.** Lit face two ramp steps above shadow face. Top plane brightest. A vertical gradient by ordered dither so every face darkens toward its base (dust, occlusion). This alone will change the whole scene.
2. **Rim.** One-pixel highlight along the lit silhouette edge and along the top edge. One-pixel dark line along the shadow silhouette.
3. **Sparse courses.** Replace the full brick grid with broken horizontal seam lines every N rows, chipped, present only in the lit face mid-band. Vertical joints only near edges and corners. Shadow faces: no courses, at most a few deposits on ledges.
4. **Ground contact.** Rubble and a darker dither band at every base. Cast shadow to the right, dithered, tapering.
5. **Weathering follows form.** Chips on the shadow silhouette, deposits on horizontals, streaks under ledges. Nothing uniformly distributed.

A measurable check to add to the review sheets: for each tomb, mean luminance of the lit face minus the shadow face must be at least two ramp steps; the fraction of non-base-color pixels on shadow faces must be under 10%.

## 3. Lighting and palette do not agree with the sky

The sky says dusk, with a warm horizon glow and an eclipsed sun. The monuments are lit at full value from the front-left as if at noon. The Crystal is a saturated lavender block at the brightest value in the scene, larger than the sky band. The Jade is a bright green dome. Nothing recedes.

The classic 16-bit dusk look (Shinobi III, Streets of Rage 2, Comix Zone) is dark foreground masses against a gradient sky, with warm rim light on the side toward the horizon and cool violet in shadow.

Recommendation:
- Monuments mostly in shadow ramps, rim-lit warm on the horizon side.
- Crystal: dark translucent body (two obsidian-blue values) with a few bright internal facet lines and a faint glow at the top. It should be the coolest object, not the brightest.
- Jade: dark mineral green with lighter beds, plus the circular chambers the text describes as dark apertures.
- Atmospheric perspective by palette substitution for every monument, not just Palace and Caves: far objects lose one ramp step of contrast and shift toward the sky ramp.
- The brightest warm pixels in the scene should be the horizon glow and the camp fire. Nothing else competes.

## 4. Individual monuments

- **Shrike Palace** is a grey castle with pointed towers. The text says barbed, serrated, black, "less constructed than grown." Redesign as a cluster of thorn silhouettes in obsidian against the horizon glow. Silhouette does the work; almost no interior texture.
- **Sphinx** is a round head with wings on a brick body. The source says neither human nor lion, heavy block construction, curving appendages. Make it a low heavy mass with two swept wing masses, one small doorway with stairs under the breast for scale. Drop the circular head.
- **Crystal** is a flat lavender box. See lighting above. It needs facets, not a gradient side.
- **Jade** reads as a tent or Quonset hut. Reduce the brightness, add the circular apertures, break the smooth arc with mineral beds.
- **Caves** read as a cardboard cutout with three doors. Embed the mouths in a canyon wall that continues past the sprite edges, with rubble aprons.
- **Obelisk** is the best of the six and closest to the proof template. Its cartouche bands are a good example of sparse detail in the light.

## 5. Ground and sky

Ground is a single flat brown plane with identical rock outlines scattered uniformly. That is the "statistically uniform speckle" AGENTS.md forbids, just at a larger size.

- Three or four value bands from horizon to foreground, dithered transitions.
- Dune streak bands that continue across the scene, as in the proof slice.
- A path network of lighter sand connecting the camp to each tomb. Rubble concentrates at tomb feet and path edges, not everywhere.
- Terraces where the valley steps down, using the proof's terrace module.

Sky is 40% of the frame and empty apart from the dither bands. Add two or three horizontal cloud-streak layers in the sky ramp, the moon and eclipsed sun with corona, stars only in the top dark band.

## 6. Pilgrims

The walks work. The sheet has three problems:
- **Noise.** Isolated single pixels of skin or highlight inside bodies. Rule: no color appears as a lone pixel inside a sprite; minimum cluster is two.
- **Weak color code.** Four of seven pilgrims wear the same blue. Identity at 20 px is one strong color per character: Kassad near-black FORCE uniform, Hoyt black cassock with a white collar, Masteen green Templar robe with hood, Silenus purple, the Consul pale grey coat, Lamia dark red, Sol tan with the bundle. Skin tones stay source-grounded.
- **Idle poses** read as blobs. An idle needs a readable silhouette change: weight shift, head turn, arm fold.

## 7. Process

The QA scripts check geometry, camera, and thresholds. Those are useful but they are not evidence of visual quality, which is the mistake from the reduction era repeated. Make the acceptance artifact one composite of the establishing shot at display scale, plus its grayscale, plus a squint version downscaled to one eighth. If the squint version does not show distinct dark monument masses against a light sky over a banded ground, the frame is not done regardless of what the scripts say.

## Order of work

1. Rescale the world and monuments (section 1). Set the default camera to the establishing shot.
2. Mass shading, rim, and sparse courses on the Obelisk first, as the template, then the other five (section 2).
3. Dusk lighting and palette substitution (section 3).
4. Ground bands, path, sky clouds (section 5).
5. Redesign Palace, Sphinx, Crystal (section 4).
6. Pilgrim cleanup and color code (section 6).

## Worked example: the Obelisk relit

Files:
- `src/time-tombs/art/obelisk-relit.js`: `buildObeliskRelit({width, height, seed})`, size-agnostic, not wired into the scene.
- `scripts/render-obelisk-relit.mjs`: writes `output/time-tombs/obelisk-relit-{native,gray,squint,stage-3x,stage-gray}.png`.

`obelisk-relit-native.png` puts the current `buildObelisk()` (left) next to the relit builder at the same 112×560 (right), each with the same 20 px pilgrim. `obelisk-relit-stage-3x.png` is the same builder at 42×240, the recommended stage scale, at 3× with two pilgrims for scale.

What the relit builder does, in the order it does it:

1. **Masses.** Front face `obsidian[2]`, side face `obsidian[1]`, pyramidion lit slope `obsidian[3]`. Both faces darken toward the base by ordered dither (starting at 60% of the height, never exceeding 75% coverage). The top 12% of the lit face lifts one step toward the sky.
2. **Rim.** One `obsidian[3]` column down the lit silhouette, chipped about 8% of the time. The front/side corner is `obsidian[1]` above the midpoint and `obsidian[0]` below. The shadow silhouette is `obsidian[0]`.
3. **Sparse texture in the light only.** Seams appear on roughly two thirds of the courses, only between 15% and 72% of the height, and each is a partial line anchored to one edge covering 35 to 75% of the face width with a one or two pixel gap. A short vertical joint drops from the anchored end on some courses. The shadow face carries no texture except four minute lights.
4. **Weathering follows form.** Four two-pixel chips on the shadow silhouette. Deposits along the pyramidion ledge.
5. **Ground contact.** A pilgrim-tall doorway with a two-row lintel and a lit jamb so it survives the base darkening. Two plinth steps with lit tops and dark risers. Rubble at the foot, denser on the shadow side.

What was removed relative to `buildObelisk()`: the full-face brick pattern, the stair module, and the portal helper. The brick pattern is the important removal. Everything else can come back if it obeys the order above.

Apply the same sequence to the other five. The Sphinx and Palace also need silhouette redesigns first (section 4), but their shading follows the identical recipe.

## Worked examples, complete set

All six tombs, the ground, the sky, the pilgrim color code, and an establishing
shot now exist at stage scale as code, none of it wired into the scene:

- `src/time-tombs/art/obelisk-relit.js`, `crystal-relit.js`, `palace-relit.js`, `sphinx-relit.js`, `jade-relit.js`, `caves-relit.js`: one builder each, `build<Name>Relit({width, height, seed})`.
- `src/time-tombs/art/stage-study.js`: `buildSkyStudy`, `paintRidges`, `paintGroundBands`, `paintTerrace`, `paintOutcrop`, `paintGravel`, `paintCairn`, `paintForegroundLedge`, `paintPath`, `paintRubble`, `paintGroundShadow`, `recolorPilgrim`/`PILGRIMS_RECOLORED`, `STANDS` (monument placements), and `composeEstablishing(time)` which assembles the 860×360 world in book order (Sphinx, Jade, Obelisk, Crystal, Caves wall, Palace) with terraces, windstones, the camp, seven pilgrims and foreground ledges. `output/time-tombs/establishing-4x-world.png` is the whole world at 4×; `establishing-4x-ultrawide.png` is the 3440×1440 window at offset 140.
- `scripts/render-relit-studies.mjs` writes `output/time-tombs/`: `<tomb>-relit-{3x,gray,squint}.png`, `pilgrims-colorcode-{4x,gray}.png`, `establishing-{3x,native,gray,squint}.png`.

```bash
node scripts/render-relit-studies.mjs
```

What each demonstrates:

| Study | Review section | The one idea |
|---|---|---|
| `establishing-3x` | 1, 3, 7 | Stage scale with the whole valley in one 720-wide frame; the squint shows dark masses over banded ground under a light sky |
| `palace-relit` | 2, 4 | Silhouette does the work: three obsidian values, rim on the horizon side, one gate, thorns and barbs, no interior texture |
| `crystal-relit` | 3, 4 | Dark translucent body in the two lowest crystal values, a narrow lit band, a bright flat roof, three long facets. The coolest object, not the brightest |
| `sphinx-relit` | 2, 4 | Block body with a stepped crown instead of a face, two swept appendages behind and over the body, pilgrim-tall door with a stair. The weakest of the six and the one that needs the most iteration |
| `jade-relit` | 3, 4 | Dark mineral with beds that follow the curve, circular apertures with a lit lower lip, a portal |
| `canyon-wall` (`buildCanyonWall` in `caves-relit.js`) | 4, 5 | The Cave Tombs ARE the canyon's back wall: one 860-wide sprite, absent at the valley mouth, rising toward the Palace with irregular buttress folds, a ledge, pinnacles, and mouths cut into foot and ledge. Distant mesas show where the wall is low |
| `stage-study.js` valley floor (`paintValleyFloor`, `paintWash`) | 5 | The floor is stacked dune ridges, far to near, each crest lit and each foot in the shadow of the next; crests run slightly diagonal. A dry wash with a lit far bank and shadowed near bank adds a second depth cue |
| `stage-study.js` camp and sky props (`paintMoon`, `paintFireRing`, `paintWindbreak`, `paintFootprints`) | 5 | A moon large enough to read, placed in the dark sky band; a camp with three tents, a windbreak, gear, a ringed fire, trampled ground and footprint trails |
| `stage-study.js` ground props | 5 | Terrace with collapsed stretches, plateau-topped boulders, gravel fields at monument feet, cairns on paths, windstones, foreground rock shelves in the bottom corners |
| `stage-study.js` sky | 5 | Eased gradient, cloud streaks one step lighter above and darker below, stars only in the top band |
| `pilgrims-colorcode` | 6 | Same frames, garment ramps remapped so each of the seven reads as one color. Hoyt gains a white collar |

Every builder follows the same order: masses, rim, sparse texture in the light, weathering that follows form, ground contact.

Two rules added after Benson's review of the first full frame:

- **Scale lives in the door, not the mass, and the doors are small.** The text is explicit: pilgrims near the Sphinx are "dwarfed by distance, small sticks of color amid the boulders and dunes"; the Monolith is shot from "at least thirty meters up on the sheer face"; the Obelisk's shadow is "thrown high on the cliff wall"; the Sphinx "rises above" Brawne from ten meters. Every builder takes `human`, the height of a person at that monument's depth, and derives doors, gates, steps, plinth risers, apertures and cave mouths from it. `STANDS` sets it: 7 for the Sphinx and Obelisk, 6 for the Jade, 5 for the Palace and the canyon wall. The tombs are therefore thirty to forty people tall. **Runtime consequence:** pilgrims need three sprite sizes selected by ground band: 20 px in the foreground camp band, 12 px on the ramp, and the 3×7 `tinyPilgrim` specks on the tomb shelf. A 20 px actor must never stand beside a tomb.
- **Nothing meets the ground in a straight line.** Builders no longer draw full-width foundation rows. `paintSandDrift` runs after each monument is placed and buries its foot unevenly, deeper on the lee side, lapping over the sprite's lowest rows. The cast shadow, rubble and gravel passes stay.

### On isometric

Benson asked whether an isometric projection would solve the depth problems. No. Isometric removes the horizon and the sky, which are where the monument silhouettes live, and multiplies pilgrim work by four to eight directions. The depth problems were landform problems: a flat floor and a wall dropped onto it as a sprite. They are solved by stacked occluding terrain bands and a real back wall, which is what Genesis backgrounds did.

## Wiring it in

The art is done as far as a study can take it. Remaining work is mechanical:

1. `space.js`: WORLD becomes 1120×360 logical. `displayScale` 4 on the 3440×1440 ultrawide (an 860×360 window that pans slowly along the valley), 3 at 1080p (640×360 window), 2 below. Remove the 2/3 preset. The tombs are spaced as the text has them: half a kilometre of valley between the Sphinx and the Monolith, the Palace a kilometre farther at the far end.
2. `entities.js`: replace the six monument `define()` sizes, pivots, hit polygons and planes with the relit builders' sizes and the placements from `composeEstablishing` (`stands` array). Camp and pilgrim placements likewise.
3. `tombs.js`: `TOMB_BUILDERS` points at the relit builders. Delete `stone()`, `volume()`, `portal()` and the old bodies once nothing imports them.
4. `environment.js` / `sky.js`: replace `buildGround`, `buildSky`, `buildRidges` with the stage-study painters at world size.
5. `pilgrims.js`: adopt the target ramps from `recolorPilgrim` as the source ramps and drop the remap.
6. Default camera centers the establishing shot. The existing simulation, hit testing, dust and time tide stay.
7. Acceptance: `establishing-3x`, `-gray`, `-squint` regenerated from the live scene's `composeArt`, judged by eye. The QA scripts are secondary.
