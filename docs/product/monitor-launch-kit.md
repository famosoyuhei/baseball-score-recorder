# モニター募集ローンチキット

## 目的

実戦モニター募集投稿を出す前に、必要なURL、フォーム、問い合わせ導線、注意書き、投稿文を1か所にまとめる。

現時点では、まず自分で1試合通し検証を行い、その結果を反映してから外部モニター募集を開始する。

## 投稿前に埋める項目

| 項目 | 状態 | メモ |
|---|---|---|
| アプリURL | 未確定 | HTTPSの公開URLが必要。ローカルURLは外部モニターには使わない。 |
| フィードバックフォームURL | 未確定 | Google Forms / Tally / Notion Form のいずれか。 |
| WhatsApp Businessリンク | 未確定 | `https://wa.me/<country-code-number>?text=<encoded-message>` 形式を推奨。 |
| モニター募集対象 | 初回は日本語圏 | まず国内観戦/記録経験者で不具合を集める。 |
| 配布可否 | 条件付き | 1試合通し検証と保存/復元確認後に外部投稿へ進む。 |

## フィードバックフォーム作成用項目

フォーム名:

```text
野球スコア記録PWA 実戦モニター フィードバック
```

説明文:

```text
1試合を通して使った感想、不具合、迷った操作を教えてください。
このアプリはモニター版です。試合データは基本的にお使いの端末内に保存され、ブラウザのサイトデータを削除すると消える可能性があります。
```

フォーム項目:

| 質問 | 形式 | 必須 | 選択肢/補足 |
|---|---|---:|---|
| 名前またはニックネーム | 記述 | 任意 | 追跡連絡用。 |
| 連絡先 | 記述 | 任意 | WhatsApp、メール、SNSなど。 |
| 試した日 | 日付 | 必須 | 例: 2026-07-17。 |
| 試合/大会 | 記述 | 任意 | 例: 東東京予選。 |
| あなたの役割 | 選択 | 必須 | 観戦者、記録係、監督/コーチ、保護者、選手、その他。 |
| 使用端末 | 選択 | 必須 | iPhone, Android, iPad, PC, other。 |
| ブラウザ | 選択 | 必須 | Safari, Chrome, Edge, other。 |
| ホーム画面追加 | 選択 | 必須 | できた、試していない、できなかった。 |
| 記録モード | 選択 | 必須 | bench, tv, 不明。 |
| 記録レベル | 選択 | 必須 | inning, batter, pitch, 不明。 |
| 1試合を最後まで記録できましたか | 選択 | 必須 | できた、途中まで、開始できなかった。 |
| 保存はできましたか | 選択 | 必須 | できた、できなかった、不明。 |
| 再読み込み後に復元できましたか | 選択 | 必須 | できた、できなかった、未確認。 |
| オフラインで開けましたか | 選択 | 任意 | できた、できなかった、未確認。 |
| 記録できなかったプレー | 段落 | 必須 | 具体的なイニング、状況、操作を書いてもらう。 |
| 迷った操作 | 段落 | 必須 | どの画面/ボタンで迷ったか。 |
| 表示や翻訳で気になった点 | 段落 | 任意 | 文言、用語、見づらさ。 |
| 改善してほしい点 | 段落 | 任意 | 機能要望。 |
| 他チームに勧めたい度 | 線形 | 必須 | 0から10。 |
| 有料なら使いたいですか | 選択 | 任意 | はい、条件次第、いいえ。 |
| スクリーンショット | ファイル | 任意 | フォームが対応している場合のみ。 |

## WhatsApp Businessリンク

リンク形式:

```text
https://wa.me/<country-code-number>?text=<encoded-message>
```

初回メッセージ案:

```text
野球スコア記録PWAのモニターに興味があります。使用端末、ブラウザ、試合形式を送ります。
```

返信テンプレート:

```text
ありがとうございます。
以下の順番でお試しください。

1. アプリURLを開く
2. 可能ならホーム画面に追加する
3. 1試合を通して記録する
4. 保存して、再読み込み後に復元できるか確認する
5. フィードバックフォームを送る

モニター版のため、記録ミスや保存不具合が起こる可能性があります。
不具合が出た場合は、スクリーンショットと「何回・何アウト・走者状況・何を押したか」を送ってください。
```

## モニター募集投稿

### 日本語 通常版

```text
野球スコア記録PWAの実戦モニターを募集しています。

スマホやPCのブラウザから使える、軽量な野球スコア記録アプリです。
1試合を通して使っていただき、不具合、使いにくい点、記録しづらい場面を教えてください。

少年野球、草野球、高校野球の観戦記録、アマチュアチームなど、どの形でも歓迎です。
現時点ではモニター版のため、記録ミスや保存不具合が起こる可能性があります。

試していただける方は、アプリURLから起動し、試合後にフィードバックフォームを送ってください。

アプリURL:
{APP_URL}

フィードバックフォーム:
{FORM_URL}

問い合わせ:
{WHATSAPP_URL}
```

### 日本語 短縮版

```text
野球スコア記録PWAの実戦モニターを募集しています。

1試合を通して使っていただき、不具合や使いにくい点を教えてください。
スマホのブラウザから使えます。モニター版のため、記録ミスや保存不具合が起こる可能性があります。

アプリURL: {APP_URL}
フィードバック: {FORM_URL}
問い合わせ: {WHATSAPP_URL}
```

### Portugues

```text
Estamos procurando monitores para testar um PWA leve de marcacao de beisebol.

Voce pode usar pelo navegador do celular ou computador.
Queremos que voce teste durante uma partida completa e nos envie problemas, duvidas e sugestoes de melhoria.

Esta e uma versao de teste, entao podem existir erros de registro ou salvamento.

App: {APP_URL}
Formulario de feedback: {FORM_URL}
WhatsApp: {WHATSAPP_URL}
```

### Espanol

```text
Buscamos monitores para probar un PWA ligero de anotacion de beisbol.

Puedes usarlo desde el navegador del celular o de la computadora.
Queremos que lo pruebes durante un partido completo y nos envies errores, dudas y sugerencias.

Esta es una version de prueba, por lo que puede haber errores de registro o guardado.

App: {APP_URL}
Formulario de feedback: {FORM_URL}
WhatsApp: {WHATSAPP_URL}
```

## 投稿を出してよい条件

- `APP_URL` がHTTPSで開ける。
- iPhone Safari または Android Chrome で最低1回起動できた。
- 1試合または疑似1試合で、開始、記録、保存、復元を確認した。
- フィードバックフォームの送信テストが済んでいる。
- WhatsAppリンクを開ける。
- データ保存注意書きを投稿または案内ページから読める。

## 明日の観戦後にやること

1. フィードバックフォームに自分の検証結果を1件入れる。
2. P0/P1相当の問題を不具合チケット化する。
3. 投稿文の「モニター版」説明を、実際に迷った点に合わせて調整する。
4. 外部モニター募集を出すか、もう1試合セルフ検証するか判定する。
