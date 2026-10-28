# DarkDungeon, 2026-10-28. See LICENSE (NetHack GPL).
# C1-1 development build, not an installer or a distribution package.
#Requires -Version 7
[CmdletBinding()]
param(
    [ValidateSet('all','en','ja')][string]$Language='all',
    [string]$QtRoot='C:\Qt\6.11.2\msvc2022_64',
    [string]$OutputRoot,
    [switch]$SkipPrepare
)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
if(!$OutputRoot){$OutputRoot=Join-Path $root 'artifacts\c1-core-runtime'}
$output=[IO.Path]::GetFullPath($ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputRoot)).TrimEnd('\','/')
$allowed=@('artifacts','build') | ForEach-Object { [IO.Path]::GetFullPath((Join-Path $root $_))+[IO.Path]::DirectorySeparatorChar }
if(!($allowed | Where-Object {$output.StartsWith($_,[StringComparison]::OrdinalIgnoreCase)})) {
    throw 'C1 development output must be inside this repository artifacts/ or build/.'
}
$vsWhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vs=& $vsWhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if(!$vs){throw 'Visual Studio C++ tools are missing.'}
$languages=if($Language -eq 'all'){@('en','ja')}else{@($Language)}
foreach($lang in $languages) {
    & (Join-Path $PSScriptRoot 'build-release.ps1') -QtRoot $QtRoot -Language $lang -SkipPrepare:$SkipPrepare -OutputRoot $output
    $snapshot=Join-Path $root $(if($lang -eq 'ja'){'build\nethack-ja'}else{'build\nethack'})
    $coreAfterGui=(Get-FileHash (Join-Path $snapshot 'src\objtty\x64\darkdungeon-core.lib')).Hash
    $entryBefore=@{}
    foreach($name in @('windmain.o','app_registry.o')){$entryBefore[$name]=(Get-FileHash (Join-Path $snapshot "src\objtty\x64\$name")).Hash}
    $manifestDirectory=Join-Path $output "evidence\$lang"
    New-Item -ItemType Directory -Force $manifestDirectory | Out-Null
    Copy-Item (Join-Path $root 'tools\agent-cli\abi-mismatch.c') (Join-Path $snapshot 'src\abi-mismatch.c') -Force
    $probe=@'
!include Makefile
$(OTTY)agent_port_mismatch.o: agent_port.c $(HACK_H)
	$(CC) $(CFLAGS) $(TTYDEF) /Ddarkdungeon_frontend_abi=darkdungeon_original_frontend_abi /Fo$@ agent_port.c
$(OTTY)abi_mismatch.o: abi-mismatch.c $(HACK_H)
	$(CC) $(CFLAGS) $(TTYDEF) /Fo$@ abi-mismatch.c
$(GAMEDIR)DarkDungeon-agent-abi-mismatch.exe: $(DD_CORELIB) $(OTTY)windmain.o $(OTTY)app_registry.o $(OTTY)agent_port_mismatch.o $(OTTY)abi_mismatch.o $(OTTY)agent_main.o $(LUALIB)
	$(link) $(LFLAGS) $(conlflags) /STACK:2097152 /out:$@ @<<
$(OTTY)windmain.o $(OTTY)app_registry.o $(OTTY)agent_port_mismatch.o $(OTTY)abi_mismatch.o $(OTTY)agent_main.o $(DD_CORELIB) $(LUALIB) $(conlibs) $(BCRYPT) user32.lib winmm.lib /LIBPATH:"@QT_LIB@" Qt6Core.lib Qt6Network.lib
<<
'@
    [IO.File]::WriteAllText((Join-Path $snapshot 'src\abi-negative.nmk'),$probe.Replace('@QT_LIB@',(Join-Path $QtRoot 'lib'))+"`n",[Text.ASCIIEncoding]::new())
    $batch=Join-Path $root "build\compile-agent-$lang.cmd"
    $text=@"
@echo off
call "$vs\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1
cd /d "$snapshot\src"
nmake /nologo IC_UTF8=Y DEBUGINFO=N WANT_CURSES=N CURSES_CONSOLE=N CURSES_GRAPHICAL=N SOUND_LIBRARIES= GIT_AVAILABLE=0 INTERNET_AVAILABLE=0 ..\binary\DarkDungeon-agent.exe dd-core-build.txt
if errorlevel 1 exit /b 1
nmake /nologo /f abi-negative.nmk IC_UTF8=Y DEBUGINFO=N WANT_CURSES=N CURSES_CONSOLE=N CURSES_GRAPHICAL=N SOUND_LIBRARIES= GIT_AVAILABLE=0 INTERNET_AVAILABLE=0 ..\binary\DarkDungeon-agent-abi-mismatch.exe
if errorlevel 1 exit /b 1
lib /nologo /list "objtty\x64\darkdungeon-core.lib" > "$manifestDirectory\core-members.txt"
if errorlevel 1 exit /b 1
dumpbin /nologo /dependents "..\binary\DarkDungeon-agent.exe" > "$manifestDirectory\agent-dependencies.txt"
if errorlevel 1 exit /b 1
exit /b 0
"@
    [IO.File]::WriteAllText($batch,$text,[Text.ASCIIEncoding]::new())
    & $env:ComSpec /d /c $batch
    if($LASTEXITCODE){throw "Agent core build failed for $lang."}
    $coreAfterAgent=(Get-FileHash (Join-Path $snapshot 'src\objtty\x64\darkdungeon-core.lib')).Hash
    if($coreAfterGui -ne $coreAfterAgent){throw 'Core changed between the GUI and agent links; rebuild both.'}
    foreach($name in $entryBefore.Keys){if($entryBefore[$name] -ne (Get-FileHash (Join-Path $snapshot "src\objtty\x64\$name")).Hash){throw "Shared entry changed between links: $name"}}
    $app=Join-Path $output $lang
    Copy-Item (Join-Path $snapshot 'binary\DarkDungeon-agent.exe') (Join-Path $app "DarkDungeon-agent-$lang.exe") -Force
    Copy-Item (Join-Path $QtRoot 'bin\Qt6Network.dll') $app -Force
    Copy-Item (Join-Path $snapshot 'src\dd-core-build.txt') $manifestDirectory -Force
    Copy-Item (Join-Path $snapshot 'binary\DarkDungeon-agent-abi-mismatch.exe') (Join-Path $manifestDirectory 'abi-mismatch.exe') -Force
    Copy-Item (Join-Path $snapshot 'src\objtty\x64\NetHack.MAP'),(Join-Path $snapshot 'src\objtty\x64\DarkDungeon-agent.MAP') $manifestDirectory -Force
    $members=@(Get-Content (Join-Path $manifestDirectory 'core-members.txt') | Where-Object {$_})
    if(!$members.Count){throw 'Core archive has no members.'}
    $inputs=Get-Content -LiteralPath (Join-Path $manifestDirectory 'dd-core-build.txt')
    $objectLine=@($inputs | Where-Object {$_ -cmatch '^OBJECTS='})
    if($objectLine.Count -ne 1){throw 'Common core object manifest is missing or ambiguous.'}
    $expectedMembers=@(($objectLine[0] -creplace '^OBJECTS=','').Trim() -split '\s+' | Sort-Object)
    if($members.Count -ne $expectedMembers.Count -or @(Compare-Object $expectedMembers @($members | Sort-Object) -CaseSensitive).Count){throw 'Archive members differ from the exact core object manifest.'}
    if($inputs | Where-Object {$_ -match '^(CFLAGS|CPPFLAGS|DEFINES)=' -and $_ -match 'QT_GRAPHICS|WIN32CON|/include/Qt'}){throw 'GUI/console flags or Qt headers leaked into core compiler inputs.'}
    $dependencies=@(Get-Content (Join-Path $manifestDirectory 'agent-dependencies.txt') | ForEach-Object {if($_ -match '^\s+([\w.-]+\.dll)\s*$'){$Matches[1]}})
    $systemDlls=@('KERNEL32.dll','GDI32.dll','USER32.dll','bcrypt.dll','ADVAPI32.dll','ole32.dll','SHELL32.dll','USERENV.dll','dbghelp.dll','RPCRT4.dll','WS2_32.dll','NETAPI32.dll','MPR.dll','SHLWAPI.dll','VERSION.dll','CRYPT32.dll','WINMM.dll')
    foreach($dll in $dependencies){if($dll -notin $systemDlls -and $dll -notin @('Qt6Core.dll','Qt6Network.dll') -and $dll -notmatch '^(?:MSVCP140(?:_\w+)?|VCRUNTIME140(?:_\w+)?|api-ms-win-crt-[\w-]+)\.dll$'){throw "Unexpected agent DLL dependency: $dll"}}
    if(!$dependencies.Count){throw 'Agent dependency manifest is empty.'}
    foreach($map in @('NetHack.MAP','DarkDungeon-agent.MAP')){if(!(Select-String -LiteralPath (Join-Path $manifestDirectory $map) -Pattern 'darkdungeon-core:')){throw "Shared core absent from link MAP: $map"}}
    if(Select-String -LiteralPath (Join-Path $manifestDirectory 'DarkDungeon-agent.MAP') -Pattern '\b(?:consoletty|wintty|topl|getline)\.o\b'){throw 'Console frontend leaked into the headless link.'}
    $record=[ordered]@{
        schema_version=1; language=$lang; stage='C1-1'; game_playable=$false
        shared_core=$coreAfterAgent
        unchanged_between_links=$true
        shared_entry_objects=$entryBefore
        member_count=$members.Count
        gui=(Get-FileHash (Join-Path $app "DarkDungeon-$lang.exe")).Hash
        agent=(Get-FileHash (Join-Path $app "DarkDungeon-agent-$lang.exe")).Hash
        compiler_inputs=(Get-FileHash (Join-Path $manifestDirectory 'dd-core-build.txt')).Hash
    }
    $record | ConvertTo-Json | Set-Content (Join-Path $manifestDirectory 'build.json') -Encoding utf8NoBOM
}
Write-Host "C1 core development build: $output"
