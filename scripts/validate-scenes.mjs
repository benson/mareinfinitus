import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildArt,PLACEMENTS,PROP_PLACEMENTS} from '../src/time-tombs/art/world.js';
import {Raster,silhouette} from '../src/time-tombs/art/raster.js';
import {PALETTE,TRANSPARENT,INDEX} from '../src/time-tombs/art/palette.js';
import {buildTerrain,TERRAIN_REGIONS} from '../src/time-tombs/art/terrain.js';
import {createExpedition,updateExpedition,interact,walkFrame,STRIDE} from '../src/time-tombs/simulation.js';
import {WORLD} from '../src/time-tombs/space.js';
import {windAt,sandAt,campAt,tideAt,tideDustAt,instrumentAt,tombLightAt,shrikeAt,tombResponseAt} from '../src/time-tombs/atmosphere.js';
import {BOOK_EXCERPTS,BOOK_SOURCE,BOOK_PASSAGES,BOOK_COLLECTIONS} from '../src/time-tombs/book-excerpts.js';
import {findPatterns,MATERIAL_TAPE,patternSampler,patternAt} from '../src/time-tombs/art/material-patterns.js';
import {skimmerAt,skimmerDustAt} from '../src/time-tombs/traffic.js';
import {spatialAt} from '../src/time-tombs/acoustics.js';
import {sunlightAt,shadowPadding} from '../src/time-tombs/lighting.js';
import {buildShadow} from '../src/time-tombs/art/environment.js';
import {GROUNDING_BANDS,groundContacts} from '../src/time-tombs/art/shadows.js';
import {buildDune} from '../src/time-tombs/art/dunes.js';

const packs=[];
globalThis.window={LivingSceneRuntime:{register(pack){packs.push(pack);}}};
await import('../scenes/mare-infinitus.js');
await import('../scenes/time-tombs.js');
assert.deepEqual(packs.map(p=>p.id),['mare-infinitus','time-tombs']);
for(const p of packs){
  assert.equal(p.fixedPixel,true);
  for(const field of ['title','shortDescription','source'])assert.ok(p[field]);
  for(const field of ['landmarks','materials','systems'])assert.ok(p[field].length>=4);
}
const timePack=packs[1];
assert.equal(timePack.rendererVersion,4);
assert.equal(timePack.artDirectionVersion,4);
assert.equal(typeof timePack.mount,'function');

