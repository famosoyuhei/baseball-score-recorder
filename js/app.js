class BaseballApp {
    constructor() {
        this.currentScreen = 'welcomeScreen';
        this.isInitialized = false;
        this.youtubePanelCollapsed = false;
        this.youtubePlayer = null;
        this.youtubeCurrentVideoId = '';
        this.youtubeApiReadyPromise = null;
        this.youtubeTimeSyncTimer = null;
        this.youtubeDataApiKeyStorageKey = 'baseballScoreYouTubeDataApiKey';
    }

    async init() {
        try {
            await storage.init();

            // i18n初期化とページコンテンツの翻訳適用
            if (typeof i18n !== 'undefined') {
                i18n.updatePageContent();
            }

            this.setupEventListeners();
            this.setupServiceWorker();
            this.isInitialized = true;
            console.log('アプリケーション初期化完了');
            this.loadActiveGamesOnWelcome();
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
                    if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                })
                .catch((error) => {
                    console.log('Service Worker登録失敗:', error);
                });
        }
    }

    setupEventListeners() {
        document.addEventListener('click', (event) => this.captureYouTubeOperationClick(event));
        this.setupYouTubeApiKeyControls();

        document.getElementById('startBtn').addEventListener('click', () => {
            this.showScreen('gameSetupScreen');
        });

        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.showScreen('gameSetupScreen');
        });

        document.getElementById('loadGameBtn').addEventListener('click', () => {
            this.loadGamesList();
        });

        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.showAppSettingsModal();
        });

        document.getElementById('backToWelcome').addEventListener('click', () => {
            this.showScreen('welcomeScreen');
        });

        document.getElementById('gameSetupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startNewGame();
        });

        // コールドゲームルール プリセット選択（セットアップ画面）
        document.querySelectorAll('#gameSetupForm .mercy-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => this.onMercyPresetSelect(btn, 'setup'));
        });
        document.getElementById('addMercyRuleBtn').addEventListener('click', () => {
            this.addMercyCustomRow('setup');
        });

        // 試合詳細閲覧モーダル
        document.getElementById('gameDetailCloseBtn').addEventListener('click', () => {
            document.getElementById('gameDetailModal').classList.add('modal--hidden');
        });
        document.getElementById('gameDetailClose2Btn').addEventListener('click', () => {
            document.getElementById('gameDetailModal').classList.add('modal--hidden');
        });
        document.getElementById('gameDetailShareBtn').addEventListener('click', () => {
            const gameId = parseInt(document.getElementById('gameDetailShareBtn').dataset.gameId, 10);
            if (gameId) this.shareSavedGame(gameId);
        });
        document.getElementById('gameDetailExportImageBtn').addEventListener('click', () => {
            const gameId = parseInt(document.getElementById('gameDetailExportImageBtn').dataset.gameId, 10);
            if (gameId) this.exportSavedGameImage(gameId);
        });
        document.getElementById('gameDetailPrintBtn').addEventListener('click', () => {
            const gameId = parseInt(document.getElementById('gameDetailPrintBtn').dataset.gameId, 10);
            if (gameId) this.printSavedGameScoreSheet(gameId);
        });
        document.getElementById('gameDetailExportCsvBtn').addEventListener('click', () => {
            const gameId = parseInt(document.getElementById('gameDetailExportCsvBtn').dataset.gameId, 10);
            if (gameId) this.exportSavedGameCsv(gameId);
        });
        document.getElementById('gameDetailExportBackupBtn').addEventListener('click', () => {
            const gameId = parseInt(document.getElementById('gameDetailExportBackupBtn').dataset.gameId, 10);
            if (gameId) this.exportSavedGameBackup(gameId);
        });

        document.getElementById('appSettingsCloseBtn')?.addEventListener('click', () => {
            this.hideAppSettingsModal();
        });
        document.getElementById('appSettingsClose2Btn')?.addEventListener('click', () => {
            this.hideAppSettingsModal();
        });
        document.getElementById('youtubeApiTestBtn')?.addEventListener('click', () => {
            this.testYouTubeDataApiKey();
        });
        document.getElementById('youtubeSearchBtn')?.addEventListener('click', () => {
            this.searchYouTubeFullGameVideos();
        });

        // ゲームルール設定モーダル（試合中）
        document.getElementById('gameRulesBtn').addEventListener('click', () => {
            this.showGameRulesModal();
        });
        document.querySelectorAll('#gameRulesMercyPresets .mercy-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => this.onMercyPresetSelect(btn, 'modal'));
        });
        document.getElementById('addGameRulesMercyRuleBtn').addEventListener('click', () => {
            this.addMercyCustomRow('modal');
        });
        document.getElementById('gameRulesSaveBtn').addEventListener('click', () => {
            this.saveGameRules();
        });
        document.getElementById('gameRulesCancelBtn').addEventListener('click', () => {
            this.hideGameRulesModal();
        });
        document.querySelectorAll('#gameRulesModal .official-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('minInningsForOfficialInput').value = btn.dataset.min;
                document.querySelectorAll('#gameRulesModal .official-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 雨天等コールド
        document.getElementById('weatherCallBtn').addEventListener('click', () => {
            this.showWeatherCallModal();
        });
        document.getElementById('weatherCallConfirmBtn').addEventListener('click', () => {
            this.confirmWeatherCall();
        });
        document.getElementById('weatherCallCancelBtn').addEventListener('click', () => {
            document.getElementById('weatherCallModal').classList.add('modal--hidden');
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
        document.getElementById('abandonGameBtn').addEventListener('click', () => {
            this.abandonCurrentGame();
        });

        document.getElementById('confirmGameBtn').addEventListener('click', () => {
            this.confirmGame();
        });

        document.getElementById('undoFromEndBtn').addEventListener('click', () => {
            this.undoFromGameEnd();
        });

        document.getElementById('recordingLevel').addEventListener('change', (e) => {
            this.updatePlayerDetailOptions(e.target.value);
        });

        // 言語切り替え
        document.getElementById('languageSelect').addEventListener('change', (e) => {
            console.log('🌐 Language change event fired, selected value:', e.target.value);
            console.log('Before setLanguage - current language:', i18n.getCurrentLanguage());

            i18n.setLanguage(e.target.value);

            console.log('After setLanguage - current language:', i18n.getCurrentLanguage());
            console.log('battingOrderSuffix:', i18n.t('battingOrderSuffix'));
            console.log('localStorage selectedLanguage:', localStorage.getItem('selectedLanguage'));

            // 選手登録画面が表示されている場合は再描画
            if (this.currentScreen === 'gameScreen' &&
                document.querySelector('.player-setup-section')) {
                console.log('Redrawing player setup screen');
                this.showPlayerSetupScreen();
            }

            // ゲーム進行中の場合はイニング表示を更新
            if (this.currentScreen === 'gameScreen' && gameManager.currentGame) {
                console.log('Updating game screen elements');
                document.getElementById('currentInning').textContent = gameManager.getCurrentInningDisplay();
                this.updateDetailedScoreboard();
                this.updateAttackingTeamHighlight();
                console.log('Calling updateBatterDisplay...');
                this.updateBatterDisplay();  // 現在打者表示を更新
            }

            // 選手登録中や試合開始直後で打者表示要素が存在する場合も更新
            const currentBatterEl = document.getElementById('current-batter-name');
            if (currentBatterEl && gameManager.getCurrentBatter()) {
                console.log('Updating current batter display during setup/early game');
                const batter = gameManager.getCurrentBatter();
                const suffix = i18n.t('battingOrderSuffix');

                // 名前から古い形式のサフィックスを除去
                let cleanName = batter.name;
                const match = cleanName.match(/^(\d+)(番|º|°)?$/);
                if (match) {
                    cleanName = match[1];  // 数字のみ
                }

                // 名前が打順番号と同じ（未登録の場合）は、番号のみ表示
                const displayText = cleanName === String(batter.battingOrder)
                    ? `${batter.battingOrder}${suffix}`
                    : `${batter.battingOrder}${suffix} ${cleanName}`;

                console.log('Updated batter display to:', displayText);
                currentBatterEl.textContent = displayText;
            }
        });

        // 初期言語設定
        document.getElementById('languageSelect').value = i18n.getCurrentLanguage();
        i18n.updatePageContent();
        this.updateYouTubeApiKeyControls();

        // ベンチモード用イベントリスナー
        this.setupBenchModeListeners();

        // NPBスコアブック切り替え機能
        this.setupNPBScoreboardToggle();

        // 追加プレー確認モーダル
        document.getElementById('yesAdditionalPlayBtn').addEventListener('click', () => {
            this.onAdditionalPlayYes();
        });
        document.getElementById('noAdditionalPlayBtn').addEventListener('click', () => {
            this.onAdditionalPlayNo();
        });

        // 追加プレー記録モーダル
        document.getElementById('completeAdditionalPlayBtn').addEventListener('click', () => {
            this.onCompleteAdditionalPlay();
        });

        // ボールデッドバナー「プレー再開」
        document.getElementById('resumePlayBtn').addEventListener('click', () => {
            this.hideBallDeadBanner();
            // 投球記録モード中の場合は投球UIも更新
            if (document.querySelector('.pitch-interface')) {
                this.updatePitchDisplay();
            }
        });

        // ホームラン柵越え確認モーダル
        document.getElementById('fenceOverYesBtn').addEventListener('click', () => {
            this.onHomerunFenceOver(true);
        });
        document.getElementById('fenceOverNoBtn').addEventListener('click', () => {
            this.onHomerunFenceOver(false);
        });

        // タイブレーク設定モーダル
        document.getElementById('tiebreakerYesBtn').addEventListener('click', () => {
            this.onTiebreakerYes();
        });
        document.getElementById('tiebreakerNoBtn').addEventListener('click', () => {
            this.onTiebreakerNo();
        });
        document.getElementById('tiebreakerNoneBtn').addEventListener('click', () => {
            this.onTiebreakerNone();
        });
        document.getElementById('tiebreakerRunnerConfirmBtn').addEventListener('click', () => {
            this.onTiebreakerRunnerConfirm();
        });
        document.getElementById('tiebreakerMaxInningsConfirmBtn').addEventListener('click', () => {
            this.onTiebreakerMaxInningsConfirm();
        });
        document.querySelectorAll('.runner-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.onTiebreakerRunnerOptionSelect(e.currentTarget));
        });
    }

    async startNewGame() {
        const homeTeam = document.getElementById('homeTeam').value;
        const awayTeam = document.getElementById('awayTeam').value;
        const recordingLevel = document.getElementById('recordingLevel').value;
        const playerDetailLevel = document.getElementById('playerDetailLevel').value;
        const recordingMode = document.getElementById('recordingMode').value;
        const youtubeEnabled = document.getElementById('youtubeSimulationEnabled')?.checked || false;
        const youtubeUrl = document.getElementById('youtubeVideoUrl')?.value.trim() || '';

        if (!homeTeam || !awayTeam) {
            this.showError(i18n.t('teamNameRequired'));
            return;
        }

        try {
            await gameManager.createNewGame(homeTeam, awayTeam, recordingLevel, playerDetailLevel, recordingMode);

            // コールドゲームルールを適用
            const mercyRule = this.getMercyRuleFromSetup();
            if (mercyRule !== undefined) {
                gameManager.currentGame.gameRules.mercyRule = mercyRule;
            }

            if (youtubeEnabled || youtubeUrl) {
                const videoId = this.extractYouTubeVideoId(youtubeUrl);
                if (!videoId) {
                    this.showError(i18n.t('youtubeVideoUrlInvalid') || 'YouTube URLを確認してください');
                    return;
                }
                gameManager.currentGame.youtubeSimulation = {
                    enabled: true,
                    url: youtubeUrl,
                    videoId,
                    lastTimestamp: 0,
                    notes: [],
                    operationLogs: [],
                    unsupportedPlays: []
                };
                await gameManager.saveGame();
            }

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
        if (game.youtubeSimulation?.enabled) {
            gameScreen.classList.add('youtube-simulation-active');
        }

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
        this.setupYouTubeSimulationPanel();

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

    extractYouTubeVideoId(url) {
        if (!url) return '';
        try {
            const parsed = new URL(url);
            const host = parsed.hostname.replace(/^www\./, '');
            if (host === 'youtu.be') {
                return parsed.pathname.split('/').filter(Boolean)[0] || '';
            }
            if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
                if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || '';
                const parts = parsed.pathname.split('/').filter(Boolean);
                if (['embed', 'shorts', 'live'].includes(parts[0])) return parts[1] || '';
            }
        } catch (error) {
            return '';
        }
        return '';
    }

    setupYouTubeSimulationPanel() {
        const game = gameManager.currentGame;
        const panel = document.getElementById('youtubeSimulationPanel');
        if (!panel) return;

        if (!this.isAiYouTubeToolsEnabled() || !game?.youtubeSimulation?.enabled) {
            panel.classList.add('hidden');
            return;
        }

        const sim = game.youtubeSimulation;
        if (!Array.isArray(sim.notes)) sim.notes = [];
        const urlInput = document.getElementById('youtubeRuntimeUrl');
        const timestampInput = document.getElementById('youtubeTimestampInput');
        const openLink = document.getElementById('youtubeOpenLink');
        const body = document.getElementById('youtubePanelBody');
        const toggleBtn = document.getElementById('youtubePanelToggleBtn');

        panel.classList.remove('hidden');
        if (urlInput) urlInput.value = sim.url || '';
        if (timestampInput) timestampInput.value = this.formatYouTubeTimestamp(sim.lastTimestamp || 0);
        if (openLink && sim.url) openLink.href = sim.url;
        if (body) body.classList.toggle('hidden', this.youtubePanelCollapsed);
        if (toggleBtn) {
            toggleBtn.textContent = this.youtubePanelCollapsed
                ? (i18n.t('expand') || '展開')
                : (i18n.t('collapse') || '折りたたむ');
            toggleBtn.onclick = () => {
                this.youtubePanelCollapsed = !this.youtubePanelCollapsed;
                this.setupYouTubeSimulationPanel();
            };
        }

        document.getElementById('youtubeLoadVideoBtn').onclick = async () => this.updateYouTubeSimulationVideo();
        document.getElementById('youtubeSeekBtn').onclick = async () => this.seekYouTubeSimulation();
        document.getElementById('youtubeBack10Btn').onclick = async () => this.shiftYouTubeTimestamp(-10);
        document.getElementById('youtubeForward10Btn').onclick = async () => this.shiftYouTubeTimestamp(10);
        document.getElementById('youtubeMarkTimestampBtn').onclick = async () => this.markYouTubeTimestamp();
        document.getElementById('youtubeDensityReportBtn').onclick = () => this.renderYouTubeDensityReport();
        this.setupYouTubeApiKeyControls();
        this.updateYouTubeApiKeyControls();

        this.renderYouTubeFrame();
        this.renderYouTubeTimestampList();
        this.renderYouTubeDensityReport();
        this.startYouTubeTimeSync();
    }

    isAiYouTubeToolsEnabled() {
        return localStorage.getItem('baseballScoreAiYouTubeTools') === 'true' ||
            new URLSearchParams(window.location.search).get('aiYoutube') === '1';
    }

    setupYouTubeApiKeyControls() {
        const pairs = [
            {
                input: document.getElementById('youtubeApiKeyInput'),
                save: document.getElementById('youtubeApiKeySaveBtn'),
                clear: document.getElementById('youtubeApiKeyClearBtn')
            },
            {
                input: document.getElementById('youtubeRuntimeApiKeyInput'),
                save: document.getElementById('youtubeRuntimeApiKeySaveBtn'),
                clear: document.getElementById('youtubeRuntimeApiKeyClearBtn')
            },
            {
                input: document.getElementById('settingsYoutubeApiKeyInput'),
                save: document.getElementById('settingsYoutubeApiKeySaveBtn'),
                clear: document.getElementById('settingsYoutubeApiKeyClearBtn')
            }
        ];

        pairs.forEach(({ input, save, clear }) => {
            if (input && !input.dataset.youtubeApiKeyBound) {
                input.dataset.youtubeApiKeyBound = 'true';
                input.addEventListener('input', () => {
                    input.classList.toggle('has-unsaved-value', Boolean(input.value.trim()));
                });
            }
            if (save && !save.dataset.youtubeApiKeyBound) {
                save.dataset.youtubeApiKeyBound = 'true';
                save.addEventListener('click', () => this.saveYouTubeDataApiKey(input?.value || ''));
            }
            if (clear && !clear.dataset.youtubeApiKeyBound) {
                clear.dataset.youtubeApiKeyBound = 'true';
                clear.addEventListener('click', () => this.clearYouTubeDataApiKey());
            }
        });
    }

    getYouTubeDataApiKey() {
        return localStorage.getItem(this.youtubeDataApiKeyStorageKey) || '';
    }

    getMaskedYouTubeDataApiKey() {
        const key = this.getYouTubeDataApiKey();
        if (!key) return '';
        const visible = key.slice(-4);
        return `${'*'.repeat(Math.max(8, Math.min(16, key.length - 4)))}${visible}`;
    }

    updateYouTubeApiKeyControls(messageKey = '') {
        const masked = this.getMaskedYouTubeDataApiKey();
        const statusText = messageKey
            ? i18n.t(messageKey)
            : masked
                ? `${i18n.t('apiKeySaved')}: ${masked}`
                : i18n.t('apiKeyNotSaved');

        [
            ['youtubeApiKeyInput', 'youtubeApiKeyStatus'],
            ['youtubeRuntimeApiKeyInput', 'youtubeRuntimeApiKeyStatus'],
            ['settingsYoutubeApiKeyInput', 'settingsYoutubeApiKeyStatus']
        ].forEach(([inputId, statusId]) => {
            const input = document.getElementById(inputId);
            const status = document.getElementById(statusId);
            if (input) {
                input.value = '';
                input.classList.remove('has-unsaved-value');
            }
            if (status) {
                status.textContent = statusText;
                status.classList.toggle('saved', Boolean(masked));
            }
        });
    }

    saveYouTubeDataApiKey(rawKey) {
        const key = String(rawKey || '').trim();
        if (!key) {
            this.showError(i18n.t('apiKeyEmpty') || 'APIキーを入力してください');
            return;
        }
        localStorage.setItem(this.youtubeDataApiKeyStorageKey, key);
        this.updateYouTubeApiKeyControls('apiKeySavedMessage');
        this.showSuccess(i18n.t('apiKeySavedMessage') || 'YouTube Data APIキーを保存しました');
    }

    clearYouTubeDataApiKey() {
        localStorage.removeItem(this.youtubeDataApiKeyStorageKey);
        this.updateYouTubeApiKeyControls('apiKeyClearedMessage');
        this.showSuccess(i18n.t('apiKeyClearedMessage') || 'YouTube Data APIキーを削除しました');
    }

    async testYouTubeDataApiKey() {
        const status = document.getElementById('youtubeApiTestStatus');
        const key = this.getYouTubeDataApiKey();
        if (!key) {
            if (status) status.textContent = i18n.t('apiKeyNotSaved') || '未保存';
            this.showError(i18n.t('apiKeyEmpty') || 'APIキーを入力してください');
            return;
        }

        if (status) status.textContent = i18n.t('youtubeApiTesting') || '接続確認中...';
        try {
            const params = new URLSearchParams({
                part: 'snippet',
                id: 'SVR83qQ9Xwk',
                key
            });
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error?.message || response.statusText);
            }
            const ok = Array.isArray(data.items) && data.items.length > 0;
            if (!ok) throw new Error(i18n.t('youtubeApiNoVideo') || '動画情報を取得できませんでした');
            if (status) {
                status.textContent = i18n.t('youtubeApiTestSuccess') || '接続確認OK';
                status.classList.add('saved');
            }
            this.showSuccess(i18n.t('youtubeApiTestSuccess') || '接続確認OK');
        } catch (error) {
            if (status) {
                status.textContent = `${i18n.t('youtubeApiTestFailed') || '接続確認失敗'}: ${error.message}`;
                status.classList.remove('saved');
            }
            this.showError(`${i18n.t('youtubeApiTestFailed') || '接続確認失敗'}: ${error.message}`);
        }
    }

    async searchYouTubeFullGameVideos() {
        const resultsEl = document.getElementById('youtubeSearchResults');
        const queryInput = document.getElementById('youtubeSearchQuery');
        const key = this.getYouTubeDataApiKey();
        const query = queryInput?.value.trim() || 'baseball full game';
        if (!key) {
            this.showError(i18n.t('apiKeyEmpty') || 'APIキーを入力してください');
            return;
        }
        if (resultsEl) {
            resultsEl.innerHTML = `<div class="youtube-search-message">${i18n.t('youtubeSearchRunning') || '検索中...'}</div>`;
        }

        try {
            const searchParams = new URLSearchParams({
                part: 'snippet',
                q: query,
                type: 'video',
                videoDuration: 'long',
                maxResults: '12',
                relevanceLanguage: 'ja',
                key
            });
            const searchResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`);
            const searchData = await searchResponse.json();
            if (!searchResponse.ok) {
                throw new Error(searchData?.error?.message || searchResponse.statusText);
            }
            const ids = (searchData.items || [])
                .map(item => item.id?.videoId)
                .filter(Boolean);
            if (ids.length === 0) {
                this.renderYouTubeSearchResults([]);
                return;
            }

            const videoParams = new URLSearchParams({
                part: 'snippet,contentDetails,statistics',
                id: ids.join(','),
                key
            });
            const videoResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${videoParams.toString()}`);
            const videoData = await videoResponse.json();
            if (!videoResponse.ok) {
                throw new Error(videoData?.error?.message || videoResponse.statusText);
            }
            const candidates = (videoData.items || [])
                .map(video => this.normalizeYouTubeCandidate(video))
                .filter(video => video.durationSeconds >= 7200 && video.durationSeconds <= 27000)
                .sort((a, b) => Math.abs(a.durationSeconds - 10800) - Math.abs(b.durationSeconds - 10800));

            this.renderYouTubeSearchResults(candidates);
        } catch (error) {
            if (resultsEl) {
                resultsEl.innerHTML = `<div class="youtube-search-message error">${this.escapeHtml(error.message)}</div>`;
            }
            this.showError(`${i18n.t('youtubeSearchFailed') || '検索に失敗しました'}: ${error.message}`);
        }
    }

    normalizeYouTubeCandidate(video) {
        const durationSeconds = this.parseYouTubeIsoDuration(video.contentDetails?.duration || 'PT0S');
        const videoId = video.id;
        return {
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            title: video.snippet?.title || '',
            channelTitle: video.snippet?.channelTitle || '',
            publishedAt: video.snippet?.publishedAt || '',
            thumbnail: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || '',
            durationSeconds,
            viewCount: Number(video.statistics?.viewCount || 0)
        };
    }

    parseYouTubeIsoDuration(duration) {
        const match = String(duration || '').match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
        if (!match) return 0;
        const [, days, hours, minutes, seconds] = match.map(value => parseInt(value || '0', 10));
        return (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
    }

    renderYouTubeSearchResults(candidates) {
        const resultsEl = document.getElementById('youtubeSearchResults');
        if (!resultsEl) return;
        if (candidates.length === 0) {
            resultsEl.innerHTML = `<div class="youtube-search-message">${i18n.t('youtubeSearchNoResults') || '条件に合う長尺動画が見つかりませんでした'}</div>`;
            return;
        }
        resultsEl.innerHTML = candidates.map(video => `
            <div class="youtube-search-result">
                ${video.thumbnail ? `<img src="${this.escapeHtml(video.thumbnail)}" alt="">` : ''}
                <div class="youtube-search-result-body">
                    <strong>${this.escapeHtml(video.title)}</strong>
                    <span>${this.escapeHtml(video.channelTitle)} · ${this.formatYouTubeTimestamp(video.durationSeconds)}</span>
                    <button type="button" class="secondary-btn use-youtube-result" data-url="${this.escapeHtml(video.url)}">${i18n.t('useThisVideo') || 'この動画を使う'}</button>
                </div>
            </div>
        `).join('');
        resultsEl.querySelectorAll('.use-youtube-result').forEach(button => {
            button.addEventListener('click', () => this.useYouTubeSearchResult(button.dataset.url));
        });
    }

    useYouTubeSearchResult(url) {
        const enabled = document.getElementById('youtubeSimulationEnabled');
        const urlInput = document.getElementById('youtubeVideoUrl');
        if (enabled) enabled.checked = true;
        if (urlInput) urlInput.value = url;
        this.hideAppSettingsModal();
        this.showScreen('gameSetupScreen');
        this.showSuccess(i18n.t('youtubeVideoSelected') || 'YouTube動画URLを試合設定に入力しました');
    }

    showAppSettingsModal() {
        const modal = document.getElementById('appSettingsModal');
        if (!modal) return;
        this.setupYouTubeApiKeyControls();
        this.updateYouTubeApiKeyControls();
        modal.classList.remove('modal--hidden');
        modal.style.display = 'flex';
        if (window.location.hash !== '#appSettingsModal') {
            history.replaceState(null, '', '#appSettingsModal');
        }
    }

    hideAppSettingsModal() {
        const modal = document.getElementById('appSettingsModal');
        if (!modal) return;
        modal.classList.add('modal--hidden');
        modal.style.removeProperty('display');
        if (window.location.hash === '#appSettingsModal') {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }

    loadYouTubeIframeApi() {
        if (window.YT?.Player) return Promise.resolve(window.YT);
        if (this.youtubeApiReadyPromise) return this.youtubeApiReadyPromise;

        this.youtubeApiReadyPromise = new Promise((resolve, reject) => {
            const previousReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (typeof previousReady === 'function') previousReady();
                resolve(window.YT);
            };

            if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
                const script = document.createElement('script');
                script.src = 'https://www.youtube.com/iframe_api';
                script.async = true;
                script.onerror = () => reject(new Error('YouTube IFrame API failed to load'));
                document.head.appendChild(script);
            }
        });

        return this.youtubeApiReadyPromise;
    }

    async renderYouTubeFrame() {
        const sim = gameManager.currentGame?.youtubeSimulation;
        const playerTarget = document.getElementById('youtubeSimulationPlayer');
        if (!playerTarget || !sim?.videoId) return;
        const start = Math.max(0, parseInt(sim.lastTimestamp || 0));
        const playerVars = {
            start,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1
        };
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            playerVars.origin = window.location.origin;
        }

        try {
            const YTApi = await this.loadYouTubeIframeApi();
            if (this.youtubePlayer && typeof this.youtubePlayer.cueVideoById === 'function') {
                if (this.youtubeCurrentVideoId !== sim.videoId) {
                    this.youtubePlayer.cueVideoById({ videoId: sim.videoId, startSeconds: start });
                    this.youtubeCurrentVideoId = sim.videoId;
                } else {
                    this.youtubePlayer.seekTo(start, true);
                }
                return;
            }

            this.youtubePlayer = new YTApi.Player('youtubeSimulationPlayer', {
                width: '100%',
                height: '100%',
                videoId: sim.videoId,
                host: 'https://www.youtube-nocookie.com',
                playerVars,
                events: {
                    onReady: () => {
                        this.youtubeCurrentVideoId = sim.videoId;
                        this.updateYouTubeTimestampFromPlayer();
                    }
                }
            });
        } catch (error) {
            console.warn('YouTube IFrame API unavailable; falling back to iframe embed.', error);
            playerTarget.innerHTML = `<iframe title="YouTube simulation video" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(sim.videoId)}?start=${start}&rel=0&modestbranding=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
        }
    }

    parseYouTubeTimestamp(value) {
        const text = String(value || '').trim();
        if (!text) return 0;
        if (/^\d+$/.test(text)) return parseInt(text, 10);
        const parts = text.split(':').map(part => parseInt(part, 10));
        if (parts.some(Number.isNaN)) return 0;
        return parts.reduce((total, part) => total * 60 + part, 0);
    }

    formatYouTubeTimestamp(seconds) {
        const total = Math.max(0, parseInt(seconds || 0));
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = total % 60;
        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }

    async updateYouTubeSimulationVideo() {
        const game = gameManager.currentGame;
        const url = document.getElementById('youtubeRuntimeUrl')?.value.trim() || '';
        const videoId = this.extractYouTubeVideoId(url);
        if (!game || !videoId) {
            this.showError(i18n.t('youtubeVideoUrlInvalid') || 'YouTube URLを確認してください');
            return;
        }
        game.youtubeSimulation = {
            ...(game.youtubeSimulation || {}),
            enabled: true,
            url,
            videoId,
            lastTimestamp: 0,
            notes: game.youtubeSimulation?.notes || [],
            operationLogs: game.youtubeSimulation?.operationLogs || [],
            unsupportedPlays: game.youtubeSimulation?.unsupportedPlays || []
        };
        await gameManager.saveGame();
        this.setupYouTubeSimulationPanel();
    }

    async seekYouTubeSimulation() {
        const game = gameManager.currentGame;
        if (!game?.youtubeSimulation) return;
        const input = document.getElementById('youtubeTimestampInput');
        game.youtubeSimulation.lastTimestamp = this.parseYouTubeTimestamp(input?.value);
        if (input) input.value = this.formatYouTubeTimestamp(game.youtubeSimulation.lastTimestamp);
        await gameManager.saveGame();
        if (this.youtubePlayer && typeof this.youtubePlayer.seekTo === 'function') {
            this.youtubePlayer.seekTo(game.youtubeSimulation.lastTimestamp, true);
            return;
        }
        await this.renderYouTubeFrame();
    }

    async shiftYouTubeTimestamp(delta) {
        const input = document.getElementById('youtubeTimestampInput');
        const next = Math.max(0, this.getYouTubeCurrentTime() + delta);
        if (input) input.value = this.formatYouTubeTimestamp(next);
        await this.seekYouTubeSimulation();
    }

    async markYouTubeTimestamp() {
        const game = gameManager.currentGame;
        if (!game?.youtubeSimulation) return;
        const timeSeconds = this.getYouTubeCurrentTime();
        const noteInput = document.getElementById('youtubeTimestampNote');
        const half = game.isTopHalf ? (i18n.t('top') || '表') : (i18n.t('bottom') || '裏');
        const note = {
            id: Date.now(),
            timeSeconds,
            label: noteInput?.value.trim() || `${game.currentInning}${i18n.t('inningSuffix') || '回'}${half}`,
            inning: game.currentInning,
            isTopHalf: game.isTopHalf,
            score: { home: game.homeScore, away: game.awayScore },
            createdAt: new Date().toISOString()
        };
        game.youtubeSimulation.lastTimestamp = timeSeconds;
        game.youtubeSimulation.notes = [note, ...(game.youtubeSimulation.notes || [])].slice(0, 50);
        this.recordYouTubeOperation('timestamp_note', i18n.t('markTimestamp') || '時刻メモ', { saveImmediately: false });
        if (noteInput) noteInput.value = '';
        await gameManager.saveGame();
        this.renderYouTubeTimestampList();
        this.renderYouTubeDensityReport();
    }

    renderYouTubeTimestampList() {
        const list = document.getElementById('youtubeTimestampList');
        const notes = gameManager.currentGame?.youtubeSimulation?.notes || [];
        if (!list) return;
        if (notes.length === 0) {
            list.innerHTML = `<div class="youtube-timestamp-empty">${i18n.t('youtubeNoTimestampNotes') || '時刻メモはまだありません'}</div>`;
            return;
        }
        list.innerHTML = notes.map(note => `
            <button type="button" class="youtube-timestamp-item" data-seconds="${note.timeSeconds}">
                <span class="youtube-timestamp-time">${this.formatYouTubeTimestamp(note.timeSeconds)}</span>
                <span class="youtube-timestamp-label">${this.escapeHtml(note.label)}</span>
                <span class="youtube-timestamp-score">${gameManager.currentGame.awayTeam} ${note.score?.away ?? 0} - ${note.score?.home ?? 0} ${gameManager.currentGame.homeTeam}</span>
            </button>
        `).join('');
        list.querySelectorAll('.youtube-timestamp-item').forEach(item => {
            item.addEventListener('click', async () => {
                document.getElementById('youtubeTimestampInput').value = this.formatYouTubeTimestamp(parseInt(item.dataset.seconds, 10));
                await this.seekYouTubeSimulation();
            });
        });
    }

    getYouTubeCurrentTime() {
        try {
            if (this.youtubePlayer && typeof this.youtubePlayer.getCurrentTime === 'function') {
                const current = Math.floor(this.youtubePlayer.getCurrentTime());
                if (!Number.isNaN(current)) {
                    const input = document.getElementById('youtubeTimestampInput');
                    if (input) input.value = this.formatYouTubeTimestamp(current);
                    return current;
                }
            }
        } catch (error) {
            // Fall back to the visible timestamp input.
        }

        const sim = gameManager.currentGame?.youtubeSimulation;
        return this.parseYouTubeTimestamp(document.getElementById('youtubeTimestampInput')?.value || sim?.lastTimestamp || 0);
    }

    updateYouTubeTimestampFromPlayer() {
        const game = gameManager.currentGame;
        if (!game?.youtubeSimulation?.enabled) return;
        const current = this.getYouTubeCurrentTime();
        game.youtubeSimulation.lastTimestamp = current;
    }

    startYouTubeTimeSync() {
        clearInterval(this.youtubeTimeSyncTimer);
        this.youtubeTimeSyncTimer = setInterval(() => {
            if (this.currentScreen !== 'gameScreen' || !gameManager.currentGame?.youtubeSimulation?.enabled) {
                clearInterval(this.youtubeTimeSyncTimer);
                this.youtubeTimeSyncTimer = null;
                return;
            }
            this.updateYouTubeTimestampFromPlayer();
        }, 1000);
    }

    captureYouTubeOperationClick(event) {
        const game = gameManager.currentGame;
        if (!game?.youtubeSimulation?.enabled || this.currentScreen !== 'gameScreen') return;

        const target = event.target.closest('button, select, input[type="checkbox"], input[type="radio"]');
        if (!target) return;
        if (target.closest('#youtubeSimulationPanel')) return;
        if (target.closest('#gameSetupForm')) return;

        const label = target.textContent?.trim() ||
            target.getAttribute('data-i18n') ||
            target.getAttribute('aria-label') ||
            target.id ||
            target.className ||
            'operation';
        this.recordYouTubeOperation('ui_click', label);
    }

    recordYouTubeOperation(operationType, operationLabel, options = {}) {
        const game = gameManager.currentGame;
        if (!game?.youtubeSimulation?.enabled) return;

        const sim = game.youtubeSimulation;
        if (!Array.isArray(sim.operationLogs)) sim.operationLogs = [];
        const videoTimestamp = this.getYouTubeCurrentTime();
        sim.lastTimestamp = videoTimestamp;
        sim.operationLogs.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            videoTimestamp,
            operationType,
            operationLabel: String(operationLabel || '').slice(0, 80),
            recordingLevel: game.recordingLevel,
            detailLevel: game.playerDetailLevel,
            recordingMode: game.recordingMode,
            inning: game.currentInning,
            isTopHalf: game.isTopHalf,
            createdAt: new Date().toISOString()
        });
        sim.operationLogs = sim.operationLogs.slice(-500);

        if (options.saveImmediately === false) return;
        clearTimeout(this.youtubeOperationSaveTimer);
        this.youtubeOperationSaveTimer = setTimeout(async () => {
            try {
                await gameManager.saveGame();
                this.renderYouTubeDensityReport();
            } catch (error) {
                console.error('YouTube操作ログ保存エラー:', error);
            }
        }, 300);
    }

    recordUnsupportedPlay(playType, playLabel, details = {}) {
        const game = gameManager.currentGame;
        const label = playLabel || playType || 'unsupported play';

        this.recordYouTubeOperation('unsupported_play', label, { saveImmediately: false });

        if (!game?.youtubeSimulation?.enabled) return;

        const sim = game.youtubeSimulation;
        if (!Array.isArray(sim.unsupportedPlays)) sim.unsupportedPlays = [];
        const videoTimestamp = this.getYouTubeCurrentTime();
        sim.lastTimestamp = videoTimestamp;
        sim.unsupportedPlays.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            videoTimestamp,
            playType,
            playLabel: String(label).slice(0, 80),
            details,
            recordingLevel: game.recordingLevel,
            detailLevel: game.playerDetailLevel,
            recordingMode: game.recordingMode,
            inning: game.currentInning,
            isTopHalf: game.isTopHalf,
            createdAt: new Date().toISOString()
        });
        sim.unsupportedPlays = sim.unsupportedPlays.slice(-100);

        gameManager.saveGame()
            .then(() => this.renderYouTubeDensityReport())
            .catch(error => console.error('未対応プレーログ保存エラー:', error));
    }

    getYouTubeOperationDensityReport() {
        const logs = gameManager.currentGame?.youtubeSimulation?.operationLogs || [];
        const buckets = new Map();
        for (const log of logs) {
            const start = Math.floor((log.videoTimestamp || 0) / 10) * 10;
            if (!buckets.has(start)) buckets.set(start, []);
            buckets.get(start).push(log);
        }

        const rows = Array.from(buckets.entries())
            .map(([start, items]) => ({
                start,
                end: start + 10,
                count: items.length,
                items,
                verdict: this.getYouTubeDensityVerdict(items.length)
            }))
            .sort((a, b) => b.count - a.count || a.start - b.start);

        return {
            totalOperations: logs.length,
            maxBucket: rows[0] || null,
            rows
        };
    }

    getYouTubeDensityVerdict(count) {
        if (count >= 11) return { level: 'critical', label: i18n.t('densityCritical') || '非現実的' };
        if (count >= 7) return { level: 'hard', label: i18n.t('densityHard') || 'リアルタイム記録は厳しい' };
        if (count >= 4) return { level: 'caution', label: i18n.t('densityCaution') || '慣れれば可能' };
        return { level: 'ok', label: i18n.t('densityOk') || 'リアルタイム記録可能' };
    }

    renderYouTubeDensityReport() {
        const reportEl = document.getElementById('youtubeDensityReport');
        if (!reportEl) return;
        const report = this.getYouTubeOperationDensityReport();
        const unsupportedPlays = gameManager.currentGame?.youtubeSimulation?.unsupportedPlays || [];
        if (!report.maxBucket && unsupportedPlays.length === 0) {
            reportEl.innerHTML = `<div class="youtube-density-empty">${i18n.t('densityNoOperations') || '操作ログはまだありません'}</div>`;
            return;
        }

        const unsupportedHtml = unsupportedPlays.length > 0 ? `
            <div class="density-summary density-critical unsupported-play-summary">
                <div class="density-main">
                    <strong>${i18n.t('unsupportedPlayDetected') || '未対応プレー検出'}</strong>
                    <span>${unsupportedPlays.length}${i18n.t('unsupportedPlayCountUnit') || '件'}</span>
                </div>
                <div class="density-verdict">${i18n.t('unsupportedPlayP1') || 'P1: 対応する操作を実装するまで実用不可'}</div>
                <ul>
                    ${unsupportedPlays.slice(-5).reverse().map(item => {
                        const half = item.isTopHalf ? (i18n.t('top') || '表') : (i18n.t('bottom') || '裏');
                        return `<li>${this.formatYouTubeTimestamp(item.videoTimestamp || 0)} ${item.inning || '-'}${half}: ${this.escapeHtml(item.playLabel || item.playType || '')}</li>`;
                    }).join('')}
                </ul>
            </div>
        ` : '';

        const densityHtml = report.maxBucket ? (() => {
            const max = report.maxBucket;
            const operations = max.items.slice(0, 6)
                .map(item => `<li>${this.escapeHtml(item.operationLabel)}</li>`)
                .join('');
            return `
                <div class="density-summary density-${max.verdict.level}">
                    <div class="density-main">
                        <strong>${this.formatYouTubeTimestamp(max.start)}-${this.formatYouTubeTimestamp(max.end)}</strong>
                        <span>${max.count}${i18n.t('operationsPer10s') || '操作/10秒'}</span>
                    </div>
                    <div class="density-verdict">${this.escapeHtml(max.verdict.label)}</div>
                    <div class="density-total">${i18n.t('densityTotalOperations') || '総操作数'}: ${report.totalOperations}</div>
                    <ul>${operations}</ul>
                </div>
            `;
        })() : `<div class="youtube-density-empty">${i18n.t('densityNoOperations') || '操作ログはまだありません'}</div>`;

        reportEl.innerHTML = `${unsupportedHtml}${densityHtml}`;
    }

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    normalizeGameClassification(classification) {
        if (typeof Game !== 'undefined' && Game.normalizeClassification) {
            return Game.normalizeClassification(classification);
        }
        const source = classification && typeof classification === 'object' ? classification : {};
        const tags = Array.isArray(source.tags)
            ? source.tags
            : String(source.tags || '').split(',').map(tag => tag.trim()).filter(Boolean);
        return {
            category: source.category || 'uncategorized',
            folderName: source.folderName || '',
            tags,
            memo: source.memo || ''
        };
    }

    getGameCategoryOptions() {
        return [
            { value: 'uncategorized', labelKey: 'gameCategoryUncategorized' },
            { value: 'youth', labelKey: 'gameCategoryYouth' },
            { value: 'senior', labelKey: 'gameCategorySenior' },
            { value: 'juniorHigh', labelKey: 'gameCategoryJuniorHigh' },
            { value: 'highSchool', labelKey: 'gameCategoryHighSchool' },
            { value: 'university', labelKey: 'gameCategoryUniversity' },
            { value: 'adult', labelKey: 'gameCategoryAdult' },
            { value: 'pro', labelKey: 'gameCategoryPro' },
            { value: 'other', labelKey: 'gameCategoryOther' }
        ];
    }

    getGameCategoryLabel(category) {
        const option = this.getGameCategoryOptions().find(item => item.value === category);
        return i18n.t(option?.labelKey || 'gameCategoryUncategorized');
    }

    slugifyFileName(value) {
        return String(value || 'game')
            .trim()
            .replace(/[\\/:*?"<>|]+/g, '-')
            .replace(/\s+/g, '_')
            .slice(0, 80) || 'game';
    }

    async buildSavedGameExportBundle(gameId) {
        const game = await storage.loadGame(gameId);
        if (!game) throw new Error('Game not found');

        const innings = await storage.getInningsByGame(gameId);
        innings.sort((a, b) => a.inning - b.inning || (a.isTopHalf ? -1 : 1));

        const atBats = [];
        const pitches = [];
        for (const inning of innings) {
            const inningAtBats = await storage.getAtBatsByInning(inning.id);
            inningAtBats.sort((a, b) => (a.createdAt || a.id || 0) - (b.createdAt || b.id || 0));
            atBats.push(...inningAtBats);
            for (const atBat of inningAtBats) {
                const atBatPitches = await storage.getPitchesByAtBat(atBat.id);
                atBatPitches.sort((a, b) => (a.pitchNumber || a.id || 0) - (b.pitchNumber || b.id || 0));
                pitches.push(...atBatPitches);
            }
        }

        return {
            format: 'baseball-score-game-export',
            formatVersion: 1,
            exportedAt: new Date().toISOString(),
            app: {
                name: 'Baseball Score Recorder',
                cacheVersion: typeof CACHE_NAME !== 'undefined' ? CACHE_NAME : null
            },
            game,
            innings,
            atBats,
            pitches
        };
    }

    getSavedGameExportFileName(game) {
        const date = game?.date ? new Date(game.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const teams = this.slugifyFileName(`${game?.awayTeam || 'away'}-vs-${game?.homeTeam || 'home'}`);
        return `${date}_${teams}.baseball-game.json`;
    }

    getSavedGameShareTextFileName(game) {
        const date = game?.date ? new Date(game.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const teams = this.slugifyFileName(`${game?.awayTeam || 'away'}-vs-${game?.homeTeam || 'home'}`);
        return `${date}_${teams}.txt`;
    }

    getSavedGameCsvFileName(game) {
        const date = game?.date ? new Date(game.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const teams = this.slugifyFileName(`${game?.awayTeam || 'away'}-vs-${game?.homeTeam || 'home'}`);
        return `${date}_${teams}.csv`;
    }

    getSavedGameImageFileName(game) {
        const date = game?.date ? new Date(game.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const teams = this.slugifyFileName(`${game?.awayTeam || 'away'}-vs-${game?.homeTeam || 'home'}`);
        return `${date}_${teams}.png`;
    }

    downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    buildLineScoreShareText(game, innings) {
        const sortedInnings = [...(innings || [])].sort((a, b) =>
            a.inning !== b.inning ? a.inning - b.inning : (a.isTopHalf ? -1 : 1)
        );
        const reg = game?.gameRules?.regulationInnings || 9;
        const maxInning = Math.max(reg, ...sortedInnings.map(i => i.inning || 0), 1);
        const inningMap = {};
        sortedInnings.forEach(inning => {
            inningMap[`${inning.inning}-${inning.isTopHalf ? 'top' : 'bottom'}`] = inning;
        });

        const inningRuns = (isTop) => Array.from({ length: maxInning }, (_, index) => {
            const inning = inningMap[`${index + 1}-${isTop ? 'top' : 'bottom'}`];
            if (!inning) return '-';
            const runs = Number.isFinite(Number(inning.runs)) ? Number(inning.runs) : 0;
            return inning.incomplete ? `${runs}x` : String(runs);
        });
        const statSum = (isTop, key) => sortedInnings
            .filter(inning => inning.isTopHalf === isTop)
            .reduce((sum, inning) => sum + (Number(inning[key]) || 0), 0);
        const teamLabel = (name) => String(name || '?').slice(0, 12);
        const pad = (value, width) => String(value).padEnd(width, ' ');
        const headers = Array.from({ length: maxInning }, (_, index) => String(index + 1));
        const awayRuns = inningRuns(true);
        const homeRuns = inningRuns(false);
        const score = {
            away: Number.isFinite(Number(game?.awayScore)) ? Number(game.awayScore) : statSum(true, 'runs'),
            home: Number.isFinite(Number(game?.homeScore)) ? Number(game.homeScore) : statSum(false, 'runs')
        };
        const appUrl = window.location ? window.location.href.split('#')[0] : '';
        const lines = [
            i18n.t('shareGameResultTitle'),
            '',
            `${game?.awayTeam || '?'} ${score.away} - ${score.home} ${game?.homeTeam || '?'}`,
            '',
            `${pad('', 13)}${headers.join(' ')} | R H E`,
            `${pad(teamLabel(game?.awayTeam), 13)}${awayRuns.join(' ')} | ${score.away} ${statSum(true, 'hits')} ${statSum(true, 'errors')}`,
            `${pad(teamLabel(game?.homeTeam), 13)}${homeRuns.join(' ')} | ${score.home} ${statSum(false, 'hits')} ${statSum(false, 'errors')}`,
            '',
            `${i18n.t('shareGameRecordedWith')}: Baseball Score Recorder`
        ];
        if (appUrl) lines.push(appUrl);
        return lines.join('\n');
    }

    getLineScoreData(game, innings) {
        const sortedInnings = [...(innings || [])].sort((a, b) =>
            a.inning !== b.inning ? a.inning - b.inning : (a.isTopHalf ? -1 : 1)
        );
        const reg = game?.gameRules?.regulationInnings || 9;
        const maxInning = Math.max(reg, ...sortedInnings.map(i => i.inning || 0), 1);
        const inningMap = {};
        sortedInnings.forEach(inning => {
            inningMap[`${inning.inning}-${inning.isTopHalf ? 'top' : 'bottom'}`] = inning;
        });
        const inningRuns = (isTop) => Array.from({ length: maxInning }, (_, index) => {
            const inning = inningMap[`${index + 1}-${isTop ? 'top' : 'bottom'}`];
            if (!inning) return '-';
            const runs = Number.isFinite(Number(inning.runs)) ? Number(inning.runs) : 0;
            return inning.incomplete ? `${runs}x` : String(runs);
        });
        const statSum = (isTop, key) => sortedInnings
            .filter(inning => inning.isTopHalf === isTop)
            .reduce((sum, inning) => sum + (Number(inning[key]) || 0), 0);
        return {
            maxInning,
            headers: Array.from({ length: maxInning }, (_, index) => String(index + 1)),
            awayRuns: inningRuns(true),
            homeRuns: inningRuns(false),
            awayScore: Number.isFinite(Number(game?.awayScore)) ? Number(game.awayScore) : statSum(true, 'runs'),
            homeScore: Number.isFinite(Number(game?.homeScore)) ? Number(game.homeScore) : statSum(false, 'runs'),
            awayHits: statSum(true, 'hits'),
            homeHits: statSum(false, 'hits'),
            awayErrors: statSum(true, 'errors'),
            homeErrors: statSum(false, 'errors')
        };
    }

    canvasToBlob(canvas, type = 'image/png') {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas export failed')), type);
        });
    }

    drawFittedText(ctx, text, x, y, maxWidth, fontSize, weight = '400', color = '#0f172a', align = 'left') {
        let size = fontSize;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        do {
            ctx.font = `${weight} ${size}px Arial, sans-serif`;
            if (ctx.measureText(String(text)).width <= maxWidth || size <= 14) break;
            size -= 1;
        } while (size > 14);
        ctx.fillText(String(text), x, y);
    }

    async buildSavedGameImageBlob(game, innings) {
        const score = this.getLineScoreData(game, innings);
        const width = 1200;
        const height = 675;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, 120);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(0, 120, width, 8);

        const dateText = game?.date ? new Date(game.date).toLocaleDateString() : '';
        this.drawFittedText(ctx, i18n.t('shareGameResultTitle'), 60, 48, 360, 34, '700', '#ffffff');
        this.drawFittedText(ctx, dateText, width - 60, 48, 320, 24, '400', '#cbd5e1', 'right');
        this.drawFittedText(ctx, 'Baseball Score Recorder', 60, 90, 460, 20, '400', '#cbd5e1');

        this.drawFittedText(ctx, game?.awayTeam || '?', 82, 210, 380, 42, '700');
        this.drawFittedText(ctx, String(score.awayScore), 500, 210, 110, 62, '700', '#2563eb', 'center');
        this.drawFittedText(ctx, '-', 600, 210, 60, 44, '700', '#64748b', 'center');
        this.drawFittedText(ctx, String(score.homeScore), 700, 210, 110, 62, '700', '#dc2626', 'center');
        this.drawFittedText(ctx, game?.homeTeam || '?', width - 82, 210, 380, 42, '700', '#0f172a', 'right');

        const tableX = 70;
        const tableY = 300;
        const tableW = width - 140;
        const rowH = 74;
        const teamW = 260;
        const statW = 62;
        const inningW = Math.max(28, Math.min(58, (tableW - teamW - statW * 3) / Math.max(score.headers.length, 1)));
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(tableX, tableY, tableW, 1);
        ctx.fillRect(tableX, tableY + rowH, tableW, 1);
        ctx.fillRect(tableX, tableY + rowH * 2, tableW, 1);
        ctx.fillRect(tableX, tableY + rowH * 3, tableW, 1);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(tableX, tableY, tableW, rowH);

        const drawCell = (text, colX, rowY, w, weight = '600', color = '#0f172a') => {
            this.drawFittedText(ctx, text, colX + w / 2, rowY + rowH / 2, w - 10, 25, weight, color, 'center');
        };
        this.drawFittedText(ctx, i18n.t('gameDetailScoreboard'), tableX + 18, tableY + rowH / 2, teamW - 26, 24, '700', '#075985');
        score.headers.forEach((header, index) => drawCell(header, tableX + teamW + inningW * index, tableY, inningW, '700', '#075985'));
        const statStart = tableX + teamW + inningW * score.headers.length;
        ['R', 'H', 'E'].forEach((label, index) => drawCell(label, statStart + statW * index, tableY, statW, '700', '#075985'));

        const drawTeamRow = (rowIndex, team, runs, total, hits, errors, color) => {
            const y = tableY + rowH * rowIndex;
            this.drawFittedText(ctx, team || '?', tableX + 18, y + rowH / 2, teamW - 30, 26, '700', color);
            runs.forEach((run, index) => drawCell(run, tableX + teamW + inningW * index, y, inningW));
            drawCell(total, statStart, y, statW, '800', color);
            drawCell(hits, statStart + statW, y, statW);
            drawCell(errors, statStart + statW * 2, y, statW);
        };
        drawTeamRow(1, game?.awayTeam, score.awayRuns, score.awayScore, score.awayHits, score.awayErrors, '#2563eb');
        drawTeamRow(2, game?.homeTeam, score.homeRuns, score.homeScore, score.homeHits, score.homeErrors, '#dc2626');

        this.drawFittedText(ctx, i18n.t('savedGameOfflineShareHint'), 70, 595, width - 140, 22, '400', '#475569');
        return this.canvasToBlob(canvas, 'image/png');
    }

    buildSavedGamePrintHtml(bundle) {
        const game = bundle.game || {};
        const innings = [...(bundle.innings || [])].sort((a, b) =>
            a.inning !== b.inning ? a.inning - b.inning : (a.isTopHalf ? -1 : 1)
        );
        const atBats = [...(bundle.atBats || [])].sort((a, b) =>
            (a.inningId || 0) - (b.inningId || 0) || (a.createdAt || a.id || 0) - (b.createdAt || b.id || 0)
        );
        const inningById = new Map(innings.map(inning => [inning.id, inning]));
        const score = this.getLineScoreData(game, innings);
        const classification = this.normalizeGameClassification(game.classification);
        const title = `${game.awayTeam || '?'} ${score.awayScore} - ${score.homeScore} ${game.homeTeam || '?'}`;
        const dateText = game.date ? new Date(game.date).toLocaleDateString() : '';
        const escapedTitle = this.escapeHtml(title);
        const scoreHeaders = score.headers
            .map(header => `<th>${this.escapeHtml(header)}</th>`)
            .join('');
        const scoreRow = (team, runs, total, hits, errors) => `
            <tr>
                <th class="team-name">${this.escapeHtml(team || '?')}</th>
                ${runs.map(run => `<td>${this.escapeHtml(run)}</td>`).join('')}
                <td class="total">${this.escapeHtml(total)}</td>
                <td>${this.escapeHtml(hits)}</td>
                <td>${this.escapeHtml(errors)}</td>
            </tr>`;
        const atBatRows = atBats.map((atBat, index) => {
            const inning = inningById.get(atBat.inningId);
            const half = inning ? (inning.isTopHalf ? i18n.t('top') : i18n.t('bottom')) : '';
            const team = inning ? (inning.isTopHalf ? game.awayTeam : game.homeTeam) : '';
            const result = this.formatAtBatResult(atBat.result);
            const detail = atBat.resultDetail ? ` / ${atBat.resultDetail}` : '';
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${inning ? `${inning.inning} ${half}` : ''}</td>
                    <td>${this.escapeHtml(team || '')}</td>
                    <td>${this.escapeHtml(atBat.battingOrder || '')}</td>
                    <td>${this.escapeHtml(`${result}${detail}`)}</td>
                    <td>${this.escapeHtml(atBat.runsScored || 0)}</td>
                    <td>${this.escapeHtml(atBat.rbi || 0)}</td>
                    <td>${this.escapeHtml(atBat.outs || 0)}</td>
                </tr>`;
        }).join('') || `<tr><td colspan="8" class="empty">${this.escapeHtml(i18n.t('noAtBatsYet'))}</td></tr>`;
        const metaItems = [
            [i18n.t('printDate'), dateText],
            [i18n.t('gameCategoryLabel'), this.getGameCategoryLabel(classification.category)],
            [i18n.t('gameFolderLabel'), classification.folderName || '-'],
            [i18n.t('gameTagsLabel'), classification.tags.join(', ') || '-'],
            [i18n.t('recordingLevel'), game.recordingLevel || '-'],
            [i18n.t('printGeneratedAt'), new Date(bundle.exportedAt || Date.now()).toLocaleString()]
        ];
        return `<!doctype html>
<html lang="${this.escapeHtml(i18n.currentLanguage || 'ja')}">
<head>
<meta charset="utf-8">
<title>${escapedTitle}</title>
<style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; color: #111827; font-family: Arial, sans-serif; background: #ffffff; }
    .sheet { max-width: 1100px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 3px solid #16a34a; padding-bottom: 16px; margin-bottom: 18px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .brand { color: #475569; font-size: 13px; }
    .score { font-size: 34px; font-weight: 800; white-space: nowrap; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px; margin: 16px 0 22px; font-size: 12px; }
    .meta div { border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    .meta span { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; }
    h2 { font-size: 16px; margin: 22px 0 8px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: auto; }
    th, td { border: 1px solid #d1d5db; padding: 7px 6px; text-align: center; font-size: 12px; overflow-wrap: anywhere; }
    thead th { background: #e0f2fe; color: #075985; font-weight: 700; }
    .scoreboard .team-name { text-align: left; width: 180px; }
    .scoreboard .total { font-weight: 800; background: #f8fafc; }
    .at-bats th:nth-child(1), .at-bats td:nth-child(1) { width: 44px; }
    .at-bats th:nth-child(2), .at-bats td:nth-child(2) { width: 76px; }
    .at-bats th:nth-child(4), .at-bats td:nth-child(4),
    .at-bats th:nth-child(6), .at-bats td:nth-child(6),
    .at-bats th:nth-child(7), .at-bats td:nth-child(7),
    .at-bats th:nth-child(8), .at-bats td:nth-child(8) { width: 56px; }
    .at-bats td:nth-child(5) { text-align: left; }
    .empty { color: #64748b; padding: 20px; }
    .memo { margin-top: 16px; min-height: 56px; border: 1px solid #d1d5db; padding: 10px; font-size: 12px; white-space: pre-wrap; }
    .hint { margin-top: 18px; color: #64748b; font-size: 11px; }
    @media print {
        body { padding: 0; }
        .sheet { max-width: none; }
        .no-print { display: none; }
        h2 { page-break-after: avoid; }
        tr { page-break-inside: avoid; }
    }
</style>
</head>
<body>
<main class="sheet">
    <section class="header">
        <div>
            <h1>${this.escapeHtml(i18n.t('printScoreSheet'))}</h1>
            <div class="brand">Baseball Score Recorder</div>
        </div>
        <div class="score">${escapedTitle}</div>
    </section>
    <section class="meta">
        ${metaItems.map(([label, value]) => `<div><span>${this.escapeHtml(label)}</span>${this.escapeHtml(value)}</div>`).join('')}
    </section>
    <h2>${this.escapeHtml(i18n.t('gameDetailScoreboard'))}</h2>
    <table class="scoreboard">
        <thead>
            <tr><th></th>${scoreHeaders}<th>R</th><th>H</th><th>E</th></tr>
        </thead>
        <tbody>
            ${scoreRow(game.awayTeam, score.awayRuns, score.awayScore, score.awayHits, score.awayErrors)}
            ${scoreRow(game.homeTeam, score.homeRuns, score.homeScore, score.homeHits, score.homeErrors)}
        </tbody>
    </table>
    <h2>${this.escapeHtml(i18n.t('printAtBats'))}</h2>
    <table class="at-bats">
        <thead>
            <tr>
                <th>#</th>
                <th>${this.escapeHtml(i18n.t('innings'))}</th>
                <th>${this.escapeHtml(i18n.t('printTeam'))}</th>
                <th>${this.escapeHtml(i18n.t('battingOrder'))}</th>
                <th>${this.escapeHtml(i18n.t('result'))}</th>
                <th>${this.escapeHtml(i18n.t('runsScored'))}</th>
                <th>RBI</th>
                <th>${this.escapeHtml(i18n.t('outs'))}</th>
            </tr>
        </thead>
        <tbody>${atBatRows}</tbody>
    </table>
    <h2>${this.escapeHtml(i18n.t('gameMemoLabel'))}</h2>
    <div class="memo">${this.escapeHtml(classification.memo || '')}</div>
    <p class="hint">${this.escapeHtml(i18n.t('printScoreSheetHelp'))}</p>
</main>
<script>
    window.addEventListener('load', () => {
        setTimeout(() => window.print(), 250);
    });
</script>
</body>
</html>`;
    }

    openPrintDocument(html) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return false;
        printWindow.opener = null;
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        return true;
    }

    csvValue(value) {
        if (value === null || value === undefined) return '';
        const text = String(value).replace(/\r?\n/g, ' ');
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    csvRow(values) {
        return values.map(value => this.csvValue(value)).join(',');
    }

    buildSavedGameCsvText(bundle) {
        const game = bundle.game || {};
        const classification = this.normalizeGameClassification(game.classification);
        const innings = [...(bundle.innings || [])].sort((a, b) =>
            a.inning !== b.inning ? a.inning - b.inning : (a.isTopHalf ? -1 : 1)
        );
        const atBats = [...(bundle.atBats || [])].sort((a, b) =>
            (a.inningId || 0) - (b.inningId || 0) || (a.createdAt || a.id || 0) - (b.createdAt || b.id || 0)
        );
        const inningById = new Map(innings.map(inning => [inning.id, inning]));
        const lines = [];

        lines.push('game_summary');
        lines.push(this.csvRow(['field', 'value']));
        [
            ['exportedAt', bundle.exportedAt],
            ['date', game.date],
            ['awayTeam', game.awayTeam],
            ['homeTeam', game.homeTeam],
            ['awayScore', game.awayScore],
            ['homeScore', game.homeScore],
            ['status', game.status],
            ['recordingLevel', game.recordingLevel],
            ['recordingMode', game.recordingMode],
            ['playerDetailLevel', game.playerDetailLevel],
            ['category', classification.category],
            ['categoryLabel', this.getGameCategoryLabel(classification.category)],
            ['folderName', classification.folderName],
            ['tags', classification.tags.join(', ')],
            ['memo', classification.memo]
        ].forEach(row => lines.push(this.csvRow(row)));

        lines.push('');
        lines.push('inning_linescore');
        lines.push(this.csvRow(['inning', 'half', 'team', 'runs', 'hits', 'errors', 'incomplete']));
        innings.forEach(inning => {
            const isTop = inning.isTopHalf === true;
            lines.push(this.csvRow([
                inning.inning,
                isTop ? 'top' : 'bottom',
                isTop ? game.awayTeam : game.homeTeam,
                inning.runs || 0,
                inning.hits || 0,
                inning.errors || 0,
                inning.incomplete ? 'true' : 'false'
            ]));
        });

        lines.push('');
        lines.push('at_bats');
        lines.push(this.csvRow([
            'inning', 'half', 'team', 'battingOrder', 'playerId', 'result',
            'resultDetail', 'runsScored', 'rbi', 'outs', 'createdAt'
        ]));
        atBats.forEach(atBat => {
            const inning = inningById.get(atBat.inningId);
            const isTop = inning?.isTopHalf === true;
            lines.push(this.csvRow([
                inning?.inning || '',
                inning ? (isTop ? 'top' : 'bottom') : '',
                inning ? (isTop ? game.awayTeam : game.homeTeam) : '',
                atBat.battingOrder,
                atBat.playerId,
                atBat.result,
                atBat.resultDetail,
                atBat.runsScored || 0,
                atBat.rbi || 0,
                atBat.outs || 0,
                atBat.createdAt || ''
            ]));
        });

        return lines.join('\r\n');
    }

    async exportSavedGameBackup(gameId) {
        try {
            const bundle = await this.buildSavedGameExportBundle(gameId);
            const fileName = this.getSavedGameExportFileName(bundle.game);
            const json = JSON.stringify(bundle, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            this.downloadBlob(blob, fileName);
            this.showSuccess(i18n.t('exportBackupDownloaded'));
        } catch (error) {
            console.error('JSONバックアップ出力エラー:', error);
            this.showError(i18n.t('exportGameError'));
        }
    }

    async exportSavedGameCsv(gameId) {
        try {
            const bundle = await this.buildSavedGameExportBundle(gameId);
            const fileName = this.getSavedGameCsvFileName(bundle.game);
            const csv = this.buildSavedGameCsvText(bundle);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            this.downloadBlob(blob, fileName);
            this.showSuccess(i18n.t('exportCsvDownloaded'));
        } catch (error) {
            console.error('CSV出力エラー:', error);
            this.showError(i18n.t('exportGameError'));
        }
    }

    async exportSavedGameImage(gameId) {
        try {
            const bundle = await this.buildSavedGameExportBundle(gameId);
            const blob = await this.buildSavedGameImageBlob(bundle.game, bundle.innings);
            const fileName = this.getSavedGameImageFileName(bundle.game);
            const title = `${bundle.game.awayTeam || '?'} vs ${bundle.game.homeTeam || '?'}`;

            if (typeof navigator.share === 'function' && typeof File !== 'undefined') {
                const file = new File([blob], fileName, { type: 'image/png' });
                if (!navigator.canShare || navigator.canShare({ files: [file] })) {
                    await navigator.share({ title, files: [file] });
                    this.showSuccess(i18n.t('exportImageShared'));
                    return;
                }
            }

            this.downloadBlob(blob, fileName);
            this.showSuccess(i18n.t('exportImageDownloaded'));
        } catch (error) {
            if (error?.name === 'AbortError') return;
            console.error('画像出力エラー:', error);
            this.showError(i18n.t('exportGameError'));
        }
    }

    async printSavedGameScoreSheet(gameId) {
        try {
            const bundle = await this.buildSavedGameExportBundle(gameId);
            const html = this.buildSavedGamePrintHtml(bundle);
            if (!this.openPrintDocument(html)) {
                this.showError(i18n.t('printScoreSheetBlocked'));
                return;
            }
            this.showSuccess(i18n.t('printScoreSheetOpened'));
        } catch (error) {
            console.error('印刷用スコアシート作成エラー:', error);
            this.showError(i18n.t('exportGameError'));
        }
    }

    cloneForImport(value) {
        return JSON.parse(JSON.stringify(value || {}));
    }

    async importSavedGameBackupFile(file) {
        try {
            if (!file) return;
            const text = await file.text();
            const bundle = JSON.parse(text);
            if (!bundle || bundle.format !== 'baseball-score-game-export' || !bundle.game) {
                throw new Error('Invalid backup file');
            }
            const importedGameId = await this.importSavedGameBackupBundle(bundle);
            this.showSuccess(i18n.t('importBackupDone'));
            return importedGameId;
        } catch (error) {
            console.error('バックアップ復元エラー:', error);
            this.showError(i18n.t('importBackupError'));
            return null;
        }
    }

    async importSavedGameBackupBundle(bundle) {
        const game = this.cloneForImport(bundle.game);
        const oldGameId = game.id;
        delete game.id;
        game.importedAt = new Date().toISOString();
        game.importedFrom = {
            format: bundle.format,
            formatVersion: bundle.formatVersion || 1,
            exportedAt: bundle.exportedAt || ''
        };
        game.date = game.date || new Date().toISOString();

        const inningIdMap = new Map();
        const atBatIdMap = new Map();
        const newGameId = await storage.saveGame(game);

        const sortedInnings = [...(bundle.innings || [])].sort((a, b) =>
            a.inning !== b.inning ? a.inning - b.inning : (a.isTopHalf ? -1 : 1)
        );
        for (const originalInning of sortedInnings) {
            const oldInningId = originalInning.id;
            const inning = this.cloneForImport(originalInning);
            delete inning.id;
            inning.gameId = newGameId;
            const newInningId = await storage.saveInning(inning);
            if (oldInningId !== undefined && oldInningId !== null) {
                inningIdMap.set(oldInningId, newInningId);
            }
        }

        const sortedAtBats = [...(bundle.atBats || [])].sort((a, b) =>
            (a.inningId || 0) - (b.inningId || 0) || (a.createdAt || a.id || 0) - (b.createdAt || b.id || 0)
        );
        for (const originalAtBat of sortedAtBats) {
            const oldAtBatId = originalAtBat.id;
            const atBat = this.cloneForImport(originalAtBat);
            delete atBat.id;
            atBat.gameId = newGameId;
            if (inningIdMap.has(originalAtBat.inningId)) {
                atBat.inningId = inningIdMap.get(originalAtBat.inningId);
            }
            const newAtBatId = await storage.saveAtBat(atBat);
            if (oldAtBatId !== undefined && oldAtBatId !== null) {
                atBatIdMap.set(oldAtBatId, newAtBatId);
            }
        }

        const sortedPitches = [...(bundle.pitches || [])].sort((a, b) =>
            (a.atBatId || 0) - (b.atBatId || 0) || (a.pitchNumber || a.id || 0) - (b.pitchNumber || b.id || 0)
        );
        for (const originalPitch of sortedPitches) {
            const pitch = this.cloneForImport(originalPitch);
            delete pitch.id;
            pitch.gameId = newGameId;
            if (atBatIdMap.has(originalPitch.atBatId)) {
                pitch.atBatId = atBatIdMap.get(originalPitch.atBatId);
            }
            await storage.savePitch(pitch);
        }

        const savedGame = await storage.loadGame(newGameId);
        if (Array.isArray(savedGame?.innings)) {
            savedGame.innings = savedGame.innings.map(inning => {
                const next = { ...inning, gameId: newGameId };
                if (inningIdMap.has(inning.id)) next.id = inningIdMap.get(inning.id);
                return next;
            });
            await storage.saveGame(savedGame);
        }

        if (oldGameId && gameManager.currentGame?.id === oldGameId) {
            gameManager.currentGame.id = newGameId;
        }

        return newGameId;
    }

    async shareSavedGame(gameId) {
        try {
            const bundle = await this.buildSavedGameExportBundle(gameId);
            const fileName = this.getSavedGameShareTextFileName(bundle.game);
            const title = `${bundle.game.awayTeam || '?'} vs ${bundle.game.homeTeam || '?'}`;
            const text = this.buildLineScoreShareText(bundle.game, bundle.innings);

            if (typeof navigator.share === 'function') {
                await navigator.share({ title, text });
                this.showSuccess(i18n.t('shareGameReady'));
                return;
            }

            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(text);
                this.showSuccess(i18n.t('shareGameCopied'));
                return;
            }

            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            this.downloadBlob(blob, fileName);
            this.showSuccess(i18n.t('shareGameTextDownloaded'));
        } catch (error) {
            console.error('試合共有エラー:', error);
            this.showError(i18n.t('shareGameError'));
        }
    }

    getSavedGameFolderEntries(games) {
        const entries = new Map();
        games.forEach(game => {
            const classification = this.normalizeGameClassification(game.classification);
            if (!classification.folderName) return;
            const key = `${classification.category}\u0000${classification.folderName.toLowerCase()}`;
            if (!entries.has(key)) {
                entries.set(key, {
                    category: classification.category,
                    folderName: classification.folderName,
                    count: 0
                });
            }
            entries.get(key).count += 1;
        });
        return [...entries.values()].sort((a, b) => {
            const categoryCompare = this.getGameCategoryLabel(a.category).localeCompare(this.getGameCategoryLabel(b.category));
            if (categoryCompare !== 0) return categoryCompare;
            return a.folderName.localeCompare(b.folderName);
        });
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

        const basicPitchMode = this.isBasicPitchMode(game);

        // 標準・詳細レベル、または基本+1球ごとの場合はDH制設定を表示
        const dhSetupSection = (game.playerDetailLevel === 'standard' || game.playerDetailLevel === 'detailed' || basicPitchMode) ? `
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
                        ${this.generateBasicPitcherSetup('away')}
                        ${game.playerDetailLevel === 'detailed' ? this.generateBenchPlayersSection('away') : ''}
                    </div>

                    <div class="team-players" id="homeTeamPlayers" style="display: none;">
                        <h4>${game.homeTeam} <span data-i18n="battingOrder">${i18n.t('battingOrder')}</span></h4>
                        <div class="batting-order-list" id="homeBattingOrder">
                            ${this.generateBattingOrderInputs('home')}
                        </div>
                        ${this.generateBasicPitcherSetup('home')}
                        ${game.playerDetailLevel === 'detailed' ? this.generateBenchPlayersSection('home') : ''}
                    </div>
                </div>

                <div class="setup-controls">
                    <button id="completePlayerSetup" class="primary-btn" data-i18n="playerRegistrationComplete">${i18n.t('playerRegistrationComplete')}</button>
                </div>
            </div>
        `;

        // DH制設定変更イベント
        if (game.playerDetailLevel === 'standard' || game.playerDetailLevel === 'detailed' || basicPitchMode) {
            const dhRadios = gameContent.querySelectorAll('input[name="dhRule"]');
            dhRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    game.dhRule = radio.value === 'true';
                    this.updateBattingOrderInputs();
                    this.updateBasicPitcherSetup();
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

    updateBasicPitcherSetup() {
        const awayContainer = document.getElementById('awayBasicPitcherSetup');
        const homeContainer = document.getElementById('homeBasicPitcherSetup');

        if (awayContainer) {
            awayContainer.outerHTML = this.generateBasicPitcherSetup('away');
        }
        if (homeContainer) {
            homeContainer.outerHTML = this.generateBasicPitcherSetup('home');
        }
    }

    isBasicPitchMode(game = gameManager.currentGame) {
        return game && game.recordingLevel === 'pitch' && game.playerDetailLevel === 'basic';
    }

    generateBattingOrderInputs(team) {
        const game = gameManager.currentGame;
        let html = '';
        const placeholder = game.playerDetailLevel === 'basic' ?
            i18n.t('playerNamePlaceholder') : i18n.t('playerNameRequired');

        // DH制に応じて打順数を決定
        const maxBattingOrder = (game.dhRule === true && !this.isBasicPitchMode(game)) ? 10 : 9;

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

    generateBasicPitcherSetup(team) {
        const game = gameManager.currentGame;
        if (!this.isBasicPitchMode(game)) {
            return '';
        }

        const existingPitcher = game.players[team].find(p => p.position === 'P' && p.isActive);
        const existingOrder = existingPitcher?.battingOrder || 1;
        const existingName = existingPitcher?.battingOrder ? '' : (existingPitcher?.name || '');

        if (game.dhRule === true) {
            return `
                <div class="basic-pitcher-setup" id="${team}BasicPitcherSetup">
                    <h5 data-i18n="basicPitcherSetup">${i18n.t('basicPitcherSetup')}</h5>
                    <p data-i18n="basicPitcherSetupHelp">${i18n.t('basicPitcherSetupHelp')}</p>
                    <label>
                        <span data-i18n="dhPitcherName">${i18n.t('dhPitcherName')}</span>
                        <input type="text"
                               class="basic-dh-pitcher-name"
                               data-team="${team}"
                               value="${existingName}"
                               placeholder="${i18n.t('dhPitcherNamePlaceholder')}"
                               data-i18n-placeholder="dhPitcherNamePlaceholder">
                    </label>
                </div>
            `;
        }

        return `
            <div class="basic-pitcher-setup" id="${team}BasicPitcherSetup">
                <h5 data-i18n="basicPitcherSetup">${i18n.t('basicPitcherSetup')}</h5>
                <p data-i18n="basicPitcherSetupHelp">${i18n.t('basicPitcherSetupHelp')}</p>
                <label>
                    <span data-i18n="startingPitcherBattingOrder">${i18n.t('startingPitcherBattingOrder')}</span>
                    <select class="basic-pitcher-order" data-team="${team}">
                        ${this.generatePitcherOrderOptions(existingOrder)}
                    </select>
                </label>
            </div>
        `;
    }

    generatePitcherOrderOptions(selectedOrder) {
        let html = '';
        for (let i = 1; i <= 9; i++) {
            const selected = Number(selectedOrder) === i ? 'selected' : '';
            html += `<option value="${i}" ${selected}>${i}${i18n.t('playerNumber')}</option>`;
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
            const positionName = i18n.t(`pos_${key}`);
            html += `<option value="${key}" ${selected}>${key}: ${positionName}</option>`;
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
                } else if (this.isBasicPitchMode(game) && game.dhRule !== true) {
                    const pitcherOrderSelect = document.querySelector(
                        `.basic-pitcher-order[data-team="${team}"]`
                    );
                    const pitcherOrder = pitcherOrderSelect ? parseInt(pitcherOrderSelect.value) : 1;
                    position = order === pitcherOrder ? 'P' : null;
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

            if (this.isBasicPitchMode(game) && game.dhRule === true) {
                for (const team of ['home', 'away']) {
                    const pitcherInput = document.querySelector(`.basic-dh-pitcher-name[data-team="${team}"]`);
                    const pitcherName = pitcherInput?.value.trim() || i18n.t('dhPitcherNamePlaceholder');
                    const pitcher = new Player(pitcherName, team, 'P', null);
                    pitcher.isStarter = true;
                    pitcher.isBench = false;
                    pitcher.isQuickRegistered = !pitcherInput?.value.trim();
                    pitcher.needsDetailFill = pitcher.isQuickRegistered;
                    pitcher.id = await storage.savePlayer(pitcher.toJSON());
                    game.players[team].push(pitcher);
                }
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
            await this.ensureCurrentInningPitcherStint();
            await gameManager.saveGame();

            // ゲーム画面に遷移
            this.setupGameContent(game.recordingLevel);
            this.showSuccess(i18n.t('playerRegistrationSuccess'));

        } catch (error) {
            console.error('選手登録エラー:', error);
            this.showError(i18n.t('playerRegistrationError'));
        }
    }

    async ensureCurrentInningPitcherStint() {
        const game = gameManager.currentGame;
        const inning = gameManager.currentInning;
        if (!game || !inning) return;

        const pitchingTeam = game.isTopHalf ? 'home' : 'away';
        const pitcher = game.players[pitchingTeam]?.find(p => p.position === 'P' && p.isActive);
        if (!pitcher) return;

        game.currentPitcher = {
            name: pitcher.name,
            playerId: pitcher.id,
            position: 'P'
        };

        if (!inning.pitcherStints || inning.pitcherStints.length === 0) {
            inning.pitcherStints = [{
                pitcherId: pitcher.id,
                runnersInherited: 0,
                runsAtEntry: inning.runs || 0,
                earnedRunsAtEntry: inning.earnedRuns || 0
            }];
            inning.pitcherId = pitcher.id;
            await storage.saveInning(inning.toJSON());
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
                            message: `${team === 'home' ? game.homeTeam : game.awayTeam}の守備位置が重複しています: ${i18n.t(`pos_${player.position}`)}（${player.position}）`
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
                    <button id="executeSubstitution" class="primary-btn" data-i18n="executeButton">${i18n.t('executeButton')}</button>
                    <button id="cancelSubstitution" class="secondary-btn" data-i18n="cancelButton">${i18n.t('cancelButton')}</button>
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
                    <span data-i18n="currentBatterLabel">${i18n.t('currentBatterLabel')}</span> ${currentBatter ? `${currentBatter.battingOrder}${i18n.t('battingOrderSuffix')} ${currentBatter.name}` : `<span data-i18n="noInfo">${i18n.t('noInfo')}</span>`}
                </div>
                <div class="pinch-hitter-input">
                    <label>
                        <input type="checkbox" id="usePinchHitter">
                        <span data-i18n="usePinchHitter">${i18n.t('usePinchHitter')}</span>
                    </label>
                    <input type="text" id="pinchHitterName" data-i18n-placeholder="pinchHitterNamePlaceholder" placeholder="${i18n.t('pinchHitterNamePlaceholder')}" disabled>
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
                        <h6 data-i18n="currentRunners">${i18n.t('currentRunners')}</h6>
                        ${runnerOptions.map(runner => `
                            <div class="runner-substitution">
                                <div class="runner-info">
                                    <span>${runner.base === 'first' ? i18n.t('firstBase') : runner.base === 'second' ? i18n.t('secondBase') : i18n.t('thirdBase')}: ${runner.name}</span>
                                </div>
                                <div class="runner-controls">
                                    <label>
                                        <input type="checkbox" class="pinch-runner-checkbox" data-base="${runner.base}">
                                        <span data-i18n="pinchRunnerLabel">${i18n.t('pinchRunnerLabel')}</span>
                                    </label>
                                    <input type="text" class="pinch-runner-name" data-base="${runner.base}" data-i18n-placeholder="pinchRunnerNamePlaceholder" placeholder="${i18n.t('pinchRunnerNamePlaceholder')}" disabled>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `<p data-i18n="noRunnersOnBase">${i18n.t('noRunnersOnBase')}</p>`}
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
                                <span class="position">${i18n.t(`pos_${player.position}`)}</span>
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
                            <span>${player.battingOrder}${i18n.t('battingOrderSuffix')} ${player.name} (${i18n.t(`pos_${player.position}`)})</span>
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
                            <span>${player.battingOrder}${i18n.t('battingOrderSuffix')} ${player.name} (${i18n.t(`pos_${player.position}`)})</span>
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
                                <span class="position">${i18n.t(`pos_${player.position}`)}</span>
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
                            <span>${player.battingOrder}${i18n.t('battingOrderSuffix')} ${player.name} (${i18n.t(`pos_${player.position}`)})</span>
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
                            <span>${player.battingOrder}${i18n.t('battingOrderSuffix')} ${player.name} (${i18n.t(`pos_${player.position}`)})</span>
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
                                    <span>(${i18n.t(`pos_${player.position}`) || player.position})</span>
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
                    throw new Error(`守備位置 ${i18n.t(`pos_${newPosition}`)} は既に使用されています`);
                }

                player.position = newPosition;
                usedPositions.add(newPosition);
                await storage.savePlayer(player.toJSON());
                // 投手交代をスティントに記録
                if (newPosition === 'P') {
                    const oldPitcherId = gameManager.getCurrentPitcherId();
                    gameManager.notifyPitcherChange(player.id);
                    await this.handleMidAtBatPitcherChange(oldPitcherId);
                }

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
                    throw new Error(`守備位置 ${i18n.t(`pos_${replacementPosition}`)} は既に使用されています`);
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
                // 投手交代をスティントに記録
                if (replacementPosition === 'P') {
                    const oldPitcherId = gameManager.getCurrentPitcherId();
                    gameManager.notifyPitcherChange(newPlayer.id);
                    await this.handleMidAtBatPitcherChange(oldPitcherId);
                }
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
                    </div>

                    <div class="stat-group">
                        <h4><span data-i18n="currentInningErrors">失策数</span>: <span id="currentInningErrors">0</span></h4>
                        <button id="addError" class="stat-btn"><span data-i18n="errors">E</span> +1</button>
                    </div>

                </div>

                <div class="inning-controls">
                    <button id="endHalfInning" class="primary-btn" data-i18n="endHalfInning">攻撃終了</button>
                    <button id="undoInningAction" class="undo-btn" disabled data-i18n="undo">取消</button>
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

        this.inningActionHistory = [];
        this.setupInningEventListeners();
        this.updateCurrentInningDisplay();
        this.loadInningHistory();

        // 多言語対応の適用
        i18n.updatePageContent();
    }

    setupBatterLevelInterface(container) {
        container.innerHTML = `
            <div class="batter-interface">
                <h3 data-i18n="batterRecord">打者記録</h3>

                <div class="current-batter-info">
                    <div class="batter-display">
                        <h4 data-i18n="currentBatter">現在の打者</h4>
                        <div id="currentBatterDisplay"></div>
                    </div>

                    <div class="game-situation">
                        <div class="runners-display">
                            <h5 data-i18n="runnersSituation">走者状況</h5>
                            <div class="bases">
                                <span id="base1" class="base" data-i18n="firstBase">1塁</span>
                                <span id="base2" class="base" data-i18n="secondBase">2塁</span>
                                <span id="base3" class="base" data-i18n="thirdBase">3塁</span>
                            </div>
                        </div>
                        <div class="count-display">
                            <span data-i18n="outs">アウト</span>: <span id="outsDisplay">0</span>
                        </div>
                    </div>
                </div>

                <div class="result-selection">
                    <h4 data-i18n="atBatResult">打席結果</h4>
                    <div id="resultButtons" class="result-buttons">
                        <!-- 動的に生成 -->
                    </div>
                </div>

                <div class="runner-play-section" id="runnerPlaySection" style="display: none;">
                    <h4 data-i18n="runner_play_category">走者プレー</h4>
                    <div id="runnerPlayButtons" class="runner-play-buttons">
                        <!-- 動的に生成 -->
                    </div>
                </div>

                <div class="error-section">
                    <button id="addErrorButton" class="secondary-btn" data-i18n="add_error">エラーを追加</button>
                    <div id="errorsList"></div>
                </div>

                <div class="detail-inputs">
                    <div class="input-group">
                        <label for="resultDetail" data-i18n="hitDirection">打球方向・詳細:</label>
                        <input type="text" id="resultDetail" data-i18n-placeholder="hitDirectionPlaceholder" placeholder="例: センター前、ライト線">
                    </div>

                    <div class="input-group">
                        <label for="rbis" data-i18n="rbiLabel">打点:</label>
                        <input type="number" id="rbis" min="0" max="4" value="0">
                    </div>
                </div>

                <div class="batter-controls">
                    <button id="recordAtBat" class="primary-btn" data-i18n="recordButton">記録</button>
                    <button id="undoLastAtBatBtn" class="undo-btn" data-i18n="undoLastAtBat">前打席に戻す</button>
                    <button id="correctLastAtBat" class="secondary-btn" data-i18n="correctPreviousAtBat">前打席修正</button>
                </div>

                <div class="earned-runs-adjust">
                    <span data-i18n="earnedRunsLabel">自責点</span>: <span id="currentInningEarnedRuns">0</span>
                    <button id="markUnearnedBtn" class="stat-btn" disabled data-i18n="markUnearned">−自責点</button>
                    <button id="undoMarkUnearnedBtn" class="stat-btn" disabled data-i18n="undoMarkUnearned">+自責点</button>
                </div>

                <div class="at-bat-history">
                    <h4 data-i18n="atBatHistory">打席履歴</h4>
                    <div id="atBatHistoryList"></div>
                </div>
            </div>
        `;

        this.updateBatterDisplay();
        this.updateResultButtons();
        this.setupBatterEventListeners();

        // 翻訳を適用
        if (typeof i18n !== 'undefined') {
            i18n.updatePageContent();
        }
    }

    setupBatterEventListeners() {
        document.getElementById('recordAtBat').addEventListener('click', () => {
            this.recordAtBatData();
        });

        document.getElementById('undoLastAtBatBtn').addEventListener('click', () => {
            this.undoLastAtBat();
        });

        document.getElementById('correctLastAtBat').addEventListener('click', () => {
            this.correctLastAtBat();
        });

        document.getElementById('addErrorButton').addEventListener('click', () => {
            this.showAddErrorModal();
        });

        const bMarkBtn = document.getElementById('markUnearnedBtn');
        if (bMarkBtn) bMarkBtn.addEventListener('click', () => this.addMarkUnearned());
        const bUndoMarkBtn = document.getElementById('undoMarkUnearnedBtn');
        if (bUndoMarkBtn) bUndoMarkBtn.addEventListener('click', () => this.addUndoMarkUnearned());

        // エラー配列を初期化
        this.currentErrors = [];
    }

    updateBatterDisplay() {
        console.log('📊 updateBatterDisplay called');
        const batter = gameManager.getCurrentBatter();
        const display = document.getElementById('currentBatterDisplay');

        console.log('Current batter:', batter);
        console.log('Display element:', display);

        if (batter && display) {
            const currentLang = i18n.getCurrentLanguage();
            const suffix = i18n.t('battingOrderSuffix');
            console.log('In updateBatterDisplay - Language:', currentLang, 'Suffix:', suffix);

            const teamName = batter.team === 'home' ? gameManager.currentGame.homeTeam : gameManager.currentGame.awayTeam;
            const positionText = batter.position ?
                ` (${i18n.t(`pos_${batter.position}`)})` : '';

            // 名前から古い形式のサフィックスを除去
            let cleanName = batter.name;
            const match = cleanName.match(/^(\d+)(番|º|°)?$/);
            if (match) {
                console.log('Cleaning old suffix from name:', cleanName, '→', match[1]);
                cleanName = match[1];  // 数字のみ
            }

            const finalDisplay = `${batter.battingOrder}${suffix}`;
            console.log('Final display text for order:', finalDisplay);

            display.innerHTML = `
                <div class="batter-info">
                    <span class="team">${teamName}</span>
                    <span class="order">${finalDisplay}</span>
                    <span class="name">${cleanName}${positionText}</span>
                </div>
            `;
            console.log('Display updated with innerHTML:', display.innerHTML);
        }

        this.updateRunnersDisplay();
        this.updateOutsDisplay();
        this.updateRunnerPlaySection();
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

        // 現在の選択状態を初期化（トップレベルから開始）
        if (!this.currentResultView) {
            this.currentResultView = 'top';
            this.selectedCategory = null;
            this.selectedSubCategory = null;
            this.selectedResult = null;
        }

        if (this.currentResultView === 'top') {
            this.showTopLevelResults(container);
        } else if (this.currentResultView === 'sub') {
            this.showSubLevelResults(container);
        }
    }

    showTopLevelResults(container) {
        // AT_BAT_RESULTSのトップレベルキーを取得
        const topLevel = BASEBALL_CONFIG.AT_BAT_RESULTS;
        const runnerPlays = BASEBALL_CONFIG.RUNNER_PLAY_CATEGORIES;

        // 打席完結と打席継続を分けて表示
        const completingResults = Object.keys(topLevel).filter(key =>
            topLevel[key].completesAtBat !== false
        );

        const continuingPlays = Object.keys(runnerPlays);

        container.innerHTML = `
            <div class="result-section">
                <h4 class="section-title completing-title">打席完結</h4>
                <div class="result-buttons-group completing-group">
                    ${completingResults.map(key => {
                        const config = topLevel[key];
                        const label = i18n.t(config.label) || key;
                        return `<button class="result-btn category-btn completing-btn" data-key="${key}" data-type="result">${label}</button>`;
                    }).join('')}
                </div>
            </div>
            <div class="result-section">
                <h4 class="section-title continuing-title">打席継続中の事象</h4>
                <div class="result-buttons-group continuing-group">
                    ${continuingPlays.map(key => {
                        const config = runnerPlays[key];
                        const label = i18n.t(config.label) || key;
                        return `<button class="result-btn category-btn continuing-btn" data-key="${key}" data-type="play">${label}</button>`;
                    }).join('')}
                </div>
            </div>
        `;

        container.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                const type = btn.dataset.type;

                if (type === 'result') {
                    const config = topLevel[key];
                    // 打席結果の処理
                    // 子要素がある場合はサブレベルへ
                    if (config.children) {
                        this.selectedCategory = key;
                        this.currentResultView = 'sub';
                        this.showSubLevelResults(container);
                    }
                    // 守備妨害の場合は妨害タイプ選択へ
                    else if (config.hasInterferenceType) {
                        this.selectedCategory = key;
                        this.showInterferenceTypeModal();
                    }
                    // 走塁妨害の場合は妨害詳細選択へ
                    else if (config.requiresObstructionDetails) {
                        this.selectedCategory = key;
                        this.showObstructionModal();
                    }
                    // エラーの場合はエラータイプ選択へ
                    else if (config.hasErrorType) {
                        this.selectedCategory = key;
                        this.showErrorTypeModal();
                    }
                    else {
                        // 子要素がない場合は直接選択（死球、野選出塁）
                        container.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        this.selectedResult = key;
                        this.selectedSubCategory = null;
                        this.selectedHitDirection = null;
                    }
                } else if (type === 'play') {
                    // 打席継続中の走者プレイ処理
                    const config = runnerPlays[key];

                    // 各プレイタイプに応じた処理
                    if (key === 'balk') {
                        this.processBalk();
                    } else if (key === 'steal') {
                        this.showStealModal();
                    } else if (key === 'pickoff') {
                        this.showPickoffModal();
                    } else if (key === 'wild_pitch') {
                        this.showWildPitchModal();
                    } else if (key === 'passed_ball') {
                        this.showPassedBallModal();
                    } else if (key === 'pickoff_error') {
                        this.showPickoffErrorModal();
                    } else {
                        console.log('Runner play selected:', key, config);
                        const label = i18n.t(config?.label) || config?.label || key;
                        this.recordUnsupportedPlay(key, label, { area: 'runner_play' });
                        this.showInfo(i18n.t('unsupportedPlayMessage') || '未対応プレーを検出しました。操作ログに記録しました。');
                    }
                }
            });
        });
    }

    showSubLevelResults(container) {
        const topLevel = BASEBALL_CONFIG.AT_BAT_RESULTS;
        const categoryConfig = topLevel[this.selectedCategory];
        const categoryLabel = i18n.t(categoryConfig.label) || this.selectedCategory;

        const backButton = `<button class="result-btn back-btn" data-action="back">← ${i18n.t('back_button') || '戻る'}</button>`;
        const resultButtons = Object.keys(categoryConfig.children).map(key => {
            const childConfig = categoryConfig.children[key];
            const label = i18n.t(childConfig.label) || key;
            return `<button class="result-btn" data-result="${key}">${label}</button>`;
        }).join('');

        container.innerHTML = `
            <div class="category-header">
                <strong>${categoryLabel}</strong>
            </div>
            ${backButton}
            ${resultButtons}
        `;

        // 戻るボタン
        container.querySelector('.back-btn').addEventListener('click', () => {
            this.currentResultView = 'top';
            this.selectedCategory = null;
            this.selectedSubCategory = null;
            this.selectedResult = null;
            this.showTopLevelResults(container);
        });

        // 結果選択ボタン
        container.querySelectorAll('.result-btn:not(.back-btn)').forEach(btn => {
            btn.addEventListener('click', () => {
                const result = btn.dataset.result;
                const childConfig = categoryConfig.children[result];

                // 安打の場合は打球方向選択モーダルを表示
                if (this.selectedCategory === 'hit' && childConfig.requiresDirection) {
                    this.showHitDirectionModal(result);
                }
                // 凡退の場合
                else if (this.selectedCategory === 'out') {
                    // 三振の場合は三振詳細選択モーダル
                    if (result === 'strikeout' && childConfig.hasDetails) {
                        this.showStrikeoutDetailsModal(result);
                    }
                    // ゴロ・フライ・ライナーの場合は守備位置選択モーダル
                    else if (childConfig.requiresDirection) {
                        this.showOutDirectionModal(result, childConfig);
                    }
                    // 反則打球は直接選択
                    else {
                        container.querySelectorAll('.result-btn:not(.back-btn)').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        this.selectedResult = result;
                        this.selectedSubCategory = result;
                        this.selectedHitDirection = null;
                    }
                }
                // 四球の場合
                else if (this.selectedCategory === 'walk') {
                    container.querySelectorAll('.result-btn:not(.back-btn)').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.selectedResult = result;
                    this.selectedSubCategory = result;
                    this.selectedHitDirection = null;
                }
                // その他の結果は直接選択
                else {
                    container.querySelectorAll('.result-btn:not(.back-btn)').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.selectedResult = result;
                    this.selectedSubCategory = result;
                    this.selectedHitDirection = null;
                }
            });
        });
    }

    showHitDirectionModal(hitType) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'hitDirectionModal';

        // 本塁打の場合は特殊な方向選択肢
        const isHomerun = hitType === 'homerun';
        const directions = isHomerun ?
            BASEBALL_CONFIG.HOMERUN_DIRECTIONS :
            BASEBALL_CONFIG.HIT_DIRECTIONS;

        let directionOptions = Object.keys(directions).map(key => {
            const dir = directions[key];
            return `<option value="${key}">${i18n.t(dir.label)}</option>`;
        }).join('');

        // 単打で走者がいる場合は「走者の守備妨害」を追加
        const runners = gameManager.currentGame.runnersOnBase;
        const hasRunners = runners.first || runners.second || runners.third;
        if (hitType === 'single' && hasRunners) {
            directionOptions += `<option value="runner_interference">${i18n.t('runner_interference')}</option>`;
        }

        modal.innerHTML = `
            <div class="modal-content">
                <h3 data-i18n="hit_direction">${i18n.t('hit_direction')}</h3>
                <p>${i18n.t(hitType)}</p>
                <div class="input-group">
                    <label data-i18n="select_hit_direction">${i18n.t('select_hit_direction')}</label>
                    <select id="hitDirectionSelect">
                        <option value="">${i18n.t('selectPlaceholder')}</option>
                        ${directionOptions}
                    </select>
                </div>
                <div class="modal-actions">
                    <button id="confirmHitDirection" class="primary-btn">${i18n.t('confirm')}</button>
                    <button id="cancelHitDirection" class="secondary-btn">${i18n.t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Confirm button
        document.getElementById('confirmHitDirection').addEventListener('click', () => {
            const direction = document.getElementById('hitDirectionSelect').value;
            if (!direction) {
                alert(i18n.t('select_hit_direction'));
                return;
            }

            // 走者の守備妨害の場合は走者選択モーダルを表示
            if (direction === 'runner_interference') {
                modal.remove();
                this.showInterferingRunnerModal(hitType);
                return;
            }

            // 結果と方向を保存
            this.selectedResult = hitType;
            this.selectedHitDirection = direction;

            // 結果ボタンを選択状態にする
            const container = document.getElementById('resultButtons');
            if (container) {
                const btn = Array.from(container.querySelectorAll('.result-btn')).find(
                    b => b.dataset.result === hitType
                );
                if (btn) {
                    container.querySelectorAll('.result-btn:not(.back-btn)').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                }
            }

            modal.remove();
        });

        // Cancel button
        document.getElementById('cancelHitDirection').addEventListener('click', () => {
            modal.remove();
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showInterferingRunnerModal(hitType) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'interferingRunnerModal';

        const runners = gameManager.currentGame.runnersOnBase;
        const runnerOptions = [];

        if (runners.first) {
            runnerOptions.push({ value: 'first', label: i18n.t('first_base_runner') });
        }
        if (runners.second) {
            runnerOptions.push({ value: 'second', label: i18n.t('second_base_runner') });
        }
        if (runners.third) {
            runnerOptions.push({ value: 'third', label: i18n.t('third_base_runner') });
        }

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('runner_interference')}</h3>
                <p>${i18n.t(hitType)}</p>
                <div class="input-group">
                    <label>${i18n.t('select_interfering_runner')}</label>
                    <select id="interferingRunnerSelect">
                        <option value="">${i18n.t('selectPlaceholder')}</option>
                        ${runnerOptions.map(opt =>
                            `<option value="${opt.value}">${opt.label}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="modal-actions">
                    <button id="confirmInterference" class="primary-btn">${i18n.t('confirm')}</button>
                    <button id="cancelInterference" class="secondary-btn">${i18n.t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Confirm button
        document.getElementById('confirmInterference').addEventListener('click', () => {
            const interferingRunner = document.getElementById('interferingRunnerSelect').value;
            if (!interferingRunner) {
                alert(i18n.t('select_interfering_runner'));
                return;
            }

            // 結果と方向、妨害走者を保存
            this.selectedResult = hitType;
            this.selectedHitDirection = 'runner_interference';
            this.selectedInterferingRunner = interferingRunner;

            // 結果ボタンを選択状態にする
            const container = document.getElementById('resultButtons');
            if (container) {
                const btn = Array.from(container.querySelectorAll('.result-btn')).find(
                    b => b.dataset.result === hitType
                );
                if (btn) {
                    container.querySelectorAll('.result-btn:not(.back-btn)').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                }
            }

            modal.remove();
        });

        // Cancel button
        document.getElementById('cancelInterference').addEventListener('click', () => {
            modal.remove();
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showStrikeoutDetailsModal(outType) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'strikeoutDetailsModal';

        const details = BASEBALL_CONFIG.STRIKEOUT_DETAILS;
        const canDroppedThird = gameManager.isDroppedThirdStrikeEligible();

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('strikeout')}</h3>
                <p>三振の種類を選択してください</p>
                <div class="input-group">
                    <label>三振詳細:</label>
                    <select id="strikeoutDetailSelect">
                        <option value="">${i18n.t('selectPlaceholder')}</option>
                        ${Object.keys(details).map(key =>
                            `<option value="${key}">${i18n.t(details[key].label)}</option>`
                        ).join('')}
                    </select>
                </div>
                ${canDroppedThird ? `
                <div class="input-group">
                    <label>振り逃げ:</label>
                    <select id="droppedThirdStrikeSelect">
                        <option value="no">振り逃げなし（通常の三振）</option>
                        <option value="yes">振り逃げあり</option>
                    </select>
                </div>
                ` : ''}
                <div class="modal-actions">
                    <button id="confirmStrikeoutDetail" class="primary-btn">${i18n.t('confirm')}</button>
                    <button id="cancelStrikeoutDetail" class="secondary-btn">${i18n.t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('confirmStrikeoutDetail').addEventListener('click', () => {
            const detail = document.getElementById('strikeoutDetailSelect').value;
            if (!detail) {
                alert('三振の種類を選択してください');
                return;
            }

            const droppedThird = canDroppedThird ?
                document.getElementById('droppedThirdStrikeSelect').value : 'no';

            // 結果と詳細を保存
            this.selectedResult = outType;
            this.selectedOutDetail = detail;
            this.selectedDroppedThird = droppedThird;

            // 結果ボタンを選択状態にする
            const container = document.getElementById('resultButtons');
            if (container) {
                const btn = Array.from(container.querySelectorAll('.result-btn')).find(
                    b => b.dataset.result === outType
                );
                if (btn) {
                    container.querySelectorAll('.result-btn:not(.back-btn)').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                }
            }

            modal.remove();
        });

        document.getElementById('cancelStrikeoutDetail').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showOutDirectionModal(outType, childConfig) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'outDirectionModal';

        // フライアウトの場合はFair/Foul選択も必要
        const requiresFairFoul = childConfig.requiresFairFoul;
        const directions = BASEBALL_CONFIG.HIT_DIRECTIONS;

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t(outType)}</h3>
                <p>守備位置を選択してください</p>
                ${requiresFairFoul ? `
                <div class="input-group">
                    <label>Fair/Foul:</label>
                    <select id="fairFoulSelect">
                        <option value="fair">Fair</option>
                        <option value="foul">Foul</option>
                    </select>
                </div>
                ` : ''}
                <div class="input-group">
                    <label>守備位置:</label>
                    <select id="outDirectionSelect">
                        <option value="">${i18n.t('selectPlaceholder')}</option>
                        ${Object.keys(directions).map(key => {
                            const dir = directions[key];
                            return `<option value="${key}">${i18n.t(dir.label)}</option>`;
                        }).join('')}
                    </select>
                </div>
                <div class="modal-actions">
                    <button id="confirmOutDirection" class="primary-btn">${i18n.t('confirm')}</button>
                    <button id="cancelOutDirection" class="secondary-btn">${i18n.t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('confirmOutDirection').addEventListener('click', () => {
            const direction = document.getElementById('outDirectionSelect').value;
            if (!direction) {
                alert('守備位置を選択してください');
                return;
            }

            const fairFoul = requiresFairFoul ? document.getElementById('fairFoulSelect').value : null;

            // 結果と方向を保存
            this.selectedResult = outType;
            this.selectedHitDirection = direction;
            this.selectedFairFoul = fairFoul;

            // 結果ボタンを選択状態にする
            const container = document.getElementById('resultButtons');
            if (container) {
                const btn = Array.from(container.querySelectorAll('.result-btn')).find(
                    b => b.dataset.result === outType
                );
                if (btn) {
                    container.querySelectorAll('.result-btn:not(.back-btn)').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                }
            }

            modal.remove();
        });

        document.getElementById('cancelOutDirection').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    updateRunnerPlaySection() {
        const section = document.getElementById('runnerPlaySection');
        if (!section || !gameManager.currentGame) return;

        const runners = gameManager.currentGame.runnersOnBase;
        const hasRunners = runners.first || runners.second || runners.third;

        // 走者がいる場合のみ表示
        if (hasRunners) {
            section.style.display = 'block';
            this.showRunnerPlayOptions();
        } else {
            section.style.display = 'none';
        }
    }

    showRunnerPlayOptions() {
        const container = document.getElementById('runnerPlayButtons');
        if (!container) return;

        const runnerPlays = BASEBALL_CONFIG.RUNNER_PLAY_CATEGORIES;

        container.innerHTML = Object.keys(runnerPlays).map(playKey => {
            const play = runnerPlays[playKey];
            const label = i18n.t(play.label) || play.label;
            return `<button class="runner-play-btn" data-play="${playKey}">${label}</button>`;
        }).join('');

        container.querySelectorAll('.runner-play-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const playKey = btn.dataset.play;
                this.handleRunnerPlay(playKey);
            });
        });
    }

    handleRunnerPlay(playKey) {
        const play = BASEBALL_CONFIG.RUNNER_PLAY_CATEGORIES[playKey];

        if (!play) return;

        // 盗塁・牽制の場合は走者選択が必要
        if (playKey === 'steal' || playKey === 'pickoff') {
            this.showRunnerSelectionModal(playKey, play);
        } else {
            // 暴投・捕逸・牽制エラー・ボークは直接実行
            this.showRunnerAdvancementAfterPlay(playKey, play);
        }
    }

    showRunnerSelectionModal(playKey, play) {
        const runners = gameManager.currentGame.runnersOnBase;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'runnerSelectionModal';

        const runnerOptions = [];
        if (runners.first) runnerOptions.push({ base: 'first', label: i18n.t('firstBase') || '1塁' });
        if (runners.second) runnerOptions.push({ base: 'second', label: i18n.t('secondBase') || '2塁' });
        if (runners.third) runnerOptions.push({ base: 'third', label: i18n.t('thirdBase') || '3塁' });

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t(play.label)}</h3>
                <p data-i18n="select_runner">${i18n.t('select_runner') || '走者を選択'}</p>

                <div class="runner-selection">
                    ${runnerOptions.map(r =>
                        `<button class="runner-select-btn" data-base="${r.base}">${r.label}</button>`
                    ).join('')}
                </div>

                <div class="result-selection-play">
                    <h4>${i18n.t('result') || '結果'}</h4>
                    <div class="play-result-buttons">
                        ${play.options.map(option =>
                            `<button class="play-result-btn" data-result="${option}">${i18n.t(option)}</button>`
                        ).join('')}
                    </div>
                </div>

                <div class="modal-actions">
                    <button id="confirmRunnerPlay" class="primary-btn" data-i18n="confirm">決定</button>
                    <button id="cancelRunnerPlay" class="secondary-btn" data-i18n="cancel">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        let selectedRunner = null;
        let selectedPlayResult = null;

        // 走者選択
        modal.querySelectorAll('.runner-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.runner-select-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedRunner = btn.dataset.base;
            });
        });

        // 結果選択
        modal.querySelectorAll('.play-result-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.play-result-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedPlayResult = btn.dataset.result;
            });
        });

        // 決定ボタン
        modal.querySelector('#confirmRunnerPlay').addEventListener('click', () => {
            if (!selectedRunner || !selectedPlayResult) {
                this.showError(i18n.t('errorSelectResult') || '走者と結果を選択してください');
                return;
            }

            this.executeRunnerPlay(playKey, selectedRunner, selectedPlayResult);
            modal.remove();
        });

        // キャンセルボタン
        modal.querySelector('#cancelRunnerPlay').addEventListener('click', () => {
            modal.remove();
        });
    }

    showRunnerAdvancementAfterPlay(playKey, play) {
        // 暴投・捕逸・牽制エラー・ボーク用のアウト・走者更新UI
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'runnerAdvancementModal';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t(play.label)}</h3>
                <p data-i18n="update_outs_runners">${i18n.t('update_outs_runners') || 'アウト・走者を更新'}</p>

                <div class="outs-update">
                    <label>${i18n.t('outs') || 'アウト'}:</label>
                    <input type="number" id="newOuts" min="0" max="3" value="${gameManager.currentGame.outs}">
                </div>

                <div class="runners-update">
                    <h4>${i18n.t('runnersSituation') || '走者状況'}</h4>
                    <label><input type="checkbox" id="newFirst" ${gameManager.currentGame.runnersOnBase.first ? 'checked' : ''}> ${i18n.t('firstBase') || '1塁'}</label>
                    <label><input type="checkbox" id="newSecond" ${gameManager.currentGame.runnersOnBase.second ? 'checked' : ''}> ${i18n.t('secondBase') || '2塁'}</label>
                    <label><input type="checkbox" id="newThird" ${gameManager.currentGame.runnersOnBase.third ? 'checked' : ''}> ${i18n.t('thirdBase') || '3塁'}</label>
                </div>

                <div class="runs-scored">
                    <label>${i18n.t('runsScored') || '得点'}:</label>
                    <input type="number" id="runsScored" min="0" max="4" value="0">
                </div>

                <div class="modal-actions">
                    <button id="confirmAdvancement" class="primary-btn" data-i18n="confirm">決定</button>
                    <button id="cancelAdvancement" class="secondary-btn" data-i18n="cancel">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#confirmAdvancement').addEventListener('click', () => {
            const newOuts = parseInt(modal.querySelector('#newOuts').value);
            const newRunners = {
                first: modal.querySelector('#newFirst').checked,
                second: modal.querySelector('#newSecond').checked,
                third: modal.querySelector('#newThird').checked
            };
            const runs = parseInt(modal.querySelector('#runsScored').value);

            this.executeRunnerPlayWithAdvancement(playKey, newOuts, newRunners, runs);
            modal.remove();
        });

        modal.querySelector('#cancelAdvancement').addEventListener('click', () => {
            modal.remove();
        });
    }

    async executeRunnerPlay(playKey, runner, result) {
        // 盗塁・牽制の実行
        console.log(`Runner play: ${playKey} - ${runner} - ${result}`);

        // アウトになる結果の場合、アウトカウントを増やす
        if (result.includes('out')) {
            const previousOuts = gameManager.currentGame.outs;
            gameManager.currentGame.outs++;

            // 3アウトチェンジ判定
            if (gameManager.currentGame.outs >= 3) {
                // 打席継続フラグを立てる
                gameManager.currentGame.batterContinuesNextInning = true;

                await gameManager.saveGame();
                this.updateGameDisplay();

                this.showSuccess(`${i18n.t(result)} を記録しました（3アウトチェンジ、打席継続）`);

                // イニング終了処理
                await gameManager.endHalfInning();
                this.updateCurrentInningDisplay();
                this.loadInningHistory();
                return;
            }
        }

        // 走者の塁を更新（成功の場合）
        // TODO: 実際の走者進塁処理を実装

        await gameManager.saveGame();
        this.updateGameDisplay();
        this.updateBatterDisplay();
        this.updateRunnerPlaySection();

        this.showSuccess(`${i18n.t(result)} を記録しました`);
        // 打者はそのまま（batterUnchanged）
    }

    async executeRunnerPlayWithAdvancement(playKey, newOuts, newRunners, runs) {
        // 暴投・捕逸等の実行
        console.log(`Runner play: ${playKey} - outs: ${newOuts}, runners:`, newRunners, `runs: ${runs}`);

        const previousOuts = gameManager.currentGame.outs;
        gameManager.currentGame.outs = newOuts;
        gameManager.currentGame.runnersOnBase = newRunners;

        if (runs > 0) {
            gameManager.addRuns(runs);
        }

        // 3アウトチェンジ判定
        if (newOuts >= 3 && previousOuts < 3) {
            // 打席継続フラグを立てる
            gameManager.currentGame.batterContinuesNextInning = true;

            await gameManager.saveGame();
            this.updateGameDisplay();

            this.showSuccess(`${i18n.t(BASEBALL_CONFIG.RUNNER_PLAY_CATEGORIES[playKey].label)} を記録しました（3アウトチェンジ、打席継続）`);

            // イニング終了処理
            await gameManager.endHalfInning();
            this.updateCurrentInningDisplay();
            this.loadInningHistory();
            return;
        }

        await gameManager.saveGame();
        this.updateGameDisplay();
        this.updateBatterDisplay();
        this.updateRunnerPlaySection();

        this.showSuccess(`${i18n.t(BASEBALL_CONFIG.RUNNER_PLAY_CATEGORIES[playKey].label)} を記録しました`);
    }

    // ========== エラーシステム ==========

    showAddErrorModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'addErrorModal';

        const errorTypes = BASEBALL_CONFIG.ERROR_TYPES;
        const positions = BASEBALL_CONFIG.POSITIONS;

        modal.innerHTML = `
            <div class="modal-content">
                <h3 data-i18n="add_error">${i18n.t('add_error')}</h3>

                <div class="input-group">
                    <label data-i18n="error_type">${i18n.t('error_type')}</label>
                    <select id="errorTypeSelect">
                        <option value="">${i18n.t('selectPlaceholder') || '選択してください'}</option>
                        ${Object.keys(errorTypes).map(key =>
                            `<option value="${key}">${i18n.t(errorTypes[key].label)}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="input-group">
                    <label data-i18n="error_position">${i18n.t('error_position')}</label>
                    <select id="errorPositionSelect">
                        <option value="">${i18n.t('selectPlaceholder') || '選択してください'}</option>
                        ${Object.keys(positions).map(pos =>
                            `<option value="${pos}">${i18n.t(`pos_${pos}`)}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="modal-actions">
                    <button id="confirmError" class="primary-btn" data-i18n="confirm">${i18n.t('confirm')}</button>
                    <button id="cancelError" class="secondary-btn" data-i18n="cancel">${i18n.t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#confirmError').addEventListener('click', () => {
            const errorType = modal.querySelector('#errorTypeSelect').value;
            const errorPosition = modal.querySelector('#errorPositionSelect').value;

            if (!errorType) {
                this.showError(i18n.t('errorSelectResult') || 'エラータイプを選択してください');
                return;
            }

            if (!errorPosition) {
                this.showError(i18n.t('select_error_position'));
                return;
            }

            // エラーを追加
            this.addError(errorType, errorPosition);
            modal.remove();
        });

        modal.querySelector('#cancelError').addEventListener('click', () => {
            modal.remove();
        });
    }

    addError(errorType, position) {
        const errorConfig = BASEBALL_CONFIG.ERROR_TYPES[errorType];

        // エラーを配列に追加
        this.currentErrors.push({
            type: errorType,
            position: position,
            config: errorConfig
        });

        // エラーリストを更新
        this.updateErrorsList();

        // エラーの処理タイプに応じて次のアクションを決定
        if (errorConfig.allowsAdvancement) {
            // 進塁選択が必要
            this.showRunnerAdvancementForError(errorType, position);
        } else {
            // ファウルフライ落球など、進塁なし
            this.showSuccess(`${i18n.t(errorConfig.label)} を追加しました`);
        }
    }

    updateErrorsList() {
        const list = document.getElementById('errorsList');
        if (!list) return;

        if (this.currentErrors.length === 0) {
            list.innerHTML = '';
            return;
        }

        list.innerHTML = this.currentErrors.map((error, index) => `
            <div class="error-item">
                <span>${i18n.t(error.config.label)} - ${i18n.t(`pos_${error.position}`)}</span>
                <button class="remove-error-btn" data-index="${index}">×</button>
            </div>
        `).join('');

        // 削除ボタンのイベントリスナー
        list.querySelectorAll('.remove-error-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.currentErrors.splice(index, 1);
                this.updateErrorsList();
            });
        });
    }

    showRunnerAdvancementForError(errorType, position) {
        const errorConfig = BASEBALL_CONFIG.ERROR_TYPES[errorType];
        const runners = gameManager.currentGame.runnersOnBase;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'runnerAdvancementErrorModal';

        // 進塁選択肢
        const advancementOptions = [
            { value: 'stay', label: i18n.t('stays') },
            { value: '1B', label: '1' + i18n.t('baseSuffix') || '塁' },
            { value: '2B', label: '2' + i18n.t('baseSuffix') || '塁' },
            { value: '3B', label: '3' + i18n.t('baseSuffix') || '塁' },
            { value: 'home', label: i18n.t('scored') },
            { value: 'out', label: i18n.t('out_on_bases') }
        ];

        // 打者走者の選択肢（牽制悪送球の場合は表示しない）
        const batterRunnerHTML = errorConfig.noBatterRunnerAdvancement ? '' : `
            <div class="runner-advancement-row">
                <label>${i18n.t('batter_runner_to')}</label>
                <select id="batterRunnerAdv">
                    ${advancementOptions.map(opt =>
                        `<option value="${opt.value}"${opt.value === '1B' ? ' selected' : ''}>${opt.label}</option>`
                    ).join('')}
                </select>
            </div>
        `;

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('runner_advancement')}</h3>
                <p>${i18n.t(errorConfig.label)} - ${i18n.t(`pos_${position}`)}</p>

                ${batterRunnerHTML}

                ${runners.first ? `
                    <div class="runner-advancement-row">
                        <label>${i18n.t('first_runner_to')}</label>
                        <select id="firstRunnerAdv">
                            ${advancementOptions.map(opt =>
                                `<option value="${opt.value}"${opt.value === '2B' ? ' selected' : ''}>${opt.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                ` : ''}

                ${runners.second ? `
                    <div class="runner-advancement-row">
                        <label>${i18n.t('second_runner_to')}</label>
                        <select id="secondRunnerAdv">
                            ${advancementOptions.map(opt =>
                                `<option value="${opt.value}"${opt.value === '3B' ? ' selected' : ''}>${opt.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                ` : ''}

                ${runners.third ? `
                    <div class="runner-advancement-row">
                        <label>${i18n.t('third_runner_to')}</label>
                        <select id="thirdRunnerAdv">
                            ${advancementOptions.map(opt =>
                                `<option value="${opt.value}"${opt.value === 'home' ? ' selected' : ''}>${opt.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                ` : ''}

                <div class="modal-actions">
                    <button id="confirmAdvancement" class="primary-btn" data-i18n="confirm">${i18n.t('confirm')}</button>
                    <button id="cancelAdvancement" class="secondary-btn" data-i18n="cancel">${i18n.t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#confirmAdvancement').addEventListener('click', () => {
            // 進塁情報を収集
            const advancement = {
                batterRunner: errorConfig.noBatterRunnerAdvancement ? null : modal.querySelector('#batterRunnerAdv')?.value,
                first: runners.first ? modal.querySelector('#firstRunnerAdv').value : null,
                second: runners.second ? modal.querySelector('#secondRunnerAdv').value : null,
                third: runners.third ? modal.querySelector('#thirdRunnerAdv').value : null
            };

            // 最後のエラーに進塁情報を保存
            this.currentErrors[this.currentErrors.length - 1].advancement = advancement;

            modal.remove();
            this.showSuccess(`${i18n.t(errorConfig.label)} の進塁を記録しました`);
        });

        modal.querySelector('#cancelAdvancement').addEventListener('click', () => {
            // エラーを取り消し
            this.currentErrors.pop();
            this.updateErrorsList();
            modal.remove();
        });
    }

    // ========== 守備妨害（攻撃側の妨害）システム ==========

    showInterferenceTypeModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'interferenceTypeModal';

        const interferenceTypes = BASEBALL_CONFIG.OFFENSIVE_INTERFERENCE_TYPES;

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('interference_type')}</h3>
                <p>妨害の種類を選択してください</p>
                <div class="interference-type-buttons">
                    ${Object.keys(interferenceTypes).map(key => `
                        <button class="interference-type-btn" data-type="${key}">
                            ${i18n.t(interferenceTypes[key].label)}
                        </button>
                    `).join('')}
                </div>
                <button class="secondary-btn" id="cancelInterference">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelectorAll('.interference-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.selectedInterferenceType = type;
                const config = interferenceTypes[type];

                modal.remove();

                // 走者の妨害なら妨害者を選択
                if (config.requiresRunnerSelection) {
                    this.showInterferingRunnerModal(type);
                } else {
                    // 打者走者の妨害なら直接処理
                    this.processInterference(type, null);
                }
            });
        });

        modal.querySelector('#cancelInterference').addEventListener('click', () => {
            modal.remove();
            // 結果選択をリセット
            this.currentResultView = 'top';
            this.selectedCategory = null;
            this.updateResultButtons();
        });
    }

    showInterferingRunnerModal(interferenceType) {
        const runners = gameManager.currentGame.runnersOnBase;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'interferingRunnerModal';

        const runnerOptions = [];
        if (runners.first) runnerOptions.push({ base: 'first', label: i18n.t('firstBase') || '1塁走者' });
        if (runners.second) runnerOptions.push({ base: 'second', label: i18n.t('secondBase') || '2塁走者' });
        if (runners.third) runnerOptions.push({ base: 'third', label: i18n.t('thirdBase') || '3塁走者' });

        if (runnerOptions.length === 0) {
            this.showError('走者がいません');
            return;
        }

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('select_interfering_runner')}</h3>
                <div class="runner-selection">
                    ${runnerOptions.map(r => `
                        <button class="runner-select-btn" data-base="${r.base}">
                            ${r.label}
                        </button>
                    `).join('')}
                </div>
                <button class="secondary-btn" id="cancelRunnerSelection">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelectorAll('.runner-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const runnerBase = btn.dataset.base;
                this.selectedInterferingRunner = runnerBase;
                modal.remove();
                this.processInterference(interferenceType, runnerBase);
            });
        });

        modal.querySelector('#cancelRunnerSelection').addEventListener('click', () => {
            modal.remove();
        });
    }

    async processInterference(interferenceType, interferingRunner) {
        const config = BASEBALL_CONFIG.OFFENSIVE_INTERFERENCE_TYPES[interferenceType];

        console.log(`Processing interference: ${interferenceType}, runner: ${interferingRunner}`);

        // 併殺阻止妨害の特別処理
        if (config.isDoublePlay) {
            await this.processDoublePlayInterference(interferingRunner);
            return;
        }

        // 打者走者の妨害（打者アウト）
        if (config.batterResult === 'out') {
            await this.processBatterRunnerInterference(interferenceType);
            return;
        }

        // 走者の妨害（走者アウト、打者は基本セーフ）
        if (config.runnerOut && interferingRunner) {
            await this.processRunnerInterference(interferenceType, interferingRunner, config);
            return;
        }
    }

    async processDoublePlayInterference(interferingRunner) {
        // 妨害した走者をアウト
        if (interferingRunner) {
            gameManager.currentGame.runnersOnBase[interferingRunner] = null;
            gameManager.currentGame.outs++;
        }

        // 打者走者もアウト（ダブルプレー成立）
        gameManager.currentGame.outs++;

        // 他の走者は元の塁に戻る（ボールデッド）
        await gameManager.saveGame();
        this.updateGameDisplay();

        this.showSuccess('併殺阻止妨害：妨害した走者と打者走者がアウト');

        // 3アウトチェック
        if (gameManager.currentGame.outs >= 3) {
            await gameManager.endHalfInning();
            this.updateCurrentInningDisplay();
            this.loadInningHistory();
        }
    }

    async processBatterRunnerInterference(interferenceType) {
        // 打者走者アウト、打席記録
        gameManager.currentGame.outs++;

        // 打席記録（安打なし、打数カウント）
        const batter = gameManager.getCurrentBatter();
        await gameManager.startAtBat(batter.name, batter.battingOrder);

        await gameManager.recordAtBat({
            result: 'offensive_interference',
            resultDetail: i18n.t(interferenceType),
            runs: 0,
            rbis: 0,
            runnersAfter: gameManager.currentGame.runnersOnBase
        });

        await gameManager.saveGame();
        this.updateGameDisplay();
        this.clearBatterForm();

        this.showSuccess(`${i18n.t(interferenceType)}：打者走者アウト`);

        // 3アウトチェック
        if (gameManager.currentGame.outs >= 3) {
            await gameManager.endHalfInning();
            this.updateCurrentInningDisplay();
            this.loadInningHistory();
        }
    }

    async processRunnerInterference(interferenceType, interferingRunner, config) {
        // 妨害した走者をアウト
        gameManager.currentGame.runnersOnBase[interferingRunner] = null;
        gameManager.currentGame.outs++;

        // 打者は基本的にセーフ
        // ヒット性の打球だったかを判定
        if (config.allowBatterHit) {
            this.showBatterHitJudgmentModal(interferenceType, interferingRunner);
        } else {
            // 野選扱いで1塁へ
            await this.recordInterferenceFieldersChoice(interferenceType, interferingRunner);
        }
    }

    showBatterHitJudgmentModal(interferenceType, interferingRunner) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'batterHitJudgmentModal';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('hit_judgment')}</h3>
                <p>${i18n.t('hit_judgment_question')}</p>
                <div class="judgment-buttons">
                    <button class="primary-btn" id="judgmentHit">${i18n.t('hit_quality_ball')}</button>
                    <button class="secondary-btn" id="judgmentNoHit">${i18n.t('not_hit_quality')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#judgmentHit').addEventListener('click', () => {
            modal.remove();
            // 安打として記録、打球方向選択へ
            this.selectedResult = 'single';
            this.selectedInterferenceContext = { interferenceType, interferingRunner };
            this.showHitDirectionModal('single');
        });

        modal.querySelector('#judgmentNoHit').addEventListener('click', () => {
            modal.remove();
            // 野選として記録
            this.recordInterferenceFieldersChoice(interferenceType, interferingRunner);
        });
    }

    async recordInterferenceFieldersChoice(interferenceType, interferingRunner) {
        const batter = gameManager.getCurrentBatter();
        await gameManager.startAtBat(batter.name, batter.battingOrder);

        // 打者を1塁に
        gameManager.currentGame.runnersOnBase.first = 'batter';

        await gameManager.recordAtBat({
            result: 'fielders_choice',
            resultDetail: `${i18n.t(interferenceType)}（${i18n.t(interferingRunner + 'Base')}走者アウト）`,
            runs: 0,
            rbis: 0,
            runnersAfter: gameManager.currentGame.runnersOnBase
        });

        await gameManager.saveGame();
        this.updateGameDisplay();
        this.clearBatterForm();

        this.showSuccess(`${i18n.t(interferenceType)}：走者アウト、打者は野選出塁`);

        // 3アウトチェック
        if (gameManager.currentGame.outs >= 3) {
            await gameManager.endHalfInning();
            this.updateCurrentInningDisplay();
            this.loadInningHistory();
        }
    }

    // ===== 走塁妨害（守備側の妨害）処理 =====

    showObstructionModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'obstructionModal';

        const runnersOnBase = [];
        const game = gameManager.currentGame;
        const batter = gameManager.getCurrentBatter();

        runnersOnBase.push({
            base: 'batter',
            name: batter?.name || i18n.t('currentBatter') || '打者'
        });

        if (game.runnersOnBase.first) {
            runnersOnBase.push({ base: 'first', name: this.getRunnerDisplayName(game.runnersOnBase.first) });
        }
        if (game.runnersOnBase.second) {
            runnersOnBase.push({ base: 'second', name: this.getRunnerDisplayName(game.runnersOnBase.second) });
        }
        if (game.runnersOnBase.third) {
            runnersOnBase.push({ base: 'third', name: this.getRunnerDisplayName(game.runnersOnBase.third) });
        }

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('obstruction')}</h3>
                <p>${i18n.t('select_obstructed_runner')}</p>
                <div class="runner-selection-buttons">
                    ${runnersOnBase.map(runner => `
                        <button class="runner-btn" data-base="${runner.base}">
                            ${runner.base === 'batter' ? (i18n.t('batterRunner') || '打者走者') : this.getBaseLabel(runner.base)}: ${runner.name}
                        </button>
                    `).join('')}
                </div>
                <button class="secondary-btn" id="cancelObstruction">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 走者選択
        modal.querySelectorAll('.runner-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const base = btn.dataset.base;
                modal.remove();
                this.showObstructingFielderModal(base);
            });
        });

        // キャンセル
        document.getElementById('cancelObstruction').addEventListener('click', () => {
            modal.remove();
            this.currentResultView = 'top';
            this.updateResultButtons();
        });
    }

    getBaseLabel(base) {
        const labels = {
            first: i18n.t('firstBase') || '1塁',
            second: i18n.t('secondBase') || '2塁',
            third: i18n.t('thirdBase') || '3塁'
        };
        return labels[base] || base;
    }

    showObstructingFielderModal(obstructedRunnerBase) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'obstructingFielderModal';

        const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('select_obstructing_fielder')}</h3>
                <div class="position-buttons">
                    ${positions.map(pos => `
                        <button class="position-btn" data-position="${pos}">
                            ${i18n.t('pos_' + pos)}
                        </button>
                    `).join('')}
                </div>
                <button class="secondary-btn" id="cancelFielder">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 野手選択
        modal.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = btn.dataset.position;
                modal.remove();
                this.showObstructionRunnerAwardModal(obstructedRunnerBase, position);
            });
        });

        // キャンセル
        document.getElementById('cancelFielder').addEventListener('click', () => {
            modal.remove();
            this.showObstructionModal();
        });
    }

    showObstructionRunnerAwardModal(obstructedRunnerBase, obstructingFielder) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'runnerAdvancementModal';

        const game = gameManager.currentGame;
        const batter = gameManager.getCurrentBatter();
        const participants = [
            {
                key: 'batter',
                label: i18n.t('batterRunner') || '打者走者',
                name: batter?.name || i18n.t('currentBatter') || '打者',
                currentBase: 0,
                active: true
            },
            {
                key: 'first',
                label: i18n.t('firstBase') || '1塁',
                name: this.getRunnerDisplayName(game.runnersOnBase.first),
                currentBase: 1,
                active: !!game.runnersOnBase.first
            },
            {
                key: 'second',
                label: i18n.t('secondBase') || '2塁',
                name: this.getRunnerDisplayName(game.runnersOnBase.second),
                currentBase: 2,
                active: !!game.runnersOnBase.second
            },
            {
                key: 'third',
                label: i18n.t('thirdBase') || '3塁',
                name: this.getRunnerDisplayName(game.runnersOnBase.third),
                currentBase: 3,
                active: !!game.runnersOnBase.third
            }
        ].filter(item => item.active);

        const baseOptions = [
            { value: 'none', label: i18n.t('notApplicable') || '対象外' },
            { value: 'stay', label: i18n.t('stayOnCurrentBase') || '元の塁' },
            { value: 'first', label: i18n.t('firstBase') || '1塁' },
            { value: 'second', label: i18n.t('secondBase') || '2塁' },
            { value: 'third', label: i18n.t('thirdBase') || '3塁' },
            { value: 'home', label: i18n.t('home') || '本塁' },
            { value: 'out', label: i18n.t('batterOut') || 'アウト' }
        ];

        const getDefaultDestination = (participant) => {
            if (participant.key === obstructedRunnerBase) {
                if (participant.currentBase === 0) return 'first';
                if (participant.currentBase === 1) return 'second';
                if (participant.currentBase === 2) return 'third';
                return 'home';
            }
            if (participant.key === 'batter') return 'none';
            return 'stay';
        };

        const rows = participants.map(participant => `
            <div class="runner-advancement-row">
                <label for="obstructionDest_${participant.key}">
                    ${participant.label}: ${this.escapeHtml(participant.name || '')}
                    ${participant.key === obstructedRunnerBase ? ` <strong>(${i18n.t('obstructed_runner') || '妨害された走者'})</strong>` : ''}
                </label>
                <select id="obstructionDest_${participant.key}" data-runner="${participant.key}">
                    ${baseOptions
                        .filter(option => participant.key !== 'batter' || option.value !== 'stay')
                        .map(option => `<option value="${option.value}" ${option.value === getDefaultDestination(participant) ? 'selected' : ''}>${option.label}</option>`)
                        .join('')}
                </select>
            </div>
        `).join('');

        const defaultAtBatStatus = obstructedRunnerBase === 'batter' ? 'complete' : 'continue';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('runner_advancement_obstruction')}</h3>
                <p>${i18n.t('obstructionAwardHelp') || '審判判断に従い、各走者が妨害がなければ到達していた塁を選択してください。'}</p>
                <div class="input-group">
                    <label for="obstructionBallDeadType">${i18n.t('obstructionBallDeadType') || '判定タイプ'}</label>
                    <select id="obstructionBallDeadType">
                        <option value="immediate">${i18n.t('obstructionImmediateDead') || '即ボールデッド'}</option>
                        <option value="delayed">${i18n.t('obstructionDelayedDead') || 'プレー継続後に補正'}</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="obstructionAtBatStatus">${i18n.t('obstructionRestart') || '再開方法'}</label>
                    <select id="obstructionAtBatStatus">
                        <option value="complete" ${defaultAtBatStatus === 'complete' ? 'selected' : ''}>${i18n.t('restartNextBatter') || '打席完了・次打者へ'}</option>
                        <option value="continue" ${defaultAtBatStatus === 'continue' ? 'selected' : ''}>${i18n.t('restartSameBatter') || '打席継続・同じ打者で再開'}</option>
                    </select>
                </div>
                <div class="runner-advancement-list">
                    ${rows}
                </div>
                <div class="modal-actions">
                    <button class="primary-btn" id="confirmObstructionAdvancement">${i18n.t('confirm') || '確定'}</button>
                    <button class="secondary-btn" id="cancelAdvancement">${i18n.t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('confirmObstructionAdvancement').addEventListener('click', () => {
            const destinations = {};
            modal.querySelectorAll('[data-runner]').forEach(select => {
                destinations[select.dataset.runner] = select.value;
            });
            const ballDeadType = document.getElementById('obstructionBallDeadType').value;
            const atBatStatus = document.getElementById('obstructionAtBatStatus').value;
            if (atBatStatus === 'complete' && (destinations.batter === 'none' || !destinations.batter)) {
                this.showError(i18n.t('obstructionBatterRequiredForNext') || '次打者へ進むには、打者走者がアウトまたは1塁以上に到達している必要があります。');
                return;
            }
            modal.remove();
            this.processObstruction(obstructedRunnerBase, obstructingFielder, {
                destinations,
                ballDeadType,
                atBatStatus
            });
        });

        // キャンセル
        document.getElementById('cancelAdvancement').addEventListener('click', () => {
            modal.remove();
            this.showObstructingFielderModal(obstructedRunnerBase);
        });
    }

    async processObstruction(obstructedRunnerBase, obstructingFielder, obstructionData) {
        const game = gameManager.currentGame;
        const batter = gameManager.getCurrentBatter();

        if (!gameManager.currentAtBat) {
            await gameManager.startAtBat(batter?.id || batter?.name || 'batter', batter?.battingOrder || 1);
        }

        const atBat = gameManager.currentAtBat;
        const originalRunners = {
            first: game.runnersOnBase.first ? { ...game.runnersOnBase.first } : null,
            second: game.runnersOnBase.second ? { ...game.runnersOnBase.second } : null,
            third: game.runnersOnBase.third ? { ...game.runnersOnBase.third } : null
        };
        const originalEarned = { ...(game.runnersEarnedStatus || { first: true, second: true, third: true }) };
        const originalResponsible = { ...(game.runnersResponsiblePitcher || { first: null, second: null, third: null }) };
        const batterRunner = {
            name: batter?.name || `${batter?.battingOrder || ''}`,
            battingOrder: batter?.battingOrder || atBat.battingOrder,
            playerId: batter?.id || batter?.playerId || atBat.playerId
        };
        const participants = {
            batter: {
                runner: batterRunner,
                earned: false,
                responsiblePitcher: gameManager.getCurrentPitcherId?.() || null
            },
            first: {
                runner: originalRunners.first,
                earned: originalEarned.first ?? true,
                responsiblePitcher: originalResponsible.first ?? null
            },
            second: {
                runner: originalRunners.second,
                earned: originalEarned.second ?? true,
                responsiblePitcher: originalResponsible.second ?? null
            },
            third: {
                runner: originalRunners.third,
                earned: originalEarned.third ?? true,
                responsiblePitcher: originalResponsible.third ?? null
            }
        };
        const destinations = obstructionData.destinations || {};

        // 走塁妨害を記録
        atBat.result = 'obstruction';
        atBat.resultDetail = `${i18n.t('obstruction')} - ${obstructedRunnerBase === 'batter' ? (i18n.t('batterRunner') || '打者走者') : this.getBaseLabel(obstructedRunnerBase)} ${i18n.t('obstructed_runner') || '妨害された走者'}`;
        atBat.obstructionDetails = {
            obstructedRunner: obstructedRunnerBase,
            obstructingFielder,
            ballDeadType: obstructionData.ballDeadType,
            atBatStatus: obstructionData.atBatStatus,
            destinations
        };

        // エラーを記録
        atBat.errorPosition = obstructingFielder;

        // 打数にカウントしない
        atBat.isAtBat = false;
        atBat.runs = 0;
        atBat.rbis = 0;

        game.runnersOnBase = { first: null, second: null, third: null };
        game.runnersEarnedStatus = { first: true, second: true, third: true };
        game.runnersResponsiblePitcher = { first: null, second: null, third: null };

        Object.entries(destinations).forEach(([source, destination]) => {
            const participant = participants[source];
            if (!participant?.runner || destination === 'none') return;

            const finalBase = destination === 'stay' ? source : destination;
            if (finalBase === 'home') {
                atBat.runs++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                return;
            }
            if (finalBase === 'out') {
                game.outs++;
                return;
            }
            if (['first', 'second', 'third'].includes(finalBase)) {
                game.runnersOnBase[finalBase] = { ...participant.runner };
                game.runnersEarnedStatus[finalBase] = participant.earned;
                game.runnersResponsiblePitcher[finalBase] = participant.responsiblePitcher;
            }
        });

        atBat.runnersAfterPlay = {
            first: game.runnersOnBase.first ? {...game.runnersOnBase.first} : null,
            second: game.runnersOnBase.second ? {...game.runnersOnBase.second} : null,
            third: game.runnersOnBase.third ? {...game.runnersOnBase.third} : null
        };

        if (obstructionData.atBatStatus === 'continue') {
            if (!Array.isArray(atBat.obstructionEvents)) atBat.obstructionEvents = [];
            atBat.obstructionEvents.push(atBat.obstructionDetails);
            game.balls = 0;
            game.strikes = 0;
            if (game.outs >= 3) {
                game.batterContinuesNextInning = true;
            }
        } else {
            // 打席を完了
            atBat.endTime = new Date().toISOString();
            if (!Array.isArray(gameManager.currentGame.completedAtBats)) {
                gameManager.currentGame.completedAtBats = [];
            }
            gameManager.currentGame.completedAtBats.push(atBat);
            gameManager.currentAtBat = null;
            gameManager.currentGame.currentAtBat = null;

            // 統計更新
            gameManager.updatePlayerStats(atBat);

            // 次の打者へ
            gameManager.advanceBattingOrder();
        }

        // 保存
        await gameManager.saveGame();

        if (obstructionData.atBatStatus === 'continue' && game.outs >= 3) {
            await gameManager.endHalfInning();
            this.updateCurrentInningDisplay();
            this.loadInningHistory();
            this.updateGameDisplay();
            this.showSuccess(`${i18n.t('obstruction')}：${i18n.t('restartSameBatter') || '打席継続・同じ打者で再開'}`);
            return;
        }

        // UI更新
        this.updateGameDisplay();
        this.clearBatterForm();

        this.showSuccess(`${i18n.t('obstruction')}：${i18n.t('pos_' + obstructingFielder) || obstructingFielder}、${obstructionData.atBatStatus === 'continue' ? (i18n.t('restartSameBatter') || '打席継続・同じ打者で再開') : (i18n.t('restartNextBatter') || '打席完了・次打者へ')}`);
    }

    // ===== エラータイプ選択処理 =====

    showErrorTypeModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'errorTypeModal';

        const errorTypes = BASEBALL_CONFIG.ERROR_TYPES;

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('error_type') || 'エラーの種類'}</h3>
                <p>エラーの種類を選択してください</p>
                <div class="error-type-buttons">
                    ${Object.keys(errorTypes).map(key => `
                        <button class="error-type-btn" data-type="${key}">
                            ${i18n.t(errorTypes[key].label)}
                        </button>
                    `).join('')}
                </div>
                <button class="secondary-btn" id="cancelErrorType">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // エラータイプ選択
        modal.querySelectorAll('.error-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const errorType = btn.dataset.type;
                modal.remove();

                // キャッチャー打撃妨害の場合
                if (errorType === 'catchers_interference') {
                    this.processCatchersInterference();
                }
                // 牽制悪送球の場合
                else if (errorType === 'pickoff_throwing_error') {
                    this.showPickoffErrorModal();
                }
                // 野手による走塁妨害の場合
                else if (errorType === 'fielders_obstruction') {
                    this.showObstructionModal();
                }
                // 通常のエラー（捕球・送球・落球）
                else if (errorType === 'fielding_error' || errorType === 'throwing_error' || errorType === 'foul_fly_drop') {
                    this.showRegularErrorModal(errorType);
                }
                // その他のエラー処理
                else {
                    const config = errorTypes[errorType];
                    const label = i18n.t(config?.label) || config?.label || errorType;
                    this.recordUnsupportedPlay(errorType, label, { area: 'error_type' });
                    this.showInfo(i18n.t('unsupportedErrorTypeMessage') || '未対応エラータイプを検出しました。操作ログに記録しました。');
                    this.currentResultView = 'top';
                    this.updateResultButtons();
                }
            });
        });

        // キャンセル
        document.getElementById('cancelErrorType').addEventListener('click', () => {
            modal.remove();
            this.currentResultView = 'top';
            this.updateResultButtons();
        });
    }

    // ===== キャッチャー打撃妨害処理 =====

    async processCatchersInterference() {
        const game = gameManager.currentGame;
        const atBat = game.currentAtBat;

        if (!atBat) {
            this.showError('打席情報がありません');
            return;
        }

        // 打席結果を記録
        atBat.result = 'catchers_interference';
        atBat.resultDetail = i18n.t('catchers_interference');
        atBat.errorPosition = 'C'; // キャッチャー

        // 先に走者状況を保存
        atBat.runnersBeforePlay = {
            first: game.runnersOnBase.first ? {...game.runnersOnBase.first} : null,
            second: game.runnersOnBase.second ? {...game.runnersOnBase.second} : null,
            third: game.runnersOnBase.third ? {...game.runnersOnBase.third} : null
        };

        // 走者を全員1塁進塁（3塁→ホーム、2塁→3塁、1塁→2塁）
        const runs = this.advanceAllRunnersOneBase(game);
        atBat.runs = runs;

        // 打者は1塁へ（走者進塁後に空いた1塁に入る）
        game.runnersOnBase.first = {
            name: game.currentBatter.name,
            battingOrder: game.currentBatter.battingOrder,
            playerId: game.currentBatter.playerId
        };

        atBat.runnersAfterPlay = {
            first: game.runnersOnBase.first ? {...game.runnersOnBase.first} : null,
            second: game.runnersOnBase.second ? {...game.runnersOnBase.second} : null,
            third: game.runnersOnBase.third ? {...game.runnersOnBase.third} : null
        };

        // 打席を完了
        atBat.endTime = new Date().toISOString();
        gameManager.currentGame.completedAtBats.push(atBat);
        gameManager.currentGame.currentAtBat = null;

        // 統計更新
        gameManager.updatePlayerStats(atBat);

        // 次の打者へ
        gameManager.advanceToNextBatter();

        // 保存
        await gameManager.saveGame();

        // UI更新
        this.updateGameDisplay();
        this.clearBatterForm();

        this.showSuccess(`${i18n.t('catchers_interference')}：打者出塁、全走者1塁進塁${runs > 0 ? `、${runs}得点` : ''}`);
    }

    // ===== ボーク処理 =====

    async processBalk() {
        const game = gameManager.currentGame;

        // 走者がいない場合はボークを記録できない
        if (!game.runnersOnBase.first && !game.runnersOnBase.second && !game.runnersOnBase.third) {
            this.showError('走者がいないためボークは記録できません');
            return;
        }

        // 走者を全員1塁進塁
        const runs = this.advanceAllRunnersOneBase(game);

        // 保存
        await gameManager.saveGame();

        // UI更新
        this.updateGameDisplay();

        this.showSuccess(`ボーク：全走者1塁進塁${runs > 0 ? `、${runs}得点` : ''}。打者は打席継続。`);
    }

    // ===== 全走者1塁進塁処理（共通関数） =====

    advanceAllRunnersOneBase(game) {
        let runs = 0;

        // 3塁走者 → ホーム
        if (game.runnersOnBase.third) {
            runs++;
            if (game.isTopHalf) {
                game.awayScore++;
            } else {
                game.homeScore++;
            }
            game.runnersOnBase.third = null;
        }

        // 2塁走者 → 3塁
        if (game.runnersOnBase.second) {
            game.runnersOnBase.third = game.runnersOnBase.second;
            game.runnersOnBase.second = null;
        }

        // 1塁走者 → 2塁
        if (game.runnersOnBase.first) {
            game.runnersOnBase.second = game.runnersOnBase.first;
            game.runnersOnBase.first = null;
        }

        return runs;
    }

    // ===== 盗塁処理 =====

    showStealModal() {
        const game = gameManager.currentGame;

        // 走者がいない場合
        if (!game.runnersOnBase.first && !game.runnersOnBase.second && !game.runnersOnBase.third) {
            this.showError('走者がいないため盗塁は記録できません');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'stealModal';

        const runners = [];
        if (game.runnersOnBase.first) runners.push({ base: 'first', name: this.getRunnerDisplayName(game.runnersOnBase.first) });
        if (game.runnersOnBase.second) runners.push({ base: 'second', name: this.getRunnerDisplayName(game.runnersOnBase.second) });
        if (game.runnersOnBase.third) runners.push({ base: 'third', name: this.getRunnerDisplayName(game.runnersOnBase.third) });

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('steal_category')}</h3>
                <p>盗塁した走者を選択してください</p>
                <div class="runner-selection-buttons">
                    ${runners.map(runner => `
                        <button class="runner-btn" data-base="${runner.base}">
                            ${this.getBaseLabel(runner.base)}: ${runner.name}
                        </button>
                    `).join('')}
                </div>
                <button class="secondary-btn" id="cancelSteal">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 走者選択
        modal.querySelectorAll('.runner-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const base = btn.dataset.base;
                modal.remove();
                this.showStealResultModal(base);
            });
        });

        // キャンセル
        document.getElementById('cancelSteal').addEventListener('click', () => {
            modal.remove();
        });
    }

    showStealResultModal(fromBase) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'stealResultModal';

        // 盗塁先を決定
        const toBase = fromBase === 'first' ? '2塁' : fromBase === 'second' ? '3塁' : 'ホーム';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>盗塁の結果</h3>
                <p>${this.getBaseLabel(fromBase)}走者 → ${toBase}</p>
                <div class="steal-result-buttons">
                    <button class="steal-result-btn success-btn" data-result="success">
                        ${i18n.t('steal_success')}
                    </button>
                    <button class="steal-result-btn failure-btn" data-result="failure">
                        ${i18n.t('steal_failure')}（盗塁死）
                    </button>
                </div>
                <button class="secondary-btn" id="cancelStealResult">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 結果選択
        modal.querySelectorAll('.steal-result-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const result = btn.dataset.result;
                modal.remove();
                this.processSteal(fromBase, result === 'success');
            });
        });

        // キャンセル
        document.getElementById('cancelStealResult').addEventListener('click', () => {
            modal.remove();
            this.showStealModal();
        });
    }

    async processSteal(fromBase, success) {
        const game = gameManager.currentGame;
        const runner = game.runnersOnBase[fromBase];

        if (!runner) {
            this.showError('走者情報が見つかりません');
            return;
        }

        if (success) {
            // 盗塁成功 - エラーで追加進塁の可能性を確認
            const normalBase = fromBase === 'first' ? 'second' : fromBase === 'second' ? 'third' : 'home';
            this.showStealErrorModal(fromBase, runner, normalBase);

        } else {
            // 盗塁失敗（盗塁死）
            game.runnersOnBase[fromBase] = null;
            game.outs++;

            await gameManager.saveGame();
            this.updateGameDisplay();
            this.showSuccess(`盗塁死：${this.getBaseLabel(fromBase)}走者アウト（${game.outs}アウト）`);

            // 3アウトチェック
            if (game.outs >= 3) {
                await gameManager.endHalfInning();
                this.updateCurrentInningDisplay();
                this.loadInningHistory();
            }
        }
    }

    // ===== 牽制処理 =====

    showStealErrorModal(fromBase, runner, normalBase) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'stealErrorModal';

        const normalBaseName = normalBase === 'second' ? '2塁' : normalBase === 'third' ? '3塁' : 'ホーム';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>盗塁成功 - エラーで追加進塁？</h3>
                <p>${this.getBaseLabel(fromBase)}走者 → ${normalBaseName}</p>
                <div class="steal-error-buttons">
                    <button class="btn btn-primary" id="noErrorBtn">
                        エラーなし（${normalBaseName}で止まる）
                    </button>
                    <button class="btn btn-warning" id="withErrorBtn">
                        エラーあり（さらに進塁）
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // エラーなしボタン
        document.getElementById('noErrorBtn').addEventListener('click', () => {
            modal.remove();
            this.completeStealSuccess(fromBase, runner, normalBase, false, null, null);
        });

        // エラーありボタン
        document.getElementById('withErrorBtn').addEventListener('click', () => {
            modal.remove();
            this.showStealErrorPositionModal(fromBase, runner, normalBase);
        });
    }

    showStealErrorPositionModal(fromBase, runner, normalBase) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'stealErrorPositionModal';
        const positions = BASEBALL_CONFIG.POSITIONS;

        modal.innerHTML = `
            <div class="modal-content">
                <h3>盗塁時のエラー - 守備位置選択</h3>
                <p>エラーを記録する守備位置を選択してください</p>
                <div class="position-buttons">
                    ${Object.keys(positions).map(key => `
                        <button class="position-btn" data-position="${key}">
                            ${i18n.t(positions[key].label)}
                        </button>
                    `).join('')}
                </div>
                <button class="secondary-btn" id="cancelStealErrorPosition">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 守備位置選択
        modal.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = btn.dataset.position;
                modal.remove();
                this.showStealErrorFinalBaseModal(fromBase, runner, normalBase, position);
            });
        });

        // キャンセル
        document.getElementById('cancelStealErrorPosition').addEventListener('click', () => {
            modal.remove();
            this.showStealErrorModal(fromBase, runner, normalBase);
        });
    }

    showStealErrorFinalBaseModal(fromBase, runner, normalBase, errorPosition) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'stealErrorFinalBaseModal';

        // 可能な進塁先を決定
        const possibleBases = [];
        if (normalBase === 'second') {
            possibleBases.push({ value: 'third', label: '3塁' });
            possibleBases.push({ value: 'home', label: 'ホーム' });
        } else if (normalBase === 'third') {
            possibleBases.push({ value: 'home', label: 'ホーム' });
        }

        if (possibleBases.length === 0) {
            // ホームスチール成功の場合はエラーでの追加進塁はない
            this.completeStealSuccess(fromBase, runner, normalBase, false, null, null);
            return;
        }

        modal.innerHTML = `
            <div class="modal-content">
                <h3>盗塁 + エラー - 最終進塁先</h3>
                <p>走者の最終的な進塁先を選択してください</p>
                <div class="final-base-buttons">
                    ${possibleBases.map(base => `
                        <button class="btn btn-primary" data-base="${base.value}">
                            ${base.label}
                        </button>
                    `).join('')}
                </div>
                <button class="secondary-btn" id="cancelStealErrorFinalBase">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 最終進塁先選択
        modal.querySelectorAll('.final-base-buttons button').forEach(btn => {
            btn.addEventListener('click', () => {
                const finalBase = btn.dataset.base;
                modal.remove();
                this.completeStealSuccess(fromBase, runner, normalBase, true, errorPosition, finalBase);
            });
        });

        // キャンセル
        document.getElementById('cancelStealErrorFinalBase').addEventListener('click', () => {
            modal.remove();
            this.showStealErrorPositionModal(fromBase, runner, normalBase);
        });
    }

    async completeStealSuccess(fromBase, runner, normalBase, hasError, errorPosition, finalBase) {
        const game = gameManager.currentGame;
        let runs = 0;

        // 元の塁から走者を削除
        game.runnersOnBase[fromBase] = null;

        // エラーがない場合は通常の進塁
        if (!hasError) {
            if (normalBase === 'second') {
                game.runnersOnBase.second = runner;
            } else if (normalBase === 'third') {
                game.runnersOnBase.third = runner;
            } else if (normalBase === 'home') {
                runs++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
            }

            await gameManager.saveGame();
            this.updateGameDisplay();
            this.showSuccess(`盗塁成功：${this.getBaseLabel(fromBase)}走者が進塁`);
        }
        // エラーがある場合
        else {
            if (finalBase === 'second') {
                game.runnersOnBase.second = runner;
            } else if (finalBase === 'third') {
                game.runnersOnBase.third = runner;
            } else if (finalBase === 'home') {
                runs++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
            }

            // エラー記録を保存（チーム統計に反映）
            if (game.isTopHalf) {
                game.teamStats.home.errors++;
            } else {
                game.teamStats.away.errors++;
            }

            await gameManager.saveGame();
            this.updateGameDisplay();

            const positionName = i18n.t(BASEBALL_CONFIG.POSITIONS[errorPosition].label);
            const normalBaseName = normalBase === 'second' ? '2塁' : normalBase === 'third' ? '3塁' : 'ホーム';
            const finalBaseName = finalBase === 'second' ? '2塁' : finalBase === 'third' ? '3塁' : 'ホーム';
            this.showSuccess(`盗塁成功 + エラー（${positionName}）：${this.getBaseLabel(fromBase)}走者 ${normalBaseName} → ${finalBaseName}${runs > 0 ? '、得点' : ''}`);
        }
    }

    showPickoffModal() {
        const game = gameManager.currentGame;

        // 走者がいない場合
        if (!game.runnersOnBase.first && !game.runnersOnBase.second && !game.runnersOnBase.third) {
            this.showError('走者がいないため牽制は記録できません');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'pickoffModal';

        const runners = [];
        if (game.runnersOnBase.first) runners.push({ base: 'first', name: this.getRunnerDisplayName(game.runnersOnBase.first) });
        if (game.runnersOnBase.second) runners.push({ base: 'second', name: this.getRunnerDisplayName(game.runnersOnBase.second) });
        if (game.runnersOnBase.third) runners.push({ base: 'third', name: this.getRunnerDisplayName(game.runnersOnBase.third) });

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('pickoff_category')}</h3>
                <p>牽制された走者を選択してください</p>
                <div class="runner-selection-buttons">
                    ${runners.map(runner => `
                        <button class="runner-btn" data-base="${runner.base}">
                            ${this.getBaseLabel(runner.base)}: ${runner.name}
                        </button>
                    `).join('')}
                </div>
                <button class="secondary-btn" id="cancelPickoff">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 走者選択
        modal.querySelectorAll('.runner-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const base = btn.dataset.base;
                modal.remove();
                this.showPickoffResultModal(base);
            });
        });

        // キャンセル
        document.getElementById('cancelPickoff').addEventListener('click', () => {
            modal.remove();
        });
    }

    showPickoffResultModal(base) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'pickoffResultModal';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>牽制の結果</h3>
                <p>${this.getBaseLabel(base)}走者への牽制</p>
                <div class="pickoff-result-buttons">
                    <button class="pickoff-result-btn safe-btn" data-result="safe">
                        ${i18n.t('pickoff_safe')}（セーフ）
                    </button>
                    <button class="pickoff-result-btn out-btn" data-result="out">
                        ${i18n.t('pickoff_out')}（アウト）
                    </button>
                </div>
                <button class="secondary-btn" id="cancelPickoffResult">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 結果選択
        modal.querySelectorAll('.pickoff-result-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const result = btn.dataset.result;
                modal.remove();
                this.processPickoff(base, result === 'safe');
            });
        });

        // キャンセル
        document.getElementById('cancelPickoffResult').addEventListener('click', () => {
            modal.remove();
            this.showPickoffModal();
        });
    }

    async processPickoff(base, safe) {
        const game = gameManager.currentGame;
        const runner = game.runnersOnBase[base];

        if (safe) {
            // 牽制セーフ - エラーで追加進塁の可能性を確認
            this.showPickoffSafeErrorModal(base, runner);

        } else {
            // 牽制死
            game.runnersOnBase[base] = null;
            game.outs++;

            await gameManager.saveGame();
            this.updateGameDisplay();
            this.showSuccess(`牽制死：${this.getBaseLabel(base)}走者アウト（${game.outs}アウト）`);

            // 3アウトチェック
            if (game.outs >= 3) {
                await gameManager.endHalfInning();
                this.updateCurrentInningDisplay();
                this.loadInningHistory();
            }
        }
    }

    showPickoffSafeErrorModal(base, runner) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'pickoffSafeErrorModal';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>牽制セーフ - エラーで追加進塁？</h3>
                <p>${this.getBaseLabel(base)}走者</p>
                <div class="pickoff-error-buttons">
                    <button class="btn btn-primary" id="noPickoffErrorBtn">
                        エラーなし（${this.getBaseLabel(base)}に留まる）
                    </button>
                    <button class="btn btn-warning" id="withPickoffErrorBtn">
                        エラーあり（さらに進塁）
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // エラーなしボタン
        document.getElementById('noPickoffErrorBtn').addEventListener('click', async () => {
            modal.remove();
            await gameManager.saveGame();
            this.updateGameDisplay();
            this.showSuccess(`牽制セーフ：${this.getBaseLabel(base)}走者`);
        });

        // エラーありボタン
        document.getElementById('withPickoffErrorBtn').addEventListener('click', () => {
            modal.remove();
            this.showPickoffSafeErrorPositionModal(base, runner);
        });
    }

    showPickoffSafeErrorPositionModal(base, runner) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'pickoffSafeErrorPositionModal';
        const positions = BASEBALL_CONFIG.POSITIONS;

        modal.innerHTML = `
            <div class="modal-content">
                <h3>牽制セーフ時のエラー - 守備位置選択</h3>
                <p>エラーを記録する守備位置を選択してください</p>
                <div class="position-buttons">
                    ${Object.keys(positions).map(key => `
                        <button class="position-btn" data-position="${key}">
                            ${i18n.t(positions[key].label)}
                        </button>
                    `).join('')}
                </div>
                <button class="secondary-btn" id="cancelPickoffSafeErrorPosition">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 守備位置選択
        modal.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = btn.dataset.position;
                modal.remove();
                this.showPickoffSafeErrorFinalBaseModal(base, runner, position);
            });
        });

        // キャンセル
        document.getElementById('cancelPickoffSafeErrorPosition').addEventListener('click', () => {
            modal.remove();
            this.showPickoffSafeErrorModal(base, runner);
        });
    }

    showPickoffSafeErrorFinalBaseModal(base, runner, errorPosition) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'pickoffSafeErrorFinalBaseModal';

        // 可能な進塁先を決定
        const possibleBases = [];
        if (base === 'first') {
            possibleBases.push({ value: 'second', label: '2塁' });
            possibleBases.push({ value: 'third', label: '3塁' });
            possibleBases.push({ value: 'home', label: 'ホーム' });
        } else if (base === 'second') {
            possibleBases.push({ value: 'third', label: '3塁' });
            possibleBases.push({ value: 'home', label: 'ホーム' });
        } else if (base === 'third') {
            possibleBases.push({ value: 'home', label: 'ホーム' });
        }

        modal.innerHTML = `
            <div class="modal-content">
                <h3>牽制セーフ + エラー - 最終進塁先</h3>
                <p>走者の最終的な進塁先を選択してください</p>
                <div class="final-base-buttons">
                    ${possibleBases.map(b => `
                        <button class="btn btn-primary" data-base="${b.value}">
                            ${b.label}
                        </button>
                    `).join('')}
                </div>
                <button class="secondary-btn" id="cancelPickoffSafeErrorFinalBase">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 最終進塁先選択
        modal.querySelectorAll('.final-base-buttons button').forEach(btn => {
            btn.addEventListener('click', () => {
                const finalBase = btn.dataset.base;
                modal.remove();
                this.completePickoffSafeWithError(base, runner, errorPosition, finalBase);
            });
        });

        // キャンセル
        document.getElementById('cancelPickoffSafeErrorFinalBase').addEventListener('click', () => {
            modal.remove();
            this.showPickoffSafeErrorPositionModal(base, runner);
        });
    }

    async completePickoffSafeWithError(fromBase, runner, errorPosition, finalBase) {
        const game = gameManager.currentGame;
        let runs = 0;
        let earnedRuns = 0;
        const virtualOuts = (gameManager.currentInning && gameManager.currentInning.virtualOuts) || 0;

        // 元の塁から走者を削除
        game.runnersOnBase[fromBase] = null;

        // 最終進塁先に配置
        if (finalBase === 'second') {
            game.runnersOnBase.second = runner;
            gameManager.moveRunnerEarnedStatus(fromBase, 'second');
            gameManager.moveRunnerResponsiblePitcher(fromBase, 'second');
        } else if (finalBase === 'third') {
            game.runnersOnBase.third = runner;
            gameManager.moveRunnerEarnedStatus(fromBase, 'third');
            gameManager.moveRunnerResponsiblePitcher(fromBase, 'third');
        } else if (finalBase === 'home') {
            runs++;
            const wasEarned = gameManager.moveRunnerEarnedStatus(fromBase, null);
            gameManager.moveRunnerResponsiblePitcher(fromBase, null);
            if (wasEarned && virtualOuts < 3) earnedRuns++;
            if (game.isTopHalf) {
                game.awayScore++;
            } else {
                game.homeScore++;
            }
        }

        // 牽制悪送球による得点は、責任走者の状態に応じて自責点にも反映する
        if (runs > 0 && gameManager.currentInning) {
            gameManager.currentInning.runs = (gameManager.currentInning.runs || 0) + runs;
            gameManager.currentInning.earnedRuns = Math.min(
                gameManager.currentInning.runs,
                (gameManager.currentInning.earnedRuns || 0) + earnedRuns
            );
        }
        gameManager.addError();

        await gameManager.saveGame();
        this.updateGameDisplay();

        const positionName = i18n.t(BASEBALL_CONFIG.POSITIONS[errorPosition].label);
        const finalBaseName = finalBase === 'second' ? '2塁' : finalBase === 'third' ? '3塁' : 'ホーム';
        this.showSuccess(`牽制セーフ + エラー（${positionName}）：${this.getBaseLabel(fromBase)}走者 → ${finalBaseName}${runs > 0 ? '、得点' : ''}`);
    }

    // ===== 暴投・捕逸・牽制悪送球の実装 =====

    showWildPitchModal() {
        const game = gameManager.currentGame;

        // 走者がいない場合は記録できない
        if (!game.runnersOnBase.first && !game.runnersOnBase.second && !game.runnersOnBase.third) {
            this.showError('走者がいないため暴投は記録できません');
            return;
        }

        const modal = document.getElementById('modal');
        const modalContent = modal.querySelector('.modal-content');

        // 走者リストを作成
        const runnersHTML = [];
        if (game.runnersOnBase.third) {
            runnersHTML.push(`
                <div class="runner-advancement-group">
                    <span class="runner-label">${i18n.t('third_base')}走者:</span>
                    <button class="advancement-btn" data-from="third" data-to="home">
                        ${i18n.t('home')}
                    </button>
                    <button class="advancement-btn" data-from="third" data-to="stay">
                        進塁なし
                    </button>
                </div>
            `);
        }
        if (game.runnersOnBase.second) {
            runnersHTML.push(`
                <div class="runner-advancement-group">
                    <span class="runner-label">${i18n.t('second_base')}走者:</span>
                    <button class="advancement-btn" data-from="second" data-to="third">
                        ${i18n.t('third_base')}
                    </button>
                    <button class="advancement-btn" data-from="second" data-to="home">
                        ${i18n.t('home')}
                    </button>
                    <button class="advancement-btn" data-from="second" data-to="stay">
                        進塁なし
                    </button>
                </div>
            `);
        }
        if (game.runnersOnBase.first) {
            runnersHTML.push(`
                <div class="runner-advancement-group">
                    <span class="runner-label">${i18n.t('first_base')}走者:</span>
                    <button class="advancement-btn" data-from="first" data-to="second">
                        ${i18n.t('second_base')}
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="third">
                        ${i18n.t('third_base')}
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="home">
                        ${i18n.t('home')}
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="stay">
                        進塁なし
                    </button>
                </div>
            `);
        }

        modalContent.innerHTML = `
            <h3>暴投</h3>
            <p>各走者の進塁先を選択してください</p>
            <div class="runner-advancement-container">
                ${runnersHTML.join('')}
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelWildPitchBtn">キャンセル</button>
                <button class="btn btn-primary" id="confirmWildPitchBtn">確定</button>
            </div>
        `;

        modal.style.display = 'block';

        // 走者の進塁先を記録するオブジェクト
        const advancements = {};

        // 進塁ボタンのイベント処理
        modalContent.querySelectorAll('.advancement-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const from = btn.getAttribute('data-from');
                const to = btn.getAttribute('data-to');

                // 同じグループのボタンのアクティブ状態を解除
                btn.closest('.runner-advancement-group')
                    .querySelectorAll('.advancement-btn')
                    .forEach(b => b.classList.remove('active'));

                btn.classList.add('active');
                advancements[from] = to;
            });
        });

        // キャンセルボタン
        document.getElementById('cancelWildPitchBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // 確定ボタン
        document.getElementById('confirmWildPitchBtn').addEventListener('click', async () => {
            // 全走者の進塁先が選択されているかチェック
            const expectedRunners = [];
            if (game.runnersOnBase.first) expectedRunners.push('first');
            if (game.runnersOnBase.second) expectedRunners.push('second');
            if (game.runnersOnBase.third) expectedRunners.push('third');

            const allSelected = expectedRunners.every(base => advancements[base]);
            if (!allSelected) {
                this.showError('全走者の進塁先を選択してください');
                return;
            }

            modal.style.display = 'none';
            await this.processWildPitch(advancements);
        });
    }

    async processWildPitch(advancements) {
        const game = gameManager.currentGame;
        let runs = 0;
        let earnedRuns = 0;
        const messages = [];
        const virtualOuts = (gameManager.currentInning && gameManager.currentInning.virtualOuts) || 0;

        // 3塁走者から処理
        if (advancements.third) {
            if (advancements.third === 'home') {
                runs++;
                const wasEarned = gameManager.moveRunnerEarnedStatus('third', null);
                gameManager.moveRunnerResponsiblePitcher('third', null);
                if (wasEarned && virtualOuts < 3) earnedRuns++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                game.runnersOnBase.third = null;
                messages.push('3塁走者ホーム');
            }
        }

        // 2塁走者
        if (advancements.second) {
            if (advancements.second === 'third') {
                game.runnersOnBase.third = game.runnersOnBase.second;
                game.runnersOnBase.second = null;
                gameManager.moveRunnerEarnedStatus('second', 'third');
                gameManager.moveRunnerResponsiblePitcher('second', 'third');
                messages.push('2塁走者3塁へ');
            } else if (advancements.second === 'home') {
                runs++;
                const wasEarned = gameManager.moveRunnerEarnedStatus('second', null);
                gameManager.moveRunnerResponsiblePitcher('second', null);
                if (wasEarned && virtualOuts < 3) earnedRuns++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                game.runnersOnBase.second = null;
                messages.push('2塁走者ホーム');
            }
        }

        // 1塁走者
        if (advancements.first) {
            if (advancements.first === 'second') {
                game.runnersOnBase.second = game.runnersOnBase.first;
                game.runnersOnBase.first = null;
                gameManager.moveRunnerEarnedStatus('first', 'second');
                gameManager.moveRunnerResponsiblePitcher('first', 'second');
                messages.push('1塁走者2塁へ');
            } else if (advancements.first === 'third') {
                game.runnersOnBase.third = game.runnersOnBase.first;
                game.runnersOnBase.first = null;
                gameManager.moveRunnerEarnedStatus('first', 'third');
                gameManager.moveRunnerResponsiblePitcher('first', 'third');
                messages.push('1塁走者3塁へ');
            } else if (advancements.first === 'home') {
                runs++;
                const wasEarned = gameManager.moveRunnerEarnedStatus('first', null);
                gameManager.moveRunnerResponsiblePitcher('first', null);
                if (wasEarned && virtualOuts < 3) earnedRuns++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                game.runnersOnBase.first = null;
                messages.push('1塁走者ホーム');
            }
        }

        // 暴投による得点をイニング自責点に反映
        if (runs > 0 && gameManager.currentInning) {
            gameManager.currentInning.runs = (gameManager.currentInning.runs || 0) + runs;
            gameManager.currentInning.earnedRuns = Math.min(
                gameManager.currentInning.runs,
                (gameManager.currentInning.earnedRuns || 0) + earnedRuns
            );
        }

        await gameManager.saveGame();
        this.updateGameDisplay();

        const message = `暴投：${messages.join('、')}${runs > 0 ? `、${runs}得点` : ''}。打者は打席継続。`;
        this.showSuccess(message);
    }

    showPassedBallModal() {
        const game = gameManager.currentGame;

        // 走者がいない場合は記録できない
        if (!game.runnersOnBase.first && !game.runnersOnBase.second && !game.runnersOnBase.third) {
            this.showError('走者がいないため捕逸は記録できません');
            return;
        }

        const modal = document.getElementById('modal');
        const modalContent = modal.querySelector('.modal-content');

        // 走者リストを作成
        const runnersHTML = [];
        if (game.runnersOnBase.third) {
            runnersHTML.push(`
                <div class="runner-advancement-group">
                    <span class="runner-label">${i18n.t('third_base')}走者:</span>
                    <button class="advancement-btn" data-from="third" data-to="home">
                        ${i18n.t('home')}
                    </button>
                    <button class="advancement-btn" data-from="third" data-to="stay">
                        進塁なし
                    </button>
                </div>
            `);
        }
        if (game.runnersOnBase.second) {
            runnersHTML.push(`
                <div class="runner-advancement-group">
                    <span class="runner-label">${i18n.t('second_base')}走者:</span>
                    <button class="advancement-btn" data-from="second" data-to="third">
                        ${i18n.t('third_base')}
                    </button>
                    <button class="advancement-btn" data-from="second" data-to="home">
                        ${i18n.t('home')}
                    </button>
                    <button class="advancement-btn" data-from="second" data-to="stay">
                        進塁なし
                    </button>
                </div>
            `);
        }
        if (game.runnersOnBase.first) {
            runnersHTML.push(`
                <div class="runner-advancement-group">
                    <span class="runner-label">${i18n.t('first_base')}走者:</span>
                    <button class="advancement-btn" data-from="first" data-to="second">
                        ${i18n.t('second_base')}
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="third">
                        ${i18n.t('third_base')}
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="home">
                        ${i18n.t('home')}
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="stay">
                        進塁なし
                    </button>
                </div>
            `);
        }

        modalContent.innerHTML = `
            <h3>捕逸</h3>
            <p>各走者の進塁先を選択してください</p>
            <div class="runner-advancement-container">
                ${runnersHTML.join('')}
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelPassedBallBtn">キャンセル</button>
                <button class="btn btn-primary" id="confirmPassedBallBtn">確定</button>
            </div>
        `;

        modal.style.display = 'block';

        // 走者の進塁先を記録するオブジェクト
        const advancements = {};

        // 進塁ボタンのイベント処理
        modalContent.querySelectorAll('.advancement-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const from = btn.getAttribute('data-from');
                const to = btn.getAttribute('data-to');

                // 同じグループのボタンのアクティブ状態を解除
                btn.closest('.runner-advancement-group')
                    .querySelectorAll('.advancement-btn')
                    .forEach(b => b.classList.remove('active'));

                btn.classList.add('active');
                advancements[from] = to;
            });
        });

        // キャンセルボタン
        document.getElementById('cancelPassedBallBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // 確定ボタン
        document.getElementById('confirmPassedBallBtn').addEventListener('click', async () => {
            // 全走者の進塁先が選択されているかチェック
            const expectedRunners = [];
            if (game.runnersOnBase.first) expectedRunners.push('first');
            if (game.runnersOnBase.second) expectedRunners.push('second');
            if (game.runnersOnBase.third) expectedRunners.push('third');

            const allSelected = expectedRunners.every(base => advancements[base]);
            if (!allSelected) {
                this.showError('全走者の進塁先を選択してください');
                return;
            }

            modal.style.display = 'none';
            await this.processPassedBall(advancements);
        });
    }

    async processPassedBall(advancements) {
        const game = gameManager.currentGame;
        let runs = 0;
        const messages = [];

        // 3塁走者から処理
        if (advancements.third) {
            if (advancements.third === 'home') {
                runs++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                // 捕逸による得点は非自責点のため earned status を移動するだけ（earnedRuns加算なし）
                gameManager.moveRunnerEarnedStatus('third', null);
                gameManager.moveRunnerResponsiblePitcher('third', null);
                game.runnersOnBase.third = null;
                messages.push('3塁走者ホーム');
            }
        }

        // 2塁走者
        if (advancements.second) {
            if (advancements.second === 'third') {
                game.runnersOnBase.third = game.runnersOnBase.second;
                game.runnersOnBase.second = null;
                gameManager.moveRunnerEarnedStatus('second', 'third');
                gameManager.moveRunnerResponsiblePitcher('second', 'third');
                messages.push('2塁走者3塁へ');
            } else if (advancements.second === 'home') {
                runs++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                gameManager.moveRunnerEarnedStatus('second', null);
                gameManager.moveRunnerResponsiblePitcher('second', null);
                game.runnersOnBase.second = null;
                messages.push('2塁走者ホーム');
            }
        }

        // 1塁走者
        if (advancements.first) {
            if (advancements.first === 'second') {
                game.runnersOnBase.second = game.runnersOnBase.first;
                game.runnersOnBase.first = null;
                gameManager.moveRunnerEarnedStatus('first', 'second');
                gameManager.moveRunnerResponsiblePitcher('first', 'second');
                messages.push('1塁走者2塁へ');
            } else if (advancements.first === 'third') {
                game.runnersOnBase.third = game.runnersOnBase.first;
                game.runnersOnBase.first = null;
                gameManager.moveRunnerEarnedStatus('first', 'third');
                gameManager.moveRunnerResponsiblePitcher('first', 'third');
                messages.push('1塁走者3塁へ');
            } else if (advancements.first === 'home') {
                runs++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                gameManager.moveRunnerEarnedStatus('first', null);
                gameManager.moveRunnerResponsiblePitcher('first', null);
                game.runnersOnBase.first = null;
                messages.push('1塁走者ホーム');
            }
        }

        // 捕逸による得点はイニング失点に計上するが自責点には加算しない
        if (runs > 0 && gameManager.currentInning) {
            gameManager.currentInning.runs = (gameManager.currentInning.runs || 0) + runs;
            // earnedRuns は加算しない（捕逸は非自責点）
        }

        await gameManager.saveGame();
        this.updateGameDisplay();

        const message = `捕逸：${messages.join('、')}${runs > 0 ? `、${runs}得点` : ''}。打者は打席継続。`;
        this.showSuccess(message);
    }

    showPickoffErrorModal() {
        const game = gameManager.currentGame;

        // 走者がいない場合は記録できない
        if (!game.runnersOnBase.first && !game.runnersOnBase.second && !game.runnersOnBase.third) {
            this.showError('走者がいないため牽制悪送球は記録できません');
            return;
        }

        // まずエラー野手を選択
        this.showPickoffErrorPositionModal();
    }

    showPickoffErrorPositionModal() {
        const modal = document.getElementById('modal');
        const modalContent = modal.querySelector('.modal-content');
        const positions = BASEBALL_CONFIG.POSITIONS;

        modalContent.innerHTML = `
            <h3>牽制悪送球 - 守備位置選択</h3>
            <p>エラーを記録する守備位置を選択してください</p>
            <div class="position-buttons">
                ${Object.keys(positions).map(key => `
                    <button class="position-btn" data-position="${key}">
                        ${i18n.t(positions[key].label)}
                    </button>
                `).join('')}
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelPickoffErrorPositionBtn">キャンセル</button>
            </div>
        `;

        modal.style.display = 'block';

        // 守備位置選択
        modalContent.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = btn.getAttribute('data-position');
                modal.style.display = 'none';

                // 走者進塁先選択へ
                this.showPickoffErrorAdvancementModal(position);
            });
        });

        // キャンセルボタン
        document.getElementById('cancelPickoffErrorPositionBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    showPickoffErrorAdvancementModal(position) {
        const game = gameManager.currentGame;
        const modal = document.getElementById('modal');
        const modalContent = modal.querySelector('.modal-content');

        // 走者リストを作成
        const runnersHTML = [];
        if (game.runnersOnBase.third) {
            runnersHTML.push(`
                <div class="runner-advancement-group">
                    <span class="runner-label">${i18n.t('third_base')}走者:</span>
                    <button class="advancement-btn" data-from="third" data-to="home">
                        ${i18n.t('home')}
                    </button>
                    <button class="advancement-btn" data-from="third" data-to="stay">
                        進塁なし
                    </button>
                </div>
            `);
        }
        if (game.runnersOnBase.second) {
            runnersHTML.push(`
                <div class="runner-advancement-group">
                    <span class="runner-label">${i18n.t('second_base')}走者:</span>
                    <button class="advancement-btn" data-from="second" data-to="third">
                        ${i18n.t('third_base')}
                    </button>
                    <button class="advancement-btn" data-from="second" data-to="home">
                        ${i18n.t('home')}
                    </button>
                    <button class="advancement-btn" data-from="second" data-to="stay">
                        進塁なし
                    </button>
                </div>
            `);
        }
        if (game.runnersOnBase.first) {
            runnersHTML.push(`
                <div class="runner-advancement-group">
                    <span class="runner-label">${i18n.t('first_base')}走者:</span>
                    <button class="advancement-btn" data-from="first" data-to="second">
                        ${i18n.t('second_base')}
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="third">
                        ${i18n.t('third_base')}
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="home">
                        ${i18n.t('home')}
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="stay">
                        進塁なし
                    </button>
                </div>
            `);
        }

        modalContent.innerHTML = `
            <h3>牽制悪送球</h3>
            <p>各走者の進塁先を選択してください</p>
            <div class="runner-advancement-container">
                ${runnersHTML.join('')}
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelPickoffErrorBtn">キャンセル</button>
                <button class="btn btn-primary" id="confirmPickoffErrorBtn">確定</button>
            </div>
        `;

        modal.style.display = 'block';

        // 走者の進塁先を記録するオブジェクト
        const advancements = {};

        // 進塁ボタンのイベント処理
        modalContent.querySelectorAll('.advancement-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const from = btn.getAttribute('data-from');
                const to = btn.getAttribute('data-to');

                // 同じグループのボタンのアクティブ状態を解除
                btn.closest('.runner-advancement-group')
                    .querySelectorAll('.advancement-btn')
                    .forEach(b => b.classList.remove('active'));

                btn.classList.add('active');
                advancements[from] = to;
            });
        });

        // キャンセルボタン
        document.getElementById('cancelPickoffErrorBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // 確定ボタン
        document.getElementById('confirmPickoffErrorBtn').addEventListener('click', async () => {
            // 全走者の進塁先が選択されているかチェック
            const expectedRunners = [];
            if (game.runnersOnBase.first) expectedRunners.push('first');
            if (game.runnersOnBase.second) expectedRunners.push('second');
            if (game.runnersOnBase.third) expectedRunners.push('third');

            const allSelected = expectedRunners.every(base => advancements[base]);
            if (!allSelected) {
                this.showError('全走者の進塁先を選択してください');
                return;
            }

            modal.style.display = 'none';
            await this.processPickoffError(position, advancements);
        });
    }

    async processPickoffError(position, advancements) {
        const game = gameManager.currentGame;
        let runs = 0;
        let earnedRuns = 0;
        const messages = [];
        const virtualOuts = (gameManager.currentInning && gameManager.currentInning.virtualOuts) || 0;

        // 3塁走者から処理
        if (advancements.third) {
            if (advancements.third === 'home') {
                runs++;
                const wasEarned = gameManager.moveRunnerEarnedStatus('third', null);
                gameManager.moveRunnerResponsiblePitcher('third', null);
                if (wasEarned && virtualOuts < 3) earnedRuns++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                game.runnersOnBase.third = null;
                messages.push('3塁走者ホーム');
            }
        }

        // 2塁走者
        if (advancements.second) {
            if (advancements.second === 'third') {
                game.runnersOnBase.third = game.runnersOnBase.second;
                game.runnersOnBase.second = null;
                gameManager.moveRunnerEarnedStatus('second', 'third');
                gameManager.moveRunnerResponsiblePitcher('second', 'third');
                messages.push('2塁走者3塁へ');
            } else if (advancements.second === 'home') {
                runs++;
                const wasEarned = gameManager.moveRunnerEarnedStatus('second', null);
                gameManager.moveRunnerResponsiblePitcher('second', null);
                if (wasEarned && virtualOuts < 3) earnedRuns++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                game.runnersOnBase.second = null;
                messages.push('2塁走者ホーム');
            }
        }

        // 1塁走者
        if (advancements.first) {
            if (advancements.first === 'second') {
                game.runnersOnBase.second = game.runnersOnBase.first;
                game.runnersOnBase.first = null;
                gameManager.moveRunnerEarnedStatus('first', 'second');
                gameManager.moveRunnerResponsiblePitcher('first', 'second');
                messages.push('1塁走者2塁へ');
            } else if (advancements.first === 'third') {
                game.runnersOnBase.third = game.runnersOnBase.first;
                game.runnersOnBase.first = null;
                gameManager.moveRunnerEarnedStatus('first', 'third');
                gameManager.moveRunnerResponsiblePitcher('first', 'third');
                messages.push('1塁走者3塁へ');
            } else if (advancements.first === 'home') {
                runs++;
                const wasEarned = gameManager.moveRunnerEarnedStatus('first', null);
                gameManager.moveRunnerResponsiblePitcher('first', null);
                if (wasEarned && virtualOuts < 3) earnedRuns++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                game.runnersOnBase.first = null;
                messages.push('1塁走者ホーム');
            }
        }

        // 牽制悪送球による得点は、責任走者の状態に応じて自責点にも反映する
        if (runs > 0 && gameManager.currentInning) {
            gameManager.currentInning.runs = (gameManager.currentInning.runs || 0) + runs;
            gameManager.currentInning.earnedRuns = Math.min(
                gameManager.currentInning.runs,
                (gameManager.currentInning.earnedRuns || 0) + earnedRuns
            );
        }
        gameManager.addError();

        await gameManager.saveGame();
        this.updateGameDisplay();

        const positionName = i18n.t(BASEBALL_CONFIG.POSITIONS[position].label);
        const message = `牽制悪送球（${positionName}）：${messages.join('、')}${runs > 0 ? `、${runs}得点` : ''}。打者は打席継続。`;
        this.showSuccess(message);
    }

    // ===== 通常エラー（捕球・送球・落球）の実装 =====

    showRegularErrorModal(errorType) {
        const game = gameManager.currentGame;
        const errorConfig = BASEBALL_CONFIG.ERROR_TYPES[errorType];

        // ファウルフライ落球の場合は走者進塁なし、打席継続のみ
        if (errorType === 'foul_fly_drop') {
            this.processFoulFlyDrop();
            return;
        }

        const modal = document.getElementById('modal');
        const modalContent = modal.querySelector('.modal-content');

        // 守備位置選択
        const positions = BASEBALL_CONFIG.POSITIONS;

        modalContent.innerHTML = `
            <h3>${i18n.t(errorConfig.label)}</h3>
            <p>エラーを記録する守備位置を選択してください</p>
            <div class="position-buttons">
                ${Object.keys(positions).map(key => `
                    <button class="position-btn" data-position="${key}">
                        ${i18n.t(positions[key].label)}
                    </button>
                `).join('')}
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelRegularErrorBtn">キャンセル</button>
            </div>
        `;

        modal.style.display = 'block';

        // 守備位置選択
        modalContent.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = btn.getAttribute('data-position');
                modal.style.display = 'none';

                // 打者と走者の進塁先を選択するモーダルへ
                this.showErrorAdvancementModal(errorType, position);
            });
        });

        // キャンセルボタン
        document.getElementById('cancelRegularErrorBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    showErrorAdvancementModal(errorType, position) {
        const game = gameManager.currentGame;
        const errorConfig = BASEBALL_CONFIG.ERROR_TYPES[errorType];
        const modal = document.getElementById('modal');
        const modalContent = modal.querySelector('.modal-content');

        // 打者の進塁先選択
        const batterAdvancementHTML = `
            <div class="runner-advancement-group">
                <span class="runner-label">打者の進塁先:</span>
                <button class="advancement-btn" data-from="batter" data-to="first">
                    ${i18n.t('first_base')}
                </button>
                <button class="advancement-btn" data-from="batter" data-to="second">
                    ${i18n.t('second_base')}
                </button>
                <button class="advancement-btn" data-from="batter" data-to="third">
                    ${i18n.t('third_base')}
                </button>
                <button class="advancement-btn" data-from="batter" data-to="out">
                    アウト
                </button>
            </div>
        `;

        // 走者の進塁先選択
        const runnersHTML = [];
        if (game.runnersOnBase.third) {
            runnersHTML.push(`
                <div class="runner-advancement-group">
                    <span class="runner-label">${i18n.t('third_base')}走者:</span>
                    <button class="advancement-btn" data-from="third" data-to="home">
                        ${i18n.t('home')}
                    </button>
                    <button class="advancement-btn" data-from="third" data-to="out">
                        アウト
                    </button>
                    <button class="advancement-btn" data-from="third" data-to="stay">
                        進塁なし
                    </button>
                </div>
            `);
        }
        if (game.runnersOnBase.second) {
            runnersHTML.push(`
                <div class="runner-advancement-group">
                    <span class="runner-label">${i18n.t('second_base')}走者:</span>
                    <button class="advancement-btn" data-from="second" data-to="third">
                        ${i18n.t('third_base')}
                    </button>
                    <button class="advancement-btn" data-from="second" data-to="home">
                        ${i18n.t('home')}
                    </button>
                    <button class="advancement-btn" data-from="second" data-to="out">
                        アウト
                    </button>
                    <button class="advancement-btn" data-from="second" data-to="stay">
                        進塁なし
                    </button>
                </div>
            `);
        }
        if (game.runnersOnBase.first) {
            runnersHTML.push(`
                <div class="runner-advancement-group">
                    <span class="runner-label">${i18n.t('first_base')}走者:</span>
                    <button class="advancement-btn" data-from="first" data-to="second">
                        ${i18n.t('second_base')}
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="third">
                        ${i18n.t('third_base')}
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="home">
                        ${i18n.t('home')}
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="out">
                        アウト
                    </button>
                    <button class="advancement-btn" data-from="first" data-to="stay">
                        進塁なし
                    </button>
                </div>
            `);
        }

        modalContent.innerHTML = `
            <h3>${i18n.t(errorConfig.label)} - 進塁先選択</h3>
            <p>打者と走者の進塁先を選択してください</p>
            <div class="runner-advancement-container">
                ${batterAdvancementHTML}
                ${runnersHTML.join('')}
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelErrorAdvancementBtn">キャンセル</button>
                <button class="btn btn-primary" id="confirmErrorAdvancementBtn">確定</button>
            </div>
        `;

        modal.style.display = 'block';

        // 進塁先を記録するオブジェクト
        const advancements = {};

        // 進塁ボタンのイベント処理
        modalContent.querySelectorAll('.advancement-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const from = btn.getAttribute('data-from');
                const to = btn.getAttribute('data-to');

                // 同じグループのボタンのアクティブ状態を解除
                btn.closest('.runner-advancement-group')
                    .querySelectorAll('.advancement-btn')
                    .forEach(b => b.classList.remove('active'));

                btn.classList.add('active');
                advancements[from] = to;
            });
        });

        // キャンセルボタン
        document.getElementById('cancelErrorAdvancementBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // 確定ボタン
        document.getElementById('confirmErrorAdvancementBtn').addEventListener('click', async () => {
            // 打者の進塁先が選択されているかチェック
            if (!advancements.batter) {
                this.showError('打者の進塁先を選択してください');
                return;
            }

            // 全走者の進塁先が選択されているかチェック
            const expectedRunners = [];
            if (game.runnersOnBase.first) expectedRunners.push('first');
            if (game.runnersOnBase.second) expectedRunners.push('second');
            if (game.runnersOnBase.third) expectedRunners.push('third');

            const allSelected = expectedRunners.every(base => advancements[base]);
            if (!allSelected) {
                this.showError('全走者の進塁先を選択してください');
                return;
            }

            modal.style.display = 'none';
            await this.processRegularError(errorType, position, advancements);
        });
    }

    async processRegularError(errorType, position, advancements) {
        const game = gameManager.currentGame;
        const atBat = game.currentAtBat;

        if (!atBat) {
            this.showError('打席情報がありません');
            return;
        }

        // 打席結果を記録
        atBat.result = errorType;
        atBat.resultDetail = i18n.t(BASEBALL_CONFIG.ERROR_TYPES[errorType].label);
        atBat.errorPosition = position;

        // 走者状況を保存
        atBat.runnersBeforePlay = {
            first: game.runnersOnBase.first ? {...game.runnersOnBase.first} : null,
            second: game.runnersOnBase.second ? {...game.runnersOnBase.second} : null,
            third: game.runnersOnBase.third ? {...game.runnersOnBase.third} : null
        };

        let runs = 0;
        let outs = 0;
        const messages = [];

        // 3塁走者から処理
        if (advancements.third) {
            if (advancements.third === 'home') {
                runs++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                game.runnersOnBase.third = null;
                messages.push('3塁走者ホーム');
            } else if (advancements.third === 'out') {
                game.runnersOnBase.third = null;
                game.outs++;
                outs++;
                messages.push('3塁走者アウト');
            }
        }

        // 2塁走者
        if (advancements.second) {
            if (advancements.second === 'third') {
                game.runnersOnBase.third = game.runnersOnBase.second;
                game.runnersOnBase.second = null;
                messages.push('2塁走者3塁へ');
            } else if (advancements.second === 'home') {
                runs++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                game.runnersOnBase.second = null;
                messages.push('2塁走者ホーム');
            } else if (advancements.second === 'out') {
                game.runnersOnBase.second = null;
                game.outs++;
                outs++;
                messages.push('2塁走者アウト');
            }
        }

        // 1塁走者
        if (advancements.first) {
            if (advancements.first === 'second') {
                game.runnersOnBase.second = game.runnersOnBase.first;
                game.runnersOnBase.first = null;
                messages.push('1塁走者2塁へ');
            } else if (advancements.first === 'third') {
                game.runnersOnBase.third = game.runnersOnBase.first;
                game.runnersOnBase.first = null;
                messages.push('1塁走者3塁へ');
            } else if (advancements.first === 'home') {
                runs++;
                if (game.isTopHalf) {
                    game.awayScore++;
                } else {
                    game.homeScore++;
                }
                game.runnersOnBase.first = null;
                messages.push('1塁走者ホーム');
            } else if (advancements.first === 'out') {
                game.runnersOnBase.first = null;
                game.outs++;
                outs++;
                messages.push('1塁走者アウト');
            }
        }

        // 打者の処理
        if (advancements.batter === 'out') {
            game.outs++;
            outs++;
            messages.push('打者アウト');
        } else if (advancements.batter === 'first') {
            game.runnersOnBase.first = {
                name: game.currentBatter.name,
                battingOrder: game.currentBatter.battingOrder,
                playerId: game.currentBatter.playerId
            };
            messages.push('打者1塁へ');
        } else if (advancements.batter === 'second') {
            game.runnersOnBase.second = {
                name: game.currentBatter.name,
                battingOrder: game.currentBatter.battingOrder,
                playerId: game.currentBatter.playerId
            };
            messages.push('打者2塁へ');
        } else if (advancements.batter === 'third') {
            game.runnersOnBase.third = {
                name: game.currentBatter.name,
                battingOrder: game.currentBatter.battingOrder,
                playerId: game.currentBatter.playerId
            };
            messages.push('打者3塁へ');
        }

        atBat.runs = runs;
        atBat.runnersAfterPlay = {
            first: game.runnersOnBase.first ? {...game.runnersOnBase.first} : null,
            second: game.runnersOnBase.second ? {...game.runnersOnBase.second} : null,
            third: game.runnersOnBase.third ? {...game.runnersOnBase.third} : null
        };

        // 打席を完了
        atBat.endTime = new Date().toISOString();
        gameManager.currentGame.completedAtBats.push(atBat);
        gameManager.currentGame.currentAtBat = null;

        // 統計更新
        gameManager.updatePlayerStats(atBat);

        // 次の打者へ
        gameManager.advanceToNextBatter();

        // 3アウトチェック
        if (game.outs >= 3) {
            await gameManager.endHalfInning();
            this.showSuccess(`${atBat.resultDetail}：${messages.join('、')}${runs > 0 ? `、${runs}得点` : ''}。3アウトチェンジ`);
        } else {
            await gameManager.saveGame();
            this.updateGameDisplay();
            this.clearBatterForm();
            this.showSuccess(`${atBat.resultDetail}：${messages.join('、')}${runs > 0 ? `、${runs}得点` : ''}（${game.outs}アウト）`);
        }
    }

    async processFoulFlyDrop() {
        const game = gameManager.currentGame;

        // ファウルフライ落球は打席継続のみ
        await gameManager.saveGame();
        this.updateGameDisplay();
        this.showSuccess('ファウルフライ落球：打席継続');
    }

    // ===== 選手交代機能（代打・代走・リリーフ・守備交代） =====

    showSubstitutionMenu() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'substitutionMenu';

        const game = gameManager.currentGame;
        const dhButtonHtml = game.dhRule && game.dhActive ? `
            <button class="btn btn-warning substitution-menu-btn" id="cancelDHBtn">
                DH制解除
            </button>
        ` : '';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>選手交代</h3>
                <div class="substitution-menu-buttons">
                    <button class="btn btn-primary substitution-menu-btn" id="pinchHitterBtn">
                        代打
                    </button>
                    <button class="btn btn-primary substitution-menu-btn" id="pinchRunnerBtn">
                        代走
                    </button>
                    <button class="btn btn-primary substitution-menu-btn" id="reliefPitcherBtn">
                        リリーフ投手
                    </button>
                    <button class="btn btn-primary substitution-menu-btn" id="defensiveSubBtn">
                        守備交代
                    </button>
                    ${dhButtonHtml}
                </div>
                <button class="btn btn-secondary" id="cancelSubstitutionMenu">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 代打ボタン
        document.getElementById('pinchHitterBtn').addEventListener('click', () => {
            modal.remove();
            this.showPinchHitterModal();
        });

        // 代走ボタン
        document.getElementById('pinchRunnerBtn').addEventListener('click', () => {
            modal.remove();
            this.showPinchRunnerModal();
        });

        // リリーフ投手ボタン
        document.getElementById('reliefPitcherBtn').addEventListener('click', () => {
            modal.remove();
            this.showReliefPitcherModal();
        });

        // 守備交代ボタン
        document.getElementById('defensiveSubBtn').addEventListener('click', () => {
            modal.remove();
            this.showDefensiveSubstitutionModal();
        });

        // DH制解除ボタン
        if (game.dhRule && game.dhActive) {
            document.getElementById('cancelDHBtn').addEventListener('click', () => {
                modal.remove();
                this.showCancelDHModal();
            });
        }

        // キャンセルボタン
        document.getElementById('cancelSubstitutionMenu').addEventListener('click', () => {
            modal.remove();
        });
    }

    // ===== 代打機能 =====

    showPinchHitterModal() {
        const game = gameManager.currentGame;

        if (!game.currentBatter) {
            this.showError('現在打席に立っている打者がいません');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'pinchHitterModal';

        const playerDetailLevel = game.playerDetailLevel;
        const currentTeam = game.isTopHalf ? game.awayTeam : game.homeTeam;

        // 詳細モード：控え選手から選択
        if (playerDetailLevel === 'detailed') {
            const benchPlayers = game.players[game.isTopHalf ? 'away' : 'home'].filter(p =>
                p.isBench && p.isActive && !p.substitutedBy
            );

            if (benchPlayers.length === 0) {
                this.showError('起用可能な控え選手がいません');
                return;
            }

            modal.innerHTML = `
                <div class="modal-content">
                    <h3>代打選択</h3>
                    <p>現在の打者: ${game.currentBatter.name}</p>
                    <p>控え選手から代打を選択してください</p>
                    <div class="player-selection-list">
                        ${benchPlayers.map(player => `
                            <button class="player-selection-btn" data-player-id="${player.id}">
                                ${player.name}${player.playerInfo.number ? ` (#${player.playerInfo.number})` : ''}
                            </button>
                        `).join('')}
                    </div>
                    <button class="btn btn-secondary" id="cancelPinchHitter">${i18n.t('cancel')}</button>
                </div>
            `;

            document.body.appendChild(modal);

            // 選手選択
            modal.querySelectorAll('.player-selection-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const playerId = btn.dataset.playerId;
                    const selectedPlayer = benchPlayers.find(p => p.id === playerId);
                    modal.remove();
                    this.processPinchHitter(selectedPlayer);
                });
            });

        } else {
            // 標準以下：選手名を直接入力
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>代打選択</h3>
                    <p>現在の打者: ${game.currentBatter.name}</p>
                    <div class="input-group">
                        <label for="pinchHitterName">代打選手名:</label>
                        <input type="text" id="pinchHitterName" placeholder="選手名を入力">
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="cancelPinchHitter">${i18n.t('cancel')}</button>
                        <button class="btn btn-primary" id="confirmPinchHitter">確定</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 確定ボタン
            document.getElementById('confirmPinchHitter').addEventListener('click', () => {
                const playerName = document.getElementById('pinchHitterName').value.trim();
                if (!playerName) {
                    this.showError('選手名を入力してください');
                    return;
                }

                modal.remove();

                // 新しい選手オブジェクトを作成
                const newPlayer = {
                    id: `ph_${Date.now()}`,
                    name: playerName,
                    team: currentTeam,
                    position: '打', // 代打は「打」
                    battingOrder: game.currentBatter.battingOrder,
                    isActive: true,
                    isStarter: false,
                    isBench: false,
                    isPinchHitter: true,
                    needsDefensiveSubstitution: true,
                    enteredGameAt: new Date().toISOString(),
                    stats: {
                        atBats: 0, hits: 0, runs: 0, rbis: 0, walks: 0, strikeouts: 0,
                        errors: 0, singles: 0, doubles: 0, triples: 0, homeruns: 0,
                        sacrificeBunts: 0, sacrificeFlies: 0, hitByPitch: 0,
                        stolenBases: 0, caughtStealing: 0, fieldingChances: 0,
                        fieldingAssists: 0, fieldingPutouts: 0
                    }
                };

                this.processPinchHitter(newPlayer);
            });
        }

        // キャンセルボタン
        document.getElementById('cancelPinchHitter').addEventListener('click', () => {
            modal.remove();
        });
    }

    async processPinchHitter(pinchHitter) {
        const game = gameManager.currentGame;
        const originalBatter = game.currentBatter;

        // 元の打者を退場させる
        const teamKey = game.isTopHalf ? 'away' : 'home';
        const originalPlayerIndex = game.players[teamKey].findIndex(p => p.id === originalBatter.playerId);

        if (originalPlayerIndex !== -1) {
            game.players[teamKey][originalPlayerIndex].isActive = false;
            game.players[teamKey][originalPlayerIndex].substitutedBy = pinchHitter.id;
            game.players[teamKey][originalPlayerIndex].substitutedAt = new Date().toISOString();
        }

        // 代打選手を追加（詳細モードの場合は既存選手を更新、標準以下は新規追加）
        if (game.playerDetailLevel === 'detailed') {
            const pinchHitterIndex = game.players[teamKey].findIndex(p => p.id === pinchHitter.id);
            if (pinchHitterIndex !== -1) {
                game.players[teamKey][pinchHitterIndex].isActive = true;
                game.players[teamKey][pinchHitterIndex].isBench = false;
                game.players[teamKey][pinchHitterIndex].isPinchHitter = true;
                game.players[teamKey][pinchHitterIndex].position = '打';
                game.players[teamKey][pinchHitterIndex].battingOrder = originalBatter.battingOrder;
                game.players[teamKey][pinchHitterIndex].needsDefensiveSubstitution = true;
                game.players[teamKey][pinchHitterIndex].enteredGameAt = new Date().toISOString();
            }
        } else {
            // 新規追加
            game.players[teamKey].push(pinchHitter);
        }

        // 現在の打者を更新
        game.currentBatter = {
            name: pinchHitter.name,
            battingOrder: originalBatter.battingOrder,
            playerId: pinchHitter.id,
            position: '打'
        };

        // 交代履歴を記録
        if (!game.substitutionHistory) {
            game.substitutionHistory = [];
        }
        game.substitutionHistory.push({
            type: 'pinchHitter',
            inning: game.currentInning,
            isTopHalf: game.isTopHalf,
            out: originalBatter,
            in: pinchHitter,
            timestamp: new Date().toISOString()
        });

        await gameManager.saveGame();
        this.updateGameDisplay();
        this.showSuccess(`代打：${pinchHitter.name} が ${originalBatter.name} に代わって打席に`);
    }

    // ===== 代走機能 =====

    showPinchRunnerModal() {
        const game = gameManager.currentGame;

        // 走者がいない場合
        if (!game.runnersOnBase.first && !game.runnersOnBase.second && !game.runnersOnBase.third) {
            this.showError('代走を出せる走者がいません');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'pinchRunnerModal';

        // 現在の走者リスト
        const runners = [];
        if (game.runnersOnBase.first) runners.push({ base: 'first', name: game.runnersOnBase.first.name });
        if (game.runnersOnBase.second) runners.push({ base: 'second', name: game.runnersOnBase.second.name });
        if (game.runnersOnBase.third) runners.push({ base: 'third', name: game.runnersOnBase.third.name });

        modal.innerHTML = `
            <div class="modal-content">
                <h3>代走選択</h3>
                <p>代走を出す走者を選択してください</p>
                <div class="runner-selection-buttons">
                    ${runners.map(runner => `
                        <button class="runner-btn" data-base="${runner.base}">
                            ${i18n.t(runner.base + '_base')}: ${runner.name}
                        </button>
                    `).join('')}
                </div>
                <button class="btn btn-secondary" id="cancelPinchRunner">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 走者選択
        modal.querySelectorAll('.runner-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const base = btn.dataset.base;
                modal.remove();
                this.showPinchRunnerSelectionModal(base);
            });
        });

        // キャンセル
        document.getElementById('cancelPinchRunner').addEventListener('click', () => {
            modal.remove();
        });
    }

    showPinchRunnerSelectionModal(base) {
        const game = gameManager.currentGame;
        const originalRunner = game.runnersOnBase[base];

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'pinchRunnerSelectionModal';

        const playerDetailLevel = game.playerDetailLevel;
        const currentTeam = game.isTopHalf ? game.awayTeam : game.homeTeam;

        // 詳細モード：控え選手から選択
        if (playerDetailLevel === 'detailed') {
            const benchPlayers = game.players[game.isTopHalf ? 'away' : 'home'].filter(p =>
                p.isBench && p.isActive && !p.substitutedBy
            );

            if (benchPlayers.length === 0) {
                this.showError('起用可能な控え選手がいません');
                return;
            }

            modal.innerHTML = `
                <div class="modal-content">
                    <h3>代走選択 - ${i18n.t(base + '_base')}</h3>
                    <p>現在の走者: ${originalRunner.name}</p>
                    <p>控え選手から代走を選択してください</p>
                    <div class="player-selection-list">
                        ${benchPlayers.map(player => `
                            <button class="player-selection-btn" data-player-id="${player.id}">
                                ${player.name}${player.playerInfo.number ? ` (#${player.playerInfo.number})` : ''}
                            </button>
                        `).join('')}
                    </div>
                    <button class="btn btn-secondary" id="cancelPinchRunnerSelection">${i18n.t('cancel')}</button>
                </div>
            `;

            document.body.appendChild(modal);

            // 選手選択
            modal.querySelectorAll('.player-selection-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const playerId = btn.dataset.playerId;
                    const selectedPlayer = benchPlayers.find(p => p.id === playerId);
                    modal.remove();
                    this.processPinchRunner(base, selectedPlayer);
                });
            });

        } else {
            // 標準以下：選手名を直接入力
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>代走選択 - ${i18n.t(base + '_base')}</h3>
                    <p>現在の走者: ${originalRunner.name}</p>
                    <div class="input-group">
                        <label for="pinchRunnerName">代走選手名:</label>
                        <input type="text" id="pinchRunnerName" placeholder="選手名を入力">
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="cancelPinchRunnerSelection">${i18n.t('cancel')}</button>
                        <button class="btn btn-primary" id="confirmPinchRunnerSelection">確定</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 確定ボタン
            document.getElementById('confirmPinchRunnerSelection').addEventListener('click', () => {
                const playerName = document.getElementById('pinchRunnerName').value.trim();
                if (!playerName) {
                    this.showError('選手名を入力してください');
                    return;
                }

                modal.remove();

                // 新しい選手オブジェクトを作成
                const newPlayer = {
                    id: `pr_${Date.now()}`,
                    name: playerName,
                    team: currentTeam,
                    position: '走', // 代走は「走」
                    battingOrder: originalRunner.battingOrder,
                    isActive: true,
                    isStarter: false,
                    isBench: false,
                    isPinchRunner: true,
                    needsDefensiveSubstitution: true,
                    enteredGameAt: new Date().toISOString(),
                    stats: {
                        atBats: 0, hits: 0, runs: 0, rbis: 0, walks: 0, strikeouts: 0,
                        errors: 0, singles: 0, doubles: 0, triples: 0, homeruns: 0,
                        sacrificeBunts: 0, sacrificeFlies: 0, hitByPitch: 0,
                        stolenBases: 0, caughtStealing: 0, fieldingChances: 0,
                        fieldingAssists: 0, fieldingPutouts: 0
                    }
                };

                this.processPinchRunner(base, newPlayer);
            });
        }

        // キャンセルボタン
        document.getElementById('cancelPinchRunnerSelection').addEventListener('click', () => {
            modal.remove();
        });
    }

    async processPinchRunner(base, pinchRunner) {
        const game = gameManager.currentGame;
        const originalRunner = game.runnersOnBase[base];

        // 元の走者を退場させる
        const teamKey = game.isTopHalf ? 'away' : 'home';
        const originalPlayerIndex = game.players[teamKey].findIndex(p => p.id === originalRunner.playerId);

        if (originalPlayerIndex !== -1) {
            game.players[teamKey][originalPlayerIndex].isActive = false;
            game.players[teamKey][originalPlayerIndex].substitutedBy = pinchRunner.id;
            game.players[teamKey][originalPlayerIndex].substitutedAt = new Date().toISOString();
        }

        // 代走選手を追加（詳細モードの場合は既存選手を更新、標準以下は新規追加）
        if (game.playerDetailLevel === 'detailed') {
            const pinchRunnerIndex = game.players[teamKey].findIndex(p => p.id === pinchRunner.id);
            if (pinchRunnerIndex !== -1) {
                game.players[teamKey][pinchRunnerIndex].isActive = true;
                game.players[teamKey][pinchRunnerIndex].isBench = false;
                game.players[teamKey][pinchRunnerIndex].isPinchRunner = true;
                game.players[teamKey][pinchRunnerIndex].position = '走';
                game.players[teamKey][pinchRunnerIndex].battingOrder = originalRunner.battingOrder;
                game.players[teamKey][pinchRunnerIndex].needsDefensiveSubstitution = true;
                game.players[teamKey][pinchRunnerIndex].enteredGameAt = new Date().toISOString();
            }
        } else {
            // 新規追加
            game.players[teamKey].push(pinchRunner);
        }

        // 走者を更新
        game.runnersOnBase[base] = {
            name: pinchRunner.name,
            battingOrder: originalRunner.battingOrder,
            playerId: pinchRunner.id
        };

        // 交代履歴を記録
        if (!game.substitutionHistory) {
            game.substitutionHistory = [];
        }
        game.substitutionHistory.push({
            type: 'pinchRunner',
            base: base,
            inning: game.currentInning,
            isTopHalf: game.isTopHalf,
            out: originalRunner,
            in: pinchRunner,
            timestamp: new Date().toISOString()
        });

        await gameManager.saveGame();
        this.updateGameDisplay();
        this.showSuccess(`代走：${pinchRunner.name} が ${originalRunner.name} に代わって${i18n.t(base + '_base')}に`);
    }

    // ===== リリーフ投手機能 =====

    showReliefPitcherModal() {
        const game = gameManager.currentGame;

        if (!game.currentPitcher) {
            this.showError('現在の投手がいません');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'reliefPitcherModal';

        const playerDetailLevel = game.playerDetailLevel;
        const currentTeam = game.isTopHalf ? game.homeTeam : game.awayTeam; // 守備側

        // 詳細モード：控え選手から選択
        if (playerDetailLevel === 'detailed') {
            const benchPlayers = game.players[game.isTopHalf ? 'home' : 'away'].filter(p =>
                p.isBench && p.isActive && !p.substitutedBy
            );

            if (benchPlayers.length === 0) {
                this.showError('起用可能な控え選手がいません');
                return;
            }

            modal.innerHTML = `
                <div class="modal-content">
                    <h3>リリーフ投手選択</h3>
                    <p>現在の投手: ${game.currentPitcher.name}</p>
                    <p>控え選手からリリーフ投手を選択してください</p>
                    <div class="player-selection-list">
                        ${benchPlayers.map(player => `
                            <button class="player-selection-btn" data-player-id="${player.id}">
                                ${player.name}${player.playerInfo.number ? ` (#${player.playerInfo.number})` : ''}
                            </button>
                        `).join('')}
                    </div>
                    <button class="btn btn-secondary" id="cancelReliefPitcher">${i18n.t('cancel')}</button>
                </div>
            `;

            document.body.appendChild(modal);

            // 選手選択
            modal.querySelectorAll('.player-selection-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const playerId = btn.dataset.playerId;
                    const selectedPlayer = benchPlayers.find(p => p.id === playerId);
                    modal.remove();
                    this.processReliefPitcher(selectedPlayer);
                });
            });

        } else {
            // 標準以下：選手名を直接入力
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>リリーフ投手選択</h3>
                    <p>現在の投手: ${game.currentPitcher.name}</p>
                    <div class="input-group">
                        <label for="reliefPitcherName">リリーフ投手名:</label>
                        <input type="text" id="reliefPitcherName" placeholder="選手名を入力">
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="cancelReliefPitcher">${i18n.t('cancel')}</button>
                        <button class="btn btn-primary" id="confirmReliefPitcher">確定</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 確定ボタン
            document.getElementById('confirmReliefPitcher').addEventListener('click', () => {
                const playerName = document.getElementById('reliefPitcherName').value.trim();
                if (!playerName) {
                    this.showError('選手名を入力してください');
                    return;
                }

                modal.remove();

                // 新しい選手オブジェクトを作成
                const newPlayer = {
                    id: `rp_${Date.now()}`,
                    name: playerName,
                    team: currentTeam,
                    position: 'P',
                    battingOrder: game.currentPitcher.battingOrder || null,
                    isActive: true,
                    isStarter: false,
                    isBench: false,
                    enteredGameAt: new Date().toISOString(),
                    stats: {
                        atBats: 0, hits: 0, runs: 0, rbis: 0, walks: 0, strikeouts: 0,
                        errors: 0, singles: 0, doubles: 0, triples: 0, homeruns: 0,
                        sacrificeBunts: 0, sacrificeFlies: 0, hitByPitch: 0,
                        stolenBases: 0, caughtStealing: 0, fieldingChances: 0,
                        fieldingAssists: 0, fieldingPutouts: 0
                    }
                };

                this.processReliefPitcher(newPlayer);
            });
        }

        // キャンセルボタン
        document.getElementById('cancelReliefPitcher').addEventListener('click', () => {
            modal.remove();
        });
    }

    async processReliefPitcher(reliefPitcher) {
        const game = gameManager.currentGame;
        const originalPitcher = game.currentPitcher;

        // 元の投手を退場させる
        const teamKey = game.isTopHalf ? 'home' : 'away'; // 守備側
        const originalPitcherIndex = game.players[teamKey].findIndex(p => p.id === originalPitcher.playerId);

        if (originalPitcherIndex !== -1) {
            game.players[teamKey][originalPitcherIndex].isActive = false;
            game.players[teamKey][originalPitcherIndex].substitutedBy = reliefPitcher.id;
            game.players[teamKey][originalPitcherIndex].substitutedAt = new Date().toISOString();
        }

        // リリーフ投手を追加（詳細モードの場合は既存選手を更新、標準以下は新規追加）
        if (game.playerDetailLevel === 'detailed') {
            const reliefPitcherIndex = game.players[teamKey].findIndex(p => p.id === reliefPitcher.id);
            if (reliefPitcherIndex !== -1) {
                game.players[teamKey][reliefPitcherIndex].isActive = true;
                game.players[teamKey][reliefPitcherIndex].isBench = false;
                game.players[teamKey][reliefPitcherIndex].position = 'P';
                game.players[teamKey][reliefPitcherIndex].enteredGameAt = new Date().toISOString();
            }
        } else {
            // 新規追加
            game.players[teamKey].push(reliefPitcher);
        }

        // 現在の投手を更新
        game.currentPitcher = {
            name: reliefPitcher.name,
            playerId: reliefPitcher.id,
            position: 'P'
        };

        // 交代履歴を記録
        if (!game.substitutionHistory) {
            game.substitutionHistory = [];
        }
        game.substitutionHistory.push({
            type: 'reliefPitcher',
            inning: game.currentInning,
            isTopHalf: game.isTopHalf,
            out: originalPitcher,
            in: reliefPitcher,
            timestamp: new Date().toISOString()
        });

        await gameManager.saveGame();
        this.updateGameDisplay();
        this.showSuccess(`リリーフ投手：${reliefPitcher.name} が ${originalPitcher.name} に代わって登板`);
    }

    // ===== 守備交代機能（複数選手同時対応） =====

    showDefensiveSubstitutionModal() {
        const fieldingTeam = gameManager.currentGame.isTopHalf ? 'home' : 'away';

        const modal = document.createElement('div');
        modal.className = 'modal modal-large';
        modal.id = 'defensiveSubstitutionModal';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>守備交代・守備シフト</h3>
                <p>複数選手の守備位置を同時に変更できます</p>
                <div class="button-group">
                    <button class="btn btn-primary" id="fullLineupChangeBtn">全守備位置を編集</button>
                    <button class="btn btn-secondary" id="deferEditBtn">後で編集（仮状態で継続）</button>
                    <button class="btn btn-secondary" id="cancelDefSubBtn">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('fullLineupChangeBtn').addEventListener('click', () => {
            modal.remove();
            this.showFullLineupEditor(fieldingTeam, false);
        });

        document.getElementById('deferEditBtn').addEventListener('click', () => {
            modal.remove();
            this.markLineupAsPending(fieldingTeam);
        });

        document.getElementById('cancelDefSubBtn').addEventListener('click', () => {
            modal.remove();
        });
    }

    markLineupAsPending(team) {
        const game = gameManager.currentGame;

        if (!game.pendingLineupChanges) {
            game.pendingLineupChanges = {};
        }

        game.pendingLineupChanges[team] = {
            inning: game.currentInning,
            isTopHalf: game.isTopHalf,
            timestamp: new Date().toISOString()
        };

        gameManager.saveGame();
        this.showSuccess('守備位置を後で編集します。半イニング終了前に編集してください。');
        this.updateUI();
    }

    showFullLineupEditor(team, isPending = false) {
        const game = gameManager.currentGame;
        const activePlayers = game.players[team].filter(p => p.isActive);
        const benchPlayers = game.players[team].filter(p => p.isBench && p.isActive && !p.substitutedBy);

        const modal = document.createElement('div');
        modal.className = 'modal modal-xlarge';
        modal.id = 'fullLineupEditorModal';

        let lineupHTML = '<div class="lineup-editor">';

        // 現在の守備位置一覧
        lineupHTML += '<h4>現在の守備陣</h4>';
        lineupHTML += '<div class="lineup-grid">';

        const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
        if (game.dhRule && game.dhActive) {
            positions.push('DH');
        }

        positions.forEach((pos, index) => {
            const player = activePlayers.find(p => p.position === pos);
            const playerName = player ? player.name : '(未配置)';
            const playerId = player ? player.id : '';

            lineupHTML += `
                <div class="lineup-row" data-position="${pos}">
                    <span class="position-label">${pos}</span>
                    <select class="player-select" id="pos_${pos}" data-position="${pos}">
                        <option value="">-- 選択 --</option>
                        ${activePlayers.map(p => `
                            <option value="${p.id}" ${p.id === playerId ? 'selected' : ''}>
                                ${p.name} ${p.position !== pos ? `(現${p.position})` : ''}
                            </option>
                        `).join('')}
                        ${benchPlayers.length > 0 ? '<optgroup label="控え選手">' : ''}
                        ${benchPlayers.map(p => `
                            <option value="${p.id}">${p.name}</option>
                        `).join('')}
                        ${benchPlayers.length > 0 ? '</optgroup>' : ''}
                        ${game.playerDetailLevel !== 'detailed' ? '<option value="new">新規入力...</option>' : ''}
                    </select>
                    <button class="btn btn-sm btn-icon" data-action="swap" data-position="${pos}">⇄</button>
                </div>
            `;
        });

        lineupHTML += '</div>';
        lineupHTML += '</div>';

        modal.innerHTML = `
            <div class="modal-content modal-content-wide">
                <h3>守備位置編集</h3>
                ${lineupHTML}
                <div class="button-group">
                    <button class="btn btn-primary" id="saveLineupBtn">確定</button>
                    <button class="btn btn-secondary" id="cancelLineupBtn">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 選手選択の変更を監視して、新規入力が選ばれた場合の処理
        document.querySelectorAll('.player-select').forEach(select => {
            select.addEventListener('change', (e) => {
                if (e.target.value === 'new') {
                    const position = e.target.dataset.position;
                    this.showNewPlayerInputForPosition(team, position, (newPlayer) => {
                        // 新規選手を追加
                        game.players[team].push(newPlayer);
                        // セレクトボックスを更新
                        const option = document.createElement('option');
                        option.value = newPlayer.id;
                        option.textContent = newPlayer.name;
                        option.selected = true;
                        e.target.insertBefore(option, e.target.querySelector('option[value="new"]'));
                    });
                }
            });
        });

        // 位置入れ替えボタンのイベント
        document.querySelectorAll('[data-action="swap"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const position = e.target.dataset.position;
                this.showSwapPositionModal(team, position);
            });
        });

        document.getElementById('saveLineupBtn').addEventListener('click', () => {
            this.processFullLineupChange(team, isPending);
            modal.remove();
        });

        document.getElementById('cancelLineupBtn').addEventListener('click', () => {
            modal.remove();
        });
    }

    showNewPlayerInputForPosition(team, position, callback) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'newPlayerInputModal';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${position} の新規選手</h3>
                <div class="form-group">
                    <label>選手名:</label>
                    <input type="text" id="newPlayerName" class="form-control" placeholder="選手名を入力">
                </div>
                <div class="button-group">
                    <button class="btn btn-primary" id="addNewPlayerBtn">追加</button>
                    <button class="btn btn-secondary" id="cancelNewPlayerBtn">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('addNewPlayerBtn').addEventListener('click', () => {
            const name = document.getElementById('newPlayerName').value.trim();
            if (!name) {
                this.showError('選手名を入力してください');
                return;
            }

            const newPlayer = {
                id: Date.now(),
                name: name,
                team: team,
                position: position,
                battingOrder: null,
                isActive: true,
                isBench: false,
                isStarter: false,
                enteredGameAt: new Date().toISOString(),
                stats: {
                    atBats: 0,
                    hits: 0,
                    runs: 0,
                    rbis: 0,
                    walks: 0,
                    strikeouts: 0,
                    errors: 0
                }
            };

            modal.remove();
            callback(newPlayer);
        });

        document.getElementById('cancelNewPlayerBtn').addEventListener('click', () => {
            modal.remove();
        });
    }

    showSwapPositionModal(team, currentPosition) {
        const game = gameManager.currentGame;
        const activePlayers = game.players[team].filter(p => p.isActive);
        const currentPlayer = activePlayers.find(p => p.position === currentPosition);

        if (!currentPlayer) {
            this.showError('現在の位置に選手がいません');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'swapPositionModal';

        const otherPlayers = activePlayers.filter(p => p.id !== currentPlayer.id);

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${currentPlayer.name} (${currentPosition}) と交換</h3>
                <div class="player-list">
                    ${otherPlayers.map(p => `
                        <button class="btn btn-player" data-player-id="${p.id}">
                            ${p.name} (${p.position})
                        </button>
                    `).join('')}
                </div>
                <button class="btn btn-secondary" id="cancelSwapBtn">キャンセル</button>
            </div>
        `;

        document.body.appendChild(modal);

        document.querySelectorAll('.btn-player').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPlayerId = parseInt(btn.dataset.playerId);
                const targetPlayer = activePlayers.find(p => p.id === targetPlayerId);

                // 守備位置を入れ替え
                const tempPos = currentPlayer.position;
                currentPlayer.position = targetPlayer.position;
                targetPlayer.position = tempPos;

                // セレクトボックスを更新
                document.getElementById(`pos_${currentPosition}`).value = targetPlayer.id;
                document.getElementById(`pos_${targetPlayer.position}`).value = currentPlayer.id;

                modal.remove();
                this.showSuccess(`${currentPlayer.name} と ${targetPlayer.name} の守備位置を入れ替えました`);
            });
        });

        document.getElementById('cancelSwapBtn').addEventListener('click', () => {
            modal.remove();
        });
    }

    processFullLineupChange(team, isPending) {
        const game = gameManager.currentGame;
        const changes = [];

        const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
        if (game.dhRule && game.dhActive) {
            positions.push('DH');
        }

        positions.forEach(pos => {
            const select = document.getElementById(`pos_${pos}`);
            if (!select) return;

            const newPlayerId = parseInt(select.value);
            if (!newPlayerId) return;

            const currentPlayer = game.players[team].find(p => p.position === pos && p.isActive);
            const newPlayer = game.players[team].find(p => p.id === newPlayerId);

            if (newPlayer && (!currentPlayer || currentPlayer.id !== newPlayer.id)) {
                // 守備位置が変更された
                if (currentPlayer) {
                    currentPlayer.isActive = false;
                    currentPlayer.substitutedBy = newPlayer.id;
                    currentPlayer.substitutedAt = new Date().toISOString();
                }

                newPlayer.position = pos;
                newPlayer.isActive = true;
                if (newPlayer.isBench) {
                    newPlayer.enteredGameAt = new Date().toISOString();
                    newPlayer.isBench = false;
                }

                changes.push({
                    position: pos,
                    out: currentPlayer ? currentPlayer.name : null,
                    in: newPlayer.name
                });
            }
        });

        if (changes.length > 0) {
            if (!game.substitutionHistory) {
                game.substitutionHistory = [];
            }

            game.substitutionHistory.push({
                type: 'defensive_shift',
                inning: game.currentInning,
                isTopHalf: game.isTopHalf,
                changes: changes,
                timestamp: new Date().toISOString()
            });

            // 仮状態を解除
            if (isPending && game.pendingLineupChanges && game.pendingLineupChanges[team]) {
                delete game.pendingLineupChanges[team];
            }

            gameManager.saveGame();
            this.updateUI();
            this.showSuccess(`守備位置を変更しました（${changes.length}件）`);
        } else {
            this.showInfo('変更はありませんでした');
        }
    }

    // ===== 仮状態ラインナップの編集機能 =====

    checkPendingLineupChanges() {
        const game = gameManager.currentGame;
        if (!game.pendingLineupChanges) return;

        const teams = Object.keys(game.pendingLineupChanges);
        if (teams.length > 0) {
            // UIに警告表示を追加
            this.showPendingLineupWarning(teams);
        }
    }

    showPendingLineupWarning(teams) {
        const warningDiv = document.getElementById('pending-lineup-warning');
        if (!warningDiv) return;

        const teamNames = teams.map(t => t === 'home' ? gameManager.currentGame.homeTeam : gameManager.currentGame.awayTeam);

        warningDiv.innerHTML = `
            <div class="warning-banner">
                <span>⚠️ ${teamNames.join('、')} の守備位置が未確定です</span>
                <button class="btn btn-sm btn-warning" id="editPendingLineupBtn">今すぐ編集</button>
            </div>
        `;

        warningDiv.style.display = 'block';

        document.getElementById('editPendingLineupBtn').addEventListener('click', () => {
            this.showPendingLineupEditor(teams[0]);
        });
    }

    showPendingLineupEditor(team) {
        this.showFullLineupEditor(team, true);
    }

    // ===== 「打」「走」の強制守備交代処理 =====

    async showSubstituteDefensivePositionScreen(battingTeam, substitutePlayers) {
        if (!substitutePlayers || substitutePlayers.length === 0) {
            return;
        }

        for (const player of substitutePlayers) {
            await this.showMandatoryDefensiveSubstitutionModal(battingTeam, player);
        }
    }

    async showMandatoryDefensiveSubstitutionModal(team, player) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'mandatoryDefSubModal';

            const substituteType = player.position === '打' ? '代打' : '代走';

            modal.innerHTML = `
                <div class="modal-content">
                    <h3>守備交代が必要です</h3>
                    <p>${player.name} (${substituteType}) の守備位置を決定してください</p>
                    <div class="button-group">
                        <button class="btn btn-primary" id="keepPlayerNameBtn">このまま守備位置を割り当てる</button>
                        <button class="btn btn-primary" id="changePlayerNameBtn">別の選手に交代する</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('keepPlayerNameBtn').addEventListener('click', () => {
                modal.remove();
                this.showMandatoryPositionSelection(team, player, true, resolve);
            });

            document.getElementById('changePlayerNameBtn').addEventListener('click', () => {
                modal.remove();
                this.showMandatoryReplacementPlayer(team, player, resolve);
            });
        });
    }

    showMandatoryPositionSelection(team, player, keepName, resolve) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'mandatoryPosSelectModal';

        const positions = ['P', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'C', 'DH'];
        let positionOptions = '';
        positions.forEach(pos => {
            positionOptions += `<button class="btn btn-position" data-position="${pos}">${pos}</button>`;
        });

        modal.innerHTML = `
            <div class="modal-content">
                <h3>守備位置を選択: ${player.name}</h3>
                <div class="position-grid">
                    ${positionOptions}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.querySelectorAll('.btn-position').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = btn.dataset.position;
                modal.remove();
                this.processMandatoryDefensiveSubstitution(team, player, position, keepName);
                resolve();
            });
        });
    }

    showMandatoryReplacementPlayer(team, playerToReplace, resolve) {
        const detailLevel = gameManager.currentGame.playerDetailLevel;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'mandatoryReplacementModal';

        let content = `
            <div class="modal-content">
                <h3>${playerToReplace.name} に代わる選手</h3>
        `;

        if (detailLevel === 'detailed') {
            const benchPlayers = gameManager.currentGame.players[team].filter(
                p => p.isBench && p.isActive && !p.substitutedBy
            );

            if (benchPlayers.length === 0) {
                content += `<p>利用可能な控え選手がいません</p>`;
            } else {
                content += `<div class="player-list">`;
                benchPlayers.forEach(player => {
                    content += `
                        <button class="btn btn-player" data-player-id="${player.id}">
                            ${player.name}
                        </button>
                    `;
                });
                content += `</div>`;
            }
        } else {
            content += `
                <div class="form-group">
                    <label>選手名を入力:</label>
                    <input type="text" id="mandatoryReplacementName" class="form-control" placeholder="選手名">
                </div>
                <button class="btn btn-primary" id="submitMandatoryReplaceBtn">次へ</button>
            `;
        }

        content += `</div>`;

        modal.innerHTML = content;
        document.body.appendChild(modal);

        if (detailLevel === 'detailed') {
            document.querySelectorAll('.btn-player').forEach(btn => {
                btn.addEventListener('click', () => {
                    const playerId = parseInt(btn.dataset.playerId);
                    const replacementPlayer = gameManager.currentGame.players[team].find(p => p.id === playerId);
                    modal.remove();
                    this.showMandatoryPositionForReplacement(team, playerToReplace, replacementPlayer, resolve);
                });
            });
        } else {
            document.getElementById('submitMandatoryReplaceBtn').addEventListener('click', () => {
                const name = document.getElementById('mandatoryReplacementName').value.trim();
                if (!name) {
                    this.showError('選手名を入力してください');
                    return;
                }

                const newPlayer = {
                    name: name,
                    team: team,
                    position: null,
                    battingOrder: playerToReplace.battingOrder,
                    isActive: true,
                    isBench: false,
                    isStarter: false
                };

                modal.remove();
                this.showMandatoryPositionForReplacement(team, playerToReplace, newPlayer, resolve);
            });
        }
    }

    showMandatoryPositionForReplacement(team, playerToReplace, replacementPlayer, resolve) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'mandatoryPosReplaceModal';

        const positions = ['P', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'C', 'DH'];
        let positionOptions = '';
        positions.forEach(pos => {
            positionOptions += `<button class="btn btn-position" data-position="${pos}">${pos}</button>`;
        });

        modal.innerHTML = `
            <div class="modal-content">
                <h3>守備位置を選択: ${replacementPlayer.name}</h3>
                <div class="position-grid">
                    ${positionOptions}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.querySelectorAll('.btn-position').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = btn.dataset.position;
                modal.remove();
                this.processMandatoryDefensiveSubstitutionWithReplacement(team, playerToReplace, replacementPlayer, position);
                resolve();
            });
        });
    }

    processMandatoryDefensiveSubstitution(team, player, newPosition, keepName) {
        player.position = newPosition;
        player.needsDefensiveSubstitution = false;
        player.isPinchHitter = false;
        player.isPinchRunner = false;

        if (!gameManager.currentGame.substitutionHistory) {
            gameManager.currentGame.substitutionHistory = [];
        }

        gameManager.currentGame.substitutionHistory.push({
            type: 'mandatory_defensive_change',
            inning: gameManager.currentGame.currentInning,
            isTopHalf: gameManager.currentGame.isTopHalf,
            playerOut: null,
            playerIn: player.name,
            position: newPosition,
            timestamp: new Date().toISOString()
        });

        gameManager.saveGame();
        this.updateUI();
        this.showSuccess(`${player.name} を ${newPosition} に配置しました`);
    }

    processMandatoryDefensiveSubstitutionWithReplacement(team, playerToReplace, replacementPlayer, newPosition) {
        playerToReplace.isActive = false;
        playerToReplace.substitutedBy = replacementPlayer.id || Date.now();
        playerToReplace.substitutedAt = new Date().toISOString();
        playerToReplace.needsDefensiveSubstitution = false;

        if (!replacementPlayer.id) {
            replacementPlayer.id = Date.now();
            gameManager.currentGame.players[team].push(replacementPlayer);
        }

        replacementPlayer.position = newPosition;
        replacementPlayer.battingOrder = playerToReplace.battingOrder;
        replacementPlayer.isActive = true;
        replacementPlayer.enteredGameAt = new Date().toISOString();

        if (!gameManager.currentGame.substitutionHistory) {
            gameManager.currentGame.substitutionHistory = [];
        }

        gameManager.currentGame.substitutionHistory.push({
            type: 'mandatory_defensive_substitution',
            inning: gameManager.currentGame.currentInning,
            isTopHalf: gameManager.currentGame.isTopHalf,
            playerOut: playerToReplace.name,
            playerIn: replacementPlayer.name,
            position: newPosition,
            timestamp: new Date().toISOString()
        });

        gameManager.saveGame();
        this.updateUI();
        this.showSuccess(`守備交代: ${replacementPlayer.name} が ${playerToReplace.name} に代わって ${newPosition} に入りました`);
    }

    // ===== DH制解除機能 =====

    showCancelDHModal() {
        const game = gameManager.currentGame;

        if (!game.dhRule || !game.dhActive) {
            this.showError('DH制は既に解除されているか、使用されていません');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'cancelDHModal';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>DH制解除の確認</h3>
                <p>DH制を解除すると、投手が打順に入ります。</p>
                <p><strong>注意: 一度解除すると、この試合中は復活できません。</strong></p>
                <div class="button-group">
                    <button class="btn btn-warning" id="confirmCancelDHBtn">DH制を解除する</button>
                    <button class="btn btn-secondary" id="cancelCancelDHBtn">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('confirmCancelDHBtn').addEventListener('click', () => {
            modal.remove();
            this.processCancelDH();
        });

        document.getElementById('cancelCancelDHBtn').addEventListener('click', () => {
            modal.remove();
        });
    }

    processCancelDH() {
        const game = gameManager.currentGame;
        const battingTeam = game.isTopHalf ? 'away' : 'home';

        // DHの選手を探す
        const dhPlayer = game.players[battingTeam].find(p => p.position === 'DH' && p.isActive);

        if (!dhPlayer) {
            this.showError('DH選手が見つかりません');
            return;
        }

        // 現在の投手を探す
        const pitcher = game.players[battingTeam].find(p => p.position === 'P' && p.isActive);

        if (!pitcher) {
            this.showError('投手が見つかりません');
            return;
        }

        // DH制を解除
        game.dhActive = false;

        // DHの選手を退場させる
        dhPlayer.isActive = false;
        dhPlayer.substitutedBy = pitcher.id;
        dhPlayer.substitutedAt = new Date().toISOString();

        // 投手がDHの打順を引き継ぐ
        pitcher.battingOrder = dhPlayer.battingOrder;

        // 交代履歴に記録
        if (!game.substitutionHistory) {
            game.substitutionHistory = [];
        }

        game.substitutionHistory.push({
            type: 'dh_cancelled',
            inning: game.currentInning,
            isTopHalf: game.isTopHalf,
            playerOut: dhPlayer.name,
            playerIn: pitcher.name,
            position: 'P',
            battingOrder: pitcher.battingOrder,
            timestamp: new Date().toISOString()
        });

        gameManager.saveGame();
        this.updateUI();
        this.showSuccess(`DH制を解除しました。${pitcher.name} が ${dhPlayer.battingOrder} 番打者として打順に入りました`);
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

                <div class="pitch-result-section">
                    <h4 data-i18n="pitchResult">投球結果</h4>
                    <div class="pitch-result-buttons">
                        <button class="pitch-result-btn" data-result="ball" data-i18n="pitch_ball">見逃しボール</button>
                        <button class="pitch-result-btn" data-result="strike_looking" data-i18n="pitch_strike_looking">見逃しストライク</button>
                        <button class="pitch-result-btn" data-result="strike_swinging" data-i18n="pitch_strike_swinging">空振り（チップ捕球含む）</button>
                        <button class="pitch-result-btn" data-result="foul" data-i18n="pitch_foul">ファウルボール（チップ落球含む）</button>
                        <button class="pitch-result-btn" data-result="foul_bunt" data-i18n="pitch_foul_bunt">バントファウル</button>
                        <button class="pitch-result-btn" data-result="foul_fly_dropped" data-i18n="pitch_foul_fly_dropped">ファウルフライ落球</button>
                        <button class="pitch-result-btn" data-result="hit" data-i18n="pitch_hit">フェア（打球）</button>
                        <button class="pitch-result-btn" data-result="hit_by_pitch" data-i18n="pitch_hit_by_pitch">死球</button>
                    </div>
                </div>

                <div class="baserunning-section" id="baserunningSection" hidden>
                    <h4 data-i18n="runner_play_category">走者プレー</h4>
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
                            <button class="baserunning-btn" data-play="pickoff_safe" data-i18n="pickoff_safe">牽制セーフ</button>
                            <button class="baserunning-btn" data-play="pickoff_out">牽制死</button>
                            <button class="baserunning-btn" data-play="balk">ボーク</button>
                        </div>
                        <button id="recordBaserunningPlay" class="secondary-btn">走者プレー記録</button>
                    </div>
                </div>

                <div class="pitch-controls">
                    <button id="recordPitch" class="primary-btn">投球記録</button>
                    <button id="undoLastPitch" class="undo-btn" disabled>前プレー取消</button>
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
                    <button id="undoLastAtBatBtn" class="undo-btn" data-i18n="undoLastAtBat">前打席に戻す</button>
                </div>

                <div class="earned-runs-adjust">
                    <span data-i18n="earnedRunsLabel">自責点</span>: <span id="currentInningEarnedRuns">0</span>
                    <button id="markUnearnedBtn" class="stat-btn" disabled data-i18n="markUnearned">−自責点</button>
                    <button id="undoMarkUnearnedBtn" class="stat-btn" disabled data-i18n="undoMarkUnearned">+自責点</button>
                </div>
            </div>
        `;

        this.setupPitchEventListeners();
        this.updatePitchDisplay();
    }

    setupPitchEventListeners() {
        const pitchTypeButtons = document.querySelectorAll('.pitch-type-btn');
        pitchTypeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('selected')) {
                    btn.classList.remove('selected'); // toggle off
                } else {
                    pitchTypeButtons.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                }
            });
        });

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
            this.undoLastPitchAction();
        });

        document.getElementById('undoLastAtBatBtn').addEventListener('click', () => {
            this.undoLastAtBat();
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

        const pMarkBtn = document.getElementById('markUnearnedBtn');
        if (pMarkBtn) pMarkBtn.addEventListener('click', () => this.addMarkUnearned());
        const pUndoMarkBtn = document.getElementById('undoMarkUnearnedBtn');
        if (pUndoMarkBtn) pUndoMarkBtn.addEventListener('click', () => this.addUndoMarkUnearned());

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
                ` (${i18n.t(`pos_${batter.position}`)})` : '';

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
        this._updatePitchUndoBtn();
    }

    updateBaserunningSection() {
        const section = document.getElementById('baserunningSection');
        const runnerSelect = document.getElementById('runnerSelect');

        if (!section || !runnerSelect || !gameManager.currentGame) return;

        const runners = gameManager.currentGame.runnersOnBase;
        const hasRunners = runners.first || runners.second || runners.third;

        if (hasRunners) {
            section.hidden = false;

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
            section.hidden = true;
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

            // プレー実行前に状態を記録（undo用）
            if (!this.pitchActionHistory) this.pitchActionHistory = [];
            const g = gameManager.currentGame;
            this.pitchActionHistory.push({
                type: 'baserunning',
                playType,
                snapshot: {
                    runnersOnBase: JSON.parse(JSON.stringify(g.runnersOnBase)),
                    outs: g.outs,
                    homeScore: g.homeScore,
                    awayScore: g.awayScore,
                    inningRuns: gameManager.currentInning?.runs ?? 0
                }
            });

            await this.processBaserunningPlay(playType, runnerBase);
            this._updatePitchUndoBtn();

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

        // 走者を次の塁に進める（自責点ステータスも引き継ぐ）
        runners[runnerBase] = null;

        if (runnerBase === 'first') {
            runners.second = runnerId;
            gameManager.moveRunnerEarnedStatus('first', 'second');
            gameManager.moveRunnerResponsiblePitcher('first', 'second');
        } else if (runnerBase === 'second') {
            runners.third = runnerId;
            gameManager.moveRunnerEarnedStatus('second', 'third');
            gameManager.moveRunnerResponsiblePitcher('second', 'third');
        } else if (runnerBase === 'third') {
            // ホームスチール（得点）：盗塁は自責点
            const wasEarned = gameManager.moveRunnerEarnedStatus('third', null);
            gameManager.moveRunnerResponsiblePitcher('third', null);
            const virtualOuts = (gameManager.currentInning && gameManager.currentInning.virtualOuts) || 0;
            gameManager.addRuns(1, (wasEarned && virtualOuts < 3) ? 1 : 0);
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

        // 全走者1塁進塁（ボークは自責点：自責点ステータスを引き継ぐ）
        if (runners.third) {
            // 3塁走者は得点
            const wasEarned = gameManager.moveRunnerEarnedStatus('third', null);
            gameManager.moveRunnerResponsiblePitcher('third', null);
            const virtualOuts = (gameManager.currentInning && gameManager.currentInning.virtualOuts) || 0;
            gameManager.addRuns(1, (wasEarned && virtualOuts < 3) ? 1 : 0);
            runners.third = null;
        }

        if (runners.second) {
            runners.third = runners.second;
            runners.second = null;
            gameManager.moveRunnerEarnedStatus('second', 'third');
            gameManager.moveRunnerResponsiblePitcher('second', 'third');
        }

        if (runners.first) {
            runners.second = runners.first;
            runners.first = null;
            gameManager.moveRunnerEarnedStatus('first', 'second');
            gameManager.moveRunnerResponsiblePitcher('first', 'second');
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
            const label = this.formatAtBatResult(result);
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
            historyEl.innerHTML = `<p class="no-pitches">まだ投球がありません</p>`;
            return;
        }

        const resultLabels = {
            'ball': i18n.t('pitch_ball'),
            'strike_looking': i18n.t('pitch_strike_looking'),
            'strike_swinging': i18n.t('pitch_strike_swinging'),
            'foul': i18n.t('pitch_foul'),
            'foul_bunt': i18n.t('pitch_foul_bunt'),
            'foul_fly_dropped': i18n.t('pitch_foul_fly_dropped'),
            'hit': i18n.t('pitch_hit'),
            'hit_by_pitch': i18n.t('pitch_hit_by_pitch')
        };

        historyEl.innerHTML = pitches.map((pitch, index) => {
            const typeTag = pitch.pitchType
                ? `<span class="pitch-type-tag">${pitch.pitchType}</span>` : '';
            return `<div class="pitch-item">
                <span class="pitch-number">${index + 1}球目</span>
                ${typeTag}
                <span class="pitch-result">${resultLabels[pitch.result] || pitch.result}</span>
                <span class="pitch-count">${pitch.count.balls}B-${pitch.count.strikes}S</span>
            </div>`;
        }).join('');
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
        ['addHit', 'addError', 'undoInningAction', 'endHalfInning', 'saveInning'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);

                switch(id) {
                    case 'addHit':
                        newBtn.addEventListener('click', () => this.addHit());
                        break;
                    case 'addError':
                        newBtn.addEventListener('click', () => this.addError());
                        break;
                    case 'undoInningAction':
                        newBtn.addEventListener('click', () => this.undoLastInningAction());
                        break;
                    case 'endHalfInning':
                        newBtn.addEventListener('click', () => this.endHalfInning());
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
        gameManager.addRuns(runs);
        if (!this.inningActionHistory) this.inningActionHistory = [];
        this.inningActionHistory.push({ type: 'runs', amount: runs });
        this.updateCurrentInningDisplay();
        this.updateGameDisplay();
        this._updateInningUndoBtn();
    }

    addHit() {
        if (!gameManager.currentInning) return;
        gameManager.addHit();
        if (!this.inningActionHistory) this.inningActionHistory = [];
        this.inningActionHistory.push({ type: 'hit' });
        this.updateCurrentInningDisplay();
        this.updateGameDisplay();
        this._updateInningUndoBtn();
    }

    addError() {
        if (!gameManager.currentInning) return;
        gameManager.addError();
        if (!this.inningActionHistory) this.inningActionHistory = [];
        this.inningActionHistory.push({ type: 'error' });
        this.updateCurrentInningDisplay();
        this.updateGameDisplay();
        this._updateInningUndoBtn();
    }

    undoLastInningAction() {
        if (!gameManager.currentInning || !this.inningActionHistory?.length) return;
        const last = this.inningActionHistory.pop();
        if (last.type === 'runs') {
            gameManager.undoRuns(last.amount);
        } else if (last.type === 'hit') {
            gameManager.undoHit();
        } else if (last.type === 'error') {
            gameManager.undoError();
        } else if (last.type === 'unearned') {
            gameManager.undoMarkUnearned(); // 非自責点化を取り消す（+1自責点）
        } else if (last.type === 'undoUnearned') {
            gameManager.markUnearned();     // undoMarkUnearned を取り消す（-1自責点）
        }
        this.updateCurrentInningDisplay();
        this.updateGameDisplay();
        this._updateInningUndoBtn();
    }

    markUnearned() {
        if (!gameManager.currentInning) return;
        if (!gameManager.markUnearned()) return; // 自責点が0なら何もしない
        if (!this.inningActionHistory) this.inningActionHistory = [];
        this.inningActionHistory.push({ type: 'unearned' });
        this.updateCurrentInningDisplay();
        this._updateInningUndoBtn();
    }

    addMarkUnearned() {
        // batter/pitch モード用（履歴なし、直接調整）
        if (!gameManager.currentInning) return;
        gameManager.markUnearned();
        this.updateCurrentInningDisplay();
    }

    addUndoMarkUnearned() {
        // batter/pitch モード用（履歴なし、直接調整）
        if (!gameManager.currentInning) return;
        gameManager.undoMarkUnearned();
        this.updateCurrentInningDisplay();
    }

    _updateInningUndoBtn() {
        const btn = document.getElementById('undoInningAction');
        if (!btn) return;
        const history = this.inningActionHistory || [];
        if (!history.length) {
            btn.disabled = true;
            btn.textContent = i18n.t('undo') || '取消';
            return;
        }
        btn.disabled = false;
        const last = history[history.length - 1];
        const base = i18n.t('undo') || '取消';
        if (last.type === 'runs') {
            btn.textContent = `${base}: +${last.amount}${i18n.t('points') || '点'}`;
        } else if (last.type === 'hit') {
            btn.textContent = `${base}: H`;
        } else if (last.type === 'error') {
            btn.textContent = `${base}: E`;
        } else if (last.type === 'unearned') {
            btn.textContent = `${base}: ${i18n.t('markUnearned') || '−自責点'}`;
        } else if (last.type === 'undoUnearned') {
            btn.textContent = `${base}: ${i18n.t('undoMarkUnearned') || '+自責点'}`;
        }
    }

    async undoLastAtBat() {
        // 確認ダイアログ
        const msg = i18n.t('undoLastAtBatConfirm') ||
            '最後の打席を取り消してゲームの状態をその打席の直前に戻します。\nよろしいですか？';
        if (!confirm(msg)) return;

        try {
            const snap = await gameManager.undoLastAtBat();

            // イニングが変わっている可能性があるため画面全体を更新
            this.updateGameDisplay();
            this.updateCurrentInningDisplay();

            // 記録レベル別の追加更新
            const level = gameManager.currentGame?.recordingLevel;
            if (level === 'pitch') {
                this.pitchActionHistory = [];
                this._updatePitchUndoBtn();
                this.updatePitchDisplay();
            } else if (level === 'batter') {
                await this.loadAtBatHistory();
                this.updateBatterDisplay();
            }

            const inningStr = `${snap.inningNumber ?? '?'}回${snap.isTopHalf ? '表' : '裏'}`;
            this.showSuccess(
                (i18n.t('undoLastAtBatDone') || '前打席を取り消しました。現在：{inning}')
                    .replace('{inning}', inningStr)
            );
        } catch (err) {
            console.error('前打席取り消しエラー:', err);
            this.showError(err.message || '取り消しに失敗しました');
        }
    }

    updateCurrentInningDisplay() {
        if (!gameManager.currentInning) return;

        const runsEl = document.getElementById('currentInningRuns');
        const hitsEl = document.getElementById('currentInningHits');
        const errorsEl = document.getElementById('currentInningErrors');
        const earnedRunsEl = document.getElementById('currentInningEarnedRuns');

        if (runsEl) runsEl.textContent = gameManager.currentInning.runs;
        if (hitsEl) hitsEl.textContent = gameManager.currentInning.hits;
        if (errorsEl) errorsEl.textContent = gameManager.currentInning.errors;

        const earned = gameManager.currentInning.earnedRuns ?? 0;
        const totalRuns = gameManager.currentInning.runs ?? 0;
        if (earnedRunsEl) earnedRunsEl.textContent = earned;

        const markBtn = document.getElementById('markUnearnedBtn');
        const undoMarkBtn = document.getElementById('undoMarkUnearnedBtn');
        if (markBtn) markBtn.disabled = earned <= 0;
        if (undoMarkBtn) undoMarkBtn.disabled = earned >= totalRuns;
    }

    async endHalfInning() {
        if (!gameManager.currentInning) return;

        // スナップショットを保存（pending_confirm 時の「戻す」ボタン用）
        this._endHalfInningSnap = {
            runs: gameManager.currentInning.runs,
            earnedRuns: gameManager.currentInning.earnedRuns ?? 0,
            hits: gameManager.currentInning.hits,
            errors: gameManager.currentInning.errors,
            homeScore: gameManager.currentGame.homeScore,
            awayScore: gameManager.currentGame.awayScore,
            inningActionHistory: [...(this.inningActionHistory || [])]
        };

        const notes = document.getElementById('inningNotes').value;
        gameManager.currentInning.notes = notes;

        try {
            await gameManager.endHalfInning();
            this.inningActionHistory = [];
            this._updateInningUndoBtn();
            this.updateGameDisplay();
            this.updateCurrentInningDisplay();
            this.loadInningHistory();

            if (document.getElementById('inningNotes')) {
                document.getElementById('inningNotes').value = '';
            }

            // 試合が終了しなかった（次イニングへ進んだ）場合はスナップショット不要
            if (gameManager.currentGame?.status === 'active') {
                this._endHalfInningSnap = null;
            }
        } catch (error) {
            this._endHalfInningSnap = null;
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
        // 階層的選択からの結果を使用
        if (!this.selectedResult) {
            this.showError(i18n.t('errorSelectResult') || '結果を選択してください');
            return;
        }

        const result = this.selectedResult;
        const resultDetail = document.getElementById('resultDetail').value;

        try {
            const batter = gameManager.getCurrentBatter();

            // エラーで打席継続するかチェック
            const batterContinues = this.checkBatterContinues();

            if (batterContinues) {
                // 打席継続の場合（牽制悪送球、ファウルフライ落球）
                // エラー情報のみを処理して、打者はそのまま
                const previousOuts = gameManager.currentGame.outs;

                if (this.currentErrors && this.currentErrors.length > 0) {
                    await this.processErrors();
                }

                // 3アウトチェンジ判定（牽制悪送球で走者がアウトになった場合のみ）
                // ※ファウルフライ落球はボールデッドで走者アウトは発生しない
                if (gameManager.currentGame.outs >= 3 && previousOuts < 3) {
                    // 打席継続フラグを立てる（次イニングは同じ打者）
                    gameManager.currentGame.batterContinuesNextInning = true;

                    await gameManager.saveGame();
                    this.updateGameDisplay();

                    // エラーリストをクリア
                    this.currentErrors = [];
                    this.updateErrorsList();

                    this.showSuccess('エラー処理完了（3アウトチェンジ、打席継続）');

                    // イニング終了処理
                    await gameManager.endHalfInning();
                    this.updateCurrentInningDisplay();
                    this.loadInningHistory();
                    return;
                }

                // 表示を更新
                this.updateGameDisplay();
                this.updateBatterDisplay();

                // エラーリストをクリア（打席は継続）
                this.currentErrors = [];
                this.updateErrorsList();

                this.showSuccess(i18n.t('batter_continues') || '打席継続');
                return;
            }

            // 通常の打席記録処理
            // 打席開始
            await gameManager.startAtBat(batter.name, batter.battingOrder);

            // エラー情報を処理
            if (this.currentErrors && this.currentErrors.length > 0) {
                await this.processErrors();
            }

            // 走者の守備妨害処理
            if (this.selectedInterferingRunner) {
                // 現在の走者状態を保存（妨害処理前）
                const currentRunners = { ...gameManager.currentGame.runnersOnBase };

                // 妨害処理（妨害走者を削除してアウトカウント増加）
                this.processRunnerInterference(this.selectedInterferingRunner);

                // フォースプレイによる走者進塁を処理
                const newRunners = { first: null, second: null, third: null };

                // 妨害していない走者を適切に配置
                // 1塁走者がいる場合は2塁に進塁（打者が1塁に行くため押し出される）
                if (currentRunners.first && this.selectedInterferingRunner !== 'first') {
                    newRunners.second = currentRunners.first;
                }

                // 2塁走者の処理
                if (currentRunners.second && this.selectedInterferingRunner !== 'second') {
                    // 1塁走者がいて3塁走者が妨害した場合は3塁へ進塁（押し出される）
                    if (currentRunners.first && this.selectedInterferingRunner === 'third') {
                        newRunners.third = currentRunners.second;
                    } else {
                        // それ以外は2塁に留まる
                        newRunners.second = currentRunners.second;
                    }
                }

                // 3塁走者の処理（妨害していない場合はそのまま）
                if (currentRunners.third && this.selectedInterferingRunner !== 'third') {
                    newRunners.third = currentRunners.third;
                }

                // 打者を一塁に配置
                newRunners.first = 'batter';

                const interferenceAdvancement = {
                    newRunners: newRunners,
                    runsScored: 0,
                    batterResult: 1,
                    needsAdjustment: false,
                    outsAdded: 0 // アウトは既にprocessRunnerInterferenceで加算済み
                };

                // 打球方向の情報を追加
                const directionDetail = `${i18n.t('runner_interference')} (${i18n.t(this.selectedInterferingRunner + '_base_runner')})`;
                const finalDetail = resultDetail ? `${resultDetail} - ${directionDetail}` : directionDetail;

                await this.finalizeAtBat(result, finalDetail, interferenceAdvancement, batter);
                return;
            }

            // ホームランの場合は柵越えか確認してからフロー分岐
            if (result === 'homerun') {
                const advancement = gameManager.calculateRunnerAdvancement(result);
                this.showHomerunTypeModal(result, resultDetail, advancement, batter);
                return;
            }

            // 走者進塁・得点を自動計算
            const advancement = gameManager.calculateRunnerAdvancement(result);

            // 複雑な状況の場合は調整画面を表示
            if (advancement.needsAdjustment) {
                this.showRunnerAdvancementModal(result, resultDetail, advancement, batter);
            } else {
                // プレー開始前のアウト数を記録
                const previousOuts = gameManager.currentGame.outs - (advancement.outsAdded || 0);

                // ボールインプレー/デッド判定
                const isPlayContinuing = gameManager.isPlayContinuing(result, previousOuts);

                if (isPlayContinuing) {
                    // ボールインプレー：追加プレー確認モーダルを表示
                    this.showAdditionalPlayModal(result, resultDetail, advancement, batter);
                } else {
                    // ボールデッド：即座に完了してバナーを表示
                    await this.finalizeAtBat(result, resultDetail, advancement, batter);
                    this.showBallDeadBanner();
                }
            }

        } catch (error) {
            console.error('打席記録エラー:', error);
            this.showError('打席の記録に失敗しました');
        }
    }

    checkBatterContinues() {
        // エラーがある場合、打席継続するエラーがあるかチェック
        if (!this.currentErrors || this.currentErrors.length === 0) {
            return false;
        }

        return this.currentErrors.some(error => error.config.batterContinues);
    }

    processRunnerInterference(interferingRunner) {
        // 妨害した走者を塁から削除
        if (interferingRunner === 'first') {
            gameManager.currentGame.runnersOnBase.first = null;
        } else if (interferingRunner === 'second') {
            gameManager.currentGame.runnersOnBase.second = null;
        } else if (interferingRunner === 'third') {
            gameManager.currentGame.runnersOnBase.third = null;
        }

        // アウトカウントを増やす
        gameManager.currentGame.outs += 1;

        console.log(`Runner interference: ${interferingRunner} runner is out. Outs: ${gameManager.currentGame.outs}`);
    }

    async processErrors() {
        // 守備チームを特定（攻撃チームの逆）
        const fieldingTeam = gameManager.currentGame.isTopHalf ? 'home' : 'away';

        for (const error of this.currentErrors) {
            // チーム統計にエラーを加算
            gameManager.currentGame.teamStats[fieldingTeam].errors += 1;

            // 選手統計にエラーを加算
            await this.addPlayerError(fieldingTeam, error.position);

            // エラー情報をログに記録（将来の詳細分析用）
            console.log(`Error recorded: ${error.type} by ${error.position} (${fieldingTeam})`);

            // エラーの進塁情報があれば適用
            if (error.advancement) {
                this.applyErrorAdvancement(error.advancement);
            }
        }

        await gameManager.saveGame();
    }

    async addPlayerError(team, position) {
        // 該当ポジションの選手を探してエラー数を加算
        const players = gameManager.currentGame.players[team];
        const player = players.find(p => p.position === position);

        if (player) {
            // 選手の統計情報を初期化（なければ）
            if (!player.stats) {
                player.stats = { errors: 0 };
            }
            if (typeof player.stats.errors === 'undefined') {
                player.stats.errors = 0;
            }

            player.stats.errors += 1;

            // データベースに保存
            await storage.savePlayer(player.toJSON ? player.toJSON() : player);
        }
    }

    applyErrorAdvancement(advancement) {
        const newRunners = { first: null, second: null, third: null };
        let runsScored = 0;
        let outsAdded = 0;

        // 打者走者の処理
        if (advancement.batterRunner) {
            switch (advancement.batterRunner) {
                case '1B':
                    newRunners.first = true;
                    break;
                case '2B':
                    newRunners.second = true;
                    break;
                case '3B':
                    newRunners.third = true;
                    break;
                case 'home':
                    runsScored++;
                    break;
                case 'out':
                    outsAdded++;
                    break;
            }
        }

        // 各走者の処理
        const runners = gameManager.currentGame.runnersOnBase;

        if (runners.first && advancement.first) {
            switch (advancement.first) {
                case 'stay':
                    newRunners.first = true;
                    break;
                case '2B':
                    newRunners.second = true;
                    break;
                case '3B':
                    newRunners.third = true;
                    break;
                case 'home':
                    runsScored++;
                    break;
                case 'out':
                    outsAdded++;
                    break;
            }
        }

        if (runners.second && advancement.second) {
            switch (advancement.second) {
                case 'stay':
                    newRunners.second = true;
                    break;
                case '3B':
                    newRunners.third = true;
                    break;
                case 'home':
                    runsScored++;
                    break;
                case 'out':
                    outsAdded++;
                    break;
            }
        }

        if (runners.third && advancement.third) {
            switch (advancement.third) {
                case 'stay':
                    newRunners.third = true;
                    break;
                case 'home':
                    runsScored++;
                    break;
                case 'out':
                    outsAdded++;
                    break;
            }
        }

        // ゲーム状態を更新
        gameManager.currentGame.runnersOnBase = newRunners;
        gameManager.currentGame.outs += outsAdded;

        if (runsScored > 0) {
            // エラーによる進塁で得点した走者は非自責点（エラーがなければ起きなかった得点）
            gameManager.addRuns(runsScored, 0);
        }
    }

    async finalizeAtBat(result, resultDetail, advancement, batter) {
        const battingTeam = gameManager.currentGame.isTopHalf ? 'away' : 'home';

        // 自責点・責任走者計算のために進塁前の走者状態を保存
        const oldRunners = { ...gameManager.currentGame.runnersOnBase };
        const oldEarnedStatus = { ...(gameManager.currentGame.runnersEarnedStatus || { first: true, second: true, third: true }) };
        const oldResponsiblePitcher = { ...(gameManager.currentGame.runnersResponsiblePitcher || { first: null, second: null, third: null }) };

        // 打者が自責点対象かを判定
        const batterIsEarned = gameManager.isBatterEarned(result);

        // 自責点計算
        const { earnedRunsScored, newEarnedStatus } = gameManager.calculateEarnedAdvancement(
            oldRunners, oldEarnedStatus, advancement.newRunners, advancement.runsScored, batterIsEarned
        );

        // 責任走者担当投手を計算
        const midAtBatChange = gameManager.currentAtBat?.midAtBatPitchChange || null;
        const newResponsiblePitcher = gameManager.calculateResponsiblePitcherAdvancement(
            oldRunners, oldResponsiblePitcher, advancement.newRunners, advancement.runsScored, result, midAtBatChange
        );

        // 走者進塁を適用（自責点ステータス・責任投手も同時に更新）
        gameManager.currentGame.runnersOnBase = advancement.newRunners;
        gameManager.currentGame.runnersEarnedStatus = newEarnedStatus;
        gameManager.currentGame.runnersResponsiblePitcher = newResponsiblePitcher;

        // エラーで出塁した場合は仮想アウトをインクリメント（打者が本来アウトになるべきだった）
        if (!batterIsEarned && advancement.batterResult !== 'out') {
            gameManager.incrementVirtualOuts();
        }

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

        // 打席結果記録（自責点数を含む）
        const outsAppliedByAdvancement = Number(advancement.outsAdded || 0) > 0;
        await gameManager.recordAtBatResult(
            result,
            finalResultDetail,
            advancement.runsScored,
            advancement.runsScored,
            earnedRunsScored,
            { outsAlreadyApplied: outsAppliedByAdvancement }
        );

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

        // 3アウトチェック。recordAtBatResult() がアウトを加算しない経路ではここで半イニングを閉じる。
        if (outsAppliedByAdvancement &&
            gameManager.currentGame.outs >= 3 &&
            gameManager.currentGame.isTopHalf === (battingTeam === 'away')) {
            await gameManager.endHalfInning();
        }

        // 打順進行。半イニング終了後でも、打っていたチームだけを進める。
        gameManager.advanceBattingOrderForTeam(battingTeam);

        // 表示更新
        this.updateGameDisplay();
        this.updateBatterDisplay();
        this.updateResultButtons();
        this.updateCurrentInningDisplay(); // 自責点・仮想アウト表示を更新
        this.loadAtBatHistory();
        this.clearBatterForm();
    }

    showAdditionalPlayModal(result, resultDetail, advancement, batter) {
        // 追加プレー確認用のデータを保存
        this.pendingAtBat = {
            result: result,
            resultDetail: resultDetail,
            advancement: advancement,
            batter: batter
        };

        // モーダルを表示
        const modal = document.getElementById('additionalPlayModal');
        modal.classList.remove('modal--hidden');
        i18n.updatePageContent(); // 翻訳を適用
    }

    hideAdditionalPlayModal() {
        const modal = document.getElementById('additionalPlayModal');
        modal.classList.add('modal--hidden');
    }

    showHomerunTypeModal(result, resultDetail, advancement, batter) {
        this.pendingAtBat = { result, resultDetail, advancement, batter };
        const modal = document.getElementById('homerunTypeModal');
        modal.classList.remove('modal--hidden');
        i18n.updatePageContent();
    }

    hideHomerunTypeModal() {
        const modal = document.getElementById('homerunTypeModal');
        modal.classList.add('modal--hidden');
    }

    async onHomerunFenceOver(isFenceOver) {
        this.hideHomerunTypeModal();

        if (!this.pendingAtBat) return;
        const { result, resultDetail, advancement, batter } = this.pendingAtBat;
        const fromPitch = this.fromPitchInterface;
        this.fromPitchInterface = false;
        this.pendingAtBat = null;

        if (isFenceOver) {
            // 柵越え = ボールデッド：即座に完了してバナーを表示
            await this.finalizeAtBat(result, resultDetail, advancement, batter);
            this.showBallDeadBanner();
        } else {
            // ランニングホームラン = ボールインプレーだが追加プレーは不要
            // 走者は全員生還しており塁上に誰もいないので即完了
            await this.finalizeAtBat(result, resultDetail, advancement, batter);
        }
        if (fromPitch) this.prepareNextBatter();
    }

    // ===== コールドゲームルール =====

    // context: 'setup'（セットアップ画面）or 'modal'（試合中モーダル）
    _mercyIds(context) {
        return context === 'modal'
            ? { presets: '#gameRulesMercyPresets .mercy-preset-btn', display: 'gameRulesMercyDisplay', custom: 'gameRulesMercyCustomEditor', list: 'gameRulesMercyCustomList' }
            : { presets: '#gameSetupForm .mercy-preset-btn', display: 'mercyRuleDisplay', custom: 'mercyRuleCustomEditor', list: 'mercyRuleCustomList' };
    }

    onMercyPresetSelect(btn, context = 'setup') {
        const ids = this._mercyIds(context);
        // 同じコンテキスト内のボタンだけアクティブ切り替え
        document.querySelectorAll(ids.presets).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const preset = btn.dataset.preset;
        const displayEl = document.getElementById(ids.display);
        const customEl  = document.getElementById(ids.custom);

        if (preset === 'none') {
            displayEl.classList.add('modal--hidden');
            customEl.classList.add('modal--hidden');
        } else if (preset === 'custom') {
            displayEl.classList.add('modal--hidden');
            customEl.classList.remove('modal--hidden');
            if (document.getElementById(ids.list).children.length === 0) {
                this.addMercyCustomRow(context);
            }
        } else {
            customEl.classList.add('modal--hidden');
            const rules = MERCY_RULE_PRESETS[preset];
            if (rules && rules.length > 0) {
                displayEl.innerHTML = '<ul>' + rules.map(r =>
                    `<li>${i18n.t('mercyRuleInningsLabel').replace('{inning}', r.inning).replace('{points}', r.points)}</li>`
                ).join('') + '</ul>';
                displayEl.classList.remove('modal--hidden');
            }
        }
    }

    addMercyCustomRow(context = 'setup') {
        const ids = this._mercyIds(context);
        const list = document.getElementById(ids.list);
        const row = document.createElement('div');
        row.className = 'mercy-custom-row';
        row.innerHTML = `
            <input type="number" class="mercy-inning-input" min="1" max="20" value="5" title="${i18n.t('mercyRuleInningInput')}">
            <span>${i18n.t('mercyRuleInningInput')}</span>
            <input type="number" class="mercy-points-input" min="1" max="30" value="10" title="${i18n.t('mercyRulePointsInput')}">
            <span>${i18n.t('mercyRulePointsInput')}</span>
            <button type="button" class="mercy-remove-btn">${i18n.t('mercyRuleRemove')}</button>
        `;
        row.querySelector('.mercy-remove-btn').addEventListener('click', () => row.remove());
        list.appendChild(row);
    }

    _getMercyRuleFrom(context) {
        const ids = this._mercyIds(context);
        const activeBtn = document.querySelector(`${ids.presets}.active`);
        if (!activeBtn) return null;
        const preset = activeBtn.dataset.preset;

        if (preset === 'none') return null;
        if (preset === 'custom') {
            const rows = document.querySelectorAll(`#${ids.list} .mercy-custom-row`);
            const rules = [];
            rows.forEach(row => {
                const inning = parseInt(row.querySelector('.mercy-inning-input').value, 10);
                const points = parseInt(row.querySelector('.mercy-points-input').value, 10);
                if (!isNaN(inning) && !isNaN(points) && inning > 0 && points > 0) {
                    rules.push({ inning, points });
                }
            });
            rules.sort((a, b) => a.inning - b.inning);
            return rules.length > 0 ? rules : null;
        }
        return MERCY_RULE_PRESETS[preset] || null;
    }

    getMercyRuleFromSetup() {
        return this._getMercyRuleFrom('setup');
    }

    // ゲームルール設定モーダル（試合中）
    showGameRulesModal() {
        const modal = document.getElementById('gameRulesModal');
        const ids = this._mercyIds('modal');
        const rules = gameManager.currentGame ? gameManager.currentGame.gameRules : {};

        // 規定回数・試合成立回数を反映
        document.getElementById('regulationInningsInput').value = rules.regulationInnings || 9;
        const minVal = rules.minInningsForOfficial || 5;
        document.getElementById('minInningsForOfficialInput').value = minVal;
        document.querySelectorAll('#gameRulesModal .official-preset-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.min) === minVal);
        });

        // コールドゲームルールUIを初期化
        const currentMercyRule = rules.mercyRule || null;
        this._initModalMercyUI(currentMercyRule, ids);

        modal.classList.remove('modal--hidden');
        i18n.updatePageContent();
    }

    hideGameRulesModal() {
        document.getElementById('gameRulesModal').classList.add('modal--hidden');
    }

    _initModalMercyUI(currentRules, ids) {
        // まずすべてのボタンをリセット
        document.querySelectorAll(ids.presets).forEach(b => b.classList.remove('active'));
        document.getElementById(ids.display).classList.add('modal--hidden');
        document.getElementById(ids.custom).classList.add('modal--hidden');
        document.getElementById(ids.list).innerHTML = '';

        // 現在のルールに一致するプリセットを探す
        let matched = 'none';
        if (currentRules && Array.isArray(currentRules) && currentRules.length > 0) {
            for (const [key, preset] of Object.entries(MERCY_RULE_PRESETS)) {
                if (!preset) continue;
                if (JSON.stringify(preset) === JSON.stringify(currentRules)) {
                    matched = key;
                    break;
                }
            }
            if (matched === 'none') matched = 'custom'; // いずれのプリセットにも一致しない
        }

        const matchedBtn = document.querySelector(`${ids.presets}[data-preset="${matched}"]`);
        if (matchedBtn) {
            matchedBtn.classList.add('active');
            if (matched === 'custom') {
                document.getElementById(ids.custom).classList.remove('modal--hidden');
                // 現在のカスタムルールを行として展開
                if (currentRules) {
                    currentRules.forEach(r => {
                        this._addMercyCustomRowWithValues('modal', r.inning, r.points);
                    });
                }
            } else if (matched !== 'none' && MERCY_RULE_PRESETS[matched]) {
                const rules = MERCY_RULE_PRESETS[matched];
                const displayEl = document.getElementById(ids.display);
                displayEl.innerHTML = '<ul>' + rules.map(r =>
                    `<li>${i18n.t('mercyRuleInningsLabel').replace('{inning}', r.inning).replace('{points}', r.points)}</li>`
                ).join('') + '</ul>';
                displayEl.classList.remove('modal--hidden');
            }
        }
    }

    _addMercyCustomRowWithValues(context, inning, points) {
        const ids = this._mercyIds(context);
        const list = document.getElementById(ids.list);
        const row = document.createElement('div');
        row.className = 'mercy-custom-row';
        row.innerHTML = `
            <input type="number" class="mercy-inning-input" min="1" max="20" value="${inning}" title="${i18n.t('mercyRuleInningInput')}">
            <span>${i18n.t('mercyRuleInningInput')}</span>
            <input type="number" class="mercy-points-input" min="1" max="30" value="${points}" title="${i18n.t('mercyRulePointsInput')}">
            <span>${i18n.t('mercyRulePointsInput')}</span>
            <button type="button" class="mercy-remove-btn">${i18n.t('mercyRuleRemove')}</button>
        `;
        row.querySelector('.mercy-remove-btn').addEventListener('click', () => row.remove());
        list.appendChild(row);
    }

    async saveGameRules() {
        const newRule = this._getMercyRuleFrom('modal');
        const regVal = parseInt(document.getElementById('regulationInningsInput').value);
        const minVal = parseInt(document.getElementById('minInningsForOfficialInput').value);
        const gr = gameManager.currentGame.gameRules;
        gr.mercyRule = newRule;
        if (!isNaN(regVal) && regVal >= 1) gr.regulationInnings = regVal;
        if (!isNaN(minVal) && minVal >= 1) gr.minInningsForOfficial = minVal;
        await gameManager.saveGame();
        this.hideGameRulesModal();
    }

    // ===== 雨天等コールドモーダル =====

    showWeatherCallModal() {
        const info = gameManager.getWeatherCallInfo('weather');
        const { official, homeScore, awayScore, incompleteRuns } = info;
        const { completedFullInnings } = gameManager.getOfficialGameStatus();
        const game = gameManager.currentGame;
        const min = game.gameRules.minInningsForOfficial || 5;
        const isTopHalf = game.isTopHalf;
        const currentInningNumber = game.currentInning;
        const halfStr = isTopHalf ? i18n.t('top') : i18n.t('bottom');

        // 現在の試合状況表示
        document.getElementById('weatherCallStatus').textContent =
            i18n.t('weatherCallInProgress')
                .replace('{inning}', currentInningNumber)
                .replace('{half}', halfStr);

        // 試合成立バッジ
        const badge = document.getElementById('weatherCallOfficialBadge');
        if (official) {
            badge.textContent = i18n.t('weatherCallOfficialMsg')
                .replace('{completed}', completedFullInnings)
                .replace('{min}', min);
            badge.className = 'official-badge official';
        } else {
            badge.textContent = i18n.t('weatherCallNoGameMsg')
                .replace('{completed}', completedFullInnings)
                .replace('{min}', min);
            badge.className = 'official-badge no-game';
        }

        // スコア情報
        const scoreInfo = document.getElementById('weatherCallScoreInfo');
        const awayName = game.awayTeam || i18n.t('awayTeam');
        const homeName = game.homeTeam || i18n.t('homeTeam');
        let html = `<p>${i18n.t('weatherCallCurrentScore')}: ${awayName} ${game.awayScore} - ${game.homeScore} ${homeName}</p>`;
        if (incompleteRuns > 0) {
            html += `<p class="weather-incomplete-note">${i18n.t('weatherCallIncompleteRuns').replace('{runs}', incompleteRuns)}</p>`;
            html += `<p>${i18n.t('weatherCallRevertedScore')}: ${awayName} ${awayScore} - ${homeScore} ${homeName}</p>`;
        }
        scoreInfo.innerHTML = html;

        document.getElementById('weatherCallModal').classList.remove('modal--hidden');
    }

    async confirmWeatherCall() {
        document.getElementById('weatherCallModal').classList.add('modal--hidden');
        await gameManager.applyWeatherCall('weather');
    }

    // ===== タイブレーク設定モーダル =====

    showTiebreakerSetupModal(callback) {
        this._tiebreakerCallback = callback;
        this._tiebreakerRunnerSelection = null;

        // ステップをリセット
        document.getElementById('tiebreakerStep1').classList.remove('modal--hidden');
        document.getElementById('tiebreakerStep2a').classList.add('modal--hidden');
        document.getElementById('tiebreakerStep2b').classList.add('modal--hidden');

        // ランナー選択ボタンをリセット
        document.querySelectorAll('.runner-option-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById('tiebreakerRunnerConfirmBtn').classList.add('modal--hidden');

        // エラー非表示
        document.getElementById('tiebreakerMaxInningsError').classList.add('modal--hidden');

        document.getElementById('tiebreakerSetupModal').classList.remove('modal--hidden');
        i18n.updatePageContent();
    }

    hideTiebreakerSetupModal() {
        document.getElementById('tiebreakerSetupModal').classList.add('modal--hidden');
    }

    onTiebreakerYes() {
        document.getElementById('tiebreakerStep1').classList.add('modal--hidden');
        document.getElementById('tiebreakerStep2a').classList.remove('modal--hidden');
    }

    onTiebreakerNo() {
        const reg = gameManager.currentGame.gameRules.regulationInnings || 9;
        const minInnings = reg + 1;
        const defaultInnings = reg + 3;

        document.getElementById('tiebreakerStep1').classList.add('modal--hidden');

        const label = document.getElementById('tiebreakerMaxInningsLabel');
        label.textContent = i18n.t('tiebreakerMaxInningsLabel').replace('{min}', minInnings);

        const input = document.getElementById('tiebreakerMaxInningsInput');
        input.min = minInnings;
        input.value = defaultInnings;

        document.getElementById('tiebreakerStep2b').classList.remove('modal--hidden');
    }

    async onTiebreakerNone() {
        // 延長なし → 即引き分け終了
        gameManager.currentGame.gameRules.extraInnings = false;
        gameManager.currentGame.gameRules.tiebreaker = 'none';
        await gameManager.saveGame();

        this.hideTiebreakerSetupModal();
        await gameManager.endGame('draw');
        // コールバックは呼ばない（試合終了）
        this._tiebreakerCallback = null;
        if (typeof this.updateDisplay === 'function') this.updateDisplay();
    }

    onTiebreakerRunnerOptionSelect(btn) {
        // 選択を切り替え（1つだけ選択可）
        document.querySelectorAll('.runner-option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const placement = btn.dataset.placement;
        this._tiebreakerRunnerSelection = placement;

        document.getElementById('tiebreakerRunnerConfirmBtn').classList.remove('modal--hidden');
    }

    async onTiebreakerRunnerConfirm() {
        if (!this._tiebreakerRunnerSelection) return;

        const placement = this._tiebreakerRunnerSelection;
        const runners = {
            first:  ['first', 'first_second', 'first_third', 'bases_loaded'].includes(placement),
            second: ['second', 'first_second', 'second_third', 'bases_loaded'].includes(placement),
            third:  ['third', 'first_third', 'second_third', 'bases_loaded'].includes(placement)
        };

        gameManager.currentGame.gameRules.tiebreaker = true;
        gameManager.currentGame.gameRules.tiebreakerRunners = runners;
        await gameManager.saveGame();

        this.hideTiebreakerSetupModal();
        if (this._tiebreakerCallback) {
            await this._tiebreakerCallback();
            this._tiebreakerCallback = null;
        }
    }

    async onTiebreakerMaxInningsConfirm() {
        const reg = gameManager.currentGame.gameRules.regulationInnings || 9;
        const minInnings = reg + 1;
        const input = document.getElementById('tiebreakerMaxInningsInput');
        const val = parseInt(input.value, 10);

        const errorEl = document.getElementById('tiebreakerMaxInningsError');
        if (isNaN(val) || val < minInnings) {
            errorEl.textContent = i18n.t('tiebreakerMaxInningsError').replace('{min}', minInnings);
            errorEl.classList.remove('modal--hidden');
            return;
        }

        errorEl.classList.add('modal--hidden');

        gameManager.currentGame.gameRules.tiebreaker = false;
        gameManager.currentGame.gameRules.maxInnings = val;
        await gameManager.saveGame();

        this.hideTiebreakerSetupModal();
        if (this._tiebreakerCallback) {
            await this._tiebreakerCallback();
            this._tiebreakerCallback = null;
        }
    }

    showBallDeadBanner() {
        const banner = document.getElementById('ballDeadBanner');
        if (banner) {
            banner.classList.remove('ball-dead-banner--hidden');
        }
    }

    hideBallDeadBanner() {
        const banner = document.getElementById('ballDeadBanner');
        if (banner) {
            banner.classList.add('ball-dead-banner--hidden');
        }
    }

    async onAdditionalPlayYes() {
        // 「はい」が選択された場合、追加プレー記録モードに移行
        this.hideAdditionalPlayModal();
        this.showAdditionalPlayRecordingModal();
    }

    showAdditionalPlayRecordingModal() {
        if (!this.pendingAtBat) return;

        // 追加プレーログを初期化
        this.additionalPlays = [];

        // 現在の状況表示を更新
        this.updateAdditionalPlaySituation();

        // 追加プレー選択肢を生成
        this.renderAdditionalPlayOptions();

        const modal = document.getElementById('additionalPlayRecordingModal');
        modal.classList.remove('modal--hidden');
        i18n.updatePageContent();
    }

    hideAdditionalPlayRecordingModal() {
        const modal = document.getElementById('additionalPlayRecordingModal');
        modal.classList.add('modal--hidden');
    }

    updateAdditionalPlaySituation() {
        const situationEl = document.getElementById('additionalPlaySituation');
        if (!situationEl) return;

        const game = gameManager.currentGame;
        const runners = game.runnersOnBase;
        const outs = game.outs;

        const runnerTexts = [];
        if (runners.first) runnerTexts.push(i18n.t('first_base') || '1塁');
        if (runners.second) runnerTexts.push(i18n.t('second_base') || '2塁');
        if (runners.third) runnerTexts.push(i18n.t('third_base') || '3塁');

        const runnersDisplay = runnerTexts.length > 0
            ? runnerTexts.join(', ')
            : (i18n.t('no_runners') || '走者なし');

        const logHtml = this.additionalPlays && this.additionalPlays.length > 0
            ? `<div class="additional-play-log">${this.additionalPlays.map((play, idx) => `
                <div class="additional-play-log-item">
                    <span>${play.description}</span>
                    <button class="delete-log-btn" data-idx="${idx}" title="削除">×</button>
                </div>
            `).join('')}</div>`
            : '';

        situationEl.innerHTML = `
            <div>${outs}${i18n.t('outs')} / ${runnersDisplay}</div>
            ${logHtml}
        `;

        // ログ削除ボタンのイベント設定
        situationEl.querySelectorAll('.delete-log-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                this.removeAdditionalPlay(idx);
            });
        });
    }

    removeAdditionalPlay(idx) {
        const play = this.additionalPlays[idx];
        if (play && play.revert) play.revert();
        this.additionalPlays.splice(idx, 1);
        this.updateAdditionalPlaySituation();
        this.renderAdditionalPlayOptions();
        this.updateGameDisplay();
    }

    renderAdditionalPlayOptions() {
        const optionsEl = document.getElementById('additionalPlayOptions');
        if (!optionsEl) return;

        const game = gameManager.currentGame;
        const runners = game.runnersOnBase;
        const hasRunners = runners.first || runners.second || runners.third;

        optionsEl.innerHTML = `
            <div class="additional-play-type-btns">
                <button class="additional-play-type-btn" data-type="runner_advance" ${!hasRunners ? 'disabled' : ''}>
                    ${i18n.t('runner_advance') || '走者進塁'}
                </button>
                <button class="additional-play-type-btn" data-type="runner_out" ${!hasRunners ? 'disabled' : ''}>
                    ${i18n.t('runner_out') || '走者アウト'}
                </button>
                <button class="additional-play-type-btn" data-type="error_play">
                    ${i18n.t('error_play') || '送球エラー'}
                </button>
            </div>
            <div id="additionalPlayDetailArea"></div>
        `;

        optionsEl.querySelectorAll('.additional-play-type-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                optionsEl.querySelectorAll('.additional-play-type-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.showAdditionalPlayDetail(btn.dataset.type);
            });
        });
    }

    showAdditionalPlayDetail(type) {
        const detailArea = document.getElementById('additionalPlayDetailArea');
        if (!detailArea) return;

        const game = gameManager.currentGame;
        const runners = game.runnersOnBase;

        const runnerOptions = [
            runners.first ? `<option value="first">${i18n.t('first_base') || '1塁走者'}</option>` : '',
            runners.second ? `<option value="second">${i18n.t('second_base') || '2塁走者'}</option>` : '',
            runners.third ? `<option value="third">${i18n.t('third_base') || '3塁走者'}</option>` : '',
        ].filter(Boolean).join('');

        if (type === 'runner_advance') {
            detailArea.innerHTML = `
                <div class="additional-play-detail">
                    <div class="input-group">
                        <label>${i18n.t('which_runner') || 'どの走者'}:</label>
                        <select id="advanceRunnerBase">${runnerOptions}</select>
                    </div>
                    <div class="input-group">
                        <label>${i18n.t('advance_to') || '進塁先'}:</label>
                        <select id="advanceToBase">
                            <option value="next">次の塁</option>
                            <option value="home">本塁（得点）</option>
                        </select>
                    </div>
                    <button class="primary-btn apply-additional-play-btn" style="margin-top:0.5rem">追加</button>
                </div>
            `;
            detailArea.querySelector('.apply-additional-play-btn').addEventListener('click', () => {
                this.applyRunnerAdvance();
            });
        } else if (type === 'runner_out') {
            detailArea.innerHTML = `
                <div class="additional-play-detail">
                    <div class="input-group">
                        <label>${i18n.t('which_runner') || 'どの走者'}:</label>
                        <select id="outRunnerBase">${runnerOptions}</select>
                    </div>
                    <button class="primary-btn apply-additional-play-btn" style="margin-top:0.5rem">追加</button>
                </div>
            `;
            detailArea.querySelector('.apply-additional-play-btn').addEventListener('click', () => {
                this.applyRunnerOut();
            });
        } else if (type === 'error_play') {
            detailArea.innerHTML = `
                <div class="additional-play-detail">
                    <div class="input-group">
                        <label>${i18n.t('error_fielder') || 'エラーした野手'}:</label>
                        <select id="errorFielder">
                            <option value="1">1 ${i18n.t('pitcher') || '投手'}</option>
                            <option value="2">2 ${i18n.t('catcher') || '捕手'}</option>
                            <option value="3">3 ${i18n.t('firstBaseman') || '一塁手'}</option>
                            <option value="4">4 ${i18n.t('secondBaseman') || '二塁手'}</option>
                            <option value="5">5 ${i18n.t('thirdBaseman') || '三塁手'}</option>
                            <option value="6">6 ${i18n.t('shortstop') || '遊撃手'}</option>
                            <option value="7">7 ${i18n.t('leftField') || '左翼手'}</option>
                            <option value="8">8 ${i18n.t('centerField') || '中堅手'}</option>
                            <option value="9">9 ${i18n.t('rightField') || '右翼手'}</option>
                        </select>
                    </div>
                    <button class="primary-btn apply-additional-play-btn" style="margin-top:0.5rem">追加</button>
                </div>
            `;
            detailArea.querySelector('.apply-additional-play-btn').addEventListener('click', () => {
                this.applyErrorPlay();
            });
        }
    }

    applyRunnerAdvance() {
        const fromBase = document.getElementById('advanceRunnerBase')?.value;
        const toBase = document.getElementById('advanceToBase')?.value;
        if (!fromBase) return;

        const game = gameManager.currentGame;
        const runners = game.runnersOnBase;
        const runnerData = runners[fromBase];
        if (!runnerData) return;

        const nextBaseMap = { first: 'second', second: 'third', third: 'home' };
        const actualTo = toBase === 'next' ? nextBaseMap[fromBase] : 'home';

        const prevRunnerValue = runnerData;

        // 走者を移動
        runners[fromBase] = null;
        if (actualTo === 'home') {
            gameManager.addRuns(1);
        } else {
            runners[actualTo] = prevRunnerValue;
        }

        const fromLabel = i18n.t(fromBase + '_base') || fromBase;
        const toLabel = actualTo === 'home' ? '本塁（得点）' : (i18n.t(actualTo + '_base') || actualTo);
        const description = `${fromLabel} → ${toLabel}`;

        this.additionalPlays.push({
            type: 'runner_advance',
            description,
            revert: () => {
                runners[fromBase] = prevRunnerValue;
                if (actualTo === 'home') {
                    gameManager.addRuns(-1);
                } else {
                    runners[actualTo] = null;
                }
            }
        });

        this.updateAdditionalPlaySituation();
        this.renderAdditionalPlayOptions();
        this.updateGameDisplay();
    }

    applyRunnerOut() {
        const fromBase = document.getElementById('outRunnerBase')?.value;
        if (!fromBase) return;

        const game = gameManager.currentGame;
        const runners = game.runnersOnBase;
        const runnerData = runners[fromBase];
        if (!runnerData) return;

        runners[fromBase] = null;
        game.outs++;

        const fromLabel = i18n.t(fromBase + '_base') || fromBase;
        const description = `${fromLabel}走者 アウト`;

        this.additionalPlays.push({
            type: 'runner_out',
            description,
            revert: () => {
                runners[fromBase] = runnerData;
                game.outs--;
            }
        });

        this.updateAdditionalPlaySituation();
        this.renderAdditionalPlayOptions();
        this.updateGameDisplay();
    }

    applyErrorPlay() {
        const fielder = document.getElementById('errorFielder')?.value;
        if (!fielder) return;

        const description = `${fielder}番野手 ${i18n.t('error') || 'エラー'}`;

        this.additionalPlays.push({
            type: 'error_play',
            description,
            revert: () => {}
        });

        this.updateAdditionalPlaySituation();
    }

    async onCompleteAdditionalPlay() {
        // 追加プレー記録を完了してプレーを終了
        this.hideAdditionalPlayRecordingModal();

        if (!this.pendingAtBat) {
            // 投球モード（pendingAtBatなし）：打席は継続中なので表示更新のみ
            this.additionalPlays = [];
            this.updateGameDisplay();
            this.updatePitchDisplay();
            return;
        }

        // 打席完了モード
        const { result, resultDetail, advancement, batter } = this.pendingAtBat;
        const fromPitch = this.fromPitchInterface;
        this.fromPitchInterface = false;

        // 追加プレーで変更されたゲーム状態を反映してfinalizeAtBat
        const updatedAdvancement = {
            ...advancement,
            newRunners: { ...gameManager.currentGame.runnersOnBase }
        };

        await this.finalizeAtBat(result, resultDetail, updatedAdvancement, batter);
        if (fromPitch) this.prepareNextBatter();

        // データをクリア
        this.pendingAtBat = null;
        this.additionalPlays = [];
    }

    showPitchAdditionalPlayModal() {
        // 投球モード用：pendingAtBatなしで追加プレー確認モーダルを表示
        this.pendingAtBat = null;
        const modal = document.getElementById('additionalPlayModal');
        modal.classList.remove('modal--hidden');
        i18n.updatePageContent();
    }

    async onAdditionalPlayNo() {
        // 「いいえ」が選択された場合、プレーを完了
        this.hideAdditionalPlayModal();

        if (!this.pendingAtBat) {
            // 投球モード（ピッチ中の走者なしの確認）：何もせず終了
            return;
        }

        // 打席完了モード
        const { result, resultDetail, advancement, batter } = this.pendingAtBat;
        const fromPitch = this.fromPitchInterface;
        this.fromPitchInterface = false;
        this.pendingAtBat = null;

        await this.finalizeAtBat(result, resultDetail, advancement, batter);
        if (fromPitch) this.prepareNextBatter();
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
        return i18n.t(result) || result;
    }

    formatPosition(positionCode) {
        return i18n.t(`pos_${positionCode}`) || positionCode;
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
        if (!confirm(i18n.t('confirmDeleteAtBat'))) {
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
                                            ${needsDetail ? `<span class="incomplete-badge" data-i18n="incompletePlayerInfo">${i18n.t('incompletePlayerInfo')}</span>` : ''}
                                            <div class="player-main-info">
                                                <span class="player-order">${player.battingOrder}${i18n.t('battingOrderSuffix')}</span>
                                                <span class="player-name-display">${player.name || i18n.t('notSet')}</span>
                                                <span class="player-position-display">${player.position || '-'}</span>
                                            </div>
                                            <button class="edit-player-btn" data-player-id="${player.id}" data-team="home">
                                                <span data-i18n="${needsDetail ? 'fillPlayerDetails' : 'edit'}">${needsDetail ? i18n.t('fillPlayerDetails') : i18n.t('edit')}</span>
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
                                            ${needsDetail ? `<span class="incomplete-badge" data-i18n="incompletePlayerInfo">${i18n.t('incompletePlayerInfo')}</span>` : ''}
                                            <div class="player-main-info">
                                                <span class="player-order">${player.battingOrder}${i18n.t('battingOrderSuffix')}</span>
                                                <span class="player-name-display">${player.name || i18n.t('notSet')}</span>
                                                <span class="player-position-display">${player.position || '-'}</span>
                                            </div>
                                            <button class="edit-player-btn" data-player-id="${player.id}" data-team="away">
                                                <span data-i18n="${needsDetail ? 'fillPlayerDetails' : 'edit'}">${needsDetail ? i18n.t('fillPlayerDetails') : i18n.t('edit')}</span>
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

            const result = selectedResult.dataset.result;

            const selectedTypeEl = document.querySelector('.pitch-type-btn.selected');
            const selectedPitchType = selectedTypeEl ? selectedTypeEl.dataset.type : null;

            // 死球の場合は特別処理（打席完了）
            if (result === 'hit_by_pitch') {
                await this.processHitByPitch(selectedPitchType);
                return;
            }

            // ファウルフライ落球の場合は特別処理（打席継続、エラー記録）
            if (result === 'foul_fly_dropped') {
                await this.processFoulFlyDropped(selectedPitchType);
                return;
            }

            const pitchData = {
                pitchType: selectedPitchType,
                velocity: null,
                location: null,
                result: result
            };

            await gameManager.recordPitch(pitchData);

            // アクション履歴に積む
            if (!this.pitchActionHistory) this.pitchActionHistory = [];
            this.pitchActionHistory.push({ type: 'pitch', result });
            this._updatePitchUndoBtn();

            // 表示更新
            this.updateGameDisplay();
            this.updatePitchDisplay();
            this.clearPitchForm();

            // ボールデッド投球：ファウル系はバナーを表示して終了
            const deadBallPitches = ['foul', 'foul_bunt'];
            if (deadBallPitches.includes(result)) {
                this.showBallDeadBanner();
                return;
            }

            // 四球・三振・打球の場合は特別処理（at-bat完了フローへ）
            if (gameManager.currentGame.balls >= 4) {
                // 四球の場合は四球カテゴリのみ表示
                this.showAtBatCompletionPrompt('walk');
            } else if (gameManager.currentGame.strikes >= 3) {
                // 三振の場合は三振結果のみ表示（見逃し/空振り/スリーバント失敗を区別）
                if (result === 'strike_looking') {
                    this.showAtBatCompletionPrompt('strikeout_looking');
                } else if (result === 'strike_swinging') {
                    this.showAtBatCompletionPrompt('strikeout_swinging');
                } else if (result === 'foul_bunt') {
                    // 2ストライク時のバントファウル = スリーバント失敗
                    this.showAtBatCompletionPrompt('strikeout_bunt');
                }
            } else if (result === 'hit') {
                // フェア（打球）の場合は打球系の結果のみ表示（at-batフローでボールインプレー/デッド判定）
                this.showFairBallResults();
            } else {
                // ボールインプレー投球（ball / strike_looking / strike_swinging で打席未完了）
                // 走者がいる場合のみ追加プレー確認を表示
                const runners = gameManager.currentGame.runnersOnBase;
                if (runners.first || runners.second || runners.third) {
                    this.showPitchAdditionalPlayModal();
                }
            }

        } catch (error) {
            console.error('投球記録エラー:', error);
            this.showError('投球の記録に失敗しました');
        }
    }

    async processHitByPitch() {
        // 死球処理
        const game = gameManager.currentGame;

        // 走者を1塁進塁
        const currentRunners = { ...game.runnersOnBase };
        const newRunners = { first: null, second: null, third: null };
        let runsScored = 0;

        // 満塁の場合は3塁走者が得点
        if (currentRunners.first && currentRunners.second && currentRunners.third) {
            runsScored = 1;
            newRunners.third = currentRunners.second;
            newRunners.second = currentRunners.first;
            newRunners.first = game.currentBatter;
        }
        // 1・2塁の場合
        else if (currentRunners.first && currentRunners.second) {
            newRunners.third = currentRunners.second;
            newRunners.second = currentRunners.first;
            newRunners.first = game.currentBatter;
        }
        // 1塁のみの場合
        else if (currentRunners.first) {
            newRunners.third = currentRunners.third;
            newRunners.second = currentRunners.first;
            newRunners.first = game.currentBatter;
        }
        // 走者なしまたは2塁・3塁のみの場合
        else {
            newRunners.third = currentRunners.third;
            newRunners.second = currentRunners.second;
            newRunners.first = game.currentBatter;
        }

        game.runnersOnBase = newRunners;

        if (runsScored > 0) {
            if (game.isTopHalf) {
                game.awayScore += runsScored;
            } else {
                game.homeScore += runsScored;
            }
        }

        await gameManager.recordAtBatResult('hit_by_pitch', '死球', runsScored, 0);

        this.updateGameDisplay();
        this.showSuccess('死球で出塁しました');
    }

    async processFoulFlyDropped(pitchType = null) {
        // ファウルフライ落球処理（打席継続、エラー記録）
        // 野手選択モーダルを表示
        this.showFoulFlyDroppedPositionModal(pitchType);
    }

    showFoulFlyDroppedPositionModal(pitchType = null) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'foulFlyDroppedPositionModal';
        const positions = BASEBALL_CONFIG.POSITIONS;

        modal.innerHTML = `
            <div class="modal-content">
                <h3>ファウルフライ落球 - 守備位置選択</h3>
                <p>エラーした守備位置を選択してください</p>
                <div class="position-buttons">
                    ${Object.keys(positions).map(key => `
                        <button class="position-btn" data-position="${key}">
                            ${i18n.t(positions[key].label)}
                        </button>
                    `).join('')}
                </div>
                <button class="secondary-btn" id="cancelFoulFlyDroppedPosition">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 守備位置選択
        modal.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const position = btn.dataset.position;
                modal.remove();
                await this.completeFoulFlyDropped(position, pitchType);
            });
        });

        // キャンセル
        document.getElementById('cancelFoulFlyDroppedPosition').addEventListener('click', () => {
            modal.remove();
        });
    }

    async completeFoulFlyDropped(errorPosition, pitchType = null) {
        const game = gameManager.currentGame;

        // 投球を記録
        const pitchData = {
            pitchType: pitchType,
            velocity: null,
            location: null,
            result: 'foul_fly_dropped'
        };
        await gameManager.recordPitch(pitchData);

        // エラーを記録（守備側チームのエラー数を増やす）
        const fieldingTeam = game.isTopHalf ? 'home' : 'away';
        game.teamStats[fieldingTeam].errors++;

        // エラーした選手の個人エラー数を増やす
        const fieldingPlayers = game.players[fieldingTeam];
        const errorPlayer = fieldingPlayers.find(p => p.position === errorPosition && p.isActive);
        if (errorPlayer) {
            errorPlayer.stats.errors++;
        }

        // ファウルフライ落球：打者は本来アウトになるべきだった → 仮想アウトをインクリメント
        gameManager.incrementVirtualOuts();
        // 当打席内のファウルフライ落球回数を記録（打席途中投手交代のカウント制約用）
        if (gameManager.currentAtBat) {
            gameManager.currentAtBat.foulFlyDroppedCount = (gameManager.currentAtBat.foulFlyDroppedCount || 0) + 1;
        }

        await gameManager.saveGame();

        // 表示更新
        this.updateGameDisplay();
        this.updatePitchDisplay();
        this.clearPitchForm();

        const positionLabel = i18n.t(BASEBALL_CONFIG.POSITIONS[errorPosition].label);
        this.showSuccess(`ファウルフライ落球（${positionLabel}のエラー）。打席継続です。`);

        // ボールデッド：バナーを表示
        this.showBallDeadBanner();
    }

    // 犠打の結果選択モーダルを表示
    showSacrificeBuntOutcomeModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('selectSacrificeOutcome')}</h3>
                <div class="sacrifice-outcome-options">
                    <button class="sacrifice-outcome-btn" data-outcome="success">${i18n.t('sacrificeBuntSuccess')}</button>
                    <button class="sacrifice-outcome-btn" data-outcome="failure">${i18n.t('sacrificeBuntFailure')}</button>
                    <button class="sacrifice-outcome-btn" data-outcome="all_safe">${i18n.t('allSafe')}</button>
                </div>
                <button id="cancelSacrificeOutcome" class="secondary-btn">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 結果選択
        modal.querySelectorAll('.sacrifice-outcome-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const outcome = btn.dataset.outcome;
                modal.remove();
                if (outcome === 'success') {
                    this.handleSacrificeBuntSuccess();
                } else if (outcome === 'failure') {
                    this.handleSacrificeBuntFailure();
                } else if (outcome === 'all_safe') {
                    this.handleSacrificeBuntAllSafe();
                }
            });
        });

        // キャンセル
        document.getElementById('cancelSacrificeOutcome').addEventListener('click', () => {
            modal.remove();
        });
    }

    // 送りバント成功の処理
    handleSacrificeBuntSuccess() {
        const game = gameManager.currentGame;
        const runners = { ...game.runnersOnBase };

        // 1塁・3塁の特殊ケース：3塁走者の進塁有無を確認
        if (runners.first && !runners.second && runners.third) {
            this.showThirdRunnerAdvanceChoice(runners);
        } else {
            // 通常ケース：全走者を1つ進塁させた状態を作成
            const advancedRunners = {
                first: null,
                second: runners.first,
                third: runners.second
            };

            // 3塁走者がいた場合は得点
            const runsScored = runners.third ? 1 : 0;

            // 進塁確認モーダルを表示
            this.showSacrificeAdvancementModal(advancedRunners, runsScored);
        }
    }

    // 1塁・3塁での3塁走者進塁選択モーダル
    showThirdRunnerAdvanceChoice(runners) {
        const modal = document.createElement('div');
        modal.className = 'modal';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('thirdRunnerAdvanceCheck')}</h3>
                <p>${i18n.t('currentSituation')}: ${i18n.t('firstAndThird')}</p>
                <p>${i18n.t('thirdRunner')} ${runners.third.name}${i18n.t('thirdRunnerAdvanceQuestion')}</p>
                <div class="third-runner-choice">
                    <button id="thirdRunnerScored" class="primary-btn">${i18n.t('thirdRunnerScored')}</button>
                    <button id="thirdRunnerStayed" class="secondary-btn">${i18n.t('thirdRunnerStayed')}</button>
                </div>
                <button id="cancelThirdChoice" class="tertiary-btn">${i18n.t('cancel')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 3塁走者が本塁へ進塁（スクイズ）
        document.getElementById('thirdRunnerScored').addEventListener('click', () => {
            modal.remove();
            const advancedRunners = {
                first: null,
                second: runners.first,
                third: null  // 3塁走者は得点
            };
            this.showSacrificeAdvancementModal(advancedRunners, 1);  // 1点
        });

        // 3塁走者が留まる（1塁走者のみ2塁へ）
        document.getElementById('thirdRunnerStayed').addEventListener('click', () => {
            modal.remove();
            const advancedRunners = {
                first: null,
                second: runners.first,
                third: runners.third  // 3塁走者はそのまま
            };
            this.showSacrificeAdvancementModal(advancedRunners, 0);  // 0点
        });

        // キャンセル
        document.getElementById('cancelThirdChoice').addEventListener('click', () => {
            modal.remove();
        });
    }

    // 送りバント成功の進塁確認モーダル
    showSacrificeAdvancementModal(baseRunners, initialRuns) {
        const modal = document.createElement('div');
        modal.className = 'modal';

        const runnerDisplay = this.formatRunnersDisplay(baseRunners);

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('advancementConfirm')}</h3>
                <p>${i18n.t('currentState')}</p>
                <div class="runners-display">${runnerDisplay}</div>
                <p>${i18n.t('runsScored')}: ${initialRuns}</p>
                <div class="advancement-options">
                    <button id="confirmAdvancement" class="primary-btn">${i18n.t('confirmAsIs')}</button>
                    <button id="additionalAdvancement" class="secondary-btn">${i18n.t('additionalAdvancement')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // このまま確定
        document.getElementById('confirmAdvancement').addEventListener('click', async () => {
            modal.remove();
            await this.completeSacrificeBuntSuccess(baseRunners, initialRuns);
        });

        // 追加進塁あり
        document.getElementById('additionalAdvancement').addEventListener('click', () => {
            modal.remove();
            this.showAdditionalAdvancementModal(baseRunners, initialRuns);
        });
    }

    // 走者表示のフォーマット
    formatRunnersDisplay(runners) {
        const display = [];
        if (runners.first) display.push('一塁: ' + runners.first.name);
        if (runners.second) display.push('二塁: ' + runners.second.name);
        if (runners.third) display.push('三塁: ' + runners.third.name);
        return display.length > 0 ? display.join('<br>') : '走者なし';
    }

    // 追加進塁モーダル
    showAdditionalAdvancementModal(currentRunners, currentRuns) {
        const modal = document.createElement('div');
        modal.className = 'modal';

        // 走者選択UI生成
        const runnerSelects = this.generateSacrificeRunnerSelects(currentRunners);

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('advancementSetup')}</h3>
                <p>${i18n.t('selectFinalPositions')}</p>
                <div class="runner-advancement-settings">
                    ${runnerSelects}
                </div>
                <div class="runs-input">
                    <label>${i18n.t('runsCount')}</label>
                    <input type="number" id="additionalRuns" min="0" max="3" value="${currentRuns}">
                </div>
                <div class="modal-buttons">
                    <button id="confirmAdditionalAdvancement" class="primary-btn">${i18n.t('confirm')}</button>
                    <button id="cancelAdditionalAdvancement" class="secondary-btn">${i18n.t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('confirmAdditionalAdvancement').addEventListener('click', async () => {
            const finalRunners = this.getSelectedRunners(modal);
            const finalRuns = parseInt(document.getElementById('additionalRuns').value);
            modal.remove();
            await this.completeSacrificeBuntSuccess(finalRunners, finalRuns);
        });

        document.getElementById('cancelAdditionalAdvancement').addEventListener('click', () => {
            modal.remove();
        });
    }

    // 犠打用の走者選択UI生成
    generateSacrificeRunnerSelects(currentRunners) {
        let html = '';

        if (currentRunners.first) {
            html += `
                <div class="runner-select">
                    <label>${currentRunners.first.name}${i18n.t('destination')}</label>
                    <select id="runner-first-destination">
                        <option value="out">${i18n.t('batterOut')}</option>
                        <option value="first">${i18n.t('first')}</option>
                        <option value="second" selected>${i18n.t('second')}</option>
                        <option value="third">${i18n.t('third')}</option>
                        <option value="home">${i18n.t('homeScore')}</option>
                    </select>
                </div>
            `;
        }

        if (currentRunners.second) {
            html += `
                <div class="runner-select">
                    <label>${currentRunners.second.name}${i18n.t('destination')}</label>
                    <select id="runner-second-destination">
                        <option value="out">${i18n.t('batterOut')}</option>
                        <option value="second">${i18n.t('second')}</option>
                        <option value="third" selected>${i18n.t('third')}</option>
                        <option value="home">${i18n.t('homeScore')}</option>
                    </select>
                </div>
            `;
        }

        if (currentRunners.third) {
            html += `
                <div class="runner-select">
                    <label>${currentRunners.third.name}${i18n.t('destination')}</label>
                    <select id="runner-third-destination">
                        <option value="out">${i18n.t('batterOut')}</option>
                        <option value="third">${i18n.t('third')}</option>
                        <option value="home" selected>${i18n.t('homeScore')}</option>
                    </select>
                </div>
            `;
        }

        return html;
    }

    // モーダルから選択された走者状況を取得
    getSelectedRunners(modal) {
        const game = gameManager.currentGame;
        const originalRunners = game.runnersOnBase;
        const newRunners = {
            first: null,
            second: null,
            third: null
        };

        // 元の一塁走者
        if (originalRunners.first) {
            const destination = modal.querySelector('#runner-first-destination')?.value;
            if (destination === 'first') newRunners.first = originalRunners.first;
            else if (destination === 'second') newRunners.second = originalRunners.first;
            else if (destination === 'third') newRunners.third = originalRunners.first;
        }

        // 元の二塁走者
        if (originalRunners.second) {
            const destination = modal.querySelector('#runner-second-destination')?.value;
            if (destination === 'second') newRunners.second = originalRunners.second;
            else if (destination === 'third') newRunners.third = originalRunners.second;
        }

        // 元の三塁走者はホームか三塁のみ（一塁・二塁には戻れない）

        return newRunners;
    }

    // 送りバント成功の確定処理
    async completeSacrificeBuntSuccess(finalRunners, finalRuns) {
        const game = gameManager.currentGame;
        const batter = gameManager.getCurrentBatter();
        const resultDetail = document.getElementById('atBatResultDetail').value;

        // 走者を更新
        game.runnersOnBase = finalRunners;

        // 打席結果を記録
        await gameManager.recordAtBatResult('sacrifice_bunt', resultDetail, finalRuns, 0);
        gameManager.advanceBattingOrder();

        await gameManager.saveGame();

        this.showSuccess(i18n.t('sacrificeBuntSuccessRecorded'));
        this.updateGameDisplay();
        this.prepareNextBatter();

        // 3アウトチェック
        if (game.outs >= 3) {
            await gameManager.endHalfInning();
        }
    }

    // 送りバント失敗の処理（走者がアウト）
    handleSacrificeBuntFailure() {
        const game = gameManager.currentGame;
        const runners = game.runnersOnBase;

        // アウトになった走者と打者の状況を選択するモーダルを表示
        this.showSacrificeBuntFailureModal(runners);
    }

    // 送りバント失敗モーダル
    showSacrificeBuntFailureModal(runners) {
        const modal = document.createElement('div');
        modal.className = 'modal';

        const runnerOptions = this.generateFailureRunnerOptions(runners);

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('sacrificeBuntFailureTitle')}</h3>
                <p>${i18n.t('selectOutRunnersAndBatter')}</p>

                <div class="out-runners-selection">
                    <label>${i18n.t('outRunners')}</label>
                    ${runnerOptions}
                </div>

                <div class="batter-status-selection">
                    <label>${i18n.t('batterStatus')}</label>
                    <select id="batterStatusSelect">
                        <option value="out">${i18n.t('batterOut')}</option>
                        <option value="safe_first">${i18n.t('batterSafeFirst')}</option>
                    </select>
                </div>

                <div class="out-count-selection">
                    <label>${i18n.t('outCountIncrease')}</label>
                    <select id="failureOutCount">
                        <option value="1">${i18n.t('oneOut')}</option>
                        <option value="2" selected>${i18n.t('twoOuts')}</option>
                        <option value="3">${i18n.t('threeOuts')}</option>
                    </select>
                </div>

                <div class="modal-buttons">
                    <button id="confirmSacrificeFailure" class="primary-btn">${i18n.t('confirm')}</button>
                    <button id="cancelSacrificeFailure" class="secondary-btn">${i18n.t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('confirmSacrificeFailure').addEventListener('click', async () => {
            const outRunners = this.getSelectedOutRunners(modal);
            const batterStatus = document.getElementById('batterStatusSelect').value;
            const outCount = parseInt(document.getElementById('failureOutCount').value);
            modal.remove();
            await this.completeSacrificeBuntFailure(outRunners, batterStatus, outCount);
        });

        document.getElementById('cancelSacrificeFailure').addEventListener('click', () => {
            modal.remove();
        });
    }

    // 送りバント失敗用の走者選択オプション生成
    generateFailureRunnerOptions(runners) {
        let html = '<div class="runner-checkboxes">';

        if (runners.first) {
            html += `
                <label>
                    <input type="checkbox" class="out-runner-checkbox" data-base="first">
                    ${i18n.t('firstRunner')} ${runners.first.name}
                </label><br>
            `;
        }

        if (runners.second) {
            html += `
                <label>
                    <input type="checkbox" class="out-runner-checkbox" data-base="second">
                    ${i18n.t('secondRunner')} ${runners.second.name}
                </label><br>
            `;
        }

        if (runners.third) {
            html += `
                <label>
                    <input type="checkbox" class="out-runner-checkbox" data-base="third">
                    ${i18n.t('thirdRunner')} ${runners.third.name}
                </label><br>
            `;
        }

        html += '</div>';
        return html;
    }

    // 選択されたアウト走者を取得
    getSelectedOutRunners(modal) {
        const checkboxes = modal.querySelectorAll('.out-runner-checkbox:checked');
        const outRunners = [];
        checkboxes.forEach(cb => {
            outRunners.push(cb.dataset.base);
        });
        return outRunners;
    }

    // 送りバント失敗の確定処理
    async completeSacrificeBuntFailure(outRunners, batterStatus, outCount) {
        const game = gameManager.currentGame;
        const batter = gameManager.getCurrentBatter();
        const resultDetail = document.getElementById('atBatResultDetail').value;

        // アウトカウント増加
        game.outs += outCount;

        // アウトになった走者を塁から削除
        const newRunners = { ...game.runnersOnBase };
        outRunners.forEach(base => {
            newRunners[base] = null;
        });

        // 打者がセーフの場合は一塁に配置
        if (batterStatus === 'safe_first') {
            newRunners.first = batter;
        }

        game.runnersOnBase = newRunners;

        // 打席結果を記録
        const finalResult = batterStatus === 'out' ? 'groundout' : 'fielders_choice';
        await gameManager.recordAtBatResult(finalResult, resultDetail + ' (送りバント失敗)', 0, 0);
        gameManager.advanceBattingOrder();

        await gameManager.saveGame();

        this.showSuccess(i18n.t('sacrificeBuntFailureRecorded'));
        this.updateGameDisplay();
        this.prepareNextBatter();

        // 3アウトチェック
        if (game.outs >= 3) {
            await gameManager.endHalfInning();
        }
    }

    // オールセーフの処理
    handleSacrificeBuntAllSafe() {
        // 野選・安打・失策から選択
        this.showSacrificeBuntAllSafeModal();
    }

    // オールセーフ選択モーダル
    showSacrificeBuntAllSafeModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('allSafeSelectResult')}</h3>
                <p>${i18n.t('selectResultsMultiple')}</p>

                <div class="allsafe-options">
                    <label>
                        <input type="checkbox" id="allsafe-fielders-choice" class="allsafe-checkbox">
                        ${i18n.t('fieldersChoice')}
                    </label><br>
                    <label>
                        <input type="checkbox" id="allsafe-hit" class="allsafe-checkbox">
                        ${i18n.t('hit')}
                    </label><br>
                    <label>
                        <input type="checkbox" id="allsafe-error" class="allsafe-checkbox">
                        ${i18n.t('error')}
                    </label>
                </div>

                <div id="hit-type-selection" style="display: none; margin-top: 10px;">
                    <label>${i18n.t('hitType')}</label>
                    <select id="hitTypeSelect">
                        <option value="single">${i18n.t('single')}</option>
                        <option value="double">${i18n.t('double')}</option>
                        <option value="triple">${i18n.t('triple')}</option>
                    </select>
                </div>

                <div class="modal-buttons">
                    <button id="confirmAllSafe" class="primary-btn">${i18n.t('nextButton')}</button>
                    <button id="cancelAllSafe" class="secondary-btn">${i18n.t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 安打チェックボックスの変更で安打種類選択を表示/非表示
        const hitCheckbox = document.getElementById('allsafe-hit');
        const hitTypeDiv = document.getElementById('hit-type-selection');
        hitCheckbox.addEventListener('change', () => {
            hitTypeDiv.style.display = hitCheckbox.checked ? 'block' : 'none';
        });

        document.getElementById('confirmAllSafe').addEventListener('click', () => {
            const selectedResults = this.getSelectedAllSafeResults(modal);
            if (selectedResults.length === 0) {
                this.showError(i18n.t('selectAtLeastOne'));
                return;
            }
            modal.remove();
            this.showAllSafeAdvancementModal(selectedResults);
        });

        document.getElementById('cancelAllSafe').addEventListener('click', () => {
            modal.remove();
        });
    }

    // 選択されたオールセーフ結果を取得
    getSelectedAllSafeResults(modal) {
        const results = [];

        if (modal.querySelector('#allsafe-fielders-choice').checked) {
            results.push({ type: 'fielders_choice', label: '野手選択' });
        }

        if (modal.querySelector('#allsafe-hit').checked) {
            const hitType = modal.querySelector('#hitTypeSelect').value;
            const hitLabels = {
                'single': '単打',
                'double': '二塁打',
                'triple': '三塁打'
            };
            results.push({ type: hitType, label: hitLabels[hitType] });
        }

        if (modal.querySelector('#allsafe-error').checked) {
            results.push({ type: 'reached_on_error', label: '失策' });
        }

        return results;
    }

    // オールセーフの進塁設定モーダル
    showAllSafeAdvancementModal(selectedResults) {
        const game = gameManager.currentGame;
        const runners = game.runnersOnBase;
        const batter = gameManager.getCurrentBatter();

        const modal = document.createElement('div');
        modal.className = 'modal';

        const runnerSelects = this.generateAllSafeRunnerSelects(runners, batter);

        // 結果のラベル表示
        const resultsLabel = selectedResults.map(r => r.label).join(' + ');

        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('advancementSetup')}</h3>
                <p>${i18n.t('record')}: ${resultsLabel}</p>
                <p>${i18n.t('selectFinalPositions')}</p>

                <div class="runner-advancement-settings">
                    ${runnerSelects}
                </div>

                <div class="runs-input">
                    <label>${i18n.t('runsCount')}</label>
                    <input type="number" id="allsafeRuns" min="0" max="4" value="0">
                </div>

                <div class="modal-buttons">
                    <button id="confirmAllSafeAdvancement" class="primary-btn">${i18n.t('confirm')}</button>
                    <button id="cancelAllSafeAdvancement" class="secondary-btn">${i18n.t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('confirmAllSafeAdvancement').addEventListener('click', async () => {
            const finalRunners = this.getAllSafeRunners(modal);
            const finalRuns = parseInt(document.getElementById('allsafeRuns').value);
            modal.remove();
            await this.completeAllSafe(selectedResults, finalRunners, finalRuns);
        });

        document.getElementById('cancelAllSafeAdvancement').addEventListener('click', () => {
            modal.remove();
        });
    }

    // オールセーフ用の走者選択UI生成（打者含む）
    generateAllSafeRunnerSelects(runners, batter) {
        let html = '';

        // 打者
        html += `
            <div class="runner-select">
                <label>${i18n.t('batter')} ${batter.name}${i18n.t('destination')}</label>
                <select id="batter-destination">
                    <option value="first" selected>${i18n.t('first')}</option>
                    <option value="second">${i18n.t('second')}</option>
                    <option value="third">${i18n.t('third')}</option>
                    <option value="home">${i18n.t('homeScore')}</option>
                </select>
            </div>
        `;

        // 既存走者
        if (runners.first) {
            html += `
                <div class="runner-select">
                    <label>${i18n.t('firstRunner')} ${runners.first.name}${i18n.t('destination')}</label>
                    <select id="runner-first-allsafe-destination">
                        <option value="first">${i18n.t('first')}</option>
                        <option value="second" selected>${i18n.t('second')}</option>
                        <option value="third">${i18n.t('third')}</option>
                        <option value="home">${i18n.t('homeScore')}</option>
                    </select>
                </div>
            `;
        }

        if (runners.second) {
            html += `
                <div class="runner-select">
                    <label>${i18n.t('secondRunner')} ${runners.second.name}${i18n.t('destination')}</label>
                    <select id="runner-second-allsafe-destination">
                        <option value="second">${i18n.t('second')}</option>
                        <option value="third" selected>${i18n.t('third')}</option>
                        <option value="home">${i18n.t('homeScore')}</option>
                    </select>
                </div>
            `;
        }

        if (runners.third) {
            html += `
                <div class="runner-select">
                    <label>${i18n.t('thirdRunner')} ${runners.third.name}${i18n.t('destination')}</label>
                    <select id="runner-third-allsafe-destination">
                        <option value="third">${i18n.t('third')}</option>
                        <option value="home" selected>${i18n.t('homeScore')}</option>
                    </select>
                </div>
            `;
        }

        return html;
    }

    // オールセーフの走者状況を取得
    getAllSafeRunners(modal) {
        const game = gameManager.currentGame;
        const originalRunners = game.runnersOnBase;
        const batter = gameManager.getCurrentBatter();
        const newRunners = {
            first: null,
            second: null,
            third: null
        };

        // 打者
        const batterDest = modal.querySelector('#batter-destination')?.value;
        if (batterDest === 'first') newRunners.first = batter;
        else if (batterDest === 'second') newRunners.second = batter;
        else if (batterDest === 'third') newRunners.third = batter;

        // 元の走者
        if (originalRunners.first) {
            const dest = modal.querySelector('#runner-first-allsafe-destination')?.value;
            if (dest === 'first') newRunners.first = originalRunners.first;
            else if (dest === 'second') newRunners.second = originalRunners.first;
            else if (dest === 'third') newRunners.third = originalRunners.first;
        }

        if (originalRunners.second) {
            const dest = modal.querySelector('#runner-second-allsafe-destination')?.value;
            if (dest === 'second') newRunners.second = originalRunners.second;
            else if (dest === 'third') newRunners.third = originalRunners.second;
        }

        return newRunners;
    }

    // オールセーフの確定処理
    async completeAllSafe(selectedResults, finalRunners, finalRuns) {
        const game = gameManager.currentGame;
        const batter = gameManager.getCurrentBatter();
        const resultDetail = document.getElementById('atBatResultDetail').value;

        // 走者を更新
        game.runnersOnBase = finalRunners;

        // 主要な結果タイプを決定（安打があれば安打、なければ最初の結果）
        const hitResult = selectedResults.find(r => ['single', 'double', 'triple'].includes(r.type));
        const primaryResult = hitResult ? hitResult.type : selectedResults[0].type;

        // 失策があればチーム・選手エラーを記録
        if (selectedResults.some(r => r.type === 'reached_on_error')) {
            const fieldingTeam = game.isTopHalf ? 'home' : 'away';
            game.teamStats[fieldingTeam].errors++;
        }

        // 結果ラベルを作成
        const resultsLabel = selectedResults.map(r => r.label).join('+');
        const detailWithResults = resultDetail ? `${resultDetail} (${resultsLabel})` : resultsLabel;

        // 打席結果を記録
        await gameManager.recordAtBatResult(primaryResult, detailWithResults, finalRuns, 0);
        gameManager.advanceBattingOrder();

        // 投手統計は更新しない（アウトではないため）

        await gameManager.saveGame();

        this.showSuccess(i18n.t('allSafeRecorded'));
        this.updateGameDisplay();
        this.prepareNextBatter();
    }

    showAtBatCompletionPrompt(lastPitchResult) {
        if (lastPitchResult === 'walk') {
            this.showSuccess('四球です。打席結果を選択してください。');
            this.updateAtBatResultButtonsFiltered(['walk', 'intentional_walk']);
        } else if (lastPitchResult === 'strikeout_looking') {
            this.showSuccess('見逃し三振です。打席結果を選択してください。');
            this.updateAtBatResultButtonsFiltered(['strikeout', 'strikeout_looking']);
        } else if (lastPitchResult === 'strikeout_swinging') {
            this.showSuccess('空振り三振です。打席結果を選択してください。');
            this.updateAtBatResultButtonsFiltered(['strikeout', 'strikeout_swinging', 'strikeout_passed_ball']);
        } else if (lastPitchResult === 'strikeout_bunt') {
            this.showSuccess('スリーバント失敗（三振）です。打席結果を選択してください。');
            this.updateAtBatResultButtonsFiltered(['strikeout', 'strikeout_bunt']);
        } else if (lastPitchResult === 'strikeout') {
            // 後方互換性のため残す
            this.showSuccess('三振です。打席結果を選択してください。');
            this.updateAtBatResultButtonsFiltered(['strikeout', 'strikeout_swinging', 'strikeout_looking', 'strikeout_passed_ball']);
        }

        // 打席結果選択エリアにスクロール
        const completionSection = document.querySelector('.at-bat-completion');
        if (completionSection) {
            completionSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showFairBallResults() {
        this.showSuccess('フェア（打球）です。打席結果を選択してください。');

        // 打球系の結果のみをフィルタリング（四球・死球・三振を除外）
        const fairBallResults = this.getFairBallResults();
        this.updateAtBatResultButtonsFiltered(fairBallResults);

        // 打席結果選択エリアにスクロール
        const completionSection = document.querySelector('.at-bat-completion');
        if (completionSection) {
            completionSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    getFairBallResults() {
        const game = gameManager.currentGame;
        const outs = game.outs;
        const runners = game.runnersOnBase;
        const hasRunners = runners.first || runners.second || runners.third;

        const results = [];

        // 安打系（打球が飛んだもの）
        results.push('single', 'double', 'triple', 'homerun');
        results.push('single_error', 'double_error', 'triple_error');

        // 凡退系（打球が飛んだもの）
        results.push('groundout', 'flyout', 'lineout', 'popout', 'foulout');

        // 犠打系（打球が飛んだもの）
        // 犠打は0-1アウトで走者がいる場合のみ表示
        if (gameManager.isSacrificeBuntEligible()) {
            results.push('sacrifice_bunt');
        }
        results.push('sacrifice_fly');

        // 野選・エラー出塁（打球が飛んだもの）
        results.push('fielders_choice', 'reached_on_error');

        // 併殺（走者がいて、二死未満の場合）
        if (hasRunners && outs < 2) {
            results.push('ground_double_play', 'fly_double_play', 'liner_double_play');
        }

        // 三重殺（走者2人以上いて、無死の場合）
        const runnerCount = (runners.first ? 1 : 0) + (runners.second ? 1 : 0) + (runners.third ? 1 : 0);
        if (runnerCount >= 2 && outs === 0) {
            results.push('ground_triple_play', 'fly_triple_play', 'liner_triple_play');
        }

        // インフィールドフライ（走者が1・2塁または満塁で、無死または一死の場合）
        if (outs < 2 && runners.first && runners.second) {
            results.push('infield_fly');
        }

        // 故意落球（少なくとも1塁走者がいて、無死または一死の場合）
        if (outs < 2 && runners.first) {
            results.push('intentional_drop');
        }

        // 妨害・阻害（打球に関連する可能性のあるもの）
        results.push('interference', 'obstruction');

        return results;
    }

    updateAtBatResultButtonsFiltered(allowedResults) {
        const container = document.getElementById('atBatResultButtons');
        if (!container) return;

        // 3塁走者の有無をチェック
        const game = gameManager.currentGame;
        const hasThirdRunner = game && game.runnersOnBase && game.runnersOnBase.third;

        // インフィールドフライ条件：0-1アウトで1・2塁または満塁
        const infieldFlyCondition = game && game.outs < 2 &&
            game.runnersOnBase.first && game.runnersOnBase.second;

        // 許可された結果のみ表示
        container.innerHTML = allowedResults.map(result => {
            let label = this.formatAtBatResult(result);

            // 犠打の場合、3塁走者がいれば「犠打（スクイズ含む）」と表示
            if (result === 'sacrifice_bunt' && hasThirdRunner) {
                label = i18n.t('sacrificeBuntIncludingSqueeze');
            }

            // フライアウトの場合、インフィールドフライ条件下では括弧書きを追加
            if (result === 'flyout' && infieldFlyCondition) {
                label = (i18n.t('flyout') || label) + i18n.t('infieldFlyIncluded');
            }

            return `<button class="at-bat-result-btn" data-result="${result}">${label}</button>`;
        }).join('');

        // クリックイベントを設定
        container.querySelectorAll('.at-bat-result-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.at-bat-result-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
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
            // 犠打の場合は特別なフローを実行
            if (result === 'sacrifice_bunt') {
                this.showSacrificeBuntOutcomeModal();
                return;
            }

            // 故意落球の場合は野手選択モーダルを表示
            if (result === 'intentional_drop') {
                const advancement = gameManager.calculateRunnerAdvancement(result);
                const batter = gameManager.getCurrentBatter();
                this.showIntentionalDropFielderModal(result, resultDetail, advancement, batter);
                return;
            }

            // ホームランの場合は柵越え確認
            if (result === 'homerun') {
                const batter = gameManager.getCurrentBatter();
                const advancement = gameManager.calculateRunnerAdvancement(result);
                this.fromPitchInterface = true;
                this.showHomerunTypeModal(result, resultDetail, advancement, batter);
                return;
            }

            // 走者進塁・得点を自動計算
            const advancement = gameManager.calculateRunnerAdvancement(result);
            const batter = gameManager.getCurrentBatter();

            // 複雑な状況の場合は調整画面を表示
            if (advancement.needsAdjustment) {
                this.fromPitchInterface = true;
                this.showRunnerAdvancementModal(result, resultDetail, advancement, batter);
            } else {
                // ボールインプレー/デッド判定
                const previousOuts = gameManager.currentGame.outs - (advancement.outsAdded || 0);
                const isPlayContinuing = gameManager.isPlayContinuing(result, previousOuts);

                if (isPlayContinuing) {
                    this.fromPitchInterface = true;
                    this.showAdditionalPlayModal(result, resultDetail, advancement, batter);
                } else {
                    await this.finalizeAtBat(result, resultDetail, advancement, batter);
                    this.showBallDeadBanner();
                    this.prepareNextBatter();
                }
            }

        } catch (error) {
            console.error('打席完了エラー:', error);
            this.showError('打席の完了に失敗しました');
        }
    }

    // 打席途中の投手交代を検出し、必要に応じてカウント入力を求める
    async handleMidAtBatPitcherChange(oldPitcherId) {
        if (!gameManager.currentAtBat || !oldPitcherId) return;
        const mode = gameManager.currentGame?.recordingMode;
        if (mode === 'pitch') {
            // 球ごとモード：カウントは自動取得
            gameManager.currentAtBat.midAtBatPitchChange = {
                previousPitcherId: oldPitcherId,
                balls: gameManager.currentGame.balls,
                strikes: gameManager.currentGame.strikes
            };
        } else if (mode === 'batter') {
            // 打席ごとモード：ユーザーにカウントを選択させる
            await this.showMidAtBatPitcherChangeCountModal(oldPitcherId);
        }
    }

    // 打席途中交代カウント選択モーダル（打席ごとの記録モード用）
    showMidAtBatPitcherChangeCountModal(oldPitcherId) {
        return new Promise(resolve => {
            const foulDrops = gameManager.currentAtBat?.foulFlyDroppedCount || 0;

            // ストライクカウント制約
            const strikeDisabled = [
                foulDrops >= 1, // 0ストライクは不可（落球1回以上あり）
                foulDrops >= 2, // 1ストライクは不可（落球2回あり）
                false           // 2ストライクは常に可
            ];
            // 落球0回の場合は全て選択可能
            if (foulDrops === 0) { strikeDisabled[0] = false; strikeDisabled[1] = false; }

            const strikeButtons = [0, 1, 2].map(s => {
                const disabled = strikeDisabled[s] ? 'disabled' : '';
                return `<button class="count-btn strike-btn ${disabled}" data-strikes="${s}" ${disabled}>${s}</button>`;
            }).join('');

            const ballButtons = [0, 1, 2, 3].map(b =>
                `<button class="count-btn ball-btn" data-balls="${b}">${b}</button>`
            ).join('');

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>${i18n.t('midAtBatPitchChangeTitle')}</h3>
                    <p class="modal-note">${i18n.t('midAtBatPitchChangeNote')}</p>
                    <div class="count-selection">
                        <div class="count-group">
                            <label>${i18n.t('ballCount')}</label>
                            <div class="count-buttons">${ballButtons}</div>
                        </div>
                        <div class="count-group">
                            <label>${i18n.t('strikeCount')}</label>
                            <div class="count-buttons">${strikeButtons}</div>
                        </div>
                    </div>
                    <div class="count-display">${i18n.t('midAtBatCountSelected')}: <span id="selectedCountDisplay">-</span></div>
                    <button id="confirmMidAtBatCount" class="primary-btn" disabled>${i18n.t('confirm')}</button>
                </div>
            `;
            document.body.appendChild(modal);

            let selectedBalls = null;
            let selectedStrikes = null;

            const updateDisplay = () => {
                const display = modal.querySelector('#selectedCountDisplay');
                const confirmBtn = modal.querySelector('#confirmMidAtBatCount');
                if (selectedBalls !== null && selectedStrikes !== null) {
                    display.textContent = `${selectedBalls}B-${selectedStrikes}S`;
                    confirmBtn.disabled = false;
                } else {
                    display.textContent = '-';
                    confirmBtn.disabled = true;
                }
            };

            modal.querySelectorAll('.ball-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.querySelectorAll('.ball-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedBalls = parseInt(btn.dataset.balls);
                    updateDisplay();
                });
            });

            modal.querySelectorAll('.strike-btn:not([disabled])').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.querySelectorAll('.strike-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedStrikes = parseInt(btn.dataset.strikes);
                    updateDisplay();
                });
            });

            // 落球2回の場合は2ストライクを自動選択
            if (foulDrops >= 2) {
                const twoStrikeBtn = modal.querySelector('.strike-btn[data-strikes="2"]');
                if (twoStrikeBtn) { twoStrikeBtn.classList.add('selected'); selectedStrikes = 2; }
            }

            modal.querySelector('#confirmMidAtBatCount').addEventListener('click', () => {
                if (selectedBalls !== null && selectedStrikes !== null) {
                    gameManager.currentAtBat.midAtBatPitchChange = {
                        previousPitcherId: oldPitcherId,
                        balls: selectedBalls,
                        strikes: selectedStrikes
                    };
                    modal.remove();
                    resolve();
                }
            });
        });
    }

    showIntentionalDropFielderModal(result, resultDetail, advancement, batter) {
        const game = gameManager.currentGame;
        const fieldingTeam = game.isTopHalf ? 'home' : 'away';
        const fieldingTeamName = game.isTopHalf ? game.homeTeam : game.awayTeam;
        const fieldingPlayers = game.players[fieldingTeam] || [];

        const positionOrder = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

        let fielderButtons;
        if (game.playerDetailLevel === 'basic') {
            // 基本モード：ポジション名のみ
            fielderButtons = positionOrder.map(pos => {
                const posName = i18n.t(`pos_${pos}`);
                return `<button class="fielder-select-btn" data-position="${pos}" data-player-id="">${posName}</button>`;
            }).join('');
        } else {
            // 標準/詳細モード：守備ポジション順に選手名付きで表示
            const sortedPlayers = [...fieldingPlayers]
                .filter(p => p.position && p.position !== 'DH')
                .sort((a, b) => {
                    const aNum = BASEBALL_CONFIG.POSITION_NUMBERS[a.position] || 99;
                    const bNum = BASEBALL_CONFIG.POSITION_NUMBERS[b.position] || 99;
                    return aNum - bNum;
                });

            if (sortedPlayers.length === 0) {
                fielderButtons = positionOrder.map(pos => {
                    const posName = i18n.t(`pos_${pos}`);
                    return `<button class="fielder-select-btn" data-position="${pos}" data-player-id="">${posName}</button>`;
                }).join('');
            } else {
                fielderButtons = sortedPlayers.map(player => {
                    const posName = i18n.t(`pos_${player.position}`);
                    return `<button class="fielder-select-btn" data-position="${player.position}" data-player-id="${player.id}">${posName}（${player.name}）</button>`;
                }).join('');
            }
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${i18n.t('intentionalDropFielderSelect')}</h3>
                <p class="modal-note">${fieldingTeamName} &mdash; ${i18n.t('intentionalDropNoError')}</p>
                <div class="fielder-selection-grid">
                    ${fielderButtons}
                </div>
                <button id="cancelIntentionalDrop" class="secondary-btn">${i18n.t('cancel')}</button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelectorAll('.fielder-select-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const position = btn.dataset.position;
                const playerId = btn.dataset.playerId;
                const posName = i18n.t(`pos_${position}`);

                let playerName = '';
                if (playerId) {
                    const player = fieldingPlayers.find(p => p.id === playerId);
                    if (player) playerName = player.name;
                }

                const fielderDetail = playerName ? `${posName}（${playerName}）` : posName;
                const finalDetail = resultDetail ? `${resultDetail} - ${fielderDetail}` : fielderDetail;

                // 野手IDをat-batに設定（個人記録リンク用）
                if (playerId && gameManager.currentAtBat) {
                    gameManager.currentAtBat.fielderPlayerId = playerId;
                }

                modal.remove();

                try {
                    await this.finalizeAtBat(result, finalDetail, advancement, batter);
                    this.showBallDeadBanner();
                    this.prepareNextBatter();
                } catch (error) {
                    console.error('故意落球記録エラー:', error);
                    this.showError('故意落球の記録に失敗しました');
                }
            });
        });

        document.getElementById('cancelIntentionalDrop').addEventListener('click', () => {
            modal.remove();
        });
    }

    prepareNextBatter() {
        // カウントリセット
        gameManager.currentGame.balls = 0;
        gameManager.currentGame.strikes = 0;

        // 打席が変わったのでアクション履歴をリセット
        this.pitchActionHistory = [];

        // 表示更新
        this.updatePitchDisplay();
        this.clearAtBatCompletionForm();
        this._updatePitchUndoBtn();
    }

    async undoLastPitchAction() {
        const history = this.pitchActionHistory;
        if (!history?.length) {
            this.showError('取り消せるプレーがありません');
            return;
        }

        const last = history[history.length - 1];

        try {
            if (last.type === 'pitch') {
                // 投球取り消し: currentAtBat.pitches の末尾を削除
                if (!gameManager.currentAtBat?.pitches.length) {
                    this.showError('取り消す投球がありません');
                    return;
                }
                const lastPitch = gameManager.currentAtBat.pitches.pop();
                gameManager.currentGame.balls = lastPitch.count.balls;
                gameManager.currentGame.strikes = lastPitch.count.strikes;
                if (lastPitch.id) await storage.deleteData('pitches', lastPitch.id);
                this.showSuccess('前球を取り消しました');

            } else if (last.type === 'baserunning') {
                // 走者プレー取り消し: スナップショットから状態を復元
                const s = last.snapshot;
                const g = gameManager.currentGame;
                g.runnersOnBase = s.runnersOnBase;
                g.outs = s.outs;
                g.homeScore = s.homeScore;
                g.awayScore = s.awayScore;
                if (gameManager.currentInning) gameManager.currentInning.runs = s.inningRuns;
                const playLabel = last.playType.replace(/_/g, '');
                this.showSuccess(`${playLabel} を取り消しました`);
            }

            history.pop();
            this._updatePitchUndoBtn();
            this.updateGameDisplay();
            this.updatePitchDisplay();

        } catch (error) {
            console.error('プレー取り消しエラー:', error);
            this.showError('取り消しに失敗しました');
        }
    }

    _updatePitchUndoBtn() {
        const btn = document.getElementById('undoLastPitch');
        const atBatUndoBtn = document.getElementById('undoLastAtBatBtn');

        if (atBatUndoBtn) {
            this._updatePitchAtBatUndoBtn(atBatUndoBtn);
        }

        if (!btn) return;
        const history = this.pitchActionHistory;
        if (!history?.length) {
            btn.disabled = true;
            btn.textContent = '前プレー取消';
            return;
        }
        btn.disabled = false;
        const last = history[history.length - 1];
        if (last.type === 'pitch') {
            const labelMap = {
                ball: 'ボール', strike_looking: '見逃しST', strike_swinging: '空振りST',
                foul: 'ファウル', foul_bunt: 'バントFoul', hit: 'フェア', hit_by_pitch: '死球'
            };
            btn.textContent = `取消: ${labelMap[last.result] ?? last.result}`;
        } else if (last.type === 'baserunning') {
            const labelMap = {
                steal_success: '盗塁成功', steal_failure: '盗塁死',
                pickoff_safe: '牽制帰塁', pickoff_out: '牽制死', balk: 'ボーク'
            };
            btn.textContent = `取消: ${labelMap[last.playType] ?? last.playType}`;
        }
    }

    async _updatePitchAtBatUndoBtn(btn = document.getElementById('undoLastAtBatBtn')) {
        if (!btn) return;

        const atBatInProgress = !!gameManager.currentAtBat;
        if (atBatInProgress) {
            btn.disabled = true;
            btn.classList.add('at-bat-undo-blocked');
            btn.setAttribute('aria-disabled', 'true');
            return;
        }

        btn.disabled = true;
        btn.classList.add('at-bat-undo-blocked');
        btn.setAttribute('aria-disabled', 'true');

        try {
            const atBats = await gameManager.getAllAtBats();
            const canUndoAtBat = atBats.length > 0 && !gameManager.currentAtBat;
            btn.disabled = !canUndoAtBat;
            btn.classList.toggle('at-bat-undo-blocked', !canUndoAtBat);
            btn.setAttribute('aria-disabled', canUndoAtBat ? 'false' : 'true');
        } catch (error) {
            console.warn('前打席に戻すボタン状態の更新に失敗:', error);
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

        // 階層的選択状態をリセット
        this.currentResultView = 'top';
        this.selectedCategory = null;
        this.selectedSubCategory = null;
        this.selectedResult = null;
        this.selectedHitDirection = null; // 安打方向をクリア
        this.selectedInterferingRunner = null; // 妨害走者をクリア
        this.selectedOutDetail = null; // 三振詳細をクリア
        this.selectedFairFoul = null; // Fair/Foulをクリア
        this.selectedDroppedThird = null; // 振り逃げをクリア

        // エラー配列をクリア
        this.currentErrors = [];
        this.updateErrorsList();

        // ボタンの選択状態をクリアして、トップレベルビューに戻る
        this.updateResultButtons();
    }

    clearPitchForm() {
        // 球種ボタンの選択をクリア
        document.querySelectorAll('.pitch-type-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        // 投球結果ボタンの選択をクリア
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

        // 試合終了確定待ちバナーを更新
        this._updateGameEndBanner();

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

    _updateGameEndBanner() {
        const banner = document.getElementById('gameEndBanner');
        if (!banner) return;

        const game = gameManager.currentGame;
        if (!game || game.status !== 'pending_confirm') {
            banner.classList.add('hidden');
            return;
        }

        banner.classList.remove('hidden');

        // イニングモードはスナップショットがある場合のみ「戻す」ボタンを表示
        const undoBtn = document.getElementById('undoFromEndBtn');
        if (undoBtn) {
            const level = game.recordingLevel;
            if (level === 'inning') {
                undoBtn.style.display = this._endHalfInningSnap ? '' : 'none';
            } else {
                undoBtn.style.display = '';
            }
        }
    }

    async confirmGame() {
        try {
            const game = gameManager.currentGame;
            const candidates = gameManager.getPitchingDecisionCandidates?.();
            if (game && !game.pitchingDecisions && candidates?.requiresSelection) {
                this.showPitchingDecisionModal(candidates);
                return;
            }

            await this.finalizeGameConfirmation();
        } catch (err) {
            console.error('試合確定エラー:', err);
            this.showError(err.message || '試合の確定に失敗しました');
        }
    }

    async finalizeGameConfirmation() {
        const finalStatus = await gameManager.confirmGame();
        if (!finalStatus) return;
        this.showSuccess(i18n.t('gameConfirmed') || '試合を確定しました');
        this.showScreen('welcomeScreen');
    }

    showPitchingDecisionModal(candidates) {
        const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
        const optionHtml = (pitchers, includeNone = false) => {
            const none = includeNone ? `<option value="">${escapeHtml(i18n.t('pitchingDecisionNone') || 'なし')}</option>` : '';
            return none + pitchers.map(p => {
                const ip = typeof formatInningsPitched === 'function'
                    ? formatInningsPitched(p.inningsPitched)
                    : `${Math.floor((p.inningsPitched || 0) / 3)}.${(p.inningsPitched || 0) % 3}`;
                const label = `${p.name} (${p.teamName} / ${ip} IP, ${p.runsAllowed} R)`;
                return `<option value="${escapeHtml(p.id)}">${escapeHtml(label)}</option>`;
            }).join('');
        };
        const checkboxHtml = candidates.holdPitchers.map(p => `
            <label class="checkbox-label">
                <input type="checkbox" class="hold-pitcher-checkbox" value="${escapeHtml(p.id)}">
                ${escapeHtml(`${p.name} (${p.teamName})`)}
            </label>
        `).join('') || `<p class="muted">${escapeHtml(i18n.t('pitchingDecisionNoCandidates') || '候補がありません')}</p>`;

        const modal = document.createElement('div');
        modal.className = 'modal pitching-decision-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${escapeHtml(i18n.t('pitchingDecisionTitle') || '投手勝敗の確認')}</h3>
                <p class="modal-description">${escapeHtml(i18n.t('pitchingDecisionHelp') || '候補から公式記録として保存する投手を選択してください。')}</p>
                <div class="form-group">
                    <label>${escapeHtml(i18n.t('winningPitcher') || '勝利投手')}</label>
                    <select id="winningPitcherSelect">
                        ${optionHtml(candidates.winningPitchers)}
                    </select>
                </div>
                <div class="form-group">
                    <label>${escapeHtml(i18n.t('losingPitcher') || '敗戦投手')}</label>
                    <select id="losingPitcherSelect">
                        ${optionHtml(candidates.losingPitchers)}
                    </select>
                </div>
                <div class="form-group">
                    <label>${escapeHtml(i18n.t('savePitcher') || 'セーブ')}</label>
                    <select id="savePitcherSelect">
                        ${optionHtml(candidates.savePitchers, true)}
                    </select>
                </div>
                <div class="form-group">
                    <label>${escapeHtml(i18n.t('holdPitchers') || 'ホールド')}</label>
                    <div class="checkbox-list">${checkboxHtml}</div>
                </div>
                <div class="modal-actions">
                    <button type="button" id="pitchingDecisionCancelBtn" class="btn-secondary">${escapeHtml(i18n.t('cancel') || 'キャンセル')}</button>
                    <button type="button" id="pitchingDecisionConfirmBtn" class="btn-primary">${escapeHtml(i18n.t('confirmGame') || '試合を確定する')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const winningSelect = modal.querySelector('#winningPitcherSelect');
        const losingSelect = modal.querySelector('#losingPitcherSelect');
        const saveSelect = modal.querySelector('#savePitcherSelect');

        const syncExcludedChoices = () => {
            const winId = winningSelect.value;
            const saveId = saveSelect.value;
            saveSelect.querySelectorAll('option').forEach(option => {
                option.disabled = option.value !== '' && option.value === winId;
            });
            if (saveSelect.value === winId) saveSelect.value = '';
            modal.querySelectorAll('.hold-pitcher-checkbox').forEach(box => {
                box.disabled = box.value === winId || box.value === saveId;
                if (box.disabled) box.checked = false;
            });
        };
        winningSelect.addEventListener('change', syncExcludedChoices);
        saveSelect.addEventListener('change', syncExcludedChoices);
        syncExcludedChoices();

        modal.querySelector('#pitchingDecisionCancelBtn').addEventListener('click', () => modal.remove());
        modal.querySelector('#pitchingDecisionConfirmBtn').addEventListener('click', async () => {
            try {
                await gameManager.savePitchingDecisions({
                    winningPitcherId: winningSelect.value,
                    losingPitcherId: losingSelect.value,
                    savePitcherId: saveSelect.value,
                    holdPitcherIds: Array.from(modal.querySelectorAll('.hold-pitcher-checkbox:checked')).map(box => box.value)
                });
                modal.remove();
                await this.finalizeGameConfirmation();
            } catch (err) {
                console.error('投手勝敗保存エラー:', err);
                this.showError(err.message || (i18n.t('pitchingDecisionSaveError') || '投手勝敗の保存に失敗しました'));
            }
        });
    }

    async undoFromGameEnd() {
        const level = gameManager.currentGame?.recordingLevel;
        if (level === 'inning') {
            await this._undoEndHalfInning();
        } else {
            await this.undoLastAtBat();
        }
    }

    async _undoEndHalfInning() {
        const snap = this._endHalfInningSnap;
        if (!snap) {
            this.showError(i18n.t('nothingToUndo') || '取り消す操作がありません');
            return;
        }
        try {
            await gameManager.undoEndHalfInning(snap);
            this._endHalfInningSnap = null;
            this.inningActionHistory = snap.inningActionHistory || [];
            this._updateInningUndoBtn();
            this.updateCurrentInningDisplay();
            this.updateGameDisplay();
            this.loadInningHistory();
            this.showSuccess(i18n.t('undoEndHalfInningDone') || '攻撃終了を取り消しました');
        } catch (err) {
            console.error('攻撃終了取消エラー:', err);
            this.showError(err.message || '取り消しに失敗しました');
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
            const currentLang = i18n.getCurrentLanguage();
            const suffix = i18n.t('battingOrderSuffix');
            console.log('Current language:', currentLang, 'Suffix:', suffix);

            // 名前から古い形式のサフィックスを除去
            let cleanName = batter.name;
            const match = cleanName.match(/^(\d+)(番|º|°)?$/);
            if (match) {
                cleanName = match[1];  // 数字のみ
            }

            // 名前が打順番号と同じ（未登録の場合）は、番号のみ表示
            const displayText = cleanName === String(batter.battingOrder)
                ? `${batter.battingOrder}${suffix}`
                : `${batter.battingOrder}${suffix} ${cleanName}`;
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

                // 非自責走者の場合は視覚的インジケータを追加
                const earnedStatus = gameManager.currentGame?.runnersEarnedStatus?.[baseName] ?? true;
                if (!earnedStatus) {
                    baseEl.classList.add('unearned-runner');
                    runnerNameEl.textContent = displayName + ' *';
                } else {
                    baseEl.classList.remove('unearned-runner');
                    runnerNameEl.textContent = displayName;
                }
            } else {
                baseEl.classList.remove('occupied');
                baseEl.classList.remove('unearned-runner');
                runnerNameEl.textContent = '-';
            }
        }
    }

    getRunnerDisplayName(runnerId) {
        if (!runnerId) return '';
        if (typeof runnerId === 'object') {
            return runnerId.name || runnerId.playerName || runnerId.id || String(runnerId);
        }
        if (runnerId === 'batter') {
            const batter = gameManager.getCurrentBatter?.();
            return batter?.name || i18n.t('batter');
        }
        if (runnerId === 'first') return i18n.t('firstBaseRunner');
        if (runnerId === 'second') return i18n.t('secondBaseRunner');
        if (runnerId === 'third') return i18n.t('thirdBaseRunner');

        const value = String(runnerId);
        const game = gameManager.currentGame;
        const player = ['home', 'away']
            .flatMap(team => game?.players?.[team] || [])
            .find(candidate => candidate.id === value || candidate.name === value);
        if (player?.name) return player.name;

        return value.length > 8 ? value.substring(0, 8) + '...' : value;
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
            this.showSuccess(`${i18n.t('gameSaved')}\n${i18n.t('savedGameOfflineShareHint')}`);
        } catch (error) {
            console.error('保存エラー:', error);
            this.showError(i18n.t('gameSaveError'));
        }
    }

    async endCurrentGame() {
        if (confirm(i18n.t('confirmEndGame'))) {
            try {
                await gameManager.endGame();
                this.showSuccess(i18n.t('gameEnded'));
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

        const message = i18n.t('confirmNoNextInning').replace('{inning}', currentInning).replace('{half}', half);
        if (confirm(message)) {
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

        const message = i18n.t('confirmForceEndGame').replace('{reason}', reason || i18n.t('noReason'));
        if (confirm(message)) {
            game.manualGameControl.forceGameEnd = true;
            game.manualGameControl.callGameReason = `強制終了: ${reason || '理由なし'}`;
            game.status = 'called';

            this.endCurrentGame();
        }
    }

    async abandonCurrentGame() {
        const game = gameManager.currentGame;
        if (!game) {
            this.showError('試合が開始されていません');
            return;
        }

        const msg = i18n.t('abandonGameConfirm')
            .replace('{away}', game.awayTeam || '?')
            .replace('{home}', game.homeTeam || '?');
        if (!confirm(msg)) return;

        try {
            const gameId = game.id;
            // ゲームマネージャーの状態をリセット
            gameManager.currentGame = null;
            gameManager.currentInning = null;
            gameManager.currentAtBat = null;
            gameManager.isRecording = false;

            // DBから全データ削除
            if (gameId) {
                await storage.deleteGame(gameId);
            }

            this.showScreen('welcomeScreen');
        } catch (error) {
            console.error('試合削除エラー:', error);
            this.showError('試合データの削除に失敗しました');
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

    async loadActiveGamesOnWelcome() {
        try {
            const games = await storage.getAllGames();
            const active = games.filter(g => g.status === 'active')
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            const section = document.getElementById('activeGamesSection');
            if (!section) return;

            if (active.length === 0) {
                section.classList.remove('has-games');
                section.innerHTML = '';
                return;
            }

            const levelLabel = l => i18n.t({ inning:'recordingLevelInningShort', batter:'recordingLevelBatterShort', pitch:'recordingLevelPitchShort' }[l] || 'recordingLevelInningShort');

            const cards = active.map(game => {
                const date = new Date(game.date).toLocaleDateString();
                const progress = `${game.currentInning}回${game.isTopHalf ? '表' : '裏'} ${game.outs}アウト`;
                return `<div class="welcome-active-card">
                    <div class="welcome-active-card-info">
                        <div class="welcome-active-card-teams">${game.awayTeam || '?'} ${game.awayScore ?? 0} - ${game.homeScore ?? 0} ${game.homeTeam || '?'}</div>
                        <div class="welcome-active-card-meta">${date}　${levelLabel(game.recordingLevel)}</div>
                        <div class="welcome-active-card-progress">${progress}</div>
                    </div>
                    <button type="button" class="welcome-resume-btn" data-game-id="${game.id}">${i18n.t('resumeGame')}</button>
                </div>`;
            }).join('');

            section.innerHTML = `<div class="active-games-section-title">${i18n.t('activeGamesSection')}</div>${cards}`;
            section.classList.add('has-games');

            section.querySelectorAll('.welcome-resume-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    await this.loadGame(parseInt(btn.dataset.gameId));
                });
            });
        } catch (e) {
            console.error('継続試合の読み込みエラー:', e);
        }
    }

    showGamesModal(games) {
        const statusClass = s => ({ active:'active', completed:'completed', draw:'draw', no_game:'no-game', called:'called' }[s] || 'completed');
        const statusLabel = s => i18n.t({ active:'statusActive', completed:'statusCompleted', draw:'drawGame', no_game:'noGame', called:'statusCalled' }[s] || 'statusCompleted');
        const levelLabel = l => i18n.t({ inning:'recordingLevelInningShort', batter:'recordingLevelBatterShort', pitch:'recordingLevelPitchShort' }[l] || 'recordingLevelInningShort');
        const categoryOptions = this.getGameCategoryOptions();
        const buildCategoryOptions = (selected, includeAll = false) => {
            const allOption = includeAll
                ? `<option value="">${this.escapeHtml(i18n.t('gameCategoryAll'))}</option>`
                : '';
            return allOption + categoryOptions.map(option => {
                const value = this.escapeHtml(option.value);
                const selectedAttr = option.value === selected ? ' selected' : '';
                return `<option value="${value}"${selectedAttr}>${this.escapeHtml(i18n.t(option.labelKey))}</option>`;
            }).join('');
        };
        const folderEntries = this.getSavedGameFolderEntries(games);
        const buildFolderOptions = (selectedCategory = '', selectedFolder = '', includeEmpty = true) => {
            const filtered = folderEntries.filter(entry => !selectedCategory || entry.category === selectedCategory);
            const emptyOption = includeEmpty
                ? `<option value="">${this.escapeHtml(i18n.t('selectFolderToRename'))}</option>`
                : '';
            return emptyOption + filtered.map(entry => {
                const selectedAttr = entry.folderName === selectedFolder ? ' selected' : '';
                const label = `${this.getGameCategoryLabel(entry.category)} / ${entry.folderName} (${entry.count})`;
                return `<option value="${this.escapeHtml(entry.folderName)}" data-category="${this.escapeHtml(entry.category)}"${selectedAttr}>${this.escapeHtml(label)}</option>`;
            }).join('');
        };
        const buildFolderDatalistOptions = () => folderEntries
            .map(entry => `<option value="${this.escapeHtml(entry.folderName)}"></option>`)
            .join('');

        const buildItem = (game) => {
            const sc = statusClass(game.status);
            const isActive = game.status === 'active';
            const classification = this.normalizeGameClassification(game.classification);
            const tagsText = classification.tags.join(', ');
            const categoryLabel = this.getGameCategoryLabel(classification.category);
            const folderLabel = classification.folderName
                ? `${categoryLabel} / ${classification.folderName}`
                : categoryLabel;
            const progressHtml = isActive
                ? `<div class="game-item-progress">${game.currentInning}回${game.isTopHalf ? '表' : '裏'} ${game.outs}アウト</div>`
                : '';
            return `<div class="game-item game-item--${sc}" data-away="${this.escapeHtml((game.awayTeam||'').toLowerCase())}" data-home="${this.escapeHtml((game.homeTeam||'').toLowerCase())}" data-category="${this.escapeHtml(classification.category)}" data-folder="${this.escapeHtml((classification.folderName || '').toLowerCase())}">
                <div class="game-item-header">
                    <span class="status-badge status-badge--${sc}">${statusLabel(game.status)}</span>
                    <span class="game-level-badge">${levelLabel(game.recordingLevel)}</span>
                    <span class="game-category-badge">${this.escapeHtml(folderLabel)}</span>
                    <span class="game-date">${new Date(game.date).toLocaleDateString()}</span>
                </div>
                <div class="game-teams">
                    <strong>${this.escapeHtml(game.awayTeam || '?')} ${game.awayScore ?? '0'} - ${game.homeScore ?? '0'} ${this.escapeHtml(game.homeTeam || '?')}</strong>
                </div>
                ${progressHtml}
                <div class="game-classification-editor">
                    <label>
                        <span>${this.escapeHtml(i18n.t('gameCategoryLabel'))}</span>
                        <select class="game-category-select">${buildCategoryOptions(classification.category)}</select>
                    </label>
                    <label>
                        <span>${this.escapeHtml(i18n.t('gameFolderLabel'))}</span>
                        <input type="text" class="game-folder-input" list="savedGameFolderNames" value="${this.escapeHtml(classification.folderName)}" placeholder="${this.escapeHtml(i18n.t('gameFolderPlaceholder'))}">
                    </label>
                    <label>
                        <span>${this.escapeHtml(i18n.t('gameTagsLabel'))}</span>
                        <input type="text" class="game-tags-input" value="${this.escapeHtml(tagsText)}" placeholder="${this.escapeHtml(i18n.t('gameTagsPlaceholder'))}">
                    </label>
                    <label class="game-memo-field">
                        <span>${this.escapeHtml(i18n.t('gameMemoLabel'))}</span>
                        <input type="text" class="game-memo-input" value="${this.escapeHtml(classification.memo)}" placeholder="${this.escapeHtml(i18n.t('gameMemoPlaceholder'))}">
                    </label>
                    <button type="button" class="secondary-btn save-classification-btn" data-game-id="${game.id}">${this.escapeHtml(i18n.t('moveOrSaveGameFolder'))}</button>
                </div>
                <div class="game-item-actions">
                    ${isActive ? `<button type="button" class="primary-btn load-game-btn" data-game-id="${game.id}">${i18n.t('resumeGame')}</button>` : ''}
                    <button type="button" class="secondary-btn view-game-btn" data-game-id="${game.id}">${i18n.t('viewGame')}</button>
                    <button type="button" class="secondary-btn share-game-btn" data-game-id="${game.id}">${i18n.t('shareGame')}</button>
                    <button type="button" class="secondary-btn export-image-btn" data-game-id="${game.id}">${i18n.t('exportImage')}</button>
                    <button type="button" class="secondary-btn print-game-btn" data-game-id="${game.id}">${i18n.t('printScoreSheet')}</button>
                    <button type="button" class="secondary-btn export-csv-btn" data-game-id="${game.id}">${i18n.t('exportCsv')}</button>
                    <button type="button" class="secondary-btn export-backup-btn" data-game-id="${game.id}">${i18n.t('exportBackupGame')}</button>
                    <button type="button" class="danger-btn delete-game-btn" data-game-id="${game.id}">${i18n.t('delete')}</button>
                </div>
            </div>`;
        };

        const sorted = [...games].sort((a, b) => new Date(b.date) - new Date(a.date));
        const active = sorted.filter(g => g.status === 'active');
        const others = sorted.filter(g => g.status !== 'active');

        let listHtml = '';
        if (sorted.length === 0) {
            listHtml = `<p class="no-games-msg">${i18n.t('noSavedGames')}</p>`;
        } else {
            if (active.length > 0) {
                listHtml += `<div class="games-section-title active-section">${i18n.t('activeGamesSection')}</div>`;
                listHtml += active.map(buildItem).join('');
            }
            if (others.length > 0) {
                listHtml += `<div class="games-section-title">${i18n.t('completedGamesSection')}</div>`;
                listHtml += others.map(buildItem).join('');
            }
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'savedGamesModal';
        modal.innerHTML = `
            <div class="modal-content games-list-modal-content">
                <h3>${i18n.t('savedGamesTitle')}</h3>
                <div class="games-import-row">
                    <button type="button" class="secondary-btn import-backup-btn">${this.escapeHtml(i18n.t('importBackupGame'))}</button>
                    <input type="file" class="import-backup-input" accept="application/json,.json" hidden>
                    <span class="games-import-help">${this.escapeHtml(i18n.t('importBackupHelp'))}</span>
                </div>
                <div class="games-offline-share-help">${this.escapeHtml(i18n.t('savedGamesOfflineShareHelp'))}</div>
                <div class="games-filter-row">
                    <input type="search" class="games-search-box" placeholder="${this.escapeHtml(i18n.t('searchGamesPlaceholder'))}">
                    <select class="games-category-filter" aria-label="${this.escapeHtml(i18n.t('filterByCategory'))}">
                        ${buildCategoryOptions('', true)}
                    </select>
                    <input type="search" class="games-folder-filter" placeholder="${this.escapeHtml(i18n.t('filterByFolder'))}">
                </div>
                <datalist id="savedGameFolderNames">${buildFolderDatalistOptions()}</datalist>
                ${folderEntries.length > 0 ? `
                <div class="folder-management-panel">
                    <div class="folder-management-title">${this.escapeHtml(i18n.t('folderManagementTitle'))}</div>
                    <select class="rename-folder-category" aria-label="${this.escapeHtml(i18n.t('gameCategoryLabel'))}">
                        ${buildCategoryOptions('', true)}
                    </select>
                    <select class="rename-folder-from" aria-label="${this.escapeHtml(i18n.t('selectFolderToRename'))}">
                        ${buildFolderOptions('', '')}
                    </select>
                    <input type="text" class="rename-folder-to" placeholder="${this.escapeHtml(i18n.t('renameFolderPlaceholder'))}">
                    <button type="button" class="secondary-btn rename-folder-btn">${this.escapeHtml(i18n.t('renameFolder'))}</button>
                </div>` : ''}
                <div class="games-list">${listHtml}</div>
                <button type="button" class="secondary-btn close-modal">${i18n.t('cancel')}</button>
            </div>`;

        document.body.appendChild(modal);

        // 検索フィルター
        const applyFilters = () => {
            const searchBox = modal.querySelector('.games-search-box');
            const categoryFilter = modal.querySelector('.games-category-filter');
            const folderFilter = modal.querySelector('.games-folder-filter');
            const q = searchBox.value.toLowerCase().trim();
            const selectedCategory = categoryFilter.value;
            const folderQuery = folderFilter.value.toLowerCase().trim();
            modal.querySelectorAll('.game-item').forEach(item => {
                const matchSearch = !q || item.dataset.away.includes(q) || item.dataset.home.includes(q);
                const matchCategory = !selectedCategory || item.dataset.category === selectedCategory;
                const matchFolder = !folderQuery || item.dataset.folder.includes(folderQuery);
                const match = matchSearch && matchCategory && matchFolder;
                item.style.display = match ? '' : 'none';
            });
            // セクション見出しの表示制御
            modal.querySelectorAll('.games-section-title').forEach(title => {
                const hasVisible = [...title.parentNode.querySelectorAll('.game-item')].some(el => {
                    // この見出しに属するアイテムかチェック
                    let cursor = el.previousElementSibling;
                    while (cursor && !cursor.classList.contains('games-section-title')) {
                        cursor = cursor.previousElementSibling;
                    }
                    return cursor === title && el.style.display !== 'none';
                });
                title.style.display = hasVisible ? '' : 'none';
            });
        };
        const searchBox = modal.querySelector('.games-search-box');
        const categoryFilter = modal.querySelector('.games-category-filter');
        const folderFilter = modal.querySelector('.games-folder-filter');
        searchBox.addEventListener('input', applyFilters);
        categoryFilter.addEventListener('change', applyFilters);
        folderFilter.addEventListener('input', applyFilters);

        const importButton = modal.querySelector('.import-backup-btn');
        const importInput = modal.querySelector('.import-backup-input');
        importButton.addEventListener('click', () => {
            importInput.value = '';
            importInput.click();
        });
        importInput.addEventListener('change', async () => {
            const importedGameId = await this.importSavedGameBackupFile(importInput.files?.[0]);
            if (!importedGameId) return;
            document.body.removeChild(modal);
            this.showGamesModal(await storage.getAllGames());
            this.loadActiveGamesOnWelcome();
        });

        const renameCategory = modal.querySelector('.rename-folder-category');
        const renameFrom = modal.querySelector('.rename-folder-from');
        const renameTo = modal.querySelector('.rename-folder-to');
        const renameButton = modal.querySelector('.rename-folder-btn');
        const refreshRenameFolderOptions = () => {
            if (!renameFrom || !renameCategory) return;
            renameFrom.innerHTML = buildFolderOptions(renameCategory.value, '');
        };
        renameCategory?.addEventListener('change', refreshRenameFolderOptions);
        renameButton?.addEventListener('click', async () => {
            const category = renameCategory.value || renameFrom.selectedOptions[0]?.dataset.category || '';
            const oldFolderName = renameFrom.value;
            const newFolderName = renameTo.value.trim();
            if (!category || !oldFolderName || !newFolderName) {
                this.showError(i18n.t('renameFolderRequired'));
                return;
            }
            try {
                const allGames = await storage.getAllGames();
                let updatedCount = 0;
                for (const game of allGames) {
                    const classification = this.normalizeGameClassification(game.classification);
                    if (classification.category !== category || classification.folderName !== oldFolderName) continue;
                    game.classification = { ...classification, folderName: newFolderName };
                    await storage.saveGame(game);
                    updatedCount += 1;
                }
                if (gameManager.currentGame) {
                    const currentClassification = this.normalizeGameClassification(gameManager.currentGame.classification);
                    if (currentClassification.category === category && currentClassification.folderName === oldFolderName) {
                        gameManager.currentGame.classification = { ...currentClassification, folderName: newFolderName };
                    }
                }
                this.showSuccess(i18n.t('folderRenamed').replace('{count}', updatedCount));
                document.body.removeChild(modal);
                this.showGamesModal(await storage.getAllGames());
            } catch (err) {
                console.error('フォルダ名変更エラー:', err);
                this.showError(i18n.t('renameFolderError'));
            }
        });

        modal.querySelector('.close-modal').addEventListener('click', () => document.body.removeChild(modal));

        const bindButtons = (container) => {
            container.querySelectorAll('.load-game-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    await this.loadGame(parseInt(e.target.dataset.gameId));
                    document.body.removeChild(modal);
                });
            });
            container.querySelectorAll('.view-game-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    await this.showGameDetail(parseInt(e.target.dataset.gameId));
                });
            });
            container.querySelectorAll('.share-game-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    await this.shareSavedGame(parseInt(e.target.dataset.gameId));
                });
            });
            container.querySelectorAll('.export-image-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    await this.exportSavedGameImage(parseInt(e.target.dataset.gameId));
                });
            });
            container.querySelectorAll('.print-game-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    await this.printSavedGameScoreSheet(parseInt(e.target.dataset.gameId));
                });
            });
            container.querySelectorAll('.export-csv-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    await this.exportSavedGameCsv(parseInt(e.target.dataset.gameId));
                });
            });
            container.querySelectorAll('.export-backup-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    await this.exportSavedGameBackup(parseInt(e.target.dataset.gameId));
                });
            });
            container.querySelectorAll('.save-classification-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const button = e.target;
                    const gameId = parseInt(button.dataset.gameId);
                    const item = button.closest('.game-item');
                    const classification = {
                        category: item.querySelector('.game-category-select').value || 'uncategorized',
                        folderName: item.querySelector('.game-folder-input').value.trim(),
                        tags: item.querySelector('.game-tags-input').value
                            .split(',')
                            .map(tag => tag.trim())
                            .filter(Boolean),
                        memo: item.querySelector('.game-memo-input').value.trim()
                    };
                    try {
                        const game = await storage.loadGame(gameId);
                        if (!game) throw new Error('Game not found');
                        game.classification = this.normalizeGameClassification(classification);
                        await storage.saveGame(game);
                        if (gameManager.currentGame?.id === gameId) {
                            gameManager.currentGame.classification = game.classification;
                        }
                        item.dataset.category = game.classification.category;
                        item.dataset.folder = (game.classification.folderName || '').toLowerCase();
                        const categoryLabel = this.getGameCategoryLabel(game.classification.category);
                        item.querySelector('.game-category-badge').textContent = game.classification.folderName
                            ? `${categoryLabel} / ${game.classification.folderName}`
                            : categoryLabel;
                        this.showSuccess(i18n.t('classificationSaved'));
                        applyFilters();
                    } catch (err) {
                        console.error('分類保存エラー:', err);
                        this.showError(i18n.t('classificationSaveError'));
                    }
                });
            });
            container.querySelectorAll('.delete-game-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (!confirm(i18n.t('confirmDeleteGame'))) return;
                    const gameId = parseInt(e.target.dataset.gameId);
                    try {
                        await storage.deleteGame(gameId);
                        const item = e.target.closest('.game-item');
                        item.remove();
                        if (modal.querySelectorAll('.game-item').length === 0) {
                            modal.querySelector('.games-list').innerHTML = `<p class="no-games-msg">${i18n.t('noSavedGames')}</p>`;
                        }
                    } catch (err) {
                        this.showError('削除に失敗しました');
                    }
                });
            });
        };

        bindButtons(modal);
    }

    async showGameDetail(gameId) {
        try {
            const game = await storage.loadGame(gameId);
            const allInnings = await storage.getInningsByGame(gameId);
            allInnings.sort((a, b) => a.inning - b.inning || (a.isTopHalf ? -1 : 1));

            const atBatsByInningId = {};
            const pitchesByAtBatId = {};

            if (game.recordingLevel === 'batter' || game.recordingLevel === 'pitch') {
                for (const inning of allInnings) {
                    const atBats = await storage.getAtBatsByInning(inning.id);
                    atBatsByInningId[inning.id] = atBats;
                    if (game.recordingLevel === 'pitch') {
                        for (const ab of atBats) {
                            pitchesByAtBatId[ab.id] = await storage.getPitchesByAtBat(ab.id);
                        }
                    }
                }
            }

            // プレイヤーマップ作成
            const playerMap = {};
            ['home', 'away'].forEach(team => {
                (game.players[team] || []).forEach(p => { playerMap[p.id] = p; });
            });

            document.getElementById('gameDetailBody').innerHTML =
                this._buildGameDetailHTML(game, allInnings, atBatsByInningId, pitchesByAtBatId, playerMap);
            document.getElementById('gameDetailTitle').textContent =
                `${game.awayTeam || '?'} vs ${game.homeTeam || '?'}  ${new Date(game.date).toLocaleDateString()}`;
            document.getElementById('gameDetailShareBtn').dataset.gameId = gameId;
            document.getElementById('gameDetailExportImageBtn').dataset.gameId = gameId;
            document.getElementById('gameDetailPrintBtn').dataset.gameId = gameId;
            document.getElementById('gameDetailExportCsvBtn').dataset.gameId = gameId;
            document.getElementById('gameDetailExportBackupBtn').dataset.gameId = gameId;
            document.getElementById('gameDetailModal').classList.remove('modal--hidden');
        } catch (err) {
            console.error('試合詳細取得エラー:', err);
            this.showError('試合詳細の取得に失敗しました');
        }
    }

    _buildGameDetailHTML(game, innings, atBatsByInningId, pitchesByAtBatId, playerMap) {
        let html = this._buildScoreboard(game, innings);
        if (game.recordingLevel === 'batter' || game.recordingLevel === 'pitch') {
            html += this._buildBattingTables(game, innings, atBatsByInningId, pitchesByAtBatId, playerMap);
            html += this._buildPitcherSummary(game, innings, atBatsByInningId, pitchesByAtBatId, playerMap);
        }
        if (game.recordingLevel === 'pitch') {
            html += this._buildPitchDetailSection(game, innings, atBatsByInningId, pitchesByAtBatId, playerMap);
        }
        return html;
    }

    // 投球結果を短縮記号に変換
    _pitchResultSymbol(result) {
        const map = {
            'ball':             { sym: 'B',  cls: 'pr-ball' },
            'strike_looking':   { sym: '見', cls: 'pr-strike' },
            'strike_swinging':  { sym: '振', cls: 'pr-swing' },
            'foul':             { sym: 'F',  cls: 'pr-foul' },
            'foul_bunt':        { sym: 'Fバ',cls: 'pr-foul' },
            'foul_fly_dropped': { sym: 'F↓', cls: 'pr-foul' },
            'hit':              { sym: '打',  cls: 'pr-hit' },
            'hit_by_pitch':     { sym: '死',  cls: 'pr-hbp' },
        };
        return map[result] || { sym: result || '?', cls: '' };
    }

    // 球ごと記録の投球詳細セクション
    _buildPitchDetailSection(game, innings, atBatsByInningId, pitchesByAtBatId, playerMap) {
        const sortedInnings = [...innings].sort((a, b) =>
            a.inning !== b.inning ? a.inning - b.inning : (a.isTopHalf ? -1 : 1));

        let blocks = '';
        for (const inn of sortedInnings) {
            const atBats = (atBatsByInningId[inn.id] || []);
            if (atBats.length === 0) continue;

            const halfLabel = inn.isTopHalf ? '表' : '裏';
            const teamName  = inn.isTopHalf ? game.awayTeam : game.homeTeam;
            const incTag    = inn.incomplete ? ' <span class="pitch-inc-tag">✕</span>' : '';

            let atBatBlocks = '';
            for (const ab of atBats) {
                const player  = playerMap[ab.playerId];
                const name    = player ? player.name : `${ab.battingOrder}番`;
                const { text: resText, isHit } = this._atBatCellText(ab);
                const resCls  = isHit ? 'pd-result-hit' : '';
                const pitches = (pitchesByAtBatId[ab.id] || [])
                    .sort((x, y) => x.pitchNumber - y.pitchNumber);

                let pitchSeq = '';
                if (pitches.length > 0) {
                    pitchSeq = pitches.map(p => {
                        const { sym, cls } = this._pitchResultSymbol(p.result);
                        const typePart = p.pitchType ? `<span class="pd-ptype">${p.pitchType}</span>` : '';
                        const velPart  = p.velocity  ? `<span class="pd-vel">${p.velocity}km</span>` : '';
                        const count    = p.count ? `${p.count.balls}B-${p.count.strikes}S` : '';
                        return `<span class="pd-pitch">
                            <span class="pd-num">${p.pitchNumber}</span>
                            <span class="pd-sym ${cls}">${sym}</span>
                            ${typePart}${velPart}
                            <span class="pd-count">${count}</span>
                        </span>`;
                    }).join('');
                } else {
                    pitchSeq = `<span class="pd-no-pitch">投球データなし</span>`;
                }

                const detail = ab.resultDetail ? `<span class="pd-detail">（${ab.resultDetail}）</span>` : '';
                atBatBlocks += `<div class="pd-atbat">
                    <div class="pd-atbat-header">
                        <span class="pd-order">${ab.battingOrder}番</span>
                        <span class="pd-name">${name}</span>
                        <span class="pd-res ${resCls}">${resText}</span>
                        ${detail}
                        <span class="pd-total">${pitches.length}球</span>
                    </div>
                    <div class="pd-pitches">${pitchSeq}</div>
                </div>`;
            }

            blocks += `<details class="pd-inning-block" open>
                <summary class="pd-inning-title">
                    ${inn.inning}回${halfLabel}【${teamName}】${incTag}
                    <span class="pd-inning-runs">${inn.runs}点</span>
                </summary>
                ${atBatBlocks}
            </details>`;
        }

        if (!blocks) return '';

        return `<div class="game-detail-section pitch-detail-section">
            <h4 class="game-detail-section-title">投球内容</h4>
            ${blocks}
        </div>`;
    }

    _buildScoreboard(game, innings) {
        const reg = game.gameRules?.regulationInnings || 9;
        const maxInning = Math.max(reg, ...innings.map(i => i.inning), 1);

        const inningMap = {};
        innings.forEach(inn => { inningMap[`${inn.inning}-${inn.isTopHalf}`] = inn; });

        const cell = (n, isTop) => {
            const inn = inningMap[`${n}-${isTop}`];
            if (!inn) return '<td>-</td>';
            if (inn.incomplete) return `<td><span class="score-incomplete">${inn.runs}✕</span></td>`;
            return `<td>${inn.runs}</td>`;
        };

        const cols = Array.from({length: maxInning}, (_, i) => `<th>${i+1}</th>`).join('');
        const awayRow = Array.from({length: maxInning}, (_, i) => cell(i+1, true)).join('');
        const homeRow = Array.from({length: maxInning}, (_, i) => cell(i+1, false)).join('');

        const sum = (isTop, key) => innings.filter(i => i.isTopHalf === isTop).reduce((s, i) => s + (i[key] || 0), 0);

        return `<div class="game-detail-section">
            <h4 class="game-detail-section-title">${i18n.t('gameDetailScoreboard')}</h4>
            <div class="scoreboard-wrapper">
                <table class="detail-scoreboard">
                    <thead><tr><th class="team-name-col">チーム</th>${cols}<th class="total-col">R</th><th class="total-col">H</th><th class="total-col">E</th></tr></thead>
                    <tbody>
                        <tr><td class="team-name-col">${game.awayTeam}</td>${awayRow}<td class="total-col">${sum(true,'runs')}</td><td class="total-col">${sum(true,'hits')}</td><td class="total-col">${sum(true,'errors')}</td></tr>
                        <tr><td class="team-name-col">${game.homeTeam}</td>${homeRow}<td class="total-col">${sum(false,'runs')}</td><td class="total-col">${sum(false,'hits')}</td><td class="total-col">${sum(false,'errors')}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    // 打球方向の略称を取得
    _directionAbbr(text) {
        const t = text || '';
        const patterns = [
            [/センター|中堅/, '中'], [/ライト|右翼/, '右'], [/レフト|左翼/, '左'],
            [/ショート|遊撃/, '遊'], [/サード|三塁/, '三'], [/セカンド|二塁/, '二'],
            [/ファースト|一塁/, '一'], [/ピッチャー|投手/, '投'], [/キャッチャー|捕手/, '捕'],
            [/^中/, '中'], [/^右/, '右'], [/^左/, '左'], [/^遊/, '遊'],
            [/^三/, '三'], [/^二/, '二'], [/^一/, '一'],
        ];
        for (const [pat, abbr] of patterns) { if (pat.test(t)) return abbr; }
        return '';
    }

    // 打席結果を2〜3文字の略称に変換し、安打かどうかも返す
    _atBatCellText(ab) {
        if (!ab || !ab.result) return { text: '···', isHit: false, isWalk: false };
        const r = ab.result;
        const d = (ab.resultDetail || '').trim();
        const isHit = ['single','double','triple','homerun','hit'].includes(r);
        const isWalk = ['walk','intentional_walk','hit_by_pitch'].includes(r);
        const dir = this._directionAbbr(d);
        let text;
        switch (r) {
            case 'single': case 'hit':          text = dir + '安'; break;
            case 'double':                       text = dir + '２'; break;
            case 'triple':                       text = dir + '３'; break;
            case 'homerun':                      text = (dir || '') + '本'; break;
            case 'groundout':                    text = (dir || '') + 'ゴ'; break;
            case 'flyout':                       text = (dir || '') + '飛'; break;
            case 'lineout':                      text = (dir || '') + '直'; break;
            case 'popout':                       text = (dir || '') + '飛'; break;
            case 'strikeout':                    text = '三振'; break;
            case 'strikeout_looking':            text = '見振'; break;
            case 'walk':                         text = '四球'; break;
            case 'intentional_walk':             text = '敬遠'; break;
            case 'hit_by_pitch':                 text = '死球'; break;
            case 'sacrifice_bunt':               text = '犠打'; break;
            case 'sacrifice_fly':                text = '犠飛'; break;
            case 'error':                        text = (dir || '') + 'E'; break;
            case 'fielders_choice':              text = 'FC'; break;
            case 'doubleplay':                   text = 'DP'; break;
            case 'interference':                 text = '妨害'; break;
            case 'intentional_drop':             text = '故落'; break;
            default: text = d ? d.slice(0, 3) : r.slice(0, 3);
        }
        return { text, isHit, isWalk };
    }

    _buildBattingTables(game, innings, atBatsByInningId, pitchesByAtBatId, playerMap) {
        const awayInnings = innings.filter(i => i.isTopHalf).sort((a,b) => a.inning - b.inning);
        const homeInnings = innings.filter(i => !i.isTopHalf).sort((a,b) => a.inning - b.inning);
        const maxInning = Math.max(
            game.gameRules?.regulationInnings || 9,
            ...innings.map(i => i.inning), 1
        );

        let html = `<div class="game-detail-section">
            <h4 class="game-detail-section-title">${i18n.t('gameDetailBatting')}</h4>`;
        html += this._buildTeamBattingGrid(game, 'away', awayInnings, atBatsByInningId, pitchesByAtBatId, playerMap, maxInning);
        html += this._buildTeamBattingGrid(game, 'home', homeInnings, atBatsByInningId, pitchesByAtBatId, playerMap, maxInning);
        html += '</div>';
        return html;
    }

    _buildTeamBattingGrid(game, team, teamInnings, atBatsByInningId, pitchesByAtBatId, playerMap, maxInning) {
        const teamName = team === 'away' ? game.awayTeam : game.homeTeam;
        const players = (game.players[team] || [])
            .filter(p => p.battingOrder > 0)
            .sort((a,b) => a.battingOrder - b.battingOrder || (a.enteredGameAt||'') > (b.enteredGameAt||'') ? 1 : -1);

        // inningId → { battingOrder → [AtBat] }
        const abMap = {};
        for (const inn of teamInnings) {
            abMap[inn.id] = {};
            for (const ab of (atBatsByInningId[inn.id] || [])) {
                const key = ab.battingOrder;
                if (!abMap[inn.id][key]) abMap[inn.id][key] = [];
                abMap[inn.id][key].push(ab);
            }
        }
        // inningNumber → Inning object
        const innByNum = {};
        teamInnings.forEach(i => { innByNum[i.inning] = i; });

        const inningHeaders = Array.from({length: maxInning}, (_,i) => `<th class="inning-col">${i+1}</th>`).join('');

        let rows = '';
        let prevOrder = -1;
        for (const player of players) {
            const stats = player.stats || {};
            const ab = stats.atBats || 0;
            const h  = stats.hits || 0;
            const avg = ab > 0 ? (h/ab).toFixed(3).replace(/^0/,'') : '.---';
            const isSub = player.battingOrder === prevOrder;

            const inningCells = Array.from({length: maxInning}, (_,idx) => {
                const num = idx + 1;
                const inn = innByNum[num];
                if (!inn) return `<td class="no-bat-cell"><span>···</span></td>`;
                const absHere = (abMap[inn.id] || {})[player.battingOrder] || [];
                if (absHere.length === 0) return `<td class="no-bat-cell"><span>···</span></td>`;

                const parts = absHere.map(a => {
                    const { text, isHit, isWalk } = this._atBatCellText(a);
                    const cls = isHit ? 'hit-cell' : isWalk ? 'walk-cell' : '';
                    // pitch-level は投球詳細セクションで表示するのでツールチップ不要
                    // batter-level はresultDetailをツールチップに表示
                    const tip = (game.recordingLevel === 'batter' && a.resultDetail)
                        ? ` title="${a.resultDetail}"` : '';
                    return `<span class="ab-result ${cls}"${tip}>${text}</span>`;
                });
                const incMark = inn.incomplete ? ' inc' : '';
                return `<td class="bat-cell${incMark}">${parts.join(' ')}</td>`;
            }).join('');

            const dp = stats.doublePlaysBatted || 0;
            const dpCell = dp > 0 ? `<td class="stat-col dp-cell">${dp}</td>` : `<td class="stat-col">-</td>`;
            rows += `<tr class="${isSub ? 'substitute-row' : ''}">
                <td class="pos-col">${player.position||'-'}</td>
                <td class="name-col">${player.name||'-'}</td>
                <td class="stat-col">${ab}</td>
                <td class="stat-col">${h}</td>
                <td class="stat-col">${stats.rbis||0}</td>
                <td class="stat-col">${avg}</td>
                <td class="stat-col">${stats.homeruns||0}</td>
                ${dpCell}
                ${inningCells}
            </tr>`;
            prevOrder = player.battingOrder;
        }

        // 合計行
        const totAB  = players.reduce((s,p) => s+(p.stats?.atBats||0), 0);
        const totH   = players.reduce((s,p) => s+(p.stats?.hits||0), 0);
        const totRBI = players.reduce((s,p) => s+(p.stats?.rbis||0), 0);
        const totHR  = players.reduce((s,p) => s+(p.stats?.homeruns||0), 0);
        const totDP  = players.reduce((s,p) => s+(p.stats?.doublePlaysBatted||0), 0);
        const totAvg = totAB > 0 ? (totH/totAB).toFixed(3).replace(/^0/,'') : '.---';
        const totLOB = teamInnings.reduce((s,i) => s+(i.leftOnBase||0), 0);
        const blankCols = Array.from({length: maxInning}, () => '<td></td>').join('');
        const lobNote = totLOB > 0 ? `　残塁${totLOB}` : '';

        return `<div class="team-batting-grid">
            <h5 class="batting-grid-title">【${teamName}】</h5>
            <div class="batting-grid-scroll">
                <table class="batting-grid-table">
                    <thead><tr>
                        <th class="pos-col">守備</th>
                        <th class="name-col">選手名</th>
                        <th class="stat-col">打数</th><th class="stat-col">安打</th>
                        <th class="stat-col">打点</th><th class="stat-col">打率</th>
                        <th class="stat-col">HR</th>
                        <th class="stat-col" title="併殺打">DP</th>
                        ${inningHeaders}
                    </tr></thead>
                    <tbody>
                        ${rows}
                        <tr class="totals-row">
                            <td colspan="2">計${lobNote}</td>
                            <td class="stat-col">${totAB}</td><td class="stat-col">${totH}</td>
                            <td class="stat-col">${totRBI}</td><td class="stat-col">${totAvg}</td>
                            <td class="stat-col">${totHR}</td>
                            <td class="stat-col">${totDP > 0 ? totDP : '-'}</td>
                            ${blankCols}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    _buildPitcherSummary(game, innings, atBatsByInningId, pitchesByAtBatId, playerMap) {
        const t = k => i18n.t(k);
        const isPitch = game.recordingLevel === 'pitch';
        const isBatterOrPitch = game.recordingLevel === 'batter' || isPitch;

        // 球数集計（pitch level時：投手チームの半イニングの投球数を合算）
        const pitchCountByTeam = { away: 0, home: 0 };
        if (isPitch && pitchesByAtBatId) {
            for (const inn of (innings || [])) {
                const pitchingTeam = inn.isTopHalf ? 'home' : 'away'; // 守備側が投手チーム
                for (const ab of (atBatsByInningId[inn.id] || [])) {
                    pitchCountByTeam[pitchingTeam] += (pitchesByAtBatId[ab.id] || []).length;
                }
            }
        }

        let html = `<div class="game-detail-section"><h4 class="game-detail-section-title">${t('gameDetailPitcher')}</h4>`;

        ['away', 'home'].forEach(team => {
            const teamName = team === 'away' ? game.awayTeam : game.homeTeam;
            const pitchers = (game.players[team] || []).filter(p =>
                p.stats && (p.stats.inningsPitched > 0 || p.position === 'P')
            );
            if (pitchers.length === 0) return;

            const pitchCol   = isPitch        ? `<th>球数</th>`          : '';
            const erEraCol   = isBatterOrPitch ? `<th title="自責点">ER</th><th title="防御率">ERA</th>` : '';
            html += `<h5 class="pitcher-team-title">${teamName}</h5>
                <table class="pitcher-table">
                    <thead><tr>
                        <th>${t('colPlayer')}</th><th>${t('colInningsPitched')}</th>
                        <th>${t('colHitsAllowed')}</th><th>${t('colStrikeouts')}</th>
                        <th>${t('colWalks')}</th><th>${t('colHBP')}</th>
                        <th title="失点">R</th>
                        ${erEraCol}
                        ${pitchCol}
                    </tr></thead><tbody>`;

            const totalPitches = pitchCountByTeam[team];
            for (const p of pitchers) {
                const ip = p.stats.inningsPitched || 0;
                const full = Math.floor(ip / 3);
                const outs = ip % 3;
                const ipStr = outs > 0 ? `${full}.${outs}` : `${full}`;
                const runsAllowed = p.stats.runsAllowed ?? 0;
                const era = isBatterOrPitch ? (gameManager.getERA(p) ?? '-') : '';
                const er  = isBatterOrPitch ? (p.stats.earnedRuns ?? 0) : '';
                // 複数投手の場合は球数を正確に按分できないため合計のみ表示
                const pitchTd  = isPitch
                    ? `<td class="pitch-count-cell">${pitchers.length === 1 ? totalPitches : '-'}</td>`
                    : '';
                const erEraTds = isBatterOrPitch
                    ? `<td class="earned-runs-cell">${er}</td><td class="era-cell">${era}</td>`
                    : '';
                html += `<tr>
                    <td>${p.name}</td><td>${ipStr}</td>
                    <td>${p.stats.hits || 0}</td><td>${p.stats.strikeoutsPitched || 0}</td>
                    <td>${p.stats.walksAllowed || 0}</td><td>${p.stats.hitByPitchAllowed || 0}</td>
                    <td class="runs-allowed-cell">${runsAllowed}</td>
                    ${erEraTds}
                    ${pitchTd}
                </tr>`;
            }
            if (isPitch && pitchers.length > 1) {
                // 複数投手なら合計行を追加
                const totalR  = pitchers.reduce((s, p) => s + (p.stats.runsAllowed ?? 0), 0);
                const totalER = pitchers.reduce((s, p) => s + (p.stats.earnedRuns ?? 0), 0);
                const blankER = isBatterOrPitch ? `<td></td><td></td>` : '';
                html += `<tr class="totals-row">
                    <td>合計</td><td></td><td></td><td></td><td></td><td></td>
                    <td class="runs-allowed-cell">${totalR}</td>
                    ${isBatterOrPitch ? `<td class="earned-runs-cell">${totalER}</td><td></td>` : ''}
                    <td class="pitch-count-cell">${totalPitches}</td>
                </tr>`;
            }
            html += `</tbody></table>`;
        });

        html += '</div>';
        return html;
    }

    async loadGame(gameId) {
        try {
            await gameManager.loadGame(gameId);

            // データマイグレーション: 古い形式の選手名を修正
            this.migratePlayerNames();

            this.setupGameScreen();
            this.showScreen('gameScreen');
            this.updateGameDisplay();
        } catch (error) {
            console.error('試合読み込みエラー:', error);
            this.showError('試合の読み込みに失敗しました');
        }
    }

    // 古い形式の選手名（「1番」「1º」など）を数字のみに変換
    migratePlayerNames() {
        const game = gameManager.currentGame;
        if (!game) return;

        ['home', 'away'].forEach(team => {
            game.players[team].forEach(player => {
                // 名前が「数字+サフィックス」の形式の場合、数字のみに変換
                const match = player.name.match(/^(\d+)(番|º|°)?$/);
                if (match) {
                    player.name = match[1];  // 数字部分のみ
                    console.log(`Migrated player name: ${match[0]} -> ${player.name}`);
                }
            });
        });
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;

        // ウェルカム画面に戻るときは継続試合カードを更新
        if (screenId === 'welcomeScreen') {
            this.loadActiveGamesOnWelcome();
        }

        // 画面切り替え後に翻訳を更新
        setTimeout(() => {
            i18n.updatePageContent();
        }, 100);
    }

    showError(message) {
        alert(i18n.t('errorPrefix') + message);
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
        const resultLabel = this.formatAtBatResult(result);
        const isHit = ['single', 'double', 'triple', 'homerun'].includes(result);

        const modal = document.createElement('div');
        modal.className = 'modal runner-modal';
        modal.innerHTML = `
            <div class="modal-content runner-modal-content">
                <h3>${i18n.t('runner_advancement')}</h3>

                <div class="situation-summary">
                    <div class="play-summary">
                        <strong>${batter.battingOrder}${i18n.t('battingOrderSuffix')} ${batter.name}</strong> → ${resultLabel}
                        ${resultDetail ? `(${resultDetail})` : ''}
                    </div>
                    <div class="before-situation">
                        <strong>打席前:</strong> ${outs}${i18n.t('outs')}
                        ${this.formatRunnersDisplay(currentRunners)}
                    </div>
                </div>

                <div class="runner-adjustment">
                    <h4>${i18n.t('runner_advancement')}</h4>

                    ${!isHit && gameManager.isOutResult(result) ? `
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

                    ${isHit ? this.generateHitRunnerSelections(result, currentRunners) :
                      result === 'groundout' ? this.generateGroundoutRunnerSelections(currentRunners) :
                      (result === 'flyout' || result === 'lineout') ? this.generateTagUpRunnerSelections(currentRunners) :
                      (result === 'strikeout_passed_ball' || (result === 'strikeout' && this.selectedDroppedThird === 'yes')) ? this.generateDroppedThirdStrikeSelections(currentRunners) :
                      this.generateGenericRunnerSelections(result, currentRunners, advancement)}
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
        this.updateCalculatedResult(modal);

        modal.querySelector('.apply-advancement').addEventListener('click', async () => {
            const customAdvancement = this.getCustomAdvancement(modal, advancement);
            document.body.removeChild(modal);

            // ボールインプレー/デッド判定
            const previousOuts = gameManager.currentGame.outs - (customAdvancement.outsAdded || 0);
            const isPlayContinuing = gameManager.isPlayContinuing(result, previousOuts);

            if (isPlayContinuing) {
                // ボールインプレー：追加プレー確認モーダルを表示（fromPitchInterfaceフラグは引き継がれる）
                this.showAdditionalPlayModal(result, resultDetail, customAdvancement, batter);
            } else {
                // ボールデッド：即座に完了してバナーを表示
                const fromPitch = this.fromPitchInterface;
                this.fromPitchInterface = false;
                await this.finalizeAtBat(result, resultDetail, customAdvancement, batter);
                this.showBallDeadBanner();
                if (fromPitch) this.prepareNextBatter();
            }
        });

        modal.querySelector('.auto-apply').addEventListener('click', async () => {
            document.body.removeChild(modal);

            // ボールインプレー/デッド判定
            const previousOuts = gameManager.currentGame.outs - (advancement.outsAdded || 0);
            const isPlayContinuing = gameManager.isPlayContinuing(result, previousOuts);

            if (isPlayContinuing) {
                // ボールインプレー：追加プレー確認モーダルを表示（fromPitchInterfaceフラグは引き継がれる）
                this.showAdditionalPlayModal(result, resultDetail, advancement, batter);
            } else {
                // ボールデッド：即座に完了してバナーを表示
                const fromPitch = this.fromPitchInterface;
                this.fromPitchInterface = false;
                await this.finalizeAtBat(result, resultDetail, advancement, batter);
                this.showBallDeadBanner();
                if (fromPitch) this.prepareNextBatter();
            }
        });

        modal.querySelector('.cancel-advancement').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    generateHitRunnerSelections(hitType, currentRunners) {
        let html = '';

        // 三塁走者
        if (currentRunners.third) {
            const options = gameManager.getHitAdvancementOptions(hitType, 'third', currentRunners);
            html += `
                <div class="runner-setting">
                    <label>${i18n.t('third_runner_to')}</label>
                    <select id="third-runner-result">
                        ${options.map(opt =>
                            `<option value="${opt.value}">${i18n.t(opt.label)}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }

        // 二塁走者
        if (currentRunners.second) {
            const options = gameManager.getHitAdvancementOptions(hitType, 'second', currentRunners);
            html += `
                <div class="runner-setting">
                    <label>${i18n.t('second_runner_to')}</label>
                    <select id="second-runner-result">
                        ${options.map(opt =>
                            `<option value="${opt.value}">${i18n.t(opt.label)}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }

        // 一塁走者
        if (currentRunners.first) {
            const options = gameManager.getHitAdvancementOptions(hitType, 'first', currentRunners);
            html += `
                <div class="runner-setting">
                    <label>${i18n.t('first_runner_to')}</label>
                    <select id="first-runner-result">
                        ${options.map(opt =>
                            `<option value="${opt.value}">${i18n.t(opt.label)}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }

        // 打者走者（本塁打以外）
        if (hitType !== 'homerun') {
            const options = gameManager.getHitAdvancementOptions(hitType, 'batter', currentRunners);
            html += `
                <div class="runner-setting">
                    <label>${i18n.t('batter_runner_to')}</label>
                    <select id="batter-result">
                        ${options.map(opt =>
                            `<option value="${opt.value}">${opt.label}${i18n.t('baseSuffix')}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }

        return html;
    }

    generateGenericRunnerSelections(result, currentRunners, advancement) {
        let html = '';
        const fieldersChoiceDefaultOut = result === 'fielders_choice'
            ? (currentRunners.first ? 'first' : currentRunners.second ? 'second' : currentRunners.third ? 'third' : null)
            : null;

        // 三塁走者
        if (currentRunners.third) {
            html += `
                <div class="runner-setting">
                    <label>3塁走者:</label>
                    <select id="third-runner-result">
                        <option value="home" ${advancement.runsScored > 0 ? 'selected' : ''}>本塁生還</option>
                        <option value="third" ${advancement.newRunners.third === currentRunners.third ? 'selected' : ''}>3塁残留</option>
                        <option value="out" ${fieldersChoiceDefaultOut === 'third' ? 'selected' : ''}>本塁憤死(アウト)</option>
                    </select>
                </div>
            `;
        }

        // 二塁走者
        if (currentRunners.second) {
            html += `
                <div class="runner-setting">
                    <label>2塁走者:</label>
                    <select id="second-runner-result">
                        <option value="home">本塁生還</option>
                        <option value="third" ${advancement.newRunners.third === currentRunners.second ? 'selected' : ''}>3塁進塁</option>
                        <option value="second" ${advancement.newRunners.second === currentRunners.second ? 'selected' : ''}>2塁残留</option>
                        <option value="out" ${fieldersChoiceDefaultOut === 'second' ? 'selected' : ''}>憤死(アウト)</option>
                    </select>
                </div>
            `;
        }

        // 一塁走者
        if (currentRunners.first) {
            html += `
                <div class="runner-setting">
                    <label>1塁走者:</label>
                    <select id="first-runner-result">
                        <option value="home">本塁生還</option>
                        <option value="third" ${advancement.newRunners.third === currentRunners.first ? 'selected' : ''}>3塁進塁</option>
                        <option value="second" ${advancement.newRunners.second === currentRunners.first ? 'selected' : ''}>2塁進塁</option>
                        <option value="first" ${advancement.newRunners.first === currentRunners.first ? 'selected' : ''}>1塁残留</option>
                        <option value="out" ${fieldersChoiceDefaultOut === 'first' ? 'selected' : ''}>憤死(アウト)</option>
                    </select>
                </div>
            `;
        }

        // 打者
        if (advancement.batterResult !== 'out') {
            html += `
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
            `;
        }

        return html;
    }

    generateGroundoutRunnerSelections(currentRunners) {
        let html = '';
        const classification = gameManager.getGroundoutRunnerClassification(currentRunners);

        html += '<p class="info-text">⚾ ゴロアウト: 走者の進塁を選択してください</p>';

        // 打者は常にアウト
        html += `
            <div class="runner-setting">
                <label><strong>打者:</strong></label>
                <span>アウト（固定）</span>
            </div>
        `;

        // 三塁走者
        if (currentRunners.third) {
            const options = gameManager.getGroundoutRunnerOptions('third', classification.third, 0);
            const classLabel = classification.third === 'forced' ? '【強制走者】' : '【自由走者】';
            html += `
                <div class="runner-setting">
                    <label>3塁走者 ${classLabel}:</label>
                    <select id="third-runner-result">
                        ${options.map(opt =>
                            `<option value="${opt.value}">${opt.label}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }

        // 二塁走者
        if (currentRunners.second) {
            const options = gameManager.getGroundoutRunnerOptions('second', classification.second, 0);
            const classLabel = classification.second === 'forced' ? '【強制走者】' : '【自由走者】';
            html += `
                <div class="runner-setting">
                    <label>2塁走者 ${classLabel}:</label>
                    <select id="second-runner-result">
                        ${options.map(opt =>
                            `<option value="${opt.value}">${opt.label}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }

        // 一塁走者
        if (currentRunners.first) {
            const options = gameManager.getGroundoutRunnerOptions('first', classification.first, 0);
            const classLabel = classification.first === 'forced' ? '【強制走者】' : '【自由走者】';
            html += `
                <div class="runner-setting">
                    <label>1塁走者 ${classLabel}:</label>
                    <select id="first-runner-result">
                        ${options.map(opt =>
                            `<option value="${opt.value}">${opt.label}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }

        return html;
    }

    generateTagUpRunnerSelections(currentRunners) {
        let html = '';

        html += '<p class="info-text">⚾ フライ/ライナーアウト: タッチアップを選択してください（3塁→2塁→1塁の順）</p>';

        // 打者は常にアウト
        html += `
            <div class="runner-setting">
                <label><strong>打者:</strong></label>
                <span>アウト（固定）</span>
            </div>
        `;

        // 三塁走者から処理（タッチアップは後方から処理）
        if (currentRunners.third) {
            const options = gameManager.getTagUpOptions('third');
            html += `
                <div class="runner-setting">
                    <label>3塁走者:</label>
                    <select id="third-runner-result">
                        ${options.map(opt =>
                            `<option value="${opt.value}">${opt.label}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }

        // 二塁走者
        if (currentRunners.second) {
            const options = gameManager.getTagUpOptions('second');
            html += `
                <div class="runner-setting">
                    <label>2塁走者:</label>
                    <select id="second-runner-result">
                        ${options.map(opt =>
                            `<option value="${opt.value}">${opt.label}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }

        // 一塁走者
        if (currentRunners.first) {
            const options = gameManager.getTagUpOptions('first');
            html += `
                <div class="runner-setting">
                    <label>1塁走者:</label>
                    <select id="first-runner-result">
                        ${options.map(opt =>
                            `<option value="${opt.value}">${opt.label}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }

        return html;
    }

    generateDroppedThirdStrikeSelections(currentRunners) {
        let html = '';

        html += '<p class="info-text">⚾ 三振+振り逃げ: 打者と走者の進塁を選択してください</p>';

        // 打者の選択肢
        const batterOptions = gameManager.getDroppedThirdStrikeOptions();
        html += `
            <div class="runner-setting">
                <label><strong>打者:</strong></label>
                <select id="batter-result">
                    ${batterOptions.map(opt =>
                        `<option value="${opt.value}">${opt.label}</option>`
                    ).join('')}
                </select>
            </div>
        `;

        // 三塁走者（走者がいれば、盗塁・牽制死の可能性）
        if (currentRunners.third) {
            html += `
                <div class="runner-setting">
                    <label>3塁走者:</label>
                    <select id="third-runner-result">
                        <option value="stay">3塁残留</option>
                        <option value="home">ホーム生還（盗塁成功）</option>
                        <option value="home-out">ホーム試みてアウト（盗塁失敗）</option>
                        <option value="out">牽制死</option>
                    </select>
                </div>
            `;
        }

        // 二塁走者
        if (currentRunners.second) {
            html += `
                <div class="runner-setting">
                    <label>2塁走者:</label>
                    <select id="second-runner-result">
                        <option value="stay">2塁残留</option>
                        <option value="3B">3塁進塁（盗塁成功）</option>
                        <option value="3B-out">3塁試みてアウト（盗塁失敗）</option>
                        <option value="out">牽制死</option>
                    </select>
                </div>
            `;
        }

        // 一塁走者（1塁が空いている場合のみ存在しない、または2アウトなら存在可能）
        if (currentRunners.first) {
            html += `
                <div class="runner-setting">
                    <label>1塁走者:</label>
                    <select id="first-runner-result">
                        <option value="stay">1塁残留</option>
                        <option value="2B">2塁進塁（盗塁成功）</option>
                        <option value="2B-out">2塁試みてアウト（盗塁失敗）</option>
                        <option value="out">牽制死</option>
                    </select>
                </div>
            `;
        }

        return html;
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

        // 各走者の結果を確認（安打形式の値も処理）
        ['third', 'second', 'first', 'batter'].forEach(runnerId => {
            const select = modal.querySelector(runnerId === 'batter' ? '#batter-result, #batter-runner-result' : `#${runnerId}-runner-result`);
            if (select) {
                const result = select.value;

                // 得点
                if (result === 'home' || result.includes('home')) {
                    runs++;
                    if (result === 'home-out') outsAdded++;
                }
                // アウトのみ（得点せず）
                else if (result === 'out' || result.endsWith('-out')) {
                    outsAdded++;
                }
                // 塁への到達（stay, 1B, 2B, 3B）
                else if (result !== 'stay') {
                    const runnerValue = runnerId === 'batter' ? 'batter' : runnerId;
                    if (result === '1B' || result === 'first') {
                        newRunners.first = runnerValue;
                    } else if (result === '2B' || result === 'second') {
                        newRunners.second = runnerValue;
                    } else if (result === '3B' || result === 'third') {
                        newRunners.third = runnerValue;
                    }
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

        // 各走者の結果を確認（安打形式の値も処理）
        ['third', 'second', 'first', 'batter'].forEach(runnerId => {
            const select = modal.querySelector(runnerId === 'batter' ? '#batter-result, #batter-runner-result' : `#${runnerId}-runner-result`);
            if (select) {
                const result = select.value;

                // 得点
                if (result === 'home' || result.includes('home')) {
                    runs++;
                    if (result === 'home-out') outsAdded++;
                }
                // アウトのみ（得点せず）
                else if (result === 'out' || result.endsWith('-out')) {
                    outsAdded++;
                }
                // 塁への到達（stay, 1B, 2B, 3B）
                else if (result !== 'stay') {
                    const runnerValue = runnerId === 'batter' ? 'batter' : runnerId;
                    if (result === '1B' || result === 'first') {
                        newRunners.first = runnerValue;
                    } else if (result === '2B' || result === 'second') {
                        newRunners.second = runnerValue;
                    } else if (result === '3B' || result === 'third') {
                        newRunners.third = runnerValue;
                    }
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

        for (let option of options) {
            option.disabled = false;
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
            alert(i18n.t('selectSubstitutionInfo'));
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
            alert(i18n.t('selectStolenBaseRunner'));
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

// ヘルパー関数：投手のイニング数を帯分数表示に変換
function formatInningsPitched(outs) {
    const fullInnings = Math.floor(outs / 3);
    const remainingOuts = outs % 3;
    if (remainingOuts === 0) {
        return `${fullInnings}回`;
    } else {
        return `${fullInnings}回${remainingOuts}/3`;
    }
}

const app = new BaseballApp();

// グローバルアクセス用
window.app = app;
window.formatInningsPitched = formatInningsPitched;

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
