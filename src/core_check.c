/* DarkDungeon additions, 2026-10-28. See LICENSE (NetHack GPL).
 * Build/ABI diagnostic only: no new game, save, profile or RNG is created. */
#include "hack.h"
#include "app_runtime.h"
#ifdef QT_GRAPHICS
#error The shared core must not be compiled with QT_GRAPHICS
#endif
#ifndef IDLECHECKPOINT
#error The application core must preserve idle checkpoint support
#endif
extern glyph_map glyphmap[MAX_GLYPH];
static const struct darkdungeon_core_abi core_abi = DD_ABI_INITIALIZER;
#define DD_ABI_NAME(name, expression) #name,
static const char *abi_names[] = { DD_ABI_FIELDS(DD_ABI_NAME) };
#undef DD_ABI_NAME

int darkdungeon_validate_abi(void)
{
    struct darkdungeon_core_abi frontend = darkdungeon_frontend_abi();
    int i;
    for (i = 0; i < dd_abi_count; ++i)
        if (frontend.values[i] != core_abi.values[i]) {
            fprintf(stderr, "core_frontend_abi_mismatch: %s core=%zu frontend=%zu\n",
                    abi_names[i], core_abi.values[i], frontend.values[i]);
            return 0;
        }
    return 1;
}

static int print_abi(FILE *file, const struct darkdungeon_core_abi *abi)
{
    int i;
    if (fputc('{', file) == EOF)
        return 0;
    for (i = 0; i < dd_abi_count; ++i)
        if (fprintf(file, "%s\"%s\":%zu", i ? "," : "", abi_names[i], abi->values[i]) < 0)
            return 0;
    return fputc('}', file) != EOF;
}

int darkdungeon_core_check(const char *output_path)
{
    FILE *file;
    int i, ok;
    unsigned long tile_checksum = 0;
    struct darkdungeon_core_abi frontend = darkdungeon_frontend_abi();
    const char *language =
#ifdef DARKDUNGEON_JAPANESE
        "ja";
#else
        "en";
#endif
    if (!darkdungeon_validate_abi())
        return 4;
    file = fopen(output_path, "wb");
    if (!file)
        return 3;
    for (i = 0; i < MAX_GLYPH; ++i)
        tile_checksum = (tile_checksum * 33UL) ^ (unsigned short) glyphmap[i].tileidx;
    ok = fprintf(file,
        "{\"schema_version\":1,\"language\":\"%s\",\"port\":\"%s\","
        "\"core_qt_graphics\":false,\"game_started\":false,\"abi_matches\":true,"
        "\"max_glyph\":%d,\"tile_checksum\":\"%lu\",\"abi\":",
        language, darkdungeon_port_name(), MAX_GLYPH, tile_checksum) >= 0;
    ok = ok && print_abi(file, &core_abi)
        && fprintf(file, ",\"frontend_abi\":") >= 0
        && print_abi(file, &frontend) && fprintf(file, "}\n") >= 0;
    if (fclose(file) || !ok)
        return 3;
    return 0;
}
