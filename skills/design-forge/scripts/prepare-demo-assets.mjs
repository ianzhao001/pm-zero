#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { loadAssetCatalogs, materializeAssets } from '../../../system/shared/demo-assets/lib/catalog.mjs';

export function resolveSlots(entries, slots) {
  if(!Array.isArray(slots))throw new Error('slots must be an array');
  const selected=[],missing=[],used=new Set(),slotIds=new Set();
  for(const slot of slots){
    if(!slot||typeof slot.id!=='string'||!slot.id||slotIds.has(slot.id))throw new Error('Slot ids must be nonempty and unique');slotIds.add(slot.id);
    const count=slot.count??1;if(!Number.isInteger(count)||count<1||count>32)throw new Error('Slot count must be 1..32');
    if(!Array.isArray(slot.tags)||slot.tags.some(t=>typeof t!=='string'||!t))throw new Error('Each slot needs semantic tags');
    if(!slot.tags.length&&!slot.asset_id)throw new Error('Slot needs tags or an explicit asset_id');
    const candidates=entries.filter(e=>(!slot.asset_id||e.id===slot.asset_id)&&slot.tags.every(t=>e.tags.includes(t)))
      .sort((a,b)=>Number(b.context!==null)-Number(a.context!==null)||a.id.localeCompare(b.id));
    const chosen=candidates.filter(e=>slot.allow_reuse||!used.has(e.id)).slice(0,count);
    for(const asset of chosen){used.add(asset.id);selected.push({slot_id:slot.id,id:asset.id,relevance:slot.relevance||`Selected for ${slot.id}: ${slot.tags.join(', ')}`});}
    if(chosen.length<count)missing.push({slot_id:slot.id,tags:slot.tags,missing_count:count-chosen.length,query:slot.query||slot.tags.join(' ')});
  }
  return {selected,missing};
}

export function prepareDemoAssets({root,context='none',slots,outputDir}) {
  const start=performance.now();const inventory=loadAssetCatalogs({root,context});
  const resolved=resolveSlots(inventory.entries,slots);
  const result=materializeAssets({root,context,ids:[...new Set(resolved.selected.map(s=>s.id))],outputDir});
  if(result.missing_ids.length)throw new Error(`Resolved assets disappeared: ${result.missing_ids.join(', ')}`);
  for(const a of result.assets)a.relevance=resolved.selected.filter(s=>s.id===a.id).map(s=>s.relevance).join('; ');
  const receipt={schema_version:1,context,policy:'INVENTORY_FIRST',assets:result.assets,slots:resolved.selected,missing:resolved.missing,retrieval_required:resolved.missing.length>0,network_requests:0,asset_bytes:result.asset_bytes,duration_ms:performance.now()-start};
  fs.mkdirSync(outputDir,{recursive:true});fs.writeFileSync(path.join(outputDir,'asset-receipt.json'),JSON.stringify(receipt,null,2)+'\n');return receipt;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const args=process.argv.slice(2),get=(key,defaultValue)=>{const i=args.indexOf(key);return i<0?defaultValue:args[i+1];};
    const root=path.resolve(get('--root',path.resolve(import.meta.dirname,'../../..'))),context=get('--context','none');
    if(args.includes('--list')){
      const inv=loadAssetCatalogs({root,context}),tags=get('--tags','').split(',').filter(Boolean),limit=Number(get('--limit','20'));
      if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('List limit must be 1..100');
      const selected=inv.entries.filter(e=>tags.every(t=>e.tags.includes(t)));
      console.log(JSON.stringify({context,total_matches:selected.length,assets:selected.slice(0,limit).map(e=>({id:e.id,tags:e.tags,width:e.width,height:e.height})),catalogs:inv.catalogs.map(c=>({id:c.id,version:c.version,sample_data:c.sample_data?.relativePath}))},null,2));
    }else{
      const slotsFile=get('--slots'),outputDir=get('--output');if(!slotsFile||!outputDir)throw new Error('Usage: prepare-demo-assets.mjs --context none|<brand> --list | --slots slots.json --output <dir> [--root <repo>]');
      const receipt=prepareDemoAssets({root,context,slots:JSON.parse(fs.readFileSync(slotsFile,'utf8')),outputDir:path.resolve(outputDir)});
      console.log(JSON.stringify(receipt,null,2));if(receipt.retrieval_required)process.exitCode=2;
    }
  }catch(e){console.error(e.message);process.exitCode=1;}
}
