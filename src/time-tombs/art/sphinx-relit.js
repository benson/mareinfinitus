import {INDEX as I,TRANSPARENT} from './palette.js';
import {Raster} from './raster.js';
import {antialias,outline,shadeBox,shadeSphere} from './shade.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const shift=(index,ramp,amount)=>{
  const at=ramp.indexOf(index);
  return at<0?index:ramp[clamp(at+amount,0,ramp.length-1)];
};

// A low, couchant architectural creature: broad wings and haunches support a
// block-built breast and faceless crown. Every surface is a deliberate volume;
// feather cuts and wear are authored only where they explain that volume.
export function buildSphinxRelit({width=190,height=132,seed=13,human=20}={}){
  void seed;
  const r=new Raster(width,height),ramp=I.stone;
  const sx=value=>Math.round(value*width/190),sy=value=>Math.round(value*height/132);
  const p=(x,y)=>[sx(x),sy(y)],bottom=sy(129);
  const tonedSphere=(cx,cy,rad,{squash=1,falloff=0.2,offset=-1}={})=>{
    const sphere=new Raster(width,height);
    shadeSphere(sphere,sx(cx),sy(cy),sx(rad),ramp,{squash,falloff});
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const value=sphere.get(x,y);
      if(value!==TRANSPARENT)r.set(x,y,shift(value,ramp,offset));
    }
  };

  // Far wing: a cool shadow mass behind the body. The two nested planes and
  // their staggered tips keep it visibly separate from the nearer appendage.
  r.shape([
    p(103,86),p(115,72),p(132,58),p(150,42),p(169,27),p(187,18),
    p(181,31),p(174,34),p(176,39),p(165,45),p(167,50),p(156,56),
    p(158,61),p(146,66),p(148,72),p(136,78),p(138,83),p(119,91)
  ],()=>ramp[1]);
  r.shape([p(116,72),p(169,27),p(178,24),p(164,45),p(127,80)],()=>ramp[2]);
  r.shape([p(126,78),p(177,35),p(168,51),p(137,84)],()=>ramp[0]);
  r.shape([p(139,63),p(187,18),p(179,31),p(149,69)],()=>ramp[3]);

  // Rear body and rounded haunch. The sphere is partially buried by the long
  // flank below, producing a shoulder-to-rump transition rather than a circle.
  tonedSphere(157,96,35,{squash:0.9,falloff:0.3});
  shadeBox(r,sx(102),sy(77),sx(55),sy(52),sx(14),ramp,{gain:0.76,falloff:0.22,lateral:0.22});
  r.shape([p(146,75),p(161,61),p(174,65),p(184,77),p(189,103),p(189,129),p(166,129)],()=>ramp[1]);
  r.shape([p(169,65),p(181,72),p(188,91),p(188,113),p(181,104),p(176,81)],()=>ramp[2]);

  // Near wing: three broad feather planes arranged around one curved spine.
  // Their boundaries converge at the root, so they read as structure rather
  // than stripes laid across the body.
  r.shape([
    p(103,91),p(117,80),p(135,68),p(153,58),p(173,50),p(188,49),
    p(181,58),p(173,60),p(176,64),p(165,68),p(168,73),p(155,77),
    p(158,82),p(144,86),p(147,91),p(126,97),p(110,102)
  ],()=>ramp[2]);
  r.shape([p(111,88),p(135,68),p(173,50),p(183,50),p(154,70),p(123,94)],()=>ramp[4]);
  r.shape([p(122,95),p(154,70),p(179,62),p(163,76),p(137,92)],()=>ramp[3]);
  r.shape([p(137,92),p(163,76),p(179,62),p(168,78),p(148,96)],()=>ramp[1]);
  r.shape([p(151,87),p(188,49),p(180,65),p(161,91)],()=>ramp[0]);

  // The feather separations are short cuts inside existing planes. None runs
  // across the whole wing, and each ends at a real tier boundary.
  r.line(sx(132),sy(72),sx(124),sy(89),ramp[1]);
  r.line(sx(148),sy(63),sx(139),sy(83),ramp[2]);
  r.line(sx(164),sy(56),sx(154),sy(74),ramp[2]);
  r.line(sx(159),sy(76),sx(151),sy(91),ramp[0]);
  r.line(sx(173),sy(67),sx(165),sy(80),ramp[0]);

  // Far foreleg and paw establish the long, low posture before the breast is
  // placed over them.
  shadeBox(r,sx(27),sy(111),sx(57),sy(18),sx(7),ramp,{gain:0.66,falloff:0.22,lateral:0.2});
  r.shape([p(17,117),p(73,117),p(82,122),p(82,129),p(11,129),p(11,123)],()=>ramp[2]);

  // Broad breast and shoulder. The front is brighter; the narrow side face
  // turns into the flank and remains readable beneath the wing root.
  shadeBox(r,sx(54),sy(55),sx(55),sy(74),sx(13),ramp,{gain:0.86,falloff:0.28,lateral:0.18});
  tonedSphere(113,81,21,{squash:0.86,falloff:0.26,offset:-2});
  r.shape([p(99,64),p(119,66),p(130,76),p(134,91),p(119,99),p(104,92)],()=>ramp[3]);

  // Low stepped crown, battered inward as it rises. A shallow dark recess is
  // the only suggestion of a face: neither human nor lion.
  shadeBox(r,sx(58),sy(48),sx(51),sy(9),sx(6),ramp,{gain:0.9,falloff:0.08,lateral:0.12});
  shadeBox(r,sx(64),sy(41),sx(41),sy(8),sx(5),ramp,{gain:0.94,falloff:0.06,lateral:0.12});
  shadeBox(r,sx(71),sy(35),sx(28),sy(7),sx(4),ramp,{gain:0.98,falloff:0.04,lateral:0.1});
  r.rect(sx(82),sy(33),sx(6),sy(3),ramp[0]);
  r.rect(sx(66),sy(60),sx(37),sy(6),ramp[0]);
  r.rect(sx(68),sy(65),sx(33),1,ramp[4]);
  r.rect(sx(72),sy(61),sx(8),1,ramp[1]);
  r.rect(sx(91),sy(61),sx(7),1,ramp[1]);

  // Two chosen collar courses break the breast into carved blocks without a
  // repeated masonry texture. Their highlight and shadow share the same edge.
  r.rect(sx(57),sy(74),sx(47),1,ramp[4]);
  r.rect(sx(57),sy(75),sx(47),1,ramp[1]);
  r.rect(sx(57),sy(91),sx(38),1,ramp[3]);
  r.rect(sx(57),sy(92),sx(38),1,ramp[1]);
  r.rect(sx(103),sy(77),1,sy(48),ramp[1]);

  // Near forepaw overlaps the far leg. Three broad claw blocks and a worn top
  // bevel add focal detail only at the leading edge.
  shadeBox(r,sx(11),sy(113),sx(68),sy(16),sx(7),ramp,{gain:0.82,falloff:0.18,lateral:0.17});
  r.rect(sx(13),sy(113),sx(32),1,ramp[5]);
  r.rect(sx(16),sy(124),sx(10),sy(5),ramp[2]);
  r.rect(sx(29),sy(123),sx(11),sy(6),ramp[1]);
  r.rect(sx(44),sy(124),sx(12),sy(5),ramp[2]);
  r.rect(sx(14),sy(128),sx(45),1,ramp[0]);

  // Human-scaled door and a short stair descending over the foreleg. The door
  // remains tiny because the monument is thirty to forty people tall.
  const doorX=sx(78),doorW=Math.max(3,Math.round(human*0.45)),doorH=Math.max(5,Math.round(human));
  const doorBase=sy(112);
  r.rect(doorX,doorBase-doorH,doorW,doorH,ramp[0]);
  r.rect(doorX-1,doorBase-doorH-1,doorW+2,1,ramp[4]);
  r.rect(doorX-1,doorBase-doorH,1,doorH,ramp[3]);
  for(let step=0;step<4;step++){
    const y=doorBase+step*sy(3),w=doorW+4+step*4,x=doorX-2-step*2;
    r.rect(x,y,w,1,ramp[4]);
    r.rect(x,y+1,w,Math.max(1,sy(2)),ramp[1]);
  }

  // A single carved flank course and two fixed wear patches are enough to
  // imply age without distributing anonymous chips across every surface.
  r.rect(sx(116),sy(104),sx(45),1,ramp[1]);
  r.rect(sx(131),sy(105),sx(13),1,ramp[3]);
  r.shape([p(64,100),p(70,98),p(74,102),p(70,106),p(64,105)],()=>ramp[2]);
  r.shape([p(154,112),p(162,108),p(169,112),p(165,117),p(157,118)],()=>ramp[1]);

  antialias(r);
  outline(r,ramp[0]);
  return r;
}
