export const STAFF_COMMAND_V3_BUILD='staff-command-v3-2026-09-17-a';

const COMMAND_CSS=String.raw`
<style id="hcCommandV3Style">
html.hc-command-v3 #main[data-hc-catalog-page="overview"]>.hero{display:none!important}
html.hc-command-v3 .hc-v3-command{display:grid;gap:9px;margin:2px 0 11px}
html.hc-command-v3 .hc-v3-command-head{display:flex;align-items:end;justify-content:space-between;gap:10px;padding:0 2px}
html.hc-command-v3 .hc-v3-command-head strong{font-size:26px;line-height:1;letter-spacing:-.8px;color:#101114}
html.hc-command-v3 .hc-v3-command-head span{font-size:10.5px;color:#858990}
html.hc-command-v3 .hc-v3-quick-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
html.hc-command-v3 .hc-v3-quick{appearance:none;min-width:0;min-height:68px;border:0;border-radius:20px;background:#fff;color:#15171a;padding:9px 7px;display:grid;align-content:center;justify-items:center;gap:6px;box-shadow:none;-webkit-tap-highlight-color:transparent}
html.hc-command-v3 .hc-v3-quick:active{transform:scale(.97)}
html.hc-command-v3 .hc-v3-quick i{display:grid;place-items:center;width:31px;height:31px;border-radius:12px;background:#eceef1;font-style:normal;font-size:15px}
html.hc-command-v3 .hc-v3-quick b{font-size:9.5px;line-height:1.08;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
html.hc-command-v3 .hc-v3-quick[data-v3-go="notify"] i{background:#fff1d7}

/* Orders become one coherent list: card itself is the action. */
html.hc-command-v3 #main[data-hc-catalog-page="orders"]>.section-title{margin-bottom:8px!important}
html.hc-command-v3 #main[data-hc-catalog-page="orders"]>.section-title h2{font-size:26px!important}
html.hc-command-v3 #main[data-hc-catalog-page="orders"]>.search{margin-bottom:7px!important}
html.hc-command-v3 #main[data-hc-catalog-page="orders"]>.toolbar{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;gap:6px!important;margin:0 -12px 8px!important;padding:0 12px 5px!important;scrollbar-width:none;-webkit-overflow-scrolling:touch}
html.hc-command-v3 #main[data-hc-catalog-page="orders"]>.toolbar::-webkit-scrollbar{display:none}
html.hc-command-v3 #main[data-hc-catalog-page="orders"]>.toolbar .filter{flex:0 0 auto!important;white-space:nowrap!important;min-height:32px!important;padding:6px 10px!important;font-size:10px!important}
html.hc-command-v3 .hc-v3-order-summary{display:flex;gap:6px;overflow-x:auto;margin:0 0 8px;padding:0 1px 2px;scrollbar-width:none}
html.hc-command-v3 .hc-v3-order-summary::-webkit-scrollbar{display:none}
html.hc-command-v3 .hc-v3-summary-chip{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 9px;background:#e7e8ea;color:#555b63;font-size:9.5px;font-weight:850}
html.hc-command-v3 .hc-v3-summary-chip b{color:#111820;font-size:10.5px}
html.hc-command-v3 .order-card.hc-v3-openable,
html.hc-command-v3 .rt-priority-list .card.hc-v3-openable{position:relative!important;padding:11px 50px 11px 12px!important;min-height:84px!important;cursor:pointer!important;-webkit-tap-highlight-color:transparent}
html.hc-command-v3 .order-card.hc-v3-openable:after,
html.hc-command-v3 .rt-priority-list .card.hc-v3-openable:after{content:'›';position:absolute;right:13px;top:50%;transform:translateY(-52%);width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#eff0f2;color:#30343a;font-size:24px;font-weight:400}
html.hc-command-v3 .order-card.hc-v3-openable:active{transform:scale(.986)!important}
html.hc-command-v3 .order-card.hc-v3-openable>.hc-inline-open,
html.hc-command-v3 .order-card.hc-v3-openable>.btn[data-order],
html.hc-command-v3 .rt-priority-list .card.hc-v3-openable .hc-inline-open,
html.hc-command-v3 .rt-priority-list .card.hc-v3-openable .btn[data-order]{display:none!important}
html.hc-command-v3 .order-card .team-state{margin-top:2px!important}
html.hc-command-v3 .order-card .compact-meta{margin-top:5px!important}
html.hc-command-v3 .order-card.unassigned{background:#fff!important}
html.hc-command-v3 .order-card.unassigned:before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:0 3px 3px 0;background:#e45151}
html.hc-command-v3 .order-card.assigned:before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:0 3px 3px 0;background:#2fb075}

/* iOS-like compact glass navigation. */
html.hc-command-v3 .nav{left:14px!important;right:14px!important;bottom:8px!important}
html.hc-command-v3 .navin{min-height:61px!important;padding:4px 4px!important;border-radius:23px!important;background:rgba(246,247,249,.72)!important;border:.5px solid rgba(255,255,255,.9)!important;box-shadow:0 10px 28px rgba(14,20,30,.13),inset 0 1px 0 rgba(255,255,255,.74)!important;backdrop-filter:blur(28px) saturate(180%)!important;-webkit-backdrop-filter:blur(28px) saturate(180%)!important}
html.hc-command-v3 .nav button{min-height:49px!important;gap:1px!important;font-size:8.5px!important;border-radius:17px!important}
html.hc-command-v3 .nav button i{width:29px!important;height:29px!important;border-radius:11px!important;font-size:15px!important;background:rgba(227,230,235,.78)!important}
html.hc-command-v3 .nav button i svg{width:17px!important;height:17px!important}
html.hc-command-v3 .nav button.on{color:#0f62d7!important}
html.hc-command-v3 .nav button.on i{background:rgba(255,255,255,.86)!important;color:#146de5!important;box-shadow:0 2px 8px rgba(37,104,205,.12),inset 0 0 0 .5px rgba(80,140,230,.22)!important}
html.hc-command-v3 .sticky-actions{bottom:calc(78px + env(safe-area-inset-bottom))!important}

/* Notification control center. */
html.hc-command-v3 .hc-v3-notify-page{display:grid;gap:9px;padding-bottom:8px}
html.hc-command-v3 .hc-v3-notify-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
html.hc-command-v3 .hc-v3-notify-head h2{margin:0;font-size:27px;letter-spacing:-.85px;line-height:1;color:#101114}
html.hc-command-v3 .hc-v3-back{appearance:none;min-height:38px;border:0;border-radius:14px;background:#fff;padding:8px 11px;color:#28313d;font-size:11px;font-weight:850}
html.hc-command-v3 .hc-v3-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;border-radius:16px;background:#e5e6e8}
html.hc-command-v3 .hc-v3-tabs button{appearance:none;border:0;min-height:35px;border-radius:12px;background:transparent;color:#686d75;font-size:10px;font-weight:850}
html.hc-command-v3 .hc-v3-tabs button.on{background:#fff;color:#111820;box-shadow:0 1px 5px rgba(18,22,30,.07)}
html.hc-command-v3 .hc-v3-pane{display:grid;gap:7px}
html.hc-command-v3 .hc-v3-notice{border:0;border-radius:19px;background:#fff;padding:11px 12px;display:grid;gap:5px}
html.hc-command-v3 .hc-v3-notice-top{display:flex;align-items:center;justify-content:space-between;gap:9px}
html.hc-command-v3 .hc-v3-notice-title{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:900;color:#17191d}
html.hc-command-v3 .hc-v3-notice-time{font-size:9px;color:#90949b;white-space:nowrap}
html.hc-command-v3 .hc-v3-notice p{margin:0;color:#6c7179;font-size:10.5px;line-height:1.38}
html.hc-command-v3 .hc-v3-setting{display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:19px;background:#fff;padding:12px 13px}
html.hc-command-v3 .hc-v3-setting strong{display:block;font-size:12.5px;color:#17191d}
html.hc-command-v3 .hc-v3-setting span{display:block;margin-top:3px;font-size:9.5px;line-height:1.3;color:#7c8189}
html.hc-command-v3 .hc-v3-switch{position:relative;flex:0 0 44px;width:44px;height:27px;border-radius:999px;background:#d5d7db;transition:background-color .18s ease}
html.hc-command-v3 .hc-v3-switch:after{content:'';position:absolute;width:23px;height:23px;left:2px;top:2px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.18);transition:transform .18s ease}
html.hc-command-v3 input:checked+.hc-v3-switch{background:#34c759}
html.hc-command-v3 input:checked+.hc-v3-switch:after{transform:translateX(17px)}
html.hc-command-v3 .hc-v3-setting input{position:absolute;opacity:0;pointer-events:none}
html.hc-command-v3 .hc-v3-note{border-radius:17px;background:#e8e9eb;padding:10px 11px;color:#646971;font-size:10px;line-height:1.38}
html.hc-command-v3 .hc-v3-compose{display:grid;gap:7px;border-radius:21px;background:#fff;padding:12px}
html.hc-command-v3 .hc-v3-compose label{font-size:9.5px;font-weight:850;color:#767b83}
html.hc-command-v3 .hc-v3-compose input,
html.hc-command-v3 .hc-v3-compose select,
html.hc-command-v3 .hc-v3-compose textarea{width:100%;box-sizing:border-box;border:0;border-radius:13px;background:#f1f2f4;padding:10px 11px;color:#141619;font:inherit;font-size:12px;outline:none}
html.hc-command-v3 .hc-v3-compose textarea{min-height:112px;resize:vertical}
html.hc-command-v3 .hc-v3-send{appearance:none;min-height:42px;border:0;border-radius:14px;background:#111820;color:#fff;font-size:12px;font-weight:900}
html.hc-command-v3 .hc-v3-send:disabled{opacity:.45}
html.hc-command-v3 .hc-v3-employee-picks{display:grid;grid-template-columns:1fr 1fr;gap:5px;max-height:180px;overflow:auto}
html.hc-command-v3 .hc-v3-pick{display:flex;align-items:center;gap:7px;border-radius:12px;background:#f2f3f5;padding:7px 8px;font-size:10px;color:#353a41}
html.hc-command-v3 .hc-v3-broadcast-row{border-radius:17px;background:#fff;padding:10px 11px;display:grid;gap:3px}
html.hc-command-v3 .hc-v3-broadcast-row strong{font-size:11px}.hc-v3-broadcast-row span{font-size:9.5px;color:#7d8289}
html.hc-command-v3 .hc-v3-empty{padding:26px 14px;text-align:center;color:#858a92;font-size:11px;background:#fff;border-radius:19px}

html.hc-command-v3 #main[data-hc-catalog-page="more"] #notices .title{font-size:0!important}
html.hc-command-v3 #main[data-hc-catalog-page="more"] #notices .title:after{content:'🔔  Центр уведомлений';font-size:13px!important}
html.hc-command-v3 #main[data-hc-catalog-page="more"] #notices .sub{font-size:0!important}
html.hc-command-v3 #main[data-hc-catalog-page="more"] #notices .sub:after{content:'Лента, настройки и рассылки через бота';font-size:10.5px!important}

@media(max-width:390px){
  html.hc-command-v3 .hc-v3-quick-grid{gap:5px}
  html.hc-command-v3 .hc-v3-quick{min-height:63px;padding:8px 5px}
  html.hc-command-v3 .hc-v3-quick b{font-size:8.7px}
  html.hc-command-v3 .hc-v3-employee-picks{grid-template-columns:1fr}
}
@media(prefers-reduced-motion:reduce){html.hc-command-v3 .hc-v3-quick,html.hc-command-v3 .order-card,html.hc-command-v3 .hc-v3-switch:after{transition:none!important}}
</style>`;

