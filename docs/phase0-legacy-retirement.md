# フェーズ0: 旧アニメーション経路の撤去（#128）

2026-10-28。#109のうち旧攻撃通知・敵位置の推測・描画時の敵実体探索を撤去した。#129の持ち物/装備/drag/timerのDISP消費、R6全体、フェーズ0全体は未完了。

## 変更した処理

- prepare-sourceの旧攻撃挿入3ブロック（生成されるコア呼出4箇所）、Qt/agentの旧通知関数と宣言を削除した。
- 30msタイマー、fmon/m_idからの位置差推測、m_at/canspotmonを読むactor overlay、歩行中だけカーソルを隠す処理を削除した。
- マップはコアから既に渡されたglyphを静止タイルとして描く。新しい歩行・攻撃通知と品質の受入はフェーズ3/4で行う。
- SMOKE内で仮のペットを作りstartAnimationを直接呼ぶ旧検査を削除した。資産ロード・地形合成等の検査は維持し、歩行/攻撃は明示的にnot-runと記録する。静止表示を動作品質の合格としない。

## 確認版と静的検査

確認版は `artifacts/phase0-r6-retire-v2-20261028`。EN本体SHAは `26936e510ac31b384dfe5113df26cf5180e0a75639316d0763043e9f2e25f460`、JAは `6e593bf9f369d6979a616a966ee27f2dd1d60f1c23dc10a4cddb0f7026c519f7`。

```powershell
python tools/rendering-invariants/verify-legacy-retirement.py `
  --build-root artifacts/phase0-r6-retire-v2-20261028 `
  --output artifacts/r6-retire-animation-20261028/static-retirement-reviewed.json
```

英日の生成ソースで旧識別子0件、リンクMAPで旧シンボル0件を確認した。生成完了時のcore-port台帳のSHA、現在のsrc→C1の既知変換との一致、MAPと配置exeのSHA結合を検査する。未結合の旧manifestは失敗になることも確認した（`provenance-negative.json`）。これはビルドの完全な再現性や全ソース→全オブジェクトの対応の証明ではない。

リンク対象のQtコードではfmon/canspotmonを禁止し、m_atはSMOKE出力ガード以降の支援用処理だけを許す。生成木に残る非リンクのqt_druaga.cppはMakefileとMAPで非リンクを確認する。共通コアのUnix移行は未実施で、旧Unix patchを現在の適用済みソースとは扱わない。

## 実行確認

英日ともNative SMOKEの保存・再開が通過した。`-RequireRetiredMotion` を付け、not-run行の欠落と旧アニメーションのpass行の混入を失敗にする。コントローラの実行引数・終了値・stdout/stderrは `artifacts/r6-retire-animation-20261028/controller` に保存する。

SMOKEは状態の準備・変更を伴う支援検査であり、通常手動プレイやルール/RNG不変性の証明ではない。offscreen検査は新候補と0-1候補の双方でマップフォーカス判定のexit 38となった。これは未解決として残し、Nativeの成功で置き換えて合格とはしない。

通常手動確認では、停止済みの0-1プロフィールをリンクなしで `artifacts/p0-r6-manual-20261028` へコピーした。固定シード/時計/SMOKEを使わず、英日で復元・方向入力・Space・通常保存終了を確認した。記録は同証拠フォルダーのmanual内。元プロフィールの全ファイル内容は不変で、通常保存先のファイル内容とQt設定値の前後照合にも差分はなかった。

ENは歩数3で復元し、方向操作2回とSpace後に歩数6で保存した。途中でジャッカルの攻撃メッセージとHP変化があった。JAは歩数3で復元し、左移動とSpace後に歩数5、体力13/13で保存した。ゲーム規則の全状態や全RNGの一致、R5の制御付きfixture受入を主張しない。

## レビューと残件

[初回](../artifacts/claude-r6-retire-animation-review-20261028.txt)と[再レビュー](../artifacts/claude-r6-retire-animation-followup-20261028.txt)をClaude Codeへ読み取り専用で依頼した。再レビューは#128完了可と判定した。検査器の生成元確認・MAP結合・GUI探索範囲・not-run判定を補強し、旧監査表の時点とoffscreen失敗の記録を明確にした。

`docs/data/rendering-invariant-audit.json` はR6仕様策定時の撤去前の凍結記録で、現在のソースとは一致しない。旧hook件数を現在の残存数として読まない。契約/台帳の参照SHAを無断で更新せず、現工程の補足は `static-retirement-reviewed.json` に分離した。全体の再監査と基準化は#129以降に行う。

持ち物の250ms timerと乱数を使う差分判定は[#131](phase0-inventory-refresh.md)で撤去・検証した。描画/dragに残るobj_to_glyph、名前生成、portraitのlive状態参照は#129/#132で継続する。公開データの所有者、入力境界、完全な状態観測、R7のviewport/DPI比較は別の未完了タスクである。主人公に似たタイルが別マスにある場面も記録したが、正体や原因を推測で確定しない。新素材の制作はフェーズ2からAntigravityへ依頼する。
