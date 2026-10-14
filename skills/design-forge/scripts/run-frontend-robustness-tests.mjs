#!/usr/bin/env node
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const fixtures = path.join(root, 'skills/design-forge/tests/fixtures/frontend-robustness');
const preflight = path.join(root, 'skills/design-forge/scripts/preflight.mjs');
const renderedValidator = path.join(root, 'skills/design-forge/scripts/validate-rendered-layout.mjs');
const require = createRequire(import.meta.url);
const {
  failedCheckNames,
  printReportAndExit,
  runJsonCommand,
  summarizeExpectations,
} = require('../../../system/shared/test-runner/command-runner.cjs');

const staticCases = [
  ['empty-svg-tab-icon.html', 'C15'],
  ['emoji-icon-control.html', 'C15'],
  ['pseudo-icon-tab.html', 'C15'],
  ['unsafe-absolute-badge.html', 'C16'],
  ['text-overflow-no-guard.html', 'C17'],
];

const renderedCases = [
  ['rendered-layout-positive.html', true, []],
  ['rendered-overlap-cards.html', false, ['layout overlap']],
  ['rendered-bottom-bar-covers-cta.html', false, ['fixed bottom chrome does not cover actions']],
  ['rendered-button-text-overflow.html', false, ['button text does not overflow']],
];

const results = [];

for (const [fixture, expectedRule] of staticCases) {
  const file = path.join(fixtures, fixture);
  const result = runJsonCommand([process.execPath, preflight, file, '--mode=flow'], { cwd: root });
  const payload = result.payload;
  const actualRules = [...(payload.errors || []), ...(payload.warnings || [])].map(item => item.rule);
  results.push({
    kind: 'static',
    fixture,
    expectedRule,
    status: result.status,
    actualRules,
    pass: result.status !== 0 && actualRules.includes(expectedRule),
  });
}

for (const [fixture, expectPass, expectedFailedChecks] of renderedCases) {
  const file = path.join(fixtures, fixture);
  const screenshotName = fixture.replace(/\.html$/, '.png');
  const result = runJsonCommand([process.execPath, renderedValidator, file, `--screenshot=/private/tmp/${screenshotName}`], { cwd: root });
  const payload = result.payload;
  const failedChecks = failedCheckNames(payload);
  const actualPass = result.status === 0 && payload.pass === true;
  results.push({
    kind: 'rendered',
    fixture,
    expectPass,
    actualPass,
    status: result.status,
    failedChecks,
    pass: actualPass === expectPass && expectedFailedChecks.every(name => failedChecks.includes(name)),
  });
}

printReportAndExit(summarizeExpectations(results));
