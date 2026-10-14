import { fail } from './errors.mjs';

export const STEPPED_WORKFLOW_ID = 'product-design-stepped-v1';

const PROJECT_TYPES = {
  new_product: {
    name: '新产品', baseline: 'opportunity_brief',
    instructions: '识别新产品的目标用户、机会和待验证假设；尚无依据的判断明确标记为假设。',
    sections: ['目标用户与机会', '已有依据与待验证假设'],
  },
  iteration: {
    name: '已有产品迭代', baseline: 'iteration_baseline',
    instructions: '梳理已有产品的现状、已知问题和保留约束，区分现有行为与本次变化；缺失基线需明确列出。',
    sections: ['现状与已知问题', '变更目标与保留约束'],
  },
  feature: {
    name: '局部功能', baseline: 'feature_baseline',
    instructions: '明确宿主产品、局部功能边界及与周边功能的接口，不将局部需求扩展为整产品重建。',
    sections: ['宿主产品与功能边界', '上下游接口与保留约束'],
  },
};
const DEPTHS = {
  lean: { name: '精简', count: 2 },
  standard: { name: '标准', count: 3 },
  full: { name: '完整', count: 4 },
};

// These are product steps. Skill load_steps remain a separate execution concern.
const PREPARATION = {
  S1: [
    { name: '项目背景', output: null, capabilities: ['goal-clarification'], sections: [], instructions: '建立当前项目的背景基线。' },
    { name: '目标与约束', output: 'goal_constraints', capabilities: ['goal-clarification'], sections: ['目标与非目标', '约束与开放问题'], instructions: '把目标、非目标和约束分开，记录会影响交付的开放问题。' },
    { name: '范围与成功标准', output: 'delivery_boundaries', capabilities: ['delivery-planning'], sections: ['交付范围与终点', '成功标准与验收依据'], instructions: '明确交付终点、范围边界和可检查的成功标准。' },
  ],
  S2: [
    { name: '用户与问题', output: 'user_problem_inventory', capabilities: ['needs-discovery'], sections: ['用户与问题清单', '事实依据与假设'], instructions: '整理用户问题及其依据，区分观察事实与尚待确认的需求判断。' },
    { name: '场景分析', output: 'scenario_inventory', capabilities: ['scenario-analysis'], sections: ['触发条件与使用场景', '目标与主要障碍'], instructions: '逐个说明场景的触发条件、用户目标和主要障碍。' },
    { name: '证据与需求映射', output: 'requirement_evidence_map', capabilities: ['needs-discovery', 'scenario-analysis'], sections: ['问题场景与需求映射', '证据缺口与优先问题'], instructions: '把候选需求追溯到问题、场景与证据，显式保留证据缺口。' },
  ],
  S3: [
    { name: '业务模型', output: 'business_model', capabilities: ['business-modeling'], sections: ['业务参与方与价值', '业务流程与关键假设'], instructions: '描述参与方、价值与业务流程，明确模型成立所依赖的假设。' },
    { name: '范围与优先级', output: 'scope_priorities', capabilities: ['scope-definition'], sections: ['范围与优先级', '取舍理由与非目标'], instructions: '说明范围、优先级及取舍依据，保留不做事项。' },
    { name: '替代方案与风险', output: 'mrd_alternatives', capabilities: ['business-modeling', 'scope-definition'], sections: ['备选方案与比较', '主要风险与处理建议'], instructions: '比较备选方案并记录风险，给出可追溯的范围建议。' },
  ],
  S4: [
    { name: '设计方向候选', output: 'direction_candidates', capabilities: ['visual-direction'], sections: ['方向候选与参考', '适配依据与约束'], instructions: '给出有依据的方向候选，说明适配目标和约束；参考材料必须标注来源。' },
    { name: '方向选择依据', output: 'direction_rationale', capabilities: ['visual-direction'], sections: ['方向比较与建议', '保留项与排除项'], instructions: '比较方向并说明建议，保留被否方案和原因。' },
    { name: '字体与配色', output: 'typography_palette', capabilities: ['color-typography'], sections: ['字体与排版层级', '配色与使用规则'], instructions: '明确字体层级、色彩角色和使用规则，保持已确认方向。' },
  ],
  S5: [
    { name: '信息架构', output: 'information_architecture', capabilities: ['information-architecture'], sections: ['信息分组与导航', '关键任务路径'], instructions: '组织信息分组、导航和任务路径，追溯到已确认 MRD。' },
    { name: '页面范围', output: 'screen_inventory', capabilities: ['information-architecture', 'wireframing'], sections: ['页面清单与职责', '页面关系与边界'], instructions: '列出所需页面及各自职责，明确页面关系与不包含范围。' },
    { name: '线框规划', output: 'wireframe_plan', capabilities: ['wireframing'], sections: ['页面区域与内容层级', '线框约束与检查清单'], instructions: '明确页面区域和内容层级，为线框输出建立可检查的约束。' },
  ],
  S6: [
    { name: '操作流程', output: 'interaction_flows', capabilities: ['interaction-design'], sections: ['操作流程与触发条件', '输入输出与反馈'], instructions: '逐个记录主要操作的触发、输入、输出和反馈。' },
    { name: '状态与异常', output: 'state_inventory', capabilities: ['state-modeling'], sections: ['状态与转换条件', '异常与恢复路径'], instructions: '定义状态、转换条件、异常及恢复路径，避免只描述成功路径。' },
    { name: '交互边界核对', output: 'interaction_boundaries', capabilities: ['interaction-design', 'state-modeling'], sections: ['交互规则与边界条件', '模型映射与遗漏检查'], instructions: '核对边界条件和交互规则，准备交互稿到结构化设计模型的映射。' },
  ],
  S7: [
    { name: '组件与样式规范', output: 'component_style_spec', capabilities: ['design-system-application'], sections: ['组件与状态样式', '规范继承与差异'], instructions: '明确组件及状态样式，记录继承的规范和必要差异。' },
    { name: '页面视觉规划', output: 'page_visual_plan', capabilities: ['interface-visual-design'], sections: ['页面视觉层级', '组件布局与响应规则'], instructions: '把视觉方向、线框与交互规则映射到页面层级和布局。' },
    { name: '视觉一致性清单', output: 'visual_consistency_checklist', capabilities: ['interface-visual-design', 'design-system-application'], sections: ['视觉一致性检查项', '重点页面与风险'], instructions: '形成视觉一致性检查清单，标出重点页面与尚需检查的风险。' },
  ],
  S8: [
    { name: '实现与验证清单', output: 'implementation_plan', capabilities: ['demo-implementation'], sections: ['实现范围与依赖', '验证清单与验收依据'], instructions: '将已确认设计转为实现范围和验证清单；计划本身不构成浏览器验证证据。' },
    { name: '实现单元与映射', output: 'implementation_units', capabilities: ['demo-implementation'], sections: ['实现单元与职责', '设计映射与集成顺序'], instructions: '规划实现单元及其职责，维护到设计模型的映射与集成顺序。' },
    { name: '验证场景规划', output: 'demo_validation_plan', capabilities: ['demo-implementation'], sections: ['验证场景与预期行为', '证据采集与交付清单'], instructions: '规划浏览器验证场景、预期行为和证据采集；不得把计划标为已经验证。' },
  ],
};

