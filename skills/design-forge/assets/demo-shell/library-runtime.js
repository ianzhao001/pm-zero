// Runs after the canonical createDemoRuntime function in an inline module.
const routeMap=Object.fromEntries(config.screens.map(id=>[id,{title:config.titles[id]}]));
const quantities=Object.fromEntries(config.products.map(p=>[p.id,1]));
let toastTimer;
function toast(text){const node=document.querySelector('.toast');node.textContent=text;node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.hidden=true,1800);}
function totals(){let sum=0;for(const p of config.products)sum+=p.price*(quantities[p.id]||0);document.querySelectorAll('[data-total]').forEach(n=>n.textContent='¥'+sum.toFixed(2));document.querySelectorAll('[data-count]').forEach(n=>n.textContent=quantities[n.dataset.count]);return sum;}
function show(state){const secondary=!config.mainTabs.includes(state.route);document.querySelector('.phone-screen').dataset.hideTabs=String(secondary);const chromeAction=document.querySelector('[data-chrome-action]');if(chromeAction){chromeAction.dataset.nav=secondary?config.mainTabs[0]:'assistant';chromeAction.setAttribute('aria-label',secondary?'返回':'助手');const icon=chromeAction.querySelector('img'),asset=config.icons[secondary?'back':'message'];icon.src=asset.file;icon.dataset.assetId=asset.id;}history.replaceState(null,'','#'+state.route);document.querySelectorAll('.screen').forEach(n=>{n.hidden=n.dataset.screenId!==state.route;n.classList.toggle('is-entering',!n.hidden);});document.querySelectorAll('.tab').forEach(n=>n.classList.toggle('active',n.dataset.nav===state.route));document.querySelector('[data-current-title]').textContent=config.titles[state.route];document.querySelector('.hud-current').textContent='当前：'+config.titles[state.route];document.querySelector('.hud-log').textContent=state.log.map(x=>x.action+' '+x.detail).join('\n');totals();}
const requested=location.hash.slice(1),initial=routeMap[requested]?requested:config.screens[0];
const runtime=createDemoRuntime({initialRoute:initial,routes:routeMap,onChange:show});
show(runtime.state);
document.addEventListener('click',event=>{
 const el=event.target.closest('button,[data-feedback]');if(!el)return;
 if(el.dataset.nav){if(routeMap[el.dataset.nav]){runtime.go(el.dataset.nav);history.replaceState(null,'','#'+el.dataset.nav);}else toast('该页面不在此示例范围内');}
 else if(el.hasAttribute('data-back'))runtime.back();
 else if(el.hasAttribute('data-reset')){for(const p of config.products)quantities[p.id]=1;runtime.reset();}
 else if(el.dataset.add){quantities[el.dataset.add]++;runtime.log('ADD',el.dataset.add);toast('已加入示例购物车');}
 else if(el.dataset.quantity){quantities[el.dataset.quantity]=Math.max(0,quantities[el.dataset.quantity]+Number(el.dataset.delta));runtime.log('QUANTITY',el.dataset.quantity+'='+quantities[el.dataset.quantity]);}
 else if(el.hasAttribute('data-checkout')){runtime.log('CHECKOUT','preview '+totals());toast('结算预览：模拟数据，未创建订单');}
 else if(el.dataset.like){const count=el.querySelector('span'),liked=el.dataset.liked==='true';el.dataset.liked=String(!liked);count.textContent=Number(count.textContent)+(liked?-1:1);runtime.log('LIKE',el.dataset.like);}
 else if(el.dataset.question||el.hasAttribute('data-send')){const question=el.dataset.question||document.querySelector('.input-dock input')?.value.trim();if(!question)return;const reply=document.querySelector('.assistant-reply');reply.textContent='已收到“'+question+'”。这里展示离线示例回复，未调用AI服务。';reply.hidden=false;runtime.log('ASSISTANT','local-example');}
 else if(el.dataset.feedback){toast(el.dataset.feedback+'：演示入口');runtime.log('OPEN',el.dataset.feedback);}
});
