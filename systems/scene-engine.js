(function (root) {
  "use strict";

  // One depth/material contract for fauna, structures, particles, and light.
  // Far objects are smaller, lower contrast, bluer, and more softly visible;
  // callers still rasterize onto the same integer art-pixel canvas.
  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function mix(a, b, amount) {
    return a + (b - a) * amount;
  }

  function parseHex(color) {
    var value = String(color || "#000000").replace("#", "");
    if (value.length === 3) value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
    var parsed = parseInt(value, 16);
    return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
  }

  function hexByte(value) {
    return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  }

  function blendColor(a, b, amount) {
    var from = parseHex(a);
    var to = parseHex(b);
    var t = clamp(amount, 0, 1);
    return "#" + hexByte(mix(from.r, to.r, t)) + hexByte(mix(from.g, to.g, t)) + hexByte(mix(from.b, to.b, t));
  }

  function depthOf(entity) {
    if (Number.isFinite(entity.visualDepth)) return clamp(entity.visualDepth, 0, 1);
    if (Number.isFinite(entity.depth)) return clamp(entity.depth, 0, 1);
    if (Number.isFinite(entity.depthTarget)) return clamp(entity.depthTarget, 0, 1);
    return 0.5;
  }

  function styleFor(entity, environment, palette, out) {
    var result = out || {};
    var depth = depthOf(entity);
    var waterAmount = Number.isFinite(environment.waterAmount) ? environment.waterAmount : 1;
    var storm = Number.isFinite(environment.storm) ? environment.storm : 0;
    var glow = Number.isFinite(environment.glow) ? environment.glow : 0;
    var haze = clamp(depth * 0.62 + waterAmount * 0.16 + storm * 0.12 - glow * 0.2, 0, 0.86);
    result.depth = depth;
    result.scale = mix(1.04, 0.68, depth);
    result.alpha = clamp(mix(0.94, 0.42, depth) * (1 - storm * 0.1) + glow * 0.08, 0.08, 1);
    result.contrast = mix(1, 0.46, haze);
    result.haze = haze;
    result.tint = blendColor(palette.water || "#30265f", palette.waterDeep || "#14133b", clamp(depth * 0.74 + storm * 0.08, 0, 1));
    result.edgeAlpha = clamp(result.alpha * mix(1, 0.55, depth), 0.06, 1);
    return result;
  }

  function colorAtDepth(color, entity, environment, palette) {
    var style = styleFor(entity, environment, palette, {});
    return blendColor(color, style.tint, style.haze * 0.56);
  }

  function compareBackToFront(a, b) {
    var depthDifference = depthOf(b) - depthOf(a);
    if (Math.abs(depthDifference) > 0.0001) return depthDifference;
    if ((a.y || 0) !== (b.y || 0)) return (b.y || 0) - (a.y || 0);
    return (a.renderOrder || 0) - (b.renderOrder || 0);
  }

  function sortBackToFront(entities) {
    return entities.sort(compareBackToFront);
  }

  function createMaterialField(options) {
    var settings = options || {};
    var columns = 0;
    var rows = 0;
    var cell = settings.cellSize || 10;
    var shimmer = null;
    var turbidity = null;
    var width = 0;
    var height = 0;

    function resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      columns = Math.ceil(width / cell) + 1;
      rows = Math.ceil(height / cell) + 1;
      shimmer = new Float32Array(columns * rows);
      turbidity = new Float32Array(columns * rows);
    }

    function update(time, storm, sampleFluid) {
      if (!shimmer) return;
      for (var row = 0; row < rows; row += 1) {
        for (var col = 0; col < columns; col += 1) {
          var index = row * columns + col;
          var x = col * cell;
          var y = row * cell;
          var fluid = sampleFluid ? sampleFluid(x, y) : null;
          var flow = fluid ? Math.sqrt(fluid.x * fluid.x + fluid.y * fluid.y) : 0;
          var dye = fluid && Number.isFinite(fluid.dye) ? fluid.dye : 0;
          var targetShimmer = (Math.sin(x * 0.071 + time * 0.52) + Math.sin(y * 0.043 - time * 0.31)) * 0.25 + 0.5;
          shimmer[index] += (targetShimmer * (0.34 + flow * 0.42) - shimmer[index]) * 0.08;
          turbidity[index] += (clamp(dye * 0.6 + storm * 0.24 + flow * 0.08, 0, 1) - turbidity[index]) * 0.05;
        }
      }
    }

    function sample(x, y, out) {
      var result = out || {};
      if (!shimmer) {
        result.shimmer = 0;
        result.turbidity = 0;
        return result;
      }
      var col = clamp(Math.round(x / cell), 0, columns - 1);
      var row = clamp(Math.round(y / cell), 0, rows - 1);
      var index = row * columns + col;
      result.shimmer = shimmer[index];
      result.turbidity = turbidity[index];
      return result;
    }

    function selfCheck() {
      resize(32, 32);
      update(1, 0.2, null);
      var value = sample(10, 10, {});
      return Number.isFinite(value.shimmer) && Number.isFinite(value.turbidity);
    }

    return Object.freeze({ resize: resize, update: update, sample: sample, selfCheck: selfCheck });
  }

  function selfCheck() {
    var style = styleFor({ visualDepth: 0.8 }, { storm: 0, waterAmount: 1 }, { water: "#30265f", waterDeep: "#14133b" }, {});
    return style.scale < 1 && style.alpha < 0.8 && /^#[0-9a-f]{6}$/.test(style.tint);
  }

  root.MareScene = Object.freeze({
    version: "1.0.0",
    depthOf: depthOf,
    styleFor: styleFor,
    colorAtDepth: colorAtDepth,
    blendColor: blendColor,
    compareBackToFront: compareBackToFront,
    sortBackToFront: sortBackToFront,
    createMaterialField: createMaterialField,
    selfCheck: selfCheck
  });
})(typeof window !== "undefined" ? window : globalThis);
