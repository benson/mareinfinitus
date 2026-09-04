import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildArt,composeArt,PLACEMENTS,PROP_PLACEMENTS} from '../src/time-tombs/art/world.js';
import {Raster,silhouette} from '../src/time-tombs/art/raster.js';
import {PALETTE,TRANSPARENT} from '../src/time-tombs/art/palette.js';
import {STAGE,STANDS,composeEstablishing} from '../src/time-tombs/art/stage-study.js';
import {WORLD} from '../src/time-tombs/space.js';
import {createExpedition,updateExpedition,interact,walkFrame,STRIDE} from '../src/time-tombs/simulation.js';
import {windAt,sandAt,campAt,tideAt,tideDustAt,instrumentAt,shrikeAt} from '../src/time-tombs/atmosphere.js';
import {BOOK_EXCERPTS,BOOK_SOURCE,BOOK_PASSAGES,BOOK_COLLECTIONS} from '../src/time-tombs/book-excerpts.js';

const packs=[];globalThis.window={LivingSceneRuntime:{register(pack){packs.push(pack);}}};
await import('../scenes/mare-infinitus.js');await import('../scenes/time-tombs.js');
assert.deepEqual(packs.map(p=>p.id),['mare-infinitus','time-tombs']);
for(const p of packs){assert.equal(p.fixedPixel,true);for(const field of ['title','shortDescription','source'])assert.ok(p[field]);for(const field of ['landmarks','materials','systems'])assert.ok(p[field].length>=4);}

const hash=r=>createHash('sha256').update(r.data).digest('hex'),art=buildArt(),again=buildArt();
assert.deepEqual(WORLD,{left:0,top:0,width:1120,height:360,groundTop:150,focusX:570,focusY:180,displayScale:4});
assert.deepEqual(STAGE,{width:1120,height:360,horizon:150,viewport:860});
assert.equal(hash(composeArt(2.5)),hash(composeEstablishing(2.5)),'Live acceptance composition diverged from the finished study');
for(const key of ['sky','ridges','ground','foreground'])assert.deepEqual([art.get(key).width,art.get(key).height],[1120,360]);

const sizes={caves:[1120,124],palace:[200,240],crystal:[70,228],jade:[150,108],obelisk:[42,240],sphinx:[190,132]};
for(const stand of STANDS){
  const placed=PLACEMENTS.find(p=>p.key===stand.key),sprite=art.get(stand.key);
  assert.deepEqual([placed.x,placed.base],[stand.x,stand.base],stand.key+' placement is not STANDS');
  assert.deepEqual([sprite.width,sprite.height],sizes[stand.key]);
  assert.ok(art.has(stand.key+'-stage-shadow'));assert.ok(art.has(stand.key+'-stage-drift'));
}
assert.equal(PLACEMENTS.length,6);assert.equal(PROP_PLACEMENTS.filter(p=>p.key.startsWith('instrument')).length,1);
assert.ok(PLACEMENTS.find(p=>p.key==='caves').x===0&&art.get('caves').width===WORLD.width,'Cave Tombs must be the canyon wall');

for(const [key,r] of art){
  assert.ok(Number.isInteger(r.width)&&Number.isInteger(r.height)&&r.width>0&&r.height>0);assert.equal(r.data.length,r.width*r.height);assert.equal(hash(r),hash(again.get(key)),key+' is not deterministic');
  const colors=new Set(r.data);colors.delete(TRANSPARENT);assert.ok(colors.size<=15,key+' exceeds material palette budget');assert.ok([...colors].every(i=>i>=0&&i<PALETTE.length));
  const rgba=r.toRGBA();for(let i=3;i<rgba.length;i+=4)assert.ok(rgba[i]===0||rgba[i]===255,key+' contains blended alpha');
}
const line=new Raster(8,8);line.line(.25,.49,6.6,5.51,0);assert.ok(line.data.some(v=>v!==TRANSPARENT),'Fractional line endpoints were not rounded');

