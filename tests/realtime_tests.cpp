// DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#include "realtime_model.h"
#include <cmath>
#include <iostream>
#include <stdexcept>
using namespace darkdungeon;
void require(bool pass,const char* message) {if(!pass) throw std::runtime_error(message);}
RealtimeModel arena() {
    std::vector<uint8_t> cells(81,0);
    for(int y=1;y<8;++y)for(int x=1;x<8;++x) cells[y*9+x]=1;
    return RealtimeModel(9,9,cells,{4.5,4.5});
}
int main() {
    try {
        auto a=arena();for(int i=0;i<240;++i) a.tick({1,false});
        require(a.player.x<7.81 && a.walkable(a.player.x,a.player.y),"player crossed wall");
        auto b=arena();b.addEnemy(EnemyKind::Knight,{4.5,2.5},2);
        Position before=b.enemies[0].position;for(int i=0;i<40;++i)b.tick({});
        require(b.enemies[0].position.y>before.y,"enemy did not move without player input");
        auto patrol=arena();patrol.addEnemy(EnemyKind::Knight,{2.5,2.5},1);
        for(int i=0;i<100;++i)patrol.tick({});
        require(patrol.enemies[0].position.x>3.8 && patrol.enemies[0].position.y==2.5,"unaligned enemy circles instead of continuing forward");
        auto c=arena();c.addEnemy(EnemyKind::Slime,{4.5,5.1});
        for(int i=0;i<13;++i)c.tick({-1,true});
        require(c.kills==1,"drawn sword did not kill slime");
        c.reset();require(c.kills==0 && c.enemies[0].hp==1 && c.sword==0,"reset did not restore simulation");
        auto d=arena();d.addEnemy(EnemyKind::Knight,{4.5,4.8});d.tick({});
        require(d.hp==0,"sheathed knight contact did not kill player");
        auto e=arena();e.facing=0;e.addProjectile({4.5,4.2},{0,3});e.tick({});
        require(e.hp==100 && e.projectiles.empty(),"front shield did not block spell");
        auto f=arena();f.facing=2;f.addProjectile({4.5,4.2},{0,3});f.tick({});
        require(f.hp==70,"rear projectile was incorrectly blocked");
        auto g=arena();g.addEnemy(EnemyKind::Slime,{2.5,2.5});
        auto h=arena();h.addEnemy(EnemyKind::Slime,{2.5,2.5});
        for(int i=0;i<300;++i){g.tick({});h.tick({});}
        require(g.enemies[0].position.x==h.enemies[0].position.x && g.enemies[0].position.y==h.enemies[0].position.y,"fixed-step simulation is not deterministic");
        std::cout<<"PASS: collision, autonomous AI, sword, reset, contact, directional shield, fixed-step determinism\n";
        return 0;
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}
}
