import {WORLD} from './space.js';
import {DUNE_STUDIES,DUNE_PLACEMENTS,duneSection} from './art/dunes.js';
import {DRIFTS,ROCK_SHELVES,TERRACES,driftSection,terraceColumns} from './landforms.js';
import {ENTITIES,footprintFor,inPolygon} from './entities.js';
// Orthographic 2.5D: screenY = groundY - elevation. Heights and the art share
// the same authored cross-sections. This is not a mesh inferred from colors.
let cached;
export const TERRAIN_REVISION=1;
export function buildHeightField(){
  const width=WORLD.width,height=WORLD.height,data=new Float32Array(width*height);
  const put=(x,y,z)=>{x-=WORLD.left;y-=WORLD.top;if(x>=0&&y>=0&&x<width&&y<height)data[y*width+x]=Math.max(data[y*width+x],z);};
  const face=(x,crest,toe,peak)=>{
    crest=Math.round(crest);toe=Math.round(toe);const summit=crest+peak;
    for(let gy=crest;gy<=toe;gy++)put(x,gy,Math.max(0,gy< summit?peak*((gy-crest)/Math.max(1,peak))**2:peak*(toe-gy)/Math.max(1,toe-summit)));
  };
  for(const p of DUNE_PLACEMENTS)for(let x=0;x<DUNE_STUDIES[p.study].w;x++){
    const s=duneSection(p.study,x);face(p.x+x,p.y+s.crest,p.y+s.toe,(s.toe-s.crest)*.38);
  }
  DRIFTS.forEach((p,i)=>{for(let x=0;x<p.w;x++){const s=driftSection(p,i,x);face(p.x+x,s.y-s.shoulder,s.y+s.thickness,(s.shoulder+s.thickness)*.38);}});
  for(const p of ROCK_SHELVES)for(let x=0;x<p.w;x++){
    const taper=Math.min(1,x/4,(p.w-1-x)/4);face(p.x+x,p.y+2,p.y+p.h,p.h*.38*Math.max(0,taper));
  }
  for(const t of TERRACES)for(const c of terraceColumns(t))face(c.x,c.y,c.y+c.height,c.height*.5);
  // Explicit level foundations: do not pretend a rigid tomb bends over a dune.
  for(const e of ENTITIES.filter(e=>!e.key.startsWith('windstone'))){
    const poly=footprintFor(e),xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
    for(let y=Math.floor(Math.min(...ys));y<=Math.max(...ys);y++)for(let x=Math.floor(Math.min(...xs));x<=Math.max(...xs);x++)if(inPolygon(x,y,poly))data[(y-WORLD.top)*width+x-WORLD.left]=0;
  }
  let maximum=0;for(const z of data)maximum=Math.max(maximum,z);
  const front=new Float32Array(width*height);front.fill(-Infinity);
  for(let x=0;x<width;x++)for(let y=1;y<height;y++){
    const z=data[y*width+x],previous=data[(y-1)*width+x];if(z<=0&&previous<=0)continue;
    const a=y-1-previous,b=y-z,lo=Math.max(0,Math.ceil(Math.min(a,b))),hi=Math.min(height-1,Math.floor(Math.max(a,b)));
    for(let sy=lo;sy<=hi;sy++){
      const u=b===a?1:(sy-a)/(b-a),groundY=y-1+u;
      front[sy*width+x]=Math.max(front[sy*width+x],groundY+WORLD.top);
    }
  }
  return {width,height,data,maximum,front};
}
export function elevationAt(x,y){
  const f=cached??=buildHeightField(),xx=x-WORLD.left,yy=y-WORLD.top;
  if(xx<0||yy<0||xx>=f.width-1||yy>=f.height-1)return 0;
  const ix=Math.floor(xx),iy=Math.floor(yy),u=xx-ix,v=yy-iy;
  const a=f.data[iy*f.width+ix],b=f.data[iy*f.width+ix+1],c=f.data[(iy+1)*f.width+ix],d=f.data[(iy+1)*f.width+ix+1];
  return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;
}
export const projectGround=(x,y,z=0)=>({x:Math.round(x),y:Math.round(y-elevationAt(x,y)-z)});
export function slopeAt(x,y){return {x:(elevationAt(x+1,y)-elevationAt(x-1,y))/2,y:(elevationAt(x,y+1)-elevationAt(x,y-1))/2};}
export function rayToGround(x,y,z,light){
  const f=cached??=buildHeightField(),total=Math.max(0,z),start=Math.max(0,total-f.maximum),steps=Math.max(1,Math.ceil(total-start));let prev=start;
  // March in elevation units, bounded by the authored caster height.
  for(let i=0;i<=steps;i++){
    const drop=start+(total-start)*i/steps,gx=x+light.dx*drop,gy=y+light.dy*drop;
    if(z-drop<=elevationAt(gx,gy)){
      let lo=prev,hi=drop;for(let j=0;j<5;j++){const m=(lo+hi)/2;if(z-m<=elevationAt(x+light.dx*m,y+light.dy*m))hi=m;else lo=m;}
      return projectGround(x+light.dx*hi,y+light.dy*hi);
    }prev=drop;
  }
  return projectGround(x+light.dx*total,y+light.dy*total);
}
export function terrainOccludes(x,screenY,groundY){
  const f=cached??=buildHeightField(),ix=Math.round(x)-WORLD.left,iy=Math.round(screenY)-WORLD.top;
  return ix>=0&&iy>=0&&ix<f.width&&iy<f.height&&f.front[iy*f.width+ix]>groundY+.5;
}
