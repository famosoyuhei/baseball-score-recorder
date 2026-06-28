import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const reportDir = path.join(rootDir, 'test-results', 'ai-employees');
const appUrl = process.env.BASEBALL_APP_URL || '';
const defaultPort = Number(process.env.BASEBALL_APP_PORT || 4173);
const autoStartGame = process.env.AI_EMPLOYEE_START_GAME !== '0';

const recordingLevels = [
  { key: 'inning', label: '半イニング' },
  { key: 'batter', label: '打席' },
  { key: 'pitch', label: '1球' },
];

const detailLevels = [
  { key: 'basic', label: '基本' },
  { key: 'standard', label: '標準' },
  { key: 'detailed', label: '詳細' },
];

const recordingModes = [
  { key: 'bench', label: 'ベンチ観戦' },
  { key: 'tv', label: 'テレビ観戦' },
];

const matrix = recordingLevels.flatMap((recordingLevel) =>
  detailLevels.flatMap((detailLevel) =>
    recordingModes.map((recordingMode) => ({
      recordingLevel,
      detailLevel,
      recordingMode,
    })),
  ),
);

async function main() {
  const playwright = await loadPlaywright();
  await fs.mkdir(reportDir, { recursive: true });

  const server = appUrl ? null : await startStaticServer(defaultPort);
  const baseUrl = appUrl || `http://127.0.0.1:${server.port}`;
  const browser = await playwright.chromium.launch({ headless: true });
  const results = [];

  try {
    for (const [index, combo] of matrix.entries()) {
      const result = await runCombo(playwright, browser, baseUrl, index + 1, combo);
      results.push(result);
      printResult(result);
    }
  } finally {
    await browser.close();
    if (server) {
      await new Promise((resolve) => server.instance.close(resolve));
    }
  }

  const report = buildReport(baseUrl, results);
  const reportPath = path.join(reportDir, `mode-matrix-${timestamp()}.md`);
  await fs.writeFile(reportPath, report, 'utf8');

  const failed = results.filter((result) => result.status === 'FAIL');
  console.log('');
  console.log(`Report: ${reportPath}`);
  console.log(`Result: ${results.length - failed.length}/${results.length} passed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error('Playwright is required for the 18-mode browser harness.');
    console.error('Install it with: npm install --save-dev playwright');
    console.error('Then install browsers with: npx playwright install chromium');
    process.exit(2);
  }
}

async function runCombo(playwright, browser, baseUrl, number, combo) {
  const context = await browser.newContext({
    locale: 'ja-JP',
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  const errors = [];
  const consoleMessages = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });

  const startedAt = Date.now();

  try {
    await context.addInitScript((settings) => {
      window.__AI_EMPLOYEE_TEST_MODE__ = settings;
      window.__AI_EMPLOYEE_AUTO_START_GAME__ = settings.autoStartGame;
      localStorage.setItem('aiEmployeeModeMatrixSettings', JSON.stringify(settings));
      sessionStorage.setItem('aiEmployeeModeMatrixSettings', JSON.stringify(settings));
    }, {
      recordingLevel: combo.recordingLevel.key,
      detailLevel: combo.detailLevel.key,
      recordingMode: combo.recordingMode.key,
      autoStartGame,
    });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    if (autoStartGame) {
      await prepareGame(page, combo);
    }

    const snapshot = await collectSnapshot(page);
    const checks = evaluateChecks(combo, snapshot, errors, consoleMessages);
    const failedChecks = checks.filter((check) => !check.ok);

    await fs.writeFile(
      path.join(reportDir, `snapshot-${String(number).padStart(2, '0')}.json`),
      JSON.stringify({ number, combo: serializeCombo(combo), snapshot, checks }, null, 2),
      'utf8',
    );

    return {
      number,
      combo: serializeCombo(combo),
      status: failedChecks.length === 0 ? 'PASS' : 'FAIL',
      durationMs: Date.now() - startedAt,
      checks,
      errors,
      consoleMessages,
    };
  } catch (error) {
    return {
      number,
      combo: serializeCombo(combo),
      status: 'FAIL',
      durationMs: Date.now() - startedAt,
      checks: [{ name: 'harness exception', ok: false, details: error.message }],
      errors: [error.stack || error.message],
      consoleMessages,
    };
  } finally {
    await context.close();
  }
}

async function prepareGame(page, combo) {
  await page.locator('#startBtn').click();
  await page.locator('#gameSetupScreen').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#homeTeam').fill(`ホーム-${combo.recordingLevel.key}-${combo.detailLevel.key}-${combo.recordingMode.key}`);
  await page.locator('#awayTeam').fill(`アウェイ-${combo.recordingLevel.key}-${combo.detailLevel.key}-${combo.recordingMode.key}`);
  await selectEnabledOption(page, '#recordingLevel', combo.recordingLevel.key);
  await selectEnabledOption(page, '#playerDetailLevel', combo.detailLevel.key);
  await selectEnabledOption(page, '#recordingMode', combo.recordingMode.key);
  await page.locator('#gameSetupForm button[type="submit"]').click();
  await page.locator('#gameScreen').waitFor({ state: 'visible', timeout: 5000 });
  const completePlayerSetup = page.locator('#completePlayerSetup');
  await completePlayerSetup.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
  if (await completePlayerSetup.isVisible().catch(() => false)) {
    await preparePlayerSetup(page, combo);
    await completePlayerSetup.click();
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(100);
}

async function preparePlayerSetup(page, combo) {
  if (combo.recordingLevel.key !== 'pitch') {
    return;
  }

  if (combo.detailLevel.key === 'basic') {
    return;
  }

  await page.evaluate(() => {
    for (const team of ['home', 'away']) {
      const pitcherSelect = document.querySelector(`.position-select[data-team="${team}"][data-order="1"]`);
      if (pitcherSelect) {
        pitcherSelect.value = 'P';
        pitcherSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });
}

async function selectEnabledOption(page, selector, value) {
  const optionState = await page.locator(selector).evaluate((select, selectedValue) => {
    const option = Array.from(select.options).find((candidate) => candidate.value === selectedValue);
    if (!option) {
      return { exists: false, disabled: false, text: '' };
    }

    return {
      exists: true,
      disabled: option.disabled,
      text: option.textContent.trim(),
    };
  }, value);

  if (!optionState.exists) {
    throw new Error(`Option "${value}" does not exist for ${selector}`);
  }

  if (optionState.disabled) {
    throw new Error(`Option "${value}" is disabled for ${selector} (${optionState.text})`);
  }

  await page.locator(selector).selectOption(value, { timeout: 5000 });
}

async function collectSnapshot(page) {
  return await page.evaluate(() => {
    const gameScreen = document.querySelector('#gameScreen');
    const activeScreen = document.querySelector('.screen.active');
    const visibleText = document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 2000);
    const localStorageItems = {};
    const sessionStorageItems = {};

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      localStorageItems[key] = localStorage.getItem(key);
    }

    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      sessionStorageItems[key] = sessionStorage.getItem(key);
    }

    return {
      title: document.title,
      url: location.href,
      bodyTextLength: document.body.innerText.length,
      visibleText,
      activeScreenId: activeScreen ? activeScreen.id : null,
      gameScreenClassName: gameScreen ? gameScreen.className : null,
      hasGameScreen: Boolean(gameScreen),
      buttons: Array.from(document.querySelectorAll('button')).map((button) => ({
        id: button.id || null,
        text: button.innerText.trim(),
        ariaLabel: button.getAttribute('aria-label'),
        visible: button.offsetParent !== null,
      })).slice(0, 80),
      inputs: Array.from(document.querySelectorAll('input, select, textarea')).map((input) => ({
        id: input.id || null,
        name: input.getAttribute('name'),
        type: input.getAttribute('type') || input.tagName.toLowerCase(),
        value: input.value,
        visible: input.offsetParent !== null,
      })).slice(0, 120),
      localStorageKeys: Object.keys(localStorageItems).sort(),
      sessionStorageKeys: Object.keys(sessionStorageItems).sort(),
      localStorageItems,
      sessionStorageItems,
      testSettings: window.__AI_EMPLOYEE_TEST_MODE__ || null,
      autoStartGame: Boolean(window.__AI_EMPLOYEE_AUTO_START_GAME__),
      gameSummary: (() => {
        try {
          if (typeof gameManager === 'undefined' || !gameManager.currentGame) {
            return null;
          }

          const game = gameManager.currentGame;
          const inning = gameManager.currentInning;
          return {
            recordingLevel: game.recordingLevel,
            playerDetailLevel: game.playerDetailLevel,
            recordingMode: game.recordingMode,
            dhRule: game.dhRule,
            pitchers: {
              home: game.players.home.filter((p) => p.position === 'P').map((p) => ({
                name: p.name,
                battingOrder: p.battingOrder,
                isActive: p.isActive,
              })),
              away: game.players.away.filter((p) => p.position === 'P').map((p) => ({
                name: p.name,
                battingOrder: p.battingOrder,
                isActive: p.isActive,
              })),
            },
            currentPitcher: game.currentPitcher,
            pitcherStints: inning ? inning.pitcherStints : null,
          };
        } catch (error) {
          return { error: error.message };
        }
      })(),
    };
  });
}

function evaluateChecks(combo, snapshot, errors, consoleMessages) {
  const checks = [
    {
      name: 'page rendered text',
      ok: snapshot.bodyTextLength > 0,
      details: `${snapshot.bodyTextLength} text characters`,
    },
    {
      name: autoStartGame ? 'game screen active' : 'game screen exists',
      ok: autoStartGame ? snapshot.activeScreenId === 'gameScreen' : snapshot.hasGameScreen,
      details: `active=${snapshot.activeScreenId || 'none'} class=${snapshot.gameScreenClassName || 'missing #gameScreen'}`,
    },
    {
      name: 'test settings injected',
      ok: snapshot.testSettings?.recordingLevel === combo.recordingLevel.key
        && snapshot.testSettings?.detailLevel === combo.detailLevel.key
        && snapshot.testSettings?.recordingMode === combo.recordingMode.key,
      details: JSON.stringify(snapshot.testSettings),
    },
    {
      name: 'no uncaught page errors',
      ok: errors.length === 0,
      details: errors.join(' | ') || 'none',
    },
    {
      name: 'no console errors',
      ok: !consoleMessages.some((message) => message.startsWith('error:')),
      details: consoleMessages.join(' | ') || 'none',
    },
  ];

  if (snapshot.hasGameScreen) {
    checks.push({
      name: 'recording level css class',
      ok: snapshot.gameScreenClassName?.includes(`${combo.recordingLevel.key}-level`) || false,
      details: snapshot.gameScreenClassName || '',
    });
  }

  if (combo.recordingLevel.key === 'pitch') {
    const summary = snapshot.gameSummary;
    checks.push({
      name: 'pitch mode has starting pitcher',
      ok: Array.isArray(summary?.pitchers?.home) && summary.pitchers.home.length > 0,
      details: JSON.stringify(summary?.pitchers?.home || []),
    });
    checks.push({
      name: 'pitch mode has initial pitcher stint',
      ok: Array.isArray(summary?.pitcherStints) && summary.pitcherStints.length > 0,
      details: JSON.stringify(summary?.pitcherStints || []),
    });
  }

  return checks;
}

async function startStaticServer(port) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
  };

  const instance = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`);
      const decodedPath = decodeURIComponent(requestUrl.pathname);
      const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.slice(1);
      const filePath = path.resolve(rootDir, relativePath);

      if (!filePath.startsWith(rootDir)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const stat = await fs.stat(filePath);
      const finalPath = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
      const ext = path.extname(finalPath).toLowerCase();
      const body = await fs.readFile(finalPath);
      response.writeHead(200, {
        'content-type': mimeTypes[ext] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });

  const selectedPort = await listen(instance, port);
  return { instance, port: selectedPort };
}

async function listen(instance, preferredPort) {
  for (let offset = 0; offset < 20; offset += 1) {
    const port = preferredPort + offset;
    const result = await new Promise((resolve) => {
      const onError = () => {
        instance.off('listening', onListening);
        resolve(null);
      };
      const onListening = () => {
        instance.off('error', onError);
        resolve(port);
      };

      instance.once('error', onError);
      instance.once('listening', onListening);
      instance.listen(port, '127.0.0.1');
    });

    if (result) {
      return result;
    }
  }

  throw new Error(`Could not bind static server starting at port ${preferredPort}`);
}

function buildReport(baseUrl, results) {
  const lines = [
    '# AI社員 18通りモードマトリクス結果',
    '',
    `- 実行日時: ${new Date().toISOString()}`,
    `- 対象URL: ${baseUrl}`,
    `- 成功: ${results.filter((result) => result.status === 'PASS').length}/${results.length}`,
    '',
    '| No. | recordingLevel | detailLevel | recordingMode | 判定 | 主な失敗 |',
    '|---:|---|---|---|---|---|',
  ];

  for (const result of results) {
    const failed = result.checks
      .filter((check) => !check.ok)
      .map((check) => check.name)
      .join(', ');
    lines.push(
      `| ${result.number} | ${result.combo.recordingLevel} | ${result.combo.detailLevel} | ${result.combo.recordingMode} | ${result.status} | ${failed || '-'} |`,
    );
  }

  lines.push('');
  lines.push('## 詳細');
  lines.push('');

  for (const result of results) {
    lines.push(`### ${result.number}. ${result.combo.recordingLevel} / ${result.combo.detailLevel} / ${result.combo.recordingMode}`);
    lines.push('');
    lines.push(`- 判定: ${result.status}`);
    lines.push(`- 所要時間: ${result.durationMs}ms`);
    for (const check of result.checks) {
      lines.push(`- ${check.ok ? 'OK' : 'NG'} ${check.name}: ${check.details}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function serializeCombo(combo) {
  return {
    recordingLevel: combo.recordingLevel.key,
    recordingLevelLabel: combo.recordingLevel.label,
    detailLevel: combo.detailLevel.key,
    detailLevelLabel: combo.detailLevel.label,
    recordingMode: combo.recordingMode.key,
    recordingModeLabel: combo.recordingMode.label,
  };
}

function printResult(result) {
  const label = [
    String(result.number).padStart(2, '0'),
    result.combo.recordingLevel,
    result.combo.detailLevel,
    result.combo.recordingMode,
  ].join(' ');
  console.log(`${result.status.padEnd(4)} ${label}`);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
