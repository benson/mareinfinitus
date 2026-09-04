import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildArt} from '../src/time-tombs/art/world.js';
import {ENTITIES,PLACEMENTS,PROP_PLACEMENTS,assetFor,entityAnchor,footprintFor,actorFoot,poseFor} from '../src/time-tombs/entities.js';
import {groundContacts,splitDepthParts,surfaceGeometry} from '../src/time-tombs/art/geometry.js';
import {buildShadow} from '../src/time-tombs/art/shadows.js';
import {sunlightAt,shadowPadding} from '../src/time-tombs/lighting.js';
import {buildHeightField,elevationAt,projectGround,terrainOccludes} from '../src/time-tombs/surface.js';
import {actorOrigin} from '../src/time-tombs/transforms.js';
import {isWalkable,clearSegment,findRoute,moveOnGround,OBSTACLES} from '../src/time-tombs/navigation.js';
import {createExpedition,updateExpedition} from '../src/time-tombs/simulation.js';

const art=buildArt(),hash=r=>r.data.reduce((h,v)=>(Math.imul(h,31)+v)>>>0,1);
assert.equal(new Set(ENTITIES.map(e=>e.uid)).size,ENTITIES.length);assert.equal(OBSTACLES.length,ENTITIES.length);assert.throws(()=>assetFor('unregistered-object'),/Missing asset geometry/);
for(const [key,r] of art){let spec;try{spec=assetFor(key);}catch{continue;}assert.deepEqual([r.width,r.height],spec.size,key+' geometry dimensions');const parts=splitDepthParts(r,key),g=surfaceGeometry(r,key);for(let i=0;i<r.data.length;i++){assert.equal(parts.filter(p=>p.data[i]!==255).length,r.data[i]===255?0:1,key+' part partition');assert.ok(g.height[i]>=0);}}
for(const e of ENTITIES){const moved={...e,x:e.x+31,base:e.base+17},others=ENTITIES.map(p=>p===e?moved:p);assert.deepEqual(footprintFor(moved),footprintFor(e).map(([x,y])=>[x+31,y+17]));for(const name of Object.keys(assetFor(e.key).anchors)){const a=entityAnchor(e.uid,name),b=entityAnchor(e.uid,name,others);assert.deepEqual(b,{x:a.x+31,y:a.y+17});}}

for(let id=0;id<7;id++)for(let frame=0;art.has(`pilgrim-${id}-${frame}`);frame++)for(const face of [-1,1]){const a={id,frame,face,x:225,y:338},r=art.get(`pilgrim-${id}-${frame}`),origin=actorOrigin(a,`pilgrim-${id}-${frame}`);for(const side of poseFor(frame).planted){const foot=actorFoot(a,side),local=poseFor(frame).feet[side],p=projectGround(foot.x,foot.y);assert.notEqual(r.get(...local),255);const expectedX=origin.x+(face<0?r.width-1-local[0]:local[0]);assert.equal(p.x,expectedX);assert.equal(p.y,origin.y+local[1]+1);}}
for(const p of PROP_PLACEMENTS.filter(p=>p.key!=='fire'))for(let frame=0;frame<(art.has(p.key)?1:4);frame++){const key=art.has(p.key)?p.key:p.key+'-'+frame,source=art.get(key),spec=assetFor(key),pad=shadowPadding(source),origin={x:p.x-spec.pivot[0],y:p.base-spec.pivot[1],baseZ:0},r=buildShadow(source,sunlightAt(0),key,origin);for(const [x,y] of groundContacts(source,key))assert.notEqual(r.get(pad+x,y+1),255,key+' contact detached');}
for(const p of PLACEMENTS){if(p.key!=='caves')assert.ok(art.get(p.key+'-stage-shadow').data.some(v=>v!==255));assert.ok(art.get(p.key+'-stage-drift').data.some(v=>v!==255));}
const movingFrames=[0,1,2,3].map(f=>hash(buildShadow(art.get('pilgrim-0-'+f),sunlightAt(0),'pilgrim-0-'+f)));assert.ok(new Set(movingFrames).size>1);

const h=buildHeightField();assert.equal(h.maximum,0);assert.equal(elevationAt(300,280),0);assert.deepEqual(projectGround(300,280),{x:300,y:280});assert.equal(terrainOccludes(300,280,280),false);
const wall={uid:'fixture',polygon:[[340,217],[350,217],[350,244],[340,244]]},obstacles=[wall],start=[325,230],end=[365,230];assert.equal(clearSegment(start,end,obstacles),false);const path=findRoute(start,end,obstacles);assert.ok(path.length>1);let previous=start;for(const waypoint of path){assert.ok(clearSegment(previous,waypoint,obstacles));previous=waypoint;}
const pilgrim={x:300,y:338,vx:40,vy:0,navigation:null};moveOnGround(pilgrim,40,0);assert.ok(Number.isFinite(pilgrim.x));
const run=hz=>{const e=createExpedition();for(let i=0;i<hz*120;i++)updateExpedition(e,1/hz);e.accumulator=0;return e;};assert.deepEqual(run(30),run(120));const expedition=createExpedition();for(let i=0;i<18000;i++){updateExpedition(expedition,1/60);for(const actor of expedition.actors)assert.ok(isWalkable(actor.x,actor.y),'Actor enters solid footprint at '+expedition.time);}

const scene=await readFile(new URL('../src/time-tombs/TimeTombsScene.ts',import.meta.url),'utf8');assert.match(scene,/PLACEMENTS\.some\(p=>p\.uid===s\.uid\)\)continue/);assert.match(scene,/stage-shadow/);assert.match(scene,/stage-drift/);assert.doesNotMatch(scene,/setScale\(/);
console.log('Geometry validation passed: STANDS registry, native actor depth grids, static relit contacts, swept routes and deterministic replay.');
