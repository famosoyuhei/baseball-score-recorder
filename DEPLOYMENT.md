# デプロイガイド - GitHub Pages

## 前提条件

- GitHubアカウント
- Gitがインストール済み
- ローカルテスト完了

## ステップ1: GitHubリポジトリ作成

### 1. GitHub で新規リポジトリ作成
1. GitHub.com にログイン
2. 右上の「+」→「New repository」
3. Repository name: `baseball-score-recorder`（任意）
4. Public または Private
5. **「Initialize this repository with a README」はチェックしない**
6. 「Create repository」をクリック

### 2. ローカルでGit初期化

```bash
cd "c:\Users\ichry\OneDrive\Desktop\Baseball scoreing system"

# Gitリポジトリ初期化
git init

# .gitignore は既に作成済みなのでスキップ
# （プロジェクトルートに .gitignore が存在）

# すべてのファイルを追加
git add .

# 初回コミット
git commit -m "Initial commit: 野球スコア記録アプリ"

# リモートリポジトリ追加（GitHubで作成したURL）
git remote add origin https://github.com/YOUR_USERNAME/baseball-score-recorder.git

# プッシュ
git branch -M main
git push -u origin main
```

## ステップ2: GitHub Pages 設定

### 1. Settings → Pages
1. リポジトリページで「Settings」タブ
2. 左メニューから「Pages」
3. **Source**: Deploy from a branch
4. **Branch**: main / (root)
5. 「Save」をクリック

### 2. デプロイ待機
- 数分待つと、緑のチェックマーク表示
- URL: `https://YOUR_USERNAME.github.io/baseball-score-recorder/`

### 3. 本番環境で確認

```
✅ 確認事項:
1. アプリが正常に表示される
2. F12 → Application → Service Workers が "activated"
3. オフラインモードで動作する
4. インストールアイコンが表示される
```

## ステップ3: カスタムドメイン設定（オプション）

### 1. ドメイン購入
- お名前.com、ムームードメインなど

### 2. DNS設定
```
Aレコード:
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153

CNAMEレコード:
www → YOUR_USERNAME.github.io
```

### 3. GitHub Pages でカスタムドメイン設定
1. Settings → Pages
2. Custom domain: `yourdomain.com`
3. 「Save」
4. 「Enforce HTTPS」にチェック

---

## トラブルシューティング

### ❌ ページが404エラー

**原因**: index.html が認識されていない
**対処**:
1. リポジトリのルートに index.html があるか確認
2. Settings → Pages で Branch が正しいか確認
3. 数分待ってから再読み込み

### ❌ Service Worker がエラー

**原因**: 相対パスの問題
**対処**:
1. sw.js のパスを確認: `navigator.serviceWorker.register('sw.js')`
2. manifest.json のパスを確認: `<link rel="manifest" href="./manifest.json">`

### ❌ アイコンが表示されない

**原因**: ファイルパスの問題
**対処**:
1. manifest.json の icon パスを確認
2. DevTools → Network タブで 404 エラーを確認
3. GitHub Pages では大文字小文字を区別するので注意

### ❌ CSSが効かない、JSが動かない

**原因**: MIMEタイプの問題
**対処**:
1. ファイル拡張子が正しいか確認（.css, .js）
2. キャッシュをクリア（Ctrl+Shift+R）
3. Service Worker を一度 Unregister して再登録

---

## キャッシュ更新方法（重要）

### コードを修正した後の手順

#### 1. CACHE_NAME をインクリメント

**sw.js の1行目**:
```javascript
// 修正前
const CACHE_NAME = 'baseball-score-v2';

// 修正後
const CACHE_NAME = 'baseball-score-v3';
```

#### 2. Git コミット & プッシュ

```bash
git add .
git commit -m "Update: [変更内容]"
git push
```

#### 3. ユーザー側のキャッシュクリア

**方法1: ブラウザで強制リロード**
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**方法2: Service Worker 手動更新**
1. F12 → Application → Service Workers
2. 「Update on reload」にチェック
3. ページをリロード

**方法3: キャッシュストレージ削除**
1. F12 → Application → Cache Storage
2. 古いバージョン（例: baseball-score-v2）を右クリック
3. 「Delete」

### 自動更新の仕組み（将来の改善案）

sw.js に更新チェック機能を追加:

```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

この処理は既に実装済みなので、CACHE_NAME を変更するだけで古いキャッシュは自動削除されます。

---

## GitHub Pages で動かすためのチェックリスト

- [ ] index.html がリポジトリのルートにある
- [ ] すべてのパスが相対パス（`./` または `filename`）
- [ ] manifest.json のパスが正しい
- [ ] Service Worker のスコープが正しい
- [ ] HTTPS で配信されている（GitHub Pages は自動対応）
- [ ] ブラウザキャッシュをクリアして確認済み
- [ ] 実機（スマホ）で動作確認済み

---

## Netlify / Vercel の場合（代替手段）

### Netlify

1. Netlify.com にログイン
2. 「Add new site」→「Import an existing project」
3. GitHub リポジトリを選択
4. Build settings はデフォルトのまま
5. 「Deploy site」

### Vercel

1. Vercel.com にログイン
2. 「Add New...」→「Project」
3. GitHub リポジトリをインポート
4. Framework Preset: Other
5. 「Deploy」

どちらも **自動HTTPS、カスタムドメイン対応、CDN配信** があり、GitHub Pages より高速です。

---

## 本番環境の最終チェック

### 必須確認項目

1. **PWA インストール**
   - [ ] PC: インストールアイコンが表示される
   - [ ] Android: ホーム画面に追加できる
   - [ ] iOS: ホーム画面に追加できる

2. **オフライン動作**
   - [ ] 一度アクセス後、機内モードでも動作
   - [ ] リロードしても表示される
   - [ ] 試合記録が可能（IndexedDB）

3. **アイコン表示**
   - [ ] ブラウザタブに favicon 表示
   - [ ] ホーム画面アイコンが正しい
   - [ ] 起動画面（スプラッシュ）が表示される

4. **パフォーマンス**
   - [ ] Lighthouse スコア 90点以上
   - [ ] 初回読み込み 3秒以内
   - [ ] 2回目以降は即座に表示

### Lighthouse での確認

1. Chrome DevTools → Lighthouse タブ
2. Categories: すべてチェック
3. 「Analyze page load」
4. PWA スコアが 100点満点を目指す

---

## 更新の流れ（定常運用）

```
1. ローカルで機能追加・修正
   ↓
2. sw.js の CACHE_NAME を v++ (例: v3 → v4)
   ↓
3. ローカルテスト (http://localhost:8000)
   ↓
4. git commit & push
   ↓
5. GitHub Pages 自動デプロイ（数分）
   ↓
6. 本番URLで動作確認
   ↓
7. ユーザーに「強制リロード」を案内
```

---

## 成功の証

✅ 以下すべて達成で配布完了:

1. GitHub Pages で公開
2. HTTPS でアクセス可能
3. Service Worker が動作
4. オフラインで使える
5. ホーム画面に追加できる
6. アイコンが正しく表示
7. Lighthouse PWA スコア 90点以上

おめでとうございます！本格的なPWAアプリの完成です 🎉
