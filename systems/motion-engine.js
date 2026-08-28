(function (root) {
  "use strict";

  // Shared kinematics for every moving body in Mare Infinitus.  The host owns
  // navigation; this module turns measured movement into coherent anatomy.
  var TAU = Math.PI * 2;
  var PROFILES = Object.freeze({
    fish:     { mass: 1.0, cadence: 1.15, turn: 3.2, flex: 0.78, wave: 1.15, segments: 6, wake: 0.42 },
    jelly:    { mass: 0.7, cadence: 0.42, turn: 1.4, flex: 0.30, wave: 0.52, segments: 4, wake: 0.20 },
    eel:      { mass: 1.2, cadence: 0.38, turn: 1.2, flex: 1.18, wave: 1.34, segments: 10, wake: 0.48 },
    ray:      { mass: 2.6, cadence: 0.34, turn: 1.1, flex: 0.44, wave: 0.72, segments: 6, wake: 0.66 },
    shark:    { mass: 4.0, cadence: 0.62, turn: 0.95, flex: 0.58, wave: 0.88, segments: 8, wake: 0.86 },
    hectapus: { mass: 2.1, cadence: 0.30, turn: 0.9, flex: 0.34, wave: 0.60, segments: 5, wake: 0.54 },
    seaGiant: { mass: 13, cadence: 0.18, turn: 0.38, flex: 0.62, wave: 0.54, segments: 12, wake: 1.35 },
    leviathan:{ mass: 38, cadence: 0.11, turn: 0.18, flex: 0.78, wave: 0.40, segments: 16, wake: 2.2 },
    colossal: { mass: 110, cadence: 0.055, turn: 0.08, flex: 1.05, wave: 0.28, segments: 22, wake: 3.4 }
  });

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function mix(a, b, amount) {
    return a + (b - a) * amount;
  }

  function wrapAngle(angle) {
    while (angle > Math.PI) angle -= TAU;
    while (angle < -Math.PI) angle += TAU;
    return angle;
  }

  function profileFor(kind) {
    return PROFILES[kind] || PROFILES.fish;
  }

  function createState(agent) {
    var kind = agent.kind || "fish";
    var profile = profileFor(kind);
    var heading = Math.atan2(agent.vy || 0, agent.vx || agent.direction || 1);
    var state = {
      kind: kind,
      heading: heading,
      visualHeading: heading,
      speed: 0,
      acceleration: 0,
      previousSpeed: 0,
      phase: (agent.seed || 0) * TAU,
      bodyWave: 0,
      tail: 0,
      fin: 0,
      pulse: 1,
      bob: 0,
      turn: 0,
      propulsion: 0,
      lastDirectionChange: -Infinity,
      facing: agent.direction || 1,
      profile: profile,
      spine: new Float32Array((profile.segments + 1) * 2)
    };
    agent.motion = state;
    return state;
  }

  function ensureAgent(agent) {
    if (!agent.motion || agent.motion.kind !== agent.kind) return createState(agent);
    return agent.motion;
  }

  function updateAgent(agent, dt, time) {
    var state = ensureAgent(agent);
    var profile = state.profile;
    var vx = Number.isFinite(agent.vx) ? agent.vx : 0;
    var vy = Number.isFinite(agent.vy) ? agent.vy : 0;
    var speed = Math.sqrt(vx * vx + vy * vy);
    var desiredHeading = speed > 0.025 ? Math.atan2(vy, vx) : state.heading;
    var response = 1 - Math.exp(-dt * profile.turn);
    var headingDelta = wrapAngle(desiredHeading - state.heading);
    var maxTurn = dt * profile.turn * (0.28 + 0.72 / Math.sqrt(profile.mass));
    state.heading += clamp(headingDelta, -maxTurn, maxTurn) * response * 2.2;
    state.heading = wrapAngle(state.heading);
    state.visualHeading += wrapAngle(state.heading - state.visualHeading) * (1 - Math.exp(-dt * profile.turn * 0.72));
    state.visualHeading = wrapAngle(state.visualHeading);

    var speedBlend = 1 - Math.exp(-dt * 2.4);
    state.previousSpeed = state.speed;
    state.speed = mix(state.speed, speed, speedBlend);
    state.acceleration = mix(state.acceleration, (state.speed - state.previousSpeed) / Math.max(dt, 0.001), 1 - Math.exp(-dt * 3));
    state.turn = mix(state.turn, headingDelta / Math.max(dt, 0.001), 1 - Math.exp(-dt * 2.1));

    var drive = clamp(state.speed / (0.48 + Math.sqrt(profile.mass) * 0.24), 0, 1);
    state.propulsion = mix(state.propulsion, drive, 1 - Math.exp(-dt * 2.6));
    // Cadence is bounded by mass: a large animal can never twitch merely
    // because its navigation velocity changed suddenly.
    var cadence = profile.cadence * mix(0.36, 1, state.propulsion);
    state.phase = (state.phase + dt * TAU * cadence) % TAU;
    state.bodyWave = Math.sin(state.phase) * profile.flex * (0.14 + state.propulsion * 0.86);
    state.tail = Math.sin(state.phase - 0.72) * profile.flex * (0.18 + state.propulsion * 0.82);
    state.fin = Math.sin(state.phase * 0.52 + 0.8) * (0.35 + state.propulsion * 0.65);
    state.pulse = 1 + Math.sin(state.phase) * (agent.kind === "jelly" ? 0.18 : 0.05);
    state.bob = Math.sin(state.phase * 0.5 + (agent.seed || 0) * 9) * (agent.kind === "jelly" ? 0.42 : 0.12);

    var requestedFacing = Math.cos(state.visualHeading) < -0.16 ? -1 : Math.cos(state.visualHeading) > 0.16 ? 1 : state.facing;
    if (requestedFacing !== state.facing && time - state.lastDirectionChange > 2.4 + profile.mass * 0.08) {
      state.facing = requestedFacing;
      state.lastDirectionChange = time;
    }
    agent.direction = state.facing;
    buildSpine(agent, state);
    return state;
  }

  function buildSpine(agent, state) {
    var profile = state.profile;
    var traits = agent.variation || {};
    var length = Math.max(4, (traits.bodyLength || 6) + (traits.tailLength || 2) * 0.72);
    var count = profile.segments;
    var facing = state.facing;
    for (var i = 0; i <= count; i += 1) {
      var u = i / count;
      var along = (0.42 - u) * length;
      var envelope = Math.pow(u, 1.32);
      var lateral = Math.sin(state.phase - u * TAU * profile.wave) * profile.flex * envelope * (0.18 + state.propulsion * 0.82);
      state.spine[i * 2] = agent.x + facing * along;
      state.spine[i * 2 + 1] = agent.y + lateral;
    }
  }

  function poseFor(agent, out) {
    var state = ensureAgent(agent);
    var result = out || {};
    result.phase = state.phase;
    result.tail = state.tail;
    result.fin = state.fin;
    result.pulse = state.pulse;
    result.bob = state.bob;
    result.turn = state.turn;
    result.drive = state.propulsion;
    result.spine = state.spine;
    return result;
  }

  function createChain(x, y, segmentCount, segmentLength, seed) {
    var count = Math.max(2, segmentCount | 0);
    var points = new Float32Array((count + 1) * 2);
    var previous = new Float32Array(points.length);
    for (var i = 0; i <= count; i += 1) {
      var px = x + Math.sin((seed || 0) * 31 + i * 0.8) * i * 0.08;
      var py = y + i * segmentLength;
      points[i * 2] = previous[i * 2] = px;
      points[i * 2 + 1] = previous[i * 2 + 1] = py;
    }
    return { points: points, previous: previous, segmentLength: segmentLength, count: count };
  }

  function resetChain(chain, x, y, directionX, directionY) {
    var dx = Number.isFinite(directionX) ? directionX : 0;
    var dy = Number.isFinite(directionY) ? directionY : 1;
    for (var i = 0; i <= chain.count; i += 1) {
      chain.points[i * 2] = chain.previous[i * 2] = x + dx * chain.segmentLength * i;
      chain.points[i * 2 + 1] = chain.previous[i * 2 + 1] = y + dy * chain.segmentLength * i;
    }
  }

  function updateChain(chain, dt, anchorX, anchorY, sampleFlow, options) {
    var opts = options || {};
    var drag = clamp(Number.isFinite(opts.drag) ? opts.drag : 0.925, 0.72, 0.99);
    var gravity = Number.isFinite(opts.gravity) ? opts.gravity : 0.006;
    var flowScale = Number.isFinite(opts.flowScale) ? opts.flowScale : 0.18;
    var flutter = Number.isFinite(opts.flutter) ? opts.flutter : 0;
    var time = Number.isFinite(opts.time) ? opts.time : 0;
    var seed = Number.isFinite(opts.seed) ? opts.seed : 0;
    var points = chain.points;
    var previous = chain.previous;
    if (Math.abs(points[0] - anchorX) + Math.abs(points[1] - anchorY) > chain.segmentLength * chain.count * 5) {
      resetChain(chain, anchorX, anchorY, 0, 1);
    }
    points[0] = previous[0] = anchorX;
    points[1] = previous[1] = anchorY;
    for (var i = 1; i <= chain.count; i += 1) {
      var slot = i * 2;
      var px = points[slot];
      var py = points[slot + 1];
      var vx = (px - previous[slot]) * drag;
      var vy = (py - previous[slot + 1]) * drag;
      previous[slot] = px;
      previous[slot + 1] = py;
      var flow = sampleFlow ? sampleFlow(px, py) : null;
      var freedom = i / chain.count;
      points[slot] += vx + (flow ? flow.x : 0) * dt * flowScale + Math.sin(time * 0.31 + seed * 19 + i * 0.77) * flutter * freedom;
      points[slot + 1] += vy + gravity * freedom + (flow ? flow.y : 0) * dt * flowScale;
    }
    var iterations = Number.isFinite(opts.iterations) ? opts.iterations : 4;
    for (var iteration = 0; iteration < iterations; iteration += 1) {
      points[0] = anchorX;
      points[1] = anchorY;
      for (var segment = 1; segment <= chain.count; segment += 1) {
        var b = segment * 2;
        var a = b - 2;
        var dx = points[b] - points[a];
        var dy = points[b + 1] - points[a + 1];
        var distance = Math.sqrt(dx * dx + dy * dy) || 1;
        var correction = (distance - chain.segmentLength) / distance;
        if (segment === 1) {
          points[b] -= dx * correction;
          points[b + 1] -= dy * correction;
        } else {
          points[a] += dx * correction * 0.48;
          points[a + 1] += dy * correction * 0.48;
          points[b] -= dx * correction * 0.52;
          points[b + 1] -= dy * correction * 0.52;
        }
      }
    }
    points[0] = anchorX;
    points[1] = anchorY;
    return chain;
  }

  function selfCheck() {
    var test = { kind: "eel", x: 10, y: 10, vx: 0.4, vy: 0.02, direction: 1, seed: 0.4 };
    var state = updateAgent(test, 1 / 60, 1);
    var chain = createChain(0, 0, 4, 2, 1);
    updateChain(chain, 1 / 60, 0, 0, null, {});
    return Number.isFinite(state.phase) && state.spine.length === 22 && chain.points.length === 10;
  }

  root.MareMotion = Object.freeze({
    version: "1.0.0",
    profiles: PROFILES,
    profileFor: profileFor,
    ensureAgent: ensureAgent,
    updateAgent: updateAgent,
    poseFor: poseFor,
    createChain: createChain,
    resetChain: resetChain,
    updateChain: updateChain,
    selfCheck: selfCheck
  });
})(typeof window !== "undefined" ? window : globalThis);
