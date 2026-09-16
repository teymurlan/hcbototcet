import production, { AppState as ProductionAppState } from './staff-production';
import type { Env } from './staff-production';
import { STAFF_RUNTIME_APP } from './staff-runtime-ui';

export type { Env } from './staff-production';
const BUILD = 'staff-runtime-operations-2026-09-16-b';
const STORE_NAME = 'house-cleaning-app-v1';
const WORKER_ORIGIN = 'https://hcbototcet.teymurlannn.workers.dev';

type ReportReview = { job_id:string; status:'accepted'|'redo'; reason:string; at:number; admin_id:number; booking_order_number:string };
type ManualOrder = Record<string, any> & { order_number:string; is_manual:true };

export class AppState extends ProductionAppState {
  async fetch(req: Request): Promise<Response> {
    const u = new URL(req.url);
    if (u.pathname === '/opsruntime/report-review' && req.method === 'GET') {
      const job = clean(u.searchParams.get('job'), 120);
      if (!job) return J({ ok:false, error:'Не указан отчёт' },400);
      const review = await this.state.storage.get<ReportReview>(`opsruntime:report-review:${job}`) || null;
      return J({ ok:true, review });
    }
    if (u.pathname === '/opsruntime/report-review' && req.method === 'POST') {
      const x:any = await readBody(req), job = clean(x.job_id,120), status = clean(x.status,20);
      if (!job || !['accepted','redo'].includes(status)) return J({ ok:false,error:'Некорректный статус' },400);
      const review:ReportReview = { job_id:job, status:status as ReportReview['status'], reason:clean(x.reason,600), at:Number(x.at||Date.now()), admin_id:positiveInt(x.admin_id), booking_order_number:clean(x.booking_order_number,120) };
      await this.state.storage.put(`opsruntime:report-review:${job}`,review);
      return J({ ok:true, review });
    }
    if (u.pathname === '/opsruntime/manual-orders' && req.method === 'GET') {
      const rows = await this.state.storage.list<ManualOrder>({ prefix:'opsruntime:manual-order:' });
      const orders = [...rows.values()].sort(orderPrioritySort);
      return J({ ok:true, orders });
    }
    if (u.pathname === '/opsruntime/manual-order' && req.method === 'GET') {
      const n = clean(u.searchParams.get('number'),120);
      const order = n ? await this.state.storage.get<ManualOrder>(`opsruntime:manual-order:${n}`) || null : null;
      return J({ ok:true, order });
    }
    if (u.pathname === '/opsruntime/manual-order' && req.method === 'POST') {
      const x:any = await readBody(req), n = clean(x.order_number,120);
      if (!n) return J({ok:false,error:'Не указан номер заказа'},400);
      const old = await this.state.storage.get<ManualOrder>(`opsruntime:manual-order:${n}`) || null;
      const next = { ...(old||{}), ...x, order_number:n, is_manual:true, created_at:old?.created_at || x.created_at || new Date().toISOString(), updated_at:new Date().toISOString() } as ManualOrder;
      await this.state.storage.put(`opsruntime:manual-order:${n}`,next);
      return J({ok:true,order:next});
    }
    if (u.pathname === '/opsruntime/subscriptions' && req.method === 'GET') {
      const rows = await this.state.storage.list<any>({prefix:'opsruntime:subscription:'});
      return J({ok:true,subscriptions:[...rows.values()].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))});
    }
    if (u.pathname === '/opsruntime/subscription' && req.method === 'POST') {
      const x:any = await readBody(req), id = clean(x.id,120);
      if (!id) return J({ok:false,error:'Некорректный абонемент'},400);
      const old = await this.state.storage.get<any>(`opsruntime:subscription:${id}`) || null;
      const next = { ...(old||{}), ...x, id, created_at:old?.created_at || x.created_at || new Date().toISOString(), updated_at:new Date().toISOString() };
      await this.state.storage.put(`opsruntime:subscription:${id}`,next);
      return J({ok:true,subscription:next});
    }
    return super.fetch(req);
  }
}

export default {
  async fetch(req:Request, env:Env, ctx?:ExecutionContext):Promise<Response> {
    const u = new URL(req.url);
    if (req.method==='GET' && u.pathname==='/__hc_staff_version') return J({ok:true,build:BUILD,staff:true,report_review:true,manual_orders:true,subscriptions:true,lead_cleaner:true,payout_guard:true,priority_sort:true});
    if (req.method==='GET' && ['/staff','/staff/','/admin'].includes(u.pathname)) return html(STAFF_RUNTIME_APP);

    if (req.method==='GET' && u.pathname==='/api/admin/jobs') return adminJobsRuntime(req,env,ctx);
    if (req.method==='GET' && u.pathname==='/api/admin/job') return adminJobRuntime(req,env,ctx);
    if (req.method==='POST' && u.pathname==='/api/staff/report/review') return reportReviewApi(req,env,ctx);

    if (req.method==='GET' && u.pathname==='/api/staff/orders') return ordersRuntime(req,env,ctx);
    if (req.method==='GET' && u.pathname==='/api/staff/order') return orderRuntime(req,env,ctx);
    if (req.method==='POST' && u.pathname==='/api/staff/manual-order') return createManualOrderApi(req,env,ctx);
    if (req.method==='GET' && u.pathname==='/api/staff/subscriptions') return subscriptionsApi(req,env,ctx);
    if (req.method==='POST' && u.pathname==='/api/staff/order/assign') return assignRuntime(req,env,ctx);
    if (req.method==='POST' && u.pathname==='/api/staff/order/action') return actionRuntime(req,env,ctx);
    if (req.method==='POST' && u.pathname==='/api/staff/checklist') return checklistRuntime(req,env,ctx);
    if (req.method==='POST' && u.pathname==='/api/staff/order/verify') return verifyRuntime(req,env,ctx);
    if (req.method==='POST' && u.pathname==='/api/staff/order/cancel') return cancelRuntime(req,env,ctx);

    if (req.method==='GET' && u.pathname==='/api/staff/finance') return financeAdminRuntime(req,env,ctx);
    if (req.method==='GET' && u.pathname==='/api/staff/my-finance') return financeMineRuntime(req,env,ctx);
    if (req.method==='GET' && u.pathname==='/api/staff/employee-finance') return financeEmployeeRuntime(req,env,ctx);
    if (req.method==='POST' && u.pathname==='/api/staff/finance/entry') return financeEntryRuntime(req,env,ctx);

    if (req.method==='POST' && ['/api/media/draft','/api/before','/api/after'].includes(u.pathname)) {
      const guard = await leadPhotoGuard(req,env,ctx); if (guard) return guard;
    }

    return production.fetch(req,env,ctx as any);
  },
  scheduled(controller:any, env:Env, ctx:ExecutionContext):Promise<void> {
    return production.scheduled(controller,env,ctx);
  }
};

