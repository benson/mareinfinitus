import {INDEX} from './palette.js';
import {antialias, outline} from './shade.js';
import {assemble} from './tiles/assemble.js';
import {SPHINX} from './tiles/sphinx.js';
import {SPHINX_MAP} from './maps/sphinx.js';
export function buildSphinxRelit({width=190,height=132,human=7}={}) {
  if(width!==190||height!==132||human!==7)throw new RangeError('Sphinx is authored at 190x132 for a 7px person.');
  return outline(antialias(assemble(SPHINX_MAP,SPHINX,INDEX.stone,width,height)),INDEX.stone[0]);
}
