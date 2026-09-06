import { APP } from './app-v15';
import photoV14, { AppState as BaseAppState } from './photo-v14';
import type { Env } from './photo-v14';
export type { Env } from './photo-v14';

const API=(t:string)=>`https://api.telegram.org/bot${t}`;
const MIN_FILES=2;
type Ctx={waitUntil?(p:Promise<any>):void};
type MediaDraft={id:string;type:'photo'|'video';fileId:string;name:string;size:number;addedAt:number};
type TgUser={id:number;first_name?:string;last_name?:string;username?:string};
type Employee={id:number;name:string;role:string;status:'active'|'blocked';addedAt:number};

export default {
  async fetch(req:Request,env:Env,ctx?:Ctx):Promise<Response>{
    const url=new URL(req.url);
    if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/app'))return new Response(APP,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer','permissions-policy':'camera=(self), geolocation=(self)'}});
    if(req.method==='POST'&&url.pathname==='/webhook')return webhookV15(req,env,url.origin);
    if(req.method==='GET'&&url.pathname==='/api/history')return historyApi(req,env);
    if(req.method==='POST'&&url.pathname==='/api/session/start')return startWithPlace(req,env,ctx);
    if(req.method==='POST'&&url.pathname==='/api/before')return submitBefore(req,env,ctx);
    if(req.method==='POST'&&url.pathname==='/api/after')return submitAfter(req,env,ctx);
    return photoV14.fetch(req,env,ctx);
  }
};

export class AppState extends BaseAppState{
  async fetch(req:Request):Promise<Response>{
    const u=new URL(req.url);
    if(u.pathname==='/history'&&req.method==='GET'){
      const id=Number(u.searchParams.get('id'));
      const all=await this.state.storage.list<any>({prefix:`history:${id}:`});
      const jobs=[...all.values()].sort((a,b)=>Number(b.finishedAt||b.startedAt||0)-Number(a.finishedAt||a.startedAt||0)).slice(0,50);
      return J({ok:true,jobs});
    }
    if(u.pathname==='/history'&&req.method==='POST'){
      const x:any=await req.json(),job=x?.job;
      if(!job||!Number.isSafeInteger(Number(job.userId)))return J({ok:false,error:'bad history'},400);
      const ts=String(Number(job.finishedAt||job.startedAt||Date.now())).padStart(13,'0');
      const key=`history:${Number(job.userId)}:${ts}:${String(job.reportId||job.id||'job')}`;
      await this.state.storage.put(key,job);
      const all=await this.state.storage.list<any>({prefix:`history:${Number(job.userId)}:`});
      if(all.size>60){const keys=[...all.entries()].sort((a,b)=>Number(a[1]?.finishedAt||0)-Number(b[1]?.finishedAt||0)).slice(0,all.size-50).map(x=>x[0]);if(keys.length)await this.state.storage.delete(keys)}
      return J({ok:true});
    }
    return super.fetch(req);
  }
}

async function startWithPlace(req:Request,env:Env,ctx?:Ctx){
  const r=await photoV14.fetch(req,env,ctx),data:any=await r.clone().json().catch(()=>null);
  if(!r.ok||!data?.ok||!data?.job)return r;
  const j=data.job;
  j.startPlace=await reversePlace(Number(j.start_location?.lat),Number(j.start_location?.lon)).catch(()=>j.address||'Адрес не определён');
  await putJob(env,j);data.job=j;return J(data,r.status);
}

async function historyApi(req:Request,env:Env){
  const auth=await authenticatedState(req,env);if(!auth.ok)return auth.response;
  const id=Number(auth.data?.employee?.id);if(!Number.isSafeInteger(id))return J({ok:false,error:'Не удалось определить сотрудника.'},401);
  const h=await stateCall(env,`/history?id=${id}`),jobs:any[]=h.jobs||[],current=auth.data?.job;
  if(current&&!jobs.some(x=>String(x.id)===String(current.id)))jobs.unshift(current);
  return J({ok:true,jobs:jobs.sort((a,b)=>Number(b.finishedAt||b.startedAt||0)-Number(a.finishedAt||a.startedAt||0)).slice(0,50)});
}

