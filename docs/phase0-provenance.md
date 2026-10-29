# フェーズ0：生成元から実行ファイルまでの来歴の照合（#110）

2026-10-29。R6の実装前申し送りL5（[対応記録](rendering-invariant-review-response.md)）に対応した。独自のsrcや生成スクリプトから、生成済みのソースの木（`build/nethack`、`build/nethack-ja`）を経て実行ファイルに至るまでの対応を照合できるようにした。

## 以前の状態

- ビルド時に記録していたのは、NetHackのcommitと日本語パッチのSHA（`provenance.json`）、実行ファイルとリンクマップ（MAP）のSHA（`*.capabilities.json`）だけだった。
- 生成元から生成物への照合は、`verify-legacy-retirement.py`が数ファイル（`qt_darkdungeon.cpp`の既知の変換、`qt_darkdungeon.h`、`app_runtime.h`、`agent_port.c`）について行うだけだった。
- 実行ファイルが、どの生成済みソースからビルドされたかの記録はなかった。

## 追加したもの

### ビルド時の入力の記録

`build-release.ps1`は、ビルドの最後に`tools/rendering-invariants/provenance.py record`を呼び、各言語の配置先へ`build-inputs.json`を書く。

| 項目 | 内容 |
|---|---|
| project_commit / project_uncommitted | このリポジトリのcommitと、未コミットの変更の一覧（`git status --porcelain`） |
| nethack_commit / nethack_uncommitted_or_ignored | NetHackのソースのcommitと、変更・無視されたファイルの一覧（robocopyは無視されたファイルも写すため） |
| clean_build / skip_prepare | このビルドでオブジェクトを消したか（`-Clean`か、ツールの指紋の変化）、生成を省いたか（`-SkipPrepare`） |
| tools | QtRootとmocのバージョン |
| project_inputs | 生成が読むファイルのSHA：`src/`の全ファイル、`scripts/prepare-source.ps1`、`tools/agent-cli/prepare-core.py`、`tools/agent-cli/Export-CorePortBranches.ps1`、日本語パッチ、`translations/ui-ja.json`、`VERSION`、`docs/data/agent-core-port-branches.{en,ja,c1-en,c1-ja}.json` |
| generated_tree | 生成済みソースの木の全ファイルのSHA。ビルド出力のフォルダー（`binary`、`src/objtty`、`src/objlua`、`src/objutil`）は除く |
| executable_sha256 / linked_map_sha256 / capabilities_sha256 | 実行ファイル、リンクマップ、capabilitiesの記録 |
| deployed_files | 各言語の配置先のすべてのファイル（nhdat、symbols、Qtのライブラリ、スプライト等）のSHA。言語の外に置くランチャー（`build-launcher.ps1`の出力）は対象外 |

capabilitiesの記録（`darkdungeon-deployment-capabilities-v1`）は他の処理も読むため、形式を変えずに別ファイルとした。

### 生成の再現と照合

`provenance.py verify`は、現在の入力から生成をやり直し、記録した生成済みソースの木と比べる。

1. 実行ファイル・capabilities・リンクマップ・配置したファイルのSHAが、ビルド時の記録と一致することを確認する。
2. 生成が読むファイルが、ビルド時から変わっていないことを確認する。NetHackのcommitが同じで、変更・無視されたファイルがないことも確認する。
3. `prepare-source.ps1 -SnapshotRoot <artifacts内の新しいフォルダー>`で、生成をビルドの木とは別の場所に作る。ビルドの木と現在の確認版には触れない。出力先と、その横に作るフォルダー・ファイルは、すべてartifacts内の新しいパスでなければ拒否する。
4. 再現した木の全ファイルが、記録した木に同じ内容であることを確認する。
5. 記録した木にだけあるファイルは、宣言したビルド出力（`BUILD_OUTPUTS`：makedefsのデータ、`date.h`、`tile.c`、タグ、ユーティリティ、Luaのライブラリ、`nhdat501`等32件）でなければ失敗にする。旧版の残りの`dat/*.lua`は`dlb.lst`に集められて配布されるため、この一覧にないファイルは拒否する。
6. 宣言したビルド出力のうちソース（`.c`/`.cpp`/`.h`/`.moc`/`.inc`）は、Makefileが自分で作るもの（`include/date.h`、`src/tile.c`。Makefileの規則があることだけを照合し、中身は照合しない）を除き、Makefileにファイル名もオブジェクト名もなく、MAPにもなく、生成済みのソースから`#include`されないことを確認する。該当するのは`src/abi-mismatch.c`（C1のエージェントのビルド検査`scripts/build-agent-core.ps1`が置くもの）だけである。

