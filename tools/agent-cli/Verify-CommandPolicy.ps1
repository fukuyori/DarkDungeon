# C0 static command policy verification, 2026-10-27. See LICENSE.
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$InventoryPath,
    [string]$PolicyPath = (Join-Path $PSScriptRoot '..\..\docs\data\agent-cli-command-policy.json'),
    [ValidateSet('en','ja')][string]$ReferenceLanguage = 'en',
    [ValidateSet('qt','shared-core')][string]$ReferenceVariant = 'qt',
    [string]$PeerInventoryPath
)
$ErrorActionPreference = 'Stop'
$inventory = Get-Content -LiteralPath $InventoryPath -Raw -Encoding utf8 | ConvertFrom-Json
$policy = Get-Content -LiteralPath $PolicyPath -Raw -Encoding utf8 | ConvertFrom-Json
if ($policy.schema_version -ne 1 -or $inventory.kind -ne 'static-source-audit-not-runtime-api') { throw 'Unsupported audit or policy format.' }
$known = [System.Collections.Generic.Dictionary[string,object]]::new([StringComparer]::Ordinal)
foreach ($entry in $policy.commands) {
    if (!$entry.id -or $known.ContainsKey($entry.id)) { throw 'Missing or duplicated policy command ID.' }
    $known[$entry.id] = $entry
}
$seen = [System.Collections.Generic.Dictionary[string,object]]::new([StringComparer]::Ordinal)
$semanticMask = 0x0040 -bor 0x0004 -bor 0x0200 -bor 0x4000 -bor 0x0080 -bor 0x0100 -bor 0x0400
foreach ($command in $inventory.commands) {
    if (!$command.id -or $seen.ContainsKey($command.id)) { throw 'Missing or duplicated inventory command ID.' }
    $seen[$command.id] = $true
    if (!$known.ContainsKey($command.id)) { throw "Unclassified command: $($command.id)" }
    $entry = $known[$command.id]
    $expectedRoute = switch ($command.category) {
        normal { 'core_command' }
        prefix { 'prefix_modifier' }
        parameterized { 'bound_boolean_option' }
        internal { 'excluded_internal' }
        privileged { 'excluded_privileged' }
        environment { 'excluded_environment' }
        unavailable { 'excluded_environment' }
        default { throw "Unclassified source category: $($command.category)" }
    }
    # shell/suspend/bugreport stay excluded if another OS builds them.
    if ($command.id -in @('shell','suspend','bugreport')) { $expectedRoute = 'excluded_environment' }
    if ($entry.route -ne $expectedRoute) { throw "Command route changed: $($command.id)" }
    if ($entry.reference_function -cne $command.function) { throw "Command function changed: $($command.id)" }
    if ($entry.route -ne 'excluded_environment' -and (($entry.reference_flags -band $semanticMask) -ne ($command.flags -band $semanticMask))) { throw "Semantic command flags changed: $($command.id)" }
    $shouldExpose = $entry.route -in @('core_command','bound_boolean_option')
    if ($entry.public_in_normal_mode -ne $shouldExpose) { throw "Invalid normal-mode exposure: $($command.id)" }
    if ($entry.public_in_normal_mode -and ($command.flags -band (0x0040 -bor 0x0004 -bor 0x0010))) { throw "Unavailable/internal/privileged command exposed: $($command.id)" }
    $expectedPrefixes = @()
    if ($entry.route -eq 'core_command') {
        if ($command.flags -band 0x0080) { $expectedPrefixes += 'reqmenu' }
        if ($command.flags -band 0x0100) { $expectedPrefixes += @('fight','run','rush') }
    }
    if ((@($entry.allowed_prefixes) -join ',') -cne ($expectedPrefixes -join ',')) { throw "Command prefixes changed: $($command.id)" }
}
foreach ($entry in $policy.commands) {
    if (!$seen.ContainsKey($entry.id)) { throw "Policy command missing from reference variant: $($entry.id)" }
}
$expectedHash = if($ReferenceVariant -eq 'shared-core'){$policy.reference_variants.shared_core.catalogues.$ReferenceLanguage}else{$policy.reference_catalogues.$ReferenceLanguage}
if (!$expectedHash -or (Get-FileHash -LiteralPath $InventoryPath).Hash -cne $expectedHash) { throw 'Reference catalogue hash mismatch; review and refresh the variant explicitly.' }
if ($PeerInventoryPath) {
    $peerLanguage = if ($ReferenceLanguage -eq 'en') { 'ja' } else { 'en' }
    $peerResult = & $PSCommandPath -InventoryPath $PeerInventoryPath -PolicyPath $PolicyPath -ReferenceLanguage $peerLanguage -ReferenceVariant $ReferenceVariant
    $peerInventory = Get-Content -LiteralPath $PeerInventoryPath -Raw -Encoding utf8 | ConvertFrom-Json
    $primaryKeys = @($inventory.commands | ForEach-Object {"$($_.id)|$($_.function)|$($_.flags)"} | Sort-Object)
    $peerKeys = @($peerInventory.commands | ForEach-Object {"$($_.id)|$($_.function)|$($_.flags)"} | Sort-Object)
    if (@(Compare-Object $primaryKeys $peerKeys -CaseSensitive).Count) { throw 'English/Japanese command definitions differ.' }
}
[pscustomobject]@{commands=$inventory.commands.Count;normal_api=@($inventory.commands | Where-Object {$known[$_.id].public_in_normal_mode}).Count;unclassified=0;reference_language=$ReferenceLanguage;reference_variant=$ReferenceVariant;reference_hash_checked=$true;peer_checked=[bool]$PeerInventoryPath;policy=(Resolve-Path -LiteralPath $PolicyPath).Path;runtime_tested=$false}
