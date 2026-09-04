import {INDEX as I} from './palette.js';
import {Raster, dither, prng} from './raster.js';
import {buildObeliskRelit} from './obelisk-relit.js';
import {buildCrystalRelit} from './crystal-relit.js';
import {buildPalaceRelit} from './palace-relit.js';
import {buildSphinxRelit} from './sphinx-relit.js';
import {buildJadeRelit} from './jade-relit.js';
import {buildCanyonWall} from './caves-relit.js';
import {PILGRIM_FRAMES} from './pilgrims.js';
import {buildTent, buildFire, buildInstrument, buildSupplies} from './environment.js';
import {buildSun, buildMoon} from './sky.js';
import {buildWindstone} from './details.js';

// The establishing shot at stage scale. The world is 1120x360 logical.
// Benson's 3440x1440 ultrawide sees an 860x360 window into it at 4x; 1080p
// sees a 640x360 window at 3x, and smaller screens use 2x. Nothing is ever
// resampled. This file is the reference composed by the live Phaser scene.

// World 1120 wide: the tombs stand apart with valley between them, as in the
// text. The 3440x1440 ultrawide shows an 860-wide window at 4x and pans.
export const STAGE = {width: 1120, height: 360, horizon: 150, viewport: 860};

// ---- sky ----------------------------------------------------------------------
export function buildSkyStudy(width, height, horizon) {
  const r = new Raster(width, height, I.sky[0]);
  const ramp = I.sky, rand = prng(3);
  for (let y = 0; y < horizon; y++) {
    const t = Math.pow(y / (horizon - 1), 1.7) * (ramp.length - 1), b = Math.min(ramp.length - 2, Math.floor(t));
    for (let x = 0; x < width; x++) r.set(x, y, dither(x, y, t - b) ? ramp[b + 1] : ramp[b]);
  }
  // stars: denser and brighter at the top, gone by the mauve band
  for (let i = 0; i < 70; i++) {
    const y = Math.floor(Math.pow(rand(), 1.6) * horizon * 0.45), x = Math.floor(rand() * width);
    r.set(x, y, rand() < 0.2 ? I.anomaly[1] : I.ridge[1]);
  }
  // cloud banks: long horizontal streaks, thicker and warmer near the horizon,
  // one step lighter on top and one step darker underneath, dithered at the ends
  for (let i = 0; i < 16; i++) {
    const depth = rand();
    const y = Math.round(horizon * (0.3 + depth * 0.62)), len = 50 + Math.floor(rand() * 240), x0 = Math.floor(rand() * (width - len));
    const thick = depth > 0.6 ? 2 : 1;
    const local = r.get((x0 + len / 2) | 0, y), at = Math.max(0, ramp.indexOf(local));
    const lighter = ramp[Math.min(ramp.length - 1, at + 1)], darker = ramp[Math.max(0, at - 1)];
    for (let x = x0; x < x0 + len; x++) {
      const edge = Math.min(x - x0, x0 + len - x) / len;
      const wobble = Math.round(Math.sin(x / 17 + i) * 0.6);
      for (let k = 0; k < thick; k++) if (dither(x, y + k, Math.min(1, edge * 7))) r.set(x, y + k + wobble, lighter);
      if (dither(x, y + thick, Math.min(0.85, edge * 5))) r.set(x, y + thick + wobble, darker);
    }
  }
  return r;
}

// ---- far ridges ---------------------------------------------------------------
export function paintRidges(r, horizon) {
  const [shadow, lit] = I.ridge;
  const h = (x, s) => 7 + 4 * Math.sin(x / 19 + s) + 3 * Math.sin(x / 7.3 + s * 2.1) + 1.5 * Math.sin(x / 3.1 + s * 5);
  for (const [seed, offset] of [[1.3, 0], [4.1, 4]]) {
    let prev = h(-1, seed);
    for (let x = 0; x < r.width; x++) {
      const hh = h(x, seed), top = horizon - Math.round(hh) + offset;
      for (let y = top; y < horizon + 3; y++) r.set(x, y, hh > prev && y < top + (offset ? 1 : 3) ? lit : shadow);
      prev = hh;
    }
  }
}

