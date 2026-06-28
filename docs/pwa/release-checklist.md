# PWAリリースチェックリスト

PWAとして外部ユーザーへ配布する前に確認する項目をまとめる。コード変更を含むリリースでは、必ず `sw.js` の `CACHE_NAME` をインクリメントする。

## 基本情報

| 項目 | 記入欄 |
|---|---|
| 確認日 |  |
| 確認者 |  |
| 対象URL |  |
| リリース内容 |  |
| `CACHE_NAME` |  |

## 必須チェック

- [ ] `sw.js` の `CACHE_NAME` が前回リリースからインクリメントされている
- [ ] `manifest.json` の `name` / `short_name` / `start_url` / `display` / `theme_color` が意図通り
- [ ] 192px / 512px / maskable / Apple touch icon が存在する
- [ ] Chrome DevTools の Application タブで Service Worker が `activated and running`
- [ ] Cache Storage に主要ファイルが登録されている
- [ ] オフライン状態でトップ画面が表示される
- [ ] オフライン状態で試合開始と最低限の記録操作ができる
- [ ] 保存済み試合を再読み込み後に復元できる
- [ ] iPhone Safari でホーム画面に追加できる
- [ ] Android Chrome でアプリとしてインストールできる
- [ ] PC Chrome / Edge でインストール導線が出る
- [ ] `ja` / `en` / `es` / `pt` のUIキー漏れがない
- [ ] `inning` / `batter` / `pitch` の記録レベル別表示が崩れていない
- [ ] `bench` / `tv` の記録環境別UIが崩れていない

## Lighthouse / 品質チェック

- [ ] 実機またはローカルChromeで Lighthouse を実行した
- [ ] PWAカテゴリに重大な失敗がない
- [ ] Accessibility の重大な失敗がない
- [ ] Console にリリース阻害レベルのエラーがない
- [ ] 初回表示が極端に遅くない

## 野球記録チェック

- [ ] 得点、アウトカウント、走者状況が矛盾しない
- [ ] 責任走者の移動が `runnersResponsiblePitcher` に反映される
- [ ] 投手交代後の責任走者が保存・復元後も維持される
- [ ] 自責点、勝敗投手、セーブ候補に既知の退行がない

## 判定

| 判定 | 内容 |
|---|---|
| リリース可 |  |
| 条件付き可 |  |
| リリース不可 |  |

## メモ

- 
