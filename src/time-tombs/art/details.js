import {Raster,fromMask} from './raster.js';
import {INDEX as I} from './palette.js';
import {patternAt} from './material-patterns.js';

// Lights are native masks on the rebuilt architectural planes. Eight held
// facet states avoid allocating dozens of full-height monolith textures.
export function buildTombLight(key,source,frame){
  const r=new Raster(source.width,source.height);
  const anchors={jade:[[105,141],[117,138],[124,142]],palace:[[175,478],[178,476]],obelisk:[[39,500],[39,521]],sphinx:[[137,181],[156,186],[196,186],[216,181]],caves:[[63,320],[81,320]]};
  if(key==='crystal'){
    const facets=[[[94,130],[106,265]],[[106,265],[119,413]],[[119,413],[122,545]],[[122,545],[125,690]],[[173,35],[181,279]],[[181,279],[190,491]],[[190,491],[202,707]],[[67,60],[68,266]]];
    const [a,b]=facets[frame%8];r.line(...a,...b,I.crystal[4]);
    r.line(a[0]+1,a[1],b[0]+1,b[1],I.crystal[3]);
  }else{
    const points=anchors[key];for(let i=1;i<points.length;i++)r.line(...points[i-1],...points[i],key==='jade'?I.jade[4]:key==='palace'?I.anomaly[0]:key==='obelisk'?I.obsidian[3]:I.stone[3]);
  }
  r.data.forEach((_,i)=>{if(source.data[i]===255)r.data[i]=255;});return r;
}

export function buildShrike(){
  return fromMask([
    '.........a.........','........aba........','......a.ab.a.......',
    '.......acbca.......','.......acbba.......','.......db.bd.......',
    '........aba........','...a...acbca...a...','....a.acbb.ca.a....',
    '.....acbb.bbca.....','....acbbb.bbbca....','...ac.acb.bca.ca...',
    '..ac..acbbbca..ca..','.ab...acb.bca...ba.','..a.a..acbca..a.a..',
    '...ac.acbbbca.ca...','..ac..acb.bca..ca..','.ab....acbca....ba.',
    '..a....acbca....a..','.......ab.ba.......','......acb.bca......',
    '......ab...ba......','.....acb...bca.....','.....ab.....ba.....',
    '.....ab.....ba.....','....acb.....bca....','....ab.......ba....',
    '....ab.......ba....','...acb.......bca...','...aa.........aa...'
  ],{a:I.obsidian[2],b:I.obsidian[0],c:I.obsidian[3],d:I.accent[0]});
}

export function buildWindstone(variant=0){
  const sizes=[[14,8],[23,12],[9,6]], [w,h]=sizes[variant],r=new Raster(w,h),c=I.sand;
  const ridge=variant===1?6:3;
  r.shape([[0,h-1],[2,3],[ridge,1],[w-5,2],[w-2,h-4],[w-1,h-1]],(x,y)=>c[y<3?2:x<ridge?1:0]);
  r.line(3,2,ridge,1,c[3]);r.line(ridge+1,2,w-6,3,c[2]);
  r.line(ridge+1,4,ridge+3,h-2,c[0]);
  if(variant===1){r.line(14,5,19,6,c[1]);r.line(15,7,20,8,c[1]);r.set(6,9,c[2]);}
  const p=patternAt('windstone',variant),x=ridge+1+p.value%3;
  for(let dy=0;dy<Math.min(3,p.length);dy++){
    const px=x+Math.floor(dy/2)*p.turn,py=3+dy;
    if(r.get(px,py)!==255)r.set(px,py,c[0]);
    if(p.kind==='mirror'&&r.get(px+1,py)!==255)r.set(px+1,py,c[1]);
  }
  r.line(2,h-2,5,h-2,c[1]);return r;
}