// ---- ground -------------------------------------------------------------------
export function paintGroundBands(r, horizon) {
  const [s0, s1, s2, s3] = I.sand;
  for (let y = horizon; y < r.height; y++) {
    const t = (y - horizon) / (r.height - horizon);
    for (let x = 0; x < r.width; x++) {
      let c = s2;
      if (t > 0.18 && dither(x, y, Math.min(1, (t - 0.18) / 0.3))) c = s1;
      if (t > 0.7 && dither(x, y, (t - 0.7) / 0.3 * 0.55)) c = s0;
      r.set(x, y, c);
    }
  }
  // dune streaks: bands that get denser and longer toward the viewer
  const rand = prng(17);
  for (let band = horizon + 6; band < r.height; band += 9 + Math.floor(rand() * 5)) {
    const t = (band - horizon) / (r.height - horizon), count = 3 + Math.floor(t * 9);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rand() * r.width), len = 3 + Math.floor(rand() * (4 + t * 12)), y = band + Math.floor(rand() * 3);
      const base = r.get(x, y), shade = base === s2 ? s1 : s0, crest = base === s2 ? s3 : s2;
      for (let k = 0; k < len; k++) r.set(x + k, y + (k >= len - 2 ? 1 : 0), shade);
      r.set(x, y - 1, crest); r.set(x + 1, y - 1, crest);
    }
  }
}
// The valley floor is not a plane. It is a stack of dune ridges, far to near,
// each ending in a crest that occludes the ridge behind it. The crest catches
// the horizon light; the foot of each ridge sits in the shadow of the next.
// Crests run slightly diagonal so the floor reads as receding, not striped.
const CRESTS = [
  (x) => 178 + 6 * Math.sin(x / 83) + 2.5 * Math.sin(x / 19) + 1.2 * Math.sin(x / 5.3) - 5 * (x / 860),
  (x) => 206 + 7 * Math.sin(x / 67 + 2) + 3 * Math.sin(x / 14) + 1.5 * Math.sin(x / 4.1) + 6 * (x / 860),
  (x) => 240 + 7 * Math.sin(x / 53 + 4) + 3 * Math.sin(x / 9) + 1.5 * Math.sin(x / 3.7) - 8 * (x / 860),
  (x) => 286 + 8 * Math.sin(x / 71 + 1) + 3 * Math.sin(x / 15) + 2 * Math.sin(x / 4.7) + 10 * (x / 860),
  (x) => 326 + 8 * Math.sin(x / 59 + 3) + 3.5 * Math.sin(x / 17) + 2 * Math.sin(x / 5.9) - 6 * (x / 860)
];
export function paintValleyFloor(r, horizon) {
  const [s0, s1, s2, s3] = I.sand, rand = prng(17);
  const bandBase = [s2, s2, s1, s1, s1, s1], bandCrest = [s3, s3, s2, s2, s2, s2], bandFoot = [s1, s1, s0, s0, s0, s0];
  for (let x = 0; x < r.width; x++) {
    const crests = CRESTS.map((c) => Math.round(c(x)));
    for (let y = horizon; y < r.height; y++) {
      let band = 0; while (band < crests.length && y >= crests[band]) band++;
      const crestY = band === 0 ? horizon : crests[band - 1], nextY = band < crests.length ? crests[band] : r.height + 8;
      const below = y - crestY, above = nextY - y;
      let c = bandBase[band];
      if (band >= 2 && dither(x, y, 0.35 + band * 0.08)) c = band >= 4 ? (dither(x, y, 0.3) ? s0 : s1) : s1;
      if (band === 2 && dither(x, y, 0.4)) c = s2;
      // the crest lights up only where it faces the horizon (rising to the left)
      const rising = band > 0 && CRESTS[band - 1](x) < CRESTS[band - 1](x + 2);
      if (below <= 1 && band > 0 && (rising || dither(x, y, 0.35))) c = bandCrest[band];
      else if (below <= 4 && band > 0 && rising && dither(x, y, (4 - below) / 4 * 0.6)) c = bandCrest[band];
      if (above <= 3 && band < crests.length && dither(x, y, [0.9, 0.55, 0.25][above - 1] ?? 0)) c = bandFoot[band];
      r.set(x, y, c);
    }
    for (let b = 0; b < crests.length; b++) { if (rand() < 0.12) r.set(x, crests[b], bandBase[b + 1]); if (rand() < 0.04) r.set(x, crests[b] + 1 + Math.floor(rand() * 2), s0); }
  }
  // dune streaks inside each band, longer and denser near
  for (let b = 0; b <= CRESTS.length; b++) {
    const count = 6 + b * 6;
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rand() * r.width);
      const top = b === 0 ? horizon : Math.round(CRESTS[b - 1](x)), bottom = b < CRESTS.length ? Math.round(CRESTS[b](x)) : r.height;
      const y = top + 5 + Math.floor(rand() * Math.max(1, bottom - top - 9)), len = 3 + Math.floor(rand() * (3 + b * 3));
      const base = r.get(x, y), shade = base === s2 ? s1 : s0, crest = base === s2 ? s3 : s2;
      for (let k = 0; k < len; k++) r.set(x + k, y + (k >= len - 2 ? 1 : 0), shade);
      r.set(x, y - 1, crest); r.set(x + 1, y - 1, crest);
    }
  }
}
// A dry wash: a shallow channel with a lit far bank and a shadowed near bank.
export function paintWash(r, points, widthNear, widthFar, horizon) {
  const [s0, s1, s2, s3] = I.sand, rand = prng(23);
  for (let y = horizon; y < r.height; y++) {
    let cx = null;
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, ay] = points[i], [bx, by] = points[i + 1];
      if (y >= Math.min(ay, by) && y <= Math.max(ay, by) && ay !== by) cx = ax + (bx - ax) * (y - ay) / (by - ay);
    }
    if (cx === null) continue;
    const depth = (y - horizon) / (r.height - horizon), half = (widthFar + (widthNear - widthFar) * depth) / 2;
    for (let x = Math.floor(cx - half - 2); x <= Math.ceil(cx + half + 2); x++) {
      if (!I.sand.includes(r.get(x, y))) continue;
      const d = (x - cx) / half;
      if (d < -1 && d >= -1.4) { if (dither(x, y, 0.7)) r.set(x, y, s3); }
      else if (d >= -1 && d <= 1) r.set(x, y, dither(x, y, 0.3) ? s0 : s1);
      else if (d > 1 && d <= 1.6) { if (dither(x, y, 1.6 - d + 0.3)) r.set(x, y, s0); }
    }
    if (rand() < 0.3) r.set(Math.round(cx + (rand() - 0.5) * half * 1.4), y, s2);
  }
}
// A terrace step: the upper ground ends in a sunlit lip, a blocky cliff face,
// and a shadow band on the lower ground. The lip wanders; it is not a ruler.
export function paintTerrace(r, x0, x1, lipY, height) {
  const [s0, s1, s2, s3] = I.sand, rand = prng(lipY * 31 + x0);
  for (let x = x0; x < x1; x++) {
    const y = lipY + Math.round(Math.sin(x / 13) * 1.6 + Math.sin(x / 41) * 2.4);
    // collapsed stretches: the lip drops and the face becomes a rubble slope
    const gap = Math.sin(x / 29 + 1.3) > 0.86;
    if (gap) { for (let dy = 0; dy <= height; dy++) if (dither(x, y + dy, 0.5 + dy * 0.06)) r.set(x, y + dy, dy < 2 ? s2 : s0); continue; }
    r.set(x, y, rand() < 0.15 ? s2 : s3);
    for (let dy = 1; dy <= height; dy++) {
      const course = Math.floor(dy / 3), courseRow = dy % 3 === 0, vertical = ((x + course * 4) % 9) === 0;
      r.set(x, y + dy, courseRow || vertical || (dy === height && rand() < 0.35) ? s0 : s1);
    }
    for (let dy = 1; dy <= 3; dy++) if (dither(x, y + height + dy, [0.8, 0.45, 0.15][dy - 1])) r.set(x, y + height + dy, s0);
  }
}
// Rock outcrops: low irregular mounds with a lit top-left face and a shadow
// side. Bigger near the viewer. Placed at tomb feet and along terraces.
export function paintOutcrop(r, cx, baseY, w, h, seed) {
  const [s0, s1, s2, s3] = I.sand, rand = prng(seed);
  // A weathered boulder: a broken plateau on top, a steep lit face toward the
  // horizon, a longer shadow slope away from it, cracks, rubble at the foot.
  const left = Math.round(cx - w / 2), right = Math.round(cx + w / 2);
  const top = [];
  for (let x = left; x <= right; x++) {
    const u = (x - left) / w;
    let hh = u < 0.18 ? Math.pow(u / 0.18, 0.7) : u > 0.62 ? Math.pow(1 - (u - 0.62) / 0.38, 1.4) : 1;
    hh *= 0.86 + 0.14 * Math.sin(x * 1.7 + seed) * (u > 0.15 && u < 0.7 ? 1 : 0.3);
    top.push(Math.round(baseY - h * hh));
  }
  const split = left + Math.round(w * 0.42);
  for (let x = left; x <= right; x++) for (let y = top[x - left]; y <= baseY; y++) {
    const t = (y - top[x - left]) / Math.max(1, baseY - top[x - left]);
    let c;
    if (x < split) c = t < 0.25 ? (dither(x, y, 0.6) ? s3 : s2) : (t > 0.7 && dither(x, y, 0.5) ? s1 : s2);
    else c = t < 0.15 && x < split + w * 0.2 ? s2 : (t > 0.4 && dither(x, y, 0.65) ? s0 : s1);
    r.set(x, y, c);
  }
  for (let x = left + 1; x < split; x++) if (rand() > 0.25) r.set(x, top[x - left], s3);   // lit crest
  for (let x = split; x < right; x++) r.set(x, top[x - left], s1);                          // shadow crest
  r.line(left, top[0] + 1, left, baseY, s2);
  // cracks run down from the plateau on the lit face
  for (let i = 0; i < Math.max(1, Math.round(w / 18)); i++) { let x = left + 4 + Math.floor(rand() * (split - left - 6)); for (let y = top[x - left] + 2; y < baseY - 2; y++) { if (rand() < 0.25) x += rand() < 0.5 ? -1 : 1; if (rand() < 0.7) r.set(x, y, s1); } }
  r.line(left + 2, baseY + 1, right + Math.round(w * 0.3), baseY + 1, s0);
  for (let i = 0; i < Math.round(w / 5); i++) r.set(right + Math.floor(rand() * w * 0.35), baseY + 1 + Math.floor(rand() * 2), rand() < 0.6 ? s0 : s1);
}
// Gravel: a dense field of dark specks with a dithered edge, where rock has
// weathered off a monument. Quiet ground elsewhere makes these read.
export function paintGravel(r, cx, cy, rx, ry, seed, density = 0.4) {
  const [s0, s1] = I.sand, rand = prng(seed);
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d > 1 || !I.sand.includes(r.get(x, y))) continue;
    if (rand() < density * (1 - d) + 0.02) r.set(x, y, rand() < 0.65 ? s0 : s1);
  }
}
// A moon large enough to read: lit toward the sun, shadow side toward the sky.
export function paintMoon(r, cx, cy, rad) {
  const lit = I.linen[3], mid = I.ridge[1], shade = I.sky[2];
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
    if (x * x + y * y > rad * rad) continue;
    const towardSun = x / rad;
    let c = mid;
    if (towardSun < -0.45 || (towardSun < 0 && dither(cx + x, cy + y, -towardSun * 2))) c = shade;
    if (towardSun > 0.3 && y < rad * 0.4 && dither(cx + x, cy + y, towardSun)) c = lit;
    r.set(cx + x, cy + y, c);
  }
  r.set(cx + 1, cy - 2, mid); r.set(cx + 2, cy + 1, shade); r.set(cx - 1, cy + 2, shade); // maria
}
// Camp furniture: a fire ring, a windbreak of cloth between two poles, footprints.
export function paintFireRing(r, cx, cy) {
  const [s0, s1, s2] = I.sand;
  for (const [dx, dy] of [[-4, 0], [-3, -1], [-1, -2], [1, -2], [3, -1], [4, 0], [3, 1], [1, 2], [-1, 2], [-3, 1]]) r.set(cx + dx, cy + dy, (dx < 0 && dy <= 0) ? s2 : s0);
  for (let x = -3; x <= 3; x++) if (dither(cx + x, cy + 3, 0.6)) r.set(cx + x, cy + 3, s0);
}
export function paintWindbreak(r, x, y, w, h) {
  const pole = I.obsidian[1], cloth = I.cloth;
  r.line(x, y, x, y + h + 3, pole); r.line(x + w, y - 1, x + w, y + h + 2, pole);
  for (let j = 0; j < h; j++) for (let i = 1; i < w; i++) {
    const sag = Math.round(Math.sin((i / w) * Math.PI) * 1.5);
    r.set(x + i, y + j + sag, j === 0 ? cloth[3] : (dither(x + i, y + j, 0.25 + j * 0.1) ? cloth[1] : cloth[2]));
  }
  r.line(x + 1, y + h + 1, x + w - 1, y + h + 1, I.sand[0]);
}
export function paintFootprints(r, points, seed) {
  const rand = prng(seed), s0 = I.sand[0];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i], [bx, by] = points[i + 1], n = Math.round(Math.hypot(bx - ax, by - ay) / 6);
    for (let k = 0; k <= n; k++) { const t = k / n, x = Math.round(ax + (bx - ax) * t + (k % 2 ? 2 : -2)), y = Math.round(ay + (by - ay) * t); if (I.sand.includes(r.get(x, y)) && rand() < 0.8) { r.set(x, y, s0); r.set(x + 1, y, s0); } }
  }
}
// Cairn: a few stacked stones marking the path.
export function paintCairn(r, x, baseY) {
  const [s0, s1, s2, s3] = I.sand;
  r.rect(x - 2, baseY - 1, 5, 2, s1); r.rect(x - 1, baseY - 3, 3, 2, s2); r.rect(x, baseY - 4, 1, 1, s3);
  r.set(x - 2, baseY - 1, s2); r.set(x + 2, baseY, s0); r.line(x + 3, baseY + 1, x + 5, baseY + 1, s0);
}
// Foreground ledge: a near rock shelf along the bottom edge, drawn large and
// dark so the eye has something in front of the valley.
export function paintForegroundLedge(r, x0, x1, crestY, seed) {
  const [s0, s1, s2, s3] = I.sand, rand = prng(seed);
  const tops = [];
  for (let x = x0; x < x1; x++) {
    const u = (x - x0) / (x1 - x0);
    const fade = Math.min(1, Math.min(u, 1 - u) * 4);
    const top = Math.round(crestY + (1 - fade) * 18 + 4 * Math.sin(x / 17 + seed) + 2 * Math.sin(x / 5.1) + (Math.sin(x / 2.3) > 0.7 ? 1 : 0));
    tops.push(top);
    for (let y = top; y < r.height; y++) {
      const t = (y - top) / Math.max(1, r.height - top);
      let c = s0;
      if (t < 0.14 && dither(x, y, 0.75)) c = s1;                                  // lit upper face, near scale
      if (t > 0.14 && t < 0.6 && ((y + Math.floor(x / 23)) % 9 === 0) && rand() < 0.55) c = s1; // strata
      r.set(x, y, c);
    }
    r.set(x, top, rand() < 0.85 ? s2 : s1);
    if (rand() < 0.3) r.set(x, top - 1, s2);
  }
  // big cracks and flat stones: the nearest thing in frame carries the largest detail
  for (let i = 0; i < 3; i++) {
    let x = x0 + Math.round((x1 - x0) * (0.2 + i * 0.28)); const y0 = tops[x - x0] + 2;
    for (let y = y0; y < r.height - 2; y++) { if (rand() < 0.35) x += rand() < 0.5 ? -1 : 1; r.set(x, y, s1); if (y % 3 === 0) r.set(x + 1, y, s1); }
  }
  for (let i = 0; i < 4; i++) {
    const x = x0 + 6 + Math.floor(rand() * (x1 - x0 - 20)), w = 5 + Math.floor(rand() * 8), y = tops[x - x0] - 1;
    r.rect(x, y, w, 2, s2); r.rect(x, y - 1, w - 2, 1, s3); r.rect(x + 1, y + 2, w, 1, s0);
  }
}
export function paintPath(r, points, widthNear, widthFar, horizon) {
  const [s0, s1, s2, s3] = I.sand;
  for (let y = horizon; y < r.height; y++) {
    let cx = null;
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, ay] = points[i], [bx, by] = points[i + 1];
      if (y >= Math.min(ay, by) && y <= Math.max(ay, by) && ay !== by) cx = ax + (bx - ax) * (y - ay) / (by - ay);
    }
    if (cx === null) continue;
    const depth = (y - horizon) / (r.height - horizon), half = (widthFar + (widthNear - widthFar) * depth) / 2;
    for (let x = Math.floor(cx - half - 1); x <= Math.ceil(cx + half + 1); x++) {
      const d = Math.abs(x - cx) / half, under = r.get(x, y);
      if (!I.sand.includes(under)) continue;
      const light = under === s0 ? s1 : under === s1 ? s2 : s3;
      if (d <= 0.8) r.set(x, y, dither(x, y, 0.2) ? I.sand[Math.min(3, I.sand.indexOf(light) + 1)] : light);
      else if (d <= 1.3 && dither(x, y, 1.3 - d)) r.set(x, y, light);
    }
  }
}
export function paintRubble(r, x, y, count, spread, seed = 1) {
  const rand = prng(seed), [s0, s1] = I.sand;
  for (let i = 0; i < count; i++) {
    const dx = Math.round((rand() + rand() - 1) * spread) + (rand() < 0.6 ? Math.round(spread * 0.3) : 0);
    const dy = Math.round((rand() - 0.5) * 3);
    if (!I.sand.includes(r.get(x + dx, y + dy))) continue;
    r.set(x + dx, y + dy, rand() < 0.6 ? s0 : s1);
    if (rand() < 0.4) r.set(x + dx + 1, y + dy, s0);
  }
}
export function paintGroundShadow(r, x, y, length, thickness) {
  const s0 = I.sand[0];
  for (let i = 0; i < length; i++) {
    const t = i / length;
    for (let dy = -thickness; dy <= thickness; dy++) {
      if (Math.abs(dy) > thickness * (1 - t)) continue;
      if (dither(x + i, y + dy, 0.9 - t * 0.75) && I.sand.includes(r.get(x + i, y + dy))) r.set(x + i, y + dy, s0);
    }
  }
}

