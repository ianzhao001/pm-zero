#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
const require=createRequire(import.meta.url);
const {createPlaywrightBrowserLauncher}=require('./playwright-browser.cjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const exists=p=>{try{fs.lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
function relativeFile(value){if(typeof value!=='string'||!value||path.isAbsolute(value)||/[\\?#:]/.test(value)||value.split('/').some(x=>!x||x==='.'||x==='..'))throw new Error(`Unsafe render path: ${value}`);return value;}
function inputFile(root,file){const target=path.join(root,relativeFile(file));let cursor=root;for(const part of file.split('/')){cursor=path.join(cursor,part);if(fs.lstatSync(cursor).isSymbolicLink())throw new Error('Render input symlink is not allowed');}if(!fs.statSync(target).isFile())throw new Error('Render input must be a file');return target;}
export async function createRenderBrowser(){return createPlaywrightBrowserLauncher({label:'Demo export',envVar:'PM_ZERO_RENDER_BROWSER'}).launchBrowser();}
export async function renderPages({planPath,outputDir,browser:providedBrowser}={}){
 const start=performance.now(),planFile=path.resolve(planPath),sourceRoot=path.dirname(planFile),planBytes=fs.readFileSync(planFile),planHash=sha(planBytes),plan=JSON.parse(planBytes);
 const receiptPath=path.join(sourceRoot,'asset-receipt.json'),receiptBytes=exists(receiptPath)?fs.readFileSync(receiptPath):null;
 const receiptHash=receiptBytes?sha(receiptBytes):null,assetBindings=receiptBytes?JSON.parse(receiptBytes).assets:[];
 if(!Array.isArray(assetBindings))throw new Error('Invalid asset receipt');
 const verifyBindings=()=>{if(sha(fs.readFileSync(planFile))!==planHash)throw new Error('Render plan changed during execution');if(receiptHash&&sha(fs.readFileSync(receiptPath))!==receiptHash)throw new Error('Asset receipt changed during execution');for(const asset of assetBindings){if(sha(fs.readFileSync(inputFile(sourceRoot,asset.file)))!==asset.sha256)throw new Error('Asset bytes differ from render receipt: '+asset.id);}};
 verifyBindings();
 const out=path.resolve(outputDir||sourceRoot),viewport=plan.viewport||{width:393,height:852},scale=plan.device_scale_factor??3;
 let ancestor=out;while(ancestor!==path.dirname(ancestor)){if(!['/tmp','/var'].includes(ancestor)&&fs.existsSync(ancestor)&&fs.lstatSync(ancestor).isSymbolicLink())throw new Error('Render output ancestor symlink is not allowed');ancestor=path.dirname(ancestor);}
 if(plan.schema_version!==1||!Array.isArray(plan.pages)||!plan.pages.length||plan.pages.length>24||!Number.isInteger(viewport.width)||!Number.isInteger(viewport.height)||viewport.width<200||viewport.width>1800||viewport.height<200||viewport.height>2800||![1,1.5,2,3].includes(scale))throw new Error('Invalid render plan');
 const ids=new Set(),outputs=new Set();
 if(exists(path.join(out,'render-report.json')))throw new Error('Refusing to overwrite existing render report');
 for(const p of plan.pages){if(!/^[a-z0-9][a-z0-9-]*$/.test(p.id)||ids.has(p.id))throw new Error('Invalid/duplicate page id');ids.add(p.id);inputFile(sourceRoot,p.file);relativeFile(p.output);if(!p.output.endsWith('.png')||outputs.has(p.output)||exists(path.join(out,p.output)))throw new Error('Duplicate/existing PNG destination');outputs.add(p.output);if(p.fragment&&!/^[a-z0-9-]+$/.test(p.fragment))throw new Error('Invalid page fragment');}
 fs.mkdirSync(out,{recursive:true});
 const launchStart=performance.now(),browser=providedBrowser||await createRenderBrowser(),launchMs=performance.now()-launchStart;
 const context=await browser.newContext({viewport,deviceScaleFactor:scale,offline:true,reducedMotion:'reduce'}),records=[],remoteRequests=[];
 await context.route(/^https?:\/\//,route=>{remoteRequests.push(route.request().url());return route.abort();});
 try{
  for(const spec of plan.pages){
   const page=await context.newPage(),errors=[],started=performance.now();page.on('pageerror',e=>errors.push(e.message));
   const file=inputFile(sourceRoot,spec.file),sourceHash=sha(fs.readFileSync(file)),url=pathToFileURL(file);if(spec.fragment)url.hash=spec.fragment;
   await page.goto(url.href,{waitUntil:'load',timeout:15000});await page.evaluate(()=>document.fonts.ready);
   const imageProblems=await page.evaluate(()=>[...document.images].filter(e=>!e.complete||!e.naturalWidth).map(e=>e.getAttribute('src')));
   const target=page.locator(spec.selector||'.phone-screen');if(await target.count()!==1)throw new Error(`${spec.id}: screenshot selector must match exactly one surface`);
   const measurements=await target.evaluate(root=>{
    const box=root.getBoundingClientRect(),visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
    const compact=[...root.querySelectorAll('button,.product-card,.cart-item,.message-row,.bottom-tabs')].filter(visible);
    return {width:box.width,height:box.height,text_length:root.innerText.trim().length,horizontal_overflow:root.scrollWidth-root.clientWidth,compact_overflow:compact.filter(e=>e.scrollWidth-e.clientWidth>1).map(e=>e.tagName+'.'+e.className)};
   });
   if(errors.length||imageProblems.length||measurements.text_length<16||measurements.horizontal_overflow>1||measurements.compact_overflow.length)throw new Error(`${spec.id}: invalid render ${JSON.stringify({errors,imageProblems,measurements})}`);
   const output=path.join(out,spec.output);
   // Never traverse symlink output directories.
   let parent=out;for(const part of spec.output.split('/').slice(0,-1)){parent=path.join(parent,part);if(exists(parent)){if(fs.lstatSync(parent).isSymbolicLink()||!fs.statSync(parent).isDirectory())throw new Error('Render output directory must not be a symlink');}else fs.mkdirSync(parent);}
   const captureStart=performance.now(),bytes=await target.screenshot({path:output,type:'png',animations:'disabled'});
   if(bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Renderer did not return a PNG');
   if(sha(fs.readFileSync(file))!==sourceHash)throw new Error('Source changed during render: '+spec.id);verifyBindings();
   records.push({id:spec.id,source_file:file,source_sha256:sourceHash,output,sha256:sha(bytes),bytes:bytes.length,width_px:bytes.readUInt32BE(16),height_px:bytes.readUInt32BE(20),duration_ms:performance.now()-started,capture_ms:performance.now()-captureStart,measurements});await page.close();
  }
  if(remoteRequests.length)throw new Error(`Render attempted ${remoteRequests.length} remote requests`);
  verifyBindings();
  const report={schema_version:1,pass:true,renderer:browser.version(),plan_sha256:planHash,asset_receipt_sha256:receiptHash,output_root:out,browser_reused:Boolean(providedBrowser),launch_ms:launchMs,total_ms:performance.now()-start,network_requests:remoteRequests.length,records};
  fs.writeFileSync(path.join(out,'render-report.json'),JSON.stringify(report,null,2)+'\n');return report;
 }finally{await context.close();if(!providedBrowser)await browser.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{const args=process.argv.slice(2);const get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;const planPath=get('--plan');if(!planPath)throw new Error('Usage: render-pages.mjs --plan render-plan.json [--output-dir new-directory]');console.log(JSON.stringify(await renderPages({planPath,outputDir:get('--output-dir')}),null,2));}catch(e){console.error(e.stack||e.message);process.exitCode=1;}}
