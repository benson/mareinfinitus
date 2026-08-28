import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const macDir = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(macDir, "..", "..");

const required = [
  "index.html",
  "style.css",
  "app.js",
  "systems/creature-variation.js",
  "systems/ecology.js",
  "systems/ambient-life.js",
  "screensaver/macos/Sources/MareInfinitusView.h",
  "screensaver/macos/Sources/MareInfinitusView.m",
  "screensaver/macos/Resources/Info.plist",
];

for (const relativePath of required) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}

const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const localScripts = [...html.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/gi)].map((match) => match[1]);
const localStyles = [...html.matchAll(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].map((match) => match[1]);
const css = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");
const cssAssets = [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)].map((match) => match[1].trim());

for (const reference of [...localScripts, ...localStyles, ...cssAssets]) {
  if (/^(?:data:|#)/i.test(reference)) continue;
  if (/^(?:https?:)?\/\//i.test(reference)) {
    throw new Error(`Runtime dependency is remote and cannot be bundled offline: ${reference}`);
  }
  if (!fs.existsSync(path.join(projectRoot, reference))) {
    throw new Error(`HTML references a missing runtime asset: ${reference}`);
  }
}

const source = fs.readFileSync(path.join(macDir, "Sources", "MareInfinitusView.m"), "utf8");
if (!source.includes('queryItemWithName:@"screensaver" value:@"1"')) {
  throw new Error("Native host must request the shared screensaver runtime mode.");
}
if (!source.includes("loadFileURL:screenSaverURL allowingReadAccessToURL:webRoot")) {
  throw new Error("Native host is not loading the bundled web root with scoped file access.");
}
if (!source.includes("URL.isFileURL")) {
  throw new Error("Native host must reject non-file navigation.");
}
if (!source.includes("[self.mareWebView removeFromSuperview]") || !source.includes("self.mareWebView = nil")) {
  throw new Error("Native host must release WKWebView when the screen saver stops.");
}

const appSource = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");
if (!appSource.includes('get("screensaver") === "1"')) {
  throw new Error("Shared web runtime no longer exposes ?screensaver=1.");
}

const plist = fs.readFileSync(path.join(macDir, "Resources", "Info.plist"), "utf8");
for (const value of ["BNDL", "MareInfinitusView", "com.bensonperry.mareinfinitus.screensaver"]) {
  if (!plist.includes(`<string>${value}</string>`)) {
    throw new Error(`Info.plist is missing ${value}.`);
  }
}

console.log(`macOS screen saver inputs valid (${required.length} required files, ${localScripts.length + localStyles.length + cssAssets.length} local runtime references).`);
