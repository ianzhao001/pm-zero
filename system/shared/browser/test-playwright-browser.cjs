#!/usr/bin/env node
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  createPlaywrightBrowserLauncher,
  formatOriginalError,
  isSandboxedBrowserFailure,
  loadPlaywright,
} = require('./playwright-browser.cjs');

(async () => {
  const loaded = loadPlaywright({ label: 'shared browser helper test' });
  assert.equal(typeof loaded.playwright.chromium.launch, 'function');
  assert.match(loaded.packageJsonPath, /playwright[\\/]package\.json$/);
  assert.equal(isSandboxedBrowserFailure(new Error('MachPortRendezvous blocked')), true);
  assert.equal(formatOriginalError(new Error('one\ntwo')).split('\n').length, 2);

  const envVar = 'PM_ZERO_SHARED_BROWSER_TEST';
  const launcher = createPlaywrightBrowserLauncher({
    label: 'Shared Browser Helper Test',
    envVar,
    chromeFallbackLockPath: '/private/tmp/pm-zero-shared-browser-helper-test.lock',
    setupCommand: 'node setup-playwright-browser.cjs --install',
  });
  assert.equal(typeof launcher.launchBrowser, 'function');
  assert.equal(path.basename(launcher.getPlaywrightCliPath()), 'cli.js');
  assert.match(launcher.getManagedChromiumExecutable(), /chromium|chrome/i);
  assert.match(launcher.browserSetupCommand(), /setup-playwright-browser/);

  const previous = process.env[envVar];
  process.env[envVar] = 'unsupported';
  try {
    await assert.rejects(
      () => launcher.launchBrowser(),
      new RegExp(`Unsupported ${envVar}=unsupported`),
    );
  } finally {
    if (previous === undefined) {
      delete process.env[envVar];
    } else {
      process.env[envVar] = previous;
    }
  }

  console.log(JSON.stringify({ pass: true, checks: 9 }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
