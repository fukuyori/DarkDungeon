/* DarkDungeon static R4 capability audit, 2026. See LICENSE.
 * No game, RNG, frontend, or mutable runtime state is initialized.
 * The rider shape predicate is the shape-only part of steed.c:can_ride.
 * It is necessary, not sufficient, for riding or polymorph reachability.
 */
#include "hack.h"
#include <stdio.h>

struct enum_name { int value; const char *name; };
static const struct enum_name monster_names[] = {
#define DUMP_ENUMS
#include "monsters.h"
#undef DUMP_ENUMS
};

static const char *attack_name(int kind)
{
    switch (kind) {
    case AT_NONE: return "AT_NONE";
    case AT_CLAW: return "AT_CLAW";
    case AT_BITE: return "AT_BITE";
    case AT_KICK: return "AT_KICK";
    case AT_BUTT: return "AT_BUTT";
    case AT_TUCH: return "AT_TUCH";
    case AT_STNG: return "AT_STNG";
    case AT_HUGS: return "AT_HUGS";
    case AT_SPIT: return "AT_SPIT";
    case AT_ENGL: return "AT_ENGL";
    case AT_BREA: return "AT_BREA";
    case AT_EXPL: return "AT_EXPL";
    case AT_BOOM: return "AT_BOOM";
    case AT_GAZE: return "AT_GAZE";
    case AT_TENT: return "AT_TENT";
    case AT_WEAP: return "AT_WEAP";
    case AT_MAGC: return "AT_MAGC";
    default: return "UNKNOWN";
    }
}

int main(void)
{
    int i, slot;
    size_t n;
    monst_globals_init(); /* static table memcpy only */
    printf("{\"monster_count\":%d,\"attack_slots\":%d,\"monsters\":[", NUMMONS, NATTK);
    for (i = 0; i < NUMMONS; ++i) {
        const struct permonst *m = &mons[i];
        const char *name = NULL;
        for (n = 0; n < SIZE(monster_names); ++n)
            if (monster_names[n].value == i) name = monster_names[n].name;
        if (!name) return 2;
        if (i) putchar(',');
        printf("{\"id\":%d,\"symbol\":\"%s\",\"humanoid\":%s,\"very_small\":%s,\"big\":%s,\"slithy\":%s,\"polyok\":%s,"
               "\"rider_shape_candidate\":%s,\"attacks\":[", i, name,
               humanoid(m) ? "true" : "false", verysmall(m) ? "true" : "false",
               bigmonst(m) ? "true" : "false", slithy(m) ? "true" : "false", polyok(m) ? "true" : "false",
               humanoid(m) && !verysmall(m) && !bigmonst(m) ? "true" : "false");
        for (slot = 0; slot < NATTK; ++slot) {
            const struct attack *a = &m->mattk[slot];
            if (slot) putchar(',');
            printf("{\"type\":\"%s\",\"empty\":%s}", attack_name(a->aatyp),
                   a->aatyp == AT_NONE && a->adtyp == AD_PHYS && !a->damn && !a->damd
                       ? "true" : "false");
        }
        printf("]}");
    }
    printf("]}\n");
    return 0;
}
