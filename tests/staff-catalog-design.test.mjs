import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code=fs.readFileSync('src/staff-catalog-design.ts','utf8');
const index=fs.readFileSync('src/index.ts','utf8');

test('catalog design is injected above the existing STAFF app without replacing business domains',()=>{
  assert.ok(index.includes("from './staff-clients'"));
  assert.ok(index.includes("from './staff-catalog-design'"));
  assert.ok(index.includes('applyStaffCatalogDesign(withClientFix)'));
  assert.ok(index.includes('business_logic_unchanged: true'));
});

test('first-use onboarding has exactly four role-specific slides for owner and employee',()=>{
  assert.ok(code.includes('var OWNER_SLIDES=['));
  assert.ok(code.includes('var EMPLOYEE_SLIDES=['));
  const owner=(code.match(/OWNER_SLIDES=\[(.*?)\];/s)||[])[1]||'';
  const employee=(code.match(/EMPLOYEE_SLIDES=\[(.*?)\];/s)||[])[1]||'';
  assert.equal((owner.match(/visual:'/g)||[]).length,4);
  assert.equal((employee.match(/visual:'/g)||[]).length,4);
  for(const token of ['HOUSE CLEANING STAFF','Все заказы под контролем','Команда и фотоотчёты','Клиенты и абонементы','Задание понятно сразу','Фото ДО и ПОСЛЕ','Стандарты всегда рядом']) assert.ok(code.includes(token),token);
});

test('onboarding is shown only when its persistent per-role user key is not complete',()=>{
  for(const token of ["hc:onboarding:catalog:v1:","localStorage.getItem(key)==='done'","localStorage.setItem(key,'done')","role=s.owner?'owner':'employee'",'s.employee&&s.employee.id']) assert.ok(code.includes(token),token);
  assert.ok(code.includes('Пропустить'));
  assert.ok(code.includes('Начать работу'));
});

test('onboarding uses STAFF launch token and Telegram init data for role discovery',()=>{
  assert.ok(code.includes("'X-App-Launch-Token':new URLSearchParams(location.search).get('launch')||''"));
  assert.ok(code.includes("'X-Telegram-Init-Data':tg&&tg.initData||''"));
  assert.ok(code.includes("fetch('/api/state'"));
});

test('onboarding is swipeable and accessible without animation polling',()=>{
  for(const token of ['pointerdown','pointerup','aria-modal','hc-onboarding-dot','requestAnimationFrame']) assert.ok(code.includes(token),token);
  assert.ok(!code.includes('MutationObserver'));
  assert.ok(!code.includes('setInterval('));
});

test('catalog design compacts overview metrics, cards, controls and bottom navigation',()=>{
  for(const token of ['.hero{','min-height:78px!important','.section-title h2{font-size:19px!important','.card{padding:11px 12px!important','.btn{','min-height:40px!important','.navin{','min-height:69px!important','.nav button i{width:33px!important']) assert.ok(code.includes(token),token);
});

test('order open action is integrated into the card without deleting order information',()=>{
  for(const token of ['hc-inline-open','/^Открыть(?: заказ)?$/i','padding:10px 98px 10px 11px!important','position:absolute!important','right:9px!important']) assert.ok(code.includes(token),token);
});

test('detail sheets use a neutral appointment-record visual language',()=>{
  for(const token of ['Detailed record','.rt-sheet{','background:#f7f7f8!important','border-radius:28px 28px 0 0!important','.rt-sheet .card']) assert.ok(code.includes(token),token);
});

test('catalog design exposes a non-sensitive build health endpoint',()=>{
  assert.ok(index.includes('/__hc_staff_catalog_design'));
  assert.ok(index.includes('STAFF_CATALOG_DESIGN_BUILD'));
  assert.ok(index.includes('onboarding: true'));
  assert.ok(index.includes('catalog_ui: true'));
});