const COMMAND_JS=String.raw`
<script id="hcCommandV3Script">
(function(){
  if(window.__hcCommandV3)return;window.__hcCommandV3=true;document.documentElement.classList.add('hc-command-v3');
  var queued=false,lastOrdersTap=0,returnStack=[],notifyCache=null,settingsCache=null,broadcastCache=null,employeeCache=null;
  try{returnStack=JSON.parse(sessionStorage.getItem('hc:v3:return-stack')||'[]')||[]}catch(e){returnStack=[]}
  function tg(){return window.Telegram&&window.Telegram.WebApp}
  function headers(){var t=tg(),h={'content-type':'application/json'},launch=new URLSearchParams(location.search).get('launch')||'';if(launch)h['X-App-Launch-Token']=launch;if(t&&t.initData)h['X-Telegram-Init-Data']=t.initData;return h}
  async function api(path,opt){opt=opt||{};var r=await fetch(path,{method:opt.method||'GET',headers:headers(),body:opt.body?JSON.stringify(opt.body):undefined,cache:'no-store'}),x=await r.json().catch(function(){return{ok:false,error:'Ошибка сервера'}});if(!r.ok||x.ok===false)throw Error(x.error||'Ошибка');return x}
  function toast(s,k){if(window.__hcToast)return window.__hcToast(s,k);try{tg()&&tg().showAlert(s)}catch(e){}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function currentTab(){var b=document.querySelector('#nav button.on');if(!b)return'';var t=String(b.textContent||'');if(/Обзор|Главная/i.test(t))return'home';if(/Заказ/i.test(t))return'orders';if(/Сотруд/i.test(t))return'employees';if(/Фото/i.test(t))return'photos';if(/Ещё/i.test(t))return'more';if(/Задан/i.test(t))return'tasks';if(/Стандарт/i.test(t))return'standards';if(/Проф/i.test(t))return'profile';return''}
  function navButton(key){var bs=[].slice.call(document.querySelectorAll('#nav button'));var re=key==='home'?/Обзор|Главная/i:key==='orders'?/Заказ/i:key==='employees'?/Сотруд/i:key==='photos'?/Фото/i:key==='more'?/Ещё/i:key==='tasks'?/Задан/i:key==='standards'?/Стандарт/i:key==='profile'?/Проф/i:null;return re?bs.find(function(b){return re.test(b.textContent||'')}):null}
  function navTo(key){var b=navButton(key);if(b){b.click();return true}return false}
  function saveStack(){try{sessionStorage.setItem('hc:v3:return-stack',JSON.stringify(returnStack.slice(-8)))}catch(e){}}
  function pushOrigin(){var t=currentTab();if(!t)return;if(returnStack[returnStack.length-1]!==t){returnStack.push(t);saveStack()}}
  function popOrigin(){var t=returnStack.pop()||'';saveStack();return t}
  function isInternalOpen(el){return !!(el&&el.closest&&el.closest('[data-order],[data-employee],#fin,#hire,#sched,#notices,#regs,#hcClientsEntry,#hcAdminAccessCard,.hc-client-card'))}
  function page(){var m=document.getElementById('main');if(!m)return'';if(m.querySelector('.hc-v3-notify-page'))return'notifications';return m.dataset.hcCatalogPage||''}
  function iconFor(level,title){var s=(String(level||'')+' '+String(title||'')).toLowerCase();if(s.indexOf('warning')>=0||s.indexOf('отмен')>=0)return'⚠️';if(s.indexOf('success')>=0||s.indexOf('принят')>=0)return'✅';if(s.indexOf('нов')>=0)return'🔔';return'•'}
  function fmt(ts){try{return new Date(Number(ts||0)).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return''}}

  function decorateOverview(main){
    var hero=main.querySelector(':scope>.hero');if(hero)hero.style.display='none';
    if(main.querySelector('.hc-v3-command'))return;
    var grid=main.querySelector(':scope>.grid'),wrap=document.createElement('section');wrap.className='hc-v3-command';
    wrap.innerHTML='<div class="hc-v3-command-head"><strong>Сегодня</strong><span>Быстрые действия</span></div><div class="hc-v3-quick-grid"><button class="hc-v3-quick" data-v3-go="orders"><i>▤</i><b>Заявки</b></button><button class="hc-v3-quick" data-v3-go="employees"><i>◎</i><b>Команда</b></button><button class="hc-v3-quick" data-v3-go="photos"><i>▧</i><b>Фото</b></button><button class="hc-v3-quick" data-v3-go="notify"><i>🔔</i><b>Оповещения</b></button></div>';
    if(grid)main.insertBefore(wrap,grid);else main.prepend(wrap);
  }
  function orderStats(main){var cards=[].slice.call(main.querySelectorAll('#olist .order-card'));if(!cards.length)return;var un=cards.filter(function(c){return c.classList.contains('unassigned')}).length,done=cards.filter(function(c){return c.classList.contains('completed')}).length,cancel=cards.filter(function(c){return c.classList.contains('cancelled')}).length,active=Math.max(0,cards.length-done-cancel);var old=main.querySelector('.hc-v3-order-summary');if(old)old.remove();var s=document.createElement('div');s.className='hc-v3-order-summary';s.innerHTML='<span class="hc-v3-summary-chip"><b>'+active+'</b> активных</span><span class="hc-v3-summary-chip"><b>'+un+'</b> без команды</span><span class="hc-v3-summary-chip"><b>'+done+'</b> завершено</span><span class="hc-v3-summary-chip"><b>'+cancel+'</b> отменено</span>';var search=main.querySelector('#search');if(search)main.insertBefore(s,search);}
  function makeOpenable(root){root.querySelectorAll('.order-card,.rt-priority-list .card').forEach(function(card){var btn=card.querySelector('.hc-inline-open,.btn[data-order],[data-order]');if(!btn)return;card.classList.add('hc-v3-openable');card.setAttribute('role','button');card.tabIndex=0;card.dataset.hcV3Order=btn.getAttribute('data-order')||''})}
  function decorateOrders(main){var h=main.querySelector(':scope>.section-title h2');if(h)h.textContent='Заявки';var sub=main.querySelector(':scope>.section-title span');if(sub)sub.textContent='Поиск, статусы и команда';makeOpenable(main);orderStats(main)}
  function decorateMore(main){var n=document.getElementById('notices');if(n)n.setAttribute('aria-label','Центр уведомлений: лента, настройки и рассылки')}
  function decorate(){var main=document.getElementById('main');if(!main)return;var p=page();if(p==='overview')decorateOverview(main);if(p==='orders')decorateOrders(main);else makeOpenable(main);if(p==='more')decorateMore(main);document.documentElement.classList.remove('hc-v3-orders-loading')}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;decorate()})}

  async function loadNotify(force){if(force||!notifyCache){var x=await api('/api/staff/notifications');notifyCache=x.notices||[]}if(force||!settingsCache){var s=await api('/api/staff/notification-settings');settingsCache=s.settings||{}}if(force||!broadcastCache){var b=await api('/api/staff/notification-broadcasts');broadcastCache=b.history||[]}return true}
  function notifyShell(){var main=document.getElementById('main');if(!main)return null;main.dataset.hcCatalogPage='notifications';main.innerHTML='<div class="hc-v3-notify-page"><div class="hc-v3-notify-head"><button class="hc-v3-back" id="hcV3NotifyBack">← Назад</button><h2>Оповещения</h2></div><div class="hc-v3-tabs"><button class="on" data-v3-tab="feed">Лента</button><button data-v3-tab="settings">Настройки</button><button data-v3-tab="broadcast">Рассылка</button></div><div id="hcV3NotifyPane" class="hc-v3-pane"><div class="hc-v3-empty">Загрузка…</div></div></div>';return main}
  async function openNotifications(){pushOrigin();notifyShell();try{await loadNotify(true);renderNotifyTab('feed');try{document.dispatchEvent(new CustomEvent('hc:notifications-ready'))}catch(x){}}catch(e){var p=document.getElementById('hcV3NotifyPane');if(p)p.innerHTML='<div class="hc-v3-empty">'+esc(e.message)+'</div>';try{document.dispatchEvent(new CustomEvent('hc:notifications-ready'))}catch(x){}}}
  window.__hcOpenNotifications=openNotifications;
  document.addEventListener('hc:open-notifications',function(){openNotifications()},false);
  function renderNotifyTab(tab){var pane=document.getElementById('hcV3NotifyPane');if(!pane)return;document.querySelectorAll('[data-v3-tab]').forEach(function(b){b.classList.toggle('on',b.dataset.v3Tab===tab)});if(tab==='feed')return renderFeed(pane);if(tab==='settings')return renderSettings(pane);return renderBroadcast(pane)}
  function renderFeed(pane){var a=notifyCache||[];pane.innerHTML=a.length?a.slice(0,80).map(function(n){return'<div class="hc-v3-notice"><div class="hc-v3-notice-top"><div class="hc-v3-notice-title"><span>'+iconFor(n.level,n.title)+'</span>'+esc(n.title||'Событие')+'</div><span class="hc-v3-notice-time">'+esc(fmt(n.at))+'</span></div><p>'+esc(n.body||'')+'</p></div>'}).join(''):'<div class="hc-v3-empty">Новых событий пока нет</div>'}
  var settingRows=[['new_order','Новые заявки','Сообщать руководителю о новом заказе'],['order_changed','Изменения заказов','Дата, время, адрес и состав услуги'],['order_cancelled','Отмена заказа','Сразу сообщать руководителю об отмене'],['defects','Дефекты до уборки','Фото и комментарий по найденному дефекту'],['finance_changes','Финансы и реквизиты','Изменения реквизитов сотрудников']];
  function renderSettings(pane){var s=settingsCache||{};pane.innerHTML='<div class="hc-v3-note">Эти переключатели управляют Telegram-уведомлениями руководителю. Критические сообщения сотрудникам о назначении, отмене и повторе фотоотчёта остаются включёнными.</div>'+settingRows.map(function(r){var on=s[r[0]]!==false;return'<label class="hc-v3-setting"><span><strong>'+esc(r[1])+'</strong><span>'+esc(r[2])+'</span></span><span><input type="checkbox" data-v3-setting="'+r[0]+'" '+(on?'checked':'')+'><i class="hc-v3-switch"></i></span></label>'}).join('')}
  async function employees(){if(employeeCache)return employeeCache;try{var x=await api('/api/staff/employees');employeeCache=(x.employees||[]).filter(function(e){return e&&e.status==='active'})}catch(e){employeeCache=[]}return employeeCache}
  async function renderBroadcast(pane){var es=await employees(),h=broadcastCache||[];pane.innerHTML='<div class="hc-v3-compose"><label>Кому</label><select id="hcV3Audience"><option value="employees">Всем сотрудникам</option><option value="admins">Администраторам</option><option value="all_team">Всей команде</option><option value="selected">Выбрать сотрудников</option></select><div id="hcV3Picks" class="hc-v3-employee-picks" style="display:none">'+es.map(function(e){return'<label class="hc-v3-pick"><input type="checkbox" data-v3-employee="'+Number(e.id)+'"><span>'+esc(e.name||('ID '+e.id))+'</span></label>'}).join('')+'</div><label>Заголовок</label><input id="hcV3BroadcastTitle" maxlength="120" placeholder="Например: Изменение графика"><label>Сообщение</label><textarea id="hcV3BroadcastBody" maxlength="1500" placeholder="Напишите сообщение для команды"></textarea><button id="hcV3Send" class="hc-v3-send">📣 Отправить через бота</button></div><div class="section-title"><h2>Последние рассылки</h2><span>'+h.length+'</span></div>'+(h.length?h.slice(0,12).map(function(r){return'<div class="hc-v3-broadcast-row"><strong>'+esc(r.title)+'</strong><span>'+esc(fmt(r.at))+' · доставлено '+Number(r.sent||0)+' из '+Number(r.requested||0)+'</span></div>'}).join(''):'<div class="hc-v3-empty">Рассылок ещё не было</div>')}
  async function saveSetting(key,val){var next=Object.assign({},settingsCache||{});next[key]=!!val;try{var x=await api('/api/staff/notification-settings',{method:'POST',body:{settings:next}});settingsCache=x.settings||next;toast('Настройки сохранены','success')}catch(e){toast(e.message,'error');throw e}}
  async function sendBroadcast(){var audience=document.getElementById('hcV3Audience').value,title=document.getElementById('hcV3BroadcastTitle').value.trim(),body=document.getElementById('hcV3BroadcastBody').value.trim(),ids=[].slice.call(document.querySelectorAll('[data-v3-employee]:checked')).map(function(x){return Number(x.dataset.v3Employee)});if(!title||!body)return toast('Заполните заголовок и сообщение','error');if(audience==='selected'&&!ids.length)return toast('Выберите сотрудников','error');if(!confirm('Отправить сообщение через Telegram-бота?'))return;var btn=document.getElementById('hcV3Send');btn.disabled=true;try{var x=await api('/api/staff/notification-broadcast',{method:'POST',body:{audience:audience,title:title,body:body,employee_ids:ids}});toast('Доставлено '+x.sent+' из '+x.requested,'success');broadcastCache=null;notifyCache=null;await loadNotify(true);renderNotifyTab('broadcast')}catch(e){toast(e.message,'error')}finally{if(btn)btn.disabled=false}}

  document.addEventListener('click',function(e){
    var t=e.target;
    if(!t||!t.closest)return;
    var nav=t.closest('#nav button');if(nav&&/Заказ/i.test(nav.textContent||'')){var now=Date.now();if(now-lastOrdersTap<700){e.preventDefault();e.stopImmediatePropagation();return}lastOrdersTap=now;document.documentElement.classList.add('hc-v3-orders-loading')}
    if(t.closest('#notices')){e.preventDefault();e.stopImmediatePropagation();openNotifications();return}
    var q=t.closest('[data-v3-go]');if(q){e.preventDefault();var k=q.dataset.v3Go;if(k==='notify')openNotifications();else navTo(k);return}
    var tab=t.closest('[data-v3-tab]');if(tab){e.preventDefault();renderNotifyTab(tab.dataset.v3Tab);return}
    if(t.closest('#hcV3NotifyBack')){e.preventDefault();var back=popOrigin()||'more';if(!navTo(back))navTo('more');return}
    if(t.closest('#hcV3Send')){e.preventDefault();sendBroadcast();return}
    var card=t.closest('.order-card.hc-v3-openable,.rt-priority-list .card.hc-v3-openable');if(card&&!t.closest('button,input,select,textarea,a')){var b=card.querySelector('.hc-inline-open,.btn[data-order],[data-order]');if(b){e.preventDefault();pushOrigin();b.click();return}}
    var backBtn=t.closest('.back,.hc-client-back');if(backBtn&&returnStack.length){e.preventDefault();e.stopImmediatePropagation();var dest=popOrigin();if(dest&&navTo(dest))return}
    if(isInternalOpen(t)&&!t.closest('.back,.hc-client-back,#nav'))pushOrigin();
  },true);
  document.addEventListener('keydown',function(e){var card=e.target&&e.target.closest&&e.target.closest('.order-card.hc-v3-openable');if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();var b=card.querySelector('.hc-inline-open,.btn[data-order],[data-order]');if(b){pushOrigin();b.click()}}},true);
  document.addEventListener('change',function(e){var t=e.target;if(t&&t.matches('[data-v3-setting]'))saveSetting(t.dataset.v3Setting,t.checked).catch(function(){t.checked=!t.checked});if(t&&t.id==='hcV3Audience'){var p=document.getElementById('hcV3Picks');if(p)p.style.display=t.value==='selected'?'grid':'none'}},true);
  document.addEventListener('hc:after-render',queue,false);window.addEventListener('pageshow',queue);document.addEventListener('visibilitychange',function(){if(!document.hidden)queue()});queue();
})();
</script>`;

export function applyStaffCommandV3(app:string):string{
  if(!app||app.includes('hcCommandV3Style'))return app;
  return app.replace('</head>',COMMAND_CSS+'</head>').replace('</body>',COMMAND_JS+'</body>');
}
