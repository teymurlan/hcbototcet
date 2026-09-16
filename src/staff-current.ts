import runtime, { AppState as RuntimeAppState } from './staff-runtime';
import type { Env } from './staff-runtime';
import { STAFF_CURRENT_APP } from './staff-current-ui';

export type { Env } from './staff-runtime';
export class AppState extends RuntimeAppState {}

const BUILD = 'staff-current-stability-2026-09-16-a';
const STORE_NAME = 'house-cleaning-app-v1';
const MIN_MEDIA = 2;

type TgUser = { id:number; first_name?:string; last_name?:string; username?:string };

type FinanceEvent = {
  type:'accrual'|'adjustment'|'payout';
  amount:number;
  at:number;
  order_number?:string;
  label:string;
  address?:string;
  comment?:string;
  payment_bank?:string;
  payment_sbp_phone?:string;
  payment_recipient?:string;
  payment_card_last4?:string;
};

export default {
  async fetch(req:Request, env:Env, ctx?:ExecutionContext):Promise<Response> {
    const u = new URL(req.url);

    if (req.method === 'GET' && u.pathname === '/__hc_staff_version') {
      return J({ ok:true, build:BUILD, staff:true, ledger_floor:true, stable_photo_upload:true, persistent_keyboard:true, duration_tracking:true, subscription_attention_window_days:4 });
    }
    if (req.method === 'GET' && ['/staff','/staff/','/admin'].includes(u.pathname)) return html(STAFF_CURRENT_APP);
    if (req.method === 'POST' && u.pathname === '/webhook') return webhookCurrent(req, env, ctx);

    if (req.method === 'GET' && u.pathname === '/api/staff/orders') return ordersCurrent(req, env, ctx);
    if (req.method === 'GET' && u.pathname === '/api/admin/jobs') return adminJobsCurrent(req, env, ctx);
    if (req.method === 'GET' && u.pathname === '/api/admin/job') return adminJobCurrent(req, env, ctx);

    if (req.method === 'GET' && u.pathname === '/api/staff/finance') return financeSummaryApi(req, env, ctx);
    if (req.method === 'GET' && u.pathname === '/api/staff/my-finance') return financeMineApi(req, env, ctx);
    if (req.method === 'GET' && u.pathname === '/api/staff/employee-finance') return financeEmployeeApi(req, env, ctx);
    if (req.method === 'POST' && u.pathname === '/api/staff/finance/entry') return financeEntryCurrent(req, env, ctx);

    if (req.method === 'GET' && u.pathname === '/api/staff/draft-count') return draftCountApi(req, env, ctx);
    if (req.method === 'POST' && u.pathname === '/api/before') return submitBeforeCurrent(req, env, ctx);
    if (req.method === 'POST' && u.pathname === '/api/after') return submitAfterCurrent(req, env, ctx);

    if (req.method === 'POST' && u.pathname === '/api/staff/order/action') return actionCurrent(req, env, ctx);

    return runtime.fetch(req, env, ctx as any);
  },
  scheduled(controller:any, env:Env, ctx:ExecutionContext):Promise<void> {
    return runtime.scheduled(controller, env, ctx);
  }
};

async function ordersCurrent(req:Request, env:Env, ctx?:ExecutionContext) {
  const r = await runtime.fetch(req, env, ctx as any); if (!r.ok) return r;
  const x:any = await r.json().catch(()=>({orders:[]}));
  const orders = (x.orders || []).map((o:any) => {
    const meta = o.staff || {};
    if (Number(meta.verified_at || 0) > 0 && String(o.status || '') !== 'CANCELLED') return { ...o, status:'COMPLETED', completed_at:o.completed_at || new Date(Number(meta.verified_at)).toISOString() };
    if (Number(meta.cancelled_at || 0) > 0) return { ...o, status:'CANCELLED' };
    return o;
  }).sort(orderPrioritySort);
  return J({ ...x, orders });
}

async function adminJobsCurrent(req:Request, env:Env, ctx?:ExecutionContext) {
  const r = await runtime.fetch(req, env, ctx as any); if (!r.ok) return r;
  const x:any = await r.json().catch(()=>({}));
  x.jobs = (x.jobs || []).map(enrichDuration);
  return J(x);
}

