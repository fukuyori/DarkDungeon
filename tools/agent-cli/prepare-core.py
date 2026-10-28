"""C1 core/frontend split of prepared sources. See LICENSE (NetHack GPL).

Called once at the end of prepare-source.ps1; never patches the input checkout.
Every edit is anchored and fails rather than silently using an old layout.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil

parser = argparse.ArgumentParser()
parser.add_argument("snapshot", type=Path)
parser.add_argument("--upstream", type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
snapshot = args.snapshot.resolve()
if snapshot not in (root / "build/nethack", root / "build/nethack-ja"):
    raise SystemExit("snapshot must be one of the prepared project trees")

# Check the reviewed pre-migration inputs before changing any of their files.
language = "ja" if snapshot.name.endswith("-ja") else "en"
reference = json.loads((root / f"docs/data/agent-core-port-branches.{language}.json").read_text(encoding="utf-8-sig"))
for relative, expected in {entry["path"]: entry["source_sha256"] for entry in reference["branches"]}.items():
    actual = hashlib.sha256((snapshot / relative).read_bytes()).hexdigest().upper()
    if actual != expected:
        raise SystemExit(f"Pre-migration source differs from C0 reference; review before updating: {relative}")


def edit(relative, transform):
    path = snapshot / relative
    before = path.read_text(encoding="utf-8")
    after = transform(before)
    if before == after:
        raise RuntimeError(f"No core migration applied: {relative}")
    if path.suffix in (".c", ".h", ".cpp"):
        after = "/* Common core split for DarkDungeon, modified 2026-10-28. See dat/license. */\n" + after
    path.write_text(after, encoding="utf-8", newline="\n")


def replace(text, old, new, expected=None):
    count = text.count(old)
    if not count or (expected is not None and count != expected):
        raise RuntimeError(f"Migration anchor count {count}: {old[:100]!r}")
    return text.replace(old, new)


for name in ("app_runtime.h", "app_windows.h", "manual_profile.h"):
    shutil.copyfile(root / "src" / name, snapshot / "include" / name)
for name in ("app_runtime.c", "core_check.c", "agent_port.c", "frontend_main.cpp", "app_registry.c"):
    shutil.copyfile(root / "src" / name, snapshot / "src" / name)

edit("include/config.h", lambda s: replace(s, "#ifdef QT_GRAPHICS\n", """#ifdef DARKDUNGEON_APP
#include "app_runtime.h"
#define DEFAULT_WC_TILED_MAP
#define GRAPHIC_TOMBSTONE
#define IDLECHECKPOINT
#ifndef DEFAULT_WINDOW_SYS
#define DEFAULT_WINDOW_SYS "app"
#endif
#endif

