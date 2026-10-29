# R6 表示通知・状態不変・比較境界の仕様

2026-10-28。状態: Claude Code最終確認を経てR6仕様完了。R6は表示の契約と検証方法を定める工程。通知アダプター、コア観測器、フィールド単位の実装、実ゲームでの不変性は未完成である。

[R5](rendering-reproduction-contract.md)、[14不変条件の定義](data/rendering-invariant-contract.json)、[ソース調査表](data/rendering-invariant-audit.json)を併用する。画像制作は引き続きAntigravityへ依頼するが、本工程で画像は作らない。CLIのセッション実装の再開も前提にしない。

## 1. 今回の方針変更

レモンの指示「引き継ぐ必要はない。今のセーブデータに意味はない」により、改修前のセーブを新しい版へ移行する互換対応は要件から外す。R5最終レビューのL-F2と修正前版↔フェーズ0の2方向は、この決定で取り下げる。互換性があると確認した意味ではない。旧セーブは利用者が削除し、通常の英日保存先から対象ファイルが消えたことをロクが確認した。

フェーズ0で新規開始し、改修後の確認版で作った検証データだけを以後の比較に使う。同一版の保存/再開、改修後の直前版↔候補、フェーズ0↔候補の5方向は維持する。「旧セーブ不要」を理由に通常保存・復元や後続工程の回帰検査を省略しない。通常の保存先を直接使わず、R5の隔離プロフィールを使う。

## 2. ソースから確認した現状

下表は、R6仕様策定時（撤去前）のソースで確認した内容である。2026-10-28に#128の旧攻撃hook・位置推測・actor実体探索を撤去し（[実装・検証結果](phase0-legacy-retirement.md)）、2026-10-29に#132で持ち物/装備の描画を公開スナップショットへ移した（[記録](phase0-display-snapshot.md)）。`rendering-invariant-audit.json` は2026-10-29の#165で現行ソースへ再監査して作り直した（[再監査の記録](phase0-source-reaudit.md)）。撤去前の凍結版はGitの履歴（38fa7e4）に残る。表の旧hookとqt_inventory.cpp/qt_inv.cppの行は、現在の残存を表さない。

| 経路 | 確認内容 |
|---|---|
| uhitm.c:do_attack / mhitu.c:mattacku / mhitm.c:mattackm | 既存darkdungeon_note_attackのコア呼出は計4箇所。mhituは2箇所あり、DEADMONSTER・水中等の拒否より前、ループ内のcontinueやgetmattkより前にも置かれる。呼出だけでは実際に選ばれた攻撃・命中・完了を表さない |
| src/qt_darkdungeon.cpp:refreshAnimations / drawActorSprite | タイマーがfmonの位置とm_idを走査し、描画もm_at/canspotmon、u/flags等の現在のコア状態を読む。許可済みの不変スナップショットだけを描く構成にはなっていない |
| src/qt_inventory.cpp:itemImage/signature、win/Qt/qt_inv.cpp:drawWorn | 幻覚時のobj_to_glyphが描画・ドラッグ・250msタイマー・装備描画でDISPを消費する。R5で登録した既知の不適合。物の名前の生成もpaintから分離し、表示準備の所有者と副作用を監査する |
| display.c:newsym/display_monster/map_object/flush_screen、display.h:display_self/newsym_rn2 | 視界・記憶・幻覚等をコアが判断してglyphを準備する。flush_screenは保存復元時等の抑制があり、背景と前景をprint_glyphへ渡す。newsymやdocrtもコア表示準備であり、単なるQt再描画とは区別する |
| win/Qt/qt_map.cpp:PrintGlyph | 前景/背景・文字・色等を受け取る一方、独自背景関数はコアのcansee/levl/back_to_glyphも読む。将来の純粋な受信器へそのまま流用せず、コア側の公開可否判定とコピーへ移す |
| allmain.c:moveloop_core、cmd.c:rhack | 占有行動・走行/繰返し・階移動・視界再計算・LuaのEND_TURNがある。rhackの直後だけでは全処理完了と限らない |
| win/Qt/qt_bind.cpp:qt_nhgetch/qt_nh_poskey/qt_delay_output | キー/位置の取得にQtイベントループを使い、内部プロンプトも同じ入力窓口を使う。qt_delay_outputも待機する。Qtがイベントを処理中という理由だけで通常コマンド待ちと判断しない |
| qt_bind.cpp:qt_timer_fire | IDLECHECKPOINTのタイマーから保存処理へ進む。これは描画専用処理ではない。F16とINV14で明示したコア操作として分離する |
| calendar.c、u_init.c、allmain.c、cmd.c、save.c、restore.c、end.c、files.c、insight.c、rnd.c、windsys.c、nhlua.c/nhlib.lua、win/Qt/qt_menu.cpp:outrip | getnow外のtime直呼び、日付/TZ/DST、保存復元・中断再開、全seed要求とLuaのRNG経路をR5から引き継ぐ。outripのyyyymmdd(when)による年の変換も含め、view側に残るコア暦関数を監査する。時計読取の観測で追加のtime/getnowを呼ばない |

