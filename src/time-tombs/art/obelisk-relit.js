import {INDEX} from './palette.js';
import {antialias, outline} from './shade.js';
import {assemble} from './tiles/assemble.js';
import {OBSIDIAN} from './tiles/obsidian.js';
import {OBELISK_MAP, OBELISK_SIZE} from './maps/obelisk.js';

// Native art has one authored size. Callers select display zoom, never stretch
// the map or enlarge its doorway. Ground contact remains paintSandDrift's job.
export function buildObeliskRelit({width = 42, height = 240, human = 7} = {}) {
  if (width !== OBELISK_SIZE.width || height !== OBELISK_SIZE.height || human !== OBELISK_SIZE.human) {
    throw new RangeError('The Obelisk map is authored at 42x240 with a 7px threshold.');
  }
  const r = assemble(OBELISK_MAP, OBSIDIAN, INDEX.obsidian, width, height);
  antialias(r);
  outline(r, INDEX.obsidian[0]);
  return r;
}
