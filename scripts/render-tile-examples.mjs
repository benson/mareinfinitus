// Tile vocabulary review sheets for the Part 2 method. One sheet per material:
// every tile in a strip at the top, the assembled demo below, at 6x.
//   node scripts/render-tile-examples.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {INDEX} from '../src/time-tombs/art/palette.js';
import {Raster} from '../src/time-tombs/art/raster.js';
import {assemble, sheet} from '../src/time-tombs/art/tiles/assemble.js';
import {STONE, stoneDemo} from '../src/time-tombs/art/tiles/stone.js';
import {OBSIDIAN, obsidianDemo} from '../src/time-tombs/art/tiles/obsidian.js';
import {JADE, jadeDemo} from '../src/time-tombs/art/tiles/jade.js';
import {WALL, wallDemo} from '../src/time-tombs/art/tiles/wall.js';
import {THORN, thornDemo} from '../src/time-tombs/art/tiles/thorn.js';
import {CRYSTAL, crystalDemo} from '../src/time-tombs/art/tiles/crystal.js';

const out = path.resolve('output/time-tombs/tiles');
await fs.mkdir(out, {recursive: true});
const raw = (r) => sharp(Buffer.from(r.toRGBA()), {raw: {width: r.width, height: r.height, channels: 4}});
async function save(r, name, scale) {
  await raw(r).flatten({background: {r: 36, g: 0, b: 73}}).resize(r.width * scale, r.height * scale, {kernel: 'nearest'}).png().toFile(path.join(out, name + '.png'));
}

const SETS = [
  ['stone', STONE, INDEX.stone, stoneDemo(), 96, 64],
  ['obsidian', OBSIDIAN, INDEX.obsidian, obsidianDemo(), 32, 104],
  ['jade', JADE, INDEX.jade, jadeDemo(), 64, 56],
  ['wall', WALL, INDEX.sand, wallDemo(), 96, 64],
  ['thorn', THORN, INDEX.obsidian, thornDemo(), 64, 88],
  ['crystal', CRYSTAL, INDEX.crystal, crystalDemo(), 48, 72]
];
const sheets = [];
for (const [name, vocab, ramp, demo, w, h] of SETS) {
  const bg = new Raster(w, h, INDEX.sky[1]);
  bg.blit(assemble(demo, vocab, ramp, w, h), 0, 0);
  const s = sheet(vocab, ramp, bg);
  await save(s, name + '-6x', 6);
  sheets.push(s);
}
// one combined sheet at 3x
const W = Math.max(...sheets.map((s) => s.width)), H = sheets.reduce((h, s) => h + s.height + 6, 6);
const all = new Raster(W + 12, H, INDEX.sky[0]);
let y = 6;
for (const s of sheets) { all.blit(s, 6, y); y += s.height + 6; }
await save(all, 'all-3x', 3);
console.log('wrote tile sheets to', out);
