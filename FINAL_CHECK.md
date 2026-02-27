# 最終確認チェックリスト - GitHub Pages デプロイ前

## ✅ ローカルテスト（必須）

### 1. サーバー起動
```bash
# quick-test.bat をダブルクリック
# または
py -m http.server 8000
# または
python -m http.server 8000
```

### 2. ブラウザで開く
- URL: `http://localhost:8000`
- Chrome推奨（DevTools使用のため）

### 3. Service Worker 確認
- [ ] F12 → Application タブ
- [ ] Service Workers セクション
- [ ] Status: **"activated and running"** （緑色）
- [ ] Source: `http://localhost:8000/sw.js`
- [ ] Scope: `http://localhost:8000/`

### 4. Cache Storage 確認
- [ ] Application → Cache Storage
- [ ] `baseball-score-v2` が存在
- [ ] 15個のファイルすべてキャッシュ済み:
  - index.html
  - css/style.css
  - js/app.js
  - js/data.js
  - js/game.js
  - js/storage.js
  - js/i18n.js
  - js/realtime-ui.js
  - js/npb-scorebook.js
  - manifest.json
  - static/app_icon.png
  - static/icon-192.png
  - static/icon-512.png
  - icons/apple-touch-icon.png
  - favicon.ico

### 5. オフライン動作確認
- [ ] Network タブ → **Offline** にチェック
- [ ] ページをリロード（Ctrl+R）
- [ ] 正常に表示される
- [ ] CSS が適用されている
- [ ] JavaScript が動作する

### 6. 機能確認
- [ ] 新規試合を開始できる
- [ ] 選手登録ができる
- [ ] 試合記録ができる
- [ ] データが保存される（IndexedDB）
- [ ] 言語切替が動作する

---

## ✅ ファイルパス確認（GitHub Pages対応）

### 1. index.html のパス
- [ ] `<link rel="manifest" href="manifest.json">` （先頭 `/` なし）
- [ ] `<link rel="icon" href="./favicon.ico">` または `href="favicon.ico"`
- [ ] `<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">`
- [ ] `<script src="./js/app.js">` （相対パス）

### 2. sw.js の登録
- [ ] `navigator.serviceWorker.register('sw.js')` （先頭 `./` なし推奨）

### 3. sw.js の urlsToCache
```javascript
const urlsToCache = [
  './',              // ✅ ルート
  './index.html',    // ✅ 相対パス
  './css/style.css', // ✅ 相対パス
  // ... 以下同様
];
```
- [ ] 先頭に `/` を使っていない（重要）
- [ ] すべて相対パス（`./` から始まる）

### 4. manifest.json のアイコンパス
```json
{
  "icons": [
    {
      "src": "static/icon-192.png",  // ✅ 相対パス
      "sizes": "192x192"
    }
  ]
}
```
- [ ] 先頭に `/` を使っていない
- [ ] `static/icon-192.png` 形式（`./` なしでもOK）

---

## ✅ Git準備

### 1. .gitignore 確認
- [ ] `.gitignore` ファイルが存在
- [ ] Python キャッシュが除外されている
- [ ] IDE設定ファイルが除外されている

### 2. 不要ファイル削除
- [ ] `check_cache_files.sh` を削除（または .gitignore に追加済み）
- [ ] `__pycache__/` を削除
- [ ] `.DS_Store` を削除

### 3. ファイル一覧確認
```bash
ls -la
```
- [ ] index.html
- [ ] manifest.json
- [ ] sw.js
- [ ] LICENSE
- [ ] README.md
- [ ] .gitignore
- [ ] static/, icons/, css/, js/ ディレクトリ

---

## ✅ GitHub Pages デプロイ

### 1. リポジトリ作成
- [ ] GitHub.com でリポジトリ作成
- [ ] 推奨名: `baseball-score-recorder` または `baseball-scoring-system`
- [ ] Public または Private
- [ ] **README.md はチェックしない**（既存ファイル使用）

### 2. Git コマンド
```bash
cd "c:\Users\ichry\OneDrive\Desktop\Baseball scoreing system"

git init
git add .
git commit -m "Initial commit: 野球スコア記録アプリ"
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```
- [ ] `YOUR_USERNAME` を自分のユーザー名に変更
- [ ] `REPO_NAME` をリポジトリ名に変更

### 3. Pages 設定
1. リポジトリページ → **Settings**
2. 左メニュー → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / **(root)**
5. **Save** をクリック

### 4. デプロイ確認
- [ ] 数分待つ
- [ ] 緑色のチェックマークが表示される
- [ ] URL: `https://YOUR_USERNAME.github.io/REPO_NAME/`