async function ordersRuntime(req:Request,env:Env,ctx?:ExecutionContext){
  const auth=await authState(req,env,ctx);if(!auth.ok)return auth.response;
  const baseReq=new Request(req.url,{method:'GET',headers:req.headers}),r=await production.fetch(baseReq,env,ctx as any);if(!r.ok)return r;
  const data:any=await r.json().catch(()=>({orders:[]})),manual=await manualOrders(env),metas=await allMetas(env),map=new Map(metas.map((m:any)=>[String(m.order_number),m]));
  let extra=manual.map((o:any)=>({...o,staff:map.get(String(o.order_number))||emptyMeta(String(o.order_number))}));
  if(!auth.admin)extra=extra.filter((o:any)=>(o.staff?.assigned||[]).some((a:any)=>Number(a.id)===auth.userId));
  const merged=[...(data.orders||[]),...extra],dedup=new Map<string,any>();for(const o of merged)dedup.set(String(o.order_number),o);
  return J({ok:true,orders:[...dedup.values()].sort(orderPrioritySort)});
}

async function orderRuntime(req:Request,env:Env,ctx?:ExecutionContext){
  const auth=await authState(req,env,ctx);if(!auth.ok)return auth.response;
  const n=clean(new URL(req.url).searchParams.get('number'),120),manual=await manualOrder(env,n);
  if(!manual)return production.fetch(req,env,ctx as any);
  const meta=await orderMeta(env,n);if(!auth.admin&&!(meta.assigned||[]).some((a:any)=>Number(a.id)===auth.userId))return J({ok:false,error:'Нет доступа к этому заказу'},403);
  return J({ok:true,order:{...manual,staff:meta}});
}

async function createManualOrderApi(req:Request,env:Env,ctx?:ExecutionContext){
  const auth=await authState(req,env,ctx);if(!auth.ok||!auth.admin)return auth.response;
  const x:any=await readBody(req),name=clean(x.customer_name,120),phone=clean(x.phone,60),address=clean(x.address,300),city=clean(x.city||'Санкт-Петербург',120),apartment=clean(x.apartment,80),service=clean(x.service_name||'Поддерживающая уборка',160),comment=clean(x.comment,1200),area=Math.max(0,Number(x.area||0));
  if(name.length<2)return J({ok:false,error:'Укажите имя клиента'},400);if(phone.replace(/\D/g,'').length<7)return J({ok:false,error:'Укажите телефон клиента'},400);if(address.length<3)return J({ok:false,error:'Укажите адрес'},400);
  const plan=clean(x.plan||'single',20),count=plan==='subscription10'?10:plan==='subscription5'?5:1,visits=Array.isArray(x.visits)?x.visits:[];
  if(visits.length!==count)return J({ok:false,error:`Укажите ${count} ${count===1?'дату уборки':'дат уборок'}`},400);
  for(const v of visits){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v.date||''))||!/^\d{2}:\d{2}$/.test(String(v.time||'')))return J({ok:false,error:'Проверьте даты и время уборок'},400)}
  const now=Date.now(),stamp=new Date(now).toISOString().slice(2,10).replace(/-/g,''),group=Math.random().toString(36).slice(2,6).toUpperCase(),subscriptionId=count>1?`SUB-${stamp}-${group}`:'',createdAt=new Date(now).toISOString(),orders:any[]=[];
  for(let i=0;i<count;i++){
    const v=visits[i],n=`HC-${count>1?'AB':'M'}-${stamp}-${group}-${String(i+1).padStart(2,'0')}`;
    const order:ManualOrder={order_number:n,is_manual:true,source:'manager_manual',customer_name:name,phone,city,address,apartment,service_name:service,area,date:String(v.date),time:String(v.time),status:'CONFIRMED',addon_names:[],estimated_price:0,photo_count:0,comment,client_comment:comment,created_at:createdAt,updated_at:createdAt,subscription_id:subscriptionId,subscription_size:count>1?count:0,subscription_visit:count>1?i+1:0};
    await saveManualOrder(env,order);orders.push(order);
  }
  if(subscriptionId)await stateCall(env,'/opsruntime/subscription','POST',{id:subscriptionId,customer_name:name,phone,city,address,apartment,service_name:service,area,comment,size:count,visit_order_numbers:orders.map(o=>o.order_number),created_by:auth.userId,created_at:createdAt});
  await notifyAdmins(env,`➕ <b>${count>1?`Создан абонемент на ${count} уборок`:'Добавлен заказ вручную'}</b>\n\n${esc(name)} · ${esc(phone)}\n📍 ${esc([city,address,apartment].filter(Boolean).join(', '))}\n📅 ${orders.map(o=>`${esc(o.date)} ${esc(o.time)}`).join(', ')}`,new URL(req.url).origin).catch(()=>null);
  return J({ok:true,orders,subscription_id:subscriptionId});
}

