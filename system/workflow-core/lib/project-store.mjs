// Filesystem persistence helpers. Commit records remain the authoritative boundary;
// journals describe uncommitted writes and never replace existing project history.
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import path from 'node:path';
import { link, lstat, mkdir, open, readFile, readdir, rename, unlink } from 'node:fs/promises';
import { fail } from './errors.mjs';

const INTERNAL = '.pm-zero';
const transactionContext = new AsyncLocalStorage();
const CANONICAL_ROOTS = ['project', 'workflow', 'brief', 'artifacts', 'versions', 'decisions', 'changes', 'gates', 'steps', 'candidate-records'];
const now = () => new Date().toISOString();
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const relative = (project, target) => path.relative(project, target).split(path.sep).join('/');

async function fingerprint(target) {
  try {
    const info = await lstat(target);
    if (info.isSymbolicLink()) return { kind: 'symlink' };
    if (!info.isFile()) return { kind: 'other' };
    const bytes = await readFile(target);
    return { kind: 'file', sha256: hash(bytes), size: bytes.length };
  } catch (error) {
    if (error.code === 'ENOENT') return { kind: 'absent' };
    throw error;
  }
}

async function safePath(project, input, { internal = true } = {}) {
  if (typeof input !== 'string' || !input || path.isAbsolute(input) || input.split(/[\\/]/).includes('..')) fail('E_PATH_ESCAPE', 'Expected a relative project path', { path: input });
  const target = path.resolve(project, input);
  if (!target.startsWith(`${path.resolve(project)}${path.sep}`) || (!internal && (input === INTERNAL || input.startsWith(`${INTERNAL}/`)))) fail('E_PATH_ESCAPE', 'Path is outside the permitted project files', { path: input });
  let cursor = path.resolve(project);
  for (const segment of path.relative(project, target).split(path.sep)) {
    cursor = path.join(cursor, segment);
    try {
      if ((await lstat(cursor)).isSymbolicLink()) fail('E_PATH_SYMLINK', 'Symlinks are not permitted in persisted project paths', { path: input });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return target;
}

export async function atomicWrite(target, data) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(data);
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporary, target);
  } finally {
    if (handle) await handle.close().catch(() => {});
    await unlink(temporary).catch(() => {});
  }
}

async function saveJournal(context) {
  await atomicWrite(context.journalPath, json(context.journal));
}

export async function atomicWriteNew(target, data) {
  const desired = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const existing = await fingerprint(target);
  if (existing.kind !== 'absent') {
    if (existing.kind === 'file' && existing.sha256 === hash(desired)) return;
    fail('E_CANONICAL_COLLISION', 'Refusing to overwrite an existing canonical workflow record; inspect project recovery', { path: target });
  }
  const context = transactionContext.getStore();
  if (context) {
    const item = relative(context.project, target);
    await safePath(context.project, item);
    if (!item.startsWith(`${INTERNAL}/`)) fail('E_STORE_PATH_INVALID', 'Canonical transaction writes must be internal');
    if (!context.journal.canonical_writes.some(write => write.path === item)) {
      context.journal.canonical_writes.push({ path: item, sha256: hash(desired), size: desired.length });
      await saveJournal(context); // Persist intent before publishing the canonical file.
    }
  }
  await atomicWrite(target, desired);
}

async function processIdentity(pid) {
  try {
    // Linux start ticks disambiguate reused PIDs. Unsupported platforms stay unknown.
    const value = await readFile(`/proc/${pid}/stat`, 'utf8');
    const fields = value.slice(value.lastIndexOf(')') + 2).split(' ');
    const boot = (await readFile('/proc/sys/kernel/random/boot_id', 'utf8')).trim();
    return { boot_id: boot, start_ticks: fields[19] };
  } catch { return null; }
}

async function newOwner() {
  return { schema_version: 1, token: randomUUID(), pid: process.pid, hostname: hostname(), process_identity: await processIdentity(process.pid), acquired_at: now() };
}

