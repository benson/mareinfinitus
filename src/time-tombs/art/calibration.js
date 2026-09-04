import {INDEX as I,TRANSPARENT} from './palette.js';
import {Raster,fromMask} from './raster.js';
import {antialias,bevel,outline,shadeCylinder} from './shade.js';

const COLUMN_CAPITAL=[
  '...........gg...........',
  '......feeeeeeeef........',
  '...edddddddddddddde.....',
  '..dccccccccccccccccd....',
  '...cbbbbbbbbbbbbbbc.....',
  '.....cbbbbbbbbbbc.......',
  '......baaaaaaab.........'
];
const COLUMN_BASE=[
  '.......baaaaaab.........',
  '......cbbbbbbbbc........',
  '....dccccccccccccd......',
  '...cbbbbbbbbbbbbbbc.....',
  '..dccccccccccccccccd....',
  '.edddddddddddddddddde...',
  '.cbbbbbbbbbbbbbbbbbbc...',
  'dccccccccccccccccccccd..'
];

function maskLegend(ramp){return{a:ramp[0],b:ramp[1],c:ramp[2],d:ramp[3],e:ramp[4],f:ramp[5],g:ramp[6]};}

// 24x90: the calibration unit specified by the brief. The shaft owns the
// cylindrical lighting; the capital and plinth are deliberate pixel masks.
export function buildCastlevaniaColumn(){
  const r=new Raster(24,90),ramp=I.stone;
  shadeCylinder(r,7,7,10,70,ramp,{taper:0.08,falloff:0.16});
  r.blit(fromMask(COLUMN_CAPITAL,maskLegend(ramp)),0,0);
  r.blit(fromMask(COLUMN_BASE,maskLegend(ramp)),0,82);
  // Two quiet neck and foot bands join the authored masks to the shaft.
  r.rect(6,7,12,2,ramp[4]);r.rect(7,9,10,1,ramp[2]);
  r.rect(6,76,12,2,ramp[2]);r.rect(5,78,14,2,ramp[3]);
  bevel(r,7,10,10,66,0,ramp);
  antialias(r);outline(r,ramp[0]);
  return r;
}

const PIPE_COLLAR=[
  '..deeeeeeeeeeeeeed...',
  '.dccccccccccccccccd..',
  'cbbbbbbbbbbbbbbbbbbc.',
  '.dccccccccccccccccd..',
  '..baaaaaaaaaaaaab...'
];

export function buildSpinballPipe(){
  const r=new Raster(24,90),ramp=I.obsidian,legend=maskLegend(ramp);
  shadeCylinder(r,5,3,14,84,ramp,{taper:0,falloff:0.12});
  r.blit(fromMask(PIPE_COLLAR,legend),1,0);
  r.blit(fromMask(PIPE_COLLAR,legend),1,42);
  r.blit(fromMask(PIPE_COLLAR,legend),1,84);
  // A fixed seam and two chosen specular interruptions, matching the decisive
  // mechanical accents in Spinball rather than adding procedural scratches.
  r.line(7,8,7,39,ramp[4]);r.line(8,8,8,22,ramp[5]);
  r.line(7,49,7,81,ramp[4]);r.set(8,57,ramp[6]);r.set(8,58,ramp[5]);
  antialias(r);outline(r,ramp[0]);
  return r;
}

const TRUNK_PROFILE=[
  [0,4,18],[8,3,18],[18,2,19],[30,3,18],[42,1,19],
  [54,2,18],[66,4,17],[78,3,18],[89,2,19]
];
function profileAt(y,side){
  for(let i=1;i<TRUNK_PROFILE.length;i++)if(y<=TRUNK_PROFILE[i][0]){
    const a=TRUNK_PROFILE[i-1],b=TRUNK_PROFILE[i],t=(y-a[0])/(b[0]-a[0]);
    return Math.round(a[side]+(b[side]-a[side])*t);
  }
  return TRUNK_PROFILE.at(-1)[side];
}

export function buildPitfallTrunk(){
  const ramp=I.sand,source=new Raster(24,90),r=new Raster(24,90);
  shadeCylinder(source,2,0,19,90,ramp,{taper:0.1,falloff:0.22});
  for(let y=0;y<90;y++){
    const left=profileAt(y,1),right=profileAt(y,2);
    for(let x=left;x<=right;x++){
      const value=source.get(x,y);
      if(value!==TRANSPARENT)r.set(x,y,value);
    }
  }
  // Three placed bark shapes. They bend with the trunk and concentrate detail
  // where the Pitfall crop does; there is no seed, speck pass or edge noise.
  r.line(7,8,6,27,ramp[1]);r.line(6,27,8,38,ramp[2]);
  r.line(15,20,16,42,ramp[5]);r.line(16,42,14,53,ramp[4]);
  r.line(7,57,9,72,ramp[1]);r.line(9,72,8,84,ramp[2]);
  r.blit(fromMask([
    '.abbb.',
    'abccba',
    '.baab.',
    '..aa..'
  ],{a:ramp[0],b:ramp[1],c:ramp[2]}),9,47);
  // Only two top-step pixels: wet bark catching the pale sky.
  r.set(5,13,ramp[6]);r.set(15,21,ramp[6]);
  antialias(r);outline(r,ramp[0]);
  return r;
}
