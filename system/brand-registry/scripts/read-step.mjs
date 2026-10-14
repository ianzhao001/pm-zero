import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));

// Instructions were returned; assets were byte-verified and their hashes returned.
// Neither proves understanding or execution. Use fresh context IDs after handoff.
export function readLoadStep(plan, { stepIndex, contextId, priorReceipts = [], root: requestedRoot }) {
  if (!contextId || typeof contextId !== 'string') throw new Error('contextId is required');
  const step = plan.load_steps?.[stepIndex];
  if (!Number.isInteger(stepIndex) || !step || !String(plan.resolution).startsWith('routed') || plan.errors?.length || plan.optional_budget_status !== 'pass') throw new Error('load plan is not executable');
  const previous = new Map(priorReceipts.filter(receipt => receipt.context_id === contextId)
    .flatMap(receipt => receipt.files.filter(file => file.status === 'emitted' || file.status === 'reused').map(file => [file.path, file.sha256])));
  const metadata = Object.assign({}, ...plan.load_steps.map(item => item.file_metadata));
  const files = [...new Set([...step.required_files, ...step.selected_optional_files, ...step.retained_context_files, ...(step.retained_required_files || [])])];
  const texts = [];
  const readRoot = requestedRoot ? fs.realpathSync(requestedRoot) : root;
  const receipt = { context_id: contextId, route_id: plan.route_id, plan_id: plan.plan_id || null,
    plan_version: plan.plan_version || null, stage_id: plan.stage_id || null,
    step: stepIndex, files: [], emitted_chars: 0, reused_chars: 0 };
  for (const file of files) {
    if (typeof file !== 'string' || path.isAbsolute(file) || file.split(/[\\/]/).includes('..')) throw new Error(`unsafe instruction path: ${file}`);
    const absolute = fs.realpathSync(path.join(readRoot, file));
    if (!absolute.startsWith(`${readRoot}${path.sep}`)) throw new Error(`unsafe instruction path: ${file}`);
    const bytes = fs.readFileSync(absolute);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (!metadata[file] || hash !== metadata[file].sha256) throw new Error(`instruction changed; resolve again: ${file}`);
    const status = previous.get(file) === hash ? 'reused' : 'emitted';
    const text = bytes.toString('utf8');
    receipt.files.push({ path: file, sha256: hash, status });
    receipt[`${status}_chars`] += text.length;
    if (status === 'emitted') texts.push({ path: file, text });
  }
  for (const file of step.asset_files || []) {
    if (typeof file !== 'string' || path.isAbsolute(file) || file.split(/[\\/]/).includes('..')) throw new Error(`unsafe asset path: ${file}`);
    if (metadata[file]?.catalog_id) {
      let partPath = readRoot;
      for (const part of file.split('/')) {
        partPath = path.join(partPath, part);
        if (fs.lstatSync(partPath).isSymbolicLink()) throw new Error(`catalog asset symlink is forbidden: ${file}`);
      }
    }
    const absolute = fs.realpathSync(path.join(readRoot, file));
    if (!absolute.startsWith(`${readRoot}${path.sep}`)) throw new Error(`unsafe asset path: ${file}`);
    const hash = createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
    if (!metadata[file] || hash !== metadata[file].sha256) throw new Error(`asset changed; resolve again: ${file}`);
    receipt.files.push({ path: file, sha256: hash, status: 'asset_verified', kind: 'asset',
      ...(metadata[file].catalog_id ? { ...(metadata[file].asset_id ? { asset_id: metadata[file].asset_id } : {}),
        catalog_id: metadata[file].catalog_id, catalog_version: metadata[file].catalog_version,
        origin: 'preset' } : {}) });
  }
  return { texts, receipt, asset_files: step.asset_files };
}
