import {Raster,dither} from '../art/raster.js';
import {PALETTE,TRANSPARENT} from '../art/palette.js';
import {stamp,assemble,highlightRaster,cycleFrames} from '../art/tiles/assemble.js';
import {PILGRIM_FRAMES,RAMP_PILGRIM_FRAMES} from '../art/pilgrims.js';
import {CAMP} from '../art/tiles/camp.js';
import {buildFire,buildSupplies,buildInstrument} from '../art/environment.js';
import {C,R} from './palette.js';
import {DAWN_WORLD,MONUMENTS,PROPS} from './layout.js';
import {TERRAIN} from './tiles/terrain.js';
import {MONUMENT_MAPS} from './maps/monuments.js';
import {FAR_MAP,SHELF_MAP,FLOOR_MAP,CAMP_MAP,NEAR_MAP} from './maps/landscape.js';
import {monumentShadow,contacts} from './shadows.js';
import {FABRIC} from './tiles/fabric.js';
export const DAWN_LAYERS=[['sky',.05],['far',.35],['shelf',.7],['floor',.9],['camp',1],['near',1.2]];
function layer(map){const r=new Raster(DAWN_WORLD.width,DAWN_WORLD.height);for(const p of map)stamp(r,TERRAIN[p.name],p.x,p.y,R[p.ramp],p.shift,{flipX:p.flipX});return r;}
function tiny(id,frame){
 const r=new Raster(3,7),garment=[C.clay,C.cream,C.ochre,C.deep,C.ink,C.cold,C.jade][id];
 r.set(1,0,C.ochre);r.set(1,1,C.sand);r.rect(0,2,3,3,garment);
 r.set(frame%2?1:0,5,C.deep);r.set(frame%2?1:2,6,C.deep);return r;
}
export function buildPorcelainArt(){
 const art=new Map(),w=DAWN_WORLD.width,h=DAWN_WORLD.height;
 const sky=new Raster(w,h,C.sky);
 for(let y=0;y<32;y++)for(let x=0;x<w;x++)sky.set(x,y,dither(x,y,y/160)?C.skyLight:C.sky);
 art.set('sky',sky);
 const ground=new Raster(w,h);
 for(let y=31;y<h;y+=16)for(let x=0;x<w;x+=16)stamp(ground,TERRAIN.quiet,x,y,y<95?R.distance:R.terrace,0);
 // Selected surface patches preserve large quiet areas; no independent noise.
 for(const [x,y]of [[314,179],[338,177],[377,195],[602,175],[627,178],[455,237],[621,248],[398,268],[716,273],[583,250],[896,238],[799,116]])stamp(ground,TERRAIN.pavingA,x,y,R.floor,0);
 art.set('ground',ground);
 for(const name of ['smoke','dust']){const tile=TERRAIN[name],r=new Raster(tile.w,tile.h);stamp(r,tile,0,0,R.far,-1);art.set(name,r);}
 for(const name of ['track','trackFar']){const t=TERRAIN[name],r=new Raster(t.w,t.h);stamp(r,t,0,0,R.floor,1);art.set(name,r);}
 for(const [key,map]of [['far',FAR_MAP],['shelf',SHELF_MAP],['floor',FLOOR_MAP],['camp',CAMP_MAP],['near',NEAR_MAP]])art.set(key,layer(map));
 for(const s of MONUMENTS){
  const {map,vocab}=MONUMENT_MAPS[s.key],r=assemble(map,vocab,R[s.ramp],s.width,s.height);
  art.set(s.key,r);art.set(s.key+'-hover',highlightRaster(r,[R[s.ramp].slice(0,6)]));
  art.set(s.key+'-shadow',monumentShadow(r,s.key).raster);
  const drift=new Raster(s.width+16,s.height+10),feet=new Map(contacts(r,s.key));
  for(let x=0;x<s.width;x+=8){const foot=feet.get(x)??feet.get(x+2)??feet.get(x+4);if(foot!==undefined)stamp(drift,TERRAIN.sandDrift,x,foot-2,R[s.factor<.5?'far':'terrace'],0);}
  art.set(s.key+'-drift',drift);
 }
 for(let f=0;f<4;f++){
  const pavilion=new Raster(68,57);
  stamp(pavilion,FABRIC.pole,32,0,R.obsidian);
  for(const [name,x,y,shift,flipX]of [['slope',16,7,0,false],['slope',32,7,-1,true],['slope',0,23,0,false],['panel',16,23,0,false],['panel',32,23,-1,true],['slope',48,23,-2,true],['skirt',0,39,0,false],['skirt',16,39,0,false],['skirt',32,39,-1,true],['skirt',48,39,-2,true]])stamp(pavilion,FABRIC[name],x,y,R.canvas,shift,{flipX});
  stamp(pavilion,FABRIC.door,29+[0,1,1,0][f],40,R.canvas,-1);stamp(pavilion,FABRIC.patch,14,40,R.canvas,-1);
  stamp(pavilion,CAMP.rope,0,49,R.obsidian,0,{flipX:true});stamp(pavilion,CAMP.rope,64,49,R.obsidian);
  art.set('pavilion-'+f,pavilion);
  for(let v=0;v<2;v++){
   const ramp=v?R.stone:R.canvas,r=assemble([{name:'roof',x:16,y:0,shift:-1},{name:'front',x:0,y:1},{name:'flap',x:9+[0,1,2,1][f],y:11}],CAMP,ramp,36,25);
   stamp(r,CAMP.rope,0,19,R.obsidian,0,{flipX:true});stamp(r,CAMP.rope,32,19,R.obsidian,0);art.set('tent-'+v+'-'+f,r);
  }
  art.set('fire-'+f,buildFire(f));art.set('instrument-'+f,buildInstrument(f));art.set('supplies-'+f,buildSupplies());
 }
 for(let id=0;id<7;id++)for(let f=0;f<PILGRIM_FRAMES[id].length;f++){
  art.set('person-'+id+'-'+f,PILGRIM_FRAMES[id][f]);art.set('ramp-'+id+'-'+f,RAMP_PILGRIM_FRAMES[id][f]);art.set('tiny-'+id+'-'+f,tiny(id,f));
 }
 return art;
}
export function composePorcelain(time=0){
 const art=buildPorcelainArt(),r=art.get('sky').clone();
 r.blit(art.get('ground'),0,0);r.blit(art.get('far'),0,0);r.blit(art.get('shelf'),0,0);r.blit(art.get('floor'),0,0);
 for(const s of MONUMENTS){r.blit(art.get(s.key+'-shadow'),s.x-monumentShadow(art.get(s.key),s.key).pad,s.y);r.blit(art.get(s.key),s.x,s.y);r.blit(art.get(s.key+'-drift'),s.x-8,s.y);}
 r.blit(art.get('camp'),0,0);
 for(const p of PROPS){const key=p.key==='tent'?'tent-'+p.variant+'-0':p.key+'-0';r.blit(art.get(key),p.x,p.y);}
 const slots=[[528,326],[550,332],[570,339],[592,325],[607,341],[565,318],[621,345]];
 for(let id=0;id<7;id++){const [x,y]=slots[id];r.blit(art.get('person-'+id+'-4'),x-6,y-18);}
 r.blit(art.get('near'),0,0);return r;
}
