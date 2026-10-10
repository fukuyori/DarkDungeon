// DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
// DarkDungeon experimental action model, 2026-10-08.
#include "realtime_model.h"
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace darkdungeon {
namespace {
constexpr double step=1.0/60.0;
constexpr Position direction[4]={{0,-1},{1,0},{0,1},{-1,0}};
double length(Position p) {return std::hypot(p.x,p.y);}
Position delta(Position a,Position b) {return {a.x-b.x,a.y-b.y};}
}
RealtimeModel::RealtimeModel(int w,int h,std::vector<uint8_t> cells,Position initial)
    :width(w),height(h),player(initial),floor(std::move(cells)),start(initial) {
    if (w<3 || h<3 || floor.size()!=static_cast<size_t>(w*h) || !walkable(player.x,player.y))
        throw std::invalid_argument("Invalid realtime map/start");
}
bool RealtimeModel::floorAt(int x,int y) const {
    return x>=0 && y>=0 && x<width && y<height && floor[static_cast<size_t>(y*width+x)]!=0;
}
bool RealtimeModel::walkable(double x,double y) const {
    constexpr double radius=.20;
    return floorAt(static_cast<int>(std::floor(x-radius)),static_cast<int>(std::floor(y-radius)))
        && floorAt(static_cast<int>(std::floor(x+radius)),static_cast<int>(std::floor(y-radius)))
        && floorAt(static_cast<int>(std::floor(x-radius)),static_cast<int>(std::floor(y+radius)))
        && floorAt(static_cast<int>(std::floor(x+radius)),static_cast<int>(std::floor(y+radius)));
}
unsigned RealtimeModel::random(unsigned bound) {
    randomState^=randomState<<13;randomState^=randomState>>17;randomState^=randomState<<5;
    return randomState%bound;
}
bool RealtimeModel::move(Position& p,int d,double distance) {
    Position next{p.x+direction[d].x*distance,p.y+direction[d].y*distance};
    // Snap the perpendicular axis gently when entering a narrow corridor.
    if (d%2) next.y=std::abs(p.y-(std::floor(p.y)+.5))<.12?std::floor(p.y)+.5:p.y;
    else next.x=std::abs(p.x-(std::floor(p.x)+.5))<.12?std::floor(p.x)+.5:p.x;
    if (!walkable(next.x,next.y)) return false;
    p=next;return true;
}
void RealtimeModel::addEnemy(EnemyKind kind,Position p,int d) {
    if (d<0 || d>3 || !walkable(p.x,p.y)) throw std::invalid_argument("Invalid enemy spawn");
    Enemy e; e.kind=kind;e.position=p;e.target=p;e.direction=d;
    e.hp=kind==EnemyKind::Slime?1:kind==EnemyKind::Dragon?58:24;
    e.wait=.3;e.attack=1;
    enemies.push_back(e);initialEnemies.push_back(e);
}
void RealtimeModel::addProjectile(Position p,Position v) {projectiles.push_back({p,v,3});}
void RealtimeModel::reset() {
    player=start;hp=100;kills=0;facing=2;sword=0;time=0;immunity=0;
    enemies=initialEnemies;projectiles.clear();randomState=0x524F4B55;
}
void RealtimeModel::updateEnemy(Enemy& e) {
    if (e.kind==EnemyKind::Mage || e.kind==EnemyKind::Dragon) {
        e.attack-=step;
        if (e.attack<=0) {
            Position diff=delta(player,e.position);
            e.direction=std::abs(diff.x)>std::abs(diff.y)?(diff.x>0?1:3):(diff.y>0?2:0);
            double speed=e.kind==EnemyKind::Dragon?3.0:4.0;
            addProjectile(e.position,{direction[e.direction].x*speed,direction[e.direction].y*speed});
            e.attack=e.kind==EnemyKind::Dragon?1.8:2.4;
        }
    }
    if (e.moving) {
        double speed=e.kind==EnemyKind::Slime?2.0:1.25;
        Position diff=delta(e.target,e.position);
        double distance=length(diff);
        if (distance<=speed*step) {e.position=e.target;e.moving=false;}
        else {e.position.x+=diff.x/distance*speed*step;e.position.y+=diff.y/distance*speed*step;}
        return;
    }
    e.wait-=step;if(e.wait>0) return;
    if(e.kind==EnemyKind::Slime) {
        int d=static_cast<int>(random(4));
        Position target{e.position.x+direction[d].x,e.position.y+direction[d].y};
        if(walkable(target.x,target.y)) {e.direction=d;e.target=target;e.moving=true;}
        e.wait=.35+random(80)/60.0;return;
    }
    int next=e.direction;
    if(std::abs(e.position.x-player.x)<.15) next=player.y>e.position.y?2:0;
    else if(std::abs(e.position.y-player.y)<.15) next=player.x>e.position.x?1:3;
    for(int tries=0;tries<4;++tries) {
        Position target{e.position.x+direction[next].x,e.position.y+direction[next].y};
        if(walkable(target.x,target.y)) {e.direction=next;e.target=target;e.moving=true;break;}
        next=(next+3)%4;
    }
    e.wait=e.kind==EnemyKind::Dragon?.25:e.kind==EnemyKind::Mage?.5:0;
}
void RealtimeModel::tick(const Input& input) {
    if(hp<=0) return;
    time+=step;immunity=std::max(0.0,immunity-step);
    sword=std::clamp(sword+(input.sword?step/.18:-step/.14),0.0,1.0);
    if(input.direction>=0 && input.direction<4) {
        facing=input.direction;move(player,facing,(sword>.5?1.4:2.2)*step);
    }
    for(Enemy& e:enemies) {
        if(e.hp<=0) continue;
        updateEnemy(e);
        Position diff=delta(e.position,player);
        double front=diff.x*direction[facing].x+diff.y*direction[facing].y;
        double side=std::abs(diff.x*direction[facing].y-diff.y*direction[facing].x);
        // The blade cannot damage an enemy through a wall.
        Position midpoint{(e.position.x+player.x)/2,(e.position.y+player.y)/2};
        if(sword>=.8 && front>0 && front<1.05 && side<.35 && walkable(midpoint.x,midpoint.y)) {
            if(--e.hp<=0) {++kills;continue;}
        }
        if(length(diff)<.40 && immunity==0) {
            hp=std::max(0,hp-(e.kind==EnemyKind::Knight && sword<.2?100:25));immunity=.8;
        }
    }
    for(Projectile& p:projectiles) {
        p.life-=step;p.position.x+=p.velocity.x*step;p.position.y+=p.velocity.y*step;
        if(!floorAt(static_cast<int>(std::floor(p.position.x)),static_cast<int>(std::floor(p.position.y)))) p.life=0;
        if(p.life>0 && length(delta(p.position,player))<.35) {
            int shield=sword<.2?facing:(facing+3)%4;
            double incoming=-(p.velocity.x*direction[shield].x+p.velocity.y*direction[shield].y);
            if(incoming<=.5 && immunity==0) {hp=std::max(0,hp-30);immunity=.8;}
            p.life=0;
        }
    }
    projectiles.erase(std::remove_if(projectiles.begin(),projectiles.end(),[](const Projectile& p){return p.life<=0;}),projectiles.end());
}
}
