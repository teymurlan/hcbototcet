import { STAFF_MIRA_STYLE_APP } from './staff-mira-style-ui';

function stabilizeRenderedApp(app:string):string {
  let out=app;

  // Orders are refreshed once when entering the screen. While the screen is open,
  // background focus/visibility refreshes must not rebuild or reorder its DOM.
  out=out.replace(
    "if(p==='orders')return orders();",
    "if(p==='orders'){try{await reloadAdmin()}catch(e){toast('Не удалось обновить заказы')}return orders()}"
  );
  out=out.replace(
    "setInterval(hcRefreshLive,15000);document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(hcRefreshLive,250)});window.addEventListener('focus',function(){setTimeout(hcRefreshLive,250)});",
    "document.addEventListener('visibilitychange',function(){if(!document.hidden&&S.page!=='orders')setTimeout(hcRefreshLive,250)});window.addEventListener('focus',function(){if(S.page!=='orders')setTimeout(hcRefreshLive,250)});"
  );

  // Older visual layers used whole-document MutationObserver + one-second polling.
  // Keep their patch functions, but trigger them only from real UI/data events.
  out=out.replace(
    /var mo=new MutationObserver\(function\(\)\{requestAnimationFrame\(patch\)\}\);mo\.observe\(document\.documentElement,\{subtree:true,childList:true\}\);/g,
    "var hcPatchQueued=false;function hcQueuePatch(){if(hcPatchQueued)return;hcPatchQueued=true;requestAnimationFrame(function(){hcPatchQueued=false;patch()})}document.addEventListener('click',hcQueuePatch,true);document.addEventListener('change',hcQueuePatch,true);document.addEventListener('input',hcQueuePatch,true);window.addEventListener('pageshow',hcQueuePatch);document.addEventListener('visibilitychange',function(){if(!document.hidden)hcQueuePatch()});document.addEventListener('hc:after-render',hcQueuePatch);"
  );
  out=out.replace(/setInterval\(patch,1000\);/g,'');

  // Icon repainting is also event-driven; no full-DOM observer is needed.
  out=out.replace(
    "paint();new MutationObserver(paint).observe(document.documentElement,{childList:true,subtree:true});",
    "paint();document.addEventListener('hc:after-render',function(){requestAnimationFrame(paint)});"
  );
  out=out.replace(
    "paintStandards();new MutationObserver(paintStandards).observe(document.documentElement,{childList:true,subtree:true});",
    "paintStandards();document.addEventListener('hc:after-render',function(){requestAnimationFrame(paintStandards)});"
  );

  return out;
}

