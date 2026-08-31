import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const windowsRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1))), "..");
const projectRoot = path.resolve(windowsRoot, "..", "..");

const required = [
  "MareInfinitus.cpp",
  "build.ps1",
  "Install-MareInfinitus.ps1",
  "Uninstall-MareInfinitus.ps1",
  "Install.cmd",
  "Uninstall.cmd",
  "app.manifest",
  "version.rc"
];

for (const file of required) {
  if (!fs.existsSync(path.join(windowsRoot, file))) throw new Error(`Missing Windows screensaver input: ${file}`);
}

const source = fs.readFileSync(path.join(windowsRoot, "MareInfinitus.cpp"), "utf8");
for (const token of [
  "CreateCoreWebView2EnvironmentWithOptions",
  "SetVirtualHostNameToFolderMapping",
  "index.html?screensaver=1",
  "LaunchOptions::Mode::Preview",
  "LaunchOptions::Mode::FullScreen",
  "RequestExit()",
  "IsWindow(g_previewParent)",
  "ICoreWebView2Controller2",
  "put_DefaultBackgroundColor(oceanNight)",
  "controller->put_IsVisible(FALSE)",
  "add_NavigationCompleted"
]) {
  if (!source.includes(token)) throw new Error(`Windows native host is missing required behavior: ${token}`);
}

const build = fs.readFileSync(path.join(windowsRoot, "build.ps1"), "utf8");
for (const asset of ["index.html", "style.css", "app.js", "systems", "scenes", "public"]) {
  if (!build.includes(asset)) throw new Error(`Windows build does not bundle ${asset}`);
}

const sharedApp = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");
if (!sharedApp.includes('runtimeParams.get("screensaver") === "1"')) {
  throw new Error("Shared screensaver runtime gate is missing from app.js");
}

console.log("Windows screensaver source validation passed.");
