// リアルタイムUI更新機能

class RealtimeUI {
    constructor() {
        this.playHistory = [];
        this.maxHistoryItems = 5;
    }

    // カウント表示のドット更新
    updateCountDots(balls, strikes, outs) {
        // ボールカウント更新
        for (let i = 1; i <= 4; i++) {
            const ballDot = document.getElementById(`ball${i}`);
            if (ballDot) {
                if (i <= balls) {
                    ballDot.classList.add('active');
                } else {
                    ballDot.classList.remove('active');
                }
            }
        }

        // ストライクカウント更新
        for (let i = 1; i <= 3; i++) {
            const strikeDot = document.getElementById(`strike${i}`);
            if (strikeDot) {
                if (i <= strikes) {
                    strikeDot.classList.add('active');
                } else {
                    strikeDot.classList.remove('active');
                }
            }
        }

        // アウトカウント更新
        for (let i = 1; i <= 3; i++) {
            const outDot = document.getElementById(`out${i}`);
            if (outDot) {
                if (i <= outs) {
                    outDot.classList.add('active');
                } else {
                    outDot.classList.remove('active');
                }
            }
        }
    }

    // プレー履歴に追加
    addPlay(playData) {
        this.playHistory.unshift(playData);

        // 最大件数を超えたら古いものを削除
        if (this.playHistory.length > this.maxHistoryItems) {
            this.playHistory = this.playHistory.slice(0, this.maxHistoryItems);
        }

        this.renderPlayTimeline();
    }

    // プレー履歴タイムラインを描画
    renderPlayTimeline() {
        const timelineContainer = document.getElementById('timelineItems');
        if (!timelineContainer) return;

        if (this.playHistory.length === 0) {
            timelineContainer.innerHTML = `
                <div class="timeline-item" style="text-align: center; color: #999; font-style: italic;">
                    <span data-i18n="noPlaysYet">${i18n.t('noPlaysYet')}</span>
                </div>
            `;
            return;
        }

        let html = '';
        this.playHistory.forEach((play, index) => {
            const isLatest = index === 0;
            const hasScore = play.runs > 0;
            const classes = ['timeline-item'];

            if (isLatest) classes.push('latest');
            if (hasScore) classes.push('score');

            html += `
                <div class="${classes.join(' ')}">
                    <div class="timeline-header">
                        <span class="timeline-inning">${play.inning}${i18n.t('currentInning')}${play.isTopHalf ? i18n.t('top') : i18n.t('bottom')}</span>
                        <span class="timeline-situation">${play.outs}${i18n.t('outs')} ${this.formatRunners(play.runners)}</span>
                    </div>
                    <div class="timeline-content">
                        <span class="player-name">${play.batterName}</span>
                        <span class="result"> ${this.formatResult(play.result)}</span>
                        ${play.runs > 0 ? `<span class="runs"> ${play.runs}${i18n.t('points')}</span>` : ''}
                    </div>
                </div>
            `;
        });

        timelineContainer.innerHTML = html;
    }

    // 走者状況のフォーマット
    formatRunners(runners) {
        const bases = [];
        if (runners.first) bases.push(i18n.t('firstBaseKanji'));
        if (runners.second) bases.push(i18n.t('secondBaseKanji'));
        if (runners.third) bases.push(i18n.t('thirdBaseKanji'));

        if (bases.length === 0) return i18n.t('noRunners');
        if (bases.length === 3) return i18n.t('basesLoaded');
        return bases.join('・') + i18n.t('basesSuffix');
    }

    // 打席結果のフォーマット
    formatResult(result) {
        const resultMap = {
            'single': i18n.t('singleHit'),
            'double': i18n.t('doubleHit'),
            'triple': i18n.t('tripleHit'),
            'homerun': i18n.t('homeRun'),
            'walk': i18n.t('walkFourBalls'),
            'hit_by_pitch': i18n.t('hitByPitchDead'),
            'strikeout': i18n.t('strikeoutSwing'),
            'groundout': i18n.t('groundBall'),
            'flyout': i18n.t('flyBall'),
            'lineout': i18n.t('lineDrive'),
            'sacrifice_bunt': i18n.t('sacrificeBunt'),
            'sacrifice_fly': i18n.t('sacrificeFly'),
            'ground_double_play': i18n.t('doublePlayGround'),
            'fly_double_play': i18n.t('doublePlayFly'),
            'error': i18n.t('errorPlay')
        };

        return resultMap[result] || result;
    }

    // 得点アニメーション
    animateScore(team) {
        const scoreElement = document.getElementById(team === 'home' ? 'homeScore' : 'awayScore');
        if (scoreElement) {
            scoreElement.classList.add('score-animation');
            setTimeout(() => {
                scoreElement.classList.remove('score-animation');
            }, 1800); // 0.6s × 3回 = 1.8s
        }
    }

