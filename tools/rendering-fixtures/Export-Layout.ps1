# R5 static metadata probe. See LICENSE. Never starts NetHack.
[CmdletBinding()]
param([ValidateSet('en','ja')][string]$Language='en', [Parameter(Mandatory)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$projectRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$outputPath=[IO.Path]::GetFullPath($ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDirectory))
$artifactRoot=[IO.Path]::GetFullPath((Join-Path $projectRoot 'artifacts'))+[IO.Path]::DirectorySeparatorChar
if(!$outputPath.StartsWith($artifactRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'Output must be in repository artifacts.'}
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
$sourceRoot=Join-Path $projectRoot $(if($Language -eq 'ja'){'build\nethack-ja'}else{'build\nethack'})
$vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vsPath=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if(!$vsPath){throw 'Visual Studio C++ tools were not found.'}
$definitions=@('QT_NO_SOUND','_CONSOLE','WIN32','WIN64','_AMD64_=1','NDEBUG','DLB','HAS_STDINT_H','HAS_INLINE')
$splitCore=[bool](Select-String -LiteralPath (Join-Path $sourceRoot 'src\Makefile') -Pattern '^DD_CORELIB\s*=')
$definitions+=if($splitCore){@('DARKDUNGEON_APP','NOTTYGRAPHICS')}else{@('QT_GRAPHICS','WIN32CON')}
if($Language -eq 'ja'){$definitions+=@('DARKDUNGEON_JAPANESE','ICUTF8')}
$definitionArgs=($definitions | ForEach-Object {'/D'+$_}) -join ' '
$auditSource=Join-Path $PSScriptRoot 'audit-layout.c'
$batch=@"
@echo off
call "$vsPath\VC\Auxiliary\Build\vcvars64.bat" >nul
if errorlevel 1 exit /b 1
cd /d "$outputPath"
cl /nologo /MD /utf-8 /std:c17 $definitionArgs /I"$sourceRoot\include" /I"$sourceRoot\sys\windows" /I"$sourceRoot\nhlua\lua\src" /Fe"$outputPath\layout.exe" "$auditSource" >compile.log 2>&1
if errorlevel 1 exit /b 1
"$outputPath\layout.exe" >layout.json
exit /b %errorlevel%
"@
$batchPath=Join-Path $outputPath 'export.cmd'
[IO.File]::WriteAllText($batchPath,$batch,[Text.UTF8Encoding]::new($false))
& $env:ComSpec /d /c $batchPath
if($LASTEXITCODE -ne 0){throw "Static probe failed: $outputPath\compile.log"}
$inputs=@('include\config.h','include\patchlevel.h','include\isaac64.h','include\global.h','include\savefile.h','include\display.h','src\Makefile','src\rnd.c','src\isaac64.c','src\options.c','src\save.c','src\restore.c','src\version.c','src\o_init.c','src\mklev.c','src\do.c','src\calendar.c','src\allmain.c','src\files.c','src\nhlua.c','src\decl.c','src\u_init.c','src\cmd.c','src\end.c','src\insight.c','dat\nhlib.lua','sys\windows\windsys.c','win\Qt\qt_inv.cpp','win\Qt\qt_bind.cpp','win\Qt\qt_plsel.cpp')
$inputs+=@('win\Qt\qt_map.cpp','win\Qt\qt_menu.cpp')
$hashes=foreach($relative in $inputs){[pscustomobject]@{path=$relative;sha256=(Get-FileHash -LiteralPath (Join-Path $sourceRoot $relative)).Hash}}
$projectInputs=@('src/qt_darkdungeon.cpp','src/qt_inventory.cpp','src/frontend_main.cpp','src/app_runtime.c','src/launcher.cpp','scripts/verify-runtime.ps1')
$projectInputs+=@('src/qt_darkdungeon.h','scripts/prepare-source.ps1')
$projectHashes=foreach($relative in $projectInputs){[pscustomobject]@{path=$relative;sha256=(Get-FileHash -LiteralPath (Join-Path $projectRoot $relative)).Hash}}
[pscustomobject]@{language=$Language;source_root=$(if($Language -eq 'ja'){'build/nethack-ja'}else{'build/nethack'});definitions=$definitions;definitions_are_diagnostic_only=$true;game_build_configuration_verified=$false;inputs=$hashes;project_inputs=$projectHashes;extractor_sha256=(Get-FileHash -LiteralPath $auditSource).Hash;output_sha256=(Get-FileHash -LiteralPath (Join-Path $outputPath 'layout.json')).Hash;game_executed=$false;rng_initialized=$false} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $outputPath 'provenance.json') -Encoding utf8
Get-Content -LiteralPath (Join-Path $outputPath 'layout.json') -Raw | ConvertFrom-Json | Select-Object version,save_revision,pointer_bytes,long_bytes,rng,game_executed
