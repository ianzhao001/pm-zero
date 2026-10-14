#!/usr/bin/env node
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '../../..');
const fixturesDir = path.join(scriptDir, 'fixtures');
const defaultManifest = path.join(root, 'pm-zero.manifest.json');
const defaultRoutes = path.join(root, 'system/skill-routing/routes.json');

export function parseArgs(argv) {
  const out = {
    input: '', artifact: '', context: '', mode: '', fidelity: '', profile: process.env.PM_ZERO_PROFILE || '',
    contentMode: process.env.PM_ZERO_CONTENT_MODE || '', optionalRules: [],
    stage: '', capabilities: [], providers: [], hostCapabilities: [], purpose: 'production', planVersion: 1, contract: '',
    selfTest: false, manifest: defaultManifest, routes: defaultRoutes,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--self-test') out.selfTest = true;
    else if (/^--optional-rule=/.test(arg)) out.optionalRules.push(arg.slice('--optional-rule='.length));
    else if (/^--capability=/.test(arg)) out.capabilities.push(arg.slice('--capability='.length));
    else if (/^--provider=/.test(arg)) out.providers.push(arg.slice('--provider='.length));
    else if (/^--host-capability=/.test(arg)) out.hostCapabilities.push(arg.slice('--host-capability='.length));
    else if (/^--(?:input|artifact|context|mode|fidelity|profile|content-mode|output|manifest|routes|stage|purpose|plan-version|contract)=/.test(arg)) {
      const match = arg.match(/^--(input|artifact|context|mode|fidelity|profile|content-mode|output|manifest|routes|stage|purpose|plan-version|contract)=(.*)$/);
      if (!match?.[2]) throw new Error(`--${match?.[1] || 'option'} requires a value`);
      const aliases = { 'content-mode': 'contentMode', 'plan-version': 'planVersion' };
      out[aliases[match[1]] || match[1]] = match[2];
    }
    else if (arg === '--optional-rule') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      out.optionalRules.push(value);
      i += 1;
    }
    else if (['--capability', '--provider', '--host-capability'].includes(arg)) {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      const key = arg === '--capability' ? 'capabilities' : arg === '--provider' ? 'providers' : 'hostCapabilities';
      out[key].push(value);
      i += 1;
    }
    else if (['--input', '--artifact', '--context', '--mode', '--fidelity', '--profile', '--content-mode', '--output', '--manifest', '--routes', '--stage', '--purpose', '--plan-version', '--contract'].includes(arg)) {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      const aliases = { '--content-mode': 'contentMode', '--plan-version': 'planVersion' };
      const key = aliases[arg] || arg.slice(2);
      out[key] = value;
      i += 1;
    } else throw new Error(`unknown argument ${arg}`);
  }
  if (out.output && !['full', 'plan'].includes(out.output)) throw new Error('--output must be full or plan');
  if (!['production', 'review'].includes(out.purpose)) throw new Error('--purpose must be production or review');
  return out;
}

function readJson(file, label = file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`invalid JSON in ${label}: ${error.message}`);
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function loadCatalog(file) {
  const manifest = readJson(file, path.relative(root, file));
  const skills = manifest.entries?.skills;
  if (!Array.isArray(skills)) throw new Error('manifest entries.skills must be an array');
  const byId = new Map(skills.map(skill => [String(skill.id).toLowerCase(), skill]));
  const byNamespace = new Map(skills.filter(skill => skill.namespace).map(skill => [String(skill.namespace).toLowerCase(), skill]));
  const profiles = manifest.installation_profiles || {};
  return { manifest, skills, profiles, byId, byNamespace };
}

function loadRouteConfig(file) {
  const config = readJson(file, path.relative(root, file));
  const required = ['id', 'workflow', 'mode', 'context', 'required_files', 'forbidden_skills', 'char_budget', 'estimated_token_budget', 'baseline_estimated_tokens', 'weight'];
  const errors = [];
  const ids = new Set();
  const compositeKeys = new Set();
  for (const route of config.routes || []) {
    for (const field of required) if (route[field] === undefined) errors.push(`${route.id || '<missing>'} missing ${field}`);
    if (ids.has(route.id)) errors.push(`duplicate route id ${route.id}`);
    ids.add(route.id);
    for (const field of ['required_files', 'optional_files', 'asset_files', 'forbidden_skills']) {
      const values = route[field] || [];
      if (values.length !== unique(values).length) errors.push(`${route.id} has duplicate ${field}`);
    }
    const requiredOptionalOverlap = (route.required_files || []).filter(file => (route.optional_files || []).includes(file));
    if (requiredOptionalOverlap.length) errors.push(`${route.id} files cannot be both required and optional: ${requiredOptionalOverlap.join(', ')}`);
    for (const filePath of [...(route.required_files || []), ...(route.optional_files || []), ...(route.asset_files || [])]) {
      if (path.isAbsolute(filePath) || filePath.split('/').includes('..')) errors.push(`${route.id} has unsafe file path ${filePath}`);
      if (filePath.endsWith('/')) errors.push(`${route.id} must list concrete files, got ${filePath}`);
    }
    const composite = [route.workflow, route.mode, route.artifact || '', route.fidelity || '', route.context || '', route.variant || ''].join('|');
    if (compositeKeys.has(composite)) errors.push(`${route.id} duplicates route key ${composite}`);
    compositeKeys.add(composite);
    // Historical baseline is evidence, not a cap: completeness fixes may increase a route.
    // Immutable hard caps are enforced by check-route-budgets.mjs.
  }
  const optionalRuleIds = new Set();
  for (const rule of config.optional_file_rules || []) {
    if (!rule.id || optionalRuleIds.has(rule.id)) errors.push(`duplicate or missing optional rule id ${rule.id || '<missing>'}`);
    optionalRuleIds.add(rule.id);
    if (!rule.predicate || !Array.isArray(rule.files) || rule.files.length === 0) errors.push(`${rule.id}: invalid optional file rule`);
    if (!(rule.estimated_tokens >= 0) || !(rule.cap_tokens >= rule.estimated_tokens)) errors.push(`${rule.id}: invalid optional token budget`);
    for (const filePath of rule.files || []) {
      if (path.isAbsolute(filePath) || filePath.split('/').includes('..') || filePath.endsWith('/')) errors.push(`${rule.id}: unsafe optional file ${filePath}`);
    }
  }
  const weight = (config.routes || []).reduce((sum, route) => sum + Number(route.weight || 0), 0);
  if (Math.abs(weight - 1) > 1e-9) errors.push(`route weights must sum to 1, got ${weight}`);
  const candidate = (config.routes || []).reduce((sum, route) => sum + route.weight * route.estimated_token_budget, 0);
  const baseline = (config.routes || []).reduce((sum, route) => sum + route.weight * route.baseline_estimated_tokens, 0);
  if (baseline && candidate / baseline > 0.85) errors.push(`weighted token ratio must be <= 0.85, got ${(candidate / baseline).toFixed(3)}`);
  if (errors.length) throw new Error(`invalid route config: ${errors.join('; ')}`);
  return config;
}

