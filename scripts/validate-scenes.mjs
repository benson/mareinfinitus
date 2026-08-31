import assert from "node:assert/strict";

await import("../systems/scene-runtime.js");
await import("../systems/world-memory.js");
await import("../systems/event-director.js");
await import("../scenes/mare-infinitus.js");
await import("../scenes/time-tombs.js");

const runtime = globalThis.LivingSceneRuntime;
const packs = runtime.list();
assert.equal(packs.length, 2, "expected exactly two registered launch scenes");
assert.deepEqual(packs.map((pack) => pack.id), ["mare-infinitus", "time-tombs"], "scene order changed unexpectedly");

const ids = new Set();
for (const pack of packs) {
  assert.match(pack.id, /^[a-z0-9-]+$/, `${pack.id} has an invalid id`);
  assert.ok(!ids.has(pack.id), `duplicate scene id ${pack.id}`);
  ids.add(pack.id);
  assert.ok(pack.title && pack.shortDescription && pack.source, `${pack.id} lacks presentation metadata`);
  assert.equal(pack.fixedPixel, true, `${pack.id} does not promise fixed-pixel rendering`);
  assert.ok(Number.isInteger(pack.rendererVersion) && pack.rendererVersion > 0, `${pack.id} lacks a renderer version`);
  assert.ok(Array.isArray(pack.materials) && pack.materials.length >= 4, `${pack.id} needs material declarations`);
  assert.ok(Array.isArray(pack.systems) && pack.systems.length >= 4, `${pack.id} needs system declarations`);
  assert.ok(Array.isArray(pack.landmarks) && pack.landmarks.length >= 4, `${pack.id} needs landmark declarations`);
}
assert.equal(typeof packs[1].mount, "function", "Time Tombs must provide an independent renderer lifecycle");

for (const pack of packs) {
  const memory = globalThis.LivingWorldMemory.create({ id: `scene-harness-${pack.id}`, persist: false });
  const director = globalThis.MareDirector.create({ seed: pack.id.length * 17.3, cycleSeconds: pack.id === "mare-infinitus" ? 148 : 192 });
  let rareStarts = 0;
  let rareWasActive = false;
  const memoryStep = 0.25;
  for (let second = 0; second < 24 * 60 * 60; second += memoryStep) {
    const storm = (Math.sin(second * 0.0007) + 1) * 0.5;
    const direction = director.update(second, { storm, colossalVisible: second % 1700 > 1500 });
    const influence = memory.update(memoryStep, {
      storm,
      activity: direction.faunaActivity,
      disturbance: direction.phase === "reveal" ? 0.38 : 0.02,
    });
    if (direction.rareEncounter && !rareWasActive) {
      rareStarts += 1;
      memory.observe("rare", direction.intensity);
    }
    rareWasActive = direction.rareEncounter;
    for (const value of Object.values(influence)) assert.ok(Number.isFinite(value), `${pack.id} memory produced a non-finite value`);
    assert.ok(direction.intensity >= 0 && direction.intensity <= 1, `${pack.id} director escaped its envelope`);
  }
  const snapshot = memory.snapshot();
  assert.ok(Math.abs(snapshot.age - 24 * 60 * 60) < 0.001, `${pack.id} memory lost elapsed time`);
  assert.ok(snapshot.weathering > 0 && snapshot.weathering <= 1, `${pack.id} weathering did not accumulate safely`);
  assert.ok(rareStarts > 0 && rareStarts < 220, `${pack.id} rare pacing is implausible: ${rareStarts}/day`);
}

console.log(`Scene validation passed: ${packs.length} packs, 48 simulated scene-hours, fixed-pixel and persistence contracts intact.`);
