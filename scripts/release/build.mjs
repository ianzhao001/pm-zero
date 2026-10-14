#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertLocalDestination, applyBrandPack } from '../brand-pack/core.mjs';
import { writePackageInventory } from '../../system/workflow-core/lib/package-integrity.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const [destination, ...args] = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--brand', '--private-pack'].includes(args[i]) || options[args[i]] || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Invalid build options');
  options[args[i]] = args[i + 1];
}
if (!destination || destination.startsWith('--')) throw new Error('Usage: node scripts/release/build.mjs NEW_DIRECTORY [--brand dewu|jd] [--private-pack EXTERNAL_DIRECTORY]');
const brand = options['--brand'];
if (brand && !['dewu', 'jd'].includes(brand)) throw new Error('Unknown bundled brand');
const publicPack = brand ? path.join(root, 'brand-packs', brand) : undefined;
const privatePack = options['--private-pack'];
const target = await assertLocalDestination(destination, [root, ...(privatePack ? [privatePack] : [])]);
const lock = JSON.parse(await readFile(path.join(root, 'release-files.json'), 'utf8'));
if (lock.schema_version !== 1 || !Array.isArray(lock.files)) throw new Error('Invalid release file list');
const seen = new Set();
const snapshots = [];
for (const entry of lock.files) {
  const file = entry.path;
  if (typeof file !== 'string' || file.includes('\\') || path.isAbsolute(file) || file.split('/').some(s => !s || s === '..' || s === '.') || seen.has(file)) throw new Error('Unsafe release path');
  seen.add(file);
  let current = root;
  for (const part of file.split('/')) {
    current = path.join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symlink in release: ${file}`);
  }
  const stat = await lstat(current);
  if (!stat.isFile()) throw new Error(`Not a release file: ${file}`);
  const bytes = await readFile(current);
  if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256 || Boolean(stat.mode & 0o111) !== entry.executable) throw new Error(`Source release drift: ${file}`);
  if (entry.runtime) snapshots.push({ ...entry, bytes });
}
await lstat(path.join(root, 'node_modules/parse5/package.json')).catch(() => { throw new Error('Run npm ci before building'); });
await mkdir(path.dirname(target), { recursive: true });
const staging = await mkdtemp(path.join(path.dirname(target), '.pm-zero-build-'));
try {
  for (const entry of snapshots) {
    const file = path.join(staging, entry.path);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, entry.bytes, { mode: entry.executable ? 0o755 : 0o644, flag: 'wx' });
  }
  await cp(path.join(root, 'node_modules'), path.join(staging, 'node_modules'), { recursive: true, verbatimSymlinks: true });
  const identity = publicPack || privatePack ? await applyBrandPack(staging, privatePack, publicPack) : undefined;
  // Record the public version without exposing a private repository commit.
  await writeFile(path.join(staging, 'release-version.json'), JSON.stringify({ version: lock.version }) + '\n');
  await writePackageInventory(staging, { context: identity?.id ?? 'none', source: { commit: null, dirty: false }, brandPack: identity });
  try { await lstat(target); throw new Error('Destination appeared during build'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await rename(staging, target);
  console.log(JSON.stringify({ destination: target, version: lock.version, context: identity?.id ?? 'none', validation: identity?.validation }));
} catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
