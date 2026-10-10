#!/usr/bin/env bash
# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#
# Builds DarkDungeon for Linux or macOS with Qt 6.
#   scripts/build-unix.sh [--language all|en|ja] [--nethack-source DIR] [--output DIR] [--jobs N]
#
# The NetHack source must be a git checkout of the documented commit. Source changes
# shared with Windows come from patches/darkdungeon-unix-<language>.patch, which
# scripts/export-unix-patches.ps1 regenerates whenever scripts/prepare-source.ps1 changes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NETHACK="$ROOT/../NetHack"
LANGUAGE=all
OUTPUT="$ROOT/dist-unix/DarkDungeon"
JOBS="$( (command -v nproc >/dev/null && nproc) || sysctl -n hw.ncpu 2>/dev/null || echo 4)"
REQUIRED_COMMIT=cb453720b1cdff0134f0872d8706fb20a764b0de

die() { echo "build-unix: $*" >&2; exit 1; }
while [ $# -gt 0 ]; do
    case "$1" in
        --language) LANGUAGE="$2"; shift 2 ;;
        --nethack-source) NETHACK="$2"; shift 2 ;;
        --output) OUTPUT="$2"; shift 2 ;;
        --jobs) JOBS="$2"; shift 2 ;;
        *) die "unknown option: $1" ;;
    esac
done
case "$LANGUAGE" in all) LANGUAGES="en ja" ;; en|ja) LANGUAGES="$LANGUAGE" ;; *) die "language must be all, en or ja" ;; esac
mkdir -p "$OUTPUT"
OUTPUT="$(cd "$OUTPUT" && pwd)"
NETHACK="$(cd "$NETHACK" && pwd)" || die "NetHack source not found"
[ "$(git -C "$NETHACK" rev-parse HEAD)" = "$REQUIRED_COMMIT" ] \
    || die "NetHack source must be at commit $REQUIRED_COMMIT"
[ -z "$(git -C "$NETHACK" status --porcelain)" ] || die "NetHack source must be clean: $NETHACK"

case "$(uname -s)" in
    Linux)
        HINTS=linux.501
        QTDIR="${QTDIR:-/usr}"
        QMAKE="${QMAKE:-$(command -v qmake6 || command -v qmake || echo /usr/lib/qt6/bin/qmake)}"
        ;;
    Darwin)
        HINTS=macOS.501
        command -v brew >/dev/null || [ -n "${QTDIR:-}" ] || die "set QTDIR or install Qt with Homebrew"
        QTDIR="${QTDIR:-$(brew --prefix qt)}"
        export PKG_CONFIG_PATH="$QTDIR/lib/pkgconfig${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
        QMAKE="${QMAKE:-$QTDIR/bin/qmake}"
        ;;
    *) die "unsupported system: $(uname -s)" ;;
esac
command -v pkg-config >/dev/null || die "pkg-config is required"
pkg-config --exists Qt6Core Qt6Gui Qt6Widgets || die "Qt 6 (Core, Gui, Widgets) was not found by pkg-config"
QT_CFLAGS="$(pkg-config --cflags Qt6Core Qt6Gui Qt6Widgets)"
QT_LIBS="$(pkg-config --libs Qt6Core Qt6Gui Qt6Widgets)"
QT_LIBEXEC="$(pkg-config --variable=libexecdir Qt6Core || true)"
MOC="${MOC:-$QT_LIBEXEC/moc}"
[ -x "$MOC" ] || MOC="$QTDIR/share/qt/libexec/moc"
[ -x "$MOC" ] || die "moc was not found; set MOC=/path/to/moc"
[ -x "$QMAKE" ] || die "qmake was not found; set QMAKE=/path/to/qmake"

