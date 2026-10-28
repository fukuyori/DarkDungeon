// DarkDungeon additions, 2026-10-28. See LICENSE (NetHack GPL).
// This translation unit intentionally does not include NetHack headers.
#include <QtCore/QtCore>
#ifdef Q_OS_WIN
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <QtCore/qt_windows.h>
#include <shellscalingapi.h>
#endif

// Qt frontend diagnostics only. Never infer Windows scale from Qt DPR.
QJsonObject darkdungeon_monitor_scale(unsigned long long nativeWindow)
{
    QJsonObject result{{"status", "unavailable"}, {"percent", QJsonValue::Null},
                       {"monitor", QJsonValue::Null}, {"hresult", QJsonValue::Null},
                       {"method", "MonitorFromWindow/GetScaleFactorForMonitor"}};
#ifdef Q_OS_WIN
    const HWND window = reinterpret_cast<HWND>(static_cast<quintptr>(nativeWindow));
    if (!IsWindow(window)) { result["reason"] = "No valid native window"; return result; }
    const HMONITOR monitor = MonitorFromWindow(window, MONITOR_DEFAULTTONULL);
    MONITORINFOEXW info{}; info.cbSize = sizeof(info);
    if (!monitor || !GetMonitorInfoW(monitor, reinterpret_cast<MONITORINFO*>(&info))) {
        result["reason"] = "Cannot identify intersecting monitor"; return result;
    }
    result["monitor"] = QString::fromWCharArray(info.szDevice);
    wchar_t systemDirectory[MAX_PATH];
    const UINT length = GetSystemDirectoryW(systemDirectory, MAX_PATH);
    if (!length || length >= MAX_PATH) { result["reason"] = "Cannot resolve Windows system directory"; return result; }
    QLibrary library(QString::fromWCharArray(systemDirectory) + "/shcore.dll");
    const auto query = reinterpret_cast<decltype(&GetScaleFactorForMonitor)>(library.resolve("GetScaleFactorForMonitor"));
    if (!query) { result["reason"] = "GetScaleFactorForMonitor unavailable"; return result; }
    DEVICE_SCALE_FACTOR scale = SCALE_100_PERCENT;
    const HRESULT status = query(monitor, &scale);
    result["hresult"] = QString("0x%1").arg(quint32(status), 8, 16, QLatin1Char('0'));
    // Documentation permits a fallback output even on failure: never record it as measured.
    if (status != S_OK || int(scale) <= 0) {
        result["reason"] = "Windows scale query failed"; return result;
    }
    result["percent"] = int(scale); result["status"] = "measured"; result["reason"] = QJsonValue::Null;
#else
    Q_UNUSED(nativeWindow);
    result["reason"] = "Windows monitor scale unavailable on this platform";
#endif
    return result;
}