const ORDER_UI_CSS = String.raw`
<style>
.order-card,.task-card,.rt-priority-list .card{padding:13px!important;border-radius:19px!important}
.order-card .row,.task-card .row,.rt-priority-list .card .row{align-items:flex-start!important}
.order-primary,.task-card .title,.rt-priority-list .card .title{font-size:15px!important;line-height:1.25!important;letter-spacing:-.15px!important}
.hc-order-heading{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px}
.hc-short-order{display:inline-flex;align-items:center;min-height:27px;padding:4px 9px;border-radius:999px;background:#edf4ff;border:1px solid #c8ddff;color:#1769e0;font-size:11px;font-weight:900;letter-spacing:.1px;white-space:nowrap}
.hc-card-client{font-size:16px;font-weight:850;color:#182235;letter-spacing:-.2px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hc-worker-client{display:block;margin-top:5px;color:#27354a;font-size:13px;font-weight:800}
.order-address,.hc-human-address{font-size:13px!important;line-height:1.38!important;margin-top:7px!important;color:#4f6075!important;font-weight:700!important}
.compact-meta{gap:5px!important;margin-top:7px!important}.compact-meta span{font-size:10.5px!important;padding:4px 7px!important}
.team-state{font-size:10.5px!important;padding:5px 8px!important}.team-state.no{background:#fff0f0!important;border-color:#efbcbc!important;color:#b83333!important}.team-state.no:before{background:#d94b4b!important}
.hc-attention-title{font-size:13px!important;line-height:1.42!important;font-weight:760!important;color:#28364a!important}
.hc-attention-card{display:grid;gap:7px;padding:10px 11px;border:1.5px solid #e3e9f2;border-radius:14px;background:#fbfdff;margin-top:2px}
.hc-attention-order{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.hc-attention-client{font-size:13px;font-weight:850;color:#253247}.hc-attention-address{display:block;color:#55657a;font-weight:720;font-size:12px;line-height:1.4}
.hc-attention-reason{display:flex;align-items:center;gap:7px;width:100%;padding:8px 10px;border-radius:12px;background:#fff0f0;border:1.5px solid #efbcbc;color:#b83333;font-size:11px;font-weight:900}
.hc-attention-reason:before{content:'!';display:grid;place-items:center;flex:0 0 17px;width:17px;height:17px;border-radius:50%;background:#d94b4b;color:#fff;font-size:10px;font-weight:900}
.hc-event-badge{display:inline-flex;align-items:center;min-height:25px;padding:4px 9px;border-radius:999px;background:#eef5ff;border:1px solid #b9d5ff;color:#1769e0;font-size:10px;font-weight:900;letter-spacing:.1px}
.notice-card.hc-new-notice .title{font-size:0!important;line-height:1!important}.notice-card.hc-new-notice .notice-dot{display:none!important}.notice-card.hc-new-notice .sub{margin-top:8px!important;font-size:12px!important;line-height:1.42!important}
.notice-card{padding:11px 12px!important}.notice-card .title{font-size:13.5px!important}.hc-notice-main{margin-top:8px;display:grid;gap:3px}.hc-notice-main b{font-size:13px;color:#253247}.hc-notice-main span{font-size:11.5px;color:#65748a;line-height:1.4}
.chip.hc-status-chip{font-size:10.5px!important;padding:5px 8px!important;white-space:nowrap}
.chip.hc-status-new{background:#eef5ff!important;border-color:#bdd7ff!important;color:#1769e0!important}
.chip.hc-status-review{background:#fff5e6!important;border-color:#efcf9c!important;color:#a76508!important}
.chip.hc-status-work{background:#edf4ff!important;border-color:#b9d5ff!important;color:#1769e0!important}
.chip.hc-status-done{background:#ebf8f1!important;border-color:#b9e2ce!important;color:#138a55!important}
.chip.hc-status-cancelled{background:#fff0f0!important;border-color:#efc0c0!important;color:#b83232!important}

/* Stable orders: explicit refresh instead of silent polling. */
.hc-orders-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.hc-orders-refresh{appearance:none;border:1px solid rgba(164,194,234,.82);background:rgba(255,255,255,.82);color:#1769e0;border-radius:999px;min-height:36px;padding:7px 11px;font-size:11px;font-weight:850;display:inline-flex;align-items:center;gap:6px;box-shadow:0 6px 18px rgba(35,96,177,.08);-webkit-tap-highlight-color:transparent}.hc-orders-refresh:active{transform:scale(.98)}

/* Motion foundation: transform + opacity only. */
#main.hc-motion-ready>.hero,#main.hc-motion-ready>.section-title,#main.hc-motion-ready>.card,#main.hc-motion-ready>.grid,#main.hc-motion-ready>.search,#main.hc-motion-ready>.toolbar,#main.hc-motion-ready>.std-intro{animation:hcScreenIn .28s cubic-bezier(.2,.72,.24,1) both}
#main.hc-motion-ready>.card:nth-of-type(2){animation-delay:24ms}#main.hc-motion-ready>.card:nth-of-type(3){animation-delay:42ms}#main.hc-motion-ready>.card:nth-of-type(4){animation-delay:58ms}
.btn,.filter,#nav button,.card[data-employee],.order-card,.task-card,.hc-media{transition:transform .16s ease,opacity .18s ease,background-color .2s ease,border-color .2s ease}.btn:active,.filter:active,#nav button:active,.card[data-employee]:active,.hc-media:active{transform:scale(.98)}
.hc-media img,.hc-media video{animation:hcMediaIn .22s ease both}.hc-viewer{display:flex!important;opacity:0;visibility:hidden;pointer-events:none;transform:scale(1.012);transition:opacity .2s ease,transform .22s cubic-bezier(.2,.72,.24,1),visibility 0s linear .22s}.hc-viewer.on{opacity:1;visibility:visible;pointer-events:auto;transform:none;transition-delay:0s}
.rt-modal{animation:hcBackdropIn .18s ease both}.rt-sheet{animation:hcSheetIn .25s cubic-bezier(.2,.72,.24,1) both}
@keyframes hcScreenIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}@keyframes hcMediaIn{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}@keyframes hcBackdropIn{from{opacity:0}to{opacity:1}}@keyframes hcSheetIn{from{opacity:.72;transform:translateY(18px)}to{opacity:1;transform:none}}

/* Premium Standards carousel. Existing standard text remains the source of truth. */
#stdlist.hc-standards-track{display:flex!important;gap:14px!important;overflow-x:auto!important;overflow-y:hidden;padding:8px 7vw 18px!important;margin:0 -14px;scroll-snap-type:x mandatory;scroll-padding-inline:7vw;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:none;touch-action:pan-x pan-y}
#stdlist.hc-standards-track::-webkit-scrollbar{display:none}
#stdlist.hc-standards-track .standard-card{position:relative;flex:0 0:min(84vw,360px);min-height:290px;margin:0!important;padding:22px 20px 20px!important;border-radius:27px!important;scroll-snap-align:center;scroll-snap-stop:always;opacity:.54;transform:scale(.94);transform-origin:center;transition:transform .28s cubic-bezier(.2,.72,.24,1),opacity .24s ease,border-color .2s ease;background:linear-gradient(155deg,rgba(255,255,255,.98),rgba(248,252,255,.96))!important;box-shadow:0 14px 34px rgba(35,65,105,.09);cursor:pointer;-webkit-tap-highlight-color:transparent}
#stdlist.hc-standards-track .standard-card.hc-standard-active{opacity:1;transform:scale(1)}
#stdlist.hc-standards-track .standard-card:active{transform:scale(.98)}
#stdlist.hc-standards-track .standard-card h3{font-size:22px!important;line-height:1.12!important;letter-spacing:-.45px;margin:14px 0 10px!important;color:#172437!important}
#stdlist.hc-standards-track .standard-card p{font-size:14px!important;line-height:1.58!important;color:#536277!important}
#stdlist.hc-standards-track .standard-card:before{display:none!important}
.hc-standard-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.hc-standard-tag{display:inline-flex;align-items:center;border-radius:999px;padding:6px 9px;font-size:9.5px;font-weight:900;letter-spacing:.25px}.hc-standard-index{font-size:11px;font-weight:850;color:#8b98a9}
.standard-card.std-blue .hc-standard-tag,.standard-card.rt-std-blue .hc-standard-tag{background:#e8f1ff;color:#1558b5}.standard-card.std-green .hc-standard-tag,.standard-card.rt-std-green .hc-standard-tag{background:#def5e9;color:#117549}.standard-card.std-orange .hc-standard-tag,.standard-card.rt-std-orange .hc-standard-tag{background:#ffedc9;color:#995b08}.standard-card.std-red .hc-standard-tag,.standard-card.rt-std-red .hc-standard-tag{background:#ffe0e0;color:#a72d2d}.standard-card.std-purple .hc-standard-tag,.standard-card.rt-std-purple .hc-standard-tag{background:#ece5ff;color:#5e43a7}
.standard-card.std-blue,.standard-card.rt-std-blue{border:1.5px solid #b7d3fb!important}.standard-card.std-green,.standard-card.rt-std-green{border:1.5px solid #b9e5cf!important}.standard-card.std-orange,.standard-card.rt-std-orange{border:1.5px solid #efd19d!important}.standard-card.std-red,.standard-card.rt-std-red{border:1.5px solid #efbbbb!important}.standard-card.std-purple,.standard-card.rt-std-purple{border:1.5px solid #d5c8f4!important}
.rt-std-tag{display:none!important}
.hc-std-controls{display:grid;grid-template-columns:46px 1fr 46px;align-items:center;gap:10px;margin:3px 0 14px}.hc-std-arrow{appearance:none;width:46px;height:46px;border-radius:50%;border:1px solid rgba(173,196,226,.78);background:rgba(255,255,255,.82);box-shadow:0 8px 24px rgba(32,69,118,.10);color:#1f66c8;font-size:25px;display:grid;place-items:center;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);-webkit-tap-highlight-color:transparent}.hc-std-arrow:disabled{opacity:.28}.hc-std-arrow:not(:disabled):active{transform:scale(.96)}.hc-std-progress{display:grid;gap:7px;text-align:center}.hc-std-count{font-size:12px;font-weight:850;color:#596a80}.hc-std-bar{height:4px;border-radius:999px;background:#dfe9f5;overflow:hidden}.hc-std-bar>i{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#3997ff,#35cad8);transform-origin:left;transition:width .22s ease}
.hc-standard-sheet{position:fixed;inset:0;z-index:12000;display:grid;align-items:end;background:rgba(17,29,47,.26);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .2s ease,visibility 0s linear .24s;padding-top:env(safe-area-inset-top)}.hc-standard-sheet.hc-on{opacity:1;visibility:visible;pointer-events:auto;transition-delay:0s}.hc-standard-panel{width:min(720px,100%);margin:0 auto;background:rgba(249,252,255,.98);border:1px solid rgba(203,219,239,.9);border-radius:30px 30px 0 0;padding:14px 16px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -24px 70px rgba(22,50,88,.18);transform:translateY(20px) scale(.985);opacity:.6;transition:transform .26s cubic-bezier(.2,.72,.24,1),opacity .22s ease}.hc-standard-sheet.hc-on .hc-standard-panel{transform:none;opacity:1}.hc-standard-handle{width:38px;height:4px;border-radius:999px;background:#c8d5e5;margin:0 auto 14px}.hc-standard-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.hc-standard-close{appearance:none;border:0;width:42px;height:42px;border-radius:50%;background:#eaf0f7;color:#32445c;font-size:22px;display:grid;place-items:center}.hc-standard-sheet h2{font-size:25px;line-height:1.12;letter-spacing:-.55px;margin:18px 2px 10px;color:#142238}.hc-standard-sheet p{font-size:15px;line-height:1.62;color:#516177;margin:0 2px 10px;white-space:pre-line}.hc-standard-sheet-nav{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}.hc-standard-sheet-nav button{min-height:46px;border-radius:15px;border:1px solid #d6e2f0;background:#fff;color:#225fae;font-weight:850}
.hc-low-motion #stdlist.hc-standards-track .standard-card{transition:opacity .14s ease;transform:none!important}.hc-low-motion #main.hc-motion-ready>*{animation-duration:.12s!important}.hc-low-motion .hc-standard-panel{transform:none!important}
@media(max-width:390px){.hc-card-client{font-size:15px}.hc-short-order{font-size:10.5px}.order-card,.task-card,.rt-priority-list .card{padding:12px!important}#stdlist.hc-standards-track{padding-inline:8vw!important;scroll-padding-inline:8vw}#stdlist.hc-standards-track .standard-card{flex-basis:84vw;min-height:275px;padding:20px 18px!important}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important}.hc-viewer,.rt-sheet,.rt-modal,#stdlist.hc-standards-track .standard-card,.hc-standard-panel,.hc-standard-sheet,.btn,.filter,#nav button{animation:none!important;transition-duration:.01ms!important}#stdlist.hc-standards-track .standard-card{transform:none!important}}
</style>`;