`executable_bound_to_tree`は、再現に成功し、かつ`clean_build=true`・`skip_prepare=false`のビルドのときだけtrueにする。

### 実行ファイルと木の結び付きの限界

MSVCの出力はビット単位では再現しないため、実行ファイルはビルドし直さない。実行ファイルとソースの木の対応は、同じビルドで書いた記録で結ぶ。

差分ビルド（`clean_build=false`）では、nmakeはタイムスタンプで再コンパイルを決める。robocopyは上流のファイルを元の時刻のまま写すため、以前変換していたファイルを変換しなくなった場合などに、古いオブジェクトが残る可能性がある（※推測です。実例は確認していない）。この場合、木の再現に成功しても、実行ファイルがその木からコンパイルされたことは保証されない。**正式な比較基準（#139）は`-Clean`でビルドし、`executable_bound_to_tree=true`を確認する。**

`provenance.py self-test`は、照合の部分を合成データで検査する（14項目：ファイルの違い・欠落、残りの`dat/*.lua`・Qtのソース・mocの出力の拒否、宣言したソースのリンク・Makefile・パス付き`#include`の拒否、Makefileの規則の欠落、artifacts外・artifacts内の既存のフォルダーとファイルへの出力の拒否、`executable_bound_to_tree`の判定）。

### 生成先を指定する選択肢

再現のために、生成先を固定していた3つのスクリプトに選択肢を加えた。指定しない場合の動作は従来どおりである。

- `scripts/prepare-source.ps1 -SnapshotRoot`：artifacts内の新しいフォルダーにだけ生成する。日本語の作業用コピーとcore-portの一覧も、その横に作る。
- `tools/agent-cli/prepare-core.py --language`：言語を明示した場合に限り、artifacts内の木を受け付ける。
- `tools/agent-cli/Export-CorePortBranches.ps1 -SourceRoot`：一覧の対象の木を指定する。

### クリーンビルドの修正

`-Clean`のビルドで照合したところ、`build-release.ps1`の後始末が拡張子（`.o`/`.obj`/`.lib`）でファイルを消すため、上流のソース`sys/share/Makefile.lib`も消していたことが分かった。Windowsのビルドでは使われないファイルだが、上流のソースに同じパスのファイルがあるものは消さないように直した。

## 生成木の残りファイル（レモンの決定）

最初の照合で、旧リアルタイムモード（2026-10-10）の残りファイル`qt_druaga.cpp/.h`と`realtime_model.cpp/.h`が、生成木に残っていることが分かった。いまの生成処理では作られず、コンパイル・リンク・`#include`もされていない。

日本語化の処理（`prepare-source.ps1`）は`win\Qt`の全ファイルの先頭に注記を加える。上流のファイルは毎回上書きされるが、残りファイルは上書きされないため、ビルドのたびに注記が1行ずつ増えていた。これが、#165で「理由未確認」とした日本語版だけの変化の原因である。

レモンの決定（「残りファイルを削除する」）により、英日の生成木から8ファイルを削除した。削除前の内容は`artifacts/build-leftovers-20261029`に退避し、SHAを`removed.json`に記録した。`build/`はGitの管理外である。

## 確認版と照合の結果

最終の確認版は`artifacts/phase0-provenance-v5-20261029`（`-Clean`でビルド、ログ`artifacts/provenance-build-v5-20261029.log`）。ゲームのソースは#166から変わっていない。

