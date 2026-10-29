// DarkDungeon additions, 2026-10-10. NetHack-derived application: see dat/license.
// Equipment and inventory window: a figure with equipment slots and a grid of
// carried items. Dragging an item sends the normal NetHack command keys for it,
// so turns, curses, messages and other rules are unchanged.
extern "C" {
#include "hack.h"
#include "func_tab.h"
#include "context_action.h"
#include "isaac64.h"
extern glyph_map glyphmap[MAX_GLYPH];
void darkdungeon_copy_rng(int which, isaac64_ctx* out); // rnd.c, read-only
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
#include "qt_inv.h"
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
QImage glyphImage(int glyph,int tileidx) {
    QImage image=nethack_qt_::qt_settings->glyphs().glyph(glyph,tileidx).toImage()
        .convertToFormat(QImage::Format_ARGB32);
    // The bundled tiles reserve this color for the background.
    for(int y=0;y<image.height();++y) {
        auto* row=reinterpret_cast<QRgb*>(image.scanLine(y));
        for(int x=0;x<image.width();++x)if((row[x]&0x00ffffff)==(qRgb(71,108,108)&0x00ffffff))row[x]=0;
    }
    return image;
}

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

// Public inventory snapshot (R6). It is prepared only at core points, the
// update_inventory notification and input-wait entries, whether or not a window
// is open. Paint, tooltips and drags read this copy: they never call
// doname/obj_to_glyph or follow live object pointers, so repainting, opening,
// closing and dragging cannot advance the CORE or DISP random number streams.
struct GlyphKey {
    unsigned id=0;int otyp=-1,corpsenm=-1,gender=0;bool dknown=false,hallucinating=false;
    bool operator==(const GlyphKey& o) const {
        return id==o.id && otyp==o.otyp && corpsenm==o.corpsenm && gender==o.gender
            && dknown==o.dknown && hallucinating==o.hallucinating;
    }
};
struct PublicItem {
    unsigned id=0;char invlet=0;long quantity=0;bool inUse=false,bknown=false;
    GlyphKey key;int glyph=NO_GLYPH,tileidx=0;QString name;
    QByteArray placeKeys[SlotCount]; // command keys for dropping on each slot
};
struct DollCell {unsigned id=0;int glyph=NO_GLYPH,tileidx=0,border=nethack_qt_::NO_BORDER;bool reverse=false;QByteArray tip;};
struct PublicInventory {
    bool prepared=false;quint64 generation=0;
    QList<PublicItem> carried;
    int slotItem[SlotCount]; // index into carried, -1 when the slot is empty
    QByteArray removeKeys[SlotCount];
    unsigned containerId=0;QString containerTitle;QList<PublicItem> contents;
    QImage portrait; // the hero figure, empty while polymorphed
    char extendedKey=0; // key of the extended-command prompt, for container moves
    bool namesPending=false; // an object without a name, waiting for a safe point
    DollCell doll[3][6]; // the standard Qt paper doll, indexed [column][row]
    PublicInventory() {std::fill(std::begin(slotItem),std::end(slotItem),-1);}
};
PublicInventory shown;
const PublicItem* slotEntry(int slot) {
    const int index=slot>=0 && slot<SlotCount?shown.slotItem[slot]:-1;
    return index>=0 && index<shown.carried.size()?&shown.carried[index]:nullptr;
}
const PublicItem* entryById(const QList<PublicItem>& items,unsigned id) {
    for(const auto& entry:items)if(entry.id==id)return &entry;
    return nullptr;
}
QImage itemImage(const PublicItem& entry) {return glyphImage(entry.glyph,entry.tileidx);}

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
void paintItem(QPainter& p,const QRect& r,const PublicItem& item,bool showLetter) {
    p.setRenderHint(QPainter::SmoothPixmapTransform,false);
    p.drawImage(r.adjusted(5,5,-5,-5),itemImage(item));
    QFont font=p.font();font.setPointSize(8);font.setBold(true);p.setFont(font);
    if(item.quantity>1){p.setPen(Qt::black);p.drawText(r.adjusted(0,0,-3,-1),Qt::AlignRight|Qt::AlignBottom,QString::number(item.quantity));
        p.setPen(QColor("#f2f2f2"));p.drawText(r.adjusted(0,0,-4,-2),Qt::AlignRight|Qt::AlignBottom,QString::number(item.quantity));}
    if(showLetter){p.setPen(QColor("#c9b27a"));p.drawText(r.adjusted(4,2,0,0),Qt::AlignLeft|Qt::AlignTop,QString(QChar(item.invlet)));}
    if(item.inUse) { // gold corner for equipped items
        p.setPen(Qt::NoPen);p.setBrush(QColor("#f0c25c"));
        p.drawPolygon(QPolygon{r.topRight()+QPoint(-12,1),r.topRight()+QPoint(0,1),r.topRight()+QPoint(0,13)});
    }
}
// A drag names where the item comes from: the inventory grid (by object id),
// an equipment slot, or the open container (by object id).
enum DragSource { FromInventory,FromSlot,FromContainer };
struct DragItem { DragSource source=FromInventory; unsigned id=0; int slot=-1; };
QPixmap dragPixmap(const PublicItem& item) {return QPixmap::fromImage(itemImage(item)).scaled(40,40);}
void startItemDrag(QWidget* widget,const PublicItem& item,DragSource source,int slot=-1) {
    auto* data=new QMimeData;
    data->setData(itemMime,QByteArray::number(int(source))+":"+QByteArray::number(item.id)+":"+QByteArray::number(slot));
    auto* drag=new QDrag(widget);drag->setMimeData(data);
    drag->setPixmap(dragPixmap(item));
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
// extended-command path the toolbar uses, so they take a normal turn. The
// command itself checks the live container and object again.
bool sendContainerMove(const PublicItem* item,bool into) {
    auto* main=qobject_cast<nethack_qt_::NetHackQtMainWindow*>(nethack_qt_::NetHackQtBind::mainWidget());
    const char extended=shown.extendedKey;
    if(!shown.containerId || !item || !main || !extended || program_state.input_state!=commandInp || nethack_qt_::NetHackQtBind::qt_kbhit()
            || !darkdungeon_request_toolbar_command(darkdungeon_container_move)) {
        nethack_qt_::NetHackQtBind::qt_nhbell();return false;
    }
    darkdungeon_move_container=shown.containerId;darkdungeon_move_object=item->id;darkdungeon_move_into=into;
    darkdungeon_trace(QString("Container move: %1 %2").arg(into?"in":"out").arg(item->id).toUtf8().constData());
    main->doKeys(QByteArray(1,extended).constData());
    return true;
}

// Snapshot preparation. Names are generated only when `names` is set: at the
// core's update_inventory notification, or at an input-wait entry for a normal
// command. Any other input-wait entry can be inside a prompt whose caller still
// holds xname() buffers. A glyph is sampled again only when its inputs changed,
// so hallucination draws from DISP once per change, not per paint.
//
// Naming must not observe the object: xname() would set dknown and the
// discoveries (observe_object), a cleric's bknown and a unique item's known.
// distantname suppresses the observation, and bknown/known are put back, so
// the window shows what the core already knows without changing it.
int resampledGlyphs=0; // per build, for the trace
template<class Format> QByteArray publicName(struct obj* item,Format format) {
    const unsigned bknown=item->bknown,known=item->known;
    ++gd.distantname;
    const QByteArray name(format());
    --gd.distantname;
    item->bknown=bknown;item->known=known;
    return name;
}
void sampleItem(PublicItem& entry,struct obj* item,const QList<PublicItem>& previous,bool names,bool& complete) {
    entry.id=item->o_id;entry.invlet=item->invlet;entry.quantity=item->quan;entry.inUse=inUse(item);
    GlyphKey key;key.id=item->o_id;key.otyp=item->otyp;key.dknown=item->dknown;key.hallucinating=!!Hallucination;
    if(item->otyp==CORPSE || item->otyp==STATUE)key.corpsenm=item->corpsenm;
    if(item->otyp==STATUE)key.gender=item->spe & CORPSTAT_GENDER;
    const PublicItem* old=entryById(previous,item->o_id);
    if(old && old->key==key){entry.glyph=old->glyph;entry.tileidx=old->tileidx;}
    else {entry.glyph=obj_to_glyph(item,rn2_on_display_rng);entry.tileidx=::glyphmap[entry.glyph].tileidx;++resampledGlyphs;}
    entry.key=key;
    if(names)entry.name=QString::fromUtf8(publicName(item,[item]{return doname(item);}));
    // A name is reused only while what it describes is unchanged; observing an
    // object (dknown) does not notify update_inventory().
    else if(old && old->key==key && old->quantity==entry.quantity && old->invlet==entry.invlet
            && old->inUse==entry.inUse && old->bknown==bool(item->bknown))entry.name=old->name;
    else complete=false;
    entry.bknown=item->bknown;
}
enum { DollNoFlag=0,DollUnused=1,DollReverse=2 };
// From NetHack 5.0 qt_inv.cpp: a leash in use, or any lit light source.
struct obj* findTool(int tooltyp) {
    struct obj* o;
    for(o=gi.invent;o;o=o->nobj)
        if((tooltyp==LEASH && o->otyp==LEASH && o->leashmon) || (tooltyp==OIL_LAMP && o->lamplit))break;
    return o;
}
void sampleDollCell(PublicInventory& next,const PublicInventory& previous,int x,int y,
                    struct obj* item,const char* alttip,int flags,bool names,bool& complete) {
    DollCell& cell=next.doll[x][y];
    cell.reverse=flags==DollReverse;
    if(item) {
        const PublicItem* carried=entryById(next.carried,item->o_id);
        cell.id=item->o_id;
        cell.glyph=carried?carried->glyph:obj_to_glyph(item,rn2_on_display_rng);
        cell.border=!item->bknown?nethack_qt_::BORDER_DEFAULT:item->cursed?nethack_qt_::BORDER_CURSED
            :!item->blessed?nethack_qt_::BORDER_UNCURSED:nethack_qt_::BORDER_BLESSED;
        if(names) {
            // Upstream shows the BUC state by the border, so the tip matches it.
            const boolean implicit=::flags.implicit_uncursed;
            ::flags.implicit_uncursed=FALSE;
            cell.tip=QByteArray(" ")+publicName(item,[item]{return xprname(item,nullptr,item->invlet,FALSE,0L,0L);})+" ";
            ::flags.implicit_uncursed=implicit;
        } else {
            // Reuse the tip only while the item's own name was reusable too.
            const PublicItem* before=entryById(previous.carried,item->o_id);
            if(previous.doll[x][y].id==item->o_id && carried && before && carried->name==before->name && !carried->name.isEmpty())
                cell.tip=previous.doll[x][y].tip;
            else complete=false;
        }
    } else {
        cell.glyph=flags!=DollUnused?fn_cmap_to_glyph(S_room):GLYPH_UNEXPLORED;
        if(alttip)cell.tip=QByteArray(" ")+alttip+" ";
    }
    glyph_info info;
    map_glyphinfo(0,0,cell.glyph,0,&info);
    cell.tileidx=info.gm.tileidx;
}
// The paper doll layout of NetHack 5.0's Qt interface (qt_inv.cpp paintEvent).
void sampleDoll(PublicInventory& next,const PublicInventory& previous,bool names,bool& complete) {
    auto cell=[&](int x,int y,struct obj* item,const char* alttip,int flags=DollNoFlag) {
        sampleDollCell(next,previous,x,y,item,alttip,flags,names,complete);
    };
    cell(0,0,uquiver,"nothing readied for firing");
    cell(0,1,uwep,"no weapon");
    if(!u.twoweap)cell(0,2,uswapwep,"no alternate weapon");
    else cell(0,2,nullptr,"secondary weapon is wielded");
    cell(0,3,uright,"no right ring");
    cell(0,4,findTool(OIL_LAMP),"no active light sources");
    cell(0,5,nullptr,nullptr,DollUnused);
    cell(1,0,uarmh,"no helmet");
    cell(1,1,uamul,"no amulet");
    cell(1,2,uarmc,"no cloak");
    cell(1,3,uarm,"no suit");
    cell(1,4,uarmu,"no shirt");
    cell(1,5,uarmf,"no boots");
    cell(2,0,ublindf,"no eyewear");
    if(u.twoweap)cell(2,1,uswapwep,nullptr);
    else if(uwep && bimanual(uwep))cell(2,1,uwep,nullptr,DollReverse);
    else cell(2,1,uarms,"no shield");
    cell(2,2,uarmg,"no gloves");
    cell(2,3,uleft,"no left ring");
    cell(2,4,findTool(LEASH),"no leashes in use");
    cell(2,5,nullptr,nullptr,DollUnused);
}
PublicInventory buildPublicInventory(const PublicInventory& previous,bool names,bool& complete) {
    PublicInventory next;
    complete=true;
    for(struct obj* item:carriedItems()) {
        PublicItem entry;sampleItem(entry,item,previous.carried,names,complete);
        for(int s=0;s<SlotCount;++s)entry.placeKeys[s]=placeKeys(item,s);
        next.carried.append(entry);
    }
    for(int s=0;s<SlotCount;++s) {
        if(struct obj* item=slotObject(s))
            for(int i=0;i<next.carried.size();++i)if(next.carried[i].id==item->o_id)next.slotItem[s]=i;
        next.removeKeys[s]=removeKeys(s);
    }
    if(struct obj* box=openContainer()) {
        next.containerId=box->o_id;
        if(names)next.containerTitle=QString::fromUtf8(publicName(box,[box]{return simpleonames(box);}));
        else if(previous.containerId==box->o_id)next.containerTitle=previous.containerTitle;
        else complete=false;
        for(struct obj* item:containerItems(box)){PublicItem entry;sampleItem(entry,item,previous.contents,names,complete);next.contents.append(entry);}
    } else openContainerId=0; // walked away or the container is gone
    next.portrait=darkdungeon_hero_image();
    next.extendedKey=cmd_from_func(doextcmd);
    sampleDoll(next,previous,names,complete);
    next.prepared=true;next.generation=shown.generation+1;next.namesPending=!complete;
    return next;
}
void preparePublicInventory(bool notified) {
    // Names are safe at the notification and before a normal command is read
    // (cmd.c sets commandInp); other input waits may be inside a prompt.
    const bool namesSafe=notified || program_state.input_state==commandInp;
    resampledGlyphs=0;
    bool complete=true;
    PublicInventory next=buildPublicInventory(shown,namesSafe && (notified || !shown.prepared || shown.namesPending),complete);
    if(!complete && namesSafe) {
        // NetHack calls update_inventory() whenever carried objects change. A
        // list changed without it is named here, reusing the glyphs just
        // sampled so DISP is not drawn twice.
        darkdungeon_trace("Inventory snapshot: objects changed without update_inventory; names regenerated");
        next=buildPublicInventory(next,true,complete);
    } else if(!complete)
        darkdungeon_trace("Inventory snapshot: names deferred to the next safe point");
    if(notified || resampledGlyphs || next.namesPending!=shown.namesPending)
        darkdungeon_trace(QString("Inventory snapshot %1: %2, glyphs sampled=%3, names pending=%4")
            .arg(next.generation).arg(notified?"notification":"input wait").arg(resampledGlyphs)
            .arg(next.namesPending?"yes":"no").toUtf8().constData());
    shown=std::move(next);
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
        const QImage& hero=shown.portrait;
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
            if(const PublicItem* item=slotEntry(s))paintItem(p,slotRect(s),*item,false);
        }
    }
    bool event(QEvent* e) override {
        if(e->type()==QEvent::ToolTip) {
            auto* help=static_cast<QHelpEvent*>(e);const int s=slotAt(help->pos());
            if(s<0){QToolTip::hideText();e->ignore();return true;}
            QString text=darkdungeon_text(slotInfo[s].english,slotInfo[s].japanese);
            if(const PublicItem* item=slotEntry(s))text+="\n"+item->name;
            QToolTip::showText(help->globalPos(),text,this);return true;
        }
        return QWidget::event(e);
    }
    void mousePressEvent(QMouseEvent* e) override {pressSlot=slotAt(e->pos());pressPoint=e->pos();}
    void mouseMoveEvent(QMouseEvent* e) override {
        if(!(e->buttons()&Qt::LeftButton) || pressSlot<0 || (e->pos()-pressPoint).manhattanLength()<QApplication::startDragDistance())return;
        if(const PublicItem* item=slotEntry(pressSlot)){const int slot=pressSlot;pressSlot=-1;startItemDrag(this,*item,FromSlot,slot);}
    }
    void dragEnterEvent(QDragEnterEvent* e) override {DragItem d;if(readDrag(e->mimeData(),d) && d.source==FromInventory)e->acceptProposedAction();}
    static QByteArray dropKeys(const DragItem& d,int slot) {
        const PublicItem* item=d.source==FromInventory?entryById(shown.carried,d.id):nullptr;
        return item && slot>=0 && slot<SlotCount?item->placeKeys[slot]:QByteArray();
    }
    void dragMoveEvent(QDragMoveEvent* e) override {
        DragItem d;const int s=slotAt(e->position().toPoint());
        const bool ok=readDrag(e->mimeData(),d) && !dropKeys(d,s).isEmpty();
        if(highlight!=(ok?s:-1)){highlight=ok?s:-1;update();}
        if(ok)e->acceptProposedAction();else e->ignore();
    }
    void dragLeaveEvent(QDragLeaveEvent*) override {highlight=-1;update();}
    void dropEvent(QDropEvent* e) override {
        highlight=-1;update();
        DragItem d;const int s=slotAt(e->position().toPoint());
        if(!readDrag(e->mimeData(),d) || dropKeys(d,s).isEmpty())return;
        if(sendKeys(dropKeys(d,s)))e->acceptProposedAction();
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
        const int rows=std::max(7,int((shown.carried.size()+columns-1)/columns));
        setFixedSize(columns*cell+28,rows*cell+40);
    }
    QRect cellRect(int index) const {return QRect(14+(index%columns)*cell,30+(index/columns)*cell,cell-4,cell-4);}
    int indexAt(const QPoint& point) const {
        for(int i=0;i<shown.carried.size();++i)if(cellRect(i).contains(point))return i;
        return -1;
    }
protected:
    void paintEvent(QPaintEvent*) override {
        QPainter p(this);
        paintFrame(p,rect(),darkdungeon_text("Inventory","持ち物"));
        const auto& items=shown.carried;
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
            QToolTip::showText(help->globalPos(),shown.carried[i].name,this);return true;
        }
        return QWidget::event(e);
    }
    void mousePressEvent(QMouseEvent* e) override {pressIndex=indexAt(e->pos());pressPoint=e->pos();}
    void mouseMoveEvent(QMouseEvent* e) override {
        if(!(e->buttons()&Qt::LeftButton) || pressIndex<0 || (e->pos()-pressPoint).manhattanLength()<QApplication::startDragDistance())return;
        if(pressIndex<shown.carried.size()){const PublicItem item=shown.carried[pressIndex];pressIndex=-1;startItemDrag(this,item,FromInventory);}
    }
    // Accepts equipment being taken off and items taken out of the open container.
    static bool accepts(const DragItem& d) {
        if(d.source==FromSlot)return d.slot>=0 && d.slot<SlotCount && !shown.removeKeys[d.slot].isEmpty();
        if(d.source==FromContainer)return shown.containerId!=0;
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
        if(d.source==FromSlot ? sendKeys(shown.removeKeys[d.slot]) : sendContainerMove(entryById(shown.contents,d.id),false))e->acceptProposedAction();
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
        const int rows=std::max(7,int((shown.contents.size()+columns-1)/columns));
        setFixedSize(columns*cell+28,rows*cell+40);
    }
    QRect cellRect(int index) const {return QRect(14+(index%columns)*cell,30+(index/columns)*cell,cell-4,cell-4);}
    int indexAt(const QPoint& point) const {
        for(int i=0;i<shown.contents.size();++i)if(cellRect(i).contains(point))return i;
        return -1;
    }
