#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RuleRegistry, runChecks } from '../../../system/shared/context-package-core/preflight-core/engine.mjs';
import commonRules from './rules/common.mjs';
import flowRules from './rules/flow.mjs';
import demoRules from './rules/demo.mjs';
import versionRules from './rules/version.mjs';

function registry() {
  return new RuleRegistry()
    .register('common', commonRules)
    .register('flow', flowRules)
    .register('demo', demoRules)
    .register('version', versionRules);
}

async function loadRuleModule(rulePath) {
  if (!rulePath) return [];
  const resolved = path.isAbsolute(rulePath) ? rulePath : path.resolve(process.cwd(), rulePath);
  const mod = await import(pathToFileURL(resolved).href);
  return mod.default || mod.rules || [];
}

function validFlow() {
  return `<!doctype html><html><head><!-- MODE: MODE_FLOW --><style>body{overflow-x:auto}.btn{white-space:nowrap}.canvas{}.rail{overflow-x:auto}.phone-shell{width:320px;height:694px;border-radius:44px;padding:7px}.phone-shell:before{content:""}.phone-screen{overflow:hidden}.content{overflow-y:auto;overflow-x:hidden}.tabbar{grid-template-columns:repeat(4,1fr)}</style></head><body><div class="signature">Prototype Lab</div><main class="canvas"><header>中文主语言流程稿，入口、详情、状态和讨论都使用中文页面文案。</header><div class="rail"><div class="phone-shell"><div class="phone-screen"><div class="content">入口内容与状态说明</div></div></div></div></main><script>window.SCREENS=[{id:"entry",title:"入口页"}];window.ARROWS={};</script></body></html>`;
}

function validDemo() {
  return `<!doctype html><html><head><!-- MODE: MODE_DEMO --><style>:root{--ease-ios:cubic-bezier(.32,.72,0,1)}.btn{white-space:nowrap}.workbench{place-content:center}.phone-shell{width:320px;height:694px;border-radius:44px;padding:7px}.phone-shell:before{content:""}.phone-screen{overflow:hidden}.content{overflow-y:auto;overflow-x:hidden}.chrome-layer,.body-container{}.nav{backdrop-filter:blur(10px)}@media (prefers-reduced-motion: reduce){*{animation-duration:1ms}}</style></head><body><div class="signature">Prototype Lab</div><div class="workbench"><div class="phone-shell"><div class="phone-screen"><div class="body-container"><div class="content">中文主语言演示，当前页面展示入口、详情、状态和讨论承接。</div></div><div class="chrome-layer"></div></div></div><aside class="hud"><div class="hud-title">演示控制台</div><div class="hud-current">当前路由：入口</div><div class="hud-kv">状态：就绪</div><div class="hud-jump">跳转</div><div class="hud-controls">返回</div><div class="hud-log">事件日志</div></aside></div><script>const ready="中文演示就绪";</script></body></html>`;
}

