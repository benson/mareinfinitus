import {INDEX} from './palette.js';
import {antialias,outline} from './shade.js';
import {assemble} from './tiles/assemble.js';
import {PALACE} from './tiles/palace.js';
import {PALACE_MAP} from './maps/palace.js';
export function buildPalaceRelit({width=200,height=240,human=5}={}){
 if(width!==200||height!==240||human!==5)throw new RangeError('Palace is authored at 200x240 for a 5px person.');
 return outline(antialias(assemble(PALACE_MAP,PALACE,INDEX.obsidian,width,height)),INDEX.obsidian[0]);
}
