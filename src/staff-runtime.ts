import production, { AppState as ProductionAppState } from './staff-production';
import type { Env } from './staff-production';
import { STAFF_RUNTIME_APP } from './staff-runtime-ui';

export type { Env } from './staff-production';
const BUILD = 'staff-runtime-review-2026-09-16-a';
const STORE_NAME = 'house-cleaning-app-v1';
const WORKER_ORIGIN = 'https://hcbototcet.teymurlannn.workers.dev';

type ReportReview = { job_id:string; status:'accepted'|'redo'; reason:string; at:number; admin_id:number; booking_order_number:string };

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
    return super.fetch(req);
  }
}

export default {
  async fetch(req:Request, env:Env, ctx?:ExecutionContext):Promise<Response> {
    const u = new URL(req.url);
    if (req.method==='GET' && u.pathname==='/__hc_staff_version') return J({ok:true,build:BUILD,staff:true,report_review:true,manual_fio:true,compact_requisites:true});
    if (req.method==='GET' && ['/staff','/staff/','/admin'].includes(u.pathname)) return html(STAFF_RUNTIME_APP);

    if (req.method==='GET' && u.pathname==='/api/admin/jobs') return adminJobsRuntime(req,env,ctx);
    if (req.method==='GET' && u.pathname==='/api/admin/job') return adminJobRuntime(req,env,ctx);
    if (req.method==='POST' && u.pathname==='/api/staff/report/review') return reportReviewApi(req,env,ctx);

    return production.fetch(req,env,ctx as any);
  },
  scheduled(controller:any, env:Env, ctx:ExecutionContext):Promise<void> {
    return production.scheduled(controller,env,ctx);
  }
};

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
  const n=deriveOrderNumber(j), stored=await stateCall(env,`/opsruntime/report-review?job=${encodeURIComponent(String(j.id||''))}`).catch(()=>({review:null})), review=stored.review as ReportReview|null;
  let meta:any=null;if(n)meta=(await stateCall(env,`/ops3/order-meta?number=${encodeURIComponent(n)}`).catch(()=>({meta:null}))).meta;
  const accepted=review?.status==='accepted'||!!meta?.verified_at;
  return {...j,booking_order_number:n||j.booking_order_number||'',staff_verified:accepted,staff_review_status:accepted?'accepted':review?.status||'',staff_redo_reason:review?.reason||''};
}

async function reportReviewApi(req:Request,env:Env,ctx?:ExecutionContext):Promise<Response>{
  const auth=await authState(req,env,ctx);if(!auth.ok||!auth.admin)return auth.response;
  const x:any=await readBody(req),jobId=clean(x.job_id,120),action=clean(x.action,20),reason=clean(x.reason,600);
  if(!jobId||!['accept','redo'].includes(action))return J({ok:false,error:'Некорректное действие'},400);
  if(action==='redo'&&reason.length<3)return J({ok:false,error:'Укажите, что нужно исправить'},400);

  const origin=new URL(req.url).origin, detailReq=new Request(`${origin}/api/admin/job?id=${encodeURIComponent(jobId)}`,{method:'GET',headers:req.headers});
  const detailRes=await production.fetch(detailReq,env,ctx as any);if(!detailRes.ok)return J({ok:false,error:'Фотоотчёт не найден'},404);
  const data:any=await detailRes.json().catch(()=>({})),job=data.job||{},n=deriveOrderNumber(job),now=Date.now();

  if(action==='accept'){
    if(n){
      const vr=await production.fetch(new Request(`${origin}/api/staff/order/verify`,{method:'POST',headers:jsonHeaders(req.headers),body:JSON.stringify({order_number:n,job_id:jobId})}),env,ctx as any);
      if(!vr.ok){const er:any=await vr.json().catch(()=>({}));return J({ok:false,error:er.error||'Не удалось закрыть заказ'},vr.status)}
    }
    await stateCall(env,'/opsruntime/report-review','POST',{job_id:jobId,status:'accepted',reason:'',at:now,admin_id:auth.userId,booking_order_number:n});
    await setLegacyReview(req,env,ctx,jobId,false).catch(()=>null);
    if(!n&&positiveInt(job.userId))ctx?.waitUntil?.(sendTg(env,positiveInt(job.userId),'✅ <b>Работа принята руководителем</b>\n\nФотоотчёт проверен и принят. Работа завершена.',origin,'Открыть STAFF').then(()=>undefined));
    return J({ok:true,status:'accepted',booking_order_number:n});
  }

  await stateCall(env,'/opsruntime/report-review','POST',{job_id:jobId,status:'redo',reason,at:now,admin_id:auth.userId,booking_order_number:n});
  await setLegacyReview(req,env,ctx,jobId,true).catch(()=>null);
  if(n){
    const metaData=await stateCall(env,`/ops3/order-meta?number=${encodeURIComponent(n)}`).catch(()=>({meta:null})),meta=metaData.meta||{order_number:n,assigned:[],audit:[]};
    meta.verified_at=0;meta.verified_by=0;meta.redo_requested_at=now;meta.redo_reason=reason;meta.updated_at=new Date().toISOString();
    meta.audit=addAudit(meta.audit,{type:'redo_requested',label:`Руководитель запросил повтор фотоотчёта: ${reason}`,at:now,user_id:auth.userId});
    await stateCall(env,'/ops3/order-meta','POST',meta);
    // A linked STAFF task can immediately upload a new AFTER stage without creating a duplicate job.
    if(positiveInt(job.userId))await stateCall(env,'/job','POST',{job:{...job,stage:'before_sent',finishedAt:0,afterCount:0,redoReason:reason,redoRequestedAt:now,booking_order_number:n}}).catch(()=>null);
  }
  if(positiveInt(job.userId))ctx?.waitUntil?.(sendTg(env,positiveInt(job.userId),`↩️ <b>Фотоотчёт отправлен на повтор</b>\n\nЧто исправить:\n${esc(reason)}\n\nОткройте задание и загрузите новые фото ПОСЛЕ.`,origin,'Открыть задание').then(()=>undefined));
  return J({ok:true,status:'redo',reason,booking_order_number:n});
}