const FINAL_SECTIONS = {
  S1: ['目标与约束', '交付范围与验收标准'],
  S2: ['需求与场景', '依据与开放问题'],
  S3: ['业务模型与范围', '需求优先级与验收标准'],
  S4: ['选定方向与依据', '字体配色与使用规范'],
  S5: ['页面与导航', '线框与关键内容'],
  S6: ['操作流程与状态', '交互规则与设计模型'],
  S7: ['视觉稿与组件', '状态样式与规范对应'],
  S8: ['实现范围与运行方式', '验证证据与交付说明'],
};

export const STEP_OUTPUT_TYPES = Object.freeze([
  ...Object.values(PROJECT_TYPES).map(project => project.baseline),
  ...Object.values(PREPARATION).flatMap(steps => steps.map(step => step.output).filter(Boolean)),
]);

export function templateCatalog() {
  return Object.entries(PROJECT_TYPES).flatMap(([project_type, project]) => Object.entries(DEPTHS).map(([depth, level]) => ({
    id: `${project_type}-${depth}`,
    template_id: `${project_type}-${depth}`,
    version: 1,
    project_type,
    depth,
    name: `${project.name} · ${level.name}`,
    description: `${project.instructions} 每阶段 ${level.count} 个生产步骤，必要独立审查和阶段确认保持不变。`,
  })));
}

const unique = values => [...new Set(values)];

