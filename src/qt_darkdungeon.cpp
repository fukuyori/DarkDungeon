// DarkDungeon additions, 2026-10-08. NetHack-derived application: see dat/license.
extern "C" {
#include "hack.h"
#include "dlb.h"
#include "context_action.h"
#include "func_tab.h"
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
#include "realtime_model.h"
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
// Draw a NetHack tile with its reserved background removed into any rectangle.
void drawTile(QPainter& painter,int glyph,const QRectF& target) {
    auto& glyphs=nethack_qt_::qt_settings->glyphs();
    painter.save();painter.translate(target.topLeft());
    painter.scale(target.width()/std::max(1,glyphs.width()),target.height()/std::max(1,glyphs.height()));
    glyphs.drawForegroundCell(painter,glyph,::glyphmap[glyph].tileidx,0,0);
    painter.restore();
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
        if(cmap==S_stone)wall.addRect(0,0,48,48); // Displayed solid rock and practice walls.
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

// Ignore held-key repeats after practice closes, until the keys are released.
class HeldKeyGuard final : public QObject {
public:
    explicit HeldKeyGuard(QList<int> keys) : QObject(qApp),blocked(std::move(keys)) {qApp->installEventFilter(this);}
protected:
    bool eventFilter(QObject*,QEvent* event) override {
        if(event->type()!=QEvent::KeyPress && event->type()!=QEvent::KeyRelease)return false;
        auto* key=static_cast<QKeyEvent*>(event);
        if(!blocked.contains(key->key()))return false;
        const bool consume=event->type()==QEvent::KeyRelease || key->isAutoRepeat();
        if(!key->isAutoRepeat())blocked.removeAll(key->key());
        if(blocked.isEmpty()){qApp->removeEventFilter(this);deleteLater();}
        if(consume)event->accept();
        return consume;
    }
private:
    QList<int> blocked;
};

class RealtimeArena final : public QDialog {
public:
    explicit RealtimeArena(QWidget* parent) : QDialog(parent),model(snapshot()) {
        setWindowTitle(languageText("DarkDungeon - Realtime practice","DarkDungeon - リアルタイム練習"));
        resize(1100,760);setFocusPolicy(Qt::StrongFocus);
        // Practice enemies are temporary actors, not mutations of NetHack monsters.
        std::queue<std::pair<int,int>> todo;
        std::vector<int> distance(static_cast<size_t>(model.width*model.height),-1);
        int startX=static_cast<int>(model.player.x),startY=static_cast<int>(model.player.y);
        todo.push({startX,startY});distance[static_cast<size_t>(startY*model.width+startX)]=0;
        std::vector<darkdungeon::Position> candidates;
        while(!todo.empty()) {
            auto [x,y]=todo.front();todo.pop();
            int d=distance[static_cast<size_t>(y*model.width+x)];
            if(d>=4 && d<=14) candidates.push_back({x+.5,y+.5});
            const int dx[4]={0,1,0,-1},dy[4]={-1,0,1,0};
            for(int dir=0;dir<4;++dir) {
                int nx=x+dx[dir],ny=y+dy[dir];
                if(model.floorAt(nx,ny) && distance[static_cast<size_t>(ny*model.width+nx)]<0) {
                    distance[static_cast<size_t>(ny*model.width+nx)]=d+1;todo.push({nx,ny});
                }
            }
        }
        for(int i=0;i<4 && i<static_cast<int>(candidates.size());++i) {
            size_t index=static_cast<size_t>((i+1)*(candidates.size()-1)/4);
            model.addEnemy(static_cast<darkdungeon::EnemyKind>(i),candidates[index]);
        }
        clock.start();timer.setTimerType(Qt::PreciseTimer);timer.setInterval(16);
        connect(&timer,&QTimer::timeout,this,[this] {
            double elapsed=std::min(clock.restart()/1000.0,.2);
            if(!paused) {
                accumulated+=elapsed;
                while(accumulated>=1.0/60) {model.tick(input());accumulated-=1.0/60;}
            }
            update();
        });timer.start();
    }
    darkdungeon::RealtimeModel model;
    void reject() override {
        guardHeldKeys();QDialog::reject();
    }
    bool verifyInput() {
        setWindowModality(Qt::ApplicationModal);show();raise();activateWindow();setFocus();QCoreApplication::processEvents();
        auto key=[this](int code,bool press) {
            QKeyEvent event(press?QEvent::KeyPress:QEvent::KeyRelease,code,Qt::NoModifier);
            QCoreApplication::sendEvent(this,&event);
        };
        auto wait=[](int milliseconds) {
            QEventLoop loop;QTimer::singleShot(milliseconds,&loop,&QEventLoop::quit);
            QElapsedTimer elapsed;elapsed.start();int result=loop.exec();
            darkdungeon_trace(QString("practice wait requested=%1 elapsed=%2 result=%3").arg(milliseconds).arg(elapsed.elapsed()).arg(result).toUtf8().constData());
        };
        wait(100); // allow native focus notifications to settle before input
        if(paused)key(Qt::Key_P,true);
        const auto original=model.player;
        const int dx[4]={0,1,0,-1},dy[4]={-1,0,1,0};
        const int codes[4]={Qt::Key_Up,Qt::Key_Right,Qt::Key_Down,Qt::Key_Left};
        int chosen=-1;
        for(int d=0;d<4;++d)
            if(model.walkable(original.x+dx[d]*.5,original.y+dy[d]*.5)) {chosen=d;break;}
        if(chosen<0){darkdungeon_trace("practice: no walkable direction");return false;}
        key(codes[chosen],true);wait(300);key(codes[chosen],false);
        if(std::hypot(model.player.x-original.x,model.player.y-original.y)<.1){darkdungeon_trace(QString("practice: movement failed paused=%1 visible=%2 active=%3").arg(paused).arg(isVisible()).arg(isActiveWindow()).toUtf8().constData());return false;}
        key(Qt::Key_Space,true);wait(250);key(Qt::Key_Space,false);
        if(model.sword<.8){darkdungeon_trace("practice: sword failed");return false;}
        key(Qt::Key_P,true);double pausedTime=model.time;wait(100);
        if(model.time!=pausedTime){darkdungeon_trace("practice: pause failed");return false;}
        key(Qt::Key_R,true);
        if(model.sword!=0 || model.hp!=100 || model.player.x!=original.x || model.player.y!=original.y)return false;
        // Produce the screenshot with the sword drawn, then return to adventure.
        key(Qt::Key_Space,true);wait(250);key(Qt::Key_Space,false);
        return model.sword>.8;
    }
protected:
    void closeEvent(QCloseEvent* event) override {guardHeldKeys();QDialog::closeEvent(event);}
    void keyPressEvent(QKeyEvent* event) override {
        if(!event->isAutoRepeat()) {
            const int key=event->key();
            if(key==Qt::Key_Escape) {reject();event->accept();return;}
            if(key==Qt::Key_P) {paused=!paused;held.clear();accumulated=0;clock.restart();}
            else if(key==Qt::Key_R) {model.reset();held.clear();accumulated=0;paused=false;}
            else if(!held.contains(key)) held.append(key);
        }
        event->accept();
    }
    void keyReleaseEvent(QKeyEvent* event) override {
        if(!event->isAutoRepeat()) held.removeAll(event->key());
        event->accept();
    }
    void changeEvent(QEvent* event) override {
        if(event->type()==QEvent::ActivationChange && !isActiveWindow()) {paused=true;held.clear();accumulated=0;}
        QDialog::changeEvent(event);
    }
    void paintEvent(QPaintEvent*) override {
        QPainter p(this);p.setRenderHint(QPainter::SmoothPixmapTransform,false);
        p.fillRect(rect(),QColor("#10151d"));
        p.setPen(QColor("#d5ae66"));QFont title("Segoe UI",18,QFont::DemiBold);p.setFont(title);
        p.drawText(24,36,languageText("DARKDUNGEON  /  REALTIME PRACTICE","DARKDUNGEON  /  リアルタイム練習"));
        p.setPen(QColor("#a6b0bd"));p.setFont(QFont("Segoe UI",10));
        p.drawText(24,61,languageText("Current NetHack map · Adventure paused · Practice resets when closed","現在の階の地形 · 冒険は停止中 · 閉じると練習状態を初期化"));
        p.fillRect(24,80,240,12,QColor("#293340"));
        p.fillRect(24,80,240*model.hp/100,12,QColor("#5dba99"));
        p.setPen(Qt::white);p.drawText(280,92,languageText("HERO  %1 / 100     DEFEATED  %2","勇者  %1 / 100     撃破  %2").arg(model.hp).arg(model.kills));
        const QRect field(16,112,width()-32,height()-164);
        p.save();p.setClipRect(field);
        constexpr double tile=36;
        QPointF camera(field.center().x()-model.player.x*tile,field.center().y()-model.player.y*tile);
        for(int y=0;y<model.height;++y)for(int x=0;x<model.width;++x) {
            QRectF target(camera.x()+x*tile,camera.y()+y*tile,tile,tile);
            if(!target.intersects(field))continue;
            p.drawImage(target,dungeonTile(model.floorAt(x,y)?S_room:S_stone,x,y));
        }
        auto actorRect=[&](darkdungeon::Position position) {
            return QRectF(camera.x()+position.x*tile-tile/2,camera.y()+position.y*tile-tile/2,tile,tile);
        };
        for(const auto& enemy:model.enemies) {
            if(enemy.hp<=0)continue;
            int monster=PM_GREEN_SLIME;
            switch(enemy.kind) {
            case darkdungeon::EnemyKind::Slime:monster=PM_GREEN_SLIME;break;
            case darkdungeon::EnemyKind::Knight:monster=PM_SOLDIER;break;
            case darkdungeon::EnemyKind::Mage:monster=PM_GNOMISH_WIZARD;break;
            case darkdungeon::EnemyKind::Dragon:monster=PM_RED_DRAGON;break;
            }
            drawTile(p,monnum_to_glyph(monster,MALE),actorRect(enemy.position));
        }
        for(const auto& spell:model.projectiles) {
            QPointF center(camera.x()+spell.position.x*tile,camera.y()+spell.position.y*tile);
            p.setPen(Qt::NoPen);p.setBrush(QColor("#fa9471"));p.drawEllipse(center,6,6);
            p.setBrush(QColor("#ffd888"));p.drawEllipse(center,3,3);
        }
        drawTile(p,hero_glyph,actorRect(model.player));
        // The drawn sword extends from the hero in the facing direction.
        if(model.sword>.05) {
            const double dx[4]={0,1,0,-1},dy[4]={-1,0,1,0};
            const QPointF center(camera.x()+model.player.x*tile,camera.y()+model.player.y*tile);
            const double reach=tile*(.25+.55*std::min(1.0,model.sword));
            p.setPen(QPen(QColor("#e8edf2"),4,Qt::SolidLine,Qt::RoundCap));
            p.drawLine(center,center+QPointF(dx[model.facing]*reach,dy[model.facing]*reach));
        }
        p.restore();
        if(paused || model.hp<=0) {
            p.fillRect(field,QColor(0,0,0,150));p.setFont(title);p.setPen(Qt::white);
            p.drawText(field,Qt::AlignCenter,model.hp<=0?languageText("THE HERO HAS FALLEN\nR  ·  Restart practice","勇者は倒れた\nR  ·  練習をやり直す"):languageText("PAUSED\nP  ·  Resume","一時停止\nP  ·  再開"));
        }
        p.setFont(QFont("Segoe UI",10));p.setPen(QColor("#bfc8d2"));
        p.drawText(24,height()-20,languageText("Arrows / WASD  Move     Space  Draw sword     P  Pause     R  Reset     Esc  Return to adventure","矢印 / WASD  移動     Space  剣を構える     P  一時停止     R  初期化     Esc  冒険に戻る"));
    }
private:
    QTimer timer;QElapsedTimer clock;QList<int> held;bool paused=false;double accumulated=0;
    void guardHeldKeys() {if(!held.isEmpty()){new HeldKeyGuard(held);held.clear();}}
    darkdungeon::Input input() const {
        darkdungeon::Input in;in.sword=held.contains(Qt::Key_Space);
        for(auto it=held.crbegin();it!=held.crend();++it) {
            if(*it==Qt::Key_Up || *it==Qt::Key_W) {in.direction=0;break;}
            if(*it==Qt::Key_Right || *it==Qt::Key_D) {in.direction=1;break;}
            if(*it==Qt::Key_Down || *it==Qt::Key_S) {in.direction=2;break;}
            if(*it==Qt::Key_Left || *it==Qt::Key_A) {in.direction=3;break;}
        }return in;
    }
    static darkdungeon::RealtimeModel snapshot() {
        std::vector<uint8_t> cells(COLNO*ROWNO,0);
        for(int y=0;y<ROWNO;++y)for(int x=1;x<COLNO;++x) {
            int type=levl[x][y].typ;
            bool open=ACCESSIBLE(type) && !IS_POOL(type) && type!=LAVAPOOL;
            if(IS_DOOR(type) && (levl[x][y].doormask&(D_CLOSED|D_LOCKED)))open=false;
            cells[static_cast<size_t>(y*COLNO+x)]=open?1:0;
        }
        return darkdungeon::RealtimeModel(COLNO,ROWNO,std::move(cells),{u.ux+.5,u.uy+.5});
    }
};
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
        auto* menu=main->menuBar()->addMenu(languageText("Practice","練習"));
        auto* action=menu->addAction(languageText("Realtime practice","リアルタイム練習"));
        QObject::connect(action,&QAction::triggered,main,[main] {
            if(!u.ux || !u.uy || program_state.gameover)return;
            try {RealtimeArena arena(main);arena.exec();}
            catch(const std::exception& e){QMessageBox::warning(main,languageText("Practice unavailable","練習を開始できません"),languageText(e.what(),"この場所では練習用の地形を作成できません。"));}
        });
        auto* languages=main->menuBar()->addMenu(languageText("Language","言語"));
        for(const QString& code:{QString("en"),QString("ja")}) {
            auto* choice=languages->addAction(code=="ja"?QString::fromUtf8("日本語"):QString("English"));
            QObject::connect(choice,&QAction::triggered,main,[main,code] {
                QSettings().setValue("language",code);
                QMessageBox::information(main,languageText("Language","言語"),languageText("Language saved for the next launch. Save and exit to restart. Adventures are stored separately for each language.","次回起動する言語を保存しました。冒険を保存して終了し、再起動してください。セーブは言語別に保存します。"));
            });
        }
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
        darkdungeon_trace("NetHack movement verified; realtime input verification");
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
        for(int y=0;y<48;++y)for(int x=0;x<48;++x)
            if((heroTile.pixel(x*heroTile.width()/48,y*heroTile.height()/48)|0xff000000)==qRgb(71,108,108)) {
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
        // Timing checks need a live event loop before command button clicks
        // deliberately call qApp->exit() to hand control back to the core.
        try {
            RealtimeArena arena(main);
            if(!arena.verifyInput())std::exit(13);
            darkdungeon_trace("Realtime input verified");
            if(!arena.grab().save(output+"/realtime.png"))std::exit(7);
            if(u.ux!=targetX || u.uy!=targetY)std::exit(14);
        }catch(const std::exception&){std::exit(8);}
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
            localized.write("Again toolbar button executed prior contextual wait; empty container selection ended without animal looting=pass\n");
            localized.write("Realtime Qt input, sword, pause, reset=pass\nPractice did not change adventure position=pass\n");
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
