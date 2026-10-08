import {INDEX} from './palette.js';
import {antialias,outline} from './shade.js';
import {assemble} from './tiles/assemble.js';
import {CANYON} from './tiles/canyon.js';
import {CANYON_MAP} from './maps/canyon.js';
// Smaller legacy study windows crop the same native vocabulary, never scale it.
export function buildCanyonWall({width=1120,height=124,human=5}={}){
 if(height!==124||human!==5)throw new RangeError('Canyon is authored at height 124 for a 5px person.');
 return outline(antialias(assemble(CANYON_MAP,CANYON,INDEX.sand,width,height)),INDEX.sand[0]);
}
export function buildCavesRelit(){
 return outline(antialias(assemble(CANYON_MAP.filter(p=>p.x>=720&&p.x<1050).map(p=>({...p,x:p.x-720,y:p.y-40})),CANYON,INDEX.sand,330,84)),INDEX.sand[0]);
}