async function inspectLock(project, filename = 'workflow.lock') {
  const target = await safePath(project, `${INTERNAL}/${filename}`);
  const file = await fingerprint(target);
  if (file.kind === 'absent') return { status: 'absent', file };
  if (file.kind !== 'file') return { status: 'unknown', reason: 'non_regular_lock', file };
  let owner;
  try { owner = JSON.parse(await readFile(target, 'utf8')); } catch { return { status: 'unknown', reason: 'invalid_lock_metadata', file }; }
  if (!Number.isSafeInteger(owner.pid) || owner.pid < 1) return { status: 'unknown', reason: 'invalid_pid', owner, file };
  if (!owner.hostname || !owner.process_identity || !owner.token) return { status: 'unknown', reason: 'legacy_lock_without_owner_identity', owner, file };
  if (owner.hostname !== hostname()) return { status: 'unknown', reason: 'different_host', owner, file };
  let alive;
  try { process.kill(owner.pid, 0); alive = true; } catch (error) {
    if (error.code === 'ESRCH') alive = false;
    else return { status: 'unknown', reason: 'process_visibility_unavailable', owner, file };
  }
  if (!alive) return { status: 'dead', reason: 'process_exited', owner, file };
  const actual = await processIdentity(owner.pid);
  if (!actual) return { status: 'unknown', reason: 'process_identity_unavailable', owner, file };
  if (stable(actual) !== stable(owner.process_identity)) return { status: 'dead', reason: 'process_identity_changed', owner, file };
  return { status: 'active', owner, file };
}

