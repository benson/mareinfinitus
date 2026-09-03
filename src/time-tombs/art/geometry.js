import {assetFor,inPolygon} from '../entities.js';
import {Raster} from './raster.js';
// Art and geometry are different channels of the same asset, on the same grid.
export function groundContacts(source,key){
  const a=assetFor(key),[left,right,top]=a.grounding,contacts=[];
  if(source.width!==a.size[0]||source.height!==a.size[1])throw Error(key+' art/geometry dimensions disagree');
  for(let x=left;x<=right;x++)for(let y=source.height-1;y>=top;y--)if(source.get(x,y)!==255){contacts.push([x,y]);break;}
  return contacts;
}
export function planeAt(key,x,y){
  const planes=assetFor(key).planes;
  for(let i=planes.length-1;i>0;i--)if(planes[i].regions.some(p=>inPolygon(x,y,p)))return i;
  return 0;
}
const geometryCache=new WeakMap();
export function surfaceGeometry(source,key){
  if(geometryCache.get(source)?.key===key)return geometryCache.get(source).value;
  const a=assetFor(key),contacts=groundContacts(source,key),floors=new Map(contacts);
  const ground=new Float32Array(source.data.length),height=new Float32Array(source.data.length),parts=new Uint8Array(source.data.length);
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
    const i=y*source.width+x,part=planeAt(key,x,y),plane=a.planes[part];
    // Named parts own depth. Only the physical contact strip is constrained
    // to the raster edge; a wing is NOT extruded from the nearest paw.
    let row=Math.max(y,plane.row-1);
    if(floors.has(x)&&y>=a.grounding[2])row=Math.max(y,floors.get(x));
    ground[i]=row;height[i]=row-y;parts[i]=part;
  }
  const value={ground,height,parts,contacts};geometryCache.set(source,{key,value});return value;
}
export function splitDepthParts(source,key){
  const a=assetFor(key),parts=a.planes.map(()=>new Raster(source.width,source.height));
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(source.get(x,y)!==255)parts[planeAt(key,x,y)].set(x,y,source.get(x,y));
  return parts;
}
