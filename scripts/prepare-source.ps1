# DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
param(
    [string]$NetHackSource = (Join-Path $PSScriptRoot '..\..\NetHack'),
    [string]$QtRoot = 'C:\Qt\6.11.2\msvc2022_64',
    [ValidateSet('en','ja')][string]$Language='en'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$version = (Get-Content (Join-Path $projectRoot 'VERSION') -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid VERSION.' }
$originalSource=$NetHackSource
if($Language -eq 'ja') {
    $commit=& git -C $NetHackSource rev-parse HEAD
    if($commit -ne 'cb453720b1cdff0134f0872d8706fb20a764b0de') { throw 'Japanese port requires the documented NetHack 5.0.1 source commit.' }
    $NetHackSource=Join-Path $projectRoot 'build\japanese-source'
    $resolved=[IO.Path]::GetFullPath($NetHackSource)
    $allowed=[IO.Path]::GetFullPath((Join-Path $projectRoot 'build'))+[IO.Path]::DirectorySeparatorChar
    if(!$resolved.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase)){throw 'Japanese source target escaped workspace.'}
    if(Test-Path -LiteralPath $resolved){Remove-Item -LiteralPath $resolved -Recurse -Force}
    New-Item -ItemType Directory -Force $NetHackSource | Out-Null
    & robocopy $originalSource $NetHackSource /E /XD .git submodules /NFL /NDL /NJH /NJS /NP
    if($LASTEXITCODE -gt 7){throw 'Japanese source copy failed.'}
    $previousCeiling=$env:GIT_CEILING_DIRECTORIES
    try {
        $env:GIT_CEILING_DIRECTORIES=Split-Path $NetHackSource -Parent
        & git -C $NetHackSource apply --whitespace=nowarn (Join-Path $projectRoot 'patches\nethack-5.0.1-ja.patch')
        if($LASTEXITCODE){throw 'Japanese translation patch failed.'}
    } finally { $env:GIT_CEILING_DIRECTORIES=$previousCeiling }
    if(!(Test-Path (Join-Path $NetHackSource 'japanese\jlib.c'))) {throw 'Japanese patch was not applied.'}
}
$snapshot = Join-Path $projectRoot $(if($Language -eq 'ja'){'build\nethack-ja'}else{'build\nethack'})
if (!(Test-Path (Join-Path $NetHackSource 'src\allmain.c'))) { throw 'NetHack source is missing.' }
New-Item -ItemType Directory -Force -Path $snapshot | Out-Null
& robocopy $NetHackSource $snapshot /E /XD .git submodules /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -gt 7) { throw "Source copy failed: $LASTEXITCODE" }
$qtRootForward = $QtRoot.Replace('\','/')
$qtSources = Get-ChildItem (Join-Path $NetHackSource 'win\Qt') -Filter '*.cpp'
$qtObjects = ($qtSources | ForEach-Object { '$(OTTY)' + $_.BaseName + '.o' }) -join ' '
$qtObjects += ' $(OTTY)qt_darkdungeon.o $(OTTY)realtime_model.o $(OTTY)tile.o'
$makePath = Join-Path $snapshot 'src\Makefile'
$make = Get-Content (Join-Path $NetHackSource 'sys\windows\Makefile.nmake') -Raw
$make = "# Modified for DarkDungeon on 2026-10-08; Windows Qt build. See dat/license.`r`n" + $make
$make = $make.Replace('-MTd','-MDd').Replace('-MT ','-MD ')
$make = $make.Replace('cpptmpflags = $(ctmpflags)', 'cpptmpflags = $(ctmpflags:/std:clatest=) /std:c++17 /Zc:__cplusplus /permissive- /utf-8')
if($Language -eq 'ja') { $make=$make.Replace('/permissive- /utf-8','/permissive-') }
$make = $make.Replace('TTYDEF=  ', 'TTYDEF= -DQT_GRAPHICS -DQT_NO_SOUND ')
if($Language -eq 'ja') { $make=$make.Replace('-DQT_GRAPHICS -DQT_NO_SOUND','-DQT_GRAPHICS -DQT_NO_SOUND -DDARKDUNGEON_JAPANESE') }
$make = $make.Replace('INCLUSIONS= ', 'INCLUSIONS= /I. /I"' + $qtRootForward + '/include" /I"' + $qtRootForward + '/include/QtCore" /I"' + $qtRootForward + '/include/QtGui" /I"' + $qtRootForward + '/include/QtWidgets" ')
$make = $make.Replace('ALLOBJTTY  = ', 'QT_OBJS = ' + $qtObjects + "`r`n`r`nALLOBJTTY  = `$(QT_OBJS) ")
$make = $make.Replace('LIBS= user32.lib', 'LIBS= /LIBPATH:"' + $qtRootForward + '/lib" Qt6Core.lib Qt6Gui.lib Qt6Widgets.lib user32.lib')
$start = $make.IndexOf('$(GAMEDIR)NetHack.exe :')
$end = $make.IndexOf('# NetHackW', $start)
if ($start -lt 0 -or $end -lt 0) { throw 'Unsupported upstream Makefile layout.' }
$qtLink = $make.Substring($start, $end - $start).Replace('$(conlflags)', '$(guilflags) /ENTRY:mainCRTStartup')
$make = $make.Substring(0,$start) + $qtLink + $make.Substring($end)
$make += "`r`n# DarkDungeon Qt rules (explicit outputs and Unicode-safe Qt headers).`r`n"
foreach ($qtSource in @($qtSources) + @([pscustomobject]@{BaseName='qt_darkdungeon'},[pscustomobject]@{BaseName='realtime_model'})) {
    $base = $qtSource.BaseName
    $make += "`r`n`$(OTTY)$base.o: ..\win\Qt\$base.cpp ..\win\Qt\qt_darkdungeon.h ..\win\Qt\realtime_model.h `$(HACK_H)`r`n`t`$(Q)`$(CC) `$(CPPFLAGS) `$(TTYDEF) -Fo`$@ ..\win\Qt\$base.cpp`r`n"
}
$make += "`r`n`$(OTTY)tile.o: tile.c `$(HACK_H)`r`n`t`$(Q)`$(CC) `$(CFLAGS) `$(TTYDEF) -Fo`$@ tile.c`r`n"
$make += "`r`n`$(OTTY)qt_darkdungeon.o `$(OTTY)qt_main.o `$(OTTY)cmd.o `$(OTTY)pickup.o: ..\include\context_action.h`r`n"
[IO.File]::WriteAllText($makePath,$make,[Text.UTF8Encoding]::new($false))

function Update-Source([string]$relative, [scriptblock]$transform) {
    $sourcePath = Join-Path $snapshot $relative
    $contents = Get-Content $sourcePath -Raw -Encoding utf8
    $modified = & $transform $contents
    if ($modified -eq $contents) { throw "Patch did not apply: $relative" }
    $modified = "/* Modified for DarkDungeon on 2026-10-08. See dat/license. */`r`n" + $modified
    [IO.File]::WriteAllText($sourcePath,$modified,[Text.UTF8Encoding]::new($false))
}
Copy-Item (Join-Path $projectRoot 'src\context_action.h') (Join-Path $snapshot 'include\context_action.h') -Force
Update-Source 'src\cmd.c' {
    param($s)
    $s=$s.Replace('#include "hack.h"',"#include `"hack.h`"`r`n#include `"context_action.h`"")
    $anchor='    { ''\0'',   "debugfuzzer",'
    if(!$s.Contains($anchor)){throw 'Context action command table anchor missing.'}
    $entry=@'
    { ' ', "contextaction",
#ifdef DARKDUNGEON_JAPANESE
      "状況に応じた基本動作",
#else
      "perform the basic action for this location",
#endif
      darkdungeon_basic_action, IFBURIED | AUTOCOMPLETE, NULL },
'@
    $s=$s.Replace($anchor,$entry+"`r`n"+$anchor)
    $anchor='    { M(''l''), "loot",'
    if(!$s.Contains($anchor)){throw 'Container toolbar command anchor missing.'}
    $entry=@'
    { '\0', "lookcontainer",
#ifdef DARKDUNGEON_JAPANESE
      "足元の容器の中身を見る",
#else
      "look inside a container at your feet",
#endif
      darkdungeon_look_here, AUTOCOMPLETE, NULL },
'@
    $s=$s.Replace($anchor,$entry+"`r`n"+$anchor)
    $anchor='donull, (IFBURIED | CMD_M_PREFIX), "waiting"'
    if(!$s.Contains($anchor)){throw 'Space option binding anchor missing.'}
    $s=$s.Replace($anchor,'darkdungeon_basic_action, IFBURIED, NULL')
    $s=$s.Replace(''' '', "wait", "rest one move via ''rest_on_space'' option"', ''' '', "contextaction", "perform the basic action for this location"')
    if($Language -eq 'ja') {
        $s=$s.Replace(''' '', "contextaction", "perform the basic action for this location"',''' '', "contextaction", "状況に応じた基本動作"')
    }
    $s=[regex]::Replace($s,'        if \(key == '' '' && !flags.rest_on_space\)\r?\n            continue;\r?\n','')
    $s+"`r`n"+(Get-Content (Join-Path $projectRoot 'src\context_action.inc') -Raw -Encoding utf8)
}
Update-Source 'src\pickup.c' {
    param($s)
    $s=$s.Replace('#include "hack.h"',"#include `"hack.h`"`r`n#include `"context_action.h`"`r`nstatic boolean darkdungeon_looking_here = FALSE;")
    $anchor='    for (;;) { /* repeats iff ''?'' or '':'' gets chosen */'
    if(!$s.Contains($anchor)){throw 'Container look shortcut anchor missing.'}
    $look=@'
    if (darkdungeon_looking_here) {
        if (!gc.current_container->cknown)
            used = ECMD_TIME;
        container_contents(gc.current_container, FALSE, FALSE, TRUE);
        goto containerdone;
    }
'@
    $s=$s.Replace($anchor,$look+"`r`n"+$anchor)
    $anchor=' lootmon:'
    if(!$s.Contains($anchor)){throw 'Container look monster bypass anchor missing.'}
    $s=$s.Replace($anchor,$anchor+"`n    if (darkdungeon_looking_here) return timepassed ? ECMD_TIME : ECMD_OK;")
    $s+@'

int darkdungeon_look_here(void) {
    boolean previous = darkdungeon_looking_here;
    boolean previous_menu = iflags.menu_requested;
    int result;
    if (!container_at(u.ux, u.uy, TRUE)) {
#ifdef DARKDUNGEON_JAPANESE
        pline("足元に容器はありません。");
#else
        pline("There is no container at your feet.");
#endif
        return ECMD_OK;
    }
    darkdungeon_looking_here = TRUE;
    iflags.menu_requested = FALSE;
    result = doloot();
    iflags.menu_requested = previous_menu;
    darkdungeon_looking_here = previous;
    return result;
}
'@
}
Update-Source 'win\Qt\qt_bind.cpp' {
    param($s)
    foreach($pattern in @('(int NetHackQtBind::qt_nhgetch\(\)\s*\{)',
        '(int NetHackQtBind::qt_nh_poskey\(coordxy \*x, coordxy \*y, int \*mod\)\s*\{)')) {
        if(![regex]::IsMatch($s,$pattern)){throw 'Toolbar request reset anchor missing.'}
        $s=[regex]::Replace($s,$pattern,'$1'+"`n    if (!qt_kbhit()) (void)darkdungeon_take_toolbar_command();")
    }
    $anchor="int NetHackQtBind::qt_get_ext_cmd()`r`n{"
    if(!$s.Contains($anchor)){$anchor="int NetHackQtBind::qt_get_ext_cmd()`n{"}
    if(!$s.Contains($anchor)){throw 'Toolbar extended command dispatch anchor missing.'}
    $s=$s.Replace($anchor,$anchor+@'

    const int toolbarCommand=darkdungeon_take_toolbar_command();
    if(toolbarCommand>=0) { qt_clear_nhwindow(WIN_MESSAGE);return toolbarCommand; }
'@)
    foreach($anchor in @('instance=new NetHackQtBind(*argc,argv);','qt_settings = new NetHackQtSettings();','main = new NetHackQtMainWindow(keybuffer);','free_saved_games(saved);','struct window_procs Qt_procs = {','if (qt_input_timer->isActive())')) {
        if(!$s.Contains($anchor)) { throw "Qt integration patch anchor missing: $anchor" }
    }
    # idlecheckpoint can be disabled while qt_nh_poskey still stops its timer.
    $s = $s.Replace('if (qt_input_timer->isActive())','if (qt_input_timer && qt_input_timer->isActive())')
    $s = $s.Replace('#include "qt_post.h"', "#include <QtWidgets/QtWidgets>`r`n#include `"qt_post.h`"")
    $s = $s.Replace('instance=new NetHackQtBind(*argc,argv);', "if (!qEnvironmentVariable(`"DARKDUNGEON_SMOKE_OUTPUT`").isEmpty()) {`r`n        QSettings::setDefaultFormat(QSettings::IniFormat);`r`n        QSettings::setPath(QSettings::IniFormat, QSettings::UserScope, qEnvironmentVariable(`"DARKDUNGEON_SMOKE_OUTPUT`"));`r`n    }`r`n    instance=new NetHackQtBind(*argc,argv);`r`n    QDir::setCurrent(QCoreApplication::applicationDirPath());`r`n    darkdungeon_start_hooks();")
    $s = $s.Replace('#include "qt_str.h"', "#include `"qt_str.h`"`r`n#include `"qt_darkdungeon.h`"")
    if(!$s.Contains('bool result = QApplication::notify(receiver, event);')) {throw 'Qt input routing anchor missing.'}
    $s=$s.Replace('bool result = QApplication::notify(receiver, event);',"if (darkdungeon_route_arrow(receiver, event)) return true;`r`n    bool result = QApplication::notify(receiver, event);")
    $s = $s.Replace('qt_settings = new NetHackQtSettings();', 'QDir::setCurrent(QCoreApplication::applicationDirPath()); darkdungeon_language_init(); darkdungeon_view_defaults(); darkdungeon_trace("Qt settings"); qt_settings = new NetHackQtSettings();')
    $s = $s.Replace('main = new NetHackQtMainWindow(keybuffer);', 'darkdungeon_trace("Qt main window"); main = new NetHackQtMainWindow(keybuffer); darkdungeon_trace("Qt constructor ready");')
    if(!$s.Contains('int exc = qApp->exec();')){throw 'Qt smoke dispatch anchor missing.'}
    $s = $s.Replace('int exc = qApp->exec();','int exc = qApp->exec(); darkdungeon_finish_smoke();')
    $s = $s.Replace('QCoreApplication::setApplicationVersion(qvers);', 'QCoreApplication::setApplicationVersion("'+$version+'");')
    # get_saved_games temporarily replaces svp.plname with '*'. Restore the
    # requested name before a new character is selected, including CLI launches.
    $s = $s.Replace('free_saved_games(saved);', 'free_saved_games(saved); if (ch < 0) str_copy(svp.plname, default_plname, PL_NSIZ);')
    # A selected save includes role/race suffixes. Windows can retry restore
    # immediately after askname without calling plnamesuffix again.
    $savedName=@'
{
            const char* chosen=saved[ch];
            const char* suffix=chosen+strlen(chosen);
            for(int field=0;field<4;++field) {
                while(suffix>chosen && suffix[-1]!='-')--suffix;
                if(suffix==chosen)break;
                --suffix;
            }
            gp.plnamelen=int(suffix-chosen);
            str_copy(svp.plname,chosen,SIZE(svp.plname));
            ::plnamesuffix();
        }
'@
    $s = $s.Replace('str_copy(svp.plname, saved[ch], SIZE(svp.plname));',$savedName)
    $s = $s.Replace('extern int qt_compact_mode;', 'extern "C" int qt_compact_mode;')
    $s = $s.Replace('struct window_procs Qt_procs = {','extern "C" struct window_procs Qt_procs = {')
    $s.Replace('setOrganizationName("The NetHack DevTeam")','setOrganizationName("DarkDungeon")').Replace('setApplicationName("NetHack-Qt")','setApplicationName("DarkDungeon")')
}
Update-Source 'win\Qt\qt_plsel.cpp' {
    param($s)
    if(!$s.Contains('name->setMaxLength(PL_NSIZ - 1);')) { throw 'Character selector anchor missing.' }
    $s=$s.Replace('name->setMaxLength(PL_NSIZ - 1);','play_btn->setObjectName("startGame"); name->setMaxLength(PL_NSIZ - 1);')
    # This field is a name; role/race are selected by separate controls.
    $s=$s.Replace('str_copy(svp.plname, name_str, PL_NSIZ);','str_copy(svp.plname, name_str, PL_NSIZ); gp.plnamelen = int(strlen(svp.plname));')
    $s.Replace('if (fully_specified_role)', 'if (fully_specified_role && qEnvironmentVariable("DARKDUNGEON_SMOKE_OUTPUT").isEmpty())')
}
Update-Source 'src\files.c' {
    param($s)
    if(!$s.Contains('sprintf(op, "%c%02X", quotechar, *sp)')) {throw 'Filename encoding anchor missing.'}
    $s.Replace('sprintf(op, "%c%02X", quotechar, *sp)','sprintf(op, "%c%02X", quotechar, (unsigned char) *sp)')
}
Update-Source 'include\fnamesiz.h' {
    param($s)
    $s=$s.Replace('#define LOCKNAMESIZE (PL_NSIZ + 25)','#define LOCKNAMESIZE (3 * PL_NSIZ + 25)')
    $s.Replace('#define SAVESIZE (PL_NSIZ + sizeof(SAVEX) + sizeof(SAVE_EXTENSION) + INDSIZE)',"#ifdef WIN32`r`n#define SAVESIZE (3 * PL_NSIZ + sizeof(SAVEX) + sizeof(SAVE_EXTENSION) + INDSIZE)`r`n#else`r`n#define SAVESIZE (PL_NSIZ + sizeof(SAVEX) + sizeof(SAVE_EXTENSION) + INDSIZE)`r`n#endif")
}
Update-Source 'src\role.c' {
    param($s)
    $s=$s.Replace('askname(); /* fill svp.plname[] if necessary, or set',"gp.plnamelen = 0;`r`n            askname(); /* fill svp.plname[] if necessary, or set")
    $s.Replace('gp.plnamelen = 0; /* plname[] might have -role-race-&c attached */','/* askname may have supplied a literal name length. */')
}
Update-Source 'src\restore.c' {
    param($s)
    $s.Replace('Snprintf(svp.plname, sizeof(svp.plname), "%s", plname);','Snprintf(svp.plname, sizeof(svp.plname), "%s", plname); gp.plnamelen = (int) strlen(svp.plname);')
}
Update-Source 'win\Qt\qt_map.cpp' {
    param($s)
    $s = $s.Replace('#include "qt_str.h"', "#include `"qt_str.h`"`r`n#include `"qt_darkdungeon.h`"")
    $anchor='glyphs.drawCell(painter, g, tileidx, i, j);'
    if(!$s.Contains($anchor)){throw 'Qt map layered drawing anchor missing.'}
    $s=$s.Replace($anchor,'darkdungeon_draw_map_cell(painter,g,tileidx,special,background[j][i],QRect(i*gW,j*gH,gW,gH));')
    $anchor='Glyph(i, j) = GLYPH_UNEXPLORED;'
    if(!$s.Contains($anchor)){throw 'Qt map background clear anchor missing.'}
    $s=$s.Replace($anchor,$anchor+"`r`n            background[j][i] = GLYPH_UNEXPLORED;")
    $anchor='Glyph(0, j) = GLYPH_NOTHING;'
    if(!$s.Contains($anchor)){throw 'Qt map background margin clear anchor missing.'}
    $s=$s.Replace($anchor,$anchor+"`r`n        background[j][0] = GLYPH_UNEXPLORED;")
    $anchor='Glyph(x, y) = (unsigned short) glyphinfo->glyph;'
    if(!$s.Contains($anchor)){throw 'Qt map background update anchor missing.'}
    $s=$s.Replace($anchor,$anchor+"`r`n    const int terrain = darkdungeon_background_glyph(glyphinfo->glyph,x,y);`r`n    if (terrain != NO_GLYPH) background[y][x] = terrain;")
    $s+@'

namespace nethack_qt_ {
void NetHackQtMapWindow2::centerOnCursor() {
    const int tileWidth=qt_settings->glyphs().no_tiles ? qt_settings->glyphs().width() : qt_settings->tileWidth;
    const int tileHeight=qt_settings->glyphs().no_tiles ? qt_settings->glyphs().height() : qt_settings->tileHeight;
    horizontalScrollBar()->setValue(m_viewport->cursor.x()*tileWidth+tileWidth/2-viewport()->width()/2);
    verticalScrollBar()->setValue(m_viewport->cursor.y()*tileHeight+tileHeight/2-viewport()->height()/2);
}
}
'@
}
Update-Source 'win\Qt\qt_map.h' {
    param($s)
    $anchor='unsigned short glyph[ROWNO][COLNO];'
    if(!$s.Contains($anchor)){throw 'Qt map background storage anchor missing.'}
    $s=$s.Replace($anchor,$anchor+"`r`n        int background[ROWNO][COLNO];")
    $s.Replace('virtual QWidget *Widget();','void centerOnCursor(); virtual QWidget *Widget();')
}
Update-Source 'win\Qt\qt_glyph.h' {
    param($s)
    $anchor='QPixmap glyph(int glyphindx, int tileidx);'
    if(!$s.Contains($anchor)){throw 'Qt transparent glyph declaration anchor missing.'}
    $s=$s.Replace($anchor,"void drawForegroundCell(QPainter&, int glyph, int tileidx, int cellx, int celly);`r`n        "+$anchor)
    $anchor='QImage img;'
    if(!$s.Contains($anchor)){throw 'Qt transparent glyph cache anchor missing.'}
    $s.Replace($anchor,$anchor+"`r`n        QMap<int,QImage> foreground;`r`n        bool builtin_tiles;")
}
Update-Source 'win\Qt\qt_glyph.cpp' {
    param($s)
    $anchor='this->no_tiles = false;'
    if(!$s.Contains($anchor)){throw 'Qt transparent glyph initialization anchor missing.'}
    $s=$s.Replace($anchor,$anchor+"`r`n    builtin_tiles = !user_tiles;")
    $s+@'

namespace nethack_qt_ {
void NetHackQtGlyphs::drawForegroundCell(QPainter& painter,int glyphIndex,int tileidx,int cellx,int celly) {
    if(!foreground.contains(tileidx)) {
        QImage tile=glyph(glyphIndex,tileidx).toImage().convertToFormat(QImage::Format_ARGB32);
        // The '.' palette entry in the bundled monsters/objects tile sources
        // is a reserved background. Preserve black outlines and user tile art.
        if(builtin_tiles)for(int y=0;y<tile.height();++y) {
            auto* row=reinterpret_cast<QRgb*>(tile.scanLine(y));
            for(int x=0;x<tile.width();++x)
                if((row[x]&0x00ffffff)==(qRgb(71,108,108)&0x00ffffff))row[x]=0;
        }
        foreground.insert(tileidx,tile);
    }
    painter.drawImage(QRect(cellx*width(),celly*height(),width(),height()),foreground[tileidx]);
}
}
'@
}
Update-Source 'win\Qt\qt_main.cpp' {
    param($s)
    $s=$s.Replace('#include "qt_str.h"', "#include `"qt_str.h`"`r`n#include `"qt_darkdungeon.h`"")
    $s=$s.Replace('#include "hack.h"', "#include `"hack.h`"`r`n#include `"context_action.h`"")
    if(!$s.Contains('doKeys(action->data().toString());')) {throw 'Qt menu dispatch anchor missing.'}
    $s=[regex]::Replace($s,'(void NetHackQtMainWindow::doMenuItem\(QAction \*action\)\s*\{)','$1'+"`r`n    if (!action->data().isValid()) return;")
    if(!$s.Contains('if (!action->data().isValid()) return;')){throw 'Qt menu guard anchor missing.'}
    $s=$s.Replace('setIcon(QIcon(pm));', 'setIcon(QIcon(pm)); setText(textLabel); setIconSize(QSize(24,24)); setToolButtonStyle(Qt::ToolButtonTextUnderIcon); setFocusPolicy(Qt::NoFocus);')
    $s=$s.Replace('return QToolButton::sizeHint()-QSize(0,2);', 'return QToolButton::sizeHint().expandedTo(QSize(72,52));')
    $s=$s.Replace('connect(this, SIGNAL(clicked(bool)), receiver, slot);','if (receiver && slot) connect(this, SIGNAL(clicked(bool)), receiver, slot);')
    $toolbarFunction=@'
void NetHackQtMainWindow::AddToolButton(QToolBar *toolbar, QSignalMapper *sm,
                                        const char *name, int (*func)(void),
                                        QPixmap xpm)
{
    Q_UNUSED(sm); Q_UNUSED(xpm);
    char commandName[BUFSZ];
    if (!cmdname_from_func(func,commandName,TRUE)) return;
    QToolButton *tb = new SmallToolButton(darkdungeon_toolbar_icon(commandName).pixmap(QSize(24,24)),
        QString::fromUtf8(name), "Action", nullptr, nullptr, toolbar);
    tb->setIcon(darkdungeon_toolbar_icon(commandName));
    tb->setProperty("commandName",QString::fromLatin1(commandName));
    connect(tb,&QToolButton::clicked,this,[this,func] {
        if (!ok_for_command() || NetHackQtBind::qt_kbhit()) return;
        const uchar key = (uchar) cmd_from_func(func);
        if (key && key < 128 && !strchr("hjklyubnHJKLYUBN",key)
                && !(key < 32 && strchr("hjklyubn",(key | 0x60)))) {
            char sequence[2] = { (char)key, '\0' };
            doKeys(sequence);
        } else {
            const char extendedKey=cmd_from_func(doextcmd);
            if (extendedKey && darkdungeon_request_toolbar_command(func)) {
                char sequence[2] = { extendedKey, '\0' };
                doKeys(sequence);
            }
        }
    });
    toolbar->addWidget(tb);
}
'@
    $s=[regex]::Replace($s,'(?s)void NetHackQtMainWindow::AddToolButton\(.*?\n\}(?=\s*void NetHackQtMainWindow::zoomMap)',$toolbarFunction)
    $anchor='    AddToolButton(toolbar, sm, "Again", do_repeat, QPixmap(again_xpm));'
    if(!$s.Contains($anchor)){throw 'Basic toolbar button anchor missing.'}
    $s=$s.Replace($anchor,'    AddToolButton(toolbar, sm, "Basic action", darkdungeon_basic_action, QPixmap());'+"`r`n"+$anchor)
    $anchor='    AddToolButton(toolbar, sm, "Rest", donull, QPixmap(rest_xpm));'
    $extraToolbar=@'
    QToolBar* tools = new QToolBar(this);
    tools->setObjectName("adventureToolsToolbar");
    tools->setMovable(false);tools->setFocusPolicy(Qt::NoFocus);
    addToolBarBreak(Qt::BottomToolBarArea);addToolBar(Qt::BottomToolBarArea,tools);
    AddToolButton(tools, sm, "Inventory", ddoinv, QPixmap());
    AddToolButton(tools, sm, "Wield weapon", dowield, QPixmap());
    AddToolButton(tools, sm, "Use tool", doapply, QPixmap());
    AddToolButton(tools, sm, "Contents", darkdungeon_look_here, QPixmap());
    AddToolButton(tools, sm, "Open door", doopen, QPixmap());
    AddToolButton(tools, sm, "Close door", doclose, QPixmap());
    AddToolButton(tools, sm, "Up", doup, QPixmap());
    AddToolButton(tools, sm, "Down", dodown, QPixmap());
'@
    if(!$s.Contains($anchor)){throw 'Additional toolbar anchor missing.'}
    $s=$s.Replace($anchor,$anchor+"`r`n"+$extraToolbar)
    $s=$s.Replace('maxwn = glyphs->width() * (COLNO + 1);','maxwn = std::min(1400, glyphs->width() * (COLNO + 1));').Replace('maxhn = glyphs->height() * ROWNO * 6/4 + glyphs->height() * 10;','maxhn = std::min(900, glyphs->height() * ROWNO * 6/4 + glyphs->height() * 10);')
    $s=$s.Replace('addToolBar(toolbar);','addToolBar(Qt::BottomToolBarArea,toolbar);')
    $s=$s.Replace('hsplitter = new QSplitter(Qt::Horizontal);', 'hsplitter = new QSplitter(Qt::Horizontal); hsplitter->setObjectName("adventureUpperPanels"); vsplitter->setObjectName("adventurePanels"); vsplitter->setChildrenCollapsible(false);')
    $s=$s.Replace('hsplitter->insertWidget(1, invusage);','hsplitter->insertWidget(0, invusage);')
    $messageAnchor='hsplitter->insertWidget(0, message->Widget());'
    if(!$s.Contains($messageAnchor)){throw 'Qt lower message pane anchor missing.'}
    $s=$s.Replace($messageAnchor,'{ message->Widget()->setObjectName("adventureMessages"); message->Widget()->setAutoFillBackground(true); vsplitter->insertWidget(2, message->Widget()); vsplitter->setStretchFactor(2,0); }')
    $s=$s.Replace('hsplitter->insertWidget(2, status->Widget());','hsplitter->insertWidget(1, status->Widget());')
    $s=$s.Replace('hsplitter->replaceWidget(2, this->status->Widget());','hsplitter->replaceWidget(1, this->status->Widget());')
    $s=$s.Replace('message->Widget()->setParent(hp);','message->Widget()->setParent(vp);')
    $s=$s.Replace('vsplitter->insertWidget(1, map->Widget());','{ vsplitter->insertWidget(1, map->Widget()); vsplitter->setStretchFactor(0,0); vsplitter->setStretchFactor(1,1); }')
    $s=$s.Replace('connect(map,SIGNAL(resized()),this,SLOT(layout()));','connect(map,SIGNAL(resized()),this,SLOT(layout())); connect(qt_settings,SIGNAL(fontChanged()),this,SLOT(layout()),Qt::QueuedConnection);')
    $s=[regex]::Replace($s,'(void NetHackQtMainWindow::resizeEvent\(QResizeEvent\*\)\s*\{\s*layout\(\);)','$1'+"`r`n    QTimer::singleShot(0,this,[this]{if(map && u.ux && u.uy)map->centerOnCursor();});")
    $adventureLayout=@'
void NetHackQtMainWindow::layout()
{
    darkdungeon_layout_toolbars(this);
    if (!qt_settings || qt_compact_mode || !map || !message || !status || !invusage
            || hsplitter->count()!=2 || vsplitter->count()!=3) return;
#ifdef ENHANCED_PAPERDOLL
    qt_settings->resizeDoll();
#endif
    const bool dollShown=!invusage->isHidden();
    const int dollWidth=dollShown ? invusage->sizeHint().width() : 0;
    hsplitter->setSizes(QList<int>{dollWidth,std::max(1,centralWidget()->width()-dollWidth)});
    const int topHeight=std::max(status->Widget()->minimumSizeHint().height(),
        dollShown ? invusage->sizeHint().height() : 0)+8;
    const int lineHeight=QFontMetrics(message->Widget()->font()).height();
    message->Widget()->setMinimumHeight(lineHeight*2+8);
    const int messageHeight=lineHeight*3+12;
    const int handles=vsplitter->handleWidth()*2;
    vsplitter->setSizes(QList<int>{topHeight,
        std::max(1,centralWidget()->height()-topHeight-messageHeight-handles),messageHeight});
}
'@
    $layoutPattern='(?s)void NetHackQtMainWindow::layout\(\)\s*\{.*?\n\}(?=\s*#ifdef DYNAMIC_STATUSLINES)'
    if(![regex]::IsMatch($s,$layoutPattern)){throw 'Qt adventure layout function anchor missing.'}
    $s=[regex]::Replace($s,$layoutPattern,$adventureLayout)
    $paperDollLayout=@'
void NetHackQtMainWindow::resizePaperDoll(bool showdoll)
{
#ifdef ENHANCED_PAPERDOLL
    if (qt_compact_mode || !invusage || !hsplitter || !vsplitter) return;
    invusage->resize(invusage->sizeHint());
    invusage->setVisible(showdoll);
    if (showdoll) invusage->repaint();
    if (hsplitter->count()==2) {
        const int dollWidth=showdoll ? invusage->width() : 0;
        hsplitter->setSizes(QList<int>{dollWidth,std::max(1,centralWidget()->width()-dollWidth)});
    }
    QList<int> sizes=vsplitter->sizes();
    if (sizes.size()==3 && sizes[1]>0) {
        const int topHeight=std::max(showdoll ? invusage->height() : 0,
            status ? status->Widget()->minimumSizeHint().height() : 0)+8;
        sizes[1]=std::max(1,sizes[1]+sizes[0]-topHeight);
        sizes[0]=topHeight;
        vsplitter->setSizes(sizes);
    }
#else
    nhUse(showdoll);
#endif
}
'@
    $dollPattern='(?s)void NetHackQtMainWindow::resizePaperDoll\(bool showdoll\)\s*\{.*?\n\}(?=\s*void NetHackQtMainWindow::resizeEvent)'
    if(![regex]::IsMatch($s,$dollPattern)){throw 'Qt paper doll layout function anchor missing.'}
    $s=[regex]::Replace($s,$dollPattern,$paperDollLayout)
    foreach($required in @('setToolButtonStyle(Qt::ToolButtonTextUnderIcon)',
        'darkdungeon_toolbar_icon(commandName)','darkdungeon_layout_toolbars(this);','expandedTo(QSize(72,52))','std::min(1400,','std::min(900,',
        'vsplitter->setChildrenCollapsible(false)','vsplitter->setStretchFactor(1,1)',
        'this,SLOT(layout()),Qt::QueuedConnection','QTimer::singleShot(0,this,[this]{if(map && u.ux && u.uy)map->centerOnCursor();})',
        'const int topHeight=','addToolBar(Qt::BottomToolBarArea,toolbar);',
        'addToolBar(Qt::BottomToolBarArea,tools);','vsplitter->insertWidget(2, message->Widget());',
        'message->Widget()->setParent(vp);','hsplitter->replaceWidget(1, this->status->Widget());',
        'hsplitter->insertWidget(0, invusage);','hsplitter->insertWidget(1, status->Widget());',
        'const int messageHeight=lineHeight*3+12;','if (sizes.size()==3 && sizes[1]>0)')) {
        if(!$s.Contains($required)){throw "Qt UI patch anchor missing: $required"}
    }
    $s.Replace('setWindowTitle("NetHack-Qt");','setWindowTitle("DarkDungeon");')
}
Update-Source 'win\Qt\qt_stat.cpp' {
    param($s)
    $widthCap='int w = NetHackQtBind::mainWidget\(\)->width\(\);\s*setMaximumWidth\(w / 2\);'
    if(![regex]::IsMatch($s,$widthCap)){throw 'Qt status width cap anchor missing.'}
    $s=[regex]::Replace($s,$widthCap,'setMaximumWidth(QWIDGETSIZE_MAX);')
    if(![regex]::IsMatch($s,'QPixmap\(\w+_xpm\)')){throw 'Qt status icon scaling anchor missing.'}
    $s=[regex]::Replace($s,'QPixmap\((\w+_xpm)\)','QPixmap($1).scaled(24,24,Qt::KeepAspectRatio,Qt::SmoothTransformation)')
    $barLayoutAnchor='QHBoxLayout *hpbar = new QHBoxLayout;'
    if(!$s.Contains($barLayoutAnchor)){throw 'Qt hitpoint bar layout initialization anchor missing.'}
    $s=$s.Replace($barLayoutAnchor,'QHBoxLayout *hpbar = new QHBoxLayout; hpbar_layout=hpbar;')
    $s=$s.Replace('#include "qt_stat.h"',"#include `"qt_stat.h`"`n#include <algorithm>")
    $s=$s.Replace('hpbar_health.setFrameStyle(QFrame::NoFrame);','hpbar_health.setObjectName("adventureHealthBar"); hpbar_injury.setObjectName("adventureInjuryBar"); hpbar_health.setFrameStyle(QFrame::NoFrame);')
    $hitpointBar=@'
void NetHackQtStatusWindow::HitpointBar()
{
    if (!iflags.wc2_hitpointbar) {
        hpbar_health.hide();hpbar_injury.hide();alreadyfullhp=false;return;
    }
    const int maximum=std::max(1,Upolyd ? u.mhmax : u.uhpmax);
    const int health=std::clamp(Upolyd ? u.mh : u.uhp,0,maximum);
    const int pct=100*health/maximum;
    const char* colors[6][2]={{"black","black"},{"blue","darkBlue"},
        {"#00c000","gray"},{"yellow","darkGray"},{"orange","lightGray"},{"red","white"}};
    const int color=health==maximum ? 0 : (pct<10 || health<5) ? 5
        : (pct<25 || health<10) ? 4 : pct<50 ? 3 : pct<75 ? 2 : 1;
    // Layout stretch follows health without pinning the window's minimum width.
    hpbar_health.setSizePolicy(QSizePolicy::Ignored,QSizePolicy::Fixed);
    hpbar_injury.setSizePolicy(QSizePolicy::Ignored,QSizePolicy::Fixed);
    hpbar_health.setFixedHeight(9);hpbar_injury.setFixedHeight(3);
    hpbar_health.setStyleSheet(QString("QLabel { background-color: %1; color: transparent; }")
        .arg(QString::fromLatin1(colors[color][0])));
    hpbar_injury.setStyleSheet(QString("QLabel { background-color: %1; color: transparent; }")
        .arg(QString::fromLatin1(colors[color][1])));
    hpbar_layout->setAlignment(&hpbar_health,Qt::Alignment());
    hpbar_layout->setAlignment(&hpbar_injury,Qt::Alignment());
    hpbar_layout->setStretch(0,health);hpbar_layout->setStretch(1,maximum-health);
    hpbar_health.setVisible(health>0);hpbar_injury.setVisible(health<maximum);
    alreadyfullhp=health==maximum;
}
'@
    $barPattern='(?s)void NetHackQtStatusWindow::HitpointBar\(\)\s*\{.*?\n\}(?=\s*RESTORE_WARNING_FORMAT_NONLITERAL)'
    if(![regex]::IsMatch($s,$barPattern)){throw 'Qt responsive hitpoint bar anchor missing.'}
    $s=[regex]::Replace($s,$barPattern,$hitpointBar)
    $s.Replace('blank2.show(); // for vertical spacing: force the row to be non-empty','blank2.hide(); // Empty condition rows do not reserve map space.')
}
Update-Source 'win\Qt\qt_stat.h' {
    param($s)
    $anchor='QHBoxLayout *InitHitpointBar();'
    if(!$s.Contains($anchor)){throw 'Qt hitpoint bar layout member anchor missing.'}
    $s.Replace($anchor,"QHBoxLayout *hpbar_layout;`n        "+$anchor)
}
Update-Source 'win\Qt\qt_menu.cpp' {
    param($s)
    $anchor='return QSize(TotalWidth()+hsize, TotalHeight()+hsize);'
    if(!$s.Contains($anchor)){throw 'Qt text list size anchor missing.'}
    $s.Replace($anchor,@'
int rowsHeight=2*frameWidth();
    for(int row=0;row<count();++row)rowsHeight+=std::max(0,sizeHintForRow(row));
    return QSize(TotalWidth()+hsize+2*frameWidth(),rowsHeight+hsize);
'@)
}
Update-Source 'win\Qt\qt_set.cpp' {
    param($s)
    $s=$s.Replace('char *qt_tilewidth=NULL;', 'extern "C" char *qt_tilewidth=NULL;').Replace('char *qt_tileheight=NULL;', 'extern "C" char *qt_tileheight=NULL;').Replace('char *qt_fontsize=NULL;', 'extern "C" char *qt_fontsize=NULL;').Replace('int qt_compact_mode =', 'extern "C" int qt_compact_mode =')
    $s=$s.Replace('settings.value("tilewidth", 16)','settings.value("tilewidth", 48)').Replace('settings.value("tileheight", 16)','settings.value("tileheight", 48)').Replace('settings.value("dollwidth", 32)','settings.value("dollwidth", 24)').Replace('settings.value("dollheight", 32)','settings.value("dollheight", 24)')
    $s+@'

namespace nethack_qt_ {
void NetHackQtSettings::setMapTileSize(int width,int height) {
    QSignalBlocker widthBlock(tilewidth),heightBlock(tileheight);
    const QSize previous(tilewidth.value(),tileheight.value());
    tilewidth.setValue(width);tileheight.setValue(height);
    if(previous==QSize(tilewidth.value(),tileheight.value()))return;
    othersize=previous;resizeTiles();
}
}
'@
}
Update-Source 'win\Qt\qt_set.h' {param($s) $s.Replace('void toggleGlyphSize();','void toggleGlyphSize(); void setMapTileSize(int width,int height);')}
foreach ($graphicsSource in @('win\Qt\qt_glyph.cpp','win\Qt\qt_rip.cpp')) {
    Update-Source $graphicsSource {
        param($s)
        $s.Replace('#ifndef PIXMAPDIR', "#ifdef WIN32`r`n#define PIXMAPDIR `".`"`r`n#endif`r`n#ifndef PIXMAPDIR")
    }
}
foreach ($qtSource in $qtSources) {
    if ($qtSource.Name -in @('qt_set.cpp','qt_bind.cpp')) { continue }
    if ((Get-Content $qtSource.FullName -Raw).Contains('extern int qt_compact_mode;')) {
        Update-Source ('win\Qt\'+$qtSource.Name) { param($s) $s.Replace('extern int qt_compact_mode;', 'extern "C" int qt_compact_mode;') }
    }
}
Update-Source 'sys\windows\windmain.c' {
    param($s)
    $anchor='if (WINDOWPORT(mswin))'
    if(!$s.Contains($anchor)){throw 'Qt background refresh flag anchor missing.'}
    $s=$s.Replace($anchor,'if (WINDOWPORT(mswin) || WINDOWPORT(Qt))')
    $s = $s.Replace('windowtype = "tty";', 'windowtype = "Qt";')
    $s = $s.Replace('MAIN(int argc, char *argv[])', "MAIN(int argc, char *argv[])")
    $s = $s.Replace('int getlock_result = 0;', 'extern void darkdungeon_trace(const char*); int getlock_result = 0;')
    $s = $s.Replace('hwnd = GetDesktopWindow();','darkdungeon_trace("Windows main entry"); hwnd = GetDesktopWindow();')
    $s = $s.Replace('copy_sysconf_content();','darkdungeon_trace("System config"); copy_sysconf_content(); darkdungeon_trace("System config ready");')
    $s = $s.Replace('copy_symbols_content();','copy_symbols_content(); darkdungeon_trace("Symbols ready");')
    $s = $s.Replace('copy_config_content();','copy_config_content(); darkdungeon_trace("Player config ready");')
    $s = $s.Replace('initoptions();','darkdungeon_trace("Options"); initoptions(); darkdungeon_trace("Options ready");')
    $s = $s.Replace('init_nhwindows(&argc, argv);','darkdungeon_trace("Qt initialization"); init_nhwindows(&argc, argv); darkdungeon_trace("Qt ready");')
    $s=$s.Replace('plnamesuffix();', 'if (getenv("DARKDUNGEON_SMOKE_OUTPUT") && getenv("DARKDUNGEON_SMOKE_ASKNAME")) { svp.plname[0] = 0; gp.plnamelen = 0; } plnamesuffix();')
    [regex]::Replace($s,'    nethack_enter_consoletty\(\);\r?\n    consoletty_open\(1\);',"#ifndef QT_GRAPHICS`r`n    nethack_enter_consoletty();`r`n    consoletty_open(1);`r`n#endif")
}
Update-Source 'sys\windows\windsys.c' {
    param($s)
    $seedAnchor = '    status = BCryptOpenAlgorithmProvider(&hRa, BCRYPT_RNG_ALGORITHM,'
    if(!$s.Contains($seedAnchor)) { throw 'Smoke RNG patch anchor missing.' }
    $s = $s.Replace($seedAnchor,"#ifdef QT_GRAPHICS`r`n    if (getenv(`"DARKDUNGEON_SMOKE_OUTPUT`")) return 123456UL;`r`n#endif`r`n"+$seedAnchor)
    $anchor = '    append_slash(executable_path);'
    if (!$s.Contains($anchor)) { throw 'Windows storage patch anchor missing.' }
    $storage = @'
    append_slash(executable_path);
#if defined(QT_GRAPHICS) && !defined(SFCTOOL)
    {
        static char darkdungeon_data[MAX_PATH];
        const char *smoke = getenv("DARKDUNGEON_SMOKE_OUTPUT");
        int prefix;
        _putenv_s("NETHACKOPTIONS", "");
        _putenv_s("NETHACKRC", "");
        if (smoke && *smoke) {
            strcpy_s(darkdungeon_data, sizeof(darkdungeon_data), executable_path);
        } else {
            DWORD length = GetEnvironmentVariableA("LOCALAPPDATA", darkdungeon_data, sizeof(darkdungeon_data));
            if (!length || length >= sizeof(darkdungeon_data)) error("DarkDungeon: LOCALAPPDATA unavailable");
            strcat_s(darkdungeon_data, sizeof(darkdungeon_data), "\\DarkDungeon");
            if (!CreateDirectoryA(darkdungeon_data, NULL) && GetLastError() != ERROR_ALREADY_EXISTS)
                error("DarkDungeon: cannot create data directory");
            append_slash(darkdungeon_data);
            strcat_s(darkdungeon_data, sizeof(darkdungeon_data), "ja");
            if (!CreateDirectoryA(darkdungeon_data, NULL) && GetLastError() != ERROR_ALREADY_EXISTS)
                error("DarkDungeon: cannot create language data directory");
            append_slash(darkdungeon_data);
        }
        for (prefix = 0; prefix < PREFIX_COUNT; ++prefix) gf.fqn_prefix[prefix] = darkdungeon_data;
        gf.fqn_prefix[DATAPREFIX] = executable_path;
        return;
    }
#endif
'@
    if($Language -eq 'en') {
        $storage=[regex]::Replace($storage,'(?s)            strcat_s\(darkdungeon_data, sizeof\(darkdungeon_data\), "ja"\);.*?            append_slash\(darkdungeon_data\);\r?\n','')
    }
    $s.Replace($anchor,$storage)
}
if($Language -eq 'ja') {
    $translations=Get-Content (Join-Path $projectRoot 'translations\ui-ja.json') -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
    foreach($file in Get-ChildItem (Join-Path $snapshot 'win\Qt') -File | Where-Object {$_.Extension -in @('.cpp','.h')}) {
        $text=Get-Content $file.FullName -Raw -Encoding utf8
        foreach($entry in $translations.GetEnumerator()) {
            $sourceLiteral=ConvertTo-Json -InputObject ([string]$entry.Key) -Compress
            $targetLiteral=ConvertTo-Json -InputObject ([string]$entry.Value) -Compress
            $text=$text.Replace($sourceLiteral,$targetLiteral)
        }
        $text=$text.Replace('QString::fromLatin1','QString::fromUtf8').Replace('.toLatin1()', '.toUtf8()')
        $text="/* Japanese Qt text, modified for DarkDungeon 2026-10-08. See dat/license. */`n"+$text
        [IO.File]::WriteAllText($file.FullName,$text,[Text.UTF8Encoding]::new($false))
    }
    Update-Source 'win\Qt\qt_str.cpp' {
        param($s)
        # A UTF-8 buffer limit must not cut the middle of a code point.
        $s.Replace('len = max - 1;', "len = max - 1;`n            while (len && (static_cast<unsigned char>(src[len]) & 0xc0) == 0x80) --len;")
    }
    Update-Source 'win\Qt\qt_bind.cpp' {
        param($s)
        $function=$s.IndexOf('void NetHackQtBind::qt_getlin(')
        $start=$s.IndexOf('    // add the prompt with appended response to the message window', $function)
        $end=$s.IndexOf('    // unhighlight the prompt;', $start)
        if($start -lt 0 -or $end -lt 0){throw 'UTF-8 input echo patch anchor missing.'}
        $echo=@'
    // Preserve complete UTF-8 input instead of displaying individual bytes.
    QString response=QString::fromUtf8(line);
    if(line[0]=='\033')response="Esc";
    else if(line[0]==' ' && !line[1])response="Space";
    const QByteArray echoed=(QString::fromUtf8(prompt)+" "+response).toUtf8();
    NetHackQtBind::qt_putstr(WIN_MESSAGE, ATR_BOLD, echoed.constData());
'@
        $s.Substring(0,$start)+$echo+"`n"+$s.Substring($end)
    }
    Update-Source 'win\Qt\qt_plsel.cpp' {
        param($s)
        $s.Replace('str_copy(svp.plname, name_str, PL_NSIZ);', "str_copy(svp.plname, name_str, PL_NSIZ);`n    if (n.toUtf8().size() >= PL_NSIZ) {`n        auto* edit=qobject_cast<QLineEdit*>(sender());`n        if(edit){QSignalBlocker block(edit);edit->setText(QString::fromUtf8(svp.plname));}`n    }")
    }
    Update-Source 'win\Qt\qt_streq.cpp' {
        param($s)
        $s.Replace('input.setMaxLength(maxchar - 1);', @'
    input.setMaxLength(maxchar - 1);
    auto limitBytes=[this,maxchar](const QString& text) {
        const QByteArray bytes=text.toUtf8();
        if(bytes.size()<maxchar)return;
        QByteArray limited(maxchar,'\0');str_copy(limited.data(),bytes.constData(),maxchar);
        QSignalBlocker block(&input);input.setText(QString::fromUtf8(limited.constData()));
    };
    connect(&input,&QLineEdit::textChanged,this,limitBytes);
    limitBytes(input.text());
'@)
    }
    Update-Source 'win\Qt\qt_msg.cpp' {
        param($s)
        $s=$s.Replace('if (text.mid(1, 3) == "   ")','if (!text.isEmpty() && text.at(0).unicode() < 256 && text.mid(1, 3) == "   ")')
        $s=[regex]::Replace($s,'(?s)\s*if \(str.toUtf8\(\).length\(\) < \(int\) sizeof historybuf\) \{.*?\n\s*\}', "`n        str_copy(historybuf, str.toUtf8().constData(), sizeof historybuf);`n        return historybuf;")
        $s
    }
}
# Correct two syntax errors present in this pinned development snapshot.
foreach($level in @('Tou-strt.lua','Tou-loca.lua')) {
    $path=Join-Path $snapshot "dat\$level"
    $text=Get-Content $path -Raw -Encoding utf8
    $fixed=$text.Replace('montype="wumpus" x=', 'montype="wumpus", x=').Replace("end=`n", "end`n").Replace("end=`r`n", "end`r`n")
    if($fixed -ne $text) {[IO.File]::WriteAllText($path,"-- Syntax correction for DarkDungeon 2026-10-08. See dat/license.`n"+$fixed,[Text.UTF8Encoding]::new($false))}
}
Copy-Item (Join-Path $projectRoot 'src\qt_darkdungeon.*') (Join-Path $snapshot 'win\Qt') -Force
Copy-Item (Join-Path $projectRoot 'src\realtime_model.*') (Join-Path $snapshot 'win\Qt') -Force
foreach ($header in Get-ChildItem (Join-Path $snapshot 'win\Qt') -Filter '*.h') {
    if ((Get-Content $header.FullName -Raw) -match 'Q_OBJECT') {
        & (Join-Path $QtRoot 'bin\moc.exe') '-DQT_VERSION=0x060B02' ('-I'+(Join-Path $QtRoot 'include')) $header.FullName -o (Join-Path $snapshot ('src\'+$header.BaseName+'.moc'))
        if ($LASTEXITCODE) { throw "moc failed: $($header.Name)" }
    }
}
New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot 'docs') | Out-Null
$sourceCommit = & git -C $originalSource rev-parse HEAD
[IO.File]::WriteAllText((Join-Path $snapshot 'upstream-commit.txt'), "$sourceCommit`n",[Text.UTF8Encoding]::new($false))
Write-Host "Prepared Qt source snapshot: $snapshot"
