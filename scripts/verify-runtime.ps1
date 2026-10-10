# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#Requires -Version 7
param([switch]$Native,[switch]$LauncherTest,[switch]$AskName,[string]$PlayerName,[string]$ApplicationRoot,[string]$QtRoot='C:\Qt\6.11.2\msvc2022_64',[ValidateSet('en','ja')][string]$Language='en')
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
foreach($phase in @('save','restore')) {
    $start.Environment['DARKDUNGEON_SMOKE_PHASE']=$phase
    $process=[Diagnostics.Process]::Start($start)
    $standardOutput=$process.StandardOutput.ReadToEndAsync()
    $standardError=$process.StandardError.ReadToEndAsync()
    $timedOut=!$process.WaitForExit(45000)
    if($timedOut) { $process.Kill($true); $process.WaitForExit() }
    [IO.File]::WriteAllText((Join-Path $evidence "stdout-$phase.txt"),$standardOutput.GetAwaiter().GetResult())
    [IO.File]::WriteAllText((Join-Path $evidence "stderr-$phase.txt"),$standardError.GetAwaiter().GetResult())
    if($timedOut) { throw "Runtime $phase check exceeded 45 seconds; test process stopped. Evidence: $evidence" }
    if($process.ExitCode -ne 0) { throw "Runtime $phase failed with exit code $($process.ExitCode). Evidence: $evidence" }
}
foreach($paniclog in Get-ChildItem $runtime -Filter paniclog -Recurse -File) {
    if(Select-String -LiteralPath $paniclog.FullName -Pattern 'impossible|panic') {throw "Engine reported an error. Evidence: $evidence"}
}
Get-Content (Join-Path $evidence 'runtime.txt')
if($LauncherTest){Get-Content (Join-Path $evidence 'launcher.txt')}
Write-Host "Runtime evidence: $evidence"
