# フェーズ0：持ち物・装備表示の公開スナップショット（#132）

2026-10-29。#129の残件として、持ち物窓・装備欄・容器欄・標準の紙人形・肖像の描画、tooltip、ドラッグを、コアの時点で用意した公開スナップショットだけで行うようにした。R6全体・フェーズ0全体は未完了である。

## レモンの決定

| 項目 | 決定 |
|---|---|
| 生成境界 | 「コア通知で生成」。コアの`update_inventory`通知と入力待ちの入口で、窓の開閉に関係なくスナップショットを作る。作り直すのは変化があったときだけ |
| 名前の生成（Claude Code初回レビューM2） | 「副作用なしで作る」。表示用の名前を作っても、知識とルールの結果をupstreamから変えない |
| 容器窓の観察（再レビューN2） | 「開いた時に観察する」。容器窓はupstreamの「中を見る」（`container_contents`）を置き換えるコア動作として、開く時点で中身を観察する |

## 生成の時点

| 時点 | 作るもの |
|---|---|
| `update_inventory`通知（`qt_update_inventory`の入口） | 名前（`doname`、紙人形のtipは`xprname`）、glyph、数量、装備状態、ドロップ時のコマンドキー、肖像 |
| `use_container`での容器表示（`darkdungeon_container_window`） | 目が見えていれば中身を`observe_object`で観察し（聖職者は`bknown`も得る。upstreamの`xname`と同じ）、上記と容器名・中身を作る |
| 入力待ちの入口で`program_state.input_state==commandInp`のとき | 名前以外。保留中、未作成、または内容が変わった物体が1つでもあれば、全品と紙人形のtipの名前を作り直す |
| それ以外の入力待ちの入口 | 名前以外。名前が必要な物体があれば保留し、次の安全な時点で作る |

`commandInp`は、通常コマンドを読み込む直前に`parse()`が設定する（`readchar()`が`otherInp`へ戻す）。この時点では`xname`の循環バッファを保持する呼出元がない。プロンプト中の入力待ちでは名前を作らない。保留と作り直しはtraceに`Inventory snapshot: names deferred to the next safe point`、`objects changed without update_inventory; names regenerated`として残す。

名前は、glyphの入力、数量、文字、使用中か、`bknown`のいずれも変わっていない間だけ前回の値を使う。紙人形のtipは、その品の名前を再利用できた場合だけ再利用する。プロンプト中に再利用できなくなった品は、次の安全な時点まで名前が空になり、tooltipを出さない。`observe_object`は`update_inventory`を呼ばないため、`dknown`の変化はglyphの入力の比較で検出する。

glyphは、o_id、otyp、死体/像の種、像の性別、`dknown`、幻覚の有無が変わったときだけ`obj_to_glyph`で標本化する。幻覚中のDISP消費はこれらのコア状態の変化に結びつき、窓の開閉・再描画・tooltip・ドラッグの回数では変わらない。

## 名前の生成と副作用

`publicName()`で`doname`/`xprname`/`simpleonames`を包む。`gd.distantname`で`xname`の`observe_object`（`dknown`、`oc_encountered`、発見リストの順）を止め、聖職者の`bknown`と唯一品の`known`は呼ぶ前の値に戻す。窓には、コアがその時点で知っている範囲の名前が出る。まだ見ていない薬は「薬」と表示する。

Claude Code再レビューで確認された、残る副作用と既知の差：

- `find_artifact`は`distantname`では止まらない。`dknown=1`で未発見の人工物（例：bonesの容器内）の名前を作ると、`artiexist.found`が設定されlivelogが出る。条件はまれと推測されるが、止める処理は未実装。
- 聖職者で`bknown=0`の品は、名前にBUCが出る一方、`bknown`を戻すため紙人形の枠は「不明」になる。聖職者はどの`xname`でも`bknown=1`になるため実害は小さい。
- 通知時の名前生成は`xname`の循環バッファを回し、`xprname`はstaticの領域を上書きする。upstreamのperm_invent（常時表示の持ち物）と同じ性質である。
- `flags.invlet_constant`が偽の場合、getobj内の`reassign()`の結果と事前に作った文字が食い違う可能性がある。通常は一致するが、52個を超える等の境界条件は未検査。

## 標本化契約の変更

現行版（`artifacts/phase0-r6-inventory-events-v4-20261028`等）からの変更。R5/R6の「既存版とのDISP差は契約変更として明示」に当たる。

- 幻覚中の持ち物・装備欄のglyph標本化が、描画時ではなく上記のコア時点で行われる。幻覚中の画像は次の変化まで固定される。
- 現行版は、窓を描画したときに`doname`/`xprname`を呼び、物体を観察していた（窓の状態でルール結果が変わる不適合）。今回、表示による観察はなくなった。観察は容器窓を開く時点（upstreamの「中を見る」に相当）と、コアの本来の時点だけで起きる。
- 紙人形の描画時の`learn_unseen_invent()`と`reassign()`を除いた。コア側の本来の時点に任せる。

契約の版番号・識別子は、R6の観測器（`sampling_contract_id`）を実装する#106〜#108で付与する。現時点では文書上の記録だけである。

## 実装

- `src/qt_inventory.cpp`：`PublicInventory`（持ち物、装備欄の位置、容器、肖像、紙人形18マス、拡張コマンドキー、名前の保留）を作る処理と、各パネルの描画・tooltip・ドラッグをスナップショット参照へ変更した。`find_tool`はqt_inv.cppから移した。準備前の紙人形は描かない。入力待ちの入口でも`suppress_map_output()`中は更新しない。
- `scripts/prepare-source.ps1`：
  - `qt_update_inventory`の入口を`darkdungeon_inventory_notified()`に変更した。
  - `win/Qt/qt_inv.cpp`の`drawWorn`と`paintEvent`を、スナップショットを描く処理へ置き換えた。tooltipもスナップショットのtipを使う。
  - `src/rnd.c`に、検査用にRNG状態を読むだけの`darkdungeon_copy_rng`を追加した（範囲検査付き）。`rnglist`と同じく`USE_ISAAC64`の構成だけで定義される。
