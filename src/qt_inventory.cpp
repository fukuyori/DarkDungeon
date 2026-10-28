// DarkDungeon additions, 2026-10-10. NetHack-derived application: see dat/license.
// Equipment and inventory window: a figure with equipment slots and a grid of
// carried items. Dragging an item sends the normal NetHack command keys for it,
// so turns, curses, messages and other rules are unchanged.
extern "C" {
#include "hack.h"
#include "func_tab.h"
#include "context_action.h"
extern glyph_map glyphmap[MAX_GLYPH];
}
#include "qt_pre.h"
#include <QtGui/QtGui>
#include <QtWidgets/QtWidgets>
#include "qt_post.h"
#include "qt_darkdungeon.h"
#include "qt_bind.h"
#include "qt_main.h"
#include "qt_set.h"
#include "qt_glyph.h"
#include <algorithm>

namespace {
const char* const itemMime="application/x-darkdungeon-item";
constexpr int cell=52;

enum Slot { SlotHelmet,SlotCloak,SlotSuit,SlotShirt,SlotGloves,SlotBoots,
            SlotAmulet,SlotBlindfold,SlotLeftRing,SlotRightRing,SlotShield,SlotQuiver,
            SlotWeapon,SlotSwap,SlotCount };
struct SlotInfo { const char* english; const char* japanese; int column,row; };
// Five columns by seven rows: slots at the sides and bottom, the figure in the middle.
const SlotInfo slotInfo[SlotCount]={
    {"Helmet","兜",0,0},{"Cloak","マント",0,1},{"Body armor","鎧",0,2},{"Shirt","シャツ",0,3},
    {"Gloves","手袋",0,4},{"Boots","靴",0,5},
    {"Amulet","首飾り",4,0},{"Blindfold","目隠し",4,1},{"Left ring","左手の指輪",4,2},
    {"Right ring","右手の指輪",4,3},{"Shield","盾",4,4},{"Quiver","矢筒",4,5},
    {"Weapon","武器",1,6},{"Secondary weapon","予備の武器",3,6}};

struct obj* slotObject(int slot) {
    switch(slot) {
    case SlotHelmet:return uarmh; case SlotCloak:return uarmc; case SlotSuit:return uarm;
    case SlotShirt:return uarmu; case SlotGloves:return uarmg; case SlotBoots:return uarmf;
    case SlotAmulet:return uamul; case SlotBlindfold:return ublindf; case SlotLeftRing:return uleft;
    case SlotRightRing:return uright; case SlotShield:return uarms; case SlotQuiver:return uquiver;
    case SlotWeapon:return uwep; case SlotSwap:return uswapwep; default:return nullptr;
    }
}
int armorCategory(int slot) {
    switch(slot) {
    case SlotHelmet:return ARM_HELM; case SlotCloak:return ARM_CLOAK; case SlotSuit:return ARM_SUIT;
    case SlotShirt:return ARM_SHIRT; case SlotGloves:return ARM_GLOVES; case SlotBoots:return ARM_BOOTS;
    case SlotShield:return ARM_SHIELD; default:return -1;
    }
}
QList<struct obj*> carriedItems() {
    QList<struct obj*> items;
    for(struct obj* item=gi.invent;item;item=item->nobj)items.append(item);
    return items;
}
QImage itemImage(struct obj* item) {
    const int glyph=obj_to_glyph(item,rn2_on_display_rng);
    QImage image=nethack_qt_::qt_settings->glyphs().glyph(glyph,::glyphmap[glyph].tileidx).toImage()
        .convertToFormat(QImage::Format_ARGB32);
    // The bundled tiles reserve this color for the background.
    for(int y=0;y<image.height();++y) {
        auto* row=reinterpret_cast<QRgb*>(image.scanLine(y));
        for(int x=0;x<image.width();++x)if((row[x]&0x00ffffff)==(qRgb(71,108,108)&0x00ffffff))row[x]=0;
    }
    return image;
}
QString itemName(struct obj* item) {return QString::fromUtf8(doname(item));}

// Command keys. A key is only followed by an item letter when NetHack will
// actually ask for one, so no stray key is left to run as the next command.
QByteArray key(int (*command)(void)) {const char k=cmd_from_func(command);return k?QByteArray(1,k):QByteArray();}
int wornArmorPieces() {
    int pieces=!!uarmh+!!uarms+!!uarmg+!!uarmf;
    if(uarmc || uarm || uarmu)++pieces; // only the outermost body layer counts
    return pieces;
}
int wornAccessories() {return !!uleft+!!uright+!!uamul+!!ublindf;}
bool isBlindfold(struct obj* item) {return item->otyp==BLINDFOLD || item->otyp==TOWEL || item->otyp==LENSES;}
bool inUse(struct obj* item) {return (item->owornmask & (W_ARMOR|W_ACCESSORY)) || item==uwep || item==uswapwep || item==uquiver;}

QByteArray placeKeys(struct obj* item,int slot) {
    const QByteArray letter(1,item->invlet);
    if(const int category=armorCategory(slot);category>=0) {
        if(item->oclass!=ARMOR_CLASS || objects[item->otyp].oc_armcat!=category || inUse(item) || slotObject(slot))return {};
        return key(dowear).isEmpty()?QByteArray():key(dowear)+letter;
    }
    switch(slot) {
    case SlotWeapon:
        if(item==uwep || item==uquiver || (item->owornmask & (W_ARMOR|W_ACCESSORY)))return {};
        return key(dowield).isEmpty()?QByteArray():key(dowield)+letter;
    case SlotSwap:
        if(item==uwep)return key(doswapweapon);
        if(inUse(item) || key(dowield).isEmpty() || key(doswapweapon).isEmpty())return {};
        return key(dowield)+letter+key(doswapweapon); // wield, then exchange
    case SlotQuiver:
        if(inUse(item) || key(dowieldquiver).isEmpty())return {};
        return key(dowieldquiver)+letter;
    case SlotAmulet:
        if(item->oclass!=AMULET_CLASS || uamul || inUse(item) || key(doputon).isEmpty())return {};
        return key(doputon)+letter;
    case SlotBlindfold:
        if(!isBlindfold(item) || ublindf || inUse(item) || key(doputon).isEmpty())return {};
        return key(doputon)+letter;
    case SlotLeftRing: case SlotRightRing: {
        if(item->oclass!=RING_CLASS || inUse(item) || slotObject(slot) || key(doputon).isEmpty())return {};
        // NetHack asks for the hand only when both are free.
        const QByteArray hand=(!uleft && !uright)?QByteArray(slot==SlotLeftRing?"l":"r"):QByteArray();
        return key(doputon)+letter+hand;
    }
    default:return {};
    }
}
QByteArray removeKeys(int slot) {
    struct obj* item=slotObject(slot);
    if(!item)return {};
    const QByteArray letter(1,item->invlet);
    if(item->owornmask & W_ARMOR) {
        if(key(dotakeoff).isEmpty())return {};
        return wornArmorPieces()!=1 || ParanoidRemove?key(dotakeoff)+letter:key(dotakeoff);
    }
    if(item->owornmask & W_ACCESSORY) {
        if(key(doremring).isEmpty())return {};
        return wornAccessories()!=1 || ParanoidRemove?key(doremring)+letter:key(doremring);
    }
    if(slot==SlotWeapon && !key(dowield).isEmpty())return key(dowield)+"-";
    if(slot==SlotQuiver && !key(dowieldquiver).isEmpty())return key(dowieldquiver)+"-";
    return {};
}
bool sendKeys(const QByteArray& keys) {
    auto* main=qobject_cast<nethack_qt_::NetHackQtMainWindow*>(nethack_qt_::NetHackQtBind::mainWidget());
    if(keys.isEmpty() || !main || program_state.input_state!=commandInp || nethack_qt_::NetHackQtBind::qt_kbhit()) {
        nethack_qt_::NetHackQtBind::qt_nhbell();return false;
    }
    darkdungeon_trace(("Inventory window keys: "+keys).constData());
    main->doKeys(keys.constData());
    return true;
}

// Drawing: dark panels with a gold frame and recessed slots, drawn in code.
void paintFrame(QPainter& p,const QRect& r,const QString& title) {
    p.setRenderHint(QPainter::Antialiasing);
    p.fillRect(r,QColor("#0d0d0f"));
    QLinearGradient gold(r.topLeft(),r.bottomRight());
    gold.setColorAt(0,QColor("#f6d37a"));gold.setColorAt(.5,QColor("#a8741f"));gold.setColorAt(1,QColor("#f0c25c"));
    p.setPen(QPen(QBrush(gold),3));p.setBrush(QColor("#17171a"));
    p.drawRoundedRect(QRectF(r).adjusted(2.5,2.5,-2.5,-2.5),6,6);
    p.setPen(QPen(QColor("#5c4416"),1));p.setBrush(Qt::NoBrush);
    p.drawRoundedRect(QRectF(r).adjusted(7.5,7.5,-7.5,-7.5),4,4);
    if(!title.isEmpty()) {
        const QRectF plate(r.center().x()-60,r.top()+1,120,20);
        p.setPen(QPen(QBrush(gold),1.5));p.setBrush(QColor("#2a1f0b"));p.drawRoundedRect(plate,4,4);
        p.setPen(QColor("#f6d37a"));p.drawText(plate,Qt::AlignCenter,title);
    }
}
void paintSlot(QPainter& p,const QRect& r,bool highlighted) {
    p.setRenderHint(QPainter::Antialiasing,false);
    p.fillRect(r,QColor("#060607"));
    p.setPen(QColor("#2e2e33"));p.drawLine(r.bottomLeft(),r.bottomRight());p.drawLine(r.topRight(),r.bottomRight());
    p.setPen(QColor("#000000"));p.drawLine(r.topLeft(),r.topRight());p.drawLine(r.topLeft(),r.bottomLeft());
    const QRect inner=r.adjusted(3,3,-3,-3);
    QLinearGradient shade(inner.topLeft(),inner.bottomLeft());
    shade.setColorAt(0,QColor("#141417"));shade.setColorAt(1,QColor("#26262b"));
    p.fillRect(inner,shade);
    if(highlighted){p.setPen(QPen(QColor("#f6d37a"),2));p.drawRect(r.adjusted(1,1,-2,-2));}
}
void paintItem(QPainter& p,const QRect& r,struct obj* item,bool showLetter) {
    p.setRenderHint(QPainter::SmoothPixmapTransform,false);
    p.drawImage(r.adjusted(5,5,-5,-5),itemImage(item));
    QFont font=p.font();font.setPointSize(8);font.setBold(true);p.setFont(font);
    if(item->quan>1){p.setPen(Qt::black);p.drawText(r.adjusted(0,0,-3,-1),Qt::AlignRight|Qt::AlignBottom,QString::number(item->quan));
        p.setPen(QColor("#f2f2f2"));p.drawText(r.adjusted(0,0,-4,-2),Qt::AlignRight|Qt::AlignBottom,QString::number(item->quan));}
    if(showLetter){p.setPen(QColor("#c9b27a"));p.drawText(r.adjusted(4,2,0,0),Qt::AlignLeft|Qt::AlignTop,QString(QChar(item->invlet)));}
    if(inUse(item)) { // gold corner for equipped items
        p.setPen(Qt::NoPen);p.setBrush(QColor("#f0c25c"));
        p.drawPolygon(QPolygon{r.topRight()+QPoint(-12,1),r.topRight()+QPoint(0,1),r.topRight()+QPoint(0,13)});
    }
}
// A drag names where the item comes from: the inventory grid (by object id),
// an equipment slot, or the open container (by object id).
enum DragSource { FromInventory,FromSlot,FromContainer };
struct DragItem { DragSource source=FromInventory; unsigned id=0; int slot=-1; };
void startItemDrag(QWidget* widget,struct obj* item,DragSource source,int slot=-1) {
    auto* data=new QMimeData;
    data->setData(itemMime,QByteArray::number(int(source))+":"+QByteArray::number(item->o_id)+":"+QByteArray::number(slot));
    auto* drag=new QDrag(widget);drag->setMimeData(data);
    drag->setPixmap(QPixmap::fromImage(itemImage(item)).scaled(40,40));
    drag->setHotSpot(QPoint(20,20));
    drag->exec(Qt::MoveAction);
}
bool readDrag(const QMimeData* data,DragItem& item) {
    if(!data->hasFormat(itemMime))return false;
    const QList<QByteArray> parts=data->data(itemMime).split(':');
    if(parts.size()!=3)return false;
    item.source=DragSource(parts[0].toInt());item.id=parts[1].toUInt();item.slot=parts[2].toInt();
    return true;
}
struct obj* carriedById(unsigned id) {
    for(struct obj* item=gi.invent;item;item=item->nobj)if(item->o_id==id)return item;
    return nullptr;
}

// The container shown in the window: on the hero's square or carried.
unsigned openContainerId=0;
struct obj* openContainer() {
    if(!openContainerId || !u.ux)return nullptr;
    for(struct obj* item=svl.level.objects[u.ux][u.uy];item;item=item->nexthere)
        if(item->o_id==openContainerId && Is_container(item))return item;
    if(struct obj* item=carriedById(openContainerId);item && Is_container(item))return item;
    return nullptr;
}
QList<struct obj*> containerItems(struct obj* box) {
    QList<struct obj*> items;
    if(box)for(struct obj* item=box->cobj;item;item=item->nobj)items.append(item);
    return items;
}
// Moves run NetHack's internal "containermove" command through the same
// extended-command path the toolbar uses, so they take a normal turn.
bool sendContainerMove(struct obj* item,bool into) {
    struct obj* box=openContainer();
    auto* main=qobject_cast<nethack_qt_::NetHackQtMainWindow*>(nethack_qt_::NetHackQtBind::mainWidget());
    const char extended=cmd_from_func(doextcmd);
    if(!box || !item || !main || !extended || program_state.input_state!=commandInp || nethack_qt_::NetHackQtBind::qt_kbhit()
            || !darkdungeon_request_toolbar_command(darkdungeon_container_move)) {
        nethack_qt_::NetHackQtBind::qt_nhbell();return false;
    }
    darkdungeon_move_container=box->o_id;darkdungeon_move_object=item->o_id;darkdungeon_move_into=into;
    darkdungeon_trace(QString("Container move: %1 %2").arg(into?"in":"out").arg(item->o_id).toUtf8().constData());
    main->doKeys(QByteArray(1,extended).constData());
    return true;
}

class DollPanel final : public QWidget {
public:
    explicit DollPanel(QWidget* parent) : QWidget(parent) {
        setObjectName("equipmentPanel");setAcceptDrops(true);setMouseTracking(true);
        setFixedSize(5*cell+28,7*cell+40);
    }
    QRect slotRect(int slot) const {return QRect(14+slotInfo[slot].column*cell,30+slotInfo[slot].row*cell,cell-4,cell-4);}
    int slotAt(const QPoint& point) const {for(int s=0;s<SlotCount;++s)if(slotRect(s).contains(point))return s;return -1;}
protected:
    void paintEvent(QPaintEvent*) override {
        QPainter p(this);
        paintFrame(p,rect(),darkdungeon_text("Equipment","装備"));
        // The figure: the hero sprite, or an outline when no sprite exists.
        const QRect figure(14+cell,30,3*cell-4,6*cell-4);
        const QImage hero=darkdungeon_hero_image();
        if(!hero.isNull()) {
            p.setRenderHint(QPainter::SmoothPixmapTransform,false);
            const int size=std::min(figure.width(),figure.height());
            p.drawImage(QRect(figure.center().x()-size/2,figure.center().y()-size/2,size,size),hero);
        } else {
            p.setRenderHint(QPainter::Antialiasing);p.setPen(QPen(QColor("#6b6b73"),2));p.setBrush(QColor("#2b2b31"));
            const QPointF c=figure.center();
            p.drawEllipse(QPointF(c.x(),figure.top()+38),18,20);
            QPainterPath body;body.moveTo(c.x()-34,figure.top()+66);body.lineTo(c.x()+34,figure.top()+66);
            body.lineTo(c.x()+60,figure.top()+170);body.lineTo(c.x()+46,figure.top()+176);body.lineTo(c.x()+24,figure.top()+110);
            body.lineTo(c.x()+22,figure.bottom()-6);body.lineTo(c.x()+4,figure.bottom()-6);body.lineTo(c.x(),figure.top()+190);
            body.lineTo(c.x()-4,figure.bottom()-6);body.lineTo(c.x()-22,figure.bottom()-6);body.lineTo(c.x()-24,figure.top()+110);
            body.lineTo(c.x()-46,figure.top()+176);body.lineTo(c.x()-60,figure.top()+170);body.closeSubpath();
            p.drawPath(body);
        }
        for(int s=0;s<SlotCount;++s) {
            paintSlot(p,slotRect(s),s==highlight);
            if(struct obj* item=slotObject(s))paintItem(p,slotRect(s),item,false);
        }
    }
    bool event(QEvent* e) override {
        if(e->type()==QEvent::ToolTip) {
            auto* help=static_cast<QHelpEvent*>(e);const int s=slotAt(help->pos());
            if(s<0){QToolTip::hideText();e->ignore();return true;}
            QString text=darkdungeon_text(slotInfo[s].english,slotInfo[s].japanese);
            if(struct obj* item=slotObject(s))text+="\n"+itemName(item);
            QToolTip::showText(help->globalPos(),text,this);return true;
        }
        return QWidget::event(e);
    }
    void mousePressEvent(QMouseEvent* e) override {pressSlot=slotAt(e->pos());pressPoint=e->pos();}
    void mouseMoveEvent(QMouseEvent* e) override {
        if(!(e->buttons()&Qt::LeftButton) || pressSlot<0 || (e->pos()-pressPoint).manhattanLength()<QApplication::startDragDistance())return;
        if(struct obj* item=slotObject(pressSlot)){const int slot=pressSlot;pressSlot=-1;startItemDrag(this,item,FromSlot,slot);}
    }
    void dragEnterEvent(QDragEnterEvent* e) override {DragItem d;if(readDrag(e->mimeData(),d) && d.source==FromInventory)e->acceptProposedAction();}
    void dragMoveEvent(QDragMoveEvent* e) override {
        DragItem d;const int s=slotAt(e->position().toPoint());
        struct obj* item=readDrag(e->mimeData(),d) && d.source==FromInventory?carriedById(d.id):nullptr;
        const bool ok=item && s>=0 && !placeKeys(item,s).isEmpty();
        if(highlight!=(ok?s:-1)){highlight=ok?s:-1;update();}
        if(ok)e->acceptProposedAction();else e->ignore();
    }
    void dragLeaveEvent(QDragLeaveEvent*) override {highlight=-1;update();}
    void dropEvent(QDropEvent* e) override {
        highlight=-1;update();
        DragItem d;const int s=slotAt(e->position().toPoint());
        if(!readDrag(e->mimeData(),d) || d.source!=FromInventory || s<0)return;
        if(struct obj* item=carriedById(d.id);item && sendKeys(placeKeys(item,s)))e->acceptProposedAction();
    }
private:
    int pressSlot=-1,highlight=-1;QPoint pressPoint;
};

class InventoryGrid final : public QWidget {
public:
    static constexpr int columns=6;
    explicit InventoryGrid(QWidget* parent) : QWidget(parent) {
        setObjectName("inventoryGrid");setAcceptDrops(true);setMouseTracking(true);refreshSize();
    }
    void refreshSize() {
        const int rows=std::max(7,int((carriedItems().size()+columns-1)/columns));
        setFixedSize(columns*cell+28,rows*cell+40);
    }
    QRect cellRect(int index) const {return QRect(14+(index%columns)*cell,30+(index/columns)*cell,cell-4,cell-4);}
    int indexAt(const QPoint& point) const {
        for(int i=0;i<carriedItems().size();++i)if(cellRect(i).contains(point))return i;
        return -1;
    }
protected:
    void paintEvent(QPaintEvent*) override {
        QPainter p(this);
        paintFrame(p,rect(),darkdungeon_text("Inventory","持ち物"));
        const auto items=carriedItems();
        const int cells=(height()-40)/cell*columns;
        for(int i=0;i<cells;++i) {
            paintSlot(p,cellRect(i),dropHighlight && i==items.size());
            if(i<items.size())paintItem(p,cellRect(i),items[i],true);
        }
    }
    bool event(QEvent* e) override {
        if(e->type()==QEvent::ToolTip) {
            auto* help=static_cast<QHelpEvent*>(e);const int i=indexAt(help->pos());
            if(i<0){QToolTip::hideText();e->ignore();return true;}
            QToolTip::showText(help->globalPos(),itemName(carriedItems()[i]),this);return true;
        }
        return QWidget::event(e);
    }
    void mousePressEvent(QMouseEvent* e) override {pressIndex=indexAt(e->pos());pressPoint=e->pos();}
    void mouseMoveEvent(QMouseEvent* e) override {
        if(!(e->buttons()&Qt::LeftButton) || pressIndex<0 || (e->pos()-pressPoint).manhattanLength()<QApplication::startDragDistance())return;
        const auto items=carriedItems();
        if(pressIndex<items.size()){struct obj* item=items[pressIndex];pressIndex=-1;startItemDrag(this,item,FromInventory);}
    }
    // Accepts equipment being taken off and items taken out of the open container.
    static bool accepts(const DragItem& d) {
        if(d.source==FromSlot)return d.slot>=0 && d.slot<SlotCount && !removeKeys(d.slot).isEmpty();
        if(d.source==FromContainer)return openContainer()!=nullptr;
        return false;
    }
    void dragEnterEvent(QDragEnterEvent* e) override {
        DragItem d;
        if(readDrag(e->mimeData(),d) && accepts(d)){dropHighlight=true;update();e->acceptProposedAction();}
    }
    void dragLeaveEvent(QDragLeaveEvent*) override {dropHighlight=false;update();}
    void dropEvent(QDropEvent* e) override {
        dropHighlight=false;update();
        DragItem d;
        if(!readDrag(e->mimeData(),d) || !accepts(d))return;
        if(d.source==FromSlot ? sendKeys(removeKeys(d.slot)) : sendContainerMove(findInContainer(d.id),false))e->acceptProposedAction();
    }
    static struct obj* findInContainer(unsigned id) {
        for(struct obj* item:containerItems(openContainer()))if(item->o_id==id)return item;
        return nullptr;
    }
private:
    int pressIndex=-1;bool dropHighlight=false;QPoint pressPoint;
};

class ContainerGrid final : public QWidget {
public:
    static constexpr int columns=5;
    explicit ContainerGrid(QWidget* parent) : QWidget(parent) {
        setObjectName("containerGrid");setAcceptDrops(true);setMouseTracking(true);refreshSize();
    }
    void refreshSize() {
        const int rows=std::max(7,int((containerItems(openContainer()).size()+columns-1)/columns));
        setFixedSize(columns*cell+28,rows*cell+40);
    }
    QRect cellRect(int index) const {return QRect(14+(index%columns)*cell,30+(index/columns)*cell,cell-4,cell-4);}
    int indexAt(const QPoint& point) const {
        for(int i=0;i<containerItems(openContainer()).size();++i)if(cellRect(i).contains(point))return i;
        return -1;
    }
protected:
    void paintEvent(QPaintEvent*) override {
        QPainter p(this);
        struct obj* box=openContainer();
        paintFrame(p,rect(),box?QString::fromUtf8(simpleonames(box)):QString());
        const auto items=containerItems(box);
        const int cells=(height()-40)/cell*columns;
        for(int i=0;i<cells;++i) {
            paintSlot(p,cellRect(i),dropHighlight && i==items.size());
            if(i<items.size())paintItem(p,cellRect(i),items[i],false);
        }
    }
    bool event(QEvent* e) override {
        if(e->type()==QEvent::ToolTip) {
            auto* help=static_cast<QHelpEvent*>(e);const int i=indexAt(help->pos());
            if(i<0){QToolTip::hideText();e->ignore();return true;}
            QToolTip::showText(help->globalPos(),itemName(containerItems(openContainer())[i]),this);return true;
        }
        return QWidget::event(e);
    }
    void mousePressEvent(QMouseEvent* e) override {pressIndex=indexAt(e->pos());pressPoint=e->pos();}
    void mouseMoveEvent(QMouseEvent* e) override {
        if(!(e->buttons()&Qt::LeftButton) || pressIndex<0 || (e->pos()-pressPoint).manhattanLength()<QApplication::startDragDistance())return;
        const auto items=containerItems(openContainer());
        if(pressIndex<items.size()){struct obj* item=items[pressIndex];pressIndex=-1;startItemDrag(this,item,FromContainer);}
    }
    // Accepts inventory items that are not the container itself and not in use.
    static struct obj* acceptable(const DragItem& d) {
        if(d.source!=FromInventory)return nullptr;
        struct obj* item=carriedById(d.id);
        return item && item->o_id!=openContainerId && !inUse(item)?item:nullptr;
    }
    void dragEnterEvent(QDragEnterEvent* e) override {
        DragItem d;
        if(readDrag(e->mimeData(),d) && acceptable(d)){dropHighlight=true;update();e->acceptProposedAction();}
    }
    void dragLeaveEvent(QDragLeaveEvent*) override {dropHighlight=false;update();}
    void dropEvent(QDropEvent* e) override {
        dropHighlight=false;update();
        DragItem d;
        if(readDrag(e->mimeData(),d))if(struct obj* item=acceptable(d);item && sendContainerMove(item,true))e->acceptProposedAction();
    }
private:
    int pressIndex=-1;bool dropHighlight=false;QPoint pressPoint;
};

class InventoryWindow final : public QWidget {
public:
    explicit InventoryWindow(QWidget* parent) : QWidget(parent,Qt::Tool) {
        setObjectName("inventoryWindow");
        setWindowTitle(darkdungeon_text("Equipment and inventory","装備と持ち物"));
        setStyleSheet("QWidget#inventoryWindow{background:#0d0d0f;} QScrollArea{background:transparent;border:none;}");
        auto* layout=new QHBoxLayout(this);layout->setContentsMargins(8,8,8,8);layout->setSpacing(10);
        doll=new DollPanel(this);layout->addWidget(doll,0,Qt::AlignTop);
        auto* scroll=new QScrollArea(this);scroll->setWidgetResizable(false);
        scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
        grid=new InventoryGrid(scroll);scroll->setWidget(grid);
        scroll->setFixedWidth(grid->width()+scroll->verticalScrollBar()->sizeHint().width()+4);
        scroll->setMinimumHeight(doll->height());
        layout->addWidget(scroll);
        // The open container, shown only while it is on the hero's square or carried.
        containerScroll=new QScrollArea(this);containerScroll->setObjectName("containerPanel");
        containerScroll->setWidgetResizable(false);containerScroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
        container=new ContainerGrid(containerScroll);containerScroll->setWidget(container);
        containerScroll->setFixedWidth(container->width()+containerScroll->verticalScrollBar()->sizeHint().width()+4);
        containerScroll->setMinimumHeight(doll->height());
        layout->addWidget(containerScroll);
        containerScroll->setVisible(openContainer()!=nullptr);
        // Core notifications and input-wait entries request refreshes. A hidden
        // window must not poll live objects or sample glyphs on a UI timer.
    }
    void refresh() {
        ++refreshCount;
        const bool showContainer=openContainer()!=nullptr;
        if(!showContainer)openContainerId=0; // walked away or the container is gone
        if(containerScroll->isHidden()==showContainer){containerScroll->setVisible(showContainer);adjustSize();}
        grid->refreshSize();container->refreshSize();doll->update();grid->update();container->update();
    }
    DollPanel* doll=nullptr;InventoryGrid* grid=nullptr;ContainerGrid* container=nullptr;QScrollArea* containerScroll=nullptr;
    quint64 refreshCount=0; // UI-only scheduling diagnostic, not a core observer
};
QPointer<InventoryWindow> inventoryWindow;
bool containerWindowInSmoke=false; // automated runs keep NetHack's container menus
}

