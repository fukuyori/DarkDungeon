# フェーズ0：停止点・窓口の許可表と起点の検査（#106）

2026-10-29。R6の実装前申し送りL1/L2（[対応記録](rendering-invariant-review-response.md)）に対応した。停止点の種類と窓口関数の合法な組、各停止点のbarrierの形を定義し、R5 envelopeの起点とrun観測0番の関係を機械的に検査する。C観測器、停止点の帰属（どの窓口・呼出元で止まっているかをコアが記録する処理）、ゲームの実行は未実装である。

## 許可表

定義は`docs/data/rendering-boundary-ports.json`。`tools/rendering-invariants/boundary.py`が英日の生成済みソースから作り、`--check`で再生成と一致するかを照合する。

停止点の識別子は「コアが呼んだ一番外側の窓口関数.修飾子」とする。停止点として記録するのは、その窓口関数が実際に待ち（イベントループ、ダイアログ、遅延タイマー）に入ったときだけである。入力関数に入っただけでは停止点にしない。先行入力のキー・クリック・ツールバーのコマンドがあれば、待たずに戻るためである。入れ子の待ちも停止点にしない（`qt_yn_function`・`qt_more`・`qt_get_ext_cmd`の中の`qt_nhgetch`、地図窓の表示中に呼ばれる`qt_yn_function`）。

| 種類 | 停止点 | 条件 | barrier |
|---|---|---|---|
| command-ready | `qt_nh_poskey.command` | `parse()`が通常コマンドの最初のキーを読む（`readchar_core`→`nh_poskey`）。num_padが無効なら数字をまだ読んでいない`get_count()`の最初の読み取り、有効なら`get_count()`より前の`readchar()`。`input_state=commandInp`、`iflags.in_parse`、`multi=0`、占有行動なし、Qtのkeybuffer/clickbufferが空、ツールバーの要求なし、`readchar_queue`が空、`CQ_CANNED`/`CQ_REPEAT`が空、`gi.in_doagain`でない、moveloop中でゲーム終了前 | command-ready |
| prompt-paused | `qt_nh_poskey.count` | `get_count()`の中で回数の数字を1つ以上読んだ後（backspaceで0に戻した場合を含む）、またはnum_padが有効でNHKF_COUNTの後。呼出元（parse、getobjの個数、山を分ける処理）とinput_stateは問わない | prompt-answer |
| | `qt_nhgetch.altmeta` | altmetaが有効で、input_stateがotherInp以外（commandInp、getposInp、getdirInp）のとき、ESCの次のキー（`pgetchar()`） | prompt-answer |
| | `qt_nhgetch.doagain` | 繰返し（`gi.in_doagain`）の最中で`readchar_queue`が空のときの`pgetchar()` | prompt-answer |
| | `qt_yn_function.getdir` | `getdir()`の方向（`getdirInp`） | prompt-answer |
| | `qt_yn_function.yn` | それ以外の`yn_function()`。品物の文字を含む。query_menuが有効なら同じ質問はメニューで出て、`qt_select_menu.menu`の停止点になる（一番外側の窓口関数を記録する規則による） | prompt-answer |
| | `qt_nh_poskey.getpos` | `getpos()`の位置（`getposInp`） | prompt-answer |
| | `qt_nh_poskey.other` | 上記以外の`readchar()`（`otherInp`） | prompt-answer |
| | `qt_select_menu.menu`、`qt_getlin.text`、`qt_get_ext_cmd.extended`、`qt_display_file.file` | メニュー、文字入力、拡張コマンド、ヘルプ（必要なファイルがないときの警告の箱を含む） | prompt-answer |
| | `qt_display_nhwindow.text` | 文章窓（NHW_TEXT、文章として表示するNHW_MENU）。blockの値に関係なく待つ | prompt-answer |
| | `qt_display_nhwindow.map` | `display_nhwindow(WIN_MAP, TRUE)`。地図窓がコアの`yn_function("Press a key when done viewing")`を呼ぶ（探知、魔法の地図等） | prompt-answer |
| core-suspended | `qt_display_nhwindow.more` | `--More--`（`qt_more()`） | suspended-acknowledge |
| | `qt_delay_output.<関数>` | `nh_delay_output()`を呼ぶコア関数24種。`tmp_at`、`dobuzz`、`explode`、`runmode_delay_output`、`shieldeff`、`bhit`、`m_throw`等 | suspended-timer |

