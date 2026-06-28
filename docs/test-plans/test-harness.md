# AI社員テストハーネス

## 目的

AI社員の18通りシミュレーションQAを、ブラウザ自動テストとして実行する。

このハーネスは最初の段階として、全モードで次を確認する。

- アプリが起動する
- 画面にテキストが描画される
- `#gameScreen` が存在する
- テスト対象モードがブラウザへ注入される
- 記録粒度に応じたCSSクラスが `#gameScreen` に付く
- uncaught page error が出ない
- console error が出ない
- `localStorage` / `sessionStorage` のスナップショットを保存する

## 実行方法

Playwrightが未導入の場合:

```sh
npm install --save-dev playwright
npx playwright install chromium
```

実行:

```sh
node scripts/ai-employee-mode-matrix.mjs
```

既に別のローカルサーバーでアプリを起動している場合:

```sh
BASEBALL_APP_URL=http://127.0.0.1:3000 node scripts/ai-employee-mode-matrix.mjs
```

ポートを変えたい場合:

```sh
BASEBALL_APP_PORT=4180 node scripts/ai-employee-mode-matrix.mjs
```

## 出力

実行結果は次のディレクトリに保存される。

```text
test-results/ai-employees/
```

主な出力:

- `mode-matrix-*.md`: 18通りの結果サマリー
- `snapshot-01.json` から `snapshot-18.json`: 各モードの画面・保存領域スナップショット

## 現在の限界

この初期ハーネスは、画面の起動健全性とモード別表示の土台を確認する。

実際のプレー入力、保存済み試合の復元、責任走者、自責点、打席途中投手交代の検証は、次の段階でシナリオドライバを追加して自動化する。

## 次の拡張候補

- 試合開始フォームへの自動入力
- 3者凡退シナリオ
- 走者責任シナリオ
- 打席途中投手交代シナリオ
- 保存、再読み込み、復元の自動確認
- スクリーンショット保存
- 修正プロンプト生成AIへの失敗結果引き渡し
- YouTube動画連動シミュレーションの操作ログ取得
- 10秒単位の操作密度集計
- 操作密度レポートの自動生成

## YouTube操作密度ハーネス構想

動画連動シミュレーションでは、テストハーネスが次のログを残す。

- `videoUrl`
- `videoTimestamp`
- `operationType`
- `operationLabel`
- `recordingLevel`
- `detailLevel`
- `recordingMode`
- `createdAt`

集計は動画時刻を10秒単位に丸め、各区間の操作数を算出する。

```text
bucketStart = floor(videoTimestamp / 10) * 10
```

出力レポートには、最大密度区間、操作内容、実用性判定、UI改善候補を含める。
