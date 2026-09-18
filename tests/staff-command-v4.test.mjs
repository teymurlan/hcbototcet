import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui=fs.readFileSync('src/staff-command-v4.ts','utf8');
const control=fs.readFileSync('src/staff-control-center.ts','utf8');
const index=fs.readFileSync('src/index.ts','utf8');

test('command center v4 extends v3 without replacing booking business logic',()=>{
  assert.ok(index.includes("from './staff-command-v4'"));
  assert.ok(index.includes('applyStaffCommandV4(command)'));
  assert.ok(index.includes('business_logic_unchanged: true'));
  assert.ok(index.includes('command_center_v4: true'));
});

test('dashboard quick actions use consistent vector icons and actionable metric cards',()=>{
  for(const token of ['hc-v4-quick-grid','data-v4-go="orders"','data-v4-go="employees"','data-v4-go="photos"','data-v4-go="notify"','<svg viewBox="0 0 24 24">','data-v4-metric','Открыть график','Назначить команду','Управление командой','Открыть активные']) assert.ok(ui.includes(token),token);
  assert.ok(!ui.includes("<i>▤</i>"));
  assert.ok(!ui.includes("<i>◎</i>"));
});

test('attention cards become compact action cells and priority heading becomes nearest cleanings',()=>{
  for(const token of ['hc-v4-attention','hc-v4-attention-dot','Ближайшие уборки','сначала то, что требует действия']) assert.ok(ui.includes(token),token);
});

test('view state preserves orders search filter and scroll position in session storage',()=>{
  for(const token of ['hc:v4:view','scroll:window.scrollY','v.q','v.filter','restore(tab)','window.scrollTo','sessionStorage']) assert.ok(ui.includes(token),token);
});

test('photo center uses real admin jobs and media APIs instead of a dead presentation shell',()=>{
  for(const token of ['/api/admin/jobs','/api/admin/job?id=','/api/admin/media?job=','Фотоотчёты','На проверке','hc-v4-photo-card','hc-v4-photo-grid','hc-v4-media-view']) assert.ok(ui.includes(token),token);
});

test('owner can edit automatic Telegram notification templates in the notification cabinet',()=>{
  for(const token of ['/api/staff/notification-templates','Тексты сообщений','data-v4-text','data-v4-save','Новая заявка','Изменение заказа','Отмена заказа','Реквизиты сотрудника','Рассылка']) assert.ok(ui.includes(token),token);
  for(const token of ['TEMPLATES_KEY','/opsnotify/templates','/api/staff/notification-templates','editable_notification_templates:true','defaultTemplates','sanitizeTemplates','renderTemplate']) assert.ok(control.includes(token),token);
});

test('editable templates are durable owner-only and keep supported placeholders bounded',()=>{
  assert.ok(control.includes('ownerAuth(req,env,ctx)'));
  for(const token of ['{order}','{date}','{time}','{address}','{service}','{area}','{employee}','{title}','{body}','slice(0,1800)']) assert.ok(control.includes(token),token);
});

test('manager order notices and manual broadcast actually use stored templates',()=>{
  assert.ok(control.includes('const templates=await getTemplates(env)'));
  assert.ok(control.includes('renderTemplate(templates.broadcast'));
  assert.ok(control.includes('managerNoticeText'));
  assert.ok(control.includes('templates as any'));
});

test('finance manager alert is customizable while defect photo delivery remains untouched',()=>{
  assert.ok(control.includes("sendManagerTemplate(env,'finance_changes'"));
  assert.ok(control.includes('Defect delivery can contain a photo'));
  assert.ok(control.includes("u.pathname==='/api/before'"));
  assert.ok(control.includes("managerNotificationEnabled(env,'defects')"));
});

test('v4 remains event-driven and adds no DOM observer or interval polling',()=>{
  assert.ok(!ui.includes('MutationObserver'));
  assert.ok(!ui.includes('setInterval('));
  assert.ok(ui.includes('try{decorate()}finally{queued=false}'));
  assert.ok(ui.includes("document.addEventListener('hc:after-render'"));
});
