const path = require('node:path');
const { spawnSync } = require('node:child_process');

function parseJsonPayload(stdout, stderr = '') {
  const text = String(stdout || '').trim();
  try {
    return { payload: JSON.parse(text), parseError: null };
  } catch (error) {
    return {
      payload: {
        pass: false,
        parseError: error.message,
        stdout,
        stderr,
      },
      parseError: error.message,
    };
  }
}

function runJsonCommand(command, options = {}) {
  const result = runCommand(command, options);
  const parsed = parseJsonPayload(result.stdout, result.stderr);
  return {
    ...result,
    payload: parsed.payload,
    parseError: parsed.parseError,
  };
}

function runCommand(command, options = {}) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: options.cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(options.env || {}),
    },
    timeout: options.timeoutMs,
    maxBuffer: options.maxBuffer ?? 16 * 1024 * 1024,
  });
  return {
    command,
    error: result.error ? result.error.message : null,
    signal: result.signal,
    status: result.error ? (result.status || 1) : result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function failedCheckNames(payload) {
  return (payload?.checks || [])
    .filter(check => !check.pass)
    .map(check => check.name);
}

function stderrPreview(stderr, limit = 6) {
  return stderr ? String(stderr).trim().split('\n').slice(0, limit) : [];
}

function relativeLabel(root, file, command) {
  const target = file || command?.[1] || '';
  return target ? path.relative(root, target) : '';
}

function summarizeExpectations(results) {
  const failedResults = results.filter(item => {
    if (Object.hasOwn(item, 'pass')) return !item.pass;
    return item.expectPass !== item.actualPass;
  });
  return {
    pass: failedResults.length === 0,
    total: results.length,
    failed: failedResults.length,
    results,
  };
}

function printReportAndExit(report) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

module.exports = {
  failedCheckNames,
  parseJsonPayload,
  printReportAndExit,
  relativeLabel,
  runCommand,
  runJsonCommand,
  stderrPreview,
  summarizeExpectations,
};