async function subscriptionsApi(req:Request,env:Env,ctx?:ExecutionContext){const auth=await authState(req,env,ctx);if(!auth.ok||!auth.admin)return auth.response;return J(await stateCall(env,'/opsruntime/subscriptions'))}

async function assignRuntime(req:Request,env:Env,ctx?:ExecutionContext){
  const auth=await authState(req,env,ctx);if(!auth.ok||!auth.admin)return auth.response;
  const x:any=await readBody(req.clone()),n=clean(x.order_number,120),order=await compatOrder(env,n);if(!order)return J({ok:false,error:'Заказ не найден'},404);
  const empData=await stateCall(env,'/ops3/employees'),employees:any[]=empData.employees||[],requested=Array.isArray(x.assigned)?x.assigned:[],assigned:any[]=[];
  for(const a of requested){const id=positiveInt(a.id),e=employees.find((v:any)=>Number(v.id)===id);if(!e)return J({ok:false,error:'Сотрудник не найден'},400);if(e.status!=='active'||e.admitted===false)return J({ok:false,error:`${e.name}: сотрудник ещё не допущен к заказам`},409);const av=await stateCall(env,`/opsfinal/availability?id=${id}`).catch(()=>({availability:{status:'available'}}));if((av.availability?.status||'available')!=='available')return J({ok:false,error:`${e.name}: сотрудник сейчас недоступен`},409);assigned.push({id:Number(e.id),name:e.name,rate_type:'fixed',rate_value:Math.max(0,Number(a.rate_value||e.default_rate||0)),district:clean(e.district,100)});}
  let leadId=positiveInt(x.lead_id||requested.find((a:any)=>a.is_lead)?.id);if(assigned.length===1)leadId=assigned[0].id;if(assigned.length>1&&!leadId)return J({ok:false,error:'Выберите старшего клинера для бригады'},400);if(leadId&&!assigned.some(a=>a.id===leadId))return J({ok:false,error:'Старший клинер должен быть в назначенной команде'},400);
  const old=await orderMeta(env,n);if(String(order.status)==='IN_PROGRESS'&&positiveInt(old.lead_id)&&leadId&&positiveInt(old.lead_id)!==leadId)return J({ok:false,error:'После начала уборки менять старшего клинера нельзя'},409);
  for(const a of assigned)a.is_lead=a.id===leadId;
  if(order.is_manual){
    const now=Date.now(),meta={...old,order_number:n,assigned,lead_id:leadId,assigned_at:now,assigned_by:auth.userId,updated_at:new Date().toISOString()};meta.audit=addAudit(old.audit,{type:'assignment',label:assigned.length?`Назначена команда: ${assigned.map(a=>a.name).join(', ')}${leadId?' · старший: '+(assigned.find(a=>a.id===leadId)?.name||leadId):''}`:'Команда снята',at:now,user_id:auth.userId});await saveMeta(env,meta);await saveManualOrder(env,{...order,status:assigned.length?'CLEANER_ASSIGNED':'CONFIRMED',staff_assignments:assigned,updated_at:new Date().toISOString()});
    const origin=new URL(req.url).origin;for(const a of assigned){const lead=a.id===leadId,leadName=assigned.find(v=>v.id===leadId)?.name||'';ctx?.waitUntil?.(sendTg(env,a.id,`🧹 <b>Новое задание HOUSE CLEANING</b>\n\n<b>${esc(n)}</b>\n📅 ${esc(order.date)} · ${esc(order.time)}\n📍 ${esc(addressOf(order))}\n💰 Ставка: <b>${money(a.rate_value)}</b>\n${lead?'⭐ <b>Вы старший клинер.</b> Вы начинаете уборку и ведёте фотоотчёт.':`В бригаде старший: <b>${esc(leadName)}</b>. Начало и фотоотчёт ведёт он.`}`,origin,'Открыть задание').then(()=>undefined));}
    return J({ok:true,assigned,lead_id:leadId});
  }
  const delegated=new Request(req.url,{method:'POST',headers:jsonHeaders(req.headers),body:JSON.stringify({...x,assigned:assigned.map(a=>({id:a.id,name:a.name,rate_type:'fixed',rate_value:a.rate_value}))})}),r=await production.fetch(delegated,env,ctx as any);if(!r.ok)return r;
  const meta=await orderMeta(env,n);meta.assigned=assigned;meta.lead_id=leadId;meta.updated_at=new Date().toISOString();meta.audit=addAudit(meta.audit,{type:'lead_selected',label:leadId?`Старший клинер: ${assigned.find(a=>a.id===leadId)?.name||leadId}`:'Старший клинер не назначен',at:Date.now(),user_id:auth.userId});await saveMeta(env,meta);
  const current=await bookingOrder(env,n);if(current)await putBookingOrder(env,{...current,staff_assignments:assigned,updated_at:new Date().toISOString()});
  return J({ok:true,assigned,lead_id:leadId});
}

