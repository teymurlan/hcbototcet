import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const v3=fs.readFileSync('src/staff-command-v3.ts','utf8');
const v4=fs.readFileSync('src/staff-command-v4.ts','utf8');
const v5=fs.readFileSync('src/staff-command-v5.ts','utf8');
const finalUi=fs.readFileSync('src/staff-final-ui.ts','utf8');
const navUi=fs.readFileSync('src/staff-v5-ui.ts','utf8');
const control=fs.readFileSync('src/staff-control-center.ts','utf8');

test('home notification action opens notification center directly',()=>{
  assert.ok(v3.includes('window.__hcOpenNotifications=openNotifications'));
  assert.ok(v3.includes("document.addEventListener('hc:open-notifications'"));
  assert.ok(v4.includes("if(window.__hcOpenNotifications)window.__hcOpenNotifications()"));
});

test('attention cards route to the actual order or photo review',()=>{
  assert.ok(v4.includes("node.dataset.v4Target='photos'"));
  assert.ok(v4.includes(".hc-v4-attention[data-v4-target]"));
  assert.ok(v4.includes("navTo('orders',false)"));
  assert.ok(v4.includes("navTo(a.dataset.v4Target,false)"));
});

test('after render no longer restores scroll on every screen paint',()=>{
  assert.ok(v4.includes("document.addEventListener('hc:after-render',function(){queue()},false)"));
  assert.ok(!v4.includes("document.addEventListener('hc:after-render',function(){queue();var t=activeTab();if(t)restore(t)}"));
});

test('live refresh updates model without rebuilding visible pages',()=>{
  assert.ok(finalUi.includes('hcLastRefresh=0'));
  assert.ok(finalUi.includes("document.dispatchEvent(new CustomEvent('hc:data-ready'"));
  assert.ok(finalUi.includes("setInterval(function(){hcRefreshLive(false)},30000)"));
  const start=finalUi.indexOf('async function hcRefreshLive(force)');
  const end=finalUi.indexOf("setInterval(function(){hcRefreshLive(false)}",start);
  const block=finalUi.slice(start,end);
  assert.ok(block.includes('await reloadAdmin()'));
  assert.ok(block.includes('await loadWorker()'));
  assert.ok(!block.includes('await home()'));
  assert.ok(!block.includes('workerHome()'));
  assert.ok(!block.includes('orders()'));
  assert.ok(!block.includes('workerTasks()'));
});

test('legacy icon polishers no longer watch the full DOM',()=>{
  assert.ok(!navUi.includes('new MutationObserver'));
  assert.ok(!finalUi.includes('new MutationObserver'));
  assert.ok(navUi.includes("document.addEventListener('hc:after-render'"));
  assert.ok(finalUi.includes("document.addEventListener('hc:after-render',paintStandards"));
});

test('notification template editing is one-at-a-time for mobile ergonomics',()=>{
  assert.ok(v5.includes("textKey='new_order'"));
  assert.ok(v5.includes('data-v5-text-key'));
  assert.ok(v5.includes('Выберите тип, измените текст'));
  assert.ok(v5.includes('Тест в Telegram'));
  assert.ok(v5.includes('Сохранить изменения'));
});

test('owner can customize app layout density and motion inside STAFF',()=>{
  for(const token of ['Настроить приложение','hcV5AppSettings','data-v5-pref="density"','data-v5-pref="motion"','hc-ui-density-compact','hc-ui-motion-gentle','hc-ui-motion-off']) assert.ok(v5.includes(token),token);
  for(const token of ["type UiDensity='comfortable'|'compact'","type UiMotion='gentle'|'full'|'off'","app_customization:true","stability_v6:true"]) assert.ok(control.includes(token),token);
  assert.ok(control.includes("motion:UiMotion=['gentle','full','off'].includes"));
  assert.ok(control.includes("v.motion:'gentle'"));
});

test('gentle motion is the default and disables expensive card staggering',()=>{
  assert.ok(v5.includes('html.hc-ui-motion-gentle #main.hc-motion-ready *'));
  assert.ok(v5.includes('animation:none!important'));
  assert.ok(control.includes("motion:'gentle'") || control.includes(":'gentle'"));
});
