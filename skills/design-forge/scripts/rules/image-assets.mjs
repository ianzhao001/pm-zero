import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { extractAssetManifest,parseTagAttributes } from '../asset-manifest.mjs';
import { loadAssetCatalogs } from '../../../../system/shared/demo-assets/lib/catalog.mjs';
import { lineOf, push } from '../../../../system/shared/context-package-core/preflight-core/engine.mjs';

const root=path.resolve(import.meta.dirname,'../../../..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceUrl=entry=>typeof entry.source==='string'?entry.source:entry.source?.url;
function localImage(output,file) {
  if(typeof file!=='string'||!file||path.isAbsolute(file)||/[\\?#:]/.test(file)||file.split('/').some(p=>!p||p==='..'||p==='.')||decodeURIComponent(file)!==file)throw new Error('Unsafe local asset path');
  let current=path.dirname(path.resolve(output));
  for(const segment of file.split('/')){current=path.join(current,segment);if(fs.lstatSync(current).isSymbolicLink())throw new Error('Asset symlink is not allowed');}
  if(!fs.statSync(current).isFile())throw new Error('Asset is not a file');return current;
}
export function validateImageAssets(ctx) {
  if(!['flow','demo'].includes(ctx.mode))return;
  const images=[...ctx.html.matchAll(/<img\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)];
  if(!images.length||!/(High Fidelity|HIFI|高保真|ASSET_POLICY|data-output-intent)/i.test(ctx.html))return;
  const inventory=/ASSET_POLICY\s*:\s*INVENTORY_FIRST/i.test(ctx.html);
  const searched=/ASSET_POLICY\s*:\s*SEARCHED_RELEVANT/i.test(ctx.html);
  const error=(detail,index=0)=>push(ctx.errors,'C18',detail,lineOf(ctx.html,index));
  if(!inventory&&!searched){error('High-fidelity images require INVENTORY_FIRST or SEARCHED_RELEVANT provenance');return;}
  if(inventory&&/<(?:picture|base)\b/i.test(ctx.html)){error('INVENTORY_FIRST uses fixed verified src paths; base/picture/srcset is not supported');return;}
  let entries;
  try{entries=extractAssetManifest(ctx.html);}catch(e){error(e.message);return;}
  const byId=new Map();
  for(const e of entries){if(!e||typeof e.id!=='string'||!e.id||byId.has(e.id)||typeof e.relevance!=='string'||!e.relevance.trim()){error('Asset entries need unique id and semantic relevance');return;}byId.set(e.id,e);}
  let registered;
  for(const match of images){
    let attributes;try{attributes=parseTagAttributes(match[0]);}catch(ex){error(ex.message,match.index);continue;}
    const id=attributes['data-asset-id']||'',src=attributes.src||'',e=byId.get(id);
    if(inventory&&('srcset' in attributes||'sizes' in attributes)){error('INVENTORY_FIRST requires one fixed src, without srcset/sizes',match.index);continue;}
    if(!id||!e){error(`Image has no matching manifest entry: ${id}`,match.index);continue;}
    if(/^data:image\//i.test(src)||/assets\/(?:community|product|avatar|channel)-\d+\.(?:jpe?g|png|webp)/i.test(src)){error('Inline or untraceable numbered image asset',match.index);continue;}
    if(inventory){
      try{
        if(!['preset','retrieved','user-approved','generated-authorized'].includes(e.origin))throw new Error('Inventory policy requires an explicit asset origin');
        if(src!==e.file||!/^[a-f0-9]{64}$/.test(e.sha256??''))throw new Error('Asset src/file/hash mismatch');
        if(hash(fs.readFileSync(localImage(ctx.file,e.file)))!==e.sha256)throw new Error('Output asset bytes differ from manifest');
        if(e.origin==='preset'){
          const context=parseTagAttributes(ctx.html.match(/<html\b[^>]*>/i)?.[0]??'<html>')['data-brand']||'none';
          registered??=loadAssetCatalogs({root,context}).entries;
          const canonical=registered.find(a=>a.id===id&&a.catalog_id===e.catalog_id);
          if(!canonical||canonical.sha256!==e.sha256||canonical.catalog_version!==e.catalog_version||canonical.catalog_sha256!==e.catalog_sha256)throw new Error('Unknown, cross-context or stale preset asset');
        }else if(e.origin==='retrieved'){
          if(!/^https?:\/\//.test(sourceUrl(e)??'')||typeof e.query!=='string'||!e.query.trim())throw new Error('Retrieved asset needs its actual query and source');
        }else if(!e.authorization_reference)throw new Error('Non-catalog user/generated asset requires explicit authorization provenance');
      }catch(ex){error(`${id}: ${ex.message}`,match.index);}
    }else if(typeof e.query!=='string'||!e.query.trim()||!/^https?:\/\//.test(sourceUrl(e)??''))error('Searched assets require query/source/relevance',match.index);
  }
  if(/\b(?:random(?:ly)? generated|generated placeholder|placeholder image|dummy image|ph-img)\b/i.test(ctx.html))error('Untraceable placeholder raster is not a high-fidelity asset');
}
