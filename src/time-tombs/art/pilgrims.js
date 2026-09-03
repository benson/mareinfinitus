import {INDEX as I} from './palette.js';
import {Raster,fromMask} from './raster.js';
import {TRANSPARENT} from './palette.js';

// Explicit anatomy and garments on one 12x20 grid. No generated sheets,
// extraction, random identity changes, or frame-by-frame rescaling.
const HEADS=[
 ['....oooo....','...oooss....','...oosso....','...o.sss....','......s.....'],
 ['.....ll.....','....lsss....','....osso....','.....sss....','......s.....'],
 ['....ollo....','...olsss....','...oosso....','....ssss....','.....ss.....'],
 ['.....oo.....','....osss....','....osso....','.....sss....','......s.....'],
 ['.....ll.....','....lsss....','....osso....','.....sss....','......l.....'],
 ['....oooo....','....ooss....','....ooso....','.....sss....','......s.....'],
 ['.....dd.....','....duud....','...duosud...','...duossd...','....dssd....']
];
const TORSOS=[
 ['....luuuo...','...lluuuudo.','...luuuuudo.','...l.uuuud..','...s.uuuud.s','.....gggg...','.....uuud...'],
 ['....luuud...','...lluuuudo.','...luu.lllo.','...luu.lslo.','...lsuslllo.','....luuuud..','....luuuud..'],
 ['...lluuuud..','...luuuuudo.','...luuuuudd.','..luuuuuud..','..s.uuuuud.s','....ggggg...','....uuuudd..'],
 ['....luuud...','...lluuuudo.','...luuuuudo.','...l.uuuud..','...s.uuuud.s','....luuuud..','....luuuud..'],
 ['....ulllu...','...luuuuudo.','...luuuuudo.','...l.uuguu..','...s.uuuud.s','....luuuud..','....luuuud..'],
 ['....luuuo...','...lluuuudo.','...luuuuudd.','...l.uuuud..','...s.uuuud.s','.....gggg...','.....uuud...'],
 ['...lluuuud..','...luuuuud..','...luuuuud..','...luuuuudd.','...suuuuud.s','....luuuud..','...lluuuudd.']
];
const LEGS=[
 ['....uuu.dd..','....uu..dd..','...uu....dd.','...uu....dd.','..uu.....dd.','..oo.....oo.','..oo......oo','............'],
 ['.....uud....','.....uud....','.....uu.dd..','.....uu.ddd.','.....uu..oo.','.....oo.....','.....oo.....','............'],
 ['....dd.uuu..','...dd...uu..','..dd.....uu.','..dd.....uu.','..dd.....uu.','.oo......oo.','.oo......ooo','............'],
 ['.....duu....','.....duu....','....dd.uu...','...ddd.uu...','...oo..uu...','.......oo...','.......oo...','............']
];
const IDLE=['.....uudd...','.....uudd...','.....uudd...','.....uu.dd..','.....uu.dd..','.....oo.oo..','....ooo.ooo.','............'];
const RAMPS=[I.cloth,I.linen,I.cloth,I.obsidian,I.obsidian,I.uniform,I.jade];
function garmentDetail(r,index,y,legend){
  // Identity-specific construction, attached to the torso in every pose.
  // Never use noise or new skin colors to distinguish the pilgrims.
  const ink=(x,dy,c)=>{if(r.get(x,y+dy)!==TRANSPARENT)r.set(x,y+dy,c);};
  if(index===0){for(const [x,dy] of [[5,1],[6,2],[7,3]])ink(x,dy,legend.d);ink(7,4,I.accent[1]);}
  if(index===1){ink(8,2,I.linen[3]);ink(9,3,I.linen[1]);ink(8,5,I.linen[2]);}
  if(index===2){ink(5,1,legend.d);ink(6,5,I.accent[1]);ink(7,6,legend.d);}
  if(index===3){ink(5,1,legend.l);ink(6,2,legend.d);ink(6,4,I.accent[1]);}
  if(index===4){ink(5,1,I.linen[2]);ink(6,2,legend.d);ink(7,4,I.accent[1]);}
  if(index===5){ink(4,1,I.uniform[2]);ink(7,2,I.uniform[0]);ink(8,3,I.uniform[0]);ink(7,5,I.accent[1]);}
  if(index===6){ink(5,2,I.jade[3]);ink(5,3,I.jade[2]);ink(6,4,I.jade[1]);ink(6,5,I.jade[1]);}
}
export function buildPilgrim(index,frame=0) {
  const ramp=RAMPS[index],legend={o:I.obsidian[0],u:ramp[ramp.length===3?1:2],l:ramp[ramp.length-1],d:ramp[0],s:I.skin[index===5?0:1],g:I.accent[0]};
  const walking=frame<4,bob=walking&&frame%2===0?1:0,bodyY=5+bob;
  const r=new Raster(12,20);r.blit(fromMask(HEADS[index],legend),0,bob);r.blit(fromMask(TORSOS[index],legend),0,bodyY);
  garmentDetail(r,index,bodyY,legend);
  r.blit(fromMask(frame<4?LEGS[frame]:IDLE,legend),0,12);
  if(walking&&index!==1){
    // Counter-swing independently from the torso. Sol keeps both arms around
    // Rachel; his cradled bundle rises with the body instead of swinging.
    r.rect(0,bodyY+2,4,4,TRANSPARENT);r.rect(9,bodyY+2,3,4,TRANSPARENT);
    const swing=[-1,0,1,0][frame];
    r.line(3,bodyY+1,2+swing,bodyY+4,legend.l);r.set(2+swing,bodyY+5,legend.s);
    r.line(9,bodyY+1,10-swing,bodyY+4,legend.d);r.set(10-swing,bodyY+5,legend.s);
  }
  if([1,3,4,6].includes(index)) {
    const hem=walking?[0,1,0,-1][frame]:0;
    for(let y=12;y<17;y++)for(let x=4-Math.floor((y-12)/3);x<=8+Math.floor((y-12)/4);x++)r.set(x+(y>14?hem:0),y,x<5?legend.l:x>7?legend.d:legend.u);
    r.line(5,13,4,17,legend.d);
  }
  // Inhale: lift the left shoulder one pixel, keeping feet and head anchored.
  if(frame===5){r.set(3,5,legend.l);r.set(6,6,legend.l);}
  if(frame>=6&&frame<9) {
    const pose=frame-6;
    if(index===5){r.line(9,9,10,4+pose,legend.u);r.line(8,3+pose,11,3+pose,legend.s);}
    else if(index===6){r.line(10,5,10,19,I.accent[1]);r.set(10,4,I.jade[3]);r.set(10,11-pose,legend.s);if(pose===1)r.line(3,9,3,5,legend.l);}
    else if(index===1){r.set(8,8,I.linen[3]);r.set(9,9+Math.min(pose,1),legend.s);if(pose===2){r.set(7,3,legend.s);r.set(8,8,legend.s);}}
    else if(index===4){r.line(9,10,7,7+pose,legend.u);r.set(7,7+pose,legend.s);}
    else {
      r.rect(8,10,3,3,index===2?I.linen[2]:I.obsidian[1]);r.set(8,10,index===2?I.linen[3]:I.anomaly[0]);
      r.set(9,13,legend.s);r.set(8+pose,11,legend.s);
      if(index===0&&pose===1){r.line(3,9,3,4,legend.l);r.line(3,4,6,4,legend.s);}
    }
  }
  if(frame>=9){
    const pose=frame-9;
    if(index===0){
      r.rect(8,7,4,6,TRANSPARENT);r.line(8,7,10,9+pose,legend.u);r.line(10,9+pose,11,9+pose,legend.s);
      r.line(3,9,8,11,legend.l);r.line(8,11,11,11+pose,legend.s);
    }else{
      // Kneel, reach, then rise: authored joints on the same grid, no scaling.
      const lower=pose===2?1:3;r.data.fill(TRANSPARENT);
      r.blit(fromMask(HEADS[index],legend),1,lower);r.blit(fromMask(TORSOS[index],legend),0,5+lower);
      garmentDetail(r,index,5+lower,legend);
      r.rect(4,14,5,3,legend.u);r.line(8,16,10,17,legend.d);r.line(3,18,7,18,legend.o);r.line(9,18,11,18,legend.o);
      r.line(9,9+lower,10,11+pose,legend.u);r.set(11,11+pose,legend.s);
      if(index===2){r.rect(9,14,3,2,I.linen[2]);r.set(10+pose%2,13,I.linen[3]);}
    }
  }
  return r;
}
export const PILGRIM_FRAMES=Array.from({length:7},(_,i)=>Array.from({length:[0,2,3,5].includes(i)?12:9},(_,f)=>buildPilgrim(i,f)));
