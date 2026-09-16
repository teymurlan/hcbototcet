import current, { AppState as CurrentAppState } from './staff-current';
import type { Env } from './staff-current';
import { STAFF_OPERATIONS_APP } from './staff-operations-ui';

export type { Env } from './staff-current';

const BUILD = 'staff-operations-parallel-reports-2026-09-16-a';
const STORE_NAME = 'house-cleaning-app-v1';
const MIN_MEDIA = 2;
const MAX_MEDIA = 20;
const MAX_FILE = 20 * 1024 * 1024;

type TgUser = { id:number; first_name?:string; last_name?:string; username?:string };
type MediaItem = { id:string; clientId?:string; type:'photo'|'video'; fileId:string; name:string; size:number; addedAt:number; transport?:string };

type AuthState = { ok:boolean; admin:boolean; userId:number; data:any; response:Response };

export class AppState extends CurrentAppState {
  async fetch(req:Request):Promise<Response> {
    const u = new URL(req.url);

    if (u.pathname === '/opsmulti/jobs' && req.method === 'GET') {
      const id = positiveInt(u.searchParams.get('id'));
      if (!id) return J({ok:false,error:'Некорректный сотрудник'},400);
      await this.migrateLegacy(id);
      const jobs = await this.jobsFor(id);
      await this.promoteLegacy(id,jobs);
      return J({ok:true,jobs});
    }

    if (u.pathname === '/opsmulti/jobs-all' && req.method === 'GET') {
      const rows = await this.state.storage.list<any>({prefix:'opsmulti:job:'});
      const jobs = [...rows.values()].sort((a,b)=>Number(b.updatedAt||b.finishedAt||b.startedAt||0)-Number(a.updatedAt||a.finishedAt||a.startedAt||0));
      return J({ok:true,jobs:jobs.slice(0,1000)});
    }

    if (u.pathname === '/opsmulti/job' && req.method === 'GET') {
      const id = positiveInt(u.searchParams.get('id')), order = clean(u.searchParams.get('order'),120);
      if (!id || !order) return J({ok:false,error:'Не указан заказ'},400);
      await this.migrateLegacy(id);
      return J({ok:true,job:await this.state.storage.get<any>(multiJobKey(id,order)) || null});
    }

    if (u.pathname === '/opsmulti/job-by-id' && req.method === 'GET') {
      const jobId = clean(u.searchParams.get('job'),180);
      if (!jobId) return J({ok:false,error:'Не указан фотоотчёт'},400);
      const rows = await this.state.storage.list<any>({prefix:'opsmulti:job:'});
      const job = [...rows.values()].find(v=>String(v?.id||'')===jobId) || null;
      return J({ok:true,job});
    }

    if (u.pathname === '/opsmulti/job' && req.method === 'POST') {
      const x:any = await readBody(req), job = x?.job, id = positiveInt(job?.userId), order = clean(job?.booking_order_number,120);
      if (!id || !order || !job?.id) return J({ok:false,error:'Некорректный фотоотчёт'},400);
      const next = {...job, booking_order_number:order, userId:id, multi_report:true, updatedAt:Date.now()};
      await this.state.storage.put(multiJobKey(id,order),next);
      const legacy:any = await this.state.storage.get(`job:${id}`);
      if (!legacy || legacy.stage === 'done' || String(legacy.booking_order_number||'') === order) await this.state.storage.put(`job:${id}`,next);
      return J({ok:true,job:next});
    }

    if (u.pathname === '/opsmulti/drafts' && req.method === 'GET') {
      const id = positiveInt(u.searchParams.get('id')), order = clean(u.searchParams.get('order'),120), stage = clean(u.searchParams.get('stage'),20);
      if (!id || !order || !['before','after'].includes(stage)) return J({ok:false,error:'Некорректный этап'},400);
      await this.migrateLegacy(id);
      const files = await this.state.storage.get<MediaItem[]>(multiDraftKey(id,order,stage)) || [];
      return J({ok:true,files});
    }

    if (u.pathname === '/opsmulti/draft' && req.method === 'POST') {
      const x:any = await readBody(req), id = positiveInt(x.userId), order = clean(x.order_number,120), stage = clean(x.stage,20), action = clean(x.action,20);
      if (!id || !order || !['before','after'].includes(stage)) return J({ok:false,error:'Некорректный этап'},400);
      const key = multiDraftKey(id,order,stage), files = await this.state.storage.get<MediaItem[]>(key) || [];
      if (action === 'add') {
        const item = x.item as MediaItem;
        if (!item?.id || !item?.fileId) return J({ok:false,error:'Некорректный файл'},400);
        if (item.clientId) {
          const found = files.find(v=>v.clientId === item.clientId);
          if (found) return J({ok:true,file:found,deduplicated:true,count:files.length});
        }
        if (files.length >= MAX_MEDIA) return J({ok:false,error:`Максимум ${MAX_MEDIA} файлов на этап`},400);
        files.push(item); await this.state.storage.put(key,files);
        return J({ok:true,file:item,count:files.length});
      }
      if (action === 'delete') {
        const next = files.filter(v=>v.id !== String(x.id||'')); await this.state.storage.put(key,next); return J({ok:true,count:next.length});
      }
      if (action === 'clear') { await this.state.storage.delete(key); return J({ok:true,count:0}); }
      return J({ok:false,error:'Неизвестное действие'},400);
    }

    if (u.pathname === '/opsmulti/stage' && req.method === 'POST') {
      const x:any = await readBody(req), job=x?.job, id=positiveInt(job?.userId), order=clean(job?.booking_order_number,120), stage=clean(x.stage,20), files:Array.isArray(x.files)?x.files:[];
      if (!id || !order || !job?.id || !['before','after'].includes(stage)) return J({ok:false,error:'Некорректный фотоотчёт'},400);
      const next = {...job, multi_report:true, updatedAt:Date.now()};
      await this.state.storage.put(`archive:${job.id}:${stage}`,files);
      await this.state.storage.put(multiJobKey(id,order),next);
      await this.state.storage.delete(multiDraftKey(id,order,stage));

      const eventKey = `events:${job.id}`, events:any[] = await this.state.storage.get<any[]>(eventKey) || [];
      const eventType = stage === 'before' ? 'before' : 'done';
      if (!events.some(v=>v.type===eventType && Number(v.at)===Number(stage==='before'?job.beforeSentAt:job.finishedAt))) {
        events.push({type:eventType,label:stage==='before'?'Отправил фото/видео ДО':'Завершил фотоотчёт',at:Number(stage==='before'?job.beforeSentAt:job.finishedAt)||Date.now(),userId:id,meta:stage==='after'?{duration_ms:Math.max(0,Number(job.finishedAt||0)-Number(job.startedAt||0))}:undefined});
        await this.state.storage.put(eventKey,events.slice(-160));
      }

      if (stage === 'after') {
        const ts=String(Number(job.finishedAt||Date.now())).padStart(13,'0'), historyKey=`history:${id}:${ts}:${String(job.reportId||job.id)}`;
        await this.state.storage.put(historyKey,next);
        const history = await this.state.storage.list<any>({prefix:`history:${id}:`});
        if (history.size > 80) {
          const remove=[...history.entries()].sort((a,b)=>Number(a[1]?.finishedAt||0)-Number(b[1]?.finishedAt||0)).slice(0,history.size-60).map(v=>v[0]);
          if (remove.length) await this.state.storage.delete(remove);
        }
      }

      const legacy:any = await this.state.storage.get(`job:${id}`);
      if (!legacy || legacy.stage === 'done' || String(legacy.booking_order_number||'') === order) await this.state.storage.put(`job:${id}`,next);
      return J({ok:true,job:next});
    }

    return super.fetch(req);
  }

