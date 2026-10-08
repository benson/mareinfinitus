import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildArt} from '../src/time-tombs/art/world.js';
import {composeEstablishing} from '../src/time-tombs/art/stage-study.js';
import {TILE_SCENES} from '../src/time-tombs/art/tile-scenes.js';
import {colorCount,layerColors} from '../src/time-tombs/art/palette-audit.js';
import {layerWidth} from '../src/time-tombs/parallax.js';
import {splitDepthParts,planeAt} from '../src/time-tombs/art/geometry.js';
const art=buildArt(),report={};
for(const {key,map,vocab,size,module} of TILE_SCENES){
 const r=art.get(key),count=new Set(map.map(p=>p.name)).size;
 assert.deepEqual([r.width,r.height],size);assert.ok(count<=30,key+' tile budget');
 for(const p of map){const t=vocab[p.name];assert.ok(t,key+' missing tile');
  assert.ok(t.w<=16&&t.h<=24,key+' tile size '+p.name);
  assert.ok(p.x>=0&&p.y>=0&&p.x+t.w<=size[0]&&p.y+t.h<=size[1],key+' tile outside canvas '+p.name);
 }
 const colors=colorCount(r);assert.ok(colors>=5&&colors<=15,key+' palette');
 const source=await fs.readFile(new URL('../src/time-tombs/art/'+module+'.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\.shape\(|\bdither\(|\bprng\(|shadeBox\(|shadeSphere\(|shadePyramid\(/);
 for(let i=0;i<splitDepthParts(r,key).length;i++){
  const part=art.get(key+'-part-'+i),hover=art.get(key+'-hover-part-'+i);
  assert.deepEqual([...part.data].map(v=>v===255),[...hover.data].map(v=>v===255),key+' hover changes silhouette');
 }
 report[key]={tiles:count,colors};
}
const layers=layerColors(art);for(const [name,count] of Object.entries(layers))assert.ok(count<=31,name+' layer '+count);
const frame=colorCount(composeEstablishing(2.5));assert.ok(frame<=61,'frame colors '+frame);
assert.equal(layerWidth(860,.05),873);assert.equal(layerWidth(860,1.2),1172);
assert.notDeepEqual(art.get('fire-0').data,art.get('fire-1').data);
assert.equal(planeAt('sphinx',30,123),1);assert.equal(planeAt('sphinx',80,80),0);
console.log(JSON.stringify({sprites:report,layers,frame},null,2));
