# R7 Claude Codeレビューへの対応

2026-10-28。[初回レビュー](../artifacts/claude-r7-comparison-review-20261028.txt)はhigh1件・medium7件で仕様未完了と判定した。ロクは以下を反映した。今回ゲームの起動、新しい画像の制作/編集、Antigravityへの送信、通常セーブの生成は行っていない。

| 指摘 | 対応 |
|---|---|
| H1 上位仕様のphase0の見本が矛盾 | 上位V-08、phase0作業、8.1を修正。phase0は現行の実寸の記録、54/72は目標別欄、新作はphase2からAntigravity。G36の新作画素品質合格への使用も禁止しR7へ接続 |
| M1 briefの技術情報と派生の扱い | method/派生元/派生担当、出力名、表示先、列数/コマ番号/行順、接地点、記号実寸、主人公グループ/レシピ/部位選択/共通格子/方向別合成順の提案要求/着色を追加。smallは新しい主印からAntigravityが派生し、独立新作に数えない。最初はメタデータ提案の未送信下書きで、列/追加姿勢/全向きの合成順/接地点等を解決・技術検査してから、更新した依頼で画像生成へ進む。nullの方向順や初期4列を未解決のまま最終品へ採用しない |
| M2 説明と公開クラス | 部位/記号を人が読める公開説明へ置換し、decalや内部識別名を説明欄から除去。public_classと薬瓶/灰色の石の説明を追加。上流の説明へ内部名が混入しても拒否する検査を追加。公開キー以外の元ID/隠れた効果は加えない |
| M3 最初の画風が未承認 | 初回は未承認の文章の方向性＋許可された保持地形、メタデータ提案→整合性確認→試作→レモンの確認→style-guideの版/SHA記録→以後の依頼で参照、という順を本文/手順/freezes/下書きへ反映。最初から承認済みの画風を捏造しない |
| M4 G36の画素変換 | G36の新作48→54=9/8、地形48→36=3/4を宣言し、画素品質の判定を禁止。G48もDPR1.5では原画→物理画素2.25倍等の非整数を記録。原画1:1とG48ネイティブ表示の判定を分け、R1にも参照注記 |
| M5 撮影の分類と承認 | comparison_class/conformance/role/approval_recordを必須項目へ追加し、各欠落の否定検査を追加。未承認statusとnull/理由、確認者/日時/基準版SHA/scopeを明記。記録の正しさの確認と新作画風承認を分ける |
| M6 不変条件の抜け | promotionの全要件と再利用方針、phase2 eligibility、freezes、comparison class、native/viewport分離、heroレシピ、history/閲覧範囲等を検査し、個別の否定ケースを追加。actual comparison gateとbootstrap/matrix/viewport条件も検査 |
| M7 viewport固定と組合せ | phase0の作業/前提に迷宮内側864×432を実際に固定する手段を追加。現拡大率の英日960×640/最大化・G36/G48、全A09の24条件、原画/背景、動作の校正代表を区分。24行をJSONにも列挙し全行planned。実行不能は実環境/理由を記録してblocked/not-run、当該必須gateを合格にしない。phase5 A09とphase6で全行を要求し、初期段階の最小記録で全条件を免除しない |
| L1 gate名/必要物 | R4のR7-comparison-artifacts-readyへ統一。必要な基準版/生メディア/測定/新原画画風承認/phase3-4動画/品質対応をgate_requirementsへ記録、ready=false |
| L2 検査名 | 比率と原画寸法を別検査にし、全下書きの原画48を実際に検査 |
| L3 閲覧範囲 | history_catalogに資料ごとのinspection_scopeを追加。日本語画像はhash/寸法だけ、ビルド対応/旧動画未確認と明記 |
| L4 「今」の意味 | 現行の絵を保持しつつR6適合修正を行ったphase0確認版と明記。現在のdistを無検証の基準にしない |
| L5 OS | Windowsネイティブを主な24条件とし、Linux/macOSは別実行・別DPR等で確認、未実行を合格にしない |

初稿の30検査・レビューを保持した。修正後の[再生成照合](../artifacts/r7-definition-check-followup-20261028.json)と[62項目の静的検査](../artifacts/r7-definition-acceptance-followup-20261028.json)は成功した。比較定義SHAはf3e812d9ab87b40147b5671d4560ca18cb56f6a2c62103cf54cdcb0345c55bcd、下書きSHAは34d78e0f0cc163b28e8aca579ccfe86cc9fc54fd79a2ac62eaac50d847ed7c9d。ツールSHAとUTCも記録した。

## 再レビューの判定と残るlow

[再レビュー](../artifacts/claude-r7-comparison-followup-20261028.txt)はH1/M1〜M7/L1〜L5すべての解消を確認し、R7仕様は完了扱いにできると判定した。初回レビュー冒頭の「medium6件」は実際のM1〜M7と一致せず、ここでは7件として記録した。Claude CodeはRead/Grep/Globだけを使い、検査・SHA照合・画像/動画の閲覧を実行していない。ロクが実行した62検査と現在のファイル/記録のSHAを照合して引き渡す。

- 新low L-a: captureのconformance/role/approval statusのenumと、reasonを含む承認record構造の機械検査をphase0で実装する。現在は項目の欠落と定義の整合性までの静的検査であり、実撮影recordのvalidatorは未実装。
- L-b/L-c: phase0の合成順の初期案は現行の固定順と問題点の記録で、Antigravityへ確定値として渡さないと追記した。上位仕様/R1の「見本」も現行記録とphase2新作G48へ言い換えた。
- L-d: mapだけへ限定する案は採用しない。display.h:950のstatue_to_glyphは幻覚時にrandom_monsterの男女glyphを返し、obj_to_glyphが像から呼ぶ。R2:145も持ち物/装備/メニューからキャラクター表へ進む仕様を確定済みである。ロクが該当ソースを追加確認し、敵の実体が持ち物に入る意味ではなく、コアが許可した表示分類を解決する経路だと本文へ明記した。未確認だった経路を補足する対応で、下書きの表示先を狭めない。
- L-e: 拒否語/数字だけの説明等の強化と、実送信時のpublic brief/添付の点検はphase2更新前のタスクへ残す。現在の文字パターンと生成器内定数の照合だけで、あらゆる秘密の不混入を証明したとは扱わない。

今回のツールSHAはcontract.py=8b136afe5d6d8afe4370139045e884470f915f0a06efb8ba5f9f6af23bad6ccc、verify-contract.py=1fdc929ad6a4ff3a4b948c3c336e0cebee2fbfe9cf54d1ee327add2d9ffb7c15。次の改修ではこの記録と新しいSHA・差分を照合し、必要な再レビューを行う。

最終判定後は状態・根拠・申し送りの文書を追記した。検査ツールは変更していない。R7は仕様として完了だが、実比較資料や画像の品質合格・実依頼・R7-comparison-artifacts-readyの成立ではない。
