import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync('src/staff-defects-performance.ts','utf8');
const ui=fs.readFileSync('src/staff-defects-performance-ui.ts','utf8');
const style=fs.readFileSync('src/staff-mira-style.ts','utf8');
const human=fs.readFileSync('src/staff-human-orders.ts','utf8');
const index=fs.readFileSync('src/index.ts','utf8');

test('defect/performance layer remains active under human and visual wrappers',()=>{
  assert.match(index,/from '\.\/staff-human-orders'/);
  assert.match(human,/from '\.\/staff-mira-style'/);
  assert.match(style,/from '\.\/staff-defects-performance'/);
  assert.match(server,/from '\.\/staff-admin-access'/);
  assert.match(ui,/from '\.\/staff-admin-access-ui'/);
  assert.ok(server.includes('staff-defects-performance-2026-09-16-b'));
});

test('remaining one-second DOM pollers are stripped from assembled STAFF HTML',()=>{
  assert.ok(ui.includes('CURRENT_POLL'));
  assert.ok(ui.includes('RUNTIME_POLL'));
  assert.ok(ui.includes(".split(CURRENT_POLL).join(CURRENT_EVENTS)"));
  assert.ok(ui.includes(".split(RUNTIME_POLL).join(RUNTIME_EVENTS)"));
  assert.ok(ui.includes('requestAnimationFrame(function(){patch()})'));
  assert.ok(ui.includes("document.addEventListener('click'"));
});

test('manager gallery renders immediately and uses a bounded three-worker cached loader',()=>{
  assert.ok(ui.includes('window.__hcStaffMediaCache'));
  assert.ok(ui.includes('while(c.size>60)'));
  assert.ok(ui.includes('Promise.all([worker(),worker(),worker()])'));
  assert.ok(ui.includes('Превью загружаются в фоне'));
  assert.ok(ui.includes('loading=\"lazy\"'));
});

test('BEFORE stage supports separately marked defect photos',()=>{
  for(const token of ['X-HC-Defect','is_defect','defect_note','Зафиксировать дефект','Добавить фото дефекта']) assert.ok(ui.includes(token)||server.includes(token),token);
  assert.ok(server.includes("Дефекты можно отмечать только в Фото ДО"));
  assert.ok(server.includes("Для дефекта прикрепите фотографию"));
});

test('manager report separates defects from ordinary before photos',()=>{
  assert.ok(ui.includes('Дефекты до уборки'));
  assert.ok(ui.includes('Обычные фото ДО'));
  assert.ok(ui.includes("before.filter(function(f){return!!f.is_defect})"));
  assert.ok(server.includes('data.media.before=data.media.before.map'));
});

test('only defect media is routed to customer through internal fetch with actual photo bytes',()=>{
  assert.ok(server.includes("stub.fetch('https://booking.internal/staff/notify-defect'"));
  assert.ok(server.includes("form.append('photo',new Blob([media.bytes]"));
  assert.ok(server.includes('telegramFileBytes'));
  assert.ok(server.includes('client_notified_at'));
  assert.ok(!server.includes('ordinary:true'));
});

test('failed client delivery is retried by the minute cron including old skipped defects',()=>{
  assert.ok(server.includes('/opsdefects/list-all'));
  assert.ok(server.includes('retryPendingDefects'));
  assert.ok(server.includes('DEFECT_RETRY_DELAY_MS'));
  assert.ok(server.includes('DEFECT_RETRY_LIMIT'));
  assert.ok(server.includes('client_attempted_at'));
  assert.ok(server.includes('client_attempts'));
  assert.ok(server.includes('client_error'));
  assert.ok(server.includes('!d.client_notified_at'));
  assert.ok(!server.includes('!d.client_notified_at&&!d.client_skipped_at'));
});

test('defect notifications remain idempotent for manager and customer',()=>{
  assert.ok(server.includes('manager_notified_at'));
  assert.ok(server.includes('client_notified_at'));
  assert.ok(server.includes("'/opsdefects/mark'"));
});
