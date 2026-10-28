/* DarkDungeon source inventory, 2026-10-27. See LICENSE.
 * Reads only compiled static tables; never initializes or runs a game.
 * role-data.inc is extracted without alteration from the selected role.c.
 */
#include "hack.h"
#include <stdio.h>
#include "role-data.inc"
extern glyph_map glyphmap[MAX_GLYPH]; /* generated src/tile.c */
extern int total_tiles_used, maxmontile, maxobjtile, maxothtile;

struct enum_name { int value; const char *name; };
static const struct enum_name object_names[] = {
#define DUMP_ENUMS
#include "objects.h"
#undef DUMP_ENUMS
};
static const struct enum_name monster_names[] = {
#define DUMP_ENUMS
#include "monsters.h"
#undef DUMP_ENUMS
};

static void json_string(const char *s)
{
    const unsigned char *p = (const unsigned char *) s;
    if (!s) { printf("null"); return; }
    putchar('"');
    for (; *p; ++p) {
        if (*p == '"' || *p == '\\') printf("\\%c", *p);
        else if (*p < 32) printf("\\u%04x", *p);
        else putchar(*p);
    }
    putchar('"');
}

static const char *enum_label(const struct enum_name *table, size_t count, int n)
{
    size_t i;
    for (i = 0; i < count; ++i) if (table[i].value == n) return table[i].name;
    return NULL;
}

struct glyph_range { const char *name; int start; int end; };
#define RANGE(name, start, end) { name, start, end }
static const struct glyph_range ranges[] = {
    RANGE("monster.male", GLYPH_MON_MALE_OFF, GLYPH_MON_FEM_OFF),
    RANGE("monster.female", GLYPH_MON_FEM_OFF, GLYPH_PET_OFF),
    RANGE("pet.male", GLYPH_PET_MALE_OFF, GLYPH_PET_FEM_OFF),
    RANGE("pet.female", GLYPH_PET_FEM_OFF, GLYPH_INVIS_OFF),
    RANGE("invisible", GLYPH_INVIS_OFF, GLYPH_DETECT_OFF),
    RANGE("detected.male", GLYPH_DETECT_MALE_OFF, GLYPH_DETECT_FEM_OFF),
    RANGE("detected.female", GLYPH_DETECT_FEM_OFF, GLYPH_BODY_OFF),
    RANGE("corpse", GLYPH_BODY_OFF, GLYPH_RIDDEN_OFF),
    RANGE("ridden.male", GLYPH_RIDDEN_MALE_OFF, GLYPH_RIDDEN_FEM_OFF),
    RANGE("ridden.female", GLYPH_RIDDEN_FEM_OFF, GLYPH_OBJ_OFF),
    RANGE("object", GLYPH_OBJ_OFF, GLYPH_CMAP_OFF),
    RANGE("terrain.stone", GLYPH_CMAP_STONE_OFF, GLYPH_CMAP_MAIN_OFF),
    RANGE("terrain.walls.main", GLYPH_CMAP_MAIN_OFF, GLYPH_CMAP_MINES_OFF),
    RANGE("terrain.walls.mines", GLYPH_CMAP_MINES_OFF, GLYPH_CMAP_GEH_OFF),
    RANGE("terrain.walls.gehennom", GLYPH_CMAP_GEH_OFF, GLYPH_CMAP_KNOX_OFF),
    RANGE("terrain.walls.knox", GLYPH_CMAP_KNOX_OFF, GLYPH_CMAP_SOKO_OFF),
    RANGE("terrain.walls.sokoban", GLYPH_CMAP_SOKO_OFF, GLYPH_CMAP_A_OFF),
    RANGE("terrain.a", GLYPH_CMAP_A_OFF, GLYPH_ALTAR_OFF),
    RANGE("terrain.altars", GLYPH_ALTAR_OFF, GLYPH_CMAP_B_OFF),
    RANGE("terrain.b", GLYPH_CMAP_B_OFF, GLYPH_ZAP_OFF),
    RANGE("effect.zap", GLYPH_ZAP_OFF, GLYPH_CMAP_C_OFF),
    RANGE("effect.c", GLYPH_CMAP_C_OFF, GLYPH_SWALLOW_OFF),
    RANGE("effect.swallow", GLYPH_SWALLOW_OFF, GLYPH_EXPLODE_OFF),
    RANGE("effect.explode", GLYPH_EXPLODE_OFF, GLYPH_WARNING_OFF),
    RANGE("warning", GLYPH_WARNING_OFF, GLYPH_STATUE_OFF),
    RANGE("statue.male", GLYPH_STATUE_MALE_OFF, GLYPH_STATUE_FEM_OFF),
    RANGE("statue.female", GLYPH_STATUE_FEM_OFF, GLYPH_PILETOP_OFF),
    RANGE("piletop.object", GLYPH_OBJ_PILETOP_OFF, GLYPH_BODY_PILETOP_OFF),
    RANGE("piletop.corpse", GLYPH_BODY_PILETOP_OFF, GLYPH_STATUE_MALE_PILETOP_OFF),
    RANGE("piletop.statue.male", GLYPH_STATUE_MALE_PILETOP_OFF, GLYPH_STATUE_FEM_PILETOP_OFF),
    RANGE("piletop.statue.female", GLYPH_STATUE_FEM_PILETOP_OFF, GLYPH_UNEXPLORED_OFF),
    RANGE("unexplored", GLYPH_UNEXPLORED_OFF, GLYPH_NOTHING_OFF),
    RANGE("nothing", GLYPH_NOTHING_OFF, MAX_GLYPH)
};

