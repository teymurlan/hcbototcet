import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const motion=fs.readFileSync('src/staff-motion-system.ts','utf8');
const v3=fs.readFileSync('src/staff-command-v3.ts','utf8');
const v4=fs.readFileSync('src/staff-command-v4.ts','utf8');
const v5=fs.readFileSync('src/staff-command-v5.ts','utf8');
const finalUi=fs.readFileSync('src/staff-final-ui.ts','utf8');
const index=fs.readFileSync('src/index.ts','utf8');
const admin=fs.readFileSync('src/staff-admin-access-ui.ts','utf8');
const clients=fs.readFileSync('src/staff-clients.ts','utf8');
const control=fs.readFileSync('src/staff-control-center.ts','utf8');

test('back controls are pinned consistently',()=>{
  assert.ok(motion.includes(':is(.back,.hc-v3-back,.hc-client-back,.hc-v4-back){position:sticky!important'));
  assert.ok(motion.includes('top:8px!important'));
});

test('screen decoration happens before paint instead of another animation frame',()=>{
  assert.ok(motion.includes('Promise.resolve().then(function(){try{document.dispatchEvent'));
  assert.ok(!v3.includes('function queue(){if(queued)return;queued=true;requestAnimationFrame'));
  assert.ok(!v4.includes('function queue(){if(queued)return;queued=true;requestAnimationFrame'));
  assert.ok(!v5.includes('function queue(){if(queued)return;queued=true;requestAnimationFrame'));
});

test('dashboard is rendered in its final command-center shape immediately',()=>{
  assert.ok(finalUi.includes('data-hc-native-v7="1"'));
  assert.ok(finalUi.includes('data-v4="1"'));
  assert.ok(finalUi.includes('data-v5-view="1"'));
  assert.ok(finalUi.includes('Ближайшие заказы'));
  assert.ok(!finalUi.includes('Заказы в приоритете'));
});

test('More screen reserves functional entries instead of appending them later',()=>{
  assert.ok(finalUi.includes('id="hcV5AppSettings"'));
  assert.ok(finalUi.includes("S.state&&S.state.owner?'<button id=\"hcClientsEntry\""));
  assert.ok(finalUi.includes('id="hcAdminAccessCard"'));
  assert.ok(index.includes('function ensureCard(){return document.getElementById'));
  assert.ok(!index.includes('lateTimer'));
  assert.ok(!admin.includes('latePatchTimer'));
});

test('context back history is fresh for each app session',()=>{
  assert.ok(v3.includes('returnStack=[]'));
  assert.ok(!v3.includes("sessionStorage.getItem('hc:v3:return-stack')"));
  assert.ok(!v3.includes("sessionStorage.setItem('hc:v3:return-stack'"));
  assert.ok(v3.includes("if(key==='notifications'){openNotifications(true);return true}"));
});

test('attention order keeps its original source instead of adding Orders as a second origin',()=>{
  assert.ok(v4.includes('window.__hcSkipOriginOnce=true'));
  assert.ok(v3.includes('if(window.__hcSkipOriginOnce)window.__hcSkipOriginOnce=false;else pushOrigin()'));
  assert.ok(v4.includes("Promise.resolve().then(function(){var old=document.querySelector('[data-order="));
});

test('notification order returns to notification center',()=>{
  assert.ok(v5.includes("window.__hcPushOrigin('notifications')"));
  assert.ok(v5.includes("window.__hcSkipOriginOnce=true"));
  assert.ok(v5.includes("if(!navTo('orders'))"));
});

test('owner appearance controls now make visible choices',()=>{
  for(const token of ['data-v5-pref="density"','data-v5-pref="text"','data-v5-pref="nav"','data-v5-pref="accent"','data-v5-pref="motion"','Предпросмотр','изменения видны сразу']) assert.ok(v5.includes(token),token);
  for(const token of ["type UiNav='glass'|'compact'","type UiAccent='blue'|'graphite'|'mint'","nav:UiNav","accent:UiAccent"]) assert.ok(control.includes(token),token);
  assert.ok(v5.includes("localStorage.setItem('hc:ui:prefs'"));
});

test('normal navigation does not trigger data refresh work',()=>{
  const s=finalUi.indexOf('go=async function(p)');
  const e=finalUi.indexOf('\n\nattention=function',s);
  const block=finalUi.slice(s,e);
  assert.ok(block.includes("if(p==='orders')return orders()"));
  assert.ok(!block.includes('hcRefreshLive'));
  assert.ok(!block.includes('setTimeout'));
});

test('client and admin decorators no longer use delayed layout retries',()=>{
  assert.ok(clients.includes("Promise.resolve().then(patchMore)"));
  assert.ok(!clients.includes("requestAnimationFrame(function(){requestAnimationFrame(patchMore)"));
  assert.ok(admin.includes('function queuePatch(){if(patchQueued)return;patchQueued=true;Promise.resolve().then'));
});
