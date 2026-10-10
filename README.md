# DarkDungeon

NetHack をもとに、ターン制の冒険とリアルタイムのアクションを組み合わせる Windows / C++ / Qt の試作です。通常の NetHack 冒険と、同じ階の地形で操作を試せるリアルタイムアリーナを持ちます。混合ゲームの細かな規則はまだ決めていません。

ソース: https://github.com/fukuyori/DarkDungeon

## 起動

`dist/DarkDungeon/DarkDungeon.exe` を実行し、English / 日本語を選んで開始します。メニューだけでなく、会話・品物と敵の名前・クエスト・ヘルプも選択した言語を使います。通常の冒険は NetHack の操作です。`練習 > リアルタイム練習`（英語: `Practice > Realtime practice`）で操作の試作に入れます。`ヘルプ > 遊び方`にも両言語のガイドを用意しています。

ゲーム内の `Language / 言語` の選択は次回起動時に適用します。冒険を保存して終了し、ランチャーから再起動してください。英語と日本語は別々のゲーム本体・セーブを使います。同じセーブの言語を途中で切り替える機能ではありません。

ツールバーは24ピクセルのアイコンの下に操作名を表示し、横幅に応じて1段・2段を自動で切り替えます。ボタンから基本動作・持ち物・武器・道具・容器の中身・扉の開閉・階段の上下などを選べます。ステータス欄も横幅の変更に追従します。迷宮のタイルは初期48ピクセルで、「拡大／縮小」で調整できます。従来の16ピクセルのタイルと32ピクセルの装備欄は、初回起動で48／24ピクセルへ変更します。それ以外の指定サイズは維持します。画面設定は両言語で共有します。

画面は上から装備とステータス、迷宮、メッセージ、ツールバーの順です。メッセージ欄は透過せず、横幅いっぱいに表示します。

通常の冒険でSpaceを押すと、箱・袋の中身を見る → 拾う → 階段 → 隣接した閉じた扉、の順で基本動作を選びます。対象がなければ1ターン待ちます。複数の対象は選択または方向確認を行います。リアルタイム練習のSpaceは剣の操作です。

主人公・敵・品物は NetHack のタイルを使い、地形の上に背景を透過して描画し、足元の床や階段が見えるようにします。壁は厚みのある濃い灰色の石積み、床は明るい灰色の石畳で描画します。部屋や通路の明るさの違いを残し、リアルタイム練習にも同じ石の模様を使います。

| アリーナの操作 | キー |
|---|---|
| 移動 | 矢印 / WASD |
| 剣を抜く・構える | Space を押している間 |
| 一時停止・再開 | P |
| アリーナを最初の状態に戻す | R |
| 元の冒険に戻る | Esc |

アリーナを閉じると試作中の状態は消え、通常の冒険には反映されません。
英語のセーブ・設定・スコアは `%LOCALAPPDATA%\DarkDungeon`、日本語はその下の `ja` に保存します。元の NetHack の保存先とは分離しています。現在のアリーナは階の未探索部分も表示する、操作検討用のモードです。

## ビルド

PowerShell 7 から実行します。Visual Studio の C++ 開発環境と Qt 6.11.2 `msvc2022_64` および Qt のソースライセンスファイルを利用します。Qt の配置は `-QtRoot`、NetHack の配置は `-NetHackSource` で指定できます。

```powershell
.\scripts\build-release.ps1
.\scripts\test-realtime.ps1
.\scripts\verify-runtime.ps1 -Language en -Native
.\scripts\verify-runtime.ps1 -Language ja -Native
.\scripts\verify-runtime.ps1 -Language ja
```

ビルドは英語のソースを `build/nethack`、日本語を `build/nethack-ja` に用意します。既定で両言語とランチャーをビルドします。`-Language en` / `ja` はゲーム本体だけをビルドする指定です。日本語版はJNetHackの翻訳を指定NetHack 5.0.1へ移植したパッチを使います。取得元・ライセンス・保存互換性は [言語対応の説明](docs/localization.md) に記録しています。

Luaデータの構文と全職業のクエスト表はビルド時に検査します。起動確認は `artifacts` 配下の別コピーで行い、通常のセーブ・設定を使用しません。移動・練習操作・言語別の品物名とヘルプ・レベルの敵／品物ID・保存と再開を確認し、画面を保存します。日本語では入力の表示とUTF-8の切り詰め境界も確認します。
`-Clean` でコンパイラ出力を作り直せます。ツールチェーン／Makefileの変更時もコンパイラ出力を作り直します。出力の `provenance.json` に参照コミットと日本語パッチのSHA-256を記録します。
通常の起動中に別の配置先で確認する場合は、`build-release.ps1 -OutputRoot artifacts/ui-preview` と `verify-runtime.ps1 -ApplicationRoot artifacts/ui-preview` を使えます。配置先はプロジェクトの `dist`・`artifacts`・`build` の子ディレクトリに限ります。
`DARKDUNGEON_SMOKE_OUTPUT` は自動テスト専用です。設定された起動では固定シードとテスト用保存先を使い、入力検証後に終了します。通常のプレイ時には設定しません。NetHack用の `NETHACKOPTIONS` / `NETHACKRC` は引き継ぎません。

## インストーラー

```powershell
.\scripts\build-installer.ps1 -PrepareOnly
.\scripts\build-installer.ps1 -Sign
```

`-PrepareOnly` は定義とステージを用意するだけです。`-Sign` は `CODESIGN_CERT` の値でランチャー・両言語のゲーム実行ファイル、インストーラー、アンインストーラーを署名します。値は証明書のサブジェクト名、SHA-1 拇印、PFX/P12 ファイルのパスを扱います。PFX のパスワードは必要なら `CODESIGN_PASSWORD` を使用します。ビルド出力の署名は変更せず、署名用ステージのコピーを署名します。

## ライセンス

DarkDungeon は NetHack の派生物として、全体を [NetHack General Public License](LICENSE) で配布します。同梱する第三者のソフトウェアとその条件は [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) にまとめています。NetHack 5.0.1 は開発途中のソースを使っています。試作の範囲は [設計メモ](docs/design.md) を参照してください。