const art=buildArt(),again=buildArt();
assert.match(MATERIAL_TAPE,/^[A-H]{768}$/);
assert.ok(findPatterns('AAABABACDCD').some(p=>p.kind==='run'&&p.length===3));
assert.ok(findPatterns('AAABABACDCD').some(p=>p.kind==='mirror'));
assert.ok(findPatterns('AAABABACDCD').some(p=>p.kind==='echo'));
assert.equal(new Set(findPatterns(MATERIAL_TAPE).map(p=>p.kind)).size,3);
assert.deepEqual(patternAt('stone',3),patternSampler()('stone',3));
assert.notDeepEqual(patternAt('stone',3),patternSampler('ZZZ')('stone',3));
const hash=r=>createHash('sha256').update(r.data).digest('hex');
// Natural materials need connected landforms and negative space, not merely
// a deterministic distribution of the same small stamp.
assert.deepEqual(Object.keys(TERRAIN_REGIONS),['dunes','gravel','drifts','crust','rock']);
const quiet=buildTerrain({x:220,y:272,width:36,height:18});
const ripples=buildTerrain({x:463,y:266,width:120,height:45});
const density=r=>r.data.filter(v=>v!==INDEX.sand[1]).length/r.data.length;
assert.ok(density(quiet)<.01,'Quiet drift turned into blanket texture');
assert.ok(density(ripples)>.07,'Dune lost its connected volume');
// Trace eight-connected dark pixels, allowing a contour to step around a bend.
const seen=new Set();let widestContour=0;
for(let i=0;i<ripples.data.length;i++){
  if(seen.has(i)||ripples.data[i]!==INDEX.sand[0])continue;
  const queue=[i];seen.add(i);let minX=i%ripples.width,maxX=minX;
  for(let k=0;k<queue.length;k++){
    const x=queue[k]%ripples.width,y=Math.floor(queue[k]/ripples.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const xx=x+dx,yy=y+dy,j=yy*ripples.width+xx;
      if(ripples.inside(xx,yy)&&!seen.has(j)&&ripples.data[j]===INDEX.sand[0]){seen.add(j);queue.push(j);}
    }
  }
  widestContour=Math.max(widestContour,maxX-minX);
}
assert.ok(widestContour>=60,'Connected dune collapsed into repeated tiny glyphs');
for(let study=0;study<4;study++){
  const dune=buildDune(study),lit=dune.data.filter(v=>v===INDEX.sand[2]).length,dark=dune.data.filter(v=>v===INDEX.sand[0]).length;
  assert.ok(lit>dune.width*2&&dark>dune.width,'Dunes need filled slopes, not parallel contours');
  assert.equal(hash(dune),hash(buildDune(study)),'Dune authoring changed across builds');
}
const terrain=buildTerrain(),cropBounds={x:451,y:249,width:173,height:87},crop=buildTerrain(cropBounds);
for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++)assert.equal(crop.get(x,y),terrain.get(x+cropBounds.x-WORLD.left,y+cropBounds.y-WORLD.groundTop),'Terrain depends on raster size/tile boundary');
assert.deepEqual([art.get('sky').width,art.get('sky').height],[WORLD.width,WORLD.height]);
assert.equal(WORLD.displayScale,4);
assert.ok(WORLD.top< -200&&WORLD.top+WORLD.height>600,'world needs real sky and ground beyond the old frame');
assert.equal(art.get('ground').height,WORLD.top+WORLD.height-WORLD.groundTop);
const tombSizes={sphinx:[160,110],palace:[110,130],crystal:[40,140],obelisk:[18,70],jade:[120,90],caves:[108,42]};
const ladder=new Set([0,36,73,109,146,182,219,255]);
assert.ok(PALETTE.every(rgb=>rgb.every(v=>ladder.has(v))));
for(const [key,r] of art){
  assert.ok(Number.isInteger(r.width)&&Number.isInteger(r.height));
  assert.equal(r.data.length,r.width*r.height);
  assert.equal(hash(r),hash(again.get(key)),key+' is not deterministic');
  const colors=new Set(r.data);colors.delete(TRANSPARENT);
  assert.ok(colors.size<=15,key+' exceeds its material palette budget');
  assert.ok([...colors].every(i=>i>=0&&i<PALETTE.length),key+' contains an invalid index');
  const rgba=r.toRGBA();
  for(let i=3;i<rgba.length;i+=4)assert.ok(rgba[i]===0||rgba[i]===255,key+' contains blended alpha');
  if(tombSizes[key])assert.deepEqual([r.width,r.height],tombSizes[key]);
}
assert.equal(PLACEMENTS.length,6);
assert.ok(new Set(PLACEMENTS.map(p=>p.base)).size>=5,'landmarks flattened onto a rail');
assert.ok(new Set(PROP_PLACEMENTS.filter(p=>p.key.startsWith('instrument')).map(p=>p.base)).size===4);
for(let actor=0;actor<7;actor++){
  const frames=Array.from({length:[0,2,3,5].includes(actor)?12:9},(_,f)=>art.get('pilgrim-'+actor+'-'+f));
  for(const r of frames)assert.deepEqual([r.width,r.height],[12,20]);
  assert.equal(new Set(frames.slice(0,4).map(hash)).size,4,'walk poses must be distinct for actor '+actor);
  assert.notEqual(hash(frames[4]),hash(frames[5]),'idle poses must differ for actor '+actor);
  assert.notEqual(hash(frames[4]),hash(frames[6]),'held action must differ for actor '+actor);
  assert.equal(new Set(frames.slice(6,9).map(hash)).size,3,'gesture stages must differ for actor '+actor);
  if(frames.length>9)assert.equal(new Set(frames.slice(9).map(hash)).size,3,'errand poses must differ for actor '+actor);
}
// Cadence follows traveled distance, not the wall clock or renderer frame rate.
assert.deepEqual([0,2,4,6,8].map(walkFrame),[0,1,2,3,0]);assert.equal(STRIDE,8);
const held=createExpedition();interact(held,0);const heldDistance=held.actors[0].walkDistance;
for(let i=0;i<120;i++)updateExpedition(held,1/60);
assert.equal(held.actors[0].walkDistance,heldDistance);
// Projected shadows keep fixed allocation/base coordinates while changing with
// their actual shared sun. Both sides of noon must fit without clipping.
for(const p of PLACEMENTS){
  const source=art.get(p.key),morning=buildShadow(source,sunlightAt(0),p.key),later=buildShadow(source,sunlightAt(5000),p.key);
  assert.deepEqual([morning.width,morning.height],[later.width,later.height]);
  assert.notEqual(hash(morning),hash(later),p.key+' shadow ignores sun motion');
  assert.ok(shadowPadding(source)>source.height*.60);
  for(const time of [0,1300,3000,5000]){
    const shadow=buildShadow(source,sunlightAt(time),p.key),closed=silhouette(shadow).mask,pad=shadowPadding(source);
    for(let i=0;i<closed.length;i++)assert.ok(!closed[i]||shadow.data[i]!==TRANSPARENT,p.key+' has a pinhole in its cast shadow');
    // Inspect the actual art, not a constant row also used by the renderer.
    // Composite in world coordinates and require shadow immediately below
    // every solid ground-contact column, including sloped paws and stair edges.
    const [left,right,top]=GROUNDING_BANDS[p.key];
    const combined=shadow.clone();combined.blit(source,pad,0);
    for(let x=left;x<=right;x++){
      let y=source.height-1;while(y>=top&&source.get(x,y)===TRANSPARENT)y--;
      if(y<top)continue;
      assert.equal(combined.get(pad+x,y),source.get(x,y),p.key+' shadow overwrote its body');
      assert.equal(combined.get(pad+x,y+1),INDEX.sand[0],p.key+' sand gap under solid base at '+x+','+y);
    }
    assert.ok(shadow.data.slice(0,shadow.width).every(v=>v===TRANSPARENT),'Projection clipped at top');
    assert.ok(shadow.data.slice(-shadow.width).every(v=>v===TRANSPARENT),'Projection clipped at bottom');
  }
}
// Padded sprite bounds must not detach props either.
for(const p of PROP_PLACEMENTS.filter(p=>p.key!=='fire')){
  const source=art.get(p.key+'-0'),shadow=buildShadow(source,sunlightAt(0),p.key);
  for(const [x,y] of groundContacts(source,p.key))assert.equal(shadow.get(shadowPadding(source)+x,y+1),INDEX.sand[0],p.key+' has a contact gap');
}
assert.ok(sunlightAt(0).dx<0&&sunlightAt(5000).dx>0,'shadows must point away from the sun');
assert.notEqual(sunlightAt(0).dy,sunlightAt(1300).dy,'shadow length must respond to sun elevation');
assert.equal(sandAt(0).length,0);assert.ok(sandAt(20).length>0);assert.equal(sandAt(31).length,0);
assert.deepEqual(sandAt(20),sandAt(20));
for(let t=0;t<200;t+=.5){
  assert.ok(windAt(t)>=0&&windAt(t)<=1);
  const camp=campAt(t);assert.ok(camp.smoke.length<=13&&camp.embers.length<=3);
  for(const p of [...sandAt(t),...camp.smoke,...camp.embers])assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.alpha>=0&&p.alpha<=1);
}
assert.equal(tideAt(20).active,false);assert.equal(tideAt(63).active,true);
assert.deepEqual([40,52,65,77,82].map(t=>tideAt(t).stage),['quiet','forewarning','crossing','settling','quiet']);
assert.equal(instrumentAt(40,435).frame,0);
assert.ok(instrumentAt(54,435).strength>0,'instruments must respond before the crossing');
assert.equal(tideDustAt(52).length,0);assert.ok(tideDustAt(65).length>0);
assert.equal(shrikeAt(30).active,false);assert.ok(shrikeAt(50).alpha>.75);assert.equal(shrikeAt(65).active,false);
assert.notEqual(shrikeAt(50).x,shrikeAt(230).x);
assert.deepEqual([art.get('shrike').width,art.get('shrike').height],[19,30]);
assert.equal(Object.keys(BOOK_EXCERPTS).length,19);assert.match(BOOK_SOURCE,/Dan Simmons/);
assert.equal(Object.values(BOOK_COLLECTIONS).flat().length,29);
for(const p of Object.values(BOOK_PASSAGES)){
  assert.ok(p.text.split(/\s+/).length>=45,'Book excerpts should retain context');
  assert.match(p.source,/Dan Simmons · .+ · (Chapter \d+|Prologue|Epilogue)$/);
  assert.ok(p.document.startsWith('OEBPS/')&&p.paragraphs.length>0);
  p.paragraphs.forEach((v,i)=>{if(i)assert.equal(v,p.paragraphs[i-1]+1,'Do not stitch noncontiguous prose without an ellipsis');});
}
assert.deepEqual([art.get('skimmer-0').width,art.get('skimmer-0').height],[58,24]);
assert.equal(skimmerAt(0).active,false);assert.equal(skimmerAt(105).active,false);
assert.equal(skimmerAt(60).active,true);assert.equal(skimmerAt(290).direction,-1);
assert.notEqual(hash(art.get('skimmer-0')),hash(art.get('skimmer-2')),'Theo needs a distinct greeting pose');
for(let t=18;t<104;t+=.2){
  const a=skimmerAt(t),b=skimmerAt(t+.01);
  assert.ok(Math.abs(b.x-a.x)<.25&&Math.abs(b.y-a.y)<.05,'Flight route must be continuous');
  assert.ok(art.has('skimmer-'+a.frame));
  for(const p of skimmerDustAt(t))assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.alpha>=0&&p.alpha<=.16);
}
assert.equal(tombResponseAt('crystal',10).active,false);assert.equal(tombResponseAt('crystal',-1).active,false);
assert.ok(tombResponseAt('crystal',4).alpha>.7);
for(let t=0;t<216;t+=.1){
  assert.ok(shrikeAt(t).alpha>=0&&shrikeAt(t).alpha<=.82);
  for(const p of tideDustAt(t))assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.alpha>=0&&p.alpha<=.48);
  for(const p of PLACEMENTS){const light=tombLightAt(t,p.key);assert.ok(art.has(p.key+'-light-'+light.frame));assert.ok(light.alpha>=0&&light.alpha<=.7);}
}
for(const p of PLACEMENTS)for(const [key,r] of art){
  if(!key.startsWith(p.key+'-light-'))continue;
  const source=art.get(p.key);r.data.forEach((v,i)=>{if(v!==TRANSPARENT)assert.notEqual(source.data[i],TRANSPARENT,key+' escapes the tomb');});
}
assert.notEqual(hash(art.get('tent-0')),hash(art.get('tent-alt-0')),'camp shelters should have individual materials');
const near=spatialAt({x:285,y:246},{x:285,y:246}),far=spatialAt({x:285,y:246},{x:685,y:246});
assert.equal(near.pan,0);assert.ok(near.gain>far.gain&&far.pan<0);
// Inspection owns enclosed holes without altering the displayed artwork.
const ring=new Raster(7,7);ring.rect(1,1,5,5,0);ring.rect(2,2,3,3,TRANSPARENT);
const original=hash(ring),outline=silhouette(ring);
assert.equal(outline.mask[3*7+3],1);
assert.equal(outline.mask[0],0);
assert.equal(hash(ring),original);
assert.ok(outline.border.length>0);
assert.ok(outline.border.every(([x,y])=>x===0||x===6||y===0||y===6));
const e=createExpedition(),twin=createExpedition();interact(e,0);interact(twin,0);
const start=[e.actors[0].x,e.actors[0].y];const stops=new Set(),states=new Set(),socials=new Set(),socialStages=new Set(),choreStages=new Set(),lastTurns=Array(7).fill(-99),faces=e.actors.map(a=>a.face);
for(let step=0;step<36000;step++){
  updateExpedition(e,1/60);updateExpedition(twin,1/60);stops.add(e.stop);
  if(e.social){socials.add(e.social.name);socialStages.add(e.social.stage);}
  if(e.chore)choreStages.add(e.chore.stage);
  for(const a of e.actors){
    states.add(a.state);
    assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.x>0&&a.x<720&&a.y>100&&a.y<300);
    assert.ok(Number.isInteger(a.frame)&&a.frame>=0&&art.has('pilgrim-'+a.id+'-'+a.frame));
    if(a.state==='walk')assert.equal(a.frame,walkFrame(a.walkDistance));
    if(a.face!==faces[a.id]){assert.ok(e.time-lastTurns[a.id]>=1.19);faces[a.id]=a.face;lastTurns[a.id]=e.time;}
  }
  if(step===120){assert.deepEqual([e.actors[0].x,e.actors[0].y],start);assert.ok(e.actors[0].frame>=6);}
  assert.ok(e.traces.length<=240);
}
assert.deepEqual(e,twin,'simulation must replay deterministically');
assert.equal(stops.size,4);assert.ok(states.has('walk')&&states.has('observe')&&states.has('survey'));
assert.equal(socials.size,4,'all paired vignettes must be reachable');
assert.ok(socialStages.has('approach')&&socialStages.has('exchange')&&socialStages.has('release'));
assert.ok(states.has('shelter')&&states.has('notice-tide'),'pilgrims need local time-tide reactions');
assert.ok(states.has('watch-shrike'),'pilgrims should notice the distant encounter');
for(const state of ['warm-hands','check-instrument','sketch'])assert.ok(states.has(state),'missing contextual activity: '+state);
assert.deepEqual([...choreStages].sort(),['outbound','return','work']);
const interrupted=createExpedition();for(let i=0;i<600;i++)updateExpedition(interrupted,1/60);
assert.ok(interrupted.social);interact(interrupted,interrupted.social.pair[0]);assert.equal(interrupted.social,null);
assert.ok(e.traces.length>0);
const scene=await readFile(new URL('../src/time-tombs/TimeTombsScene.ts',import.meta.url),'utf8');
const main=await readFile(new URL('../src/time-tombs/main.ts',import.meta.url),'utf8');
const adapter=await readFile(new URL('../scenes/time-tombs.js',import.meta.url),'utf8');
assert.match(main,/Phaser.Scale.RESIZE/);assert.match(main,/pixelArt:\s*true/);
assert.match(scene,/setFilter\(Phaser.Textures.FilterMode.NEAREST\)/);
assert.match(scene,/silhouette\(r\)/);assert.match(scene,/setDepth\(Math.round\(a.y\)\)/);
assert.match(scene,/getWorldPoint\(p.x,p.y\)/);
assert.match(scene,/camera.centerOn\(this.worldCenter.x,this.worldCenter.y\)/);
assert.doesNotMatch(scene,/setScale\(|setAngle\(|world-plate|load.spritesheet|2 \/ 3/);
const resize=scene.slice(scene.indexOf('private resizeCamera'),scene.indexOf('  update('));
assert.doesNotMatch(resize,/buildArt|createExpedition|displayScale\s*=/);
assert.match(adapter,/dist\/time-tombs\/time-tombs.js\?v=[a-f0-9]{12}/);
await access(new URL('../dist/time-tombs/time-tombs.js',import.meta.url));
console.log('Scene validation passed: '+art.size+' native rasters, 75 pilgrim poses, restored excerpts, contextual errands, sun-linked shadows, bounded atmosphere, and ten-minute expedition replay.');
