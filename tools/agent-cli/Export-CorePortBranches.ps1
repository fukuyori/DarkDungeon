# Static port-conditional inventory, DarkDungeon 2026-10-27. See LICENSE.
[CmdletBinding()]
param(
    [ValidateSet('en','ja')][string]$Language = 'en',
    [Parameter(Mandatory)][string]$OutputPath,
    [string]$ReferencePath
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$sourceRoot = Join-Path $projectRoot $(if ($Language -eq 'ja') { 'build\nethack-ja' } else { 'build\nethack' })
$resolvedOutput = [IO.Path]::GetFullPath($ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath))
if (!$resolvedOutput.StartsWith($projectRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'OutputPath must stay in this repository.' }
$routes = @{
    'include/config.h'='split_common_capabilities_from_gui_defaults'
    'include/global.h'='common_glyph_layout'
    'include/extern.h'='common_sound_capability_hook'
    'src/cfgfiles.c'='shared_plain_c_view_configuration'
    'src/options.c'='runtime_status_capabilities'
    'src/mdlib.c'='runtime_port_metadata'
    'src/windows.c'='frontend_port_registry'
    'src/core_check.c'='shared_core_qt_macro_rejection'
    'src/allmain.c'='shared_occupation_keyboard_interrupt'
    'include/optlist.h'='preserve_application_option_catalogue'
    'src/report.c'='nonmodal_application_diagnostics'
    'src/files.c'='preserve_config_diagnostic_wait_behavior'
    'sys/windows/windmain.c'='frontend_entry_no_console_tty'
    'sys/windows/windsys.c'='shared_storage_and_test_seed_runtime'
}
$paths = & rg -l 'QT_GRAPHICS|DARKDUNGEON_APP' (Join-Path $sourceRoot 'src') (Join-Path $sourceRoot 'include') (Join-Path $sourceRoot 'sys') -g '*.c' -g '*.h'
if ($LASTEXITCODE -gt 1) { throw 'Port conditional search failed.' }
$branches = @()
foreach ($path in ($paths | Sort-Object)) {
    $relative = [IO.Path]::GetRelativePath($sourceRoot,$path).Replace('\','/')
    $lines = @(Get-Content -LiteralPath $path -Encoding utf8)
    $ordinal = 0
    for ($index=0;$index -lt $lines.Count;$index++) {
        if ($lines[$index] -notmatch '^\s*#\s*(if|ifdef|ifndef|elif)\b') { continue }
        $lineNumber = $index+1
        $directive = $lines[$index].Trim()
        while ($directive.EndsWith('\')) {
            $directive = $directive.Substring(0,$directive.Length-1) + ' '
            $index++
            if ($index -ge $lines.Count) { throw 'Incomplete preprocessor directive.' }
            $directive += $lines[$index].Trim()
        }
        if ($directive -notmatch '\b(QT_GRAPHICS|DARKDUNGEON_APP)\b') { continue }
        if (!$routes.ContainsKey($relative)) { throw "Unclassified port conditional file: $relative" }
        $ordinal++
        $branches += [pscustomobject]@{path=$relative;ordinal=$ordinal;line=$lineNumber;condition=([regex]::Replace($directive,'\s+',' '));route=$routes[$relative];source_sha256=(Get-FileHash -LiteralPath $path).Hash}
    }
}
if (!$branches.Count) { throw 'No port conditionals found; review inventory scope.' }
if ($ReferencePath) {
    $reference = Get-Content -LiteralPath $ReferencePath -Raw -Encoding utf8 | ConvertFrom-Json
    if ($reference.language -ne $Language) { throw 'Reference language mismatch.' }
    $referenceKeys = @($reference.branches | ForEach-Object {"$($_.path)|$($_.ordinal)|$($_.condition)|$($_.route)|$($_.source_sha256)"} | Sort-Object)
    $actualKeys = @($branches | ForEach-Object {"$($_.path)|$($_.ordinal)|$($_.condition)|$($_.route)|$($_.source_sha256)"} | Sort-Object)
    if (@(Compare-Object $referenceKeys $actualKeys -CaseSensitive).Count) { throw 'Port conditional inventory/source changed; review and update the reference explicitly.' }
}
$parentPath = Split-Path $resolvedOutput -Parent
New-Item -ItemType Directory -Path $parentPath -Force | Out-Null
[pscustomobject]@{schema_version=1;language=$Language;status='Static port inventory; no game executed by this tool';branches=$branches} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $resolvedOutput -Encoding utf8
[pscustomobject]@{language=$Language;branches=$branches.Count;unclassified=0;reference_checked=[bool]$ReferencePath}
