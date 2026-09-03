import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const htmlPath = path.join(projectRoot, "index.html");
const runtimeFiles = [
  "style.css",
  "systems/scene-runtime.js",
  "systems/world-memory.js",
  "systems/soundscape.js",
  "systems/silhouette-library.js",
  "systems/creature-variation.js",
  "systems/ecology.js",
  "systems/ambient-life.js",
  "systems/light-field.js",
  "systems/motion-engine.js",
  "systems/world-physics.js",
  "systems/scene-engine.js",
  "systems/event-director.js",
  "scenes/mare-infinitus.js",
  "scenes/time-tombs.js",
  "app.js",
];
const dynamicRuntimeFiles = [
  { importer: "scenes/time-tombs.js", relativePath: "dist/time-tombs/time-tombs.js", referencePath: "../dist/time-tombs/time-tombs.js" },
];

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

for (const entry of dynamicRuntimeFiles) {
  const importerPath = path.join(projectRoot, entry.importer);
  const contents = fs.readFileSync(path.join(projectRoot, entry.relativePath));
  const version = crypto.createHash("sha256").update(contents).digest("hex").slice(0, 12);
  const referencePath = entry.referencePath || entry.relativePath;
  const referencePattern = new RegExp(`${escapePattern(referencePath)}(?:\\?v=(?:PHASER_BUNDLE_HASH|[a-f0-9]{12}))?`, "g");
  const importer = fs.readFileSync(importerPath, "utf8");
  if (!referencePattern.test(importer)) throw new Error(`${entry.importer} does not reference ${referencePath}.`);
  fs.writeFileSync(importerPath, importer.replace(referencePattern, `${referencePath}?v=${version}`));
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
console.log(`Stamped ${runtimeFiles.length} direct and ${dynamicRuntimeFiles.length} dynamic runtime assets.`);