// ---- pilgrims: one strong color per identity -------------------------------------
export const PILGRIMS_RECOLORED=PILGRIM_FRAMES;

// ---- placements: book order from the valley entrance ----------------------------
// Sphinx, Jade, Obelisk, Crystal, Caves, Palace. Each monument stands clear of
// its neighbours against the sky; depth is staggered so nearer bases sit lower.
// `human` is the height of a person at each monument's depth. The text has
// pilgrims "dwarfed by distance, small sticks of color amid the boulders and
// dunes near the Sphinx", a Monolith shot from "thirty meters up on the sheer
// face", an Obelisk whose shadow is "thrown high on the cliff wall". So a
// person on the tomb shelf is 7 px and the tombs are thirty to forty of them
// tall. Doors, gates, steps and cave mouths derive from `human`; masses do not.
// 20 px pilgrims exist only in the foreground camp; on the shelf they are the
// 3x7 specks below. Runtime actors need the same three sizes (20, 12, 7) by band.
export const STANDS = [
  {key: 'caves', build: () => buildCanyonWall({width: 1120, height: 124, human: 5}), x: 0, base: 200, shadow: [0, 0], drift: 0.6},
  {key: 'palace', build: () => buildPalaceRelit({width: 200, height: 240, human: 5}), x: 904, base: 224, shadow: [40, 3], drift: 0.7},
  {key: 'crystal', build: () => buildCrystalRelit({width: 70, height: 228}), x: 690, base: 238, shadow: [44, 3], drift: 0.8},
  {key: 'jade', build: () => buildJadeRelit({width: 150, height: 108, human: 6}), x: 300, base: 224, shadow: [36, 3], drift: 0.75},
  {key: 'obelisk', build: () => buildObeliskRelit({width: 42, height: 240, human: 7}), x: 546, base: 252, shadow: [34, 2], drift: 1},
  {key: 'sphinx', build: () => buildSphinxRelit({width: 190, height: 132, human: 7}), x: 20, base: 250, shadow: [40, 3], drift: 1}
];

