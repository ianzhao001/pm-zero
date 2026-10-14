#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
const directory=get('--directory');if(!directory)throw new Error('Usage: report-demo-validation.mjs --directory ARTIFACT --render-report report.json [--preflight preflight.json] [--review review.json]');
const root=path.resolve(directory),read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const generation=read(path.join(root,'generation-record.json')),assets=read(path.join(root,'asset-receipt.json')),render=read(get('--render-report'));
const hashFile=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const plan=read(path.join(root,'render-plan.json'));
if(!Array.isArray(plan.pages)||!plan.pages.length||!Array.isArray(render.records)||!render.records.length||render.records.length!==plan.pages.length||new Set(render.records.map(r=>r.id)).size!==render.records.length||new Set(plan.pages.map(p=>p.id)).size!==plan.pages.length)throw new Error('Render report must cover a nonempty complete page set');
if(render.plan_sha256!==hashFile(path.join(root,'render-plan.json'))||render.asset_receipt_sha256!==hashFile(path.join(root,'asset-receipt.json')))throw new Error('Render plan/asset receipt hash drift');
for(const p of plan.pages){const record=render.records.find(r=>r.id===p.id);if(!record||path.resolve(record.source_file)!==path.resolve(root,p.file)||!render.output_root||path.resolve(record.output)!==path.resolve(render.output_root,p.output))throw new Error('Render output does not match current plan: '+p.id);}
for(const asset of assets.assets){if(!asset.file||path.isAbsolute(asset.file)||asset.file.split(/[\\/]/).includes('..')||hashFile(path.join(root,asset.file))!==asset.sha256)throw new Error('Current output asset drift');}
const pre=get('--preflight')?read(get('--preflight')):null,review=get('--review')?read(get('--review')):null;
if(pre&&pre.source_sha256!==createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex'))throw new Error('Preflight report is not bound to current index.html');
for(const item of render.records){const digest=createHash('sha256').update(fs.readFileSync(item.output)).digest('hex');if(digest!==item.sha256)throw new Error('Rendered output drift: '+item.output);if(createHash('sha256').update(fs.readFileSync(item.source_file)).digest('hex')!==item.source_sha256)throw new Error('Source changed after rendering: '+item.source_file);}
if(review){if(typeof review.author!=='string'||!review.author.trim()||!Array.isArray(review.outputs)||!render.records.every(r=>review.outputs.some(o=>o.id===r.id&&o.sha256===r.sha256)))throw new Error('Independent review must bind each current output id and SHA-256 and declare its author');}
const requirementsPass=render.pass===true&&pre?.pass===true&&review?.pass===true&&assets.missing.length===0;
const report={pass:Boolean(requirementsPass),status:!pre||!review?'pending independent acceptance':requirementsPass?'passed':'failed',artifact:generation.artifact,context:generation.context,metrics:{template_generation_ms:Object.values(generation.phases).reduce((a,b)=>a+b,0),render_ms:render.total_ms,inventory_hits:assets.assets.filter(a=>a.origin==='preset').length,retrieved_assets:assets.assets.filter(a=>a.origin==='retrieved').length,missing_slots:assets.missing.length,network_requests:generation.network_requests+render.network_requests},warnings:pre?.warnings||[],outputs:render.records.map(r=>({path:r.output,sha256:r.sha256})),review:review||{pass:false,note:'Independent review has not been provided'},scope:'Script timings/network counts exclude host reasoning, host retrieval, manual review and user waits.'};
fs.writeFileSync(path.join(root,'quality-report.json'),JSON.stringify(report,null,2)+'\n');
const markdown=`# Demo 验证报告\n\n状态：${report.status}\n\n- context: ${report.context}\n- artifact: ${report.artifact}\n- 库存命中: ${report.metrics.inventory_hits}\n- 缺口: ${report.metrics.missing_slots}\n- 网络请求: ${report.metrics.network_requests}\n- 模板生成: ${report.metrics.template_generation_ms.toFixed(1)} ms\n- 渲染: ${report.metrics.render_ms.toFixed(1)} ms\n\n脚本时间不等于 Agent 完整交付耗时；独立审查缺失时不标记完成。\n\n${report.outputs.map(o=>`- [${path.basename(o.path)}](${o.path}) · ${o.sha256}`).join('\n')}\n\n## 提示\n${report.warnings.map(w=>`- ${w.rule}: ${w.detail}`).join('\n')||'无'}\n`;
fs.writeFileSync(path.join(root,'QUALITY.md'),markdown);console.log(JSON.stringify(report,null,2));
if(report.status==='failed')process.exitCode=1;else if(!report.pass)process.exitCode=2;