build_language() {
    local lang="$1"
    local src="$ROOT/build/unix-$lang"
    local app="$OUTPUT/$lang"
    echo "== DarkDungeon $lang: preparing $src"
    rm -rf "$src"
    mkdir -p "$src"
    git -C "$NETHACK" archive --format=tar HEAD | tar -x -C "$src"
    # build/ lives inside this repository; keep git apply relative to $src.
    if [ "$lang" = ja ]; then
        GIT_CEILING_DIRECTORIES="$ROOT/build" git -C "$src" apply --whitespace=nowarn "$ROOT/patches/nethack-5.0.1-ja.patch"
    fi
    GIT_CEILING_DIRECTORIES="$ROOT/build" git -C "$src" apply --whitespace=nowarn "$ROOT/patches/darkdungeon-unix-$lang.patch"
    cp "$ROOT/src/context_action.h" "$src/include/"
    cp "$ROOT/src/qt_darkdungeon.cpp" "$ROOT/src/qt_darkdungeon.h" "$ROOT/src/qt_inventory.cpp" "$src/win/Qt/"

    # Add DarkDungeon's Qt source (and the Japanese library) to the Unix makefile.
    local makefile="$src/sys/unix/Makefile.src"
    local extra_objects='$(TARGETPFX)qt_darkdungeon.o $(TARGETPFX)qt_inventory.o '
    [ "$lang" = ja ] && extra_objects+='$(TARGETPFX)jlib.o $(TARGETPFX)jconj.o '
    EXTRA_OBJECTS="$extra_objects" perl -0pi -e '
        s/^WINQTSRC \?= /WINQTSRC ?= ..\/win\/Qt\/qt_darkdungeon.cpp ..\/win\/Qt\/qt_inventory.cpp /m or die "WINQTSRC anchor missing\n";
        s/^WINQTOBJ \?= /WINQTOBJ ?= $ENV{EXTRA_OBJECTS}/m or die "WINQTOBJ anchor missing\n";
    ' "$makefile"
    {
        printf '\n# DarkDungeon additions.\n'
        printf '$(TARGETPFX)qt_darkdungeon.o: ../win/Qt/qt_darkdungeon.cpp ../win/Qt/qt_darkdungeon.h ../include/context_action.h $(HACK_H) $(QTn_H)\n'
        printf '\t$(TARGET_CXX) $(TARGET_CXXFLAGS) -c -o $@ ../win/Qt/qt_darkdungeon.cpp\n'
        printf '$(TARGETPFX)qt_inventory.o: ../win/Qt/qt_inventory.cpp ../win/Qt/qt_darkdungeon.h $(HACK_H) $(QTn_H)\n'
        printf '\t$(TARGET_CXX) $(TARGET_CXXFLAGS) -c -o $@ ../win/Qt/qt_inventory.cpp\n'
        printf '$(TARGETPFX)cmd.o $(TARGETPFX)pickup.o $(TARGETPFX)qt_main.o: ../include/context_action.h\n'
        if [ "$lang" = ja ]; then
            printf 'CFLAGS += -DICUTF8 -DDARKDUNGEON_JAPANESE\n'
            printf 'CCXXFLAGS += -DICUTF8 -DDARKDUNGEON_JAPANESE\n'
            printf '$(TARGETPFX)jlib.o: ../japanese/jlib.c $(HACK_H)\n'
            printf '\t$(TARGET_CC) $(TARGET_CFLAGS) -c -o $@ ../japanese/jlib.c\n'
            printf '$(TARGETPFX)jconj.o: ../japanese/jconj.c\n'
            printf '\t$(TARGET_CC) $(TARGET_CFLAGS) -c -o $@ ../japanese/jconj.c\n'
        fi
    } >> "$makefile"
    if [ "$lang" = ja ]; then
        printf '\n# DarkDungeon Japanese build.\nCFLAGS += -DICUTF8\n' >> "$src/sys/unix/Makefile.utl"
    fi

    (cd "$src" && sh sys/unix/setup.sh "sys/unix/hints/$HINTS")
    # Qt-only build without Qt Multimedia; data and saves stay in the language folder.
    local make_args=(
        WANT_WIN_QT=1 WANT_WIN_QT6=1 WANT_DEFAULT=Qt
        QTDIR="$QTDIR" MOCPATH="$MOC"
        QTCXXFLAGS="$QT_CFLAGS -fPIC -DQT_NO_SOUND" WINLIB="$QT_LIBS" SNDCFLAGS=
        HACKDIR="$app" INSTDIR="$app" VARDIR="$app" SHELLDIR="$src/shell"
        CHOWN=true CHGRP=true
    )
    echo "== DarkDungeon $lang: building"
    make -C "$src" -j"$JOBS" "${make_args[@]}" all
    # $app also holds saves and settings, so it is updated in place, never removed.
    mkdir -p "$app" "$src/shell"
    make -C "$src" "${make_args[@]}" install
    [ -x "$app/nethack" ] || die "$lang: game binary was not installed in $app"
    mv "$app/nethack" "$app/DarkDungeon-$lang"

    cp "$ROOT/VERSION" "$app/"
    cp "$ROOT/docs/play-guide-$lang.md" "$app/play-guide.md"
    for group in hero monster; do
        if [ -d "$ROOT/sprites/$group" ]; then
            mkdir -p "$app/sprites/$group"
            cp "$ROOT/sprites/$group/"*.png "$app/sprites/$group/"
        fi
    done
    mkdir -p "$app/licenses"
    cp "$ROOT/LICENSE" "$ROOT/THIRD-PARTY-NOTICES.md" "$app/licenses/"
    cp "$src/dat/license" "$app/licenses/NetHack.txt"
    [ "$lang" = ja ] && cp "$ROOT/docs/localization.md" "$app/licenses/"
    # The launcher points NETHACKOPTIONS here so ~/.nethackrc is not used.
    [ -f "$app/darkdungeonrc" ] || printf 'OPTIONS=windowtype:Qt\n' > "$app/darkdungeonrc"
    echo "== DarkDungeon $lang: $app/DarkDungeon-$lang"
}

build_launcher() {
    local dir="$ROOT/build/unix-launcher"
    rm -rf "$dir"
    mkdir -p "$dir"
    cat > "$dir/launcher.pro" <<EOF
# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
QT += widgets
CONFIG += c++17 release
CONFIG -= app_bundle
TARGET = DarkDungeon
DESTDIR = $OUTPUT
SOURCES = $ROOT/src/launcher.cpp
EOF
    (cd "$dir" && "$QMAKE" launcher.pro && make -j"$JOBS")
    cp "$ROOT/VERSION" "$OUTPUT/"
    mkdir -p "$OUTPUT/licenses"
    cp "$ROOT/LICENSE" "$ROOT/THIRD-PARTY-NOTICES.md" "$OUTPUT/licenses/"
    echo "== DarkDungeon launcher: $OUTPUT/DarkDungeon"
}

for lang in $LANGUAGES; do build_language "$lang"; done
[ "$LANGUAGE" = all ] && build_launcher
echo "Done. Run $OUTPUT/DarkDungeon"
