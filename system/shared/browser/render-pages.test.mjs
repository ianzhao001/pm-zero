import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {renderPages} from './render-pages.mjs';

function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'render-binding-'));fs.writeFileSync(path.join(root,'index.html'),'<html>old source</html>');const plan={schema_version:1,viewport:{width:393,height:852},pages:[{id:'home',file:'index.html',output:'home.png'}]};fs.writeFileSync(path.join(root,'render-plan.json'),JSON.stringify(plan));return root;}
function mockBrowser(duringCapture){
 const target={count:async()=>1,evaluate:async()=>({width:393,height:852,text_length:40,horizontal_overflow:0,compact_overflow:[]}),screenshot:async({path:p})=>{const b=Buffer.alloc(32);Buffer.from([137,80,78,71,13,10,26,10]).copy(b);b.writeUInt32BE(1179,16);b.writeUInt32BE(2556,20);fs.writeFileSync(p,b);duringCapture();return b;}};
 const page={on(){},goto:async()=>{},evaluate:async()=>[],locator:()=>target,close:async()=>{}};
 return {version:()=> 'unit-test-renderer',newContext:async()=>({route:async()=>{},newPage:async()=>page,close:async()=>{}})};
}
test('renderer rejects source and plan changes between navigation and capture',async()=>{
 for(const kind of ['source','plan']){const root=fixture();try{
  const target=path.join(root,kind==='source'?'index.html':'render-plan.json');
  const browser=mockBrowser(()=>fs.appendFileSync(target,' '));
  await assert.rejects(renderPages({planPath:path.join(root,'render-plan.json'),outputDir:path.join(root,'render'),browser}),/changed during/);
  assert.equal(fs.existsSync(path.join(root,'render/render-report.json')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}}
});
test('renderer refuses empty plans and dangling output symlinks before capture',async()=>{
 const root=fixture();try{
  const p=path.join(root,'render-plan.json'),out=path.join(root,'render');fs.mkdirSync(out);fs.symlinkSync(path.join(root,'outside.png'),path.join(out,'home.png'));
  await assert.rejects(renderPages({planPath:p,outputDir:out,browser:mockBrowser(()=>assert.fail('capture must not run'))}),/existing PNG/);
  assert.equal(fs.existsSync(path.join(root,'outside.png')),false);
  fs.writeFileSync(p,JSON.stringify({schema_version:1,pages:[]}));await assert.rejects(renderPages({planPath:p,outputDir:out}),/Invalid render plan/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
