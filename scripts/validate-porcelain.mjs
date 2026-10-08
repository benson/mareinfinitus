import assert from 'node:assert/strict';
import {buildPorcelainArt,composePorcelain,DAWN_LAYERS} from '../src/time-tombs/porcelain/art.js';
import {MONUMENTS,PATHS} from '../src/time-tombs/porcelain/layout.js';
import {MONUMENT_MAPS} from '../src/time-tombs/porcelain/maps/monuments.js';
import {contacts,monumentShadow} from '../src/time-tombs/porcelain/shadows.js';
import {createDawnExpedition,updateDawn,interactDawn,segmentBlocked,actorBand,actorFactor} from '../src/time-tombs/porcelain/simulation.js';
import {TERRACES,sectionAt} from '../src/time-tombs/porcelain/maps/landscape.js';
const art=buildPorcelainArt(),colors=r=>new Set([...r.data].filter(v=>v!==255)).size;
const report={};
for(const m of MONUMENTS){
 const r=art.get(m.key),{map,vocab}=MONUMENT_MAPS[m.key];
 assert.deepEqual([r.width,r.height],[m.width,m.height]);assert.ok(colors(r)>=5&&colors(r)<=15,m.key+' ramp');
 assert.ok(new Set(map.map(p=>p.name)).size<=30,m.key+' vocabulary budget');
 for(const p of map){const t=vocab[p.name];assert.ok(t.w<=16&&t.h<=24);assert.ok(p.x>=0&&p.y>=0&&p.x+t.w<=r.width&&p.y+t.h<=r.height,m.key+' clipped '+p.name);}
 for(let i=0;i<r.data.length;i++)assert.equal(r.data[i]===255,art.get(m.key+'-hover').data[i]===255,m.key+' hover silhouette');
 const feet=contacts(r,m.key);assert.ok(feet.length>0,m.key+' has no contact');
 for(const [x,y]of feet){assert.notEqual(r.get(x,y),255);assert.equal(r.get(x,y+1),255,m.key+' contact inside body');}
 for(const [dx,dy]of [[.42,.14],[-.35,.2],[0,.1]]){
  const shadow=monumentShadow(r,m.key,dx,dy);
  for(const [x,y]of feet)assert.notEqual(shadow.raster.get(x+shadow.pad,y),255,m.key+' detached shadow');
 }
 report[m.key]={tiles:new Set(map.map(p=>p.name)).size,colors:colors(r),contacts:feet.length};
}
for(const [name]of DAWN_LAYERS)assert.ok(colors(art.get(name))<=31,name+' layer budget');
assert.ok(colors(composePorcelain())<=61,'frame palette');
for(const [id,n]of [[0,12],[1,9],[2,12],[3,12],[4,9],[5,12],[6,9]])for(let f=0;f<n;f++)for(const band of ['person','ramp','tiny']){
 const r=art.get(band+'-'+id+'-'+f),row=band==='person'?18:r.height-1;
 assert.ok(r&&[...Array(r.width).keys()].some(x=>r.get(x,row)!==255),'pose loses ground '+band+id+f);
}
function replay(hz,seconds){const s=createDawnExpedition();for(let i=0;i<hz*seconds;i++)updateDawn(s,1/hz);return s;}
const a=replay(30,180),b=replay(120,180);
assert.deepEqual(a.actors,b.actors,'frame-rate-dependent actors');assert.deepEqual(a.footprints,b.footprints,'frame-rate-dependent traces');
const s=createDawnExpedition(),seen=new Map(s.actors.map(a=>[a.id,new Set()]));
for(let i=0;i<600*60;i++){
 const before=s.actors.map(a=>[a.x,a.y]);updateDawn(s,1/60);
 for(const actor of s.actors){seen.get(actor.id).add(actor.phase);assert.equal(segmentBlocked(before[actor.id],[actor.x,actor.y]),null,'crossed solid');assert.ok(actor.x>=0&&actor.x<960&&actor.y>=0&&actor.y<360);assert.ok(!actor.state.startsWith('waiting at'),'blocked authored route');}
}
for(const phases of seen.values())assert.equal(phases.size,6,'unfinished actor cycle');
assert.ok(s.actors[0].journeys>=3&&s.actors[5].journeys>=3,'no valley excursions');
assert.ok(s.footprints.length>0);const at=s.actors[0].x;interactDawn(s,0);updateDawn(s,1/60);assert.equal(s.actors[0].x,at);assert.ok(s.actors[0].response>0);
for(const y of [282,292,300,306])assert.ok(Math.abs(actorFactor(y-.001)-actorFactor(y+.001))<.001,'parallax discontinuity');
assert.equal(actorBand(239),'tiny');assert.equal(actorBand(290),'ramp');assert.equal(actorBand(320),'person');
// The visible returns and movement corridors must describe the same geography.
for(const path of PATHS)for(let i=1;i<path.length;i++){
 const a=path[i-1],b=path[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
 for(let d=0;d<=length;d+=.5){const x=a[0]+(b[0]-a[0])*d/length,y=a[1]+(b[1]-a[1])*d/length;
  for(const form of TERRACES)if(x>=form.sections[0][0]&&x<form.sections.at(-1)[0]){const [,lip,foot]=sectionAt(form.sections,x);assert.ok(y<=lip+4||y>=foot-1,'path crosses visible cliff: '+form.name);}
 }
}
console.log(JSON.stringify({monuments:report,frameColors:colors(composePorcelain()),replay:'30/120 Hz identical',cycles:'7 complete; 2 valley excursions',traces:s.footprints.length},null,2));
