(function (root) {
  "use strict";

  /*
   * Mare Infinitus ambient-life helpers.
   *
   * This file deliberately owns no canvas, DOM, timer, or simulation state. All
   * visible results are deterministic functions of seed + simulation time. The
   * renderer may reuse the provided typed arrays and output objects every frame.
   *
   * Suggested draw order in app.js:
   *   water texture -> caustics -> deep silhouettes/absence -> fluid materials
   *   -> fauna -> structure -> platform activity accents.
   */

  var VERSION = "1.0.0";
  var TAU = Math.PI * 2;

  var ROLE = Object.freeze({
    RESIDENT: 0,
    WORKER: 1,
    FISHER: 2,
    GUARD: 3
  });

  var BEHAVIOR = Object.freeze({
    ROAM: 0,
    WORK: 1,
    FISH: 2,
    WATCH: 3,
    SHELTER: 4,
    GATHER: 5,
    GREET_RAFT: 6,
    TRACK_RAUL: 7
  });

  var ROOM_STRIDE = 5;
  var ROOM_LIT = 0;
  var ROOM_OCCUPIED = 1;
  var ROOM_FLICKER = 2;
  var ROOM_CURTAIN = 3;
  var ROOM_ATTENTION = 4;

  var WORKER_STRIDE = 10;
  var WORKER_X = 0;
  var WORKER_DECK = 1;
  var WORKER_DIRECTION = 2;
  var WORKER_STRIDE_PHASE = 3;
  var WORKER_ROLE = 4;
  var WORKER_BEHAVIOR = 5;
  var WORKER_ATTENTION = 6;
  var WORKER_CARRY = 7;
  var WORKER_ARM = 8;
  var WORKER_VISIBLE = 9;

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function saturate(value) {
    return clamp(value, 0, 1);
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function smoothstep(edge0, edge1, value) {
    var amount = saturate((value - edge0) / Math.max(0.000001, edge1 - edge0));
    return amount * amount * (3 - 2 * amount);
  }

  function smootherstep(edge0, edge1, value) {
    var amount = saturate((value - edge0) / Math.max(0.000001, edge1 - edge0));
    return amount * amount * amount * (amount * (amount * 6 - 15) + 10);
  }

  function hash(seed) {
    var value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
    return value - Math.floor(value);
  }

  function signedHash(seed) {
    return hash(seed) * 2 - 1;
  }

  function triangleWave(value) {
    var phase = value - Math.floor(value);
    return 1 - Math.abs(phase * 2 - 1);
  }

  function depthFactor(y, surfaceY, bottomY) {
    return saturate((y - surfaceY) / Math.max(1, bottomY - surfaceY));
  }

  /*
   * Fills out with renderer-ready depth parameters. The glow input is biological
   * emission (0..1), not a generic brightness control. Reusing `out` avoids GC.
   */
  function sampleDepth(y, surfaceY, bottomY, storm, glow, out) {
    out = out || {};
    var depth = depthFactor(y, surfaceY, bottomY);
    var weather = saturate(storm || 0);
    var emission = saturate(glow || 0);
    var light = Math.exp(-depth * (2.35 + weather * 0.9));
    var blueShift = smoothstep(0.05, 0.95, depth);
    var haze = smoothstep(0.18, 1, depth) * (0.64 + weather * 0.18);

    out.depth = depth;
    out.light = saturate(light + emission * (0.08 + depth * 0.15));
    out.visibility = saturate(0.98 - depth * 0.68 - weather * depth * 0.2 + emission * 0.36);
    out.contrast = saturate(1 - haze * 0.72 + emission * 0.18);
    out.saturation = saturate(1 - depth * 0.42 - weather * 0.08 + emission * 0.22);
    out.blueShift = blueShift;
    out.haze = haze;
    out.glow = saturate(emission * (0.42 + depth * 0.92) * (1 - weather * 0.12));
    out.edgeLight = saturate((1 - depth) * 0.24 + emission * (0.38 + depth * 0.52));
    out.particleAlpha = saturate(0.48 - depth * 0.24 - weather * 0.08);
    return out;
  }

  function parseHex(color, out) {
    out = out || [0, 0, 0];
    var value = color.charAt(0) === "#" ? color.slice(1) : color;
    if (value.length === 3) {
      out[0] = parseInt(value.charAt(0) + value.charAt(0), 16);
      out[1] = parseInt(value.charAt(1) + value.charAt(1), 16);
      out[2] = parseInt(value.charAt(2) + value.charAt(2), 16);
    } else {
      out[0] = parseInt(value.slice(0, 2), 16);
      out[1] = parseInt(value.slice(2, 4), 16);
      out[2] = parseInt(value.slice(4, 6), 16);
    }
    return out;
  }

  /* Source/water/abyss are [r,g,b]. Returns the supplied array. */
  function shadeRgb(source, water, abyss, depth, storm, glow, out) {
    out = out || [0, 0, 0];
    var d = saturate(depth);
    var weather = saturate(storm || 0);
    var emission = saturate(glow || 0);
    var haze = smoothstep(0.08, 0.92, d) * (0.5 + weather * 0.16);
    var abyssMix = smoothstep(0.42, 1, d) * (0.46 + weather * 0.16);
    var light = Math.exp(-d * (1.15 + weather * 0.38));
    var glowLift = emission * (12 + d * 30);
    var channel;
    for (channel = 0; channel < 3; channel += 1) {
      var tinted = lerp(source[channel], water[channel], haze);
      tinted = lerp(tinted, abyss[channel], abyssMix);
      out[channel] = Math.round(clamp(tinted * light + glowLift, 0, 255));
    }
    return out;
  }

  function rgbCss(rgb) {
    return "rgb(" + Math.round(rgb[0]) + "," + Math.round(rgb[1]) + "," + Math.round(rgb[2]) + ")";
  }

  /*
   * Quantized, slow-moving surface light. Sampling at integer art-pixel x/y
   * makes broken ribbons instead of smooth vector gradients or elastic bands.
   */
  function sampleCaustic(x, y, time, surfaceY, storm, worldOffsetX) {
    var depth = Math.max(0, y - surfaceY);
    if (depth <= 2) return 0;
    var weather = saturate(storm || 0);
    var px = Math.floor(x + (worldOffsetX || 0));
    var py = Math.floor(y);
    var drift = time * (0.22 + weather * 0.08);
    var bandA = Math.sin(px * 0.21 + py * 0.075 - drift);
    var bandB = Math.sin(px * -0.13 + py * 0.12 + drift * 0.63 + 1.7);
    var focus = Math.abs(bandA + bandB * 0.68);
    var broken = hash(Math.floor(px / 3) * 11.3 + Math.floor(py / 2) * 7.1);
    var attenuation = Math.exp(-depth / 92) * (1 - weather * 0.62);
    return saturate((focus - 1.1 + broken * 0.28) * 2.6) * attenuation;
  }

  function causticPixelVisible(x, y, time, surfaceY, storm, worldOffsetX, density) {
    var strength = sampleCaustic(x, y, time, surfaceY, storm, worldOffsetX);
    return strength > lerp(0.64, 0.28, saturate(density == null ? 0.5 : density));
  }

  /*
   * Elliptical body field with a tapered wake. This can be sampled for both a
   * dim silhouette veil and for the plankton displacement that reveals a huge
   * animal before its actual sprite becomes legible.
   */
  function sampleBodyInfluence(sampleX, sampleY, bodyX, bodyY, radiusX, radiusY, direction, wakeLength, out) {
    out = out || {};
    var dir = direction < 0 ? -1 : 1;
    var rx = Math.max(1, radiusX);
    var ry = Math.max(1, radiusY);
    var dx = (sampleX - bodyX) * dir;
    var dy = sampleY - bodyY;
    var ellipse = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    var body = 1 - smoothstep(0.72, 1.16, ellipse);

    var wakeDistance = Math.max(0, -dx - rx * 0.5);
    var wakeSpan = Math.max(1, wakeLength || rx * 2.4);
    var wakeWidth = ry * lerp(0.7, 0.12, saturate(wakeDistance / wakeSpan));
    var wake = wakeDistance < wakeSpan
      ? (1 - smoothstep(0.35, 1, Math.abs(dy) / Math.max(1, wakeWidth))) *
        (1 - smoothstep(0, wakeSpan, wakeDistance))
      : 0;
    var bow = 0;
    if (dx > rx * 0.55 && dx < rx * 1.6) {
      var bowX = (dx - rx * 0.55) / Math.max(1, rx * 1.05);
      bow = (1 - smoothstep(0, 1, bowX)) *
        (1 - smoothstep(0.5, 1.45, Math.abs(dy) / ry));
    }

    out.body = saturate(body);
    out.wake = saturate(wake);
    out.bow = saturate(bow);
    out.silhouette = saturate(body * 0.88 + wake * 0.16);
    out.planktonAbsence = saturate(body + wake * 0.62 + bow * 0.3);
    out.edge = saturate(1 - Math.abs(ellipse - 0.92) / 0.18) * (1 - body * 0.35);
    return out;
  }

  function sampleBodyField(sampleX, sampleY, bodies, count, out) {
    out = out || {};
    var silhouette = 0;
    var absence = 0;
    var edge = 0;
    var scratch = sampleBodyField._scratch || (sampleBodyField._scratch = {});
    var length = Math.min(count == null ? bodies.length : count, bodies.length);
    for (var i = 0; i < length; i += 1) {
      var body = bodies[i];
      sampleBodyInfluence(
        sampleX, sampleY, body.x, body.y,
        body.radiusX || body.rx || 1,
        body.radiusY || body.ry || 1,
        body.direction || 1,
        body.wakeLength || 0,
        scratch
      );
      silhouette = Math.max(silhouette, scratch.silhouette * (body.opacity == null ? 1 : body.opacity));
      absence = Math.max(absence, scratch.planktonAbsence);
      edge = Math.max(edge, scratch.edge * (body.glow == null ? 0.2 : body.glow));
    }
    out.silhouette = silhouette;
    out.planktonAbsence = absence;
    out.edgeGlow = edge;
    out.planktonMultiplier = 1 - absence * 0.92;
    return out;
  }

  function normalizedSignals(signals, out) {
    out = out || {};
    signals = signals || {};
    out.activity = clamp(signals.activity == null ? 1 : signals.activity, 0, 2.5);
    out.storm = saturate(signals.storm || 0);
    out.night = saturate(signals.night == null ? 0.7 : signals.night);
    out.raft = saturate(signals.raftProximity || 0);
    out.raul = saturate(signals.raulProximity || 0);
    out.creature = saturate(signals.creatureProximity || 0);
    out.stress = saturate(signals.structureStress || 0);
    return out;
  }

  function createPlatformState(seed, roomCount, workerCount) {
    var rooms = Math.max(1, Math.floor(roomCount || 42));
    var workers = Math.max(1, Math.floor(workerCount || 38));
    return {
      seed: Number(seed) || 326,
      roomCount: rooms,
      workerCount: workers,
      rooms: new Float32Array(rooms * ROOM_STRIDE),
      workers: new Float32Array(workers * WORKER_STRIDE),
      events: {
        alert: 0,
        gather: 0,
        craneActive: 0,
        cranePhase: 0,
        craneX: 0.16,
        craneHook: 0,
        doorOpen: 0,
        doorX: 0.51,
        fishingActive: 0,
        fishingX: 0.72,
        fishingDepth: 0,
        fishingSway: 0,
        beacon: 0
      },
      _signals: {},
      time: 0
    };
  }

  function sampleRoom(seed, index, time, signals, out, offset) {
    offset = offset || 0;
    var roomSeed = seed + index * 19.371;
    var cycleLength = 95 + hash(roomSeed + 1) * 210;
    var cycle = (time / cycleLength + hash(roomSeed + 2)) % 1;
    var occupied = cycle > 0.1 && cycle < 0.82 ? 1 : 0;
    var response = Math.max(signals.raft * 0.46, signals.raul * 0.34, signals.creature * 0.88);
    var baseChance = 0.14 + signals.night * 0.64 + signals.activity * 0.08;
    var stableChoice = hash(roomSeed + Math.floor(time / cycleLength) * 4.13);
    var lit = occupied && stableChoice < baseChance ? 1 : 0;
    if (signals.storm > 0.72 && hash(roomSeed + Math.floor(time / 12) * 3.7) < signals.stress * 0.05) lit = 0;
    if (response > 0.35 && index % 5 !== 1) lit = 1;

    var flicker = 0;
    if (lit && signals.stress > 0.72) {
      var flickerCycle = 22 + hash(roomSeed + 8.4) * 34;
      var flickerPhase = (time + hash(roomSeed + 9.7) * flickerCycle) % flickerCycle;
      flicker = flickerPhase < 0.16 && hash(roomSeed + Math.floor(time / flickerCycle) * 5.3) < signals.stress * 0.42 ? 1 : 0;
    }
    var curtain = lit && hash(roomSeed + Math.floor(time / 47)) > 0.76 ? 1 : 0;

    out[offset + ROOM_LIT] = lit;
    out[offset + ROOM_OCCUPIED] = occupied;
    out[offset + ROOM_FLICKER] = flicker;
    out[offset + ROOM_CURTAIN] = curtain;
    out[offset + ROOM_ATTENTION] = response;
    return out;
  }

  function roleForWorker(seed, index) {
    var choice = hash(seed + index * 8.17);
    if (choice > 0.91) return ROLE.GUARD;
    if (choice > 0.67) return ROLE.FISHER;
    if (choice > 0.34) return ROLE.WORKER;
    return ROLE.RESIDENT;
  }

  function sampleWorker(seed, index, time, signals, out, offset) {
    offset = offset || 0;
    var workerSeed = seed + index * 31.733;
    var role = roleForWorker(seed, index);
    var deck = index % 5 === 0 ? 1 : 0;
    var baseX = 0.03 + hash(workerSeed + 2) * 0.92;
    var speed = (0.006 + hash(workerSeed + 3) * 0.012) * signals.activity;
    var roamRange = role === ROLE.GUARD ? 0.14 : role === ROLE.FISHER ? 0.045 : 0.09;
    var roam = signedHash(workerSeed + 4) * 0.03 +
      Math.sin(time * speed * TAU + hash(workerSeed + 5) * TAU) * roamRange;
    var x = clamp(baseX + roam, 0.015, 0.985);
    var direction = Math.cos(time * speed * TAU + hash(workerSeed + 5) * TAU) >= 0 ? 1 : -1;
    var behavior = role === ROLE.FISHER ? BEHAVIOR.FISH : role === ROLE.WORKER ? BEHAVIOR.WORK : BEHAVIOR.ROAM;
    var attention = 0;

    if (signals.storm > 0.72) {
      behavior = BEHAVIOR.SHELTER;
      attention = signals.storm;
      x += (0.55 - x) * smoothstep(0.72, 1, signals.storm) * 0.72;
      direction = x < 0.55 ? 1 : -1;
    } else if (signals.creature > 0.28) {
      behavior = index % 4 === 0 ? BEHAVIOR.WATCH : BEHAVIOR.GATHER;
      attention = signals.creature;
      x += (0.36 - x) * signals.creature * 0.56;
      direction = -1;
    } else if (signals.raul > 0.3) {
      behavior = BEHAVIOR.TRACK_RAUL;
      attention = signals.raul;
      direction = index % 2 ? 1 : -1;
    } else if (signals.raft > 0.22) {
      behavior = index % 3 === 0 ? BEHAVIOR.GREET_RAFT : BEHAVIOR.WATCH;
      attention = signals.raft;
      x += (0.08 - x) * signals.raft * 0.48;
      direction = -1;
    }

    var idleWindow = hash(workerSeed + Math.floor(time / 23) * 9.1);
    var visible = idleWindow > 0.09 || attention > 0.25 ? 1 : 0;
    var carry = role === ROLE.WORKER && behavior === BEHAVIOR.WORK && hash(workerSeed + 8) > 0.46 ? 1 : 0;
    var arm = attention > 0.28
      ? (Math.sin(time * 2.2 + index) > 0.2 ? 1 : 0)
      : (carry ? 0.5 : 0);

    out[offset + WORKER_X] = clamp(x, 0.01, 0.99);
    out[offset + WORKER_DECK] = deck;
    out[offset + WORKER_DIRECTION] = direction;
    out[offset + WORKER_STRIDE_PHASE] = time * (0.8 + speed * 28) + index * 1.73;
    out[offset + WORKER_ROLE] = role;
    out[offset + WORKER_BEHAVIOR] = behavior;
    out[offset + WORKER_ATTENTION] = attention;
    out[offset + WORKER_CARRY] = carry;
    out[offset + WORKER_ARM] = arm;
    out[offset + WORKER_VISIBLE] = visible;
    return out;
  }

  function samplePlatformEvents(seed, time, signals, events) {
    var activity = signals.activity;
    var craneCycle = (time * (0.018 + activity * 0.004) + hash(seed + 77)) % 1;
    var fishingCycle = (time * 0.011 + hash(seed + 91)) % 1;
    var doorCycle = (time * 0.027 + hash(seed + 113)) % 1;
    var alert = Math.max(signals.creature, signals.storm * 0.72);

    events.alert = alert;
    events.gather = Math.max(signals.creature, signals.raft * 0.64);
    events.craneActive = craneCycle < 0.72 && signals.storm < 0.75 ? 1 : 0;
    events.cranePhase = events.craneActive ? smootherstep(0, 0.72, craneCycle) : 0;
    events.craneX = 0.12 + Math.sin(time * 0.018 + seed) * 0.035;
    events.craneHook = triangleWave(craneCycle / 0.72) * (1 - signals.storm * 0.42);
    events.doorOpen = saturate(1 - Math.abs(doorCycle - 0.5) / 0.17);
    events.doorX = 0.48 + hash(seed + Math.floor(time / 37)) * 0.12;
    events.fishingActive = fishingCycle < 0.76 && signals.storm < 0.62 ? 1 : 0;
    events.fishingX = 0.69 + hash(seed + 97) * 0.2;
    events.fishingDepth = events.fishingActive * (0.32 + triangleWave(fishingCycle / 0.76) * 0.48);
    events.fishingSway = Math.sin(time * 0.31 + seed * 0.13) * (0.12 + signals.storm * 0.17);
    events.beacon = alert > 0.34
      ? (Math.floor(time * lerp(1.2, 3.8, alert)) % 2)
      : (Math.floor(time / 4.2) % 7 === 0 ? 1 : 0);
    return events;
  }

  function updatePlatformState(state, time, signals) {
    var normalized = normalizedSignals(signals, state._signals);
    var i;
    for (i = 0; i < state.roomCount; i += 1) {
      sampleRoom(state.seed, i, time, normalized, state.rooms, i * ROOM_STRIDE);
    }
    for (i = 0; i < state.workerCount; i += 1) {
      sampleWorker(state.seed, i, time, normalized, state.workers, i * WORKER_STRIDE);
    }
    samplePlatformEvents(state.seed, time, normalized, state.events);
    state.time = time;
    return state;
  }

  function selfCheck() {
    var stateA = createPlatformState(326, 8, 8);
    var stateB = createPlatformState(326, 8, 8);
    var signals = { activity: 1.6, storm: 0.2, night: 0.8, raftProximity: 0.6 };
    updatePlatformState(stateA, 123.45, signals);
    updatePlatformState(stateB, 123.45, signals);
    var deterministic = true;
    var i;
    for (i = 0; i < stateA.rooms.length; i += 1) {
      if (stateA.rooms[i] !== stateB.rooms[i]) deterministic = false;
    }
    for (i = 0; i < stateA.workers.length; i += 1) {
      if (stateA.workers[i] !== stateB.workers[i]) deterministic = false;
    }
    var depth = sampleDepth(170, 86, 240, 0.3, 0.4, {});
    var influence = sampleBodyInfluence(50, 50, 50, 50, 20, 8, 1, 50, {});
    return {
      ok: deterministic && depth.depth > 0 && depth.depth < 1 && influence.planktonAbsence > 0.9,
      deterministic: deterministic,
      depthInRange: depth.depth > 0 && depth.depth < 1,
      bodyFieldInRange: influence.planktonAbsence >= 0 && influence.planktonAbsence <= 1
    };
  }

  root.MareAmbientLife = Object.freeze({
    version: VERSION,
    ROLE: ROLE,
    BEHAVIOR: BEHAVIOR,
    ROOM_STRIDE: ROOM_STRIDE,
    ROOM_FIELDS: Object.freeze({
      lit: ROOM_LIT,
      occupied: ROOM_OCCUPIED,
      flicker: ROOM_FLICKER,
      curtain: ROOM_CURTAIN,
      attention: ROOM_ATTENTION
    }),
    WORKER_STRIDE: WORKER_STRIDE,
    WORKER_FIELDS: Object.freeze({
      x: WORKER_X,
      deck: WORKER_DECK,
      direction: WORKER_DIRECTION,
      stridePhase: WORKER_STRIDE_PHASE,
      role: WORKER_ROLE,
      behavior: WORKER_BEHAVIOR,
      attention: WORKER_ATTENTION,
      carry: WORKER_CARRY,
      arm: WORKER_ARM,
      visible: WORKER_VISIBLE
    }),
    depthFactor: depthFactor,
    sampleDepth: sampleDepth,
    parseHex: parseHex,
    shadeRgb: shadeRgb,
    rgbCss: rgbCss,
    sampleCaustic: sampleCaustic,
    causticPixelVisible: causticPixelVisible,
    sampleBodyInfluence: sampleBodyInfluence,
    sampleBodyField: sampleBodyField,
    createPlatformState: createPlatformState,
    sampleRoom: sampleRoom,
    sampleWorker: sampleWorker,
    samplePlatformEvents: samplePlatformEvents,
    updatePlatformState: updatePlatformState,
    selfCheck: selfCheck,
    integration: Object.freeze({
      script: "Load systems/ambient-life.js before app.js.",
      depth: "Call sampleDepth(y, line, height, storm, creatureGlow, reusedObject) before drawing each sprite class; use visibility as alpha and glow only for emissive markings.",
      color: "Parse palette colors once, then pass RGB triplets to shadeRgb with a reused output array. rgbCss is convenient but allocates a string, so cache results by depth band.",
      caustics: "Sample on a sparse integer grid after the water texture. Draw one-art-pixel fragments only when causticPixelVisible returns true.",
      silhouettes: "Describe active deep creatures as {x,y,radiusX,radiusY,direction,wakeLength,opacity,glow}; sampleBodyField can suppress plankton and reveal their edge before drawing the bodies.",
      platform: "Create one state at startup, update it with absolute simulation time, then map normalized worker x values into platform geometry. Room and worker typed arrays are stable and reusable.",
      reactions: "Pass 0..1 raftProximity, raulProximity, creatureProximity, storm, night, structureStress, plus platform activity. Reactions resolve storm > creature > Raul > raft.",
      pixels: "All positions are in the internal art-pixel coordinate system; round only at draw time so motion stays fluid while every rendered mark remains a real pixel."
    })
  });
}(typeof window !== "undefined" ? window : globalThis));
