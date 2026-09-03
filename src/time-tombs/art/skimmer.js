import {Raster} from './raster.js';
import {INDEX as I} from './palette.js';

// Battered passenger skimmer, gold geodesic on the flare skirt (Hyperion ch. 2).
// The proportions and valley route are our interpretation. Native 58×24 pixels.
export function buildSkimmer(frame=0){
  const r=new Raster(58,24),c=I.uniform,k=I.obsidian,g=I.accent[1];
  r.shape([[3,13],[10,11],[14,4],[24,2],[36,4],[41,11],[51,13],[56,17],[51,21],[9,21],[1,17]],(x,y)=>y<12?k[0]:y<16?c[1]:c[0]);
  // Cockpit frame and low swept canopy, not a transparent oval.
  r.line(11,11,16,5,c[2]);r.line(16,5,24,3,c[2]);r.line(24,3,36,5,c[1]);r.line(36,5,41,11,c[1]);
  r.line(14,11,39,11,k[2]);r.line(32,5,34,11,c[1]);r.line(15,7,20,5,I.sky[2]);
  // Theo's copper hair, horn-rimmed glasses, collar and hand at the controls.
  r.rect(25,6,5,3,I.skin[0]);r.rect(24,5,5,2,I.sun[0]);r.set(25,4,I.sun[0]);
  r.line(25,7,30,7,k[0]);r.set(27,7,c[2]);r.set(29,7,c[2]);
  r.rect(24,9,5,3,k[1]);r.set(26,9,c[2]);r.line(29,10,32,10,I.skin[0]);
  if(frame>=2){r.line(29,10,31,8,c[1]);r.line(31,8,31+frame%2,5,I.skin[0]);}
  // Different panels, rubbed-off paint, service hatch, short recessed vents.
  r.line(8,13,42,13,c[2]);r.line(42,13,50,15,c[1]);
  r.rect(9,15,8,3,k[1]);r.line(10,15,15,15,c[1]);
  r.line(5,17,11,18,k[0]);r.line(40,19,50,18,k[1]);
  r.line(18,20,29,20,k[0]);r.set(14,19,c[2]);r.line(42,15,45,15,c[2]);
  for(const x of [34,37,40])r.line(x,16,x+1,17,k[0]);
  // Six-sided geodesic badge, resting on the skirt's broad side panel.
  r.line(23,14,27,14,g);r.line(21,16,23,14,g);r.line(27,14,29,16,g);
  r.line(21,16,23,18,g);r.line(23,18,27,18,g);r.line(27,18,29,16,g);r.line(23,14,27,18,g);
  // Small lift vanes have a slow two-pose adjustment, no flashing exhaust.
  r.line(6,21,11,22-frame%2,k[2]);r.line(42,21,50,22-frame%2,k[2]);
  r.set(53,16,g);return r;
}
