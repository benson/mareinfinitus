import type {FieldEntry} from './types';
import {BOOK_COLLECTIONS} from './book-excerpts.js';
export {WORLD} from './space.js';
export const LANDMARKS:FieldEntry[]=[
 {id:'TT-01',name:'The Sphinx',group:'Time Tombs',summary:'A winged stone guardian with a human face, broad forepaws, and a small entrance beneath its breast.'},
 {id:'TT-02',name:'The Shrike Palace',group:'Time Tombs',summary:'A black, barbed palace of needle towers, ribbed buttresses, and dark openings.'},
 {id:'TT-03',name:'The Crystal Monolith',group:'Time Tombs',summary:'A slender crystalline monument, its cold facets rising above a cluster of splintered mineral spires.'},
 {id:'TT-04',name:'The Obelisk',group:'Time Tombs',summary:'A narrow black shaft with a pointed crown, faint courses, and minute lights.'},
 {id:'TT-05',name:'The Jade Tomb',group:'Time Tombs',summary:'A green mineral vault whose raised ribs flow down toward a recessed doorway.'},
 {id:'TT-06',name:'The Cave Tombs',group:'Time Tombs',summary:'Low stone chambers with shadowed entrances recessed into weathered rock.'},
 {id:'TT-07',name:'Pilgrim camp',group:'Expedition',summary:'Patched plum and pale canvas shelters, rolled bedding, travel cases, and a small fire on the sand below the monuments.'},
 {id:'TT-29',name:'Chronotropic instruments',group:'Expedition',summary:'Compact survey instruments with braced feet, metal receivers, and tiny illuminated indicators.'}
];
export const PILGRIMS:FieldEntry[]=[
 {id:'TT-20',name:'Brawne Lamia',group:'The pilgrims',summary:'The compact, powerful private investigator from Lusus, with dark hair and practical travel clothes.'},
 {id:'TT-21',name:'Sol Weintraub and Rachel',group:'The pilgrims',summary:'The older scholar with his infant daughter cradled against him. Rachel’s life is running backward toward birth.'},
 {id:'TT-22',name:'Martin Silenus',group:'The pilgrims',summary:'The ancient, profane poet: a stocky silhouette, unruly hair, and the unfinished Cantos behind his pilgrimage.'},
 {id:'TT-23',name:'The Consul',group:'The pilgrims',summary:'The reserved diplomat in a long coat, whose private history binds Hyperion, the Hegemony, and the Ousters.'},
 {id:'TT-24',name:'Father Lenar Hoyt',group:'The pilgrims',summary:'A thin priest in dark clothing and a pale collar, marked by the terrible inheritance of Paul Duré.'},
 {id:'TT-25',name:'Colonel Fedmahn Kassad',group:'The pilgrims',summary:'The FORCE officer in a blue-grey field uniform, with close-cropped dark hair and a military bearing.'},
 {id:'TT-26',name:'Het Masteen',group:'The pilgrims',summary:'The Templar and Treeship captain, a tall hooded figure enclosed in green robes.'}
];
export const SKY:FieldEntry[]=[
 {id:'TT-27',name:"Hyperion's sun",group:'Sky',summary:'A small, thorn-corona sun above the dusty valley.'},
 {id:'TT-30',name:'Distant moon',group:'Sky',summary:'A small, muted disc against the violet dusk.'},
 {id:'TT-28',name:'The time tide',group:'Phenomena',summary:'Light and suspended dust bending around the Tombs, as if around an invisible shore.'}
];
const ENCOUNTERS:FieldEntry[]=[
 {id:'TT-31',name:'The Shrike',group:'Encounters',summary:'A tall metallic silhouette among the Tombs: a thorned crown, four bladed arms, and cold facets around a dark, articulated body.'},
 {id:'TT-33',name:'Theo Lane’s skimmer',group:'Encounters',summary:'A battered passenger skimmer with a flared skirt and the gold geodesic of the Hegemony. Behind its canopy sits Theo Lane, the Consul’s former aide, with red hair and horn-rimmed glasses. This valley vignette draws on his flights elsewhere on Hyperion.'}
];
const TERRAIN:FieldEntry[]=[{id:'TT-32',name:'Wind-worn stones',group:'The valley',summary:'Low sandstone outcrops, with pale chipped ridges, split faces, and dark lee sides half buried in the sand.'}];
export const GUIDE:FieldEntry[]=[...LANDMARKS,...PILGRIMS,...SKY,...ENCOUNTERS,...TERRAIN].map(entry=>{
  const passages=(BOOK_COLLECTIONS as Record<string,Array<{excerpt:string;source:string}>>)[entry.id];
  return passages?{...entry,...passages[0],passages}:entry;
});