  private async jobsFor(id:number) {
    const rows = await this.state.storage.list<any>({prefix:`opsmulti:job:${id}:`});
    return [...rows.values()].sort((a,b)=>Number(b.updatedAt||b.finishedAt||b.startedAt||0)-Number(a.updatedAt||a.finishedAt||a.startedAt||0));
  }

  private async migrateLegacy(id:number) {
    const legacy:any = await this.state.storage.get(`job:${id}`);
    const order = clean(legacy?.booking_order_number,120);
    if (!legacy || legacy.stage === 'done' || !order) return;
    const key = multiJobKey(id,order);
    if (!await this.state.storage.get(key)) await this.state.storage.put(key,{...legacy,multi_report:true,updatedAt:Date.now()});
    for (const stage of ['before','after']) {
      const dst = multiDraftKey(id,order,stage), existing = await this.state.storage.get<MediaItem[]>(dst);
      if (existing?.length) continue;
      const old = await this.state.storage.get<MediaItem[]>(`draft:${id}:${stage}`) || [];
      if (old.length) await this.state.storage.put(dst,old);
    }
  }

  private async promoteLegacy(id:number,jobs:any[]) {
    const legacy:any = await this.state.storage.get(`job:${id}`);
    if (legacy && legacy.stage !== 'done') return;
    const active = jobs.filter(v=>v && v.stage !== 'done').sort((a,b)=>Number(a.startedAt||0)-Number(b.startedAt||0));
    if (active[0]) await this.state.storage.put(`job:${id}`,active[0]);
  }
}

export default {
  async fetch(req:Request, env:Env, ctx?:ExecutionContext):Promise<Response> {
    const u = new URL(req.url);
    if (req.method === 'GET' && u.pathname === '/__hc_staff_version') return J({ok:true,build:BUILD,staff:true,parallel_reports:true,order_scoped_drafts:true,idempotent_uploads:true});
    if (req.method === 'GET' && ['/staff','/staff/','/admin'].includes(u.pathname)) return html(STAFF_OPERATIONS_APP);

    if (req.method === 'GET' && u.pathname === '/api/state') return stateOperations(req,env,ctx);
    if (req.method === 'GET' && u.pathname === '/api/admin/jobs') return adminJobsOperations(req,env,ctx);
    if (req.method === 'GET' && u.pathname === '/api/admin/job') return adminJobOperations(req,env,ctx);

    if (req.method === 'POST' && u.pathname === '/api/media/draft') return uploadMediaOperations(req,env,ctx);
    if (req.method === 'GET' && u.pathname === '/api/media/drafts') return listDraftsOperations(req,env,ctx);
    if (req.method === 'POST' && u.pathname === '/api/media/draft/delete') return deleteDraftOperations(req,env,ctx);
    if (req.method === 'GET' && u.pathname === '/api/staff/draft-count') return draftCountOperations(req,env,ctx);
    if (req.method === 'POST' && u.pathname === '/api/before') return submitBeforeOperations(req,env,ctx);
    if (req.method === 'POST' && u.pathname === '/api/after') return submitAfterOperations(req,env,ctx);
    if (req.method === 'POST' && u.pathname === '/api/staff/order/action') return actionOperations(req,env,ctx);
    if (req.method === 'POST' && u.pathname === '/api/staff/report/review') return reportReviewOperations(req,env,ctx);

    return current.fetch(req,env,ctx as any);
  },
  scheduled(controller:any, env:Env, ctx:ExecutionContext):Promise<void> {
    return current.scheduled(controller,env,ctx);
  }
};

