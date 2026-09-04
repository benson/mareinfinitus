import {INDEX as I} from './palette.js';
import {Raster,fromMask} from './raster.js';
import {WORLD} from '../space.js';
import {patternAt} from './material-patterns.js';
import {buildTerrain} from './terrain.js';
import {TERRACES,terraceColumns} from '../landforms.js';
import {entityAnchor} from '../entities.js';
export const WORLD_SIZE=WORLD;
export {buildShadow} from './shadows.js';
export {buildSky,buildRidges,buildCloud,buildSun,buildMoon} from './sky.js';
function path(r,points) {
  for(let p=0;p<points.length-1;p++) {
    const a=points[p],b=points[p+1],length=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));
    for(let i=0;i<=length;i++) {
      const x=Math.round(a[0]+(b[0]-a[0])*i/length),y=Math.round(a[1]+(b[1]-a[1])*i/length)-96;
      const worn=patternAt('path-'+a.join('-'),Math.floor(i/17));
      const half=(y>115?3:1)+(worn.kind==='echo'?1:0);
      for(let dy=-half;dy<=half;dy++)for(let dx=-half;dx<=half;dx++) {
        const edge=Math.max(Math.abs(dx),Math.abs(dy))===half;
        // Foot traffic clears gravel; only compacted patches catch the light.
        const gleam=!edge&&i%17>3&&i%17<12&&worn.kind!=='run';
        r.set(x+dx-WORLD.left,y+dy,I.sand[gleam?2:1]);
      }
    }
  }
}
function terrace(r,spec) {
  for(const c of terraceColumns(spec)){
    const {x,height,shelf}=c,y=c.y-WORLD.groundTop;
    r.set(x-WORLD.left,y,I.sand[2]);
    for(let dy=1;dy<=height;dy++)r.set(x-WORLD.left,y+dy,dy>height-2?I.sand[0]:dy<2+shelf?I.sand[2]:I.sand[1]);
  }
}
export function buildGround() {
  const r=buildTerrain();
  path(r,[[142,270],[222,246],[294,222],[358,211],[407,192],[454,210],[545,235],[657,251]]);
  path(r,[[294,222],[233,191],[215,177]]);path(r,[[657,251],[652,190],[650,166]]);
  TERRACES.forEach(t=>terrace(r,t));
  path(r,[[142,270],[106,305],[184,360],[168,425],[268,520],[202,660],[290,768]]);
  // Approaches now traverse the enlarged valley, outside the monuments' feet.
  // These are worn patches, not lines painted on top of the architecture.
  const approach=uid=>{const p=entityAnchor(uid,'approach');return [p.x,p.y];};
  path(r,[approach('sphinx'),[70,405],[220,405],[430,410],[650,430],[850,310],[1070,450],[1100,590],[1390,602],[1470,492],[1800,480],[2020,350],approach('palace')]);
  path(r,[[294,265],[320,333],[430,410],approach('jade')]);
  path(r,[[850,310],approach('obelisk')]);path(r,[[1220,592],approach('crystal')]);
  path(r,[[1560,456],approach('caves')]);
  return r;
}
export function buildTent(frame=0,variant=0) {
  const r=new Raster(36,25),c=variant?I.linen:I.cloth,sway=[0,1,2,1][frame%4];
  // A front entrance and a receding roof share their ridge/corner vertices.
  r.shape([[12,3],[20,0],[34,19],[26,23]],()=>c[1]);
  r.shape([[2,23],[12,3],[26,23]],()=>c[2]);
  r.line(12,3,20,0,c[3]);r.line(12,3,3,21,c[3]);
  r.shape([[14,7],[20,11],[30,20],[26,22],[21,17]],()=>c[0]);
  r.shape([[10,8],[8,18],[4,22],[8,14]],()=>c[1]);
  r.line(19,5,27,15,c[2]);r.line(23,9,30,17,c[2]);
  r.line(8,11,7,19,c[3]);
  // Cloth bows between fixed seams; repairs move with that panel, not in space.
  r.line(13,9,19,12+sway%2,c[2]);r.line(19,12+sway%2,27,16,c[2]);
  const repair=patternAt('tent-repair',variant),patchX=5+repair.value%3,patchY=17;
  r.rect(patchX,patchY,3,3,c[1]);r.set(patchX,patchY,c[3]);r.set(patchX+2,patchY+2,c[3]);
  for(const [x,y] of [[17,7],[20,11],[25,16]])r.set(x,y,c[3]);
  r.shape([[12,10],[10-sway,23],[19,23]],()=>c[0]);
  r.line(12,11,17+sway,22,c[3]);
  r.line(3,22,8,22-sway%2,c[3]);r.line(20,22,25,22,c[1]);
  if(variant){r.line(20,0,25,1+sway%2,c[3]);r.set(25,2+sway%2,c[2]);r.rect(21,20,4,2,c[1]);}
  r.line(4,18,0,24,I.accent[1]);r.line(31,16,35,24,I.accent[1]);return r;
}
export function buildSupplies(){
  const r=new Raster(23,12),c=I.cloth;
  // Rolled bedding: cylindrical highlight, spiral end and two tight straps.
  r.blit(fromMask(['..aaaaaa...','.abbbbbbaa.','abccccccbba','abccabccaba','.abcabccba.','..aaaaaa...'],{a:c[0],b:c[2],c:c[1]}),0,4);
  r.line(3,5,7,5,c[3]);r.line(5,5,5,8,c[0]);r.set(5,7,I.accent[1]);
  // Bevelled travel case, hinged lid, latch and a folded carry handle.
  r.shape([[15,2],[19,1],[21,3],[21,10],[14,10],[14,4]],(x,y)=>I.stone[x>19?0:y<4?3:1]);
  r.line(15,4,19,4,I.stone[0]);r.line(15,5,15,8,I.stone[2]);
  r.line(17,1,19,1,I.accent[1]);r.set(18,5,I.accent[1]);
  r.blit(fromMask(['.aaa.','abcba','abb.a','.aa..'],{a:I.uniform[1],b:I.uniform[2],c:I.obsidian[0]}),10,8);return r;
}
export function buildFire(frame=0) {
  const rows=[['...a...','..aba..','..bcb..','.abcba.','.abcb..','..bb...','..aa...'],['.......','....a..','..aba..','..bcb..','.abcba.','.abbba.','..aaa..'],['.......','..a....','..ba...','.abca..','.abcb..','..bba..','..aaa..'],['...a...','...b...','..aba..','..bcb..','.abcba.','..bba..','..aaa..']][frame];
  const r=new Raster(9,10);r.blit(fromMask(rows,{a:I.fire[0],b:I.fire[1],c:I.fire[3]}),1,0);r.line(1,8,7,9,I.stone[1]);r.line(1,9,7,8,I.stone[2]);return r;
}
export function buildInstrument(frame=0,variant=0) {
  const r=new Raster(15,24),body=I.obsidian[1],edge=I.uniform[1],brass=I.accent[1];
  r.rect(6,4,3,15,body);r.rect(6,17,3,3,edge);r.rect(3,8,9,2,brass);
  r.line(4,19,7,12,edge);r.line(10,19,7,12,edge);r.rect(6,2,3,2,brass);
  if(variant%2){r.line(3,8,4,3,edge);r.line(11,8,10,3,edge);r.rect(5,3,5,1,brass);}
  // Recessed dial, metal rim and a shaded swivel collar above the tripod.
  r.blit(fromMask(['..aaa..','.abbba.','abcccba','abcccba','.abcba.','..aaa..'],{a:edge,b:brass,c:I.obsidian[0]}),4,9);
  r.line(6,16,8,16,edge);r.set(7,17,brass);
  const needle=[[7,13],[6,12],[7,11],[8,12]][frame];r.line(7,13,...needle,I.linen[2]);
  r.set(9,15,frame===1||frame===2?I.anomaly[0]:brass);
  // Three feet sit at different depths; bright left edges describe metal legs,
  // not a large triangular flat plate beneath the dial.
  r.line(7,17,7,21,body);r.set(7,21,brass);
  r.line(6,19,2,23,body);r.line(5,20,2,22,edge);
  r.line(8,19,12,23,body);r.line(9,20,11,22,edge);
  r.set(2,23,brass);r.set(12,23,brass);return r;
}
