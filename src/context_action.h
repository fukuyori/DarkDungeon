/* DarkDungeon additions, 2026-10-08. See NetHack dat/license. */
#ifndef DARKDUNGEON_CONTEXT_ACTION_H
#define DARKDUNGEON_CONTEXT_ACTION_H
enum darkdungeon_action_kind {
    DD_ACTION_LOOK, DD_ACTION_PICKUP, DD_ACTION_UP,
    DD_ACTION_DOWN, DD_ACTION_OPEN, DD_ACTION_WAIT
};
int darkdungeon_action_type(int *, int *);
int darkdungeon_basic_action(void);
int darkdungeon_look_here(void);
void darkdungeon_trace(const char *);
#endif
