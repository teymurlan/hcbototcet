import { STAFF_MIRA_STYLE_APP } from './staff-mira-style-ui';

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
@media(max-width:390px){.hc-card-client{font-size:15px}.hc-short-order{font-size:10.5px}.order-card,.task-card,.rt-priority-list .card{padding:12px!important}}
</style>`;

const ORDER_UI_SCRIPT = String.raw`
<script>
(function(){
  var summaries=new Map(),loading=false,patchTimer=0,burstTimers=[];
  var originalFetch=window.fetch.bind(window);
  function tg(){return window.Telegram&&window.Telegram.WebApp}
  function headers(){return {'X-App-Launch-Token':new URLSearchParams(location.search).get('launch')||'','X-Telegram-Init-Data':tg()&&tg().initData||''}}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function learn(orders){(orders||[]).forEach(function(o){if(o&&o.order_number)summaries.set(String(o.order_number),o)})}
  function client(s){return String(s&&s.display_customer_name||s&&s.customer_name||'Клиент').trim()||'Клиент'}
  function address(s){return [s&&s.city,s&&s.address,s&&s.apartment?'кв./офис '+s.apartment:''].filter(Boolean).join(', ')}
  function label(id){var s=summaries.get(String(id));return s&&Number(s.display_number)>0?'Заказ #'+String(Number(s.display_number)).padStart(3,'0'):''}
  function technical(card){var x=card&&card.querySelector&&card.querySelector('[data-order],[data-task],[data-rtopen]');return x?String(x.dataset.order||x.dataset.task||x.dataset.rtopen||''):''}
  function byDisplayNumber(raw){var m=String(raw||'').trim().match(/^(?:заказ\s*)?#?(\d{1,6})$/i);if(!m)return'';var n=Number(m[1]),found='';summaries.forEach(function(s,id){if(!found&&Number(s.display_number)===n)found=id});return found}
  function summaryFromText(text){var t=String(text||'');var found=null;summaries.forEach(function(s,id){if(found)return;var l=label(id);if((id&&t.indexOf(id)>=0)||(l&&t.indexOf(l)>=0))found=s});return found}
  async function load(){if(loading)return;loading=true;try{var r=await originalFetch('/api/staff/order-labels',{headers:headers()}),x=await r.json().catch(function(){return{}});if(r.ok&&Array.isArray(x.orders)){learn(x.orders);burst()}}catch(e){}finally{loading=false}}
  function relevant(url){url=String(url||'');return url.indexOf('/api/staff/orders')>=0||url.indexOf('/api/staff/order?')>=0||url.indexOf('/api/staff/notifications')>=0||url.indexOf('/api/admin/jobs')>=0}
  window.fetch=async function(input,init){var r=await originalFetch(input,init);try{var url=typeof input==='string'?input:(input&&input.url)||'';if(String(url).indexOf('/api/staff/orders')>=0){var x=await r.clone().json();if(x&&Array.isArray(x.orders))learn(x.orders)}else if(String(url).indexOf('/api/staff/order?')>=0){var y=await r.clone().json();if(y&&y.order)learn([y.order])}if(relevant(url))burst()}catch(e){}return r};

  function replaceIds(root){if(!root||!summaries.size)return;var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[],n;while(n=walker.nextNode())nodes.push(n);nodes.forEach(function(node){var t=node.nodeValue;if(!t||t.indexOf('HC-')<0)return;summaries.forEach(function(s,id){if(t.indexOf(id)>=0){var l=label(id);if(l)t=t.split(id).join(l)}});node.nodeValue=t})}
  function headingHtml(l,name){return '<div class="hc-order-heading"><span class="hc-short-order">'+esc(l)+'</span><span class="hc-card-client">'+esc(name)+'</span></div>'}
  function humanizeAddress(card,s){var a=address(s);if(!a)return;var node=card.querySelector('.order-address,.hc-human-address');if(node){if(String(node.textContent||'').trim()!==a)node.textContent=a;node.classList.add('hc-human-address')}}
  function prettyCards(root){root.querySelectorAll('.order-card,.task-card,.rt-priority-list .card').forEach(function(card){var id=technical(card),s=summaries.get(id),l=label(id);if(!s||!l)return;var name=client(s),p=card.querySelector('.order-primary'),title=card.querySelector('.title');if(p){var badge=p.querySelector('.hc-short-order'),cn=p.querySelector('.hc-card-client');if(!badge||badge.textContent!==l||!cn||cn.textContent!==name)p.innerHTML=headingHtml(l,name)}if(card.classList.contains('task-card')&&title){var tb=title.querySelector('.hc-short-order'),wc=title.querySelector('.hc-worker-client');if(!tb||tb.textContent!==l||!wc||wc.textContent!==name)title.innerHTML='<div class="hc-order-heading"><span class="hc-short-order">'+esc(l)+'</span><span>'+esc(s.service_name||'Уборка')+'</span></div><span class="hc-worker-client">'+esc(name)+'</span>'}if(card.closest('.rt-priority-list')&&title){var pb=title.querySelector('.hc-short-order'),pc=title.querySelector('.hc-card-client');if(!pb||pb.textContent!==l||!pc||pc.textContent!==name)title.innerHTML=headingHtml(l,name)}humanizeAddress(card,s)})}
  function statusBadges(root){root.querySelectorAll('.chip').forEach(function(c){var t=String(c.textContent||'').trim().toLowerCase(),kind='';if(t==='новая'||t==='новая заявка'){c.textContent='Новая заявка';kind='new'}else if(t==='на проверке'||t==='готов к проверке'||t==='ожидает проверки'||t==='ждёт проверки'){c.textContent='Ждёт проверки';kind='review'}else if(t==='в работе'){kind='work'}else if(t==='завершена'||t==='работа принята'||t==='принят и завершён'){kind='done'}else if(t==='отменена'){kind='cancelled'}if(kind){c.classList.add('hc-status-chip','hc-status-'+kind)}})}
  function attention(root){root.querySelectorAll('.attention').forEach(function(card){var title=card.querySelector('.title');if(!title)return;var raw=String(title.textContent||'').trim(),isMissing=/(команда не назначена|нет назначенной команды|без назначенной команды|нет команды|не назначен(?:ы|о)?\s+сотрудник)/i.test(raw)||!!card.querySelector('.team-state.no');if(!isMissing)return;var id=technical(card),s=summaries.get(id)||summaryFromText(card.textContent),l=id?label(id):'',name=s?client(s):'',addr=s?address(s):'';if(!addr){var parts=raw.split('·');addr=(parts.shift()||'').trim()}var desired='<div class="hc-attention-card"><div class="hc-attention-order">'+(l?'<span class="hc-short-order">'+esc(l)+'</span>':'')+(name?'<span class="hc-attention-client">'+esc(name)+'</span>':'')+'</div>'+(addr?'<span class="hc-attention-address">'+esc(addr)+'</span>':'')+'<div class="hc-attention-reason">Нет назначенных сотрудников</div></div>';if(title.innerHTML!==desired){title.classList.add('hc-attention-title');title.innerHTML=desired}})}
  function notices(root){root.querySelectorAll('.notice-card').forEach(function(card){var title=card.querySelector('.title'),sub=card.querySelector('.sub');if(!title)return;var t=String(title.textContent||'').trim(),isNew=/^новая заявка$/i.test(t)||card.classList.contains('hc-new-notice');if(!isNew)return;card.classList.add('hc-new-notice');if(!title.querySelector('.hc-event-badge'))title.innerHTML='<span class="hc-event-badge">Новая заявка</span>';var s=summaryFromText((sub&&sub.textContent||'')+' '+card.textContent);if(s&&sub){var l=label(s.order_number),html='<div class="hc-notice-main"><b>'+esc((l?l+' · ':'')+client(s))+'</b><span>'+esc(address(s)||'Адрес не указан')+'</span></div>';if(sub.innerHTML!==html)sub.innerHTML=html}})}
  function patchSearch(root){var input=root.querySelector('#search');if(!input||input.dataset.hcShortSearch)return;var old=input.oninput;if(typeof old!=='function')return;input.dataset.hcShortSearch='1';input.placeholder='Заказ #003, клиент или адрес';input.oninput=function(e){var shown=input.value,technicalId=byDisplayNumber(shown);if(!technicalId)return old.call(input,e);input.value=technicalId;try{old.call(input,e)}finally{input.value=shown}schedule(0)}}
  function patch(){patchTimer=0;var main=document.getElementById('main');if(!main)return;replaceIds(main);prettyCards(main);attention(main);notices(main);statusBadges(main);patchSearch(main);main.querySelectorAll('.team-state.no').forEach(function(x){if(/нет команды|команда не назначена/i.test(x.textContent||''))x.textContent='Нет назначенных сотрудников'});replaceIds(main)}
  function schedule(delay){if(patchTimer)clearTimeout(patchTimer);patchTimer=setTimeout(patch,Math.max(0,delay||0))}
  function burst(){burstTimers.forEach(clearTimeout);burstTimers=[0,70,220,650,1400].map(function(ms){return setTimeout(patch,ms)})}
  document.addEventListener('click',function(){burst()},true);
  document.addEventListener('change',function(){schedule(70)},true);
  window.addEventListener('pageshow',function(){burst()});
  window.addEventListener('scroll',function(){schedule(80)},{passive:true});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)burst()});
  load();burst();
})();
</script>`;

export const STAFF_HUMAN_ORDER_APP = STAFF_MIRA_STYLE_APP
  .replace('</head>', ORDER_UI_CSS + '</head>')
  .replace('</body>', ORDER_UI_SCRIPT + '</body>');