    // 走者進塁アニメーション
    animateRunnerAdvance(base) {
        const baseElement = document.getElementById(`base-${base}`);
        if (baseElement) {
            baseElement.classList.add('runner-advance-animation');
            setTimeout(() => {
                baseElement.classList.remove('runner-advance-animation');
            }, 500);
        }
    }

    // 複数走者の進塁アニメーション
    animateMultipleRunners(oldRunners, newRunners) {
        // 各塁の変化をチェック
        const bases = ['first', 'second', 'third'];

        bases.forEach(base => {
            if (oldRunners[base] !== newRunners[base]) {
                this.animateRunnerAdvance(base);
            }
        });
    }

    // 打者ハイライト更新
    updateCurrentBatterHighlight(batterInfo) {
        const currentBatterEl = document.getElementById('current-batter-name');
        if (currentBatterEl && batterInfo) {
            currentBatterEl.textContent = batterInfo.name || `${batterInfo.battingOrder}番`;

            // 親要素にハイライトクラスを追加
            const homePlate = currentBatterEl.closest('.home-plate');
            if (homePlate) {
                homePlate.classList.add('current-batter-highlight');
            }
        }
    }

    // カウント変化のアニメーション（ドットの追加時に自動で光る）
    highlightCountChange(type, count) {
        let elementId;
        if (type === 'ball') {
            elementId = `ball${count}`;
        } else if (type === 'strike') {
            elementId = `strike${count}`;
        } else if (type === 'out') {
            elementId = `out${count}`;
        }

        const element = document.getElementById(elementId);
        if (element) {
            // active クラスが追加されるとCSSのtransitionで自動的にアニメーション
            // 追加で一時的に強調する場合
            element.style.transform = 'scale(1.3)';
            setTimeout(() => {
                element.style.transform = '';
            }, 300);
        }
    }

    // ゲーム状況の包括的更新
    updateGameStatus(gameState) {
        // カウント更新
        this.updateCountDots(gameState.balls, gameState.strikes, gameState.outs);

        // 走者状況更新（既存のコードと連携）
        if (gameState.runnersOnBase) {
            this.updateRunnerDisplay(gameState.runnersOnBase);
        }

        // 現在の打者情報更新
        if (gameState.currentBatter) {
            this.updateCurrentBatterHighlight(gameState.currentBatter);
        }
    }

    // 打者成績の更新
    updateBatterStats(batter, animate = true) {
        if (!batter) return;

        const statsContainer = document.getElementById('currentBatterStats');
        if (!statsContainer) return;

        // アニメーション適用
        if (animate) {
            statsContainer.classList.add('updated');
            setTimeout(() => {
                statsContainer.classList.remove('updated');
            }, 500);
        }

        // 打者番号
        const numberEl = document.getElementById('currentBatterNumber');
        if (numberEl) {
            numberEl.textContent = batter.battingOrder || '-';
        }

        // 打者名
        const nameEl = document.getElementById('currentBatterName');
        if (nameEl) {
            nameEl.textContent = batter.name || `${batter.battingOrder}番`;
        }

        // 守備位置
        const positionEl = document.getElementById('currentBatterPosition');
        if (positionEl) {
            positionEl.textContent = batter.position || '-';
        }

        // 成績計算
        const stats = this.calculateBatterStats(batter);

        // 本日成績（X打数Y安打）
        const todayEl = document.getElementById('todayAtBats');
        if (todayEl) {
            todayEl.textContent = `${stats.hits}-${stats.atBats}`;
            if (animate && stats.justUpdated) {
                todayEl.classList.add('highlight');
                setTimeout(() => todayEl.classList.remove('highlight'), 500);
            }
        }

        // 打率
        const avgEl = document.getElementById('battingAvg');
        if (avgEl) {
            avgEl.textContent = stats.battingAvg;
        }

        // 出塁率
        const obpEl = document.getElementById('onBaseAvg');
        if (obpEl) {
            obpEl.textContent = stats.onBaseAvg;
        }

        // 打点
        const rbiEl = document.getElementById('batterRBI');
        if (rbiEl) {
            rbiEl.textContent = stats.rbis;
            if (animate && stats.rbis > 0) {
                rbiEl.classList.add('highlight');
                setTimeout(() => rbiEl.classList.remove('highlight'), 500);
            }
        }
    }