for(let id=0;id<7;id++){
  const count=[0,2,3,5].includes(id)?12:9;
  const full=Array.from({length:count},(_,f)=>art.get(`pilgrim-${id}-${f}`)),ramp=Array.from({length:count},(_,f)=>art.get(`pilgrim-ramp-${id}-${f}`)),tiny=Array.from({length:count},(_,f)=>art.get(`pilgrim-tiny-${id}-${f}`));
  full.forEach(r=>assert.deepEqual([r.width,r.height],[12,20]));ramp.forEach(r=>assert.deepEqual([r.width,r.height],[8,12]));tiny.forEach(r=>assert.deepEqual([r.width,r.height],[3,7]));
  assert.equal(new Set(full.slice(0,4).map(hash)).size,4);assert.equal(new Set(ramp.slice(0,4).map(hash)).size,4);
}
assert.deepEqual([0,2,4,6,8].map(walkFrame),[0,1,2,3,0]);assert.equal(STRIDE,8);

const held=createExpedition();interact(held,0);const heldDistance=held.actors[0].walkDistance;for(let i=0;i<120;i++)updateExpedition(held,1/60);assert.equal(held.actors[0].walkDistance,heldDistance);
const run=hz=>{const e=createExpedition();for(let i=0;i<hz*180;i++)updateExpedition(e,1/hz);e.accumulator=0;return e;};assert.deepEqual(run(30),run(120),'Render cadence changes simulation');
const e=createExpedition(),twin=createExpedition(),states=new Set(),stops=new Set();
for(let i=0;i<36000;i++){updateExpedition(e,1/60);updateExpedition(twin,1/60);stops.add(e.stop);for(const a of e.actors){states.add(a.state);assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.x>=4&&a.x<=1115&&a.y>=154&&a.y<=355);}}
assert.deepEqual(e,twin);assert.equal(stops.size,4);assert.ok(states.has('walk')&&states.has('observe'));

assert.equal(sandAt(0).length,0);assert.deepEqual(sandAt(20),sandAt(20));for(let t=0;t<200;t+=.5){assert.ok(windAt(t)>=0&&windAt(t)<=1);const camp=campAt(t);for(const p of [...sandAt(t),...camp.smoke,...camp.embers])assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.alpha>=0&&p.alpha<=1);}
assert.equal(tideAt(20).active,false);assert.equal(tideAt(63).active,true);assert.ok(instrumentAt(54,323).strength>0);assert.ok(tideDustAt(65).length>0);assert.ok(shrikeAt(50).alpha>.75);

assert.equal(Object.keys(BOOK_EXCERPTS).length,19);assert.match(BOOK_SOURCE,/Dan Simmons/);assert.equal(Object.values(BOOK_COLLECTIONS).flat().length,29);for(const p of Object.values(BOOK_PASSAGES)){assert.ok(p.text.split(/\s+/).length>=45);assert.match(p.source,/Dan Simmons/);}
const ring=new Raster(7,7);ring.rect(1,1,5,5,0);ring.rect(2,2,3,3,TRANSPARENT);const original=hash(ring),outline=silhouette(ring);assert.equal(outline.mask[3*7+3],1);assert.equal(hash(ring),original);

const scene=await readFile(new URL('../src/time-tombs/TimeTombsScene.ts',import.meta.url),'utf8');const tombs=await readFile(new URL('../src/time-tombs/art/tombs.js',import.meta.url),'utf8');const adapter=await readFile(new URL('../scenes/time-tombs.js',import.meta.url),'utf8');
assert.match(scene,/setFilter\(Phaser.Textures.FilterMode.NEAREST\)/);assert.match(scene,/pilgrim-tiny-/);assert.match(scene,/pilgrim-ramp-/);assert.match(scene,/stage-drift/);assert.match(scene,/const levels=\[1,2,3,4\]/);assert.doesNotMatch(scene,/setScale\(|setAngle\(|2\s*\/\s*3/);
assert.match(tombs,/buildObeliskRelit/);assert.doesNotMatch(tombs,/function\s+(stone|volume|portal)\b/);
assert.match(adapter,/dist\/time-tombs\/time-tombs.js\?v=[a-f0-9]{12}/);await access(new URL('../dist/time-tombs/time-tombs.js',import.meta.url));
console.log('Scene validation passed: finished 1120x360 stage, six relit landmarks, three native pilgrim depths, deterministic simulation and canonical acceptance frame.');
