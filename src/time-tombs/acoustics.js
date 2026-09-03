// Camera-space acoustics do not depend on CSS pixels or viewport dimensions.
export function spatialAt(source,listener){
  const dx=source.x-listener.x,dy=source.y-listener.y;
  return {pan:Math.max(-.9,Math.min(.9,dx/180)),gain:1/(1+(Math.hypot(dx,dy)/155)**2)};
}
