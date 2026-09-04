import { INDEX } from "./palette.js";
import { fromMask } from "./raster.js";

// Colonel Fedmahn Kassad: tall, lean, close-cropped dark hair, dark skin, FORCE
// field uniform in blue-grey. 12x20 logical pixels, side view facing right.
// Light from upper-left: the back edge of the uniform carries the highlight.
const L = {
  o: INDEX.obsidian[0],   // outline, hair, boots
  u: INDEX.uniform[1],    // uniform mid
  l: INDEX.uniform[2],    // uniform lit (back edge)
  d: INDEX.uniform[0],    // uniform shadow (front / underside)
  s: INDEX.skin[0],       // skin
  g: INDEX.accent[0]      // belt / FORCE insignia
};

const HEAD = [
  "....oooo....",
  "....ooss....",
  "....ooso....",
  ".....sss....",
  "......s....."
];

// contact pose: legs apart, arms counter-swung
const CONTACT_A = [
  "....luuuo...",
  "...lluuuuud.",
  "...luuuuu.d.",
  "...l.uuuud.d",
  "...l.uuuud.d",
  "...s.uuuud.s",
  ".....gggg...",
  ".....uuud...",
  "....uuu.ud..",
  "....uu..ud..",
  "...uu....ud.",
  "...uu....ud.",
  "..oo.....oo.",
  "..oo......oo",
  "............"
];
// contact pose, other leg: arms swapped
const CONTACT_B = [
  "....luuuo...",
  "...lluuuudo.",
  "...luuuuud..",
  "..l..uuuud..",
  ".l...uuuudd.",
  ".s...uuuud.s",
  ".....gggg...",
  ".....uuud...",
  "....uuu.ud..",
  "....uu..ud..",
  "...uu....ud.",
  "...uu....ud.",
  "..oo.....oo.",
  "..oo......oo",
  "............"
];
// passing pose: body one pixel higher, back leg under the body, front leg lifted
const PASS = [
  "....luuuo...",
  "...lluuuudo.",
  "...luuuuud..",
  "...l.uuuud..",
  "...l.uuuudd.",
  "...s.uuuud.s",
  ".....gggg...",
  ".....uuud...",
  ".....uuud...",
  ".....uu.ud..",
  ".....uu.uud.",
  ".....uu..oo.",
  ".....oo.....",
  ".....oo.....",
  "............"
];

function frame(body, lift) {
  const rows = [...HEAD, ...body];
  const padded = lift ? [...rows.slice(1), "............"] : rows;
  return fromMask(padded, L);
}

export const KASSAD_FRAMES = [
  frame(CONTACT_A, false),
  frame(PASS, true),
  frame(CONTACT_B, false),
  frame(PASS, true)
];
export const KASSAD_SIZE = { width: 12, height: 20 };
