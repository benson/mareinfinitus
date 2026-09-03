import {patternAt} from './art/material-patterns.js';
export const DRIFTS=[
 {x:17,y:216,w:65,rise:8,lee:3},{x:187,y:182,w:64,rise:7,lee:2},{x:544,y:221,w:83,rise:8,lee:3},{x:685,y:194,w:73,rise:7,lee:2},
 {x:-311,y:302,w:179,rise:13,lee:4},{x:115,y:327,w:114,rise:11,lee:4},{x:608,y:336,w:205,rise:16,lee:5},{x:75,y:451,w:157,rise:13,lee:4},
 {x:-211,y:593,w:210,rise:19,lee:5},{x:381,y:509,w:169,rise:15,lee:5},{x:798,y:606,w:194,rise:16,lee:5},{x:356,y:736,w:180,rise:18,lee:6}
];
export const ROCK_SHELVES=[{x:669,y:295,w:32,h:10},{x:-148,y:401,w:54,h:15},{x:490,y:458,w:45,h:14},{x:924,y:325,w:41,h:11},{x:337,y:650,w:57,h:18}];
export const TERRACES=[[0,185,211,7],[196,319,171,5],[440,580,216,6]];
export function driftSection(d,i,dx){const u=dx/d.w,arc=Math.sin(u*Math.PI),y=d.y-d.rise*arc+Math.sin(u*Math.PI*3+i)*arc*1.3;return {u,arc,y,thickness:Math.round(d.lee*arc*arc),shoulder:Math.round(arc*(3+d.rise*.32))};}
export function terraceColumns([x0,x1,baseY,height]){
  const segments=[],columns=[];
  for(let x=x0,i=0;x<x1;i++){const p=patternAt('terrace-'+baseY,i),width=22+p.value*2;segments.push({x,width,height:height-(p.kind==='mirror'?1:0)});x+=width+6+p.length;}
  for(let x=x0;x<x1;x++){
    const s=segments.find(s=>x>=s.x&&x<s.x+s.width);if(!s)continue;
    const y=baseY+Math.round(Math.sin(x/23)+Math.sin(x/11)*.6),taper=Math.min(1,(x-s.x)/6,(s.x+s.width-x)/6);
    columns.push({x,y,height:Math.round(s.height*taper),shelf:Math.floor((x-s.x)/7)%3});
  }return columns;
}
