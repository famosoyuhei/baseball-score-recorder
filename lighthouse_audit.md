# Lighthouse 静的監査レポート — 野球スコア記録アプリ

作成日: 2026-05-20 / 対象: index.html, manifest.json, sw.js, css/style.css, js/*.js

> **注記**: 本セッションのサンドボックスはネットワークが許可リスト制で、headless Chrome を取得できないため、実 Lighthouse の数値スコア計測は実施できませんでした。本レポートは Lighthouse の各監査項目に沿って **コードベースを静的に精査** した結果で、合否と改善推奨を示します。実数値が必要な場合は、ローカルの Chrome DevTools → Lighthouse タブ、または Chrome インストール済み環境で `npx lighthouse http://localhost:8000 --view` を実行してください。

---

## 総評

PWA / インストール性は非常に良好で、配信すればそのまま「ホーム画面に追加」できる要件を満たしています。最大の改善余地はパフォーマンス、具体的には未圧縮 JavaScript の総量です。アクセシビリティは土台は良好で、フォームラベルの関連付けを直せばさらに底上げできます。ベストプラクティスと SEO はアプリとして十分な水準です。

| カテゴリ | 評価 | 一言 |
|---|---|---|
| PWA / インストール性 | ◎ 強い | manifest・SW・各種メタすべて完備、完全オフライン |
| パフォーマンス | △ 要改善 | 未圧縮 JS 912KB(app.js 588KB)が最大の課題 |
| アクセシビリティ | ○〜△ | 良好だがフォームラベル未関連が9件 |
| ベストプラクティス | ○ 良好 | SW二重登録・CSP未設定が小改善点 |
| SEO | ○ 十分 | title/description/viewport あり |

---

## カテゴリ別の詳細

### PWA / インストール性 — ◎

満たしている項目:

- `manifest.json` が完備(name, short_name, description, start_url, display=standalone, theme_color, background_color, 192/512 を含む maskable アイコン一式, shortcuts)
- Service Worker 登録済み・`urlsToCache` によるオフラインキャッシュあり
- `<meta name="viewport">`、`theme-color`、`apple-touch-icon`(120〜180）、`apple-mobile-web-app-capable`、Microsoft Tiles まで設定済み
- 外部 CDN・Webフォント依存がゼロ → 完全に自己完結し、オフライン起動が成立

実用化観点では、この領域は追加対応ほぼ不要です。配信先が HTTPS であること(GitHub Pages 等なら自動)だけ担保してください。

### パフォーマンス — △(最優先の改善領域)

| 項目 | 現状 | 推奨 |
|---|---|---|
| JS 合計サイズ | 912KB(未圧縮)。うち app.js 588KB / i18n.js 144KB | terser 等で minify。一般に 60〜70% 削減が見込め、初回読込とパースが大幅に軽くなる |
| スクリプト読み込み | body 末尾に7本、`defer`/`async` なし | 各 `<script>` に `defer` を付与し、パースと実行のブロックを軽減 |
| app.js の構造 | 単一ファイル 14,142 行 | 機能単位に分割し、使う場面で遅延読込(中期課題。保守性にも効く) |
| CSS | style.css 112KB を head で同期読込(レンダーブロッキング) | minify。可能なら Critical CSS のインライン化 |
| キャッシュ | SW で静的アセットをキャッシュ済み(良) | minify 後のファイル名・`CACHE_NAME` 更新運用とセットで運用 |

最も費用対効果が高いのは minify と `defer` です。ビルド工程を持たない構成なので、デプロイ時に走る軽量な minify ステップ(terser / cssnano)を1つ足すだけでも体感速度が変わります。

### アクセシビリティ — ○〜△

良好な点:

- `<html lang="ja">` 設定済み
- viewport に `user-scalable=no` / `maximum-scale` がなく、ズーム可能(視覚アクセシビリティで重要)
- `<img>` タグが0件のため、alt 欠落の問題は発生しない(アイコンは CSS / link で供給)

改善点:

- `<label>` 15件のうち `for` 属性で input と関連付けられているのは6件のみ。残り9件(チーム情報編集モーダル、走者・盗塁関連の入力など)は input と未関連で、スクリーンリーダーがラベルを読み上げられません。`<label for="inputId">` + `<input id="inputId">` の対応付け、または `<label>` で input をラップして解消できます。
- 言語切替 `<select id="languageSelect">` にラベルがありません。`aria-label="言語"` を付与してください。
- 色コントラストは静的には判定できません。テーマ色 `#2196F3` 上の白文字は約 3.1:1 で、小さい文字だと WCAG AA(4.5:1)を下回る可能性があります。主要なテキスト/ボタンで実測を推奨します。

### ベストプラクティス — ○

- `<!DOCTYPE html>` / `<meta charset="UTF-8">` 設定済み
- **Service Worker が二重登録**: `index.html`(717行付近)と `js/app.js`(28行付近)の両方で `register()` を呼んでいます。動作上の致命傷ではありませんが、どちらか一方に統一するのが望ましいです。
- **CSP(Content-Security-Policy)未設定**: 配信時に `<meta http-equiv="Content-Security-Policy">` かサーバヘッダで追加すると堅牢になります(自己完結型なので比較的厳しめのポリシーを設定可能)。
- 配信は HTTPS 必須。

### SEO — ○

`<title>`・`<meta name="description">`・viewport が揃っており、単体アプリとしては十分です。`robots` 指定はありませんが、アプリ用途では問題になりません。多言語対応を検索面でも活かすなら `hreflang` を将来検討する余地があります。

---

## 優先対応リスト(費用対効果順)

1. **JS / CSS の minify**(デプロイ時の軽量ステップ追加)— 体感速度に直結、低コスト・低リスク
2. **`<script>` への `defer` 付与**(7行)— パース改善、低リスク
3. **フォーム `<label>` の `for` 関連付け + `<select>` への `aria-label`** — アクセシビリティ、低コスト
4. **Service Worker 二重登録の解消** — index.html 側か app.js 側に一本化
5. **CSP の設定**(配信時)— セキュリティ堅牢化
6. **app.js の機能分割**(中期)— パフォーマンスと保守性の両面で効果

実数値が欲しい場合は、Chrome のある環境で `python -m http.server 8000` → DevTools の Lighthouse タブ、または `npx lighthouse http://localhost:8000 --view` を実行してください。本レポートの項目はその結果と整合するはずです。