function includesTrigger(input, trigger) {
  const needle = String(trigger || '');
  if (!needle) return false;
  if (!/[A-Za-z]/.test(needle)) return input.includes(needle);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}(?=$|[^A-Za-z0-9])`, 'i').test(input);
}

function stripQuotedAndFixtureText(input) {
  return input
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ');
}

function suppressAutomaticContext(input) {
  return /(fixture|test fixture|测试夹具|测试样例|示例字符串|中性.{0,8}示例|迁移材料|历史产物|泄漏|leak(?:age)?|引用文本|quoted text|字符串字面量|disclosure scan)/i.test(input);
}

function isComparisonRequest(input) {
  return /(对比|比较|分别输出|分开输出|compare|comparison|versus|\bvs\.?\b)/i.test(input);
}

function automaticContextText(input) {
  return stripQuotedAndFixtureText(input)
    .split(/[\n,，;；。]+|(?:并且|然后)|\b(?:and then|then|and)\b/i)
    .filter(clause => !suppressAutomaticContext(clause))
    .join(' ');
}

function marker(input, name) {
  const match = input.match(new RegExp(`\\b${name}\\s*:\\s*([A-Za-z0-9_-]+(?:\\s*[,/+]\\s*[A-Za-z0-9_-]+)*)`, 'i'));
  return match ? match[1] : '';
}

function selectors(value) {
  return unique(String(value || '').split(/\s*[,/+]+\s*/).map(item => item.trim().toLowerCase()));
}

function findSkill(catalog, selector) {
  return catalog.byId.get(selector) || catalog.byNamespace.get(selector) || null;
}

function inferDesignMode(text) {
  if (/(hifi|high[- ]?fidelity|高保真|视觉还原|截图吸收|open design)/i.test(text)) return 'hifi';
  if (/(demo|原型|可点击|交互稿|h5)/i.test(text)) return 'demo';
  return 'flow';
}

function inferDesignShape(text) {
  const artifact = /(demo|prototype|原型|可点击|可交互|交互稿|真实路由|\bh5\b)/i.test(text) ? 'demo' : 'flow';
  const fidelity = /(截图吸收|截图复刻|按截图|吸收.{0,8}截图|截图.{0,8}(吸收|复刻|还原)|screenshot absorption|pixel[- ]?match)/i.test(text)
    ? 'screenshot'
    : /(hifi|high[- ]?fidelity|高保真|视觉还原|open design)/i.test(text) ? 'hifi' : 'standard';
  return { artifact, fidelity };
}

function inferUiArtifact(text) {
  if (/(design qa|视觉还原|高保真|hifi|原型|规范修复|视觉验收|对齐设计稿|还原度)/i.test(text)) return 'visual-qa';
  if (/(页面|界面|首页|详情页|列表页|布局|layout|screen|page)/i.test(text)) return 'page';
  return 'component';
}

function normalizeExplicitMode(value, text, uiCodeSkills = []) {
  const mode = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  if (!mode) return null;
  if (['pm-zero', 'brief'].includes(mode)) return { workflow: 'pm-zero', mode: 'brief' };
  if (mode === 'prd-forge' || mode === 'prd' || mode.startsWith('prd-')) return { workflow: 'prd-forge', mode: 'prd' };
  if (mode === 'design-forge') return { workflow: 'design-forge', mode: inferDesignMode(text) };
  if (['flow', 'mode-flow'].includes(mode)) return { workflow: 'design-forge', mode: 'flow' };
  if (['demo', 'mode-demo'].includes(mode)) return { workflow: 'design-forge', mode: 'demo' };
  if (['hifi', 'high-fidelity'].includes(mode)) return { workflow: 'design-forge', mode: 'hifi' };
  if (['review', 'reviewer-forge', 'audit', 'critique'].includes(mode)) return { workflow: 'reviewer-forge', mode: 'review' };
  if (['ui-code', 'design-system'].includes(mode)) return { workflow: '__ui-code__', mode: 'ui-code', capability: 'ui-code' };
  const standalone = uiCodeSkills.find(skill => skill.id === mode);
  if (standalone) return { workflow: standalone.id, mode: 'ui-code', capability: 'ui-code' };
  return { workflow: null, mode, invalid: true };
}

function inferIntent(input, explicitMode, options = {}) {
  const text = input.replace(/\b(?:MODE|CONTEXT|FIDELITY)\s*:\s*[A-Za-z0-9_-]+(?:\s*[,/+]\s*[A-Za-z0-9_-]+)*/gi, ' ');
  const designShape = inferDesignShape(text);
  const review = /(审查|审核|找茬|放行|纠错|验收|review|critique|audit)/i.test(text);
  const directModify = /(审查|审核|review|audit)[\s\S]{0,40}(并|后|然后|再|then)[\s\S]{0,30}(修改|修复|改写|迭代|逐条|fix|revise)|先[\s\S]{0,20}(审查|审核)[\s\S]{0,40}(再|然后|后)[\s\S]{0,30}(修改|修复|逐条)|列出问题[\s\S]{0,20}(后|再)[\s\S]{0,20}(修改|修复)|review[\s\S]{0,30}then[\s\S]{0,20}(fix|revise)/i.test(text);
  const prd = /(\bprd\b|需求文档|产品需求)/i.test(text);
  const design = /(flow|流程图|交互流程|demo|原型|高保真|hifi|页面|界面|设计稿|h5|截图吸收|截图复刻|吸收.{0,8}截图|open design)/i.test(text);
  const uiIntentText = automaticContextText(text);
  const strongUiCodeSignal = /(dewu design system|得物设计规范|ui\s*业务代码|ui\s*代码|前端|代码|react|vue|tsx|jsx|css|组件|component|样式|design qa|视觉\s*qa|规范修复|对齐设计稿|还原度|视觉验收)/i.test(uiIntentText);
  const pageImplementation = /(页面|界面|首页|详情页|列表页|布局|layout|screen|page)/i.test(uiIntentText)
    && /(写|实现|开发|落地|编码|build|implement|code)/i.test(uiIntentText);
  const hifiAuthoring = /(hifi|high[- ]?fidelity|高保真|截图吸收|open design)/i.test(uiIntentText);
  const uiCode = (strongUiCodeSignal || pageImplementation)
    && /(写|实现|开发|修改|修复|检查|核对|验收|对齐|落地|重构|编码|build|implement|fix|refactor|code|qa)/i.test(uiIntentText)
    && (!hifiAuthoring || strongUiCodeSignal);
  const reviewArtifact = prd ? 'prd' : designShape.fidelity !== 'standard' ? 'hifi' : design ? 'demo' : 'brief';
  const outputArtifact = prd ? 'prd' : designShape.artifact;

  const explicit = normalizeExplicitMode(explicitMode, text, options.uiCodeSkills);
  if (explicit?.invalid) return { ...explicit, sequence: [], artifact: null };
  if (review && !directModify && (prd || design || explicit?.workflow === 'reviewer-forge')) {
    return { workflow: 'reviewer-forge', mode: 'review', sequence: ['reviewer-forge'], artifact: outputArtifact, routeArtifact: reviewArtifact, fidelity: designShape.fidelity };
  }
  if (options.uiCodeSkills?.some(skill => skill.id === explicit?.workflow)) return { ...explicit, sequence: [explicit.workflow], artifact: inferUiArtifact(text), routeArtifact: inferUiArtifact(text), fidelity: 'standard' };
  if (explicit?.workflow === '__ui-code__') {
    if (!options.uiCodeWorkflow) return { workflow: null, mode: 'ui-code', sequence: [], artifact: inferUiArtifact(text), routeArtifact: inferUiArtifact(text), fidelity: 'standard', unsupported: true };
    return { workflow: options.uiCodeWorkflow, mode: 'ui-code', sequence: [options.uiCodeWorkflow], artifact: inferUiArtifact(text), routeArtifact: inferUiArtifact(text), fidelity: 'standard' };
  }
  if (review && directModify && explicit?.workflow !== 'reviewer-forge') {
    const target = prd || explicit?.workflow === 'prd-forge' ? 'prd-forge' : 'design-forge';
    const routeArtifact = target === 'prd-forge' ? 'prd' : designShape.fidelity !== 'standard' && designShape.artifact !== 'demo' ? 'hifi' : designShape.artifact;
    return { workflow: target, mode: 'review-and-modify', sequence: ['reviewer-forge', target], artifact: target === 'prd-forge' ? 'prd' : designShape.artifact, routeArtifact, fidelity: target === 'prd-forge' ? 'standard' : designShape.fidelity };
  }
  if (!explicit && uiCode && options.uiCodeWorkflow) return { workflow: options.uiCodeWorkflow, mode: 'ui-code', sequence: [options.uiCodeWorkflow], artifact: inferUiArtifact(text), routeArtifact: inferUiArtifact(text), fidelity: 'standard' };
  if (!explicit && uiCode) return { workflow: null, mode: null, sequence: [], artifact: 'ui-code', routeArtifact: 'ui-code', fidelity: 'standard', unsupported: true };
  if (explicit?.workflow === 'reviewer-forge') return { ...explicit, sequence: ['reviewer-forge'], artifact: outputArtifact, routeArtifact: reviewArtifact, fidelity: designShape.fidelity };
  if (explicit?.workflow === 'design-forge') {
    const modeShape = explicit.mode === 'demo' ? { artifact: 'demo', fidelity: designShape.fidelity }
      : explicit.mode === 'flow' ? { artifact: 'flow', fidelity: designShape.fidelity }
        : { artifact: designShape.artifact, fidelity: designShape.fidelity === 'standard' ? 'hifi' : designShape.fidelity };
    const routeMode = modeShape.fidelity === 'standard' ? explicit.mode : 'hifi';
    return { ...explicit, mode: routeMode, sequence: ['design-forge'], artifact: modeShape.artifact, routeArtifact: modeShape.artifact, fidelity: modeShape.fidelity };
  }
  if (explicit) return { ...explicit, sequence: [explicit.workflow], artifact: explicit.mode, routeArtifact: explicit.mode, fidelity: 'standard' };
  if (review) return { workflow: 'reviewer-forge', mode: 'review', sequence: ['reviewer-forge'], artifact: outputArtifact, routeArtifact: reviewArtifact, fidelity: designShape.fidelity };
  if (prd) return { workflow: 'prd-forge', mode: 'prd', sequence: ['prd-forge'], artifact: 'prd', routeArtifact: 'prd', fidelity: 'standard' };
  if (design) {
    const mode = designShape.fidelity === 'standard' ? inferDesignMode(text) : 'hifi';
    return { workflow: 'design-forge', mode, sequence: ['design-forge'], artifact: designShape.artifact, routeArtifact: designShape.artifact, fidelity: designShape.fidelity };
  }
  if (/(想清楚|澄清需求|需求澄清|product discovery|idea brief|pm-zero)/i.test(text)) return { workflow: 'pm-zero', mode: 'brief', sequence: ['pm-zero'], artifact: 'brief', routeArtifact: 'brief', fidelity: 'standard' };
  return { workflow: null, mode: null, sequence: [], artifact: null, routeArtifact: null, fidelity: 'standard' };
}

function routeFor(config, intent, context) {
  const matchesBase = route => route.workflow === intent.workflow
    && route.mode === intent.mode
    && route.context === context;
  const candidates = config.routes.filter(matchesBase);
  const routeArtifact = intent.routeArtifact ?? intent.artifact;
  const exact = candidates.find(route => route.artifact === routeArtifact && route.fidelity === (intent.fidelity === 'screenshot' ? 'hifi' : intent.fidelity))
    || candidates.find(route => route.artifact === routeArtifact && !route.fidelity)
    || candidates.find(route => route.artifact === routeArtifact)
    || candidates.find(route => !route.artifact);
  if (exact) return exact;
  if (context !== null) return null;
  return config.routes.find(route => route.workflow === intent.workflow
    && route.mode === intent.mode
    && route.context === null
    && (!route.artifact || route.artifact === routeArtifact)) || null;
}

function predicateMatches(predicate, input, intent) {
  input = stripQuotedAndFixtureText(input).split(/[\n,，;；。]+/)
    .filter(clause => !suppressAutomaticContext(clause))
    .filter(clause => !/^\s*(?:不要|无需|不需要|不用|不做|without\b|no\b|do not\b)/i.test(clause))
    .join(' ');
  const tests = {
    story_canvas: /(story canvas|故事板|3x3|高保真流程矩阵)/i.test(input),
    asset_search: /(图片|素材|头像|商品图|照片|image|asset|photo)/i.test(input),
    screenshot_absorption: intent.fidelity === 'screenshot',
    figma_sync: /(figma).{0,20}(同步|抽取|组件库|sync|extract)|同步.{0,12}figma/i.test(input),
    production_source: /(生产代码|生产仓|h5\s*工程|production[- ]?(?:code|source|repo))/i.test(input),
    component_detail: /(组件|原子|button|tabbar|toast|dialog|sheet|component)/i.test(input),
    prd_docx: /(docx|word|排版|文档格式)/i.test(input),
    prd_feedback: /(反馈改稿|评审反馈|根据反馈|review feedback)/i.test(input),
    prd_boundary: /(范围|边界|表达争议|scope|constraint)/i.test(input),
    prd_multi_track: /(多轨|多方向|分方向|方案\s*[ab]|multi[- ]?track)/i.test(input),
    prd_schema: /(字段|章节|schema)/i.test(input),
    prd_writing: /(写法|描述模板|writing template)/i.test(input),
    prd_rationale: /(实现边界|实现选型|技术细节|rationale)/i.test(input),
    design_feedback: /(反馈|迭代|局部修改|feedback)/i.test(input),
    visual_craft: /(视觉|美化|精致|visual|craft)/i.test(input),
    review_dimensions: /(评分|维度|深入审查|dimensions|scoring)/i.test(input),
    legacy_pipeline: /(旧版流水线|四阶段流水线|legacy pipeline|pipeline-stage)/i.test(input),
    review_example: /(评审样例|审查样例|review example|格式样例)/i.test(input),
  };
  return Boolean(tests[predicate]);
}

function applyContentMode(route, config, requestedMode) {
  const contentMode = requestedMode || config.default_content_mode || 'legacy-full';
  const modeConfig = config.content_modes?.[contentMode] || (contentMode === 'legacy-full' ? {} : null);
  if (!modeConfig) throw new Error(`unknown content mode ${contentMode}`);
  const requiredFiles = [...(route?.required_files || [])];
  const assetFiles = [...(route?.asset_files || [])];
  if (modeConfig.replace_required) {
    for (const [source, replacement] of Object.entries(modeConfig.replace_required)) {
      const index = requiredFiles.indexOf(source);
      if (index >= 0) {
        requiredFiles[index] = replacement;
        assetFiles.push(source);
      }
    }
  }
  return { contentMode, requiredFiles: unique(requiredFiles), assetFiles: unique(assetFiles) };
}

function selectOptionalRules(config, input, intent, context, explicitRuleIds = []) {
  const explicit = new Set(explicitRuleIds || []);
  const known = new Set((config.optional_file_rules || []).map(rule => rule.id));
  const inScope = rule => (!rule.workflows || rule.workflows.some(workflow => (intent.sequence || [intent.workflow]).includes(workflow)))
    && (!rule.contexts || rule.contexts.includes(context));
  const invalid = [...explicit].filter(id => !known.has(id) || !inScope(config.optional_file_rules.find(rule => rule.id === id)));
  const selected = (config.optional_file_rules || []).filter(rule => {
    if (rule.workflows && !rule.workflows.some(workflow => (intent.sequence || [intent.workflow]).includes(workflow))) return false;
    if (rule.contexts && !rule.contexts.includes(context)) return false;
    return explicit.has(rule.id) || (rule.id === 'design-pipeline' && explicit.has('legacy-pipeline')) || predicateMatches(rule.predicate, input, intent);
  });
  return { selected, invalid };
}

function contentTokens(files, charsPerToken) {
  const chars = unique(files).reduce((sum, relativePath) => {
    const absolute = path.join(root, relativePath);
    return sum + (fs.existsSync(absolute) && fs.statSync(absolute).isFile() ? fs.readFileSync(absolute, 'utf8').length : 0);
  }, 0);
  return { chars, tokens: Math.ceil(chars / charsPerToken) };
}

function profileForSkill(catalog, skillId) {
  return catalog.byId.get(String(skillId || '').toLowerCase())?.install_profiles?.[0] || null;
}

export function buildLoadSteps(route, catalog, resolvedRequiredFiles = route?.required_files || [], selectedRules = [], assets = route?.asset_files || [], includeMetadata = true) {
  if (!route) return [];
  const sequence = route.sequence || [route.workflow];
  const ownerOf = file => catalog.skills.find(skill => file.startsWith(skill.path))?.id;
  const contextFiles = resolvedRequiredFiles.filter(file => ownerOf(file) === route.context);
  const stageFor = (file, rule) => {
    const owner = ownerOf(file);
    if (sequence.includes(owner)) return sequence.indexOf(owner);
    if (rule) return Math.max(0, sequence.findIndex(skill => rule.workflows.includes(skill)));
    // Assets are materialized by the producer, not preloaded by its reviewer.
    if (assets.includes(file)) return Math.max(0, sequence.indexOf(route.workflow));
    return 0;
  };
  const loaded = new Set();
  return sequence.map((skill, index) => {
    const required = unique(resolvedRequiredFiles.filter(file => stageFor(file) === index));
    const rules = selectedRules.filter(rule => rule.workflows.includes(skill));
    const optional = unique(rules.flatMap(rule => rule.files.filter(file => stageFor(file, rule) === index)))
      .filter(file => !resolvedRequiredFiles.includes(file));
    const stepAssets = assets.filter(file => stageFor(file) === index);
    const retained = unique([...contextFiles, ...optional]).filter(file => loaded.has(file));
    const selected = optional.filter(file => !loaded.has(file));
    const files = unique([...required, ...selected, ...stepAssets]);
    const metadata = includeMetadata ? Object.fromEntries(files.map(file => {
      const bytes = fs.readFileSync(path.join(root, file));
      const reasons = selectedRules.filter(rule => rule.files.includes(file)).map(rule => `optional:${rule.id}`);
      return [file, { sha256: createHash('sha256').update(bytes).digest('hex'),
        chars: stepAssets.includes(file) ? null : bytes.toString('utf8').length,
        reasons: reasons.length ? reasons : [`route:${route.id}:${stepAssets.includes(file) ? 'asset' : 'required'}`] }];
    })) : {};
    for (const file of [...required, ...selected]) loaded.add(file);
    return { skill, after: index === 0 ? null : route.handoff || 'previous_step',
      session_scope: sequence.length > 1 ? 'shared-route-session' : 'single-step',
      required_files: required, selected_optional_files: selected, asset_files: stepAssets,
      retained_context_files: retained,
      retained_required_files: index === 0 ? [] : resolvedRequiredFiles.filter(file => file.startsWith('system/')),
      file_metadata: metadata };
  });
}

// This selects an entry, never a stage. Saved project state remains authoritative.
function isProductProjectRequest(input, options, explicitMode) {
  if (options.artifact || explicitMode) return false; // Existing explicit forge / legacy API.
  const text = automaticContextText(input);
  if (/^\s*(?:帮我)?(?:审查|审核|评审|review\b|audit\b)/i.test(text)) return false;
  if (/(?:只|单独|独立)(?:要|做|制作|画|修改|生成).{0,12}(?:Flow|Demo|线框|设计稿|页面|文件)/i.test(text)) return false;
  if (!/(?:澄清|完整产品|从零|从.{0,6}idea)/i.test(text)
    && /(?:修改|修复|绘制|画|设计).{0,35}(?:页面|界面|登录页|详情页|首页|组件|一张线框|单张设计稿)/i.test(text)) return false;
  return /(?:想清楚|澄清需求|需求澄清|product discovery|idea brief|\$pm-zero)/i.test(text)
    || /(?:设计|规划|构思|打造|做)(?:一个|一款|新的|个).{0,35}(?:产品|应用|app\b|agent\b|助手|小程序|平台)/i.test(text)
    || /(?:设计|规划|打造|做).{0,35}(?:产品|app|agent|助手|小程序)(?:[。？！,.!?\s]|$)/i.test(text)
    || /(?:帮我|协助我|一起).{0,20}(?:澄清|设计|规划|想清楚).{0,40}(?:产品|需求|应用|app\b|agent\b|助手|小程序|平台)/i.test(text);
}

export function resolveInput(input, options = {}) {
  const catalog = options.catalog || loadCatalog(options.manifest || defaultManifest);
  const config = options.config || loadRouteConfig(options.routes || defaultRoutes);
  const warnings = [];
  const errors = [];
  const activeProfile = options.profile || config.default_profile || 'pm-zero-agent';
  const profile = catalog.profiles[activeProfile] || null;
  if (Object.keys(catalog.profiles).length && !profile) errors.push(`invalid installation profile: ${activeProfile}`);
  const profileSkillIds = new Set(profile?.skill_ids || catalog.skills.map(skill => skill.id));
  const inlineMode = marker(input, 'MODE');
  let explicitMode = options.mode || inlineMode;
  if (/^(?:hifi|high[-_ ]?fidelity)$/i.test(String(explicitMode || ''))) {
    warnings.push('MODE:HIFI is deprecated; use MODE_FLOW or MODE_DEMO with FIDELITY:HIFI.');
  }
  const rawContextSelectors = selectors(options.context || marker(input, 'CONTEXT'));
  const explicitNeutral = rawContextSelectors.some(selector => ['none', 'neutral'].includes(selector));
  const requestedContexts = rawContextSelectors.filter(selector => !['none', 'neutral'].includes(selector));
  if (explicitNeutral && requestedContexts.length) errors.push('CONTEXT:none|neutral cannot be combined with a context id');
  const modeSkill = findSkill(catalog, String(explicitMode || '').toLowerCase());
  const legacyModeAlias = String(explicitMode || '').toLowerCase();
  if (modeSkill?.kind === 'context-pack' && (modeSkill.legacy_mode_aliases || []).map(alias => String(alias).toLowerCase()).includes(legacyModeAlias)) {
    requestedContexts.push(String(modeSkill.id).toLowerCase());
    warnings.push(`MODE: ${explicitMode} is deprecated for context selection; use CONTEXT: ${modeSkill.id} or --context ${modeSkill.id}.`);
    explicitMode = '';
  }

  const triggerText = automaticContextText(input);
  const autoMatches = catalog.skills
    .filter(skill => skill.kind === 'context-pack')
    .map(skill => ({ skill, triggers: (skill.trigger || []).filter(trigger => includesTrigger(triggerText, trigger)) }))
    .filter(match => match.triggers.length);

  const explicitMatches = [];
  const invalidContexts = [];
  for (const selector of unique(requestedContexts)) {
    const skill = findSkill(catalog, selector);
    if (!skill) invalidContexts.push(selector);
    else if (skill.kind !== 'context-pack') invalidContexts.push(`${selector}:${skill.kind}`);
    else explicitMatches.push({ skill, triggers: [], source: 'explicit' });
  }
  if (invalidContexts.length) errors.push(`invalid runtime context: ${invalidContexts.join(', ')}`);
  const contextMatches = explicitNeutral ? [] : explicitMatches.length || requestedContexts.length ? explicitMatches : autoMatches;
  const contextIds = unique(contextMatches.map(match => match.skill.id));
  const comparison = contextIds.length > 1 && isComparisonRequest(input);
  const conflict = contextIds.length > 1 && !comparison;
  let selectedContext = conflict ? null : contextIds[0] || null;
  if (comparison) selectedContext = null;
  if (isProductProjectRequest(input, options, explicitMode)) {
    const unavailable = !profileSkillIds.has('pm-zero') || !catalog.byId.has('pm-zero');
    const resolution = errors.length ? 'route_error' : conflict || comparison ? 'context_conflict'
      : unavailable ? 'profile_switch_required' : 'staged_project_required';
    return {
      resolution, workflow_scope: 'project', workflow: 'pm-zero', workflow_id: 'product-design-six-stage-v1',
      route_id: null, mode: null, artifact: null, fidelity: null, context: selectedContext,
      context_selection: explicitNeutral ? 'none' : explicitMatches.length ? 'explicit' : selectedContext ? 'auto' : 'none',
      active_profile: activeProfile, required_profile: 'pm-zero-agent', content_mode: null,
      sequence: [], required_files: [], optional_files: [], selected_optional_files: [], asset_files: [],
      load_steps: [], produces: [], forbidden_skills: [], comparison_routes: [],
      context_candidates: contextIds, invalid_contexts: invalidContexts, ignored_contexts: [], conflict, comparison,
      matched_skills: [{ skill: 'pm-zero', matched_triggers: [] }],
      optional_budget_status: 'not-applicable', total_content_estimate: null, startup_char_budget: config.startup_char_budget,
      next_actions: ['runtime_info', 'project_open', 'project_read(resume)', 'stage_prepare'],
      suggestion: '先核实运行能力并选定产品目录；新项目默认六阶段；仅在用户选择时启用分步模板，已有项目恢复保存的流程。仅执行 stage_prepare 当前计划；缺口不得改走独立 forge。',
      warnings, errors,
    };
  }
  const contextProviders = catalog.skills.filter(skill => skill.kind === 'standalone'
    && (skill.capabilities || []).includes('ui-code')
    && (skill.activation_contexts || []).some(contextId => contextIds.includes(contextId)));
  const activeProfileProviders = catalog.skills.filter(skill => profileSkillIds.has(skill.id)
    && skill.kind === 'standalone' && (skill.capabilities || []).includes('ui-code'));
  const hasUiCodeProviderConflict = contextProviders.length > 1 || activeProfileProviders.length > 1;
  const contextProvider = contextProviders.length === 1 ? contextProviders[0].id : null;
  const activeProfileProvider = activeProfileProviders.length === 1 ? activeProfileProviders[0].id : null;
  const uiCodeWorkflow = contextProvider || activeProfileProvider;
  const uiCodeSkills = catalog.skills.filter(skill => skill.kind === 'standalone' && (skill.capabilities || []).includes('ui-code'));
  const intent = inferIntent(input, explicitMode, { uiCodeWorkflow, uiCodeSkills });
  const uiCodeProviderConflict = hasUiCodeProviderConflict && (intent.mode === 'ui-code' || intent.artifact === 'ui-code');
  if (uiCodeProviderConflict && contextProviders.length > 1) errors.push(`ui-code provider conflict for context ${contextIds.join(', ') || '<none>'}: ${contextProviders.map(skill => skill.id).join(', ')}`);
  if (uiCodeProviderConflict && activeProfileProviders.length > 1) errors.push(`ui-code provider conflict for profile ${activeProfile}: ${activeProfileProviders.map(skill => skill.id).join(', ')}`);
  const explicitArtifact = String(options.artifact || '').toLowerCase();
  let invalidArtifact = false;
  if (explicitArtifact) {
    const shapes = {
      brief: { workflow: 'pm-zero', mode: 'brief' },
      interaction_spec: { workflow: 'design-forge', mode: 'interaction-spec' },
      flow: { workflow: 'design-forge', mode: 'flow' },
      demo: { workflow: 'design-forge', mode: 'demo' },
      prd: { workflow: 'prd-forge', mode: 'prd' },
    };
    const shape = shapes[explicitArtifact];
    const isReview = intent.workflow === 'reviewer-forge';
    if (!shape || (explicitMode && !isReview && intent.workflow !== shape.workflow)) {
      invalidArtifact = true;
      errors.push(`invalid ARTIFACT for selected mode: ${explicitArtifact}`);
    } else if (isReview) {
      intent.artifact = explicitArtifact;
      intent.routeArtifact = explicitArtifact;
    } else {
      const compound = intent.mode === 'review-and-modify';
      Object.assign(intent, shape, { artifact: explicitArtifact, routeArtifact: explicitArtifact, sequence: compound ? ['reviewer-forge', shape.workflow] : [shape.workflow], fidelity: intent.fidelity || 'standard' });
      if (compound) intent.mode = 'review-and-modify';
    }
  }
  const explicitFidelity = String(options.fidelity || marker(input, 'FIDELITY') || '').toLowerCase();
  if (explicitFidelity) {
    if (!['standard', 'hifi', 'screenshot'].includes(explicitFidelity)) errors.push(`unknown FIDELITY: ${explicitFidelity}`);
    else if (intent.workflow === 'design-forge' && intent.artifact !== 'interaction_spec') {
      intent.fidelity = explicitFidelity;
      const compound = intent.mode === 'review-and-modify';
      intent.mode = compound ? 'review-and-modify' : explicitFidelity === 'standard' ? intent.artifact : 'hifi';
      intent.routeArtifact = compound && explicitFidelity !== 'standard' && intent.artifact !== 'demo' ? 'hifi' : intent.artifact;
    }
  }
  if (intent.invalid) errors.push(`unknown MODE: ${intent.mode}`);

  const ignoredContexts = [];
  if (uiCodeSkills.some(skill => skill.id === intent.workflow) && selectedContext) {
    ignoredContexts.push(selectedContext);
    warnings.push(`${selectedContext} context is forbidden for standalone UI-code work and was not loaded.`);
    selectedContext = null;
  }
  let incompatibleContext = false;
  if (selectedContext && intent.workflow) {
    const contextSkill = findSkill(catalog, selectedContext);
    for (const workflowId of intent.sequence) {
      const workflow = findSkill(catalog, workflowId);
      if (!(workflow?.composes_with || []).includes(contextSkill.id) || !(contextSkill.composes_with || []).includes(workflowId)) {
        errors.push(`${workflowId} does not compose with context ${contextSkill.id}`);
        incompatibleContext = true;
        selectedContext = null;
        break;
      }
    }
  }

  const comparisonRoutes = [];
  let comparisonFailed = false;
  if (comparison && intent.workflow && !invalidContexts.length && !intent.invalid) {
    for (const contextId of contextIds) {
      const contextSkill = findSkill(catalog, contextId);
      const incompatibleWorkflow = intent.sequence.find(workflowId => {
        const workflow = findSkill(catalog, workflowId);
        return !(workflow?.composes_with || []).includes(contextSkill.id)
          || !(contextSkill.composes_with || []).includes(workflowId);
      });
      if (incompatibleWorkflow) {
        errors.push(`${incompatibleWorkflow} does not compose with comparison context ${contextId}`);
        comparisonFailed = true;
        continue;
      }
      const branchRoute = routeFor(config, intent, contextId);
      if (!branchRoute) {
        errors.push(`no isolated comparison route for workflow=${intent.workflow} mode=${intent.mode} context=${contextId}`);
        comparisonFailed = true;
        continue;
      }
      if (Object.keys(catalog.profiles).length && [...(branchRoute.sequence || [branchRoute.workflow]), contextId].some(id => !profileSkillIds.has(id))) {
        errors.push(`comparison context ${contextId} is outside installation profile ${activeProfile}`);
        comparisonFailed = true;
        continue;
      }
      const branchOptional = selectOptionalRules(config, input, intent, contextId, options.optionalRules || []);
      if (branchOptional.invalid.length) {
        errors.push(`invalid optional rules for comparison context ${contextId}: ${branchOptional.invalid.join(', ')}`);
        comparisonFailed = true;
        continue;
      }
      const branchContent = applyContentMode(branchRoute, config, options.contentMode);
      comparisonRoutes.push({
        context: contextId,
        workflow: intent.workflow,
        mode: intent.mode,
        artifact: intent.artifact,
        sequence: branchRoute.sequence,
        route_id: branchRoute.id,
        fidelity: intent.fidelity,
        required_files: branchContent.requiredFiles,
        asset_files: branchContent.assetFiles,
        forbidden_skills: unique(branchRoute.forbidden_skills || []),
        load_steps: buildLoadSteps(branchRoute, catalog, branchContent.requiredFiles, branchOptional.selected, branchContent.assetFiles, options.output !== 'plan'),
      });
    }
  }

  if (comparisonFailed) comparisonRoutes.length = 0;

  const blocked = invalidArtifact || conflict || comparison || invalidContexts.length > 0 || incompatibleContext || uiCodeProviderConflict || Boolean(intent.invalid) || Boolean(errors.find(error => error.startsWith('invalid installation profile')));
  const route = intent.workflow && !blocked ? routeFor(config, intent, selectedContext) : null;
  if (intent.workflow && !route && !blocked) errors.push(`no route for workflow=${intent.workflow} mode=${intent.mode} context=${selectedContext || 'neutral'}`);
  const requiredProfile = route ? profileForSkill(catalog, route.workflow) : intent.workflow ? profileForSkill(catalog, intent.workflow) : null;
  const routeSkillIds = unique([...(route?.sequence || []), ...(route?.context ? [route.context] : [])]);
  const profileMismatch = Boolean(route && Object.keys(catalog.profiles).length && routeSkillIds.some(skillId => !profileSkillIds.has(skillId)));
  if (profileMismatch) warnings.push(`route ${route.id} requires installation profile ${requiredProfile || '<unknown>'}; active profile is ${activeProfile}.`);
  const content = route ? applyContentMode(route, config, options.contentMode) : { contentMode: options.contentMode || config.default_content_mode || 'legacy-full', requiredFiles: [], assetFiles: [] };
  const optionalSelection = route ? selectOptionalRules(config, input, intent, selectedContext, options.optionalRules || []) : { selected: [], invalid: [] };
  if (optionalSelection.invalid.length) errors.push(`unknown or out-of-scope optional rule: ${optionalSelection.invalid.join(', ')}`);
  const selectedOptionalFiles = unique(optionalSelection.selected.flatMap(rule => rule.files || [])).filter(file => !content.requiredFiles.includes(file));
  const optionalFiles = unique([...(route?.optional_files || []), ...selectedOptionalFiles]);
  const charsPerToken = Number(config.token_estimator_chars_per_token || 4);
  const baseEstimate = contentTokens(content.requiredFiles, charsPerToken);
  const optionalEstimate = contentTokens(selectedOptionalFiles, charsPerToken);
  const optionalBudgetPass = optionalSelection.selected.every(rule => rule.estimated_tokens <= rule.cap_tokens)
    && optionalSelection.selected.every(rule => contentTokens(rule.files, charsPerToken).tokens === rule.estimated_tokens);
  const matchedIds = unique([...(intent.sequence || []), ...(selectedContext ? [selectedContext] : []), ...(contextIds.length > 1 ? contextIds : [])]);
  const matchedSkills = matchedIds.map(id => {
    const match = contextMatches.find(item => item.skill.id === id);
    return { skill: id, matched_triggers: match?.triggers || [] };
  });

  let resolution = 'routed';
  if (invalidArtifact) resolution = 'invalid_artifact';
  else if (uiCodeProviderConflict) resolution = 'provider_conflict';
  else if (profileMismatch) resolution = 'profile_switch_required';
  else if (conflict) resolution = 'context_conflict';
  else if (invalidContexts.length) resolution = 'invalid_context';
  else if (incompatibleContext) resolution = 'incompatible_context';
  else if (intent.invalid) resolution = 'invalid_mode';
  else if (comparison) resolution = comparisonFailed || comparisonRoutes.length !== contextIds.length ? 'route_error' : 'context_comparison';
  else if (!intent.workflow && intent.unsupported) resolution = 'unsupported_capability';
  else if (!intent.workflow) resolution = 'no_workflow_match';
  else if (errors.length) resolution = 'route_error';
  else if (warnings.some(warning => warning.includes('deprecated'))) resolution = 'routed_with_deprecated_mode_alias';
  else if (explicitMatches.length) resolution = 'routed_with_explicit_context';
  else if (errors.length) resolution = 'route_error';

  return {
    workflow: intent.workflow,
    mode: intent.mode,
    artifact: intent.artifact,
    fidelity: intent.fidelity,
    context: selectedContext,
    context_selection: explicitNeutral ? 'none' : explicitMatches.length ? 'explicit' : selectedContext ? 'auto' : 'none',
    active_profile: activeProfile,
    required_profile: requiredProfile,
    sequence: blocked || profileMismatch || errors.length ? [] : route?.sequence || intent.sequence,
    required_files: profileMismatch || errors.length ? [] : content.requiredFiles,
    optional_files: profileMismatch || errors.length ? [] : optionalFiles,
    selected_optional_files: profileMismatch || errors.length ? [] : selectedOptionalFiles,
    selected_optional_rules: profileMismatch || errors.length ? [] : optionalSelection.selected.map(rule => rule.id),
    optional_files_scope: route ? 'route rules; load selected files only after predicate or explicit optional-rule match' : 'none',
    asset_files: profileMismatch || errors.length ? [] : content.assetFiles,
    content_mode: content.contentMode,
    forbidden_skills: unique(route?.forbidden_skills || []),
    load_steps: profileMismatch || errors.length ? [] : buildLoadSteps(route, catalog, content.requiredFiles, optionalSelection.selected, content.assetFiles, options.output !== 'plan'),
    preload_policy: route?.preload_policy || 'single-workflow',
    handoff: route?.handoff || null,
    produces: route?.produces || (route ? [intent.artifact] : []),
    route_id: route?.id || null,
    char_budget: route?.char_budget || null,
    estimated_token_budget: route?.estimated_token_budget || null,
    base_estimated_tokens: route ? baseEstimate.tokens : null,
    selected_optional_tokens: route ? optionalEstimate.tokens : 0,
    total_content_estimate: route ? baseEstimate.tokens + optionalEstimate.tokens : null,
    optional_budget_status: route ? (optionalBudgetPass ? 'pass' : 'fail') : 'not-applicable',
    baseline_estimated_tokens: route?.baseline_estimated_tokens || null,
    weight: route?.weight || null,
    startup_char_budget: config.startup_char_budget,
    matched_skills: matchedSkills,
    context_candidates: contextIds,
    ignored_contexts: ignoredContexts,
    invalid_contexts: invalidContexts,
    conflict,
    comparison,
    comparison_routes: comparisonRoutes,
    resolution,
    required_files_scope: comparison ? 'isolated-comparison-branches; never merge required_files'
      : profileMismatch ? 'profile-switch-required; no files exposed'
        : route?.sequence?.length > 1 ? 'shared-session-union; load deltas by load_steps' : 'runtime-required',
    budget_semantics: comparison ? 'per-isolated-branch content footprint'
      : route?.sequence?.length > 1 ? 'unique loaded-file content footprint for one shared route session; not host input telemetry'
        : 'loaded-file content footprint; not host input telemetry',
    suggestion: conflict
      ? `请选择一个 CONTEXT: ${contextIds.join(' 或 CONTEXT: ')}`
      : profileMismatch ? `切换到 installation profile ${requiredProfile || '<unknown>'} 后重新解析；当前不暴露任何文件。`
        : comparison ? '按 comparison_routes 逐 context 隔离执行；每个分支完成后清空 context，再比较产物，禁止合并 required_files。'
      : invalidContexts.length ? '显式 CONTEXT 不可用；停止加载并选择 manifest 中的 context-pack。'
        : route?.sequence?.length > 1 ? `在同一 route session 内按 ${route.id} 的 load_steps 分阶段执行；required_files 是去重内容足迹，不代表宿主实际 input token。`
          : route ? `按 ${route.id} 加载 required_files` : '请补充 PRD、Flow、Demo、审查或 UI 代码意图。',
    warnings,
    errors
  };
}

function compareFixture(file, config) {
  const fixture = readJson(file, path.basename(file));
  const manifest = fixture.manifest ? path.resolve(fixturesDir, fixture.manifest) : defaultManifest;
  const fixtureConfig = fixture.routes ? loadRouteConfig(path.resolve(fixturesDir, fixture.routes)) : config;
  const actual = resolveInput(fixture.input, {
    catalog: loadCatalog(manifest), config: fixtureConfig,
    artifact: fixture.artifact || '', context: fixture.context || '', mode: fixture.mode || '', profile: fixture.profile || '',
    contentMode: fixture.content_mode || '', optionalRules: fixture.optional_rules || [],
  });
  const errors = [];
  for (const [key, expected] of Object.entries(fixture.expected || {})) {
    if (key === 'matched_skills') {
      const ids = actual.matched_skills.map(item => item.skill).sort();
      if (JSON.stringify(ids) !== JSON.stringify([...expected].sort())) errors.push(`matched_skills expected ${expected} got ${ids}`);
    } else if (key === 'warnings_include') {
      for (const needle of expected) if (!actual.warnings.some(warning => warning.includes(needle))) errors.push(`warning missing ${needle}`);
    } else if (key === 'required_files_include') {
      for (const required of expected) if (!actual.required_files.includes(required)) errors.push(`required file missing ${required}`);
    } else if (key === 'optional_files_include') {
      for (const optional of expected) if (!actual.optional_files.includes(optional)) errors.push(`optional file missing ${optional}`);
    } else if (key === 'selected_optional_files_include') {
      for (const optional of expected) if (!actual.selected_optional_files.includes(optional)) errors.push(`selected optional file missing ${optional}`);
    } else if (key === 'asset_files_include') {
      for (const asset of expected) if (!actual.asset_files.includes(asset)) errors.push(`asset file missing ${asset}`);
    } else if (key === 'load_step_skills') {
      const skills = actual.load_steps.map(step => step.skill);
      if (JSON.stringify(skills) !== JSON.stringify(expected)) errors.push(`load_step_skills expected ${expected} got ${skills}`);
    } else if (key === 'first_step_excludes') {
      for (const prefix of expected) {
        if ((actual.load_steps[0]?.required_files || []).some(file => file.startsWith(prefix))) errors.push(`first load step must exclude ${prefix}`);
      }
    } else if (key === 'second_step_after') {
      if (actual.load_steps[1]?.after !== expected) errors.push(`second_step_after expected ${expected} got ${actual.load_steps[1]?.after}`);
    } else if (key === 'all_steps_have_context_prefix') {
      for (const prefix of expected) {
        for (const [index, step] of actual.load_steps.entries()) {
          const available = [...(step.required_files || []), ...(step.retained_context_files || [])];
          if (!available.some(file => file.startsWith(prefix))) errors.push(`load step ${index} must load or retain ${prefix}`);
        }
      }
    } else if (key === 'comparison_contexts') {
      const contexts = actual.comparison_routes.map(branch => branch.context);
      if (JSON.stringify(contexts) !== JSON.stringify(expected)) errors.push(`comparison_contexts expected ${expected} got ${contexts}`);
    } else if (key === 'comparison_route_ids') {
      const routeIds = actual.comparison_routes.map(branch => branch.route_id);
      if (JSON.stringify(routeIds) !== JSON.stringify(expected)) errors.push(`comparison_route_ids expected ${expected} got ${routeIds}`);
    } else if (key === 'comparison_isolated') {
      if (expected) {
        for (const branch of actual.comparison_routes) {
          const otherContexts = actual.context_candidates.filter(context => context !== branch.context);
          if (branch.required_files.some(filePath => otherContexts.some(context => filePath.includes(context)))) {
            errors.push(`comparison branch ${branch.context} contains another context's files`);
          }
        }
      }
    } else if (JSON.stringify(actual[key]) !== JSON.stringify(expected)) errors.push(`${key} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual[key])}`);
  }
  return { file: path.basename(file), errors, actual };
}

