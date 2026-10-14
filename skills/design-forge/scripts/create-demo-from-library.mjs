#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { loadAssetCatalogs } from '../../../system/shared/demo-assets/lib/catalog.mjs';
import { prepareDemoAssets } from './prepare-demo-assets.mjs';

const repo=path.resolve(import.meta.dirname,'../../..');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const hash=b=>createHash('sha256').update(b).digest('hex');

export function createLibraryDemo({root=repo,context='none',outputDir,artifact='demo',screens,title}){
 const started=performance.now();if(!['demo','flow'].includes(artifact))throw new Error('artifact must be demo or flow');
 const allowed=['home','feed','messages','cart','profile','assistant','purchase','explore'];
 const out=path.resolve(outputDir);if(fs.existsSync(out)&&fs.readdirSync(out).length)throw new Error('Refusing to overwrite a nonempty output directory');
 const inventory=loadAssetCatalogs({root,context});
 const common=inventory.catalogs.find(c=>c.context===null),brand=inventory.catalogs.find(c=>c.context===context);
 const dataCatalog=brand?.sample_data?brand:common;if(!dataCatalog?.sample_data)throw new Error('Selected context needs sample data');
 const data=JSON.parse(fs.readFileSync(dataCatalog.sample_data.absolutePath,'utf8'));
 if(!data.ui||!Array.isArray(data.products)||!data.products.length)throw new Error('Demo data needs ui and products');
 const ui=data.ui,productIds=new Set();
 screens??=[...new Set(ui.bottom_tabs.map(t=>t.id).concat(['messages','cart','assistant']))];
 if(!Array.isArray(screens)||!screens.length||new Set(screens).size!==screens.length||screens.some(s=>!allowed.includes(s)))throw new Error('Invalid or duplicate screen archetypes');
 for(const p of data.products){if(!p.id||productIds.has(p.id)||!Number.isFinite(p.price)||p.price<0)throw new Error('Invalid product identity/price');productIds.add(p.id);}
 const referenced=[...new Set([...(data.products||[]).map(p=>p.asset_id),...(data.messages||[]).map(m=>m.avatar_id),data.profile?.avatar_id,...(ui.bottom_tabs||[]).map(t=>t.icon)].filter(Boolean))];
 const controls=['search','message','back','star','chevron-right','bell','cart','heart'].map(id=>'common:icon-'+id);
 const slots=[...new Set([...referenced,...controls])].map(id=>({id,asset_id:id,tags:[],allow_reuse:true,relevance:`Approved sample content and UI control ${id}`}));
 if(screens.includes('assistant'))slots.push({id:'assistant-food',tags:['food'],count:6,allow_reuse:true,relevance:'Six distinct recommendation thumbnails'});
 if(screens.includes('feed'))slots.push({id:'feed-lifestyle',tags:['lifestyle'],count:2,allow_reuse:true,relevance:'Community lifestyle content'});
 const receipt=prepareDemoAssets({root,context,slots,outputDir:out});
 if(receipt.retrieval_required)throw new Error(`Material gaps: ${JSON.stringify(receipt.missing)}`);
 const byId=new Map(receipt.assets.map(a=>[a.id,a]));
 const image=(id,cls='',alt='')=>{const a=byId.get(id);if(!a)throw new Error(`Unresolved image ${id}`);return `<img src="${esc(a.file)}" data-asset-id="${esc(id)}" class="${cls}" alt="${esc(alt)}">`;};
 const icon=id=>image(`common:icon-${id}`,'icon',id);
 const food=receipt.slots.filter(s=>s.slot_id==='assistant-food').map(s=>s.id);
 const lifestyle=receipt.slots.filter(s=>s.slot_id==='feed-lifestyle').map(s=>s.id);
 const cards=()=>data.products.map(p=>`<article class="product-card" data-product-id="${esc(p.id)}">${image(p.asset_id,'',p.title)}<p>${esc(p.title)}</p><span class="meta">${esc(p.color)} · 品质精选</span><div class="price">¥${p.price}<button class="btn" data-add="${esc(p.id)}" aria-label="加入购物车">+</button></div></article>`).join('');
 const services=()=>`<div class="services">${(data.services||[{title:'订单与售后'},{title:'收货地址'},{title:'帮助中心'}]).map(s=>`<div class="service-row" data-feedback="${esc(s.title)}">${icon('star')}<span>${esc(s.title)}</span>${image('common:icon-chevron-right','icon chevron','更多')}</div>`).join('')}</div>`;
 function content(id){
  if(id==='home'||id==='purchase')return `<div class="search">${icon('search')}<span>搜索想要的好物</span></div><div class="chips"><span class="chip active">推荐</span><span class="chip">新品</span><span class="chip">精选好物</span><span class="chip">品质生活</span></div><div class="section-title"><h3>${esc(ui.primary_title||'发现好物')}</h3><span>为你精选</span></div><div class="product-grid">${cards()}</div>`;
  if(id==='feed')return lifestyle.map((asset,i)=>`<article class="feed-card"><header>${image(data.profile.avatar_id,'avatar','头像')}<strong>生活记录 ${i+1}</strong></header><p>${i?'把日常走成喜欢的风景':'给生活留一点舒适的空间'}</p>${image(asset,'media','生活方式内容')}<footer><span>刚刚 · 精选内容</span><button data-like="post-${i}">喜欢 <span>12</span></button></footer></article>`).join('');
  if(id==='messages')return `<div class="message-categories">${[['message','会话'],['bell','通知'],['cart','订单'],['heart','互动']].map(([i,t])=>`<div>${icon(i)}${t}</div>`).join('')}</div><div class="messages-panel">${data.messages.map((m,i)=>`<div class="message-row" data-feedback="${esc(m.title)}">${image(m.avatar_id,'avatar','会话头像')}<div><h3>${esc(m.title)}</h3><p>${esc(m.preview)}</p></div><small>${i?'昨天':'刚刚'}</small></div>`).join('')}</div>`;
  if(id==='cart')return data.products.map(p=>`<article class="cart-item" data-product-id="${esc(p.id)}">${image(p.asset_id,'',p.title)}<div class="cart-copy"><h3>${esc(p.title)}</h3><p>${esc(p.color)} · 标准款</p><strong>¥${p.price}</strong><div class="quantity"><button data-quantity="${esc(p.id)}" data-delta="-1" aria-label="减少数量">−</button><span data-count="${esc(p.id)}">1</span><button data-quantity="${esc(p.id)}" data-delta="1" aria-label="增加数量">+</button></div></div></article>`).join('');
  if(id==='profile')return `<div class="profile-hero">${image(data.profile.avatar_id,'avatar','头像')}<div><h3>${esc(data.profile.display_name)}</h3><p>发现值得收藏的好物</p></div></div><div class="metrics"><div><b>12</b><span>收藏</span></div><div><b>8</b><span>关注</span></div><div><b>3</b><span>订单</span></div></div>${services()}`;
  if(id==='explore')return `<div class="section-title"><h3>服务与发现</h3></div>${services()}`;
  return `<div class="assistant-welcome">${image(data.profile.avatar_id,'avatar','助手头像')}<h3>今天想发现什么好物？</h3></div><div class="assistant-cards">${['早餐灵感','今日推荐'].map((t,i)=>`<section class="assistant-card"><h3>${t}</h3><small>为日常多一点选择</small><div class="assistant-thumbs">${food.slice(i*3,i*3+3).map(a=>image(a,'','推荐食品')).join('')}</div></section>`).join('')}</div><div class="questions">${['想找一款日常通勤好物','有什么健康早餐推荐','帮我整理一下购物清单'].map(q=>`<button data-question="${q}">${q}</button>`).join('')}</div><div class="assistant-reply" hidden></div>`;
 }
 const titles=ui.screen_titles||{},screenTitle=id=>titles[id]||({purchase:'购买',explore:'探索'})[id]||id;
 const tabs=selected=>`<nav class="bottom-tabs">${ui.bottom_tabs.map(t=>`<button class="tab ${t.id===selected?'active':''}" data-nav="${esc(t.id)}">${image(t.icon,'icon',t.label)}<span>${esc(t.label)}</span></button>`).join('')}</nav>`;
 const status='<div class="status"><span>9:41</span><div class="device-island"></div><span class="status-right">▂▄▆　80%</span></div>';
 const secondary=id=>!ui.bottom_tabs.some(t=>t.id===id);
 const top=id=>`<div class="topbar"><h2>${esc(screenTitle(id))}</h2><button data-nav="${secondary(id)?ui.bottom_tabs[0].id:'assistant'}" aria-label="${secondary(id)?'返回':'助手'}">${icon(secondary(id)?'back':'message')}</button></div>`;
 const dock=id=>id==='cart'?`<div class="checkout"><span>合计</span><strong data-total>¥${data.products.reduce((sum,p)=>sum+p.price,0).toFixed(2)}</strong><button class="btn" data-checkout>结算预览</button></div>`:id==='assistant'?'<div class="input-dock"><input aria-label="需求" placeholder="说说你的需要"><button class="btn" data-send>发送</button></div>':'';
 const css=fs.readFileSync(path.join(root,'skills/design-forge/assets/demo-shell/library.css'),'utf8');
 const runtime=fs.readFileSync(path.join(root,'skills/design-forge/assets/demo-shell/core.js'),'utf8').replace(/^export function /m,'function ');
 const rendered=[];
 for(const fileId of ['index',...(artifact==='flow'?screens:[])]){
  const visible=artifact==='demo'?[screens[0]]:fileId==='index'?screens:[fileId];
  const htmlHead=`<!doctype html><html lang="zh-CN" data-brand="${esc(context)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>${esc(title||ui.brand_name)} · 物料库示例</title><!-- MODE: MODE_${artifact==='demo'?'DEMO':'FLOW'} --><!-- ASSET_POLICY: INVENTORY_FIRST --><style>${css}\n:root{--accent:${/^#[a-f\d]{6}$/i.test(ui.accent)?ui.accent:'#2563eb'}}${artifact==='demo'?'.workbench{display:flex;gap:26px;place-content:center;max-width:850px;margin:0 auto}.chrome-layer{position:absolute;inset:0;pointer-events:none;z-index:4}.chrome-layer>*{pointer-events:auto}.body-container{height:100%}.screen[hidden]{display:none}.screen.is-entering{animation:enter 180ms var(--ease-standard)}@keyframes enter{from{opacity:.6}}':''}</style></head>`;
  let body=`<body class="${fileId==='index'?'':'single'}"><main class="canvas"><header class="canvas-header"><h1>${esc(title||ui.brand_name)} · 常见页面</h1><p>${esc(ui.subtitle||'离线物料与示例内容')} · ${artifact==='demo'?'可点击组件演示':'静态组件预览'}</p></header><div class="${artifact==='demo'?'workbench':'rail'}">`;
  if(artifact==='demo'){
    body+=`<div class="phone-shell"><div class="phone-screen">${status}<div class="topbar"><h2 data-current-title>${esc(screenTitle(screens[0]))}</h2><button data-nav="assistant" data-chrome-action aria-label="助手">${icon('message')}</button></div><div class="body-container"><div class="app-body">${screens.map((id,i)=>`<section class="screen" data-screen-id="${id}" ${i?'hidden':''}><div class="content">${content(id)}</div>${dock(id)}</section>`).join('')}</div></div><div class="chrome-layer">${tabs(screens[0])}</div><div class="toast" hidden></div></div></div><aside class="hud"><h2 class="hud-title">演示控制台</h2><div class="hud-current"></div><div class="hud-kv">模拟数据，未接入交易或AI服务。原型用于组件与素材验证，不代表真实品牌功能全集。</div><div class="hud-jump">${screens.map(id=>`<button class="btn secondary" data-nav="${id}">${esc(screenTitle(id))}</button>`).join('')}</div><div class="hud-controls"><button class="btn secondary" data-back>返回</button><button class="btn secondary" data-reset>重置</button></div><pre class="hud-log"></pre></aside>`;
  }else for(const id of visible)body+=`<article><div class="phone-shell"><div class="phone-screen" data-hide-tabs="${secondary(id)}" data-screen-id="${id}">${status}${top(id)}<div class="app-body"><div class="content">${content(id)}</div>${dock(id)}</div>${tabs(id)}</div></div></article>`;
  body+='</div></main><div class="signature">Prototype Library · 素材署名见 ASSETS.md</div>';
  body+=`<script id="asset-manifest" type="application/json">${json(receipt.assets)}</script><script>window.ASSET_MANIFEST=JSON.parse(document.getElementById('asset-manifest').textContent);window.SCREENS=${json(screens.map(id=>({id,title:screenTitle(id)})))};window.ARROWS={};</script>`;
  if(artifact==='demo')body+=`<script>${runtime}\nconst config=${json({screens,titles:Object.fromEntries(screens.map(id=>[id,screenTitle(id)])),products:data.products,mainTabs:ui.bottom_tabs.map(t=>t.id),icons:{back:byId.get('common:icon-back'),message:byId.get('common:icon-message')}})};${fs.readFileSync(path.join(root,'skills/design-forge/assets/demo-shell/library-runtime.js'),'utf8')}</script>`;
  body+='<!-- VERSION: 1.0 / CHANGES: inventory-first example / BASED ON: registered material catalogs --></body></html>';
  const file=fileId+'.html';fs.writeFileSync(path.join(out,file),htmlHead+body);rendered.push({id:fileId,file,sha256:hash(Buffer.from(htmlHead+body))});
 }
 const renderPlan={schema_version:1,viewport:artifact==='demo'?{width:1281,height:1000}:{width:393,height:852},device_scale_factor:3,pages:screens.map(id=>({id,file:artifact==='flow'?`${id}.html`:'index.html',fragment:artifact==='demo'?id:undefined,selector:'.phone-screen',output:`screens/${id}.png`}))};
 fs.writeFileSync(path.join(out,'render-plan.json'),JSON.stringify(renderPlan,null,2)+'\n');
 fs.writeFileSync(path.join(out,'sample-data.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(out,'ASSETS.md'),['# 素材来源',...receipt.assets.map(a=>`\n- ${a.id}: ${typeof a.source==='object'?`${a.source.author}; ${a.source.license}; ${a.source.license_url}; ${a.source.url}`:a.source}`),'\nUI和文案均为演示；不含用户提供的原始截图。'].join('\n')+'\n');
 const timing={schema_version:1,artifact,context,phases:{asset_selection_copy_ms:receipt.duration_ms,authoring_and_generation_ms:performance.now()-started-receipt.duration_ms},inventory_hit_count:receipt.assets.length,retrieval_count:0,network_requests:0,scope:'deterministic template generation; not host reasoning or user confirmation time',files:rendered};
 fs.writeFileSync(path.join(out,'generation-record.json'),JSON.stringify(timing,null,2)+'\n');return timing;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{const a=process.argv.slice(2),get=(k,d)=>a.includes(k)?a[a.indexOf(k)+1]:d;const outputDir=get('--output');if(!outputDir)throw new Error('Usage: create-demo-from-library.mjs --context none|<brand> --artifact demo|flow --output NEW_DIR [--screens home,messages,cart,assistant]');console.log(JSON.stringify(createLibraryDemo({root:get('--root',repo),context:get('--context','none'),artifact:get('--artifact','demo'),outputDir,screens:get('--screens')?.split(','),title:get('--title')}),null,2));}catch(e){console.error(e.stack||e.message);process.exitCode=1;}
}
