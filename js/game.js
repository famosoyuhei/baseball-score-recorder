class GameManager {
    constructor() {
        this.currentGame = null;
        this.currentInning = null;
        this.currentAtBat = null;
        this.isRecording = false;
        this.currentBattingOrder = { home: 1, away: 1 };
    }

    async createNewGame(homeTeam, awayTeam, recordingLevel, playerDetailLevel, recordingMode = 'bench') {
        try {
            console.log('Creating new game:', { homeTeam, awayTeam, recordingLevel, playerDetailLevel, recordingMode });

            this.currentGame = new Game(homeTeam, awayTeam, recordingLevel, playerDetailLevel, recordingMode);
            console.log('Game object created successfully');

            const gameData = this.currentGame.toJSON();
            console.log('Game data serialized:', gameData);

            const gameId = await storage.saveGame(gameData);
            console.log('Game saved with ID:', gameId);

            this.currentGame.id = gameId;

            await this.startInning(1, true);
            console.log('Initial inning started');

            return this.currentGame;
        } catch (error) {
            console.error('Error in createNewGame:', error);
            throw error;
        }
    }

    async loadGame(gameId) {
        const gameData = await storage.loadGame(gameId);
        if (!gameData) {
            throw new Error('試合データが見つかりません');
        }

        this.currentGame = Game.fromJSON(gameData);

        const innings = await storage.getInningsByGame(gameId);
        this.currentGame.innings = innings.map(inning => Inning.fromJSON(inning));

        const players = await storage.getPlayersByTeam('home');
        const awayPlayers = await storage.getPlayersByTeam('away');
        this.currentGame.players.home = players.map(player => Player.fromJSON(player));
        this.currentGame.players.away = awayPlayers.map(player => Player.fromJSON(player));

        // 古い形式のサフィックス（番、º、°）を選手名から除去
        const cleaned = await this.cleanPlayerNameSuffixes();

        // クリーニングが実行された場合は保存
        if (cleaned) {
            console.log('💾 Saving cleaned player data...');
            await this.saveGame();
        }

        return this.currentGame;
    }

    // 選手名から古い形式のサフィックスを除去するヘルパーメソッド
    async cleanPlayerNameSuffixes() {
        if (!this.currentGame) return false;

        console.log('🧹 Cleaning old suffixes from player names...');

        let cleanedCount = 0;

        ['home', 'away'].forEach(team => {
            this.currentGame.players[team].forEach(player => {
                const originalName = player.name;
                const match = player.name.match(/^(\d+)(番|º|°)?$/);
                if (match && match[2]) {  // サフィックスが存在する場合のみ
                    player.name = match[1];  // 数字部分のみに修正
                    console.log(`  Cleaned ${team} player: "${originalName}" → "${player.name}"`);
                    cleanedCount++;
                }
            });
        });

        if (cleanedCount > 0) {
            console.log(`✅ Cleaned ${cleanedCount} player names`);
            return true;
        } else {
            console.log('✅ No cleaning needed - all player names are already clean');
            return false;
        }
    }

    async saveGame() {
        if (!this.currentGame) {
            throw new Error('保存する試合がありません');
        }

        await storage.saveGame(this.currentGame.toJSON());

        if (this.currentInning) {
            await storage.saveInning(this.currentInning.toJSON());
        }

        if (this.currentAtBat) {
            await storage.saveAtBat(this.currentAtBat.toJSON());
        }
    }

    async startInning(inningNumber, isTopHalf) {
        if (!this.currentGame) {
            throw new Error('試合が開始されていません');
        }

        this.currentInning = new Inning(this.currentGame.id, inningNumber, isTopHalf);

        // 確実にrunsを0で初期化
        if (this.currentInning.runs === undefined || this.currentInning.runs === null) {
            this.currentInning.runs = 0;
        }

        // 投手スティント初期化: イニング開始時の投手を第一スティントとして記録
        const pitchingTeamAtStart = isTopHalf ? 'home' : 'away';
        const startingPitcher = this.currentGame.players[pitchingTeamAtStart]
            .find(p => p.position === 'P' && p.isActive);
        if (startingPitcher) {
            this.currentInning.pitcherStints = [{
                pitcherId: startingPitcher.id,
                runnersInherited: 0,
                runsAtEntry: 0,
                earnedRunsAtEntry: 0
            }];
        }

        const inningId = await storage.saveInning(this.currentInning.toJSON());
        this.currentInning.id = inningId;

        this.currentGame.currentInning = inningNumber;
        this.currentGame.isTopHalf = isTopHalf;
        this.currentGame.outs = 0;
        this.currentGame.balls = 0;
        this.currentGame.strikes = 0;

        this.resetRunners();

        // タイブレーク延長の場合、各回開始時にランナーを自動配置
        const reg = this.currentGame.gameRules.regulationInnings || 9;
        if (inningNumber > reg && this.currentGame.gameRules.tiebreaker === true) {
            const placement = this.currentGame.gameRules.tiebreakerRunners;
            const autoRunner = { name: i18n ? i18n.t('autoRunner') : '自動走者', battingOrder: 0, playerId: 'auto' };
            if (placement.first)  this.currentGame.runnersOnBase.first  = { ...autoRunner };
            if (placement.second) this.currentGame.runnersOnBase.second = { ...autoRunner };
            if (placement.third)  this.currentGame.runnersOnBase.third  = { ...autoRunner };
        }

        // 打席継続フラグがあれば、打者はそのまま（打順は進めない）
        // フラグをリセット
        if (this.currentGame.batterContinuesNextInning) {
            console.log('打席継続: 前イニングの打者を維持します');
            this.currentGame.batterContinuesNextInning = false;
        } else {
            // 通常は打者をリセット（次の打者に移行）
            this.currentGame.currentBatter = null;
        }

        await this.saveGame();

        return this.currentInning;
    }

    async startAtBat(playerId, battingOrder) {
        if (!this.currentInning) {
            throw new Error('イニングが開始されていません');
        }

        this.currentAtBat = new AtBat(
            this.currentGame.id,
            this.currentInning.id,
            playerId,
            battingOrder
        );

        this.currentAtBat.runnersBeforePlay = { ...this.currentGame.runnersOnBase };

        // 打席前のゲーム状態スナップショット（undo用）
        this.currentAtBat.gameStateBefore = {
            outs: this.currentGame.outs,
            balls: this.currentGame.balls,
            strikes: this.currentGame.strikes,
            runnersOnBase: {
                first:  this.currentGame.runnersOnBase.first  ? { ...this.currentGame.runnersOnBase.first  } : null,
                second: this.currentGame.runnersOnBase.second ? { ...this.currentGame.runnersOnBase.second } : null,
                third:  this.currentGame.runnersOnBase.third  ? { ...this.currentGame.runnersOnBase.third  } : null,
            },
            battingOrderHome: this.currentBattingOrder.home,
            battingOrderAway: this.currentBattingOrder.away,
            inningId:     this.currentInning.id,
            inningNumber: this.currentInning.inning,
            isTopHalf:    this.currentInning.isTopHalf,
        };

        const atBatId = await storage.saveAtBat(this.currentAtBat.toJSON());
        this.currentAtBat.id = atBatId;

        this.currentGame.currentBatter = playerId;
        this.currentGame.balls = 0;
        this.currentGame.strikes = 0;

        await this.saveGame();
        return this.currentAtBat;
    }

    async recordPitch(pitchData) {
        if (!this.currentAtBat) {
            throw new Error('打席が開始されていません');
        }

        const pitch = new Pitch(
            this.currentGame.id,
            this.currentAtBat.id,
            this.currentAtBat.pitches.length + 1
        );

        Object.assign(pitch, pitchData);
        pitch.count = { balls: this.currentGame.balls, strikes: this.currentGame.strikes };

        const pitchId = await storage.savePitch(pitch.toJSON());
        pitch.id = pitchId;

        this.currentAtBat.pitches.push(pitch);

        this.updateCount(pitch.result);

        // 投球数カウント（守備チーム側）
        const pitchingTeam = this.currentGame.isTopHalf ? 'home' : 'away';
        if (!this.currentGame.pitchCounts) {
            this.currentGame.pitchCounts = { home: 0, away: 0 };
        }
        this.currentGame.pitchCounts[pitchingTeam]++;

        await this.saveGame();
        return pitch;
    }

    updateCount(pitchResult) {
        const recordingLevel = this.currentGame.recordingLevel;

        switch (pitchResult) {
            case 'ball':
                this.currentGame.balls++;
                // 打席ごとの記録モードでは自動で四球処理
                if (this.currentGame.balls >= 4 && recordingLevel !== 'pitch') {
                    this.recordWalk();
                }
                break;
            case 'strike_looking':
            case 'strike_swinging':
                this.currentGame.strikes++;
                // 打席ごとの記録モードでは自動で三振処理
                if (this.currentGame.strikes >= 3 && recordingLevel !== 'pitch') {
                    this.recordStrikeout();
                }
                break;
            case 'foul':
                if (this.currentGame.strikes < 2) {
                    this.currentGame.strikes++;
                }
                // 2ストライク時のファウルはカウント変化なし（そのまま）
                break;
            case 'foul_fly_dropped':
                // ファウルフライ落球
                if (this.currentGame.strikes < 2) {
                    this.currentGame.strikes++;
                }
                // 2ストライク時のファウルフライ落球もカウント変化なし（打席継続）
                break;
            case 'foul_bunt':
                // バントファウル
                if (this.currentGame.strikes < 2) {
                    this.currentGame.strikes++;
                } else {
                    // 2ストライク時のバントファウルはスリーバント失敗（三振）
                    this.currentGame.strikes++;
                    // 打席ごとの記録モードでは自動で三振処理
                    if (recordingLevel !== 'pitch') {
                        this.recordStrikeout();
                    }
                }
                break;
            case 'hit':
                // フェア（打球）の場合はカウント変化なし
                break;
            case 'hit_by_pitch':
                // 死球の場合はカウント変化なし
                break;
        }
    }

    async recordAtBatResult(result, resultDetail = '', runs = 0, rbis = 0, earnedRuns = null, options = {}) {
        if (!this.currentAtBat) {
            throw new Error('打席が開始されていません');
        }

        this.currentAtBat.result = result;
        this.currentAtBat.resultDetail = resultDetail;
        this.currentAtBat.runs = runs;
        this.currentAtBat.rbis = rbis;
        this.currentAtBat.finalCount = {
            balls: this.currentGame.balls,
            strikes: this.currentGame.strikes
        };
        this.currentAtBat.endTime = new Date().toISOString();
        this.currentAtBat.runnersAfterPlay = { ...this.currentGame.runnersOnBase };

        await storage.saveAtBat(this.currentAtBat.toJSON());

        this.updateInningStats(result, runs, earnedRuns !== null ? earnedRuns : runs);
        this.updatePlayerStats(this.currentAtBat.playerId, result, runs, rbis);
        this.updatePitcherStats(result);

        if (this.isOutResult(result) && !options.outsAlreadyApplied) {
            // アウトカウント増加
            if (result.includes('double_play')) {
                this.currentGame.outs += 2;
            } else if (result.includes('triple_play')) {
                this.currentGame.outs += 3;
            } else {
                this.currentGame.outs++;
            }

            // 3アウトでイニング終了
            if (this.currentGame.outs >= 3) {
                await this.endHalfInning();
            }
        }

        this.currentAtBat = null;
        await this.saveGame();
    }

    recordWalk() {
        this.moveRunners('walk');
        this.addRunnerToBase(1, this.currentGame.currentBatter);
    }

    recordStrikeout() {
        this.currentGame.outs++;
        if (this.currentGame.outs >= 3) {
            this.endHalfInning();
        }
    }

    recordHit(bases, runs = 0, rbis = 0) {
        this.moveRunners('hit', bases, runs);

        if (bases < 4) {
            this.addRunnerToBase(bases, this.currentGame.currentBatter);
        }

        this.addRuns(runs);
        this.currentInning.hits++;
    }

    moveRunners(playType, bases = 1, runsScored = 0) {
        const runners = this.currentGame.runnersOnBase;
        const newRunners = { first: null, second: null, third: null };

        if (playType === 'hit') {
            Object.keys(runners).forEach(base => {
                if (runners[base]) {
                    const currentBase = this.getBaseNumber(base);
                    const newBase = currentBase + bases;

                    if (newBase >= 4) {
                        this.addRuns(1);
                    } else {
                        const newBaseName = this.getBaseName(newBase);
                        newRunners[newBaseName] = runners[base];
                    }
                }
            });
        } else if (playType === 'walk') {
            if (runners.third && runners.second && runners.first) {
                this.addRuns(1);
                newRunners.third = runners.third;
            } else {
                newRunners.third = runners.third;
            }

            if (runners.second && runners.first) {
                newRunners.third = runners.second;
            } else {
                newRunners.second = runners.second;
            }

            if (runners.first) {
                newRunners.second = runners.first;
            }
        }

        this.currentGame.runnersOnBase = newRunners;
    }

    addRunnerToBase(base, playerId, isEarned = true, responsiblePitcherId = null) {
        const baseName = this.getBaseName(base);
        this.currentGame.runnersOnBase[baseName] = playerId;
        if (!this.currentGame.runnersEarnedStatus) {
            this.currentGame.runnersEarnedStatus = { first: true, second: true, third: true };
        }
        this.currentGame.runnersEarnedStatus[baseName] = isEarned;
        if (!this.currentGame.runnersResponsiblePitcher) {
            this.currentGame.runnersResponsiblePitcher = { first: null, second: null, third: null };
        }
        this.currentGame.runnersResponsiblePitcher[baseName] = responsiblePitcherId ?? this.getCurrentPitcherId();
    }

    getBaseNumber(baseName) {
        const baseMap = { first: 1, second: 2, third: 3 };
        return baseMap[baseName] || 0;
    }

    getBaseName(baseNumber) {
        const nameMap = { 1: 'first', 2: 'second', 3: 'third' };
        return nameMap[baseNumber];
    }

    resetRunners() {
        this.currentGame.runnersOnBase = { first: null, second: null, third: null };
        this.currentGame.runnersEarnedStatus = { first: true, second: true, third: true };
        this.currentGame.runnersResponsiblePitcher = { first: null, second: null, third: null };
    }

    // ヒット追加（攻撃中チーム）
    addHit() {
        if (!this.currentGame) return;

        const battingTeam = this.currentGame.isTopHalf ? 'away' : 'home';
        this.currentGame.teamStats[battingTeam].hits++;

        // 現在のイニングにも記録
        if (this.currentInning) {
            this.currentInning.hits = (this.currentInning.hits || 0) + 1;
        }
    }

    // エラー追加（守備中チーム）
    addError() {
        if (!this.currentGame) return;

        const fieldingTeam = this.currentGame.isTopHalf ? 'home' : 'away';
        this.currentGame.teamStats[fieldingTeam].errors++;

        // 現在のイニングにも記録
        if (this.currentInning) {
            this.currentInning.errors = (this.currentInning.errors || 0) + 1;
        }
    }

    // ヒット取り消し
    undoHit() {
        if (!this.currentGame) return;

        const battingTeam = this.currentGame.isTopHalf ? 'away' : 'home';
        if (this.currentGame.teamStats[battingTeam].hits > 0) {
            this.currentGame.teamStats[battingTeam].hits--;
        }

        // 現在のイニングからも取り消し
        if (this.currentInning && this.currentInning.hits > 0) {
            this.currentInning.hits--;
        }
    }

    // エラー取り消し
    undoError() {
        if (!this.currentGame) return;

        const fieldingTeam = this.currentGame.isTopHalf ? 'home' : 'away';
        if (this.currentGame.teamStats[fieldingTeam].errors > 0) {
            this.currentGame.teamStats[fieldingTeam].errors--;
        }

        // 現在のイニングからも取り消し
        if (this.currentInning && this.currentInning.errors > 0) {
            this.currentInning.errors--;
        }
    }

    addRuns(runs, earnedN = runs) {
        if (this.currentGame.isTopHalf) {
            this.currentGame.awayScore += runs;
        } else {
            this.currentGame.homeScore += runs;
        }
        this.currentInning.runs += runs;
        if (this.currentInning.earnedRuns === undefined) this.currentInning.earnedRuns = 0;
        this.currentInning.earnedRuns = Math.min(
            this.currentInning.runs,
            this.currentInning.earnedRuns + earnedN
        );
    }

    undoRuns(runs, earnedN = runs) {
        if (!this.currentGame || !this.currentInning) return;
        const score = Math.min(runs, this.currentInning.runs);
        if (this.currentGame.isTopHalf) {
            this.currentGame.awayScore = Math.max(0, this.currentGame.awayScore - score);
        } else {
            this.currentGame.homeScore = Math.max(0, this.currentGame.homeScore - score);
        }
        this.currentInning.runs = Math.max(0, this.currentInning.runs - score);
        const currentEarned = this.currentInning.earnedRuns ?? 0;
        this.currentInning.earnedRuns = Math.min(
            this.currentInning.runs,
            Math.max(0, currentEarned - earnedN)
        );
    }

    /** 直前に追加した1点を「非自責点」に変更（earnedRuns を1減らす） */
    markUnearned() {
        if (!this.currentInning) return false;
        const earned = this.currentInning.earnedRuns ?? 0;
        if (earned <= 0) return false;
        this.currentInning.earnedRuns = earned - 1;
        return true;
    }

    /** markUnearned を取り消す（earnedRuns を1増やす、runs が上限） */
    undoMarkUnearned() {
        if (!this.currentInning) return false;
        const earned = this.currentInning.earnedRuns ?? 0;
        const total = this.currentInning.runs ?? 0;
        if (earned >= total) return false;
        this.currentInning.earnedRuns = earned + 1;
        return true;
    }

    /**
     * 防御率（ERA）を計算する。
     * ERA = (自責点 × 9) / 投球回数（実数換算）
     * 小数第3位以下切り捨て（NPB公式）。投球回0の場合は null。
     * @param {object} pitcher - Player オブジェクト
     * @returns {string|null} "2.01" 形式の文字列、または null
     */
    getERA(pitcher) {
        const ip = pitcher?.stats?.inningsPitched || 0;
        if (ip === 0) return null;
        const er = pitcher.stats.earnedRuns || 0;
        // inningsPitched はアウト数（3アウト = 1イニング）
        const inningsDecimal = ip / 3;
        const era = (er * 9) / inningsDecimal;
        return (Math.floor(era * 100) / 100).toFixed(2);
    }

    /**
     * 打席結果が「打者が自責点対象として塁に出たか」を返す。
     * falseの場合は仮想アウト（virtualOuts）をインクリメントすべき。
     * @param {string} result - 打席結果
     * @returns {boolean}
     */
    isBatterEarned(result) {
        // 非自責となる出塁結果：
        // - エラーによる出塁（失策）: 本来アウトになるべきだった
        // - 捕逸による振り逃げ: 捕逸は非自責
        const unearnedResults = ['reached_on_error', 'strikeout_passed_ball'];
        return !unearnedResults.includes(result);
    }

    /**
     * 仮想アウトをインクリメント（エラーがなければアウトになっていた状況）。
     * 仮想アウトが3以上になると以降の得点は全て非自責点。
     */
    incrementVirtualOuts() {
        if (!this.currentInning) return;
        if (this.currentInning.virtualOuts === undefined) this.currentInning.virtualOuts = 0;
        this.currentInning.virtualOuts++;
    }

    /**
     * 走者進塁から自責点を計算する。
     * runnersEarnedStatusと仮想アウト数を考慮して、得点の自責点数と
     * 進塁後の各塁の自責点ステータスを返す。
     *
     * @param {object} oldRunners - 進塁前の塁上走者 { first, second, third }
     * @param {object} oldEarnedStatus - 進塁前の各走者の自責点ステータス { first, second, third }
     * @param {object} newRunners - 進塁後の塁上走者
     * @param {number} runsScored - 得点数
     * @param {boolean} batterIsEarned - 打者が自責点対象かどうか
     * @returns {{ earnedRunsScored: number, newEarnedStatus: object }}
     */
    calculateEarnedAdvancement(oldRunners, oldEarnedStatus, newRunners, runsScored, batterIsEarned) {
        const virtualOuts = (this.currentInning && this.currentInning.virtualOuts) || 0;

        // 進塁後の各走者の自責点ステータスを構築
        const newEarnedStatus = { first: true, second: true, third: true };
        ['first', 'second', 'third'].forEach(base => {
            if (!newRunners[base]) return;
            if (newRunners[base] === 'batter') {
                newEarnedStatus[base] = batterIsEarned;
            } else {
                // 元の塁を探して自責点ステータスを引き継ぐ
                const fromBase = Object.keys(oldRunners).find(b =>
                    oldRunners[b] && oldRunners[b] === newRunners[base]
                );
                newEarnedStatus[base] = fromBase !== undefined ? (oldEarnedStatus[fromBase] ?? true) : true;
            }
        });

        // 得点なし or 仮想アウト3以上 → 全て非自責点
        if (!runsScored || virtualOuts >= 3) {
            return { earnedRunsScored: 0, newEarnedStatus };
        }

        // 得点した走者の自責点を計算
        // 塁上から消えた走者 = 得点 or アウト（高い塁から順に「得点した」とみなす）
        const newValues = new Set(Object.values(newRunners).filter(v => v !== null));
        let earnedRunsScored = 0;
        let runsToAccount = runsScored;

        for (const base of ['third', 'second', 'first']) {
            if (!oldRunners[base] || runsToAccount <= 0) continue;
            if (newValues.has(oldRunners[base])) continue; // まだ塁上にいる
            // この走者は得点またはアウト（runsScored分を自責点チェック対象とする）
            if (oldEarnedStatus[base]) earnedRunsScored++;
            runsToAccount--;
        }

        // 打者が得点した場合（ホームランなど：newRunnersに'batter'がない）
        if (runsToAccount > 0 && !newValues.has('batter')) {
            if (batterIsEarned) earnedRunsScored++;
        }

        return { earnedRunsScored, newEarnedStatus };
    }

    /**
     * 暴投・ボーク・盗塁など走者プレーで走者が進塁する際に
     * runnersEarnedStatusも同時に更新するヘルパー。
     * @param {string} fromBase - 元の塁 ('first'|'second'|'third')
     * @param {string} toBase - 進塁先 ('second'|'third') or null（得点）
     */
    moveRunnerEarnedStatus(fromBase, toBase) {
        if (!this.currentGame.runnersEarnedStatus) {
            this.currentGame.runnersEarnedStatus = { first: true, second: true, third: true };
        }
        const wasEarned = this.currentGame.runnersEarnedStatus[fromBase] ?? true;
        this.currentGame.runnersEarnedStatus[fromBase] = true; // クリア（デフォルトに戻す）
        if (toBase) {
            this.currentGame.runnersEarnedStatus[toBase] = wasEarned;
        }
        return wasEarned; // 得点時に使用（trueなら自責点）
    }

    // 現在の守備側（ピッチング側）の投手IDを取得
    getCurrentPitcherId() {
        if (!this.currentGame) return null;
        const pitchingTeam = this.currentGame.isTopHalf ? 'home' : 'away';
        const pitcher = this.currentGame.players[pitchingTeam]?.find(p => p.position === 'P' && p.isActive);
        return pitcher ? pitcher.id : null;
    }

    // 責任走者の担当投手IDを塁間で移動（走塁進塁・盗塁・暴投・捕逸・ボーク時）
    moveRunnerResponsiblePitcher(fromBase, toBase) {
        if (!this.currentGame.runnersResponsiblePitcher) {
            this.currentGame.runnersResponsiblePitcher = { first: null, second: null, third: null };
        }
        const pitcherId = this.currentGame.runnersResponsiblePitcher[fromBase] ?? null;
        this.currentGame.runnersResponsiblePitcher[fromBase] = null;
        if (toBase) {
            this.currentGame.runnersResponsiblePitcher[toBase] = pitcherId;
        }
    }

    // 打席結果後の責任走者担当投手を計算
    // midAtBatChange: { previousPitcherId, balls, strikes } | null
    calculateResponsiblePitcherAdvancement(oldRunners, oldResponsiblePitcher, newRunners, runsScored, atBatResult, midAtBatChange) {
        const currentPitcherId = this.getCurrentPitcherId();
        const newResponsiblePitcher = { first: null, second: null, third: null };

        // 打者走者の責任投手を決定
        let batterPitcherId;
        if (midAtBatChange) {
            // 打席途中交代ルール：四球かつ交代時2ボール以上→交代前投手の責任、それ以外→交代後投手
            const isWalk = atBatResult === 'walk' || atBatResult === 'intentional_walk';
            batterPitcherId = (isWalk && midAtBatChange.balls >= 2)
                ? midAtBatChange.previousPitcherId
                : currentPitcherId;
        } else {
            // 槽交替チェック：交代前投手の責任走者がアウトになり打者走者が出塁した場合
            batterPitcherId = this._getSlotSubstitutionPitcher(
                oldRunners, oldResponsiblePitcher, newRunners, runsScored, currentPitcherId
            );
        }

        // 各塁の責任投手を設定
        for (const base of ['first', 'second', 'third']) {
            if (!newRunners[base]) continue;
            if (newRunners[base] === 'batter') {
                newResponsiblePitcher[base] = batterPitcherId;
            } else {
                // 既存走者：元の塁を探して担当投手を引き継ぐ
                const fromBase = Object.keys(oldRunners).find(b =>
                    oldRunners[b] && oldRunners[b] === newRunners[base]
                );
                newResponsiblePitcher[base] = fromBase !== undefined
                    ? (oldResponsiblePitcher[fromBase] ?? currentPitcherId)
                    : currentPitcherId;
            }
        }

        return newResponsiblePitcher;
    }

    // 槽交替チェック：打席結果で交代前投手の責任走者がアウト→打者がその槽を引き継ぐ
    _getSlotSubstitutionPitcher(oldRunners, oldResponsiblePitcher, newRunners, runsScored, currentPitcherId) {
        const newValues = new Set(Object.values(newRunners).filter(v => v !== null));
        let runsToAccount = runsScored;

        // 3塁→2塁→1塁の順：消えた走者のうちrunsScored人が得点、残りはアウト
        for (const base of ['third', 'second', 'first']) {
            if (!oldRunners[base]) continue;
            if (newValues.has(oldRunners[base])) continue; // まだ塁上にいる

            if (runsToAccount > 0) {
                runsToAccount--; // 得点したとみなす
            } else {
                // アウトになった走者：交代前投手の責任走者なら槽交替発生
                const pitcherId = oldResponsiblePitcher[base];
                if (pitcherId && pitcherId !== currentPitcherId) {
                    return pitcherId;
                }
            }
        }
        return currentPitcherId;
    }

    updateInningStats(result, runs, earnedRuns = runs) {
        if (this.isHitResult(result)) {
            this.currentInning.hits++;

            // チーム統計のヒット数も自動加算
            const battingTeam = this.currentGame.isTopHalf ? 'away' : 'home';
            this.currentGame.teamStats[battingTeam].hits++;
        }
        this.currentInning.runs += runs;
        if (runs > 0) {
            if (this.currentGame.isTopHalf) {
                this.currentGame.awayScore += runs;
            } else {
                this.currentGame.homeScore += runs;
            }
        }
        if (runs > 0) {
            if (this.currentInning.earnedRuns === undefined) this.currentInning.earnedRuns = 0;
            this.currentInning.earnedRuns = Math.min(
                this.currentInning.runs,
                this.currentInning.earnedRuns + earnedRuns
            );
        }
    }

    updatePlayerStats(playerId, result, runs, rbis) {
        const team = this.currentGame.isTopHalf ? 'away' : 'home';
        const player = this.currentGame.players[team].find(p => p.id === playerId);

        if (player) {
            if (!player.stats) player.stats = {};
            const nonAtBatResults = [
                'walk',
                'intentional_walk',
                'hit_by_pitch',
                'sacrifice_bunt',
                'sacrifice_fly',
                'catcher_interference'
            ];
            if (!nonAtBatResults.includes(result)) {
                player.stats.atBats = (player.stats.atBats || 0) + 1;
            }
            if (this.isHitResult(result)) {
                player.stats.hits++;

                // 安打種別ごとのカウント
                if (result === 'single') player.stats.singles++;
                else if (result === 'double') player.stats.doubles++;
                else if (result === 'triple') player.stats.triples++;
                else if (result === 'homerun') player.stats.homeruns++;
            }
            player.stats.runs += runs;
            player.stats.rbis += rbis;
            if (result === 'walk') {
                player.stats.walks++;
            }
            if (result === 'sacrifice_bunt') {
                player.stats.sacrificeBunts = (player.stats.sacrificeBunts || 0) + 1;
            }
            if (result === 'sacrifice_fly') {
                player.stats.sacrificeFlies = (player.stats.sacrificeFlies || 0) + 1;
            }
            if (result === 'strikeout' || result === 'strikeout_passed_ball') {
                player.stats.strikeouts++;
            }
            if (result === 'ground_double_play' || result === 'fly_double_play' || result === 'liner_double_play') {
                if (player.stats.doublePlaysBatted === undefined) player.stats.doublePlaysBatted = 0;
                player.stats.doublePlaysBatted++;
            }
            if (result === 'ground_triple_play' || result === 'fly_triple_play' || result === 'liner_triple_play') {
                if (player.stats.triplePlaysBatted === undefined) player.stats.triplePlaysBatted = 0;
                player.stats.triplePlaysBatted++;
            }
        }
    }

    updatePitcherStats(result) {
        // 守備側チームの投手統計を更新
        const pitchingTeam = this.currentGame.isTopHalf ? 'home' : 'away';
        const pitcher = this.currentGame.players[pitchingTeam].find(p => p.position === 'P' && p.isActive);

        if (pitcher) {
            // アウトカウント増加時にイニング数を更新
            if (this.isOutResult(result)) {
                if (result.includes('double_play')) {
                    pitcher.stats.inningsPitched += 2;
                } else if (result.includes('triple_play')) {
                    pitcher.stats.inningsPitched += 3;
                } else {
                    pitcher.stats.inningsPitched += 1;
                }
            }

            // 奪三振
            if (result === 'strikeout' || result === 'strikeout_looking' ||
                result === 'strikeout_swinging' || result === 'strikeout_bunt' ||
                result === 'strikeout_passed_ball') {
                pitcher.stats.strikeoutsPitched++;
            }

            // 与四球
            if (result === 'walk' || result === 'intentional_walk') {
                pitcher.stats.walksAllowed++;
            }

            // 与死球
            if (result === 'hit_by_pitch') {
                pitcher.stats.hitByPitchAllowed++;
            }
        }
    }

    // 両チームの全選手からIDで検索
    _findPlayerById(playerId) {
        for (const team of ['home', 'away']) {
            const found = this.currentGame.players[team].find(p => p.id === playerId);
            if (found) return found;
        }
        return null;
    }

    /**
     * イニング途中の投手交代を記録する。
     * app.js から守備交代確定時に呼び出す。
     */
    notifyPitcherChange(newPitcherId) {
        if (!this.currentInning) return;
        const r = this.currentGame.runnersOnBase;
        const runnersCount = [r.first, r.second, r.third].filter(Boolean).length;
        if (!this.currentInning.pitcherStints) this.currentInning.pitcherStints = [];
        this.currentInning.pitcherStints.push({
            pitcherId: newPitcherId,
            runnersInherited: runnersCount,
            runsAtEntry: this.currentInning.runs,
            earnedRunsAtEntry: this.currentInning.earnedRuns ?? 0
        });
    }

    /**
     * イニング失点を各投手のスティントに基づいて配分する。
     * 責任走者ルール（NPB）: 後続投手が引き継いだ走者が生還した場合、
     * その分（runnersInherited 数まで）は前の投手の失点とみなす。
     * @param {Array} stints [{pitcherId, runnersInherited, runsAtEntry}]
     * @param {number} totalRuns イニング総失点
     * @returns {Object} { pitcherId: runs, ... }
     */
    _distributeInningRuns(stints, totalRuns, atEntryKey = 'runsAtEntry') {
        if (!stints || stints.length === 0) return {};
        if (stints.length === 1) {
            return { [stints[0].pitcherId]: totalRuns };
        }

        const result = {};
        stints.forEach(s => { result[s.pitcherId] = 0; });

        // 各スティント期間中に記録された失点（atEntryKey で runs / earnedRuns を切り替え可能）
        const stintRuns = stints.map((s, i) => {
            const endRuns = i < stints.length - 1 ? (stints[i + 1][atEntryKey] ?? 0) : totalRuns;
            return endRuns - (s[atEntryKey] ?? 0);
        });

        // 後ろから前へ責任を伝播させる
        // 後続投手が引き継いだ走者数分の失点は前の投手の責任
        const extraCharges = new Array(stints.length).fill(0);
        for (let i = stints.length - 1; i > 0; i--) {
            const ownRuns = stintRuns[i] + extraCharges[i];
            const inherited = stints[i].runnersInherited;
            const chargeBack = Math.min(ownRuns, inherited);
            result[stints[i].pitcherId] += ownRuns - chargeBack;
            extraCharges[i - 1] += chargeBack;
        }
        result[stints[0].pitcherId] += stintRuns[0] + extraCharges[0];

        return result;
    }

    // 再計算時に打席データから投手統計を更新（pitcherId で紐付け、失点は inning 単位で別途加算）
    _updatePitcherStatsFromAtBat(atBat, pitchingTeam, inning) {
        // このイニングの投手を特定（pitcherId が記録されていればそれを、なければ現在のアクティブ投手）
        const pitcherId = inning.pitcherId;
        const pitcher = pitcherId
            ? this.currentGame.players[pitchingTeam].find(p => p.id === pitcherId)
            : this.currentGame.players[pitchingTeam].find(p => p.position === 'P' && p.isActive);
        if (!pitcher || !pitcher.stats) return;

        const result = atBat.result;

        // 投球アウト → イニング数に加算
        if (this.isOutResult(result)) {
            if (result.includes('double_play')) {
                pitcher.stats.inningsPitched += 2;
            } else if (result.includes('triple_play')) {
                pitcher.stats.inningsPitched += 3;
            } else {
                pitcher.stats.inningsPitched += 1;
            }
        }

        // 奪三振
        if (result === 'strikeout' || result === 'strikeout_looking' ||
            result === 'strikeout_swinging' || result === 'strikeout_bunt' ||
            result === 'strikeout_passed_ball') {
            pitcher.stats.strikeoutsPitched++;
        }

        // 与四球
        if (result === 'walk' || result === 'intentional_walk') {
            pitcher.stats.walksAllowed++;
        }

        // 与死球
        if (result === 'hit_by_pitch') {
            pitcher.stats.hitByPitchAllowed++;
        }
    }

    isOutResult(result) {
        return [
            'strikeout', 'groundout', 'flyout', 'lineout',
            'ground_double_play', 'fly_double_play', 'liner_double_play',
            'ground_triple_play', 'fly_triple_play', 'liner_triple_play',
            'sacrifice_bunt', 'sacrifice_fly', 'intentional_drop'
        ].includes(result);
    }

    isHitResult(result) {
        return ['single', 'double', 'triple', 'homerun'].includes(result);
    }

    // 犠打が可能かどうかを判定
    isSacrificeBuntEligible() {
        const game = this.currentGame;
        const outs = game.outs;
        const runners = game.runnersOnBase;
        const hasRunners = runners.first || runners.second || runners.third;

        // 0または1アウトで、かつ走者が少なくとも1人いる場合のみ犠打が可能
        return (outs === 0 || outs === 1) && hasRunners;
    }

    // ボールデッド事象かどうかを判定
    isDeadBallEvent(result) {
        const deadBallEvents = [
            'hit_by_pitch',           // 死球
            'strikeout_bunt',         // スリーバント失敗（反則打球）
            'illegal_batted_ball',    // 反則打球
            'interference',           // 打撃妨害
            'obstruction',            // 走塁妨害
            'intentional_drop'        // 故意落球（ボールデッド）
        ];
        return deadBallEvents.includes(result);
    }

    // プレーが継続中（ボールインプレー）かどうかを判定
    isPlayContinuing(result, previousOuts) {
        const game = this.currentGame;
        const newOuts = game.outs;

        // ボールデッド事象
        if (this.isDeadBallEvent(result)) {
            return false;
        }

        // 三重殺（必ず3アウトチェンジ）
        if (result.includes('triple_play')) {
            return false;
        }

        // 併殺で0→2アウトまたは1→3アウト（チェンジ）
        if (result.includes('double_play')) {
            if (previousOuts === 0 && newOuts === 2) return false;
            if (previousOuts === 1 && newOuts === 3) return false;
        }

        // ホームランは別途判定が必要（柵越えかランニングか）
        // この判定は呼び出し側で行う

        // それ以外はボールインプレー
        return true;
    }

    async endHalfInning() {
        if (!this.currentInning) return;

        this.currentInning.endTime = new Date().toISOString();

        // 投手に失点を記録（責任走者ルールに基づき複数投手に配分）
        const pitchingTeam = this.currentInning.isTopHalf ? 'home' : 'away';
        const stints = this.currentInning.pitcherStints;
        const inningEarnedRuns = this.currentInning.earnedRuns ?? 0;
        if (stints && stints.length > 0) {
            const distribution = this._distributeInningRuns(stints, this.currentInning.runs);
            const earnedDist = this._distributeInningRuns(stints, inningEarnedRuns, 'earnedRunsAtEntry');
            for (const [pitcherId, runs] of Object.entries(distribution)) {
                const pitcher = this.currentGame.players[pitchingTeam].find(p => p.id === pitcherId);
                if (pitcher && pitcher.stats) {
                    if (pitcher.stats.runsAllowed === undefined) pitcher.stats.runsAllowed = 0;
                    pitcher.stats.runsAllowed += runs;
                    if (pitcher.stats.earnedRuns === undefined) pitcher.stats.earnedRuns = 0;
                    pitcher.stats.earnedRuns += (earnedDist[pitcherId] ?? 0);
                }
            }
            // pitcherId を最終登板投手に設定（後方互換・表示用）
            this.currentInning.pitcherId = stints[stints.length - 1].pitcherId;
        } else {
            // フォールバック: スティント未記録の場合は現在の投手に全失点
            const activePitcher = this.currentGame.players[pitchingTeam]
                .find(p => p.position === 'P' && p.isActive);
            if (activePitcher) {
                this.currentInning.pitcherId = activePitcher.id;
                if (activePitcher.stats.runsAllowed === undefined) activePitcher.stats.runsAllowed = 0;
                activePitcher.stats.runsAllowed += this.currentInning.runs;
                if (activePitcher.stats.earnedRuns === undefined) activePitcher.stats.earnedRuns = 0;
                activePitcher.stats.earnedRuns += inningEarnedRuns;
            }
        }

        await storage.saveInning(this.currentInning.toJSON());

        // game.innings配列にも追加（メモリ内での履歴保持）
        if (!this.currentGame.innings) {
            this.currentGame.innings = [];
        }
        this.currentGame.innings.push(this.currentInning);

        const reg = this.currentGame.gameRules.regulationInnings || 9;

        // 試合継続かどうかをチェック（最終回で敗戦確定の場合は守備位置決定不要）
        const gameWillContinue = this.checkIfGameWillContinue();

        if (this.currentGame.isTopHalf) {
            // 表から裏へ
            const homeLeads = this.currentGame.homeScore > this.currentGame.awayScore;
            // ①規定回表終了時にホームがリード、または②コールドルール適用時にホームがリード → 裏不要で試合終了
            if ((this.currentGame.currentInning >= reg && homeLeads) ||
                (!gameWillContinue && homeLeads)) {
                await this.endGame('pending_confirm');
                return;
            }

            if (gameWillContinue) {
                // 代打・代走選手の守備位置決定が必要かチェック
                await this.checkAndHandleSubstitutionPositions('away');
            }
            await this.startInning(this.currentGame.currentInning, false);
        } else {
            // 裏から次の回へ
            const inning = this.currentGame.currentInning;
            const tied = this.currentGame.homeScore === this.currentGame.awayScore;

            if (!tied && (!gameWillContinue || inning >= reg)) {
                // スコア差あり（コールド・規定回・最大イニング到達）→ 試合終了（確定待ち）
                await this.endGame('pending_confirm');
            } else if (tied && !gameWillContinue) {
                // 同点だが試合終了（最大イニング到達 or コールド等）→ 引き分け（確定待ち）
                this.currentGame.pendingFinalStatus = 'draw';
                await this.endGame('pending_confirm');
            } else if (inning >= reg && tied && this.currentGame.gameRules.tiebreaker === null) {
                // 同点で延長戦突入 → タイブレーク設定が未決定なら設定モーダルを表示
                const nextInning = inning + 1;
                if (window.app && typeof window.app.showTiebreakerSetupModal === 'function') {
                    await this.checkAndHandleSubstitutionPositions('home');
                    window.app.showTiebreakerSetupModal(async () => {
                        await this.startInning(nextInning, true);
                    });
                } else {
                    await this.startInning(nextInning, true);
                }
            } else {
                if (gameWillContinue) {
                    // 代打・代走選手の守備位置決定が必要かチェック
                    await this.checkAndHandleSubstitutionPositions('home');
                }
                await this.startInning(inning + 1, true);
            }
        }
    }

    checkIfGameWillContinue() {
        const game = this.currentGame;
        const inning = game.currentInning;

        // 手動制御による強制終了
        if (game.manualGameControl.forceGameEnd) {
            return false;
        }

        // 手動制御：次のイニングに進まない設定
        if (game.manualGameControl.noNextInning) {
            // 現在のイニングが終了したら試合終了
            if ((!game.isTopHalf && game.outs >= 3) ||
                (game.isTopHalf && game.homeScore > game.awayScore)) {
                return false;
            }
        }

        // コールドゲーム判定（点差ルール）
        if (game.gameRules.mercyRule && this.checkMercyRule()) {
            return false;
        }

        // 柔軟なコールドルール判定（削除済み機能）
        // if (game.gameRules.flexibleCallRules && game.gameRules.flexibleCallRules.enabled && this.checkFlexibleCallRules()) {
        //     return false;
        // }

        // 時間制限判定（基本）
        if (game.gameRules.timeLimit && this.checkTimeLimit()) {
            return false;
        }

        // 最大イニング制限
        if (game.gameRules.maxInnings && inning >= game.gameRules.maxInnings) {
            return false;
        }

        const reg = game.gameRules.regulationInnings || 9;

        // 規定回数ルール
        if (inning >= reg) {
            if (game.isTopHalf) {
                // 規定回表終了時点でホームチームがリードしていれば試合終了
                if (game.homeScore > game.awayScore) {
                    return false;
                }
            } else {
                // 規定回裏終了時点での判定
                if (game.homeScore !== game.awayScore) {
                    return false; // 勝負が決している
                }
                // 同点の場合は延長戦の設定による
                if (!game.gameRules.extraInnings) {
                    return false; // 延長戦なし → 引き分け
                }
                // タイブレークなし・最大イニング到達 → 引き分け
                if (game.gameRules.tiebreaker === false && game.gameRules.maxInnings &&
                    inning >= game.gameRules.maxInnings) {
                    return false;
                }
            }
        }

        return true; // ゲーム継続
    }

    checkMercyRule() {
        const game = this.currentGame;
        const rules = game.gameRules.mercyRule;
        if (!rules || !Array.isArray(rules) || rules.length === 0) return false;

        const scoreDiff = Math.abs(game.homeScore - game.awayScore);
        const inning = game.currentInning;

        // いずれかのルールが満たされていれば true
        for (const rule of rules) {
            if (inning >= rule.inning && scoreDiff >= rule.points) {
                return true;
            }
        }
        return false;
    }

    checkTimeLimit() {
        const game = this.currentGame;
        if (!game.gameRules.timeLimit) return false;

        const gameStart = new Date(game.date);
        const now = new Date();
        const elapsedMinutes = (now - gameStart) / (1000 * 60);

        return elapsedMinutes >= game.gameRules.timeLimit;
    }

    recordSubstitution(originalPlayer, newPlayer, inning, isTopHalf, reason = '') {
        const substitution = {
            originalPlayerId: originalPlayer.id,
            originalPlayerName: originalPlayer.name,
            newPlayerId: newPlayer.id,
            newPlayerName: newPlayer.name,
            team: originalPlayer.team,
            inning: inning,
            isTopHalf: isTopHalf,
            timestamp: new Date().toISOString(),
            reason: reason,
            position: originalPlayer.position,
            battingOrder: originalPlayer.battingOrder
        };

        this.currentGame.substitutionHistory.push(substitution);

        // 選手の交代状態を更新
        originalPlayer.isActive = false;
        originalPlayer.substitutedBy = newPlayer.id;
        originalPlayer.substitutedAt = substitution.timestamp;

        newPlayer.isActive = true;
        newPlayer.enteredGameAt = substitution.timestamp;

        return substitution;
    }

    validateSubstitution(originalPlayer, newPlayer) {
        // 既に交代済みの選手は再出場不可
        if (!originalPlayer.isActive) {
            return {
                valid: false,
                message: `${originalPlayer.name}は既に交代済みです`
            };
        }

        // 新しい選手が既に出場している場合は不可
        if (newPlayer.isActive && !newPlayer.isBench) {
            return {
                valid: false,
                message: `${newPlayer.name}は既に出場中です`
            };
        }

        // 一度交代した選手の再出場は不可（公認野球規則）
        const hasSubstituted = this.currentGame.substitutionHistory.some(
            sub => sub.originalPlayerId === newPlayer.id
        );

        if (hasSubstituted) {
            return {
                valid: false,
                message: `${newPlayer.name}は既に交代により退場しており、再出場できません`
            };
        }

        return { valid: true };
    }

    async checkAndHandleSubstitutionPositions(battingTeam) {
        // 代打・代走選手（守備位置が'打'や'走'の選手）がいるかチェック
        const substitutePlayers = this.currentGame.players[battingTeam].filter(
            player => player.position === '打' || player.position === '走'
        );

        if (substitutePlayers.length > 0) {
            // アプリケーション側に守備位置決定画面の表示を要求
            if (window.app && typeof window.app.showSubstituteDefensivePositionScreen === 'function') {
                await window.app.showSubstituteDefensivePositionScreen(battingTeam, substitutePlayers);
            }
        }
    }

    async endGame(status = 'completed') {
        if (!this.currentGame) return;

        this.currentGame.status = status; // 'completed', 'draw', 'no_game', 'pending_confirm'
        await this.saveGame();
    }

    getPitchingDecisionCandidates() {
        const game = this.currentGame;
        if (!game || game.status !== 'pending_confirm') return null;

        const finalStatus = game.pendingFinalStatus ||
            (game.homeScore === game.awayScore ? 'draw' : 'completed');
        if (finalStatus !== 'completed') {
            return { finalStatus, requiresSelection: false };
        }

        const winningTeam = game.homeScore > game.awayScore ? 'home' : 'away';
        const losingTeam = winningTeam === 'home' ? 'away' : 'home';
        const teamLabel = team => team === 'home' ? game.homeTeam : game.awayTeam;
        const pitcherIdsByTeam = { home: new Set(), away: new Set() };

        for (const inning of game.innings || []) {
            const pitchingTeam = inning.isTopHalf ? 'home' : 'away';
            if (inning.pitcherId) pitcherIdsByTeam[pitchingTeam].add(String(inning.pitcherId));
            for (const stint of inning.pitcherStints || []) {
                if (stint.pitcherId) pitcherIdsByTeam[pitchingTeam].add(String(stint.pitcherId));
            }
        }

        const getPitchers = team => {
            const ids = pitcherIdsByTeam[team];
            const players = game.players?.[team] || [];
            return players
                .filter(player => {
                    const stats = player.stats || {};
                    return player.position === 'P' ||
                        ids.has(String(player.id)) ||
                        (stats.inningsPitched || 0) > 0 ||
                        (stats.runsAllowed || 0) > 0;
                })
                .map(player => ({
                    id: player.id,
                    name: player.name || `${teamLabel(team)} ${player.battingOrder || ''}`.trim(),
                    team,
                    teamName: teamLabel(team),
                    battingOrder: player.battingOrder,
                    inningsPitched: player.stats?.inningsPitched || 0,
                    runsAllowed: player.stats?.runsAllowed || 0,
                    earnedRuns: player.stats?.earnedRuns || 0
                }));
        };

        const winningPitchers = getPitchers(winningTeam);
        const losingPitchers = getPitchers(losingTeam);
        const lossCandidates = losingPitchers.filter(p => p.runsAllowed > 0);

        return {
            finalStatus,
            winningTeam,
            losingTeam,
            winningTeamName: teamLabel(winningTeam),
            losingTeamName: teamLabel(losingTeam),
            winningPitchers,
            losingPitchers: lossCandidates.length ? lossCandidates : losingPitchers,
            savePitchers: winningPitchers,
            holdPitchers: winningPitchers,
            requiresSelection: winningPitchers.length > 0 || losingPitchers.length > 0
        };
    }

    async savePitchingDecisions(decisions) {
        if (!this.currentGame) return null;
        this.currentGame.pitchingDecisions = {
            winningPitcherId: decisions.winningPitcherId || null,
            losingPitcherId: decisions.losingPitcherId || null,
            savePitcherId: decisions.savePitcherId || null,
            holdPitcherIds: decisions.holdPitcherIds || [],
            confirmedAt: new Date().toISOString(),
            method: 'manual-confirmation'
        };
        await this.saveGame();
        return this.currentGame.pitchingDecisions;
    }

    /**
     * pending_confirm 状態の試合を確定する。スコアから勝敗を判定し、
     * 'completed' または 'draw' に設定して保存する。
     */
    async confirmGame() {
        if (!this.currentGame) return null;
        if (this.currentGame.status !== 'pending_confirm') return null;

        const finalStatus = this.currentGame.pendingFinalStatus ||
            (this.currentGame.homeScore === this.currentGame.awayScore ? 'draw' : 'completed');

        this.currentGame.status = finalStatus;
        this.currentGame.pendingFinalStatus = null;
        this.currentGame.endTime = new Date().toISOString();
        await this.saveGame();
        return finalStatus;
    }

    /**
     * イニングモード用: endHalfInning() による試合終了を取り消す。
     * app.js が保存したスナップショットを受け取り、イニングと試合状態を巻き戻す。
     * @param {{ runs, hits, errors, homeScore, awayScore }} snap
     */
    async undoEndHalfInning(snap) {
        if (!this.currentGame || !this.currentInning) return;

        // 完了済みイニング一覧から除去（currentInning は引き続き使用）
        this.currentGame.innings = this.currentGame.innings.filter(i => i.id !== this.currentInning.id);

        // イニングの終了状態を巻き戻す
        this.currentInning.endTime    = null;
        this.currentInning.runs       = snap.runs;
        this.currentInning.earnedRuns = snap.earnedRuns ?? 0;
        this.currentInning.hits       = snap.hits;
        this.currentInning.errors     = snap.errors;

        // イニングを再保存（endTime なし）
        await storage.saveInning(this.currentInning.toJSON());

        // スコアを復元
        this.currentGame.homeScore = snap.homeScore;
        this.currentGame.awayScore = snap.awayScore;

        // 投手統計を逆算（pitcherStints があれば）
        const pitchingTeam = this.currentInning.isTopHalf ? 'home' : 'away';
        const stints = this.currentInning.pitcherStints;
        const snapEarned = snap.earnedRuns ?? 0;
        if (stints && stints.length > 0) {
            const distribution = this._distributeInningRuns(stints, snap.runs);
            const earnedDist   = this._distributeInningRuns(stints, snapEarned, 'earnedRunsAtEntry');
            for (const [pitcherId, runs] of Object.entries(distribution)) {
                const pitcher = this.currentGame.players[pitchingTeam].find(p => p.id === pitcherId);
                if (pitcher?.stats?.runsAllowed !== undefined) {
                    pitcher.stats.runsAllowed = Math.max(0, pitcher.stats.runsAllowed - runs);
                }
                if (pitcher?.stats?.earnedRuns !== undefined) {
                    pitcher.stats.earnedRuns = Math.max(0, pitcher.stats.earnedRuns - (earnedDist[pitcherId] ?? 0));
                }
            }
        } else if (this.currentInning.pitcherId) {
            const pitcher = this.currentGame.players[pitchingTeam].find(p => p.id === this.currentInning.pitcherId);
            if (pitcher?.stats?.runsAllowed !== undefined) {
                pitcher.stats.runsAllowed = Math.max(0, pitcher.stats.runsAllowed - snap.runs);
            }
            if (pitcher?.stats?.earnedRuns !== undefined) {
                pitcher.stats.earnedRuns = Math.max(0, pitcher.stats.earnedRuns - snapEarned);
            }
        }

        // 試合終了フラグをリセット
        this.currentGame.status            = 'active';
        this.currentGame.endTime           = null;
        this.currentGame.winner            = null;
        this.currentGame.pendingFinalStatus = null;

        await this.saveGame();
    }

    /**
     * 途中コールド時に試合が成立しているか判定する
     * @returns {{ official: boolean, completedFullInnings: number }}
     */
    getOfficialGameStatus() {
        const game = this.currentGame;
        const min = game.gameRules.minInningsForOfficial || 5;
        const inning = game.currentInning;
        const isTopHalf = game.isTopHalf;

        // 現在進行中の半イニングは「未完了」のため、完了済みフルイニング数は inning-1
        // （表の途中でも裏の途中でも、イニングNが完了するのは裏が終わってから）
        const completedFullInnings = inning - 1;

        // 通常成立判定
        if (completedFullInnings >= min) {
            return { official: true, completedFullInnings };
        }

        // 特例：規定イニング以上の表が終わり、ホームがリードしている場合（裏不要）
        // 例：5回成立で5回表終了後にホームがリード → 5回裏不要で成立
        if (!isTopHalf && completedFullInnings === min - 1 &&
            game.homeScore > game.awayScore) {
            return { official: true, completedFullInnings };
        }

        return { official: false, completedFullInnings };
    }

    /**
     * 雨天等による途中コールドゲームを処理する
     * @param {string} reason - コールド理由（'weather', 'darkness' 等）
     * @returns {{ official: boolean, homeScore: number, awayScore: number, incompleteRuns: number }}
     */
    getWeatherCallInfo(reason = 'weather') {
        const game = this.currentGame;
        const { official } = this.getOfficialGameStatus();
        const incompleteRuns = this.currentInning ? (this.currentInning.runs || 0) : 0;
        const battingTeam = game.isTopHalf ? 'away' : 'home';

        // 未完了イニングの得点を除いた確定スコア
        let homeScore = game.homeScore;
        let awayScore = game.awayScore;
        if (battingTeam === 'away') awayScore -= incompleteRuns;
        else homeScore -= incompleteRuns;

        return { official, homeScore, awayScore, incompleteRuns, battingTeam };
    }

    async applyWeatherCall(reason = 'weather') {
        const game = this.currentGame;
        const { official, homeScore, awayScore } = this.getWeatherCallInfo(reason);

        // 現在の半イニングを未完了としてマーク
        if (this.currentInning) {
            this.currentInning.incomplete = true;
            this.currentInning.incompleteReason = reason;
            this.currentInning.endTime = new Date().toISOString();
            await storage.saveInning(this.currentInning.toJSON());
        }

        // スコアを確定値に更新
        game.homeScore = homeScore;
        game.awayScore = awayScore;
        game.manualGameControl.callGameReason = reason;

        const status = official ? 'completed' : 'no_game';
        await this.endGame(status);
    }

    getGameSummary() {
        if (!this.currentGame) return null;

        return {
            homeTeam: this.currentGame.homeTeam,
            awayTeam: this.currentGame.awayTeam,
            homeScore: this.currentGame.homeScore,
            awayScore: this.currentGame.awayScore,
            currentInning: this.currentGame.currentInning,
            isTopHalf: this.currentGame.isTopHalf,
            outs: this.currentGame.outs,
            balls: this.currentGame.balls,
            strikes: this.currentGame.strikes,
            runnersOnBase: this.currentGame.runnersOnBase,
            status: this.currentGame.status
        };
    }

    getCurrentInningDisplay() {
        if (!this.currentGame) return '';

        const inning = this.currentGame.currentInning;
        const half = this.currentGame.isTopHalf ? i18n.t('top') : i18n.t('bottom');
        return `${inning}${i18n.t('currentInning')}${half}`;
    }

    getCurrentBatter() {
        if (!this.currentGame) return null;

        const team = this.currentGame.isTopHalf ? 'away' : 'home';
        const battingOrder = this.currentBattingOrder[team];

        console.log('getCurrentBatter - team:', team, 'battingOrder:', battingOrder);
        console.log('getCurrentBatter - available players:', this.currentGame.players[team]);

        // 実際の選手データから取得
        const player = this.currentGame.players[team].find(p => p.battingOrder === battingOrder);

        console.log('getCurrentBatter - found player:', player);

        if (player) {
            return {
                id: player.id,
                battingOrder: player.battingOrder,
                name: player.name,
                team: team,
                position: player.position || null
            };
        }

        // 選手データがない場合はデフォルト
        console.log('getCurrentBatter - no player found, using default');
        return {
            battingOrder: battingOrder,
            name: `${battingOrder}`,  // 数字のみ（サフィックスは表示時に追加）
            team: team
        };
    }

    advanceBattingOrder() {
        if (!this.currentGame) return;

        const team = this.currentGame.isTopHalf ? 'away' : 'home';
        this.advanceBattingOrderForTeam(team);
    }

    advanceBattingOrderForTeam(team) {
        if (!this.currentGame || !['home', 'away'].includes(team)) return;

        this.currentBattingOrder[team] = (this.currentBattingOrder[team] % 9) + 1;
    }

    // 局面に応じた打席結果カテゴリを取得
    getAvailableResultCategories() {
        if (!this.currentGame) return [];

        const outs = this.currentGame.outs;
        const runners = this.currentGame.runnersOnBase;
        const hasRunners = runners.first || runners.second || runners.third;
        const runnerCount = (runners.first ? 1 : 0) + (runners.second ? 1 : 0) + (runners.third ? 1 : 0);

        const categories = ['hit', 'out', 'walk', 'sacrifice', 'error'];

        // 併殺（走者ありかつ二死未満の場合のみ）
        if (hasRunners && outs < 2) {
            categories.push('double_play');
        }

        // 三重殺（無死かつ走者二人以上の場合のみ）
        if (outs === 0 && runnerCount >= 2) {
            categories.push('triple_play');
        }

        categories.push('special');

        return categories;
    }

    // カテゴリ内の具体的な打席結果を取得
    getResultsForCategory(category) {
        if (!BASEBALL_CONFIG.AT_BAT_RESULT_CATEGORIES[category]) {
            return [];
        }

        const outs = this.currentGame.outs;
        const runners = this.currentGame.runnersOnBase;
        const categoryConfig = BASEBALL_CONFIG.AT_BAT_RESULT_CATEGORIES[category];
        let results = [...categoryConfig.children];

        // 特殊カテゴリの場合、三振+振り逃げのフィルタリング
        if (category === 'special') {
            // 無死/一死 + 1塁走者ありの場合は三振+振り逃げを除外
            if (outs < 2 && runners.first) {
                results = results.filter(r => r !== 'strikeout_passed_ball');
            }
        }

        return results;
    }

    // 後方互換性のための従来のメソッド
    getAvailableAtBatResults() {
        if (!this.currentGame) return [];

        const results = [];
        const outs = this.currentGame.outs;
        const runners = this.currentGame.runnersOnBase;
        const hasRunners = runners.first || runners.second || runners.third;
        const runnerCount = (runners.first ? 1 : 0) + (runners.second ? 1 : 0) + (runners.third ? 1 : 0);

        // 基本的な結果
        results.push('single', 'double', 'triple', 'homerun');
        results.push('single_error', 'double_error', 'triple_error');
        results.push('walk', 'hit_by_pitch', 'sacrifice_bunt', 'sacrifice_fly');
        results.push('strikeout', 'groundout', 'flyout', 'lineout');
        if (hasRunners) {
            results.push('fielders_choice');
        }

        // 三振+振り逃げ（無死/一死 + 1塁走者ありの場合は非表示）
        if (!(outs < 2 && runners.first)) {
            results.push('strikeout_passed_ball');
        }

        // 併殺（走者なしまたは二死の場合は非表示）
        if (hasRunners && outs < 2) {
            results.push('ground_double_play', 'fly_double_play', 'liner_double_play');
        }

        // 三重殺（無死かつ走者二人以上の場合のみ表示）
        if (outs === 0 && runnerCount >= 2) {
            results.push('ground_triple_play', 'fly_triple_play', 'liner_triple_play');
        }

        return results;
    }

    // 基本的な走者進塁パターンを自動計算
    calculateRunnerAdvancement(atBatResult) {
        const currentRunners = { ...this.currentGame.runnersOnBase };
        const newRunners = { first: null, second: null, third: null };
        let runsScored = 0;
        let batterResult = null; // 打者の到達塁

        // 打席結果別の進塁処理
        switch (atBatResult) {
            case 'single':
            case 'single_error':
                // 単打：1塁進塁、2・3塁走者は通常1塁進塁
                if (currentRunners.third) runsScored++;
                if (currentRunners.second) runsScored++;
                if (currentRunners.first) newRunners.second = currentRunners.first;
                newRunners.first = 'batter';
                batterResult = 1;
                break;

            case 'double':
            case 'double_error':
                // 二塁打：2塁進塁、1・2塁走者は通常生還
                if (currentRunners.third) runsScored++;
                if (currentRunners.second) runsScored++;
                if (currentRunners.first) runsScored++;
                newRunners.second = 'batter';
                batterResult = 2;
                break;

            case 'triple':
            case 'triple_error':
                // 三塁打：全走者生還
                if (currentRunners.third) runsScored++;
                if (currentRunners.second) runsScored++;
                if (currentRunners.first) runsScored++;
                newRunners.third = 'batter';
                batterResult = 3;
                break;

            case 'homerun':
                // 本塁打：全員生還
                if (currentRunners.third) runsScored++;
                if (currentRunners.second) runsScored++;
                if (currentRunners.first) runsScored++;
                runsScored++; // 打者も生還
                batterResult = 4; // ホームイン
                break;

            case 'walk':
            case 'intentional_walk':
            case 'hit_by_pitch':
                // 四球・死球：強制走塁走者のみ自動進塁、自由走塁走者はステイ
                // 満塁の場合: 全員1つずつ進塁（3塁走者は得点）
                if (currentRunners.first && currentRunners.second && currentRunners.third) {
                    runsScored++;
                    newRunners.third = currentRunners.second;
                    newRunners.second = currentRunners.first;
                    newRunners.first = 'batter';
                }
                // 1・2塁の場合: 全員進塁
                else if (currentRunners.first && currentRunners.second) {
                    newRunners.third = currentRunners.second;
                    newRunners.second = currentRunners.first;
                    newRunners.first = 'batter';
                }
                // 1塁のみの場合: 1塁→2塁、打者→1塁
                else if (currentRunners.first) {
                    newRunners.third = currentRunners.third;
                    newRunners.second = currentRunners.first;
                    newRunners.first = 'batter';
                }
                // 走者なし または 2塁・3塁のみの場合: 元の走者はステイ
                else {
                    newRunners.third = currentRunners.third;
                    newRunners.second = currentRunners.second;
                    newRunners.first = 'batter';
                }
                batterResult = 1;
                break;

            case 'illegal_batted_ball':
                // 反則打球：打者アウト、走者は全員ステイ（ボールデッド）
                newRunners.first = currentRunners.first;
                newRunners.second = currentRunners.second;
                newRunners.third = currentRunners.third;
                batterResult = 'out';
                break;

            case 'intentional_drop':
                // 故意落球：打者アウト、走者は全員ステイ（ボールデッド）
                newRunners.first = currentRunners.first;
                newRunners.second = currentRunners.second;
                newRunners.third = currentRunners.third;
                batterResult = 'out';
                break;

            case 'sacrifice_fly':
                // 犠飛：3塁走者生還、他は進塁なし
                if (currentRunners.third) runsScored++;
                newRunners.second = currentRunners.second;
                newRunners.first = currentRunners.first;
                batterResult = 'out';
                break;

            case 'sacrifice_bunt':
                // 犠打：走者1塁進塁
                if (currentRunners.second) newRunners.third = currentRunners.second;
                if (currentRunners.first) newRunners.second = currentRunners.first;
                newRunners.third = currentRunners.third;
                batterResult = 'out';
                break;

            case 'groundout':
            case 'flyout':
            case 'lineout':
            case 'strikeout':
                // これらは複雑な状況判定が必要（後で詳細実装）
                // とりあえず走者なしのデフォルト処理
                newRunners.first = currentRunners.first;
                newRunners.second = currentRunners.second;
                newRunners.third = currentRunners.third;
                batterResult = 'out';
                break;

            case 'strikeout_passed_ball':
                // 三振+振り逃げ（捕逸・暴投）：他の走者は一旦そのまま、詳細はモーダルで手動調整
                newRunners.first = currentRunners.first;
                newRunners.second = currentRunners.second;
                newRunners.third = currentRunners.third;
                if (!currentRunners.first) {
                    newRunners.first = 'batter';
                    batterResult = 1;
                } else {
                    batterResult = 'out';
                }
                break;

            case 'fielders_choice':
                // 野選：打者走者は通常1塁到達、アウト/進塁した走者は手動調整で指定する
                newRunners.first = 'batter';
                newRunners.second = currentRunners.second;
                newRunners.third = currentRunners.third;
                batterResult = 1;
                break;

            default:
                // その他のアウト系：進塁なし
                newRunners.first = currentRunners.first;
                newRunners.second = currentRunners.second;
                newRunners.third = currentRunners.third;
                batterResult = 'out';
                break;
        }

        return {
            newRunners,
            runsScored,
            batterResult,
            needsAdjustment: this.isComplexSituation(atBatResult, currentRunners)
        };
    }

    // 複雑な状況かどうかを判定（手動調整が必要そうな場面）
    isComplexSituation(atBatResult, currentRunners) {
        // 安打は常に手動選択が必要
        if (['single', 'double', 'triple', 'homerun'].includes(atBatResult)) {
            return true;
        }

        // 三振+振り逃げ：打者の生死・走者の進塁は毎回手動判断が必要
        if (atBatResult === 'strikeout_passed_ball') {
            return true;
        }

        // 2アウトでの単打（走者が3塁を蹴るかどうか判断が分かれる）
        if (this.currentGame.outs === 2 && atBatResult === 'single' && currentRunners.second) {
            return true;
        }

        // 1・3塁での単打（3塁走者と1塁走者の判断）
        if (atBatResult === 'single' && currentRunners.first && currentRunners.third) {
            return true;
        }

        // 満塁での単打
        if (atBatResult === 'single' && currentRunners.first && currentRunners.second && currentRunners.third) {
            return true;
        }

        // 凡退系（ゴロ・フライ・ライナー・三振）は走者がいれば常に手動選択
        if (['groundout', 'flyout', 'lineout', 'strikeout', 'fielders_choice'].includes(atBatResult)) {
            const hasRunners = currentRunners.first || currentRunners.second || currentRunners.third;
            return hasRunners;
        }

        // 反則打球・故意落球はボールデッドで全走者ステイなので手動選択不要
        if (atBatResult === 'illegal_batted_ball' || atBatResult === 'intentional_drop') {
            return false;
        }

        // その他のアウト系で走者がいる場合
        if (this.isOutResult(atBatResult) && (currentRunners.first || currentRunners.second || currentRunners.third)) {
            return true;
        }

        // 犠飛・犠打で複数走者がいる場合
        if ((atBatResult === 'sacrifice_fly' || atBatResult === 'sacrifice_bunt') &&
            ((currentRunners.first ? 1 : 0) + (currentRunners.second ? 1 : 0) + (currentRunners.third ? 1 : 0)) > 1) {
            return true;
        }

        return false;
    }

    // 安打時の走者進塁選択肢を取得（状況に応じた適切な選択肢を返す）
    getHitAdvancementOptions(hitType, base, currentRunners) {
        // base: 'first', 'second', 'third' または 'batter' (打者走者)

        const has1B = !!currentRunners.first;
        const has2B = !!currentRunners.second;
        const has3B = !!currentRunners.third;
        const basesLoaded = has1B && has2B && has3B;

        // 本塁打の場合は全員自動的に得点
        if (hitType === 'homerun') {
            return [{ value: 'home', label: 'scored' }]; // 唯一の選択肢
        }

        // 打者走者の選択肢
        if (base === 'batter') {
            switch (hitType) {
                case 'single': return [{ value: '1B', label: '1' }]; // 単打→1塁のみ
                case 'double': return [{ value: '2B', label: '2' }]; // 二塁打→2塁のみ
                case 'triple': return [{ value: '3B', label: '3' }]; // 三塁打→3塁のみ
            }
        }

        // 一塁走者の選択肢
        if (base === 'first') {
            if (hitType === 'single') {
                return [
                    { value: '2B', label: '2' },
                    { value: '3B', label: '3' },
                    { value: '3B-out', label: '3out' },
                    { value: 'home', label: 'scored' },
                    { value: 'home-out', label: 'homeout' }
                ];
            } else if (hitType === 'double') {
                return [
                    { value: '3B', label: '3' },
                    { value: '3B-out', label: '3out' },
                    { value: 'home', label: 'scored' },
                    { value: 'home-out', label: 'homeout' }
                ];
            } else if (hitType === 'triple') {
                return [
                    { value: 'home', label: 'scored' },
                    { value: 'home-out', label: 'homeout' }
                ];
            }
        }

        // 二塁走者の選択肢（1塁走者の有無で変わる）
        if (base === 'second') {
            if (hitType === 'single') {
                if (has1B) {
                    // 1塁に走者がいる→進塁義務あり
                    return [
                        { value: '3B', label: '3' },
                        { value: 'home', label: 'scored' },
                        { value: 'home-out', label: 'homeout' }
                    ];
                } else {
                    // 1塁に走者がいない→進塁義務なし
                    return [
                        { value: 'stay', label: 'stays' }, // 残塁可能
                        { value: '3B', label: '3' },
                        { value: '3B-out', label: '3out' },
                        { value: 'home', label: 'scored' },
                        { value: 'home-out', label: 'homeout' }
                    ];
                }
            } else if (hitType === 'double') {
                // 二塁打の場合
                return [
                    { value: '3B', label: '3' },
                    { value: '3B-out', label: '3out' },
                    { value: 'home', label: 'scored' },
                    { value: 'home-out', label: 'homeout' }
                ];
            } else if (hitType === 'triple') {
                // 三塁打の場合
                return [
                    { value: 'home', label: 'scored' }
                ];
            }
        }

        // 三塁走者の選択肢
        if (base === 'third') {
            if (basesLoaded) {
                // 満塁→必ず得点
                return [{ value: 'home', label: 'scored' }];
            } else if (!has1B && !has2B) {
                // 1塁も2塁も空き→進塁義務なし
                if (hitType === 'single' || hitType === 'double') {
                    return [
                        { value: 'stay', label: 'stays' },
                        { value: 'home', label: 'scored' },
                        { value: 'home-out', label: 'homeout' }
                    ];
                } else if (hitType === 'triple') {
                    return [
                        { value: 'home', label: 'scored' },
                        { value: 'home-out', label: 'homeout' }
                    ];
                }
            } else {
                // 1塁または2塁に走者あり（満塁ではない）
                if (hitType === 'single') {
                    return [
                        { value: 'stay', label: 'stays' },
                        { value: 'home', label: 'scored' },
                        { value: 'home-out', label: 'homeout' }
                    ];
                } else if (hitType === 'double' || hitType === 'triple') {
                    return [
                        { value: 'home', label: 'scored' },
                        { value: 'home-out', label: 'homeout' }
                    ];
                }
            }
        }

        // デフォルト（エラー防止）
        return [{ value: 'stay', label: 'stays' }];
    }

    // アウト詳細選択肢を取得
    getOutDetailOptions(atBatResult, currentRunners) {
        const options = [];
        const hasRunners = currentRunners.first || currentRunners.second || currentRunners.third;

        if (!hasRunners) {
            // 走者なしの場合は通常のアウト
            return [{ value: 'batter', label: '打者アウト' }];
        }

        // 基本的なアウト選択肢
        options.push({ value: 'batter', label: '打者アウト' });

        // 走者がいる場合の選択肢
        if (currentRunners.first) {
            options.push({ value: 'first_runner', label: '1塁走者アウト（封殺等）' });
        }
        if (currentRunners.second) {
            options.push({ value: 'second_runner', label: '2塁走者アウト（封殺等）' });
        }
        if (currentRunners.third) {
            options.push({ value: 'third_runner', label: '3塁走者アウト（挟殺等）' });
        }

        // 併殺・三重殺の場合
        if (atBatResult.includes('double_play')) {
            options.push({ value: 'batter_and_runner', label: '打者+走者併殺' });
            if (currentRunners.first && currentRunners.second) {
                options.push({ value: 'runners_double', label: '走者間併殺' });
            }
        }

        if (atBatResult.includes('triple_play')) {
            options.push({ value: 'all_three', label: '三者アウト' });
        }

        return options;
    }

    // ===== 訂正機能 =====

    /**
     * 打席履歴の取得
     * @returns {Promise<Array>} 打席履歴配列
     */
    async getAllAtBats() {
        if (!this.currentGame) return [];

        const allAtBats = [];

        // 全イニングから打席を収集。進行中の currentInning は innings 配列へ入る前なので含める。
        const innings = [...(this.currentGame.innings || [])];
        if (this.currentInning?.id && !innings.some(inning => inning.id === this.currentInning.id)) {
            innings.push(this.currentInning);
        }

        for (const inning of innings) {
            if (inning.id) {
                const atBats = await storage.getAtBatsByInning(inning.id);

                // 各打席に追加情報を付与
                for (const atBat of atBats) {
                    const enrichedAtBat = await this.enrichAtBatData(atBat, inning);
                    allAtBats.push(enrichedAtBat);
                }
            }
        }

        // 時系列順にソート
        allAtBats.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

        return allAtBats;
    }

    /**
     * 打席データに追加情報を付与
     */
    async enrichAtBatData(atBat, inning) {
        const team = inning.isTopHalf ? 'away' : 'home';
        const player = this.currentGame.players[team].find(p => p.id === atBat.playerId);

        return {
            ...atBat,
            playerName: player ? player.name : '不明',
            battingOrder: atBat.battingOrder,
            inningNumber: inning.inning,
            isTopHalf: inning.isTopHalf,
            team: team,
            teamName: team === 'home' ? this.currentGame.homeTeam : this.currentGame.awayTeam
        };
    }

    /**
     * 打席結果を訂正
     * @param {number} atBatId - 訂正する打席のID
     * @param {Object} newData - 新しい打席データ
     */
    async correctAtBat(atBatId, newData) {
        try {
            // 1. 打席データを取得
            const atBat = await storage.getData('atBats', atBatId);
            if (!atBat) {
                throw new Error('打席データが見つかりません');
            }

            // 2. 訂正履歴を記録
            const correction = {
                atBatId: atBatId,
                timestamp: new Date().toISOString(),
                oldData: { ...atBat },
                newData: { ...newData }
            };

            // 3. 打席データを更新
            const updatedAtBat = {
                ...atBat,
                result: newData.result || atBat.result,
                resultDetail: newData.resultDetail || atBat.resultDetail,
                runs: newData.runs !== undefined ? newData.runs : atBat.runs,
                rbis: newData.rbis !== undefined ? newData.rbis : atBat.rbis,
                runnersAfterPlay: newData.runnersAfterPlay || atBat.runnersAfterPlay,
                correctedAt: new Date().toISOString(),
                correctionHistory: [...(atBat.correctionHistory || []), correction]
            };

            await storage.saveData('atBats', updatedAtBat);

            // 4. 全統計を再計算
            await this.recalculateAllStats();

            // 5. ゲームデータを保存
            await this.saveGame();

            return updatedAtBat;
        } catch (error) {
            console.error('打席訂正エラー:', error);
            throw error;
        }
    }

    /**
     * 全統計の再計算（訂正時に使用）
     */
    async recalculateAllStats() {
        if (!this.currentGame) return;

        console.log('全統計を再計算中...');

        // 1. 統計をリセット
        this.resetAllStats();

        // 2. 全イニングの打席データから統計を再構築
        for (const inning of this.currentGame.innings) {
            if (!inning.id) continue;

            const atBats = await storage.getAtBatsByInning(inning.id);

            // イニング統計をリセット
            inning.runs = 0;
            inning.hits = 0;
            inning.errors = 0;

            for (const atBat of atBats) {
                // イニング統計を更新
                if (atBat.runs) {
                    inning.runs += atBat.runs;
                }

                if (this.isHitResult(atBat.result)) {
                    inning.hits++;
                }

                // チーム統計を更新
                const battingTeam = inning.isTopHalf ? 'away' : 'home';

                if (atBat.runs) {
                    if (battingTeam === 'home') {
                        this.currentGame.homeScore += atBat.runs;
                    } else {
                        this.currentGame.awayScore += atBat.runs;
                    }
                }

                if (this.isHitResult(atBat.result)) {
                    this.currentGame.teamStats[battingTeam].hits++;
                }

                // 打者統計を更新
                this.updatePlayerStatsFromAtBat(atBat, battingTeam);

                // 投手統計を更新（守備側チームの現投手）
                const pitchingTeam = inning.isTopHalf ? 'home' : 'away';
                this._updatePitcherStatsFromAtBat(atBat, pitchingTeam, inning);
            }

            // イニング終了時の投手失点を再計算（責任走者ルール）
            const stints = inning.pitcherStints;
            const inningEarned = inning.earnedRuns ?? 0;
            if (stints && stints.length > 0) {
                const distribution = this._distributeInningRuns(stints, inning.runs);
                const earnedDist   = this._distributeInningRuns(stints, inningEarned, 'earnedRunsAtEntry');
                for (const [pitcherId, runs] of Object.entries(distribution)) {
                    const pitcher = this._findPlayerById(pitcherId);
                    if (pitcher && pitcher.stats) {
                        if (pitcher.stats.runsAllowed === undefined) pitcher.stats.runsAllowed = 0;
                        pitcher.stats.runsAllowed += runs;
                        if (pitcher.stats.earnedRuns === undefined) pitcher.stats.earnedRuns = 0;
                        pitcher.stats.earnedRuns += (earnedDist[pitcherId] ?? 0);
                    }
                }
            } else if (inning.pitcherId) {
                // 後方互換: pitcherStints がない古いデータ
                const pitcher = this._findPlayerById(inning.pitcherId);
                if (pitcher && pitcher.stats) {
                    pitcher.stats.runsAllowed += inning.runs;
                    if (pitcher.stats.earnedRuns === undefined) pitcher.stats.earnedRuns = 0;
                    pitcher.stats.earnedRuns += inningEarned;
                }
            }

            // イニングデータを保存
            await storage.saveInning(inning.toJSON());
        }

        console.log('統計再計算完了');
    }

    /**
     * 全統計をリセット
     */
    resetAllStats() {
        // スコアをリセット
        this.currentGame.homeScore = 0;
        this.currentGame.awayScore = 0;

        // チーム統計をリセット
        this.currentGame.teamStats.home.hits = 0;
        this.currentGame.teamStats.home.errors = 0;
        this.currentGame.teamStats.away.hits = 0;
        this.currentGame.teamStats.away.errors = 0;

        // 選手統計をリセット（打者・投手両方）
        ['home', 'away'].forEach(team => {
            this.currentGame.players[team].forEach(player => {
                if (player.stats) {
                    // 打者統計
                    player.stats.atBats = 0;
                    player.stats.hits = 0;
                    player.stats.singles = 0;
                    player.stats.doubles = 0;
                    player.stats.triples = 0;
                    player.stats.homeruns = 0;
                    player.stats.rbis = 0;
                    player.stats.runs = 0;
                    player.stats.walks = 0;
                    player.stats.strikeouts = 0;
                    player.stats.hitByPitch = 0;
                    player.stats.sacrifices = 0;
                    player.stats.doublePlaysBatted = 0;
                    player.stats.triplePlaysBatted = 0;
                    // 投手統計
                    player.stats.inningsPitched = 0;
                    player.stats.strikeoutsPitched = 0;
                    player.stats.walksAllowed = 0;
                    player.stats.hitByPitchAllowed = 0;
                    player.stats.runsAllowed = 0;
                    player.stats.earnedRuns = 0;
                }
            });
        });
    }

    /**
     * 打席データから選手統計を更新
     */
    updatePlayerStatsFromAtBat(atBat, team) {
        const player = this.currentGame.players[team].find(p => p.id === atBat.playerId);
        if (!player || !player.stats) return;

        const result = atBat.result;

        // 打数カウント（四球・死球・犠打・犠飛は除く）
        if (!['walk', 'hit_by_pitch', 'sacrifice_bunt', 'sacrifice_fly'].includes(result)) {
            player.stats.atBats++;
        }

        // 安打
        if (this.isHitResult(result)) {
            player.stats.hits++;

            switch(result) {
                case 'single':
                    player.stats.singles++;
                    break;
                case 'double':
                    player.stats.doubles++;
                    break;
                case 'triple':
                    player.stats.triples++;
                    break;
                case 'homerun':
                    player.stats.homeruns++;
                    player.stats.runs++; // 本塁打は打者も得点
                    break;
            }
        }

        // 打点
        if (atBat.rbis) {
            player.stats.rbis += atBat.rbis;
        }

        // 四球・死球
        if (result === 'walk') {
            player.stats.walks++;
        } else if (result === 'hit_by_pitch') {
            player.stats.hitByPitch++;
        }

        // 三振
        if (result === 'strikeout' || result === 'strikeout_passed_ball') {
            player.stats.strikeouts++;
        }

        // 犠打・犠飛
        if (result === 'sacrifice_bunt' || result === 'sacrifice_fly') {
            player.stats.sacrifices++;
        }

        // 打者としての併殺打・三重殺
        if (result === 'ground_double_play' || result === 'fly_double_play' || result === 'liner_double_play') {
            if (player.stats.doublePlaysBatted === undefined) player.stats.doublePlaysBatted = 0;
            player.stats.doublePlaysBatted++;
        }
        if (result === 'ground_triple_play' || result === 'fly_triple_play' || result === 'liner_triple_play') {
            if (player.stats.triplePlaysBatted === undefined) player.stats.triplePlaysBatted = 0;
            player.stats.triplePlaysBatted++;
        }
    }

    /**
     * 打席を削除
     */
    async deleteAtBat(atBatId) {
        try {
            const atBat = await storage.getData('atBats', atBatId);
            if (!atBat) {
                throw new Error('打席データが見つかりません');
            }

            // 投球データも削除
            const pitches = await storage.getPitchesByAtBat(atBatId);
            for (const pitch of pitches) {
                await storage.deleteData('pitches', pitch.id);
            }

            // 打席データを削除
            await storage.deleteData('atBats', atBatId);

            // 統計を再計算
            await this.recalculateAllStats();

            await this.saveGame();
        } catch (error) {
            console.error('打席削除エラー:', error);
            throw error;
        }
    }

    // ===== 打席取り消し（undo）機能 =====

    /**
     * 最後の打席を取り消してゲーム状態をスナップショットで復元。
     * イニング跨ぎも透過的に処理（空イニングは自動削除）。
     * @returns {Object} 復元後のスナップショット（UI更新用）
     */
    async undoLastAtBat() {
        if (!this.currentGame) throw new Error('試合が読み込まれていません');

        // 確定済みの試合は変更不可
        if (['completed', 'draw', 'no_game', 'called'].includes(this.currentGame.status)) {
            throw new Error('確定済みの試合は変更できません');
        }

        // 全打席を時系列順に取得（削除前に確保）
        const allAtBats = await this.getAllAtBats();
        if (allAtBats.length === 0) throw new Error('取り消す打席がありません');

        const lastAtBat = allAtBats[allAtBats.length - 1];
        const snap = lastAtBat.gameStateBefore || {};

        // 投球データを削除
        const pitches = await storage.getPitchesByAtBat(lastAtBat.id);
        for (const p of pitches) await storage.deleteData('pitches', p.id);

        // 打席データを削除
        await storage.deleteData('atBats', lastAtBat.id);

        // ---- 空イニングを全件クリーンアップ ----
        // endHalfInning()→startInning()で生成されたInning Bなど孤立空イニングも含めて削除
        const survivingInnings = [];
        for (const inn of [...this.currentGame.innings]) {
            const abs = await storage.getAtBatsByInning(inn.id);
            if (abs.length === 0) {
                await storage.deleteData('innings', inn.id);
                // メモリからも除去（splice後も安全なよう逆順でなくcopy済み）
            } else {
                survivingInnings.push(inn);
            }
        }
        this.currentGame.innings = survivingInnings;

        // ゲーム状態をスナップショットから復元
        this.currentGame.outs    = snap.outs    ?? 0;
        this.currentGame.balls   = snap.balls   ?? 0;
        this.currentGame.strikes = snap.strikes ?? 0;
        this.currentGame.runnersOnBase = {
            first:  snap.runnersOnBase?.first  ?? null,
            second: snap.runnersOnBase?.second ?? null,
            third:  snap.runnersOnBase?.third  ?? null,
        };
        this.currentGame.currentInning = snap.inningNumber ?? this.currentGame.currentInning;
        this.currentGame.isTopHalf     = snap.isTopHalf    ?? this.currentGame.isTopHalf;
        this.currentBattingOrder.home  = snap.battingOrderHome ?? this.currentBattingOrder.home;
        this.currentBattingOrder.away  = snap.battingOrderAway ?? this.currentBattingOrder.away;

        // 試合終了フラグをリセット（チャレンジで最終アウトが覆った場合などに対応）
        this.currentGame.status  = 'active';
        this.currentGame.endTime = null;
        this.currentGame.winner  = null;

        // currentInningをスナップショットのinningIdに復元
        if (snap.inningId) {
            const found = survivingInnings.find(i => i.id === snap.inningId);
            if (found) {
                this.currentInning = found;
            } else {
                // snap.inningIdも空になって削除された（その回の最初の打席だった）
                // → 残存イニングの末尾（最後に記録されたイニング）に戻る
                const sorted = [...survivingInnings].sort((a, b) =>
                    a.inning !== b.inning ? b.inning - a.inning : (a.isTopHalf ? 1 : -1));
                this.currentInning = sorted[0] || null;
            }
        } else {
            this.currentInning = null;
        }
        this.currentAtBat  = null;
        this.isRecording   = true;

        // スコア・選手統計・イニング統計を全打席から再計算
        await this.recalculateAllStats();
        await this.saveGame();

        return snap;
    }

    // ===== クイック記録機能 =====

    /**
     * クイック記録モードで打席を記録（最小限の情報のみ）
     * @param {string} result - 打席結果（必須）
     * @param {Object} options - オプション情報
     */
    async recordAtBatQuick(result, options = {}) {
        try {
            // 打席が開始されていない場合は開始
            if (!this.currentAtBat) {
                const batter = this.getCurrentBatter();
                await this.startAtBat(batter.id || 'batter', batter.battingOrder);
            }

            // クイック記録フラグを設定
            this.currentAtBat.isQuickRecord = true;
            this.currentAtBat.needsDetailFill = options.needsDetail !== false; // デフォルトtrue
            this.currentAtBat.quickRecordNote = options.note || '';

            // 最小限の情報で打席を記録
            this.currentAtBat.result = result;
            this.currentAtBat.resultDetail = options.resultDetail || '';
            this.currentAtBat.runs = options.runs || 0;
            this.currentAtBat.rbis = options.rbis || 0;
            this.currentAtBat.finalCount = {
                balls: this.currentGame.balls,
                strikes: this.currentGame.strikes
            };
            this.currentAtBat.endTime = new Date().toISOString();
            this.currentAtBat.runnersAfterPlay = { ...this.currentGame.runnersOnBase };

            await storage.saveAtBat(this.currentAtBat.toJSON());

            // 統計更新
            this.updateInningStats(result, options.runs || 0);
            this.updatePlayerStats(this.currentAtBat.playerId, result, options.runs || 0, options.rbis || 0);

            // アウトカウント処理
            if (this.isOutResult(result)) {
                if (result.includes('double_play')) {
                    this.currentGame.outs += 2;
                } else if (result.includes('triple_play')) {
                    this.currentGame.outs += 3;
                } else {
                    this.currentGame.outs++;
                }

                if (this.currentGame.outs >= 3) {
                    await this.endHalfInning();
                }
            }

            // カウントをリセット
            this.currentGame.balls = 0;
            this.currentGame.strikes = 0;

            this.currentAtBat = null;
            await this.saveGame();

            return true;
        } catch (error) {
            console.error('クイック記録エラー:', error);
            throw error;
        }
    }

    /**
     * 詳細情報が未記入の打席を取得
     */
    async getIncompleteAtBats() {
        const allAtBats = await this.getAllAtBats();
        return allAtBats.filter(atBat => atBat.needsDetailFill);
    }

    /**
     * 打席に詳細情報を追記
     * @param {number} atBatId - 打席ID
     * @param {Object} detailData - 詳細情報
     */
    async fillAtBatDetails(atBatId, detailData) {
        try {
            const atBat = await storage.getData('atBats', atBatId);
            if (!atBat) {
                throw new Error('打席データが見つかりません');
            }

            // 詳細情報を更新
            const updatedAtBat = {
                ...atBat,
                resultDetail: detailData.resultDetail || atBat.resultDetail,
                runs: detailData.runs !== undefined ? detailData.runs : atBat.runs,
                rbis: detailData.rbis !== undefined ? detailData.rbis : atBat.rbis,
                runnersAfterPlay: detailData.runnersAfterPlay || atBat.runnersAfterPlay,
                needsDetailFill: false, // 完了フラグ
                detailFilledAt: new Date().toISOString()
            };

            await storage.saveData('atBats', updatedAtBat);

            // 統計に影響する変更があれば再計算
            if (detailData.runs !== undefined || detailData.rbis !== undefined) {
                await this.recalculateAllStats();
            }

            await this.saveGame();

            return updatedAtBat;
        } catch (error) {
            console.error('詳細追記エラー:', error);
            throw error;
        }
    }

    // ===== 選手情報編集機能 =====

    /**
     * 選手情報を更新
     * @param {string} team - 'home' または 'away'
     * @param {string} playerId - 選手ID
     * @param {Object} updates - 更新する情報
     */
    async updatePlayerInfo(team, playerId, updates) {
        try {
            // IDの型を統一（文字列として比較）
            const player = this.currentGame.players[team].find(p => String(p.id) === String(playerId));
            if (!player) {
                console.error('Player not found in updatePlayerInfo. playerId:', playerId, 'available IDs:', this.currentGame.players[team].map(p => p.id));
                throw new Error('選手が見つかりません');
            }

            // 選手情報を更新
            if (updates.name !== undefined) player.name = updates.name;
            if (updates.position !== undefined) player.position = updates.position;
            if (updates.battingOrder !== undefined) player.battingOrder = updates.battingOrder;

            // プロフィール情報も更新可能
            if (updates.playerInfo) {
                player.playerInfo = {
                    ...player.playerInfo,
                    ...updates.playerInfo
                };
            }

            // 詳細入力フラグの更新
            if (updates.needsDetailFill !== undefined) {
                player.needsDetailFill = updates.needsDetailFill;
            }

            // データベースに保存
            await storage.saveData('players', player.toJSON ? player.toJSON() : player);
            await this.saveGame();

            return player;
        } catch (error) {
            console.error('選手情報更新エラー:', error);
            throw error;
        }
    }

    /**
     * 全選手の一覧を取得
     */
    getAllPlayers() {
        if (!this.currentGame) return { home: [], away: [] };

        return {
            home: this.currentGame.players.home.map(p => ({
                ...p,
                team: 'home',
                teamName: this.currentGame.homeTeam
            })),
            away: this.currentGame.players.away.map(p => ({
                ...p,
                team: 'away',
                teamName: this.currentGame.awayTeam
            }))
        };
    }

    /**
     * 詳細情報が未入力の選手を取得
     */
    getIncompletePlayers() {
        if (!this.currentGame) return { home: [], away: [] };

        const incompletePlayers = {
            home: this.currentGame.players.home.filter(p => p.needsDetailFill),
            away: this.currentGame.players.away.filter(p => p.needsDetailFill)
        };

        return incompletePlayers;
    }

    /**
     * 簡易スタメン登録（打順のみ）
     * @param {string} team - 'home' または 'away'
     * @param {number} playerCount - 選手人数（9または10）
     */
    createQuickLineup(team, playerCount) {
        const players = [];

        for (let i = 1; i <= playerCount; i++) {
            const player = new Player('', team, null, i);
            player.id = `${team}-player-${i}-${Date.now()}`;
            player.isStarter = true;
            player.isQuickRegistered = true;
            player.needsDetailFill = true;
            players.push(player);
        }

        return players;
    }

    // ゴロアウト用: 走者の強制/自由分類を取得
    getGroundoutRunnerClassification(currentRunners) {
        const has1B = !!currentRunners.first;
        const has2B = !!currentRunners.second;
        const has3B = !!currentRunners.third;

        return {
            first: has1B ? 'forced' : null,  // 1塁走者は常に強制（いる場合）
            second: (has1B && has2B) ? 'forced' : (has2B ? 'optional' : null),  // 1・2塁なら強制、2塁のみなら自由
            third: (has1B && has2B && has3B) ? 'forced' : (has3B ? 'optional' : null)  // 満塁なら強制、3塁のみまたは2・3塁なら自由
        };
    }

    // ゴロアウト用: 走者の進塁選択肢を取得（動的に変化）
    getGroundoutRunnerOptions(base, classification, outsAdded) {
        const isForced = classification === 'forced';
        const isOptional = classification === 'optional';

        if (!classification) return [];

        const options = [];

        if (isForced) {
            // 強制走者: 進塁（セーフ）またはアウト
            switch (base) {
                case 'first':
                    options.push({ value: '2B', label: '2塁進塁' });
                    options.push({ value: '1B-2B-out', label: '1塁→2塁間でアウト' });
                    break;
                case 'second':
                    options.push({ value: '3B', label: '3塁進塁' });
                    options.push({ value: '2B-3B-out', label: '2塁→3塁間でアウト' });
                    break;
                case 'third':
                    options.push({ value: 'home', label: 'ホーム生還' });
                    options.push({ value: '3B-home-out', label: '3塁→本塁間でアウト' });
                    break;
            }
        } else if (isOptional) {
            // 自由走者: 元の塁に留まる、進塁（セーフ）、進塁試みてアウト
            switch (base) {
                case 'first':
                    options.push({ value: 'stay', label: '1塁残留' });
                    options.push({ value: '2B', label: '2塁進塁' });
                    options.push({ value: '1B-2B-out', label: '1塁→2塁間でアウト' });
                    break;
                case 'second':
                    options.push({ value: 'stay', label: '2塁残留' });
                    options.push({ value: '3B', label: '3塁進塁' });
                    options.push({ value: '2B-3B-out', label: '2塁→3塁間でアウト' });
                    break;
                case 'third':
                    options.push({ value: 'stay', label: '3塁残留' });
                    options.push({ value: 'home', label: 'ホーム生還' });
                    options.push({ value: '3B-home-out', label: '3塁→本塁間でアウト' });
                    break;
            }
        }

        return options;
    }

    // フライ/ライナーアウト用: タッチアップ選択肢を取得
    getTagUpOptions(base) {
        const options = [
            { value: 'return', label: '帰塁' }
        ];

        switch (base) {
            case 'first':
                options.push({ value: 'return-out', label: '帰塁失敗（アウト）' });
                options.push({ value: '2B', label: 'タッチアップ→2塁' });
                options.push({ value: '2B-out', label: 'タッチアップ→2塁試みてアウト' });
                break;
            case 'second':
                options.push({ value: 'return-out', label: '帰塁失敗（アウト）' });
                options.push({ value: '3B', label: 'タッチアップ→3塁' });
                options.push({ value: '3B-out', label: 'タッチアップ→3塁試みてアウト' });
                break;
            case 'third':
                options.push({ value: 'return-out', label: '帰塁失敗（アウト）' });
                options.push({ value: 'home', label: 'タッチアップ→ホーム' });
                options.push({ value: 'home-out', label: 'タッチアップ→ホーム試みてアウト' });
                break;
        }

        return options;
    }

    // 三振+振り逃げ: 資格判定
    isDroppedThirdStrikeEligible() {
        if (!this.currentGame) return false;

        const outs = this.currentGame.outs;
        const firstBaseOccupied = !!this.currentGame.runnersOnBase.first;

        // 2アウトの場合は常に資格あり
        if (outs === 2) return true;

        // 0アウトまたは1アウトの場合、1塁が空いていれば資格あり
        if (outs < 2 && !firstBaseOccupied) return true;

        return false;
    }

    // 三振+振り逃げ: 打者の進塁選択肢
    getDroppedThirdStrikeOptions() {
        return [
            { value: '1B', label: '1塁到達（振り逃げ成功）' },
            { value: '1B-out', label: '1塁試みてアウト' },
            { value: 'out', label: '振り逃げ試みず（アウト）' }
        ];
    }
}

const gameManager = new GameManager();
