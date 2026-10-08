// Native coordinates are chosen from the accepted Porcelain Dawn v3 composition.
// The central 720x360 composition has 120 pixels of authored side terrain for pan.
export const DAWN_WORLD={width:960,height:360,anchor:50};
export const MONUMENTS=[
 {key:'palace',id:'TT-02',x:159,y:4,width:78,height:57,base:61,factor:.35,ramp:'far'},
 {key:'crystal',id:'TT-03',x:262,y:37,width:132,height:106,base:143,factor:.35,ramp:'crystal'},
 {key:'caves',id:'TT-06',x:426,y:73,width:146,height:69,base:142,factor:.35,ramp:'salmon'},
 {key:'obelisk',id:'TT-04',x:266,y:109,width:24,height:142,base:251,factor:.7,ramp:'obsidian'},
 {key:'jade',id:'TT-05',x:470,y:139,width:112,height:100,base:239,factor:.7,ramp:'jade'},
 {key:'sphinx',id:'TT-01',x:580,y:157,width:164,height:109,base:266,factor:.7,ramp:'stone'}
];
export const PROPS=[
 {key:'tent',variant:0,x:672,y:312,base:337,id:'TT-07'},
 {key:'tent',variant:1,x:723,y:322,base:347,id:'TT-07'},
 {key:'pavilion',variant:0,x:775,y:297,base:354,id:'TT-07'},
 {key:'fire',x:637,y:332,base:342,id:'TT-07'},
 {key:'supplies',x:699,y:342,base:354,id:'TT-07'},
 {key:'supplies',x:753,y:347,base:359,id:'TT-07'},
 {key:'instrument',x:652,y:320,base:344,id:'TT-29'}
];
export const PATHS=[
 [[624,306],[632,290],[624,279],[599,271],[567,264],[523,260],[470,257],[433,252]],
 [[433,252],[427,243],[406,231],[397,224],[407,214],[427,205],[442,193],[441,183],[422,176],[402,170],[410,158],[424,150],[460,145],[485,139],[475,124]],
 [[599,271],[629,270],[648,271],[661,268]],
 [[523,260],[530,251],[522,243],[518,239]],
 [[406,231],[374,240],[341,247],[303,254],[281,253]],
 [[475,124],[453,121],[456,115]],
 [[475,124],[491,127],[498,127]],
 [[485,139],[513,135],[542,134]]
];
// The back of the raised camp terrace. Same points drive its tile rim and walkers.
export const CAMP_RIM=[[330,297],[362,294],[410,295],[450,297],[488,297],[526,296],[568,297],[596,299],[621,301],[642,298],[680,296],[720,297],[768,296],[816,293],[864,291],[912,290],[960,290]];
export function rimY(x){for(let i=1;i<CAMP_RIM.length;i++){const a=CAMP_RIM[i-1],b=CAMP_RIM[i];if(x<=b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return 290;}
export const CAMP_BOUNDS=[[459,304],[831,302],[932,360],[442,360]];