仕様策定時の調査のハッシュ監視は英日各318ファイル。C系ソースの参照は英685/日686、名前付きstruct/unionの宣言群は英366/日367、メンバー宣言群は英2,951/日2,959だった。2026-10-29の再監査（#165）では、英日各322ファイル、参照は英676/日677、宣言群は英368/日369、メンバー宣言群は英2,961/日2,969だった。#110で生成木から旧リアルタイムモードの残りファイル（`qt_druaga`、`realtime_model`）を削除した後は、英日各318ファイル、参照は英665/日666、宣言群は英364/日365、メンバー宣言群は英2,951/日2,959である。日本語側にはtrans_verb等の差があるため、同じ件数へ無理に揃えない。詳細はSHA付き調査表を使う。

この数はコメント・文字列を除いた静的な参照/宣言の数で、プロトタイプ・未使用/無効な分岐も含む。Cプリプロセス後の全フィールド、匿名の型、私有static、全ルール経路、実際の通知の接続完了を証明しない。呼出グラフとも扱わない。

prepare-source.ps1とMakefileはハッシュ監視だけとし、PowerShell文字列をCコードとして走査しない。古いqt_druaga.cpp/.hはQT_OBJSへ含まれないことをMakefileで確認し、source_scopesへ非リンクと記録していた（#110で生成木から削除した）。他の字句参照についても有効コンパイルの判定は未確定とし、phase0で実際のビルド設定に結ぶ。

## 3. 所有者と処理の境界

```text
通常のコアコマンド・自動継続・敵行動
 → コアで合法性と実際の行動/結果を決定
 → 同じコア処理内の表示公開判定・外見標本化
 → 値をコピーした表示更新/行動通知を世代付きで発行
 → フロントエンドが不変の表示世代を受領
 → 同じframe_timeでキャラクター・効果・カメラを描画
```

コアの更新/標本化と画面の再描画は別操作とする。画像の再描画、拡大縮小、ウィンドウ移動、部分露出、ドラッグ用画像、肖像・装備・メニューの再描画、フロントエンドの定期更新から、newsym/docrt/obj_to_glyph/mon_to_glyph/doname等を呼ばない。必要な文字・画像キー・表示可能な数量等は準備時にコピーする。足りない情報を描画時のコア問合せで補わない。

表示準備の標本化はコアが既に公開を許した外見/表示世代に対して行う。画面の再露出・リサイズ・開閉回数で標本化を増やさない。追加の表示先に対して標本が必要な場合は、ルール状態を変えない表示準備要求としてコアの既存の安全な実行点で処理し、系列・順序・表示契約版を記録する。paintからコアへ再入しない。既存版とのDISP差はR5の契約変更として明示し、CORE差を許す理由にしない。

ゲーム本体が通常行うnewsym/see_objects等の更新はルール側の表示準備としてそのまま監査し、勝手に省略・追加しない。素材の選択はR2の公開外見キーに従い、true otypや実際の敵種を補助に使わない。幻覚時も通知の内容から真の種類・正体・実在位置を復元しない。

