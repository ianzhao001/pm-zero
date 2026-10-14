import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { jsonSchemaErrors } from '../../system/workflow-core/lib/validate.mjs';
import { verifyPackageInventory, writePackageInventory } from '../../system/workflow-core/lib/package-integrity.mjs';
import { resolveStagePlan } from '../../system/brand-registry/scripts/stage-planner.mjs';
import { compileStepDefinition, compileSixStageStepDefinition, templateCatalog } from '../../system/workflow-core/lib/step-workflow.mjs';
import { readLoadStep } from '../../system/brand-registry/scripts/read-step.mjs';

const sourceRoot = path.resolve(import.meta.dirname, '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const unique = values => [...new Set(values)];
const chars = value => Array.from(value).length;
export const artifacts = ['goal_contract', 'requirements_scenarios', 'mrd', 'visual_direction', 'wireframes', 'interaction_spec', 'design_model', 'visual_design', 'demo'];
const stageForArtifact = { goal_contract: 'S1', requirements_scenarios: 'S2', mrd: 'S3', visual_direction: 'S4', wireframes: 'S5', interaction_spec: 'S6', design_model: 'S6', visual_design: 'S7', demo: 'S8' };
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const exists = async file => { try { await lstat(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
const inside = (root, target) => target === root || target.startsWith(`${root}${path.sep}`);

function safePath(file) {
  if (typeof file !== 'string' || !file || file.includes('\\') || /[\x00-\x1f:]/.test(file)
    || path.posix.isAbsolute(file) || file.split('/').some(part => !part || part === '..' || part.startsWith('.'))
    || /(^|\/)(?:node_modules|cache|tests?|research|inventory.json|build-info.json)(\/|$)/i.test(file)
    || /(?:^|\/)(?:credentials|secrets?)(?:\.|\/|$)/i.test(file)
    || /\.(?:pem|key|p12|pfx)$/i.test(file)) throw new Error(`Unsafe or non-runtime pack path: ${file}`);
  return file;
}

async function regularFile(root, file) {
  safePath(file);
  let current = root;
  const parts = file.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    const info = await lstat(current);
    if (info.isSymbolicLink() || (i === parts.length - 1 ? !info.isFile() : !info.isDirectory())) {
      throw new Error(`Pack paths must be regular files with no symlinks: ${file}`);
    }
  }
  return current;
}

function skillEntry(text, id) {
  if (chars(text) > 3500 || text.trimEnd().split('\n').length > 60) throw new Error(`SKILL entry exceeds 3500 characters / 60 lines: ${id}`);
  // Intentionally small interoperable frontmatter surface; metadata remains discovery-only.
  const match = text.match(/^---\r?\nname: ([a-z0-9-]+)\r?\ndescription: ([^\r\n]+)\r?\n---(?:\r?\n|$)/);
  if (!match || !match[2].trim() || match[1] !== id || chars(match[2]) > 1024) throw new Error(`SKILL frontmatter must contain only name: ${id} and a one-line description (<=1024 characters)`);
}

export async function readBrandPack(directory) {
  const root = await realpath(directory);
  const manifestFile = await regularFile(root, 'brand-pack.json');
  const bytes = await readFile(manifestFile);
  const pack = JSON.parse(bytes);
  const schema = JSON.parse(await readFile(path.join(import.meta.dirname, 'schema.json'), 'utf8'));
  const errors = jsonSchemaErrors(pack, schema);
  if (errors.length) throw new Error(`Invalid brand pack:\n${errors.join('\n')}`);
  if (pack.id === 'none' || pack.id.length > 40) throw new Error('Brand id must not be none and must be <=40 characters');
  const ids = [pack.id, ...pack.providers.map(p => p.id)];
  if (new Set(ids).size !== ids.length || new Set(pack.providers.map(p => p.replaces)).size !== pack.providers.length) throw new Error('Duplicate provider id or replacement');
  for (const p of pack.providers) if (!p.id.startsWith(`${pack.id}-`) || p.id.length > 64) throw new Error(`Provider id must be namespaced with ${pack.id}- and <=64 characters`);
  if (unique(pack.files.map(file => file.toLowerCase())).length !== pack.files.length) throw new Error('Pack file paths collide on case-insensitive filesystems');
  const files = new Map();
  for (const file of pack.files) {
    const absolute = await regularFile(root, file);
    const data = await readFile(absolute);
    files.set(file, { path: file, sha256: sha(data), executable: Boolean((await lstat(absolute)).mode & 0o111), bytes: data });
  }
  if (files.has('brand-pack.json')) throw new Error('brand-pack.json is metadata, not a runtime file');
  validateResources(pack, files, false);

  const inventory = [...files.values()].map(({ bytes: unused, ...item }) => item).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const digest = sha(JSON.stringify({ manifest_sha256: sha(bytes), files: inventory }));
  return { root, pack, files, digest, inventory, manifestBytes: bytes };
}

function validateResources(pack, files, complete) {
  const textFor = file => {
    if (!files.has(file)) throw new Error(`Undeclared runtime file: ${file}`);
    try { return new TextDecoder('utf-8', { fatal: true }).decode(files.get(file).bytes); }
    catch { throw new Error(`Prompt resource must be UTF-8 text: ${file}`); }
  };
  const entries = [...(pack.context.entrypoint ? [{ id: pack.id, entrypoint: pack.context.entrypoint }] : []), ...pack.providers];
  const entrypoints = entries.map(p => p.entrypoint);
  const promptFiles = unique([...entrypoints, ...Object.values(pack.context.artifacts ?? {}).flatMap(record => record.required_files), ...pack.providers.flatMap(p => p.required_files)]);
  const assetFiles = unique(Object.values(pack.context.artifacts ?? {}).flatMap(record => record.asset_files));
  if (assetFiles.some(file => promptFiles.includes(file))) throw new Error('Resolved files cannot overlap prompt and asset roles');
  if (unique(entrypoints).length !== entrypoints.length) throw new Error('Each context/provider needs its own SKILL entrypoint');
  for (const { id, entrypoint } of entries) {
    if (entrypoint !== 'SKILL.md' && !entrypoint.endsWith('/SKILL.md')) throw new Error(`Entrypoint must end in /SKILL.md: ${entrypoint}`);
    if (complete || files.has(entrypoint)) skillEntry(textFor(entrypoint), id);
  }
  if (pack.context.entrypoint && pack.context.entrypoint !== 'SKILL.md') throw new Error('Context entrypoint must be SKILL.md at pack root');
  for (const p of pack.providers) if (p.entrypoint !== `providers/${p.id}/SKILL.md`) throw new Error(`Provider entrypoint must be providers/${p.id}/SKILL.md`);
  if (complete) {
    const discoveryChars = entries.reduce((total, item) => {
      const text = textFor(item.entrypoint);
      const frontmatter = text.slice(0, text.indexOf('\n---', 4) + 4);
      return total + chars(frontmatter) + chars(deployedPath(pack, item.entrypoint));
    }, 0);
    if (discoveryChars > 2048) throw new Error(`Brand discovery metadata exceeds 2048 characters: ${discoveryChars}`);
  }
  if (complete && (!pack.context.entrypoint || artifacts.some(key => !pack.context.artifacts?.[key]))) throw new Error('Resolved brand must declare an entrypoint and all nine artifact resource maps');
  if (pack.files.some(file => path.basename(file).toLowerCase() === 'skill.md' && !entrypoints.includes(file))) throw new Error('Undeclared nested SKILL.md');
  for (const [artifact, resources] of Object.entries(pack.context.artifacts ?? {})) {
    const promptFiles = unique([...(pack.context.entrypoint ? [pack.context.entrypoint] : []), ...resources.required_files]);
    if (resources.asset_files.some(file => promptFiles.includes(file))) throw new Error(`Prompt and asset overlap: ${artifact}`);
    if (promptFiles.filter(file => complete || files.has(file)).reduce((n, file) => n + chars(textFor(file)), 0) > 6000) throw new Error(`Brand prompt exceeds 6000 characters: ${artifact}`);
    for (const file of resources.asset_files) if (complete && !files.has(file)) throw new Error(`Undeclared asset: ${file}`);
  }
  for (const p of pack.providers) {
    if (unique([p.entrypoint, ...p.required_files]).filter(file => complete || files.has(file)).reduce((n, file) => n + chars(textFor(file)), 0) > 6000) throw new Error(`Provider prompt exceeds 6000 characters: ${p.id}`);
  }
}

// Public defaults and private overrides use the same portable API. An artifact
// resource record is atomic: replace it instead of concatenating conflicting rules.
export async function loadBrandLayers(privateDirectory, publicDirectory) {
  if (!privateDirectory && !publicDirectory) throw new Error('At least one brand source is required');
  const privateLayer = privateDirectory ? await readBrandPack(privateDirectory) : null;
  const publicLayer = publicDirectory ? await readBrandPack(publicDirectory) : null;
  if (publicLayer && privateLayer && publicLayer.pack.id !== privateLayer.pack.id) throw new Error('Public and private brand ids must match; one brand per deployment');
  const layers = [publicLayer && { ...publicLayer, layer: 'public' }, privateLayer && { ...privateLayer, layer: 'private' }].filter(Boolean);
  const providers = new Map();
  const files = new Map();
  const overrides = { files: [], artifacts: [], providers: [] };
  for (const layer of layers) {
    for (const [file, item] of layer.files) {
      if (files.has(file)) overrides.files.push(file);
      files.set(file, { ...item, layer: layer.layer });
    }
    for (const provider of layer.pack.providers) {
      if (providers.has(provider.replaces)) overrides.providers.push(provider.replaces);
      providers.set(provider.replaces, provider);
    }
  }
  for (const key of Object.keys(privateLayer?.pack.context.artifacts ?? {})) if (publicLayer?.pack.context.artifacts?.[key]) overrides.artifacts.push(key);
  const pack = { ...(privateLayer ?? publicLayer).pack, files: [...files.keys()], providers: [...providers.values()],
    context: { ...publicLayer?.pack.context, ...privateLayer?.pack.context,
      artifacts: { ...publicLayer?.pack.context.artifacts, ...privateLayer?.pack.context.artifacts } } };
  // Do not expose an overridden public Skill as an undeclared discoverable entry.
  const selectedEntries = new Set([pack.context.entrypoint, ...pack.providers.map(p => p.entrypoint)]);
  for (const file of files.keys()) if (path.basename(file).toLowerCase() === 'skill.md' && !selectedEntries.has(file)) files.delete(file);
  pack.files = [...files.keys()];
  if (unique(pack.files.map(file => file.toLowerCase())).length !== pack.files.length) throw new Error('Layered file paths collide on case-insensitive filesystems');
  const ids = [pack.id, ...pack.providers.map(p => p.id)];
  if (unique(ids).length !== ids.length) throw new Error('Resolved provider ids collide');
  validateResources(pack, files, true);
  const origins = layers.map(layer => ({ layer: layer.layer, id: layer.pack.id, version: layer.pack.version, content_sha256: layer.digest }));
  const inventory = [...files.values()].map(({ bytes: unused, ...item }) => item).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const digest = sha(JSON.stringify({ layers: origins, manifest: pack, files: inventory }));
  return { pack, files, digest, inventory, layers: origins, overrides };
}

function deployedPath(pack, file) {
  const provider = pack.providers.find(p => file.startsWith(`providers/${p.id}/`));
  return provider ? `skills/${provider.id}/${file.slice(`providers/${provider.id}/`.length)}` : `skills/${pack.id}/${file}`;
}

export function composeManifest(base, loaded) {
  const { pack } = loaded;
  const manifest = structuredClone(base);
  if (manifest.brand_pack_api !== 1) throw new Error('Base does not support brand pack API v1; rebuild or upgrade the neutral base');
  const skills = manifest.entries.skills;
  if (skills.some(skill => skill.kind === 'context-pack' || skill.stage_provider?.contexts?.length)) throw new Error('Compose requires a neutral base; rebuild without --context or --brand-pack');
  if (manifest.local_brand_pack) throw new Error('Compose requires an uncomposed neutral base');
  const names = new Set(skills.map(skill => skill.id));
  for (const id of [pack.id, ...pack.providers.map(p => p.id)]) if (names.has(id)) throw new Error(`Brand/provider id collides with base: ${id}`);
  const prefix = `skills/${pack.id}/`;
  const map = files => files.map(file => deployedPath(pack, file));
  const stages = {};
  for (const artifact of artifacts) {
    const key = stageForArtifact[artifact];
    const before = stages[key] ?? { required_files: [], asset_files: [] };
    const resources = pack.context.artifacts[artifact];
    stages[key] = { required_files: unique([...before.required_files, ...map(resources.required_files)]), asset_files: unique([...before.asset_files, ...map(resources.asset_files)]) };
  }
  const extra = pack.providers.map(p => {
    const original = skills.find(skill => skill.id === p.replaces);
    if (!original?.stage_provider || original.kind !== 'workflow') throw new Error(`Unknown base stage provider: ${p.replaces}`);
    const provider = structuredClone(original.stage_provider);
    // Replacement is deliberately scoped: neutral projects still use the original.
    original.stage_provider.contexts = ['none'];
    const shared = provider.required_files.filter(file => file.startsWith('system/'));
    return { ...structuredClone(original), id: p.id, discovery_name: p.id, path: `skills/${p.id}/`,
      version: pack.version, owner: pack.id, publish_scope: 'local-only',
      stage_provider: { ...provider, contexts: [pack.id], entrypoint: deployedPath(pack, p.entrypoint),
        required_files: unique([...shared, ...map(p.required_files)]), optional_files: {},
        asset_files: map(pack.files.filter(file => file.startsWith(`providers/${p.id}/`) && file !== p.entrypoint && !p.required_files.includes(file))) } };
  });
  const allIds = [...skills.map(skill => skill.id), pack.id, ...extra.map(skill => skill.id)];
  for (const skill of [...skills, ...extra]) {
    const compatibleExtras = pack.providers.filter(p => (skill.composes_with ?? []).includes(p.replaces)).map(p => p.id);
    skill.composes_with = unique([...(skill.composes_with ?? []), pack.id, ...compatibleExtras]).filter(id => id !== skill.id);
  }
  skills.push({ id: pack.id, discovery_name: pack.id, path: prefix, version: pack.version, owner: pack.id, lifecycle: 'active', required: false,
    publish_scope: 'local-only', kind: 'context-pack', runtime_targets: ['codex', 'claude'], install_profiles: ['pm-zero-agent'],
    composes_with: allIds.filter(id => id !== pack.id), mutually_exclusive_with: [], namespace: pack.id.toUpperCase(), trigger: [pack.id], legacy_mode_aliases: [],
    stage_context: { entrypoint: `${prefix}${pack.context.entrypoint}`, stages, artifact_stages: stageForArtifact } }, ...extra);
  manifest.installation_profiles['pm-zero-agent'].skill_ids.push(pack.id, ...extra.map(skill => skill.id));
  manifest.local_brand_pack = { api: 1, id: pack.id, version: pack.version, content_sha256: loaded.digest, providers: extra.map(skill => skill.id), scope: 'local-only' };
  return manifest;
}

export async function applyBrandPack(root, directory, publicDirectory) {
  const loaded = await loadBrandLayers(directory, publicDirectory);
  const manifest = composeManifest(JSON.parse(await readFile(path.join(root, 'pm-zero.manifest.json'), 'utf8')), loaded);
  const target = path.join(root, 'skills', loaded.pack.id);
  if (await exists(target)) throw new Error(`Brand directory collision: ${loaded.pack.id}`);
  for (const file of loaded.files.values()) {
    const destination = path.join(root, deployedPath(loaded.pack, file.path));
    await mkdir(path.dirname(destination), { recursive: true });
    // Write the exact bytes validated above; never recopy a mutable source tree.
    await writeFile(destination, file.bytes, { mode: file.executable ? 0o700 : 0o600, flag: 'wx' });
  }
  await writeFile(path.join(root, 'pm-zero.manifest.json'), json(manifest));
  await writeFile(path.join(root, 'local-brand-pack.lock.json'), json({ ...manifest.local_brand_pack, layers: loaded.layers, overrides: loaded.overrides, files: loaded.inventory.map(file => ({ ...file, deployed_path: deployedPath(loaded.pack, file.path) })) }));
  const validation = await validateBrandDeployment(root, loaded.pack.id);
  return { ...manifest.local_brand_pack, layers: loaded.layers, overrides: loaded.overrides, validation };
}

export async function validateBrandDeployment(root, context) {
  let stagePlans = 0, stepPlans = 0;
  function verify(definition, stage, purpose, workflowStepId) {
    const plan = resolveStagePlan({ root, definition, stage: stage.id, workflowStepId, context, purpose, hostCapabilities: ['browser', 'independent-review'] });
    if (plan.resolution !== 'routed_stage' || plan.errors.length || plan.optional_budget_status !== 'pass') throw new Error(`Brand composition failed ${definition.workflow_id}/${stage.id}/${workflowStepId ?? purpose}: ${JSON.stringify(plan.errors)} (${plan.resolution}, ${plan.optional_budget_status})`);
    const receipts = [];
    for (let i = 0; i < plan.load_steps.length; i++) {
      const read = readLoadStep(plan, { root, stepIndex: i, contextId: `brand-check-${plan.plan_id}-${plan.load_steps[i].session_scope}`, priorReceipts: receipts });
      receipts.push(read.receipt);
    }
  }
  for (const flow of ['six', 'eight']) {
    const definition = JSON.parse(await readFile(path.join(root, `system/workflow-core/contracts/product-design-${flow}-stage-v1.json`), 'utf8'));
    for (const stage of definition.stages) {
      for (const purpose of ['production', ...(stage.reviewers ? ['review'] : [])]) {
        verify(definition, stage, purpose);
        stagePlans++;
      }
    }
    for (const template of templateCatalog()) {
      const compiled = flow === 'six' ? compileSixStageStepDefinition(definition, template) : compileStepDefinition(definition, template);
      for (const stage of compiled.stages) for (const step of stage.steps) {
        verify(compiled, stage, step.purpose, step.id);
        stepPlans++;
      }
    }
  }
  return { stage_plans: stagePlans, step_plans: stepPlans, status: 'passed', boundary: 'Static planning, budgets and byte receipts with declared host capabilities; no plugin code or real host task executed.' };
}

export async function assertLocalDestination(destination, sources = []) {
  const absolute = path.resolve(destination);
  if (await exists(absolute)) throw new Error(`Refusing to overwrite existing destination: ${absolute}`);
  // Resolve existing ancestors before creating anything, including paths through directory symlinks.
  let ancestor = path.dirname(absolute);
  const suffix = [path.basename(absolute)];
  while (!(await exists(ancestor))) { suffix.unshift(path.basename(ancestor)); ancestor = path.dirname(ancestor); }
  const canonical = path.join(await realpath(ancestor), ...suffix);
  for (const source of sources) if (inside(await realpath(source), canonical)) throw new Error('Destination must be outside the base and brand source');
  if (inside(sourceRoot, canonical) && !inside(path.join(sourceRoot, '.pm-zero-local'), canonical)) throw new Error('Repository outputs must stay under ignored .pm-zero-local/ or outside the repository');
  return canonical;
}

export async function installBrandPack({ base, pack, publicPack, destination }) {
  const baseRoot = await realpath(base);
  const packRoot = pack ? await realpath(pack) : undefined;
  const target = await assertLocalDestination(destination, [baseRoot, ...(packRoot ? [packRoot] : []), ...(publicPack ? [publicPack] : [])]);
  const integrity = await verifyPackageInventory(baseRoot);
  if (integrity.build.package_context !== 'none') throw new Error('Private brand installation requires a neutral base');
  // Validate before copying dependencies or creating the final output.
  composeManifest(JSON.parse(await readFile(path.join(baseRoot, 'pm-zero.manifest.json'), 'utf8')), await loadBrandLayers(packRoot, publicPack));
  await mkdir(path.dirname(target), { recursive: true });
  const staging = await mkdtemp(path.join(path.dirname(target), '.pm-zero-compose-'));
  try {
    await cp(baseRoot, staging, { recursive: true, verbatimSymlinks: true });
    const copied = await verifyPackageInventory(staging);
    if (copied.build.content_sha256 !== integrity.build.content_sha256) throw new Error('Base changed during installation');
    const identity = await applyBrandPack(staging, packRoot, publicPack);
    await rm(path.join(staging, 'inventory.json'));
    await rm(path.join(staging, 'build-info.json'));
    await writePackageInventory(staging, { context: identity.id, source: integrity.build.source, brandPack: identity });
    if (await exists(target)) throw new Error(`Destination appeared during install: ${target}`);
    await rename(staging, target);
    return { destination: target, brand_pack: identity };
  } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
}

export async function checkBrandPack({ pack, base, publicPack }) {
  const loaded = await loadBrandLayers(pack, publicPack);
  const result = { id: loaded.pack.id, version: loaded.pack.version, content_sha256: loaded.digest, declared_files: loaded.files.size };
  if (!base) return { ...result, status: 'structure-passed', deployment: 'not_checked; use --base for stage compatibility' };
  const temporary = await mkdtemp(path.join(tmpdir(), 'pm-zero-brand-check-'));
  try {
    const installed = await installBrandPack({ base, pack, publicPack, destination: path.join(temporary, 'deployment') });
    return { ...result, ...installed.brand_pack.validation };
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

export async function initBrandPack(destination, id) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id) || id === 'none' || id.length > 40) throw new Error('Choose a lowercase hyphenated brand id (<=40 characters, not none)');
  const target = await assertLocalDestination(destination);
  const resources = Object.fromEntries(artifacts.map(artifact => [artifact, { required_files: ['context/rules.md'], asset_files: [] }]));
  const pack = { schema_version: 1, core_api: 1, id, version: '0.1.0', files: ['SKILL.md', 'context/rules.md'], context: { entrypoint: 'SKILL.md', artifacts: resources }, providers: [] };
  await mkdir(path.dirname(target), { recursive: true });
  const staging = await mkdtemp(path.join(path.dirname(target), '.pm-zero-brand-init-'));
  try {
    await mkdir(path.join(staging, 'context'));
    await writeFile(path.join(staging, 'brand-pack.json'), json(pack));
    await writeFile(path.join(staging, 'SKILL.md'), `---\nname: ${id}\ndescription: Dependency-only ${id} brand context. Load only when the project explicitly selects this brand; never as a standalone workflow.\n---\n\n# ${id}\n\nRead only stage_prepare load_steps; use readLoadStep from system/brand-registry/scripts/read-step.mjs for verified text and asset receipts. Shared execution, review and confirmation contracts remain authoritative.\n`);
    await writeFile(path.join(staging, 'context/rules.md'), '# Local brand rules\n\nReplace this example with approved terminology and evidence-backed brand constraints. Split by artifact when it grows. Do not store credentials.\n');
    await writeFile(path.join(staging, '.gitignore'), '*\n!.gitignore\n');
    await rename(staging, target);
  } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
  return { destination: target, id, next: 'Edit brand-pack.json and rules, then check with --base before installation.' };
}
