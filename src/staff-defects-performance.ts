import adminAccess, { AppState as AdminAccessAppState } from './staff-admin-access';
import type { Env } from './staff-admin-access';
import { STAFF_DEFECTS_PERFORMANCE_APP } from './staff-defects-performance-ui';

export type { Env } from './staff-admin-access';

const BUILD='staff-defects-performance-2026-09-16-a';
const STORE_NAME='house-cleaning-app-v1';
const MAX_CLIENT_DEFECT_BYTES=12*1024*1024;

type DefectMeta={
  order_number:string;
  media_id:string;
  file_id:string;
  note:string;
  name:string;
  mime_type:string;
  added_at:number;
  manager_notified_at?:number;
  client_notified_at?:number;
  client_skipped_at?:number;
};

export class AppState extends AdminAccessAppState {
  async fetch(req:Request):Promise<Response>{
    const u=new URL(req.url);
    if(u.pathname==='/opsdefects/list'&&req.method==='GET'){
      const order=cleanOrder(u.searchParams.get('order'));
      if(!order)return J({ok:false,error:'Заказ не указан'},400);
      const rows=await this.state.storage.list<DefectMeta>({prefix:defectPrefix(order)});
      return J({ok:true,defects:[...rows.values()].sort((a,b)=>a.added_at-b.added_at)});
    }
    if(u.pathname==='/opsdefects/save'&&req.method==='POST'){
      const x:any=await readBody(req),order=cleanOrder(x.order_number),mediaId=cleanId(x.media_id),fileId=clean(x.file_id,300),note=clean(x.note,500);
      if(!order||!mediaId||!fileId||note.length<2)return J({ok:false,error:'Некорректный дефект'},400);
      const key=defectKey(order,mediaId),old=await this.state.storage.get<DefectMeta>(key);
      const row:DefectMeta={...(old||{}),order_number:order,media_id:mediaId,file_id:fileId,note,name:clean(x.name,140),mime_type:imageMime(x.mime_type),added_at:Number(old?.added_at||Date.now())};
      await this.state.storage.put(key,row);return J({ok:true,defect:row});
    }
    if(u.pathname==='/opsdefects/mark'&&req.method==='POST'){
      const x:any=await readBody(req),order=cleanOrder(x.order_number),mediaId=cleanId(x.media_id),key=defectKey(order,mediaId),row=await this.state.storage.get<DefectMeta>(key);
      if(!row)return J({ok:false,error:'Дефект не найден'},404);
      if(x.manager_notified)row.manager_notified_at=Number(row.manager_notified_at||Date.now());
      if(x.client_notified)row.client_notified_at=Number(row.client_notified_at||Date.now());
      if(x.client_skipped)row.client_skipped_at=Number(row.client_skipped_at||Date.now());
      await this.state.storage.put(key,row);return J({ok:true,defect:row});
    }
    return super.fetch(req);
  }
}

export default {
  async fetch(req:Request,env:Env,ctx?:ExecutionContext):Promise<Response>{
    const u=new URL(req.url);
    if(req.method==='GET'&&u.pathname==='/__hc_staff_version')return J({ok:true,build:BUILD,staff:true,no_dom_polling:true,parallel_media_preview:3,media_session_cache:true,defect_photos:true,client_defect_only:true});
    if(req.method==='GET'&&['/staff','/staff/','/admin'].includes(u.pathname))return html(STAFF_DEFECTS_PERFORMANCE_APP);

    if(req.method==='GET'&&u.pathname==='/api/staff/defects')return defectsApi(req,env,ctx);
    if(req.method==='POST'&&u.pathname==='/api/media/draft'&&req.headers.get('X-HC-Defect')==='1')return defectUpload(req,env,ctx);
    if(req.method==='GET'&&u.pathname==='/api/admin/job')return adminJobWithDefects(req,env,ctx);
    if(req.method==='POST'&&u.pathname==='/api/before')return beforeWithDefects(req,env,ctx);

    return adminAccess.fetch(req,env,ctx as any);
  },
  async scheduled(controller:any,env:Env,ctx:ExecutionContext):Promise<void>{return adminAccess.scheduled(controller,env,ctx)}
};

async function defectsApi(req:Request,env:Env,ctx?:ExecutionContext){
  const auth=await authState(req,env,ctx);if(!auth.ok)return auth.response;
  const order=cleanOrder(new URL(req.url).searchParams.get('order_number'));if(!order)return J({ok:false,error:'Заказ не указан'},400);
  const x=await stateCall(env,`/opsdefects/list?order=${encodeURIComponent(order)}`).catch(()=>({defects:[]}));
  return J({ok:true,defects:(x.defects||[]).map((d:any)=>({media_id:d.media_id,note:d.note,added_at:d.added_at,manager_notified_at:d.manager_notified_at||0,client_notified_at:d.client_notified_at||0}))});
}

