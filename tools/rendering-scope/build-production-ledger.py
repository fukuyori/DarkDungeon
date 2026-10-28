"""Internal R3 coverage ledger. Static inputs only; never imports/runs the game.

This file and the generated ledger are audit tools, NOT runtime render resolvers.
True object names and raw tile indices must not be sent to an image producer.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import argparse
import collections
import hashlib
import itertools
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "docs/data"
CLASS_KEYS = {1: "illobj", 2: "weapon", 3: "armor", 4: "ring", 5: "amulet",
              6: "tool", 7: "food", 8: "potion", 9: "scroll", 10: "spellbook",
              11: "wand", 12: "coin", 13: "gem", 14: "rock", 15: "ball",
              16: "chain", 17: "venom"}


def load(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(test, message):
    if not test:
        raise ValueError(message)


def appearance_key(class_key, kind, text):
    value = "\0".join(("appearance-v1", class_key, kind, text)).encode("utf-8")
    return f"item.appearance.{class_key}." + hashlib.sha256(value).hexdigest()


def validate_public_registry(registry, objects):
    no_descr = {o['symbol']: o for o in objects if o['description'] is None}
    entries = registry['entries']
    require(set(no_descr) == {r['symbol'] for r in entries}, 'Public-name registry not exhaustive')
    require(len(entries) == len(no_descr), 'Duplicate public-name registry entry')
    for r in entries:
        obj = no_descr[r['symbol']]
        require(obj['initial_name_known'] and r['public_name'] == obj['name'], 'Unproven public name')
    return {r['symbol']: r for r in entries}


def validate_pair(en, ja):
    for field in ('counts', 'atlas', 'glyph_tiles', 'ranges', 'creation_combinations', 'races'):
        require(en[field] == ja[field], f'EN/JA mismatch: {field}')
    require([{k: v for k, v in r.items() if k != 'name'} for r in en['roles']] ==
            [{k: v for k, v in r.items() if k != 'name'} for r in ja['roles']], 'EN/JA role mapping mismatch')
    for field in ('objects', 'monsters'):
        require([x['symbol'] for x in en[field]] == [x['symbol'] for x in ja[field]], 'EN/JA enum mismatch')
    require([x['class'] for x in en['objects']] == [x['class'] for x in ja['objects']], 'EN/JA class mismatch')


def pristine_tracking(item):
    if item['method'] in ('retain-environment-only', 'retain-ui-background'):
        return {'request': 'not-applicable', 'delivery': 'not-applicable',
                'integration': 'not-applicable', 'quality': 'style-audit-pending'}
    return {'request': 'not-requested', 'delivery': 'not-delivered',
            'integration': 'not-integrated', 'quality': 'not-verified',
            'request_artifact': None, 'delivery_sha256': None,
            'integration_evidence': None, 'quality_evidence': None}


def merge_tracking(assets, previous):
    """Bindings are part of each definition, so integration cannot silently drift."""
    for key, item in assets.items():
        item['tracking'] = pristine_tracking(item)
        old = previous.get(key)
        if old and old['tracking'] != pristine_tracking(old):
            require({k: v for k, v in old.items() if k != 'tracking'} ==
                    {k: v for k, v in item.items() if k != 'tracking'},
                    f'Requested definition or binding changed; reconcile manually: {key}')
            item['tracking'] = old['tracking'].copy()
    for key in set(previous) - set(assets):
        require(previous[key]['tracking'] == pristine_tracking(previous[key]),
                f'Tracked asset would be dropped; reconcile manually: {key}')


def previous_ledger(path):
    require(path.is_file(), 'Production ledger is the progress authority and is missing; restore history/evidence, do not reset progress')
    return {a['key']: a for a in load(path)['assets']}


def tile_rows(root, inventory):
    """Read all referenced slots + special non-glyph slots, then skipped slots.

    tilemappings.lst truncates long reference lists: use compiled glyph_tiles
    for coverage; use lst only for source names and explicit skip declarations.
    """
    text = (root / "src/tilemappings.lst").read_text(encoding="utf-8-sig")
    rows = {}
    for m in re.finditer(r"^tile\[(\d+)\] (\S+)\[(\d+)\] (.*?)\s*:.*$", text, re.M):
        tile = int(m[1])
        require(tile not in rows, f"Duplicate tile row {tile}")
        rows[tile] = {"id": tile, "source": m[2], "source_entry": int(m[3]),
                      "source_label": m[4].strip(), "reserved_reason": None}
    # The generator advances file_entry by TWO before printing the last skipped
    # index for monsters/statues; objects advance by one. Verify against holes.
    offsets = {"monst": ("monsters.txt", 0, 2),
               "obj": ("objects.txt", inventory["atlas"]["max_monster_tile"] + 1, 1),
               "statue of": ("generated", inventory["atlas"]["max_other_tile"] + 1, 2)}
    for m in re.finditer(r"^skipping (monst|obj|statue of) (.*?) \((\d+)\)$", text, re.M):
        source, offset, width = offsets[m[1]]
        last = int(m[3])
        for entry in range(last - width + 1, last + 1):
            tile = offset + entry
            require(tile not in rows, f"Skip overlaps live tile {tile}")
            rows[tile] = {"id": tile, "source": source, "source_entry": entry,
                          "source_label": m[2], "reserved_reason": "conditional-or-removed-source"}
    require(sorted(rows) == list(range(inventory["atlas"]["total_tiles_used"])),
            "Unclassified atlas slots; inspect tilemap.c and tilemappings.lst")
    # Independent tile.c check: no disagreement between comments and lst.
    source = (root / "src/tile.c").read_text(encoding="utf-8-sig")
    comments = list(re.finditer(r"/\* \[(\d+)\] (\S+):(\d+) (.*?) \*/", source))
    require(len(comments) == inventory["counts"]["glyphs"], "tile.c glyph comment coverage changed")
    for glyph, m in enumerate(comments):
        require(int(m[1]) == glyph, "tile.c glyph ordering changed")
        row = rows[inventory["glyph_tiles"][glyph]]
        require(row["source"] == m[2], f"Source disagreement at glyph {glyph}")
        require(row["source_entry"] == int(m[3]), f"Source entry disagreement at glyph {glyph}")
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inventory_root", type=Path)
    parser.add_argument("--check", action="store_true", help="compare without updating tracked data")
    args = parser.parse_args()
    inputs = args.inventory_root.resolve()
    en = load(inputs / "en/source-inventory.json")
    ja = load(inputs / "ja/source-inventory.json")
    roots = {lang: ROOT / ("build/nethack-ja" if lang == "ja" else "build/nethack") for lang in ("en", "ja")}
    for lang in ("en", "ja"):
        provenance = load(inputs / lang / "provenance.json")
        require(provenance["output_sha256"].lower() == sha(inputs / lang / "source-inventory.json"), "Stale inventory hash")
        require(provenance["extractor_sha256"].lower() == sha(Path(__file__).with_name("audit-source.c")), "Extractor changed")
        for item in provenance["inputs"]:
            require(sha(roots[lang] / item["path"].replace("\\", "/")) == item["sha256"].lower(),
                    f"Stale {lang} source: {item['path']}")
    validate_pair(en, ja)
    tiles = tile_rows(roots["en"], en)
    ja_tiles = tile_rows(roots["ja"], ja)
    require([(t["source"], t["source_entry"], bool(t["reserved_reason"])) for t in tiles.values()] ==
            [(t["source"], t["source_entry"], bool(t["reserved_reason"])) for t in ja_tiles.values()], "EN/JA slot mismatch")
    ranges = en["ranges"]
    require([g for r in ranges for g in range(r["start"], r["end_exclusive"])] == list(range(en["counts"]["glyphs"])), "Range gap/overlap")
    by_range = {r["name"]: r for r in ranges}
    tile_glyphs = collections.defaultdict(list)
    tile_kinds = collections.defaultdict(set)
    for r in ranges:
        for glyph in range(r["start"], r["end_exclusive"]):
            tile = en["glyph_tiles"][glyph]
            tile_glyphs[tile].append(glyph)
            tile_kinds[tile].add(r["name"])
    assets = {}

    def asset(key, category, label, phase, method="create-new", **extra):
        candidate = {"key": key, "category": category, "visible_brief": label,
                     "phase": phase, "method": method, **extra}
        if key in assets:
            require(assets[key] == candidate, f"Conflicting asset {key}")
        else:
            assets[key] = candidate
        return key

    registry = load(DATA / "rendering-public-name-registry.json")
    public = validate_public_registry(registry, en['objects'])
    object_rows = []
    object_asset = {}
    object_range = by_range["object"]["start"]
    for o in en["objects"]:
        require(o["class"] in CLASS_KEYS, "Unregistered object class")
        class_key = CLASS_KEYS[o["class"]]
        if o["description"] is None:
            entry = public[o["symbol"]]
            require(o["initial_name_known"] and entry["public_name"] == o["name"], "Unproven public name")
            kind, description = "public-name", entry["public_name"]
            policy = entry["policy"]
            require(policy in {"public-shape", "generic-corpse", "generic-egg", "generic-fruit", "generic-figurine", "generic-statue"}, "Unknown name policy")
        else:
            kind, description, policy = "description", o["description"], "appearance-group"
        key = appearance_key(class_key, kind, description)
        brief = {"generic-egg": "egg; no species or viability cues", "generic-fruit": "generic fruit; no custom fruit identity",
                 "generic-figurine": "figurine; no hidden monster species", "generic-corpse": "generic corpse; no species or sex cues",
                 "generic-statue": "generic statue; species-specific statues use separate visible glyphs"}.get(policy, description)
        asset(key, "item", brief, "5-3", appearance={"class": class_key, "kind": kind, "english": description})
        tile = en["glyph_tiles"][object_range + o["id"]]
        require(tile not in object_asset or object_asset[tile] == key, "Object tile has conflicting appearances")
        object_asset[tile] = key
        object_rows.append({"source_id": o["id"], "symbol": o["symbol"], "class": class_key,
                            "kind": kind, "definition": description, "policy": policy,
                            "source_tile": tile, "asset_key": key,
                            "appearance_only": o["name"] is None,
                            "generic": o["symbol"].startswith("GENERIC_")})
    monster_rows = []
    for m in en["monsters"]:
        views = {}
        for sex in ("male", "female"):
            normal = en["glyph_tiles"][by_range[f"monster.{sex}"]["start"] + m["id"]]
            statue = en["glyph_tiles"][by_range[f"statue.{sex}"]["start"] + m["id"]]
            key = f"actor.{m['symbol'].lower()}.{sex}"
            statue_key = f"statue.{m['symbol'].lower()}.{sex}"
            label = m['names'][0 if sex == 'male' else 1] or m['names'][2]
            require(label, 'Missing sex-specific and neutral monster names')
            asset(key, "actor", f"{sex} {label}", "5-2")
            asset(statue_key, "statue", f"stone statue: {sex} {label}", "5-3", "derive-from-new-actor", source_asset=key)
            require(normal not in object_asset and statue not in object_asset, "Actor/object tile collision")
            views[sex] = {"normal_tile": normal, "actor_key": key, "statue_tile": statue, "statue_key": statue_key}
        monster_rows.append({"source_id": m["id"], "symbol": m["symbol"], "views": views,
                             "no_random_generation": m["no_random_generation"], "no_corpse": m["no_corpse"],
                             "roles": [r["code"] for r in en["roles"] if m["id"] in (r["leader"], r["guardian"], r["nemesis"])]})
    actor_tiles = {v["normal_tile"]: v["actor_key"] for m in monster_rows for v in m["views"].values()}
    statue_tiles = {v["statue_tile"]: v["statue_key"] for m in monster_rows for v in m["views"].values()}
    atlas_rows = []
    for tile, row in sorted(tiles.items()):
        kinds = sorted(tile_kinds[tile])
        key = object_asset.get(tile) or actor_tiles.get(tile) or statue_tiles.get(tile)
        if row["reserved_reason"]:
            require(not kinds, "Reserved slot referenced by glyph")
            disposition = "clear-reserved-slot"
        elif row["source"] == "decals.txt":
            if row["source_label"] == "decal_delimiter":
                disposition = "preserve-empty-sentinel"
            else:
                key = asset("mark." + row["source_label"].removeprefix("decal_"), "mark", row["source_label"], "5-4")
                disposition = "replace-with-new-asset"
        elif tile == en["atlas"]["max_other_tile"] + 1 + en["atlas"]["max_monster_tile"]:
            # Invisible statue is a reserved generator artifact, not a glyph.
            require(row["source_label"] == "invisible statue" and not kinds, "Invisible statue convention changed")
            disposition = "clear-reserved-slot"
        elif key:
            disposition = "replace-with-new-asset"
        else:
            require(kinds, f"Unclassified non-glyph tile {tile}")
            if all(k.startswith("terrain.") for k in kinds):
                key = asset(f"environment.{row['source_entry']}", "environment", row["source_label"], "environment-audit", "retain-environment-only")
                disposition = "environment-style-audit"
            elif kinds in (["unexplored"], ["nothing"]):
                disposition = "preserve-empty-sentinel"
            else:
                require(all(k.startswith("effect.") or k in {"warning", "invisible"} for k in kinds), f"Unknown tile kinds {kinds}")
                key = asset(f"symbol.{row['source']}.{row['source_entry']}", "special", row["source_label"], "5-4")
                disposition = "replace-with-new-asset"
        atlas_rows.append({**row, "glyph_ids": tile_glyphs[tile], "glyph_ranges": kinds,
                           "disposition": disposition, "asset_key": key})
    # These independently retained glyph classes must share exactly the same
    # source image for each sex/species; no runtime reachability is asserted.
    for sex in ("male", "female"):
        for category in ("pet", "detected", "ridden"):
            begin = by_range[f"{category}.{sex}"]["start"]
            require(en["glyph_tiles"][begin:begin + en["counts"]["monsters"]] ==
                    en["glyph_tiles"][by_range[f"monster.{sex}"]["start"]:by_range[f"monster.{sex}"]["end_exclusive"]], "Actor aliases changed")
    for pair in (("object", "piletop.object"), ("corpse", "piletop.corpse"),
                 ("statue.male", "piletop.statue.male"), ("statue.female", "piletop.statue.female")):
        a, b = (by_range[n] for n in pair)
        require(en["glyph_tiles"][a["start"]:a["end_exclusive"]] == en["glyph_tiles"][b["start"]:b["end_exclusive"]], "Piletop aliases changed")
    swallow = by_range['effect.swallow']
    require(swallow['end_exclusive'] - swallow['start'] == en['counts']['monsters'] * 8, 'Swallow glyph shape changed')
    for position in range(8):
        require(len({en['glyph_tiles'][g] for g in range(swallow['start'] + position, swallow['end_exclusive'], 8)}) == 1,
                'Swallow image now exposes species; inspect before production')
    corpse = by_range['corpse']
    require(len(set(en['glyph_tiles'][corpse['start']:corpse['end_exclusive']])) == 1, 'Generic corpse sharing changed')
    # Fixed role registry and fixed old-image snapshot: never scan deliveries.
    baseline = load(DATA / 'rendering-scope-baseline.json')
    hero_layers = []
    for layer in baseline['hero_layer_roles']:
        key = asset(layer['key'], 'hero-layer', layer['visual_role'], '5-1')
        hero_layers.append(key)
    require(len(set(hero_layers)) == len(hero_layers), 'Duplicate hero layer role')
    for key in hero_layers:
        assets[key]['required_contexts'] = ['on-foot', 'mounted']
    for key in actor_tiles.values():
        assets[key]['mount_metadata'] = 'seat anchor and direction-specific overlap order, for the displayed form; never actual hidden steed'
        assets[key]['rider_representation'] = 'new mounted pose/composition when core authorizes this self form; no legacy or unrelated normal-hero substitution'
    codes = {k: sorted({c[k] for c in en["creation_combinations"]}) for k in ("role", "race", "gender", "alignment")}
    hero_matrix = [dict(zip(codes, values)) for values in itertools.product(*codes.values())]
    role_previews = []
    for role in en['roles']:
        canonical = next(c for c in en['creation_combinations'] if c['role'] == role['code'])
        for sex, gender_code in [('male', 'Mal'), ('female', 'Fem')]:
            key = monster_rows[role['monster']]['views'][sex]['actor_key']
            recipe = {**canonical, 'gender': gender_code, 'facing': 'down', 'frame': 'idle'}
            assets[key]['method'] = 'compose-from-new-hero'
            assets[key]['hero_recipe'] = recipe
            role_previews.append({'role': role['code'], 'sex': sex, 'actor_key': key, 'recipe': recipe})
    race_previews = [{'race': race['code'], 'views': monster_rows[race['monster']]['views']}
                     for race in en['races']]
    # XPM status glyphs are separate from game glyphmap and must be explicit.
    status_images = [r['name'] for r in baseline['ui_sources']['status_icons']]
    require(len(set(status_images)) == 30 and len(status_images) == 30 and 'blank_xpm' in status_images,
            'Fixed status icon registry must contain 29 pictures and one blank')
    ui = []
    for name in status_images:
        if name == "blank_xpm":
            ui.append({"key": "ui.status.blank", "source": name, "policy": "transparent-sentinel"})
        else:
            key = asset("ui.status." + name.removesuffix("_xpm"), "status-icon", name.removesuffix("_xpm"), "5-4")
            ui.append({"key": key, "source": name, "policy": "replace-with-new-asset"})
    map_names = [r['name'] for r in baseline['ui_sources']['map_marks']]
    require(len(map_names) == 3 and set(map_names) == {'pet_mark_xpm', 'pet_mark_small_xpm', 'pile_mark_xpm'},
            'Fixed map mark registry must contain all three marks')
    small_mark = asset('mark.petmark-small', 'mark', 'small pet mark', '5-4', 'derive-from-new-mark', source_asset='mark.petmark')
    ui_marks = [{'source': 'pet_mark_xpm', 'key': 'mark.petmark', 'logical_px': [8, 7]},
                {'source': 'pet_mark_small_xpm', 'key': small_mark, 'logical_px': [5, 5]},
                {'source': 'pile_mark_xpm', 'key': 'mark.pilemark', 'logical_px': [5, 5]}]
    for mark in ui_marks:
        assets[mark['key']]['ui_source'] = 'win/Qt/qt_map.cpp:' + mark['source']
        assets[mark['key']]['logical_px'] = mark['logical_px']
    splash_key = asset('ui.splash', 'ui-illustration', 'original fantasy dragon and rider; no embedded words', '5-4',
                       canvas_px=[196, 111], consumers=['qt_bind.cpp:qt_Splash', 'qt_svsel.cpp:NetHackQtSavedGameSelector'])
    external_images = [{'source': 'win/share/nhsplash.xpm', 'key': splash_key, 'policy': 'replace-with-new-asset'},
                       {'source': 'win/X11/rip.xpm', 'key': None, 'policy': 'retain-ui-background',
                        'reason': 'end-of-game memorial UI background; not an object glyph; phase 1/4 style audit',
                        'consumers': ['qt_rip.cpp:NetHackQtRIP'], 'canvas_px': [400, 200]}]
    old_sprites = baseline['legacy_sprites']
    # Bindings are internal audit material; do not export to image requests.
    for item in assets.values():
        item['bindings'] = [{'tile': t['id'], 'glyph_ids': t['glyph_ids']} for t in atlas_rows if t['asset_key'] == item['key']]
    previous_path = DATA / 'rendering-production-ledger.json'
    previous = previous_ledger(previous_path)
    merge_tracking(assets, previous)
    ledger = {"schema": "darkdungeon-rendering-scope-v1", "internal_audit_only": True,
              "scope_date": "2026-10-28", "counts": en["counts"], "glyph_ranges": ranges,
              "source_sha256": {lang: {"inventory": sha(inputs / lang / "source-inventory.json"),
                                       "tilemap": sha(roots[lang] / "src/tile.c"),
                                       "slot_list": sha(roots[lang] / "src/tilemappings.lst")} for lang in ("en", "ja")},
              "objects": object_rows, "monsters": monster_rows, "atlas_slots": atlas_rows,
              "hero": {"creation_combinations": en["creation_combinations"],
                       "renderer_support_matrix": hero_matrix,
                       "matrix_is_reachability_claim": False, "layers_to_remake": hero_layers,
                       "role_previews": role_previews, "race_previews": race_previews,
                       "riding": {'policy': 'displayed-mount-plus-authorized-self',
                                  'approval': 'Lemon delegated recommended choices, 2026-10-28',
                                  'mount': 'use the one core-chosen display glyph, including hallucination',
                                  'rider': 'normal composite / polymorph actor / mimic appearance selected by core self branch; do not reveal underlying form',
                                  'visibility': 'only on a core-published self display event; never reconstruct hidden mounts or revive hidden self',
                                  'randomness': 'sample mount once in core; own self branch is pure; no RNG in draw or metadata generation'},
                       "polymorph": "use-core-chosen-monster-glyph", "alignment": "core-visible-type; three cape tints; unexpected type is a diagnostic; no moral score inferred",
                       "shield_roles": ['Kni', 'Pri', 'Val'],
                       "missing_shield_layer": "explicitly absent for other roles; no legacy fallback; actual worn gear uses core equipment glyph"},
              "ui_status_icons": ui, "ui_marks": ui_marks, 'external_images': external_images,
              'fixed_ui_source_provenance': baseline['ui_sources'],
              "existing_sprites": old_sprites, 'legacy_external_images': baseline['legacy_external_images'],
              "assets": sorted(assets.values(), key=lambda x: x["key"])}
    summary = {"monsters": len(monster_rows), "object_entries": len(object_rows),
               "glyphs": sum(len(t["glyph_ids"]) for t in atlas_rows), "atlas_slots": len(atlas_rows),
               "unreferenced_slots": sum(not t["glyph_ids"] for t in atlas_rows),
               "public_name_entries": len(public), "creation_combinations": len(en["creation_combinations"]),
               "hero_support_matrix": len(hero_matrix), "hero_layers": len(hero_layers),
               "assets_by_category": dict(sorted(collections.Counter(a["category"] for a in assets.values()).items())),
               "slot_dispositions": dict(sorted(collections.Counter(t["disposition"] for t in atlas_rows).items())),
               "new_or_derived_targets": sum(a['method'] != 'retain-environment-only' for a in assets.values()),
               "unrequested_targets": sum(a['tracking']['request'] == 'not-requested' for a in assets.values()),
               "existing_sprite_files_to_replace_or_remove": len(old_sprites),
               "en_ja_match": True, "game_executed": False, "art_created": False}
    briefs = {'schema': 'darkdungeon-item-briefs-v1', 'purpose': 'appearance-only input for Antigravity; no image request sent',
              'format_contract': 'docs/rendering-asset-contract.md',
              'items': [{'key': a['key'], 'visible_brief': a['visible_brief'], 'frame_px': [48, 48],
                         'alpha': 'binary RGBA8 PNG', 'phase': a['phase']} for a in ledger['assets'] if a['category'] == 'item']}
    outputs = {DATA / "rendering-production-ledger.json": ledger, DATA / "rendering-production-summary.json": summary,
               DATA / 'rendering-item-briefs.json': briefs}
    for path, value in outputs.items():
        if args.check:
            require(path.is_file() and load(path) == value, f"Tracked ledger is stale: {path.name}")
        else:
            write(path, value)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
