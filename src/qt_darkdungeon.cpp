// DarkDungeon additions, 2026-10-08. NetHack-derived application: see dat/license.
extern "C" {
#include "hack.h"
#include "dlb.h"
#include "context_action.h"
#include "func_tab.h"
#include "app_runtime.h"
extern glyph_map glyphmap[MAX_GLYPH]; // Same tile.c mapping used by the Qt map.
}
#include "qt_pre.h"
#include <QtGui/QtGui>
#include <QtWidgets/QtWidgets>
#include "qt_post.h"
#include "qt_darkdungeon.h"
#include "qt_bind.h"
#include "qt_map.h"
#include "qt_set.h"
#include "qt_glyph.h"
#include "qt_str.h"
#include <cstdlib>
#include <cstdio>
#include <cstring>
#include <cmath>
#include <queue>
#include <functional>
#include <algorithm>

extern "C" void darkdungeon_trace(const char* message) {
    const char* directory=std::getenv("DARKDUNGEON_SMOKE_OUTPUT");
    if(!directory || !*directory)return;
    char path[4096];std::snprintf(path,sizeof(path),"%s/startup.txt",directory);
    if(FILE* file=std::fopen(path,"a")){std::fprintf(file,"%s\n",message);std::fclose(file);}
}

namespace {
std::function<void()> deferredSmoke;
int requestedToolbarCommand=-1;
class PlayGuideDialog : public QDialog {
public:
    using QDialog::QDialog;
protected:
    void keyPressEvent(QKeyEvent* event) override {
        if(event->key()==Qt::Key_Escape)reject();
        event->accept(); // Do not pass reading keys to NetHack's command buffer.
    }
};
QString languageText(const char* english,const char* japanese) {
#ifdef DARKDUNGEON_JAPANESE
    Q_UNUSED(english);return QString::fromUtf8(japanese);
#else
    Q_UNUSED(japanese);return QString::fromUtf8(english);
#endif
}
QString smokePlayerName() {
    const QString name=qEnvironmentVariable("DARKDUNGEON_SMOKE_PLAYER");
    return name.isEmpty()?languageText("Hero","勇者"):name;
}

// Phase0 diagnostics only. No game-state traversal or command dispatch here.
QJsonArray comparisonRect(const QRect& r) {
    return {r.x(),r.y(),r.width(),r.height()};
}
void comparisonTileSize(int width,int height) {
    // Transient dimensions: keep saved settings, spinboxes and alternate zoom intact.
    auto* settings=nethack_qt_::qt_settings;
    settings->tileWidth=width;settings->tileHeight=height;
    settings->glyphs().setSize(width,height);
    settings->setProperty("comparisonChangingTiles",true);settings->tilesChanged();
    settings->setProperty("comparisonChangingTiles",false);
}
void comparisonGeometry(QPointer<nethack_qt_::NetHackQtMapWindow2> map, int remaining=4) {
    if(!map || !map->property("comparisonGeometryActive").toBool())return;
    const QSize wanted(864,432);
    if(map->viewport()->size()==wanted){map->centerOnCursor();return;}
    map->setFixedSize(map->size()+wanted-map->viewport()->size());
    if(remaining>0)QTimer::singleShot(0,map,[map,remaining]{comparisonGeometry(map,remaining-1);});
}
bool comparisonCapture(QMainWindow* main,const QString& directory,QString* error) {
    auto* map=main->findChild<nethack_qt_::NetHackQtMapWindow2*>();
    auto* settings=nethack_qt_::qt_settings;
    const int tile=main->property("comparisonTile").toInt();
    if(!map || (tile!=36 && tile!=48) || map->viewport()->size()!=QSize(864,432)
       || settings->tileWidth!=tile || settings->tileHeight!=tile || settings->glyphs().no_tiles) {
        *error=languageText("Select G36/G48 and wait for the viewport to settle.","G36/G48を選択し、迷宮の寸法が確定してから記録してください。");return false;
    }
    QDir dir(directory);
    // UUID directory is new; never overwrite a previous capture.
    if(dir.exists() || !QDir().mkpath(directory)){*error="Cannot create new capture directory";return false;}
    const auto measureScale=[main] {
        if(QGuiApplication::platformName()=="windows")return darkdungeon_monitor_scale(static_cast<unsigned long long>(main->winId()));
        return QJsonObject{{"status","unavailable"},{"percent",QJsonValue::Null},{"monitor",QJsonValue::Null},
                          {"hresult",QJsonValue::Null},{"method","MonitorFromWindow/GetScaleFactorForMonitor"},
                          {"reason","Not a native Windows platform"}};
    };
    const auto scaleBefore=measureScale();
    const auto client=main->grab();
    const auto viewport=map->viewport()->grab();
    const auto scaleAfter=measureScale();
    const bool scaleStable=scaleBefore["status"]=="measured" && scaleAfter["status"]=="measured"
        && scaleBefore["monitor"]==scaleAfter["monitor"] && scaleBefore["percent"]==scaleAfter["percent"];
    const auto writePng=[&](const QString& name,const QPixmap& image) {
        return !image.isNull() && image.save(dir.filePath(name),"PNG");
    };
    if(!writePng("client.png",client) || !writePng("map.png",viewport)){
        *error="Cannot write capture PNG";return false;
    }
    const auto sha=[](const QString& path) {
        QFile file(path);if(!file.open(QIODevice::ReadOnly))return QString();
        QCryptographicHash hash(QCryptographicHash::Sha256);
        if(!hash.addData(&file))return QString();
        return QString::fromLatin1(hash.result().toHex());
    };
    const QString id=dir.dirName();
    const auto pixelRect=[](const QPixmap& pixmap){return QJsonArray{0,0,pixmap.width(),pixmap.height()};};
    const auto* screen=main->screen();
    const int scrollX=map->horizontalScrollBar()->value(),scrollY=map->verticalScrollBar()->value();
    const auto complete=[tile](int start,int length){return (start+length)/tile-(start+tile-1)/tile;};
    QJsonObject record{
        {"schema","darkdungeon-geometry-capture-v2"},{"capture_id",id},
        {"created_utc",QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs)},
        {"case_kind",darkdungeon_runtime.manual_data?"manual-profile":"assisted-smoke"},
        {"language",languageText("en","ja")},{"suite",QString("G%1").arg(tile)},
        {"capture_backend","QWidget::grab (rendered widget, not desktop presentation)"},
        {"executable",QCoreApplication::applicationFilePath()},
        {"executable_sha256",sha(QCoreApplication::applicationFilePath())},
        {"client_rect_logical",comparisonRect(main->rect())},
        {"window_frame_logical",comparisonRect(main->frameGeometry())},
        {"map_rect_in_client_logical",comparisonRect(QRect(map->viewport()->mapTo(main,QPoint()),map->viewport()->size()))},
        {"map_rect_logical",comparisonRect(map->viewport()->rect())},
        {"client_pixels",pixelRect(client)},{"map_pixels",pixelRect(viewport)},
        {"qt_dpr",main->devicePixelRatioF()},{"map_pixmap_dpr",viewport.devicePixelRatio()},
        {"os_scale_percent",scaleStable?scaleAfter["percent"]:QJsonValue(QJsonValue::Null)},
        {"os_scale_reason",scaleStable?QJsonValue(QJsonValue::Null):QJsonValue("Scale query unavailable or monitor/scale changed during capture")},
        {"os_scale_observation",QJsonObject{{"before",scaleBefore},{"after",scaleAfter},{"stable",scaleStable}}},
        {"screen_available_logical",screen?comparisonRect(screen->availableGeometry()):QJsonArray()},
        {"maximized",main->isMaximized()},{"tile_logical",QJsonArray{tile,tile}},
        {"aligned_cell_capacity",QJsonArray{864/tile,432/tile}},
        {"complete_cells",QJsonArray{complete(scrollX,864),complete(scrollY,432)}},
        {"partial_edge_pixels_ltrb",QJsonArray{scrollX%tile?tile-scrollX%tile:0,scrollY%tile?tile-scrollY%tile:0,(scrollX+864)%tile,(scrollY+432)%tile}},
        {"scroll_pixels",QJsonArray{scrollX,scrollY}},
        {"scroll_maximum",QJsonArray{map->horizontalScrollBar()->maximum(),map->verticalScrollBar()->maximum()}},
        {"raw_media",QJsonObject{{"client.png",sha(dir.filePath("client.png"))},{"map.png",sha(dir.filePath("map.png"))}}},
        {"source_binding_verified",false},{"r5_r6_verified",false},{"runtime_ready",false},
        {"body_measurements",QJsonValue::Null},{"body_measurement_reason","Not measured"}
    };
    record["unmeasured"]=QJsonObject{{"phase_build_session_input_checkpoint","Not linked to R5/R6 record"},
        {"source_generation_and_dirty_diff","Source-to-build binding pending"},
        {"data_asset_settings_sha256","Manifest binding pending"},
        {"public_display_generation","Public snapshot integration pending"},
        {"input_publication_presentation_timing","No presentation timing instrumentation"}};
    QJsonObject classification{{"schema","darkdungeon-capture-classification-v1"},{"capture_id",id},
        {"comparison_class","layout-only"},{"conformance","non-conforming-reference"},{"role","geometry"},
        {"reason","Widget-rendered geometry diagnostic; source binding, R5/R6 and desktop presentation not verified"},
        {"approval_record",QJsonObject{{"status","pending"},{"author",QJsonValue::Null},{"date",QJsonValue::Null},
            {"style_guide_version",QJsonValue::Null},{"style_guide_sha256",QJsonValue::Null},
            {"scope","geometry-measurement"},{"reason","Not reviewed"}}}};
    for(const auto& item:{qMakePair(QString("classification.json"),classification),qMakePair(QString("geometry.json"),record)}) {
        QSaveFile file(dir.filePath(item.first));
        const auto data=QJsonDocument(item.second).toJson();
        if(!file.open(QIODevice::WriteOnly) || file.write(data)!=data.size() || !file.commit()){
            *error="Cannot write capture metadata";return false;
        }
    }
    return true;
}
void installComparisonMenu(QMainWindow* main) {
    if(!darkdungeon_runtime.manual_data)return;
    auto* menu=main->menuBar()->addMenu(languageText("Comparison","表示比較"));
    QObject::connect(nethack_qt_::qt_settings,&nethack_qt_::NetHackQtSettings::tilesChanged,main,[main] {
        if(!main->property("comparisonTile").isValid() || nethack_qt_::qt_settings->property("comparisonChangingTiles").toBool())return;
        // A user's normal zoom/settings action wins; do not restore stale tile values.
        if(auto* map=main->findChild<nethack_qt_::NetHackQtMapWindow2*>()) {
            map->setProperty("comparisonGeometryActive",false);
            map->setMinimumSize(main->property("comparisonMin").toSize());
            map->setMaximumSize(main->property("comparisonMax").toSize());
        }
        main->setProperty("comparisonTile",QVariant());
    });
    for(int tile:{36,48}) {
        auto* action=menu->addAction(QString("G%1 (864 x 432)").arg(tile));
        QObject::connect(action,&QAction::triggered,main,[main,tile] {
            auto* map=main->findChild<nethack_qt_::NetHackQtMapWindow2*>();if(!map)return;
            if(!main->property("comparisonTile").isValid()) {
                main->setProperty("comparisonMin",map->minimumSize());main->setProperty("comparisonMax",map->maximumSize());
                main->setProperty("comparisonOldTile",QSize(nethack_qt_::qt_settings->tileWidth,nethack_qt_::qt_settings->tileHeight));
            }
            main->setProperty("comparisonTile",tile);
            map->setProperty("comparisonGeometryActive",true);
            comparisonTileSize(tile,tile);
            comparisonGeometry(map);
        });
    }
    auto* reset=menu->addAction(languageText("Restore flexible layout","通常の配置に戻す"));
    QObject::connect(reset,&QAction::triggered,main,[main] {
        auto* map=main->findChild<nethack_qt_::NetHackQtMapWindow2*>();
        if(!map || !main->property("comparisonTile").isValid())return;
        map->setProperty("comparisonGeometryActive",false);
        map->setMinimumSize(main->property("comparisonMin").toSize());map->setMaximumSize(main->property("comparisonMax").toSize());
        const auto tile=main->property("comparisonOldTile").toSize();
        comparisonTileSize(tile.width(),tile.height());main->setProperty("comparisonTile",QVariant());
    });
    auto* capture=menu->addAction(languageText("Record geometry reference","寸法の参考記録を保存"));
    QObject::connect(capture,&QAction::triggered,main,[main] {
        QDir data(QString::fromLatin1(darkdungeon_runtime.manual_data));data.cdUp();
        const QString path=data.filePath("captures/"+QUuid::createUuid().toString(QUuid::WithoutBraces));
        QString error;
        const bool ok=comparisonCapture(main,path,&error);
        QMessageBox::information(main,languageText("Comparison","表示比較"),ok?path:error);
    });
}

