import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync('src/staff-human-orders.ts','utf8');
const ui=fs.readFileSync('src/staff-human-orders-ui.ts','utf8');
const motion=fs.readFileSync('src/staff-motion-system.ts','utf8');
const index=fs.readFileSync('src/index.ts','utf8');
const injected=ui.slice(ui.indexOf('const ORDER_UI_SCRIPT'),ui.indexOf('const STABLE_BASE_APP'));

test('human order layer is active above Mira style without changing technical IDs',()=>{
  assert.match(index,/from '\.\/staff-human-orders'/);
  assert.match(server,/from '\.\/staff-mira-style'/);
  assert.match(ui,/from '\.\/staff-mira-style-ui'/);
  assert.ok(server.includes('human_order_numbers:true'));
  assert.ok(server.includes('logic_unchanged:true'));
});

test('display order numbers are stable and stored separately from real order_number',()=>{
  assert.ok(server.includes("opshuman:order:"));
  assert.ok(server.includes("opshuman:next"));
  assert.ok(server.includes('display_number'));
  assert.ok(server.includes('/api/staff/order-labels'));
  assert.ok(!server.includes('o.order_number='));
});

test('customer display name comes from order data instead of Telegram UI username',()=>{
  assert.ok(server.includes('humanCustomerName'));
  assert.ok(server.includes('display_customer_name'));
  assert.ok(server.includes('o?.customer_name'));
  assert.ok(ui.includes('display_customer_name'));
});

test('cards show compact human order labels, client and address styling',()=>{
  for(const token of ['Заказ #','hc-short-order','hc-card-client','hc-worker-client','.order-address','hc-human-address']) assert.ok(ui.includes(token),token);
  assert.ok(ui.includes("card.closest('.rt-priority-list')"));
});

test('attention text uses a framed nested issue with clear employee assignment wording',()=>{
  assert.ok(ui.includes('Нет назначенных сотрудников'));
  assert.ok(ui.includes('hc-attention-card'));
  assert.ok(ui.includes('hc-attention-reason'));
  assert.ok(ui.includes('hc-attention-address'));
});

test('new application and all operational states are small distinct badges',()=>{
  for(const token of ['hc-event-badge','Новая заявка','Ждёт проверки','hc-status-new','hc-status-review','hc-status-work','hc-status-done','hc-status-cancelled']) assert.ok(ui.includes(token),token);
});

test('active presentation layer is event-driven without observer or interval animation loops',()=>{
  assert.ok(ui.includes('function stabilizeRenderedApp'));
  assert.ok(ui.includes("document.addEventListener('hc:after-render',hcQueuePatch)"));
  assert.ok(ui.includes("out=out.replace(/setInterval\\(patch,1000\\);/g,'')"));
  assert.ok(!injected.includes('MutationObserver'));
  assert.ok(!injected.includes('setInterval('));
  assert.ok(!injected.includes("window.addEventListener('scroll'"));
  assert.ok(injected.includes('requestAnimationFrame'));
});

test('orders refresh once on entry and stay stable until explicit refresh or re-entry',()=>{
  assert.ok(ui.includes("if(p==='orders'){try{await reloadAdmin()}"));
  assert.ok(ui.includes("S.page!=='orders'"));
  assert.ok(ui.includes('hc-orders-refresh'));
  assert.ok(ui.includes("#nav button[data-n=\"orders\"]"));
  assert.ok(server.includes('stable_orders_screen:true'));
});

test('standards have swipe carousel, progress, detail sheet, haptic and reduced motion',()=>{
  for(const token of [
    'hc-standards-track','scroll-snap-type:x mandatory','hcStdPrev','hcStdNext','hcStdCount',
    'scrollIntoView','hc-standard-sheet','HapticFeedback','prefers-reduced-motion','hc-standard-active',
    'ПОРЯДОК РАБОТЫ','КАЧЕСТВО','ОСТОРОЖНО · ХИМИЯ','ВАЖНО · БЕЗОПАСНОСТЬ','КЛИЕНТ И СЕРВИС',
  ]) assert.ok(ui.includes(token),token);
  assert.ok(server.includes('standards_motion:true'));
  assert.ok(server.includes('event_driven_ui:true'));
  assert.ok(server.includes('no_dom_polling:true'));
});

test('app-wide motion enhancer is active without changing the server layer chain',()=>{
  assert.match(server,/from '\.\/staff-motion-system'/);
  assert.ok(server.includes('applyStaffMotionSystem(STAFF_HUMAN_ORDER_APP)'));
  for(const token of ['app_motion_system:true','moving_nav_indicator:true','native_toasts:true','screen_motion:true','sheet_motion:true','media_fade:true','reduced_motion:true']) assert.ok(server.includes(token),token);
});

test('app motion is event-driven and does not add observer or interval polling',()=>{
  assert.ok(!motion.includes('MutationObserver'));
  assert.ok(!motion.includes('setInterval('));
  assert.ok(motion.includes('requestAnimationFrame'));
  assert.ok(motion.includes("document.addEventListener('hc:after-render'"));
  assert.ok(motion.includes("window.addEventListener('resize'"));
  assert.ok(motion.includes("document.addEventListener('pointerup'"));
});

test('bottom navigation has one moving capsule based on actual button geometry',()=>{
  for(const token of ['hc-nav-indicator','on.offsetWidth','on.offsetLeft','translate3d(','cubic-bezier(.2,.78,.22,1)']) assert.ok(motion.includes(token),token);
});

