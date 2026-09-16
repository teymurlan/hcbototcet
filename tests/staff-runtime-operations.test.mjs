import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync('src/staff-runtime.ts', 'utf8');
const ui = fs.readFileSync('src/staff-runtime-ui.ts', 'utf8');
const current = fs.readFileSync('src/staff-current.ts', 'utf8');
const operations = fs.readFileSync('src/staff-operations.ts', 'utf8');
const safe = fs.readFileSync('src/staff-operations-safe.ts', 'utf8');
const access = fs.readFileSync('src/staff-admin-access.ts', 'utf8');
const defects = fs.readFileSync('src/staff-defects-performance.ts', 'utf8');
const index = fs.readFileSync('src/index.ts', 'utf8');

test('runtime remains the operational base of the active defect/performance STAFF entrypoint', () => {
  assert.match(index, /from '\.\/staff-defects-performance'/);
  assert.match(defects, /from '\.\/staff-admin-access'/);
  assert.match(access, /from '\.\/staff-operations-safe'/);
  assert.match(safe, /from '\.\/staff-operations'/);
  assert.match(operations, /from '\.\/staff-current'/);
  assert.match(current, /from '\.\/staff-runtime'/);
  assert.match(server, /staff-runtime-operations-2026-09-16-b/);
});

test('finance payout is guarded and balance never renders negative', () => {
  for (const token of [
    "Math.max(0,earned-paid)",
    "Сейчас сотруднику нечего выплачивать",
    "Нельзя отметить большую сумму",
    "Сначала сотрудник должен указать реквизиты",
    "Выплата отправлена",
  ]) assert.ok(server.includes(token), token);
  assert.ok(ui.includes("p.textContent='Выплата отправлена'"));
  assert.ok(ui.includes("a.textContent='Отправлено '+value"));
});

test('manual manager orders and 5/10 visit subscriptions are supported', () => {
  for (const token of [
    '/api/staff/manual-order',
    '/api/staff/subscriptions',
    'subscription5',
    'subscription10',
    'subscription_visit',
    'subscription_size',
    'manager_manual',
  ]) assert.ok(server.includes(token) || ui.includes(token), token);
  assert.ok(ui.includes('Добавить заказ / абонемент'));
  assert.ok(ui.includes('Абонемент — 5 уборок'));
  assert.ok(ui.includes('Абонемент — 10 уборок'));
});

test('orders have manager date sorting and operational filters', () => {
  assert.ok(server.includes('orderPrioritySort'));
  for (const token of ['Ближайшие по дате', 'Сегодня', 'Завтра', 'Без команды', 'Абонементы']) assert.ok(ui.includes(token), token);
});

test('multi-cleaner assignment requires one lead cleaner', () => {
  for (const token of [
    'lead_id', 'is_lead', 'Выберите старшего клинера для бригады',
    'Фотоотчёт ведёт только старший клинер', 'Чек-лист ведёт старший клинер',
  ]) assert.ok(server.includes(token), token);
  assert.ok(ui.includes('Назначить старшим клинером'));
  assert.ok(ui.includes('Предпочтительный район'));
});

test('manual order report approval creates earnings through verified meta', () => {
  assert.ok(server.includes('verifyManualOrder'));
  assert.ok(server.includes('meta.verified_at=now'));
  assert.ok(server.includes('Начислено:'));
});
