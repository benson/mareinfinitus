import {ENTITIES,footprintFor,inPolygon} from './entities.js';
import {elevationAt,slopeAt} from './surface.js';
export const ACTOR_RADIUS=3;
export const OBSTACLES=ENTITIES.map(e=>{
  const polygon=footprintFor(e),xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]);
  return {uid:e.uid,polygon,bounds:[Math.min(...xs)-ACTOR_RADIUS,Math.min(...ys)-ACTOR_RADIUS,Math.max(...xs)+ACTOR_RADIUS,Math.max(...ys)+ACTOR_RADIUS]};
});
function edgeDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
export function isWalkable(x,y,obstacles=OBSTACLES){
  if(x< -370||x>1136||y<100||y>752)return false;
  for(const o of obstacles){
    if(o.bounds&&(x<o.bounds[0]||y<o.bounds[1]||x>o.bounds[2]||y>o.bounds[3]))continue;
    const p=o.polygon;
    if(inPolygon(x,y,p)||p.some((a,i)=>edgeDistance(x,y,a,p[(i+1)%p.length])<ACTOR_RADIUS))return false;
  }
  const s=slopeAt(x,y);return Math.hypot(s.x,s.y)<1.1;
}
export function clearSegment(a,b,obstacles=OBSTACLES){
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.max(1,Math.ceil(length));
  for(let i=0;i<=steps;i++)if(!isWalkable(a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps,obstacles))return false;
  return true;
}
export function nearestWalkable(x,y,obstacles=OBSTACLES){
  if(isWalkable(x,y,obstacles))return [x,y];
  for(let radius=1;radius<=64;radius++)for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,nx=x+Math.cos(angle)*radius,ny=y+Math.sin(angle)*radius;
    if(isWalkable(nx,ny,obstacles))return [nx,ny];
  }
  return null;
}
export function findRoute(start,goal,obstacles=OBSTACLES){
  const end=nearestWalkable(...goal,obstacles);if(!end)return [];
  if(clearSegment(start,end,obstacles))return [end];
  const cell=4,key=(x,y)=>x+','+y,sx=Math.round(start[0]/cell),sy=Math.round(start[1]/cell);
  const nodes=new Map(),open=[];
  const root={x:sx,y:sy,g:0,f:0,parent:null};nodes.set(key(sx,sy),root);open.push(root);
  const visited=new Set();let found=null;
  for(let count=0;open.length&&count<7000;count++){
    let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
    const n=open.splice(best,1)[0],nk=key(n.x,n.y);if(visited.has(nk))continue;visited.add(nk);
    const point=n===root?start:[n.x*cell,n.y*cell];
    if(Math.hypot(point[0]-end[0],point[1]-end[1])<10&&clearSegment(point,end,obstacles)){found=n;break;}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const x=n.x+dx,y=n.y+dy,k=key(x,y),p=[x*cell,y*cell];
      if(visited.has(k)||!clearSegment(point,p,obstacles))continue;
      const g=n.g+Math.hypot(dx,dy)*cell+Math.abs(elevationAt(...p)-elevationAt(...point))*.8;
      if(nodes.has(k)&&nodes.get(k).g<=g)continue;
      const next={x,y,g,f:g+Math.hypot(p[0]-end[0],p[1]-end[1]),parent:n};nodes.set(k,next);open.push(next);
    }
  }
  if(!found)return [];
  const path=[end];for(let n=found;n.parent;n=n.parent)path.unshift([n.x*cell,n.y*cell]);
  const smooth=[];let from=start;
  while(path.length){let next=path.length-1;while(next>0&&!clearSegment(from,path[next],obstacles))next--;from=path[next];smooth.push(from);path.splice(0,next+1);}
  return smooth;
}
export function steeringTarget(a,goal){
  const tag=goal.map(v=>v.toFixed(1)).join(',');
  if(!a.navigation||a.navigation.tag!==tag)a.navigation={tag,path:findRoute([a.x,a.y],goal)};
  const path=a.navigation.path;
  while(path.length>1&&Math.hypot(a.x-path[0][0],a.y-path[0][1])<2)path.shift();
  return path[0]??[a.x,a.y];
}
export function moveOnGround(a,dx,dy){
  const start=[a.x,a.y],end=[a.x+dx,a.y+dy];
  if(clearSegment(start,end)){a.x=end[0];a.y=end[1];return;}
  if(clearSegment(start,[end[0],a.y]))a.x=end[0];
  else if(clearSegment(start,[a.x,end[1]]))a.y=end[1];
  else {a.vx=0;a.vy=0;a.navigation=null;}
}
