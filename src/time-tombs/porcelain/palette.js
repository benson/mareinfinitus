import {PALETTE} from '../art/palette.js';
const colors={
 ink:[29,58,64],deep:[49,78,83],cold:[77,108,111],teal:[110,146,145],
 haze:[148,179,170],chalk:[185,204,180],cream:[218,222,189],light:[245,231,187],
 gold:[228,198,146],sand:[201,179,137],dust:[166,157,130],ochre:[142,133,106],
 peach:[226,172,134],clay:[187,142,117],clayShade:[147,126,114],
 sky:[169,209,196],skyLight:[197,223,203],blue:[122,158,160],
 limestone:[229,218,181],alluvium:[210,201,169],mistShadow:[151,177,169],mistMid:[168,190,177],mistStone:[194,207,188],
 jadeDark:[44,80,77],jade:[65,105,90],leaf:[95,134,106],mineral:[135,165,124],celadon:[171,191,144]
};
export const C=Object.fromEntries(Object.entries(colors).map(([name,rgb])=>{
 let i=PALETTE.findIndex(c=>c.every((v,j)=>v===rgb[j]));if(i<0){i=PALETTE.length;PALETTE.push(rgb);}return [name,i];
}));
export const R={
 stone:[C.deep,C.cold,C.dust,C.sand,C.gold,C.cream,C.light],
 floor:[C.cold,C.teal,C.dust,C.sand,C.cream,C.light,C.skyLight],
 cliff:[C.deep,C.cold,C.blue,C.teal,C.haze,C.cream,C.light],
 far:[C.mistShadow,C.mistMid,C.haze,C.chalk,C.mistStone,C.cream,C.skyLight],
 terrace:[C.cold,C.teal,C.dust,C.alluvium,C.limestone,C.cream,C.light],
 distance:[C.haze,C.mistShadow,C.mistMid,C.chalk,C.mistStone,C.cream,C.skyLight],
 salmon:[C.deep,C.clayShade,C.clay,C.peach,C.gold,C.cream,C.light],
 crystal:[C.cold,C.teal,C.haze,C.chalk,C.cream,C.light,C.skyLight],
 jade:[C.jadeDark,C.jade,C.leaf,C.mineral,C.celadon,C.chalk,C.cream],
 obsidian:[C.ink,C.deep,C.cold,C.teal,C.haze,C.chalk,C.cream],
 canvas:[C.deep,C.ochre,C.dust,C.sand,C.gold,C.cream,C.light]
};
