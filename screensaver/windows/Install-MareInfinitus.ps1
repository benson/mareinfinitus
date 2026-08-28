[CmdletBinding()]
param(
  [switch]$SetAsDefault
)

$ErrorActionPreference = "Stop"
$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceScreenSaver = Join-Path $packageRoot "MareInfinitus.scr"
if (-not (Test-Path -LiteralPath $sourceScreenSaver)) {
  throw "MareInfinitus.scr must be next to this installer. Extract the complete release archive first."
}

$installRoot = Join-Path $env:LOCALAPPDATA "Mare Infinitus Screensaver"
New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
Copy-Item -LiteralPath $sourceScreenSaver -Destination $installRoot -Force
$installedWebRoot = Join-Path $installRoot "web"
if (Test-Path -LiteralPath $installedWebRoot) {
  Remove-Item -LiteralPath $installedWebRoot -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $packageRoot "web") -Destination $installRoot -Recurse -Force
Copy-Item -LiteralPath (Join-Path $packageRoot "Uninstall-MareInfinitus.ps1") -Destination $installRoot -Force

$installedScreenSaver = Join-Path $installRoot "MareInfinitus.scr"
if ($SetAsDefault) {
  $desktopKey = "HKCU:\Control Panel\Desktop"
  Set-ItemProperty -Path $desktopKey -Name "SCRNSAVE.EXE" -Value $installedScreenSaver
  Set-ItemProperty -Path $desktopKey -Name "ScreenSaveActive" -Value "1"
  Write-Host "Installed and selected as the current screensaver: $installedScreenSaver"
} else {
  Write-Host "Installed: $installedScreenSaver"
  Write-Host "Run this installer again with -SetAsDefault to select it for the current Windows user."
}

Write-Host "Test full screen: & `"$installedScreenSaver`" /s"
