# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
param([Parameter(Mandatory)][string]$Path,[string]$SignTool=$env:SIGNTOOL_EXE)
$ErrorActionPreference='Stop'
if(!$env:CODESIGN_CERT) { throw 'CODESIGN_CERT is required for signing.' }
if(!$SignTool) {
    $SignTool=(Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Directory |
        Where-Object Name -Match '^10\.' | Sort-Object { [version]$_.Name } -Descending |
        ForEach-Object { Join-Path $_.FullName 'x64\signtool.exe' } |
        Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1)
}
if(!$SignTool -or !(Test-Path -LiteralPath $SignTool)) { throw 'signtool.exe is missing; set SIGNTOOL_EXE.' }
$identity=if(Test-Path -LiteralPath $env:CODESIGN_CERT -PathType Leaf) {
    $arguments=@('/f',$env:CODESIGN_CERT)
    if($env:CODESIGN_PASSWORD) { $arguments+=@('/p',$env:CODESIGN_PASSWORD) }
    $arguments
} elseif($env:CODESIGN_CERT -match '^[0-9a-fA-F]{40}$') { @('/sha1',$env:CODESIGN_CERT) }
else { @('/n',$env:CODESIGN_CERT) }
$timestamp=if($env:CODESIGN_TIMESTAMP_URL){$env:CODESIGN_TIMESTAMP_URL}else{'http://timestamp.digicert.com'}
$signArguments=@('sign')+$identity+@('/fd','sha256','/tr',$timestamp,'/td','sha256',$Path)
& $SignTool @signArguments
if($LASTEXITCODE) { throw "Signing failed: $(Split-Path $Path -Leaf)" }
if((Get-AuthenticodeSignature -LiteralPath $Path).Status -ne 'Valid') { throw 'The resulting Authenticode signature is not valid.' }