// Original stonework, cached at the map's default resolution. Use only the
// displayed glyph, never hidden level terrain, to choose a map texture.
const QImage& dungeonTile(int cmap,int x,int y) {
    // Adjacent columns differ by two: half-bricks spanning a cell boundary
    // then have the same shade on both sides of that boundary.
    const int variant=static_cast<int>((static_cast<unsigned>(x)*2U+static_cast<unsigned>(y))%4U);
    const int key=cmap*4+variant;
    static QMap<int,QImage> tiles;
    if(tiles.contains(key))return tiles[key];
    QImage image(48,48,QImage::Format_RGB32);
    image.fill(QColor("#4c4c4c"));
    QPainter p(&image);
    // Large quiet flagstones keep actors and small item symbols readable.
    for(int row=0;row<2;++row)for(int column=-1;column<3;++column) {
        const int left=column*24+(row?12:0);
        const int shade=(variant+row*3+column+4)%4;
        QRect slab(left+1,row*24+1,22,22);
        const int gray=122+shade*3;
        p.fillRect(slab,QColor(gray,gray,gray));
        p.setPen(QColor("#969696"));
        p.drawLine(slab.topLeft(),slab.topRight());p.drawLine(slab.topLeft(),slab.bottomLeft());
        p.setPen(QColor("#606060"));
        p.drawLine(slab.bottomLeft(),slab.bottomRight());p.drawLine(slab.topRight(),slab.bottomRight());
    }
    p.setPen(QColor("#626262"));
    if(variant==1)p.drawPolyline(QPolygon{QPoint(10,3),QPoint(13,7),QPoint(12,11)});
    if(variant==3)p.drawPolyline(QPolygon{QPoint(35,29),QPoint(31,32),QPoint(32,36)});
    if(cmap==S_stone || (cmap>=S_vwall && cmap<=S_trwall)) {
        // A narrow gray bevel avoids a continuous black gutter around rooms.
        p.fillRect(image.rect(),QColor("#404040"));
        enum { North=1,East=2,South=4,West=8 };
        const int connections[]={North|South,East|West,East|South,West|South,
            East|North,West|North,North|East|South|West,North|East|West,
            South|East|West,North|South|West,North|South|East};
        QPainterPath wall;wall.setFillRule(Qt::WindingFill);
        if(cmap==S_stone)wall.addRect(0,0,48,48); // Displayed solid rock.
        else {
            const int arms=connections[cmap-S_vwall];wall.addRect(1,1,46,46);
            if(arms&North)wall.addRect(1,0,46,24);
            if(arms&East)wall.addRect(24,1,24,46);
            if(arms&South)wall.addRect(1,24,46,24);
            if(arms&West)wall.addRect(0,1,24,46);
        }
        wall=wall.simplified();
        p.save();p.setClipPath(wall);p.fillRect(image.rect(),QColor("#292929"));
        for(int row=0;row<3;++row)for(int column=-1;column<3;++column) {
            const int left=column*24+((row+variant)%2?12:0);
            const int shade=(variant+row+column+4)%4;
            QRect block(left+1,row*16+1,22,14);
            const int gray=64+shade*3;
            p.fillRect(block,QColor(gray,gray,gray));
            p.setPen(QColor("#909090"));
            p.drawLine(block.topLeft(),block.topRight());p.drawLine(block.topLeft(),block.bottomLeft());
            p.setPen(QColor("#242424"));
            p.drawLine(block.bottomLeft(),block.bottomRight());p.drawLine(block.topRight(),block.bottomRight());
            p.setPen(QColor("#363636"));
            p.drawLine(block.bottomLeft()+QPoint(1,-1),block.bottomRight()+QPoint(-1,-1));
        }
        p.restore();p.setPen(QPen(QColor("#565656"),1));
        // Outline exposed edges, not the cell boundary where walls connect.
        for(const auto& polygon:wall.toSubpathPolygons())for(int i=1;i<polygon.size();++i) {
            const QPointF a=polygon[i-1],b=polygon[i];
            if((a.x()==b.x() && (a.x()==0 || a.x()==48))
                    || (a.y()==b.y() && (a.y()==0 || a.y()==48)))continue;
            p.drawLine(a,b);
        }
    } else if(cmap==S_darkroom || cmap==S_corr || cmap==S_litcorr) {
        const int shade=cmap==S_darkroom?100:cmap==S_corr?65:30;
        p.fillRect(image.rect(),QColor(0,0,0,shade));
    }
    p.end();tiles.insert(key,image);return tiles[key];
}

// Sprite sheets: 48x48 cells, rows up/right/down/left, columns walk A/B,
// attack wind-up/strike. Missing sheets fall back to NetHack tiles.
const QImage& spriteSheet(const QString& name) {
    static QHash<QString,QImage> sheets;
    auto found=sheets.constFind(name);
    if(found!=sheets.constEnd())return *found;
    QImage image(QCoreApplication::applicationDirPath()+"/sprites/"+name+".png");
    if(!image.isNull() && image.size()!=QSize(192,192))image=QImage();
    return *sheets.insert(name,image.isNull()?image:image.convertToFormat(QImage::Format_ARGB32_Premultiplied));
}
QImage tinted(const QImage& gray,const QColor& tint) {
    QImage image=gray.convertToFormat(QImage::Format_ARGB32);
    for(int y=0;y<image.height();++y) {
        auto* row=reinterpret_cast<QRgb*>(image.scanLine(y));
        for(int x=0;x<image.width();++x)if(qAlpha(row[x])) {
            const int value=qGray(row[x]);
            QColor color=QColor::fromHsv(tint.hsvHue(),value<48?0:tint.hsvSaturation(),value,qAlpha(row[x]));
            row[x]=color.rgba();
        }
    }
    return image;
}
// The hero's layers are chosen from the role, race, gender and alignment.
const QImage& heroSheet() {
    static const QHash<QString,QString> roles{{"Arc","archeologist"},{"Bar","barbarian"},{"Cav","caveman"},
        {"Hea","healer"},{"Kni","knight"},{"Mon","monk"},{"Pri","priest"},{"Ran","ranger"},{"Rog","rogue"},
        {"Sam","samurai"},{"Tou","tourist"},{"Val","valkyrie"},{"Wiz","wizard"}};
    static const QHash<QString,QString> races{{"Hum","human"},{"Elf","elf"},{"Dwa","dwarf"},{"Gno","gnome"},{"Orc","orc"}};
    const QString role=roles.value(QString::fromLatin1(gu.urole.filecode)),race=races.value(QString::fromLatin1(gu.urace.filecode));
    const QString gender=flags.female?"female":"male";
    const int alignment=u.ualign.type;
    const QString key=role+"|"+race+"|"+gender+"|"+QString::number(alignment);
    static QHash<QString,QImage> composites;
    auto found=composites.constFind(key);
    if(found!=composites.constEnd())return *found;
    // Back to front; the shield layer exists only for roles that start with one.
    const QString layers[]={"hero/body_"+race+"_"+gender,"hero/hair_"+gender,"hero/outfit_"+role,"hero/cape",
                            "hero/weapon_"+role,"hero/shield_"+role};
    QImage composite(192,192,QImage::Format_ARGB32_Premultiplied);composite.fill(Qt::transparent);
    QPainter p(&composite);
    for(const QString& layer:layers) {
        const QImage& sheet=spriteSheet(layer);
        if(sheet.isNull() && layer.startsWith("hero/shield_"))continue;
        if(role.isEmpty() || race.isEmpty() || sheet.isNull()){p.end();return *composites.insert(key,QImage());}
        const QColor cape=alignment>0?QColor("#3a6fd8"):alignment<0?QColor("#c83a3a"):QColor("#3a9a4a");
        p.drawImage(0,0,layer=="hero/cape"?tinted(sheet,cape):sheet);
    }
    p.end();return *composites.insert(key,composite);
}
// NetHack's color for a species, applied to the gray body of a class sheet.
QColor speciesColor(int color) {
    static const QColor colors[CLR_MAX]={QColor("#3b3b52"),QColor("#c23a2e"),QColor("#3f9a3a"),QColor("#9a6a32"),
        QColor("#3a5fc8"),QColor("#a33aa8"),QColor("#2e9fa6"),QColor(),QColor(),QColor("#e8862a"),
        QColor("#6fdc4a"),QColor("#e8d13a"),QColor("#5a8cff"),QColor("#e05ae0"),QColor("#5ae0e0"),QColor()};
    return color>=0 && color<CLR_MAX?colors[color]:QColor(); // invalid: gray, no color or white stay as drawn
}
QImage tintedClass(const QImage& gray,const QColor& tint) {
    QImage image=gray.convertToFormat(QImage::Format_ARGB32);
    for(int y=0;y<image.height();++y) {
        auto* row=reinterpret_cast<QRgb*>(image.scanLine(y));
        for(int x=0;x<image.width();++x) {
            const QRgb c=row[x];
            if(!qAlpha(c) || QColor(c).hsvSaturation()>24)continue; // keep colored accents
            const int value=qGray(c);
            if(value<48)continue; // keep outlines
            row[x]=qRgba(std::min(255,tint.red()*value/170),std::min(255,tint.green()*value/170),
                         std::min(255,tint.blue()*value/170),qAlpha(c));
        }
    }
    return image.convertToFormat(QImage::Format_ARGB32_Premultiplied);
}
const QImage& monsterSheet(int monster) {
    static const QImage none;
    if(monster<0 || monster>=NUMMONS)return none;
    switch(monster) { // species with their own artwork
    case PM_LITTLE_DOG: case PM_DOG: case PM_LARGE_DOG:return spriteSheet("monster/dog");
    case PM_JACKAL: case PM_COYOTE:return spriteSheet("monster/jackal");
    case PM_NEWT:return spriteSheet("monster/newt");
    case PM_GNOME:return spriteSheet("monster/gnome");
    default:break;
    }
    static const QHash<int,QString> classes{
        {S_ANT,"ant"},{S_BLOB,"blob"},{S_COCKATRICE,"cockatrice"},{S_DOG,"dog"},{S_EYE,"eye"},{S_FELINE,"feline"},
        {S_GREMLIN,"gremlin"},{S_HUMANOID,"humanoid"},{S_IMP,"imp"},{S_JELLY,"jelly"},{S_KOBOLD,"kobold"},
        {S_LEPRECHAUN,"leprechaun"},{S_MIMIC,"mimic"},{S_NYMPH,"nymph"},{S_ORC,"orc"},{S_PIERCER,"piercer"},
        {S_QUADRUPED,"quadruped"},{S_RODENT,"rodent"},{S_SPIDER,"spider"},{S_TRAPPER,"trapper"},{S_UNICORN,"unicorn"},
        {S_VORTEX,"vortex"},{S_WORM,"worm"},{S_XAN,"xan"},{S_LIGHT,"light"},{S_ZRUTY,"zruty"},{S_ANGEL,"angel"},
        {S_BAT,"bat"},{S_CENTAUR,"centaur"},{S_DRAGON,"dragon"},{S_ELEMENTAL,"elemental"},{S_FUNGUS,"fungus"},
        {S_GNOME,"gnome"},{S_GIANT,"giant"},{S_JABBERWOCK,"jabberwock"},{S_KOP,"kop"},{S_LICH,"lich"},
        {S_MUMMY,"mummy"},{S_NAGA,"naga"},{S_OGRE,"ogre"},{S_PUDDING,"pudding"},{S_QUANTMECH,"quantmech"},
        {S_RUSTMONST,"rustmonst"},{S_SNAKE,"snake"},{S_TROLL,"troll"},{S_UMBER,"umber"},{S_VAMPIRE,"vampire"},
        {S_WRAITH,"wraith"},{S_XORN,"xorn"},{S_YETI,"yeti"},{S_ZOMBIE,"zombie"},{S_HUMAN,"human"},
        {S_GHOST,"ghost"},{S_GOLEM,"golem"},{S_DEMON,"demon"},{S_EEL,"eel"},{S_LIZARD,"lizard"}};
    const QString name=classes.value(mons[monster].mlet);
    if(name.isEmpty())return none;
    const QImage& gray=spriteSheet("monster/class_"+name);
    if(gray.isNull())return none;
    const QColor tint=speciesColor(mons[monster].mcolor);
    if(!tint.isValid())return gray;
    static QHash<int,QImage> tintedSheets;
    auto found=tintedSheets.constFind(monster);
    return found!=tintedSheets.constEnd()?*found:*tintedSheets.insert(monster,tintedClass(gray,tint));
}

// R6 phase 0 uses stationary core-provided glyph tiles.
// New public movement/attack notifications are integrated in phases 3/4.

