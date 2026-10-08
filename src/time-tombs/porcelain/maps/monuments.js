import {MASONRY} from '../tiles/masonry.js';
import {MINERAL} from '../tiles/mineral.js';
import {SPIRES} from '../tiles/spires.js';
import {TERRAIN} from '../tiles/terrain.js';
const p=(name,x,y,shift=0,flipX=false,front=false)=>({name,x,y,shift,flipX,front});
const crystal=[];
for(let row=0;row<6;row++)for(let col=0;col<6;col++)crystal.push(p(col===0?'edge':['facet','quiet','facetB','facet','quiet'][(col+row)%5],2+col*16,10+row*16,0));
for(let col=0;col<4;col++)for(let row=0;row<6;row++)crystal.push(p('side',98+col*8,8-col*2+row*16,-1));
crystal.push(p('facetB',98,42,-1),p('facetB',114,77,-1),p('vein',111,21,-1));
for(let col=0;col<6;col++)crystal.push(p('base',2+col*16,102));
crystal.push(p('roofLeft',2,2));
for(let col=0;col<5;col++)crystal.push(p('roofField',18+col*16,2));
for(let col=0;col<4;col++){const x=98+col*8;for(let y=0;y<6-col*2;y+=4)crystal.push(p('roofReturn',x,y));crystal.push(p('roofReturn',x,6-col*2));}
for(const [x,y,s]of [[23,12,0],[47,28,-1],[63,54,-1],[87,76,0]])crystal.push(p('vein',x,y,s));
const jade=[p('crest',36,3),p('crest',49,9,-1,true)];
for(const [y,left,right]of [[20,24,56],[36,8,72],[52,0,80],[68,0,80],[84,0,80]]){
 const edge=y<52?'rise':y===52?'steep':'vertical';jade.push(p(edge,left,y,y>=84?-1:0));
 for(let x=left+16;x<right;x+=16)jade.push(p((x/8+y/4)%3===0?'facetB':'facet',x,y,x>=56?-1:0));
 jade.push(p(y===84?'jadeReturn':edge,right,y,-2,y!==84));
}
for(const [x,y]of [[34,30],[53,61],[80,78]])jade.push(p('vein',x,y,-1));
jade.push(p('door',35,91));
const sphinx=[];
for(const [x,y,b]of [[0,87,104],[8,85,104],[16,82,104],[24,78,104],[32,73,104],[40,66,104],[48,56,104],[104,46,104],[112,48,101],[120,48,97],[128,45,93],[136,41,89],[144,35,83],[152,29,76]]){
 sphinx.push(p('wing',x,y,x<56?0:-1));
 for(let yy=y+8;yy<b-7;yy+=8)sphinx.push(p('wingBody',x,yy,x<56?0:-1, false,x>=104));
}
for(let row=0;row<6;row++){
 const y=12+row*16;sphinx.push(p('taper',48-Math.min(row,2)*4,y,0));
 for(let col=0;col<3;col++)sphinx.push(p((row+col)%2?'broadA':'broadB',60+col*12,y,col===2?-1:0));
 sphinx.push(p('taper',96,y,-1,true));
 sphinx.push(p('returnPlane',104,y,-2));
}
for(const x of [56,72,88])sphinx.push(p('crown',x,4));
for(const x of [64,80])sphinx.push(p('topPlane',x,4));
for(const x of [40,56,72,88])sphinx.push(p('foot',x,103,0,false,true));
sphinx.push(p('door',77,99,0,false,true));
const obelisk=[p('obeliskCap',4,0)];
for(let y=14;y<126;y+=16){obelisk.push(p('shaftDark',4,y));obelisk.push(p('returnDark',12,y));}
obelisk.push(p('step',2,126),p('step',2,130),p('step',0,134,-1),p('step',0,138,-1),p('door',9,132));
const palace=[];
for(const [x,y,h,s]of [[8,35,12,-1],[16,25,22,0],[23,9,38,0],[30,0,49,0],[39,19,30,-1],[45,30,19,-1],[55,23,26,0],[62,39,10,-1]]){
 palace.push(p('needle',x,y,s));for(let yy=y+16;yy<y+h;yy+=8)palace.push(p('shaft',x,yy,s));
}
for(const [x,y]of [[16,35],[29,32],[40,38],[53,41]])palace.push(p('fork',x,y,-1));
for(let x=3;x<70;x+=8)palace.push(p('base',x,49,-1));
const caves=[];
const crest=[17,9,7,13,19,18,25,29,38];
for(let c=0;c<crest.length;c++){const x=c*16,y=crest[c];caves.push(p('topA',x,Math.max(0,y-8)),p('capA',x,y),p('capB',x+8,y));for(let yy=y+7;yy<54;yy+=16)caves.push(p(c%3===0?'fractureB':'fractureA',x,yy,c>5?-1:0));}
export const CAVE_DOORS=[{x:27,y:32},{x:69,y:44},{x:113,y:51}];
const caveVocab={...TERRAIN,cave:MINERAL.cave};
for(const d of CAVE_DOORS)caves.push(p('cave',d.x-3,d.y-5,0));
export const MONUMENT_MAPS={
 crystal:{map:crystal,vocab:MINERAL},jade:{map:jade,vocab:MINERAL},
 sphinx:{map:sphinx,vocab:MASONRY},obelisk:{map:obelisk,vocab:SPIRES},
 palace:{map:palace,vocab:SPIRES},caves:{map:caves,vocab:caveVocab}
};