async function defectUpload(req:Request,env:Env,ctx?:ExecutionContext){
  const metaReq=req.clone();let form:FormData;
  try{form=await metaReq.formData()}catch{return J({ok:false,error:'Не удалось прочитать фото дефекта'},400)}
  const stage=clean(form.get('stage'),20),order=cleanOrder(form.get('order_number')),note=clean(form.get('defect_note'),500),file=form.get('media');
  if(stage!=='before')return J({ok:false,error:'Дефекты можно отмечать только в Фото ДО'},400);
  if(!order)return J({ok:false,error:'Заказ не указан'},400);
  if(note.length<2)return J({ok:false,error:'Коротко опишите дефект'},400);
  if(!(file instanceof File)||!String(file.type||'').startsWith('image/'))return J({ok:false,error:'Для дефекта прикрепите фотографию'},400);

  const response=await adminAccess.fetch(req,env,ctx as any);if(!response.ok)return response;
  const data:any=await response.clone().json().catch(()=>({})),item=data.file;
  if(!item?.id||!item?.fileId)return response;
  await stateCall(env,'/opsdefects/save','POST',{order_number:order,media_id:item.id,file_id:item.fileId,note,name:item.name||file.name,mime_type:file.type||'image/jpeg'});
  return J({...data,file:{...item,is_defect:true,defect_note:note},defect:true});
}

async function adminJobWithDefects(req:Request,env:Env,ctx?:ExecutionContext){
  const response=await adminAccess.fetch(req,env,ctx as any);if(!response.ok)return response;
  const data:any=await response.clone().json().catch(()=>({})),job=data.job||{},order=cleanOrder(job.booking_order_number||job.order_number);
  if(!order)return response;
  const d=await stateCall(env,`/opsdefects/list?order=${encodeURIComponent(order)}`).catch(()=>({defects:[]})),map=new Map((d.defects||[]).map((x:any)=>[String(x.media_id),x]));
  if(data.media&&Array.isArray(data.media.before))data.media.before=data.media.before.map((f:any)=>{const x:any=map.get(String(f.id));return x?{...f,is_defect:true,defect_note:x.note}:f});
  data.job={...job,defect_count:(d.defects||[]).length};
  return J(data);
}

async function beforeWithDefects(req:Request,env:Env,ctx?:ExecutionContext){
  const copy=req.clone(),body:any=await readBody(copy),response=await adminAccess.fetch(req,env,ctx as any);if(!response.ok)return response;
  const data:any=await response.clone().json().catch(()=>({})),job=data.job||{},order=cleanOrder(job.booking_order_number||body.order_number);
  if(order){const task=notifyDefects(env,order,job).catch(e=>console.error('Defect notification failed',e));if(ctx?.waitUntil)ctx.waitUntil(task);else await task}
  return response;
}

async function notifyDefects(env:Env,orderNumber:string,job:any){
  const list=await stateCall(env,`/opsdefects/list?order=${encodeURIComponent(orderNumber)}`).catch(()=>({defects:[]})),defects:DefectMeta[]=list.defects||[];
  if(!defects.length)return;
  const order=await bookingOrder(env,orderNumber),address=[order?.city,order?.address,order?.apartment?`кв./офис ${order.apartment}`:''].filter(Boolean).join(', '),admins=await notificationAdminIds(env);
  for(const defect of defects){
    if(!defect.manager_notified_at){
      const caption=[`⚠️ <b>ДЕФЕКТ ДО УБОРКИ</b>`,`Заказ: <b>${esc(orderNumber)}</b>`,address?`Адрес: ${esc(address)}`:'',`Комментарий: ${esc(defect.note)}`].filter(Boolean).join('\n');
      const results=await Promise.allSettled(admins.map(id=>tgJson(env,'sendPhoto',{chat_id:id,photo:defect.file_id,caption,parse_mode:'HTML'})));
      if(results.some(r=>r.status==='fulfilled'))await stateCall(env,'/opsdefects/mark','POST',{order_number:orderNumber,media_id:defect.media_id,manager_notified:true});
    }
    if(!defect.client_notified_at&&!defect.client_skipped_at){
      try{
        const media=await telegramFileBytes(env,defect.file_id);if(media.bytes.byteLength>MAX_CLIENT_DEFECT_BYTES)throw Error('Фото дефекта слишком большое');
        const stub:any=bookingStub(env);if(!stub||typeof stub.notifyClientDefect!=='function')throw Error('Клиентский канал дефектов ещё не доступен');
        const out:any=await stub.notifyClientDefect({order_number:orderNumber,defect_id:defect.media_id,note:defect.note,mime_type:media.mime,bytes:media.bytes});
        if(out?.ok)await stateCall(env,'/opsdefects/mark','POST',{order_number:orderNumber,media_id:defect.media_id,client_notified:true});
        else if(out?.skipped)await stateCall(env,'/opsdefects/mark','POST',{order_number:orderNumber,media_id:defect.media_id,client_skipped:true});
        else throw Error(out?.error||'Не удалось отправить дефект клиенту');
      }catch(e){console.error('Client defect notification failed',orderNumber,defect.media_id,e)}
    }
  }
}