async function actionRuntime(req:Request,env:Env,ctx?:ExecutionContext){
  const auth=await authState(req,env,ctx);if(!auth.ok)return auth.response;if(auth.admin)return J({ok:false,error:'Действие предназначено для сотрудника'},403);
  const x:any=await readBody(req.clone()),n=clean(x.order_number,120),action=clean(x.action,30),order=await compatOrder(env,n);if(!order)return J({ok:false,error:'Заказ не найден'},404);
  const meta=await orderMeta(env,n),assigned:any[]=meta.assigned||[];if(!assigned.some(a=>Number(a.id)===auth.userId))return J({ok:false,error:'Вы не назначены на этот заказ'},403);
  if(['CANCELLED','COMPLETED'].includes(String(order.status||''))||Number(meta.verified_at||0)>0)return J({ok:false,error:'Заказ уже закрыт'},409);
  const leadId=leadIdOf(meta);if(action==='start'&&assigned.length>1&&auth.userId!==leadId)return J({ok:false,error:`Начать уборку и вести фотоотчёт может только старший клинер: ${assigned.find(a=>Number(a.id)===leadId)?.name||'назначенный руководителем сотрудник'}`},403);
  if(!order.is_manual)return production.fetch(req,env,ctx as any);
  const er=await stateCall(env,`/ops3/employee?id=${auth.userId}`),employee=er.employee;if(!employee||employee.admitted===false)return J({ok:false,error:'Нет допуска к заказам'},403);const now=Date.now();
  if(action==='accept'){meta.accepted={...(meta.accepted||{}),[auth.userId]:now};meta.audit=addAudit(meta.audit,{type:'accepted',label:`${employee.name} принял задание`,at:now,user_id:auth.userId});}
  else if(action==='confirm'){if(!meta.accepted?.[auth.userId])return J({ok:false,error:'Сначала примите задание'},409);meta.confirmed={...(meta.confirmed||{}),[auth.userId]:now};meta.audit=addAudit(meta.audit,{type:'confirmed',label:`${employee.name} подтвердил выход`,at:now,user_id:auth.userId});}
  else if(action==='start'){if(!meta.confirmed?.[auth.userId])return J({ok:false,error:'Сначала подтвердите выход'},409);const active=auth.data?.job;if(active&&active.stage!=='done'&&String(active.booking_order_number||'')!==n)return J({ok:false,error:'Сначала завершите текущую уборку'},409);meta.started={...(meta.started||{}),[auth.userId]:now};if(!Array.isArray(meta.checklist)||!meta.checklist.length)meta.checklist=checklistFor(order);meta.audit=addAudit(meta.audit,{type:'started',label:`${employee.name} начал уборку как старший клинер`,at:now,user_id:auth.userId});const address=addressOf(order),job={id:`ORDER-${n}-${auth.userId}`,booking_order_number:n,userId:auth.userId,employeeName:employee.name,employeeUsername:employee.username||'',customer:order.customer_name||'Клиент',address,type:order.service_name||'Уборка',stage:'started',startedAt:now,start_location:{lat:0,lon:0,accuracy:0},startPlace:address,appUrl:`${new URL(req.url).origin}/staff`};await stateCall(env,'/job','POST',{job});await saveManualOrder(env,{...order,status:'IN_PROGRESS',updated_at:new Date().toISOString()});}
  else return J({ok:false,error:'Неизвестное действие'},400);
  meta.updated_at=new Date().toISOString();await saveMeta(env,meta);ctx?.waitUntil?.(notifyAdmins(env,`${action==='accept'?'☑️':action==='confirm'?'✅':'▶️'} <b>${esc(employee.name)}</b> ${action==='accept'?'принял задание':action==='confirm'?'подтвердил выход':'начал уборку'}\n\n<b>${esc(n)}</b> · ${esc(order.service_name||'Уборка')}\n📅 ${esc(order.date)} · ${esc(order.time)}\n📍 ${esc(addressOf(order))}`,new URL(req.url).origin).then(()=>undefined));return J({ok:true,meta});
}

async function checklistRuntime(req:Request,env:Env,ctx?:ExecutionContext){
  const auth=await authState(req,env,ctx);if(!auth.ok)return auth.response;if(auth.admin)return J({ok:false,error:'Только для сотрудника'},403);
  const x:any=await readBody(req.clone()),n=clean(x.order_number,120),order=await compatOrder(env,n);if(!order)return J({ok:false,error:'Заказ не найден'},404);const meta=await orderMeta(env,n),assigned:any[]=meta.assigned||[],leadId=leadIdOf(meta);if(!assigned.some(a=>Number(a.id)===auth.userId))return J({ok:false,error:'Нет доступа'},403);if(assigned.length>1&&auth.userId!==leadId)return J({ok:false,error:'Чек-лист ведёт старший клинер'},403);
  if(!order.is_manual)return production.fetch(req,env,ctx as any);const i=Number(x.index);if(!Number.isInteger(i)||i<0||i>=(meta.checklist||[]).length)return J({ok:false,error:'Некорректный пункт'},400);meta.checklist[i]={...meta.checklist[i],done:!!x.done,at:Date.now(),employee_id:auth.userId};meta.updated_at=new Date().toISOString();await saveMeta(env,meta);return J({ok:true,checklist:meta.checklist});
}

