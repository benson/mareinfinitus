import {buildObeliskRelit} from './obelisk-relit.js';
import {buildCrystalRelit} from './crystal-relit.js';
import {buildPalaceRelit} from './palace-relit.js';
import {buildSphinxRelit} from './sphinx-relit.js';
import {buildJadeRelit} from './jade-relit.js';
import {buildCanyonWall} from './caves-relit.js';

// Finished stage art. Human is the native-pixel height of a person at each
// monument's depth; it sizes thresholds and apertures, never the monument mass.
export const TOMB_BUILDERS={
  caves:()=>buildCanyonWall({width:1120,height:124,human:5}),
  palace:()=>buildPalaceRelit({width:200,height:240,human:5}),
  crystal:()=>buildCrystalRelit({width:70,height:228}),
  jade:()=>buildJadeRelit({width:150,height:108,human:6}),
  obelisk:()=>buildObeliskRelit({width:42,height:240,human:7}),
  sphinx:()=>buildSphinxRelit({width:190,height:132,human:7})
};
