(function (root) {
  "use strict";

  // A tiny, canvas-independent volumetric light solver. The host supplies the
  // moving water profile; this module owns aim inertia, ray/surface collision,
  // refraction, and continuous pixel-field rasterization.

  var VERSION = "1.0.0";

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function createMotion(angle) {
    return { angle: Number(angle) || 0, velocity: 0, active: false };
  }

  function resetMotion(motion, angle) {
    motion.angle = Number(angle) || 0;
    motion.velocity = 0;
    motion.active = true;
    return motion;
  }

  function stepMotion(motion, targetAngle, dt, response, damping) {
    var step = clamp(Number(dt) || 0, 0, 0.05);
    var stiffness = Number(response) || 8.5;
    var drag = Number(damping) || 5.8;
    var acceleration = (targetAngle - motion.angle) * stiffness - motion.velocity * drag;
    motion.velocity = clamp(motion.velocity + acceleration * step, -0.72, 0.72);
    motion.angle += motion.velocity * step;
    motion.active = true;
    return motion.angle;
  }

  function surfaceHit(originX, originY, directionX, directionY, maxDistance, surfaceAt) {
    var stride = 0.75;
    var previousDistance = 0;
    var previousGap = originY - surfaceAt(originX);
    for (var distance = stride; distance <= maxDistance; distance += stride) {
      var x = originX + directionX * distance;
      var y = originY + directionY * distance;
      var gap = y - surfaceAt(x);
      if (gap >= 0 && previousGap < 0) {
        var low = previousDistance;
        var high = distance;
        for (var refine = 0; refine < 7; refine += 1) {
          var middle = (low + high) * 0.5;
          var middleX = originX + directionX * middle;
          var middleY = originY + directionY * middle;
          if (middleY - surfaceAt(middleX) >= 0) high = middle;
          else low = middle;
        }
        var hitDistance = (low + high) * 0.5;
        var hitX = originX + directionX * hitDistance;
        return { x: hitX, y: surfaceAt(hitX), distance: hitDistance };
      }
      previousDistance = distance;
      previousGap = gap;
    }
    var endX = originX + directionX * maxDistance;
    return { x: endX, y: originY + directionY * maxDistance, distance: maxDistance };
  }

  function refract(directionX, directionY, hitX, surfaceAt, refractiveIndex) {
    var sample = 1.25;
    var slope = (surfaceAt(hitX + sample) - surfaceAt(hitX - sample)) / (sample * 2);
    var normalX = slope;
    var normalY = -1;
    var normalLength = Math.sqrt(normalX * normalX + normalY * normalY) || 1;
    normalX /= normalLength;
    normalY /= normalLength;
    var cosine = -(normalX * directionX + normalY * directionY);
    if (cosine < 0) {
      normalX *= -1;
      normalY *= -1;
      cosine *= -1;
    }
    var eta = 1 / Math.max(1.001, refractiveIndex || 1.333);
    var discriminant = 1 - eta * eta * (1 - cosine * cosine);
    var normalAmount = eta * cosine - Math.sqrt(Math.max(0, discriminant));
    var x = eta * directionX + normalAmount * normalX;
    var y = eta * directionY + normalAmount * normalY;
    var length = Math.sqrt(x * x + y * y) || 1;
    return { x: x / length, y: y / length, normalX: normalX, normalY: normalY };
  }

  function traceRay(angle, options) {
    var directionX = Math.cos(angle);
    var directionY = Math.sin(angle);
    var hit = surfaceHit(
      options.originX,
      options.originY,
      directionX,
      directionY,
      options.maxAirDistance,
      options.surfaceAt
    );
    var transmitted = refract(
      directionX,
      directionY,
      hit.x,
      options.surfaceAt,
      options.refractiveIndex
    );
    var points = [];
    for (var airStep = 0; airStep <= options.airSteps; airStep += 1) {
      var airAmount = airStep / options.airSteps;
      points.push({
        x: lerp(options.originX, hit.x, airAmount),
        y: lerp(options.originY, hit.y, airAmount),
        depth: 0
      });
    }
    for (var waterStep = 1; waterStep <= options.waterSteps; waterStep += 1) {
      var waterAmount = waterStep / options.waterSteps;
      var waterDistance = options.underwaterDistance * waterAmount;
      var waterX = hit.x + transmitted.x * waterDistance;
      var waterY = hit.y + transmitted.y * waterDistance;
      points.push({
        x: waterX,
        y: waterY,
        depth: Math.max(0, waterY - options.surfaceAt(waterX))
      });
    }
    return { points: points, hit: hit, transmitted: transmitted };
  }

  function build(options) {
    var settings = {
      originX: Number(options.originX) || 0,
      originY: Number(options.originY) || 0,
      angle: Number(options.angle) || 0,
      halfAngle: Number(options.halfAngle) || 0.13,
      rayCount: Math.max(5, Math.floor(options.rayCount || 15)),
      airSteps: Math.max(4, Math.floor(options.airSteps || 14)),
      waterSteps: Math.max(6, Math.floor(options.waterSteps || 24)),
      maxAirDistance: Math.max(8, Number(options.maxAirDistance) || 150),
      underwaterDistance: Math.max(8, Number(options.underwaterDistance) || 62),
      refractiveIndex: Math.max(1.001, Number(options.refractiveIndex) || 1.333),
      surfaceAt: options.surfaceAt
    };
    if (typeof settings.surfaceAt !== "function") throw new Error("MareLightField.build requires surfaceAt(x).");
    var rays = [];
    for (var rayIndex = 0; rayIndex < settings.rayCount; rayIndex += 1) {
      var lateral = rayIndex / (settings.rayCount - 1) * 2 - 1;
      rays.push(traceRay(settings.angle + lateral * settings.halfAngle, settings));
    }
    return {
      rays: rays,
      airSteps: settings.airSteps,
      waterSteps: settings.waterSteps,
      rayCount: settings.rayCount,
      attenuationDepth: Math.max(8, Number(options.attenuationDepth) || 48)
    };
  }

  function buildSubmerged(options) {
    var rayCount = Math.max(5, Math.floor(options.rayCount || 13));
    var waterSteps = Math.max(6, Math.floor(options.waterSteps || 20));
    var originX = Number(options.originX) || 0;
    var originY = Number(options.originY) || 0;
    var angle = Number(options.angle) || 0;
    var halfAngle = Number(options.halfAngle) || 0.18;
    var distance = Math.max(8, Number(options.distance) || 48);
    var surfaceAt = options.surfaceAt;
    if (typeof surfaceAt !== "function") throw new Error("MareLightField.buildSubmerged requires surfaceAt(x).");
    var rays = [];
    for (var rayIndex = 0; rayIndex < rayCount; rayIndex += 1) {
      var lateral = rayIndex / (rayCount - 1) * 2 - 1;
      var rayAngle = angle + lateral * halfAngle;
      var directionX = Math.cos(rayAngle);
      var directionY = Math.sin(rayAngle);
      var points = [];
      for (var step = 0; step <= waterSteps; step += 1) {
        var amount = step / waterSteps;
        var rayDistance = distance * amount;
        var x = originX + directionX * rayDistance;
        var y = originY + directionY * rayDistance;
        points.push({ x: x, y: y, depth: Math.max(0, y - surfaceAt(x)) });
      }
      rays.push({
        points: points,
        hit: { x: originX, y: originY, distance: 0 },
        transmitted: { x: directionX, y: directionY, normalX: 0, normalY: -1 }
      });
    }
    return {
      rays: rays,
      airSteps: 0,
      waterSteps: waterSteps,
      rayCount: rayCount,
      attenuationDepth: Math.max(8, Number(options.attenuationDepth) || 48)
    };
  }

  function createRaster(width, height) {
    var size = Math.max(1, width * height);
    return {
      width: width,
      height: height,
      alpha: new Float32Array(size),
      medium: new Uint8Array(size),
      progress: new Float32Array(size),
      minX: width,
      minY: height,
      maxX: -1,
      maxY: -1
    };
  }

  function ensureRaster(raster, width, height) {
    if (!raster || raster.width !== width || raster.height !== height) return createRaster(width, height);
    raster.alpha.fill(0);
    raster.medium.fill(0);
    raster.progress.fill(0);
    raster.minX = width;
    raster.minY = height;
    raster.maxX = -1;
    raster.maxY = -1;
    return raster;
  }

  function triangleContains(px, py, ax, ay, bx, by, cx, cy) {
    var ab = (px - bx) * (ay - by) - (ax - bx) * (py - by);
    var bc = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
    var ca = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
    var hasNegative = ab < 0 || bc < 0 || ca < 0;
    var hasPositive = ab > 0 || bc > 0 || ca > 0;
    return !(hasNegative && hasPositive);
  }

  function quadContains(px, py, a, b, c, d) {
    return triangleContains(px, py, a.x, a.y, b.x, b.y, c.x, c.y) ||
      triangleContains(px, py, a.x, a.y, c.x, c.y, d.x, d.y);
  }

  function rasterize(field, width, height, reusableRaster) {
    var raster = ensureRaster(reusableRaster, width, height);
    var totalSegments = field.airSteps + field.waterSteps;
    for (var rayIndex = 0; rayIndex < field.rayCount - 1; rayIndex += 1) {
      var lateral = Math.abs(((rayIndex + 0.5) / (field.rayCount - 1)) * 2 - 1);
      var edgeFactor = 1 - clamp((lateral - 0.48) / 0.52, 0, 1) * 0.58;
      var leftPoints = field.rays[rayIndex].points;
      var rightPoints = field.rays[rayIndex + 1].points;
      for (var segment = 0; segment < totalSegments; segment += 1) {
        var a = leftPoints[segment];
        var b = rightPoints[segment];
        var c = rightPoints[segment + 1];
        var d = leftPoints[segment + 1];
        var lowX = clamp(Math.floor(Math.min(a.x, b.x, c.x, d.x)) - 1, 0, width - 1);
        var highX = clamp(Math.ceil(Math.max(a.x, b.x, c.x, d.x)) + 1, 0, width - 1);
        var lowY = clamp(Math.floor(Math.min(a.y, b.y, c.y, d.y)) - 1, 0, height - 1);
        var highY = clamp(Math.ceil(Math.max(a.y, b.y, c.y, d.y)) + 1, 0, height - 1);
        var underwater = segment >= field.airSteps;
        var sectionProgress = underwater
          ? (segment - field.airSteps + 0.5) / field.waterSteps
          : (segment + 0.5) / field.airSteps;
        var depth = (a.depth + b.depth + c.depth + d.depth) * 0.25;
        var attenuation = underwater ? Math.exp(-depth / field.attenuationDepth) : 1;
        var baseAlpha = (underwater ? 0.54 : lerp(0.7, 0.52, sectionProgress)) * edgeFactor * attenuation;
        for (var y = lowY; y <= highY; y += 1) {
          for (var x = lowX; x <= highX; x += 1) {
            if (!quadContains(x + 0.5, y + 0.5, a, b, c, d)) continue;
            var index = y * width + x;
            if (baseAlpha <= raster.alpha[index]) continue;
            raster.alpha[index] = baseAlpha;
            raster.medium[index] = underwater ? 1 : 0;
            raster.progress[index] = sectionProgress;
            raster.minX = Math.min(raster.minX, x);
            raster.minY = Math.min(raster.minY, y);
            raster.maxX = Math.max(raster.maxX, x);
            raster.maxY = Math.max(raster.maxY, y);
          }
        }
      }
    }
    return raster;
  }

  root.MareLightField = Object.freeze({
    version: VERSION,
    createMotion: createMotion,
    resetMotion: resetMotion,
    stepMotion: stepMotion,
    build: build,
    buildSubmerged: buildSubmerged,
    createRaster: createRaster,
    rasterize: rasterize
  });
}(typeof window !== "undefined" ? window : globalThis));
