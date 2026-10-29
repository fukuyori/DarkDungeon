# フェーズ0：R5計画・R6調査表の再監査（#165）

2026-10-29。R5計画とR6のソース調査表は、フェーズ0の改修前のソースのSHAで凍結されていた。そのため、`verify-fixture-plan.py`（R5）と`audit-source.py --check`（R6）が失敗していた。レモンの決定（「確認して作り直す」）に従い、差分がR5/R6の意味に影響しないことを確認してから、R5計画→R6調査表→R6定義→R7定義の順に作り直した。

## 依存の連鎖

| ファイル | 参照しているもの |
|---|---|
| `docs/data/rendering-fixture-plan.json`（R5計画） | 生成済みソースと独自srcのSHA、構造体の配置 |
| `docs/data/rendering-invariant-audit.json`（R6調査表） | 生成済みソースと独自srcのSHA、参照・経路・宣言 |
| `docs/data/rendering-invariant-contract.json`（R6定義） | R5計画とR6調査表のSHA、件数 |
| `docs/data/rendering-comparison-contract.json`（R7定義） | R5計画とR6定義のSHA（ほかR3/R4の入力） |

## 確認した差分

作り直す前に、現在のソースでの調査結果を凍結版とメモリ上で比較した。レビューの指摘を受けて、旧版（Git 38fa7e4）と新版の比較結果を`artifacts/r5-r6-reaudit-20261029/diff-summary.json`に保存した。参照のファイル×トークンごとの増減、経路の行番号の変化、構造体ごとの宣言の追加・削除、監視ファイルの増減・変更を含む。

参照の件数は、独自srcと生成先の2つのコピーにあるもの（例：`qt_inventory.cpp`の`update_inventory`は5件×2で+10）と、生成先にだけあるもの（例：`qt_inv.cpp`）の合計である。

- **構造体の配置とRNGの形式**：英日とも凍結値と一致した（`artifacts/r5-r6-reaudit-20261029/layout`）。照合したのは、R5のプローブが出す診断用の構造体の大きさとヘッダー定数、RNGの形式であり、全構造体の配置ではない。
- **R5計画**：変わったのはソースのSHAだけで、計画の内容は同じだった。
- **R6調査表の参照**：英日とも次のとおりで、すべてフェーズ0の改修の結果である。
  - 旧攻撃通知`darkdungeon_note_attack(`の14件がなくなった（#128）。
  - `qt_darkdungeon.cpp`の`flush_screen`が4件減った（旧アニメーションの撤去、#128）。
  - `qt_inv.cpp`の`obj_to_glyph`・`rn2_on_display_rng`・`map_glyphinfo`が各1件減り、`qt_inventory.cpp`で`map_glyphinfo`が2件、`update_inventory`が10件増えた（表示スナップショット、#132）。
- **経路12群**：関数名はすべて同じで、行番号だけが変わった。
- **宣言**：メンバー宣言の+10は、次の2つである（それぞれ独自srcと生成先の2コピー）。
  - 新しいファイル`manual_profile.h`の`struct Session`（4メンバー：`lock`、`data`、`reportPath`、`report`）。Qtフロントエンドの専用プロフィールの記録で、コアの状態ではない。
  - `app_runtime.h`の`struct darkdungeon_runtime_config`に`const char *manual_data`が増えた（0-1、#13）。専用プロフィールの保存・設定先を指す値で、ゲームのルールには関わらない。ただし、コアが保存する場所に影響する外部入力であり、`darkdungeon_core_abi`のoffsetにも含まれる。R6の保護13領域ではauxiliary（外部入力の実効状態）またはclock以外の制御設定に当たるため、field-map（#107）で明示的に分類する。未分類のまま完全合格にしない。