async function stateOperations(req:Request,env:Env,ctx?:ExecutionContext) {
  const auth = await baseAuth(req,env,ctx); if (!auth.ok) return auth.response;
  if (!auth.userId) return J(auth.data);
  const jobs = await multiJobs(env,auth.userId), active = jobs.filter((j:any)=>j.stage!=='done');
  const selected = active[0] || jobs[0] || auth.data?.job || null;
  return J({...auth.data,job:selected,jobs,active_jobs:active,parallel_reports:true});
}

async function adminJobsOperations(req:Request,env:Env,ctx?:ExecutionContext) {
  const r=await current.fetch(req,env,ctx as any); if (!r.ok) return r;
  const data:any=await r.json().catch(()=>({jobs:[]})), multi=(await stateCall(env,'/opsmulti/jobs-all').catch(()=>({jobs:[]}))).jobs||[];
  const map=new Map<string,any>();
  for (const j of data.jobs||[]) if (j?.id) map.set(String(j.id),j);
  for (const j of multi) if (j?.id && (j.stage!=='done' || !map.has(String(j.id)))) map.set(String(j.id),enrichDuration(j));
  const jobs=[...map.values()].sort((a,b)=>Number(b.finishedAt||b.startedAt||0)-Number(a.finishedAt||a.startedAt||0));
  const stats={...(data.stats||{}),total:jobs.length,active:jobs.filter(j=>j.stage!=='done').length,done:jobs.filter(j=>j.stage==='done').length,review:jobs.filter(j=>j.stage==='done'&&!j.staff_verified).length};
  return J({...data,jobs,stats});
}

async function adminJobOperations(req:Request,env:Env,ctx?:ExecutionContext) {
  const r=await current.fetch(req,env,ctx as any); if (r.ok) return r;
  if (r.status !== 404) return r;
  const auth=await baseAuth(req,env,ctx); if (!auth.ok || !auth.admin) return auth.response;
  const id=clean(new URL(req.url).searchParams.get('id'),180); if (!id) return J({ok:false,error:'Фотоотчёт не найден'},404);
  const found=await stateCall(env,`/opsmulti/job-by-id?job=${encodeURIComponent(id)}`).catch(()=>({job:null})), job=found.job;
  if (!job) return r;
  const [before,after,events,reviewData]=await Promise.all([
    stateCall(env,`/archive?job=${encodeURIComponent(id)}&stage=before`).catch(()=>({files:[]})),
    stateCall(env,`/archive?job=${encodeURIComponent(id)}&stage=after`).catch(()=>({files:[]})),
    stateCall(env,`/events?job=${encodeURIComponent(id)}`).catch(()=>({events:[]})),
    stateCall(env,`/opsruntime/report-review?job=${encodeURIComponent(id)}`).catch(()=>({review:null}))
  ]);
  const n=clean(job.booking_order_number,120), meta=n?await orderMeta(env,n):null, review=reviewData.review||null;
  return J({ok:true,job:{...enrichDuration(job),staff_verified:!!meta?.verified_at||review?.status==='accepted',staff_review_status:meta?.verified_at?'accepted':review?.status||'',staff_redo_reason:review?.reason||''},media:{before:before.files||[],after:after.files||[]},events:events.events||[],note:'',review:review?.status==='redo'});
}