async function createOwnedLock(project, filename) {
  const target = await safePath(project, `${INTERNAL}/${filename}`);
  const owner = await newOwner();
  const temporary = await safePath(project, `${INTERNAL}/.${filename}.${process.pid}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(json(owner));
    await handle.sync();
    await handle.close();
    handle = null;
    // Publish a complete owner exclusively. A kill during initialization leaves an
    // unreferenced temporary file, never an empty workflow/recovery lock.
    await link(temporary, target);
  } catch (error) {
    if (error.code === 'EEXIST') fail('E_PROJECT_LOCKED', 'Project is busy or requires explicit recovery', { lock: filename }, true);
    throw error;
  } finally {
    if (handle) await handle.close().catch(() => {});
    await unlink(temporary).catch(() => {});
  }
  const release = async () => {
    try {
      const current = JSON.parse(await readFile(target, 'utf8'));
      if (current.token === owner.token) await unlink(target);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  };
  release.owner = owner;
  return release;
}

export async function acquireProjectLock(project, { recovery = false } = {}) {
  if (!recovery && (await inspectLock(project, 'recovery.lock')).status !== 'absent') fail('E_RECOVERY_IN_PROGRESS', 'Explicit project recovery is in progress or requires inspection', {}, true);
  const release = await createOwnedLock(project, 'workflow.lock');
  try {
    if (!recovery && (await inspectLock(project, 'recovery.lock')).status !== 'absent') fail('E_RECOVERY_IN_PROGRESS', 'Explicit project recovery started before the write lock was acquired', {}, true);
    return release;
  } catch (error) {
    await release().catch(() => {});
    throw error;
  }
}

async function commitRecords(project) {
  const root = await safePath(project, `${INTERNAL}/commits`);
  const names = (await readdir(root)).filter(name => /^\d{12}\.json$/.test(name)).sort();
  const records = [];
  for (const name of names) {
    const target = await safePath(project, `${INTERNAL}/commits/${name}`);
    const bytes = await readFile(target);
    let record;
    try { record = JSON.parse(bytes); } catch { fail('E_PROJECT_CORRUPT', 'Commit record is not valid JSON', { commit: name }); }
    const revision = Number(name.slice(0, 12));
    if (record.state?.revision !== revision || (record.revision !== undefined && record.revision !== revision)) fail('E_PROJECT_CORRUPT', 'Commit revision does not match its filename', { commit: name });
    records.push({ name, sha256: hash(bytes), record });
  }
  if (!records.length) fail('E_PROJECT_CORRUPT', 'Project has no immutable commit record');
  return records;
}

function transactionCommit(records, journal) {
  return records.find(({ record }) => record.state.revision === journal.base_revision + 1 && record.event?.request_id === journal.request_id && record.event?.tool === journal.tool);
}

async function journals(project) {
  const root = await safePath(project, `${INTERNAL}/transactions`);
  let names;
  try { names = await readdir(root); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const found = [];
  for (const name of names.sort()) {
    if (!/^[a-zA-Z0-9-]+$/.test(name)) continue;
    const entry = `${INTERNAL}/transactions/${name}/journal.json`;
    const target = await safePath(project, entry);
    let bytes;
    try { bytes = await readFile(target); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    let journal;
    try { journal = JSON.parse(bytes); } catch { fail('E_STORE_JOURNAL_INVALID', 'Transaction journal is unreadable', { path: entry }); }
    if (journal.schema_version !== 1 || journal.transaction_id !== name || !Array.isArray(journal.canonical_writes) || !Array.isArray(journal.source_writes)) fail('E_STORE_JOURNAL_INVALID', 'Invalid transaction journal structure', { path: entry });
    found.push({ path: entry, sha256: hash(bytes), journal });
  }
  return found;
}

export async function assertProjectStoreReady(project) {
  const records = await commitRecords(project);
  const blocked = (await journals(project)).filter(({ journal }) => ['pending', 'interrupted'].includes(journal.status) && !transactionCommit(records, journal) && journal.source_writes.length);
  if (blocked.length) fail('E_RECOVERY_REQUIRED', 'Uncommitted source writes require explicit recovery before further mutations', { transactions: blocked.map(item => item.journal.transaction_id) });
}

export async function runProjectTransaction(project, options, operation) {
  const id = randomUUID();
  const journalPath = await safePath(project, `${INTERNAL}/transactions/${id}/journal.json`);
  const context = { project, journalPath, journal: { schema_version: 1, transaction_id: id, base_revision: options.base_revision, request_id: options.request_id, tool: options.tool, status: 'pending', created_at: now(), canonical_writes: [], source_writes: [] } };
  await saveJournal(context);
  return transactionContext.run(context, async () => {
    let result;
    try {
      result = await operation();
    } catch (error) {
      const committed = transactionCommit(await commitRecords(project), context.journal);
      context.journal.status = committed ? 'committed' : 'interrupted';
      context.journal.error_code = error.code ?? 'E_OPERATION_FAILED';
      context.journal.finished_at = now();
      await saveJournal(context).catch(() => {});
      if (committed) {
        const saved = committed.record.state.request_log?.[options.request_id]?.result;
        if (saved) return { ...saved, committed: true, derived_state_pending: true, store_warning: 'The commit succeeded; derived views need rebuilding.' };
        fail('E_COMMITTED_VIEW_PENDING', 'The commit succeeded; rebuild derived state before retrying', { revision: committed.record.state.revision, transaction_id: id });
      }
      throw error;
    }
    const committed = transactionCommit(await commitRecords(project), context.journal);
    if (!committed) fail('E_STORE_COMMIT_MISSING', 'Mutation finished without its authoritative commit', { transaction_id: id });
    context.journal.status = 'committed';
    context.journal.finished_at = now();
    await saveJournal(context).catch(() => {}); // A committed transaction cannot be rolled back by journal cleanup.
    return result;
  });
}

export async function transactionalWriteSource(project, input, data, { expected_before } = {}) {
  const context = transactionContext.getStore();
  if (!context || path.resolve(context.project) !== path.resolve(project)) fail('E_STORE_TRANSACTION_REQUIRED', 'Source publication requires an active project transaction');
  const target = await safePath(project, input, { internal: false });
  if (context.journal.source_writes.some(write => write.path === input)) fail('E_STORE_DUPLICATE_SOURCE', 'Each source file may be published only once per transaction', { path: input });
  const before = await fingerprint(target);
  if (expected_before && stable(before) !== stable(expected_before)) fail('E_SOURCE_CHANGED', 'Source no longer matches the accepted candidate baseline', { path: input, expected: expected_before, actual: before });
  if (!['file', 'absent'].includes(before.kind)) fail('E_STORE_SOURCE_INVALID', 'Source publication requires an ordinary file or absent path', { path: input });
  let backupPath = null;
  if (before.kind === 'file') {
    backupPath = `${INTERNAL}/transactions/${context.journal.transaction_id}/backups/${context.journal.source_writes.length}`;
    const bytes = await readFile(target);
    if (hash(bytes) !== before.sha256) fail('E_SOURCE_CHANGED', 'Source changed before backup', { path: input });
    await atomicWrite(await safePath(project, backupPath), bytes);
  }
  const bytes = data === null ? null : Buffer.isBuffer(data) ? data : Buffer.from(data);
  const after = bytes === null ? { kind: 'absent' } : { kind: 'file', sha256: hash(bytes), size: bytes.length };
  context.journal.source_writes.push({ path: input, before, after, backup_path: backupPath });
  await saveJournal(context);
  if (stable(await fingerprint(target)) !== stable(before)) fail('E_SOURCE_CHANGED', 'Source changed before publication', { path: input });
  if (bytes === null) { if (before.kind !== 'absent') await unlink(target); }
  else await atomicWrite(target, bytes);
}

function collectReferences(value, references) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.path === 'string' && typeof value.sha256 === 'string' && value.path.startsWith(`${INTERNAL}/`)) references.add(value.path);
  if (typeof value.snapshot_path === 'string') references.add(value.snapshot_path);
  for (const child of Object.values(value)) collectReferences(child, references);
}

async function walkFiles(project, root) {
  const target = await safePath(project, root);
  let entries;
  try { entries = await readdir(target, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const item = `${root}/${entry.name}`;
    if (entry.isSymbolicLink()) fail('E_PATH_SYMLINK', 'Canonical storage contains a symlink', { path: item });
    if (entry.isDirectory()) result.push(...await walkFiles(project, item));
    else if (entry.isFile() && !/^\..+\.\d+\.[0-9a-f-]{36}\.tmp$/.test(entry.name)) result.push({ path: item, ...await fingerprint(await safePath(project, item)) });
  }
  return result;
}

async function recoverySnapshot(project) {
  const records = await commitRecords(project);
  const references = new Set();
  for (const { record } of records) collectReferences(record.state, references);
  const allJournals = await journals(project);
  const pending = [];
  const blocked = [];
  for (const entry of allJournals) {
    if (!['pending', 'interrupted'].includes(entry.journal.status)) continue;
    const committed = transactionCommit(records, entry.journal);
    const sources = [];
    for (const write of entry.journal.source_writes) {
      const current = await fingerprint(await safePath(project, write.path, { internal: false }));
      let backup = null;
      if (write.backup_path) backup = await fingerprint(await safePath(project, write.backup_path));
      const action = committed ? 'preserve_committed' : stable(current) === stable(write.before) ? 'already_original' : stable(current) === stable(write.after) ? 'restore_original' : 'blocked_external_change';
      if (action === 'blocked_external_change') blocked.push({ path: write.path, reason: 'source_changed_after_interrupted_write' });
      if (!committed && write.before.kind === 'file' && (backup?.kind !== 'file' || backup.sha256 !== write.before.sha256)) blocked.push({ path: write.path, reason: 'backup_missing_or_changed' });
      sources.push({ ...write, current, backup, action });
    }
    pending.push({ ...entry, committed: Boolean(committed), sources });
  }
  const orphaned = [];
  for (const root of CANONICAL_ROOTS) {
    for (const file of await walkFiles(project, `${INTERNAL}/${root}`)) {
      if (references.has(file.path)) continue;
      const owner = allJournals.find(entry => entry.journal.canonical_writes.some(write => write.path === file.path && write.sha256 === file.sha256));
      // Only journal-owned writes are eligible. Pre-journal and unknown files stay put.
      const recognized = Boolean(owner);
      orphaned.push({ ...file, action: recognized ? 'quarantine' : 'preserve_unknown', transaction_id: owner?.journal.transaction_id ?? null });
    }
  }
  const lock = await inspectLock(project);
  if (['active', 'unknown'].includes(lock.status)) blocked.push({ reason: `workflow_lock_${lock.status}` });
  const snapshot = {
    schema_version: 1,
    revision: records.at(-1).record.state.revision,
    commits: records.map(({ name, sha256 }) => ({ name, sha256 })),
    lock,
    transactions: pending,
    orphaned_files: orphaned,
    blocked,
    actions: [...(lock.status === 'dead' ? [{ action: 'quarantine_dead_lock' }] : []), ...pending.map(item => ({ action: item.committed ? 'finalize_committed_transaction' : 'restore_uncommitted_transaction', transaction_id: item.journal.transaction_id })), ...orphaned.filter(item => item.action === 'quarantine').map(item => ({ action: 'quarantine_unreferenced_canonical', path: item.path })), { action: 'rebuild_derived_state' }],
  };
  return snapshot;
}

export async function diagnoseProjectStore(project) {
  const snapshot = await recoverySnapshot(project);
  const recoveryLock = await inspectLock(project, 'recovery.lock');
  const sourcePending = snapshot.transactions.some(item => !item.committed && item.sources.length);
  const recoveryRequired = snapshot.lock.status !== 'absent' || recoveryLock.status !== 'absent' || snapshot.transactions.some(item => item.journal.canonical_writes.length || item.sources.length) || snapshot.orphaned_files.some(item => item.action === 'quarantine');
  return { ...snapshot, recovery_lock: recoveryLock, recovery_required: recoveryRequired, writable: snapshot.lock.status === 'absent' && recoveryLock.status === 'absent' && !sourcePending, issues: [...snapshot.blocked, ...(recoveryLock.status !== 'absent' ? [{ reason: 'recovery_lock_present', status: recoveryLock.status }] : []), ...(sourcePending ? [{ reason: 'uncommitted_source_publication' }] : [])] };
}

async function recoveryGuards(project) {
  const names = (await readdir(await safePath(project, INTERNAL))).filter(name => /^recovery(?:-claim-[0-9a-f]{64})?\.lock$/.test(name));
  if (!names.includes('recovery.lock')) names.push('recovery.lock');
  const result = [];
  for (const name of names.sort()) result.push({ name, ...await inspectLock(project, name) });
  return result;
}

function guardBlockers(guards) {
  const blocked = [];
  let name = 'recovery.lock';
  const visited = new Set();
  while (!visited.has(name)) {
    visited.add(name);
    const guard = guards.find(item => item.name === name);
    if (!guard || guard.status === 'absent') break;
    if (guard.status !== 'dead') { blocked.push({ reason: 'recovery_guard_not_abandoned', lock: name, status: guard.status }); break; }
    name = `recovery-claim-${guard.file.sha256}.lock`;
  }
  return blocked;
}

// A deterministic successor lock serializes reclamation of each abandoned guard.
// A crash while claiming creates another inspectable dead guard; its successor can
// be explicitly approved next time. Never rename an active or unknown lock.
async function claimRecoveryGuard(project, filename, approved, archive, depth = 0) {
  if (depth > 64) fail('E_RECOVERY_BLOCKED', 'Too many interrupted recovery claims require manual inspection');
  const expected = approved.find(item => item.name === filename) ?? { status: 'absent', file: { kind: 'absent' } };
  const current = await inspectLock(project, filename);
  if (stable(current.file) !== stable(expected.file)) fail('E_RECOVERY_PREVIEW_STALE', 'Recovery ownership changed', { lock: filename });
  if (current.status === 'absent') return createOwnedLock(project, filename);
  if (current.status !== 'dead') fail('E_RECOVERY_BLOCKED', 'Recovery guard is active or has unknown ownership', { lock: filename });
  const releaseClaim = await claimRecoveryGuard(project, `recovery-claim-${current.file.sha256}.lock`, approved, archive, depth + 1);
  try {
    if (stable((await inspectLock(project, filename)).file) !== stable(expected.file)) fail('E_RECOVERY_PREVIEW_STALE', 'Recovery ownership changed during reclamation');
    const destination = await safePath(project, `${archive}/locks/${filename}`);
    await mkdir(path.dirname(destination), { recursive: true });
    await rename(await safePath(project, `${INTERNAL}/${filename}`), destination);
    return await createOwnedLock(project, filename);
  } finally { await releaseClaim(); }
}

async function findRecoveryResult(project, args) {
  if (!args.request_id) return null;
  let names;
  try { names = await readdir(await safePath(project, `${INTERNAL}/recovery`)); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  for (const name of names) {
    let report;
    try { report = JSON.parse(await readFile(await safePath(project, `${INTERNAL}/recovery/${name}/result.json`), 'utf8')); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (report.request_id !== args.request_id) continue;
    if (report.args_digest !== hash(stable(args))) fail('E_IDEMPOTENCY_CONFLICT', 'Recovery request_id was already used for different content');
    return report;
  }
  return null;
}

export async function prepareProjectRecovery(project) {
  const snapshot = await recoverySnapshot(project);
  const guards = await recoveryGuards(project);
  snapshot.blocked.push(...guardBlockers(guards));
  return { ...snapshot, recovery_guards: guards, preview_hash: hash(stable({ ...snapshot, recovery_guards: guards })), can_apply: snapshot.blocked.length === 0 };
}

export async function applyProjectRecovery(project, args, { rebuildDerived } = {}) {
  if (!args.user_response || !args.user_response.source || !args.user_response.text) fail('E_USER_CONFIRMATION_REQUIRED', 'Explicit user confirmation is required for project recovery');
  const previous = await findRecoveryResult(project, args);
  if (previous) return { ...previous, idempotent_replay: true };
  const before = await prepareProjectRecovery(project);
  if (args.expected_revision !== undefined && args.expected_revision !== before.revision) fail('E_REVISION_CONFLICT', 'Project revision changed before recovery', { expected_revision: args.expected_revision, actual_revision: before.revision });
  if (before.preview_hash !== args.preview_hash) fail('E_RECOVERY_PREVIEW_STALE', 'Recovery inputs changed; prepare and confirm a new preview');
  if (!before.can_apply) fail('E_RECOVERY_BLOCKED', 'Recovery cannot safely modify active, unknown, or externally changed files', { blocked: before.blocked });
  let release;
  const recoveryId = randomUUID();
  const archive = `${INTERNAL}/recovery/${recoveryId}`;
  await atomicWrite(await safePath(project, `${archive}/plan.json`), json({ schema_version: 1, recovery_id: recoveryId, request_id: args.request_id ?? null, args_digest: hash(stable(args)), user_response: args.user_response, prepared_at: now(), preview: before }));
  const releaseRecovery = await claimRecoveryGuard(project, 'recovery.lock', before.recovery_guards, archive);
  const results = [];
  try {
    const replay = await findRecoveryResult(project, args);
    if (replay) return { ...replay, idempotent_replay: true };
    // The guard is our own new file; every preview input is checked again unchanged.
    const current = await recoverySnapshot(project);
    if (hash(stable({ ...current, recovery_guards: before.recovery_guards })) !== before.preview_hash) fail('E_RECOVERY_PREVIEW_STALE', 'Project changed while acquiring recovery ownership');
    if (current.lock.status === 'dead') {
      const saved = await safePath(project, `${archive}/workflow.lock`);
      await mkdir(path.dirname(saved), { recursive: true });
      await rename(await safePath(project, `${INTERNAL}/workflow.lock`), saved);
    }
    release = await acquireProjectLock(project, { recovery: true });
    for (const entry of current.transactions) {
      if (!entry.committed) {
        for (const source of [...entry.sources].reverse()) {
          if (source.action !== 'restore_original') continue;
          const target = await safePath(project, source.path, { internal: false });
          if (stable(await fingerprint(target)) !== stable(source.current)) fail('E_RECOVERY_PREVIEW_STALE', 'Source changed during recovery', { path: source.path });
          // Preserve the interrupted output before restoring/deleting a source.
          if (source.current.kind === 'file') await atomicWrite(await safePath(project, `${archive}/sources/${results.length}`), await readFile(target));
          if (source.before.kind === 'absent') await unlink(target);
          else {
            const backup = await readFile(await safePath(project, source.backup_path));
            if (hash(backup) !== source.before.sha256) fail('E_RECOVERY_PREVIEW_STALE', 'Source backup changed during recovery', { path: source.path });
            await atomicWrite(target, backup);
          }
          results.push({ path: source.path, action: 'restored_original_source' });
        }
      }
      entry.journal.status = entry.committed ? 'committed' : 'recovered';
      entry.journal.recovered_at = now();
      await atomicWrite(await safePath(project, entry.path), json(entry.journal));
    }
    for (const file of current.orphaned_files.filter(item => item.action === 'quarantine')) {
      const source = await safePath(project, file.path);
      if (stable(await fingerprint(source)) !== stable({ kind: file.kind, sha256: file.sha256, size: file.size })) fail('E_RECOVERY_PREVIEW_STALE', 'Canonical file changed during recovery', { path: file.path });
      const destination = await safePath(project, `${archive}/canonical/${file.path.slice(INTERNAL.length + 1)}`);
      await mkdir(path.dirname(destination), { recursive: true });
      await rename(source, destination);
      results.push({ path: file.path, action: 'quarantined_unreferenced_canonical', quarantine_path: relative(project, destination) });
    }
    if (rebuildDerived) await rebuildDerived();
    const reportPath = `${archive}/result.json`;
    const report = { schema_version: 1, report_path: reportPath, recovery_id: recoveryId, request_id: args.request_id ?? null, args_digest: hash(stable(args)), preview_hash: args.preview_hash, revision: before.revision, user_response: args.user_response, completed_at: now(), actions: results, history_preserved: true };
    await atomicWrite(await safePath(project, reportPath), json(report));
    return { ...report, report_path: reportPath };
  } finally {
    try { if (release) await release(); } finally { await releaseRecovery(); }
  }
}