// Player-chosen toolbar. The built-in buttons stay in place and are only shown
// or hidden; Gear, Action, Magic and Info menu entries become extra buttons that
// trigger the same menu action, so they behave exactly like the menu.
struct ToolbarChoice { QString id,label,group,command; QAction* menuAction=nullptr; QToolButton* builtin=nullptr; };
QString menuLabel(const QAction* action) {
    QString text=action->text().section('\t',0,0);text.remove('&');return text.trimmed();
}
QString commandForMenuData(const QString& data) {
    if(data.startsWith('#')) { // Qt menus store the shortest unique prefix, e.g. "#pra".
        const QByteArray prefix=data.mid(1).toLatin1();
        for(int i=0;extcmdlist[i].ef_txt;++i)
            if(!std::strncmp(extcmdlist[i].ef_txt,prefix.constData(),size_t(prefix.size())))return QString::fromLatin1(extcmdlist[i].ef_txt);
        return QString();
    }
    if(data.size()!=1)return QString();
    const char key=char(data.at(0).unicode());
    for(int i=0;extcmdlist[i].ef_txt;++i)
        if(extcmdlist[i].ef_funct && cmd_from_func(extcmdlist[i].ef_funct)==key)return QString::fromLatin1(extcmdlist[i].ef_txt);
    return QString();
}
QList<QToolBar*> adventureToolbars(QMainWindow* main) {
    QList<QToolBar*> bars;
    for(const char* name:{"adventureToolbar","adventureToolsToolbar"})if(auto* bar=main->findChild<QToolBar*>(name))bars.append(bar);
    return bars;
}
QList<ToolbarChoice> toolbarCatalog(QMainWindow* main) {
    QList<ToolbarChoice> choices;QSet<QString> builtinCommands;
    for(auto* bar:adventureToolbars(main))for(QAction* action:bar->actions())
        if(auto* button=qobject_cast<QToolButton*>(bar->widgetForAction(action))) {
            const QString command=button->property("commandName").toString();
            if(command.isEmpty())continue; // zoom and DarkDungeon-added buttons
            builtinCommands.insert(command);
            choices.append({"builtin:"+command,button->text(),languageText("Standard buttons","標準のボタン"),command,nullptr,button});
        }
    const auto menus=main->menuBar()->actions();
    for(int i=1;i<menus.size();++i) { // 0 is the Game menu.
        QMenu* menu=menus[i]->menu();
        if(!menu || menus[i]->text()==languageText("Help","ヘルプ") || menus[i]->text()==languageText("Language","言語"))continue;
        for(QAction* action:menu->actions()) {
            const QString data=action->data().toString();
            if(action->isSeparator() || action->menu() || data.isEmpty())continue;
            const QString command=commandForMenuData(data);
            if(!command.isEmpty() && builtinCommands.contains(command))continue; // already a standard button
            choices.append({"menu:"+data,menuLabel(action),menuLabel(menus[i]),command,action,nullptr});
        }
    }
    return choices;
}
QStringList defaultToolbarItems(const QList<ToolbarChoice>& catalog) {
    QStringList items;for(const auto& choice:catalog)if(choice.builtin)items.append(choice.id);return items;
}
QStringList savedToolbarItems(const QList<ToolbarChoice>& catalog) {
    const QVariant saved=QSettings().value("toolbar/items");
    return saved.isValid()?saved.toStringList():defaultToolbarItems(catalog);
}
void applyToolbarItems(QMainWindow* main) {
    const QList<ToolbarChoice> catalog=toolbarCatalog(main);
    const QStringList items=savedToolbarItems(catalog);
    auto* tools=main->findChild<QToolBar*>("adventureToolsToolbar");
    if(!tools)return;
    for(auto* bar:adventureToolbars(main))for(QAction* action:bar->actions())
        if(auto* button=qobject_cast<QToolButton*>(bar->widgetForAction(action))) {
            if(button->objectName()=="customToolbarButton"){bar->removeAction(action);button->deleteLater();continue;}
            const QString command=button->property("commandName").toString();
            if(!command.isEmpty())action->setVisible(items.contains("builtin:"+command));
        }
    // Extra buttons go just before the separator in front of the zoom buttons.
    QAction* before=nullptr;
    const auto toolActions=tools->actions();
    for(int i=0;i<toolActions.size();++i)
        if(auto* widget=tools->widgetForAction(toolActions[i]);widget && widget->objectName()=="zoomOut"){before=i?toolActions[i-1]:toolActions[i];break;}
    for(const QString& id:items) {
        auto found=std::find_if(catalog.cbegin(),catalog.cend(),[&](const ToolbarChoice& choice){return choice.id==id && choice.menuAction;});
        if(found==catalog.cend())continue;
        auto* button=new QToolButton(tools);button->setObjectName("customToolbarButton");button->setProperty("toolbarId",id);
        button->setText(found->label);button->setToolTip(found->label);
        button->setIcon(darkdungeon_toolbar_icon(found->command.toLatin1().constData()));
        button->setIconSize(QSize(24,24));button->setToolButtonStyle(Qt::ToolButtonTextUnderIcon);
        button->setMinimumSize(72,52);button->setFocusPolicy(Qt::NoFocus);
        QFont font=button->font();font.setPointSize(11);button->setFont(font);
        QPointer<QAction> menuAction=found->menuAction;
        QObject::connect(button,&QToolButton::clicked,button,[menuAction] {
            if(menuAction && menuAction->isEnabled())menuAction->trigger();
        });
        if(before)tools->insertWidget(before,button);else tools->addWidget(button);
    }
    main->setProperty("adventureTwoToolbarRows",QVariant());
    darkdungeon_layout_toolbars(main);
}
void showToolbarDialog(QMainWindow* main) {
    const QList<ToolbarChoice> catalog=toolbarCatalog(main);
    const QStringList current=savedToolbarItems(catalog);
    QDialog dialog(main);dialog.setObjectName("toolbarDialog");
    dialog.setWindowTitle(languageText("Customize toolbar","ツールバーの設定"));dialog.resize(440,600);
    auto* layout=new QVBoxLayout(&dialog);
    auto* note=new QLabel(languageText("Choose the actions shown on the toolbar. Gear, Action, Magic and Info entries are added after the standard buttons.",
        "ツールバーに表示する行動を選びます。装備・行動・魔法・情報の項目は、標準のボタンの後に追加します。"),&dialog);
    note->setWordWrap(true);layout->addWidget(note);
    auto* tree=new QTreeWidget(&dialog);tree->setObjectName("toolbarChoices");tree->setHeaderHidden(true);layout->addWidget(tree);
    QHash<QString,QTreeWidgetItem*> groups;
    for(const auto& choice:catalog) {
        QTreeWidgetItem*& group=groups[choice.group];
        if(!group){group=new QTreeWidgetItem(tree,QStringList{choice.group});group->setFlags(Qt::ItemIsEnabled);group->setExpanded(true);}
        auto* item=new QTreeWidgetItem(group,QStringList{choice.label});
        item->setFlags(Qt::ItemIsEnabled|Qt::ItemIsUserCheckable);item->setData(0,Qt::UserRole,choice.id);
        item->setCheckState(0,current.contains(choice.id)?Qt::Checked:Qt::Unchecked);
    }
    auto setChecks=[tree](const QStringList& items) {
        for(int g=0;g<tree->topLevelItemCount();++g)for(int c=0;c<tree->topLevelItem(g)->childCount();++c) {
            auto* item=tree->topLevelItem(g)->child(c);
            item->setCheckState(0,items.contains(item->data(0,Qt::UserRole).toString())?Qt::Checked:Qt::Unchecked);
        }
    };
    auto* buttons=new QDialogButtonBox(QDialogButtonBox::Ok|QDialogButtonBox::Cancel|QDialogButtonBox::RestoreDefaults,&dialog);
    buttons->button(QDialogButtonBox::Ok)->setText(languageText("OK","決定"));
    buttons->button(QDialogButtonBox::Cancel)->setText(languageText("Cancel","キャンセル"));
    buttons->button(QDialogButtonBox::RestoreDefaults)->setText(languageText("Restore defaults","初期状態に戻す"));
    QObject::connect(buttons->button(QDialogButtonBox::RestoreDefaults),&QPushButton::clicked,&dialog,[&]{setChecks(defaultToolbarItems(catalog));});
    QObject::connect(buttons,&QDialogButtonBox::accepted,&dialog,&QDialog::accept);
    QObject::connect(buttons,&QDialogButtonBox::rejected,&dialog,&QDialog::reject);
    layout->addWidget(buttons);
    if(dialog.exec()!=QDialog::Accepted)return;
    QStringList items;
    for(int g=0;g<tree->topLevelItemCount();++g)for(int c=0;c<tree->topLevelItem(g)->childCount();++c) {
        auto* item=tree->topLevelItem(g)->child(c);
        if(item->checkState(0)==Qt::Checked)items.append(item->data(0,Qt::UserRole).toString());
    }
    QSettings().setValue("toolbar/items",items);
    applyToolbarItems(main);
}
void installToolbarCustomization(QMainWindow* main) {
    const auto menus=main->menuBar()->actions();
    if(!menus.isEmpty() && menus.first()->menu()) {
        auto* customize=menus.first()->menu()->addAction(languageText("Customize toolbar...","ツールバーの設定..."));
        customize->setObjectName("customizeToolbar");
        QObject::connect(customize,&QAction::triggered,main,[main]{showToolbarDialog(main);});
    }
    for(auto* bar:adventureToolbars(main)) {
        // The Inventory button opens the equipment and inventory window.
        for(auto* button:bar->findChildren<QToolButton*>())if(button->property("commandName")=="inventory") {
            QObject::disconnect(button,&QToolButton::clicked,nullptr,nullptr);
            QObject::connect(button,&QToolButton::clicked,main,[]{darkdungeon_show_inventory();});
        }
        bar->setContextMenuPolicy(Qt::CustomContextMenu);
        QObject::connect(bar,&QWidget::customContextMenuRequested,main,[main]{showToolbarDialog(main);});
    }
    applyToolbarItems(main);
}

}

QString darkdungeon_text(const char* english,const char* japanese) {return languageText(english,japanese);}
QImage darkdungeon_hero_image() {
    if(Upolyd || heroSheet().isNull())return QImage();
    return heroSheet().copy(0,2*48,48,48); // facing down, idle frame
}

bool darkdungeon_draw(QPainter& painter,int glyph,unsigned flags,const QRect& cell) {
    const int x=cell.x()/std::max(1,cell.width()),y=cell.y()/std::max(1,cell.height());
    if(!(flags & MG_HERO) && glyph_is_cmap(glyph)) {
        const int cmap=glyph_to_cmap(glyph);
        if(cmap==S_stone || (cmap>=S_vwall && cmap<=S_trwall) || cmap==S_room || cmap==S_darkroom
                || cmap==S_corr || cmap==S_litcorr || cmap==S_ndoor) {
            painter.drawImage(cell,dungeonTile(cmap,x,y));return true;
        }
    }
    return false; // Actors and items use NetHack tiles.
}

int darkdungeon_background_glyph(int glyph,int x,int y) {
    if(!isok(x,y) || glyph==GLYPH_UNEXPLORED || u.uswallow)return GLYPH_UNEXPLORED;
    // Snapshot terrain while receiving a map update, not while repainting.
    // Detection alone must not disclose terrain beneath an unseen actor.
    if(!Blind && cansee(x,y))return back_to_glyph(x,y);
    if(levl[x][y].seenv && glyph_is_cmap(levl[x][y].glyph))return levl[x][y].glyph;
    return NO_GLYPH; // Keep only a previously displayed background, if any.
}

void darkdungeon_draw_map_cell(QPainter& painter,int glyph,int tileidx,unsigned flags,
                              int background,const QRect& cell) {
    auto& glyphs=nethack_qt_::qt_settings->glyphs();
    const int x=cell.x()/std::max(1,cell.width()),y=cell.y()/std::max(1,cell.height());
    auto terrain=[&](int g,int tile) {
        if(darkdungeon_draw(painter,g,0,cell))return;
        if(glyph_is_cmap(g)) {
            const int cmap=glyph_to_cmap(g);
            if(is_cmap_furniture(cmap) || is_cmap_door(cmap) || is_cmap_trap(cmap)
                    || is_cmap_engraving(cmap)) {
                painter.drawImage(cell,dungeonTile(S_room,x,y));
                glyphs.drawForegroundCell(painter,g,tile,x,y);return;
            }
        }
        glyphs.drawCell(painter,g,tile,x,y);
    };
    painter.fillRect(cell,Qt::black);
    const bool overlay=(flags & MG_HERO) || glyph_is_monster(glyph)
        || glyph_is_object(glyph) || glyph_is_invisible(glyph);
    if(overlay && background>=0 && background<MAX_GLYPH && glyph_is_cmap(background))
        terrain(background,::glyphmap[background].tileidx);
    if(darkdungeon_draw(painter,glyph,flags,cell))return;
    if(overlay)glyphs.drawForegroundCell(painter,glyph,tileidx,x,y);
    else terrain(glyph,tileidx);
}

bool darkdungeon_route_arrow(QObject* receiver,QEvent* event) {
    if(event->type()!=QEvent::KeyPress && event->type()!=QEvent::KeyRelease)return false;
    auto* key=static_cast<QKeyEvent*>(event);
    // 'i' at the command prompt opens the equipment and inventory window.
    if(key->text()=="i" && !(key->modifiers() & (Qt::AltModifier|Qt::ControlModifier|Qt::MetaModifier))) {
        auto* window=qobject_cast<QWidget*>(receiver);
        if(window && window->window()==nethack_qt_::NetHackQtBind::mainWidget() && !QApplication::activeModalWidget()
                && !QApplication::activePopupWidget() && program_state.input_state==commandInp && u.ux) {
            if(event->type()==QEvent::KeyPress && !key->isAutoRepeat())darkdungeon_show_inventory();
            return true;
        }
    }
    const bool space=key->key()==Qt::Key_Space;
    if(!space && (key->key()<Qt::Key_Left || key->key()>Qt::Key_Down))return false;
    if(space && (key->modifiers() & (Qt::AltModifier|Qt::ControlModifier|Qt::MetaModifier)))return false;
    auto* main=nethack_qt_::NetHackQtBind::mainWidget();
    auto* widget=qobject_cast<QWidget*>(receiver);
    if(!main || !widget || widget->window()!=main ||
       QApplication::activeModalWidget() || QApplication::activePopupWidget())return false;
    if(widget==main)return space && key->isAutoRepeat();
    bool inMap=false;
    for(auto* ancestor=widget;ancestor && ancestor!=main;ancestor=ancestor->parentWidget())
        if(qobject_cast<nethack_qt_::NetHackQtMapWindow2*>(ancestor)){inMap=true;break;}
    if(!inMap)return false;
    if(space && key->isAutoRepeat())return true;
    if(space && event->type()==QEvent::KeyPress)darkdungeon_trace("Routing Space from map to main");
    // Scroll areas consume arrow presses before they reach the main window.
    // Route movement and Space before scroll areas can consume them.
    QCoreApplication::sendEvent(main,event);
    return true;
}

bool darkdungeon_request_toolbar_command(int (*command)(void)) {
    const auto* entry=ext_func_tab_from_func(command);
    if(!entry || requestedToolbarCommand>=0)return false;
    requestedToolbarCommand=int(entry-extcmdlist);return true;
}

