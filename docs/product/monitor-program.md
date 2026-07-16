# 実戦モニター検証プログラム

## 目的

南米日系人向けに販売投稿を本格化する前に、人間が1試合を通して使えるかを検証する。

この段階の目的は売上ではなく、試合中に記録が破綻しないこと、操作で迷う箇所が明確になること、購入前に必要な説明やサポート導線を把握することにある。

## 推奨順序

| 段階 | 対象 | 目標 |
|---|---|---|
| 1 | 日本語で連絡できる野球経験者、記録経験者 | 1から3試合分の致命的な不具合を見つける。 |
| 2 | 日本語の野球未経験寄りユーザー | 操作説明の不足や迷う言葉を見つける。 |
| 3 | pt-BR / es-LATAM を読める野球関係者 | 翻訳、野球用語、現地語の自然さを確認する。 |
| 4 | 南米日系人コミュニティのモニター | 販売前の実地反応とWhatsApp導線を確認する。 |

## モニター募集文

### 日本語

```text
野球スコア記録PWAの実戦モニターを募集しています。

スマホやPCのブラウザから使える、軽量な野球スコア記録アプリです。
1試合を通して使っていただき、不具合、使いにくい点、記録しづらい場面を教えてください。

少年野球、草野球、アマチュアチーム、観戦記録のどれでも歓迎です。
現時点ではモニター版のため、記録ミスや保存不具合が起こる可能性があります。

ご協力いただける方は、使用端末、ブラウザ、試合形式を添えてご連絡ください。
```

### Portugues

```text
Estamos procurando monitores para testar um PWA leve de marcacao de beisebol.

Voce pode usar pelo navegador do celular ou computador, sem instalar pela loja de aplicativos.
Queremos que voce teste durante uma partida completa e nos envie problemas, duvidas e sugestoes de melhoria.

Times nikkei, beisebol amador, categorias de base e anotadores sao bem-vindos.
Esta e uma versao de teste, entao podem existir erros de registro ou salvamento.

Se quiser participar, envie seu dispositivo, navegador e tipo de partida pelo WhatsApp.
```

### Espanol

```text
Buscamos monitores para probar un PWA ligero de anotacion de beisbol.

Puedes usarlo desde el navegador del celular o de la computadora, sin instalar desde una tienda de apps.
Queremos que lo pruebes durante un partido completo y nos envies errores, dudas y sugerencias.

Equipos nikkei, beisbol amateur, categorias juveniles y anotadores son bienvenidos.
Esta es una version de prueba, por lo que puede haber errores de registro o guardado.

Si quieres participar, envia tu dispositivo, navegador y tipo de partido por WhatsApp.
```

## 参加者に渡す案内

1. アプリURLを開く。
2. 可能ならホーム画面に追加する。
3. 練習試合、観戦試合、過去動画のどれかで1試合分記録する。
4. 途中で迷った場面や記録できなかったプレーをメモする。
5. 試合終了後、フィードバックフォームを送る。
6. 重大な不具合はWhatsAppでスクリーンショットと一緒に送る。

詳細なPWAインストール手順は `docs/pwa/install-guide.md` を使う。

## フィードバックフォーム項目

| 項目 | 型 | 必須 | 用途 |
|---|---|---:|---|
| 名前またはニックネーム | text | 任意 | 追跡連絡用。 |
| 連絡先 | text | 任意 | WhatsAppやメール。 |
| 言語 | select | 必須 | `ja`, `pt-BR`, `es-LATAM`, `en`。 |
| 国/地域 | text | 必須 | 地域差の確認。 |
| 役割 | select | 必須 | 監督、コーチ、記録係、保護者、選手、観戦者。 |
| 端末 | select | 必須 | iPhone, Android, iPad, PC, other。 |
| ブラウザ | select | 必須 | Safari, Chrome, Edge, other。 |
| PWA追加 | select | 必須 | 追加できた、追加していない、失敗した。 |
| 1試合完了 | select | 必須 | 完了、途中まで、開始できなかった。 |
| 記録モード | select | 必須 | `bench`, `tv`, 不明。 |
| 記録レベル | select | 必須 | `inning`, `batter`, `pitch`, 不明。 |
| 記録できなかった場面 | long text | 必須 | ルール/操作の穴を見つける。 |
| 迷った操作 | long text | 必須 | UI改善の材料。 |
| 保存/復元 | select | 必須 | 問題なし、保存できない、復元できない、不明。 |
| オフライン利用 | select | 任意 | 問題なし、未検証、問題あり。 |
| 改善してほしい点 | long text | 任意 | 次の改善候補。 |
| スクリーンショット | file | 任意 | 不具合再現用。 |
| 他チームに勧めたいか | scale | 必須 | 0から10。 |
| 有料なら使うか | select | 任意 | はい、条件次第、いいえ。 |

## 不具合チケットの分類

| 優先度 | 条件 | 対応 |
|---|---|---|
| P0 | 1試合を完了できない、保存データが壊れる、得点/アウトが重大に矛盾する。 | 販売投稿を止めて修正する。 |
| P1 | よくあるプレーを記録できない、復元後に重要情報が欠ける。 | 次回モニター前に修正する。 |
| P2 | 操作が迷いやすい、説明不足、表示崩れ。 | まとめて改善する。 |
| P3 | 表現、翻訳、補助説明、要望。 | 投稿/ヘルプ/将来改善に回す。 |

## Notionで管理する場合のDBカラム

| カラム | 型 | 用途 |
|---|---|---|
| `Tester` | title | モニター名または識別名。 |
| `Status` | select | `invited`, `accepted`, `testing`, `submitted`, `followed_up`, `closed`。 |
| `Language` | select | `ja`, `pt-BR`, `es-LATAM`, `en`。 |
| `Country` | select | 国/地域。 |
| `Role` | select | 監督、コーチ、記録係、保護者、選手、観戦者。 |
| `Device` | select | iPhone, Android, iPad, PC, other。 |
| `Browser` | select | Safari, Chrome, Edge, other。 |
| `Game Completed` | checkbox | 1試合完了したか。 |
| `PWA Installed` | select | success, not tried, failed。 |
| `Blocking Issue` | checkbox | P0/P1相当があるか。 |
| `Feedback Summary` | text | 主要フィードバック。 |
| `Bug Links` | relation/url | 不具合チケットやスクショ。 |
| `Recommend Score` | number | 0から10。 |
| `Purchase Intent` | select | yes, maybe, no。 |
| `Next Follow-up` | date | 次の連絡日。 |

## 販売投稿へ進む条件

- 少なくとも5試合分の通し検証がある。
- P0が残っていない。
- P1が販売訴求に関わる範囲で解消済み、または既知の制約として説明できる。
- iPhone Safari と Android Chrome のどちらか片方だけでなく、両方で最低1件の検証がある。
- 保存/復元について、モニターに説明できる状態になっている。
- 不具合報告とWhatsApp問い合わせの導線が用意されている。

## 販売投稿を止める条件

- 1試合完了できない報告が複数ある。
- 保存済み試合が消える/壊れる報告が再現する。
- 得点、アウト、走者状況の矛盾が実戦で頻発する。
- モニターがPWAの起動やホーム画面追加で広くつまずく。
- データ保存や未成年情報の扱いを説明できない。

## 関連文書

- `docs/pwa/install-guide.md`: PWAインストール案内
- `docs/pwa/release-checklist.md`: 外部配布前のPWA確認
- `docs/privacy/data-storage.md`: 保存データとプライバシー説明
- `docs/product/south-america-nikkei-gtm.md`: 南米日系人向けGTM戦略
