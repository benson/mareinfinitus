[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$installRoot = Join-Path $env:LOCALAPPDATA "Mare Infinitus Screensaver"
$installedScreenSaver = Join-Path $installRoot "MareInfinitus.scr"
$desktopKey = "HKCU:\Control Panel\Desktop"

$configured = (Get-ItemProperty -Path $desktopKey -Name "SCRNSAVE.EXE" -ErrorAction SilentlyContinue)."SCRNSAVE.EXE"
if ($configured -and ([string]::Equals($configured, $installedScreenSaver, [System.StringComparison]::OrdinalIgnoreCase))) {
  Remove-ItemProperty -Path $desktopKey -Name "SCRNSAVE.EXE" -ErrorAction SilentlyContinue
  Set-ItemProperty -Path $desktopKey -Name "ScreenSaveActive" -Value "0"
}

if (Test-Path -LiteralPath $installRoot) {
  $resolvedInstallRoot = (Resolve-Path -LiteralPath $installRoot).Path
  $resolvedLocalAppData = (Resolve-Path -LiteralPath $env:LOCALAPPDATA).Path
  if (-not $resolvedInstallRoot.StartsWith($resolvedLocalAppData + "\", [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove an install directory outside LOCALAPPDATA: $resolvedInstallRoot"
  }
  Remove-Item -LiteralPath $resolvedInstallRoot -Recurse -Force
}

Write-Host "Mare Infinitus Screensaver was removed for the current user."
