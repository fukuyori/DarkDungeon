"""R7 reference/prototype definitions. Produces JSON, never images or a game.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT/'docs/data'
HISTORY = [
    ('legacy-source','artifacts/stone-dungeon-tested-sources/en/win/Qt/qt_druaga.cpp','bd0e9cc3e566eb20e23172a9cb5a6b29a47792d4f83548082e8936d8bcfcada1',None),
    ('legacy-image','artifacts/smoke-en-windows-20261008-200152/realtime.png','ec1c0c60ece08ca0ac2746cc58a993b2faf11b7c9bd5a1b61e795b1eca8a27b5',[1100,760]),
    ('normal-en-image','artifacts/smoke-en-windows-20261010-205645/nethack-qt.png','f34775448dc2318b5b18a4acedf4565900c6479db5e15a4f84ace4e240ae9517',[1400,900]),
    ('normal-ja-image','artifacts/smoke-ja-windows-20261010-205702/nethack-qt.png','08e7649f2ed12e3947340c7021d8e88eb708620dc68ac33ad55edbc34aa9d8b2',[1400,900]),
]
INPUTS = ['rendering-production-ledger.json','rendering-quality-plan.json','rendering-item-briefs.json','rendering-fixture-plan.json','rendering-invariant-contract.json']
HERO = ['body_human_female','body_human_male','cape','hair_female','hair_male','outfit_knight','weapon_knight','shield_knight']
SPECIES = ['SOLDIER','PONY','GREEN_SLIME','RED_DRAGON']
ITEMS = [('weapon','long sword'),('armor','plate mail'),('potion','ruby'),('tool','chest'),('tool','bag'),('tool','lamp'),('gem','gray')]
CAPTURE_FIELDS = ['capture_id','phase/build/session/case/input/checkpoint','language','case_kind/assistance','actual_engine/frontend_files_and_sha256','source_generation_and_dirty_diff','data/asset_manifest/settings_sha256','R5_fixture_and_R6_sampling/field_map/normalization_ids','public_display_generation_and_appearance_keys','capture_backend','window_client_and_map_rect_logical','capture_rect_pixels','actual_dpr_and_OS_scale','tile/draw_frame/zoom','foreground_bbox_and_body_annotation_method','event_and_frame_monotonic_timestamps','input/publication/presentation_timing','raw_media_paths_sha256','known_failures_and_verdicts']
CAPTURE_FIELDS += ['comparison_class','conformance','role','approval_record(author,date,style_guide_version,style_guide_sha256,scope,status)']
SUITES = {
    'G36':{'map_logical_px':[864,432],'tile_logical_px':[36,36],'target_actor_frame_logical_px':[54,54],'complete_cells':[24,12],
           'source_to_frame_scale':[9,8],'terrain_source_to_tile_scale':[3,4],'quality_judgement_allowed':False,'purpose':'ratio/composition diagnostic only'},
    'G48':{'map_logical_px':[864,432],'tile_logical_px':[48,48],'target_actor_frame_logical_px':[72,72],'complete_cells':[18,9],
           'source_to_frame_scale':[3,2],'terrain_source_to_tile_scale':[1,1],'quality_judgement_allowed':True,'purpose':'native display readability; source pixel quality checked separately at 1:1'},
}
COVERAGE = {'languages':['en','ja'],'windows_logical_px':[[960,640],[1395,850],[1920,1080]],'maximized':True,'OS_scale_percent':[100,150,200],
    'scenes':['bright-floor','dark-floor','wall-corner','stairs','adjacent-overlap','inventory-equipment-selection','tiny-marks','Rogue-graphical','explicit-ASCII-roundtrip'],
    'motion':['direction-and-idle','straight-turn-continuous-input','camera-zoom-scroll','attack-hit-miss-damage','projectile-beam-explosion','visibility-form-mount-transition','save-restore-level-transition','dense-effects-and-focus-return']}
CLASSES=['paired-controlled-public-scene','layout-only','advisory-unpaired','renderer-support']
PROMOTION_REQUIRES=['Antigravity-origin-and-editable-source-record','R1-format-and-resolver-validation','R2-public-appearance-binding','R3-existing-key-no-extra-count','R4-applicable-quality-evidence','unchanged-hash-and-approved-style-version']
PHASE2_ELIGIBILITY='only after recorded R1-R4 per-target acceptance; full phase5 gates still required'
FREEZES={'phase0':'verified current-renderer evidence, current assets and failures; no final style approval',
         'phase2':'bootstrap unapproved direction and terrain -> metadata proposal -> validated grid/anchors/layer order -> Antigravity prototypes -> Lemon visual approval -> versioned style-guide',
         'phase3-4':'Lemon-approved motion/camera/attack timings and measured video; freeze before bulk phase5'}
STYLE_BOOTSTRAP={'stage':'unapproved-text-direction-before-first-prototype','style_guide_version':None,'style_guide_sha256':None,
    'direction':'Original readable top-down pixel art harmonizing with retained stone terrain; propose viewpoint/light/palette, do not copy legacy characters.',
    'terrain_input':'only separately authorized retained-terrain reference; no historic character screenshots',
    'metadata_before_images':True}
MATRIX_POLICY={
    'platform':'Windows native first; Linux/macOS separate native checks, never inferred from Windows',
    'phase0_required':'EN and JA at current measured OS scale: 960x640 and maximized; exact G36/G48 viewport lock in a fitting native window',
    'layout_full_matrix':'EN/JA x [960x640,1395x850,1920x1080,maximized] x [100,150,200] = 24; full A09 gates in phase5 and phase6 require all rows; phase0/1 record current-scale 960x640 and maximized baseline plus feasible extra rows without claiming blocked rows passed',
    'art_required':'all 26 selected keys and applicable directions/frames on four backgrounds at native G48; source originals separately at 1:1; tiny marks at exact native sizes',
    'motion_representative':'each declared motion family in EN/JA at recorded fixed hardware, OS scale and G48; calibration representatives never waive per-key R4 motion checks; extra G36 is diagnostic, not source-art acceptance',
    'scene_product':'do not blindly multiply all scenes by all axes; bind each required scene/Q to actual cases before its phase gate',
    'unavailable':'record planned/not-run/blocked-environment with actual desktop/workarea/DPR and reason; never N/A or pass merely because window does not fit; required incomplete rows block their gate',
}
GATE_REQUIREMENTS={'name':'R7-comparison-artifacts-ready','ready':False,
    'requires':['phase0-source-bound-runnable-baseline-and-raw-media','required-case-matrix-with-provenance-and-measurements','phase2-new-art-style-guide-with-Lemon-approval','phase3-4-motion-videos-and-calibrated-timing','R4-per-target-quality-links-and-reviewed-known-gaps']}
HERO_TEXT={'body_human_female':'Human body base with a female appearance','body_human_male':'Human body base with a male appearance',
    'cape':'Neutral cloak base suitable for runtime recoloring','hair_female':'Hair layer for the female hero appearance','hair_male':'Hair layer for the male hero appearance',
    'outfit_knight':'Knight clothing and armor layer','weapon_knight':'Knight sword layer','shield_knight':'Knight shield layer'}
MARK_TEXT={'mark.petmark':'Friendly companion indicator','mark.petmark-small':'Small derivative of the friendly companion indicator','mark.pilemark':'Indicator for multiple ground items'}


def history_catalog():
    scopes={'legacy-source':'source definitions inspected, image/build relation unverified','legacy-image':'visually inspected; hash/dimensions checked',
            'normal-en-image':'visually inspected; hash/dimensions checked','normal-ja-image':'hash/dimensions only; not visually reviewed in R7'}
    return [{'id':name,'path':path,'sha256':digest,'image_px':size,'availability':'local-artifacts-only; optional advisory reference','inspection_scope':scopes[name]} for name,path,digest,size in HISTORY]


def layout_matrix():
    windows=[('960x640',[960,640]),('1395x850',[1395,850]),('1920x1080',[1920,1080]),('maximized',None)]
    return [{'id':f'layout-{lang}-{name}-{scale}','language':lang,'window_profile':name,'requested_client_logical_px':size,'OS_scale_percent':scale,
             'required_by':['phase5-A09','phase6'],'phase0_1_selection':'required if this is the measured current OS scale and profile is 960x640 or maximized; otherwise additional',
             'scene_contract':'same authorized layout scene plus inventory/equipment/messages/toolbar states',
             'status':'planned','environment_disposition':'not-probed','reason':None} for lang in ('en','ja') for name,size in windows for scale in (100,150,200)]


def require(ok, message):
    if not ok: raise ValueError(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(name):
    return json.loads((DATA/name).read_text(encoding='utf-8-sig'))


def representatives(ledger, item_briefs):
    assets = {a['key']:a for a in ledger['assets']}
    keys = ['hero.layer.'+s for s in HERO]
    for symbol in SPECIES:
        monster = next(m for m in ledger['monsters'] if m['symbol'] == symbol)
        keys += [monster['views'][sex]['actor_key'] for sex in ('male','female')]
    for category, appearance in ITEMS:
        matches = [i for i in item_briefs['items'] if i['key'].startswith('item.appearance.'+category+'.') and i['visible_brief'] == appearance]
        require(len(matches) == 1,'Representative public appearance is missing or ambiguous')
        keys.append(matches[0]['key'])
    keys += [m['key'] for m in ledger['ui_marks']]
    result=[]
    for key in keys:
        asset=assets[key]; category=asset['category']
        text=HERO_TEXT[key.removeprefix('hero.layer.')] if category=='hero-layer' else MARK_TEXT[key] if category=='mark' else asset['visible_brief']
        public_class=key.split('.')[2] if key.startswith('item.appearance.') else 'hero-part' if category=='hero-layer' else 'character' if category=='actor' else 'UI indicator'
        if key.startswith('item.appearance.'):
            text = 'Ruby-coloured potion bottle' if public_class=='potion' and asset['visible_brief']=='ruby' else 'Gray stone' if public_class=='gem' and asset['visible_brief']=='gray' else asset['visible_brief']
        result.append({'key':key,'category':category,'visible_brief':text,'public_class':public_class,'method':asset['method'],
            'source_asset':asset.get('source_asset'),'native_display_px':asset.get('logical_px'),
            'production_owner_phase':asset['phase'],'status':'planned-not-requested'})
    return result


def build():
    ledger, quality, briefs = load(INPUTS[0]),load(INPUTS[1]),load(INPUTS[2])
    samples = representatives(ledger,briefs)
    plan = {'schema':'darkdungeon-comparison-contract-v1','internal_audit_only':True,
        'input_sha256':{name:sha(DATA/name) for name in INPUTS},
        'roles':{
            'history':{'purpose':'advisory-only','production_eligible':False,'same_build_verified':False,'measured_motion_verified':False,'can_be_golden':False},
            'phase0':{'purpose':'current-renderer-baseline','new_game_art':False,'production_eligible':False,'use_fresh_post_improvement_fixtures':True,
                      'requires':['isolated-native-EN-JA-playable-build','actual-source-transform-build-process-binding','R5-reproduction-and-R6-observers','retired-legacy-hooks-and-paint-RNG-fixes','label-current-art-and-known-failures','native-benchmark-viewport-lock']},
            'geometry':{'purpose':'diagnostic-measurement-only','production_eligible':False,'frame_is_not_body_bbox':True,'targets_are_not_baseline_actual_sizes':True},
            'phase2':{'purpose':'new-art-production-candidates','producer':'Antigravity','request_sent':False,
                      'production_eligible':PHASE2_ELIGIBILITY}},
        'historical_references':history_catalog(),
        'geometry_suites':SUITES,
        'capture_contract':{'required_fields':CAPTURE_FIELDS,'raw_capture_immutable':True,'native_and_matched_viewport_separate':True,
            'comparison_class':CLASSES,
            'resampled_image_is_native_evidence':False,'renderer_support_proves_gameplay':False},
        'coverage':COVERAGE,'layout_case_matrix':layout_matrix(),'matrix_policy':MATRIX_POLICY,'style_bootstrap':STYLE_BOOTSTRAP,'gate_requirements':GATE_REQUIREMENTS,
        'prototype_targets':samples,'hero_preview_recipes':[p for p in ledger['hero']['role_previews'] if p['role']=='Kni'],
        'all_quality_target_count':len(quality['targets']),
        'promotion_policy':{'new_phase2_art_may_be_reused_in_phase5':True,'requires':PROMOTION_REQUIRES,
                            'prototype_pass_is_full_coverage':False,'phase0_reference_can_be_promoted':False},
        'freezes':FREEZES,
        'readiness':{'runtime_ready':False,'actual_baseline_captures_created':0,'new_images_created':0,'image_requests_sent':0,'quality_approvals_recorded':0}}
    validate_plan(plan,quality,ledger)
    return plan


def validate_plan(plan, quality, ledger):
    require(plan['roles']['history'] == {'purpose':'advisory-only','production_eligible':False,'same_build_verified':False,'measured_motion_verified':False,'can_be_golden':False},'Historical references cannot be production or same-build/motion proof')
    require(plan['roles']['phase0']['new_game_art'] is False and plan['roles']['phase0']['production_eligible'] is False,'Phase0 must not start or promote new game art')
    require('retired-legacy-hooks-and-paint-RNG-fixes' in plan['roles']['phase0']['requires'],'Phase0 baseline omits R6 prerequisites')
    require('native-benchmark-viewport-lock' in plan['roles']['phase0']['requires'],'Phase0 lacks native viewport control')
    require(plan['roles']['phase0']['use_fresh_post_improvement_fixtures'] is True,'Discarded legacy saves must not be used')
    require(plan['roles']['geometry']['frame_is_not_body_bbox'] is True and plan['roles']['geometry']['targets_are_not_baseline_actual_sizes'] is True,'Measurement target confused with actual baseline/body')
    require(plan['roles']['phase2']['producer'] == 'Antigravity' and plan['roles']['phase2']['request_sent'] is False,'Image producer/request status changed')
    require(plan['roles']['phase2']['production_eligible']==PHASE2_ELIGIBILITY,'Phase2 production eligibility changed')
    require(plan['geometry_suites'] == SUITES,'Geometry/visible-cell suite changed')
    require(plan['capture_contract']['required_fields'] == CAPTURE_FIELDS,'Capture provenance/measurement field missing')
    require(plan['capture_contract']['comparison_class']==CLASSES and plan['capture_contract']['native_and_matched_viewport_separate'] is True,'Comparison class/native-viewport separation changed')
    require(plan['capture_contract']['raw_capture_immutable'] and not plan['capture_contract']['resampled_image_is_native_evidence'] and not plan['capture_contract']['renderer_support_proves_gameplay'],'Diagnostic media falsely accepted as native/gameplay evidence')
    require(plan['coverage'] == COVERAGE,'Language/window/DPI/scene/motion comparison scope missing')
    require(plan['matrix_policy']==MATRIX_POLICY,'Required/representative/unavailable case policy changed')
    require(plan['layout_case_matrix']==layout_matrix(),'Required layout matrix row/status changed')
    require(plan['style_bootstrap']==STYLE_BOOTSTRAP and plan['freezes']==FREEZES,'Style bootstrap/freeze order changed')
    require(plan['gate_requirements']==GATE_REQUIREMENTS,'Actual comparison-artifact gate changed')
    require(GATE_REQUIREMENTS['name'] in quality['phase_gates']['5-1']['entry'],'R4 comparison gate name differs')
    require(plan['historical_references']==history_catalog(),'Historical role/inspection catalog changed')
    require(plan['hero_preview_recipes']==[p for p in ledger['hero']['role_previews'] if p['role']=='Kni'],'Hero prototype recipe differs from R3')
    expected = {t['key'] for t in quality['targets']}
    selected = [t['key'] for t in plan['prototype_targets']]
    require(len(selected) == 26 and len(set(selected)) == 26 and set(selected) <= expected,'Representative target missing/duplicated/outside R3-R4')
    require(plan['prototype_targets'] == representatives(ledger,load('rendering-item-briefs.json')),'Representative scope/appearance differs from public registry')
    require(plan['all_quality_target_count'] == len(expected) == 2287,'Prototype subset replaced whole quality scope')
    require(plan['promotion_policy']['prototype_pass_is_full_coverage'] is False and plan['promotion_policy']['phase0_reference_can_be_promoted'] is False,'Reference/prototype acceptance incorrectly promotes old or all assets')
    require(plan['promotion_policy']['requires']==PROMOTION_REQUIRES and plan['promotion_policy']['new_phase2_art_may_be_reused_in_phase5'] is True,'Promotion requires all per-target evidence and permits accepted new-art reuse')
    require(plan['readiness'] == {'runtime_ready':False,'actual_baseline_captures_created':0,'new_images_created':0,'image_requests_sent':0,'quality_approvals_recorded':0},'Definition generator cannot certify actual captures, new images or quality')


def brief_target(target):
    key=target['key']; character=target['category'] in ('hero-layer','actor')
    if key.startswith('hero.layer.'): filename='sprites/hero/'+key.removeprefix('hero.layer.')+'.png'
    elif key.startswith('actor.'): filename='sprites/monster/'+key.removeprefix('actor.').replace('.','_')+'.png'
    elif key.startswith('item.appearance.'): filename='sprites/item/'+key.removeprefix('item.appearance.').replace('.','/')+'.png'
    else: filename='sprites/ui/'+key.removeprefix('mark.')+'.png'
    return {'key':key,'visible_brief':target['visible_brief'],'public_class':target['public_class'],
        'layout':'four-direction-variable-column-sheet' if character else 'static-single-cell',
        'frame_px':[48,48],'alpha':'RGBA8 binary 0/255','forbidden_opaque_rgb':[71,108,108],'delivery_phase':'2',
        'method':target['method'],'derive_from':target['source_asset'],'derivation_owner':'Antigravity' if target['source_asset'] else None,
        'output_filename':filename,'display_targets':['map','inventory-equipment-menu-selection-when-public'] if target['category']=='actor' or key.startswith('item.appearance.') else ['hero-composite-and-role-preview'] if character else ['map-overlay'],
        'columns':4 if character else 1,'row_order':['up','right','down','left'] if character else ['static'],
        'frames':{'idle_walk_a':[0],'walk_b':[1],'attack_prepare':[2],'attack_execute':[3]} if character else {'idle':[0]},
        'anchor_required':True if character else False,'anchor_contract':'declare per-row/per-frame ground contact; hero parts share anchors; pony also proposes seat/overlap' if character else 'declare static alignment',
        'composition_group':'human-knight-prototype' if key.startswith('hero.layer.') else None,
        'layer_order':'resolve all four directional orders in hero_composition before images' if key.startswith('hero.layer.') else None,
        'display_px':target['native_display_px'],
        'column_revision_policy':'4 initial on-foot poses; propose additional declared mounted/other poses and revise the shared group metadata before image generation' if character else None}


def hero_composition(plan):
    return {'group':'human-knight-prototype','recipes':plan['hero_preview_recipes'],
        'parts_by_sex':{sex:['hero.layer.body_human_'+sex,'hero.layer.hair_'+sex,'hero.layer.outfit_knight','hero.layer.cape','hero.layer.weapon_knight','hero.layer.shield_knight'] for sex in ('male','female')},
        'shared_columns_frames_anchors':True,'directional_order_proposal':{d:None for d in ('up','right','down','left')},
        'delivery_gate':'Antigravity proposes direction-dependent back-to-front order and common anchors; R1/R3 technical metadata is validated before raster generation; visual approval follows prototypes',
        'cape_tint_conditions':{'Law':'blue','Neu':'green','Cha':'red'},'normal_start_alignment':'Law; other combinations require renderer-support/reachability classification'}


def brief(plan):
    payload = {'schema':'darkdungeon-representative-brief-v1','purpose':'phase2-planned-not-sent','producer':'Antigravity','format_contract':'docs/rendering-asset-contract.md',
        'style_bootstrap':STYLE_BOOTSTRAP,'hero_composition':hero_composition(plan),'metadata_proposal_required_before_images':True,
        'targets':[brief_target(t) for t in plan['prototype_targets']]}
    validate_brief(payload,plan)
    return payload


def validate_brief(value, plan):
    require(set(value) == {'schema','purpose','producer','format_contract','style_bootstrap','hero_composition','metadata_proposal_required_before_images','targets'},'Unknown request/attachment/private field')
    require(value['schema']=='darkdungeon-representative-brief-v1' and value['purpose']=='phase2-planned-not-sent' and value['producer']=='Antigravity','Brief cannot claim a sent request')
    require(value['format_contract']=='docs/rendering-asset-contract.md','Brief format contract changed')
    require(value['style_bootstrap']==STYLE_BOOTSTRAP and value['metadata_proposal_required_before_images'] is True,'First request must not invent an approved style or unresolved raster metadata')
    require(value['hero_composition']==hero_composition(plan),'Hero composition/recipe proposal contract changed')
    require(len(value['targets'])==26 and [t['key'] for t in value['targets']] == [t['key'] for t in plan['prototype_targets']],'Brief targets differ from representative keys')
    for target, source in zip(value['targets'],plan['prototype_targets']):
        expected=brief_target(source)
        require(set(target)==set(expected),'Brief includes non-public item/source metadata')
        require(target['visible_brief']==source['visible_brief'],'Brief changed public appearance')
        require(target['delivery_phase']=='2' and target['layout']==('four-direction-variable-column-sheet' if source['category'] in ('hero-layer','actor') else 'static-single-cell'),'Brief layout/production phase changed')
        require(target['frame_px']==[48,48] and target['alpha']=='RGBA8 binary 0/255' and target['forbidden_opaque_rgb']==[71,108,108],'Brief confuses source format with draw size')
        require('_' not in target['visible_brief'] and not any(prefix in target['visible_brief'] for prefix in ('hero.layer.','item.appearance.','actor.','mark.')) and target['visible_brief']==source['visible_brief'],'Brief exposes an internal label instead of a public description')
        require(target==expected,'Brief method/grid/anchor/composition/output/context differs from public contract')


def inspect_history():
    records=[]
    for name,path,digest,size in HISTORY:
        file=ROOT/path
        if not file.exists():
            records.append({'id':name,'available':False,'verified':False}); continue
        require(sha(file)==digest,'Historical reference changed: '+path)
        if size:
            raw=file.read_bytes()[:24]
            require(raw[:8]==b'\x89PNG\r\n\x1a\n' and list(struct.unpack('>II',raw[16:24]))==size,'Historical PNG metadata changed')
        records.append({'id':name,'available':True,'verified':True})
    return records


def main():
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument('--check',action='store_true'); args=parser.parse_args()
    plan=build(); request=brief(plan)
    for filename,value in [('rendering-comparison-contract.json',plan),('rendering-representative-briefs.json',request)]:
        path=DATA/filename; encoded=json.dumps(value,ensure_ascii=False,indent=2)+'\n'
        if args.check: require(path.read_text(encoding='utf-8-sig')==encoded,'Comparison definition or public brief changed: '+filename)
        else: path.write_text(encoded,encoding='utf-8')
    print(json.dumps({'mode':'check' if args.check else 'generate','created_utc':datetime.now(timezone.utc).isoformat(),'tool_sha256':sha(Path(__file__)),
        'plan_sha256':sha(DATA/'rendering-comparison-contract.json'),'brief_sha256':sha(DATA/'rendering-representative-briefs.json'),'history':inspect_history(),
        'prototype_targets':len(plan['prototype_targets']),'game_executed':False,'images_created':False,'request_sent':False,'runtime_ready':False},indent=2))


if __name__=='__main__': main()