async function submitBefore(req:Request,env:Env,ctx?:Ctx){
  const auth=await authenticatedState(req,env);if(!auth.ok)return auth.response;
  const userId=Number(auth.data?.employee?.id),job=auth.data?.job;
  if(!Number.isSafeInteger(userId))return J({ok:false,error:'Не удалось определить сотрудника.'},401);
  if(!job||job.stage!=='started')return J({ok:false,error:'Этап ДО недоступен.'},409);
  let body:any;try{body=await req.json()}catch{body={}}
  const note=clean(body?.defect_note,600),files:MediaDraft[]=await drafts(env,userId,'before');
  if(files.length<MIN_FILES)return J({ok:false,error:`Добавьте минимум ${MIN_FILES} фото или видео ДО.`},400);
  const admins=adminIds(env);if(!admins.length)return J({ok:false,error:'Администратор ещё не настроен.'},503);
  const place=job.startPlace||await reversePlace(Number(job.start_location?.lat),Number(job.start_location?.lon)).catch(()=>job.address||'Адрес не определён');
  const acc=Math.round(Number(job.start_location?.accuracy||0));
  job.startPlace=place;job.stage='before_sent';job.beforeSentAt=Date.now();job.beforeCount=files.length;job.defectNote=note;job.reminded=false;
  await putJob(env,job);await clearDraftStage(env,userId,'before');await stateCall(env,'/schedule','POST',{});
  const afterUrl=String(job.appUrl||new URL(req.url).origin)+(String(job.appUrl||'').includes('?')?'&':'?')+'after=1';
  const summary=`🟡 <b>ЭТАП ДО ПРИНЯТ</b>\n━━━━━━━━━━━━\n👤 <b>Клиент:</b> ${esc(job.customer)}\n🏠 <b>Адрес объекта:</b> ${esc(job.address)}\n🧽 <b>Тип уборки:</b> ${esc(job.type)}\n🧑‍🔧 <b>Клинер:</b> ${esc(job.employeeName)}${job.employeeUsername?' (@'+esc(job.employeeUsername)+')':''}\n🕐 <b>Начало:</b> ${fmt(job.startedAt)}\n📍 <b>Где находится клинер:</b> ${esc(place)}\n🎯 <b>Точность GPS:</b> ±${acc} м${acc>30?' ⚠️':''}\n📎 <b>Материалы ДО:</b> ${files.length}\n${note?`⚠️ <b>Дефекты / замечания:</b> ${esc(note)}`:'✅ <b>Дефекты:</b> отдельно не указаны'}\n\n⏳ <b>Статус:</b> уборка в процессе.`;
  const delivery=(async()=>{for(const a of admins){await sendAlbum(env.TELEGRAM_BOT_TOKEN,a,files);await tgTimeout(env.TELEGRAM_BOT_TOKEN,'sendMessage',{chat_id:a,text:summary,parse_mode:'HTML'},8000).catch(e=>console.error('before summary',e))}await tgTimeout(env.TELEGRAM_BOT_TOKEN,'sendMessage',{chat_id:userId,text:'✅ <b>Фото/видео ДО принято</b>\n\nУборка зафиксирована. Выполните работу по регламенту, затем обязательно отправьте фото/видео <b>ПОСЛЕ</b>.',parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'📷 Перейти к фото ПОСЛЕ',web_app:{url:afterUrl},style:'success'}]]}},8000).catch(e=>console.error('before employee',e))})().catch(e=>console.error('before delivery',e));
  if(ctx?.waitUntil)ctx.waitUntil(delivery);else void delivery;
  return J({ok:true,job});
}

