#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const helperPath = path.join(root, 'skills/dewu/tests/lib/playwright-browser.cjs');
const setupPath = path.join(root, 'skills/dewu/tests/setup-playwright-browser.cjs');
const searchRoots = [
  path.join(root, 'skills/dewu/tests'),
  path.join(root, '_workspace/test-cases/dewu-tab-wireframe-smoke-20260523'),
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    if (entry.isFile() && entry.name.endsWith('.cjs')) files.push(full);
  }
  return files;
}

function assert(checks, name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
}

const checks = [];
assert(checks, 'browser helper exists', fs.existsSync(helperPath), path.relative(root, helperPath));
assert(checks, 'setup script exists', fs.existsSync(setupPath), path.relative(root, setupPath));

let helper = null;
if (fs.existsSync(helperPath)) {
  helper = require(helperPath);
}
assert(checks, 'helper exports launchDewuBrowser', typeof helper?.launchDewuBrowser === 'function', Object.keys(helper || {}));
assert(checks, 'helper exports readiness utilities', typeof helper?.assertManagedChromiumReady === 'function' && typeof helper?.getManagedChromiumExecutable === 'function', Object.keys(helper || {}));

const offenders = searchRoots.flatMap(rootDir => walk(rootDir))
  .filter(file => file !== helperPath)
  .filter(file => /channel\s*:\s*['"]chrome['"]/.test(fs.readFileSync(file, 'utf8')))
  .map(file => path.relative(root, file));
assert(checks, 'chrome channel fallback is centralized in helper', offenders.length === 0, offenders);

const pass = checks.every(check => check.pass);
console.log(JSON.stringify({ pass, total: checks.length, failed: checks.filter(check => !check.pass).length, checks }, null, 2));
process.exit(pass ? 0 : 1);
