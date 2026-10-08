import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
import {TILE_SCENES} from '../src/time-tombs/art/tile-scenes.js';
import {assemble} from '../src/time-tombs/art/tiles/assemble.js';
import {INDEX} from '../src/time-tombs/art/palette.js';
import {buildArt} from '../src/time-tombs/art/world.js';
import {colorCount,layerColors} from '../src/time-tombs/art/palette-audit.js';
import {composeEstablishing} from '../src/time-tombs/art/stage-study.js';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'output/time-tombs/review');
await fs.mkdir(out,{recursive:true});
const art=buildArt(),summary={sprites:{},layers:layerColors(art),frame:colorCount(composeEstablishing(2.5))};
for(const s of TILE_SCENES){
 const args=['scripts/render-compare.mjs','--reference',s.reference+'.png','--crop',s.crop.join(','),'--sprite','src/time-tombs/art/'+s.module+'.js#'+s.builder,'--previous','output/time-tombs/before-tiles/'+s.key+'.png','--output','output/time-tombs/review/'+s.key+'-compare.png'];
 const run=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(run.status!==0)throw Error(run.stderr);
 const names=[...new Set(s.map.map(p=>p.name))],cols=4,cw=244,ch=194,layers=[];
 const refPath=path.join(root,'docs/art-direction/reference/genesis',s.reference+'.png');
 const tileCrops={obelisk:[194,102],sphinx:[4,162],jade:[246,165],crystal:[50,86],palace:[4,111],caves:[282,174]};
 const [left,top]=tileCrops[s.key],crop={left,top,width:16,height:24};
 const ref=await sharp(refPath).extract(crop).resize(96,144,{kernel:'nearest'}).png().toBuffer();
 for(const [i,name] of names.entries()){
  const p=s.map.find(p=>p.name===name),t=s.vocab[name],r=assemble([{name,x:0,y:0,shift:p.shift}],s.vocab,INDEX[s.ramp],t.w,t.h);
  const tile=await sharp(Buffer.from(r.toRGBA()),{raw:{width:t.w,height:t.h,channels:4}}).resize(t.w*6,t.h*6,{kernel:'nearest'}).png().toBuffer();
  const x=i%cols*cw,y=Math.floor(i/cols)*ch;
  const label=Buffer.from('<svg width="244" height="36"><g font-family="Consolas" font-size="12" fill="#b6b6db"><text x="8" y="14">'+name+'</text><text x="8" y="31">Reference</text><text x="124" y="31">Tile</text></g></svg>');
  layers.push({input:label,left:x,top:y},{input:ref,left:x+8,top:y+40},{input:tile,left:x+124,top:y+40});
 }
 await sharp({create:{width:cols*cw,height:Math.ceil(names.length/cols)*ch,channels:4,background:'#09051c'}}).composite(layers).png().toFile(path.join(out,s.key+'-tiles-6x.png'));
 summary.sprites[s.key]={tiles:names.length,colors:colorCount(art.get(s.key))};
}
await fs.writeFile(path.join(out,'palette-report.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