`nhgetch()`を直接呼ぶのは`pgetchar()`だけである（繰返しとaltmetaの2打目）。通常のキー入力は`readchar_core()`から`nh_poskey()`を通る。

barrierは4項目の真偽値で、停止点ごとに一つに決まる。

| 項目 | 意味 |
|---|---|
| input_ready | コアが窓口関数の待ちの中でプレイヤーの入力を待っている |
| core_dispatch_pending | コマンドやコアの処理が途中で、待ちの後に続く |
| display_preparation_pending | コアが表示の一連の処理（tmp_at、遅延）の一部を公開しており、待ちの後に続ける |
| modal | 通常コマンドの待ちではなく、コアの特定の要求（質問、--More--）に答える待ちである。Qtのウィンドウのモーダル性ではない（popup_dialogが無効なら、--More--もメッセージ窓に出る） |

| barrier | input_ready | core_dispatch_pending | display_preparation_pending | modal |
|---|---|---|---|---|
| command-ready（R5 envelopeと同じ） | true | false | false | false |
| prompt-answer | true | true | false | true |
| suspended-acknowledge | true | true | false | true |
| suspended-timer | false | true | true | false |

prompt-answerとsuspended-acknowledgeは値が同じで、種類（prompt-pausedとcore-suspended）で区別する。

停止点にしないもの：`qt_askname`・`qt_player_selection`（moveloop前）、`qt_outrip`とゲーム終了後のすべての窓口（死亡時の識別・持ち物の確認等。runの比較はゲーム終了で止める）、`qt_doprev_message`（待たずに戻る）、入れ子の待ち、待ちに入らずに戻る呼出し、`qt_timer_fire`のidlecheckpoint（F16/INV14の明示的なコア操作で、純粋なpaintの区間にしない）、コアの待ちを伴わないQtのイベント処理。

`delay_output`の呼出元24関数は、英日の生成済みソースを別々に走査し、一致を確認した。走査したファイルのSHAを定義に記録する。字句の走査であり、呼出グラフや条件分岐の有効性は証明しない（例：`mail.c`の呼出元が実際にコンパイルされるかは未確定）。F18の必須の枝（メニュー、方向、yn、delay_output、--More--、tmp_at、dobuzz、explode）は、いずれも許可表の停止点に対応する。

## 起点とrun観測

`validate_run_origin(envelope_path, run, root, families, value=None)`は次を検査する。`value`（許可表）を渡す場合は、ディスク上の許可表と同じでなければ拒否する（#166）。

- envelopeはファイルとして読み、SHAを自分で計算し、R5の`validate_envelope`を通す。起点にできるのは、checkpoint_phaseがpost-setup-readyかpost-restore-readyのenvelopeだけである（preflight-rejectionやrenderer-inputは不可）。runの`origin_envelope_sha256`はそのSHAと一致し、ケース・言語も同じである。
- runの最上位の項目は、R5のrun_report_contractの項目と完全に一致する（`runtime_ready`や`pass`等の追加を拒否）。#106の時点では16項目、#166で`boundary_ports_sha256`を加えて17項目になった。項目の一覧はR5計画から作る。この検査器が中身を検査するのは起点と観測だけである。
- ファイルは1回読んだバイト列からSHAの計算と解析の両方を行う（#166でR5の`validate_envelope`も1回の読み取りにした）。
- 観測は0番から整数の連番である。入力・seed・clockの各cursorは戻らない。0番より後の観測は入力1以上である。
- 各観測のcoreファイルは、barrierを必ず持ち、runと同じ停止点、その停止点のbarrier、envelopeと同じケース・言語・build・実行ファイル・元セーブ、観測と同じcheckpointを記録する。0番以外にR5 envelopeのbarrierを流用しない。
- 各観測のRNGファイルはR5の`validate_rng`を通り、そのcoreファイルのSHAに結びつき、seed cursorが観測と一致する。
- 0番はcommand-ready、入力0、envelopeと同じcheckpoint_id・checkpoint_phase、同じcore-observationとrng-observationのファイル（SHA）である。
- ファイルはfixture_protocolと同じ規則で、パスの安全性とSHAを照合する。

このため、runで使うcore-observation-v1は`boundary_kind`と`port_function`を持つ必要がある。#106の時点ではR5の`validate_core`がこの2項目を要求しなかったため、envelopeは合格するがrunでは拒否される場合があった。#166でR5でも必須にした（[記録](phase0-run-format.md)）。

