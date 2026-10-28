// DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#include <QtWidgets/QtWidgets>
#include <QtCore/QProcess>
#include "manual_profile.h"

int main(int argc,char** argv) {
    const QStringList rawArguments=ddprofile::arguments(argc,argv);
    if(rawArguments.size()==2 && rawArguments[1]=="--capabilities") {
        ddprofile::printCapabilities("launcher");return 0;
    }
    const int rawSeparator=rawArguments.indexOf("--");
    const QStringList options=rawSeparator>=0?rawArguments.mid(0,rawSeparator):rawArguments;
    const int profileFlag=options.indexOf("--manual-profile");
    QString manualRoot;
    if(profileFlag>=0) {
        const int languageFlag=options.indexOf("--language");
        if(options.count("--manual-profile")!=1 || profileFlag+1>=options.size() ||
           options.count("--language")!=1 || languageFlag+1>=options.size() || options.contains("--smoke") ||
           options.contains("--launcher-test"))return ddprofile::reject("manual profile requires --language en|ja and forbids smoke");
        const QString selected=options[languageFlag+1];
        if(selected!="en" && selected!="ja")return ddprofile::reject("invalid language");
        const QString base=QFileInfo(ddprofile::executablePath(argv[0])).absolutePath();
#ifdef Q_OS_WIN
        const QString engine=base+'/'+selected+"/DarkDungeon-"+selected+".exe";
#else
        const QString engine=base+'/'+selected+"/DarkDungeon-"+selected;
#endif
        manualRoot=QDir::fromNativeSeparators(options[profileFlag+1]);
        QString error=ddprofile::testEnvironmentError();
        if(error.isEmpty())error=ddprofile::validatePath(manualRoot,base);
        if(error.isEmpty())error=ddprofile::verifiedDeployment(engine,"qt-engine",selected);
        if(!error.isEmpty())return ddprofile::reject(error);
        // Do not start an old engine that could ignore profile isolation.
        QProcess query;query.setProgram(engine);query.setArguments({"--capabilities"});query.start();
        if(!query.waitForStarted(5000) || !query.waitForFinished(5000) ||
           query.exitStatus()!=QProcess::NormalExit || query.exitCode()!=0)
            return ddprofile::reject("engine capability query failed");
        const auto capability=QJsonDocument::fromJson(query.readAllStandardOutput()).object();
        if(capability["schema"]!="darkdungeon-capabilities-v1" || capability["frontend"]!="qt-engine" ||
           capability["manual_profile"].toInt()!=1 || capability["language"]!=selected)
            return ddprofile::reject("engine does not support this manual profile protocol");
        ddprofile::isolateSettings(manualRoot+'/'+selected+"/settings");
    }
    for(int i=1;i<options.size();++i)
        if((options[i].startsWith("--manual-") && options[i]!="--manual-profile") || options[i]=="--capabilities")
            return ddprofile::reject("invalid profile or capability arguments");
    if(rawSeparator>=0)for(const auto &argument:rawArguments.mid(rawSeparator+1))
        if(argument.startsWith("--manual-") || argument=="--capabilities")
            return ddprofile::reject("profile flags belong before --");
    QApplication app(argc,argv);
    app.setOrganizationName("DarkDungeon");app.setApplicationName("DarkDungeon");
    const QStringList arguments=app.arguments();
    const int separator=arguments.indexOf("--");
    const QStringList launcherArguments=separator>=0?arguments.mid(0,separator):arguments;
    const bool smoke=launcherArguments.contains("--smoke");
    const bool launcherTest=smoke && launcherArguments.contains("--launcher-test");
    if(smoke && qEnvironmentVariable("DARKDUNGEON_SMOKE_OUTPUT").isEmpty())return 2;
    if(smoke) {
        QSettings::setDefaultFormat(QSettings::IniFormat);
        QSettings::setPath(QSettings::IniFormat,QSettings::UserScope,qEnvironmentVariable("DARKDUNGEON_SMOKE_OUTPUT"));
    }
    QSettings settings;
    QString language=settings.value("language",QLocale::system().language()==QLocale::Japanese?"ja":"en").toString();
    if(language!="en" && language!="ja")language="en";
    const int flag=launcherArguments.indexOf("--language");
    if(flag>=0) {
        if(flag+1>=launcherArguments.size())return 2;
        language=launcherArguments[flag+1];
        if(language!="en" && language!="ja")return 2;
    } else {
        if(smoke && !launcherTest)return 2;
        QDialog dialog;dialog.setWindowTitle("DarkDungeon");dialog.resize(460,230);
        auto* layout=new QVBoxLayout(&dialog);
        auto* title=new QLabel("DarkDungeon",&dialog);title->setFont(QFont("Segoe UI",20,QFont::Bold));layout->addWidget(title);
        auto* label=new QLabel(&dialog);layout->addWidget(label);
        auto* choice=new QComboBox(&dialog);choice->addItem("English","en");choice->addItem(QString::fromUtf8("日本語"),"ja");
        choice->setCurrentIndex(language=="ja"?1:0);layout->addWidget(choice);
        auto* note=new QLabel(&dialog);note->setWordWrap(true);layout->addWidget(note);
        auto* buttons=new QDialogButtonBox(&dialog);
        auto* play=buttons->addButton(QDialogButtonBox::Ok);auto* quit=buttons->addButton(QDialogButtonBox::Cancel);layout->addWidget(buttons);
        auto refresh=[&] {
            const bool japanese=choice->currentData().toString()=="ja";
            label->setText(japanese?QString::fromUtf8("言語を選んで冒険を開始"):QString("Choose your adventure language"));
            note->setText(japanese?QString::fromUtf8("会話・名前・ヘルプも選択した言語で表示します。セーブは言語別に管理します。"):QString("Messages, names and help use the selected language. Adventures are saved separately for each language."));
            play->setText(japanese?QString::fromUtf8("開始"):QString("Play"));quit->setText(japanese?QString::fromUtf8("終了"):QString("Quit"));
        };
        QObject::connect(choice,&QComboBox::currentIndexChanged,&dialog,[&](int){refresh();});refresh();
        QObject::connect(buttons,&QDialogButtonBox::accepted,&dialog,&QDialog::accept);
        QObject::connect(buttons,&QDialogButtonBox::rejected,&dialog,&QDialog::reject);
        if(launcherTest) {
            QTimer::singleShot(150,&dialog,[&] {
                const QString output=qEnvironmentVariable("DARKDUNGEON_SMOKE_OUTPUT");
                choice->setCurrentIndex(0);
                if(play->text()!="Play" || !dialog.grab().save(output+"/launcher-en.png"))std::exit(7);
                choice->setCurrentIndex(1);
                if(play->text()!=QString::fromUtf8("開始") || !dialog.grab().save(output+"/launcher-ja.png"))std::exit(8);
                QFile report(output+"/launcher.txt");if(!report.open(QIODevice::WriteOnly))std::exit(9);
                report.write("Native Qt launcher: English/Japanese labels and language selection=pass\n");report.close();play->click();
            });
        }
        if(dialog.exec()!=QDialog::Accepted)return 0;
        language=choice->currentData().toString();
        settings.setValue("language",language);
    }
    const QString directory=QCoreApplication::applicationDirPath()+"/"+language;
#ifdef Q_OS_WIN
    const QString executable=directory+"/DarkDungeon-"+language+".exe";
#else
    const QString executable=directory+"/DarkDungeon-"+language;
#endif
    if(!QFileInfo::exists(executable)) {
        if(!smoke)QMessageBox::critical(nullptr,"DarkDungeon",language=="ja"?QString::fromUtf8("選択した言語のゲーム本体が見つかりません。"):QString("The selected game engine is missing."));
        return 3;
    }
    QStringList engineArguments;
    if(separator>=0)engineArguments=arguments.mid(separator+1);
    if(!manualRoot.isEmpty())engineArguments.prepend(manualRoot),engineArguments.prepend("--manual-profile");
    QProcessEnvironment environment=QProcessEnvironment::systemEnvironment();
#ifndef Q_OS_WIN
    // Unix engines read ~/.nethackrc by default; use the engine's own options file instead.
    environment.insert("NETHACKOPTIONS",directory+"/darkdungeonrc");
#endif
    if(!manualRoot.isEmpty()) {
        // Own the child until it exits. This keeps startup rejection diagnostics
        // available without detaching, timing out, or killing a manual game.
        QProcess engine;engine.setProgram(executable);engine.setArguments(engineArguments);
        engine.setWorkingDirectory(directory);engine.setProcessEnvironment(environment);
        engine.start();
        if(!engine.waitForStarted(10000))return ddprofile::reject("cannot start game process");
        engine.waitForFinished(-1);
        const auto diagnostic=engine.readAllStandardError();
        std::fwrite(diagnostic.constData(),1,diagnostic.size(),stderr);
        return engine.exitStatus()==QProcess::NormalExit?engine.exitCode():6;
    }
    if(smoke) {
        QProcess engine;engine.setProgram(executable);engine.setArguments(engineArguments);engine.setWorkingDirectory(directory);
        engine.setProcessEnvironment(environment);
        engine.setProcessChannelMode(QProcess::ForwardedChannels);engine.start();
        if(!engine.waitForStarted(10000))return 4;
        if(!engine.waitForFinished(40000)){engine.kill();engine.waitForFinished(5000);return 5;}
        return engine.exitStatus()==QProcess::NormalExit?engine.exitCode():6;
    }
    QProcess engine;engine.setProgram(executable);engine.setArguments(engineArguments);
    engine.setWorkingDirectory(directory);engine.setProcessEnvironment(environment);
    return engine.startDetached()?0:4;
}
