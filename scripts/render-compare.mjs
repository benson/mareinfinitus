import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {colorCount,layerColors} from '../src/time-tombs/art/palette-audit.js';
import {buildArt} from '../src/time-tombs/art/world.js';
import {composeEstablishing} from '../src/time-tombs/art/stage-study.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const referenceRoot=path.join(root,'docs','art-direction','reference','genesis');

function usage(message){
  if(message)console.error(message);
  console.error('Usage: node scripts/render-compare.mjs --reference <png> --crop x,y,w,h --sprite <module>#<export> [--args json] [--previous native.png] [--save-sprite native.png] [--background #rrggbb] [--output png]');
  process.exit(2);
}

const options={background:'#09051c',args:'{}'};
for(let i=2;i<process.argv.length;i+=2){
  const key=process.argv[i];
  if(!key?.startsWith('--')||process.argv[i+1]===undefined)usage(`Invalid argument ${key ?? ''}`);
  options[key.slice(2)]=process.argv[i+1];
}
for(const required of ['reference','crop','sprite'])if(!options[required])usage(`Missing --${required}`);

const referencePath=path.resolve(options.reference.includes('/')||options.reference.includes('\\')?root:referenceRoot,options.reference);
if(!fs.existsSync(referencePath))usage(`Reference not found: ${referencePath}`);
const cropValues=options.crop.split(',').map(Number);
if(cropValues.length!==4||cropValues.some(value=>!Number.isInteger(value)))usage('--crop must be x,y,w,h in native pixels');
const [left,top,width,height]=cropValues;
if(left<0||top<0||width<1||height<1)usage('--crop values must be positive and non-zero');

const split=options.sprite.lastIndexOf('#');
if(split<1)usage('--sprite must be a module path followed by #exportName');
const modulePath=path.resolve(root,options.sprite.slice(0,split));
const exportName=options.sprite.slice(split+1);
const module=await import(pathToFileURL(modulePath).href);
const builder=module[exportName];
if(typeof builder!=='function')usage(`Builder ${exportName} was not exported by ${modulePath}`);
let builderArgs;
try{builderArgs=JSON.parse(options.args);}catch{usage('--args must be valid JSON');}
const sprite=builder(builderArgs);
if(!sprite||!Number.isInteger(sprite.width)||!Number.isInteger(sprite.height)||typeof sprite.toRGBA!=='function')usage('Sprite builder must return a Raster');
const colors=colorCount(sprite);
if(colors>15)throw new Error('Sprite exceeds 15 colors: '+colors);
if(options['scene-check']==='true'){
 const layers=layerColors(buildArt()),frame=colorCount(composeEstablishing(2.5));
 for(const [name,count] of Object.entries(layers))if(count>31)throw new Error(name+' layer exceeds 31 colors: '+count);
 if(frame>61)throw new Error('Frame exceeds 61 colors: '+frame);
 console.log(JSON.stringify({palette:{sprite:colors,layers,frame}}));
}

const metadata=await sharp(referencePath).metadata();
if(left+width>(metadata.width??0)||top+height>(metadata.height??0))usage(`Crop ${options.crop} exceeds ${metadata.width}x${metadata.height} reference`);

const reference=await sharp(referencePath).extract({left,top,width,height}).ensureAlpha().raw().toBuffer();
const spriteRgba=Buffer.from(sprite.toRGBA());
const background=options.background;
if(options['save-sprite']){
  const savePath=path.resolve(root,options['save-sprite']);
  fs.mkdirSync(path.dirname(savePath),{recursive:true});
  await sharp(spriteRgba,{raw:{width:sprite.width,height:sprite.height,channels:4}}).png().toFile(savePath);
}
let previous;
if(options.previous){
  const previousPath=path.resolve(root,options.previous);
  if(!fs.existsSync(previousPath))usage(`Previous sprite not found: ${previousPath}`);
  const meta=await sharp(previousPath).metadata();
  previous={
    path:previousPath,
    width:meta.width??0,
    height:meta.height??0,
    raw:await sharp(previousPath).ensureAlpha().raw().toBuffer()
  };
}

async function png(raw,w,h,scale=1,mode='color'){
  let image=sharp(raw,{raw:{width:w,height:h,channels:4}}).flatten({background});
  if(mode==='gray')image=image.grayscale().ensureAlpha();
  if(mode==='squint'){
    const small=await image.resize(Math.max(1,Math.round(w/8)),Math.max(1,Math.round(h/8)),{kernel:'lanczos3'}).png().toBuffer();
    return sharp(small).resize(w*scale,h*scale,{kernel:'nearest'}).png().toBuffer();
  }
  if(scale!==1)image=image.resize(w*scale,h*scale,{kernel:'nearest'});
  return image.png().toBuffer();
}

async function pair(scale,mode){
  const columns=[{raw:reference,width,height},{raw:spriteRgba,width:sprite.width,height:sprite.height}];
  if(previous)columns.splice(1,0,previous);
  const rendered=await Promise.all(columns.map(column=>png(column.raw,column.width,column.height,scale,mode)));
  const gap=8*scale,pad=4*scale,rowWidth=columns.reduce((sum,column)=>sum+column.width*scale,0)+gap*(columns.length-1)+pad*2,rowHeight=Math.max(...columns.map(column=>column.height))*scale+pad*2;
  let x=pad;
  const layers=rendered.map((input,index)=>{
    const layer={input,left:x,top:pad};x+=columns[index].width*scale+gap;return layer;
  });
  return sharp({create:{width:rowWidth,height:rowHeight,channels:4,background}})
    .composite(layers).png().toBuffer();
}

const rows=[await pair(1,'color'),await pair(3,'color'),await pair(3,'gray'),await pair(3,'squint')];
const rowMeta=await Promise.all(rows.map(row=>sharp(row).metadata()));
const gutter=12,sheetWidth=Math.max(...rowMeta.map(meta=>meta.width??0)),sheetHeight=rowMeta.reduce((sum,meta)=>sum+(meta.height??0),0)+gutter*(rows.length-1);
let y=0;
const composites=[];
for(let i=0;i<rows.length;i++){
  composites.push({input:rows[i],left:0,top:y});
  y+=(rowMeta[i].height??0)+gutter;
}

const defaultName=`${path.basename(referencePath,'.png')}-${exportName}-compare.png`;
const outputPath=path.resolve(root,options.output??path.join('output','time-tombs','compare',defaultName));
fs.mkdirSync(path.dirname(outputPath),{recursive:true});
await sharp({create:{width:sheetWidth,height:sheetHeight,channels:4,background}}).composite(composites).png().toFile(outputPath);
// Individual rows stay readable in previews without shrinking a tall sheet.
for (const [i, suffix] of ['1x', '3x', 'gray', 'squint'].entries()) {
  await fs.promises.writeFile(outputPath.replace(/\.png$/i, `-${suffix}.png`), rows[i]);
}
console.log(JSON.stringify({output:outputPath,reference:path.relative(root,referencePath),crop:{left,top,width,height},previous:previous&&{path:path.relative(root,previous.path),width:previous.width,height:previous.height},sprite:{module:path.relative(root,modulePath),export:exportName,width:sprite.width,height:sprite.height},columns:previous?['reference','previous','candidate']:['reference','candidate'],rows:['1x color','3x nearest color','3x nearest grayscale','3x squint']},null,2));
