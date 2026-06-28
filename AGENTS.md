# Baseball Scoring PWA - 共通ガイド

このファイルは全作業で読む最小限の入口。領域ごとの詳細は近い `AGENTS.md` を読む。

## 必須ルール

- コードを変更したら、必ず `sw.js` 1行目の `CACHE_NAME` を 1 つ上げる。
- UI テキストを追加・変更したら、`js/i18n.js` の `ja` / `en` / `es` / `pt` をすべて更新する。
- 投手・打者の左右（利き手）表示は実装しない。

## 領域別の入口

- `js/AGENTS.md`: 記録レベル、記録環境、責任走者、ゲームロジック、多言語キー。
- `css/AGENTS.md`: `recordingLevel` 別の表示制御とレイアウト。
- `docs/AGENTS.md`: 仕様・テスト計画・ルール文書の更新方針。
- `scripts/AGENTS.md`: 補助スクリプト、ビルド、AI従業員マトリクス。

## 主要ファイル

- `index.html`: 画面構造。
- `js/app.js`: UI とアプリ制御の大部分。
- `js/game.js`: 試合状態とスコアリングロジック。
- `js/data.js`: データ構造と初期値。
- `js/i18n.js`: 4言語の表示文言。
- `css/style.css`: 画面表示と記録レベル別 UI。
- `sw.js`: PWA キャッシュ。
