# Project instructions

This is a static GitHub Pages project published through Benson's established
`bensonperry.com/<repo>/` architecture. Do not use OpenAI Sites or ChatGPT
Sites, create `.openai/hosting.json`, or add ChatGPT-hosted Git remotes unless
Benson explicitly requests that in the current task.

Keep native art pixels fixed. User-requested camera zoom may explicitly select
1×, 2× or 4× display enlargement; resize must preserve that selected zoom.
Responsive layouts must reveal more or less of
the simulated world rather than scaling the pixels.

World objects must use stable world coordinates and fixed-size integer-pixel
primitives. Do not size or position planets, platforms, buildings, cables,
vehicles, creatures, or scenery from viewport percentages. Resizing the canvas
must move the camera bounds and preserve simulation state; it must not stretch,
reseed, or reconstruct visible world objects. Large structures should be built
from repeated pixel modules/panels rather than single elastic rectangles.

The default visual grammar is irregular pixel masks for objects, stippled
clusters for materials and currents, ordered dithering for color transitions,
and explicit submerged/surface/above-water draw passes. Do not visualize
velocity, waves, wakes, or world objects as long filled rectangles or continuous
white lines.

Every visible surface must be pixel-authored, not merely rasterized. A polygon
may establish a collision or silhouette boundary, but it is not finished art:
fill it with deliberate palette clusters, broken edges, wear, seams, deposits,
shadow islands, and material-specific pixel detail. Large environmental fields
such as sand, water, stone, cloud, and sky need dense world-stable microstructure
plus a smaller live material layer where motion is physical. Animate fabric,
light, weather, vegetation, suspended material, and celestial travel at bounded
rates; keep truly massive structures stable while their light, dust, patina, and
surrounding fields evolve.
Do not treat statistically uniform speckle as authored detail. Texture must
follow form: blocks establish masonry courses, highlights describe planes,
deposits collect on ledges, cracks branch from stress points, fabric variation
follows panels and repairs, and sand clusters align with dune crests and lee
shadows. Silhouette edges, stairs, roofs, platforms, and repeated modules need
intentional chips, offsets, repairs, and palette changes rather than mathematically
perfect repetition with noise painted over it.

## Environmental material variation contract

Build natural surfaces at three scales: **region → connected form → local
detail**. First compose physically distinct regions and their quiet spaces;
then author their ridges, channels, deposits, fractures or clumps; only then use
stable randomness to vary small details within those forms. Randomly rotating,
resizing or repositioning a single stamp does not satisfy this contract.

For a desert, distinguish smooth drifts, coherent ripple fields, scoured paths,
sheltered deposits, gravel concentrations and exposed/crusted ground where
appropriate. Wind direction, slope and nearby obstacles should explain the
placement and orientation. Adjacent ripples may repeat locally; the entire
world must not share one motif, density, spacing or regular tile grid. Preserve
substantial areas with few or no marks; more noise is not more fidelity.

Random strings/patterns are a source of bounded variation, not the composition
itself. Sample them per region or feature, never independently per rendered
pixel/frame. Terrain coordinates and pixel size stay fixed through time and
resize. Review the whole composition and representative material crops at
native size, 4× and grayscale. Validate quiet-versus-detailed regions and
world-space crop consistency; a deterministic random output alone is not an
adequate visual acceptance test.

During active visual iteration, keep changes local. Do not commit, push, or
deploy each pass; publish only when Benson explicitly asks to ship the current
iteration.

New worlds must register through `systems/scene-runtime.js` and live under
`scenes/`; do not fork the repository or duplicate the shell. Keep material,
actor, landmark, event, lore, presentation, and persistence concerns inside the
scene pack. Shared systems may define behavior contracts, but important visual
silhouettes must remain authored rather than assembled from random rectangles.

## Field-guide copy contract

