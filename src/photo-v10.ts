import { APP } from './app-v10';
import photoV9 from './photo-v9';
import type { Env } from './photo-v9';
export { AppState } from './photo-v9';
export type { Env } from './photo-v9';

const API=(t:string)=>`https://api.telegram.org/bot${t}`;
const MIN_FILES=2;

export default {
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);
    if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/app')){
      return new Response(APP,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
    }
    if(req.method==='POST'&&url.pathname==='/api/before') return submitBeforeV10(req,env);
    if(req.method==='POST'&&url.pathname==='/api/after') return submitAfterV10(req,env);
    return photoV9.fetch(req,env);
  }
};

async function authenticatedState(req:Request,env:Env){
  const u=new URL(req.url);u.pathname='/api/state';u.search='';
  const r=await photoV9.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env);
  let data:any;try{data=await r.clone().json()}catch{return{ok:false,response:r,data:null}}
  return{ok:r.ok&&data?.ok!==false,response:r,data};
}

async function submitBeforeV10(req:Request,env:Env){
  const auth=await authenticatedState(req,env);if(!auth.ok)return auth.response;
  const userId=Number(auth.data?.employee?.id);const job=auth.data?.job;
  if(!Number.isSafeInteger(userId))return J({ok:false,error:'Не удалось определить сотрудника.'},401);
  if(!job||job.stage!=='started')return J({ok:false,error:'Этап ДО недоступен.'},409);
  let body:any;try{body=await req.json()}catch{body={}}
  const note=clean(body?.defect_note,600),files=await drafts(env,userId,'before');
  if(files.length<MIN_FILES)return J({ok:false,error:`Добавьте минимум ${MIN_FILES} фото или видео ДО.`},400);
  const admins=adminIds(env);if(!admins.length)return J({ok:false,error:'Администратор ещё не настроен.'},503);

  const summary=`🟡 <b>ДО · УБОРКА НАЧАТА</b>\n\n🆔 <b>${esc(job.id)}</b>\n👤 <b>Клиент:</b> ${esc(job.customer)}\n📍 <b>Адрес:</b> ${esc(job.address)}\n🧽 <b>Тип:</b> ${esc(job.type)}\n🧑‍🔧 <b>Клинер:</b> ${esc(job.employeeName)}${job.employeeUsername?' (@'+esc(job.employeeUsername)+')':''}\n🔐 <b>Telegram ID:</b> <code>${userId}</code>\n🕐 <b>Старт:</b> ${fmt(job.startedAt)}\n📌 <b>GPS:</b> ${Number(job.start_location?.lat).toFixed(6)}, ${Number(job.start_location?.lon).toFixed(6)} · ±${Math.round(Number(job.start_location?.accuracy||0))} м${Number(job.start_location?.accuracy||0)>150?' ⚠️':''}\n📷 <b>Материалов ДО:</b> ${files.length}${note?`\n⚠️ <b>Дефекты / замечания:</b> ${esc(note)}`:'\n✅ <b>Дефекты:</b> отдельно не указаны'}`;
  try{
    for(const a of admins){
      await send(env.TELEGRAM_BOT_TOKEN,a,summary,{parse_mode:'HTML'});
      if(validCoords(job.start_location?.lat,job.start_location?.lon))await tg(env.TELEGRAM_BOT_TOKEN,'sendLocation',{chat_id:a,latitude:job.start_location.lat,longitude:job.start_location.lon});
      await sendMediaSequential(env.TELEGRAM_BOT_TOKEN,a,files,'ДО · '+job.id);
    }
  }catch(e){console.error('before delivery',e);return J({ok:false,error:'Не удалось доставить этап ДО администратору. Повторите попытку.'},502)}

  const launch=await signLaunch({id:userId,first_name:job.employeeName||'Сотрудник',exp:Math.floor(Date.now()/1000)+12*60*60},env.TELEGRAM_BOT_TOKEN);
  const appUrl=`${new URL(req.url).origin}/?launch=${encodeURIComponent(launch)}`;
  job.stage='before_sent';job.beforeSentAt=Date.now();job.beforeCount=files.length;job.defectNote=note;job.reminded=false;job.appUrl=appUrl;
  await putJob(env,job);await clearDraftStage(env,userId,'before');await scheduleReminder(env);

  await send(env.TELEGRAM_BOT_TOKEN,userId,`✅ <b>Фото/видео ДО принято</b>\n\nТеперь выполните уборку по регламенту.\n\n🧽 поверхности\n🧹 полы и плинтусы\n🚿 санузел / мокрые зоны\n🍽 кухонная зона\n👀 финальный осмотр\n\n⚠️ После завершения обязательно отправьте фото/видео <b>ПОСЛЕ</b>.`,{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'📷 Перейти к фото ПОСЛЕ',web_app:{url:appUrl}}]]}}).catch(()=>null);
  return J({ok:true,job});
}

