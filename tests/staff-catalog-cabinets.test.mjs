import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code=fs.readFileSync('src/staff-catalog-cabinets.ts','utf8');
const index=fs.readFileSync('src/index.ts','utf8');

test('catalog cabinet layer extends the existing onboarding design without replacing business domains',()=>{
  assert.ok(index.includes("from './staff-clients'"));
  assert.ok(index.includes("from './staff-catalog-design'"));
  assert.ok(index.includes("from './staff-catalog-cabinets'"));
  assert.ok(index.includes('const catalog = applyStaffCatalogDesign(withClientFix)'));
  assert.ok(index.includes('applyStaffCatalogCabinets(catalog)'));
  assert.ok(index.includes('business_logic_unchanged: true'));
});

test('overview, orders, employees, photos, more and clients receive one visual language',()=>{
  for(const token of [
    'data-hc-catalog-page="overview"',
    'data-hc-catalog-page="orders"',
    'data-hc-catalog-page="employees"',
    'data-hc-catalog-page="photos"',
    'data-hc-catalog-page="more"',
    '.hc-client-page',
    '.hc-client-card',
    '.hc-catalog-person',
    '.hc-catalog-media',
    '.hc-catalog-menu-cell'
  ]) assert.ok(code.includes(token),token);
});

test('cabinet design mirrors onboarding neutral presentation surfaces and strong type hierarchy',()=>{
  for(const token of [
    '--hc-v2-bg:#f2f2f3',
    '--hc-v2-soft:#e9e9eb',
    'border-radius:27px!important',
    'font-size:27px!important',
    'font-weight:920!important',
    'background:#111820!important',
    'border:0!important'
  ]) assert.ok(code.includes(token),token);
});

test('order cards remain complete appointment records with integrated open action',()=>{
  for(const token of ['.order-card','.hc-card-client','.hc-short-order','.order-address','.hc-inline-open','padding:12px 94px 12px 13px!important']) assert.ok(code.includes(token),token);
});

test('employee and client records are compact catalogue rows with clear navigation affordance',()=>{
  for(const token of ['.card[data-employee]',"content:'›'",'.hc-client-card:after','min-height:68px!important','min-height:76px!important']) assert.ok(code.includes(token),token);
});

test('detail sheets and forms use appointment-record surfaces instead of legacy framed panels',()=>{
  for(const token of ['.rt-sheet,','.hc-client-panel,','.hc-standard-panel{','background:#f2f2f3!important','.hc-sub-edit{','background:#f5f5f6!important']) assert.ok(code.includes(token),token);
});

test('redesign remains event driven and adds no DOM polling',()=>{
  assert.ok(!code.includes('MutationObserver'));
  assert.ok(!code.includes('setInterval('));
  assert.ok(code.includes("document.addEventListener('hc:after-render'"));
  assert.ok(code.includes('requestAnimationFrame'));
  assert.ok(code.includes('prefers-reduced-motion:reduce'));
});

test('catalog design health reports cabinet v2 build without sensitive data',()=>{
  assert.ok(index.includes('STAFF_CATALOG_CABINETS_BUILD'));
  assert.ok(index.includes('catalog_cabinets_v2: true'));
  assert.ok(index.includes('/__hc_staff_catalog_design'));
});
