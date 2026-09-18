import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync('src/staff-admin-access.ts','utf8');
const ui=fs.readFileSync('src/staff-admin-access-ui.ts','utf8');
const safe=fs.readFileSync('src/staff-operations-safe.ts','utf8');
const defects=fs.readFileSync('src/staff-defects-performance.ts','utf8');
const style=fs.readFileSync('src/staff-mira-style.ts','utf8');
const human=fs.readFileSync('src/staff-human-orders.ts','utf8');
const index=fs.readFileSync('src/index.ts','utf8');

test('admin access remains active under human, visual and defect wrappers without bypassing safe operations',()=>{
  assert.match(index,/from '\.\/staff-human-orders'/);
  assert.match(human,/from '\.\/staff-mira-style'/);
  assert.match(style,/from '\.\/staff-defects-performance'/);
  assert.match(defects,/from '\.\/staff-admin-access'/);
  assert.match(server,/from '\.\/staff-operations-safe'/);
  assert.match(safe,/from '\.\/staff-operations'/);
  assert.ok(server.includes('staff-admin-access-2026-09-16-a'));
});

test('subscription visits render as visible framed date/time cards on iPhone',()=>{
  for(const token of ['hc-visit-card','hc-visit-fields','hc-visit-field','beautifyVisits','Дата','Время']) assert.ok(ui.includes(token),token);
  assert.ok(ui.includes('position:static!important'));
  assert.ok(ui.includes('opacity:1!important'));
  assert.ok(ui.includes('visibility:visible!important'));
  assert.ok(ui.includes('min-height:52px!important'));
  assert.ok(ui.includes("row.querySelector('.rt-date')"));
  assert.ok(ui.includes("row.querySelector('.rt-time')"));
});

test('UI patching is event-driven and does not continuously scan the DOM',()=>{
  assert.ok(ui.includes('function queuePatch()'));
  assert.ok(ui.includes("document.addEventListener('hc:after-render'"));
  assert.ok(ui.includes("document.addEventListener('change'"));
  assert.ok(ui.includes('Promise.resolve().then'));
  assert.ok(!ui.includes('new MutationObserver('));
  assert.ok(!/setInterval\s*\(/.test(ui));
});

test('delegated admins are injected into the existing ADMIN_IDS authorization path',()=>{
  assert.ok(server.includes('withDelegatedAdmins'));
  assert.ok(server.includes("return {...env,ADMIN_IDS:ids.join(',')} as Env"));
  assert.ok(server.includes("return operations.fetch(req,effective"));
  assert.ok(server.includes('operations.scheduled(controller,effective,ctx)'));
});

test('only original owner IDs may grant or revoke administrator access',()=>{
  assert.ok(server.includes('/api/staff/admins'));
  assert.ok(server.includes("if(!owner)return J({ok:false,error:'Назначать и снимать администраторов может только руководитель'"));
  assert.ok(server.includes('ownerIds(original).includes(String(target))'));
  assert.ok(server.includes('Этот Telegram ID принадлежит руководителю'));
  assert.ok(server.includes("action==='grant'"));
  assert.ok(server.includes("action==='revoke'"));
});

test('administrator UI exposes owner controls and read-only delegated admin state',()=>{
  for(const token of ['Администраторы','Назначить администратором','Снять доступ','может только руководитель','Управление администраторами']) assert.ok(ui.includes(token),token);
  assert.ok(ui.includes("accessState.owner?'Руководитель':'Администратор'"));
});

test('revoking an administrator restores previous employee access when it existed',()=>{
  for(const token of ['had_employee','previous_name','previous_role','previous_status','previous_added_at']) assert.ok(server.includes(token),token);
  assert.ok(server.includes("role:clean(existing.previous_role,80)||'Клинер'"));
  assert.ok(server.includes("stateCall(original,'/employee','POST',{action:'remove',id:target})"));
});

test('legacy unscoped drafts are migrated once and deleted after scoped verification',()=>{
  assert.ok(server.includes('safeLegacyDraftMigration'));
  assert.ok(server.includes('opsadmin:legacy-drafts-safe:'));
  assert.ok(server.includes("const oldKey=`draft:${id}:${stage}`"));
  assert.ok(server.includes('await this.state.storage.delete(oldKey)'));
  assert.ok(server.includes('opsmulti:draft:'));
});
