import { PALETTE, TRANSPARENT } from './palette.js';

export class Raster {
  constructor(width, height, fill = TRANSPARENT) {
    this.width = width; this.height = height;
    this.data = new Uint8Array(width * height).fill(fill);
  }
  inside(x, y) { return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.width && y < this.height; }
  set(x, y, index) { if (this.inside(x, y)) this.data[y * this.width + x] = index; }
  get(x, y) { return this.inside(x, y) ? this.data[y * this.width + x] : TRANSPARENT; }
  rect(x, y, w, h, index) { for (let j=y;j<y+h;j++) for(let i=x;i<x+w;i++) this.set(i,j,index); }
  line(x0,y0,x1,y1,index) {
    const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1; let e=dx+dy;
    for(;;) { this.set(x0,y0,index); if(x0===x1&&y0===y1)break; const e2=e*2; if(e2>=dy){e+=dy;x0+=sx;} if(e2<=dx){e+=dx;y0+=sy;} }
  }
  // Boundary only: callers must supply a material function for finished art.
  shape(points, material) {
    const minY=Math.max(0,Math.min(...points.map(p=>p[1]))), maxY=Math.min(this.height-1,Math.max(...points.map(p=>p[1])));
    for(let y=minY;y<=maxY;y++) {
      const cuts=[];
      for(let i=0;i<points.length;i++) {
        const a=points[i],b=points[(i+1)%points.length];
        if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))cuts.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
      cuts.sort((a,b)=>a-b);
      for(let c=0;c<cuts.length;c+=2)for(let x=Math.ceil(cuts[c]);x<=Math.floor(cuts[c+1]);x++)this.set(x,y,material(x,y));
    }
  }
  blit(sprite,x,y,mirror=false) {
    for(let j=0;j<sprite.height;j++)for(let i=0;i<sprite.width;i++) { const v=sprite.get(i,j);if(v!==TRANSPARENT)this.set(x+(mirror?sprite.width-1-i:i),y+j,v); }
  }
  clone() { const r=new Raster(this.width,this.height);r.data.set(this.data);return r; }
  toRGBA() {
    const out=new Uint8ClampedArray(this.width*this.height*4);
    this.data.forEach((v,p)=>{if(v===TRANSPARENT)return;const c=PALETTE[v];if(!c)throw Error(`Invalid palette index ${v}`);out.set([...c,255],p*4);});return out;
  }
}
export function fromMask(rows,legend) {
  const r=new Raster(Math.max(...rows.map(s=>s.length)),rows.length);
  rows.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch!=='.'&&ch!==' '){if(legend[ch]===undefined)throw Error(`Unknown mask symbol ${ch}`);r.set(x,y,legend[ch]);}}));return r;
}
const BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
export function dither(x,y,t){return BAYER[y&3][x&3]/16<t;}
export function prng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}

// Fill enclosed alpha holes for ownership only, never change the art. Exterior
// outlines and hover both come from this mask; no geometry is stitched together.
export function silhouette(r) {
  const w=r.width+2,h=r.height+2,outside=new Uint8Array(w*h),queue=[0];outside[0]=1;
  for(let q=0;q<queue.length;q++) {
    const p=queue[q],x=p%w,y=Math.floor(p/w);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,np=ny*w+nx;if(nx<0||ny<0||nx>=w||ny>=h||outside[np]||r.get(nx-1,ny-1)!==TRANSPARENT)continue;outside[np]=1;queue.push(np);}
  }
  const mask=new Uint8Array(r.width*r.height),border=[];
  for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++)mask[y*r.width+x]=outside[(y+1)*w+x+1]?0:1;
  for(let y=-1;y<=r.height;y++)for(let x=-1;x<=r.width;x++) {
    if(!outside[(y+1)*w+x+1])continue;
    if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const nx=x+dx,ny=y+dy;return nx>=0&&ny>=0&&nx<r.width&&ny<r.height&&mask[ny*r.width+nx];}))border.push([x,y]);
  }
  return {mask,border};
}
