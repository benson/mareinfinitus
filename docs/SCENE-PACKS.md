# Living scene packs

The repository is now a small simulation platform with two launch scenes. Mare
Infinitus remains the default because the public URL and native screensaver are
already established around it; new worlds register beside it rather than
branching or cloning the application.

## Contract

Every file under `scenes/` registers one immutable manifest with
`LivingSceneRuntime.register()`:

```js
{
  id: "time-tombs",
  index: "HYPERION",
  title: "The Time Tombs",
  shortDescription: "…",
  source: "Hyperion / Endymion",
  rendererVersion: 1,
  fixedPixel: true,
  landmarks: ["…"],
  materials: ["sand", "dust", "wind", "grass", "time"],
  systems: ["aeolian-field", "temporal-echoes", "event-direction"],
  sound: { /* procedural ambience tuning */ },
  mount(host) { /* scene lifecycle */ }
}
```

The manifest is not marketing metadata alone. The release harness rejects a
pack that omits its material, system, landmark, fixed-pixel, or renderer-version
contracts.

## Renderer lifecycle

`mount(host)` receives the shared canvas, shell, runtime flags, and scene host.
A renderer owns:

1. stable world state and world-to-camera transforms;
2. material and actor updates driven by bounded `dt`;
3. integer-pixel drawing with image smoothing disabled;
4. responsive resize that reveals or hides world area without scaling objects;
5. its settings, guide entries, identification geometry, and scene-specific
   interactions;
6. visibility pause/resume and an optional debug snapshot;
7. dynamic signals sent to the shared procedural soundscape.

The scene host owns world selection, photo capture, audio activation, URL
routing, and the screensaver gate. `LivingWorldMemory` gives every pack a
separate persistence namespace so an ocean storm cannot weather a desert tomb.

## Art direction boundary

Shared systems solve behavior, not taste. A pack should author its important
silhouettes and landmarks explicitly. Procedural variation may distress,
weather, articulate, or recolor those designs, but it should not invent the
primary silhouette from random rectangles. Environmental fields may fill the
viewport; world objects may not.

## Adding the next world

1. Add `scenes/<id>.js` and register its manifest.
2. Start with one material interaction unique to the place. If it could be
   swapped into either existing world unchanged, it is probably decoration,
   not the scene's physical premise.
3. Add at least four authored landmarks and name their sources.
4. Give the world a persistence namespace and feed slow consequences back into
   its materials or structures.
5. Add book-derived and simulated field-guide entries with explicit provenance.
6. Add the file to the content-hash list and native bundle inputs.
7. Extend `scripts/validate-scenes.mjs`, then smoke-test desktop, narrow mobile,
   tall viewport, resize continuity, welcome/guide/settings, and
   `?screensaver=1`.

This lets a future forest, orbital habitat, frozen settlement, desert
megastructure, or River Tethys stop reuse mature motion/light/event contracts
without inheriting Mare's water assumptions.