async function actionOperations(req:Request,env:Env,ctx?:ExecutionContext) {
  const copy=req.clone(), body:any=await readBody(copy), action=clean(body.action,30);
  if (action !== 'start') return current.fetch(req,env,ctx as any);

  const auth=await baseAuth(copy,env,ctx); if (!auth.ok) return auth.response;
  if (auth.admin || !auth.userId) return J({ok:false,error:'Действие предназначено для сотрудника'},403);
  const n=clean(body.order_number,120); if (!n) return J({ok:false,error:'Заказ не указан'},400);
  const order=await compatOrder(env,n); if (!order) return J({ok:false,error:'Заказ не найден'},404);
  const meta=await orderMeta(env,n), assigned:any[]=meta.assigned||[];
  if (!assigned.some(a=>Number(a.id)===auth.userId)) return J({ok:false,error:'Вы не назначены на этот заказ'},403);
  if (['CANCELLED','COMPLETED'].includes(String(order.status||'')) || Number(meta.verified_at||0)>0) return J({ok:false,error:'Заказ уже закрыт'},409);
  const leadId=leadIdOf(meta);
  if (assigned.length>1 && auth.userId!==leadId) return J({ok:false,error:`Начать уборку и вести фотоотчёт может только старший клинер: ${assigned.find(a=>Number(a.id)===leadId)?.name||'назначенный сотрудник'}`},403);
  if (!meta.accepted?.[auth.userId]) return J({ok:false,error:'Сначала примите задание'},409);
  if (!meta.confirmed?.[auth.userId]) return J({ok:false,error:'Сначала подтвердите выход'},409);

  const employeeData=await stateCall(env,`/ops3/employee?id=${auth.userId}`).catch(()=>({employee:null})), employee=employeeData.employee||auth.data?.employee||{};
  if (employee.admitted===false) return J({ok:false,error:'Нет допуска к заказам'},403);

  const existing=await multiJob(env,auth.userId,n);
  if (existing && existing.stage!=='done') {
    await markOrderInProgress(env,order);
    if (!Number(meta.started?.[auth.userId])) { const now=Number(existing.startedAt||Date.now()); meta.started={...(meta.started||{}),[auth.userId]:now}; meta.report_started_at=Number(meta.report_started_at||now); await saveMeta(env,{...meta,updated_at:new Date().toISOString()}); }
    return J({ok:true,meta,job:existing,already_started:true,parallel_reports:true});
  }
  if (existing?.stage==='done' && !Number(meta.redo_requested_at||0)) return J({ok:false,error:'Фотоотчёт по этому заказу уже отправлен руководителю'},409);

  const now=Date.now(), address=addressOf(order);
  meta.started={...(meta.started||{}),[auth.userId]:now};
  if (!Array.isArray(meta.checklist)||!meta.checklist.length) meta.checklist=checklistFor(order);
  meta.report_started_at=now; meta.report_finished_at=0; meta.report_duration_ms=0; meta.redo_requested_at=0; meta.redo_reason='';
  meta.audit=addAudit(meta.audit,{type:'report_started',label:`${employee.name||'Сотрудник'} начал уборку и фотоотчёт`,at:now,user_id:auth.userId}); meta.updated_at=new Date().toISOString();

  const job={id:`ORDER-${n}-${auth.userId}`,booking_order_number:n,userId:auth.userId,employeeName:employee.name||assigned.find(a=>Number(a.id)===auth.userId)?.name||'Сотрудник',employeeUsername:employee.username||'',customer:order.customer_name||'Клиент',address,type:order.service_name||'Уборка',stage:'started',startedAt:now,start_location:{lat:0,lon:0,accuracy:0},startPlace:address,appUrl:`${new URL(req.url).origin}/staff`,multi_report:true,updatedAt:now};

  await markOrderInProgress(env,order);
  await saveMeta(env,meta);
  const saved=await stateCall(env,'/opsmulti/job','POST',{job}); if (!saved?.ok) return J({ok:false,error:'Не удалось начать фотоотчёт'},500);
  ctx?.waitUntil?.(notifyAdmins(env,`▶️ <b>${esc(job.employeeName)}</b> начал уборку\n\n<b>${esc(n)}</b> · ${esc(order.service_name||'Уборка')}\n📅 ${esc(order.date||'')} · ${esc(order.time||'')}\n📍 ${esc(address)}`,new URL(req.url).origin).then(()=>undefined));
  return J({ok:true,meta,job:saved.job||job,parallel_reports:true});
}

async function uploadMediaOperations(req:Request,env:Env,ctx?:ExecutionContext) {
  const auth=await baseAuth(req,env,ctx); if (!auth.ok || !auth.userId) return auth.response;
  let form:FormData; try { form=await req.formData(); } catch { return J({ok:false,error:'Не удалось прочитать файл'},400); }
  const stage=clean(form.get('stage'),20), requested=clean(form.get('order_number'),120), clientId=clean(form.get('client_id'),180);
  if (!['before','after'].includes(stage)) return J({ok:false,error:'Неизвестный этап'},400);
  const selected=await selectJob(env,auth,requested); if (!selected.ok) return selected.response!;
  const job=selected.job!, n=clean(job.booking_order_number,120), guard=await leadGuard(env,auth.userId,job); if (guard) return guard;
  if (stage==='before' && job.stage!=='started') return J({ok:false,error:'Этап Фото ДО уже закрыт'},409);
  if (stage==='after' && job.stage!=='before_sent') return J({ok:false,error:'Сначала отправьте Фото ДО'},409);

  const file=form.get('media'); if (!(file instanceof File)) return J({ok:false,error:'Файл не найден'},400);
  const mediaType=detectMediaType(file); if (!mediaType) return J({ok:false,error:'Разрешены только фото и видео'},400);
  if (file.size<=0 || file.size>MAX_FILE) return J({ok:false,error:'Один файл должен быть не больше 20 МБ'},400);
  const existing=await multiDrafts(env,auth.userId,n,stage);
  if (clientId) { const dup=existing.find((v:any)=>v.clientId===clientId); if (dup) return J({ok:true,file:dup,count:existing.length,deduplicated:true}); }
  if (existing.length>=MAX_MEDIA) return J({ok:false,error:`Максимум ${MAX_MEDIA} файлов на этап`},400);

  let uploaded:{fileId:string;messageId?:number;transport:string};
  try { uploaded=await saveTelegramFile(env,auth.userId,file,mediaType); }
  catch (e:any) { return J({ok:false,error:e?.message||'Не удалось сохранить файл. Проверьте интернет и повторите.'},502); }

  const item:MediaItem={id:crypto.randomUUID(),clientId:clientId||undefined,type:mediaType,fileId:uploaded.fileId,name:clean(file.name,140)||(mediaType==='video'?'video.mp4':'photo.jpg'),size:file.size,addedAt:Date.now(),transport:uploaded.transport};
  const saved=await stateCall(env,'/opsmulti/draft','POST',{action:'add',userId:auth.userId,order_number:n,stage,item});
  if (!saved?.ok) return J(saved||{ok:false,error:'Не удалось сохранить файл'},400);
  if (uploaded.messageId) ctx?.waitUntil?.(tg(env,'deleteMessage',{chat_id:auth.userId,message_id:uploaded.messageId},6000).catch(()=>null).then(()=>undefined));
  return J({ok:true,file:item,count:Number(saved.count||existing.length+1),order_number:n,stage});
}

