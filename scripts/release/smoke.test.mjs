import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, mkdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = path.resolve(import.meta.dirname, '../..');
const run = (args, cwd = root) => execFileSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] });

test('standalone neutral, public brands, private overlay, isolation and update protection', { timeout: 240000 }, async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'pm-zero-release-test-'));
  try {
    for (const brand of ['none', 'dewu', 'jd']) {
      const dest = path.join(temp, brand);
      const result = JSON.parse(run(['scripts/release/build.mjs', dest, ...(brand === 'none' ? [] : ['--brand', brand])]));
      assert.equal(result.context, brand);
      if (brand !== 'none') { assert.equal(result.validation.stage_plans, 22); assert.equal(result.validation.step_plans, 450); }
      const { verifyPackageInventory } = await import(pathToFileURL(path.join(dest, 'system/workflow-core/lib/package-integrity.mjs')));
      assert.equal((await verifyPackageInventory(dest)).status, 'verified');
      run([path.join(dest, 'mcp/diagnose.mjs'), '--expected-context', brand], temp);
      const { callTool } = await import(pathToFileURL(path.join(dest, 'system/workflow-core/index.mjs')));
      const info = await callTool('runtime_info', {});
      assert.deepEqual(info.supported_contexts, brand === 'none' ? ['none'] : [brand, 'none']);
      const project_path = path.join(temp, `project-${brand}`);
      const project = await callTool('project_open', { project_path, project_id: `release-${brand}`, create: true, context: brand });
      const prepared = await callTool('stage_prepare', { project_path, expected_revision: project.revision, host_capabilities: [] });
      assert.equal(prepared.context, brand);
      await assert.rejects(callTool('project_open', { project_path: path.join(temp, `wrong-${brand}`), create: true, project_id: 'wrong-brand', context: 'other-brand' }), { code: 'E_CONTEXT_UNAVAILABLE' });
      assert.throws(() => run(['scripts/release/build.mjs', dest]));
      await assert.rejects(stat(path.join(dest, 'brand-packs')), { code: 'ENOENT' });
    }
    const client = new Client({ name: 'public-release-smoke', version: '1.0.0' });
    const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(temp, 'jd/mcp/server.mjs')], cwd: temp, stderr: 'pipe' });
    try {
      await client.connect(transport);
      assert.ok((await client.listTools()).tools.some(t => t.name === 'project_open'));
      const result = await client.callTool({ name: 'runtime_info', arguments: {} });
      assert.notEqual(result.isError, true);
    } finally { await client.close(); }
    const privatePack = path.join(temp, 'private-jd');
    await mkdir(path.join(privatePack, 'rules'), { recursive: true });
    const rule = '# Local visual override\nUse this explicitly selected private direction.\n';
    await writeFile(path.join(privatePack, 'rules/visual.md'), rule);
    await writeFile(path.join(privatePack, 'unlisted-note.txt'), 'NOT_FOR_DEPLOYMENT');
    await writeFile(path.join(privatePack, 'brand-pack.json'), JSON.stringify({ schema_version: 1, core_api: 1, id: 'jd', version: '1.0.0', files: ['rules/visual.md'], context: {}, providers: [] }));
    const publicBefore = await readFile(path.join(root, 'brand-packs/jd/rules/visual.md'), 'utf8');
    for (const version of ['v1', 'v2']) {
      const dest = path.join(temp, `private-${version}`);
      run(['scripts/release/build.mjs', dest, '--brand', 'jd', '--private-pack', privatePack]);
      assert.equal(await readFile(path.join(dest, 'skills/jd/rules/visual.md'), 'utf8'), rule);
      await assert.rejects(stat(path.join(dest, 'skills/jd/unlisted-note.txt')), { code: 'ENOENT' });
      const lock = JSON.parse(await readFile(path.join(dest, 'local-brand-pack.lock.json'), 'utf8'));
      assert.deepEqual(lock.layers.map(l => l.layer), ['public', 'private']);
      assert.ok(lock.overrides.files.includes('rules/visual.md'));
    }
    assert.equal(await readFile(path.join(privatePack, 'rules/visual.md'), 'utf8'), rule);
    assert.equal(await readFile(path.join(root, 'brand-packs/jd/rules/visual.md'), 'utf8'), publicBefore);
    const old = path.join(temp, 'private-v1/skills/jd/rules/visual.md');
    assert.equal(await readFile(old, 'utf8'), rule);
    const publicLock = JSON.parse(await readFile(path.join(temp, 'jd/local-brand-pack.lock.json'), 'utf8'));
    assert.deepEqual(publicLock.layers.map(l => l.layer), ['public']);
    assert.throws(() => run(['scripts/release/build.mjs', path.join(temp, 'mixed'), '--brand', 'dewu', '--private-pack', privatePack]));
  } finally { await rm(temp, { recursive: true, force: true }); }
});