0番のclock cursorは、envelopeに照合する相手がないため検査していない。`input_ordinal`の0（入力前）と`inputs[]`の番号の付け方の関係も未定義である。

`contract.py`の`validate_projection`も、`port_function`が`boundary_kind`に許された停止点であることを検査するようにした。従来は識別子の書式だけを検査していた。#167で、R6定義（`boundary_ports_sha256`）とprojectionに許可表のSHAを持たせた。下記の「#167」を参照。

## 検証

記録は`artifacts/r6-boundary-20261029`。

- `definition-check.json`：許可表が、英日の生成済みソースからの再生成と一致。
- `boundary-acceptance.json`：合成データの検査50項目。
  - 全39停止点が自分のbarrierを受け入れること。
  - 拒否するもの：未修飾の窓口名、種類違い、barrier違い、型違い、idlecheckpoint。
  - runの受け入れ：回数入力の停止点を複数回含み、方向・遅延・--More--・地図表示を含むrun。回数入力の呼出元（parse、getobj等）の判定はC観測器の残件である。
  - runの拒否：起点と0番の不一致5種、cursorの後戻り、真偽値の番号、回数入力をcommand-readyとする誤り、別buildのcore、別coreに結びついたRNG、中身のないRNGファイル、barrierのない・nullのcore、最上位の項目の追加、preflight-rejectionのenvelopeからの開始、ファイルの改変やディレクトリ外への参照、別envelope、改変したenvelope。
- `contract-regression.json`：R6の既存合成検査に停止点の検査を加え、61項目成功（従来57項目）。
- `contract-definition-check.json`：R6定義の照合に成功。
- `comparison-regression.json`：R7の検査に成功。

この3つの記録は、#165で作り直す前の旧R6/R7定義のSHAでの結果である。作り直した後の再実行結果は[再監査の記録](phase0-source-reaudit.md)にある（61項目・62項目とも成功）。

いずれもgame_executed=false、runtime_ready=falseであり、実ゲームの停止点や観測の正しさを示すものではない。

## R5計画の照合の失敗（既存の状態）

（2026-10-29追記：#165で差分を確認してR5計画・R6調査表・R6/R7定義を作り直し、解消した。R5の形式検査55項目も成功した。[再監査の記録](phase0-source-reaudit.md)を参照。以下は#106の時点の記述である。）

`tools/rendering-fixtures/verify-fixture-plan.py`は、現在の生成済みソースで失敗する。

- `artifacts/r6-boundary-20261029/layout`に再出力した構造体の配置は、凍結値と一致した。
- 失敗の原因は、R5計画（`docs/data/rendering-fixture-plan.json`）に凍結されたソースのSHAである。フェーズ0の改修で、`src/Makefile`、`cmd.c`、`rnd.c`、`windsys.c`、`qt_bind.cpp`、`qt_inv.cpp`、`qt_map.cpp`と独自srcが変わった。#106の変更によるものではない。
- このためR5の形式検査（envelope・RNGの合成検査）は今回実行されていない。`tools/rendering-fixtures`は今回変更していない。
- R5計画を作り直すと、そのSHAを参照するR6/R7の定義も連鎖して変わるため、ここでは更新しない。別タスクとした。

## レビュー

[Claude Code初回レビュー](../artifacts/claude-r6-boundary-review-20261029.txt)の指摘と対応：

| 指摘 | 対応 |
|---|---|
| H1 回数入力とreadcharの窓口の誤り | `qt_nh_poskey.count`を追加。`qt_nhgetch`は`pgetchar()`経由のaltmeta・doagainだけにした |
| M1 地図窓の表示待ちの漏れ | `qt_display_nhwindow.map`を追加し、入れ子の`qt_yn_function`を停止点にしないと明記 |
| M2 文章窓の条件 | blockに関係なく待つと修正 |
| M3 command-readyの条件 | 待ちに実際に入った時点とし、Qt・コアの各キューが空であることを条件に追加 |
| M4 envelopeとの結合 | envelopeをファイルで受け取り、SHA計算とR5の検査を通す |
| M5 0番以外の観測の結合 | coreのメタデータとRNGの結合を#106で実装 |
| L1 doprev_message | 停止点から削除し、停止点にしないものへ |
| L2 cursorの単調性 | 入力・seed・clockのcursorの後戻りを拒否。0番のclock cursorと`inputs[]`の番号の関係は未定義と記録 |
| L3 真偽値の番号 | 整数の型を必須にした |
| L4 許可表のSHA | #167で対応 |
| L5 modalの意味 | 表に記載 |
| L6 ゲーム終了後 | 停止点にしないと決めた |
| L7 R5の検査未実行 | 上記に記録 |

