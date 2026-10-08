// Production vocabulary at 6x, each tile beside a native Castlevania crop.
// This is a review artifact, not an automated visual acceptance gate.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {OBSIDIAN} from '../src/time-tombs/art/tiles/obsidian.js';
import {OBELISK_MAP} from '../src/time-tombs/art/maps/obelisk.js';
import {assemble} from '../src/time-tombs/art/tiles/assemble.js';
import {INDEX} from '../src/time-tombs/art/palette.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'output/time-tombs/compare');
await fs.mkdir(out, {recursive: true});
const reference = path.join(root, 'docs/art-direction/reference/genesis/castlevania-bloodlines.png');
const names = [...new Set(OBELISK_MAP.map(p => p.name))];
const cellW = 244, cellH = 194, cols = 4;
const layers = [];
for (const [i, name] of names.entries()) {
  const t = OBSIDIAN[name];
  const placement = OBELISK_MAP.find(p => p.name === name);
  const r = assemble([{name, x: 0, y: 0, shift: placement.shift}], OBSIDIAN, INDEX.obsidian, t.w, t.h);
  // Roof, arcade, base, and carved lower facade are separate drawn vocabularies
  // in the screenshot. Crop only; one source pixel remains one logical pixel.
  const crop = name.startsWith('crown') ? {left: 22, top: 57, width: 16, height: 16}
    : name.startsWith('seat') ? {left: 35, top: 177, width: 16, height: 16}
    : name === 'threshold7' || name === 'inscription' ? {left: 4, top: 111, width: 16, height: 24}
    : {left: 5, top: 162, width: 16, height: 16};
  const ref = await sharp(reference).extract(crop).resize(crop.width * 6, crop.height * 6, {kernel: 'nearest'}).png().toBuffer();
  const tile = await sharp(Buffer.from(r.toRGBA()), {raw: {width: t.w, height: t.h, channels: 4}})
    .resize(t.w * 6, t.h * 6, {kernel: 'nearest'}).png().toBuffer();
  const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
  const label = Buffer.from(`<svg width="244" height="36"><g font-family="sans-serif" font-size="12" fill="#b6b6db"><text x="8" y="15">${name} · shift ${placement.shift ?? 0}</text><text x="8" y="31">Reference</text><text x="124" y="31">Tile</text></g></svg>`);
  layers.push({input: label, left: x, top: y}, {input: ref, left: x + 8, top: y + 40}, {input: tile, left: x + 124, top: y + 40});
}
const output = path.join(out, 'obelisk-tiles-6x.png');
await sharp({create: {width: cols * cellW, height: Math.ceil(names.length / cols) * cellH, channels: 4, background: '#09051c'}})
  .composite(layers).png().toFile(output);
console.log(`${names.length} production tiles: ${output}`);
