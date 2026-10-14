import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Structured blocks and a local preview, inspired by yhassy/wireframe-skill.
// Original renderer: no upstream code, network, scripts or product interactions.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c]));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const font = '-apple-system,BlinkMacSystemFont,PingFang SC,Microsoft YaHei,sans-serif';
function lines(value, width, size) {
  const result = []; let line = ''; let used = 0;
  for (const c of String(value ?? '')) {
    const units = /[\u0000-\u007f]/.test(c) ? size * 0.62 : size;
    if (used + units > width && /[，。！？；：、）】]/.test(c) && line) { result.push(line + c); line = ''; used = 0; continue; }
    if (c === '\n' || used + units > width) { result.push(line); line = ''; used = 0; }
    if (c !== '\n') { line += c; used += units; }
  }
  if (line) result.push(line);
  return result;
}
function text(value, x, y, width, size = 16, weight = 400, fill = '#34383e') {
  const rows = lines(value, width, size);
  return { height: Math.max(1, rows.length) * (size + 8), svg: rows.map((row, i) => `<text x="${x}" y="${y + i * (size + 8)}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escape(row)}</text>`).join('') };
}
const rect = (x,y,w,h,fill='#fff',stroke='#d7dade',r=12) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
function svg(body, width, height, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(title)}"><title>${escape(title)}</title><g font-family="${font}">${body}</g></svg>`;
}
const label = (value,x,y,w=342,size=16,weight=400,fill='#34383e') => text(value,x,y,w,size,weight,fill).svg;
const line = (y) => `<path d="M16 ${y} H374" stroke="#d7dade"/>`;
const check = (x,y,on=true) => rect(x,y,20,20,on?'#45494e':'#fff','#666',4)+(on?`<path d="M${x+4} ${y+10} l4 4 l8 -9" fill="none" stroke="white" stroke-width="2"/>`:'');
const toggle = (x,y,on=true) => rect(x,y,42,24,on?'#555':'#ddd','#888',12)+`<circle cx="${x+(on?30:12)}" cy="${y+12}" r="9" fill="white"/>`;
function thumbnail(x,y,w,h,variant='box') {
  const shape=variant==='stand'?`<path d="M${x+w*.24} ${y+h*.76} L${x+w*.55} ${y+h*.25} L${x+w*.76} ${y+h*.76} Z" fill="#b9bdc2" stroke="#777"/>`:variant==='laptop'?rect(x+w*.17,y+h*.22,w*.66,h*.44,'#c1c5ca','#858a90',3)+`<path d="M${x+w*.12} ${y+h*.75} H${x+w*.88} L${x+w*.78} ${y+h*.66} H${x+w*.22} Z" fill="#999"/>`:rect(x+w*.2,y+h*.32,w*.6,h*.36,'#bcc0c5','#777',5)+`<path d="M${x+w*.3} ${y+h*.48} H${x+w*.7}" stroke="#777" stroke-width="3"/>`;
  return rect(x,y,w,h,'#eceef0','#dadde0',8)+shape;
}
function component(c,y) {
  let body=''; let h=0;
  const heading=()=>{if(c.title){const t=text(c.title,16,y+24,358,20,650);body+=t.svg;h=t.height+16;}};
  switch(c.kind) {
    case 'search':
      body=rect(16,y+8,358,48,'#f0f1f2','#b7bcc2',24)+`<circle cx="39" cy="${y+29}" r="7" fill="none" stroke="#666" stroke-width="2"/><path d="M44 ${y+34} l6 6" stroke="#666" stroke-width="2"/>`+label(c.placeholder,62,y+38,296);h=68;break;
    case 'intro':
      heading(); if(c.body){const t=text(c.body,16,y+h+18,358);body+=t.svg;h+=t.height+12;}
      if(c.caption){const t=text(c.caption,16,y+h+16,358,14,400,'#666');body+=t.svg;h+=t.height+12;}break;
    case 'history-strip':
      heading();for(const [i,item] of (c.items||[]).entries()) {const x=16+i*122;body+=thumbnail(x,y+h,108,72,item.visual)+label(item.name,x,y+h+96,110,14);}h+=128;break;
    case 'product-grid':
      heading();for(const [i,item] of (c.items||[]).entries()) {const x=16+(i%2)*184;const row=y+h+Math.floor(i/2)*222;body+=rect(x,row,174,210,'#fff','#d7dade',8)+thumbnail(x+8,row+8,158,100,item.visual); const t=text(item.name,x+10,row+134,154,16,600);body+=t.svg+label(item.caption,x+10,row+166,154,14)+label(item.price,x+10,row+194,154,18,700); }h+=Math.ceil((c.items||[]).length/2)*222;break;
    case 'product-list':
      heading();for(const item of c.items||[]) {const row=y+h;body+=check(16,row+30,item.selected!==false)+thumbnail(48,row+8,82,82,item.visual);const t=text(item.name,142,row+28,222,16,600);body+=t.svg+label(item.caption,142,row+58,222,14)+label(item.price,142,row+86,140,18,700);
        if(c.quantity){body+=rect(238,row+94,126,32,'#fff','#999',5)+label('−',250,row+117,24)+label(String(item.quantity||1),292,row+117,24)+label('+',336,row+117,24)+label('移除',48,row+119,76,14);h+=142;}else h+=110;body+=line(y+h-3);}break;
    case 'link-row':
      for(const item of c.items||[]) {const t=text(item,16,y+h+28,322);body+=t.svg+label('›',350,y+h+30,24,24)+line(y+h+t.height+16);h+=t.height+32;}break;
    case 'toggles':
      heading();for(const item of c.items||[]){const t=text(item.name,16,y+h+24,290,16,600);body+=t.svg+toggle(332,y+h+6,item.enabled!==false);h+=t.height+4;if(item.caption){const t=text(item.caption,16,y+h+16,300,14);body+=t.svg;h+=t.height+4;}body+=line(y+h+8);h+=24;}break;
    case 'comparison': {
      const items=c.items||[];if(items.length!==2)throw new Error('comparison requires exactly two products');
      for(const [i,item] of items.entries()){const x=16+i*184;body+=thumbnail(x,y+8,174,100,item.visual)+label(item.name,x+8,y+134,158,16,600)+label(item.price,x+8,y+164,158,18,700);}h=186;
      for(const row of c.rows||[]){body+=rect(16,y+h,358,32,'#e9ebed','#e9ebed',0)+label(row.label,26,y+h+23,338,14,600);h+=32;const left=text(row.values[0],26,y+h+24,154);const right=text(row.values[1],210,y+h+24,154);const rh=Math.max(left.height,right.height)+24;body+=left.svg+right.svg+`<path d="M195 ${y+h} V${y+h+rh}" stroke="#ddd"/>`+line(y+h+rh);h+=rh;}break;
    }
    default: // Retain simple legacy blocks for generic layout callers.
      heading();for(const value of [c.body,...(c.items||[])].filter(Boolean)){const t=text(value,16,y+h+20,358);body+=t.svg;h+=t.height+12;}if(c.action){body+=rect(16,y+h,358,48,'#45494e','#45494e',8)+label(c.action,30,y+h+30,330,16,600,'#fff');h+=60;}
  }
  return {svg:body,height:h+8};
}
function screenGraphic(screen) {
  const nav=screen.nav||{};const title=text(nav.title||screen.title,nav.back?44:16,72,nav.back?310:358,24,700);
  const navBottom=Math.max(104,72+title.height+12);let y=navBottom+8;
  let body=label('9:41',22,26,80,14,600)+`<path d="M294 25 v-5 m5 5 v-8 m5 8 v-11" stroke="#444" stroke-width="3"/><path d="M315 17 q8 -7 16 0 m-13 4 q5 -5 10 0" fill="none" stroke="#444" stroke-width="2"/><circle cx="323" cy="25" r="1.5" fill="#444"/><rect x="341" y="14" width="27" height="13" rx="3" fill="none" stroke="#444"/><rect x="344" y="17" width="20" height="7" fill="#444"/><path d="M370 18 v5" stroke="#444" stroke-width="2"/>`+title.svg+(nav.back?`<path d="M29 54 l-10 10 l10 10" fill="none" stroke="#444" stroke-width="2"/>`:'')+line(navBottom);
  for(const c of screen.components||screen.blocks){const r=component(c,y);body+=`<g data-component="${escape(c.kind||'text')}">${r.svg}</g>`;y+=r.height;}
  const footer=screen.footer;const tabs=screen.tabs;const reserve=(footer?88:0)+(tabs?70:0)+42;
  const height=Math.max(844,y+reserve);let footerY=height-reserve;
  if(footer){body+=rect(0,footerY,390,88,'#fff','#c7cbd0',0)+label(footer.label,16,footerY+30,172,14)+label(footer.total||'',16,footerY+60,172,22,700)+rect(194,footerY+16,180,54,'#45494e','#45494e',27)+label(footer.action,210,footerY+49,148,16,600,'#fff');}
  if(tabs){const ty=height-112;body+=rect(0,ty,390,70,'#fafafa','#c7cbd0',0);for(const [i,t] of tabs.items.entries()){const x=i*78;body+=rect(x+29,ty+12,20,18,i===tabs.active?'#555':'#ddd','#888',5)+label(t,x+7,ty+53,68,14,i===tabs.active?650:400);}}
  if(screen.assistant){const a=screen.assistant;const ay=navBottom+150;const ah=height-ay-42;body+=rect(0,navBottom,390,height-navBottom-42,'#222','#222',0).replace('fill="#222"','fill="#222" fill-opacity="0.14"')+rect(0,ay,390,ah,'#fff','#888',20)+rect(168,ay+10,54,5,'#999','#999',3)+label(a.title,16,ay+48,310,20,650)+label('×',350,ay+48,24,24);
    let cy=ay+74;const summary=text(a.context,16,cy+16,358,14);body+=summary.svg;cy+=summary.height+20;
    for(const message of a.messages||[]){const mt=text(message.text,message.role==='user'?82:28,cy+24,message.role==='user'?280:316);const mh=mt.height+24;body+=rect(message.role==='user'?70:16,cy,message.role==='user'?304:342,mh,message.role==='user'?'#e5e7e9':'#f5f6f7','#d3d6da',10)+mt.svg;cy+=mh+12;}
    const budgetY=Math.max(cy+4,height-238);body+=label(a.budgetLabel||'快捷预算',16,budgetY,358,14);for(const [i,b] of (a.budgets||[]).entries())body+=rect(16+i*120,budgetY+12,110,38,b===a.selectedBudget?'#ddd':'#fff','#888',19)+label(b,30+i*120,budgetY+37,86);
    body+=rect(16,height-172,358,52,'#fff','#999',10)+label(a.input,30,height-139,326)+rect(16,height-108,358,48,'#45494e','#45494e',24)+label(a.action,112,height-77,244,16,600,'#fff');
  }
  body+=label(screen.note||'正常主流程 · 静态线框',16,height-18,358,14,400,'#666');
  return {width:390,height,svg:svg(rect(0,0,390,height,'#fff','#9ca1a7',20)+body,390,height,screen.title)};
}
export function renderWireframes(model) {
  if (!model || !Array.isArray(model.screens) || !model.screens.length) throw new Error('screens must be non-empty');
  const ids=new Set();
  for(const screen of model.screens) {
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(screen.id) || /^(?:flow|board-\d+)$/i.test(screen.id) || ids.has(screen.id.toLowerCase())) throw new Error('unique safe non-reserved screen id required');
    ids.add(screen.id.toLowerCase());
    if (!screen.title || !Array.isArray(screen.components || screen.blocks)) throw new Error(`title and components required: ${screen.id}`);
  }
  for(const link of model.links || []) if(!model.screens.some(s=>s.id===link.from)||!model.screens.some(s=>s.id===link.to)) throw new Error('flow link references unknown screen');
  const files = {};
  const graphics=model.screens.map(screen=>({screen,...screenGraphic(screen)}));
  for(const g of graphics) files[`${g.screen.id}.svg`]=g.svg;
  // At most two full-size screens per board, never shrink text to fit more pages.
  for(let i=0;i<graphics.length;i+=2) {
    const pair=graphics.slice(i,i+2);
    const title=`${model.title || '线框'} · ${Math.floor(i/2)+1}`;
    const heading=text(title,36,44,804,24,700); const top=76+heading.height;
    const height=Math.max(...pair.map(g=>g.height))+top+28;
    const board=rect(0,0,880,height,'#f1f3f5','#f1f3f5',0)+heading.svg+text('结构与操作位置示意 · 示例数据',36,44+heading.height,800,14).svg+pair.map((g,j)=>`<g transform="translate(${36+j*418},${top})">${g.svg}</g>`).join('');
    files[`board-${Math.floor(i/2)+1}.svg`]=svg(board,880,height,title);
  }
  const names=new Map(model.screens.map(s=>[s.id,s.title]));
  const flowHeading=text(`${model.title || '线框'} · 正常流程`,32,48,816,24,700);
  let y=68+flowHeading.height;let flow=flowHeading.svg;
  for(const link of model.links || []) {
    const left=text(names.get(link.from),48,y+24,252,18,600);const right=text(names.get(link.to),574,y+24,252,18,600);const label=text(link.label,336,y+12,188,14,400,'#656b73');
    const h=Math.max(left.height,right.height,label.height)+32;
    flow+=rect(32,y,284,h)+left.svg+rect(558,y,284,h)+right.svg+label.svg+`<path d="M330 ${y+h-14} H544 l-8 -5 m8 5 l-8 5" fill="none" stroke="#626971" stroke-width="2"/>`;y+=h+24;
  }
  files['flow.svg']=svg(rect(0,0,880,y+16,'#f1f3f5','#f1f3f5',0)+flow,880,y+16,'正常流程');
  files['index.html']=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(model.title)}</title><style>body{margin:0;background:#f1f3f5;font-family:${font}}main{padding:24px;display:grid;gap:32px}figure{margin:0;width:max-content}img{display:block}h1{font-size:24px;margin:0}p{font-size:16px;margin:0}</style><main><h1>${escape(model.title)}</h1><p>静态线框 · 示例数据 · 以单屏原始尺寸检查中文可读性</p>${Object.keys(files).filter(f=>f.startsWith('board-')||f==='flow.svg').map(f=>`<figure><img src="${f}" alt="${escape(f)}"></figure>`).join('')}</main></html>`;
  return files;
}
export function writeWireframes(input, output) {
  const bytes=fs.readFileSync(input);const files=renderWireframes(JSON.parse(bytes));
  fs.mkdirSync(output,{recursive:true});
  for(const name of [...Object.keys(files),'render-manifest.json']) if(fs.existsSync(path.join(output,name))) throw new Error(`Refusing to overwrite ${name}; use a new version directory`);
  for(const [name,content] of Object.entries(files)) fs.writeFileSync(path.join(output,name),content);
  const manifest={schema_version:1,source_sha256:digest(bytes),renderer_sha256:digest(fs.readFileSync(fileURLToPath(import.meta.url))),files:Object.fromEntries(Object.entries(files).map(([name,content])=>[name,digest(content)])),png_status:'pending-browser-export'};
  fs.writeFileSync(path.join(output,'render-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [input,output]=process.argv.slice(2);if(!input||!output) throw new Error('Usage: render-wireframes.mjs <model.json> <new-output-dir>');
  console.log(JSON.stringify(writeWireframes(input,output)));
}
