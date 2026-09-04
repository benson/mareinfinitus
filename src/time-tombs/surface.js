import {WORLD} from './space.js';

// The finished stage encodes depth directly in authored screen-space ground
// bands. Runtime ground coordinates therefore are screen coordinates; no old
// large-world dune height field may bend or rescale the reference composition.
let cached;
export const TERRAIN_REVISION=2;
export function buildHeightField(){return cached??={width:WORLD.width,height:WORLD.height,data:new Float32Array(WORLD.width*WORLD.height),maximum:0,front:new Float32Array(WORLD.width*WORLD.height).fill(-Infinity)};}
export function elevationAt(_x,_y){return 0;}
export const projectGround=(x,y,z=0)=>({x:Math.round(x),y:Math.round(y-z)});
export function slopeAt(_x,_y){return{x:0,y:0};}
export function rayToGround(x,y,z,light){return projectGround(x+light.dx*Math.max(0,z),y+light.dy*Math.max(0,z));}
export function terrainOccludes(_x,_screenY,_groundY){return false;}
