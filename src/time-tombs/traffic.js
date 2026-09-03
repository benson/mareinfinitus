export const MAX_FLIGHT_ALTITUDE=80;
import {assetFor} from './entities.js';
import {localToWorld} from './transforms.js';
import {projectGround} from './surface.js';
// A supplemental low valley crossing, not a reenactment of a specific chapter.
// Fixed world-space route: resize never changes position, size or encounter age.
export function skimmerAt(time){
  const elapsed=time-18,cycle=Math.max(0,Math.floor(elapsed/230)),age=elapsed-cycle*230;
  const active=elapsed>=0&&age<86,p=Math.max(0,Math.min(1,age/86));
  const direction=cycle%2?-1:1,progress=direction>0?p:1-p;
  const groundY=176+Math.sin(progress*Math.PI*2)*10;
  const altitude=62+Math.sin(p*Math.PI)*(MAX_FLIGHT_ALTITUDE-62);
  const spec=assetFor('skimmer'),groundX=-455+1715*progress+spec.pivot[0],origin={x:groundX-(direction<0?spec.size[0]-1-spec.pivot[0]:spec.pivot[0]),y:groundY-altitude-spec.pivot[1]};
  return {active,cycle,age,direction,...origin,groundX,groundY,altitude,depth:groundY,frame:Math.floor(Math.max(0,age)/1.8)%2};
}

export function skimmerDustAt(time){
  const craft=skimmerAt(time),particles=[];
  if(!craft.active)return particles;
  // A fixed grain detaches into a short-lived curl. It never chases the craft
  // or forms a rope behind it; dust is released at its historical ground point.
  for(let i=Math.floor(craft.age*3)-8;i<=Math.floor(craft.age*3);i++){
    if(i<0)continue;
    const born=18+craft.cycle*230+i/3,age=time-born;
    if(age<0||age>2.4)continue;
    const past=skimmerAt(born),offset=Math.sin(i*2.4)*9,wake=localToWorld('skimmer',{x:past.groundX,y:past.groundY,face:past.direction},assetFor('skimmer').anchors.wake),ground=projectGround(wake.x,wake.y);
    particles.push({x:Math.round(ground.x+offset+age*craft.direction*2),y:Math.round(ground.y+Math.cos(i)*2-Math.sin(age/2.4*Math.PI)*3),alpha:Math.sin(age/2.4*Math.PI)*.16});
  }
  return particles;
}
