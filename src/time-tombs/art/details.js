import {Raster,fromMask} from './raster.js';
import {INDEX as I} from './palette.js';
import {patternAt} from './material-patterns.js';

// Small authored stories in the materials. No speckle layer, unbounded damage,
// resampling, or animated deformation of massive stone.
export function enrichTomb(key,r){
  const c=I.stone;
  if(key==='sphinx'){
    // Collar tablets, a broken brow, and sand worn into the forepaw grooves.
    for(const [x,y] of [[68,63],[75,64],[82,65]]){r.rect(x,y,4,5,c[1]);r.line(x,y,x+2,y,c[3]);r.set(x+1,y+2,c[2]);}
    r.line(65,28,67,34,c[0]);r.line(67,34,66,40,c[1]);
    r.line(36,96,49,96,c[3]);r.line(108,97,115,97,c[2]);
    // Overlapping small coverts sit above the long carved flight feathers.
    for(const [x,y] of [[32,53],[39,57],[46,61],[121,55],[114,60],[107,64]]){
      r.shape([[x,y],[x+5,y+2],[x+6,y+6],[x+3,y+5]],()=>c[x<76?2:1]);
      r.line(x,y,x+4,y+2,c[x<76?4:3]);
    }
    r.line(67,74,70,78,c[1]);r.line(89,70,91,81,c[1]);
    for(const [x,y] of [[42,100],[48,101],[110,101],[119,102]])r.set(x,y,I.sand[2]);
  }else if(key==='palace'){
    // Recesses under the thorn shoulders and narrow slatted windows.
    for(const [x,y] of [[35,54],[55,32],[81,67]]){
      r.rect(x,y,3,9,I.obsidian[0]);r.line(x-1,y,x-1,y+7,I.obsidian[2]);
      r.set(x+1,y+3,I.obsidian[2]);r.set(x+1,y+6,I.obsidian[1]);
    }
    r.line(28,102,32,97,I.obsidian[0]);r.line(32,97,32,92,I.obsidian[0]);
    r.line(72,111,78,108,I.obsidian[2]);
    // Footings have weight: lit shoulders, recessed sides, chipped stone caps.
    for(const [x,y,w] of [[12,113,11],[86,114,13]]){
      r.shape([[x,y+5],[x+2,y],[x+w-2,y-1],[x+w,y+5]],(px,py)=>I.obsidian[px<x+4?2:1]);
      r.line(x+3,y,x+w-3,y-1,I.obsidian[3]);
      r.line(x+w-2,y+1,x+w-1,y+4,I.obsidian[0]);
    }
  }else if(key==='crystal'){
    // Internal inclusions are short offset planes, not uniform surface grain.
    for(const [x,y,h] of [[19,23,13],[22,61,19],[20,107,11]]){
      r.line(x,y,x-2,y+h,I.crystal[1]);r.line(x+2,y+2,x,y+h-1,I.crystal[3]);
      r.set(x-1,y+h,I.crystal[4]);
    }
    r.line(10,87,14,91,I.crystal[4]);r.line(14,91,14,101,I.crystal[2]);
  }else if(key==='obelisk'){
    for(const y of [18,36,53]){r.line(8,y,10,y+1,I.obsidian[0]);r.set(8,y+2,I.obsidian[2]);}
    r.line(5,60,5,64,I.obsidian[1]);r.set(3,67,I.sand[1]);
    r.set(4,61,I.obsidian[3]);r.line(11,63,12,65,I.obsidian[0]);
  }else if(key==='jade'){
    // Veins wrap around ribs; a raised circular seal crowns the entrance.
    for(const [x,y] of [[48,29],[68,46],[35,62],[91,70]]){
      r.line(x,y,x+3,y+4,I.jade[2]);r.line(x+3,y+4,x+2,y+8,I.jade[1]);r.set(x-1,y,I.jade[4]);
    }
    r.blit(fromMask(['..aa..','.abba.','ab..ba','ab..ba','.abba.','..aa..'],{a:I.jade[1],b:I.jade[3]}),55,54);
    r.line(17,79,26,77,I.jade[2]);r.line(94,82,107,83,I.jade[0]);
    // Translucent mineral beds wrap around the arch instead of speckling it.
    for(const [x,y] of [[35,44],[69,30],[83,61]]){
      r.shape([[x,y],[x+3,y-3],[x+5,y+1],[x+4,y+6],[x+1,y+7]],()=>I.jade[2]);
      r.line(x,y,x+1,y+4,I.jade[3]);r.set(x+3,y+5,I.jade[1]);
    }
  }else if(key==='caves'){
    // Different threshold stones, dark inner ledges, fractured lintels.
    for(const [x,y] of [[20,23],[54,18],[88,25]]){
      r.line(x-2,y+4,x+2,y+4,c[1]);r.line(x+2,y+5,x+2,y+9,c[0]);
      r.line(x-5,y-7,x-2,y-8,c[4]);r.set(x-1,y-7,c[1]);
    }
    r.line(8,30,12,33,c[2]);r.rect(43,37,6,1,c[3]);r.rect(80,39,5,1,c[2]);
  }
  return r;
}

export function buildTombLight(key,source,frame){
  const r=new Raster(source.width,source.height);
  if(key==='crystal'){
    const y=12+Math.round(frame/63*91);
    r.line(11,y,26,y+12,I.crystal[4]);r.line(11,y+1,20,y+9,I.crystal[3]);
    r.line(17,y+17,24,y+11,I.crystal[3]);
  }else if(key==='jade'){
    r.line(56,55,59,55,I.jade[4]);r.set(60,57,I.jade[3]);
    r.line(56,78,60,78,I.jade[2]);
  }else if(key==='palace'){
    r.line(55,106,56,106,I.anomaly[0]);r.line(55,107,55,110,I.obsidian[3]);
    r.set(56,38,I.obsidian[3]);r.set(36,61,I.obsidian[2]);
  }else if(key==='obelisk'){
    for(const y of [20,38,56])r.set(9,y,I.obsidian[3]);
  }else if(key==='sphinx'){
    r.line(73,20,76,20,I.stone[3]);r.line(65,56,73,57,I.stone[4]);
    r.line(76,93,79,93,I.stone[2]);
  }else if(key==='caves'){
    const x=[19,53,87,53][frame];r.line(x,34,x+2,34,I.stone[2]);r.set(x+1,33,I.stone[1]);
  }
  // Light belongs to the subject; it cannot paint beyond the authored silhouette.
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
