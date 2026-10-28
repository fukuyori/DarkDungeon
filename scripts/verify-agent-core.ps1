# DarkDungeon, 2026-10-28. See LICENSE (NetHack GPL).
# Verifies the C1-1 build boundary; does not claim that CLI play is implemented.
#Requires -Version 7
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ApplicationRoot,
    [ValidateSet('all','en','ja')][string]$Language='all',
    [string]$OutputDirectory
)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$appRoot=[IO.Path]::GetFullPath($ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($ApplicationRoot))
if(!$OutputDirectory){$OutputDirectory=Join-Path $root ('artifacts\c1-core-check-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))}
$evidence=[IO.Path]::GetFullPath($ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDirectory))
foreach($path in @($appRoot,$evidence)) {
    $allowed=@('artifacts','build') | ForEach-Object { [IO.Path]::GetFullPath((Join-Path $root $_))+[IO.Path]::DirectorySeparatorChar }
    if(!($allowed | Where-Object {$path.StartsWith($_,[StringComparison]::OrdinalIgnoreCase)})) {
        throw 'C1 checks must use a repository development build and evidence directory.'
    }
}
if(Test-Path -LiteralPath $evidence){throw 'Use a fresh evidence directory.'}
New-Item -ItemType Directory -Force $evidence | Out-Null
$languages=if($Language -eq 'all'){@('en','ja')}else{@($Language)}
$results=@()
function Invoke-Check([string]$exe,[string[]]$arguments,[string]$label,[int]$expectedExit=0,[bool]$withSmoke=$false) {
    $start=[Diagnostics.ProcessStartInfo]::new($exe)
    $start.UseShellExecute=$false
    $start.CreateNoWindow=$true
    $start.WindowStyle=[Diagnostics.ProcessWindowStyle]::Hidden
    $start.WorkingDirectory=Split-Path $exe -Parent
    $start.RedirectStandardOutput=$true
    $start.RedirectStandardError=$true
    foreach($arg in $arguments){$start.ArgumentList.Add($arg)}
    # No Qt installation directories or display settings are inherited by the agent.
    $start.Environment['PATH']="$env:WINDIR\System32;$env:WINDIR"
    foreach($key in @('QT_QPA_PLATFORM','QT_PLUGIN_PATH','QT_QPA_PLATFORM_PLUGIN_PATH','DARKDUNGEON_SMOKE_OUTPUT','NETHACKOPTIONS','NETHACKRC')) {
        $start.Environment.Remove($key) | Out-Null
    }
    $environmentRoot=Join-Path $evidence "$label-environment"
    foreach($variable in @('LOCALAPPDATA','APPDATA','USERPROFILE')) {
        $directory=Join-Path $environmentRoot $variable
        New-Item -ItemType Directory -Force $directory | Out-Null
        $start.Environment[$variable]=$directory
    }
    if($withSmoke){$start.Environment['DARKDUNGEON_SMOKE_OUTPUT']=$environmentRoot}
    $process=[Diagnostics.Process]::Start($start)
    $stdout=$process.StandardOutput.ReadToEndAsync()
    $stderr=$process.StandardError.ReadToEndAsync()
    if(!$process.WaitForExit(15000)) {
        throw "C1 check timed out ($label); process $($process.Id) is retained for diagnosis."
    }
    [IO.File]::WriteAllText((Join-Path $evidence "$label.stdout.txt"),$stdout.GetAwaiter().GetResult())
    [IO.File]::WriteAllText((Join-Path $evidence "$label.stderr.txt"),$stderr.GetAwaiter().GetResult())
    if($process.ExitCode -ne $expectedExit){throw "C1 check failed ($label): exit $($process.ExitCode)"}
    if(Get-ChildItem -LiteralPath $environmentRoot -File -Recurse){throw "Diagnostic wrote unexpected user data: $label"}
}
foreach($lang in $languages) {
    $languageRoot=Join-Path $appRoot $lang
    $headless=Join-Path $evidence "$lang-headless"
    New-Item -ItemType Directory -Force $headless | Out-Null
    # The diagnostic must run with no tile images, sprites, Qt GUI DLLs or plugins.
    foreach($file in @("DarkDungeon-agent-$lang.exe",'Qt6Core.dll','Qt6Network.dll','msvcp140.dll','vcruntime140.dll','vcruntime140_1.dll','msvcp140_1.dll','msvcp140_2.dll','vcruntime140_threads.dll','msvcp140_atomic_wait.dll','msvcp140_codecvt_ids.dll')) {
        $source=Join-Path $languageRoot $file
        if(Test-Path -LiteralPath $source){Copy-Item -LiteralPath $source -Destination $headless}
    }
    $agentOutput=Join-Path $evidence "$lang-agent.json"
    $guiOutput=Join-Path $evidence "$lang-gui.json"
    Invoke-Check (Join-Path $headless "DarkDungeon-agent-$lang.exe") @('--self-check',$agentOutput) "$lang-agent"
    Invoke-Check (Join-Path $languageRoot "DarkDungeon-$lang.exe") @('--self-check',$guiOutput) "$lang-gui"
    $agent=Get-Content -LiteralPath $agentOutput -Raw | ConvertFrom-Json
    $gui=Get-Content -LiteralPath $guiOutput -Raw | ConvertFrom-Json
    if($agent.port -ne 'agent' -or $gui.port -ne 'Qt' -or $agent.language -ne $lang -or $gui.language -ne $lang) {throw 'Wrong frontend or language.'}
    if(!$agent.abi_matches -or !$gui.abi_matches -or $agent.core_qt_graphics -or $gui.core_qt_graphics -or $agent.game_started -or $gui.game_started){throw 'Core boundary failed.'}
    foreach($probe in @($agent,$gui)) {if(($probe.abi | ConvertTo-Json -Compress) -ne ($probe.frontend_abi | ConvertTo-Json -Compress)){throw 'Core and actual frontend ABI values differ.'}}
    if(($agent.abi | ConvertTo-Json -Compress) -ne ($gui.abi | ConvertTo-Json -Compress) -or $agent.tile_checksum -ne $gui.tile_checksum -or $agent.max_glyph -ne $gui.max_glyph) {
        throw 'Core ABI or static mapping differs between the frontends.'
    }
    Invoke-Check (Join-Path $headless "DarkDungeon-agent-$lang.exe") @() "$lang-agent-gated" 3
    if((Get-Content -LiteralPath (Join-Path $evidence "$lang-agent-gated.stderr.txt") -Raw) -notmatch 'agent_startup_not_implemented') {
        throw 'Incomplete startup was not explicitly refused.'
    }
    Invoke-Check (Join-Path $headless "DarkDungeon-agent-$lang.exe") @('--self-check',(Join-Path $evidence "$lang-rejected.json")) "$lang-agent-test-env" 3 $true
    if((Get-Content -LiteralPath (Join-Path $evidence "$lang-agent-test-env.stderr.txt") -Raw) -notmatch 'agent_test_environment_rejected'){throw 'Agent inherited the GUI smoke environment.'}
    Copy-Item -LiteralPath (Join-Path $appRoot "evidence\$lang\abi-mismatch.exe") -Destination $headless
    Invoke-Check (Join-Path $headless 'abi-mismatch.exe') @('--self-check',(Join-Path $evidence "$lang-invalid-abi.json")) "$lang-abi-mismatch" 4
    if((Get-Content -LiteralPath (Join-Path $evidence "$lang-abi-mismatch.stderr.txt") -Raw) -notmatch 'core_frontend_abi_mismatch: iflags'){throw 'Corrupted ABI was not detected.'}
    if(Test-Path -LiteralPath (Join-Path $evidence "$lang-invalid-abi.json")){throw 'ABI mismatch wrote a successful diagnostic.'}
    $results+=[pscustomobject]@{language=$lang;diagnostic=$agent;no_gui_dlls_or_assets=$true;normal_startup_gated=$true}
}
[ordered]@{schema_version=1;stage='C1-1';cli_play_tested=$false;checks=$results} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $evidence 'result.json') -Encoding utf8NoBOM
Write-Host "C1 core checks passed: $evidence"
