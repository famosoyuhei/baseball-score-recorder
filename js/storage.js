class BaseballStorage {
    constructor() {
        this.dbName = 'BaseballScoreDB';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('データベース開始エラー:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('データベース初期化完了');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.createObjectStores();
            };
        });
    }

    createObjectStores() {
        if (!this.db.objectStoreNames.contains('games')) {
            const gameStore = this.db.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
            gameStore.createIndex('date', 'date', { unique: false });
            gameStore.createIndex('homeTeam', 'homeTeam', { unique: false });
            gameStore.createIndex('awayTeam', 'awayTeam', { unique: false });
        }

        if (!this.db.objectStoreNames.contains('players')) {
            const playerStore = this.db.createObjectStore('players', { keyPath: 'id', autoIncrement: true });
            playerStore.createIndex('team', 'team', { unique: false });
            playerStore.createIndex('name', 'name', { unique: false });
        }

        if (!this.db.objectStoreNames.contains('innings')) {
            const inningStore = this.db.createObjectStore('innings', { keyPath: 'id', autoIncrement: true });
            inningStore.createIndex('gameId', 'gameId', { unique: false });
            inningStore.createIndex('inning', 'inning', { unique: false });
        }

        if (!this.db.objectStoreNames.contains('atBats')) {
            const atBatStore = this.db.createObjectStore('atBats', { keyPath: 'id', autoIncrement: true });
            atBatStore.createIndex('gameId', 'gameId', { unique: false });
            atBatStore.createIndex('inningId', 'inningId', { unique: false });
            atBatStore.createIndex('playerId', 'playerId', { unique: false });
        }

        if (!this.db.objectStoreNames.contains('pitches')) {
            const pitchStore = this.db.createObjectStore('pitches', { keyPath: 'id', autoIncrement: true });
            pitchStore.createIndex('gameId', 'gameId', { unique: false });
            pitchStore.createIndex('atBatId', 'atBatId', { unique: false });
        }

        console.log('オブジェクトストア作成完了');
    }

    async saveGame(gameData) {
        console.log('Storage saveGame called with:', gameData);
        if (!this.db) {
            console.error('Database not initialized');
            throw new Error('Database not initialized');
        }
        return this.saveData('games', gameData);
    }

    async loadGame(gameId) {
        return this.getData('games', gameId);
    }

    async getAllGames() {
        return this.getAllData('games');
    }

    async savePlayer(playerData) {
        return this.saveData('players', playerData);
    }

    async getPlayersByTeam(team) {
        return this.getDataByIndex('players', 'team', team);
    }

    async saveInning(inningData) {
        return this.saveData('innings', inningData);
    }

    async getInningsByGame(gameId) {
        return this.getDataByIndex('innings', 'gameId', gameId);
    }

    async saveAtBat(atBatData) {
        return this.saveData('atBats', atBatData);
    }

    async getAtBatsByInning(inningId) {
        return this.getDataByIndex('atBats', 'inningId', inningId);
    }

    async savePitch(pitchData) {
        return this.saveData('pitches', pitchData);
    }

    async getPitchesByAtBat(atBatId) {
        return this.getDataByIndex('pitches', 'atBatId', atBatId);
    }

    async saveData(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // 新規作成の場合はidフィールドを削除
            let saveData = { ...data };
            if (!saveData.id || saveData.id === null) {
                delete saveData.id;
            }

            const request = saveData.id ? store.put(saveData) : store.add(saveData);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getData(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getAllData(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getDataByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async deleteGame(gameId) {
        const transaction = this.db.transaction(['games', 'innings', 'atBats', 'pitches'], 'readwrite');

        await this.deleteData('games', gameId);

        const innings = await this.getInningsByGame(gameId);
        for (const inning of innings) {
            await this.deleteData('innings', inning.id);

            const atBats = await this.getAtBatsByInning(inning.id);
            for (const atBat of atBats) {
                await this.deleteData('atBats', atBat.id);

                const pitches = await this.getPitchesByAtBat(atBat.id);
                for (const pitch of pitches) {
                    await this.deleteData('pitches', pitch.id);
                }
            }
        }
    }

    async deleteData(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }
}

const storage = new BaseballStorage();