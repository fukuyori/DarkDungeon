"""Static R7 reference/prototype checks with synthetic metadata only."""
import copy
from datetime import datetime, timezone
import json
from pathlib import Path
from contract import DATA, ROOT, brief, build, inspect_history, load, require, sha, validate_brief, validate_plan


def main():
    checks=[]
    def check(condition,label):
        require(condition,label); checks.append(label)
    def rejected(callback,reason,label):
        try:callback()
        except ValueError as error:
            require(str(error)==reason,'Wrong rejection: '+label+': '+str(error)); checks.append('rejected: '+label)
        else:raise ValueError('Invalid definition accepted: '+label)
    plan=load('rendering-comparison-contract.json'); quality=load('rendering-quality-plan.json'); ledger=load('rendering-production-ledger.json')
    check(plan==build(),'comparison plan matches current R3-R6 input definitions and explicit R1 format policy')
    payload=load('rendering-representative-briefs.json')
    check(payload==brief(plan),'public representative brief is exactly the allowlisted projection')
    check(len(plan['prototype_targets'])==26 and plan['all_quality_target_count']==2287,'26 existing representative keys do not replace 2287 quality targets')
    check(len(plan['layout_case_matrix'])==24 and all(r['status']=='planned' for r in plan['layout_case_matrix']),'24 Windows layout rows are explicit and not yet executed')
    for kind in ('G36','G48'):
        suite=plan['geometry_suites'][kind]
        check([a//b for a,b in zip(suite['map_logical_px'],suite['tile_logical_px'])]==suite['complete_cells'],kind+' visible cells use map viewport, not total window')
        check([v*3 for v in suite['tile_logical_px']]==[v*2 for v in suite['target_actor_frame_logical_px']],kind+' proposed frame-to-tile ratio is 1.5; source scaling is separately declared')
    check(all(t['frame_px']==[48,48] for t in payload['targets']),'all prototype source cells are 48; draw frames are separate')
    check(sum(t['method']=='derive-from-new-mark' for t in payload['targets'])==1 and next(t for t in payload['targets'] if t['key']=='mark.petmark-small')['derive_from']=='mark.petmark','small companion mark derives from the new main mark; no independent redraw counted')
    for label,mutate,reason in (
        ('historical photo as golden',lambda p:p['roles']['history'].update(can_be_golden=True),'Historical references cannot be production or same-build/motion proof'),
        ('historical timer as measured performance',lambda p:p['roles']['history'].update(measured_motion_verified=True),'Historical references cannot be production or same-build/motion proof'),
        ('phase0 begins new art',lambda p:p['roles']['phase0'].update(new_game_art=True),'Phase0 must not start or promote new game art'),
        ('phase0 reference promoted to production',lambda p:p['roles']['phase0'].update(production_eligible=True),'Phase0 must not start or promote new game art'),
        ('baseline bypasses R6 fixes',lambda p:p['roles']['phase0']['requires'].remove('retired-legacy-hooks-and-paint-RNG-fixes'),'Phase0 baseline omits R6 prerequisites'),
        ('discarded old saves used',lambda p:p['roles']['phase0'].update(use_fresh_post_improvement_fixtures=False),'Discarded legacy saves must not be used'),
        ('frame mistaken for visible body',lambda p:p['roles']['geometry'].update(frame_is_not_body_bbox=False),'Measurement target confused with actual baseline/body'),
        ('target frame claimed as baseline actual',lambda p:p['roles']['geometry'].update(targets_are_not_baseline_actual_sizes=False),'Measurement target confused with actual baseline/body'),
        ('wrong producer',lambda p:p['roles']['phase2'].update(producer='Codex'),'Image producer/request status changed'),
        ('request falsely claimed sent',lambda p:p['roles']['phase2'].update(request_sent=True),'Image producer/request status changed'),
        ('geometry cell count wrong',lambda p:p['geometry_suites']['G36'].update(complete_cells=[18,9]),'Geometry/visible-cell suite changed'),
        ('capture provenance omitted',lambda p:p['capture_contract']['required_fields'].remove('actual_engine/frontend_files_and_sha256'),'Capture provenance/measurement field missing'),
        ('resampled crop used as native',lambda p:p['capture_contract'].update(resampled_image_is_native_evidence=True),'Diagnostic media falsely accepted as native/gameplay evidence'),
        ('renderer support called gameplay',lambda p:p['capture_contract'].update(renderer_support_proves_gameplay=True),'Diagnostic media falsely accepted as native/gameplay evidence'),
        ('Japanese comparisons omitted',lambda p:p['coverage']['languages'].remove('ja'),'Language/window/DPI/scene/motion comparison scope missing'),
        ('prototype covers whole game',lambda p:p['promotion_policy'].update(prototype_pass_is_full_coverage=True),'Reference/prototype acceptance incorrectly promotes old or all assets'),
        ('definition self-certifies runtime',lambda p:p['readiness'].update(runtime_ready=True),'Definition generator cannot certify actual captures, new images or quality'),
        ('promotion quality requirement omitted',lambda p:p['promotion_policy']['requires'].remove('R4-applicable-quality-evidence'),'Promotion requires all per-target evidence and permits accepted new-art reuse'),
        ('accepted new-art reuse forbidden',lambda p:p['promotion_policy'].update(new_phase2_art_may_be_reused_in_phase5=False),'Promotion requires all per-target evidence and permits accepted new-art reuse'),
        ('phase2 production eligibility relaxed',lambda p:p['roles']['phase2'].update(production_eligible=True),'Phase2 production eligibility changed'),
        ('freeze skips style approval',lambda p:p['freezes'].update(phase2='immediate production'),'Style bootstrap/freeze order changed'),
        ('comparison class omitted',lambda p:p['capture_contract']['comparison_class'].remove('advisory-unpaired'),'Comparison class/native-viewport separation changed'),
        ('native/viewport captures merged',lambda p:p['capture_contract'].update(native_and_matched_viewport_separate=False),'Comparison class/native-viewport separation changed'),
        ('hero recipe differs',lambda p:p['hero_preview_recipes'][0]['recipe'].update(alignment='Cha'),'Hero prototype recipe differs from R3'),
        ('history inspection scope falsified',lambda p:p['historical_references'][-1].update(inspection_scope='visually approved'),'Historical role/inspection catalog changed'),
        ('phase0 viewport control omitted',lambda p:p['roles']['phase0']['requires'].remove('native-benchmark-viewport-lock'),'Phase0 lacks native viewport control'),
        ('unavailable case called pass',lambda p:p['matrix_policy'].update(unavailable='pass'),'Required/representative/unavailable case policy changed'),
        ('bootstrap invents approved guide',lambda p:p['style_bootstrap'].update(style_guide_version='approved-v1'),'Style bootstrap/freeze order changed'),
        ('actual comparison gate self-approved',lambda p:p['gate_requirements'].update(ready=True),'Actual comparison-artifact gate changed'),
        ('required layout row omitted',lambda p:p['layout_case_matrix'].pop(),'Required layout matrix row/status changed'),
        ('unexecuted layout row called passed',lambda p:p['layout_case_matrix'][0].update(status='pass'),'Required layout matrix row/status changed'),
    ):
        bad=copy.deepcopy(plan); mutate(bad)
        rejected(lambda:validate_plan(bad,quality,ledger),reason,label)
    for field in ('comparison_class','conformance','role','approval_record(author,date,style_guide_version,style_guide_sha256,scope,status)'):
        bad=copy.deepcopy(plan); bad['capture_contract']['required_fields'].remove(field)
        rejected(lambda:validate_plan(bad,quality,ledger),'Capture provenance/measurement field missing','capture classification/approval missing: '+field)
    for label,mutate,reason in (
        ('private raw inventory attached',lambda p:p.update(source_ledger='rendering-production-ledger.json'),'Unknown request/attachment/private field'),
        ('true item type leaked',lambda p:p['targets'][0].update(true_otyp=42),'Brief includes non-public item/source metadata'),
        ('draw size mistaken for source',lambda p:p['targets'][0].update(frame_px=[72,72]),'Brief confuses source format with draw size'),
        ('public appearance replaced',lambda p:p['targets'][0].update(visible_brief='hidden truth'),'Brief changed public appearance'),
        ('production phase moved early',lambda p:p['targets'][0].update(delivery_phase='0'),'Brief layout/production phase changed'),
        ('grid declaration changed',lambda p:p['targets'][0].update(columns=6),'Brief method/grid/anchor/composition/output/context differs from public contract'),
        ('row order changed',lambda p:p['targets'][0].update(row_order=['left','down','right','up']),'Brief method/grid/anchor/composition/output/context differs from public contract'),
        ('anchor requirement removed',lambda p:p['targets'][0].update(anchor_required=False),'Brief method/grid/anchor/composition/output/context differs from public contract'),
        ('output filename omitted',lambda p:p['targets'][0].update(output_filename=''),'Brief method/grid/anchor/composition/output/context differs from public contract'),
        ('public class omitted',lambda p:p['targets'][0].update(public_class=''),'Brief method/grid/anchor/composition/output/context differs from public contract'),
        ('composition contract changed',lambda p:p['hero_composition'].update(shared_columns_frames_anchors=False),'Hero composition/recipe proposal contract changed'),
        ('unapproved style claimed approved',lambda p:p['style_bootstrap'].update(style_guide_version='approved-v1'),'First request must not invent an approved style or unresolved raster metadata'),
    ):
        bad=copy.deepcopy(payload); mutate(bad)
        rejected(lambda:validate_brief(bad,plan),reason,label)
    bad=copy.deepcopy(payload); small=next(t for t in bad['targets'] if t['key']=='mark.petmark-small'); small['method']='create-new'
    rejected(lambda:validate_brief(bad,plan),'Brief method/grid/anchor/composition/output/context differs from public contract','derived mark requested as independent new art')
    bad=copy.deepcopy(payload); small=next(t for t in bad['targets'] if t['key']=='mark.petmark-small'); small['display_px']=[48,48]
    rejected(lambda:validate_brief(bad,plan),'Brief method/grid/anchor/composition/output/context differs from public contract','tiny mark native dimensions confused with source dimensions')
    for index,label in ((0,'body_human_female'),(25,'decal_pilemark')):
        bad=copy.deepcopy(payload); bad_plan=copy.deepcopy(plan)
        bad['targets'][index]['visible_brief']=bad_plan['prototype_targets'][index]['visible_brief']=label
        rejected(lambda:validate_brief(bad,bad_plan),'Brief exposes an internal label instead of a public description','internal identifier rejected even if upstream description contains it: '+label)
    history=inspect_history()
    check(all(not x['available'] or x['verified'] for x in history),'available historical reference hashes/PNG dimensions match; missing archives would remain advisory-unavailable')
    print(json.dumps({'mode':'static-comparison-definition-verification','created_utc':datetime.now(timezone.utc).isoformat(),
        'checks_passed':len(checks),'checks':checks,'plan_sha256':sha(DATA/'rendering-comparison-contract.json'),'brief_sha256':sha(DATA/'rendering-representative-briefs.json'),
        'tool_sha256':{p.name:sha(p) for p in (Path(__file__),Path(__file__).with_name('contract.py'))},
        'game_executed':False,'images_created':False,'request_sent':False,'runtime_ready':False},indent=2))


if __name__=='__main__':main()
