# 市場ポジショニング

南北アメリカ大陸の野球関係者へ売り出すための訴求軸と比較観点を整理する。

## 一言での位置づけ

通信が不安定な現場でも使える、多言語対応の軽量な野球スコア記録PWA。

初期販売検証では、米国本土の大型競合と正面衝突せず、南米の日系野球コミュニティを優先する。特にブラジル日系野球とペルー日系野球を最初の検証先とし、WhatsApp Business、Facebook、Instagram を中心に問い合わせ導線を作る。

## 主な差別化

- PWAなのでURLからすぐ試せる
- オフライン利用を前提にできる
- `ja` / `en` / `es` / `pt` の4言語に対応
- `inning` / `batter` / `pitch` で記録粒度を選べる
- `bench` / `tv` で記録環境を選べる
- 詳細記録と高速入力の両方を狙える
- Service Workerで静的ファイルをキャッシュできる

## 競合・代替との比較観点

| 種類 | 例 | 強み | このアプリの対抗軸 |
|---|---|---|---|
| 大型チーム管理アプリ | GameChanger等 | チーム管理、配信、ファン機能 | 軽さ、即利用、オフライン、多言語 |
| 紙のスコアブック | 手書き記録 | 自由度、慣れ | 保存、復元、集計、共有準備 |
| 表計算テンプレート | Excel / Sheets | カスタムしやすい | 試合中入力、スマホ利用、PWA |
| 専用ネイティブアプリ | 各種スコアアプリ | ストア導線、端末機能 | URL共有、更新容易、軽量 |

## 打ち出すべきメッセージ

### English

Fast baseball scorekeeping for coaches, scorekeepers, and tournament staff. Works offline and supports English, Spanish, Portuguese, and Japanese.

### Espanol

Anotacion rapida de beisbol para entrenadores, anotadores y organizadores de torneos. Funciona sin conexion y esta disponible en espanol, ingles, portugues y japones.

### Portugues

Marcacao rapida de beisebol para tecnicos, anotadores e organizadores de torneios. Funciona offline e oferece suporte a portugues, ingles, espanhol e japones.

### 日本語

監督、記録係、大会運営者のための高速な野球スコア記録PWA。オフライン対応、多言語対応。

## 初期掲載先

- 南米の日系野球チーム、日系会館、県人会、文化協会のFacebookページ/グループ
- ブラジル、ペルーの日系野球コミュニティ向けInstagram
- WhatsApp Business の問い合わせ導線
- Apple App Store / Google Play への将来的な展開
- PWAとしての公式LP
- ABCAなどコーチ向けコミュニティ
- USA Baseball / Baseball Canada周辺の地域コーチ導線
- WBSC Americas加盟国の連盟・地域団体
- Facebookグループ、WhatsAppコミュニティ、Instagram
- Product Huntなどの新規プロダクト紹介サイト

## 販売前に必要な素材

- モニター募集ページ
- 1試合通し検証フォーム
- WhatsApp Business の問い合わせリンク
- 英語のLP
- スペイン語のLP
- ポルトガル語のLP
- 30秒デモ動画
- スマホ画面のスクリーンショット
- オフライン利用の説明
- プライバシーと保存データの説明
- 既知の制約

## 関連ドキュメント

- `docs/product/monitor-program.md`: 実戦モニター募集とフィードバック収集の設計
- `docs/product/distribution-readiness.md`: PWA配布準備と将来のアプリ化判断
- `docs/product/south-america-nikkei-gtm.md`: 南米日系人向けの初期GTM戦略
- `docs/product/notion-manus-posting-ops.md`: Notion投稿管理とManus最小運用の設計
- `docs/product/competitor-swot.md`: 競合アプリ・代替手段とのSWOT分析
- `docs/product/target-users.md`: ターゲットユーザー別の訴求整理
