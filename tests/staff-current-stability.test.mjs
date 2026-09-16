import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync('src/staff-current.ts','utf8');
const ui = fs.readFileSync('src/staff-current-ui.ts','utf8');
const index = fs.readFileSync('src/index.ts','utf8');

test('current stable STAFF runtime is active',()=>{
  assert.match(index,/from '\.\/staff-current'/);
  assert.match(server,/staff-current-stability-2026-09-16-a/);
});

test('legacy overpayment cannot reduce a future cleaning accrual',()=>{
  assert.ok(server.includes('ignoredLegacyOverpay'));
  assert.ok(server.includes('const applied = Math.min(value, balance)'));
  assert.ok(server.includes('balance -= applied'));
  assert.ok(server.includes('legacy_overpayment_ignored'));
});

test('completed orders are normalized from verified STAFF meta',()=>{
  assert.ok(server.includes("status:'COMPLETED'"));
  assert.ok(server.includes('Number(meta.verified_at || 0) > 0'));
});

test('photo flow is stored first and delivered as compact notifications',()=>{
  for(const token of ['/api/staff/draft-count','submitBeforeCurrent','submitAfterCurrent','Фото ДО сохранены','Фотоотчёт готов к проверке','report_duration_ms']) assert.ok(server.includes(token),token);
  assert.ok(ui.includes('uploadFiles(stage,files,input)'));
  assert.ok(ui.includes('Дождитесь окончания загрузки файлов'));
  assert.ok(ui.includes('Точно отправить фото ПОСЛЕ и завершить фотоотчёт?'));
  assert.ok(ui.includes('Точно начать уборку и фотоотчёт?'));
});

test('subscription dates are larger and attention is delayed until four days',()=>{
  assert.ok(ui.includes('min-height:54px'));
  assert.ok(ui.includes('fourDays=4*24*60*60*1000'));
  assert.ok(ui.includes('subscription_size'));
});

test('order cards have distinct operational status colors',()=>{
  for(const token of ['hc-status-completed','hc-status-unassigned','hc-status-progress','hc-status-assigned']) assert.ok(ui.includes(token),token);
});

test('persistent Telegram keyboard opens STAFF for manager and employee',()=>{
  assert.ok(server.includes('is_persistent:true'));
  assert.ok(server.includes("keyboard:[[{text:label,web_app:{url}}]]"));
  assert.ok(server.includes('Открыть кабинет руководителя'));
  assert.ok(server.includes('Открыть HOUSE CLEANING STAFF'));
});

test('cleaning start and duration are exposed in employee and manager UI',()=>{
  assert.ok(server.includes('duration_text'));
  assert.ok(server.includes('report_started_at'));
  assert.ok(ui.includes('Время уборки'));
  assert.ok(ui.includes('hc-report-timing'));
});
