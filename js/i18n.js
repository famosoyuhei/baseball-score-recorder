// 多言語対応システム (i18n)
class I18n {
    constructor() {
        this.currentLanguage = localStorage.getItem('selectedLanguage') || 'ja';
        this.translations = {};
        this.loadTranslations();
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
                fillPlayerDetails: '選手詳細を入力',
                incompletePlayers: '未入力の選手',
                noIncompletePlayers: '未入力の選手はいません'
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

                // メッセージ
                gameStarted: 'Game started',
                gameSaved: 'Game saved',
                gameEnded: 'Game ended',
                error: 'An error occurred',

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
                fillPlayerDetails: 'Fill Player Details',
                incompletePlayers: 'Incomplete Players',
                noIncompletePlayers: 'No incomplete players'
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

                // メッセージ
                gameStarted: 'Juego iniciado',
                gameSaved: 'Juego guardado',
                gameEnded: 'Juego terminado',
                error: 'Ocurrió un error',

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
                fillPlayerDetails: 'Completar Detalles del Jugador',
                incompletePlayers: 'Jugadores Incompletos',
                noIncompletePlayers: 'No hay jugadores incompletos'
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

                // メッセージ
                gameStarted: 'Jogo iniciado',
                gameSaved: 'Jogo salvo',
                gameEnded: 'Jogo terminado',
                error: 'Ocorreu um erro',

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
                fillPlayerDetails: 'Preencher Detalhes do Jogador',
                incompletePlayers: 'Jogadores Incompletos',
                noIncompletePlayers: 'Não há jogadores incompletos'
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
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('selectedLanguage', lang);
            this.updatePageContent();
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
}

// グローバルインスタンス
const i18n = new I18n();

// 便利関数
function t(key, params) {
    return i18n.t(key, params);
}