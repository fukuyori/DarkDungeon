// DarkDungeon additions, 2026-10-28. See LICENSE (NetHack GPL).
// Qt-only startup utilities. No application, settings, or game is constructed
// by a capability query or by validation of a rejected profile.
#ifndef DARKDUNGEON_MANUAL_PROFILE_H
#define DARKDUNGEON_MANUAL_PROFILE_H
#include <QtCore/QtCore>
#include <memory>
#include <cstdio>
#ifdef Q_OS_WIN
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <QtCore/qt_windows.h>
#include <shellapi.h>
#endif

namespace ddprofile {
inline int reject(const QString &reason) {
    const auto bytes = ("manual_profile_rejected: " + reason + "\n").toUtf8();
    std::fwrite(bytes.constData(), 1, bytes.size(), stderr);
    return 2;
}
inline QJsonObject capabilities(const QString &frontend, const QString &language = {}) {
    return {{"schema", "darkdungeon-capabilities-v1"}, {"frontend", frontend},
#ifdef Q_OS_WIN
            {"manual_profile", 1}, {"path_encoding", "ascii-max-path"},
#else
            {"manual_profile", 0}, {"path_encoding", "unsupported"},
#endif
            {"language", language}, {"smoke_automation", false},
            {"seed_control", false}, {"clock_control", false}};
}
inline void printCapabilities(const QString &frontend, const QString &language = {}) {
    const auto bytes = QJsonDocument(capabilities(frontend, language)).toJson(QJsonDocument::Compact) + '\n';
    std::fwrite(bytes.constData(), 1, bytes.size(), stdout);
    std::fflush(stdout);
}
inline QStringList arguments(int argc, char **argv) {
    QStringList result;
#ifdef Q_OS_WIN
    Q_UNUSED(argc); Q_UNUSED(argv);
    int count = 0;
    wchar_t **wide = CommandLineToArgvW(GetCommandLineW(), &count);
    if (!wide) return {};
    for (int i = 0; i < count; ++i) result << QString::fromWCharArray(wide[i]);
    LocalFree(wide);
#else
    for (int i = 0; i < argc; ++i) result << QString::fromLocal8Bit(argv[i]);
#endif
    return result;
}
inline QString executablePath(const char *argv0) {
#ifdef Q_OS_WIN
    Q_UNUSED(argv0);
    wchar_t buffer[32768];
    const DWORD size = GetModuleFileNameW(nullptr, buffer, 32768);
    return size && size < 32768 ? QDir::fromNativeSeparators(QString::fromWCharArray(buffer, size)) : QString();
#else
    return QFileInfo(QString::fromLocal8Bit(argv0)).absoluteFilePath();
#endif
}
inline QString testEnvironmentError() {
    const auto env = QProcessEnvironment::systemEnvironment();
    for (const auto &key : env.keys())
        if (key.startsWith("DARKDUNGEON_SMOKE_", Qt::CaseInsensitive))
            return "inherited test environment: " + key;
    return {};
}
inline QJsonObject environmentPresence() {
    QJsonObject result;
    const auto env = QProcessEnvironment::systemEnvironment();
    for (const auto &key : env.keys())
        if (key.startsWith("DARKDUNGEON_", Qt::CaseInsensitive)) result[key] = true;
    for (const QString &key : {QString("NETHACKOPTIONS"), QString("NETHACKRC")}) result[key] = env.contains(key);
    return result;
}
inline QString verifiedDeployment(const QString &executable, const QString &frontend, const QString &language) {
    QFile manifest(executable + ".capabilities.json");
    if (!manifest.open(QIODevice::ReadOnly) || manifest.size() > 4096) return "missing deployment capability manifest";
    const auto metadata = QJsonDocument::fromJson(manifest.readAll()).object();
    if (metadata["schema"] != "darkdungeon-deployment-capabilities-v1" || metadata["frontend"] != frontend ||
        metadata["manual_profile"].toInt() != 1 || metadata["language"] != language)
        return "unsupported deployment capability manifest";
    QFile binary(executable);
    QCryptographicHash hash(QCryptographicHash::Sha256);
    if (!binary.open(QIODevice::ReadOnly) || !hash.addData(&binary) ||
        metadata["executable_sha256"] != QString::fromLatin1(hash.result().toHex()))
        return "deployment executable hash mismatch";
    return {};
}
inline bool linked(const QString &path) {
#ifdef Q_OS_WIN
    const auto attr = GetFileAttributesW(reinterpret_cast<LPCWSTR>(path.utf16()));
    if (attr != INVALID_FILE_ATTRIBUTES && (attr & FILE_ATTRIBUTE_REPARSE_POINT)) return true;
    if (QFileInfo(path).isFile()) {
        HANDLE handle = CreateFileW(reinterpret_cast<LPCWSTR>(path.utf16()), FILE_READ_ATTRIBUTES,
                                   FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                                   nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
        if (handle == INVALID_HANDLE_VALUE) return true; // fail closed
        BY_HANDLE_FILE_INFORMATION info{};
        const bool bad = !GetFileInformationByHandle(handle, &info) || info.nNumberOfLinks != 1;
        CloseHandle(handle);
        return bad;
    }
#endif
    return QFileInfo(path).isSymLink();
}
inline QString resolvedLocalPath(const QString &path) {
#ifdef Q_OS_WIN
    QString existing = path;
    QStringList tail;
    while (!QFileInfo::exists(existing)) {
        const QFileInfo info(existing);
        tail.prepend(info.fileName());
        const QString parent = info.absolutePath();
        if (parent == existing) return {};
        existing = parent;
    }
    HANDLE handle = CreateFileW(reinterpret_cast<LPCWSTR>(existing.utf16()), FILE_READ_ATTRIBUTES,
                               FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, nullptr,
                               OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, nullptr);
    if (handle == INVALID_HANDLE_VALUE) return {};
    wchar_t buffer[32768];
    const DWORD size = GetFinalPathNameByHandleW(handle, buffer, 32768, FILE_NAME_NORMALIZED | VOLUME_NAME_DOS);
    CloseHandle(handle);
    if (!size || size >= 32768) return {};
    QString resolved = QDir::fromNativeSeparators(QString::fromWCharArray(buffer, size));
    if (resolved.startsWith("//?/UNC/", Qt::CaseInsensitive)) return {};
    if (resolved.startsWith("//?/")) resolved.remove(0, 4);
    if (!tail.isEmpty()) resolved += '/' + tail.join('/');
    return QDir::cleanPath(resolved);
#else
    return QDir::cleanPath(path);
#endif
}
inline QString validatePath(const QString &path, const QString &engineDirectory) {
#ifndef Q_OS_WIN
    Q_UNUSED(path); Q_UNUSED(engineDirectory);
    return "manual profiles are not implemented on this platform";
#else
    // The underlying NetHack Windows file API is still ANSI/MAX_PATH. Reject
    // unsupported input explicitly; never silently choose normal user data.
    if (!QDir::isAbsolutePath(path) || path.startsWith("\\\\") ||
        path.size() < 4 || path[1] != ':' || path.size() > 120 ||
        QDir::cleanPath(path) != QDir::fromNativeSeparators(path))
        return "use a normalized absolute local path of at most 120 ASCII characters";
    for (QChar c : path)
        if (c.unicode() < 32 || c.unicode() > 126)
            return "Unicode profile paths are unsupported by the current Windows core";
    const QString drive = QDir::toNativeSeparators(path.left(3));
    const UINT driveType = GetDriveTypeW(reinterpret_cast<LPCWSTR>(drive.utf16()));
    if (driveType != DRIVE_FIXED && driveType != DRIVE_REMOVABLE) return "profile drive is not a local data drive";
    if (path.contains(':', Qt::CaseSensitive) && path.indexOf(':', 2) >= 0)
        return "alternate data streams are not allowed";
    for (const auto &part : path.mid(3).split('/')) {
        if (part.isEmpty() || part.endsWith('.') || part.endsWith(' ') ||
            part.contains(QRegularExpression("[<>\"|?*]")) ||
            QRegularExpression("^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\\.|$)",
                               QRegularExpression::CaseInsensitiveOption).match(part).hasMatch())
            return "unsupported Windows path component";
    }
    QString ancestor = path;
    while (ancestor.size() > 3) {
        if (linked(ancestor)) return "linked or reparse-point profile path";
        ancestor = QFileInfo(ancestor).absolutePath();
    }
    if (qEnvironmentVariable("LOCALAPPDATA").isEmpty()) return "LOCALAPPDATA is unavailable";
    const QString normal = QDir::fromNativeSeparators(qEnvironmentVariable("LOCALAPPDATA")) + "/DarkDungeon";
    const QString resolved = resolvedLocalPath(path);
    if (resolved.isEmpty()) return "cannot resolve profile path";
    QString deployment = QDir(engineDirectory).absolutePath();
    if (QFileInfo(deployment).fileName() == "en" || QFileInfo(deployment).fileName() == "ja")
        deployment = QFileInfo(deployment).absolutePath();
    for (const auto &protectedPath : {normal, deployment}) {
        const QString protectedResolved = resolvedLocalPath(protectedPath);
        if (protectedResolved.isEmpty()) return "cannot resolve protected data path";
        if (resolved.compare(protectedResolved, Qt::CaseInsensitive) == 0 ||
            resolved.startsWith(protectedResolved + '/', Qt::CaseInsensitive) ||
            protectedResolved.startsWith(resolved + '/', Qt::CaseInsensitive))
            return "profile overlaps normal user data or game deployment";
    }
    if (QFileInfo::exists(path)) {
        if (!QFileInfo(path).isDir()) return "profile is not a directory";
        QDirIterator it(path, QDir::AllEntries | QDir::Hidden | QDir::System | QDir::NoDotAndDotDot,
                        QDirIterator::Subdirectories);
        while (it.hasNext()) if (linked(it.next())) return "profile contains linked files or directories";
        const QString marker = path + "/manual-profile.json";
        if (QFileInfo::exists(marker)) {
            QFile file(marker);
            if (!file.open(QIODevice::ReadOnly) || file.readAll() != "{\"schema\":\"darkdungeon-manual-profile-v1\"}\n")
                return "unrecognized profile marker";
        } else if (!QDir(path).entryList(QDir::AllEntries | QDir::Hidden | QDir::System | QDir::NoDotAndDotDot).isEmpty()) {
            return "existing nonempty directory is not a manual profile";
        }
    }
    return {};
#endif
}
inline void isolateSettings(const QString &directory) {
    QSettings::setDefaultFormat(QSettings::IniFormat);
    QSettings::setPath(QSettings::IniFormat, QSettings::UserScope, directory);
    // Also isolate the fallback search. No registry/system settings are read.
    QSettings::setPath(QSettings::IniFormat, QSettings::SystemScope, directory + "/system");
}
struct Session {
    std::unique_ptr<QLockFile> lock;
    QByteArray data;
    QString reportPath;
    QJsonObject report;
    QString begin(const QString &root, const QString &language, const QString &executable) {
        if (executable.isEmpty() || executable.size() > 200) return "unsupported game deployment path length";
        for (QChar c : executable)
            if (c.unicode() > 127) return "Unicode game deployment paths are unsupported by the current Windows core";
        auto error = validatePath(root, QFileInfo(executable).absolutePath());
        if (!error.isEmpty()) return error;
        error = testEnvironmentError();
        if (!error.isEmpty()) return error;
        if (!QDir().mkpath(root)) return "cannot create profile directory";
        lock = std::make_unique<QLockFile>(root + "/manual.lock");
        lock->setStaleLockTime(0); // a running manual game never expires
        if (!lock->tryLock(0)) return "profile is already in use or cannot be locked";
        // A second process may have initialized this directory after validation.
        const QString marker = root + "/manual-profile.json";
        if (!QFileInfo::exists(marker)) {
            QFile file(marker);
            const QByteArray bytes("{\"schema\":\"darkdungeon-manual-profile-v1\"}\n");
            if (!file.open(QIODevice::WriteOnly | QIODevice::NewOnly) || file.write(bytes) != bytes.size())
                return "cannot write profile marker";
        }
        const QString base = root + '/' + language;
        const QString settings = base + "/settings";
        for (const auto &directory : {base + "/data", settings, base + "/sessions"})
            if (!QDir().mkpath(directory)) return "cannot create language profile directory";
        isolateSettings(settings);
        data = QDir::toNativeSeparators(base + "/data/").toLatin1();
        QFile binary(executable);
        if (!binary.open(QIODevice::ReadOnly)) return "cannot identify game executable";
        QCryptographicHash hash(QCryptographicHash::Sha256);
        if (!hash.addData(&binary)) return "cannot hash game executable";
        report = {{"schema", "darkdungeon-manual-session-v1"}, {"language", language},
                  {"pid", double(QCoreApplication::applicationPid())},
                  {"executable", executable}, {"executable_sha256", QString::fromLatin1(hash.result().toHex())},
                  {"profile", root}, {"data", QString::fromLatin1(data)},
                  {"settings_root", settings}, {"smoke_automation", false},
                  {"startup_environment_presence", environmentPresence()},
                  {"seed_control", false}, {"clock_control", false},
                  {"started_utc", QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs)}};
        reportPath = base + "/sessions/" + QString::number(QCoreApplication::applicationPid()) + '-' +
                     QString::number(QDateTime::currentMSecsSinceEpoch()) + ".json";
        return writeReport() ? QString() : QString("cannot write startup evidence");
    }
    bool writeReport() {
        QSaveFile file(reportPath);
        return file.open(QIODevice::WriteOnly) &&
               file.write(QJsonDocument(report).toJson()) > 0 && file.commit();
    }
};
} // namespace ddprofile
#endif
