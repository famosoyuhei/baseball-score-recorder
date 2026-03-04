// 多言語対応システム (i18n)
class I18n {
    constructor() {
        this.currentLanguage = localStorage.getItem('selectedLanguage') || this.detectBrowserLanguage();
        this.translations = {};
        this.loadTranslations();
        this.validateTranslations();
    }

    // ブラウザの言語設定を検出
    detectBrowserLanguage() {
        // ブラウザの言語設定を取得
        const browserLang = navigator.language || navigator.userLanguage;
        console.log('Browser language detected:', browserLang);

        // 言語コードを取得（例: "ja-JP" → "ja", "en-US" → "en"）
        const langCode = browserLang.toLowerCase().split(/[-_]/)[0];

        // 対応言語のマッピング
        const supportedLanguages = {
            'ja': 'ja',  // 日本語
            'en': 'en',  // 英語
            'es': 'es',  // スペイン語
            'pt': 'pt'   // ポルトガル語
        };

        // 対応言語があればそれを返す、なければ英語をデフォルトに
        const selectedLang = supportedLanguages[langCode] || 'en';
        console.log('Auto-selected language:', selectedLang);

        return selectedLang;
    }

    loadTranslations() {
        this.translations = {
            // 日本語 (Japanese)
            ja: {
                // 基本UI
                appTitle: '野球スコア記録アプリ',
                welcome: '野球スコア記録アプリへようこそ',
                description: 'オフラインで使用できる野球試合記録システムです',
                newGame: '新規試合',
                loadGame: '試合を読込',
                settings: '設定',
                startNewGame: '新しい試合を始める',
                recentPlays: '最近のプレー',
                noPlaysYet: 'まだプレーがありません',
                todayStats: '本日',
                battingAvg: '打率',
                onBaseAvg: '出塁率',
                rbi: '打点',
                pitchCount: '投球数',
                pitches: '球',
                strikeouts: '奪三振',
                walks: '与四球',
                hitsAllowed: '被安打',
                pitcherName: '投手名',

                // 機能一覧
                features: '機能',
                featureInning: '半イニングごとの記録',
                featureBatter: '打者ごとの詳細記録',
                featurePitch: '球ごとの詳細記録',
                featurePlayer: '選手情報管理',
                featureOffline: 'オフライン動作',

                // 試合設定
                gameSetup: '試合設定',
                homeTeam: 'ホームチーム名:',
                awayTeam: 'アウェイチーム名:',
                homeTeamPlaceholder: 'ホームチーム名を入力',
                awayTeamPlaceholder: 'アウェイチーム名を入力',
                recordingLevel: '記録レベル:',
                playerDetailLevel: '選手詳細レベル:',
                dhRule: 'DH制設定',
                dhEnabled: 'DH制あり（指名打者制・10人）',
                dhDisabled: 'DH制なし（9人）',
                back: '戻る',
                startGame: '試合開始',

                // 記録レベル
                recordingInning: '半イニングごと',
                recordingBatter: '打者ごと',
                recordingPitch: '球ごと',

                // 選手詳細レベル
                playerBasic: '基本（打順のみ）',
                playerStandard: '標準（打順・守備位置）',
                playerDetailed: '詳細（全情報・控え選手含む）',

                // 記録環境
                recordingMode: '記録環境:',
                benchMode: 'ベンチ記録（推奨）',
                tvMode: 'TV観戦記録',
                recordingModeHelp: 'ベンチ記録は簡素化された高速入力、TV観戦記録は詳細分析機能を含みます',

                // ベンチモード用UI
                ballButton: 'ボール',
                strikeButton: 'ストライク',
                hitButton: 'ヒット',
                outButton: 'アウト',
                walkButton: '四球',
                hbpButton: '死球',
                errorButton: 'エラー',
                outsCount: 'アウト',

                // 高度なプレー記録
                substitutionButton: '選手交代',
                stealButton: '盗塁',
                buntButton: 'バント',
                wildPitchButton: '暴投',
                pinchHit: '代打',
                pinchRun: '代走',
                defensive: '守備交代',
                pitcherChange: '投手交代',
                dhToPitcher: 'DH→投手転換',
                outPlayer: '退場選手',
                inPlayer: '入場選手',
                confirm: '実行',
                cancel: 'キャンセル',
                stealAttempt: '盗塁試行',
                stealRunner: '盗塁走者',
                stealTarget: '目標塁',
                stealSuccess: '盗塁成功',
                stealOut: '盗塁失敗',
                wildAdvance: '暴投進塁',

                // スコアブック
                standardScoreboard: '標準スコアボード',
                npbScorebook: '公式スコアブック(MLB方式)',
                playerNameColumn: '選手名',
                totalRow: '合計',

                // 選手登録画面
                playerRegistration: '選手登録',
                setBattingOrderInstructions: '試合開始前に打順を設定してください',
                playerNameOptional: '（選手名が分からない場合は空欄でも可）',
                dhRuleSetup: 'DH制設定',
                dhEnabled: 'DH制あり（指名打者制・10人）',
                dhDisabled: 'DH制なし（9人）',
                battingOrder: '打順',
                playerNamePlaceholder: '選手名（空欄可）',
                playerNameRequired: '選手名を入力',
                playerRegistrationComplete: '選手登録完了',
                playerRegistrationSuccess: '選手登録が完了しました',
                playerNumber: '番',
                position: '守備位置',

                // エラーメッセージ
                gameStartError: '試合の開始に失敗しました',
                playerRegistrationError: '選手登録に失敗しました',
                teamNameRequired: 'チーム名を入力してください',

                // ゲーム画面
                currentInning: '回',
                top: '表',
                bottom: '裏',
                outs: 'アウト',
                balls: 'ボール',
                strikes: 'ストライク',
                runnersSituation: '走者状況',
                awayTeam: 'アウェイ',
                homeTeam: 'ホーム',
                firstBase: '1塁',
                secondBase: '2塁',
                thirdBase: '3塁',
                homePlate: '本塁',
                runs: 'R',
                hits: 'H',
                errors: 'E',

                // 半イニング記録
                inningRecord: '半イニング記録',
                currentInningScore: '今回の得点',
                currentInningHits: '安打数',
                currentInningErrors: 'エラー数',
                points: '点',
                batting: '攻撃',
                fielding: '守備',
                inningHistory: 'イニング履歴',
                undo: '取消',
                endHalfInning: '攻撃終了',
                correct: '修正',
                notes: 'メモ',
                notesPlaceholder: '特記事項があれば記入',
                batter: '打者',

                // 守備位置
                pitcher: 'ピッチャー',
                catcher: 'キャッチャー',
                firstBase: 'ファースト',
                secondBase: 'セカンド',
                thirdBase: 'サード',
                shortStop: 'ショート',
                leftField: 'レフト',
                centerField: 'センター',
                rightField: 'ライト',
                designatedHitter: '指名打者',

                // 制御ボタン
                save: '保存',
                playerSubstitution: '選手交代',
                endGame: '試合終了',
                noNextInning: '次のイニングに進まない',
                forceGameEnd: '強制終了',
                showGameTime: '時刻確認',

                // 打撃結果
                single: '単打',
                double: '二塁打',
                triple: '三塁打',
                homerun: '本塁打',
                walk: '四球',
                strikeout: '三振',
                groundout: 'ゴロアウト',
                flyout: 'フライアウト',

                // メッセージ
                gameStarted: '試合を開始しました',
                gameSaved: '試合を保存しました',
                gameEnded: '試合を終了しました',
                error: 'エラーが発生しました',

                // 確認ダイアログ
                confirmEndGame: '試合を終了しますか？',
                confirmDeleteAtBat: 'この打席を削除してもよろしいですか？\n統計も自動的に再計算されます。',
                confirmNoNextInning: '現在の{inning}回{half}終了後、次のイニングに進まないよう設定しますか？\n（時刻制限・グラウンド使用時間等）',
                confirmForceEndGame: '試合を強制終了しますか？\n理由: {reason}',
                noReason: '理由なし',

                // アラートメッセージ (Alert messages)
                errorPrefix: 'エラー: ',
                selectStolenBaseRunner: '盗塁走者を選択してください',
                errorSelectResult: '結果を選択してください',

                // 共通UI
                result: '結果',
                confirm: '決定',
                cancel: 'キャンセル',
                runsScored: '得点',

                // 言語設定
                language: '言語',
                japanese: '日本語',
                english: 'English',
                spanish: 'Español',
                portuguese: 'Português',

                // 訂正機能
                atBatHistory: '打席履歴',
                noAtBatsYet: 'まだ打席がありません',
                edit: '訂正',
                delete: '削除',
                corrected: '訂正済',
                correctAtBat: '打席結果の訂正',
                currentResult: '現在の結果',
                newResult: '新しい結果',
                resultDetail: '詳細',
                rbis: '打点',
                battingOrderSuffix: '番',

                // 打者記録画面
                batterRecord: '打者記録',
                currentBatter: '現在の打者',
                batterInfoLoading: '打者情報読み込み中...',
                atBatResult: '打席結果',
                hitDirection: '打球方向・詳細:',
                hitDirectionPlaceholder: '例: センター前、ライト線',
                rbiLabel: '打点:',
                recordButton: '記録',
                correctPreviousAtBat: '前打席修正',
                back: '戻る',

                // 選手交代モーダル
                usePinchHitter: '代打を使用する',
                pinchHitterNamePlaceholder: '代打選手名',
                currentRunners: '現在の走者:',
                noRunnersOnBase: '現在走者はいません',
                pinchRunnerLabel: '代走',
                pinchRunnerNamePlaceholder: '代走選手名',
                executeButton: '実行',
                cancelButton: 'キャンセル',
                currentBatterLabel: '現在の打者:',
                noInfo: '情報なし',

                // クイック記録機能
                fillDetails: '詳細追記',
                incomplete: '要追記',
                quickRecord: 'クイック',
                fillAtBatDetails: '打席詳細の追記',
                currentInfo: '現在の情報',
                detailedDescription: '詳細説明',
                detailHelp: 'どのような状況だったかを記入してください',
                reminder: '確認',
                fillDetailReminder: '詳細を追記すると、「要追記」マークが消えます',

                // 選手情報編集機能
                playerList: '選手一覧',
                editPlayerInfo: '選手情報の編集',
                playerName: '選手名',
                playerNameHelp: '漢字の間違いなども修正できます',
                playerPosition: '守備位置',
                playerNumberLabel: '背番号',
                saveChanges: '変更を保存',
                playerUpdateSuccess: '選手情報を更新しました',
                playerUpdateError: '選手情報の更新に失敗しました',
                editPlayers: '選手情報編集',

                // 簡易スタメン登録
                quickLineupMode: '簡易登録モード',
                quickLineupHelp: '打順のみで試合を開始し、詳細は後から入力できます',
                startWithQuickLineup: '打順のみで開始',
                normalRegistration: '通常登録',
                incompletePlayerInfo: '未入力',
                playerDetailIncomplete: '詳細未入力',
                fillPlayerDetails: '詳細入力',
                incompletePlayers: '未入力の選手',
                noIncompletePlayers: '未入力の選手はいません',
                notSet: '未設定',

                // チーム情報編集
                editTeamInfo: 'チーム情報を編集',
                editTeamInfoTitle: 'チーム情報の編集',
                editTeamInfoHelp: '試合開始前であれば、チーム名と先攻後攻を変更できます',
                homeTeamNameLabel: 'ホームチーム名',
                awayTeamNameLabel: 'アウェイチーム名',
                swapTeams: 'ホーム/アウェイを入れ替え',
                cannotEditAfterStart: '試合が進行中のため、チーム情報は変更できません',

                // 選手交代関連
                substitutionModalTitle: '選手交代',
                offensiveSubstitution: '攻撃側選手交代',
                defensiveSubstitution: '守備側選手交代',
                pinchHitter: '代打',
                pinchRunner: '代走',
                pinchHitterDesc: '現在の打者を代打に交代します',
                pinchRunnerDesc: '現在の走者を代走に交代します',
                positionSwap: '守備位置交換',
                playerChange: '選手変更',
                substitutionExecuted: '選手交代を実行しました',
                substitutionFailed: '選手交代の実行に失敗しました',
                selectSubstitutionInfo: '選手交代の情報を選択してください',
                newPlayerName: '新しい選手名',
                targetTeam: '対象チーム',
                offense: '攻撃',
                defense: '守備',

                // 共通UI要素
                selectPlaceholder: '選択してください',
                firstBaseRunner: '1塁走者',
                secondBaseRunner: '2塁走者',
                thirdBaseRunner: '3塁走者',
                noPitchesYet: 'まだ投球がありません',
                benchPlayers: '控え選手',
                addBenchPlayer: '控え選手を追加',
                benchPlayerNamePlaceholder: '控え選手名',
                remove: '削除',
                detail: '詳細',

                // 走者状況表示 (Runner situation display)
                noRunners: '走者なし',
                basesLoaded: '満塁',
                basesSuffix: '塁',
                firstBaseKanji: '一',
                secondBaseKanji: '二',
                thirdBaseKanji: '三',

                // 打席結果名 (At-bat result names - used in realtime-ui.js)
                singleHit: '単打',
                doubleHit: '二塁打',
                tripleHit: '三塁打',
                homeRun: '本塁打',
                walkFourBalls: '四球',
                hitByPitchDead: '死球',
                strikeoutSwing: '三振',
                groundBall: 'ゴロ',
                flyBall: 'フライ',
                lineDrive: 'ライナー',
                sacrificeBunt: '犠打',
                sacrificeFly: '犠飛',
                doublePlayGround: '併殺',
                doublePlayFly: '飛併殺',
                errorPlay: 'エラー',
                runner: '走者',

                // 打席結果ボタン (At-bat result button labels)
                single: '単打',
                double: '二塁打',
                triple: '三塁打',
                homerun: '本塁打',
                single_error: '単打+エラー',
                double_error: '二塁打+エラー',
                triple_error: '三塁打+エラー',
                walk: '四球',
                intentional_walk: '敬遠',
                hit_by_pitch: '死球',
                sacrifice_bunt: '犠打',
                sacrifice_fly: '犠飛',
                strikeout: '三振',
                strikeout_swinging: '空振り三振',
                strikeout_looking: '見逃し三振',
                strikeout_passed_ball: '三振+振り逃げ',
                groundout: 'ゴロアウト',
                flyout: 'フライアウト',
                lineout: 'ライナーアウト',
                popout: 'ポップアウト',
                foulout: 'ファウルアウト',
                ground_double_play: 'ゴロ併殺',
                fly_double_play: 'フライ併殺',
                liner_double_play: 'ライナー併殺',
                ground_triple_play: 'ゴロ三重殺',
                fly_triple_play: 'フライ三重殺',
                liner_triple_play: 'ライナー三重殺',
                fielders_choice: 'フィルダースチョイス',
                reached_on_error: 'エラー出塁',
                infield_fly: 'インフィールドフライ',
                interference: '打撃妨害',
                obstruction: '走塁阻害',

                // 守備位置 (Position names)
                pos_P: 'ピッチャー',
                pos_C: 'キャッチャー',
                pos_1B: 'ファースト',
                pos_2B: 'セカンド',
                pos_3B: 'サード',
                pos_SS: 'ショート',
                pos_LF: 'レフト',
                pos_CF: 'センター',
                pos_RF: 'ライト',
                pos_DH: '指名打者',

                // 打席結果カテゴリ (At-bat result categories)
                hit_category: '安打',
                out_category: '凡退',
                walk_category: '四死球',
                sacrifice_category: '犠打・犠飛',
                error_category: 'エラー',
                double_play_category: '併殺',
                triple_play_category: '三重殺',
                special_category: 'その他',
                back_button: '戻る',

                // 走者プレーカテゴリ (Runner play categories)
                runner_play_category: '走者プレー',
                steal_category: '盗塁',
                pickoff_category: '牽制',
                wild_pitch_play: '暴投',
                passed_ball_play: '捕逸',
                pickoff_error_play: '牽制エラー',
                balk_play: 'ボーク',
                steal_success: '盗塁成功',
                steal_failure: '盗塁失敗',
                pickoff_safe: '牽制セーフ',
                pickoff_out: '牽制アウト',
                select_runner: '走者を選択',
                update_outs_runners: 'アウト・走者を更新',

                // エラータイプ (Error types)
                add_error: 'エラーを追加',
                error_type: 'エラーの種類',
                error_position: 'エラーした守備位置',
                fielding_error: '捕球エラー',
                throwing_error: '送球エラー',
                pickoff_throwing_error: '牽制悪送球',
                foul_fly_drop: 'ファウルフライ落球',
                passed_ball_error: '捕逸エラー',
                interference_error: '妨害エラー',
                select_error_position: '守備位置を選択してください',
                runner_advancement: '走者進塁',
                batter_runner_to: '打者走者 →',
                first_runner_to: '一塁走者 →',
                second_runner_to: '二塁走者 →',
                third_runner_to: '三塁走者 →',
                stays: '残塁',
                out_on_bases: '塁上アウト',
                scored: '得点',
                baseSuffix: '塁',
                selectPlaceholder: '選択してください'
            },

            // 英語 (English)
            en: {
                // 基本UI
                appTitle: 'Baseball Score Recording App',
                welcome: 'Welcome to Baseball Score Recording App',
                description: 'Offline baseball game recording system',
                newGame: 'New Game',
                loadGame: 'Load Game',
                settings: 'Settings',
                startNewGame: 'Start a New Game',

                // 機能一覧
                features: 'Features',
                featureInning: 'Per half inning recording',
                featureBatter: 'Detailed batter recording',
                featurePitch: 'Pitch-by-pitch recording',
                featurePlayer: 'Player information management',
                featureOffline: 'Offline operation',

                // 試合設定
                gameSetup: 'Game Setup',
                homeTeam: 'Home Team Name:',
                awayTeam: 'Away Team Name:',
                homeTeamPlaceholder: 'Enter home team name',
                awayTeamPlaceholder: 'Enter away team name',
                recordingLevel: 'Recording Level:',
                playerDetailLevel: 'Player Detail Level:',
                dhRule: 'DH Rule Setting',
                dhEnabled: 'DH Enabled (Designated Hitter, 10 players)',
                dhDisabled: 'DH Disabled (9 players)',
                back: 'Back',
                startGame: 'Start Game',

                // 記録レベル
                recordingInning: 'Per Half Inning',
                recordingBatter: 'Per Batter',
                recordingPitch: 'Per Pitch',

                // 選手詳細レベル
                playerBasic: 'Basic (Batting Order Only)',
                playerStandard: 'Standard (Batting Order & Positions)',
                playerDetailed: 'Detailed (Full Info & Bench Players)',

                // 記録環境
                recordingMode: 'Recording Environment:',
                benchMode: 'Bench Recording (Recommended)',
                tvMode: 'TV Viewing Recording',
                recordingModeHelp: 'Bench recording uses simplified high-speed input, TV viewing recording includes detailed analysis features',

                // ベンチモード用UI
                ballButton: 'Ball',
                strikeButton: 'Strike',
                hitButton: 'Hit',
                outButton: 'Out',
                walkButton: 'Walk',
                hbpButton: 'HBP',
                errorButton: 'Error',
                outsCount: 'Outs',

                // 高度なプレー記録
                substitutionButton: 'Substitution',
                stealButton: 'Steal',
                buntButton: 'Bunt',
                wildPitchButton: 'Wild Pitch',
                pinchHit: 'Pinch Hit',
                pinchRun: 'Pinch Run',
                defensive: 'Defensive Sub',
                pitcherChange: 'Pitcher Change',
                dhToPitcher: 'DH→Pitcher Conversion',
                outPlayer: 'Out Player',
                inPlayer: 'In Player',
                confirm: 'Confirm',
                cancel: 'Cancel',
                stealAttempt: 'Steal Attempt',
                stealRunner: 'Steal Runner',
                stealTarget: 'Target Base',
                stealSuccess: 'Steal Success',
                stealOut: 'Steal Out',
                wildAdvance: 'Wild Advance',

                // スコアブック
                standardScoreboard: 'Standard Scoreboard',
                npbScorebook: 'Official Scorebook (MLB Style)',
                playerNameColumn: 'Player Name',
                totalRow: 'Total',

                // 選手登録画面
                playerRegistration: 'Player Registration',
                setBattingOrderInstructions: 'Please set the batting order before starting the game',
                playerNameOptional: '(Player names can be left blank if unknown)',
                dhRuleSetup: 'DH Rule Setup',
                dhEnabled: 'DH Enabled (Designated Hitter, 10 players)',
                dhDisabled: 'DH Disabled (9 players)',
                battingOrder: 'Batting Order',
                playerNamePlaceholder: 'Player Name (Optional)',
                playerNameRequired: 'Enter player name',
                playerRegistrationComplete: 'Complete Player Registration',
                playerRegistrationSuccess: 'Player registration completed successfully',
                playerNumber: '',
                position: 'Position',

                // エラーメッセージ
                gameStartError: 'Failed to start the game',
                playerRegistrationError: 'Failed to register players',
                teamNameRequired: 'Please enter team names',

                // ゲーム画面
                currentInning: 'Inning',
                top: 'Top',
                bottom: 'Bottom',
                outs: 'Outs',
                balls: 'Balls',
                strikes: 'Strikes',
                runnersSituation: 'Runners Situation',
                awayTeam: 'Away',
                homeTeam: 'Home',
                firstBase: '1st Base',
                secondBase: '2nd Base',
                thirdBase: '3rd Base',
                homePlate: 'Home Plate',
                runs: 'R',
                hits: 'H',
                errors: 'E',

                // 半イニング記録
                inningRecord: 'Half Inning Record',
                currentInningScore: 'Current Inning Runs',
                currentInningHits: 'Hits',
                currentInningErrors: 'Errors',
                points: 'pts',
                batting: 'Batting',
                fielding: 'Fielding',
                inningHistory: 'Inning History',
                undo: 'Undo',
                endHalfInning: 'End Half Inning',
                correct: 'Correct',
                notes: 'Notes',
                notesPlaceholder: 'Enter special notes if any',
                batter: 'Batter',

                // 守備位置
                pitcher: 'Pitcher',
                catcher: 'Catcher',
                firstBase: 'First Base',
                secondBase: 'Second Base',
                thirdBase: 'Third Base',
                shortStop: 'Shortstop',
                leftField: 'Left Field',
                centerField: 'Center Field',
                rightField: 'Right Field',
                designatedHitter: 'Designated Hitter',

                // 制御ボタン
                save: 'Save',
                playerSubstitution: 'Player Substitution',
                endGame: 'End Game',
                noNextInning: 'No Next Inning',
                forceGameEnd: 'Force End',
                showGameTime: 'Show Game Time',

                // 打撃結果
                single: 'Single',
                double: 'Double',
                triple: 'Triple',
                homerun: 'Home Run',
                walk: 'Walk',
                strikeout: 'Strikeout',
                groundout: 'Groundout',
                flyout: 'Flyout',

                // 打者情報表示
                todayStats: 'Today',
                battingAvg: 'AVG',
                onBaseAvg: 'OBP',
                rbi: 'RBI',
                recentPlays: 'Recent Plays',
                noPlaysYet: 'No plays yet',
                pitcherName: 'Pitcher Name',

                // メッセージ
                gameStarted: 'Game started',
                gameSaved: 'Game saved',
                gameEnded: 'Game ended',
                error: 'An error occurred',

                // 確認ダイアログ
                confirmEndGame: 'Do you want to end the game?',
                confirmDeleteAtBat: 'Are you sure you want to delete this at-bat?\nStatistics will be automatically recalculated.',
                confirmNoNextInning: 'Do you want to prevent advancing to the next inning after the current {half} of inning {inning}?\n(Time limit, field usage time, etc.)',
                confirmForceEndGame: 'Do you want to force end the game?\nReason: {reason}',
                noReason: 'No reason',

                // Alert messages
                errorPrefix: 'Error: ',
                selectStolenBaseRunner: 'Please select a runner for stolen base',
                errorSelectResult: 'Please select a result',

                // 共通UI
                result: 'Result',
                confirm: 'Confirm',
                cancel: 'Cancel',
                runsScored: 'Runs Scored',

                // 言語設定
                language: 'Language',
                japanese: '日本語',
                english: 'English',
                spanish: 'Español',
                portuguese: 'Português',

                // 訂正機能
                atBatHistory: 'At-Bat History',
                noAtBatsYet: 'No at-bats yet',
                edit: 'Edit',
                delete: 'Delete',
                corrected: 'Corrected',
                correctAtBat: 'Correct At-Bat Result',
                currentResult: 'Current Result',
                newResult: 'New Result',
                resultDetail: 'Details',
                rbis: 'RBIs',
                battingOrderSuffix: '',

                // 打者記録画面
                batterRecord: 'Batter Record',
                currentBatter: 'Current Batter',
                batterInfoLoading: 'Loading batter info...',
                atBatResult: 'At-Bat Result',
                hitDirection: 'Hit Direction/Details:',
                hitDirectionPlaceholder: 'e.g., Center, Right field line',
                rbiLabel: 'RBIs:',
                recordButton: 'Record',
                correctPreviousAtBat: 'Correct Previous At-Bat',
                back: 'Back',

                // 選手交代モーダル
                usePinchHitter: 'Use Pinch Hitter',
                pinchHitterNamePlaceholder: 'Pinch hitter name',
                currentRunners: 'Current Runners:',
                noRunnersOnBase: 'No runners on base',
                pinchRunnerLabel: 'Pinch Runner',
                pinchRunnerNamePlaceholder: 'Pinch runner name',
                executeButton: 'Execute',
                cancelButton: 'Cancel',
                currentBatterLabel: 'Current Batter:',
                noInfo: 'No info',

                // クイック記録機能
                fillDetails: 'Fill Details',
                incomplete: 'Incomplete',
                quickRecord: 'Quick',
                fillAtBatDetails: 'Fill At-Bat Details',
                currentInfo: 'Current Information',
                detailedDescription: 'Detailed Description',
                detailHelp: 'Please describe what happened',
                reminder: 'Note',
                fillDetailReminder: 'After filling details, the "Incomplete" mark will be removed',

                // 選手情報編集機能
                playerList: 'Player List',
                editPlayerInfo: 'Edit Player Information',
                playerName: 'Player Name',
                playerNameHelp: 'You can fix kanji mistakes and other errors',
                playerPosition: 'Position',
                playerNumberLabel: 'Number',
                saveChanges: 'Save Changes',
                playerUpdateSuccess: 'Player information updated',
                playerUpdateError: 'Failed to update player information',
                editPlayers: 'Edit Players',

                // 簡易スタメン登録
                quickLineupMode: 'Quick Registration Mode',
                quickLineupHelp: 'Start game with batting order only, fill details later',
                startWithQuickLineup: 'Start with Order Only',
                normalRegistration: 'Normal Registration',
                incompletePlayerInfo: 'Incomplete',
                playerDetailIncomplete: 'Details Missing',
                fillPlayerDetails: 'Fill Details',
                incompletePlayers: 'Incomplete Players',
                noIncompletePlayers: 'No incomplete players',
                notSet: 'Not Set',

                // Team Info Edit
                editTeamInfo: 'Edit Team Info',
                editTeamInfoTitle: 'Edit Team Information',
                editTeamInfoHelp: 'You can change team names and home/away before the game starts',
                homeTeamNameLabel: 'Home Team Name',
                awayTeamNameLabel: 'Away Team Name',
                swapTeams: 'Swap Home/Away',
                cannotEditAfterStart: 'Cannot edit team information after game has started',

                // Substitution
                substitutionModalTitle: 'Player Substitution',
                offensiveSubstitution: 'Offensive Substitution',
                defensiveSubstitution: 'Defensive Substitution',
                pinchHitter: 'Pinch Hitter',
                pinchRunner: 'Pinch Runner',
                pinchHitterDesc: 'Substitute current batter with a pinch hitter',
                pinchRunnerDesc: 'Substitute current runner with a pinch runner',
                positionSwap: 'Position Swap',
                playerChange: 'Player Change',
                substitutionExecuted: 'Substitution executed successfully',
                substitutionFailed: 'Failed to execute substitution',
                selectSubstitutionInfo: 'Please select substitution information',
                newPlayerName: 'New player name',
                targetTeam: 'Target Team',
                offense: 'Offense',
                defense: 'Defense',

                // Runner situation display
                noRunners: 'No runners',
                basesLoaded: 'Bases loaded',
                basesSuffix: ' base',
                firstBaseKanji: '1st',
                secondBaseKanji: '2nd',
                thirdBaseKanji: '3rd',

                // At-bat result names
                singleHit: 'Single',
                doubleHit: 'Double',
                tripleHit: 'Triple',
                homeRun: 'Home Run',
                walkFourBalls: 'Walk',
                hitByPitchDead: 'Hit by Pitch',
                strikeoutSwing: 'Strikeout',
                groundBall: 'Groundout',
                flyBall: 'Flyout',
                lineDrive: 'Lineout',
                sacrificeBunt: 'Sacrifice Bunt',
                sacrificeFly: 'Sacrifice Fly',
                doublePlayGround: 'Double Play',
                doublePlayFly: 'Fly Double Play',
                errorPlay: 'Error',
                runner: 'Runner',

                // At-bat result button labels
                single: 'Single',
                double: 'Double',
                triple: 'Triple',
                homerun: 'Home Run',
                single_error: 'Single + Error',
                double_error: 'Double + Error',
                triple_error: 'Triple + Error',
                walk: 'Walk',
                intentional_walk: 'Intentional Walk',
                hit_by_pitch: 'Hit by Pitch',
                sacrifice_bunt: 'Sacrifice Bunt',
                sacrifice_fly: 'Sacrifice Fly',
                strikeout: 'Strikeout',
                strikeout_swinging: 'Strikeout Swinging',
                strikeout_looking: 'Strikeout Looking',
                strikeout_passed_ball: 'Strikeout + Passed Ball',
                groundout: 'Groundout',
                flyout: 'Flyout',
                lineout: 'Lineout',
                popout: 'Popout',
                foulout: 'Foul Out',
                ground_double_play: 'Ground Double Play',
                fly_double_play: 'Fly Double Play',
                liner_double_play: 'Liner Double Play',
                ground_triple_play: 'Ground Triple Play',
                fly_triple_play: 'Fly Triple Play',
                liner_triple_play: 'Liner Triple Play',
                fielders_choice: 'Fielder\'s Choice',
                reached_on_error: 'Reached on Error',
                infield_fly: 'Infield Fly',
                interference: 'Interference',
                obstruction: 'Obstruction',

                // Position names
                pos_P: 'Pitcher',
                pos_C: 'Catcher',
                pos_1B: '1st Base',
                pos_2B: '2nd Base',
                pos_3B: '3rd Base',
                pos_SS: 'Shortstop',
                pos_LF: 'Left Field',
                pos_CF: 'Center Field',
                pos_RF: 'Right Field',
                pos_DH: 'Designated Hitter',

                // At-bat result categories
                hit_category: 'Hit',
                out_category: 'Out',
                walk_category: 'Walk',
                sacrifice_category: 'Sacrifice',
                error_category: 'Error',
                double_play_category: 'Double Play',
                triple_play_category: 'Triple Play',
                special_category: 'Other',
                back_button: 'Back',

                // Runner play categories
                runner_play_category: 'Runner Play',
                steal_category: 'Steal',
                pickoff_category: 'Pickoff',
                wild_pitch_play: 'Wild Pitch',
                passed_ball_play: 'Passed Ball',
                pickoff_error_play: 'Pickoff Error',
                balk_play: 'Balk',
                steal_success: 'Stolen Base',
                steal_failure: 'Caught Stealing',
                pickoff_safe: 'Pickoff Safe',
                pickoff_out: 'Picked Off',
                select_runner: 'Select Runner',
                update_outs_runners: 'Update Outs & Runners',

                // Error types
                add_error: 'Add Error',
                error_type: 'Error Type',
                error_position: 'Fielding Position with Error',
                fielding_error: 'Fielding Error',
                throwing_error: 'Throwing Error',
                pickoff_throwing_error: 'Pickoff Throwing Error',
                foul_fly_drop: 'Foul Fly Dropped',
                passed_ball_error: 'Passed Ball Error',
                interference_error: 'Interference Error',
                select_error_position: 'Please select fielding position',
                runner_advancement: 'Runner Advancement',
                batter_runner_to: 'Batter-Runner →',
                first_runner_to: '1st Base Runner →',
                second_runner_to: '2nd Base Runner →',
                third_runner_to: '3rd Base Runner →',
                stays: 'Stays',
                out_on_bases: 'Out on Bases',
                scored: 'Scored',
                baseSuffix: 'B',

                // Common UI
                selectPlaceholder: 'Please select',
                firstBaseRunner: '1st Base Runner',
                secondBaseRunner: '2nd Base Runner',
                thirdBaseRunner: '3rd Base Runner',
                noPitchesYet: 'No pitches yet',
                benchPlayers: 'Bench Players',
                addBenchPlayer: 'Add Bench Player',
                benchPlayerNamePlaceholder: 'Bench player name',
                remove: 'Remove',
                detail: 'Detail'
            },

            // スペイン語 (Spanish)
            es: {
                // 基本UI
                appTitle: 'Aplicación de Registro de Béisbol',
                welcome: 'Bienvenido a la Aplicación de Registro de Béisbol',
                description: 'Sistema de registro de juegos de béisbol sin conexión',
                newGame: 'Nuevo Juego',
                loadGame: 'Cargar Juego',
                settings: 'Configuración',
                startNewGame: 'Iniciar un Nuevo Juego',

                // 機能一覧
                features: 'Características',
                featureInning: 'Registro por media entrada',
                featureBatter: 'Registro detallado del bateador',
                featurePitch: 'Registro lanzamiento por lanzamiento',
                featurePlayer: 'Gestión de información del jugador',
                featureOffline: 'Operación sin conexión',

                // 試合設定
                gameSetup: 'Configuración del Juego',
                homeTeam: 'Nombre del Equipo Local:',
                awayTeam: 'Nombre del Equipo Visitante:',
                homeTeamPlaceholder: 'Ingrese el nombre del equipo local',
                awayTeamPlaceholder: 'Ingrese el nombre del equipo visitante',
                recordingLevel: 'Nivel de Registro:',
                playerDetailLevel: 'Nivel de Detalle del Jugador:',
                dhRule: 'Configuración de Regla DH',
                dhEnabled: 'DH Habilitado (Bateador Designado, 10 jugadores)',
                dhDisabled: 'DH Deshabilitado (9 jugadores)',
                back: 'Volver',
                startGame: 'Iniciar Juego',

                // 記録レベル
                recordingInning: 'Por Media Entrada',
                recordingBatter: 'Por Bateador',
                recordingPitch: 'Por Lanzamiento',

                // 選手詳細レベル
                playerBasic: 'Básico (Solo Orden de Bateo)',
                playerStandard: 'Estándar (Orden de Bateo y Posiciones)',
                playerDetailed: 'Detallado (Info Completa y Jugadores de Banca)',

                // 記録環境
                recordingMode: 'Entorno de Registro:',
                benchMode: 'Registro desde el Banquillo (Recomendado)',
                tvMode: 'Registro viendo TV',
                recordingModeHelp: 'El registro desde el banquillo usa entrada rápida simplificada, el registro viendo TV incluye funciones de análisis detallado',

                // スコアブック
                standardScoreboard: 'Marcador Estándar',
                npbScorebook: 'Libro de Puntuación Oficial (Estilo MLB)',
                playerNameColumn: 'Nombre del Jugador',
                totalRow: 'Total',

                // 選手登録画面
                playerRegistration: 'Registro de Jugadores',
                setBattingOrderInstructions: 'Por favor establezca el orden de bateo antes de iniciar el juego',
                playerNameOptional: '(Los nombres de jugadores pueden dejarse en blanco si se desconocen)',
                dhRuleSetup: 'Configuración de Regla DH',
                dhEnabled: 'DH Habilitado (Bateador Designado, 10 jugadores)',
                dhDisabled: 'DH Deshabilitado (9 jugadores)',
                battingOrder: 'Orden de Bateo',
                playerNamePlaceholder: 'Nombre del Jugador (Opcional)',
                playerNameRequired: 'Ingrese el nombre del jugador',
                playerRegistrationComplete: 'Completar Registro de Jugadores',
                playerRegistrationSuccess: 'Registro de jugadores completado exitosamente',
                playerNumber: '',
                position: 'Posición',

                // エラーメッセージ
                gameStartError: 'Error al iniciar el juego',
                playerRegistrationError: 'Error al registrar jugadores',
                teamNameRequired: 'Por favor ingrese los nombres de los equipos',

                // ゲーム画面
                currentInning: 'Entrada',
                top: 'Alta',
                bottom: 'Baja',
                outs: 'Eliminados',
                balls: 'Bolas',
                strikes: 'Strikes',
                runnersSituation: 'Situación de Corredores',
                awayTeam: 'Visitante',
                homeTeam: 'Local',
                firstBase: '1ª Base',
                secondBase: '2ª Base',
                thirdBase: '3ª Base',
                homePlate: 'Home',
                runs: 'C',
                hits: 'H',
                errors: 'E',

                // 半イニング記録
                inningRecord: 'Registro de Media Entrada',
                currentInningScore: 'Carreras de Esta Entrada',
                currentInningHits: 'Hits',
                currentInningErrors: 'Errores',
                points: 'pts',
                batting: 'Bateando',
                fielding: 'Fildeo',
                inningHistory: 'Historial de Entradas',
                undo: 'Deshacer',
                endHalfInning: 'Terminar Media Entrada',
                correct: 'Corregir',
                notes: 'Notas',
                notesPlaceholder: 'Ingrese notas especiales si las hay',
                batter: 'Bateador',

                // 守備位置
                pitcher: 'Lanzador',
                catcher: 'Receptor',
                firstBase: 'Primera Base',
                secondBase: 'Segunda Base',
                thirdBase: 'Tercera Base',
                shortStop: 'Campo Corto',
                leftField: 'Campo Izquierdo',
                centerField: 'Campo Central',
                rightField: 'Campo Derecho',
                designatedHitter: 'Bateador Designado',

                // 制御ボタン
                save: 'Guardar',
                playerSubstitution: 'Sustitución de Jugador',
                endGame: 'Terminar Juego',
                noNextInning: 'No Próxima Entrada',
                forceGameEnd: 'Forzar Fin',
                showGameTime: 'Mostrar Tiempo de Juego',

                // 打撃結果
                single: 'Sencillo',
                double: 'Doble',
                triple: 'Triple',
                homerun: 'Jonrón',
                walk: 'Base por Bolas',
                strikeout: 'Ponche',
                groundout: 'Out por Roletazo',
                flyout: 'Out por Elevado',

                // 打者情報表示
                todayStats: 'Hoy',
                battingAvg: 'AVE',
                onBaseAvg: 'OBP',
                rbi: 'CI',
                recentPlays: 'Jugadas Recientes',
                noPlaysYet: 'Aún no hay jugadas',
                pitcherName: 'Nombre del Lanzador',

                // メッセージ
                gameStarted: 'Juego iniciado',
                gameSaved: 'Juego guardado',
                gameEnded: 'Juego terminado',
                error: 'Ocurrió un error',

                // 確認ダイアログ
                confirmEndGame: '¿Desea terminar el juego?',
                confirmDeleteAtBat: '¿Está seguro de que desea eliminar este turno al bate?\nLas estadísticas se recalcularán automáticamente.',
                confirmNoNextInning: '¿Desea evitar avanzar a la próxima entrada después del {half} actual de la entrada {inning}?\n(Límite de tiempo, tiempo de uso del campo, etc.)',
                confirmForceEndGame: '¿Desea forzar el final del juego?\nRazón: {reason}',
                noReason: 'Sin razón',

                // Alert messages
                errorPrefix: 'Error: ',
                selectStolenBaseRunner: 'Por favor seleccione un corredor para base robada',
                errorSelectResult: 'Por favor seleccione un resultado',

                // 共通UI
                result: 'Resultado',
                confirm: 'Confirmar',
                cancel: 'Cancelar',
                runsScored: 'Carreras Anotadas',

                // 言語設定
                language: 'Idioma',
                japanese: '日本語',
                english: 'English',
                spanish: 'Español',
                portuguese: 'Português',

                // 訂正機能
                atBatHistory: 'Historial de Turnos al Bate',
                noAtBatsYet: 'Aún no hay turnos al bate',
                edit: 'Editar',
                delete: 'Eliminar',
                corrected: 'Corregido',
                correctAtBat: 'Corregir Resultado del Turno',
                currentResult: 'Resultado Actual',
                newResult: 'Nuevo Resultado',
                resultDetail: 'Detalles',
                rbis: 'Carreras Impulsadas',
                battingOrderSuffix: 'º',

                // 打者記録画面
                batterRecord: 'Registro del Bateador',
                currentBatter: 'Bateador Actual',
                batterInfoLoading: 'Cargando información del bateador...',
                atBatResult: 'Resultado del Turno',
                hitDirection: 'Dirección del Bateo/Detalles:',
                hitDirectionPlaceholder: 'ej: Centro, Línea de derecha',
                rbiLabel: 'Carreras Impulsadas:',
                recordButton: 'Registrar',
                correctPreviousAtBat: 'Corregir Turno Anterior',
                back: 'Volver',

                // 選手交代モーダル
                usePinchHitter: 'Usar Bateador Emergente',
                pinchHitterNamePlaceholder: 'Nombre del bateador emergente',
                currentRunners: 'Corredores Actuales:',
                noRunnersOnBase: 'No hay corredores en base',
                pinchRunnerLabel: 'Corredor Emergente',
                pinchRunnerNamePlaceholder: 'Nombre del corredor emergente',
                executeButton: 'Ejecutar',
                cancelButton: 'Cancelar',
                currentBatterLabel: 'Bateador Actual:',
                noInfo: 'Sin información',

                // クイック記録機能
                fillDetails: 'Completar Detalles',
                incomplete: 'Incompleto',
                quickRecord: 'Rápido',
                fillAtBatDetails: 'Completar Detalles del Turno',
                currentInfo: 'Información Actual',
                detailedDescription: 'Descripción Detallada',
                detailHelp: 'Por favor describa lo que ocurrió',
                reminder: 'Nota',
                fillDetailReminder: 'Después de completar los detalles, la marca "Incompleto" se eliminará',

                // 選手情報編集機能
                playerList: 'Lista de Jugadores',
                editPlayerInfo: 'Editar Información del Jugador',
                playerName: 'Nombre del Jugador',
                playerNameHelp: 'Puede corregir errores de kanji y otros errores',
                playerPosition: 'Posición',
                playerNumberLabel: 'Número',
                saveChanges: 'Guardar Cambios',
                playerUpdateSuccess: 'Información del jugador actualizada',
                playerUpdateError: 'Error al actualizar información del jugador',
                editPlayers: 'Editar Jugadores',

                // 簡易スタメン登録
                quickLineupMode: 'Modo de Registro Rápido',
                quickLineupHelp: 'Comience el juego solo con el orden de bateo, complete los detalles más tarde',
                startWithQuickLineup: 'Comenzar Solo con Orden',
                normalRegistration: 'Registro Normal',
                incompletePlayerInfo: 'Incompleto',
                playerDetailIncomplete: 'Detalles Faltantes',
                fillPlayerDetails: 'Completar Detalles',
                incompletePlayers: 'Jugadores Incompletos',
                noIncompletePlayers: 'No hay jugadores incompletos',
                notSet: 'No Configurado',

                // Edición de Información del Equipo
                editTeamInfo: 'Editar Info del Equipo',
                editTeamInfoTitle: 'Editar Información del Equipo',
                editTeamInfoHelp: 'Puede cambiar nombres y local/visitante antes del inicio',
                homeTeamNameLabel: 'Nombre del Equipo Local',
                awayTeamNameLabel: 'Nombre del Equipo Visitante',
                swapTeams: 'Intercambiar Local/Visitante',
                cannotEditAfterStart: 'No se puede editar después del inicio del juego',

                // Substitution
                substitutionModalTitle: 'Sustitución de Jugador',
                offensiveSubstitution: 'Sustitución Ofensiva',
                defensiveSubstitution: 'Sustitución Defensiva',
                pinchHitter: 'Bateador Emergente',
                pinchRunner: 'Corredor Emergente',
                positionSwap: 'Intercambio de Posición',
                playerChange: 'Cambio de Jugador',
                substitutionExecuted: 'Sustitución ejecutada con éxito',
                substitutionFailed: 'Error al ejecutar la sustitución',
                selectSubstitutionInfo: 'Por favor seleccione información de sustitución',
                newPlayerName: 'Nombre del nuevo jugador',

                // Common UI
                selectPlaceholder: 'Por favor seleccione',
                firstBaseRunner: 'Corredor en 1ra Base',
                secondBaseRunner: 'Corredor en 2da Base',
                thirdBaseRunner: 'Corredor en 3ra Base',
                noPitchesYet: 'Aún no hay lanzamientos',
                benchPlayers: 'Jugadores de Banca',
                addBenchPlayer: 'Agregar Jugador de Banca',
                benchPlayerNamePlaceholder: 'Nombre del jugador de banca',
                remove: 'Eliminar',
                detail: 'Detalle',

                // Runner situation display
                noRunners: 'Sin corredores',
                basesLoaded: 'Bases llenas',
                basesSuffix: ' base',
                firstBaseKanji: '1ra',
                secondBaseKanji: '2da',
                thirdBaseKanji: '3ra',

                // At-bat result names
                singleHit: 'Sencillo',
                doubleHit: 'Doble',
                tripleHit: 'Triple',
                homeRun: 'Jonrón',
                walkFourBalls: 'Base por Bolas',
                hitByPitchDead: 'Golpeado por Lanzamiento',
                strikeoutSwing: 'Ponche',
                groundBall: 'Roletazo',
                flyBall: 'Elevado',
                lineDrive: 'Línea',
                sacrificeBunt: 'Toque de Sacrificio',
                sacrificeFly: 'Elevado de Sacrificio',
                doublePlayGround: 'Doble Play',
                doublePlayFly: 'Doble Play al Vuelo',
                errorPlay: 'Error',
                runner: 'Corredor',

                // At-bat result button labels
                single: 'Sencillo',
                double: 'Doble',
                triple: 'Triple',
                homerun: 'Jonrón',
                single_error: 'Sencillo + Error',
                double_error: 'Doble + Error',
                triple_error: 'Triple + Error',
                walk: 'Base por Bolas',
                intentional_walk: 'Base Intencional',
                hit_by_pitch: 'Golpeado por Lanzamiento',
                sacrifice_bunt: 'Toque de Sacrificio',
                sacrifice_fly: 'Elevado de Sacrificio',
                strikeout: 'Ponche',
                strikeout_swinging: 'Ponche por Abanico',
                strikeout_looking: 'Ponche Mirando',
                strikeout_passed_ball: 'Ponche + Bola Pasada',
                groundout: 'Out por Roletazo',
                flyout: 'Out por Elevado',
                lineout: 'Out por Línea',
                popout: 'Out por Elevado Corto',
                foulout: 'Out por Foul',
                ground_double_play: 'Doble Play por Roletazo',
                fly_double_play: 'Doble Play por Elevado',
                liner_double_play: 'Doble Play por Línea',
                ground_triple_play: 'Triple Play por Roletazo',
                fly_triple_play: 'Triple Play por Elevado',
                liner_triple_play: 'Triple Play por Línea',
                fielders_choice: 'Elección del Fildeador',
                reached_on_error: 'Llegó por Error',
                infield_fly: 'Elevado de Cuadro',
                interference: 'Interferencia',
                obstruction: 'Obstrucción',

                // Position names
                pos_P: 'Lanzador',
                pos_C: 'Receptor',
                pos_1B: '1ra Base',
                pos_2B: '2da Base',
                pos_3B: '3ra Base',
                pos_SS: 'Campocorto',
                pos_LF: 'Jardinero Izquierdo',
                pos_CF: 'Jardinero Central',
                pos_RF: 'Jardinero Derecho',
                pos_DH: 'Bateador Designado',

                // At-bat result categories
                hit_category: 'Hit',
                out_category: 'Out',
                walk_category: 'Base por Bolas',
                sacrifice_category: 'Sacrificio',
                error_category: 'Error',
                double_play_category: 'Doble Play',
                triple_play_category: 'Triple Play',
                special_category: 'Otro',
                back_button: 'Volver',

                // Runner play categories
                runner_play_category: 'Jugada de Corredor',
                steal_category: 'Robo de Base',
                pickoff_category: 'Pickoff',
                wild_pitch_play: 'Lanzamiento Salvaje',
                passed_ball_play: 'Bola Pasada',
                pickoff_error_play: 'Error en Pickoff',
                balk_play: 'Balk',
                steal_success: 'Base Robada',
                steal_failure: 'Atrapado Robando',
                pickoff_safe: 'Pickoff Seguro',
                pickoff_out: 'Pickoff Out',
                select_runner: 'Seleccionar Corredor',
                update_outs_runners: 'Actualizar Outs y Corredores',

                // Error types
                add_error: 'Agregar Error',
                error_type: 'Tipo de Error',
                error_position: 'Posición Defensiva con Error',
                fielding_error: 'Error de Fildeo',
                throwing_error: 'Error de Lanzamiento',
                pickoff_throwing_error: 'Error de Lanzamiento en Pickoff',
                foul_fly_drop: 'Foul Fly Caído',
                passed_ball_error: 'Error de Bola Pasada',
                interference_error: 'Error de Interferencia',
                select_error_position: 'Por favor seleccione la posición defensiva',
                runner_advancement: 'Avance de Corredores',
                batter_runner_to: 'Bateador-Corredor →',
                first_runner_to: 'Corredor de 1ra Base →',
                second_runner_to: 'Corredor de 2da Base →',
                third_runner_to: 'Corredor de 3ra Base →',
                stays: 'Permanece',
                out_on_bases: 'Out en Bases',
                scored: 'Anotó',
                baseSuffix: 'B',
                selectPlaceholder: 'Por favor seleccione'
            },

            // ポルトガル語 (Portuguese)
            pt: {
                // 基本UI
                appTitle: 'Aplicativo de Registro de Beisebol',
                welcome: 'Bem-vindo ao Aplicativo de Registro de Beisebol',
                description: 'Sistema de registro de jogos de beisebol offline',
                newGame: 'Novo Jogo',
                loadGame: 'Carregar Jogo',
                settings: 'Configurações',
                startNewGame: 'Iniciar um Novo Jogo',

                // 機能一覧
                features: 'Recursos',
                featureInning: 'Registro por meia entrada',
                featureBatter: 'Registro detalhado do rebatedor',
                featurePitch: 'Registro arremesso por arremesso',
                featurePlayer: 'Gerenciamento de informações do jogador',
                featureOffline: 'Operação offline',

                // 試合設定
                gameSetup: 'Configuração do Jogo',
                homeTeam: 'Nome da Equipe da Casa:',
                awayTeam: 'Nome da Equipe Visitante:',
                homeTeamPlaceholder: 'Digite o nome da equipe da casa',
                awayTeamPlaceholder: 'Digite o nome da equipe visitante',
                recordingLevel: 'Nível de Registro:',
                playerDetailLevel: 'Nível de Detalhes do Jogador:',
                dhRule: 'Configuração da Regra DH',
                dhEnabled: 'DH Habilitado (Rebatedor Designado, 10 jogadores)',
                dhDisabled: 'DH Desabilitado (9 jogadores)',
                back: 'Voltar',
                startGame: 'Iniciar Jogo',

                // 記録レベル
                recordingInning: 'Por Meia Entrada',
                recordingBatter: 'Por Rebatedor',
                recordingPitch: 'Por Arremesso',

                // 選手詳細レベル
                playerBasic: 'Básico (Apenas Ordem de Rebatida)',
                playerStandard: 'Padrão (Ordem de Rebatida e Posições)',
                playerDetailed: 'Detalhado (Info Completa e Jogadores Reservas)',

                // 記録環境
                recordingMode: 'Ambiente de Registro:',
                benchMode: 'Registro do Banco (Recomendado)',
                tvMode: 'Registro Assistindo TV',
                recordingModeHelp: 'O registro do banco usa entrada rápida simplificada, o registro assistindo TV inclui recursos de análise detalhada',

                // スコアブック
                standardScoreboard: 'Placar Padrão',
                npbScorebook: 'Livro de Pontuação Oficial (Estilo MLB)',
                playerNameColumn: 'Nome do Jogador',
                totalRow: 'Total',

                // 選手登録画面
                playerRegistration: 'Registro de Jogadores',
                setBattingOrderInstructions: 'Por favor, defina a ordem de rebatida antes de iniciar o jogo',
                playerNameOptional: '(Nomes dos jogadores podem ficar em branco se desconhecidos)',
                dhRuleSetup: 'Configuração da Regra DH',
                dhEnabled: 'DH Habilitado (Rebatedor Designado, 10 jogadores)',
                dhDisabled: 'DH Desabilitado (9 jogadores)',
                battingOrder: 'Ordem de Rebatida',
                playerNamePlaceholder: 'Nome do Jogador (Opcional)',
                playerNameRequired: 'Digite o nome do jogador',
                playerRegistrationComplete: 'Completar Registro de Jogadores',
                playerRegistrationSuccess: 'Registro de jogadores concluído com sucesso',
                playerNumber: '',
                position: 'Posição',

                // エラーメッセージ
                gameStartError: 'Falha ao iniciar o jogo',
                playerRegistrationError: 'Falha ao registrar jogadores',
                teamNameRequired: 'Por favor, digite os nomes das equipes',

                // ゲーム画面
                currentInning: 'Entrada',
                top: 'Primeira',
                bottom: 'Segunda',
                outs: 'Eliminações',
                balls: 'Bolas',
                strikes: 'Strikes',
                runnersSituation: 'Situação dos Corredores',
                awayTeam: 'Visitante',
                homeTeam: 'Casa',
                firstBase: '1ª Base',
                secondBase: '2ª Base',
                thirdBase: '3ª Base',
                homePlate: 'Casa',
                runs: 'C',
                hits: 'H',
                errors: 'E',

                // 半イニング記録
                inningRecord: 'Registro de Meia Entrada',
                currentInningScore: 'Corridas desta Entrada',
                currentInningHits: 'Rebatidas',
                currentInningErrors: 'Erros',
                points: 'pts',
                batting: 'Rebatendo',
                fielding: 'Defesa',
                inningHistory: 'Histórico de Entradas',
                undo: 'Desfazer',
                endHalfInning: 'Terminar Meia Entrada',
                correct: 'Corrigir',
                notes: 'Notas',
                notesPlaceholder: 'Digite notas especiais se houver',
                batter: 'Rebatedor',

                // 守備位置
                pitcher: 'Arremessador',
                catcher: 'Receptor',
                firstBase: 'Primeira Base',
                secondBase: 'Segunda Base',
                thirdBase: 'Terceira Base',
                shortStop: 'Shortstop',
                leftField: 'Campo Esquerdo',
                centerField: 'Campo Central',
                rightField: 'Campo Direito',
                designatedHitter: 'Rebatedor Designado',

                // 制御ボタン
                save: 'Salvar',
                playerSubstitution: 'Substituição de Jogador',
                endGame: 'Terminar Jogo',
                noNextInning: 'Não Próxima Entrada',
                forceGameEnd: 'Forçar Fim',
                showGameTime: 'Mostrar Tempo de Jogo',

                // 打撃結果
                single: 'Simples',
                double: 'Dupla',
                triple: 'Tripla',
                homerun: 'Home Run',
                walk: 'Base por Bolas',
                strikeout: 'Strikeout',
                groundout: 'Out no Solo',
                flyout: 'Out no Ar',

                // 打者情報表示
                todayStats: 'Hoje',
                battingAvg: 'AVE',
                onBaseAvg: 'OBP',
                rbi: 'RBI',
                recentPlays: 'Jogadas Recentes',
                noPlaysYet: 'Ainda não há jogadas',
                pitcherName: 'Nome do Arremessador',

                // メッセージ
                gameStarted: 'Jogo iniciado',
                gameSaved: 'Jogo salvo',
                gameEnded: 'Jogo terminado',
                error: 'Ocorreu um erro',

                // 確認ダイアログ
                confirmEndGame: 'Deseja terminar o jogo?',
                confirmDeleteAtBat: 'Tem certeza de que deseja excluir esta rebatida?\nAs estatísticas serão recalculadas automaticamente.',
                confirmNoNextInning: 'Deseja evitar avançar para a próxima entrada após o {half} atual da entrada {inning}?\n(Limite de tempo, tempo de uso do campo, etc.)',
                confirmForceEndGame: 'Deseja forçar o fim do jogo?\nMotivo: {reason}',
                noReason: 'Sem motivo',

                // Alert messages
                errorPrefix: 'Erro: ',
                selectStolenBaseRunner: 'Por favor selecione um corredor para base roubada',
                errorSelectResult: 'Por favor selecione um resultado',

                // 共通UI
                result: 'Resultado',
                confirm: 'Confirmar',
                cancel: 'Cancelar',
                runsScored: 'Corridas Marcadas',

                // 言語設定
                language: 'Idioma',
                japanese: '日本語',
                english: 'English',
                spanish: 'Español',
                portuguese: 'Português',

                // 訂正機能
                atBatHistory: 'Histórico de Rebatidas',
                noAtBatsYet: 'Ainda não há rebatidas',
                edit: 'Editar',
                delete: 'Excluir',
                corrected: 'Corrigido',
                correctAtBat: 'Corrigir Resultado da Rebatida',
                currentResult: 'Resultado Atual',
                newResult: 'Novo Resultado',
                resultDetail: 'Detalhes',
                rbis: 'RBIs',
                battingOrderSuffix: 'º',

                // 打者記録画面
                batterRecord: 'Registro do Rebatedor',
                currentBatter: 'Rebatedor Atual',
                batterInfoLoading: 'Carregando informações do rebatedor...',
                atBatResult: 'Resultado da Rebatida',
                hitDirection: 'Direção da Rebatida/Detalhes:',
                hitDirectionPlaceholder: 'ex: Centro, Linha direita',
                rbiLabel: 'RBIs:',
                recordButton: 'Registrar',
                correctPreviousAtBat: 'Corrigir Rebatida Anterior',
                back: 'Voltar',

                // 選手交代モーダル
                usePinchHitter: 'Usar Rebatedor Substituto',
                pinchHitterNamePlaceholder: 'Nome do rebatedor substituto',
                currentRunners: 'Corredores Atuais:',
                noRunnersOnBase: 'Não há corredores nas bases',
                pinchRunnerLabel: 'Corredor Substituto',
                pinchRunnerNamePlaceholder: 'Nome do corredor substituto',
                executeButton: 'Executar',
                cancelButton: 'Cancelar',
                currentBatterLabel: 'Rebatedor Atual:',
                noInfo: 'Sem informação',

                // クイック記録機能
                fillDetails: 'Preencher Detalhes',
                incomplete: 'Incompleto',
                quickRecord: 'Rápido',
                fillAtBatDetails: 'Preencher Detalhes da Rebatida',
                currentInfo: 'Informação Atual',
                detailedDescription: 'Descrição Detalhada',
                detailHelp: 'Por favor descreva o que aconteceu',
                reminder: 'Nota',
                fillDetailReminder: 'Após preencher os detalhes, a marca "Incompleto" será removida',

                // 選手情報編集機能
                playerList: 'Lista de Jogadores',
                editPlayerInfo: 'Editar Informações do Jogador',
                playerName: 'Nome do Jogador',
                playerNameHelp: 'Você pode corrigir erros de kanji e outros erros',
                playerPosition: 'Posição',
                playerNumberLabel: 'Número',
                saveChanges: 'Salvar Alterações',
                playerUpdateSuccess: 'Informações do jogador atualizadas',
                playerUpdateError: 'Falha ao atualizar informações do jogador',
                editPlayers: 'Editar Jogadores',

                // 簡易スタメン登録
                quickLineupMode: 'Modo de Registro Rápido',
                quickLineupHelp: 'Comece o jogo apenas com a ordem de rebatida, preencha os detalhes depois',
                startWithQuickLineup: 'Começar Apenas com Ordem',
                normalRegistration: 'Registro Normal',
                incompletePlayerInfo: 'Incompleto',
                playerDetailIncomplete: 'Detalhes Faltando',
                fillPlayerDetails: 'Preencher Detalhes',
                incompletePlayers: 'Jogadores Incompletos',
                noIncompletePlayers: 'Não há jogadores incompletos',
                notSet: 'Não Configurado',

                // Edição de Informações da Equipe
                editTeamInfo: 'Editar Info da Equipe',
                editTeamInfoTitle: 'Editar Informações da Equipe',
                editTeamInfoHelp: 'Você pode alterar nomes e casa/visitante antes do início',
                homeTeamNameLabel: 'Nome da Equipe da Casa',
                awayTeamNameLabel: 'Nome da Equipe Visitante',
                swapTeams: 'Trocar Casa/Visitante',
                cannotEditAfterStart: 'Não pode editar após o início do jogo',

                // Substitution
                substitutionModalTitle: 'Substituição de Jogador',
                offensiveSubstitution: 'Substituição Ofensiva',
                defensiveSubstitution: 'Substituição Defensiva',
                pinchHitter: 'Rebatedor Substituto',
                pinchRunner: 'Corredor Substituto',
                positionSwap: 'Troca de Posição',
                playerChange: 'Mudança de Jogador',
                substitutionExecuted: 'Substituição executada com sucesso',
                substitutionFailed: 'Falha ao executar substituição',
                selectSubstitutionInfo: 'Por favor selecione informações de substituição',
                newPlayerName: 'Nome do novo jogador',

                // Common UI
                selectPlaceholder: 'Por favor selecione',
                firstBaseRunner: 'Corredor na 1ª Base',
                secondBaseRunner: 'Corredor na 2ª Base',
                thirdBaseRunner: 'Corredor na 3ª Base',
                noPitchesYet: 'Ainda não há arremessos',
                benchPlayers: 'Jogadores Reservas',
                addBenchPlayer: 'Adicionar Jogador Reserva',
                benchPlayerNamePlaceholder: 'Nome do jogador reserva',
                remove: 'Remover',
                detail: 'Detalhe',

                // Runner situation display
                noRunners: 'Sem corredores',
                basesLoaded: 'Bases cheias',
                basesSuffix: ' base',
                firstBaseKanji: '1ª',
                secondBaseKanji: '2ª',
                thirdBaseKanji: '3ª',

                // At-bat result names
                singleHit: 'Simples',
                doubleHit: 'Dupla',
                tripleHit: 'Tripla',
                homeRun: 'Home Run',
                walkFourBalls: 'Base por Bola',
                hitByPitchDead: 'Atingido por Arremesso',
                strikeoutSwing: 'Strikeout',
                groundBall: 'Ground Out',
                flyBall: 'Fly Out',
                lineDrive: 'Line Out',
                sacrificeBunt: 'Toque de Sacrifício',
                sacrificeFly: 'Elevado de Sacrifício',
                doublePlayGround: 'Jogada Dupla',
                doublePlayFly: 'Jogada Dupla ao Voo',
                errorPlay: 'Erro',
                runner: 'Corredor',

                // At-bat result button labels
                single: 'Simples',
                double: 'Dupla',
                triple: 'Tripla',
                homerun: 'Home Run',
                single_error: 'Simples + Erro',
                double_error: 'Dupla + Erro',
                triple_error: 'Tripla + Erro',
                walk: 'Base por Bola',
                intentional_walk: 'Base Intencional',
                hit_by_pitch: 'Atingido por Arremesso',
                sacrifice_bunt: 'Toque de Sacrifício',
                sacrifice_fly: 'Elevado de Sacrifício',
                strikeout: 'Strikeout',
                strikeout_swinging: 'Strikeout por Swing',
                strikeout_looking: 'Strikeout Olhando',
                strikeout_passed_ball: 'Strikeout + Bola Passada',
                groundout: 'Ground Out',
                flyout: 'Fly Out',
                lineout: 'Line Out',
                popout: 'Pop Out',
                foulout: 'Foul Out',
                ground_double_play: 'Jogada Dupla no Solo',
                fly_double_play: 'Jogada Dupla ao Voo',
                liner_double_play: 'Jogada Dupla de Linha',
                ground_triple_play: 'Jogada Tripla no Solo',
                fly_triple_play: 'Jogada Tripla ao Voo',
                liner_triple_play: 'Jogada Tripla de Linha',
                fielders_choice: 'Escolha do Defensor',
                reached_on_error: 'Alcançou por Erro',
                infield_fly: 'Elevado de Campo Interno',
                interference: 'Interferência',
                obstruction: 'Obstrução',

                // Position names
                pos_P: 'Arremessador',
                pos_C: 'Receptor',
                pos_1B: '1ª Base',
                pos_2B: '2ª Base',
                pos_3B: '3ª Base',
                pos_SS: 'Shortstop',
                pos_LF: 'Campo Esquerdo',
                pos_CF: 'Campo Central',
                pos_RF: 'Campo Direito',
                pos_DH: 'Rebatedor Designado',

                // At-bat result categories
                hit_category: 'Rebatida',
                out_category: 'Out',
                walk_category: 'Base por Bola',
                sacrifice_category: 'Sacrifício',
                error_category: 'Erro',
                double_play_category: 'Jogada Dupla',
                triple_play_category: 'Jogada Tripla',
                special_category: 'Outro',
                back_button: 'Voltar',

                // Runner play categories
                runner_play_category: 'Jogada de Corredor',
                steal_category: 'Roubo de Base',
                pickoff_category: 'Pickoff',
                wild_pitch_play: 'Arremesso Descontrolado',
                passed_ball_play: 'Bola Passada',
                pickoff_error_play: 'Erro no Pickoff',
                balk_play: 'Balk',
                steal_success: 'Base Roubada',
                steal_failure: 'Pego Roubando',
                pickoff_safe: 'Pickoff Seguro',
                pickoff_out: 'Pickoff Out',
                select_runner: 'Selecionar Corredor',
                update_outs_runners: 'Atualizar Outs e Corredores',

                // Error types
                add_error: 'Adicionar Erro',
                error_type: 'Tipo de Erro',
                error_position: 'Posição Defensiva com Erro',
                fielding_error: 'Erro de Defesa',
                throwing_error: 'Erro de Arremesso',
                pickoff_throwing_error: 'Erro de Arremesso no Pickoff',
                foul_fly_drop: 'Foul Fly Derrubado',
                passed_ball_error: 'Erro de Bola Passada',
                interference_error: 'Erro de Interferência',
                select_error_position: 'Por favor selecione a posição defensiva',
                runner_advancement: 'Avanço dos Corredores',
                batter_runner_to: 'Rebatedor-Corredor →',
                first_runner_to: 'Corredor da 1ª Base →',
                second_runner_to: 'Corredor da 2ª Base →',
                third_runner_to: 'Corredor da 3ª Base →',
                stays: 'Permanece',
                out_on_bases: 'Out nas Bases',
                scored: 'Pontuou',
                baseSuffix: 'B',
                selectPlaceholder: 'Por favor selecione'
            }
        };
    }

