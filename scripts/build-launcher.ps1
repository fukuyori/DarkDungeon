# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#Requires -Version 7
param([string]$QtRoot='C:\Qt\6.11.2\msvc2022_64',[string]$OutputRoot)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$vsWhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vs=& $vsWhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if(!$vs){throw 'Visual Studio C++ tools are missing.'}
$output=if($OutputRoot){$ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputRoot).TrimEnd('\','/')}else{Join-Path $root 'dist\DarkDungeon'}
$allowedRoots=@('dist','artifacts','build') | ForEach-Object {Join-Path $root $_}
if(!($allowedRoots | Where-Object {$output.StartsWith($_+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)})) {
    throw 'OutputRoot must be a child directory of this project dist, artifacts, or build.'
}
New-Item -ItemType Directory -Force $output | Out-Null
# Files from older single-engine layouts and removed third-party content.
foreach($obsolete in @('opengl32sw.dll','D3Dcompiler_47.dll','dxcompiler.dll','dxil.dll','assets','provenance.json',
        'Guidebook.txt','license','NetHack.txt','nethackrc.template','nhdat501','nhsplash.xpm','nhtiles.bmp','opthelp',
        'rip.xpm','symbols','symbols.template','sysconf.template','licenses\personal-use-and-provenance.md',
        'licenses\design.md','licenses\NetHack.txt')) {
    $generatedPath=Join-Path $output $obsolete
    if(Test-Path -LiteralPath $generatedPath) { Remove-Item -LiteralPath $generatedPath -Recurse -Force }
}
$batch=Join-Path $root 'build\compile-launcher.cmd'
$text=@"
@echo off
call "$vs\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1
cd /d "$root\build"
cl /nologo /EHsc /std:c++17 /utf-8 /Zc:__cplusplus /permissive- /MD /O2 /I"$QtRoot\include" /I"$QtRoot\include\QtCore" /I"$QtRoot\include\QtGui" /I"$QtRoot\include\QtWidgets" "$root\src\launcher.cpp" /Fe:"$output\DarkDungeon.exe" /link /LIBPATH:"$QtRoot\lib" Qt6Core.lib Qt6Gui.lib Qt6Widgets.lib /SUBSYSTEM:WINDOWS /ENTRY:mainCRTStartup
exit /b %errorlevel%
"@
[IO.File]::WriteAllText($batch,$text,[Text.ASCIIEncoding]::new())
& $env:ComSpec /d /c $batch
if($LASTEXITCODE){throw 'Launcher build failed.'}
& (Join-Path $QtRoot 'bin\windeployqt.exe') --release --no-translations --no-compiler-runtime --no-system-d3d-compiler --no-system-dxc-compiler --no-opengl-sw --skip-plugin-types imageformats,iconengines,networkinformation,tls (Join-Path $output 'DarkDungeon.exe')
if($LASTEXITCODE){throw 'Launcher deployment failed.'}
$crt=Get-ChildItem (Join-Path $vs 'VC\Redist\MSVC\*\x64\Microsoft.VC*.CRT') -Directory | Sort-Object FullName -Descending | Select-Object -First 1
if(!$crt){throw 'Visual C++ runtime files are missing.'}
Copy-Item (Join-Path $crt.FullName '*.dll') $output -Force
Copy-Item (Join-Path $root 'VERSION') $output -Force
$licenses=Join-Path $output 'licenses'
New-Item -ItemType Directory -Force $licenses | Out-Null
$qtLicenses=Join-Path (Split-Path $QtRoot -Parent) 'Src\LICENSES'
Copy-Item (Join-Path $qtLicenses 'LGPL-3.0-only.txt'),(Join-Path $qtLicenses 'GPL-3.0-only.txt') $licenses -Force
Copy-Item (Join-Path $root 'LICENSE'),(Join-Path $root 'THIRD-PARTY-NOTICES.md'),(Join-Path $root 'docs\localization.md') $licenses -Force