現行のSMOKEは通常exe内の検証用分岐にあり、makemon/mongone/newsymや状態変更を含む。これは読み取り専用の観測器や通常の描画の証拠ではなく、支援した試験準備として分類する。phase0で通常版と支援操作を許す検証版/プロフィールを分離し、通常起動の所有境界へSMOKEの例外を持ち込まない。観測器自身は検証版でもルール状態を書き換えない。

## 4. 行動通知の意味と監査対象

| 群 | ソースの起点と必要な枝 |
|---|---|
| N01 移動 | domove/m_move/dog_move/rloc_to_core。確定した旧新位置、歩行/位置の飛躍、停止/拒否を区別する |
| N02 主人公の攻撃 | do_attack/hitum/hmonasに加え、dokick/use_pole/use_whip/dozap/weffects/dofire/dobreathe/dospit/dogaze。通常/変身/複数打撃、近接以外の道具・射撃・魔法・身体能力、対象の回避・拒否・不発と実際の試行を分ける |
| N03 敵/仲間の攻撃 | mattacku/mattackm/getmattk。合法性、各段の実効攻撃、SEDUCE設定、置換、近接/遠隔、複数打撃、skip/returnを監査する |
| N04 遠隔物理 | dothrow/m_throw/thrwmu/thrwmm/spitmu/spitmm/breamu。放出・許可された通過点・命中/停止・回収/消去を区別する |
| N05 魔法/視線 | docast/castmu/buzzmu/gazemu/gazemm。近接/遠隔、方向なし、失敗/無効/効果と公開可能な向きを区別する |
| N06 品物/自発魔法 | use_defensive/use_offensive/use_miscとdochug内の非攻撃時castmu。攻撃表AT_*だけを全集合としない |
| N07 反応/消失 | passive/passivemm/passiveum/mdamageu/mdamagem/mondead/done。被弾・受動効果・死亡/消失を区別し、解放後のポインタを渡さない |
| N08 効果 | tmp_at/shieldeff/dobuzz/explode。連続点、ビーム、面/順序、DISP_END等の終端・中断を監査する |
| N09 公開/標本化 | newsym/display_monster/map_object/flush_screenとdisplay_self。視界・検知・記憶・幻覚・本人/乗騎・像の各経路を結ぶ |
| N10 寿命 | goto_level/dorecover/dosave0/clear_glyph_buffer。世代と補間/背景/肖像/部位合成キャッシュを破棄する |
| N11 操作/継続 | moveloop_core/rhack/darkdungeon_basic_action。通常のSpace・方向・メニュー・取消・繰返し/占有行動を維持する |
| N12 本人/正体/乗騎の切替 | teleds/u_on_newpos/mount_steed/dismount_steed/polymon/rehumanize/newcham/gulpmu/expels/seemimic/make_hallucinated。位置の飛躍、乗り始め/継続、本人表示・正体・視界条件の変化を監査する |

調査表の関数位置はレビューの起点であり、12群だけで全通知が実装済みとはしない。実装時は各関数の分岐・共通下位関数と他の呼出元を追い、実際にイベントを出す箇所、条件、公開根拠、Fケース、未接続を記録する。未知の経路は未確認。主人公も近接/AT表だけで行動の全集合とせず、未接続の合法な行動を主人公の1通知だけで代表させない。

phase0の適合基準を凍結する前に、prepare-sourceの4箇所の旧attack hook挿入、Qt/agentの旧通知関数と宣言、fmonの位置差から歩行を推測する経路を撤去する。新通知と同時に動かすことを禁止する。生成済みの本番対象ソースにlegacy_hook参照が0、描画/表示タイマーからfmon/m_at/canspotmon等の実体探索がないことを、ソースと実行ログで確認する。未接続の動作は静止表示と未確認を明示し、推測経路で埋めない。新しい移動/攻撃の接続・品質合格はフェーズ3/4で行い、phase0で完成を主張しない。既存SMOKEの検査も旧経路の成功を流用しない。この旧経路の撤去は2026-10-28に#128で実装・検証したが、表示準備・入力境界・全状態/RNGの観測を含むR6全体は未完了である。

