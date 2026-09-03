import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildArt} from '../src/time-tombs/art/world.js';
import {ENTITIES,PLACEMENTS,PROP_PLACEMENTS,assetFor,entityAnchor,footprintFor,actorFoot,poseFor} from '../src/time-tombs/entities.js';
import {groundContacts,splitDepthParts,surfaceGeometry} from '../src/time-tombs/art/geometry.js';
import {buildShadow} from '../src/time-tombs/art/shadows.js';
import {sunlightAt,shadowPadding} from '../src/time-tombs/lighting.js';
import {buildHeightField,elevationAt,projectGround,rayToGround,terrainOccludes} from '../src/time-tombs/surface.js';
import {actorOrigin} from '../src/time-tombs/transforms.js';
import {isWalkable,clearSegment,findRoute,moveOnGround,OBSTACLES} from '../src/time-tombs/navigation.js';
import {createExpedition,updateExpedition} from '../src/time-tombs/simulation.js';
const art=buildArt(),hash=r=>r.data.reduce((h,v)=>(Math.imul(h,31)+v)>>>0,1);
assert.equal(new Set(ENTITIES.map(e=>e.uid)).size,ENTITIES.length);
assert.equal(OBSTACLES.length,ENTITIES.length,'Every solid placed object participates in navigation');
assert.throws(()=>assetFor('unregistered-object'),/Missing asset geometry/);
for(const [key,r] of art){
  let spec;try{spec=assetFor(key);}catch{continue;}
  assert.deepEqual([r.width,r.height],spec.size,key+' geometry dimensions');
  const parts=splitDepthParts(r,key),g=surfaceGeometry(r,key);
  for(let i=0;i<r.data.length;i++){
    assert.equal(parts.filter(p=>p.data[i]!==255).length,r.data[i]===255?0:1,key+' part partition');
    assert.equal(parts.find(p=>p.data[i]!==255)?.data[i]??255,r.data[i],key+' part changes art');
    assert.ok(g.height[i]>=0);
    assert.equal(g.ground[i]-g.height[i],Math.floor(i/r.width),key+' height/depth reprojection');
  }
}
// Relocating one instance moves all derived facts together, not just the image.
for(const e of ENTITIES){
  const moved={...e,x:e.x+31,base:e.base+17},others=ENTITIES.map(p=>p===e?moved:p);
  assert.deepEqual(footprintFor(moved),footprintFor(e).map(([x,y])=>[x+31,y+17]));
  for(const name of Object.keys(assetFor(e.key).anchors)){
    const a=entityAnchor(e.uid,name),b=entityAnchor(e.uid,name,others);
    assert.deepEqual(b,{x:a.x+31,y:a.y+17});
  }
}
// Independent fixtures: visible boot pixels, including mirrored and kneeling.
for(let id=0;id<7;id++)for(let frame=0;art.has('pilgrim-'+id+'-'+frame);frame++)for(const face of [-1,1]){
  const a={id,frame,face,x:350,y:237},r=art.get('pilgrim-'+id+'-'+frame),origin=actorOrigin(a);
  for(const side of poseFor(frame).planted){
    const foot=actorFoot(a,side),local=poseFor(frame).feet[side],p=projectGround(foot.x,foot.y);
    assert.notEqual(r.get(...local),255,'Contact anchor must be on an actual boot: '+id+'/'+frame);
    const expectedX=origin.x+(face<0?r.width-1-local[0]:local[0]);
    assert.equal(p.x,expectedX);assert.equal(p.y,origin.y+local[1]+1);
  }
}
for(const p of [...PLACEMENTS,...PROP_PLACEMENTS.filter(p=>p.key!=='fire')]){
  for(let frame=0;frame<(art.has(p.key)?1:4);frame++){
    const key=art.has(p.key)?p.key:p.key+'-'+frame,source=art.get(key),spec=assetFor(key),pad=shadowPadding(source);
    for(const t of [0,1300,3500,5000]){
      const origin={x:p.x,y:p.base-spec.pivot[1],baseZ:elevationAt(p.x,p.base)},r=buildShadow(source,sunlightAt(t),key,origin);
      for(const [x,y] of groundContacts(source,key))assert.notEqual(r.get(pad+x,Math.round(y-origin.baseZ)+1),255,key+' contact detached');
      assert.ok(r.data.slice(-r.width).every(v=>v===255),key+' cast clipped at allocation bottom');
    }
  }
}
const movingFrames=[0,1,2,3].map(f=>hash(buildShadow(art.get('pilgrim-0-'+f),sunlightAt(0),'pilgrim-0-'+f)));
assert.ok(new Set(movingFrames).size>1,'Animated shadow must change without a new sun stamp');
const h=buildHeightField();assert.ok(h.maximum>5&&h.maximum<30);
let elevated=0,occlusions=0;
for(let y=100;y<600;y+=2)for(let x=-300;x<1000;x+=2){
  const z=elevationAt(x,y);if(z<2)continue;elevated++;
  const p=projectGround(x,y);assert.equal(p.y,Math.round(y-z));
  if(terrainOccludes(p.x,p.y,y-6))occlusions++;
  const hit=rayToGround(x,y,z+30,{dx:0,dy:0});assert.deepEqual(hit,p,'Vertical light misses receiver surface');
}
assert.ok(elevated>100&&occlusions>100,'Terrain must have traversable, occluding relief');
// Swept movement and a known blocked direct route; A* may not tunnel through.
const wall={uid:'fixture',polygon:[[340,217],[350,217],[350,244],[340,244]]},obstacles=[wall];
const start=[325,230],end=[365,230];
assert.equal(clearSegment(start,end,obstacles),false);
const path=findRoute(start,end,obstacles);assert.ok(path.length>1,'Blocked route needs a real detour');
let previous=start;for(const waypoint of path){assert.ok(clearSegment(previous,waypoint,obstacles));previous=waypoint;}
const pilgrim={x:70,y:248,vx:40,vy:0,navigation:null};
// Start safely to the left of the real western instrument, not inside its margin.
pilgrim.x=60;moveOnGround(pilgrim,40,0);assert.ok(pilgrim.x<70,'Fast movement tunnels through instrument');
const run=hz=>{const e=createExpedition();for(let i=0;i<hz*120;i++)updateExpedition(e,1/hz);return e;};
const a=run(30),b=run(120);a.accumulator=0;b.accumulator=0;assert.deepEqual(a,b,'Render cadence changes simulation');
const before=JSON.stringify(a);updateExpedition(a,0);assert.equal(JSON.stringify(a),before,'Pause advances animation');
const expedition=createExpedition();for(let i=0;i<36000;i++){
  updateExpedition(expedition,1/60);
  for(const actor of expedition.actors)assert.ok(isWalkable(actor.x,actor.y),'Actor enters solid footprint at '+expedition.time);
}
const scene=await readFile(new URL('../src/time-tombs/TimeTombsScene.ts',import.meta.url),'utf8');
assert.ok(scene.indexOf('this.updateShadows(light);')>scene.indexOf('if(key!==s.key)'),'Shadow sampled before pose selection');
assert.match(scene,/TERRAIN_REVISION/);assert.match(scene,/setDepth\(-700\)/);
assert.doesNotMatch(scene,/this\.clothPhase|fillRect\(285|groundY\),1,2/);
console.log('Geometry validation passed: registry, every pose contact, depth partitions, terrain receivers, current-frame shadows, swept collisions, 30/120 Hz replay.');