async function leadPhotoGuard(req:Request,env:Env,ctx?:ExecutionContext):Promise<Response|null>{
  const auth=await authState(req,env,ctx);if(!auth.ok||auth.admin)return null;const n=clean(auth.data?.job?.booking_order_number,120);if(!n)return null;const order=await compatOrder(env,n),meta=await orderMeta(env,n);if(order&&['CANCELLED','COMPLETED'].includes(String(order.status||'')))return J({ok:false,error:'Заказ уже закрыт'},409);const assigned:any[]=meta.assigned||[],leadId=leadIdOf(meta);if(assigned.length>1&&leadId&&auth.userId!==leadId)return J({ok:false,error:'Фотоотчёт ведёт только старший клинер'},403);return null;
}

async function verifyRuntime(req:Request,env:Env,ctx?:ExecutionContext){const auth=await authState(req,env,ctx);if(!auth.ok||!auth.admin)return auth.response;const x:any=await readBody(req.clone()),n=clean(x.order_number,120),manual=await manualOrder(env,n);if(!manual)return production.fetch(req,env,ctx as any);return verifyManualOrder(env,n,auth.userId,new URL(req.url).origin,ctx)}

async function verifyManualOrder(env:Env,n:string,adminId:number,origin:string,ctx?:ExecutionContext){const order=await manualOrder(env,n);if(!order)return J({ok:false,error:'Заказ не найден'},404);const meta=await orderMeta(env,n);if(meta.verified_at)return J({ok:true,already_verified:true});const now=Date.now();meta.verified_at=now;meta.verified_by=adminId;meta.updated_at=new Date().toISOString();meta.audit=addAudit(meta.audit,{type:'verified',label:'Руководитель принял работу. Начисления зафиксированы',at:now,user_id:adminId});await saveMeta(env,meta);await saveManualOrder(env,{...order,status:'COMPLETED',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()});for(const a of meta.assigned||[])ctx?.waitUntil?.(sendTg(env,Number(a.id),`✅ <b>Работа принята руководителем</b>\n\nЗаказ <b>${esc(n)}</b> · ${esc(order.service_name||'Уборка')}\nНачислено: <b>${money(a.rate_value||0)}</b>\n\nСумма появилась в вашем кабинете в разделе финансов.`,origin,'Открыть финансы').then(()=>undefined));return J({ok:true})}

async function cancelRuntime(req:Request,env:Env,ctx?:ExecutionContext){const auth=await authState(req,env,ctx);if(!auth.ok||!auth.admin)return auth.response;const x:any=await readBody(req.clone()),n=clean(x.order_number,120),manual=await manualOrder(env,n);if(!manual)return production.fetch(req,env,ctx as any);const reason=clean(x.reason,600);if(reason.length<3)return J({ok:false,error:'Укажите причину отмены'},400);if(manual.status==='COMPLETED')return J({ok:false,error:'Завершённый заказ отменить нельзя'},409);if(manual.status==='CANCELLED')return J({ok:true,already_cancelled:true});const meta=await orderMeta(env,n),now=Date.now();meta.cancelled_at=now;meta.cancelled_by=auth.userId;meta.cancellation_reason=reason;meta.updated_at=new Date().toISOString();meta.audit=addAudit(meta.audit,{type:'cancelled',label:`Заказ отменён руководителем: ${reason}`,at:now,user_id:auth.userId});await saveMeta(env,meta);await saveManualOrder(env,{...manual,status:'CANCELLED',cancellation_reason:reason,cancelled_at:new Date().toISOString(),updated_at:new Date().toISOString()});for(const a of meta.assigned||[])ctx?.waitUntil?.(sendTg(env,Number(a.id),`❌ <b>Заказ отменён</b>\n\n<b>${esc(n)}</b>\n📍 ${esc(addressOf(manual))}\nПричина: ${esc(reason)}`,new URL(req.url).origin,'Открыть STAFF').then(()=>undefined));return J({ok:true})}

async function financeAdminRuntime(req:Request,env:Env,ctx?:ExecutionContext){const auth=await authState(req,env,ctx);if(!auth.ok||!auth.admin)return auth.response;const x=await runtimeFinanceSummary(env);return J({ok:true,...x})}
async function financeMineRuntime(req:Request,env:Env,ctx?:ExecutionContext){const auth=await authState(req,env,ctx);if(!auth.ok||!auth.userId)return auth.response;return J({ok:true,...await runtimeFinanceForEmployee(env,auth.userId)})}
async function financeEmployeeRuntime(req:Request,env:Env,ctx?:ExecutionContext){const auth=await authState(req,env,ctx);if(!auth.ok||!auth.admin)return auth.response;const id=positiveInt(new URL(req.url).searchParams.get('id'));if(!id)return J({ok:false,error:'Сотрудник не найден'},400);return J({ok:true,...await runtimeFinanceForEmployee(env,id)})}