async function submitAfter(req:Request,env:Env,ctx?:Ctx){
  const auth=await authenticatedState(req,env);if(!auth.ok)return auth.response;
  const userId=Number(auth.data?.employee?.id),job=auth.data?.job;
  if(!Number.isSafeInteger(userId))return J({ok:false,error:'Не удалось определить сотрудника.'},401);
  if(job?.stage==='done'){await storeHistory(env,job);return J({ok:true,job,report_id:job.reportId||'',duration_text:durText(Math.max(0,Number(job.finishedAt||Date.now())-Number(job.startedAt||Date.now()))),already_done:true})}
  if(!job||job.stage!=='before_sent')return J({ok:false,error:'Сначала отправьте этап ДО.'},409);
  let body:any;try{body=await req.json()}catch{return J({ok:false,error:'Некорректные данные.'},400)}
  const lat=num(body?.lat),lon=num(body?.lon),accuracy=num(body?.accuracy);
  if(!validCoords(lat,lon))return J({ok:false,error:'Не удалось получить финальное местоположение.'},400);
  if(accuracy<=0||accuracy>10000)return J({ok:false,error:'Геопозиция недоступна. Повторите попытку.'},400);
  const files:MediaDraft[]=await drafts(env,userId,'after');if(files.length<MIN_FILES)return J({ok:false,error:`Добавьте минимум ${MIN_FILES} фото или видео ПОСЛЕ.`},400);
  const admins=adminIds(env);if(!admins.length)return J({ok:false,error:'Администратор ещё не настроен.'},503);
  const now=Date.now(),dur=Math.max(0,now-Number(job.startedAt||now)),dist=Math.round(haversine(Number(job.start_location?.lat),Number(job.start_location?.lon),lat,lon)),flags:string[]=[];
  if(dur<15*60*1000)flags.push('слишком короткое время уборки');if(dist>1000)flags.push('старт и финиш дальше 1 км');if(Number(job.start_location?.accuracy||0)>150||accuracy>150)flags.push('низкая точность GPS');
  const reportId='HC-'+new Date(now).toISOString().slice(2,10).replace(/-/g,'')+'-'+String(userId).slice(-4)+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
  const finishPlace=await reversePlace(lat,lon).catch(()=>job.address||'Адрес не определён');
  job.stage='done';job.finishedAt=now;job.end_location={lat,lon,accuracy};job.endPlace=finishPlace;job.afterCount=files.length;job.reportId=reportId;
  await putJob(env,job);await storeHistory(env,job);await clearDraftStage(env,userId,'after');
  const summary=`🟢 <b>УБОРКА ЗАВЕРШЕНА</b>\n━━━━━━━━━━━━\n👤 <b>Клиент:</b> ${esc(job.customer)}\n🏠 <b>Адрес объекта:</b> ${esc(job.address)}\n🧽 <b>Тип уборки:</b> ${esc(job.type)}\n🧑‍🔧 <b>Клинер:</b> ${esc(job.employeeName)}${job.employeeUsername?' (@'+esc(job.employeeUsername)+')':''}\n🕐 <b>Начало:</b> ${fmt(job.startedAt)}\n🏁 <b>Завершение:</b> ${fmt(now)}\n⏱ <b>Время работы:</b> ${durText(dur)}\n📍 <b>Место завершения:</b> ${esc(finishPlace)}\n🎯 <b>Точность GPS:</b> ±${Math.round(accuracy)} м${accuracy>30?' ⚠️':''}\n📎 <b>Материалы:</b> ДО ${job.beforeCount||0} · ПОСЛЕ ${files.length}\n${job.defectNote?`⚠️ <b>Замечания ДО:</b> ${esc(job.defectNote)}\n`:''}${flags.length?'🚩 <b>Требует внимания:</b> '+esc(flags.join('; ')):'✅ <b>Автопроверка:</b> явных несоответствий нет'}\n\n🆔 <b>Отчёт:</b> <code>${reportId}</code>`;
  const delivery=(async()=>{for(const a of admins){await sendAlbum(env.TELEGRAM_BOT_TOKEN,a,files);await tgTimeout(env.TELEGRAM_BOT_TOKEN,'sendMessage',{chat_id:a,text:summary,parse_mode:'HTML'},8000).catch(e=>console.error('after summary',e))}await tgTimeout(env.TELEGRAM_BOT_TOKEN,'sendMessage',{chat_id:userId,text:`✅ <b>Фотоотчёт завершён</b>\n\n👤 ${esc(job.customer)}\n⏱ Время работы: <b>${durText(dur)}</b>\n🆔 <code>${reportId}</code>`,parse_mode:'HTML'},8000).catch(e=>console.error('after employee',e))})().catch(e=>console.error('after delivery',e));
  if(ctx?.waitUntil)ctx.waitUntil(delivery);else void delivery;
  return J({ok:true,job,report_id:reportId,duration_text:durText(dur),distance_m:dist,flags});
}

