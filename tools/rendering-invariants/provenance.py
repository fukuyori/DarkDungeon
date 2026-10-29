"""#110: bind a built executable to its generation inputs and generated tree,
and check that the generation reproduces that tree.

record: called by build-release.ps1 after the build; writes build-inputs.json
        beside the deployed executable.
verify: prepares a fresh tree from the current inputs into a new directory
        under artifacts and compares it with the recorded generated tree.
Neither command runs the game. MSVC output is not bit-reproducible, so the
executable is bound by the record written in the same build, not rebuilt. An
incremental build can keep objects compiled from an older tree; only a build
with clean_build=true binds the executable to the recorded tree.
Copyright DarkDungeon contributors, 2026. See LICENSE.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = ROOT/'artifacts'
TREES = {'en': ROOT/'build/nethack', 'ja': ROOT/'build/nethack-ja'}
# Files the generation reads from this repository (scripts/prepare-source.ps1 and
# the steps it calls). Sprites and documents are deployed, not compiled.
PROJECT_INPUTS = ['VERSION', 'scripts/prepare-source.ps1', 'tools/agent-cli/prepare-core.py',
                  'tools/agent-cli/Export-CorePortBranches.ps1', 'patches/nethack-5.0.1-ja.patch',
                  'translations/ui-ja.json',
                  'docs/data/agent-core-port-branches.en.json', 'docs/data/agent-core-port-branches.ja.json',
                  'docs/data/agent-core-port-branches.c1-en.json', 'docs/data/agent-core-port-branches.c1-ja.json']
PROJECT_INPUT_DIRS = ['src']
# Build outputs inside the generated tree; everything else is a generation result.
OUTPUT_DIRS = {('binary',), ('src', 'objtty'), ('src', 'objlua'), ('src', 'objutil')}
# Files that may exist only in the built tree, and what writes them. Anything
# else there was left by an older run or another script and fails the check,
# because the build may pick it up (dlb.lst collects every dat/*.lua, sources
# can be compiled or included).
BUILD_OUTPUTS = {
    **{f'dat/{name}': 'makedefs/dlb data' for name in ('bogusmon', 'data', 'dlb.lst', 'engrave', 'epitaph', 'options', 'oracles', 'porthelp', 'rumors')},
    'include/date.h': 'makedefs', 'src/tile.c': 'tilemap', 'src/tilemappings.lst': 'tilemap', 'src/tiles.bmp': 'tile2bmp',
    'lib/lua-x64-static.lib': 'Lua library', 'src/NetHack.lnk': 'link response', 'src/vc140.pdb': 'compiler',
    'src/nhdat501': 'dlb', 'src/dd-core-build.txt': 'common-core library response',
    **{f'src/{name}.tag': 'nmake tag' for name in ('binary', 'gamedir', 'libdir', 'oluadirx64', 'ottydirx64', 'outldirx64')},
    'sys/windows/NetHack.ico': 'uudecode',
    **{f'util/{name}.exe': 'build utility' for name in ('dlb', 'makedefs', 'tile2bmp', 'tilemap', 'uudecode')},
    'src/abi-mismatch.c': 'scripts/build-agent-core.ps1 negative ABI test, not part of the game',
    'src/abi-negative.nmk': 'scripts/build-agent-core.ps1 negative ABI test, not part of the game',
}
# Sources the build itself writes and compiles (Makefile rules). Their content is
# not compared; only the rule's presence is checked.
BUILD_GENERATED_SOURCES = {'include/date.h': r'^\$\(INCL\)date\.h\b[^\n]*:\s*\$\(U\)makedefs\.exe', 'src/tile.c': r'^tile\.c:\s*\$\(U\)tilemap\.exe'}
SOURCE_SUFFIXES = ('.c', '.cpp', '.h', '.moc', '.inc')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def git(*args, cwd=ROOT):
    return subprocess.run(['git', *args], cwd=cwd, capture_output=True, text=True, check=True).stdout


def new_artifact_path(value, what):
    """A new file or directory under artifacts; nothing existing is overwritten."""
    path = Path(value).resolve()
    require(path.is_relative_to(ARTIFACTS) and path != ARTIFACTS and not path.exists(), what + ' must be a new path under artifacts')
    return path


def project_inputs():
    files = [ROOT/p for p in PROJECT_INPUTS]
    for directory in PROJECT_INPUT_DIRS:
        files += sorted(p for p in (ROOT/directory).iterdir() if p.is_file())
    return {p.relative_to(ROOT).as_posix(): sha(p) for p in files}


def generated_tree(tree):
    result = {}
    for path in sorted(tree.rglob('*')):
        if not path.is_file():
            continue
        parts = path.relative_to(tree).parts
        if any(parts[:len(prefix)] == prefix for prefix in OUTPUT_DIRS):
            continue
        result[path.relative_to(tree).as_posix()] = sha(path)
    return result


def tools(qt_root):
    moc = Path(qt_root)/'bin/moc.exe'
    version = subprocess.run([str(moc), '-v'], capture_output=True, text=True).stdout.strip() if moc.is_file() else None
    return {'qt_root': str(Path(qt_root)), 'moc_version': version}


def executable_bound(reproduced, clean_build, skip_prepare):
    """Only a clean build that prepared its own tree binds the executable to it."""
    return bool(reproduced and clean_build and not skip_prepare)


def deployed_files(app):
    output = app/'build-inputs.json'
    return {p.relative_to(app).as_posix(): sha(p) for p in sorted(app.rglob('*')) if p.is_file() and p != output}


def record(args):
    tree = TREES[args.language]
    app = Path(args.app).resolve()
    executable = app/f'DarkDungeon-{args.language}.exe'
    linked_map = tree/'src/objtty/x64/NetHack.MAP'
    capabilities = json.loads(Path(str(executable)+'.capabilities.json').read_text(encoding='utf-8-sig'))
    require(capabilities['executable_sha256'] == sha(executable) and capabilities['linked_map_sha256'] == sha(linked_map),
            'Capabilities record does not match the executable and its link map')
    nethack = Path(args.nethack).resolve()
    output = app/'build-inputs.json'
    value = {'schema': 'darkdungeon-build-inputs-v1', 'language': args.language,
             'created_utc': datetime.now(timezone.utc).isoformat(),
             'project_commit': git('rev-parse', 'HEAD').strip(),
             'project_uncommitted': git('status', '--porcelain').splitlines(),
             'nethack_commit': git('rev-parse', 'HEAD', cwd=nethack).strip(),
             'nethack_uncommitted_or_ignored': git('status', '--porcelain', '--ignored', cwd=nethack).splitlines(),
             'clean_build': args.clean_build, 'skip_prepare': args.skip_prepare, 'tools': tools(args.qt_root),
             'project_inputs': project_inputs(),
             'generated_tree_root': tree.relative_to(ROOT).as_posix(),
             'generated_tree': generated_tree(tree),
             'executable_sha256': sha(executable), 'linked_map_sha256': sha(linked_map),
             'capabilities_sha256': sha(Path(str(executable)+'.capabilities.json')),
             'deployed_files': deployed_files(app),
             'scope': 'generation inputs and generated tree at build time; the executable is not rebuilt. '
                      'With clean_build=false, objects from an older tree may remain in the executable.'}
    output.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'build_inputs': str(output), 'generated_files': len(value['generated_tree']),
                      'deployed_files': len(value['deployed_files']), 'clean_build': args.clean_build,
                      'project_uncommitted': len(value['project_uncommitted'])}))


def compare(built, reproduced, makefile, linked_map, includes):
    """Files of the reproduced tree must be identical in the built tree. A file
    only in the built tree must be a declared build output. A declared source
    there that the build does not write itself (abi-mismatch.c) must not be
    compiled, linked or included by the generated sources."""
    differing = sorted(k for k in reproduced if k in built and built[k] != reproduced[k])
    missing = sorted(k for k in reproduced if k not in built)
    build_only = sorted(k for k in built if k not in reproduced)
    unexpected = [k for k in build_only if k not in BUILD_OUTPUTS]
    require(not unexpected, 'Unexpected file only in the build tree: ' + ', '.join(unexpected))
    for name, rule in BUILD_GENERATED_SOURCES.items():
        require(re.search(rule, makefile, re.M), 'Build rule for a generated source changed: ' + name)
    included = {Path(m).name for m in re.findall(r'#\s*include\s*[<"]([^>"]+)[>"]', includes)}
    unlinked = []
    for name in build_only:
        path = Path(name)
        if name in BUILD_GENERATED_SOURCES or path.suffix not in SOURCE_SUFFIXES:
            continue
        require(path.name not in makefile and f'{path.stem}.o' not in makefile and f'{path.stem}.o' not in linked_map,
                'Source not produced by the generation is compiled or linked: ' + name)
        require(path.name not in included, 'Source not produced by the generation is included: ' + name)
        unlinked.append(name)
    return differing, missing, build_only, unlinked


def self_test(args):
    """Synthetic checks of compare(); no generation or game is run."""
    checks = []
    makefile = '$(INCL)date.h $(OPTIONS_FILE) : $(U)makedefs.exe\ntile.c: $(U)tilemap.exe\nQT_OBJS = $(OTTY)qt_main.o\n'
    built = {'src/a.c': '1', 'win/Qt/qt_main.cpp': '2', 'include/date.h': '3', 'src/tile.c': '4',
             'src/abi-mismatch.c': '5', 'util/makedefs.exe': '7', 'dat/rumors': '8'}
    reproduced = {'src/a.c': '1', 'win/Qt/qt_main.cpp': '2'}
    differing, missing, build_only, unlinked = compare(built, reproduced, makefile, 'qt_main.o', '#include "qt_main.h"')
    require(not differing and not missing and unlinked == ['src/abi-mismatch.c'], 'expected tree accepted')
    checks.append('reproduced tree with declared build outputs is accepted')
    require(compare(dict(built, **{'src/a.c': 'x'}), reproduced, makefile, '', '')[0] == ['src/a.c'], 'differing file')
    checks.append('a generated file that differs from the build is reported')
    require(compare({k: v for k, v in built.items() if k != 'src/a.c'}, reproduced, makefile, '', '')[1] == ['src/a.c'], 'missing file')
    checks.append('a generated file missing from the build is reported')
    cases = (
        ('leftover Lua level', dict(built, **{'dat/old.lua': '9'}), makefile, '', '', 'Unexpected file only in the build tree: dat/old.lua'),
        ('leftover Qt source', dict(built, **{'win/Qt/old.cpp': '9'}), makefile, '', '', 'Unexpected file only in the build tree: win/Qt/old.cpp'),
        ('leftover moc output', dict(built, **{'src/old.moc': '9'}), makefile, '', '', 'Unexpected file only in the build tree: src/old.moc'),
        ('declared source linked', built, makefile, 'abi-mismatch.o', '', 'Source not produced by the generation is compiled or linked: src/abi-mismatch.c'),
        ('declared source named in the Makefile', built, makefile + 'x.o: abi-mismatch.c\n', '', '', 'Source not produced by the generation is compiled or linked: src/abi-mismatch.c'),
        ('declared source included by path', built, makefile, '', '#include "../src/abi-mismatch.c"', 'Source not produced by the generation is included: src/abi-mismatch.c'),
    )
    for name, tree, mk, linked, includes, expected in cases:
        try:
            compare(tree, reproduced, mk, linked, includes)
        except ValueError as error:
            require(str(error) == expected, 'wrong rejection: ' + name + ': ' + str(error))
            checks.append('rejected: ' + name)
        else:
            raise ValueError('accepted: ' + name)
    try:
        compare(built, reproduced, 'QT_OBJS =\n', '', '')
    except ValueError as error:
        require(str(error).startswith('Build rule for a generated source changed'), 'wrong rejection: build rule')
        checks.append('rejected: build rule for a generated source removed')
    else:
        raise ValueError('accepted: build rule removed')
    for name, path in (('output outside artifacts', ROOT/'docs'), ('existing path under artifacts', ARTIFACTS), ('existing file under artifacts', next(p for p in ARTIFACTS.iterdir() if p.is_file()))):
        try:
            new_artifact_path(path, 'Output')
        except ValueError:
            checks.append('rejected: ' + name)
        else:
            raise ValueError('accepted: ' + name)
    require(executable_bound(True, True, False) and not executable_bound(True, False, False)
            and not executable_bound(True, True, True) and not executable_bound(False, True, False), 'executable binding rule')
    checks.append('executable bound only for a reproduced clean build that prepared its tree')
    print(json.dumps({'mode': 'provenance-self-test', 'checks_passed': len(checks), 'checks': checks,
                      'tool_sha256': sha(Path(__file__)), 'game_executed': False}, indent=2))


def verify(args):
    output = new_artifact_path(args.output, 'Output')
    reproduction = new_artifact_path(args.reproduction, 'Reproduction')
    for suffix in ('.japanese-source', f'.core-port-{args.language}.json', '.prepare.log'):
        new_artifact_path(str(reproduction)+suffix, 'Reproduction side path')
    app = Path(args.app).resolve()
    raw = (app/'build-inputs.json').read_bytes()
    recorded = json.loads(raw.decode('utf-8-sig'))
    require(recorded.get('schema') == 'darkdungeon-build-inputs-v1' and recorded['language'] == args.language, 'Unknown build-input record')
    executable = app/f'DarkDungeon-{args.language}.exe'
    capabilities_path = Path(str(executable)+'.capabilities.json')
    capabilities = json.loads(capabilities_path.read_text(encoding='utf-8-sig'))
    require(sha(executable) == recorded['executable_sha256'] == capabilities['executable_sha256'], 'Executable differs from its build record')
    require(sha(capabilities_path) == recorded['capabilities_sha256'] and capabilities['linked_map_sha256'] == recorded['linked_map_sha256'],
            'Capabilities record differs from the build record')
    deployed = deployed_files(app)
    changed_deployed = sorted(k for k in set(deployed) | set(recorded['deployed_files']) if deployed.get(k) != recorded['deployed_files'].get(k))
    require(not changed_deployed, 'Deployed files changed since the build: ' + ', '.join(changed_deployed))
    current_inputs = project_inputs()
    changed_inputs = sorted(k for k in set(current_inputs) | set(recorded['project_inputs'])
                            if current_inputs.get(k) != recorded['project_inputs'].get(k))
    require(not changed_inputs, 'Generation inputs changed since the build: ' + ', '.join(changed_inputs))
    nethack = Path(args.nethack).resolve()
    require(git('rev-parse', 'HEAD', cwd=nethack).strip() == recorded['nethack_commit'], 'NetHack source commit differs from the build')
    require(not git('status', '--porcelain', '--ignored', cwd=nethack).strip(), 'NetHack source checkout has changed or ignored files')
    command = ['pwsh', '-NoProfile', '-File', str(ROOT/'scripts/prepare-source.ps1'), '-NetHackSource', str(nethack),
               '-Language', args.language, '-SnapshotRoot', str(reproduction)]
    if args.qt_root:
        command += ['-QtRoot', args.qt_root]
    prepared = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
    Path(str(reproduction)+'.prepare.log').write_text(prepared.stdout+prepared.stderr, encoding='utf-8')
    require(prepared.returncode == 0, 'Reproduction preparation failed; see the prepare log')
    reproduced = generated_tree(reproduction)
    tree = ROOT/recorded['generated_tree_root']
    makefile = (reproduction/'src/Makefile').read_text(encoding='utf-8-sig', errors='replace')
    require(sha(tree/'src/objtty/x64/NetHack.MAP') == recorded['linked_map_sha256'], 'Link map differs from the build record')
    linked_map = (tree/'src/objtty/x64/NetHack.MAP').read_text(encoding='utf-8', errors='replace')
    includes = '\n'.join(line for path in reproduction.rglob('*') if path.suffix in SOURCE_SUFFIXES and path.is_file()
                         for line in path.read_text(encoding='utf-8', errors='replace').splitlines() if line.lstrip().startswith('#'))
    differing, missing, build_only, unlinked = compare(recorded['generated_tree'], reproduced, makefile, linked_map, includes)
    result = {'schema': 'darkdungeon-provenance-check-v1', 'created_utc': datetime.now(timezone.utc).isoformat(),
              'language': args.language, 'build_inputs_sha256': hashlib.sha256(raw).hexdigest(),
              'executable_sha256': recorded['executable_sha256'], 'project_commit': recorded['project_commit'],
              'project_uncommitted_at_build': recorded['project_uncommitted'],
              'clean_build': recorded['clean_build'], 'skip_prepare': recorded['skip_prepare'],
              'reproduced_files': len(reproduced), 'differing': differing, 'missing_from_build': missing,
              'build_only_files': build_only, 'build_only_sources_not_built': unlinked,
              'reproduction': reproduction.relative_to(ROOT).as_posix(),
              'reproduced': not differing and not missing,
              'executable_bound_to_tree': executable_bound(not differing and not missing, recorded['clean_build'], recorded['skip_prepare']),
              'game_executed': False, 'runtime_ready': False, 'tool_sha256': sha(Path(__file__)),
              'scope': 'generation inputs -> generated tree reproduced; executable bound by its build record, not rebuilt'}
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k: result[k] if not isinstance(result[k], list) else len(result[k])
                      for k in ('language', 'reproduced', 'executable_bound_to_tree', 'reproduced_files', 'differing',
                                'missing_from_build', 'build_only_files')}))
    require(result['reproduced'], 'The generated tree is not reproduced from the recorded inputs')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('self-test')
    for name in ('record', 'verify'):
        p = sub.add_parser(name)
        p.add_argument('--language', choices=('en', 'ja'), required=True)
        p.add_argument('--app', required=True, help='deployed language directory, e.g. artifacts/<build>/en')
        p.add_argument('--nethack', default=str(ROOT.parent/'NetHack'))
        p.add_argument('--qt-root', default='C:/Qt/6.11.2/msvc2022_64')
    record_parser = sub.choices['record']
    record_parser.add_argument('--clean-build', action='store_true', help='objects were deleted before this build')
    record_parser.add_argument('--skip-prepare', action='store_true', help='the generated tree was not prepared by this build')
    verify_parser = sub.choices['verify']
    verify_parser.add_argument('--reproduction', required=True)
    verify_parser.add_argument('--output', required=True)
    args = parser.parse_args()
    {'record': record, 'verify': verify, 'self-test': self_test}[args.command](args)


if __name__ == '__main__':
    main()
