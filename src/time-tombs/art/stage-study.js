import {INDEX as I} from './palette.js';
import {Raster, dither, prng} from './raster.js';
import {buildObeliskRelit} from './obelisk-relit.js';
import {buildCrystalRelit} from './crystal-relit.js';
import {buildPalaceRelit} from './palace-relit.js';
import {buildSphinxRelit} from './sphinx-relit.js';
import {buildJadeRelit} from './jade-relit.js';
import {buildCanyonWall} from './caves-relit.js';
import {PILGRIM_FRAMES} from './pilgrims.js';
import {buildTent, buildFire, buildInstrument, buildSupplies} from './environment.js';
import {buildSun, buildMoon} from './sky.js';
import {buildWindstone} from './details.js';
import {cycleFrames} from './tiles/assemble.js';

// The establishing shot at stage scale. The world is 1120x360 logical.
// Benson's 3440x1440 ultrawide sees an 860x360 window into it at 4x; 1080p
// sees a 640x360 window at 3x, and smaller screens use 2x. Nothing is ever
// resampled. This file is the reference composed by the live Phaser scene.

// World 1120 wide: the tombs stand apart with valley between them, as in the
// text. The 3440x1440 ultrawide shows an 860-wide window at 4x and pans.
export const STAGE = {width: 1120, height: 360, horizon: 150, viewport: 860};

import {buildSkyStudy,paintRidges,paintValleyFloor,paintWash,paintTerrace,paintOutcrop,paintGravel,paintMoon,paintFireRing,paintWindbreak,paintFootprints,paintCairn,paintForegroundLedge,paintPath,paintRubble,paintGroundShadow,paintSandDrift,paintSecondary} from './stage-materials.js';
export {buildSkyStudy,paintRidges,paintValleyFloor,paintWash,paintTerrace,paintOutcrop,paintGravel,paintMoon,paintFireRing,paintWindbreak,paintFootprints,paintCairn,paintForegroundLedge,paintPath,paintRubble,paintGroundShadow,paintSandDrift,paintSecondary} from './stage-materials.js';

// ---- pilgrims: one strong color per identity -------------------------------------
export const PILGRIMS_RECOLORED=PILGRIM_FRAMES;

// ---- placements: book order from the valley entrance ----------------------------
// Sphinx, Jade, Obelisk, Crystal, Caves, Palace. Each monument stands clear of
// its neighbours against the sky; depth is staggered so nearer bases sit lower.
// `human` is the height of a person at each monument's depth. The text has
// pilgrims "dwarfed by distance, small sticks of color amid the boulders and
// dunes near the Sphinx", a Monolith shot from "thirty meters up on the sheer
// face", an Obelisk whose shadow is "thrown high on the cliff wall". So a
// person on the tomb shelf is 7 px and the tombs are thirty to forty of them
// tall. Doors, gates, steps and cave mouths derive from `human`; masses do not.
// 20 px pilgrims exist only in the foreground camp; on the shelf they are the
// 3x7 specks below. Runtime actors need the same three sizes (20, 12, 7) by band.
export const STANDS = [
  {key: 'caves', build: () => buildCanyonWall({width: 1120, height: 124, human: 5}), x: 0, base: 200, shadow: [0, 0], drift: 0.6},
  {key: 'palace', build: () => buildPalaceRelit({width: 200, height: 240, human: 5}), x: 904, base: 224, shadow: [40, 3], drift: 0.7},
  {key: 'crystal', build: () => buildCrystalRelit({width: 70, height: 228}), x: 690, base: 238, shadow: [44, 3], drift: 0.8},
  {key: 'jade', build: () => buildJadeRelit({width: 150, height: 108, human: 6}), x: 300, base: 224, shadow: [36, 3], drift: 0.75},
  {key: 'obelisk', build: () => buildObeliskRelit({width: 42, height: 240, human: 7}), x: 546, base: 252, shadow: [34, 2], drift: 1},
  {key: 'sphinx', build: () => buildSphinxRelit({width: 190, height: 132, human: 7}), x: 20, base: 250, shadow: [40, 3], drift: 1}
];

