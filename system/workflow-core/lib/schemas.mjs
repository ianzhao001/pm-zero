import { STEP_OUTPUT_TYPES, STEPPED_WORKFLOW_ID, SIX_STAGE_STEPPED_WORKFLOW_ID } from './step-workflow.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const eightStageChangeRequest = require('../contracts/eight-stage-change-request-v1.schema.json');

const nonempty = { type: 'string', minLength: 1 };
const projectPath = { type: 'string', minLength: 1, description: 'Absolute user-selected project directory.' };
const revision = { type: 'integer', minimum: 0 };
const requestId = { type: 'string', minLength: 1 };
const sha256 = { type: 'string', pattern: '^[0-9a-f]{64}$' };
const stageId = { type: 'string', enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'] };
const artifactType = {
  type: 'string',
  enum: [
    'brief', 'interaction_spec', 'design_model', 'demo', 'review', 'prd',
    'goal_contract', 'requirements_scenarios', 'mrd', 'visual_direction',
    'wireframes', 'visual_design', ...STEP_OUTPUT_TYPES,
  ],
};
const artifactRef = {
  type: 'object', additionalProperties: false,
  required: ['artifact_id', 'version', 'sha256'],
  properties: { artifact_id: nonempty, version: { type: 'integer', minimum: 1 }, sha256 },
};
const userResponse = {
  type: 'object', additionalProperties: false, required: ['source', 'text'],
  properties: { source: nonempty, text: nonempty },
};
const execution = {
  type: 'object', additionalProperties: false,
  required: ['plan_id', 'plan_version', 'plan_hash', 'stage_id', 'selection', 'skills', 'capability_assignments', 'read_receipts', 'input_artifacts'],
  properties: {
    workflow_step_id: nonempty,
    plan_id: nonempty,
    plan_version: { type: 'integer', minimum: 1 },
    plan_hash: sha256,
    stage_id: stageId,
    selection: {
      type: 'object', additionalProperties: false,
      required: ['context', 'profile', 'purpose', 'capabilities', 'providers', 'host_capabilities'],
      properties: {
        context: nonempty,
        profile: nonempty,
        purpose: { type: 'string', enum: ['production', 'review'] },
        capabilities: { type: 'array', uniqueItems: true, items: nonempty },
        providers: { type: 'object' },
        host_capabilities: { type: 'array', uniqueItems: true, items: nonempty },
      },
    },
    skills: {
      type: 'array', minItems: 1, items: {
        type: 'object', additionalProperties: false, required: ['skill_id', 'version'],
        properties: { skill_id: nonempty, version: nonempty },
      },
    },
    capability_assignments: {
      type: 'array', minItems: 1, items: {
        type: 'object', additionalProperties: false, required: ['capability', 'skill_id'],
        properties: { capability: nonempty, skill_id: nonempty },
      },
    },
    read_receipts: {
      type: 'array', minItems: 1, items: {
        type: 'object', additionalProperties: false, required: ['path', 'sha256', 'context'],
        properties: { path: nonempty, sha256, context: nonempty },
      },
    },
    input_artifacts: { type: 'array', items: artifactRef },
  },
};
const workflowMetadata = {
  type: 'object', additionalProperties: false,
  required: ['open_questions', 'blockers'],
  properties: {
    target_stage: stageId,
    context: { type: 'string', pattern: '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$' },
    open_questions: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'question', 'why', 'stage_id', 'owner', 'status'],
        properties: {
          id: nonempty, question: nonempty, why: nonempty, stage_id: stageId, owner: nonempty,
          status: { type: 'string', enum: ['open', 'closed'] },
        },
      },
    },
    blockers: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'summary', 'stage_id', 'owner', 'status'],
        properties: {
          id: nonempty, summary: nonempty, stage_id: stageId, owner: nonempty,
          status: { type: 'string', enum: ['open', 'closed'] },
        },
      },
    },
  },
};
const baseProperties = { project_path: projectPath };
const mutationProperties = {
  ...baseProperties,
  expected_revision: revision,
  request_id: requestId,
};
const candidateId = { type: 'string', pattern: '^cand-[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 128 };

const brief = {
  type: 'object', additionalProperties: false,
  required: ['target_user', 'core_problem', 'scenario', 'scope', 'non_goals', 'success_criteria', 'key_assumptions', 'open_questions'],
  properties: {
    target_user: nonempty, core_problem: nonempty, scenario: nonempty, scope: nonempty, non_goals: nonempty,
    success_criteria: { type: 'array', minItems: 1, items: nonempty },
    key_assumptions: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'claim', 'grade', 'source', 'supports_gate'],
        properties: {
          id: nonempty, claim: nonempty, source: nonempty,
          grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E'] },
          supports_gate: { type: 'boolean' },
          evidence_refs: { type: 'array', items: nonempty },
        },
      },
    },
    open_questions: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'question', 'why', 'blocks_gate', 'owner', 'status'],
        properties: {
          id: nonempty, question: nonempty, why: nonempty,
          blocks_gate: { enum: ['G1', 'G2', 'G3', 'G4', null] }, owner: nonempty,
          status: { type: 'string', enum: ['open', 'closed'] },
        },
      },
    },
  },
};