export function runSelfTest(routesFile = defaultRoutes) {
  const config = loadRouteConfig(routesFile);
  const files = fs.readdirSync(fixturesDir).filter(file => file.endsWith('.json')).map(file => path.join(fixturesDir, file));
  const results = files.map(file => compareFixture(file, config));
  const failed = results.filter(result => result.errors.length);
  const coveredRoutes = new Set(results.filter(result => !result.errors.length).map(result => result.actual.route_id).filter(Boolean));
  const uncoveredRoutes = (config.routes || []).map(route => route.id).filter(id => !coveredRoutes.has(id));
  if (uncoveredRoutes.length) {
    console.error(`FAIL multi-context-resolver self-test: canonical routes without positive fixture: ${uncoveredRoutes.join(', ')}`);
    process.exit(1);
  }
  if (failed.length) {
    console.error('FAIL multi-context-resolver self-test');
    for (const result of failed) console.error(`- ${result.file}: ${result.errors.join('; ')}`);
    process.exit(1);
  }
  console.log(`PASS multi-context-resolver self-test (${results.length} fixtures)`);
  for (const result of results) console.log(`- ${result.file}: ${result.actual.route_id || result.actual.resolution}`);
}


// Human-facing projection; full output remains available for audits and adapters.
export function compactPlan(result) {
  const keys = ['resolution', 'route_id', 'workflow', 'workflow_scope', 'workflow_id', 'next_actions', 'suggestion', 'artifact', 'fidelity', 'context', 'active_profile', 'required_profile', 'content_mode', 'produces', 'forbidden_skills', 'optional_budget_status', 'total_content_estimate', 'warnings', 'errors'];
  return { ...Object.fromEntries(keys.map(key => [key, result[key]])),
    load_steps: result.load_steps.map(({ file_metadata, ...step }) => step),
    ...(result.comparison_routes.length ? { comparison_routes: result.comparison_routes.map(branch => ({ ...branch, load_steps: branch.load_steps.map(({ file_metadata, ...step }) => step) })) } : {}) };
}
