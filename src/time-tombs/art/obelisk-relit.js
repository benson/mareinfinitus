import {INDEX as I} from './palette.js';
import {Raster,fromMask} from './raster.js';
import {antialias,outline,shadeBox,shadePyramid} from './shade.js';

const CARTOUCHE=[
  'ab.',
  '.ca',
  'bb.',
  'a.c',
  '.ba',
  'c..',
  'ab.'
];
const DOOR=[
  '.dd.',
  'dffd',
  'da.d',
  'da.d',
  'da.d',
  'da.d',
  'da.d'
];
const EROSION=[
  'a....',
  'aa...',
  '.a.b.',
  '..bb.',
  '...b.'
];

// The Obelisk keeps its accepted dimensions, placement and human scale. This
// pass changes only its surface language: solid quantised illumination, drawn
// features and decisive edges. There is no procedural texture or dither.
export function buildObeliskRelit({width=42,height=240,human=7}={}){
  const r=new Raster(width,height),ramp=I.obsidian;
  const baseH=Math.max(2,Math.round(human*0.42));
  const bottomY=height-1;
  const lowerY=bottomY-baseH+1;
  const upperY=lowerY-baseH;
  const shaftTop=Math.max(17,Math.round(height*0.075));
  const shaftBottom=upperY-1;
  const frontW=Math.max(15,Math.round(width*0.43));
  const sideW=Math.max(4,Math.round(width*0.12));
  const shaftX=Math.round((width-frontW-sideW)/2);

  // One tall box, darker toward its foot and gently away from the lit edge.
  shadeBox(r,shaftX,shaftTop,frontW,shaftBottom-shaftTop+1,sideW,ramp,{falloff:0.43,lateral:0.22});

  // Pyramidion: the front is a true illuminated volume. A chosen shadow mask
  // deepens its right slope without adding a separate wallpaper pattern.
  const pyramidW=frontW+sideW+2,pyramidX=shaftX-1,pyramidH=shaftTop-2;
  shadePyramid(r,pyramidX,2,pyramidW,pyramidH,ramp,{falloff:0.12});
  const shadowRows=[];
  for(let y=0;y<pyramidH;y++){
    const span=Math.max(1,Math.round((y+1)*pyramidW/pyramidH));
    const dark=Math.max(1,Math.round(span*0.3));
    const start=Math.floor((pyramidW-span)/2),before=start+span-dark;
    shadowRows.push('.'.repeat(before)+'b'.repeat(dark)+'.'.repeat(Math.max(0,pyramidW-before-dark)));
  }
  r.blit(fromMask(shadowRows,{b:ramp[1]}),pyramidX,2);

  // Two thin, fully shaded plinth boxes—not ruled lines—seat the shaft.
  const upperX=shaftX-3,upperFront=frontW+5,upperSide=sideW+1;
  const lowerX=shaftX-5,lowerFront=frontW+8,lowerSide=sideW+2;
  shadeBox(r,upperX,upperY,upperFront,baseH,upperSide,ramp,{falloff:0.18,lateral:0.18});
  shadeBox(r,lowerX,lowerY,lowerFront,baseH,lowerSide,ramp,{falloff:0.2,lateral:0.2});

  // Cartouches are a single designed inscription band. Repetition comes from
  // the authored glyph, not from seeded marks or surface noise.
  const cartouche=fromMask(CARTOUCHE,{a:ramp[1],b:ramp[4],c:ramp[5]});
  const markX=shaftX+Math.round(frontW*0.38);
  for(const y of [shaftTop+32,shaftTop+69,shaftTop+106])r.blit(cartouche,markX,y);

  // The human-derived doorway remains the scale cue at the foot of the front
  // face. Its mask supplies lintel, lit jamb and deep interior explicitly.
  const door=fromMask(DOOR,{a:ramp[0],d:ramp[3],f:ramp[5]});
  const doorX=shaftX+Math.round((frontW-door.width)/2),doorY=shaftBottom-door.height+1;
  r.blit(door,doorX,doorY);

  // One placed abrasion on the shadow face. It is a chosen mask whose shape
  // follows the corner, never a random chip pass.
  r.blit(fromMask(EROSION,{a:ramp[0],b:ramp[2]}),shaftX+frontW-2,shaftTop+139);

  antialias(r);
  outline(r,ramp[0]);
  return r;
}
