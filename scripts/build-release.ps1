# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#Requires -Version 7
param(
    [string]$NetHackSource = (Join-Path $PSScriptRoot '..\..\NetHack'),
    [string]$QtRoot = 'C:\Qt\6.11.2\msvc2022_64',
    [switch]$Clean,
    [ValidateSet('all','en','ja')][string]$Language='all',
    [switch]$SkipPrepare,
    [string]$OutputRoot
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if(!$OutputRoot){$OutputRoot=Join-Path $projectRoot 'dist\DarkDungeon'}
$OutputRoot=$ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputRoot).TrimEnd('\','/')
$allowedRoots=@('dist','artifacts','build') | ForEach-Object {Join-Path $projectRoot $_}
if(!($allowedRoots | Where-Object {$OutputRoot.StartsWith($_+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)})) {
    throw 'OutputRoot must be a child directory of this project dist, artifacts, or build.'
}
if($Language -eq 'all') {
    & $PSCommandPath -NetHackSource $NetHackSource -QtRoot $QtRoot -Clean:$Clean -SkipPrepare:$SkipPrepare -Language en -OutputRoot $OutputRoot
    & $PSCommandPath -NetHackSource $NetHackSource -QtRoot $QtRoot -Clean:$Clean -SkipPrepare:$SkipPrepare -Language ja -OutputRoot $OutputRoot
    & (Join-Path $PSScriptRoot 'build-launcher.ps1') -QtRoot $QtRoot -OutputRoot $OutputRoot
    return
}
if (!$SkipPrepare) { & (Join-Path $PSScriptRoot 'prepare-source.ps1') -NetHackSource $NetHackSource -QtRoot $QtRoot -Language $Language }
if($Language -eq 'ja') { & (Join-Path $PSScriptRoot 'verify-localization.ps1') -NetHackSource $NetHackSource }
$vsWhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vsPath = & $vsWhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (!$vsPath) { throw 'Visual Studio C++ tools were not found.' }
$snapshot = Join-Path $projectRoot $(if($Language -eq 'ja'){'build\nethack-ja'}else{'build\nethack'})
$fingerprintPath=Join-Path $projectRoot "build\toolchain-$Language-fingerprint.txt"
$fingerprint=$QtRoot+'|'+$vsPath+'|'+(Get-FileHash (Join-Path $snapshot 'src\Makefile')).Hash
$previous=if(Test-Path $fingerprintPath){(Get-Content $fingerprintPath -Raw).Trim()}else{''}
$cleanBuild=$false
if($Clean -or $previous -ne $fingerprint) {
    $cleanBuild=$true
    $resolvedSnapshot=[IO.Path]::GetFullPath($snapshot)
    $allowedBuildRoot=[IO.Path]::GetFullPath((Join-Path $projectRoot 'build'))+[IO.Path]::DirectorySeparatorChar
    if(!$resolvedSnapshot.StartsWith($allowedBuildRoot,[StringComparison]::OrdinalIgnoreCase)) { throw 'Build cleanup target escaped workspace.' }
    # Only compiler outputs; input sources and user runtime data are retained.
    # #110: an upstream source that only has such an extension (sys/share/Makefile.lib) is not an output.
    $upstreamRoot=[IO.Path]::GetFullPath($NetHackSource)
    Get-ChildItem -LiteralPath $resolvedSnapshot -File -Recurse | Where-Object {$_.Extension -in @('.o','.obj','.lib') -and !(Test-Path -LiteralPath (Join-Path $upstreamRoot ([IO.Path]::GetRelativePath($resolvedSnapshot,$_.FullName))))} | ForEach-Object {Remove-Item -LiteralPath $_.FullName -Force}
}
$batch = Join-Path $projectRoot "build\compile-qt-$Language.cmd"
$batchContents = @"
@echo off
call "$vsPath\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1
cd /d "$snapshot\src"
nmake /nologo IC_UTF8=Y DEBUGINFO=N WANT_CURSES=N CURSES_CONSOLE=N CURSES_GRAPHICAL=N SOUND_LIBRARIES= GIT_AVAILABLE=0 INTERNET_AVAILABLE=0 ottydirx64.tag outldirx64.tag oluadirx64.tag libdir.tag ..\binary\NetHack.exe binary.tag ..\src\tiles.bmp
exit /b %errorlevel%
"@
[IO.File]::WriteAllText($batch,$batchContents,[Text.ASCIIEncoding]::new())
& $env:ComSpec /d /c $batch
if ($LASTEXITCODE) { throw "NetHack Qt build failed: $LASTEXITCODE" }
& (Join-Path $PSScriptRoot 'verify-language-data.ps1') -Language $Language
[IO.File]::WriteAllText($fingerprintPath,$fingerprint,[Text.UTF8Encoding]::new($false))
$appDirectory = Join-Path $OutputRoot $Language
New-Item -ItemType Directory -Force -Path $appDirectory | Out-Null
$resolvedApp=[IO.Path]::GetFullPath($appDirectory)
$allowedDistributionRoot=$OutputRoot+[IO.Path]::DirectorySeparatorChar
if(!$resolvedApp.StartsWith($allowedDistributionRoot,[StringComparison]::OrdinalIgnoreCase)) { throw 'Deployment cleanup target escaped workspace.' }
foreach($obsolete in @('assets','opengl32sw.dll','D3Dcompiler_47.dll','dxcompiler.dll','dxil.dll','NetHack.exe','NetHack.PDB','Qt6Pdf.dll','Qt6Svg.dll','Qt6Network.dll','imageformats','iconengines','networkinformation','tls')) {
    $generatedPath=Join-Path $resolvedApp $obsolete
    if(Test-Path -LiteralPath $generatedPath) { Remove-Item -LiteralPath $generatedPath -Recurse -Force }
}
foreach ($file in Get-ChildItem (Join-Path $snapshot 'binary') -File) {
    if ($file.Name -match '^(nhdat\d+|license|symbols|opthelp|sysconf\.template|nethackrc\.template|Guidebook\.txt|NetHack\.txt)$') {
        Copy-Item $file.FullName $appDirectory -Force
    }
}
Copy-Item (Join-Path $snapshot 'binary\NetHack.exe') (Join-Path $appDirectory "DarkDungeon-$Language.exe") -Force
Copy-Item (Join-Path $snapshot 'src\tiles.bmp') (Join-Path $appDirectory 'nhtiles.bmp') -Force
Copy-Item (Join-Path $snapshot 'win\X11\rip.xpm'),(Join-Path $snapshot 'win\share\nhsplash.xpm') $appDirectory -Force
Copy-Item (Join-Path $projectRoot 'VERSION') $appDirectory -Force
Copy-Item (Join-Path $projectRoot "docs\play-guide-$Language.md") (Join-Path $appDirectory 'play-guide.md') -Force
# Generated sprite sheets (sprites/, regenerated by tools/sprites). Only the PNG sheets are deployed.
$spriteTarget=Join-Path $appDirectory 'sprites'
if(Test-Path -LiteralPath $spriteTarget) { Remove-Item -LiteralPath $spriteTarget -Recurse -Force }
foreach($group in @('hero','monster')) {
    $groupSource=Join-Path $projectRoot "sprites\$group"
    if(Test-Path $groupSource) {
        New-Item -ItemType Directory -Force (Join-Path $spriteTarget $group) | Out-Null
        Copy-Item (Join-Path $groupSource '*.png') (Join-Path $spriteTarget $group) -Force
    }
}
foreach($sourceRepository in @($NetHackSource)) {
    $status=& git -C $sourceRepository status --porcelain
    if($LASTEXITCODE -or $status) { throw "Input repository must be clean: $sourceRepository" }
}
$provenance=[ordered]@{
    language=$Language
    applicationVersion=(Get-Content (Join-Path $projectRoot 'VERSION') -Raw).Trim()
    netHackCommit=(& git -C $NetHackSource rev-parse HEAD)
    japaneseReferenceCommit=$(if($Language -eq 'ja'){'25adee135c4bbd43ac8567664f600b565332435c'}else{$null})
    japanesePatchSha256=$(if($Language -eq 'ja'){(Get-FileHash (Join-Path $projectRoot 'patches\nethack-5.0.1-ja.patch')).Hash}else{$null})
}
$provenance | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $appDirectory 'provenance.json') -Encoding utf8
$licenseDirectory=Join-Path $appDirectory 'licenses'
New-Item -ItemType Directory -Force $licenseDirectory | Out-Null
Copy-Item (Join-Path $NetHackSource 'dat\license') (Join-Path $licenseDirectory 'NetHack.txt') -Force
$luaHeader=Get-Content (Join-Path $snapshot 'nhlua\lua\src\lua.h') -Raw -Encoding utf8
$luaLicense=[regex]::Match($luaHeader,'(?s)/\*\*+\r?\n\* Copyright.*?\*\*+/')
if(!$luaLicense.Success){throw 'Lua license text was not found.'}
[IO.File]::WriteAllText((Join-Path $licenseDirectory 'Lua-MIT.txt'),$luaLicense.Value,[Text.UTF8Encoding]::new($false))
$qtLicenses=Join-Path (Split-Path $QtRoot -Parent) 'Src\LICENSES'
if(!(Test-Path $qtLicenses)) { throw 'Qt source LICENSES directory is required alongside QtRoot.' }
Copy-Item (Join-Path $qtLicenses 'LGPL-3.0-only.txt'),(Join-Path $qtLicenses 'GPL-3.0-only.txt') $licenseDirectory -Force
Copy-Item (Join-Path $projectRoot 'LICENSE'),(Join-Path $projectRoot 'THIRD-PARTY-NOTICES.md') $licenseDirectory -Force
foreach($obsoleteLicense in @('personal-use-and-provenance.md','design.md')) { $path=Join-Path $licenseDirectory $obsoleteLicense; if(Test-Path -LiteralPath $path){Remove-Item -LiteralPath $path -Force} }
if($Language -eq 'ja') {
    Copy-Item (Join-Path $snapshot 'binary\Guidebook.txt') (Join-Path $appDirectory 'Guidebook-original-en.txt') -Force
    Copy-Item (Join-Path $projectRoot 'docs\play-guide-ja.md') (Join-Path $appDirectory 'Guidebook.txt') -Force
    New-Item -ItemType Directory -Force (Join-Path $appDirectory 'translations') | Out-Null
    Copy-Item (Join-Path $QtRoot 'translations\qtbase_ja.qm') (Join-Path $appDirectory 'translations') -Force
    Copy-Item (Join-Path $projectRoot 'docs\localization.md') $licenseDirectory -Force
}
& (Join-Path $QtRoot 'bin\windeployqt.exe') --release --no-translations --no-compiler-runtime --no-system-d3d-compiler --no-system-dxc-compiler --no-opengl-sw --skip-plugin-types imageformats,iconengines,networkinformation,tls (Join-Path $appDirectory "DarkDungeon-$Language.exe")
if ($LASTEXITCODE) { throw 'Qt deployment failed.' }
$crt=(Get-ChildItem (Join-Path $vsPath 'VC\Redist\MSVC') -Directory | Where-Object Name -Match '^\d+\.\d+\.\d+$' | Sort-Object {[version]$_.Name} -Descending | ForEach-Object {Get-ChildItem (Join-Path $_.FullName 'x64') -Directory -Filter 'Microsoft.VC*.CRT'} | Select-Object -First 1)
if(!$crt) { throw 'Visual C++ redistributable CRT files are missing.' }
Copy-Item (Join-Path $crt.FullName '*.dll') $appDirectory -Force
$enginePath=Join-Path $appDirectory "DarkDungeon-$Language.exe"
$linkedMap=Join-Path $snapshot 'src\objtty\x64\NetHack.MAP'
if(!(Test-Path -LiteralPath $linkedMap -PathType Leaf)){throw 'The linked executable map is missing.'}
[ordered]@{schema='darkdungeon-deployment-capabilities-v1';frontend='qt-engine';language=$Language;manual_profile=1;executable_sha256=(Get-FileHash -LiteralPath $enginePath).Hash.ToLowerInvariant();linked_map_sha256=(Get-FileHash -LiteralPath $linkedMap).Hash.ToLowerInvariant()} | ConvertTo-Json | Set-Content -LiteralPath ($enginePath+'.capabilities.json') -Encoding utf8
# #110: bind this executable to the generation inputs and the generated tree it was built from.
$recordArguments=@('record','--language',$Language,'--app',$appDirectory,'--nethack',$NetHackSource,'--qt-root',$QtRoot)
if($cleanBuild){$recordArguments+='--clean-build'}
if($SkipPrepare){$recordArguments+='--skip-prepare'}
& python -X utf8 -B (Join-Path $projectRoot 'tools\rendering-invariants\provenance.py') @recordArguments
if ($LASTEXITCODE) { throw 'Build input record failed.' }
Write-Host "Release engine: $enginePath"
