import { PALETTE, TRANSPARENT } from "./palette.js";

export class Raster {
  constructor(width, height, fill = TRANSPARENT) {
    this.width = width; this.height = height;
    this.data = new Uint8Array(width * height).fill(fill);
  }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  set(x, y, index) { if (this.inside(x, y)) this.data[y * this.width + x] = index; }
  get(x, y) { return this.inside(x, y) ? this.data[y * this.width + x] : TRANSPARENT; }
  rect(x, y, w, h, index) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, index); }
  blit(sprite, x, y, mirror = false) {
    for (let j = 0; j < sprite.height; j++) for (let i = 0; i < sprite.width; i++) {
      const v = sprite.data[j * sprite.width + i];
      if (v !== TRANSPARENT) this.set(x + (mirror ? sprite.width - 1 - i : i), y + j, v);
    }
  }
  toRGBA() {
    const out = new Uint8ClampedArray(this.width * this.height * 4);
    for (let p = 0; p < this.data.length; p++) {
      const v = this.data[p];
      if (v === TRANSPARENT) continue;
      const [r, g, b] = PALETTE[v];
      out[p * 4] = r; out[p * 4 + 1] = g; out[p * 4 + 2] = b; out[p * 4 + 3] = 255;
    }
    return out;
  }
}

// Text-grid sprites: rows of characters, legend maps char -> palette index.
export function fromMask(rows, legend) {
  const width = Math.max(...rows.map((r) => r.length));
  const sprite = new Raster(width, rows.length);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== "." && ch !== " " && legend[ch] !== undefined) sprite.set(x, y, legend[ch]);
  }));
  return sprite;
}

const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
// Ordered dither between two ramp entries. t in [0,1] picks how much of `b`.
export function dither(x, y, t) { return BAYER[y & 3][x & 3] / 16 < t; }

// Small deterministic PRNG so every tile and chip is reproducible.
export function prng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