- `scripts/verify-runtime.ps1`：`inventory-invariance-{save,restore}.txt`の合格行を必須にした。

## 検証

確認版は`artifacts/phase0-r6-snapshot-20261029`。英日のビルドに成功した（ログ`artifacts/r6-snapshot-build-20261029-7.log`）。本体SHA-256はEN `8B45ED456A38AD6E7FB9AE667AF18F1572392748CB7FE1A7F74AABA808086340`、JA `012BC9A10606B674CBBEF496358EDFA98780F34A597AF5A2EC33A02D968386C9`。

Native SMOKE（`-RequireRetiredMotion -PreserveOnTimeout -GeometryCapture`）は、英日とも保存・再開の両段階で成功した。

- EN：`artifacts/smoke-en-windows-20261029-181015`
- JA：`artifacts/smoke-ja-windows-20261029-181035`

`inventory-invariance-{save,restore}.txt`の検査内容（英日・両段階とも同じ結果）：

1. `dknown=0`の薬を持ち物へ加え、通知で名前を作っても、`dknown`と知識（全`oc_encountered`と`svd.disco`）は変わらない（名前は「a potion」「薬」）。
2. 容器窓を開くと、中の`dknown=0`の薬が観察される（「a puce potion」「暗褐色の薬」）。持ち物の薬は観察されない。
3. 持ち物と容器の全品物に名前がある。
4. 幻覚なし、`invlet_constant`偽、薬の文字を`z`に置いた状態で、窓の開閉（2回）、描画、リサイズ、全マスのtooltip、全品物のドラッグ画像、容器欄、紙人形18マスのtooltipを行っても差がない。
5. 幻覚開始の通知で全glyphが幻覚状態で標本化し直される。
6. 陽性対照：glyphのキャッシュを失効させると、次の入力待ちで差分がDISPだけ出る。
7. 変化がない状態で入力待ちと通知を繰り返しても差がない。
8. 幻覚中に4と同じ操作を行っても差がない。

比較する状態は、CORE・DISPの乱数、持ち物・足元の容器と中身の属性、知識、`flags.implicit_uncursed`、`moves`、`gl.lastinvnr`である。旧描画経路が読み書きしていた部分であり、R6の保護13領域の完全な観測ではない。R6全体の不変性の合格とは扱わない。SMOKEは状態を変更する支援検査であり、通常の手動プレイの記録ではない。失敗で途中終了した場合も、追加した物体と変更した設定を戻す。

trace（各`startup.txt`）では、幻覚開始で通知が2回届き、2回目は標本0だった。2回目の通知の発生元は未特定。名前の保留はSMOKEの陽性対照（プロンプト扱いの入力待ちでキャッシュを失効させる操作）でだけ発生し、次の通知で解消した。

旧経路撤去の静的検査は英日とも成功した（`artifacts/r6-snapshot-20261029/legacy-retirement-2.json`、旧識別子0件）。この検査の対象は旧攻撃hookと移動の推測であり、持ち物・装備のDISP消費の静的な根拠にはならない。#132の静的な根拠は、上記の検査とレビューでのソース確認である。

## レビュー

- [初回](../artifacts/claude-r6-snapshot-review-20261029.txt)：Medium 3件（入力待ちでの名前生成、知識・ルール結果の変更、検査の検出力）、Low 9件。
- [再レビュー](../artifacts/claude-r6-snapshot-followup-20261029.txt)：M1/L2/L3/L4/L8は解消。新たにMedium 2件（N2 容器窓の観察差、N1 `dknown`変化時の名前の遅れ）とLow。N2はレモンの決定で開いた時に観察するよう修正し、N1は名前の再利用条件を修正した。L-a（失敗時の後始末）、L-b（束への合流）、L-c（名前の有無、文字の振り直し、`lastinvnr`）は検査に反映した。

- [最終確認](../artifacts/claude-r6-snapshot-final-20261029.txt)：Medium以上なし、#132完了可。Lowのうち、L-d1（文書の作り直し範囲）、L-n1（聖職者が容器の中身のBUCを得ない差）、L-r1（持ち物に入れる前の失敗時の後始末）は修正し、L-d2とInfoは残件に記録した。L-n1の修正後に英日のビルドとSMOKEを再実行した。

Claude Codeはソースと記録を読んだだけで、画像を見ておらず、ビルドや検査を再実行していない。実行結果はロクが確認した。

## 未実施・残件

- Unix：パッチのエクスポーターがC1生成木を拒否するため、今回の変更は`patches/darkdungeon-unix-*.patch`に反映していない。`darkdungeon_copy_rng`は`USE_ISAAC64`の構成だけにあり、Unix移行時に確認が必要。共通コアのUnix移行（既存の保留事項）で扱う。
- 通常GUIでの手動確認（ドラッグ操作の実行、tooltipの目視、幻覚中の画面）は未実施。
- `find_artifact`の副作用の抑止、`invlet_constant`偽の境界条件の検査は未実施。
- 生成後の`win/Qt/qt_inv.h`には、使わなくなった`drawWorn`の宣言と`tips[][]`が残る。呼出しも確保もないため無害で、整理は任意。
- SMOKEの幻覚の復元は`HHallucination`の値全体を戻す。時間以外のビットがある場合は不正確になる（騎士のSMOKEでは0）。
- 保護13領域の観測器、正規化登録簿、標本化契約の識別子は#106〜#108で扱う。
