"""Read-only R5 envelope/RNG format checks; never parses/restores a game save.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import hashlib
import json
from pathlib import Path
import re
import stat

SHA = re.compile(r'[0-9a-f]{64}\Z')
WORD = re.compile(r'[0-9a-f]{16}\Z')
IDENT = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,127}\Z')


def require(ok, reason):
    if not ok:
        raise ValueError(reason)


def is_sha(value):
    return isinstance(value, str) and SHA.fullmatch(value) is not None


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_file(root, relative):
    require(isinstance(relative, str) and relative and not relative.startswith('/'), 'File path must be relative')
    require(not any(c in relative for c in '\\:\x00<>|"?*') and not any(ord(c) < 32 for c in relative), 'Unsafe file path')
    parts = relative.split('/')
    require(all(p and p not in ('.','..') and p == p.rstrip(' .') for p in parts), 'Non-canonical/traversing path')
    require(not root.is_symlink() and not (getattr(root.lstat(), 'st_file_attributes', 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT), 'Linked fixture root forbidden')
    root = root.resolve(strict=True)
    current = root
    for part in parts:
        current = current / part
        require(current.exists() or current.is_symlink(), 'Fixture path missing')
        require(not current.is_symlink() and not (getattr(current.lstat(), 'st_file_attributes', 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT), 'Linked/reparse path forbidden')
    require(current.is_file(), 'Fixture file missing')
    resolved = current.resolve(strict=True)
    require(resolved.is_relative_to(root), 'Path escaped fixture root')
    require(resolved.stat().st_nlink == 1, 'Hard-linked fixture file forbidden')
    return resolved


def validate_rng(snapshot, binding):
    require(isinstance(snapshot, dict), 'RNG observation must be an object')
    require(set(snapshot) == {'schema','algorithm','words','use','binding','streams','seed_context'}, 'Unknown/missing RNG observation field')
    require(snapshot.get('schema') == 'darkdungeon-rng-observation-v1', 'Unknown RNG observation schema')
    require(snapshot.get('algorithm') == 'ISAAC64' and snapshot.get('words') == 256, 'Unsupported RNG algorithm/layout')
    require(snapshot.get('use') == 'read-only' and 'restore' not in snapshot, 'RNG import/rewind is not a reproduction observation')
    require(snapshot.get('binding') == binding, 'RNG observation belongs to a different case/save/core/build')
    context = snapshot['seed_context']
    require(isinstance(context, dict), 'Seed context must be an object')
    require(set(context) == {'provider','has_strong_rngseed','init_counts','reseed_attempt_counts','seed_request_index'}, 'Seed/reseed context incomplete')
    require(context['provider'] in ('os-native','controlled-strong','controlled-weak') and type(context['has_strong_rngseed']) is bool, 'Seed provider semantics missing')
    if context['provider'] != 'os-native':
        require(context['has_strong_rngseed'] == (context['provider'] == 'controlled-strong'), 'Controlled full-process provider disagrees with observed strong-seed flag')
    require(type(context['seed_request_index']) is int and context['seed_request_index'] >= 0, 'Invalid seed request cursor')
    for name in ('init_counts','reseed_attempt_counts'):
        require(isinstance(context[name], dict) and set(context[name]) == {'core','display'} and all(type(v) is int and v >= 0 for v in context[name].values()), 'Both-stream seed counters required')
    streams = snapshot.get('streams', {})
    require(isinstance(streams, dict), 'RNG streams must be objects')
    require(set(streams) == {'core','display'}, 'Both RNG streams required')
    for value in streams.values():
        require(isinstance(value, dict), 'RNG state must be an object')
        require(set(value) == {'n','r','m','a','b','c'}, 'Incomplete RNG context')
        require(type(value['n']) is int and 0 <= value['n'] <= 256, 'Invalid RNG cursor')
        for field in ('r','m'):
            require(isinstance(value[field], list) and len(value[field]) == 256, 'Incomplete RNG array')
            require(all(isinstance(v, str) and WORD.fullmatch(v) for v in value[field]), 'RNG words must be exact 64-bit hex strings')
        require(all(isinstance(value[f], str) and WORD.fullmatch(value[f]) for f in ('a','b','c')), 'Invalid RNG accumulator')


def validate_core(observation, binding):
    require(isinstance(observation, dict) and observation.get('schema') == 'darkdungeon-core-observation-v1', 'Unknown core projection schema')
    require(all(observation.get(k) == binding[k] for k in ('case_id','language','build_id','producer_engine_sha256','save_file_sha256','checkpoint_id','checkpoint_phase')), 'Core observation metadata belongs to a different checkpoint')
    require(observation.get('barrier') == {'input_ready': True, 'core_dispatch_pending': False, 'display_preparation_pending': False, 'modal': False}, 'Observation is not at a stable input/display boundary')


def validate_envelope(envelope, root, families):
    require(isinstance(envelope, dict), 'Fixture envelope must be an object')
    require(envelope.get('schema') == 'darkdungeon-fixture-envelope-v1', 'Unknown fixture envelope schema')
    require(isinstance(envelope.get('case_id'), str) and IDENT.fullmatch(envelope['case_id']), 'Invalid case ID')
    require(envelope.get('language') in ('en','ja'), 'Native language must be explicit')
    require(envelope.get('case_kind') in ('ordinary-core','assisted-core','renderer-support','negative-core'), 'Invalid reachability class')
    require(envelope.get('origin') in ('fresh-recipe','saved-state','renderer-input'), 'Unknown checkpoint origin')
    require(envelope.get('rng_policy') == 'observe-only', 'RNG injection is forbidden')
    require(envelope.get('checkpoint_phase') in ('post-setup-ready','post-restore-ready','renderer-input','preflight-rejection'), 'Checkpoint boundary must be named')
    require(isinstance(envelope.get('checkpoint_id'), str) and IDENT.fullmatch(envelope['checkpoint_id']), 'Checkpoint ID must be named')
    if envelope['checkpoint_phase'] == 'preflight-rejection':
        require(envelope['case_kind'] == 'negative-core', 'Preflight rejection is not a successful core checkpoint')
    else:
        require(envelope['checkpoint_phase'] == {'fresh-recipe':'post-setup-ready','saved-state':'post-restore-ready','renderer-input':'renderer-input'}[envelope['origin']], 'Origin/checkpoint phase mismatch')
    require('runtime_ready' not in envelope and 'pass' not in envelope, 'Envelope cannot certify game execution')
    selected = envelope.get('families', [])
    require(isinstance(selected, list) and all(isinstance(f, str) for f in selected), 'Scenario families must be a string list')
    require(selected and len(selected) == len(set(selected)) and set(selected) <= set(families), 'Missing/unknown case family')
    producer = envelope.get('producer', {})
    require(isinstance(producer, dict), 'Producer must be an object')
    require(isinstance(producer.get('build_id'), str) and IDENT.fullmatch(producer['build_id']), 'Missing producer build')
    require(is_sha(producer.get('engine_sha256')), 'Missing producer executable hash')
    entries = envelope.get('files', [])
    require(isinstance(entries, list) and entries, 'Fixture has no file list')
    paths, resolved_files, by_role = set(), set(), {}
    allowed_roles = {'save','profile-aux','settings-record','script','core-observation','rng-observation','truth','renderer-input','evidence'}
    for entry in entries:
        require(isinstance(entry, dict), 'File entry must be an object')
        require(entry.get('role') in allowed_roles and is_sha(entry.get('sha256')), 'Unknown file role or missing hash')
        path = checked_file(root, entry.get('path'))
        relative = entry['path'].casefold()
        require(relative not in paths and path not in resolved_files, 'Duplicate file path/alias')
        paths.add(relative)
        resolved_files.add(path)
        require(file_sha(path) == entry['sha256'], 'Fixture file hash mismatch')
        by_role.setdefault(entry['role'], []).append((entry, path))
    if envelope['case_kind'] == 'renderer-support':
        require(envelope['origin'] == 'renderer-input' and set(selected) == {'F22'}, 'Renderer support cannot stand in for gameplay/replay/save cases')
        require('renderer-input' in by_role, 'Renderer-support input missing')
    else:
        require(envelope['origin'] != 'renderer-input', 'Core case needs a core recipe/save')
        require('script' in by_role and 'settings-record' in by_role, 'Replay script/settings missing')
    if envelope['origin'] == 'saved-state':
        require(len(by_role.get('save', [])) == 1, 'Saved-state case needs one bound source save')
    if {'F18','F19'} & set(selected):
        require(envelope['checkpoint_phase'] in ('post-setup-ready','post-restore-ready'), 'Replay/repaint requires a stable core checkpoint')
        require(len(by_role.get('core-observation', [])) == 1 and len(by_role.get('rng-observation', [])) == 1, 'RNG invariance/replay needs core and both-stream observations')
    if 'core-observation' in by_role:
        require(len(by_role['core-observation']) == 1, 'Ambiguous core observation')
        binding = {
            'case_id': envelope['case_id'], 'producer_engine_sha256': producer['engine_sha256'],
            'language': envelope['language'], 'build_id': producer['build_id'],
            'checkpoint_id': envelope['checkpoint_id'], 'checkpoint_phase': envelope['checkpoint_phase'],
            'core_file_sha256': by_role['core-observation'][0][0]['sha256'],
            'save_file_sha256': by_role['save'][0][0]['sha256'] if 'save' in by_role else None,
        }
        observation = json.loads(by_role['core-observation'][0][1].read_text(encoding='utf-8-sig'))
        validate_core(observation, binding)
    if 'rng-observation' in by_role:
        require(len(by_role['rng-observation']) == 1 and len(by_role.get('core-observation', [])) == 1, 'Ambiguous RNG/core observation')
        rng = json.loads(by_role['rng-observation'][0][1].read_text(encoding='utf-8-sig'))
        validate_rng(rng, binding)
        if {'F18','F19'} & set(selected):
            require(rng['seed_context']['provider'] in ('controlled-strong','controlled-weak'), 'Automated repaint/replay needs process-lifetime seed/clock control, not os-native')
    return {'envelope_integrity_valid': True, 'normal_save_decoded': False, 'game_executed': False,
            'engine_file_hashed': False, 'core_state_completeness_verified': False,
            'runtime_ready': False, 'scope': 'file paths/hashes and RNG observation format only'}
