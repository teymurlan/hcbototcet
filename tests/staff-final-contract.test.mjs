import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const finalUi = fs.readFileSync('src/staff-final-ui.ts', 'utf8');
const finalServer = fs.readFileSync('src/staff-final.ts', 'utf8');
const prodUi = fs.readFileSync('src/staff-production-ui.ts', 'utf8');
const prodServer = fs.readFileSync('src/staff-production.ts', 'utf8');
const runtimeUi = fs.readFileSync('src/staff-runtime-ui.ts', 'utf8');
const runtimeServer = fs.readFileSync('src/staff-runtime.ts', 'utf8');
const currentServer = fs.readFileSync('src/staff-current.ts', 'utf8');
const operationsServer = fs.readFileSync('src/staff-operations.ts', 'utf8');
const index = fs.readFileSync('src/index.ts', 'utf8');
const wrangler = fs.readFileSync('wrangler.jsonc', 'utf8');
const baseUi = fs.readFileSync('src/staff-v3-ui.ts', 'utf8');

test('stable STAFF operations entrypoint is active', () => {
  assert.match(index, /from '\.\/staff-operations'/);
  assert.match(operationsServer, /from '\.\/staff-current'/);
  assert.match(currentServer, /from '\.\/staff-runtime'/);
  assert.match(runtimeServer, /staff-runtime-operations-2026-09-16-b/);
});

test('base and final UI patch anchors still exist', () => {
  assert.ok(baseUi.includes('boot();\n})();\n</script>'));
  assert.match(finalUi, /const anchor = 'boot\(\);\\n\}\)\(\);\\n<\/script>'/);
  assert.ok(prodUi.includes("const anchor = 'boot();"));
});

test('existing final functionality remains present', () => {
  for (const token of [
    '/api/staff/payment-details', '/api/staff/my-finance', '/api/staff/employee-finance',
    '/api/staff/order/cancel', '/api/staff/notifications', 'Работа уже принята руководителем',
  ]) assert.ok(finalServer.includes(token), token);
});

test('production keeps normalized order sync and payout destination', () => {
  for (const token of [
    'syncBookingEventsV2', 'snapshotOrderV2', 'semanticKey', 'snapshot.version',
    '/opsprod/payment-save', '/opsprod/finance-entry', 'payment_bank', 'payment_sbp_phone',
  ]) assert.ok(prodServer.includes(token), token);
});

test('runtime provides complete report review flow', () => {
  for (const token of [
    '/api/staff/report/review', '/opsruntime/report-review', "status:'accepted'", "status:'redo'",
    '/api/staff/order/verify', 'redo_requested_at', 'Фотоотчёт отправлен на повтор',
    'staff_review_status', 'staff_verified',
  ]) assert.ok(runtimeServer.includes(token), token);
});

test('runtime UI has visible review actions, clickable attention and strong standards colors', () => {
  for (const token of [
    'Принять работу', 'Запросить повтор', 'Принят и завершён', 'rt-attention-report',
    'rt-std-blue', 'rt-std-green', 'rt-std-orange', 'rt-std-red', 'rt-std-purple',
    'Изменить реквизиты', 'Выплата отправлена', "a[href^=\"tel:\"]",
  ]) assert.ok(runtimeUi.includes(token), token);
});

test('registration FIO is forced to manual entry', () => {
  assert.ok(runtimeUi.includes("var u=s.user||{},name='';"));
  assert.ok(runtimeUi.includes("[u.first_name||'',u.last_name||''].join(' ').trim()"));
});

test('order sync cron is every minute', () => {
  assert.match(wrangler, /"crons"\s*:\s*\["\* \* \* \* \*"\]/);
});