protected:
    void paintEvent(QPaintEvent*) override {
        QPainter p(this);
        paintFrame(p,rect(),shown.containerId?shown.containerTitle:QString());
        const auto& items=shown.contents;
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
            QToolTip::showText(help->globalPos(),shown.contents[i].name,this);return true;
        }
        return QWidget::event(e);
    }
    void mousePressEvent(QMouseEvent* e) override {pressIndex=indexAt(e->pos());pressPoint=e->pos();}
    void mouseMoveEvent(QMouseEvent* e) override {
        if(!(e->buttons()&Qt::LeftButton) || pressIndex<0 || (e->pos()-pressPoint).manhattanLength()<QApplication::startDragDistance())return;
        if(pressIndex<shown.contents.size()){const PublicItem item=shown.contents[pressIndex];pressIndex=-1;startItemDrag(this,item,FromContainer);}
    }
    // Accepts inventory items that are not the container itself and not in use.
    static const PublicItem* acceptable(const DragItem& d) {
        if(d.source!=FromInventory || !shown.containerId)return nullptr;
        const PublicItem* item=entryById(shown.carried,d.id);
        return item && item->id!=shown.containerId && !item->inUse?item:nullptr;
    }
    void dragEnterEvent(QDragEnterEvent* e) override {
        DragItem d;
        if(readDrag(e->mimeData(),d) && acceptable(d)){dropHighlight=true;update();e->acceptProposedAction();}
    }
    void dragLeaveEvent(QDragLeaveEvent*) override {dropHighlight=false;update();}
    void dropEvent(QDropEvent* e) override {
        dropHighlight=false;update();
        DragItem d;
        if(readDrag(e->mimeData(),d))if(const PublicItem* item=acceptable(d);item && sendContainerMove(item,true))e->acceptProposedAction();
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
        containerScroll->setVisible(shown.containerId!=0);
        // Core notifications and input-wait entries request refreshes. A hidden
        // window must not poll live objects or sample glyphs on a UI timer.
    }
    void refresh() {
        ++refreshCount;
        const bool showContainer=shown.containerId!=0;
        if(containerScroll->isHidden()==showContainer){containerScroll->setVisible(showContainer);adjustSize();}
        grid->refreshSize();container->refreshSize();doll->update();grid->update();container->update();
    }
    DollPanel* doll=nullptr;InventoryGrid* grid=nullptr;ContainerGrid* container=nullptr;QScrollArea* containerScroll=nullptr;
    quint64 refreshCount=0; // UI-only scheduling diagnostic, not a core observer
};
QPointer<InventoryWindow> inventoryWindow;
bool containerWindowInSmoke=false; // automated runs keep NetHack's container menus
}

