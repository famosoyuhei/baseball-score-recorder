class Game {
    constructor(homeTeam, awayTeam, recordingLevel = 'inning', playerDetailLevel = 'basic', recordingMode = 'bench') {
        this.id = null;
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.recordingLevel = recordingLevel; // 'inning', 'batter', 'pitch'
        this.playerDetailLevel = playerDetailLevel; // 'basic', 'standard', 'detailed'
        this.recordingMode = recordingMode; // 'bench', 'tv'
        this.dhRule = false; // DH制の有無
        this.date = new Date().toISOString();
        this.status = 'active'; // 'active', 'completed', 'suspended'
        this.currentInning = 1;
        this.isTopHalf = true;
        this.homeScore = 0;
        this.awayScore = 0;
        this.outs = 0;
        this.balls = 0;
        this.strikes = 0;
        this.runnersOnBase = {
            first: null,
            second: null,
            third: null
        };
        this.currentBatter = null;
        this.currentPitcher = null;
        this.innings = [];
        this.players = {
            home: [],
            away: []
        };
        // チーム統計
        this.teamStats = {
            home: { hits: 0, errors: 0 },
            away: { hits: 0, errors: 0 }
        };
        // 投球数カウント（球ごと記録時）
        this.pitchCounts = {
            home: 0,  // ホームチーム投手の総投球数
            away: 0   // アウェイチーム投手の総投球数
        };
        // 公認野球規則対応の追加プロパティ
        this.gameConditions = {
            weather: 'clear',
            fieldCondition: 'dry',
            temperature: null,
            humidity: null,
            windSpeed: null,
            windDirection: null
        };
        this.umpires = {
            home: null,      // 球審
            first: null,     // 一塁審
            second: null,    // 二塁審
            third: null      // 三塁審
        };
        this.gameRules = {
            extraInnings: true,        // 延長戦あり
            maxInnings: null,          // 最大イニング数（null = 無制限）
            timeLimit: null,           // 時間制限（分）
            mercyRule: null,           // コールドルール（点差）
            dhRule: false,             // DH制
            pitchClock: false,         // ピッチクロック
            challengeSystem: false     // チャレンジシステム
        };
        this.substitutionHistory = [];  // 選手交代履歴
        this.protestInfo = null;         // 抗議情報
        this.suspensionInfo = null;      // 中断情報
        // 手動ゲーム制御フラグ
        this.manualGameControl = {
            noNextInning: false,            // 次のイニングに進まないフラグ
            forceGameEnd: false,            // 強制試合終了フラグ
            callGameReason: '',             // コールドゲーム理由
            timeWarnings: []                // 時刻警告履歴
        };
        // 公認野球規則準拠の追加管理
        this.ruleCompliance = {
            specialSituations: []          // 特殊状況記録
        };
    }

    toJSON() {
        return {
            id: this.id,
            homeTeam: this.homeTeam,
            awayTeam: this.awayTeam,
            recordingLevel: this.recordingLevel,
            playerDetailLevel: this.playerDetailLevel,
            dhRule: this.dhRule,
            date: this.date,
            status: this.status,
            currentInning: this.currentInning,
            isTopHalf: this.isTopHalf,
            homeScore: this.homeScore,
            awayScore: this.awayScore,
            outs: this.outs,
            balls: this.balls,
            strikes: this.strikes,
            runnersOnBase: this.runnersOnBase,
            currentBatter: this.currentBatter,
            currentPitcher: this.currentPitcher,
            innings: this.innings,
            players: this.players,
            teamStats: this.teamStats,
            pitchCounts: this.pitchCounts,
            gameConditions: this.gameConditions,
            umpires: this.umpires,
            gameRules: this.gameRules,
            substitutionHistory: this.substitutionHistory,
            protestInfo: this.protestInfo,
            suspensionInfo: this.suspensionInfo,
            manualGameControl: this.manualGameControl,
            ruleCompliance: this.ruleCompliance
        };
    }

    static fromJSON(data) {
        const game = new Game(data.homeTeam, data.awayTeam, data.recordingLevel, data.playerDetailLevel);
        Object.assign(game, data);
        return game;
    }
}

