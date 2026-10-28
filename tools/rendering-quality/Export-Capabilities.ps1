# Static rendering capability audit, DarkDungeon 2026. See LICENSE.
[CmdletBinding()]
param(
    [ValidateSet('en','ja')][string]$Language = 'en',
    [Parameter(Mandatory)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$outputPath = [IO.Path]::GetFullPath($ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDirectory))
$artifactRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'artifacts')) + [IO.Path]::DirectorySeparatorChar
if (!$outputPath.StartsWith($artifactRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Output must be inside repository artifacts.' }
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
$sourceRoot = Join-Path $projectRoot $(if ($Language -eq 'ja') { 'build\nethack-ja' } else { 'build\nethack' })
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vsPath = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (!$vsPath) { throw 'Visual Studio C++ tools were not found.' }
$splitCore = [bool](Select-String -LiteralPath (Join-Path $sourceRoot 'src\Makefile') -Pattern '^DD_CORELIB\s*=')
$definitions = @('QT_NO_SOUND','_CONSOLE','WIN32','WIN64','_AMD64_=1','NDEBUG','DLB','HAS_STDINT_H','HAS_INLINE')
$definitions += if ($splitCore) { @('DARKDUNGEON_APP','NOTTYGRAPHICS') } else { @('QT_GRAPHICS','WIN32CON') }
if ($Language -eq 'ja') { $definitions += @('DARKDUNGEON_JAPANESE','ICUTF8') }
$definitionArgs = ($definitions | ForEach-Object { '/D' + $_ }) -join ' '
$auditSource = Join-Path $PSScriptRoot 'audit-capabilities.c'
$batch = @"
@echo off
call "$vsPath\VC\Auxiliary\Build\vcvars64.bat" >nul
if errorlevel 1 exit /b 1
cd /d "$outputPath"
cl /nologo /MD /utf-8 /std:c17 $definitionArgs /I"$sourceRoot\include" /I"$sourceRoot\sys\windows" /I"$sourceRoot\nhlua\lua\src" /Fe"$outputPath\capabilities.exe" "$auditSource" "$sourceRoot\src\monst.c" >compile.log 2>&1
if errorlevel 1 exit /b 1
"$outputPath\capabilities.exe" >capabilities.json
exit /b %errorlevel%
"@
$batchPath = Join-Path $outputPath 'export.cmd'
[IO.File]::WriteAllText($batchPath, $batch, [Text.UTF8Encoding]::new($false))
& $env:ComSpec /d /c $batchPath
if ($LASTEXITCODE -ne 0) { throw "Static capability extraction failed: $outputPath\compile.log" }
$inventory = Get-Content -LiteralPath (Join-Path $outputPath 'capabilities.json') -Raw -Encoding utf8 | ConvertFrom-Json
if ($inventory.monsters.Count -ne $inventory.monster_count -or @($inventory.monsters | Where-Object { $_.attacks.Count -ne $inventory.attack_slots -or $_.attacks.type -contains 'UNKNOWN' }).Count) { throw 'Capability table incomplete or new attack type unclassified.' }
$inputs = @('src\Makefile','src\monst.c','src\steed.c','src\polyself.c','src\role.c','src\mondata.c','src\mhitu.c','src\muse.c','include\hack.h','include\config.h','include\monsters.h','include\mondata.h','include\monflag.h','include\monattk.h','include\permonst.h')
$hashes = foreach ($relativePath in $inputs) { [pscustomobject]@{path=$relativePath;sha256=(Get-FileHash -LiteralPath (Join-Path $sourceRoot $relativePath)).Hash} }
[pscustomobject]@{language=$Language;source_root=$sourceRoot;shared_core=$splitCore;definitions=$definitions;inputs=$hashes;extractor_sha256=(Get-FileHash -LiteralPath $auditSource).Hash;output_sha256=(Get-FileHash -LiteralPath (Join-Path $outputPath 'capabilities.json')).Hash;game_executed=$false;rng_initialized=$false} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $outputPath 'provenance.json') -Encoding utf8
[pscustomobject]@{language=$Language;monsters=$inventory.monster_count;rider_shape_candidates=@($inventory.monsters | Where-Object rider_shape_candidate).Count;game_executed=$false}
