import { constants } from 'node:fs';
import { lstat, mkdir, open, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { fail } from './errors.mjs';

// Candidate files are mutable working copies. The caller commits the returned
// manifest as a canonical record; this module never keeps a second state file.
const RESERVED = new Set(['.pm-zero', '.git', '.codex', '.agents']);
const TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.json', '.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.svg']);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const hash = value => createHash('sha256').update(Buffer.isBuffer(value) ? value : stable(value)).digest('hex');

function relativePath(value, { internal = false, root = false } = {}) {
  if (root && value === '.') return value;
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0') || value.includes(':')
    || path.posix.isAbsolute(value) || value.split('/').some(part => !part || part === '.' || part === '..')) {
    fail('E_CANDIDATE_PATH_INVALID', 'Candidate paths must be canonical project-relative paths', { path: value });
  }
  if (!internal && RESERVED.has(value.split('/')[0].toLowerCase())) {
    fail('E_CANDIDATE_PATH_INVALID', 'Candidate source paths cannot modify workflow or host metadata', { path: value });
  }
  return value;
}

function within(file, root) { return root === '.' || file.startsWith(`${root}/`); }
function overlaps(a, b) { return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`); }
function commonParent(files) {
  const parts = path.posix.dirname(files[0].source_path).split('/');
  for (const file of files.slice(1)) {
    const next = path.posix.dirname(file.source_path).split('/');
    while (parts.length && parts.some((part, index) => part !== next[index])) parts.pop();
  }
  return parts.join('/') || '.';
}

function validateManifest(manifest) {
  if (!manifest || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(manifest.candidate_id ?? '')) {
    fail('E_CANDIDATE_INVALID', 'Candidate ID must be a portable path segment');
  }
  const expected = `.pm-zero/candidates/${manifest.candidate_id}/files`;
  if (manifest.workspace_path !== expected || !Array.isArray(manifest.files) || !manifest.files.length) {
    fail('E_CANDIDATE_INVALID', 'Candidate manifest has no baseline files or an invalid workspace path');
  }
  relativePath(manifest.source_root, { root: true });
  const seen = [];
  for (const file of manifest.files) {
    relativePath(file.source_path);
    relativePath(file.snapshot_path, { internal: true });
    if (!within(file.source_path, manifest.source_root) || seen.some(other => overlaps(other, file.source_path))) {
      fail('E_CANDIDATE_SCOPE', 'Baseline files must be distinct files inside the declared source root', { path: file.source_path });
    }
    if (!/^[a-f0-9]{64}$/.test(file.sha256 ?? '')) fail('E_CANDIDATE_INVALID', 'Baseline files require exact SHA-256 hashes');
    seen.push(file.source_path);
  }
  for (const reserved of manifest.reserved_paths ?? []) {
    relativePath(reserved);
    if (seen.some(file => overlaps(file, reserved))) {
      fail('E_CANDIDATE_PATH_OWNED', 'An entry file is also owned by another artifact', { path: reserved });
    }
  }
}

export function makeCandidateManifest({ candidate_id, artifact, baseline_revision, source_root, reserved_paths = [] }) {
  if (!artifact || artifact.status !== 'confirmed' || !artifact.files?.length) {
    fail('E_CANDIDATE_BASELINE_REQUIRED', 'A candidate must start from a confirmed artifact with immutable snapshots');
  }
  if (!Number.isSafeInteger(baseline_revision) || baseline_revision < 0) fail('E_CANDIDATE_INVALID', 'Candidate baseline revision is invalid');
  const files = artifact.files.map(file => ({
    source_path: file.source_path, snapshot_path: file.snapshot_path, sha256: file.sha256,
    size: file.size, ...(file.role === undefined ? {} : { role: file.role }),
  })).sort((a, b) => compare(a.source_path, b.source_path));
  const manifest = {
    schema_version: 1, candidate_id, baseline_revision,
    entry_artifact: { artifact_id: artifact.artifact_id, type: artifact.type, version: artifact.version, sha256: artifact.sha256 },
    source_root: source_root ?? commonParent(files),
    workspace_path: `.pm-zero/candidates/${candidate_id}/files`,
    reserved_paths: [...new Set(reserved_paths)].sort(), files,
  };
  validateManifest(manifest);
  return { ...manifest, baseline_hash: hash(manifest) };
}

// Every component is checked, including existing parents of a not-yet-created
// file. O_NOFOLLOW protects the final open as well. This is a trusted local-host
// interface, not an isolation boundary against concurrent hostile filesystem edits.
async function safePath(project, relative, { allowMissing = false } = {}) {
  relativePath(relative, { internal: true });
  let target = await realpath(project);
  const parts = relative.split('/');
  for (let index = 0; index < parts.length; index += 1) {
    target = path.join(target, parts[index]);
    let info;
    try { info = await lstat(target); } catch (error) {
      if (allowMissing && error.code === 'ENOENT') continue;
      throw error;
    }
    if (info.isSymbolicLink()) fail('E_PATH_SYMLINK', 'Candidate paths cannot traverse symbolic links', { path: relative });
    if (index < parts.length - 1 && !info.isDirectory()) fail('E_CANDIDATE_PATH_INVALID', 'A candidate path parent is not a directory', { path: relative });
  }
  return target;
}

async function readSafe(project, relative, { editable = false } = {}) {
  const target = await safePath(project, relative);
  const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || (editable && info.nlink !== 1)) {
      fail('E_CANDIDATE_FILE_INVALID', 'Candidate files must be regular files without hard-link aliases', { path: relative });
    }
    return await handle.readFile();
  } finally { await handle.close(); }
}

async function baselineBytes(project, file) {
  const bytes = await readSafe(project, file.snapshot_path);
  if (hash(bytes) !== file.sha256) fail('E_CANONICAL_DRIFT', 'Candidate baseline snapshot no longer matches its recorded hash', { path: file.snapshot_path });
  return bytes;
}

export async function materializeCandidateWorkspace(project, manifest) {
  validateManifest(manifest);
  // Verify all baselines before writing any editable files.
  const captured = await Promise.all(manifest.files.map(file => baselineBytes(project, file)));
  for (let index = 0; index < manifest.files.length; index += 1) {
    const file = manifest.files[index];
    const relative = `${manifest.workspace_path}/${file.source_path}`;
    const target = await safePath(project, relative, { allowMissing: true });
    await mkdir(path.dirname(target), { recursive: true });
    let handle;
    try { handle = await open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (hash(await readSafe(project, relative, { editable: true })) !== file.sha256) {
        fail('E_CANDIDATE_EXISTS', 'An existing candidate working copy has edits; it cannot be overwritten', { path: relative });
      }
      continue;
    }
    try { await handle.writeFile(captured[index]); await handle.sync(); } finally { await handle.close(); }
  }
  return manifest;
}

function textSummary(sourcePath, before, after) {
  if (!TEXT_EXTENSIONS.has(path.posix.extname(sourcePath).toLowerCase()) || before?.includes(0) || after?.includes(0)
    || (before && !isUtf8(before)) || (after && !isUtf8(after))) return undefined;
  const oldLines = before?.toString('utf8').split('\n') ?? [];
  const newLines = after?.toString('utf8').split('\n') ?? [];
  let first = 0;
  while (first < oldLines.length && first < newLines.length && oldLines[first] === newLines[first]) first += 1;
  return {
    old_lines: oldLines.length, new_lines: newLines.length, first_changed_line: first + 1,
    before_excerpt: oldLines.slice(Math.max(0, first - 1), first + 4).join('\n').slice(0, 1200),
    after_excerpt: newLines.slice(Math.max(0, first - 1), first + 4).join('\n').slice(0, 1200),
  };
}

export async function scanCandidateWorkspace(project, manifest, { baseline_revision = manifest.baseline_revision, include_bytes = false } = {}) {
  validateManifest(manifest);
  if (!Number.isSafeInteger(baseline_revision) || baseline_revision < 0) fail('E_CANDIDATE_INVALID', 'Preview revision is invalid');
  const baseline = new Map(manifest.files.map(file => [file.source_path, file]));
  const files = [];
  async function walk(relative = '') {
    const directory = `${manifest.workspace_path}${relative ? `/${relative}` : ''}`;
    const absolute = await safePath(project, directory);
    for (const entry of (await readdir(absolute, { withFileTypes: true })).sort((a, b) => compare(a.name, b.name))) {
      const sourcePath = relative ? `${relative}/${entry.name}` : entry.name;
      relativePath(sourcePath);
      if (entry.isSymbolicLink()) fail('E_PATH_SYMLINK', 'Candidate workspaces cannot contain symbolic links', { path: sourcePath });
      if (entry.isDirectory()) { await walk(sourcePath); continue; }
      if (!entry.isFile()) fail('E_CANDIDATE_FILE_INVALID', 'Candidate workspaces cannot contain special files', { path: sourcePath });
      if (!within(sourcePath, manifest.source_root)) fail('E_CANDIDATE_SCOPE', 'A candidate file is outside the declared source root', { path: sourcePath, source_root: manifest.source_root });
      if ((manifest.reserved_paths ?? []).some(other => overlaps(sourcePath, other))) fail('E_CANDIDATE_PATH_OWNED', 'Candidate file belongs to another artifact', { path: sourcePath });
      const bytes = await readSafe(project, `${manifest.workspace_path}/${sourcePath}`, { editable: true });
      const original = baseline.get(sourcePath);
      files.push({ source_path: sourcePath, candidate_path: `${manifest.workspace_path}/${sourcePath}`, sha256: hash(bytes), size: bytes.length,
        ...(original?.role === undefined ? {} : { role: original.role }), bytes });
    }
  }
  await walk();
  files.sort((a, b) => compare(a.source_path, b.source_path));
  const current = new Map(files.map(file => [file.source_path, file]));
  const differences = [];
  // Read snapshots even for deleted/unchanged files, so corrupted baselines
  // cannot silently produce an apparently acceptable diff.
  const originals = new Map(await Promise.all(manifest.files.map(async file => [file.source_path, await baselineBytes(project, file)])));
  for (const sourcePath of [...new Set([...baseline.keys(), ...current.keys()])].sort()) {
    const before = baseline.get(sourcePath), after = current.get(sourcePath);
    if (before?.sha256 === after?.sha256) continue;
    const summary = textSummary(sourcePath, originals.get(sourcePath), after?.bytes);
    differences.push({ path: sourcePath, change: before ? after ? 'modified' : 'deleted' : 'added',
      file_type: summary ? 'text' : 'binary',
      before_sha256: before?.sha256 ?? null, after_sha256: after?.sha256 ?? null,
      before_size: before?.size ?? null, after_size: after?.size ?? null,
      ...(summary ? { text_summary: summary } : {}) });
  }
  const content_hash = hash(files.map(({ source_path, sha256, size }) => ({ source_path, sha256, size })));
  const preview_hash = hash({ candidate_id: manifest.candidate_id, baseline_hash: manifest.baseline_hash, baseline_revision, content_hash });
  return {
    candidate_id: manifest.candidate_id, baseline_revision, baseline_hash: manifest.baseline_hash, content_hash, preview_hash,
    files: files.map(({ bytes, ...file }) => ({ ...file, ...(include_bytes ? { bytes } : {}) })), differences,
    summary: { added: differences.filter(file => file.change === 'added').length, modified: differences.filter(file => file.change === 'modified').length, deleted: differences.filter(file => file.change === 'deleted').length },
  };
}

// Run while holding the project write lock, immediately before acceptance.
// Existing unregistered files are never implicitly adopted or overwritten,
// even when their bytes happen to match a newly added candidate file.
export async function assertCandidateTargets(project, manifest, scan, { reserved_paths = [] } = {}) {
  validateManifest(manifest);
  const baseline = new Map(manifest.files.map(file => [file.source_path, file]));
  const reserved = [...new Set([...(manifest.reserved_paths ?? []), ...reserved_paths])];
  for (const entry of reserved) relativePath(entry);
  for (const file of manifest.files) {
    let bytes;
    try { bytes = await readSafe(project, file.source_path, { editable: true }); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      fail('E_CONFIRMED_ARTIFACT_MODIFIED', 'The formal baseline source is missing', { path: file.source_path });
    }
    if (hash(bytes) !== file.sha256) fail('E_CONFIRMED_ARTIFACT_MODIFIED', 'The formal baseline source changed during candidate editing', { path: file.source_path });
  }
  for (const file of scan.files) {
    relativePath(file.source_path);
    if (!within(file.source_path, manifest.source_root)) fail('E_CANDIDATE_SCOPE', 'Candidate target is outside the declared source root', { path: file.source_path });
    if (reserved.some(other => overlaps(file.source_path, other))) fail('E_CANDIDATE_PATH_OWNED', 'Candidate target is owned by another artifact', { path: file.source_path });
    const target = await safePath(project, file.source_path, { allowMissing: true });
    if (baseline.has(file.source_path)) continue;
    let info;
    try { info = await lstat(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (info) fail('E_CANDIDATE_TARGET_EXISTS', 'A new candidate target already exists outside the registered baseline', { path: file.source_path });
  }
  return true;
}