| 言語 | 再現したファイル | 違い | 欠落 | ビルドにだけあるファイル | executable_bound_to_tree |
|---|---|---|---|---|---|
| 英語 | 1,406 | 0 | 0 | 32（すべて宣言したビルド出力） | true |
| 日本語 | 1,409 | 0 | 0 | 32（同上） | true |

記録は`artifacts/provenance-check-v5-20261029`（`provenance-{en,ja}.json`、`self-test.json`）。Native SMOKE（`-RequireRetiredMotion -PreserveOnTimeout -GeometryCapture`）も英日とも保存・再開の両段階で成功した（`artifacts/smoke-en-windows-20261029-223526`、`artifacts/smoke-ja-windows-20261029-223546`）。途中の確認版（v1〜v4）の記録も残すが、v4は`Makefile.lib`の削除のため欠落1件で失敗した。

`prepare-source.ps1`を変えたため、手順（[再監査の記録](phase0-source-reaudit.md)）のとおり、R5計画→R6調査表→停止点の許可表→R6定義→R7定義の順に作り直した。許可表は変わっていない。残りファイルの削除で、R6調査表の件数は英日各318ファイル、参照は英665/日666、宣言群は英364/日365、メンバー宣言群は英2,951/日2,959になった。記録は`artifacts/provenance-chain-v5-20261029`で、R5の計画照合と形式検査66項目、R6調査表の照合、R6定義の照合と合成検査66項目、停止点の合成検査54項目、R7定義の照合と合成検査62項目、撮影記録・geometry・OS拡大率の検査、旧経路撤去の静的検査（確認版v5）がすべて成功した。

## 範囲と残件

- 照合は「現在の入力から生成をやり直すと、記録した木と同じになる」ことである。ビルド時に入力が未コミットだった場合、その版はGitの履歴に残らない（`project_uncommitted`に一覧を記録する）。正式な基準（#139）は、コミット済みの状態から`-Clean`でビルドする。
- 実行ファイルをビルドし直して一致させる検査ではない。
- 生成に使う道具（python、pwsh、rg、moc）は、mocのバージョンだけを記録する。道具の違いで木が変われば「違い」として検出される。
- Unix版の生成（`build-unix.sh`）は対象外。
- `verify-legacy-retirement.py`は記録の中に`unlinked_qt_sources: ["qt_druaga.cpp"]`を固定で書いている。削除後は実在しないが、検査の判定には影響しない。`audit-source.py`のqt_druaga用の分岐も同様に残っている。

## レビュー

[Claude Code初回レビュー](../artifacts/claude-provenance-review-20261029.txt)は、中2件（ビルドにだけあるデータファイルを検査していない、差分ビルドの限界が文書にない）と低6件を指摘した。中1はビルド出力の一覧による照合で、中2は`clean_build`等の記録と上記の説明で対応した。低3（ソースの判定の甘さ）は一覧方式とファイル名・パス付き`#include`の照合、低4（入力の漏れ）は4つのdocs/dataとmocのバージョン、NetHackの無視されたファイル、低5（生成先の安全性）は新しいパスの確認、低6（未コミット一覧の先頭行）は`strip`の修正、低7は本書の記述、低8はREADMEの記述で対応した。対応の後の`-Clean`のビルドで、`Makefile.lib`の削除を見つけて直した。

[最終確認](../artifacts/claude-provenance-final-20261029.txt)は完了可と判定した。低3件と情報2件にも対応した。再監査の記録で`qt_streq.cpp`の理由を未確認と分けて書き（低1）、READMEに節を加え（低2）、self-testに既存のパスの拒否と結び付きの判定を加えて14項目にした（低3）。配置したファイルの一覧を記録と照合で同じ関数にし（情報）、ランチャーが対象外であることを書いた（情報）。整理した後の道具でv5を照合し直し、英日とも再現と結び付きに成功した（`artifacts/provenance-check-v5-20261029/provenance-final-{en,ja}.json`、`self-test-final.json`）。
