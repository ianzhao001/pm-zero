import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { jsonSchemaErrors } from './validate.mjs';

const POLICY_VERSION = 2;
const SCHEMA = JSON.parse(readFileSync(new URL('../contracts/validation-report.schema.json', import.meta.url), 'utf8'));
const pluginRequire = createRequire(new URL('../../../plugins/pm-zero/package.json', import.meta.url));
let parserPromise;

function parse5() {
  parserPromise ??= import(pathToFileURL(pluginRequire.resolve('parse5')).href);
  return parserPromise;
}

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const same = (a, b) => stable(a) === stable(b);
const sorted = (values) => [...values].sort();
const result = (status, reason, extra = {}) => ({ status, policy_version: POLICY_VERSION, reason, ...extra });
const pending = (reason, extra) => result('pending', reason, extra);
const failed = (reason, extra) => result('failed', reason, extra);

function outputBinding(files) {
  return files.map((file) => ({ path: file.source_path, sha256: file.sha256 })).sort((a, b) => a.path.localeCompare(b.path));
}

async function snapshot(project, file) {
  const bytes = await readFile(path.join(project, file.snapshot_path));
  return sha(bytes) === file.sha256 ? bytes : null;
}

function attributes(node) {
  return Object.fromEntries((node.attrs ?? []).map((attr) => [attr.prefix ? `${attr.prefix}:${attr.name}` : attr.name, attr.value]));
}

function children(node) {
  // Template content is inert. Scripts and styles are checked by full-file hashes
  // and the independent scope report, not by an HTML subtree attribution claim.
  if (['template', 'script', 'style'].includes(node.tagName)) return [];
  return node.childNodes ?? [];
}

function inspectDom(document, page, found, problems, parentScreen = null) {
  for (const node of children(document)) {
    if (node.nodeName === '#comment') continue;
    if (['template', 'script', 'style'].includes(node.tagName)) continue;
    const attr = attributes(node);
    const screenId = attr['data-screen-id'];
    const elementId = attr['data-element-id'];
    if (screenId && (!/^SC-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(screenId) || elementId)) problems.push(`invalid screen identity at ${page}`);
    if (elementId && !/^EL-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(elementId)) problems.push(`wrong-kind element identity ${elementId} at ${page}`);
    if (screenId) {
      if (parentScreen) problems.push(`nested screen ${screenId} at ${page}`);
      if (found.has(screenId)) problems.push(`duplicate stable ID ${screenId}`);
      else found.set(screenId, { kind: 'screen', page, node, screen: screenId });
    }
    if (elementId) {
      if (!parentScreen && !screenId) problems.push(`element ${elementId} has no owning screen at ${page}`);
      if (found.has(elementId)) problems.push(`duplicate stable ID ${elementId}`);
      else found.set(elementId, { kind: 'element', page, node, screen: screenId ?? parentScreen });
    }
    inspectDom(node, page, found, problems, screenId ?? parentScreen);
  }
}

