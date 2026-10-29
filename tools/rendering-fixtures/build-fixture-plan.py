"""R5 reproduction requirements. Generates no game/save and certifies no case.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'docs/data'
FAMILIES = {
    'F00': ('isolation', ['manual profile isolation before Qt/core init', 'separate test-adapter profile', 'missing capability rejects before game launch', 'reject or remove inherited SMOKE environment', 'EN root migration excludes JA subtree', 'ANSI/MAX_PATH limitations and non-ASCII native paths']),
    'F01': ('hero', ['73 creation combinations', 'runtime sex/alignment/form changes']),
    'F02': ('movement', ['cardinal/diagonal/blocked moves', 'continuous inputs and camera', 'teleport/map generation']),
    'F03': ('commands', ['Space context actions', 'inventory/menu prompts', 'save/quit/restore via normal dispatcher']),
    'F04': ('contact', ['contact/weapon hit and miss', 'passive reaction', 'death effect']),
    'F05': ('ranged', ['throw/fire', 'spit/breath/gaze', 'beams/explosions and cleanup']),
    'F06': ('dynamic-attacks', ['getmattk cooldown substitutions', 'SEDUCE on/off', 'weapon close/ranged', 'spell close/ranged']),
    'F07': ('undirected-spell', ['monmove non-attacking castmu FALSE/FALSE', 'no-effect path does not invent a cast outcome']),
    'F08': ('monster-items', ['offensive item use', 'defensive item use', 'miscellaneous item use']),
    'F09': ('mount-entry', ['pony/horse/warhorse', 'saddle/tame/can_saddle/water', 'polymorphed slithy rejection', 'Hallucination normal/force', 'Wounded_legs normal/force']),
    'F10': ('mounted-continuation', ['mount then polymorph', 'SALAMANDER continuation', 'shape failure dismount', 'polyok is not reachability proof']),
    'F11': ('self-display', ['showrace', 'polymorph', 'object/furniture/monster mimic', 'invisible/blind/swallowed center']),
    'F12': ('knowledge', ['unexplored/memory', 'detection without hidden terrain', 'visibility loss and reentry']),
    'F13': ('hallucination', ['core chosen actor/object display', 'statue-to-actor including inventory/menu', 'display generation sampling vs repaint', 'inventory/container/equipment open and closed; timer and drag states']),
    'F14': ('appearance-controls', ['same appearance/different hidden type', 'same type/different appearance', 'identification and unseen generic', 'fixed equivalent bags/lamps/horns/gems/amulets']),
    'F15': ('appearance-routes', ['map/inventory/equipment/menu/drag', 'corpse/statue/piletop/generic', 'restore mapping and EN/JA', 'missing/stale mapping failure']),
    'F16': ('lifecycle', ['level/teleport/death/quit', 'save/restore stops old interpolation', 'identity/cache generations', 'idlecheckpoint on/off and explicit save']),
    'F17': ('ui', ['status29/marks3/splash1/blank', 'memorial background regression', 'actual logical size and text']),
    'F18': ('repaint', ['prepared snapshot only', 'CORE and DISP unchanged', 'resize/zoom/repeated paints without core input', 'hallucination inventory/container/equipment open and closed; timer and drag states', 'prompt-paused repaint during menu/direction/yn', 'core-suspended repaint during delay_output/More/tmp_at/dobuzz/explode', 'stopped-boundary timers/drag/hallucinated inventory without core resumption']),
    'F19': ('replay', ['repeat fresh recipe or controlled fresh-process restore', 'control before restore initialization and throughout process lifetime', 'same-build CORE/DISP entry checks', 'cross-build CORE parity', 'versioned display-sampling comparison', 'midnight/calendar transitions and both reseed outcomes']),
    'F20': ('save-compatibility', ['same build', 'previous/candidate both directions after phase0', 'phase0/candidate both directions', 'fresh fixtures only; discard pre-improvement legacy saves', 'default core loader and post-restore predicates']),
    'F21': ('rejection', ['incompatible/truncated save', 'wrong language/model/UID', 'stale sidecar/hash', 'missing files/unsupported profile', 'never silently start a new game']),
    'F22': ('renderer-support', ['all declared frames/directions', 'all9624 glyph aliases', 'all390 hero composites', 'no gameplay reachability claim']),
    'F23': ('environment', ['all122 retained terrain keys', 'new art harmony', 'reserved47/empty3 RGB policy']),
    'F24': ('view-settings', ['EN/JA native cases', 'narrow/default/maximized and DPI', 'Rogue graphical and explicit ASCII roundtrip']),
}
Q_FAMILIES = {
    'Q01': [], 'Q02': ['F22'], 'Q03': ['F22','F23','F24'], 'Q04': ['F01','F05','F22'],
    'Q05': ['F02','F09','F10','F22'], 'Q06': ['F02','F15','F18','F22','F23'],
    'Q07': ['F02','F18','F19'], 'Q08': ['F03','F04','F05','F06','F07','F08','F13'],
    'Q09': ['F11','F12','F13','F14','F15','F18'], 'Q10': ['F01','F15','F17','F24'],
    'Q11': ['F12','F13','F16','F20'], 'Q12': ['F00','F15','F20','F21','F23'], 'Q13': ['F17','F24'],
}
I_FAMILIES = {
    'I-01': ['F14'], 'I-02': ['F14'], 'I-03': ['F14'], 'I-04': ['F12','F14'],
    'I-05': ['F15'], 'I-06': ['F13','F15'], 'I-07': ['F15','F18'],
    'I-08': ['F15','F20'], 'I-09': ['F15','F24'], 'I-10': ['F15','F21'],
    'I-11': ['F15','F21'], 'I-12': ['F14'], 'I-13': ['F14','F15'],
}
RUN_REPORT_CONTRACT = {
    'required': ['schema=darkdungeon-fixture-run-v1','run_id','case_id','language','origin_envelope_sha256','boundary_ports_sha256','producer','reader','control','observations[]','inputs[]','seed_requests[]','reseed_attempts[]','clock_reads[]','save_result','verdict','evidence_files[]'],
    'observation': ['ordinal','checkpoint_id','checkpoint_phase','boundary_kind','port_function','input_ordinal','core_file(path,sha256)','rng_file(path,sha256)','field_map_sha256','normalization_registry_sha256','seed_request_cursor','clock_read_cursor'],
    'seed_request': ['ordinal','site','stream(core/display)','reason(init/reseed)','provider','seed_hex(seed_api_bytes*2)','has_strong_rngseed'],
    'reseed_attempt': ['ordinal','site','stream(core/display)','has_strong_rngseed','outcome(requested/skipped)','seed_request_ordinal-or-null'],
    'clock_read': ['ordinal','site','utc_epoch_seconds(decimal string)','timezone_id','utc_offset_seconds','dst_active','local_calendar(year,month,day,weekday,hour,minute,second)'],
    'verdicts': ['passed','failed','unconfirmed','not-run','known-nonconformance'],
    'status': 'format-defined; runtime writer/comparator not implemented',
}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_plan(plan, quality):
    require(set(plan['scenario_families']) == set(FAMILIES), 'Missing scenario family')
    require(plan['scenario_families']['F18']['mandatory_branches'] == FAMILIES['F18'][1], 'Required stopped-boundary repaint branch missing')
    require(set(plan['criterion_family_map']) == set(quality['criteria']), 'Quality criterion unmapped')
    appearance_ids = set(re.findall(r'^\| (I-\d{2}) \|', (ROOT / 'docs/item-appearance-contract.md').read_text(encoding='utf-8-sig'), re.M))
    require(set(plan['appearance_requirements']) == set(I_FAMILIES) == appearance_ids, 'R2 appearance requirement unmapped')
    require(all(v and set(v) <= set(FAMILIES) for v in plan['appearance_requirements'].values()), 'Appearance requirement has no scenario family')
    expected = {t['key']: t for t in quality['targets']}
    actual = plan['coverage_obligations']
    require(len(actual) == len(expected) and {t['key'] for t in actual} == set(expected), 'Coverage target missing or duplicated')
    for entry in actual:
        require(entry['criteria'] == expected[entry['key']]['required'], 'Required quality criterion lost')
        require(entry['binding_state'] == 'unassigned', 'Definition generator cannot certify runtime bindings')
    for q, entry in plan['criterion_family_map'].items():
        require(entry['owner'] == ('R1-R4-art-provenance' if q == 'Q01' else 'R5-case-binding'), 'Invalid evidence owner')
        require(q == 'Q01' or entry['family_candidates'], 'Runtime criterion has no candidate family')
        require(set(entry['family_candidates']) <= set(FAMILIES), 'Unknown family reference')
    require(plan['rng_policy']['normal_save_restores_rng'] is False, 'Normal save RNG continuity falsely promised')
    require(plan['rng_policy']['state_sidecar_use'] == 'read-only-observation; never import/rewind', 'State injection would hide replay divergence')
    require(plan['rng_policy']['paint_invariant_streams'] == ['core','display'], 'Paint must preserve both RNGs')
    require(plan['rng_policy']['control_lifetime'] == 'before initialization through restore/play/exit; all seed requests and clock reads', 'Control lifetime incomplete')
    require(plan['baseline_policy']['freeze_after_paint_rng_fix'] is True, 'Known paint RNG bug cannot be a conforming baseline')
    require(plan['run_report_contract'] == RUN_REPORT_CONTRACT, 'Run report contract incomplete or changed')
    require(plan['save_matrix']['directions'] == ['same-build','previous-to-candidate','candidate-to-previous','phase0-to-candidate','candidate-to-phase0'], 'Save compatibility direction missing')
    require(plan['save_matrix']['legacy_policy'] == 'discard-pre-improvement-saves; no migration requirement', 'Legacy save policy differs from user decision')
    require(plan['save_matrix']['languages'] == ['en','ja'] and not plan['save_matrix']['cross_language_claim'], 'Native-language save scope changed')
    require(plan['readiness']['runtime_ready'] is False, 'Static plan cannot declare fixtures ready')
    for name, gate in quality['phase_gates'].items():
        require(plan['phase_obligations'][name] == gate['cumulative_required_keys'], 'Phase case-binding coverage incomplete')


def build(quality, layouts, provenances):
    require(set(Q_FAMILIES) == set(quality['criteria']), 'New quality criteria need scenario mapping')
    for lang, layout in layouts.items():
        require(layout['rng']['algorithm'] == 'ISAAC64' and layout['rng']['words'] == 256 and layout['rng']['word_bytes'] == 8, 'RNG layout unsupported; revise protocol')
        require(layout['game_executed'] is False and layout['save_compatibility_verified'] is False, 'Static layout probe mislabeled')
    plan = {
        'schema': 'darkdungeon-fixture-plan-v1', 'internal_audit_only': True,
        'quality_plan_sha256': sha(DATA / 'rendering-quality-plan.json'),
        'scenario_families': {k: {'name': name, 'mandatory_branches': branches, 'status': 'planned'} for k, (name, branches) in FAMILIES.items()},
        'criterion_family_map': {q: {'owner': 'R1-R4-art-provenance' if q == 'Q01' else 'R5-case-binding', 'family_candidates': families} for q, families in Q_FAMILIES.items()},
        'appearance_requirements': I_FAMILIES,
        'coverage_obligations': [{'key': t['key'], 'criteria': t['required'], 'binding_state': 'unassigned'} for t in quality['targets']],
        'phase_obligations': {p: g['cumulative_required_keys'] for p, g in quality['phase_gates'].items()},
        'rng_policy': {'normal_save_restores_rng': False, 'algorithm': 'ISAAC64', 'word_hex_digits': 16, 'array_words': 256,
                       'paint_invariant_streams': ['core','display'], 'state_sidecar_use': 'read-only-observation; never import/rewind',
                       'same_build_replay': 'fresh recipe or fresh-process restore with process-lifetime seed/clock control, fixed display requests; verify both RNG entry states',
                       'cross_build_replay': 'CORE parity mandatory; DISP equality only with same sampling contract; paint invariance always mandatory',
                       'control_lifetime': 'before initialization through restore/play/exit; all seed requests and clock reads',
                       'seed_context': 'record has_strong_rngseed, provider, both-stream init/reseed attempts and seed request cursor; source semantics not inferred from one numeric seed',
                       'reseed': 'control and record initialization plus all reseed sites; bones early return skips trailing mklev reseeds; seed-only success is insufficient'},
        'baseline_policy': {'freeze_after_paint_rng_fix': True,
                            'known_nonconformance': 'inventory itemImage/drag/signature timer and Qt equipment drawWorn consume DISP under hallucination',
                            'raw_reference': 'preserve separate pre-fix observations; never count failed paint/replay as pass',
                            'phase0': 'fix existing sampling/repaint violations under R6 contract before freezing accepted baseline; review and record display sampling change'},
        'run_report_contract': RUN_REPORT_CONTRACT,
        'save_matrix': {'directions': ['same-build','previous-to-candidate','candidate-to-previous','phase0-to-candidate','candidate-to-phase0'],
                        'legacy_policy': 'discard-pre-improvement-saves; no migration requirement',
                        'languages': ['en','ja'], 'cross_language_claim': False,
                        'artifact': 'frozen closed-profile template copied into a unique writable run root',
                        'loader': 'default core validation; no skip-sanity bypass; built-in conversion/revision uplift separately classified, never unchanged compatibility',
                        'result': 'unexecuted'},
        'profile_policy': {'manual': 'isolated storage/settings without SMOKE automation or seed overrides',
                           'instrumented': 'separate test build/profile; read-only observer; control all clock reads/timezone/DST and seed requests for full process lifetime; never inject RNG state',
                           'admission': 'require early profile capability before Qt/core initialization; missing support rejects before launch',
                           'existing_support': 'manual isolation and RNG observers remain unimplemented'},
        'layouts': layouts, 'source_provenance': provenances,
        'readiness': {'runtime_ready': False, 'saved_fixtures_created': 0, 'bindings_verified': 0,
                      'requires': ['phase0-isolated-launcher','test-only-read-observers','controlled-start-adapter','R6-snapshot-boundary','actual-core-cases-and-evidence']},
    }
    validate_plan(plan, quality)
    return plan


def read_layouts(root):
    layouts, provenances = {}, {}
    for lang in ('en','ja'):
        path = root / lang / 'layout.json'
        provenance = load(root / lang / 'provenance.json')
        require(sha(path) == provenance['output_sha256'].lower(), 'Probe output changed')
        require(sha(Path(__file__).with_name('audit-layout.c')) == provenance['extractor_sha256'].lower(), 'Probe source changed')
        source_root = ROOT / ('build/nethack-ja' if lang == 'ja' else 'build/nethack')
        require(provenance['source_root'] == source_root.relative_to(ROOT).as_posix(), 'Probe source root must be repository-relative')
        require(provenance['definitions_are_diagnostic_only'] is True and provenance['game_build_configuration_verified'] is False, 'Probe cannot certify actual build flags')
        for source in provenance['inputs']:
            require(sha(source_root / source['path'].replace('\\','/')) == source['sha256'].lower(), 'Game source changed: ' + source['path'])
        for source in provenance['project_inputs']:
            require(sha(ROOT / source['path']) == source['sha256'].lower(), 'Frontend source changed: ' + source['path'])
        layouts[lang], provenances[lang] = load(path), provenance
    # Native formats are recorded separately; equality is not a cross-language save test.
    require(layouts['en']['rng'] == layouts['ja']['rng'], 'EN/JA RNG layout mismatch')
    return layouts, provenances


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('layout_root', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    layouts, provenances = read_layouts(args.layout_root.resolve())
    plan = build(load(DATA / 'rendering-quality-plan.json'), layouts, provenances)
    path = DATA / 'rendering-fixture-plan.json'
    if args.check:
        require(path.is_file() and load(path) == plan, 'Fixture plan is stale')
    else:
        path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'mode': 'check' if args.check else 'generate', 'status': 'passed',
                      'created_utc': datetime.now(timezone.utc).isoformat(), 'plan_sha256': sha(path),
                      'scenario_families': len(FAMILIES), 'coverage_targets': len(plan['coverage_obligations']),
                      'game_executed': False, 'saved_fixtures_created': 0, 'runtime_ready': False}, indent=2))


if __name__ == '__main__':
    main()
