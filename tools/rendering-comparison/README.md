# R7 比較資料と新規代表素材の定義検査

[R7仕様](../../docs/rendering-comparison-contract.md)用。R3/R4の台帳から代表26論理対象を選び、比較定義と公開外見だけの依頼下書きをdocs/dataへ出力する。画像制作・画像編集・依頼送信・ゲーム起動は行わない。

```powershell
python -X utf8 -B tools/rendering-comparison/contract.py
python -X utf8 -B tools/rendering-comparison/contract.py --check
python -X utf8 -B tools/rendering-comparison/verify-contract.py
```

PowerShellで記録を保存するときはSet-Content -Encoding utf8を使う。R3〜R6の定義SHAを結び、役割・条件・候補を再生成して照合する。履歴4資料は存在する場合だけ既知のSHAとPNG寸法を照合し、不在なら利用不可の参考資料として記録する。ソース/画像の同一ビルド性や画像の品質をハッシュから認定しない。

公開用下書きはallowlistの項目だけを持ち、公開クラスと人が読める説明、method/派生元/担当、出力名/表示先、列/コマ/行順/接地点、記号実寸、主人公合成/レシピの要求を含む。small markは新しい主印からAntigravityが派生する。tile/glyph/真の種類・元台帳や添付ファイル等の追加を拒否する。実際の添付・送信時の確認は別に必要。最初の下書きは未承認の方向性と技術メタデータ提案を求める段階であり、列/追加姿勢/向き別合成順/接地点を解決して更新するまで画像生成へ進まない。下書きが生成されたことをAntigravityへ依頼済みとしない。

G36は比率/構図の診断専用、G48はネイティブ表示の判読、原画は1:1の画素検査として区分する。実DPRを含めた非整数変換、全画面と迷宮領域、診断表示と実寸、参考と品質合格を区別する。24行のWindows layout_case_matrixは現在すべてplanned/not-probed。必須/代表/実行不能の扱いとR4の実資料ゲートも定義し、定義だけではreadyにしない。

検査は合成したメタデータの変更を使い、歴史資料の品質合格への流用、phase0の画像制作/昇格、寸法/公開外見/依頼先の取り違え、条件や出所の欠落を拒否する。結果は実ゲームや実メディアの品質検証ではなく、runtime_ready=falseのままとする。

## 撮影記録の分類・承認検査（0-2 / #115）

```powershell
python -X utf8 -B tools/rendering-comparison/capture_record.py path/to/classification.json
python -X utf8 -B tools/rendering-comparison/verify-capture-record.py
```

分類用の別ファイルは次の項目を厳密に持つ。欠落、余分な項目、重複JSONキー、enumの未知値・型違いを拒否する。撮影本体とは同じcapture_idで結ぶ予定で、その結合とメディア検査は#114側で実装する。この検査単体はファイルの実在、SHAの一致、承認者の本人性、R5/R6適合を認定しない。出力のclassification_valid=trueは分類構造だけの合格で、runtime_ready/evidence_verified/approval_authenticity_verifiedは常にfalse。

- schema: `darkdungeon-capture-classification-v1`
- capture_id: 空でない文字列
- comparison_class: paired-controlled-public-scene / layout-only / advisory-unpaired / renderer-support
- conformance: conforming / non-conforming-reference
- role: history / phase0 / geometry / phase2 / phase3-4
- reason: 非適合の参考なら空でない理由、そうでなければnullまたは理由
- approval_record: status、author、date、style_guide_version、style_guide_sha256、scope、reasonの7項目

scopeはrole順にhistorical-reference / phase0-baseline / geometry-measurement / style-guide / motion-comparisonとする。これは画風承認と比較元の確認を区別するための記録上の名称である。historyはadvisory-unpairedかつnon-conforming-referenceだけを許す。

