# バージョン更新

アプリのバージョンはルートの `VERSION` が唯一の入力です。

- `VERSION` を更新する。
- `scripts/build-release.ps1` を実行し、`dist/DarkDungeon/VERSION` と両言語のゲーム本体の `VERSION` を生成する。
- `scripts/build-installer.ps1 -Sign` は `VERSION` を読み、Inno Setup の `AppVersion` と成果物名を生成する。
- アプリの Qt メタデータは生成時に `VERSION` を反映する。NetHack 本体のバージョン表記は、ゲームデータとセーブ互換性に関わるため書き換えない。
- 今後追加する変更履歴にも同じバージョンの項目を作る。

Qt の依存バージョンと NetHack のソース版はアプリのバージョンとは別に管理する。
