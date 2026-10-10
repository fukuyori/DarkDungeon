// DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
// Validate packaged game scripts without executing level generators.
extern "C" {
#include "lua.h"
#include "lauxlib.h"
#include "lualib.h"
}
#include <filesystem>
#include <cstdio>
#include <fstream>
#include <regex>
#include <string>
static std::string quoted(const std::string& value) {
    std::string out="\"";
    for(char c:value){if(c=='"' || c=='\\')out+='\\';out+=c;}
    return out+'"';
}
int main(int argc,char** argv) {
    if(argc!=3)return 2;
    std::ofstream ids(argv[2]);if(!ids)return 5;
    ids<<"[";bool first=true;
    auto emit=[&](const std::string& kind,const std::string& id,const std::string& file) {
        // 'spinach' is a documented special tin-content token in sp_lev.c.
        if(id.size()<=1 || (kind=="monster" && id=="spinach"))return;
        if(!first)ids<<",";first=false;
        ids<<"{\"kind\":"<<quoted(kind)<<",\"id\":"<<quoted(id)<<",\"file\":"<<quoted(file)<<"}";
    };
    const std::regex call(R"RX(des\.(monster|object)\s*\(\s*("([^"]+)"|\{([\s\S]*?)\}))RX");
    const std::regex idField(R"RX(\bid\s*=\s*"([^"]+)")RX"), positional(R"RX(^\s*"([^"]+)")RX");
    const std::regex montype(R"RX(\bmontype\s*=\s*"([^"]+)")RX");
    lua_State* state=luaL_newstate();luaL_openlibs(state);
    int count=0;
    for(const auto& file:std::filesystem::directory_iterator(argv[1])) {
        if(file.path().extension()!=".lua")continue;
        std::ifstream input(file.path());const std::string text((std::istreambuf_iterator<char>(input)),{});
        for(auto i=std::sregex_iterator(text.begin(),text.end(),call);i!=std::sregex_iterator();++i) {
            auto match=*i;std::string id=match[3];
            if(id.empty()){std::smatch field;std::string table=match[4];if(std::regex_search(table,field,idField)||std::regex_search(table,field,positional))id=field[1];}
            if(!id.empty())emit(match[1],id,file.path().filename().string());
        }
        for(auto i=std::sregex_iterator(text.begin(),text.end(),montype);i!=std::sregex_iterator();++i)emit("monster",(*i)[1],file.path().filename().string());
        if(luaL_loadfile(state,file.path().string().c_str())!=LUA_OK) {
            std::fprintf(stderr,"%s\n",lua_tostring(state,-1));return 1;
        }
        if(file.path().filename()=="quest.lua") {
            if(lua_pcall(state,0,0,0)!=LUA_OK){std::fprintf(stderr,"%s\n",lua_tostring(state,-1));return 1;}
            lua_getglobal(state,"questtext");
            if(!lua_istable(state,-1))return 3;
            for(const char* role:{"Arc","Bar","Cav","Hea","Kni","Mon","Pri","Ran","Rog","Sam","Tou","Val","Wiz","common"}) {
                lua_getfield(state,-1,role);
                if(!lua_istable(state,-1)){std::fprintf(stderr,"Missing quest table: %s\n",role);return 4;}
                lua_pop(state,1);
            }
        }
        lua_settop(state,0);++count;
    }
    ids<<"]\n";lua_close(state);std::printf("Lua syntax and quest tables: %d files passed\n",count);return 0;
}