// A pilgrim seen from across the valley: three pixels wide, seven tall, one
// identity color, a dark head and feet. This is the book's "small stick of color".
export function tinyPilgrim(index) {
  const garment = [I.fire[0], I.linen[2], I.cloth[2], I.linen[1], I.obsidian[1], I.uniform[1], I.pilgrimJade[2]][index];
  const r = new Raster(3, 7);
  r.set(1, 0, I.obsidian[0]); r.set(1, 1, I.skin[0]);
  r.rect(0, 2, 3, 3, garment); r.set(2, 3, I.obsidian[0]);
  r.set(0, 5, I.obsidian[0]); r.set(2, 5, I.obsidian[0]); r.set(0, 6, I.obsidian[0]); r.set(2, 6, I.obsidian[0]);
  return r;
}

// Sand drifts against every foot. Height wanders along the base, deepens on
// the lee (right) side, and laps over the sprite's lowest rows so no monument
// meets the ground in a ruler-straight line.
export function paintSandDrift(r, x0, x1, baseY, seed, scale = 1) {
  const [s0, s1, s2, s3] = I.sand, rand = prng(seed);
  for (let x = x0 - 8; x <= x1 + 10; x++) {
    const u = (x - x0) / Math.max(1, x1 - x0);
    const lee = u > 0.7 ? (u - 0.7) * 8 : 0;
    const edgeFade = x < x0 ? 1 - (x0 - x) / 9 : x > x1 ? 1 - (x - x1) / 11 : 1;
    let h = (1.6 + 2.4 * Math.sin(x / 7.3 + seed) + 1.4 * Math.sin(x / 2.9 + seed * 2) + lee) * scale * Math.max(0, edgeFade);
    h = Math.max(0, Math.round(h + (rand() - 0.5)));
    for (let y = baseY - h + 1; y <= baseY + 1; y++) {
      if (y < 0 || y >= r.height) continue;
      const top = y === baseY - h + 1;
      const c = top ? (Math.sin(x / 7.3 + seed) > Math.sin((x - 1) / 7.3 + seed) ? s3 : s2) : (dither(x, y, 0.35 + (y - (baseY - h)) * 0.1) ? s1 : s2);
      r.set(x, y, c);
    }
    if (h > 2 && rand() < 0.2) r.set(x, baseY + 2, s0);
  }
}

