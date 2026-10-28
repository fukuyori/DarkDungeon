// DarkDungeon additions, 2026-10-28. See LICENSE (NetHack GPL).
// Entry/port metadata are deliberately outside the common C core archive.
#include <QtCore/QCoreApplication>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#ifndef DARKDUNGEON_AGENT_FRONTEND
#include "manual_profile.h"
#endif
#include "app_runtime.h"
extern "C" {
#include "hack.h"
extern struct window_procs darkdungeon_frontend_procs;
int darkdungeon_manual_profile_protocol(void);
}

#ifndef DARKDUNGEON_AGENT_FRONTEND
static ddprofile::Session manualSession;
#endif
extern "C" void darkdungeon_profile_prefixes(const char *const *names, const char *const *paths, int count)
{
#ifndef DARKDUNGEON_AGENT_FRONTEND
    if (manualSession.reportPath.isEmpty()) return;
    if (count) {
        QJsonObject prefixes;
        for (int i = 0; i < count; ++i)
            prefixes[QString::fromLatin1(names[i])] = QString::fromLocal8Bit(paths[i]);
        manualSession.report["prefixes"] = prefixes;
    } else {
        // Called by the Qt port after its application/settings initialization.
        QSettings settings;
        manualSession.report["qt_settings_file"] = settings.fileName();
        manualSession.report["qt_settings_format"] = settings.format() == QSettings::IniFormat ? "ini" : "unexpected";
        manualSession.report["effective_environment_presence"] = ddprofile::environmentPresence();
    }
    if (!manualSession.writeReport()) std::exit(ddprofile::reject("cannot record effective core prefixes"));
#else
    (void) names; (void) paths; (void) count;
#endif
}

extern "C" const char *darkdungeon_port_name()
{
    return darkdungeon_frontend_procs.name;
}
extern "C" const char *darkdungeon_port_description()
{
#ifdef DARKDUNGEON_AGENT_FRONTEND
    return "DarkDungeon agent (no GUI)";
#else
    return "DarkDungeon Qt";
#endif
}

int main(int argc, char **argv)
{
#ifndef DARKDUNGEON_AGENT_FRONTEND
#ifdef DARKDUNGEON_JAPANESE
    const QString language = "ja";
#else
    const QString language = "en";
#endif
    // This query precedes ABI validation, QApplication, settings, and the core.
    if (argc == 2 && std::strcmp(argv[1], "--capabilities") == 0) {
        if (darkdungeon_manual_profile_protocol() != 1) return 4;
        ddprofile::printCapabilities("qt-engine", language);
        return 0;
    }
    const QStringList nativeArguments = ddprofile::arguments(argc, argv);
    if (nativeArguments.size() != argc) return ddprofile::reject("cannot decode native command line");
    int profileFlag = -1;
    for (int i = 1; i < argc; ++i) {
        if (std::strcmp(argv[i], "--manual-profile") == 0) {
            if (profileFlag >= 0 || i + 1 >= argc || argv[i + 1][0] == '-')
                return ddprofile::reject("one --manual-profile PATH is required");
            profileFlag = i++;
        } else if (std::strncmp(argv[i], "--manual-", 9) == 0 || std::strcmp(argv[i], "--capabilities") == 0) {
            return ddprofile::reject("invalid profile or capability arguments");
        }
    }
    if (!darkdungeon_validate_abi()) return 4;
    if (profileFlag >= 0) {
        const auto error = manualSession.begin(QDir::fromNativeSeparators(nativeArguments[profileFlag + 1]),
                                               language, ddprofile::executablePath(argv[0]));
        if (!error.isEmpty()) return ddprofile::reject(error);
        darkdungeon_runtime.manual_data = manualSession.data.constData();
        for (int i = profileFlag; i + 2 < argc; ++i) argv[i] = argv[i + 2];
        argc -= 2;
        argv[argc] = nullptr;
    }
#endif
#ifdef DARKDUNGEON_AGENT_FRONTEND
    if (std::getenv("DARKDUNGEON_SMOKE_OUTPUT")) {
        std::fputs("agent_test_environment_rejected\n", stderr);
        return 3;
    }
#else
    const char *smoke = std::getenv("DARKDUNGEON_SMOKE_OUTPUT");
    darkdungeon_runtime.smoke_enabled = smoke && *smoke;
#endif
#ifdef DARKDUNGEON_AGENT_FRONTEND
    if (!darkdungeon_validate_abi()) return 4;
#endif
    if (argc == 3 && std::strcmp(argv[1], "--self-check") == 0) {
        // This path does not construct QApplication, access settings or start NetHack.
        QCoreApplication application(argc, argv);
        return darkdungeon_core_check(argv[2]);
    }
#ifdef DARKDUNGEON_AGENT_FRONTEND
    // C1-1 establishes the real core and port linkage. Normal startup is gated
    // until C1-2 supplies profile isolation, authentication and session.start.
    std::fputs("agent_startup_not_implemented: C1-2 session runtime required\n", stderr);
    return 3;
#else
    return darkdungeon_game_main(argc, argv);
#endif
}