通知はattempt / result / endまたはcancelを区別し、action_groupと実効subactionの連番で結ぶ。attemptは合法な行動をコアが実際に選んだ時点で発行し、命中前でもよいが、拒否前の関数入口は使わない。resultは実際の結果をコアが公開を許した時だけ発行し、attemptから命中を推測しない。通知のために乱数を追加で引かず、既に決まった値をコピーする。

内部の表示通知にはsession/level/view世代、通知連番、action_group、段、phase/kind、表示ハンドル、公開外見、許可済みの位置/経路/効果/結果を持つ。公開しない座標や命中対象を含めない。実体のm_id/o_id、ポインタ、非表示の対象/経路、真の種類・非公開のHPを描画用通知や通常CLIの観測へ出さない。私有の実体→表示ハンドル表はコア側で管理する。ハンドルは世代付きで失効し、表示消失後も同じ敵を追跡する根拠に使わない。

飛び道具/ビームは、コアが表示を許した点の列をその順序で受ける。途中の非公開区間を直線で結んで描かず、可視の部分列に分ける。単発の前景更新しか取れない経路は通知不足とし、壁貫通・標的・射程を描画側で計算しない。爆発も中心と範囲を勝手に補わない。

## 5. 視界・本人・寿命と遅延

マップの前景/背景・同じマスの品物・本人/乗騎は、それぞれコアが表示可能と判断した要素だけをコピーする。MG_HEROだけで通常主人公へ置換せず、R3のdisplay_self分岐を維持する。検知だけの敵の下へ未知の床や品物を描かない。持ち物/装備/選択等も同じR2の公開解決器を使う。

表示世代を交換するたびに失効した要素を破棄し、視界外へ滑らせ続けない。不可視・幻覚・変身・擬態・飲み込みの切替、像→敵の表示、乗騎と本人の許可状態を同時に更新する。別の階/セッション/復元後へ古いハンドルを引き継がない。過去の画像/位置がカーソル、肖像、ドラッグ、キャッシュに残ることも回帰対象にする。

1フレームにつきフロントエンドの単調時計を一度取り、全キャラクター・効果・カメラで共有する。時刻は描画の引数であり、コア時計・ターン・命中・行動順と独立する。途中の部分描画も同じフレーム入力なら同じ位置を返す。描画からアニメーションを完了させるなどの副作用を避け、表示状態の更新とdrawを分ける。

演出を待つために通常コアの手番、入力の受付/配送、Spaceの効果、既存のdelay_outputを追加・変更しない。Qtのタイマーやnested execからコアを二重実行しない。遅延・連打時は表示待ちだけを制限し、途中の演出をまとめても最終の許可状態と効果の終端を保つ。R4の時間/待ち上限とR7の比較条件を使い、ゲームの処理速度を演出に合わせない。

## 6. 観測点と比較の単位

| 点 | 用途と条件 |
|---|---|
| command-ready | トップレベルで次の通常コマンドを受けられる点。自動継続・敵行動・階移動・Lua END_TURN・必要な表示準備が終わり、コア応答や配送待ちがない。R5の原本envelopeを作る起点 |
| prompt-paused | 方向/メニュー/確認などのコア応答待ち。command-readyとは区別し、継続中のコア状態とプロンプトを私有観測に含める。通常コマンドを送らず、そのプロンプトだけに応答する |
| core-suspended | delay_output、--More--、tmp_at/dobuzz等の演出待ちでウィンドウポート内にコアが停止している点。停止中の窓口関数と継続状態を記録し、paint比較中は応答・コア再開を行わない |
| published-prefix | コアが動作途中で発行済みの表示更新。描画は最後に封じた値だけを読む。描画できることをコア処理全体の完了や保存可能の根拠にしない |

