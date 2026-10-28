# R6 Claude Codeレビューへの対応

2026-10-28。[初回レビュー](../artifacts/claude-r6-invariant-review-20261028.txt)はhigh1件・medium5件により仕様未完了と判定した。ロクは以下を反映した。ゲームコードの変更・起動や、実セーブ・実描画の成功は含めない。

利用者の追加指示による「現在の旧セーブの引継ぎ不要・削除」はレビューでも前提として確認された。旧セーブは利用者が削除し、標準の英日保存先に対象が残っていないことをロクが確認した。旧セーブ移行を復活させず、改修後の新規データでの保存/再開と5方向の回帰検査を維持する。

| 指摘 | 対応 |
|---|---|
| H1 演出中の比較点 | core-suspendedを追加。delay_output/--More--/tmp_at等でコアが停止する窓口を読み取り専用で観測し、比較中は再開しない。projectionとrun観測へboundary_kind/port_functionを追加し、異なる種類/窓口の比較を拒否する。R5 envelopeは安定した起点だけとし、そこから進んだ停止中の比較はrunで扱う |
| M1 不完全な観測の二値判定 | 対応表/正規化登録簿SHA、標本化契約、領域ごとのcomplete/partial/unsupportedと未接続/理由を必須化。equal/different/unconfirmedの3値へ変更。不足領域があれば同値でもunconfirmed。取得不能RNGはnull等で表し0を捏造しない。取得可否の変化を実状態差と誤認しない。登録簿の最低形式・完全path・case/レビュー/guardを定義し、wildcard/paint除外を拒否 |
| M2 DISP由来の記憶 | map_objectとdisplay.hの注記を実ソース照合。levl.glyphの主所有領域をmemoryとし、生成元/系列/幻覚状態/標本ID/位置/更新順を記録。契約版変更時だけ、同じ位置/順序・両側の実標本根拠・CORE結果/地形/その他記憶一致をguardとして、承認した個別glyphを別判定。paint前後は常に完全一致。実例外適用器は未実装 |
| M3 旧通知と推測の処分 | phase0の基準凍結前に4箇所の旧hook挿入・旧関数/宣言・fmon位置差推測を撤去する。新通知との同時動作は禁止。対象参照0と描画/タイマーの実体探索なしを検査。接続前の動作は静止/未確認とし、推測で埋めない。新移動/攻撃の品質完成はフェーズ3/4 |
| M4 主人公/本人の起点 | N02へ蹴り/長柄/鞭/杖/射撃/息/唾/視線を追加。N12へteleds/u_on_newpos/騎乗・降馬/変身・解除/擬態・飲み込み・排出/幻覚切替を追加。実在関数の位置を英日で検査して再生成。主人公も近接/AT表だけを全集合としない |
| M5 宣言値と実ファイルの混同 | 現ツールはengine SHAのenvelope宣言値との一致であり、実ファイル実測ではないと明記。engine_file_hashed=falseを返す。実プロセス/エンジン/フロントエンドのハッシュ実測はphase0のrun生成器が必須。コア観測の元セーブSHAも照合し、RNGなしのcase/build/phase/save誤結合検査を追加 |
| L1 PowerShellの字句走査 | prepare-sourceとMakefileはハッシュ監視だけに区分。PowerShell文字列をCの字句参照と扱わない |
| L2 非リンクの旧ソース | MakefileのQT_OBJSからqt_druagaが外れていることを照合し、source_scopesへ非リンクを記録。他の字句参照も有効コンパイルを断定しない |
| L3 墓石の暦変換 | qt_menu.cpp:outripのyyyymmdd(when)を時計経路へ追加し、字句トークン・監視ファイルにも反映 |
| L4 Qt側の入力制御 | requestedToolbarCommand/keybuffer/clickbuffer/qt_input_timerをcontrolへ追加。タイマーの固定期限/active/登録世代と、導出値remainingTimeの自然な変化を分ける |
| L5 SMOKEの位置付け | 現状は通常exe内の検証分岐で状態を書き換えると明記。支援した準備として扱い、読み取り専用観測・通常描画に流用しない。phase0で通常/支援用のビルド・プロフィールを分離する |
| L6 検査の不足 | case/build/engine/boundary/窓口/対応表の誤結合、ルールに関与するリストの並べ替えを拒否/検出する合成検査を追加 |
| L7 修正前後の表現 | 改修の直前版と候補をphase0以降の新規recipe/セーブで比較すると明記し、旧セーブ移行と区別 |
| L8 監視入力 | Qt map/menu、独自ヘッダー、prepare-sourceをプローブ監視へ追加。全体の字句監視も併用 |

