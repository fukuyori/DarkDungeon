# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#Requires -Version 7
param(
    [Parameter(Mandatory)][string]$BuildRoot,
    [Parameter(Mandatory)][string]$ProfileRoot,
    [Parameter(Mandatory)][ValidateSet('en','ja')][string]$Language,
    [string[]]$GameArguments=@(),
    [switch]$ProbeOnly
)
$ErrorActionPreference='Stop'
# This script never sets SMOKE, RNG, or clock-control variables and never kills a game.
$testVariables=Get-ChildItem Env: | Where-Object {$_.Name -like 'DARKDUNGEON_SMOKE_*'}
if($testVariables){throw ('Remove inherited test variables before manual play: '+($testVariables.Name -join ', '))}
$build=$ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($BuildRoot)
$manualProfilePath=$ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($ProfileRoot).TrimEnd('\','/')
$launcher=Join-Path $build 'DarkDungeon.exe'
$engine=Join-Path $build "$Language\DarkDungeon-$Language.exe"
function Invoke-Capability([string]$Executable,[string]$Frontend) {
    $manifestPath=$Executable+'.capabilities.json'
    if(!(Test-Path -LiteralPath $manifestPath)){throw "Missing deployment capability manifest; executable was not queried: $Executable"}
    $manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if($manifest.schema -ne 'darkdungeon-deployment-capabilities-v1' -or $manifest.frontend -ne $Frontend -or
       $manifest.manual_profile -ne 1 -or $manifest.executable_sha256 -ne (Get-FileHash -LiteralPath $Executable).Hash.ToLowerInvariant()){
        throw "Unsupported or mismatched deployment manifest; executable was not queried: $Executable"
    }
    $start=[Diagnostics.ProcessStartInfo]::new($Executable)
    $start.UseShellExecute=$false
    $start.CreateNoWindow=$true
    $start.RedirectStandardOutput=$true
    $start.RedirectStandardError=$true
    $start.ArgumentList.Add('--capabilities')
    $process=[Diagnostics.Process]::Start($start)
    if(!$process.WaitForExit(15000)){throw "Capability query timed out; process $($process.Id) was left running."}
    $stdout=$process.StandardOutput.ReadToEnd()
    $stderr=$process.StandardError.ReadToEnd()
    if($process.ExitCode -ne 0){throw "Capability query failed: $stderr"}
    $capability=$stdout | ConvertFrom-Json
    if($capability.schema -ne 'darkdungeon-capabilities-v1' -or $capability.frontend -ne $Frontend -or $capability.manual_profile -ne 1){
        throw "This executable does not support isolated manual profiles: $Executable"
    }
    return $capability
}
$launcherCapability=Invoke-Capability $launcher 'launcher'
$engineCapability=Invoke-Capability $engine 'qt-engine'
if($engineCapability.language -ne $Language){throw 'Engine language does not match requested language.'}
if($ProbeOnly){
    [ordered]@{launcher=$launcherCapability;engine=$engineCapability;profile=$manualProfilePath;started=$false} | ConvertTo-Json -Depth 5
    return
}
$sessions=Join-Path $manualProfilePath "$Language\sessions"
$previous=@(if(Test-Path -LiteralPath $sessions){Get-ChildItem -LiteralPath $sessions -Filter '*.json' | Select-Object -ExpandProperty FullName})
$start=[Diagnostics.ProcessStartInfo]::new($launcher)
$start.UseShellExecute=$false
$start.CreateNoWindow=$true
$start.RedirectStandardError=$true
foreach($argument in @('--manual-profile',$manualProfilePath,'--language',$Language,'--')+$GameArguments){$start.ArgumentList.Add($argument)}
$process=[Diagnostics.Process]::Start($start)
$deadline=[DateTime]::UtcNow.AddSeconds(15)
do {
    if($process.HasExited){throw "Manual launcher/game exited before ready (code $($process.ExitCode)): $($process.StandardError.ReadToEnd())"}
    $reportFile=if(Test-Path -LiteralPath $sessions){Get-ChildItem -LiteralPath $sessions -Filter '*.json' | Where-Object {$_.FullName -notin $previous} | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1}
    if($reportFile){
        $report=Get-Content -LiteralPath $reportFile.FullName -Raw | ConvertFrom-Json
        if($report.prefixes -and $report.qt_settings_file){
            $running=Get-Process -Id $report.pid -ErrorAction SilentlyContinue
            if(!$running){throw "Game exited during startup. Evidence: $($reportFile.FullName)"}
            function Full-Path([string]$Value){if(!$Value){throw 'Missing startup path'};[IO.Path]::GetFullPath($Value).TrimEnd('\','/')}
            $expectedData=Full-Path (Join-Path $manualProfilePath "$Language\data")
            $expectedSettings=Full-Path (Join-Path $manualProfilePath "$Language\settings")
            $prefixNames=@('hackdir','leveldir','savedir','bonesdir','datadir','scoredir','lockdir','sysconfdir','configdir','troubledir')
            if(@(Compare-Object ($report.prefixes.PSObject.Properties.Name | Sort-Object) ($prefixNames | Sort-Object)).Count){throw 'Unexpected effective prefix set'}
            foreach($name in $prefixNames){
                $expected=if($name -eq 'datadir'){Full-Path (Split-Path $engine -Parent)}else{$expectedData}
                if((Full-Path $report.prefixes.$name) -ne $expected){throw "Wrong effective prefix: $name"}
            }
            if($report.schema -ne 'darkdungeon-manual-session-v1' -or $report.language -ne $Language -or
               (Full-Path $report.profile) -ne (Full-Path $manualProfilePath) -or (Full-Path $report.data) -ne $expectedData -or
               (Full-Path $report.executable) -ne (Full-Path $engine) -or (Full-Path $running.Path) -ne (Full-Path $engine) -or
               $report.executable_sha256 -ne (Get-FileHash -LiteralPath $engine).Hash.ToLowerInvariant() -or
               (Full-Path $report.settings_root) -ne $expectedSettings -or $report.qt_settings_format -ne 'ini' -or
               (Full-Path $report.qt_settings_file) -ne (Full-Path (Join-Path $expectedSettings 'DarkDungeon\DarkDungeon.ini')) -or
               $report.smoke_automation -ne $false -or $report.seed_control -ne $false -or $report.clock_control -ne $false){throw 'Startup identity/settings/control mismatch'}
            foreach($presence in @($report.startup_environment_presence,$report.effective_environment_presence)){
                if(!$presence){throw 'Missing environment presence evidence'}
                if(@($presence.PSObject.Properties.Name | Where-Object {$_ -like 'DARKDUNGEON_SMOKE_*'}).Count){throw 'Inherited smoke environment in startup evidence'}
            }
            if($report.effective_environment_presence.NETHACKOPTIONS -ne $false -or $report.effective_environment_presence.NETHACKRC -ne $false){throw 'External NetHack configuration environment remains active'}
            [ordered]@{launcher_pid=$process.Id;pid=$report.pid;language=$report.language;profile=$manualProfilePath;executable=$report.executable;executable_sha256=$report.executable_sha256;evidence=$reportFile.FullName;effective_paths_verified=$true;smoke_automation=$false} | ConvertTo-Json
            return
        }
    }
    Start-Sleep -Milliseconds 100
}while([DateTime]::UtcNow -lt $deadline)
throw "No verified Qt/core startup evidence arrived; launcher $($process.Id) and any running game were left open. Inspect the profile sessions directory."