void darkdungeon_refresh_inventory_view() {
    // An input-wait entry can also be a nested prompt. This is a view refresh
    // request, never a command-ready marker or an additional core dispatch.
    if(inventoryWindow && program_state.in_moveloop && !program_state.gameover)
        inventoryWindow->refresh();
}

void darkdungeon_show_inventory() {
    QWidget* main=nethack_qt_::NetHackQtBind::mainWidget();
    if(!main || !u.ux)return;
    if(!inventoryWindow)inventoryWindow=new InventoryWindow(main);
    inventoryWindow->grid->refreshSize();inventoryWindow->refresh();
    inventoryWindow->show();inventoryWindow->raise();inventoryWindow->activateWindow();
}

// Called by use_container() after its lock and trap checks: show the contents
// beside the inventory instead of NetHack's take-out/put-in menus.
extern "C" int darkdungeon_container_window(struct obj* box) {
    if(!box || !nethack_qt_::NetHackQtBind::mainWidget())return 0;
    if(!qEnvironmentVariable("DARKDUNGEON_SMOKE_OUTPUT").isEmpty() && !containerWindowInSmoke)return 0;
    openContainerId=box->o_id;
    darkdungeon_show_inventory();
    return 1;
}

// Automated check: window contents and the command keys for drags.
bool darkdungeon_inventory_smoke(const QString& output) {
    const auto fail=[&](int line) {
        QFile log(output+"/inventory-smoke-failure.txt");
        if(log.open(QIODevice::WriteOnly|QIODevice::Text)) {
            QTextStream stream(&log);
            stream << "line=" << line << " in_moveloop=" << int(program_state.in_moveloop)
                   << " gameover=" << int(program_state.gameover)
                   << " suppress_map_output=" << int(suppress_map_output())
                   << " refresh_count=" << (inventoryWindow?inventoryWindow->refreshCount:0) << '\n';
        }
        return false;
    };
    darkdungeon_show_inventory();QCoreApplication::processEvents();
    if(!inventoryWindow || !inventoryWindow->isVisible())return fail(__LINE__);
    const int items=int(carriedItems().size());
    if(!items || inventoryWindow->grid->indexAt(inventoryWindow->grid->cellRect(items-1).center())!=items-1)return fail(__LINE__);
    if(inventoryWindow->doll->slotAt(inventoryWindow->doll->slotRect(SlotWeapon).center())!=SlotWeapon)return fail(__LINE__);
    // Taking off body armor names the item only when NetHack will ask for it.
    if(uarm) {
        const QByteArray expected=wornArmorPieces()!=1 || ParanoidRemove?key(dotakeoff)+QByteArray(1,uarm->invlet):key(dotakeoff);
        if(removeKeys(SlotSuit)!=expected)return fail(__LINE__);
    }
    if(uwep && placeKeys(uwep,SlotSwap)!=key(doswapweapon))return fail(__LINE__);
    if(uwep && !placeKeys(uwep,SlotHelmet).isEmpty())return fail(__LINE__); // a weapon is not a helmet
    if(uwep && removeKeys(SlotWeapon)!=key(dowield)+"-")return fail(__LINE__);
    inventoryWindow->grab().save(output+"/inventory-window.png");
    inventoryWindow->close();QCoreApplication::processEvents();
    const quint64 closedRefreshCount=inventoryWindow->refreshCount;
    // Earlier synthetic key tests call qApp->exit(). A nested exec() can
    // therefore return immediately. Pump events for measured elapsed time.
    QElapsedTimer closedWait;closedWait.start();
    while(closedWait.elapsed()<550) {
        QCoreApplication::processEvents(QEventLoop::AllEvents,10);
        QThread::msleep(1);
    }
    if(inventoryWindow->refreshCount!=closedRefreshCount)return fail(__LINE__);
    update_inventory();
    if(inventoryWindow->refreshCount!=closedRefreshCount+1)return fail(__LINE__);

    // Container: a chest on the hero's square opens beside the inventory, and one
    // carried stack moves in and back out through darkdungeon_container_move().
    struct obj* chest=mksobj_at(LARGE_BOX,u.ux,u.uy,FALSE,FALSE);
    struct obj* moved=nullptr;
    for(struct obj* item=gi.invent;item && !moved;item=item->nobj)if(!inUse(item) && !Is_container(item))moved=item;
    if(!chest || !moved)return fail(__LINE__);
    const unsigned movedId=moved->o_id;const long movedCount=moved->quan;const int movedType=moved->otyp;
    containerWindowInSmoke=true;
    const int shown=darkdungeon_container_window(chest);
    containerWindowInSmoke=false;
    QCoreApplication::processEvents();
    if(!shown || !inventoryWindow || !inventoryWindow->containerScroll->isVisible() || openContainer()!=chest)return fail(__LINE__);
    darkdungeon_move_container=chest->o_id;darkdungeon_move_object=movedId;darkdungeon_move_into=1;
    if(darkdungeon_container_move()!=ECMD_TIME || carriedById(movedId) || containerItems(chest).size()!=1)return fail(__LINE__);
    QCoreApplication::processEvents();
    inventoryWindow->grab().save(output+"/container-window.png");
    darkdungeon_move_object=chest->cobj->o_id;darkdungeon_move_into=0;
    if(darkdungeon_container_move()!=ECMD_TIME || !containerItems(chest).isEmpty())return fail(__LINE__);
    struct obj* back=nullptr;
    for(struct obj* item=gi.invent;item;item=item->nobj)if(item->otyp==movedType && item->quan>=movedCount)back=item;
    if(!back)return fail(__LINE__);
    // A closed parent must not hide a stale, explicitly enabled child panel.
    inventoryWindow->close();QCoreApplication::processEvents();
    obj_extract_self(chest);obfree(chest,nullptr);newsym(u.ux,u.uy);
    update_inventory();
    if(!inventoryWindow->containerScroll->isHidden())return fail(__LINE__);
    darkdungeon_show_inventory();QCoreApplication::processEvents();
    if(inventoryWindow->containerScroll->isVisible())return fail(__LINE__);
    inventoryWindow->close();QCoreApplication::processEvents();
    return true;
}
