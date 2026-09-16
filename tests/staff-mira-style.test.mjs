import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui=fs.readFileSync('src/staff-mira-style-ui.ts','utf8');
const server=fs.readFileSync('src/staff-mira-style.ts','utf8');
const human=fs.readFileSync('src/staff-human-orders.ts','utf8');
const index=fs.readFileSync('src/index.ts','utf8');

test('Mira-inspired layer stays active beneath human order presentation',()=>{
  assert.match(index,/from '\.\/staff-human-orders'/);
  assert.match(human,/from '\.\/staff-mira-style'/);
  assert.match(server,/from '\.\/staff-defects-performance'/);
  assert.match(ui,/from '\.\/staff-defects-performance-ui'/);
  assert.ok(server.includes("logic_unchanged:true"));
  assert.ok(server.includes("return defects.fetch(req,env,ctx as any)"));
});

test('floating navigation preserves existing icons and labels',()=>{
  for(const token of ['.navin{','.nav button i{','.nav button.on i{','pointer-events:auto!important','border-radius:31px!important']) assert.ok(ui.includes(token),token);
  assert.ok(ui.includes('linear-gradient(145deg,#3477ff,#255fdc)'));
});

test('new design includes blue gradient shell, white cards and pill controls',()=>{
  for(const token of ['radial-gradient','linear-gradient(145deg,#3147ff','.metric,.card{','.filter.on{','.search,.input,select,textarea,.money{','.hero{']) assert.ok(ui.includes(token),token);
});

test('Mira style itself does not add DOM polling or application behavior',()=>{
  assert.ok(!ui.includes('MutationObserver'));
  assert.ok(!ui.includes('setInterval('));
  assert.ok(!ui.includes('addEventListener('));
  assert.ok(!ui.includes('/api/'));
});

test('status meaning remains visually distinct',()=>{
  for(const token of ['hc-status-completed','hc-status-unassigned','hc-status-progress','hc-status-assigned','.chip.green','.chip.orange','.chip.red']) assert.ok(ui.includes(token),token);
});

test('iPhone safe area and compact layout remain supported',()=>{
  assert.ok(ui.includes('env(safe-area-inset-bottom)'));
  assert.ok(ui.includes('@media(max-width:430px)'));
  assert.ok(ui.includes('@media(max-width:360px)'));
});