- **監視ファイル**：`qt_monitor_scale.cpp`と`manual_profile.h`（独自srcと生成先）の4件が増えた。
- **変更された監視ファイル**：英29件、日34件。参照・経路・宣言の増減は上記のとおりで、それ以外の変更は件数に表れない。`rnd.c`は#132で検査用の`darkdungeon_copy_rng`（RNGを進めずに状態を写す関数）を追加したもので、RNGの形式は変わらない。日本語版だけで`qt_druaga.cpp/.h`、`qt_streq.cpp`、`realtime_model.cpp/.h`の5件が変わっている理由は未確認である。このうち`qt_druaga`と`realtime_model`の4件は、#110で原因を特定した。日本語化の処理が`win\Qt`の全ファイルの先頭に注記を加えるため、生成処理で上書きされない旧リアルタイムモードの残りファイルには、ビルドのたびに注記が1行ずつ増えていた。残りファイルは#110で削除した（[来歴の記録](phase0-provenance.md)）。`qt_streq.cpp`は上流のファイルで毎回上書きされ、日本語版では`prepare-source.ps1`の変換の対象になる。変化の理由は未確認である。`qt_druaga`はQT_OBJSに含まれない非リンクのファイルである。

件数は英日とも、ファイル318→322、参照685→676（日686→677）、宣言群366→368（日367→369）、メンバー宣言2,951→2,961（日2,959→2,969）、経路群12のまま。

## 作り直した結果

| ファイル | 旧SHA-256 | 新SHA-256 |
|---|---|---|
| rendering-fixture-plan.json | 6bf384402408a83551e04ce266e26097ee547ffc43e8d82327105adef73a10b8 | c5d120eece12ef9f7c7f569296bd642bd86bb447a3f6660844303f122967e7dd |
| rendering-invariant-audit.json | e9de4de75ccf6716a7a900844958c34ae3c62d1724c10c9853f9b8e5d070a602 | 49f78585d65dc21c1ca9d58a0c5a9824c26d284ba6f6db786b5e939f364cfe5d |
| rendering-invariant-contract.json | 889d7012db953ec805755bc90b08425c0fe52418ea4311d516d93d3d507bf593 | 05c410866ab319564a23c6f706bd757ca4277997a5f683929b51c193dc1087bb |
| rendering-comparison-contract.json | f3e812d9ab87b40147b5671d4560ca18cb56f6a2c62103cf54cdcb0345c55bcd | c3687a099a724837dd74832e14561442da0ada5c4215e697a88902a857d6efb8 |

停止点の許可表（`rendering-boundary-ports.json`）は`--check`に成功したため作り直していない（定義SHA 4b076f…、#106から不変）。

R6定義の変更は、参照する2つのSHAと件数だけである。R7定義の変更は、参照する2つのSHAだけである。不変条件・保護領域・方針・代表素材の依頼用下書き（`rendering-representative-briefs.json`、SHA不変）は変わっていない。生成ツール（R6の`contract.py`・`audit-source.py`、R7の`contract.py`）は変更していない。

旧版はGitのcommit 38fa7e4に残る。``artifacts/``はGitで管理しないため、``diff-summary.json``と``old-*.json``は手元にだけ残る。手元から消えた場合は、下表のblob IDから取り出し直す。blob IDと照合結果は`artifacts/r5-r6-reaudit-20261029/old-versions.json`に記録した。Gitの中の版は改行がLFで、そのままのSHAは記録値と一致しない。改行をCRLFにすると、4ファイルとも記録された旧SHAと一致した。記録値は作業ツリー（CRLF）のバイトのSHAである。

| ファイル | blob（38fa7e4） |
|---|---|
| rendering-fixture-plan.json | 0a91c551c8c2260740b2cb87fa6bf8cba031abcc |
| rendering-invariant-audit.json | 43988b0c65a1f59d06c9f171bcd850c2ca0d90bf |
| rendering-invariant-contract.json | 1ed6b3df4f21ac675b31aa80dc66c0df434159e3 |
| rendering-comparison-contract.json | 0fd661a074f2a581006e515478be3705c7122637 |

## 再実行した検査

記録は`artifacts/r5-r6-reaudit-20261029`。すべて成功した。

