import {Raster,silhouette} from '../art/raster.js';
import {TRANSPARENT} from '../art/palette.js';
import {C} from './palette.js';
// These are contact BANDS, separate from the upright inspection silhouette.
// The right Sphinx appendage meets ground progressively farther up the image.
export const CONTACT_BANDS={palace:[[0,78,49,57]],crystal:[[0,98,101,106],[98,106,98,104],[106,114,96,102],[114,122,94,100],[122,132,92,98]],caves:[[0,146,58,69]],obelisk:[[0,24,134,142]],jade:[[0,112,91,100]],sphinx:[[0,112,96,109],[112,120,89,101],[120,128,81,97],[128,136,77,93],[136,144,73,89],[144,152,67,83],[152,164,60,76]]};
export function contacts(r,key){
 const bands=CONTACT_BANDS[key];if(!bands)throw Error('Missing porcelain contact bands: '+key);
 const out=[];
 for(const [left,right,top,bottom]of bands)for(let x=left;x<right;x++)for(let y=bottom-1;y>=top;y--)if(r.get(x,y)!==TRANSPARENT){out.push([x,y]);break;}
 return out;
}
export function monumentShadow(r,key,dx=.42,dy=.14){
 const pad=Math.ceil(r.height*Math.abs(dx))+2,out=new Raster(r.width+2*pad,r.height+Math.ceil(r.height*Math.abs(dy))+4),mask=silhouette(r).mask;
 const feet=contacts(r,key),ground=new Map(feet),points=new Map();
 // Parts have an authored receiver row; nearby columns within a part share it.
 for(let x=0;x<r.width;x++){
  const band=CONTACT_BANDS[key].find(b=>x>=b[0]&&x<b[1]);if(!band)continue;
  const floor=ground.get(x)??band[3]-1;
  for(let y=0;y<r.height;y++)if(mask[y*r.width+x]){
   const height=Math.max(0,floor-y),xx=pad+x+Math.round(height*dx),yy=floor+Math.round(height*dy);
   points.set(y*r.width+x,[xx,yy]);out.set(xx,yy,C.haze);
  }
 }
 for(const [i,p]of points)for(const n of [i%r.width<r.width-1?i+1:-1,i+r.width]){const q=points.get(n);if(q)out.line(...p,...q,C.haze);}
 const filled=silhouette(out).mask;for(let i=0;i<filled.length;i++)if(filled[i])out.data[i]=C.haze;
 for(const [x,y]of feet)out.set(x+pad,y,C.haze);
 return {raster:out,pad,contacts:feet};
}
