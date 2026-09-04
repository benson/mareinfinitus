// Before/after study for the 2026-09-02 review. Writes to output/time-tombs/.
//   node scripts/render-obelisk-relit.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {TOMB_BUILDERS} from '../src/time-tombs/art/tombs.js';
import {buildObeliskRelit} from '../src/time-tombs/art/obelisk-relit.js';
import {PILGRIM_FRAMES} from '../src/time-tombs/art/pilgrims.js';
import {Raster, dither} from '../src/time-tombs/art/raster.js';
import {INDEX} from '../src/time-tombs/art/palette.js';

const out = path.resolve('output/time-tombs');
await fs.mkdir(out, {recursive: true});

async function save(r, name, scale = 1, gray = false) {
  let s = sharp(Buffer.from(r.toRGBA()), {raw: {width: r.width, height: r.height, channels: 4}})
    .resize(r.width * scale, r.height * scale, {kernel: 'nearest'});
  if (gray) s = s.grayscale();
  await s.png().toFile(path.join(out, name + '.png'));
}
// Squint test: shrink to 1/8 with a real filter, then enlarge so it is viewable.
async function squint(r, name) {
  const small = await sharp(Buffer.from(r.toRGBA()), {raw: {width: r.width, height: r.height, channels: 4}})
    .resize(Math.round(r.width / 8), Math.round(r.height / 8), {kernel: 'lanczos3'}).png().toBuffer();
  await sharp(small).resize(Math.round(r.width / 8) * 6, Math.round(r.height / 8) * 6, {kernel: 'nearest'}).png().toFile(path.join(out, name + '.png'));
}

// Dusk backdrop: dithered sky down to a warm horizon, banded ground below.
function backdrop(width, height, horizon) {
  const r = new Raster(width, height, INDEX.sky[2]);
  const sky = [INDEX.sky[2], INDEX.sky[3], INDEX.sky[4]];
  for (let y = 0; y < horizon; y++) {
    const t = (y / horizon) * (sky.length - 1), b = Math.min(sky.length - 2, Math.floor(t));
    for (let x = 0; x < width; x++) r.set(x, y, dither(x, y, t - b) ? sky[b + 1] : sky[b]);
  }
  for (let y = horizon; y < height; y++) {
    const t = (y - horizon) / (height - horizon);
    for (let x = 0; x < width; x++) r.set(x, y, dither(x, y, t * 0.6) ? INDEX.sand[1] : INDEX.sand[2]);
  }
  return r;
}

const pilgrim = PILGRIM_FRAMES[5][4];
const before = TOMB_BUILDERS.obelisk();
const after = buildObeliskRelit({width: before.width, height: before.height});

// 1. Same size, side by side, at native resolution.
{
  const pad = 40, ground = before.height + 30;
  const sheet = backdrop(before.width * 2 + pad * 3, before.height + 60, Math.round(before.height * 0.55));
  for (const [i, tomb] of [before, after].entries()) {
    const x = pad + i * (before.width + pad), y = ground - tomb.height;
    sheet.blit(tomb, x, y);
    sheet.blit(pilgrim, x + Math.round(tomb.width * 0.5) - 8, ground - pilgrim.height);
  }
  await save(sheet, 'obelisk-relit-native');
  await save(sheet, 'obelisk-relit-gray', 1, true);
  await squint(sheet, 'obelisk-relit-squint');
}

// 2. Recommended stage scale: about 42x240 against the same 20px pilgrim, at 3x.
{
  const small = buildObeliskRelit({width: 42, height: 240});
  const sheet = backdrop(200, 270, 150);
  const ground = 258;
  sheet.blit(small, 80, ground - small.height);
  sheet.blit(pilgrim, 96, ground - pilgrim.height);
  sheet.blit(pilgrim, 140, ground - pilgrim.height + 3);
  await save(sheet, 'obelisk-relit-stage-3x', 3);
  await save(sheet, 'obelisk-relit-stage-gray', 3, true);
}
console.log('wrote obelisk-relit-* to', out);