#ifdef QT_GRAPHICS
""", 1))
edit("include/global.h", lambda s: replace(s, "defined(X11_GRAPHICS) || defined(QT_GRAPHICS)",
                                         "defined(DARKDUNGEON_APP) || defined(X11_GRAPHICS) || defined(QT_GRAPHICS)", 1))
edit("include/winprocs.h", lambda s: replace(s, "wp_trace  //", "wp_agent, wp_trace  //", 1))

view_names = {"qt_tilewidth": "tile_width", "qt_tileheight": "tile_height",
              "qt_fontsize": "font_size", "qt_compact_mode": "compact"}


def view_config(s):
    s = replace(s, "#ifdef QT_GRAPHICS", "#ifdef DARKDUNGEON_APP", 4)
    s = re.sub(r"    extern (?:char \*|int )qt_\w+;\n", "", s)
    for old, field in view_names.items():
        s = re.sub(rf"\b{old}\b", f"darkdungeon_view.{field}", s)
    return s


edit("src/cfgfiles.c", view_config)
def options(s):
    s = replace(replace(s, "#ifdef QT_GRAPHICS", "#ifdef DARKDUNGEON_APP", 1),
                "} else if (WINDOWPORT(Qt)) {",
                "} else if (windowprocs.wincap2 & WC2_HITPOINTBAR) {", 1)
    s = replace(s, '#if defined(TTY_GRAPHICS) || defined(CURSES_GRAPHICS)\n#define PREV_MSGS',
                '#if defined(TTY_GRAPHICS) || defined(CURSES_GRAPHICS) || defined(DARKDUNGEON_APP)\n#define PREV_MSGS', 1)
    s = replace(s, "#ifdef TTY_GRAPHICS\n    iflags.prevmsg_window = 's';",
                "#if defined(TTY_GRAPHICS) || defined(DARKDUNGEON_APP)\n    iflags.prevmsg_window = 's';", 1)
    return replace(s, '#ifdef WIN32CON\nstaticfn int\noptfn_subkeyvalue',
                   '#if defined(WIN32CON) || defined(DARKDUNGEON_APP)\nstaticfn int\noptfn_subkeyvalue', 1)


edit("src/options.c", options)
edit("include/optlist.h", lambda s: replace(replace(s,
     '#ifdef TTY_GRAPHICS\n    NHOPTB(menu_overlay',
     '#if defined(TTY_GRAPHICS) || defined(DARKDUNGEON_APP)\n    NHOPTB(menu_overlay', 1),
     '#ifdef WIN32CON\n    NHOPTC(subkeyvalue',
     '#if defined(WIN32CON) || defined(DARKDUNGEON_APP)\n    NHOPTC(subkeyvalue', 1))
edit("src/allmain.c", lambda s: replace(s, '#if defined(MICRO) || defined(WIN32CON)',
     '#if defined(MICRO) || defined(WIN32CON) || defined(DARKDUNGEON_APP)', 1))
edit("src/report.c", lambda s: replace(s, '# if defined(WIN32) && !defined(WIN32CON)',
     '# if defined(WIN32) && !defined(WIN32CON) && !defined(DARKDUNGEON_APP)', 1))
edit("src/files.c", lambda s: replace(s, '#if defined(WIN32) && !defined(WIN32CON)',
     '#if defined(WIN32) && !defined(WIN32CON) && !defined(DARKDUNGEON_APP)', 1))


def metadata(s):
    s = replace(s, '#ifdef QT_GRAPHICS /* too vague; there are multiple incompatible versions */\n    { "Qt", "Qt", TRUE },',
                '#ifdef DARKDUNGEON_APP\n    { "app", "DarkDungeon frontend", TRUE },', 1)
    s = replace(s, "    int i, cnt = 0;\n\n    /* window_opts", """    int i, cnt = 0;
#if defined(DARKDUNGEON_APP) && defined(FOR_RUNTIME) && !defined(MAKEDEFS_C)
    /* The one application frontend is registered outside the common core. */
    for (i = 0; i < SIZE(window_opts) - 1; ++i) {
        window_opts[i].valid = !strcmp(window_opts[i].id, "app")
            || !strcmp(window_opts[i].id, darkdungeon_port_name());
        if (window_opts[i].valid) {
            window_opts[i].id = darkdungeon_port_name();
            window_opts[i].name = darkdungeon_port_description();
            ++cnt;
        }
    }
    return cnt;
#endif

    /* window_opts""", 1)
    field = re.search(r"struct win_information\s*\{(.*?)\};", s, re.S).group(1)
    if "*name;" not in field:
        raise RuntimeError(f"Unknown window metadata layout: {field}")
    s = replace(s, '    defwinsys = GUILaunched ? "mswin" : "tty";', """#ifdef DARKDUNGEON_APP
    defwinsys = darkdungeon_port_name();
#else
    defwinsys = GUILaunched ? "mswin" : "tty";
#endif""", 1)
    return s


edit("src/mdlib.c", metadata)


def registry(s):
    start = s.index("static struct win_choices {")
    end = s.index("\n};", start) + 3
    return s[:start] + '#ifdef DARKDUNGEON_APP\n#include "app_windows.h"\n#define winchoices darkdungeon_winchoices\n#else\n' + s[start:end] + '\n#endif\n' + s[end:]


edit("src/windows.c", registry)


def main(s):
    s = replace(s, "#define MAIN main", "#define MAIN darkdungeon_game_main", 1)
    s = replace(s, "#if defined(MSWIN_GRAPHICS)\n            \"mswin\";",
                '#ifdef DARKDUNGEON_APP\n            "app";\n#elif defined(MSWIN_GRAPHICS)\n            "mswin";', 1)
    # The translated windmain has a disabled English gh.hname branch. Set the
    # runtime port outside that language conditional, before either config pass.
    s = replace(s, '    allopt_array_init();', '    strcpy_s(default_window_sys, sizeof default_window_sys, darkdungeon_port_name());\n    allopt_array_init();', 1)
    s = replace(s, '#ifndef QT_GRAPHICS', '#ifndef DARKDUNGEON_APP', 1)
    s = replace(s, 'char default_window_sys[7]', 'char default_window_sys[128]', 1)
    s = replace(s, 'windowtype = "Qt";', 'windowtype = default_window_sys;')
    s = replace(s, 'if (WINDOWPORT(mswin) || WINDOWPORT(Qt))',
                'if (windowprocs.wincap & WC_TILED_MAP)', 1)
    s, count = re.subn(r'    hdc = GetDC\(hwnd\);\n    if \(hdc\) \{.*?\n    \}', '    iflags.colorcount = 16777216; /* frontend-independent color semantics */', s, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError('Color capability initialization anchor missing')
    s = replace(s, 'darkdungeon_trace("Windows main entry"); hwnd = GetDesktopWindow();', 'darkdungeon_trace("Windows main entry");', 1)
    s = replace(s, '    HWND hwnd;\n    HDC hdc;\n    int bpp;\n', '', 1)
    return s.replace('getenv("DARKDUNGEON_SMOKE_OUTPUT") &&', 'darkdungeon_runtime.smoke_enabled &&')


