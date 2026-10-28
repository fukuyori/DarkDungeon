/* Negative build probe, DarkDungeon 2026-10-28. See LICENSE (NetHack GPL).
 * Linked only into the diagnostic executable, never a game executable. */
#include "hack.h"
#include "app_runtime.h"
extern struct darkdungeon_core_abi darkdungeon_original_frontend_abi(void);
struct darkdungeon_core_abi darkdungeon_frontend_abi(void)
{
    struct darkdungeon_core_abi result = darkdungeon_original_frontend_abi();
    result.values[dd_abi_iflags] ^= 1;
    return result;
}
