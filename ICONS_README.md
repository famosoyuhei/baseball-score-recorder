# アプリアイコン設定ガイド

## 概要

app_icon.pngから各種デバイス用のアイコンが自動生成され、設定されています。

## 生成されたファイル

### アイコンファイル（icons/ディレクトリ）
- **PWA用アイコン**: 72x72、96x96、128x128、144x144、152x152、192x192、384x384、512x512
- **Apple Touch Icon**: 120x120、152x152、167x167、180x180
- **Favicon**: 16x16、32x32、48x48

### 設定ファイル
- `manifest.json` - PWA（Progressive Web App）設定
- `browserconfig.xml` - Windows タイル設定
- `favicon.ico` - ブラウザファビコン

## 対応デバイス

### スマートフォン
- **iOS (iPhone/iPad)**: Apple Touch Iconが自動表示
  - ホーム画面に追加すると、アプリアイコンとして表示
  - Safari、Chrome対応

- **Android**: Chrome、Edgeなどでアイコン表示
  - ホーム画面に追加可能
  - PWAとしてインストール可能

### タブレット
- **iPad**: 152x152、167x167のアイコン対応
- **Android タブレット**: 192x192、512x512のアイコン対応

### パソコン
- **ブラウザタブ**: favicon.ico、16x16、32x32
- **Windows タイル**: 144x144
- **ブックマーク**: 各種サイズに対応

## PWA機能

このアプリは**Progressive Web App (PWA)**として設定されています：

### 機能
1. **ホーム画面に追加可能**
   - スマホ・タブレットのホーム画面にアプリアイコンとして追加できます
   
2. **オフライン動作**
   - インターネット接続なしで使用可能（既に実装済み）

3. **アプリのような体験**
   - フルスクリーン表示（ブラウザのアドレスバーなし）
   - ネイティブアプリのような操作感

### ホーム画面への追加方法

#### iOS (iPhone/iPad)
1. Safariでアプリを開く
2. 共有ボタン（□に↑）をタップ
3. 「ホーム画面に追加」を選択
4. アイコンが表示されます

#### Android (Chrome)
1. Chromeでアプリを開く
2. メニュー（⋮）をタップ
3. 「ホーム画面に追加」または「アプリをインストール」を選択
4. アイコンが表示されます

#### PC (Chrome/Edge)
1. ブラウザでアプリを開く
2. アドレスバーの右側にインストールアイコン（+）が表示
3. クリックしてインストール

## アイコンの更新方法

新しいアイコンを使用する場合：

1. 新しいアイコンを `app_icon.png` として保存（推奨: 1024x1024以上）
2. Pythonスクリプトを実行：
   ```bash
   python generate_icons.py
   ```
3. 各種サイズのアイコンが自動生成されます

## 技術詳細

### manifest.json
- **name**: アプリの正式名称
- **short_name**: ホーム画面に表示される短縮名
- **display**: "standalone" = アプリモードで表示
- **theme_color**: #2196F3（青色）
- **background_color**: #ffffff（白色）

### アイコン要件
- **形式**: PNG（透過対応）
- **最小サイズ**: 512x512推奨
- **アスペクト比**: 1:1（正方形）

## トラブルシューティング

### アイコンが表示されない場合
1. ブラウザのキャッシュをクリア
2. ページをリロード（Ctrl+Shift+R / Cmd+Shift+R）
3. アプリを一度削除して再インストール

### PWAとして認識されない場合
1. HTTPSで配信されているか確認（localhost除く）
2. manifest.jsonが正しく読み込まれているか確認
3. Service Workerが登録されているか確認

## ファイル構成

```
Baseball scoreing system/
├── app_icon.png              # 元のアイコン画像
├── favicon.ico               # ブラウザ用ファビコン
├── manifest.json             # PWA設定
├── browserconfig.xml         # Windows設定
├── generate_icons.py         # アイコン生成スクリプト
└── icons/                    # 生成されたアイコン
    ├── icon-*.png           # PWA用
    ├── apple-touch-icon*.png # iOS用
    └── favicon-*.png        # ファビコン用
```

## 参考情報

- [PWA Manifest仕様](https://developer.mozilla.org/ja/docs/Web/Manifest)
- [Apple Touch Icon仕様](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Android アプリマニフェスト](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start/)
