import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('src/staff-final-ui.ts', 'utf8');
const server = fs.readFileSync('src/staff-final.ts', 'utf8');
const index = fs.readFileSync('src/index.ts', 'utf8');
const wrangler = fs.readFileSync('wrangler.jsonc', 'utf8');
const baseUi = fs.readFileSync('src/staff-v3-ui.ts', 'utf8');

test('final STAFF entrypoint is active', () => {
  assert.match(index, /from '\.\/staff-final'/);
  assert.match(server, /staff-final-polish-2026-09-16-a/);
});

test('final UI patch anchor still exists in base app', () => {
  assert.ok(baseUi.includes('boot();\n})();\n</script>'));
  assert.match(ui, /const anchor = 'boot\(\);\\n\}\)\(\);\\n<\/script>'/);
});

test('inline final patch is valid JavaScript syntax', () => {
  const m = ui.match(/const FINAL_PATCH = String\.raw`([\s\S]*?)`;\n\nconst FINAL_END/);
  assert.ok(m, 'FINAL_PATCH block not found');
  assert.doesNotThrow(() => new Function(m[1]));
});

test('critical requested functionality is present', () => {
  for (const token of [
    '/api/staff/payment-details',
    '/api/staff/my-finance',
    '/api/staff/employee-finance',
    '/api/staff/order/cancel',
    '/api/staff/notifications',
    'Работа уже принята руководителем',
    'syncBookingEvents',
  ]) assert.ok(server.includes(token), token);
  for (const token of [
    'Стандарты HOUSE CLEANING',
    'Не назначены',
    'Назначены',
    'Заработано',
    'hcLoadMedia',
    'setInterval(hcRefreshLive,15000)',
    'Написать в Telegram',
  ]) assert.ok(ui.toLowerCase().includes(token.toLowerCase()), token);
});

test('order sync cron is every minute', () => {
  assert.match(wrangler, /"crons"\s*:\s*\["\* \* \* \* \*"\]/);
});