mainの入力関数に入ったという理由だけでcommand-readyとしない。繰返し/占有行動を止めたり、multiを0に書き換えたりして観測点を作らない。観測は状態を読むだけとし、通常セーブ・名前生成・表示再準備・追加時計/RNGを呼ばない。観測のためにゲーム結果が変わったら観測器の不適合とする。

R5のenvelopeは新規開始/復元後のcommand-readyの1起点のまま。run-v1の観測列ではその後のprompt-paused/published-prefixも区別して記録する。メニュー表示中等の再描画比較は、コアが止まっている同じ観測境界・同じ入力位置で前後を比較し、未完了の制御状態も変化していないことを確認する。これを保存可能な原本や通常入力待ちと偽らない。

run-v1のpaint観測はcommand-ready / prompt-paused / core-suspendedの同種・同じ停止点同士で行う。projectionとrunの各観測項目へboundary_kindとport_functionを必須にし、同じ入力番号でも異なる窓口や境界種類を比較しない。対応表と正規化登録簿のSHAも各観測へ持つ。published-prefixは表示世代の概念で、単独では停止点ではない。R5 envelopeの安定した起点の制約を緩める代わりに、そこから意味上の入力で演出/プロンプトまで進め、runの観測列へ停止中の比較を記録する。新しい窓口の停止点はR6の実装時対応表へ登録し、二重コア実行を禁じる。

runのcore_fileはcore-observation-v1のメタデータと、その点の実効barrier、R6 projectionを持つ。起点ではR5のbarrierが必須であるが、run内の停止点はboundary_kindに対応する実状態を記録し、command-readyと偽らない。R5のenvelope検査器をrun内の全点へ流用しない。run検査器はphase0でこの区別と、各観測・同時に採取したRNG記録の結合を実装する。

純粋なpaint検査はコア入力・自動継続を進めず、描画/リサイズ/表示タイマーだけを変える。持ち物/容器/装備の開閉、幻覚、ドラッグ、肖像/選択を含める。idlecheckpoint等のコア操作が発火した区間は純粋paintとは数えず、F16の別区間として記録・比較する。定期更新を一律に止めて、既知のDISP消費を隠した合格にしない。

## 7. 私有の保護対象と正規化

私有のdarkdungeon-protected-projection-v1は、ケース/言語/build/実行ファイルSHAの宣言値、boundary_id/kind/port_function・入力番号・ソース監査SHA、停止点の許可表のSHA（boundary_ports_sha256、#167）、field_map_sha256、normalization_registry_sha256、sampling_contract_id、領域別coverageと、次の13領域を持つ。通常CLIの公開観測と別に管理する。

| 領域 | C側の根と含める意味 |
|---|---|
| hero | u、gy.youmonst、職業/種族/姿/属性/状態/prop等。座標・HPだけに限定しない |
| rule_flags | flags、実効ルール設定とiflags等のルールに関与する値。表示専用の例外は下記の個別登録が必要 |
| context | svc.context、gm.multi、go.occupation、繰返し・走行・継続状態と関連私有値 |
| objects | inventory/全階の床/容器/移動中の物体、obj/oextraと装備参照。数量・祝呪・識別等の全ルール値、連結順序も保つ |
| monsters | fmon/移動中の敵/仲間/乗騎/ワームとmonst/mextra・拡張。全ルール値と行動順の連結順序も保つ |
| world | 全階の地形・扉・罠・部屋・地域・刻字・ショップ・罰の鎖等の状態。現在階だけにしない |
| memory | levlの記憶glyph/見えた状態等、地図と知識に関わる状態。画面キャッシュと混同しない |
| knowledge | objectsの外見割当/識別/呼称、disco/bases等。R2の同値外見と非公開の正解も私有側で保護する |
| progress | moves、mvitals、dungeons/到達状態、quest_status、spl_book、artifact/oracle/fruit/Lua保存状態等 |
| control | program_state、キー/クリック/コマンド・繰返しキュー、保留された方向/メニュー/階移動、Luaフック/コールバック等。QtのrequestedToolbarCommand/keybuffer/clickbuffer/qt_input_timerも橋渡しの私有観測へ含める。タイマーの登録・active・世代・固定した期限を記録し、時刻から導出するremainingTimeの自然な経過はコア状態変化と混同しない |
| rng | CORE/DISPそれぞれn,r/m各256語,a/b/c。フラグ・init/reseed試行/要求位置はclock/auxiliaryにも結びつける |
| clock | 制御時計/TZ/DSTの状態と読取cursor、seed provider/強いseedフラグ・要求/試行cursor。観測のために進めない |
| auxiliary | 上記の根だけでは漏れる可変global/private static、timer/light/regional/killers等と外部入力の実効状態。未分類を放置しない |

