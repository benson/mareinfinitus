// Authoritative runtime geometry for the finished 1120x360 stage. Monument
// coordinates are the STANDS table from stage-study.js; no metric scale or
// independently tuned placement survives here.
import {SPHINX_MAP} from './art/maps/sphinx.js';
import {SPHINX} from './art/tiles/sphinx.js';
const box=(l,t,r,b)=>[[l,t],[r,t],[r,b],[l,b]];
const define=(size,grounding,footprint,planes,anchors={},pivot=[0,size[1]-1])=>({size,pivot,grounding,footprint,planes,anchors});
const monument=(w,h,anchors={})=>define([w,h],[0,w-1,0],box(0,h-5,w,h),[{id:'body',row:h-1}],anchors);

export const STAIRCASES={};
export function stairGeometry(){throw new Error('Relit tomb stairs are authored inside their native sprites');}

export const ASSETS={
  caves:monument(1120,124,{subject:[560,90],approach:[720,130]}),
  palace:monument(200,240,{approach:[100,247]}),
  crystal:monument(70,228,{approach:[35,235]}),
  jade:monument(150,108,{approach:[72,115]}),
  obelisk:monument(42,240,{approach:[21,247]}),
  sphinx:define([190,132],[0,189,114],box(0,127,190,132),[
    {id:'body',row:112},
    {id:'forepaws',row:130,regions:SPHINX_MAP.filter(p=>p.front).map(p=>box(p.x,p.y,p.x+SPHINX[p.name].w,p.y+SPHINX[p.name].h))}
  ],{approach:[95,139]}),
  tent:define([36,25],[0,35,19],[[10,19],[34,19],[26,23],[2,23]],[{id:'canvas',row:23}],{entry:[14,24]},[0,24]),
  'tent-alt':define([36,25],[0,35,19],[[10,19],[34,19],[26,23],[2,23]],[{id:'canvas',row:23}],{entry:[14,24]},[0,24]),
  supplies:define([23,12],[0,22,7],box(0,7,22,12),[{id:'gear',row:11}],{},[0,11]),
  fire:define([9,10],[0,8,7],box(0,7,9,10),[{id:'fire',row:9}],{smoke:[4,2],embers:[4,3],light:[4,10],sound:[4,6],work:[4,4],approach:[16,2]},[0,9]),
  instrument0:define([15,24],[0,14,19],[[7,18],[14,24],[0,24]],[{id:'instrument',row:23}],{dial:[7,12],sound:[7,24],work:[20,23],workSide:[22,20],approach:[-13,18]},[7,23]),
  instrument1:define([15,24],[0,14,19],[[7,18],[14,24],[0,24]],[{id:'instrument',row:23}],{dial:[7,12],sound:[7,24],work:[20,23],workSide:[22,20],approach:[-13,18]},[7,23]),
  pilgrim:define([12,20],[0,11,17],box(3,17,9,20),[{id:'actor',row:19}],{},[6,19]),
  'pilgrim-ramp':define([8,12],[0,7,8],box(2,8,6,12),[{id:'actor',row:11}],{},[4,11]),
  'pilgrim-tiny':define([3,7],[0,2,5],box(0,5,3,7),[{id:'actor',row:6}],{},[1,6]),
  shrike:define([19,30],[3,15,27],box(3,27,16,30),[{id:'encounter',row:29}],{},[9,29]),
  skimmer:define([58,24],[0,57,20],box(3,19,55,24),[{id:'hull',row:23}],{wake:[29,24]},[29,23]),
  'windstone-0':define([14,8],[0,13,5],box(0,5,14,8),[{id:'rock',row:7}],{},[0,7]),
  'windstone-1':define([23,12],[0,22,9],box(0,9,23,12),[{id:'rock',row:11}],{},[0,11]),
  'windstone-2':define([9,6],[0,8,3],box(0,3,9,6),[{id:'rock',row:5}],{},[0,5])
};

export const PLACEMENTS=[
  {uid:'caves',key:'caves',id:'TT-06',x:0,base:200},
  {uid:'palace',key:'palace',id:'TT-02',x:904,base:224},
  {uid:'crystal',key:'crystal',id:'TT-03',x:690,base:238},
  {uid:'jade',key:'jade',id:'TT-05',x:300,base:224},
  {uid:'obelisk',key:'obelisk',id:'TT-04',x:546,base:252},
  {uid:'sphinx',key:'sphinx',id:'TT-01',x:20,base:250}
];
export const PROP_PLACEMENTS=[
  {uid:'camp-west',key:'tent',id:'TT-07',x:174,base:330},
  {uid:'camp-middle',key:'tent-alt',id:'TT-07',x:238,base:338},
  {uid:'camp-east',key:'tent',id:'TT-07',x:280,base:348},
  {uid:'supplies-west',key:'supplies',id:'TT-07',x:222,base:351},
  {uid:'supplies-east',key:'supplies',id:'TT-07',x:266,base:357},
  {uid:'fire',key:'fire',id:'TT-07',x:212,base:345},
  {uid:'instrument-camp',key:'instrument0',id:'TT-29',x:323,base:339}
];
export const STONE_PLACEMENTS=[
  {variant:0,x:820,base:258},{variant:1,x:470,base:268},{variant:2,x:250,base:232},{variant:1,x:1040,base:262}
].map((p,i)=>({...p,uid:'stone-'+i,key:'windstone-'+p.variant,id:'TT-32'}));
export const ENTITIES=[...PLACEMENTS,...PROP_PLACEMENTS,...STONE_PLACEMENTS];

export function assetName(key){
  if(ASSETS[key])return key;
  if(/^pilgrim-ramp-\d+-\d+$/.test(key))return 'pilgrim-ramp';
  if(/^pilgrim-tiny-\d+-\d+$/.test(key))return 'pilgrim-tiny';
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
export function inPolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}

export const FOOT_POSES=[
  {feet:[[2,18],[10,18]],planted:[0,1]},{feet:[[5,18],[9,16]],planted:[0]},
  {feet:[[1,18],[10,18]],planted:[0,1]},{feet:[[4,16],[7,18]],planted:[1]}
];
export function poseFor(frame){return frame<4?FOOT_POSES[frame]:{feet:frame>=9?[[5,18],[10,18]]:[[5,18],[9,18]],planted:[0,1]};}
export function actorFoot(a,side){const p=poseFor(a.frame).feet[side];return{x:Math.round(a.x)+(a.face<0?6-p[0]:p[0]-6),y:Math.round(a.y)+p[1]+1-19};}
