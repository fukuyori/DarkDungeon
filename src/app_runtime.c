/* DarkDungeon additions, 2026-10-28. See LICENSE (NetHack GPL). */
#include "app_runtime.h"
#include <stdio.h>
#include <stdlib.h>
struct darkdungeon_view_config darkdungeon_view = { 0, 0, 0, 0 };
struct darkdungeon_runtime_config darkdungeon_runtime = { 0, 0 };
/* Legacy Windows metadata; no console frontend is linked by this application. */
int GUILaunched = 0;

void darkdungeon_trace(const char *message)
{
    const char *directory = getenv("DARKDUNGEON_SMOKE_OUTPUT");
    char path[4096];
    FILE *file;
    if (!darkdungeon_runtime.smoke_enabled || !directory || !*directory)
        return;
    if (snprintf(path, sizeof path, "%s/startup.txt", directory) >= sizeof path)
        return;
    file = fopen(path, "a");
    if (file) {
        fprintf(file, "%s\n", message);
        fclose(file);
    }
}
