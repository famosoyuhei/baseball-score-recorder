# 🚀 デプロイ準備完了チェックリスト

## ✅ 完了済み項目

- ✅ Service Worker (`sw.js`) のパスが全て `./` プレフィックスで統一
- ✅ キャッシュファイル（15個）の実在確認済み
- ✅ `manifest.json` のアイコンパス設定完了
- ✅ Service Worker 登録スクリプト (`index.html`) 設定済み
- ✅ LICENSE ファイル作成済み
- ✅ README.md 整備完了
- ✅ Python互換性対応 (`quick-test.bat`)
- ✅ GitHub Pages 相対パス対応完了

---

## 🎯 今すぐやるべきこと（3ステップ）

### Step 1: ローカルテスト（2分）

```batch
quick-test.bat
```

ブラウザで `http://localhost:8000` を開く

**確認項目:**
1. F12 → Application → Service Workers
   - Status: `activated and running` ✅
2. Cache Storage → `baseball-score-v2`
   - 15ファイルがキャッシュされているか確認 ✅
3. Network タブ → `Offline` にチェック → リロード
   - 画面が正常に表示されればOK ✅

---

### Step 2: GitHub リポジトリ作成 & Push（5分）

#### 2-1. GitHub でリポジトリ作成
https://github.com/new にアクセス

- Repository name: `baseball-score-recorder` (推奨) ※スペースなし、`scoring` のスペル修正
- Public / Private: どちらでもOK
- **README, .gitignore, LICENSE は追加しない**（既にある）

**完成後のURL例:**
```
https://YOUR_USERNAME.github.io/baseball-score-recorder/
```

#### 2-2. Git 初期化 & Push

```bash
git init
git add .
git commit -m "Initial commit: Baseball Score PWA"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/baseball-score-recorder.git
git push -u origin main
```

---

### Step 3: GitHub Pages 有効化（1分）

1. リポジトリページ → Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main` / `/ (root)` → Save
4. 数分待つと URL が表示される:
   ```
   https://あなたのユーザー名.github.io/baseball-score-recorder/
   ```

---

## 🔍 本番環境での最終確認

### デプロイ直後にチェック

1. **Service Worker が登録されているか**
   - F12 → Application → Service Workers
   - Status: `activated and running`

2. **キャッシュが動いているか**
   - F12 → Application → Cache Storage
   - `baseball-score-v2` が存在するか

3. **オフラインで動くか**
   - Network → Offline → リロード
   - 正常に表示されればOK

4. **PWA としてインストールできるか**
   - Chrome: URL バー右端の「インストール」アイコン
   - iOS Safari: 共有 → ホーム画面に追加

---

## ⚠️ デプロイ後に詰まりやすいポイント（2選）

### 1. 画面が真っ白になる / 更新が反映されない

**原因:** 古いキャッシュが残っている

**解決策:**
1. `sw.js` を開く
2. `CACHE_NAME` を変更:
   ```js
   const CACHE_NAME = 'baseball-score-v3'; // v2 → v3 に変更
   ```
3. Git commit & push
4. 数分後にリロード（古いキャッシュが自動削除される）

**重要:** 更新を配布するときは**必ず** `CACHE_NAME` のバージョンを上げてから push すること

### 2. GitHub Pages の URL がわからなくなった

**確認方法:**
- リポジトリページ → Settings → Pages → "Your site is live at" の下に表示
- 形式: `https://YOUR_USERNAME.github.io/REPO_NAME/`

---

## 📱 モバイルテスト（推奨）

### iOS Safari
1. 実機で GitHub Pages URL にアクセス
2. 共有 → ホーム画面に追加
3. ホーム画面のアイコンから起動
4. 機内モードでも動作するか確認

### Android Chrome
1. 実機で GitHub Pages URL にアクセス
2. メニュー → アプリをインストール
3. アプリ一覧から起動
4. 機内モードでも動作するか確認

---

## 🎊 完了条件

以下が全てOKなら**完全成功**:

- ✅ GitHub Pages でアクセスできる
- ✅ Service Worker が `activated and running`
- ✅ オフラインで動作する
- ✅ PWA としてインストールできる
- ✅ スマホ・タブレット・PCでアイコンが正しく表示される
- ✅ 機内モードでも試合記録ができる

---

## 📚 詳細ドキュメント

- [PWA_TEST.md](PWA_TEST.md) - テスト手順の詳細
- [DEPLOYMENT.md](DEPLOYMENT.md) - デプロイの詳細手順
- [FINAL_CHECK.md](FINAL_CHECK.md) - 最終チェックリスト

---

**現在の状態: 🟢 デプロイ準備完了**

すべての「事故ポイント」は潰せています。
自信を持って GitHub Pages にデプロイしてください！
