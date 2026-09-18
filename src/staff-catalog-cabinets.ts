export const STAFF_CATALOG_CABINETS_BUILD='staff-catalog-cabinets-2026-09-17-b';

const CABINET_CSS=String.raw`
<style id="hcCatalogCabinetsV2">
:root{
  --hc-v2-bg:#f2f2f3;
  --hc-v2-surface:#ffffff;
  --hc-v2-soft:#e9e9eb;
  --hc-v2-soft-2:#f7f7f8;
  --hc-v2-ink:#101114;
  --hc-v2-muted:#686b72;
  --hc-v2-line:#e3e4e7;
  --hc-v2-blue:#2474f2;
  --hc-v2-green:#22a06b;
  --hc-v2-yellow:#ffd54a;
  --hc-v2-red:#d84c4c;
  --hc-v2-radius:22px;
}
html.hc-catalog-ui.hc-catalog-cabinets body{
  background:var(--hc-v2-bg)!important;
  color:var(--hc-v2-ink)!important;
}
html.hc-catalog-ui.hc-catalog-cabinets .main{
  padding:14px 12px 24px!important;
  background:transparent!important;
}

/* Every cabinet now follows the same hierarchy as the first-use presentation. */
html.hc-catalog-cabinets #main[data-hc-catalog-page]>.section-title{
  margin:7px 2px 12px!important;
  min-height:42px;
  align-items:end!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page]>.section-title h2{
  font-size:27px!important;
  line-height:1.02!important;
  letter-spacing:-.9px!important;
  font-weight:920!important;
  color:var(--hc-v2-ink)!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page]>.section-title span{
  font-size:10.5px!important;
  color:#8a8d93!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page]>.hero{
  padding:19px 18px!important;
  border:0!important;
  border-radius:27px!important;
  background:var(--hc-v2-soft)!important;
  box-shadow:none!important;
  color:var(--hc-v2-ink)!important;
  overflow:hidden!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page]>.hero:after{
  width:140px!important;height:140px!important;right:-40px!important;top:-54px!important;
  background:rgba(255,255,255,.42)!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page]>.hero h1{
  font-size:25px!important;line-height:1.04!important;letter-spacing:-.85px!important;font-weight:920!important;color:#101114!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page]>.hero p{
  margin-top:8px!important;font-size:12.5px!important;line-height:1.42!important;color:#5f6268!important;max-width:82%!important;
}

/* Dashboard numbers become compact catalogue tiles, not large banners. */
html.hc-catalog-cabinets #main[data-hc-catalog-page="overview"] .grid{
  gap:8px!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page="overview"] .metric{
  min-height:72px!important;
  padding:11px 12px!important;
  border:0!important;
  border-radius:20px!important;
  background:#fff!important;
  box-shadow:none!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page="overview"] .metric strong{
  font-size:23px!important;line-height:1!important;letter-spacing:-.75px!important;color:#111216!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page="overview"] .metric span{
  margin-top:5px!important;font-size:10px!important;line-height:1.2!important;color:#858990!important;
}

/* Universal catalogue cells. */
html.hc-catalog-cabinets .hc-catalog-v2-cell,
html.hc-catalog-cabinets .order-card,
html.hc-catalog-cabinets .task-card,
html.hc-catalog-cabinets .notice-card,
html.hc-catalog-cabinets .card[data-employee],
html.hc-catalog-cabinets .hc-client-card,
html.hc-catalog-cabinets .hc-clients-entry,
html.hc-catalog-cabinets .hc-admin-access-card{
  border:0!important;
  border-radius:22px!important;
  background:#fff!important;
  box-shadow:none!important;
}
html.hc-catalog-cabinets .hc-catalog-v2-cell{
  transition:transform .16s ease,opacity .18s ease,background-color .18s ease!important;
}
html.hc-catalog-cabinets .hc-catalog-v2-cell:active{transform:scale(.985)!important}

/* Orders: one readable appointment record, action visually belongs to the same card. */
html.hc-catalog-cabinets #main[data-hc-catalog-page="orders"] .order-card,
html.hc-catalog-cabinets #main[data-hc-catalog-page="overview"] .rt-priority-list .card,
html.hc-catalog-cabinets .task-card{
  padding:12px 94px 12px 13px!important;
  min-height:94px!important;
  margin-bottom:8px!important;
}
html.hc-catalog-cabinets .order-card .hc-card-client,
html.hc-catalog-cabinets .task-card .title,
html.hc-catalog-cabinets .rt-priority-list .hc-attention-client{
  font-size:14px!important;
  font-weight:900!important;
  letter-spacing:-.2px!important;
  color:#151619!important;
}
html.hc-catalog-cabinets .order-card .hc-short-order,
html.hc-catalog-cabinets .rt-priority-list .hc-short-order{
  color:#111820!important;
  background:#f2f3f5!important;
  border:0!important;
  min-height:23px!important;
  padding:4px 7px!important;
  font-size:9.5px!important;
}
html.hc-catalog-cabinets .order-card .order-address,
html.hc-catalog-cabinets .hc-attention-address{
  color:#646971!important;
  font-size:11px!important;
  line-height:1.34!important;
  font-weight:680!important;
}
html.hc-catalog-cabinets .hc-attention-card{
  background:#f7f7f8!important;
  border:0!important;
  border-radius:14px!important;
  padding:7px 8px!important;
}
html.hc-catalog-cabinets .hc-attention-reason{
  width:auto!important;
  display:inline-flex!important;
  background:#fff0f0!important;
  border:0!important;
  border-radius:10px!important;
  padding:6px 8px!important;
  font-size:9.5px!important;
}
html.hc-catalog-cabinets .hc-inline-open{
  right:10px!important;
  min-width:70px!important;
  min-height:34px!important;
  border:0!important;
  border-radius:13px!important;
  background:#111820!important;
  color:#fff!important;
  font-size:10.5px!important;
  font-weight:900!important;
}

/* Employees become catalogue profiles. */
html.hc-catalog-cabinets #main[data-hc-catalog-page="employees"] .card[data-employee],
html.hc-catalog-cabinets .hc-catalog-person{
  position:relative!important;
  min-height:68px!important;
  padding:11px 42px 11px 11px!important;
  margin-bottom:7px!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page="employees"] .card[data-employee]:after,
html.hc-catalog-cabinets .hc-catalog-person:after{
  content:'›';position:absolute;right:15px;top:50%;transform:translateY(-52%);font-size:27px;line-height:1;color:#b1b4ba;font-weight:400;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page="employees"] .avatar,
html.hc-catalog-cabinets .hc-catalog-person .avatar{
  width:43px!important;height:43px!important;border-radius:15px!important;background:#e7e8ea!important;border:0!important;color:#20242a!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page="employees"] .title,
html.hc-catalog-cabinets .hc-catalog-person .title{font-size:14px!important;font-weight:900!important;color:#141619!important}
html.hc-catalog-cabinets #main[data-hc-catalog-page="employees"] .sub,
html.hc-catalog-cabinets .hc-catalog-person .sub{font-size:10.5px!important;color:#7b7f87!important}

/* Photo cabinet: gallery tiles use the same muted presentation surface. */
html.hc-catalog-cabinets #main[data-hc-catalog-page="photos"] .card{
  border:0!important;border-radius:22px!important;background:#fff!important;box-shadow:none!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page="photos"] .hc-media,
html.hc-catalog-cabinets .hc-catalog-media{
  overflow:hidden!important;
  border:0!important;
  border-radius:18px!important;
  background:#e9e9eb!important;
  box-shadow:none!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page="photos"] .hc-media img,
html.hc-catalog-cabinets #main[data-hc-catalog-page="photos"] .hc-media video{
  display:block!important;width:100%!important;height:auto!important;
}

/* More screen reads like a clean services catalogue. */
html.hc-catalog-cabinets #main[data-hc-catalog-page="more"]>.hc-catalog-menu-cell,
html.hc-catalog-cabinets #main[data-hc-catalog-page="more"]>.hc-clients-entry,
html.hc-catalog-cabinets #main[data-hc-catalog-page="more"]>.hc-admin-access-card{
  position:relative!important;
  width:100%!important;
  min-height:66px!important;
  margin:0 0 7px!important;
  padding:11px 44px 11px 13px!important;
  border:0!important;
  border-radius:20px!important;
  background:#fff!important;
  box-shadow:none!important;
  text-align:left!important;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page="more"]>.hc-catalog-menu-cell:after,
html.hc-catalog-cabinets #main[data-hc-catalog-page="more"]>.hc-clients-entry:after,
html.hc-catalog-cabinets #main[data-hc-catalog-page="more"]>.hc-admin-access-card:after{
  content:'›';position:absolute;right:15px;top:50%;transform:translateY(-52%);font-size:27px;color:#b3b6bc;font-weight:400;
}
html.hc-catalog-cabinets #main[data-hc-catalog-page="more"]>.hc-clients-entry>i{display:none!important}

/* Clients and subscriptions are first-class catalogue records. */
html.hc-catalog-cabinets .hc-client-page{gap:9px!important}
html.hc-catalog-cabinets .hc-client-head{margin:1px 0 3px!important;align-items:center!important}
html.hc-catalog-cabinets .hc-client-head h2{font-size:27px!important;line-height:1!important;letter-spacing:-.8px!important;color:#111216!important}
html.hc-catalog-cabinets .hc-client-actions{gap:7px!important}
html.hc-catalog-cabinets .hc-client-search{
  min-height:42px!important;border:0!important;border-radius:15px!important;background:#fff!important;box-shadow:none!important;font-size:12px!important;
}
html.hc-catalog-cabinets .hc-client-import{
  min-height:42px!important;border-radius:15px!important;background:#111820!important;color:#fff!important;box-shadow:none!important;font-size:10.5px!important;
}
html.hc-catalog-cabinets .hc-client-stats{gap:7px!important}
html.hc-catalog-cabinets .hc-client-stat{
  padding:10px!important;border:0!important;border-radius:18px!important;background:#e8e8ea!important;
}
html.hc-catalog-cabinets .hc-client-stat b{font-size:19px!important;color:#111216!important}
html.hc-catalog-cabinets .hc-client-stat span{font-size:9px!important;color:#747980!important}
html.hc-catalog-cabinets .hc-client-card{
  position:relative!important;
  padding:11px 42px 11px 12px!important;
  margin:0!important;
  min-height:76px!important;
  border:0!important;
}
html.hc-catalog-cabinets .hc-client-card:after{content:'›';position:absolute;right:15px;top:50%;transform:translateY(-52%);font-size:27px;color:#b3b6bc}
html.hc-catalog-cabinets .hc-client-card strong{font-size:14px!important;color:#141619!important}
html.hc-catalog-cabinets .hc-client-count{border:0!important;background:#f1f2f4!important;color:#777c84!important;font-size:9px!important}
html.hc-catalog-cabinets .hc-client-meta{font-size:10.5px!important;color:#737880!important;line-height:1.32!important}
html.hc-catalog-cabinets .hc-client-tag{border:0!important;font-size:8.5px!important;padding:4px 6px!important}

/* Detail sheets mimic the onboarding record card / modern appointment record. */
html.hc-catalog-cabinets .rt-sheet,
html.hc-catalog-cabinets .hc-client-panel,
html.hc-catalog-cabinets .hc-standard-panel{
  background:#f2f2f3!important;
  border:0!important;
  box-shadow:0 -22px 65px rgba(15,18,24,.14)!important;
}
html.hc-catalog-cabinets .rt-sheet{border-radius:30px 30px 0 0!important;padding-top:12px!important}
html.hc-catalog-cabinets .rt-sheet .card,
html.hc-catalog-cabinets .rt-sheet .readonly-box,
html.hc-catalog-cabinets .rt-sheet .notice,
html.hc-catalog-cabinets .rt-sheet .dangerbox,
html.hc-catalog-cabinets .hc-client-form>label,
html.hc-catalog-cabinets .hc-sub-edit{
  border:0!important;
  border-radius:18px!important;
  background:#fff!important;
  box-shadow:none!important;
}
html.hc-catalog-cabinets .rt-sheet h2,
html.hc-catalog-cabinets .rt-sheet h3,
html.hc-catalog-cabinets .hc-client-panel h3{
  font-size:25px!important;line-height:1.03!important;letter-spacing:-.8px!important;font-weight:920!important;color:#111216!important;
}
html.hc-catalog-cabinets .rt-sheet .label,
html.hc-catalog-cabinets .hc-client-form label{font-size:9.5px!important;color:#777b82!important;font-weight:760!important}
html.hc-catalog-cabinets .rt-sheet input,
html.hc-catalog-cabinets .rt-sheet select,
html.hc-catalog-cabinets .rt-sheet textarea,
html.hc-catalog-cabinets .hc-client-form input,
html.hc-catalog-cabinets .hc-client-form textarea{
  border:0!important;background:#f5f5f6!important;border-radius:13px!important;box-shadow:none!important;
}

/* Inputs and toolbars stay quiet; content cards remain the focus. */
html.hc-catalog-cabinets .toolbar{gap:7px!important}
html.hc-catalog-cabinets .search,
html.hc-catalog-cabinets .input,
html.hc-catalog-cabinets select,
html.hc-catalog-cabinets textarea,
html.hc-catalog-cabinets .money{
  background:#fff!important;border:0!important;border-radius:15px!important;box-shadow:none!important;
}
html.hc-catalog-cabinets .filter{border:0!important;background:#fff!important;color:#646971!important;border-radius:13px!important}
html.hc-catalog-cabinets .filter.on{background:#111820!important;color:#fff!important}
html.hc-catalog-cabinets .btn{border:0!important;box-shadow:none!important;border-radius:15px!important}
html.hc-catalog-cabinets .btn.secondary,
html.hc-catalog-cabinets .btn.soft{background:#e8e9eb!important;color:#23262b!important}

/* Bottom navigation remains glassy but visually belongs to the neutral onboarding UI. */
html.hc-catalog-cabinets .navin{
  background:rgba(250,250,251,.91)!important;
  border:1px solid rgba(225,226,229,.96)!important;
  box-shadow:0 12px 32px rgba(15,18,24,.11)!important;
}
html.hc-catalog-cabinets .nav button i{background:#eceef1!important;color:#69717c!important}
html.hc-catalog-cabinets .nav button.on i{background:#111820!important;color:#fff!important}
html.hc-catalog-cabinets .nav button.on{color:#111820!important}

.hc-catalog-v2-appear{animation:hcCatalogV2In .26s cubic-bezier(.2,.72,.24,1) both}
@keyframes hcCatalogV2In{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@media(max-width:390px){
  html.hc-catalog-cabinets #main[data-hc-catalog-page]>.section-title h2{font-size:25px!important}
  html.hc-catalog-cabinets #main[data-hc-catalog-page="orders"] .order-card,
  html.hc-catalog-cabinets #main[data-hc-catalog-page="overview"] .rt-priority-list .card{padding-right:86px!important}
  html.hc-catalog-cabinets .hc-inline-open{min-width:64px!important;right:8px!important}
}
html.hc-ui-motion-gentle .hc-catalog-v2-appear,html.hc-ui-motion-gentle .hc-catalog-v2-cell,html.hc-ui-motion-off .hc-catalog-v2-appear,html.hc-ui-motion-off .hc-catalog-v2-cell{animation:none!important;transition:none!important}
@media(prefers-reduced-motion:reduce){
  .hc-catalog-v2-appear,.hc-catalog-v2-cell{animation:none!important;transition:none!important}
}
</style>`;

