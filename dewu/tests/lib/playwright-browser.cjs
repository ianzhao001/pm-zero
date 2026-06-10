const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');

function loadPlaywright() {
  const attempts = [];
  try {
    const playwright = require('playwright');
    return {
      playwright,
      packageJsonPath: require.resolve('playwright/package.json'),
    };
  } catch (error) {
    attempts.push(`default require: ${error.code || error.message}`);
  }

  const moduleDirs = [
    path.join(process.cwd(), 'node_modules'),
    path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),
  ];
  for (const dir of moduleDirs) {
    try {
      const req = createRequire(path.join(dir, 'dewu-playwright-require.js'));
      const playwright = req('playwright');
      return {
        playwright,
        packageJsonPath: req.resolve('playwright/package.json'),
      };
    } catch (error) {
      attempts.push(`${dir}: ${error.code || error.message}`);
    }
  }

  throw new Error([
    'Cannot resolve the Playwright package for Dewu visual tests.',
    'Run with NODE_PATH pointing at the bundled node_modules, or install project dependencies.',
    '',
    attempts.join('\n'),
  ].join('\n'));
}

const loadedPlaywright = loadPlaywright();
const { chromium } = loadedPlaywright.playwright;

const chromeFallbackLockPath = '/private/tmp/dewu-playwright-chrome.lock';
const defaultLockTimeoutMs = 30000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getManagedChromiumExecutable() {
  return chromium.executablePath();
}

function getPlaywrightCliPath() {
  return path.join(path.dirname(loadedPlaywright.packageJsonPath), 'cli.js');
}

async function assertManagedChromiumReady() {
  const previousMode = process.env.DEWU_PLAYWRIGHT_BROWSER;
  process.env.DEWU_PLAYWRIGHT_BROWSER = 'managed';
  try {
    const browser = await launchDewuBrowser();
    await browser.close();
    return true;
  } finally {
    if (previousMode === undefined) {
      delete process.env.DEWU_PLAYWRIGHT_BROWSER;
    } else {
      process.env.DEWU_PLAYWRIGHT_BROWSER = previousMode;
    }
  }
}

function browserSetupCommand() {
  return 'node skills/dewu/tests/setup-playwright-browser.cjs --install';
}

function isManagedChromiumMissing(error) {
  return /Executable doesn't exist|Looks like Playwright was just installed|playwright install/i.test(String(error?.message || error));
}

function isSandboxedChromeFailure(error) {
  return /Target page, context or browser has been closed|SIGABRT|SIGTRAP|EPERM|kill EPERM|MachPortRendezvous|Permission denied/i.test(String(error?.message || error));
}

function formatOriginalError(error) {
  return String(error?.message || error).split('\n').slice(0, 14).join('\n');
}

function enhanceManagedChromiumError(error) {
  const sandboxed = isSandboxedChromeFailure(error);
  const message = [
    sandboxed
      ? 'Dewu Playwright managed Chromium is installed but the current sandbox blocked browser startup.'
      : 'Dewu Playwright managed Chromium is not ready.',
    sandboxed
      ? 'Run this test outside the sandbox / with Codex escalation. Do not switch to system Chrome to hide this failure.'
      : `Run: ${browserSetupCommand()}`,
    'The tests intentionally do not fall back to system Chrome unless DEWU_PLAYWRIGHT_BROWSER=chrome is set, because system Chrome can fail inside the Codex sandbox with SIGABRT / kill EPERM.',
    '',
    `Managed executable: ${getManagedChromiumExecutable()}`,
    '',
    `Original error:\n${formatOriginalError(error)}`,
  ].join('\n');
  const wrapped = new Error(message);
  wrapped.cause = error;
  return wrapped;
}

function enhanceSystemChromeError(error) {
  const message = [
    'Dewu Playwright system Chrome fallback failed.',
    'This usually means the local sandbox blocked system Chrome startup or process cleanup.',
    `Prefer managed Chromium: ${browserSetupCommand()}`,
    'If system Chrome is required, run outside the sandbox with DEWU_PLAYWRIGHT_BROWSER=chrome.',
    '',
    `Original error:\n${formatOriginalError(error)}`,
  ].join('\n');
  const wrapped = new Error(message);
  wrapped.cause = error;
  return wrapped;
}

async function acquireChromeFallbackLock(timeoutMs = defaultLockTimeoutMs) {
  const start = Date.now();
  while (true) {
    try {
      const fd = fs.openSync(chromeFallbackLockPath, 'wx');
      fs.writeFileSync(fd, `${process.pid}\n${new Date().toISOString()}\n`);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        try {
          fs.closeSync(fd);
        } catch (_) {
          // fd may already be closed during process shutdown.
        }
        try {
          fs.unlinkSync(chromeFallbackLockPath);
        } catch (_) {
          // Another cleanup path may have already removed the lock.
        }
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timed out waiting for Dewu system Chrome fallback lock: ${chromeFallbackLockPath}`);
      }
      await sleep(100);
    }
  }
}

function attachRelease(browser, release) {
  let released = false;
  const once = () => {
    if (released) return;
    released = true;
    release();
  };
  const originalClose = browser.close.bind(browser);
  browser.close = async (...args) => {
    try {
      return await originalClose(...args);
    } finally {
      once();
    }
  };
  browser.on('disconnected', once);
  return browser;
}

async function launchDewuBrowser(options = {}) {
  const {
    launchOptions = {},
    lockTimeoutMs = defaultLockTimeoutMs,
  } = options;
  const browserMode = (process.env.DEWU_PLAYWRIGHT_BROWSER || 'managed').toLowerCase();

  if (browserMode === 'chrome') {
    const release = await acquireChromeFallbackLock(lockTimeoutMs);
    try {
      const browser = await chromium.launch({ headless: true, channel: 'chrome', ...launchOptions });
      return attachRelease(browser, release);
    } catch (error) {
      release();
      throw isSandboxedChromeFailure(error) ? enhanceSystemChromeError(error) : error;
    }
  }

  if (browserMode !== 'managed' && browserMode !== 'chromium') {
    throw new Error(`Unsupported DEWU_PLAYWRIGHT_BROWSER=${process.env.DEWU_PLAYWRIGHT_BROWSER}. Use "managed" or "chrome".`);
  }

  try {
    return await chromium.launch({ headless: true, ...launchOptions });
  } catch (error) {
    throw (isManagedChromiumMissing(error) || isSandboxedChromeFailure(error))
      ? enhanceManagedChromiumError(error)
      : error;
  }
}

module.exports = {
  assertManagedChromiumReady,
  browserSetupCommand,
  chromeFallbackLockPath,
  getPlaywrightCliPath,
  getManagedChromiumExecutable,
  launchDewuBrowser,
};