async function financeEntryRuntime(req:Request,env:Env,ctx?:ExecutionContext){
  const auth=await authState(req,env,ctx);if(!auth.ok||!auth.admin)return auth.response;const x:any=await readBody(req.clone()),kind=clean(x.kind,20),employeeId=positiveInt(x.employee_id);if(!employeeId)return J({ok:false,error:'Сотрудник не найден'},400);
  if(kind!=='payout')return production.fetch(req,env,ctx as any);
  const f=await runtimeFinanceForEmployee(env,employeeId),due=Math.max(0,Number(f.balance||0));if(due<=0)return J({ok:false,error:'Сейчас сотруднику нечего выплачивать'},409);
  const payment=(await stateCall(env,`/opsfinal/payment?id=${employeeId}`).catch(()=>({payment:{}}))).payment||{},method=payoutMethod(payment);if(!method)return J({ok:false,error:'Сначала сотрудник должен указать реквизиты для выплаты'},409);
  const requested=Number(x.amount||due),amount=Number.isFinite(requested)&&requested>0?requested:due;if(amount>due+0.001)return J({ok:false,error:`К выплате сейчас ${money(due)}. Нельзя отметить большую сумму.`},409);
  const delegated=new Request(req.url,{method:'POST',headers:jsonHeaders(req.headers),body:JSON.stringify({...x,employee_id:employeeId,kind:'payout',amount,comment:clean(x.comment||`Выплата отправлена: ${method}`,500)})}),r=await production.fetch(delegated,env,ctx as any);if(!r.ok)return r;const data:any=await r.json().catch(()=>({ok:true})),after=await runtimeFinanceForEmployee(env,employeeId);return J({...data,ok:true,paid_amount:amount,balance_after:after.balance,payment_method:method});
}

async function runtimeFinanceSummary(env:Env){
  const [orders,metas,employeesData,financeData]=await Promise.all([compatOrders(env),allMetas(env),stateCall(env,'/ops3/employees'),stateCall(env,'/ops3/finance')]),orderMap=new Map(orders.map((o:any)=>[String(o.order_number),o])),acc=new Map<number,any>();
  for(const e of employeesData.employees||[])acc.set(Number(e.id),{id:Number(e.id),name:e.name,accrued:0,paid:0,adjustments:0,balance:0,district:e.district||''});
  for(const m of metas){if(!m.verified_at)continue;for(const a of m.assigned||[]){const id=Number(a.id);if(!acc.has(id))acc.set(id,{id,name:a.name||`ID ${id}`,accrued:0,paid:0,adjustments:0,balance:0,district:a.district||''});acc.get(id).accrued+=Math.max(0,Number(a.rate_value||0));}}
  for(const f of financeData.entries||[]){const id=Number(f.employee_id);if(!acc.has(id))continue;const amount=Number(f.amount||0);if(f.kind==='payout')acc.get(id).paid+=Math.max(0,amount);else acc.get(id).adjustments+=amount;}
  const list=[...acc.values()].map(r=>{const earned=Math.max(0,r.accrued+r.adjustments),balance=Math.max(0,earned-r.paid);return{...r,earned,balance,overpaid:Math.max(0,r.paid-earned)}});
  return{employees:list,total_accrued:list.reduce((s,r)=>s+r.earned,0),total_paid:list.reduce((s,r)=>s+r.paid,0),total_balance:list.reduce((s,r)=>s+r.balance,0),entries:financeData.entries||[],order_count:orderMap.size};
}

async function runtimeFinanceForEmployee(env:Env,employeeId:number){
  const [orders,metas,financeData]=await Promise.all([compatOrders(env),allMetas(env),stateCall(env,'/ops3/finance')]),orderMap=new Map(orders.map((o:any)=>[String(o.order_number),o]));let accrued=0,paid=0,adjustments=0;const history:any[]=[];
  for(const m of metas){if(!m.verified_at)continue;const a=(m.assigned||[]).find((v:any)=>Number(v.id)===employeeId);if(!a)continue;const amount=Math.max(0,Number(a.rate_value||0)),o:any=orderMap.get(String(m.order_number));accrued+=amount;history.push({type:'accrual',amount,at:Number(m.verified_at||0),order_number:m.order_number,label:`Начислено за заказ ${m.order_number}`,address:o?addressOf(o):''});}
  for(const f of financeData.entries||[]){if(Number(f.employee_id)!==employeeId)continue;const amount=Number(f.amount||0);if(f.kind==='payout')paid+=Math.max(0,amount);else adjustments+=amount;history.push({type:f.kind,amount,at:Number(f.at||0),label:f.kind==='payout'?'Выплата отправлена':'Бонус / корректировка',comment:f.comment||'',payment_bank:f.payment_bank||'',payment_sbp_phone:f.payment_sbp_phone||'',payment_recipient:f.payment_recipient||'',payment_card_last4:f.payment_card_last4||''});}
  history.sort((a,b)=>Number(b.at||0)-Number(a.at||0));const earned=Math.max(0,accrued+adjustments),balance=Math.max(0,earned-paid);return{accrued,adjustments,earned,paid,balance,overpaid:Math.max(0,paid-earned),last_payout:history.find(x=>x.type==='payout')||null,history:history.slice(0,100)};
}

async function adminJobsRuntime(req:Request,env:Env,ctx?:ExecutionContext){
  const r=await production.fetch(req,env,ctx as any);if(!r.ok)return r;
  const data:any=await r.json().catch(()=>({}));
  data.jobs=await Promise.all((data.jobs||[]).map((j:any)=>enrichReport(env,j)));
  if(data.stats){data.stats.review=(data.jobs||[]).filter((j:any)=>j.stage==='done'&&!j.staff_verified).length;}
  return J(data);
}
async function adminJobRuntime(req:Request,env:Env,ctx?:ExecutionContext){
  const r=await production.fetch(req,env,ctx as any);if(!r.ok)return r;
  const data:any=await r.json().catch(()=>({}));if(data.job)data.job=await enrichReport(env,data.job);
  return J(data);
}
async function enrichReport(env:Env,j:any){
  const n=deriveOrderNumber(j),stored=await stateCall(env,`/opsruntime/report-review?job=${encodeURIComponent(String(j.id||''))}`).catch(()=>({review:null})),review=stored.review as ReportReview|null;
  let meta:any=null;if(n)meta=(await stateCall(env,`/ops3/order-meta?number=${encodeURIComponent(n)}`).catch(()=>({meta:null}))).meta;
  const accepted=review?.status==='accepted'||!!meta?.verified_at;
  return{...j,booking_order_number:n||j.booking_order_number||'',staff_verified:accepted,staff_review_status:accepted?'accepted':review?.status||'',staff_redo_reason:review?.reason||''};
}

