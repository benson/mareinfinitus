import {OBSIDIAN} from './tiles/obsidian.js';import {OBELISK_MAP} from './maps/obelisk.js';
import {SPHINX} from './tiles/sphinx.js';import {SPHINX_MAP} from './maps/sphinx.js';
import {JADE_TILES} from './tiles/jade-production.js';import {JADE_MAP} from './maps/jade.js';
import {CRYSTAL_TILES} from './tiles/crystal-production.js';import {CRYSTAL_MAP} from './maps/crystal.js';
import {PALACE} from './tiles/palace.js';import {PALACE_MAP} from './maps/palace.js';
import {CANYON} from './tiles/canyon.js';import {CANYON_MAP} from './maps/canyon.js';
export const TILE_SCENES=[
 {key:'obelisk',vocab:OBSIDIAN,map:OBELISK_MAP,ramp:'obsidian',builder:'buildObeliskRelit',module:'obelisk-relit',size:[42,240],reference:'castlevania-bloodlines',crop:[0,56,120,140]},
 {key:'sphinx',vocab:SPHINX,map:SPHINX_MAP,ramp:'stone',builder:'buildSphinxRelit',module:'sphinx-relit',size:[190,132],reference:'castlevania-bloodlines',crop:[0,56,120,140]},
 {key:'jade',vocab:JADE_TILES,map:JADE_MAP,ramp:'jade',builder:'buildJadeRelit',module:'jade-relit',size:[150,108],reference:'pitfall',crop:[0,48,100,146]},
 {key:'crystal',vocab:CRYSTAL_TILES,map:CRYSTAL_MAP,ramp:'crystal',builder:'buildCrystalRelit',module:'crystal-relit',size:[70,228],reference:'sonic-spinball',crop:[10,25,80,160]},
 {key:'palace',vocab:PALACE,map:PALACE_MAP,ramp:'obsidian',builder:'buildPalaceRelit',module:'palace-relit',size:[200,240],reference:'castlevania-bloodlines',crop:[0,56,120,140]},
 {key:'caves',vocab:CANYON,map:CANYON_MAP,ramp:'sand',builder:'buildCanyonWall',module:'caves-relit',size:[1120,124],reference:'earthworm-jim',crop:[181,119,127,105]}
];