async function listDraftsOperations(req:Request,env:Env,ctx?:ExecutionContext) {
  const auth=await baseAuth(req,env,ctx); if (!auth.ok || !auth.userId) return auth.response;
  const u=new URL(req.url), stage=clean(u.searchParams.get('stage'),20), requested=clean(u.searchParams.get('order_number'),120);
  if (!['before','after'].includes(stage)) return J({ok:false,error:'Неизвестный этап'},400);
  const selected=await selectJob(env,auth,requested); if (!selected.ok) return selected.response!;
  const n=clean(selected.job?.booking_order_number,120), files=await multiDrafts(env,auth.userId,n,stage);
  return J({ok:true,files:files.map((x:any)=>({id:x.id,type:x.type,name:x.name,size:x.size,addedAt:x.addedAt})),count:files.length,order_number:n});
}

async function deleteDraftOperations(req:Request,env:Env,ctx?:ExecutionContext) {
  const auth=await baseAuth(req,env,ctx); if (!auth.ok || !auth.userId) return auth.response;
  const x:any=await readBody(req), stage=clean(x.stage,20), requested=clean(x.order_number,120), id=clean(x.id,120);
  if (!id || !['before','after'].includes(stage)) return J({ok:false,error:'Некорректные данные'},400);
  const selected=await selectJob(env,auth,requested); if (!selected.ok) return selected.response!;
  const n=clean(selected.job?.booking_order_number,120), guard=await leadGuard(env,auth.userId,selected.job); if (guard) return guard;
  return J(await stateCall(env,'/opsmulti/draft','POST',{action:'delete',userId:auth.userId,order_number:n,stage,id}));
}

async function draftCountOperations(req:Request,env:Env,ctx?:ExecutionContext) {
  const auth=await baseAuth(req,env,ctx); if (!auth.ok || !auth.userId) return auth.response;
  const u=new URL(req.url), stage=clean(u.searchParams.get('stage'),20), requested=clean(u.searchParams.get('order_number'),120);
  if (!['before','after'].includes(stage)) return J({ok:false,error:'Неизвестный этап'},400);
  const selected=await selectJob(env,auth,requested); if (!selected.ok) return selected.response!;
  const n=clean(selected.job?.booking_order_number,120), files=await multiDrafts(env,auth.userId,n,stage);
  return J({ok:true,stage,count:files.length,order_number:n});
}

async function submitBeforeOperations(req:Request,env:Env,ctx?:ExecutionContext) {
  const auth=await baseAuth(req,env,ctx); if (!auth.ok || !auth.userId) return auth.response;
  const body:any=await readBody(req), selected=await selectJob(env,auth,clean(body.order_number,120)); if (!selected.ok) return selected.response!;
  const job:any=selected.job, n=clean(job.booking_order_number,120), guard=await leadGuard(env,auth.userId,job); if (guard) return guard;
  if (job.stage==='before_sent') return J({ok:true,job,already_sent:true});
  if (job.stage!=='started') return J({ok:false,error:'Этап Фото ДО сейчас недоступен'},409);
  const files=await multiDrafts(env,auth.userId,n,'before'); if (files.length<MIN_MEDIA) return J({ok:false,error:`Добавьте минимум ${MIN_MEDIA} фото или видео ДО`},400);

  const now=Date.now(), next={...job,stage:'before_sent',beforeSentAt:now,beforeCount:files.length,defectNote:clean(body.defect_note,600),reminded:false,updatedAt:now};
  const saved=await stateCall(env,'/opsmulti/stage','POST',{stage:'before',job:next,files}); if (!saved?.ok) return J({ok:false,error:'Не удалось сохранить Фото ДО'},500);
  const meta=await orderMeta(env,n); meta.report_started_at=Number(job.startedAt||now); meta.before_sent_at=now; meta.before_count=files.length; meta.updated_at=new Date().toISOString(); meta.audit=addAudit(meta.audit,{type:'before_sent',label:`Фото ДО сохранены: ${files.length}`,at:now,user_id:auth.userId}); await saveMeta(env,meta);

  const origin=new URL(req.url).origin, launch=req.headers.get('X-App-Launch-Token')||'';
  ctx?.waitUntil?.(sendPersistent(env,auth.userId,`✅ <b>Фото ДО сохранены</b>\n\nЗаказ: <b>${esc(n)}</b>\nНачало уборки: <b>${fmtTime(Number(job.startedAt||now))}</b>\nМатериалов: <b>${files.length}</b>\n\nПродолжайте уборку. Этот фотоотчёт сохранён отдельно от других активных заказов.`,origin,launch,false).then(()=>undefined));
  return J({ok:true,job:saved.job||next,order_number:n,duration_text:durText(Math.max(0,now-Number(job.startedAt||now)))});
}