namespace {
// The upstream paper doll has no Q_OBJECT, so findChildren<T>() cannot be used.
QList<QWidget*> paperDolls(QWidget* main) {
    QList<QWidget*> dolls;
    for(auto* widget:main->findChildren<QWidget*>())
        if(dynamic_cast<nethack_qt_::NetHackQtInvUsageWindow*>(widget))dolls.append(widget);
    return dolls;
}
void refreshInventoryView(bool notified) {
    if(!program_state.in_moveloop || program_state.gameover)return;
    // update_inventory() is not delivered while map output is suppressed
    // (saving, restoring, level change); input-wait entries follow it.
    if(suppress_map_output())return;
    // The snapshot is prepared whether or not a window is open, so opening or
    // closing a window cannot change when DISP is drawn.
    preparePublicInventory(notified);
    if(inventoryWindow)inventoryWindow->refresh();
    if(QWidget* main=nethack_qt_::NetHackQtBind::mainWidget())
        for(auto* doll:paperDolls(main))doll->update();
}
}

void darkdungeon_refresh_inventory_view() {
    // An input-wait entry can also be a nested prompt. This is a view refresh
    // request, never a command-ready marker or an additional core dispatch.
    refreshInventoryView(false);
}

void darkdungeon_inventory_notified() {refreshInventoryView(true);}

