# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#Requires -Version 7
param([string]$NetHackSource=(Join-Path $PSScriptRoot '..\..\NetHack'))
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
function Get-OptionIdentifiers([string]$path) {
    $text=Get-Content $path -Raw -Encoding utf8
    $text=[regex]::Replace($text,'(?s)/\*.*?\*/','')
    $identifiers=@()
    foreach($macro in [regex]::Matches($text,'(?ms)^\s+NHOPT[BCPO]\((.*?)\)\s*$')) {
        $body=$macro.Groups[1].Value
        $fields=@();$field='';$quoted=$false;$escaped=$false;$depth=0
        foreach($character in $body.ToCharArray()) {
            if($escaped){$field+=$character;$escaped=$false;continue}
            if($quoted -and $character -eq '\'){$field+=$character;$escaped=$true;continue}
            if($character -eq '"'){$quoted=!$quoted}
            if(!$quoted) {
                if($character -eq '('){$depth++}
                if($character -eq ')'){$depth--}
                if($character -eq ',' -and $depth -eq 0){$fields+=$field.Trim();$field='';continue}
            }
            $field+=$character
        }
        $fields+=$field.Trim()
        # Inactive legacy entries also use a 12-argument form.
        if($fields.Count -notin @(11,12,13)){throw "Unexpected option macro layout: $body"}
        $identifiers+=($fields[0]+'|'+$fields[9])
    }
    $identifiers | Sort-Object -Unique
}
$original=@(Get-OptionIdentifiers (Join-Path $NetHackSource 'include\optlist.h'))
$japanese=@(Get-OptionIdentifiers (Join-Path $root 'build\nethack-ja\include\optlist.h'))
if(!$original.Count){throw 'No option identifiers were examined.'}
$difference=Compare-Object $original $japanese
if($difference){$difference | Format-Table | Out-String | Write-Host;throw 'Japanese translation changed option names or aliases.'}
$format='%(?:[-+ #0]*\d*(?:\.\d+|\.\*)?(?:hh|ll|[lhzjt])?[diuoxXfFeEgGaAcspn]|%)'
$count=0
foreach($file in @('core-ja.json','actions-ja.json')) {
    foreach($entry in Get-Content (Join-Path $root "translations\$file") -Raw -Encoding utf8 | ConvertFrom-Json) {
        $source=@([regex]::Matches($entry.literal,$format) | ForEach-Object Value)
        $target=@([regex]::Matches($entry.translation,$format) | ForEach-Object Value)
        if(($source -join '|') -ne ($target -join '|')){throw "Translation changed printf arguments: $($entry.file): $($entry.literal)"}
        $count++
    }
}
Write-Host "Localization: $($original.Count) option names/aliases unchanged; $count translation formats passed."