async function adminJobCurrent(req:Request, env:Env, ctx?:ExecutionContext) {
  const r = await runtime.fetch(req, env, ctx as any); if (!r.ok) return r;
  const x:any = await r.json().catch(()=>({}));
  if (x.job) x.job = enrichDuration(x.job);
  return J(x);
}

function enrichDuration(j:any) {
  const start = Number(j?.startedAt || j?.report_started_at || 0), end = Number(j?.finishedAt || j?.report_finished_at || 0);
  const duration = start ? Math.max(0, (end || Date.now()) - start) : 0;
  return { ...j, started_at:start, finished_at:end, duration_ms:duration, duration_text:duration ? durText(duration) : '' };
}

async function financeSummaryApi(req:Request, env:Env, ctx?:ExecutionContext) {
  const auth = await authState(req, env, ctx); if (!auth.ok || !auth.admin) return auth.response;
  const d = await financeDataset(env), ids = new Set<number>();
  for (const e of d.employees) ids.add(Number(e.id));
  for (const m of d.metas) for (const a of m.assigned || []) if (positiveInt(a.id)) ids.add(Number(a.id));
  for (const f of d.entries) if (positiveInt(f.employee_id)) ids.add(Number(f.employee_id));
  const list = [...ids].map(id => {
    const e = d.employees.find((v:any)=>Number(v.id)===id) || {};
    return { id, name:e.name || `ID ${id}`, district:e.district || '', ...computeFinance(d, id) };
  });
  return J({ ok:true, employees:list, total_accrued:list.reduce((s:any,r:any)=>s+Number(r.earned||0),0), total_paid:list.reduce((s:any,r:any)=>s+Number(r.paid||0),0), total_balance:list.reduce((s:any,r:any)=>s+Number(r.balance||0),0), entries:d.entries });
}

async function financeMineApi(req:Request, env:Env, ctx?:ExecutionContext) {
  const auth = await authState(req, env, ctx); if (!auth.ok || !auth.userId) return auth.response;
  const d = await financeDataset(env); return J({ ok:true, ...computeFinance(d, auth.userId) });
}

async function financeEmployeeApi(req:Request, env:Env, ctx?:ExecutionContext) {
  const auth = await authState(req, env, ctx); if (!auth.ok || !auth.admin) return auth.response;
  const id = positiveInt(new URL(req.url).searchParams.get('id')); if (!id) return J({ ok:false, error:'Сотрудник не найден' },400);
  const d = await financeDataset(env); return J({ ok:true, ...computeFinance(d, id) });
}

async function financeEntryCurrent(req:Request, env:Env, ctx?:ExecutionContext) {
  const auth = await authState(req, env, ctx); if (!auth.ok || !auth.admin) return auth.response;
  const x:any = await readBody(req), employeeId = positiveInt(x.employee_id), kind = clean(x.kind,20);
  if (!employeeId || !['payout','adjustment'].includes(kind)) return J({ ok:false, error:'Проверьте данные операции' },400);
  const amount = Number(x.amount);
  if (!Number.isFinite(amount) || (kind === 'payout' && amount <= 0) || (kind === 'adjustment' && amount === 0)) return J({ ok:false, error:'Проверьте сумму' },400);

  let payment:any = {};
  if (kind === 'payout') {
    const d = await financeDataset(env), f = computeFinance(d, employeeId), due = Math.max(0, Number(f.balance || 0));
    if (due <= 0) return J({ ok:false, error:'Сейчас сотруднику нечего выплачивать' },409);
    if (amount > due + 0.001) return J({ ok:false, error:`К выплате сейчас ${money(due)}. Нельзя отметить большую сумму.` },409);
    payment = (await stateCall(env, `/opsfinal/payment?id=${employeeId}`).catch(()=>({payment:{}}))).payment || {};
    if (!payoutMethod(payment)) return J({ ok:false, error:'Сначала сотрудник должен указать реквизиты для выплаты' },409);
  }

  const at = Date.now();
  const saved = await stateCall(env, '/opsprod/finance-entry', 'POST', {
    employee_id:employeeId, kind, amount, comment:clean(x.comment || (kind === 'payout' ? `Выплата отправлена: ${payoutMethod(payment)}` : 'Корректировка'),500), admin_id:auth.userId,
    payment_bank:clean(payment.bank,80), payment_sbp_phone:clean(payment.sbp_phone,40), payment_recipient:clean(payment.recipient,120), payment_card_last4:clean(payment.card_last4,4)
  });
  if (!saved?.ok) return J(saved || { ok:false, error:'Не удалось сохранить операцию' },400);

  const origin = new URL(req.url).origin;
  if (kind === 'payout') {
    const text = `💸 <b>Выплата отправлена</b>\n\nСумма: <b>${money(amount)}</b>\nРеквизиты: <b>${esc(payoutMethod(payment))}</b>`;
    ctx?.waitUntil?.(sendPersistent(env, employeeId, text, origin, req.headers.get('X-App-Launch-Token') || '', false).then(()=>undefined));
  } else {
    ctx?.waitUntil?.(sendPersistent(env, employeeId, `🧾 <b>Корректировка</b>\n\nСумма: <b>${money(amount)}</b>${x.comment?`\n${esc(x.comment)}`:''}`, origin, req.headers.get('X-App-Launch-Token') || '', false).then(()=>undefined));
  }
  const d2 = await financeDataset(env), after = computeFinance(d2, employeeId);
  return J({ ok:true, entry:saved.entry, balance_after:after.balance, paid_amount:kind==='payout'?amount:0 });
}

