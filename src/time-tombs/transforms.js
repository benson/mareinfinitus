import {assetFor,actorFoot,poseFor,ENTITIES,entityAnchor} from './entities.js';
import {projectGround,elevationAt} from './surface.js';
export function localToWorld(key,pose,point){
  const a=assetFor(key),mirror=pose.face<0;
  const px=mirror?a.size[0]-1-a.pivot[0]:a.pivot[0],x=mirror?a.size[0]-1-point[0]:point[0];
  return {x:pose.x+x-px,y:pose.y+point[1]-a.pivot[1]};
}
export function spriteOrigin(key,pose){
  const a=assetFor(key),p=projectGround(pose.x,pose.y,pose.z??0),pivotX=pose.face<0?a.size[0]-1-a.pivot[0]:a.pivot[0];
  return {x:p.x-pivotX,y:p.y-a.pivot[1]};
}
export function actorOrigin(a){
  const spec=assetFor('pilgrim'),foot=actorFoot(a,poseFor(a.frame).planted[0]);
  const pivotX=a.face<0?spec.size[0]-1-spec.pivot[0]:spec.pivot[0];
  return {x:Math.round(a.x)-pivotX,y:Math.round(a.y-elevationAt(foot.x,foot.y))-spec.pivot[1]};
}
// A sprite attachment has height above its object's foundation, not a second
// independently sampled terrain position at the attachment's image-space y.
export function attachmentPoint(uid,name,entities=ENTITIES){
  const e=entities.find(e=>e.uid===uid),p=entityAnchor(uid,name,entities);
  return {x:p.x,y:p.y-elevationAt(e.x,e.base)};
}
