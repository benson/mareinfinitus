# Mare Infinitus for macOS

This directory builds the browser simulation as a native macOS screen-saver
module. The result is a real `Mare Infinitus.saver` bundle using Apple's
`ScreenSaver.framework`; a `WKWebView` loads a private, offline copy of the
project's HTML, CSS, JavaScript, and public assets through
`index.html?screensaver=1`.

The shared web runtime owns screen-saver behavior: it suppresses the welcome
dialog, glossary, controls, input, and debug hooks. The native host keeps a
small injected stylesheet as defense-in-depth, disables outbound navigation,
uses an ephemeral web-data store, and leaves the canvas at the display's native
dimensions. Each display gets an independent simulation.

## Requirements

- macOS 12 Monterey or newer
- Xcode 14 or newer with the macOS SDK selected (`xcode-select -p`)
- For public distribution: Apple Developer Program membership and a
  `Developer ID Application` certificate

The build targets both Apple silicon (`arm64`) and Intel (`x86_64`) because the
system's screen-saver engine loads plug-ins at its native architecture.

> **macOS 26.4 compatibility warning:** Apple has an [unresolved platform report](https://developer.apple.com/forums/thread/820860)
> where `WKWebView` content inside the public, legacy `ScreenSaverView` hierarchy
> disappears after about three seconds on macOS 26.4, despite working on 26.3.1.
> Apple has not published a replacement third-party screen-saver API. Treat
> 26.4 and newer as unverified until this is tested on the release build or Apple
> confirms a fix. The browser version remains the reliable fallback there.

## Build and install locally

From this directory on a Mac:

```bash
bash build.sh
bash install.sh
```

The build is written to `build/Mare Infinitus.saver`. The installer copies it
to `~/Library/Screen Savers/`; then open **System Settings → Screen Saver** and
select **Mare Infinitus**. Double-clicking the `.saver` bundle in Finder also
offers the system installation flow.

Every build snapshots the current root web files into the bundle. It never
loads `bensonperry.com` and remains functional offline.

## Validate inputs on any development machine

The parts that do not require Apple's SDK can be checked on Windows, Linux, or
macOS with Node:

```bash
node scripts/validate.mjs
```

The validator confirms that every runtime dependency referenced by the HTML is
local, all expected simulation systems exist, the plug-in metadata is present,
and the native host restricts navigation to its resource directory.

## Sign and notarize a public download

First save notary credentials in the macOS keychain once:

```bash
xcrun notarytool store-credentials "mare-infinitus-notary" \
  --apple-id "you@example.com" \
  --team-id "TEAMID" \
  --password "app-specific-password"
```

Then package a release:

```bash
DEVELOPER_ID_APPLICATION="Developer ID Application: Your Name (TEAMID)" \
NOTARY_PROFILE="mare-infinitus-notary" \
bash package-release.sh
```

This rebuilds the universal bundle, signs it with the hardened runtime,
submits its ZIP to Apple's notary service, staples the ticket to the `.saver`,
and recreates `release/Mare-Infinitus-macOS.zip` around the stapled bundle.

Without `NOTARY_PROFILE`, the script produces a signed but unnotarized archive
for private testing. Public downloads should always be notarized; quarantined
plug-ins otherwise require manual approval in macOS privacy and security
settings.

## Architecture and tradeoffs

- **Native wrapper, shared simulation:** there is one simulation codebase. A
  build copies the same root assets used by the web version, so visual fixes do
  not need to be ported to Swift or Objective-C.
- **Offline and versioned:** installed builds do not silently change with the
  website. New visual releases require a new `.saver` build and install.
- **System WebKit:** the bundle is small and receives WebKit security and GPU
  updates with macOS, but rendering can differ slightly between OS releases.
- **One explicit runtime mode:** the native host opens `?screensaver=1`, the
  same noninteractive mode used by other platform wrappers. Native CSS also
  hides browser UI if that shared runtime ever fails to initialize.
- **No background renderer leak:** when macOS stops the saver, the host destroys
  its web view instead of merely hiding it. Starting again creates a fresh
  simulation and web process.
- **Real plug-in constraints:** public releases need Developer ID signing,
  notarization, and a final smoke test on both an Apple-silicon Mac and an Intel
  Mac (or an Intel macOS test machine). Those steps cannot be completed on
  Windows.