| 検査 | 結果 |
|---|---|
| R5計画の再生成照合（`build-fixture-plan.py --check`） | 成功 |
| R5の形式検査（`verify-fixture-plan.py`） | 55項目成功（#106時点では計画の照合で止まり未実行だった） |
| R6調査表の照合（`audit-source.py --check`） | 成功 |
| R6定義の照合と合成検査 | 成功、61項目 |
| 停止点の許可表の照合と合成検査（#106） | 成功、50項目 |
| R7定義の照合と合成検査 | 成功、62項目 |
| 撮影記録の分類検査、geometryの改変拒否検査、OS拡大率の合成検査 | 成功 |
| 旧経路撤去の静的検査（確認版`artifacts/phase0-r6-snapshot-20261029`） | 成功、旧識別子0件 |

いずれもゲームを実行しない検査であり、runtime_ready=falseのままである。

## 今後の運用

ソースを変えると、R5計画・R6調査表・停止点の許可表（`rendering-boundary-ports.json`、#106）の照合は再び失敗する。これは仕様どおりの停止である。次の手順で作り直す。

1. 旧版と新版の差分を`diff-summary.json`の形式で保存し、意味上の変化（構造体の配置、RNGの形式、経路の関数、宣言・参照の増減）を分類する。
2. R5計画→R6調査表→停止点の許可表→R6定義→R7定義の順に作り直す。#167で許可表をR6定義へ結んだ後は、この順序が必須になる。
3. 全検査を再実行し、旧版のblob IDと新旧SHAを記録する。

既存の観測・比較基準・検査記録は、作成時の調査表・定義のSHAで照合する。`validate_projection`は現在の調査表のSHAと一致しないprojectionを拒否するため、過去のprojectionを検証するときは、作成時の調査表・R6定義・停止点の許可表を、作成時のGitのcommitから取り出して使う。許可表は`validate_projection`と`validate_point`が`docs/data/rendering-boundary-ports.json`から読むため、作業ツリーごと作成時のcommitへ戻して検証する（#167以降）。作り直しのたびに古い基準を新しいSHAへ付け替えない。基準の凍結（#139）では、凍結に使った調査表・定義のSHAとcommitを基準の記録に含める。C観測器の実装（#107/#108等）や基準の凍結の前後でも、この手順が必要になる。

関連して文書を更新した：`docs/rendering-invariant-contract.md`（§2の注記と件数）、`docs/phase0-legacy-retirement.md`（追記）、`tools/rendering-invariants/README.md`。

## レビュー

[Claude Code初回レビュー](../artifacts/claude-r5-r6-reaudit-review-20261029.txt)は条件付きで完了可。Medium 3件（宣言+2件の未分類、比較結果の未保存、手順に許可表と過去の基準の扱いがない）とLow 5件、Info 1件に対応した。宣言の+2件は`manual_data`と特定し、分類した。比較結果と旧版のblob IDを保存した。手順に停止点の許可表と過去の基準の照合方針を加えた。古い件数・解消済みの記述・旧SHAでの結果の注記を、関連文書で直した。`docs/rendering-comparison-review-response.md`の旧R7 SHAはその時点の記録として残す。

[最終確認](../artifacts/claude-r5-r6-reaudit-final-20261029.txt)は完了可と判定した。Low 1件（変更された監視ファイルの分類）とInfo 2件（許可表を作り直さなかったこと、artifactsが手元にだけ残ること）を追記した。

## 改行の統一（コミット前）

このリポジトリは`core.autocrlf=true`で、Windowsでは作業ツリーのテキストがCRLFになる。今回の作業で編集・作成した16ファイル（`src/qt_inventory.cpp`、`scripts/verify-runtime.ps1`、文書、ツール、生成先の`qt_inventory.cpp`英日）がLFのままだった。`src/qt_inventory.cpp`と`scripts/verify-runtime.ps1`はR5計画・R6調査表がSHAを記録するため、新しくcloneした作業ツリーとSHAが一致しなくなる。コミット前にCRLFへ統一し、上記の手順で作り直した。上の表の新SHAは統一後の値である（記録は`artifacts/r5-r6-reaudit-20261029/eol`）。再実行した全検査は成功した。

確認版`artifacts/phase0-r6-snapshot-20261029`の実行ファイルは、統一前（LF）の`qt_inventory.cpp`からビルドしたものである。src と生成先は統一前に内容が同一であることを確認しており、変えたのは改行だけである。実行ファイルの作り直しはしていない。