class Player {
    constructor(name, team, position = null, battingOrder = null) {
        this.id = null;
        this.name = name;
        this.team = team;
        this.position = position; // 守備位置
        this.battingOrder = battingOrder; // 打順
        this.isActive = true; // 出場中かどうか
        this.isStarter = false; // スターティングメンバーかどうか
        this.isBench = false; // 控え選手かどうか
        this.substitutedBy = null; // 交代選手ID
        this.substitutedAt = null; // 交代時刻
        this.enteredGameAt = null; // 途中出場時刻
        this.stats = {
            atBats: 0,
            hits: 0,
            runs: 0,
            rbis: 0,
            walks: 0,
            strikeouts: 0,
            errors: 0,
            singles: 0,
            doubles: 0,
            triples: 0,
            homeruns: 0,
            sacrificeBunts: 0,
            sacrificeFlies: 0,
            hitByPitch: 0,
            stolenBases: 0,
            caughtStealing: 0,
            fieldingChances: 0,
            fieldingAssists: 0,
            fieldingPutouts: 0
        };
        // 詳細レベル用の追加情報
        this.playerInfo = {
            number: null, // 背番号
            birthDate: null,
            height: null,
            weight: null,
            throwingHand: 'right', // 'right', 'left'
            battingHand: 'right', // 'right', 'left', 'switch'
            experience: null,
            notes: ''
        };
        // 簡易登録フラグ
        this.isQuickRegistered = false; // 簡易登録（打順のみ）で作成されたか
        this.needsDetailFill = false; // 詳細情報の追記が必要か
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            team: this.team,
            position: this.position,
            battingOrder: this.battingOrder,
            isActive: this.isActive,
            isStarter: this.isStarter,
            isBench: this.isBench,
            substitutedBy: this.substitutedBy,
            substitutedAt: this.substitutedAt,
            enteredGameAt: this.enteredGameAt,
            stats: this.stats,
            playerInfo: this.playerInfo,
            isQuickRegistered: this.isQuickRegistered,
            needsDetailFill: this.needsDetailFill
        };
    }

    static fromJSON(data) {
        const player = new Player(data.name, data.team, data.position, data.battingOrder);
        Object.assign(player, data);
        return player;
    }
}

class Inning {
    constructor(gameId, inningNumber, isTopHalf) {
        this.id = null;
        this.gameId = gameId;
        this.inning = inningNumber;
        this.isTopHalf = isTopHalf;
        this.battingTeam = isTopHalf ? 'away' : 'home';
        this.runs = 0;
        this.hits = 0;
        this.errors = 0;
        this.leftOnBase = 0;
        this.atBats = [];
        this.startTime = new Date().toISOString();
        this.endTime = null;
        this.notes = '';
    }

    toJSON() {
        return {
            id: this.id,
            gameId: this.gameId,
            inning: this.inning,
            isTopHalf: this.isTopHalf,
            battingTeam: this.battingTeam,
            runs: this.runs,
            hits: this.hits,
            errors: this.errors,
            leftOnBase: this.leftOnBase,
            startTime: this.startTime,
            endTime: this.endTime,
            notes: this.notes
        };
    }

    static fromJSON(data) {
        const inning = new Inning(data.gameId, data.inning, data.isTopHalf);
        Object.assign(inning, data);
        return inning;
    }
}

class AtBat {
    constructor(gameId, inningId, playerId, battingOrder) {
        this.id = null;
        this.gameId = gameId;
        this.inningId = inningId;
        this.playerId = playerId;
        this.battingOrder = battingOrder;
        this.result = null; // 'hit', 'out', 'walk', 'strikeout', 'error', etc.
        this.resultDetail = ''; // 詳細（例：「センター前ヒット」）
        this.runs = 0;
        this.rbis = 0;
        this.pitches = [];
        this.finalCount = { balls: 0, strikes: 0 };
        this.startTime = new Date().toISOString();
        this.endTime = null;
        this.runnersBeforePlay = {
            first: null,
            second: null,
            third: null
        };
        this.runnersAfterPlay = {
            first: null,
            second: null,
            third: null
        };
        // クイック記録モード用フラグ
        this.isQuickRecord = false; // クイック記録で作成されたか
        this.needsDetailFill = false; // 詳細情報の追記が必要か
        this.quickRecordNote = ''; // クイック記録時のメモ
    }

    toJSON() {
        return {
            id: this.id,
            gameId: this.gameId,
            inningId: this.inningId,
            playerId: this.playerId,
            battingOrder: this.battingOrder,
            result: this.result,
            resultDetail: this.resultDetail,
            runs: this.runs,
            rbis: this.rbis,
            finalCount: this.finalCount,
            startTime: this.startTime,
            endTime: this.endTime,
            runnersBeforePlay: this.runnersBeforePlay,
            runnersAfterPlay: this.runnersAfterPlay,
            isQuickRecord: this.isQuickRecord,
            needsDetailFill: this.needsDetailFill,
            quickRecordNote: this.quickRecordNote
        };
    }

    static fromJSON(data) {
        const atBat = new AtBat(data.gameId, data.inningId, data.playerId, data.battingOrder);
        Object.assign(atBat, data);
        return atBat;
    }
}

