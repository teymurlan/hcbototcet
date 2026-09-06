import photoV13 from './photo-v13';
import type { Env } from './photo-v13';
export { AppState } from './photo-v13';
export type { Env } from './photo-v13';

const API=(t:string)=>`https://api.telegram.org/bot${t}`;
const MIN_FILES=2;

type MediaDraft={id:string;type:'photo'|'video';fileId:string;name:string;size:number;addedAt:number};

type Ctx={waitUntil?(p:Promise<any>):void};

export default {
  async fetch(req:Request,env:Env,ctx?:Ctx):Promise<Response>{
    const url=new URL(req.url);
    if(req.method==='POST'&&url.pathname==='/api/after') return submitAfterFast(req,env,ctx);
    return photoV13.fetch(req,env);
  }
};

async function submitAfterFast(req:Request,env:Env,ctx?:Ctx){
  const auth=await authenticatedState(req,env);
  if(!auth.ok)return auth.response;
  const userId=Number(auth.data?.employee?.id),job=auth.data?.job;
  if(!Number.isSafeInteger(userId))return J({ok:false,error:'Не удалось определить сотрудника.'},401);

  // Safe retry: if the job was already completed, do not send duplicates.
  if(job?.stage==='done'){
    const duration=Math.max(0,Number(job.finishedAt||Date.now())-Number(job.startedAt||Date.now()));
    return J({ok:true,job,report_id:job.reportId||'',duration_text:durText(duration),distance_m:0,flags:[],already_done:true});
  }
  if(!job||job.stage!=='before_sent')return J({ok:false,error:'Сначала отправьте этап ДО.'},409);

  let body:any;try{body=await req.json()}catch{return J({ok:false,error:'Некорректные данные.'},400)}
  const lat=num(body?.lat),lon=num(body?.lon),accuracy=num(body?.accuracy);
  if(!validCoords(lat,lon))return J({ok:false,error:'Не удалось получить финальные координаты.'},400);
  if(accuracy<=0||accuracy>10000)return J({ok:false,error:'Геопозиция недоступна. Повторите определение места.'},400);

  const files:MediaDraft[]=await drafts(env,userId,'after');
  if(files.length<MIN_FILES)return J({ok:false,error:`Добавьте минимум ${MIN_FILES} фото или видео ПОСЛЕ.`},400);
  const admins=adminIds(env);if(!admins.length)return J({ok:false,error:'Администратор ещё не настроен.'},503);

  const now=Date.now();
  const dur=Math.max(0,now-Number(job.startedAt||now));
  const dist=Math.round(haversine(Number(job.start_location?.lat),Number(job.start_location?.lon),lat,lon));
  const flags:string[]=[];
  if(dur<15*60*1000)flags.push('слишком короткое время уборки');
  if(dist>1000)flags.push('старт и финиш дальше 1 км');
  if(Number(job.start_location?.accuracy||0)>150||accuracy>150)flags.push('низкая точность GPS');
  const reportId='HC-'+new Date(now).toISOString().slice(2,10).replace(/-/g,'')+'-'+String(userId).slice(-4)+'-'+Math.random().toString(36).slice(2,6).toUpperCase();

  const summary=`🟢 <b>УБОРКА ЗАВЕРШЕНА</b>\n━━━━━━━━━━━━\n👤 <b>Клиент:</b> ${esc(job.customer)}\n📍 <b>Адрес:</b> ${esc(job.address)}\n🧽 <b>Тип уборки:</b> ${esc(job.type)}\n🧑‍🔧 <b>Клинер:</b> ${esc(job.employeeName)}${job.employeeUsername?' (@'+esc(job.employeeUsername)+')':''}\n🆔 <b>Telegram ID:</b> <code>${userId}</code>\n🕐 <b>Начало:</b> ${fmt(job.startedAt)}\n🏁 <b>Завершение:</b> ${fmt(now)}\n⏱ <b>Время работы:</b> ${durText(dur)}\n📌 <b>GPS финиша:</b> ${lat.toFixed(6)}, ${lon.toFixed(6)} · ±${Math.round(accuracy)} м${accuracy>150?' ⚠️':''}\n📏 <b>Смещение:</b> ${dist} м\n📎 <b>Материалы:</b> ДО ${job.beforeCount||0} · ПОСЛЕ ${files.length}\n${job.defectNote?`⚠️ <b>Замечания ДО:</b> ${esc(job.defectNote)}\n`:''}${flags.length?'🚩 <b>Требует внимания:</b> '+esc(flags.join('; ')):'✅ <b>Автопроверка:</b> явных несоответствий нет'}\n\n🆔 <b>Отчёт:</b> <code>${reportId}</code>`;

  // Critical part: persist completion BEFORE contacting Telegram.
  job.stage='done';job.finishedAt=now;job.end_location={lat,lon,accuracy};job.afterCount=files.length;job.reportId=reportId;
  await putJob(env,job);
  await clearDraftStage(env,userId,'after');

  const delivery=deliverAfter(env,admins,userId,job,files,lat,lon,summary,dur,reportId)
    .catch(e=>console.error('after background delivery',e));
  if(ctx?.waitUntil)ctx.waitUntil(delivery);else void delivery;

  return J({ok:true,job,report_id:reportId,duration_text:durText(dur),distance_m:dist,flags});
}

