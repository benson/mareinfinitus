import {WORLD} from './space.js';

// One celestial state for both the visible sun and directional cast shadows.
// Quantize only the projection update, never the underlying slow orbit.
export function sunlightAt(time){
  const x=480+Math.sin(time/1000)*320,y=20-Math.sin(time/900)*65;
  const elevation=Math.max(0,Math.min(1,(100-y)/180));
  const dx=Math.round(Math.max(-.60,Math.min(.60,(WORLD.focusX-x)/650))*256)/256;
  const dy=Math.round((.20-elevation*.14)*256)/256;
  return {x:Math.round(x),y:Math.round(y),dx,dy,key:dx+':'+dy};
}
export const shadowPadding=subject=>Math.ceil(subject.height*.65)+2;
