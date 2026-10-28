# R5 Claude Codeレビューへの対応

現行方針の追記（2026-10-28）: R5完了後、利用者から現在の旧セーブの引継ぎ不要・削除の指示があった。以下の7方向・44検査と未確定事項は当時の履歴であり、現在は[R6](rendering-invariant-contract.md)で5方向・旧データ移行不要へ変更し、L-F1/L-F3/L-F4の形式検査も強化する。過去のレビュー判定を書き換えて、新方針も確認済みだったとは扱わない。

2026-10-28。[初回レビュー](../artifacts/claude-r5-reproduction-review-20261028.txt)はhigh2件・medium5件により仕様未完了と判定した。以下は反映内容。ゲーム実装や実セーブによる成功の判定とは分ける。

| 指摘 | 反映内容 |
|---|---|
| H1 現行の描画/タイマーによるDISP消費 | qt_inventory.cppのitemImage/drag/signatureとQtのdrawWornをソース照合し、既知の不適合として登録。R6の標本化契約に沿った修正・レビュー後にフェーズ0の適合基準版を凍結する方針(a)を採用。修正前は非適合参照で保存し、失敗をpassにしない。幻覚時の持ち物/容器/装備の開閉・タイマー・ドラッグを必須条件に追加。今回ゲームの修正はしていない |
| H2 時計/シード制御の期間 | 開始時だけという記述を削除。初期化前・復元・プレイ・終了まで、全シード要求とtime/localtime・TZ/DSTを制御/記録。OS時計は変更しない。深夜・カレンダー境界も再生の枝に追加 |
| M1 復元時の実日時による変化 | allmainの月齢/13日の金曜日のLuckとメッセージ、restoreの経過時間再開始とINSURANCE書込を事前期待値へ追加。計測版は復元時も制御、通常手動版は実日時を記録 |
| M2 セーブ起点の再生 | 許可する。新規プロセスで、復元前のoptions初期化から全期間を制御する。保存直前のRNGへ戻す意味ではない。自動F18/F19のos-nativeを形式検査でも拒否 |
| M3 形式の不足 | envelopeは起点1停止点と明示。言語/build_id/checkpoint_id/phaseをコア観測とRNG bindingへ追加。別のrun-v1報告に観測列、入力、シード要求・再シード試行列、時計/TZ/DST列の最低形式を定義。実生成器・比較器はフェーズ0、Cフィールド/安定点/採取箇所の対応はR6で実装前に確定 |
| M4 プロフィールの現状 | EN保存先の配下にJAがあること、ANSI/MAX_PATH、smokeのexe側保存・固定シード・自動操作、ランチャーの環境継承とPID未追跡を明記。F00にSMOKE残留の拒否/除去、JAの分離、非ASCII保存先を追加 |
| M5 標準ローダー内の変換 | SFCTOOL_BITとrevision_incrementをソース照合。compatible-load / converted-load / rejected / not-runを分離。候補のrevision増加で旧版が拒否した場合は、双方向互換ゲート不合格。避けられない形式変更は別の仕様変更・レビューが必要 |
| L1 UTF-8・ツール識別 | Python -X utf8とSet-Content -Encoding utf8で修正後の記録を保存し、ツール自体のSHA-256も検査出力に記録する。初回記録は上書きしない |
| L2 ローカル絶対パス | プローブ由来のsource_rootをリポジトリ相対へ変更し、読込時にも一致を検査 |
| L3 診断のマクロ・WIP | マクロと実ゲームビルドの全設定の一致は未検証と明示。NH_DEVEL_STATUSも静的プローブへ追加。実行ファイルのABI/保存互換をこのプローブで保証しない |
| L4 監視ソース | calendar/allmain/files/display.h、Qtインベントリ・設定・選択、独自frontend/launcher等とnhlua/nhlibのハッシュを追加 |
| L5 junction検出 | Windowsのlstatのreparse属性で拒否し、Python 3.12のis_junction有無に依存しない。欠落パスも明示拒否 |
| L6 390組の所属 | renderer-supportの390組をF01から除き、F22にだけ保持 |
| L7 bonesの早期return | mklevのgetbones成功時は末尾2系列のreseedが発生しないことを明記。実分岐・列に照合し、一律の要求数を仮定しない |
| L8 smokeの根拠 | qt_plselとqt_inventoryの自動操作経路を現状表とハッシュ監視へ追加 |

修正後は別のartifacts/r5-layout-followup-20261028へ英日プローブを出力し、初回記録を保持した。[再生成照合](../artifacts/r5-plan-check-followup-20261028.json)と[35項目の静的形式検査](../artifacts/r5-protocol-followup-20261028.json)は成功した。全期間制御・基準版の前提、言語/版/停止点の誤結合、未制御のos-native再生を拒否する検査を追加した。記録はUTF-8で、ツール5件のSHAも含む。要件表SHAはf64e1a9249668329cd779ba7b6c067e41566552ce7ae495ff7adaad8a5c9dece。

