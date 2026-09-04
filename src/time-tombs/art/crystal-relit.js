import {INDEX as I} from './palette.js';
import {Raster} from './raster.js';
import {antialias,outline,shadeBox} from './shade.js';

// The concept study is translated as connected optical planes. A bright pixel
// is never decorative: it belongs to the roof, a bevel, or the shared edge of
// two facets. The broad planes do the material work; the edge accents only
// explain where those planes turn.
export function buildCrystalRelit({width=70,height=228}={}){
  const r=new Raster(width,height),ramp=I.crystal;
  const left=4,top=8,frontW=46,sideW=15,bodyH=height-top-2,bottom=height-2;

  // Start with one coherent prism. The front lives in the middle of the ramp;
  // the right face supplies the large, saturated core-shadow mass.
  shadeBox(r,left,top,frontW,bodyH,sideW,ramp,{gain:0.72,falloff:0.15,lateral:0.18});

  // Narrow illuminated bevel on the horizon side. Its changing width is the
  // visible geometry responsible for the pale reflection.
  r.shape([[left,top],[left+9,top],[left+11,65],[left+8,138],[left+9,bottom],[left,bottom]],()=>ramp[4]);
  r.shape([[left,top],[left+2,top],[left+3,bottom],[left,bottom]],()=>ramp[5]);

  // Four interlocking front facets. Their vertices are shared deliberately;
  // none of these values float independently on the face.
  const a=[left+9,top],b=[left+23,top],c=[left+30,103],d=[left+19,164];
  const e=[left+9,bottom],f=[left+37,bottom],g=[left+frontW-1,93],h=[left+frontW-1,bottom];
  r.shape([a,b,c,[left+14,76],[left+8,138]],()=>ramp[3]);
  r.shape([b,[left+frontW-1,top],g,c],()=>ramp[3]);
  r.shape([[left+14,76],c,d,e,[left+8,138]],()=>ramp[2]);
  r.shape([c,g,h,f,d],()=>ramp[2]);

  // Secondary planes break the large faces into authored material clusters.
  // Each cluster shares vertices with the primary construction, so the extra
  // value changes read as depth inside the crystal rather than surface noise.
  const i=[left+36,top],j=[left+frontW-1,37],k=[left+35,58],l=[left+26,43];
  r.shape([b,i,j,k,l],()=>ramp[4]);
  r.shape([l,k,g,c],()=>ramp[2]);
  r.shape([[left+14,76],c,[left+25,126],[left+10,112]],()=>ramp[3]);
  r.shape([[left+10,112],[left+25,126],d,[left+15,181],[left+8,151]],()=>ramp[2]);

  // Two quiet inclusions sit behind the front facets. They are compact value
  // masses with designed silhouettes, not scattered chips or procedural grain.
  r.shape([[left+31,67],[left+38,61],[left+42,72],[left+37,84],[left+31,80]],()=>ramp[3]);
  r.shape([[left+27,137],[left+35,128],[left+41,145],[left+37,164],[left+29,158]],()=>ramp[1]);

  // A lower refractive wedge catches light arriving through the left bevel.
  // Its boundary is the meeting of two broad value planes, not a bright line.
  const m=[left+29,bottom];
  r.shape([e,d,m],()=>ramp[4]);
  r.shape([d,f,m],()=>ramp[3]);

  // The right face is one deep plane with a narrow reflected-light return at
  // the far silhouette and a single internal facet connected to the base.
  r.shape([[left+frontW,top],[left+frontW+sideW,4],[left+frontW+sideW,bottom-1],[left+frontW,bottom]],()=>ramp[0]);
  r.shape([[left+frontW,top],[left+frontW+10,6],[left+frontW+11,68],[left+frontW+5,101],[left+frontW,82]],()=>ramp[1]);
  r.shape([[left+frontW+5,101],[left+frontW+sideW,78],[left+frontW+sideW,153],[left+frontW+7,177],[left+frontW,146]],()=>ramp[1]);
  r.shape([[left+frontW+7,177],[left+frontW+sideW,153],[left+frontW+sideW,bottom-1],[left+frontW+4,bottom]],()=>ramp[1]);
  r.line(left+frontW+sideW-1,7,left+frontW+sideW-1,bottom-3,ramp[2]);

  // Shallow, flat-cleaved roof. The highlight follows the left roof bevel and
  // front lip instead of forming a separate slab or hinged cap.
  r.shape([[left,top],[left+frontW,top],[left+frontW+sideW,4],[left+15,4]],()=>ramp[5]);
  r.line(left+15,4,left+frontW+sideW,4,ramp[4]);
  r.line(left,top,left+frontW,top,ramp[5]);
  r.set(left+15,4,ramp[6]);
  r.set(left,top,ramp[6]);

  // The front facets are defined entirely by their shared value boundaries.
  // At this scale, tracing those boundaries with light pixels would turn a
  // physically valid plane junction back into the painted streak we rejected.
  r.line(left+frontW,top,left+frontW,bottom,ramp[1]);

  antialias(r);
  outline(r,ramp[0]);
  return r;
}
