import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const failures = [];
const notes = [];

function relative(file) {
  return path.relative(projectRoot, file).replaceAll(path.sep, "/");
}

function fail(message) {
  failures.push(message);
}

function requireFile(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) fail(`Missing required file: ${relativePath}`);
  return absolutePath;
}

function runNode(args, label) {
  const result = spawnSync(process.execPath, args, { cwd: projectRoot, encoding: "utf8" });
  if (result.status !== 0) fail(`${label} failed:\n${(result.stderr || result.stdout).trim()}`);
}

function pngDimensions(file) {
  const buffer = fs.readFileSync(file);
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature || buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error(`${relative(file)} is not a valid PNG with an IHDR header.`);
  }
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

function expectPng(relativePath, expectedWidth, expectedHeight) {
  const file = requireFile(relativePath);
  if (!fs.existsSync(file)) return;
  try {
    const [width, height] = pngDimensions(file);
    if (width !== expectedWidth || height !== expectedHeight) {
      fail(`${relativePath} is ${width}x${height}; expected ${expectedWidth}x${expectedHeight}.`);
    }
  } catch (error) {
    fail(error.message);
  }
}

function localReferences(html) {
  const references = [];
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const value = match[1].trim();
    if (!value || value.startsWith("#") || /^(?:[a-z]+:)?\/\//i.test(value) || /^(?:data|mailto|tel):/i.test(value)) continue;
    references.push(value);
  }
  return references;
}

function validateWebPaths() {
  const htmlPath = requireFile("index.html");
  if (!fs.existsSync(htmlPath)) return;
  const html = fs.readFileSync(htmlPath, "utf8");
  for (const reference of localReferences(html)) {
    if (reference.startsWith("/")) {
      fail(`Root-relative asset is not GitHub Pages subpath-safe: ${reference}`);
      continue;
    }
    const clean = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
    const resolved = path.resolve(projectRoot, clean);
    if (!resolved.startsWith(`${projectRoot}${path.sep}`) || !fs.existsSync(resolved)) fail(`HTML references a missing or escaping local asset: ${reference}`);
  }
}