async function financeDataset(env:Env) {
  const [orders, manual, metasData, financeData, employeesData] = await Promise.all([
    bookingOrders(env), stateCall(env,'/opsruntime/manual-orders').catch(()=>({orders:[]})), stateCall(env,'/ops3/order-metas'), stateCall(env,'/ops3/finance'), stateCall(env,'/ops3/employees')
  ]);
  const map = new Map<string,any>();
  for (const o of orders.concat(manual.orders || [])) map.set(String(o.order_number), o);
  return { orders:[...map.values()], metas:metasData.metas || [], entries:financeData.entries || [], employees:employeesData.employees || [] };
}

function computeFinance(d:any, employeeId:number) {
  const orderMap = new Map((d.orders || []).map((o:any)=>[String(o.order_number),o]));
  const events:FinanceEvent[] = []; let accrued=0, adjustments=0, paid=0;
  for (const m of d.metas || []) {
    if (!Number(m.verified_at || 0)) continue;
    const a = (m.assigned || []).find((v:any)=>Number(v.id)===employeeId); if (!a) continue;
    const amount = Math.max(0, Number(a.rate_value || 0)); if (!amount) continue;
    accrued += amount; const o:any = orderMap.get(String(m.order_number));
    events.push({ type:'accrual', amount, at:Number(m.verified_at), order_number:String(m.order_number), label:`Начислено за заказ ${m.order_number}`, address:o?addressOf(o):'' });
  }
  for (const f of d.entries || []) {
    if (Number(f.employee_id) !== employeeId) continue;
    const amount = Number(f.amount || 0);
    if (f.kind === 'payout') paid += Math.max(0, amount); else adjustments += amount;
    events.push({ type:f.kind === 'payout' ? 'payout' : 'adjustment', amount, at:Number(f.at || 0), label:f.kind === 'payout' ? 'Выплата отправлена' : 'Бонус / корректировка', comment:f.comment || '', payment_bank:f.payment_bank || '', payment_sbp_phone:f.payment_sbp_phone || '', payment_recipient:f.payment_recipient || '', payment_card_last4:f.payment_card_last4 || '' });
  }

  const asc = events.slice().sort((a,b)=>a.at-b.at || eventRank(a.type)-eventRank(b.type));
  let balance=0, ignoredLegacyOverpay=0, appliedPaid=0;
  for (const e of asc) {
    if (e.type === 'accrual') balance += Math.max(0,e.amount);
    else if (e.type === 'adjustment') balance = Math.max(0, balance + e.amount);
    else {
      const value = Math.max(0,e.amount), applied = Math.min(value, balance);
      balance -= applied; appliedPaid += applied; ignoredLegacyOverpay += Math.max(0,value-applied);
    }
  }
  const history = events.slice().sort((a,b)=>b.at-a.at).slice(0,100), earned = Math.max(0, accrued + adjustments);
  return { accrued, adjustments, earned, paid, paid_applied:appliedPaid, balance:Math.max(0,balance), legacy_overpayment_ignored:ignoredLegacyOverpay, last_payout:history.find(x=>x.type==='payout') || null, history };
}