async function submitAfterV10(req:Request,env:Env){
  const auth=await authenticatedState(req,env);if(!auth.ok)return auth.response;
  const userId=Number(auth.data?.employee?.id);const job=auth.data?.job;
  if(!Number.isSafeInteger(userId))return J({ok:false,error:'Не удалось определить сотрудника.'},401);
  if(!job||job.stage!=='before_sent')return J({ok:false,error:'Сначала отправьте этап ДО.'},409);
  let body:any;try{body=await req.json()}catch{return J({ok:false,error:'Некорректные данные.'},400)}
  const lat=num(body?.lat),lon=num(body?.lon),accuracy=num(body?.accuracy);
  if(!validCoords(lat,lon))return J({ok:false,error:'Не удалось получить финальные координаты.'},400);
  if(accuracy<=0||accuracy>10000)return J({ok:false,error:'Геопозиция недоступна. Повторите определение места.'},400);
  const files=await drafts(env,userId,'after');if(files.length<MIN_FILES)return J({ok:false,error:`Добавьте минимум ${MIN_FILES} фото или видео ПОСЛЕ.`},400);
  const admins=adminIds(env);if(!admins.length)return J({ok:false,error:'Администратор ещё не настроен.'},503);

  const now=Date.now(),dur=Math.max(0,now-Number(job.startedAt||now)),dist=Math.round(haversine(Number(job.start_location?.lat),Number(job.start_location?.lon),lat,lon)),flags:string[]=[];
  if(dur<15*60*1000)flags.push('слишком короткое время уборки');if(dist>1000)flags.push('старт и финиш дальше 1 км');if(Number(job.start_location?.accuracy||0)>150||accuracy>150)flags.push('низкая точность GPS');
  const reportId='HC-'+new Date(now).toISOString().slice(2,10).replace(/-/g,'')+'-'+String(userId).slice(-4)+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
  const summary=`🟢 <b>ПОСЛЕ · УБОРКА ЗАВЕРШЕНА</b>\n\n🆔 <b>${esc(reportId)}</b>\n👤 <b>Клиент:</b> ${esc(job.customer)}\n📍 <b>Адрес:</b> ${esc(job.address)}\n🧑‍🔧 <b>Клинер:</b> ${esc(job.employeeName)}${job.employeeUsername?' (@'+esc(job.employeeUsername)+')':''}\n🔐 <b>Telegram ID:</b> <code>${userId}</code>\n🕐 <b>Начало:</b> ${fmt(job.startedAt)}\n🏁 <b>Завершение:</b> ${fmt(now)}\n⏱ <b>Время работы:</b> ${durText(dur)}\n📌 <b>GPS финиша:</b> ${lat.toFixed(6)}, ${lon.toFixed(6)} · ±${Math.round(accuracy)} м${accuracy>150?' ⚠️':''}\n📏 <b>Смещение:</b> ${dist} м\n📷 <b>ДО:</b> ${job.beforeCount||0} · <b>ПОСЛЕ:</b> ${files.length}\n${job.defectNote?`⚠️ <b>Замечания ДО:</b> ${esc(job.defectNote)}\n`:''}${flags.length?'🚩 <b>ПРОВЕРИТЬ:</b> '+esc(flags.join('; ')):'✅ <b>Автопроверка:</b> явных несоответствий нет'}`;
  try{
    for(const a of admins){
      await send(env.TELEGRAM_BOT_TOKEN,a,summary,{parse_mode:'HTML'});
      await tg(env.TELEGRAM_BOT_TOKEN,'sendLocation',{chat_id:a,latitude:lat,longitude:lon});
      await sendMediaSequential(env.TELEGRAM_BOT_TOKEN,a,files,'ПОСЛЕ · '+reportId);
    }
  }catch(e){console.error('after delivery',e);return J({ok:false,error:'Не удалось доставить этап ПОСЛЕ администратору. Повторите попытку.'},502)}

  job.stage='done';job.finishedAt=now;job.end_location={lat,lon,accuracy};job.afterCount=files.length;job.reportId=reportId;
  await putJob(env,job);await clearDraftStage(env,userId,'after');
  await send(env.TELEGRAM_BOT_TOKEN,userId,`✅ <b>Фотоотчёт завершён</b>\n\n👤 Клиент: ${esc(job.customer)}\n⏱ Время работы: <b>${durText(dur)}</b>\n🆔 <code>${reportId}</code>`,{parse_mode:'HTML'}).catch(()=>null);
  return J({ok:true,job,report_id:reportId,duration_text:durText(dur),distance_m:dist,flags});
}

