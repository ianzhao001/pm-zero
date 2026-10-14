const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');

const defaultLockTimeoutMs = 30000;

function slug(value) {
  return String(value || 'pm-zero')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'pm-zero';
}

function loadPlaywright(options = {}) {
  const attempts = [];
  const requireLabel = options.requireLabel || 'pm-zero-playwright-require.js';
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
      const req = createRequire(path.join(dir, requireLabel));
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
    `Cannot resolve the Playwright package for ${options.label || 'visual tests'}.`,
    'Run with NODE_PATH pointing at the bundled node_modules, or install project dependencies.',
    '',
    attempts.join('\n'),
  ].join('\n'));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isManagedChromiumMissing(error) {
  return /Executable doesn't exist|Looks like Playwright was just installed|playwright install/i.test(String(error?.message || error));
}

function isSandboxedBrowserFailure(error) {
  return /Target page, context or browser has been closed|SIGABRT|SIGTRAP|EPERM|kill EPERM|MachPortRendezvous|Permission denied/i.test(String(error?.message || error));
}

function formatOriginalError(error) {
  return String(error?.message || error).split('\n').slice(0, 14).join('\n');
}

async function acquireLock(lockPath, timeoutMs = defaultLockTimeoutMs) {
  const start = Date.now();
  while (true) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(fd, `${process.pid}\n${new Date().toISOString()}\n`);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        try {
          fs.closeSync(fd);
        } catch (_) {
          // The fd may already be closed during process shutdown.
        }
        try {
          fs.unlinkSync(lockPath);
        } catch (_) {
          // Another cleanup path may already have removed the lock.
        }
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timed out waiting for Playwright Chrome fallback lock: ${lockPath}`);
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

function createPlaywrightBrowserLauncher(options = {}) {
  const label = options.label || 'Playwright visual tests';
  const envVar = options.envVar || 'PM_ZERO_PLAYWRIGHT_BROWSER';
  const lockPath = options.chromeFallbackLockPath || `/private/tmp/${slug(label)}-chrome.lock`;
  const setupCommand = options.setupCommand || 'npx playwright install chromium';
  const loadedPlaywright = loadPlaywright({
    ...options,
    label,
    requireLabel: options.requireLabel || `${slug(label)}-playwright-require.js`,
  });
  const { chromium } = loadedPlaywright.playwright;

  function browserSetupCommand() {
    return setupCommand;
  }

  function getManagedChromiumExecutable() {
    return chromium.executablePath();
  }

  function getPlaywrightCliPath() {
    return path.join(path.dirname(loadedPlaywright.packageJsonPath), 'cli.js');
  }

  function enhanceManagedChromiumError(error) {
    const sandboxed = isSandboxedBrowserFailure(error);
    const message = [
      sandboxed
        ? `${label} managed Chromium is installed but the current sandbox blocked browser startup.`
        : `${label} managed Chromium is not ready.`,
      sandboxed
        ? 'Run this test outside the sandbox / with Codex escalation. Do not switch to system Chrome to hide this failure.'
        : `Run: ${browserSetupCommand()}`,
      `The tests intentionally do not fall back to system Chrome unless ${envVar}=chrome is set, because system Chrome can fail inside the Codex sandbox with SIGABRT / kill EPERM.`,
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
      `${label} system Chrome fallback failed.`,
      'This usually means the local sandbox blocked system Chrome startup or process cleanup.',
      `Prefer managed Chromium: ${browserSetupCommand()}`,
      `If system Chrome is required, run outside the sandbox with ${envVar}=chrome.`,
      '',
      `Original error:\n${formatOriginalError(error)}`,
    ].join('\n');
    const wrapped = new Error(message);
    wrapped.cause = error;
    return wrapped;
  }

  async function launchBrowser(launcherOptions = {}) {
    const {
      launchOptions = {},
      lockTimeoutMs = defaultLockTimeoutMs,
    } = launcherOptions;
    const browserMode = (process.env[envVar] || 'managed').toLowerCase();

    if (browserMode === 'chrome') {
      const release = await acquireLock(lockPath, lockTimeoutMs);
      try {
        const browser = await chromium.launch({ headless: true, channel: 'chrome', ...launchOptions });
        return attachRelease(browser, release);
      } catch (error) {
        release();
        throw isSandboxedBrowserFailure(error) ? enhanceSystemChromeError(error) : error;
      }
    }

    if (browserMode !== 'managed' && browserMode !== 'chromium') {
      throw new Error(`Unsupported ${envVar}=${process.env[envVar]}. Use "managed" or "chrome".`);
    }

    try {
      return await chromium.launch({ headless: true, ...launchOptions });
    } catch (error) {
      throw (isManagedChromiumMissing(error) || isSandboxedBrowserFailure(error))
        ? enhanceManagedChromiumError(error)
        : error;
    }
  }

  async function assertManagedChromiumReady() {
    const previousMode = process.env[envVar];
    process.env[envVar] = 'managed';
    try {
      const browser = await launchBrowser();
      await browser.close();
      return true;
    } finally {
      if (previousMode === undefined) {
        delete process.env[envVar];
      } else {
        process.env[envVar] = previousMode;
      }
    }
  }

  return {
    assertManagedChromiumReady,
    browserSetupCommand,
    chromeFallbackLockPath: lockPath,
    getManagedChromiumExecutable,
    getPlaywrightCliPath,
    launchBrowser,
  };
}

module.exports = {
  createPlaywrightBrowserLauncher,
  defaultLockTimeoutMs,
  formatOriginalError,
  isSandboxedBrowserFailure,
  loadPlaywright,
};
