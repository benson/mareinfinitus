import {tideAt,shrikeAt,windAt} from './atmosphere.js';

import {entityAnchor,actorFoot} from './entities.js';
import {steeringTarget,moveOnGround,nearestWalkable} from './navigation.js';
const point=(uid,name)=>{const p=entityAnchor(uid,name);return [p.x,p.y];};

// Shared places, individual gestures. These are world coordinates, not rails.
const STOPS=[[350,237],[366,212],[439,230],[571,248]];
const SLOTS=[[-23,-4],[-7,3],[10,8],[26,0],[-17,14],[11,-9],[29,16]];
const ACTIONS=['survey','comfort','write','read','pray','watch','listen'];
const ENCOUNTERS=[{pair:[1,5],name:'care-and-watch'}, {pair:[2,3],name:'shared-pages'}, {pair:[0,6],name:'quiet-counsel'}, {pair:[4,1],name:'reassurance'}];
const CHORES=[
  {actor:0,name:'warm-hands',route:[point('fire','approach'),point('fire','work')],lookX:entityAnchor('fire','light').x},
  {actor:5,name:'check-instrument',route:[point('instrument-camp','approach'),point('instrument-camp','work')],lookX:entityAnchor('instrument-camp','dial').x},
  {actor:3,name:'check-instrument',route:[point('instrument-camp','workSide')],lookX:entityAnchor('instrument-camp','dial').x},
  {actor:2,name:'sketch',route:[point('caves','sketch')],lookX:entityAnchor('caves','subject').x}
];
export const STRIDE=8;
export function walkFrame(distance){return Math.floor(distance/STRIDE*4)%4;}
function actionFrame(age,id){
  if(age<1.2)return 6;
  if(age>5.8)return 8;
  return id===1||id===2?7+Math.floor((age-1.2)/1.4)%2:7;
}
export function createExpedition(){
  /** @type {{x:number,y:number,born:number,side:number,face:number}[]} */
  const traces=[];
  /** @type {null|{pair:number[],name:string,stage:string,started:number,stageStarted:number,goals:number[][]}} */
  const social=null;
  /** @type {null|{actor:number,name:string,route:number[][],lookX:number,leg:number,stage:string,started:number,stageStarted:number}} */
  const chore=null;
  return {tick:0,accumulator:0,clothPhase:0,time:0,stop:0,phase:'rest',until:24,restStarted:0,restNumber:0,socialStarted:false,choreStarted:false,social,chore,traces,actors:SLOTS.map(([dx,dy],i)=>({
    id:i,x:STOPS[0][0]+dx,y:STOPS[0][1]+dy,vx:0,vy:0,face:1,turnAfter:0,
    frame:4,state:'rest',action:ACTIONS[i],heldUntil:0,actionStarted:0,
    navigation:null,lastTideCycle:-1,lastShrikeCycle:-1,reaction:'',partner:-1,walkDistance:i*.7,lastFootfall:Math.floor(i*.7/(STRIDE/2))
  }))};
}
export function interact(e,index){
  const a=e.actors[index];if(!a)return;
  a.heldUntil=e.time+8;a.actionStarted=e.time;a.state=a.action;a.reaction='';a.frame=6;a.vx=0;a.vy=0;
  if(e.social?.pair.includes(index)){e.social=null;e.actors.forEach(b=>b.partner=-1);}
  if(e.chore?.actor===index)e.chore=null;
}
function updateChore(e,tide){
  if(e.phase!=='rest'){e.chore=null;return;}
  if(!e.choreStarted&&e.time-e.restStarted>5&&tide.stage==='quiet'){
    const plan=CHORES[e.restNumber%CHORES.length],a=e.actors[plan.actor];
    if(a.heldUntil<=e.time&&a.partner<0){
      e.chore={...plan,route:[[a.x,a.y],...plan.route],leg:1,stage:'outbound',started:e.time,stageStarted:e.time};e.choreStarted=true;
    }
  }
  const c=e.chore;if(!c)return;
  const a=e.actors[c.actor];
  // Never hold the expedition indefinitely; interruptions yield to the actor.
  if(a.heldUntil>e.time||e.time-c.started>65){e.chore=null;return;}
  if(c.stage==='work'){
    if(tide.active||e.time-c.stageStarted>7){c.stage='return';c.leg=c.route.length-2;c.stageStarted=e.time;}
  }else{
    const target=c.route[c.leg];
    if(Math.hypot(a.x-target[0],a.y-target[1])<2){
      if(c.stage==='outbound'){
        if(c.leg<c.route.length-1)c.leg++;
        else{c.stage='work';c.stageStarted=e.time;}
      }else if(c.leg>0)c.leg--;else e.chore=null;
    }
  }
}
function faceToward(e,a,x){
  const direction=Math.sign(x-a.x);
  if(direction&&direction!==a.face&&e.time>=a.turnAfter){a.face=direction;a.turnAfter=e.time+2;}
}
function updateSocial(e,tide){
  if(e.phase!=='rest'){e.social=null;e.actors.forEach(a=>a.partner=-1);return;}
  if(!e.socialStarted&&e.time-e.restStarted>3&&tide.stage==='quiet'){
    const encounter=ENCOUNTERS[e.restNumber%ENCOUNTERS.length],pair=encounter.pair;
    if(pair.every(i=>e.actors[i].heldUntil<=e.time)){
      const a=e.actors[pair[0]],b=e.actors[pair[1]],x=(a.x+b.x)/2,y=(a.y+b.y)/2;
      e.social={...encounter,stage:'approach',started:e.time,stageStarted:e.time,goals:[[x-9,y+2],[x+9,y-2]]};e.socialStarted=true;
      e.until=Math.max(e.until,e.time+19);
      a.partner=b.id;b.partner=a.id;
    }
  }
  const s=e.social;if(!s)return;
  // A disturbance interrupts a conversation, rather than superimposing poses.
  if(tide.active||s.pair.some(i=>e.actors[i].heldUntil>e.time)){
    e.social=null;e.actors.forEach(a=>a.partner=-1);return;
  }
  const age=e.time-s.stageStarted;
  if(s.stage==='approach'&&(s.pair.every((id,i)=>Math.hypot(e.actors[id].x-s.goals[i][0],e.actors[id].y-s.goals[i][1])<2)||age>9)){
    s.stage='exchange';s.stageStarted=e.time;
  }else if(s.stage==='exchange'&&age>7){s.stage='release';s.stageStarted=e.time;}
  else if(s.stage==='release'&&age>2){e.social=null;e.actors.forEach(a=>a.partner=-1);}
}
export const FIXED_STEP=1/60;
export function updateExpedition(e,delta){
  // Bounded catch-up after a suspended tab; every consumer uses these ticks.
  e.accumulator+=Math.min(Math.max(delta,0),.25);
  while(e.accumulator+1e-9>=FIXED_STEP){e.accumulator-=FIXED_STEP;stepExpedition(e,FIXED_STEP);}
}
function stepExpedition(e,dt){
  e.time=++e.tick*FIXED_STEP;e.clothPhase+=dt*(.18+windAt(e.time)*.8);
  if(e.phase==='rest'&&e.time>=e.until&&!e.chore&&!e.social&&(e.socialStarted||e.time-e.restStarted>54)){e.stop=(e.stop+1)%STOPS.length;e.phase='walk';e.until=e.time+85;}
  const tide=tideAt(e.time),shrike=shrikeAt(e.time);updateSocial(e,tide);updateChore(e,tide);let arrived=0;
  for(const a of e.actors){
    if((a.id===0||a.id===5)&&shrike.alpha>.55&&a.lastShrikeCycle!==shrike.cycle&&Math.abs(a.x-shrike.x)<230&&a.heldUntil<=e.time){
      a.lastShrikeCycle=shrike.cycle;a.heldUntil=e.time+4;a.actionStarted=e.time;a.reaction='watch-shrike';
    }
    if(tide.active&&a.lastTideCycle!==tide.cycle&&Math.abs(a.x-tide.x)<9){
      a.lastTideCycle=tide.cycle;
      if(a.heldUntil<e.time){a.heldUntil=e.time+4;a.actionStarted=e.time;a.reaction=a.id===1?'shelter':a.id===5?'watch-tide':'notice-tide';}
    }
    if(a.heldUntil>e.time){a.vx=0;a.vy=0;a.state=a.reaction||a.action;a.frame=actionFrame(e.time-a.actionStarted,a.id);if(a.reaction)faceToward(e,a,a.reaction==='watch-shrike'?shrike.x:tide.x);continue;}
    a.reaction='';
    const social=e.social,member=social?social.pair.indexOf(a.id):-1;
    const chore=e.chore?.actor===a.id?e.chore:null;
    if(chore?.stage==='work'){
      a.vx=0;a.vy=0;a.state=chore.name;const age=e.time-chore.stageStarted;
      a.frame=age<1?9:age>5.5?11:10;faceToward(e,a,chore.lookX);arrived++;continue;
    }
    const approach=member>=0&&social.stage==='approach';
    const slot=SLOTS[a.id],goal=chore?chore.route[chore.leg]:approach?social.goals[member]:[STOPS[e.stop][0]+slot[0],STOPS[e.stop][1]+slot[1]],destination=nearestWalkable(...goal)??[a.x,a.y],target=steeringTarget(a,destination),dx=target[0]-a.x,dy=target[1]-a.y,d=Math.hypot(dx,dy),remaining=Math.hypot(destination[0]-a.x,destination[1]-a.y);
    if(member>=0&&social.stage!=='approach'){
      const partner=e.actors[a.partner],age=e.time-social.stageStarted;
      a.vx=0;a.vy=0;a.state=social.name;
      // One speaker, one listener. Sol tends Rachel; Kassad watches the valley.
      const speaking=social.name==='care-and-watch'||(age<3.5?member===0:member===1);
      a.frame=social.stage==='release'?8:speaking?actionFrame(age,a.id):4+Math.floor(age/2)%2;
      faceToward(e,a,social.name==='care-and-watch'&&a.id===5?a.x+40:partner.x);arrived++;continue;
    }
    if((e.phase==='rest'&&!approach&&!chore)||remaining<1.5){
      arrived++;a.vx=0;a.vy=0;
      const beat=((e.time-e.restStarted-a.id*1.3)%15+15)%15;
      a.state=e.phase==='rest'&&beat<8?a.action:'observe';
      a.frame=a.state==='observe'?4+Math.floor(e.time/2.4+a.id)%2:actionFrame(beat,a.id);
      // At a shared stop, quiet observers turn toward their nearest companion.
      const neighbor=e.actors[(a.id+1)%7],look=Math.sign(neighbor.x-a.x);
      if(look&&a.state==='observe'&&e.time>=a.turnAfter){a.face=look;a.turnAfter=e.time+4;}
      continue;
    }
    const speed=5.8+a.id*.10,ease=Math.min(1,d/7);
    let vx=dx/Math.max(d,1)*speed*ease,vy=dy/Math.max(d,1)*speed*.8*ease;
    for(const b of e.actors){
      if(a===b)continue;const sx=a.x-b.x,sy=a.y-b.y,sd=Math.hypot(sx,sy);
      if(sd>0&&sd<13){vx+=sx/sd*(13-sd)*.42;vy+=sy/sd*(13-sd)*.42;}
    }

    const response=1-Math.exp(-dt/.24);a.vx+=(vx-a.vx)*response;a.vy+=(vy-a.vy)*response;
    const oldX=a.x,oldY=a.y;moveOnGround(a,a.vx*dt,a.vy*dt);
    const travel=Math.hypot(a.x-oldX,a.y-oldY);
    a.walkDistance+=travel;a.state='walk';a.frame=walkFrame(a.walkDistance);
    if(Math.abs(a.vx)>.55&&Math.sign(a.vx)!==a.face&&e.time>=a.turnAfter){a.face=Math.sign(a.vx);a.turnAfter=e.time+1.6;}
    const footfall=Math.floor(a.walkDistance/(STRIDE/2));
    if(footfall!==a.lastFootfall){
      const side=footfall%2,foot=actorFoot(a,side);
      e.traces.push({...foot,born:e.time,side,face:a.face});
      a.lastFootfall=footfall;
    }
  }
  if(e.phase==='walk'&&(arrived===7||e.time>e.until)){e.phase='rest';e.restStarted=e.time;e.until=e.time+27;e.restNumber++;e.socialStarted=false;e.choreStarted=false;}
  e.traces=e.traces.filter(t=>e.time-t.born<60).slice(-240);
}