全階の物・敵・地形や拡張は、savegamestate/savelev等が扱う範囲も照合するが、保存を呼んで観測の代用にはしない。未ロード階は作業用ファイルの読み取り専用デコードが必要で、実ゲームの階を切り替えて収集しない。デコーダーが未対応なら当該領域は未確認、完全一致は未判定とする。単なる保存ファイルのバイトハッシュを全意味状態の一致とはしない。

フェーズ0の観測器実装では、調査表と実際のビルド設定を根拠に、各有効Cメンバー/匿名・埋込型/配列/bitfield/私有static→出力パス/型/取得時点/意味/除外根拠の対応表を作る。ソースの宣言群はこの作成の起点であり、現在の実接続件数は0。追加/未対応のフィールド、間接参照先、私有staticを未分類のまま完全合格にしない。R6は根と必須の写し方・閉鎖条件を定義し、C観測の実装完了を前借りしない。

対応表の最低形式はfield-map-v1として、schema、source_audit_sha256、producerのbuild/実ファイルSHA、実効コンパイル設定の識別、entriesとunknownsを持つ。entryはCの根/ソースSHA・出力パス/領域・型と符号/幅・参照/所有/順序の写し方・有効境界種類・取得方法・implemented/unimplemented・承認された除外への参照を持つ。field_map_sha256はこの実ファイルのSHAとする。各有効メンバーと私有staticが写されるか承認済み例外になるまで対応表は不完全である。

coverageは13領域それぞれstatus=complete/partial/unsupported、unbound_paths、reasonを持つ。completeには未接続を残さず、partial/unsupportedは不足箇所と理由を必須にする。取得不能な領域はnullや確認できた部分だけを記録し、RNGを0等で捏造しない。実観測器は対応表と実際の取得可否から生成し、宣言だけでcompleteと自己認定しない。合成比較器は提供されたcoverageを形式検査するだけでCの実網羅性を認定しない。結果はequal/different/unconfirmedの3値とし、観測値が同じでも不足領域があればunconfirmed。両側が完全に取得した領域の差はdifferentとし、不足領域の値/取得可否の差は別の未確認差分に残す。equalも提供JSONの範囲の判定であり、実描画の合格ではない。

ポインタはアドレスではなく、私有の実体ID参照または所有する値/文字列へ変換する。占有行動等の関数ポインタは登録したコア処理名/IDへ写す。配列の全要素、物/敵/キューの順序、unionの実効タグと値を保つ。オブジェクトをID順に並べ替えただけで、床の最上段や行動順の差を隠さない。パディング・未初期化メモリを生バイトで比較しない。

表示専用の状態は別のpresentation観測へ出す。正規化/除外は、完全な出力パス・Cの根・理由・適用する比較種別・レビューを事前登録する。例えばQtのフレーム時刻はpresentation側であり、moves/状態期限/知識/外見/RNG/入力順を後から除外して一致させない。iflags全体や特定の接頭辞を一括除外しない。未承認の例外は差を残す。

