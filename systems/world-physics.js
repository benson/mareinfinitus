(function (root) {
  "use strict";

  // Broad-phase sensing and shared water/body contacts. Positions are in art
  // pixels and velocities in simulation units, matching app.js.
  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function create(options) {
    var settings = options || {};
    var cellSize = Math.max(12, settings.cellSize || 30);
    var buckets = Object.create(null);
    var agents = [];
    var senseOutput = {
      neighborCount: 0, centerX: 0, centerY: 0, velocityX: 0, velocityY: 0,
      separationX: 0, separationY: 0, nearest: null, nearestDistance: Infinity
    };

    function key(col, row) {
      return col + ":" + row;
    }

    function rebuild(nextAgents) {
      buckets = Object.create(null);
      agents = nextAgents || [];
      for (var i = 0; i < agents.length; i += 1) {
        var agent = agents[i];
        var col = Math.floor(agent.x / cellSize);
        var row = Math.floor(agent.y / cellSize);
        var bucketKey = key(col, row);
        if (!buckets[bucketKey]) buckets[bucketKey] = [];
        buckets[bucketKey].push(agent);
      }
    }

    function sense(agent, radius, predicate, out) {
      var result = out || senseOutput;
      result.neighborCount = 0;
      result.centerX = 0;
      result.centerY = 0;
      result.velocityX = 0;
      result.velocityY = 0;
      result.separationX = 0;
      result.separationY = 0;
      result.nearest = null;
      result.nearestDistance = Infinity;
      var startCol = Math.floor((agent.x - radius) / cellSize);
      var endCol = Math.floor((agent.x + radius) / cellSize);
      var startRow = Math.floor((agent.y - radius) / cellSize);
      var endRow = Math.floor((agent.y + radius) / cellSize);
      var radius2 = radius * radius;
      for (var row = startRow; row <= endRow; row += 1) {
        for (var col = startCol; col <= endCol; col += 1) {
          var bucket = buckets[key(col, row)];
          if (!bucket) continue;
          for (var i = 0; i < bucket.length; i += 1) {
            var other = bucket[i];
            if (other === agent || (predicate && !predicate(other))) continue;
            var dx = other.x - agent.x;
            var dy = other.y - agent.y;
            var distance2 = dx * dx + dy * dy;
            if (distance2 <= 0.001 || distance2 > radius2) continue;
            var distance = Math.sqrt(distance2);
            result.neighborCount += 1;
            result.centerX += other.x;
            result.centerY += other.y;
            result.velocityX += other.vx || 0;
            result.velocityY += other.vy || 0;
            var personal = Math.max(4, ((agent.size || 1) + (other.size || 1)) * 3.2);
            if (distance < personal) {
              var pressure = 1 - distance / personal;
              result.separationX -= dx / distance * pressure;
              result.separationY -= dy / distance * pressure;
            }
            if (distance < result.nearestDistance) {
              result.nearestDistance = distance;
              result.nearest = other;
            }
          }
        }
      }
      if (result.neighborCount) {
        var inverse = 1 / result.neighborCount;
        result.centerX *= inverse;
        result.centerY *= inverse;
        result.velocityX *= inverse;
        result.velocityY *= inverse;
      }
      return result;
    }

    // Approximates the displaced water around a body with a head pressure and
    // a counter-rotating wake pair. The callback keeps this engine independent
    // of the host fluid grid.
    function coupleBody(agent, dt, inject, options) {
      if (!inject || dt <= 0) return;
      var opts = options || {};
      var motion = agent.motion;
      var speed = motion ? motion.speed : Math.sqrt((agent.vx || 0) * (agent.vx || 0) + (agent.vy || 0) * (agent.vy || 0));
      if (speed < 0.025) return;
      var profile = motion && motion.profile ? motion.profile : { wake: 0.4, mass: 1 };
      var vx = agent.vx || 0;
      var vy = agent.vy || 0;
      var inv = 1 / Math.max(speed, 0.001);
      var nx = -vy * inv;
      var ny = vx * inv;
      var size = Math.max(1, agent.physicalSize || agent.size || 1);
      var reach = clamp(3 + Math.sqrt(profile.mass) * 2.6 * size, 3, 34);
      var strength = clamp(speed * profile.wake * dt * (opts.strength || 1), 0, 0.72);
      var tailX = agent.x - vx * inv * reach;
      var tailY = agent.y - vy * inv * reach;
      inject(agent.x + vx * inv * reach * 0.35, agent.y + vy * inv * reach * 0.35, vx * strength * 0.45, vy * strength * 0.45, reach * 0.55);
      inject(tailX + nx * reach * 0.32, tailY + ny * reach * 0.32, nx * strength + vx * strength * 0.2, ny * strength + vy * strength * 0.2, reach);
      inject(tailX - nx * reach * 0.32, tailY - ny * reach * 0.32, -nx * strength + vx * strength * 0.2, -ny * strength + vy * strength * 0.2, reach);
    }

    function surfaceContact(body, dt, sampleSurface, options) {
      var opts = options || {};
      var sampleOffset = Number.isFinite(opts.sampleOffset) ? opts.sampleOffset : 0;
      var targetOffset = Number.isFinite(opts.targetOffset) ? opts.targetOffset : 0;
      var stiffness = Number.isFinite(opts.stiffness) ? opts.stiffness : 5;
      var damping = Number.isFinite(opts.damping) ? opts.damping : 3;
      var surface = sampleSurface(body.x + sampleOffset);
      var targetY = surface + targetOffset;
      body.vy = Number.isFinite(body.vy) ? body.vy : 0;
      var error = targetY - body.y;
      body.vy += (error * stiffness - body.vy * damping) * dt;
      body.y += body.vy * dt;
      return { surfaceY: surface, targetY: targetY, displacement: error, velocity: body.vy };
    }

    function depthSeparation(a, b) {
      var ad = Number.isFinite(a.visualDepth) ? a.visualDepth : (a.depthTarget || 0.5);
      var bd = Number.isFinite(b.visualDepth) ? b.visualDepth : (b.depthTarget || 0.5);
      return Math.abs(ad - bd);
    }

    function updateAttention(agent, candidates, time, score, holdSeconds) {
      var duration = Number.isFinite(holdSeconds) ? holdSeconds : 2.6;
      var current = agent.attention && agent.attention.target;
      var currentValid = current && candidates.indexOf(current) >= 0;
      if (currentValid && time < agent.attention.until) return current;
      var best = null;
      var bestScore = -Infinity;
      for (var i = 0; i < candidates.length; i += 1) {
        var candidate = candidates[i];
        if (!candidate || candidate === agent) continue;
        var candidateScore = score ? score(candidate) : 0;
        // A small incumbent bias prevents nearly equal stimuli from causing
        // frame-to-frame gaze and pursuit switching.
        if (candidate === current) candidateScore += 0.08;
        if (candidateScore > bestScore) {
          best = candidate;
          bestScore = candidateScore;
        }
      }
      agent.attention = {
        target: best,
        until: time + duration * (0.84 + ((agent.seed || 0.5) % 1) * 0.32),
        score: bestScore
      };
      return best;
    }

    function selfCheck() {
      var a = { x: 0, y: 0, vx: 1, vy: 0, size: 1 };
      var b = { x: 3, y: 0, vx: 1, vy: 0, size: 1 };
      rebuild([a, b]);
      var sensed = sense(a, 10, null, {});
      return sensed.neighborCount === 1 && sensed.separationX < 0 && depthSeparation(a, b) === 0;
    }

    return Object.freeze({
      rebuild: rebuild,
      sense: sense,
      coupleBody: coupleBody,
      surfaceContact: surfaceContact,
      depthSeparation: depthSeparation,
      updateAttention: updateAttention,
      selfCheck: selfCheck
    });
  }

  root.MareWorldPhysics = Object.freeze({ version: "1.0.0", create: create });
})(typeof window !== "undefined" ? window : globalThis);
