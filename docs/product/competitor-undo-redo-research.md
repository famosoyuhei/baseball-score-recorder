# ライバルアプリの訂正・Undo/Redo 調査

調査日: 2026-11-19
対象: GameChanger（野球/ソフトボール記録）、iScore Baseball/Softball
目的: 履歴ジャーナル（戻る・進む）設計の競合踏襲ポイントを特定する。出典は公式ヘルプ・公式マニュアル類を優先。確認できなかった点は「未確認」と明記。

---

## 1. GameChanger

### 1.1 Undo
- **専用ボタンがある**。記録画面「Field View」の**左下**に「Undo」ボタンが配置され、直近のプレー/投球を削除する（GameChanger Guide, SportNgin 配信の公式トレーニング資料: https://cdn2.sportngin.com/attachments/document/ecd8-3532921/GameChanger_Training.pdf ／ WWAA GameChanger Guide: https://cdn4.sportngin.com/attachments/document/6345-3560757/WWAA_GameChanger.pdf）。
- **複数ステップ戻れる**。NSW Baseball Scorers の How-To は「Tap the Undo button to delete the last play or pitch entered—**multiple actions can be undone**」と明記（https://www.nswbaseballscorers.com.au/wp-content/uploads/sites/9/2023/09/GameChanger-General-How-To.pdf）。投球単位で何度でも遡れる。
- **ハーフイニング跨ぎ**：明文の記述は見つからなかったが、「最後のプレー/投球を削除」を繰り返す方式であり、ステップ数にイニング単位の制限は記載されていない（未確認だが仕組み上は跨げる）。
- **試合終了後**：ファイナライズ済みの試合でも**元の端末/アカウントから「Resume Scoring」で再入場して訂正でき、再びファイナライズできる**（GameChanger How To Guide: https://teamsideline.com/common/_GetDownload.aspx?d=J8G9u5hfoQjufUsOG7ziNDGPlDRAxZv%2BXpu7gXv1xo0%3D ／ Stanwood-Camano LL Game Changer 101: https://www.stanwoodcamanoll.org/Default.aspx?tabid=1467886 ）。公式ノートでは「編集はファイナライズ前に行うこと」が推奨され、初回ファイナライズ時に生成された Recap Story は後からのプレー追加では更新されない。

### 1.2 Redo / 進む
- **Redo ボタンが存在する**。Undo の隣に配置され、「Tap the Redo button to re-apply undone actions—**once another play/pitch is entered, any other undone actions are lost**」（NSW Baseball Scorers How To）。ブラウザ式：新しい入力をすると Redo スタックは破棄される。
- 旧公式マニュアル（Game Changer Scoring Notes v1.04, 2015）も同旨を明記：「If you use the UNDO button to return to a previous play, if you rescore the play, you will NOT be able to restore the following plays by utilizing the REDO button. The UNDO button should only be used for correcting the most recently scored play.」（https://doczz.net/doc/4139893/game-changer-scoring-notes ）

### 1.3 過去プレーの編集（最後のプレー以外）
- **Plays タブから任意の過去プレーをタップして編集できる**（記録中・iOS/Android 両対応）。手順：Plays タブ → プレーを選択 → 選手または結果の横の「Edit」→ 修正 → Save（公式 How To Guide「Past Plays」）。
- **編集の波及ルールが明確に定義されている**：
  - 投手・守備選手の編集は、その選手が交代するまで**後続の全プレーに適用**される（投手交代の記録漏れを、交代すべき最初のプレーで直すと以降すべてに反映）。
  - 攻撃側選手（打者・走者）の編集は**そのプレー1件のみ**に効く。
  - 攻撃側選手の編集は**現在の試合状態には影響しない**（過去の統計のみ修正）。
- **結果（outcome）の変更は「同等グループ内」のみ可**。編集可能な遷移が列挙されている（例：Error/FC/Single 間、Ground out/Sacrifice bunt 間、Double/Single+Error 間など）。アウト⇔セーフのような状態を壊す変更はこの編集では行えない。
- **Manual Overrides**：メニューからスコア・イニング・アウト・ボール/ストライクを直接上書きでき、**上書きした事実がプレーバイプレーに記録される**（NSW How To）。

### 1.4 判定訂正のワークフロー
- 公式に想定されているのは「直近のミス＝Undo」「過去のミス＝Plays タブ編集」「選手の付け間違い・投手交代漏れ＝該当プレーの Edit（後方伝播）」の3経路。ビデオ判定のような外部イベント専用のフローは文書化されていない（未確認＝存在しないと思われる）。
- 試合後の最終手段として Web（web.gc.com）のスタッフポータルで**ボックススコアの数値だけを直接編集**できる。ただし play-by-play は書き換えない（GameChanger 公式ブログ「Stat Editing for Staff」: https://gc.com/post/game-stats-and-stat-editing-available-on-web ）。

### 1.5 永続性
- 試合データ自体はアカウント/クラウド（gc.com）に同期され、再開・再編集が可能（Resume Scoring）。
- **Undo/Redo スタック自体がアプリ再起動を跨いで保持されるかは、公式資料で確認できなかった（未確認）**。

---

## 2. iScore Baseball/Softball

### 2.1 Undo
- **「Multilevel Undo/Redo」を公式機能として掲げている**：「Return to any point in the game, from the first play of the game to the last」（Google Play 公式ストア説明、2026-09 更新: https://play.google.com/store/apps/details?id=com.fasterthanmonkeys.iscore ）。
- **試合終了後でも Undo で間違えた地点まで戻り、そこから再記録できる**ことが公式 FAQ に明記：「you can use Undo back to the point in the game where you made the mistake (**even after the game is over**), and then rescore from that point forward」（iScore 公式 FAQ「How can I make edits after a game if I made a mistake while scoring?」: https://iscoresports.com/baseball/kb/faq_game/post_game_edits.php ）。
- **ハーフイニング跨ぎは公式マニュアルで実例付きで言及**：コールド/マーシールールで「前のイニング終了時点までロールバック」する用途に Undo を使う。ただし巻き戻したプレーの統計は残らない（iScore Reference Guide: https://cdn1.sportngin.com/attachments/document/f7a3-3123589/User_Manual__iScore_.pdf ）。
- Undo ボタンの**画面上の正確な配置・ラベルは、今回参照した公式資料では確認できなかった（未確認）**。

