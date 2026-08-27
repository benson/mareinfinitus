(function () {
  "use strict";

  var ART_PIXEL = 3;
  var WATERLINE = 0.36;

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

  function addEddy(flow, x, y, cx, cy, radius, strength) {
    var dx = x - cx;
    var dy = y - cy;
    var d2 = dx * dx + dy * dy;
    if (d2 > radius * radius || d2 < 1) return;
    var falloff = (1 - d2 / (radius * radius)) * strength;
    flow.x += (-dy / radius) * falloff;
    flow.y += (dx / radius) * falloff;
  }

  function flowAt(x, y, time, geometry, actors) {
    var depth = clamp((y - geometry.line) / Math.max(1, height - geometry.line), 0, 1);
    var flow = {
      x: 0.34 + Math.sin(y * 0.027 + time * 0.15) * 0.11,
      y: Math.sin(x * 0.021 - time * 0.18) * 0.08 * (1 - depth * 0.55)
    };

    for (var i = 0; i < geometry.pylons.length; i += 1) {
      addEddy(flow, x, y, geometry.pylons[i], geometry.line + 27, 19, i % 2 ? 0.56 : -0.56);
    }

    addEddy(
      flow,
      x,
      y,
      actors.leviathanX,
      actors.leviathanY,
      54,
      Math.sin(time * 0.11) * 0.52
    );

    var wakeDx = actors.raftX - x;
    var wakeDy = actors.raftY - y;
    if (wakeDx > -8 && wakeDx < 70 && Math.abs(wakeDy) < 24) {
      flow.x += (1 - Math.abs(wakeDx) / 70) * 0.28;
      flow.y += Math.sin(wakeDx * 0.3) * 0.14;
    }

    if (
      x > geometry.left - 20 &&
      x < geometry.right &&
      y > geometry.foundationTop - 18 &&
      y < geometry.foundationBottom + 22
    ) {
      flow.x *= 0.45;
      flow.y += x < geometry.left ? -0.16 : 0.04;
    }
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
      var flow = flowAt(particle.x, particle.y, time, geometry, actors);
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

  function drawRaft(time, palette, line) {
    var cycle = width + 110;
    var x = ((time * 1.65) % cycle) - 55;
    var y = surfaceY(x + 15, time, line, x) - 4;
    var tilt = clamp((surfaceY(x + 27, time, line, x) - surfaceY(x, time, line, x)) / 27, -0.12, 0.12);

    ctx.save();
    ctx.translate(Math.floor(x + 14), Math.floor(y + 2));
    ctx.rotate(tilt);
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
    return { x: x, y: y };
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
    var raftCycle = width + 110;
    var raftX = ((time * 1.65) % raftCycle) - 55;
    var raftY = surfaceY(raftX + 15, time, geometry.line, raftX) - 4;
    var leviathanCycle = width + 260;
    var leviathanX = ((time * 0.17) % leviathanCycle) - 130;
    var leviathanY = geometry.line + (height - geometry.line) * 0.69 + Math.sin(time * 0.08) * 12;
    var actors = {
      raftX: raftX,
      raftY: raftY,
      leviathanX: leviathanX,
      leviathanY: leviathanY
    };

    updateParticles(dt, time, geometry, actors);
    drawSky(time, palette, geometry.line);
    drawWater(time, palette, geometry.line, raftX);
    drawPortal(time, palette, geometry.line);
    drawSubstructure(time, palette, geometry);
    drawLeviathan(time, palette, actors);
    drawFloatingKelp(time, palette, geometry.line);
    drawParticles(palette);
    drawSurface(time, palette, geometry.line, raftX);
    drawPlatform(time, palette, geometry);
    drawRaft(time, palette, geometry.line);
    drawCarpet(time, palette, geometry.line);
  }

  function resize() {
    width = Math.max(1, Math.ceil(window.innerWidth / ART_PIXEL));
    height = Math.max(1, Math.ceil(window.innerHeight / ART_PIXEL));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width * ART_PIXEL + "px";
    canvas.style.height = height * ART_PIXEL + "px";
    ctx.imageSmoothingEnabled = false;
    createParticles();
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
  });
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", showInterface, { passive: true });

  resize();
  showInterface();
  requestAnimationFrame(render);
}());
