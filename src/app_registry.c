/* DarkDungeon additions, 2026-10-28. See LICENSE (NetHack GPL). */
#include "hack.h"
#include "app_windows.h"
extern struct window_procs darkdungeon_frontend_procs;
struct win_choices darkdungeon_winchoices[] = {
    { &darkdungeon_frontend_procs, 0
#ifdef WINCHAIN
      , 0
#endif
    },
    { 0, 0
#ifdef WINCHAIN
      , 0
#endif
    }
};
