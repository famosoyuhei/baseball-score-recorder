# Notion / Manus 投稿運用設計

## 目的

南米日系人向けの販売検証を、Manus のクレジット消費を最小限に抑えながら運用する。

Manus は Meta 系媒体と WhatsApp Business の実操作に限定する。投稿企画、ペルソナ分析、コピー作成、改善案、Notion DB 設計は Codex / Claude Code 側で行う。

## 責任分担

| 領域 | 担当 | 理由 |
|---|---|---|
| 市場仮説、ペルソナ、媒体戦略 | Codex / Claude Code | 思考量が多く、Manusに任せるとクレジット消費が増える。 |
| 投稿文、翻訳、クリエイティブ指示 | Codex / Claude Code | バッチ生成しやすく、レビューもしやすい。 |
| Notion DB 設計、CSV/JSON整形 | Codex | 構造化データとして管理しやすい。 |
| Facebook / Instagram / Threads 投稿 | Manus | Meta 系の実操作に寄せる。 |
| WhatsApp Business 導線確認 | Manus | 実際のMeta/WhatsApp側の画面操作が必要。 |
| 投稿後メトリクス取得 | Manus | Meta側の実データ取得に限定する。 |
| 分析、改善案、次回投稿計画 | Codex / Claude Code | 投稿結果だけを入力にして低コストで回す。 |

## Notion DB カラム

| カラム | 型 | 用途 |
|---|---|---|
| `Title` | title | 投稿名。 |
| `Status` | select | `idea`, `drafted`, `reviewed`, `ready_for_manus`, `posted`, `failed`, `analyzed`, `archived`。 |
| `Language` | select | `pt-BR`, `es-LATAM`, `ja`, `en`。 |
| `Country` | select | `Brazil`, `Peru`, `Argentina`, `Paraguay`, `Bolivia`, `South America`, `Japan`, `Other`。 |
| `Nikkei Target` | checkbox | 南米日系人向けなら true。 |
| `Community Type` | select | `baseball team`, `academy`, `parents`, `scorekeeper`, `nikkei association`, `tournament`, `other`。 |
| `Persona` | select | `coach`, `scorekeeper`, `team manager`, `academy owner`, `parent`, `player`, `association staff`。 |
| `Primary Channel` | select | 主投稿先。 |
| `Secondary Channel` | multi-select | 転用先。 |
| `Manus Eligible` | checkbox | Manusに処理させる投稿なら true。原則 Meta / WhatsApp 系のみ。 |
| `Channel Fit Score` | number | 1から5。媒体とペルソナの適合度。 |
| `Why This Channel` | text | 媒体選定理由。 |
| `Avoid Channels` | multi-select | 今回使わない媒体。 |
| `Funnel Stage` | select | `awareness`, `interest`, `trial`, `conversion`, `retention`。 |
| `Content Type` | select | `feature`, `use case`, `tutorial`, `community`, `comparison`, `testimonial`。 |
| `Post Copy` | text | 投稿本文。 |
| `Japanese Heritage Angle` | select | `none`, `light`, `strong`。 |
| `Local Trust Hook` | select | `community`, `family`, `discipline`, `record keeping`, `Japan connection`, `offline use`。 |
| `Creative Brief` | text | 画像、動画、スクリーンショットの指示。 |
| `CTA Type` | select | `whatsapp inquiry`, `demo`, `try pwa`, `watch video`, `community intro`。 |
| `WhatsApp CTA Text` | text | WhatsApp誘導文。 |
| `Scheduled At` | date | 投稿予定日時。 |
| `Manus Instruction` | text | Manusに渡す最小指示。 |
| `Post URL` | url | 投稿後URL。 |
| `Reach` | number | 投稿リーチ。 |
| `Engagements` | number | 反応数。 |
| `Clicks` | number | リンククリック数。 |
| `WhatsApp Inquiries` | number | WhatsApp問い合わせ数。 |
| `Result Summary` | text | Manusの実行結果。 |
| `Failure Reason` | text | 失敗時の短い理由。 |
| `Learning` | text | Codex / Claude Code 側で記入する学び。 |
| `Next Action` | text | 次回の改善アクション。 |

## ステータス運用

