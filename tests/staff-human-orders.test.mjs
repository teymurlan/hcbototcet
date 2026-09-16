import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync('src/staff-human-orders.ts','utf8');
const ui=fs.readFileSync('src/staff-human-orders-ui.ts','utf8');
const index=fs.readFileSync('src/index.ts','utf8');

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

test('cards show compact human order labels, client and address styling',()=>{
  for(const token of ['Заказ #','hc-short-order','hc-card-client','hc-worker-client','.order-address']) assert.ok(ui.includes(token),token);
});

test('attention text uses clear employee assignment wording',()=>{
  assert.ok(ui.includes('Нет назначенных сотрудников'));
  assert.ok(ui.includes('hc-attention-reason'));
  assert.ok(ui.includes('hc-attention-address'));
});

test('new application and all operational states are small distinct badges',()=>{
  for(const token of ['hc-event-badge','Новая заявка','Ждёт проверки','hc-status-new','hc-status-review','hc-status-work','hc-status-done','hc-status-cancelled']) assert.ok(ui.includes(token),token);
});

test('presentation patch avoids MutationObserver and periodic polling',()=>{
  assert.ok(!ui.includes('MutationObserver'));
  assert.ok(!ui.includes('setInterval('));
  assert.ok(ui.includes("document.addEventListener('click'"));
  assert.ok(ui.includes("window.addEventListener('pageshow'"));
});
