export const STAFF_CATALOG_DESIGN_BUILD='staff-catalog-design-2026-09-17-a';

const CATALOG_CSS=String.raw`
<style id="hcCatalogDesign">
:root{
  --hc-catalog-bg:#f4f5f7;
  --hc-catalog-card:#ffffff;
  --hc-catalog-ink:#101114;
  --hc-catalog-muted:#6e747d;
  --hc-catalog-line:#e6e8ec;
  --hc-catalog-blue:#2474f2;
  --hc-catalog-blue-soft:#eaf2ff;
  --hc-catalog-green:#20a56a;
  --hc-catalog-yellow:#ffd54a;
  --hc-catalog-radius:20px;
}
html.hc-catalog-ui{background:#dfe7ef!important}
html.hc-catalog-ui body{
  background:linear-gradient(180deg,#f7f8fa 0%,#f3f5f8 44%,#f6f7f9 100%)!important;
  color:var(--hc-catalog-ink)!important;
  padding-bottom:calc(91px + env(safe-area-inset-bottom))!important;
}
html.hc-catalog-ui .app{max-width:760px!important}
html.hc-catalog-ui .top{
  padding:10px 14px!important;
  min-height:64px!important;
  background:rgba(255,255,255,.92)!important;
  border-bottom:1px solid rgba(228,231,236,.92)!important;
  box-shadow:none!important;
  backdrop-filter:blur(18px) saturate(135%)!important;
  -webkit-backdrop-filter:blur(18px) saturate(135%)!important;
}
html.hc-catalog-ui .brand{gap:10px!important}
html.hc-catalog-ui .mark{width:40px!important;height:40px!important;border-radius:14px!important;font-size:15px!important;box-shadow:none!important}
html.hc-catalog-ui .brand b{font-size:16px!important;color:#11151a!important;letter-spacing:-.25px!important}
html.hc-catalog-ui .brand small{font-size:11px!important;color:#7d8693!important}
html.hc-catalog-ui .main{padding:13px 12px 22px!important}

/* Compact overview: information first, decoration second. */
html.hc-catalog-ui .hero{
  min-height:0!important;
  margin:0 0 10px!important;
  padding:17px 17px 16px!important;
  border-radius:22px!important;
  border:1px solid rgba(227,232,240,.96)!important;
  background:linear-gradient(135deg,#fff 0%,#fff 62%,#edf4ff 100%)!important;
  box-shadow:0 7px 22px rgba(22,34,55,.055)!important;
  color:#11151a!important;
}
html.hc-catalog-ui .hero:after{right:-34px!important;top:-52px!important;width:150px!important;height:150px!important;background:rgba(36,116,242,.08)!important}
html.hc-catalog-ui .hero h1{font-size:23px!important;line-height:1.08!important;letter-spacing:-.65px!important;color:#11151a!important;margin:0 0 7px!important}
html.hc-catalog-ui .hero p{font-size:12.5px!important;line-height:1.4!important;color:#6e747d!important;margin:0!important;max-width:88%!important}
html.hc-catalog-ui .grid{gap:8px!important}
html.hc-catalog-ui .metric{
  min-height:78px!important;
  padding:11px 12px!important;
  border-radius:18px!important;
  border:1px solid var(--hc-catalog-line)!important;
  background:#fff!important;
  box-shadow:none!important;
  justify-content:flex-start!important;
}
html.hc-catalog-ui .metric strong{font-size:24px!important;line-height:1!important;letter-spacing:-.7px!important;color:#11151a!important}
html.hc-catalog-ui .metric span{font-size:10.5px!important;line-height:1.25!important;margin-top:6px!important;color:#7a828d!important}
html.hc-catalog-ui .section-title{margin:16px 2px 8px!important}
html.hc-catalog-ui .section-title h2{font-size:19px!important;line-height:1.08!important;letter-spacing:-.4px!important;color:#11151a!important}
html.hc-catalog-ui .section-title span{font-size:10.5px!important;color:#89919c!important}

/* Catalogue cards. */
html.hc-catalog-ui .card,
html.hc-catalog-ui .order-card,
html.hc-catalog-ui .task-card,
html.hc-catalog-ui .notice-card,
html.hc-catalog-ui .rt-priority-list .card,
html.hc-catalog-ui .hc-clients-entry,
html.hc-catalog-ui .hc-admin-access-card{
  border:1px solid var(--hc-catalog-line)!important;
  border-radius:19px!important;
  background:#fff!important;
  box-shadow:0 4px 14px rgba(20,28,42,.035)!important;
}
html.hc-catalog-ui .card{padding:11px 12px!important;margin-bottom:8px!important}
html.hc-catalog-ui .title{font-size:15px!important;letter-spacing:-.2px!important;color:#15191f!important}
html.hc-catalog-ui .sub{font-size:11.5px!important;line-height:1.38!important;color:#727b88!important}
html.hc-catalog-ui .avatar{width:42px!important;height:42px!important;border-radius:14px!important;background:#f3f5f8!important;border-color:#e5e8ed!important;color:#394454!important}
html.hc-catalog-ui .chip{min-height:24px!important;padding:4px 8px!important;font-size:9.5px!important;border-radius:999px!important}
html.hc-catalog-ui .hc-short-order{min-height:24px!important;padding:3px 8px!important;font-size:10px!important;background:#f0f5ff!important;border-color:#cedfff!important}
html.hc-catalog-ui .hc-card-client{font-size:14px!important;color:#181c22!important}
html.hc-catalog-ui .order-address,
html.hc-catalog-ui .hc-human-address{font-size:11.5px!important;line-height:1.34!important;margin-top:5px!important;color:#596473!important}
html.hc-catalog-ui .compact-meta{margin-top:5px!important}.compact-meta span{font-size:9.5px!important}
html.hc-catalog-ui .team-state{font-size:9.5px!important;padding:4px 7px!important}
html.hc-catalog-ui .hc-attention-card{padding:8px 9px!important;border-radius:14px!important;background:#fbfbfc!important;border-color:#eceef2!important}
html.hc-catalog-ui .hc-attention-reason{padding:6px 8px!important;font-size:10px!important;border-radius:10px!important}
html.hc-catalog-ui .hc-attention-reason:before{width:15px!important;height:15px!important;flex-basis:15px!important;font-size:9px!important}

/* Buttons read like product actions rather than large banners. */
html.hc-catalog-ui .btn{
  min-height:40px!important;
  padding:9px 13px!important;
  border-radius:14px!important;
  font-size:12px!important;
  font-weight:800!important;
  background:#2474f2!important;
  box-shadow:none!important;
}
html.hc-catalog-ui .btn.small{min-height:35px!important;padding:7px 10px!important;border-radius:12px!important;font-size:11px!important}
html.hc-catalog-ui .btn.secondary,
html.hc-catalog-ui .btn.soft{background:#f4f6f9!important;color:#26313f!important;border:1px solid #e3e7ed!important;box-shadow:none!important}
html.hc-catalog-ui .hc-orders-refresh{min-height:32px!important;padding:6px 9px!important;border-radius:11px!important;background:#fff!important;border-color:#e2e6ec!important;color:#3e6fae!important;box-shadow:none!important}
html.hc-catalog-ui .search,
html.hc-catalog-ui .input,
html.hc-catalog-ui select,
html.hc-catalog-ui textarea,
html.hc-catalog-ui .money{min-height:43px!important;border-radius:14px!important;border-color:#e0e4ea!important;background:#fff!important;box-shadow:none!important;font-size:13px!important}
html.hc-catalog-ui .filter{min-height:34px!important;padding:7px 11px!important;border-radius:12px!important;background:#fff!important;border-color:#e2e6ec!important;box-shadow:none!important;font-size:10.5px!important}
html.hc-catalog-ui .filter.on{background:#151a20!important;color:#fff!important;border-color:#151a20!important;box-shadow:none!important}
html.hc-catalog-ui .back{min-height:38px!important;border-radius:13px!important;padding:8px 11px!important;background:rgba(255,255,255,.94)!important;box-shadow:none!important;border-color:#e0e4e9!important;font-size:11.5px!important}

/* Order cards keep the existing data but make the action feel integrated. */
html.hc-catalog-ui .order-card,
html.hc-catalog-ui .rt-priority-list .card{position:relative!important;padding:10px 98px 10px 11px!important;min-height:92px!important;overflow:hidden!important}
html.hc-catalog-ui .order-card .hc-inline-open,
html.hc-catalog-ui .rt-priority-list .card .hc-inline-open{
  position:absolute!important;
  right:9px!important;
  top:50%!important;
  transform:translateY(-50%)!important;
  min-width:78px!important;
  min-height:36px!important;
  padding:7px 10px!important;
  margin:0!important;
  border-radius:12px!important;
  background:#f2f6ff!important;
  border:1px solid #d7e4fb!important;
  color:#2467ca!important;
  box-shadow:none!important;
  font-size:11px!important;
  font-weight:850!important;
}
html.hc-catalog-ui .order-card .hc-inline-open:active,
html.hc-catalog-ui .rt-priority-list .card .hc-inline-open:active{transform:translateY(-50%) scale(.97)!important}

/* Detailed record: white sheet with section cells, inspired by modern appointment records. */
html.hc-catalog-ui .rt-modal{background:rgba(17,20,25,.28)!important;backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important}
html.hc-catalog-ui .rt-sheet{
  background:#f7f7f8!important;
  border-radius:28px 28px 0 0!important;
  border:1px solid #e5e7eb!important;
  box-shadow:0 -24px 60px rgba(17,20,25,.15)!important;
}
html.hc-catalog-ui .rt-sheet .card,
html.hc-catalog-ui .rt-sheet .readonly-box,
html.hc-catalog-ui .rt-sheet .notice,
html.hc-catalog-ui .rt-sheet .dangerbox{
  border-radius:17px!important;
  border:1px solid #e6e8ec!important;
  background:#fff!important;
  box-shadow:none!important;
}
html.hc-catalog-ui .rt-sheet h2,
html.hc-catalog-ui .rt-sheet h3{color:#101114!important;letter-spacing:-.35px!important}
html.hc-catalog-ui .rt-sheet .label{font-size:10.5px!important;color:#7d858f!important}

/* Catalogue-like More and client entries. */
html.hc-catalog-ui .hc-clients-entry,
html.hc-catalog-ui .hc-admin-access-card{min-height:62px!important;padding:11px 13px!important;margin:7px 0!important;background:#fff!important}
html.hc-catalog-ui .hc-clients-entry strong,
html.hc-catalog-ui .hc-admin-access-card strong{font-size:13px!important;color:#171b20!important}
html.hc-catalog-ui .hc-clients-entry span span,
html.hc-catalog-ui .hc-admin-access-card span span{font-size:10.5px!important;color:#7b838e!important}

/* Smaller, cleaner floating navigation. */
html.hc-catalog-ui .nav{left:10px!important;right:10px!important;bottom:7px!important}
html.hc-catalog-ui .navin{
  min-height:69px!important;
  padding:6px 5px!important;
  border-radius:25px!important;
  background:rgba(255,255,255,.92)!important;
  border:1px solid rgba(224,228,234,.94)!important;
  box-shadow:0 12px 32px rgba(22,29,40,.12)!important;
  backdrop-filter:blur(20px) saturate(135%)!important;
  -webkit-backdrop-filter:blur(20px) saturate(135%)!important;
}
html.hc-catalog-ui .nav button{min-height:55px!important;font-size:9px!important;gap:2px!important;color:#727b87!important}
html.hc-catalog-ui .nav button i{width:33px!important;height:33px!important;border-radius:12px!important;background:#f2f4f7!important;color:#687384!important;font-size:17px!important;box-shadow:none!important}
html.hc-catalog-ui .nav button i svg{width:19px!important;height:19px!important}
html.hc-catalog-ui .nav button.on{color:#2467ca!important}
html.hc-catalog-ui .nav button.on i{background:#111820!important;color:#fff!important;box-shadow:none!important;transform:none!important}
html.hc-catalog-ui .sticky-actions{bottom:calc(86px + env(safe-area-inset-bottom))!important}

/* First-use onboarding. */
.hc-onboarding{
  position:fixed;
  inset:0;
  z-index:25000;
  display:flex;
  flex-direction:column;
  background:#f4f4f5;
  color:#101114;
  opacity:0;
  transform:translateY(6px);
  transition:opacity .2s ease,transform .24s cubic-bezier(.2,.72,.24,1);
  padding:calc(10px + env(safe-area-inset-top)) 0 calc(12px + env(safe-area-inset-bottom));
}
.hc-onboarding.hc-onboarding-on{opacity:1;transform:none}
.hc-onboarding-top{height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;flex:0 0 auto}
.hc-onboarding-brand{display:flex;align-items:center;gap:9px;font-size:12px;font-weight:900;letter-spacing:.2px}.hc-onboarding-brand i{display:grid;place-items:center;width:32px;height:32px;border-radius:11px;background:#2474f2;color:#fff;font-style:normal;font-size:12px}
.hc-onboarding-skip{appearance:none;border:0;background:transparent;color:#747b85;font-size:12px;font-weight:780;padding:8px}
.hc-onboarding-viewport{position:relative;flex:1;min-height:0;overflow:hidden}
.hc-onboarding-track{height:100%;display:flex;transition:transform .34s cubic-bezier(.2,.72,.24,1);will-change:transform;touch-action:pan-y}
.hc-onboarding-slide{flex:0 0 100%;height:100%;display:grid;grid-template-rows:minmax(245px,1fr) auto;gap:18px;padding:10px 22px 12px;box-sizing:border-box;align-items:center}
.hc-onboarding-visual{align-self:stretch;min-height:245px;border-radius:30px;background:#e6e6e8;border:1px solid #dedfe2;display:grid;place-items:center;overflow:hidden;position:relative;padding:22px;box-sizing:border-box}
.hc-onboarding-copy{text-align:center;padding:0 7px 4px}.hc-onboarding-copy h2{margin:0;color:#0d0f12;font-size:31px;line-height:1.03;letter-spacing:-1.05px;font-weight:920}.hc-onboarding-copy p{margin:12px auto 0;max-width:520px;color:#5f6268;font-size:15px;line-height:1.42}
.hc-ob-emoji{font-size:66px;line-height:1;filter:saturate(.95)}
.hc-ob-mini-card{width:min(100%,310px);border-radius:22px;background:#fff;border:1px solid #dfe2e7;box-shadow:0 14px 32px rgba(19,24,32,.10);padding:16px;display:grid;gap:10px;box-sizing:border-box}.hc-ob-mini-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.hc-ob-mini-row strong{font-size:14px}.hc-ob-mini-row span{font-size:11px;color:#737b86}.hc-ob-pill{display:inline-flex;padding:5px 8px;border-radius:999px;background:#eaf2ff;color:#2364c5;font-size:9px;font-weight:900}.hc-ob-line{height:9px;border-radius:99px;background:#eef0f3}.hc-ob-line.short{width:62%}.hc-ob-line.mid{width:80%}
.hc-ob-feature-grid{width:min(100%,330px);display:grid;grid-template-columns:1fr 1fr;gap:10px}.hc-ob-feature{min-height:104px;border-radius:22px;background:#fff;border:1px solid #dfe2e7;padding:14px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box}.hc-ob-feature i{font-style:normal;font-size:28px}.hc-ob-feature b{font-size:12px;line-height:1.15}.hc-ob-feature small{font-size:9px;color:#858c95}
.hc-ob-record{width:min(100%,320px);border-radius:24px;background:#fff;border:1px solid #dfe2e7;box-shadow:0 14px 30px rgba(22,28,38,.10);padding:15px;transform:rotate(-1.5deg)}.hc-ob-record-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.hc-ob-record-head b{font-size:13px}.hc-ob-record-head span{font-size:9px;color:#7b838d}.hc-ob-record-price{margin-top:14px;padding-top:11px;border-top:1px solid #eceef1;display:flex;justify-content:space-between;font-size:12px;font-weight:850}.hc-ob-calendar{position:absolute;left:18px;bottom:18px;width:66px;height:66px;border-radius:18px;background:#ffd54a;color:#17191d;display:grid;place-items:center;font-weight:900;box-shadow:0 8px 18px rgba(60,45,0,.12)}
.hc-onboarding-bottom{flex:0 0 auto;padding:8px 18px 0}.hc-onboarding-dots{display:flex;justify-content:center;gap:8px;margin:0 0 11px}.hc-onboarding-dot{width:8px;height:8px;border:0;border-radius:999px;background:#9b9da1;padding:0;transition:width .2s ease,background .2s ease}.hc-onboarding-dot.on{width:22px;background:#111318}.hc-onboarding-next{appearance:none;width:100%;min-height:54px;border:0;border-radius:18px;background:#2474f2;color:#fff;font-size:16px;font-weight:900;box-shadow:none}.hc-onboarding-next:active{transform:scale(.985)}

@media(max-width:390px){
  .hc-onboarding-slide{padding-left:17px;padding-right:17px;gap:13px}.hc-onboarding-copy h2{font-size:27px}.hc-onboarding-copy p{font-size:13.5px}.hc-onboarding-visual{min-height:226px;border-radius:26px}.hc-ob-feature{min-height:92px}
  html.hc-catalog-ui .order-card,html.hc-catalog-ui .rt-priority-list .card{padding-right:91px!important}
}
@media(max-height:700px){.hc-onboarding-slide{grid-template-rows:minmax(205px,.9fr) auto}.hc-onboarding-visual{min-height:205px}.hc-onboarding-copy h2{font-size:25px}.hc-onboarding-copy p{font-size:13px;margin-top:8px}}
@media(prefers-reduced-motion:reduce){.hc-onboarding,.hc-onboarding-track,.hc-onboarding-dot{transition:none!important}}
</style>`;

