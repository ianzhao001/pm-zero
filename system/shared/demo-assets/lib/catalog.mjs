import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const scopes = new Set(['public', 'private-mirror']);
const mediaTypes = new Map([['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'], ['.svg', 'image/svg+xml'], ['.avif', 'image/avif']]);
const hexHash = /^[a-f0-9]{64}$/;
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const mebibyte = 1024 * 1024;
const budgetBytes = { public: 12 * mebibyte, 'private-mirror': 8 * mebibyte };

function fail(message) { throw new Error(`asset catalog: ${message}`); }
function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function validSemver(value) {
  const match = typeof value === 'string' && value.match(semver);
  return Boolean(match && (!match[4] || match[4].split('.').every(part => !/^\d+$/.test(part) || !/^0\d/.test(part))));
}
function plain(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function relativeFile(value, label) {
  if (typeof value !== 'string' || !value || value.includes('\\') || path.isAbsolute(value)
    || value.split('/').some(part => !part || part === '.' || part === '..')) fail(`unsafe ${label}: ${value}`);
  return value;
}
function inside(root, absolute) { return absolute.startsWith(`${root}${path.sep}`); }
function regularPath(root, relative, label) {
  relativeFile(relative, label);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); } catch { fail(`missing ${label}: ${relative}`); }
    if (stat.isSymbolicLink()) fail(`symlink ${label}: ${relative}`);
  }
  const absolute = path.resolve(root, relative);
  if (!inside(root, absolute) || !fs.statSync(absolute).isFile()) fail(`invalid ${label}: ${relative}`);
  return absolute;
}
function knownSourceHashes(root, contextIds) {
  const hashes = new Set();
  for (const brand of contextIds) {
    for (const name of ['source-manifest.json', 'frame-index.json']) {
      const file = path.join(root, '_workspace/reference-assets', brand, name);
      if (!fs.existsSync(file)) continue;
      const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const key of ['files', 'derived_files', 'frames']) {
        for (const item of evidence[key] || []) if (hexHash.test(item.sha256 || '')) hashes.add(item.sha256);
      }
    }
  }
  return hashes;
}

/** Synchronous validation keeps route and stage plans bound to the exact source bytes. */
export function loadAssetCatalogs({ root = defaultRoot, manifest, context = 'none' } = {}) {
  const workspaceRoot = fs.realpathSync(path.resolve(root));
  const registration = manifest || JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'pm-zero.manifest.json'), 'utf8'));
  const contextSkills = new Map((registration.entries?.skills || []).filter(skill => skill.kind === 'context-pack').map(skill => [skill.id, skill]));
  if (context !== 'none' && !contextSkills.has(context)) fail(`unregistered context ${context}`);
  const declared = registration.asset_catalogs || [];
  if (!Array.isArray(declared)) fail('asset_catalogs must be an array');
  const sourceHashes = knownSourceHashes(workspaceRoot, contextSkills.keys());
  const catalogs = [];
  const entries = [];
  const seenCatalogs = new Set();
  const seenAssets = new Set();
  for (const item of declared) {
    if (!plain(item) || typeof item.id !== 'string' || seenCatalogs.has(item.id)) fail(`duplicate or invalid catalog id ${item?.id}`);
    seenCatalogs.add(item.id);
    const brand = item.context === null ? 'common' : item.context;
    if (brand !== 'common' && !contextSkills.has(brand)) fail(`unregistered catalog context ${item.context}`);
    const contextPath = brand === 'common' ? null : relativeFile(String(contextSkills.get(brand).path || '').replace(/\/$/, ''), `context root ${brand}`);
    const expectedPath = brand === 'common' ? 'system/shared/demo-assets/catalog.json' : `${contextPath}/assets/catalog.json`;
    if (item.path !== expectedPath) fail(`catalog ${item.id} must use ${expectedPath}`);
    if (!scopes.has(item.publish_scope) || (brand === 'common' ? item.publish_scope !== 'public' : item.publish_scope !== 'private-mirror')) {
      fail(`invalid publish scope for ${item.id}`);
    }
    // Validate every registration before selecting a context; a broken inactive catalog cannot silently pass packaging.
    const catalogFile = regularPath(workspaceRoot, item.path, 'catalog path');
    const catalogBytes = fs.readFileSync(catalogFile);
    const catalogHash = hash(catalogBytes);
    const catalog = JSON.parse(catalogBytes.toString('utf8'));
    if (!plain(catalog) || catalog.schema_version !== 1 || catalog.id !== item.id || catalog.context !== item.context
      || catalog.publish_scope !== item.publish_scope || !validSemver(catalog.version) || !Array.isArray(catalog.assets)) {
      fail(`registration mismatch or invalid catalog ${item.id}`);
    }
    if (brand !== 'common' && brand !== context) continue;
    const directory = path.posix.dirname(item.path);
    // The budget counts image/vector bytes plus sample-data bytes; the index JSON itself is excluded.
    const limit = budgetBytes[item.publish_scope];
    let inventoryBytes = 0;
    let sample_data;
    if (catalog.sample_data !== undefined) {
      if (!plain(catalog.sample_data) || !Number.isSafeInteger(catalog.sample_data.bytes)
        || catalog.sample_data.bytes <= 0 || !hexHash.test(catalog.sample_data.sha256 || '')
        || !String(catalog.sample_data.file || '').endsWith('.json')) fail(`invalid sample data for ${item.id}`);
      relativeFile(catalog.sample_data.file, `sample data ${item.id}`);
      inventoryBytes += catalog.sample_data.bytes;
      if (inventoryBytes > limit) fail(`catalog ${item.id} exceeds ${limit} byte inventory budget`);
      const relativePath = path.posix.join(directory, catalog.sample_data.file);
      const absolutePath = regularPath(workspaceRoot, relativePath, `sample data ${item.id}`);
      const bytes = fs.readFileSync(absolutePath);
      if (bytes.length !== catalog.sample_data.bytes || hash(bytes) !== catalog.sample_data.sha256) fail(`sample data hash mismatch for ${item.id}`);
      JSON.parse(bytes.toString('utf8'));
      sample_data = { ...catalog.sample_data, absolutePath, relativePath };
    }
    for (const asset of catalog.assets) {
      if (!plain(asset) || typeof asset.id !== 'string' || !asset.id.startsWith(`${brand}:`) || seenAssets.has(asset.id)) {
        fail(`invalid or duplicate asset id ${asset?.id}`);
      }
      seenAssets.add(asset.id);
      relativeFile(asset.file, `asset file ${asset.id}`);
      if (asset.file.split('/').some(part => ['_sources', 'raw', 'frames', 'capture'].includes(part))) fail(`source evidence path is forbidden: ${asset.file}`);
      const ext = path.extname(asset.file).toLowerCase();
      if (!mediaTypes.has(ext) || mediaTypes.get(ext) !== asset.media_type) fail(`invalid media type for ${asset.id}`);
      if (!Number.isSafeInteger(asset.width) || asset.width <= 0 || !Number.isSafeInteger(asset.height) || asset.height <= 0
        || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 || !hexHash.test(asset.sha256 || '')
        || asset.redistribution !== 'approved' || !Array.isArray(asset.tags) || asset.tags.some(tag => typeof tag !== 'string' || !tag)
        || !plain(asset.source) || !['licensed', 'original-vector'].includes(asset.source.kind)
        || [asset.source.url, asset.source.author, asset.source.license, asset.source.license_url]
          .some(value => typeof value !== 'string' || !value.trim())) {
        fail(`invalid metadata for ${asset.id}`);
      }
      if (sourceHashes.has(asset.sha256)) fail(`known source evidence is forbidden: ${asset.id}`);
      inventoryBytes += asset.bytes;
      if (inventoryBytes > limit) fail(`catalog ${item.id} exceeds ${limit} byte inventory budget`);
      const relativePath = path.posix.join(directory, asset.file);
      const absolutePath = regularPath(workspaceRoot, relativePath, `asset ${asset.id}`);
      const bytes = fs.readFileSync(absolutePath);
      if (bytes.length !== asset.bytes || hash(bytes) !== asset.sha256) fail(`hash or byte count mismatch for ${asset.id}`);
      entries.push({ ...asset, catalog_id: item.id, catalog_path: item.path, absolutePath,
        relativePath, publish_scope: item.publish_scope, context: item.context,
        catalog_version: catalog.version, catalog_sha256: catalogHash });
    }
    catalogs.push({ ...catalog, ...(sample_data ? { sample_data } : {}), catalog_path: item.path,
      catalog_sha256: catalogHash, inventory_bytes: inventoryBytes, budget_bytes: limit });
  }
  return { catalogs, entries };
}

