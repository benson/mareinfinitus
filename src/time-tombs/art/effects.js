import {fromMask} from './raster.js';
import {INDEX as I} from './palette.js';

// Small animated materials get the same native-grid authorship as landmarks.
// Smoke loosens into separated lobes; it is not a stretched/faded rectangle.
export const SMOKE_FRAMES=[
 ['.a.','aa.','.a.'],
 ['.aa.','aaa.','.aa.'],
 ['..aa.','.aaa.','aa.a.','.a...'],
 ['.aa...','a..a..','...aa.','.a....']
].map(rows=>fromMask(rows,{a:I.ridge[0]}));
export const FOOTPRINT=fromMask(['..a','aa.'],{a:I.sand[0]});
