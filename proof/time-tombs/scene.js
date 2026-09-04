import { INDEX, TRANSPARENT } from "./palette.js";
import { Raster, dither, prng } from "./raster.js";
import { KASSAD_FRAMES } from "./kassad.js";

export const SLICE = { width: 160, height: 90, horizon: 44, groundTop: 42, tile: 16 };

// ---------- sky ----------
function paintSky(r) {
  const ramp = INDEX.sky;
  const rows = SLICE.horizon;
  for (let y = 0; y < rows; y++) {
    // ease toward the horizon so the warm band is compressed low
    const t = Math.pow(y / (rows - 1), 1.6) * (ramp.length - 1);
    const base = Math.min(ramp.length - 2, Math.floor(t));
    const frac = t - base;
    for (let x = 0; x < r.width; x++) r.set(x, y, dither(x, y, frac) ? ramp[base + 1] : ramp[base]);
  }
  const rand = prng(7);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(rand() * r.width);
    const y = Math.floor(rand() * 18);
    r.set(x, y, INDEX.ridge[1]);
  }
  paintSun(r, 132, 11);
}

function paintSun(r, cx, cy) {
  const [ring, core] = INDEX.sun;
  for (const [dx, dy] of [[-1,-2],[0,-2],[1,-2],[-2,-1],[2,-1],[-2,0],[2,0],[-2,1],[2,1],[-1,2],[0,2],[1,2]]) r.set(cx + dx, cy + dy, ring);
  for (const [dx, dy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]]) r.set(cx + dx, cy + dy, INDEX.sky[0]);
  for (const [dx, dy] of [[0,-4],[4,0],[0,4],[-4,0],[-3,-3],[3,3]]) r.set(cx + dx, cy + dy, ring);
  r.set(cx - 1, cy - 2, core); r.set(cx - 2, cy - 1, core);
}

// ---------- far ridges ----------
function ridgeHeight(x, seed) {
  return 5 + 3.2 * Math.sin(x / 11 + seed) + 2.4 * Math.sin(x / 4.7 + seed * 2.3) + 1.2 * Math.sin(x / 2.1 + seed * 5);
}
function paintRidges(r) {
  const [shadow, lit] = INDEX.ridge;
  for (const [seed, offset] of [[1.3, 0], [4.1, 3]]) {
    let prev = ridgeHeight(-1, seed);
    for (let x = 0; x < r.width; x++) {
      const h = ridgeHeight(x, seed);
      const top = SLICE.horizon - Math.round(h) + offset;
      const litColumn = h > prev; // left-facing slope catches the horizon light
      for (let y = top; y < SLICE.horizon + 2; y++) {
        const color = litColumn && y < top + 3 ? lit : shadow;
        r.set(x, y, offset === 0 ? color : (y === top && litColumn ? lit : shadow));
      }
      prev = h;
    }
  }
}

// ---------- ground tiles ----------
// Sand: dune crests run in loose horizontal bands that continue across tile
// boundaries. Each streak is a lee shadow with a highlight along its crest.
// The far row is lighter (atmosphere); near rows carry more contrast.
function sandTile(seed, depth) {
  const [s0, s1, s2, s3] = INDEX.sand;
  const far = depth === 0;
  const base = far ? s2 : s1, shade = far ? s1 : s0, crest = far ? s3 : s2;
  const t = new Raster(SLICE.tile, SLICE.tile, base);
  const rand = prng(seed);
  const bands = far ? [5, 12] : [3, 9, 14];
  for (const band of bands) {
    if (rand() < 0.3) continue;
    const cx = Math.floor(rand() * 10);
    const cy = band + Math.floor(rand() * 2) - 1;
    const len = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < len; i++) t.set(cx + i, cy + (i >= len - 2 ? 1 : 0), shade);
    t.set(cx, cy - 1, crest);
    t.set(cx + 1, cy - 1, crest);
    if (len > 4) t.set(cx + 2, cy - 1, crest);
  }
  if (!far && rand() > 0.5) t.set(Math.floor(rand() * 16), Math.floor(rand() * 16), s2);
  return t;
}

