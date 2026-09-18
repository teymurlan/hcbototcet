import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui=fs.readFileSync('src/staff-command-v5.ts','utf8');
const control=fs.readFileSync('src/staff-control-center.ts','utf8');
const finalUi=fs.readFileSync('src/staff-final-ui.ts','utf8');
const defects=fs.readFileSync('src/staff-defects-performance.ts','utf8');
const index=fs.readFileSync('src/index.ts','utf8');

test('command center v5 is layered after v4',()=>{
  assert.ok(index.includes("from './staff-command-v5'"));
  assert.ok(index.includes('applyStaffCommandV5(commandV4)'));
  assert.ok(index.includes('dashboard_style_picker_v5: true'));
  assert.ok(index.includes('notification_center_v5: true'));
  assert.ok(index.includes('stable_orders_live_refresh_v5: true'));
});

test('owner can choose between three dashboard card arrangements',()=>{
  for(const token of ['balanced','compact','focus','Главная','Карточки','Компактно','Фокус','data-v5-dash-style','/api/staff/dashboard-preferences']) assert.ok(ui.includes(token),token);
  for(const token of ['DASHBOARD_KEY','/opsui/dashboard','DashboardPreferences','dashboard_style_picker:true','sanitizeDashboard']) assert.ok(control.includes(token),token);
});

test('notification center v5 separates feed channels texts and broadcast',()=>{
  for(const token of ['data-v5-ntab="feed"','data-v5-ntab="channels"','data-v5-ntab="texts"','data-v5-ntab="broadcast"','Поиск по уведомлениям','Заказы','Важное','Система']) assert.ok(ui.includes(token),token);
  for(const token of ['Выключить все','Включить все','Каналы уведомлений','событий в ленте','важных событий','каналов включено']) assert.ok(ui.includes(token),token);
});

test('notification text editor has variables live preview reset save and Telegram test',()=>{
  for(const token of ['data-v5-var','data-v5-preview','data-v5-reset','data-v5-save','data-v5-test','Тест отправлен вам в Telegram','/api/staff/notification-template-test','Дефект до уборки']) assert.ok(ui.includes(token),token);
  for(const token of ['notification_template_test:true','sendTemplateTest','Неизвестный шаблон','defaults:defaultTemplates()','defects:[\'order\',\'address\',\'comment\']']) assert.ok(control.includes(token),token);
  for(const token of ['/opsnotify/templates','templates?.templates?.defects','renderDefectTemplate','sendPhoto']) assert.ok(defects.includes(token),token);
});

test('broadcast remains available with recipient selection and history',()=>{
  for(const token of ['hcV5Audience','hcV5BroadcastTitle','hcV5BroadcastBody','data-v5-employee','/api/staff/notification-broadcast','/api/staff/notification-broadcasts','История']) assert.ok(ui.includes(token),token);
});

test('orders keep query and filter in the core render instead of visibly resetting',()=>{
  assert.ok(finalUi.includes("hcOrderQuery=''"));
  assert.ok(finalUi.includes("allowed=['active','today','unassigned','assigned','work','done','cancelled','all']"));
  assert.ok(finalUi.includes("value=\"'+H(hcOrderQuery)+'\""));
  assert.ok(finalUi.includes("if(allowed.indexOf(S.filter)<0)S.filter='active'"));
  assert.ok(finalUi.includes('hcOrderQuery=inp.value||'));
});

test('background refresh never rebuilds the open orders screen',()=>{
  assert.ok(finalUi.includes("document.dispatchEvent(new CustomEvent('hc:orders-data-ready'))"));
  assert.ok(!finalUi.includes("else if(!document.querySelector('.back')&&S.page==='orders')orders()"));
  assert.ok(ui.includes("document.addEventListener('hc:orders-data-ready'"));
  assert.ok(ui.includes('Обновить •'));
});

test('v5 remains event driven and adds no polling or DOM observer',()=>{
  assert.ok(!ui.includes('setInterval('));
  assert.ok(!ui.includes('MutationObserver'));
  assert.ok(ui.includes('Promise.resolve().then(queue)')||ui.includes('try{var main=document.getElementById'));
  assert.ok(ui.includes("document.addEventListener('hc:after-render'"));
  assert.ok(ui.includes("document.addEventListener('hc:notifications-ready'"));
});
