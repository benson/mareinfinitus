import {Raster,prng,fromMask} from './raster.js';
import {cycleFrames} from './tiles/assemble.js';
import {INDEX as I} from './palette.js';
import {WORLD} from '../space.js';

const RIDGES=[
 [[0,27],[8,21],[19,19],[31,6],[40,10],[48,9],[58,22],[70,24],[83,20],[96,27]],
 [[0,26],[13,23],[24,14],[37,16],[45,12],[52,3],[59,4],[69,16],[82,18],[96,26]],
 [[0,27],[12,17],[26,18],[34,13],[46,15],[57,9],[71,10],[78,22],[96,27]],
 [[0,25],[13,22],[25,6],[30,5],[36,14],[47,20],[57,18],[68,11],[83,16],[96,25]]
];
function heightAt(points,x){const i=points.findIndex(p=>p[0]>=x);if(i<=0)return points[0][1];const a=points[i-1],b=points[i];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}
export function buildRidges(){
  const r=new Raster(WORLD.width,32);
  for(let block=0;block<Math.ceil(WORLD.width/96);block++){
    const points=RIDGES[[0,2,1,3,2,0,3,1,0,1,3,2,1,0,2,3][block%16]],offset=block*96;
    for(let x=0;x<96;x++){
      const top=Math.round(heightAt(points,x));
      const lit=heightAt(points,Math.min(95,x+2))<heightAt(points,Math.max(0,x-2));
      for(let y=top;y<32;y++)r.set(offset+x,y,I.ridge[lit&&y<top+3+Math.floor(x%17/5)?1:0]);
    }
    // Thin shelves and a descending ravine follow each ridge's stone planes.
    for(const [x,y,w] of [[12,28,9],[57,26,12],[81,29,7]])r.line(offset+x,y,offset+x+w,y-1,I.ridge[1]);
  }
  return r;
}
// Ordered coverage mixes only adjacent ramp colors, never interpolated RGB.
// The matrix is addressed in world pixels, not screen pixels or animation time.
const SKY_DITHER=[
  [0,48,12,60,3,51,15,63],[32,16,44,28,35,19,47,31],
  [8,56,4,52,11,59,7,55],[40,24,36,20,43,27,39,23],
  [2,50,14,62,1,49,13,61],[34,18,46,30,33,17,45,29],
  [10,58,6,54,9,57,5,53],[42,26,38,22,41,25,37,21]
];
// Composed atmospheric banks. Each column names five different contours and
// a blend breadth. They open, overlap in projection, and taper independently;
// this is not one sine wave displacing five parallel stripes.
const SKY_BANKS=[
  [-640,-80,-6,58,84,103,24],[-450,-126,-12,48,83,104,31],
  [-260,-111,-52,39,78,99,17],[-60,-76,-34,47,77,97,27],
  [150,-101,6,61,90,108,38],[390,-140,-38,39,73,95,23],
  [650,-126,-56,31,79,100,34],[880,-71,-10,50,88,108,18],
  [1130,-91,12,65,85,105,32],[1360,-138,-48,40,76,98,22],
  [1550,-118,-32,49,84,102,36],[1870,-75,2,56,82,101,21],
  [2090,-99,-27,33,74,99,31],[2430,-121,-49,39,76,101,19],
  [2688,-76,-9,61,90,107,29]
];
function skyColumn(x){
  let j=SKY_BANKS.findIndex(p=>p[0]>=x);if(j<0)j=SKY_BANKS.length-1;
  if(j===0)return SKY_BANKS[0].slice(1);
  const a=SKY_BANKS[j-1],b=SKY_BANKS[j],u=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0]))),t=u*u*(3-2*u);
  return a.slice(1).map((v,i)=>v+(b[i+1]-v)*t);
}
function skyPixel(x,y,bank){
  let color=I.sky[0];
  for(let layer=0;layer<5;layer++){
    const center=bank[layer],half=bank[5]*[1,.65,.36,.25,.15][layer];
    if(y<center-half)break;
    if(y>=center+half){color=I.sky[layer+1];continue;}
    const t=(y-center+half)/(half*2),coverage=t*t*(3-2*t);
    const threshold=(SKY_DITHER[y&7][x&7]+.5)/64;
    color=I.sky[coverage>threshold?layer+1:layer];
  }
  return color;
}
export function skyColorAt(x,y){return skyPixel(x,y,skyColumn(x));}
export function buildSky(){
  const r=new Raster(WORLD.width,WORLD.height,I.sky[0]);
  // Keep the high sky quiet. Dither only where neighboring dusk tones meet.
  for(let x=0;x<r.width;x++){
    const wx=x+WORLD.left,bank=skyColumn(wx);
    for(let y=Math.max(WORLD.top,-190);y<116;y++)r.set(x,y-WORLD.top,skyPixel(wx,y,bank));
  }
  r.rect(0,116-WORLD.top,r.width,r.height,I.sky[I.sky.length-1]);
  const rand=prng(7);
  for(let i=0;i<200;i++){
    const x=Math.floor(rand()*r.width),y=Math.floor(rand()*(30-WORLD.top));
    r.set(x,y,i%6?I.ridge[0]:I.ridge[1]);
    if(i%29===0){r.set(x-1,y,I.sky[1]);r.set(x+1,y,I.sky[1]);r.set(x,y-1,I.ridge[0]);}
  }
  return r;
}
export function buildCloud(variant=0){
  const r=new Raster(176,22),c=I.sky;
  // Unequal overlapping lobes, lit shoulders and loose tails. No ruler-straight
  // streak through the entire cloud; quiet interiors hold it together.
  const lobes=variant?[[14,13,36,3],[39,12,49,6],[75,11,45,9],[111,14,43,5],[139,15,32,2]]:
    [[3,14,39,2],[27,12,53,6],[61,10,49,8],[96,13,38,5],[121,15,52,3]];
  for(const [left,cy,w,h] of lobes)for(let dx=0;dx<w;dx++){
    const u=dx/(w-1),mass=Math.sin(u*Math.PI),top=cy-Math.round(mass*h),bottom=cy+Math.round(mass*(2+h*.25));
    for(let y=top;y<=bottom;y++){
      if((u<.12||u>.91)&&SKY_DITHER[y&7][(left+dx)&7]>mass*90)continue;
      r.set(left+dx,y,c[y<top+Math.max(1,h*.3)&&u>.13&&u<.63?3:2]);
    }
  }
  return r;
}
export function buildSun(frame=0){
  const r=fromMask(['......a......','...a.....a...','.....aaa.....','...aabbbaa...','...abcccba...','..abcccccba..','a.abcccccba.a','..abcccccba..','...abcccba...','...aabbbaa...','.....aaa.....','...a.....a...','......a......'],{a:I.sun[0],b:I.sun[1],c:I.fire[3]});
  r.line(4,5,5,4,I.sun[1]);return cycleFrames(r,I.sun,2)[frame%2];
}
export function buildMoon(){
  return fromMask(['...aaaa...','..abbbba..','.abccbbba.','abbcddbbba','abbcddcbba','abbbccbbba','.abbbbba..','..abbba...','...aa.....'],{a:I.ridge[0],b:I.ridge[1],c:I.sky[2],d:I.sky[1]});
}
