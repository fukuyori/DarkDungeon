"""Synthetic #106 checks: stop-point allow table, barriers and the link between
an R5 envelope and run observation 0. Never runs or reads a game."""
import copy
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import tempfile

from boundary import (BARRIERS, OUTPUT, ROOT, definition, file_sha, load_definition, port_table, require, sha,
                      validate_point, validate_run_origin)
sys.path.insert(0, str(ROOT/'tools/rendering-fixtures'))
from fixture_protocol import validate_envelope  # noqa: E402


def main():
    checks = []
    def check(condition, name):
        require(condition, name)
        checks.append(name)
    def rejected(callback, expected, name):
        try: callback()
        except ValueError as error:
            require(str(error) == expected, 'Wrong rejection reason: '+name+': '+str(error))
            checks.append('rejected: '+name)
        else: raise ValueError('Invalid synthetic fixture accepted: '+name)

    value = load_definition()
    check(value == definition(), 'allow table matches the generated English and Japanese sources')
    ports = port_table(value)
    check(value['languages']['en']['delay_sites'] == value['languages']['ja']['delay_sites'], 'English and Japanese delay sites are audited separately and agree')
    branches = {p['f18_branch'] for p in value['ports'] if p['f18_branch']}
    check({'menu', 'direction', 'yn', 'delay_output', '--More--', 'tmp_at', 'dobuzz', 'explode'} <= branches, 'every F18 stop branch has an allowed stop point')
    check(all(p['boundary_kind'] == 'command-ready' for p in value['ports'] if p['barrier'] == 'command-ready'), 'only command-ready points use the R5 envelope barrier')
    check(not value['readiness']['runtime_ready'] and not value['readiness']['c_observer_implemented'], 'no C observer or runtime readiness is claimed')
    bad = copy.deepcopy(value); bad['ports'].pop()
    check(bad != definition(), 'a removed stop point is detected against the generated sources')

    for port_id, port in ports.items():
        validate_point(port['boundary_kind'], port_id, BARRIERS[port['barrier']], value)
    check(True, 'all %d allowed stop points accept their own barrier' % len(ports))
    rejected(lambda: validate_point('command-ready', 'qt_nhgetch', None, value), 'Unknown window-port stop point', 'unqualified window procedure')
    rejected(lambda: validate_point('command-ready', 'qt_yn_function.getdir', None, value), 'Window-port stop point is not allowed for this boundary kind', 'direction prompt as command-ready')
    rejected(lambda: validate_point('prompt-paused', 'qt_display_nhwindow.more', None, value), 'Window-port stop point is not allowed for this boundary kind', '--More-- as a prompt')
    rejected(lambda: validate_point('core-suspended', 'qt_delay_output.tmp_at', BARRIERS['command-ready'], value), 'Barrier does not match the stop point', 'suspended point claims the command-ready barrier')
    rejected(lambda: validate_point('command-ready', 'qt_nh_poskey.command', BARRIERS['prompt-answer'], value), 'Barrier does not match the stop point', 'command-ready point with a pending core dispatch')
    rejected(lambda: validate_point('command-ready', 'qt_nh_poskey.command', {'input_ready': True}, value), 'Invalid barrier shape', 'incomplete barrier')
    rejected(lambda: validate_point('command-ready', 'qt_nh_poskey.command', dict(BARRIERS['command-ready'], modal=0), value), 'Invalid barrier shape', 'integer instead of boolean barrier')
    rejected(lambda: validate_point('command-ready', 'qt_timer_fire.idlecheckpoint', None, value), 'Unknown window-port stop point', 'idle checkpoint timer as a boundary')

    artifact_root = (ROOT/'artifacts').resolve()
    plan = json.loads((ROOT/'docs/data/rendering-fixture-plan.json').read_text(encoding='utf-8-sig'))
    with tempfile.TemporaryDirectory(dir=artifact_root, prefix='r6-synthetic-run-') as temp:
        root = Path(temp).resolve()
        def write(relative, data):
            path = root/relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes((json.dumps(data, ensure_ascii=False)+'\n').encode() if not isinstance(data, bytes) else data)
            return {'path': relative, 'sha256': file_sha(path)}
        base ={'case_id': 'synthetic-run', 'language': 'ja', 'build_id': 'synthetic-build', 'producer_engine_sha256': 'a'*64, 'save_file_sha256': None}
        context = {'n': 256, 'r': ['0'*16]*256, 'm': ['0'*16]*256, 'a': '0'*16, 'b': '0'*16, 'c': '0'*16}
        def observation_files(name, kind, port, checkpoint, phase, seed=2, barrier=None, core_extra=None, rng_binding=None, core_word=None):
            binding = dict(base, checkpoint_id=checkpoint, checkpoint_phase=phase)
            core = dict(binding, schema='darkdungeon-core-observation-v1', boundary_kind=kind, port_function=port,
                        barrier=barrier or BARRIERS[port_table(value)[port]['barrier']], synthetic_only=True, **(core_extra or {}))
            core_entry = write('run/core-%s.json' % name, core)
            rng = {'schema': 'darkdungeon-rng-observation-v1', 'algorithm': 'ISAAC64', 'words': 256, 'use': 'read-only',
                   'binding': rng_binding or dict(binding, core_file_sha256=core_entry['sha256']),
                   'streams': {'core': copy.deepcopy(context), 'display': copy.deepcopy(context)},
                   'seed_context': {'provider': 'controlled-strong', 'has_strong_rngseed': True, 'init_counts': {'core': 1, 'display': 1},
                                    'reseed_attempt_counts': {'core': 0, 'display': 0}, 'seed_request_index': seed}}
            if core_word:
                rng['streams']['core']['a'] = core_word
            return core_entry, write('run/rng-%s.json' % name, rng)
        origin_core, origin_rng = observation_files('0', 'command-ready', 'qt_nh_poskey.command', 'fresh-input-0', 'post-setup-ready')
        files = [{'role': 'settings-record', **write('meta/settings.json', {'synthetic': True})},
                 {'role': 'script', **write('meta/script.json', {'synthetic': True, 'inputs': []})},
                 {'role': 'core-observation', **origin_core}, {'role': 'rng-observation', **origin_rng}]
        envelope = {'schema': 'darkdungeon-fixture-envelope-v1', 'case_id': 'synthetic-run', 'language': 'ja', 'case_kind': 'ordinary-core',
                    'origin': 'fresh-recipe', 'checkpoint_phase': 'post-setup-ready', 'checkpoint_id': 'fresh-input-0', 'rng_policy': 'observe-only',
                    'families': ['F18', 'F19'], 'producer': {'build_id': 'synthetic-build', 'engine_sha256': 'a'*64}, 'files': files}
        envelope_entry = write('envelope.json', envelope)
        families = plan['scenario_families']
        check(validate_envelope(envelope, root, families)['envelope_integrity_valid'], 'synthetic R5 envelope is valid at its command-ready origin')

        def point(ordinal, kind, port, input_ordinal, checkpoint, phase, seed=2, clock=0, files_pair=None):
            core, rng = files_pair or observation_files('%d-%s-%s' % (ordinal, port, checkpoint), kind, port, checkpoint, phase, seed)
            return {'ordinal': ordinal, 'checkpoint_id': checkpoint, 'checkpoint_phase': phase, 'boundary_kind': kind, 'port_function': port,
                    'input_ordinal': input_ordinal, 'core_file': core, 'rng_file': rng, 'field_map_sha256': 'f'*64,
                    'normalization_registry_sha256': 'e'*64, 'seed_request_cursor': seed, 'clock_read_cursor': clock}
        run = {'schema': 'darkdungeon-fixture-run-v1', 'case_id': 'synthetic-run', 'language': 'ja',
               'origin_envelope_sha256': envelope_entry['sha256'],
               'observations': [point(0, 'command-ready', 'qt_nh_poskey.command', 0, 'fresh-input-0', 'post-setup-ready', files_pair=(origin_core, origin_rng)),
                                point(1, 'prompt-paused', 'qt_nh_poskey.count', 1, 'count-1', 'prompt'),
                                point(2, 'prompt-paused', 'qt_yn_function.getdir', 2, 'direction-2', 'prompt'),
                                point(3, 'core-suspended', 'qt_delay_output.tmp_at', 3, 'tmp-at-3', 'suspended', seed=3, clock=1),
                                point(4, 'core-suspended', 'qt_display_nhwindow.more', 3, 'more-3', 'suspended', seed=3, clock=1),
                                point(5, 'prompt-paused', 'qt_display_nhwindow.map', 4, 'map-4', 'prompt', seed=3, clock=1),
                                point(6, 'command-ready', 'qt_nh_poskey.command', 5, 'ready-5', 'ready', seed=3, clock=2),
                                point(7, 'prompt-paused', 'qt_nh_poskey.count', 7, 'getobj-count-7', 'prompt', seed=3, clock=2),
                                point(8, 'command-ready', 'qt_nh_poskey.command', 9, 'ready-9', 'ready', seed=3, clock=2)]}
        # The other run-report fields must exist; this checker does not validate them.
        run.update({k: None for k in ('run_id', 'producer', 'reader', 'control', 'inputs', 'seed_requests', 'reseed_attempts',
                                      'clock_reads', 'save_result', 'verdict', 'evidence_files')})
        def verify(candidate, envelope_path='envelope.json'):
            return validate_run_origin(envelope_path, candidate, root, families, value)
        result = verify(run)
        check(result['run_origin_valid'] and result['envelope_sha256'] == envelope_entry['sha256'], 'run starts at the envelope checkpoint and keeps every stop point legal and bound')
        check(True, 'repeated count input, direction, delay, --More-- and map viewing points are accepted with their own barriers, not the R5 envelope barrier')

        def mutated(change):
            candidate = copy.deepcopy(run); change(candidate); return candidate
        prompt0 = point(0, 'prompt-paused', 'qt_yn_function.yn', 0, 'fresh-input-0', 'post-setup-ready')
        moved0 = point(0, 'command-ready', 'qt_nh_poskey.command', 0, 'other', 'post-setup-ready')
        other0 = point(0, 'command-ready', 'qt_nh_poskey.command', 0, 'fresh-input-0', 'post-setup-ready',
                       files_pair=observation_files('other-origin', 'command-ready', 'qt_nh_poskey.command', 'fresh-input-0', 'post-setup-ready', core_extra={'note': 'another observation'}))
        other_rng = observation_files('other-rng', 'command-ready', 'qt_nh_poskey.command', 'fresh-input-0', 'post-setup-ready',
                                      rng_binding=dict(base, checkpoint_id='fresh-input-0', checkpoint_phase='post-setup-ready', core_file_sha256=origin_core['sha256']), core_word='0'*15+'1')[1]
        count_as_command = observation_files('count-command', 'command-ready', 'qt_nh_poskey.count', 'count-1', 'prompt', barrier=BARRIERS['command-ready'])
        other_build = observation_files('other-build', 'prompt-paused', 'qt_nh_poskey.count', 'count-1', 'prompt', core_extra={'build_id': 'other-build'})
        rng_other_core = observation_files('rng-other-core', 'prompt-paused', 'qt_nh_poskey.count', 'count-1', 'prompt',
                                           rng_binding=dict(base, checkpoint_id='count-1', checkpoint_phase='prompt', core_file_sha256='c'*64))
        for name, change, expected in (
            ('origin is a prompt', lambda r: r['observations'].__setitem__(0, prompt0), 'Run observation 0 must be the command-ready origin before any input'),
            ('origin after an input', lambda r: r['observations'][0].update(input_ordinal=1), 'Run observation 0 must be the command-ready origin before any input'),
            ('origin at another checkpoint', lambda r: r['observations'].__setitem__(0, moved0), 'Run observation 0 is not the envelope checkpoint'),
            ('origin from another core file', lambda r: r['observations'].__setitem__(0, other0), 'Run observation 0 core file is not the envelope core observation'),
            ('origin from another RNG file', lambda r: r['observations'][0].update(rng_file=other_rng), 'Run observation 0 RNG file is not the envelope RNG observation'),
            ('seed cursor differs from the RNG file', lambda r: r['observations'][2].update(seed_request_cursor=3), 'Run RNG seed cursor differs from the observation'),
            ('ordinal gap', lambda r: r['observations'][2].update(ordinal=5), 'Run observations must be numbered 0, 1, 2, ...'),
            ('boolean ordinal', lambda r: r['observations'][1].update(ordinal=True), 'Run observations must be numbered 0, 1, 2, ...'),
            ('input ordinal goes back', lambda r: r['observations'][6].update(input_ordinal=1), 'Run input/seed/clock cursors must not go back'),
            ('clock cursor goes back', lambda r: r['observations'][6].update(clock_read_cursor=0), 'Run input/seed/clock cursors must not go back'),
            ('second point before input', lambda r: r['observations'][1].update(input_ordinal=0), 'Only run observation 0 may precede the first input'),
            ('run kind differs from its core file', lambda r: r['observations'][2].update(port_function='qt_yn_function.yn'), 'Core file boundary differs from the run observation'),
            ('count input reported as command-ready', lambda r: r['observations'][1].update(boundary_kind='command-ready', core_file=count_as_command[0], rng_file=count_as_command[1]),
             'Window-port stop point is not allowed for this boundary kind'),
            ('core observation from another build', lambda r: r['observations'][1].update(core_file=other_build[0], rng_file=other_build[1]), 'Run core observation belongs to a different case/build/checkpoint'),
            ('checkpoint differs from the core file', lambda r: r['observations'][2].update(checkpoint_id='elsewhere'), 'Run core observation belongs to a different case/build/checkpoint'),
            ('RNG bound to another core file', lambda r: r['observations'][1].update(core_file=rng_other_core[0], rng_file=rng_other_core[1]), 'RNG observation belongs to a different case/save/core/build'),
            ('placeholder RNG file', lambda r: r['observations'][3].update(rng_file=write('run/rng-placeholder.json', {'synthetic_only': True})), 'Unknown/missing RNG observation field'),
            ('missing field map', lambda r: r['observations'][2].update(field_map_sha256=None), 'Run observation field map/registry missing'),
            ('stale run file hash', lambda r: r['observations'][3]['core_file'].update(sha256='b'*64), 'Run observation file hash mismatch'),
            ('traversing run file', lambda r: r['observations'][3]['core_file'].update(path='../core.json'), 'Non-canonical/traversing path'),
            ('different case', lambda r: r.update(case_id='other'), 'Run case/language differs from its envelope'),
            ('incomplete observation', lambda r: r['observations'][1].pop('clock_read_cursor'), 'Incomplete run observation'),
        ):
            rejected(lambda: verify(mutated(change)), expected, name)
        rejected(lambda: verify(mutated(lambda r: r.update(origin_envelope_sha256='b'*64))), 'Run belongs to a different envelope', 'run bound to another envelope')
        tampered = copy.deepcopy(envelope); tampered['families'] = ['F18', 'F19', 'F20']
        write('envelope-tampered.json', tampered)
        rejected(lambda: verify(run, 'envelope-tampered.json'), 'Run belongs to a different envelope', 'edited envelope no longer matches the run')
        moved = copy.deepcopy(envelope); moved['checkpoint_id'] = 'tampered'
        write('envelope-moved.json', moved)
        rejected(lambda: verify(run, 'envelope-moved.json'), 'Core observation metadata belongs to a different checkpoint', 'envelope checkpoint edited away from its core observation')
        broken = copy.deepcopy(envelope); broken['files'][2]['sha256'] = 'b'*64
        write('envelope-broken.json', broken)
        rejected(lambda: verify(mutated(lambda r: r.update(origin_envelope_sha256=file_sha(root/'envelope-broken.json'))), 'envelope-broken.json'),
                 'Fixture file hash mismatch', 'envelope whose files do not match is rejected by the R5 checker')
        wrong_barrier = observation_files('wrong-barrier', 'prompt-paused', 'qt_yn_function.getdir', 'direction-2', 'prompt', barrier=BARRIERS['command-ready'])
        rejected(lambda: verify(mutated(lambda r: r['observations'][2].update(core_file=wrong_barrier[0], rng_file=wrong_barrier[1]))),
                 'Barrier does not match the stop point', 'prompt point reported with a command-ready barrier')
        no_barrier = observation_files('no-barrier', 'core-suspended', 'qt_delay_output.tmp_at', 'tmp-at-3', 'suspended', seed=3)
        core_path = root/no_barrier[0]['path']
        stripped = json.loads(core_path.read_text(encoding='utf-8')); stripped.pop('barrier')
        no_barrier_core = write(no_barrier[0]['path'], stripped)
        no_barrier_rng = observation_files('no-barrier-rng', 'core-suspended', 'qt_delay_output.tmp_at', 'tmp-at-3', 'suspended', seed=3,
                                           rng_binding=dict(base, checkpoint_id='tmp-at-3', checkpoint_phase='suspended', core_file_sha256=no_barrier_core['sha256']))[1]
        rejected(lambda: verify(mutated(lambda r: r['observations'][3].update(core_file=no_barrier_core, rng_file=no_barrier_rng))),
                 'Run core observation has no barrier', 'run core observation without a barrier')
        stripped['barrier'] = None
        null_core = write('run/core-null-barrier.json', stripped)
        null_rng = observation_files('null-barrier-rng', 'core-suspended', 'qt_delay_output.tmp_at', 'tmp-at-3', 'suspended', seed=3,
                                     rng_binding=dict(base, checkpoint_id='tmp-at-3', checkpoint_phase='suspended', core_file_sha256=null_core['sha256']))[1]
        rejected(lambda: verify(mutated(lambda r: r['observations'][3].update(core_file=null_core, rng_file=null_rng))),
                 'Run core observation has no barrier', 'run core observation with a null barrier')
        rejected(lambda: verify(mutated(lambda r: r.update(runtime_ready=True))), 'Run report keys differ from darkdungeon-fixture-run-v1', 'run report claims runtime readiness')
        rejected_core, rejected_rng = observation_files('preflight', 'command-ready', 'qt_nh_poskey.command', 'fresh-input-0', 'preflight-rejection')
        preflight = dict(copy.deepcopy(envelope), case_kind='negative-core', checkpoint_phase='preflight-rejection', families=['F00'])
        preflight['files'] = files[:2]+[{'role': 'core-observation', **rejected_core}, {'role': 'rng-observation', **rejected_rng}]
        write('envelope-preflight.json', preflight)
        check(validate_envelope(preflight, root, families)['envelope_integrity_valid'], 'a preflight-rejection envelope is valid for R5')
        rejected(lambda: verify(mutated(lambda r: r.update(origin_envelope_sha256=file_sha(root/'envelope-preflight.json'))), 'envelope-preflight.json'),
                 'Run origin must be a fresh-recipe or restored command-ready checkpoint', 'run started from a preflight-rejection envelope')

    print(json.dumps({'mode': 'synthetic-boundary-verification', 'created_utc': datetime.now(timezone.utc).isoformat(),
        'checks_passed': len(checks), 'checks': checks, 'definition_sha256': sha(OUTPUT),
        'tool_sha256': {p.name: sha(p) for p in (Path(__file__), Path(__file__).with_name('boundary.py'))},
        'synthetic_only': True, 'game_executed': False, 'runtime_ready': False}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
