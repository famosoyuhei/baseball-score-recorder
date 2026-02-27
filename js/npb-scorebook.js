// 野球公式スコアブック記録システム (MLB方式優先)
class NPBScorebook {
    constructor(format = 'mlb') {
        this.format = format; // 'mlb' または 'npb' - MLB方式を優先
        this.positionNumbers = {
            'P': 1, 'C': 2, '1B': 3, '2B': 4, '3B': 5, 'SS': 6,
            'LF': 7, 'CF': 8, 'RF': 9
        };

        this.scoringSymbols = format === 'mlb' ? {
            // MLBスタイルの記号
            'groundout': 'GO',
            'flyout': 'F',
            'lineout': 'L',
            'popout': 'P',
            'strikeout': 'K',
            'strikeout_looking': 'Ʞ', // 後ろ向きK
            'forceout': 'FC',
            'doubleplay': 'DP',

            'single': '-',
            'double': '=',
            'triple': '≡',
            'homerun': 'HR',

            'walk': 'BB',
            'hbp': 'HBP',
            'error': 'E',
            'fielders_choice': 'FC',
            'sacrifice_bunt': 'SH',
            'sacrifice_fly': 'SF',
            'stolen_base': 'SB',
            'caught_stealing': 'CS',
            'wild_pitch': 'WP',
            'passed_ball': 'PB',
            'balk': 'BK'
        } : {
            // NPBスタイルの記号（従来通り）
            'groundout': 'GO',
            'flyout': 'F',
            'lineout': 'L',
            'popout': 'P',
            'strikeout': 'K',
            'strikeout_looking': '③', // 見逃し三振
            'forceout': 'FC',
            'doubleplay': 'DP',

            'single': '━', // 単打
            'double': '═', // 二塁打
            'triple': '≡', // 三塁打
            'homerun': '○', // 本塁打

            'walk': '■', // 四球
            'hbp': '●', // 死球
            'error': 'E',
            'fielders_choice': 'FC',
            'sacrifice_bunt': 'SH',
            'sacrifice_fly': 'SF',
            'stolen_base': 'SB',
            'caught_stealing': 'CS',
            'wild_pitch': 'WP',
            'passed_ball': 'PB',
            'balk': 'BK'
        };
    }

    // 打席結果をNPB記号に変換
    convertToNPBNotation(atBat) {
        let notation = '';

        switch (atBat.result) {
            case 'groundout':
                notation = this.formatGroundout(atBat);
                break;
            case 'flyout':
                notation = this.formatFlyout(atBat);
                break;
            case 'strikeout':
                notation = atBat.lookingStrikeout ? '③' : 'K';
                break;
            case 'single':
            case 'double':
            case 'triple':
            case 'homerun':
                notation = this.scoringSymbols[atBat.result];
                break;
            case 'walk':
                notation = '■';
                break;
            case 'hbp':
                notation = '●';
                break;
            case 'error':
                notation = `E${this.positionNumbers[atBat.errorPosition] || '?'}`;
                break;
            case 'sacrifice_bunt':
                notation = 'SH';
                break;
            case 'sacrifice_fly':
                notation = 'SF';
                break;
            default:
                notation = atBat.result.toUpperCase();
        }

        return notation;
    }

    // ゴロアウトの記号生成
    formatGroundout(atBat) {
        if (atBat.fieldingPlay && atBat.fieldingPlay.length > 0) {
            return atBat.fieldingPlay.map(pos => this.positionNumbers[pos] || pos).join('-');
        }
        return 'GO'; // デフォルト
    }

    // フライアウトの記号生成
    formatFlyout(atBat) {
        const position = this.positionNumbers[atBat.fieldingPosition] || '?';
        return `F${position}`;
    }

    // NPBスタイルのスコアブック表示を生成
    generateScorebookDisplay(gameData) {
        const scorebook = {
            away: this.generateTeamScorebook(gameData, 'away'),
            home: this.generateTeamScorebook(gameData, 'home')
        };
        return scorebook;
    }

    generateTeamScorebook(gameData, team) {
        const teamData = {
            name: team === 'home' ? gameData.homeTeam : gameData.awayTeam,
            players: gameData.players[team] || [],
            innings: []
        };

        // 9イニング分の枠を作成
        for (let i = 1; i <= 9; i++) {
            const inningData = this.getInningData(gameData, i, team === 'away');
            teamData.innings.push({
                number: i,
                batters: this.generateInningBatters(inningData)
            });
        }

        return teamData;
    }

