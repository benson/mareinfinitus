import {Raster} from './raster.js';
import {INDEX as I} from './palette.js';

// Native landform studies. Each cross-section is deliberately drawn: x,
// windward toe, crest, lee toe. They are not line effects or scaled sprites.
// Profiles describe different geology: crescent, knife ridge, saddle and apron.
export const DUNE_STUDIES=[
 {w:132,h:40,sections:[[0,30,30,31],[12,28,23,32],[28,23,13,31],[45,16,7,29],[61,12,5,30],[78,14,8,33],[95,19,16,35],[112,26,24,36],[131,35,35,36]],scar:[[43,14],[51,13],[60,14],[69,16]],slip:[[63,8],[67,13],[74,18],[77,25]]},
 {w:106,h:32,sections:[[0,24,24,25],[14,22,16,25],[30,19,8,24],[42,18,4,24],[52,17,6,25],[63,19,9,27],[78,22,15,29],[92,27,24,30],[105,30,30,31]],scar:[[18,20],[29,18],[35,17]],slip:[[47,8],[50,14],[59,23]]},
 {w:170,h:49,sections:[[0,37,37,38],[17,32,29,39],[38,25,16,36],[57,19,8,34],[76,18,10,35],[91,25,17,38],[107,20,11,37],[122,20,14,40],[145,30,27,43],[169,44,44,45]],scar:[[44,22],[53,20],[68,22]],slip:[[111,15],[115,23],[122,31]]},
 {w:79,h:25,sections:[[0,18,18,19],[11,15,10,19],[23,11,5,17],[34,9,4,18],[47,12,7,20],[60,17,13,22],[78,23,23,24]],scar:[[15,14],[23,12],[31,12]],slip:[[38,7],[42,12],[49,17]]}
];
function at(points,x,column){
  const i=points.findIndex(p=>p[0]>=x);if(i<=0)return points[0][column];
  const a=points[i-1],b=points[i];return a[column]+(b[column]-a[column])*(x-a[0])/(b[0]-a[0]);
}
export function buildDune(study=0){
  const d=DUNE_STUDIES[study],r=new Raster(d.w,d.h),c=I.sand;
  for(let x=0;x<d.w;x++){
    const {crest,wind,toe}=duneSection(study,x);
    // Windward volume broadens toward the crest, without an outlined perimeter.
    for(let y=crest;y<=wind;y++)r.set(x,y,c[2]);
    for(let y=Math.max(crest+1,wind+1);y<=toe;y++)r.set(x,y,c[1]);
    // A shorter steep slip face on the leeward side. End horns bury themselves.
    const mass=toe-crest;
    if(mass>6){
      const edge=crest+Math.max(2,Math.round(mass*.49));
      for(let y=wind+1;y<edge;y++)r.set(x,y,c[2]);
      for(let y=edge;y<toe-1;y++)r.set(x,y,c[0]);
      // Reflected sand light at the toe softens its volume without alpha blur.
      if(mass>14)r.set(x,toe-2,c[1]);
    }
    if(mass>11&&x>d.w*.19&&x<d.w*.77)r.set(x,crest,c[3]);
  }
  const ink=(points,color)=>{for(let i=1;i<points.length;i++)r.line(...points[i-1],...points[i],color);};
  // Short cornice repairs and one slumped channel, not equally spaced stripes.
  ink(d.scar,c[1]);ink(d.slip,c[1]);
  for(let i=1;i<d.scar.length-1;i++){const [x,y]=d.scar[i];r.line(x,y-1,x+3,y-1,c[2]);}
  return r;
}
export function duneSection(study,x){const d=DUNE_STUDIES[study];return {crest:Math.round(at(d.sections,x,2)),wind:Math.round(at(d.sections,x,1)),toe:Math.round(at(d.sections,x,3))};}
export const DUNE_PLACEMENTS=[
 {study:3,x:-59,y:125},{study:1,x:117,y:127},{study:3,x:402,y:137},
 {study:0,x:447,y:254},{study:1,x:28,y:266},{study:2,x:702,y:247},
 {study:2,x:-290,y:143},{study:0,x:715,y:132},{study:2,x:270,y:341},
 {study:0,x:-215,y:342},{study:2,x:863,y:394},{study:1,x:-74,y:497},
 {study:2,x:500,y:565},{study:0,x:890,y:663},{study:0,x:-302,y:693}
];
