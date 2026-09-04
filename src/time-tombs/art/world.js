import {TOMB_BUILDERS} from './tombs.js';
import {PILGRIM_FRAMES,RAMP_PILGRIM_FRAMES} from './pilgrims.js';
import {tinyPilgrim,STANDS,buildStageSky,buildStageRidges,buildStageGround,buildStageForeground,buildStageMoon,buildStageShadow,buildStageDrift,composeEstablishing} from './stage-study.js';
import {buildShrike,buildWindstone} from './details.js';
import {buildSkimmer} from './skimmer.js';
import {SMOKE_FRAMES,FOOTPRINT} from './effects.js';
import {buildSun} from './sky.js';
import {buildTent,buildFire,buildInstrument,buildSupplies} from './environment.js';
import {PLACEMENTS,PROP_PLACEMENTS,STONE_PLACEMENTS} from '../entities.js';
import {splitDepthParts} from './geometry.js';
export {PLACEMENTS,PROP_PLACEMENTS,STONE_PLACEMENTS};

export function buildArt(){
  const art=new Map();
  art.set('sky',buildStageSky());art.set('ridges',buildStageRidges());art.set('ground',buildStageGround());art.set('foreground',buildStageForeground());art.set('moon',buildStageMoon());
  for(const [key,build] of Object.entries(TOMB_BUILDERS)){
    const r=build();art.set(key,r);
    splitDepthParts(r,key).forEach((part,i)=>art.set(key+'-part-'+i,part));
    const stand=STANDS.find(s=>s.key===key);if(!stand)throw Error('Missing finished stand '+key);
    art.set(key+'-stage-shadow',buildStageShadow(stand));art.set(key+'-stage-drift',buildStageDrift(stand));
  }
  for(let f=0;f<4;f++){art.set('fire-'+f,buildFire(f));art.set('instrument0-'+f,buildInstrument(f));art.set('instrument1-'+f,buildInstrument(f,1));art.set('tent-'+f,buildTent(f));art.set('tent-alt-'+f,buildTent(f,1));art.set('supplies-'+f,buildSupplies());art.set('skimmer-'+f,buildSkimmer(f));}
  art.set('shrike',buildShrike());SMOKE_FRAMES.forEach((r,f)=>art.set('smoke-'+f,r));art.set('footprint',FOOTPRINT);
  for(let v=0;v<3;v++)art.set('windstone-'+v,buildWindstone(v));
  for(let f=0;f<2;f++)art.set('sun-'+f,buildSun(f));
  PILGRIM_FRAMES.forEach((frames,i)=>frames.forEach((r,f)=>{art.set(`pilgrim-${i}-${f}`,r);art.set(`pilgrim-tiny-${i}-${f}`,tinyPilgrim(i));}));
  RAMP_PILGRIM_FRAMES.forEach((frames,i)=>frames.forEach((r,f)=>art.set(`pilgrim-ramp-${i}-${f}`,r)));
  return art;
}

// The acceptance renderer is deliberately the same canonical composition used
// to author the stage. Runtime animation is layered from the same source art.
export function composeArt(time=0){return composeEstablishing(time);}
