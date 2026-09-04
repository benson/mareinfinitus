import {Raster} from '../raster.js';
import {INDEX, TRANSPARENT} from '../palette.js';

// Tiles are text masks whose characters are ramp STEPS, not colors. The same
// tile serves a lit face, a shadow face and a top plane through `shift`, which
// is how Genesis artists palette-swapped one tile across a facade.
//
//   ' ' transparent   '#' 0   '=' 1   '-' 2   '.' 3   '+' 4   '*' 5   '@' 6
export const STEP = {'#': 0, '=': 1, '-': 2, '.': 3, '+': 4, '*': 5, '@': 6};

export function tile(rows) {
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const steps = new Int8Array(w * h).fill(-1);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === ' ') return;
    if (!(ch in STEP)) throw new Error(`bad tile char '${ch}' at ${x},${y}`);
    steps[y * w + x] = STEP[ch];
  }));
  return {w, h, steps};
}

// Stamp one tile into a raster using a ramp, a step shift, and optional flips.
// Shift is the Genesis palette-line swap; flip is the hardware H/V flip bit.
// Both give variants for free, which is where a small tile budget gets its variety.
export function stamp(r, t, x0, y0, ramp, shift = 0, {flipX = false, flipY = false} = {}) {
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
    const s = t.steps[y * t.w + x];
    if (s < 0) continue;
    const dx = flipX ? t.w - 1 - x : x, dy = flipY ? t.h - 1 - y : y;
    r.set(x0 + dx, y0 + dy, ramp[Math.max(0, Math.min(ramp.length - 1, s + shift))]);
  }
}

// A map is a list of placements: {name, x, y, shift, flipX, flipY}. Order is
// draw order. Maps are data: a monument is its vocabulary plus this list.
export function assemble(placements, vocab, ramp, width, height) {
  const r = new Raster(width, height);
  for (const p of placements) {
    const t = vocab[p.name];
    if (!t) throw new Error(`unknown tile ${p.name}`);
    stamp(r, t, p.x, p.y, ramp, p.shift ?? 0, {flipX: !!p.flipX, flipY: !!p.flipY});
  }
  return r;
}

// Palette cycling: the era animated glows, water and fire by rotating a few
// palette entries, not by drawing frames. Given a raster and the ramp indices
// that should cycle, return `frames` copies with those indices rotated.
export function cycleFrames(r, cycling, frames) {
  const out = [];
  for (let f = 0; f < frames; f++) {
    const c = r.clone();
    const map = new Map(cycling.map((idx, i) => [idx, cycling[(i + f) % cycling.length]]));
    c.data.forEach((v, i) => { if (map.has(v)) c.data[i] = map.get(v); });
    out.push(c);
  }
  return out;
}

// Hover highlight the Genesis way: the same tiles one palette step brighter.
export function highlightRaster(r, ramps) {
  const c = r.clone();
  const up = new Map();
  for (const ramp of ramps) ramp.forEach((idx, i) => up.set(idx, ramp[Math.min(ramp.length - 1, i + 1)]));
  c.data.forEach((v, i) => { if (up.has(v)) c.data[i] = up.get(v); });
  return c;
}

// Fill a rectangle with a course tile, cycling variants by column so no two
// neighbours repeat. `variants` is a list of tile names of equal size.
export function course(placements, variants, x0, y0, cols, rows, shiftFor = () => 0, phase = 0) {
  const t = (name) => name;
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const name = variants[(col + row * 2 + phase) % variants.length];
    placements.push({name: t(name), x: x0 + col * 16, y: y0 + row * 16, shift: shiftFor(col, row)});
  }
  return placements;
}

// Review sheet: every tile of a vocabulary in a strip, then the demo below.
export function sheet(vocab, ramp, demo, {gap = 4, bg = INDEX.sky[1]} = {}) {
  const names = Object.keys(vocab);
  const stripH = Math.max(...names.map((n) => vocab[n].h)) + gap * 2;
  const stripW = names.reduce((w, n) => w + vocab[n].w + gap, gap);
  const width = Math.max(stripW, demo.width + gap * 2), height = stripH + demo.height + gap * 3;
  const r = new Raster(width, height, bg);
  let x = gap;
  for (const n of names) { stamp(r, vocab[n], x, gap, ramp, 0); x += vocab[n].w + gap; }
  r.blit(demo, gap, stripH + gap);
  return r;
}
export {TRANSPARENT};
