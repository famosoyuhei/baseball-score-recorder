<div align="center">

# ⚾ 野球スコア記録アプリ

オフラインで使える本格的な野球試合記録システム

<img src="static/app_icon.png" alt="App Icon" width="120" height="120">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-brightgreen.svg)](manifest.json)
[![Offline First](https://img.shields.io/badge/Offline-First-orange.svg)](#)

[日本語](#日本語) | [English](#english) | [Features](#主な機能) | [Demo](#デモ)

</div>

---

## 日本語

### 概要

**野球スコア記録アプリ**は、オフラインで動作する本格的な野球試合記録システムです。プロ・アマチュア問わず、詳細な打席記録・投球記録・選手統計を管理できます。

### 主な機能

#### 📊 多段階記録モード
- **イニング記録**: 半イニング単位での簡易記録
- **打者記録**: 打席ごとの詳細記録
- **投球記録**: 球数・球種・コース詳細記録

#### 🔄 完全な訂正・編集機能
- **打席結果の訂正**: ヒットをエラーに、など後から修正可能
- **統計の自動再計算**: 訂正すると全データに即座に反映
- **訂正履歴の保存**: いつ何を変更したか完全記録

#### ⚡ クイック記録モード
- **高速入力**: 試合展開が速い時は最低限の情報で記録
- **後から詳細追記**: 時間ができたら詳細情報を補完
- **未入力マーク**: 詳細が未入力の項目を視覚的に表示

#### 👥 選手情報管理
- **簡易登録**: 打順のみで試合開始可能
- **後から編集**: 選手名・守備位置を後から入力
- **漢字修正対応**: 名前の誤字も後から訂正可能

#### 📱 PWA対応
- **ホーム画面追加**: スマホ・タブレットにアプリとしてインストール可能
- **オフライン完全動作**: インターネット不要
- **全デバイス対応**: iPhone、Android、PC、タブレット

#### 🌐 多言語対応
- 日本語、英語、スペイン語、ポルトガル語

### スクリーンショット

<div align="center">

| ホーム画面 | 試合記録中 | 選手統計 |
|:---:|:---:|:---:|
| ![Home](docs/screenshots/home.png) | ![Game](docs/screenshots/game.png) | ![Stats](docs/screenshots/stats.png) |

</div>

### インストール

#### 方法1: PWAとしてインストール（推奨）

##### iOS (iPhone/iPad)
1. Safariでアプリを開く
2. 共有ボタン（□に↑）をタップ
3. 「ホーム画面に追加」を選択

##### Android
1. Chromeでアプリを開く
2. メニュー（⋮）をタップ
3. 「ホーム画面に追加」を選択

##### PC (Chrome/Edge)
1. ブラウザでアプリを開く
2. アドレスバーのインストールアイコン（+）をクリック

#### 方法2: ローカル環境で実行

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/baseball-score-recorder.git
cd baseball-score-recorder

# HTTPサーバーで起動（Python 3の場合）
python -m http.server 8000

# ブラウザで開く
# http://localhost:8000
```

### 使い方

#### 1. 試合開始

```
新規試合 → チーム名入力 → 記録レベル選択 → 選手登録 → 開始
```

- **記録レベル**: イニング/打者/投球から選択
- **選手登録**: 
  - 通常モード: 全選手の詳細情報を入力
  - 簡易モード: 打順のみで開始（名前は後から入力可）

#### 2. 試合記録

- **打席結果**: ヒット、アウト、四球など選択
- **走者進塁**: ベース上の走者を管理
- **投球詳細**: 球種・コース・結果（投球記録モード時）

#### 3. 訂正・編集

- **打席履歴**: 過去の打席を表示し、訂正可能
- **選手情報編集**: ボタンから選手名・守備位置を変更
- **自動再計算**: 訂正すると統計が自動更新

#### 4. データ保存

- **自動保存**: IndexedDBに自動保存
- **オフライン動作**: ネット接続不要
- **データ永続化**: ブラウザを閉じても保持

### 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **データベース**: IndexedDB（ブラウザ内蔵）
- **PWA**: Service Worker, Web App Manifest
- **多言語化**: カスタムi18nシステム

### ファイル構成

```
baseball-score-recorder/
├── index.html              # メインHTML
├── manifest.json           # PWA設定
├── css/
│   └── style.css          # スタイルシート
├── js/
│   ├── app.js             # メインアプリロジック
│   ├── game.js            # ゲーム管理
│   ├── data.js            # データモデル
│   ├── storage.js         # IndexedDB操作
│   └── i18n.js            # 多言語対応
├── static/
│   ├── app_icon.png       # メインアイコン
│   ├── icon-192.png       # PWA用アイコン
│   └── icon-512.png       # PWA用アイコン
└── icons/                 # 各種サイズアイコン
```

### ブラウザ対応

| ブラウザ | デスクトップ | モバイル | PWA対応 |
|:---:|:---:|:---:|:---:|
| Chrome | ✅ | ✅ | ✅ |
| Firefox | ✅ | ✅ | ✅ |
| Safari | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |

### ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照

### 貢献

プルリクエスト、イシュー報告を歓迎します！

1. フォーク
2. フィーチャーブランチ作成 (`git checkout -b feature/amazing-feature`)
3. コミット (`git commit -m 'Add amazing feature'`)
4. プッシュ (`git push origin feature/amazing-feature`)
5. プルリクエスト作成

### サポート

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/baseball-score-recorder/issues)
- 📖 Wiki: [Documentation](https://github.com/yourusername/baseball-score-recorder/wiki)

---

## English

### Overview

**Baseball Score Recorder** is a comprehensive offline-first baseball game recording system. Perfect for professional and amateur games, supporting detailed at-bat tracking, pitch-by-pitch recording, and player statistics.

### Key Features

#### 📊 Multi-Level Recording Modes
- **Inning Recording**: Quick half-inning summaries
- **Batter Recording**: Detailed at-bat tracking
- **Pitch Recording**: Ball-by-ball detailed recording

#### 🔄 Complete Correction System
- **Result Correction**: Change hits to errors retroactively
- **Auto Statistics Recalculation**: Changes propagate instantly
- **Correction History**: Complete audit trail

#### ⚡ Quick Record Mode
- **Fast Input**: Minimal data when game tempo is high
- **Detail Fill Later**: Add details when time allows
- **Visual Markers**: Incomplete entries highlighted

#### 👥 Player Management
- **Quick Registration**: Start with batting order only
- **Edit Later**: Add names and positions anytime
- **Name Corrections**: Fix typos after game starts

#### 📱 PWA Support
- **Install to Home Screen**: Works like a native app
- **Fully Offline**: No internet required
- **All Devices**: iPhone, Android, PC, Tablet

#### 🌐 Multi-Language
- Japanese, English, Spanish, Portuguese

### Installation

See [Japanese section](#インストール) for detailed installation instructions.

### License

MIT License - see [LICENSE](LICENSE) file

---

<div align="center">

Made with ⚾ and ❤️

[⬆ Back to Top](#-野球スコア記録アプリ)

</div>