// A pilgrim seen from across the valley: three pixels wide, seven tall, one
// identity color, a dark head and feet. This is the book's "small stick of color".
export function tinyPilgrim(index) {
  // The seven-pixel distance sprites share the shelf palette. Foreground
  // identity ramps remain unchanged; purple, gray and green use nearby shelf
  // shades so the distant actors fit the same two palette lines.
  const garment = [I.fire[0], I.linen[2], I.obsidian[3], I.obsidian[2], I.obsidian[1], I.uniform[1], I.jade[2]][index];
  const r = new Raster(3, 7);
  r.set(1, 0, I.obsidian[0]); r.set(1, 1, I.skin[0]);
  r.rect(0, 2, 3, 3, garment); r.set(2, 3, I.obsidian[0]);
  r.set(0, 5, I.obsidian[0]); r.set(2, 5, I.obsidian[0]); r.set(0, 6, I.obsidian[0]); r.set(2, 6, I.obsidian[0]);
  return r;
}

// Runtime layers use the exact same painters and coordinates as the canonical
// study. They are kept separate only so Phaser can preserve picking, depth
// sorting and animation without flattening or resampling the frame.
export function buildStageSky(){return buildSkyStudy(STAGE.width,STAGE.height,STAGE.horizon);}
export function buildStageRidges(){const r=new Raster(STAGE.width,STAGE.height);paintRidges(r,STAGE.horizon);return r;}
export function buildStageMoon(){const r=new Raster(15,15);paintMoon(r,7,7,7);return r;}
export function buildStageGround(){
  const {width,height,horizon}=STAGE,r=new Raster(width,height);
  paintValleyFloor(r,horizon);
  paintWash(r,[[1120,346],[940,332],[760,318],[640,320],[560,334],[520,350]],9,5,horizon);
  paintTerrace(r,0,470,276,6);
  paintPath(r,[[110,360],[170,334],[236,306],[320,293],[412,284],[456,274],[500,264],[566,256],[640,248],[720,240],[810,232],[900,226],[1010,220],[1120,214]],9,3,horizon);
  paintPath(r,[[412,284],[386,272],[360,258],[340,246],[320,236]],5,3,horizon);
  paintPath(r,[[360,258],[290,261],[220,262],[160,263],[100,262]],5,4,horizon);
  paintPath(r,[[412,284],[430,306],[448,330],[464,346],[480,360]],6,4,horizon);
  paintPath(r,[[720,240],[760,234],[800,226],[840,214],[870,206]],3,2,horizon);
  for(const [cx,by,w,h,s] of [[40,340,46,12,1],[372,352,60,14,2],[640,300,30,8,3],[760,262,22,6,4],[1000,320,44,11,5],[840,350,52,12,6],[250,250,18,5,7],[1080,258,20,5,8],[600,330,26,7,9],[470,262,16,5,10],[880,300,34,9,12]])paintOutcrop(r,cx,by,w,h,s);
  for(const [cx,cy,rx,ry,s] of [[120,256,70,5,11],[376,230,50,4,12],[568,256,24,4,13],[726,242,36,4,14],[1000,230,80,5,15]])paintGravel(r,cx,cy,rx,ry,s);
  for(const [x,y] of [[262,300],[390,284],[512,262],[660,246],[804,232],[960,222]])paintCairn(r,x,y);
  paintGravel(r,226,332,70,16,31,.22);
  paintFootprints(r,[[262,312],[330,300],[412,284]],33);
  paintFootprints(r,[[176,328],[146,300],[126,272]],34);
  paintWindbreak(r,148,322,16,7);
  paintRubble(r,216,350,6,30,21);paintFireRing(r,216,346);paintSecondary(r);
  return r;
}
export function buildStageForeground(){
  const r=new Raster(STAGE.width,STAGE.height);
  paintForegroundLedge(r,0,160,334,41);paintForegroundLedge(r,940,1120,330,42);paintForegroundLedge(r,560,700,348,43);
  return r;
}
export function buildStageShadow(stand){
  const ground=buildStageGround(),before=ground.clone(),sprite=stand.build();
  if(stand.shadow[0])paintGroundShadow(ground,stand.x+sprite.width-6,stand.base-1,stand.shadow[0],stand.shadow[1]);
  paintRubble(ground,stand.x+sprite.width/2,stand.base,12,sprite.width*.6,STANDS.indexOf(stand)+3);
  const out=new Raster(STAGE.width,STAGE.height);for(let i=0;i<ground.data.length;i++)if(ground.data[i]!==before.data[i])out.data[i]=ground.data[i];return out;
}
export function buildStageDrift(stand){
  const r=new Raster(STAGE.width,STAGE.height),sprite=stand.build(),seed=60+STANDS.indexOf(stand);
  if(stand.key==='caves')for(let x=120;x<r.width;x+=60)paintSandDrift(r,x,x+50,stand.base,50+x,stand.drift);
  else paintSandDrift(r,stand.x+2,stand.x+sprite.width-3,stand.base,seed,stand.drift);
  return r;
}