int darkdungeon_take_toolbar_command() {
    const int command=requestedToolbarCommand;requestedToolbarCommand=-1;return command;
}

QIcon darkdungeon_toolbar_icon(const char* command) {
    // Original vector artwork: render at 2x for sharp edges on high-DPI displays.
    QPixmap image(64,64);image.fill(Qt::transparent);image.setDevicePixelRatio(2);
    QPainter p(&image);p.setRenderHint(QPainter::Antialiasing);
    const QColor outline("#82abc4"),gold("#f2be58"),blue("#318eb7"),dark("#243443");
    p.setPen(QPen(outline,2,Qt::SolidLine,Qt::RoundCap,Qt::RoundJoin));p.setBrush(dark);
    const QByteArray name(command);
    auto path=[&](std::initializer_list<QPointF> points,bool closed=false) {
        QPainterPath shape;bool first=true;
        for(const auto& point:points){if(first){shape.moveTo(point);first=false;}else shape.lineTo(point);}
        if(closed)shape.closeSubpath();p.drawPath(shape);
    };
    auto arrow=[&](QPointF from,QPointF to) {
        p.save();p.setBrush(Qt::NoBrush);p.setPen(QPen(gold,2.5,Qt::SolidLine,Qt::RoundCap,Qt::RoundJoin));
        p.drawLine(from,to);
        const QPointF delta=to-from;const qreal length=std::hypot(delta.x(),delta.y());
        const QPointF unit=delta/length,side(-unit.y(),unit.x());
        path({to-unit*5+side*4,to,to-unit*5-side*4});p.restore();
    };
    auto bag=[&] {
        p.setBrush(blue);path({{10,10},{22,10},{27,26},{24,29},{8,29},{5,26}},true);
        p.setBrush(Qt::NoBrush);p.drawArc(QRectF(11,3,10,12),0,180*16);p.drawLine(10,15,22,15);
    };
    if(name=="repeat") {
        p.setBrush(Qt::NoBrush);p.setPen(QPen(blue,3,Qt::SolidLine,Qt::RoundCap));
        p.drawArc(QRectF(5,5,22,22),45*16,290*16);
        p.setPen(QPen(gold,2.5));path({{20,3},{27,6},{25,13}});
    } else if(name=="pickup" || name=="drop" || name=="droptype") {
        p.setBrush(gold);p.drawRoundedRect(QRectF(4,15,11,12),2,2);
        p.drawLine(4,19,15,19);arrow(name=="pickup"?QPointF(24,27):QPointF(24,4),name=="pickup"?QPointF(24,4):QPointF(24,27));
    } else if(name=="kick") {
        p.setBrush(blue);path({{6,4},{15,4},{15,18},{23,20},{24,27},{5,27}},true);
        p.setPen(QPen(gold,2));path({{25,9},{28,6}});path({{26,14},{30,14}});
    } else if(name=="throw") {
        p.setBrush(gold);p.drawEllipse(QRectF(3,19,9,9));p.setBrush(Qt::NoBrush);
        path({{4,15},{10,11},{17,8}});arrow({17,8},{28,5});
    } else if(name=="fire") {
        p.setBrush(Qt::NoBrush);p.setPen(QPen(blue,3,Qt::SolidLine,Qt::RoundCap));
        p.drawArc(QRectF(3,3,19,26),-90*16,180*16);p.setPen(QPen(outline,1.5));p.drawLine(12,3,12,29);
        arrow({3,16},{29,16});
    } else if(name=="eat") {
        p.setBrush(gold);path({{5,28},{5,12},{3,10},{4,6},{10,3},{22,3},{28,6},{29,10},{27,12},{27,28}},true);
        p.setPen(QPen(dark,2));p.drawLine(11,10,11,23);p.drawLine(20,10,20,23);
    } else if(name=="search" || name=="zoomIn" || name=="zoomOut") {
        p.setBrush(dark);p.drawEllipse(QRectF(3,3,20,20));p.setPen(QPen(blue,4,Qt::SolidLine,Qt::RoundCap));p.drawLine(21,21,29,29);
        if(name!="search") {p.setPen(QPen(gold,2.5));p.drawLine(7,13,19,13);if(name=="zoomIn")p.drawLine(13,7,13,19);}
    } else if(name=="wait") {
        p.setBrush(gold);path({{7,4},{25,4},{25,7},{20,14},{20,18},{25,25},{25,28},{7,28},{7,25},{12,18},{12,14},{7,7}},true);
        p.setPen(QPen(dark,2));p.drawLine(11,7,21,7);p.drawLine(12,25,20,25);
    } else if(name=="inventory") {
        bag();
    } else if(name=="wield") {
        p.setBrush(blue);path({{10,19},{24,4},{28,4},{28,8},{14,23}},true);
        p.setPen(QPen(gold,3));p.drawLine(7,16,18,27);p.drawLine(5,28,11,22);
    } else if(name=="apply") {
        p.setBrush(blue);path({{5,5},{11,10},{16,5},{17,12},{13,17},{27,27},{23,30},{10,18},{4,15},{3,9}},true);
    } else if(name=="lookcontainer") {
        p.setBrush(gold);path({{4,16},{28,16},{28,29},{4,29}},true);
        p.setBrush(blue);path({{4,12},{7,4},{27,4},{28,12}},true);p.drawLine(16,17,16,22);
    } else if(name=="open" || name=="close") {
        p.setBrush(dark);p.drawRect(QRectF(5,3,19,26));p.setBrush(blue);
        if(name=="open") {path({{6,4},{18,8},{18,29},{6,28}},true);arrow({21,16},{30,16});}
        else {p.drawRect(QRectF(7,5,15,22));p.setBrush(gold);p.drawEllipse(QPointF(18,16),1.5,1.5);arrow({30,16},{24,16});}
    } else if(name=="up" || name=="down") {
        p.setBrush(blue);path({{3,28},{3,22},{10,22},{10,16},{17,16},{17,10},{25,10},{25,28}},true);
        arrow(name=="up"?QPointF(6,15):QPointF(25,3),name=="up"?QPointF(25,3):QPointF(6,15));
    } else if(name=="contextaction") {
        p.setBrush(blue);p.drawRoundedRect(QRectF(2,9,28,17),3,3);p.setPen(QPen(gold,2));path({{8,16},{8,21},{24,21},{24,16}});
    } else {
        // Commands without their own artwork (toolbar entries added from menus):
        // a blue plate with the command's initial.
        p.setBrush(blue);p.drawRoundedRect(QRectF(4,4,24,24),5,5);
        QFont font("Segoe UI");font.setPixelSize(15);font.setBold(true);p.setFont(font);p.setPen(gold);
        p.drawText(QRectF(4,4,24,24),Qt::AlignCenter,QString(QChar(name.isEmpty()?'?':QChar::fromLatin1(name.at(0)).toUpper())));
    }
    return QIcon(image);
}

void darkdungeon_view_defaults() {
    QSettings settings;
    if(settings.value("darkdungeonViewVersion",0).toInt()>=1)return;
    if(settings.value("tilewidth",16).toInt()==16 && settings.value("tileheight",16).toInt()==16) {
        settings.setValue("tilewidth",48);settings.setValue("tileheight",48);
    }
    if(settings.value("dollwidth",32).toInt()==32 && settings.value("dollheight",32).toInt()==32) {
        settings.setValue("dollwidth",24);settings.setValue("dollheight",24);
    }
    settings.setValue("darkdungeonViewVersion",1);
}

void darkdungeon_language_init() {
#ifdef DARKDUNGEON_JAPANESE
    auto* translator=new QTranslator(qApp);
    if(translator->load(QCoreApplication::applicationDirPath()+"/translations/qtbase_ja.qm"))qApp->installTranslator(translator);
    else darkdungeon_trace("Qt Japanese translations missing");
#endif
}

void darkdungeon_finish_smoke() {
    if(deferredSmoke) {
        auto checks=std::move(deferredSmoke);deferredSmoke={};
        // QApplication::exec clears the previous input loop's quit flag.
        // QDialog and QEventLoop otherwise return immediately after exit().
        QTimer::singleShot(0,qApp,std::move(checks));
        qApp->exec();
    }
}

void darkdungeon_layout_toolbars(QMainWindow* main) {
    auto* actions=main->findChild<QToolBar*>("adventureToolbar");
    auto* tools=main->findChild<QToolBar*>("adventureToolsToolbar");
    if(!actions || !tools)return;
    // sizeHint includes every action, its label, spacing and toolbar margins.
    const int required=actions->sizeHint().width()+tools->sizeHint().width();
    const bool twoRows=required>main->contentsRect().width();
    const QVariant previous=main->property("adventureTwoToolbarRows");
    if(previous.isValid() && previous.toBool()==twoRows)return;
    main->setProperty("adventureTwoToolbarRows",twoRows);
    main->removeToolBarBreak(actions);main->removeToolBarBreak(tools);
    main->removeToolBar(actions);main->removeToolBar(tools);
    // Bottom-area rows run from the outer edge toward the central widget.
    // Keep basic actions nearest messages; on one row they remain on the left.
    if(twoRows) {
        main->addToolBar(Qt::BottomToolBarArea,tools);
        main->addToolBarBreak(Qt::BottomToolBarArea);
        main->addToolBar(Qt::BottomToolBarArea,actions);
    } else {
        main->addToolBar(Qt::BottomToolBarArea,actions);
        main->addToolBar(Qt::BottomToolBarArea,tools);
    }
    // removeToolBar hides the widgets; adding them back does not show them.
    actions->show();tools->show();
    // Rebalance the central splitters after Qt applies the new toolbar layout.
    QMetaObject::invokeMethod(main,"layout",Qt::QueuedConnection);
}

