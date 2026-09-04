import {INDEX as I} from './palette.js';
import {Raster, dither, prng} from './raster.js';

// The Cave Tombs: mouths cut into a canyon wall that runs behind the far
// monuments. The wall is far, so it sits one step lighter than the near ground.
// An undercut ledge shadows its middle; talus spills from its foot; chambers
// open at several levels, three large and several small.
export function buildCavesRelit({width = 330, height = 84, seed = 31} = {}) {
  const r = new Raster(width, height);
  const [s0, s1, s2, s3] = I.sand;
  const k0 = I.obsidian[0];
  const rand = prng(seed);
  const B = height - 3;

  const crest = [];
  for (let x = 0; x < width; x++) crest.push(Math.round(B - 52 - 9 * Math.sin(x / 31) - 4 * Math.sin(x / 9.1 + 2) - 2 * Math.sin(x / 3.3) - (x > 120 && x < 200 ? 8 : 0)));
  const ledgeAt = (x) => Math.round(B - 26 + 2 * Math.sin(x / 23));
  for (let x = 0; x < width; x++) {
    for (let y = crest[x]; y <= B; y++) {
      const t = (y - crest[x]) / (B - crest[x]);
      let c = s2;
      if (t < 0.1 && dither(x, y, 0.6)) c = s3;                                 // crest catches light
      const ledge = ledgeAt(x);
      if (y > ledge && y <= ledge + 4 && dither(x, y, [0.9, 0.7, 0.4, 0.15][y - ledge - 1] ?? 0)) c = s1; // undercut shadow
      if (y === ledge) c = s3;                                                  // the ledge lip
      if (t > 0.72 && dither(x, y, (t - 0.72) / 0.28 * 0.6)) c = s1;           // foot in shadow
      if ((y + Math.floor(x / 29)) % 8 === 0 && rand() < 0.5 && y !== ledge) c = s1; // strata, broken
      r.set(x, y, c);
    }
    r.set(x, crest[x], x % 9 === 4 ? s2 : s3);
    if (x % 17 === 0) r.set(x, crest[x] + 1, s1); // notches in the crest
  }
  // fissures branch down from crest notches
  for (const fx of [40, 108, 176, 250, 300]) { let x = fx; for (let y = crest[fx] + 2; y < B - 10; y++) { if (rand() < 0.22) x += rand() < 0.5 ? -1 : 1; if (rand() < 0.7) r.set(x, y, s1); if (y === ledgeAt(x)) y += 2; } }

  // mouths: [x, width, height]; large ones at the foot, small ones higher up
  const mouths = [[46, 16, 24], [140, 12, 18], [236, 14, 21], [88, 6, 8, B - 34], [190, 5, 7, B - 38], [270, 7, 9, B - 32], [310, 5, 6, B - 12]];
  for (const [mx, mw, mh, floor = B] of mouths) {
    const half = mw / 2;
    for (let y = floor - mh; y <= floor; y++) {
      const dy = floor - mh + half - y, hw = dy > 0 ? Math.sqrt(Math.max(0, half * half - dy * dy)) : half;
      for (let x = Math.round(mx - hw); x <= Math.round(mx + hw); x++) r.set(x, y, k0);
    }
    r.line(Math.round(mx - half) - 1, floor - mh + Math.round(half), Math.round(mx - half) - 1, floor, s3); // lit jamb
    r.rect(Math.round(mx - half) - 1, floor + 1, mw + 2, 1, floor === B ? s1 : s3);                          // sill
    if (floor === B) for (let i = 0; i < 8; i++) r.set(mx - Math.round(half) - 2 + Math.floor(rand() * (mw + 4)), B + 1 + Math.floor(rand() * 2), rand() < 0.6 ? s1 : s0);
  }
  // talus: a low slope of fallen rock along the foot, denser under the fissures
  for (let x = 0; x < width; x++) {
    const h = 2 + Math.round(2 * Math.sin(x / 13) + 1.5 * Math.sin(x / 5));
    for (let y = B - h; y <= B; y++) if (!I.obsidian.includes(r.get(x, y)) && dither(x, y, 0.55)) r.set(x, y, s1);
    if (rand() < 0.25) r.set(x, B + 1, s1);
    if (rand() < 0.12) r.set(x, B + 2, s0);
  }
  r.rect(0, B + 1, width, 1, dither(0, 0, 1) ? s1 : s1);
  return r;
}

