// DarkDungeon additions, 2026-10-08. NetHack-derived application: see dat/license.
#ifndef DARKDUNGEON_QT_DARKDUNGEON_H
#define DARKDUNGEON_QT_DARKDUNGEON_H
class QPainter;
class QRect;
class QObject;
class QEvent;
class QIcon;
class QMainWindow;
void darkdungeon_layout_toolbars(QMainWindow*);
QIcon darkdungeon_toolbar_icon(const char* command);
bool darkdungeon_request_toolbar_command(int (*command)(void));
int darkdungeon_take_toolbar_command();
bool darkdungeon_route_arrow(QObject*, QEvent*);
void darkdungeon_view_defaults();
bool darkdungeon_draw(QPainter&, int glyph, unsigned flags, const QRect&);
int darkdungeon_background_glyph(int glyph, int x, int y);
void darkdungeon_draw_map_cell(QPainter&, int glyph, int tileidx, unsigned flags,
                             int background, const QRect&);
void darkdungeon_start_hooks();
void darkdungeon_language_init();
void darkdungeon_finish_smoke();
extern "C" void darkdungeon_trace(const char*);
class QString;
class QImage;
class QJsonObject;
QJsonObject darkdungeon_monitor_scale(unsigned long long nativeWindow);
QString darkdungeon_text(const char* english, const char* japanese);
QImage darkdungeon_hero_image();
void darkdungeon_show_inventory();
void darkdungeon_refresh_inventory_view();
void darkdungeon_inventory_notified();
void darkdungeon_paint_doll_cell(QPainter&, int x, int y);
const char* darkdungeon_doll_tip(int x, int y);
bool darkdungeon_inventory_smoke(const QString& output);
#endif
