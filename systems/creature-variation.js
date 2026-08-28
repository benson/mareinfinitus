(function (root) {
  "use strict";

  // Deterministic morphology and motion vocabulary for Mare Infinitus fauna.
  // All dimensions are expressed in the simulator's low-resolution art pixels;
  // callers should continue scaling the finished canvas with nearest-neighbor.

  var TAU = Math.PI * 2;
  var KIND_ALIASES = {
    fish: "fish",
    jelly: "jelly",
    jellyfish: "jelly",
    eel: "eel",
    ray: "ray",
    shark: "shark",
    rainbowShark: "shark",
    hectapus: "hectapus",
    seaGiant: "seaGiant",
    leviathan: "leviathan",
    lampMouth: "leviathan",
    colossal: "colossal",
    cephaloChordate: "colossal"
  };

  var KIND_CODE = {
    fish: 0x1f123bb5,
    jelly: 0x2a317d91,
    eel: 0x38d9ef47,
    ray: 0x451c92d3,
    shark: 0x58ba103d,
    hectapus: 0x69f7d2a1,
    seaGiant: 0x7c41e89b,
    leviathan: 0x8de35f17,
    colossal: 0x9fb072c5
  };

  var DEFAULTS = {
    fish: {
      length: 5, height: 3, fin: 2, tail: 3, segments: 3, tentacles: 0,
      cadence: 1.45, flex: 0.82, waves: 1.05, pulse: 0.12, bob: 0.2
    },
    jelly: {
      length: 5, height: 3, fin: 0, tail: 0, segments: 2, tentacles: 4,
      cadence: 0.58, flex: 0.2, waves: 0.5, pulse: 0.3, bob: 0.48
    },
    eel: {
      length: 10, height: 2, fin: 1, tail: 2, segments: 7, tentacles: 0,
      cadence: 0.92, flex: 1.2, waves: 1.4, pulse: 0.08, bob: 0.16
    },
    ray: {
      length: 8, height: 3, fin: 5, tail: 6, segments: 3, tentacles: 0,
      cadence: 0.46, flex: 0.3, waves: 0.7, pulse: 0.16, bob: 0.18
    },
    shark: {
      length: 13, height: 5, fin: 4, tail: 5, segments: 4, tentacles: 0,
      cadence: 0.82, flex: 0.7, waves: 0.92, pulse: 0.1, bob: 0.12
    },
    hectapus: {
      length: 9, height: 7, fin: 1, tail: 0, segments: 3, tentacles: 8,
      cadence: 0.42, flex: 0.32, waves: 0.65, pulse: 0.22, bob: 0.32
    },
    seaGiant: {
      length: 23, height: 7, fin: 5, tail: 7, segments: 5, tentacles: 2,
      cadence: 0.34, flex: 0.65, waves: 0.62, pulse: 0.12, bob: 0.2
    },
    leviathan: {
      length: 69, height: 19, fin: 12, tail: 16, segments: 6, tentacles: 4,
      cadence: 0.18, flex: 1.25, waves: 0.55, pulse: 0.1, bob: 0.12
    },
    colossal: {
      length: 96, height: 31, fin: 21, tail: 25, segments: 7, tentacles: 9,
      cadence: 0.075, flex: 2.1, waves: 0.42, pulse: 0.08, bob: 0.08
    }
  };

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function mix(a, b, amount) {
    return a + (b - a) * amount;
  }

  function smoothstep(value) {
    value = clamp(value, 0, 1);
    return value * value * (3 - 2 * value);
  }

  function normalizeKind(kind) {
    return KIND_ALIASES[kind] || "fish";
  }

  function seedToUint(seed) {
    if (typeof seed === "number" && Number.isFinite(seed)) {
      if (seed >= 0 && seed <= 1) return (seed * 4294967295) >>> 0;
      return Math.floor(Math.abs(seed) * 2654435761) >>> 0;
    }
    var text = String(seed == null ? 0 : seed);
    var value = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function scramble(value) {
    value = (value ^ (value >>> 16)) >>> 0;
    value = Math.imul(value, 0x7feb352d) >>> 0;
    value = (value ^ (value >>> 15)) >>> 0;
    value = Math.imul(value, 0x846ca68b) >>> 0;
    return (value ^ (value >>> 16)) >>> 0;
  }

  function randomAt(seed, channel) {
    return scramble((seed + Math.imul(channel + 1, 0x9e3779b9)) >>> 0) / 4294967296;
  }

  function signedAt(seed, channel) {
    return randomAt(seed, channel) * 2 - 1;
  }

  function integerAt(seed, channel, low, high) {
    return low + Math.floor(randomAt(seed, channel) * (high - low + 1));
  }

  function rounded(value, minimum) {
    return Math.max(minimum == null ? 1 : minimum, Math.round(value));
  }

  /**
   * Fill `out` with stable morphology for one creature. Trait generation is
   * intended to happen at spawn time, not every frame. Reuse `out` to avoid an
   * allocation. The same kind/seed/size always produces the same result.
   */
  function createTraits(kind, seed, size, out) {
    var normalized = normalizeKind(kind);
    var base = DEFAULTS[normalized];
    var result = out || {};
    var sourceSeed = seedToUint(seed);
    var stableSeed = scramble((sourceSeed ^ KIND_CODE[normalized]) >>> 0);
    var scale = clamp(Number.isFinite(size) ? size : 1, 0.55, normalized === "colossal" ? 12 : 2.4);
    var bulk = mix(0.94, 1.07, randomAt(stableSeed, 0));
    var slenderness = mix(0.93, 1.08, randomAt(stableSeed, 1));

    result.kind = normalized;
    result.seed = stableSeed;
    result.sourceSeed = sourceSeed;
    result.size = scale;
    result.bodyLength = rounded(base.length * scale * slenderness, 3);
    result.bodyHeight = rounded(base.height * scale * bulk / Math.sqrt(slenderness), 2);
    result.headScale = mix(0.92, 1.1, randomAt(stableSeed, 2));
    result.headRoundness = mix(0.4, 0.72, randomAt(stableSeed, 3));
    result.shoulder = mix(0.9, 1.12, randomAt(stableSeed, 4));
    result.tailLength = rounded(base.tail * scale * mix(0.88, 1.14, randomAt(stableSeed, 5)), base.tail ? 1 : 0);
    result.tailFork = integerAt(stableSeed, 6, 0, 2);
    result.tailSpan = rounded((base.fin || 1) * scale * mix(0.88, 1.14, randomAt(stableSeed, 7)), 1);
    result.finSpan = rounded(base.fin * scale * mix(0.86, 1.16, randomAt(stableSeed, 8)), base.fin ? 1 : 0);
    result.finShape = integerAt(stableSeed, 9, 0, 1);
    result.dorsalHeight = rounded(base.fin * scale * mix(0.52, 0.78, randomAt(stableSeed, 10)), base.fin ? 1 : 0);
    result.segmentCount = rounded(base.segments + signedAt(stableSeed, 11), 2);
    result.tentacleCount = base.tentacles || 0;
    result.tentacleLength = rounded(
      Math.max(3, (base.height + base.length * 0.25) * scale * mix(0.9, 1.16, randomAt(stableSeed, 13))),
      2
    );
    result.tentacleCurl = mix(0.78, 1.12, randomAt(stableSeed, 14));
    result.mouthType = integerAt(stableSeed, 15, 0, normalized === "leviathan" || normalized === "colossal" ? 3 : 2);
    result.eyeCount = normalized === "hectapus" || normalized === "colossal" ? 2 : 1;
    result.eyeScale = mix(0.88, 1.12, randomAt(stableSeed, 17));
    result.paletteVariant = integerAt(stableSeed, 18, 0, 3);
    result.patternType = integerAt(stableSeed, 19, 0, 2);
    result.patternDensity = mix(0.12, 0.28, randomAt(stableSeed, 20));
    result.patternScale = integerAt(stableSeed, 21, 3, 5);
    result.patternOffset = integerAt(stableSeed, 22, 0, 31);
    result.scarCount = randomAt(stableSeed, 23) > 0.88 ? integerAt(stableSeed, 24, 1, normalized === "colossal" ? 3 : 2) : 0;
    result.scarAngle = mix(-1.05, 1.05, randomAt(stableSeed, 25));
    result.glowPattern = integerAt(stableSeed, 26, 0, 4);
    result.glowDensity = mix(0.08, 0.5, randomAt(stableSeed, 27));
    result.glowStrength = mix(0.34, 0.88, randomAt(stableSeed, 28));
    result.glowPhase = randomAt(stableSeed, 29) * TAU;
    result.cadence = base.cadence * mix(0.92, 1.08, randomAt(stableSeed, 30));
    result.flexAmplitude = base.flex * scale * mix(0.9, 1.1, randomAt(stableSeed, 31));
    result.flexWaves = base.waves * mix(0.92, 1.08, randomAt(stableSeed, 32));
    result.pulseAmount = base.pulse * mix(0.88, 1.12, randomAt(stableSeed, 33));
    result.bobAmount = base.bob * scale * mix(0.88, 1.12, randomAt(stableSeed, 34));
    result.finLag = mix(0.18, 0.82, randomAt(stableSeed, 35));
    result.coastBias = mix(0.22, 0.72, randomAt(stableSeed, 36));
    result.asymmetry = signedAt(stableSeed, 37) * 0.22;
    result.phase = randomAt(stableSeed, 38) * TAU;
    result.phaseSecondary = randomAt(stableSeed, 39) * TAU;
    result.ageClass = randomAt(stableSeed, 40) < 0.18 ? 0 : randomAt(stableSeed, 41) > 0.84 ? 2 : 1;
    return result;
  }

  /**
   * Fill `out` with a frame pose. `speed` is the actor's art-pixels/second
   * velocity magnitude and may be omitted. This hot path performs no allocation
   * when an output object is supplied.
   */
  function poseAt(traits, time, speed, out) {
    var result = out || {};
    var velocity = Math.max(0, Number.isFinite(speed) ? speed : 0);
    var drive = clamp(velocity / Math.max(0.3, traits.size), 0, 2.4);
    var phase = time * traits.cadence * mix(0.76, 1.2, clamp(drive, 0, 1)) + traits.phase;
    var beat = Math.sin(phase);
    var beatAhead = Math.sin(phase + Math.PI * 0.5);
    var contraction = 0.5 - 0.5 * Math.cos(phase);
    var powerStroke = smoothstep(clamp((contraction - 0.18) / 0.56, 0, 1));

    result.phase = phase;
    result.drive = drive;
    result.flex = beat * traits.flexAmplitude * (0.58 + drive * 0.32);
    result.tail = Math.sin(phase - traits.finLag) * traits.flexAmplitude;
    result.fin = beatAhead * (0.72 + drive * 0.16);
    result.pulse = 1 - powerStroke * traits.pulseAmount;
    result.thrust = powerStroke * (0.42 + drive * 0.4);
    result.coast = 1 - powerStroke;
    result.bob = Math.sin(time * traits.cadence * 0.47 + traits.phaseSecondary) * traits.bobAmount;
    result.roll = Math.sin(phase * 0.5 + traits.phaseSecondary) * traits.asymmetry;
    result.breathe = Math.sin(time * traits.cadence * 0.22 + traits.phaseSecondary) * traits.pulseAmount;
    result.glow = (0.72 + Math.sin(time * 0.38 + traits.glowPhase) * 0.28) * traits.glowStrength;
    return result;
  }

  /**
   * Lateral centerline offset at body coordinate `u` (-1 tail, +1 head).
   * Fish and sharks flex mainly at the tail; eels carry several waves forward.
   */
  function spineOffset(traits, pose, u) {
    var position = clamp(u, -1, 1);
    var tailWeight = Math.pow(clamp((1 - position) * 0.5, 0, 1), traits.kind === "eel" ? 0.72 : 1.7);
    var wave = pose.phase - position * Math.PI * traits.flexWaves;
    var rigidity = traits.kind === "ray" || traits.kind === "jelly" || traits.kind === "hectapus" ? 0.28 : 1;
    return Math.sin(wave) * traits.flexAmplitude * tailWeight * rigidity;
  }

  /**
   * Samples the body silhouette at longitudinal coordinate `u` (-1 tail,
   * +1 head). The returned center/halfHeight values let a renderer build a
   * filled pixel body column-by-column without relying on a stretched bitmap.
   */
  function bodyProfileAt(traits, pose, u, out) {
    var result = out || {};
    var position = clamp(u, -1, 1);
    var ellipse = Math.sqrt(Math.max(0, 1 - position * position));
    var rear = smoothstep(clamp((position + 1) * 1.65, 0, 1));
    var front = smoothstep(clamp((1 - position) * 2.1, 0, 1));
    var envelope = ellipse * mix(rear, 1, 0.42) * mix(front, 1, 0.55);

    if (traits.kind === "eel") {
      envelope = mix(0.34, 0.78, ellipse) * mix(0.35, 1, rear);
    } else if (traits.kind === "ray") {
      envelope = Math.pow(ellipse, 0.55) * mix(0.45, 1, rear);
    } else if (traits.kind === "jelly" || traits.kind === "hectapus") {
      envelope = Math.pow(ellipse, traits.headRoundness < 0.5 ? 0.72 : 0.46);
    } else if (traits.kind === "shark") {
      envelope *= 0.88 + smoothstep(clamp((position + 0.2) * 1.7, 0, 1)) * 0.2;
    } else if (traits.kind === "seaGiant" || traits.kind === "leviathan" || traits.kind === "colossal") {
      var segmentWave = Math.cos((position + 1) * Math.PI * traits.segmentCount);
      var segmentNotch = Math.max(0, segmentWave) * 0.055;
      var shoulder = Math.exp(-Math.pow((position - 0.22) * 3.4, 2)) * (traits.shoulder - 0.72) * 0.18;
      envelope *= 1 + shoulder - segmentNotch;
    }

    var headInfluence = smoothstep(clamp((position - 0.28) / 0.72, 0, 1));
    var breathing = 1 + pose.breathe * (0.2 + envelope * 0.32);
    result.center = spineOffset(traits, pose, position) + pose.roll * position;
    result.halfHeight = Math.max(0, traits.bodyHeight * 0.5 * envelope * breathing * mix(1, traits.headScale, headInfluence));
    result.section = clamp(Math.floor((position + 1) * 0.5 * traits.segmentCount), 0, traits.segmentCount - 1);
    return result;
  }

  /**
   * Samples a fin/wing in local creature coordinates. `side` is -1 or +1 and
   * `u` runs root-to-tip from 0 to 1. Intended for pixelLine segment chains.
   */
  function finPoint(traits, pose, side, u, out) {
    var result = out || {};
    var amount = clamp(u, 0, 1);
    var direction = side < 0 ? -1 : 1;
    var wingWave = Math.sin(pose.phase - amount * 1.65 + direction * traits.asymmetry * 4);
    var shapePower = [0.74, 1.05, 1.42, 0.58][traits.finShape];
    var reach = Math.pow(amount, shapePower);
    result.x = -traits.bodyLength * 0.04 * amount + pose.roll * direction * amount;
    result.y = direction * traits.finSpan * reach;
    result.z = wingWave * traits.finSpan * (0.16 + amount * 0.28) + pose.fin * amount;
    return result;
  }

  /**
   * Samples a tentacle in local creature coordinates. Use a stable `index` and
   * `u` from root to tip. Different indices automatically receive distinct lag.
   */
  function tentaclePoint(traits, pose, index, u, out) {
    var result = out || {};
    var amount = clamp(u, 0, 1);
    var count = Math.max(1, traits.tentacleCount);
    var across = count === 1 ? 0 : index / (count - 1) * 2 - 1;
    var indexPhase = traits.phaseSecondary + index * 1.618;
    var traveling = Math.sin(pose.phase * 0.43 + indexPhase - amount * 4.2 * traits.tentacleCurl);
    var curl = Math.sin(indexPhase * 1.7 + amount * Math.PI) * traits.tentacleCurl;
    result.x = across * traits.bodyLength * 0.23 + traveling * amount * traits.tentacleCurl;
    result.y = traits.bodyHeight * 0.38 + amount * traits.tentacleLength;
    result.y += Math.abs(across) * traits.bodyHeight * 0.08;
    result.z = (traveling + curl * 0.32) * amount * (1.2 + traits.size * 0.45);
    return result;
  }

  /**
   * Stable 0..3 marking slot for an integer local art-pixel coordinate.
   * 0 means base body; 1/2 are pattern tones; 3 is a glow-organ candidate.
   */
  function patternAt(traits, x, y) {
    var ix = Math.floor(x);
    var iy = Math.floor(y);
    var scale = traits.patternScale;
    var signal;
    if (traits.patternType === 0) {
      signal = ((ix + traits.patternOffset) % scale + scale) % scale === 0 ? 0.18 : 0.92;
    } else if (traits.patternType === 1) {
      signal = ((iy + traits.patternOffset) % scale + scale) % scale === 0 ? 0.16 : 0.9;
    } else if (traits.patternType === 2) {
      signal = (((ix + iy + traits.patternOffset) % scale) + scale) % scale === 0 ? 0.14 : 0.88;
    } else if (traits.patternType === 3) {
      signal = randomAt(traits.seed, (ix * 97 + iy * 193) | 0);
    } else {
      signal = Math.abs(Math.sin((ix * 0.73 + iy * 1.17 + traits.patternOffset) / scale));
    }
    if (signal < traits.glowDensity * 0.24 && traits.glowPattern > 0) return 3;
    if (signal < traits.patternDensity * 0.42) return 2;
    if (signal < traits.patternDensity) return 1;
    return 0;
  }

  /** Returns a conservative local art-pixel bounding box for hit masks. */
  function boundsFor(traits, out) {
    var result = out || {};
    var lateral = Math.max(traits.finSpan, traits.bodyHeight * 0.5);
    var dangling = traits.tentacleCount ? traits.tentacleLength + traits.bodyHeight * 0.5 : lateral;
    result.left = -Math.ceil(traits.bodyLength * 0.64 + traits.tailLength);
    result.right = Math.ceil(traits.bodyLength * 0.58);
    result.top = -Math.ceil(lateral + traits.dorsalHeight);
    result.bottom = Math.ceil(Math.max(lateral, dangling));
    return result;
  }

  function selfCheck() {
    var kinds = Object.keys(DEFAULTS);
    var first = {};
    var second = {};
    var pose = {};
    var failures = [];
    for (var i = 0; i < kinds.length; i += 1) {
      createTraits(kinds[i], 0.3817, 1.1, first);
      createTraits(kinds[i], 0.3817, 1.1, second);
      poseAt(first, 12.5, 0.8, pose);
      if (first.seed !== second.seed || first.bodyLength !== second.bodyLength || first.patternType !== second.patternType) {
        failures.push(kinds[i] + ": nondeterministic traits");
      }
      if (first.bodyLength < 3 || first.bodyHeight < 2 || !Number.isFinite(pose.flex)) {
        failures.push(kinds[i] + ": invalid range");
      }
    }
    return { ok: failures.length === 0, failures: failures, kinds: kinds.length };
  }

  root.MareCreatureVariation = Object.freeze({
    version: "1.0.0",
    kinds: Object.freeze(Object.keys(DEFAULTS)),
    normalizeKind: normalizeKind,
    createTraits: createTraits,
    poseAt: poseAt,
    spineOffset: spineOffset,
    bodyProfileAt: bodyProfileAt,
    finPoint: finPoint,
    tentaclePoint: tentaclePoint,
    patternAt: patternAt,
    boundsFor: boundsFor,
    selfCheck: selfCheck
  });
}(typeof window !== "undefined" ? window : globalThis));