// The canyon's back wall, full world width. The Cave Tombs are cut into it,
// which is why this is one sprite: the wall IS the Cave Tombs landmark. The rim
// climbs toward the Palace end so the valley reads as closing in to the right
// and opening onto the desert at the Sphinx end. Buttress folds alternate lit
// and shadow faces; gullies run down between them; talus collects at the foot.
export function buildCanyonWall({width = 860, height = 124, seed = 37, human = 12} = {}) {
  const r = new Raster(width, height);
  const [s0, s1, s2, s3] = I.sand;
  const [g0, g1] = I.ridge;
  const k0 = I.obsidian[0];
  const rand = prng(seed);
  const B = height - 3;

  // The wall is absent at the valley mouth (left), rises steadily, and carries
  // two pinnacles. Height is clamped so the left end fades into the desert.
  const bump = (x, at, w) => Math.exp(-((x - at) * (x - at)) / (2 * w * w));
  const sx = width / 860; // feature positions were authored on an 860-wide wall
  const rim = [], wallH = [];
  for (let x = 0; x < width; x++) {
    const u = x / width;
    let h = -8 + 30 * u + 66 * Math.pow(u, 1.6) + 7 * Math.sin(x / 41) + 3 * Math.sin(x / 11 + 1) + 1.5 * Math.sin(x / 3.7) + 16 * bump(x, 612 * sx, 11) + 11 * bump(x, 796 * sx, 8) + 8 * bump(x, 452 * sx, 14);
    h = Math.max(0, Math.round(h));
    wallH.push(h); rim.push(B - h);
  }
  // buttress folds: irregular widths, soft lit/shadow transitions, some recessed
  const folds = [];
  for (let x = 0; x < width;) { const w = 12 + Math.floor(rand() * 46); folds.push({x0: x, x1: x + w, litFrac: 0.35 + rand() * 0.35, recessed: rand() < 0.22, strata: Math.floor(rand() * 9)}); x += w; }
  const foldAt = (x) => folds.find((f) => x >= f.x0 && x < f.x1) ?? folds.at(-1);
  const ledgeAt = (x) => Math.round(B - 30 - 8 * (x / width) + 2 * Math.sin(x / 29));

  for (let x = 0; x < width; x++) {
    if (wallH[x] < 2) continue;
    const f = foldAt(x), u = (x - f.x0) / (f.x1 - f.x0);
    const edge = (u - f.litFrac) / 0.14;
    for (let y = rim[x]; y <= B; y++) {
      const lit = u < f.litFrac || (edge < 1 && dither(x, y, 1 - edge));
      const t = (y - rim[x]) / Math.max(1, B - rim[x]);
      let c = lit ? s2 : s1;
      if (f.recessed) c = lit ? s1 : s0;
      if (lit && !f.recessed && t < 0.14 && dither(x, y, 0.55)) c = s3;
      if (!lit && t > 0.5 && dither(x, y, (t - 0.5) * 0.9)) c = s0;
      if (lit && t > 0.75 && dither(x, y, (t - 0.75) / 0.25 * 0.6)) c = f.recessed ? s0 : s1;
      const ledge = ledgeAt(x);
      if (wallH[x] > 24) {
        if (y === ledge && lit && !f.recessed) c = s3;
        if (y > ledge && y <= ledge + 3 && dither(x, y, [0.85, 0.5, 0.2][y - ledge - 1])) c = lit ? s1 : s0;
      }
      if (lit && (y + f.strata) % 11 === 0 && rand() < 0.3 && y !== ledge) c = f.recessed ? s0 : s1;
      r.set(x, y, c);
    }
    r.set(x, rim[x], u < f.litFrac && !f.recessed ? s3 : s2);
    if (u < 0.05) for (let y = rim[x] + 2; y < B - 4; y++) if (rand() < 0.7) r.set(x, y, s0); // gully between folds
  }
  // distant mesas beyond the valley mouth, where the wall is low or absent
  for (let x = 0; x < width * 0.6; x++) {
    const h = 9 + 5 * Math.sin(x / 37 + 2) + 3 * Math.sin(x / 9), top = Math.round(B - 26 - h - 12 * (1 - x / (width * 0.6)));
    for (let y = top; y < Math.min(rim[x], B - 24); y++) r.set(x, y, y < top + 2 && Math.sin(x / 37 + 2) > Math.sin((x - 1) / 37 + 2) ? g1 : g0);
  }
  // cave mouths cut into the foot and the ledge, toward the tall end
  // mouths are sized from `human`: the big three are a little over head height
  const hs = human / 20;
  const mouths = [[566, 16, 24], [634, 12, 19], [712, 14, 22], [600, 6, 8, 'ledge'], [672, 5, 7, 'ledge'], [748, 7, 9, 'ledge'], [790, 5, 6, 'ledge'], [520, 5, 6, 'ledge']]
    .map(([mx, mw, mh, where]) => [Math.round(mx * sx), Math.max(3, Math.round(mw * hs)), Math.max(3, Math.round(mh * hs)), where]);
  for (const [mx, mw, mh, where] of mouths) {
    const floor = where === 'ledge' ? ledgeAt(mx) - 1 : B, half = mw / 2;
    for (let y = floor - mh; y <= floor; y++) {
      const dy = floor - mh + half - y, hw = dy > 0 ? Math.sqrt(Math.max(0, half * half - dy * dy)) : half;
      for (let x = Math.round(mx - hw); x <= Math.round(mx + hw); x++) r.set(x, y, k0);
    }
    r.line(Math.round(mx - half) - 1, floor - mh + Math.round(half), Math.round(mx - half) - 1, floor, s3);
    r.rect(Math.round(mx - half) - 1, floor + 1, mw + 2, 1, s3);
    if (where !== 'ledge') for (let i = 0; i < 8; i++) r.set(mx - Math.round(half) - 2 + Math.floor(rand() * (mw + 4)), B + 1 + Math.floor(rand() * 2), rand() < 0.6 ? s1 : s0);
  }
  // talus along the foot wherever there is a wall
  for (let x = 0; x < width; x++) {
    if (wallH[x] < 6) continue;
    const h = 2 + Math.round(2 * Math.sin(x / 13) + 1.5 * Math.sin(x / 5));
    for (let y = B - h; y <= B; y++) if (!I.obsidian.includes(r.get(x, y)) && dither(x, y, 0.5)) r.set(x, y, s1);
    if (rand() < 0.3) r.set(x, B + 1, s1);
    if (rand() < 0.12) r.set(x, B + 2, s0);
  }
  return r;
}
