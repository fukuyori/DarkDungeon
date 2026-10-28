# R3 ソース抽出と制作台帳

ゲームを起動せず、生成済み英語・日本語ソースの静的表を小さなCプログラムで抽出する。objects_globals_init / monst_globals_initは元の静的表をコピーするだけで、乱数やゲーム状態の初期化は呼ばない。現在のMakefileが共通コア分離済みならDARKDUNGEON_APP / NOTTYGRAPHICSを使い、日本語用の定義も記録する。

Visual Studio C++ツールのある環境でPowerShellから実行する。ソース準備・ゲーム本体のビルド・配布・セーブの変更は行わない。旧結果を比較する場合は新しい出力ディレクトリを指定する。

```powershell
.\tools\rendering-scope\Export-SourceInventory.ps1 -Language en -OutputDirectory .\artifacts\r3-source-inventory-20261028\en
.\tools\rendering-scope\Export-SourceInventory.ps1 -Language ja -OutputDirectory .\artifacts\r3-source-inventory-20261028\ja
python -B tools/rendering-scope/build-production-ledger.py artifacts/r3-source-inventory-20261028
python -B tools/rendering-scope/build-production-ledger.py artifacts/r3-source-inventory-20261028 --check
python -B tools/rendering-scope/verify-production-ledger.py artifacts/r3-source-inventory-20261028
```

最初の2行はartifacts内に抽出器・中間物・source-inventory.json・provenance.jsonを作る。3行目はdocs/dataの台帳・集計・品物の制作依頼用データを更新する。4行目は書き換えず現在の台帳との一致を検査する。5行目は共通外見、全glyph・全タイル、情報の分離、欠落・不正な素材内番号を拒否する負の検査を行う。ゲーム動作や完成画像の品質検査ではない。

build/nethack と build/nethack-jaのsrc/tile.cとsrc/tilemappings.lstが必要。タイルリストの長い参照列は省略されるため、glyph全件にはコンパイルしたglyphmapを使う。明示的なskip記録から未参照の予約枠も復元し、全タイル枠を分類する。入力ハッシュ不一致、英日対応の相違、未分類の枠、未登録のNULL外見、共有関係の変化は失敗にする。別OS・機能構成への件数の一般化はしない。

rendering-public-name-registry.jsonは手動審査する登録表。新たな項目を自動で追加しない。ソースの元英語公開名・静的既知フラグを照合し、死体・像・卵・果物・人形は個別方針で扱う。品物のクラスキーとdescription/public-nameはR3で固定した識別子。

rendering-production-ledger.jsonは内部の照合資料で、真の名前に対応するenumや元タイル番号を含む。CLI観測・通常監査・Antigravityへ渡さない。rendering-item-briefs.jsonだけが品物の外見に絞った依頼用データであり、R1の形式・R4の品質条件と併用する。ファイルがあることは制作を送信した証拠ではない。

台帳再生成は進捗付きの素材定義を黙って変更・削除しない。追跡状態の証拠（依頼記録・納品ハッシュ・実行確認）が揃うまで、後続フェーズで完了にしない。現在の検証器の「全対象が未依頼」検査は今回のR3初期台帳用で、制作開始後はその時点の証拠に合わせて更新する。

R3再レビュー対応: 主人公部位の役割と旧PNG101件の一覧はrendering-scope-baseline.jsonへ固定した。新しい納品物を読み取って「旧画像」と判定しない。素材定義にはタイル・glyphへの接続も含め、進捗のある定義・接続変更や削除は明示的な照合なしに反映しない。受入検査には進捗保持・変更/削除/接続変更の拒否、公開名登録の過不足、英日不一致の拒否を含める。起動・セーブ選択画像、墓石、Qtの3種の印もR3台帳に記録した。

状態用XPM30件と印3件の名前・元定義ハッシュも固定登録へ移した。新素材の接続でQtソースを変更・削除しても対象一覧を減らさない。進捗の正本はrendering-production-ledger.jsonであり、欠損した場合は履歴・保存済みの証拠から復元するまで生成を停止する。初期化・進捗リセットを再生成の副作用にしない。現行44検査には、Qt画像ソースがない模擬ツリーでの全台帳一致も含む。