// Runtime layers use the exact same painters and coordinates as the canonical
// study. They are kept separate only so Phaser can preserve picking, depth
// sorting and animation without flattening or resampling the frame.
export function buildStageSky(){return buildSkyStudy(STAGE.width,STAGE.height,STAGE.horizon);}
export function buildStageRidges(){const r=new Raster(STAGE.width,STAGE.height);paintRidges(r,STAGE.horizon);return r;}
export function buildStageMoon(){const r=new Raster(15,15);paintMoon(r,7,7,7);return r;}
export function buildStageGround(){
  const {width,height,horizon}=STAGE,r=new Raster(width,height);
  paintValleyFloor(r,horizon);
  paintWash(r,[[1120,346],[940,332],[760,318],[640,320],[560,334],[520,350]],9,5,horizon);
  paintTerrace(r,0,470,276,6);
  paintPath(r,[[110,360],[170,334],[236,306],[320,293],[412,284],[456,274],[500,264],[566,256],[640,248],[720,240],[810,232],[900,226],[1010,220],[1120,214]],9,3,horizon);
  paintPath(r,[[412,284],[386,272],[360,258],[340,246],[320,236]],5,3,horizon);
  paintPath(r,[[360,258],[290,261],[220,262],[160,263],[100,262]],5,4,horizon);
  paintPath(r,[[412,284],[430,306],[448,330],[464,346],[480,360]],6,4,horizon);
  paintPath(r,[[720,240],[760,234],[800,226],[840,214],[870,206]],3,2,horizon);
  for(const [cx,by,w,h,s] of [[40,340,46,12,1],[372,352,60,14,2],[640,300,30,8,3],[760,262,22,6,4],[1000,320,44,11,5],[840,350,52,12,6],[250,250,18,5,7],[1080,258,20,5,8],[600,330,26,7,9],[470,262,16,5,10],[880,300,34,9,12]])paintOutcrop(r,cx,by,w,h,s);
  for(const [cx,cy,rx,ry,s] of [[120,256,70,5,11],[376,230,50,4,12],[568,256,24,4,13],[726,242,36,4,14],[1000,230,80,5,15]])paintGravel(r,cx,cy,rx,ry,s);
  for(const [x,y] of [[262,300],[390,284],[512,262],[660,246],[804,232],[960,222]])paintCairn(r,x,y);
  paintGravel(r,226,332,70,16,31,.22);
  paintFootprints(r,[[262,312],[330,300],[412,284]],33);
  paintFootprints(r,[[176,328],[146,300],[126,272]],34);
  paintWindbreak(r,148,322,16,7);
  paintRubble(r,216,350,6,30,21);paintFireRing(r,216,346);
  return r;
}
export function buildStageForeground(){
  const r=new Raster(STAGE.width,STAGE.height);
  paintForegroundLedge(r,0,160,334,41);paintForegroundLedge(r,940,1120,330,42);paintForegroundLedge(r,560,700,348,43);
  return r;
}
export function buildStageShadow(stand){
  const ground=buildStageGround(),before=ground.clone(),sprite=stand.build();
  if(stand.shadow[0])paintGroundShadow(ground,stand.x+sprite.width-6,stand.base-1,stand.shadow[0],stand.shadow[1]);
  paintRubble(ground,stand.x+sprite.width/2,stand.base,12,sprite.width*.6,STANDS.indexOf(stand)+3);
  const out=new Raster(STAGE.width,STAGE.height);for(let i=0;i<ground.data.length;i++)if(ground.data[i]!==before.data[i])out.data[i]=ground.data[i];return out;
}
export function buildStageDrift(stand){
  const r=new Raster(STAGE.width,STAGE.height),sprite=stand.build(),seed=60+STANDS.indexOf(stand);
  if(stand.key==='caves')for(let x=120;x<r.width;x+=60)paintSandDrift(r,x,x+50,stand.base,50+x,stand.drift);
  else paintSandDrift(r,stand.x+2,stand.x+sprite.width-3,stand.base,seed,stand.drift);
  return r;
}

