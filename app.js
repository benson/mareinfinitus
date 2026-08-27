(function () {
  "use strict";

  var ART_PIXEL = 3;
  var FLUID_CELL = 6;
  var SURFACE_CELL = 2;
  var REFERENCE_WIDTH = 427;
  var PLATFORM_WORLD_LEFT = 145;
  var PLATFORM_WORLD_WIDTH = 390;
  var WORLD_WRAP_LEFT = -120;
  var WORLD_WRAP_RIGHT = 680;

  var PALETTES = {
    A: {
      sky: "#080817", skyLow: "#16112d", star: "#ddd7ff",
      planetDark: "#5f241d", planet: "#a44728", planetLight: "#dd7441",
      waterTop: "#4b3a7a", water: "#27204e", waterDeep: "#100f2d",
      foam: "#ded9ff", plankton: "#d39b32", bubble: "#6bb9c5",
      kelp: "#9a6f20", timber: "#2a191c", timberLight: "#67402b",
      steel: "#39384e", steelDark: "#20202f", lamp: "#ffb23d",
      abyss: "#05050f", creature: "#0a091b"
    },
    B: {
      sky: "#09091b", skyLow: "#21163a", star: "#eee8ff",
      planetDark: "#652a25", planet: "#a94e31", planetLight: "#ee8650",
      waterTop: "#62518f", water: "#30265f", waterDeep: "#14133b",
      foam: "#f1eaff", plankton: "#e0a83c", bubble: "#73cad1",
      kelp: "#b78628", timber: "#2a1c20", timberLight: "#795038",
      steel: "#48475d", steelDark: "#252538", lamp: "#ffc35a",
      abyss: "#060612", creature: "#0b0a20"
    },
    C: {
      sky: "#090c1e", skyLow: "#2a193c", star: "#f8efff",
      planetDark: "#6f3029", planet: "#b85b38", planetLight: "#f29558",
      waterTop: "#745b9f", water: "#392b6c", waterDeep: "#171642",
      foam: "#fff4ff", plankton: "#edb64d", bubble: "#83dce0",
      kelp: "#c59635", timber: "#302127", timberLight: "#8a5b3d",
      steel: "#55546d", steelDark: "#2b2a42", lamp: "#ffd36d",
      abyss: "#070713", creature: "#0d0c25"
    }
  };

  var canvas = document.querySelector(".mare-canvas");
  var shell = document.querySelector(".mare-shell");
  var ctx = canvas.getContext("2d", { alpha: false });
  var mode = "B";
  var particles = [];
  var swimmers = [];
  var ripples = [];
  var fluid = null;
  var surface = null;
  var deposits = null;
  var debugFlow = false;
  var raft = { x: -42, y: 0, vx: 1.1, vy: 0, angle: 0, angularVelocity: 0 };
  var leviathan = { x: -130, y: 0, vx: 0.17, vy: 0 };
  var carpet = { x: 470, y: 0, vx: -3.2, vy: 0 };
  var environment = {
    tide: 0,
    tideVelocity: 0,
    wind: 0.18,
    storm: 0.08,
    stormTarget: 0.08,
    forcedStorm: 0
  };
  var structure = {
    sway: 0,
    swayVelocity: 0,
    sag: 0,
    sagVelocity: 0,
    stress: 0,
    integrity: 1
  };
  var mooring = {
    points: [], previous: [], buoyX: 0, buoyY: 0,
    buoyVX: 0, buoyVY: 0, segmentLength: 5.5, initialized: false
  };
  var pointer = { down: false, x: 0, y: 0 };
  var width = 1;
  var height = 1;
  var cameraX = 0;
  var started = performance.now();
  var lastFrame = started;
  var uiTimer = 0;

  function hash(n) {
    var value = Math.sin(n * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function waterlineY() {
    return Math.floor(clamp(86 + (height - 240) * 0.065, 76, 112));
  }

  function worldToScreenX(worldX) {
    return worldX - cameraX;
  }

  function screenToWorldX(screenX) {
    return screenX + cameraX;
  }

  function wrapWorldX(worldX) {
    var span = WORLD_WRAP_RIGHT - WORLD_WRAP_LEFT;
    return ((worldX - WORLD_WRAP_LEFT) % span + span) % span + WORLD_WRAP_LEFT;
  }

  function platformGeometry() {
    var line = waterlineY();
    var left = worldToScreenX(PLATFORM_WORLD_LEFT);
    var right = worldToScreenX(PLATFORM_WORLD_LEFT + PLATFORM_WORLD_WIDTH);
    var deck = line - 36;
    var pylonCount = Math.floor(PLATFORM_WORLD_WIDTH / 17) + 1;
    var pylons = [];
    for (var i = 0; i < pylonCount; i += 1) {
      pylons.push(left + 8 + i * ((right - left - 16) / Math.max(1, pylonCount - 1)));
    }
    return {
      line: line,
      left: left,
      right: right,
      deck: deck,
      pylons: pylons,
      foundationTop: line + 66,
      foundationBottom: line + 92
    };
  }

  function drawPixelDisc(cx, cy, radius, color) {
    ctx.fillStyle = color;
    for (var y = -radius; y <= radius; y += 1) {
      var half = Math.floor(Math.sqrt(radius * radius - y * y));
      ctx.fillRect(Math.floor(cx - half), Math.floor(cy + y), half * 2 + 1, 1);
    }
  }

  function pixelRect(x, y, rectWidth, rectHeight, color) {
    var left = Math.round(x);
    var top = Math.round(y);
    var right = Math.round(x + rectWidth);
    var bottom = Math.round(y + rectHeight);
    if (right <= left || bottom <= top) return;
    ctx.fillStyle = color;
    ctx.fillRect(left, top, right - left, bottom - top);
  }

  function pixelLine(x0, y0, x1, y1, color, thickness) {
    var startX = Math.round(x0);
    var startY = Math.round(y0);
    var endX = Math.round(x1);
    var endY = Math.round(y1);
    var dx = Math.abs(endX - startX);
    var sx = startX < endX ? 1 : -1;
    var dy = -Math.abs(endY - startY);
    var sy = startY < endY ? 1 : -1;
    var error = dx + dy;
    var size = Math.max(1, Math.round(thickness || 1));
    ctx.fillStyle = color;
    while (true) {
      ctx.fillRect(startX - Math.floor(size / 2), startY - Math.floor(size / 2), size, size);
      if (startX === endX && startY === endY) break;
      var doubled = error * 2;
      if (doubled >= dy) {
        error += dy;
        startX += sx;
      }
      if (doubled <= dx) {
        error += dx;
        startY += sy;
      }
    }
  }

  function pixelArc(cx, cy, radius, startAngle, endAngle, color, thickness) {
    var steps = Math.max(12, Math.ceil(radius * Math.abs(endAngle - startAngle) * 1.4));
    var previousX = cx + Math.cos(startAngle) * radius;
    var previousY = cy + Math.sin(startAngle) * radius;
    for (var step = 1; step <= steps; step += 1) {
      var angle = lerp(startAngle, endAngle, step / steps);
      var x = cx + Math.cos(angle) * radius;
      var y = cy + Math.sin(angle) * radius;
      pixelLine(previousX, previousY, x, y, color, thickness);
      previousX = x;
      previousY = y;
    }
  }

  function moduleSpan(x, y, spanWidth, spanHeight, base, light, dark, seed, moduleWidth) {
    var widthLeft = Math.max(0, Math.round(spanWidth));
    var cursor = Math.round(x);
    var module = Math.max(4, Math.round(moduleWidth || 9));
    while (widthLeft > 0) {
      var pieceWidth = Math.min(module, widthLeft);
      pixelRect(cursor, y, pieceWidth, spanHeight, dark);
      if (pieceWidth > 2 && spanHeight > 2) {
        pixelRect(cursor + 1, y + 1, pieceWidth - 2, spanHeight - 2, base);
        pixelRect(cursor + 1, y + 1, pieceWidth - 2, 1, light);
      }
      if (pieceWidth > 5 && hash(seed + cursor * 0.37) > 0.42) {
        pixelRect(cursor + pieceWidth - 2, y + Math.max(1, spanHeight - 2), 1, 1, light);
      }
      cursor += pieceWidth;
      widthLeft -= pieceWidth;
    }
  }

  function panelBlock(x, y, blockWidth, blockHeight, base, light, dark, seed) {
    var tileWidth = 12;
    var tileHeight = 9;
    for (var py = 0; py < blockHeight; py += tileHeight) {
      for (var px = 0; px < blockWidth; px += tileWidth) {
        var pieceWidth = Math.min(tileWidth, blockWidth - px);
        var pieceHeight = Math.min(tileHeight, blockHeight - py);
        pixelRect(x + px, y + py, pieceWidth, pieceHeight, dark);
        if (pieceWidth > 2 && pieceHeight > 2) {
          pixelRect(x + px + 1, y + py + 1, pieceWidth - 2, pieceHeight - 2, base);
          if (hash(seed + px * 2.3 + py * 7.1) > 0.5) {
            pixelRect(x + px + 2, y + py + 2, Math.max(1, pieceWidth - 4), 1, light);
          }
        }
      }
    }
  }

  function createSurface() {
    var cols = Math.ceil(width / SURFACE_CELL) + 2;
    surface = {
      cols: cols,
      height: new Float32Array(cols),
      velocity: new Float32Array(cols),
      nextVelocity: new Float32Array(cols)
    };
    for (var col = 0; col < cols; col += 1) {
      surface.height[col] = Math.sin(col * 0.085) * 0.8 + Math.sin(col * 0.031 + 1.8) * 0.55;
    }
  }

  function sampleSurface(x) {
    if (!surface) return 0;
    var gridX = clamp(x / SURFACE_CELL, 0, surface.cols - 1.001);
    var left = Math.floor(gridX);
    var right = Math.min(surface.cols - 1, left + 1);
    return lerp(surface.height[left], surface.height[right], gridX - left);
  }

  function surfaceY(x, time, line, raftX) {
    return line + environment.tide + sampleSurface(x);
  }

  function disturbSurface(x, impulse, radius) {
    if (!surface) return;
    var center = x / SURFACE_CELL;
    var gridRadius = Math.max(1, radius / SURFACE_CELL);
    var start = Math.max(1, Math.floor(center - gridRadius));
    var end = Math.min(surface.cols - 2, Math.ceil(center + gridRadius));
    for (var col = start; col <= end; col += 1) {
      var distance = Math.abs(col - center) / gridRadius;
      if (distance >= 1) continue;
      surface.velocity[col] += impulse * (0.5 + Math.cos(distance * Math.PI) * 0.5);
    }
  }

  function updateEnvironment(dt, time) {
    var previousTide = environment.tide;
    environment.tide = Math.sin(time * 0.025) * 3.4 + Math.sin(time * 0.008 + 1.2) * 1.2;
    environment.tideVelocity = (environment.tide - previousTide) / Math.max(dt, 0.001);

    var weatherEpoch = Math.floor(time / 42);
    var nextEpoch = weatherEpoch + 1;
    var phase = (time % 42) / 42;
    var a = Math.pow(hash(weatherEpoch * 9.17 + 31), 3.4);
    var b = Math.pow(hash(nextEpoch * 9.17 + 31), 3.4);
    var weatherBlend = phase * phase * (3 - 2 * phase);
    var naturalStorm = lerp(a, b, weatherBlend);
    if (environment.forcedStorm > 0) {
      environment.forcedStorm = Math.max(0, environment.forcedStorm - dt);
      naturalStorm = Math.max(naturalStorm, clamp(environment.forcedStorm / 5, 0, 1));
    }
    environment.stormTarget = 0.05 + naturalStorm * 0.95;
    environment.storm += (environment.stormTarget - environment.storm) * (1 - Math.exp(-dt * 0.32));
    environment.wind = 0.16 + environment.storm * 1.35 + Math.sin(time * 0.06) * 0.08;
  }

  function updateSurface(dt, time) {
    if (!surface) return;
    var storm = environment.storm;
    for (var col = 1; col < surface.cols - 1; col += 1) {
      var laplacian = surface.height[col - 1] + surface.height[col + 1] - surface.height[col] * 2;
      var fluidLift = fluid && col * SURFACE_CELL < width
        ? sampleFluid(col * SURFACE_CELL, fluid.line + 2).y
        : 0;
      var windWave = Math.sin(col * 0.37 + time * (0.7 + storm * 0.8)) * environment.wind * 0.035;
      surface.nextVelocity[col] = (
        surface.velocity[col] + (laplacian * 24 + fluidLift * 0.15 + windWave) * dt
      ) * Math.pow(0.986 - storm * 0.003, dt * 60);
    }
    surface.nextVelocity[0] = surface.nextVelocity[1];
    surface.nextVelocity[surface.cols - 1] = surface.nextVelocity[surface.cols - 2];
    surface.velocity.set(surface.nextVelocity);
    for (var x = 0; x < surface.cols; x += 1) {
      surface.height[x] += surface.velocity[x] * dt;
      surface.height[x] = clamp(surface.height[x], -7.5, 7.5);
    }

    if (storm > 0.38) {
      var rainCount = Math.floor(storm * width * dt * 0.025);
      for (var drop = 0; drop < rainCount; drop += 1) {
        var rainX = hash(Math.floor(time * 17) * 97 + drop * 19.1) * width;
        disturbSurface(rainX, (hash(drop * 41 + time) - 0.5) * storm * 2.2, 5 + storm * 8);
      }
    }
  }

  function createParticles() {
    var line = waterlineY();
    var geometry = platformGeometry();
    var count = Math.min(3200, Math.floor((width * Math.max(1, height - line)) / 118));
    particles = [];
    for (var i = 0; i < count; i += 1) {
      var seed = hash(i + width * 7 + height * 13);
      var kind = i % 19 === 0 ? "bubble" : i % 11 === 0 ? "silt" : "plankton";
      var x = hash(i * 3.17 + 2) * width;
      var y = line + 5 + hash(i * 5.31 + 8) * Math.max(4, height - line - 9);
      for (var attempt = 0; attempt < 7 && isSolid(x, y, geometry); attempt += 1) {
        x = hash(i * 7.91 + attempt * 17.3) * width;
        y = line + 5 + hash(i * 11.27 + attempt * 23.1) * Math.max(4, height - line - 9);
      }
      particles.push({
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        seed: seed,
        kind: kind
      });
    }
  }

  function createSwimmers() {
    var line = waterlineY();
    var count = clamp(Math.floor(width / 16), 18, 54);
    swimmers = [];
    for (var i = 0; i < count; i += 1) {
      swimmers.push({
        x: hash(i * 7.3 + width) * width,
        y: line + 18 + hash(i * 11.9 + height) * Math.max(20, (height - line) * 0.62),
        vx: (hash(i * 4.7) - 0.5) * 0.8,
        vy: (hash(i * 9.1) - 0.5) * 0.3,
        energy: 0.45 + hash(i * 17.3) * 0.5,
        seed: hash(i * 23.7 + 3),
        direction: 1
      });
    }
  }

  function createDeposits() {
    deposits = new Float32Array(Math.ceil(width / 2) + 1);
  }

  function isSolid(x, y, geometry) {
    if (y < geometry.line + 2) return false;
    for (var i = 0; i < geometry.pylons.length; i += 1) {
      var px = geometry.pylons[i];
      if (x >= px - 2 && x <= px + 3 && y <= geometry.foundationTop + 2) return true;
    }
    if (
      x >= geometry.left - 5 &&
      x <= geometry.right &&
      y >= geometry.foundationTop &&
      y <= geometry.foundationBottom
    ) return true;
    return false;
  }

  function fluidIndex(col, row) {
    return row * fluid.cols + col;
  }

  function createFluid(geometry) {
    var cols = Math.ceil(width / FLUID_CELL) + 1;
    var rows = Math.ceil((height - geometry.line) / FLUID_CELL) + 1;
    var size = cols * rows;
    fluid = {
      cols: cols,
      rows: rows,
      line: geometry.line,
      u: new Float32Array(size),
      v: new Float32Array(size),
      u0: new Float32Array(size),
      v0: new Float32Array(size),
      pressure: new Float32Array(size),
      pressure0: new Float32Array(size),
      divergence: new Float32Array(size),
      dye: new Float32Array(size),
      dye0: new Float32Array(size),
      nutrient: new Float32Array(size),
      nutrient0: new Float32Array(size),
      plankton: new Float32Array(size),
      plankton0: new Float32Array(size),
      solid: new Uint8Array(size)
    };
    for (var row = 0; row < rows; row += 1) {
      for (var col = 0; col < cols; col += 1) {
        var index = row * cols + col;
        var worldX = col * FLUID_CELL;
        var worldY = geometry.line + row * FLUID_CELL;
        fluid.u[index] = 0.3;
        var depth = row / Math.max(1, rows - 1);
        fluid.nutrient[index] = 0.24 + depth * 0.58 + hash(col * 3.1 + row * 7.7) * 0.08;
        fluid.plankton[index] = (1 - depth * 0.7) * (0.08 + hash(col * 5.3 + row * 11.9) * 0.12);
        fluid.solid[index] = isSolid(worldX, worldY, geometry) ? 1 : 0;
      }
    }
  }

  function sampleGridArray(array, cols, rows, gridX, gridY) {
    if (!array || cols < 1 || rows < 1) return 0;
    var x = clamp(gridX, 0, cols - 1.001);
    var y = clamp(gridY, 0, rows - 1.001);
    var x0 = Math.floor(x);
    var y0 = Math.floor(y);
    var x1 = Math.min(cols - 1, x0 + 1);
    var y1 = Math.min(rows - 1, y0 + 1);
    var tx = x - x0;
    var ty = y - y0;
    var a = array[y0 * cols + x0] * (1 - tx) + array[y0 * cols + x1] * tx;
    var b = array[y1 * cols + x0] * (1 - tx) + array[y1 * cols + x1] * tx;
    return a * (1 - ty) + b * ty;
  }

  function sampleFluidArray(array, gridX, gridY) {
    if (!fluid) return 0;
    return sampleGridArray(array, fluid.cols, fluid.rows, gridX, gridY);
  }

  function sampleFluid(x, y) {
    if (!fluid || y < fluid.line) return { x: 0.3, y: 0, dye: 0, nutrient: 0, plankton: 0 };
    var gridX = x / FLUID_CELL;
    var gridY = (y - fluid.line) / FLUID_CELL;
    return {
      x: sampleFluidArray(fluid.u, gridX, gridY),
      y: sampleFluidArray(fluid.v, gridX, gridY),
      dye: sampleFluidArray(fluid.dye, gridX, gridY),
      nutrient: sampleFluidArray(fluid.nutrient, gridX, gridY),
      plankton: sampleFluidArray(fluid.plankton, gridX, gridY)
    };
  }

  function consumePlankton(x, y, amount) {
    if (!fluid || y < fluid.line) return 0;
    var col = clamp(Math.round(x / FLUID_CELL), 0, fluid.cols - 1);
    var row = clamp(Math.round((y - fluid.line) / FLUID_CELL), 0, fluid.rows - 1);
    var index = fluidIndex(col, row);
    var eaten = Math.min(fluid.plankton[index], amount);
    fluid.plankton[index] -= eaten;
    fluid.nutrient[index] = clamp(fluid.nutrient[index] + eaten * 0.22, 0, 1.5);
    return eaten;
  }

  function injectFluid(x, y, forceX, forceY, radius, dyeAmount) {
    if (!fluid || y < fluid.line - radius) return;
    var minCol = clamp(Math.floor((x - radius) / FLUID_CELL), 0, fluid.cols - 1);
    var maxCol = clamp(Math.ceil((x + radius) / FLUID_CELL), 0, fluid.cols - 1);
    var minRow = clamp(Math.floor((y - radius - fluid.line) / FLUID_CELL), 0, fluid.rows - 1);
    var maxRow = clamp(Math.ceil((y + radius - fluid.line) / FLUID_CELL), 0, fluid.rows - 1);
    for (var row = minRow; row <= maxRow; row += 1) {
      for (var col = minCol; col <= maxCol; col += 1) {
        var index = fluidIndex(col, row);
        if (fluid.solid[index]) continue;
        var dx = col * FLUID_CELL - x;
        var dy = fluid.line + row * FLUID_CELL - y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance >= radius) continue;
        var falloff = 1 - distance / radius;
        fluid.u[index] += forceX * falloff;
        fluid.v[index] += forceY * falloff;
        fluid.dye[index] = clamp(fluid.dye[index] + dyeAmount * falloff, 0, 1.5);
      }
    }
  }

  function projectFluid() {
    var cols = fluid.cols;
    var rows = fluid.rows;
    fluid.pressure.fill(0);
    for (var row = 1; row < rows - 1; row += 1) {
      for (var col = 1; col < cols - 1; col += 1) {
        var index = fluidIndex(col, row);
        if (fluid.solid[index]) continue;
        fluid.divergence[index] = -0.5 * (
          fluid.u[fluidIndex(col + 1, row)] - fluid.u[fluidIndex(col - 1, row)] +
          fluid.v[fluidIndex(col, row + 1)] - fluid.v[fluidIndex(col, row - 1)]
        );
      }
    }

    for (var iteration = 0; iteration < 7; iteration += 1) {
      fluid.pressure0.set(fluid.pressure);
      for (var py = 1; py < rows - 1; py += 1) {
        for (var px = 1; px < cols - 1; px += 1) {
          var pressureIndex = fluidIndex(px, py);
          if (fluid.solid[pressureIndex]) continue;
          fluid.pressure[pressureIndex] = (
            fluid.divergence[pressureIndex] +
            fluid.pressure0[fluidIndex(px - 1, py)] +
            fluid.pressure0[fluidIndex(px + 1, py)] +
            fluid.pressure0[fluidIndex(px, py - 1)] +
            fluid.pressure0[fluidIndex(px, py + 1)]
          ) * 0.25;
        }
      }
    }

    for (var vy = 1; vy < rows - 1; vy += 1) {
      for (var vx = 1; vx < cols - 1; vx += 1) {
        var velocityIndex = fluidIndex(vx, vy);
        if (fluid.solid[velocityIndex]) {
          fluid.u[velocityIndex] = 0;
          fluid.v[velocityIndex] = 0;
          continue;
        }
        fluid.u[velocityIndex] -= 0.5 * (
          fluid.pressure[fluidIndex(vx + 1, vy)] - fluid.pressure[fluidIndex(vx - 1, vy)]
        );
        fluid.v[velocityIndex] -= 0.5 * (
          fluid.pressure[fluidIndex(vx, vy + 1)] - fluid.pressure[fluidIndex(vx, vy - 1)]
        );
      }
    }
  }

  function updateFluid(dt, time, geometry, actors) {
    if (!fluid) return;
    fluid.u0.set(fluid.u);
    fluid.v0.set(fluid.v);
    fluid.dye0.set(fluid.dye);
    fluid.nutrient0.set(fluid.nutrient);
    fluid.plankton0.set(fluid.plankton);

    for (var row = 0; row < fluid.rows; row += 1) {
      for (var col = 0; col < fluid.cols; col += 1) {
        var index = fluidIndex(col, row);
        if (fluid.solid[index]) {
          fluid.u[index] = 0;
          fluid.v[index] = 0;
          fluid.dye[index] *= 0.92;
          fluid.plankton[index] *= 0.995;
          continue;
        }
        var backX = col - fluid.u0[index] * dt / FLUID_CELL;
        var backY = row - fluid.v0[index] * dt / FLUID_CELL;
        var depth = row / Math.max(1, fluid.rows - 1);
        var tidalCurrent = Math.cos(time * 0.025) * 0.18;
        var targetCurrent = 0.26 + tidalCurrent + Math.sin(row * 0.21 + time * 0.08) * 0.06 * (1 - depth);
        fluid.u[index] = sampleFluidArray(fluid.u0, backX, backY) * 0.997 + targetCurrent * 0.003;
        fluid.v[index] = sampleFluidArray(fluid.v0, backX, backY) * (0.994 - environment.storm * 0.001);
        fluid.dye[index] = sampleFluidArray(fluid.dye0, backX, backY) * 0.986;
        var nutrient = sampleFluidArray(fluid.nutrient0, backX, backY);
        var plankton = sampleFluidArray(fluid.plankton0, backX, backY);
        var light = Math.max(0, 1 - depth * 1.28);
        var growth = plankton * nutrient * light * (0.34 + environment.storm * 0.08) * dt;
        var respiration = plankton * (0.024 + depth * 0.018) * dt;
        fluid.plankton[index] = clamp(plankton + growth - respiration, 0, 1.35);
        fluid.nutrient[index] = clamp(nutrient - growth * 0.72 + respiration * 0.38 + depth * 0.002 * dt, 0, 1.45);
        if (depth > 0.78) fluid.nutrient[index] += (0.82 - fluid.nutrient[index]) * dt * 0.012;
      }
    }

    for (var top = 0; top < fluid.cols; top += 1) {
      var topIndex = fluidIndex(top, 0);
      if (!fluid.solid[topIndex]) {
        var surfaceCol = clamp(Math.floor(top * FLUID_CELL / SURFACE_CELL), 0, surface.cols - 1);
        fluid.u[topIndex] += Math.sin(top * 0.31 + time * 0.35) * 0.008 + environment.wind * 0.004;
        fluid.v[topIndex] += surface.velocity[surfaceCol] * 0.018 + environment.tideVelocity * 0.006;
      }
    }

    for (var pylon = 0; pylon < geometry.pylons.length; pylon += 1) {
      var direction = pylon % 2 ? 1 : -1;
      injectFluid(geometry.pylons[pylon] + 5, geometry.line + 30, 0.02, direction * 0.025, 12, 0.006);
    }
    injectFluid(actors.raftX - 12, geometry.line + 5, actors.raftVX * 0.08, actors.raftVY * 0.08, 22, 0.045);
    injectFluid(actors.leviathanX - 28, actors.leviathanY, 0.04, Math.sin(time * 0.16) * 0.035, 46, 0.018);
    if (environment.storm > 0.28) {
      injectFluid(
        hash(Math.floor(time * 2.2)) * width,
        geometry.line + 12,
        environment.wind * 0.08,
        (hash(Math.floor(time * 3.7) + 4) - 0.5) * environment.storm * 0.18,
        38,
        environment.storm * 0.006
      );
    }
    var leviathanCell = sampleFluid(actors.leviathanX, actors.leviathanY);
    if (leviathanCell.nutrient < 1.1) {
      var lcol = clamp(Math.round(actors.leviathanX / FLUID_CELL), 0, fluid.cols - 1);
      var lrow = clamp(Math.round((actors.leviathanY - fluid.line) / FLUID_CELL), 0, fluid.rows - 1);
      fluid.nutrient[fluidIndex(lcol, lrow)] = clamp(fluid.nutrient[fluidIndex(lcol, lrow)] + dt * 0.08, 0, 1.3);
    }
    projectFluid();
  }

  function flowAt(x, y, time) {
    var flow = sampleFluid(x, y);
    flow.x += Math.sin(y * 0.025 + time * 0.12) * 0.025;
    flow.y += Math.sin(x * 0.018 - time * 0.14) * 0.018;
    return flow;
  }

  function depositSediment(x, amount) {
    if (!deposits) return;
    var index = clamp(Math.floor(x / 2), 0, deposits.length - 1);
    deposits[index] = clamp(deposits[index] + amount, 0, 5.5);
  }

  function updateSediment(dt, geometry) {
    if (!fluid || !deposits) return;
    var start = Math.max(0, Math.floor((geometry.left - 6) / 2));
    var end = Math.min(deposits.length - 1, Math.ceil(geometry.right / 2));
    for (var slot = start; slot <= end; slot += 1) {
      var x = slot * 2;
      var sampleY = geometry.foundationTop - 4;
      var flow = sampleFluid(x, sampleY);
      var speed = Math.sqrt(flow.x * flow.x + flow.y * flow.y);
      var fluidCol = clamp(Math.round(x / FLUID_CELL), 0, fluid.cols - 1);
      var fluidRow = clamp(Math.round((sampleY - fluid.line) / FLUID_CELL), 0, fluid.rows - 1);
      var index = fluidIndex(fluidCol, fluidRow);
      var deposition = fluid.dye[index] * Math.max(0, 0.58 - speed) * dt * 0.065;
      var erosion = deposits[slot] * Math.max(0, speed + environment.storm * 0.24 - 0.54) * dt * 0.024;
      deposits[slot] = clamp(deposits[slot] + deposition - erosion, 0, 5.5);
      fluid.dye[index] = clamp(fluid.dye[index] - deposition * 0.45 + erosion * 0.8, 0, 1.5);
    }
  }

  function updateSwimmers(dt, time, geometry, actors) {
    for (var i = 0; i < swimmers.length; i += 1) {
      var swimmer = swimmers[i];
      var sense = 13;
      var leftFood = sampleFluid(swimmer.x - sense, swimmer.y).plankton;
      var rightFood = sampleFluid(swimmer.x + sense, swimmer.y).plankton;
      var upFood = sampleFluid(swimmer.x, swimmer.y - sense).plankton;
      var downFood = sampleFluid(swimmer.x, swimmer.y + sense).plankton;
      var flow = sampleFluid(swimmer.x, swimmer.y);
      var desiredX = (rightFood - leftFood) * 1.7 + (swimmer.seed - 0.48) * 0.12;
      var desiredY = (downFood - upFood) * 1.45 + Math.sin(time * 0.2 + swimmer.seed * 19) * 0.035;

      var predatorX = swimmer.x - actors.leviathanX;
      var predatorY = swimmer.y - actors.leviathanY;
      var predatorDistance2 = predatorX * predatorX + predatorY * predatorY;
      if (predatorDistance2 < 90 * 90 && predatorDistance2 > 1) {
        var fear = (1 - Math.sqrt(predatorDistance2) / 90) * 2.4;
        desiredX += predatorX / Math.sqrt(predatorDistance2) * fear;
        desiredY += predatorY / Math.sqrt(predatorDistance2) * fear;
      }

      swimmer.vx += (flow.x * 0.48 + desiredX - swimmer.vx) * dt * 1.7;
      swimmer.vy += (flow.y * 0.48 + desiredY - swimmer.vy) * dt * 1.7;
      var speed = Math.sqrt(swimmer.vx * swimmer.vx + swimmer.vy * swimmer.vy);
      if (speed > 1.45) {
        swimmer.vx *= 1.45 / speed;
        swimmer.vy *= 1.45 / speed;
      }
      var nextX = swimmer.x + swimmer.vx * dt * 7;
      var nextY = swimmer.y + swimmer.vy * dt * 7;
      if (isSolid(nextX, nextY, geometry)) {
        swimmer.vx *= -0.8;
        swimmer.vy *= -0.8;
      } else {
        swimmer.x = nextX;
        swimmer.y = nextY;
      }
      swimmer.direction = swimmer.vx >= 0 ? 1 : -1;
      var eaten = consumePlankton(swimmer.x, swimmer.y, dt * 0.016);
      swimmer.energy = clamp(swimmer.energy + eaten * 1.9 - dt * 0.0035, 0, 1.2);

      var localSurface = surfaceY(swimmer.x, time, geometry.line, raft.x);
      if (screenToWorldX(swimmer.x) > WORLD_WRAP_RIGHT) swimmer.x = worldToScreenX(WORLD_WRAP_LEFT);
      if (screenToWorldX(swimmer.x) < WORLD_WRAP_LEFT) swimmer.x = worldToScreenX(WORLD_WRAP_RIGHT);
      if (swimmer.y < localSurface + 8) {
        swimmer.y = localSurface + 8;
        swimmer.vy = Math.abs(swimmer.vy);
      }
      if (swimmer.y > height - 5 || swimmer.energy <= 0.005) {
        swimmer.x = hash(swimmer.seed * 41 + time) * width;
        swimmer.y = geometry.line + 18 + hash(swimmer.seed * 67 + time) * Math.max(20, (height - geometry.line) * 0.6);
        swimmer.energy = 0.45;
      }
    }
  }

  function respawnParticle(particle, geometry) {
    var now = performance.now();
    particle.x = hash(particle.seed * 71 + now * 0.0001) * width;
    particle.y = geometry.line + 8 + hash(particle.seed * 103 + now * 0.0002) * Math.max(8, height - geometry.line - 14);
    for (var attempt = 0; attempt < 7 && isSolid(particle.x, particle.y, geometry); attempt += 1) {
      particle.x = hash(particle.seed * 149 + now * 0.00013 + attempt * 7) * width;
      particle.y = geometry.line + 8 + hash(particle.seed * 181 + now * 0.00017 + attempt * 13) * Math.max(8, height - geometry.line - 14);
    }
    particle.vx = 0;
    particle.vy = 0;
  }

  function updateParticles(dt, time, geometry, actors) {
    var blend = 1 - Math.exp(-dt * 2.1);
    for (var i = 0; i < particles.length; i += 1) {
      var particle = particles[i];
      var flow = flowAt(particle.x, particle.y, time);
      var targetX = flow.x;
      var targetY = flow.y;

      if (particle.kind === "bubble") {
        targetX *= 0.55;
        targetY -= 0.72 + particle.seed * 0.42;
      } else if (particle.kind === "silt") {
        targetX *= 0.32;
        targetY += 0.11;
      }

      particle.vx += (targetX - particle.vx) * blend;
      particle.vy += (targetY - particle.vy) * blend;

      var nextX = particle.x + particle.vx * dt;
      var nextY = particle.y + particle.vy * dt;
      if (isSolid(nextX, nextY, geometry)) {
        if (
          particle.kind === "silt" &&
          nextY >= geometry.foundationTop - 5 &&
          nextX >= geometry.left - 6 &&
          nextX <= geometry.right
        ) {
          depositSediment(nextX, 0.055);
          respawnParticle(particle, geometry);
          continue;
        }
        var canSlideY = !isSolid(particle.x, nextY, geometry);
        var canSlideX = !isSolid(nextX, particle.y, geometry);
        if (canSlideY) {
          nextX = particle.x;
          particle.vx *= -0.28;
        } else if (canSlideX) {
          nextY = particle.y;
          particle.vy *= -0.28;
        } else {
          nextX = particle.x;
          nextY = particle.y;
          particle.vx *= -0.35;
          particle.vy *= -0.35;
        }
        if (particle.kind === "silt") particle.vy -= 0.3;
      }

      particle.x = nextX;
      particle.y = nextY;

      var localSurface = surfaceY(particle.x, time, geometry.line, actors.raftX);
      if (particle.kind === "bubble" && particle.y <= localSurface + 2) {
        if (ripples.length < 18 && particle.seed > 0.68) {
          ripples.push({ x: particle.x, age: 0, amp: 0.55 + particle.seed * 0.55 });
          disturbSurface(particle.x, -0.34 - particle.seed * 0.24, 7);
        }
        particle.y = height - 5 - hash(particle.seed + time) * Math.max(12, height * 0.22);
        particle.x = hash(particle.seed * 97 + time) * width;
      } else if (particle.y <= localSurface + 2) {
        particle.y = localSurface + 3;
        particle.vy = Math.abs(particle.vy) * 0.2;
      }

      if (screenToWorldX(particle.x) > WORLD_WRAP_RIGHT) particle.x = worldToScreenX(WORLD_WRAP_LEFT);
      if (screenToWorldX(particle.x) < WORLD_WRAP_LEFT) particle.x = worldToScreenX(WORLD_WRAP_RIGHT);
      if (particle.y > height + 2) respawnParticle(particle, geometry);
    }

    for (var r = ripples.length - 1; r >= 0; r -= 1) {
      ripples[r].age += dt;
      if (ripples[r].age > 4) ripples.splice(r, 1);
    }
  }

  function drawPlanet(palette) {
    var radius = 94;
    var cx = Math.floor(worldToScreenX(94));
    var cy = 31;
    drawPixelDisc(cx, cy, radius, palette.planetDark);
    drawPixelDisc(cx - 4, cy - 4, radius - 7, palette.planet);
    for (var i = 0; i < 24; i += 1) {
      var angle = hash(i * 7.2) * Math.PI * 2;
      var dist = Math.sqrt(hash(i * 9.7 + 4)) * (radius - 18);
      var spot = 2 + Math.floor(hash(i * 4.3) * 8);
      drawPixelDisc(
        cx + Math.cos(angle) * dist,
        cy + Math.sin(angle) * dist,
        spot,
        i % 3 === 0 ? palette.planetLight : palette.planetDark
      );
    }
  }

  function drawPerson(x, y, phase, color, direction) {
    var step = Math.sin(phase) > 0 ? 1 : -1;
    var facing = direction || 1;
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y - 6), 2, 2);
    ctx.fillRect(Math.floor(x), Math.floor(y - 4), 2, 3);
    ctx.fillRect(Math.floor(x - step), Math.floor(y - 1), 1, 3);
    ctx.fillRect(Math.floor(x + 1 + step), Math.floor(y - 1), 1, 3);
    ctx.fillStyle = "#11111d";
    ctx.fillRect(Math.floor(x + (facing > 0 ? 1 : 0)), Math.floor(y - 5), 1, 1);
  }

  function drawSky(time, palette, line) {
    pixelRect(0, 0, width, line - 18, palette.sky);
    pixelRect(0, line - 18, width, 18, palette.skyLow);
    for (var band = line - 24; band < line - 10; band += 4) {
      var bandOffset = Math.floor(screenToWorldX(0) / 11) % 2;
      for (var bandX = -11; bandX < width + 11; bandX += 11) {
        if ((Math.floor(band / 4) + Math.floor(bandX / 11) + bandOffset) % 2 === 0) {
          pixelRect(bandX, band, 7, 2, palette.skyLow);
        }
      }
    }

    var starCell = 2.35;
    var firstStar = Math.floor(cameraX / starCell) - 1;
    var lastStar = Math.ceil((cameraX + width) / starCell) + 1;
    for (var i = firstStar; i <= lastStar; i += 1) {
      var starWorldX = i * starCell + hash(i * 2.7) * starCell;
      var x = Math.floor(worldToScreenX(starWorldX));
      var y = Math.floor(hash(i * 5.9 + 17) * 112);
      if (y >= line) continue;
      var twinkle = hash(i * 7 + Math.floor(time * 0.8));
      ctx.fillStyle = twinkle > 0.9 ? palette.foam : palette.star;
      ctx.fillRect(x, y, twinkle > 0.97 && mode === "C" ? 2 : 1, 1);
    }
    drawPlanet(palette);
  }

  function drawWater(time, palette, line, raftX) {
    pixelRect(0, line - 16, width, 46, palette.waterTop);
    pixelRect(0, line + 30, width, 58, palette.water);
    pixelRect(0, line + 88, width, 70, palette.waterDeep);
    pixelRect(0, line + 158, width, Math.max(1, height - line - 158), palette.abyss);
    for (var seam = 0; seam < 3; seam += 1) {
      var seamY = line + 27 + seam * 58;
      var seamColor = seam === 0 ? palette.water : seam === 1 ? palette.waterDeep : palette.abyss;
      for (var seamX = -8; seamX < width + 8; seamX += 8) {
        if ((Math.floor(screenToWorldX(seamX) / 8) + seam) % 2 === 0) {
          pixelRect(seamX, seamY, 5, 4, seamColor);
        }
      }
    }

    ctx.fillStyle = palette.waterTop;
    for (var x = 0; x < width; x += 1) {
      var top = Math.floor(surfaceY(x, time, line, raftX));
      ctx.fillRect(x, top, 1, Math.max(1, line + 16 - top));
    }

    ctx.globalAlpha = 0.32;
    for (var y = line + 14; y < height; y += 22) {
      var offset = Math.floor((time * 0.18 + y * 0.73) % 28);
      ctx.fillStyle = y < line + 90 ? palette.water : palette.waterDeep;
      for (var sx = -offset; sx < width; sx += 28) {
        var bend = Math.floor(Math.sin(sx * 0.03 + y * 0.025 - time * 0.12) * 3);
        ctx.fillRect(sx + bend, y, 9, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawAnchorCable(x1, y1, x2, y2, palette) {
    pixelLine(x1, y1, x2, y2, palette.steelDark, 3);
    pixelLine(x1, y1, x2, y2, palette.steel, 1);
  }

  function createMooring(geometry) {
    var count = 14;
    var anchorX = geometry.left - 3;
    var anchorY = geometry.foundationTop + 8;
    mooring.buoyX = geometry.left - 48;
    mooring.buoyY = surfaceY(mooring.buoyX, 0, geometry.line, raft.x) - 2;
    mooring.buoyVX = 0;
    mooring.buoyVY = 0;
    mooring.points = [];
    mooring.previous = [];
    for (var i = 0; i < count; i += 1) {
      var amount = i / (count - 1);
      var point = {
        x: lerp(anchorX, mooring.buoyX, amount),
        y: lerp(anchorY, mooring.buoyY, amount) + Math.sin(amount * Math.PI) * 8
      };
      mooring.points.push(point);
      mooring.previous.push({ x: point.x, y: point.y });
    }
    mooring.segmentLength = Math.sqrt(
      Math.pow(anchorX - mooring.buoyX, 2) + Math.pow(anchorY - mooring.buoyY, 2)
    ) / (count - 1) * 1.12;
    mooring.initialized = true;
  }

  function updateStructure(dt, geometry) {
    var currentForce = 0;
    for (var i = 0; i < geometry.pylons.length; i += 2) {
      currentForce += sampleFluid(geometry.pylons[i], geometry.line + 38).x - 0.25;
    }
    currentForce /= Math.max(1, Math.ceil(geometry.pylons.length / 2));
    var waveDifference = sampleSurface(geometry.left) - sampleSurface(Math.min(width - 1, geometry.right - 5));
    var windLoad = environment.wind * environment.storm * 0.72;
    var force = currentForce * 0.8 + waveDifference * 0.025 + windLoad;
    structure.swayVelocity += (force - structure.sway * 0.92 - structure.swayVelocity * 1.7) * dt;
    structure.sway = clamp(structure.sway + structure.swayVelocity * dt, -3.2, 3.2);

    var occupancyLoad = 0.22 + Math.sin(performance.now() * 0.00007) * 0.03;
    var targetSag = 0.35 + occupancyLoad + environment.storm * 0.8 + (1 - structure.integrity) * 1.8;
    structure.sagVelocity += (targetSag - structure.sag) * dt * 1.2 - structure.sagVelocity * dt * 1.6;
    structure.sag = clamp(structure.sag + structure.sagVelocity * dt, 0, 2.8);
    structure.stress = clamp(
      Math.abs(structure.sway) / 3.2 + environment.storm * 0.42 + Math.abs(structure.sagVelocity) * 0.3,
      0,
      1.4
    );
    if (structure.stress > 0.82) {
      structure.integrity = Math.max(0.72, structure.integrity - (structure.stress - 0.82) * dt * 0.0008);
    } else if (environment.storm < 0.3) {
      structure.integrity = Math.min(1, structure.integrity + dt * 0.00022);
    }
  }

  function updateMooring(dt, time, geometry) {
    if (!mooring.initialized || mooring.points.length < 2) createMooring(geometry);
    var anchorX = geometry.left - 3;
    var anchorY = geometry.foundationTop + 8;
    var buoySurface = surfaceY(mooring.buoyX, time, geometry.line, raft.x) - 2;
    var buoyFlow = sampleFluid(mooring.buoyX, geometry.line + 6);
    mooring.buoyVX += (buoyFlow.x * 0.9 + environment.wind * 0.08 - mooring.buoyVX) * dt * 0.9;
    mooring.buoyVY += ((buoySurface - mooring.buoyY) * 5 - mooring.buoyVY * 3.1) * dt;
    mooring.buoyX += mooring.buoyVX * dt;
    mooring.buoyY += mooring.buoyVY * dt;

    var maxReach = mooring.segmentLength * (mooring.points.length - 1) * 0.96;
    var ropeDX = mooring.buoyX - anchorX;
    var ropeDY = mooring.buoyY - anchorY;
    var ropeDistance = Math.sqrt(ropeDX * ropeDX + ropeDY * ropeDY);
    if (ropeDistance > maxReach) {
      var tension = ropeDistance - maxReach;
      mooring.buoyVX -= ropeDX / ropeDistance * tension * dt * 3.5;
      mooring.buoyVY -= ropeDY / ropeDistance * tension * dt * 3.5;
    }

    for (var i = 1; i < mooring.points.length - 1; i += 1) {
      var point = mooring.points[i];
      var previous = mooring.previous[i];
      var velocityX = (point.x - previous.x) * 0.992;
      var velocityY = (point.y - previous.y) * 0.992;
      previous.x = point.x;
      previous.y = point.y;
      var flow = sampleFluid(point.x, point.y);
      point.x += velocityX + flow.x * dt * 0.18;
      point.y += velocityY + (0.08 + flow.y * 0.1) * dt;
    }

    for (var iteration = 0; iteration < 6; iteration += 1) {
      mooring.points[0].x = anchorX;
      mooring.points[0].y = anchorY;
      var last = mooring.points.length - 1;
      mooring.points[last].x = mooring.buoyX;
      mooring.points[last].y = mooring.buoyY;
      for (var segment = 0; segment < last; segment += 1) {
        var a = mooring.points[segment];
        var b = mooring.points[segment + 1];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var distance = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
        var correction = (distance - mooring.segmentLength) / distance * 0.5;
        if (segment > 0) {
          a.x += dx * correction;
          a.y += dy * correction;
        }
        if (segment + 1 < last) {
          b.x -= dx * correction;
          b.y -= dy * correction;
        }
      }
    }
  }

  function drawMooring(palette) {
    if (!mooring.initialized) return;
    for (var i = 1; i < mooring.points.length; i += 1) {
      pixelLine(
        mooring.points[i - 1].x,
        mooring.points[i - 1].y,
        mooring.points[i].x,
        mooring.points[i].y,
        palette.steel,
        1
      );
    }
    ctx.fillStyle = palette.planetLight;
    ctx.fillRect(Math.floor(mooring.buoyX - 3), Math.floor(mooring.buoyY - 2), 7, 3);
    ctx.fillStyle = palette.steelDark;
    ctx.fillRect(Math.floor(mooring.buoyX), Math.floor(mooring.buoyY - 6), 1, 4);
    ctx.fillStyle = palette.lamp;
    ctx.fillRect(Math.floor(mooring.buoyX), Math.floor(mooring.buoyY - 7), 1, 1);
  }

  function drawSubstructure(time, palette, geometry) {
    var foundationWidth = geometry.right - geometry.left + 7;

    drawAnchorCable(
      geometry.left + foundationWidth * 0.2,
      geometry.foundationBottom,
      worldToScreenX(PLATFORM_WORLD_LEFT - 230),
      geometry.line + 360,
      palette
    );
    drawAnchorCable(
      geometry.left + foundationWidth * 0.62,
      geometry.foundationBottom,
      worldToScreenX(PLATFORM_WORLD_LEFT - 42),
      geometry.line + 370,
      palette
    );
    drawAnchorCable(
      geometry.right - 18,
      geometry.foundationBottom,
      worldToScreenX(PLATFORM_WORLD_LEFT + PLATFORM_WORLD_WIDTH + 230),
      geometry.line + 350,
      palette
    );

    for (var i = 0; i < geometry.pylons.length; i += 1) {
      var x = Math.floor(geometry.pylons[i]);
      var topX = x + structure.sway;
      var topY = geometry.line - 1 + structure.sag;
      pixelLine(topX, topY, x, geometry.foundationTop + 4, palette.steelDark, 6);
      pixelLine(topX - 1, topY, x - 1, geometry.foundationTop + 4, palette.steel, 2);
      for (var y = geometry.line + 10; y < geometry.foundationTop; y += 12) {
        var rungAmount = (y - geometry.line) / Math.max(1, geometry.foundationTop - geometry.line);
        var rungX = lerp(topX, x, rungAmount);
        pixelRect(rungX - 2, y, 6, 1, palette.timberLight);
      }
    }

    for (var b = 0; b < geometry.pylons.length - 1; b += 1) {
      var bx = geometry.pylons[b];
      var nx = geometry.pylons[b + 1];
      pixelLine(
        bx + structure.sway,
        geometry.line + 7 + structure.sag,
        nx,
        geometry.foundationTop - 5,
        palette.steelDark,
        2
      );
      pixelLine(
        nx + structure.sway,
        geometry.line + 7 + structure.sag,
        bx,
        geometry.foundationTop - 5,
        palette.steelDark,
        2
      );
    }

    panelBlock(
      geometry.left - 5,
      geometry.foundationTop,
      foundationWidth,
      25,
      palette.steel,
      palette.timberLight,
      palette.steelDark,
      81
    );
    moduleSpan(
      geometry.left - 2,
      geometry.foundationTop + 3,
      foundationWidth - 5,
      4,
      palette.steel,
      palette.timberLight,
      palette.steelDark,
      91,
      11
    );

    for (var tank = geometry.left + 8; tank < geometry.right - 8; tank += 18) {
      drawPixelDisc(tank, geometry.foundationTop + 13, 6, palette.steel);
      drawPixelDisc(tank - 1, geometry.foundationTop + 12, 4, palette.steelDark);
    }

    if (deposits) {
      ctx.fillStyle = palette.timberLight;
      ctx.globalAlpha = 0.72;
      var depositStart = Math.max(0, Math.floor((geometry.left - 5) / 2));
      var depositEnd = Math.min(deposits.length - 1, Math.ceil(geometry.right / 2));
      for (var deposit = depositStart; deposit <= depositEnd; deposit += 1) {
        var mound = Math.floor(deposits[deposit]);
        if (mound > 0) ctx.fillRect(deposit * 2, geometry.foundationTop - mound, 2, mound);
      }
      ctx.globalAlpha = 1;
    }

    var keelTop = geometry.foundationTop + 25;
    moduleSpan(
      geometry.left + 8, keelTop, foundationWidth - 22, 10,
      palette.steel, palette.timberLight, palette.steelDark, 121, 13
    );
    moduleSpan(
      geometry.left + 21, keelTop + 10, foundationWidth - 47, 7,
      palette.steel, palette.timberLight, palette.steelDark, 131, 11
    );
    moduleSpan(
      geometry.left + 38, keelTop + 17, foundationWidth - 80, 6,
      palette.steel, palette.timberLight, palette.steelDark, 141, 9
    );

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = palette.bubble;
    for (var j = 0; j < geometry.pylons.length; j += 3) {
      var py = geometry.line + 20 + ((j * 11 + Math.floor(time * 2)) % 45);
      ctx.fillRect(Math.floor(geometry.pylons[j] + 5), py, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function updateLeviathan(dt, time, geometry) {
    if (!leviathan.y) leviathan.y = geometry.line + (height - geometry.line) * 0.69;
    var sense = 48;
    var foodLeft = sampleFluid(leviathan.x - sense, leviathan.y).plankton;
    var foodRight = sampleFluid(leviathan.x + sense, leviathan.y).plankton;
    var foodUp = sampleFluid(leviathan.x, leviathan.y - sense).plankton;
    var foodDown = sampleFluid(leviathan.x, leviathan.y + sense).plankton;
    var localFlow = sampleFluid(leviathan.x, leviathan.y);
    var targetVX = 0.16 + localFlow.x * 0.12 + (foodRight - foodLeft) * 0.05;
    var targetVY = (foodDown - foodUp) * 0.07 + Math.sin(time * 0.08) * 0.035 + localFlow.y * 0.08;
    leviathan.vx += (targetVX - leviathan.vx) * dt * 0.2;
    leviathan.vy += (targetVY - leviathan.vy) * dt * 0.25;
    leviathan.x += leviathan.vx * dt;
    leviathan.y += leviathan.vy * dt;
    leviathan.y = clamp(
      leviathan.y,
      geometry.line + Math.max(34, (height - geometry.line) * 0.34),
      height - 25
    );
    consumePlankton(leviathan.x - 30, leviathan.y, dt * 0.009);
    if (screenToWorldX(leviathan.x) > WORLD_WRAP_RIGHT + 145) {
      leviathan.x = worldToScreenX(WORLD_WRAP_LEFT - 145);
    }
  }

  function drawLeviathan(time, palette, actors) {
    var x = actors.leviathanX;
    var y = actors.leviathanY;
    var scale = 0.82;
    ctx.globalAlpha = mode === "C" ? 0.72 : 0.55;
    ctx.fillStyle = palette.creature;
    ctx.fillRect(Math.floor(x - 37 * scale), Math.floor(y - 8 * scale), Math.floor(74 * scale), Math.floor(16 * scale));
    drawPixelDisc(x - 33 * scale, y, Math.floor(10 * scale), palette.creature);
    for (var i = 0; i < 7; i += 1) {
      var tentacleY = y + (i - 3) * 3 * scale;
      for (var s = 0; s < 38 * scale; s += 2) {
        var tx = x + 34 * scale + s;
        var ty = tentacleY + Math.sin(time * 0.23 + i + s * 0.13) * (2 + i % 3);
        ctx.fillRect(Math.floor(tx), Math.floor(ty), 2, 1);
      }
    }
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = palette.lamp;
    ctx.fillRect(Math.floor(x - 45 * scale), Math.floor(y - 5 * scale), 2, 2);
    ctx.globalAlpha = 1;
  }

  function drawFloatingKelp(time, palette, line) {
    var beds = [
      { x: worldToScreenX(34), w: 60, depth: 34 },
      { x: worldToScreenX(196), w: 35, depth: 23 }
    ];
    for (var b = 0; b < beds.length; b += 1) {
      var bed = beds[b];
      ctx.fillStyle = palette.kelp;
      for (var x = bed.x; x < bed.x + bed.w; x += 3) {
        var top = surfaceY(x, time, line, -999) + 4;
        ctx.fillRect(Math.floor(x), Math.floor(top), 3, 2);
        var strand = bed.depth * (0.45 + hash(x * 0.7) * 0.55);
        for (var y = 3; y < strand; y += 2) {
          var sway = Math.sin(time * 0.32 + y * 0.19 + x) * (y / strand) * 4;
          ctx.fillRect(Math.floor(x + 1 + sway), Math.floor(top + y), y % 8 === 1 ? 2 : 1, 2);
        }
      }
    }
  }

  function drawFluidMaterial(palette) {
    if (!fluid) return;
    for (var row = 0; row < fluid.rows; row += 1) {
      for (var col = 0; col < fluid.cols; col += 1) {
        var index = fluidIndex(col, row);
        var dye = fluid.dye[index];
        var plankton = fluid.plankton[index];
        if (fluid.solid[index]) continue;
        var x = col * FLUID_CELL;
        var y = fluid.line + row * FLUID_CELL;
        var velocityX = fluid.u[index];
        var velocityY = fluid.v[index];
        if (dye >= 0.035) {
          ctx.globalAlpha = clamp(dye * 0.42, 0.05, 0.42);
          ctx.fillStyle = velocityY < -0.08 ? palette.bubble : palette.timberLight;
          ctx.fillRect(
            Math.floor(x),
            Math.floor(y),
            Math.max(1, Math.floor(1 + Math.abs(velocityX) * 2.4)),
            Math.max(1, Math.floor(1 + Math.abs(velocityY) * 1.6))
          );
        }
        if (plankton > 0.12 && hash(col * 19.1 + row * 31.7) < plankton * 0.72) {
          ctx.globalAlpha = clamp(0.08 + plankton * (mode === "C" ? 0.48 : 0.32), 0.08, 0.62);
          ctx.fillStyle = plankton > 0.52 ? palette.lamp : palette.plankton;
          ctx.fillRect(Math.floor(x + hash(index * 3.9) * 4), Math.floor(y + hash(index * 7.1) * 4), 1, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawSwimmers(palette) {
    ctx.globalAlpha = mode === "A" ? 0.58 : 0.78;
    for (var i = 0; i < swimmers.length; i += 1) {
      var swimmer = swimmers[i];
      var x = Math.floor(swimmer.x);
      var y = Math.floor(swimmer.y);
      var facing = swimmer.direction;
      ctx.fillStyle = swimmer.energy > 0.7 ? palette.bubble : palette.plankton;
      ctx.fillRect(x - (facing < 0 ? 2 : 0), y, 3, 1);
      ctx.fillRect(x - facing * 2, y + (i % 2 ? 1 : -1), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawWeather(time, palette, line) {
    var storm = environment.storm;
    if (storm < 0.18) return;
    ctx.globalAlpha = clamp((storm - 0.12) * 0.45, 0, 0.36);
    ctx.fillStyle = palette.steelDark;
    for (var cloud = 0; cloud < 26; cloud += 1) {
      var cloudWorldX = wrapWorldX(
        WORLD_WRAP_LEFT + hash(cloud * 17.1) * (WORLD_WRAP_RIGHT - WORLD_WRAP_LEFT) + time * environment.wind * 2.1
      );
      var cloudX = worldToScreenX(cloudWorldX);
      var cloudY = 9 + hash(cloud * 11.7) * Math.max(8, line * 0.2);
      var cloudWidth = 22 + Math.floor(hash(cloud * 17.9) * 23);
      if (cloudX + cloudWidth < 0 || cloudX > width) continue;
      ctx.fillRect(Math.floor(cloudX), Math.floor(cloudY), cloudWidth, 3 + Math.floor(storm * 4));
    }
    ctx.globalAlpha = clamp((storm - 0.28) * 0.5, 0, 0.42);
    var rainCount = Math.floor(82 * storm);
    for (var drop = 0; drop < rainCount; drop += 1) {
      var phase = time * (18 + storm * 16) + drop * 23.7;
      var rainWorldX = wrapWorldX(
        WORLD_WRAP_LEFT + hash(drop * 7.9) * (WORLD_WRAP_RIGHT - WORLD_WRAP_LEFT) + phase * environment.wind * 0.22
      );
      var rainX = worldToScreenX(rainWorldX);
      if (rainX < -4 || rainX > width + 4) continue;
      var rainY = phase % Math.max(1, line + 9);
      pixelLine(rainX, rainY, rainX - environment.wind, rainY + 3 + storm * 3, palette.bubble, 1);
    }
    if (storm > 0.82 && hash(Math.floor(time * 1.7) * 13.1) > 0.965) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = palette.foam;
      pixelRect(0, 0, width, line, palette.foam);
      ctx.globalAlpha = 0.92;
      var boltX = worldToScreenX(
        WORLD_WRAP_LEFT + hash(Math.floor(time * 1.7) * 29.3) * (WORLD_WRAP_RIGHT - WORLD_WRAP_LEFT)
      );
      ctx.fillRect(Math.floor(boltX), 18, 1, Math.max(3, Math.floor(line * 0.16)));
      ctx.fillRect(Math.floor(boltX - 2), Math.floor(line * 0.16), 3, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawFluidDebug(palette) {
    if (!debugFlow || !fluid) return;
    ctx.globalAlpha = 0.62;
    for (var row = 1; row < fluid.rows; row += 3) {
      for (var col = 1; col < fluid.cols; col += 3) {
        var index = fluidIndex(col, row);
        if (fluid.solid[index]) continue;
        var x = col * FLUID_CELL;
        var y = fluid.line + row * FLUID_CELL;
        pixelLine(x, y, x + fluid.u[index] * 8, y + fluid.v[index] * 8, palette.bubble, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(palette) {
    ctx.globalAlpha = mode === "A" ? 0.63 : mode === "B" ? 0.75 : 0.86;
    for (var i = 0; i < particles.length; i += 1) {
      var particle = particles[i];
      ctx.fillStyle =
        particle.kind === "bubble"
          ? palette.bubble
          : particle.kind === "silt"
            ? palette.timberLight
            : palette.plankton;
      var size = particle.kind === "bubble" && mode === "C" && particle.seed > 0.75 ? 2 : 1;
      ctx.fillRect(Math.floor(particle.x), Math.floor(particle.y), size, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawSurface(time, palette, line, raftX) {
    ctx.fillStyle = palette.foam;
    for (var x = 0; x < width; x += 1) {
      var top = Math.floor(surfaceY(x, time, line, raftX));
      if ((x + Math.floor(time * 2.2)) % 7 !== 0) ctx.fillRect(x, top, 1, 1);
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = palette.bubble;
    for (var i = 0; i < ripples.length; i += 1) {
      var ripple = ripples[i];
      var radius = ripple.age * 8;
      ctx.fillRect(Math.floor(ripple.x - radius), geometryLineAt(ripple.x, time, line, raftX) + 1, Math.max(1, Math.floor(radius * 2)), 1);
    }
    ctx.globalAlpha = 1;
  }

  function geometryLineAt(x, time, line, raftX) {
    return Math.floor(surfaceY(x, time, line, raftX));
  }

  function drawPlatform(time, palette, geometry) {
    ctx.save();
    ctx.translate(Math.round(structure.sway), Math.round(structure.sag));
    var left = geometry.left;
    var right = geometry.right;
    var deck = geometry.deck;
    var span = right - left;

    moduleSpan(left, deck, span, 9, palette.timber, palette.timberLight, palette.steelDark, 211, 10);
    moduleSpan(left - 3, deck - 2, span + 3, 3, palette.timberLight, palette.foam, palette.timber, 223, 8);

    var lowerDeck = geometry.line - 12;
    moduleSpan(
      left - 8, lowerDeck, Math.floor(span * 0.52), 5,
      palette.timber, palette.timberLight, palette.steelDark, 229, 9
    );

    for (var p = 0; p < geometry.pylons.length; p += 1) {
      var px = Math.floor(geometry.pylons[p]);
      ctx.fillStyle = palette.steelDark;
      ctx.fillRect(px - 2, deck + 8, 6, geometry.line - deck - 7);
      ctx.fillStyle = palette.steel;
      ctx.fillRect(px - 1, deck + 9, 2, geometry.line - deck - 8);
    }

    var blockLeft = left + Math.floor(span * 0.28);
    var mainBlockWidth = Math.floor(span - (blockLeft - left) - 7);
    var upperBlockLeft = left + Math.floor(span * 0.48);
    var upperBlockWidth = Math.floor(span * 0.31);
    panelBlock(
      blockLeft, deck - 35, mainBlockWidth, 35,
      palette.timber, palette.timberLight, palette.steelDark, 241
    );
    panelBlock(
      upperBlockLeft, deck - 54, upperBlockWidth, 20,
      palette.timber, palette.timberLight, palette.steelDark, 251
    );
    moduleSpan(
      blockLeft - 2, deck - 38, mainBlockWidth + 4, 4,
      palette.timberLight, palette.foam, palette.timber, 257, 9
    );
    moduleSpan(
      upperBlockLeft - 2, deck - 57, upperBlockWidth + 4, 4,
      palette.timberLight, palette.foam, palette.timber, 263, 9
    );

    for (var floor = 0; floor < 3; floor += 1) {
      var wy = deck - 29 + floor * 10;
      for (var wx = blockLeft + 7; wx < right - 10; wx += 13) {
        var lit = hash(wx * 0.13 + floor * 9 + Math.floor(time / 8)) > 0.23;
        if (
          structure.stress > 0.72 &&
          hash(wx * 0.37 + floor * 13 + Math.floor(time * 5)) < (structure.stress - 0.72) * 0.46
        ) lit = false;
        ctx.fillStyle = lit ? palette.lamp : palette.steelDark;
        ctx.fillRect(Math.floor(wx), wy, 5, 4);
        if (lit && mode === "C") {
          ctx.globalAlpha = 0.16;
          ctx.fillRect(Math.floor(wx - 1), wy - 1, 7, 6);
          ctx.globalAlpha = 1;
        }
      }
    }

    var towerX = left + Math.floor(span * 0.62);
    moduleSpan(towerX, deck - 86, 7, 31, palette.steel, palette.timberLight, palette.steelDark, 271, 7);
    moduleSpan(towerX - 18, deck - 84, 42, 3, palette.steel, palette.timberLight, palette.steelDark, 277, 7);
    pixelLine(towerX + 3, deck - 91, towerX + 3, deck - 85, palette.steel, 2);
    moduleSpan(towerX - 15, deck - 94, 36, 3, palette.steel, palette.timberLight, palette.steelDark, 281, 6);
    pixelRect(towerX + 2, deck - 96, 2, 2, palette.lamp);

    var padY = deck - 48;
    moduleSpan(
      left + 6, padY, Math.floor(span * 0.24), 3,
      palette.steel, palette.timberLight, palette.steelDark, 293, 8
    );
    pixelLine(left + 10, padY + 3, left + 10, deck - 1, palette.steelDark, 3);
    moduleSpan(
      left + Math.floor(span * 0.79), deck - 68, Math.floor(span * 0.2), 3,
      palette.steel, palette.timberLight, palette.steelDark, 307, 8
    );

    for (var i = 0; i < 38; i += 1) {
      var deckChoice = i % 5 === 0 ? lowerDeck - 2 : i % 4 === 0 ? deck - 38 : deck - 2;
      var startX = deckChoice === lowerDeck - 2 ? left - 4 : deckChoice === deck - 38 ? blockLeft + 8 : left + 4;
      var usable = deckChoice === lowerDeck - 2 ? span * 0.48 : deckChoice === deck - 38 ? span * 0.62 : span - 15;
      var baseX = startX + hash(i * 4.77) * usable;
      var roam = Math.sin(time * (0.045 + (i % 7) * 0.006) + i * 3.9) * (2 + (i % 4));
      drawPerson(
        baseX + roam,
        deckChoice,
        time * 1.25 + i,
        i % 3 === 0 ? palette.kelp : palette.foam,
        i % 2 ? 1 : -1
      );
    }
    if (structure.integrity < 0.985) {
      drawPerson(left + span * 0.58, deck - 2, time * 2.1, palette.lamp, -1);
      ctx.fillStyle = palette.lamp;
      ctx.fillRect(Math.floor(left + span * 0.58 + 4), deck - 1, 2, 1);
    }
    ctx.restore();
  }

  function updateRaft(dt, time, line) {
    if (!raft.y) raft.y = surfaceY(raft.x + 14, time, line, raft.x) - 4;
    var localFlow = sampleFluid(raft.x + 14, line + 7);
    var targetVelocity = 1.15 + localFlow.x * 0.85;
    raft.vx += (targetVelocity - raft.vx) * dt * 0.55;
    raft.x += raft.vx * dt;

    var targetY = surfaceY(raft.x + 14, time, line, raft.x) - 4;
    var lift = (targetY - raft.y) * 5.2 - raft.vy * 3.1;
    raft.vy += lift * dt;
    raft.y += raft.vy * dt;

    var slope = (
      surfaceY(raft.x + 27, time, line, raft.x) -
      surfaceY(raft.x, time, line, raft.x)
    ) / 27;
    var angleForce = (slope - raft.angle) * 3.2 - raft.angularVelocity * 2.5;
    raft.angularVelocity += angleForce * dt;
    raft.angle += raft.angularVelocity * dt;
    disturbSurface(raft.x + 27, -raft.vx * dt * 0.38 - raft.vy * dt * 0.22, 8);
    disturbSurface(raft.x + 1, raft.vx * dt * 0.24, 7);

    if (screenToWorldX(raft.x) > WORLD_WRAP_RIGHT + 62) {
      raft.x = worldToScreenX(WORLD_WRAP_LEFT - 58);
      raft.y = surfaceY(raft.x + 14, time, line, raft.x) - 4;
      raft.vy = 0;
      raft.angle = 0;
    }
  }

  function drawRaft(time, palette) {
    var centerX = Math.round(raft.x + 14);
    var centerY = Math.round(raft.y + 2);
    var steppedAngle = Math.round(clamp(raft.angle, -0.16, 0.16) * 12) / 12;
    var leftY = centerY - Math.round(steppedAngle * 14);
    var rightY = centerY + Math.round(steppedAngle * 15);
    pixelLine(centerX - 14, leftY, centerX + 15, rightY, palette.timberLight, 3);
    pixelLine(centerX - 11, leftY + 3, centerX + 12, rightY + 3, palette.timber, 2);
    var mastY = Math.round(lerp(leftY, rightY, 18 / 29));
    pixelLine(centerX + 4, mastY, centerX + 4, mastY - 11, palette.timber, 1);
    moduleSpan(centerX + 5, mastY - 11, 7, 5, palette.foam, palette.star, palette.steel, 401, 7);
    var people = [
      { offset: -6, phase: time * 1.1, color: palette.foam, facing: 1 },
      { offset: 2, phase: time * 0.9 + 2, color: palette.kelp, facing: -1 },
      { offset: 10, phase: time * 1.05 + 4, color: palette.foam, facing: -1 }
    ];
    for (var i = 0; i < people.length; i += 1) {
      var person = people[i];
      var amount = (person.offset + 14) / 29;
      drawPerson(
        centerX + person.offset,
        Math.round(lerp(leftY, rightY, amount)) - 1,
        person.phase,
        person.color,
        person.facing
      );
    }
  }

  function updateCarpet(dt, time, line) {
    var targetY = line - 52 + Math.sin(time * 0.45) * 5 + environment.wind * 0.7;
    carpet.vx += (-3.2 - environment.wind * 0.34 - carpet.vx) * dt * 0.8;
    carpet.vy += (targetY - carpet.y) * dt * 1.8 - carpet.vy * dt * 1.5;
    carpet.x += carpet.vx * dt;
    carpet.y += carpet.vy * dt;
    if (screenToWorldX(carpet.x) < WORLD_WRAP_LEFT - 65) {
      carpet.x = worldToScreenX(WORLD_WRAP_RIGHT + 65);
      carpet.y = targetY;
      carpet.vy = 0;
    }
  }

  function drawCarpet(time, palette, line) {
    var x = carpet.x;
    var y = carpet.y;
    ctx.fillStyle = palette.planetLight;
    ctx.fillRect(Math.floor(x), Math.floor(y), 20, 2);
    ctx.fillStyle = palette.kelp;
    ctx.fillRect(Math.floor(x + 2), Math.floor(y + 1), 16, 1);
    drawPerson(x + 9, y, time * 1.2, palette.foam, -1);
    ctx.globalAlpha = 0.55;
    for (var i = 0; i < 7; i += 1) {
      ctx.fillStyle = palette.plankton;
      ctx.fillRect(Math.floor(x + 21 + i * 2), Math.floor(y + 1 + Math.sin(i + time * 0.6) * 2), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawPortal(time, palette, line) {
    var x = Math.floor(worldToScreenX(51));
    pixelArc(x, line + 3, 18, Math.PI, Math.PI * 2, palette.steel, 3);
    ctx.globalAlpha = 0.3 + Math.sin(time * 0.3) * 0.08;
    pixelArc(x, line + 3, 14, Math.PI, Math.PI * 2, palette.bubble, 1);
    ctx.globalAlpha = 1;
  }

  function drawWorld(time, dt) {
    var palette = PALETTES[mode];
    var geometry = platformGeometry();
    updateEnvironment(dt, time);
    updateSurface(dt, time);
    updateRaft(dt, time, geometry.line);
    updateLeviathan(dt, time, geometry);
    updateCarpet(dt, time, geometry.line);
    var actors = {
      raftX: raft.x,
      raftY: raft.y,
      raftVX: raft.vx,
      raftVY: raft.vy,
      leviathanX: leviathan.x,
      leviathanY: leviathan.y
    };

    updateFluid(dt, time, geometry, actors);
    updateStructure(dt, geometry);
    updateMooring(dt, time, geometry);
    updateSediment(dt, geometry);
    updateSwimmers(dt, time, geometry, actors);
    updateParticles(dt, time, geometry, actors);
    drawSky(time, palette, geometry.line);
    drawWeather(time, palette, geometry.line);
    drawWater(time, palette, geometry.line, raft.x);
    drawPortal(time, palette, geometry.line);
    drawSubstructure(time, palette, geometry);
    drawLeviathan(time, palette, actors);
    drawFloatingKelp(time, palette, geometry.line);
    drawFluidMaterial(palette);
    drawSwimmers(palette);
    drawParticles(palette);
    drawSurface(time, palette, geometry.line, raft.x);
    drawMooring(palette);
    drawPlatform(time, palette, geometry);
    drawRaft(time, palette);
    drawCarpet(time, palette, geometry.line);
    drawFluidDebug(palette);
  }

  function resize() {
    var oldCameraX = cameraX;
    var oldLine = fluid ? fluid.line : waterlineY();
    var oldFluid = fluid;
    var oldSurface = surface;
    var oldParticles = particles;
    var oldSwimmers = swimmers;
    var oldDeposits = deposits;
    var hadWorld = !!fluid;

    width = Math.max(1, Math.ceil(window.innerWidth / ART_PIXEL));
    height = Math.max(1, Math.ceil(window.innerHeight / ART_PIXEL));
    cameraX = (REFERENCE_WIDTH - width) * 0.5;
    var xShift = oldCameraX - cameraX;
    var newLine = waterlineY();
    var yShift = newLine - oldLine;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width * ART_PIXEL + "px";
    canvas.style.height = height * ART_PIXEL + "px";
    ctx.imageSmoothingEnabled = false;
    createSurface();
    if (oldSurface) {
      for (var surfaceCol = 0; surfaceCol < surface.cols; surfaceCol += 1) {
        var newScreenX = surfaceCol * SURFACE_CELL;
        var oldScreenX = newScreenX + cameraX - oldCameraX;
        var oldGridX = oldScreenX / SURFACE_CELL;
        if (oldGridX < 0 || oldGridX > oldSurface.cols - 1) continue;
        surface.height[surfaceCol] = sampleGridArray(
          oldSurface.height,
          oldSurface.cols,
          1,
          oldGridX,
          0
        );
        surface.velocity[surfaceCol] = sampleGridArray(
          oldSurface.velocity,
          oldSurface.cols,
          1,
          oldGridX,
          0
        );
      }
    }

    createFluid(platformGeometry());
    if (oldFluid) {
      var fields = ["u", "v", "dye", "nutrient", "plankton"];
      for (var row = 0; row < fluid.rows; row += 1) {
        for (var col = 0; col < fluid.cols; col += 1) {
          var index = fluidIndex(col, row);
          if (fluid.solid[index]) continue;
          var oldFluidScreenX = col * FLUID_CELL + cameraX - oldCameraX;
          var oldFluidGridX = oldFluidScreenX / FLUID_CELL;
          if (row > oldFluid.rows - 1 || oldFluidGridX < 0 || oldFluidGridX > oldFluid.cols - 1) continue;
          for (var field = 0; field < fields.length; field += 1) {
            var fieldName = fields[field];
            fluid[fieldName][index] = sampleGridArray(
              oldFluid[fieldName],
              oldFluid.cols,
              oldFluid.rows,
              oldFluidGridX,
              row
            );
          }
        }
      }
    }

    createParticles();
    if (oldParticles && oldParticles.length) {
      for (var particle = 0; particle < Math.min(particles.length, oldParticles.length); particle += 1) {
        particles[particle] = oldParticles[particle];
        particles[particle].x += xShift;
        particles[particle].y += yShift;
      }
    }
    createSwimmers();
    if (oldSwimmers && oldSwimmers.length) {
      for (var swimmer = 0; swimmer < Math.min(swimmers.length, oldSwimmers.length); swimmer += 1) {
        swimmers[swimmer] = oldSwimmers[swimmer];
        swimmers[swimmer].x += xShift;
        swimmers[swimmer].y += yShift;
      }
    }
    createDeposits();
    if (oldDeposits) {
      for (var deposit = 0; deposit < deposits.length; deposit += 1) {
        var oldDepositScreenX = deposit * 2 + cameraX - oldCameraX;
        var oldDepositGridX = oldDepositScreenX / 2;
        if (oldDepositGridX < 0 || oldDepositGridX > oldDeposits.length - 1) continue;
        deposits[deposit] = sampleGridArray(
          oldDeposits,
          oldDeposits.length,
          1,
          oldDepositGridX,
          0
        );
      }
    }

    if (hadWorld) {
      raft.x += xShift;
      raft.y += yShift;
      leviathan.x += xShift;
      leviathan.y += yShift;
      carpet.x += xShift;
      carpet.y += yShift;
      mooring.buoyX += xShift;
      mooring.buoyY += yShift;
      for (var point = 0; point < mooring.points.length; point += 1) {
        mooring.points[point].x += xShift;
        mooring.points[point].y += yShift;
        mooring.previous[point].x += xShift;
        mooring.previous[point].y += yShift;
      }
    } else {
      mooring.initialized = false;
      leviathan.y = newLine + (height - newLine) * 0.69;
      raft.y = surfaceY(raft.x + 14, 0, newLine, raft.x) - 4;
      carpet.y = newLine - 52;
    }
    if (window.__mareDebug) {
      canvas.dataset.worldState = JSON.stringify(window.__mareDebug.snapshot());
    }
  }

  function setMode(nextMode) {
    if (!PALETTES[nextMode]) return;
    mode = nextMode;
    shell.classList.remove("mode-a", "mode-b", "mode-c");
    shell.classList.add("mode-" + nextMode.toLowerCase());
    document.querySelectorAll("[data-mode]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.mode === nextMode);
    });
  }

  function showInterface() {
    shell.classList.remove("ui-hidden");
    window.clearTimeout(uiTimer);
    uiTimer = window.setTimeout(function () {
      shell.classList.add("ui-hidden");
    }, 5500);
  }

  function pointerPosition(event) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * width / rect.width,
      y: (event.clientY - rect.top) * height / rect.height
    };
  }

  function stirWater(event, firstContact) {
    var position = pointerPosition(event);
    var line = waterlineY();
    if (position.y < line - 5) {
      pointer.x = position.x;
      pointer.y = position.y;
      return;
    }
    var dx = firstContact ? 0 : position.x - pointer.x;
    var dy = firstContact ? 0 : position.y - pointer.y;
    injectFluid(
      position.x,
      Math.max(line + 1, position.y),
      clamp(dx * 0.7, -3.4, 3.4),
      clamp(dy * 0.7, -3.4, 3.4),
      firstContact ? 18 : 27,
      firstContact ? 0.72 : 0.28
    );
    if (Math.abs(position.y - surfaceY(position.x, 0, line, raft.x)) < 24) {
      disturbSurface(position.x, firstContact ? -1.25 : clamp(dy * 0.12, -1.8, 1.8), firstContact ? 13 : 9);
    }
    if (firstContact && Math.abs(position.y - line) < 20 && ripples.length < 18) {
      ripples.push({ x: position.x, age: 0, amp: 1.45 });
    }
    pointer.x = position.x;
    pointer.y = position.y;
  }

  function render(now) {
    var dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    drawWorld((now - started) / 1000, dt);
    requestAnimationFrame(render);
  }

  document.querySelectorAll("[data-mode]").forEach(function (button) {
    button.addEventListener("click", function () {
      setMode(button.dataset.mode);
      showInterface();
    });
  });

  window.addEventListener("keydown", function (event) {
    var key = event.key.toUpperCase();
    if (key === "A" || key === "B" || key === "C") setMode(key);
    if (key === "F") document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    if (key === "H") shell.classList.toggle("ui-hidden");
    if (key === "D") debugFlow = !debugFlow;
    if (key === "S") environment.forcedStorm = 12;
  });
  canvas.addEventListener("pointerdown", function (event) {
    pointer.down = true;
    canvas.setPointerCapture && canvas.setPointerCapture(event.pointerId);
    stirWater(event, true);
  });
  canvas.addEventListener("pointermove", function (event) {
    if (pointer.down) stirWater(event, false);
  });
  canvas.addEventListener("pointerup", function () {
    pointer.down = false;
  });
  canvas.addEventListener("pointercancel", function () {
    pointer.down = false;
  });
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", showInterface, { passive: true });

  window.__mareDebug = {
    snapshot: function () {
      var geometry = platformGeometry();
      var dyeMass = 0;
      var planktonMass = 0;
      if (fluid) {
        for (var i = 0; i < fluid.dye.length; i += 1) {
          dyeMass += fluid.dye[i];
          planktonMass += fluid.plankton[i];
        }
      }
      return {
        viewport: [width, height],
        cameraX: cameraX,
        waterline: geometry.line,
        platformWorldLeft: screenToWorldX(geometry.left),
        platformWidth: geometry.right - geometry.left,
        raftWorldX: screenToWorldX(raft.x),
        leviathanWorldX: screenToWorldX(leviathan.x),
        particleWorldX: particles.slice(0, 6).map(function (particle) {
          return screenToWorldX(particle.x);
        }),
        dyeMass: dyeMass,
        planktonMass: planktonMass
      };
    }
  };

  resize();
  showInterface();
  requestAnimationFrame(render);
}());