function paintGround(r) {
  const rows = Math.ceil((r.height - SLICE.groundTop) / SLICE.tile);
  const cols = r.width / SLICE.tile;
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    r.blit(sandTile(row * 97 + col * 13 + 5, row), col * SLICE.tile, SLICE.groundTop + row * SLICE.tile);
  }
}

// A terrace step: highlight lip, then a cliff face with masonry-like courses.
function paintTerrace(r, x0, x1, lipY, height) {
  const [s0, s1, s2, s3] = INDEX.sand;
  const rand = prng(lipY * 31 + x0);
  for (let x = x0; x < x1; x++) {
    const sag = Math.round(Math.sin(x / 9) * 0.8 + Math.sin(x / 23) * 0.9); // the lip is not ruler-straight
    const y = lipY + sag;
    r.set(x, y, rand() < 0.15 ? s2 : s3);                 // sunlit lip, chipped
    for (let dy = 1; dy <= height; dy++) {
      const courseRow = dy % 3 === 0;                       // horizontal seam
      const course = Math.floor(dy / 3);
      const vertical = ((x + course * 3) % 7) === 0;        // offset block seams
      const rubble = dy === height && rand() < 0.35;
      r.set(x, y + dy, courseRow || vertical || rubble ? s0 : s1);
    }
    // the drop casts a shadow onto the lower ground
    for (let dy = 1; dy <= 2; dy++) if (dither(x, y + height + dy, dy === 1 ? 0.75 : 0.35)) r.set(x, y + height + dy, s0);
    if (x === x1 - 1) for (let dy = 0; dy <= height; dy++) r.set(x + 1, y + dy, s0); // end of the step
  }
}

// A path: a light band with broken edges following a centerline.
function paintPath(r, points, widthNear, widthFar) {
  const [s0, s1, s2, s3] = INDEX.sand;
  for (let y = SLICE.groundTop; y < r.height; y++) {
    let cx = null;
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, ay] = points[i]; const [bx, by] = points[i + 1];
      if ((y >= Math.min(ay, by)) && (y <= Math.max(ay, by)) && ay !== by) cx = ax + (bx - ax) * (y - ay) / (by - ay);
    }
    if (cx === null) continue;
    const depth = (y - SLICE.groundTop) / (r.height - SLICE.groundTop);
    const half = (widthFar + (widthNear - widthFar) * depth) / 2;
    for (let x = Math.floor(cx - half - 1); x <= Math.ceil(cx + half + 1); x++) {
      const d = Math.abs(x - cx) / half;
      if (d <= 0.8) r.set(x, y, dither(x, y, 0.15) ? s3 : s2);
      else if (d <= 1.25 && dither(x, y, 1.25 - d + 0.2)) r.set(x, y, s2);
    }
  }
}