void darkdungeon_start_hooks() {
    // Characters are drawn over the remembered terrain on every platform.
    iflags.use_background_glyph=TRUE;
    // Character selection: outline the chosen role and race in red. The list class
    // has no Q_OBJECT, so the rule is scoped through the selector dialog.
    qApp->setStyleSheet(qApp->styleSheet()+
        "nethack_qt_--NetHackQtPlayerSelector QTableWidget::item:selected{border:2px solid #e0453a;border-radius:3px;"
        "background:#2a1d1d;color:#ffffff;}");
    auto* main=qobject_cast<QMainWindow*>(nethack_qt_::NetHackQtBind::mainWidget());
    if(main) {
        for(auto* toolbar:main->findChildren<QToolBar*>()) {
            if(toolbar->objectName().isEmpty())toolbar->setObjectName("adventureToolbar");
            QFont toolbarFont=toolbar->font();toolbarFont.setPointSize(11);toolbar->setFont(toolbarFont);
            toolbar->setIconSize(QSize(24,24));toolbar->setToolButtonStyle(Qt::ToolButtonTextUnderIcon);
            for(auto* button:toolbar->findChildren<QToolButton*>())if(button->property("commandName")=="contextaction")
                button->setToolTip(languageText("Basic action (Space): container, pickup, stairs, door, or wait","基本動作（Space）：容器・拾う・階段・扉・待機"));
        }
        if(auto* toolbar=main->findChild<QToolBar*>("adventureToolsToolbar")) {
            toolbar->addSeparator();
            for(int direction:{-1,1}) {
                auto* zoom=new QToolButton(toolbar);zoom->setObjectName(direction<0?"zoomOut":"zoomIn");
                zoom->setText(direction<0?languageText("Zoom out","縮小"):languageText("Zoom in","拡大"));
                zoom->setToolTip(direction<0?languageText("Make dungeon tiles smaller","迷宮のタイルを小さくする"):languageText("Make dungeon tiles larger","迷宮のタイルを大きくする"));
                zoom->setIcon(darkdungeon_toolbar_icon(direction<0?"zoomOut":"zoomIn"));
                zoom->setIconSize(QSize(24,24));zoom->setToolButtonStyle(Qt::ToolButtonTextUnderIcon);
                zoom->setMinimumSize(72,52);zoom->setFocusPolicy(Qt::NoFocus);toolbar->addWidget(zoom);
                zoom->setEnabled(!nethack_qt_::qt_settings->glyphs().no_tiles);
                QObject::connect(nethack_qt_::qt_settings,&nethack_qt_::NetHackQtSettings::tilesChanged,zoom,[zoom] {
                    zoom->setEnabled(!nethack_qt_::qt_settings->glyphs().no_tiles);
                });
                QObject::connect(zoom,&QToolButton::clicked,main,[main,direction] {
                    auto* settings=nethack_qt_::qt_settings;
                    if(settings->glyphs().no_tiles)return;
                    const int width=settings->tileWidth,height=settings->tileHeight;
                    const double factor=direction>0?std::min(4.0/3,std::min(128.0/width,128.0/height)):
                        std::max(.75,std::max(6.0/width,6.0/height));
                    settings->setMapTileSize(int(std::lround(width*factor)),int(std::lround(height*factor)));
                    if(u.ux && u.uy)if(auto* map=main->findChild<nethack_qt_::NetHackQtMapWindow2*>())map->centerOnCursor();
                });
            }
        }
        darkdungeon_layout_toolbars(main);
        for(auto* entry:main->menuBar()->actions())if(entry->menu() && entry->text()==languageText("Help","ヘルプ")) {
            darkdungeon_trace("Installing play guide action");
            auto* guide=entry->menu()->addAction(languageText("Play guide","遊び方"));
            guide->setObjectName("playGuide");
            QObject::connect(guide,&QAction::triggered,main,[main] {
                darkdungeon_trace("Opening play guide");
                QFile text(QCoreApplication::applicationDirPath()+"/play-guide.md");
                if(!text.open(QIODevice::ReadOnly)){darkdungeon_trace("Play guide file missing");return;}
                auto* dialog=new PlayGuideDialog(main);dialog->setAttribute(Qt::WA_DeleteOnClose);
                dialog->setObjectName("playGuideDialog");dialog->setWindowTitle(languageText("Play guide","遊び方"));dialog->resize(760,720);
                auto* layout=new QVBoxLayout(dialog);auto* browser=new QTextBrowser(dialog);
                browser->setMarkdown(QString::fromUtf8(text.readAll()));layout->addWidget(browser);
                auto* close=new QDialogButtonBox(QDialogButtonBox::Close,dialog);layout->addWidget(close);
                QObject::connect(close,&QDialogButtonBox::rejected,dialog,&QDialog::reject);
                dialog->setWindowModality(Qt::ApplicationModal);dialog->show();
            });
            break;
        }
        auto* languages=main->menuBar()->addMenu(languageText("Language","言語"));
        for(const QString& code:{QString("en"),QString("ja")}) {
            auto* choice=languages->addAction(code=="ja"?QString::fromUtf8("日本語"):QString("English"));
            QObject::connect(choice,&QAction::triggered,main,[main,code] {
                QSettings().setValue("language",code);
                QMessageBox::information(main,languageText("Language","言語"),languageText("Language saved for the next launch. Save and exit to restart. Adventures are stored separately for each language.","次回起動する言語を保存しました。冒険を保存して終了し、再起動してください。セーブは言語別に保存します。"));
            });
        }
        installToolbarCustomization(main);
        installComparisonMenu(main);
    }
    // Disabled during normal play. Dedicated smoke launches use separate data files.
    QString output=qEnvironmentVariable("DARKDUNGEON_SMOKE_OUTPUT");
    if (output.isEmpty()) return;
    std::atexit(clearlocks);
    auto* timer=new QTimer(qApp);
    QObject::connect(timer,&QTimer::timeout,qApp,[output,timer] {
        static int ticks=0;
        static int movementAttempts=0,oldX=0,oldY=0,targetX=0,targetY=0,key=0;
        static bool spaceSent=false;
        static long spaceTurn=0;
        ++ticks;
        char trace[160];std::snprintf(trace,sizeof(trace),"smoke tick=%d hero=%d,%d move=%d",ticks,u.ux,u.uy,movementAttempts);darkdungeon_trace(trace);
        if(spaceSent && ticks<12) {
            auto* window=nethack_qt_::NetHackQtBind::mainWidget();
            darkdungeon_trace(QString("Space waiting: turn=%1 start=%2 visible=%3 binding=%4")
                .arg(svm.moves).arg(spaceTurn).arg(window && window->isVisible()).arg(QString::fromUtf8(key2extcmddesc(' '))).toUtf8().constData());
            if(ticks==6 && window)window->grab().save(output+"/space-input.png");
        }
        if (ticks>120) {
            for(QWidget* widget:QApplication::topLevelWidgets())
                if(widget->isVisible()) widget->grab().save(output+"/timeout-"+widget->metaObject()->className()+".png");
            std::exit(4);
        }
        if (!u.ux || !u.uy) {
            for (QWidget* w:QApplication::topLevelWidgets())
                if (w->isVisible()) for (QPushButton* b:w->findChildren<QPushButton*>())
                    if (b->objectName()=="startGame" || (qEnvironmentVariable("DARKDUNGEON_SMOKE_PHASE")=="restore" &&
                        (b->text()==smokePlayerName() || b->text().startsWith(smokePlayerName()+"-")))) {
                        if(b->objectName()=="startGame")if(auto* name=w->findChild<QLineEdit*>())name->setText(smokePlayerName());
                        w->grab().save(output+"/character-selector.png");b->click(); return;
                    }
            return;
        }
        QWidget* main=nethack_qt_::NetHackQtBind::mainWidget();
        if (!main || !main->isVisible()) return;
        if(movementAttempts==0)if(auto* modal=qobject_cast<QDialog*>(QApplication::activeModalWidget())) {
            darkdungeon_trace((QString("Closing startup dialog: ")+modal->metaObject()->className()).toUtf8().constData());
            modal->reject();return;
        }
        if(movementAttempts==0) {
            if(QString::fromUtf8(svp.plname)!=smokePlayerName()) {darkdungeon_trace("Wrong smoke player name");std::exit(9);}
            if(qEnvironmentVariable("DARKDUNGEON_SMOKE_PHASE")=="restore") {
                QFile saved(output+"/saved-state.json");if(!saved.open(QIODevice::ReadOnly))std::exit(20);
                const auto state=QJsonDocument::fromJson(saved.readAll()).object();
                const QByteArray marker=languageText("Test sword","試験の剣").toUtf8();
                if(u.ux!=state["x"].toInt() || u.uy!=state["y"].toInt() || u.uhp!=state["hp"].toInt()
                   || !uwep || QString::fromUtf8(safe_oname(uwep))!=QString::fromUtf8(marker))std::exit(21);
                bool historyRestored=false;
                for(auto* list:main->findChildren<QListWidget*>())for(int i=0;i<list->count();++i)
                    if(list->item(i)->text().contains(languageText("Language history test","日本語の履歴保存テスト")))historyRestored=true;
                if(!historyRestored)std::exit(22);
                darkdungeon_trace("Saved position, HP, named weapon and UTF-8 message history restored");
            }
            oldX=u.ux;oldY=u.uy;
            const int dx[4]={0,1,0,-1},dy[4]={-1,0,1,0},keys[4]={Qt::Key_Up,Qt::Key_Right,Qt::Key_Down,Qt::Key_Left};
            for(int d=0;d<4;++d) {
                int x=oldX+dx[d],y=oldY+dy[d];
                if(isok(x,y) && (IS_ROOM(levl[x][y].typ) || levl[x][y].typ==CORR) && !m_at(x,y) && !t_at(x,y)) {
                    targetX=x;targetY=y;key=keys[d];break;
                }
            }
            if(!key)std::exit(10);
        }
        if(u.ux==oldX && u.uy==oldY) {
            if(++movementAttempts>12)std::exit(11);
            darkdungeon_trace("Posting NetHack movement key");
            for(auto* area:main->findChildren<QScrollArea*>())
                if(QString(area->metaObject()->className()).contains("MapWindow"))area->setFocus();
            auto* target=QApplication::focusWidget();
            if(!qobject_cast<nethack_qt_::NetHackQtMapWindow2*>(target))std::exit(38);
            darkdungeon_trace((QString("Movement focus: ")+target->metaObject()->className()).toUtf8().constData());
            if(movementAttempts==1)target->window()->grab().save(output+"/movement-focus.png");
            QCoreApplication::postEvent(target,new QKeyEvent(QEvent::KeyPress,key,Qt::NoModifier));
            QCoreApplication::postEvent(target,new QKeyEvent(QEvent::KeyRelease,key,Qt::NoModifier));
            return;
        }
        if(u.ux!=targetX || u.uy!=targetY)std::exit(12);
        if(!spaceSent) {
            int dx,dy;
            if(darkdungeon_action_type(&dx,&dy)!=DD_ACTION_WAIT)std::exit(50);
            auto* target=QApplication::focusWidget();
            if(!qobject_cast<nethack_qt_::NetHackQtMapWindow2*>(target))std::exit(38);
            spaceTurn=svm.moves;spaceSent=true;
            QCoreApplication::postEvent(target,new QKeyEvent(QEvent::KeyPress,Qt::Key_Space,Qt::NoModifier," ",true));
            QCoreApplication::postEvent(target,new QKeyEvent(QEvent::KeyPress,Qt::Key_Space,Qt::NoModifier," "));
            QCoreApplication::postEvent(target,new QKeyEvent(QEvent::KeyRelease,Qt::Key_Space,Qt::NoModifier," "));
            return;
        }
        if(svm.moves==spaceTurn)return;
        if(svm.moves!=spaceTurn+1)std::exit(51);
        darkdungeon_trace("Space from map focus advanced exactly one turn; auto-repeat ignored");
        timer->stop();
        // Run dialogs after Qt's command-input event loop has returned.
        // NetHack exits that loop to deliver keys; nesting tests in its timer
        // callback can make QDialog::exec return before the dialog is shown.
        deferredSmoke=[output,timer,main] {
        darkdungeon_trace("NetHack movement verified; deferred UI verification");
        QDir().mkpath(output);
        // A visual review sheet for corners, junctions and light/dark floors.
        QImage terrain(768,432,QImage::Format_RGB32);terrain.fill(QColor("#171918"));
        {
            QPainter sheet(&terrain);sheet.setFont(QFont("Segoe UI",9));sheet.setPen(QColor("#d2cebd"));
            const int symbols[]={S_vwall,S_hwall,S_tlcorn,S_trcorn,S_blcorn,S_brcorn,
                S_crwall,S_tuwall,S_tdwall,S_tlwall,S_trwall,S_stone,
                S_room,S_darkroom,S_corr,S_litcorr,S_ndoor};
            const char* labels[]={"Vertical wall","Horizontal wall","Top left","Top right","Bottom left","Bottom right",
                "Cross junction","Up junction","Down junction","Left junction","Right junction","Solid rock",
                "Room floor","Dark room","Dark corridor","Lit corridor","Doorway"};
            for(int i=0;i<17;++i) {
                int x=(i%6)*128,y=(i/6)*144;
                sheet.drawImage(QRect(x+16,y+8,96,96),dungeonTile(symbols[i],i,0));
                sheet.drawText(QRect(x,y+112,128,24),Qt::AlignCenter,QString::fromLatin1(labels[i]));
            }
        }
        terrain.save(output+"/stone-tiles.png");
        {
            // Joined walls show perimeter bands more clearly than single tiles.
            QImage room(432,336,QImage::Format_RGB32);room.fill(Qt::black);
            QPainter sheet(&room);
            for(int y=0;y<7;++y)for(int x=0;x<9;++x) {
                int symbol=S_room;
                if(!x || x==8)symbol=S_vwall;
                if(!y || y==6)symbol=S_hwall;
                if(!x && !y)symbol=S_tlcorn;
                if(x==8 && !y)symbol=S_trcorn;
                if(!x && y==6)symbol=S_blcorn;
                if(x==8 && y==6)symbol=S_brcorn;
                const int glyph=cmap_to_glyph(symbol);
                darkdungeon_draw_map_cell(sheet,glyph,::glyphmap[glyph].tileidx,0,
                    GLYPH_UNEXPLORED,QRect(x*48,y*48,48,48));
            }
            sheet.end();room.save(output+"/wall-room.png");
        }
        {
        // Layer checks use stationary core glyphs; no legacy motion is started.
        auto renderLayer=[&](int glyph,unsigned flags,int background) {
            QImage image(48,48,QImage::Format_RGB32);image.fill(Qt::magenta);
            QPainter p(&image);
            darkdungeon_draw_map_cell(p,glyph,::glyphmap[glyph].tileidx,flags,background,QRect(0,0,48,48));
            return image;
        };
        const int roomGlyph=cmap_to_glyph(S_room),stairGlyph=cmap_to_glyph(S_upstair);
        const int heroGlyph=monnum_to_glyph(PM_KNIGHT,0);
        const QImage floorLayer=renderLayer(roomGlyph,0,GLYPH_UNEXPLORED);
        // Exercise the main-map dispatch, not just the texture generator:
        // corridor rock used to fall through to the original blue atlas tile.
        const int stoneGlyph=cmap_to_glyph(S_stone);
        const QImage stoneLayer=renderLayer(stoneGlyph,0,GLYPH_UNEXPLORED);
        const QImage unexploredLayer=renderLayer(GLYPH_UNEXPLORED,0,GLYPH_UNEXPLORED);
        if(stoneLayer!=dungeonTile(S_stone,0,0) || stoneLayer==floorLayer)std::exit(87);
        for(int y=0;y<48;++y)for(int x=0;x<48;++x) {
            const QRgb pixel=stoneLayer.pixel(x,y);
            if(qRed(pixel)!=qGreen(pixel) || qGreen(pixel)!=qBlue(pixel)
                    || unexploredLayer.pixel(x,y)!=qRgb(0,0,0))std::exit(88);
        }
        QImage rockComparison(384,144,QImage::Format_RGB32);rockComparison.fill(QColor("#171918"));
        {
            QPainter sheet(&rockComparison);sheet.setFont(QFont("Segoe UI",9));sheet.setPen(Qt::white);
            const QImage original=nethack_qt_::qt_settings->glyphs().glyph(stoneGlyph,::glyphmap[stoneGlyph].tileidx).toImage();
            const QImage images[]={original,stoneLayer,unexploredLayer};
            const char* labels[]={"Before: atlas rock","After: stonework","Unexplored"};
            for(int i=0;i<3;++i) {
                sheet.drawImage(QRect(i*128+16,8,96,96),images[i]);
                sheet.drawText(QRect(i*128,112,128,24),Qt::AlignCenter,QString::fromLatin1(labels[i]));
            }
        }
        rockComparison.save(output+"/solid-rock-comparison.png");
        QImage layers(768,288,QImage::Format_RGB32);layers.fill(QColor("#171918"));
        QPainter layerSheet(&layers);layerSheet.setFont(QFont("Segoe UI",9));layerSheet.setPen(Qt::white);
        int layerIndex=0;
        auto addLayer=[&](const QImage& image,const char* label) {
            int x=(layerIndex%6)*128,y=(layerIndex/6)*144;++layerIndex;
            layerSheet.drawImage(QRect(x+16,y+8,96,96),image);
            layerSheet.drawText(QRect(x,y+112,128,24),Qt::AlignCenter,QString::fromLatin1(label));
        };
        addLayer(floorLayer,"Floor");
        int transparentPixels=0,blackPixels=0;
        for(int glyph:{objnum_to_glyph(DAGGER),objnum_to_glyph(CHEST),monnum_to_glyph(PM_LITTLE_DOG,0),
                       GLYPH_BODY_OFF+PM_LITTLE_DOG,GLYPH_STATUE_MALE_OFF+PM_LITTLE_DOG}) {
            const QImage original=nethack_qt_::qt_settings->glyphs().glyph(glyph,::glyphmap[glyph].tileidx).toImage();
            const QImage combined=renderLayer(glyph,0,roomGlyph);
            const QImage unknown=renderLayer(glyph,0,GLYPH_UNEXPLORED);
            for(int y=0;y<original.height();++y)for(int x=0;x<original.width();++x) {
                const QPoint sample((2*x+1)*48/(2*original.width()),(2*y+1)*48/(2*original.height()));
                const QRgb color=original.pixel(x,y)|0xff000000;
                if(color==qRgb(71,108,108)) {
                    ++transparentPixels;
                    if(combined.pixel(sample)!=floorLayer.pixel(sample) || unknown.pixel(sample)!=qRgb(0,0,0))std::exit(75);
                } else {
                    if(color==qRgb(0,0,0))++blackPixels;
                    if(combined.pixel(sample)!=color)std::exit(76);
                }
            }
            addLayer(combined,glyph_is_monster(glyph)?"Monster":glyph_is_body(glyph)?"Corpse":glyph_is_statue(glyph)?"Statue":"Item");
        }
        if(!transparentPixels || !blackPixels)std::exit(77);
        const QImage stairs=renderLayer(stairGlyph,0,GLYPH_UNEXPLORED);
        const QImage heroStairs=renderLayer(heroGlyph,MG_HERO,stairGlyph);
        const QImage heroFloor=renderLayer(heroGlyph,MG_HERO,roomGlyph);
        int uncoveredStairs=0;
        const QImage heroTile=nethack_qt_::qt_settings->glyphs().glyph(heroGlyph,::glyphmap[heroGlyph].tileidx).toImage();
        auto heroTransparent=[&](int x,int y) {
            return (heroTile.pixel(x*heroTile.width()/48,y*heroTile.height()/48)|0xff000000)==qRgb(71,108,108);
        };
        for(int y=0;y<48;++y)for(int x=0;x<48;++x)
            if(heroTransparent(x,y)) {
            if(heroStairs.pixel(x,y)!=stairs.pixel(x,y) || heroFloor.pixel(x,y)!=floorLayer.pixel(x,y))std::exit(78);
            if(stairs.pixel(x,y)!=floorLayer.pixel(x,y))++uncoveredStairs;
        }
        if(!uncoveredStairs || heroStairs==stairs)std::exit(79);
        addLayer(stairs,"Stairs");addLayer(heroStairs,"Hero on stairs");addLayer(heroFloor,"Hero on floor");
        addLayer(renderLayer(heroGlyph,MG_HERO,GLYPH_UNEXPLORED),"Unknown terrain");
        layerSheet.end();layers.save(output+"/map-layers.png");
        // A detected actor in unseen space must not reveal actual stairs/lava.
        int unseenX=0,unseenY=0;
        for(int y=0;y<ROWNO && !unseenX;++y)for(int x=1;x<COLNO;++x)if(!cansee(x,y)) {unseenX=x;unseenY=y;break;}
        if(!unseenX)std::exit(80);
        const auto unseenCell=levl[unseenX][unseenY];
        levl[unseenX][unseenY].typ=STAIRS;levl[unseenX][unseenY].seenv=0;levl[unseenX][unseenY].glyph=GLYPH_UNEXPLORED;
        if(darkdungeon_background_glyph(heroGlyph,unseenX,unseenY)!=NO_GLYPH)std::exit(81);
        levl[unseenX][unseenY].typ=LAVAPOOL;levl[unseenX][unseenY].seenv=SVALL;levl[unseenX][unseenY].glyph=roomGlyph;
        if(darkdungeon_background_glyph(heroGlyph,unseenX,unseenY)!=roomGlyph)std::exit(82);
        const auto swallowed=u.uswallow;u.uswallow=1;
        if(darkdungeon_background_glyph(heroGlyph,u.ux,u.uy)!=GLYPH_UNEXPLORED)std::exit(83);
        u.uswallow=swallowed;levl[unseenX][unseenY]=unseenCell;
        if(!iflags.use_background_glyph)std::exit(84);
        auto* compositeMap=main->findChild<QScrollArea*>();
        if(!compositeMap)std::exit(85);
        const auto heroCell=levl[u.ux][u.uy];
        levl[u.ux][u.uy].typ=FOUNTAIN;newsym(u.ux,u.uy);flush_screen(0);QCoreApplication::processEvents();
        const int sameActor=gg.gbuf[u.uy][u.ux].glyphinfo.glyph;
        const QRect heroRect(u.ux*48,u.uy*48,48,48);
        const QImage onFountain=compositeMap->widget()->grab(heroRect).toImage();
        levl[u.ux][u.uy].typ=ROOM;newsym(u.ux,u.uy);flush_screen(0);QCoreApplication::processEvents();
        const QImage afterDrying=compositeMap->widget()->grab(heroRect).toImage();
        if(sameActor!=gg.gbuf[u.uy][u.ux].glyphinfo.glyph || onFountain==afterDrying)std::exit(86);
        onFountain.save(output+"/hero-fountain-before.png");afterDrying.save(output+"/hero-fountain-after.png");
        levl[u.ux][u.uy]=heroCell;newsym(u.ux,u.uy);flush_screen(0);QCoreApplication::processEvents();
        }
        {
        // Legacy asset loading only. Retired walk/attack tests must not report pass.
        // Every role, race and gender combination has a complete hero, and every class a sheet.
        for(const char* race:{"human","elf","dwarf","gnome","orc"})for(const char* gender:{"male","female"})
            if(spriteSheet(QString("hero/body_%1_%2").arg(race,gender)).isNull())std::exit(90);
        for(const char* role:{"archeologist","barbarian","caveman","healer","knight","monk","priest","ranger","rogue",
                              "samurai","tourist","valkyrie","wizard"})
            if(spriteSheet(QString("hero/outfit_%1").arg(role)).isNull() || spriteSheet(QString("hero/weapon_%1").arg(role)).isNull())std::exit(90);
        for(const char* name:{"hero/hair_male","hero/hair_female","hero/cape","hero/shield_valkyrie","monster/dog",
                               "monster/jackal","monster/newt","monster/gnome"})
            if(spriteSheet(QString::fromLatin1(name)).isNull())std::exit(90);
        if(heroSheet().isNull())std::exit(90);
        for(int monster=0;monster<NUMMONS;++monster)
            if(mons[monster].mlet!=S_invisible && mons[monster].mlet!=S_WORM_TAIL && mons[monster].mlet!=S_MIMIC_DEF
                    && monsterSheet(monster).isNull()){darkdungeon_trace(mons[monster].pmnames[NEUTRAL]);std::exit(90);}
        }
        const QString objectName=QString::fromUtf8(OBJ_NAME(objects[LONG_SWORD]));
        if(objectName!=languageText("long sword","長剣"))std::exit(23);
        if(!uwep || QString::fromUtf8(doname(uwep)).contains(QChar(0xfffd)))std::exit(37);
        QFile identifiers(qEnvironmentVariable("DARKDUNGEON_SMOKE_LEVEL_IDS"));
        if(!identifiers.open(QIODevice::ReadOnly))std::exit(32);
        const auto levelIds=QJsonDocument::fromJson(identifiers.readAll()).array();
        bool validIds=true;
        for(const auto& value:levelIds) {
            const auto entry=value.toObject();QByteArray id=entry["id"].toString().toUtf8();bool found=false;
            if(entry["kind"]=="monster")found=name_to_mon(id.constData(),nullptr)!=NON_PM;
            else {
                for(const char* prefix:{"ring of ","potion of ","scroll of ","spellbook of ","wand of "})if(id.startsWith(prefix)){id.remove(0,int(std::strlen(prefix)));break;}
                for(int i=0;i<NUM_OBJECTS;++i) {
                    const char* name=OBJ_NAME(objects[i]);const char* description=OBJ_DESCR(objects[i]);
                    if((name && !strcmpi(name,id.constData())) || (description && !strcmpi(description,id.constData()))){found=true;break;}
                }
            }
            if(!found){validIds=false;darkdungeon_trace((entry["file"].toString()+": unknown "+entry["kind"].toString()+" id: "+QString::fromUtf8(id)).toUtf8().constData());}
        }
        if(!validIds)std::exit(33);
        dlb* help=dlb_fopen(HELP,"r");if(!help)std::exit(24);
        char helpLine[BUFSZ];QByteArray helpText;
        while(dlb_fgets(helpLine,sizeof helpLine,help))helpText.append(helpLine);
        dlb_fclose(help);
#ifdef DARKDUNGEON_JAPANESE
        if(!QString::fromUtf8(helpText).contains(QString::fromUtf8("迷宮")))std::exit(25);
        char encodedName[BUFSZ],japaneseName[]="勇者";
        fname_encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-.",'%',japaneseName,encodedName,sizeof encodedName);
        if(QByteArray(encodedName)!="%E5%8B%87%E8%80%85")std::exit(36);
        char bounded[8];nethack_qt_::str_copy(bounded,"あいうえお",sizeof bounded);
        if(QString::fromUtf8(bounded)!=QString::fromUtf8("あい"))std::exit(26);
        QTimer::singleShot(100,qApp,[] {
            for(auto* widget:QApplication::topLevelWidgets())if(auto* dialog=qobject_cast<QDialog*>(widget))if(dialog->isVisible()) {
                if(auto* edit=dialog->findChild<QLineEdit*>()){edit->setText(QString::fromUtf8("日本語入力"));dialog->accept();return;}
            }
        });
        char entered[BUFSZ];nethack_qt_::NetHackQtBind::qt_getlin("日本語の入力テスト:",entered);
        if(QString::fromUtf8(entered)!=QString::fromUtf8("日本語入力"))std::exit(27);
        bool echoFound=false;
        for(auto* list:main->findChildren<QListWidget*>())for(int i=0;i<list->count();++i)
            if(list->item(i)->text()==QString::fromUtf8("日本語の入力テスト: 日本語入力"))echoFound=true;
        if(!echoFound)std::exit(28);
#endif
        auto closePopup=[output](const QString& name) {
            QTimer::singleShot(150,qApp,[output,name] {
                for(auto* widget:QApplication::topLevelWidgets())if(auto* dialog=qobject_cast<QDialog*>(widget))if(dialog->isVisible()) {
                    dialog->grab().save(output+"/"+name+".png");dialog->reject();
                }
            });
        };
        QTimer::singleShot(100,qApp,[] {
            darkdungeon_trace("Text Space input timer fired");
            for(auto* widget:QApplication::topLevelWidgets())
                if(auto* dialog=qobject_cast<QDialog*>(widget))if(dialog->isVisible())if(auto* edit=dialog->findChild<QLineEdit*>()) {
                    darkdungeon_trace("Sending Space to text input");
                    edit->setText("alpha");edit->setCursorPosition(5);
                    QKeyEvent space(QEvent::KeyPress,Qt::Key_Space,Qt::NoModifier," ");
                    QCoreApplication::sendEvent(edit,&space);edit->insert("beta");dialog->accept();return;
                }
        });
        darkdungeon_trace("Opening text input Space test");
        char spacedInput[BUFSZ];nethack_qt_::NetHackQtBind::qt_getlin("Space input test:",spacedInput);
        if(QByteArray(spacedInput)!="alpha beta" || nethack_qt_::NetHackQtBind::qt_kbhit())std::exit(52);
        darkdungeon_trace("Text input Space verified; testing context commands");
        // Controlled objects on an empty floor; restore every fixture before saving.
        const int actionX=u.ux,actionY=u.uy;
        const auto oldContext=svc.context;
        if(container_at(actionX,actionY,TRUE) || darkdungeon_look_here()!=ECMD_OK || nethack_qt_::NetHackQtBind::qt_kbhit())std::exit(68);
        const auto oldAutounlock=flags.autounlock;
        flags.autounlock=0;
        const auto originalTile=levl[actionX][actionY];
        stairway stairs{};stairs.sx=actionX;stairs.sy=actionY;stairs.next=gs.stairs;gs.stairs=&stairs;
        auto* coin=mksobj_at(GOLD_PIECE,actionX,actionY,FALSE,FALSE);
        coin->quan=10;coin->owt=weight(coin);
        auto* box=mksobj_at(CHEST,actionX,actionY,FALSE,FALSE);
        box->olocked=box->otrapped=0;
        add_to_container(box,mksobj(DAGGER,FALSE,FALSE));box->owt=weight(box);
        int dx,dy;
        if(darkdungeon_action_type(&dx,&dy)!=DD_ACTION_LOOK)std::exit(53);
        box->olocked=1;rhack(' ');
        if(box->cknown || !box->olocked || money_cnt(gi.invent)!=0)std::exit(54);
        box->olocked=0;
        closePopup("space-container");rhack(' ');
        if(!box->cknown || !box->cobj || !svl.level.objects[actionX][actionY]
            || !QFileInfo::exists(output+"/space-container.png"))std::exit(55);
        auto* second=mksobj_at(CHEST,actionX,actionY,FALSE,FALSE);
        second->olocked=second->otrapped=0;
        closePopup("space-container-choice");rhack(' ');
        if(second->cknown || !QFileInfo::exists(output+"/space-container-choice.png"))std::exit(56);
        bool emptyChoice=false;
        QTimer::singleShot(150,qApp,[output,&emptyChoice] {
            for(auto* widget:QApplication::topLevelWidgets())if(auto* dialog=qobject_cast<QDialog*>(widget))if(dialog->isVisible()) {
                QPushButton *none=nullptr,*ok=nullptr;
                for(auto* button:dialog->findChildren<QPushButton*>()) {
                    if(button->text()==languageText("None","選択解除"))none=button;
                    if(button->text()==languageText("Ok","決定"))ok=button;
                }
                if(none && ok) {none->click();emptyChoice=dialog->grab().save(output+"/container-empty-choice.png");ok->click();return;}
            }
        });
        rhack(' ');
        if(!emptyChoice || second->cknown || svc.context.move)std::exit(71);
        obj_extract_self(second);obfree(second,nullptr);
        obj_extract_self(box);obfree(box,nullptr);
        if(darkdungeon_action_type(&dx,&dy)!=DD_ACTION_PICKUP)std::exit(57);
        rhack(' ');
        if(svl.level.objects[actionX][actionY] || money_cnt(gi.invent)!=10)std::exit(58);
        for(auto* object=gi.invent;object;object=object->nobj)if(object->otyp==GOLD_PIECE) {
            obj_extract_self(object);obfree(object,nullptr);break;
        }
        stairs.up=TRUE;
        if(darkdungeon_action_type(&dx,&dy)!=DD_ACTION_UP)std::exit(59);
        stairs.up=FALSE;
        if(darkdungeon_action_type(&dx,&dy)!=DD_ACTION_DOWN)std::exit(60);
        gs.stairs=stairs.next;
        const auto firstDoor=levl[actionX+1][actionY];
        const auto secondDoor=levl[actionX-1][actionY];
        const auto firstSeen=svl.lastseentyp[actionX+1][actionY];
        const auto secondSeen=svl.lastseentyp[actionX-1][actionY];
        levl[actionX+1][actionY].typ=DOOR;levl[actionX+1][actionY].doormask=D_CLOSED;
        levl[actionX+1][actionY].glyph=GLYPH_UNEXPLORED;
        if(darkdungeon_action_type(&dx,&dy)!=DD_ACTION_WAIT)std::exit(67);
        levl[actionX+1][actionY].glyph=cmap_to_glyph(S_vcdoor);
        if(darkdungeon_action_type(&dx,&dy)!=DD_ACTION_OPEN || dx!=1 || dy!=0)std::exit(61);
        auto* oldForm=gy.youmonst.data;gy.youmonst.data=&mons[PM_JACKAL];
        rhack(' ');gy.youmonst.data=oldForm;
        if(cmdq_peek(CQ_CANNED) || levl[actionX+1][actionY].doormask!=D_CLOSED)std::exit(68);
        // Opening depends on strength; retry the existing command rather than bypassing it.
        for(int attempt=0;attempt<20 && levl[actionX+1][actionY].doormask==D_CLOSED;++attempt)rhack(' ');
        if(levl[actionX+1][actionY].doormask!=D_ISOPEN)std::exit(62);
        levl[actionX+1][actionY].doormask=D_CLOSED;
        levl[actionX+1][actionY].glyph=cmap_to_glyph(S_vcdoor);
        rhack(1); // Ctrl+A: repeat the contextual action.
        if(cmdq_peek(CQ_CANNED) || gi.in_doagain)std::exit(69);
        levl[actionX+1][actionY].doormask=D_CLOSED;
        levl[actionX+1][actionY].glyph=cmap_to_glyph(S_vcdoor);
        levl[actionX-1][actionY].typ=DOOR;levl[actionX-1][actionY].doormask=D_CLOSED;
        levl[actionX-1][actionY].glyph=cmap_to_glyph(S_vcdoor);
        if(darkdungeon_action_type(&dx,&dy)!=DD_ACTION_OPEN || dx || dy)std::exit(63);
        for(int attempt=0;attempt<20 && levl[actionX-1][actionY].doormask==D_CLOSED;++attempt) {
            cmdq_add_ec(CQ_CANNED,darkdungeon_basic_action);
            cmdq_add_dir(CQ_CANNED,-1,0,0);rhack(' ');
        }
        if(levl[actionX+1][actionY].doormask!=D_CLOSED
            || levl[actionX-1][actionY].doormask!=D_ISOPEN)std::exit(64);
        levl[actionX-1][actionY].doormask=D_CLOSED;
        levl[actionX-1][actionY].glyph=cmap_to_glyph(S_vcdoor);
        // getdir can prompt inline; the smoke's QApplication loop cannot nest
        // another QApplication::exec, so use its supported modal prompt here.
        const auto oldPopup=iflags.wc_popup_dialog;iflags.wc_popup_dialog=TRUE;
        closePopup("space-repeat-door-choice");rhack(1);iflags.wc_popup_dialog=oldPopup;
        if(cmdq_peek(CQ_CANNED) || gi.in_doagain
            || !QFileInfo::exists(output+"/space-repeat-door-choice.png"))std::exit(70);
        levl[actionX+1][actionY]=firstDoor;levl[actionX-1][actionY]=secondDoor;
        levl[actionX][actionY]=originalTile;
        if(darkdungeon_action_type(&dx,&dy)!=DD_ACTION_WAIT)std::exit(65);
        rhack(' ');if(!svc.context.move)std::exit(66);
        svc.context=oldContext;flags.autounlock=oldAutounlock;
        cmdq_clear(CQ_CANNED);cmdq_clear(CQ_REPEAT);
        newsym(actionX,actionY);newsym(actionX+1,actionY);newsym(actionX-1,actionY);
        svl.lastseentyp[actionX+1][actionY]=firstSeen;
        svl.lastseentyp[actionX-1][actionY]=secondSeen;
        bool guideFound=false;
        for(auto* entry:qobject_cast<QMainWindow*>(main)->menuBar()->actions())if(entry->menu()) {
            darkdungeon_trace(("Menu: "+entry->text()).toUtf8().constData());
            for(auto* action:entry->menu()->actions())if(action->objectName()=="playGuide") {
                darkdungeon_trace("Triggering play guide action");
                action->trigger();QCoreApplication::processEvents();
                for(auto* widget:QApplication::topLevelWidgets())if(auto* dialog=qobject_cast<QDialog*>(widget))
                    if(dialog->objectName()=="playGuideDialog" && dialog->isVisible()) {
                        QKeyEvent readingKey(QEvent::KeyPress,Qt::Key_H,Qt::NoModifier,"h");
                        auto* browser=dialog->findChild<QTextBrowser*>();
                        if(!browser || nethack_qt_::NetHackQtBind::qt_kbhit())std::exit(35);
                        browser->setFocus();QCoreApplication::sendEvent(browser,&readingKey);
                        if(!readingKey.isAccepted() || nethack_qt_::NetHackQtBind::qt_kbhit())std::exit(35);
                        guideFound=dialog->grab().save(output+"/guide.png");dialog->reject();
                    }
            }
        }
        if(!guideFound || !QFileInfo::exists(output+"/guide.png"))std::exit(34);
        closePopup("inventory");display_inventory(nullptr,FALSE);
        closePopup("help");display_file(HELP,TRUE);
        gs.simple_options_help=TRUE;closePopup("options");doset_simple();
        if(u.ux!=targetX || u.uy!=targetY)std::exit(14);
        auto* toolbar=main->findChild<QToolBar*>("adventureToolbar");
        auto* tools=main->findChild<QToolBar*>("adventureToolsToolbar");
        auto* map=main->findChild<nethack_qt_::NetHackQtMapWindow2*>();
        if(!toolbar || !tools || !map)std::exit(39);
        int labelled=0;
        QSet<QString> commands;
        const int previousInputState=program_state.input_state;
        program_state.input_state=commandInp;
        for(auto* button:main->findChildren<QToolButton*>()) {
            if(button->parent()!=toolbar && button->parent()!=tools)continue;
            if(button->text().isEmpty())continue; // Qt's overflow button has no label.
            if(button->icon().isNull() || button->toolButtonStyle()!=Qt::ToolButtonTextUnderIcon || button->iconSize()!=QSize(24,24))std::exit(40);
            const QImage rendered=button->icon().pixmap(QSize(24,24)).toImage();
            bool painted=false;
            for(int y=0;y<rendered.height() && !painted;++y)for(int x=0;x<rendered.width();++x)
                if(qAlpha(rendered.pixel(x,y))){painted=true;break;}
            if(!painted)std::exit(40);
            if(button->property("commandName").isValid()) {
                const QString name=button->property("commandName").toString();commands.insert(name);
                if(nethack_qt_::NetHackQtBind::qt_kbhit())std::exit(52);
                if(name=="inventory") { // opens the equipment and inventory window instead of sending keys
                    button->click();QCoreApplication::processEvents();
                    QWidget* window=nullptr;
                    for(auto* top:QApplication::topLevelWidgets())if(top->objectName()=="inventoryWindow" && top->isVisible())window=top;
                    if(!window || nethack_qt_::NetHackQtBind::qt_kbhit())std::exit(52);
                    window->close();QCoreApplication::processEvents();++labelled;continue;
                }
                button->click();
                if(!nethack_qt_::NetHackQtBind::qt_kbhit())std::exit(52);
                const int key=nethack_qt_::NetHackQtBind::qt_nhgetch();
                const ext_func_tab* selected=nullptr;
                if(key=='#') {
                    const int index=nethack_qt_::NetHackQtBind::qt_get_ext_cmd();
                    if(index>=0)selected=extcmds_getentry(index);
                } else {
                    for(const auto* binding=gc.Cmd.cmdbinds;binding;binding=binding->next)
                        if(binding->key==uchar(key)){selected=binding->cmd;break;}
                }
                darkdungeon_trace(QString("Toolbar command: expected=%1 key=%2 selected=%3 pending=%4")
                    .arg(name).arg(key).arg(selected?selected->ef_txt:"none").arg(nethack_qt_::NetHackQtBind::qt_kbhit()).toUtf8().constData());
                if(!selected || QString::fromUtf8(selected->ef_txt)!=name || nethack_qt_::NetHackQtBind::qt_kbhit())std::exit(52);
                for(int inputState:{otherInp,getposInp,getdirInp}) {
                    program_state.input_state=inputState;button->click();
                    if(nethack_qt_::NetHackQtBind::qt_kbhit())std::exit(53);
                }
                program_state.input_state=commandInp;
            }
            ++labelled;
        }
        program_state.input_state=previousInputState;
        // Toolbar clicks exit Qt's input loop. Exercise repetition after all
        // modal smoke fixtures so that the quit flag cannot cancel their dialogs.
        const auto toolbarContext=svc.context;
        int waitDX,waitDY;
        if(darkdungeon_action_type(&waitDX,&waitDY)!=DD_ACTION_WAIT)std::exit(69);
        rhack(' ');
        bool repeatClicked=false;
        for(auto* button:toolbar->findChildren<QToolButton*>())if(button->property("commandName")=="repeat") {
            program_state.input_state=commandInp;button->click();program_state.input_state=previousInputState;
            if(!nethack_qt_::NetHackQtBind::qt_kbhit() || nethack_qt_::NetHackQtBind::qt_nhgetch()!=1)std::exit(69);
            rhack(1);repeatClicked=true;break;
        }
        if(!repeatClicked || !svc.context.move || cmdq_peek(CQ_CANNED) || gi.in_doagain)std::exit(69);
        svc.context=toolbarContext;cmdq_clear(CQ_REPEAT);
        for(const char* name:{"contextaction","repeat","pickup","droptype","kick","throw","fire","eat","search","wait",
                "inventory","wield","apply","lookcontainer","open","close","up","down"})
            if(!commands.contains(QString::fromLatin1(name)))std::exit(40);
        if(labelled!=20 || toolbar->height()<52 || tools->height()<52)std::exit(40);
        auto* smaller=tools->findChild<QToolButton*>("zoomOut");
        auto* larger=tools->findChild<QToolButton*>("zoomIn");
        const int tileSize=nethack_qt_::qt_settings->tileWidth;
        if(tileSize!=48 || !smaller || !larger)std::exit(41);
        const int viewX=u.ux,viewY=u.uy,viewHP=u.uhp;
        larger->click();QCoreApplication::processEvents();
        if(nethack_qt_::qt_settings->tileWidth!=64 || map->widget()->width()!=COLNO*64)std::exit(42);
        smaller->click();QCoreApplication::processEvents();
        if(nethack_qt_::qt_settings->tileWidth!=48 || u.ux!=viewX || u.uy!=viewY || u.uhp!=viewHP || nethack_qt_::NetHackQtBind::qt_kbhit())std::exit(43);
        auto* viewSettings=nethack_qt_::qt_settings;
        viewSettings->setMapTileSize(112,112);larger->click();
        if(viewSettings->tileWidth!=128 || viewSettings->tileHeight!=128)std::exit(45);
        viewSettings->setMapTileSize(8,8);smaller->click();
        if(viewSettings->tileWidth!=6 || viewSettings->tileHeight!=6)std::exit(46);
        viewSettings->setMapTileSize(32,16);larger->click();
        if(viewSettings->tileWidth!=43 || viewSettings->tileHeight!=21)std::exit(47);
        viewSettings->setMapTileSize(48,48);map->centerOnCursor();QCoreApplication::processEvents();
        const QSize originalSize=main->size();main->resize(1395,850);QCoreApplication::processEvents();
        darkdungeon_trace(QString("Bottom layout: central=%1 map=%2")
            .arg(qobject_cast<QMainWindow*>(main)->centralWidget()->height()).arg(map->height()).toUtf8().constData());
        if(map->height()<qobject_cast<QMainWindow*>(main)->centralWidget()->height()/2)std::exit(44);
        auto heroVisible=[&]{
            const QPoint topLeft=map->widget()->mapTo(map->viewport(),QPoint(u.ux*48,u.uy*48));
            return map->viewport()->rect().contains(QRect(topLeft,QSize(48,48)));
        };
        if(!heroVisible())std::exit(48);
        main->grab().save(output+"/layout-1395.png");
        main->resize(960,640);QCoreApplication::processEvents();
        QCoreApplication::processEvents();
        darkdungeon_trace(QString("Narrow layout: actual=%1x%2 minimum=%3x%4")
            .arg(main->width()).arg(main->height()).arg(main->minimumWidth()).arg(main->minimumHeight()).toUtf8().constData());
        if(main->width()!=960 || main->height()!=640)std::exit(90);
        if(!heroVisible())std::exit(49);
        auto allButtonsVisible=[&] {
            for(auto* bar:{toolbar,tools})for(auto* button:bar->findChildren<QToolButton*>())
                if(!button->text().isEmpty() && (!button->isVisible() || !bar->rect().contains(button->geometry())))return false;
            return true;
        };
        auto* window=qobject_cast<QMainWindow*>(main);
        auto bottomLayoutCorrect=[&] {
            auto* panels=main->findChild<QSplitter*>("adventurePanels");
            auto* messages=main->findChild<QWidget*>("adventureMessages");
            if(!panels || panels->count()!=3 || !messages || panels->widget(2)!=messages
                    || panels->widget(0)->objectName()!="adventureUpperPanels" || panels->widget(1)!=map
                    || window->toolBarArea(toolbar)!=Qt::BottomToolBarArea
                    || window->toolBarArea(tools)!=Qt::BottomToolBarArea
                    || !messages->autoFillBackground() || messages->testAttribute(Qt::WA_TranslucentBackground))return false;
            const int mapBottom=panels->widget(1)->mapTo(main,QPoint(0,panels->widget(1)->height())).y();
            const int messageTop=messages->mapTo(main,QPoint(0,0)).y();
            const int messageBottom=messages->mapTo(main,QPoint(0,messages->height())).y();
            const bool twoRows=toolbar->y()!=tools->y();
            return mapBottom<=messageTop && messageBottom<=std::min(toolbar->y(),tools->y())
                && messages->width()==panels->width()
                && messages->height()>=QFontMetrics(messages->font()).height()*2+8
                && (twoRows ? toolbar->y()<tools->y() : toolbar->x()<tools->x());
        };
        if(!allButtonsVisible() || !window->toolBarBreak(toolbar) || toolbar->y()==tools->y()
                || !bottomLayoutCorrect())std::exit(54);
        main->grab().save(output+"/layout-960.png");
        const int requiredWidth=toolbar->sizeHint().width()+tools->sizeHint().width();
        for(int width:{requiredWidth+16,requiredWidth-16,requiredWidth,requiredWidth+1,requiredWidth-1,requiredWidth}) {
            main->resize(width,850);QCoreApplication::processEvents();QCoreApplication::processEvents();
            if(window->toolBarBreak(toolbar)!=(width<requiredWidth) || !allButtonsVisible() || !heroVisible()
                    || !bottomLayoutCorrect())std::exit(72);
        }
        main->resize(std::max(1920,requiredWidth+64),1000);QCoreApplication::processEvents();QCoreApplication::processEvents();
        auto* upper=main->findChild<QSplitter*>("adventureUpperPanels");
        if(!upper || upper->count()!=2 || window->toolBarBreak(toolbar) || toolbar->y()!=tools->y()
                || !allButtonsVisible() || upper->sizes()[1]<main->width()/2 || !heroVisible()
                || !bottomLayoutCorrect())std::exit(73);
        main->grab().save(output+"/layout-wide.png");
        {
            auto* healthBar=main->findChild<QLabel*>("adventureHealthBar");
            auto* injuryBar=main->findChild<QLabel*>("adventureInjuryBar");
            if(!healthBar || !injuryBar)std::exit(91);
            auto* statusWidget=healthBar->parentWidget();
            auto refreshStatus=[&] {
                // The port updates stats when status line zero is completed.
                nethack_qt_::NetHackQtBind::qt_curs(WIN_STATUS,0,0);
                nethack_qt_::NetHackQtBind::qt_putstr(WIN_STATUS,ATR_NONE,"");
                QCoreApplication::processEvents();
            };
            const int savedHealth=u.uhp,savedMaximum=u.uhpmax;
            const bool barShown=iflags.wc2_hitpointbar;
            u.uhpmax=20;iflags.wc2_hitpointbar=TRUE;
            for(int health:{20,10,0}) {
                u.uhp=health;
                refreshStatus();
                if(healthBar->isVisible()!=(health>0) || injuryBar->isVisible()!=(health<20))std::exit(92);
                if(health && healthBar->height()!=9)std::exit(93);
                if(health<20 && injuryBar->height()!=3)std::exit(93);
                if(health==10 && std::abs(healthBar->width()-injuryBar->width())>2)std::exit(94);
                statusWidget->grab().save(output+QString("/health-bar-%1.png").arg(health));
            }
            iflags.wc2_hitpointbar=FALSE;
            refreshStatus();
            if(healthBar->isVisible() || injuryBar->isVisible())std::exit(95);
            statusWidget->grab().save(output+"/health-bar-off.png");
            u.uhp=savedHealth;u.uhpmax=savedMaximum;iflags.wc2_hitpointbar=barShown;
            refreshStatus();
            QMetaObject::invokeMethod(main,"layout",Qt::DirectConnection);QCoreApplication::processEvents();
        }
#ifdef ENHANCED_PAPERDOLL
        auto* messages=main->findChild<QWidget*>("adventureMessages");
        const int messageHeight=messages->height();
        const bool dollShown=viewSettings->doll_is_shown;
        for(bool shown:{false,true,dollShown}) {
            viewSettings->setDollShown(shown);QCoreApplication::processEvents();
            if(!bottomLayoutCorrect() || std::abs(messages->height()-messageHeight)>1)std::exit(89);
        }
#endif
        if(main->screen()->availableGeometry().width()>=std::max(toolbar->sizeHint().width(),tools->sizeHint().width())) {
            main->showMaximized();QCoreApplication::processEvents();QCoreApplication::processEvents();
            const bool twoRows=requiredWidth>main->contentsRect().width();
            if(window->toolBarBreak(toolbar)!=twoRows || !allButtonsVisible() || !heroVisible()
                    || !bottomLayoutCorrect())std::exit(74);
            main->grab().save(output+"/layout-maximized.png");
            main->showNormal();QCoreApplication::processEvents();
        }
        {
        // Toolbar customization: hide a standard button and add a Magic menu entry, then restore.
        auto* mainWindow=qobject_cast<QMainWindow*>(main);
        const auto catalog=toolbarCatalog(mainWindow);
        const auto hidden=std::find_if(catalog.cbegin(),catalog.cend(),[](const ToolbarChoice& c){return c.builtin && c.command!="contextaction";});
        const auto added=std::find_if(catalog.cbegin(),catalog.cend(),[](const ToolbarChoice& c){return c.menuAction && c.command=="pray";});
        if(hidden==catalog.cend() || added==catalog.cend()) {
            for(const auto& c:catalog)darkdungeon_trace(QString("toolbar choice %1 [%2] %3 cmd=%4").arg(c.id,c.group,c.label,c.command).toUtf8().constData());
            std::exit(95);
        }
        QStringList items=defaultToolbarItems(catalog);items.removeAll(hidden->id);items.append(added->id);
        QSettings().setValue("toolbar/items",items);applyToolbarItems(mainWindow);QCoreApplication::processEvents();
        auto* custom=main->findChild<QToolButton*>("customToolbarButton");
        if(!custom || custom->text()!=added->label || !custom->isVisible() || hidden->builtin->isVisible())std::exit(96);
        {
            const QImage icon=custom->icon().pixmap(QSize(24,24)).toImage();bool painted=false;
            for(int y=0;y<icon.height() && !painted;++y)for(int x=0;x<icon.width();++x)if(qAlpha(icon.pixel(x,y))){painted=true;break;}
            if(!painted)std::exit(96);
        }
        main->grab().save(output+"/toolbar-custom.png");
        QSettings().remove("toolbar/items");applyToolbarItems(mainWindow);
        QCoreApplication::sendPostedEvents(nullptr,QEvent::DeferredDelete);QCoreApplication::processEvents();
        if(main->findChild<QToolButton*>("customToolbarButton") || !hidden->builtin->isVisible())std::exit(97);
        }
        if(!darkdungeon_inventory_smoke(output))std::exit(98);
        if(qEnvironmentVariableIntValue("DARKDUNGEON_SMOKE_GEOMETRY")==1) {
            const QSize oldMin=map->minimumSize(),oldMax=map->maximumSize();
            const QSize oldTile(viewSettings->tileWidth,viewSettings->tileHeight);
            for(int tile:{36,48}) {
                main->setProperty("comparisonTile",tile);comparisonTileSize(tile,tile);
                map->setProperty("comparisonGeometryActive",true);
                comparisonGeometry(map);
                QElapsedTimer settle;settle.start();
                while(settle.elapsed()<2000 && (settle.elapsed()<100 || map->viewport()->size()!=QSize(864,432))){QCoreApplication::processEvents(QEventLoop::AllEvents,10);QThread::msleep(1);}
                QString error;
                if(!comparisonCapture(qobject_cast<QMainWindow*>(main),output+QString("/geometry-g%1-").arg(tile)+QUuid::createUuid().toString(QUuid::WithoutBraces),&error)) {
                    darkdungeon_trace(error.toUtf8().constData());std::exit(99);
                }
            }
            map->setProperty("comparisonGeometryActive",false);
            map->setMinimumSize(oldMin);map->setMaximumSize(oldMax);
            comparisonTileSize(oldTile.width(),oldTile.height());main->setProperty("comparisonTile",QVariant());
        }
        main->resize(originalSize);QCoreApplication::processEvents();
        QCoreApplication::processEvents();
        if (!main->grab().save(output+"/nethack-qt.png")) std::exit(5);
        QFile report(output+"/runtime.txt");
        if (!report.open(QIODevice::WriteOnly)) std::exit(6);
        report.write(QString("NetHack Qt started\nplayer=%1\nhero=%2,%3\nhp=%4\nNetHack keyboard movement=pass\n")
            .arg(svp.plname).arg(u.ux).arg(u.uy).arg(u.uhp).toUtf8());
        report.close();
        QFile localized(output+"/runtime.txt");
        if(localized.open(QIODevice::Append)) {
            localized.write(QString("Language-specific object names and help=pass\nlong sword=%1\n").arg(objectName).toUtf8());
            localized.write(QString("Level monster/object IDs=%1 checked\n").arg(levelIds.size()).toUtf8());
            localized.write("20 toolbar buttons: painted icons, labels below, command dispatch, prompt guard, visibility at 960, map zoom and window resize=pass\n");
            localized.write("Toolbar rows adapt to button widths: narrow, boundary, wide and maximized; status expands with window=pass\n");
            localized.write("Layout: status above map, opaque full-width messages below map, toolbars below messages at narrow/boundary/wide/maximized widths=pass\n");
            localized.write("HP bar: full/half/zero/off visibility, half ratio, 9/3 pixel heights and actual 960px window width; doll toggle preserves message height=pass\n");
            localized.write("Map layers: transparent hero/items/monsters/corpses/statues, black details preserved, stairs visible, unseen terrain and swallowed guards, terrain refresh under unchanged hero=pass\n");
            localized.write("Solid rock: main-map S_stone uses gray masonry; unexplored remains black=pass\n");
            localized.write("Toolbar customization: hide a standard button, add a Magic menu entry, restore defaults=pass\n");
            localized.write("Equipment and inventory window: slots, item grid and drag command keys=pass\n");
            localized.write("Inventory refresh scheduling: no refresh during closed 550ms; core notification and closed-container reopen=pass\n");
            localized.write("Legacy sprite files load=pass\n");
            localized.write("Walk/attack notifications and interpolation=not-run (retired for R6 phase 0)\n");
            localized.write("Again toolbar button executed prior contextual wait; empty container selection ended without animal looting=pass\n");
            localized.write("Space map input and one-turn wait, auto-repeat guard, container look/lock/choice, pickup, stair priority, doors and text input=pass\n");
#ifdef DARKDUNGEON_JAPANESE
            localized.write("Japanese input echo and UTF-8 buffer boundary=pass\n");
#endif
            if(qEnvironmentVariable("DARKDUNGEON_SMOKE_PHASE")=="restore")localized.write("Saved position, HP, named weapon and message history restored=pass\n");
        }
        localized.close();
        timer->stop();
        if(qEnvironmentVariable("DARKDUNGEON_SMOKE_PHASE")=="save") {
            if(!uwep)std::exit(29);
            oname(uwep,languageText("Test sword","試験の剣").toUtf8().constData(),0);
            if(QString::fromUtf8(doname(uwep)).contains(QChar(0xfffd)))std::exit(37);
            pline("%s",languageText("Language history test","日本語の履歴保存テスト").toUtf8().constData());
            QFile saved(output+"/saved-state.json");if(!saved.open(QIODevice::WriteOnly))std::exit(30);
            saved.write(QJsonDocument(QJsonObject{{"x",int(u.ux)},{"y",int(u.uy)},{"hp",int(u.uhp)}}).toJson());saved.close();
            QFile reportCopy(output+"/runtime-save.txt");reportCopy.remove();QFile::copy(output+"/runtime.txt",output+"/runtime-save.txt");
            if(!dosave0())std::exit(31);
            darkdungeon_trace("Adventure saved for restore test");
        }
        clearlocks();
        std::exit(0);
        };
        qApp->exit();
    });
    timer->start(250);
}