// The standard Qt paper doll (qt_inv.cpp) paints and explains these copies.
void darkdungeon_paint_doll_cell(QPainter& painter,int x,int y) {
    if(x<0 || x>2 || y<0 || y>5 || !shown.prepared)return; // nothing prepared yet
    const DollCell& cell=shown.doll[x][y];
    nethack_qt_::qt_settings->glyphs().drawBorderedCell(painter,cell.glyph,cell.tileidx,x,y,cell.border,cell.reverse);
}
const char* darkdungeon_doll_tip(int x,int y) {
    if(x<0 || x>2 || y<0 || y>5 || shown.doll[x][y].tip.isEmpty())return nullptr;
    return shown.doll[x][y].tip.constData();
}

void darkdungeon_show_inventory() {
    QWidget* main=nethack_qt_::NetHackQtBind::mainWidget();
    if(!main || !u.ux)return;
    if(!shown.prepared)return; // nothing has been prepared at a core point yet
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
    // The window replaces NetHack's "look inside" (container_contents), which
    // observes each object while listing it. Do the same here, at the core
    // point, so that drawing the window never has to.
    // xname() also gives a cleric the BUC state, bypassing update_inventory().
    if(!Blind)for(struct obj* item=box->cobj;item;item=item->nobj) {
        observe_object(item);
        if(Role_if(PM_CLERIC))item->bknown=1;
    }
    refreshInventoryView(true); // use_container() is the core point that opens it
    darkdungeon_show_inventory();
    return 1;
}