async function webhookV15(req:Request,env:Env,origin:string){
  if(env.TELEGRAM_WEBHOOK_SECRET&&!safeEq(req.headers.get('X-Telegram-Bot-Api-Secret-Token')||'',env.TELEGRAM_WEBHOOK_SECRET))return new Response('Unauthorized',{status:401});
  let update:any;try{update=await req.clone().json()}catch{return new Response('OK')}
  const cb=update?.callback_query,m=update?.message,u:TgUser|undefined=cb?.from||m?.from;
  if(cb?.id&&u?.id){await tg(env.TELEGRAM_BOT_TOKEN,'answerCallbackQuery',{callback_query_id:cb.id}).catch(()=>null);await handleCallback(cb,env).catch(e=>console.error('callback v15',e));return new Response('OK')}
  if(!m?.chat?.id||!u?.id)return photoV14.fetch(req,env);
  const text=String(m.text||'').trim(),cmd=text.replace(/@\w+$/,'').toLowerCase();
  if(['/start','/menu','/webapp'].includes(cmd)||text==='🏠 Главное меню'){await ensureCallbacks(env,origin);await sendWelcome(env,m.chat.id,u,origin);return new Response('OK')}
  if(cmd==='/rules'||text==='📋 Правила'){await sendRules(env,m.chat.id);return new Response('OK')}
  if((cmd==='/admin'||text==='👥 Сотрудники')&&isAdmin(env,u.id)){await sendStaffMenu(env,m.chat.id);return new Response('OK')}
  return photoV14.fetch(req,env);
}

async function handleCallback(cb:any,env:Env){const id=Number(cb.from.id),chat=cb.message?.chat?.id||id,data=String(cb.data||'');if(data==='v15:rules')return sendRules(env,chat);if(data==='v15:staff'){if(!isAdmin(env,id))return send(env.TELEGRAM_BOT_TOKEN,chat,'🔒 Только для администратора.');return sendStaffMenu(env,chat)}if(!isAdmin(env,id))return;if(data==='v15:list')return sendEmployees(env,chat);if(['add','block','unblock','remove'].some(x=>data==='v15:'+x)){const action=data.split(':')[1];await stateCall(env,'/pending','POST',{id,action});const t=action==='add'?'Отправьте одним сообщением: <code>TELEGRAM_ID Имя Фамилия</code>':`Отправьте Telegram ID сотрудника для действия «${action==='block'?'заблокировать':action==='unblock'?'разблокировать':'удалить'}».`;return send(env.TELEGRAM_BOT_TOKEN,chat,t,{parse_mode:'HTML'})}}

async function sendWelcome(env:Env,chatId:string|number,user:TgUser,origin:string){
  const access=await accessFor(env,user.id);if(!access.allowed)return send(env.TELEGRAM_BOT_TOKEN,chatId,`🔒 <b>Доступ закрыт</b>\n\nВаш Telegram ID: <code>${user.id}</code>\nПередайте его администратору House Cleaning.`,{parse_mode:'HTML'});
  const job=(await stateCall(env,'/job?id='+user.id)).job||null,launch=await signLaunch({id:user.id,first_name:user.first_name||access.employee?.name||'',last_name:user.last_name||'',username:user.username||'',exp:Math.floor(Date.now()/1000)+12*60*60},env.TELEGRAM_BOT_TOKEN),appUrl=`${origin}/?launch=${encodeURIComponent(launch)}`;
  await tg(env.TELEGRAM_BOT_TOKEN,'setChatMenuButton',{chat_id:chatId,menu_button:{type:'web_app',text:'Фотоотчёты',web_app:{url:appUrl}}}).catch(()=>null);
  const active=job&&job.stage!=='done',label=active?'🧹 Открыть текущую уборку':'🧹 Начать фотоотчёт',status=!job||job.stage==='done'?'Готов к новой уборке':job.stage==='started'?'Ожидаются фото ДО':'Уборка в процессе — ожидаются фото ПОСЛЕ';
  const kb:any=[[{text:label,web_app:{url:appUrl},style:'success'}],[{text:'📋 Правила и регламент',callback_data:'v15:rules',style:'primary'}]];if(access.admin)kb.push([{text:'👥 Сотрудники',callback_data:'v15:staff',style:'danger'}]);
  return send(env.TELEGRAM_BOT_TOKEN,chatId,`🏠 <b>HOUSE CLEANING · РАБОЧИЙ БОТ</b>\n\n👤 <b>${esc(access.employee?.name||displayName(user))}</b>\n📌 ${esc(status)}\n\n<b>Порядок работы:</b>\n1️⃣ Клиент и адрес\n2️⃣ Фото/видео ДО + фиксация дефектов\n3️⃣ Уборка по регламенту\n4️⃣ Фото/видео ПОСЛЕ и завершение\n\nВсе незавершённые данные сохраняются — если закрыли приложение, просто откройте его снова.`,{parse_mode:'HTML',reply_markup:{inline_keyboard:kb}})
}