function locator(entry, kind) {
  const attr = kind === 'screen' ? 'data-screen-id' : 'data-element-id';
  const match = /^\[\s*(data-(?:screen|element)-id)\s*=\s*(["'])(.*?)\2\s*\]$/.exec(entry.locator.trim());
  if (!match) return 'unsupported';
  return match[1] === attr && match[3] === entry.id ? 'match' : 'mismatch';
}

function canonical(node, masks, root = false) {
  if (node.nodeName === '#comment') return null;
  const attr = attributes(node);
  const id = attr['data-screen-id'] ?? attr['data-element-id'];
  if (!root && id && masks.has(id)) return ['masked', id];
  if (node.nodeName === '#text') return ['text', node.value];
  const own = Object.entries(attr).sort(([a], [b]) => a.localeCompare(b));
  const kids = children(node).map((child) => canonical(child, masks)).filter((item) => item !== null);
  return [node.namespaceURI ?? null, node.tagName ?? node.nodeName, own, kids];
}

function normalizedPage(document, masks) {
  return JSON.stringify(canonical(document, masks));
}

async function domPages(project, files, parse) {
  const pages = new Map();
  const found = new Map();
  const problems = [];
  for (const file of files.filter((item) => /\.html?$/i.test(item.source_path))) {
    const bytes = await snapshot(project, file);
    if (!bytes) return { error: `snapshot hash mismatch: ${file.source_path}` };
    const document = parse(bytes.toString('utf8'));
    pages.set(file.source_path, document);
    inspectDom(document, file.source_path, found, problems);
  }
  return { pages, found, problems };
}

function validateMapping(manifest, dom, model) {
  const problems = [...dom.problems];
  const mapping = [
    ...(manifest.screen_mapping ?? []).map((entry) => ({ ...entry, kind: 'screen' })),
    ...(manifest.element_mapping ?? []).map((entry) => ({ ...entry, kind: 'element' })),
  ];
  if (!mapping.length) problems.push('No stable-ID mapping is available');
  const ids = new Set();
  let unsupported = false;
  for (const entry of mapping) {
    if (ids.has(entry.id)) problems.push(`duplicate manifest mapping ${entry.id}`);
    ids.add(entry.id);
    const actual = dom.found.get(entry.id);
    if (!actual) problems.push(`mapped ID absent from rendered DOM: ${entry.id}`);
    else if (actual.kind !== entry.kind) problems.push(`wrong-kind mapping ${entry.id}`);
    const match = locator(entry, entry.kind);
    if (match === 'unsupported') unsupported = true;
    if (match === 'mismatch') problems.push(`locator mismatch for ${entry.id}`);
  }
  for (const id of dom.found.keys()) if (!ids.has(id)) problems.push(`unmapped rendered ID ${id}`);
  if (model) {
    const screenIds = sorted(model.screens.map((item) => item.screen_id));
    const elementIds = sorted(model.elements.map((item) => item.element_id));
    if (!same(screenIds, sorted(manifest.screen_mapping.map((item) => item.id)))) problems.push('screen mapping differs from design model');
    if (!same(elementIds, sorted(manifest.element_mapping.map((item) => item.id)))) problems.push('element mapping differs from design model');
    const owners = new Map(model.elements.map((item) => [item.element_id, item.screen_id]));
    for (const [id, expected] of owners) {
      if (dom.found.get(id)?.screen !== expected) problems.push(`wrong page/screen ownership for ${id}`);
    }
  }
  return { problems, unsupported };
}

async function designModel(project, state, manifest) {
  const artifact = Object.values(state.artifacts ?? {}).find((item) => item.type === 'design_model' && item.sha256 === manifest.input_design_model_hash);
  if (!artifact) return null;
  const file = artifact.files?.[0];
  if (!file) return null;
  const bytes = await snapshot(project, file);
  return bytes ? JSON.parse(bytes.toString('utf8')) : null;
}

function reportErrors(report) {
  const errors = jsonSchemaErrors(report, SCHEMA);
  if (errors.length) return errors;
  const baseline = report?.baseline;
  if (baseline !== null && (!baseline || typeof baseline !== 'object' || Array.isArray(baseline) ||
    !Object.keys(baseline).sort().every((key, i) => ['artifact_id', 'sha256', 'version'][i] === key) ||
    typeof baseline.artifact_id !== 'string' || !baseline.artifact_id ||
    !Number.isInteger(baseline.version) || baseline.version < 1 || !/^[0-9a-f]{64}$/.test(baseline.sha256 ?? ''))) {
    errors.push('invalid baseline');
  }
  if (report?.environment?.trim?.() === '') errors.push('environment is blank');
  if (report?.run_id?.trim?.() === '') errors.push('run_id is blank');
  if (report?.checker?.id?.trim?.() === '') errors.push('checker.id is blank');
  if (report?.checker?.version?.trim?.() === '') errors.push('checker.version is blank');
  if (new Set(report?.checks?.map((item) => item.id)).size !== report?.checks?.length) errors.push('duplicate check id');
  return errors;
}

function checkReport(report, evidence, manifest, outputFiles, baseline, producerId) {
  const errors = reportErrors(report);
  if (errors.length) return failed('Invalid independent validation report', { errors, evidence_id: evidence.evidence_id });
  if (report.checker.id !== evidence.reviewer_id || [manifest.renderer_id, producerId].filter(Boolean).includes(report.checker.id)) {
    return failed('Verifier identity conflicts with renderer, producer, or bound reviewer', { evidence_id: evidence.evidence_id });
  }
  if (!same([...report.subject.outputs].sort((a, b) => a.path.localeCompare(b.path)), outputBinding(outputFiles)) ||
      report.subject.design_model_hash !== manifest.input_design_model_hash) {
    return failed('Validation subject does not bind the complete output snapshots and design model', { evidence_id: evidence.evidence_id });
  }
  const expectedBaseline = baseline ? { artifact_id: baseline.artifact_id, version: baseline.version, sha256: baseline.sha256 } : null;
  if (!same(report.baseline, expectedBaseline) || (manifest.change_id ?? null) !== (report.change_id ?? null)) {
    return failed('Validation baseline or change ID does not match the registered render', { evidence_id: evidence.evidence_id });
  }
  if (report.status !== 'pass' || report.checks.some((item) => item.status === 'fail')) {
    return failed('Independent validation report contains a failure', { evidence_id: evidence.evidence_id });
  }
  const required = ['stable_mapping', 'rendered_layout', 'interaction', ...(baseline ? ['scope_preservation'] : [])];
  for (const id of required) {
    if (report.checks.find((item) => item.id === id)?.status !== 'pass') return pending(`Required independent check is missing or skipped: ${id}`, { evidence_id: evidence.evidence_id });
  }
  return null;
}

/** Verify a snapshotted demo without trusting renderer assertions as independent evidence. */
export async function verifyRender(project, state, files, manifest, evidence = [], options = {}) {
  if (!manifest?.g3_capable || manifest.validation?.preflight !== 'pass' || manifest.validation?.rendered_layout !== 'pass') {
    return pending('Renderer validation is incomplete or G3 capability is false');
  }
  const outputs = files.filter((file) => file.role !== 'independent-verification');
  if (!same(sorted(outputs.map((file) => file.source_path)), sorted(manifest.outputs ?? [])) ||
      new Set(outputs.map((file) => file.source_path)).size !== outputs.length) {
    return pending('Declared outputs must exactly match every non-evidence file snapshot');
  }
  if (!outputs.some((file) => /\.html?$/i.test(file.source_path))) return pending('No independently inspectable HTML output');
  for (const file of outputs) if (!(await snapshot(project, file))) return failed(`Output snapshot hash mismatch: ${file.source_path}`);

  const parse = (await parse5()).parse;
  const currentDom = await domPages(project, outputs, parse);
  if (currentDom.error) return failed(currentDom.error);
  const mapping = validateMapping(manifest, currentDom, await designModel(project, state, manifest));
  if (mapping.problems.length) return failed('Stable DOM mapping is invalid', { errors: mapping.problems });
  if (mapping.unsupported) return pending('One or more mapping locators cannot be checked by the static HTML parser');

  const priorDemo = Object.values(state.artifacts ?? {}).find((item) => item.type === 'demo');
  const requiredChange = priorDemo?.stale_change_id ?? priorDemo?.change_id;
  if (requiredChange && manifest.change_id !== requiredChange) return failed('Render must retain the applied change scope of its predecessor');
  let baseline = null;
  let changedFiles = [];
  if (manifest.change_id) {
    const applied = state.changes?.find((item) => item.change.change_id === manifest.change_id);
    if (!applied) return pending('Render references an unapplied change');
    const frozen = applied.change;
    if (!same(sorted(manifest.declared_scope.target_ids), sorted(frozen.target_ids)) ||
        !same(sorted(manifest.declared_scope.preserve_ids), sorted(frozen.preserve_ids))) {
      return failed('Renderer scope differs from the frozen change scope');
    }
    const artifactScope = frozen.scope === 'artifact';
    if (!artifactScope && manifest.changed_ids.some((id) => !frozen.target_ids.includes(id))) return failed('Renderer changed IDs exceed the frozen target scope');
    const frozenBaseline = applied.verification_baselines?.find(ref => ref.artifact_id === priorDemo?.artifact_id);
    if (!frozenBaseline) return pending('Applied change has no frozen verification baseline; prepare and apply a fresh change');
    baseline = (state.artifact_history?.[frozenBaseline.artifact_id] ?? []).find(item => item.version === frozenBaseline.version && item.sha256 === frozenBaseline.sha256);
    if (!baseline && priorDemo?.version === frozenBaseline.version && priorDemo.sha256 === frozenBaseline.sha256) baseline = priorDemo;
    if (!baseline?.render_manifest?.outputs || !baseline.files) return pending('No prior demo baseline exists');
    const priorOutputs = baseline.files.filter((file) => file.role !== 'independent-verification');
    if (!same(sorted(priorOutputs.map((file) => file.source_path)), sorted(baseline.render_manifest.outputs)) ||
        !same(sorted(priorOutputs.map((file) => file.source_path)), sorted(outputs.map((file) => file.source_path)))) {
      return pending('Baseline and current output file sets differ');
    }
    const priorHashes = new Map(priorOutputs.map((file) => [file.source_path, file.sha256]));
    changedFiles = outputs.filter((file) => priorHashes.get(file.source_path) !== file.sha256).map((file) => file.source_path);
    if (!changedFiles.length && manifest.changed_ids.length) return failed('Changed target IDs declared but output bytes did not change');
    if (changedFiles.length && !manifest.changed_ids.length) return failed('Output bytes changed without any declared target ID');
    const priorDom = await domPages(project, priorOutputs, parse);
    if (priorDom.error) return failed(priorDom.error);
    const priorMapping = validateMapping(baseline.render_manifest, priorDom, null);
    if (priorMapping.problems.length) return failed('Baseline DOM mapping is invalid', { errors: priorMapping.problems });
    if (manifest.changed_ids.some(id => !priorDom.found.has(id) && !currentDom.found.has(id))) return failed('Changed IDs are not present in either output version');
    const masks = new Set(artifactScope ? [] : frozen.target_ids);
    if (!artifactScope) for (const page of currentDom.pages.keys()) {
      if (!same(normalizedPage(currentDom.pages.get(page), masks), normalizedPage(priorDom.pages.get(page), masks))) {
        return failed('HTML structure, text, or attributes changed outside the authorized targets', { page });
      }
    }
    for (const id of artifactScope ? new Set([...priorDom.found.keys(), ...currentDom.found.keys()]) : frozen.target_ids) {
      const before = priorDom.found.get(id);
      const after = currentDom.found.get(id);
      if (!before || !after) {
        if (!artifactScope || !manifest.changed_ids.includes(id)) return failed(`Authorized target identity is absent or undeclared: ${id}`);
        continue;
      }
      if (!same(canonical(before.node, masks, true), canonical(after.node, masks, true)) &&
          !manifest.changed_ids.includes(id)) return failed(`DOM changed at undeclared target: ${id}`);
    }
    for (const id of frozen.preserve_ids) {
      const before = priorDom.found.get(id);
      const after = currentDom.found.get(id);
      if (!before || !after || before.kind !== after.kind || before.page !== after.page || before.screen !== after.screen) {
        return failed(`Preserved identity or ownership changed: ${id}`);
      }
      if (!same(canonical(before.node, masks, true), canonical(after.node, masks, true))) return failed(`Preserved DOM content changed: ${id}`);
    }
  }

  if (!evidence.length) return pending('Bound independent policy-v2 validation report is missing');
  const reports = [];
  const evidenceIds = new Set();
  const runIds = new Set();
  let legacy = false;
  let incompleteReport;
  for (const item of evidence) {
    if (evidenceIds.has(item.evidence_id)) return failed(`Duplicate evidence ID: ${item.evidence_id}`);
    evidenceIds.add(item.evidence_id);
    const file = files.find((candidate) => candidate.source_path === item.source_path && candidate.role === 'independent-verification');
    if (!file || file.sha256 !== item.sha256) return failed('Supplied evidence is not bound to an independent-verification snapshot', { evidence_id: item.evidence_id });
    const bytes = await snapshot(project, file);
    if (!bytes) return failed('Evidence snapshot hash mismatch', { evidence_id: item.evidence_id });
    let report;
    try { report = JSON.parse(bytes.toString('utf8')); } catch { return failed('Independent validation report is not JSON', { evidence_id: item.evidence_id }); }
    if (report?.policy_version !== POLICY_VERSION) { legacy = true; continue; }
    const conflict = checkReport(report, item, manifest, outputs, baseline, options.producerId);
    if (conflict?.status === 'failed') return conflict;
    if (conflict) incompleteReport ??= conflict;
    if (baseline) {
      if (!Array.isArray(report.changed_ids) || !Array.isArray(report.preserved_ids) ||
          !same(sorted(report.changed_ids), sorted(manifest.changed_ids)) ||
          !same(sorted(report.preserved_ids), sorted(manifest.declared_scope.preserve_ids))) {
        return failed('Report changed/preserved IDs do not match the frozen scope', { evidence_id: item.evidence_id });
      }
    } else if (report.changed_ids?.length || report.preserved_ids?.length) {
      return failed('Initial render report must not declare changed/preserved IDs', { evidence_id: item.evidence_id });
    }
    if (runIds.has(report.run_id)) return failed(`Duplicate validation run ID: ${report.run_id}`);
    runIds.add(report.run_id);
    reports.push(report);
  }
  if (incompleteReport) return incompleteReport;
  if (legacy && reports.length) return failed('Mixed legacy and policy-v2 validation reports conflict');
  if (legacy) return pending('Only legacy validation evidence was supplied');
  if (!reports.length) return pending('Bound independent policy-v2 validation report is missing');
  return result('verified', 'Independent policy-v2 validation passed', {
    method: 'snapshot-bound-independent-validation',
    evidence_ids: [...evidenceIds], run_ids: [...runIds], changed_files: changedFiles,
  });
}

/** Treat persisted pre-policy verification as pending without mutating the artifact. */
export function effectiveVerification(artifact) {
  const verification = artifact?.verification;
  if (artifact?.type === 'demo' && verification?.policy_version === POLICY_VERSION &&
      ['verified', 'failed', 'pending'].includes(verification.status)) return verification;
  return pending('Legacy or missing policy-v2 verification');
}
