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
.order-address{font-size:13px!important;line-height:1.38!important;margin-top:7px!important;color:#4f6075!important;font-weight:700!important}
.compact-meta{gap:5px!important;margin-top:7px!important}.compact-meta span{font-size:10.5px!important;padding:4px 7px!important}
.team-state{font-size:10.5px!important;padding:5px 8px!important}.team-state.no{background:#fff0f0!important;border-color:#efbcbc!important;color:#b83333!important}.team-state.no:before{background:#d94b4b!important}
.hc-attention-title{font-size:13px!important;line-height:1.42!important;font-weight:760!important;color:#28364a!important}
.hc-attention-address{display:block;color:#27364b;font-weight:780;margin-bottom:6px}
.hc-attention-reason{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;background:#fff0f0;border:1px solid #efbcbc;color:#b83333;font-size:10.5px;font-weight:900}
.hc-attention-reason:before{content:'!';display:grid;place-items:center;width:15px;height:15px;border-radius:50%;background:#d94b4b;color:#fff;font-size:10px;font-weight:900}
.hc-event-badge{display:inline-flex;align-items:center;min-height:26px;padding:4px 9px;border-radius:999px;background:#eef5ff;border:1px solid #b9d5ff;color:#1769e0;font-size:10.5px;font-weight:900;letter-spacing:.1px}
.notice-card.hc-new-notice .title{font-size:0!important;line-height:1!important}.notice-card.hc-new-notice .notice-dot{display:none!important}.notice-card.hc-new-notice .sub{margin-top:8px!important;font-size:12.5px!important;line-height:1.45!important}
.notice-card{padding:12px 13px!important}.notice-card .title{font-size:14px!important}
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
  var summaries=new Map(),loading=false,patchTimer=0;
  var originalFetch=window.fetch.bind(window);
  function tg(){return window.Telegram&&window.Telegram.WebApp}
  function headers(){return {'X-App-Launch-Token':new URLSearchParams(location.search).get('launch')||'','X-Telegram-Init-Data':tg()&&tg().initData||''}}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function learn(orders){(orders||[]).forEach(function(o){if(o&&o.order_number)summaries.set(String(o.order_number),o)})}
  function label(id){var s=summaries.get(String(id));return s&&Number(s.display_number)>0?'Заказ #'+String(Number(s.display_number)).padStart(3,'0'):''}
  function technical(card){var x=card&&card.querySelector&&card.querySelector('[data-order],[data-task],[data-rtopen]');return x?String(x.dataset.order||x.dataset.task||x.dataset.rtopen||''):''}
  async function load(){if(loading)return;loading=true;try{var r=await originalFetch('/api/staff/order-labels',{headers:headers()}),x=await r.json().catch(function(){return{}});if(r.ok&&Array.isArray(x.orders)){learn(x.orders);schedule(0)}}catch(e){}finally{loading=false}}
  window.fetch=async function(input,init){var r=await originalFetch(input,init);try{var url=typeof input==='string'?input:(input&&input.url)||'';if(String(url).indexOf('/api/staff/orders')>=0){var x=await r.clone().json();if(x&&Array.isArray(x.orders)){learn(x.orders);schedule(0)}}else if(String(url).indexOf('/api/staff/order?')>=0){var y=await r.clone().json();if(y&&y.order){learn([y.order]);schedule(0)}}}catch(e){}return r};

  function replaceIds(root){if(!root||!summaries.size)return;var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[],n;while(n=walker.nextNode())nodes.push(n);nodes.forEach(function(node){var t=node.nodeValue;if(!t||t.indexOf('HC-')<0)return;summaries.forEach(function(s,id){if(t.indexOf(id)>=0){var l=label(id);if(l)t=t.split(id).join(l)}});node.nodeValue=t})}
  function prettyCards(root){root.querySelectorAll('.order-card,.task-card,.rt-priority-list .card').forEach(function(card){var id=technical(card),s=summaries.get(id),l=label(id);if(!s||!l)return;var p=card.querySelector('.order-primary');if(p&&!p.dataset.hcHuman){p.dataset.hcHuman='1';p.innerHTML='<div class="hc-order-heading"><span class="hc-short-order">'+esc(l)+'</span><span class="hc-card-client">'+esc(s.customer_name||'Клиент')+'</span></div>'}var title=card.querySelector('.title');if(card.classList.contains('task-card')&&title&&!title.dataset.hcHuman){title.dataset.hcHuman='1';title.innerHTML='<div class="hc-order-heading"><span class="hc-short-order">'+esc(l)+'</span><span>'+esc(s.service_name||'Уборка')+'</span></div><span class="hc-worker-client">'+esc(s.customer_name||'Клиент')+'</span>'}if(card.closest('.rt-priority-list')&&title&&!title.dataset.hcPriorityHuman){title.dataset.hcPriorityHuman='1';title.innerHTML='<div class="hc-order-heading"><span class="hc-short-order">'+esc(l)+'</span><span class="hc-card-client">'+esc(s.customer_name||'Клиент')+'</span></div>'}})}
  function statusBadges(root){root.querySelectorAll('.chip').forEach(function(c){if(c.dataset.hcStatus)return;var t=String(c.textContent||'').trim().toLowerCase(),kind='';if(t==='новая'||t==='новая заявка'){c.textContent='Новая заявка';kind='new'}else if(t==='на проверке'||t==='готов к проверке'||t==='ожидает проверки'||t==='ждёт проверки'){c.textContent='Ждёт проверки';kind='review'}else if(t==='в работе'){kind='work'}else if(t==='завершена'||t==='работа принята'||t==='принят и завершён'){kind='done'}else if(t==='отменена'){kind='cancelled'}if(kind){c.dataset.hcStatus='1';c.classList.add('hc-status-chip','hc-status-'+kind)}})}
  function attention(root){root.querySelectorAll('.attention').forEach(function(card){var title=card.querySelector('.title');if(!title||title.dataset.hcAttention)return;var text=String(title.textContent||'').trim();if(!/(команда не назначена|нет назначенной команды|без назначенной команды)/i.test(text))return;title.dataset.hcAttention='1';var parts=text.split('·'),addr=(parts.shift()||'').trim(),time='';var m=text.match(/через\s+[^—·]+/i);if(m)time=m[0].trim();title.classList.add('hc-attention-title');title.innerHTML='<span class="hc-attention-address">'+esc(addr+(time?' · '+time:''))+'</span><span class="hc-attention-reason">Нет назначенных сотрудников</span>'})}
  function notices(root){root.querySelectorAll('.notice-card').forEach(function(card){var title=card.querySelector('.title');if(!title)return;var t=String(title.textContent||'').trim();if(/^новая заявка$/i.test(t)&&!card.classList.contains('hc-new-notice')){card.classList.add('hc-new-notice');title.innerHTML='<span class="hc-event-badge">Новая заявка</span>'}})}
  function patch(){patchTimer=0;var main=document.getElementById('main');if(!main)return;replaceIds(main);prettyCards(main);attention(main);notices(main);statusBadges(main);main.querySelectorAll('.team-state.no').forEach(function(x){if(/нет команды/i.test(x.textContent||''))x.textContent='Нет назначенных сотрудников'});replaceIds(main)}
  function schedule(delay){if(patchTimer)clearTimeout(patchTimer);patchTimer=setTimeout(patch,Math.max(0,delay||0))}
  document.addEventListener('click',function(){schedule(60);setTimeout(patch,240)},true);
  document.addEventListener('change',function(){schedule(70)},true);
  window.addEventListener('pageshow',function(){schedule(40)});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)schedule(60)});
  load();schedule(90);
})();
</script>`;

export const STAFF_HUMAN_ORDER_APP = STAFF_MIRA_STYLE_APP
  .replace('</head>', ORDER_UI_CSS + '</head>')
  .replace('</body>', ORDER_UI_SCRIPT + '</body>');