function eventRank(t:string) { return t === 'accrual' ? 0 : t === 'adjustment' ? 1 : 2; }

async function draftCountApi(req:Request, env:Env, ctx?:ExecutionContext) {
  const auth = await authState(req, env, ctx); if (!auth.ok || !auth.userId) return auth.response;
  const stage = clean(new URL(req.url).searchParams.get('stage'),20); if (!['before','after'].includes(stage)) return J({ok:false,error:'Неизвестный этап'},400);
  const x = await stateCall(env, `/drafts?id=${auth.userId}&stage=${stage}`).catch(()=>({files:[]}));
  return J({ ok:true, stage, count:Array.isArray(x.files)?x.files.length:0 });
}

async function submitBeforeCurrent(req:Request, env:Env, ctx?:ExecutionContext) {
  const auth = await authState(req, env, ctx); if (!auth.ok || !auth.userId) return auth.response;
  const job:any = auth.data?.job; if (!job || job.stage !== 'started') return J({ok:false,error:'Этап ДО сейчас недоступен'},409);
  const lead = await leadGuard(env, auth.userId, job); if (lead) return lead;
  const draft = await stateCall(env, `/drafts?id=${auth.userId}&stage=before`).catch(()=>({files:[]})), files:any[] = draft.files || [];
  if (files.length < MIN_MEDIA) return J({ok:false,error:`Добавьте минимум ${MIN_MEDIA} фото или видео ДО`},400);
  const body:any = await readBody(req), now = Date.now();
  job.stage='before_sent'; job.beforeSentAt=now; job.beforeCount=files.length; job.defectNote=clean(body.defect_note,600); job.reminded=false;
  await stateCall(env,'/job','POST',{job});
  await stateCall(env,'/archive','POST',{jobId:job.id,stage:'before',files});
  await stateCall(env,'/events','POST',{jobId:job.id,item:{type:'before',label:'Отправил фото/видео ДО',at:now,userId:auth.userId},once:true}).catch(()=>null);
  await stateCall(env,'/draft','POST',{action:'clear',userId:auth.userId,stage:'before'}).catch(()=>null);
  await stateCall(env,'/schedule','POST',{}).catch(()=>null);
  const n = clean(job.booking_order_number,120);
  if (n) {
    const meta = await orderMeta(env,n); meta.report_started_at = Number(job.startedAt || now); meta.before_sent_at = now; meta.before_count = files.length; meta.updated_at = new Date().toISOString(); meta.audit = addAudit(meta.audit,{type:'before_sent',label:`Фото ДО сохранены: ${files.length}`,at:now,user_id:auth.userId}); await saveMeta(env,meta);
  }
  const origin = new URL(req.url).origin, launch = req.headers.get('X-App-Launch-Token') || '';
  ctx?.waitUntil?.(sendPersistent(env, auth.userId, `✅ <b>Фото ДО сохранены</b>\n\nНачало уборки: <b>${fmtTime(Number(job.startedAt||now))}</b>\nМатериалов: <b>${files.length}</b>\n\nПродолжайте уборку. Фото ПОСЛЕ отправьте из приложения, когда всё будет готово.`, origin, launch, false).then(()=>undefined));
  return J({ok:true,job,duration_text:durText(Math.max(0,now-Number(job.startedAt||now)))});
}

