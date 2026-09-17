import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code=fs.readFileSync('src/staff-clients.ts','utf8');
const index=fs.readFileSync('src/index.ts','utf8');

test('client database is the active domain above the existing STAFF stack',()=>{
  assert.match(index,/from '\.\/staff-clients'/);
  assert.match(code,/from '\.\/staff-human-orders'/);
  assert.ok(code.includes('client_database:true'));
  assert.ok(code.includes('logic_unchanged:true'));
});

test('legacy client import stores private records only in Durable Object state',()=>{
  for(const token of ['opsclient:record:','opsclient:legacy-import-meta','/opsclients/import','house-cleaning-legacy-clients-v1'])assert.ok(code.includes(token),token);
  assert.ok(!code.includes('Копия График 2026.xlsx'));
  assert.ok(!code.includes('legacy_clients_2026.json'));
});

test('client base and import are owner only',()=>{
  assert.ok(code.includes("if(!data?.owner)"));
  assert.ok(code.includes('База клиентов пока доступна только руководителю'));
  assert.ok(code.includes("'/api/staff/clients/import'"));
  assert.ok(code.includes('ownerAuth(req,env,ctx)'));
});

test('legacy import is bounded and idempotent by stable legacy ids',()=>{
  assert.ok(code.includes('MAX_CLIENTS=500'));
  assert.ok(code.includes('MAX_VISITS_PER_CLIENT=400'));
  assert.ok(code.includes('CLIENT_PREFIX+row.id'));
  assert.ok(code.includes('if(old)updated++;else created++'));
  assert.ok(code.includes('row.manager_note=clean(old?.manager_note'));
});

test('client records keep history and subscription snapshots without creating booking orders',()=>{
  for(const token of ['subscription_snapshots','visits','visit_count','primary_phone','primary_address','manager_note'])assert.ok(code.includes(token),token);
  assert.ok(!code.includes('BOOKING_STORE'));
  assert.ok(!code.includes('/orders/create'));
});

test('client UI adds an owner-only entry in More and supports private JSON import',()=>{
  for(const token of ['Клиенты и абонементы','Импорт старой базы','hcClientFile','application/json,.json','/api/staff/clients/import'])assert.ok(code.includes(token),token);
  assert.ok(code.includes('ensureOwner'));
  assert.ok(code.includes('isMore'));
});

test('client UI is event driven and does not add polling or DOM observers',()=>{
  assert.ok(!code.includes('MutationObserver'));
  assert.ok(!code.includes('setInterval('));
  assert.ok(code.includes('requestAnimationFrame(patchMore)'));
  assert.ok(code.includes("document.addEventListener('hc:after-render'"));
});

test('manager can correct imported client and subscription data after review',()=>{
  for(const token of ['/api/staff/clients/update','subscription_snapshots','hcEditName','hcEditPhone','hcEditAddress','hcEditNote','hcClientSave'])assert.ok(code.includes(token),token);
});

test('entrypoint repairs client base visibility using the same reliable More-screen signal as admin access',()=>{
  for(const token of ['CLIENT_ENTRY_FIX',"String(heads[i].textContent||'').trim()==='Ещё'",'#nav button[data-n="more"]','hcClientsEntry','Клиенты и абонементы','/api/state','accessState.owner'])assert.ok(index.includes(token),token);
  assert.ok(index.includes("document.addEventListener('hc:after-render',queue"));
  assert.ok(!index.includes('MutationObserver'));
  assert.ok(!index.includes('setInterval('));
});

test('visible client entry shows live database counts to the owner',()=>{
  for(const token of ['/api/staff/clients','клиентов · ','абонементов','проверить','hcClientsEntryMeta'])assert.ok(index.includes(token),token);
});

test('public client health endpoint exposes only aggregate counts, never client PII',()=>{
  for(const token of ['/__hc_clients_health','imported_clients','imported_visits','imported_subscriptions','needs_review'])assert.ok(index.includes(token),token);
  assert.ok(!index.includes('primary_phone'));
  assert.ok(!index.includes('primary_address'));
});