edit("sys/windows/windmain.c", main)
def manual_storage(s):
    s = replace(replace(replace(s, "defined(QT_GRAPHICS)", "defined(DARKDUNGEON_APP)", 1), "#ifdef QT_GRAPHICS", "#ifdef DARKDUNGEON_APP", 1),
     'if (smoke && *smoke) {\n            strcpy_s(darkdungeon_data, sizeof(darkdungeon_data), executable_path);',
     'if (darkdungeon_runtime.manual_data) {\n            strcpy_s(darkdungeon_data, sizeof(darkdungeon_data), darkdungeon_runtime.manual_data);\n        } else if (smoke && *smoke) {\n            strcpy_s(darkdungeon_data, sizeof(darkdungeon_data), executable_path);', 1)
    s = replace(s, 'getenv("DARKDUNGEON_SMOKE_OUTPUT")) return', 'darkdungeon_runtime.smoke_enabled) return', 1)
    s = replace(s, 'const char *smoke = getenv("DARKDUNGEON_SMOKE_OUTPUT");', 'int smoke = darkdungeon_runtime.smoke_enabled;', 1)
    s = replace(s, 'if (smoke && *smoke)', 'if (smoke)', 1)
    s = replace(s, 'gf.fqn_prefix[DATAPREFIX] = executable_path;\n        return;',
                'gf.fqn_prefix[DATAPREFIX] = executable_path;\n        if (darkdungeon_runtime.manual_data) {\n            for (prefix = 0; prefix < PREFIX_COUNT; ++prefix) fqn_prefix_locked[prefix] = TRUE;\n            darkdungeon_profile_prefixes(fqn_prefix_names, (const char *const *) gf.fqn_prefix, PREFIX_COUNT);\n        }\n        return;', 1)
    # Link-time coupling: a frontend advertising this protocol requires the
    # storage adapter that was successfully generated above.
    return s + '\nint darkdungeon_manual_profile_protocol(void) { return 1; }\n'


edit("sys/windows/windsys.c", manual_storage)

qt_names = sorted(path.name for path in (args.upstream / "win/Qt").glob("*.cpp"))
if not qt_names:
    raise SystemExit('Upstream Qt source list is empty')
for name in qt_names + ["qt_darkdungeon.cpp", "qt_inventory.cpp"]:
    path = snapshot / "win/Qt" / name
    if not any(name in path.read_text(encoding="utf-8") for name in view_names):
        continue

    def qt_view(s):
        # Delete the old definitions/declarations, keeping compact's zero default.
        names = "|".join(view_names)
        s = re.sub(rf'^(?:extern "C" |extern )?(?:char \*|int )(?:{names})(?:\s*=\s*[^;]+)?;\n', "", s, flags=re.M)
        s = '#include "app_runtime.h"\n' + s
        for old, field in view_names.items():
            s = re.sub(rf"\b{old}\b", f"darkdungeon_view.{field}", s)
        return s

    edit(path.relative_to(snapshot), qt_view)

