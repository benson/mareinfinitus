import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {buildPorcelainArt,composePorcelain} from '../src/time-tombs/porcelain/art.js';
import {TERRAIN} from '../src/time-tombs/porcelain/tiles/terrain.js';
import {MONUMENT_MAPS} from '../src/time-tombs/porcelain/maps/monuments.js';
import {MONUMENTS} from '../src/time-tombs/porcelain/layout.js';
import {R} from '../src/time-tombs/porcelain/palette.js';
import {sheet,assemble} from '../src/time-tombs/art/tiles/assemble.js';
const out='output/time-tombs/porcelain',reference='docs/art-direction/reference/scene-studies/seeded-four/01-porcelain-dawn-v3.png';
await fs.mkdir(out,{recursive:true});
const raster=composePorcelain(),art=buildPorcelainArt();
const png=async(r,scale=1,gray=false)=>{let s=sharp(r.toRGBA(),{raw:{width:r.width,height:r.height,channels:4}}).resize(r.width*scale,r.height*scale,{kernel:'nearest'});if(gray)s=s.grayscale();return s.png().toBuffer();};
await fs.writeFile(path.join(out,'native.png'),await png(raster));await fs.writeFile(path.join(out,'native-4x.png'),await png(raster,4));await fs.writeFile(path.join(out,'native-gray.png'),await png(raster,4,true));
// Reference is displayed intact beside the translation, never sampled into art.
const translated=await sharp(await png(raster)).extract({left:120,top:0,width:720,height:360}).resize(1440,720,{kernel:'nearest'}).png().toBuffer();
const ref=await sharp(reference).resize(1440,720).png().toBuffer();
await sharp({create:{width:1440,height:1440,channels:4,background:'#dde3cd'}}).composite([{input:ref,left:0,top:0},{input:translated,left:0,top:720}]).png().toFile(path.join(out,'reference-compare.png'));
const crops=[['Crystal / mineral planes',262,37,132,106],['Sphinx / masonry & contact',580,157,164,121],['Terraces / connected geology',90,180,150,120],['Camp / rim, props & people',510,278,340,82],['Caves / openings',426,73,146,80],['Horizon / atmosphere',120,0,420,64]];
const rows=[];for(const [label,left,top,width,height]of crops){const crop=await sharp(await png(raster)).extract({left,top,width,height}).resize(width*4,height*4,{kernel:'nearest'}).png().toBuffer();rows.push({label,input:crop,width:width*4,height:height*4});}
let y=0;const all=[];for(const row of rows){all.push({input:row.input,left:0,top:y});y+=row.height+12;}
await sharp({create:{width:1680,height:y,channels:4,background:'#dde3cd'}}).composite(all).png().toFile(path.join(out,'materials-4x.png'));
await sharp(path.join(out,'materials-4x.png')).grayscale().png().toFile(path.join(out,'materials-gray.png'));
for(const m of MONUMENTS){const {vocab}=MONUMENT_MAPS[m.key];await fs.writeFile(path.join(out,m.key+'-tiles-6x.png'),await png(sheet(vocab,R[m.ramp],art.get(m.key)),6));}
const refs={palace:['castlevania-bloodlines',4,111],crystal:['sonic-spinball',50,86],caves:['earthworm-jim',282,174],obelisk:['castlevania-bloodlines',194,102],jade:['pitfall',246,165],sphinx:['castlevania-bloodlines',4,162]};
for(const m of MONUMENTS){const {vocab,map}=MONUMENT_MAPS[m.key],[ref,x,y]=refs[m.key],names=[...new Set(map.map(p=>p.name))],tiles=[];
 const crop=await sharp('docs/art-direction/reference/genesis/'+ref+'.png').extract({left:x,top:y,width:16,height:24}).resize(96,144,{kernel:'nearest'}).png().toBuffer();
 for(const [i,name]of names.entries()){const t=vocab[name],p=map.find(p=>p.name===name),r=assemble([{name,x:0,y:0,shift:p.shift}],vocab,R[m.ramp],t.w,t.h);tiles.push({input:crop,left:i%4*220,top:Math.floor(i/4)*156},{input:await png(r,6),left:i%4*220+110,top:Math.floor(i/4)*156});}
 await sharp({create:{width:880,height:Math.ceil(names.length/4)*156,channels:4,background:'#dde3cd'}}).composite(tiles).png().toFile(path.join(out,m.key+'-genesis-6x.png'));
}
const bodies=[];let poseY=0;for(let id=0;id<7;id++){const frames=[...art].filter(([key])=>key.startsWith('person-'+id+'-'));for(let f=0;f<frames.length;f++)bodies.push({input:await png(frames[f][1],4),left:f*56,top:poseY});poseY+=88;}
await sharp({create:{width:672,height:poseY,channels:4,background:'#dde3cd'}}).composite(bodies).png().toFile(path.join(out,'pilgrim-poses-4x.png'));
console.log('Porcelain review artifacts: '+path.resolve(out));
