# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#Requires -Version 7
param([ValidateSet('en','ja')][string]$Language='ja')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$snapshot=Join-Path $root $(if($Language -eq 'ja'){'build\nethack-ja'}else{'build\nethack'})
$vsWhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vs=& $vsWhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
$batch=Join-Path $root "build\validate-lua-$Language.cmd"
$text=@"
@echo off
call "$vs\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1
cd /d "$root\build"
cl /nologo /EHsc /std:c++17 /MD /I"$snapshot\nhlua\lua\src" "$root\src\lua_validate.cpp" "$snapshot\lib\lua-x64-static.lib" /Fe:"$root\build\validate-lua-$Language.exe"
if errorlevel 1 exit /b 1
"$root\build\validate-lua-$Language.exe" "$snapshot\dat" "$root\build\level-ids-$Language.json"
exit /b %errorlevel%
"@
[IO.File]::WriteAllText($batch,$text,[Text.ASCIIEncoding]::new())
& $env:ComSpec /d /c $batch
if($LASTEXITCODE){throw "Game script validation failed for $Language."}