async function reportReviewApi(req:Request,env:Env,ctx?:ExecutionContext):Promise<Response>{
  const auth=await authState(req,env,ctx);if(!auth.ok||!auth.admin)return auth.response;
  const x:any=await readBody(req),jobId=clean(x.job_id,120),action=clean(x.action,20),reason=clean(x.reason,600);
  if(!jobId||!['accept','redo'].includes(action))return J({ok:false,error:'Некорректное действие'},400);
  if(action==='redo'&&reason.length<3)return J({ok:false,error:'Укажите, что нужно исправить'},400);
  const origin=new URL(req.url).origin,detailReq=new Request(`${origin}/api/admin/job?id=${encodeURIComponent(jobId)}`,{method:'GET',headers:req.headers});
  const detailRes=await production.fetch(detailReq,env,ctx as any);if(!detailRes.ok)return J({ok:false,error:'Фотоотчёт не найден'},404);
  const data:any=await detailRes.json().catch(()=>({})),job=data.job||{},n=deriveOrderNumber(job),now=Date.now();
  if(action==='accept'){
    if(n){const manual=await manualOrder(env,n);if(manual){const vr=await verifyManualOrder(env,n,auth.userId,origin,ctx);if(!vr.ok)return vr;}else{const vr=await production.fetch(new Request(`${origin}/api/staff/order/verify`,{method:'POST',headers:jsonHeaders(req.headers),body:JSON.stringify({order_number:n,job_id:jobId})}),env,ctx as any);if(!vr.ok){const er:any=await vr.json().catch(()=>({}));return J({ok:false,error:er.error||'Не удалось закрыть заказ'},vr.status)}}}
    await stateCall(env,'/opsruntime/report-review','POST',{job_id:jobId,status:'accepted',reason:'',at:now,admin_id:auth.userId,booking_order_number:n});await setLegacyReview(req,env,ctx,jobId,false).catch(()=>null);if(!n&&positiveInt(job.userId))ctx?.waitUntil?.(sendTg(env,positiveInt(job.userId),'✅ <b>Работа принята руководителем</b>\n\nФотоотчёт проверен и принят. Работа завершена.',origin,'Открыть STAFF').then(()=>undefined));return J({ok:true,status:'accepted',booking_order_number:n});
  }
  await stateCall(env,'/opsruntime/report-review','POST',{job_id:jobId,status:'redo',reason,at:now,admin_id:auth.userId,booking_order_number:n});await setLegacyReview(req,env,ctx,jobId,true).catch(()=>null);if(n){const metaData=await stateCall(env,`/ops3/order-meta?number=${encodeURIComponent(n)}`).catch(()=>({meta:null})),meta=metaData.meta||{order_number:n,assigned:[],audit:[]};meta.verified_at=0;meta.verified_by=0;meta.redo_requested_at=now;meta.redo_reason=reason;meta.updated_at=new Date().toISOString();meta.audit=addAudit(meta.audit,{type:'redo_requested',label:`Руководитель запросил повтор фотоотчёта: ${reason}`,at:now,user_id:auth.userId});await stateCall(env,'/ops3/order-meta','POST',meta);if(positiveInt(job.userId))await stateCall(env,'/job','POST',{job:{...job,stage:'before_sent',finishedAt:0,afterCount:0,redoReason:reason,redoRequestedAt:now,booking_order_number:n}}).catch(()=>null);}
  if(positiveInt(job.userId))ctx?.waitUntil?.(sendTg(env,positiveInt(job.userId),`↩️ <b>Фотоотчёт отправлен на повтор</b>\n\nЧто исправить:\n${esc(reason)}\n\nОткройте задание и загрузите новые фото ПОСЛЕ.`,origin,'Открыть задание').then(()=>undefined));return J({ok:true,status:'redo',reason,booking_order_number:n});
}

async function setLegacyReview(req:Request,env:Env,ctx:ExecutionContext|undefined,jobId:string,review:boolean){return production.fetch(new Request(`${new URL(req.url).origin}/api/admin/review`,{method:'POST',headers:jsonHeaders(req.headers),body:JSON.stringify({job_id:jobId,review})}),env,ctx as any)}
function deriveOrderNumber(j:any){const direct=clean(j?.booking_order_number,120);if(direct)return direct;const id=clean(j?.id,180),uid=positiveInt(j?.userId);if(id.startsWith('ORDER-')&&uid){const suffix='-'+uid;if(id.endsWith(suffix))return id.slice(6,-suffix.length)}return''}

async function authState(req:Request,env:Env,ctx?:ExecutionContext){const u=new URL(req.url);u.pathname='/api/state';u.search='';const r=await production.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env,ctx as any);let data:any;try{data=await r.clone().json()}catch{return{ok:false,admin:false,userId:0,data:null,response:r}}const userId=positiveInt(data?.employee?.id||data?.user?.id||data?.admin_id),ok=r.ok&&data?.ok!==false&&(!!data?.admin||!!userId);return{ok,admin:!!data?.admin,userId,data,response:ok?J(data):r}}

