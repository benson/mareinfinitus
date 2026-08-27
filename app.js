(function () {
  "use strict";

  var ART_PIXEL = 3;
  var WATERLINE = 0.36;
  var FLUID_CELL = 6;

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
  var ripples = [];
  var fluid = null;
  var debugFlow = false;
  var raft = { x: -42, y: 0, vx: 1.1, vy: 0, angle: 0, angularVelocity: 0 };
  var pointer = { down: false, x: 0, y: 0 };
  var width = 1;
  var height = 1;
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

  function platformGeometry() {
    var line = Math.floor(height * WATERLINE);
    var left = Math.max(18, Math.floor(width * 0.34));
    var right = width + 8;
    var deck = line - 36;
    var pylonCount = Math.max(9, Math.floor((right - left) / 17));
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

  function surfaceY(x, time, line, raftX) {
    var broad = Math.sin(x * 0.032 + time * 0.42) * 1.6;
    var swell = Math.sin(x * 0.011 - time * 0.24) * 2.1;
    var wake = 0;
    var behind = raftX - x;
    if (behind > 0 && behind < 55) {
      wake = Math.sin(behind * 0.72 - time * 2.2) * (1 - behind / 55) * 1.5;
    }
    for (var i = 0; i < ripples.length; i += 1) {
      var ripple = ripples[i];
      var distance = Math.abs(x - ripple.x);
      var radius = ripple.age * 8;
      if (Math.abs(distance - radius) < 5) {
        wake += Math.sin((distance - radius) * 1.4) * ripple.amp * (1 - ripple.age / 4);
      }
    }
    return line + broad + swell + wake;
  }

  function createParticles() {
    var line = Math.floor(height * WATERLINE);
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
      solid: new Uint8Array(size)
    };
    for (var row = 0; row < rows; row += 1) {
      for (var col = 0; col < cols; col += 1) {
        var index = row * cols + col;
        var worldX = col * FLUID_CELL;
        var worldY = geometry.line + row * FLUID_CELL;
        fluid.u[index] = 0.3;
        fluid.solid[index] = isSolid(worldX, worldY, geometry) ? 1 : 0;
      }
    }
  }

  function sampleFluidArray(array, gridX, gridY) {
    if (!fluid) return 0;
    var x = clamp(gridX, 0, fluid.cols - 1.001);
    var y = clamp(gridY, 0, fluid.rows - 1.001);
    var x0 = Math.floor(x);
    var y0 = Math.floor(y);
    var x1 = Math.min(fluid.cols - 1, x0 + 1);
    var y1 = Math.min(fluid.rows - 1, y0 + 1);
    var tx = x - x0;
    var ty = y - y0;
    var a = array[fluidIndex(x0, y0)] * (1 - tx) + array[fluidIndex(x1, y0)] * tx;
    var b = array[fluidIndex(x0, y1)] * (1 - tx) + array[fluidIndex(x1, y1)] * tx;
    return a * (1 - ty) + b * ty;
  }

  function sampleFluid(x, y) {
    if (!fluid || y < fluid.line) return { x: 0.3, y: 0, dye: 0 };
    var gridX = x / FLUID_CELL;
    var gridY = (y - fluid.line) / FLUID_CELL;
    return {
      x: sampleFluidArray(fluid.u, gridX, gridY),
      y: sampleFluidArray(fluid.v, gridX, gridY),
      dye: sampleFluidArray(fluid.dye, gridX, gridY)
    };
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

    for (var row = 0; row < fluid.rows; row += 1) {
      for (var col = 0; col < fluid.cols; col += 1) {
        var index = fluidIndex(col, row);
        if (fluid.solid[index]) {
          fluid.u[index] = 0;
          fluid.v[index] = 0;
          fluid.dye[index] *= 0.92;
          continue;
        }
        var backX = col - fluid.u0[index] * dt / FLUID_CELL;
        var backY = row - fluid.v0[index] * dt / FLUID_CELL;
        var depth = row / Math.max(1, fluid.rows - 1);
        var targetCurrent = 0.28 + Math.sin(row * 0.21 + time * 0.08) * 0.06 * (1 - depth);
        fluid.u[index] = sampleFluidArray(fluid.u0, backX, backY) * 0.997 + targetCurrent * 0.003;
        fluid.v[index] = sampleFluidArray(fluid.v0, backX, backY) * 0.994;
        fluid.dye[index] = sampleFluidArray(fluid.dye0, backX, backY) * 0.986;
      }
    }

    for (var top = 0; top < fluid.cols; top += 1) {
      var topIndex = fluidIndex(top, 0);
      if (!fluid.solid[topIndex]) {
        fluid.u[topIndex] += Math.sin(top * 0.31 + time * 0.35) * 0.008;
        fluid.v[topIndex] += Math.sin(top * 0.18 - time * 0.42) * 0.006;
      }
    }

    for (var pylon = 0; pylon < geometry.pylons.length; pylon += 1) {
      var direction = pylon % 2 ? 1 : -1;
      injectFluid(geometry.pylons[pylon] + 5, geometry.line + 30, 0.02, direction * 0.025, 12, 0.006);
    }
    injectFluid(actors.raftX - 12, geometry.line + 5, actors.raftVX * 0.08, actors.raftVY * 0.08, 22, 0.045);
    injectFluid(actors.leviathanX - 28, actors.leviathanY, 0.04, Math.sin(time * 0.16) * 0.035, 46, 0.018);
    projectFluid();
  }

  function flowAt(x, y, time) {
    var flow = sampleFluid(x, y);
    flow.x += Math.sin(y * 0.025 + time * 0.12) * 0.025;
    flow.y += Math.sin(x * 0.018 - time * 0.14) * 0.018;
    return flow;
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
        }
        particle.y = height - 5 - hash(particle.seed + time) * Math.max(12, height * 0.22);
        particle.x = hash(particle.seed * 97 + time) * width;
      } else if (particle.y <= localSurface + 2) {
        particle.y = localSurface + 3;
        particle.vy = Math.abs(particle.vy) * 0.2;
      }

      if (particle.x > width + 3) particle.x = -3;
      if (particle.x < -4) particle.x = width + 3;
      if (particle.y > height + 2) respawnParticle(particle, geometry);
    }

    for (var r = ripples.length - 1; r >= 0; r -= 1) {
      ripples[r].age += dt;
      if (ripples[r].age > 4) ripples.splice(r, 1);
    }
  }

  function drawPlanet(palette) {
    var radius = Math.floor(clamp(width * 0.22, 58, 106));
    var cx = Math.floor(width * 0.22);
    var cy = Math.floor(height * 0.13);
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
    var gradient = ctx.createLinearGradient(0, 0, 0, line);
    gradient.addColorStop(0, palette.sky);
    gradient.addColorStop(1, palette.skyLow);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, line + 5);

    var starCount = Math.floor(width * line * 0.0055);
    for (var i = 0; i < starCount; i += 1) {
      var x = Math.floor(hash(i * 2.7 + width) * width);
      var y = Math.floor(hash(i * 5.9 + height) * line);
      var twinkle = hash(i * 7 + Math.floor(time * 0.8));
      ctx.fillStyle = twinkle > 0.9 ? palette.foam : palette.star;
      ctx.fillRect(x, y, twinkle > 0.97 && mode === "C" ? 2 : 1, 1);
    }
    drawPlanet(palette);
  }

  function drawWater(time, palette, line, raftX) {
    var gradient = ctx.createLinearGradient(0, line, 0, height);
    gradient.addColorStop(0, palette.waterTop);
    gradient.addColorStop(0.35, palette.water);
    gradient.addColorStop(1, palette.abyss);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, line - 4, width, height - line + 4);

    ctx.fillStyle = palette.waterTop;
    for (var x = 0; x < width; x += 1) {
      var top = Math.floor(surfaceY(x, time, line, raftX));
      ctx.fillRect(x, top, 1, Math.max(1, line + 4 - top));
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
    ctx.strokeStyle = palette.steelDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.floor(x1), Math.floor(y1));
    ctx.lineTo(Math.floor(x2), Math.floor(y2));
    ctx.stroke();
    ctx.strokeStyle = palette.steel;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.floor(x1), Math.floor(y1));
    ctx.lineTo(Math.floor(x2), Math.floor(y2));
    ctx.stroke();
  }

  function drawSubstructure(time, palette, geometry) {
    var foundationWidth = geometry.right - geometry.left + 7;

    drawAnchorCable(
      geometry.left + foundationWidth * 0.2,
      geometry.foundationBottom,
      Math.max(-25, geometry.left - width * 0.55),
      height + 30,
      palette
    );
    drawAnchorCable(
      geometry.left + foundationWidth * 0.62,
      geometry.foundationBottom,
      geometry.left - width * 0.08,
      height + 35,
      palette
    );
    drawAnchorCable(
      geometry.right - 18,
      geometry.foundationBottom,
      width + Math.max(35, width * 0.4),
      height + 25,
      palette
    );

    for (var i = 0; i < geometry.pylons.length; i += 1) {
      var x = Math.floor(geometry.pylons[i]);
      ctx.fillStyle = palette.steelDark;
      ctx.fillRect(x - 2, geometry.line - 1, 6, geometry.foundationTop - geometry.line + 6);
      ctx.fillStyle = palette.steel;
      ctx.fillRect(x - 1, geometry.line, 2, geometry.foundationTop - geometry.line + 4);
      for (var y = geometry.line + 10; y < geometry.foundationTop; y += 12) {
        ctx.fillStyle = palette.timberLight;
        ctx.fillRect(x - 2, y, 6, 1);
      }
    }

    ctx.strokeStyle = palette.steelDark;
    ctx.lineWidth = 2;
    for (var b = 0; b < geometry.pylons.length - 1; b += 1) {
      var bx = geometry.pylons[b];
      var nx = geometry.pylons[b + 1];
      ctx.beginPath();
      ctx.moveTo(bx, geometry.line + 7);
      ctx.lineTo(nx, geometry.foundationTop - 5);
      ctx.moveTo(nx, geometry.line + 7);
      ctx.lineTo(bx, geometry.foundationTop - 5);
      ctx.stroke();
    }

    ctx.fillStyle = palette.steelDark;
    ctx.fillRect(geometry.left - 5, geometry.foundationTop, foundationWidth, 25);
    ctx.fillStyle = palette.steel;
    ctx.fillRect(geometry.left - 2, geometry.foundationTop + 3, foundationWidth - 5, 4);
    ctx.fillRect(geometry.left + 4, geometry.foundationTop + 19, foundationWidth - 13, 3);

    for (var tank = geometry.left + 8; tank < geometry.right - 8; tank += 18) {
      drawPixelDisc(tank, geometry.foundationTop + 13, 6, palette.steel);
      drawPixelDisc(tank - 1, geometry.foundationTop + 12, 4, palette.steelDark);
    }

    var keelTop = geometry.foundationTop + 25;
    ctx.fillStyle = palette.steelDark;
    ctx.fillRect(geometry.left + 8, keelTop, foundationWidth - 22, 10);
    ctx.fillRect(geometry.left + 21, keelTop + 10, foundationWidth - 47, 7);
    ctx.fillRect(geometry.left + 38, keelTop + 17, foundationWidth - 80, 6);

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = palette.bubble;
    for (var j = 0; j < geometry.pylons.length; j += 3) {
      var py = geometry.line + 20 + ((j * 11 + Math.floor(time * 2)) % 45);
      ctx.fillRect(Math.floor(geometry.pylons[j] + 5), py, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawLeviathan(time, palette, actors) {
    var x = actors.leviathanX;
    var y = actors.leviathanY;
    var scale = clamp(width / 520, 0.72, 1.25);
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
      { x: width * 0.08, w: Math.max(25, width * 0.14), depth: 34 },
      { x: width * 0.46, w: Math.max(18, width * 0.08), depth: 23 }
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
        if (dye < 0.035 || fluid.solid[index]) continue;
        var x = col * FLUID_CELL;
        var y = fluid.line + row * FLUID_CELL;
        var velocityX = fluid.u[index];
        var velocityY = fluid.v[index];
        ctx.globalAlpha = clamp(dye * 0.42, 0.05, 0.42);
        ctx.fillStyle = velocityY < -0.08 ? palette.bubble : palette.plankton;
        ctx.fillRect(
          Math.floor(x),
          Math.floor(y),
          Math.max(1, Math.floor(1 + Math.abs(velocityX) * 2.4)),
          Math.max(1, Math.floor(1 + Math.abs(velocityY) * 1.6))
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFluidDebug(palette) {
    if (!debugFlow || !fluid) return;
    ctx.strokeStyle = palette.bubble;
    ctx.globalAlpha = 0.62;
    ctx.lineWidth = 1;
    for (var row = 1; row < fluid.rows; row += 3) {
      for (var col = 1; col < fluid.cols; col += 3) {
        var index = fluidIndex(col, row);
        if (fluid.solid[index]) continue;
        var x = col * FLUID_CELL;
        var y = fluid.line + row * FLUID_CELL;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + fluid.u[index] * 8, y + fluid.v[index] * 8);
        ctx.stroke();
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
    var left = geometry.left;
    var right = geometry.right;
    var deck = geometry.deck;
    var span = right - left;

    ctx.fillStyle = palette.timber;
    ctx.fillRect(left, deck, span, 8);
    ctx.fillStyle = palette.timberLight;
    ctx.fillRect(left - 3, deck - 2, span + 3, 2);
    ctx.fillRect(left, deck + 7, span, 2);

    var lowerDeck = geometry.line - 12;
    ctx.fillStyle = palette.timber;
    ctx.fillRect(left - 8, lowerDeck, Math.floor(span * 0.52), 5);
    ctx.fillStyle = palette.timberLight;
    ctx.fillRect(left - 10, lowerDeck - 1, Math.floor(span * 0.52) + 2, 1);

    for (var p = 0; p < geometry.pylons.length; p += 1) {
      var px = Math.floor(geometry.pylons[p]);
      ctx.fillStyle = palette.steelDark;
      ctx.fillRect(px - 2, deck + 8, 6, geometry.line - deck - 7);
      ctx.fillStyle = palette.steel;
      ctx.fillRect(px - 1, deck + 9, 2, geometry.line - deck - 8);
    }

    var blockLeft = left + Math.floor(span * 0.28);
    ctx.fillStyle = palette.timber;
    ctx.fillRect(blockLeft, deck - 35, span - (blockLeft - left) - 7, 35);
    ctx.fillRect(left + Math.floor(span * 0.48), deck - 54, span * 0.31, 20);
    ctx.fillStyle = palette.timberLight;
    ctx.fillRect(blockLeft - 2, deck - 37, span - (blockLeft - left) - 3, 3);
    ctx.fillRect(left + Math.floor(span * 0.48) - 2, deck - 56, span * 0.31 + 4, 3);

    for (var floor = 0; floor < 3; floor += 1) {
      var wy = deck - 29 + floor * 10;
      for (var wx = blockLeft + 7; wx < right - 10; wx += 13) {
        var lit = hash(wx * 0.13 + floor * 9 + Math.floor(time / 8)) > 0.23;
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
    ctx.fillStyle = palette.steelDark;
    ctx.fillRect(towerX, deck - 86, 7, 31);
    ctx.fillRect(towerX - 18, deck - 84, 42, 3);
    ctx.fillStyle = palette.steel;
    ctx.fillRect(towerX + 2, deck - 91, 2, 7);
    ctx.fillRect(towerX - 15, deck - 94, 36, 2);
    ctx.fillStyle = palette.lamp;
    ctx.fillRect(towerX + 2, deck - 93, 2, 2);

    var padY = deck - 48;
    ctx.fillStyle = palette.steelDark;
    ctx.fillRect(left + 6, padY, Math.floor(span * 0.24), 3);
    ctx.fillRect(left + 9, padY + 3, 3, deck - padY - 3);
    ctx.fillRect(left + Math.floor(span * 0.79), deck - 68, Math.floor(span * 0.2), 3);

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

    if (raft.x > width + 62) {
      raft.x = -58;
      raft.y = surfaceY(raft.x + 14, time, line, raft.x) - 4;
      raft.vy = 0;
      raft.angle = 0;
    }
  }

  function drawRaft(time, palette) {
    var x = raft.x;
    var y = raft.y;

    ctx.save();
    ctx.translate(Math.floor(x + 14), Math.floor(y + 2));
    ctx.rotate(clamp(raft.angle, -0.16, 0.16));
    ctx.fillStyle = palette.timberLight;
    ctx.fillRect(-14, -2, 29, 3);
    ctx.fillStyle = palette.timber;
    ctx.fillRect(-11, 1, 23, 2);
    ctx.fillRect(4, -13, 1, 11);
    ctx.fillStyle = palette.foam;
    ctx.fillRect(5, -12, 7, 5);
    drawPerson(-6, -3, time * 1.1, palette.foam, 1);
    drawPerson(2, -3, time * 0.9 + 2, palette.kelp, -1);
    drawPerson(10, -3, time * 1.05 + 4, palette.foam, -1);
    ctx.restore();
  }

  function drawCarpet(time, palette, line) {
    var cycle = width + 150;
    var x = width - ((time * 3.2) % cycle) + 50;
    var y = line - 52 + Math.sin(time * 0.45) * 5;
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
    var x = Math.floor(width * 0.12);
    ctx.strokeStyle = palette.steel;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, line + 3, 18, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3 + Math.sin(time * 0.3) * 0.08;
    ctx.strokeStyle = palette.bubble;
    ctx.beginPath();
    ctx.arc(x, line + 3, 14, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawWorld(time, dt) {
    var palette = PALETTES[mode];
    var geometry = platformGeometry();
    updateRaft(dt, time, geometry.line);
    var leviathanCycle = width + 260;
    var leviathanX = ((time * 0.17) % leviathanCycle) - 130;
    var leviathanY = geometry.line + (height - geometry.line) * 0.69 + Math.sin(time * 0.08) * 12;
    var actors = {
      raftX: raft.x,
      raftY: raft.y,
      raftVX: raft.vx,
      raftVY: raft.vy,
      leviathanX: leviathanX,
      leviathanY: leviathanY
    };

    updateFluid(dt, time, geometry, actors);
    updateParticles(dt, time, geometry, actors);
    drawSky(time, palette, geometry.line);
    drawWater(time, palette, geometry.line, raft.x);
    drawPortal(time, palette, geometry.line);
    drawSubstructure(time, palette, geometry);
    drawLeviathan(time, palette, actors);
    drawFloatingKelp(time, palette, geometry.line);
    drawFluidMaterial(palette);
    drawParticles(palette);
    drawSurface(time, palette, geometry.line, raft.x);
    drawPlatform(time, palette, geometry);
    drawRaft(time, palette);
    drawCarpet(time, palette, geometry.line);
    drawFluidDebug(palette);
  }

  function resize() {
    width = Math.max(1, Math.ceil(window.innerWidth / ART_PIXEL));
    height = Math.max(1, Math.ceil(window.innerHeight / ART_PIXEL));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width * ART_PIXEL + "px";
    canvas.style.height = height * ART_PIXEL + "px";
    ctx.imageSmoothingEnabled = false;
    createFluid(platformGeometry());
    createParticles();
    raft.y = surfaceY(raft.x + 14, 0, Math.floor(height * WATERLINE), raft.x) - 4;
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
    var line = Math.floor(height * WATERLINE);
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

  resize();
  showInterface();
  requestAnimationFrame(render);
}());
