// Test-only Qt lock fixture, 2026-10-28. See LICENSE (NetHack GPL).
// Leave a lock after an abrupt helper exit; never terminate a game process.
#include <QtCore/QCoreApplication>
#include <QtCore/QLockFile>
#include <cstdlib>
int main(int argc, char **argv) {
    QCoreApplication application(argc, argv);
    if (argc != 2) return 2;
    QLockFile lock(QString::fromLocal8Bit(argv[1]));
    lock.setStaleLockTime(0);
    if (!lock.tryLock(0)) return 3;
    std::_Exit(0);
}
