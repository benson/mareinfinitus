import assert from "node:assert/strict";

await import("../systems/motion-engine.js");
await import("../systems/world-physics.js");
await import("../systems/scene-engine.js");
await import("../systems/event-director.js");
await import("../systems/world-memory.js");
await import("../systems/silhouette-library.js");

const Motion = globalThis.MareMotion;
const World = globalThis.MareWorldPhysics;
const Scene = globalThis.MareScene;
const Director = globalThis.MareDirector;
const Memory = globalThis.LivingWorldMemory;
const Silhouettes = globalThis.LivingSilhouettes;

assert.ok(Motion?.selfCheck(), "motion-engine self check failed");
assert.ok(World?.create().selfCheck(), "world-physics self check failed");
assert.ok(Scene?.selfCheck(), "scene-engine self check failed");
assert.ok(Director?.create().selfCheck(), "event-director self check failed");
assert.ok(Memory?.selfCheck(), "world-memory self check failed");
assert.ok(Silhouettes?.selfCheck(), "silhouette-library self check failed");

const simulatedSeconds = 12 * 60;
const dt = 1 / 60;
const eel = {
  kind: "eel", x: 80, y: 90, vx: 0.6, vy: 0.02,
  direction: 1, seed: 0.37, size: 1,
  variation: { bodyLength: 10, tailLength: 3 }
};
let previousPhase = null;
let largestPhaseStep = 0;
let directionChanges = 0;
let previousDirection = eel.direction;
for (let frame = 0; frame < simulatedSeconds / dt; frame += 1) {
  const time = frame * dt;
  eel.vx = Math.sin(time * 0.022) * 0.72;
  eel.vy = Math.sin(time * 0.071) * 0.06;
  const state = Motion.updateAgent(eel, dt, time);
  if (previousPhase !== null) {
    let step = state.phase - previousPhase;
    if (step < -Math.PI) step += Math.PI * 2;
    largestPhaseStep = Math.max(largestPhaseStep, Math.abs(step));
  }
  if (eel.direction !== previousDirection) directionChanges += 1;
  previousDirection = eel.direction;
  previousPhase = state.phase;
  assert.ok(Number.isFinite(state.spine[0]), "motion spine became non-finite");
}
assert.ok(largestPhaseStep < 0.08, `motion continuity exceeded cadence cap: ${largestPhaseStep}`);
assert.ok(directionChanges < 12, `direction hysteresis failed: ${directionChanges} changes`);

const chain = Motion.createChain(12, 8, 10, 1.4, 0.6);
for (let frame = 0; frame < 60 * 90; frame += 1) {
  const time = frame * dt;
  Motion.updateChain(chain, dt, 12 + Math.sin(time * 0.13) * 4, 8, () => ({
    x: Math.sin(time * 0.19) * 0.3,
    y: Math.cos(time * 0.11) * 0.08
  }), { time, seed: 0.6, flutter: 0.006, iterations: 4 });
}
let maximumConstraintError = 0;
for (let point = 1; point <= chain.count; point += 1) {
  const slot = point * 2;
  const dx = chain.points[slot] - chain.points[slot - 2];
  const dy = chain.points[slot + 1] - chain.points[slot - 1];
  maximumConstraintError = Math.max(maximumConstraintError, Math.abs(Math.hypot(dx, dy) - chain.segmentLength));
}
assert.ok(maximumConstraintError < 0.12, `soft-body constraint drifted: ${maximumConstraintError}`);

const near = Scene.styleFor({ visualDepth: 0.1 }, { storm: 0.2, waterAmount: 1 }, { water: "#30265f", waterDeep: "#14133b" }, {});
const far = Scene.styleFor({ visualDepth: 0.9 }, { storm: 0.2, waterAmount: 1 }, { water: "#30265f", waterDeep: "#14133b" }, {});
assert.ok(far.scale < near.scale && far.alpha < near.alpha && far.haze > near.haze, "depth compositing is not monotonic");

const director = Director.create({ seed: 326.73, cycleSeconds: 148 });
let rareTransitions = 0;
let rareWasActive = false;
for (let second = 0; second < 60 * 60; second += 1) {
  const state = director.update(second, { storm: 0.2, colossalVisible: false });
  if (state.rareEncounter && !rareWasActive) rareTransitions += 1;
  rareWasActive = state.rareEncounter;
  assert.ok(state.intensity >= 0 && state.intensity <= 1, "director intensity escaped bounds");
}
assert.ok(rareTransitions <= 8, `rare encounters are too frequent: ${rareTransitions} per hour`);

console.log(
  `Simulation validation passed: ${simulatedSeconds}s motion, ` +
  `${maximumConstraintError.toFixed(4)} max chain error, ${rareTransitions} rare encounter(s)/hour.`
);