const CABINET_JS=String.raw`
<script id="hcCatalogCabinetsScript">
(function(){
  if(window.__hcCatalogCabinetsV2)return;window.__hcCatalogCabinetsV2=true;
  document.documentElement.classList.add('hc-catalog-cabinets');

  var queued=false;
  function pageName(){
    var main=document.getElementById('main');if(!main)return'';
    if(main.querySelector('.hc-client-page'))return'clients';
    if(main.querySelector('.hc-standards-track,.std-intro,#stdlist'))return'standards';
    if(main.querySelector('#hcAdminAccessCard')&&/Администратор/i.test(main.textContent||''))return'more';
    var on=document.querySelector('#nav button.on');var t=String(on&&on.textContent||'').trim();
    if(/Обзор/i.test(t))return'overview';
    if(/Заказ/i.test(t))return'orders';
    if(/Сотруд/i.test(t))return'employees';
    if(/Фото/i.test(t))return'photos';
    if(/Ещё/i.test(t))return'more';
    return'cabinet';
  }
  function cell(el,extra){if(!el||el.dataset.hcCatalogV2==='1')return;el.dataset.hcCatalogV2='1';el.classList.add('hc-catalog-v2-cell','hc-catalog-v2-appear');if(extra)el.classList.add(extra)}
  function decorate(){
    var main=document.getElementById('main');if(!main)return;
    var p=pageName();main.dataset.hcCatalogPage=p;
    main.querySelectorAll('.order-card,.task-card,.notice-card,.rt-priority-list .card').forEach(function(el){cell(el,'hc-catalog-record')});
    main.querySelectorAll('.card[data-employee],[data-employee].card').forEach(function(el){cell(el,'hc-catalog-person')});
    main.querySelectorAll('.hc-client-card').forEach(function(el){cell(el,'hc-catalog-client')});
    main.querySelectorAll('.hc-media').forEach(function(el){cell(el,'hc-catalog-media')});
    if(p==='more'){
      Array.prototype.forEach.call(main.children,function(el){
        if(!el||el.id==='hcClientsEntry'||el.id==='hcAdminAccessCard'||el.classList.contains('section-title')||el.classList.contains('back'))return;
        if(el.tagName==='BUTTON'||el.classList.contains('card'))cell(el,'hc-catalog-menu-cell');
      });
      var ce=document.getElementById('hcClientsEntry');if(ce)cell(ce,'hc-catalog-menu-cell');
      var ae=document.getElementById('hcAdminAccessCard');if(ae)cell(ae,'hc-catalog-menu-cell');
    }
    main.querySelectorAll('.section-title,.hero,.grid').forEach(function(el){if(!el.dataset.hcCatalogV2Head){el.dataset.hcCatalogV2Head='1';el.classList.add('hc-catalog-v2-appear')}});
  }
  function queue(){if(queued)return;queued=true;try{decorate()}finally{queued=false}}
  document.addEventListener('hc:after-render',queue,false);
  document.addEventListener('click',function(e){var t=e.target;if(t&&t.closest&&t.closest('button,.card,[data-employee]'))queue()},false);
  document.addEventListener('change',queue,false);
  window.addEventListener('pageshow',queue);
  queue();
})();
</script>`;

export function applyStaffCatalogCabinets(app:string):string{
  if(!app||app.includes('hcCatalogCabinetsV2'))return app;
  return app.replace('</head>',CABINET_CSS+'</head>').replace('</body>',CABINET_JS+'</body>');
}
