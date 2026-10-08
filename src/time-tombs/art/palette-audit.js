import {PALETTE,TRANSPARENT} from './palette.js';
import {Raster} from './raster.js';
export function colorCount(r){return new Set([...r.data].filter(v=>v!==TRANSPARENT)).size;}
function band(r,top,bottom){const out=new Raster(r.width,bottom-top);for(let y=top;y<bottom;y++)for(let x=0;x<r.width;x++)out.set(x,y-top,r.get(x,y));return out;}
export function layerColors(art){
 const group={
 sky:[art.get('sky'),art.get('moon'),art.get('sun-0')],
 far:[art.get('ridges'),art.get('caves'),art.get('caves-stage-drift')],
 shelf:[band(art.get('ground'),150,270),...['sphinx','jade','obelisk','crystal','palace','windstone-0','windstone-1','windstone-2'].map(k=>art.get(k)),...Array.from({length:7},(_,i)=>art.get('pilgrim-tiny-'+i+'-4'))],
 floor:[band(art.get('ground'),270,315),...Array.from({length:7},(_,i)=>art.get('pilgrim-ramp-'+i+'-4'))],
 camp:[band(art.get('ground'),315,360),...['tent-0','tent-alt-0','fire-0','instrument0-0','supplies-0'].map(k=>art.get(k)),...Array.from({length:7},(_,i)=>art.get('pilgrim-'+i+'-4'))],
 near:[art.get('foreground')]
 };
 return Object.fromEntries(Object.entries(group).map(([name,rasters])=>[name,new Set(rasters.flatMap(r=>[...r.data].filter(v=>v!==TRANSPARENT))).size]));
}