/** Copy selected registered bytes into a demo output without network access. */
export function materializeAssets({ root = defaultRoot, manifest, context = 'none', ids = [], outputDir } = {}) {
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) fail('ids must be a string array');
  if (typeof outputDir !== 'string' || !outputDir) fail('outputDir is required');
  const { entries } = loadAssetCatalogs({ root, manifest, context });
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const missing_ids = [...new Set(ids)].filter(id => !byId.has(id));
  const selected = [...new Set(ids)].map(id => byId.get(id)).filter(Boolean);
  const absoluteOutput = path.resolve(outputDir);
  // Reject symlinks even in a pre-existing output parent chain.
  let ancestor = absoluteOutput;
  while (ancestor !== path.dirname(ancestor)) {
    if (!['/var', '/tmp'].includes(ancestor) && fs.existsSync(ancestor) && fs.lstatSync(ancestor).isSymbolicLink()) fail(`symlink output path: ${ancestor}`);
    ancestor = path.dirname(ancestor);
  }
  fs.mkdirSync(absoluteOutput, { recursive: true });
  const assets = [];
  let asset_bytes = 0;
  for (const entry of selected) {
    const ext = path.extname(entry.file).toLowerCase();
    const relative = `assets/${entry.id.replace(/[^a-z0-9-]+/gi, '-')}-${entry.sha256.slice(0, 12)}${ext}`;
    const destination = path.join(absoluteOutput, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.lstatSync(path.dirname(destination)).isSymbolicLink()) fail(`symlink output path: ${path.dirname(destination)}`);
    if (fs.existsSync(destination)) {
      if (fs.lstatSync(destination).isSymbolicLink() || !fs.statSync(destination).isFile()
        || hash(fs.readFileSync(destination)) !== entry.sha256) fail(`refusing to overwrite different asset: ${relative}`);
    } else {
      const bytes = fs.readFileSync(entry.absolutePath);
      if (hash(bytes) !== entry.sha256) fail(`asset changed before copy: ${entry.id}`);
      fs.writeFileSync(destination, bytes, { flag: 'wx' });
    }
    assets.push({ id: entry.id, file: relative, sha256: entry.sha256, catalog_id: entry.catalog_id,
      catalog_version: entry.catalog_version, catalog_sha256: entry.catalog_sha256,
      origin: 'preset', source: entry.source, relevance: entry.tags.join(', ') || 'registered demo asset' });
    asset_bytes += entry.bytes;
  }
  return { assets, missing_ids, asset_bytes };
}