async function sendRules(env:Env,chat:string|number){return send(env.TELEGRAM_BOT_TOKEN,chat,`📋 <b>HOUSE CLEANING · ПРАВИЛА И РЕГЛАМЕНТ</b>\n\n<b>1. Перед уборкой</b>\n• Проверьте клиента, адрес и тип уборки.\n• Начинайте отчёт только находясь на объекте.\n• ДО начала основной уборки снимите состояние объекта.\n\n<b>2. Фотоотчёт ДО</b>\n• Общий вид + основные зоны.\n• Все сколы, царапины, пятна и повреждения фиксируются ДО.\n• Использовать старые материалы или фото другого объекта запрещено.\n\n<b>3. Регламент уборки</b>\n• Поверхности и загрязнения.\n• Полы, плинтусы, углы.\n• Санузел и мокрые зоны.\n• Кухонная / рабочая зона.\n• Финальный осмотр.\n\n<b>4. Фотоотчёт ПОСЛЕ</b>\n• Покажите реальный готовый результат.\n• По возможности повторите ракурсы ДО.\n• Не завершайте отчёт до финальной проверки.\n\n<b>5. Проблемы</b>\nСпор с клиентом, повреждение, дополнительная работа или другая нестандартная ситуация — сразу сообщите администратору.\n\n⚠️ Обязательный фотоотчёт является частью внутреннего регламента компании.`,{parse_mode:'HTML'})}

async function sendStaffMenu(env:Env,chat:string|number){return send(env.TELEGRAM_BOT_TOKEN,chat,'👑 <b>УПРАВЛЕНИЕ СОТРУДНИКАМИ</b>\nВыберите действие:',{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'➕ Добавить',callback_data:'v15:add',style:'success'},{text:'📋 Список',callback_data:'v15:list',style:'primary'}],[{text:'🚫 Заблокировать',callback_data:'v15:block',style:'danger'},{text:'✅ Разблокировать',callback_data:'v15:unblock',style:'success'}],[{text:'🗑 Удалить',callback_data:'v15:remove',style:'danger'}]]}})}
async function sendEmployees(env:Env,chat:string|number){const r=await stateCall(env,'/employees'),a:Employee[]=r.employees||[];return send(env.TELEGRAM_BOT_TOKEN,chat,a.length?'👥 <b>СОТРУДНИКИ</b>\n\n'+a.map((x,i)=>`${i+1}. ${x.status==='active'?'🟢':'🔴'} <b>${esc(x.name)}</b> · <code>${x.id}</code>`).join('\n'):'Список сотрудников пуст.',{parse_mode:'HTML'})}
async function ensureCallbacks(env:Env,origin:string){const body:any={url:origin.replace(/\/$/,'')+'/webhook',drop_pending_updates:false,allowed_updates:['message','callback_query']};if(env.TELEGRAM_WEBHOOK_SECRET)body.secret_token=env.TELEGRAM_WEBHOOK_SECRET;await tg(env.TELEGRAM_BOT_TOKEN,'setWebhook',body).catch(e=>console.error('setWebhook v15',e))}

async function accessFor(env:Env,id:number){const admin=isAdmin(env,id),r=await stateCall(env,'/employee?id='+id),employee:Employee|null=r.employee||null;return{allowed:admin||!!(employee&&employee.status==='active'),admin,employee}}
async function authenticatedState(req:Request,env:Env){const u=new URL(req.url);u.pathname='/api/state';u.search='';const r=await photoV14.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env);let data:any;try{data=await r.clone().json()}catch{return{ok:false,response:r,data:null}}return{ok:r.ok&&data?.ok!==false,response:r,data}}
async function drafts(env:Env,id:number,stage:string){const r=await stateCall(env,`/drafts?id=${id}&stage=${encodeURIComponent(stage)}`);return r.files||[]}
async function putJob(env:Env,job:any){await stateCall(env,'/job','POST',{job})}
async function storeHistory(env:Env,job:any){await stateCall(env,'/history','POST',{job})}
async function clearDraftStage(env:Env,id:number,stage:string){await stateCall(env,'/draft','POST',{action:'clear',userId:id,stage})}
async function stateCall(env:Env,path:string,method='GET',body?:unknown){const id=env.STATE.idFromName('global'),stub=env.STATE.get(id),init:any={method,headers:{'content-type':'application/json'}};if(body!==undefined)init.body=JSON.stringify(body);const r=await stub.fetch('https://state.local'+path,init);return await r.json() as any}

