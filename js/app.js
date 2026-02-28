class BaseballApp {
    constructor() {
        this.currentScreen = 'welcomeScreen';
        this.isInitialized = false;
    }

    async init() {
        try {
            await storage.init();
            this.setupEventListeners();
            this.setupServiceWorker();
            this.isInitialized = true;
            console.log('アプリケーション初期化完了');
        } catch (error) {
            console.error('アプリケーション初期化エラー:', error);
            this.showError('アプリケーションの初期化に失敗しました');
        }
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('Service Worker登録成功:', registration.scope);
                })
                .catch((error) => {
                    console.log('Service Worker登録失敗:', error);
                });
        }
    }

    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => {
            this.showScreen('gameSetupScreen');
        });

        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.showScreen('gameSetupScreen');
        });

        document.getElementById('loadGameBtn').addEventListener('click', () => {
            this.loadGamesList();
        });

        document.getElementById('backToWelcome').addEventListener('click', () => {
            this.showScreen('welcomeScreen');
        });

        document.getElementById('gameSetupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startNewGame();
        });

        document.getElementById('saveGame').addEventListener('click', () => {
            this.saveCurrentGame();
        });

        document.getElementById('endGame').addEventListener('click', () => {
            this.endCurrentGame();
        });

        document.getElementById('editPlayersBtn').addEventListener('click', () => {
            this.showPlayerListModal();
        });

        document.getElementById('editTeamInfoBtn').addEventListener('click', () => {
            this.showEditTeamInfoModal();
        });

        // 手動ゲーム制御ボタン
        document.getElementById('noNextInning').addEventListener('click', () => {
            this.setNoNextInning();
        });
        document.getElementById('forceGameEnd').addEventListener('click', () => {
            this.forceGameEnd();
        });
        document.getElementById('showGameTime').addEventListener('click', () => {
            this.showGameTimeInfo();
        });

        document.getElementById('recordingLevel').addEventListener('change', (e) => {
            this.updatePlayerDetailOptions(e.target.value);
        });

        // 言語切り替え
        document.getElementById('languageSelect').addEventListener('change', (e) => {
            i18n.setLanguage(e.target.value);

            // 選手登録画面が表示されている場合は再描画
            if (this.currentScreen === 'gameScreen' &&
                document.querySelector('.player-setup-section')) {
                this.showPlayerSetupScreen();
            }

            // ゲーム進行中の場合はイニング表示を更新
            if (this.currentScreen === 'gameScreen' && gameManager.currentGame) {
                document.getElementById('currentInning').textContent = gameManager.getCurrentInningDisplay();
                this.updateDetailedScoreboard();
                this.updateAttackingTeamHighlight();
            }
        });

        // 初期言語設定
        document.getElementById('languageSelect').value = i18n.getCurrentLanguage();
        i18n.updatePageContent();

        // ベンチモード用イベントリスナー
        this.setupBenchModeListeners();

        // NPBスコアブック切り替え機能
        this.setupNPBScoreboardToggle();
    }

    async startNewGame() {
        const homeTeam = document.getElementById('homeTeam').value;
        const awayTeam = document.getElementById('awayTeam').value;
        const recordingLevel = document.getElementById('recordingLevel').value;
        const playerDetailLevel = document.getElementById('playerDetailLevel').value;
        const recordingMode = document.getElementById('recordingMode').value;

        if (!homeTeam || !awayTeam) {
            this.showError(i18n.t('teamNameRequired'));
            return;
        }

        try {
            await gameManager.createNewGame(homeTeam, awayTeam, recordingLevel, playerDetailLevel, recordingMode);
            this.setupGameScreen();
            this.showScreen('gameScreen');
            this.updateGameDisplay();
        } catch (error) {
            console.error('試合開始エラー:', error);
            this.showError(i18n.t('gameStartError'));
        }
    }

    setupGameScreen() {
        const game = gameManager.currentGame;
        if (!game) return;

        const homeTeamEl = document.getElementById('homeTeamName');
        const awayTeamEl = document.getElementById('awayTeamName');

        homeTeamEl.textContent = game.homeTeam;
        awayTeamEl.textContent = game.awayTeam;

        // data-i18n属性を削除（実際のチーム名が設定されたため）
        homeTeamEl.removeAttribute('data-i18n');
        awayTeamEl.removeAttribute('data-i18n');

        // 初期イニング表示も設定
        document.getElementById('currentInning').textContent = gameManager.getCurrentInningDisplay();

        // 記録レベルと記録モードに応じたクラスを追加
        const gameScreen = document.getElementById('gameScreen');
        gameScreen.className = `screen ${game.recordingLevel}-level ${game.recordingMode}-mode`;

        // チーム統計の初期化（既存データ互換性のため）
        if (!game.teamStats) {
            game.teamStats = {
                home: { hits: 0, errors: 0 },
                away: { hits: 0, errors: 0 }
            };
        }

        // イニング配列の初期化（既存データ互換性のため）
        if (!game.innings) {
            game.innings = [];
        }

        // 詳細スコアボードを初期化
        this.initializeDetailedScoreboard();

        // 攻撃中チームをハイライト
        this.updateAttackingTeamHighlight();

        // 選手交代ボタンの表示制御
        const substitutionBtn = document.getElementById('playerSubstitution');
        if (substitutionBtn) {
            if (game.playerDetailLevel === 'standard' || game.playerDetailLevel === 'detailed') {
                substitutionBtn.style.display = 'inline-block';
                substitutionBtn.addEventListener('click', () => this.showPlayerSubstitutionScreen());
            } else {
                substitutionBtn.style.display = 'none';
            }
        }

        // ベンチモードUIの初期化
        if (game.recordingMode === 'bench') {
            this.initializeBenchMode();
        }

        // 選手詳細レベルに応じて選手設定画面を表示
        if (this.needsPlayerSetup()) {
            this.showPlayerSetupScreen();
        } else {
            this.setupGameContent(game.recordingLevel);
        }
    }

    needsPlayerSetup() {
        const game = gameManager.currentGame;
        if (!game) return false;

        // 基本レベル以上では選手設定が必要
        const needsSetup = ['basic', 'standard', 'detailed'].includes(game.playerDetailLevel) &&
               (!game.players.home.length || !game.players.away.length);

        console.log('needsPlayerSetup - playerDetailLevel:', game.playerDetailLevel);
        console.log('needsPlayerSetup - home players length:', game.players.home.length);
        console.log('needsPlayerSetup - away players length:', game.players.away.length);
        console.log('needsPlayerSetup - result:', needsSetup);

        return needsSetup;
    }

    showPlayerSetupScreen() {
        const game = gameManager.currentGame;
        const gameContent = document.getElementById('gameContent');

        // 標準・詳細レベルの場合はDH制設定を表示
        const dhSetupSection = (game.playerDetailLevel === 'standard' || game.playerDetailLevel === 'detailed') ? `
            <div class="dh-setup-section">
                <h4 data-i18n="dhRuleSetup">${i18n.t('dhRuleSetup')}</h4>
                <div class="dh-options">
                    <label class="dh-option">
                        <input type="radio" name="dhRule" value="true" ${game.dhRule === true ? 'checked' : ''}>
                        <span data-i18n="dhEnabled">${i18n.t('dhEnabled')}</span>
                    </label>
                    <label class="dh-option">
                        <input type="radio" name="dhRule" value="false" ${game.dhRule === false ? 'checked' : ''}>
                        <span data-i18n="dhDisabled">${i18n.t('dhDisabled')}</span>
                    </label>
                </div>
            </div>
        ` : '';

        gameContent.innerHTML = `
            <div class="player-setup-section">
                <h3 data-i18n="playerRegistration">${i18n.t('playerRegistration')}</h3>
                <p data-i18n="setBattingOrderInstructions">${i18n.t('setBattingOrderInstructions')}${game.playerDetailLevel === 'basic' ? ` <span data-i18n="playerNameOptional">${i18n.t('playerNameOptional')}</span>` : ''}</p>

                ${dhSetupSection}

                <div class="team-setup-tabs">
                    <button class="team-tab active" data-team="away">${game.awayTeam}</button>
                    <button class="team-tab" data-team="home">${game.homeTeam}</button>
                </div>

                <div class="team-setup-content">
                    <div class="team-players" id="awayTeamPlayers">
                        <h4>${game.awayTeam} <span data-i18n="battingOrder">${i18n.t('battingOrder')}</span></h4>
                        <div class="batting-order-list" id="awayBattingOrder">
                            ${this.generateBattingOrderInputs('away')}
                        </div>
                        ${game.playerDetailLevel === 'detailed' ? this.generateBenchPlayersSection('away') : ''}
                    </div>

                    <div class="team-players" id="homeTeamPlayers" style="display: none;">
                        <h4>${game.homeTeam} <span data-i18n="battingOrder">${i18n.t('battingOrder')}</span></h4>
                        <div class="batting-order-list" id="homeBattingOrder">
                            ${this.generateBattingOrderInputs('home')}
                        </div>
                        ${game.playerDetailLevel === 'detailed' ? this.generateBenchPlayersSection('home') : ''}
                    </div>
                </div>

                <div class="setup-controls">
                    <button id="completePlayerSetup" class="primary-btn" data-i18n="playerRegistrationComplete">${i18n.t('playerRegistrationComplete')}</button>
                </div>
            </div>
        `;

        // DH制設定変更イベント
        if (game.playerDetailLevel === 'standard' || game.playerDetailLevel === 'detailed') {
            const dhRadios = gameContent.querySelectorAll('input[name="dhRule"]');
            dhRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    game.dhRule = radio.value === 'true';
                    this.updateBattingOrderInputs();
                });
            });

            // 初期設定（デフォルトはDH制なし）
            if (game.dhRule === undefined) {
                game.dhRule = false;
                gameContent.querySelector('input[name="dhRule"][value="false"]').checked = true;
            }
        }

        // タブ切り替えイベント
        const tabs = gameContent.querySelectorAll('.team-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const team = tab.dataset.team;
                gameContent.querySelectorAll('.team-players').forEach(tp => {
                    tp.style.display = 'none';
                });
                gameContent.querySelector(`#${team}TeamPlayers`).style.display = 'block';
            });
        });

        // 詳細レベルの場合、詳細ボタンのイベントリスナーを追加
        if (game.playerDetailLevel === 'detailed') {
            gameContent.addEventListener('click', (e) => {
                if (e.target.classList.contains('detail-btn') && !e.target.classList.contains('bench-detail')) {
                    const team = e.target.dataset.team;
                    const order = parseInt(e.target.dataset.order);
                    this.showPlayerDetailModal(team, order);
                } else if (e.target.classList.contains('bench-detail')) {
                    const team = e.target.dataset.team;
                    const index = parseInt(e.target.dataset.index);
                    this.showBenchPlayerDetailModal(team, index);
                } else if (e.target.classList.contains('add-bench-player')) {
                    const team = e.target.dataset.team;
                    this.addBenchPlayerSlot(team);
                } else if (e.target.classList.contains('remove-btn')) {
                    const team = e.target.dataset.team;
                    const index = parseInt(e.target.dataset.index);
                    this.removeBenchPlayer(team, index);
                }
            });
        }

        // 登録完了ボタン
        gameContent.querySelector('#completePlayerSetup').addEventListener('click', () => {
            this.completePlayerSetup();
        });

        // 動的コンテンツの翻訳を更新
        setTimeout(() => {
            i18n.updatePageContent();
        }, 100);
    }

    updateBattingOrderInputs() {
        const game = gameManager.currentGame;
        const awayContainer = document.getElementById('awayBattingOrder');
        const homeContainer = document.getElementById('homeBattingOrder');

        if (awayContainer) {
            awayContainer.innerHTML = this.generateBattingOrderInputs('away');
        }
        if (homeContainer) {
            homeContainer.innerHTML = this.generateBattingOrderInputs('home');
        }
    }

    generateBattingOrderInputs(team) {
        const game = gameManager.currentGame;
        let html = '';
        const placeholder = game.playerDetailLevel === 'basic' ?
            i18n.t('playerNamePlaceholder') : i18n.t('playerNameRequired');

        // DH制に応じて打順数を決定
        const maxBattingOrder = (game.dhRule === true) ? 10 : 9;

        for (let i = 1; i <= maxBattingOrder; i++) {
            const existingPlayer = game.players[team].find(p => p.battingOrder === i);
            const playerName = existingPlayer ? existingPlayer.name : '';
            const playerPosition = existingPlayer ? existingPlayer.position : '';

            if (game.playerDetailLevel === 'detailed') {
                // 詳細レベル：守備位置＋詳細情報
                const orderLabel = (game.dhRule && i === 10) ?
                    `<span data-i18n="pitcher">${i18n.t('pitcher')}</span>` :
                    `${i}<span data-i18n="playerNumber">${i18n.t('playerNumber')}</span>`;
                html += `
                    <div class="batting-order-item detailed">
                        <span class="order-number">${orderLabel}</span>
                        <div class="player-inputs">
                            <input type="text"
                                   class="player-name-input"
                                   data-team="${team}"
                                   data-order="${i}"
                                   value="${playerName}"
                                   placeholder="${placeholder}"
                                   data-i18n-placeholder="${game.playerDetailLevel === 'basic' ? 'playerNamePlaceholder' : 'playerNameRequired'}"
                                   required>
                            ${(game.dhRule && i === 10) ?
                                `<input type="hidden" class="position-select" data-team="${team}" data-order="${i}" value="P">
                                <span class="fixed-position" data-i18n="pitcher">${i18n.t('pitcher')}</span>` :
                                `<select class="position-select"
                                        data-team="${team}"
                                        data-order="${i}">
                                    <option value="" data-i18n="position">${i18n.t('position')}</option>
                                    ${this.generatePositionOptions(playerPosition)}
                                </select>`}
                            <button type="button" class="detail-btn" data-team="${team}" data-order="${i}">${i18n.t('detail')}</button>
                        </div>
                    </div>
                `;
            } else if (game.playerDetailLevel === 'standard') {
                // 標準レベル：守備位置のみ
                const orderLabel = (game.dhRule && i === 10) ?
                    `<span data-i18n="pitcher">${i18n.t('pitcher')}</span>` :
                    `${i}<span data-i18n="playerNumber">${i18n.t('playerNumber')}</span>`;
                html += `
                    <div class="batting-order-item">
                        <span class="order-number">${orderLabel}</span>
                        <div class="player-inputs">
                            <input type="text"
                                   class="player-name-input"
                                   data-team="${team}"
                                   data-order="${i}"
                                   value="${playerName}"
                                   placeholder="${placeholder}"
                                   data-i18n-placeholder="${game.playerDetailLevel === 'basic' ? 'playerNamePlaceholder' : 'playerNameRequired'}">
                            ${(game.dhRule && i === 10) ?
                                `<input type="hidden" class="position-select" data-team="${team}" data-order="${i}" value="P">
                                <span class="fixed-position" data-i18n="pitcher">${i18n.t('pitcher')}</span>` :
                                `<select class="position-select"
                                        data-team="${team}"
                                        data-order="${i}">
                                    <option value="" data-i18n="position">${i18n.t('position')}</option>
                                    ${this.generatePositionOptions(playerPosition)}
                                </select>`}
                        </div>
                    </div>
                `;
            } else {
                // 基本レベル：名前のみ
                const orderLabel = (game.dhRule && i === 10) ?
                    `<span data-i18n="pitcher">${i18n.t('pitcher')}</span>` :
                    `${i}<span data-i18n="playerNumber">${i18n.t('playerNumber')}</span>`;
                html += `
                    <div class="batting-order-item">
                        <span class="order-number">${orderLabel}</span>
                        <input type="text"
                               class="player-name-input"
                               data-team="${team}"
                               data-order="${i}"
                               value="${playerName}"
                               placeholder="${placeholder}"
                               data-i18n-placeholder="${game.playerDetailLevel === 'basic' ? 'playerNamePlaceholder' : 'playerNameRequired'}">
                    </div>
                `;
            }
        }

        return html;
    }

    generatePositionOptions(selectedPosition) {
        const game = gameManager.currentGame;
        let html = '';

        for (const [key, value] of Object.entries(BASEBALL_CONFIG.POSITIONS)) {
            // DH制なしの場合はDHを除外
            if (key === 'DH' && game.dhRule !== true) {
                continue;
            }
            const selected = selectedPosition === key ? 'selected' : '';
            html += `<option value="${key}" ${selected}>${key}: ${value}</option>`;
        }
        return html;
    }

    generateBenchPlayersSection(team) {
        const game = gameManager.currentGame;
        const teamName = team === 'home' ? game.homeTeam : game.awayTeam;

        return `
            <div class="bench-players-section">
                <h4>${teamName} ${i18n.t('benchPlayers')}</h4>
                <div class="bench-players-list" id="${team}BenchPlayers">
                    ${this.generateBenchPlayerInputs(team)}
                </div>
                <button type="button" class="secondary-btn add-bench-player" data-team="${team}">${i18n.t('addBenchPlayer')}</button>
            </div>
        `;
    }

    generateBenchPlayerInputs(team) {
        const game = gameManager.currentGame;
        const benchPlayers = game.players[team].filter(p => p.isBench);
        let html = '';

        // 既存の控え選手
        benchPlayers.forEach((player, index) => {
            html += `
                <div class="bench-player-item" data-team="${team}" data-index="${index}">
                    <input type="text"
                           class="bench-player-name"
                           value="${player.name}"
                           placeholder="${i18n.t('benchPlayerNamePlaceholder')}"
                           data-team="${team}"
                           data-index="${index}">
                    <button type="button" class="detail-btn bench-detail" data-team="${team}" data-index="${index}">${i18n.t('detail')}</button>
                    <button type="button" class="remove-btn" data-team="${team}" data-index="${index}">${i18n.t('remove')}</button>
                </div>
            `;
        });

        // 新規追加用の空のフィールドを3つ表示
        for (let i = benchPlayers.length; i < benchPlayers.length + 3; i++) {
            html += `
                <div class="bench-player-item" data-team="${team}" data-index="${i}">
                    <input type="text"
                           class="bench-player-name"
                           placeholder="${i18n.t('benchPlayerNamePlaceholder')}"
                           data-team="${team}"
                           data-index="${i}">
                    <button type="button" class="detail-btn bench-detail" data-team="${team}" data-index="${i}">${i18n.t('detail')}</button>
                </div>
            `;
        }

        return html;
    }

    async completePlayerSetup() {
        const game = gameManager.currentGame;
        const playerInputs = document.querySelectorAll('.player-name-input');

        // すべてのレベルで空白を許可（後から追記可能）
        // バリデーションは削除して、常に続行可能に

        try {
            console.log('savePlayerSetup - starting player data creation');
            // 選手データを作成・保存
            game.players.home = [];
            game.players.away = [];

            for (let input of playerInputs) {
                const team = input.dataset.team;
                const order = parseInt(input.dataset.order);
                const name = input.value.trim() || `${order}`; // 空の場合は打順番号のみを使用

                // 簡易登録フラグを設定（名前が未入力の場合）
                const isQuickRegistered = !input.value.trim();

                console.log(`Creating player - team: ${team}, order: ${order}, name: ${name}`);

                // 守備位置を取得（標準・詳細レベルの場合）
                let position = null;
                if (game.playerDetailLevel === 'standard' || game.playerDetailLevel === 'detailed') {
                    // DH制の場合、10番目の選手は自動的にピッチャー
                    if (game.dhRule && order === 10) {
                        position = 'P';
                    } else {
                        const positionSelect = document.querySelector(
                            `.position-select[data-team="${team}"][data-order="${order}"]`
                        );
                        position = positionSelect ? positionSelect.value || null : null;
                    }
                }

                const player = new Player(name, team, position, order);
                player.isStarter = true;
                player.isBench = false;

                // 簡易登録フラグを設定
                if (isQuickRegistered) {
                    player.isQuickRegistered = true;
                    player.needsDetailFill = true;
                }

                player.id = await storage.savePlayer(player.toJSON());

                console.log(`Player created and saved:`, player);
                game.players[team].push(player);
            }

            console.log('savePlayerSetup - final player data:', game.players);

            // 詳細レベルの場合は控え選手も保存
            if (game.playerDetailLevel === 'detailed') {
                const benchInputs = document.querySelectorAll('.bench-player-name');
                for (let input of benchInputs) {
                    const name = input.value.trim();
                    if (name) {
                        const team = input.dataset.team;
                        const player = new Player(name, team, null, null);
                        player.isStarter = false;
                        player.isBench = true;
                        player.id = await storage.savePlayer(player.toJSON());
                        game.players[team].push(player);
                    }
                }
            }

            // 守備位置のバリデーションを削除（空白登録を許可）
            // 後から選手リストモーダルで守備位置を追記可能

            // ゲーム保存
            await gameManager.saveGame();

            // ゲーム画面に遷移
            this.setupGameContent(game.recordingLevel);
            this.showSuccess(i18n.t('playerRegistrationSuccess'));

        } catch (error) {
            console.error('選手登録エラー:', error);
            this.showError(i18n.t('playerRegistrationError'));
        }
    }

    validatePlayerPositions(game) {
        for (const team of ['home', 'away']) {
            const positions = {};
            const teamPlayers = game.players[team];

            for (const player of teamPlayers) {
                if (player.position) {
                    if (positions[player.position]) {
                        return {
                            valid: false,
                            message: `${team === 'home' ? game.homeTeam : game.awayTeam}の守備位置が重複しています: ${BASEBALL_CONFIG.POSITIONS[player.position]}（${player.position}）`
                        };
                    }
                    positions[player.position] = true;
                }
            }

            // 必須ポジションのチェック（ピッチャーとキャッチャー）
            // DH制の場合は守備ピッチャー（1-9番）と打席ピッチャー（10番）が別々
            const hasPitcher = positions['P'] || (game.dhRule && teamPlayers.some(p => p.battingOrder === 10));
            if (!hasPitcher) {
                return {
                    valid: false,
                    message: `${team === 'home' ? game.homeTeam : game.awayTeam}にピッチャーが設定されていません`
                };
            }
            if (!positions['C']) {
                return {
                    valid: false,
                    message: `${team === 'home' ? game.homeTeam : game.awayTeam}にキャッチャーが設定されていません`
                };
            }

            // DH制ありの場合の追加チェック
            if (game.dhRule === true) {
                // 10番目の選手がいることを確認
                const tenthPlayer = teamPlayers.find(p => p.battingOrder === 10);
                if (!tenthPlayer) {
                    return {
                        valid: false,
                        message: `${team === 'home' ? game.homeTeam : game.awayTeam}の10番選手（ピッチャー）が設定されていません`
                    };
                }

                // 10人の選手がいることを確認
                const starterCount = teamPlayers.filter(p => p.isStarter).length;
                if (starterCount < 10) {
                    return {
                        valid: false,
                        message: `${team === 'home' ? game.homeTeam : game.awayTeam}はDH制のため10人の選手が必要です（現在: ${starterCount}人）`
                    };
                }
            } else {
                // 通常制（9人）の場合のチェック
                const starterCount = teamPlayers.filter(p => p.isStarter).length;
                if (starterCount < 9) {
                    return {
                        valid: false,
                        message: `${team === 'home' ? game.homeTeam : game.awayTeam}は9人の選手が必要です（現在: ${starterCount}人）`
                    };
                }
            }
        }

        return { valid: true };
    }

    showPlayerDetailModal(team, order) {
        const game = gameManager.currentGame;
        const existingPlayer = game.players[team].find(p => p.battingOrder === order);
        const teamName = team === 'home' ? game.homeTeam : game.awayTeam;

        const modal = document.createElement('div');
        modal.className = 'modal player-detail-modal';
        modal.innerHTML = `
            <div class="modal-content player-detail-content">
                <h3>選手詳細情報</h3>
                <div class="player-detail-form">
                    <div class="basic-info">
                        <h4>${teamName} ${order}${i18n.t('battingOrderSuffix')}打者</h4>
                        <div class="form-group">
                            <label for="playerName">選手名:</label>
                            <input type="text" id="playerName" value="${existingPlayer?.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="playerNumber">背番号:</label>
                            <input type="number" id="playerNumber" value="${existingPlayer?.playerInfo?.number || ''}" min="0" max="99">
                        </div>
                    </div>

                    <div class="physical-info">
                        <h4>身体情報</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="playerHeight">身長(cm):</label>
                                <input type="number" id="playerHeight" value="${existingPlayer?.playerInfo?.height || ''}" min="100" max="250">
                            </div>
                            <div class="form-group">
                                <label for="playerWeight">体重(kg):</label>
                                <input type="number" id="playerWeight" value="${existingPlayer?.playerInfo?.weight || ''}" min="30" max="200">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="playerBirthDate">生年月日:</label>
                            <input type="date" id="playerBirthDate" value="${existingPlayer?.playerInfo?.birthDate || ''}">
                        </div>
                    </div>

                    <div class="baseball-info">
                        <h4>野球情報</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="throwingHand">投げ:</label>
                                <select id="throwingHand">
                                    <option value="right" ${existingPlayer?.playerInfo?.throwingHand === 'right' ? 'selected' : ''}>右</option>
                                    <option value="left" ${existingPlayer?.playerInfo?.throwingHand === 'left' ? 'selected' : ''}>左</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="battingHand">打ち:</label>
                                <select id="battingHand">
                                    <option value="right" ${existingPlayer?.playerInfo?.battingHand === 'right' ? 'selected' : ''}>右</option>
                                    <option value="left" ${existingPlayer?.playerInfo?.battingHand === 'left' ? 'selected' : ''}>左</option>
                                    <option value="switch" ${existingPlayer?.playerInfo?.battingHand === 'switch' ? 'selected' : ''}>両</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="playerExperience">経験年数:</label>
                            <input type="number" id="playerExperience" value="${existingPlayer?.playerInfo?.experience || ''}" min="0" max="50">
                        </div>
                    </div>

                    <div class="notes-info">
                        <div class="form-group">
                            <label for="playerNotes">備考:</label>
                            <textarea id="playerNotes" placeholder="その他の情報やメモ">${existingPlayer?.playerInfo?.notes || ''}</textarea>
                        </div>
                    </div>
                </div>

                <div class="modal-buttons">
                    <button type="button" class="secondary-btn" onclick="this.closest('.modal').remove()">キャンセル</button>
                    <button type="button" class="primary-btn" id="savePlayerDetail">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 保存ボタンのイベントリスナー
        modal.querySelector('#savePlayerDetail').addEventListener('click', () => {
            this.savePlayerDetailInfo(team, order, modal);
        });

        // 名前フィールドにフォーカス
        modal.querySelector('#playerName').focus();
    }

    savePlayerDetailInfo(team, order, modal) {
        const game = gameManager.currentGame;
        const playerName = modal.querySelector('#playerName').value.trim();

        if (!playerName) {
            this.showError('選手名を入力してください');
            return;
        }

        // 選手データを更新または作成
        let player = game.players[team].find(p => p.battingOrder === order);
        if (!player) {
            player = new Player(playerName, team, null, order);
            game.players[team].push(player);
        } else {
            player.name = playerName;
        }

        // 詳細情報を更新
        player.playerInfo = {
            number: modal.querySelector('#playerNumber').value || null,
            birthDate: modal.querySelector('#playerBirthDate').value || null,
            height: modal.querySelector('#playerHeight').value || null,
            weight: modal.querySelector('#playerWeight').value || null,
            throwingHand: modal.querySelector('#throwingHand').value,
            battingHand: modal.querySelector('#battingHand').value,
            experience: modal.querySelector('#playerExperience').value || null,
            notes: modal.querySelector('#playerNotes').value || ''
        };

        // データベースに保存
        if (player.id) {
            // 既存選手の更新
            storage.savePlayer(player.toJSON());
        } else {
            // 新規選手の保存
            storage.savePlayer(player.toJSON()).then(id => {
                player.id = id;
                console.log('Player saved with ID:', id, player);
            });
        }

        // ゲームデータも保存
        gameManager.saveGame();

        // UI更新
        const nameInput = document.querySelector(`.player-name-input[data-team="${team}"][data-order="${order}"]`);
        if (nameInput) {
            nameInput.value = playerName;
        }

        modal.remove();
        this.showSuccess('選手情報を保存しました');
    }

    showBenchPlayerDetailModal(team, index) {
        const game = gameManager.currentGame;
        const benchPlayers = game.players[team].filter(p => p.isBench);
        const existingPlayer = benchPlayers[index];
        const teamName = team === 'home' ? game.homeTeam : game.awayTeam;

        // 名前が入力されていない場合の対応
        const nameInput = document.querySelector(`.bench-player-name[data-team="${team}"][data-index="${index}"]`);
        const currentName = nameInput ? nameInput.value.trim() : '';

        const modal = document.createElement('div');
        modal.className = 'modal player-detail-modal bench-player-modal';
        modal.innerHTML = `
            <div class="modal-content player-detail-content">
                <h3>控え選手詳細情報</h3>
                <div class="player-detail-form">
                    <div class="basic-info">
                        <h4>${teamName} 控え選手</h4>
                        <div class="form-group">
                            <label for="benchPlayerName">選手名:</label>
                            <input type="text" id="benchPlayerName" value="${existingPlayer?.name || currentName}" required>
                        </div>
                        <div class="form-group">
                            <label for="benchPlayerNumber">背番号:</label>
                            <input type="number" id="benchPlayerNumber" value="${existingPlayer?.playerInfo?.number || ''}" min="0" max="99">
                        </div>
                    </div>

                    <div class="physical-info">
                        <h4>身体情報</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="benchPlayerHeight">身長(cm):</label>
                                <input type="number" id="benchPlayerHeight" value="${existingPlayer?.playerInfo?.height || ''}" min="100" max="250">
                            </div>
                            <div class="form-group">
                                <label for="benchPlayerWeight">体重(kg):</label>
                                <input type="number" id="benchPlayerWeight" value="${existingPlayer?.playerInfo?.weight || ''}" min="30" max="200">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="benchPlayerBirthDate">生年月日:</label>
                            <input type="date" id="benchPlayerBirthDate" value="${existingPlayer?.playerInfo?.birthDate || ''}">
                        </div>
                    </div>

                    <div class="baseball-info">
                        <h4>野球情報</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="benchThrowingHand">投げ:</label>
                                <select id="benchThrowingHand">
                                    <option value="right" ${existingPlayer?.playerInfo?.throwingHand === 'right' ? 'selected' : ''}>右</option>
                                    <option value="left" ${existingPlayer?.playerInfo?.throwingHand === 'left' ? 'selected' : ''}>左</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="benchBattingHand">打ち:</label>
                                <select id="benchBattingHand">
                                    <option value="right" ${existingPlayer?.playerInfo?.battingHand === 'right' ? 'selected' : ''}>右</option>
                                    <option value="left" ${existingPlayer?.playerInfo?.battingHand === 'left' ? 'selected' : ''}>左</option>
                                    <option value="switch" ${existingPlayer?.playerInfo?.battingHand === 'switch' ? 'selected' : ''}>両</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="benchPlayerExperience">経験年数:</label>
                            <input type="number" id="benchPlayerExperience" value="${existingPlayer?.playerInfo?.experience || ''}" min="0" max="50">
                        </div>
                    </div>

                    <div class="notes-info">
                        <div class="form-group">
                            <label for="benchPlayerNotes">備考:</label>
                            <textarea id="benchPlayerNotes" placeholder="その他の情報やメモ">${existingPlayer?.playerInfo?.notes || ''}</textarea>
                        </div>
                    </div>
                </div>

                <div class="modal-buttons">
                    <button type="button" class="secondary-btn" onclick="this.closest('.modal').remove()">キャンセル</button>
                    <button type="button" class="primary-btn" id="saveBenchPlayerDetail">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 保存ボタンのイベントリスナー
        modal.querySelector('#saveBenchPlayerDetail').addEventListener('click', () => {
            this.saveBenchPlayerDetailInfo(team, index, modal);
        });

        // 名前フィールドにフォーカス
        modal.querySelector('#benchPlayerName').focus();
    }

    saveBenchPlayerDetailInfo(team, index, modal) {
        const game = gameManager.currentGame;
        const playerName = modal.querySelector('#benchPlayerName').value.trim();

        if (!playerName) {
            this.showError('選手名を入力してください');
            return;
        }

        // 控え選手データを更新または作成
        let benchPlayers = game.players[team].filter(p => p.isBench);
        let player = benchPlayers[index];

        if (!player) {
            player = new Player(playerName, team, null, null);
            player.isBench = true;
            player.isStarter = false;
            game.players[team].push(player);
        } else {
            player.name = playerName;
        }

        // 詳細情報を更新
        player.playerInfo = {
            number: modal.querySelector('#benchPlayerNumber').value || null,
            birthDate: modal.querySelector('#benchPlayerBirthDate').value || null,
            height: modal.querySelector('#benchPlayerHeight').value || null,
            weight: modal.querySelector('#benchPlayerWeight').value || null,
            throwingHand: modal.querySelector('#benchThrowingHand').value,
            battingHand: modal.querySelector('#benchBattingHand').value,
            experience: modal.querySelector('#benchPlayerExperience').value || null,
            notes: modal.querySelector('#benchPlayerNotes').value || ''
        };

        // UI更新
        const nameInput = document.querySelector(`.bench-player-name[data-team="${team}"][data-index="${index}"]`);
        if (nameInput) {
            nameInput.value = playerName;
        }

        modal.remove();
        this.showSuccess('控え選手情報を保存しました');
    }

    addBenchPlayerSlot(team) {
        const container = document.getElementById(`${team}BenchPlayers`);
        const currentItems = container.querySelectorAll('.bench-player-item');
        const newIndex = currentItems.length;

        const newItem = document.createElement('div');
        newItem.className = 'bench-player-item';
        newItem.innerHTML = `
            <input type="text"
                   class="bench-player-name"
                   placeholder="控え選手名"
                   data-team="${team}"
                   data-index="${newIndex}">
            <button type="button" class="detail-btn bench-detail" data-team="${team}" data-index="${newIndex}">詳細</button>
            <button type="button" class="remove-btn" data-team="${team}" data-index="${newIndex}">削除</button>
        `;

        container.appendChild(newItem);
    }

    removeBenchPlayer(team, index) {
        const game = gameManager.currentGame;
        const benchPlayers = game.players[team].filter(p => p.isBench);

        if (benchPlayers[index]) {
            // データからも削除
            const playerToRemove = benchPlayers[index];
            const playerIndex = game.players[team].indexOf(playerToRemove);
            if (playerIndex > -1) {
                game.players[team].splice(playerIndex, 1);
            }
        }

        // UIの更新
        this.refreshBenchPlayersDisplay(team);
    }

    refreshBenchPlayersDisplay(team) {
        const container = document.getElementById(`${team}BenchPlayers`);
        if (container) {
            container.innerHTML = this.generateBenchPlayerInputs(team);
        }
    }

    showPlayerSubstitutionScreen() {
        const game = gameManager.currentGame;
        const battingTeam = game.isTopHalf ? 'away' : 'home';
        const fieldingTeam = game.isTopHalf ? 'home' : 'away';

        const modal = document.createElement('div');
        modal.className = 'modal substitution-modal';
        modal.innerHTML = `
            <div class="modal-content substitution-modal-content">
                <h3>${i18n.t('substitutionModalTitle')}</h3>

                <div class="team-situation">
                    <div class="situation-info">
                        <span class="batting-team">${i18n.t('offense')}: ${game.isTopHalf ? game.awayTeam : game.homeTeam}</span>
                        <span class="fielding-team">${i18n.t('defense')}: ${game.isTopHalf ? game.homeTeam : game.awayTeam}</span>
                    </div>
                </div>

                <div class="substitution-tabs">
                    <button class="sub-tab active" data-type="batting">${i18n.t('offensiveSubstitution')}</button>
                    <button class="sub-tab" data-type="fielding">${i18n.t('defensiveSubstitution')}</button>
                </div>

                <div class="team-selection" style="display: none;">
                    <label>${i18n.t('targetTeam')}:</label>
                    <select id="substitutionTeam">
                        <option value="home">${game.homeTeam}</option>
                        <option value="away">${game.awayTeam}</option>
                    </select>
                </div>

                <div class="substitution-content">
                    <div id="battingContent" class="sub-content active">
                        <h4>${i18n.t('offensiveSubstitution')}</h4>
                        <div class="batting-substitutions">
                            <div class="pinch-hitter-section">
                                <h5>${i18n.t('pinchHitter')}</h5>
                                <p>${i18n.t('pinchHitterDesc')}</p>
                                <div id="pinchHitterArea"></div>
                            </div>
                            <div class="pinch-runner-section">
                                <h5>${i18n.t('pinchRunner')}</h5>
                                <p>${i18n.t('pinchRunnerDesc')}</p>
                                <div id="pinchRunnerArea"></div>
                            </div>
                        </div>
                    </div>

                    <div id="fieldingContent" class="sub-content">
                        <h4>${i18n.t('defensiveSubstitution')}</h4>
                        <div class="fielding-tabs">
                            <button class="fielding-tab active" data-field-type="position-swap">${i18n.t('positionSwap')}</button>
                            <button class="fielding-tab" data-field-type="player-change">選手変更</button>
                            <button class="fielding-tab" data-field-type="combination">組み合わせ</button>
                        </div>
                        <div class="fielding-content">
                            <div id="fieldingPositionSwap" class="fielding-sub-content active">
                                <p>現在のラインナップ内で守備位置を変更します</p>
                                <div id="fieldingPositionSwapArea"></div>
                            </div>
                            <div id="fieldingPlayerChange" class="fielding-sub-content">
                                <p>現在の選手を新しい選手に交代します</p>
                                <div id="fieldingPlayerChangeArea"></div>
                            </div>
                            <div id="fieldingCombination" class="fielding-sub-content">
                                <p>新しい選手の投入と既存選手の守備位置変更を同時に行います</p>
                                <div id="fieldingCombinationArea"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-buttons">
                    <button id="executeSubstitution" class="primary-btn">実行</button>
                    <button id="cancelSubstitution" class="secondary-btn">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // メインタブ切り替え（攻撃側・守備側）
        const tabs = modal.querySelectorAll('.sub-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                modal.querySelectorAll('.sub-content').forEach(content => {
                    content.classList.remove('active');
                });
                modal.querySelector(`#${tab.dataset.type}Content`).classList.add('active');

                this.updateSubstitutionContent(tab.dataset.type, battingTeam, fieldingTeam);
            });
        });

        // 守備側サブタブ切り替え
        const fieldingTabs = modal.querySelectorAll('.fielding-tab');
        fieldingTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                fieldingTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                modal.querySelectorAll('.fielding-sub-content').forEach(content => {
                    content.classList.remove('active');
                });
                modal.querySelector(`#fielding${tab.dataset.fieldType.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)).join('')}`).classList.add('active');

                this.updateFieldingSubstitutionContent(tab.dataset.fieldType, fieldingTeam);
            });
        });

        // ボタンイベント
        modal.querySelector('#executeSubstitution').addEventListener('click', () => {
            this.executeSubstitution(modal);
        });

        modal.querySelector('#cancelSubstitution').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // 初期コンテンツ読み込み
        this.updateSubstitutionContent('batting', battingTeam, fieldingTeam);
    }

    updateSubstitutionContent(type, battingTeam, fieldingTeam) {
        const game = gameManager.currentGame;

        switch (type) {
            case 'batting':
                this.showBattingSubstitutionContent(battingTeam);
                break;
            case 'fielding':
                this.updateFieldingSubstitutionContent('position-swap', fieldingTeam);
                break;
        }
    }

    showBattingSubstitutionContent(battingTeam) {
        const game = gameManager.currentGame;
        const battingPlayers = game.players[battingTeam];
        const currentBatter = gameManager.getCurrentBatter();
        const runners = game.runnersOnBase;

        // 代打エリア
        const pinchHitterArea = document.getElementById('pinchHitterArea');
        pinchHitterArea.innerHTML = `
            <div class="pinch-hitter-controls">
                <div class="current-batter-info">
                    <span>現在の打者: ${currentBatter ? `${currentBatter.battingOrder}${i18n.t('battingOrderSuffix')} ${currentBatter.name}` : '情報なし'}</span>
                </div>
                <div class="pinch-hitter-input">
                    <label>
                        <input type="checkbox" id="usePinchHitter">
                        代打を使用する
                    </label>
                    <input type="text" id="pinchHitterName" placeholder="代打選手名" disabled>
                </div>
            </div>
        `;

        // 代走エリア
        const pinchRunnerArea = document.getElementById('pinchRunnerArea');
        const runnerOptions = [];

        if (runners.first) runnerOptions.push({ base: 'first', name: runners.first });
        if (runners.second) runnerOptions.push({ base: 'second', name: runners.second });
        if (runners.third) runnerOptions.push({ base: 'third', name: runners.third });

        pinchRunnerArea.innerHTML = `
            <div class="pinch-runner-controls">
                ${runnerOptions.length > 0 ? `
                    <div class="current-runners">
                        <h6>現在の走者:</h6>
                        ${runnerOptions.map(runner => `
                            <div class="runner-substitution">
                                <div class="runner-info">
                                    <span>${runner.base === 'first' ? '1塁' : runner.base === 'second' ? '2塁' : '3塁'}: ${runner.name}</span>
                                </div>
                                <div class="runner-controls">
                                    <label>
                                        <input type="checkbox" class="pinch-runner-checkbox" data-base="${runner.base}">
                                        代走
                                    </label>
                                    <input type="text" class="pinch-runner-name" data-base="${runner.base}" placeholder="代走選手名" disabled>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p>現在走者はいません</p>'}
            </div>
        `;

        // イベントリスナー設定
        const pinchHitterCheckbox = document.getElementById('usePinchHitter');
        const pinchHitterInput = document.getElementById('pinchHitterName');

        pinchHitterCheckbox.addEventListener('change', () => {
            pinchHitterInput.disabled = !pinchHitterCheckbox.checked;
            if (!pinchHitterCheckbox.checked) pinchHitterInput.value = '';
        });

        // 代走チェックボックス
        document.querySelectorAll('.pinch-runner-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const input = document.querySelector(`.pinch-runner-name[data-base="${e.target.dataset.base}"]`);
                input.disabled = !e.target.checked;
                if (!e.target.checked) input.value = '';
            });
        });
    }

    updateFieldingSubstitutionContent(type, fieldingTeam) {
        const game = gameManager.currentGame;
        const fieldingPlayers = game.players[fieldingTeam];

        switch (type) {
            case 'position-swap':
                this.showFieldingPositionSwap(fieldingPlayers);
                break;
            case 'player-change':
                this.showFieldingPlayerChange(fieldingPlayers);
                break;
            case 'combination':
                this.showFieldingCombination(fieldingPlayers);
                break;
        }
    }

    showFieldingPositionSwap(players) {
        const area = document.getElementById('fieldingPositionSwapArea');
        area.innerHTML = `
            <div class="current-lineup">
                <h6>現在のラインナップ</h6>
                <div class="lineup-grid">
                    ${players.map(player => `
                        <div class="lineup-item" data-player-id="${player.id}">
                            <div class="player-info">
                                <span class="batting-order">${player.battingOrder}${i18n.t('battingOrderSuffix')}</span>
                                <span class="player-name">${player.name}</span>
                                <span class="position">${BASEBALL_CONFIG.POSITIONS[player.position]}</span>
                            </div>
                            <select class="new-position" data-player-id="${player.id}">
                                ${this.generatePositionOptions(player.position)}
                            </select>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    showFieldingPlayerChange(players) {
        const area = document.getElementById('fieldingPlayerChangeArea');
        area.innerHTML = `
            <div class="player-changes">
                <h6>選手変更</h6>
                ${players.map(player => `
                    <div class="change-item">
                        <div class="current-player">
                            <span>${player.battingOrder}${i18n.t('battingOrderSuffix')} ${player.name} (${BASEBALL_CONFIG.POSITIONS[player.position]})</span>
                        </div>
                        <div class="change-controls">
                            <label>
                                <input type="checkbox" class="change-checkbox" data-player-id="${player.id}">
                                交代する
                            </label>
                            <input type="text" class="new-player-name" data-player-id="${player.id}" placeholder="新しい選手名" disabled>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // チェックボックスの制御
        area.querySelectorAll('.change-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const input = area.querySelector(`.new-player-name[data-player-id="${e.target.dataset.playerId}"]`);
                input.disabled = !e.target.checked;
                if (!e.target.checked) input.value = '';
            });
        });
    }

    showFieldingCombination(players) {
        const area = document.getElementById('fieldingCombinationArea');
        area.innerHTML = `
            <div class="combination-changes">
                <h6>選手変更+守備位置調整</h6>
                ${players.map(player => `
                    <div class="combo-item">
                        <div class="current-info">
                            <span>${player.battingOrder}${i18n.t('battingOrderSuffix')} ${player.name} (${BASEBALL_CONFIG.POSITIONS[player.position]})</span>
                        </div>
                        <div class="combo-controls">
                            <label>
                                <input type="checkbox" class="combo-change-checkbox" data-player-id="${player.id}">
                                選手交代
                            </label>
                            <input type="text" class="combo-new-name" data-player-id="${player.id}" placeholder="新しい選手名" disabled>
                            <select class="combo-new-position" data-player-id="${player.id}">
                                ${this.generatePositionOptions(player.position)}
                            </select>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // チェックボックスの制御
        area.querySelectorAll('.combo-change-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const input = area.querySelector(`.combo-new-name[data-player-id="${e.target.dataset.playerId}"]`);
                input.disabled = !e.target.checked;
                if (!e.target.checked) input.value = '';
            });
        });
    }

    showPositionSwapContent(modal, players) {
        const area = modal.querySelector('#positionSwapArea');
        area.innerHTML = `
            <div class="current-lineup">
                <h5>現在のラインナップ</h5>
                <div class="lineup-grid">
                    ${players.map(player => `
                        <div class="lineup-item" data-player-id="${player.id}">
                            <div class="player-info">
                                <span class="batting-order">${player.battingOrder}${i18n.t('battingOrderSuffix')}</span>
                                <span class="player-name">${player.name}</span>
                                <span class="position">${BASEBALL_CONFIG.POSITIONS[player.position]}</span>
                            </div>
                            <select class="new-position" data-player-id="${player.id}">
                                ${this.generatePositionOptions(player.position)}
                            </select>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    showPlayerChangeContent(modal, players) {
        const area = modal.querySelector('#playerChangeArea');
        area.innerHTML = `
            <div class="player-changes">
                <h5>選手変更</h5>
                ${players.map(player => `
                    <div class="change-item">
                        <div class="current-player">
                            <span>${player.battingOrder}${i18n.t('battingOrderSuffix')} ${player.name} (${BASEBALL_CONFIG.POSITIONS[player.position]})</span>
                        </div>
                        <div class="change-controls">
                            <label>
                                <input type="checkbox" class="change-checkbox" data-player-id="${player.id}">
                                交代する
                            </label>
                            <input type="text" class="new-player-name" data-player-id="${player.id}" placeholder="新しい選手名" disabled>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // チェックボックスの制御
        area.querySelectorAll('.change-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const input = area.querySelector(`.new-player-name[data-player-id="${e.target.dataset.playerId}"]`);
                input.disabled = !e.target.checked;
                if (!e.target.checked) input.value = '';
            });
        });
    }

    showCombinationContent(modal, players) {
        const area = modal.querySelector('#combinationArea');
        area.innerHTML = `
            <div class="combination-changes">
                <h5>選手変更+守備位置調整</h5>
                ${players.map(player => `
                    <div class="combo-item">
                        <div class="current-info">
                            <span>${player.battingOrder}${i18n.t('battingOrderSuffix')} ${player.name} (${BASEBALL_CONFIG.POSITIONS[player.position]})</span>
                        </div>
                        <div class="combo-controls">
                            <label>
                                <input type="checkbox" class="combo-change-checkbox" data-player-id="${player.id}">
                                選手交代
                            </label>
                            <input type="text" class="combo-new-name" data-player-id="${player.id}" placeholder="新しい選手名" disabled>
                            <select class="combo-new-position" data-player-id="${player.id}">
                                ${this.generatePositionOptions(player.position)}
                            </select>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // チェックボックスの制御
        area.querySelectorAll('.combo-change-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const input = area.querySelector(`.combo-new-name[data-player-id="${e.target.dataset.playerId}"]`);
                input.disabled = !e.target.checked;
                if (!e.target.checked) input.value = '';
            });
        });
    }

    async executeSubstitution(modal) {
        const activeTab = modal.querySelector('.sub-tab.active');
        const type = activeTab.dataset.type;
        const game = gameManager.currentGame;
        const battingTeam = game.isTopHalf ? 'away' : 'home';
        const fieldingTeam = game.isTopHalf ? 'home' : 'away';

        try {
            switch (type) {
                case 'batting':
                    await this.executeBattingSubstitution(modal, battingTeam);
                    break;
                case 'fielding':
                    await this.executeFieldingSubstitution(modal, fieldingTeam);
                    break;
            }

            await gameManager.saveGame();
            this.updateGameDisplay();
            document.body.removeChild(modal);
            this.showSuccess('選手交代を実行しました');

        } catch (error) {
            console.error('選手交代エラー:', error);
            this.showError('選手交代の実行に失敗しました: ' + error.message);
        }
    }

    async executeBattingSubstitution(modal, battingTeam) {
        const game = gameManager.currentGame;
        const currentBatter = gameManager.getCurrentBatter();

        // 代打処理
        const usePinchHitter = modal.querySelector('#usePinchHitter').checked;
        const pinchHitterName = modal.querySelector('#pinchHitterName').value.trim();

        if (usePinchHitter) {
            if (!pinchHitterName) {
                throw new Error('代打選手名を入力してください');
            }

            // 現在の打者を代打に交代
            const battingPlayer = game.players[battingTeam].find(p => p.battingOrder === currentBatter.battingOrder);
            if (battingPlayer) {
                battingPlayer.name = pinchHitterName;
                battingPlayer.position = '打'; // 代打マーク
                await storage.savePlayer(battingPlayer.toJSON());
            }
        }

        // 代走処理
        const runnerCheckboxes = modal.querySelectorAll('.pinch-runner-checkbox:checked');
        for (const checkbox of runnerCheckboxes) {
            const base = checkbox.dataset.base;
            const runnerNameInput = modal.querySelector(`.pinch-runner-name[data-base="${base}"]`);
            const runnerName = runnerNameInput.value.trim();

            if (!runnerName) {
                throw new Error(`${base === 'first' ? '1塁' : base === 'second' ? '2塁' : '3塁'}の代走選手名を入力してください`);
            }

            // 走者を代走に交代
            game.runnersOnBase[base] = runnerName;

            // 代走選手として記録（暫定的に位置は'走'とする）
            const newRunner = new Player(runnerName, battingTeam, '走', null);
            newRunner.id = await storage.savePlayer(newRunner.toJSON());
            game.players[battingTeam].push(newRunner);
        }
    }

    async executeFieldingSubstitution(modal, fieldingTeam) {
        const activeFieldingTab = modal.querySelector('.fielding-tab.active');
        const fieldingType = activeFieldingTab.dataset.fieldType;

        switch (fieldingType) {
            case 'position-swap':
                await this.executeFieldingPositionSwap(modal, fieldingTeam);
                break;
            case 'player-change':
                await this.executeFieldingPlayerChange(modal, fieldingTeam);
                break;
            case 'combination':
                await this.executeFieldingCombination(modal, fieldingTeam);
                break;
        }
    }

    async executeFieldingPositionSwap(modal, fieldingTeam) {
        const game = gameManager.currentGame;
        const players = game.players[fieldingTeam];
        const changes = {};

        // 新しい守備位置を収集
        modal.querySelectorAll('.new-position').forEach(select => {
            const playerId = select.dataset.playerId;
            const newPosition = select.value;
            if (newPosition) {
                changes[playerId] = newPosition;
            }
        });

        // 重複チェック
        const positions = Object.values(changes);
        const uniquePositions = [...new Set(positions)];
        if (positions.length !== uniquePositions.length) {
            throw new Error('守備位置が重複しています');
        }

        // 変更を適用
        for (const [playerId, newPosition] of Object.entries(changes)) {
            const player = players.find(p => p.id === playerId);
            if (player) {
                player.position = newPosition;
                await storage.savePlayer(player.toJSON());
            }
        }
    }

    async executeFieldingPlayerChange(modal, fieldingTeam) {
        const game = gameManager.currentGame;
        const players = game.players[fieldingTeam];

        const checkboxes = modal.querySelectorAll('.change-checkbox:checked');
        for (const checkbox of checkboxes) {
            const playerId = checkbox.dataset.playerId;
            const newNameInput = modal.querySelector(`.new-player-name[data-player-id="${playerId}"]`);
            const newName = newNameInput.value.trim();

            if (!newName) {
                throw new Error('新しい選手名を入力してください');
            }

            const player = players.find(p => p.id === playerId);
            if (player) {
                player.name = newName;
                await storage.savePlayer(player.toJSON());
            }
        }
    }

    async executeFieldingCombination(modal, fieldingTeam) {
        const game = gameManager.currentGame;
        const players = game.players[fieldingTeam];
        const positionChanges = {};

        // 全ての変更を収集
        modal.querySelectorAll('.combo-item').forEach(item => {
            const playerId = item.querySelector('.combo-change-checkbox').dataset.playerId;
            const isChanging = item.querySelector('.combo-change-checkbox').checked;
            const newName = item.querySelector('.combo-new-name').value.trim();
            const newPosition = item.querySelector('.combo-new-position').value;

            const player = players.find(p => p.id === playerId);
            if (player) {
                if (isChanging && newName) {
                    player.name = newName;
                }
                if (newPosition && newPosition !== player.position) {
                    positionChanges[playerId] = newPosition;
                }
            }
        });

        // 守備位置重複チェック
        const positions = Object.values(positionChanges);
        const currentPositions = players.filter(p => !positionChanges[p.id]).map(p => p.position);
        const allPositions = [...positions, ...currentPositions];
        const uniquePositions = [...new Set(allPositions)];
        if (allPositions.length !== uniquePositions.length) {
            throw new Error('守備位置が重複しています');
        }

        // 変更を適用
        for (const player of players) {
            if (positionChanges[player.id]) {
                player.position = positionChanges[player.id];
            }
            await storage.savePlayer(player.toJSON());
        }
    }

    async executePositionSwap(modal, team) {
        const game = gameManager.currentGame;
        const players = game.players[team];
        const changes = {};

        // 新しい守備位置を収集
        modal.querySelectorAll('.new-position').forEach(select => {
            const playerId = select.dataset.playerId;
            const newPosition = select.value;
            if (newPosition) {
                changes[playerId] = newPosition;
            }
        });

        // 重複チェック
        const positions = Object.values(changes);
        const uniquePositions = [...new Set(positions)];
        if (positions.length !== uniquePositions.length) {
            throw new Error('守備位置が重複しています');
        }

        // 変更を適用
        for (const [playerId, newPosition] of Object.entries(changes)) {
            const player = players.find(p => p.id === playerId);
            if (player) {
                player.position = newPosition;
                await storage.savePlayer(player.toJSON());
            }
        }
    }

    async executePlayerChange(modal, team) {
        const game = gameManager.currentGame;
        const players = game.players[team];

        modal.querySelectorAll('.change-checkbox:checked').forEach(async checkbox => {
            const playerId = checkbox.dataset.playerId;
            const newNameInput = modal.querySelector(`.new-player-name[data-player-id="${playerId}"]`);
            const newName = newNameInput.value.trim();

            if (!newName) {
                throw new Error('新しい選手名を入力してください');
            }

            const player = players.find(p => p.id === playerId);
            if (player) {
                player.name = newName;
                await storage.savePlayer(player.toJSON());
            }
        });
    }

    async executeCombination(modal, team) {
        const game = gameManager.currentGame;
        const players = game.players[team];
        const positionChanges = {};

        // 全ての変更を収集
        modal.querySelectorAll('.combo-item').forEach(item => {
            const playerId = item.querySelector('.combo-change-checkbox').dataset.playerId;
            const isChanging = item.querySelector('.combo-change-checkbox').checked;
            const newName = item.querySelector('.combo-new-name').value.trim();
            const newPosition = item.querySelector('.combo-new-position').value;

            const player = players.find(p => p.id === playerId);
            if (player) {
                if (isChanging && newName) {
                    player.name = newName;
                }
                if (newPosition && newPosition !== player.position) {
                    positionChanges[playerId] = newPosition;
                }
            }
        });

        // 守備位置重複チェック
        const positions = Object.values(positionChanges);
        const currentPositions = players.filter(p => !positionChanges[p.id]).map(p => p.position);
        const allPositions = [...positions, ...currentPositions];
        const uniquePositions = [...new Set(allPositions)];
        if (allPositions.length !== uniquePositions.length) {
            throw new Error('守備位置が重複しています');
        }

        // 変更を適用
        for (const player of players) {
            if (positionChanges[player.id]) {
                player.position = positionChanges[player.id];
            }
            await storage.savePlayer(player.toJSON());
        }
    }

    async showSubstituteDefensivePositionScreen(battingTeam, substitutePlayers) {
        const game = gameManager.currentGame;
        const teamName = battingTeam === 'home' ? game.homeTeam : game.awayTeam;

        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal substitute-defense-modal';
            modal.innerHTML = `
                <div class="modal-content substitute-defense-content">
                    <h3>守備位置決定</h3>

                    <div class="situation-notice">
                        <p><strong>${teamName}</strong>の攻撃が終了しました</p>
                        <p>代打・代走選手の守備位置を決定してください</p>
                    </div>

                    <div class="substitute-players-section">
                        <h4>守備位置を決定する選手</h4>
                        <div class="substitute-players-list">
                            ${substitutePlayers.map(player => `
                                <div class="substitute-player-item" data-player-id="${player.id}">
                                    <div class="player-info">
                                        <span class="player-name">${player.name}</span>
                                        <span class="current-status">${player.position === '打' ? '代打' : '代走'}</span>
                                        ${player.battingOrder ? `<span class="batting-order">${player.battingOrder}${i18n.t('battingOrderSuffix')}</span>` : ''}
                                    </div>

                                    <div class="position-choice">
                                        <div class="choice-options">
                                            <label class="choice-option">
                                                <input type="radio" name="choice_${player.id}" value="field" checked>
                                                そのまま守備に就く
                                            </label>
                                            <label class="choice-option">
                                                <input type="radio" name="choice_${player.id}" value="replace">
                                                別の選手と交代
                                            </label>
                                        </div>

                                        <div class="field-position-section" data-player-id="${player.id}">
                                            <label>守備位置:</label>
                                            <select class="defensive-position" data-player-id="${player.id}">
                                                ${this.generatePositionOptions()}
                                            </select>
                                        </div>

                                        <div class="replacement-section" data-player-id="${player.id}" style="display: none;">
                                            <label>交代選手名:</label>
                                            <input type="text" class="replacement-name" data-player-id="${player.id}" placeholder="新しい選手名">
                                            <label>守備位置:</label>
                                            <select class="replacement-position" data-player-id="${player.id}">
                                                ${this.generatePositionOptions()}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="current-defense-info">
                        <h4>現在の守備陣</h4>
                        <div class="current-defense-list">
                            ${game.players[battingTeam].filter(p => p.position !== '打' && p.position !== '走').map(player => `
                                <div class="defense-player">
                                    <span>${player.battingOrder}${i18n.t('battingOrderSuffix')} ${player.name}</span>
                                    <span>(${BASEBALL_CONFIG.POSITIONS[player.position] || player.position})</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="modal-buttons">
                        <button id="confirmDefensivePositions" class="primary-btn">確定</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // ラジオボタンの切り替え処理
            modal.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const playerId = e.target.name.split('_')[1];
                    const fieldSection = modal.querySelector(`.field-position-section[data-player-id="${playerId}"]`);
                    const replacementSection = modal.querySelector(`.replacement-section[data-player-id="${playerId}"]`);

                    if (e.target.value === 'field') {
                        fieldSection.style.display = 'block';
                        replacementSection.style.display = 'none';
                    } else {
                        fieldSection.style.display = 'none';
                        replacementSection.style.display = 'block';
                    }
                });
            });

            // 確定ボタン処理
            modal.querySelector('#confirmDefensivePositions').addEventListener('click', async () => {
                try {
                    await this.processSubstituteDefensivePositions(modal, battingTeam, substitutePlayers);
                    document.body.removeChild(modal);
                    resolve();
                } catch (error) {
                    console.error('守備位置決定エラー:', error);
                    this.showError('守備位置の決定に失敗しました: ' + error.message);
                }
            });
        });
    }

    async processSubstituteDefensivePositions(modal, battingTeam, substitutePlayers) {
        const game = gameManager.currentGame;
        const usedPositions = new Set();

        // 現在の守備選手の位置を記録
        game.players[battingTeam].filter(p => p.position !== '打' && p.position !== '走').forEach(player => {
            if (player.position) {
                usedPositions.add(player.position);
            }
        });

        for (const player of substitutePlayers) {
            const playerId = player.id;
            const choiceRadio = modal.querySelector(`input[name="choice_${playerId}"]:checked`);

            if (choiceRadio.value === 'field') {
                // そのまま守備に就く場合
                const positionSelect = modal.querySelector(`.defensive-position[data-player-id="${playerId}"]`);
                const newPosition = positionSelect.value;

                if (!newPosition) {
                    throw new Error(`${player.name}の守備位置を選択してください`);
                }

                if (usedPositions.has(newPosition)) {
                    throw new Error(`守備位置 ${BASEBALL_CONFIG.POSITIONS[newPosition]} は既に使用されています`);
                }

                player.position = newPosition;
                usedPositions.add(newPosition);
                await storage.savePlayer(player.toJSON());

            } else {
                // 別の選手と交代する場合
                const replacementNameInput = modal.querySelector(`.replacement-name[data-player-id="${playerId}"]`);
                const replacementPositionSelect = modal.querySelector(`.replacement-position[data-player-id="${playerId}"]`);

                const replacementName = replacementNameInput.value.trim();
                const replacementPosition = replacementPositionSelect.value;

                if (!replacementName) {
                    throw new Error(`${player.name}の交代選手名を入力してください`);
                }

                if (!replacementPosition) {
                    throw new Error(`${player.name}の交代選手の守備位置を選択してください`);
                }

                if (usedPositions.has(replacementPosition)) {
                    throw new Error(`守備位置 ${BASEBALL_CONFIG.POSITIONS[replacementPosition]} は既に使用されています`);
                }

                // 新しい選手を作成
                const newPlayer = new Player(replacementName, battingTeam, replacementPosition, player.battingOrder);
                newPlayer.id = await storage.savePlayer(newPlayer.toJSON());

                // 古い選手を削除してリストから置き換え
                const playerIndex = game.players[battingTeam].findIndex(p => p.id === player.id);
                if (playerIndex !== -1) {
                    game.players[battingTeam][playerIndex] = newPlayer;
                }

                usedPositions.add(replacementPosition);
            }
        }

        // ゲーム保存
        await gameManager.saveGame();
        this.showSuccess('守備位置を決定しました');
    }

    setupGameContent(recordingLevel) {
        const gameContent = document.getElementById('gameContent');
        gameContent.innerHTML = '';

        switch (recordingLevel) {
            case 'inning':
                this.setupInningLevelInterface(gameContent);
                break;
            case 'batter':
                this.setupBatterLevelInterface(gameContent);
                break;
            case 'pitch':
                this.setupPitchLevelInterface(gameContent);
                break;
        }
    }

    setupInningLevelInterface(container) {
        container.innerHTML = `
            <div class="inning-interface">
                <h3 data-i18n="inningRecord">半イニング記録</h3>

                <div class="current-inning-stats">
                    <div class="stat-group">
                        <h4><span data-i18n="currentInningScore">今回の得点</span>: <span id="currentInningRuns">0</span></h4>
                        <div class="score-buttons">
                            <button class="score-btn" data-runs="1">+1<span data-i18n="points">点</span></button>
                            <button class="score-btn" data-runs="2">+2<span data-i18n="points">点</span></button>
                            <button class="score-btn" data-runs="3">+3<span data-i18n="points">点</span></button>
                            <button class="score-btn" data-runs="4">+4<span data-i18n="points">点</span></button>
                        </div>
                    </div>

                    <div class="stat-group">
                        <h4><span data-i18n="currentInningHits">安打数</span>: <span id="currentInningHits">0</span></h4>
                        <button id="addHit" class="stat-btn"><span data-i18n="hits">H</span> +1</button>
                        <button id="undoHit" class="undo-btn" data-i18n="undo">取消</button>
                    </div>

                    <div class="stat-group">
                        <h4><span data-i18n="currentInningErrors">失策数</span>: <span id="currentInningErrors">0</span></h4>
                        <button id="addError" class="stat-btn"><span data-i18n="errors">E</span> +1</button>
                        <button id="undoError" class="undo-btn" data-i18n="undo">取消</button>
                    </div>
                </div>

                <div class="inning-controls">
                    <button id="endHalfInning" class="primary-btn" data-i18n="endHalfInning">攻撃終了</button>
                    <button id="correctInning" class="secondary-btn" data-i18n="correct">修正</button>
                    <button id="saveInning" class="save-btn" data-i18n="save">保存</button>
                </div>

                <div class="notes-section">
                    <label for="inningNotes" data-i18n="notes">メモ:</label>
                    <textarea id="inningNotes" rows="2" data-i18n-placeholder="notesPlaceholder"></textarea>
                </div>

                <div class="inning-history">
                    <h4 data-i18n="inningHistory">イニング履歴</h4>
                    <div id="inningHistoryList"></div>
                </div>
            </div>
        `;

        this.setupInningEventListeners();
        this.updateCurrentInningDisplay();
        this.loadInningHistory();

        // 多言語対応の適用
        i18n.updatePageContent();
    }

    setupBatterLevelInterface(container) {
        container.innerHTML = `
            <div class="batter-interface">
                <h3>打者記録</h3>

                <div class="current-batter-info">
                    <div class="batter-display">
                        <h4>現在の打者</h4>
                        <div id="currentBatterDisplay">打者情報読み込み中...</div>
                    </div>

                    <div class="game-situation">
                        <div class="runners-display">
                            <h5>走者状況</h5>
                            <div class="bases">
                                <span id="base1" class="base">1塁</span>
                                <span id="base2" class="base">2塁</span>
                                <span id="base3" class="base">3塁</span>
                            </div>
                        </div>
                        <div class="count-display">
                            <span>アウト: <span id="outsDisplay">0</span></span>
                        </div>
                    </div>
                </div>

                <div class="result-selection">
                    <h4>打席結果</h4>
                    <div id="resultButtons" class="result-buttons">
                        <!-- 動的に生成 -->
                    </div>
                </div>

                <div class="detail-inputs">
                    <div class="input-group">
                        <label for="resultDetail">打球方向・詳細:</label>
                        <input type="text" id="resultDetail" placeholder="例: センター前、ライト線">
                    </div>

                    <div class="input-group">
                        <label for="rbis">打点:</label>
                        <input type="number" id="rbis" min="0" max="4" value="0">
                    </div>
                </div>

                <div class="batter-controls">
                    <button id="recordAtBat" class="primary-btn">記録</button>
                    <button id="correctLastAtBat" class="secondary-btn">前打席修正</button>
                </div>

                <div class="at-bat-history">
                    <h4>打席履歴</h4>
                    <div id="atBatHistoryList"></div>
                </div>
            </div>
        `;

        this.updateBatterDisplay();
        this.updateResultButtons();
        this.setupBatterEventListeners();
    }

    setupBatterEventListeners() {
        document.getElementById('recordAtBat').addEventListener('click', () => {
            this.recordAtBatData();
        });

        document.getElementById('correctLastAtBat').addEventListener('click', () => {
            this.correctLastAtBat();
        });
    }

    updateBatterDisplay() {
        const batter = gameManager.getCurrentBatter();
        const display = document.getElementById('currentBatterDisplay');

        if (batter && display) {
            const teamName = batter.team === 'home' ? gameManager.currentGame.homeTeam : gameManager.currentGame.awayTeam;
            const positionText = batter.position ?
                ` (${BASEBALL_CONFIG.POSITIONS[batter.position]})` : '';

            display.innerHTML = `
                <div class="batter-info">
                    <span class="team">${teamName}</span>
                    <span class="order">${batter.battingOrder}${i18n.t('battingOrderSuffix')}</span>
                    <span class="name">${batter.name}${positionText}</span>
                </div>
            `;
        }

        this.updateRunnersDisplay();
        this.updateOutsDisplay();
    }

    updateRunnersDisplay() {
        if (!gameManager.currentGame) return;

        const runners = gameManager.currentGame.runnersOnBase;

        ['base1', 'base2', 'base3'].forEach((baseId, index) => {
            const baseEl = document.getElementById(baseId);
            if (baseEl) {
                const baseName = ['first', 'second', 'third'][index];
                const hasRunner = runners[baseName];

                baseEl.className = hasRunner ? 'base occupied' : 'base';
                baseEl.textContent = hasRunner ? `${index + 1}塁●` : `${index + 1}塁`;
            }
        });
    }

    updateOutsDisplay() {
        const outsEl = document.getElementById('outsDisplay');
        if (outsEl && gameManager.currentGame) {
            outsEl.textContent = gameManager.currentGame.outs;
        }
    }

    updateResultButtons() {
        const container = document.getElementById('resultButtons');
        if (!container) return;

        const availableResults = gameManager.getAvailableAtBatResults();

        container.innerHTML = availableResults.map(result => {
            const label = BASEBALL_CONFIG.AT_BAT_RESULTS[result] || result;
            return `<button class="result-btn" data-result="${result}">${label}</button>`;
        }).join('');

        container.querySelectorAll('.result-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.result-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    setupPitchLevelInterface(container) {
        container.innerHTML = `
            <div class="pitch-interface">
                <h3>投球記録</h3>

                <div class="current-batter-info">
                    <div class="batter-display">
                        <h4>現在の打者</h4>
                        <div id="currentBatterDisplayPitch">打者情報読み込み中...</div>
                    </div>
                </div>

                <div class="pitch-count-display">
                    <div class="count-large">
                        <div class="count-item">
                            <label>ボール</label>
                            <span id="ballCountLarge">0</span>
                        </div>
                        <div class="count-separator">-</div>
                        <div class="count-item">
                            <label>ストライク</label>
                            <span id="strikeCountLarge">0</span>
                        </div>
                    </div>
                </div>

                <div class="pitch-input-section">
                    <h4>投球詳細</h4>
                    <div class="pitch-details">
                        <div class="input-group">
                            <label for="pitchType">球種:</label>
                            <select id="pitchType">
                                <option value="fastball">ストレート</option>
                                <option value="curveball">カーブ</option>
                                <option value="slider">スライダー</option>
                                <option value="changeup">チェンジアップ</option>
                                <option value="forkball">フォーク</option>
                                <option value="sinker">シンカー</option>
                                <option value="cutter">カッター</option>
                                <option value="knuckle">ナックル</option>
                            </select>
                        </div>

                        <div class="input-group">
                            <label for="velocity">球速:</label>
                            <input type="number" id="velocity" placeholder="km/h" min="50" max="180">
                        </div>

                        <div class="input-group">
                            <label for="pitchLocation">コース:</label>
                            <select id="pitchLocation">
                                <option value="">選択してください</option>
                                <option value="strike_zone_1">ストライクゾーン内角高め</option>
                                <option value="strike_zone_2">ストライクゾーン真ん中高め</option>
                                <option value="strike_zone_3">ストライクゾーン外角高め</option>
                                <option value="strike_zone_4">ストライクゾーン内角</option>
                                <option value="strike_zone_5">ストライクゾーン真ん中</option>
                                <option value="strike_zone_6">ストライクゾーン外角</option>
                                <option value="strike_zone_7">ストライクゾーン内角低め</option>
                                <option value="strike_zone_8">ストライクゾーン真ん中低め</option>
                                <option value="strike_zone_9">ストライクゾーン外角低め</option>
                                <option value="outside">ボールゾーン</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="pitch-result-section">
                    <h4>投球結果</h4>
                    <div class="pitch-result-buttons">
                        <button class="pitch-result-btn" data-result="ball">ボール</button>
                        <button class="pitch-result-btn" data-result="strike_looking">見逃しストライク</button>
                        <button class="pitch-result-btn" data-result="strike_swinging">空振りストライク</button>
                        <button class="pitch-result-btn" data-result="foul">ファウル</button>
                        <button class="pitch-result-btn" data-result="hit">打球</button>
                        <button class="pitch-result-btn" data-result="bunt">バント</button>
                        <button class="pitch-result-btn" data-result="wild_pitch">暴投</button>
                        <button class="pitch-result-btn" data-result="passed_ball">捕逸</button>
                    </div>
                </div>

                <div class="baserunning-section" id="baserunningSection" style="display: none;">
                    <h4>走者プレー</h4>
                    <div class="baserunning-controls">
                        <div class="runner-actions">
                            <label>走者を選択:</label>
                            <select id="runnerSelect">
                                <option value="">選択してください</option>
                            </select>
                        </div>
                        <div class="baserunning-buttons">
                            <button class="baserunning-btn" data-play="steal_success">盗塁成功</button>
                            <button class="baserunning-btn" data-play="steal_failure">盗塁死</button>
                            <button class="baserunning-btn" data-play="pickoff_safe">牽制帰塁</button>
                            <button class="baserunning-btn" data-play="pickoff_out">牽制死</button>
                            <button class="baserunning-btn" data-play="balk">ボーク</button>
                        </div>
                        <button id="recordBaserunningPlay" class="secondary-btn">走者プレー記録</button>
                    </div>
                </div>

                <div class="pitch-controls">
                    <button id="recordPitch" class="primary-btn">投球記録</button>
                    <button id="undoLastPitch" class="secondary-btn">前球取消</button>
                </div>

                <div class="pitch-history">
                    <h4>投球履歴</h4>
                    <div id="pitchHistoryList"></div>
                </div>

                <div class="at-bat-completion">
                    <h4>打席結果選択</h4>
                    <div id="atBatResultButtons" class="at-bat-result-buttons">
                        <!-- 動的に生成 -->
                    </div>
                    <div class="result-details">
                        <div class="input-group">
                            <label for="atBatResultDetail">詳細:</label>
                            <input type="text" id="atBatResultDetail" placeholder="例: センター前ヒット">
                        </div>
                        <div class="input-group">
                            <label for="atBatRbis">打点:</label>
                            <input type="number" id="atBatRbis" min="0" max="4" value="0">
                        </div>
                    </div>
                    <button id="completeAtBat" class="primary-btn">打席完了</button>
                </div>
            </div>
        `;

        this.setupPitchEventListeners();
        this.updatePitchDisplay();
    }

    setupPitchEventListeners() {
        const pitchResultButtons = document.querySelectorAll('.pitch-result-btn');
        pitchResultButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                pitchResultButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        document.getElementById('recordPitch').addEventListener('click', () => {
            this.recordPitchData();
        });

        document.getElementById('undoLastPitch').addEventListener('click', () => {
            this.undoLastPitch();
        });

        document.getElementById('completeAtBat').addEventListener('click', () => {
            this.completeAtBatFromPitch();
        });

        // 走者プレー関連
        const baserunningButtons = document.querySelectorAll('.baserunning-btn');
        baserunningButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                baserunningButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        document.getElementById('recordBaserunningPlay').addEventListener('click', () => {
            this.recordBaserunningPlay();
        });

        // 走者がいる場合のみ走者プレーセクションを表示
        this.updateBaserunningSection();
    }

    updatePitchDisplay() {
        // 打者情報表示
        const batter = gameManager.getCurrentBatter();
        const display = document.getElementById('currentBatterDisplayPitch');

        if (batter && display) {
            const teamName = batter.team === 'home' ? gameManager.currentGame.homeTeam : gameManager.currentGame.awayTeam;
            const positionText = batter.position ?
                ` (${BASEBALL_CONFIG.POSITIONS[batter.position]})` : '';

            display.innerHTML = `
                <div class="batter-info">
                    <span class="team">${teamName}</span>
                    <span class="order">${batter.battingOrder}${i18n.t('battingOrderSuffix')}</span>
                    <span class="name">${batter.name}${positionText}</span>
                </div>
            `;
        }

        // カウント表示
        this.updatePitchCount();

        // 打席結果ボタン更新
        this.updateAtBatResultButtons();

        // 投球履歴更新
        this.updatePitchHistory();

        // 走者プレーセクション更新
        this.updateBaserunningSection();
    }

    updateBaserunningSection() {
        const section = document.getElementById('baserunningSection');
        const runnerSelect = document.getElementById('runnerSelect');

        if (!section || !runnerSelect || !gameManager.currentGame) return;

        const runners = gameManager.currentGame.runnersOnBase;
        const hasRunners = runners.first || runners.second || runners.third;

        if (hasRunners) {
            section.style.display = 'block';

            // 走者選択肢を更新
            runnerSelect.innerHTML = `<option value="">${i18n.t('selectPlaceholder')}</option>`;

            if (runners.first) {
                runnerSelect.innerHTML += `<option value="first">${i18n.t('firstBaseRunner')}</option>`;
            }
            if (runners.second) {
                runnerSelect.innerHTML += `<option value="second">${i18n.t('secondBaseRunner')}</option>`;
            }
            if (runners.third) {
                runnerSelect.innerHTML += `<option value="third">${i18n.t('thirdBaseRunner')}</option>`;
            }
        } else {
            section.style.display = 'none';
        }
    }

    async recordBaserunningPlay() {
        const selectedPlay = document.querySelector('.baserunning-btn.selected');
        const runnerSelect = document.getElementById('runnerSelect');

        if (!selectedPlay) {
            this.showError('走者プレーを選択してください');
            return;
        }

        if (!runnerSelect.value) {
            this.showError('走者を選択してください');
            return;
        }

        try {
            const playType = selectedPlay.dataset.play;
            const runnerBase = runnerSelect.value;

            await this.processBaserunningPlay(playType, runnerBase);

            // 表示更新
            this.updateGameDisplay();
            this.updatePitchDisplay();

            // フォームクリア
            document.querySelectorAll('.baserunning-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            runnerSelect.value = '';

        } catch (error) {
            console.error('走者プレー記録エラー:', error);
            this.showError('走者プレーの記録に失敗しました');
        }
    }

    async processBaserunningPlay(playType, runnerBase) {
        const runners = gameManager.currentGame.runnersOnBase;
        const runnerId = runners[runnerBase];

        if (!runnerId) {
            throw new Error('指定された塁に走者がいません');
        }

        switch (playType) {
            case 'steal_success':
                this.processStealSuccess(runnerBase);
                break;

            case 'steal_failure':
                this.processStealFailure(runnerBase);
                break;

            case 'pickoff_safe':
                // 牽制帰塁（状況変化なし）
                this.showSuccess(`${runnerBase === 'first' ? '1' : runnerBase === 'second' ? '2' : '3'}塁走者が牽制帰塁しました`);
                break;

            case 'pickoff_out':
                this.processPickoffOut(runnerBase);
                break;

            case 'balk':
                this.processBalk();
                break;

            default:
                throw new Error('不明な走者プレーです');
        }

        // 走者プレーをログに記録
        await this.recordBaserunningEvent(playType, runnerBase, runnerId);
    }

    processStealSuccess(runnerBase) {
        const runners = gameManager.currentGame.runnersOnBase;
        const runnerId = runners[runnerBase];

        // 走者を次の塁に進める
        runners[runnerBase] = null;

        if (runnerBase === 'first') {
            runners.second = runnerId;
        } else if (runnerBase === 'second') {
            runners.third = runnerId;
        } else if (runnerBase === 'third') {
            // ホームスチール（得点）
            gameManager.addRuns(1);
        }

        this.showSuccess(`${runnerBase === 'first' ? '1' : runnerBase === 'second' ? '2' : '3'}塁走者が盗塁成功しました`);
    }

    processStealFailure(runnerBase) {
        const runners = gameManager.currentGame.runnersOnBase;

        // 走者をアウト
        runners[runnerBase] = null;
        gameManager.currentGame.outs++;

        this.showSuccess(`${runnerBase === 'first' ? '1' : runnerBase === 'second' ? '2' : '3'}塁走者が盗塁死しました`);

        // 3アウトチェック
        if (gameManager.currentGame.outs >= 3) {
            gameManager.endHalfInning();
        }
    }

    processPickoffOut(runnerBase) {
        const runners = gameManager.currentGame.runnersOnBase;

        // 走者をアウト
        runners[runnerBase] = null;
        gameManager.currentGame.outs++;

        this.showSuccess(`${runnerBase === 'first' ? '1' : runnerBase === 'second' ? '2' : '3'}塁走者が牽制死しました`);

        // 3アウトチェック
        if (gameManager.currentGame.outs >= 3) {
            gameManager.endHalfInning();
        }
    }

    processBalk() {
        const runners = gameManager.currentGame.runnersOnBase;

        // 全走者1塁進塁
        if (runners.third) {
            // 3塁走者は得点
            gameManager.addRuns(1);
            runners.third = null;
        }

        if (runners.second) {
            runners.third = runners.second;
            runners.second = null;
        }

        if (runners.first) {
            runners.second = runners.first;
            runners.first = null;
        }

        this.showSuccess('ボークにより全走者が1塁進塁しました');
    }

    async recordBaserunningEvent(playType, runnerBase, runnerId) {
        // 走者プレーイベントをデータベースに記録
        // 現在は簡易実装、後で詳細なログ機能を追加予定
        const event = {
            gameId: gameManager.currentGame.id,
            inningId: gameManager.currentInning?.id,
            playType: playType,
            runnerBase: runnerBase,
            runnerId: runnerId,
            timestamp: new Date().toISOString()
        };

        console.log('走者プレーイベント:', event);
        // TODO: 専用のbaserunning_eventsテーブルに保存
    }

    updatePitchCount() {
        if (!gameManager.currentGame) return;

        const balls = gameManager.currentGame.balls;
        const strikes = gameManager.currentGame.strikes;

        const ballCountEl = document.getElementById('ballCountLarge');
        const strikeCountEl = document.getElementById('strikeCountLarge');

        if (ballCountEl) ballCountEl.textContent = balls;
        if (strikeCountEl) strikeCountEl.textContent = strikes;
    }

    updateAtBatResultButtons() {
        const container = document.getElementById('atBatResultButtons');
        if (!container) return;

        const availableResults = gameManager.getAvailableAtBatResults();

        container.innerHTML = availableResults.map(result => {
            const label = BASEBALL_CONFIG.AT_BAT_RESULTS[result] || result;
            return `<button class="at-bat-result-btn" data-result="${result}">${label}</button>`;
        }).join('');

        container.querySelectorAll('.at-bat-result-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.at-bat-result-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    updatePitchHistory() {
        const historyEl = document.getElementById('pitchHistoryList');
        if (!historyEl || !gameManager.currentAtBat) return;

        const pitches = gameManager.currentAtBat.pitches || [];

        if (pitches.length === 0) {
            historyEl.innerHTML = `<p class="no-pitches">${i18n.t('noPitchesYet')}</p>`;
            return;
        }

        historyEl.innerHTML = pitches.map((pitch, index) => `
            <div class="pitch-item">
                <span class="pitch-number">${index + 1}球目</span>
                <span class="pitch-type">${BASEBALL_CONFIG.PITCH_TYPES[pitch.pitchType] || pitch.pitchType}</span>
                <span class="pitch-velocity">${pitch.velocity ? pitch.velocity + 'km/h' : '-'}</span>
                <span class="pitch-result">${BASEBALL_CONFIG.PITCH_RESULTS[pitch.result] || pitch.result}</span>
                <span class="pitch-count">${pitch.count.balls}-${pitch.count.strikes}</span>
            </div>
        `).join('');
    }

    setupInningEventListeners() {
        // 既存のイベントリスナーを削除してから新しいものを追加
        document.querySelectorAll('.score-btn').forEach(btn => {
            // クローンを作成して既存のイベントリスナーを削除
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', (e) => {
                const runs = parseInt(e.target.dataset.runs);
                this.addRuns(runs);
            });
        });

        // 他のボタンのイベントリスナーも重複登録を防ぐため削除してから追加
        ['addHit', 'undoHit', 'addError', 'undoError', 'endHalfInning', 'correctInning', 'saveInning'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);

                // イベントリスナーを追加
                switch(id) {
                    case 'addHit':
                        newBtn.addEventListener('click', () => this.addHit());
                        break;
                    case 'undoHit':
                        newBtn.addEventListener('click', () => this.undoHit());
                        break;
                    case 'addError':
                        newBtn.addEventListener('click', () => this.addError());
                        break;
                    case 'undoError':
                        newBtn.addEventListener('click', () => this.undoError());
                        break;
                    case 'endHalfInning':
                        newBtn.addEventListener('click', () => this.endHalfInning());
                        break;
                    case 'correctInning':
                        newBtn.addEventListener('click', () => this.showInningCorrectionModal());
                        break;
                    case 'saveInning':
                        newBtn.addEventListener('click', () => this.saveCurrentInning());
                        break;
                }
            }
        });
    }

    addRuns(runs) {
        if (!gameManager.currentInning) return;

        console.log('addRuns called with:', runs);
        console.log('Before - Inning hits:', gameManager.currentInning.hits);
        console.log('Before - Inning runs:', gameManager.currentInning.runs);

        gameManager.addRuns(runs);

        console.log('After - Inning hits:', gameManager.currentInning.hits);
        console.log('After - Inning runs:', gameManager.currentInning.runs);

        this.updateCurrentInningDisplay();
        this.updateGameDisplay();
    }

    addHit() {
        if (!gameManager.currentInning) return;

        // GameManagerのメソッドを使ってヒット数を更新
        gameManager.addHit();
        this.updateCurrentInningDisplay();
        this.updateGameDisplay();
    }

    undoHit() {
        if (!gameManager.currentInning) return;

        // GameManagerのメソッドを使ってヒット数を取り消し
        gameManager.undoHit();
        this.updateCurrentInningDisplay();
        this.updateGameDisplay();
    }

    addError() {
        if (!gameManager.currentInning) return;

        // GameManagerのメソッドを使ってエラー数を更新
        gameManager.addError();
        this.updateCurrentInningDisplay();
        this.updateGameDisplay();
    }

    undoError() {
        if (!gameManager.currentInning) return;

        // GameManagerのメソッドを使ってエラー数を取り消し
        gameManager.undoError();
        this.updateCurrentInningDisplay();
        this.updateGameDisplay();
    }

    updateCurrentInningDisplay() {
        if (!gameManager.currentInning) return;

        const runsEl = document.getElementById('currentInningRuns');
        const hitsEl = document.getElementById('currentInningHits');
        const errorsEl = document.getElementById('currentInningErrors');

        if (runsEl) runsEl.textContent = gameManager.currentInning.runs;
        if (hitsEl) hitsEl.textContent = gameManager.currentInning.hits;
        if (errorsEl) errorsEl.textContent = gameManager.currentInning.errors;
    }

    async endHalfInning() {
        if (!gameManager.currentInning) return;

        const notes = document.getElementById('inningNotes').value;
        gameManager.currentInning.notes = notes;

        try {
            await gameManager.endHalfInning();
            this.updateGameDisplay();
            this.updateCurrentInningDisplay();
            this.loadInningHistory();

            if (document.getElementById('inningNotes')) {
                document.getElementById('inningNotes').value = '';
            }
        } catch (error) {
            console.error('イニング終了エラー:', error);
            this.showError('イニングの終了に失敗しました');
        }
    }

    async saveCurrentInning() {
        if (!gameManager.currentInning) return;

        const notes = document.getElementById('inningNotes').value;
        gameManager.currentInning.notes = notes;

        try {
            await gameManager.saveGame();
            this.showSuccess('現在のイニングを保存しました');
        } catch (error) {
            console.error('保存エラー:', error);
            this.showError('保存に失敗しました');
        }
    }

    loadInningHistory() {
        const historyEl = document.getElementById('inningHistoryList');
        if (!historyEl || !gameManager.currentGame) return;

        const game = gameManager.currentGame;
        const currentInning = game.currentInning;
        const isTopHalf = game.isTopHalf;

        console.log('loadInningHistory - game.innings:', game.innings);
        console.log('loadInningHistory - current inning:', currentInning, 'isTopHalf:', isTopHalf);

        let historyHTML = '';

        for (let i = 1; i < currentInning || (i === currentInning && !isTopHalf); i++) {
            const topStats = this.getInningStats(i, true);
            const bottomStats = this.getInningStats(i, false);

            historyHTML += `
                <div class="inning-history-item">
                    <div class="inning-number">${i}回</div>
                    <div class="inning-stats">
                        <div class="half-inning">
                            <span class="team">${game.awayTeam}（${i18n.t('batting')}）</span>
                            <span class="stats">${topStats.runs}${i18n.t('points')} ${topStats.hits}${i18n.t('hits')}</span>
                            <span class="team">${game.homeTeam}（${i18n.t('fielding')}）</span>
                            <span class="stats">${topStats.errors}${i18n.t('errors')}</span>
                            <button class="edit-btn" onclick="app.editInning(${i}, true)" data-i18n="correct">${i18n.t('correct')}</button>
                        </div>
                        ${bottomStats ? `
                        <div class="half-inning">
                            <span class="team">${game.homeTeam}（${i18n.t('batting')}）</span>
                            <span class="stats">${bottomStats.runs}${i18n.t('points')} ${bottomStats.hits}${i18n.t('hits')}</span>
                            <span class="team">${game.awayTeam}（${i18n.t('fielding')}）</span>
                            <span class="stats">${bottomStats.errors}${i18n.t('errors')}</span>
                            <button class="edit-btn" onclick="app.editInning(${i}, false)" data-i18n="correct">${i18n.t('correct')}</button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        historyEl.innerHTML = historyHTML;
    }

    getInningStats(inningNumber, isTopHalf) {
        const innings = gameManager.currentGame.innings || [];
        const inning = innings.find(i => i.inning === inningNumber && i.isTopHalf === isTopHalf);

        console.log(`getInningStats(${inningNumber}, ${isTopHalf}) - found inning:`, inning);

        return inning ? { runs: inning.runs, hits: inning.hits, errors: inning.errors } : { runs: 0, hits: 0, errors: 0 };
    }

    async recordInningData() {
        const runs = parseInt(document.getElementById('inningRuns').value) || 0;
        const hits = parseInt(document.getElementById('inningHits').value) || 0;
        const errors = parseInt(document.getElementById('inningErrors').value) || 0;
        const notes = document.getElementById('inningNotes').value;

        if (gameManager.currentInning) {
            gameManager.currentInning.runs = runs;
            gameManager.currentInning.hits = hits;
            gameManager.currentInning.errors = errors;
            gameManager.currentInning.notes = notes;

            gameManager.addRuns(runs);
            await gameManager.saveGame();
            this.updateGameDisplay();
        }
    }

    async recordAtBatData() {
        const selectedResult = document.querySelector('.result-btn.selected');
        if (!selectedResult) {
            this.showError('結果を選択してください');
            return;
        }

        const result = selectedResult.dataset.result;
        const resultDetail = document.getElementById('resultDetail').value;

        try {
            const batter = gameManager.getCurrentBatter();

            // 打席開始
            await gameManager.startAtBat(batter.name, batter.battingOrder);

            // 走者進塁・得点を自動計算
            const advancement = gameManager.calculateRunnerAdvancement(result);

            // 複雑な状況の場合は調整画面を表示
            if (advancement.needsAdjustment) {
                this.showRunnerAdvancementModal(result, resultDetail, advancement, batter);
            } else {
                // 自動計算結果でそのまま記録
                await this.finalizeAtBat(result, resultDetail, advancement, batter);
            }

        } catch (error) {
            console.error('打席記録エラー:', error);
            this.showError('打席の記録に失敗しました');
        }
    }

    async finalizeAtBat(result, resultDetail, advancement, batter) {
        // 走者進塁を適用
        gameManager.currentGame.runnersOnBase = advancement.newRunners;

        // カスタムアウトカウントがある場合は適用
        if (advancement.outsAdded) {
            gameManager.currentGame.outs += advancement.outsAdded;
        }

        // プレー説明を詳細に追加
        let finalResultDetail = resultDetail;
        if (advancement.playDescription) {
            finalResultDetail = resultDetail ?
                `${resultDetail} - ${advancement.playDescription}` :
                advancement.playDescription;
        }

        // 打席結果記録（カスタムアウトカウントがある場合は通常のアウト処理をスキップ）
        if (advancement.outsAdded) {
            // カスタムアウト処理の場合、recordAtBatResultでのアウト増加をスキップ
            await gameManager.recordAtBatResult(result, finalResultDetail, advancement.runsScored, advancement.runsScored, true);
        } else {
            await gameManager.recordAtBatResult(result, finalResultDetail, advancement.runsScored, advancement.runsScored);
        }

        // リアルタイムUI: プレー履歴に追加
        if (window.realtimeUI && batter) {
            realtimeUI.addPlay({
                inning: gameManager.currentGame.currentInning,
                isTopHalf: gameManager.currentGame.isTopHalf,
                outs: gameManager.currentGame.outs,
                runners: { ...gameManager.currentGame.runnersOnBase },
                batterName: batter.name || `${batter.battingOrder}${i18n.t('battingOrderSuffix')}`,
                result: result,
                runs: advancement.runsScored
            });

            // 得点があった場合はアニメーション
            if (advancement.runsScored > 0) {
                const team = gameManager.currentGame.isTopHalf ? 'away' : 'home';
                realtimeUI.animateScore(team);
            }
        }

        // 3アウトチェック
        if (gameManager.currentGame.outs >= 3) {
            await gameManager.endHalfInning();
        }

        // 打順進行
        gameManager.advanceBattingOrder();

        // 表示更新
        this.updateGameDisplay();
        this.updateBatterDisplay();
        this.updateResultButtons();
        this.loadAtBatHistory();
        this.clearBatterForm();
    }

    async correctLastAtBat() {
        // 打席履歴を表示して訂正UIを開く
        await this.showAtBatHistory();
    }

    async loadAtBatHistory() {
        const historyEl = document.getElementById('atBatHistoryList');
        if (!historyEl || !gameManager.currentGame) return;

        try {
            // 打席履歴を取得
            const atBats = await gameManager.getAllAtBats();

            if (atBats.length === 0) {
                historyEl.innerHTML = `
                    <div class="history-placeholder">
                        <p data-i18n="noAtBatsYet">まだ打席がありません</p>
                    </div>
                `;
                return;
            }

            // 打席履歴を表示
            historyEl.innerHTML = atBats.map(atBat => {
                const needsDetail = atBat.needsDetailFill;
                const itemClasses = ['at-bat-history-item'];
                if (needsDetail) itemClasses.push('needs-detail');

                return `
                <div class="${itemClasses.join(' ')}" data-at-bat-id="${atBat.id}">
                    <div class="at-bat-info">
                        <span class="inning-info">${atBat.inningNumber}${i18n.t('currentInning')}${atBat.isTopHalf ? i18n.t('top') : i18n.t('bottom')}</span>
                        <span class="player-name">${atBat.playerName}</span>
                        <span class="batting-order">${atBat.battingOrder}${i18n.t('battingOrderSuffix')}</span>
                    </div>
                    <div class="at-bat-result">
                        <span class="result-text">${this.formatAtBatResult(atBat.result)}</span>
                        ${atBat.resultDetail ? `<span class="result-detail">${atBat.resultDetail}</span>` : ''}
                        ${atBat.runs > 0 ? `<span class="runs">${atBat.runs}${i18n.t('runs')}</span>` : ''}
                        ${atBat.rbis > 0 ? `<span class="rbis">${atBat.rbis}${i18n.t('rbi')}</span>` : ''}
                    </div>
                    <div class="at-bat-actions">
                        ${needsDetail ? `
                            <button class="fill-detail-btn" data-at-bat-id="${atBat.id}">
                                <span data-i18n="fillDetails">詳細追記</span>
                            </button>
                        ` : ''}
                        <button class="edit-at-bat-btn" data-at-bat-id="${atBat.id}">
                            <span data-i18n="edit">訂正</span>
                        </button>
                        <button class="delete-at-bat-btn" data-at-bat-id="${atBat.id}">
                            <span data-i18n="delete">削除</span>
                        </button>
                    </div>
                    ${atBat.correctedAt ? '<span class="corrected-badge" data-i18n="corrected">訂正済</span>' : ''}
                    ${needsDetail ? '<span class="incomplete-badge" data-i18n="incomplete">要追記</span>' : ''}
                    ${atBat.isQuickRecord ? '<span class="quick-badge" data-i18n="quickRecord">クイック</span>' : ''}
                </div>
            `;
            }).join('');

            // イベントリスナーを追加
            document.querySelectorAll('.fill-detail-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const atBatId = parseInt(e.currentTarget.dataset.atBatId);
                    this.showFillDetailsModal(atBatId);
                });
            });

            document.querySelectorAll('.edit-at-bat-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const atBatId = parseInt(e.currentTarget.dataset.atBatId);
                    this.showAtBatCorrectionModal(atBatId);
                });
            });

            document.querySelectorAll('.delete-at-bat-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const atBatId = parseInt(e.currentTarget.dataset.atBatId);
                    await this.confirmDeleteAtBat(atBatId);
                });
            });

        } catch (error) {
            console.error('打席履歴読み込みエラー:', error);
            this.showError('打席履歴の読み込みに失敗しました');
        }
    }

    formatAtBatResult(result) {
        const resultMap = {
            'single': '単打',
            'double': '二塁打',
            'triple': '三塁打',
            'homerun': '本塁打',
            'walk': '四球',
            'hit_by_pitch': '死球',
            'strikeout': '三振',
            'groundout': 'ゴロアウト',
            'flyout': 'フライアウト',
            'lineout': 'ライナーアウト',
            'sacrifice_bunt': '犠打',
            'sacrifice_fly': '犠飛',
            'ground_double_play': '併殺打',
            'fly_double_play': '飛併殺',
            'error': 'エラー'
        };
        return resultMap[result] || result;
    }

    async showAtBatHistory() {
        // モーダルを作成して表示
        const modal = document.createElement('div');
        modal.className = 'modal at-bat-history-modal';
        modal.innerHTML = `
            <div class="modal-content at-bat-history-content">
                <div class="modal-header">
                    <h3 data-i18n="atBatHistory">打席履歴</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="atBatHistoryList" class="at-bat-history-list">
                        <div class="loading">読み込み中...</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 閉じるボタン
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // 履歴を読み込み
        await this.loadAtBatHistory();
    }

    async showAtBatCorrectionModal(atBatId) {
        try {
            // 打席データを取得
            const atBat = await storage.getData('atBats', atBatId);
            if (!atBat) {
                this.showError('打席データが見つかりません');
                return;
            }

            // 訂正モーダルを作成
            const modal = document.createElement('div');
            modal.className = 'modal correction-modal';
            modal.innerHTML = `
                <div class="modal-content correction-content">
                    <div class="modal-header">
                        <h3 data-i18n="correctAtBat">打席結果の訂正</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="correction-form">
                            <div class="form-group">
                                <label data-i18n="currentResult">現在の結果</label>
                                <div class="current-result-display">
                                    ${this.formatAtBatResult(atBat.result)}
                                    ${atBat.resultDetail ? ` - ${atBat.resultDetail}` : ''}
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="newResult" data-i18n="newResult">新しい結果</label>
                                <select id="newResult" class="form-control">
                                    <option value="">選択してください</option>
                                    <optgroup label="安打">
                                        <option value="single">単打</option>
                                        <option value="double">二塁打</option>
                                        <option value="triple">三塁打</option>
                                        <option value="homerun">本塁打</option>
                                    </optgroup>
                                    <optgroup label="出塁">
                                        <option value="walk">四球</option>
                                        <option value="hit_by_pitch">死球</option>
                                        <option value="error">エラー</option>
                                    </optgroup>
                                    <optgroup label="アウト">
                                        <option value="strikeout">三振</option>
                                        <option value="groundout">ゴロアウト</option>
                                        <option value="flyout">フライアウト</option>
                                        <option value="lineout">ライナーアウト</option>
                                    </optgroup>
                                    <optgroup label="犠打">
                                        <option value="sacrifice_bunt">犠打</option>
                                        <option value="sacrifice_fly">犠飛</option>
                                    </optgroup>
                                    <optgroup label="併殺">
                                        <option value="ground_double_play">併殺打</option>
                                        <option value="fly_double_play">飛併殺</option>
                                    </optgroup>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="newResultDetail" data-i18n="resultDetail">詳細</label>
                                <input type="text" id="newResultDetail" class="form-control"
                                       value="${atBat.resultDetail || ''}"
                                       placeholder="例: センター前ヒット">
                            </div>

                            <div class="form-group">
                                <label for="newRuns" data-i18n="runs">得点</label>
                                <input type="number" id="newRuns" class="form-control"
                                       value="${atBat.runs || 0}" min="0" max="4">
                            </div>

                            <div class="form-group">
                                <label for="newRBIs" data-i18n="rbis">打点</label>
                                <input type="number" id="newRBIs" class="form-control"
                                       value="${atBat.rbis || 0}" min="0" max="4">
                            </div>

                            <div class="correction-warning">
                                <strong>注意:</strong> 訂正すると、全ての統計が自動的に再計算されます。
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="secondary-btn cancel-correction" data-i18n="cancel">キャンセル</button>
                        <button class="primary-btn save-correction" data-i18n="save">保存</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 現在の結果を選択状態に
            modal.querySelector('#newResult').value = atBat.result;

            // 閉じるボタン
            const closeModal = () => modal.remove();
            modal.querySelector('.close-modal').addEventListener('click', closeModal);
            modal.querySelector('.cancel-correction').addEventListener('click', closeModal);

            // 保存ボタン
            modal.querySelector('.save-correction').addEventListener('click', async () => {
                const newResult = modal.querySelector('#newResult').value;
                if (!newResult) {
                    this.showError('新しい結果を選択してください');
                    return;
                }

                const newData = {
                    result: newResult,
                    resultDetail: modal.querySelector('#newResultDetail').value,
                    runs: parseInt(modal.querySelector('#newRuns').value) || 0,
                    rbis: parseInt(modal.querySelector('#newRBIs').value) || 0
                };

                try {
                    await gameManager.correctAtBat(atBatId, newData);
                    this.showSuccess('打席結果を訂正しました');
                    modal.remove();

                    // 表示を更新
                    this.updateGameDisplay();

                    // 履歴モーダルも更新
                    await this.loadAtBatHistory();

                    // リアルタイムUIも更新
                    if (window.realtimeUI) {
                        const summary = gameManager.getGameSummary();
                        realtimeUI.updateCountDots(summary.balls, summary.strikes, summary.outs);
                    }

                } catch (error) {
                    console.error('訂正エラー:', error);
                    this.showError('打席結果の訂正に失敗しました');
                }
            });

        } catch (error) {
            console.error('訂正モーダル表示エラー:', error);
            this.showError('訂正画面の表示に失敗しました');
        }
    }

    async confirmDeleteAtBat(atBatId) {
        if (!confirm('この打席を削除してもよろしいですか？\n統計も自動的に再計算されます。')) {
            return;
        }

        try {
            await gameManager.deleteAtBat(atBatId);
            this.showSuccess('打席を削除しました');

            // 表示を更新
            this.updateGameDisplay();
            await this.loadAtBatHistory();

        } catch (error) {
            console.error('削除エラー:', error);
            this.showError('打席の削除に失敗しました');
        }
    }

    // ===== クイック記録・詳細追記機能 =====

    async showFillDetailsModal(atBatId) {
        try {
            const atBat = await storage.getData('atBats', atBatId);
            if (!atBat) {
                this.showError('打席データが見つかりません');
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'modal fill-details-modal';
            modal.innerHTML = `
                <div class="modal-content fill-details-content">
                    <div class="modal-header">
                        <h3 data-i18n="fillAtBatDetails">打席詳細の追記</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-fill-form">
                            <div class="form-group">
                                <label data-i18n="currentInfo">現在の情報</label>
                                <div class="current-info-display">
                                    <strong>${this.formatAtBatResult(atBat.result)}</strong>
                                    ${atBat.quickRecordNote ? `<div class="note">${atBat.quickRecordNote}</div>` : ''}
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="detailedDescription" data-i18n="detailedDescription">詳細説明</label>
                                <input type="text" id="detailedDescription" class="form-control"
                                       value="${atBat.resultDetail || ''}"
                                       placeholder="例: ファーストが落球、守備エラー">
                                <small class="form-help" data-i18n="detailHelp">どのような状況だったかを記入してください</small>
                            </div>

                            <div class="form-group">
                                <label for="detailRuns" data-i18n="runs">得点</label>
                                <input type="number" id="detailRuns" class="form-control"
                                       value="${atBat.runs || 0}" min="0" max="4">
                            </div>

                            <div class="form-group">
                                <label for="detailRBIs" data-i18n="rbis">打点</label>
                                <input type="number" id="detailRBIs" class="form-control"
                                       value="${atBat.rbis || 0}" min="0" max="4">
                            </div>

                            <div class="detail-reminder">
                                <strong data-i18n="reminder">確認:</strong>
                                <span data-i18n="fillDetailReminder">詳細を追記すると、「要追記」マークが消えます</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="secondary-btn cancel-fill" data-i18n="cancel">キャンセル</button>
                        <button class="primary-btn save-fill" data-i18n="save">保存</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const closeModal = () => modal.remove();
            modal.querySelector('.close-modal').addEventListener('click', closeModal);
            modal.querySelector('.cancel-fill').addEventListener('click', closeModal);

            modal.querySelector('.save-fill').addEventListener('click', async () => {
                const detailData = {
                    resultDetail: modal.querySelector('#detailedDescription').value,
                    runs: parseInt(modal.querySelector('#detailRuns').value) || 0,
                    rbis: parseInt(modal.querySelector('#detailRBIs').value) || 0
                };

                try {
                    await gameManager.fillAtBatDetails(atBatId, detailData);
                    this.showSuccess('詳細情報を追記しました');
                    modal.remove();

                    this.updateGameDisplay();
                    await this.loadAtBatHistory();

                } catch (error) {
                    console.error('詳細追記エラー:', error);
                    this.showError('詳細情報の追記に失敗しました');
                }
            });

        } catch (error) {
            console.error('詳細追記画面エラー:', error);
            this.showError('詳細追記画面の表示に失敗しました');
        }
    }

    async quickRecordAtBat(result, options = {}) {
        try {
            await gameManager.recordAtBatQuick(result, options);
            this.showSuccess(`クイック記録: ${this.formatAtBatResult(result)}`);
            this.updateGameDisplay();

            // 未完了打席があることを通知
            if (options.needsDetail !== false) {
                setTimeout(() => {
                    this.showInfo('後で「前打席修正」から詳細を追記できます');
                }, 1000);
            }

        } catch (error) {
            console.error('クイック記録エラー:', error);
            this.showError('クイック記録に失敗しました');
        }
    }

    showInfo(message) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-info';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ===== 選手情報編集機能 =====

    async showPlayerListModal() {
        try {
            const players = gameManager.getAllPlayers();

            const modal = document.createElement('div');
            modal.className = 'modal player-list-modal';
            modal.innerHTML = `
                <div class="modal-content player-list-content">
                    <div class="modal-header">
                        <h3 data-i18n="playerList">選手一覧</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="player-teams">
                            <div class="team-players">
                                <h4>${players.home[0]?.teamName || 'ホーム'}</h4>
                                <div class="players-grid">
                                    ${players.home.map(player => {
                                        const needsDetail = player.needsDetailFill;
                                        return `
                                        <div class="player-card ${needsDetail ? 'needs-detail' : ''}" data-player-id="${player.id}" data-team="home">
                                            ${needsDetail ? '<span class="incomplete-badge" data-i18n="incompletePlayerInfo">未入力</span>' : ''}
                                            <div class="player-main-info">
                                                <span class="player-order">${player.battingOrder}${i18n.t('battingOrderSuffix')}</span>
                                                <span class="player-name-display">${player.name || '未設定'}</span>
                                                <span class="player-position-display">${player.position || '-'}</span>
                                            </div>
                                            <button class="edit-player-btn" data-player-id="${player.id}" data-team="home">
                                                <span data-i18n="${needsDetail ? 'fillPlayerDetails' : 'edit'}">${needsDetail ? '詳細入力' : '編集'}</span>
                                            </button>
                                        </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                            <div class="team-players">
                                <h4>${players.away[0]?.teamName || 'アウェイ'}</h4>
                                <div class="players-grid">
                                    ${players.away.map(player => {
                                        const needsDetail = player.needsDetailFill;
                                        return `
                                        <div class="player-card ${needsDetail ? 'needs-detail' : ''}" data-player-id="${player.id}" data-team="away">
                                            ${needsDetail ? '<span class="incomplete-badge" data-i18n="incompletePlayerInfo">未入力</span>' : ''}
                                            <div class="player-main-info">
                                                <span class="player-order">${player.battingOrder}${i18n.t('battingOrderSuffix')}</span>
                                                <span class="player-name-display">${player.name || '未設定'}</span>
                                                <span class="player-position-display">${player.position || '-'}</span>
                                            </div>
                                            <button class="edit-player-btn" data-player-id="${player.id}" data-team="away">
                                                <span data-i18n="${needsDetail ? 'fillPlayerDetails' : 'edit'}">${needsDetail ? '詳細入力' : '編集'}</span>
                                            </button>
                                        </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());

            modal.querySelectorAll('.edit-player-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const playerId = e.currentTarget.dataset.playerId;
                    const team = e.currentTarget.dataset.team;
                    this.showEditPlayerModal(team, playerId);
                    modal.remove();
                });
            });

        } catch (error) {
            console.error('選手一覧表示エラー:', error);
            this.showError('選手一覧の表示に失敗しました');
        }
    }

    async showEditPlayerModal(team, playerId) {
        try {
            const players = gameManager.getAllPlayers();
            console.log('showEditPlayerModal - team:', team, 'playerId:', playerId, 'type:', typeof playerId);
            console.log('Available players:', players[team].map(p => ({ id: p.id, type: typeof p.id, name: p.name })));

            // IDの型を統一（文字列として比較）
            const player = players[team].find(p => String(p.id) === String(playerId));

            if (!player) {
                console.error('Player not found. playerId:', playerId, 'available IDs:', players[team].map(p => p.id));
                this.showError('選手が見つかりません');
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'modal edit-player-modal';
            modal.innerHTML = `
                <div class="modal-content edit-player-content">
                    <div class="modal-header">
                        <h3 data-i18n="editPlayerInfo">選手情報の編集</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="edit-player-form">
                            <div class="form-group">
                                <label data-i18n="currentPlayerInfo">現在の情報</label>
                                <div class="current-player-display">
                                    <strong>${player.battingOrder}${i18n.t('battingOrderSuffix')}</strong>
                                    ${player.name || '(名前未設定)'}
                                    <span>${player.position || '(守備位置未設定)'}</span>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="editPlayerName" data-i18n="playerName">選手名</label>
                                <input type="text" id="editPlayerName" class="form-control"
                                       value="${player.name || ''}"
                                       placeholder="選手名を入力">
                                <small class="form-help" data-i18n="playerNameHelp">漢字の間違いなども修正できます</small>
                            </div>

                            <div class="form-group">
                                <label for="editPlayerPosition" data-i18n="position">守備位置</label>
                                <select id="editPlayerPosition" class="form-control">
                                    <option value="">選択してください</option>
                                    <option value="P" ${player.position === 'P' ? 'selected' : ''}>投手 (P)</option>
                                    <option value="C" ${player.position === 'C' ? 'selected' : ''}>捕手 (C)</option>
                                    <option value="1B" ${player.position === '1B' ? 'selected' : ''}>一塁手 (1B)</option>
                                    <option value="2B" ${player.position === '2B' ? 'selected' : ''}>二塁手 (2B)</option>
                                    <option value="3B" ${player.position === '3B' ? 'selected' : ''}>三塁手 (3B)</option>
                                    <option value="SS" ${player.position === 'SS' ? 'selected' : ''}>遊撃手 (SS)</option>
                                    <option value="LF" ${player.position === 'LF' ? 'selected' : ''}>左翼手 (LF)</option>
                                    <option value="CF" ${player.position === 'CF' ? 'selected' : ''}>中堅手 (CF)</option>
                                    <option value="RF" ${player.position === 'RF' ? 'selected' : ''}>右翼手 (RF)</option>
                                    <option value="DH" ${player.position === 'DH' ? 'selected' : ''}>指名打者 (DH)</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="editPlayerNumber" data-i18n="playerNumber">背番号</label>
                                <input type="text" id="editPlayerNumber" class="form-control"
                                       value="${player.playerInfo?.number || ''}"
                                       placeholder="例: 51">
                            </div>

                            <div class="player-edit-note">
                                <strong data-i18n="note">注意:</strong>
                                <span data-i18n="playerEditNote">選手名を変更しても、過去の打席記録は自動的に更新されます</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="secondary-btn cancel-edit" data-i18n="cancel">キャンセル</button>
                        <button class="primary-btn save-edit" data-i18n="save">保存</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const closeModal = () => modal.remove();
            modal.querySelector('.close-modal').addEventListener('click', closeModal);
            modal.querySelector('.cancel-edit').addEventListener('click', closeModal);

            modal.querySelector('.save-edit').addEventListener('click', async () => {
                const name = modal.querySelector('#editPlayerName').value.trim();
                const position = modal.querySelector('#editPlayerPosition').value;
                const number = modal.querySelector('#editPlayerNumber').value.trim();

                const updates = {
                    name: name,
                    position: position,
                    playerInfo: {
                        ...player.playerInfo,
                        number: number
                    }
                };

                // 名前が入力されていれば、詳細入力完了とみなす
                if (name && player.needsDetailFill) {
                    updates.needsDetailFill = false;
                }

                try {
                    await gameManager.updatePlayerInfo(team, playerId, updates);
                    this.showSuccess(i18n.t('playerUpdateSuccess'));
                    modal.remove();

                    this.updateGameDisplay();

                    const historyEl = document.getElementById('atBatHistoryList');
                    if (historyEl) {
                        await this.loadAtBatHistory();
                    }

                } catch (error) {
                    console.error('選手情報更新エラー:', error);
                    this.showError(i18n.t('playerUpdateError'));
                }
            });

        } catch (error) {
            console.error('選手編集画面エラー:', error);
            this.showError('選手編集画面の表示に失敗しました');
        }
    }

    async recordPitchData() {
        const selectedResult = document.querySelector('.pitch-result-btn.selected');
        if (!selectedResult) {
            this.showError('投球結果を選択してください');
            return;
        }

        try {
            // 打席が開始されていない場合は開始
            if (!gameManager.currentAtBat) {
                const batter = gameManager.getCurrentBatter();
                await gameManager.startAtBat(batter.name, batter.battingOrder);
            }

            const pitchData = {
                pitchType: document.getElementById('pitchType').value,
                velocity: parseInt(document.getElementById('velocity').value) || null,
                location: document.getElementById('pitchLocation').value,
                result: selectedResult.dataset.result
            };

            await gameManager.recordPitch(pitchData);

            // 表示更新
            this.updateGameDisplay();
            this.updatePitchDisplay();
            this.clearPitchForm();

            // 四球・三振・打球・暴投・捕逸の場合は特別処理
            const result = selectedResult.dataset.result;
            if (gameManager.currentGame.balls >= 4 || gameManager.currentGame.strikes >= 3 || result === 'hit') {
                this.showAtBatCompletionPrompt(result);
            } else if (result === 'wild_pitch' || result === 'passed_ball') {
                this.handleWildPitchOrPassedBall(result);
            }

        } catch (error) {
            console.error('投球記録エラー:', error);
            this.showError('投球の記録に失敗しました');
        }
    }

    showAtBatCompletionPrompt(lastPitchResult) {
        if (gameManager.currentGame.balls >= 4) {
            this.showSuccess('四球です。打席結果を選択してください。');
        } else if (gameManager.currentGame.strikes >= 3) {
            this.showSuccess('三振です。打席結果を選択してください。');
        } else if (lastPitchResult === 'hit') {
            this.showSuccess('打球です。打席結果を選択してください。');
        }

        // 打席結果選択エリアにスクロール
        const completionSection = document.querySelector('.at-bat-completion');
        if (completionSection) {
            completionSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    handleWildPitchOrPassedBall(result) {
        const currentRunners = gameManager.currentGame.runnersOnBase;
        const hasRunners = currentRunners.first || currentRunners.second || currentRunners.third;

        if (!hasRunners) {
            // 走者がいない場合は特に何もしない
            this.showSuccess(result === 'wild_pitch' ? '暴投が記録されました' : '捕逸が記録されました');
            return;
        }

        // 走者がいる場合は進塁処理
        const modal = document.createElement('div');
        modal.className = 'modal runner-modal';
        modal.innerHTML = `
            <div class="modal-content runner-modal-content">
                <h3>${result === 'wild_pitch' ? '暴投' : '捕逸'} - 走者進塁</h3>

                <div class="situation-summary">
                    <div class="play-summary">
                        <strong>${result === 'wild_pitch' ? '暴投' : '捕逸'}が発生しました</strong>
                    </div>
                    <div class="before-situation">
                        <strong>現在の状況:</strong> ${gameManager.currentGame.outs}アウト
                        ${this.formatRunnersDisplay(currentRunners)}
                    </div>
                </div>

                <div class="runner-adjustment">
                    <h4>走者進塁設定</h4>

                    ${currentRunners.third ? `
                    <div class="runner-setting">
                        <label>3塁走者:</label>
                        <select id="third-runner-result">
                            <option value="home" selected>本塁生還</option>
                            <option value="third">3塁残留</option>
                        </select>
                    </div>
                    ` : ''}

                    ${currentRunners.second ? `
                    <div class="runner-setting">
                        <label>2塁走者:</label>
                        <select id="second-runner-result">
                            <option value="third" selected>3塁進塁</option>
                            <option value="second">2塁残留</option>
                            <option value="home">本塁生還</option>
                        </select>
                    </div>
                    ` : ''}

                    ${currentRunners.first ? `
                    <div class="runner-setting">
                        <label>1塁走者:</label>
                        <select id="first-runner-result">
                            <option value="second" selected>2塁進塁</option>
                            <option value="first">1塁残留</option>
                            <option value="third">3塁進塁</option>
                            <option value="home">本塁生還</option>
                        </select>
                    </div>
                    ` : ''}

                    <div class="form-group">
                        <label for="wildPitchNotes">詳細メモ:</label>
                        <textarea id="wildPitchNotes" rows="2" placeholder="プレーの詳細を記入"></textarea>
                    </div>

                    <div class="result-preview">
                        <h5>結果プレビュー:</h5>
                        <div id="wildPitchPreview"></div>
                    </div>
                </div>

                <div class="modal-buttons">
                    <button class="apply-advancement primary-btn">適用</button>
                    <button class="cancel-advancement secondary-btn">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // プレビュー更新
        const updatePreview = () => {
            let runs = 0;
            const newRunners = { first: null, second: null, third: null };

            ['third', 'second', 'first'].forEach(base => {
                if (currentRunners[base]) {
                    const select = modal.querySelector(`#${base}-runner-result`);
                    if (select) {
                        const result = select.value;
                        if (result === 'home') {
                            runs++;
                        } else if (result === 'first') {
                            newRunners.first = base;
                        } else if (result === 'second') {
                            newRunners.second = base;
                        } else if (result === 'third') {
                            newRunners.third = base;
                        }
                    }
                }
            });

            const preview = modal.querySelector('#wildPitchPreview');
            preview.innerHTML = `
                <div>得点: ${runs}点</div>
                <div>走者: ${this.formatRunnersDisplay(newRunners)}</div>
            `;
        };

        // 選択変更時にプレビュー更新
        modal.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', updatePreview);
        });
        updatePreview();

        // ボタンイベント
        modal.querySelector('.apply-advancement').addEventListener('click', () => {
            this.applyWildPitchAdvancement(modal, result);
        });

        modal.querySelector('.cancel-advancement').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    async applyWildPitchAdvancement(modal, playType) {
        const currentRunners = gameManager.currentGame.runnersOnBase;
        let runs = 0;
        const newRunners = { first: null, second: null, third: null };

        // 各走者の結果を確認
        ['third', 'second', 'first'].forEach(base => {
            if (currentRunners[base]) {
                const select = modal.querySelector(`#${base}-runner-result`);
                if (select) {
                    const result = select.value;
                    if (result === 'home') {
                        runs++;
                    } else if (result === 'first') {
                        newRunners.first = currentRunners[base];
                    } else if (result === 'second') {
                        newRunners.second = currentRunners[base];
                    } else if (result === 'third') {
                        newRunners.third = currentRunners[base];
                    }
                }
            }
        });

        const notes = modal.querySelector('#wildPitchNotes').value;

        try {
            // 得点追加
            if (runs > 0) {
                if (gameManager.currentGame.isTopHalf) {
                    gameManager.currentGame.awayScore += runs;
                } else {
                    gameManager.currentGame.homeScore += runs;
                }
            }

            // 走者状況更新
            gameManager.currentGame.runnersOnBase = newRunners;

            // 現在のイニングに記録追加
            if (gameManager.currentInning) {
                gameManager.currentInning.runs += runs;
            }

            // ゲーム保存
            await gameManager.saveGame();

            // 表示更新
            this.updateGameDisplay();
            this.updatePitchDisplay();

            document.body.removeChild(modal);

            const resultMsg = playType === 'wild_pitch' ? '暴投' : '捕逸';
            this.showSuccess(`${resultMsg}による進塁を記録しました${runs > 0 ? ` (${runs}点)` : ''}`);

        } catch (error) {
            console.error('暴投/捕逸記録エラー:', error);
            this.showError('暴投/捕逸の記録に失敗しました');
        }
    }

    async completeAtBatFromPitch() {
        const selectedResult = document.querySelector('.at-bat-result-btn.selected');
        if (!selectedResult) {
            this.showError('打席結果を選択してください');
            return;
        }

        const result = selectedResult.dataset.result;
        const resultDetail = document.getElementById('atBatResultDetail').value;

        try {
            // 走者進塁・得点を自動計算
            const advancement = gameManager.calculateRunnerAdvancement(result);

            // 複雑な状況の場合は調整画面を表示
            if (advancement.needsAdjustment) {
                const batter = gameManager.getCurrentBatter();
                this.showRunnerAdvancementModal(result, resultDetail, advancement, batter);
            } else {
                // 自動計算結果でそのまま記録
                const batter = gameManager.getCurrentBatter();
                await this.finalizeAtBat(result, resultDetail, advancement, batter);

                // 次の打者の準備
                this.prepareNextBatter();
            }

        } catch (error) {
            console.error('打席完了エラー:', error);
            this.showError('打席の完了に失敗しました');
        }
    }

    prepareNextBatter() {
        // カウントリセット
        gameManager.currentGame.balls = 0;
        gameManager.currentGame.strikes = 0;

        // 表示更新
        this.updatePitchDisplay();
        this.clearAtBatCompletionForm();
    }

    async undoLastPitch() {
        if (!gameManager.currentAtBat || !gameManager.currentAtBat.pitches.length) {
            this.showError('取り消す投球がありません');
            return;
        }

        try {
            // 最後の投球を削除
            const lastPitch = gameManager.currentAtBat.pitches.pop();

            // カウントを戻す
            gameManager.currentGame.balls = lastPitch.count.balls;
            gameManager.currentGame.strikes = lastPitch.count.strikes;

            // データベースから削除
            if (lastPitch.id) {
                await storage.deleteData('pitches', lastPitch.id);
            }

            // 表示更新
            this.updateGameDisplay();
            this.updatePitchDisplay();
            this.showSuccess('前球を取り消しました');

        } catch (error) {
            console.error('投球取り消しエラー:', error);
            this.showError('投球の取り消しに失敗しました');
        }
    }

    clearBatterForm() {
        // 要素の存在チェックを追加してnullエラーを防ぐ
        const batterNameEl = document.getElementById('batterName');
        const battingOrderEl = document.getElementById('battingOrder');
        const resultDetailEl = document.getElementById('resultDetail');
        const rbisEl = document.getElementById('rbis');

        if (batterNameEl) batterNameEl.value = '';
        if (battingOrderEl) battingOrderEl.value = '';
        if (resultDetailEl) resultDetailEl.value = '';
        if (rbisEl) rbisEl.value = '0';

        document.querySelectorAll('.result-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    clearPitchForm() {
        const velocityEl = document.getElementById('velocity');
        const locationEl = document.getElementById('pitchLocation');

        if (velocityEl) velocityEl.value = '';
        if (locationEl) locationEl.value = '';

        document.querySelectorAll('.pitch-result-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    clearAtBatCompletionForm() {
        const resultDetailEl = document.getElementById('atBatResultDetail');
        const rbisEl = document.getElementById('atBatRbis');

        if (resultDetailEl) resultDetailEl.value = '';
        if (rbisEl) rbisEl.value = '0';

        document.querySelectorAll('.at-bat-result-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    updateGameDisplay() {
        const summary = gameManager.getGameSummary();
        if (!summary) return;

        document.getElementById('homeScore').textContent = summary.homeScore;
        document.getElementById('awayScore').textContent = summary.awayScore;
        document.getElementById('currentInning').textContent = gameManager.getCurrentInningDisplay();

        // 攻撃中チームをハイライト
        this.updateAttackingTeamHighlight();
        document.getElementById('outs').textContent = summary.outs;
        document.getElementById('balls').textContent = summary.balls;
        document.getElementById('strikes').textContent = summary.strikes;

        // リアルタイムUI更新: カウントドット表示
        if (window.realtimeUI) {
            realtimeUI.updateCountDots(summary.balls, summary.strikes, summary.outs);
        }

        // 走者状況と現在打者表示
        this.updateRunnersStatusDisplay();

        // 詳細スコアボードを更新
        this.updateDetailedScoreboard();

        // 記録レベル別の表示更新
        if (gameManager.currentGame.recordingLevel === 'pitch') {
            const ballCountEl = document.getElementById('ballCount');
            const strikeCountEl = document.getElementById('strikeCount');
            if (ballCountEl) ballCountEl.textContent = summary.balls;
            if (strikeCountEl) strikeCountEl.textContent = summary.strikes;
        }

        if (gameManager.currentGame.recordingLevel === 'batter') {
            this.updateBatterDisplay();
            this.updateResultButtons();
        }

        if (gameManager.currentGame.recordingLevel === 'inning') {
            this.updateCurrentInningDisplay();
        }
    }

    updateRunnersStatusDisplay() {
        if (!gameManager.currentGame) return;

        const runners = gameManager.currentGame.runnersOnBase;
        const batter = gameManager.getCurrentBatter();

        // 各塁の表示更新
        this.updateBaseDisplay('first', runners.first);
        this.updateBaseDisplay('second', runners.second);
        this.updateBaseDisplay('third', runners.third);

        // 現在打者表示
        const currentBatterEl = document.getElementById('current-batter-name');
        if (currentBatterEl && batter) {
            // 打順番号と名前を表示
            const suffix = i18n.t('battingOrderSuffix');
            // 名前が打順番号と同じ（未登録の場合）は、番号のみ表示
            const displayText = batter.name === String(batter.battingOrder)
                ? `${batter.battingOrder}${suffix}`
                : `${batter.battingOrder}${suffix} ${batter.name}`;
            console.log('Setting current batter display:', batter, '->', displayText);
            currentBatterEl.textContent = displayText;
        }

        // リアルタイムUI: 打者成績更新
        if (window.realtimeUI && batter) {
            // 完全な選手データを取得
            const team = gameManager.currentGame.isTopHalf ? 'away' : 'home';
            const fullBatter = gameManager.currentGame.players[team].find(p => p.battingOrder === batter.battingOrder);
            if (fullBatter) {
                realtimeUI.updateBatterStats(fullBatter, true);
            }
        }

        // リアルタイムUI: 投手情報更新（球ごと記録時のみ）
        if (window.realtimeUI && gameManager.currentGame.recordingLevel === 'pitch') {
            const pitchingTeam = gameManager.currentGame.isTopHalf ? 'home' : 'away';
            const pitchCount = gameManager.currentGame.pitchCounts ? gameManager.currentGame.pitchCounts[pitchingTeam] : 0;

            // 現在の投手を取得（仮で投手ポジション、実際にはcurrentPitcherを使用）
            const pitcher = gameManager.currentGame.players[pitchingTeam].find(p => p.position === 'P');
            if (pitcher) {
                realtimeUI.updatePitcherStats(pitcher, pitchCount, false);
            }
        }
    }

    updateBaseDisplay(baseName, runnerName) {
        const baseEl = document.getElementById(`base-${baseName}`);
        const runnerNameEl = document.getElementById(`${baseName}-runner-name`);

        if (baseEl && runnerNameEl) {
            if (runnerName) {
                baseEl.classList.add('occupied');
                // runnerNameが'batter'の場合は現在打者、それ以外は実際の名前表示
                const displayName = runnerName === 'batter' ? i18n.t('batter') : this.getRunnerDisplayName(runnerName);
                console.log(`Setting ${baseName} runner display:`, runnerName, '->', displayName);
                runnerNameEl.textContent = displayName;
            } else {
                baseEl.classList.remove('occupied');
                runnerNameEl.textContent = '-';
            }
        }
    }

    getRunnerDisplayName(runnerId) {
        // 後で選手名データベースから取得する予定
        // 現在は簡易表示
        console.log('getRunnerDisplayName called with:', runnerId);

        if (runnerId === 'batter') return i18n.t('batter');
        if (runnerId === 'first') return i18n.t('firstBaseRunner');
        if (runnerId === 'second') return i18n.t('secondBaseRunner');
        if (runnerId === 'third') return i18n.t('thirdBaseRunner');
        return runnerId.length > 8 ? runnerId.substring(0, 8) + '...' : runnerId;
    }

    async nextInning() {
        try {
            await gameManager.endHalfInning();
            this.updateGameDisplay();
        } catch (error) {
            console.error('イニング終了エラー:', error);
            this.showError('イニングの終了に失敗しました');
        }
    }

    async saveCurrentGame() {
        try {
            await gameManager.saveGame();
            this.showSuccess('試合を保存しました');
        } catch (error) {
            console.error('保存エラー:', error);
            this.showError('試合の保存に失敗しました');
        }
    }

    async endCurrentGame() {
        if (confirm('試合を終了しますか？')) {
            try {
                await gameManager.endGame();
                this.showSuccess('試合を終了しました');
                this.showScreen('welcomeScreen');
            } catch (error) {
                console.error('試合終了エラー:', error);
                this.showError('試合の終了に失敗しました');
            }
        }
    }

    setNoNextInning() {
        const game = gameManager.currentGame;
        if (!game) {
            this.showError('試合が開始されていません');
            return;
        }

        const currentInning = game.currentInning;
        const half = game.isTopHalf ? '表' : '裏';

        if (confirm(`現在の${currentInning}回${half}終了後、次のイニングに進まないよう設定しますか？\n（時刻制限・グラウンド使用時間等）`)) {
            game.manualGameControl.noNextInning = true;
            game.manualGameControl.callGameReason = `手動設定: ${currentInning}回${half}終了後に時刻制限等により終了`;

            this.showSuccess(`次のイニングに進まない設定を有効にしました`);
            this.updateGameDisplay();

            // 表示の更新
            this.updateManualControlButtons();
        }
    }

    forceGameEnd() {
        const game = gameManager.currentGame;
        if (!game) {
            this.showError('試合が開始されていません');
            return;
        }

        const reason = prompt('強制終了の理由を入力してください:\n(例: 雨天中止、時間制限、その他)');
        if (reason === null) return; // キャンセル

        if (confirm(`試合を強制終了しますか？\n理由: ${reason || '理由なし'}`)) {
            game.manualGameControl.forceGameEnd = true;
            game.manualGameControl.callGameReason = `強制終了: ${reason || '理由なし'}`;
            game.status = 'called';

            this.endCurrentGame();
        }
    }

    showGameTimeInfo() {
        const game = gameManager.currentGame;
        if (!game) {
            this.showError('試合が開始されていません');
            return;
        }

        const gameStart = new Date(game.date);
        const now = new Date();
        const elapsedMinutes = Math.floor((now - gameStart) / (1000 * 60));
        const hours = Math.floor(elapsedMinutes / 60);
        const minutes = elapsedMinutes % 60;

        const currentInning = game.currentInning;
        const half = game.isTopHalf ? '表' : '裏';

        let controlStatus = '';
        if (game.manualGameControl.noNextInning) {
            controlStatus += '• 次のイニングに進まない設定済み\n';
        }
        if (game.manualGameControl.forceGameEnd) {
            controlStatus += '• 強制終了設定済み\n';
        }

        const modal = document.createElement('div');
        modal.className = 'modal time-info-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>試合時刻情報</h3>
                <div class="time-info">
                    <div class="info-section">
                        <h4>試合状況</h4>
                        <p><strong>現在:</strong> ${currentInning}回${half}</p>
                        <p><strong>スコア:</strong> ${game.awayTeam} ${game.awayScore} - ${game.homeScore} ${game.homeTeam}</p>
                    </div>

                    <div class="info-section">
                        <h4>時刻情報</h4>
                        <p><strong>開始時刻:</strong> ${gameStart.toLocaleTimeString()}</p>
                        <p><strong>現在時刻:</strong> ${now.toLocaleTimeString()}</p>
                        <p><strong>経過時間:</strong> ${hours}時間${minutes}分</p>
                    </div>

                    ${controlStatus ? `<div class="info-section">
                        <h4>制御状況</h4>
                        <p>${controlStatus}</p>
                    </div>` : ''}

                    ${game.manualGameControl.callGameReason ? `<div class="info-section">
                        <h4>設定理由</h4>
                        <p>${game.manualGameControl.callGameReason}</p>
                    </div>` : ''}
                </div>

                <div class="modal-buttons">
                    <button type="button" class="primary-btn" onclick="this.closest('.modal').remove()">閉じる</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    updateManualControlButtons() {
        const game = gameManager.currentGame;
        if (!game) return;

        const noNextInningBtn = document.getElementById('noNextInning');

        // ボタンの状態更新
        if (game.manualGameControl.noNextInning) {
            noNextInningBtn.textContent = '次イニング進まず設定済み';
            noNextInningBtn.disabled = true;
            noNextInningBtn.classList.add('disabled');
        }
    }

    async loadGamesList() {
        try {
            const games = await storage.getAllGames();
            this.showGamesModal(games);
        } catch (error) {
            console.error('試合一覧取得エラー:', error);
            this.showError('試合一覧の取得に失敗しました');
        }
    }

    showGamesModal(games) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>保存された試合</h3>
                <div class="games-list">
                    ${games.map(game => `
                        <div class="game-item" data-game-id="${game.id}">
                            <div class="game-info">
                                <strong>${game.awayTeam} vs ${game.homeTeam}</strong>
                                <span>${new Date(game.date).toLocaleDateString()}</span>
                                <span>${game.status === 'completed' ? '終了' : '進行中'}</span>
                            </div>
                            <button class="load-game-btn" data-game-id="${game.id}">読み込み</button>
                        </div>
                    `).join('')}
                </div>
                <button class="close-modal">閉じる</button>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelectorAll('.load-game-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const gameId = parseInt(e.target.dataset.gameId);
                await this.loadGame(gameId);
                document.body.removeChild(modal);
            });
        });
    }

    async loadGame(gameId) {
        try {
            await gameManager.loadGame(gameId);
            this.setupGameScreen();
            this.showScreen('gameScreen');
            this.updateGameDisplay();
        } catch (error) {
            console.error('試合読み込みエラー:', error);
            this.showError('試合の読み込みに失敗しました');
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;

        // 画面切り替え後に翻訳を更新
        setTimeout(() => {
            i18n.updatePageContent();
        }, 100);
    }

    showError(message) {
        alert('エラー: ' + message);
    }

    showSuccess(message) {
        alert(message);
    }

    showInningCorrectionModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>イニング修正</h3>
                <div class="correction-form">
                    <div class="form-group">
                        <label for="correctionRuns">得点:</label>
                        <input type="number" id="correctionRuns" min="0" value="${gameManager.currentInning?.runs || 0}">
                    </div>
                    <div class="form-group">
                        <label for="correctionHits">安打:</label>
                        <input type="number" id="correctionHits" min="0" value="${gameManager.currentInning?.hits || 0}">
                    </div>
                    <div class="form-group">
                        <label for="correctionErrors">失策:</label>
                        <input type="number" id="correctionErrors" min="0" value="${gameManager.currentInning?.errors || 0}">
                    </div>
                    <div class="form-group">
                        <label for="correctionNotes">メモ:</label>
                        <textarea id="correctionNotes" rows="2">${gameManager.currentInning?.notes || ''}</textarea>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="apply-correction primary-btn">適用</button>
                    <button class="cancel-correction secondary-btn">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.apply-correction').addEventListener('click', () => {
            this.applyInningCorrection(modal);
        });

        modal.querySelector('.cancel-correction').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    async applyInningCorrection(modal) {
        if (!gameManager.currentInning) return;

        const newRuns = parseInt(modal.querySelector('#correctionRuns').value) || 0;
        const newHits = parseInt(modal.querySelector('#correctionHits').value) || 0;
        const newErrors = parseInt(modal.querySelector('#correctionErrors').value) || 0;
        const newNotes = modal.querySelector('#correctionNotes').value;

        const oldRuns = gameManager.currentInning.runs;
        const runsDiff = newRuns - oldRuns;

        gameManager.currentInning.runs = newRuns;
        gameManager.currentInning.hits = newHits;
        gameManager.currentInning.errors = newErrors;
        gameManager.currentInning.notes = newNotes;

        if (runsDiff !== 0) {
            if (gameManager.currentGame.isTopHalf) {
                gameManager.currentGame.awayScore += runsDiff;
            } else {
                gameManager.currentGame.homeScore += runsDiff;
            }
        }

        try {
            await gameManager.saveGame();
            this.updateCurrentInningDisplay();
            this.updateGameDisplay();
            this.loadInningHistory();
            document.body.removeChild(modal);
            this.showSuccess('修正を適用しました');
        } catch (error) {
            console.error('修正適用エラー:', error);
            this.showError('修正の適用に失敗しました');
        }
    }

    async editInning(inningNumber, isTopHalf) {
        const innings = await storage.getInningsByGame(gameManager.currentGame.id);
        const inning = innings.find(i => i.inning === inningNumber && i.isTopHalf === isTopHalf);

        if (!inning) {
            this.showError('該当するイニングデータが見つかりません');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${inningNumber}回${isTopHalf ? '表' : '裏'} 修正</h3>
                <div class="correction-form">
                    <div class="form-group">
                        <label for="editRuns">得点:</label>
                        <input type="number" id="editRuns" min="0" value="${inning.runs}">
                    </div>
                    <div class="form-group">
                        <label for="editHits">安打:</label>
                        <input type="number" id="editHits" min="0" value="${inning.hits}">
                    </div>
                    <div class="form-group">
                        <label for="editErrors">失策:</label>
                        <input type="number" id="editErrors" min="0" value="${inning.errors}">
                    </div>
                    <div class="form-group">
                        <label for="editNotes">メモ:</label>
                        <textarea id="editNotes" rows="2">${inning.notes || ''}</textarea>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="apply-edit primary-btn">適用</button>
                    <button class="cancel-edit secondary-btn">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.apply-edit').addEventListener('click', async () => {
            await this.applyInningEdit(modal, inning);
        });

        modal.querySelector('.cancel-edit').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    async applyInningEdit(modal, originalInning) {
        const newRuns = parseInt(modal.querySelector('#editRuns').value) || 0;
        const newHits = parseInt(modal.querySelector('#editHits').value) || 0;
        const newErrors = parseInt(modal.querySelector('#editErrors').value) || 0;
        const newNotes = modal.querySelector('#editNotes').value;

        const runsDiff = newRuns - originalInning.runs;

        const updatedInning = {
            ...originalInning,
            runs: newRuns,
            hits: newHits,
            errors: newErrors,
            notes: newNotes
        };

        try {
            await storage.saveInning(updatedInning);

            if (runsDiff !== 0) {
                if (originalInning.isTopHalf) {
                    gameManager.currentGame.awayScore += runsDiff;
                } else {
                    gameManager.currentGame.homeScore += runsDiff;
                }
                await gameManager.saveGame();
            }

            this.updateGameDisplay();
            this.loadInningHistory();
            document.body.removeChild(modal);
            this.showSuccess('イニングを修正しました');
        } catch (error) {
            console.error('イニング修正エラー:', error);
            this.showError('イニングの修正に失敗しました');
        }
    }

    showRunnerAdvancementModal(result, resultDetail, advancement, batter) {
        const currentRunners = gameManager.currentGame.runnersOnBase;
        const outs = gameManager.currentGame.outs;
        const resultLabel = BASEBALL_CONFIG.AT_BAT_RESULTS[result] || result;

        const modal = document.createElement('div');
        modal.className = 'modal runner-modal';
        modal.innerHTML = `
            <div class="modal-content runner-modal-content">
                <h3>走者進塁調整</h3>

                <div class="situation-summary">
                    <div class="play-summary">
                        <strong>${batter.battingOrder}${i18n.t('battingOrderSuffix')} ${batter.name}</strong> → ${resultLabel}
                        ${resultDetail ? `(${resultDetail})` : ''}
                    </div>
                    <div class="before-situation">
                        <strong>打席前:</strong> ${outs}アウト
                        ${this.formatRunnersDisplay(currentRunners)}
                    </div>
                </div>

                <div class="runner-adjustment">
                    <h4>走者進塁設定</h4>

                    ${gameManager.isOutResult(result) ? `
                    <div class="out-detail-setting">
                        <h5>アウト詳細</h5>
                        <div class="runner-setting">
                            <label>誰がアウト:</label>
                            <select id="out-detail-select">
                                ${gameManager.getOutDetailOptions(result, currentRunners).map(option =>
                                    `<option value="${option.value}">${option.label}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="runner-setting">
                            <label>アウトカウント:</label>
                            <select id="out-count-select">
                                <option value="1" ${result.includes('double_play') ? '' : 'selected'}>+1アウト</option>
                                <option value="2" ${result.includes('double_play') ? 'selected' : ''}>+2アウト</option>
                                <option value="3" ${result.includes('triple_play') ? 'selected' : ''}>+3アウト</option>
                            </select>
                        </div>
                    </div>
                    ` : ''}

                    ${currentRunners.third ? `
                    <div class="runner-setting">
                        <label>3塁走者:</label>
                        <select id="third-runner-result">
                            <option value="home" ${advancement.runsScored > 0 ? 'selected' : ''}>本塁生還</option>
                            <option value="third" ${advancement.newRunners.third ? 'selected' : ''}>3塁残留</option>
                            <option value="out">本塁憤死(アウト)</option>
                        </select>
                    </div>
                    ` : ''}

                    ${currentRunners.second ? `
                    <div class="runner-setting">
                        <label>2塁走者:</label>
                        <select id="second-runner-result">
                            <option value="home">本塁生還</option>
                            <option value="third" ${advancement.newRunners.third ? 'selected' : ''}>3塁進塁</option>
                            <option value="second" ${advancement.newRunners.second ? 'selected' : ''}>2塁残留</option>
                            <option value="out">憤死(アウト)</option>
                        </select>
                    </div>
                    ` : ''}

                    ${currentRunners.first ? `
                    <div class="runner-setting">
                        <label>1塁走者:</label>
                        <select id="first-runner-result">
                            <option value="home">本塁生還</option>
                            <option value="third">3塁進塁</option>
                            <option value="second" ${advancement.newRunners.second ? 'selected' : ''}>2塁進塁</option>
                            <option value="first" ${advancement.newRunners.first ? 'selected' : ''}>1塁残留</option>
                            <option value="out">憤死(アウト)</option>
                        </select>
                    </div>
                    ` : ''}

                    ${advancement.batterResult !== 'out' ? `
                    <div class="runner-setting">
                        <label>打者:</label>
                        <select id="batter-result">
                            <option value="home" ${advancement.batterResult === 4 ? 'selected' : ''}>本塁生還</option>
                            <option value="third" ${advancement.batterResult === 3 ? 'selected' : ''}>3塁到達</option>
                            <option value="second" ${advancement.batterResult === 2 ? 'selected' : ''}>2塁到達</option>
                            <option value="first" ${advancement.batterResult === 1 ? 'selected' : ''}>1塁到達</option>
                            <option value="out">アウト</option>
                        </select>
                    </div>
                    ` : ''}
                </div>

                <div class="play-description">
                    <h4>プレー詳細</h4>
                    <div class="input-group">
                        <label for="playDescription">プレー説明（任意）:</label>
                        <textarea id="playDescription" rows="2" placeholder="例: 3塁走者本塁狙うも挟殺、その間に打者2塁到達"></textarea>
                    </div>
                </div>

                <div class="calculated-result">
                    <h4>計算結果</h4>
                    <div id="calculatedScores">得点: ${advancement.runsScored}点</div>
                    <div id="calculatedRunners">結果: ${this.formatRunnersDisplay(advancement.newRunners)}</div>
                    <div id="calculatedOuts">アウト: +${gameManager.isOutResult(result) ? (result.includes('triple_play') ? 3 : result.includes('double_play') ? 2 : 1) : 0}</div>
                </div>

                <div class="modal-buttons">
                    <button class="apply-advancement primary-btn">この設定で記録</button>
                    <button class="auto-apply secondary-btn">自動設定で記録</button>
                    <button class="cancel-advancement tertiary-btn">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // イベントリスナー設定
        const selects = modal.querySelectorAll('select');
        selects.forEach(select => {
            select.addEventListener('change', () => {
                this.updateCalculatedResult(modal);
            });
        });

        modal.querySelector('.apply-advancement').addEventListener('click', async () => {
            const customAdvancement = this.getCustomAdvancement(modal, advancement);
            await this.finalizeAtBat(result, resultDetail, customAdvancement, batter);
            document.body.removeChild(modal);
        });

        modal.querySelector('.auto-apply').addEventListener('click', async () => {
            await this.finalizeAtBat(result, resultDetail, advancement, batter);
            document.body.removeChild(modal);
        });

        modal.querySelector('.cancel-advancement').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    formatRunnersDisplay(runners) {
        const bases = [];
        if (runners.first) bases.push('1塁');
        if (runners.second) bases.push('2塁');
        if (runners.third) bases.push('3塁');
        return bases.length > 0 ? bases.join('・') : 'ランナーなし';
    }

    updateCalculatedResult(modal) {
        // 調整された設定から得点と走者状況を再計算
        let runs = 0;
        let outsAdded = 0;
        const newRunners = { first: null, second: null, third: null };

        // アウト詳細設定を確認
        const outCountSelect = modal.querySelector('#out-count-select');
        if (outCountSelect) {
            outsAdded = parseInt(outCountSelect.value) || 0;
        }

        // 各走者の結果を確認
        ['third', 'second', 'first', 'batter'].forEach(runnerId => {
            const select = modal.querySelector(`#${runnerId}-runner-result`);
            if (select) {
                const result = select.value;
                if (result === 'home') {
                    runs++;
                } else if (result === 'first') {
                    newRunners.first = runnerId === 'batter' ? 'batter' : runnerId;
                } else if (result === 'second') {
                    newRunners.second = runnerId === 'batter' ? 'batter' : runnerId;
                } else if (result === 'third') {
                    newRunners.third = runnerId === 'batter' ? 'batter' : runnerId;
                }
            }
        });

        // 結果表示更新
        modal.querySelector('#calculatedScores').textContent = `得点: ${runs}点`;
        modal.querySelector('#calculatedRunners').textContent = `結果: ${this.formatRunnersDisplay(newRunners)}`;

        const outsEl = modal.querySelector('#calculatedOuts');
        if (outsEl) {
            outsEl.textContent = `アウト: +${outsAdded}`;
        }
    }

    getCustomAdvancement(modal, originalAdvancement) {
        let runs = 0;
        let outsAdded = 0;
        const newRunners = { first: null, second: null, third: null };

        // アウトカウント設定
        const outCountSelect = modal.querySelector('#out-count-select');
        if (outCountSelect) {
            outsAdded = parseInt(outCountSelect.value) || 0;
        }

        // プレー説明
        const playDescription = modal.querySelector('#playDescription').value;

        // 各走者の結果を確認
        ['third', 'second', 'first', 'batter'].forEach(runnerId => {
            const select = modal.querySelector(`#${runnerId}-runner-result`);
            if (select) {
                const result = select.value;
                if (result === 'home') {
                    runs++;
                } else if (result === 'first') {
                    newRunners.first = runnerId === 'batter' ? 'batter' : runnerId;
                } else if (result === 'second') {
                    newRunners.second = runnerId === 'batter' ? 'batter' : runnerId;
                } else if (result === 'third') {
                    newRunners.third = runnerId === 'batter' ? 'batter' : runnerId;
                }
            }
        });

        return {
            ...originalAdvancement,
            newRunners,
            runsScored: runs,
            outsAdded,
            playDescription
        };
    }

    updatePlayerDetailOptions(recordingLevel) {
        const playerDetailSelect = document.getElementById('playerDetailLevel');
        const options = playerDetailSelect.options;

        if (recordingLevel === 'pitch') {
            for (let option of options) {
                option.disabled = option.value === 'basic';
            }
            if (playerDetailSelect.value === 'basic') {
                playerDetailSelect.value = 'standard';
            }
        } else {
            for (let option of options) {
                option.disabled = false;
            }
        }
    }

    // 詳細スコアボード関連メソッド
    initializeDetailedScoreboard() {
        if (!gameManager.currentGame) return;

        const table = document.getElementById('scoreboardTable');
        if (!table) return;

        this.updateDetailedScoreboard();
    }

    updateDetailedScoreboard() {
        if (!gameManager.currentGame) return;

        const table = document.getElementById('scoreboardTable');
        if (!table) return;

        const game = gameManager.currentGame;
        const maxInnings = Math.max(9, game.currentInning);

        // テーブルヘッダーを生成
        let headerHtml = '<tr><th></th>'; // チーム名カラム

        // 1-9回
        for (let i = 1; i <= 9; i++) {
            headerHtml += `<th>${i}</th>`;
        }

        // 延長戦（10回以降）
        for (let i = 10; i <= maxInnings; i++) {
            headerHtml += `<th>${i}</th>`;
        }

        // 統計カラム
        headerHtml += `<th class="total-column" data-i18n="runs">${i18n.t('runs')}</th>`;
        headerHtml += `<th class="stats-column" data-i18n="hits">${i18n.t('hits')}</th>`;
        headerHtml += `<th class="stats-column" data-i18n="errors">${i18n.t('errors')}</th>`;
        headerHtml += '</tr>';

        // アウェイチーム行（先攻・表）
        let awayRowHtml = `<tr class="away-row"><td class="team-name">${game.awayTeam}</td>`;
        for (let i = 1; i <= maxInnings; i++) {
            const inningScore = this.getInningScore('away', i);
            // アウェイチームは表（先攻）なので isTopHalf = true の時がアウェイの攻撃
            const isCurrentInning = (i === game.currentInning && game.isTopHalf);
            const cellClass = isCurrentInning ? 'current-inning' : '';
            awayRowHtml += `<td class="${cellClass}">${inningScore}</td>`;
        }
        awayRowHtml += `<td class="total-column">${game.awayScore}</td>`;
        awayRowHtml += `<td class="stats-column">${this.getTeamHits('away')}</td>`;
        awayRowHtml += `<td class="stats-column">${this.getTeamErrors('away')}</td>`;
        awayRowHtml += '</tr>';

        // ホームチーム行（後攻・裏）
        let homeRowHtml = `<tr class="home-row"><td class="team-name">${game.homeTeam}</td>`;
        for (let i = 1; i <= maxInnings; i++) {
            const inningScore = this.getInningScore('home', i);
            // ホームチームは裏（後攻）なので isTopHalf = false の時がホームの攻撃
            const isCurrentInning = (i === game.currentInning && !game.isTopHalf);
            const cellClass = isCurrentInning ? 'current-inning' : '';
            homeRowHtml += `<td class="${cellClass}">${inningScore}</td>`;
        }
        homeRowHtml += `<td class="total-column">${game.homeScore}</td>`;
        homeRowHtml += `<td class="stats-column">${this.getTeamHits('home')}</td>`;
        homeRowHtml += `<td class="stats-column">${this.getTeamErrors('home')}</td>`;
        homeRowHtml += '</tr>';

        table.innerHTML = headerHtml + awayRowHtml + homeRowHtml;

        // NPBスコアブックが選択されている場合も更新
        const npbBtn = document.getElementById('npbScoreboardBtn');
        if (npbBtn && npbBtn.classList.contains('active')) {
            this.updateNPBScorebook();
        }
    }

    getInningScore(team, inningNumber) {
        if (!gameManager.currentGame) return '-';

        const game = gameManager.currentGame;
        const innings = game.innings || [];

        // 現在進行中のイニングかチェック
        const isCurrentInning = (inningNumber === game.currentInning);

        if (isCurrentInning && gameManager.currentInning) {
            // 現在進行中のイニング
            if (team === 'away' && game.isTopHalf) {
                // アウェイチーム攻撃中（表）
                const runs = gameManager.currentInning.runs;
                return (runs !== undefined && runs !== null) ? runs : 0;
            } else if (team === 'home' && !game.isTopHalf) {
                // ホームチーム攻撃中（裏）
                const runs = gameManager.currentInning.runs;
                return (runs !== undefined && runs !== null) ? runs : 0;
            } else if (team === 'away' && !game.isTopHalf) {
                // アウェイチームの表は既に終了
                const topInning = innings.find(inning =>
                    inning.inning === inningNumber && inning.isTopHalf
                );
                return topInning ? topInning.runs : 0;
            } else {
                // ホームチームの裏はまだ開始されていない
                return '-';
            }
        } else {
            // 過去のイニング
            const topInning = innings.find(inning =>
                inning.inning === inningNumber && inning.isTopHalf
            );
            const bottomInning = innings.find(inning =>
                inning.inning === inningNumber && !inning.isTopHalf
            );

            if (team === 'away') {
                // アウェイ（ビジター）チームは表（先攻）
                return topInning ? (topInning.runs !== undefined ? topInning.runs : 0) : '-';
            } else {
                // ホームチームは裏（後攻）
                return bottomInning ? (bottomInning.runs !== undefined ? bottomInning.runs : 0) : '-';
            }
        }
    }

    getTeamHits(team) {
        if (!gameManager.currentGame || !gameManager.currentGame.teamStats) return '0';
        return gameManager.currentGame.teamStats[team].hits.toString();
    }

    getTeamErrors(team) {
        if (!gameManager.currentGame || !gameManager.currentGame.teamStats) return '0';
        return gameManager.currentGame.teamStats[team].errors.toString();
    }

    // 攻撃中チームのハイライト表示
    updateAttackingTeamHighlight() {
        if (!gameManager.currentGame) return;

        const awayTeamBox = document.getElementById('awayTeamScoreBox');
        const homeTeamBox = document.getElementById('homeTeamScoreBox');

        if (!awayTeamBox || !homeTeamBox) return;

        // 既存のハイライトクラスを削除
        awayTeamBox.classList.remove('attacking');
        homeTeamBox.classList.remove('attacking');

        // 現在攻撃中のチームにハイライトクラスを追加
        if (gameManager.currentGame.isTopHalf) {
            // 表 = アウェイチーム攻撃中
            awayTeamBox.classList.add('attacking');
        } else {
            // 裏 = ホームチーム攻撃中
            homeTeamBox.classList.add('attacking');
        }
    }

    initializeBenchMode() {
        // ベンチモードの初期表示を更新
        if (gameManager.currentGame && gameManager.currentGame.recordingMode === 'bench') {
            this.updateBenchDisplay();
        }
    }

    setupBenchModeListeners() {
        // ベンチモード用の球ごと記録ボタン
        const benchBallBtn = document.getElementById('benchBallBtn');
        const benchStrikeBtn = document.getElementById('benchStrikeBtn');
        const benchHitBtn = document.getElementById('benchHitBtn');
        const benchOutBtn = document.getElementById('benchOutBtn');
        const benchWalkBtn = document.getElementById('benchWalkBtn');
        const benchHbpBtn = document.getElementById('benchHbpBtn');
        const benchErrorBtn = document.getElementById('benchErrorBtn');

        if (benchBallBtn) {
            benchBallBtn.addEventListener('click', () => this.handleBenchPitch('ball'));
        }
        if (benchStrikeBtn) {
            benchStrikeBtn.addEventListener('click', () => this.handleBenchPitch('strike'));
        }
        if (benchHitBtn) {
            benchHitBtn.addEventListener('click', () => this.handleBenchResult('hit'));
        }
        if (benchOutBtn) {
            benchOutBtn.addEventListener('click', () => this.handleBenchResult('out'));
        }
        if (benchWalkBtn) {
            benchWalkBtn.addEventListener('click', () => this.handleBenchResult('walk'));
        }
        if (benchHbpBtn) {
            benchHbpBtn.addEventListener('click', () => this.handleBenchResult('hbp'));
        }
        if (benchErrorBtn) {
            benchErrorBtn.addEventListener('click', () => this.handleBenchResult('error'));
        }

        // 高度なプレー記録ボタン
        const benchSubstitutionBtn = document.getElementById('benchSubstitutionBtn');
        const benchStealBtn = document.getElementById('benchStealBtn');
        const benchBuntBtn = document.getElementById('benchBuntBtn');
        const benchWildPitchBtn = document.getElementById('benchWildPitchBtn');

        if (benchSubstitutionBtn) {
            benchSubstitutionBtn.addEventListener('click', () => this.showBenchSubstitutionModal());
        }
        if (benchStealBtn) {
            benchStealBtn.addEventListener('click', () => this.showBenchStealModal());
        }
        if (benchBuntBtn) {
            benchBuntBtn.addEventListener('click', () => this.handleBenchSpecialPlay('bunt'));
        }
        if (benchWildPitchBtn) {
            benchWildPitchBtn.addEventListener('click', () => this.handleBenchSpecialPlay('wildpitch'));
        }

        // モーダル関連のイベントリスナー
        this.setupBenchModalListeners();
    }

    handleBenchPitch(pitchType) {
        if (!gameManager.currentGame || gameManager.currentGame.recordingMode !== 'bench') {
            return;
        }

        console.log(`ベンチモード投球記録: ${pitchType}`);

        try {
            if (pitchType === 'ball') {
                gameManager.currentGame.balls++;
                if (gameManager.currentGame.balls >= 4) {
                    this.handleBenchResult('walk');
                    return;
                }
            } else if (pitchType === 'strike') {
                gameManager.currentGame.strikes++;
                if (gameManager.currentGame.strikes >= 3) {
                    this.handleBenchResult('strikeout');
                    return;
                }
            }

            this.updateBenchDisplay();
        } catch (error) {
            console.error('ベンチモード投球記録エラー:', error);
        }
    }

    handleBenchResult(resultType) {
        if (!gameManager.currentGame || gameManager.currentGame.recordingMode !== 'bench') {
            return;
        }

        console.log(`ベンチモード打席結果: ${resultType}`);

        try {
            // カウントリセット
            gameManager.currentGame.balls = 0;
            gameManager.currentGame.strikes = 0;

            switch (resultType) {
                case 'hit':
                    // ヒット処理（簡単な1塁到達）
                    this.advanceRunners();
                    this.setRunner('first', this.getCurrentBatterName());
                    break;
                case 'out':
                case 'strikeout':
                    // アウト処理
                    gameManager.currentGame.outs++;
                    break;
                case 'walk':
                case 'hbp':
                    // 四球・死球処理
                    this.advanceRunnersForce();
                    this.setRunner('first', this.getCurrentBatterName());
                    break;
                case 'error':
                    // エラー処理（1塁到達）
                    this.setRunner('first', this.getCurrentBatterName());
                    break;
            }

            // 3アウト後のイニング処理
            if (gameManager.currentGame.outs >= 3) {
                this.endInning();
            } else {
                this.nextBatter();
            }

            this.updateBenchDisplay();
            this.updateGameDisplay();
        } catch (error) {
            console.error('ベンチモード打席結果処理エラー:', error);
        }
    }

    updateBenchDisplay() {
        if (!gameManager.currentGame || gameManager.currentGame.recordingMode !== 'bench') {
            return;
        }

        // 現在の打者表示
        const benchCurrentBatter = document.getElementById('benchCurrentBatter');
        if (benchCurrentBatter) {
            benchCurrentBatter.textContent = this.getCurrentBatterName();
        }

        // カウント表示
        const benchCount = document.getElementById('benchCount');
        if (benchCount) {
            const balls = '●'.repeat(gameManager.currentGame.balls) + '○'.repeat(3 - gameManager.currentGame.balls);
            const strikes = '●'.repeat(gameManager.currentGame.strikes) + '○'.repeat(2 - gameManager.currentGame.strikes);
            benchCount.textContent = `${balls}-${strikes}`;
        }

        // アウト数表示
        const benchOuts = document.getElementById('benchOuts');
        if (benchOuts) {
            benchOuts.textContent = `${gameManager.currentGame.outs}${i18n.t('outsCount')}`;
        }

        // 走者表示
        this.updateBenchRunners();
    }

    updateBenchRunners() {
        const bases = ['first', 'second', 'third'];
        const benchIds = ['benchFirst', 'benchSecond', 'benchThird'];

        bases.forEach((base, index) => {
            const benchBase = document.getElementById(benchIds[index]);
            if (benchBase) {
                const runner = gameManager.currentGame.runnersOnBase[base];
                const runnerNameEl = benchBase.querySelector('.bench-runner-name');

                if (runner) {
                    benchBase.classList.add('occupied');
                    if (runnerNameEl) {
                        runnerNameEl.textContent = runner.name || runner;
                    }
                } else {
                    benchBase.classList.remove('occupied');
                    if (runnerNameEl) {
                        runnerNameEl.textContent = '-';
                    }
                }
            }
        });
    }

    getCurrentBatterName() {
        // 簡単な打者名取得（実際の選手データから取得）
        if (!gameManager.currentGame) return '-';

        const team = gameManager.currentGame.isTopHalf ? 'away' : 'home';
        const battingOrder = gameManager.currentBattingOrder[team];
        const players = gameManager.currentGame.players[team];

        if (players && players.length > 0) {
            const player = players.find(p => p.battingOrder === battingOrder);
            return player ? player.name : `${battingOrder}${i18n.t('battingOrderSuffix')}`;
        }

        return `${battingOrder}${i18n.t('battingOrderSuffix')}`;
    }

    setRunner(base, runnerName) {
        if (gameManager.currentGame) {
            gameManager.currentGame.runnersOnBase[base] = { name: runnerName };
        }
    }

    advanceRunners() {
        // ヒット時の走者進塁（シンプル版）
        const game = gameManager.currentGame;
        if (!game) return;

        // 3塁→本塁（得点）
        if (game.runnersOnBase.third) {
            if (game.isTopHalf) {
                game.awayScore++;
            } else {
                game.homeScore++;
            }
            game.runnersOnBase.third = null;
        }

        // 2塁→3塁
        if (game.runnersOnBase.second) {
            game.runnersOnBase.third = game.runnersOnBase.second;
            game.runnersOnBase.second = null;
        }

        // 1塁→2塁
        if (game.runnersOnBase.first) {
            game.runnersOnBase.second = game.runnersOnBase.first;
            game.runnersOnBase.first = null;
        }
    }

    advanceRunnersForce() {
        // 四球・死球時の押し出し進塁
        const game = gameManager.currentGame;
        if (!game) return;

        // 満塁時の押し出し
        if (game.runnersOnBase.first && game.runnersOnBase.second && game.runnersOnBase.third) {
            if (game.isTopHalf) {
                game.awayScore++;
            } else {
                game.homeScore++;
            }
        }

        // 走者を順次進塁
        if (game.runnersOnBase.second && game.runnersOnBase.first) {
            game.runnersOnBase.third = game.runnersOnBase.second;
        }
        if (game.runnersOnBase.first) {
            game.runnersOnBase.second = game.runnersOnBase.first;
        }
    }

    nextBatter() {
        // 次の打者に進む
        if (!gameManager.currentGame) return;

        const team = gameManager.currentGame.isTopHalf ? 'away' : 'home';
        gameManager.currentBattingOrder[team]++;

        // 9番の次は1番に戻る
        if (gameManager.currentBattingOrder[team] > 9) {
            gameManager.currentBattingOrder[team] = 1;
        }
    }

    endInning() {
        // イニング終了処理
        console.log('ベンチモード: イニング終了');

        if (!gameManager.currentGame) return;

        // 走者クリア
        gameManager.currentGame.runnersOnBase = {
            first: null,
            second: null,
            third: null
        };

        // アウト数リセット
        gameManager.currentGame.outs = 0;

        // イニング進行
        if (gameManager.currentGame.isTopHalf) {
            // 表終了→裏へ
            gameManager.currentGame.isTopHalf = false;
        } else {
            // 裏終了→次のイニングへ
            gameManager.currentGame.isTopHalf = true;
            gameManager.currentGame.currentInning++;
        }

        // イニング表示更新
        document.getElementById('currentInning').textContent = gameManager.getCurrentInningDisplay();
    }

    // ===== 高度なベンチ記録機能 =====

    setupBenchModalListeners() {
        // 選手交代モーダル
        const benchSubModalClose = document.getElementById('benchSubModalClose');
        const benchSubCancel = document.getElementById('benchSubCancel');
        const benchSubConfirm = document.getElementById('benchSubConfirm');

        if (benchSubModalClose) {
            benchSubModalClose.addEventListener('click', () => this.hideBenchSubstitutionModal());
        }
        if (benchSubCancel) {
            benchSubCancel.addEventListener('click', () => this.hideBenchSubstitutionModal());
        }
        if (benchSubConfirm) {
            benchSubConfirm.addEventListener('click', () => this.executeBenchSubstitution());
        }

        // 盗塁モーダル
        const benchStealModalClose = document.getElementById('benchStealModalClose');
        const benchStealSuccess = document.getElementById('benchStealSuccess');
        const benchStealOut = document.getElementById('benchStealOut');
        const benchStealWild = document.getElementById('benchStealWild');

        if (benchStealModalClose) {
            benchStealModalClose.addEventListener('click', () => this.hideBenchStealModal());
        }
        if (benchStealSuccess) {
            benchStealSuccess.addEventListener('click', () => this.executeBenchSteal('success'));
        }
        if (benchStealOut) {
            benchStealOut.addEventListener('click', () => this.executeBenchSteal('out'));
        }
        if (benchStealWild) {
            benchStealWild.addEventListener('click', () => this.executeBenchSteal('wild'));
        }

        // 交代タイプ選択
        const subTypeButtons = document.querySelectorAll('.sub-type-btn');
        subTypeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                subTypeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateSubstitutionPlayerOptions(btn.dataset.type);
            });
        });
    }

    showBenchSubstitutionModal() {
        const modal = document.getElementById('benchSubstitutionModal');
        if (modal) {
            modal.style.display = 'flex';
            this.populateSubstitutionModal();
        }
    }

    hideBenchSubstitutionModal() {
        const modal = document.getElementById('benchSubstitutionModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    populateSubstitutionModal() {
        // DH制の場合のみDH→投手ボタンを表示
        const dhToPitcherBtn = document.querySelector('[data-type="dh-to-pitcher"]');
        if (dhToPitcherBtn) {
            dhToPitcherBtn.style.display = gameManager.currentGame?.dhRule ? 'inline-block' : 'none';
        }

        // 交代対象選手のリストを更新
        this.updateSubstitutionPlayerOptions('pinch-hit'); // デフォルト
    }

    updateSubstitutionPlayerOptions(subType) {
        const outPlayerSelect = document.getElementById('benchOutPlayer');
        const inPlayerSelect = document.getElementById('benchInPlayer');

        if (!outPlayerSelect || !inPlayerSelect || !gameManager.currentGame) return;

        // 退場選手の選択肢を設定
        outPlayerSelect.innerHTML = '';
        inPlayerSelect.innerHTML = '';

        const currentTeam = gameManager.currentGame.isTopHalf ? 'away' : 'home';
        const players = gameManager.currentGame.players[currentTeam] || [];

        if (subType === 'dh-to-pitcher') {
            // DH→投手交代の特別処理
            const dhPlayer = players.find(p => p.isStarter && p.battingOrder === 10);
            const currentPitcher = players.find(p => p.isStarter && p.position === 'P' && p.battingOrder !== 10);

            if (dhPlayer) {
                const option = document.createElement('option');
                option.value = dhPlayer.id || dhPlayer.name;
                option.textContent = `10${i18n.t('battingOrderSuffix')} ${dhPlayer.name} (DH)`;
                outPlayerSelect.appendChild(option);
            }

            if (currentPitcher) {
                const option = document.createElement('option');
                option.value = currentPitcher.id || currentPitcher.name;
                option.textContent = `${currentPitcher.battingOrder}${i18n.t('battingOrderSuffix')} ${currentPitcher.name} (P)`;
                inPlayerSelect.appendChild(option);
            }
        } else {
            // 通常の選手交代処理
            // 出場中選手（スターティングメンバー）
            const activePlayers = players.filter(p => p.isStarter && !p.isBench);
            activePlayers.forEach(player => {
                const option = document.createElement('option');
                option.value = player.id || player.name;
                option.textContent = `${player.battingOrder}${i18n.t('battingOrderSuffix')} ${player.name} (${player.position || ''})`;
                outPlayerSelect.appendChild(option);
            });
        }

        // 控え選手（DH→投手交代では不要）
        if (subType !== 'dh-to-pitcher') {
            const benchPlayers = players.filter(p => p.isBench);
            benchPlayers.forEach(player => {
                const option = document.createElement('option');
                option.value = player.id || player.name;
                option.textContent = player.name;
                inPlayerSelect.appendChild(option);
            });
        }

        // 簡易代替（選手データが少ない場合）
        if (activePlayers.length === 0) {
            for (let i = 1; i <= 9; i++) {
                const option = document.createElement('option');
                option.value = `player-${i}`;
                option.textContent = `${i}${i18n.t('battingOrderSuffix')} 選手`;
                outPlayerSelect.appendChild(option);
            }
        }

        if (benchPlayers.length === 0) {
            for (let i = 10; i <= 15; i++) {
                const option = document.createElement('option');
                option.value = `bench-${i}`;
                option.textContent = `控え選手${i}`;
                inPlayerSelect.appendChild(option);
            }
        }
    }

    executeBenchSubstitution() {
        const subType = document.querySelector('.sub-type-btn.active')?.dataset.type;
        const outPlayer = document.getElementById('benchOutPlayer').value;
        const inPlayer = document.getElementById('benchInPlayer').value;

        if (!subType || !outPlayer || !inPlayer) {
            alert('選手交代の情報を選択してください');
            return;
        }

        console.log(`ベンチモード選手交代: ${subType}, Out: ${outPlayer}, In: ${inPlayer}`);

        // 簡単な交代処理（実際のゲームロジックに統合必要）
        this.recordSubstitution(subType, outPlayer, inPlayer);
        this.hideBenchSubstitutionModal();

        // 表示更新
        this.updateBenchDisplay();
        this.updateGameDisplay();
    }

    recordSubstitution(type, outPlayer, inPlayer) {
        // 選手交代の記録（ログ）
        if (!gameManager.currentGame.substitutions) {
            gameManager.currentGame.substitutions = [];
        }

        gameManager.currentGame.substitutions.push({
            inning: gameManager.currentGame.currentInning,
            isTopHalf: gameManager.currentGame.isTopHalf,
            type: type,
            outPlayer: outPlayer,
            inPlayer: inPlayer,
            timestamp: new Date().toISOString()
        });

        // DH→投手交代の特別処理
        if (type === 'dh-to-pitcher') {
            this.executeDHToPitcherSubstitution(outPlayer, inPlayer);
        }

        console.log('選手交代記録完了:', type);
    }

    executeDHToPitcherSubstitution(dhPlayerId, pitcherId) {
        const currentTeam = gameManager.currentGame.isTopHalf ? 'away' : 'home';
        const players = gameManager.currentGame.players[currentTeam] || [];

        // DH選手とピッチャーを見つける
        const dhPlayer = players.find(p => (p.id === dhPlayerId || p.name === dhPlayerId));
        const pitcher = players.find(p => (p.id === pitcherId || p.name === pitcherId));

        if (!dhPlayer || !pitcher) {
            console.error('DH→投手交代: 選手が見つかりません', { dhPlayerId, pitcherId });
            return;
        }

        console.log('DH→投手交代実行:', {
            dh: `${dhPlayer.name} (${dhPlayer.battingOrder}${i18n.t('battingOrderSuffix')})`,
            pitcher: `${pitcher.name} (${pitcher.battingOrder}${i18n.t('battingOrderSuffix')})`
        });

        // 1. DH選手をピッチャーに変更
        dhPlayer.position = 'P';

        // 2. 元のピッチャーを退場させる（ベンチ入り）
        pitcher.isStarter = false;
        pitcher.isBench = true;
        pitcher.position = null;

        // 3. DH制を失効（今後DH制は使用不可）
        gameManager.currentGame.dhRule = false;
        gameManager.currentGame.dhLost = true; // DH失効フラグ

        console.log('DH制失効: 大谷翔平スタイルの投手転換完了');
    }

    showBenchStealModal() {
        const modal = document.getElementById('benchStealModal');
        if (modal) {
            modal.style.display = 'flex';
            this.populateStealModal();
        }
    }

    hideBenchStealModal() {
        const modal = document.getElementById('benchStealModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    populateStealModal() {
        const stealRunnerSelect = document.getElementById('benchStealRunner');
        if (!stealRunnerSelect || !gameManager.currentGame) return;

        stealRunnerSelect.innerHTML = '';

        // 走者がいる塁をチェック
        const runners = gameManager.currentGame.runnersOnBase;
        const bases = [
            { key: 'first', label: '1塁', next: 'second' },
            { key: 'second', label: '2塁', next: 'third' },
            { key: 'third', label: '3塁', next: 'home' }
        ];

        let hasRunners = false;
        bases.forEach(base => {
            if (runners[base.key]) {
                const option = document.createElement('option');
                option.value = base.key;
                option.textContent = `${base.label}: ${runners[base.key].name || runners[base.key]}`;
                stealRunnerSelect.appendChild(option);
                hasRunners = true;
            }
        });

        if (!hasRunners) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '走者なし';
            stealRunnerSelect.appendChild(option);
        }
    }

    executeBenchSteal(result) {
        const stealRunner = document.getElementById('benchStealRunner').value;
        const stealTarget = document.getElementById('benchStealTarget').value;

        if (!stealRunner) {
            alert('盗塁走者を選択してください');
            return;
        }

        console.log(`ベンチモード盗塁: ${stealRunner} → ${stealTarget}, 結果: ${result}`);

        const game = gameManager.currentGame;
        if (!game) return;

        switch (result) {
            case 'success':
                // 盗塁成功: 走者進塁
                this.executeStealSuccess(stealRunner, stealTarget);
                break;
            case 'out':
                // 盗塁失敗: アウトカウント+1
                game.outs++;
                game.runnersOnBase[stealRunner] = null;
                break;
            case 'wild':
                // 暴投進塁: 進塁＋別途記録
                this.executeStealSuccess(stealRunner, stealTarget);
                this.recordWildPitch();
                break;
        }

        // 3アウト後のイニング処理
        if (game.outs >= 3) {
            this.endInning();
        }

        this.hideBenchStealModal();
        this.updateBenchDisplay();
        this.updateGameDisplay();
    }

    executeStealSuccess(fromBase, toBase) {
        const game = gameManager.currentGame;
        if (!game) return;

        const runner = game.runnersOnBase[fromBase];
        if (!runner) return;

        // 走者移動
        game.runnersOnBase[fromBase] = null;

        if (toBase === 'home') {
            // 本塁へ盗塁（得点）
            if (game.isTopHalf) {
                game.awayScore++;
            } else {
                game.homeScore++;
            }
        } else {
            game.runnersOnBase[toBase] = runner;
        }
    }

    handleBenchSpecialPlay(playType) {
        console.log(`ベンチモード特殊プレー: ${playType}`);

        switch (playType) {
            case 'bunt':
                this.recordBunt();
                break;
            case 'wildpitch':
                this.recordWildPitch();
                break;
        }

        this.updateBenchDisplay();
        this.updateGameDisplay();
    }

    recordBunt() {
        // バント記録（打席結果として処理）
        console.log('バント記録');
        // 実際の処理では打席結果との組み合わせが必要
    }

    recordWildPitch() {
        // 暴投記録（走者進塁を伴う可能性）
        console.log('暴投記録');

        // 全走者を1塁進塁（簡易処理）
        const game = gameManager.currentGame;
        if (!game) return;

        // 3塁→本塁（得点）
        if (game.runnersOnBase.third) {
            if (game.isTopHalf) {
                game.awayScore++;
            } else {
                game.homeScore++;
            }
            game.runnersOnBase.third = null;
        }

        // 2塁→3塁
        if (game.runnersOnBase.second) {
            game.runnersOnBase.third = game.runnersOnBase.second;
            game.runnersOnBase.second = null;
        }

        // 1塁→2塁
        if (game.runnersOnBase.first) {
            game.runnersOnBase.second = game.runnersOnBase.first;
            game.runnersOnBase.first = null;
        }
    }

    // ===== NPBスコアブック機能 =====

    setupNPBScoreboardToggle() {
        const standardBtn = document.getElementById('standardScoreboardBtn');
        const npbBtn = document.getElementById('npbScoreboardBtn');

        if (standardBtn && npbBtn) {
            standardBtn.addEventListener('click', () => this.switchScoreboardView('standard'));
            npbBtn.addEventListener('click', () => this.switchScoreboardView('npb'));
        }

        // NPBスコアブッククラスの初期化
        this.npbScorebook = new NPBScorebook();
    }

    switchScoreboardView(viewType) {
        const standardScoreboard = document.getElementById('detailedScoreboard');
        const npbScoreboard = document.getElementById('npbScoreboardContainer');
        const standardBtn = document.getElementById('standardScoreboardBtn');
        const npbBtn = document.getElementById('npbScoreboardBtn');

        if (viewType === 'standard') {
            if (standardScoreboard) standardScoreboard.style.display = 'block';
            if (npbScoreboard) npbScoreboard.style.display = 'none';
            if (standardBtn) standardBtn.classList.add('active');
            if (npbBtn) npbBtn.classList.remove('active');
        } else if (viewType === 'npb') {
            if (standardScoreboard) standardScoreboard.style.display = 'none';
            if (npbScoreboard) npbScoreboard.style.display = 'block';
            if (standardBtn) standardBtn.classList.remove('active');
            if (npbBtn) npbBtn.classList.add('active');

            // NPBスコアブック表示を更新
            this.updateNPBScorebook();
        }
    }

    updateNPBScorebook() {
        if (!this.npbScorebook || !gameManager.currentGame) {
            console.log('NPBスコアブック更新スキップ: ', {
                hasScorebook: !!this.npbScorebook,
                hasGame: !!gameManager.currentGame
            });
            return;
        }

        const container = document.getElementById('npbScoreboardContainer');
        if (!container) {
            console.log('NPBスコアブック更新スキップ: コンテナが見つからない');
            return;
        }

        try {
            // 現在のゲームデータをNPB形式に変換
            const gameData = this.convertCurrentGameToNPBFormat();
            console.log('NPB変換済みゲームデータ:', gameData);

            // NPBスコアブックHTML生成
            const scorebookHTML = this.npbScorebook.generateScorebookHTML(gameData);
            container.innerHTML = scorebookHTML;

            console.log('NPBスコアブック更新完了');
        } catch (error) {
            console.error('NPBスコアブック更新エラー:', error);
            container.innerHTML = '<div style="text-align:center; padding:2rem; color:#666;">NPBスコアブック表示エラーが発生しました</div>';
        }
    }

    convertCurrentGameToNPBFormat() {
        const game = gameManager.currentGame;
        if (!game) throw new Error('ゲームデータなし');

        console.log('変換元ゲームデータ:', {
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            playersHome: game.players?.home?.length || 0,
            playersAway: game.players?.away?.length || 0,
            inningsCount: game.innings?.length || 0
        });

        // 現在のアプリデータをNPB形式に変換
        const npbData = {
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            players: game.players,
            innings: this.convertInningsToNPBFormat(game)
        };

        console.log('変換後NPBデータ:', npbData);
        return npbData;
    }

    convertInningsToNPBFormat(game) {
        // イニングデータをNPB形式に変換
        // 現在のアプリの構造に基づいて実装
        const innings = [];

        for (let i = 1; i <= 9; i++) {
            const inningData = {
                number: i,
                top: this.createNPBInningHalf(game, i, true),
                bottom: this.createNPBInningHalf(game, i, false)
            };
            innings.push(inningData);
        }

        return innings;
    }

    createNPBInningHalf(game, inningNumber, isTopHalf) {
        // 実際のゲームデータからイニング情報を取得
        const inningData = game.innings.find(inning =>
            inning.inning === inningNumber && inning.isTopHalf === isTopHalf
        );

        if (!inningData) {
            return { atBats: [] };
        }

        // AtBatデータを取得してNPB形式に変換
        const atBats = [];

        if (inningData.atBats && inningData.atBats.length > 0) {
            inningData.atBats.forEach(atBat => {
                const team = isTopHalf ? 'away' : 'home';
                const player = game.players[team].find(p => p.id === atBat.playerId) ||
                              game.players[team].find(p => p.battingOrder === atBat.battingOrder);

                atBats.push({
                    batterName: player ? player.name : '不明',
                    battingOrder: atBat.battingOrder,
                    result: atBat.result || 'pending',
                    runs: atBat.runs || 0,
                    rbi: atBat.rbis || 0
                });
            });
        }

        return { atBats };
    }

    generateSampleResult(inning, batterIndex) {
        // デモ用のサンプル結果生成
        const results = ['6-3', 'F8', 'K', '━', '■', '4-3', 'L6', '①'];
        return results[(inning + batterIndex) % results.length];
    }

    // チーム情報編集モーダル
    showEditTeamInfoModal() {
        const game = gameManager.currentGame;
        if (!game) return;

        // 試合が進行中かチェック（1回表の最初の打席前まで編集可能）
        const canEdit = !game.innings || game.innings.length === 0 ||
                       (game.innings.length === 1 && game.innings[0].atBats.length === 0);

        if (!canEdit) {
            this.showError(i18n.t('cannotEditAfterStart'));
            return;
        }

        const modal = document.getElementById('editTeamInfoModal');
        document.getElementById('editHomeTeamName').value = game.homeTeam;
        document.getElementById('editAwayTeamName').value = game.awayTeam;

        modal.style.display = 'flex';
        setTimeout(() => i18n.updatePageContent(), 100);

        // モーダル内のイベントリスナー
        this.setupEditTeamInfoModalListeners();
    }

    setupEditTeamInfoModalListeners() {
        const modal = document.getElementById('editTeamInfoModal');

        // 閉じるボタン
        const closeButtons = modal.querySelectorAll('.close-modal');
        closeButtons.forEach(btn => {
            btn.onclick = () => {
                modal.style.display = 'none';
            };
        });

        // 入れ替えボタン
        const swapBtn = document.getElementById('swapTeamsBtn');
        swapBtn.onclick = () => {
            const homeInput = document.getElementById('editHomeTeamName');
            const awayInput = document.getElementById('editAwayTeamName');
            const temp = homeInput.value;
            homeInput.value = awayInput.value;
            awayInput.value = temp;
        };

        // 保存ボタン
        const saveBtn = document.getElementById('saveTeamInfoBtn');
        saveBtn.onclick = async () => {
            await this.saveTeamInfo();
        };

        // モーダル外クリックで閉じる
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    async saveTeamInfo() {
        const game = gameManager.currentGame;
        if (!game) return;

        const newHomeTeam = document.getElementById('editHomeTeamName').value.trim();
        const newAwayTeam = document.getElementById('editAwayTeamName').value.trim();

        if (!newHomeTeam || !newAwayTeam) {
            this.showError('チーム名を入力してください');
            return;
        }

        // チーム名が入れ替わった場合、選手データも入れ替える
        const isSwapped = (newHomeTeam === game.awayTeam && newAwayTeam === game.homeTeam);

        if (isSwapped) {
            // 選手データを入れ替え
            const tempPlayers = game.players.home;
            game.players.home = game.players.away;
            game.players.away = tempPlayers;

            // 各選手のteamプロパティを更新
            game.players.home.forEach(p => p.team = 'home');
            game.players.away.forEach(p => p.team = 'away');
        }

        // チーム名を更新
        game.homeTeam = newHomeTeam;
        game.awayTeam = newAwayTeam;

        // ゲームを保存
        await gameManager.saveGame();

        // 画面を更新
        document.getElementById('homeTeamName').textContent = newHomeTeam;
        document.getElementById('awayTeamName').textContent = newAwayTeam;
        document.getElementById('homeTeamName').removeAttribute('data-i18n');
        document.getElementById('awayTeamName').removeAttribute('data-i18n');

        // モーダルを閉じる
        document.getElementById('editTeamInfoModal').style.display = 'none';

        this.showSuccess('チーム情報を更新しました');
    }
}

const app = new BaseballApp();

// グローバルアクセス用
window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});