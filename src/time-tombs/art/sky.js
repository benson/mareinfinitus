import {Raster,prng,fromMask} from './raster.js';
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
  for(let block=0;block<16;block++){
    const points=RIDGES[[0,2,1,3,2,0,3,1,0,1,3,2,1,0,2,3][block]],offset=block*96;
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
export function buildSky(){
  const r=new Raster(WORLD.width,WORLD.height,I.sky[0]);
  // Broad dusk planes with narrow interlocking edges; no whole-sky checkerboard.
  for(let layer=1;layer<I.sky.length;layer++)for(let x=0;x<r.width;x++){
    const wx=x+WORLD.left,base=[0,-42,18,67,88,99][layer];
    const y0=base+Math.round(Math.sin(wx/187+layer)*2+Math.sin(wx/61)*.6);
    for(let y=y0;y<102;y++)r.set(x,y-WORLD.top,I.sky[layer]);
    // Two-pixel ribbons, not statistically distributed dust.
    if((Math.floor(wx/3)+layer)%4===0)r.rect(x,y0-1-WORLD.top,1,2,I.sky[layer-1]);
  }
  const rand=prng(7);
  for(let i=0;i<200;i++){
    const x=Math.floor(rand()*r.width),y=Math.floor(rand()*(30-WORLD.top));
    r.set(x,y,i%6?I.ridge[0]:I.ridge[1]);
    if(i%29===0){r.set(x-1,y,I.sky[1]);r.set(x+1,y,I.sky[1]);r.set(x,y-1,I.ridge[0]);}
  }
  return r;
}
export function buildCloud(variant=0){
  const r=new Raster(176,14),c=I.sky;
  const upper=variant?[[0,10],[24,8],[41,8],[60,5],[81,5],[94,2],[109,3],[125,6],[148,7],[175,10]]:[[0,9],[16,7],[35,7],[49,4],[65,4],[77,1],[94,2],[106,5],[128,5],[145,8],[175,10]];
  r.shape([...upper,[154,12],[136,11],[114,13],[91,11],[75,13],[43,10],[20,11]],(x,y)=>c[y<8?3:2]);
  for(const [x,y,w] of variant?[[33,8,17],[71,5,19],[119,8,24]]:[[21,7,14],[56,4,15],[94,5,12],[135,8,14]]){
    r.line(x,y,x+w,y,c[3]);r.line(x+4,y+2,x+w-3,y+2,c[2]);
  }
  r.line(47,11,68,11,c[2]);r.line(119,11,134,12,c[2]);return r;
}
export function buildSun(frame=0){
  const r=fromMask(['......a......','...a.....a...','.....aaa.....','...aabbbaa...','...abcccba...','..abcccccba..','a.abcccccba.a','..abcccccba..','...abcccba...','...aabbbaa...','.....aaa.....','...a.....a...','......a......'],{a:I.sun[0],b:I.sun[1],c:I.fire[3]});
  r.line(4,5,5,4,I.sun[1]);r.set(frame%2?3:9,frame%2?2:10,I.sun[1]);return r;
}
export function buildMoon(){
  return fromMask(['...aaaa...','..abbbba..','.abccbbba.','abbcddbbba','abbcddcbba','abbbccbbba','.abbbbba..','..abbba...','...aa.....'],{a:I.ridge[0],b:I.ridge[1],c:I.sky[2],d:I.sky[1]});
}