pendingはauthor/date/画風版/SHAをnullとし、未確認の理由を必須にする。approved/rejectedは確認者と実在するISO日付YYYY-MM-DDを要求し、rejectedは理由も必要。画風版とSHAは両方nullまたは版文字列と小文字16進64桁の組。phase2とphase3-4のapprovedには画風版/SHAを要求する。history/phase0/geometryには画風承認を混ぜず、phase0の非適合参考をapprovedの基準にしない。

テスト内の承認情報はすべて合成値で、実際のレモンの承認ではない。この工程では画像を生成・撮影せず、既存の定義JSONや24条件のplanned状態も変更しない。

## ウィジェット描画による寸法記録（#114 / #133）

新しい確認版を`start-manual-play.ps1`の専用プロフィールで起動すると、`表示比較 / Comparison`メニューを使える。G36またはG48を選び、迷宮の内側を864×432に固定してから「寸法の参考記録を保存」を選ぶ。保存先はプロフィールの言語別`captures/<UUID>`。「通常の配置に戻す」で固定前のサイズ制約とタイル寸法へ戻す。通常起動にはこのメニューを出さない。通常のズームや設定変更を行った場合も比較固定を解除し、利用者の設定を優先する。比較用の寸法変更自体は保存設定を変更しない。

記録にはclient.png、map.png、geometry.json、classification.jsonが含まれる。QWidget::grabで描いた画像であり、デスクトップに実提示された画像の撮影ではない。分類はlayout-only / non-conforming-reference / geometry / pending。画像を引き伸ばさず、viewport実寸が一致しない場合は保存を拒否する。既存の記録を上書きしない。

```powershell
python -X utf8 -B tools/rendering-comparison/verify-geometry.py path/to/capture-directory
```

検査器は分類とのID一致、内側寸法、タイル寸法、マス数、PNG寸法とSHA、DPRとの関係を照合する。v1記録ではOS拡大率を未測定としてnullと理由を保存する。v2の計測方法は次節を参照。全24条件、デスクトップ提示、画面内のクリップ、身体の実寸、生成元の完全な結合、R5/R6適合・乱数不変性はこの記録の合格対象ではない。SMOKEによる記録はゲーム状態を準備する支援実行であり、通常手動プレイの証拠にはしない。

### WindowsのOS拡大率（v2記録）

v1の記録はOS拡大率が未測定。v2ではQt専用の`qt_monitor_scale.cpp`で、ネイティブウィンドウに交差するモニターを`MonitorFromWindow`で取得し、`GetScaleFactorForMonitor`の値を記録する。Qt DPRとは独立したAPI値であり、Windowsの表示設定を変更しない。

描画記録の直前・直後に問い合わせ、両方S_OKでモニター名と値が一致した場合だけos_scale_percentを採用する。API失敗時の代替値は採用しない。変化・非ネイティブ環境・取得失敗はnullと理由を残す。モニター名はこの短い記録区間の識別に使い、物理モニターの永続IDとは扱わない。カスタム拡大率の設定画面との一致は別途未確認。

```powershell
python -X utf8 -B tools/rendering-comparison/verify-os-scale.py
python -X utf8 -B tools/rendering-comparison/layout-progress.py --bundle path/to/bundle --output artifacts/new-layout-progress.json
```

前者は合成値による27項目の検査で、実モニターを計測しない。後者は実バンドルを検査し、英日×通常3サイズ/最大化×100/150/200%の24行に参考観測を関連付ける。寸法と拡大率が合っても、UI場面やR5/R6等の証拠が揃っていないため行の状態はnot-run、passed_countは0のままにする。表外の寸法や未測定の記録もreference_observationsへ残し、必須行を置き換えない。過去の出力ファイルは上書きしない。

API根拠：[GetScaleFactorForMonitor](https://learn.microsoft.com/en-us/windows/win32/api/shellscalingapi/nf-shellscalingapi-getscalefactorformonitor)、[MonitorFromWindow](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-monitorfromwindow)。OS拡大率が取得できても、画面提示や全条件の合格にはならない。
