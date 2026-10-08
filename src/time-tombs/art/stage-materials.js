import {Raster,dither} from './raster.js';
import {INDEX as I} from './palette.js';
import {stamp,assemble} from './tiles/assemble.js';
import {GROUND} from './tiles/ground.js';
import {ATMOSPHERE} from './tiles/atmosphere.js';
import {STONE} from './tiles/stone.js';
import {GROUND_MAP,SECONDARY_MAP} from './maps/ground.js';
const sand=(r,name,x,y,shift=0,flipX=false)=>stamp(r,GROUND[name],Math.round(x),Math.round(y),I.sand,shift,{flipX});
export function buildSkyStudy(width,height,horizon){
 const r=new Raster(width,height,I.sky[0]);
 // Dither is confined to the large sky gradient.
 for(let y=0;y<horizon;y++){
  const t=Math.pow(y/(horizon-1),1.7)*(I.sky.length-1),b=Math.min(I.sky.length-2,Math.floor(t));
  for(let x=0;x<width;x++)r.set(x,y,dither(x,y,t-b)?I.sky[b+1]:I.sky[b]);
 }
 for(const [x,y] of [[36,16],[82,37],[148,21],[229,8],[286,46],[346,27],[419,12],[470,50],[532,31],[603,16],[678,40],[738,8],[782,27],[854,49],[926,17],[993,36],[1064,13]])r.set(x,y,I.ridge[1]);
 for(const [x,y,len,shift] of [[26,88,7,0],[198,112,10,1],[404,91,8,0],[620,117,10,1],[866,98,7,0],[976,125,8,1]]){
  const cloudRamp=[I.sky[1],I.sky[1],I.sky[2],I.sky[2],I.sky[3],I.sky[3],I.sky[4]];
  stamp(r,ATMOSPHERE.cloudL,x,y,cloudRamp,0);
  for(let n=0;n<len;n++)stamp(r,ATMOSPHERE.bank,x+16+n*16,y+[0,1,1,0,-1,0,1][n%7],cloudRamp,0,{flipX:n%3===1});
  stamp(r,ATMOSPHERE.cloudR,x+16+len*16,y,cloudRamp,0);
 }
 return r;
}
export function paintRidges(r,horizon){
 const sequence=[['ridge',0],['plateau',-2],['plateau',-2],['ridge',0],['mesa',4],['plateau',2],['ridge',3],['ridge',5],['plateau',1],['plateau',1],['plateau',1],['ridge',2],['mesa',6]];
 for(let x=0,i=0;x<r.width;x+=16,i++){const [name,dy]=sequence[i%sequence.length];stamp(r,ATMOSPHERE[name],x,horizon-13+dy,I.ridge,-2,{flipX:i%4===3});}
}
export function paintValleyFloor(r,horizon){
 // The broad valley bed is the second allowed gradient; drawn dune bands
 // supply the visible forms. No surface noise or random silhouette passes.
 for(let y=horizon;y<r.height;y++){
  const t=Math.max(0,Math.min(1,(y-230)/110));
  for(let x=0;x<r.width;x++)r.set(x,y,t>0&&dither(x,y,t*.22)?I.sand[0]:I.sand[y<230?2:1]);
 }
 for(const p of GROUND_MAP)stamp(r,GROUND[p.name],p.x,p.y,I.sand,p.shift);
 for(const [x,y,s] of [[36,196,-1],[74,201,-1],[276,210,-1],[302,213,-1],[450,228,-2],[466,231,-2],[534,276,-2],[553,279,-2],[666,301,-2],[685,304,-2],[706,307,-2],[806,285,-2],[824,288,-2],[891,320,-2],[914,324,-2],[1008,308,-2]])sand(r,'ripple',x,y,s);
}
function along(points,spacing,fn){
 for(let n=0;n<points.length-1;n++){const [ax,ay]=points[n],[bx,by]=points[n+1],length=Math.hypot(bx-ax,by-ay),steps=Math.max(1,Math.ceil(length/spacing));
  for(let k=0;k<steps;k++)fn(Math.round(ax+(bx-ax)*k/steps),Math.round(ay+(by-ay)*k/steps),k);
 }
}
export function paintPath(r,points,widthNear,widthFar,horizon){
 along(points,5,(x,y,k)=>{if(y<horizon)return;const shift=y<240?-1:-2;sand(r,'path',x-4,y-3,shift,k%2===1);});
}
export function paintWash(r,points){along(points,8,(x,y,k)=>sand(r,'ripple',x-8,y,-3,k%2===1));}
export function paintTerrace(r,x0,x1,lipY){
 const offsets=[0,0,1,1,2,2,1,0,0,-1,-1,-2,-2,-1,0,1,1,2,3,2,1,0,-1,-1,0,0,1,2,1,0];
 for(let x=x0,i=0;x<x1;x+=16,i++)stamp(r,STONE.plinth,x,lipY+offsets[i%offsets.length],I.sand,-1);
}
export function paintOutcrop(r,cx,baseY,w,h,variant=0){
 const names=['rockA','rockB','rockC'],count=Math.max(1,Math.round(w/14));
 for(let n=0;n<count;n++){const name=names[(n+variant)%3],t=GROUND[name];sand(r,name,cx-Math.floor(w/2)+n*12,baseY-t.h+1,n===0?0:-1,n%2===1);}
}
export function paintGravel(r,cx,cy,rx,ry,seed){
 for(const [dx,dy] of [[-.6,-.3],[-.25,.2],[.1,-.5],[.45,.1],[.7,.3]])sand(r,'gravel',cx+dx*rx,cy+dy*ry,-2,seed%2===1);
}
export function paintMoon(r,cx,cy){stamp(r,ATMOSPHERE.moon,cx-7,cy-7,[I.sky[2],I.ridge[0],I.ridge[1],I.ridge[2],I.linen[2],I.linen[3],I.linen[3]],0);}
export function paintFireRing(r,cx,cy){for(const [x,y] of [[-7,-2],[3,-2],[-7,2],[3,2]])sand(r,'gravel',cx+x,cy+y,-2);}
export function paintWindbreak(r,x,y){stamp(r,STONE.plinth,x,y,I.cloth,-1);}
export function paintFootprints(r,points){along(points,6,(x,y,k)=>{r.set(x+(k%2?1:-1),y,I.sand[0]);r.set(x+(k%2?2:0),y,I.sand[0]);});}
export function paintCairn(r,x,baseY){sand(r,'cairn',x-4,baseY-5,0);}
export function paintForegroundLedge(r,x0,x1,crestY){
 const offsets=[12,8,4,2,0,-2,-2,0,3,5,7,10];
 for(let x=x0,i=0;x<x1;x+=16,i++){
  const y=crestY+offsets[Math.min(offsets.length-1,i)];
  stamp(r,STONE.plinth,x,y,I.sand,-2);
  for(let yy=y+8;yy<r.height;yy+=16)stamp(r,STONE[['blockA','blockB','blockC'][i%3]],x,yy,I.sand,-3);
 }
}
export function paintRubble(r,x,y,count,spread,seed=1){for(const n of [-.4,-.1,.2,.5])sand(r,'gravel',x+n*spread,y-2,-2,seed%2===1);}
export function paintGroundShadow(r,x,y,length,thickness){for(let dx=0;dx<length;dx+=16)sand(r,'ripple',x+dx,y-thickness,-4);}
export function paintSandDrift(r,x0,x1,baseY,seed,scale=1){
 const count=Math.max(1,Math.ceil((x1-x0+12)/12));
 const rises=[1,0,1,2,1,0,0,1,2,2,1,0];
 for(let i=0;i<count;i++)sand(r,'drift',x0-6+i*12,baseY-2-rises[(i+seed)%rises.length]-(i>count*.7?1:0),-1,i%3===1);
}
export function paintSecondary(r){r.blit(assemble(SECONDARY_MAP,GROUND,I.sand,r.width,r.height),0,0);}
