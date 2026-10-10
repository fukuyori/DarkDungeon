// DarkDungeon is distributed under the NetHack General Public License; see LICENSE.
#include <QtWidgets/QtWidgets>
#include <QtCore/QProcess>

int main(int argc,char** argv) {
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
    QProcessEnvironment environment=QProcessEnvironment::systemEnvironment();
#ifndef Q_OS_WIN
    // Unix engines read ~/.nethackrc by default; use the engine's own options file instead.
    environment.insert("NETHACKOPTIONS",directory+"/darkdungeonrc");
#endif
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
