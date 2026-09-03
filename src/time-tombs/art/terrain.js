import {Raster,dither,fromMask} from './raster.js';
import {INDEX as I} from './palette.js';
import {WORLD} from '../space.js';
import {patternAt} from './material-patterns.js';
import {buildDune,DUNE_PLACEMENTS} from './dunes.js';
import {DRIFTS,ROCK_SHELVES,driftSection} from '../landforms.js';
export {DRIFTS};

// Composition first. These are connected landforms, not a tile of decorations.
// Gaps deliberately preserve smooth sand around the camp and walking figures.
export const GRAVEL_PATCHES=[
  {x:179,y:204,w:29,h:11,count:17}, {x:319,y:177,w:21,h:9,count:12},
  {x:631,y:186,w:43,h:13,count:22}, {x:362,y:293,w:34,h:16,count:21},
  {x:-118,y:254,w:49,h:19,count:22}, {x:825,y:227,w:42,h:16,count:21},
  {x:563,y:411,w:55,h:23,count:30}, {x:42,y:614,w:56,h:22,count:24},
  {x:1003,y:546,w:59,h:25,count:31}, {x:311,y:712,w:47,h:18,count:25}
];
// Long crescent deposits: center, span, rise, lee thickness. Their ends taper
// into the bare ground; no flat rectangular aprons around monument bases.
const CRUST_PATCHES=[{x:11,y:241,w:34,h:13},{x:561,y:249,w:39,h:16},{x:274,y:302,w:29,h:12},{x:760,y:351,w:52,h:19},{x:168,y:572,w:65,h:23}];
export const TERRAIN_REGIONS={dunes:DUNE_PLACEMENTS,gravel:GRAVEL_PATCHES,drifts:DRIFTS,crust:CRUST_PATCHES,rock:ROCK_SHELVES};
const PEBBLES=[
  ['aa.','bbc'], ['.aa.','abbc','.cc.'], ['..aa.','.abbc','bbccc'],
  ['.aa...','abbaa.','bbcbcc','..cc..'], ['..aaa.','.abbbc','bbcccc'],
  ['..a..','.abb.','bbccc','..cc.']
].map(rows=>fromMask(rows,{a:I.sand[2],b:I.sand[0],c:I.sand[1]}));

export function buildTerrain(bounds={x:WORLD.left,y:WORLD.groundTop,width:WORLD.width,height:WORLD.top+WORLD.height-WORLD.groundTop}){
  const r=new Raster(bounds.width,bounds.height,I.sand[1]);
  const dot=(x,y,c)=>r.set(Math.round(x)-bounds.x,Math.round(y)-bounds.y,c);
  const line=(x,y,xx,yy,c)=>r.line(Math.round(x)-bounds.x,Math.round(y)-bounds.y,Math.round(xx)-bounds.x,Math.round(yy)-bounds.y,c);
  const shape=(points,material)=>r.shape(points.map(([x,y])=>[Math.round(x)-bounds.x,Math.round(y)-bounds.y]),(x,y)=>material(x+bounds.x,y+bounds.y));
  // One broad atmospheric transition, shaped in world space. No 16px rows.
  for(let x=bounds.x;x<bounds.x+bounds.width;x++){
    const edge=127+Math.sin(x/137)*7+Math.sin(x/39)*2;
    for(let y=bounds.y;y<Math.min(bounds.y+bounds.height,edge+7);y++)if(y<edge-5||dither(x,y,(edge+7-y)/12))dot(x,y,I.sand[2]);
  }
  const duneArt=Array.from({length:4},(_,i)=>buildDune(i));
  for(const d of DUNE_PLACEMENTS)r.blit(duneArt[d.study],d.x-bounds.x,d.y-bounds.y);
  DRIFTS.forEach((d,i)=>{
    const p=patternAt('terrain-drift',i),notch=.3+p.value*.05;
    for(let dx=0;dx<d.w;dx++){
      const {u,arc,y,thickness,shoulder}=driftSection(d,i,dx);
      // Sheltered deposits have a broad convex shoulder, not just a contour.
      for(let dy=-shoulder;dy<0;dy++)dot(d.x+dx,y+dy,I.sand[2]);
      for(let dy=0;dy<thickness;dy++)dot(d.x+dx,y+dy,I.sand[0]);
      if(arc>.7&&u<notch)dot(d.x+dx,y-shoulder,I.sand[3]);
    }
  });
  // Scoured ribbons bend past obstacles, widening and then fading into sand.
  for(const [cx,cy,span,rise] of [[170,218,54,10],[332,186,45,8],[603,203,61,9],[117,318,54,8]]){
    for(let i=0;i<span;i++){
      const u=i/span,y=cy+Math.sin(u*Math.PI)*rise;
      const width=Math.round(Math.sin(u*Math.PI)*2);
      for(let dy=0;dy<width;dy++)dot(cx+i,y+dy,I.sand[2]);
    }
  }
  GRAVEL_PATCHES.forEach((patch,f)=>{
    const placed=[];
    for(let i=0;i<patch.count*3&&placed.length<patch.count;i++){
      const p=patternAt('terrain-gravel-'+f,i),q=patternAt('terrain-gravel-spread-'+f,i);
      const angle=p.at*2.399963,radius=Math.sqrt(q.at/768);
      const x=Math.round(patch.x+Math.cos(angle)*radius*patch.w),y=Math.round(patch.y+Math.sin(angle)*radius*patch.h);
      if(placed.some(a=>Math.abs(x-a.x)<5&&Math.abs(y-a.y)<3))continue;
      placed.push({x,y});r.blit(PEBBLES[(p.value+q.value)%PEBBLES.length],x-bounds.x,y-bounds.y);
    }
  });
  CRUST_PATCHES.forEach((patch,f)=>{
    let x=patch.x-patch.w/2,y=patch.y;
    for(let i=0;i<5;i++){
      const p=patternAt('terrain-crust-'+f,i),nx=x+patch.w/5,ny=patch.y+p.turn*(2+p.value%3);
      // Lifted plates have a lit upper surface and a thin recessed fracture.
      shape([[x,y-1],[x+2,y-3],[nx-2,ny-3],[nx,ny-1],[nx-1,ny],[x+1,y]],()=>I.sand[2]);
      line(x,y,nx,ny,I.sand[0]);
      if(i===1||i===3){
        const endY=ny+(i===1?-1:1)*patch.h/2;
        line(nx,ny,nx+3,endY,I.sand[0]);line(nx+3,endY,nx+7,endY-1,I.sand[2]);
      }
      x=nx;y=ny;
    }
  });
  ROCK_SHELVES.forEach((rock,i)=>{
    const {x,y,w,h}=rock;
    shape([[x,y+3],[x+w*.25,y],[x+w*.72,y+1],[x+w,y+h*.6],[x+w*.88,y+h],[x+2,y+h-1]],(px,py)=>I.sand[py<y+h*.45?2:px<x+w*.36?1:0]);
    shape([[x+2,y+3],[x+w*.25,y+1],[x+w*.6,y+2],[x+w*.46,y+4],[x+3,y+5]],()=>I.sand[3]);
    const p=patternAt('terrain-rock',i);
    line(x+2,y+h-3,x+w*.4,y+h-2,I.sand[1]);line(x+w*.4,y+h-2,x+w-5,y+h-4,I.sand[1]);
    line(x+w*.55,y+2,x+w*.5,y+h*.5,I.sand[0]);
    if(p.kind!=='run')line(x+w*.5,y+h*.5,x+w*.65,y+h-1,I.sand[1]);
  });
  return r;
}