function selfTest() {
  const cases = [
    { name: 'flow pass', html: validFlow(), mode: 'flow', errors: 0 },
    { name: 'demo pass', html: validDemo(), mode: 'demo', errors: 0 },
    { name: 'C00 missing mode', html: validFlow().replace('<!-- MODE: MODE_FLOW -->', ''), mode: 'flow', rule: 'C00' },
    { name: 'C00 conflicting mode', html: validFlow().replace('MODE_FLOW', 'MODE_DEMO'), mode: 'flow', rule: 'C00' },
    { name: 'C01 temporary color', html: validFlow().replace('</style>', '.x{color:#000000}</style>'), mode: 'flow', rule: 'C01' },
    { name: 'C02 hand font', html: validFlow().replace('.btn', '.x{font-family:Caveat}.btn'), mode: 'flow', rule: 'C02' },
    { name: 'C03 placeholder', html: validFlow().replace('Prototype Lab', 'John Doe'), mode: 'flow', rule: 'C03' },
    { name: 'C04 button nowrap', html: validFlow().replace('white-space:nowrap', 'display:inline-flex'), mode: 'flow', rule: 'C04' },
    { name: 'C05 syntax', html: validFlow().replace('window.ARROWS={};', 'const = ;'), mode: 'flow', rule: 'C05' },
    { name: 'C08 missing phone shell', html: validFlow().replace(/phone-shell/g, 'phone-frame'), mode: 'flow', rule: 'C08' },
    { name: 'C10 missing scroll surface', html: validFlow().replace('overflow-y:auto', 'overflow:hidden'), mode: 'flow', rule: 'C10' },
    { name: 'C11 non-Chinese primary language', html: validFlow().replace(/中文主语言流程稿，入口、详情、状态和讨论都使用中文页面文案。|入口内容与状态说明|入口页/g, 'English first mobile flow with route text and page copy.'), mode: 'flow', rule: 'C11' },
    { name: 'C12 phone internal horizontal scroll', html: validFlow().replace('overflow-y:auto;overflow-x:hidden', 'overflow-y:auto'), mode: 'flow', rule: 'C12' },
    { name: 'C13 feed bottom artificial blank', html: validFlow().replace('</style>', '.scroll-inner{min-height:1600px}.feed-grid{display:grid}</style>').replace('入口内容与状态说明', '<div class="scroll-inner"><section class="feed-grid">入口内容与状态说明</section></div>'), mode: 'flow', rule: 'C13' },
    { name: 'F01 missing canvas', html: validFlow().replace('class="canvas"', 'class="board"').replace('.canvas{}', '.board{}'), mode: 'flow', rule: 'F01' },
    { name: 'F02 missing declarations', html: validFlow().replace('window.SCREENS=[{id:"entry",title:"入口页"}];window.ARROWS={};', 'const x=1;'), mode: 'flow', rule: 'F02' },
    { name: 'F03 demo marker', html: validFlow().replace('</style>', '.chrome-layer{}</style>'), mode: 'flow', rule: 'F03' },
    { name: 'F04 missing rail scroll', html: validFlow().replace(/overflow-x:auto/g, 'overflow-x:visible'), mode: 'flow', rule: 'F04' },
    { name: 'D01 missing shell', html: validDemo().replace(/chrome-layer/g, 'chrome-x'), mode: 'demo', rule: 'D01' },
    { name: 'D02 missing glass', html: validDemo().replace(/backdrop-filter/g, 'filter'), mode: 'demo', rule: 'D02' },
    { name: 'D03 missing HUD block', html: validDemo().replace('hud-log', 'hud-feed'), mode: 'demo', rule: 'D03' },
    { name: 'D05 phone not centered', html: validDemo().replace('place-content:center', 'justify-self:end'), mode: 'demo', rule: 'D05' },
    { name: 'V01 missing block', html: validFlow(), mode: 'flow', file: 'demo-v2.html', rule: 'V01' },
  ];
  let failed = 0;
  const reg = registry();
  console.log('design-forge preflight self-test');
  cases.forEach((c, i) => {
    const result = runChecks(c.html, c.file || c.name + '.html', c.mode, reg);
    const entries = result.errors.concat(result.warnings);
    const ok = c.errors === 0
      ? result.errors.length === 0
      : entries.some(entry => entry.rule === c.rule);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${String(i + 1).padStart(2, '0')} ${c.name} errors=${result.errors.length} warnings=${result.warnings.length}`);
    if (!ok) {
      failed += 1;
      console.log(JSON.stringify(result, null, 2));
    }
  });
  return failed;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    const failed = selfTest();
    process.exit(failed ? 1 : 0);
  }
  const file = args.find(a => !a.startsWith('--'));
  const modeOpt = args.find(a => a.startsWith('--mode='));
  const ruleOpt = args.find(a => a.startsWith('--brand-rules='));
  if (!file) {
    console.error('usage: node scripts/preflight.mjs <html_file_path> [--mode=flow|demo] [--brand-rules=path/to/rules.mjs]');
    process.exit(2);
  }
  const reg = registry();
  const extraRules = await loadRuleModule(ruleOpt ? ruleOpt.split('=')[1] : '');
  if (extraRules.length) reg.register('brand', extraRules);
  const html = fs.readFileSync(file, 'utf8');
  const modeArg = modeOpt ? modeOpt.split('=')[1] : undefined;
  const result = runChecks(html, file, modeArg, reg);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.errors.length ? 1 : 0);
}

main().catch(error => {
  console.error(error);
  process.exit(2);
});
