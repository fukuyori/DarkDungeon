/* DarkDungeon additions, 2026-10-28. See LICENSE (NetHack GPL). */
#ifndef DARKDUNGEON_APP_RUNTIME_H
#define DARKDUNGEON_APP_RUNTIME_H
#include <stddef.h>
#ifdef __cplusplus
extern "C" {
#endif
/* Owned by the C core, including when the frontend has no widgets. */
struct darkdungeon_view_config {
    char *tile_width, *tile_height, *font_size;
    int compact;
};
extern struct darkdungeon_view_config darkdungeon_view;
struct darkdungeon_runtime_config {
    int smoke_enabled;
    /* NULL for ordinary startup; owned for the lifetime of the Qt frontend. */
    const char *manual_data;
};
extern struct darkdungeon_runtime_config darkdungeon_runtime;
struct obj;
int darkdungeon_container_window(struct obj *);
const char *darkdungeon_port_name(void);
const char *darkdungeon_port_description(void);
void darkdungeon_trace(const char *);
void darkdungeon_profile_prefixes(const char *const *, const char *const *, int);
/* Expand after hack.h, separately in the core and the actual frontend. */
#define DD_ABI_FIELDS(X) \
    X(runtime_config, sizeof(struct darkdungeon_runtime_config)) \
    X(runtime_profile_offset, offsetof(struct darkdungeon_runtime_config, manual_data)) \
    X(glyph_map, sizeof(glyph_map)) \
    X(glyph_info, sizeof(glyph_info)) \
    X(window_procs, sizeof(struct window_procs)) \
    X(flags, sizeof(struct flag)) \
    X(iflags, sizeof(struct instance_flags)) \
    X(you, sizeof(struct you)) \
    X(obj, sizeof(struct obj)) \
    X(monst, sizeof(struct monst)) \
    X(glyph_tile_offset, offsetof(glyph_map, tileidx)) \
    X(glyph_map_offset, offsetof(glyph_info, gm)) \
    X(window_print_glyph_offset, offsetof(struct window_procs, win_print_glyph)) \
    X(window_status_update_offset, offsetof(struct window_procs, win_status_update)) \
    X(you_hp_offset, offsetof(struct you, uhp)) \
    X(you_position_offset, offsetof(struct you, ux)) \
    X(wp_Qt_value, wp_Qt) \
    X(wp_agent_value, wp_agent) \
    X(buffer_size, BUFSZ) \
    X(player_name_size, PL_NSIZ)
#define DD_ABI_ENUM(name, expression) dd_abi_##name,
enum { DD_ABI_FIELDS(DD_ABI_ENUM) dd_abi_count };
#undef DD_ABI_ENUM
struct darkdungeon_core_abi { size_t values[dd_abi_count]; };
#define DD_ABI_VALUE(name, expression) (size_t) (expression),
#define DD_ABI_INITIALIZER { { DD_ABI_FIELDS(DD_ABI_VALUE) } }
struct darkdungeon_core_abi darkdungeon_frontend_abi(void);
int darkdungeon_validate_abi(void);
int darkdungeon_core_check(const char *output_path);
int darkdungeon_game_main(int argc, char **argv);
#ifdef __cplusplus
}
#endif
#endif