function validateRuntimeAssetVersions() {
  const htmlPath = requireFile("index.html");
  if (!fs.existsSync(htmlPath)) return;
  const html = fs.readFileSync(htmlPath, "utf8");
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
  for (const relativePath of runtimeFiles) {
    const absolutePath = requireFile(relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const expected = crypto.createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex").slice(0, 12);
    const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = html.match(new RegExp(`(?:href|src)="${escapedPath}\\?v=([a-f0-9]{12})"`));
    if (!match) fail(`Runtime asset ${relativePath} is missing its content-hash query in index.html.`);
    else if (match[1] !== expected) {
      fail(`Runtime asset ${relativePath} has stale version ${match[1]}; run npm run assets:stamp (expected ${expected}).`);
    }
  }
}

function validateDynamicRuntimeAssetVersions() {
  const entries = [
    { importer: "scenes/time-tombs.js", relativePath: "dist/time-tombs/time-tombs.js", referencePath: "../dist/time-tombs/time-tombs.js" },
  ];
  for (const entry of entries) {
    const importerPath = requireFile(entry.importer);
    const assetPath = requireFile(entry.relativePath);
    if (!fs.existsSync(importerPath) || !fs.existsSync(assetPath)) continue;
    const importer = fs.readFileSync(importerPath, "utf8");
    const expected = crypto.createHash("sha256").update(fs.readFileSync(assetPath)).digest("hex").slice(0, 12);
    const escapedPath = (entry.referencePath || entry.relativePath).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = importer.match(new RegExp(`${escapedPath}\\?v=([a-f0-9]{12})`));
    if (!match) fail(`Dynamic runtime asset ${entry.relativePath} is missing its content hash in ${entry.importer}.`);
    else if (match[1] !== expected) fail(`Dynamic runtime asset ${entry.relativePath} has stale version ${match[1]}; run npm run assets:stamp (expected ${expected}).`);
  }
}

function parseBestiary(source) {
  const startMarker = "var BESTIARY =";
  const endMarker = "var BESTIARY_BY_ID";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error("Could not locate the BESTIARY literal in app.js.");
  const assignment = source.slice(start + startMarker.length, end);
  const arrayStart = assignment.indexOf("[");
  const arrayEnd = assignment.lastIndexOf("]");
  if (arrayStart < 0 || arrayEnd < arrayStart) throw new Error("BESTIARY is not an array literal.");
  return vm.runInNewContext(`(${assignment.slice(arrayStart, arrayEnd + 1)})`, Object.create(null), { timeout: 1000 });
}

function validateGlossary() {
  const appPath = requireFile("app.js");
  if (!fs.existsSync(appPath)) return;
  const source = fs.readFileSync(appPath, "utf8");
  const retiredPatterns = [
    [/\bdebugFlow\b/, "debugFlow"],
    [/\bMI-05\b/, "MI-05"],
    [/Current tracers?/i, "Current tracers"],
    [/D currents/i, "D currents"],
    [/mare-observations/i, "observation persistence"],
    [/\bobservationCounts\b|\bobservedSubjects\b|\brecordObservation\b/, "seen-count implementation"],
    [/\bSEEN\b/, "SEEN label"],
  ];
  for (const [pattern, label] of retiredPatterns) if (pattern.test(source)) fail(`Retired glossary/debug feature leaked into app.js: ${label}.`);

  let entries;
  try {
    entries = parseBestiary(source);
  } catch (error) {
    fail(error.message);
    return;
  }
  if (!Array.isArray(entries) || entries.length < 1) {
    fail("BESTIARY must be a non-empty array.");
    return;
  }
  const ids = new Set();
  const instructionLeak = /\b(?:simulator|simulation|viewer|viewport|spawn(?:s|ed|ing)?|toggle|debug|implementation|internal detail|hitbox|overlap(?:s|ped|ping)?|should|must)\b|only one can appear|high-speed passes?/i;
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      fail("BESTIARY contains a non-object entry.");
      continue;
    }
    if (!/^MI-\d{2}$/.test(entry.id || "")) fail(`Invalid bestiary id: ${String(entry.id)}`);
    if (ids.has(entry.id)) fail(`Duplicate bestiary id: ${entry.id}`);
    ids.add(entry.id);
    for (const field of ["group", "name", "summary"]) {
      if (typeof entry[field] !== "string" || !entry[field].trim()) fail(`${entry.id || "unknown entry"} is missing ${field}.`);
    }
    if (entry.origin !== "BOOK" && entry.origin !== "SIM") fail(`${entry.id || "unknown entry"} has invalid origin ${String(entry.origin)}.`);
    if (typeof entry.summary === "string" && instructionLeak.test(entry.summary)) fail(`${entry.id} summary contains implementation/instruction language: ${entry.summary}`);
  }
  notes.push(`glossary ${entries.length} entries / ${ids.size} unique IDs`);
}

function validateForcedFlashlightPath() {
  const appPath = requireFile("app.js");
  if (!fs.existsSync(appPath)) return;
  const source = fs.readFileSync(appPath, "utf8");
  const poseStart = source.indexOf("function platformResidentPose(");
  const poseEnd = source.indexOf("function updatePlatformFlashlight(", poseStart);
  if (poseStart < 0 || poseEnd < 0) {
    fail("Could not locate the platform resident flashlight interaction path.");
    return;
  }
  const poseSource = source.slice(poseStart, poseEnd);
  if (!/Math\.min\(17,\s*visibleSpan\s*\*\s*0\.13\)/.test(poseSource)) {
    fail("The click-triggered platform flashlight must position its resident from the declared visibleSpan.");
  }
  if (/Math\.min\(17,\s*span\s*\*/.test(poseSource)) {
    fail("The click-triggered platform flashlight still references the retired undeclared span variable.");
  }
}

function validateManifest() {
  const manifestPath = requireFile("public/manifest.webmanifest");
  if (!fs.existsSync(manifestPath)) return;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.start_url !== "./" || manifest.scope !== "./") fail("Manifest start_url and scope must both be ./ for subpath-safe hosting.");
    if (!["fullscreen", "standalone"].includes(manifest.display)) fail("Manifest display must be fullscreen or standalone.");
    if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) fail("Manifest needs at least 192px and 512px icons.");
    for (const icon of manifest.icons || []) {
      if (String(icon.src).startsWith("/")) fail(`Manifest icon is not subpath-safe: ${icon.src}`);
      if (!fs.existsSync(path.join(path.dirname(manifestPath), icon.src))) fail(`Manifest references a missing icon: ${icon.src}`);
    }
  } catch (error) {
    fail(`Invalid manifest: ${error.message}`);
  }
}