edit("win/Qt/qt_bind.cpp", lambda s: replace(s, "struct window_procs Qt_procs =", "struct window_procs darkdungeon_frontend_procs =", 1))
edit("win/Qt/qt_bind.cpp", lambda s: replace(s, 'instance=new NetHackQtBind(*argc,argv);',
     'instance=new NetHackQtBind(*argc,argv);\n    darkdungeon_profile_prefixes(nullptr, nullptr, 0);', 1))
with (snapshot / "win/Qt/qt_bind.cpp").open("a", encoding="utf-8") as file:
    file.write('''
extern "C" struct darkdungeon_core_abi darkdungeon_frontend_abi(void)
{
    return DD_ABI_INITIALIZER;
}
''')
edit("win/Qt/qt_darkdungeon.cpp", lambda s: re.sub(
    r'extern "C" void darkdungeon_trace\(const char\* message\) \{.*?\n\}\n', "", s, count=1, flags=re.S))


def makefile(s):
    s = replace(s, 'Qt6Widgets.lib', 'Qt6Widgets.lib shell32.lib', 1)
    s = replace(s, "TTYDEF= -DQT_GRAPHICS", "TTYDEF= -DDARKDUNGEON_APP -DNOTTYGRAPHICS", 1)
    s = replace(s, '-D"_CONSOLE" -DWIN32CON $(CURSESCONDEF1)', '-D"_CONSOLE" $(CURSESCONDEF1)', 1)
    qt_lib = re.search(r'LIBS= /LIBPATH:"([^"]+)"', s).group(1)
    qt_root = qt_lib.removesuffix('/lib')
    qt_inclusions = f'/I"{qt_root}/include" /I"{qt_root}/include/QtCore" /I"{qt_root}/include/QtGui" /I"{qt_root}/include/QtWidgets"'
    s = replace(s, 'INCLUSIONS= /I. ' + qt_inclusions, 'INCLUSIONS= /I.', 1)
    # nmake expands inference-rule macros while reading the rule, so these
    # definitions must precede both the upstream rules and our explicit rules.
    s = replace(s, 'INCLUSIONS= /I.', f'DD_QT_INCLUSIONS = {qt_inclusions}\nDD_RUNTIME_INCLUSIONS = /I"{qt_root}/include" /I"{qt_root}/include/QtCore" /I"{qt_root}/include/QtNetwork"\nINCLUSIONS= /I.', 1)
    # No Qt feature macro can enter a common C/C++ object, including cppregex.
    s = replace(s, '$(CPPFLAGS) $(TTYDEF) -Fo$@ ..\\win\\Qt\\',
                '$(CPPFLAGS) $(TTYDEF) -DQT_GRAPHICS $(DD_QT_INCLUSIONS) -Fo$@ ..\\win\\Qt\\', len(qt_names) + 2)
    s = replace(s, '$(TARGET_CXX) $(TARGET_CXXFLAGS) -Fo$@ ..\\win\\Qt\\',
                '$(TARGET_CXX) $(TARGET_CXXFLAGS) -DQT_GRAPHICS $(DD_QT_INCLUSIONS) -Fo$@ ..\\win\\Qt\\', len(qt_names) * 2)
    s = replace(s, "$(OTTY)qt_inventory.o $(OTTY)tile.o", "$(OTTY)qt_inventory.o", 1)
    # windows.c stays in the core; only app_registry.c owns the frontend table.
    s = replace(s, "ALLOBJTTY  = $(QT_OBJS) $(SOBJTTY) $(DLBOBJTTY) $(OBJSTTY) $(VVOBJTTY) $(LUAOBJTTY)",
                """DD_CORELIB = $(OTTY)darkdungeon-core.lib
DD_GAME_OBJS = $(JOBJTTY) $(OBJSTTY) $(DLBOBJTTY) $(VVOBJTTY) $(LUAOBJTTY) $(OTTY)hacklib.o $(OTTY)tile.o $(OTTY)core_check.o
DD_OS_OBJS = $(OTTY)windsys.o $(OTTY)win10.o $(OTTY)app_runtime.o
DD_COMMON_OBJS = $(DD_GAME_OBJS) $(DD_OS_OBJS)
DD_CORE_OBJS = $(DD_COMMON_OBJS) $(OTTY)date.o
ALLOBJTTY = $(QT_OBJS) $(OTTY)windmain.o $(OTTY)app_registry.o $(OTTY)frontend_main.o $(DD_CORELIB)""", 1)
    if language == 'ja':
        s = replace(s, '$(DD_CORELIB) $(JOBJTTY)', '$(DD_CORELIB)', 1)
    start = s.index("$(GAMEDIR)NetHack.exe :")
    end = s.index("# NetHackW", start)
    block = """$(DD_CORELIB): $(DD_CORE_OBJS)
\tlib /nologo /OUT:$@ @<<
$(DD_CORE_OBJS)
<<

$(GAMEDIR)NetHack.exe : gamedir.tag $(ALLOBJTTY) $(OTTY)console.res $(LUALIB)
\t$(link) $(LFLAGS) $(guilflags) /ENTRY:mainCRTStartup /STACK:2097152 /MAP:$(OTTY)NetHack.MAP /out:$@ @<<
$(ALLOBJTTY) $(OTTY)console.res $(LUALIB) $(LIBS) $(conlibs) $(BCRYPT)
<<
\t@if exist binary.tag del binary.tag

$(GAMEDIR)DarkDungeon-agent.exe : gamedir.tag $(DD_CORELIB) $(OTTY)windmain.o $(OTTY)app_registry.o $(OTTY)agent_port.o $(OTTY)agent_main.o $(LUALIB)
\t$(link) $(LFLAGS) $(conlflags) /STACK:2097152 /MAP:$(OTTY)DarkDungeon-agent.MAP /out:$@ @<<
$(OTTY)windmain.o $(OTTY)app_registry.o $(OTTY)agent_port.o $(OTTY)agent_main.o $(DD_CORELIB) $(LUALIB) $(conlibs) $(BCRYPT) user32.lib winmm.lib /LIBPATH:"@QT_LIB@" Qt6Core.lib Qt6Network.lib
<<

#---------
"""
    s = s[:start] + block.replace("@QT_LIB@", qt_lib) + s[end:]
    s = replace(s, '$(HACKOBJ) $(ALLOBJTTY) $(CURSESOBJ)', '$(HACKOBJ) $(DD_COMMON_OBJS) $(CURSESOBJ)', 1)
    s = replace(s, 'HACK_H = $(CONFIG_H)', 'HACK_H = $(INCL)app_runtime.h $(INCL)app_windows.h $(CONFIG_H)', 1)
    # Agent imports Qt Core + Network only; never the LIBS macro containing Widgets.
    s += """
# C1 common runtime and entry. Both frontends link the very same core archive.
$(OTTY)app_runtime.o: app_runtime.c ..\\include\\app_runtime.h
\t$(CC) $(CFLAGS) $(TTYDEF) /Fo$@ app_runtime.c
$(OTTY)core_check.o: core_check.c $(HACK_H) ..\\include\\app_runtime.h
\t$(CC) $(CFLAGS) $(TTYDEF) /Fo$@ core_check.c
$(OTTY)agent_port.o: agent_port.c $(HACK_H) ..\\include\\app_runtime.h
\t$(CC) $(CFLAGS) $(TTYDEF) /Fo$@ agent_port.c
$(OTTY)app_registry.o: app_registry.c $(HACK_H)
\t$(CC) $(CFLAGS) $(TTYDEF) /Fo$@ app_registry.c
$(OTTY)frontend_main.o: frontend_main.cpp $(HACK_H) ..\\include\\app_runtime.h ..\\include\\manual_profile.h
\t$(CC) $(CPPFLAGS) $(TTYDEF) $(DD_RUNTIME_INCLUSIONS) /Fo$@ frontend_main.cpp
$(OTTY)agent_main.o: frontend_main.cpp $(HACK_H) ..\\include\\app_runtime.h
\t$(CC) $(CPPFLAGS) $(TTYDEF) $(DD_RUNTIME_INCLUSIONS) /DDARKDUNGEON_AGENT_FRONTEND /Fo$@ frontend_main.cpp

dd-core-build.txt: Makefile $(DD_CORELIB)
\t@copy << $@ >nul
CFLAGS=$(CFLAGS)
CPPFLAGS=$(CPPFLAGS)
DEFINES=$(TTYDEF)
OBJECTS=$(DD_CORE_OBJS)
GAME_OBJECTS=$(DD_GAME_OBJS)
OS_OBJECTS=$(DD_OS_OBJS)
<<
"""
    return s


edit("src/Makefile", makefile)
print(json.dumps({"snapshot": str(snapshot), "stage": "C1-1", "common_core": True}))
