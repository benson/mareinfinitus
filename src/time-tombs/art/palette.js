// Promoted from the approved proof. Ramps describe materials, not image colors.
export const RAMPS = {
  sky: [[0,0,36],[36,0,73],[73,36,109],[146,73,109],[219,109,73],[255,182,109]],
  ridge: [[109,73,109],[146,109,146]],
  sand: [[109,73,73],[146,109,73],[182,146,109],[219,182,146]],
  obsidian: [[0,0,36],[36,36,73],[73,73,109],[109,109,146]],
  anomaly: [[109,182,219],[182,219,255]],
  sun: [[219,109,73],[255,182,109]],
  uniform: [[36,36,73],[73,73,109],[109,109,146]],
  skin: [[109,73,36],[146,109,73]],
  accent: [[219,109,73],[182,109,73]],
  stone: [[36,36,73],[73,73,73],[109,109,73],[182,146,109],[219,182,146]],
  crystal: [[36,36,109],[73,73,146],[109,109,182],[146,182,219],[219,219,255]],
  jade: [[0,36,36],[36,73,73],[73,109,73],[109,146,109],[182,182,109]],
  cloth: [[36,36,73],[73,36,73],[109,73,109],[182,109,109]],
  linen: [[73,73,73],[109,109,109],[182,146,109],[219,182,146]],
  fire: [[146,73,73],[219,109,73],[255,182,109],[255,219,146]]
};
export const PALETTE = [];
/** @type {Record<string, number[]>} */
export const INDEX = {};
for (const [name, colors] of Object.entries(RAMPS)) {
  INDEX[name] = colors.map(rgb => {
    let i = PALETTE.findIndex(c => c.join(',') === rgb.join(','));
    if (i < 0) { i = PALETTE.length; PALETTE.push(rgb); }
    return i;
  });
}
export const TRANSPARENT = 255;
