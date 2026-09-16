import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const finalUi = fs.readFileSync('src/staff-final-ui.ts', 'utf8');
const finalServer = fs.readFileSync('src/staff-final.ts', 'utf8');
const prodUi = fs.readFileSync('src/staff-production-ui.ts', 'utf8');
const prodServer = fs.readFileSync('src/staff-production.ts', 'utf8');
const index = fs.readFileSync('src/index.ts', 'utf8');
const wrangler = fs.readFileSync('wrangler.jsonc', 'utf8');
const baseUi = fs.readFileSync('src/staff-v3-ui.ts', 'utf8');

test('production STAFF entrypoint is active', () => {
  assert.match(index, /from '\.\/staff-production'/);
  assert.match(prodServer, /staff-production-2026-09-16-c/);
});

test('base and final UI patch anchors still exist', () => {
  assert.ok(baseUi.includes('boot();\n})();\n</script>'));
  assert.match(finalUi, /const anchor = 'boot\(\);\\n\}\)\(\);\\n<\/script>'/);
  assert.ok(prodUi.includes("const anchor = 'boot();"));
});

test('inline final and production patches are valid JavaScript syntax', () => {
  const fm = finalUi.match(/const FINAL_PATCH = String\.raw`([\s\S]*?)`;\n\nconst FINAL_END/);
  assert.ok(fm, 'FINAL_PATCH block not found');
  assert.doesNotThrow(() => new Function(fm[1]));
  const pm = prodUi.match(/const PROD_PATCH = String\.raw`([\s\S]*?)`;\n\nconst anchor/);
  assert.ok(pm, 'PROD_PATCH block not found');
  assert.doesNotThrow(() => new Function(pm[1]));
});

test('existing final functionality remains present', () => {
  for (const token of [
    '/api/staff/payment-details', '/api/staff/my-finance', '/api/staff/employee-finance',
    '/api/staff/order/cancel', '/api/staff/notifications', 'Работа уже принята руководителем',
  ]) assert.ok(finalServer.includes(token), token);
});

test('production fixes false order changes and records payout destination', () => {
  for (const token of [
    'syncBookingEventsV2', 'snapshotOrderV2', 'semanticKey', 'snapshot.version',
    '/opsprod/payment-save', '/opsprod/finance-entry', 'payment_bank', 'payment_sbp_phone',
    'В STAFF сохранены только новые актуальные реквизиты',
  ]) assert.ok(prodServer.includes(token), token);
  assert.ok(!/old\.apartment\s*!==\s*o\.apartment/.test(prodServer));
});

test('production UI shows payment method and colored standards', () => {
  for (const token of [
    'payout-bank', 'выплачено', 'Заменить текущие реквизиты', 'руководитель сразу получит уведомление',
    'std-blue', 'std-green', 'std-orange', 'std-red', 'std-purple', 'Цвет помогает ориентироваться',
  ]) assert.ok(prodUi.toLowerCase().includes(token.toLowerCase()), token);
});

test('order sync cron is every minute', () => {
  assert.match(wrangler, /"crons"\s*:\s*\["\* \* \* \* \*"\]/);
});
