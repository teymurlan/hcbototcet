import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui=fs.readFileSync('src/staff-command-v3.ts','utf8');
const control=fs.readFileSync('src/staff-control-center.ts','utf8');
const index=fs.readFileSync('src/index.ts','utf8');

test('command v3 extends the established client domain without replacing business logic',()=>{
  assert.ok(index.includes("from './staff-control-center'"));
  assert.ok(index.includes("from './staff-clients'"));
  assert.ok(index.includes("from './staff-human-orders'"));
  assert.ok(index.includes('applyStaffCommandV3(cabinets)'));
  assert.ok(index.includes('business_logic_unchanged: true'));
});

test('overview removes the decorative hero and replaces it with useful quick actions',()=>{
  for(const token of [
    '#main[data-hc-catalog-page="overview"]>.hero{display:none!important}',
    'hc-v3-command','Быстрые действия','Заявки','Команда','Фото','Оповещения',
  ]) assert.ok(ui.includes(token),token);
});

test('orders are one coherent clickable card and keep the existing order action underneath',()=>{
  for(const token of ['hc-v3-openable','dataset.hcV3Order','card.querySelector(\'.hc-inline-open,.btn[data-order],[data-order]\')','b.click()','role','button']) assert.ok(ui.includes(token),token);
  assert.ok(ui.includes('display:none!important'));
  assert.ok(ui.includes("content:'›'"));
});

test('orders screen uses compact summary, horizontal status filters and guards duplicate entry taps',()=>{
  for(const token of ['hc-v3-order-summary','активных','без команды','завершено','отменено','overflow-x:auto!important','lastOrdersTap','now-lastOrdersTap<700','stopImmediatePropagation']) assert.ok(ui.includes(token),token);
});

test('back navigation remembers the real source screen instead of a hardcoded destination',()=>{
  for(const token of ['returnStack=[]','pushOrigin','popOrigin','returnStack','.back,.hc-client-back,.hc-v4-back','navTo(dest)',"if(key==='notifications')"]) assert.ok(ui.includes(token),token);
  assert.ok(!ui.includes("sessionStorage.getItem('hc:v3:return-stack')"));
});

test('bottom navigation is smaller iOS-like glass',()=>{
  for(const token of ['min-height:61px!important','blur(28px) saturate(180%)','rgba(246,247,249,.72)','width:29px!important','inset 0 1px 0']) assert.ok(ui.includes(token),token);
});

test('owner notification center includes feed settings manual broadcast and history',()=>{
  for(const token of ['Лента','Настройки','Рассылка','/api/staff/notifications','/api/staff/notification-settings','/api/staff/notification-broadcast','/api/staff/notification-broadcasts','Отправить через бота','Последние рассылки']) assert.ok(ui.includes(token),token);
});

test('notification settings and broadcast APIs are owner-only and durable',()=>{
  for(const token of ['/opsnotify/settings','/opsnotify/broadcast-history','/opsnotify/broadcast-log','/api/staff/notification-settings','/api/staff/notification-broadcast','Настройки уведомлений доступны только руководителю','ownerAuth']) assert.ok(control.includes(token),token);
});

test('manual broadcasts are bounded to active known team members and sent by Telegram bot',()=>{
  for(const token of ['activeEmployees','allowed.has(id)','slice(0,200)','TELEGRAM_BOT_TOKEN','sendMessage','Открыть STAFF','HOUSE CLEANING STAFF']) assert.ok(control.includes(token),token);
});

test('automatic manager notifications obey owner settings while internal audit notices remain intact',()=>{
  for(const token of ['automatic_manager_notification_settings:true','managerNotificationEnabled','deliverEnabledScheduledNotices','noticeSettingKey','new_order','order_changed','order_cancelled','finance_changes','defects','/opsfinal/notices']) assert.ok(control.includes(token),token);
  assert.ok(control.includes("u.pathname==='/api/before'"));
  assert.ok(control.includes("u.pathname==='/api/staff/payment-details'"));
});

test('automatic order Telegram message uses the short display number and Russian date format',()=>{
  for(const token of ['/opshuman/ensure','Заказ #','padStart(2','dmy(order.date)','Новая заявка','Заказ изменён','Заказ отменён']) assert.ok(control.includes(token),token);
});

test('critical employee and customer defect delivery remains independent from manager switches',()=>{
  assert.ok(ui.includes('Критические сообщения сотрудникам'));
  assert.ok(control.includes("u.pathname==='/api/before'"));
  assert.ok(control.includes("!await managerNotificationEnabled(env,'defects')"));
  assert.ok(control.includes('suppressManagerRecipients(env,true)'));
  assert.ok(control.includes('Defect delivery can contain a photo'));
});

test('new interface layer is event driven with no DOM polling',()=>{
  assert.ok(!ui.includes('MutationObserver'));
  assert.ok(!ui.includes('setInterval('));
  assert.ok(ui.includes('try{decorate()}finally{queued=false}'));
  assert.ok(ui.includes("document.addEventListener('hc:after-render'"));
});
