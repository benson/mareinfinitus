// Every channel sits on the Mega Drive 3-bit ladder: 0 36 73 109 146 182 219 255.
// Ramps are organized by material and by depth band. Values chosen for grayscale
// separation first: sky light, ridges mid-light, ground mid, structures dark.
export const RAMPS = {
  sky:      [[0,0,36],[36,0,73],[73,36,109],[146,73,109],[219,109,73],[255,182,109]],
  ridge:    [[109,73,109],[146,109,146]],
  sand:     [[109,73,73],[146,109,73],[182,146,109],[219,182,146]],
  obsidian: [[0,0,36],[36,36,73],[73,73,109],[109,109,146]],
  anomaly:  [[109,182,219],[182,219,255]],
  sun:      [[219,109,73],[255,182,109]],
  uniform:  [[36,36,73],[73,73,109],[109,109,146]],
  skin:     [[109,73,36],[146,109,73]],
  accent:   [[219,109,73],[182,109,73]]
};

export const PALETTE = [];
export const INDEX = {};
for (const [ramp, colors] of Object.entries(RAMPS)) {
  INDEX[ramp] = colors.map((rgb) => {
    const key = rgb.join(",");
    let at = PALETTE.findIndex((c) => c.join(",") === key);
    if (at < 0) { PALETTE.push(rgb); at = PALETTE.length - 1; }
    return at;
  });
}
export const TRANSPARENT = 255;
