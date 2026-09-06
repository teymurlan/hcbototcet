import { APP } from './app-v18-fast';
import photoV17, { AppState as BaseAppState } from './photo-v17-startfix';
import type { Env } from './photo-v17-startfix';
export type { Env } from './photo-v17-startfix';
export class AppState extends BaseAppState {}

type Ctx={waitUntil?(p:Promise<any>):void};
type MediaDraft={id:string;type:'photo'|'video';fileId:string;name:string;size:number;addedAt:number};
const API=(t:string)=>`https://api.telegram.org/bot${t}`;

export default{
  async fetch(req:Request,env:Env,ctx?:Ctx):Promise<Response>{
    const u=new URL(req.url);
    if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/app'))return html(APP);
    if(req.method==='POST'&&u.pathname==='/api/session/start')return startFast(req,env);
    if(req.method==='POST'&&u.pathname==='/api/after')return finishFast(req,env,ctx);
    return photoV17.fetch(req,env,ctx as any);
  }
};

async function startFast(req:Request,env:Env){
  const auth=await authState(req,env);if(!auth.ok)return auth.response;
  const employee=auth.data?.employee,current=auth.data?.job,userId=Number(employee?.id);
  if(!Number.isSafeInteger(userId))return J({ok:false,error:'Не удалось определить сотрудника.'},401);
  if(current&&current.stage!=='done')return J({ok:false,error:'У вас уже есть незавершённая уборка. Продолжите её.'},409);
  let x:any;try{x=await req.json()}catch{return J({ok:false,error:'Некорректные данные.'},400)}
  const customer=clean(x?.customer,100),address=clean(x?.address,180),type=clean(x?.cleaning_type,80)||'Не указан';
  if(!customer)return J({ok:false,error:'Укажите имя клиента.'},400);
  if(!address)return J({ok:false,error:'Укажите адрес.'},400);
  const lat=num(x?.lat),lon=num(x?.lon),accuracy=num(x?.accuracy),hasGps=coords(lat,lon)&&accuracy>0;
  const now=Date.now(),launch=clean(req.headers.get('X-App-Launch-Token'),4000),origin=new URL(req.url).origin;
  const job:any={
    id:'JOB-'+now.toString(36).toUpperCase()+'-'+String(userId).slice(-4),userId,
    employeeName:clean(employee?.name,100)||('ID '+userId),employeeUsername:'',customer,address,type,
    stage:'started',startedAt:now,start_location:hasGps?{lat,lon,accuracy}:{lat:0,lon:0,accuracy:0},
    startPlace:address,appUrl:origin+(launch?'?launch='+encodeURIComponent(launch):'')
  };
  await stateCall(env,'/job','POST',{job});
  await stateCall(env,'/events','POST',{jobId:job.id,item:{type:'start',label:'Начал фотоотчёт',at:now,userId},once:true}).catch(()=>null);
  return J({ok:true,job});
}

