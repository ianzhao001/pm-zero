#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  failedCheckNames,
  parseJsonPayload,
  relativeLabel,
  runCommand,
  runJsonCommand,
  summarizeExpectations,
} = require('./command-runner.cjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-zero-command-runner-'));
const jsonScript = path.join(tmp, 'json-pass.cjs');
const badJsonScript = path.join(tmp, 'bad-json.cjs');
fs.writeFileSync(jsonScript, 'console.log(JSON.stringify({pass:true,checks:[{name:"ok",pass:true},{name:"bad",pass:false}]}));\n', 'utf8');
fs.writeFileSync(badJsonScript, 'console.log("not json"); process.exit(1);\n', 'utf8');

const parsed = parseJsonPayload('{"pass":true}');
assert.equal(parsed.payload.pass, true);
assert.equal(parsed.parseError, null);

const invalid = parseJsonPayload('not json');
assert.equal(invalid.payload.pass, false);
assert.match(invalid.parseError, /Unexpected token|not valid JSON/);

const good = runJsonCommand([process.execPath, jsonScript], { cwd: tmp });
assert.equal(good.status, 0);
assert.equal(good.payload.pass, true);
assert.deepEqual(failedCheckNames(good.payload), ['bad']);

const plain = runCommand([process.execPath, '-e', 'console.log("plain ok")'], { cwd: tmp });
assert.equal(plain.status, 0);
assert.match(plain.stdout, /plain ok/);
assert.equal(plain.error, null);

const missing = runCommand([path.join(tmp, 'nonexistent-command')], { cwd: tmp });
assert.notEqual(missing.status, 0);
assert.ok(missing.error);
const timedOut = runCommand([process.execPath, '-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 50 });
assert.notEqual(timedOut.status, 0);
assert.ok(timedOut.error);

const envProbe = runCommand([process.execPath, '-e', 'console.log(Boolean(process.env.PATH), process.env.PM_ZERO_TEST_RUNNER)'], {
  cwd: tmp,
  env: { PM_ZERO_TEST_RUNNER: 'merged' },
});
assert.equal(envProbe.status, 0);
assert.match(envProbe.stdout, /true merged/);

const bad = runJsonCommand([process.execPath, badJsonScript], { cwd: tmp });
assert.equal(bad.status, 1);
assert.equal(bad.payload.pass, false);
assert.ok(bad.parseError);

assert.equal(relativeLabel(tmp, jsonScript), 'json-pass.cjs');
assert.equal(relativeLabel(tmp, null, [process.execPath, jsonScript]), 'json-pass.cjs');

const summary = summarizeExpectations([
  { name: 'positive', expectPass: true, actualPass: true },
  { name: 'negative', expectPass: false, actualPass: false },
  { name: 'missed', expectPass: false, actualPass: true },
]);
assert.equal(summary.pass, false);
assert.equal(summary.total, 3);
assert.equal(summary.failed, 1);
assert.equal(summary.results[2].name, 'missed');

console.log(JSON.stringify({ pass: true, checks: 12 }, null, 2));
