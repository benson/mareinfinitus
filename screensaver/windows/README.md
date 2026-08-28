# Mare Infinitus for Windows

This directory builds the browser simulation as a real Windows `.scr` screensaver. The wrapper is a small native Win32 application using Microsoft Edge WebView2. It packages `index.html`, `style.css`, `app.js`, `systems/`, and `public/` beside the executable and maps them to a local-only virtual host, so playback does not depend on `bensonperry.com` or any other network connection.

## Build

Prerequisites:

- Windows 10 or 11
- Visual Studio 2022 Build Tools with **Desktop development with C++** and a Windows 10/11 SDK
- PowerShell 5.1 or newer
- Internet access for the first build only, to download the pinned Microsoft WebView2 SDK NuGet package

From this directory:

```powershell
.\build.ps1 -Clean
```

The build creates:

- `publish/MareInfinitus.scr` and its offline `publish/web/` assets
- `release/MareInfinitus-Screensaver-Windows-x64.zip`, ready to distribute

The Microsoft Edge WebView2 **Evergreen Runtime** must exist on the machine that runs the screensaver. It is included with current Windows 11 and most supported Windows 10 installations; if absent, install the Evergreen Runtime from Microsoft. The SDK used to compile the wrapper is not shipped in the release.

## Install and test

Extract the release archive and double-click `Install.cmd`. It installs the package for the current user and selects it as the active screensaver without requiring administrator access.

For an install that does not change the current screensaver selection, run this in PowerShell instead:

```powershell
.\Install-MareInfinitus.ps1
```

The files live under `%LOCALAPPDATA%\Mare Infinitus Screensaver`. To select the installed saver later, run `Install-MareInfinitus.ps1 -SetAsDefault`.

Test the packaged saver directly:

```powershell
.\MareInfinitus.scr /s
```

Move the mouse more than a few pixels, click, or press a key to exit.

Double-click `Uninstall.cmd` in the installed directory, or run:

```powershell
.\Uninstall-MareInfinitus.ps1
```

## Windows screensaver switches

- `/s` — full-screen playback, with one simulation window per display
- `/p HWND` or `/p:HWND` — render inside the Windows Screen Saver Settings preview window
- `/c` (or no switch) — show the configuration message; the curated simulation currently has no screensaver-only settings

## Packaging notes

The `.scr` intentionally keeps the web bundle beside the executable instead of downloading the public site. This keeps it offline and makes each release reproducible from the matching repository revision. It is not currently code-signed, so Windows SmartScreen may warn when someone downloads it. A public release should be Authenticode-signed before broad distribution.