async function sendMediaSequential(token:string,chatId:string,items:any[],label:string){
  for(let i=0;i<items.length;i++){
    const x=items[i],caption=`${label} · ${i+1}/${items.length}`;
    if(x.type==='video')await tg(token,'sendVideo',{chat_id:chatId,video:x.fileId,caption,supports_streaming:true});
    else await tg(token,'sendPhoto',{chat_id:chatId,photo:x.fileId,caption});
  }
}

async function stateCall(env:Env,path:string,method='GET',body?:unknown){const id=env.STATE.idFromName('global'),stub=env.STATE.get(id),init:any={method,headers:{'content-type':'application/json'}};if(body!==undefined)init.body=JSON.stringify(body);const r=await stub.fetch('https://state.local'+path,init);return await r.json() as any}
async function drafts(env:Env,id:number,stage:string){const r=await stateCall(env,`/drafts?id=${id}&stage=${encodeURIComponent(stage)}`);return r.files||[]}
async function putJob(env:Env,job:any){await stateCall(env,'/job','POST',{job})}
async function clearDraftStage(env:Env,id:number,stage:string){await stateCall(env,'/draft','POST',{action:'clear',userId:id,stage})}
async function scheduleReminder(env:Env){await stateCall(env,'/schedule','POST',{})}
function adminIds(env:Env){return String(env.ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)}
async function tg(token:string,method:string,body:any){const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),x:any=await r.json();if(!r.ok||!x.ok)throw new Error(x?.description||'Telegram API error');return x}
async function send(token:string,chat:string|number,text:string,extra:any={}){return tg(token,'sendMessage',{chat_id:chat,text,...extra})}
async function signLaunch(user:any,token:string){const body=b64(new TextEncoder().encode(JSON.stringify(user)));const sig=hex(await hmac(new TextEncoder().encode(token),new TextEncoder().encode('launch:'+body)));return body+'.'+sig}
async function hmac(key:BufferSource,data:BufferSource){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data))}
function hex(a:Uint8Array){return[...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
function b64(a:Uint8Array){let s='';a.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function clean(v:any,max:number){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max)}
function num(v:any){const n=Number(v);return Number.isFinite(n)?n:0}
function validCoords(lat:any,lon:any){const a=Number(lat),b=Number(lon);return Number.isFinite(a)&&Number.isFinite(b)&&a>=-90&&a<=90&&b>=-180&&b<=180&&(a!==0||b!==0)}
function esc(x:any){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
function fmt(ms:number){return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}
function durText(ms:number){const m=Math.floor(ms/60000),h=Math.floor(m/60);return h?`${h} ч ${m%60} мин`:`${m} мин`}
function haversine(a:number,b:number,c:number,d:number){if(![a,b,c,d].every(Number.isFinite))return 0;const R=6371000,r=(x:number)=>x*Math.PI/180,dp=r(c-a),dl=r(d-b),z=Math.sin(dp/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(z))}
function J(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
