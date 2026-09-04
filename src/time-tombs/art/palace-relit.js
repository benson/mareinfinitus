import {INDEX as I} from './palette.js';
import {Raster, prng} from './raster.js';

// Worked example: the Shrike Palace as silhouette. The text gives barbed,
// serrated buttresses and a thing "less constructed than grown". Against a
// dusk sky the silhouette does all the work: three obsidian values, a rim on
// the horizon side of the tallest spires, one gate, almost no interior texture.
export function buildPalaceRelit({width = 200, height = 240, seed = 5, human = 20} = {}) {
  const r = new Raster(width, height);
  const [k0, k1, k2, k3] = I.obsidian;
  const rand = prng(seed);
  const baseY = height - 3;

  // A thorn: tapered, slightly curved polygon. lean>0 bends toward the right.
  function thorn(bx, by, h, bw, lean, shade) {
    const steps = 14, left = [], right = [];
    for (let i = 0; i <= steps; i++) {
      const s = i / steps, y = by - h * s;
      const cx = bx + lean * h * s * s * 0.35, hw = Math.max(0.5, bw * Math.pow(1 - s, 0.75));
      left.push([Math.round(cx - hw), Math.round(y)]); right.push([Math.round(cx + hw), Math.round(y)]);
    }
    const pts = [...left, ...right.reverse()];
    const tipY = by - h;
    r.shape(pts, (x, y) => {
      const s = (by - y) / h, cx = bx + lean * h * s * s * 0.35;
      if (shade === 'far') return k0;
      // lit half faces the horizon (left); the top of the tallest thorns catches light
      if (y < tipY + 5 && shade === 'near') return k2;
      return x < cx - 0.5 ? k1 : k0;
    });
    // rim along the lit silhouette
    if (shade !== 'far') for (const [x, y] of left) if (rand() > 0.12) r.set(x, y, shade === 'near' ? k2 : k1);
    if (shade === 'near') r.set(left[steps][0], tipY, k3);
    return {left, right};
  }
  // A barb: a small spike leaving a thorn's flank at height s, pointing up and out.
  function barb(bx, by, h, lean, s, dir, size, shade) {
    const y = by - h * s, cx = bx + lean * h * s * s * 0.35;
    const hw = Math.max(1, 6 * Math.pow(1 - s, 0.75)) * (dir > 0 ? 1 : -1);
    const root = [Math.round(cx + hw * 0.6), Math.round(y)];
    const tip = [Math.round(cx + hw * 0.6 + dir * size), Math.round(y - size * 1.4)];
    r.shape([root, [root[0], root[1] + Math.max(2, Math.round(size * 0.5))], tip], (x) => (shade === 'far' ? k0 : dir < 0 ? k1 : k0));
    if (dir < 0 && shade !== 'far') r.line(root[0], root[1] + 1, tip[0], tip[1], k1);
  }

  // Back rank: flat, unlit, shorter. Depth comes from value alone.
  for (const [x, h, w, lean] of [[52, 128, 8, 0.2], [96, 150, 9, -0.1], [138, 120, 7, 0.3], [170, 96, 6, 0.4]]) thorn(x, baseY - 8, h, w, lean, 'far');

  // Central mass: a heavy black body whose horizon-side face is one step lighter.
  const bodyL = 42, bodyR = 168, bodyTop = baseY - 78, split = 104;
  r.shape([[bodyL, baseY], [bodyL + 12, bodyTop], [bodyR - 16, bodyTop + 10], [bodyR, baseY]], (x, y) => {
    if (x < split) return y < bodyTop + 6 ? k2 : k1;
    return k0;
  });
  // serrated parapet: alternating notches along the top of the mass
  for (let x = bodyL + 14; x < bodyR - 18; x += 5) r.rect(x, bodyTop + Math.round((x - bodyL) * 10 / (bodyR - bodyL)), 2, 3, x < split ? k0 : k1);
  // gate: a pointed opening, darker than the lit face around it, with a lit reveal
  const gh = Math.round(human * 1.3), gw = 2 * Math.round(human * 0.35), gx = 91 - gw / 2;
  r.shape([[gx, baseY], [gx, baseY - gh + 6], [gx + gw / 2, baseY - gh], [gx + gw, baseY - gh + 6], [gx + gw, baseY]], () => k0);
  r.line(gx - 1, baseY, gx - 1, baseY - gh + 6, k2); r.line(gx - 1, baseY - gh + 6, gx + gw / 2 - 1, baseY - gh, k2);

  // Middle rank: the main spires, lit on the left half, with barbs.
  const spires = [[70, 196, 11, 0.12], [108, 232, 13, -0.06], [146, 176, 10, 0.25]];
  for (const [x, h, w, lean] of spires) {
    thorn(x, baseY - 4, h, w, lean, 'near');
    barb(x, baseY - 4, h, lean, 0.42, -1, 9, 'mid'); barb(x, baseY - 4, h, lean, 0.66, 1, 7, 'mid');
    barb(x, baseY - 4, h, lean, 0.55, 1, 5, 'mid'); barb(x, baseY - 4, h, lean, 0.3, 1, 8, 'mid');
  }

  // Front rank: buttresses splayed outward from the base, barbed, the left ones lit.
  for (const [x, h, w, lean] of [[28, 92, 9, -0.7], [58, 72, 7, -0.45], [178, 84, 8, 0.75], [152, 64, 6, 0.5]]) {
    thorn(x, baseY, h, w, lean, lean < 0 ? 'mid' : 'far');
    barb(x, baseY, h, lean, 0.5, lean < 0 ? -1 : 1, 6, lean < 0 ? 'mid' : 'far');
    barb(x, baseY, h, lean, 0.78, lean < 0 ? -1 : 1, 5, lean < 0 ? 'mid' : 'far');
  }

  // Apertures: narrow dark slots in the lit face, each with a lit upper rim. The
  // interior is as black as the walls, so only the rim tells you it is a hole.
  const hs = human / 20;
  for (const [x, y, h0] of [[62, baseY - 60, 7], [74, baseY - 48, 9], [90, baseY - 68, 6], [70, baseY - 30, 5], [98, baseY - 44, 7], [84, baseY - 20, 4]]) {
    const h = Math.max(2, Math.round(h0 * hs)), w = hs < 0.75 ? 1 : 2;
    r.rect(x, y, w, h, k0); r.rect(x - 1, y - 1, w + 1, 1, k2); r.set(x + w, y + h - 1, k1);
  }
  for (const [sx, sh, lean] of spires) for (const s of [0.2, 0.36, 0.5]) {
    const y = Math.round(baseY - 4 - sh * s), cx = Math.round(sx + lean * sh * s * s * 0.35) - 2;
    r.rect(cx, y, 1, 3, k0); r.set(cx, y - 1, k2);
  }
  // A fallen thorn lies broken at the foot of the horizon side.
  r.shape([[6, baseY], [14, baseY - 6], [44, baseY - 2], [46, baseY]], (x, y) => (y < baseY - 2 ? k1 : k0));
  r.line(14, baseY - 6, 44, baseY - 2, k2); r.rect(30, baseY - 4, 2, 2, k0);
  // Ground contact: broken apron and rubble, denser under the shadow side.
  for (let x = bodyL - 12; x < bodyR + 14; x++) { if (rand() < 0.75) r.set(x, baseY + 1, k1); if (rand() < 0.5) r.set(x, baseY + 2, k0); }
  for (let i = 0; i < 16; i++) {
    const shadow = rand() < 0.65, x = shadow ? bodyR + Math.floor(rand() * 18) : bodyL - 8 - Math.floor(rand() * 12);
    r.set(x, baseY + 1 + Math.floor(rand() * 2), shadow ? k0 : k1);
  }
  return r;
}