namespace {
// Assisted R6 check (#132): the parts of the state that the old paint path read
// or changed. This is not the full protected projection of the R6 contract.
struct PaintState {
    isaac64_ctx core{},disp{};QByteArray objects,knowledge;boolean implicitUncursed=FALSE;long moves=0;int lastInvnr=0;
};
bool sameRng(const isaac64_ctx& a,const isaac64_ctx& b) {
    return a.n==b.n && a.a==b.a && a.b==b.b && a.c==b.c
        && std::equal(a.r,a.r+ISAAC64_SZ,b.r) && std::equal(a.m,a.m+ISAAC64_SZ,b.m);
}
void writeObjects(QDataStream& stream,struct obj* item) {
    for(;item;item=item->nobj) {
        stream << item->o_id << qint32(item->invlet) << qint64(item->quan) << qint64(item->owornmask) << qint32(item->otyp)
               << qint32(item->spe) << qint32(item->dknown) << qint32(item->bknown) << qint32(item->known)
               << qint32(item->rknown) << qint32(item->cknown) << qint32(item->lknown)
               << qint32(item->blessed) << qint32(item->cursed);
        writeObjects(stream,item->cobj);
    }
}
PaintState paintState() {
    PaintState state;
    darkdungeon_copy_rng(0,&state.core);darkdungeon_copy_rng(1,&state.disp);
    QDataStream stream(&state.objects,QIODevice::WriteOnly);
    writeObjects(stream,gi.invent);
    if(isok(u.ux,u.uy))for(struct obj* item=svl.level.objects[u.ux][u.uy];item;item=item->nexthere) {
        stream << item->o_id;writeObjects(stream,item->cobj);
    }
    // Observation would mark the class encountered and order the discoveries.
    QDataStream knowledge(&state.knowledge,QIODevice::WriteOnly);
    for(int i=0;i<NUM_OBJECTS;++i)knowledge << qint32(objects[i].oc_encountered) << qint32(svd.disco[i]);
    state.implicitUncursed=::flags.implicit_uncursed;state.moves=svm.moves;state.lastInvnr=gl.lastinvnr;
    return state;
}
QString compareState(const PaintState& before,const PaintState& after) {
    QStringList differences;
    if(!sameRng(before.core,after.core))differences << "CORE";
    if(!sameRng(before.disp,after.disp))differences << "DISP";
    if(before.objects!=after.objects)differences << "objects";
    if(before.knowledge!=after.knowledge)differences << "knowledge";
    if(before.implicitUncursed!=after.implicitUncursed)differences << "implicit_uncursed";
    if(before.moves!=after.moves)differences << "moves";
    if(before.lastInvnr!=after.lastInvnr)differences << "lastinvnr";
    return differences.isEmpty()?QString("none"):differences.join(',');
}
void showTip(QWidget* widget,const QPoint& point) {
    QHelpEvent help(QEvent::ToolTip,point,widget->mapToGlobal(point));
    QCoreApplication::sendEvent(widget,&help);QToolTip::hideText();
}
// UI only: windows, paint, tooltips, drag images and the paper doll.
bool exerciseViews(QTextStream& log,int& dolls) {
    auto* settings=nethack_qt_::qt_settings;
    for(int pass=0;pass<2;++pass) {
        darkdungeon_show_inventory();QCoreApplication::processEvents();
        if(!inventoryWindow || !inventoryWindow->isVisible()){log << "window did not open\n";return false;}
        if(!inventoryWindow->containerScroll->isVisible()){log << "container panel is not shown\n";return false;}
        inventoryWindow->grab();
        for(int i=0;i<shown.carried.size();++i)showTip(inventoryWindow->grid,inventoryWindow->grid->cellRect(i).center());
        for(int i=0;i<shown.contents.size();++i)showTip(inventoryWindow->container,inventoryWindow->container->cellRect(i).center());
        for(int s=0;s<SlotCount;++s)showTip(inventoryWindow->doll,inventoryWindow->doll->slotRect(s).center());
        for(const auto& item:shown.carried)(void)dragPixmap(item);
        for(const auto& item:shown.contents)(void)dragPixmap(item);
        inventoryWindow->resize(inventoryWindow->size()+QSize(40,40));QCoreApplication::processEvents();
        inventoryWindow->close();QCoreApplication::processEvents();
    }
    dolls=0;
    for(auto* doll:paperDolls(nethack_qt_::NetHackQtBind::mainWidget())) {
        ++dolls;doll->repaint();doll->grab();
        for(int x=0;x<3;++x)for(int y=0;y<6;++y)
            showTip(doll,QPoint(1+x*(settings->dollWidth+2)+settings->dollWidth/2,1+y*(settings->dollHeight+2)+settings->dollHeight/2));
    }
    QElapsedTimer wait;wait.start();
    while(wait.elapsed()<300){QCoreApplication::processEvents(QEventLoop::AllEvents,10);QThread::msleep(1);}
    return true;
}
bool paintInvarianceSmoke(const QString& output) {
    const QString phase=qEnvironmentVariable("DARKDUNGEON_SMOKE_PHASE","run");
    QFile file(output+"/inventory-invariance-"+phase+".txt");
    if(!file.open(QIODevice::WriteOnly|QIODevice::Text))return false;
    QTextStream log(&file);
    if(shown.carried.isEmpty()){log << "carried items=0\n";return false;}
    auto* settings=nethack_qt_::qt_settings;
    struct obj* potion=nullptr;struct obj* chest=nullptr;
    // Every exit, also an early failure, puts the game and settings back.
    struct Restore {
        std::function<void()> undo;
        ~Restore(){undo();}
    } restore{[settings,dollShown=settings->doll_is_shown,invletConstant=::flags.invlet_constant,
               hallucination=HHallucination,&potion,&chest] {
        settings->setDollShown(dollShown);
        ::flags.invlet_constant=invletConstant;
        if(HHallucination!=hallucination)make_hallucinated(hallucination,FALSE,0L);
        if(potion){freeinv(potion);obfree(potion,nullptr);}
        if(chest){obj_extract_self(chest);obfree(chest,nullptr);newsym(u.ux,u.uy);}
        update_inventory();
    }};
    settings->setDollShown(true);QCoreApplication::processEvents();

    // Setup (changes the game): an unobserved potion is carried under an
    // out-of-order letter, and a chest holding another one is placed here.
    potion=mksobj(POT_SEE_INVISIBLE,FALSE,FALSE);
    struct obj* inside=mksobj(POT_SEE_INVISIBLE,FALSE,FALSE);
    chest=mksobj_at(LARGE_BOX,u.ux,u.uy,FALSE,FALSE);
    if(!potion || !chest || !inside) {
        // Not carried yet, so the restore step must not freeinv() it.
        if(potion){obfree(potion,nullptr);potion=nullptr;}
        if(inside)obfree(inside,nullptr);
        log << "setup objects were not created\n";return false;
    }
    potion->dknown=0;potion->nomerge=1;inside->dknown=0;
    (void)add_to_container(chest,inside);
    const PaintState created=paintState();
    potion=addinv(potion); // notifies update_inventory(): names are prepared
    potion->nomerge=0;
    for(char letter='z';letter>='a';--letter) {
        bool used=false;
        for(struct obj* item=gi.invent;item;item=item->nobj)used=used || (item!=potion && item->invlet==letter);
        if(!used){potion->invlet=letter;break;}
    }
    update_inventory();
    const PaintState named=paintState();
    const bool carriedUnobserved=!potion->dknown && created.knowledge==named.knowledge;
    log << "unobserved carried potion named at notifications: dknown and knowledge kept=" << (carriedUnobserved?"yes":"no")
        << " letter=" << potion->invlet << " name="
        << (entryById(shown.carried,potion->o_id)?entryById(shown.carried,potion->o_id)->name:QString("(missing)")) << '\n';
    // Opening the window is NetHack's "look inside": the contents are observed
    // at that core point (use_container), as container_contents() does.
    containerWindowInSmoke=true;const int opened=darkdungeon_container_window(chest);containerWindowInSmoke=false;
    QCoreApplication::processEvents();
    if(!opened){log << "container window did not open\n";return false;}
    const bool contentsObserved=inside->dknown && !potion->dknown;
    log << "container contents observed when the window opened=" << (contentsObserved?"yes":"no") << " name="
        << (shown.contents.isEmpty()?QString("(missing)"):shown.contents.first().name) << '\n';
    bool namesPresent=!shown.carried.isEmpty() && !shown.contents.isEmpty();
    for(const auto& item:shown.carried)namesPresent=namesPresent && !item.name.isEmpty();
    for(const auto& item:shown.contents)namesPresent=namesPresent && !item.name.isEmpty();
    log << "all carried and contained items have names=" << (namesPresent?"yes":"no") << '\n';

    // Not hallucinating, with invlet_constant off and a letter out of order:
    // the old paint called reassign() here.
    ::flags.invlet_constant=FALSE;
    int dolls=0;
    PaintState before=paintState();
    if(!exerciseViews(log,dolls))return false;
    const QString plain=compareState(before,paintState());
    log << "not hallucinating, invlet_constant off: differences=" << plain << '\n';
    ::flags.invlet_constant=TRUE;

    // Hallucinating. make_hallucinated() notifies update_inventory(), and the
    // changed glyph inputs make that core point sample every item again.
    const quint64 generation=shown.generation;
    make_hallucinated(200L,FALSE,0L);
    bool hallucinatedKeys=true;
    for(const auto& item:shown.carried)hallucinatedKeys=hallucinatedKeys && item.key.hallucinating;
    log << "hallucination sampling at the update_inventory notification: generation " << generation
        << "->" << shown.generation << " all glyph keys hallucinating=" << (hallucinatedKeys?"yes":"no") << '\n';
    // Positive control: forgetting the sampled glyphs makes the next core point
    // draw DISP, and only DISP.
    for(auto& item:shown.carried)item.key.id=0;
    const PaintState forgotten=paintState();
    darkdungeon_refresh_inventory_view();
    const QString resampled=compareState(forgotten,paintState());
    log << "positive control, glyphs sampled again at an input-wait entry: differences=" << resampled << '\n';
    // Unchanged inputs: another input-wait entry and a notification reuse them.
    const PaintState sampled=paintState();
    darkdungeon_refresh_inventory_view();update_inventory();
    const QString again=compareState(sampled,paintState());
    log << "repeated preparation without changes: differences=" << again << '\n';
    before=paintState();
    if(!exerciseViews(log,dolls))return false;
    const QString hallucinated=compareState(before,paintState());
    log << "paper doll widgets=" << dolls << '\n';
    log << "hallucinating: open/close, paint, resize, tooltips, drag images, container, paper doll: differences="
        << hallucinated << '\n';

    restore.undo();restore.undo=[]{};
    potion=chest=nullptr;
    const bool pass=carriedUnobserved && contentsObserved && namesPresent && plain=="none" && hallucinatedKeys
        && resampled=="DISP" && again=="none" && hallucinated=="none" && dolls>0 && shown.containerId==0;
    log << "inventory paint/drag/tooltip RNG invariance under hallucination=" << (pass?"pass":"fail") << '\n';
    return pass;
}
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
    const int opened=darkdungeon_container_window(chest);
    containerWindowInSmoke=false;
    QCoreApplication::processEvents();
    if(!opened || !inventoryWindow || !inventoryWindow->containerScroll->isVisible() || openContainer()!=chest)return fail(__LINE__);
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
    if(!paintInvarianceSmoke(output))return fail(__LINE__);
    return true;
}
