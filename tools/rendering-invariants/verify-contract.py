"""Synthetic R6 definition/difference checks. Never extracts/runs game state."""
import copy
from datetime import datetime, timezone
import json
from pathlib import Path
from contract import DATA, DOMAINS, compare_paint, registry_sha, require, sha, validate_definition, validate_registry


def main():
    checks = []
    def check(condition, name):
        require(condition,name)
        checks.append(name)
    def rejected(callback, expected, name):
        try: callback()
        except ValueError as error:
            require(str(error) == expected, 'Wrong rejection reason: '+name+': '+str(error))
            checks.append('rejected: '+name)
        else: raise ValueError('Invalid synthetic fixture accepted: '+name)
    plan = json.loads((DATA/'rendering-invariant-contract.json').read_text(encoding='utf-8-sig'))
    validate_definition(plan)
    check(len(plan['invariants']) == 14 and len(plan['route_groups']) == 12, '14 invariants and 12 source route groups remain defined, not implemented')
    check(not plan['readiness']['runtime_ready'] and plan['readiness']['actual_field_bindings_verified'] == 0, 'no runtime or C-field completeness inferred')
    for label,mutate in (
        ('missing invariant',lambda p:p['invariants'].pop('INV03')),
        ('missing domain',lambda p:p['protected_domains'].remove('knowledge')),
        ('false runtime completion',lambda p:p['readiness'].update(runtime_ready=True)),
        ('legacy migration restored',lambda p:p.update(legacy_save_policy='migrate-existing-saves')),
        ('stale boundary allow table',lambda p:p.update(boundary_ports_sha256='b'*64)),
        ('boundary allow table unbound',lambda p:p.pop('boundary_ports_sha256')),
    ):
        bad = copy.deepcopy(plan); mutate(bad)
        rejected(lambda:validate_definition(bad),'Invariant definition differs from audited sources or required policy',label)
    rng = {'n':256,'r':['0'*16]*256,'m':['0'*16]*256,'a':'0'*16,'b':'0'*16,'c':'0'*16}
    registry = {'schema':'darkdungeon-normalization-registry-v1','entries':[]}
    before = {'schema':'darkdungeon-protected-projection-v1','case_id':'synthetic','language':'ja','build_id':'synthetic-build',
        'engine_sha256':'a'*64,'boundary_id':'ready-1','input_ordinal':1,'source_audit_sha256':plan['source_audit_sha256'],'boundary_ports_sha256':plan['boundary_ports_sha256'],
        'boundary_kind':'command-ready','port_function':'qt_nh_poskey.command','field_map_sha256':'f'*64,
        'normalization_registry_sha256':registry_sha(registry),'sampling_contract_id':'synthetic-sampling-v1',
        'coverage':{name:{'status':'complete','unbound_paths':[],'reason':'synthetic JSON only, not a real C-field map'} for name in DOMAINS},
        'protected':{name:{'synthetic_only':True,'value':0} for name in DOMAINS}}
    before['protected']['rng'] = {'core':copy.deepcopy(rng),'display':copy.deepcopy(rng)}
    def compare(left,right,boundary=plan['boundary_ports_sha256']): return compare_paint(left,right,plan['source_audit_sha256'],boundary,registry)
    result = compare(before,copy.deepcopy(before))
    check(result['protected_values_equal'] and not result['runtime_validated'], 'equal synthetic values do not certify actual game or paint')
    for domain in DOMAINS:
        after = copy.deepcopy(before)
        if domain == 'rng': after['protected']['rng']['core']['a']='0'*15+'1'
        else: after['protected'][domain]['value']=1
        result = compare(before,after)
        check(not result['protected_values_equal'] and result['difference_paths'][0].startswith('/'+domain+'/'), 'mutation detected in protected domain '+domain)
    after = copy.deepcopy(before)
    after['protected']['rng']['display']['r'][0]='0'*15+'1'
    check(not compare(before,after)['protected_values_equal'], 'display RNG consumption is detected independently of CORE')
    after = copy.deepcopy(before)
    after['protected']['hero']['value']=False
    check(not compare(before,after)['protected_values_equal'], 'boolean false is not silently equated to integer zero')
    for status in ('partial','unsupported'):
        incomplete=copy.deepcopy(before)
        incomplete['coverage']['world']={'status':status,'unbound_paths':['unloaded-levels'],'reason':'synthetic missing decoder'}
        result=compare(incomplete,copy.deepcopy(incomplete))
        check(result['verdict'] == 'unconfirmed' and result['protected_values_equal'] is None, status+' coverage never produces equal')
    missing_rng=copy.deepcopy(before)
    missing_rng['coverage']['rng']={'status':'unsupported','unbound_paths':['private ISAAC64 contexts'],'reason':'synthetic unavailable observer'}
    missing_rng['protected']['rng']=None
    check(compare(missing_rng,copy.deepcopy(missing_rng))['verdict'] == 'unconfirmed','unavailable RNG can be represented without fabricated zero state')
    check(compare(missing_rng,before)['verdict'] == 'unconfirmed','availability change is not falsely reported as a rule-state difference')
    for kind,port in (('prompt-paused','qt_yn_function.getdir'),('core-suspended','qt_delay_output.tmp_at'),('core-suspended','qt_display_nhwindow.more')):
        point=copy.deepcopy(before); point.update(boundary_kind=kind,port_function=port)
        check(compare(point,copy.deepcopy(point))['verdict'] == 'equal', 'same suspended boundary supported: '+kind)
    ordered=copy.deepcopy(before); ordered['protected']['objects']['ordered_ids']=[1,2]
    reordered=copy.deepcopy(ordered); reordered['protected']['objects']['ordered_ids']=[2,1]
    check(compare(ordered,reordered)['verdict'] == 'different', 'rule-relevant chain order is protected')
    wildcard={'schema':'darkdungeon-normalization-registry-v1','entries':[{'path':'/memory/*/glyph','c_root':'levl[1][1].glyph','reason':'synthetic','case_id':'synthetic','comparison_kind':'cross-build-fixed-sampling','transform':'exact-id-reference','review_sha256':'b'*64,'guards':['synthetic']} ]}
    rejected(lambda:validate_registry(wildcard),'Normalization needs an exact output path, no wildcard','wildcard normalization exclusion')
    paint_registry=copy.deepcopy(wildcard); paint_registry['entries'][0].update(path='/memory/cells/1/glyph',comparison_kind='paint')
    rejected(lambda:validate_registry(paint_registry),'Paint cannot normalize protected state','paint normalization of protected state')
    sampled=copy.deepcopy(wildcard)
    sampled['entries'][0].update(path='/memory/cells/L1-2-3/glyph',comparison_kind='cross-build-sampling-change',transform='sampled-memory-glyph',
        guards=['sampling-contracts-differ','both-recorded-hallucinated-disp-samples','same-level-position-and-update-order','terrain-and-non-glyph-memory-equal','CORE-and-rule-results-equal'])
    leaves={'/memory/cells/L1-2-3/glyph':{'is_leaf':True,'c_root':'levl[1][1].glyph','classification':'disp-memory-glyph'}}
    validate_registry(sampled,leaves)
    check(True,'narrow sampled-memory normalization definition has all guards; actual application remains unimplemented')
    sampled['entries'][0]['guards'].pop()
    rejected(lambda:validate_registry(sampled,leaves),'Sampled memory exception guards incomplete','memory exception missing CORE parity guard')
    for path,reason in (
        ('/memory','Normalization path is not a canonical protected leaf path'),
        ('/rule_flags/iflags','Normalization path is not a canonical protected leaf path'),
        ('/rng/core/a','RNG and clock normalization is forbidden'),
        ('/clock/provider/cursor','RNG and clock normalization is forbidden'),
        ('/memory//glyph','Normalization path is not a canonical protected leaf path'),
        ('/memory/cells/bad~2glyph','Normalization path is not a canonical protected leaf path'),
        ('/unknown/cells/value','Normalization path is not a canonical protected leaf path'),
        ('/memory/cells/unbound','Normalization path has no field-map leaf binding'),
    ):
        bad=copy.deepcopy(sampled); bad['entries'][0]['path']=path
        rejected(lambda:validate_registry(bad,leaves),reason,'unsafe normalization path '+path)
    subtree=copy.deepcopy(leaves); subtree['/memory/cells/L1-2-3/glyph']['is_leaf']=False
    rejected(lambda:validate_registry(sampled,subtree),'Normalization disagrees with field-map leaf classification','subtree declared as a normalization leaf')
    for name,change,expected in (
        ('unknown stop point',lambda p:p.update(port_function='qt_nhgetch'),'Unknown window-port stop point'),
        ('prompt stop point claimed as command-ready',lambda p:p.update(port_function='qt_yn_function.yn'),'Window-port stop point is not allowed for this boundary kind'),
        ('delay stop point claimed as prompt',lambda p:p.update(boundary_kind='prompt-paused',port_function='qt_delay_output.dobuzz'),'Window-port stop point is not allowed for this boundary kind'),
        ('different input',lambda p:p.update(input_ordinal=2),'Paint comparison crosses case/build/input boundary'),
        ('different language',lambda p:p.update(language='en'),'Paint comparison crosses case/build/input boundary'),
        ('different case',lambda p:p.update(case_id='other'),'Paint comparison crosses case/build/input boundary'),
        ('different build',lambda p:p.update(build_id='other'),'Paint comparison crosses case/build/input boundary'),
        ('different engine',lambda p:p.update(engine_sha256='b'*64),'Paint comparison crosses case/build/input boundary'),
        ('different boundary',lambda p:p.update(boundary_id='other'),'Paint comparison crosses case/build/input boundary'),
        ('different boundary kind',lambda p:p.update(boundary_kind='core-suspended',port_function='qt_delay_output.explode'),'Paint comparison crosses case/build/input boundary'),
        ('different field map',lambda p:p.update(field_map_sha256='b'*64),'Paint comparison crosses case/build/input boundary'),
        ('different registry',lambda p:p.update(normalization_registry_sha256='b'*64),'Normalization registry hash mismatch'),
        ('stale source audit',lambda p:p.update(source_audit_sha256='b'*64),'Projection source audit mismatch'),
        ('projection names another allow table',lambda p:p.update(boundary_ports_sha256='b'*64),'Projection boundary allow table mismatch'),
        ('projection without an allow table',lambda p:p.pop('boundary_ports_sha256'),'Invalid protected projection header'),
        ('missing knowledge',lambda p:p['protected'].pop('knowledge'),'Protected domain missing or unknown'),
        ('floating state',lambda p:p['protected']['hero'].update(value=0.5),'Floating/unsupported value in exact projection'),
        ('unsafe large integer',lambda p:p['protected']['hero'].update(value=2**64-1),'Use typed exact strings for larger integers'),
        ('missing DISP',lambda p:p['protected']['rng'].pop('display'),'Both protected RNG streams required'),
    ):
        after=copy.deepcopy(before); change(after)
        rejected(lambda:compare(before,after),expected,name)
    delayed=copy.deepcopy(before); delayed.update(boundary_kind='core-suspended',port_function='qt_delay_output.tmp_at')
    other_delay=copy.deepcopy(delayed); other_delay.update(port_function='qt_delay_output.explode')
    rejected(lambda:compare(delayed,other_delay),'Paint comparison crosses case/build/input boundary','different stop point of the same kind')
    other_table=copy.deepcopy(before); other_table['boundary_ports_sha256']='c'*64
    rejected(lambda:compare(other_table,copy.deepcopy(other_table),'c'*64),'Boundary allow table differs from the R6 definition','allow table on disk differs from the one the definition binds')
    print(json.dumps({'mode':'synthetic-definition-verification','created_utc':datetime.now(timezone.utc).isoformat(),
        'checks_passed':len(checks),'checks':checks,'contract_sha256':sha(DATA/'rendering-invariant-contract.json'),
        'tool_sha256':{p.name:sha(p) for p in (Path(__file__),Path(__file__).with_name('contract.py'),Path(__file__).with_name('audit-source.py'))},
        'synthetic_only':True,'game_executed':False,'runtime_ready':False},indent=2))


if __name__ == '__main__': main()