normalization-registry-v1はschemaとentriesを持ち、各entryにpath（保護13領域を根とする完全なJSON Pointer）、c_root、reason、comparison_kind、transform、case_id、review_sha256、guardsを必須とする。comparison_kindはcross-build-fixed-sampling / cross-build-sampling-change / save-restore、transformはexact-id-reference / presentation-field-separation / sampled-memory-glyph。ワイルドカードとpaint向けの保護状態除外を禁止する。normalization_registry_sha256はUTF-8・辞書キー順・空白なし・ensure_ascii=falseのJSONのSHAとし、実ファイルのバイトSHAはrunのファイル一覧にも別途持つ。paint比較器はこの正規化を適用せず完全比較する。実行時の正規化/例外適用器はまだ未実装。

pathはfield-map-v1の葉のentryと一致することを必須にする。最低3区切り、保護13領域の根、空の区切りなし、正しい~0/~1エスケープとし、rng/clockを根とする正規化を全面禁止する。領域全体やiflags等の部分木を葉と偽らない。提供されたleaf_bindingsにis_leaf=true、同じc_root、transformに対応するid-reference / presentation-only / disp-memory-glyphのclassificationがあることを形式検査し、未登録path・部分木・分類違いを拒否する。phase0の生成/実行器はleaf_bindingsを実測SHAに対応する承認済みfield-mapから解決し、任意の表を作って通さない。現在の合成検査は提供された表との一致までで、Cの分類や実ファイルとの一致を独立に認定していない。

DISP由来の記憶を特別に扱う。display.c:map_objectは幻覚中の外見glyph、像では別に選んだrandom objectのglyphをlevl[x][y].glyphへ保存する。対応表ではこのglyphの唯一の主な出力先をmemoryにし、worldへ重複させた値を暗黙に無視しない。更新時のlevel/座標・更新順・標本化契約版・元関数・系列・幻覚の実効状態と標本IDを読み取り専用で記録する。現在幻覚中という理由だけで、以前の記憶がDISP由来だったと推測しない。

同じ標本化契約の改修後二版では記憶glyphも完全一致。契約版を変更した比較に限り、両側で幻覚のDISP標本由来と記録した同じlevel/位置/更新順のglyphを、事前承認した具体的なpathごとにsampled-memory-glyphとして別判定できる。guardsはsampling-contracts-differ / both-recorded-hallucinated-disp-samples / same-level-position-and-update-order / terrain-and-non-glyph-memory-equal / CORE-and-rule-results-equalをすべて満たす。地形・位置の集合・更新順・知識/ルール結果・その他の記憶は一致必須。根拠が不足ならunconfirmedであり、memory全体を除外しない。paint前後は契約差の例外を一切使わず、すべての記憶と両RNGの完全一致を求める。

記憶glyphはhack.cの不可視マーカーやglyph_at等のルール判断にも使われる。標本化の差が後のCORE/ルール結果へ波及した場合は、その差を記憶の例外で消さずdifferentまたは未確認として残し、必要な仕様変更をレビューしてから扱う。

## 8. 比較と証拠

- paint前後: 同一ケース・言語・ビルド・boundary_id/kind/port_function・入力番号・対応表/正規化登録簿・標本化契約で比較する。command-ready / prompt-paused / core-suspendedいずれでも保護13領域と両RNGが完全一致。presentationの時刻/補間等は別に正当な変化を確認する。
- 同一版の再生: R5の全期間のシード/時計制御と固定外部入力から反復し、起点と各入力後の安定点を比較する。保存起点でも復元前から制御し、RNG状態を注入しない。
- 改修の直前版と候補: phase0以後の新規recipeまたはその新規セーブを起点に、同一言語の同じ意味の入力でCORE/ルール結果/知識/継続順を比較する。旧セーブ移行のことではない。DISPとその記憶glyphは表示標本化契約版と上記の個別条件に従う。コア表示準備の変更とpaintだけの比較を混ぜない。

観測ファイルはケース/言語/build/停止点・元セーブSHAと、envelopeが宣言する実行ファイルSHAの一致を検査する。RNGが添付されなくてもコア観測のschema/barrier/metadataを検査する。現在の形式検査は実行ファイルそのものを読んでハッシュした証拠ではない。phase0のrun-report生成器は、実際に起動したエンジンとフロントエンドの実ファイル、設定・データ・対応表/登録簿を実測し、プロセス/ビルドの情報とともに検証することを必須にする。宣言値の一致を代用しない。

