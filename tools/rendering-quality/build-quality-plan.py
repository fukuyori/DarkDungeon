"""R4 static acceptance plan, not a runtime resolver or a quality test of art.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'docs/data'
ATTACK_FAMILIES = {
    'AT_NONE': 'passive', 'AT_BOOM': 'death-effect',
    'AT_CLAW': 'contact', 'AT_BITE': 'contact', 'AT_KICK': 'contact',
    'AT_BUTT': 'contact', 'AT_TUCH': 'contact', 'AT_STNG': 'contact',
    'AT_HUGS': 'contact', 'AT_TENT': 'contact', 'AT_WEAP': 'weapon',
    'AT_SPIT': 'ranged', 'AT_BREA': 'ranged', 'AT_GAZE': 'ranged', 'AT_MAGC': 'spell',
    'AT_ENGL': 'engulf', 'AT_EXPL': 'proximity-effect',
}
CRITERIA = {
    'Q01': 'new artwork and traceable source; derived assets use only approved new parents',
    'Q02': 'R1 dimensions, RGBA8, binary alpha, reserved color, grid and declared frame validation',
    'Q03': 'approved guide against retained terrain; identity readable by shape/features, not recolor alone',
    'Q04': 'four directions or reviewed isotropic declaration; directional overlap order',
    'Q05': 'visible body scale, stable ground/seat anchors and declared bounds',
    'Q06': 'transparent foreground, black details preserved, no clipping or paint-order flicker',
    'Q07': 'readable movement/idle, continuous position and camera; no turn or RNG advance',
    'Q08': 'core-authorized attack/reaction/effect; correct direction, result and cleanup',
    'Q09': 'R2/R3 appearance, visibility, hallucination and private-information invariants',
    'Q10': 'all applicable map/inventory/equipment/menu/selector/drag/UI routes, actual display sizes and EN/JA',
    'Q11': 'visibility changes, map generations, death and save/restore invalidate transient state',
    'Q12': 'new common resolver, correct atlas operation and complete deployment/legacy audit',
    'Q13': 'UI readability at actual logical sizes, labels, layout, language and DPI',
}
REQUIRED = {
    'hero-layer': ['Q01','Q02','Q03','Q04','Q05','Q06','Q07','Q08','Q09','Q10','Q11','Q12'],
    'actor': ['Q01','Q02','Q03','Q04','Q05','Q06','Q07','Q08','Q09','Q10','Q11','Q12'],
    'item': ['Q01','Q02','Q03','Q05','Q06','Q08','Q09','Q10','Q11','Q12'],
    'statue': ['Q01','Q02','Q03','Q05','Q06','Q08','Q09','Q10','Q11','Q12'],
    'special': ['Q01','Q02','Q03','Q04','Q05','Q06','Q08','Q09','Q10','Q11','Q12'],
    'mark': ['Q01','Q02','Q03','Q06','Q09','Q10','Q11','Q12','Q13'],
    'status-icon': ['Q01','Q02','Q03','Q06','Q09','Q10','Q11','Q12','Q13'],
    'ui-illustration': ['Q01','Q02','Q03','Q06','Q10','Q12','Q13'],
    'environment': ['Q03','Q05','Q06','Q09','Q10','Q11','Q12'],
}
for category in ('hero-layer', 'actor', 'item', 'statue'):
    REQUIRED[category].append('Q13')
NA_BY_PROFILE = {
    'hero-layer': {}, 'actor': {},
    'item': {'Q04': 'static item has no actor direction cycle', 'Q07': 'static item has no independent walk/idle loop; projectile motion is Q08'},
    'statue': {'Q04': 'static statue uses one declared new actor direction/frame', 'Q07': 'stone statue does not inherit living actor locomotion; object motion is Q08'},
    'special': {'Q07': 'effect segments are not actor walk/idle cycles; their animated sequence is Q08',
                'Q13': 'effect geometry is Q04 and native-size routes Q10; not a labeled UI control'},
    'mark': {'Q04': 'map mark has no actor-facing cycle', 'Q05': 'map mark uses declared logical annotation box, not a body anchor',
             'Q07': 'map mark has no independent locomotion', 'Q08': 'map mark is an annotation, not attack art'},
    'status-icon': {'Q04': 'status icon has no actor-facing cycle', 'Q05': 'status icon uses its logical UI box',
                    'Q07': 'status icon has no actor locomotion', 'Q08': 'status icon describes state, not a core attack'},
    'ui-illustration': {'Q04': 'fixed splash has no facing cycle', 'Q05': 'fixed splash uses a 196x111 UI canvas',
                        'Q07': 'fixed splash has no game locomotion', 'Q08': 'fixed splash has no live attacks',
                        'Q09': 'fixed splash has no per-entity gameplay input', 'Q11': 'fixed splash has no entity lifetime'},
    'environment': {'Q01': 'R3 retains terrain; Q03 evaluates new-art harmony with this baseline',
                     'Q02': 'terrain is retained/code drawn; original atlas RGB equality is Q12',
                     'Q04': 'terrain variants are audited by their tile topology under Q06, not actor directions',
                     'Q07': 'terrain has no independent locomotion', 'Q08': 'terrain is not core actor attack art',
                     'Q13': 'terrain is not a UI control; native-size terrain glyph readability is Q03/Q10'},
}

ENTRY = ['phase-4-accepted', 'R1-R7-specifications-closed', 'style-and-timing-calibration-accepted',
         'R5-scenarios-ready', 'R6-notification-invariants-verified', 'R7-comparison-artifacts-ready']


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def definition(value):
    if isinstance(value, dict):
        return {k: definition(v) for k, v in value.items() if k != 'tracking'}
    if isinstance(value, list):
        return [definition(v) for v in value]
    return value


def validate_capabilities(capabilities, ledger):
    monsters = capabilities['monsters']
    require(capabilities['monster_count'] == len(ledger['monsters']) == len(monsters), 'Monster count mismatch')
    require([m['id'] for m in monsters] == list(range(len(monsters))), 'Monster IDs missing or duplicated')
    require([m['symbol'] for m in monsters] == [m['symbol'] for m in ledger['monsters']], 'R3 and capability identities differ')
    for m in monsters:
        expected = m['humanoid'] and not m['very_small'] and not m['big']
        require(m['rider_shape_candidate'] == expected, 'Rider shape predicate differs from can_ride shape conditions')
        require(len(m['attacks']) == capabilities['attack_slots'], 'Missing attack slot')
        require(all(a['type'] in ATTACK_FAMILIES for a in m['attacks']), 'Unknown attack delivery type')


def validate_graph(phases):
    active, visited = set(), set()

    def visit(name):
        require(name in phases, 'Unknown phase dependency')
        require(name not in active, 'Phase dependency cycle')
        if name in visited:
            return
        active.add(name)
        for dependency in phases[name]['depends_on']:
            visit(dependency)
        active.remove(name)
        visited.add(name)

    for name in phases:
        visit(name)


def early_views(ledger):
    roles = {p['actor_key'] for p in ledger['hero']['role_previews']}
    mounts = {v['actor_key'] for m in ledger['monsters'] if m['symbol'] in ('PONY','HORSE','WARHORSE') for v in m['views'].values()}
    require(len(roles) == 26 and len(mounts) == 6, 'Role/mount early bridge changed')
    return roles, mounts


def auxiliary(ledger):
    cleared = sorted(t['id'] for t in ledger['atlas_slots'] if t['disposition'] == 'clear-reserved-slot')
    empty = sorted(t['id'] for t in ledger['atlas_slots'] if t['disposition'] == 'preserve-empty-sentinel')
    environment = sorted(a['key'] for a in ledger['assets'] if a['category'] == 'environment')
    blank = [i['key'] for i in ledger['ui_status_icons'] if i['policy'] == 'transparent-sentinel']
    rip = [i for i in ledger['external_images'] if i['source'].endswith('/rip.xpm')]
    require(len(rip) == 1 and rip[0]['policy'] == 'retain-ui-background', 'Memorial background policy changed')
    return {
        'reserved_slots': {'count': len(cleared), 'ids': cleared, 'operation': 'clear-reserved-slot', 'phase': '5-4'},
        'empty_atlas_slots': {'count': len(empty), 'ids': empty, 'operation': 'preserve original RGB', 'phase': '5-4'},
        'blank_status': {'count': len(blank), 'keys': blank, 'operation': 'preserve empty role', 'phase': '5-4'},
        'rip_background': {'source': rip[0]['source'], 'operation': 'retained UI background',
                           'initial_phases': ['1','4'], 'regression_phase': '5-4'},
        'environment': {'count': len(environment), 'keys': environment,
                        'operation': 'new art harmony with retained terrain and original atlas RGB equality', 'phase': '5-4'},
        'operational_icons': {'new_art_scope': False, 'initial_phase': '1', 'regression_phase': '5-4',
                              'sources': ['darkdungeon_toolbar_icon','qt_main.cpp operational XPM','application icon']},
    }


def validate_plan(plan, ledger, capabilities):
    validate_capabilities(capabilities, ledger)
    source = {a['key']: a for a in ledger['assets']}
    keys = [t['key'] for t in plan['targets']]
    require(len(keys) == len(set(keys)) and set(keys) == set(source), 'Quality targets have gaps or duplicates')
    criteria = set(plan['criteria'])
    for profile in plan['profiles'].values():
        required = set(profile['required'])
        excluded = profile['not_applicable']
        require(not (required & set(excluded)) and required | set(excluded) == criteria, 'Criterion applicability has gaps or overlaps')
        require(all(str(reason).strip() for reason in excluded.values()), 'Unexplained not-applicable criterion')
    for target in plan['targets']:
        original = source[target['key']]
        require(target['profile'] == original['category'] and target['owner_phase'] == original['phase'], 'Target category or phase changed')
        require(target['required'] == plan['profiles'][target['profile']]['required'], 'Target silently weakens its quality profile')
    phases = plan['phase_gates']
    require(set(phases) == {'5-1','5-2','5-3','5-4'}, 'Missing production phase')
    validate_graph(phases)
    roles, mounts = early_views(ledger)
    cumulative = set()
    environments = {k for k, a in source.items() if a['category'] == 'environment'}
    for name, phase in phases.items():
        expected = {k for k, a in source.items() if a['phase'] == name}
        cumulative |= expected
        require(set(phase['owned_keys']) == expected and len(phase['owned_keys']) == len(expected), 'Phase ownership has gaps or duplicates')
        audits = environments if name == '5-4' else set()
        require(set(phase['audit_keys']) == audits, 'Environment audit gate incomplete')
        require(set(phase['required_keys']) == expected | set(phase['early_required_keys']) | audits, 'Phase completion omits required targets')
        require(set(phase['cumulative_required_keys']) == cumulative | set(phase['early_required_keys']) | audits, 'Cumulative regression coverage incomplete')
        require(set(ENTRY) <= set(phase['entry']), 'Missing R5/R6/R7 readiness gate')
        require(phase['depends_on'] == ([] if name == '5-1' else ['5-' + str(int(name[-1]) - 1)]), 'Phase integration prerequisites changed')
    require(cumulative == set(source) - environments, 'Some creation targets have no production owner phase')
    require(set(phases['5-1']['early_required_keys']) == roles | mounts, 'Role preview or real mount bridge missing')
    require(all(not phases[p]['early_required_keys'] for p in ('5-2','5-3','5-4')), 'Unexpected cross-phase prerequisite')
    require(phases['5-4']['build_mode'] == 'complete', 'Final stage cannot allow legacy assets')
    require(set(plan['rider_candidates']).isdisjoint(plan['rider_excluded']), 'Rider applicability overlaps')
    actors = {a['key'] for a in source.values() if a['category'] == 'actor'}
    require(set(plan['rider_candidates']) | set(plan['rider_excluded']) == actors, 'Rider applicability incomplete')
    expected_riders = {v['actor_key'] for m, c in zip(ledger['monsters'], capabilities['monsters']) if c['rider_shape_candidate'] for v in m['views'].values()}
    require(set(plan['rider_candidates']) == expected_riders, 'Rider list differs from audited shape predicate')
    for target in plan['targets']:
        if target['profile'] == 'actor':
            require(target['actor']['mount_anchor'], 'Displayed mount anchor requirement missing')
            require(target['actor']['rider_pose'] == ('candidate-awaiting-R5-reachability' if target['key'] in expected_riders else 'excluded-by-shape'), 'Rider target/list disagreement')
    require(plan['auxiliary_gates'] == auxiliary(ledger), 'Auxiliary gates differ from R3 source ledger')


def build(ledger, capabilities):
    validate_capabilities(capabilities, ledger)
    assets = ledger['assets']
    require(len({a['key'] for a in assets}) == len(assets), 'Duplicate R3 asset key')
    profiles = {}
    for category, required in REQUIRED.items():
        profiles[category] = {
            'required': required,
            'not_applicable': NA_BY_PROFILE[category],
            'evaluation': 'definition-only; results belong to the R3 progress ledger and its evidence',
        }
    actor_details = {}
    rider_candidates, rider_excluded = [], []
    for m, source in zip(ledger['monsters'], capabilities['monsters']):
        reasons = []
        if not source['humanoid']:
            reasons.append('not-humanoid')
        if source['very_small']:
            reasons.append('very-small')
        if source['big']:
            reasons.append('big')
        families = sorted({ATTACK_FAMILIES[a['type']] for a in source['attacks'] if not a['empty']})
        for sex, view in m['views'].items():
            key = view['actor_key']
            actor_details[key] = {
                'visible_sex': sex, 'mount_anchor': 'required for displayed form, including hallucination',
                'rider_pose': 'candidate-awaiting-R5-reachability' if source['rider_shape_candidate'] else 'excluded-by-shape',
                'rider_exclusion_reasons': reasons,
                'native_attack_families': families,
                'static_attacks_are_exhaustive': False,
                'mount_entry_slithy_block_if_polymorphed': source['slithy'],
                'normal_polyok_flag': source['polyok'],
                'generic_event_pose': 'required for core-notified actions in hallucinated/changed display forms; do not restore actual hidden form',
            }
            (rider_candidates if source['rider_shape_candidate'] else rider_excluded).append(key)
    targets = []
    for a in assets:
        require(a['category'] in profiles, 'Unclassified quality profile')
        entry = {'key': a['key'], 'profile': a['category'], 'owner_phase': a['phase'],
                 'required': profiles[a['category']]['required'], 'assessment': 'not-performed-by-this-tool'}
        if a['category'] == 'actor':
            require(a['key'] in actor_details, 'Actor quality details missing')
            entry['actor'] = actor_details[a['key']]
        if a['category'] == 'hero-layer':
            entry['evaluated_in'] = 'raw layer plus all applicable 390 hero composites; do not assess a layer as an isolated complete character'
            entry['contexts'] = ['on-foot', 'mounted']
        if a['method'] in ('derive-from-new-actor', 'derive-from-new-mark'):
            entry['new_parent_required'] = a['source_asset']
        if a['method'] == 'compose-from-new-hero':
            entry['prerequisite_hero_library'] = ledger['hero']['layers_to_remake']
            entry['hero_recipe'] = a['hero_recipe']
        targets.append(entry)
    owned = {name: sorted(a['key'] for a in assets if a['phase'] == name) for name in ('5-1','5-2','5-3','5-4')}
    roles, mounts = early_views(ledger)
    early = sorted(roles | mounts)
    require(set(early) <= set(owned['5-2']), 'Early actor bridge must be owned by 5-2')
    phases = {}
    cumulative = set()
    aux = auxiliary(ledger)
    for index, name in enumerate(owned):
        cumulative |= set(owned[name])
        audits = aux['environment']['keys'] if name == '5-4' else []
        phases[name] = {
            'depends_on': [] if not index else [f'5-{index}'],
            'entry': ENTRY,
            'owned_keys': owned[name], 'early_required_keys': early if name == '5-1' else [],
            'audit_keys': audits,
            'required_keys': sorted(set(owned[name]) | (set(early) if name == '5-1' else set()) | set(audits)),
            'cumulative_required_keys': sorted(cumulative | (set(early) if name == '5-1' else set()) | set(audits)),
            'build_mode': 'complete' if name == '5-4' else 'incremental',
            'build_gates': ['A-09', 'A-10', 'A-11', 'isolated-save-restore', 'native-EN-JA-play', 'Claude-review'],
            'quality_gate': 'all applicable Q01-Q13 for required keys; cumulative current-build integration/regression; final stage covers all keys',
        }
    validate_graph(phases)
    require(len(set(k for group in owned.values() for k in group)) == sum(map(len, owned.values())), 'Phase ownership overlaps')
    summary = {
        'new_or_derived_targets': sum(a['category'] != 'environment' for a in assets),
        'environment_audits': sum(a['category'] == 'environment' for a in assets),
        'quality_targets': len(targets),
        'rider_shape_candidate_species': sum(m['rider_shape_candidate'] for m in capabilities['monsters']),
        'rider_shape_candidate_views': len(rider_candidates), 'rider_shape_excluded_views': len(rider_excluded),
        'rider_shape_candidates_with_polyok_flag': sum(m['rider_shape_candidate'] and m['polyok'] for m in capabilities['monsters']),
        'rider_shape_candidates_slithy': sum(m['rider_shape_candidate'] and m['slithy'] for m in capabilities['monsters']),
        'actual_riding_reachability_verified': False,
        'owned_by_phase': {k: len(v) for k, v in owned.items()},
        'phase_5_1_early_role_views': len(roles), 'phase_5_1_early_mount_views': len(mounts),
        'phase_5_1_required_views_and_layers': len(phases['5-1']['required_keys']),
        'final_required_with_environment': len(phases['5-4']['cumulative_required_keys']),
        'this_tool_assesses_art': False, 'this_tool_runs_game': False, 'this_tool_requests_images': False,
    }
    plan = {
        'schema': 'darkdungeon-quality-plan-v1', 'internal_audit_only': True,
        'scope_definition_sha256': digest(definition(ledger)),
        'capabilities_sha256': digest(capabilities),
        'criteria': CRITERIA, 'profiles': profiles, 'targets': targets,
        'rider_candidates': rider_candidates, 'rider_excluded': rider_excluded,
        'phase_gates': phases,
        'auxiliary_gates': aux,
        'runtime_action_handoffs': {'static_is_exhaustive': False,
            'cases': ['getmattk substitutions','SEDUCE=0 replacements','weapon/spell close and ranged branches','monster item use'],
            'R5': 'reachable scenario inventory including substitutions, entry/continuation riding, slithy, hallucination, wounded legs',
            'R6': 'observe actual chosen action/result without RNG or mutation; do not use static attack table as complete event list'},
        'no_quality_pass_inferred_from_inventory': True,
    }
    validate_plan(plan, ledger, capabilities)
    return plan, summary


def read_capabilities(root):
    root = root.resolve()
    values = {}
    provenances = {}
    for lang in ('en', 'ja'):
        path = root / lang / 'capabilities.json'
        provenance = load(root / lang / 'provenance.json')
        require(file_sha(path) == provenance['output_sha256'].lower(), 'Capability output hash mismatch')
        require(file_sha(Path(__file__).with_name('audit-capabilities.c')) == provenance['extractor_sha256'].lower(), 'Capability extractor changed')
        source_root = ROOT / ('build/nethack-ja' if lang == 'ja' else 'build/nethack')
        for source in provenance['inputs']:
            require(file_sha(source_root / source['path'].replace('\\','/')) == source['sha256'].lower(), 'Capability source changed: ' + source['path'])
        values[lang] = load(path)
        provenances[lang] = provenance
    require(values['en'] == values['ja'], 'English/Japanese capability mismatch')
    return values['en'], provenances


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('capabilities_root', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    capabilities, provenances = read_capabilities(args.capabilities_root)
    plan, summary = build(load(DATA / 'rendering-production-ledger.json'), capabilities)
    plan['source_provenance'] = provenances
    for filename, value in (('rendering-quality-plan.json', plan), ('rendering-quality-summary.json', summary)):
        path = DATA / filename
        if args.check:
            require(path.is_file() and load(path) == value, 'Quality plan is stale: ' + filename)
        else:
            path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'mode': 'check' if args.check else 'generate', 'status': 'passed',
                      'created_utc': datetime.now(timezone.utc).isoformat(),
                      'plan_sha256': file_sha(DATA / 'rendering-quality-plan.json'),
                      'source_outputs_sha256': {lang: p['output_sha256'] for lang, p in provenances.items()},
                      'summary': summary}, indent=2))


if __name__ == '__main__':
    main()
