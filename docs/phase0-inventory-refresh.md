# フェーズ0：持ち物の更新通知への移行（#131）

## 変更範囲

2026-10-28、#129の最初の工程として、持ち物ウィンドウの250ms周期タイマーと、`obj_to_glyph(...rn2_on_display_rng)`を使う差分判定を撤去した。
コアの`update_inventory`に接続するQt窓口と、`qt_nhgetch` / `qt_nh_poskey`の入力要求入口で更新する。入力要求は入れ子のプロンプトや先行入力の取得でも起きるため、command-readyや新しいコア実行境界を意味しない。

親ウィンドウが閉じていても、容器欄の明示的な非表示状態を更新する。親の非表示に左右される`isVisible`で判定すると、閉じた後に容器から離れたとき、再表示で空の容器欄が残るため、`isHidden`を使う。

## 検査範囲

Native SMOKEに次の支援検査を追加した。

- 閉じてから実測550ms（旧250ms周期の2回分を超える期間）、Qtイベントを処理しても、`refresh`呼出数が増えない。
- 本物の`update_inventory()`を呼ぶと、閉じたウィンドウにも更新が1回届く。
- 容器欄を開いて親を閉じ、容器を除去してコアへ更新を通知すると、子パネルが明示的な非表示になり、再表示しても空の欄が残らない。

これは更新要求の検査であり、paint回数やCORE/DISP RNGの不変性の検査ではない。SMOKEは容器を生成・移動・削除する支援検査で、通常手動プレイの記録ではない。

## Claude Codeレビュー

- [初回](../artifacts/claude-r6-inventory-events-review-20261028.txt)：閉じた親の容器欄判定と、通知が届く陽性検査の不足を指摘。修正・検査追加を実施。
- [再レビュー](../artifacts/claude-r6-inventory-events-followup-20261028.txt)：Windows側に追加の欠陥なし。英日ビルド・Native SMOKE成功を完了条件とした。

Unix共通コア移行は[既存の保留事項](agent-play-cli-implementation.md)である。エクスポーターはC1生成木を拒否し、旧Unixパッチは現行ソースとして配布するものではない。今回の検証対象はWindowsに限る。

## 実行結果

確認版は `artifacts/phase0-r6-inventory-events-v4-20261028`。英日とランチャーのビルド成功。v2/v3検査はexit 98で失敗した。診断ログで、入れ子のイベントループが550msタイマーの発火前に戻る箇所を特定した。先行する入力検査のqApp->exit()に影響されるexec()を使わず、QElapsedTimerで実測しながらイベントを処理する形に変更した。[最終レビュー](../artifacts/claude-r6-inventory-events-final-20261028.txt)にブロッカーなし。

v4の英日Native SMOKEはともに成功し、更新通知・閉じた容器欄の再表示・保存/復元が通過した。`-RequireRetiredMotion -PreserveOnTimeout`を指定した。

- EN: `artifacts/smoke-en-windows-20261028-182700`
- JA: `artifacts/smoke-ja-windows-20261028-182715`
- ビルドログ: `artifacts/r6-inventory-events-v4-build-20261028.log`
- 実行ログ: `artifacts/r6-inventory-events-v4-smoke-{en,ja}-20261028.log`
- 生成元一致・英日各3フック・exe SHA: `artifacts/r6-inventory-events-v4-20261028/source-and-exe.json`
- 旧経路撤去の回帰検査: 同フォルダーの`legacy-retirement.json`。full_r6_invarianceはunconfirmedのまま。

v3/v4は診断・待機処理だけを更新し、生成済みQtソースに同一ファイルをコピーして`-SkipPrepare`で再ビルドした。最終生成木と生成元のSHA一致は別途確認した。ビルドの完全な再現性や全ソースの対応証明を主張しない。#131は完了、親#129は継続とする。

## 残る作業

#129 / #132 / R6全体は未完了。`itemImage`のpaint・drag、tooltipの名前生成、portrait、標準paperdollにはライブ状態参照・表示乱数消費が残る。コア所有の公開スナップショット、公開ハンドル、入力境界、全状態とRNG観測を接続する必要がある。周期タイマーの撤去だけで不変性に合格したとはしない。
