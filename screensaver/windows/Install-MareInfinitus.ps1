[CmdletBinding()]
param(
  [switch]$SetAsDefault,
  [ValidateSet('mare-infinitus', 'time-tombs')]
  [string]$Scene = 'time-tombs'
)

$ErrorActionPreference = "Stop"
$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceScreenSaver = Join-Path $packageRoot "MareInfinitus.scr"
if (-not (Test-Path -LiteralPath $sourceScreenSaver)) {
  throw "MareInfinitus.scr must be next to this installer. Extract the complete release archive first."
}

$installRoot = Join-Path $env:LOCALAPPDATA "Mare Infinitus Screensaver"
New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
$sourceWebRoot = Join-Path $packageRoot "web"
foreach ($required in @("index.html", "dist\time-tombs\time-tombs.js")) {
  if (-not (Test-Path -LiteralPath (Join-Path $sourceWebRoot $required))) { throw "Incomplete offline package: $required" }
}
$installRoot = [IO.Path]::GetFullPath($installRoot)
$backupRoot = Join-Path $installRoot ("previous-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backupRoot | Out-Null
foreach ($name in @("MareInfinitus.scr", "scene.txt")) {
  $existing = Join-Path $installRoot $name
  if (Test-Path -LiteralPath $existing) { Copy-Item -LiteralPath $existing -Destination $backupRoot }
}
Copy-Item -LiteralPath $sourceScreenSaver -Destination $installRoot -Force
$installedWebRoot = Join-Path $installRoot "web"
if (Test-Path -LiteralPath $installedWebRoot) {
  $resolvedWeb = (Resolve-Path -LiteralPath $installedWebRoot).Path
  if ($resolvedWeb -ne (Join-Path $installRoot "web")) { throw "Refusing unexpected web target: $resolvedWeb" }
  Move-Item -LiteralPath $resolvedWeb -Destination (Join-Path $backupRoot "web")
}
Copy-Item -LiteralPath (Join-Path $packageRoot "web") -Destination $installRoot -Recurse -Force
Copy-Item -LiteralPath (Join-Path $packageRoot "Uninstall-MareInfinitus.ps1") -Destination $installRoot -Force

Set-Content -LiteralPath (Join-Path $installRoot "scene.txt") -Value $Scene -Encoding ascii
$installedScreenSaver = Join-Path $installRoot "MareInfinitus.scr"
Write-Host "Scene: $Scene. Previous installation preserved at: $backupRoot"
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