初稿の29合成検査・48形式検査とレビューを保持し、修正後は別のfollowup記録へ出した。最新の[ソース照合](../artifacts/r6-source-check-followup-20261028.json)・[定義照合](../artifacts/r6-contract-check-followup-20261028.json)・[再現要件照合](../artifacts/r6-fixture-check-followup-20261028.json)は成功した。[48項目の合成比較検査](../artifacts/r6-contract-acceptance-followup-20261028.json)と[52項目の形式検査](../artifacts/r6-fixture-acceptance-followup-20261028.json)も成功。いずれもUTC/ツールSHAを持ち、game_executed=falseである。

## 再レビューと追加対応

[再レビュー](../artifacts/claude-r6-invariant-followup-20261028.txt)は初回H1/M1〜M5/L1〜L8の解消を確認した。新規medium2件には以下を反映した。

| 指摘 | 対応 |
|---|---|
| M1 正規化で領域/部分木/RNG等を除外できる | 保護領域を根とする3区切り以上・空区切りなし・正しい~0/~1・wildcardなしを必須化し、rng/clockの正規化を全面禁止。さらに提供されたfield-mapのleaf_bindingsにis_leaf=true、同じC根、transformに適した分類があることを検査。未登録/部分木/分類違いを拒否。実際の承認済み対応表と実測SHAからの解決はphase0、合成表はCの正しさの認定ではない |
| M2 停止中paintがF18の義務にない | prompt-pausedのメニュー/方向/yn、core-suspendedのdelay_output/--More--/tmp_at/dobuzz/explode、停止中のtimer/drag/幻覚持ち物をF18の必須枝へ追加。F18の枝の完全一致を検査し、各追加枝の欠落を拒否する検査を追加。R5のrun観測説明も境界種類・窓口・対応表/登録簿と揃えた |

再レビューのlow L3は、記憶glyphがルール判断にも使われることをhack.cの実ソースで確認し、COREへ波及した差を記憶例外で消さないと追記した。L4はQT_OBJSの継続行を結合してから解析するよう変更した。L1/L2/L5/L6は下記の実装前申し送りへ残す。

最新の[ソース照合](../artifacts/r6-source-check-final-20261028.json)・[定義照合](../artifacts/r6-contract-check-final-20261028.json)・[再現要件照合](../artifacts/r6-fixture-check-final-20261028.json)は成功。[57項目の合成比較検査](../artifacts/r6-contract-acceptance-final-20261028.json)と[55項目の形式検査](../artifacts/r6-fixture-acceptance-final-20261028.json)も成功した。初稿・再レビュー前の記録は上書きしていない。

### 実装前への申し送り

- L1/L2: command-ready / prompt-paused / core-suspendedと具体的な窓口の許可表・barrierの形をphase0で確定し、起点projectionとrun観測0の関係も機械的に検査する。現行の合成形式は種類/窓口の同一性までで、窓口と種類の合法な組の判定器ではない。
- L5: 独自srcを編集元、現在の生成済みwin/Qtをビルド入力としてそれぞれ監視する。prepare-core等の変換と出力差の一致はまだ未検証。phase0の基準凍結前に生成元→変換→本番生成物の対応を照合し、二つのファイルを同じものだと推測しない。
- L6: completeな領域の具体的な内容schema、RNG partial/空の表現、coverage自体の変化の詳細記録を、C観測器と対応表の実装で強化する。現比較器のequalは提供JSONの宣言された範囲であり、実際の完全性を認定しない。

## 最終確認と完了の範囲

[最終確認](../artifacts/claude-r6-invariant-final-20261028.txt)は全high/mediumの解消を確認し、R6仕様は完了扱いにできると判定した。Claude CodeはRead/Grep/Globのみを使い、検査を再実行していない。ロクが検査を実行し、現在の定義・ツールと記録のSHAを照合する。

最終のlow N-L1は本仕様の状態行と最終判定の追記で対応した。N-L2（C根/分類違いの否定検査追加）とN-L3（実測SHAに対応するfield-mapからleaf_bindingsを解決）は、上記の実装前の申し送りと合わせてtqueのフェーズ0へ登録する。現在の形式検査が実Cや実行ファイルの正しさを認定するという意味ではない。

最終判定後の変更は状態・履歴・引き渡し先の文書追記だけで、検査ツールは変更していない。R6は仕様として完了。C観測の実網羅性、通知の接続、実ゲームの表示/操作/RNG不変、保存互換性の合格はまだ判定していない。