---

## ✅ 本番環境確認（GitHub Pages）

### 1. アクセス確認
- [ ] `https://YOUR_USERNAME.github.io/REPO_NAME/` にアクセス
- [ ] ページが正常に表示される
- [ ] 404エラーが出ない

### 2. Service Worker 確認
- [ ] F12 → Application → Service Workers
- [ ] Status: **"activated and running"**
- [ ] Scope: `https://YOUR_USERNAME.github.io/REPO_NAME/`

### 3. オフライン動作確認
- [ ] 一度アクセス後、Network → Offline
- [ ] リロードしても表示される

### 4. PWA インストール確認
- [ ] アドレスバーにインストールアイコンが表示
- [ ] クリックしてインストール
- [ ] デスクトップアプリとして起動

### 5. 実機確認（スマホ/タブレット）

#### iPhone/iPad (Safari)
- [ ] Safari でアクセス
- [ ] 共有ボタン → ホーム画面に追加
- [ ] アイコンが正しく表示される
- [ ] タップして起動
- [ ] オフラインで動作

#### Android (Chrome)
- [ ] Chrome でアクセス
- [ ] メニュー → ホーム画面に追加
- [ ] アイコンが正しく表示される
- [ ] タップして起動
- [ ] オフラインで動作

---

## ✅ Lighthouse スコア確認

### 1. Lighthouse 実行
- [ ] Chrome DevTools → Lighthouse タブ
- [ ] Categories: すべてチェック
- [ ] Mode: Navigation (Default)
- [ ] Device: Mobile
- [ ] **Analyze page load** をクリック

### 2. スコア確認
- [ ] PWA: 90点以上（理想: 100点）
- [ ] Performance: 80点以上
- [ ] Accessibility: 90点以上
- [ ] Best Practices: 90点以上
- [ ] SEO: 80点以上

### 3. PWA項目確認
- [ ] ✅ Installable
- [ ] ✅ PWA Optimized
- [ ] ✅ Works offline
- [ ] ✅ Configured for a custom splash screen
- [ ] ✅ Sets a theme color

---

## ⚠️ よくあるエラーと対処

### ❌ Service Worker が登録されない
**症状**: Application タブに何も表示されない
**原因**: HTTPSでない、sw.jsのパス間違い
**対処**:
1. HTTPSでアクセスしているか確認（GitHub Pages は自動対応）
2. sw.js のパスを確認: `navigator.serviceWorker.register('sw.js')`
3. Console でエラーメッセージ確認

### ❌ Cache にファイルが入らない
**症状**: Cache Storage が空、または一部のファイルのみ
**原因**: ファイルパス間違い、404エラー
**対処**:
1. Network タブで 404 エラーを確認
2. sw.js の urlsToCache を確認
3. 実ファイルが存在するか確認

### ❌ オフラインで動かない
**症状**: Offline にすると表示されない
**原因**: Service Worker が activated していない
**対処**:
1. Application → Service Workers で Status 確認
2. Cache Storage に全ファイルがあるか確認
3. ページを一度リロードして再試行

### ❌ アイコンが表示されない
**症状**: インストールアイコンが出ない、ホーム画面アイコンが空白
**原因**: manifest.json のパス間違い、アイコンファイル不足
**対処**:
1. manifest.json の icons パス確認
2. static/icon-192.png などが存在するか確認
3. Network タブで 404 エラー確認

---

## 🎉 すべてクリアしたら完成！

以下すべてにチェックが入ったら配布可能:

- [ ] ローカルで Service Worker 動作確認
- [ ] オフライン動作確認
- [ ] GitHub Pages で公開
- [ ] 本番環境で Service Worker 動作
- [ ] 実機（スマホ）でインストール確認
- [ ] Lighthouse PWA スコア 90点以上

**完成度: 100% 🎊**

---

## 📋 次のステップ（配布後）

1. **README.md にデモURL追記**
   ```markdown
   ## デモ
   https://YOUR_USERNAME.github.io/baseball-score-recorder/
   ```

2. **OGP設定（SNSシェア用）**
   - スクリーンショット追加
   - meta タグ追加

3. **カスタムドメイン設定**（オプション）
   - お名前.com などでドメイン取得
   - DNS設定
   - GitHub Pages で設定

4. **アクセス解析**（オプション）
   - Google Analytics 設置
   - ユーザー数確認

5. **継続的改善**
   - Issue で要望受付
   - バージョンアップ（CACHE_NAME を v++ すること）