async function finishFast(req:Request,env:Env,ctx?:Ctx){
  const auth=await authState(req,env);if(!auth.ok)return auth.response;
  const employee=auth.data?.employee,job=auth.data?.job,userId=Number(employee?.id);
  if(!Number.isSafeInteger(userId))return J({ok:false,error:'Не удалось определить сотрудника.'},401);
  if(job?.stage==='done')return J({ok:true,job,report_id:job.reportId||'',duration_text:durText(Math.max(0,Number(job.finishedAt||Date.now())-Number(job.startedAt||Date.now()))),already_done:true});
  if(!job||job.stage!=='before_sent')return J({ok:false,error:'Сначала отправьте этап ДО.'},409);
  const d=await stateCall(env,`/drafts?id=${userId}&stage=after`),files:MediaDraft[]=d.files||[];
  if(files.length<2)return J({ok:false,error:'Добавьте минимум 2 фото или видео ПОСЛЕ.'},400);
  const admins=adminIds(env);if(!admins.length)return J({ok:false,error:'Администратор ещё не настроен.'},503);
  const now=Date.now(),dur=Math.max(0,now-Number(job.startedAt||now));
  const reportId='HC-'+new Date(now).toISOString().slice(2,10).replace(/-/g,'')+'-'+String(userId).slice(-4)+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
  job.stage='done';job.finishedAt=now;job.end_location={lat:0,lon:0,accuracy:0};job.endPlace=job.address||'Адрес объекта';job.afterCount=files.length;job.reportId=reportId;
  await stateCall(env,'/job','POST',{job});
  await stateCall(env,'/history','POST',{job}).catch(()=>null);
  await stateCall(env,'/archive','POST',{jobId:job.id,stage:'after',files}).catch(()=>null);
  await stateCall(env,'/events','POST',{jobId:job.id,item:{type:'done',label:'Завершил фотоотчёт',at:now,userId},once:true}).catch(()=>null);
  await stateCall(env,'/draft','POST',{action:'clear',userId,stage:'after'}).catch(()=>null);
  const summary=`🟢 <b>УБОРКА ЗАВЕРШЕНА</b>\n━━━━━━━━━━━━\n👤 <b>Клиент:</b> ${esc(job.customer)}\n🏠 <b>Адрес:</b> ${esc(job.address)}\n🧽 <b>Тип:</b> ${esc(job.type)}\n🧑‍🔧 <b>Клинер:</b> ${esc(job.employeeName)}\n🕐 <b>Начало:</b> ${fmt(job.startedAt)}\n🏁 <b>Завершение:</b> ${fmt(now)}\n⏱ <b>Время работы:</b> ${durText(dur)}\n📎 <b>Материалы:</b> ДО ${job.beforeCount||0} · ПОСЛЕ ${files.length}\n📍 <b>Местоположение:</b> используется адрес объекта, GPS не обязателен\n\n🆔 <b>Отчёт:</b> <code>${reportId}</code>`;
  const delivery=(async()=>{
    for(const a of admins){await sendAlbum(env.TELEGRAM_BOT_TOKEN,a,files);await tg(env.TELEGRAM_BOT_TOKEN,'sendMessage',{chat_id:a,text:summary,parse_mode:'HTML'},8000).catch(()=>null)}
    await tg(env.TELEGRAM_BOT_TOKEN,'sendMessage',{chat_id:userId,text:`✅ <b>Фотоотчёт завершён</b>\n\n👤 ${esc(job.customer)}\n⏱ Время работы: <b>${durText(dur)}</b>\n🆔 <code>${reportId}</code>`,parse_mode:'HTML'},8000).catch(()=>null);
  })().catch(()=>null);
  if(ctx?.waitUntil)ctx.waitUntil(delivery);else void delivery;
  return J({ok:true,job,report_id:reportId,duration_text:durText(dur),flags:[]});
}

async function authState(req:Request,env:Env){
  const u=new URL(req.url);u.pathname='/api/state';u.search='';
  const r=await photoV17.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env as any);
  let data:any;try{data=await r.clone().json()}catch{return{ok:false,response:r,data:null}}
  return{ok:r.ok&&data?.ok!==false,response:r,data};
}
async function stateCall(env:Env,path:string,method='GET',body?:unknown){
  const id=env.STATE.idFromName('global'),stub=env.STATE.get(id),init:any={method,headers:{'content-type':'application/json'}};
  if(body!==undefined)init.body=JSON.stringify(body);
  const r=await stub.fetch('https://state.local'+path,init);return await r.json() as any;
}
async function sendAlbum(token:string,chat:string,items:MediaDraft[]){
  for(let i=0;i<items.length;i+=10){const part=items.slice(i,i+10);if(part.length===1){const x=part[0];await tg(token,x.type==='video'?'sendVideo':'sendPhoto',x.type==='video'?{chat_id:chat,video:x.fileId,supports_streaming:true}:{chat_id:chat,photo:x.fileId},12000).catch(()=>null);continue}const media=part.map(x=>x.type==='video'?{type:'video',media:x.fileId,supports_streaming:true}:{type:'photo',media:x.fileId});await tg(token,'sendMediaGroup',{chat_id:chat,media},15000).catch(async()=>{for(const x of part)await tg(token,x.type==='video'?'sendVideo':'sendPhoto',x.type==='video'?{chat_id:chat,video:x.fileId,supports_streaming:true}:{chat_id:chat,photo:x.fileId},9000).catch(()=>null)})}
}
async function tg(token:string,method:string,body:any,ms:number){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:c.signal}),x:any=await r.json();if(!r.ok||!x.ok)throw new Error(x?.description||'Telegram API error');return x}finally{clearTimeout(t)}}
function adminIds(env:Env){return String(env.ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)}
function clean(v:any,max:number){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max)}
function num(v:any){const n=Number(v);return Number.isFinite(n)?n:0}
function coords(lat:any,lon:any){const a=Number(lat),b=Number(lon);return Number.isFinite(a)&&Number.isFinite(b)&&a>=-90&&a<=90&&b>=-180&&b<=180&&(a!==0||b!==0)}
function esc(x:any){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
function fmt(ms:number){return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}
function durText(ms:number){const m=Math.floor(ms/60000),h=Math.floor(m/60);return h?`${h} ч ${m%60} мин`:`${m} мин`}
function html(s:string){return new Response(s,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer','permissions-policy':'camera=(self), geolocation=(self)'}})}
function J(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
