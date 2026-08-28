(function (global) {
  "use strict";

  // MareEcology owns decisions, not movement or drawing. The host supplies sensed
  // values in a reused context object, then consumes the reused steering output.
  // This keeps behavior independent of canvas size, the fluid implementation,
  // and the current collection layout in app.js.

  var STATE = Object.freeze({
    WANDERING: 0,
    FEEDING: 1,
    CURIOUS: 2,
    FLEEING: 3,
    SHELTERING: 4,
    RESTING: 5
  });

  var STATE_NAMES = Object.freeze([
    "wandering",
    "feeding",
    "curious",
    "startled / fleeing",
    "sheltering",
    "resting"
  ]);

  var EVENT = Object.freeze({
    NONE: "none",
    JELLY_BLOOM: "jellyBloom",
    MIGRATION: "migration",
    FEEDING_FRENZY: "feedingFrenzy",
    DEEP_QUIET: "deepQuiet",
    DISTANT_BREACH: "distantBreach",
    SHADOW_PASSAGE: "shadowPassage"
  });

  var EVENT_NAMES = Object.freeze({
    none: "No rare event",
    jellyBloom: "Mass jelly bloom",
    migration: "Pelagic migration",
    feedingFrenzy: "Feeding frenzy",
    deepQuiet: "Deep quiet",
    distantBreach: "Distant breach",
    shadowPassage: "Passing abyssal shadow"
  });

  var EVENT_TYPES = Object.freeze([
    EVENT.JELLY_BLOOM,
    EVENT.MIGRATION,
    EVENT.FEEDING_FRENZY,
    EVENT.DEEP_QUIET,
    EVENT.DISTANT_BREACH,
    EVENT.SHADOW_PASSAGE
  ]);

  var EVENT_DURATIONS = Object.freeze({
    jellyBloom: 64,
    migration: 52,
    feedingFrenzy: 30,
    deepQuiet: 72,
    distantBreach: 13,
    shadowPassage: 34
  });

  var EMPTY_CONTEXT = Object.freeze({});

  var ALL_STATES = 63;
  var MASK_NO_FLEE = ALL_STATES & ~(1 << STATE.FLEEING);
  var MASK_NO_SHELTER = ALL_STATES & ~(1 << STATE.SHELTERING);
  var MASK_NO_CURIOUS = ALL_STATES & ~(1 << STATE.CURIOUS);
  var KIND_MASKS = Object.freeze({
    fish: ALL_STATES,
    jelly: ALL_STATES,
    eel: MASK_NO_SHELTER,
    ray: ALL_STATES,
    shark: MASK_NO_SHELTER,
    hectapus: ALL_STATES,
    seaGiant: MASK_NO_FLEE & MASK_NO_SHELTER,
    leviathan: MASK_NO_FLEE & MASK_NO_SHELTER,
    colossal: MASK_NO_FLEE & MASK_NO_SHELTER & MASK_NO_CURIOUS
  });

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function smoothstep(value) {
    var x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function hashNumber(value) {
    var x = Math.sin(value * 12.9898 + 78.233) * 43758.5453123;
    return x - Math.floor(x);
  }

  function hashString(value) {
    var text = String(value);
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967296;
  }

  function mixedSeed(seed, stableId, kind) {
    return hashNumber(
      hashString(stableId) * 931.17 +
      hashString(kind || "creature") * 577.31 +
      seed * 101.93
    );
  }

  function stateAllowed(kind, state) {
    var mask = KIND_MASKS[kind];
    if (mask === undefined) mask = ALL_STATES;
    return (mask & (1 << state)) !== 0;
  }

  function fillTraits(seed, kind, out) {
    var traits = out || {};
    traits.seed = seed;
    traits.boldness = 0.12 + hashNumber(seed * 101 + 1) * 0.82;
    traits.sociability = 0.12 + hashNumber(seed * 103 + 2) * 0.85;
    traits.curiosity = 0.08 + hashNumber(seed * 107 + 3) * 0.9;
    traits.metabolism = 0.72 + hashNumber(seed * 109 + 4) * 0.7;
    traits.patience = 0.45 + hashNumber(seed * 113 + 5) * 0.85;
    traits.restlessness = 0.28 + hashNumber(seed * 127 + 6) * 0.9;
    traits.reaction = 0.72 + hashNumber(seed * 131 + 7) * 0.8;
    traits.depthBias = (hashNumber(seed * 137 + 8) - 0.5) * 0.14;

    // Visual systems may use these stable values without introducing a second
    // random identity for the same animal.
    traits.bodyProportion = 0.82 + hashNumber(seed * 139 + 9) * 0.4;
    traits.finScale = 0.72 + hashNumber(seed * 149 + 10) * 0.62;
    traits.segmentBias = Math.floor(hashNumber(seed * 151 + 11) * 5) - 2;
    traits.hueVariant = hashNumber(seed * 157 + 12) - 0.5;
    traits.patternVariant = Math.floor(hashNumber(seed * 163 + 13) * 5);
    traits.markingDensity = hashNumber(seed * 167 + 14);
    traits.glowAffinity = hashNumber(seed * 173 + 15);
    traits.scar = hashNumber(seed * 179 + 16) > 0.86 ? 1 : 0;

    if (kind === "jelly") {
      traits.boldness *= 0.42;
      traits.reaction *= 0.68;
      traits.glowAffinity = clamp(traits.glowAffinity + 0.22, 0, 1);
    } else if (kind === "shark") {
      traits.boldness = clamp(traits.boldness + 0.28, 0, 1);
      traits.curiosity = clamp(traits.curiosity + 0.12, 0, 1);
    } else if (kind === "seaGiant" || kind === "leviathan" || kind === "colossal") {
      traits.boldness = clamp(traits.boldness + 0.38, 0, 1);
      traits.reaction *= 0.42;
      traits.restlessness *= 0.5;
    }
    return traits;
  }

  function createAgentState(seed, kind) {
    var ecology = fillTraits(seed, kind, {});
    ecology.kind = kind || "creature";
    ecology.state = STATE.WANDERING;
    ecology.previousState = STATE.WANDERING;
    ecology.stateAge = 0;
    ecology.stateUntil = 0;
    ecology.decisionTimer = hashNumber(seed * 191 + 17) * 0.7;
    ecology.lastTransition = 0;
    ecology.wanderPhase = hashNumber(seed * 193 + 18) * Math.PI * 2;
    ecology.wanderRate = 0.14 + ecology.restlessness * 0.3;
    ecology.restCycle = 24 + hashNumber(seed * 197 + 19) * 41;
    return ecology;
  }

  function setState(ecology, nextState, time, minimumDuration) {
    if (ecology.state === nextState) return;
    ecology.previousState = ecology.state;
    ecology.state = nextState;
    ecology.stateAge = 0;
    ecology.lastTransition = time;
    ecology.stateUntil = time + minimumDuration;
  }

  function getNumber(object, key, fallback) {
    var value = object && object[key];
    return Number.isFinite(value) ? value : fallback;
  }

  function createSteeringOutput() {
    return {
      steerX: 0,
      steerY: 0,
      speedScale: 1,
      flowScale: 1,
      foodSeekScale: 1,
      schoolingScale: 1,
      separationScale: 1,
      feedingScale: 1,
      depthOffset: 0,
      animationRate: 1,
      glowBoost: 0,
      disturbance: 0,
      state: STATE.WANDERING,
      stateName: STATE_NAMES[STATE.WANDERING]
    };
  }

  function resetSteering(out, state) {
    out.steerX = 0;
    out.steerY = 0;
    out.speedScale = 1;
    out.flowScale = 1;
    out.foodSeekScale = 1;
    out.schoolingScale = 1;
    out.separationScale = 1;
    out.feedingScale = 1;
    out.depthOffset = 0;
    out.animationRate = 1;
    out.glowBoost = 0;
    out.disturbance = 0;
    out.state = state;
    out.stateName = STATE_NAMES[state];
  }

  function createEventOutput() {
    return {
      type: EVENT.NONE,
      name: EVENT_NAMES.none,
      active: false,
      intensity: 0,
      phase: 0,
      startedAt: 0,
      endsAt: 0,
      duration: 0,
      seed: 0,
      direction: 1,
      x: 0.5,
      depth: 0.5
    };
  }

  function clearEvent(out) {
    out.type = EVENT.NONE;
    out.name = EVENT_NAMES.none;
    out.active = false;
    out.intensity = 0;
    out.phase = 0;
    out.startedAt = 0;
    out.endsAt = 0;
    out.duration = 0;
    out.seed = 0;
    out.direction = 1;
    out.x = 0.5;
    out.depth = 0.5;
  }

  function fillInfluence(out) {
    out.spawnScale = 1;
    out.speedScale = 1;
    out.feedingScale = 1;
    out.schoolingScale = 1;
    out.glowBoost = 0;
    out.depthOffset = 0;
    out.steerX = 0;
    out.steerY = 0;
    out.threat = 0;
    out.visibilityScale = 1;
    out.particleScale = 1;
    return out;
  }

  function createInfluenceOutput() {
    return fillInfluence({});
  }

  function eventInfluence(event, kind, out) {
    var influence = fillInfluence(out || {});
    if (!event.active) return influence;
    var amount = event.intensity;

    if (event.type === EVENT.JELLY_BLOOM) {
      if (kind === "jelly") {
        influence.spawnScale = 1 + 2.6 * amount;
        influence.speedScale = 1 - 0.25 * amount;
        influence.feedingScale = 1 + 0.45 * amount;
        influence.glowBoost = 0.28 * amount;
        influence.depthOffset = -0.08 * amount;
      } else if (kind === "fish") {
        influence.spawnScale = 1 + 0.22 * amount;
        influence.feedingScale = 1 + 0.3 * amount;
      }
    } else if (event.type === EVENT.MIGRATION) {
      if (kind === "fish" || kind === "ray" || kind === "seaGiant") {
        influence.spawnScale = 1 + (kind === "fish" ? 0.8 : 0.3) * amount;
        influence.speedScale = 1 + 0.38 * amount;
        influence.schoolingScale = 1 + 0.55 * amount;
        influence.steerX = event.direction * 0.48 * amount;
        influence.depthOffset = (event.depth - 0.5) * 0.16 * amount;
      }
    } else if (event.type === EVENT.FEEDING_FRENZY) {
      if (kind === "fish") {
        influence.speedScale = 1 + 0.4 * amount;
        influence.schoolingScale = 1 + 0.72 * amount;
        influence.threat = 0.5 * amount;
      } else if (kind === "shark" || kind === "eel") {
        influence.speedScale = 1 + 0.52 * amount;
        influence.feedingScale = 1 + 0.8 * amount;
      }
    } else if (event.type === EVENT.DEEP_QUIET) {
      influence.speedScale = 1 - 0.42 * amount;
      influence.visibilityScale = 1 - 0.24 * amount;
      influence.particleScale = 1 - 0.62 * amount;
      influence.depthOffset = 0.1 * amount;
      if (kind === "jelly" || kind === "hectapus" || kind === "seaGiant") {
        influence.glowBoost = 0.42 * amount;
        influence.visibilityScale = 1;
      }
    } else if (event.type === EVENT.DISTANT_BREACH) {
      if (kind === "fish" || kind === "jelly" || kind === "ray") {
        influence.threat = 0.38 * amount;
        influence.depthOffset = 0.13 * amount;
      }
    } else if (event.type === EVENT.SHADOW_PASSAGE) {
      if (kind !== "seaGiant" && kind !== "leviathan" && kind !== "colossal") {
        influence.threat = 0.62 * amount;
        influence.speedScale = 1 + 0.24 * amount;
        influence.depthOffset = 0.12 * amount;
      }
      influence.glowBoost = 0.08 * amount;
    }
    return influence;
  }

  function create(options) {
    var config = options || {};
    var worldSeed = getNumber(config, "seed", 326.73);
    var epochSeconds = clamp(getNumber(config, "eventEpochSeconds", 270), 180, 600);
    var eventChance = clamp(getNumber(config, "eventChance", 0.72), 0, 1);
    var eventOut = createEventOutput();
    var influenceOut = createInfluenceOutput();
    var steeringOut = createSteeringOutput();
    var lastEventTime = -Infinity;

    function traitsFor(stableId, kind, out) {
      return fillTraits(mixedSeed(worldSeed, stableId, kind), kind, out);
    }

    function ensureAgent(agent, stableId, kind) {
      if (!agent) return null;
      var resolvedKind = kind || agent.kind || "creature";
      var resolvedId = stableId === undefined || stableId === null
        ? (agent.seed === undefined ? resolvedKind : agent.seed)
        : stableId;
      if (!agent.ecology || agent.ecology.kind !== resolvedKind) {
        agent.ecology = createAgentState(mixedSeed(worldSeed, resolvedId, resolvedKind), resolvedKind);
      }
      return agent.ecology;
    }

    function chooseState(ecology, agent, time, context, influence) {
      var kind = ecology.kind;
      var energy = getNumber(context, "energy", getNumber(agent, "energy", 0.65));
      var hunger = clamp(getNumber(context, "hunger", 1 - energy), 0, 1);
      var threat = clamp(getNumber(context, "threat", 0) + influence.threat, 0, 1.5);
      var disturbance = clamp(getNumber(context, "disturbance", 0), 0, 1.5);
      var storm = clamp(getNumber(context, "storm", 0), 0, 1);
      var food = clamp(getNumber(context, "foodLevel", 0), 0, 1.5);
      var curiosity = clamp(getNumber(context, "curiosity", 0), 0, 1.5);
      var shelter = clamp(getNumber(context, "shelter", 0), 0, 1.5);
      var fearThreshold = 0.23 + ecology.boldness * 0.55;

      if (
        stateAllowed(kind, STATE.FLEEING) &&
        (threat > fearThreshold || disturbance > fearThreshold + 0.12)
      ) {
        setState(ecology, STATE.FLEEING, time, 1.8 + (1 - ecology.boldness) * 3.4);
        return;
      }
      if (time < ecology.stateUntil) return;

      if (
        stateAllowed(kind, STATE.SHELTERING) &&
        shelter > 0.12 &&
        storm > 0.48 + ecology.boldness * 0.28
      ) {
        setState(ecology, STATE.SHELTERING, time, 5 + ecology.patience * 7);
      } else if (
        stateAllowed(kind, STATE.FEEDING) &&
        food > 0.2 + ecology.patience * 0.14 &&
        hunger > 0.22
      ) {
        setState(ecology, STATE.FEEDING, time, 2.5 + ecology.patience * 5);
      } else if (
        stateAllowed(kind, STATE.CURIOUS) &&
        curiosity > 0.24 + (1 - ecology.curiosity) * 0.48 &&
        storm < 0.72
      ) {
        setState(ecology, STATE.CURIOUS, time, 2 + ecology.curiosity * 7);
      } else if (
        stateAllowed(kind, STATE.RESTING) &&
        (energy < 0.22 + ecology.metabolism * 0.08 ||
          (time + ecology.seed * ecology.restCycle) % ecology.restCycle < 1.1)
      ) {
        setState(ecology, STATE.RESTING, time, 4 + ecology.patience * 8);
      } else {
        setState(ecology, STATE.WANDERING, time, 2 + ecology.restlessness * 3);
      }
    }

    function stepAgent(agent, dt, time, context, out) {
      var ecology = ensureAgent(
        agent,
        context && context.stableId,
        context && context.kind
      );
      var result = out || steeringOut;
      if (!ecology) {
        resetSteering(result, STATE.WANDERING);
        return result;
      }

      var safeDt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
      var safeTime = Number.isFinite(time) ? time : 0;
      ecology.stateAge += safeDt;
      ecology.decisionTimer -= safeDt;

      updateEvents(safeTime);
      eventInfluence(eventOut, ecology.kind, influenceOut);
      var immediateThreat = getNumber(context, "threat", 0) + influenceOut.threat;
      if (immediateThreat > 0.2 || ecology.decisionTimer <= 0) {
        chooseState(ecology, agent, safeTime, context || EMPTY_CONTEXT, influenceOut);
        ecology.decisionTimer = (0.18 + (1 - ecology.reaction) * 0.52) /
          clamp(ecology.reaction, 0.35, 1.6);
      }

      resetSteering(result, ecology.state);
      var phase = safeTime * ecology.wanderRate + ecology.wanderPhase;
      var dx;
      var dy;
      if (ecology.state === STATE.FEEDING) {
        dx = getNumber(context, "foodDX", 0);
        dy = getNumber(context, "foodDY", 0);
        result.steerX = dx * (0.42 + ecology.metabolism * 0.42);
        result.steerY = dy * (0.42 + ecology.metabolism * 0.42);
        result.speedScale = 0.88 + ecology.metabolism * 0.18;
        result.foodSeekScale = 1.25;
        result.feedingScale = 1.2 + ecology.metabolism * 0.3;
        result.animationRate = 0.9 + ecology.metabolism * 0.25;
      } else if (ecology.state === STATE.CURIOUS) {
        dx = getNumber(context, "curiosityDX", 0);
        dy = getNumber(context, "curiosityDY", 0);
        result.steerX = dx * (0.22 + ecology.curiosity * 0.44);
        result.steerY = dy * (0.22 + ecology.curiosity * 0.44);
        result.speedScale = 0.68 + ecology.curiosity * 0.28;
        result.schoolingScale = 0.72;
        result.animationRate = 0.82;
      } else if (ecology.state === STATE.FLEEING) {
        dx = getNumber(context, "threatDX", 0);
        dy = getNumber(context, "threatDY", 0.28);
        result.steerX = dx * (1.05 + ecology.reaction * 0.7);
        result.steerY = dy * (1.05 + ecology.reaction * 0.7) + 0.18;
        result.speedScale = 1.35 + ecology.reaction * 0.38;
        result.schoolingScale = 1.35;
        result.separationScale = 1.45;
        result.depthOffset = 0.08;
        result.animationRate = 1.45;
        result.disturbance = 0.32;
      } else if (ecology.state === STATE.SHELTERING) {
        dx = getNumber(context, "shelterDX", 0);
        dy = getNumber(context, "shelterDY", 0);
        result.steerX = dx * 0.72;
        result.steerY = dy * 0.72;
        result.speedScale = 0.74;
        result.flowScale = 0.72;
        result.schoolingScale = 0.58;
        result.depthOffset = 0.045;
        result.animationRate = 0.72;
      } else if (ecology.state === STATE.RESTING) {
        result.steerX = Math.cos(phase) * 0.018;
        result.steerY = Math.sin(phase * 0.7) * 0.012;
        result.speedScale = 0.28 + ecology.restlessness * 0.16;
        result.flowScale = 0.82;
        result.foodSeekScale = 0.2;
        result.schoolingScale = 0.52;
        result.animationRate = 0.35;
        result.glowBoost = ecology.glowAffinity * 0.08;
      } else {
        result.steerX = Math.cos(phase) * (0.055 + ecology.restlessness * 0.1);
        result.steerY = Math.sin(phase * 0.73) * (0.035 + ecology.restlessness * 0.055);
        result.speedScale = 0.76 + ecology.restlessness * 0.3;
        result.schoolingScale = 0.72 + ecology.sociability * 0.48;
        result.separationScale = 0.82 + (1 - ecology.sociability) * 0.35;
        result.animationRate = 0.76 + ecology.restlessness * 0.35;
      }

      result.steerX += influenceOut.steerX;
      result.steerY += influenceOut.steerY;
      result.speedScale *= influenceOut.speedScale;
      result.feedingScale *= influenceOut.feedingScale;
      result.schoolingScale *= influenceOut.schoolingScale;
      result.depthOffset += influenceOut.depthOffset + ecology.depthBias;
      result.glowBoost += influenceOut.glowBoost;
      return result;
    }

    function updateEvents(time) {
      var safeTime = Math.max(0, Number.isFinite(time) ? time : 0);
      if (safeTime === lastEventTime) return eventOut;
      lastEventTime = safeTime;
      var epoch = Math.floor(safeTime / epochSeconds);

      var epochSeed = hashNumber(worldSeed * 71.3 + epoch * 31.117);
      if (epochSeed > eventChance) {
        clearEvent(eventOut);
        return eventOut;
      }

      var typeSeed = hashNumber(worldSeed * 83.7 + epoch * 47.91);
      var type = EVENT_TYPES[Math.min(EVENT_TYPES.length - 1, Math.floor(typeSeed * EVENT_TYPES.length))];
      var duration = EVENT_DURATIONS[type];
      var margin = 34;
      var available = Math.max(1, epochSeconds - duration - margin * 2);
      var start = epoch * epochSeconds + margin +
        hashNumber(worldSeed * 97.1 + epoch * 59.27) * available;
      var phase = (safeTime - start) / duration;
      if (phase < 0 || phase > 1) {
        clearEvent(eventOut);
        return eventOut;
      }

      eventOut.type = type;
      eventOut.name = EVENT_NAMES[type];
      eventOut.active = true;
      eventOut.phase = phase;
      eventOut.startedAt = start;
      eventOut.endsAt = start + duration;
      eventOut.duration = duration;
      eventOut.seed = epochSeed;
      eventOut.direction = hashNumber(epochSeed * 211 + 21) > 0.5 ? 1 : -1;
      eventOut.x = hashNumber(epochSeed * 223 + 22) * 0.8 + 0.1;
      eventOut.depth = hashNumber(epochSeed * 227 + 23) * 0.58 + 0.22;
      var edge = Math.min(phase / 0.15, (1 - phase) / 0.2);
      eventOut.intensity = smoothstep(edge);
      return eventOut;
    }

    function getEvent() {
      return eventOut;
    }

    function eventIntensity(type) {
      return eventOut.active && eventOut.type === type ? eventOut.intensity : 0;
    }

    function influenceFor(kind, out) {
      return eventInfluence(eventOut, kind, out || influenceOut);
    }

    function resetAgent(agent) {
      if (agent && agent.ecology) delete agent.ecology;
    }

    return Object.freeze({
      ensureAgent: ensureAgent,
      resetAgent: resetAgent,
      traitsFor: traitsFor,
      stepAgent: stepAgent,
      updateEvents: updateEvents,
      getEvent: getEvent,
      eventIntensity: eventIntensity,
      influenceFor: influenceFor,
      createSteeringOutput: createSteeringOutput,
      createInfluenceOutput: createInfluenceOutput
    });
  }

  global.MareEcology = Object.freeze({
    STATE: STATE,
    STATE_NAMES: STATE_NAMES,
    EVENT: EVENT,
    EVENT_NAMES: EVENT_NAMES,
    create: create,
    stateName: function (state) {
      return STATE_NAMES[state] || "unknown";
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