## 再レビューと追加対応

[再レビュー](../artifacts/claude-r5-reproduction-followup-20261028.txt)で、初回H/MとL1〜L8の解消を確認した。追加のmedium1件とlow8件は以下のとおり反映した。

| 指摘 | 反映内容 |
|---|---|
| M-N1 修正前の保存が互換マトリクスから抜ける | pre-fix-reference-to-phase0 / phase0-to-pre-fix-referenceを必須化。非適合参照も保存の読込元/先であると明記。配布版の実ファイル/serializerを識別し、異なる対象版は個別に確認。両方向それぞれの欠落を拒否する検査を追加 |
| L-N1 拒否の理由 | 全否定検査で期待するValueErrorの理由まで一致を必須化。無関係な理由の失敗は検査不合格 |
| L-N2 コアの結合 | 実際にコア観測ファイルの言語/停止点を変更・再ハッシュしたケースの拒否を検査 |
| L-N3 起点/停止点・provider | 起点とphaseの対応を検査。preflightはnegative-coreのみ。controlled-strong/weakは全期間一貫したモードと定義し、強いシードの実観測フラグと照合。os-nativeは成功後にフラグが残り得るので同じ制約にしない |
| L-N4 報告の全項目 | run_report_contract全体を定数と完全一致で検査。seed_requests欠落の否定検査を追加。verdictをpassed/failed/unconfirmed/not-run/known-nonconformanceに確定 |
| L-N5 getnow外の時計 | time直呼びとgetnow経由の初期化・保存・終了・中断・情報表示等を現状表へ追加。u_init/cmd/end/insight/declもハッシュ監視し、取得箇所の全件監査はR6へ渡す |
| L-N6 F18の画面条件 | F18にも幻覚＋持ち物/容器/装備の開閉・タイマー・ドラッグ条件を追加 |
| L-N7 状態と検査記録 | 古い「開始時計」を修正。各回の判定を履歴として残し、最新の検査を下記へ明記 |
| L-N8 リンクの実検査 | 合成一時ディレクトリ内に本物のjunctionとsymlinkを作り、reparse検出による拒否と後片付けを実行。hard linkと合わせてすべて成功、スキップ0。junction作成の初回はcmdの引用不備で失敗したが、エラー出力を取得して修正後に全検査を通した |

最新の[再生成照合](../artifacts/r5-plan-check-final-20261028.json)と[44項目の静的形式検査](../artifacts/r5-protocol-final-20261028.json)は成功、スキップ0。英日プローブはartifacts/r5-layout-final-20261028へ分離した。要件表SHAは983468680584e195a9a3ba96de3903bb861691022b1350d069b5d534e986c030で、記録のツールSHAも最終実行時の値を含む。

## 最終確認の判定と申し送り

[最終確認](../artifacts/claude-r5-reproduction-final-20261028.txt)は全high/mediumとL-N1〜L-N8の解消を確認し、R5仕様は完了扱いにできると判定した。Claude Codeは記録とソースを読んだだけで検査を再実行していない。ロクが最終確認待ちに要件表とツール5件の現物SHAを記録と照合し、一致を確認した。

残るlowはR6・フェーズ0への申し送りとしてtqueのID10配下で管理する。

- L-F1: RNGなしの場合も含めたコア観測のschema/barrier/言語/版/停止点と実行ファイルの直接結合。現在の形式検査の限界であり、完全な観測検証を実装済みとしない。
- L-F2: 修正前の配布版→各後続候補への直接読込の方針をR6で確定する。現行の7方向の成功を推移させて直接読込の成功とは報告しない。方針と追加ゲートが決まるまで直接経路は未確認。
- L-F3: 検査記録自体の作成UTCを追加する。今回の生成照合はcreated_utcを持つが、44検査の出力は時刻を持たない。ツールハッシュとの一致は別途確認した。
- L-F4: 監視対象へsrc/qt_darkdungeon.cppも含める。今回このファイルは開始時と同じCC05E685749E84F064F6F23EA1D0A8BD1DEB567E0E2745E9BB5FEB7F55A154AAであることを照合したが、プローブの監視にはまだ含めていない。

最終判定後は状態・申し送りを追記し、本文の「R6で実装」を「R6で仕様確定、フェーズ0以降で実装」と整理した。検証契約やツールの追加変更・再レビューを実施したという意味ではない。

R5は仕様として完了。画像制作、ゲーム本体変更・起動、実セーブ復元、R5-scenarios-readyの合格は行っていない。
