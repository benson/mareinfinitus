import {PATHS,MONUMENTS,PROPS,rimY} from './layout.js';
export const HOMES=[[528,326],[550,332],[570,339],[592,325],[607,341],[565,318],[621,345]];
export const ROLES=['surveying the approaches','caring for Rachel','working on the Cantos','taking instrument readings','praying','watching the valley','keeping vigil'];
const CHORES=[[544,322],[555,332],[581,346],[646,345],[611,333],[591,311],[630,323]];
const ids=p=>p.join(',');
const nodes=new Map(),edges=new Map();
for(const path of PATHS)for(let i=0;i<path.length;i++){
 const key=ids(path[i]);nodes.set(key,path[i]);if(!edges.has(key))edges.set(key,new Set());
 if(i){const prev=ids(path[i-1]);edges.get(prev).add(key);edges.get(key).add(prev);}
}
// Ground solids are the placed foundations, never their upright silhouettes.
export const SOLIDS=[...MONUMENTS.filter(m=>m.key!=='caves').map(m=>({id:m.key,left:m.x+3,right:m.x+m.width-3,top:m.base-3,bottom:m.base-1})),...PROPS.map((p,i)=>({id:p.key+i,left:p.x-1,right:p.x+(p.key==='pavilion'?68:p.key==='tent'?36:p.key==='instrument'?12:10),top:p.base-5,bottom:p.base+1}))];
function nearest(p){return [...nodes].reduce((best,n)=>Math.hypot(n[1][0]-p[0],n[1][1]-p[1])<Math.hypot(best[1][0]-p[0],best[1][1]-p[1])?n:best);}
function graphPath(a,b){
 const start=nearest(a)[0],end=nearest(b)[0],queue=[start],prev=new Map([[start,null]]);
 for(let i=0;i<queue.length;i++){const key=queue[i];if(key===end)break;for(const next of edges.get(key))if(!prev.has(next)){prev.set(next,key);queue.push(next);}}
 if(!prev.has(end))throw Error('Disconnected porcelain path');
 const out=[];for(let key=end;key!==null;key=prev.get(key))out.unshift(nodes.get(key));return out;
}
export function route(a,b){
 const gate=PATHS[0][0];
 if(a[1]>300&&b[1]>300)return [b];
 const valley=graphPath(a[1]>300?gate:a,b[1]>300?gate:b);
 return [...(a[1]>300?[gate]:[]),...valley,b];
}
export function segmentBlocked(a,b){
 for(const s of SOLIDS){
  let lo=0,hi=1;
  for(const [v,d,min,max]of [[a[0],b[0]-a[0],s.left,s.right],[a[1],b[1]-a[1],s.top,s.bottom]]){
   if(Math.abs(d)<1e-9){if(v<min||v>max){lo=2;break;}}
   else {const t0=(min-v)/d,t1=(max-v)/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}
  }
  if(lo<=hi)return s.id;
 }
 return null;
}
function campRoute(a,b){
 if(!segmentBlocked(a,b))return [b];
 // Bounded visibility graph through authored camp aisle corners.
 const points=[a,b,[626,348],[630,329],[646,350],[648,328],[620,313]],queue=[0],prev=new Map([[0,null]]);
 for(let i=0;i<queue.length;i++){const k=queue[i];for(let j=1;j<points.length;j++)if(!prev.has(j)&&!segmentBlocked(points[k],points[j])){prev.set(j,k);queue.push(j);}}
 if(!prev.has(1))throw Error('No camp aisle to destination');
 const out=[];for(let i=1;i!==0;i=prev.get(i))out.unshift(points[i]);return out;
}
export function createDawnExpedition(){
 /** @type {Array<{x:number,y:number,born:number,id:number,side:number}>} */
 const footprints=[];
 return {time:0,accumulator:0,footprints,tide:false,actors:HOMES.map(([x,y],id)=>({id,role:ROLES[id],x,y,vx:0,vy:0,facing:1,frame:4,state:'rest',phase:0,hold:10+id*2,route:[],distance:0,traceAt:0,response:0,journeys:0}))};
}
function setRoute(a,destination){a.route=a.y>300&&destination[1]>300?campRoute([a.x,a.y],destination):route([a.x,a.y],destination);a.state='walking';}
function next(a){
 a.phase=(a.phase+1)%6;
 if(a.phase===1){setRoute(a,CHORES[a.id]);return;}
 if(a.phase===2){a.state=a.role;a.hold=12+a.id;return;}
 if(a.phase===3){
  if(a.id===0||a.id===5){setRoute(a,a.id===0?[518,241]:[525,246]);a.journeys++;}
  else {setRoute(a,[HOMES[a.id][0]-8,HOMES[a.id][1]-5]);}return;
 }
 if(a.phase===4){a.state=(a.id===0||a.id===5)?'studying the Jade Tomb':'listening';a.hold=12;return;}
 if(a.phase===5){setRoute(a,HOMES[a.id]);return;}
 a.state='rest';a.hold=26+a.id*2;
}
function step(s,dt){
 s.time+=dt;s.tide=s.time%160>122&&s.time%160<132;
 for(const a of s.actors){
  a.vx=0;a.vy=0;
  if(a.response>0){a.response-=dt;a.frame=6+Math.min(2,Math.floor((4-a.response)/1.4));continue;}
  if(s.tide){a.frame=7;continue;}
  if(a.route.length){
   const target=a.route[0],dx=target[0]-a.x,dy=target[1]-a.y,length=Math.hypot(dx,dy),speed=a.y>300?7.5:5;
   if(length<.01){a.route.shift();if(!a.route.length)next(a);continue;}
   const dist=Math.min(length,speed*dt),x=a.x+dx/length*dist,y=a.y+dy/length*dist;
   const blocker=segmentBlocked([a.x,a.y],[x,y]);
   if(blocker){a.state='waiting at '+blocker;a.frame=4;continue;}
   const crowded=s.actors.some(b=>b.id<a.id&&Math.hypot(b.x-x,b.y-y)<(y>300?4:1.6));
   if(crowded){a.frame=4;continue;}
   a.vx=dx/length*speed;a.vy=dy/length*speed;a.x=x;a.y=y;a.distance+=dist;a.frame=Math.floor(a.distance/(y>300?2:1.4))%4;if(Math.abs(dx)>.05)a.facing=dx<0?-1:1;
   if(a.distance-a.traceAt>3){a.traceAt=a.distance;s.footprints.push({x:Math.round(x),y:Math.round(y),born:s.time,id:a.id,side:Math.floor(a.distance/3)%2});}
  }else {a.hold-=dt;a.frame=a.phase===2?6+Math.floor(s.time/2)%3:a.phase===4?6:4+Math.floor(s.time/3)%2;if(a.hold<=0)next(a);}
 }
 s.footprints=s.footprints.filter(p=>s.time-p.born<200).slice(-1400);
}
export function updateDawn(s,delta){s.accumulator+=Math.min(.25,Math.max(0,delta));while(s.accumulator+1e-10>=1/60){step(s,1/60);s.accumulator-=1/60;}}
export function interactDawn(s,id){const a=s.actors[id];if(a){a.response=4;a.facing=-a.facing;}}
export function actorBand(y){return y>300?'person':y>282?'ramp':'tiny';}
export function actorFactor(y){return y<=278?.7:y<=292?.7+(y-278)/14*.2:y<306?.9+(y-292)/14*.1:1;}
export function groundAt(x,y){return {x,y,elevation:y>=rimY(x)&&x>=328?18:0,band:actorBand(y)};}
