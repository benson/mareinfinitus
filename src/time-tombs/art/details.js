import {Raster,fromMask} from './raster.js';
import {INDEX as I} from './palette.js';
import {tile,stamp} from './tiles/assemble.js';
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

const WINDSTONES=[["     ***      ","   **+++=     ","  *++..===    "," *+....===#   "," *+..==.===#  ","*+....==.===# ","+......=====# ","============##"],["       ***             ","     **+++=            ","   **++...===          ","  *++.....====         "," *++..==...=====       "," *+....==...=====      ","*++.....==...======    ","*+.......==...======   ","+.........==...======  ","+..........===..====== ","+===========....======#","======================= "],["   ***   ","  *++==  "," *+..=== ","*+...===#","+...====#","========= "]];
export function buildWindstone(variant=0){
 const dimensions=[[14,8],[23,12],[9,6]],r=new Raster(...dimensions[variant]);
 // A few native boulder drawings, never stretched or randomly chipped.
 stamp(r,tile(WINDSTONES[variant]),0,0,I.sand,0);return r;
}
