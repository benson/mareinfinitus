# Simulation architecture

Mare Infinitus is rendered on an integer art grid: three screen pixels per art
pixel on desktop and in the native screensavers, two on short mobile landscape
views, and one on narrow portrait phones. Resizing reveals more or less world;
it never stretches an individual art pixel or changes an animal's scale within
the selected camera density.

Ocean darkness and the ordinary-fauna band are measured in fixed world pixels,
not as percentages of viewport height. A taller display therefore sees below
the familiar water column into a dim, sparsely inhabited abyss instead of
stretching the same gradient and schools to fill the screen.

The scene is intentionally a coupled simulation rather than a collection of
independent loops:

1. `app.js` advances weather, the wave surface, and the low-resolution fluid.
2. `systems/ecology.js` chooses an animal's behavior from sensed food, threats,
   shelter, curiosity, weather, and longer ecological events.
3. `systems/world-physics.js` supplies spatial perception, attention locks,
   personal-space pressure, buoyancy contacts, and paired hydrodynamic wakes.
4. `systems/motion-engine.js` turns actual velocity, acceleration, and turning
   into mass-limited body waves. It also owns the Verlet constraint chains used
   by jelly arms, hectapus arms, and colossal tendrils.
5. `systems/creature-variation.js` is the anatomy grammar: deterministic body
   dimensions, fins, segments, markings, scars, light organs, and restrained
   within-species variation.
6. `systems/scene-engine.js` gives every depth plane the same scale, haze,
   contrast, color-transmission, and back-to-front ordering rules. Its material
   field slowly evolves caustic visibility and suspended matter with the fluid.
7. `systems/light-field.js` ray-marches continuous volumetric light through the
   live wave surface. The platform flashlight refracts into the sea; lamp-mouth
   leviathans and select luminous fauna use the submerged half of the same
   system.
8. `systems/event-director.js` provides a shared quiet → build → reveal →
   recovery envelope. Fauna, waves, rare ecological events, and light therefore
   breathe together instead of all demanding attention at once.
9. `systems/ambient-life.js` adds background platform activity and atmospheric
   detail without owning physics or animal decisions.

## Stability rules

- Animation cadence is derived from motion and bounded by body mass. A violet
  eel cannot visibly oscillate at twenty cycles per second, and a giant cannot
  twitch like a minnow.
- Facing uses velocity thresholds, inertial heading, and a minimum hold time.
  Near-zero velocity cannot flip a sprite every frame.
- Soft chains are anchored and iteratively constrained; resize migration or a
  teleport resets a chain instead of stretching it across the screen.
- Animals on similar depth planes repel before overlapping. Animals on separate
  planes may cross, with the farther one smaller, dimmer, hazier, and rendered
  first.
- Extraordinary background encounters are mutually exclusive.
- In screensaver mode the high-contrast station migrates by a few art pixels
  over several minutes to reduce persistent static edges.

## Validation

`npm test` runs release validation plus a deterministic simulation soak. The
soak covers twelve simulated minutes of motion, ninety seconds of soft-body
constraints, monotonic depth treatment, direction-change hysteresis, and an
hour of event scheduling. Native wrapper validators also ensure every shared
engine is copied into the offline bundles.
