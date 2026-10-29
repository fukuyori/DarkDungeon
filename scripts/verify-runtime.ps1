# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#Requires -Version 7
param([switch]$Native,[switch]$LauncherTest,[switch]$AskName,[string]$PlayerName,[string]$ApplicationRoot,[string]$QtRoot='C:\Qt\6.11.2\msvc2022_64',[ValidateSet('en','ja')][string]$Language='en',[switch]$PreserveOnTimeout,[string]$RestoreApplicationRoot,[switch]$IdleCheckpoint,[switch]$RequireRetiredMotion,[switch]$GeometryCapture)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$mode=if($Native){'windows'}else{'offscreen'}
$evidence=Join-Path $projectRoot ('artifacts\smoke-'+$Language+'-'+$mode+'-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
$runtime=Join-Path $evidence 'runtime'
New-Item -ItemType Directory -Force $runtime | Out-Null
if(!$ApplicationRoot){$ApplicationRoot=Join-Path $projectRoot 'dist\DarkDungeon'}
foreach($required in @('DarkDungeon.exe',"$Language/DarkDungeon-$Language.exe")) {
    if(!(Test-Path -LiteralPath (Join-Path $ApplicationRoot $required) -PathType Leaf)){throw "ApplicationRoot is missing $required"}
}
Copy-Item (Join-Path $ApplicationRoot '*') $runtime -Recurse -Force
if($IdleCheckpoint) { Add-Content -LiteralPath (Join-Path $runtime "$Language/nethackrc.template") -Value "`nOPTIONS=idlecheckpoint" -Encoding utf8 }
New-Item -ItemType Directory -Force (Join-Path $evidence 'DarkDungeon') | Out-Null
Set-Content (Join-Path $evidence 'DarkDungeon/DarkDungeon.ini') "[General]`ntilewidth=16`ntileheight=16`ndollwidth=32`ndollheight=32" -Encoding utf8
$start=[Diagnostics.ProcessStartInfo]::new()
$start.FileName=Join-Path $runtime 'DarkDungeon.exe'
$start.WorkingDirectory=$runtime
$start.UseShellExecute=$false
$start.CreateNoWindow=$true
$start.WindowStyle=[Diagnostics.ProcessWindowStyle]::Hidden
$start.RedirectStandardOutput=$true
$start.RedirectStandardError=$true
$launcherArguments=if($LauncherTest){
    if($Language -ne 'ja'){throw 'LauncherTest selects Japanese; specify -Language ja.'}
    @('--launcher-test','--smoke')
}else{@('--language',$Language,'--smoke')}
foreach($argument in ($launcherArguments+@('--','-uGil','-pKnight','-rhuman','-gmale','-alawful'))) { $start.ArgumentList.Add($argument) }
$start.Environment['DARKDUNGEON_SMOKE_OUTPUT']=$evidence
if($GeometryCapture){$start.Environment['DARKDUNGEON_SMOKE_GEOMETRY']='1'}else{$start.Environment.Remove('DARKDUNGEON_SMOKE_GEOMETRY') | Out-Null}
if($PlayerName){$start.Environment['DARKDUNGEON_SMOKE_PLAYER']=$PlayerName}else{$start.Environment.Remove('DARKDUNGEON_SMOKE_PLAYER') | Out-Null}
if($AskName){$start.Environment['DARKDUNGEON_SMOKE_ASKNAME']='1'}else{$start.Environment.Remove('DARKDUNGEON_SMOKE_ASKNAME') | Out-Null}
$start.Environment['DARKDUNGEON_SMOKE_LEVEL_IDS']=Join-Path $projectRoot "build\level-ids-$Language.json"
$start.Environment.Remove('NETHACKOPTIONS') | Out-Null
$start.Environment.Remove('NETHACKRC') | Out-Null
if(!$Native) {
    $start.Environment['QT_QPA_PLATFORM']='offscreen'
    $start.Environment['QT_QPA_PLATFORM_PLUGIN_PATH']=Join-Path $QtRoot 'plugins\platforms'
    $start.Environment['QT_QPA_FONTDIR']=Join-Path $env:WINDIR 'Fonts'
}
$buildRecords=@()
foreach($phase in @('save','restore')) {
    if($phase -eq 'restore' -and $RestoreApplicationRoot) {
        $restoreEngine=Join-Path $RestoreApplicationRoot "$Language/DarkDungeon-$Language.exe"
        if(!(Test-Path -LiteralPath $restoreEngine -PathType Leaf)){throw "RestoreApplicationRoot is missing $Language/DarkDungeon-$Language.exe"}
        Copy-Item -LiteralPath $restoreEngine -Destination (Join-Path $runtime "$Language/DarkDungeon-$Language.exe") -Force
    }
    $buildRecords+=[pscustomobject]@{phase=$phase;language=$Language;engine_sha256=(Get-FileHash -LiteralPath (Join-Path $runtime "$Language/DarkDungeon-$Language.exe")).Hash;mode=$mode;require_retired_motion=[bool]$RequireRetiredMotion;idlecheckpoint_requested=[bool]$IdleCheckpoint;restore_source=$RestoreApplicationRoot}
    $buildRecords | ConvertTo-Json | Set-Content (Join-Path $evidence 'runtime-builds.json') -Encoding utf8NoBOM
    $start.Environment['DARKDUNGEON_SMOKE_PHASE']=$phase
    $process=[Diagnostics.Process]::Start($start)
    $standardOutput=$process.StandardOutput.ReadToEndAsync()
    $standardError=$process.StandardError.ReadToEndAsync()
    $timedOut=!$process.WaitForExit(45000)
    if($timedOut -and $PreserveOnTimeout) { throw "Runtime $phase exceeded 45 seconds; process $($process.Id) is retained for diagnosis. Evidence: $evidence" }
    if($timedOut) { $process.Kill($true); $process.WaitForExit() }
    [IO.File]::WriteAllText((Join-Path $evidence "stdout-$phase.txt"),$standardOutput.GetAwaiter().GetResult())
    [IO.File]::WriteAllText((Join-Path $evidence "stderr-$phase.txt"),$standardError.GetAwaiter().GetResult())
    if($timedOut) { throw "Runtime $phase check exceeded 45 seconds; test process stopped. Evidence: $evidence" }
    if($process.ExitCode -ne 0) { throw "Runtime $phase failed with exit code $($process.ExitCode). Evidence: $evidence" }
}
foreach($paniclog in Get-ChildItem $runtime -Filter paniclog -Recurse -File) {
    if(Select-String -LiteralPath $paniclog.FullName -Pattern 'impossible|panic') {throw "Engine reported an error. Evidence: $evidence"}
}
$runtimeReport=Join-Path $evidence 'runtime.txt'
$runtimeText=Get-Content -LiteralPath $runtimeReport -Raw -Encoding utf8
# A retired motion path cannot satisfy a new movement/attack quality check.
$retiredStatus=$runtimeText.Contains('Walk/attack notifications and interpolation=not-run (retired for R6 phase 0)')
if($retiredStatus) {
    if($runtimeText -match '(?im)^.*(?:pet walk animation|Walk/attack notifications).*\bpass\b') {throw 'A retired animation was reported as passed.'}
} elseif($RequireRetiredMotion) {
    throw 'The retired animation status is missing from runtime evidence.'
}
# R6 #132: inventory paint/drag/tooltip must not draw CORE/DISP (assisted check).
foreach($phase in @('save','restore')) {
    $invariance=Join-Path $evidence "inventory-invariance-$phase.txt"
    if(!(Test-Path -LiteralPath $invariance) -or !(Select-String -LiteralPath $invariance -SimpleMatch 'inventory paint/drag/tooltip RNG invariance under hallucination=pass' -Quiet)) {
        throw "Inventory paint invariance evidence for $phase is missing or failed. Evidence: $evidence"
    }
}
if($GeometryCapture) {
    $bundles=@(Get-ChildItem -LiteralPath $evidence -Directory -Filter 'geometry-g*')
    if($bundles.Count -ne 4){throw "Expected four geometry bundles (G36/G48, save/restore). Evidence: $evidence"}
    $geometryResults=foreach($bundle in $bundles) {
        $result=& python -X utf8 -B (Join-Path $projectRoot 'tools/rendering-comparison/verify-geometry.py') $bundle.FullName
        if($LASTEXITCODE -ne 0){throw "Geometry verification failed: $($bundle.FullName)"}
        $result | ConvertFrom-Json
    }
    $geometryResults | ConvertTo-Json | Set-Content (Join-Path $evidence 'geometry-verification.json') -Encoding utf8NoBOM
    foreach($suite in @('G36','G48')) {
        if(@($geometryResults | Where-Object {$_.suite -eq $suite -and $_.language -eq $Language}).Count -ne 2){throw "Missing $Language $suite save/restore geometry results"}
    }
    Write-Host 'Geometry bundles: G36/G48 save/restore metadata and PNG checks passed (reference only)'
}
Get-Content -LiteralPath $runtimeReport -Encoding utf8
if($LauncherTest){Get-Content (Join-Path $evidence 'launcher.txt')}
Write-Host "Runtime evidence: $evidence"
