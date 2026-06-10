#!/usr/bin/env node
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../..');
const validator = path.join(root, 'skills/dewu/tests/validate-hifi-surface.cjs');
const cases = [
  {
    name: 'golden four-tab screenshot evidence reference v4 passes',
    file: path.join(root, '_workspace/test-cases/dewu-tab-wireframe-smoke-20260523/dewu-four-tabs-hifi-v4.html'),
    expectPass: true,
  },
  {
    name: 'single surface fixture passes',
    file: path.join(root, 'skills/dewu/tests/fixtures/hifi-single-surface-pass.html'),
    expectPass: true,
  },
  {
    name: 'older compact generated output fails HIFI baseline',
    file: path.join(root, '_workspace/test-cases/e2e-mobile-shell-lite-dual-track/runs/high-fidelity-tabs-20260523-040000/dewu/high-fidelity-interactive.html'),
    expectPass: false,
  },
];

const results = [];
for (const item of cases) {
  const result = spawnSync(process.execPath, [
    validator,
    item.file,
    `--screenshot=/private/tmp/dewu-hifi-${results.length}.png`,
  ], { cwd: root, encoding: 'utf8' });
  let payload = null;
  try {
    payload = JSON.parse((result.stdout || '').trim());
  } catch (error) {
    payload = { parseError: error.message, stdout: result.stdout, stderr: result.stderr };
  }
  const actualPass = result.status === 0 && payload.pass === true;
  results.push({
    name: item.name,
    file: path.relative(root, item.file),
    expectPass: item.expectPass,
    actualPass,
    status: result.status,
    failed: payload.failed,
    failedChecks: (payload.checks || []).filter(check => !check.pass).map(check => check.name),
    stderr: result.stderr ? result.stderr.trim().split('\n').slice(0, 6) : [],
  });
}

const failed = results.filter(item => item.expectPass !== item.actualPass);
console.log(JSON.stringify({
  pass: failed.length === 0,
  total: results.length,
  failed: failed.length,
  results,
}, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