async function submitAfterCurrent(req:Request, env:Env, ctx?:ExecutionContext) {
  const auth = await authState(req, env, ctx); if (!auth.ok || !auth.userId) return auth.response;
  const job:any = auth.data?.job;
  if (job?.stage === 'done') return J({ok:true,job,report_id:job.reportId||'',duration_text:durText(Math.max(0,Number(job.finishedAt||Date.now())-Number(job.startedAt||Date.now()))),already_done:true});
  if (!job || job.stage !== 'before_sent') return J({ok:false,error:'Сначала завершите этап Фото ДО'},409);
  const lead = await leadGuard(env, auth.userId, job); if (lead) return lead;
  const n = clean(job.booking_order_number,120), meta = n ? await orderMeta(env,n) : null;
  if (meta && Array.isArray(meta.checklist) && meta.checklist.some((v:any)=>!v.done)) return J({ok:false,error:'Сначала завершите весь чек-лист уборки'},409);
  const draft = await stateCall(env, `/drafts?id=${auth.userId}&stage=after`).catch(()=>({files:[]})), files:any[] = draft.files || [];
  if (files.length < MIN_MEDIA) return J({ok:false,error:`Добавьте минимум ${MIN_MEDIA} фото или видео ПОСЛЕ`},400);

  const now = Date.now(), started = Number(job.startedAt || now), duration = Math.max(0, now-started);
  const reportId = 'HC-'+new Date(now).toISOString().slice(2,10).replace(/-/g,'')+'-'+String(auth.userId).slice(-4)+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
  job.stage='done'; job.finishedAt=now; job.afterCount=files.length; job.reportId=reportId; job.end_location={lat:0,lon:0,accuracy:0}; job.endPlace=job.address||'Адрес объекта';
  await stateCall(env,'/job','POST',{job});
  await stateCall(env,'/history','POST',{job}).catch(()=>null);
  await stateCall(env,'/archive','POST',{jobId:job.id,stage:'after',files});
  await stateCall(env,'/events','POST',{jobId:job.id,item:{type:'done',label:'Завершил фотоотчёт',at:now,userId:auth.userId,meta:{duration_ms:duration}},once:true}).catch(()=>null);
  await stateCall(env,'/draft','POST',{action:'clear',userId:auth.userId,stage:'after'}).catch(()=>null);

  if (meta) {
    meta.report_started_at=started; meta.report_finished_at=now; meta.report_duration_ms=duration; meta.after_count=files.length; meta.report_ready_notified_at=now; meta.updated_at=new Date().toISOString();
    meta.audit=addAudit(meta.audit,{type:'report_ready',label:`Фотоотчёт готов к проверке · ${durText(duration)}`,at:now,user_id:auth.userId}); await saveMeta(env,meta);
  }

  const origin = new URL(req.url).origin, launch = req.headers.get('X-App-Launch-Token') || '';
  const adminText = `📸 <b>Фотоотчёт готов к проверке</b>\n\n${n?`Заказ: <b>${esc(n)}</b>\n`:''}Клинер: <b>${esc(job.employeeName||'Сотрудник')}</b>\nНачало: <b>${fmtTime(started)}</b>\nЗавершение: <b>${fmtTime(now)}</b>\nВремя уборки: <b>${durText(duration)}</b>\nФото: ДО ${Number(job.beforeCount||0)} · ПОСЛЕ ${files.length}`;
  ctx?.waitUntil?.(Promise.all(adminIds(env).map(id=>sendPersistent(env,Number(id),adminText,origin,'',true))).then(()=>undefined));
  ctx?.waitUntil?.(sendPersistent(env,auth.userId,`✅ <b>Фотоотчёт отправлен</b>\n\nНачало: <b>${fmtTime(started)}</b>\nВремя уборки: <b>${durText(duration)}</b>\n\nОтчёт ожидает проверки руководителя.`,origin,launch,false).then(()=>undefined));
  return J({ok:true,job,report_id:reportId,duration_text:durText(duration)});
}

async function actionCurrent(req:Request, env:Env, ctx?:ExecutionContext) {
  const copy = req.clone(), body:any = await readBody(copy), r = await runtime.fetch(req, env, ctx as any);
  if (r.ok && body.action === 'start') {
    const auth = await authState(copy, env, ctx), n = clean(body.order_number,120);
    if (auth.ok && auth.userId && n) {
      const meta = await orderMeta(env,n), now=Date.now();
      if (!Number(meta.report_started_at||0)) { meta.report_started_at=now; meta.updated_at=new Date().toISOString(); meta.audit=addAudit(meta.audit,{type:'report_started',label:'Сотрудник начал уборку и фотоотчёт',at:now,user_id:auth.userId}); await saveMeta(env,meta); }
    }
  }
  return r;
}