async function setLegacyReview(req:Request,env:Env,ctx:ExecutionContext|undefined,jobId:string,review:boolean){
  return production.fetch(new Request(`${new URL(req.url).origin}/api/admin/review`,{method:'POST',headers:jsonHeaders(req.headers),body:JSON.stringify({job_id:jobId,review})}),env,ctx as any);
}
function deriveOrderNumber(j:any){
  const direct=clean(j?.booking_order_number,120);if(direct)return direct;
  const id=clean(j?.id,180),uid=positiveInt(j?.userId);if(id.startsWith('ORDER-')&&uid){const suffix='-'+uid;if(id.endsWith(suffix))return id.slice(6,-suffix.length)}
  return '';
}
async function authState(req:Request,env:Env,ctx?:ExecutionContext){
  const u=new URL(req.url);u.pathname='/api/state';u.search='';const r=await production.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env,ctx as any);let data:any;try{data=await r.clone().json()}catch{return{ok:false,admin:false,userId:0,response:r}}const userId=positiveInt(data?.employee?.id||data?.user?.id||data?.admin_id),ok=r.ok&&data?.ok!==false&&(!!data?.admin||!!userId);return{ok,admin:!!data?.admin,userId,response:ok?J(data):r};
}
async function stateCall(env:Env,path:string,method='GET',body?:any){const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id),r=await stub.fetch('https://state.local'+path,{method,headers:body===undefined?undefined:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return await r.json().catch(()=>({}))}
function jsonHeaders(h:Headers){const out=new Headers(h);out.set('content-type','application/json');return out}
function addAudit(a:any,item:any){const x=Array.isArray(a)?[...a]:[];x.push(item);return x.slice(-150)}
async function sendTg(env:Env,id:number,text:string,origin=WORKER_ORIGIN,label='Открыть STAFF'){const token=String((env as any).TELEGRAM_BOT_TOKEN||'');if(!token||!id)return null;const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:id,text,parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:label,web_app:{url:`${origin}/staff`}}]]}})});const z:any=await r.json().catch(()=>({}));if(!r.ok||!z.ok)throw Error(z.description||'Telegram API error');return z.result}
function positiveInt(v:any){const n=Number(v);return Number.isInteger(n)&&n>0?n:0}function clean(v:any,n=500){return String(v??'').trim().slice(0,n)}function esc(v:any){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}async function readBody(req:Request){try{return await req.json()}catch{return{}}}function J(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}function html(s:string){return new Response(s,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})}
