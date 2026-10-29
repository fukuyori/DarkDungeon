"""R5 static protocol checks with synthetic envelopes only. No game is run.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import copy
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import fixture_protocol as protocol
from fixture_protocol import file_sha, validate_envelope, validate_rng

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'docs/data'


def main():
    spec = importlib.util.spec_from_file_location('fixtures', Path(__file__).with_name('build-fixture-plan.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    plan = module.load(DATA / 'rendering-fixture-plan.json')
    quality = module.load(DATA / 'rendering-quality-plan.json')
    layouts, provenance = module.read_layouts(Path(sys.argv[1]).resolve())
    module.require(plan['layouts'] == layouts and plan['source_provenance'] == provenance, 'Layout provenance changed')
    module.require(plan['quality_plan_sha256'] == file_sha(DATA / 'rendering-quality-plan.json'), 'R4 plan changed')
    module.validate_plan(plan, quality)
    checks = ['current R4 targets/criteria and both language layout provenances match']
    skipped = []

    def check(ok, message):
        if not ok:
            raise ValueError(message)
        checks.append(message)

    def rejected(callback, message, expected_reason):
        try:
            callback()
        except ValueError as error:
            if str(error) != expected_reason:
                raise ValueError(f'Wrong rejection for {message}: {error}') from error
            checks.append('negative fixture rejected: ' + message)
        else:
            raise ValueError('Invalid protocol accepted: ' + message)

    check(len(plan['coverage_obligations']) == 2287 and len(plan['scenario_families']) == 25, 'all quality targets and 25 scenario families are planned, not executed')
    check(plan['readiness']['runtime_ready'] is False and plan['readiness']['saved_fixtures_created'] == 0, 'no real save fixture or runtime readiness inferred')
    check(layouts['en']['rng'] == layouts['ja']['rng'] and layouts['en']['rng']['words'] == 256, 'both native probes identify ISAAC64 with 256-word arrays')
    check(len(plan['phase_obligations']['5-1']) == 74 and len(plan['phase_obligations']['5-4']) == 2287, 'early mount views and retained terrain stay in phase obligations')
    bad = copy.deepcopy(plan)
    bad['scenario_families'].pop('F07')
    rejected(lambda: module.validate_plan(bad, quality), 'undirected-spell family omitted', 'Missing scenario family')
    for branch in ('prompt-paused repaint during menu/direction/yn','core-suspended repaint during delay_output/More/tmp_at/dobuzz/explode','stopped-boundary timers/drag/hallucinated inventory without core resumption'):
        bad = copy.deepcopy(plan)
        bad['scenario_families']['F18']['mandatory_branches'].remove(branch)
        rejected(lambda: module.validate_plan(bad, quality), 'required F18 branch omitted: '+branch, 'Required stopped-boundary repaint branch missing')
    bad = copy.deepcopy(plan)
    bad['coverage_obligations'].pop()
    rejected(lambda: module.validate_plan(bad, quality), 'quality target missing', 'Coverage target missing or duplicated')
    bad = copy.deepcopy(plan)
    bad['appearance_requirements'].pop('I-08')
    rejected(lambda: module.validate_plan(bad, quality), 'appearance restore requirement omitted', 'R2 appearance requirement unmapped')
    bad = copy.deepcopy(plan)
    bad['rng_policy']['normal_save_restores_rng'] = True
    rejected(lambda: module.validate_plan(bad, quality), 'false promise of RNG continuation from normal save', 'Normal save RNG continuity falsely promised')
    bad = copy.deepcopy(plan)
    bad['rng_policy']['state_sidecar_use'] = 'import-before-each-input'
    rejected(lambda: module.validate_plan(bad, quality), 'state rewind hiding a divergence', 'State injection would hide replay divergence')
    bad = copy.deepcopy(plan)
    bad['save_matrix']['directions'].remove('candidate-to-previous')
    rejected(lambda: module.validate_plan(bad, quality), 'rollback save direction omitted', 'Save compatibility direction missing')
    bad = copy.deepcopy(plan)
    bad['save_matrix']['legacy_policy'] = 'migrate-existing-user-saves'
    rejected(lambda: module.validate_plan(bad, quality), 'old save migration reintroduced despite discard decision', 'Legacy save policy differs from user decision')
    bad = copy.deepcopy(plan)
    bad['run_report_contract']['required'].remove('seed_requests[]')
    rejected(lambda: module.validate_plan(bad, quality), 'run report seed trace requirement missing', 'Run report contract incomplete or changed')
    bad = copy.deepcopy(plan)
    bad['readiness']['runtime_ready'] = True
    rejected(lambda: module.validate_plan(bad, quality), 'static plan claims runtime readiness', 'Static plan cannot declare fixtures ready')
    bad = copy.deepcopy(plan)
    bad['rng_policy']['control_lifetime'] = 'startup only'
    rejected(lambda: module.validate_plan(bad, quality), 'clock/seed control ends before restore and play', 'Control lifetime incomplete')
    bad = copy.deepcopy(plan)
    bad['baseline_policy']['freeze_after_paint_rng_fix'] = False
    rejected(lambda: module.validate_plan(bad, quality), 'paint RNG bug accepted as conforming baseline', 'Known paint RNG bug cannot be a conforming baseline')
    artifact_root = (ROOT / 'artifacts').resolve()
    with tempfile.TemporaryDirectory(dir=artifact_root, prefix='r5-synthetic-envelope-') as temp:
        root = Path(temp).resolve()
        module.require(root.is_relative_to(artifact_root), 'Temporary root escaped artifacts')

        def write(relative, data):
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data if isinstance(data, bytes) else (json.dumps(data) + '\n').encode())
            return {'path': relative, 'sha256': file_sha(path)}

        files = []
        for role, relative, data in (
            ('save','data/検証用.save', b'SYNTHETIC ONLY: this is NOT a NetHack save'),
            ('settings-record','meta/settings.json', {'synthetic': True}),
            ('script','meta/script.json', {'synthetic': True, 'inputs': []}),
            ('core-observation','private/core.json', {'schema': 'darkdungeon-core-observation-v1',
                'case_id': 'synthetic-protocol', 'language': 'ja', 'build_id': 'synthetic-build',
                'producer_engine_sha256': 'a' * 64,
                'checkpoint_id': 'restored-input-0', 'checkpoint_phase': 'post-restore-ready',
                'barrier': {'input_ready': True, 'core_dispatch_pending': False, 'display_preparation_pending': False, 'modal': False},
                'boundary_kind': 'command-ready', 'port_function': 'qt_nh_poskey.command',
                'synthetic_only': True}),
        ):
            files.append({'role': role, **write(relative, data)})
        roles = {f['role']: f for f in files}
        core = module.load(root / roles['core-observation']['path'])
        core['save_file_sha256'] = roles['save']['sha256']
        core_entry = write(roles['core-observation']['path'], core)
        files[3] = roles['core-observation'] = {'role':'core-observation', **core_entry}
        producer_hash = 'a' * 64
        binding = {'case_id': 'synthetic-protocol', 'producer_engine_sha256': producer_hash,
                   'language': 'ja', 'build_id': 'synthetic-build', 'checkpoint_id': 'restored-input-0', 'checkpoint_phase': 'post-restore-ready',
                   'core_file_sha256': roles['core-observation']['sha256'], 'save_file_sha256': roles['save']['sha256']}
        context = {'n': 256, 'r': ['0' * 16] * 256, 'm': ['0' * 16] * 256, 'a': '0' * 16, 'b': '0' * 16, 'c': '0' * 16}
        snapshot = {'schema': 'darkdungeon-rng-observation-v1', 'algorithm': 'ISAAC64', 'words': 256,
                    'use': 'read-only', 'binding': binding, 'streams': {'core': copy.deepcopy(context), 'display': copy.deepcopy(context)},
                    'seed_context': {'provider': 'controlled-strong', 'has_strong_rngseed': True,
                                     'init_counts': {'core': 1, 'display': 1}, 'reseed_attempt_counts': {'core': 0, 'display': 0}, 'seed_request_index': 2}}
        files.append({'role': 'rng-observation', **write('private/rng.json', snapshot)})
        envelope = {'schema': 'darkdungeon-fixture-envelope-v1', 'case_id': 'synthetic-protocol', 'language': 'ja',
                    'case_kind': 'ordinary-core', 'origin': 'saved-state', 'checkpoint_phase': 'post-restore-ready',
                    'checkpoint_id': 'restored-input-0',
                    'rng_policy': 'observe-only', 'families': ['F18','F19','F20'],
                    'producer': {'build_id': 'synthetic-build', 'engine_sha256': producer_hash}, 'files': files}
        result = validate_envelope(envelope, root, plan['scenario_families'])
        check(result['envelope_integrity_valid'] and not result['runtime_ready'] and not result['normal_save_decoded'], 'Unicode-path synthetic envelope verifies integrity without pretending its dummy save is a game save')
        for relative, reason in (('../outside.save','Non-canonical/traversing path'),('C:/outside.save','Unsafe file path'),('data/./検証用.save','Non-canonical/traversing path'),('data\\検証用.save','Unsafe file path')):
            bad = copy.deepcopy(envelope)
            bad['files'][0]['path'] = relative
            rejected(lambda: validate_envelope(bad, root, plan['scenario_families']), 'unsafe path ' + relative, reason)
        bad = copy.deepcopy(envelope)
        bad['files'].append(copy.deepcopy(bad['files'][0]))
        rejected(lambda: validate_envelope(bad, root, plan['scenario_families']), 'duplicate file/alias', 'Duplicate file path/alias')
        bad = copy.deepcopy(envelope)
        bad['files'][0]['sha256'] = 'b' * 64
        rejected(lambda: validate_envelope(bad, root, plan['scenario_families']), 'stale save hash', 'Fixture file hash mismatch')
        bad = copy.deepcopy(envelope)
        bad['runtime_ready'] = True
        rejected(lambda: validate_envelope(bad, root, plan['scenario_families']), 'self-certified runtime pass', 'Envelope cannot certify game execution')
        bad = copy.deepcopy(envelope)
        bad['case_kind'] = 'renderer-support'
        bad['origin'] = 'renderer-input'
        bad['checkpoint_phase'] = 'renderer-input'
        rejected(lambda: validate_envelope(bad, root, plan['scenario_families']), 'renderer support used as save/replay evidence', 'Renderer support cannot stand in for gameplay/replay/save cases')
        bad = copy.deepcopy(snapshot)
        bad['streams'].pop('display')
        rejected(lambda: validate_rng(bad, binding), 'display RNG stream missing', 'Both RNG streams required')
        bad = copy.deepcopy(snapshot)
        bad['streams']['core']['r'][0] = 18446744073709551615
        rejected(lambda: validate_rng(bad, binding), 'unsafe JSON number instead of exact 64-bit word', 'RNG words must be exact 64-bit hex strings')
        bad = copy.deepcopy(snapshot)
        bad['streams']['display']['n'] = 257
        rejected(lambda: validate_rng(bad, binding), 'out-of-range RNG cursor', 'Invalid RNG cursor')
        bad = copy.deepcopy(snapshot)
        bad['binding']['save_file_sha256'] = 'b' * 64
        rejected(lambda: validate_rng(bad, binding), 'RNG observation bound to another save', 'RNG observation belongs to a different case/save/core/build')
        bad = copy.deepcopy(snapshot)
        bad['restore'] = True
        rejected(lambda: validate_rng(bad, binding), 'RNG import command in read-only observation', 'Unknown/missing RNG observation field')
        for field, other in (('language','en'),('build_id','other-build'),('checkpoint_id','other-checkpoint'),('checkpoint_phase','post-setup-ready')):
            bad = copy.deepcopy(snapshot)
            bad['binding'][field] = other
            rejected(lambda: validate_rng(bad, binding), 'RNG observation mismatched ' + field, 'RNG observation belongs to a different case/save/core/build')
        bad = copy.deepcopy(snapshot)
        bad['seed_context']['init_counts'] = None
        rejected(lambda: validate_rng(bad, binding), 'malformed seed counter object', 'Both-stream seed counters required')
        native_rng = copy.deepcopy(snapshot)
        native_rng['seed_context']['provider'] = 'os-native'
        native_entry = write('private/native-rng.json', native_rng)
        bad = copy.deepcopy(envelope)
        bad['files'][-1] = {'role': 'rng-observation', **native_entry}
        rejected(lambda: validate_envelope(bad, root, plan['scenario_families']), 'uncontrolled os-native repaint/replay checkpoint', 'Automated repaint/replay needs process-lifetime seed/clock control, not os-native')
        bad = copy.deepcopy(envelope)
        bad['checkpoint_phase'] = 'post-setup-ready'
        rejected(lambda: validate_envelope(bad, root, plan['scenario_families']), 'saved-state marked as fresh setup', 'Origin/checkpoint phase mismatch')
        bad = copy.deepcopy(snapshot)
        bad['seed_context']['provider'] = 'controlled-weak'
        rejected(lambda: validate_rng(bad, binding), 'all-weak profile has strong-seed flag', 'Controlled full-process provider disagrees with observed strong-seed flag')
        for field, other in (('language','en'),('checkpoint_id','other-checkpoint')):
            core = module.load(root / roles['core-observation']['path'])
            core[field] = other
            core_entry = write('private/mismatched-core.json', core)
            bad = copy.deepcopy(envelope)
            bad['files'][3] = {'role': 'core-observation', **core_entry}
            rejected(lambda: validate_envelope(bad, root, plan['scenario_families']), 'core observation mismatched ' + field, 'Core observation metadata belongs to a different checkpoint')
        core_only = copy.deepcopy(envelope)
        core_only['families'] = ['F20']
        core_only['files'] = [entry for entry in core_only['files'] if entry['role'] != 'rng-observation']
        check(validate_envelope(core_only, root, plan['scenario_families'])['envelope_integrity_valid'], 'core observation is checked without requiring an RNG observation')
        for field, other, reason in (
            ('schema','unknown','Unknown core projection schema'),
            ('producer_engine_sha256','b' * 64,'Core observation metadata belongs to a different checkpoint'),
            ('language','en','Core observation metadata belongs to a different checkpoint'),
            ('case_id','another-case','Core observation metadata belongs to a different checkpoint'),
            ('build_id','another-build','Core observation metadata belongs to a different checkpoint'),
            ('checkpoint_phase','post-setup-ready','Core observation metadata belongs to a different checkpoint'),
            ('save_file_sha256','b' * 64,'Core observation metadata belongs to a different checkpoint'),
            ('barrier',{},'Observation is not at a stable input/display boundary'),
            ('boundary_kind','prompt-paused','Core observation is not at a command-ready stop point'),
            ('port_function','qt_yn_function.yn','Core observation is not at a command-ready stop point'),
            ('port_function',None,'Core observation is not at a command-ready stop point'),
            ('port_function',['qt_nh_poskey.command'],'Core observation is not at a command-ready stop point'),
        ):
            core = module.load(root / roles['core-observation']['path'])
            core[field] = other
            core_entry = write('private/mismatched-core-only.json', core)
            bad = copy.deepcopy(core_only)
            bad['files'][3] = {'role': 'core-observation', **core_entry}
            rejected(lambda: validate_envelope(bad, root, plan['scenario_families']), 'core without RNG: ' + field + '=' + repr(other), reason)
        core_missing = module.load(root / roles['core-observation']['path']); core_missing.pop('boundary_kind')
        bad = copy.deepcopy(core_only); bad['files'][3] = {'role': 'core-observation', **write('private/core-without-kind.json', core_missing)}
        rejected(lambda: validate_envelope(bad, root, plan['scenario_families']), 'core without a boundary kind', 'Core observation is not at a command-ready stop point')
        preflight = copy.deepcopy(core_only); preflight.update(case_kind='negative-core', checkpoint_phase='preflight-rejection', families=['F00'])
        rejected(lambda: validate_envelope(preflight, root, plan['scenario_families']), 'preflight rejection with a core observation', 'Preflight rejection and renderer input carry no core or RNG observation')
        renderer = copy.deepcopy(core_only); renderer.update(case_kind='renderer-support', origin='renderer-input', checkpoint_phase='renderer-input', families=['F22'])
        renderer['files'].append({'role': 'renderer-input', **write('meta/renderer-input.json', {'synthetic': True})})
        rejected(lambda: validate_envelope(renderer, root, plan['scenario_families']), 'renderer input with a core observation', 'Preflight rejection and renderer input carry no core or RNG observation')
        rejected(lambda: protocol.command_ready_ports({'schema': 'unknown', 'ports': []}), 'unknown boundary allow table', 'Unknown boundary allow table schema')
        rejected(lambda: protocol.command_ready_ports({'schema': 'darkdungeon-boundary-ports-v1'}), 'boundary allow table without ports', 'Unknown boundary allow table schema')
        saved_ports = protocol.BOUNDARY_PORTS
        try:
            protocol.BOUNDARY_PORTS = root / 'missing-boundary-ports.json'
            rejected(lambda: protocol.command_ready_ports(), 'missing boundary allow table', 'Boundary allow table missing')
            broken = root / 'broken-boundary-ports.json'; broken.write_text('{not json', encoding='utf-8')
            protocol.BOUNDARY_PORTS = broken
            rejected(lambda: protocol.command_ready_ports(), 'broken boundary allow table', 'Boundary allow table is not valid JSON')
        finally:
            protocol.BOUNDARY_PORTS = saved_ports
        linked = root / 'linked.save'
        os.link(root / 'data/検証用.save', linked)
        rejected(lambda: validate_envelope(envelope, root, plan['scenario_families']), 'hard-linked mutable save source', 'Hard-linked fixture file forbidden')
        linked.unlink()
        target = root / 'data'
        junction = root / 'junction'
        if os.name == 'nt':
            # Both operands are fixed children of this verified temporary root.
            # cmd builtins do not understand list2cmdline's backslash-escaped quotes.
            command = f'"{os.environ["COMSPEC"]}" /d /c mklink /J "{junction}" "{target}"'
            result = subprocess.run(command, capture_output=True)
            module.require(result.returncode == 0, 'Could not create synthetic junction test: ' + (result.stdout + result.stderr).decode('mbcs', errors='replace'))
            try:
                bad = copy.deepcopy(envelope)
                bad['files'][0]['path'] = 'junction/検証用.save'
                rejected(lambda: validate_envelope(bad, root, plan['scenario_families']), 'real directory junction inside fixture root', 'Linked/reparse path forbidden')
            finally:
                junction.rmdir()  # Remove only the junction, never its target.
        else:
            skipped.append('Windows directory junction: not Windows')
        symlink = root / 'symlink.save'
        try:
            symlink.symlink_to(root / 'data/検証用.save')
        except OSError as error:
            skipped.append('real symbolic link: ' + type(error).__name__ + ' winerror=' + str(getattr(error, 'winerror', None)))
        else:
            try:
                bad = copy.deepcopy(envelope)
                bad['files'][0]['path'] = 'symlink.save'
                rejected(lambda: validate_envelope(bad, root, plan['scenario_families']), 'real symbolic link inside fixture root', 'Linked/reparse path forbidden')
            finally:
                symlink.unlink()
    print(json.dumps({'mode': 'static-protocol-verification', 'created_utc': datetime.now(timezone.utc).isoformat(), 'plan_sha256': file_sha(DATA / 'rendering-fixture-plan.json'), 'boundary_ports_sha256': file_sha(DATA / 'rendering-boundary-ports.json'),
                      'tool_sha256': {p.name: file_sha(p) for p in (Path(__file__), Path(__file__).with_name('fixture_protocol.py'), Path(__file__).with_name('build-fixture-plan.py'), Path(__file__).with_name('Export-Layout.ps1'), Path(__file__).with_name('audit-layout.c'))},
                      'checks_passed': len(checks), 'checks': checks, 'synthetic_envelopes_only': True,
                      'checks_skipped': skipped,
                      'game_executed': False, 'normal_save_restored': False, 'runtime_ready': False}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
