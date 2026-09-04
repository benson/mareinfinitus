import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {TOMB_BUILDERS} from '../src/time-tombs/art/tombs.js';
import {Raster} from '../src/time-tombs/art/raster.js';
import {INDEX} from '../src/time-tombs/art/palette.js';
import {composeArt,buildArt} from '../src/time-tombs/art/world.js';
import {PILGRIM_FRAMES} from '../src/time-tombs/art/pilgrims.js';
import {buildTerrain} from '../src/time-tombs/art/terrain.js';
import {buildDune} from '../src/time-tombs/art/dunes.js';
import {buildShadow} from '../src/time-tombs/art/shadows.js';
import {sunlightAt,shadowPadding} from '../src/time-tombs/lighting.js';
import {WORLD} from '../src/time-tombs/space.js';
import {buildSky} from '../src/time-tombs/art/sky.js';
const out=path.resolve('output/time-tombs');await fs.mkdir(out,{recursive:true});
export async function save(r,name,scale=4,gray=false){let s=sharp(Buffer.from(r.toRGBA()),{raw:{width:r.width,height:r.height,channels:4}}).resize(r.width*scale,r.height*scale,{kernel:'nearest'});if(gray)s=s.grayscale();await s.png().toFile(path.join(out,name+'.png'));}
const selected=process.argv[2];
if(selected==='acceptance'){
  const frame=composeArt(2.5),raw=sharp(Buffer.from(frame.toRGBA()),{raw:{width:frame.width,height:frame.height,channels:4}});
  await save(frame,'live-establishing-3x',3);await save(frame,'live-establishing-gray',3,true);
  const w=Math.round(frame.width/8),h=Math.round(frame.height/8),small=await raw.resize(w,h,{kernel:'lanczos3'}).png().toBuffer();
  await sharp(small).resize(w*8,h*8,{kernel:'nearest'}).png().toFile(path.join(out,'live-establishing-squint.png'));
}
if(selected==='monuments'||selected==='direction'){
  const art=buildArt(),keys=['sphinx','jade','obelisk','crystal','caves','palace'];
  const sheet=new Raster(2310,860,INDEX.sand[1]);let cursor=12;
  const crops=new Raster(720,300,INDEX.sand[1]);
  const portals={sphinx:[146,333],jade:[94,256],obelisk:[33,533],crystal:[64,754],caves:[58,323],palace:[151,499]};
  keys.forEach((key,i)=>{
    const a=art.get(key),x=cursor,y=800-a.height,shadow=buildShadow(a,sunlightAt(0),key);
    sheet.blit(shadow,x-shadowPadding(a),y);sheet.blit(a,x,y);
    // Identical person in every study; no art or person normalization.
    const [px,py]=portals[key],person=art.get('pilgrim-5-4');sheet.blit(person,x+px-17,y+py-17);
    const tile=new Raster(240,150,INDEX.sand[1]),tx=100-px,ty=108-py;
    tile.blit(shadow,tx-shadowPadding(a),ty);tile.blit(a,tx,ty);tile.blit(person,tx+px-17,ty+py-17);
    crops.blit(tile,i%3*240,Math.floor(i/3)*150);cursor+=a.width+26;
  });
  await save(sheet,'monument-lineup-native',1);await save(sheet,'monument-lineup-gray',1,true);
  await save(crops,'monument-thresholds-native',1);await save(crops,'monument-thresholds-4x',4);await save(crops,'monument-thresholds-gray',4,true);
  // Unlike the lineup, this preserves every real placement and depth plane.
  const valley=new Raster(2880,1140,INDEX.sky[0]);
  valley.blit(composeArt(),WORLD.left+300,WORLD.top+490);
  await save(valley,'monument-valley-native',1);await save(valley,'monument-valley-gray',1,true);
}
if(selected==='sky'||selected==='direction'){
  const sky=buildSky(),study=new Raster(320,320);
  study.blit(sky,WORLD.left,WORLD.top+180);
  await save(study,'sky-native',1);await save(study,'sky-4x',4);await save(study,'sky-gray',4,true);
}
if(selected==='contacts'){
  const art=buildArt(),keys=['sphinx','palace','jade','crystal','obelisk','caves'];
  const sheet=new Raster(600,156,INDEX.sand[1]);
  keys.forEach((key,i)=>{
    const source=art.get(key),shadow=buildShadow(source,sunlightAt(0),key),tile=new Raster(200,76,INDEX.sand[1]);
    const x=Math.floor((tile.width-source.width)/2),y=47-source.height;
    tile.blit(shadow,x-shadowPadding(source),y);tile.blit(source,x,y);
    sheet.blit(tile,i%3*200,Math.floor(i/3)*78);
  });
  await save(sheet,'shadow-contacts-native',1);await save(sheet,'shadow-contacts-4x',4);await save(sheet,'shadow-contacts-gray',4,true);
}
if(selected==='craft'||selected==='direction'){
  const art=buildArt(),sheet=new Raster(440,240,INDEX.sand[1]);
  for(let i=0;i<4;i++)sheet.blit(buildDune(i),i%2*220,Math.floor(i/2)*57);
  for(const [key,x,y] of [['tent-1',8,132],['tent-alt-2',52,132],['supplies-0',96,148],['instrument0-1',132,133],['instrument1-2',156,133],['fire-2',179,146],['sun-0',216,126],['moon',239,127],['shrike',262,122],['skimmer-1',296,132],['cloud',8,212],['cloud-alt',228,212]])sheet.blit(art.get(key),x,y);
  for(let f=0;f<4;f++)sheet.blit(art.get('smoke-'+f),8+f*13,179);
  for(let v=0;v<3;v++)sheet.blit(art.get('windstone-'+v),83+v*33,176);
  for(let i=0;i<7;i++)sheet.blit(art.get('pilgrim-'+i+'-4'),303+i*18,174);
  const shadows=new Raster(780,400,INDEX.sand[1]);
  [0,1300,5000].forEach((t,col)=>['palace','sphinx'].forEach((key,row)=>{
    const a=art.get(key),tile=new Raster(260,200,INDEX.sand[1]);
    const x=40-(key==='sphinx'?110:119),y=125-a.height;
    tile.blit(buildShadow(a,sunlightAt(t),key),x-shadowPadding(a),y);tile.blit(a,x,y);
    shadows.blit(tile,col*260,row*200);
  }));
  for(const [r,name] of [[sheet,'craft-materials'],[shadows,'craft-shadows']]){
    await save(r,name+'-native',1);await save(r,name+'-4x',4);await save(r,name+'-gray',4,true);
  }
}
if(selected==='terrain'){
  const world=composeArt(),valley=new Raster(720,340,INDEX.sky[0]);valley.blit(world,-384,-384);
  await save(valley,'terrain-valley-native',1);await save(valley,'terrain-valley-4x',4);await save(valley,'terrain-valley-gray',4,true);
  const sheet=new Raster(432,160,INDEX.sand[1]);
  // Quiet, ripples, gravel; crust, lee deposit, exposed rock.
  [[200,267],[457,263],[310,265],[536,222],[608,304],[643,280]].forEach(([x,y],i)=>{
    sheet.blit(buildTerrain({x,y,width:128,height:64}),(i%3)*144,Math.floor(i/3)*80);
  });
  await save(sheet,'terrain-regions-native',1);await save(sheet,'terrain-regions-4x',4);await save(sheet,'terrain-regions-gray',4,true);
}
if(selected==='patterns'){
  const world=composeArt(),r=new Raster(720,320,INDEX.sky[0]);
  r.blit(world,-384,-384);
  await save(r,'patterns-native',1);await save(r,'patterns-4x',4);await save(r,'patterns-gray',4,true);
  const art=buildArt(),sheet=new Raster(120,66,INDEX.sky[2]);
  for(let f=0;f<4;f++)sheet.blit(art.get('skimmer-'+f),f%2*60,Math.floor(f/2)*32);
  await save(sheet,'skimmer-native',1);await save(sheet,'skimmer-4x',4);await save(sheet,'skimmer-gray',4,true);
}
if(!selected||selected==='world'){await save(composeArt(1.2),'world',3);await save(composeArt(1.2),'world-gray',2,true);}
if(selected==='life'){
  const art=buildArt(),r=new Raster(720,340,INDEX.sand[2]);
  for(const [key,x,y] of [['sphinx',8,15],['palace',188,5],['crystal',319,4],['obelisk',375,50],['jade',415,37],['caves',588,62],['tent-2',225,166],['tent-alt-1',271,171],['supplies-0',255,200],['instrument0-2',187,175],['instrument1-1',330,183],['shrike',395,177]])r.blit(art.get(key),x,y);
  for(let v=0;v<3;v++)r.blit(art.get('windstone-'+v),458+v*35,192);
  PILGRIM_FRAMES.forEach((frames,i)=>frames.slice(6,9).forEach((a,f)=>r.blit(a,168+i*51+f*14,249)));
  PILGRIM_FRAMES.forEach((frames,i)=>frames.slice(9).forEach((a,f)=>r.blit(a,168+i*51+f*14,293)));
  await save(r,'life-native',1);await save(r,'life-4x',4);await save(r,'life-gray',4,true);
}
if(!selected||selected==='pilgrims'||selected==='direction'){
  const sheet=new Raster(PILGRIM_FRAMES[0].length*18,7*24,INDEX.sand[2]);
  PILGRIM_FRAMES.forEach((frames,i)=>frames.forEach((r,f)=>sheet.blit(r,3+f*18,2+i*24)));await save(sheet,'pilgrims',5);
}
for(const [name,build] of Object.entries(TOMB_BUILDERS)) {
  if(selected&&selected!==name)continue;
  const asset=build(),canvas=new Raster(asset.width+12,asset.height+12,INDEX.sand[2]);canvas.blit(asset,6,6);await save(canvas,name);await save(canvas,name+'-gray',4,true);
}
console.log(out);