test('native-looking toast routes existing helpers without polling and keeps haptics safe',()=>{
  for(const token of ['window.__hcToast','hc-toast-host','aria-live','notificationOccurred','impactOccurred','window.setTimeout']) assert.ok(motion.includes(token),token);
  assert.ok(motion.includes("k==='info'?'light':k"));
  assert.ok(motion.includes('tg.showAlert'));
});

test('motion covers filters, status changes, back direction, media and accordions with reduced motion fallback',()=>{
  for(const token of ['hcFilterIn','hcStateIn','hcWarningIn','hcSuccessIn','hcScreenBack','hcAccordionIn','hc-direction-back','details[open]','hc-viewer-media','prefers-reduced-motion:reduce']) assert.ok(motion.includes(token),token);
});

test('screen rendering dispatches one event-driven motion pass and cards use short stagger only',()=>{
  for(const token of ["function M(html)",'hc-motion-ready',"new CustomEvent('hc:after-render'",'hcScreenIn','hcCardIn','animation-delay:18ms','animation-delay:72ms']) assert.ok(motion.includes(token),token);
  assert.ok(!motion.includes('animation-delay:1s'));
});

test('manual sheet closes with reverse transition without changing synchronous form logic',()=>{
  for(const token of ['window.__hcCloseMotion','hc-motion-closing','hcModalIn','hcModalOut','hcSheetIn','hcSheetOut',"document.getElementById('rtClose').onclick"]) assert.ok(motion.includes(token),token);
});

test('gallery media fades after actual load and reduced motion always keeps media visible',()=>{
  for(const token of ['hc-media-loaded',"document.addEventListener('load'", "document.addEventListener('loadeddata'",'opacity:.01','opacity:1!important']) assert.ok(motion.includes(token),token);
});

test('staff identity header is sticky in normal layout and never reserves a fixed overlay gap',()=>{
  for(const token of ['.app{padding-top:0!important}', '.top{position:sticky!important','top:0!important','left:auto!important','width:auto!important','transform:none!important','.back{position:relative!important','top:auto!important']) assert.ok(motion.includes(token),token);
  assert.ok(!motion.includes('.top{position:fixed!important'));
  assert.ok(!motion.includes('--hc-staff-header-h'));
  assert.ok(server.includes('sticky_staff_header:true'));
});

test('orders use denser cells while keeping number, client, status, address, meta, team and open action visible',()=>{
  for(const token of ['.order-card{padding:9px 10px!important','.order-card .hc-short-order','.order-card .hc-card-client','.order-card .chip.hc-status-chip','.order-card .sub','.order-card .order-address','.order-card .compact-meta','.order-card .team-state','.order-card .btn.block']) assert.ok(motion.includes(token),token);
  assert.ok(server.includes('dense_order_cards:true'));
  assert.ok(server.includes('dense_operational_cells:true'));
});

test('operational cards, filters and forms use compact cell density without shrinking critical content away',()=>{
  for(const token of ['.main{padding:14px 12px 22px!important','.card{padding:11px 12px!important','.metric{padding:13px!important','.notice-card{padding:10px 11px!important','.task-card{padding:10px 11px!important','.check,.payline{padding:8px 0!important','.search,.input,select,textarea,.money{min-height:44px!important','.filter{min-height:38px!important']) assert.ok(motion.includes(token),token);
});

test('standards use pastel category backgrounds and continuous event-driven swipe depth',()=>{
  for(const token of ['std-blue','std-green','std-orange','std-red','std-purple','#edf5ff','#eaf8f1','#fff1d9','#ffedef','#f0ecff','paintStandardDepth','--hc-std-scale','--hc-std-opacity','--hc-std-lift',"list.addEventListener('scroll'",'requestAnimationFrame']) assert.ok(motion.includes(token),token);
  assert.ok(!motion.includes('setInterval('));
  assert.ok(server.includes('pastel_standard_cards:true'));
  assert.ok(server.includes('continuous_standard_depth:true'));
});

test('standards carousel remains compact on iPhone and keeps native scroll snap behavior',()=>{
  for(const token of ['flex:0 0 clamp(270px,80vw,334px)!important','min-width:clamp(270px,80vw,334px)!important','min-height:206px!important','-webkit-line-clamp:5','scroll-behavior:smooth!important']) assert.ok(motion.includes(token),token);
  assert.ok(server.includes('standards_carousel_fixed:true'));
});

test('premium button system keeps compact touch targets and glass secondary actions',()=>{
  for(const token of ['.btn{min-height:42px!important','.btn.small{min-height:38px!important','.btn.secondary,.btn.soft','backdrop-filter:blur(10px)!important','.hc-orders-refresh{min-height:34px!important']) assert.ok(motion.includes(token),token);
  assert.ok(server.includes('premium_button_system:true'));
});

test('bottom navigation is smaller translucent glass with a compact moving active capsule',()=>{
  for(const token of ['.navin{min-height:70px!important','background:rgba(255,255,255,.84)!important','backdrop-filter:blur(18px)','height:38px','on.offsetWidth-8','on.offsetLeft+4','.nav button i{width:34px!important']) assert.ok(motion.includes(token),token);
  assert.ok(server.includes('compact_glass_nav:true'));
});