# Project instructions

This is a static GitHub Pages project published through Benson's established
`bensonperry.com/<repo>/` architecture. Do not use OpenAI Sites or ChatGPT
Sites, create `.openai/hosting.json`, or add ChatGPT-hosted Git remotes unless
Benson explicitly requests that in the current task.

Keep the art pixel size fixed. Responsive layouts must reveal more or less of
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

During active visual iteration, keep changes local. Do not commit, push, or
deploy each pass; publish only when Benson explicitly asks to ship the current
iteration.