async function submitAfterOperations(req:Request,env:Env,ctx?:ExecutionContext) {
  const auth=await baseAuth(req,env,ctx); if (!auth.ok || !auth.userId) return auth.response;
  const body:any=await readBody(req), selected=await selectJob(env,auth,clean(body.order_number,120)); if (!selected.ok) return selected.response!;
  const job:any=selected.job, n=clean(job.booking_order_number,120), guard=await leadGuard(env,auth.userId,job); if (guard) return guard;
  if (job.stage==='done') return J({ok:true,job,report_id:job.reportId||'',duration_text:durText(Math.max(0,Number(job.finishedAt||Date.now())-Number(job.startedAt||Date.now()))),already_done:true});
  if (job.stage!=='before_sent') return J({ok:false,error:'Сначала завершите этап Фото ДО'},409);
  const meta=await orderMeta(env,n); if (Array.isArray(meta.checklist)&&meta.checklist.some((v:any)=>!v.done)) return J({ok:false,error:'Сначала завершите весь чек-лист уборки'},409);
  const files=await multiDrafts(env,auth.userId,n,'after'); if (files.length<MIN_MEDIA) return J({ok:false,error:`Добавьте минимум ${MIN_MEDIA} фото или видео ПОСЛЕ`},400);

  const now=Date.now(), started=Number(job.startedAt||now), duration=Math.max(0,now-started), reportId='HC-'+new Date(now).toISOString().slice(2,10).replace(/-/g,'')+'-'+String(auth.userId).slice(-4)+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
  const next={...job,stage:'done',finishedAt:now,afterCount:files.length,reportId,end_location:{lat:0,lon:0,accuracy:0},endPlace:job.address||'Адрес объекта',updatedAt:now};
  const saved=await stateCall(env,'/opsmulti/stage','POST',{stage:'after',job:next,files}); if (!saved?.ok) return J({ok:false,error:'Не удалось завершить фотоотчёт'},500);

  meta.report_started_at=started; meta.report_finished_at=now; meta.report_duration_ms=duration; meta.after_count=files.length; meta.report_ready_notified_at=now; meta.updated_at=new Date().toISOString(); meta.audit=addAudit(meta.audit,{type:'report_ready',label:`Фотоотчёт готов к проверке · ${durText(duration)}`,at:now,user_id:auth.userId}); await saveMeta(env,meta);

  const origin=new URL(req.url).origin, launch=req.headers.get('X-App-Launch-Token')||'';
  const adminText=`📸 <b>Фотоотчёт готов к проверке</b>\n\nЗаказ: <b>${esc(n)}</b>\nКлинер: <b>${esc(job.employeeName||'Сотрудник')}</b>\nНачало: <b>${fmtTime(started)}</b>\nЗавершение: <b>${fmtTime(now)}</b>\nВремя уборки: <b>${durText(duration)}</b>\nФото: ДО ${Number(job.beforeCount||0)} · ПОСЛЕ ${files.length}`;
  ctx?.waitUntil?.(Promise.all(adminIds(env).map(id=>sendPersistent(env,Number(id),adminText,origin,'',true))).then(()=>undefined));
  ctx?.waitUntil?.(sendPersistent(env,auth.userId,`✅ <b>Фотоотчёт отправлен</b>\n\nЗаказ: <b>${esc(n)}</b>\nНачало: <b>${fmtTime(started)}</b>\nВремя уборки: <b>${durText(duration)}</b>\n\nМожно открыть другой назначенный заказ и вести его фотоотчёт независимо.`,origin,launch,false).then(()=>undefined));
  return J({ok:true,job:saved.job||next,report_id:reportId,order_number:n,duration_text:durText(duration)});
}

async function reportReviewOperations(req:Request,env:Env,ctx?:ExecutionContext) {
  const copy=req.clone(), body:any=await readBody(copy), response=await current.fetch(req,env,ctx as any);
  if (!response.ok) return response;
  const data:any=await response.clone().json().catch(()=>({}));
  if (clean(body.action,20)==='redo') {
    const n=clean(data.booking_order_number,120), jobId=clean(body.job_id,180);
    const found=jobId?await stateCall(env,`/opsmulti/job-by-id?job=${encodeURIComponent(jobId)}`).catch(()=>({job:null})):{job:null};
    if (found.job && (!n || String(found.job.booking_order_number)===n)) {
      const next={...found.job,stage:'before_sent',finishedAt:0,afterCount:0,reportId:'',redoReason:clean(body.reason,600),redoRequestedAt:Date.now(),updatedAt:Date.now()};
      await stateCall(env,'/opsmulti/job','POST',{job:next});
      const meta=await orderMeta(env,clean(next.booking_order_number,120)); meta.report_finished_at=0; meta.report_duration_ms=0; meta.after_count=0; meta.report_ready_notified_at=0; meta.updated_at=new Date().toISOString(); await saveMeta(env,meta);
    }
  }
  return response;
}