/** Compile once at project creation; callers persist the result as an immutable snapshot. */
export function compileStepDefinition(baseDefinition, selection) {
  const projectType = selection?.project_type;
  const depth = selection?.depth;
  if (!Object.hasOwn(PROJECT_TYPES, projectType ?? '') || !Object.hasOwn(DEPTHS, depth ?? '')) {
    fail('E_STEP_TEMPLATE_INVALID', 'Select a supported project_type and depth', { project_type: projectType ?? null, depth: depth ?? null });
  }
  const expectedStages = Object.keys(PREPARATION);
  if (!baseDefinition || !Array.isArray(baseDefinition.stages)
      || baseDefinition.stages.map(stage => stage.id).join(',') !== expectedStages.join(',')
      || !baseDefinition.artifact_dependencies) {
    fail('E_STEP_TEMPLATE_INVALID', 'A complete ordered eight-stage base definition is required');
  }
  const definition = structuredClone(baseDefinition);
  const project = PROJECT_TYPES[projectType];
  const template = templateCatalog().find(item => item.project_type === projectType && item.depth === depth);
  definition.workflow_id = STEPPED_WORKFLOW_ID;
  definition.version = 1;
  definition.description = 'User-selected product steps with independent artifacts and version confirmations; stage gates and reviews remain mandatory.';
  definition.step_template = template;

  for (const stage of definition.stages) {
    const providerType = stage.artifacts[0];
    const stageInputs = unique(stage.artifacts.flatMap(type => baseDefinition.artifact_dependencies[type] ?? []))
      .filter(type => !stage.artifacts.includes(type));
    let previousOutputs = [];
    const preparation = PREPARATION[stage.id].slice(0, DEPTHS[depth].count - 1);
    stage.steps = preparation.map((item, index) => {
      const baseline = stage.id === 'S1' && index === 0;
      const output = baseline ? project.baseline : item.output;
      const inputTypes = unique([...stageInputs, ...previousOutputs]);
      const step = {
        id: `${stage.id}-${['briefing', 'outline', 'refinement'][index]}`,
        name: baseline ? project.name + '背景' : item.name,
        purpose: 'production',
        outputs: [output],
        required_capabilities: [...item.capabilities],
        provider_output_type: providerType,
        input_types: inputTypes,
        instructions: `${item.instructions} ${project.instructions} 仅生成当前步骤产物；登记后等待用户确认，确认后等待另一次步骤选择。`,
        required_sections: [...(baseline ? project.sections : item.sections)],
      };
      definition.artifact_dependencies[output] = [...inputTypes];
      previousOutputs = [output];
      return step;
    });
    const finalInputs = unique([...stageInputs, ...previousOutputs]);
    stage.steps.push({
      id: `${stage.id}-deliverable`, name: `${stage.name}整合产物`, purpose: 'production',
      outputs: [...stage.artifacts], required_capabilities: [...stage.required_capabilities],
      provider_output_type: providerType, input_types: finalInputs,
      instructions: `整合本阶段已确认步骤，形成完整${stage.name}产物；精简模板也必须覆盖阶段全部交付要求。${project.instructions} ${stage.id === 'S8' ? 'Demo 仍须提供版本绑定浏览器证据、运行说明和交付说明，计划不替代验证。' : ''}登记后停止，等待当前版本确认，不自动开始审查或下一步。`,
      required_sections: ['S1', 'S2', 'S3'].includes(stage.id) ? [...FINAL_SECTIONS[stage.id]] : [],
    });
    for (const type of stage.artifacts) {
      definition.artifact_dependencies[type] = unique([...(baseDefinition.artifact_dependencies[type] ?? []), ...finalInputs]);
    }
    if (stage.reviewers > 0) {
      stage.steps.push({
        id: `${stage.id}-review`, name: `${stage.name}独立审查`, purpose: 'review',
        outputs: ['review'], required_capabilities: ['independent-review'],
        provider_output_type: 'review', input_types: [...stage.artifacts],
        instructions: '独立审查本阶段每个最终产物的确切版本，分别登记审查对象、发现和处置建议；审查者不能是该对象的制作者。登记后等待用户确认，不能自动通过阶段门或选择下一步。',
        required_sections: ['审查对象与版本', '发现与处置建议'],
      });
    }
  }
  return definition;
}

export const SIX_STAGE_STEPPED_WORKFLOW_ID = 'product-design-six-stage-stepped-v1';

// Reuse the historical content vocabulary by artifact meaning. Never reinterpret
// the stage numbers in a saved eight-stage template.
const PREPARATION_BY_ARTIFACT = {
  goal_contract: PREPARATION.S1,
  requirements_scenarios: PREPARATION.S2,
  mrd: PREPARATION.S3,
  visual_direction: PREPARATION.S4,
  wireframes: PREPARATION.S5,
  interaction_spec: PREPARATION.S6,
  visual_design: PREPARATION.S7,
  demo: PREPARATION.S8,
};
const FINAL_SECTIONS_BY_ARTIFACT = {
  goal_contract: FINAL_SECTIONS.S1,
  requirements_scenarios: FINAL_SECTIONS.S2,
  mrd: FINAL_SECTIONS.S3,
};