// ---- the establishing shot ---------------------------------------------------------
export function composeEstablishing(time = 0) {
  const {width, height, horizon} = STAGE;
  const r = buildSkyStudy(width, height, horizon);
  r.blit(buildSun(Math.floor(time * 2) % 2), 842, 30);
  paintMoon(r, 178, 42, 7);
  paintRidges(r, horizon);
  paintValleyFloor(r, horizon);
  paintWash(r, [[1120, 346], [940, 332], [760, 318], [640, 320], [560, 334], [520, 350]], 9, 5, horizon);

  // a built terrace: the tombs stand on an upper shelf; the camp is on the valley floor
  paintTerrace(r, 0, 470, 276, 6);

  // paths: camp up the ramp between the terraces, then along the valley to each monument
  paintPath(r, [[110, 360], [170, 334], [236, 306], [320, 293], [412, 284], [456, 274], [500, 264], [566, 256], [640, 248], [720, 240], [810, 232], [900, 226], [1010, 220], [1120, 214]], 9, 3, horizon);
  paintPath(r, [[412, 284], [386, 272], [360, 258], [340, 246], [320, 236]], 5, 3, horizon);
  paintPath(r, [[360, 258], [290, 261], [220, 262], [160, 263], [100, 262]], 5, 4, horizon);
  paintPath(r, [[412, 284], [430, 306], [448, 330], [464, 346], [480, 360]], 6, 4, horizon);
  paintPath(r, [[720, 240], [760, 234], [800, 226], [840, 214], [870, 206]], 3, 2, horizon);

  // outcrops: clustered at feet and along the terrace, bigger toward the viewer
  for (const [cx, by, w, h, s] of [[40, 340, 46, 12, 1], [372, 352, 60, 14, 2], [640, 300, 30, 8, 3], [760, 262, 22, 6, 4], [1000, 320, 44, 11, 5], [840, 350, 52, 12, 6], [250, 250, 18, 5, 7], [1080, 258, 20, 5, 8], [600, 330, 26, 7, 9], [470, 262, 16, 5, 10], [880, 300, 34, 9, 12]]) paintOutcrop(r, cx, by, w, h, s);

  // gravel where the monuments have shed stone; cairns along the main path
  for (const [cx, cy, rx, ry, s] of [[120, 256, 70, 5, 11], [376, 230, 50, 4, 12], [568, 256, 24, 4, 13], [726, 242, 36, 4, 14], [1000, 230, 80, 5, 15]]) paintGravel(r, cx, cy, rx, ry, s);
  for (const [x, y] of [[262, 300], [390, 284], [512, 262], [660, 246], [804, 232], [960, 222]]) paintCairn(r, x, y);
  // windstones: Sol's standing stones, mid-ground, base-anchored
  for (const [v, x, base] of [[0, 820, 258], [1, 470, 268], [2, 250, 232], [1, 1040, 262]]) { const w = buildWindstone(v); r.blit(w, x, base - w.height + 1); }

  // monuments, far to near
  const sprites = STANDS.map((s) => ({...s, sprite: s.build()}));
  for (const [i, s] of sprites.entries()) {
    if (s.shadow[0]) paintGroundShadow(r, s.x + s.sprite.width - 6, s.base - 1, s.shadow[0], s.shadow[1]);
    paintRubble(r, s.x + s.sprite.width / 2, s.base, 12, s.sprite.width * 0.6, i + 3);
    r.blit(s.sprite, s.x, s.base - s.sprite.height + 1);
    if (s.key === 'caves') { for (let x = 120; x < r.width; x += 60) paintSandDrift(r, x, x + 50, s.base, 50 + x, s.drift); }
    else paintSandDrift(r, s.x + 2, s.x + s.sprite.width - 3, s.base, 60 + i, s.drift);
  }

  // pilgrims on the shelf: specks near the Sphinx entrance, the Obelisk and the Jade
  for (const [i, x, y] of [[5, 104, 244], [0, 112, 245], [2, 122, 243], [4, 582, 248], [3, 588, 247], [6, 380, 222], [1, 740, 234]]) r.blit(tinyPilgrim(i), x, y);

  // camp on the valley floor, near the camera: trampled ground, three tents,
  // a windbreak, gear, instruments, a ringed fire as the warmest point in frame
  paintGravel(r, 226, 332, 70, 16, 31, 0.22);
  paintFootprints(r, [[262, 312], [330, 300], [412, 284]], 33);
  paintFootprints(r, [[176, 328], [146, 300], [126, 272]], 34);
  r.blit(buildTent(Math.floor(time * 3) % 4), 174, 306);
  r.blit(buildTent(Math.floor(time * 3 + 1) % 4, 1), 238, 314);
  r.blit(buildTent(Math.floor(time * 3 + 2) % 4), 280, 324);
  paintWindbreak(r, 148, 322, 16, 7);
  r.blit(buildSupplies(), 222, 340);
  r.blit(buildSupplies(), 266, 346);
  r.blit(buildInstrument(Math.floor(time * 2) % 4), 316, 316);
  paintRubble(r, 216, 350, 6, 30, 21);
  paintFireRing(r, 216, 346);
  r.blit(buildFire(Math.floor(time * 6) % 4), 212, 336);

  // 20 px pilgrims only here, in the foreground: three at the fire, two setting out
  const idle = (i) => PILGRIMS_RECOLORED[i][Math.min(4, PILGRIMS_RECOLORED[i].length - 1)];
  const walk = (i, f) => PILGRIMS_RECOLORED[i][f % 4];
  r.blit(idle(1), 196, 328); r.blit(idle(3), 230, 328); r.blit(idle(6), 202, 346);
  const step = Math.floor(time * 6);
  r.blit(walk(5, step), 318 + Math.round(time * 8) % 40, 306);
  r.blit(walk(0, step + 2), 302 + Math.round(time * 8) % 40, 314);

  // foreground: near rock shelves in the bottom corners, in front of everything
  paintForegroundLedge(r, 0, 160, 334, 41);
  paintForegroundLedge(r, 940, 1120, 330, 42);
  paintForegroundLedge(r, 560, 700, 348, 43);
  return r;
}