async function selectJob(env:Env,auth:AuthState,requested:string):Promise<{ok:boolean;job?:any;response?:Response}> {
  if (requested) {
    const job=await multiJob(env,auth.userId,requested);
    if (job) return {ok:true,job};
    const legacy=auth.data?.job;
    if (legacy && String(legacy.booking_order_number||'')===requested && legacy.stage!=='done') { await stateCall(env,'/opsmulti/job','POST',{job:legacy}); return {ok:true,job:legacy}; }
    return {ok:false,response:J({ok:false,error:'Активный фотоотчёт по этому заказу не найден. Откройте задание заново.'},404)};
  }
  const jobs=await multiJobs(env,auth.userId), active=jobs.filter((j:any)=>j.stage!=='done');
  if (active.length===1) return {ok:true,job:active[0]};
  if (!active.length && auth.data?.job && auth.data.job.stage!=='done') return {ok:true,job:auth.data.job};
  return {ok:false,response:J({ok:false,error:'У вас несколько активных фотоотчётов. Откройте нужный заказ и повторите действие.'},409)};
}

async function leadGuard(env:Env,userId:number,job:any):Promise<Response|null> {
  const n=clean(job?.booking_order_number,120); if (!n) return null;
  const meta=await orderMeta(env,n), assigned:any[]=meta.assigned||[];
  if (!assigned.some(a=>Number(a.id)===userId)) return J({ok:false,error:'Вы больше не назначены на этот заказ'},403);
  if (assigned.length<2) return null;
  const lead=leadIdOf(meta); if (lead && lead!==userId) return J({ok:false,error:'Фотоотчёт ведёт только старший клинер'},403);
  return null;
}

async function baseAuth(req:Request,env:Env,ctx?:ExecutionContext):Promise<AuthState> {
  const u=new URL(req.url); u.pathname='/api/state'; u.search='';
  const r=await current.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env,ctx as any);
  let data:any; try { data=await r.clone().json(); } catch { return {ok:false,admin:false,userId:0,data:null,response:r}; }
  const userId=positiveInt(data?.employee?.id||data?.user?.id||data?.admin_id||userIdFromHeaders(req)), ok=r.ok&&data?.ok!==false&&(!!data?.admin||!!userId);
  return {ok,admin:!!data?.admin,userId,data,response:ok?J(data):r};
}

async function multiJobs(env:Env,id:number){const x=await stateCall(env,`/opsmulti/jobs?id=${id}`);return Array.isArray(x.jobs)?x.jobs:[]}
async function multiJob(env:Env,id:number,n:string){const x=await stateCall(env,`/opsmulti/job?id=${id}&order=${encodeURIComponent(n)}`).catch(()=>({job:null}));return x.job||null}
async function multiDrafts(env:Env,id:number,n:string,stage:string){const x=await stateCall(env,`/opsmulti/drafts?id=${id}&order=${encodeURIComponent(n)}&stage=${encodeURIComponent(stage)}`).catch(()=>({files:[]}));return Array.isArray(x.files)?x.files:[]}

async function compatOrder(env:Env,n:string){return await manualOrder(env,n)||await bookingOrder(env,n)}
async function manualOrder(env:Env,n:string){const x=await stateCall(env,`/opsruntime/manual-order?number=${encodeURIComponent(n)}`).catch(()=>({order:null}));return x.order||null}
async function saveManualOrder(env:Env,o:any){return stateCall(env,'/opsruntime/manual-order','POST',o)}
function bookingStub(env:Env){return (env as any).BOOKING_STORE?.get((env as any).BOOKING_STORE.idFromName(STORE_NAME))}
async function bookingOrders(env:Env){const r=await bookingStub(env)?.fetch('https://booking.internal/orders');if(!r?.ok)return[];const x:any=await r.json().catch(()=>({}));return Array.isArray(x.orders)?x.orders:[]}
async function bookingOrder(env:Env,n:string){return (await bookingOrders(env)).find((o:any)=>String(o.order_number)===n)||null}
async function putBookingOrder(env:Env,o:any){const r=await bookingStub(env)?.fetch('https://booking.internal/order',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(o)});if(!r?.ok)throw Error('Не удалось обновить заказ в клиентской системе');return o}
async function markOrderInProgress(env:Env,order:any){if(String(order.status||'')==='IN_PROGRESS')return;const next={...order,status:'IN_PROGRESS',updated_at:new Date().toISOString()};if(order.is_manual)await saveManualOrder(env,next);else await putBookingOrder(env,next)}

async function orderMeta(env:Env,n:string){const x=await stateCall(env,`/ops3/order-meta?number=${encodeURIComponent(n)}`);return x.meta||{order_number:n,assigned:[],accepted:{},confirmed:{},started:{},checklist:[],audit:[],verified_at:0,lead_id:0,updated_at:''}}
async function saveMeta(env:Env,meta:any){return stateCall(env,'/ops3/order-meta','POST',meta)}
function leadIdOf(meta:any){const explicit=positiveInt(meta?.lead_id);if(explicit)return explicit;const a=Array.isArray(meta?.assigned)?meta.assigned:[],lead=a.find((x:any)=>x.is_lead);if(lead)return positiveInt(lead.id);return a.length===1?positiveInt(a[0].id):0}
function checklistFor(o:any){const base=['Прихожая','Кухня','Санузел','Комнаты'],text=`${o?.service_name||''} ${(o?.addon_names||[]).join(' ')}`.toLowerCase();if(text.includes('окн'))base.push('Окна');if(text.includes('холод'))base.push('Холодильник');if(text.includes('балкон'))base.push('Балкон');base.push('Финальная проверка');return base.map(label=>({label,done:false}))}

