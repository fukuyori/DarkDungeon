# DarkDungeon

[English](README.md) | 日本語

NetHack をもとにした Windows / C++ / Qt の試作です。

ソース: https://github.com/fukuyori/DarkDungeon

## 起動

`dist/DarkDungeon/DarkDungeon.exe` を実行し、English / 日本語を選んで開始します。メニューだけでなく、会話・品物と敵の名前・クエスト・ヘルプも選択した言語を使います。通常の冒険は NetHack の操作です。`ヘルプ > 遊び方`にも両言語のガイドを用意しています。

ゲーム内の `Language / 言語` の選択は次回起動時に適用します。冒険を保存して終了し、ランチャーから再起動してください。英語と日本語は別々のゲーム本体・セーブを使います。同じセーブの言語を途中で切り替える機能ではありません。

ツールバーは24ピクセルのアイコンの下に操作名を表示し、横幅に応じて1段・2段を自動で切り替えます。ボタンから基本動作・持ち物・武器・道具・容器の中身・扉の開閉・階段の上下などを選べます。ステータス欄も横幅の変更に追従します。迷宮のタイルは初期48ピクセルで、「拡大／縮小」で調整できます。従来の16ピクセルのタイルと32ピクセルの装備欄は、初回起動で48／24ピクセルへ変更します。それ以外の指定サイズは維持します。画面設定は両言語で共有します。

画面は上から装備とステータス、迷宮、メッセージ、ツールバーの順です。メッセージ欄は透過せず、横幅いっぱいに表示します。

通常の冒険でSpaceを押すと、箱・袋の中身を見る → 拾う → 階段 → 隣接した閉じた扉、の順で基本動作を選びます。対象がなければ1ターン待ちます。複数の対象は選択または方向確認を行います。

## 表示

壁は厚みのある濃い灰色の石積み、床は明るい灰色の石畳で描画します。部屋や通路の明るさの違いを残します。キャラクターと品物は地形の上に背景を透過して描画し、足元の床や階段が見えるようにします。

主人公と一部の怪物は、`sprites/` のスプライトで表示します。主人公は職業・種族・性別の部位を重ね、マントの色で属性（秩序は青、中立は緑、混沌は赤）を表します。1マス移動すると歩き、攻撃すると振りかぶりと振り下ろしの短いアニメーションを再生します。スプライトがない組み合わせや怪物、変化中・幻覚中・飲み込まれた場面は NetHack のタイルで表示します。スプライトは `tools/sprites/` の Node.js スクリプトで生成したものです。

英語のセーブ・設定・スコアは `%LOCALAPPDATA%\DarkDungeon`、日本語はその下の `ja` に保存します。元の NetHack の保存先とは分離しています。

## ビルド

PowerShell 7 から実行します。Visual Studio の C++ 開発環境と Qt 6.11.2 `msvc2022_64` および Qt のソースライセンスファイルを利用します。Qt の配置は `-QtRoot`、NetHack の配置は `-NetHackSource` で指定できます。

```powershell
.\scripts\build-release.ps1
.\scripts\verify-runtime.ps1 -Language en -Native
.\scripts\verify-runtime.ps1 -Language ja -Native
```

ビルドは英語のソースを `build/nethack`、日本語を `build/nethack-ja` に用意します。既定で両言語とランチャーをビルドします。`-Language en` / `ja` はゲーム本体だけをビルドする指定です。日本語版はJNetHackの翻訳を指定NetHack 5.0.1へ移植したパッチを使います。取得元・ライセンス・保存互換性は [言語対応の説明](docs/localization.md) に記録しています。

Luaデータの構文と全職業のクエスト表はビルド時に検査します。起動確認は `artifacts` 配下の別コピーで行い、通常のセーブ・設定を使用しません。移動・言語別の品物名とヘルプ・レベルの敵／品物ID・スプライトの読み込みとアニメーション・保存と再開を確認し、画面を保存します。日本語では入力の表示とUTF-8の切り詰め境界も確認します。
`-Clean` でコンパイラ出力を作り直せます。ツールチェーン／Makefileの変更時もコンパイラ出力を作り直します。出力の `provenance.json` に参照コミットと日本語パッチのSHA-256を記録します。
通常の起動中に別の配置先で確認する場合は、`build-release.ps1 -OutputRoot artifacts/ui-preview` と `verify-runtime.ps1 -ApplicationRoot artifacts/ui-preview` を使えます。配置先はプロジェクトの `dist`・`artifacts`・`build` の子ディレクトリに限ります。
`DARKDUNGEON_SMOKE_OUTPUT` は自動テスト専用です。設定された起動では固定シードとテスト用保存先を使い、入力検証後に終了します。通常のプレイ時には設定しません。NetHack用の `NETHACKOPTIONS` / `NETHACKRC` は引き継ぎません。

## Linux・macOS でのビルド

Linux（対象: Ubuntu）と macOS（Apple Silicon）は、NetHack 自身の Unix 用 Makefile と Qt 6 でビルドします。必要なものは bash、git、GNU make、C/C++ コンパイラー、perl、pkg-config、Qt 6（Core・Gui・Widgets）です。Ubuntu では `qt6-base-dev` と `qt6-base-dev-tools`、macOS では Homebrew の `qt` と `pkg-config` を使います（Qt が別の場所にある場合は `QTDIR` を指定）。NetHack のソースは、このプロジェクトと同じ階層にある git の作業コピーで、コミット `cb453720b1cdff0134f0872d8706fb20a764b0de` である必要があります（別の場所なら `--nethack-source` で指定）。

```bash
bash scripts/build-unix.sh                 # 両言語とランチャー
bash scripts/build-unix.sh --language en   # 英語のゲーム本体だけ
./dist-unix/DarkDungeon/DarkDungeon
```

出力先は `dist-unix/DarkDungeon` です。ランチャーと、`en`・`ja` の各フォルダーにゲーム本体・データ・セーブ・設定を置きます。ランチャーは `NETHACKOPTIONS` をゲーム本体の `darkdungeonrc` に向けるため、`~/.nethackrc` は使いません。再ビルドはフォルダーを上書き更新し、セーブは残します。

Windows と共通のソース変更は `patches/darkdungeon-unix-en.patch` と `patches/darkdungeon-unix-ja.patch` から適用します。`scripts/prepare-source.ps1` を変更したら、Windows でビルドしてから `scripts/export-unix-patches.ps1` で作り直します。自動の起動検査（`verify-runtime.ps1`）とインストーラーは、現在 Windows だけに対応しています。

## インストーラー

```powershell
.\scripts\build-installer.ps1 -PrepareOnly
.\scripts\build-installer.ps1 -Sign
```

`-PrepareOnly` は定義とステージを用意するだけです。`-Sign` は `CODESIGN_CERT` の値でランチャー・両言語のゲーム実行ファイル、インストーラー、アンインストーラーを署名します。値は証明書のサブジェクト名、SHA-1 拇印、PFX/P12 ファイルのパスを扱います。PFX のパスワードは必要なら `CODESIGN_PASSWORD` を使用します。ビルド出力の署名は変更せず、署名用ステージのコピーを署名します。

## ライセンス

DarkDungeon は NetHack の派生物として、スプライトと生成スクリプトを含む全体を [NetHack General Public License](LICENSE) で配布します。同梱する第三者のソフトウェアとその条件は [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) にまとめています。NetHack 5.0.1 は開発途中のソースを使っています。試作の範囲は [設計メモ](docs/design.md) を参照してください。