function bookingStub(env:Env){return (env as any).BOOKING_STORE?.get((env as any).BOOKING_STORE.idFromName(STORE_NAME))}
async function bookingOrders(env:Env){const r=await bookingStub(env)?.fetch('https://booking.internal/orders');if(!r?.ok)return[];const x:any=await r.json().catch(()=>({}));return Array.isArray(x.orders)?x.orders:[]}
async function bookingOrder(env:Env,n:string){const rows=await bookingOrders(env);return rows.find((o:any)=>String(o.order_number)===n)||null}
async function putBookingOrder(env:Env,order:any){const r=await bookingStub(env)?.fetch('https://booking.internal/order',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(order)});if(!r?.ok)throw Error('Не удалось обновить заказ в клиентской системе');const x:any=await r.json().catch(()=>({}));return x.order||order}
async function manualOrders(env:Env){const x=await stateCall(env,'/opsruntime/manual-orders').catch(()=>({orders:[]}));return Array.isArray(x.orders)?x.orders:[]}
async function manualOrder(env:Env,n:string){if(!n)return null;const x=await stateCall(env,`/opsruntime/manual-order?number=${encodeURIComponent(n)}`).catch(()=>({order:null}));return x.order||null}
async function saveManualOrder(env:Env,o:any){return stateCall(env,'/opsruntime/manual-order','POST',o)}
async function compatOrders(env:Env){const [a,b]=await Promise.all([bookingOrders(env),manualOrders(env)]),m=new Map<string,any>();for(const o of a.concat(b))m.set(String(o.order_number),o);return[...m.values()]}
async function compatOrder(env:Env,n:string){return await manualOrder(env,n)||await bookingOrder(env,n)}
async function orderMeta(env:Env,n:string){const x=await stateCall(env,`/ops3/order-meta?number=${encodeURIComponent(n)}`);return x.meta||emptyMeta(n)}
async function allMetas(env:Env){const x=await stateCall(env,'/ops3/order-metas');return x.metas||[]}
async function saveMeta(env:Env,meta:any){return stateCall(env,'/ops3/order-meta','POST',meta)}
function emptyMeta(n:string){return{order_number:n,assigned:[],accepted:{},confirmed:{},started:{},checklist:[],internal_note:'',audit:[],verified_at:0,lead_id:0,updated_at:''}}
function leadIdOf(meta:any){const explicit=positiveInt(meta?.lead_id);if(explicit)return explicit;const a=Array.isArray(meta?.assigned)?meta.assigned:[],lead=a.find((x:any)=>x.is_lead);if(lead)return positiveInt(lead.id);return a.length===1?positiveInt(a[0].id):0}
function checklistFor(o:any){const base=['Прихожая','Кухня','Санузел','Комнаты'],text=`${o?.service_name||''} ${(o?.addon_names||[]).join(' ')}`.toLowerCase();if(text.includes('окн'))base.push('Окна');if(text.includes('холод'))base.push('Холодильник');if(text.includes('балкон'))base.push('Балкон');base.push('Финальная проверка');return base.map(label=>({label,done:false}))}
function orderPrioritySort(a:any,b:any){const aa=!['COMPLETED','CANCELLED'].includes(String(a?.status||'')),bb=!['COMPLETED','CANCELLED'].includes(String(b?.status||''));if(aa!==bb)return aa?-1:1;const ka=`${a?.date||'9999-99-99'} ${a?.time||'99:99'}`,kb=`${b?.date||'9999-99-99'} ${b?.time||'99:99'}`;return aa?ka.localeCompare(kb):kb.localeCompare(ka)}
function addressOf(o:any){return[o?.city,o?.address,o?.apartment?`кв./офис ${o.apartment}`:''].filter(Boolean).join(', ')||'Адрес не указан'}
function payoutMethod(p:any){return[clean(p?.bank,80),clean(p?.sbp_phone,40)?`СБП ${clean(p?.sbp_phone,40)}`:'',clean(p?.card_last4,4)?`•••• ${clean(p?.card_last4,4)}`:''].filter(Boolean).join(' · ')}
async function notifyAdmins(env:Env,text:string,origin=WORKER_ORIGIN){await Promise.all(adminIds(env).map(id=>sendTg(env,Number(id),text,origin,'Открыть STAFF')))}
function adminIds(env:Env){return String((env as any).ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)}
async function sendTg(env:Env,id:number,text:string,origin=WORKER_ORIGIN,label='Открыть STAFF'){const token=String((env as any).TELEGRAM_BOT_TOKEN||'');if(!token||!id)return null;const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:id,text,parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:label,web_app:{url:`${origin}/staff`}}]]}})});const z:any=await r.json().catch(()=>({}));if(!r.ok||!z.ok)throw Error(z.description||'Telegram API error');return z.result}
async function stateCall(env:Env,path:string,method='GET',body?:any){const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id),r=await stub.fetch('https://state.local'+path,{method,headers:body===undefined?undefined:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return await r.json().catch(()=>({}))}
function jsonHeaders(h:Headers){const out=new Headers(h);out.set('content-type','application/json');return out}
function addAudit(a:any,item:any){const x=Array.isArray(a)?[...a]:[];x.push(item);return x.slice(-150)}
function money(v:any){return new Intl.NumberFormat('ru-RU').format(Math.round(Number(v||0)))+' ₽'}
function positiveInt(v:any){const n=Number(v);return Number.isInteger(n)&&n>0?n:0}function clean(v:any,n=500){return String(v??'').trim().slice(0,n)}function esc(v:any){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]||c))}async function readBody(req:Request){try{return await req.json()}catch{return{}}}function J(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}function html(s:string){return new Response(s,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})}
