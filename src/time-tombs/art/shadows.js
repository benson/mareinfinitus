import {Raster,silhouette} from './raster.js';
import {INDEX as I} from './palette.js';
import {sunlightAt,shadowPadding} from '../lighting.js';
import {ASSETS} from '../entities.js';
import {surfaceGeometry,groundContacts} from './geometry.js';
import {rayToGround} from '../surface.js';
export {groundContacts};
export const GROUNDING_BANDS=Object.fromEntries(Object.entries(ASSETS).map(([key,a])=>[key,a.grounding]));
// Raster projection from authored height/depth channels, not opacity-as-height.
// Optional receiver is a world-space sprite origin, for the actual land surface.
export function buildShadow(subject,light=sunlightAt(0),key,receiver){
  const lift=receiver?.lift??0,extra=receiver?.maxLift??lift;
  const pad=shadowPadding({height:subject.height+extra});
  const r=new Raster(subject.width+2*pad,subject.height+Math.ceil((subject.height+extra)*.24)+5);
  const geometry=surfaceGeometry(subject,key),points=new Int32Array(subject.data.length*2);points.fill(-9999);
  const mask=silhouette(subject).mask;
  const rx=receiver?.x??0,ry=receiver?.y??0,baseZ=receiver?.baseZ??0;
  for(let y=0;y<subject.height;y++)for(let x=0;x<subject.width;x++){
    const i=y*subject.width+x;if(!mask[i])continue;
    const floor=geometry.ground[i],h=geometry.height[i]+lift;
    const xx=receiver?.flip?subject.width-1-x:x;
    const hit=receiver?rayToGround(rx+xx,ry+floor,baseZ+h,light):{x:xx+Math.round(h*light.dx),y:floor+Math.round(h*light.dy)};
    const px=pad+Math.round(hit.x-(receiver?rx:0)),py=Math.round(hit.y-(receiver?ry:0));
    points[i*2]=px;points[i*2+1]=py;r.rect(px,py,2,2,I.sand[0]);
  }
  // A connected material edge stays connected after projection, including the
  // transition between body and stairs. Receiver terrain is sampled per pixel.
  for(let y=0;y<subject.height;y++)for(let x=0;x<subject.width;x++){
    const i=y*subject.width+x;if(!mask[i])continue;
    for(const n of [x+1<subject.width?i+1:-1,y+1<subject.height?i+subject.width:-1]){
      if(n<0||!mask[n])continue;
      const px=points[i*2],py=points[i*2+1],nx=points[n*2],ny=points[n*2+1];
      if(Math.abs(nx-px)>1||Math.abs(ny-py)>1){r.line(px,py,nx,ny,I.sand[0]);r.line(px,py+1,nx,ny+1,I.sand[0]);}
    }
  }
  if(!lift)for(const [x,floor] of geometry.contacts){
    const xx=receiver?.flip?subject.width-1-x:x;
    const z=receiver?baseZ:0;
    r.rect(pad+xx,Math.round(floor-z),1,2,I.sand[0]);
  }
  const filled=silhouette(r).mask;for(let i=0;i<filled.length;i++)if(filled[i])r.data[i]=I.sand[0];
  return r;
}
