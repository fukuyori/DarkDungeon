"""Static R4 scope/quality-gate checks. Does not assess art or execute NetHack.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import copy
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'docs/data'


def main():
    spec = importlib.util.spec_from_file_location('quality', Path(__file__).with_name('build-quality-plan.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    ledger = module.load(DATA / 'rendering-production-ledger.json')
    plan = module.load(DATA / 'rendering-quality-plan.json')
    capabilities, provenance = module.read_capabilities(Path(sys.argv[1]))
    module.require(plan['source_provenance'] == provenance, 'Plan capability provenance is stale')
    module.validate_plan(plan, ledger, capabilities)
    module.validate_capabilities(capabilities, ledger)
    checks = ['all R3 targets, criteria applicability, phase gates and rider views validated']

    def check(condition, name):
        if not condition:
            raise ValueError(name)
        checks.append(name)

    def rejected(callback, name):
        try:
            callback()
        except ValueError:
            checks.append('negative fixture rejected: ' + name)
        else:
            raise ValueError('Invalid plan accepted: ' + name)

    check(len(plan['targets']) == 2287, '2165 creation/derivation targets and 122 retained environment audits present')
    check(len(plan['rider_candidates']) == 286 and len(plan['rider_excluded']) == 480, 'all 766 visible forms classified for shape-only rider eligibility')
    source = {m['symbol']: m for m in capabilities['monsters']}
    check(source['HUMAN']['rider_shape_candidate'], 'human passes shape-only rider conditions')
    check(not source['GIANT']['rider_shape_candidate'] and source['GIANT']['big'], 'large humanoid excluded by size')
    dog_keys = {v['actor_key'] for m in ledger['monsters'] if m['symbol'] == 'LITTLE_DOG' for v in m['views'].values()}
    check(not source['LITTLE_DOG']['rider_shape_candidate'] and not source['LITTLE_DOG']['humanoid'] and all(t['actor']['mount_anchor'] for t in plan['targets'] if t['key'] in dog_keys), 'non-humanoid excluded as rider while displayed-mount anchor stays required')
    phases = plan['phase_gates']
    check([len(phases[p]['owned_keys']) for p in ('5-1','5-2','5-3','5-4')] == [42,766,1204,153], 'phase ownership partitions all 2165 production targets')
    check(len(phases['5-1']['required_keys']) == 74 and len(phases['5-1']['early_required_keys']) == 32, '26 role and six real-mount views required early without phase completion cycle')
    check(len(phases['5-4']['audit_keys']) == 122 and len(phases['5-4']['cumulative_required_keys']) == 2287, 'all environment keys and cumulative targets have a final gate')
    check(source['SALAMANDER']['rider_shape_candidate'] and source['SALAMANDER']['slithy'] and source['SALAMANDER']['polyok'], 'slithy shape stays a continuation candidate, not an unrestricted mount-entry claim')
    check(module.ATTACK_FAMILIES['AT_MAGC'] == 'spell' and plan['runtime_action_handoffs']['static_is_exhaustive'] is False, 'static spell/weapon types do not close dynamic action coverage')
    check(all('Q13' in plan['profiles'][name]['required'] for name in ('hero-layer','actor','item','statue')), 'small UI portraits and item images have explicit readability criteria')
    check(all({'Q03','Q06','Q09','Q10','Q11','Q12'} <= set(p['required']) for name, p in plan['profiles'].items() if name != 'ui-illustration'), 'all gameplay profiles include style, transparency, privacy, routes, reset and deployment')
    check('Q07' in plan['profiles']['actor']['required'] and 'Q08' in plan['profiles']['actor']['required'], 'all actor forms receive movement and action criteria, not representative-only checks')
    check('Q07' in plan['profiles']['item']['not_applicable'] and 'Q08' in plan['profiles']['item']['required'], 'static items avoid intrinsic walking but retain core projectile/action checks')
    check(all(a['type'] == 'AT_NONE' for m in capabilities['monsters'] for a in m['attacks'] if a['empty']), 'empty attack slots are not real actions')
    check(plan['scope_definition_sha256'] == module.digest(module.definition(ledger)), 'quality plan references current R3 definitions')
    progress_changed = copy.deepcopy(ledger)
    progress_changed['assets'][0]['tracking']['request'] = 'requested'
    check(module.digest(module.definition(progress_changed)) == plan['scope_definition_sha256'], 'progress edits do not silently rewrite quality definitions')
    bad = copy.deepcopy(plan)
    bad['targets'].pop()
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'missing quality target')
    bad = copy.deepcopy(plan)
    bad['targets'].append(copy.deepcopy(bad['targets'][0]))
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'duplicate quality target')
    bad = copy.deepcopy(plan)
    bad['profiles']['item']['not_applicable']['Q07'] = ''
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'not-applicable without reason')
    bad = copy.deepcopy(plan)
    next(t for t in bad['targets'] if t['profile'] == 'actor')['required'].remove('Q08')
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'one actor exempted from action quality')
    bad = copy.deepcopy(plan)
    bad['phase_gates']['5-1']['depends_on'] = ['5-2']
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'phase dependency cycle')
    bad = copy.deepcopy(plan)
    bad['phase_gates']['5-1']['early_required_keys'] = []
    bad['phase_gates']['5-1']['required_keys'] = bad['phase_gates']['5-1']['owned_keys']
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'role preview prerequisite omitted')
    bad = copy.deepcopy(plan)
    role_keys, mount_keys = module.early_views(ledger)
    for field in ('early_required_keys', 'required_keys', 'cumulative_required_keys'):
        bad['phase_gates']['5-1'][field] = [k for k in bad['phase_gates']['5-1'][field] if k not in mount_keys]
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'real mounted-view prerequisites omitted')
    bad = copy.deepcopy(plan)
    bad['phase_gates']['5-4']['audit_keys'].pop()
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'retained environment absent from final gate')
    bad = copy.deepcopy(plan)
    bad['auxiliary_gates']['reserved_slots']['count'] -= 1
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'auxiliary count diverges from actual atlas slots')
    bad = copy.deepcopy(plan)
    next(t for t in bad['targets'] if t['profile'] == 'actor')['actor']['mount_anchor'] = ''
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'displayed mount loses its anchor requirement')
    bad = copy.deepcopy(plan)
    next(t for t in bad['targets'] if t['key'] in bad['rider_candidates'])['actor']['rider_pose'] = 'excluded-by-shape'
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'rider target disagrees with candidate list')
    bad = copy.deepcopy(plan)
    bad['phase_gates']['5-1']['entry'].remove('R5-scenarios-ready')
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'required R5 scenarios not ready')
    bad = copy.deepcopy(plan)
    bad['phase_gates']['5-4']['build_mode'] = 'incremental'
    rejected(lambda: module.validate_plan(bad, ledger, capabilities), 'final stage still permits legacy assets')
    bad = copy.deepcopy(capabilities)
    bad['monsters'][0]['rider_shape_candidate'] = not bad['monsters'][0]['rider_shape_candidate']
    rejected(lambda: module.validate_capabilities(bad, ledger), 'rider candidate inconsistent with core shape conditions')
    bad = copy.deepcopy(capabilities)
    bad['monsters'][0]['attacks'][0]['type'] = 'AT_UNKNOWN'
    rejected(lambda: module.validate_capabilities(bad, ledger), 'new unclassified attack kind')
    check(all(t['assessment'] == 'not-performed-by-this-tool' for t in plan['targets']), 'plan generation does not claim art quality passed')
    print(json.dumps({'mode': 'static-policy-verification', 'plan_sha256': module.file_sha(DATA / 'rendering-quality-plan.json'), 'en_ja_provenance_verified': True, 'checks_passed': len(checks), 'checks': checks, 'game_executed': False, 'art_quality_assessed': False}, indent=2))


if __name__ == '__main__':
    main()
