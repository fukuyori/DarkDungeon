"""Audit removal of the legacy motion path, not full R6 invariance.
DarkDungeon contributors, 2026. See LICENSE (NetHack GPL).
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import runpy

ROOT = Path(__file__).resolve().parents[2]
clean = runpy.run_path(str(Path(__file__).with_name("audit-source.py")),
                      run_name="retirement_lexical_helpers")["clean"]
LEGACY = re.compile(r"\b(?:darkdungeon_note_attack|refreshAnimations|actorAnimations|actorOverlay|"
                    r"drawActorSprite|darkdungeon_hero_walking|darkdungeon_paint_actor_overlay|startAnimation)\b")
LIVE = re.compile(r"\b(?:fmon|m_at|canspotmon|m_id|obj_to_glyph|rn2_on_display_rng)\b|\bu\s*\.")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def body(text, name):
    start, end = body_span(text, name)
    return text[start:end]


def body_span(text, name):
    match = re.search(r"\b" + re.escape(name) + r"\s*\([^;{}]*\)\s*\{", text)
    if not match:
        raise ValueError("Missing map function: " + name)
    start, depth, end = match.end(), 1, match.end()
    while depth and end < len(text):
        depth += (text[end] == "{") - (text[end] == "}")
        end += 1
    if depth:
        raise ValueError("Unbalanced map function: " + name)
    return start, end-1


def main():
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument("--build-root", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    selected = [ROOT / "src/qt_darkdungeon.cpp", ROOT / "src/qt_darkdungeon.h",
                ROOT / "src/app_runtime.h", ROOT / "src/agent_port.c",
                ROOT / "scripts/prepare-source.ps1"]
    for path in selected:
        text = path.read_text(encoding="utf-8-sig")
        if LEGACY.search(text):
            raise ValueError("Legacy identifier in generation source: " + str(path))
    reports = []
    for language, tree in (("en", ROOT / "build/nethack"), ("ja", ROOT / "build/nethack-ja")):
        completion = ROOT / f"build/core-port-{language}.json"
        completed = json.loads(completion.read_text(encoding="utf-8-sig"))
        if completed["language"] != language:
            raise ValueError("Wrong completed generation inventory")
        for branch in completed["branches"]:
            if sha(tree / branch["path"]).upper() != branch["source_sha256"]:
                raise ValueError("Prepared source differs from completed inventory: " + branch["path"])
        source_cpp = (ROOT / "src/qt_darkdungeon.cpp").read_text(encoding="utf-8-sig")
        # prepare-core.py's reviewed transform removes the frontend's trace
        # implementation, now owned by app_runtime.c, and adds its notice.
        transformed, count = re.subn(r'extern "C" void darkdungeon_trace\(const char\* message\) \{.*?\n\}\n',
                                     "", source_cpp, count=1, flags=re.S)
        if count != 1:
            raise ValueError("Trace ownership transform changed; audit it before updating this checker")
        expected = "/* Common core split for DarkDungeon, modified 2026-10-28. See dat/license. */\n" + transformed
        if (tree / "win/Qt/qt_darkdungeon.cpp").read_text(encoding="utf-8-sig") != expected:
            raise ValueError("Prepared map source is not the current reviewed source transform")
        for source, target in (("qt_darkdungeon.h", "win/Qt/qt_darkdungeon.h"),
                               ("app_runtime.h", "include/app_runtime.h"), ("agent_port.c", "src/agent_port.c")):
            if sha(ROOT / "src" / source) != sha(tree / target):
                raise ValueError("Prepared source is stale: " + target)
        paths = [p for directory in ("src", "include", "sys/windows", "win/Qt")
                 for p in (tree / directory).iterdir()
                 if p.is_file() and p.suffix in (".c", ".h", ".cpp")]
        for path in paths:
            if LEGACY.search(clean(path.read_text(encoding="utf-8-sig"))):
                raise ValueError("Legacy identifier in prepared source: " + str(path))
        map_path = tree / "win/Qt/qt_darkdungeon.cpp"
        text = clean(map_path.read_text(encoding="utf-8-sig"))
        for name in ("darkdungeon_draw", "darkdungeon_draw_map_cell"):
            if LIVE.search(body(text, name)):
                raise ValueError("Private actor lookup or sampling in map paint: " + name)
        makefile = (tree / "src/Makefile").read_text(encoding="utf-8-sig")
        if re.search(r"\$\(OTTY\)qt_druaga\.o\b", makefile):
            raise ValueError("The retired Druaga windowport is unexpectedly linked")
        smoke_start, smoke_end = body_span(text, "darkdungeon_start_hooks")
        raw = map_path.read_text(encoding="utf-8-sig")
        guard = '    if (output.isEmpty()) return;'
        if raw.count(guard) != 1:
            raise ValueError("Smoke-only setup guard changed; review the allowed assisted lookup")
        allowed_start = raw.index(guard) + len(guard)
        if not smoke_start < allowed_start < smoke_end:
            raise ValueError("Smoke guard is outside the setup function")
        for path in (tree / "win/Qt").iterdir():
            if path.suffix not in (".cpp", ".h") or path.name == "qt_druaga.cpp":
                continue
            gui = clean(path.read_text(encoding="utf-8-sig"))
            if re.search(r"\b(?:fmon|canspotmon)\b", gui):
                raise ValueError("Private actor exploration in Qt source: " + path.name)
            for match in re.finditer(r"\bm_at\s*\(", gui):
                if path != map_path or not allowed_start <= match.start() < smoke_end:
                    raise ValueError("Actor lookup outside assisted SMOKE setup: " + path.name)
        record = {"language": language, "prepared_sources_checked": len(paths),
                  "legacy_identifiers": 0, "map_paint_private_actor_lookups": 0,
                  "map_source_sha256": sha(map_path), "completed_generation_inventory_sha256": sha(completion),
                  "current_source_transform_verified": True, "qt_actor_lookups": "assisted-smoke-only",
                  "unlinked_qt_sources": ["qt_druaga.cpp"]}
        if args.build_root:
            map_file = tree / "src/objtty/x64/NetHack.MAP"
            linked = map_file.read_text(encoding="utf-8", errors="replace")
            if LEGACY.search(linked):
                raise ValueError("Legacy symbol in linked map: " + str(map_file))
            if "qt_druaga" in linked:
                raise ValueError("Retired Druaga windowport in linked map")
            executable = args.build_root / language / f"DarkDungeon-{language}.exe"
            metadata = json.loads(Path(str(executable) + ".capabilities.json").read_text(encoding="utf-8-sig"))
            if metadata["language"] != language or metadata["executable_sha256"] != sha(executable):
                raise ValueError("Executable/deployment manifest mismatch")
            if metadata.get("linked_map_sha256") != sha(map_file):
                raise ValueError("The linked map is not bound to this deployed executable")
            record.update({"executable_sha256": sha(executable), "linked_map_sha256": sha(map_file),
                           "legacy_symbols_in_link_map": 0})
        reports.append(record)
    report = {"schema": "darkdungeon-legacy-motion-retirement-v1",
              "created_utc": datetime.now(timezone.utc).isoformat(), "game_executed": False,
              "scope": "Legacy attack hooks, private actor motion inference and map overlay only",
              "reports": reports, "generator_sha256": sha(ROOT / "scripts/prepare-source.ps1"),
              "core_transform_sha256": sha(ROOT / "tools/agent-cli/prepare-core.py"),
              "tool_sha256": sha(Path(__file__)),
              "full_r6_invariance": "unconfirmed",
              "inventory_equipment_drag_timer_disp_consumption": "pending-task-129",
              "new_motion_notifications_and_quality": "not-run-phases-3-and-4",
              "excluded": "Historical Unix patches retained; common-core Unix migration is separately gated"}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"languages": [r["language"] for r in reports], "legacy_identifiers": 0,
                      "full_r6_invariance": "unconfirmed", "game_executed": False}))


if __name__ == "__main__":
    main()
