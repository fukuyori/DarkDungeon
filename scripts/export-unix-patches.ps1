# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#Requires -Version 7
# Writes patches/darkdungeon-unix-<language>.patch from the source snapshots that
# prepare-source.ps1 produced (build/nethack, build/nethack-ja). Windows-only files
# are left out; line endings are normalized to LF for Linux/macOS checkouts.
param(
    [string]$NetHackSource = (Join-Path $PSScriptRoot '..\..\NetHack'),
    [ValidateSet('all','en','ja')][string]$Language = 'all'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$languages = if($Language -eq 'all'){@('en','ja')}else{@($Language)}
$latin1 = [Text.Encoding]::Latin1
function Write-Lf([string]$source,[string]$target) {
    New-Item -ItemType Directory -Force (Split-Path $target -Parent) | Out-Null
    $text = $latin1.GetString([IO.File]::ReadAllBytes($source)).Replace("`r`n","`n")
    [IO.File]::WriteAllBytes($target,$latin1.GetBytes($text))
}
foreach($lang in $languages) {
    $base = if($lang -eq 'ja'){Join-Path $projectRoot 'build\japanese-source'}else{$NetHackSource}
    $snapshot = Join-Path $projectRoot $(if($lang -eq 'ja'){'build\nethack-ja'}else{'build\nethack'})
    if(!(Test-Path (Join-Path $snapshot 'win\Qt\qt_darkdungeon.cpp'))) { throw "Run prepare-source.ps1 -Language $lang first." }
    if(Select-String -LiteralPath (Join-Path $snapshot 'src\Makefile') -Pattern '^DD_CORELIB\s*=') {
        throw 'C1 common-core snapshots need a matching Unix build migration. The legacy exporter cannot include the new runtime files; existing Unix patches are retained.'
    }
    # Outside the repository so its line-ending settings do not apply.
    $work = Join-Path ([IO.Path]::GetTempPath()) "darkdungeon-unix-patch-$lang"
    if(Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
    $files = foreach($area in @('src','include','win\Qt','dat')) {
        Get-ChildItem (Join-Path $base $area) -File | Where-Object { $area -ne 'dat' -or $_.Extension -eq '.lua' }
    }
    $patch = [Text.StringBuilder]::new()
    foreach($file in $files) {
        $relative = [IO.Path]::GetRelativePath($base,$file.FullName).Replace('\','/')
        $modified = Join-Path $snapshot $relative
        if(!(Test-Path -LiteralPath $modified)) { continue }
        Write-Lf $file.FullName (Join-Path $work "a\$relative")
        Write-Lf $modified (Join-Path $work "b\$relative")
        $diff = & git -C $work -c core.autocrlf=false diff --no-index --no-prefix --text "a/$relative" "b/$relative"
        if($LASTEXITCODE -gt 1) { throw "git diff failed: $relative" }
        if($diff) { [void]$patch.Append(($diff -join "`n")+"`n") }
    }
    $output = Join-Path $projectRoot "patches\darkdungeon-unix-$lang.patch"
    [IO.File]::WriteAllText($output,$patch.ToString(),[Text.UTF8Encoding]::new($false))
    Remove-Item -LiteralPath $work -Recurse -Force
    Write-Host "Unix patch: $output"
}