const change = {
  type: eightStageChangeRequest.type,
  additionalProperties: eightStageChangeRequest.additionalProperties,
  required: eightStageChangeRequest.required.filter((field) => field !== 'scope' && field !== 'entry_artifact'),
  properties: eightStageChangeRequest.properties,
};

const mappingEntry = {
  type: 'object', additionalProperties: false, required: ['id', 'locator'],
  properties: { id: { type: 'string', pattern: '^(SC|EL)-[A-Z0-9]+(-[A-Z0-9]+)*$' }, locator: nonempty },
};
const renderManifest = {
  type: 'object', additionalProperties: false,
  required: ['schema_version', 'renderer_id', 'renderer_version', 'input_design_model_hash', 'outputs', 'screen_mapping', 'element_mapping', 'changed_ids', 'declared_scope', 'validation', 'g3_capable'],
  properties: {
    schema_version: { const: 1 }, renderer_id: nonempty, renderer_version: nonempty,
    input_design_model_hash: sha256,
    change_id: { type: 'string', pattern: '^chg-[0-9]{4,}$' },
    outputs: { type: 'array', minItems: 1, items: nonempty },
    screen_mapping: { type: 'array', items: mappingEntry },
    element_mapping: { type: 'array', items: mappingEntry },
    changed_ids: { type: 'array', uniqueItems: true, items: { type: 'string', pattern: '^(SC|EL)-[A-Z0-9]+(-[A-Z0-9]+)*$' } },
    declared_scope: {
      type: 'object', additionalProperties: false, required: ['target_ids', 'preserve_ids'],
      properties: { target_ids: { type: 'array', items: nonempty }, preserve_ids: { type: 'array', items: nonempty } },
    },
    validation: {
      type: 'object', additionalProperties: false, required: ['preflight', 'rendered_layout'],
      properties: {
        preflight: { type: 'string', enum: ['pass', 'fail', 'skipped'] },
        rendered_layout: { type: 'string', enum: ['pass', 'fail', 'skipped'] },
        screenshots: { type: 'array', items: nonempty },
      },
    },
    degraded_semantics: { type: 'array', items: nonempty },
    g3_capable: { type: 'boolean' },
  },
};