/** New six-stage manual workflow compiled from the actual artifact contract. */
export function compileSixStageStepDefinition(baseDefinition, selection) {
  const project = PROJECT_TYPES[selection?.project_type];
  const level = DEPTHS[selection?.depth];
  if (!project || !level || !Array.isArray(baseDefinition?.stages) || !baseDefinition.artifact_dependencies) {
    fail('E_STEP_TEMPLATE_INVALID', 'A product-stage definition and supported project_type and depth are required');
  }
  const definition = structuredClone(baseDefinition);
  definition.workflow_id = SIX_STAGE_STEPPED_WORKFLOW_ID;
  definition.step_template = templateCatalog().find(item => item.project_type === selection.project_type && item.depth === selection.depth);
  for (const stage of definition.stages) {
    const providerType = stage.artifacts[0];
    const stageInputs = unique(stage.artifacts.flatMap(type => baseDefinition.artifact_dependencies[type] ?? []))
      .filter(type => !stage.artifacts.includes(type));
    let preparation = stage.artifacts.flatMap(type => (PREPARATION_BY_ARTIFACT[type] ?? []).map(item => ({ ...item, providerType: type })));
    if (stage.artifacts.includes('goal_contract') && stage.artifacts.includes('requirements_scenarios')) {
      preparation = [
        { ...PREPARATION.S1[0], providerType: 'goal_contract' },
        ...PREPARATION.S2.slice(0, 2).map(item => ({ ...item, providerType: 'requirements_scenarios' })),
      ];
    } else if (stage.artifacts.includes('wireframes') && stage.artifacts.includes('interaction_spec')) {
      preparation = [
        { ...PREPARATION.S5[0], providerType: 'wireframes' },
        ...PREPARATION.S6.slice(0, 2).map(item => ({ ...item, providerType: 'interaction_spec' })),
      ];
    }
    if (preparation.length < level.count - 1) fail('E_STEP_TEMPLATE_INVALID', 'Stage lacks artifact-based preparation templates', { stage_id: stage.id });
    // The historical template retains its exception coverage. The new default
    // must not silently expand a normal-flow product when full depth is chosen.
    if (definition.scope === 'normal-product-flow') preparation = preparation.map(item => item.output === 'state_inventory' ? {
      ...item, name: '主流程状态与反馈', sections: ['主流程状态与反馈', '返回与关闭路径'],
      instructions: '说明已确认正常流程的状态变化、操作反馈、返回与关闭；空态和异常态仅按用户明确请求纳入。',
    } : item);
    let previousOutputs = [];
    stage.steps = preparation.slice(0, level.count - 1).map((item, index) => {
      const baseline = stage.artifacts.includes('goal_contract') && index === 0;
      const output = baseline ? project.baseline : item.output;
      const inputTypes = unique([...stageInputs, ...previousOutputs]);
      definition.artifact_dependencies[output] = [...inputTypes];
      previousOutputs = [output];
      return {
        id: `${stage.id}-${['briefing', 'outline', 'refinement'][index]}`,
        name: baseline ? `${project.name}背景` : item.name,
        purpose: 'production', outputs: [output],
        required_capabilities: [...item.capabilities], provider_output_type: item.providerType,
        input_types: inputTypes,
        instructions: `${item.instructions} ${project.instructions} 仅生成当前步骤产物；登记后等待用户确认，确认后等待另一次步骤选择。`,
        required_sections: [...(baseline ? project.sections : item.sections)],
      };
    });
    const finalInputs = unique([...stageInputs, ...previousOutputs]);
    stage.steps.push({
      id: `${stage.id}-deliverable`, name: `${stage.name}整合产物`, purpose: 'production',
      outputs: [...stage.artifacts], required_capabilities: [...stage.required_capabilities],
      provider_output_type: providerType, provider_output_types: [...stage.artifacts],
      input_types: finalInputs,
      instructions: `整合本阶段已确认步骤，形成完整${stage.name}产物；全部联合产物齐备后才能确认。${project.instructions} ${stage.artifacts.includes('demo') ? 'Demo 仍须提供版本绑定浏览器证据、运行说明和交付说明，计划不替代验证。' : ''}登记后停止，等待当前版本确认，不自动开始审查或下一步。`,
      required_sections: unique(stage.artifacts.flatMap(type => FINAL_SECTIONS_BY_ARTIFACT[type] ?? [])),
    });
    for (const type of stage.artifacts) {
      definition.artifact_dependencies[type] = unique([...(baseDefinition.artifact_dependencies[type] ?? []), ...finalInputs]);
    }
    if (stage.reviewers > 0) stage.steps.push({
      id: `${stage.id}-review`, name: `${stage.name}独立审查`, purpose: 'review',
      outputs: ['review'], required_capabilities: ['independent-review'],
      provider_output_type: 'review', input_types: [...stage.artifacts],
      instructions: '分别独立审查本阶段全部最终产物的确切版本；审查者不能是对象制作者。登记后等待用户确认，不能自动通过阶段门或选择下一步。',
      required_sections: ['审查对象与版本', '发现与处置建议'],
    });
  }
  return definition;
}
