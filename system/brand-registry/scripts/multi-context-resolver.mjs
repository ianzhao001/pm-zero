#!/usr/bin/env node
import { parseArgs, resolveInput, runSelfTest, compactPlan } from './resolver-core.mjs';
import { resolveStagePlan, compactStagePlan } from './stage-planner.mjs';

try {
  const args = parseArgs(process.argv);
  if (args.selfTest) runSelfTest(args.routes);
  else if (args.stage) {
    const result = resolveStagePlan({
      stage: args.stage,
      context: args.context || 'none',
      profile: args.profile,
      capabilities: args.capabilities,
      providers: args.providers,
      hostCapabilities: args.hostCapabilities,
      purpose: args.purpose,
      planVersion: args.planVersion,
      manifest: args.manifest,
      contract: args.contract || undefined,
    });
    console.log(JSON.stringify(args.output === 'plan' ? compactStagePlan(result) : result, null, 2));
  }
  else if (args.input) {
    const result = resolveInput(args.input, args);
    console.log(JSON.stringify(args.output === 'plan' ? compactPlan(result) : result, null, 2));
  }
  else {
    console.error('Usage: node system/brand-registry/scripts/multi-context-resolver.mjs --input "..." [legacy route options] | --stage S1..S8 [--purpose production|review] [--capability ID] [--provider capability=skill-id] [--host-capability ID] [--context none|dewu] [--profile PROFILE] [--output full|plan] | --self-test');
    process.exit(1);
  }
} catch (error) {
  console.error(`FAIL multi-context-resolver: ${error.message}`);
  process.exit(1);
}
