(function (root) {
  "use strict";

  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function finite(value, fallback) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }

  function create(options) {
    var settings = options || {};
    var id = settings.id || "living-scene";
    var storageKey = "living-scene-memory:" + id;
    var persist = settings.persist !== false;
    var state = {
      version: 1,
      age: 0,
      lastSavedAt: Date.now(),
      weathering: 0,
      disturbance: 0,
      vitality: 0.5,
      quiet: 0.5,
      rareImprint: 0,
      encounters: Object.create(null)
    };
    var saveAccumulator = 0;

    if (persist && root.localStorage) {
      try {
        var stored = JSON.parse(root.localStorage.getItem(storageKey) || "null");
        if (stored && stored.version === 1) {
          state.age = finite(stored.age, 0);
          state.weathering = clamp(finite(stored.weathering, 0), 0, 1);
          state.disturbance = clamp(finite(stored.disturbance, 0), 0, 1);
          state.vitality = clamp(finite(stored.vitality, 0.5), 0, 1);
          state.quiet = clamp(finite(stored.quiet, 0.5), 0, 1);
          state.rareImprint = clamp(finite(stored.rareImprint, 0), 0, 1);
          state.encounters = stored.encounters && typeof stored.encounters === "object" ? stored.encounters : Object.create(null);
          var elapsed = clamp((Date.now() - finite(stored.lastSavedAt, Date.now())) / 1000, 0, 60 * 60 * 24 * 30);
          state.disturbance *= Math.exp(-elapsed / (60 * 60 * 5));
          state.rareImprint *= Math.exp(-elapsed / (60 * 60 * 20));
          state.quiet += (0.5 - state.quiet) * (1 - Math.exp(-elapsed / (60 * 60 * 3)));
        }
      } catch (_) {}
    }

    function save() {
      if (!persist || !root.localStorage) return;
      try {
        state.lastSavedAt = Date.now();
        root.localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (_) {}
    }

    function observe(name, strength) {
      var amount = clamp(finite(strength, 1), 0, 1);
      state.encounters[name] = finite(state.encounters[name], 0) + 1;
      state.rareImprint = clamp(state.rareImprint + amount * 0.16, 0, 1);
      state.disturbance = clamp(state.disturbance + amount * 0.1, 0, 1);
      save();
    }

    function update(dt, signals) {
      var step = clamp(finite(dt, 0), 0, 0.25);
      var input = signals || {};
      var storm = clamp(finite(input.storm, 0), 0, 1);
      var activity = clamp(finite(input.activity, 0.5), 0, 1);
      var disturbance = clamp(finite(input.disturbance, 0), 0, 1);
      state.age += step;
      state.weathering = clamp(state.weathering + step * (0.000002 + storm * 0.000018), 0, 1);
      state.disturbance += (disturbance - state.disturbance) * (1 - Math.exp(-step * 0.03));
      state.disturbance *= Math.exp(-step * 0.0016);
      var vitalityTarget = clamp(0.42 + activity * 0.34 + storm * 0.08 - state.disturbance * 0.18, 0.12, 0.92);
      state.vitality += (vitalityTarget - state.vitality) * (1 - Math.exp(-step * 0.004));
      var quietTarget = clamp(1 - activity * 0.72 - storm * 0.22, 0, 1);
      state.quiet += (quietTarget - state.quiet) * (1 - Math.exp(-step * 0.006));
      state.rareImprint *= Math.exp(-step * 0.0007);
      saveAccumulator += step;
      if (saveAccumulator > 15) { saveAccumulator = 0; save(); }
      return influence();
    }

    function influence() {
      return {
        weathering: state.weathering,
        disturbance: state.disturbance,
        vitality: state.vitality,
        quiet: state.quiet,
        encounterEcho: state.rareImprint,
        age: state.age
      };
    }

    function snapshot() { return JSON.parse(JSON.stringify(state)); }

    return Object.freeze({ update: update, observe: observe, influence: influence, snapshot: snapshot, save: save });
  }

  function selfCheck() {
    var memory = create({ id: "self-check", persist: false });
    var before = memory.influence();
    memory.update(1, { storm: 0.8, activity: 1, disturbance: 1 });
    memory.observe("test", 1);
    var after = memory.snapshot();
    return after.age > before.age && after.encounters.test === 1 && after.rareImprint > 0;
  }

  root.LivingWorldMemory = Object.freeze({ version: "1.0.0", create: create, selfCheck: selfCheck });
})(typeof window !== "undefined" ? window : globalThis);
