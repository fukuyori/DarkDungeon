"""Native executable startup checks for phase 0-1. See LICENSE (NetHack GPL).

No game automation, seed injection, save migration, or process termination.
Artifacts are retained for review, including failed runs.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import shutil


def digest(data):
    return hashlib.sha256(data).hexdigest()


def normal_state():
    import winreg
    root = Path(os.environ["LOCALAPPDATA"]) / "DarkDungeon"
    files = {}
    if root.exists():
        for path in sorted(root.rglob("*")):
            if path.is_file():
                files[str(path.relative_to(root))] = digest(path.read_bytes())
    registry = {}

    def visit(relative):
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, relative) as key:
                subkeys, values, _ = winreg.QueryInfoKey(key)
                for i in range(values):
                    name, value, kind = winreg.EnumValue(key, i)
                    registry[relative + "\\" + name] = digest(repr((kind, value)).encode())
                for i in range(subkeys):
                    visit(relative + "\\" + winreg.EnumKey(key, i))
        except FileNotFoundError:
            pass

    visit(r"Software\DarkDungeon")
    visit(r"Software\QtProject")
    return {"files": files, "qt_registry": registry}


def run(executable, arguments, env=None, cwd=None):
    process = subprocess.Popen([str(executable), *arguments], stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, env=env, cwd=cwd,
                               creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        out, err = process.communicate(timeout=15)
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"Startup check timed out; process {process.pid} left running")
    return process.returncode, out.decode("utf-8", errors="replace"), err.decode("utf-8", errors="replace")


def main():
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument("--build-root", type=Path, required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--snapshot-only", action="store_true")
    parser.add_argument("--compare-only", action="store_true")
    parser.add_argument("--probe-helper", type=Path,
                        help="Compiled manual-lock-probe.exe, to detect any query sent to an unsupported engine")
    args = parser.parse_args()
    if os.name != "nt":
        parser.error("Windows native executable checks only")
    args.evidence.mkdir(parents=True, exist_ok=True)
    before_path = args.evidence / "normal-before.json"
    if args.snapshot_only:
        if before_path.exists():
            raise RuntimeError("Refusing to overwrite the pre-run snapshot")
        before_path.write_text(json.dumps(normal_state(), indent=2) + "\n", encoding="utf-8")
        print("Normal save/settings snapshot recorded; no game launched")
        return
    before = json.loads(before_path.read_text(encoding="utf-8"))
    results = []
    if not args.compare_only:
        test_root = args.evidence.resolve() / "rejected"
        test_root.mkdir(exist_ok=True)
        nonempty = test_root / "non-profile"
        nonempty.mkdir(exist_ok=True)
        (nonempty / "sentinel.txt").write_text("must remain untouched\n", encoding="ascii")
        hardlinked = test_root / "hardlinked-profile"
        hardlinked.mkdir(exist_ok=True)
        marker = hardlinked / "manual-profile.json"
        if not marker.exists():
            marker.write_text('{"schema":"darkdungeon-manual-profile-v1"}\n', encoding="ascii")
        alias = hardlinked / "linked-marker.json"
        if not alias.exists():
            os.link(marker, alias)
        new_profile = str(test_root / "must-not-be-created")
        for kind, executable in [("launcher", args.build_root / "DarkDungeon.exe"),
                                 *[(lang, args.build_root / lang / f"DarkDungeon-{lang}.exe") for lang in ("en", "ja")]]:
            code, out, err = run(executable, ["--capabilities"])
            capability = json.loads(out)
            assert code == 0 and not err, (kind, code, err)
            assert capability["schema"] == "darkdungeon-capabilities-v1"
            assert capability["manual_profile"] == 1
            assert capability["frontend"] == ("launcher" if kind == "launcher" else "qt-engine")
            if kind != "launcher":
                assert capability["language"] == kind
            results.append({"target": kind, "case": "capability", "verdict": "pass"})
            suffix = ["--language", "en"] if kind == "launcher" else []
            cases = [("relative", ["--manual-profile", "relative", *suffix], None),
                     ("unicode", ["--manual-profile", str(test_root / "日本語"), *suffix], None),
                     ("unicode-best-fit", ["--manual-profile", str(test_root / "ＡＢＣ"), *suffix], None),
                     ("long-path", ["--manual-profile", str(test_root / ("x" * 145)), *suffix], None),
                     ("UNC", ["--manual-profile", r"\\localhost\C$\manual-profile", *suffix], None),
                     ("ADS", ["--manual-profile", new_profile + ':stream', *suffix], None),
                     ("non-profile", ["--manual-profile", str(nonempty), *suffix], None),
                     ("hardlinked-profile", ["--manual-profile", str(hardlinked), *suffix], None),
                     ("normal-data", ["--manual-profile", str(Path(os.environ["LOCALAPPDATA"]) / "DarkDungeon"), *suffix], None),
                     ("deployment", ["--manual-profile", str(args.build_root.resolve()), *suffix], None),
                     ("duplicate", ["--manual-profile", new_profile, "--manual-profile", new_profile, *suffix], None),
                     ("missing-path", ["--manual-profile"], None),
                     ("mixed-query", ["--capabilities", "--manual-profile", new_profile, *suffix], None),
                     ("inherited-smoke", ["--manual-profile", new_profile, *suffix],
                      dict(os.environ, DARKDUNGEON_SMOKE_OUTPUT="forbidden-test-environment")),
                     ("inherited-empty-smoke", ["--manual-profile", new_profile, *suffix],
                      dict(os.environ, DARKDUNGEON_SMOKE_PHASE=""))]
            for name, arguments, env in cases:
                code, out, err = run(executable, arguments, env)
                assert code == 2 and "manual_profile_rejected:" in err, (kind, name, code, out, err)
                results.append({"target": kind, "case": name, "verdict": "pass", "diagnostic": err.strip()})
        assert not Path(new_profile).exists(), "Rejected startup created a profile"
        assert (nonempty / "sentinel.txt").read_text(encoding="ascii") == "must remain untouched\n"
        if args.probe_helper:
            # The helper would create '--capabilities' in cwd if queried. Both
            # failures must be detected before launching that unsupported exe.
            env = dict(os.environ)
            env["PATH"] = str(args.build_root.resolve()) + os.pathsep + env["PATH"]
            for name, diagnostic in [("missing", "missing deployment capability manifest"),
                                     ("mismatch", "deployment executable hash mismatch")]:
                deployment = args.evidence.resolve() / ("manifest-" + name)
                (deployment / "en").mkdir(parents=True, exist_ok=True)
                launcher = deployment / "DarkDungeon.exe"
                engine = deployment / "en/DarkDungeon-en.exe"
                shutil.copyfile(args.build_root / "DarkDungeon.exe", launcher)
                shutil.copyfile(args.probe_helper, engine)
                if name == "mismatch":
                    metadata = {"schema": "darkdungeon-deployment-capabilities-v1", "frontend": "qt-engine",
                                "language": "en", "manual_profile": 1, "executable_sha256": "0" * 64}
                    Path(str(engine) + ".capabilities.json").write_text(json.dumps(metadata), encoding="utf-8")
                untouched_profile = args.evidence.resolve() / ("rejected-manifest-profile-" + name)
                code, out, err = run(launcher, ["--manual-profile", str(untouched_profile), "--language", "en"],
                                     env, deployment)
                assert code == 2 and diagnostic in err, (name, code, out, err)
                assert not untouched_profile.exists(), "Unsupported deployment created a profile"
                assert not (deployment / "--capabilities").exists(), "Unsupported engine was queried"
                results.append({"target": "launcher", "case": "manifest-" + name,
                                "verdict": "pass", "unsupported_engine_queried": False})
    after = normal_state()
    (args.evidence / "normal-after.json").write_text(json.dumps(after, indent=2) + "\n", encoding="utf-8")
    assert before == after, "Normal save files or Qt registry changed; inspect retained snapshots"
    output = {"schema": "darkdungeon-manual-startup-check-v1", "results": results,
              "normal_saves_settings_unchanged": True,
              "native_play_save_restore": "separate-ui-verification"}
    target = "normal-comparison.json" if args.compare_only else "startup-checks.json"
    (args.evidence / target).write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"startup_checks_passed": len(results), "normal_saves_settings_unchanged": True}))


if __name__ == "__main__":
    main()
