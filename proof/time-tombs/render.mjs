// Headless render for inspection: node proof/time-tombs/render.mjs <outdir>
import sharp from "sharp";
import path from "node:path";
import { renderFrame, buildObelisk } from "./scene.js";
import { KASSAD_FRAMES } from "./kassad.js";
import { Raster } from "./raster.js";
import { INDEX } from "./palette.js";

const out = process.argv[2] ?? ".";
async function save(raster, scale, name, grayscale = false) {
  let img = sharp(Buffer.from(raster.toRGBA().buffer), { raw: { width: raster.width, height: raster.height, channels: 4 } })
    .resize(raster.width * scale, raster.height * scale, { kernel: "nearest" });
  if (grayscale) img = img.grayscale();
  await img.png().toFile(path.join(out, name));
}
const frame = renderFrame(6);
await save(frame, 4, "slice-4x.png");
await save(frame, 4, "slice-gray.png", true);
await save(renderFrame(13), 4, "slice-b-4x.png");
const sheet = new Raster(12 * 4 + 10, 24, INDEX.sand[1]);
KASSAD_FRAMES.forEach((f, i) => sheet.blit(f, 2 + i * 14, 2));
await save(sheet, 8, "kassad-8x.png");
const ob = new Raster(30, 74, INDEX.sand[1]); ob.blit(buildObelisk(), 6, 2);
await save(ob, 6, "obelisk-6x.png");
console.log("rendered to", out);
