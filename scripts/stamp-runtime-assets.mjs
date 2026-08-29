import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const htmlPath = path.join(projectRoot, "index.html");
const runtimeFiles = [
  "style.css",
  "systems/creature-variation.js",
  "systems/ecology.js",
  "systems/ambient-life.js",
  "systems/light-field.js",
  "systems/motion-engine.js",
  "systems/world-physics.js",
  "systems/scene-engine.js",
  "systems/event-director.js",
  "app.js",
];

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let html = fs.readFileSync(htmlPath, "utf8");
for (const relativePath of runtimeFiles) {
  const contents = fs.readFileSync(path.join(projectRoot, relativePath));
  const version = crypto.createHash("sha256").update(contents).digest("hex").slice(0, 12);
  const pattern = new RegExp(`((?:href|src)=")${escapePattern(relativePath)}(?:\\?v=[^"]*)?(")`, "g");
  if (!pattern.test(html)) throw new Error(`index.html does not reference ${relativePath}.`);
  pattern.lastIndex = 0;
  html = html.replace(pattern, `$1${relativePath}?v=${version}$2`);
}

fs.writeFileSync(htmlPath, html);
console.log(`Stamped ${runtimeFiles.length} runtime assets in index.html.`);