Hover summaries identify the visible subject. Describe its authored silhouette,
anatomy, material, color, scale, spatial context, and book provenance. Do not
expose actor schedules, spawn rules, rarity gates, counts, speed multipliers,
debug behavior, implementation constraints, or promises about what the subject
is doing now. In particular, avoid copy such as "moves together," "always
passes," "only one appears," or "brief high-speed pass." Narrative behavior may
remain in attributed book excerpts when it is part of the source passage.
Simulated phenomena may describe their defining physical effect, but the guide
must not read like release notes for the simulation.

Audit all guide copy whenever a scene adds or substantially changes actors.
The renderer owns behavior; hover prose must stay true even when the simulation
is paused on a different state.

## Actor parity contract

Visible characters are actors, not ambient decoration. Every scene with people
or named characters must give them the same minimum behavioral fidelity:

- stable identity, role, visual variation, and props;
- source-grounded ethnicity, skin tone, age, body type, clothing, and other
  identity traits; never randomize race or infer complexion from palette needs;
  when the source is silent, remain visually restrained and non-assertive;
- a deterministic multi-stage story or state cycle with held actions rather
  than frame-to-frame random choices;
- coherent locomotion, facing, pose animation, and bounded animation rates;
- reactions to the scene's important materials, weather, hazards, and events;
- spatial logic for groups, including formation, separation, shared stops, and
  contextual interactions where appropriate;
- persistent physical traces or effects when the world premise implies them;
- at least one contextual user interaction when characters are clickable; and
- debug snapshots that expose current role, state, direction, and position.

Shared behavior quality is the floor. A new scene may express it differently,
but it may not reduce characters to independently drifting sprites.

## Spatial-depth contract

Scenes with traversable land must not default to one horizontal stage rail.
Author stable foreground, middle-distance, and horizon planes; distribute
landmarks deliberately among them; and align each object's base, shadow,
atmospheric contrast, material effects, and hit region to its plane. Paths must
connect those planes with pixel-built perspective cues. Characters should move
forward and back through the scene when the geography calls for it, leave traces
on the plane they occupy, and draw in depth order so crossings can read as real
occlusion. Preserve fixed-size art pixels: depth changes composition, palette,
and authored sprite detail rather than elastically scaling canvas rectangles.

## Image generation to pixel-art pipeline

Use image generation early for each new world's visual development. Generate
the important landmarks, characters, props, and environment together in one
cohesive master composition so they share scale, perspective, lighting,
materials, and shape language. Then create a deliberate chunky pixel-art
translation of that same composition. Preserve both selected references under
`docs/art-direction/`.

The generated frame is a sourcebook, never the shipped flattened background.
Translate its subjects into authored fixed-pixel masks, sprites, modules, and
independent material layers so resizing, simulation, occlusion, inspection, and
screensaver movement remain real. Use nearest-neighbor pixel structure and
purposeful clusters; do not merely place a blur/pixelation filter over the
generated painting or copy randomly configured rectangles from it.

## Approved Time Tombs authoring override (2026-09-02)

For Time Tombs, follow `docs/art-direction/time-tombs-authoring-plan.md` instead
of the generic image-generation workflow above. Production art is code-only:
text-grid masks and material-aware construction functions in
`src/time-tombs/art/`. No paid generation, manual external-editor touchup,
image reduction/quantization, or silhouette stitching. Inspect at native scale,
4×, and grayscale. One source pixel equals one world unit; choose an integer
display scale at mount and hold it through resizes. Explicit wheel zoom may
switch between 1×, 2× and 4× without changing the art or simulation. Keep Mare untouched.

### Scene-wide craftsmanship gate

Apply the same authoring standard to **every category**, including the ground,
sky, distant silhouettes, minor props, contact shadows, footprints and smoke.
Do not finish only the focal landmarks and accept generic shorthand elsewhere.
For each asset or material, explicitly check silhouette, large value planes,
material-specific clusters, physical attachment/contact and animation continuity.
Quiet, unmarked areas are intentional composition, not unfinished pixels; this
overrides the generic request for dense environmental microstructure above.