| Status | 意味 | 担当 |
|---|---|---|
| `idea` | 投稿テーマだけある。 | Codex / Claude Code |
| `drafted` | 投稿文と媒体案がある。 | Codex / Claude Code |
| `reviewed` | 人間確認済み。 | Human |
| `ready_for_manus` | Manusが処理してよい。 | Human |
| `posted` | 投稿済み。 | Manus |
| `failed` | 投稿失敗。理由を書き戻す。 | Manus |
| `analyzed` | 投稿結果を分析済み。 | Codex / Claude Code |
| `archived` | 検証終了。 | Human |

## Manus に渡す最小指示テンプレート

### 投稿実行

```text
Notion DB の Status = ready_for_manus かつ Manus Eligible = true の投稿だけ処理してください。

対象は最大 {N} 件です。
各レコードの Manus Instruction, Primary Channel, Secondary Channel, Post Copy, Creative Brief, Scheduled At, WhatsApp CTA Text に従って、Meta 系媒体へ投稿または予約してください。

投稿に成功したら Post URL, Result Summary を書き戻し、Status を posted にしてください。
失敗したら Status を failed にし、Failure Reason に短い理由を書いてください。

投稿案の改善、コピーの再作成、媒体戦略の判断はしないでください。
Notion の対象外レコードは触らないでください。
```

### メトリクス取得

```text
Notion DB の Status = posted で、Post URL があり、まだ Result Summary に最新メトリクスがない投稿だけ確認してください。

Meta 系媒体から Reach, Engagements, Clicks, WhatsApp Inquiries に相当する数値を取得し、Notion に書き戻してください。

分析や改善案は書かず、取得できた数値と取得日時だけ Result Summary に追記してください。
取得できない場合は Failure Reason に短く理由を書いてください。
```

## Manus クレジット節約ルール

- Manus に自由分析をさせない。
- `ready_for_manus` かつ `Manus Eligible = true` のレコードだけを対象にする。
- 1回の実行件数を固定する。
- 投稿文、媒体、CTA、日時、画像指示は事前に Notion に完成形で入れる。
- 投稿失敗時に再生成や長い調査をさせない。
- X、YouTube、LinkedIn、TikTok は初期段階では Manus 対象外にする。
- Threads は Instagram / Facebook 投稿の低コスト転用だけにする。
- 分析は Codex / Claude Code 側で行う。

## 初期投稿 12 件の枠

| ID | 対象 | 言語 | Persona | Channel | Theme |
|---|---|---|---|---|---|
| BR-01 | Brazil | pt-BR | coach | Facebook | 日系野球チーム向けの簡単スコア記録 |
| BR-02 | Brazil | pt-BR | scorekeeper | Instagram | スマホで試合中に記録できる |
| BR-03 | Brazil | pt-BR | team manager | Facebook | チーム内共有と保存 |
| BR-04 | Brazil | pt-BR | academy owner | Instagram | アカデミーで記録方法を標準化 |
| BR-05 | Brazil | pt-BR | parent | Facebook | 保護者に試合記録を説明しやすい |
| BR-06 | Brazil | pt-BR | coach | Instagram | 通信が不安定な球場でも使いやすい |
| PE-01 | Peru | es-LATAM | coach | Facebook | equipos nikkei 向けの記録 |
| PE-02 | Peru | es-LATAM | scorekeeper | Instagram | anotacion simple desde el celular |
| PE-03 | Peru | es-LATAM | team manager | Facebook | marcador y jugadas para compartir |
| PE-04 | Peru | es-LATAM | association staff | Facebook | comunidad nikkei と野球交流 |
| SA-01 | South America | ja + pt-BR | association staff | Facebook | 南米日系野球への敬意と紹介 |
| SA-02 | South America | ja + es-LATAM | supporter | X | 日本本国の支援者・紹介者向け |

## 初回検証の判定

12 件を投稿した後、以下を見て次の 12 件を決める。

- WhatsApp 問い合わせが発生した国
- コメントや保存が多い媒体
- 日系性を強く出した投稿と、実用価値だけの投稿の差
- 監督、スコア係、保護者、協会関係者のどこに反応があるか
- Facebook と Instagram のどちらが問い合わせに近いか

## 禁止事項

- Manus に南米全体の市場調査を追加依頼しない。
- Manus に投稿文をゼロから作らせない。
- 投稿失敗時にその場で媒体戦略を変えさせない。
- Notion の `idea` / `drafted` / `reviewed` レコードを Manus に触らせない。
- WhatsApp の大量一斉送信を初期運用にしない。
