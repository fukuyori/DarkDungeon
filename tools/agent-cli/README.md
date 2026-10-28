# CLI設計用のコマンド定義の照合

これはゲーム操作CLIではなく、C0/C1の調査用ツール。生成済みの英語・日本語の`cmd.c`をVisual Studioのプリプロセッサーに通し、`extcmdlist`の有効な定義だけをJSONへ抽出する。ゲームのビルド・起動・コアの初期化はしない。

必要な環境はPowerShell、Visual Studio C++ツール、Python 3。リポジトリ内の`build/nethack`と`build/nethack-ja`を読み、指定した`artifacts`配下へ前処理結果・定義一覧・入力ハッシュを出力する。

```powershell
.\tools\agent-cli\Export-CommandInventory.ps1 -Language en -OutputDirectory .\artifacts\c1-command-inventory\en
.\tools\agent-cli\Export-CommandInventory.ps1 -Language ja -OutputDirectory .\artifacts\c1-command-inventory\ja
.\tools\agent-cli\Verify-CommandPolicy.ps1 -InventoryPath .\artifacts\c1-command-inventory\en\commands.json -ReferenceLanguage en -ReferenceVariant shared-core -PeerInventoryPath .\artifacts\c1-command-inventory\ja\commands.json
.\tools\agent-cli\Export-CorePortBranches.ps1 -Language en -OutputPath .\artifacts\core-port-en.json -ReferencePath .\docs\data\agent-core-port-branches.c1-en.json
.\tools\agent-cli\Export-CorePortBranches.ps1 -Language ja -OutputPath .\artifacts\core-port-ja.json -ReferencePath .\docs\data\agent-core-port-branches.c1-ja.json
```

選んだ前処理定義は`provenance.json`に記録する。対象はWindows x64のRelease構成。生成Makefileの`DD_CORELIB`がある場合は`DARKDUNGEON_APP`・`NOTTYGRAPHICS`、移行前は`QT_GRAPHICS`・`WIN32CON`で抽出する。Unixや別の機能構成へ件数を一般化しない。実行ファイルと同一のコンパイル結果であること、各コマンドの実行成功、CLIへの対応完了は別途検証する。

分類は`func_tab.h`のフラグに基づき、内部専用、未ビルド、特権用、接頭辞、パラメーター付き、操作環境依存、その他の通常操作の順で判定する。`normal`はソース上の分類であり、どの場面でも実行できることや、CLI実装済みを意味しない。`commands.json`には内部関数名・特権用操作も含まれるため、そのまま通常のプレイAPIへ返さない。

版付きの[全コマンド方針](../../docs/data/agent-cli-command-policy.json)と照合すると、未知の項目、公開・非公開を含む参照の全項目の欠落、関数・意味を持つフラグ・接頭辞の変化、内部・特権操作の誤公開を検出する。参照した言語別のカタログhashも確認し、`PeerInventoryPath`を指定すると反対言語の検査とID・関数・フラグの一致まで1回で確認する。

コマンドの参照はWindows Qt Release用（`-ReferenceVariant qt`、既定）と共通コア用（`shared-core`）を区別する。C0の参照ハッシュは維持する。C1では前処理入力が変わったが、173件の定義そのものがC0と一致することを確認して共通コア用のハッシュを追加した。別OS・機能構成では対応する参照をレビューして追加する。shell等は、その構成でコンパイルされても通常APIの対象外を維持する。これは静的照合であり、実際のゲームでの対応完了を証明しない。

`Export-CorePortBranches.ps1`はコア・ヘッダー・OS処理のQt依存条件を抽出する。コメントだけの定義は含めず、継続行を1つの条件として扱う。現行の移行対象は英日各14箇所。参照との条件・出現番号・元ファイルhashの差は失敗とし、C1の分離時には書換え後の参照もレビューして更新する。

移行前の参照は`agent-core-port-branches.en.json`／`ja.json`（各14条件）。C1-1移行後は`agent-core-port-branches.c1-en.json`／`c1-ja.json`（各28条件）を指定する。`prepare-source.ps1`は移行前の参照ファイルhashと、移行後の全条件・ファイルhashを検査し、ずれがあれば準備を失敗させる。参照はソース変更のレビューに合わせて明示的に更新する。

`prepare-core.py`はC1-1の共通コア分離用。通常は`prepare-source.ps1`から一度だけ呼ぶ。単独で二重適用しない。開発用ビルドと自己診断は[実装・検証記録](../../docs/agent-play-cli-implementation.md)を参照。これらはゲーム操作CLIではない。

出力先が既存なら調査結果を更新する。比較用の結果を残す場合は別のディレクトリを指定する。コアのセーブ・設定は扱わない。

NetHack由来の名前・説明・定義は既存のLICENSEに従って扱い、元の著作権表記を維持する。