R5 L-F1/L-F3/L-F4として形式検査を強化し、検査記録にUTC、監視対象にsrc/qt_darkdungeon.cppとヘッダー、Qt map/menu、prepare-sourceを追加した。記録したSHAと現在のファイルをロクが照合し、Claude Codeは読み取りレビューで検査結果を評価する。

差は全体SHAだけでなく、型を保った項目差分とJSON Pointerで記録する。真偽値falseと整数0、整数精度を失う数値を同一視しない。64bit値等は型付きの正確な文字列表現を使う。差分の詳細は内部正解として保管し、通常APIやAntigravityへ出さない。公開報告は判定と匿名化した差分の要約とする。

R5のF00〜F24と本仕様のN01〜N12/INV01〜14を、実装時の分岐表・観測器対応表・実ケース・画像/動画・計測ログへ結ぶ。各必須経路がpassまたは根拠付き非該当になるまで未確認を残し、空欄をpassにしない。英日をそれぞれ検査し、片方だけで完了としない。

F18はcommand-readyだけでは閉じない。prompt-pausedのメニュー/方向/yn、core-suspendedのdelay_output/--More--/tmp_at/dobuzz/explode、停止中の表示タイマー/ドラッグ/幻覚の持ち物を必須の枝とする。再現要件表の必須枝と一致を検査し、枝を一つ削除した場合も定義検査を失敗にする。

## 9. 今回の検査範囲と完了条件

[ツール](../tools/rendering-invariants/README.md)はソースの字句調査、定義の生成/照合、提供された合成JSONの厳密差分だけを実行する。Cの観測値、実際の通知・標本化・描画の不変性、全フィールドの実装網羅性は検査していない。実フィールド接続0、runtime_ready=false。

現行経路の根拠、コア/表示の所有境界、14不変条件、通知12群と寿命/可視性、私有13領域と正規化・完全性の条件、比較の点と証拠、旧セーブ廃棄方針、R5申し送り、Claude Codeレビューの指摘対応が揃ったときにR6仕様を完了とする。R7の比較見本、フェーズ0以降の観測/通知/描画実装・実ゲーム検証は別に必要とする。

初稿の[ソース再照合](../artifacts/r6-source-check-20261028.json)・[定義照合](../artifacts/r6-contract-check-20261028.json)、[29項目の合成比較検査](../artifacts/r6-contract-acceptance-20261028.json)、[48項目の形式検査](../artifacts/r6-fixture-acceptance-20261028.json)は成功した。すべてgame_executed=falseで、画像や通常のゲーム操作を検証した結果ではない。

初回レビューのhigh1件・medium5件とlow8件を反映した。[対応記録](rendering-invariant-review-response.md)に指摘と反映内容、再生成照合と修正後48合成検査/52形式検査を保存した。R6仕様完了時点は通知12群・監視318ファイルであり、初稿の通知11群・317ファイルと混同しない（#165の再監査後は322ファイル、#110の残りファイル削除後は318ファイル、§2参照）。

再レビューで初回の指摘の解消を確認し、追加medium2件（正規化の葉の検査、停止中paintの必須ケース）も反映した。最終確認へ提出した57合成検査/55形式検査は成功。窓口の許可表/barrier・生成元と変換後の対応・具体的な領域schemaの強化は、対応記録に実装前の申し送りとして残す。

[Claude Code最終確認](../artifacts/claude-r6-invariant-final-20261028.txt)は全high/mediumの解消とR6仕様の完了可を判定した。残る軽微な指摘は[対応記録](rendering-invariant-review-response.md)とtqueのフェーズ0配下で管理する。[R7](rendering-comparison-contract.md)も比較資料と新規代表素材の仕様を確定し、次はフェーズ0の実装へ進む。R6の実通知/観測の接続と実ゲームの不変確認は未完了。
