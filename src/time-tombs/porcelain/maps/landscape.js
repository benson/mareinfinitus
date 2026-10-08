import {rimY,PATHS,DAWN_WORLD} from '../layout.js';
const put=(map,name,x,y,ramp,shift=0,flipX=false)=>map.push({name,x:Math.round(x),y:Math.round(y),ramp,shift,flipX});
export const FAR_MAP=[],SHELF_MAP=[],FLOOR_MAP=[],CAMP_MAP=[],NEAR_MAP=[];
// A section records x, back edge, front lip and foot. Broad oblique top planes
// and their vertical returns belong to one landform, including the near cliffs.
export const TERRACES=[
 {name:'western upper shelf',band:'shelf',sections:[[0,75,107,126],[48,77,117,135],[88,82,122,145],[120,85,114,138],[144,84,125,151],[176,90,129,152],[208,92,116,137],[248,102,109,124]]},
 {name:'western broken mesa',band:'shelf',sections:[[0,132,177,208],[40,143,180,207],[72,152,194,221],[104,153,199,225],[128,155,193,218],[160,151,181,208],[192,143,176,196],[224,145,159,179],[248,148,155,170]]},
 {name:'western lower spur',band:'shelf',sections:[[128,206,228,247],[160,208,234,257],[184,204,230,251],[208,207,223,244],[240,211,218,232]]},
 {name:'eastern rim',band:'shelf',sections:[[576,83,101,123],[608,80,106,132],[640,83,118,147],[672,88,119,147],[704,83,112,139],[736,86,120,145],[776,84,129,153],[808,86,127,150],[848,91,117,142],[880,86,121,145],[920,92,134,161],[960,93,142,168]]},
 {name:'eastern descending wall',band:'shelf',sections:[[584,143,159,188],[616,141,171,204],[640,147,189,222],[672,147,199,240],[704,137,192,230],[736,145,179,220],[768,151,195,233],[800,162,211,250],[824,167,219,255],[848,166,207,244],[888,153,195,234],[920,158,203,244],[960,169,216,260]]},
 {name:'eastern foot terrace',band:'shelf',sections:[[752,233,248,269],[776,223,246,272],[808,217,253,281],[832,225,265,290],[864,225,260,285],[896,229,251,277],[928,235,272,296],[960,235,279,303]]},
 {name:'approach shelf left',band:'shelf',sections:[[304,178,188,202],[328,173,190,207],[352,176,199,215],[376,181,195,209],[392,185,190,198]]},
 {name:'approach shelf lower',band:'shelf',sections:[[296,216,226,237],[320,211,227,241],[344,214,225,238],[368,215,222,232]]},
 {name:'approach shelf right',band:'shelf',sections:[[452,187,196,206],[476,184,201,212],[496,190,204,214]]},
 {name:'foreground west shoulder',band:'near',sections:[[0,182,217,390],[32,189,220,390],[64,195,230,396],[96,205,235,398],[120,214,251,402],[144,229,269,406],[168,249,277,410],[192,258,298,416],[216,282,326,420],[240,306,343,428],[264,329,359,434],[280,349,372,440]]},
 {name:'camp terrace left return',band:'near',sections:[[288,351,355,418],[296,328,338,406],[304,316,324,401],[312,305,315,396],[320,298,308,391],[328,294,302,389],[336,293,299,382]]}
];
export function sectionAt(sections,x){
 for(let i=1;i<sections.length;i++){const a=sections[i-1],b=sections[i];if(x<=b[0]){const t=(x-a[0])/(b[0]-a[0]);return a.slice(1).map((v,j)=>v+(b[j+1]-v)*t);}}
 return sections.at(-1).slice(1);
}
// Distant shelves use 4px modules and 2px top courses. Their faces occupy only
// a few pixels and share a deliberately compressed atmospheric palette.
const distant=[
 [0,35,72,4,3],[72,37,64,4,3],[136,34,76,3,3],[212,36,68,4,3],[280,35,100,3,3],[376,37,76,4,3],[452,34,80,4,3],[532,36,64,3,3],[592,35,108,4,3],[700,37,84,4,3],[784,35,80,4,3],[864,36,96,4,3],
 [0,45,88,7,5],[96,48,64,7,4],[224,44,72,8,5],[302,49,108,8,4],[418,44,104,7,5],[530,47,88,7,4],[626,45,68,8,5],[702,49,88,8,5],[798,45,104,7,5],[910,48,52,8,4],
 [0,62,80,10,7],[88,58,72,9,6],[212,65,44,10,8],[392,61,64,10,7],[464,56,84,8,6],[554,64,92,10,7],[654,59,72,9,6],[734,64,100,9,7],[842,59,120,10,7],
 [0,82,64,14,10],[72,78,100,12,9],[184,88,64,14,10],[398,83,68,15,10],[474,77,104,13,9],[594,88,88,14,10],[690,77,116,14,9],[816,89,144,14,11]
];
const contour=[0,0,-1,-1,0,1,1,0,-1,0,1,2,2,1,0,-1];
for(const [x,y,width,depth,drop]of distant)for(let dx=0,n=0;dx<width;dx+=4,n++){
 const front=y+contour[n%contour.length];
 for(let yy=Math.max(32,front-depth);yy<front;yy+=2)put(FAR_MAP,'farTop',x+dx,yy,'distance',1);
 put(FAR_MAP,'farLip',x+dx,front,'distance',0);
 for(let yy=front+4;yy<front+drop;yy+=4)put(FAR_MAP,'farCrack',x+dx,yy,'distance',n%9<3?-1:0);
}
const courses='qqsaqqbqqsaq';
for(const form of TERRACES){
 const map=form.band==='near'?NEAR_MAP:SHELF_MAP,near=form.band==='near';
 for(let x=form.sections[0][0],col=0;x<form.sections.at(-1)[0];x+=8,col++){
  const [back,front,foot]=sectionAt(form.sections,x).map(Math.round),far=front<145;
  const faceRamp=near?'cliff':far?'far':'cliff',topRamp=near?'stone':'terrace';
  // Fill the wide receding top with shallow courses, then its chipped front lip.
  for(let y=back,row=0;y<front;y+=4,row++)put(map,courses[(col+row*2)%courses.length]==='s'?'fieldSeam':'field',x,y,topRamp,near?1:0);
  put(map,'planeEdge',x,back,topRamp,near?1:0);
  const returnSlope=sectionAt(form.sections,x+8)[1]-front;
  for(let y=front+4,row=0;y<foot;y+=8,row++)put(map,courses[(col+row)%courses.length]==='s'?'faceSplit':'faceQuiet',x,y,faceRamp,near&&((returnSlope>2)||(row>8))?-1:0);
  put(map,col%3===0?'capC':col%3===1?'capA':'capB',x,front,faceRamp,near?0:1);
  if(foot<355)put(map,'toe',x,foot-3,faceRamp,near?-1:0);
 }
}
// Small benches are short foreshortened top-and-return forms, never full-width rails.
for(const [x,y,w]of [[284,266,32],[375,248,24],[430,267,32],[555,250,24],[584,278,32],[683,276,24],[239,147,16]])for(let dx=0;dx<w;dx+=8){put(SHELF_MAP,'field',x+dx,y,'terrace',1);put(SHELF_MAP,'capC',x+dx,y+4,'cliff',1);}
const deposits=[['  cc  ',' ctbtc','cbbtt ',' ct c '],['c  ct ','tbbttc',' ctbtc','  c   '],['    cc',' cttbc','ctbbt ',' cc   ']];
for(const [x,y,v]of [[208,170,1],[254,200,2],[352,209,2],[486,217,1],[426,241,1],[280,243,0],[465,265,2],[537,273,1],[612,250,2],[705,253,2],[228,274,1],[368,277,2],[720,279,0],[120,253,2]])for(let row=0;row<4;row++)for(let col=0;col<6;col++){
 const ch=deposits[v][row][col];if(ch&&ch!==' ')put(SHELF_MAP,{c:'chip',t:'seam',b:'boulder'}[ch],x+col*8,y+row*4,ch==='c'?'stone':'cliff',ch==='b'?1:0,col%3===1);
}
for(const points of PATHS)for(let i=1;i<points.length;i++){
 const a=points[i-1],b=points[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2);
 for(let k=0;k<steps;k++){const x=a[0]+(b[0]-a[0])*k/steps,y=a[1]+(b[1]-a[1])*k/steps;put(FLOOR_MAP,y<180?'trackFar':'track',x-(y<180?2:4),y-2,'floor',1);}
}
// An oblique left edge gives the camp a visible return face above the valley.
for(let y=294;y<360;y+=4){const left=y<310?336:Math.round(336-(y-310)*.65);for(let x=left,col=0;x<DAWN_WORLD.width;x+=8,col++)if(y>=rimY(x)+3)put(CAMP_MAP,(col+Math.floor(y/4)*2)%17===0?'fieldSeam':'field',x,y,'stone',1);}
for(let x=328;x<DAWN_WORLD.width;x+=8){const y=Math.round(rimY(x));put(CAMP_MAP,'lee',x,y-4,'cliff',0);put(CAMP_MAP,'backRim',x,y,'stone',0);}
for(const [x,y]of [[404,309],[443,314],[479,348],[657,354],[748,353],[854,316],[897,325]])put(CAMP_MAP,'chip',x,y,'stone',0);
