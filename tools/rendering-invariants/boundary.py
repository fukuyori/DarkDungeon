"""R6 #106: allowed stop points (boundary kind x window-port function), their
barrier shapes, and the link between an R5 envelope and run observation 0.
Definition and synthetic checks only; no game is run and no C state is read.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT/'docs/data'
OUTPUT = DATA/'rendering-boundary-ports.json'
TREES = {'en': ROOT/'build/nethack', 'ja': ROOT/'build/nethack-ja'}
sys.path.insert(0, str(ROOT/'tools/rendering-fixtures'))
from fixture_protocol import checked_file, file_sha, validate_envelope, validate_rng  # noqa: E402

IDENT = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,127}\Z')
HEX = re.compile(r'[0-9a-f]{64}\Z')
BOUNDARY_KINDS = ['command-ready', 'prompt-paused', 'core-suspended']
BARRIER_KEYS = ['input_ready', 'core_dispatch_pending', 'display_preparation_pending', 'modal']
# The command-ready shape is the R5 envelope barrier (fixture_protocol.validate_core).
BARRIERS = {
    'command-ready': {'input_ready': True, 'core_dispatch_pending': False, 'display_preparation_pending': False, 'modal': False},
    'prompt-answer': {'input_ready': True, 'core_dispatch_pending': True, 'display_preparation_pending': False, 'modal': True},
    'suspended-acknowledge': {'input_ready': True, 'core_dispatch_pending': True, 'display_preparation_pending': False, 'modal': True},
    'suspended-timer': {'input_ready': False, 'core_dispatch_pending': True, 'display_preparation_pending': True, 'modal': False},
}
QUEUES_EMPTY = ('Qt keybuffer and clickbuffer empty, no requested toolbar command, *readchar_queue empty, '
                'command queues CQ_CANNED and CQ_REPEAT empty, not gi.in_doagain')
COMMAND = ('parse() reading the first key of a top-level command (readchar_core -> nh_poskey): with num_pad off the '
           'first read of get_count() before any digit, with num_pad on the readchar() before get_count(); '
           'input_state=commandInp, iflags.in_parse, multi=0, no occupation, '
           +QUEUES_EMPTY+', in_moveloop and not gameover')
# Window-port entries where the core can wait for the player. The identifier is
# <outermost window procedure the core called>.<qualifier>. A point is recorded
# only once that procedure actually enters its wait (event loop, dialog or delay
# timer); entering the procedure is not enough, because queued keys, clicks or a
# toolbar command return without waiting. Nested waits are not boundaries.
PROMPTS = [
    ('qt_nh_poskey.command', 'command-ready', 'win_nh_poskey', COMMAND, 'command-ready', None),
    ('qt_nh_poskey.count', 'prompt-paused', 'win_nh_poskey', 'a read inside get_count() after one or more count digits (also after backspace back to zero), or with num_pad on after NHKF_COUNT; any caller (parse, the getobj count, splitting a stack) and any input_state', 'prompt-answer', None),
    ('qt_nhgetch.altmeta', 'prompt-paused', 'win_nhgetch', 'pgetchar() for the key after ESC when altmeta is on and input_state is not otherInp (commandInp, getposInp, getdirInp; readchar_core)', 'prompt-answer', None),
    ('qt_nhgetch.doagain', 'prompt-paused', 'win_nhgetch', 'pgetchar() while gi.in_doagain and *readchar_queue is empty (readchar_core)', 'prompt-answer', None),
    ('qt_yn_function.getdir', 'prompt-paused', 'win_yn_function', 'getdir() direction prompt (input_state=getdirInp)', 'prompt-answer', 'direction'),
    ('qt_yn_function.yn', 'prompt-paused', 'win_yn_function', 'yn_function() outside getdir, including object letters (input_state=otherInp); with query_menu on the same question is a qt_select_menu.menu point', 'prompt-answer', 'yn'),
    ('qt_nh_poskey.getpos', 'prompt-paused', 'win_nh_poskey', 'getpos() position prompt (input_state=getposInp)', 'prompt-answer', None),
    ('qt_nh_poskey.other', 'prompt-paused', 'win_nh_poskey', 'readchar()/readchar_poskey() outside parse, get_count and getpos (input_state=otherInp)', 'prompt-answer', None),
    ('qt_select_menu.menu', 'prompt-paused', 'win_select_menu', 'select_menu() waiting for a selection', 'prompt-answer', 'menu'),
    ('qt_getlin.text', 'prompt-paused', 'win_getlin', 'getlin() text entry', 'prompt-answer', None),
    ('qt_get_ext_cmd.extended', 'prompt-paused', 'win_get_ext_cmd', 'get_ext_cmd() extended command entry', 'prompt-answer', None),
    ('qt_display_nhwindow.text', 'prompt-paused', 'win_display_nhwindow', 'display_nhwindow() of a text window (NHW_TEXT, or NHW_MENU shown as text); waits whether or not block is set', 'prompt-answer', None),
    ('qt_display_nhwindow.map', 'prompt-paused', 'win_display_nhwindow', 'display_nhwindow(WIN_MAP, TRUE): the map viewport calls the core yn_function("Press a key when done viewing"); the inner qt_yn_function is not a separate point', 'prompt-answer', None),
    ('qt_display_file.file', 'prompt-paused', 'win_display_file', 'display_file() help text, or the warning box when a required file is missing', 'prompt-answer', None),
    ('qt_display_nhwindow.more', 'core-suspended', 'win_display_nhwindow', 'display_nhwindow(WIN_MESSAGE, TRUE): --More-- in qt_more()', 'suspended-acknowledge', '--More--'),
]
BARRIER_MEANING = {
    'input_ready': 'the core is waiting for the player inside a window-port wait',
    'core_dispatch_pending': 'a command or core operation is still in progress and continues after the wait',
    'display_preparation_pending': 'the core has published part of a display sequence (tmp_at, delay) and continues it after the wait',
    'modal': 'the wait answers a specific core request (prompt, --More--), not the top-level command wait; it is not Qt window modality',
}
DELAY_BRANCHES = {'tmp_at': 'tmp_at', 'dobuzz': 'dobuzz', 'explode': 'explode'}
NOT_BOUNDARIES = [
    {'function': 'qt_askname', 'reason': 'before moveloop; not a play boundary'},
    {'function': 'qt_player_selection', 'reason': 'before moveloop; not a play boundary'},
    {'function': 'qt_outrip', 'reason': 'game over; not a play boundary'},
    {'function': 'any window procedure after program_state.gameover (for example the identify and inventory prompts at death)', 'reason': 'end of play; run comparisons stop at game over'},
    {'function': 'qt_doprev_message', 'reason': 'returns at once; the Qt message window scrolls instead of waiting'},
    {'function': 'qt_nhgetch inside qt_yn_function, qt_more or qt_get_ext_cmd; qt_yn_function inside qt_display_nhwindow(WIN_MAP)', 'reason': 'nested wait: the outermost window procedure is the boundary'},
    {'function': 'a window procedure that returns queued keys, clicks or a toolbar command without entering its wait', 'reason': 'entering an input function is not a boundary'},
    {'function': 'qt_timer_fire (idlecheckpoint)', 'reason': 'explicit core operation (F16/INV14); never a pure-paint boundary'},
    {'function': 'Qt event processing without a core wait', 'reason': 'Qt being busy is not a core boundary'},
]
# darkdungeon-fixture-run-v1 (run_report_contract of rendering-fixture-plan.json). Only the
# origin and the observations are checked here; the other fields must exist but are not validated.
RUN_KEYS = {'schema', 'run_id', 'case_id', 'language', 'origin_envelope_sha256', 'producer', 'reader', 'control', 'observations',
            'inputs', 'seed_requests', 'reseed_attempts', 'clock_reads', 'save_result', 'verdict', 'evidence_files'}
FUNCTION = re.compile(r'^([a-z_][a-z0-9_]*)\(', re.M)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def delay_sites(tree):
    """Core functions that call nh_delay_output(), from the generated sources."""
    sites, files = set(), {}
    for path in sorted((tree/'src').glob('*.c')):
        text = path.read_text(encoding='utf-8', errors='replace')
        if 'nh_delay_output' not in text:
            continue
        current = None
        for line in text.splitlines():
            match = FUNCTION.match(line)
            if match:
                current = match.group(1)
            code = line.split('//')[0]
            if re.search(r'\bnh_delay_output\(\);', code) and not re.search(r'/\*\s*nh_delay_output', code):
                require(current is not None, 'Delay call outside a function: '+path.name)
                sites.add(current)
                files[path.name] = sha(path)
    return sorted(sites), files


def definition():
    languages, site_sets = {}, {}
    for language, tree in TREES.items():
        sites, files = delay_sites(tree)
        require(sites, 'No delay_output sites found for '+language)
        site_sets[language] = sites
        languages[language] = {'delay_sites': sites, 'source_sha256': files}
    require(site_sets['en'] == site_sets['ja'], 'English and Japanese delay sites differ; review both')
    ports = [{'id': i, 'boundary_kind': k, 'window_proc': w, 'core_condition': c, 'barrier': b, 'f18_branch': f}
             for i, k, w, c, b, f in PROMPTS]
    for site in site_sets['en']:
        ports.append({'id': 'qt_delay_output.'+site, 'boundary_kind': 'core-suspended', 'window_proc': 'win_delay_output',
                      'core_condition': site+'() waiting in nh_delay_output()', 'barrier': 'suspended-timer',
                      'f18_branch': DELAY_BRANCHES.get(site, 'delay_output')})
    return {'schema': 'darkdungeon-boundary-ports-v1', 'boundary_kinds': BOUNDARY_KINDS,
            'barrier_keys': BARRIER_KEYS, 'barrier_meaning': BARRIER_MEANING, 'barriers': BARRIERS,
            'recording_rule': 'record a point only when the outermost window procedure the core called enters its wait; nested waits are not points',
            'ports': ports, 'not_boundaries': NOT_BOUNDARIES,
            'languages': languages,
            'origin_rule': {'run_observation': 0, 'boundary_kind': 'command-ready', 'input_ordinal': 0,
                            'same_as_envelope': ['checkpoint_id', 'checkpoint_phase', 'core-observation sha256', 'rng-observation sha256'],
                            'seed_request_cursor': 'equals the envelope rng seed_context.seed_request_index'},
            'readiness': {'runtime_ready': False, 'c_observer_implemented': False, 'site_attribution_implemented': False}}


def load_definition():
    return json.loads(OUTPUT.read_text(encoding='utf-8-sig'))


def port_table(value=None):
    value = value or load_definition()
    return {port['id']: port for port in value['ports']}


def validate_point(kind, port_function, barrier, value=None):
    """A stop point: its kind, the window procedure it is in, and its barrier."""
    value = value or load_definition()
    ports = port_table(value)
    require(kind in BOUNDARY_KINDS, 'Invalid suspended/ready boundary kind')
    require(isinstance(port_function, str) and port_function in ports, 'Unknown window-port stop point')
    port = ports[port_function]
    require(port['boundary_kind'] == kind, 'Window-port stop point is not allowed for this boundary kind')
    if barrier is not None:
        require(isinstance(barrier, dict) and set(barrier) == set(BARRIER_KEYS) and all(type(v) is bool for v in barrier.values()), 'Invalid barrier shape')
        require(barrier == value['barriers'][port['barrier']], 'Barrier does not match the stop point')
    return port


def read_once(root, relative):
    """Hash and parse the same bytes, so a file replaced in between cannot pass."""
    raw = checked_file(root, relative).read_bytes()
    return hashlib.sha256(raw).hexdigest(), json.loads(raw.decode('utf-8-sig'))


def run_core_file(root, entry):
    require(isinstance(entry, dict) and set(entry) == {'path', 'sha256'} and isinstance(entry['sha256'], str) and HEX.fullmatch(entry['sha256']), 'Invalid run observation file')
    digest, data = read_once(root, entry['path'])
    require(digest == entry['sha256'], 'Run observation file hash mismatch')
    return data


def validate_run_origin(envelope_path, run, root, families, value=None):
    """The run starts where the envelope's checkpoint is, then keeps each stop
    point legal and bound to its case/build. Run points other than 0 are not R5
    envelope checkpoints and are not checked with the R5 envelope barrier."""
    value = value or load_definition()
    envelope_sha, envelope = read_once(root, envelope_path)
    validate_envelope(envelope, root, families)
    require(envelope['checkpoint_phase'] in ('post-setup-ready', 'post-restore-ready'), 'Run origin must be a fresh-recipe or restored command-ready checkpoint')
    require(isinstance(run, dict) and run.get('schema') == 'darkdungeon-fixture-run-v1', 'Unknown fixture run schema')
    require(set(run) == RUN_KEYS, 'Run report keys differ from darkdungeon-fixture-run-v1')
    require(run.get('origin_envelope_sha256') == envelope_sha, 'Run belongs to a different envelope')
    require(run.get('case_id') == envelope['case_id'] and run.get('language') == envelope['language'], 'Run case/language differs from its envelope')
    by_role = {}
    for entry in envelope['files']:
        by_role.setdefault(entry['role'], []).append(entry)
    require(len(by_role.get('core-observation', [])) == 1 and len(by_role.get('rng-observation', [])) == 1, 'Envelope lacks one core and one RNG observation')
    origin_digest, origin_rng = read_once(root, by_role['rng-observation'][0]['path'])
    require(origin_digest == by_role['rng-observation'][0]['sha256'], 'Fixture file hash mismatch')
    producer = envelope['producer']
    save_sha = by_role['save'][0]['sha256'] if 'save' in by_role else None
    observations = run.get('observations')
    require(isinstance(observations, list) and observations, 'Run has no observations')
    keys = {'ordinal', 'checkpoint_id', 'checkpoint_phase', 'boundary_kind', 'port_function', 'input_ordinal', 'core_file',
            'rng_file', 'field_map_sha256', 'normalization_registry_sha256', 'seed_request_cursor', 'clock_read_cursor'}
    previous = {'input_ordinal': 0, 'seed_request_cursor': 0, 'clock_read_cursor': 0}
    for index, point in enumerate(observations):
        require(isinstance(point, dict) and set(point) == keys, 'Incomplete run observation')
        require(type(point['ordinal']) is int and point['ordinal'] == index, 'Run observations must be numbered 0, 1, 2, ...')
        require(all(isinstance(point[k], str) and IDENT.fullmatch(point[k]) for k in ('checkpoint_id', 'checkpoint_phase')), 'Invalid run checkpoint identity')
        require(all(isinstance(point[k], str) and HEX.fullmatch(point[k]) for k in ('field_map_sha256', 'normalization_registry_sha256')), 'Run observation field map/registry missing')
        require(all(type(point[k]) is int and point[k] >= 0 for k in previous), 'Invalid run cursor')
        require(all(point[k] >= previous[k] for k in previous), 'Run input/seed/clock cursors must not go back')
        previous = {k: point[k] for k in previous}
        core = run_core_file(root, point['core_file'])
        require(isinstance(core, dict) and core.get('schema') == 'darkdungeon-core-observation-v1', 'Unknown core projection schema')
        require(core.get('boundary_kind') == point['boundary_kind'] and core.get('port_function') == point['port_function'], 'Core file boundary differs from the run observation')
        require(isinstance(core.get('barrier'), dict), 'Run core observation has no barrier')
        validate_point(point['boundary_kind'], point['port_function'], core['barrier'], value)
        binding = {'case_id': envelope['case_id'], 'language': envelope['language'], 'build_id': producer['build_id'],
                   'producer_engine_sha256': producer['engine_sha256'], 'save_file_sha256': save_sha,
                   'checkpoint_id': point['checkpoint_id'], 'checkpoint_phase': point['checkpoint_phase']}
        require(all(core.get(k) == v for k, v in binding.items()), 'Run core observation belongs to a different case/build/checkpoint')
        rng = run_core_file(root, point['rng_file'])
        validate_rng(rng, dict(binding, core_file_sha256=point['core_file']['sha256']))
        require(rng['seed_context']['seed_request_index'] == point['seed_request_cursor'], 'Run RNG seed cursor differs from the observation')
        if index == 0:
            require(point['boundary_kind'] == 'command-ready' and point['input_ordinal'] == 0, 'Run observation 0 must be the command-ready origin before any input')
            require(point['checkpoint_id'] == envelope['checkpoint_id'] and point['checkpoint_phase'] == envelope['checkpoint_phase'], 'Run observation 0 is not the envelope checkpoint')
            require(point['core_file']['sha256'] == by_role['core-observation'][0]['sha256'], 'Run observation 0 core file is not the envelope core observation')
            require(point['rng_file']['sha256'] == by_role['rng-observation'][0]['sha256'], 'Run observation 0 RNG file is not the envelope RNG observation')
            require(point['seed_request_cursor'] == origin_rng['seed_context']['seed_request_index'], 'Run observation 0 seed cursor differs from the envelope')
        else:
            require(point['input_ordinal'] > 0, 'Only run observation 0 may precede the first input')
    return {'run_origin_valid': True, 'observations': len(observations), 'envelope_sha256': envelope_sha,
            'game_executed': False, 'runtime_ready': False,
            'scope': 'provided JSON/files only; the C observer, site attribution and clock cursor of the origin are not verified'}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    value = definition()
    if args.check:
        require(load_definition() == value, 'Boundary definition differs from the generated sources')
    else:
        OUTPUT.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'mode': 'check' if args.check else 'generate', 'created_utc': datetime.now(timezone.utc).isoformat(),
                      'definition_sha256': sha(OUTPUT), 'tool_sha256': sha(Path(__file__)), 'ports': len(value['ports']),
                      'delay_sites': len(value['languages']['en']['delay_sites']), 'runtime_ready': False, 'game_executed': False}, indent=2))


if __name__ == '__main__':
    main()