async function sendAlbum(token:string,chat:string,items:MediaDraft[]){for(let i=0;i<items.length;i+=10){const chunk=items.slice(i,i+10);if(chunk.length===1){const x=chunk[0];await tgTimeout(token,x.type==='video'?'sendVideo':'sendPhoto',x.type==='video'?{chat_id:chat,video:x.fileId,supports_streaming:true}:{chat_id:chat,photo:x.fileId},12000).catch(e=>console.error('single media',e));continue}const media=chunk.map(x=>x.type==='video'?{type:'video',media:x.fileId,supports_streaming:true}:{type:'photo',media:x.fileId});await tgTimeout(token,'sendMediaGroup',{chat_id:chat,media},15000).catch(async e=>{console.error('album fallback',e);for(const x of chunk)await tgTimeout(token,x.type==='video'?'sendVideo':'sendPhoto',x.type==='video'?{chat_id:chat,video:x.fileId,supports_streaming:true}:{chat_id:chat,photo:x.fileId},9000).catch(()=>null)})}}
async function reversePlace(lat:number,lon:number){if(!validCoords(lat,lon))throw new Error('bad coords');const c=new AbortController(),tm=setTimeout(()=>c.abort(),4500);try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1&accept-language=ru`,{headers:{'user-agent':'HouseCleaningSPB-WorkBot/1.0','accept':'application/json'},signal:c.signal}),x:any=await r.json();const a=x?.address||{},road=a.road||a.pedestrian||a.residential||a.neighbourhood||'',house=a.house_number||'',district=a.suburb||a.city_district||'',city=a.city||a.town||a.village||'';const parts=[road&&house?road+', '+house:road||house,district,city].filter(Boolean);return parts.join(', ')||String(x?.display_name||'').split(',').slice(0,4).join(', ')||'Адрес не определён'}finally{clearTimeout(tm)}}

async function tg(token:string,method:string,body:any){const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),x:any=await r.json();if(!r.ok||!x.ok)throw new Error(x?.description||'Telegram API error');return x}
async function tgTimeout(token:string,method:string,body:any,ms:number){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:c.signal}),x:any=await r.json();if(!r.ok||!x.ok)throw new Error(x?.description||'Telegram API error');return x}finally{clearTimeout(t)}}
async function send(token:string,chat:string|number,text:string,extra:any={}){return tg(token,'sendMessage',{chat_id:chat,text,...extra})}
function adminIds(env:Env){return String(env.ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)}function isAdmin(env:Env,id:number){return adminIds(env).includes(String(id))}
function displayName(u:TgUser){return[u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||('ID '+u.id)}function clean(v:any,max:number){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max)}function num(v:any){const n=Number(v);return Number.isFinite(n)?n:0}function validCoords(lat:any,lon:any){const a=Number(lat),b=Number(lon);return Number.isFinite(a)&&Number.isFinite(b)&&a>=-90&&a<=90&&b>=-180&&b<=180&&(a!==0||b!==0)}function esc(x:any){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}function fmt(ms:number){return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}function durText(ms:number){const m=Math.floor(ms/60000),h=Math.floor(m/60);return h?`${h} ч ${m%60} мин`:`${m} мин`}function haversine(a:number,b:number,c:number,d:number){if(![a,b,c,d].every(Number.isFinite))return 0;const R=6371000,r=(x:number)=>x*Math.PI/180,dp=r(c-a),dl=r(d-b),z=Math.sin(dp/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(z))}
async function signLaunch(user:any,token:string){const body=b64(new TextEncoder().encode(JSON.stringify(user))),sig=hex(await hmac(new TextEncoder().encode(token),new TextEncoder().encode('launch:'+body)));return body+'.'+sig}async function hmac(key:BufferSource,data:BufferSource){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data))}function hex(a:Uint8Array){return[...a].map(x=>x.toString(16).padStart(2,'0')).join('')}function b64(a:Uint8Array){let s='';a.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}function safeEq(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function J(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