const CATALOG_JS=String.raw`
<script id="hcCatalogDesignScript">
(function(){
  document.documentElement.classList.add('hc-catalog-ui');
  var tg=window.Telegram&&window.Telegram.WebApp;
  function authHeaders(){return {'X-App-Launch-Token':new URLSearchParams(location.search).get('launch')||'','X-Telegram-Init-Data':tg&&tg.initData||''}}
  function haptic(type){try{tg&&tg.HapticFeedback&&tg.HapticFeedback.impactOccurred(type||'light')}catch(e){}}
  function escapeHtml(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  function decorate(){
    var main=document.getElementById('main');if(main)main.classList.add('hc-catalog-screen');
    var cards=document.querySelectorAll('.order-card,.rt-priority-list .card');
    cards.forEach(function(card){
      if(card.dataset.hcCatalogDecorated==='1')return;
      var candidates=card.querySelectorAll('button,.btn');
      for(var i=0;i<candidates.length;i++){
        var text=String(candidates[i].textContent||'').trim();
        if(/^Открыть(?: заказ)?$/i.test(text)){candidates[i].classList.add('hc-inline-open');break}
      }
      card.dataset.hcCatalogDecorated='1';
    });
  }
  var decorQueued=false;
  function queueDecor(){if(decorQueued)return;decorQueued=true;requestAnimationFrame(function(){decorQueued=false;decorate()})}
  document.addEventListener('hc:after-render',queueDecor,false);
  document.addEventListener('click',queueDecor,false);
  window.addEventListener('pageshow',queueDecor);
  queueDecor();

  var OWNER_SLIDES=[
    {emoji:'👋',title:'HOUSE CLEANING STAFF',text:'Рабочий кабинет руководителя: заказы, команда, клиенты и контроль уборок в одном месте.',visual:'welcome'},
    {emoji:'📋',title:'Все заказы под контролем',text:'Новые заявки, адрес, время, статус и команда читаются за несколько секунд.',visual:'order'},
    {emoji:'👥',title:'Команда и фотоотчёты',text:'Назначайте сотрудников, контролируйте ход уборки и смотрите фото ДО / ПОСЛЕ.',visual:'team'},
    {emoji:'📊',title:'Клиенты и абонементы',text:'История уборок, остатки абонементов и рабочие данные клиента всегда под рукой.',visual:'record'}
  ];
  var EMPLOYEE_SLIDES=[
    {emoji:'👋',title:'Добро пожаловать в STAFF',text:'Здесь ваши уборки, команда, стандарты и фотоотчёты — без лишних чатов.',visual:'welcome'},
    {emoji:'🧹',title:'Задание понятно сразу',text:'Дата, время, адрес, вид уборки и важные комментарии собраны в одной карточке.',visual:'order'},
    {emoji:'📸',title:'Фото ДО и ПОСЛЕ',text:'Приложение ведёт по шагам: приехали, сделали фото, прошли чек-лист и завершили работу.',visual:'team'},
    {emoji:'✅',title:'Стандарты всегда рядом',text:'Регламент, подсказки и требования HOUSE CLEANING доступны прямо во время работы.',visual:'record'}
  ];

  function visual(slide,role){
    if(slide.visual==='welcome')return '<div class="hc-ob-emoji">'+escapeHtml(slide.emoji)+'</div>';
    if(slide.visual==='order')return '<div class="hc-ob-mini-card"><div class="hc-ob-mini-row"><strong>Заказ #024</strong><span class="hc-ob-pill">'+(role==='owner'?'Подтверждена':'Сегодня')+'</span></div><div class="hc-ob-mini-row"><strong>10:00 · Дыбенко 5</strong><span>50 м²</span></div><div class="hc-ob-line mid"></div><div class="hc-ob-line short"></div><div class="hc-ob-mini-row"><span>'+ (role==='owner'?'Команда назначена':'Поддерживающая уборка') +'</span><b style="font-size:11px;color:#2364c5">Открыть →</b></div></div>';
    if(slide.visual==='team')return '<div class="hc-ob-feature-grid"><div class="hc-ob-feature"><i>👤</i><div><b>'+ (role==='owner'?'Сотрудники':'Моя команда') +'</b><small>'+ (role==='owner'?'3 в работе':'кто работает со мной') +'</small></div></div><div class="hc-ob-feature"><i>📷</i><div><b>Фотоотчёт</b><small>ДО · ПОСЛЕ</small></div></div><div class="hc-ob-feature"><i>✅</i><div><b>Чек-лист</b><small>по шагам</small></div></div><div class="hc-ob-feature"><i>⚡️</i><div><b>Быстрые действия</b><small>без лишних экранов</small></div></div></div>';
    return '<div class="hc-ob-record"><div class="hc-ob-record-head"><div><b>'+ (role==='owner'?'Карточка клиента':'Карточка задания') +'</b><br><span>'+ (role==='owner'?'Анна · +7 999 •••-••-67':'Поддерживающая уборка') +'</span></div><span>'+ (role==='owner'?'Абонемент':'Стандарт') +'</span></div><div class="hc-ob-line" style="margin-top:14px"></div><div class="hc-ob-line mid" style="margin-top:8px"></div><div class="hc-ob-record-price"><span>'+ (role==='owner'?'Осталось 3 уборки':'Готово к работе') +'</span><span>→</span></div></div><div class="hc-ob-calendar">'+(role==='owner'?'3/5':'✓')+'</div>';
  }

  function showOnboarding(role,userId){
    var slides=role==='owner'?OWNER_SLIDES:EMPLOYEE_SLIDES;
    var key='hc:onboarding:catalog:v1:'+role+':'+String(userId||'device');
    try{if(localStorage.getItem(key)==='done')return}catch(e){}
    if(document.getElementById('hcOnboarding'))return;
    var root=document.createElement('div');root.id='hcOnboarding';root.className='hc-onboarding';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
    root.innerHTML='<div class="hc-onboarding-top"><div class="hc-onboarding-brand"><i>HC</i><span>HOUSE CLEANING STAFF</span></div><button class="hc-onboarding-skip" type="button">Пропустить</button></div><div class="hc-onboarding-viewport"><div class="hc-onboarding-track">'+slides.map(function(s){return '<section class="hc-onboarding-slide"><div class="hc-onboarding-visual">'+visual(s,role)+'</div><div class="hc-onboarding-copy"><h2>'+escapeHtml(s.title)+'</h2><p>'+escapeHtml(s.text)+'</p></div></section>'}).join('')+'</div></div><div class="hc-onboarding-bottom"><div class="hc-onboarding-dots">'+slides.map(function(_,i){return '<button class="hc-onboarding-dot'+(i===0?' on':'')+'" type="button" data-i="'+i+'" aria-label="Слайд '+(i+1)+'"></button>'}).join('')+'</div><button class="hc-onboarding-next" type="button">Далее</button></div>';
    document.body.appendChild(root);
    var track=root.querySelector('.hc-onboarding-track'),next=root.querySelector('.hc-onboarding-next'),skip=root.querySelector('.hc-onboarding-skip'),dots=[].slice.call(root.querySelectorAll('.hc-onboarding-dot'));var index=0,startX=0;
    function paint(){track.style.transform='translate3d('+(-index*100)+'%,0,0)';dots.forEach(function(d,i){d.classList.toggle('on',i===index)});next.textContent=index===slides.length-1?'Начать работу':'Далее'}
    function finish(){try{localStorage.setItem(key,'done')}catch(e){}haptic('light');root.classList.remove('hc-onboarding-on');setTimeout(function(){root.remove()},210)}
    function move(to){index=Math.max(0,Math.min(slides.length-1,to));paint();haptic('light')}
    next.addEventListener('click',function(){if(index===slides.length-1)finish();else move(index+1)});
    skip.addEventListener('click',finish);
    dots.forEach(function(d){d.addEventListener('click',function(){move(Number(d.dataset.i)||0)})});
    track.addEventListener('pointerdown',function(e){startX=e.clientX||0},{passive:true});
    track.addEventListener('pointerup',function(e){var dx=(e.clientX||0)-startX;if(Math.abs(dx)>44)move(index+(dx<0?1:-1))},{passive:true});
    requestAnimationFrame(function(){root.classList.add('hc-onboarding-on');paint()});
  }

  async function bootOnboarding(){
    try{
      var r=await fetch('/api/state',{headers:authHeaders(),cache:'no-store'});if(!r.ok)return;
      var s=await r.json();if(!s||s.ok===false)return;
      var role=s.owner?'owner':'employee';
      var id=(s.employee&&s.employee.id)||(s.user&&s.user.id)||s.admin_id||s.telegram_user_id||'';
      showOnboarding(role,id);
    }catch(e){}
  }
  requestAnimationFrame(bootOnboarding);
})();
</script>`;

export function applyStaffCatalogDesign(app:string):string{
  let out=app;
  if(!out.includes('id="hcCatalogDesign"'))out=out.replace('</head>',CATALOG_CSS+'</head>');
  if(!out.includes('id="hcCatalogDesignScript"'))out=out.replace('</body>',CATALOG_JS+'</body>');
  return out;
}
