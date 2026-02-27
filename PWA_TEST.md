# PWA動作確認手順

## 1. ローカルサーバー起動

```bash
cd "c:\Users\ichry\OneDrive\Desktop\Baseball scoreing system"
python -m http.server 8000
```

または

```bash
npx http-server -p 8000
```

## 2. ブラウザで開く

Chrome で `http://localhost:8000/` を開く

## 3. Service Worker 確認

### DevTools を開く
1. F12 キーまたは右クリック → 検証
2. **Application** タブをクリック

### Service Workers セクション
✅ 確認項目:
- **Status**: `activated and running` （緑色）
- **Source**: `http://localhost:8000/sw.js`
- **Scope**: `http://localhost:8000/`

❌ エラーの場合:
- Console タブで `SW registration failed` を確認
- ファイルパスの問題を修正

### Cache Storage セクション
1. **Cache Storage** を展開
2. `baseball-score-v2` をクリック
3. 以下のファイルがすべてキャッシュされているか確認:

```
✅ http://localhost:8000/
✅ http://localhost:8000/index.html
✅ http://localhost:8000/css/style.css
✅ http://localhost:8000/js/app.js
✅ http://localhost:8000/js/data.js
✅ http://localhost:8000/js/game.js
✅ http://localhost:8000/js/storage.js
✅ http://localhost:8000/js/i18n.js
✅ http://localhost:8000/js/realtime-ui.js
✅ http://localhost:8000/js/npb-scorebook.js
✅ http://localhost:8000/manifest.json
✅ http://localhost:8000/static/app_icon.png
✅ http://localhost:8000/static/icon-192.png
✅ http://localhost:8000/static/icon-512.png
✅ http://localhost:8000/icons/apple-touch-icon.png
✅ http://localhost:8000/favicon.ico
```

## 4. オフライン動作確認

### ステップ1: オンラインで動作確認
1. アプリを普通に操作（試合開始など）
2. 正常に動作することを確認

### ステップ2: オフラインモード切替
1. DevTools → **Network** タブ
2. **Offline** にチェック ✅
3. ページをリロード（Ctrl+R / Cmd+R）

### ステップ3: 動作確認
✅ 期待される動作:
- ページが正常に表示される
- CSS が適用されている
- JavaScript が動作する
- アイコンが表示される
- 試合記録が可能（IndexedDB はオフラインでも動作）

❌ エラーの場合:
- ページが真っ白 → Service Worker が未登録
- CSS が効いてない → style.css がキャッシュされていない
- JS エラー → スクリプトファイルがキャッシュされていない

## 5. PWA インストール確認

### PC (Chrome/Edge)
1. アドレスバー右側に **インストールアイコン** （+またはPCアイコン）が表示されるか確認
2. クリックしてインストール
3. デスクトップアプリとして起動できるか確認

### Android (Chrome)
1. メニュー（⋮）→ **ホーム画面に追加** または **アプリをインストール**
2. ホーム画面にアイコンが追加されるか確認
3. アイコンが `static/icon-192.png` の画像か確認

### iOS (Safari)
1. 共有ボタン（□に↑）→ **ホーム画面に追加**
2. ホーム画面にアイコンが追加されるか確認
3. アイコンが `icons/apple-touch-icon.png` の画像か確認

## 6. Manifest 確認

### DevTools → Application → Manifest
✅ 確認項目:
- **Name**: 野球スコア記録アプリ - Baseball Score Recorder
- **Short name**: 野球スコア
- **Start URL**: ./index.html
- **Theme color**: #2196F3
- **Background color**: #ffffff
- **Display**: standalone
- **Icons**: 192x192, 512x512 などが表示される

## トラブルシューティング

### Service Worker が登録されない
```
原因: sw.js のパス間違い、キャッシュファイル不足
対処: Console でエラー確認 → ファイルパス修正
```

### オフラインで動かない
```
原因: Service Worker が activated していない
対処: Application タブで Status 確認 → キャッシュ更新
```

### アイコンが表示されない
```
原因: manifest.json のパス間違い、ファイル不足
対処: static/icon-192.png などの存在確認
```

### キャッシュが更新されない
```
原因: CACHE_NAME が同じまま
対処: sw.js の CACHE_NAME を変更（例: v2 → v3）
```

## 成功の目安

✅ すべてクリアすべき項目:
1. Service Worker が `activated and running`
2. Cache Storage に全ファイルが存在
3. オフラインモードでページ表示
4. インストールアイコンが表示
5. ホーム画面にアプリ追加可能
6. アイコン画像が正しい

---

## 本番デプロイ前の最終チェック

- [ ] localhost で上記すべて確認済み
- [ ] 実機（スマホ/タブレット）で確認済み
- [ ] オフライン動作確認済み
- [ ] アイコン表示確認済み
- [ ] GitHub Pages / ホスティング先で確認済み

すべてOKなら **完全オフラインPWA** として配布可能！🎉
