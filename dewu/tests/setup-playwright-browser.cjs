#!/usr/bin/env node
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  assertManagedChromiumReady,
  browserSetupCommand,
  getPlaywrightCliPath,
  getManagedChromiumExecutable,
} = require('./lib/playwright-browser.cjs');

function resolvePlaywrightCli() {
  return getPlaywrightCliPath();
}

function printUsage() {
  console.log([
    'Usage: node skills/dewu/tests/setup-playwright-browser.cjs --check|--install',
    '',
    '--check    Launch Playwright managed Chromium once and exit.',
    '--install  Install Playwright managed Chromium, then run --check.',
  ].join('\n'));
}

async function runCheck() {
  try {
    await assertManagedChromiumReady();
    console.log(JSON.stringify({
      pass: true,
      browser: 'managed-chromium',
      executable: getManagedChromiumExecutable(),
    }, null, 2));
    return 0;
  } catch (error) {
    console.error(JSON.stringify({
      pass: false,
      browser: 'managed-chromium',
      executable: getManagedChromiumExecutable(),
      installCommand: browserSetupCommand(),
      error: String(error?.message || error),
    }, null, 2));
    return 1;
  }
}

async function runInstall() {
  const cli = resolvePlaywrightCli();
  const result = spawnSync(process.execPath, [cli, 'install', 'chromium'], {
    cwd: path.resolve(__dirname, '../../..'),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.status !== 0) return result.status || 1;
  return runCheck();
}

async function main() {
  const arg = process.argv[2] || '--check';
  if (arg === '--help' || arg === '-h') {
    printUsage();
    return 0;
  }
  if (arg === '--check') return runCheck();
  if (arg === '--install') return runInstall();
  printUsage();
  return 2;
}

main().then(code => process.exit(code)).catch(error => {
  console.error(error);
  process.exit(1);
});
