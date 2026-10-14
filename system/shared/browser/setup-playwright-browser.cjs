#!/usr/bin/env node
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  createPlaywrightBrowserLauncher,
} = require('./playwright-browser.cjs');

const launcher = createPlaywrightBrowserLauncher({
  label: 'pm-zero Playwright',
  envVar: 'PM_ZERO_PLAYWRIGHT_BROWSER',
  chromeFallbackLockPath: '/private/tmp/pm-zero-playwright-chrome.lock',
  setupCommand: 'node system/shared/browser/setup-playwright-browser.cjs --install',
});

function printUsage() {
  console.log([
    'Usage: node system/shared/browser/setup-playwright-browser.cjs --check|--install',
    '',
    '--check    Launch Playwright managed Chromium once and exit.',
    '--install  Install Playwright managed Chromium, then run --check.',
  ].join('\n'));
}

async function runCheck() {
  try {
    await launcher.assertManagedChromiumReady();
    console.log(JSON.stringify({
      pass: true,
      browser: 'managed-chromium',
      executable: launcher.getManagedChromiumExecutable(),
    }, null, 2));
    return 0;
  } catch (error) {
    console.error(JSON.stringify({
      pass: false,
      browser: 'managed-chromium',
      executable: launcher.getManagedChromiumExecutable(),
      installCommand: launcher.browserSetupCommand(),
      error: String(error?.message || error),
    }, null, 2));
    return 1;
  }
}

async function runInstall() {
  const result = spawnSync(process.execPath, [launcher.getPlaywrightCliPath(), 'install', 'chromium'], {
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
