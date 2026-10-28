/* DarkDungeon R5 diagnostic compile-time layout probe, 2026. See LICENSE.
 * No game, RNG or frontend is initialized. Sizes are diagnostics, not proof
 * of save compatibility; version.c's actual loader remains authoritative.
 */
#include "hack.h"
#include "patchlevel.h"
#ifdef USE_ISAAC64
#include "isaac64.h"
#endif
#include <stdio.h>
int main(void)
{
    printf("{\"version\":[%d,%d,%d,%d],\"development_status\":%d,\"save_revision\":%d,\"version_compatibility\":%lu,"
           "\"pointer_bytes\":%u,\"long_bytes\":%u,\"unsigned_bytes\":%u,\"uint64_bytes\":%u,"
           "\"monsters\":%d,\"objects\":%d,\"glyphs\":%d,",
           VERSION_MAJOR, VERSION_MINOR, PATCHLEVEL, EDITLEVEL, NH_DEVEL_STATUS, SAVEFILE_REVISION_LEVEL,
           (unsigned long) VERSION_COMPATIBILITY, (unsigned) sizeof(void *),
           (unsigned) sizeof(long), (unsigned) sizeof(unsigned), (unsigned) sizeof(uint64),
           NUMMONS, NUM_OBJECTS, MAX_GLYPH);
#ifdef USE_ISAAC64
    printf("\"rng\":{\"algorithm\":\"ISAAC64\",\"words\":%d,\"word_bytes\":%u,\"seed_api_bytes\":%u},",
           ISAAC64_SZ, (unsigned) sizeof(((isaac64_ctx *) 0)->r[0]), (unsigned) sizeof(unsigned long));
#else
    printf("\"rng\":{\"algorithm\":\"unsupported-for-r5-v1\"},");
#endif
    printf("\"diagnostic_struct_sizes\":{\"you\":%u,\"obj\":%u,\"monst\":%u,\"flag\":%u,\"context\":%u},"
           "\"save_compatibility_verified\":false,\"game_executed\":false}\n",
           (unsigned) sizeof(struct you), (unsigned) sizeof(struct obj),
           (unsigned) sizeof(struct monst), (unsigned) sizeof(struct flag),
           (unsigned) sizeof(struct context_info));
    return 0;
}
