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

        return this.currentGame;
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

        const inningId = await storage.saveInning(this.currentInning.toJSON());
        this.currentInning.id = inningId;

        this.currentGame.currentInning = inningNumber;
        this.currentGame.isTopHalf = isTopHalf;
        this.currentGame.outs = 0;
        this.currentGame.balls = 0;
        this.currentGame.strikes = 0;

        this.resetRunners();
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
        switch (pitchResult) {
            case 'ball':
                this.currentGame.balls++;
                if (this.currentGame.balls >= 4) {
                    this.recordWalk();
                }
                break;
            case 'strike_looking':
            case 'strike_swinging':
                this.currentGame.strikes++;
                if (this.currentGame.strikes >= 3) {
                    this.recordStrikeout();
                }
                break;
            case 'foul':
                if (this.currentGame.strikes < 2) {
                    this.currentGame.strikes++;
                }
                break;
            case 'hit':
                break;
        }
    }

    async recordAtBatResult(result, resultDetail = '', runs = 0, rbis = 0) {
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

        this.updateInningStats(result, runs);
        this.updatePlayerStats(this.currentAtBat.playerId, result, runs, rbis);

        if (this.isOutResult(result)) {
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

    addRunnerToBase(base, playerId) {
        const baseName = this.getBaseName(base);
        this.currentGame.runnersOnBase[baseName] = playerId;
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

    addRuns(runs) {
        if (this.currentGame.isTopHalf) {
            this.currentGame.awayScore += runs;
        } else {
            this.currentGame.homeScore += runs;
        }
        this.currentInning.runs += runs;
    }

    updateInningStats(result, runs) {
        if (this.isHitResult(result)) {
            this.currentInning.hits++;
        }
        this.currentInning.runs += runs;
    }

    updatePlayerStats(playerId, result, runs, rbis) {
        const team = this.currentGame.isTopHalf ? 'away' : 'home';
        const player = this.currentGame.players[team].find(p => p.id === playerId);

        if (player) {
            player.stats.atBats++;
            if (this.isHitResult(result)) {
                player.stats.hits++;
            }
            player.stats.runs += runs;
            player.stats.rbis += rbis;
            if (result === 'walk') {
                player.stats.walks++;
            }
            if (result === 'strikeout') {
                player.stats.strikeouts++;
            }
        }
    }

    isOutResult(result) {
        return [
            'strikeout', 'groundout', 'flyout', 'lineout',
            'ground_double_play', 'fly_double_play', 'liner_double_play',
            'ground_triple_play', 'fly_triple_play', 'liner_triple_play'
        ].includes(result);
    }

    isHitResult(result) {
        return ['single', 'double', 'triple', 'homerun'].includes(result);
    }

    async endHalfInning() {
        if (!this.currentInning) return;

        this.currentInning.endTime = new Date().toISOString();
        await storage.saveInning(this.currentInning.toJSON());

        // game.innings配列にも追加（メモリ内での履歴保持）
        if (!this.currentGame.innings) {
            this.currentGame.innings = [];
        }
        this.currentGame.innings.push(this.currentInning);

        // 試合継続かどうかをチェック（最終回で敗戦確定の場合は守備位置決定不要）
        const gameWillContinue = this.checkIfGameWillContinue();

        if (this.currentGame.isTopHalf) {
            // 表から裏へ
            // 9回表終了時に後攻（ホーム）がリードしていれば試合終了
            if (this.currentGame.currentInning >= 9 &&
                this.currentGame.homeScore > this.currentGame.awayScore) {
                await this.endGame();
                return;
            }

            if (gameWillContinue) {
                // 代打・代走選手の守備位置決定が必要かチェック
                await this.checkAndHandleSubstitutionPositions('away');
            }
            await this.startInning(this.currentGame.currentInning, false);
        } else {
            // 裏から次の回へ
            if (this.currentGame.currentInning >= 9 &&
                this.currentGame.homeScore !== this.currentGame.awayScore) {
                await this.endGame();
            } else {
                if (gameWillContinue) {
                    // 代打・代走選手の守備位置決定が必要かチェック
                    await this.checkAndHandleSubstitutionPositions('home');
                }
                await this.startInning(this.currentGame.currentInning + 1, true);
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

        // 標準的な9回制ルール
        if (inning >= 9) {
            if (game.isTopHalf) {
                // 9回表終了時点でホームチームがリードしていれば試合終了
                if (game.homeScore > game.awayScore) {
                    return false;
                }
            } else {
                // 9回裏終了時点での判定
                if (game.homeScore !== game.awayScore) {
                    return false; // 勝負が決している
                }
                // 同点の場合は延長戦の設定による
                if (!game.gameRules.extraInnings) {
                    return false; // 延長戦なしの場合は引き分け
                }
            }
        }

        return true; // ゲーム継続
    }

    checkMercyRule() {
        const game = this.currentGame;
        const scoreDiff = Math.abs(game.homeScore - game.awayScore);

        // 5回以降で規定点差以上の場合
        if (game.currentInning >= 5 && scoreDiff >= game.gameRules.mercyRule) {
            return true;
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

    async endGame() {
        if (!this.currentGame) return;

        this.currentGame.status = 'completed';
        await this.saveGame();
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
            name: `${battingOrder}番`,
            team: team
        };
    }

    advanceBattingOrder() {
        if (!this.currentGame) return;

        const team = this.currentGame.isTopHalf ? 'away' : 'home';
        this.currentBattingOrder[team] = (this.currentBattingOrder[team] % 9) + 1;
    }

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
            case 'hit_by_pitch':
                // 四球・死球：押し出しのみ
                if (currentRunners.third && currentRunners.second && currentRunners.first) {
                    runsScored++;
                    newRunners.third = currentRunners.third;
                } else {
                    newRunners.third = currentRunners.third;
                }
                if (currentRunners.second && currentRunners.first) {
                    newRunners.third = currentRunners.second;
                } else {
                    newRunners.second = currentRunners.second;
                }
                if (currentRunners.first) {
                    newRunners.second = currentRunners.first;
                }
                newRunners.first = 'batter';
                batterResult = 1;
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

            default:
                // アウト系：進塁なし
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

        // アウト系で走者がいる場合（封殺・併殺・複雑プレー）
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

        // 全イニングから打席を収集
        for (const inning of this.currentGame.innings) {
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

                // 選手統計を更新
                this.updatePlayerStatsFromAtBat(atBat, battingTeam);
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

        // 選手統計をリセット
        ['home', 'away'].forEach(team => {
            this.currentGame.players[team].forEach(player => {
                if (player.stats) {
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
        if (result === 'strikeout') {
            player.stats.strikeouts++;
        }

        // 犠打・犠飛
        if (result === 'sacrifice_bunt' || result === 'sacrifice_fly') {
            player.stats.sacrifices++;
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
            const player = this.currentGame.players[team].find(p => p.id === playerId);
            if (!player) {
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
}

const gameManager = new GameManager();