// ---------- the Obelisk ----------
// A narrow black monument: tapered shaft, pyramidion, two-step plinth. Two
// visible faces split off-center; courses with chipped seams; sparse minute lights.
export function buildObelisk(seed = 3) {
  const [k0, k1, k2, k3] = INDEX.obsidian;
  const width = 18, height = 70;
  const s = new Raster(width, height);
  const rand = prng(seed);
  const cx = 8;
  const shaftTop = 8, shaftBottom = 65;
  const lightsOn = [];
  for (let y = shaftTop; y <= shaftBottom; y++) {
    const t = (y - shaftTop) / (shaftBottom - shaftTop);
    const half = 2.6 + 2.6 * t;
    const left = Math.round(cx - half), right = Math.round(cx + half);
    const split = Math.round(cx - half * 0.35);
    const course = (y - shaftTop) % 11 === 10;
    for (let x = left; x <= right; x++) {
      let c = x < split ? k2 : k1;
      if (x === left) c = k3;                    // lit edge
      if (x === split) c = k1;                   // corner falls into shadow
      if (x === right) c = k0;                   // shadow edge
      // a monolith: seams are faint on the lit face, dark in shadow, and chipped
      if (course && x !== left && rand() > 0.2) c = x < split ? k1 : k0;
      s.set(x, y, c);
    }
    if ((y - shaftTop) % 9 === 4) lightsOn.push([split + 1 + Math.floor(rand() * Math.max(1, right - split - 2)), y]);
  }
  // pyramidion
  for (let y = 0; y < shaftTop; y++) {
    const half = (y / shaftTop) * 2.6;
    const left = Math.round(cx - half), right = Math.round(cx + half);
    for (let x = left; x <= right; x++) s.set(x, y, x < cx - 1 ? k3 : (x <= cx ? k2 : k1));
  }
  // chips on the shadow silhouette
  for (let i = 0; i < 4; i++) {
    const y = shaftTop + 4 + Math.floor(rand() * (shaftBottom - shaftTop - 8));
    const half = 2.6 + 2.6 * ((y - shaftTop) / (shaftBottom - shaftTop));
    s.set(Math.round(cx + half), y, TRANSPARENT);
    s.set(Math.round(cx + half) - 1, y, k0);
  }
  for (const [x, y] of lightsOn) s.set(x, y, INDEX.anomaly[0]);
  s.set(lightsOn[2][0], lightsOn[2][1], INDEX.anomaly[1]);
  // plinth: two steps, lit tops, dark risers
  s.rect(2, 66, 14, 1, k3); s.rect(2, 67, 14, 1, k1); s.rect(15, 66, 1, 2, k0);
  s.rect(0, 68, 18, 1, k2); s.rect(0, 69, 18, 1, k0);
  return s;
}

function paintObeliskShadow(r, x, y, length) {
  const s0 = INDEX.sand[0];
  for (let i = 0; i < length; i++) {
    const t = i / length;
    for (let dy = -1; dy <= 1; dy++) {
      if (Math.abs(dy) === 1 && t > 0.5) continue;
      if (dither(x + i, y + dy, 0.85 - t * 0.7)) r.set(x + i, y + dy, s0);
    }
  }
}

// ---------- instrument (ported from the compiler, variant 0: survey mast) ----------
export function buildInstrument(frame) {
  const s = new Raster(15, 24);
  const body = INDEX.obsidian[1], edge = INDEX.uniform[1], brass = INDEX.accent[1], glow = INDEX.anomaly[0];
  const line = (x0, y0, x1, y1, c) => {
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) { s.set(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  };
  s.rect(6, 4, 3, 17, body); s.rect(3, 20, 9, 3, edge); s.rect(3, 8, 9, 2, brass);
  line(4, 19, 7, 12, edge); line(10, 19, 7, 12, edge); s.rect(6, 2, 3, 2, brass);
  s.set(7, 11, frame === 1 || frame === 2 ? glow : brass);
  return s;
}

// ---------- compose ----------
export function renderBackground() {
  const r = new Raster(SLICE.width, SLICE.height, INDEX.sky[0]);
  paintSky(r);
  paintRidges(r);
  paintGround(r);
  paintPath(r, [[14, 90], [60, 74], [96, 66], [140, 60], [160, 58]], 7, 3);
  paintTerrace(r, 0, 76, 57, 6);
  paintObeliskShadow(r, 106, 64, 16);
  return r;
}

export const OBELISK = { sprite: buildObelisk(), x: 88, y: -5 }; // base lands on y=64
export const INSTRUMENT_POS = { x: 30, y: 58 };
export const KASSAD_PATH = { y: 68, from: -14, to: 172 };

export function renderFrame(time) {
  const r = renderBackground();
  const k = KASSAD_FRAMES;
  // depth order: instrument (mid), obelisk (mid), kassad (near)
  r.blit(buildInstrument(Math.floor(time * 2) % 4), INSTRUMENT_POS.x, INSTRUMENT_POS.y);
  r.blit(OBELISK.sprite, OBELISK.x, OBELISK.y);
  const span = KASSAD_PATH.to - KASSAD_PATH.from;
  const x = KASSAD_PATH.from + ((time * 9) % span);
  r.blit(k[Math.floor(time * 7) % 4], Math.round(x), KASSAD_PATH.y);
  return r;
}
