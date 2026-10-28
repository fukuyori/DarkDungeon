/* DarkDungeon additions, 2026-10-28. See LICENSE (NetHack GPL).
 * GUI-independent window port. C1-2/C1-3 will connect these boundaries to
 * the session and public snapshot. Unconnected inputs fail closed. */
#include "hack.h"
#include "app_runtime.h"
#include "context_action.h"

static void unavailable(const char *boundary)
{
    fprintf(stderr, "agent_boundary_not_connected: %s\n", boundary);
    exit(EXIT_FAILURE);
}
static void agent_init(int *argc, char **argv)
{ nhUse(argc); nhUse(argv); unavailable("init_nhwindows"); }
static void agent_selection(void) { unavailable("player_selection"); }
static void agent_askname(void) { unavailable("askname"); }
static void agent_void(void) { }
static void agent_string(const char *s) { nhUse(s); }
static winid agent_create(int type)
{ nhUse(type); unavailable("create_nhwindow"); return WIN_ERR; }
static void agent_window(winid wid) { nhUse(wid); }
static void agent_display(winid wid, boolean blocking)
{ nhUse(wid); if (blocking) unavailable("display_nhwindow"); }
static void agent_curs(winid wid, int x, int y)
{ nhUse(wid); nhUse(x); nhUse(y); }
static void agent_putstr(winid wid, int attr, const char *text)
{ nhUse(wid); nhUse(attr); nhUse(text); unavailable("putstr"); }
static void agent_file(const char *name, boolean complain)
{ nhUse(name); nhUse(complain); unavailable("display_file"); }
static void agent_start_menu(winid wid, unsigned long flags)
{ nhUse(wid); nhUse(flags); unavailable("start_menu"); }
static void agent_add_menu(winid wid, const glyph_info *glyph,
                           const ANY_P *id, char accel, char group, int attr,
                           int color, const char *text, unsigned flags)
{
    nhUse(wid); nhUse(glyph); nhUse(id); nhUse(accel); nhUse(group);
    nhUse(attr); nhUse(color); nhUse(text); nhUse(flags);
    unavailable("add_menu");
}
static void agent_end_menu(winid wid, const char *prompt)
{ nhUse(wid); nhUse(prompt); unavailable("end_menu"); }
static int agent_select(winid wid, int how, MENU_ITEM_P **items)
{ nhUse(wid); nhUse(how); *items = 0; unavailable("select_menu"); return -1; }
static void agent_glyph(winid wid, coordxy x, coordxy y,
                        const glyph_info *foreground, const glyph_info *background)
{ nhUse(wid); nhUse(x); nhUse(y); nhUse(foreground); nhUse(background);
  unavailable("print_glyph"); }
static void agent_raw(const char *text)
{ if (text) fprintf(stderr, "%s\n", text); }
static int agent_key(void) { unavailable("nhgetch"); return 0; }
static int agent_poskey(coordxy *x, coordxy *y, int *mod)
{ nhUse(x); nhUse(y); nhUse(mod); unavailable("nh_poskey"); return 0; }
static int agent_previous(void) { unavailable("doprev_message"); return 0; }
static char agent_yesno(const char *query, const char *choices, char def)
{ nhUse(query); nhUse(choices); nhUse(def); unavailable("yn_function"); return 0; }
static void agent_getlin(const char *query, char *line)
{ nhUse(query); nhUse(line); unavailable("getlin"); }
static int agent_extcmd(void) { unavailable("get_ext_cmd"); return -1; }
static void agent_int(int value) { nhUse(value); }
static void agent_clip(int x, int y) { nhUse(x); nhUse(y); }
#ifdef POSITIONBAR
static void agent_positionbar(char *position) { nhUse(position); }
#endif
static char *agent_history(boolean initialize)
{ nhUse(initialize); return 0; }
static void agent_puthistory(const char *text, boolean restoring)
{ nhUse(text); nhUse(restoring); unavailable("putmsghistory"); }
static void agent_color(int color, long rgb, int reverse)
{ nhUse(color); nhUse(rgb); nhUse(reverse); }
static char *agent_colors(void) { return (char *) 0; }
static void agent_outrip(winid wid, int how, time_t when)
{ nhUse(wid); nhUse(how); nhUse(when); unavailable("outrip"); }
static win_request_info *agent_control(winid wid, int request, win_request_info *info)
{ nhUse(wid); nhUse(request); return info; }

struct window_procs darkdungeon_frontend_procs = {
    .name = "agent", .wp_id = wp_agent,
    .wincap = WC_COLOR | WC_ASCII_MAP | WC_TILED_MAP | WC_PLAYER_SELECTION,
    .wincap2 = WC2_HITPOINTBAR | WC2_U_UTF8STR | WC2_EXTRACOLORS | WC2_STATUSLINES,
    .has_color = { 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1 },
    .win_init_nhwindows = agent_init,
    .win_player_selection = agent_selection, .win_askname = agent_askname,
    .win_get_nh_event = agent_void, .win_exit_nhwindows = agent_string,
    .win_suspend_nhwindows = agent_string, .win_resume_nhwindows = agent_void,
    .win_create_nhwindow = agent_create, .win_clear_nhwindow = agent_window,
    .win_display_nhwindow = agent_display, .win_destroy_nhwindow = agent_window,
    .win_curs = agent_curs, .win_putstr = agent_putstr, .win_putmixed = genl_putmixed,
    .win_display_file = agent_file, .win_start_menu = agent_start_menu,
    .win_add_menu = agent_add_menu, .win_end_menu = agent_end_menu,
    .win_select_menu = agent_select, .win_message_menu = genl_message_menu,
    .win_mark_synch = agent_void, .win_wait_synch = agent_void,
#ifdef CLIPPING
    .win_cliparound = agent_clip,
#endif
#ifdef POSITIONBAR
    .win_update_positionbar = agent_positionbar,
#endif
    .win_print_glyph = agent_glyph, .win_raw_print = agent_raw,
    .win_raw_print_bold = agent_raw, .win_nhgetch = agent_key,
    .win_nh_poskey = agent_poskey, .win_nhbell = agent_void,
    .win_doprev_message = agent_previous, .win_yn_function = agent_yesno,
    .win_getlin = agent_getlin, .win_get_ext_cmd = agent_extcmd,
    .win_number_pad = agent_int, .win_delay_output = agent_void,
#ifdef CHANGE_COLOR
    .win_change_color = agent_color, .win_get_color_string = agent_colors,
#endif
    .win_outrip = agent_outrip, .win_preference_update = agent_string,
    .win_getmsghistory = agent_history, .win_putmsghistory = agent_puthistory,
    .win_status_init = genl_status_init, .win_status_finish = genl_status_finish,
    .win_status_enablefield = genl_status_enablefield,
    .win_status_update = genl_status_update, .win_can_suspend = genl_can_suspend_no,
    .win_update_inventory = agent_int, .win_ctrl_nhwindow = agent_control
};

struct darkdungeon_core_abi darkdungeon_frontend_abi(void)
{
    struct darkdungeon_core_abi result = DD_ABI_INITIALIZER;
    return result;
}

/* Presentation hooks required by the shared game core, never gameplay rules. */
int darkdungeon_container_window(struct obj *container)
{ nhUse(container); return 0; /* use the core's regular container menu */ }
