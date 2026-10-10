// DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
// DarkDungeon experimental action model, 2026-10-08.
// This model does not commit changes to the NetHack adventure.
#pragma once
#include <cstdint>
#include <vector>

namespace darkdungeon {
struct Position { double x=0, y=0; };
enum class EnemyKind { Slime, Knight, Mage, Dragon };
struct Input { int direction=-1; bool sword=false; };
struct Enemy {
    EnemyKind kind=EnemyKind::Slime;
    Position position, target;
    int direction=2, hp=24;
    double wait=0, attack=0;
    bool moving=false;
};
struct Projectile { Position position, velocity; double life=3; };
class RealtimeModel {
public:
    RealtimeModel(int width,int height,std::vector<uint8_t> floor,Position start);
    void tick(const Input&);
    void reset();
    bool walkable(double x,double y) const;
    bool floorAt(int x,int y) const;
    void addEnemy(EnemyKind kind,Position position,int direction=2);
    void addProjectile(Position position,Position velocity);
    int width,height;
    Position player;
    int facing=2, hp=100, kills=0;
    double sword=0, time=0;
    std::vector<Enemy> enemies;
    std::vector<Projectile> projectiles;
private:
    std::vector<uint8_t> floor;
    Position start;
    std::vector<Enemy> initialEnemies;
    uint32_t randomState=0x524F4B55;
    double immunity=0;
    unsigned random(unsigned bound);
    bool move(Position&,int direction,double distance);
    void updateEnemy(Enemy&);
};
}
