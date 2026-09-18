export const STAFF_COMMAND_V5_BUILD='staff-command-v5-2026-09-18-a';

const CSS=String.raw`
<style id="hcCommandV5Style">
html.hc-command-v5{--v5-ink:#111318;--v5-muted:#7f848c;--v5-card:#fff;--v5-soft:#f1f2f4;--v5-blue:#2474f2;--v5-green:#22a06b;--v5-red:#d84b4b}
html.hc-command-v5 .hc-v5-view-button{appearance:none;border:0;background:#eceef1;color:#4d535c;border-radius:12px;min-height:34px;padding:7px 10px;font-size:9.5px;font-weight:850;display:inline-flex;align-items:center;gap:6px}
html.hc-command-v5 .hc-v5-view-button svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
html.hc-command-v5 .hc-v3-command-head>span{margin-left:auto}
html.hc-command-v5 .hc-v5-orders-refresh{appearance:none;border:0;border-radius:12px;background:#fff;padding:7px 9px;color:#61666e;font-size:9.5px;font-weight:850;white-space:nowrap}
html.hc-command-v5 .hc-v5-orders-refresh.fresh{background:#eaf3ff;color:#1767d7}
html.hc-command-v5 #olist{contain:layout style}
html.hc-command-v5 #olist .order-card{content-visibility:auto;contain-intrinsic-size:118px}

/* Three owner-selectable home arrangements. */
html.hc-dash-compact .hc-v4-quick{min-height:78px!important;border-radius:18px!important;padding:8px 5px!important}
html.hc-dash-compact .hc-v4-quick i{width:35px!important;height:35px!important;border-radius:13px!important}
html.hc-dash-compact .hc-v4-quick svg{width:19px!important;height:19px!important}
html.hc-dash-compact #main[data-hc-catalog-page="overview"]>.grid>.metric{min-height:73px!important;border-radius:18px!important;padding:10px 11px!important}
html.hc-dash-compact #main[data-hc-catalog-page="overview"]>.grid>.metric strong{font-size:23px!important}
html.hc-dash-compact .hc-v4-attention{min-height:58px!important;border-radius:17px!important}
html.hc-dash-focus .hc-v4-quick-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
html.hc-dash-focus .hc-v4-quick{min-height:82px!important;grid-template-rows:1fr auto!important}
html.hc-dash-focus .hc-v4-quick[data-v4-go="orders"],
html.hc-dash-focus .hc-v4-quick[data-v4-go="notify"]{grid-column:span 2;min-height:68px!important;display:flex!important;justify-content:flex-start!important;gap:12px!important;padding:10px 14px!important}
html.hc-dash-focus .hc-v4-quick[data-v4-go="orders"] b,
html.hc-dash-focus .hc-v4-quick[data-v4-go="notify"] b{font-size:13px!important}
html.hc-dash-focus .hc-v4-quick[data-v4-go="orders"] i,
html.hc-dash-focus .hc-v4-quick[data-v4-go="notify"] i{width:38px!important;height:38px!important;border-radius:13px!important}
html.hc-dash-focus #main[data-hc-catalog-page="overview"]>.grid>.metric{min-height:84px!important}

/* Dashboard design chooser. */
html.hc-command-v5 .hc-v5-sheet-mask{position:fixed;inset:0;z-index:30000;background:rgba(14,18,24,.3);backdrop-filter:blur(5px);display:grid;align-items:end}
html.hc-command-v5 .hc-v5-sheet{background:#f7f7f8;border-radius:28px 28px 0 0;padding:14px 14px calc(16px + env(safe-area-inset-bottom));max-height:84vh;overflow:auto;box-shadow:0 -12px 36px rgba(0,0,0,.12)}
html.hc-command-v5 .hc-v5-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
html.hc-command-v5 .hc-v5-sheet-head strong{font-size:21px;letter-spacing:-.5px}.hc-v5-sheet-head button{border:0;background:#e7e8ea;border-radius:50%;width:34px;height:34px;font-size:18px}
html.hc-command-v5 .hc-v5-designs{display:grid;gap:9px}.hc-v5-design{appearance:none;border:2px solid transparent;background:#fff;border-radius:20px;padding:12px;text-align:left;color:#17191d}.hc-v5-design.on{border-color:#2474f2;background:#f8fbff}.hc-v5-design strong{display:block;font-size:13px}.hc-v5-design p{margin:3px 0 10px;color:#858a92;font-size:9.5px}
html.hc-command-v5 .hc-v5-mini{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.hc-v5-mini i{display:block;height:22px;border-radius:7px;background:#e8e9ec}.hc-v5-design[data-v5-dash-style="compact"] .hc-v5-mini i{height:14px}.hc-v5-design[data-v5-dash-style="focus"] .hc-v5-mini{grid-template-columns:repeat(2,1fr)}.hc-v5-design[data-v5-dash-style="focus"] .hc-v5-mini i:first-child,.hc-v5-design[data-v5-dash-style="focus"] .hc-v5-mini i:last-child{grid-column:span 2}
html.hc-command-v5 .hc-v5-sheet-actions{display:grid;grid-template-columns:1fr 1.5fr;gap:8px;margin-top:12px}.hc-v5-sheet-actions button{min-height:44px;border:0;border-radius:15px;font-weight:900}.hc-v5-sheet-actions .cancel{background:#e6e7e9;color:#4e535a}.hc-v5-sheet-actions .save{background:#111820;color:#fff}

/* Notification center V5. */
html.hc-command-v5 .hc-v3-notify-page{gap:10px!important}
html.hc-command-v5 .hc-v3-tabs{grid-template-columns:repeat(4,1fr)!important;border-radius:17px!important;padding:4px!important}
html.hc-command-v5 .hc-v3-tabs button{font-size:9.2px!important;padding:0 3px!important}
html.hc-command-v5 .hc-v5-notify-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
html.hc-command-v5 .hc-v5-notify-stat{background:#fff;border-radius:17px;padding:10px 9px;min-width:0}.hc-v5-notify-stat b{display:block;font-size:17px;color:#16181c}.hc-v5-notify-stat span{display:block;margin-top:2px;color:#8b9098;font-size:8.7px;line-height:1.2}
html.hc-command-v5 .hc-v5-feed-tools{display:grid;gap:7px}.hc-v5-feed-search{width:100%;box-sizing:border-box;border:0;background:#fff;border-radius:14px;padding:10px 12px;font-size:11px;outline:none}.hc-v5-feed-chips{display:flex;gap:5px;overflow:auto;scrollbar-width:none}.hc-v5-feed-chips::-webkit-scrollbar{display:none}.hc-v5-feed-chips button{appearance:none;border:0;border-radius:999px;background:#fff;padding:7px 10px;font-size:9px;font-weight:800;color:#6e737b;white-space:nowrap}.hc-v5-feed-chips button.on{background:#111820;color:#fff}
html.hc-command-v5 .hc-v5-notice{appearance:none;width:100%;border:0;border-radius:19px;background:#fff;padding:11px 12px;text-align:left;color:#17191d;display:grid;gap:4px}.hc-v5-notice[data-v5-order]{cursor:pointer}.hc-v5-notice[data-v5-order]:active{transform:scale(.99)}.hc-v5-notice-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.hc-v5-notice-title{display:flex;align-items:center;gap:7px;font-size:11.7px;font-weight:900}.hc-v5-notice-icon{width:25px;height:25px;border-radius:9px;background:#eef2f8;display:grid;place-items:center;flex:none;font-size:12px}.hc-v5-notice.important .hc-v5-notice-icon{background:#fff0f0}.hc-v5-notice-time{font-size:8.5px;color:#999da4;white-space:nowrap}.hc-v5-notice-body{font-size:10px;line-height:1.35;color:#71767e;margin-left:32px}.hc-v5-notice-order{display:inline-flex;margin:2px 0 0 32px;width:max-content;background:#eef5ff;color:#2468c9;border-radius:999px;padding:4px 7px;font-size:8.5px;font-weight:800}
html.hc-command-v5 .hc-v5-channel-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.hc-v5-channel-actions button{border:0;border-radius:13px;background:#fff;min-height:38px;font-size:9.5px;font-weight:850;color:#555b63}.hc-v5-channel-actions button.primary{background:#111820;color:#fff}
html.hc-command-v5 .hc-v5-channel{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;border-radius:19px;padding:12px}.hc-v5-channel strong{display:block;font-size:12px}.hc-v5-channel p{margin:3px 0 0;font-size:9.3px;color:#858a92;line-height:1.3}.hc-v5-toggle{position:relative;flex:none;width:45px;height:28px}.hc-v5-toggle input{position:absolute;opacity:0}.hc-v5-toggle i{position:absolute;inset:0;border-radius:999px;background:#d6d8dc}.hc-v5-toggle i:after{content:'';position:absolute;width:24px;height:24px;left:2px;top:2px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.16);transition:transform .18s}.hc-v5-toggle input:checked+i{background:#34c759}.hc-v5-toggle input:checked+i:after{transform:translateX(17px)}
html.hc-command-v5 .hc-v5-template-picker{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.hc-v5-template-picker::-webkit-scrollbar{display:none}.hc-v5-template-picker button{appearance:none;border:0;border-radius:12px;background:#fff;padding:8px 10px;font-size:9px;font-weight:850;color:#6e737b;white-space:nowrap}.hc-v5-template-picker button.on{background:#111820;color:#fff}.hc-v5-template-card{background:#fff;border-radius:20px;padding:12px;display:grid;gap:8px}.hc-v5-template-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.hc-v5-template-top strong{font-size:12.5px}.hc-v5-template-actions{display:flex;gap:5px}.hc-v5-template-actions button{border:0;border-radius:10px;background:#eef0f2;padding:6px 8px;font-size:8.5px;font-weight:850;color:#5f646c}.hc-v5-template-card>p{margin:-3px 0 0;color:#898e96;font-size:9.3px}.hc-v5-template-card textarea{width:100%;box-sizing:border-box;min-height:104px;border:0;border-radius:14px;background:#f3f4f5;padding:10px 11px;font:inherit;font-size:10.5px;line-height:1.4;outline:none;resize:vertical}.hc-v5-vars{display:flex;gap:5px;overflow:auto;scrollbar-width:none}.hc-v5-vars button{border:0;border-radius:999px;background:#eef5ff;color:#2266c8;padding:5px 7px;font-size:8px;white-space:nowrap}.hc-v5-preview{border-radius:14px;background:#eff1f3;padding:10px;font-size:9.7px;line-height:1.4;color:#4e535a}.hc-v5-template-save{min-height:39px;border:0;border-radius:13px;background:#111820;color:#fff;font-size:10px;font-weight:900}
html.hc-command-v5 .hc-v5-compose{display:grid;gap:8px;background:#fff;border-radius:21px;padding:12px}.hc-v5-compose label{font-size:9px;color:#7e838b;font-weight:850}.hc-v5-compose input,.hc-v5-compose textarea,.hc-v5-compose select{width:100%;box-sizing:border-box;border:0;background:#f2f3f5;border-radius:13px;padding:10px 11px;font:inherit;font-size:11px;outline:none}.hc-v5-compose textarea{min-height:105px;resize:vertical}.hc-v5-send{border:0;border-radius:14px;background:#111820;color:#fff;min-height:42px;font-size:10.5px;font-weight:900}.hc-v5-send:disabled{opacity:.45}.hc-v5-picks{display:none;grid-template-columns:1fr 1fr;gap:5px;max-height:180px;overflow:auto}.hc-v5-picks.on{display:grid}.hc-v5-pick{display:flex;align-items:center;gap:6px;background:#f4f5f6;border-radius:11px;padding:7px;font-size:9px}.hc-v5-history{display:grid;gap:6px}.hc-v5-history-row{background:#fff;border-radius:15px;padding:9px 10px}.hc-v5-history-row b{font-size:10.5px}.hc-v5-history-row span{display:block;margin-top:2px;color:#8a8f96;font-size:8.7px}
html.hc-command-v5 .hc-v5-empty{padding:26px 14px;text-align:center;background:#fff;border-radius:19px;color:#888d95;font-size:10.5px}
html.hc-command-v5 .hc-v4-template-wrap{display:none!important}
@media(max-width:390px){html.hc-command-v5 .hc-v5-notify-summary{grid-template-columns:repeat(3,minmax(0,1fr))}.hc-v5-picks{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){html.hc-command-v5 .hc-v5-toggle i:after,html.hc-command-v5 .hc-v5-notice{transition:none!important}}
</style>`;

