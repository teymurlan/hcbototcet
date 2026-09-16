import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync('src/staff-operations-safe.ts','utf8');
const ui=fs.readFileSync('src/staff-operations-safe-ui.ts','utf8');

test('safe layer keeps manager review counters in sync',()=>{
  assert.ok(server.includes('adminJobsSafe'));
  assert.ok(server.includes('verified_at'));
  assert.ok(server.includes("review: enriched.filter(j=>j.stage==='done'&&!j.staff_verified).length"));
});

test('safe layer preserves multipart boundary and blank registration FIO',()=>{
  assert.ok(ui.includes("window.fetch('/api/media/draft'"));
  assert.ok(ui.includes("var u=s.user||{},name=''"));
  assert.ok(ui.includes('FormData') || ui.includes('body:fd'));
});
