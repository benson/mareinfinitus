// Worked examples for the 2026-09-02 review. Writes to output/time-tombs/.
//   node scripts/render-relit-studies.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {Raster, dither} from '../src/time-tombs/art/raster.js';
import {INDEX} from '../src/time-tombs/art/palette.js';
import {buildPalaceRelit} from '../src/time-tombs/art/palace-relit.js';
import {buildCrystalRelit} from '../src/time-tombs/art/crystal-relit.js';
import {buildSphinxRelit} from '../src/time-tombs/art/sphinx-relit.js';
import {buildJadeRelit} from '../src/time-tombs/art/jade-relit.js';
import {buildCavesRelit, buildCanyonWall} from '../src/time-tombs/art/caves-relit.js';
import {PILGRIM_FRAMES} from '../src/time-tombs/art/pilgrims.js';
import {PILGRIMS_RECOLORED, composeEstablishing, STAGE} from '../src/time-tombs/art/stage-study.js';

const out = path.resolve('output/time-tombs');
await fs.mkdir(out, {recursive: true});
const raw = (r) => sharp(Buffer.from(r.toRGBA()), {raw: {width: r.width, height: r.height, channels: 4}});
async function save(r, name, scale = 1, gray = false) {
  let s = raw(r).resize(r.width * scale, r.height * scale, {kernel: 'nearest'});
  if (gray) s = s.grayscale();
  await s.png().toFile(path.join(out, name + '.png'));
}
async function squint(r, name, factor = 8, view = 8) {
  const w = Math.round(r.width / factor), h = Math.round(r.height / factor);
  const small = await raw(r).resize(w, h, {kernel: 'lanczos3'}).png().toBuffer();
  await sharp(small).resize(w * view, h * view, {kernel: 'nearest'}).png().toFile(path.join(out, name + '.png'));
}
function backdrop(width, height, horizon) {
  const r = new Raster(width, height, INDEX.sky[2]);
  const sky = [INDEX.sky[2], INDEX.sky[3], INDEX.sky[4]];
  for (let y = 0; y < horizon; y++) {
    const t = (y / horizon) * (sky.length - 1), b = Math.min(sky.length - 2, Math.floor(t));
    for (let x = 0; x < width; x++) r.set(x, y, dither(x, y, t - b) ? sky[b + 1] : sky[b]);
  }
  for (let y = horizon; y < height; y++) for (let x = 0; x < width; x++) r.set(x, y, dither(x, y, (y - horizon) / (height - horizon) * 0.6) ? INDEX.sand[1] : INDEX.sand[2]);
  return r;
}
const pilgrim = PILGRIM_FRAMES[5][4];

// 1. Palace and Crystal at stage scale, each with a pilgrim, 3x and squint.
for (const [name, sprite, px] of [['palace-relit', buildPalaceRelit(), 60], ['crystal-relit', buildCrystalRelit(), 30], ['sphinx-relit', buildSphinxRelit(), 20], ['jade-relit', buildJadeRelit(), 8], ['caves-relit', buildCavesRelit(), 50], ['canyon-wall', buildCanyonWall(), 560]]) {
  const sheet = backdrop(sprite.width + 80, sprite.height + 40, Math.round(sprite.height * 0.8)), ground = sprite.height + 28;
  sheet.blit(sprite, 40, ground - sprite.height + 1);
  sheet.blit(pilgrim, 40 + px, ground - pilgrim.height + 1);
  await save(sheet, name + '-3x', 3); await save(sheet, name + '-gray', 3, true); await squint(sheet, name + '-squint', 6, 12);
}

// 2. Pilgrim color code: Sol's row above, recolored row below, 4x.
{
  const sheet = new Raster(7 * 22 + 10, 56, INDEX.sand[1]);
  PILGRIM_FRAMES.forEach((frames, i) => sheet.blit(frames[Math.min(4, frames.length - 1)], 8 + i * 22, 4));
  PILGRIMS_RECOLORED.forEach((frames, i) => sheet.blit(frames[Math.min(4, frames.length - 1)], 8 + i * 22, 32));
  await save(sheet, 'pilgrims-colorcode-4x', 4);
  await save(sheet, 'pilgrims-colorcode-gray', 4, true);
}

// 3. The establishing shot: the acceptance artifact from review section 7.
{
  const frame = composeEstablishing(2.5);
  await save(frame, 'establishing-4x-world', 4);        // the whole 1120-wide world at 4x
  // the 860-wide window the 3440x1440 ultrawide shows at any moment; set it as wallpaper to judge
  const win = new Raster(STAGE.viewport, frame.height); win.blit(frame, -140, 0);
  await save(win, 'establishing-4x-ultrawide', 4);
  await save(frame, 'establishing-3x', 3);
  await save(frame, 'establishing-native', 1);
  await save(frame, 'establishing-gray', 3, true);
  await squint(frame, 'establishing-squint', 8, 8);
}
console.log(`wrote studies to ${out} (stage ${STAGE.width}x${STAGE.height})`);
