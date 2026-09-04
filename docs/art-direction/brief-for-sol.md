Sol, the Time Tombs art is finished as a reference scene and your job is to wire it in, not to redraw it. Please read docs/art-direction/time-tombs-review-2026-09-02.md in full, then run:

    node scripts/render-relit-studies.mjs

and open output/time-tombs/establishing-4x-world.png (the whole world at 4x), establishing-4x-ultrawide.png (the 3440x1440 window, the target frame at real size), establishing-squint.png, and the six <tomb>-relit-3x.png files. Every pixel in them comes from code in src/time-tombs/art/*-relit.js and stage-study.js.

Facts that are now fixed:
- World is 1120x360 logical. Benson's 3440x1440 ultrawide shows an 860x360 window at 4x and pans slowly along the valley (STAGE.viewport). 1080p shows a 640x360 window at 3x. Smaller screens use 2x. Integer scales only; delete the 2/3 preset and the ten-pixels-per-metre scale doc.
- Every sprite, placement, path, terrace, outcrop and pilgrim recolor lives in src/time-tombs/art/stage-study.js and the six *-relit.js builders. composeEstablishing(time) is the canonical frame; STANDS is the placement table.
- Scale: every builder takes `human` (person height at that depth). STANDS sets it: 7 Sphinx/Obelisk, 6 Jade, 5 Palace and wall. Do not normalise doors to one size and do not enlarge them; the tombs are thirty to forty people tall, which is what the text describes.
- Pilgrims need three sprite sizes chosen by ground band: the existing 20 px frames in the foreground camp band only, a 12 px set on the ramp (to be authored with the same text-mask approach as pilgrims.js), and tinyPilgrim() 3x7 specks on the tomb shelf. A 20 px actor must never stand next to a tomb. The default camera is the establishing shot.
- paintSandDrift runs after each monument blit; keep it, it is what stops the bases reading as ruled lines.
- The Cave Tombs landmark is the canyon wall itself: buildCanyonWall() in caves-relit.js, one world-width sprite placed at x=0, base=200 (see STANDS). Hover on the wall = the Cave Tombs. The floor is paintValleyFloor + paintWash, not flat bands.
- Raster.line() loops forever on a non-integer endpoint (this hung a render when a scaled gate width went fractional). Add Math.round to its inputs inside the function rather than trusting callers.

Do the "Wiring it in" steps at the end of the review in order: space.js world and scale, entities.js placements from STANDS, TOMB_BUILDERS pointed at the relit builders, ground/sky/ridges from the stage-study painters, pilgrim ramps adopted from recolorPilgrim, camera centred on the establishing shot. Keep the simulation, hit testing, dust and time tide. Do not resample any sprite. Do not port the brick pattern, volume() or portal() helpers into the new builders; delete them once nothing imports them.

Acceptance is visual: after each step regenerate establishing-3x/gray/squint from the live composeArt and compare to the study versions by eye. The QA scripts are secondary. When the live frame matches the study at 4x on the ultrawide, this pass is done.

---

Addendum, 2026-09-04: the composition is accepted. The surfaces are not. Read
docs/art-direction/pixel-shading-brief.md and follow it in order: references and
compare script first, palette v2, shade.js, the Castlevania column calibration with
Benson's yes, then the tombs one at a time with a compare sheet each. Nothing in the
composition, scale, placement or drift changes.

Addendum 2, 2026-09-04: Part 1 shading is not enough. Read Part 2 of
docs/art-direction/pixel-shading-brief.md. Monuments are now a hand-drawn tile
vocabulary plus a hand-written map, lit by ramp shift per cell. shape() with a
material function, dither() and prng() are banned inside builders. Start with the
Obelisk vocabulary and its compare sheet; do not touch a second monument until Benson
says the first one belongs beside the reference.

Addendum 3, 2026-09-04: six worked tile vocabularies now exist in src/time-tombs/art/tiles/
(stone, obsidian, jade, wall, thorn, crystal) with assemble.js and
scripts/render-tile-examples.mjs. Look at output/time-tombs/tiles/all-3x.png first. Use
these tiles directly; add tiles in the same style where a monument needs them. The
obelisk demo in obsidian.js is most of the Obelisk already: extend its map to the real
42x240 size (taper by choosing edge tiles per row), add the door and plinth, and make
that the first compare sheet.

Addendum 4, 2026-09-04: read Part 3 of docs/art-direction/pixel-shading-brief.md. After
the Obelisk compare sheet passes, the next engineering work is: split the scene into six
parallax layers with the scroll factors in Part 3; move every monument's placement list
into src/time-tombs/art/maps/; use flipX/flipY before drawing variants; animate glows
with cycleFrames instead of drawn frames; make monument hover a highlightRaster palette
swap instead of an outline; add a color-count check per sprite (15) and per layer (31)
to the compare-sheet script; and give every 320-wide stretch of the world a primary and
a secondary focal point, built from tiles.
