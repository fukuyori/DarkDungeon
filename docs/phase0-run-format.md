# フェーズ0：R5のenvelopeとrun観測の形式の統一（#166）

2026-10-29。#106で、runの検査器は0番の観測に停止点の種類（`boundary_kind`）と窓口（`port_function`）を必須にした。一方、R5のenvelopeのコア記録はbarrierだけを必須にしていた。そのため、R5では合格するenvelopeがrunの起点として拒否される場合があった。レモンの決定に従い、次のように揃えた。

## レモンの決定

| 項目 | 決定 |
|---|---|
| R5のコア記録の停止点 | R5でも必須にする |
| runの報告への許可表のSHA | 記録する |

## 変更

- `tools/rendering-fixtures/fixture_protocol.py`
  - `validate_core`は、`boundary_kind=command-ready`と、許可表（`docs/data/rendering-boundary-ports.json`）でcommand-readyとして許された`port_function`を必須にした。barrierの条件は従来どおり。
  - `validate_envelope`は、ファイルを1回読み、そのバイト列からSHAの計算と解析を行う（#106再レビューN5の残り）。
- `tools/rendering-fixtures/build-fixture-plan.py`：R5のrun_report_contractの必須項目に`boundary_ports_sha256`を加えた。
- `tools/rendering-invariants/boundary.py`
  - runの最上位の項目を、固定の一覧ではなくR5計画のrun_report_contractから作るようにした。
  - `validate_run_origin`は、runの`boundary_ports_sha256`がディスク上の許可表のSHAと一致することを検査する。許可表は1回の読み取りからSHAの計算と解析を行う。
- 合成検査：R5の形式検査に3項目（コア記録の種類がprompt-paused、窓口がyn、窓口なし）、停止点の検査に2項目（別の許可表を名乗るrun、許可表のSHAのないrun）を加えた。

## preflight-rejectionとrenderer-input（レビューM1、レモンの決定）

準備の段階で拒否されたケース（`preflight-rejection`）と描画専用の入力（`renderer-input`）のenvelopeは、ゲームの停止点を表さない。レモンの決定（「コア観測を禁止する」）により、この2種類はコア観測とRNG観測を持てない。`validate_envelope`は、持っていれば`Preflight rejection and renderer input carry no core or RNG observation`で拒否する。runの起点にもできない（#106）。

## 過去のrunとenvelopeを検証するとき

runは照合に使った許可表のSHAを持つ。許可表を作り直した後に過去のrunを検証するときは、そのSHAの許可表を含む作成時のcommitへ作業ツリーを戻して検証する（projectionと同じ方針。[再監査の記録](phase0-source-reaudit.md)の「今後の運用」）。実際のrunはまだない（runtime_ready=false）。

runの`boundary_ports_sha256`はファイルのSHA-256で、GitのblobのIDではない。作成時のcommitを探すときは、作り直しのたびに残す記録（[再監査の記録](phase0-source-reaudit.md)のblob IDと新旧SHAの表、`artifacts`の`before-sha256.json`/`after-sha256.json`、各工程の記録）でSHAとcommitを対応させる。単独のenvelopeは許可表のSHAを持たないため、作成時の記録（R5計画・R6定義のSHA）から同じ方法でcommitを探す。

## 残る隙

`read_once`は、SHAを計算したバイト列と解析するバイト列を同じにする。一方、`checked_file`によるリンク・ハードリンク・root外の検査と、ファイルの読み取りは別の操作であり、その間にファイルを差し替えられる隙は残る。内容は宣言されたSHAとの一致が必要なので、影響は「同じ内容のファイルをリンク経由で読ませる」程度に限られる。ハンドルを1回開いて`fstat`で照合する方法は未実装である。

## 作り直しと検査

手順どおり、R5計画→R6調査表→停止点の許可表→R6定義→R7定義の順に作業した。R6調査表と許可表は`--check`に成功したため作り直していない。

| ファイル | 新SHA-256 |
|---|---|
| rendering-fixture-plan.json | b5ed0fd9dd5e7cfeeaf5434252bd546b245ab7e0d74714a99b50d8231914f311 |
| rendering-invariant-contract.json | f92235504e063459f85c75a76bfefc508cfc3e784ec968c41115c2a76d69f40b |
| rendering-comparison-contract.json | 91db8a889f0de15f51265d7890317386da432f36d62010e9d96222dfa62d5d10 |

R5計画の変更はrun_report_contractへの1項目の追加だけ、R6/R7定義の変更は参照するSHAだけである。

記録は`artifacts/r5-run-format-20261029`。すべて成功した：R5の計画照合と形式検査58項目、R6調査表の照合、許可表の照合、R6定義の照合と合成検査66項目、停止点の合成検査52項目、R7定義の照合と合成検査62項目、撮影記録・geometry・OS拡大率の検査。レビュー対応の後に再実行し（`*-2.json`）、R5の形式検査は61項目（preflight-rejectionの観測の拒否、種類のないコア記録、窓口がリストの場合を追加）、停止点の合成検査は54項目（preflight-rejectionの観測の拒否、許可表の引数とファイルの不一致を追加）で、すべて成功した。R5の形式検査の記録は、使った許可表のSHA（`boundary_ports_sha256`）を持つ。

`tools/rendering-fixtures`の3ファイルは作業ツリーでLFだったため、新しく取り出したときと同じCRLFへ揃え、主な検査を再実行して成功を確認した（`*-eol.json`）。

## レビュー

[Claude Code初回レビュー](../artifacts/claude-r5-run-format-review-20261029.txt)は条件付きで完了可。M1（特殊なenvelopeの扱い）はレモンの決定で対応した。M2（#166前の記述）を直し、M3（R5の記録に許可表のSHA）を加えた。L1（許可表の複数回の読み取り）は、runの検査器が1回読んだ許可表をR5の検査へ渡し、引数の許可表がファイルと違えば拒否するようにした。L2（型や許可表の欠落）は`ValueError`で拒否するようにした。L4（R5計画の照合なしの読み取り）は、R6定義が結ぶR5計画のSHAと照合してから使うようにした。L3とL5は上記に記録した。

[最終確認](../artifacts/claude-r5-run-format-final-20261029.txt)は完了可と判定した。低以下の指摘N1〜N6にも対応した。仕様書とREADMEに特殊なenvelopeの規則を追記し（N1）、許可表からcommand-readyの集合を作る処理を`command_ready_ports`へ一本化し（N2）、許可表の項目の型を検査し（N3）、合成検査を加え（N4：コア観測を持つrenderer-inputの拒否、許可表の欠落・壊れたJSON・schema違いの拒否）、文書の細かなずれを直し（N5）、検査の名前に値を加えた（N6）。再実行した結果はすべて成功し、R5の形式検査は66項目になった（`*-3.json`）。
