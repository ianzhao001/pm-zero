import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, readlink, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const contentDigest = files => hash(JSON.stringify(files.filter(file => file.path !== 'build-info.json')));

// Inventory the actual tree, including executable bits and link targets. Never
// follow directory links: a package must not depend on files outside its root.
export async function packageFiles(directory) {
  const root = await realpath(directory);
  const files = [];
  async function walk(dir) {
    for (const name of (await readdir(dir)).sort()) {
      const full = path.join(dir, name);
      const relative = path.relative(root, full).split(path.sep).join('/');
      if (relative === 'inventory.json') continue;
      const stat = await lstat(full);
      if (stat.isDirectory()) await walk(full);
      else if (stat.isSymbolicLink()) {
        const target = await readlink(full);
        const resolved = await realpath(full);
        if (path.isAbsolute(target) || !resolved.startsWith(`${root}${path.sep}`)) {
          throw new Error(`External package link: ${relative}`);
        }
        files.push({ path: relative, type: 'symlink', target });
      } else if (stat.isFile()) {
        files.push({ path: relative, type: 'file', sha256: hash(await readFile(full)), executable: Boolean(stat.mode & 0o111) });
      } else throw new Error(`Unsupported package entry: ${relative}`);
    }
  }
  await walk(root);
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

export async function writePackageInventory(root, { context, source, brandPack }) {
  const build = {
    schema_version: 1,
    source,
    ...(brandPack ? { brand_pack: { api: brandPack.api, id: brandPack.id, version: brandPack.version, content_sha256: brandPack.content_sha256, layers: brandPack.layers, lock_file: 'local-brand-pack.lock.json' } } : {}),
    package_context: context,
    content_sha256: contentDigest(await packageFiles(root)),
  };
  await writeFile(path.join(root, 'build-info.json'), `${JSON.stringify(build, null, 2)}\n`);
  const inventory = {
    schema_version: 2, package_context: context, distribution: 'local-private',
    files: await packageFiles(root),
  };
  await writeFile(path.join(root, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
  return build;
}

export async function readBuildInfo(root) {
  let text;
  try { text = await readFile(path.join(root, 'build-info.json'), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const build = JSON.parse(text);
  if (build.schema_version !== 1 || !/^[a-f0-9]{64}$/.test(build.content_sha256)
    || !(typeof build.package_context === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(build.package_context))
    || !build.source || !(build.source.commit === null || /^[a-f0-9]{40}$/.test(build.source.commit))
    || !(build.source.dirty === null || typeof build.source.dirty === 'boolean')) {
    throw new Error('Invalid package build identity');
  }
  return build;
}

export async function verifyPackageInventory(root) {
  if (!(await lstat(path.join(root, 'inventory.json'))).isFile()) throw new Error('Inventory must be a regular file');
  const inventory = JSON.parse(await readFile(path.join(root, 'inventory.json'), 'utf8'));
  if (inventory.schema_version !== 2 || !Array.isArray(inventory.files) || !inventory.files.length) {
    throw new Error('Inventory v2 is required; rebuild legacy packages before complete verification');
  }
  const actual = await packageFiles(root);
  const expected = new Map(inventory.files.map(file => [file.path, file]));
  if (expected.size !== inventory.files.length) throw new Error('Duplicate package inventory paths');
  const changes = [];
  for (const file of actual) {
    const before = expected.get(file.path);
    if (!before) changes.push(`unexpected:${file.path}`);
    else if (JSON.stringify(before) !== JSON.stringify(file)) changes.push(`changed:${file.path}`);
    expected.delete(file.path);
  }
  for (const file of expected.keys()) changes.push(`missing:${file}`);
  if (changes.length) throw new Error(`Package drift: ${changes.slice(0, 20).join(', ')}${changes.length > 20 ? ` (${changes.length} total)` : ''}`);
  const build = await readBuildInfo(root);
  if (!build || build.package_context !== inventory.package_context
    || inventory.distribution !== 'local-private' || build.content_sha256 !== contentDigest(actual)) {
    throw new Error('Package build identity does not match inventory');
  }
  return { status: 'verified', coverage: 'complete-tree', verified_files: actual.length, build,
    boundary: 'Local byte, link and mode consistency; not a publisher signature or product acceptance.' };
}
