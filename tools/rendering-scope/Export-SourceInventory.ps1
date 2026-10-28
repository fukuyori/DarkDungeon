# DarkDungeon source inventory, 2026-10-27. See LICENSE.
[CmdletBinding()]
param(
    [ValidateSet('en', 'ja')][string]$Language = 'en',
    [Parameter(Mandatory)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$outputPath = [IO.Path]::GetFullPath($ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDirectory))
$artifactRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'artifacts')) + [IO.Path]::DirectorySeparatorChar
if (!$outputPath.StartsWith($artifactRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'OutputDirectory must be inside this repository artifacts directory.'
}
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
$sourceRoot = Join-Path $projectRoot $(if ($Language -eq 'ja') { 'build\nethack-ja' } else { 'build\nethack' })
$rolePath = Join-Path $sourceRoot 'src\role.c'
$roleSource = Get-Content -LiteralPath $rolePath -Raw -Encoding utf8
$roleStart = $roleSource.IndexOf('const struct Role roles[NUM_ROLES+1]')
$roleEnd = $roleSource.IndexOf('staticfn int randrole_filtered(void);')
if ($roleStart -lt 0 -or $roleEnd -le $roleStart) { throw 'Static role table boundaries changed; inspect role.c.' }
$roleNotice = "/* Extracted from $Language role.c for an inventory, 2026-10-27.`n * NetHack copyright notices are retained in role-source-notice.txt. See LICENSE. */`n"
[IO.File]::WriteAllText((Join-Path $outputPath 'role-data.inc'), $roleNotice + $roleSource.Substring($roleStart, $roleEnd - $roleStart), [Text.UTF8Encoding]::new($false))
($roleSource -split '\r?\n' | Select-Object -First 6) | Set-Content -LiteralPath (Join-Path $outputPath 'role-source-notice.txt') -Encoding utf8
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vsPath = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (!$vsPath) { throw 'Visual Studio C++ tools were not found.' }
$auditSource = Join-Path $PSScriptRoot 'audit-source.c'
$splitCore = [bool](Select-String -LiteralPath (Join-Path $sourceRoot 'src\Makefile') -Pattern '^DD_CORELIB\s*=')
$definitions = @('QT_NO_SOUND','_CONSOLE','WIN32','WIN64','_AMD64_=1','NDEBUG','DLB','HAS_STDINT_H','HAS_INLINE')
$definitions += if ($splitCore) { @('DARKDUNGEON_APP','NOTTYGRAPHICS') } else { @('QT_GRAPHICS','WIN32CON') }
if ($Language -eq 'ja') { $definitions += @('DARKDUNGEON_JAPANESE','ICUTF8') }
$definitionArgs = ($definitions | ForEach-Object { '/D' + $_ }) -join ' '
$batch = @"
@echo off
call "$vsPath\VC\Auxiliary\Build\vcvars64.bat" >nul
if errorlevel 1 exit /b 1
cd /d "$outputPath"
cl /nologo /MD /utf-8 /std:c17 $definitionArgs /I"$sourceRoot\include" /I"$sourceRoot\sys\windows" /I"$sourceRoot\nhlua\lua\src" /I"$outputPath" /Fe"$outputPath\source-inventory.exe" "$auditSource" "$sourceRoot\src\objects.c" "$sourceRoot\src\monst.c" "$sourceRoot\src\tile.c" >compile.log 2>&1
if errorlevel 1 exit /b 1
"$outputPath\source-inventory.exe" >source-inventory.json
exit /b %errorlevel%
"@
$batchPath = Join-Path $outputPath 'export.cmd'
[IO.File]::WriteAllText($batchPath, $batch, [Text.UTF8Encoding]::new($false))
& $env:ComSpec /d /c $batchPath
if ($LASTEXITCODE -ne 0) { throw "Inventory compilation/extraction failed. See $outputPath\compile.log" }
$inventory = Get-Content -LiteralPath (Join-Path $outputPath 'source-inventory.json') -Raw -Encoding utf8 | ConvertFrom-Json
if ($inventory.objects.Count -ne $inventory.counts.objects -or $inventory.monsters.Count -ne $inventory.counts.monsters -or $inventory.glyph_tiles.Count -ne $inventory.counts.glyphs) { throw 'Inventory count mismatch.' }
$nextGlyph = 0
foreach ($range in $inventory.ranges) {
    if ($range.start -ne $nextGlyph -or $range.end_exclusive -le $range.start) { throw 'Glyph ranges overlap or have gaps.' }
    $nextGlyph = $range.end_exclusive
}
if ($nextGlyph -ne $inventory.counts.glyphs) { throw 'Glyph range coverage is incomplete.' }
if (@($inventory.objects | Where-Object { !$_.symbol }).Count -or @($inventory.monsters | Where-Object { !$_.symbol }).Count) { throw 'Missing source enum labels.' }
$inputs = @('include\hack.h', 'include\you.h', 'include\display.h', 'include\objects.h', 'include\monsters.h', 'include\config.h', 'include\defsym.h', 'src\Makefile', 'src\role.c', 'src\objects.c', 'src\monst.c', 'src\tile.c', 'src\tilemappings.lst', 'win\share\tilemap.c')
$hashes = foreach ($relativePath in $inputs) {
    [pscustomobject]@{path=$relativePath;sha256=(Get-FileHash -LiteralPath (Join-Path $sourceRoot $relativePath) -Algorithm SHA256).Hash}
}
[pscustomobject]@{language=$Language;source_root=$sourceRoot;created_utc=[DateTime]::UtcNow.ToString('o');shared_core=$splitCore;definitions=$definitions;inputs=$hashes;extractor_sha256=(Get-FileHash -LiteralPath $auditSource).Hash;output_sha256=(Get-FileHash -LiteralPath (Join-Path $outputPath 'source-inventory.json')).Hash;game_executed=$false} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $outputPath 'provenance.json') -Encoding utf8
[pscustomobject]@{language=$Language;objects=$inventory.objects.Count;monsters=$inventory.monsters.Count;glyphs=$inventory.glyph_tiles.Count;creation_combinations=$inventory.creation_combinations.Count;output=$outputPath}
