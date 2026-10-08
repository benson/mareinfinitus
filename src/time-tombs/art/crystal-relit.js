import {INDEX} from './palette.js';
import {antialias,outline} from './shade.js';
import {assemble} from './tiles/assemble.js';
import {CRYSTAL_TILES} from './tiles/crystal-production.js';
import {CRYSTAL_MAP} from './maps/crystal.js';
export function buildCrystalRelit({width=70,height=228}={}){
 if(width!==70||height!==228)throw new RangeError('Crystal is authored at 70x228.');
 return outline(antialias(assemble(CRYSTAL_MAP,CRYSTAL_TILES,INDEX.crystal,width,height)),INDEX.crystal[0]);
}
