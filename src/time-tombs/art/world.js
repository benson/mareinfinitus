import {Raster} from './raster.js';
import {INDEX as I} from './palette.js';
import {TOMB_BUILDERS} from './tombs.js';
import {PILGRIM_FRAMES} from './pilgrims.js';
import {WORLD} from '../space.js';
import {shadowPadding} from '../lighting.js';
import {buildTombLight,buildShrike,buildWindstone} from './details.js';
import {buildSkimmer} from './skimmer.js';
import {SMOKE_FRAMES,FOOTPRINT} from './effects.js';
import {buildSky,buildGround,buildRidges,buildCloud,buildSun,buildMoon,buildShadow,buildTent,buildFire,buildInstrument,buildSupplies} from './environment.js';
import {PLACEMENTS,PROP_PLACEMENTS,STONE_PLACEMENTS,assetFor} from '../entities.js';
import {sunlightAt} from '../lighting.js';
import {actorOrigin,spriteOrigin} from '../transforms.js';
import {createExpedition,updateExpedition} from '../simulation.js';
import {elevationAt} from '../surface.js';
import {instrumentAt} from '../atmosphere.js';
import {splitDepthParts} from './geometry.js';
export {PLACEMENTS,PROP_PLACEMENTS,STONE_PLACEMENTS};
export function buildArt() {
  const art=new Map();
  art.set('sky',buildSky());art.set('ground',buildGround());art.set('ridges',buildRidges());art.set('cloud',buildCloud());art.set('cloud-alt',buildCloud(1));art.set('moon',buildMoon());
  for(const [key,build] of Object.entries(TOMB_BUILDERS)){const r=build();art.set(key,r);art.set(key+'-shadow',buildShadow(r,undefined,key));for(let f=0;f<(key==='crystal'?64:1);f++)art.set(key+'-light-'+f,buildTombLight(key,r,f));}
  for(let f=0;f<4;f++) {art.set('fire-'+f,buildFire(f));art.set('instrument0-'+f,buildInstrument(f));art.set('instrument1-'+f,buildInstrument(f,1));}
  for(let f=0;f<4;f++){art.set('tent-'+f,buildTent(f));art.set('tent-alt-'+f,buildTent(f,1));art.set('supplies-'+f,buildSupplies());}
  art.set('shrike',buildShrike());
  SMOKE_FRAMES.forEach((r,f)=>art.set('smoke-'+f,r));art.set('footprint',FOOTPRINT);
  for(let f=0;f<4;f++)art.set('skimmer-'+f,buildSkimmer(f));
  for(let v=0;v<3;v++)art.set('windstone-'+v,buildWindstone(v));
  for(const p of PROP_PLACEMENTS.filter(p=>p.key!=='fire'))art.set(p.key+'-shadow',buildShadow(art.get(p.key+'-0'),undefined,p.key));
  for(let f=0;f<2;f++)art.set('sun-'+f,buildSun(f));
  PILGRIM_FRAMES.forEach((frames,i)=>frames.forEach((r,f)=>art.set(`pilgrim-${i}-${f}`,r)));
  // Partition authored parts without changing a single color or pixel.
  for(const p of PLACEMENTS){
    splitDepthParts(art.get(p.key),p.key).forEach((r,i)=>art.set(p.key+'-part-'+i,r));
    for(let f=0;f<(p.key==='crystal'?64:1);f++)splitDepthParts(art.get(p.key+'-light-'+f),p.key).forEach((r,i)=>art.set(p.key+'-light-'+f+'-part-'+i,r));
  }
  return art;
}
export function composeArt(time=0) {
  const a=buildArt(),r=a.get('sky').clone();
  const blit=(sprite,x,y)=>r.blit(sprite,x-WORLD.left,y-WORLD.top);
  const sun=sunlightAt(time);blit(a.get('cloud'),100,38);blit(a.get('cloud'),464,54);blit(a.get('sun-'+Math.floor(time/4)%2),sun.x,sun.y);blit(a.get('moon'),551,42);
  blit(a.get('ridges'),WORLD.left,68);blit(a.get('ground'),WORLD.left,96);
  const layers=[],expedition=createExpedition();
  for(let t=0;t<time;t+=1/60)updateExpedition(expedition,Math.min(1/60,time-t));
  for(const p of [...PLACEMENTS,...PROP_PLACEMENTS,...STONE_PLACEMENTS]){
    const f=p.key.startsWith('tent')?Math.floor(expedition.clothPhase+p.x*.03)%4:p.key==='fire'?Math.floor(time*5)%4:p.key.startsWith('instrument')?instrumentAt(time,p.x+assetFor(p.key).anchors.dial[0]).frame:0;
    const key=a.has(p.key)?p.key:p.key+'-'+f,t=a.get(key),spec=assetFor(key),origin=spriteOrigin(key,{x:p.x,y:p.base});
    if(p.key!=='fire')layers.push({r:buildShadow(t,sunlightAt(time),key,{x:p.x,y:p.base-spec.pivot[1],baseZ:elevationAt(p.x,p.base)}),x:p.x-shadowPadding(t),y:p.base-spec.pivot[1],z:-700});
    splitDepthParts(t,key).forEach((r,i)=>layers.push({r,x:origin.x,y:origin.y,z:p.base-spec.pivot[1]+spec.planes[i].row}));
  }
  for(const actor of expedition.actors){const origin=actorOrigin(actor);layers.push({r:a.get('pilgrim-'+actor.id+'-'+actor.frame),...origin,z:actor.y});}
  layers.sort((a,b)=>a.z-b.z).forEach(o=>blit(o.r,o.x,o.y));return r;
}
