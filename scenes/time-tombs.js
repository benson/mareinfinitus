(function (root) {
  "use strict";

  var PACK = {
    id: "time-tombs",
    index: "HYPERION",
    title: "The Time Tombs",
    shortDescription: "A valley of monuments moving backward through time beneath a living dust storm.",
    source: "Hyperion / Endymion",
    rendererVersion: 1,
    fixedPixel: true,
    landmarks: ["shrike-palace", "cave-tombs", "crystal-monolith", "obelisk", "jade-tomb", "sphinx"],
    materials: ["sand", "dust", "wind", "grass", "time"],
    systems: ["aeolian-field", "temporal-echoes", "soft-body", "event-direction", "world-memory"],
    sound: { windFrequency: 390, droneFrequency: 36, overtoneRatio: 1.618, waveform: "sine", volume: 0.15 },
    mount: mount
  };

  if (root.LivingSceneRuntime) root.LivingSceneRuntime.register(PACK);

  function mount(host) {
    var canvas = host.canvas;
    var shell = host.shell;
    var screensaver = !!host.screensaverMode;
    var debug = !!host.debugMode;
    var runtime = host.runtime;
    var ctx = canvas.getContext("2d", { alpha: false });
    var ART_PIXEL = 3;
    var artPixel = ART_PIXEL;
    var width = 1;
    var height = 1;
    var cameraX = 0;
    var referenceWidth = 430;
    var lastFrame = performance.now();
    var simulationTime = 0;
    var frameRequest = 0;
    var pointer = { x: 0, y: 0, inside: false, down: false };
    var inspectHeld = false;
    var inspected = null;
    var glossaryHoverId = "";
    var sand = [];
    var dust = [];
    var grass = [];
    var echoes = [];
    var impacts = [];
    var worldObjects = [];
    var wind = 0.34;
    var storm = 0.13;
    var stormTarget = 0.13;
    var timeTide = 0;
    var tuning = { dust: 0.85, timeTides: 0.72, encounter: 0.45 };
    var memory = root.LivingWorldMemory ? root.LivingWorldMemory.create({ id: "time-tombs" }) : null;
    var memoryInfluence = memory ? memory.influence() : { weathering: 0, disturbance: 0, quiet: 0.5, encounterEcho: 0 };
    var director = root.MareDirector ? root.MareDirector.create({ seed: 71.7, cycleSeconds: 192 }) : null;
    var directorState = null;
    var rareWasActive = false;
    var selectedTomb = null;
    var debugShrikeUntil = 0;
    var glossaryDrag = null;
    var palette = {
      skyTop: "#080814", sky: "#19132a", horizon: "#583547",
      sun: "#d87946", moon: "#cabbd9", star: "#e5dcf1",
      sandDark: "#5b3942", sand: "#8b5848", sandLight: "#bd7654",
      dust: "#d39a67", grass: "#4d4634", grassLight: "#766847",
      stoneDark: "#352f3e", stone: "#5d5363", stoneLight: "#927985",
      jadeDark: "#304d48", jade: "#4f7569", jadeLight: "#7aa08b",
      crystalDark: "#343952", crystal: "#65708d", crystalLight: "#a8b0c8",
      time: "#75b5ba", timeLight: "#bce1d5", shrike: "#14131c", ember: "#df8e43"
    };

    var GUIDE = [
      { id: "TT-00", group: "The valley", name: "Valley of the Time Tombs", origin: "BOOK", summary: "A small canyon beyond Hyperion's dead City of Poets, holding monuments whose anti-entropic fields move them backward through time.", excerpt: "The bizarre Time Tombs of Hyperion pass a thousand meters beneath them." },
      { id: "TT-01", group: "The valley", name: "Time tide", origin: "BOOK", summary: "The visible pressure of the Tombs' anti-entropic fields: a force that can feel like wind, surf, vertigo, or resistance from an impossible direction.", excerpt: "Time tides from the open entrance to the Sphinx still held Sol back like insistent winds." },
      { id: "TT-02", group: "The valley", name: "Vermilion dust", origin: "BOOK", summary: "Fine desert sand carried through the valley in storms, reddening the air and briefly swallowing even armies and monuments.", excerpt: "The storm blew vermilion dust through the apertures until it filled the air like powdered blood." },
      { id: "TT-03", group: "Tombs", name: "The Sphinx", origin: "BOOK", summary: "An intricately carved, sealed monument with outflung wings and a maze of corridors that fold back on themselves.", excerpt: "The intricately carved Sphinx with sealed door and outflung wings." },
      { id: "TT-04", group: "Tombs", name: "Crystal Monolith", origin: "BOOK", summary: "The great central Tomb: reflective, faceted, and large enough for stairways and chambers to rise within its crystal mass.", excerpt: "Then the huge centrally placed Crystal Monolith." },
      { id: "TT-05", group: "Tombs", name: "The Obelisk", origin: "BOOK", summary: "A narrow, severe marker standing among structures far stranger and older than any human settlement on Hyperion.", excerpt: "Then the Obelisk; then the Jade Tomb." },
      { id: "TT-06", group: "Tombs", name: "Jade Tomb", origin: "BOOK", summary: "A low green-black monument with a labyrinth entrance beneath it, probed for thousands of kilometers without yielding an end.", excerpt: "Mechs are sent into the labyrinth entrance at the base of the Jade Tomb and report nothing in a six-thousand-kilometer probe." },
      { id: "TT-07", group: "Tombs", name: "Cave Tombs", origin: "BOOK", summary: "Three quieter entrances cut directly into the pink stone of the canyon wall.", excerpt: "The more subtle Cave Tombs—three in all—their entrances carved out of the pink stone of the canyon wall." },
      { id: "TT-08", group: "Tombs", name: "Shrike Palace", origin: "BOOK", summary: "A threatening arrangement of barbed and serrated buttresses whose silhouette recalls the creature associated with the valley.", excerpt: "Barbed and serrated buttresses reminiscent of the creature." },
      { id: "TT-09", group: "Presences", name: "Temporal echo", origin: "SIM", summary: "A moment caught at the edge of an anti-entropic field: footprints arrive before the feet, and a traveler briefly occupies several instants at once." },
      { id: "TT-10", group: "Presences", name: "The Shrike", origin: "BOOK", summary: "The valley's impossible guardian: metal, thorns, too many blades, and movement that refuses to cross the intervening space.", excerpt: "The colder gleam of steel on the Shrike’s impossible tree of metal thorns." },
      { id: "TT-11", group: "Presences", name: "Pilgrim", origin: "SIM", summary: "A distant traveler crossing between the monuments, made very small by the scale of the valley." },
      { id: "TT-12", group: "The valley", name: "Wind grass", origin: "BOOK", summary: "Sparse, low growth beyond the dunes, bending in long synchronized waves as the desert wind changes.", excerpt: "The wind whistled through low sage and sponge lichen." }
    ];
    var GUIDE_BY_ID = Object.create(null);
    GUIDE.forEach(function (entry) { GUIDE_BY_ID[entry.id] = entry; });

    var tombs = [
      { id: "TT-08", kind: "palace", x: -45, y: 0, w: 68, h: 57 },
      { id: "TT-07", kind: "caves", x: 35, y: 0, w: 62, h: 32 },
      { id: "TT-04", kind: "crystal", x: 108, y: 0, w: 46, h: 94 },
      { id: "TT-05", kind: "obelisk", x: 174, y: 0, w: 20, h: 72 },
      { id: "TT-06", kind: "jade", x: 218, y: 0, w: 60, h: 38 },
      { id: "TT-03", kind: "sphinx", x: 315, y: 0, w: 112, h: 55 }
    ];

    function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
    function lerp(a, b, amount) { return a + (b - a) * amount; }
    function hash(n) { var value = Math.sin(n * 12.9898) * 43758.5453; return value - Math.floor(value); }
    function smoothstep(value) { var v = clamp(value, 0, 1); return v * v * (3 - 2 * v); }
    function worldToScreenX(x) { return x - cameraX + (directorState ? directorState.cameraDriftX : 0); }
    function screenToWorldX(x) { return x + cameraX; }
    function groundY() { return Math.floor(clamp(height * 0.61, 92, 185)); }
    function pixelRect(x, y, w, h, color) {
      var left = Math.round(x); var top = Math.round(y); var right = Math.round(x + w); var bottom = Math.round(y + h);
      if (right <= left || bottom <= top) return;
      ctx.fillStyle = color; ctx.fillRect(left, top, right - left, bottom - top);
    }
    function pixelLine(x0, y0, x1, y1, color, thickness) {
      var dx = Math.abs(Math.round(x1) - Math.round(x0)); var sx = x0 < x1 ? 1 : -1;
      var dy = -Math.abs(Math.round(y1) - Math.round(y0)); var sy = y0 < y1 ? 1 : -1; var error = dx + dy;
      var x = Math.round(x0); var y = Math.round(y0); var half = Math.floor((thickness || 1) / 2);
      while (true) {
        pixelRect(x - half, y - half, thickness || 1, thickness || 1, color);
        if (x === Math.round(x1) && y === Math.round(y1)) break;
        var twice = error * 2;
        if (twice >= dy) { error += dy; x += sx; }
        if (twice <= dx) { error += dx; y += sy; }
      }
    }
    function drawMask(mask, x, y, colors, flip, scale) {
      var unit = scale || 1;
      for (var row = 0; row < mask.length; row += 1) {
        for (var col = 0; col < mask[row].length; col += 1) {
          var key = mask[row].charAt(col); if (key === " ") continue;
          var drawCol = flip ? mask[row].length - 1 - col : col;
          pixelRect(x + drawCol * unit, y + row * unit, unit, unit, colors[key] || colors["1"]);
        }
      }
    }
    function ditherBand(top, bottom, colorA, colorB, seed) {
      var bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      for (var y = top; y < bottom; y += 1) {
        var amount = (y - top) / Math.max(1, bottom - top);
        for (var x = 0; x < width; x += 1) {
          var threshold = (bayer[(y + seed) & 3][(Math.round(screenToWorldX(x)) + seed) & 3] + 0.5) / 16;
          pixelRect(x, y, 1, 1, amount > threshold ? colorB : colorA);
        }
      }
    }

    function initializeField() {
      var worldLeft = cameraX - 70; var worldRight = cameraX + width + 70;
      var dustTarget = Math.ceil(width * Math.max(0.3, tuning.dust) * 0.68);
      while (dust.length < dustTarget) {
        var i = dust.length; var seed = hash(i * 17.7 + 4.2);
        dust.push({ x: lerp(worldLeft, worldRight, hash(i * 31.3 + 2)), y: hash(i * 47.1) * Math.max(50, groundY()), vx: 4 + hash(i * 7.7) * 11, seed: seed, layer: hash(i * 23.1) });
      }
      var sandTarget = Math.ceil(width * 0.9);
      while (sand.length < sandTarget) {
        var j = sand.length;
        sand.push({ x: lerp(worldLeft, worldRight, hash(j * 13.9 + 1)), y: groundY() + 2 + hash(j * 37.7) * Math.max(14, height - groundY() - 4), seed: hash(j * 9.3), vx: 0 });
      }
      var grassTarget = Math.ceil(width / 8);
      while (grass.length < grassTarget) {
        var g = grass.length;
        grass.push({ x: lerp(worldLeft, worldRight, hash(g * 21.7 + 8)), seed: hash(g * 44.1), height: 2 + Math.floor(hash(g * 18.2) * 6) });
      }
    }

    function update(dt, time) {
      var weatherEpoch = Math.floor(time / 68); var phase = (time % 68) / 68;
      var a = Math.pow(hash(weatherEpoch * 7.8 + 3), 3); var b = Math.pow(hash((weatherEpoch + 1) * 7.8 + 3), 3);
      stormTarget = 0.07 + lerp(a, b, smoothstep(phase)) * 0.88;
      storm += (stormTarget - storm) * (1 - Math.exp(-dt * 0.12));
      wind = 0.22 + storm * 1.35 + Math.sin(time * 0.037) * 0.12;
      timeTide = Math.sin(time * 0.071) * 0.5 + Math.sin(time * 0.019 + 2.2) * 0.5;
      directorState = director ? director.update(time, { storm: storm, colossalVisible: false }) : null;
      if (memory) memoryInfluence = memory.update(dt, { storm: storm, activity: 0.28 + tuning.timeTides * 0.28, disturbance: impacts.length ? 0.5 : 0.04 });
      var rareActive = !!(directorState && directorState.rareEncounter && tuning.encounter > 0.12) || time < debugShrikeUntil;
      if (rareActive && !rareWasActive && memory) memory.observe("shrike-presence", directorState.intensity);
      rareWasActive = rareActive;

      var ground = groundY(); var worldLeft = cameraX - 90; var worldRight = cameraX + width + 90;
      for (var i = 0; i < dust.length; i += 1) {
        var mote = dust[i];
        mote.x += (mote.vx * wind * lerp(0.35, 1.2, mote.layer)) * dt;
        mote.y += Math.sin(time * (0.12 + mote.layer * 0.08) + mote.seed * 90) * dt * 1.4 - storm * dt * 0.14;
        if (mote.x > worldRight) { mote.x = worldLeft; mote.y = hash(mote.seed * 199 + time * 0.001) * ground; }
      }
      for (var s = 0; s < sand.length; s += 1) {
        var grain = sand[s];
        grain.vx += (wind * (0.05 + grain.seed * 0.13) - grain.vx) * dt * 0.7;
        grain.x += grain.vx * dt;
        if (grain.x > worldRight) grain.x = worldLeft;
      }
      for (var impact = impacts.length - 1; impact >= 0; impact -= 1) {
        impacts[impact].age += dt;
        if (impacts[impact].age > impacts[impact].life) impacts.splice(impact, 1);
      }
      for (var echo = echoes.length - 1; echo >= 0; echo -= 1) {
        echoes[echo].age += dt;
        if (echoes[echo].age > echoes[echo].life) echoes.splice(echo, 1);
      }
      runtime.updateAudio({ storm: storm, activity: wind * 0.35, mystery: Math.abs(timeTide) * tuning.timeTides });
    }

    function drawSky(time, ground) {
      pixelRect(0, 0, width, ground, palette.skyTop);
      ditherBand(Math.floor(ground * 0.32), ground, palette.skyTop, palette.sky, 1);
      ditherBand(Math.floor(ground * 0.72), ground, palette.sky, palette.horizon, 2);
      var moonX = Math.round(worldToScreenX(-88 + ((time * 0.7) % 980)));
      var moonY = 24 + Math.sin(time * 0.004) * 5;
      ctx.globalAlpha = 0.62;
      for (var my = -8; my <= 8; my += 1) for (var mx = -8; mx <= 8; mx += 1) if (mx * mx + my * my <= 62 && hash(mx * 7 + my * 17) > 0.08) pixelRect(moonX + mx, moonY + my, 1, 1, palette.moon);
      ctx.globalAlpha = 1;
      for (var star = 0; star < Math.ceil(width / 17); star += 1) {
        var wx = cameraX + hash(star * 19.7 + 3) * width; var sy = 5 + hash(star * 31.3 + 8) * ground * 0.62;
        if (hash(star * 11.1 + 9) > 0.22) pixelRect(worldToScreenX(wx), sy, 1, 1, palette.star);
      }
      // Remote canyon rims are world anchored and deliberately uneven.
      var ridgeY = Math.floor(ground * 0.72);
      for (var x = 0; x < width; x += 2) {
        var worldX = screenToWorldX(x); var ridge = ridgeY + Math.floor(Math.sin(worldX * 0.037) * 5 + Math.sin(worldX * 0.011 + 2) * 8);
        pixelRect(x, ridge, 2, ground - ridge, palette.sandDark);
      }
    }

    function drawGround(time, ground) {
      pixelRect(0, ground, width, height - ground, palette.sandDark);
      var duneA = ground + Math.max(8, (height - ground) * 0.18);
      var duneB = ground + Math.max(18, (height - ground) * 0.55);
      for (var x = 0; x < width; x += 1) {
        var worldX = screenToWorldX(x);
        var a = duneA + Math.sin(worldX * 0.018 + time * 0.002) * 8 + Math.sin(worldX * 0.047) * 2;
        var b = duneB + Math.sin(worldX * 0.011 + 1.7) * 11;
        pixelRect(x, a, 1, Math.max(0, b - a), palette.sand);
        pixelRect(x, b, 1, Math.max(0, height - b), palette.sandDark);
        if ((Math.round(worldX) + Math.round(a)) % 19 === 0) pixelRect(x, a, 2, 1, palette.sandLight);
      }
      for (var grainIndex = 0; grainIndex < sand.length; grainIndex += 1) {
        var grain = sand[grainIndex]; var gx = worldToScreenX(grain.x);
        if (gx < 0 || gx >= width) continue;
        var depthFade = 1 - clamp((grain.y - ground) / Math.max(1, height - ground), 0, 1) * 0.55;
        ctx.globalAlpha = 0.18 + depthFade * 0.42;
        pixelRect(gx, grain.y, grain.seed > 0.82 ? 2 : 1, 1, grain.seed > 0.52 ? palette.sandLight : palette.sand);
      }
      ctx.globalAlpha = 1;
      for (var bladeIndex = 0; bladeIndex < grass.length; bladeIndex += 1) {
        var blade = grass[bladeIndex]; var bx = worldToScreenX(blade.x); if (bx < -8 || bx > width + 8) continue;
        var by = ground + 3 + (blade.seed * 17) % 9;
        var bend = wind * (0.8 + blade.seed) + Math.sin(time * 0.21 + blade.seed * 18) * 0.5;
        pixelLine(bx, by, bx + bend, by - blade.height, blade.seed > 0.55 ? palette.grassLight : palette.grass, 1);
      }
      impacts.forEach(function (impact) {
        var p = clamp(impact.age / impact.life, 0, 1); var radius = p * 24;
        ctx.globalAlpha = (1 - p) * 0.7;
        for (var step = 0; step < 30; step += 1) {
          var angle = step / 30 * Math.PI * 2; if (hash(step * 7.2 + impact.seed) < p * 0.46) continue;
          pixelRect(worldToScreenX(impact.x) + Math.cos(angle) * radius, impact.y + Math.sin(angle) * radius * 0.22, 1, 1, palette.dust);
        }
      });
      ctx.globalAlpha = 1;
    }

    function objectBounds(tomb, ground) {
      return { x: worldToScreenX(tomb.x), y: ground - tomb.h, w: tomb.w, h: tomb.h };
    }

    function drawTomb(tomb, time, ground, highlight) {
      var box = objectBounds(tomb, ground); var x = box.x; var y = box.y;
      var edge = highlight ? palette.timeLight : palette.stoneLight;
      if (tomb.kind === "crystal") {
        var points = [[x + 23, y], [x + 41, y + 22], [x + 37, ground], [x + 6, ground], [x + 2, y + 27]];
        ctx.fillStyle = palette.crystalDark; ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); points.slice(1).forEach(function (p) { ctx.lineTo(p[0], p[1]); }); ctx.closePath(); ctx.fill();
        pixelLine(x + 23, y, x + 6, ground, edge, 1); pixelLine(x + 23, y, x + 37, ground, palette.crystalLight, 1);
        for (var facet = 0; facet < 13; facet += 1) pixelLine(x + 8 + hash(facet) * 25, y + 10 + facet * 6, x + 32, y + 16 + facet * 5, facet % 2 ? palette.crystal : palette.crystalLight, 1);
      } else if (tomb.kind === "obelisk") {
        drawMask(["   11   ", "  1111  ", " 111111 ", "11111111", "11222211", "11222211", "11222211", "11222211", "11222211"], x + 6, y, { "1": edge, "2": palette.stoneDark }, false, 1);
        pixelRect(x + 6, y + 9, 8, tomb.h - 9, palette.stone); pixelLine(x + 6, y + 9, x + 6, ground, palette.stoneDark, 2); pixelLine(x + 13, y + 9, x + 13, ground, edge, 1);
      } else if (tomb.kind === "jade") {
        drawMask(["          11111          ", "       11111111111       ", "    1111122222211111     ", "  11122222222222222111   ", "111222222233322222222111 ", "1122222233333333222222111", "1111111111111111111111111"], x, ground - 14, { "1": highlight ? palette.timeLight : palette.jadeLight, "2": palette.jade, "3": palette.jadeDark }, false, 2);
        pixelRect(x + 25, ground - 13, 11, 13, palette.jadeDark); pixelRect(x + 28, ground - 10, 5, 10, palette.skyTop);
      } else if (tomb.kind === "caves") {
        pixelRect(x, ground - 27, tomb.w, 27, palette.sandDark);
        for (var cave = 0; cave < 3; cave += 1) {
          var cx = x + 7 + cave * 19; pixelRect(cx, ground - 15 - cave % 2 * 3, 13, 15 + cave % 2 * 3, palette.stoneDark);
          pixelRect(cx + 3, ground - 11 - cave % 2 * 3, 7, 11 + cave % 2 * 3, palette.skyTop); pixelRect(cx, ground - 16 - cave % 2 * 3, 13, 2, edge);
        }
      } else if (tomb.kind === "palace") {
        pixelRect(x + 8, ground - 23, 50, 23, palette.stoneDark);
        for (var thorn = 0; thorn < 9; thorn += 1) {
          var tx = x + 7 + thorn * 6; var th = 22 + (thorn % 3) * 9;
          pixelLine(tx, ground - 18, tx + (thorn % 2 ? 5 : -5), ground - th, edge, 2);
          pixelLine(tx + (thorn % 2 ? 5 : -5), ground - th, tx + (thorn % 2 ? 11 : -11), ground - th + 8, palette.stoneLight, 1);
        }
        pixelRect(x + 14, ground - 20, 38, 3, palette.stone); pixelRect(x + 25, ground - 17, 15, 17, palette.skyTop);
      } else if (tomb.kind === "sphinx") {
        var wingMask = root.LivingSilhouettes && root.LivingSilhouettes.get("sphinxWing");
        if (wingMask) {
          drawMask(wingMask, x, ground - 39, { "1": edge }, false, 2);
          drawMask(wingMask, x + 96, ground - 39, { "1": edge }, true, 2);
        }
        pixelRect(x + 29, ground - 34, 54, 34, palette.stoneDark);
        drawMask(["       1111       ", "    1112222111    ", "  1122222222211   ", "11222223322222211 ", "11222233332222211 ", "11111111111111111 "], x + 32, ground - 46, { "1": edge, "2": palette.stone, "3": palette.stoneDark }, false, 2);
        pixelRect(x + 51, ground - 24, 12, 24, palette.skyTop); pixelRect(x + 55, ground - 21, 4, 21, palette.stoneDark);
        for (var panel = 0; panel < 9; panel += 1) {
          var panelX = x + 34 + (panel % 3) * 15; var panelY = ground - 31 + Math.floor(panel / 3) * 8;
          pixelRect(panelX, panelY, 9, 1, panel % 2 ? palette.stone : palette.stoneLight);
          if (panel % 3 === 1) pixelRect(panelX + 4, panelY + 2, 1, 2, palette.time);
        }
        for (var stair = 0; stair < 5; stair += 1) pixelRect(x + 47 - stair * 2, ground - 2 + stair * 2, 21 + stair * 4, 2, stair % 2 ? palette.stone : palette.stoneLight);
      }
      if (highlight) {
        ctx.globalAlpha = 0.65 + Math.sin(time * 4) * 0.18;
        pixelRect(box.x - 2, box.y - 2, box.w + 4, 1, palette.timeLight); pixelRect(box.x - 2, box.y + box.h + 1, box.w + 4, 1, palette.timeLight);
        pixelRect(box.x - 2, box.y - 2, 1, box.h + 4, palette.timeLight); pixelRect(box.x + box.w + 1, box.y - 2, 1, box.h + 4, palette.timeLight); ctx.globalAlpha = 1;
      }
      worldObjects.push({ id: tomb.id, x: box.x, y: box.y, w: box.w, h: box.h });
    }

    function drawTimeFields(time, ground) {
      if (tuning.timeTides <= 0.02) return;
      tombs.forEach(function (tomb, index) {
        var box = objectBounds(tomb, ground); var cx = box.x + box.w * 0.5; var cy = box.y + box.h * 0.58;
        var pulse = (time * (0.021 + index * 0.0013) + index * 0.17) % 1;
        for (var ring = 0; ring < 3; ring += 1) {
          var p = (pulse + ring / 3) % 1; var radiusX = box.w * (0.42 + p * 0.82); var radiusY = box.h * (0.31 + p * 0.38);
          ctx.globalAlpha = (1 - p) * 0.22 * tuning.timeTides;
          for (var step = 0; step < 44; step += 1) {
            if ((step + index + Math.floor(time * 2)) % 5 === 0) continue;
            var angle = step / 44 * Math.PI * 2;
            pixelRect(cx + Math.cos(angle) * radiusX, cy + Math.sin(angle) * radiusY, 1, 1, ring === 0 ? palette.timeLight : palette.time);
          }
        }
      });
      ctx.globalAlpha = 1;
      worldObjects.push({ id: "TT-01", x: 0, y: Math.max(0, ground - 110), w: width, h: 118 });
    }

    function drawPilgrims(time, ground) {
      var pilgrimMask = root.LivingSilhouettes && root.LivingSilhouettes.get("pilgrim"); if (!pilgrimMask) return;
      for (var i = 0; i < 3; i += 1) {
        var route = ((time * (0.7 + i * 0.12) + i * 127) % 620) - 260;
        var x = worldToScreenX(route); var y = ground - 7 - (i % 2) * 2;
        if (x < -10 || x > width + 10) continue;
        var echoAmount = Math.abs(Math.sin(time * 0.11 + i * 2));
        if (echoAmount > 0.82 && tuning.timeTides > 0.2) {
          ctx.globalAlpha = 0.12; drawMask(pilgrimMask, x - 5, y, { "1": palette.time }, false, 1); drawMask(pilgrimMask, x + 5, y, { "1": palette.time }, false, 1);
        }
        ctx.globalAlpha = 0.82; drawMask(pilgrimMask, x, y, { "1": palette.stoneLight }, false, 1); ctx.globalAlpha = 1;
        worldObjects.push({ id: "TT-11", x: x, y: y, w: 4, h: 7 });
      }
      echoes.forEach(function (echo) {
        var p = echo.age / echo.life; ctx.globalAlpha = (1 - p) * 0.5;
        for (var e = 0; e < 4; e += 1) drawMask(pilgrimMask, worldToScreenX(echo.x) + (e - 1.5) * (2 + p * 7), echo.y - 7, { "1": e % 2 ? palette.time : palette.timeLight }, false, 1);
        worldObjects.push({ id: "TT-09", x: worldToScreenX(echo.x) - 15, y: echo.y - 8, w: 30, h: 10 });
      });
      ctx.globalAlpha = 1;
    }

    function drawShrike(time, ground) {
      var forced = time < debugShrikeUntil;
      if (!(directorState && directorState.rareEncounter && tuning.encounter > 0.12) && !forced) return;
      var intensity = forced ? 1 : directorState.intensity * tuning.encounter; if (intensity < 0.08) return;
      var phase = forced ? 0.5 : (directorState.localTime || 0); var x = width * 0.76 + Math.sin(time * 0.007) * 10; var y = ground - 18 - Math.sin(phase * Math.PI) * 7;
      var mask = root.LivingSilhouettes && root.LivingSilhouettes.get("shrike"); if (!mask) return;
      // It does not walk across the valley. Each reveal is a discontinuous pose
      // held long enough to read, with darkness between transitions.
      var hold = Math.floor(time / 3.8); var discontinuity = hash(hold * 71.3) > 0.73 ? Math.floor(hash(hold * 9.2) * 19) - 9 : 0;
      x += discontinuity;
      ctx.globalAlpha = clamp(intensity * 0.72, 0, 0.78);
      drawMask(mask, x, y, { "1": palette.stoneLight, "2": palette.shrike }, hash(hold + 2) > 0.5, 2);
      ctx.globalAlpha = 1;
      worldObjects.push({ id: "TT-10", x: x, y: y, w: 26, h: 18 });
    }

    function drawDust(time, ground) {
      var amount = clamp(0.12 + storm * 0.82, 0, 1) * tuning.dust;
      for (var i = 0; i < dust.length; i += 1) {
        var mote = dust[i]; var x = worldToScreenX(mote.x); if (x < 0 || x >= width || mote.y > ground) continue;
        ctx.globalAlpha = amount * lerp(0.08, 0.52, mote.layer);
        pixelRect(x, mote.y, mote.layer > 0.78 ? 2 : 1, 1, mote.seed > 0.58 ? palette.dust : palette.sandLight);
      }
      if (storm > 0.56) {
        ctx.globalAlpha = (storm - 0.56) * 0.28;
        for (var band = 0; band < 8; band += 1) {
          var by = (band * 31 + time * wind * 3) % ground;
          for (var bx = -30; bx < width + 30; bx += 11) if (hash(bx * 0.7 + band * 3) > 0.35) pixelLine(bx, by, bx + 5 + wind * 4, by - 1, palette.dust, 1);
        }
      }
      ctx.globalAlpha = 1;
      worldObjects.push({ id: "TT-02", x: 0, y: 0, w: width, h: ground });
    }

    function draw(time) {
      var ground = groundY(); worldObjects.length = 0;
      drawSky(time, ground);
      drawGround(time, ground);
      tombs.forEach(function (tomb) { drawTomb(tomb, time, ground, (inspected && inspected.id === tomb.id) || glossaryHoverId === tomb.id); });
      drawTimeFields(time, ground);
      drawPilgrims(time, ground);
      drawShrike(time, ground);
      drawDust(time, ground);
      if (inspected && inspected.id === "TT-02") {
        ctx.globalAlpha = 0.2; pixelRect(0, 0, width, ground, palette.timeLight); ctx.globalAlpha = 1;
      }
      worldObjects.push({ id: "TT-00", x: 0, y: ground, w: width, h: height - ground });
      worldObjects.push({ id: "TT-12", x: 0, y: ground - 9, w: width, h: 12 });
    }

    function identifyAt(x, y) {
      var priorities = { "TT-10": 10, "TT-11": 9, "TT-03": 8, "TT-04": 8, "TT-05": 8, "TT-06": 8, "TT-07": 8, "TT-08": 8, "TT-01": 5, "TT-12": 3, "TT-02": 2, "TT-00": 1 };
      var match = null; var matchPriority = -1;
      for (var i = 0; i < worldObjects.length; i += 1) {
        var object = worldObjects[i]; var priority = priorities[object.id] || 0;
        if (priority > matchPriority && x >= object.x && x <= object.x + object.w && y >= object.y && y <= object.y + object.h) { match = object; matchPriority = priority; }
      }
      return match;
    }

    function updateInspector() {
      var tooltip = document.querySelector("[data-inspection-tooltip]");
      if (!tooltip) return;
      if (!inspectHeld || !pointer.inside) { inspected = null; tooltip.hidden = true; return; }
      inspected = identifyAt(pointer.x, pointer.y);
      if (!inspected || !GUIDE_BY_ID[inspected.id]) { tooltip.hidden = true; return; }
      var entry = GUIDE_BY_ID[inspected.id];
      tooltip.querySelector("[data-inspection-id]").textContent = entry.id;
      tooltip.querySelector("[data-inspection-name]").textContent = entry.name;
      tooltip.querySelector("[data-inspection-summary]").textContent = entry.summary;
      tooltip.style.left = clamp(pointer.x * artPixel + 16, 8, root.innerWidth - 310) + "px";
      tooltip.style.top = clamp(pointer.y * artPixel + 16, 8, root.innerHeight - 150) + "px";
      tooltip.hidden = false;
    }

    function render(now) {
      frameRequest = 0; var dt = clamp((now - lastFrame) / 1000, 0.001, 0.05); lastFrame = now; simulationTime += dt;
      update(dt, simulationTime); draw(simulationTime); updateInspector();
      if (!document.hidden) frameRequest = root.requestAnimationFrame(render);
    }

    function resize() {
      var previousWidth = width;
      artPixel = !screensaver && root.innerWidth <= 520 ? 1 : !screensaver && root.innerWidth <= 950 && root.innerHeight <= 520 ? 2 : ART_PIXEL;
      width = Math.max(1, Math.ceil(root.innerWidth / artPixel)); height = Math.max(1, Math.ceil(root.innerHeight / artPixel));
      cameraX = (referenceWidth - width) * 0.5;
      canvas.width = width; canvas.height = height; canvas.style.width = width * artPixel + "px"; canvas.style.height = height * artPixel + "px"; ctx.imageSmoothingEnabled = false;
      if (width !== previousWidth) initializeField();
    }

    function pointerPosition(event) {
      var rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * width / rect.width, y: (event.clientY - rect.top) * height / rect.height };
    }

    function bindInput() {
      canvas.addEventListener("pointermove", function (event) {
        if (screensaver) return; var position = pointerPosition(event); pointer.x = position.x; pointer.y = position.y; pointer.inside = true;
        if (pointer.down && pointer.y > groundY() - 4) impacts.push({ x: screenToWorldX(pointer.x), y: pointer.y, age: 0, life: 1.8, seed: hash(simulationTime * 7.1) });
      });
      canvas.addEventListener("pointerenter", function () { pointer.inside = true; });
      canvas.addEventListener("pointerleave", function () { pointer.inside = false; inspected = null; });
      canvas.addEventListener("pointerdown", function (event) {
        if (screensaver || event.ctrlKey) return; pointer.down = true; var position = pointerPosition(event); pointer.x = position.x; pointer.y = position.y;
        impacts.push({ x: screenToWorldX(position.x), y: Math.max(position.y, groundY()), age: 0, life: 2.3, seed: hash(simulationTime * 17.3) });
        echoes.push({ x: screenToWorldX(position.x), y: groundY(), age: 0, life: 4.6 });
        if (memory) memory.observe("sand-touch", 0.18);
      });
      canvas.addEventListener("pointerup", function () { pointer.down = false; });
      canvas.addEventListener("pointercancel", function () { pointer.down = false; });
      root.addEventListener("keydown", function (event) {
        if (screensaver) return; var key = event.key.toUpperCase(); var typing = event.target && event.target.closest && event.target.closest("input, button, textarea, select");
        if (event.key === "Control" && !typing) { inspectHeld = true; shell.classList.add("is-inspecting"); }
        if (typing) return;
        if (key === "G" && !event.repeat) togglePanel("glossary");
        if (key === "T" && !event.repeat) togglePanel("settings");
        if (key === "A" && !event.repeat) setWelcome(true);
        if (key === "F" && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
        if (key === "H") shell.classList.toggle("ui-hidden");
        if (key === "ESCAPE") {
          var glossary = document.querySelector(".glossary-panel"); var settings = document.querySelector(".settings-panel"); var welcome = document.querySelector("[data-welcome]");
          if (welcome && !welcome.hidden) setWelcome(false);
          else if (glossary && !glossary.hidden) glossary.hidden = true;
          else if (settings && !settings.hidden) settings.hidden = true;
        }
      });
      root.addEventListener("keyup", function (event) { if (event.key === "Control") { inspectHeld = false; shell.classList.remove("is-inspecting"); } });
      root.addEventListener("blur", function () { inspectHeld = false; pointer.down = false; shell.classList.remove("is-inspecting"); });
      root.addEventListener("resize", resize);
      document.addEventListener("visibilitychange", function () { if (!document.hidden && !frameRequest) { lastFrame = performance.now(); frameRequest = root.requestAnimationFrame(render); } });
    }

    function togglePanel(which) {
      var panel = document.querySelector(which === "glossary" ? ".glossary-panel" : ".settings-panel"); if (!panel) return; panel.hidden = !panel.hidden;
    }
    function setWelcome(open) { var welcome = document.querySelector("[data-welcome]"); if (welcome) welcome.hidden = !open; }

    function configureUI() {
      document.title = "The Time Tombs — A Living Simulation";
      canvas.setAttribute("aria-label", "A living pixel simulation of the Time Tombs on Hyperion");
      var meta = document.querySelector(".ui-dock-meta span"); if (meta) meta.textContent = "THE TIME TOMBS";
      var dock = document.querySelector(".ui-dock"); if (dock) dock.setAttribute("aria-label", "Time Tombs controls");
      var title = document.querySelector("#welcome-title"); if (title) title.textContent = "The Time Tombs";
      var kicker = document.querySelector(".welcome-kicker"); if (kicker) kicker.textContent = "HYPERION · THE TIME VALLEY";
      var description = document.querySelector("#welcome-description"); if (description) description.innerHTML = "Enter the valley where the future is already ancient: a living pixel-material scene from Dan Simmons&rsquo;s <em>Hyperion Cantos</em>.";
      var quote = document.querySelector(".welcome-dialog blockquote p"); if (quote) quote.textContent = "“The time tides from the open entrance to the Sphinx still held Sol back like insistent winds.”";
      var cite = document.querySelector(".welcome-dialog blockquote cite"); if (cite) cite.innerHTML = "<em>The Fall of Hyperion</em>";
      var enter = document.querySelector("[data-welcome-enter]"); if (enter) enter.textContent = "ENTER THE TIME VALLEY";
      var glossaryTitle = document.querySelector("#glossary-title"); if (glossaryTitle) glossaryTitle.textContent = "Monuments & field notes";
      var glossaryIntro = document.querySelector(".glossary-intro"); if (glossaryIntro) glossaryIntro.innerHTML = "Hold <kbd>CTRL</kbd> and hover to identify the valley. <strong>BOOK TEXT</strong> is excerpted from the novels; <strong>SIM</strong> entries are restrained extrapolations.";
      var glossaryKey = document.querySelector(".glossary-key"); if (glossaryKey) glossaryKey.innerHTML = "<span><i class='origin-dot book'></i> BOOK — named or described in the Cantos</span><span><i class='origin-dot sim'></i> SIM — extrapolated</span>";
      var list = document.querySelector("[data-glossary-list]");
      if (list) {
        list.textContent = ""; var groups = [];
        GUIDE.forEach(function (entry) { if (groups.indexOf(entry.group) < 0) groups.push(entry.group); });
        groups.forEach(function (group) {
          var section = document.createElement("section"); section.className = "glossary-group"; var heading = document.createElement("h2"); heading.textContent = group; section.appendChild(heading);
          GUIDE.filter(function (entry) { return entry.group === group; }).forEach(function (entry) {
            var article = document.createElement("article"); article.className = "glossary-entry"; article.tabIndex = 0;
            article.innerHTML = "<div class='glossary-entry-heading'><span>" + entry.id + "</span><strong>" + entry.name + "</strong><em class='origin-" + entry.origin.toLowerCase() + "'>" + entry.origin + "</em></div><p>" + entry.summary + "</p>" + (entry.excerpt ? "<blockquote>“" + entry.excerpt.replace(/^“|”$/g, "") + "”</blockquote>" : "");
            article.addEventListener("mouseenter", function () { glossaryHoverId = entry.id; }); article.addEventListener("mouseleave", function () { glossaryHoverId = ""; }); section.appendChild(article);
          }); list.appendChild(section);
        });
      }
      var settings = document.querySelector(".settings-panel");
      if (settings) settings.innerHTML = "<header class='settings-header'><h1 id='settings-title'>Time valley settings</h1><button class='settings-close' type='button' data-settings-close>ESC</button></header><p class='settings-section-label'>MATERIAL FIELDS</p><div class='tuning-controls'><label>Dust <output data-tt-output='dust'>0.85×</output><input data-tt-tuning='dust' type='range' min='0.15' max='1.5' step='0.05' value='0.85'></label><label>Time tides <output data-tt-output='timeTides'>0.72×</output><input data-tt-tuning='timeTides' type='range' min='0' max='1.4' step='0.05' value='0.72'></label><label>Rare presences <output data-tt-output='encounter'>0.45×</output><input data-tt-tuning='encounter' type='range' min='0' max='1' step='0.05' value='0.45'></label></div>";
      document.querySelectorAll("[data-tt-tuning]").forEach(function (input) { input.addEventListener("input", function () { tuning[input.dataset.ttTuning] = Number(input.value); var output = document.querySelector("[data-tt-output='" + input.dataset.ttTuning + "']"); if (output) output.textContent = Number(input.value).toFixed(2) + "×"; initializeField(); }); });
      var settingsClose = document.querySelector("[data-settings-close]"); if (settingsClose) settingsClose.addEventListener("click", function () { document.querySelector(".settings-panel").hidden = true; });
      var settingsToggle = document.querySelector("[data-settings-toggle]"); if (settingsToggle) settingsToggle.addEventListener("click", function () { togglePanel("settings"); });
      var glossaryToggle = document.querySelector("[data-glossary-toggle]"); if (glossaryToggle) glossaryToggle.addEventListener("click", function () { togglePanel("glossary"); });
      var glossaryClose = document.querySelector("[data-glossary-close]"); if (glossaryClose) glossaryClose.addEventListener("click", function () { document.querySelector(".glossary-panel").hidden = true; });
      var glossaryPanel = document.querySelector(".glossary-panel"); var glossaryHeader = document.querySelector("[data-glossary-drag]"); var glossaryPin = document.querySelector("[data-glossary-pin]");
      if (glossaryHeader && glossaryPanel) {
        glossaryHeader.addEventListener("pointerdown", function (event) {
          if (event.target.closest("button")) return; var rect = glossaryPanel.getBoundingClientRect(); glossaryDrag = { id: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
          glossaryHeader.setPointerCapture && glossaryHeader.setPointerCapture(event.pointerId); glossaryPanel.classList.add("is-dragging"); event.preventDefault();
        });
        glossaryHeader.addEventListener("pointermove", function (event) {
          if (!glossaryDrag || glossaryDrag.id !== event.pointerId) return;
          var left = clamp(event.clientX - glossaryDrag.x, 8, Math.max(8, root.innerWidth - glossaryPanel.offsetWidth - 8)); var top = clamp(event.clientY - glossaryDrag.y, 8, Math.max(8, root.innerHeight - glossaryPanel.offsetHeight - 8));
          glossaryPanel.style.left = left + "px"; glossaryPanel.style.top = top + "px"; glossaryPanel.style.right = "auto"; glossaryPanel.style.bottom = "auto";
        });
        function endGlossaryDrag(event) { if (!glossaryDrag || glossaryDrag.id !== event.pointerId) return; glossaryDrag = null; glossaryPanel.classList.remove("is-dragging"); }
        glossaryHeader.addEventListener("pointerup", endGlossaryDrag); glossaryHeader.addEventListener("pointercancel", endGlossaryDrag);
      }
      if (glossaryPin) {
        glossaryPin.addEventListener("click", function () { var pinned = glossaryPin.getAttribute("aria-pressed") !== "true"; glossaryPin.setAttribute("aria-pressed", pinned ? "true" : "false"); try { root.localStorage.setItem("living-scene-guide-pinned:time-tombs", pinned ? "1" : "0"); } catch (_) {} });
        try { if (root.localStorage.getItem("living-scene-guide-pinned:time-tombs") === "1") { glossaryPin.setAttribute("aria-pressed", "true"); if (glossaryPanel) glossaryPanel.hidden = false; } } catch (_) {}
      }
      var welcomeOpen = document.querySelector("[data-welcome-open]"); if (welcomeOpen) welcomeOpen.addEventListener("click", function () { setWelcome(true); });
      if (enter) enter.addEventListener("click", function () { setWelcome(false); });
      if (screensaver) { document.documentElement.classList.add("screensaver-runtime"); setWelcome(false); }
      else {
        var seenKey = "living-scene-welcome:time-tombs"; var alreadySeen = false; try { alreadySeen = root.localStorage.getItem(seenKey) === "1"; } catch (_) {}
        setWelcome(!alreadySeen); if (enter) enter.addEventListener("click", function () { try { root.localStorage.setItem(seenKey, "1"); } catch (_) {} });
      }
    }

    configureUI(); bindInput(); resize(); initializeField(); draw(0);
    frameRequest = root.requestAnimationFrame(render);

    if (debug) root.__sceneDebug = {
      snapshot: function () { return { id: PACK.id, time: simulationTime, viewport: [width, height], artPixel: artPixel, wind: wind, storm: storm, timeTide: timeTide, tombs: tombs.length, dust: dust.length, memory: memory ? memory.snapshot() : null }; },
      identifyAt: function (x, y) { var hit = identifyAt(Number(x), Number(y)); return hit ? GUIDE_BY_ID[hit.id] : null; },
      previewShrike: function () { tuning.encounter = 1; debugShrikeUntil = simulationTime + 20; return true; }
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
