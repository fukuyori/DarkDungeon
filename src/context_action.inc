/* DarkDungeon additions, 2026-10-08. Included by NetHack cmd.c.
 * See NetHack dat/license. Existing commands retain their rule checks. */
int
darkdungeon_action_type(int *dx, int *dy)
{
    stairway *stairs;
    int x, y, doors = 0;

    *dx = *dy = 0;
    if (u.uswallow || u.uburied)
        return DD_ACTION_WAIT;
    if (container_at(u.ux, u.uy, TRUE))
        return DD_ACTION_LOOK;
    if (svl.level.objects[u.ux][u.uy])
        return DD_ACTION_PICKUP;
    if ((stairs = stairway_at(u.ux, u.uy)) != 0)
        return stairs->up ? DD_ACTION_UP : DD_ACTION_DOWN;
    for (x = -1; x <= 1; ++x)
        for (y = -1; y <= 1; ++y) {
            coordxy tx = u.ux + x, ty = u.uy + y;
            int glyph, symbol;
            if (!(x || y) || !isok(tx, ty))
                continue;
            glyph = levl[tx][ty].glyph; /* What the hero thinks is there. */
            if (!glyph_is_cmap(glyph))
                continue;
            symbol = glyph_to_cmap(glyph);
            if (symbol == S_vcdoor || symbol == S_hcdoor) {
                ++doors;
                *dx = x;
                *dy = y;
            }
        }
    if (doors) {
        if (doors > 1)
            *dx = *dy = 0; /* Let doopen ask for a direction. */
        return DD_ACTION_OPEN;
    }
    return DD_ACTION_WAIT;
}

int
darkdungeon_basic_action(void)
{
    int dx, dy;
    darkdungeon_trace("Space command reached engine");
    /* Re-evaluate the location; old direction/item answers belong to the
     * previous action. do_repeat restores its saved queue after we return. */
    if (gi.in_doagain)
        cmdq_clear(CQ_REPEAT);
    switch (darkdungeon_action_type(&dx, &dy)) {
    case DD_ACTION_LOOK:
        return darkdungeon_look_here();
    case DD_ACTION_PICKUP:
        return dopickup();
    case DD_ACTION_UP:
        return doup();
    case DD_ACTION_DOWN:
        return dodown();
    case DD_ACTION_OPEN:
        {
            boolean repeating = gi.in_doagain;
            int result;
            if ((dx || dy) && !nohands(gy.youmonst.data))
                cmdq_add_dir(repeating ? CQ_REPEAT : CQ_CANNED,
                             (schar) dx, (schar) dy, 0);
            /* Multiple remembered doors need a fresh, visible prompt. */
            if (repeating && !dx && !dy)
                gi.in_doagain = FALSE;
            result = doopen();
            gi.in_doagain = repeating;
            return result;
        }
    default:
        {
            boolean previous = iflags.menu_requested;
            int result;
            /* Space explicitly requests one turn, including near enemies.
             * Use NetHack's existing force-wait path without changing options. */
            iflags.menu_requested = TRUE;
            result = donull();
            iflags.menu_requested = previous;
            return result;
        }
    }
}
