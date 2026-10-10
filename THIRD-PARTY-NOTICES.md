# 第三者ソフトウェアの表示

DarkDungeon は NetHack の派生物です。DarkDungeon 自身のコード・スクリプト・ドキュメントを含め、全体を [NetHack General Public License](LICENSE)（以下 NGPL）で配布します。ソースは https://github.com/fukuyori/DarkDungeon で公開します。

配布物には、次の第三者のソフトウェアを含みます。各ライセンス文書は配布物の `licenses` フォルダに同梱します。

| 構成要素 | 用途 | ライセンス | 同梱する文書 |
|---|---|---|---|
| NetHack 5.0.1（開発途中版、指定コミットは `provenance.json`） | ゲーム本体、タイル、データ | NGPL | `licenses/NetHack.txt` |
| JNetHack の日本語訳（DarkDungeon で NetHack 5.0.1 へ移植） | 日本語版の文章 | NGPL | `licenses/NetHack.txt`、`licenses/localization.md` |
| Lua（NetHack に同梱） | レベルデータの実行 | MIT License | `licenses/Lua-MIT.txt` |
| Qt 6.11.2（Core、Gui、Widgets、Network とプラグイン） | 画面と入力 | LGPL-3.0-only | `licenses/LGPL-3.0-only.txt`、`licenses/GPL-3.0-only.txt` |
| Microsoft Visual C++ ランタイム（`vcruntime140*.dll`、`msvcp140*.dll`、`concrt140.dll`、`vccorlib140.dll`） | 実行時ライブラリ | Visual Studio の Distributable Code（下記） | なし |

## NetHack と NGPL

- NetHack と JNetHack の著作権表示は、元のソースのまま保持します。
- DarkDungeon が変更した NetHack のファイルには、変更日を記載します。変更は `scripts/prepare-source.ps1` と `patches/` で再現できます。
- NGPL の条件に従い、配布する実行ファイルに対応するソースを上記の GitHub で入手できるようにします。

## Qt（LGPL-3.0）

- Qt は変更せず、DLL として動的にリンクしています。利用者は同じバージョン系列の Qt の DLL に差し替えられます。
- Qt のソースは The Qt Company の配布元（https://download.qt.io/）から入手できます。

## 画像素材

- 主人公・敵・品物は NetHack のタイルを使います。
- 壁・床・ツールバーのアイコンは、DarkDungeon のソースに含まれる描画コードで生成します。外部の画像ファイルは同梱しません。

## Microsoft のファイル（2026-10-10 確認）

Microsoft のファイルは NGPL の対象ではなく、Microsoft のライセンス条項に従います。どのファイルも変更せずに同梱します。

- **Visual C++ ランタイム**:Visual Studio の Distributable Code の一覧（https://learn.microsoft.com/visualstudio/releases/2026/redistribution 、VS 内の `Licenses\1041\Redist.txt` が参照）に「`[VisualStudioFolder]\VC\redist` 以下のファイルは、変更せずにプログラムと一緒に配布できる」とあります。`debug_nonredist` は配布できません。DarkDungeon は `VC\Redist\MSVC\<version>\x64\Microsoft.VC*.CRT` の製品版 DLL だけを同梱します。
- **配布の条件**:Visual Studio の Distributable Code には、プログラムに主要な機能を加えること、著作権表示を変更しないこと、利用者に同程度に保護する条件へ同意させることなどの条件があると見られます。Community 版の条文そのものは未確認です。

## 同梱しないもの

Qt の描画用に windeployqt が配置する `D3Dcompiler_47.dll`、`dxcompiler.dll`、`dxil.dll`（Windows SDK）と `opengl32sw.dll`（Mesa llvmpipe）は、`--no-system-d3d-compiler`、`--no-system-dxc-compiler`、`--no-opengl-sw` で配置しません（2026-10-10）。

## 要確認の項目

- Visual Studio Community 版のライセンス条文の Distributable Code の節と、DarkDungeon の NGPL での配布との関係。