### 2.2 Redo / 進む
- ストア説明上は Undo と対で **Redo の存在が明記**されている（「Multilevel Undo/Redo」）。Redo の詳細仕様（新しい入力で破棄されるか等）は公式マニュアル/FAQ で確認できなかった（未確認）。

### 2.3 過去プレーの編集：Pitch by Pitch 編集
- **Game Manager → 試合 → Pitch by Pitch** で全投球が一覧表示され、**任意の投球行をタップして詳細を開き編集できる**。試合後の編集手段として公式 FAQ の第一選択肢（公式 FAQ、上記）。
- 編集できるもの：走者の進塁方法、安打⇔エラーの付け替え、交代の記録漏れの挿入、スタメン修正、得点した走者の修正など（公式 FAQ および User Manual v4.0: http://softball.dccssports.com/wp-content/uploads/2019/06/iScore-User-Manual-v4.0.pdf ）。
- **決定的な制約：結果の「帰結」が同じ変更しかできない**。マニュアル明記：「You can not change the outcome (i.e. you can not change an OUT to SAFE or a player that was SAFE to an OUT) because that could have cascading effects on the game and leave things in an inconsistent state.」**アウト⇔セーフの覆しは Pitch by Pitch 編集では不可能**で、その場合は Undo でその地点まで戻って再記録するしかない。
- 代替手段として**統計の直接上書き**（Game Manager → Batting Stats 等で数値をタップして上書き）も公式に用意されている（公式 FAQ）。
- フォーラムでは「打者をスキップした記録の事後削除は pitch by pitch 編集ではできない。完全に直すなら Undo で戻って再入力か試合の再記録が必要」という公式寄り回答もあり、編集機能の限界が実務上知られている（iScore Forum: http://iscoreforum.com/baseball/viewtopic.php?t=1670 ）。

### 2.4 判定訂正のワークフロー
- 公式 FAQ の訂正フローは階層的：①Pitch by Pitch 編集で直せるものはそこで直す → ②直せなければ Undo でその地点まで戻って再記録（試合終了後でも可）→ ③統計だけ合えばよいなら統計を直接上書き → ④最終手段として試合全体を再記録。
- 判定が覆るケース（アウト→セーフ）は ①では不可能なので、**必ず ②（Undo して再記録）になる**のが iScore の設計上の割り切り。

### 2.5 永続性
- 試合は端末内に保存され、Game Manager からいつでも開いて Pitch by Pitch 編集・Undo ができる（公式 FAQ が試合後の Undo を保証している以上、**Undo に必要な履歴は試合データと共に保持される**と読める）。ただし「アプリを強制終了/再起動した後も Undo スタックが残るか」の明文は未確認。
- Play by Play に**メモ（note）を追加**でき、訂正理由などを残せる（公式 FAQ）。

---

## 3. 踏襲すべきコンベンション（採用推奨リスト）

1. **Undo/Redo は記録画面の常時表示ボタンにする**（GameChanger：Field View 左下に Undo、隣に Redo）。メニューの奥に隠さない。
2. **Undo は複数ステップ・投球単位**が標準。iScore は「試合の最初から最後まで任意の地点に戻れる」ことを売り文句にしている。
3. **Redo はブラウザ式セマンティクス**：新しいプレーを入力した瞬間に Redo スタックを破棄し、その旨を明示する（GameChanger の公式警告文がそのまま仕様になる）。
4. **訂正手段を3層に分ける**（両アプリ共通の構造）：
   - 直近のミス → Undo
   - 過去のプレーの「帰結が同じ」修正（安打⇔エラー、選手の付け替え）→ プレーバイプレーから直接編集
   - 状態そのものの不整合 → Manual Override / 統計の直接上書きという逃げ道を用意し、**上書きした事実をプレーバイプレーに注記として残す**
5. **「帰結を変える編集」を過去プレー編集では禁止する**（iScore の OUT⇔SAFE 不可ルール）。覆しは Undo＋再記録に一本化する。GameChanger は結果変更を「同等グループ内」に限定列挙して許可。どちらか一方に寄せて仕様を明文化すべき論点。
6. **守備側の編集は後方伝播、攻撃側の編集は単一プレー**（GameChanger の波及ルール）。
7. **破壊的操作には二重確認**（GameChanger の「Swap Sides」は2回タップで確定し、プレーが消えることを明示）。
8. **ファイナライズ後も「再開して訂正→再ファイナライズ」を可能にする**（GameChanger の Resume Scoring、iScore の試合後 Undo）。ただし再開時の副作用は明示する。
9. **訂正理由のメモ欄**（iScore の play by play note）。
10. **Undo 後の再確認の促し**（リーグ向け指導資料の慣行）：Undo して再入力した直後に「カウント・アウト・打者・投手・走者・スコアを確認」と促す UX が現場教育で定着している。

### 未確認事項（要追加検証）
- 両アプリとも、**Undo/Redo スタックがアプリ再起動を跨いで保持されるか**の公式明文は見つからなかった。
- iScore の Undo/Redo ボタンの**正確な画面配置とラベル**。
- GameChanger の Undo が**イニングを跨いで連続使用できるか**の明文（仕組み上は可能なはずだが未確認）。
