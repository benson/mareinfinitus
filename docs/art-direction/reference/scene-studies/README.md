# September 5 scene exploration

Benson requested image generation of the desired whole scene, followed by
translation into authored elements and pixels. He also identified conflicting
distance/detail cues, and questioned why the first generated concept resembled
the existing scene so closely.

## Concepts and provenance

- **time-tombs-master-v1.png**: conservative edit with the existing full world
  render as the primary input and native Castlevania/Pitfall as style references.
  Its prompt locked camera, placements and silhouette envelopes. This explains
  the close resemblance; it was too constrained for independent exploration.
- **time-tombs-master-v2.png**: independent generation from the book descriptions
  in src/time-tombs/book-excerpts.js and only the two Genesis screenshots. No
  runtime render or earlier Time Tombs concept was provided. It explores looking
  into a deep arroyo, overlapping planes and a genuinely remote Palace.
- **time-tombs-master-v3.png**: targeted edit of v2 to remove the Sphinx's animal
  face and ground the Crystal on the valley floor. This is the current concept
  candidate, not an accepted runtime layout.

Each version has a neighboring exact-prompt document. All used built-in imagegen;
no API/CLI fallback was used. These are sourcebooks, never flattened runtime art.

## What this exploration establishes

The strongest new idea is a view into the valley: winding paths and occlusion
explain distance before surface detail does. The Crystal is the largest tomb,
the Palace is remote, and the camp is a warm secondary focal point. Translate
those relationships deliberately rather than sampling or shrinking the bitmap.

The images remain imperfect. V3 simplifies away the three cave mouths, the
Palace still tends toward a familiar castle silhouette, and the Sphinx crown
could be more ambiguous and less stepped. The sky and terrain also contain too
much small texture for literal native-pixel translation. Future pixel work must
retain quiet fields and design each material for its viewing distance.

## Implementation state

The live scene layout and all six production monument rasters remain as before
this exploration. The preceding fix for unexplained automatic lighting pulses
is retained. No build, commit, push or deployment was made for these concepts.

A small preliminary Jade/Crystal/canyon material trial made from v1 is preserved
under ignored output/time-tombs/depth-material-study/ with its native tile/map
sources, palette and material-trial-4x.png. It was removed from production when
the discussion shifted toward independent whole-scene design. Those trial files
are reference material and are not imported by the runtime. Native pre-trial
rasters are retained in output/time-tombs/before-depth-pass/.

Next: settle the visual direction, resolve the three cave mouths and non-generic
Palace/Sphinx forms, then author a native composition study from separate tiles
and placement maps. A new valley layout also needs matching ground geometry,
actor routes, depth planes, shadows and picking; changing only sprite positions
would recreate the spatial inconsistency Benson identified. Keep the existing
live scene available while that coherent replacement is developed.