async function leadGuard(env:Env, userId:number, job:any):Promise<Response|null> {
  const n = clean(job?.booking_order_number,120); if (!n) return null;
  const meta = await orderMeta(env,n), assigned:any[] = meta.assigned || [];
  if (assigned.length < 2) return null;
  const leadId = positiveInt(meta.lead_id) || positiveInt((assigned.find((a:any)=>a.is_lead)||{}).id);
  if (leadId && leadId !== userId) return J({ok:false,error:'Фотоотчёт ведёт только старший клинер'},403);
  return null;
}

async function webhookCurrent(req:Request, env:Env, ctx?:ExecutionContext):Promise<Response> {
  const secret = String((env as any).TELEGRAM_WEBHOOK_SECRET || '');
  if (secret && !safeEq(req.headers.get('X-Telegram-Bot-Api-Secret-Token') || '', secret)) return new Response('Unauthorized',{status:401});
  const copy = req.clone(); let up:any; try { up = await req.json(); } catch { return runtime.fetch(copy,env,ctx as any); }
  const m = up?.message, user:TgUser|undefined = m?.from, cmd = String(m?.text||'').trim().replace(/@\w+$/,'').toLowerCase();
  if (!user?.id || !m?.chat?.id || !['/start','/menu'].includes(cmd)) return runtime.fetch(copy,env,ctx as any);
  const admin = adminIds(env).includes(String(user.id)), er = await stateCall(env,`/employee?id=${user.id}`).catch(()=>({employee:null})), employee = er.employee;
  if (!admin && !(employee && employee.status === 'active')) return runtime.fetch(copy,env,ctx as any);
  const launch = await signLaunch(user,String((env as any).TELEGRAM_BOT_TOKEN||'')), origin = new URL(req.url).origin;
  const title = admin ? '🏢 <b>HOUSE CLEANING STAFF · Руководитель</b>' : '🧹 <b>HOUSE CLEANING STAFF</b>';
  const text = `${title}\n\nКнопка открытия приложения закреплена внизу чата и всегда доступна.`;
  await sendPersistent(env,Number(m.chat.id),text,origin,launch,admin).catch(()=>null);
  await tg(env,'setChatMenuButton',{chat_id:m.chat.id,menu_button:{type:'web_app',text:'HOUSE CLEANING STAFF',web_app:{url:staffUrl(origin,launch)}}}).catch(()=>null);
  return new Response('OK');
}

async function authState(req:Request, env:Env, ctx?:ExecutionContext) {
  const u = new URL(req.url); u.pathname='/api/state'; u.search='';
  const r = await runtime.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env,ctx as any);
  let data:any; try { data = await r.clone().json(); } catch { return {ok:false,admin:false,userId:0,data:null,response:r}; }
  const userId = positiveInt(data?.employee?.id || data?.user?.id || data?.admin_id || userIdFromHeaders(req));
  const ok = r.ok && data?.ok !== false && (!!data?.admin || !!userId);
  return { ok, admin:!!data?.admin, userId, data, response:ok?J(data):r };
}

async function orderMeta(env:Env,n:string){const x=await stateCall(env,`/ops3/order-meta?number=${encodeURIComponent(n)}`);return x.meta||{order_number:n,assigned:[],accepted:{},confirmed:{},started:{},checklist:[],audit:[],verified_at:0,updated_at:''}}
async function saveMeta(env:Env,meta:any){return stateCall(env,'/ops3/order-meta','POST',meta)}
function addAudit(a:any,item:any){const x=Array.isArray(a)?[...a]:[];x.push(item);return x.slice(-160)}

function bookingStub(env:Env){return (env as any).BOOKING_STORE?.get((env as any).BOOKING_STORE.idFromName(STORE_NAME))}
async function bookingOrders(env:Env){const r=await bookingStub(env)?.fetch('https://booking.internal/orders');if(!r?.ok)return[];const x:any=await r.json().catch(()=>({}));return Array.isArray(x.orders)?x.orders:[]}