    // 翻訳文字列を取得
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];

        for (const k of keys) {
            value = value?.[k];
        }

        if (value === undefined) {
            // フォールバック（日本語）
            value = this.translations.ja;
            for (const k of keys) {
                value = value?.[k];
            }
        }

        if (value === undefined) {
            return key; // キーをそのまま返す
        }

        // パラメータ置換
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
                return params[param] || match;
            });
        }

        return value;
    }

    // 言語を変更
    setLanguage(lang) {
        console.log('🔧 setLanguage called with:', lang);
        console.log('Before change - currentLanguage:', this.currentLanguage);

        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('selectedLanguage', lang);
            console.log('After change - currentLanguage:', this.currentLanguage);
            console.log('localStorage updated to:', localStorage.getItem('selectedLanguage'));
            this.updatePageContent();
            console.log('Page content updated');
        } else {
            console.error('Language not found in translations:', lang);
        }
    }

    // 現在の言語を取得
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // 利用可能な言語一覧
    getAvailableLanguages() {
        return Object.keys(this.translations).map(code => ({
            code,
            name: this.translations[code].language || code
        }));
    }

    // ページ内容を更新
    updatePageContent() {
        // data-i18n属性を持つ要素を更新
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translatedText = this.t(key);

            // デバッグ用ログ
            if (key === 'runnersSituation') {
                console.log('runnersSituation translation:', key, '->', translatedText, 'for language:', this.currentLanguage);
            }

            if (element.tagName === 'OPTION') {
                element.textContent = translatedText;
            } else {
                element.textContent = translatedText;
            }
        });

        // data-i18n-placeholder属性を持つ要素のプレースホルダーを更新
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // タイトルも更新
        document.title = this.t('appTitle');
    }

    // 翻訳の整合性をチェック
    validateTranslations() {
        const languages = Object.keys(this.translations);
        if (languages.length === 0) {
            console.warn('⚠️ [i18n] No translations loaded');
            return;
        }

        // 基準言語として日本語を使用
        const baseLanguage = 'ja';
        const baseKeys = this.getAllKeys(this.translations[baseLanguage]);

        console.log(`🌍 [i18n] Translation validation started (base: ${baseLanguage})`);
        console.log(`📝 [i18n] Total translation keys: ${baseKeys.size}`);

        let totalMissing = 0;

        // 各言語の翻訳漏れをチェック
        languages.forEach(lang => {
            if (lang === baseLanguage) return;

            const langKeys = this.getAllKeys(this.translations[lang]);
            const missingKeys = [...baseKeys].filter(key => !langKeys.has(key));
            const extraKeys = [...langKeys].filter(key => !baseKeys.has(key));

            if (missingKeys.length > 0) {
                console.warn(`❌ [i18n] Missing translations in '${lang}' (${missingKeys.length}):`);
                missingKeys.forEach(key => console.warn(`   - ${key}`));
                totalMissing += missingKeys.length;
            }

            if (extraKeys.length > 0) {
                console.warn(`⚠️ [i18n] Extra translations in '${lang}' (not in base) (${extraKeys.length}):`);
                extraKeys.forEach(key => console.warn(`   - ${key}`));
            }

            if (missingKeys.length === 0 && extraKeys.length === 0) {
                console.log(`✅ [i18n] '${lang}' translations complete (${langKeys.size} keys)`);
            }
        });

        if (totalMissing > 0) {
            console.error(`🚨 [i18n] Total missing translations: ${totalMissing}`);
            console.error(`💡 [i18n] Please add missing translations to i18n.js`);
        } else {
            console.log(`✨ [i18n] All translations complete!`);
        }
    }

    // 翻訳キーを再帰的に収集
    getAllKeys(obj, prefix = '') {
        const keys = new Set();

        for (const key in obj) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // ネストされたオブジェクトの場合、再帰的に処理
                const nestedKeys = this.getAllKeys(value, fullKey);
                nestedKeys.forEach(k => keys.add(k));
            } else {
                // プリミティブな値の場合、キーを追加
                keys.add(fullKey);
            }
        }

        return keys;
    }
}

// グローバルインスタンス
const i18n = new I18n();

// 便利関数
function t(key, params) {
    return i18n.t(key, params);
}