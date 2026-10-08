import {INDEX} from './palette.js';
import {antialias,outline} from './shade.js';
import {assemble} from './tiles/assemble.js';
import {JADE_TILES} from './tiles/jade-production.js';
import {JADE_MAP} from './maps/jade.js';
export function buildJadeRelit({width=150,height=108,human=6}={}){
 if(width!==150||height!==108||human!==6)throw new RangeError('Jade is authored at 150x108 for a 6px person.');
 return outline(antialias(assemble(JADE_MAP,JADE_TILES,INDEX.jade,width,height)),INDEX.jade[0]);
}
