import {attachmentPoint} from './transforms.js';
import {projectGround} from './surface.js';
// Shared slow wind drives cloth, smoke and brief sand hops. Terrain and its
// material patterns never slide. Particle positions are analytic, so resize cannot reset
// them and nothing accumulates into a sliding carpet of dots.
const clamp=v=>Math.max(0,Math.min(1,v));
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const SOURCES=[[-186,314],[-12,239],[129,236],[205,277],[362,270],[466,236],[601,278],[788,354],[988,460],[302,407]];
export function windAt(time){
  const phase=(time%34)/34,burst=Math.sin(Math.PI*clamp((phase-.50)/.35));
  return .18+.72*burst*burst;
}
export function tideAt(time){
  const cycle=Math.floor(time/84),age=time%84,phase=(age-56)/18;
  const stage=age<48?'quiet':age<56?'forewarning':age<74?'crossing':age<80?'settling':'quiet';
  const warning=stage==='forewarning'?Math.sin((age-48)/8*Math.PI/2):stage==='crossing'?1:stage==='settling'?(80-age)/6:0;
  return {cycle,phase,stage,warning,active:phase>0&&phase<1,amount:phase>0&&phase<1?Math.sin(phase*Math.PI):0,x:250+phase*390};
}
// One front, not a luminous river: small local disturbances share its timing.
export function tideDustAt(time){
  const tide=tideAt(time),grains=[];
  if(!tide.active)return grains;
  for(let i=0;i<36;i++){
    const x=262+hash(i*5)*360,y=180+hash(i*5+1)*89;
    const lift=clamp(1-Math.abs(x-tide.x)/32)*tide.amount;
    if(lift>.08){const p=projectGround(x+Math.sin(i)*lift*3,y);grains.push({x:p.x,y:Math.round(p.y-lift*(3+hash(i+2)*7)),alpha:lift*.48});}
  }
  return grains;
}
export function instrumentAt(time,x){
  const tide=tideAt(time),local=tide.active?clamp(1-Math.abs(x-tide.x)/64):0;
  const warning=tide.stage==='forewarning'?tide.warning:0;
  const strength=Math.max(local,warning*.65);
  return {strength,frame:strength>.12?1+Math.floor(time*.85+x*.01)%3:0};
}
export function tombLightAt(time,key){
  const offsets={sphinx:8,palace:41,crystal:0,obelisk:27,jade:65,caves:83};
  const age=(time+(offsets[key]||0))%104;
  const amplitude=age<14?Math.sin(age/14*Math.PI)**2:0;
  return {alpha:amplitude*(key==='crystal'?.7:.42),frame:key==='crystal'?Math.min(63,Math.floor(age/14*64)):0};
}
// A held distant silhouette. No flashing, chasing, or camera-facing jump scare.
export function shrikeAt(time){
  const cycle=Math.floor(time/180),age=time%180-42;
  const positions=[[419,151],[180,176],[578,170]];
  const [x,base]=positions[cycle%positions.length];
  return {cycle,x,base,active:age>=0&&age<22,alpha:age>=0&&age<22?Math.min(age/2.5,(22-age)/4,1)*.82:0};
}
export function tombResponseAt(key,age){
  const active=age>=0&&age<9;
  return {active,alpha:active?Math.sin(age/9*Math.PI)**2*.85:0,frame:key==='crystal'?Math.min(63,Math.max(0,Math.floor(age/9*64))):0};
}
export function sandAt(time){
  const grains=[];
  for(let s=0;s<SOURCES.length;s++)for(let i=0;i<9;i++){
    const cycle=Math.floor(time/34),start=cycle*34+17+s*.25+i*.17,age=time-start;
    const life=2.3+hash(s*13+i)*1.4;if(age<0||age>=life)continue;
    const [x,y]=SOURCES[s],seed=s*41+i;
    const p=projectGround(x+hash(seed)*24+age*(4+hash(seed+7)*4),y+hash(seed+2)*6);
    grains.push({x:p.x,y:Math.round(p.y-Math.sin(age/life*Math.PI)*(1+hash(seed+3)*3)),alpha:Math.min(age/.5,(life-age)/.7,1)*.34});
  }
  return grains;
}
export function campAt(time){
  const smokeOrigin=attachmentPoint('fire','smoke'),emberOrigin=attachmentPoint('fire','embers');
  const smoke=[],embers=[];
  const newest=Math.floor(time/.8);
  for(let i=newest-12;i<=newest;i++){
    if(i<0)continue;const age=time-i*.8;if(age<0||age>8)continue;
    smoke.push({x:Math.round(smokeOrigin.x+age*(.55+windAt(time)*.6)+Math.sin(age*.75+i)*1.2),y:Math.round(smokeOrigin.y-age*2),alpha:Math.min(age/1.2,(8-age)/3,1)*.22,frame:Math.min(3,Math.floor(age/2))});
  }
  const latest=Math.floor(time/2.8);
  for(let i=latest-2;i<=latest;i++){
    if(i<0)continue;const age=time-i*2.8;if(age<0||age>2.6)continue;
    embers.push({x:Math.round(emberOrigin.x+age*.8+Math.sin(i)*age),y:Math.round(emberOrigin.y-age*4+age*age*.8),alpha:(1-age/2.6)*.7});
  }
  return {smoke,embers};
}
