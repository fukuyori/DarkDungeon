# Static command inventory, DarkDungeon 2026-10-27. See LICENSE.
[CmdletBinding()]
param(
    [ValidateSet('en', 'ja')][string]$Language = 'en',
    [Parameter(Mandatory)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$outputPath = [IO.Path]::GetFullPath($ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDirectory))
$artifactRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'artifacts')) + [IO.Path]::DirectorySeparatorChar
if (!$outputPath.StartsWith($artifactRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'OutputDirectory must be inside repository artifacts.' }
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
$sourceRoot = Join-Path $projectRoot $(if ($Language -eq 'ja') { 'build\nethack-ja' } else { 'build\nethack' })
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vsPath = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (!$vsPath) { throw 'Visual Studio C++ tools were not found.' }
# Release x64 Windows source audit. These are the relevant preprocessor
# definitions from the prepared Makefile, not a game build or execution.
$splitCore=[bool](Select-String -LiteralPath (Join-Path $sourceRoot 'src\Makefile') -Pattern '^DD_CORELIB\s*=')
$definitions = @('QT_NO_SOUND', '_CONSOLE', 'WIN32', 'WIN64', '_AMD64_=1', 'NDEBUG', 'DLB', 'HAS_STDINT_H', 'HAS_INLINE')
$definitions += if($splitCore){@('DARKDUNGEON_APP','NOTTYGRAPHICS')}else{@('QT_GRAPHICS','WIN32CON')}
if ($Language -eq 'ja') { $definitions += @('DARKDUNGEON_JAPANESE', 'ICUTF8') }
$definitionArgs = ($definitions | ForEach-Object { '/D' + $_ }) -join ' '
$batch = @"
@echo off
call "$vsPath\VC\Auxiliary\Build\vcvars64.bat" >nul
if errorlevel 1 exit /b 1
cd /d "$outputPath"
cl /nologo /EP /utf-8 $definitionArgs /I"$sourceRoot\include" /I"$sourceRoot\sys\windows" /I"$sourceRoot\nhlua\lua\src" "$sourceRoot\src\cmd.c" >cmd.i 2>preprocess.log
exit /b %errorlevel%
"@
$batchPath = Join-Path $outputPath 'preprocess.cmd'
[IO.File]::WriteAllText($batchPath, $batch, [Text.UTF8Encoding]::new($false))
& $env:ComSpec /d /c $batchPath
if ($LASTEXITCODE -ne 0) { throw "Command preprocessing failed. See $outputPath\preprocess.log" }
$parserPath = Join-Path $PSScriptRoot 'parse-command-inventory.py'
& python $parserPath (Join-Path $outputPath 'cmd.i') (Join-Path $outputPath 'commands.json')
if ($LASTEXITCODE -ne 0) { throw 'Command initializer parsing failed.' }
$inputs = @('src\cmd.c', 'src\Makefile', 'include\config.h', 'include\func_tab.h', 'include\windconf.h', 'include\global.h')
$hashes = foreach ($relativePath in $inputs) {
    [pscustomobject]@{path=$relativePath;sha256=(Get-FileHash -LiteralPath (Join-Path $sourceRoot $relativePath)).Hash}
}
[pscustomobject]@{language=$Language;platform='Windows x64 Release source audit';shared_core=$splitCore;source_root=$sourceRoot;definitions=$definitions;inputs=$hashes;parser_sha256=(Get-FileHash -LiteralPath $parserPath).Hash;output_sha256=(Get-FileHash -LiteralPath (Join-Path $outputPath 'commands.json')).Hash;game_executed=$false} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $outputPath 'provenance.json') -Encoding utf8
