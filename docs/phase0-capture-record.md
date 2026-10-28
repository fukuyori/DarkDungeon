# 0-2 撮影記録の分類検査（#115）

2026-10-28。分類・承認情報の検査器を実装した。撮影機能、実画像、正式な比較基準は未完成である。

## 実装と確認

[検査器と形式](../tools/rendering-comparison/README.md)は、分類・適合区分・役割・承認の状態と用途・理由・日付・画風版/SHAを検査する。実画像や本人の承認を認証する機能ではない。既存の制作台帳・比較定義の凍結JSONは変更していない。

- 合成データ検査：正常6件、不正73件。`artifacts/r7-capture-record-tests-20261028.json`
- 既存R7定義の回帰検査：成功。`artifacts/r7-contract-regression-20261028.json`
- Claude Code読み取り専用レビュー：`artifacts/claude-r7-capture-record-review-20261028.txt`

Claude Codeは仕様とソースを読み、検査を実行していない。検査実行の結果は上記ログに分けた。レビューの不足テスト指摘について、余分なフィールド・schema/capture_id・承認オブジェクトの型・画風版の禁止用途・SHA単独/版単独/大文字SHAの拒否を追加し、追加ケースの拒否理由と全ケース数も確認した。

## 未決事項

レビューのM1/M2/L1：非適合参考やrenderer-supportの記録を、画風・動作・寸法の承認に使えるか。現行仕様は承認用途の分離を求めるが、この組み合わせの許否を明記していない。レモンへ確認中で、承認条件を推測で変更しない。#115は進行中とする。

L2：動作基準自体の版/SHAは、phase3-4の記録本体への接続時に扱う。分類サイドカーの画風版/SHAだけでは動作の合格を認めない。

## #114への接続

QtのマップはQScrollAreaのNetHackQtMapWindow2で、描画対象とviewportを区別する。内側864×432の固定、Qtウィジェット描画の記録、実測矩形・枠・DPR・スクロール・部分マス・画像SHAと分類の結合を#133で実装した。全24条件の履歴、通常操作、OS拡大率、実デスクトップ撮影とR5/R6適合の実証は#134へ残る。

新規画像の制作はこの工程では行わず、フェーズ2からAntigravityへ依頼する。

## #133 実装・検証結果

確認版：`artifacts/phase0-comparison-geometry-v4-20261028`。専用プロフィールに英日対応のComparison/表示比較メニューを追加した。G36/G48、通常配置への復帰、言語別プロフィール内のcaptures/UUIDへの記録を提供する。通常起動には追加しない。比較寸法は一時的な値で、保存設定を変えない。通常ズーム/設定操作は比較固定を解除し、利用者の変更を優先する。

英日ビルド成功、Native SMOKEに`-GeometryCapture -RequireRetiredMotion -PreserveOnTimeout`を指定し、保存・復元とも成功した。各回G36/G48を保存し、計8件のviewport864×432、実際の完全セル数・部分セル、PNG寸法/SHA、DPR、分類結合を検査した。

- EN: `artifacts/smoke-en-windows-20261028-194153`
- JA: `artifacts/smoke-ja-windows-20261028-194210`
- 各フォルダーのgeometry-verification.jsonに4件の検査結果。
- `artifacts/comparison-geometry-v4-20261028/results.json`に英日exe SHAと件数、同フォルダーのnegative-tests.jsonに実記録のコピーを改変した12件の拒否結果。
- 同フォルダーのlegacy-retirement.jsonで旧経路撤去の回帰検査成功。full_r6_invarianceはunconfirmed。

v2ではsave/restoreの同じ保存先を上書き防止が拒否しexit99となった。startup.txtで原因を特定し、個別UUIDへ変更した。Claude Codeの初回・再レビュー・最終確認は`artifacts/claude-comparison-geometry-{review,followup,final}-20261028.txt`。遅延リサイズの解除漏れ、部分セル数、設定への書込み、通常ズームとの競合、検査器の接続不足へ対応し、最終確認はブロッカーなし。Claudeは実行しておらず、実行結果は別途上記で確認した。

増分ビルドはsrcのQtコードにprepare-coreの既知変換（trace実装の共通コア移動とライセンス注記）を適用して英日の生成木へ反映し、SkipPrepareで作成した。検査器で変換後の一致を照合したが、全ソースのビルド来歴の完全な証明ではない。

その後、英日専用プロフィールで[通常GUI操作の確認](phase0-comparison-manual.md)を実施した。上記#133の実行記録はassisted-smokeであり、通常プレイ・デスクトップ提示・正式な比較基準の合格ではない。失敗途中の保存フォルダーは残るが、全ファイル・ハッシュ・分類の検査が通らなければ有効な記録として扱わない。