function walk(directory) {
  const result = [];
  if (!fs.existsSync(directory)) return result;
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...walk(absolute));
    else result.push(absolute);
  }
  return result;
}

function validateNativeInputs() {
  const screensaverRoot = path.join(projectRoot, "screensaver");
  if (!fs.existsSync(screensaverRoot)) return;
  const validators = walk(screensaverRoot).filter((file) => /[\\/]scripts[\\/]validate\.mjs$/i.test(file));
  for (const validator of validators) runNode([validator], `${relative(validator)} native validation`);

  const bundledWebRoots = walk(screensaverRoot)
    .filter((file) => path.basename(file).toLowerCase() === "index.html" && /[\\/](?:build|dist|release|publish)[\\/]/i.test(file))
    .map((file) => path.dirname(file));
  for (const webRoot of bundledWebRoots) {
    for (const asset of ["index.html", "style.css", "app.js", "systems/scene-runtime.js", "systems/world-memory.js", "systems/soundscape.js", "systems/silhouette-library.js", "systems/creature-variation.js", "systems/ecology.js", "systems/ambient-life.js", "systems/light-field.js", "systems/motion-engine.js", "systems/world-physics.js", "systems/scene-engine.js", "systems/event-director.js", "dist/time-tombs/time-tombs.js", "scenes/mare-infinitus.js", "scenes/time-tombs.js"]) {
      if (!fs.existsSync(path.join(webRoot, asset))) fail(`Native web bundle ${relative(webRoot)} is missing ${asset}.`);
    }
    const html = fs.readFileSync(path.join(webRoot, "index.html"), "utf8");
    for (const reference of localReferences(html)) {
      const clean = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
      if (reference.startsWith("/") || !fs.existsSync(path.resolve(webRoot, clean))) fail(`Native web bundle ${relative(webRoot)} has an invalid local reference: ${reference}`);
    }
  }
  notes.push(`native ${validators.length} source validator(s), ${bundledWebRoots.length} built web bundle(s)`);
}

const javascriptFiles = ["app.js", "systems/scene-runtime.js", "systems/world-memory.js", "systems/soundscape.js", "systems/silhouette-library.js", "systems/creature-variation.js", "systems/ecology.js", "systems/ambient-life.js", "systems/light-field.js", "systems/motion-engine.js", "systems/world-physics.js", "systems/scene-engine.js", "systems/event-director.js", "scenes/mare-infinitus.js", "scenes/time-tombs.js"];
for (const file of javascriptFiles) {
  const absolute = requireFile(file);
  if (fs.existsSync(absolute)) runNode(["--check", absolute], `${file} syntax check`);
}
runNode([path.join(scriptDir, "generate-assets.mjs"), "--check"], "generated icon check");
requireFile("style.css");
requireFile("public/favicon.svg");
expectPng("public/favicon-32.png", 32, 32);
expectPng("public/apple-touch-icon.png", 180, 180);
expectPng("public/icon-192.png", 192, 192);
expectPng("public/icon-512.png", 512, 512);
expectPng("public/og.png", 1680, 944);
validateWebPaths();
validateRuntimeAssetVersions();
validateDynamicRuntimeAssetVersions();
validateGlossary();
validateForcedFlashlightPath();
validateManifest();
validateNativeInputs();

if (failures.length) {
  console.error(`Release validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Release validation passed: ${javascriptFiles.length} scripts, ${notes.join(", ")}.`);
}