async function telegramFileBytes(env:Env,fileId:string){
  const file:any=await tgJson(env,'getFile',{file_id:fileId}),path=clean(file?.file_path,500);if(!path)throw Error('Telegram file path missing');
  const token=String((env as any).TELEGRAM_BOT_TOKEN||''),r=await fetch(`https://api.telegram.org/file/bot${token}/${path}`);if(!r.ok)throw Error('Не удалось получить фото дефекта');
  return{bytes:await r.arrayBuffer(),mime:imageMime(r.headers.get('content-type')||mimeFromPath(path))};
}

async function notificationAdminIds(env:Env){
  const raw=[(env as any).ADMIN_IDS,(env as any).ADMIN_TELEGRAM_IDS,(env as any).ADMIN_TELEGRAM_ID,(env as any).ADMIN_ID].filter(Boolean).join(','),ids=String(raw).split(/[;,\s]+/).map(positiveInt).filter(Boolean);
  const delegated=await stateCall(env,'/opsadmin/admins').catch(()=>({admins:[]}));for(const a of delegated.admins||[]){const id=positiveInt(a.id);if(id)ids.push(id)}return[...new Set(ids)];
}
async function bookingOrder(env:Env,n:string){const r=await bookingStub(env)?.fetch('https://booking.internal/orders');if(!r?.ok)return null;const x:any=await r.json().catch(()=>({}));return(x.orders||[]).find((o:any)=>String(o.order_number||'')===n)||null}
function bookingStub(env:Env){return (env as any).BOOKING_STORE?.get((env as any).BOOKING_STORE.idFromName(STORE_NAME))}

async function authState(req:Request,env:Env,ctx?:ExecutionContext){
  const u=new URL(req.url);u.pathname='/api/state';u.search='';const r=await adminAccess.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env,ctx as any);let x:any;try{x=await r.clone().json()}catch{return{ok:false,response:r}}return{ok:r.ok&&x?.ok!==false,response:r,data:x};
}
async function stateCall(env:Env,path:string,method='GET',body?:any){const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id),init:RequestInit={method,headers:body===undefined?undefined:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)},r=await stub.fetch('https://state.local'+path,init);return await r.json().catch(()=>({}))}
async function tgJson(env:Env,method:string,payload:any){const token=String((env as any).TELEGRAM_BOT_TOKEN||'');if(!token)throw Error('Telegram bot token missing');const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),x:any=await r.json().catch(()=>({}));if(!r.ok||!x?.ok)throw Error(x?.description||`Telegram ${method} failed`);return x.result}
function defectPrefix(order:string){return`opsdefect:${encodeURIComponent(order)}:`}
function defectKey(order:string,id:string){return defectPrefix(order)+encodeURIComponent(id)}
function cleanOrder(v:any){const s=String(v??'').trim();return/^[A-Za-z0-9._-]{3,120}$/.test(s)?s:''}
function cleanId(v:any){const s=String(v??'').trim();return/^[A-Za-z0-9._:-]{3,180}$/.test(s)?s:''}
function clean(v:any,n=500){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n)}
function positiveInt(v:any){const n=Number(v);return Number.isSafeInteger(n)&&n>0?n:0}
function imageMime(v:any){const s=String(v||'').toLowerCase();return['image/jpeg','image/png','image/webp'].includes(s)?s:'image/jpeg'}
function mimeFromPath(p:string){return p.toLowerCase().endsWith('.png')?'image/png':p.toLowerCase().endsWith('.webp')?'image/webp':'image/jpeg'}
function esc(v:any){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
async function readBody(req:Request){try{return await req.json()}catch{return{}}}
function J(v:any,status=200){return new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function html(s:string){return new Response(s,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})}