// ---- the establishing shot ---------------------------------------------------------
export function composeEstablishing(time = 0) {
  const {width, height, horizon} = STAGE;
  const r = buildSkyStudy(width, height, horizon);
  r.blit(buildSun(Math.floor(time / 4) % 2), 842, 30);
  paintMoon(r, 178, 42, 7);
  paintRidges(r, horizon);
  paintValleyFloor(r, horizon);
  paintWash(r, [[1120, 346], [940, 332], [760, 318], [640, 320], [560, 334], [520, 350]], 9, 5, horizon);

  // a built terrace: the tombs stand on an upper shelf; the camp is on the valley floor
  paintTerrace(r, 0, 470, 276, 6);

  // paths: camp up the ramp between the terraces, then along the valley to each monument
  paintPath(r, [[110, 360], [170, 334], [236, 306], [320, 293], [412, 284], [456, 274], [500, 264], [566, 256], [640, 248], [720, 240], [810, 232], [900, 226], [1010, 220], [1120, 214]], 9, 3, horizon);
  paintPath(r, [[412, 284], [386, 272], [360, 258], [340, 246], [320, 236]], 5, 3, horizon);
  paintPath(r, [[360, 258], [290, 261], [220, 262], [160, 263], [100, 262]], 5, 4, horizon);
  paintPath(r, [[412, 284], [430, 306], [448, 330], [464, 346], [480, 360]], 6, 4, horizon);
  paintPath(r, [[720, 240], [760, 234], [800, 226], [840, 214], [870, 206]], 3, 2, horizon);

  // outcrops: clustered at feet and along the terrace, bigger toward the viewer
  for (const [cx, by, w, h, s] of [[40, 340, 46, 12, 1], [372, 352, 60, 14, 2], [640, 300, 30, 8, 3], [760, 262, 22, 6, 4], [1000, 320, 44, 11, 5], [840, 350, 52, 12, 6], [250, 250, 18, 5, 7], [1080, 258, 20, 5, 8], [600, 330, 26, 7, 9], [470, 262, 16, 5, 10], [880, 300, 34, 9, 12]]) paintOutcrop(r, cx, by, w, h, s);

  // gravel where the monuments have shed stone; cairns along the main path
  for (const [cx, cy, rx, ry, s] of [[120, 256, 70, 5, 11], [376, 230, 50, 4, 12], [568, 256, 24, 4, 13], [726, 242, 36, 4, 14], [1000, 230, 80, 5, 15]]) paintGravel(r, cx, cy, rx, ry, s);
  for (const [x, y] of [[262, 300], [390, 284], [512, 262], [660, 246], [804, 232], [960, 222]]) paintCairn(r, x, y);
  paintSecondary(r);
  // windstones: Sol's standing stones, mid-ground, base-anchored
  for (const [v, x, base] of [[0, 820, 258], [1, 470, 268], [2, 250, 232], [1, 1040, 262]]) { const w = buildWindstone(v); r.blit(w, x, base - w.height + 1); }

  // monuments, far to near
  const sprites = STANDS.map((s) => ({...s, sprite: s.build()}));
  for (const [i, s] of sprites.entries()) {
    if (s.shadow[0]) paintGroundShadow(r, s.x + s.sprite.width - 6, s.base - 1, s.shadow[0], s.shadow[1]);
    paintRubble(r, s.x + s.sprite.width / 2, s.base, 12, s.sprite.width * 0.6, i + 3);
    const ramp=I[s.key==='sphinx'?'stone':s.key==='caves'?'sand':s.key==='palace'||s.key==='obelisk'?'obsidian':s.key];
    const frame=['jade','crystal','palace','obelisk'].includes(s.key)?cycleFrames(s.sprite,[ramp[4],ramp[5]],2)[Math.floor(time*.6)%2]:s.sprite;
    r.blit(frame, s.x, s.base - s.sprite.height + 1);
    if (s.key === 'caves') { for (let x = 120; x < r.width; x += 60) paintSandDrift(r, x, x + 50, s.base, 50 + x, s.drift); }
    else paintSandDrift(r, s.x + 2, s.x + s.sprite.width - 3, s.base, 60 + i, s.drift);
  }

  // pilgrims on the shelf: specks near the Sphinx entrance, the Obelisk and the Jade
  for (const [i, x, y] of [[5, 104, 244], [0, 112, 245], [2, 122, 243], [4, 582, 248], [3, 588, 247], [6, 380, 222], [1, 740, 234]]) r.blit(tinyPilgrim(i), x, y);

  // camp on the valley floor, near the camera: trampled ground, three tents,
  // a windbreak, gear, instruments, a ringed fire as the warmest point in frame
  paintGravel(r, 226, 332, 70, 16, 31, 0.22);
  paintFootprints(r, [[262, 312], [330, 300], [412, 284]], 33);
  paintFootprints(r, [[176, 328], [146, 300], [126, 272]], 34);
  r.blit(buildTent(Math.floor(time * 3) % 4), 174, 306);
  r.blit(buildTent(Math.floor(time * 3 + 1) % 4, 1), 238, 314);
  r.blit(buildTent(Math.floor(time * 3 + 2) % 4), 280, 324);
  paintWindbreak(r, 148, 322, 16, 7);
  r.blit(buildSupplies(), 222, 340);
  r.blit(buildSupplies(), 266, 346);
  r.blit(buildInstrument(Math.floor(time * 2) % 4), 316, 316);
  paintRubble(r, 216, 350, 6, 30, 21);
  paintFireRing(r, 216, 346);
  r.blit(buildFire(Math.floor(time * 6) % 4), 212, 336);

  // 20 px pilgrims only here, in the foreground: three at the fire, two setting out
  const idle = (i) => PILGRIMS_RECOLORED[i][Math.min(4, PILGRIMS_RECOLORED[i].length - 1)];
  const walk = (i, f) => PILGRIMS_RECOLORED[i][f % 4];
  r.blit(idle(1), 196, 328); r.blit(idle(3), 230, 328); r.blit(idle(6), 202, 346);
  const step = Math.floor(time * 6);
  r.blit(walk(5, step), 318 + Math.round(time * 8) % 40, 306);
  r.blit(walk(0, step + 2), 302 + Math.round(time * 8) % 40, 314);

  // foreground: near rock shelves in the bottom corners, in front of everything
  paintForegroundLedge(r, 0, 160, 334, 41);
  paintForegroundLedge(r, 940, 1120, 330, 42);
  paintForegroundLedge(r, 560, 700, 348, 43);
  return r;
}
