# フェーズ0：OS拡大率の記録（#136 / #138）

2026-10-28、WindowsでOS拡大率をQt DPRと分けて記録する機能を実装し、英語・日本語の専用確認版で検証した。これは比較資料を作るための計測機能であり、全24条件の合格や表示品質の完成を意味しない。

## 実装

`src/qt_monitor_scale.cpp`をQt専用の独立モジュールとし、Windows APIの`MonitorFromWindow`と`GetScaleFactorForMonitor`で対象ウィンドウのモニターと拡大率を取得する。Windowsの設定は変更しない。NetHackヘッダーとWindows SDKのboolean定義が衝突したため、同じ翻訳単位には含めない構成にした。

`darkdungeon-geometry-capture-v2`では、ウィジェット描画の前後の測定を`os_scale_observation`に保存する。両方がS_OKで、モニター名と拡大率が一致した場合だけ`os_scale_percent`を採用する。失敗時の代替値、移動等による前後不一致、非Windows環境はnullと理由を記録する。モニター名は短い測定区間の識別用であり、物理機器の永続IDではない。

従来のv1記録も検査できる。Qt DPRからOS拡大率を推測して補完することはない。WindowsおよびUnixのQtビルドへ追加したが、agentのリンク対象には含めない。

## 実行結果

- 専用出力`artifacts/phase0-os-scale-v2-20261028`で英語・日本語のWindowsビルド成功。通常のdistは更新していない。
- Native SMOKEの保存・復元、入力、持ち物更新等の既存検査が英日とも成功。`-PreserveOnTimeout -RequireRetiredMotion -GeometryCapture`を指定した。
- 英日各4件（G36/G48、保存・復元）の計8件で、前後ともモニターDISPLAY1、100%、S_OK、stable=true。Qt DPRは別項目として1を記録した。OS設定画面との照合、150%/200%、カスタム拡大率、モニター間移動の実機確認は未実施。
- 合成値による拡大率検査27件が成功。実バンドルの破損を作る既存検査は12種類を拒否した。旧v1の手動記録も読み込み成功。
- 旧モーション経路の静的検査は英日とも成功。これはR6全体の不変性を証明しない。
- Unixスクリプトは`bash -n`成功。Linux/macOS実ビルドは未実施。

## 証拠と進捗一覧

実行証拠は`artifacts/smoke-en-windows-20261028-204315`と`artifacts/smoke-ja-windows-20261028-204352`。それぞれの`geometry-verification.json`、`runtime-builds.json`、4件のgeometryバンドルに検査結果、実行ファイルSHA、画像と寸法を保存した。画像はQWidget::grabであり、デスクトップ提示の撮影ではない。SMOKEは支援実行であり、通常手動プレイの証拠にはしない。

`tools/rendering-comparison/layout-progress.py`でこの8件を集約した結果は`artifacts/os-scale-v2-layout-progress-20261028.json`。必須24行と参考8件を分け、全行not-run、passed_count=0、runtime_ready=falseとした。寸法・拡大率の一致だけではUI場面、撮影来歴、R5/R6の適合まで確認できないためである。既存の進捗出力は上書きしない。

ビルドログは`artifacts/os-scale-v2-build-20261028.log`、実行ログは`artifacts/os-scale-v2-{en,ja}-20261028.log`、旧経路検査は`artifacts/os-scale-v2-legacy-retirement-20261028.json`に保存した。

## 残件とレビュー

#139で全24条件の実行、撮影来歴の結合、R5/R6適合を継続する。#115の正式承認条件は未確定のままとし、この参考資料を正式な比較基準へ昇格させない。

Claude Codeに読み取り専用レビューを依頼した。`artifacts/claude-os-scale-followup-20261028.txt`のUnixビルドへの組み込み漏れを修正し、`artifacts/claude-os-scale-unix-followup-20261028.txt`の再レビューでは今回の追加に具体的な不具合は見つからなかった。レビュー担当は実ビルドやGUI操作を実行していない。

別途、Unixでは共通コア移行に必要なapp_runtimeの取り込みが未完了で、コンパイルが止まる可能性を指摘された（静的確認による推測、実行未確認）。Unixの共通コア移行は別工程に残っており、今回の規則追加や構文検査をUnix版のビルド成功とは扱わない。