    // 打者成績の計算
    calculateBatterStats(batter) {
        if (!batter || !batter.stats) {
            return {
                atBats: 0,
                hits: 0,
                rbis: 0,
                walks: 0,
                battingAvg: '.---',
                onBaseAvg: '.---',
                justUpdated: false
            };
        }

        const stats = batter.stats;
        const atBats = stats.atBats || 0;
        const hits = stats.hits || 0;
        const walks = stats.walks || 0;
        const hitByPitch = stats.hitByPitch || 0;
        const rbis = stats.rbis || 0;

        // 打率計算
        let battingAvg = '.---';
        if (atBats > 0) {
            const avg = hits / atBats;
            battingAvg = '.' + Math.floor(avg * 1000).toString().padStart(3, '0');
        }

        // 出塁率計算
        let onBaseAvg = '.---';
        const plateAppearances = atBats + walks + hitByPitch;
        if (plateAppearances > 0) {
            const onBase = hits + walks + hitByPitch;
            const obp = onBase / plateAppearances;
            onBaseAvg = '.' + Math.floor(obp * 1000).toString().padStart(3, '0');
        }

        return {
            atBats,
            hits,
            rbis,
            walks,
            battingAvg,
            onBaseAvg,
            justUpdated: false
        };
    }

    // 走者表示の更新（既存の機能と統合）
    updateRunnerDisplay(runners) {
        const bases = ['first', 'second', 'third'];
        bases.forEach(base => {
            const baseElement = document.getElementById(`base-${base}`);
            const runnerNameElement = document.getElementById(`${base}-runner-name`);

            if (baseElement && runnerNameElement) {
                if (runners[base]) {
                    baseElement.classList.add('occupied');
                    // 走者名を取得して表示
                    const runnerName = this.getPlayerName(runners[base]);
                    runnerNameElement.textContent = runnerName;
                } else {
                    baseElement.classList.remove('occupied');
                    runnerNameElement.textContent = '-';
                }
            }
        });
    }

    // 選手名を取得（ID から名前を取得）
    getPlayerName(playerId) {
        if (!playerId || playerId === 'batter') return i18n.t('runner');

        // gameManager から選手情報を取得
        if (window.gameManager && gameManager.currentGame) {
            const game = gameManager.currentGame;
            const allPlayers = [...game.players.home, ...game.players.away];
            const player = allPlayers.find(p => p.id === playerId);
            if (player) {
                return player.name || `${player.battingOrder}${i18n.t('battingOrderSuffix')}`;
            }
        }

        return i18n.t('runner');
    }

    // 投手情報の更新
    updatePitcherStats(pitcher, pitchCount, animate = true) {
        const statsContainer = document.getElementById('currentPitcherStats');
        if (!statsContainer) return;

        // 球ごと記録レベルの場合のみ表示
        if (window.gameManager && gameManager.currentGame) {
            if (gameManager.currentGame.recordingLevel === 'pitch') {
                statsContainer.style.display = 'block';
            } else {
                statsContainer.style.display = 'none';
                return;
            }
        }

        // アニメーション適用
        if (animate) {
            statsContainer.classList.add('updated');
            setTimeout(() => {
                statsContainer.classList.remove('updated');
            }, 500);
        }

        // 投手情報がない場合
        if (!pitcher) {
            document.getElementById('currentPitcherName').textContent = i18n.t('pitcherName');
            document.getElementById('currentPitcherNumber').textContent = '-';
            document.getElementById('pitchCount').textContent = '0';
            return;
        }

        // 投手番号
        const numberEl = document.getElementById('currentPitcherNumber');
        if (numberEl && pitcher.playerInfo && pitcher.playerInfo.number) {
            numberEl.textContent = pitcher.playerInfo.number;
        } else if (numberEl) {
            numberEl.textContent = pitcher.battingOrder || '-';
        }

        // 投手名
        const nameEl = document.getElementById('currentPitcherName');
        if (nameEl) {
            nameEl.textContent = pitcher.name || i18n.t('pitcherName');
        }

        // 投球数
        const countEl = document.getElementById('pitchCount');
        if (countEl) {
            countEl.textContent = pitchCount;

            // 投球数による警告レベル
            countEl.classList.remove('warning', 'danger');
            if (pitchCount >= 100) {
                countEl.classList.add('danger');
            } else if (pitchCount >= 80) {
                countEl.classList.add('warning');
            }
        }

        // 投手成績の計算・表示
        if (pitcher.stats) {
            const strikeoutsEl = document.getElementById('pitcherStrikeouts');
            if (strikeoutsEl) {
                strikeoutsEl.textContent = pitcher.stats.strikeouts || 0;
            }

            const walksEl = document.getElementById('pitcherWalks');
            if (walksEl) {
                walksEl.textContent = pitcher.stats.walks || 0;
            }

            const hitsEl = document.getElementById('pitcherHits');
            if (hitsEl) {
                hitsEl.textContent = pitcher.stats.hits || 0;
            }

            const erEl = document.getElementById('pitcherER');
            if (erEl) {
                erEl.textContent = pitcher.stats.earnedRuns ?? 0;
            }

            const eraEl = document.getElementById('pitcherERA');
            if (eraEl) {
                eraEl.textContent = gameManager.getERA(pitcher) ?? '-';
            }
        }
    }
}

// グローバルインスタンス作成
const realtimeUI = new RealtimeUI();