[再レビュー](../artifacts/claude-r6-boundary-followup-20261029.txt)の指摘と対応：

| 指摘 | 対応 |
|---|---|
| N1 0番以外でbarrierのないcoreが合格 | runではbarrierを必須にした（最終確認でnullの値も拒否するよう修正） |
| N2 回数入力の経路の漏れ（num_pad有効時、getobj・山を分ける処理） | command-readyと`.count`の条件を改めた |
| N3 起点にできるenvelopeの種類 | post-setup-ready/post-restore-readyに限定 |
| N4 runの最上位の項目 | 16項目に固定（#166で17項目、R5計画から作る） |
| N5 SHAの計算と解析で別の読み取り | 本検査器は1回の読み取りに統一。R5の`validate_envelope`は残件（#166で対応） |
| N6 ヘルプの警告の箱 | `qt_display_file.file`の条件に含めた |
| N7 query_menu有効時のyn | 文書に記載 |
| N8 doagain・altmetaの条件の文言 | 実装に合わせて修正 |

[最終確認](../artifacts/claude-r6-boundary-final-20261029.txt)：N2とN3〜N8は追加の修正なし。N1のnullのbarrierが通る穴を修正し、合成検査を50項目にして再実行したことを条件に完了可。修正後に、定義の照合、合成検査50項目、R6の回帰61項目、R6定義の照合、R7の検査62項目を再実行し、すべて成功した。Claude Codeはソースと記録を読んだだけで、検査を再実行していない。

## 残件

- C観測器での停止点の帰属（どの窓口・呼出元か、待ちに入ったか、`commandInp`の条件、回数を入力中か）の実装と、実ゲームでの記録。
- `delay_output`の呼出元の走査は字句だけである。新しい呼出元が増えたら`--check`が失敗するので、許可表を作り直してレビューする。
- 別タスク（tque #165〜#167）：R5計画の凍結SHAの扱い（#165、作り直して解消）、R5の`validate_core`に停止点の2項目を加えるかどうか（#166、必須にした。[記録](phase0-run-format.md)）、許可表のSHAをR6定義・projectionへ結ぶこと（#167、対応済み）。R5の`validate_envelope`でSHAの計算と解析を1回の読み取りにすることも#166で扱う。

## 許可表のSHAの結合（#167）

2026-10-29。許可表を変えたときに、R6定義の照合で検出できるようにした。

- R6定義（`rendering-invariant-contract.json`）に`boundary_ports_sha256`を追加した。`contract.py --check`は許可表の現在のSHAで定義を作り直して比べるため、許可表を変えると失敗する。実際のファイルで許可表を一時的に書き換え、`--check`が失敗し、戻すと成功することを確認した（`artifacts/r6-boundary-binding-20261029/detect-table-change.json`）。
- projection（`darkdungeon-protected-projection-v1`）に`boundary_ports_sha256`を必須の項目として追加した。`validate_projection`は、projectionの値と呼出元が渡したR6定義の値（`validate_definition`で照合済みのもの）が一致すること、ディスク上の許可表のSHAがその値と一致することを検査してから、停止点を許可表で照合する。許可表は1回の読み取りからSHAの計算と解析を行う。保存済みの定義と許可表の一致は`contract.py --check`が検査する。`compare_paint`は許可表のSHAを引数に取る。
- 手順（[再監査の記録](phase0-source-reaudit.md)）のとおり、許可表→R6定義→R7定義の順に作り直した。許可表は変わっていない（4b076f…）。R6定義は6d0f134c…、R7定義は8c06b1d1…になった。
- run観測（R5のrun_report_contract）には許可表のSHAを入れていない。runの検査器は、その時点の許可表で照合する。runの形式の変更は#166で扱う。（#166で、runの報告に`boundary_ports_sha256`を記録するよう変更した。）

再実行した検査はすべて成功した（`artifacts/r6-boundary-binding-20261029`）。R5の計画照合と形式検査55項目、R6調査表の照合、R6定義の照合と合成検査66項目（定義の許可表SHAの誤り・欠落、projectionの許可表SHAの誤り・欠落、ディスク上の許可表と定義の不一致の5項目を追加）、停止点の合成検査50項目、R7定義の照合と合成検査62項目、撮影記録・geometry・OS拡大率の検査。