export const toolSchemas = Object.freeze({
  project_diagnose: {
    type: 'object', additionalProperties: false, required: ['project_path'], properties: baseProperties,
  },
  project_recovery_prepare: {
    type: 'object', additionalProperties: false, required: ['project_path'], properties: baseProperties,
  },
  project_recovery_apply: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'expected_revision', 'request_id', 'preview_hash', 'user_response'],
    properties: { ...mutationProperties, preview_hash: sha256, user_response: userResponse },
  },
  candidate_create: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'expected_revision', 'request_id', 'candidate_id', 'artifact'],
    properties: { ...mutationProperties, candidate_id: candidateId, artifact: artifactRef, source_root: nonempty },
  },
  candidate_read: {
    type: 'object', additionalProperties: false, required: ['project_path'],
    properties: { ...baseProperties, candidate_id: candidateId },
  },
  candidate_preview: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'candidate_id', 'change', 'expected_artifacts'],
    properties: { ...baseProperties, candidate_id: candidateId, change, expected_artifacts: { type: 'array', items: artifactRef } },
  },
  candidate_accept: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'expected_revision', 'request_id', 'candidate_id', 'change', 'expected_artifacts', 'preview_hash', 'user_response', 'producer_id'],
    properties: { ...mutationProperties, candidate_id: candidateId, change,
      expected_artifacts: { type: 'array', items: artifactRef }, preview_hash: sha256,
      user_response: userResponse, producer_id: nonempty },
  },
  candidate_discard: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'expected_revision', 'request_id', 'candidate_id', 'user_response'],
    properties: { ...mutationProperties, candidate_id: candidateId, user_response: userResponse },
  },
  runtime_info: {
    type: 'object', additionalProperties: false,
    properties: {},
  },
  stage_prepare: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'expected_revision', 'host_capabilities'],
    properties: {
      ...baseProperties,
      expected_revision: revision,
      context: { type: 'string', pattern: '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$' },
      host_capabilities: { type: 'array', uniqueItems: true, items: nonempty },
      capabilities: { type: 'array', uniqueItems: true, items: nonempty },
      providers: { type: 'object' },
      intent: { type: 'string', enum: ['advance', 'revise'] },
      plan_version: { type: 'integer', minimum: 1 },
    },
  },
  project_open: {
    type: 'object', additionalProperties: false, required: ['project_path'],
    properties: {
      ...baseProperties, create: { type: 'boolean' },
      project_id: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
      project_name: nonempty, request_id: requestId,
      context: { type: 'string', pattern: '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$' },
      step_template: { type: 'object', additionalProperties: false, required: ['project_type', 'depth'], properties: {
        project_type: { type: 'string', enum: ['new_product', 'iteration', 'feature'] },
        depth: { type: 'string', enum: ['lean', 'standard', 'full'] },
      } },
      workflow_id: { type: 'string', enum: ['legacy-four-gate-v1', 'product-design-eight-stage-v1', STEPPED_WORKFLOW_ID, 'product-design-six-stage-v1', SIX_STAGE_STEPPED_WORKFLOW_ID] },
    },
    allOf: [{ if: { properties: { create: { const: true } }, required: ['create'] }, then: { required: ['project_id'] } }],
  },
  project_read: {
    type: 'object', additionalProperties: false, required: ['project_path'],
    properties: {
      ...baseProperties,
      view: { type: 'string', enum: ['resume', 'detail'] },
      detail: {
        type: 'object', additionalProperties: false, required: ['type', 'id'],
        properties: {
          type: { type: 'string', enum: ['brief', 'decision', 'artifact', 'gate', 'change', 'index'] },
          id: nonempty,
          version: { type: 'integer', minimum: 1 },
        },
      },
    },
    allOf: [{
      if: { properties: { view: { const: 'detail' } }, required: ['view'] },
      then: { required: ['detail'] },
    }],
  },
  brief_save: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'expected_revision', 'request_id', 'brief'],
    properties: { ...mutationProperties, brief },
  },
  decision_record: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'expected_revision', 'request_id', 'decision'],
    properties: {
      ...mutationProperties,
      decision: {
        type: 'object', additionalProperties: false,
        required: ['decision_id', 'question', 'selected_option', 'rejected_options', 'rationale', 'user_response'],
        properties: {
          decision_id: nonempty, question: nonempty, selected_option: nonempty,
          rejected_options: {
            type: 'array', minItems: 1, items: {
              type: 'object', additionalProperties: false, required: ['option', 'reason'],
              properties: { option: nonempty, reason: nonempty },
            },
          },
          rationale: nonempty, user_response: userResponse,
          supersedes_decision_ids: { type: 'array', minItems: 1, uniqueItems: true, items: nonempty },
        },
      },
    },
  },
  step_select: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'expected_revision', 'request_id', 'workflow_step_id', 'user_response'],
    properties: { ...mutationProperties, workflow_step_id: nonempty, user_response: userResponse },
  },
  step_confirm: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'expected_revision', 'request_id', 'workflow_step_id', 'artifacts', 'user_response'],
    properties: { ...mutationProperties, workflow_step_id: nonempty, artifacts: { type: 'array', minItems: 1, items: artifactRef }, user_response: userResponse },
  },
  artifact_register: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'expected_revision', 'request_id', 'artifact_id', 'type', 'files', 'dependencies'],
    properties: {
      ...mutationProperties,
      artifact_id: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
      type: artifactType,
      workflow_step_id: nonempty,
      files: {
        type: 'array', minItems: 1, items: {
          type: 'object', additionalProperties: false, required: ['path'],
          properties: { path: nonempty, role: nonempty },
        },
      },
      dependencies: { type: 'array', items: artifactRef },
      producer_id: nonempty,
      execution,
      metadata: workflowMetadata,
      exploration: { type: 'boolean' },
      change_id: { type: 'string', pattern: '^chg-[0-9]{4,}$' },
      review: {
        type: 'object', additionalProperties: false,
        required: ['reviewer_id', 'perspective', 'subject', 'findings'],
        properties: {
          reviewer_id: nonempty, perspective: nonempty, subject: artifactRef,
          findings: {
            type: 'array', items: {
              type: 'object', additionalProperties: false,
              required: ['id', 'severity', 'summary', 'status'],
              properties: {
                id: nonempty, severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'note'] },
                summary: nonempty, status: { type: 'string', enum: ['open', 'resolved'] },
              },
            },
          },
        },
      },
      render_manifest: renderManifest,
      verification_evidence: {
        type: 'array', items: {
          type: 'object', additionalProperties: false,
          required: ['evidence_id', 'reviewer_id', 'method', 'source_path', 'sha256'],
          properties: {
            evidence_id: nonempty, reviewer_id: nonempty, method: nonempty,
            source_path: nonempty, sha256,
          },
        },
      },
    },
    allOf: [
      { if: { properties: { type: { const: 'review' } }, required: ['type'] }, then: { required: ['review'] } },
      { if: { properties: { type: { const: 'demo' } }, required: ['type'] }, then: { required: ['render_manifest'] } },
    ],
  },
  change_prepare: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'change', 'expected_artifacts'],
    properties: { ...baseProperties, change, expected_artifacts: { type: 'array', items: artifactRef } },
  },
  change_apply: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'expected_revision', 'request_id', 'change', 'expected_artifacts', 'preview_hash'],
    properties: { ...mutationProperties, user_response: userResponse, change, expected_artifacts: { type: 'array', items: artifactRef }, preview_hash: sha256 },
  },
  gate_confirm: {
    type: 'object', additionalProperties: false,
    required: ['project_path', 'expected_revision', 'request_id', 'gate', 'review_artifact_ids', 'user_response'],
    properties: {
      ...mutationProperties,
      gate: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'] },
      review_artifact_ids: { type: 'array', uniqueItems: true, items: nonempty },
      user_response: userResponse,
      caveats: { type: 'array', items: nonempty },
    },
  },
});