async function stateCall(env:Env,path:string,method='GET',body?:any){const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id),init:RequestInit={method,headers:{'content-type':'application/json'}};if(body!==undefined)init.body=JSON.stringify(body);const r=await stub.fetch('https://state.local'+path,init);return await r.json().catch(()=>({}))}

async function sendPersistent(env:Env, chatId:number, text:string, origin:string, launch:string, admin:boolean) {
  const url = staffUrl(origin,launch), label = admin ? '📲 Открыть кабинет руководителя' : '📲 Открыть HOUSE CLEANING STAFF';
  return tg(env,'sendMessage',{chat_id:chatId,text,parse_mode:'HTML',reply_markup:{keyboard:[[{text:label,web_app:{url}}]],resize_keyboard:true,is_persistent:true,input_field_placeholder:'HOUSE CLEANING STAFF'}});
}
function staffUrl(origin:string,launch:string){return `${origin}/staff${launch?`?launch=${encodeURIComponent(launch)}`:''}`}
async function tg(env:Env,method:string,body:any){const token=String((env as any).TELEGRAM_BOT_TOKEN||'');if(!token)return null;const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const x:any=await r.json().catch(()=>({}));if(!r.ok||!x.ok)throw Error(x.description||'Telegram API error');return x.result}

function adminIds(env:Env){return String((env as any).ADMIN_IDS||'').split(',').map((x:string)=>x.trim()).filter(Boolean)}
function payoutMethod(p:any){return[clean(p?.bank,80),clean(p?.sbp_phone,40)?`СБП ${clean(p?.sbp_phone,40)}`:'',clean(p?.card_last4,4)?`•••• ${clean(p?.card_last4,4)}`:''].filter(Boolean).join(' · ')}
function addressOf(o:any){return[o?.city,o?.address,o?.apartment?`кв./офис ${o.apartment}`:''].filter(Boolean).join(', ')||'Адрес не указан'}
function orderPrioritySort(a:any,b:any){const aa=!['COMPLETED','CANCELLED'].includes(String(a?.status||'')),bb=!['COMPLETED','CANCELLED'].includes(String(b?.status||''));if(aa!==bb)return aa?-1:1;const ka=`${a?.date||'9999-99-99'} ${a?.time||'99:99'}`,kb=`${b?.date||'9999-99-99'} ${b?.time||'99:99'}`;return aa?ka.localeCompare(kb):kb.localeCompare(ka)}
function durText(ms:number){const m=Math.max(0,Math.floor(ms/60000)),h=Math.floor(m/60);return h?`${h} ч ${m%60} мин`:`${m} мин`}
function fmtTime(ms:number){try{return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch{return'—'}}
function money(v:any){return new Intl.NumberFormat('ru-RU').format(Math.round(Number(v||0)))+' ₽'}
function clean(v:any,n=500){return String(v??'').trim().slice(0,n)}
function positiveInt(v:any){const n=Number(v);return Number.isInteger(n)&&n>0?n:0}
function esc(v:any){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
async function readBody(req:Request){try{return await req.json()}catch{return{}}}
function userIdFromHeaders(req:Request){const launch=req.headers.get('X-App-Launch-Token')||'';try{const p=launch.split('.')[0];if(p){const s=p.replace(/-/g,'+').replace(/_/g,'/'),j=JSON.parse(atob(s+'='.repeat((4-s.length%4)%4)));return positiveInt(j?.id)}const init=req.headers.get('X-Telegram-Init-Data')||'';return positiveInt(JSON.parse(new URLSearchParams(init).get('user')||'{}')?.id)}catch{return 0}}
function safeEq(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
async function signLaunch(user:TgUser,token:string){const payload={id:user.id,first_name:user.first_name||'',last_name:user.last_name||'',username:user.username||'',exp:Math.floor(Date.now()/1000)+12*60*60},body=b64(new TextEncoder().encode(JSON.stringify(payload))),sig=hex(await hmac(new TextEncoder().encode(token),new TextEncoder().encode('launch:'+body)));return body+'.'+sig}
async function hmac(key:BufferSource,data:BufferSource){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data))}
function hex(a:Uint8Array){return[...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
function b64(a:Uint8Array){let s='';a.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function J(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function html(s:string){return new Response(s,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})}
