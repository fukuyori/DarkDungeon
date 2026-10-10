# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#Requires -Version 7
param([switch]$Sign,[switch]$PrepareOnly,[string]$ISCC='C:\Program Files (x86)\Inno Setup 6\ISCC.exe',[string]$OutputDirectory)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$source=Join-Path $projectRoot 'dist\DarkDungeon'
if(!(Test-Path (Join-Path $source 'DarkDungeon.exe'))) { throw 'Run scripts/build-release.ps1 first.' }
foreach($language in @('en','ja')) {
    if(!(Test-Path (Join-Path $source "$language\DarkDungeon-$language.exe"))) { throw "Missing $language engine. Run scripts/build-release.ps1 first." }
}
if($Sign -and !$env:CODESIGN_CERT) { throw 'Set CODESIGN_CERT before using -Sign.' }
$version=(Get-Content (Join-Path $projectRoot 'VERSION') -Raw).Trim()
if($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid VERSION.' }
$stage=Join-Path $projectRoot ('build\installer-stage-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force $stage | Out-Null
foreach($file in Get-ChildItem $source -File) {
    if($file.Extension -eq '.dll' -or $file.Name -in @('DarkDungeon.exe','VERSION')) {
        Copy-Item $file.FullName $stage -Force
    }
}
foreach($directory in @('en','ja','platforms','generic','imageformats','iconengines','styles','tls','networkinformation','licenses')) {
    if(Test-Path (Join-Path $source $directory)) { Copy-Item (Join-Path $source $directory) $stage -Recurse -Force }
}
$signDirectives=''
$compilerArguments=@()
if($Sign) {
    if(!$PrepareOnly) { & (Join-Path $PSScriptRoot 'sign-file.ps1') -Path (Join-Path $stage 'DarkDungeon.exe') }
    if(!$PrepareOnly) {
        foreach($language in @('en','ja')) { & (Join-Path $PSScriptRoot 'sign-file.ps1') -Path (Join-Path $stage "$language\DarkDungeon-$language.exe") }
    }
    $signDirectives="SignTool=DarkDungeonSigner`nSignedUninstaller=yes"
    $powerShellPath=(Get-Command pwsh.exe -ErrorAction Stop).Source
    # Inno quotes $f; $q quotes fixed paths. Certificate/password stay in the
    # signing process environment rather than being embedded in the .iss file.
    $signCommand='$q'+$powerShellPath+'$q -NoProfile -File $q'+(Join-Path $PSScriptRoot 'sign-file.ps1')+'$q -Path $f'
    $compilerArguments+="/SDarkDungeonSigner=$signCommand"
}
$installerDirectory=if($OutputDirectory){[IO.Path]::GetFullPath($OutputDirectory)}else{Join-Path $projectRoot 'dist\installers'}
New-Item -ItemType Directory -Force $installerDirectory | Out-Null
$definition=Join-Path $projectRoot 'build\DarkDungeon.iss'
$text=@"
[Setup]
AppId={{198EAF50-F637-4FD5-AAD3-16C577CE2AAB}
AppName=DarkDungeon
AppVersion=$version
DefaultDirName={localappdata}\Programs\DarkDungeon
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\DarkDungeon.exe
OutputDir=$installerDirectory
OutputBaseFilename=DarkDungeon-$version-windows-x64
Compression=lzma2
SolidCompression=yes
$signDirectives

[Files]
Source: "$stage\*"; DestDir: "{app}"; Excludes: "record"; Flags: ignoreversion recursesubdirs createallsubdirs

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "japanese"; MessagesFile: "compiler:Languages\Japanese.isl"

[Icons]
Name: "{autoprograms}\DarkDungeon"; Filename: "{app}\DarkDungeon.exe"; WorkingDir: "{app}"

[Run]
Filename: "{app}\DarkDungeon.exe"; Description: "Play DarkDungeon"; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent
"@
[IO.File]::WriteAllText($definition,$text,[Text.UTF8Encoding]::new($true))
if($PrepareOnly) { Write-Host "Prepared installer definition: $definition"; return }
if(!(Test-Path -LiteralPath $ISCC)) { throw 'Inno Setup compiler is missing.' }
& $ISCC @compilerArguments $definition
if($LASTEXITCODE) { throw 'Inno Setup compilation failed.' }
$installer=Join-Path $installerDirectory "DarkDungeon-$version-windows-x64.exe"
if($Sign -and (Get-AuthenticodeSignature -LiteralPath $installer).Status -ne 'Valid') { throw 'The installer signature is not valid.' }
Write-Host "Installer: $installer"
