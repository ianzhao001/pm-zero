import { WorkflowError } from '../system/workflow-core/lib/errors.mjs';

const detailDescriptions = {
  runtime_info: 'Summary returns package identity, workflow/skill discovery and templates. Full adds stage definitions and provider mappings; use only when inspecting those details.',
  stage_prepare: 'Summary omits duplicate file inventories; load steps and execution provenance remain usable. Full returns the complete core plan.',
};

// Presentation only: core results and their provenance hashes remain unchanged.
export function responseView(name, result, detail = 'summary') {
  if (detail === 'full') return result;
  if (name === 'runtime_info') {
    const { providers, ...catalog } = result.capability_catalog;
    return { ...result, response_detail: 'summary',
      detail_hint: 'Call runtime_info with detail: "full" for stage definitions and provider mappings.',
      supported_workflows: result.supported_workflows.map(({ stages, ...workflow }) => ({
        ...workflow, stage_ids: stages.map(stage => stage.id),
      })),
      capability_catalog: { ...catalog, provider_count: providers.length },
    };
  }
  if (name !== 'stage_prepare' || !result?.plans) return result;
  return { ...result, response_detail: 'summary', plans: result.plans.map(item => {
    const { file_hashes, required_files, selected_optional_files, skill_versions, ...plan } = item.plan;
    return { ...item, plan };
  }) };
}

export function transportSchemas(schemas) {
  return { ...schemas, ...Object.fromEntries(Object.entries(detailDescriptions).map(([name, description]) => [name, {
    ...schemas[name], properties: { ...schemas[name].properties,
      detail: { type: 'string', enum: ['summary', 'full'], default: 'summary', description },
    },
  }])) };
}

export function transportArguments(name, input) {
  const args = { ...input };
  if (!Object.hasOwn(detailDescriptions, name)) return { args, detail: 'full' };
  const detail = args.detail === undefined ? 'summary' : args.detail;
  if (!['summary', 'full'].includes(detail)) throw new WorkflowError('E_ARGS_INVALID', `Invalid ${name} detail; expected summary or full`);
  delete args.detail;
  return { args, detail };
}
