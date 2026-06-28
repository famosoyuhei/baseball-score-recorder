# 翻訳スタイルガイド

`js/i18n.js` にUIテキストを追加・変更するときの用語統一ルール。新しいキーを追加する場合は `ja` / `en` / `es` / `pt` の4言語を必ず同時に更新する。

## 基本方針

- 試合中に読む文言は短くする
- ボタン文言は動詞を中心にする
- エラーや確認文は、次に何をすればよいかを含める
- 国ごとの野球用語差がある言葉は、一般的で通じやすい表現を優先する
- 直訳で不自然になる場合は、現場で使われる短い表現を優先する

## 主要用語

| 日本語 | English | Espanol | Portugues | メモ |
|---|---|---|---|---|
| 試合 | Game | Juego | Jogo |  |
| イニング | Inning | Entrada | Entrada | スペイン語圏では inning も通じるがUIは Entrada を基本 |
| 表 | Top | Alta | Parte alta |  |
| 裏 | Bottom | Baja | Parte baixa |  |
| 得点 | Run | Carrera | Corrida | ブラジル野球では ponto も文脈次第 |
| 安打 | Hit | Hit | Rebatida |  |
| 打者 | Batter | Bateador | Rebatedor |  |
| 投手 | Pitcher | Lanzador | Arremessador |  |
| 走者 | Runner | Corredor | Corredor |  |
| アウト | Out | Out | Out |  |
| ボール | Ball | Bola | Bola |  |
| ストライク | Strike | Strike | Strike |  |
| ファウル | Foul | Foul | Foul |  |
| 四球 | Walk | Base por bolas | Base por bolas |  |
| 死球 | Hit by pitch | Golpeado por lanzamiento | Atingido pelo arremesso | ボタンでは短縮可 |
| 盗塁 | Stolen base | Base robada | Roubo de base |  |
| 失策 | Error | Error | Erro |  |
| 自責点 | Earned run | Carrera limpia | Corrida limpa |  |
| 責任走者 | Responsible runner | Corredor responsable | Corredor de responsabilidade |  |
| 保存 | Save | Guardar | Salvar |  |
| 読み込み | Load | Cargar | Carregar |  |
| 削除 | Delete | Eliminar | Excluir |  |

## 記録レベル

| 値 | 日本語 | English | Espanol | Portugues |
|---|---|---|---|---|
| `inning` | 半イニングごと | By half-inning | Por media entrada | Por meia entrada |
| `batter` | 打者ごと | By batter | Por bateador | Por rebatedor |
| `pitch` | 球ごと | By pitch | Por lanzamiento | Por arremesso |

## 記録環境

| 値 | 日本語 | English | Espanol | Portugues |
|---|---|---|---|---|
| `bench` | ベンチ記録 | Bench scoring | Anotacion desde banca | Marcacao no banco |
| `tv` | TV観戦記録 | TV viewing | Anotacion viendo TV | Marcacao assistindo TV |

## 文体

| 種類 | 方針 |
|---|---|
| ボタン | 1から3語程度 |
| モーダルタイトル | 名詞句を基本 |
| 確認文 | 何が起きるかを明示 |
| エラー | 原因と次の行動を短く示す |
| チュートリアル | 丁寧だが長くしすぎない |

## 監査チェック

- [ ] 新規キーが4言語すべてにある
- [ ] 同じ概念に複数の訳語を使っていない
- [ ] ボタン文言が長すぎない
- [ ] 小さい画面で折り返してもUIが崩れない
- [ ] 記録中の画面に説明文を増やしすぎていない
