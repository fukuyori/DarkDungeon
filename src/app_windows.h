/* DarkDungeon additions, 2026-10-28. See LICENSE (NetHack GPL).
 * Include after hack.h. Only the registration table lives outside the core. */
#ifndef DARKDUNGEON_APP_WINDOWS_H
#define DARKDUNGEON_APP_WINDOWS_H
struct win_choices {
    struct window_procs *procs;
    void (*ini_routine)(int);
#ifdef WINCHAIN
    void *(*chain_routine)(int, int, void *, void *, void *);
#endif
};
extern struct win_choices darkdungeon_winchoices[];
#endif
