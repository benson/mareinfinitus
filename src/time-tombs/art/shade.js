import {INDEX, TRANSPARENT} from './palette.js';

const length = v => Math.hypot(v.x ?? 0, v.y ?? 0, v.z ?? 0) || 1;
export const normalize = v => {
  const n = length(v);
  return {x:(v.x ?? 0) / n, y:(v.y ?? 0) / n, z:(v.z ?? 0) / n};
};
export const dot = (a,b) => (a.x ?? 0) * (b.x ?? 0) + (a.y ?? 0) * (b.y ?? 0) + (a.z ?? 0) * (b.z ?? 0);
export const LIGHT = normalize({x:-0.6,y:-0.55,z:0.58});

const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

// Map one continuous light sample into a deliberate, solid palette band.
// Shading functions never interpolate colors and never dither.
export function shadeIndex(normal,ramp,{ambient=0.16,bounce=0.10,gain=1}={}){
  const n=normalize(normal),l=Math.max(0,dot(n,LIGHT));
  let value=ambient+(1-ambient)*Math.pow(l,0.85)*gain;
  if(l<0.08&&n.x>0.7)value+=bounce;
  return ramp[clamp(Math.round(value*(ramp.length-1)),0,ramp.length-1)];
}

// Five readable bands across a vertical round form: highlight, light, mid,
// core shadow and the narrow reflected-light band on the far edge.
export function shadeCylinder(r,x0,y0,w,h,ramp,{taper=0,falloff=0.25}={}){
  for(let y=Math.round(y0);y<Math.round(y0+h);y++){
    const t=(y-y0)/h,ww=w*(1-taper*(1-t)),xs=x0+(w-ww)/2;
    const start=Math.round(xs),end=Math.round(xs+ww);
    for(let x=start;x<end;x++){
      const u=((x-xs+0.5)/ww)*2-1;
      const normal={x:u,y:0,z:Math.sqrt(Math.max(0,1-u*u))};
      r.set(x,y,shadeIndex(normal,ramp,{gain:1-falloff*t}));
    }
  }
  return r;
}

// A front plane with quantised lateral and vertical falloff, a darker side
// plane, and explicit one-pixel edge treatment.
export function shadeBox(r,x0,y0,w,h,sideW,ramp,{falloff=0.3,lateral=0.15,gain=1}={}){
  x0=Math.round(x0);y0=Math.round(y0);w=Math.round(w);h=Math.round(h);sideW=Math.round(sideW);
  for(let y=y0;y<y0+h;y++){
    const t=(y-y0)/h;
    for(let x=x0;x<x0+w;x++){
      const a=(x-x0)/Math.max(1,w);
      r.set(x,y,shadeIndex({x:0,y:0,z:1},ramp,{gain:gain*(1-falloff*t)*(1-lateral*a)}));
    }
    for(let x=x0+w;x<x0+w+sideW;x++)r.set(x,y,shadeIndex({x:1,y:0,z:0},ramp,{gain:gain*(1-falloff*t)}));
  }
  bevel(r,x0,y0,w,h,sideW,ramp);
  return r;
}

export function shadeSphere(r,cx,cy,rad,ramp,{squash=1,falloff=0.16}={}){
  const rx=Math.max(1,rad),ry=Math.max(1,rad*squash);
  for(let y=Math.ceil(cy-ry);y<=Math.floor(cy+ry);y++)for(let x=Math.ceil(cx-rx);x<=Math.floor(cx+rx);x++){
    const nx=(x-cx+0.5)/rx,ny=(y-cy+0.5)/ry,q=nx*nx+ny*ny;
    if(q>1)continue;
    const normal={x:nx,y:ny,z:Math.sqrt(Math.max(0,1-q))};
    r.set(x,y,shadeIndex(normal,ramp,{gain:1-falloff*Math.max(0,ny)}));
  }
  return r;
}

export function shadePyramid(r,x0,y0,w,h,ramp,{falloff=0.22}={}){
  x0=Math.round(x0);y0=Math.round(y0);w=Math.round(w);h=Math.round(h);
  const center=x0+(w-1)/2;
  for(let y=y0;y<y0+h;y++){
    const t=(y-y0)/Math.max(1,h-1),half=Math.max(0.5,t*w/2);
    const start=Math.ceil(center-half),end=Math.floor(center+half);
    for(let x=start;x<=end;x++){
      const left=x<=center;
      const normal=left?{x:-0.72,y:-0.18,z:0.67}:{x:0.72,y:-0.18,z:0.67};
      r.set(x,y,shadeIndex(normal,ramp,{gain:1-falloff*t}));
    }
  }
  return r;
}

const rampPosition=(ramp,index)=>ramp.indexOf(index);
const moveInRamp=(index,ramp,amount)=>{
  const position=rampPosition(ramp,index);
  return position<0?index:ramp[clamp(position+amount,0,ramp.length-1)];
};

export function bevel(r,x0,y0,w,h,sideW,ramp){
  const left=x0,right=x0+w-1,far=x0+w+sideW-1,bottom=y0+h-1;
  for(let x=left;x<=right;x++)if(r.get(x,y0)!==TRANSPARENT)r.set(x,y0,moveInRamp(r.get(x,y0),ramp,1));
  for(let y=y0;y<=bottom;y++){
    if(r.get(left,y)!==TRANSPARENT)r.set(left,y,moveInRamp(r.get(left,y),ramp,1));
    if(r.get(right,y)!==TRANSPARENT)r.set(right,y,moveInRamp(r.get(right,y),ramp,-1));
    if(sideW>0&&r.get(far,y)!==TRANSPARENT)r.set(far,y,moveInRamp(r.get(far,y),ramp,-1));
  }
  return r;
}

// Preserve the sprite's dimensions by contouring the occupied side of its
// silhouette. This is the dark ink line Genesis sprites use against the sky.
export function outline(r,index){
  const source=r.clone();
  for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){
    if(source.get(x,y)===TRANSPARENT)continue;
    if(source.get(x-1,y)===TRANSPARENT||source.get(x+1,y)===TRANSPARENT||source.get(x,y-1)===TRANSPARENT||source.get(x,y+1)===TRANSPARENT)r.set(x,y,index);
  }
  return r;
}

const materialRamps=Object.values(INDEX).filter(ramp=>Array.isArray(ramp)&&ramp.length>=3);
function halfwayInSharedRamp(a,b){
  for(const ramp of materialRamps){
    const ai=ramp.indexOf(a),bi=ramp.indexOf(b);
    if(ai<0||bi<0||Math.abs(ai-bi)<2)continue;
    return ramp[Math.round((ai+bi)/2)];
  }
  return undefined;
}

// One deterministic corner pass. The source clone prevents new AA pixels from
// cascading into their neighbours during the same invocation.
export function antialias(r){
  const source=r.clone(),corners=[[[-1,0],[0,-1]],[[1,0],[0,-1]],[[-1,0],[0,1]],[[1,0],[0,1]]];
  for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){
    const b=source.get(x,y);if(b===TRANSPARENT)continue;
    for(const [one,two] of corners){
      const a=source.get(x+one[0],y+one[1]);
      if(a===TRANSPARENT||a!==source.get(x+two[0],y+two[1]))continue;
      const middle=halfwayInSharedRamp(a,b);
      if(middle!==undefined){r.set(x,y,middle);break;}
    }
  }
  return r;
}
