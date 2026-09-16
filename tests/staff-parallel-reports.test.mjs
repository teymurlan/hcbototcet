import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync('src/staff-operations.ts','utf8');
const ui = fs.readFileSync('src/staff-operations-ui.ts','utf8');
const safeServer = fs.readFileSync('src/staff-operations-safe.ts','utf8');
const safeUi = fs.readFileSync('src/staff-operations-safe-ui.ts','utf8');
const index = fs.readFileSync('src/index.ts','utf8');

test('parallel operations safety layer is the active STAFF entrypoint',()=>{
  assert.match(index,/from '\.\/staff-operations-safe'/);
  assert.match(server,/staff-operations-parallel-reports-2026-09-16-a/);
  assert.match(safeServer,/staff-operations-parallel-safe-2026-09-16-b/);
  assert.match(server,/from '\.\/staff-current'/);
});

test('active jobs and drafts are isolated by employee, order and stage',()=>{
  for(const token of ['opsmulti:job:','opsmulti:draft:','booking_order_number','order_number','parallel_reports:true']) assert.ok(server.includes(token),token);
  assert.ok(server.includes('multiJobKey(id,order)'));
  assert.ok(server.includes('multiDraftKey(id,order,stage)'));
});

test('lead cleaner can start multiple reports without singleton active-job guard',()=>{
  assert.ok(server.includes("if (action !== 'start') return current.fetch"));
  assert.ok(!server.includes('Сначала завершите текущую уборку'));
  assert.ok(server.includes('already_started:true'));
  assert.ok(server.includes('Фотоотчёт ведёт только старший клинер'));
  assert.ok(server.includes('assigned.length>1 && auth.userId!==leadId'));
});

test('media upload is order-scoped, retry-safe and idempotent',()=>{
  for(const token of ['client_id','clientId','deduplicated:true','sendDocument','MAX_MEDIA','MAX_FILE']) assert.ok(server.includes(token),token);
  assert.ok(ui.includes("fd.append('order_number',n)"));
  assert.ok(ui.includes("fd.append('client_id',ids[i])"));
  assert.ok(ui.includes('for(var attempt=0;attempt<3;attempt++)'));
  assert.ok(ui.includes('opsUploadLocks'));
});

test('multipart upload never forces application/json and FIO starts blank',()=>{
  assert.ok(safeUi.includes("window.fetch('/api/media/draft'"));
  assert.ok(safeUi.includes("'X-App-Launch-Token'"));
  assert.ok(!safeUi.includes("headers:{'content-type':'application/json'}"));
  assert.ok(safeUi.includes("var u=s.user||{},name=''"));
});

test('every before/after action carries the selected order',()=>{
  assert.ok(ui.includes("body:JSON.stringify({order_number:n,defect_note:"));
  assert.ok(ui.includes("data-hc-stable=\"1\""));
  assert.ok(ui.includes('opsJobForOrder(n)'));
  assert.ok(ui.includes('S.state.jobs'));
  assert.ok(server.includes('У вас несколько активных фотоотчётов'));
});

test('admin and redo flows remain compatible with parallel reports',()=>{
  for(const token of ['/opsmulti/jobs-all','/opsmulti/job-by-id','/opsmulti/stage','history:',"clean(body.action,20)==='redo'",'archive:']) assert.ok(server.includes(token),token);
  assert.ok(server.includes('reportReviewOperations'));
  assert.ok(server.includes("stage:'before_sent'"));
  assert.ok(safeServer.includes('accepted_report_stats:true'));
  assert.ok(safeServer.includes("staff_review_status: accepted ? 'accepted'"));
});

test('legacy in-progress singleton report migrates without losing drafts',()=>{
  assert.ok(server.includes('migrateLegacy'));
  assert.ok(server.includes("this.state.storage.get(`job:${id}`)"));
  assert.ok(server.includes("this.state.storage.get<MediaItem[]>(`draft:${id}:${stage}`)"));
  assert.ok(server.includes('promoteLegacy'));
});
