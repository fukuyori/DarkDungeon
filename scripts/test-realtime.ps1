# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$vsWhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vsPath=& $vsWhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if(!$vsPath) { throw 'Visual Studio C++ tools were not found.' }
$testDirectory=Join-Path $projectRoot 'build\model-tests'
New-Item -ItemType Directory -Force $testDirectory | Out-Null
$command=Join-Path $testDirectory 'compile-tests.cmd'
$text=@"
@echo off
call "$vsPath\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1
cd /d "$testDirectory"
cl /nologo /EHsc /std:c++17 /O2 /MD /I"$projectRoot\src" "$projectRoot\src\realtime_model.cpp" "$projectRoot\tests\realtime_tests.cpp" /Fe:realtime-tests.exe
if errorlevel 1 exit /b 1
realtime-tests.exe
exit /b %errorlevel%
"@
[IO.File]::WriteAllText($command,$text,[Text.ASCIIEncoding]::new())
& $env:ComSpec /d /c $command
if($LASTEXITCODE) { throw "Realtime tests failed: $LASTEXITCODE" }
