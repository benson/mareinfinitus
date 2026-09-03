// Authoritative scene geometry. Local coordinates are native sprite pixels;
// instance (x, base) is a ground-plane pivot. Never copy these into consumers.
const box=(l,t,r,b)=>[[l,t],[r,t],[r,b],[l,b]];
const define=(size,grounding,footprint,planes,anchors={},pivot=[0,size[1]])=>({size,pivot,grounding,footprint,planes,anchors});
export const ASSETS={
  sphinx:define([160,110],[27,132,94],[[31,96],[111,96],[132,103],[97,104],[97,109],[61,109],[61,104],[27,103]],[
    {id:'body',row:103},
    {id:'wings',row:96,regions:[box(0,0,60,79),box(99,0,160,78)]},
    {id:'stairs',row:109,regions:[box(61,100,97,110)]}
  ]),
  palace:define([110,130],[10,104,112],[[10,113],[104,113],[104,120],[83,120],[83,130],[32,130],[32,120],[10,120]],[
    {id:'body',row:120},{id:'spires',row:114,regions:[box(0,0,110,79)]},{id:'stairs',row:130,regions:[box(32,118,83,130)]}
  ]),
  crystal:define([40,140],[2,38,127],[[8,130],[32,130],[39,140],[2,140]],[{id:'shaft',row:134},{id:'plinth',row:140,regions:[box(0,127,40,140)]}]),
  obelisk:define([18,70],[0,17,66],box(0,65,18,70),[{id:'shaft',row:66},{id:'plinth',row:70,regions:[box(0,66,18,70)]}]),
  jade:define([120,90],[4,117,78],[[15,77],[107,77],[118,84],[73,84],[73,90],[45,90],[45,84],[4,84]],[{id:'vault',row:84},{id:'stairs',row:90,regions:[box(45,81,73,90)]}]),
  caves:define([108,42],[0,107,33],box(0,33,108,40),[{id:'rock',row:39}],{sketch:[30,150],subject:[42,42]}),
  tent:define([36,25],[0,35,19],[[5,18],[29,18],[36,25],[0,25]],[{id:'canvas',row:23}],{entry:[20,24]}),
  'tent-alt':define([36,25],[0,35,19],[[5,18],[29,18],[36,25],[0,25]],[{id:'canvas',row:23}],{entry:[20,24]}),
  supplies:define([23,12],[0,22,7],box(0,7,22,12),[{id:'gear',row:12}]),
  fire:define([9,10],[0,8,7],box(0,7,9,10),[{id:'fire',row:10}],{smoke:[4,2],embers:[4,3],light:[4,10],sound:[4,6],work:[13,18],approach:[52,28]}),
  instrument0:define([15,24],[0,14,19],[[7,18],[14,24],[0,24]],[{id:'instrument',row:24}],{dial:[7,12],sound:[7,24],work:[20,28],workSide:[22,32],approach:[-13,-5]}),
  instrument1:define([15,24],[0,14,19],[[7,18],[14,24],[0,24]],[{id:'instrument',row:24}],{dial:[7,12],sound:[7,24],work:[20,28],workSide:[22,32],approach:[-13,-5]}),
  pilgrim:define([12,20],[0,11,17],box(3,17,9,20),[{id:'actor',row:19}],{},[6,19]),
  shrike:define([19,30],[3,15,27],box(3,27,16,30),[{id:'encounter',row:30}]),
  skimmer:define([58,24],[0,57,20],box(3,19,55,24),[{id:'hull',row:24}],{wake:[29,24]},[29,24]),
  'windstone-0':define([14,8],[0,13,5],box(0,5,14,8),[{id:'rock',row:8}]),
  'windstone-1':define([23,12],[0,22,9],box(0,9,23,12),[{id:'rock',row:12}]),
  'windstone-2':define([9,6],[0,8,3],box(0,3,9,6),[{id:'rock',row:6}])
};
export const PLACEMENTS=[
 {uid:'sphinx',key:'sphinx',id:'TT-01',x:24,base:208},
 {uid:'palace',key:'palace',id:'TT-02',x:204,base:169},
 {uid:'crystal',key:'crystal',id:'TT-03',x:334,base:184},
 {uid:'obelisk',key:'obelisk',id:'TT-04',x:398,base:142},
 {uid:'jade',key:'jade',id:'TT-05',x:452,base:214},
 {uid:'caves',key:'caves',id:'TT-06',x:590,base:164}
];
export const PROP_PLACEMENTS=[
 {uid:'camp-west',key:'tent',id:'TT-07',x:241,base:246},
 {uid:'camp-east',key:'tent-alt',id:'TT-07',x:287,base:253},
 {uid:'supplies',key:'supplies',id:'TT-07',x:261,base:257},
 {uid:'fire',key:'fire',id:'TT-07',x:281,base:250},
 {uid:'instrument-west',key:'instrument0',id:'TT-29',x:72,base:248},
 {uid:'instrument-middle',key:'instrument1',id:'TT-29',x:188,base:231},
 {uid:'instrument-camp',key:'instrument0',id:'TT-29',x:428,base:245},
 {uid:'instrument-east',key:'instrument1',id:'TT-29',x:646,base:228}
];
export const STONE_PLACEMENTS=[
 {variant:0,x:153,base:226},{variant:2,x:324,base:192},{variant:0,x:549,base:227},
 {variant:1,x:107,base:288},{variant:0,x:408,base:293},{variant:2,x:618,base:278},
 {variant:1,x:225,base:350},{variant:0,x:571,base:335},{variant:1,x:721,base:410}
].map((p,i)=>({...p,uid:'stone-'+i,key:'windstone-'+p.variant,id:'TT-32'}));
export const ENTITIES=[...PLACEMENTS,...PROP_PLACEMENTS,...STONE_PLACEMENTS];
export function assetName(key){
  if(ASSETS[key])return key;
  if(/^pilgrim-\d+-\d+$/.test(key))return 'pilgrim';
  const base=key.replace(/-\d+$/,'');if(ASSETS[base])return base;
  throw new Error('Missing asset geometry: '+key);
}
export const assetFor=key=>ASSETS[assetName(key)];
export function entityAnchor(uid,name,entities=ENTITIES){
  const e=entities.find(e=>e.uid===uid);if(!e)throw new Error('Missing entity: '+uid);
  const a=assetFor(e.key),point=a.anchors[name];if(!point)throw new Error('Missing attachment: '+uid+'.'+name);
  return {x:e.x+point[0]-a.pivot[0],y:e.base+point[1]-a.pivot[1]};
}
export function footprintFor(e){const a=assetFor(e.key);return a.footprint.map(([x,y])=>[e.x+x-a.pivot[0],e.base+y-a.pivot[1]]);}
export function inPolygon(x,y,points){
  let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }return inside;
}
// Per-pose planted feet are authored alongside the shared leg masks. Raised
// passing feet do not emit a contact. Mirroring uses the same pivot transform.
export const FOOT_POSES=[
 {feet:[[2,18],[10,18]],planted:[0,1]}, {feet:[[5,18],[9,16]],planted:[0]},
 {feet:[[1,18],[10,18]],planted:[0,1]}, {feet:[[4,16],[7,18]],planted:[1]}
];
export function poseFor(frame){return frame<4?FOOT_POSES[frame]:{feet:frame>=9?[[5,18],[10,18]]:[[5,18],[9,18]],planted:[0,1]};}
export function actorFoot(a,side){
  const d=ASSETS.pilgrim,p=poseFor(a.frame).feet[side];
  const x=a.face<0?d.size[0]-1-p[0]:p[0],pivot=a.face<0?d.size[0]-1-d.pivot[0]:d.pivot[0];
  return {x:Math.round(a.x)+x-pivot,y:Math.round(a.y)+p[1]+1-d.pivot[1]};
}
