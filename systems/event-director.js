(function (root) {
  "use strict";

  // Long-form pacing. It does not spawn or draw anything; it gives every
  // subsystem the same quiet/build/reveal/recovery envelope and enforces rare
  // encounter spacing without exposing those mechanics in the UI.
  var PHASES = Object.freeze({ QUIET: "quiet", BUILD: "build", REVEAL: "reveal", RECOVERY: "recovery" });

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function smoothstep(a, b, value) {
    var t = clamp((value - a) / Math.max(0.0001, b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function hash(value) {
    var x = Math.sin(value * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  function create(options) {
    var settings = options || {};
    var seed = Number.isFinite(settings.seed) ? settings.seed : 326.73;
    var cycle = Number.isFinite(settings.cycleSeconds) ? settings.cycleSeconds : 148;
    var state = {
      phase: PHASES.QUIET,
      intensity: 0,
      quiet: 1,
      faunaActivity: 0.72,
      lightActivity: 0.58,
      surfaceActivity: 0.7,
      rareEncounter: false,
      cycleIndex: -1,
      localTime: 0,
      nextRareEligibleAt: 0,
      rareSerial: 0,
      transitionSerial: 0,
      focus: "environment",
      cameraDriftX: 0,
      cameraDriftY: 0,
      breath: 0
    };

    function update(time, context) {
      var ctx = context || {};
      var cycleIndex = Math.floor(time / cycle);
      var local = (time - cycleIndex * cycle) / cycle;
      state.cycleIndex = cycleIndex;
      state.localTime = local;
      var profile = hash(seed + cycleIndex * 7.91);
      var revealStart = 0.42 + profile * 0.12;
      var revealEnd = revealStart + 0.15 + hash(seed + cycleIndex * 13.7) * 0.09;
      var recoveryEnd = Math.min(0.92, revealEnd + 0.18);
      var previousPhase = state.phase;
      if (local < revealStart - 0.16) state.phase = PHASES.QUIET;
      else if (local < revealStart) state.phase = PHASES.BUILD;
      else if (local < revealEnd) state.phase = PHASES.REVEAL;
      else state.phase = PHASES.RECOVERY;
      if (state.phase !== previousPhase) state.transitionSerial += 1;

      var build = smoothstep(revealStart - 0.16, revealStart, local);
      var fade = 1 - smoothstep(revealEnd, recoveryEnd, local);
      state.intensity = clamp(build * fade, 0, 1);
      state.quiet = 1 - state.intensity * 0.64;
      state.faunaActivity = clamp(0.66 + state.intensity * 0.34 - (ctx.storm || 0) * 0.08, 0.42, 1);
      state.lightActivity = clamp(0.45 + state.intensity * 0.48 + (ctx.storm || 0) * 0.12, 0.3, 1);
      state.surfaceActivity = clamp(0.62 + state.intensity * 0.22 + (ctx.storm || 0) * 0.32, 0.5, 1.2);
      state.focus = state.phase === PHASES.QUIET ? "environment" : state.phase === PHASES.BUILD ? "materials" : state.phase === PHASES.REVEAL ? "encounter" : "aftermath";
      state.cameraDriftX = Math.sin(time * 0.0127 + seed) * (0.24 + state.intensity * 0.72);
      state.cameraDriftY = Math.sin(time * 0.0091 + seed * 0.37) * (0.12 + state.intensity * 0.28);
      state.breath = 0.5 + Math.sin(time * 0.043 + cycleIndex) * 0.5;

      var candidate = hash(seed + cycleIndex * 29.41) > 0.74;
      var rareWindow = local > revealStart + 0.025 && local < revealEnd - 0.025;
      state.rareEncounter = candidate && rareWindow && time >= state.nextRareEligibleAt && !ctx.colossalVisible;
      if (state.rareEncounter && !state._wasRare) state.rareSerial += 1;
      if (!state.rareEncounter && state._wasRare) state.nextRareEligibleAt = time + 210;
      state._wasRare = state.rareEncounter;
      return state;
    }

    function snapshot() {
      return {
        phase: state.phase,
        intensity: state.intensity,
        faunaActivity: state.faunaActivity,
        lightActivity: state.lightActivity,
        surfaceActivity: state.surfaceActivity,
        rareEncounter: state.rareEncounter,
        rareSerial: state.rareSerial,
        transitionSerial: state.transitionSerial,
        focus: state.focus,
        cameraDriftX: state.cameraDriftX,
        cameraDriftY: state.cameraDriftY,
        breath: state.breath
      };
    }

    function selfCheck() {
      var a = update(10, {});
      var b = update(82, {});
      return !!a.phase && Number.isFinite(b.intensity) && b.intensity >= 0 && b.intensity <= 1;
    }

    return Object.freeze({ update: update, snapshot: snapshot, selfCheck: selfCheck });
  }

  root.MareDirector = Object.freeze({ version: "1.0.0", phases: PHASES, create: create });
})(typeof window !== "undefined" ? window : globalThis);
