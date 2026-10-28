# R6 表示不変条件のソース調査・定義検査

[R6仕様](../../docs/rendering-invariant-contract.md)用。ゲームの起動・コア状態の採取・通知の接続・画像制作は行わない。

`docs/data/rendering-invariant-audit.json` は撤去前のR6仕様策定時の凍結記録で、現行ソースとの一致や旧hookの現在数を表さない。契約側の参照SHAと一緒に後続工程で再監査する。#128の現在の撤去検査には下記の専用検査を使う。

```powershell
python -X utf8 -B tools/rendering-invariants/audit-source.py
python -X utf8 -B tools/rendering-invariants/audit-source.py --check
python -X utf8 -B tools/rendering-invariants/contract.py
python -X utf8 -B tools/rendering-invariants/contract.py --check
python -X utf8 -B tools/rendering-invariants/verify-contract.py
```

UTF-8の生成済み英日ソースとPythonが必要。記録を保存する場合はSet-Content -Encoding utf8を使う。ソースはsrc/include/sys/windows/win/Qtの直下と独自srcを走査し、参照トークン、12群の関数位置、名前付きstruct/unionの宣言群とSHAをdocs/dataへ保存する。prepare-sourceとMakefileはハッシュ監視だけとする。QT_OBJSにないqt_druagaは非リンクとして区分し、他の実効コンパイル範囲は未確定と記録する。コメント・文字列を除く字句調査で、宣言・未使用/無効な条件分岐も含む。呼出グラフ、プリプロセス後のCレイアウト、全ルール経路や全Cフィールドの実装網羅性を証明するものではない。参照がないことだけで非該当としない。

contract.pyは14不変条件と保護対象13領域を定義する。compare_paintは渡されたJSONの値と両ISAAC64状態を厳密比較し、差のJSON Pointerを内部用に返す。command-ready/prompt-paused/core-suspendedの境界種別・窓口も結合する。対応表/正規化登録簿のSHA、表示標本化契約、領域別coverageを必須にし、不足があれば同じ値でもunconfirmedとする。正規化登録簿の形式を検査するが、paintでは保護状態の正規化や例外適用をしない。実ゲームの観測器もフィールドの完全性検証器もないため、合成値のequalは実描画・C状態の不変を証明しない。実装前に、Cメンバー・私有static・別階のデータを型付き観測へ結ぶ表を作成し、未接続・未分類を残して完全合格にしない。

verify-contract.pyの対象は合成データのみ。各保護領域、CORE/DISPの片方だけの変化、真偽値と整数の混同、入力・言語・ソース世代の誤結合、精度を失う数値、必須条件の欠落を検査する。全出力にUTC、入力/ツールSHAとgame_executed=falseを記録する。

## 旧アニメーション経路の撤去検査

```powershell
python tools/rendering-invariants/verify-legacy-retirement.py --build-root artifacts/phase0-r6-retire-v2-20261028 --output artifacts/r6-retire-animation-20261028/static-retirement-reviewed.json
```

生成完了のcore-port台帳と現在の木、srcからの既知の変換、旧識別子/シンボル、MAPとexeの結合を検査する。Qtでのactor実体探索はSMOKE支援用と非リンク残骸を分ける。この検査もゲームを起動せず、full_r6_invariance=unconfirmedを維持する。実行結果は[実装・検証記録](../../docs/phase0-legacy-retirement.md)へ別に記載した。
