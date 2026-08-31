[CmdletBinding()]
param(
  [ValidateSet("x64", "x86", "arm64")]
  [string]$Architecture = "x64",
  [string]$WebView2Version = "1.0.4191.47",
  [switch]$Clean
)

$ErrorActionPreference = "Stop"

$screenSaverRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $screenSaverRoot "..\..")).Path
$buildRoot = Join-Path $screenSaverRoot ".build"
$dependencyRoot = Join-Path $buildRoot "deps"
$packageRoot = Join-Path $dependencyRoot "Microsoft.Web.WebView2.$WebView2Version"
$publishRoot = Join-Path $screenSaverRoot "publish"
$releaseRoot = Join-Path $screenSaverRoot "release"

if ($Clean) {
  foreach ($target in @($buildRoot, $publishRoot, $releaseRoot)) {
    if (Test-Path -LiteralPath $target) {
      Remove-Item -LiteralPath $target -Recurse -Force
    }
  }
}

New-Item -ItemType Directory -Force -Path $dependencyRoot, $publishRoot, $releaseRoot | Out-Null

$vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path -LiteralPath $vswhere)) {
  throw "Visual Studio Build Tools were not found. Install Visual Studio 2022 Build Tools with Desktop development with C++."
}
$visualStudioRoot = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $visualStudioRoot) {
  throw "The Visual Studio C++ toolchain was not found. Add the Desktop development with C++ workload."
}
$vcVars = Join-Path $visualStudioRoot "VC\Auxiliary\Build\vcvarsall.bat"

if (-not (Test-Path -LiteralPath $packageRoot)) {
  $packageFile = Join-Path $dependencyRoot "Microsoft.Web.WebView2.$WebView2Version.nupkg"
  $packageUrl = "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$($WebView2Version.ToLowerInvariant())/microsoft.web.webview2.$($WebView2Version.ToLowerInvariant()).nupkg"
  Write-Host "Downloading Microsoft.Web.WebView2 $WebView2Version..."
  Invoke-WebRequest -Uri $packageUrl -OutFile $packageFile
  New-Item -ItemType Directory -Force -Path $packageRoot | Out-Null
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::ExtractToDirectory($packageFile, $packageRoot)
}

$includeRoot = Join-Path $packageRoot "build\native\include"
$libraryRoot = Join-Path $packageRoot "build\native\$Architecture"
$loaderLibrary = Join-Path $libraryRoot "WebView2LoaderStatic.lib"
if (-not (Test-Path -LiteralPath (Join-Path $includeRoot "WebView2.h"))) {
  throw "WebView2.h was not found in the restored NuGet package."
}
if (-not (Test-Path -LiteralPath $loaderLibrary)) {
  throw "WebView2LoaderStatic.lib was not found for $Architecture."
}

$webRoot = Join-Path $publishRoot "web"
New-Item -ItemType Directory -Force -Path $webRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "index.html") -Destination $webRoot -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "style.css") -Destination $webRoot -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "app.js") -Destination $webRoot -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "systems") -Destination $webRoot -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "scenes") -Destination $webRoot -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "public") -Destination $webRoot -Recurse -Force

$resourceObject = Join-Path $buildRoot "version.res"
$compiledObject = Join-Path $buildRoot "MareInfinitus.obj"
$outputFile = Join-Path $publishRoot "MareInfinitus.scr"
$sourceFile = Join-Path $screenSaverRoot "MareInfinitus.cpp"
$resourceFile = Join-Path $screenSaverRoot "version.rc"

$compileCommand = @(
  "call `"$vcVars`" $Architecture",
  "rc.exe /nologo /fo `"$resourceObject`" `"$resourceFile`"",
  "cl.exe /nologo /std:c++17 /EHsc /O2 /W4 /DUNICODE /D_UNICODE /MT /Fo:`"$compiledObject`" /I`"$includeRoot`" `"$sourceFile`" `"$resourceObject`" /Fe:`"$outputFile`" /link /SUBSYSTEM:WINDOWS `"$loaderLibrary`" user32.lib gdi32.lib ole32.lib oleaut32.lib shell32.lib shlwapi.lib version.lib advapi32.lib runtimeobject.lib windowsapp.lib"
) -join " && "

Write-Host "Building MareInfinitus.scr ($Architecture)..."
& $env:ComSpec /d /s /c $compileCommand
if ($LASTEXITCODE -ne 0) {
  throw "The native screensaver build failed with exit code $LASTEXITCODE."
}

Copy-Item -LiteralPath (Join-Path $screenSaverRoot "Install-MareInfinitus.ps1") -Destination $publishRoot -Force
Copy-Item -LiteralPath (Join-Path $screenSaverRoot "Uninstall-MareInfinitus.ps1") -Destination $publishRoot -Force
Copy-Item -LiteralPath (Join-Path $screenSaverRoot "Install.cmd") -Destination $publishRoot -Force
Copy-Item -LiteralPath (Join-Path $screenSaverRoot "Uninstall.cmd") -Destination $publishRoot -Force
Copy-Item -LiteralPath (Join-Path $screenSaverRoot "README.md") -Destination (Join-Path $publishRoot "README.txt") -Force

$zipPath = Join-Path $releaseRoot "MareInfinitus-Screensaver-Windows-$Architecture.zip"
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
Compress-Archive -Path (Join-Path $publishRoot "*") -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "Built: $outputFile"
Write-Host "Package: $zipPath"
