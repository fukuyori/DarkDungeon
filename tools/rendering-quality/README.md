# R4 品質適用表と静的な騎乗・行動候補

確定済みR3の抽出器・台帳は書き換えず、別のCプログラムで383種の静的表を読む。monst_globals_initの表コピーだけを行い、ゲーム・RNG・Qtは起動しない。現在のWindows x64の生成済みソースとVisual Studio C++ツールが必要。

```powershell
.\tools\rendering-quality\Export-Capabilities.ps1 -Language en -OutputDirectory .\artifacts\r4-capabilities-followup-20261028\en
.\tools\rendering-quality\Export-Capabilities.ps1 -Language ja -OutputDirectory .\artifacts\r4-capabilities-followup-20261028\ja
python -B tools/rendering-quality/build-quality-plan.py artifacts/r4-capabilities-followup-20261028
python -B tools/rendering-quality/build-quality-plan.py artifacts/r4-capabilities-followup-20261028 --check
python -B tools/rendering-quality/verify-quality-plan.py artifacts/r4-capabilities-followup-20261028
```

抽出器・中間物・capabilities.json・provenance.jsonは指定したartifacts内へ出す。生成はdocs/data/rendering-quality-plan.jsonとsummaryを更新し、--checkは書き換えず一致を確認する。検査は静的な全件適用・依存関係・負の検査で、画像の品質やゲームの動作の確認ではない。

騎乗候補はsteed.c:can_rideの形の必要条件だけを実際のマクロで評価する。143種・両性別286表示を候補、240種・480表示を形の条件から除外した。変身禁止や騎乗成立・到達可能性は判定しない。mount_steedはforceでもcan_saddle/can_rideの判定を残し、polyselfではcan_ride不成立時に降ろすことをソースで確認した。ソースが変わったらこの根拠も再確認する。

攻撃表は攻撃方法だけを記録し、空枠、受動、死亡時効果と能動行動を混同しない。描画・RNGの入力として使わない。入力・抽出器ハッシュが違えば停止し、英日一致とR3のenumの対応を確認する。内部資料には種別の識別情報があるため、プレイ観測・通常の描画監査・画像制作依頼へそのまま渡さない。

全2,165制作対象と地形122件を品質プロファイルに対応付ける。定義表は合否や進捗の正本ではない。結果はR3台帳と証拠に保存し、この生成処理は変更しない。進捗欄だけの変更は定義のSHA-256へ含めない。基準を変える場合は再レビューを行う。

5-1は42部位と先行26職業表示・6乗騎表示を必要とし、5-2の主担当766件にはその26件も含まれる。先行32件を二重に制作対象へ加算せず、5-1が5-2全体を待つ循環を作らない。5-3は品物438＋像766、5-4は特殊120＋印3＋状態29＋起動1。最後だけcompleteモードを必須とする。

初回レビューを受け、ポニー→馬→軍馬（role.cのナイトの初期ペットとmondata.cの成長表）の両表示性別6件を5-1の先行ゲートへ追加した。地形122件は5-4のaudit_keysへ全件列挙し、累積接続と最終2,287件を検査する。補助ゲートはR3台帳から実枠・キーを計算する。

静的攻撃表は実際の行動の全集合ではない。getmattkの置き換え・SEDUCE設定、weapon/spellの近接/遠隔分岐、品物の使用をR5/R6で確認する。mount_steedのslithy/Hallucination/Wounded_legsと、騎乗後に変身した場合のcan_rideを分ける。slithyとpolyokも抽出するが、候補143種の実際の到達可能性はR5まで未検証。

検査は両言語の結果・入力ハッシュを再照合する。生成と--checkの記録にはmode、日時、品質表のSHA-256、言語別の抽出結果の出力ハッシュを含める。元入力のハッシュは品質表内のsource_provenanceに記録する。静的検査も品質表のSHA-256を残す。原画やゲームの品質が合格した記録ではない。
