import {INDEX as I,TRANSPARENT} from './palette.js';
import {Raster,prng} from './raster.js';
import {enrichTomb} from './details.js';
import {patternAt} from './material-patterns.js';

// Material rules follow courses, facets, ledges and stress lines. Geometry alone
// is never a finished surface. One upper-left light is shared by every builder.
function masonry(ramp,split,course=6,block=11,label='stone') {
  const rows=[];
  // Short and long blocks share a course, but joints don't repeat on a grid.
  for(let y=0,row=0;y<160;row++){
    const p=patternAt(label+'-course',row),height=course-1+p.value%3,blocks=[];
    for(let x=-p.value,col=0;x<180;col++){
      const motif=patternAt(label+'-'+row,col),width=block-3+motif.value;
      blocks.push({x,width,motif});x+=width;
    }
    for(let dy=0;dy<height;dy++)rows[y+dy]={dy,height,blocks};
    y+=height;
  }
  return (x,y)=>{
    const row=rows[y],stone=row.blocks.find(b=>x>=b.x&&x<b.x+b.width);
    const dx=x-stone.x,p=stone.motif,face=x<split?2:1;
    if(row.dy===row.height-1||dx===0)return ramp[Math.max(0,face-1)];
    // Runs wear a short lip; mirrors leave a stepped corner fracture. The
    // rest of the block stays quiet so this reads as stone, not random grain.
    const chip=p.kind==='run'&&dx>p.value%4+1&&dx<p.value%4+p.length+2;
    if(row.dy===0&&dx>1&&dx<stone.width-2&&!chip)return ramp[Math.min(ramp.length-1,face+1)];
    if(p.kind==='mirror'&&p.value===2&&row.dy<3&&dx===stone.width-3-Math.floor(row.dy/2))return ramp[Math.max(0,face-1)];
    return ramp[p.kind==='echo'&&row.dy>1?Math.max(0,face-1):face];
  };
}
function steps(r,x,y,width,count,ramp) {
  for(let s=0;s<count;s++) {
    const motif=patternAt('steps-'+r.width,s),worn=3+motif.at%Math.max(1,width-7);
    const left=x-s*2,span=width+s*4,top=y+s*3;
    for(let dx=0;dx<span;dx++) {
      const chipped=dx>=worn&&dx<worn+motif.length-1;
      const shade=dx>span*.73?2:ramp.length-1;
      r.set(left+dx,top,chipped?ramp[1]:ramp[shade]);
      r.set(left+dx,top+1,dx>span-3||chipped&&dx===worn?ramp[0]:ramp[2]);
      r.set(left+dx,top+2,ramp[0]);
    }
  }
}
function doorway(r,cx,y,h,ramp,width=7) {
  const half=Math.floor(width/2);
  for(let dy=0;dy<h;dy++)for(let dx=-half;dx<=half;dx++) {
    if(dy<2&&Math.abs(dx)>half-2+dy)continue;
    r.set(cx+dx,y+dy,dx===-half?ramp[ramp.length-1]:dx===half?ramp[1]:ramp[0]);
  }
}
export function buildObelisk(seed=3) {
  const [k0,k1,k2,k3]=I.obsidian,r=new Raster(18,70),rand=prng(seed),lights=[];
  for(let y=8;y<=65;y++) {
    const half=2.6+2.6*(y-8)/57,left=Math.round(8-half),right=Math.round(8+half),split=Math.round(8-half*.35);
    for(let x=left;x<=right;x++) {
      let c=x<split?k2:k1;if(x===left)c=k3;if(x===right)c=k0;
      if((y-8)%11===10&&x!==left&&rand()>.2)c=x<split?k1:k0;r.set(x,y,c);
    }
    if((y-8)%9===4)lights.push([split+1+Math.floor(rand()*Math.max(1,right-split-2)),y]);
  }
  for(let y=0;y<8;y++)for(let x=Math.round(8-y/8*2.6);x<=Math.round(8+y/8*2.6);x++)r.set(x,y,x<7?k3:x<=8?k2:k1);
  for(let i=0;i<4;i++){const y=12+Math.floor(rand()*49),right=Math.round(8+2.6+2.6*(y-8)/57);r.set(right,y,TRANSPARENT);r.set(right-1,y,k0);}
  lights.forEach(([x,y])=>r.set(x,y,I.anomaly[0]));
  r.rect(2,66,14,1,k3);r.rect(2,67,14,1,k1);r.rect(15,66,1,2,k0);r.rect(0,68,18,1,k2);r.rect(0,69,18,1,k0);return enrichTomb('obelisk',r);
}
export function buildCrystal() {
  const r=new Raster(40,140),c=I.crystal;
  r.shape([[17,0],[28,14],[30,87],[35,127],[28,134],[5,134],[9,83],[10,17]],(x,y)=> {
    const split=15+Math.floor(y/46);
    if(x<split)return c[3];
    if(x===split)return c[4];
    return c[x<25?2:1];
  });
  for(const [a,b] of [[[17,0],[15,36]],[[10,17],[24,45]],[[24,45],[15,75]],[[15,75],[29,98]],[[29,98],[19,125]]])r.line(...a,...b,c[3]);
  for(const [x,y,len] of [[11,29,12],[26,63,18],[18,101,14]]){
    r.shape([[x,y],[x+2,y+4],[x+1,y+len],[x-1,y+len-3]],(px,py)=>c[px<x?2:3]);
    r.line(x,y,x+1,y+3,c[4]);
  }
  r.shape([[4,112],[10,96],[12,135],[2,136]],(x,y)=>c[x<6?3:1]);
  r.shape([[30,124],[34,107],[38,138],[28,138]],(x,y)=>c[x<33?2:0]);
  steps(r,5,134,29,2,c);return enrichTomb('crystal',r);
}
export function buildCaves() {
  const r=new Raster(108,42),c=I.stone;
  for(let m=0;m<3;m++) {
    const x=m*34,y=[5,0,7][m],rock=new Raster(40,42);
    // Rock-cut entrances belong to outcrops, not three brick igloos. Broader
    // weathered planes precede the few bedding fractures and tooled portals.
    const profiles=[[[0,38],[2,22],[5,18],[8,12],[18,7],[29,10],[35,20],[39,39]],[[0,38],[3,15],[10,7],[15,3],[24,2],[32,10],[35,23],[39,39]],[[0,39],[3,27],[7,16],[15,11],[27,12],[33,18],[34,30],[39,39]]];
    rock.shape(profiles[m],(px,py)=>c[px<10?3:px<20?2:1]);
    rock.shape([[9,12+y],[17,6+y],[26,9+y],[23,13+y],[12,18+y]],()=>c[3]);
    rock.shape([[29,12+y],[33,19+y],[35,30],[29,34],[28,23+y]],()=>c[0]);
    for(const [sx,sy,w] of [[5,23+y,6],[10,13+y,7],[25,31,7]]){
      rock.line(sx,sy,sx+w,sy-2,c[1]);rock.line(sx+1,sy-1,sx+w-2,sy-3,c[3]);
    }
    rock.line(8,9+y,17,5+y,c[4]);rock.line(3,20+y,8,11+y,c[3]);
    doorway(rock,20,18+y,19-y,c,9);
    rock.line(14,20+y,14,34,c[3]);rock.line(25,21+y,25,35,c[0]);
    rock.line(11,16+y,10,27+y,c[0]);rock.line(10,27+y,6,32+y,c[0]);
    rock.rect(16,37,14,1,c[3]);r.blit(rock,x,0);
  }
  return enrichTomb('caves',r);
}
export function buildJade() {
  const r=new Raster(120,90),c=I.jade;
  const profile=[[4,82],[15,64],[22,42],[39,32],[48,12],[60,1],[74,18],[80,35],[100,51],[108,71],[117,84]];
  r.shape(profile,(x,y)=>{
    const split=51+Math.floor(Math.sin(y/19)*5);
    let v=x<split?3:x<split+18?2:1;
    return c[v];
  });
  // Raised mineral ribs taper along the vault's volume rather than filling it
  // with statistically distributed holes.
  for(const points of [ [[58,7],[43,35],[38,55],[20,77]], [[63,14],[65,38],[75,57],[87,81]], [[38,39],[30,57],[28,73]], [[82,42],[88,62],[101,79]] ]) {
    for(let i=0;i<points.length-1;i++) {const a=points[i],b=points[i+1];r.line(a[0]+2,a[1],b[0]+2,b[1],c[0]);r.line(...a,...b,c[3]);r.line(a[0]-1,a[1],b[0]-1,b[1],c[4]);}
  }
  for(const [x,y] of [[44,41],[77,57],[28,64]]) {
    r.shape([[x-3,y],[x,y-3],[x+3,y],[x+2,y+6],[x-2,y+6]],(px,py)=>c[px<x?1:0]);
    r.line(x-3,y,x-2,y+5,c[3]);
  }
  doorway(r,58,66,17,c,9);steps(r,49,81,20,3,c);return enrichTomb('jade',r);
}
export function buildPalace() {
  const r=new Raster(110,130),c=I.obsidian,material=masonry(c,51,7,9,'palace');
  for(const [x,top,w] of [[10,56,14],[28,31,17],[49,0,22],[76,37,16],[92,66,12]]) {
    r.shape([[x,119],[x+2,top+20],[x+Math.floor(w/2),top],[x+w-2,top+23],[x+w,120]],material);
    r.line(x+Math.floor(w/2),top+2,x+3,top+24,c[3]);
    r.line(x+3,top+24,x+1,109,c[2]);
    for(let y=top+31;y<106;y+=17)r.rect(x+Math.floor(w/2),y,2,5,c[0]);
  }
  r.shape([[18,113],[24,88],[42,79],[49,60],[60,53],[68,79],[87,87],[96,116]],material);
  for(const points of [[[20,115],[37,92],[49,85],[54,65]],[[91,114],[78,92],[65,84],[60,60]]]) {
    for(let i=0;i<points.length-1;i++) {const a=points[i],b=points[i+1];r.line(a[0]+2,a[1],b[0]+2,b[1],c[0]);r.line(...a,...b,c[3]);}
  }
  for(const [x,y,dir] of [[24,66,-1],[83,72,1],[44,36,-1],[71,52,1]]) {
    r.line(x,y,x+dir*9,y-12,c[2]);r.line(x+dir*9,y-12,x+dir*7,y-5,c[0]);
  }
  doorway(r,56,98,20,c,9);
  r.set(55,78,I.anomaly[0]);r.set(57,80,I.anomaly[1]);r.set(52,25,I.anomaly[0]);
  steps(r,38,118,39,4,c);return enrichTomb('palace',r);
}
export function buildSphinx() {
  const r=new Raster(160,110),c=I.stone,mat=masonry(c,76,6,13,'sphinx');
  // Wings have carved feather vanes, overlapping roots and chipped tips.
  r.shape([[57,60],[25,45],[5,16],[11,51],[33,73],[60,79]],(x,y)=>c[y<x*.64+28?3:2]);
  r.shape([[99,57],[125,43],[153,19],[148,48],[130,69],[99,78]],(x,y)=>c[y<110-x*.45?2:1]);
  for(let feather=0;feather<6;feather++) {
    const y=25+feather*7;
    r.line(10+feather*4,y,56,62+feather*2,c[0]);
    r.line(10+feather*4,y-1,54,61+feather*2,c[3]);
    r.line(149-feather*4,y,103,62+feather*2,c[0]);
    r.line(148-feather*4,y-1,104,61+feather*2,c[2]);
  }
  r.line(5,17,26,43,c[4]);r.line(26,43,53,59,c[3]);
  // Seated torso and haunches, separate light planes around the chest.
  r.shape([[53,95],[55,61],[65,42],[88,42],[104,60],[114,92],[132,101],[27,103]],mat);
  r.shape([[69,44],[89,43],[95,76],[90,96],[64,94],[61,70]],(x,y)=>c[x<75?3:y%9===8?1:2]);
  r.line(65,56,88,58,c[4]);r.line(65,59,87,61,c[1]);
  // Nemes headdress surrounds a deliberately placed face; no statistical grain.
  r.shape([[61,38],[60,18],[65,7],[76,2],[89,7],[97,21],[94,47],[86,49],[66,46]],mat);
  for(let y=10;y<43;y+=4){r.line(62,y,67,y+2,c[4]);r.line(89,y+2,94,y+3,c[1]);}
  r.shape([[69,13],[83,11],[90,18],[89,27],[93,29],[86,32],[84,40],[74,41],[69,34]],(x,y)=>c[x<76?4:x<86?3:2]);
  r.line(73,20,80,20,c[1]);r.line(85,20,88,21,c[1]);
  r.set(77,21,c[0]);r.set(87,22,c[0]);
  r.line(83,22,84,28,c[2]);r.line(83,28,88,28,c[4]);
  r.line(78,33,86,33,c[0]);r.line(80,35,85,35,c[3]);
  r.rect(78,39,6,8,c[1]);r.rect(79,40,2,6,c[3]);
  // Long forelegs and paws establish seated anatomy and the monumental scale.
  r.shape([[55,65],[65,65],[62,88],[59,96],[69,102],[33,102],[40,94],[51,90]],mat);
  r.shape([[94,66],[104,67],[109,91],[122,98],[125,103],[92,103],[96,94]],mat);
  r.line(56,68,53,92,c[4]);r.line(97,71,101,92,c[3]);
  for(const x of [39,45,51,106,112,118])r.line(x,98,x+1,102,c[0]);
  doorway(r,78,79,20,c,9);steps(r,65,100,28,3,c);
  for(const [x,y] of [[7,28],[18,55],[147,32],[132,61],[62,15],[121,102]]){r.set(x,y,TRANSPARENT);r.set(x+1,y,c[0]);}
  return enrichTomb('sphinx',r);
}
export const TOMB_BUILDERS={obelisk:buildObelisk,crystal:buildCrystal,caves:buildCaves,jade:buildJade,palace:buildPalace,sphinx:buildSphinx};