async function saveTelegramFile(env:Env,chatId:number,file:File,type:'photo'|'video') {
  const primary=type==='video'?'sendVideo':'sendPhoto', field=type==='video'?'video':'photo';
  try { return await uploadTelegram(env,primary,field,chatId,file,type); }
  catch { return uploadTelegram(env,'sendDocument','document',chatId,file,type); }
}

async function uploadTelegram(env:Env,method:string,field:string,chatId:number,file:File,type:'photo'|'video') {
  const token=String((env as any).TELEGRAM_BOT_TOKEN||''); if (!token) throw Error('Telegram-хранилище не настроено');
  const fd=new FormData(); fd.append('chat_id',String(chatId)); fd.append(field,file,file.name||(type==='video'?'video.mp4':'photo.jpg')); fd.append('disable_notification','true');
  const c=new AbortController(), timer=setTimeout(()=>c.abort(),25000);
  try {
    const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',body:fd,signal:c.signal}), x:any=await r.json().catch(()=>({}));
    if (!r.ok||!x.ok) throw Error(x.description||'Telegram не смог сохранить файл');
    const msg=x.result||{}, fileId=msg?.video?.file_id || msg?.photo?.[msg.photo?.length-1]?.file_id || msg?.document?.file_id;
    if (!fileId) throw Error('Не удалось получить идентификатор файла');
    return {fileId,messageId:positiveInt(msg.message_id)||undefined,transport:method};
  } finally { clearTimeout(timer); }
}

function detectMediaType(file:File):'photo'|'video'|null {const t=String(file.type||'').toLowerCase(),n=String(file.name||'').toLowerCase();if(t.startsWith('video/')||/\.(mp4|mov|m4v|webm)$/.test(n))return'video';if(t.startsWith('image/')||!t&&/\.(jpg|jpeg|png|webp|heic|heif)$/.test(n))return'photo';return null}

async function notifyAdmins(env:Env,text:string,origin:string){await Promise.all(adminIds(env).map(id=>sendPersistent(env,Number(id),text,origin,'',true).catch(()=>null)))}
async function sendPersistent(env:Env,chatId:number,text:string,origin:string,launch:string,admin:boolean){const url=`${origin}/staff${launch?`?launch=${encodeURIComponent(launch)}`:''}`,label=admin?'📲 Открыть кабинет руководителя':'📲 Открыть HOUSE CLEANING STAFF';return tg(env,'sendMessage',{chat_id:chatId,text,parse_mode:'HTML',reply_markup:{keyboard:[[{text:label,web_app:{url}}]],resize_keyboard:true,is_persistent:true,input_field_placeholder:'HOUSE CLEANING STAFF'}},9000)}
async function tg(env:Env,method:string,body:any,timeout=12000){const token=String((env as any).TELEGRAM_BOT_TOKEN||'');if(!token)return null;const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:c.signal}),x:any=await r.json().catch(()=>({}));if(!r.ok||!x.ok)throw Error(x.description||'Telegram API error');return x.result}finally{clearTimeout(timer)}}

async function stateCall(env:Env,path:string,method='GET',body?:any){const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id),init:RequestInit={method,headers:body===undefined?undefined:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)};const r=await stub.fetch('https://state.local'+path,init);return await r.json().catch(()=>({}))}
function multiJobKey(id:number,order:string){return `opsmulti:job:${id}:${encodeURIComponent(order)}`}
function multiDraftKey(id:number,order:string,stage:string){return `opsmulti:draft:${id}:${encodeURIComponent(order)}:${stage}`}
function addAudit(a:any,item:any){const x=Array.isArray(a)?[...a]:[];x.push(item);return x.slice(-180)}
function addressOf(o:any){return[o?.city,o?.address,o?.apartment?`кв./офис ${o.apartment}`:''].filter(Boolean).join(', ')||'Адрес не указан'}
function adminIds(env:Env){return String((env as any).ADMIN_IDS||'').split(',').map((x:string)=>x.trim()).filter(Boolean)}
function enrichDuration(j:any){const s=Number(j?.startedAt||j?.started_at||0),e=Number(j?.finishedAt||j?.finished_at||0),d=s?Math.max(0,(e||Date.now())-s):0;return{...j,started_at:s,finished_at:e,duration_ms:d,duration_text:d?durText(d):''}}
function durText(ms:number){const m=Math.max(0,Math.floor(ms/60000)),h=Math.floor(m/60);return h?`${h} ч ${m%60} мин`:`${m} мин`}
function fmtTime(ms:number){try{return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch{return'—'}}
function clean(v:any,n=500){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n)}
function positiveInt(v:any){const n=Number(v);return Number.isInteger(n)&&n>0?n:0}
function esc(v:any){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
async function readBody(req:Request){try{return await req.json()}catch{return{}}}
function userIdFromHeaders(req:Request){const launch=req.headers.get('X-App-Launch-Token')||'';try{const p=launch.split('.')[0];if(p){const s=p.replace(/-/g,'+').replace(/_/g,'/'),j=JSON.parse(atob(s+'='.repeat((4-s.length%4)%4)));return positiveInt(j?.id)}const init=req.headers.get('X-Telegram-Init-Data')||'';return positiveInt(JSON.parse(new URLSearchParams(init).get('user')||'{}')?.id)}catch{return 0}}
function J(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function html(s:string){return new Response(s,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer','permissions-policy':'camera=(self)'}})}