async function deliverAfter(env:Env,admins:string[],userId:number,job:any,files:MediaDraft[],lat:number,lon:number,summary:string,dur:number,reportId:string){
  for(const admin of admins){
    try{await tgTimeout(env.TELEGRAM_BOT_TOKEN,'sendLocation',{chat_id:admin,latitude:lat,longitude:lon},7000)}catch(e){console.error('after location',admin,e)}
    for(const f of files){
      try{
        if(f.type==='video')await tgTimeout(env.TELEGRAM_BOT_TOKEN,'sendVideo',{chat_id:admin,video:f.fileId,supports_streaming:true},10000);
        else await tgTimeout(env.TELEGRAM_BOT_TOKEN,'sendPhoto',{chat_id:admin,photo:f.fileId},10000);
      }catch(e){console.error('after media',admin,f.id,e)}
    }
    try{await tgTimeout(env.TELEGRAM_BOT_TOKEN,'sendMessage',{chat_id:admin,text:summary,parse_mode:'HTML'},7000)}catch(e){console.error('after summary',admin,e)}
  }
  try{await tgTimeout(env.TELEGRAM_BOT_TOKEN,'sendMessage',{chat_id:userId,text:`✅ <b>Фотоотчёт завершён</b>\n\n👤 ${esc(job.customer)}\n⏱ Время работы: <b>${durText(dur)}</b>\n🆔 <code>${reportId}</code>`,parse_mode:'HTML'},7000)}catch(e){console.error('after employee notice',e)}
}

async function authenticatedState(req:Request,env:Env){
  const u=new URL(req.url);u.pathname='/api/state';u.search='';
  const r=await photoV13.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env);
  let data:any;try{data=await r.clone().json()}catch{return{ok:false,response:r,data:null}}
  return{ok:r.ok&&data?.ok!==false,response:r,data};
}
async function stateCall(env:Env,path:string,method='GET',body?:unknown){const id=env.STATE.idFromName('global'),stub=env.STATE.get(id),init:any={method,headers:{'content-type':'application/json'}};if(body!==undefined)init.body=JSON.stringify(body);const r=await stub.fetch('https://state.local'+path,init);return await r.json() as any}
async function drafts(env:Env,id:number,stage:string){const r=await stateCall(env,`/drafts?id=${id}&stage=${encodeURIComponent(stage)}`);return r.files||[]}
async function putJob(env:Env,job:any){await stateCall(env,'/job','POST',{job})}
async function clearDraftStage(env:Env,id:number,stage:string){await stateCall(env,'/draft','POST',{action:'clear',userId:id,stage})}
function adminIds(env:Env){return String(env.ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)}
async function tgTimeout(token:string,method:string,body:any,ms:number){const c=new AbortController(),timer=setTimeout(()=>c.abort(),ms);try{const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:c.signal});const x:any=await r.json();if(!r.ok||!x.ok)throw new Error(x?.description||'Telegram API error');return x}finally{clearTimeout(timer)}}
function num(v:any){const n=Number(v);return Number.isFinite(n)?n:0}
function validCoords(lat:any,lon:any){const a=Number(lat),b=Number(lon);return Number.isFinite(a)&&Number.isFinite(b)&&a>=-90&&a<=90&&b>=-180&&b<=180&&(a!==0||b!==0)}
function esc(x:any){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
function fmt(ms:number){return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}
function durText(ms:number){const m=Math.floor(ms/60000),h=Math.floor(m/60);return h?`${h} ч ${m%60} мин`:`${m} мин`}
function haversine(a:number,b:number,c:number,d:number){if(![a,b,c,d].every(Number.isFinite))return 0;const R=6371000,r=(x:number)=>x*Math.PI/180,dp=r(c-a),dl=r(d-b),z=Math.sin(dp/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(z))}
function J(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
