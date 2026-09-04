import {INDEX as I,TRANSPARENT} from './palette.js';
import {Raster} from './raster.js';
import {antialias,outline,shadeSphere} from './shade.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const shift=(index,ramp,amount)=>{
  const at=ramp.indexOf(index);
  return at<0?index:ramp[clamp(at+amount,0,ramp.length-1)];
};

// The Jade Tomb is a single mineral mass: rounded volume first, then authored
// geological beds and cut chambers. Surface changes follow its curvature and
// never become a repeated overlay pattern.
export function buildJadeRelit({width=150,height=108,seed=21,human=20}={}){
  void seed;
  const r=new Raster(width,height),volume=new Raster(width,height),ramp=I.jade;
  const sx=value=>Math.round(value*width/150),sy=value=>Math.round(value*height/108);
  const point=(x,y)=>[sx(x),sy(y)],bottom=sy(105);

  // A broad sphere supplies highlight, light, middle, core shadow and bounce
  // bands across the entire mound before any architectural detail is added.
  shadeSphere(volume,sx(68),sy(70),sx(83),ramp,{squash:0.72,falloff:0.24});

  // Hand-authored asymmetric profile. The crest rises on the lit half while
  // the dark shoulder settles into a long, low shelf at the right.
  const profile=[
    point(6,103),point(12,94),point(18,80),point(25,61),point(34,42),
    point(44,27),point(54,18),point(63,16),point(72,18),point(81,21),
    point(90,26),point(99,32),point(108,40),point(117,49),point(126,59),
    point(134,71),point(140,81),point(144,93),point(147,102),point(146,105),
    point(128,104),point(109,105),point(91,104),point(72,105),
    point(53,104),point(34,105),point(18,104)
  ];
  r.shape(profile,(x,y)=>{
    const lit=volume.get(x,y);
    if(lit===TRANSPARENT)return ramp[1];
    let toned=y>sy(96)?shift(lit,ramp,-2):shift(lit,ramp,-1);
    // Keep the broad mound dark enough to feel mineral. The palest material
    // value is reserved for the narrow geological bed below, while the core
    // shadow remains concentrated at the far shoulder and buried foot.
    if(toned===ramp[5])toned=ramp[4];
    if(toned===ramp[0]||toned===ramp[1])toned=(x>sx(132)||y>sy(96))?ramp[1]:ramp[2];
    return toned;
  });

  // Two mineral beds wrap around the mound. Because they shift the sphere's
  // existing values, their lighting remains continuous instead of becoming
  // flat stripes pasted over the volume.
  const upperBed=[
    point(17,78),point(35,68),point(53,65),point(72,70),point(91,62),
    point(111,67),point(129,75),point(138,83),point(134,89),point(115,80),
    point(94,75),point(74,81),point(54,75),point(36,79),point(21,86)
  ];
  r.shape(upperBed,(x,y)=>shift(r.get(x,y),ramp,1));
  const lowerBed=[
    point(9,91),point(29,85),point(51,87),point(70,92),point(91,84),
    point(113,88),point(137,94),point(145,100),point(145,104),point(123,100),
    point(102,96),point(81,101),point(59,96),point(38,94),point(17,99)
  ];
  r.shape(lowerBed,(x,y)=>{
    const lowered=shift(r.get(x,y),ramp,-1);
    if(lowered===ramp[0])return ramp[1];
    return lowered===ramp[1]&&x<sx(105)?ramp[2]:lowered;
  });

  // The crystalline crown is part of the same mass. Each shard has a lit and
  // shadow face, with only two tiny summit pixels reaching the top ramp step.
  const shard=(cx,base,peak,w)=>{
    r.shape([point(cx-w,base),point(cx,peak),point(cx,base)],()=>ramp[4]);
    r.shape([point(cx,peak),point(cx+w,base),point(cx,base)],()=>ramp[2]);
  };
  shard(50,27,14,4);shard(62,22,8,4);shard(74,28,17,3);shard(87,31,22,3);
  r.set(sx(62),sy(8),ramp[6]);
  r.set(sx(74),sy(17),ramp[6]);

  const belongs=(x,y)=>r.get(x,y)!==TRANSPARENT;
  const chamber=(cx,cy,rad,lightStep)=>{
    cx=sx(cx);cy=sy(cy);rad=Math.max(2,sx(rad));
    for(let oy=-rad;oy<=rad;oy++)for(let ox=-rad;ox<=rad;ox++){
      if(ox*ox+oy*oy>rad*rad||!belongs(cx+ox,cy+oy))continue;
      r.set(cx+ox,cy+oy,ramp[0]);
    }
    // The lower rim faces the warm horizon; the upper-left pixel reveals the
    // thickness of the excavated chamber wall.
    for(let ox=-rad+1;ox<rad;ox++){
      const oy=Math.round(Math.sqrt(Math.max(0,rad*rad-ox*ox)));
      if(belongs(cx+ox,cy+oy))r.set(cx+ox,cy+oy,ramp[lightStep]);
    }
    if(belongs(cx-rad+1,cy-1))r.set(cx-rad+1,cy-1,ramp[1]);
  };

  // Individually placed apertures follow the beds rather than a repeated grid.
  chamber(28,67,5,4);chamber(47,49,7,5);chamber(68,70,7,4);
  chamber(86,48,4,3);chamber(103,63,6,3);chamber(123,82,4,2);
  chamber(42,88,3,4);chamber(78,90,3,3);chamber(105,94,3,2);

  // Small human-scaled portal with a deep reveal and two irregular mineral
  // steps. Its scale remains tied to STANDS through the `human` parameter.
  const px=sx(16),pw=Math.max(3,Math.round(human*0.45)),ph=Math.max(5,Math.round(human));
  r.rect(px,bottom-ph+2,pw,ph-2,ramp[0]);
  r.shape([[px,bottom-ph+2],[px+Math.floor(pw/2),bottom-ph-1],[px+pw,bottom-ph+2]],()=>ramp[0]);
  r.line(px-1,bottom-ph+2,px-1,bottom-1,ramp[4]);
  r.rect(px-3,bottom-2,pw+7,1,ramp[4]);
  r.rect(px-5,bottom-1,pw+11,1,ramp[2]);

  antialias(r);
  outline(r,ramp[0]);
  return r;
}
