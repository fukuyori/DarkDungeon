"""Independent R3 acceptance checks, including hidden-appearance regressions.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'docs/data'


def main():
    ledger = json.loads((DATA / 'rendering-production-ledger.json').read_text(encoding='utf-8'))
    briefs = json.loads((DATA / 'rendering-item-briefs.json').read_text(encoding='utf-8'))
    objects = {o['symbol']: o for o in ledger['objects']}
    checks = []

    def check(test, message):
        if not test:
            raise ValueError(message)
        checks.append(message)

    def same(symbols, name):
        rows = [objects[s] for s in symbols]
        check(len({r['asset_key'] for r in rows}) == 1, name + ': same appearance shares one key')
        check(len({r['source_tile'] for r in rows}) > 1, name + ': covers distinct old tile IDs')

    same(['AMULET_OF_YENDOR', 'FAKE_AMULET_OF_YENDOR'], 'real/fake amulet')
    same(['LUCKSTONE', 'LOADSTONE', 'TOUCHSTONE', 'FLINT'], 'gray stones')
    same(['SACK', 'OILSKIN_SACK', 'BAG_OF_HOLDING', 'BAG_OF_TRICKS'], 'bags')
    same(['OIL_LAMP', 'MAGIC_LAMP'], 'lamps')
    same(['TOOLED_HORN', 'FROST_HORN', 'FIRE_HORN', 'HORN_OF_PLENTY'], 'horns')
    same(['SAPPHIRE', 'WORTHLESS_BLUE_GLASS'], 'blue gem/glass')
    key = 'item.appearance.amulet.' + hashlib.sha256(b'appearance-v1\x00amulet\x00description\x00Amulet of Yendor').hexdigest()
    check(objects['AMULET_OF_YENDOR']['asset_key'] == key, 'SHA256 encoding has exact delimiters and no trailing NUL')
    glyphs = [g for t in ledger['atlas_slots'] for g in t['glyph_ids']]
    check(sorted(glyphs) == list(range(ledger['counts']['glyphs'])), 'every glyph covered exactly once')
    check([t['id'] for t in ledger['atlas_slots']] == list(range(2307)), 'every atlas slot covered exactly once')
    check(all(t['asset_key'] or t['disposition'] in ('clear-reserved-slot', 'preserve-empty-sentinel') for t in ledger['atlas_slots']), 'all live and reserved slots have an explicit policy')
    assets = {a['key']: a for a in ledger['assets']}
    check(all(t['asset_key'] is None or t['asset_key'] in assets for t in ledger['atlas_slots']), 'all tile aliases resolve')
    check(all(len(m['views']) == 2 for m in ledger['monsters']), 'both visible sexes covered for every species')
    check(len(ledger['hero']['creation_combinations']) == 73 and len(ledger['hero']['renderer_support_matrix']) == 390, 'creation and renderer support matrices remain distinct')
    layers = ledger['hero']['layers_to_remake']
    check(len(layers) == 42 and all('hero.layer.shield_' + role in layers for role in ('knight', 'priest', 'valkyrie')), 'all three approved shield roles included in 42 hero layers')
    check(ledger['hero']['riding']['policy'] == 'displayed-mount-plus-authorized-self', 'approved mount and authorized-self composition recorded')
    check(all(a.get('mount_metadata') and a.get('rider_representation') for a in assets.values() if a['category'] == 'actor'), 'all actor forms include mount and rider presentation requirements')
    check(len({a['key'] for a in briefs['items']}) == 438, 'all 438 item appearance briefs present once')
    check(all(set(a) == {'key', 'visible_brief', 'frame_px', 'alpha', 'phase'} for a in briefs['items']), 'external briefs contain only approved fields')
    check(not any('fake' in a['visible_brief'].lower() or 'plastic' in a['visible_brief'].lower() for a in briefs['items']), 'fake amulet identity absent from external briefs')
    check(all(a['tracking']['request'] in ('not-requested', 'not-applicable') for a in assets.values()), 'current snapshot makes no art request claim')
    # Negative fixtures use the real parser, not a second permissive parser.
    spec = importlib.util.spec_from_file_location('scope', Path(__file__).with_name('build-production-ledger.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    import copy

    def rejected(operation, name):
        try:
            operation()
        except ValueError:
            checks.append('negative fixture rejected: ' + name)
        else:
            raise ValueError('Invalid data accepted: ' + name)

    fixture = {'key': 'fixture.asset', 'method': 'create-new', 'visible_brief': 'same visible shape',
               'bindings': [{'tile': 1, 'glyph_ids': [1]}]}
    old = copy.deepcopy(fixture)
    old['tracking'] = module.pristine_tracking(old)
    old['tracking']['request'] = 'requested'
    old['tracking']['request_artifact'] = 'fixture.request.json'
    previous = {old['key']: old}
    current = {fixture['key']: copy.deepcopy(fixture)}
    module.merge_tracking(current, previous)
    check(current[fixture['key']]['tracking'] == old['tracking'], 'progress survives regeneration with identical definition and binding')
    changed = copy.deepcopy(fixture)
    changed['visible_brief'] = 'different shape'
    rejected(lambda: module.merge_tracking({changed['key']: changed}, previous), 'requested definition changed')
    rejected(lambda: module.merge_tracking({}, previous), 'requested asset removed')
    rebound = copy.deepcopy(fixture)
    rebound['bindings'][0]['tile'] = 2
    rejected(lambda: module.merge_tracking({rebound['key']: rebound}, previous), 'requested asset rebound to another tile')
    reg = json.loads((DATA / 'rendering-public-name-registry.json').read_text(encoding='utf-8'))
    en_path = Path(sys.argv[1]) / 'en/source-inventory.json'
    inventory = json.loads(en_path.read_text(encoding='utf-8-sig'))
    short_reg = copy.deepcopy(reg)
    short_reg['entries'].pop()
    rejected(lambda: module.validate_public_registry(short_reg, inventory['objects']), 'missing public-name registration')
    extra_reg = copy.deepcopy(reg)
    extra_reg['entries'].append({'symbol': 'UNKNOWN', 'public_name': 'unknown'})
    rejected(lambda: module.validate_public_registry(extra_reg, inventory['objects']), 'extra public-name registration')
    mismatch = copy.deepcopy(inventory)
    mismatch['glyph_tiles'][0] += 1
    rejected(lambda: module.validate_pair(inventory, mismatch), 'English/Japanese tile mismatch')
    check({m['source'] for m in ledger['ui_marks']} == {'pet_mark_xpm', 'pet_mark_small_xpm', 'pile_mark_xpm'}, 'all three actual Qt map mark sources covered')
    check(len(ledger['ui_status_icons']) == 30 and sum(i['policy'] == 'replace-with-new-asset' for i in ledger['ui_status_icons']) == 29
          and sum(i['policy'] == 'transparent-sentinel' for i in ledger['ui_status_icons']) == 1,
          'fixed UI registry preserves 29 status pictures and one blank')
    check(len(ledger['ui_marks']) == 3 and sum(a['category'] == 'ui-illustration' for a in assets.values()) == 1
          and any(e['key'] == 'ui.splash' for e in ledger['external_images']), 'fixed UI registry preserves three marks and one splash')
    baseline = json.loads((DATA / 'rendering-scope-baseline.json').read_text(encoding='utf-8'))
    check(ledger['existing_sprites'] == baseline['legacy_sprites'], 'legacy-image list is fixed, not a scan of new deliveries')
    ui_definitions = baseline['ui_sources']['status_icons'] + baseline['ui_sources']['map_marks']
    import re
    check(len(ui_definitions) == 33 and all(re.fullmatch('[0-9a-f]{64}', r['definition_sha256']) and
                                          r['definition_sha256'] == r['ja_definition_sha256'] for r in ui_definitions),
          'all 33 fixed UI definitions retain original declaration hashes')
    source_root = ROOT / 'build/nethack'
    import tempfile
    with tempfile.TemporaryDirectory(dir=ROOT / 'artifacts', prefix='r3-negative-') as temp:
        temp_root = Path(temp)
        rejected(lambda: module.previous_ledger(temp_root / 'missing-progress.json'), 'missing authoritative progress ledger')
        # Recreate only the audited core inputs, deliberately omitting all Qt
        # image definitions. Delivery/refactoring must not shrink the scope.
        simulated_root = temp_root / 'post-ui-refactor'
        for lang in ('en', 'ja'):
            provenance = json.loads((Path(sys.argv[1]) / lang / 'provenance.json').read_text(encoding='utf-8-sig'))
            source_rel = Path('build/nethack-ja' if lang == 'ja' else 'build/nethack')
            for item in provenance['inputs']:
                relative = Path(item['path'].replace('\\', '/'))
                destination = simulated_root / source_rel / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes((ROOT / source_rel / relative).read_bytes())
        import contextlib
        import io
        saved_root, saved_argv = module.ROOT, sys.argv
        try:
            module.ROOT = simulated_root
            sys.argv = ['build-production-ledger.py', str(Path(saved_argv[1]).resolve()), '--check']
            with contextlib.redirect_stdout(io.StringIO()):
                module.main()
        finally:
            module.ROOT, sys.argv = saved_root, saved_argv
        checks.append('full ledger remains identical after removing all mutable Qt image sources')
        (temp_root / 'src').mkdir()
        text = (source_root / 'src/tilemappings.lst').read_text(encoding='utf-8-sig')
        tile_c = (source_root / 'src/tile.c').read_text(encoding='utf-8-sig')
        (temp_root / 'src/tile.c').write_text(tile_c, encoding='utf-8')
        for name, changed in [('missing-live-slot', '\n'.join(l for l in text.splitlines() if not l.startswith('tile[0000]'))),
                              ('missing-reserved-slot', '\n'.join(l for l in text.splitlines() if not l.startswith('skipping monst Cerberus'))),
                              ('wrong-source-entry', text.replace('monsters.txt[0000]', 'monsters.txt[9999]', 1)),
                              ('wrong-corpse-source-entry', text.replace('objects.txt[0265]', 'objects.txt[9999]', 1))]:
            (temp_root / 'src/tilemappings.lst').write_text(changed, encoding='utf-8')
            try:
                module.tile_rows(temp_root, inventory)
            except ValueError:
                checks.append('negative fixture rejected: ' + name)
            else:
                raise ValueError('Invalid inventory accepted: ' + name)
    print(json.dumps({'checks_passed': len(checks), 'checks': checks, 'game_executed': False}, indent=2))


if __name__ == '__main__':
    main()
