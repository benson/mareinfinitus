# Living scene packs

The shared shell owns world selection, URL routing, audio, photo capture, modal
chrome, and screensaver mode. Mare Infinitus stays on its mature Canvas
simulation. Time Tombs owns its independent Phaser scene under
`src/time-tombs/`; do not change Mare when working on another world.

## Manifest and engine boundary

Each `scenes/<id>.js` registers with `LivingSceneRuntime.register()`. Include
identity, title, source, renderer/art/actor contract versions, fixedPixel,
landmarks, materials, systems, ambience tuning, and a lazy `mount(host)`.
Time Tombs declares renderer version 4, art direction 4, actor contract 3.

- World coordinates and object sizes are independent of browser dimensions.
- Resize changes only the camera aperture. Never reconstruct or reseed entities.
- Select an integer display scale once at mount and keep it fixed through
  resizes. Beyond the finite world, letterbox; drag or arrow keys explore
  cropped portions. Never continuously stretch content to fit.
- Keep nearest sampling, pixelArt, and camera roundPixels enabled.
- Grounded sprites depth-sort by contact-point y.
- Pointer interactions use the active camera's getWorldPoint transform.
- Inspection uses raster-derived alpha ownership and exterior borders, not
  bounding cards. Enclosed holes can retain hover ownership without filling art.
- Bundle the runtime locally, content-stamp it, and include it in both offline
  screensaver packages. No network dependency is needed to construct the art.

## Native pixel authoring

Follow [the approved authoring plan](art-direction/time-tombs-authoring-plan.md).
For Time Tombs, production is code-only. Historical illustrations under
`docs/art-direction/reference/` are concept references, not compiler inputs.
Do not revive quantization, neighborhood cleanup, silhouette stitching, or
generated-sheet extraction. No paid generation or external-editor touchup.

1. Establish human scale, world dimensions, light direction, and material ramps.
2. Author each asset at final native size using text-grid masks or construction
   functions: silhouette, lit/shadow faces, material rules, then deliberate
   doors, courses, fractures, feathers, hems, and chips.
3. Emit palette indices into Raster. One source pixel equals one world unit.
   Channels use the 3-bit ladder; each asset uses at most 15 colors plus binary
   transparency. Different materials share approved ramps.
4. Keep separate textures for tombs, actor frames, props, and environmental
   layers. No baked monument plate or arbitrary per-sprite scaling.
5. Review each asset headlessly at 4× and in grayscale before integration.
   Confirm form and material separation visually; histogram scores cannot
   establish artistic quality.
6. Animate authored poses at bounded rates. Continuous simulation coordinates
   are rounded only when drawing. Flips are allowed; filtered rotation,
   squash, and fractional scaling are not.

Time Tombs retains its original 720×270 valley coordinates inside a 1536×1152
world beginning at (-384,-384). Extra sky and foreground fill larger views at
the approved fixed 4× display scale. Both camera axes can pan; Home returns to
(360,135). Native sizes:
Sphinx 160×110, Palace 110×130, Crystal 40×140, Jade 120×90, Obelisk 18×70,
cave group 108×42, pilgrims 12×20, instruments 15×24, and tents 36×25.
These are physical scale decisions, not boxes to normalize everything into.

Terrain uses native sand tiles, continuous dune streaks, connected paths, and
chipped terraces. Texture follows form instead of uniform noise. Random detail
is seeded once. Dust and temporal fields remain separate non-blocking effects.

Validate determinism, dimensions, palette indices, binary alpha, distinct poses,
contour ownership, actor bounds, dwell times, direction hysteresis, and replay.
Do not substitute edge-density thresholds for visual judgment or automatically
“repair” valid authored pixels to improve a statistical score.

## Actors and spatial depth

Every visible character has stable text-faithful identity, costume and props,
with no randomized ethnicity or complexion. When the source is silent, avoid
assertive invented identity details.

The minimum behavior floor is a bounded multi-stage state cycle, held actions,
locomotion/facing logic, environmental reactions, contextual click interaction,
group formation/separation/shared stops, persistent physical traces, and debug
snapshots. Time Tombs uses four full-body walk poses, two idle poses, and three
gesture stages per pilgrim. Gait phase follows distance traveled (8 world pixels
per cycle), not a wall-clock animation rate. Footfalls leave stationary traces.
More frames are useful only when they express real motion.

The slow sun and cast shadows share `sunlightAt()`. Shadows project actual
monument rasters into fixed-size padded textures and only refresh when the
quantized light changes. Never shift the ground texture to suggest wind. Sand
gusts have short individual lifetimes; tents and campfire smoke share `windAt()`.

Author foreground, middle-distance, and horizon contact planes. Routes should
move through depth and respect occlusion. Align each landmark's base, shadow,
palette contrast, and hit region to its plane. Depth does not mean elastically
scaling a native sprite.

## Copy and interaction

Guide summaries describe visible form, material, identity, history, and source
context. Behavior schedules, spawn rules, debugging details, and promises about
what an actor is doing belong in code, not hover prose. Book excerpts require
accurate attribution; never invent quotations.

Control-hover identifies and outlines the complete subject. Guide entry hover
highlights corresponding world subjects. Clicks expose the scene's premise:
Time Tombs creates temporal echoes at the actual clicked depth, while clicking
a pilgrim prompts their held action.

Replace shared UI copy on mount and hide controls with no meaning in that
scene. Guide, About, world picker, sound/photo, and fullscreen remain subtle
shell controls. No implementation commentary belongs in the world UI.

## Adding a world

1. Register a small lazy-loading scene adapter.
2. Establish world dimensions, camera policy, human scale, and a material palette.
3. Approve one native terrain/landmark/actor slice before expanding production.
4. Add source-authored art, scene data, and an independent Phaser.Scene.
5. Implement the actor floor, depth, a scene-specific interaction, and ambient cycle.
6. Add source-grounded guide entries, keeping internal behavior out of the copy.
7. Build and content-stamp the static bundle; wire offline packaging.
8. Extend scene tests and check desktop, ultrawide, portrait/mobile, resize,
   Control-hover, guide highlights, clicking, panning, and screensaver mode.

The result should feel like a specific place, not a responsive collage.