const ORDER_UI_SCRIPT = String.raw`
<script>
(function(){
  var summaries=new Map(),loading=false,patchFrame=0,standardsFrame=0,renderFrame=0;
  var originalFetch=window.fetch.bind(window);
  var reduceMotion=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var lowMotion=reduceMotion||((navigator.hardwareConcurrency||8)<=4)||((navigator.deviceMemory||8)<=4);
  if(lowMotion)document.documentElement.classList.add('hc-low-motion');
  function tg(){return window.Telegram&&window.Telegram.WebApp}
  function haptic(type){try{var t=tg();if(t&&t.HapticFeedback&&t.HapticFeedback.impactOccurred)t.HapticFeedback.impactOccurred(type||'light')}catch(e){}}
  function headers(){return {'X-App-Launch-Token':new URLSearchParams(location.search).get('launch')||'','X-Telegram-Init-Data':tg()&&tg().initData||''}}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function learn(orders){(orders||[]).forEach(function(o){if(o&&o.order_number)summaries.set(String(o.order_number),o)})}
  function client(s){return String(s&&s.display_customer_name||s&&s.customer_name||'Клиент').trim()||'Клиент'}
  function address(s){return [s&&s.city,s&&s.address,s&&s.apartment?'кв./офис '+s.apartment:''].filter(Boolean).join(', ')}
  function label(id){var s=summaries.get(String(id));return s&&Number(s.display_number)>0?'Заказ #'+String(Number(s.display_number)).padStart(3,'0'):''}
  function technical(card){var x=card&&card.querySelector&&card.querySelector('[data-order],[data-task],[data-rtopen]');return x?String(x.dataset.order||x.dataset.task||x.dataset.rtopen||''):''}
  function byDisplayNumber(raw){var m=String(raw||'').trim().match(/^(?:заказ\s*)?#?(\d{1,6})$/i);if(!m)return'';var n=Number(m[1]),found='';summaries.forEach(function(s,id){if(!found&&Number(s.display_number)===n)found=id});return found}
  function summaryFromText(text){var t=String(text||''),found=null;summaries.forEach(function(s,id){if(found)return;var l=label(id);if((id&&t.indexOf(id)>=0)||(l&&t.indexOf(l)>=0))found=s});return found}
  async function load(){if(loading)return;loading=true;try{var r=await originalFetch('/api/staff/order-labels',{headers:headers()}),x=await r.json().catch(function(){return{}});if(r.ok&&Array.isArray(x.orders)){learn(x.orders);queueAfterRender()}}catch(e){}finally{loading=false}}
  function relevant(url){url=String(url||'');return url.indexOf('/api/staff/orders')>=0||url.indexOf('/api/staff/order?')>=0||url.indexOf('/api/staff/notifications')>=0||url.indexOf('/api/admin/jobs')>=0||url.indexOf('/api/state')>=0}
  window.fetch=async function(input,init){var r=await originalFetch(input,init);try{var url=typeof input==='string'?input:(input&&input.url)||'';if(String(url).indexOf('/api/staff/orders')>=0){var x=await r.clone().json();if(x&&Array.isArray(x.orders))learn(x.orders)}else if(String(url).indexOf('/api/staff/order?')>=0){var y=await r.clone().json();if(y&&y.order)learn([y.order])}if(relevant(url))queueAfterRender()}catch(e){}return r};

  function replaceIds(root){if(!root||!summaries.size)return;var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[],n;while(n=walker.nextNode())nodes.push(n);nodes.forEach(function(node){var t=node.nodeValue;if(!t||t.indexOf('HC-')<0)return;summaries.forEach(function(s,id){if(t.indexOf(id)>=0){var l=label(id);if(l)t=t.split(id).join(l)}});node.nodeValue=t})}
  function headingHtml(l,name){return '<div class="hc-order-heading"><span class="hc-short-order">'+esc(l)+'</span><span class="hc-card-client">'+esc(name)+'</span></div>'}
  function humanizeAddress(card,s){var a=address(s);if(!a)return;var node=card.querySelector('.order-address,.hc-human-address');if(node){if(String(node.textContent||'').trim()!==a)node.textContent=a;node.classList.add('hc-human-address')}}
  function prettyCards(root){root.querySelectorAll('.order-card,.task-card,.rt-priority-list .card').forEach(function(card){var id=technical(card),s=summaries.get(id),l=label(id);if(!s||!l)return;var name=client(s),p=card.querySelector('.order-primary'),title=card.querySelector('.title');if(p){var badge=p.querySelector('.hc-short-order'),cn=p.querySelector('.hc-card-client');if(!badge||badge.textContent!==l||!cn||cn.textContent!==name)p.innerHTML=headingHtml(l,name)}if(card.classList.contains('task-card')&&title){var tb=title.querySelector('.hc-short-order'),wc=title.querySelector('.hc-worker-client');if(!tb||tb.textContent!==l||!wc||wc.textContent!==name)title.innerHTML='<div class="hc-order-heading"><span class="hc-short-order">'+esc(l)+'</span><span>'+esc(s.service_name||'Уборка')+'</span></div><span class="hc-worker-client">'+esc(name)+'</span>'}if(card.closest('.rt-priority-list')&&title){var pb=title.querySelector('.hc-short-order'),pc=title.querySelector('.hc-card-client');if(!pb||pb.textContent!==l||!pc||pc.textContent!==name)title.innerHTML=headingHtml(l,name)}humanizeAddress(card,s)})}
  function statusBadges(root){root.querySelectorAll('.chip').forEach(function(c){var t=String(c.textContent||'').trim().toLowerCase(),kind='';if(t==='новая'||t==='новая заявка'){c.textContent='Новая заявка';kind='new'}else if(t==='на проверке'||t==='готов к проверке'||t==='ожидает проверки'||t==='ждёт проверки'){c.textContent='Ждёт проверки';kind='review'}else if(t==='в работе'){kind='work'}else if(t==='завершена'||t==='работа принята'||t==='принят и завершён'){kind='done'}else if(t==='отменена'){kind='cancelled'}if(kind)c.classList.add('hc-status-chip','hc-status-'+kind)})}
  function attention(root){root.querySelectorAll('.attention').forEach(function(card){var title=card.querySelector('.title');if(!title)return;var raw=String(title.textContent||'').trim(),isMissing=/(команда не назначена|нет назначенной команды|без назначенной команды|нет команды|не назначен(?:ы|о)?\s+сотрудник)/i.test(raw)||!!card.querySelector('.team-state.no');if(!isMissing)return;var id=technical(card),s=summaries.get(id)||summaryFromText(card.textContent),l=id?label(id):'',name=s?client(s):'',addr=s?address(s):'';if(!addr){var parts=raw.split('·');addr=(parts.shift()||'').trim()}var desired='<div class="hc-attention-card"><div class="hc-attention-order">'+(l?'<span class="hc-short-order">'+esc(l)+'</span>':'')+(name?'<span class="hc-attention-client">'+esc(name)+'</span>':'')+'</div>'+(addr?'<span class="hc-attention-address">'+esc(addr)+'</span>':'')+'<div class="hc-attention-reason">Нет назначенных сотрудников</div></div>';if(title.innerHTML!==desired){title.classList.add('hc-attention-title');title.innerHTML=desired}})}
  function notices(root){root.querySelectorAll('.notice-card').forEach(function(card){var title=card.querySelector('.title'),sub=card.querySelector('.sub');if(!title)return;var t=String(title.textContent||'').trim(),isNew=/^новая заявка$/i.test(t)||card.classList.contains('hc-new-notice');if(!isNew)return;card.classList.add('hc-new-notice');if(!title.querySelector('.hc-event-badge'))title.innerHTML='<span class="hc-event-badge">Новая заявка</span>';var s=summaryFromText((sub&&sub.textContent||'')+' '+card.textContent);if(s&&sub){var l=label(s.order_number),html='<div class="hc-notice-main"><b>'+esc((l?l+' · ':'')+client(s))+'</b><span>'+esc(address(s)||'Адрес не указан')+'</span></div>';if(sub.innerHTML!==html)sub.innerHTML=html}})}
  function patchSearch(root){var input=root.querySelector('#search');if(!input||input.dataset.hcShortSearch)return;var old=input.oninput;if(typeof old!=='function')return;input.dataset.hcShortSearch='1';input.placeholder='Заказ #003, клиент или адрес';input.oninput=function(e){var shown=input.value,technicalId=byDisplayNumber(shown);if(!technicalId)return old.call(input,e);input.value=technicalId;try{old.call(input,e)}finally{input.value=shown}queueAfterRender()}}
  function ensureOrdersRefresh(root){var search=root.querySelector('#search'),head=search&&root.querySelector('.section-title');if(!search||!head||head.querySelector('.hc-orders-refresh'))return;head.classList.add('hc-orders-head');var b=document.createElement('button');b.type='button';b.className='hc-orders-refresh';b.innerHTML='<span aria-hidden="true">↻</span> Обновить';b.onclick=function(){haptic('light');var n=document.querySelector('#nav button[data-n="orders"]');if(n)n.click()};head.appendChild(b)}
  function patch(){patchFrame=0;var main=document.getElementById('main');if(!main)return;main.classList.add('hc-motion-ready');replaceIds(main);prettyCards(main);attention(main);notices(main);statusBadges(main);patchSearch(main);ensureOrdersRefresh(main);main.querySelectorAll('.team-state.no').forEach(function(x){if(/нет команды|команда не назначена/i.test(x.textContent||''))x.textContent='Нет назначенных сотрудников'});replaceIds(main)}

  function stdMeta(card){var h=String((card.querySelector('h3')||{}).textContent||'').toLowerCase();if(card.classList.contains('std-green')||card.classList.contains('rt-std-green')||/фото до|фото после|генеральн/.test(h))return['green','КАЧЕСТВО'];if(card.classList.contains('std-orange')||card.classList.contains('rt-std-orange')||/хим|поверхност|после ремонта/.test(h))return['orange','ОСТОРОЖНО · ХИМИЯ'];if(card.classList.contains('std-red')||card.classList.contains('rt-std-red')||/имуществ|ключ|конфиденц|нестандарт/.test(h))return['red','ВАЖНО · БЕЗОПАСНОСТЬ'];if(card.classList.contains('std-purple')||card.classList.contains('rt-std-purple')||/общение|внешний вид/.test(h))return['purple','КЛИЕНТ И СЕРВИС'];return['blue','ПОРЯДОК РАБОТЫ']}
  function stdCards(){var list=document.getElementById('stdlist');return list?[].slice.call(list.querySelectorAll('.standard-card')):[]}
  function stdActiveIndex(list,cards){if(!cards.length)return 0;var center=list.scrollLeft+list.clientWidth/2,best=0,dist=Infinity;cards.forEach(function(c,i){var d=Math.abs(c.offsetLeft+c.offsetWidth/2-center);if(d<dist){dist=d;best=i}});return best}
  function stdUpdate(list,cards){var i=stdActiveIndex(list,cards);cards.forEach(function(c,n){c.classList.toggle('hc-standard-active',n===i)});var count=document.getElementById('hcStdCount'),bar=document.getElementById('hcStdBar'),prev=document.getElementById('hcStdPrev'),next=document.getElementById('hcStdNext');if(count)count.textContent=(cards.length?i+1:0)+' / '+cards.length;if(bar)bar.style.width=(cards.length?((i+1)/cards.length*100):0)+'%';if(prev)prev.disabled=i<=0;if(next)next.disabled=i>=cards.length-1}
  function stdScrollTo(index){var list=document.getElementById('stdlist'),cards=stdCards();if(!list||!cards.length)return;index=Math.max(0,Math.min(cards.length-1,index));haptic('light');cards[index].scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'nearest',inline:'center'})}
  function ensureStdSheet(){var sheet=document.getElementById('hcStandardSheet');if(sheet)return sheet;sheet=document.createElement('div');sheet.id='hcStandardSheet';sheet.className='hc-standard-sheet';sheet.innerHTML='<div class="hc-standard-panel" role="dialog" aria-modal="true" aria-labelledby="hcStandardTitle"><div class="hc-standard-handle"></div><div class="hc-standard-sheet-head"><div id="hcStandardTag" class="hc-standard-tag"></div><button type="button" class="hc-standard-close" aria-label="Закрыть">×</button></div><h2 id="hcStandardTitle"></h2><p id="hcStandardText"></p><div class="hc-standard-sheet-nav"><button type="button" data-hc-std-move="-1">← Предыдущая</button><button type="button" data-hc-std-move="1">Следующая →</button></div></div>';document.body.appendChild(sheet);sheet.addEventListener('click',function(e){if(e.target===sheet)closeStdSheet()});sheet.querySelector('.hc-standard-close').onclick=closeStdSheet;sheet.querySelectorAll('[data-hc-std-move]').forEach(function(b){b.onclick=function(){var cards=stdCards(),i=Number(sheet.dataset.index||0)+Number(b.dataset.hcStdMove||0);if(i<0||i>=cards.length)return;openStdSheet(cards[i],i)}});return sheet}
  function openStdSheet(card,index){var sheet=ensureStdSheet(),meta=stdMeta(card),h=card.querySelector('h3'),p=card.querySelector('p'),tag=sheet.querySelector('#hcStandardTag');sheet.dataset.index=String(index);tag.className='hc-standard-tag';tag.textContent=meta[1];tag.style.background='';tag.style.color='';sheet.querySelector('#hcStandardTitle').textContent=h&&h.textContent||'';sheet.querySelector('#hcStandardText').textContent=p&&p.textContent||'';var nav=sheet.querySelectorAll('[data-hc-std-move]'),cards=stdCards();if(nav[0])nav[0].disabled=index<=0;if(nav[1])nav[1].disabled=index>=cards.length-1;haptic('light');sheet.classList.add('hc-on');document.body.style.overflow='hidden'}
  function closeStdSheet(){var sheet=document.getElementById('hcStandardSheet');if(!sheet)return;haptic('light');sheet.classList.remove('hc-on');document.body.style.overflow=''}
  function ensureStandards(){standardsFrame=0;var list=document.getElementById('stdlist');if(!list)return;var cards=stdCards();if(!cards.length){var old=document.getElementById('hcStdControls');if(old)old.remove();return}list.classList.add('hc-standards-track');cards.forEach(function(card,i){var meta=stdMeta(card);if(!card.classList.contains('std-'+meta[0])&&!card.classList.contains('rt-std-'+meta[0]))card.classList.add('std-'+meta[0]);if(!card.dataset.hcStandard){card.dataset.hcStandard='1';card.setAttribute('role','button');card.setAttribute('tabindex','0');card.setAttribute('aria-label','Открыть стандарт '+String(i+1));var top=document.createElement('div');top.className='hc-standard-top';top.innerHTML='<span class="hc-standard-tag">'+esc(meta[1])+'</span><span class="hc-standard-index">'+String(i+1).padStart(2,'0')+'</span>';card.insertBefore(top,card.firstChild);var sx=0,ss=0;card.addEventListener('pointerdown',function(e){sx=e.clientX;ss=list.scrollLeft},{passive:true});card.addEventListener('click',function(e){if(Math.abs(list.scrollLeft-ss)>8||Math.abs((e.clientX||sx)-sx)>10)return;openStdSheet(card,stdCards().indexOf(card))});card.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openStdSheet(card,stdCards().indexOf(card))}})}});var controls=document.getElementById('hcStdControls');if(!controls){controls=document.createElement('div');controls.id='hcStdControls';controls.className='hc-std-controls';controls.innerHTML='<button id="hcStdPrev" class="hc-std-arrow" type="button" aria-label="Предыдущая">‹</button><div class="hc-std-progress"><div id="hcStdCount" class="hc-std-count"></div><div class="hc-std-bar"><i id="hcStdBar"></i></div></div><button id="hcStdNext" class="hc-std-arrow" type="button" aria-label="Следующая">›</button>';list.insertAdjacentElement('afterend',controls);controls.querySelector('#hcStdPrev').onclick=function(){var c=stdCards();stdScrollTo(stdActiveIndex(list,c)-1)};controls.querySelector('#hcStdNext').onclick=function(){var c=stdCards();stdScrollTo(stdActiveIndex(list,c)+1)}}if(!list.dataset.hcStdScroll){list.dataset.hcStdScroll='1';list.addEventListener('scroll',function(){if(standardsFrame)return;standardsFrame=requestAnimationFrame(function(){standardsFrame=0;stdUpdate(list,stdCards())})},{passive:true})}stdUpdate(list,cards)}
  function queueStandards(){if(standardsFrame)return;standardsFrame=requestAnimationFrame(ensureStandards)}
  function queueAfterRender(){if(renderFrame)return;renderFrame=requestAnimationFrame(function(){renderFrame=0;patch();ensureStandards();try{document.dispatchEvent(new Event('hc:after-render'))}catch(e){}})}

  document.addEventListener('click',function(){queueAfterRender()},true);
  document.addEventListener('change',queueAfterRender,true);
  document.addEventListener('input',function(e){if(e.target&&e.target.id==='stdsearch'){var list=document.getElementById('stdlist');if(list)list.scrollLeft=0}queueAfterRender()},true);
  window.addEventListener('pageshow',queueAfterRender);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)queueAfterRender()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeStdSheet()});
  load();queueAfterRender();
})();
</script>`;

const STABLE_BASE_APP = stabilizeRenderedApp(STAFF_MIRA_STYLE_APP);

export const STAFF_HUMAN_ORDER_APP = STABLE_BASE_APP
  .replace('</head>', ORDER_UI_CSS + '</head>')
  .replace('</body>', ORDER_UI_SCRIPT + '</body>');
