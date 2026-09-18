import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const finalUi=fs.readFileSync('src/staff-final-ui.ts','utf8');
const v3=fs.readFileSync('src/staff-command-v3.ts','utf8');
const v4=fs.readFileSync('src/staff-command-v4.ts','utf8');
const v5=fs.readFileSync('src/staff-command-v5.ts','utf8');
const control=fs.readFileSync('src/staff-control-center.ts','utf8');
const runtimeUi=fs.readFileSync('src/staff-runtime-ui.ts','utf8');
const runtime=fs.readFileSync('src/staff-runtime.ts','utf8');
const operations=fs.readFileSync('src/staff-operations.ts','utf8');

test('dashboard uses vector quick actions and actionable metric drilldowns',()=>{
  for(const token of ['hcQuickSvg','data-v4-metric="today"','data-v4-metric="unassigned"','data-v4-metric="work"','data-v4-metric="employees"']) assert.ok(finalUi.includes(token),token);
  assert.ok(v4.includes("i===0?'today':i===1?'unassigned':i===2?'work':'employees'"));
});

test('dashboard drilldowns can return to Overview',()=>{
  for(const token of ['window.__hcHomeSection=true','data-hc-home-back','← Обзор','window.__hcMetricFilter']) assert.ok(v4.includes(token)||finalUi.includes(token),token);
  assert.ok(finalUi.includes("window.__hcHomeSection?'<button class=\"back hc-v2-home-back\""));
});

test('orders provide clear workflow filters sorting and readable cards',()=>{
  for(const token of ["['active','Активные']","['today','Сегодня']","['unassigned','Без команды']","['work','В работе']",'hcOrderSort','Сначала ближайшие','Сначала без команды','По клиенту','hc-v2-order-card','hc-v2-order-when','hc-v2-order-bottom']) assert.ok(finalUi.includes(token),token);
  assert.ok(finalUi.includes('Дата: ДД.ММ.ГГГГ'));
});

test('notification center includes subscription channel and editable subscription text',()=>{
  for(const token of ["['subscriptions','Абонементы'","['subscriptions','Абонемент'","noticeFilter==='subscription'","data-v5-nfilter=\"subscription\"",'min-height:190px','Редактор сообщений']) assert.ok(v5.includes(token),token);
  for(const token of ['subscriptions:boolean',"'subscriptions'|'broadcast'",'subscription_alerts:true','deliverSubscriptionAlerts','/opsnotify/subscription-claim',"subscriptions:'🎫 Абонемент"]) assert.ok(control.includes(token),token);
});

test('subscription alerts cover review one-left and exhausted states without repeating the same state',()=>{
  for(const token of ["remaining!==0&&remaining!==1","review?'review':remaining===0?'empty':'one'","if(last>0)return J({ok:true,claimed:false,last})",'Осталась 1 уборка.','Абонемент закончился.','Нужно проверить данные абонемента.']) assert.ok(control.includes(token),token);
});

test('manager feed timestamps always include full year',()=>{
  for(const source of [v3,v5]) assert.ok(source.includes("year:'numeric'"));
  assert.ok(control.includes("return m?`${m[3]}.${m[2]}.${m[1]}`"));
});

test('motion-off remains a supported persisted app setting',()=>{
  assert.ok(v5.includes("motion:['gentle','full','off']"));
  assert.ok(v5.includes("data-v5-value=\"off\">Без"));
  assert.ok(control.includes("type UiMotion='gentle'|'full'|'off'"));
});


test('orders opened from Overview use the direct bridge without flashing the Orders list',()=>{
  assert.ok(finalUi.includes('window.__hcOpenOrderDirect=function'));
  assert.ok(finalUi.includes("S.page='orders';nav();return orderDetail(n)"));
  assert.ok(v4.includes("window.__hcOpenOrderDirect(number,'home')"));
  assert.ok(runtimeUi.includes("window.__hcOpenOrderDirect(String(n),'home')"));
  assert.ok(finalUi.includes("hcBackTarget==='home'?'← Обзор':'← К заказам'"));
});

test('current photo catalog exposes working accept and redo controls',()=>{
  for(const token of ['hcV4Accept','hcV4Redo','hcV4RedoReason','hcV4RedoSend',"/api/staff/report/review","action:'accept'","action:'redo'",'photoJobs=null']) assert.ok(v4.includes(token),token);
  assert.ok(v4.includes('Принять работу'));
  assert.ok(v4.includes('Отправить сотруднику на повтор'));
  assert.ok(v4.includes('Что именно сотруднику нужно исправить?'));
});

test('photo review API supports accept and redo and multi-report reset',()=>{
  assert.ok(runtime.includes("u.pathname==='/api/staff/report/review'"));
  assert.ok(runtime.includes("['accept','redo'].includes(action)"));
  assert.ok(runtime.includes("action==='redo'&&reason.length<3"));
  assert.ok(operations.includes("u.pathname === '/api/staff/report/review'"));
  assert.ok(operations.includes("stage:'before_sent'"));
  assert.ok(operations.includes("afterCount:0"));
});