class Pitch {
    constructor(gameId, atBatId, pitchNumber) {
        this.id = null;
        this.gameId = gameId;
        this.atBatId = atBatId;
        this.pitchNumber = pitchNumber;
        this.pitchType = ''; // 'fastball', 'curveball', 'slider', etc.
        this.velocity = null;
        this.location = { x: null, y: null }; // ストライクゾーン座標
        this.result = ''; // 'ball', 'strike', 'foul', 'hit', 'swing_miss'
        this.timestamp = new Date().toISOString();
        this.count = { balls: 0, strikes: 0 };
    }

    toJSON() {
        return {
            id: this.id,
            gameId: this.gameId,
            atBatId: this.atBatId,
            pitchNumber: this.pitchNumber,
            pitchType: this.pitchType,
            velocity: this.velocity,
            location: this.location,
            result: this.result,
            timestamp: this.timestamp,
            count: this.count
        };
    }

    static fromJSON(data) {
        const pitch = new Pitch(data.gameId, data.atBatId, data.pitchNumber);
        Object.assign(pitch, data);
        return pitch;
    }
}

// 野球の基本データと設定
const BASEBALL_CONFIG = {
    POSITIONS: {
        'P': 'ピッチャー',
        'C': 'キャッチャー',
        '1B': 'ファースト',
        '2B': 'セカンド',
        '3B': 'サード',
        'SS': 'ショート',
        'LF': 'レフト',
        'CF': 'センター',
        'RF': 'ライト',
        'DH': '指名打者'
    },

    // 数字コードとの対応（後方互換性用）
    POSITION_NUMBERS: {
        'P': 1, 'C': 2, '1B': 3, '2B': 4, '3B': 5, 'SS': 6,
        'LF': 7, 'CF': 8, 'RF': 9, 'DH': 10
    },

    RECORDING_LEVELS: {
        'inning': '半イニングごと',
        'batter': '打者ごと',
        'pitch': '球ごと'
    },

    PLAYER_DETAIL_LEVELS: {
        'basic': '基本（打順のみ）',
        'standard': '標準（打順・守備位置）',
        'detailed': '詳細（全情報・控え選手含む）'
    },

    AT_BAT_RESULTS: {
        'single': '単打',
        'double': '二塁打',
        'triple': '三塁打',
        'homerun': '本塁打',
        'single_error': '単打+エラー',
        'double_error': '二塁打+エラー',
        'triple_error': '三塁打+エラー',
        'walk': '四球',
        'intentional_walk': '敬遠',
        'hit_by_pitch': '死球',
        'sacrifice_bunt': '犠打',
        'sacrifice_fly': '犠飛',
        'strikeout': '三振',
        'strikeout_swinging': '空振り三振',
        'strikeout_looking': '見逃し三振',
        'strikeout_passed_ball': '三振+振り逃げ',
        'groundout': 'ゴロアウト',
        'flyout': 'フライアウト',
        'lineout': 'ライナーアウト',
        'popout': 'ポップアウト',
        'foulout': 'ファウルアウト',
        'ground_double_play': 'ゴロ併殺',
        'fly_double_play': 'フライ併殺',
        'liner_double_play': 'ライナー併殺',
        'ground_triple_play': 'ゴロ三重殺',
        'fly_triple_play': 'フライ三重殺',
        'liner_triple_play': 'ライナー三重殺',
        'fielders_choice': 'フィルダースチョイス',
        'reached_on_error': 'エラー出塁',
        'infield_fly': 'インフィールドフライ',
        'interference': '打撃妨害',
        'obstruction': '走塁阻害'
    },

    // 階層的な打席結果カテゴリ
    AT_BAT_RESULT_CATEGORIES: {
        'hit': {
            label: 'hit_category',
            children: ['single', 'double', 'triple', 'homerun']
        },
        'out': {
            label: 'out_category',
            children: ['strikeout', 'groundout', 'flyout', 'lineout', 'popout', 'foulout']
        },
        'walk': {
            label: 'walk_category',
            children: ['walk', 'intentional_walk', 'hit_by_pitch']
        },
        'sacrifice': {
            label: 'sacrifice_category',
            children: ['sacrifice_bunt', 'sacrifice_fly']
        },
        'error': {
            label: 'error_category',
            children: ['reached_on_error', 'single_error', 'double_error', 'triple_error']
        },
        'double_play': {
            label: 'double_play_category',
            children: ['ground_double_play', 'fly_double_play', 'liner_double_play']
        },
        'triple_play': {
            label: 'triple_play_category',
            children: ['ground_triple_play', 'fly_triple_play', 'liner_triple_play']
        },
        'special': {
            label: 'special_category',
            children: ['fielders_choice', 'infield_fly', 'interference', 'obstruction', 'strikeout_passed_ball']
        }
    },

    // 走者プレーのカテゴリ (打者の打席結果とは独立)
    RUNNER_PLAY_CATEGORIES: {
        'steal': {
            label: 'steal_category',
            requiresRunner: true,
            options: ['steal_success', 'steal_failure']
        },
        'pickoff': {
            label: 'pickoff_category',
            requiresRunner: true,
            options: ['pickoff_safe', 'pickoff_out']
        },
        'wild_pitch': {
            label: 'wild_pitch_play',
            requiresRunner: true,
            batterUnchanged: true
        },
        'passed_ball': {
            label: 'passed_ball_play',
            requiresRunner: true,
            batterUnchanged: true
        },
        'pickoff_error': {
            label: 'pickoff_error_play',
            requiresRunner: true,
            batterUnchanged: true
        },
        'balk': {
            label: 'balk_play',
            requiresRunner: true,
            batterUnchanged: true
        }
    },

    PITCH_TYPES: {
        'fastball': 'ストレート',
        'curveball': 'カーブ',
        'slider': 'スライダー',
        'changeup': 'チェンジアップ',
        'forkball': 'フォーク',
        'sinker': 'シンカー',
        'cutter': 'カッター',
        'knuckle': 'ナックル'
    },

    PITCH_RESULTS: {
        'ball': 'ボール',
        'strike_looking': '見逃しストライク',
        'strike_swinging': '空振りストライク',
        'foul': 'ファウル',
        'hit': '打球',
        'bunt': 'バント',
        'wild_pitch': '暴投',
        'passed_ball': '捕逸'
    },

    BASERUNNING_PLAYS: {
        'steal_success': '盗塁成功',
        'steal_failure': '盗塁死',
        'pickoff_safe': '牽制帰塁',
        'pickoff_out': '牽制死',
        'balk': 'ボーク',
        'runner_interference': '走塁妨害',
        'catcher_interference': '捕手妨害',
        'wild_pitch_advance': 'ワイルドピッチで進塁',
        'passed_ball_advance': 'パスボールで進塁',
        'fielding_error_advance': 'エラーで進塁',
        'delayed_steal': '盗塁（遅延スチール）'
    },

    // 未実装だが重要な公認野球規則
    CRITICAL_MISSING_RULES: {
        // 規則6.01 妨害・阻害・その他の反則行為
        'batter_interference': '打者の妨害',
        'spectator_interference': '観客の妨害',
        'umpire_interference': '審判員の妨害',
        'offensive_interference': '攻撃側の妨害',
        'defensive_obstruction': '守備側の阻害',

        // 規則6.02 投手の反則行為
        'illegal_pitch': '反則投球',
        'quick_pitch': 'クイックピッチ',
        'pitcher_delay': '投球の遅延',

        // 規則6.03 打者の反則行為
        'illegal_bat': '不正バット',
        'batting_out_of_order': '打順間違い',
        'batter_box_violation': 'バッターボックス違反',

        // 規則5.05 アピールプレイ
        'appeal_missed_base': '塁踏み忘れアピール',
        'appeal_leaving_early': '早すぎる離塁アピール',
        'appeal_batting_order': '打順間違いアピール',

        // 規則5.06 特殊な走塁ルール
        'running_lane_violation': '走塁レーン違反',
        'base_running_backwards': '逆走',
        'runner_out_of_baseline': 'ベースライン逸脱',

        // 規則5.07 投球・打撃のタイミング
        'pitch_clock_violation': 'ピッチクロック違反',
        'timeout_rules': 'タイム要求ルール',

        // 規則9.01 公式記録
        'earned_run_calculation': '自責点計算',
        'error_vs_hit_judgment': 'エラーvsヒット判定',
        'wild_pitch_vs_passed_ball': 'ワイルドピッチvs捕逸判定'
    },

    GAME_SITUATIONS: {
        'infield_fly_rule': 'インフィールドフライルール適用',
        'time_play': 'タイムプレイ',
        'appeal_play': 'アピールプレイ',
        'force_play': 'フォースプレイ',
        'tag_play': 'タッグプレイ',
        'suicide_squeeze': 'スクイズ',
        'safety_squeeze': 'セーフティスクイズ',
        'hit_and_run': 'ヒットエンドラン',
        'run_and_hit': 'ランエンドヒット'
    },

    GAME_STATUS: {
        'active': '進行中',
        'suspended': '中断',
        'postponed': '延期',
        'called': 'コールドゲーム',
        'completed': '完了',
        'extra_innings': '延長戦'
    },

    WEATHER_CONDITIONS: {
        'clear': '晴れ',
        'cloudy': '曇り',
        'rain': '雨',
        'drizzle': '小雨',
        'heavy_rain': '大雨',
        'snow': '雪',
        'fog': '霧',
        'wind': '強風'
    },

    FIELD_CONDITIONS: {
        'dry': '乾燥',
        'wet': '湿潤',
        'muddy': 'ぬかるみ',
        'hard': '硬い',
        'soft': '軟らかい'
    }
};