const JS=String.raw`
<script id="hcCommandV5Script">
(function(){
 if(window.__hcCommandV5)return;window.__hcCommandV5=true;document.documentElement.classList.add('hc-command-v5');
 var queued=false,notifyTab='feed',noticeFilter='all',noticeQuery='',notices=null,settings=null,templates=null,broadcasts=null,employees=null,dashboard=null,dashboardBefore='balanced',ordersPending=false,textKey='new_order';
 var channelRows=[['new_order','Новые заявки','Новый заказ и основные данные'],['order_changed','Изменения заказов','Дата, время, адрес и услуга'],['order_cancelled','Отмена заказа','Сразу сообщать руководителю'],['defects','Дефекты до уборки','Фото найденного дефекта'],['finance_changes','Финансы и реквизиты','Изменения реквизитов сотрудников']];
 var textRows=[['new_order','Новая заявка','Автоматическое сообщение руководителю'],['order_changed','Изменение заказа','Когда изменились данные заказа'],['order_cancelled','Отмена заказа','Когда заказ отменён'],['defects','Дефект до уборки','Подпись к фото дефекта для руководителя'],['finance_changes','Реквизиты сотрудника','Когда сотрудник меняет реквизиты'],['broadcast','Рассылка','Шаблон ручных сообщений команде']];
 var sample={order:'Заказ #30',date:'18.09.2026',time:'14:30',address:'Санкт-Петербург, Невский проспект, 10',service:'Генеральная уборка',area:'65 м²',comment:'Царапина на столешнице',employee:'Алексей',title:'Изменение графика',body:'Завтра начинаем на час позже.',brand:'HOUSE CLEANING STAFF'};
 function tg(){return window.Telegram&&window.Telegram.WebApp}
 function headers(){var t=tg(),h={'content-type':'application/json'},launch=new URLSearchParams(location.search).get('launch')||'';if(launch)h['X-App-Launch-Token']=launch;if(t&&t.initData)h['X-Telegram-Init-Data']=t.initData;return h}
 async function api(path,opt){opt=opt||{};var r=await fetch(path,{method:opt.method||'GET',headers:headers(),body:opt.body?JSON.stringify(opt.body):undefined,cache:'no-store'}),x=await r.json().catch(function(){return{ok:false,error:'Ошибка сервера'}});if(!r.ok||x.ok===false)throw Error(x.error||'Ошибка');return x}
 function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
 function toast(s,k){if(window.__hcToast)return window.__hcToast(s,k);try{tg()&&tg().showAlert(s)}catch(e){}}
 function fmt(ts){try{return new Date(Number(ts||0)).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return''}}
 function activeTab(){var b=document.querySelector('#nav button.on');return b&&b.dataset.n||''}
 function navTo(k){var b=document.querySelector('#nav button[data-n="'+k+'"]');if(!b)return false;b.click();return true}
 function icon(kind){if(kind==='important')return'!';if(kind==='order')return'▤';return'•'}
 function noticeKind(n){var s=(String(n&&n.level||'')+' '+String(n&&n.title||'')).toLowerCase();if(s.indexOf('warning')>=0||s.indexOf('отмен')>=0||s.indexOf('дефект')>=0||s.indexOf('ошиб')>=0)return'important';if(n&&n.order_number||s.indexOf('заяв')>=0||s.indexOf('заказ')>=0)return'order';return'system'}
 function currentPage(){var m=document.getElementById('main');if(!m)return'';if(m.querySelector('.hc-v3-notify-page'))return'notifications';return m.dataset.hcCatalogPage||''}
 function updateSummary(){
   var box=document.getElementById('hcV5NotifySummary');if(!box)return;
   var a=notices||[],important=a.filter(function(n){return noticeKind(n)==='important'}).length,on=settings?Object.keys(settings).filter(function(k){return settings[k]!==false}).length:'—';
   box.innerHTML='<div class="hc-v5-notify-stat"><b>'+a.length+'</b><span>событий в ленте</span></div><div class="hc-v5-notify-stat"><b>'+important+'</b><span>важных событий</span></div><div class="hc-v5-notify-stat"><b>'+on+'</b><span>каналов включено</span></div>';
 }
 async function loadNotices(force){if(force||!notices){var x=await api('/api/staff/notifications');notices=x.notices||[]}return notices}
 async function loadSettings(force){if(force||!settings){var x=await api('/api/staff/notification-settings');settings=x.settings||{}}return settings}
 async function loadTemplates(force){if(force||!templates){templates=await api('/api/staff/notification-templates')}return templates}
 async function loadBroadcast(force){if(force||!broadcasts){var x=await api('/api/staff/notification-broadcasts');broadcasts=x.history||[]}if(force||!employees){try{var e=await api('/api/staff/employees');employees=(e.employees||[]).filter(function(v){return v&&v.status==='active'})}catch(x){employees=[]}}return true}
 function upgradeNotifications(){
   var page=document.querySelector('.hc-v3-notify-page');if(!page)return;
   if(page.dataset.v5==='1')return;
   page.dataset.v5='1';
   var tabs=page.querySelector('.hc-v3-tabs'),pane=document.getElementById('hcV3NotifyPane');if(!tabs||!pane)return;
   tabs.innerHTML='<button data-v5-ntab="feed" class="on">Лента</button><button data-v5-ntab="channels">Каналы</button><button data-v5-ntab="texts">Тексты</button><button data-v5-ntab="broadcast">Рассылка</button>';
   var sum=document.createElement('div');sum.id='hcV5NotifySummary';sum.className='hc-v5-notify-summary';tabs.parentNode.insertBefore(sum,pane);
   renderNotify('feed');
 }
 async function renderNotify(tab){
   notifyTab=tab;var pane=document.getElementById('hcV3NotifyPane');if(!pane)return;
   document.querySelectorAll('[data-v5-ntab]').forEach(function(b){b.classList.toggle('on',b.dataset.v5Ntab===tab)});
   pane.innerHTML='<div class="hc-v5-empty">Загрузка…</div>';
   try{
     if(tab==='feed'){await Promise.all([loadNotices(false),loadSettings(false)]);renderFeed(pane)}
     else if(tab==='channels'){await loadSettings(false);renderChannels(pane)}
     else if(tab==='texts'){await loadTemplates(false);renderTexts(pane)}
     else{await loadBroadcast(false);renderBroadcast(pane)}
     updateSummary();
   }catch(e){pane.innerHTML='<div class="hc-v5-empty">'+esc(e.message)+'</div>'}
 }
 function renderFeed(pane){
   pane.innerHTML='<div class="hc-v5-feed-tools"><input id="hcV5NoticeSearch" class="hc-v5-feed-search" placeholder="Поиск по уведомлениям" value="'+esc(noticeQuery)+'"><div class="hc-v5-feed-chips"><button data-v5-nfilter="all" class="'+(noticeFilter==='all'?'on':'')+'">Все</button><button data-v5-nfilter="order" class="'+(noticeFilter==='order'?'on':'')+'">Заказы</button><button data-v5-nfilter="important" class="'+(noticeFilter==='important'?'on':'')+'">Важное</button><button data-v5-nfilter="system" class="'+(noticeFilter==='system'?'on':'')+'">Система</button></div></div><div id="hcV5NoticeList"></div>';
   drawFeed();
 }
 function drawFeed(){
   var host=document.getElementById('hcV5NoticeList');if(!host)return;var q=noticeQuery.toLowerCase(),rows=(notices||[]).filter(function(n){var k=noticeKind(n),text=(String(n.title||'')+' '+String(n.body||'')+' '+String(n.order_number||'')).toLowerCase();return(noticeFilter==='all'||k===noticeFilter)&&(!q||text.indexOf(q)>=0)});
   host.innerHTML=rows.length?rows.slice(0,100).map(function(n){var k=noticeKind(n),tag=n.order_number?'<span class="hc-v5-notice-order">'+esc(n.order_number)+'</span>':'';var tagName=n.order_number?'button':'div';return'<'+tagName+' class="hc-v5-notice '+(k==='important'?'important':'')+'" '+(n.order_number?'data-v5-order="'+esc(n.order_number)+'"':'')+'><div class="hc-v5-notice-head"><div class="hc-v5-notice-title"><span class="hc-v5-notice-icon">'+icon(k)+'</span>'+esc(n.title||'Событие')+'</div><span class="hc-v5-notice-time">'+esc(fmt(n.at))+'</span></div><div class="hc-v5-notice-body">'+esc(n.body||'')+'</div>'+tag+'</'+tagName+'>'}).join(''):'<div class="hc-v5-empty">По этому фильтру ничего нет</div>';
 }
 function renderChannels(pane){
   var on=Object.keys(settings||{}).filter(function(k){return settings[k]!==false}).length;
   pane.innerHTML='<div class="hc-v3-note"><b>Каналы уведомлений</b><br>Здесь решаете, что бот отправляет руководителю. Критические назначения и отмены для сотрудников остаются системными.</div><div class="hc-v5-channel-actions"><button data-v5-channels="off">Выключить все</button><button class="primary" data-v5-channels="on">Включить все</button></div>'+channelRows.map(function(r){var checked=settings&&settings[r[0]]!==false;return'<label class="hc-v5-channel"><span><strong>'+esc(r[1])+'</strong><p>'+esc(r[2])+'</p></span><span class="hc-v5-toggle"><input type="checkbox" data-v5-setting="'+r[0]+'" '+(checked?'checked':'')+'><i></i></span></label>'}).join('')+'<div class="hc-v3-note">Сейчас включено '+on+' из '+channelRows.length+' типов.</div>';
 }
 async function saveSettings(next){var x=await api('/api/staff/notification-settings',{method:'POST',body:{settings:next}});settings=x.settings||next;updateSummary();toast('Настройки сохранены','success')}
 function renderTemplatePreview(key){
   var ta=document.querySelector('[data-v5-text="'+key+'"]'),p=document.querySelector('[data-v5-preview="'+key+'"]');if(!ta||!p)return;var out=String(ta.value||'');Object.keys(sample).forEach(function(k){out=out.split('{'+k+'}').join(sample[k])});p.innerHTML=esc(out).replace(/\n/g,'<br>');
 }
 function renderTexts(pane){
   var x=templates||{},vals=x.templates||{},ph=x.placeholders||{},row=textRows.find(function(r){return r[0]===textKey})||textRows[0];textKey=row[0];
   var vars=(ph[textKey]||[]).map(function(v){return'<button data-v5-var="'+esc(v)+'" data-v5-key="'+textKey+'">{'+esc(v)+'}</button>'}).join('');
   pane.innerHTML='<div class="hc-v3-note"><b>Тексты сообщений</b><br>Сначала выберите тип уведомления. Ниже меняется только один текст — так быстрее и удобнее на телефоне.</div><div class="hc-v5-template-picker">'+textRows.map(function(r){return'<button data-v5-text-key="'+r[0]+'" class="'+(r[0]===textKey?'on':'')+'">'+esc(r[1])+'</button>'}).join('')+'</div><div class="hc-v5-template-card" data-v5-template="'+textKey+'"><div class="hc-v5-template-top"><strong>'+esc(row[1])+'</strong><div class="hc-v5-template-actions"><button data-v5-reset="'+textKey+'">Сбросить</button><button data-v5-test="'+textKey+'">Тест в Telegram</button></div></div><p>'+esc(row[2])+'</p><textarea data-v5-text="'+textKey+'">'+esc(vals[textKey]||'')+'</textarea><div class="hc-v5-vars">'+vars+'</div><div class="hc-v5-preview" data-v5-preview="'+textKey+'"></div><button class="hc-v5-template-save" data-v5-save="'+textKey+'">Сохранить изменения</button></div>';
   renderTemplatePreview(textKey);
 }
 async function saveTemplate(key,test){
   var ta=document.querySelector('[data-v5-text="'+key+'"]');if(!ta||!ta.value.trim())return toast('Текст не может быть пустым','error');
   var x=await loadTemplates(false),all=Object.assign({},x.templates||{});all[key]=ta.value.trim();templates=await api('/api/staff/notification-templates',{method:'POST',body:{templates:all}});toast('Текст сохранён','success');
   if(test){await api('/api/staff/notification-template-test',{method:'POST',body:{key:key}});toast('Тест отправлен вам в Telegram','success')}
 }
 function resetTemplate(key){var d=templates&&templates.defaults&&templates.defaults[key],ta=document.querySelector('[data-v5-text="'+key+'"]');if(!d||!ta)return toast('Стандартный текст недоступен','error');ta.value=d;renderTemplatePreview(key)}
 function renderBroadcast(pane){
   var es=employees||[],h=broadcasts||[];
   pane.innerHTML='<div class="hc-v5-compose"><label>Кому</label><select id="hcV5Audience"><option value="employees">Всем сотрудникам</option><option value="admins">Администраторам</option><option value="all_team">Всей команде</option><option value="selected">Выбрать сотрудников</option></select><div id="hcV5Picks" class="hc-v5-picks">'+es.map(function(e){return'<label class="hc-v5-pick"><input type="checkbox" data-v5-employee="'+Number(e.id)+'"><span>'+esc(e.name||('ID '+e.id))+'</span></label>'}).join('')+'</div><label>Заголовок</label><input id="hcV5BroadcastTitle" maxlength="120" placeholder="Например: Изменение графика"><label>Сообщение</label><textarea id="hcV5BroadcastBody" maxlength="1500" placeholder="Напишите сообщение команде"></textarea><button id="hcV5BroadcastSend" class="hc-v5-send">Отправить через бота</button></div><div class="hc-v4-upcoming-head"><h2>История</h2><span>'+h.length+'</span></div><div class="hc-v5-history">'+(h.length?h.slice(0,15).map(function(r){return'<div class="hc-v5-history-row"><b>'+esc(r.title||'Рассылка')+'</b><span>'+esc(fmt(r.at))+' · доставлено '+Number(r.sent||0)+' из '+Number(r.requested||0)+'</span></div>'}).join(''):'<div class="hc-v5-empty">Рассылок ещё не было</div>')+'</div>';
 }
 async function sendBroadcast(){
   var a=document.getElementById('hcV5Audience'),t=document.getElementById('hcV5BroadcastTitle'),b=document.getElementById('hcV5BroadcastBody');if(!a||!t||!b)return;
   var ids=[].slice.call(document.querySelectorAll('[data-v5-employee]:checked')).map(function(x){return Number(x.dataset.v5Employee)}),title=t.value.trim(),body=b.value.trim();if(!title||!body)return toast('Заполните заголовок и сообщение','error');if(a.value==='selected'&&!ids.length)return toast('Выберите сотрудников','error');
   if(!confirm('Отправить сообщение через Telegram-бота?'))return;var btn=document.getElementById('hcV5BroadcastSend');if(btn)btn.disabled=true;
   try{var x=await api('/api/staff/notification-broadcast',{method:'POST',body:{audience:a.value,title:title,body:body,employee_ids:ids}});toast('Доставлено '+x.sent+' из '+x.requested,'success');broadcasts=null;notices=null;await loadBroadcast(true);renderBroadcast(document.getElementById('hcV3NotifyPane'));updateSummary()}catch(e){toast(e.message,'error')}finally{if(btn)btn.disabled=false}
 }
 async function openOrder(number){
   if(!number)return;navTo('orders');requestAnimationFrame(function(){requestAnimationFrame(function(){var b=document.querySelector('[data-order="'+CSS.escape(number)+'"]');if(b)b.click();else{var q=document.getElementById('search');if(q){q.value=number;q.dispatchEvent(new Event('input',{bubbles:true}))}}})});
 }
 function applyDashboard(style){style=['balanced','compact','focus'].indexOf(style)>=0?style:'balanced';document.documentElement.classList.remove('hc-dash-balanced','hc-dash-compact','hc-dash-focus');document.documentElement.classList.add('hc-dash-'+style);if(dashboard)dashboard.style=style}
 async function loadDashboard(){if(dashboard)return dashboard;try{var x=await api('/api/staff/dashboard-preferences');dashboard=x.preferences||{style:'balanced'}}catch(e){dashboard={style:'balanced'}}applyDashboard(dashboard.style);return dashboard}
 async function decorateOverview(main){
   await loadDashboard();var head=main.querySelector('.hc-v3-command-head');if(!head||head.querySelector('.hc-v5-view-button'))return;
   var b=document.createElement('button');b.className='hc-v5-view-button';b.type='button';b.dataset.v5View='1';b.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 12h3M11 12h9M4 17h7M15 17h5"/><circle cx="16" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="13" cy="17" r="2"/></svg>Вид главной';head.appendChild(b);
 }
 function openDashboardSheet(){
   dashboardBefore=dashboard&&dashboard.style||'balanced';var old=document.getElementById('hcV5DashSheet');if(old)old.remove();
   var mask=document.createElement('div');mask.id='hcV5DashSheet';mask.className='hc-v5-sheet-mask';mask.innerHTML='<div class="hc-v5-sheet"><div class="hc-v5-sheet-head"><strong>Дизайн главной</strong><button data-v5-dash-close>×</button></div><div class="hc-v5-designs"><button class="hc-v5-design" data-v5-dash-style="balanced"><strong>Карточки</strong><p>Крупные быстрые действия и понятные показатели.</p><span class="hc-v5-mini"><i></i><i></i><i></i><i></i></span></button><button class="hc-v5-design" data-v5-dash-style="compact"><strong>Компактный</strong><p>Больше информации помещается на одном экране.</p><span class="hc-v5-mini"><i></i><i></i><i></i><i></i></span></button><button class="hc-v5-design" data-v5-dash-style="focus"><strong>Рабочий</strong><p>Заявки и оповещения заметнее остальных действий.</p><span class="hc-v5-mini"><i></i><i></i><i></i><i></i></span></button></div><div class="hc-v5-sheet-actions"><button class="cancel" data-v5-dash-close>Отмена</button><button class="save" data-v5-dash-save>Сохранить</button></div></div>';document.body.appendChild(mask);selectDashboardChoice(dashboardBefore);
 }
 function selectDashboardChoice(style){document.querySelectorAll('[data-v5-dash-style]').forEach(function(b){b.classList.toggle('on',b.dataset.v5DashStyle===style)});applyDashboard(style)}
 function closeDashboardSheet(revert){var m=document.getElementById('hcV5DashSheet');if(m)m.remove();if(revert)applyDashboard(dashboardBefore)}
 async function saveDashboard(){try{var style=dashboard&&dashboard.style||'balanced',x=await api('/api/staff/dashboard-preferences',{method:'POST',body:{preferences:{style:style}}});dashboard=x.preferences||{style:style};applyDashboard(dashboard.style);closeDashboardSheet(false);toast('Дизайн главной сохранён','success')}catch(e){toast(e.message,'error')}}
 function decorateOrders(main){
   var title=main.querySelector(':scope>.section-title');if(!title||title.querySelector('.hc-v5-orders-refresh'))return;var b=document.createElement('button');b.type='button';b.className='hc-v5-orders-refresh'+(ordersPending?' fresh':'');b.dataset.v5OrdersRefresh='1';b.textContent=ordersPending?'Обновить •':'Обновить';title.appendChild(b);
 }
 function queue(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;var main=document.getElementById('main');if(!main)return;var p=currentPage();if(p==='overview')decorateOverview(main);if(p==='orders')decorateOrders(main);if(p==='notifications')upgradeNotifications()})}
 document.addEventListener('hc:notifications-ready',function(){upgradeNotifications()},false);
 document.addEventListener('hc:orders-data-ready',function(){ordersPending=true;var b=document.querySelector('[data-v5-orders-refresh]');if(b){b.classList.add('fresh');b.textContent='Обновить •'}},false);
 document.addEventListener('hc:after-render',queue,false);
 document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;
   var nt=t.closest('[data-v5-ntab]');if(nt){e.preventDefault();renderNotify(nt.dataset.v5Ntab);return}
   var nf=t.closest('[data-v5-nfilter]');if(nf){e.preventDefault();noticeFilter=nf.dataset.v5Nfilter;document.querySelectorAll('[data-v5-nfilter]').forEach(function(b){b.classList.toggle('on',b===nf)});drawFeed();return}
   var order=t.closest('[data-v5-order]');if(order){e.preventDefault();openOrder(order.dataset.v5Order);return}
   var bulk=t.closest('[data-v5-channels]');if(bulk){e.preventDefault();var next=Object.assign({},settings||{}),val=bulk.dataset.v5Channels==='on';channelRows.forEach(function(r){next[r[0]]=val});saveSettings(next).then(function(){renderChannels(document.getElementById('hcV3NotifyPane'))}).catch(function(x){toast(x.message,'error')});return}
   var tk=t.closest('[data-v5-text-key]');if(tk){e.preventDefault();textKey=tk.dataset.v5TextKey;renderTexts(document.getElementById('hcV3NotifyPane'));return}
   var sv=t.closest('[data-v5-save]');if(sv){e.preventDefault();saveTemplate(sv.dataset.v5Save,false).catch(function(x){toast(x.message,'error')});return}
   var st=t.closest('[data-v5-test]');if(st){e.preventDefault();saveTemplate(st.dataset.v5Test,true).catch(function(x){toast(x.message,'error')});return}
   var rs=t.closest('[data-v5-reset]');if(rs){e.preventDefault();resetTemplate(rs.dataset.v5Reset);return}
   var vr=t.closest('[data-v5-var]');if(vr){e.preventDefault();var key=vr.dataset.v5Key,ta=document.querySelector('[data-v5-text="'+key+'"]');if(ta){var token='{'+vr.dataset.v5Var+'}',s=ta.selectionStart||0,en=ta.selectionEnd||0;ta.value=ta.value.slice(0,s)+token+ta.value.slice(en);ta.focus();ta.selectionStart=ta.selectionEnd=s+token.length;renderTemplatePreview(key)}return}
   if(t.closest('#hcV5BroadcastSend')){e.preventDefault();sendBroadcast();return}
   if(t.closest('[data-v5-view]')){e.preventDefault();openDashboardSheet();return}
   var ds=t.closest('[data-v5-dash-style]');if(ds){e.preventDefault();selectDashboardChoice(ds.dataset.v5DashStyle);return}
   if(t.closest('[data-v5-dash-save]')){e.preventDefault();saveDashboard();return}
   if(t.closest('[data-v5-dash-close]')){e.preventDefault();closeDashboardSheet(true);return}
   if(t.closest('[data-v5-orders-refresh]')){e.preventDefault();var y=window.scrollY||0;ordersPending=false;navTo('orders');requestAnimationFrame(function(){requestAnimationFrame(function(){window.scrollTo(0,y)})});return}
   setTimeout(queue,0);
 },false);
 document.addEventListener('change',function(e){var t=e.target;if(!t)return;
   if(t.matches('[data-v5-setting]')){var next=Object.assign({},settings||{});next[t.dataset.v5Setting]=!!t.checked;saveSettings(next).catch(function(x){t.checked=!t.checked;toast(x.message,'error')});return}
   if(t.id==='hcV5Audience'){var p=document.getElementById('hcV5Picks');if(p)p.classList.toggle('on',t.value==='selected')}
 },false);
 document.addEventListener('input',function(e){var t=e.target;if(!t)return;if(t.id==='hcV5NoticeSearch'){noticeQuery=t.value||'';drawFeed();return}if(t.matches('[data-v5-text]'))renderTemplatePreview(t.dataset.v5Text)},false);
 window.addEventListener('pageshow',queue);document.addEventListener('visibilitychange',function(){if(!document.hidden)queue()});queue();
})();
</script>`;

export function applyStaffCommandV5(app:string):string{
  if(!app||app.includes('hcCommandV5Script'))return app;
  return app.replace('</head>',CSS+'</head>').replace('</body>',JS+'</body>');
}
