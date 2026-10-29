"""R6 definition and synthetic projection comparison. No C-state extraction.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT/'docs/data'
DOMAINS = ['hero','rule_flags','context','objects','monsters','world','memory','knowledge','progress','control','rng','clock','auxiliary']
INVARIANTS = {
    'INV01':'paint reads an immutable published generation; no core calls or live entity pointers',
    'INV02':'only core-authorized appearances, positions, layers and effects enter presentation',
    'INV03':'display sampling is owned by core preparation; repeat paint and UI timers consume no RNG',
    'INV04':'events describe selected legal attempts/results, never infer success from legacy entry hooks',
    'INV05':'projectile/beam/explosion paths contain only explicitly authorized public samples',
    'INV06':'level/session/entity/view generations invalidate stale motion and hidden actors',
    'INV07':'animation adds no command, turn, rule delay, input gate or nested core dispatch',
    'INV08':'one monotonic presentation timestamp per frame drives actor and camera; no core calendar read',
    'INV09':'typed private projections protect all rule state, knowledge, control and both RNG streams',
    'INV10':'record/control every core clock and seed source throughout process lifetime without state injection',
    'INV11':'fresh post-improvement fixtures; ordinary save format and default loader remain authoritative',
    'INV12':'metadata/file bindings, full semantic differences and predeclared normalization only',
    'INV13':'native EN and JA source/field/notification maps audited separately',
    'INV14':'idle checkpoint/save writes are explicit core operations, never counted as pure painting',
}
BOUNDARY_KINDS = ['command-ready','prompt-paused','core-suspended']


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def definition():
    audit = json.loads((DATA/'rendering-invariant-audit.json').read_text(encoding='utf-8-sig'))
    return {'schema':'darkdungeon-invariant-contract-v1','source_audit_sha256':sha(DATA/'rendering-invariant-audit.json'),
        'fixture_plan_sha256':sha(DATA/'rendering-fixture-plan.json'), 'boundary_ports_sha256':sha(DATA/'rendering-boundary-ports.json'),
        'invariants':INVARIANTS,
        'protected_domains':DOMAINS, 'source_counts':{k:v['counts'] for k,v in audit['languages'].items()},
        'boundary_kinds':BOUNDARY_KINDS,
        'projection_coverage':{'statuses':['complete','partial','unsupported'],'per_domain':['status','unbound_paths','reason'],
                               'required_bindings':['field_map_sha256','normalization_registry_sha256','sampling_contract_id'],
                               'verdicts':['equal','different','unconfirmed'],'paint_normalization':False},
        'route_groups':list(audit['languages']['en']['routes']),
        'field_binding_policy':'every active rule field and private mutable rule static must be bound or explicitly reviewed; no silent omission',
        'view_exclusions':'presentation-only fields require an exact predeclared path/source/reason; no heuristic wildcard exclusions',
        'event_payload':'copied public values and opaque generation-scoped display handles; no true entity/object id or pointer',
        'legacy_save_policy':'discard-pre-improvement-saves; no migration requirement',
        'legacy_animation_policy':'phase0 removes production legacy attack hooks and live-position inference before accepted baseline; never run alongside new notifications',
        'readiness':{'runtime_ready':False,'core_observer_implemented':False,'notification_adapter_implemented':False,'actual_field_bindings_verified':0}}


def validate_definition(value):
    require(value == definition(), 'Invariant definition differs from audited sources or required policy')


def registry_sha(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf-8')).hexdigest()


def validate_registry(value, leaf_bindings=None):
    require(isinstance(value,dict) and set(value) == {'schema','entries'} and value['schema'] == 'darkdungeon-normalization-registry-v1' and isinstance(value['entries'],list), 'Invalid normalization registry')
    keys = {'path','c_root','reason','comparison_kind','transform','case_id','review_sha256','guards'}
    for entry in value['entries']:
        require(isinstance(entry,dict) and set(entry) == keys, 'Incomplete normalization entry')
        require(isinstance(entry['path'],str) and entry['path'].startswith('/') and not any(c in entry['path'] for c in '*?[]'), 'Normalization needs an exact output path, no wildcard')
        parts = entry['path'].split('/')[1:]
        require(len(parts) >= 3 and all(parts) and not re.search(r'~(?![01])',entry['path']) and parts[0] in DOMAINS, 'Normalization path is not a canonical protected leaf path')
        require(parts[0] not in ('rng','clock'), 'RNG and clock normalization is forbidden')
        require(all(isinstance(entry[k],str) and entry[k] for k in ('c_root','reason','case_id')), 'Normalization source/reason/case missing')
        require(entry['comparison_kind'] in ('cross-build-fixed-sampling','cross-build-sampling-change','save-restore'), 'Paint cannot normalize protected state')
        require(entry['transform'] in ('exact-id-reference','presentation-field-separation','sampled-memory-glyph'), 'Unknown normalization transform')
        require(isinstance(leaf_bindings,dict) and entry['path'] in leaf_bindings, 'Normalization path has no field-map leaf binding')
        leaf = leaf_bindings[entry['path']]
        categories = {'exact-id-reference':'id-reference','presentation-field-separation':'presentation-only','sampled-memory-glyph':'disp-memory-glyph'}
        require(isinstance(leaf,dict) and leaf.get('is_leaf') is True and leaf.get('c_root') == entry['c_root'] and leaf.get('classification') == categories[entry['transform']], 'Normalization disagrees with field-map leaf classification')
        require(isinstance(entry['review_sha256'],str) and re.fullmatch(r'[0-9a-f]{64}',entry['review_sha256']), 'Normalization review record missing')
        require(isinstance(entry['guards'],list) and entry['guards'] and all(isinstance(g,str) and g for g in entry['guards']), 'Normalization guards missing')
        if entry['transform'] == 'sampled-memory-glyph':
            require(entry['comparison_kind'] == 'cross-build-sampling-change' and entry['path'].startswith('/memory/'), 'Sampled memory exception has wrong scope')
            require(set(entry['guards']) == {'sampling-contracts-differ','both-recorded-hallucinated-disp-samples','same-level-position-and-update-order','terrain-and-non-glyph-memory-equal','CORE-and-rule-results-equal'}, 'Sampled memory exception guards incomplete')


def validate_projection(value, audit_sha, boundary_sha, registry):
    keys = {'schema','case_id','language','build_id','engine_sha256','boundary_id','boundary_kind','port_function','input_ordinal','source_audit_sha256','boundary_ports_sha256','field_map_sha256','normalization_registry_sha256','sampling_contract_id','coverage','protected'}
    require(isinstance(value, dict) and set(value) == keys and value['schema'] == 'darkdungeon-protected-projection-v1', 'Invalid protected projection header')
    for name in ('case_id','build_id','boundary_id','port_function','sampling_contract_id'):
        require(isinstance(value[name],str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,127}', value[name]), 'Invalid projection identity')
    require(value['language'] in ('en','ja') and isinstance(value['engine_sha256'],str) and re.fullmatch(r'[0-9a-f]{64}',value['engine_sha256']), 'Invalid projection language/build')
    require(type(value['input_ordinal']) is int and value['input_ordinal'] >= 0, 'Invalid input ordinal')
    require(value['source_audit_sha256'] == audit_sha, 'Projection source audit mismatch')
    require(value['boundary_kind'] in BOUNDARY_KINDS, 'Invalid suspended/ready boundary kind')
    # #106/#167: the stop point must be allowed by the allow table that the R6
    # definition binds, and the projection must name that same table. The caller
    # passes boundary_sha from a definition already checked by validate_definition.
    # The table is hashed and parsed from one read.
    require(value['boundary_ports_sha256'] == boundary_sha, 'Projection boundary allow table mismatch')
    raw = (DATA/'rendering-boundary-ports.json').read_bytes()
    require(hashlib.sha256(raw).hexdigest() == boundary_sha, 'Boundary allow table differs from the R6 definition')
    from boundary import validate_point
    validate_point(value['boundary_kind'], value['port_function'], None, json.loads(raw.decode('utf-8-sig')))
    require(isinstance(value['field_map_sha256'],str) and re.fullmatch(r'[0-9a-f]{64}',value['field_map_sha256']), 'Projection field map missing')
    require(value['normalization_registry_sha256'] == registry_sha(registry), 'Normalization registry hash mismatch')
    require(isinstance(value['coverage'],dict) and set(value['coverage']) == set(DOMAINS), 'Coverage domain missing')
    for item in value['coverage'].values():
        require(isinstance(item,dict) and set(item) == {'status','unbound_paths','reason'} and item['status'] in ('complete','partial','unsupported'), 'Invalid coverage status')
        require(isinstance(item['unbound_paths'],list) and all(isinstance(p,str) and p for p in item['unbound_paths']), 'Invalid unbound field paths')
        require(isinstance(item['reason'],str) and item['reason'], 'Coverage reason missing')
        require((not item['unbound_paths']) if item['status'] == 'complete' else bool(item['unbound_paths']), 'Coverage status and unbound paths disagree')
    require(isinstance(value['protected'],dict) and set(value['protected']) == set(DOMAINS), 'Protected domain missing or unknown')

    def exact_json(node):
        if isinstance(node,dict):
            require(all(isinstance(k,str) for k in node), 'Projection keys must be strings')
            for child in node.values(): exact_json(child)
        elif isinstance(node,list):
            for child in node: exact_json(child)
        else:
            require(node is None or type(node) in (str,bool,int), 'Floating/unsupported value in exact projection')
            if type(node) is int:
                require(abs(node) <= 9007199254740991, 'Use typed exact strings for larger integers')
    exact_json(value['protected'])
    rng = value['protected']['rng']
    complete_rng = value['coverage']['rng']['status'] == 'complete'
    if not complete_rng and rng is None:
        return
    require(isinstance(rng,dict) and (set(rng) == {'core','display'} if complete_rng else set(rng) <= {'core','display'}), 'Both protected RNG streams required')
    for stream in rng.values():
        require(isinstance(stream,dict) and set(stream) == {'n','r','m','a','b','c'}, 'Incomplete protected RNG state')
        require(type(stream['n']) is int and 0 <= stream['n'] <= 256, 'Invalid protected RNG cursor')
        for field in ('r','m'):
            require(isinstance(stream[field],list) and len(stream[field]) == 256, 'Incomplete protected RNG array')
        require(all(isinstance(word,str) and re.fullmatch(r'[0-9a-f]{16}',word) for word in stream['r']+stream['m']+[stream['a'],stream['b'],stream['c']]), 'Invalid exact protected RNG word')


def differences(left, right, path=''):
    if type(left) is not type(right): return [path or '/']
    if isinstance(left,dict):
        result = []
        for key in sorted(set(left)|set(right)):
            pointer = path+'/'+key.replace('~','~0').replace('/','~1')
            result.extend([pointer] if key not in left or key not in right else differences(left[key],right[key],pointer))
        return result
    if isinstance(left,list):
        if len(left) != len(right): return [path]
        return [p for i,(a,b) in enumerate(zip(left,right)) for p in differences(a,b,path+'/'+str(i))]
    return [] if left == right else [path]


def compare_paint(before, after, audit_sha, boundary_sha, registry, leaf_bindings=None):
    validate_registry(registry,leaf_bindings)
    validate_projection(before,audit_sha,boundary_sha,registry)
    validate_projection(after,audit_sha,boundary_sha,registry)
    require(all(before[k] == after[k] for k in ('case_id','language','build_id','engine_sha256','boundary_id','boundary_kind','port_function','input_ordinal','field_map_sha256','sampling_contract_id')), 'Paint comparison crosses case/build/input boundary')
    incomplete = sorted({d for point in (before,after) for d,item in point['coverage'].items() if item['status'] != 'complete'})
    observed_delta = differences(before['protected'],after['protected'])
    delta = [p for p in observed_delta if p.split('/')[1] not in incomplete]
    uncertain_delta = [p for p in observed_delta if p.split('/')[1] in incomplete]
    verdict = 'different' if delta else 'unconfirmed' if incomplete else 'equal'
    return {'verdict':verdict,'protected_values_equal':False if delta else None if incomplete else True,
            'incomplete_domains':incomplete,'difference_paths':delta,'unconfirmed_difference_paths':uncertain_delta,'game_executed':False,'runtime_validated':False,
            'scope':'provided JSON values only; no C-field extraction/completeness or actual paint verified'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args = parser.parse_args()
    path = DATA/'rendering-invariant-contract.json'
    value = definition()
    if args.check:
        validate_definition(json.loads(path.read_text(encoding='utf-8-sig')))
    else:
        path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'mode':'check' if args.check else 'generate','created_utc':datetime.now(timezone.utc).isoformat(),
        'contract_sha256':sha(path),'tool_sha256':sha(Path(__file__)),'runtime_ready':False,'game_executed':False},indent=2))


if __name__ == '__main__': main()