    getInningData(gameData, inningNumber, isTopHalf) {
        if (!gameData.innings) return null;

        const inning = gameData.innings.find(inn =>
            inn.number === inningNumber
        );

        if (!inning) return null;

        return isTopHalf ? inning.top : inning.bottom;
    }

    generateInningBatters(inningData) {
        if (!inningData || !inningData.atBats) return [];

        return inningData.atBats.map(atBat => ({
            batterName: atBat.batterName || atBat.batter,
            battingOrder: atBat.battingOrder,
            result: this.convertToNPBNotation(atBat),
            runs: atBat.runs || 0,
            rbi: atBat.rbi || 0,
            baseAdvancement: this.formatBaseAdvancement(atBat)
        }));
    }

    formatBaseAdvancement(atBat) {
        if (!atBat.baseRunning) return '';

        let advancement = '';
        if (atBat.baseRunning.stolen) {
            advancement += `SB${atBat.baseRunning.stolenBase}`;
        }
        if (atBat.baseRunning.wildPitch) {
            advancement += 'WP';
        }
        if (atBat.baseRunning.passedBall) {
            advancement += 'PB';
        }

        return advancement;
    }

    // NPBスタイルのHTMLテーブル生成
    generateScorebookHTML(gameData) {
        const scorebook = this.generateScorebookDisplay(gameData);
        let html = '<div class="npb-scorebook-container">';

        // アウェイチーム
        html += this.generateTeamScorebookHTML(scorebook.away, 'away');

        // ホームチーム
        html += this.generateTeamScorebookHTML(scorebook.home, 'home');

        html += '</div>';
        return html;
    }

    generateTeamScorebookHTML(teamData, teamType) {
        let html = `<div class="team-scorebook ${teamType}">`;
        html += `<h3 class="team-name">${teamData.name}</h3>`;
        html += '<table class="npb-scorebook-table">';

        // ヘッダー行（イニング番号）
        html += '<thead><tr><th>選手名</th>';
        for (let i = 1; i <= 9; i++) {
            html += `<th>${i}</th>`;
        }
        html += '<th>R</th><th>H</th><th>E</th></tr></thead>';

        // 選手行
        html += '<tbody>';
        teamData.players.forEach((player, index) => {
            if (player.isStarter || player.battingOrder) {
                html += '<tr>';
                html += `<td class="player-name">${player.battingOrder}. ${player.name} (${this.positionNumbers[player.position] || '-'})</td>`;

                // 各イニングの記録
                for (let i = 1; i <= 9; i++) {
                    const inningData = teamData.innings[i - 1];
                    const batterData = inningData ? inningData.batters.find(b => b.battingOrder === player.battingOrder) : null;

                    html += '<td class="inning-cell">';
                    if (batterData) {
                        html += `<div class="at-bat-result">${batterData.result}</div>`;
                        if (batterData.baseAdvancement) {
                            html += `<div class="base-advancement">${batterData.baseAdvancement}</div>`;
                        }
                    }
                    html += '</td>';
                }

                // 統計列
                html += '<td class="stat-runs">-</td>';
                html += '<td class="stat-hits">-</td>';
                html += '<td class="stat-errors">-</td>';
                html += '</tr>';
            }
        });
        html += '</tbody>';

        // 合計行
        html += '<tfoot><tr>';
        html += '<td><strong>合計</strong></td>';
        for (let i = 1; i <= 9; i++) {
            const inningRuns = this.calculateInningRuns(teamData.innings[i - 1]);
            html += `<td class="inning-total">${inningRuns}</td>`;
        }
        html += '<td><strong>-</strong></td>';
        html += '<td><strong>-</strong></td>';
        html += '<td><strong>-</strong></td>';
        html += '</tr></tfoot>';

        html += '</table></div>';
        return html;
    }

    calculateInningRuns(inningData) {
        if (!inningData || !inningData.batters) return 0;
        return inningData.batters.reduce((total, batter) => total + (batter.runs || 0), 0);
    }

    // 既存のゲームデータからNPBスコアブック用データを作成
    convertGameDataToNPB(gameData) {
        // 現在のアプリのデータ構造からNPB形式への変換
        const npbData = {
            homeTeam: gameData.homeTeam,
            awayTeam: gameData.awayTeam,
            players: gameData.players,
            innings: []
        };

        // イニングデータの変換が必要
        // この部分は既存のゲームデータ構造に応じて調整

        return npbData;
    }
}

// グローバルアクセス用
window.NPBScorebook = NPBScorebook;