A dune needs a filled windward slope, crest and lee face before ripple accents.
A cloud needs coherent lobes before wisps. Fabric needs tension and folds before
stitches; carved stone needs planes before cracks. Small effects also need
authored native masks where they depict a volume. Individual grains, stars and
embers may genuinely be single pixels. Do not stretch their masks for variation.

Cast shadows need an explicit physical ground-contact profile, separate from
decorative sprite transparency. Projection must preserve connected material;
forward-splatting a mask must not tear it into stripes or detach it from stairs.
Test several sun positions, contact rows, enclosed pinholes and clipping.
Do not fill the visible inspection mask with the separate shadow geometry.

Review each character's complete pose sheet: seams, straps, held objects and
facial identity must remain attached through motion. Palette variation is not
permission to randomize identity. Keep existing successful silhouettes and
animation cadence unless there is a specific reason to change them.

Before handing off a broad visual pass, review the full composition and a
cross-category contact sheet at native size, 4× and grayscale, then verify the
live scene's hover, interactions and resize. Automated tests are necessary but
cannot certify taste or that every pixel is aesthetically finished.
## Geometry and simulation contract — Time Tombs

Do not replace missing object facts with another independently tuned guess.
The authoritative asset record in `src/time-tombs/entities.js` owns native
dimensions, pivot, ground footprint, grounded raster bands, named depth/height
parts, and attachment points. Scene instances own placement; consumers derive
their world coordinates. Missing records are errors, not fallback rectangles.

- Keep ground-plane (x, y), elevation, sprite-local pixels, projected world
  pixels and CSS/client pixels distinct. Transform at named boundaries only.
  Mirroring must transform anchors and pivots together. Rounding is a render
  operation, not an integration step.
- Ground contact follows the current raster's actual grounded edge. Suspended
  anatomy uses its authored part's depth/height, not the nearest foot, the
  texture bottom, a center point, or a bounding-box fraction. Collision is a
  separate authored ground footprint, never the upright silhouette.
- Use one current pose for the image, visible inspection mask, feet,
  attachments, shadow caster and occlusion. An internal color change need not
  alter a shadow. Cache keys must include frame, transform, light and receiver
  revision wherever those affect the result; instance-specific receiver
  results cannot be shared just because two objects use the same asset.
- Ground effects stay below bodies. Projecting parts (stairs, wings, plinths)
  sort independently while preserving a single inspection identity. Picking
  must resolve the same visible part ordering as rendering.
- Terrain art and elevation use the same authored cross-sections. This is an
  explicit stylized 2.5D model, not inferred 3D geometry or real-world physics.
  Use its surface for grounded placement, traces, slope, shadow receivers and
  foreground occlusion. Give rigid structures level foundations.
- Route around every placed solid footprint and sweep movement segments;
  point-only checks, steering forces and snap-through teleports are not
  collision guarantees. Bound route searches and keep deterministic fallbacks.
- One fixed-step clock owns all simulation and animation, including cloth.
  Frame rate, pause, debug advance and resize must not create separate clocks.
  Limit catch-up after suspension explicitly. Seed variation once; do not
  reroll persistent facts in render/update.
- Effects, audio and interaction destinations use named object attachments,
  not copies of coordinates in unrelated modules. Detached particles retain
  their historical release position. Modal/guide close, blur and shutdown must
  clear transient interaction ownership and scene-owned resources.
- Add regression tests at the relationship boundary: actual boot pixel versus
  footprint, rendered base versus shadow contact, blocked segment versus route,
  part draw order versus pick result, changed frame with an unchanged sun, and
  30/120 Hz replay. Comparing two calls to the same helper is insufficient.
  Test all relevant poses and multiple sun directions, not one lucky frame.

Run `npm run test:scenes` and a focused real-browser interaction check after
changing these contracts. Visual review remains necessary: metadata and tests
can agree with each other and still be authored incorrectly.
