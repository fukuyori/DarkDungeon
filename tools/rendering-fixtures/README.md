# R5 再現要件・静的レイアウト・envelope検査

[R5仕様](../../docs/rendering-reproduction-contract.md)用の静的ツールと、末尾に記載した0-1の起動検査を置く。静的ツールは通常のゲームやセーブを起動・生成・復元しない。Cプローブはヘッダーの定数/sizeofを表示する小さなプログラムで、RNGを初期化しない。

```powershell
.\tools\rendering-fixtures\Export-Layout.ps1 -Language en -OutputDirectory .\artifacts\r6-layout-followup-20261028\en
.\tools\rendering-fixtures\Export-Layout.ps1 -Language ja -OutputDirectory .\artifacts\r6-layout-followup-20261028\ja
python -X utf8 -B tools/rendering-fixtures/build-fixture-plan.py artifacts/r6-layout-followup-20261028
python -X utf8 -B tools/rendering-fixtures/build-fixture-plan.py artifacts/r6-layout-followup-20261028 --check
python -X utf8 -B tools/rendering-fixtures/verify-fixture-plan.py artifacts/r6-layout-followup-20261028
```

Windows x64の生成済み英日ソース、Visual Studio C++、Pythonが必要。プローブ結果はartifactsへ、要件表はdocs/data/rendering-fixture-plan.jsonへ出す。R3/R4の定義、RNGレイアウト、主な入力/プローブのハッシュが変われば照合を停止する。診断用の構造体サイズやヘッダー定数は実際のセーブヘッダーや互換性の証明ではない。

コンパイル用マクロは診断用に指定した値で、実ゲームの全ビルド設定との一致は未検証と記録する。source_rootはリポジトリ相対パス。コアの時計・保存・表示と独自フロントエンドもハッシュ照合する。出力を保存するときは上記のUTF-8モードとPowerShellのSet-Content -Encoding utf8を使う。検査記録にはツール自体のSHA-256も含む。

要件表は25ケース群と2,287品質対象をつなぐ計画。すべて未割当でruntime_ready=false。Q01の原画由来はR1/R4の証拠を使う。他のQは候補ケース群へつなぐが、すべての群をすべての素材へ強制するわけではない。具体的な割当と根拠付き非該当、実際のゲームでの前提確認はこれから行う。

fixture_protocol.pyは読み取り専用の形式検査で、NetHackセーブをデコードしない。相対パス・ハッシュ・リンク・結合情報と、ISAAC64の両系列を検査する。64bit語は16桁の16進文字列で表す。RNG観測は巻き戻し/注入に使わない。正常なenvelopeでもゲーム起動・復元や再現の成功を返さない。

envelopeは言語・build_id・checkpoint_id/phaseを持つ起点の1停止点だけを表す。起点のコア記録は、R6の停止点の許可表でcommand-readyとして許された停止点（`boundary_kind`と`port_function`）を持つ。preflight-rejectionとrenderer-inputのenvelopeは、コア観測とRNG観測を持たない（#166）。ファイルは1回の読み取りからSHAの計算と解析を行う。F18/F19はcontrolled providerを必須にするが、形式検査で実制御を証明するわけではない。前後/入力ごとの観測列、全期間のシード要求と時計/TZ/DSTの読取はR5のrun_report_contractで最低形式を定義し、生成・比較器と実観測はフェーズ0以降で実装する。Windowsのreparse属性でjunctionを検出するため、is_junctionのないPythonでも無検査にはしない。

verify-fixture-plan.pyはartifacts内に合成データだけの一時ディレクトリを作り、試験後に片づける。日本語のファイル名、ディレクトリ外への参照、ハッシュ不一致、片方だけのRNG、別セーブの観測、注入、renderer-supportとゲーム実行の混同等を検査する。試験用の.saveという名前の内容は明示したダミー文字列で、本物のゲームセーブではない。現在のゲームが日本語の保存先や新しいプロフィールに対応した証拠にもならない。

実fixtureの凍結・コピー・起動・計測機能はフェーズ0以降で実装する。既存のSMOKEは自動操作と固定シードを伴うため、通常の手動確認や正確なRNG継続の代用にしない。CLIの未実装セッション機能へ依存させない。

R6で旧セーブ引継ぎ不要の利用者指示を反映した。現在の保存マトリクスは改修後の新規セーブを用いる5方向。RNGなしでもコア観測の形式/metadata/barrierを検査し、producer_engine_sha256と元セーブSHAをenvelopeの宣言値へ照合する。実行ファイルをハッシュした証拠ではなくengine_file_hashed=falseを返す。実プロセス/実行ファイルの照合はphase0のrun-report生成器が必要。検査出力はcreated_utcを持ち、プローブ監視にはsrc/qt_darkdungeon.cpp等も含む。

## 0-1の通常手動起動の検査

`verify-manual-startup.py --build-root <確認版> --evidence <新規証拠フォルダー> --snapshot-only` を操作前に一度実行する。手動操作後、同じ引数から `--snapshot-only` を外して実行すると、実行ファイルの機能照会・拒否経路と通常データの内容/設定値の前後を検査する。`--compare-only` は前後照合だけを行う。原本snapshotは上書きしない。通常の新規ゲームと保存・再開は別途ネイティブ画面で確認する。

`manual-lock-probe.cpp` はQt Coreだけをリンクする検査用補助プログラム。指定したQLockFileを取得して `_Exit(0)` で終了し、実ゲームを終了させずに孤立したロックを作る。`--probe-helper <コンパイルしたexe>` を起動検査へ渡すと、未対応本体への照会を配置manifest欠落・SHA不一致の段階で止める2件も検査する。補助プログラムと生成物を通常配布へ入れない。

[起動手順](../../docs/phase0-manual-play.md)と[2026-10-28の結果](../../docs/phase0-manual-verification.md)に、実行した確認版、ビルド条件、画面・保存・排他・実効パスの証拠と未確認範囲を分けて記録した。これらの手動確認をR5の完全な制御/観測やR6/R7の受入済み基準版へ昇格させない。