int main(void)
{
    int i, r, race, g, a, n = 0;
    size_t j;
    objects_globals_init(); /* memcpy of pre-shuffle static data only */
    monst_globals_init(); /* memcpy of static data only */
    printf("{\"counts\":{\"monsters\":%d,\"objects\":%d,\"glyphs\":%d,"
           "\"roles\":%d,\"races\":%d,\"genders\":%d,\"alignments\":%d},",
           NUMMONS, NUM_OBJECTS, MAX_GLYPH, NUM_ROLES, NUM_RACES,
           ROLE_GENDERS, ROLE_ALIGNS);
    printf("\"atlas\":{\"total_tiles_used\":%d,\"max_monster_tile\":%d,"
           "\"max_object_tile\":%d,\"max_other_tile\":%d},",
           total_tiles_used, maxmontile, maxobjtile, maxothtile);
    printf("\"objects\":[");
    for (i = 0; i < NUM_OBJECTS; ++i) {
        if (i) putchar(',');
        printf("{\"id\":%d,\"symbol\":", i);
        json_string(enum_label(object_names, SIZE(object_names), i));
        printf(",\"class\":%d,\"name\":", objects[i].oc_class);
        json_string(obj_descr[i].oc_name);
        printf(",\"description\":"); json_string(obj_descr[i].oc_descr);
        printf(",\"initial_name_known\":%s}", objects[i].oc_name_known ? "true" : "false");
    }
    printf("],\"monsters\":[");
    for (i = 0; i < NUMMONS; ++i) {
        if (i) putchar(',');
        printf("{\"id\":%d,\"symbol\":", i);
        json_string(enum_label(monster_names, SIZE(monster_names), i));
        printf(",\"names\":[");
        for (j = 0; j < NUM_MGENDERS; ++j) {
            if (j) putchar(','); json_string(mons[i].pmnames[j]);
        }
        printf("],\"size\":%u,\"no_random_generation\":%s,\"no_corpse\":%s}",
               mons[i].msize, mons[i].geno & G_NOGEN ? "true" : "false",
               mons[i].geno & G_NOCORPSE ? "true" : "false");
    }
    printf("],\"roles\":[");
    for (r = 0; r < NUM_ROLES; ++r) {
        if (r) putchar(',');
        printf("{\"id\":%d,\"code\":", r); json_string(roles[r].filecode);
        printf(",\"name\":"); json_string(roles[r].name.m);
        printf(",\"monster\":%d,\"leader\":%d,\"guardian\":%d,\"nemesis\":%d}",
               roles[r].mnum, roles[r].ldrnum, roles[r].guardnum, roles[r].neminum);
    }
    printf("],\"races\":[");
    for (race = 0; race < NUM_RACES; ++race) {
        if (race) putchar(',');
        printf("{\"code\":"); json_string(races[race].filecode);
        printf(",\"monster\":%d}", races[race].mnum);
    }
    printf("],\"creation_combinations\":[");
    for (r = 0; r < NUM_ROLES; ++r)
        for (race = 0; race < NUM_RACES; ++race)
            for (g = 0; g < ROLE_GENDERS; ++g)
                for (a = 0; a < ROLE_ALIGNS; ++a) {
                    if (!(roles[r].allow & races[race].allow & ROLE_RACEMASK)
                        || !(roles[r].allow & races[race].allow & genders[g].allow & ROLE_GENDMASK)
                        || !(roles[r].allow & races[race].allow & aligns[a].allow & ROLE_ALIGNMASK)) continue;
                    if (n++) putchar(',');
                    printf("{\"role\":"); json_string(roles[r].filecode);
                    printf(",\"race\":"); json_string(races[race].filecode);
                    printf(",\"gender\":"); json_string(genders[g].filecode);
                    printf(",\"alignment\":"); json_string(aligns[a].filecode);
                    putchar('}');
                }
    printf("],\"ranges\":[");
    for (j = 0; j < SIZE(ranges); ++j) {
        if (j) putchar(',');
        printf("{\"name\":"); json_string(ranges[j].name);
        printf(",\"start\":%d,\"end_exclusive\":%d}", ranges[j].start, ranges[j].end);
    }
    printf("],\"glyph_tiles\":[");
    for (i = 0; i < MAX_GLYPH; ++i) {
        if (i) putchar(','); printf("%d", glyphmap[i].tileidx);
    }
    printf("]}\n");
    return 0;
}
