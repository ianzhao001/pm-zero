#!/usr/bin/env node
import path from 'node:path';
import { callTool } from '../system/workflow-core/index.mjs';
import { verifyPackageInventory } from '../system/workflow-core/lib/package-integrity.mjs';

const usage = 'node mcp/diagnose.mjs [--project <directory>] [--host-capabilities browser,independent-review] [--expected-commit <sha>] [--expected-context brand-id]';
try {
  const options = {};
  const known = new Set(['--project', '--host-capabilities', '--expected-commit', '--expected-context']);
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (!known.has(key) || Object.hasOwn(options, key) || i + 1 >= args.length || args[i + 1].startsWith('--')) throw new Error(usage);
    options[key] = args[++i];
  }
  if (options['--expected-context'] && !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(options['--expected-context'])) throw new Error(usage);
  if (options['--expected-commit'] && !/^[a-f0-9]{40}$/.test(options['--expected-commit'])) throw new Error(usage);
  const runtime = await callTool('runtime_info', {});
  const root = path.resolve(import.meta.dirname, '..');
  const inventory = runtime.package.layout === 'packaged'
    ? await verifyPackageInventory(root) : { status: 'not_packaged' };
  if (options['--expected-commit'] && (runtime.package.build?.source.commit !== options['--expected-commit'] || runtime.package.build?.source.dirty !== false)) {
    throw new Error('Expected an exact clean source commit; package origin differs or is unknown/dirty');
  }
  if (options['--expected-context'] && runtime.package.build?.package_context !== options['--expected-context']) throw new Error('Package context mismatch');
  const report = { schema_version: 1, status: 'ready', runtime, inventory,
    boundary: 'Physically read-only diagnostics and stage planning; no cache recovery, artifact, review, user confirmation or step selection is performed.' };
  if (options['--project']) {
    const project_path = path.resolve(options['--project']);
    const diagnostics = await callTool('project_diagnose', { project_path });
    const { resume, readable, plannable, writable } = diagnostics;
    const preparation = plannable && resume ? await callTool('stage_prepare', {
      project_path, expected_revision: resume.revision,
      host_capabilities: options['--host-capabilities']?.split(',').filter(Boolean) ?? [],
    }) : null;
    report.project = { path: project_path, readable, plannable, writable, diagnostics,
      ...(resume ? { resume } : {}), preparation };
    if (!readable || !plannable || !writable || preparation?.status === 'blocked') report.status = 'blocked';
    else if (['await_selection', 'await_step_confirmation'].includes(preparation?.status)) report.status = 'waiting';
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.status === 'blocked') process.exitCode = 2;
} catch (error) {
  console.log(JSON.stringify({ schema_version: 1, status: 'error', code: error.code ?? 'DIAGNOSTIC_FAILED', message: error.message, ...(error.details ? { details: error.details } : {}) }, null, 2));
  process.exitCode = 1;
}
