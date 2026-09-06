import { APP } from './app-v6';

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  ADMIN_IDS?: string;
  WEBAPP_URL?: string;
  SETUP_SECRET?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  STATE: DurableObjectNamespace;
}

type TgUser = { id:number; first_name?:string; last_name?:string; username?:string };
type Employee = { id:number; name:string; role:string; status:'active'|'blocked'; addedAt:number };
type Location = { lat:number; lon:number; accuracy:number };
type MediaDraft = { id:string; type:'photo'|'video'; fileId:string; name:string; size:number; addedAt:number };
type Job = {
  id:string; userId:number; employeeName:string; employeeUsername:string; customer:string; address:string; type:string;
  stage:'started'|'before_sent'|'done'; startedAt:number; start_location:Location; beforeSentAt?:number; defectNote?:string;
  beforeCount?:number; afterCount?:number; finishedAt?:number; end_location?:Location; reportId?:string; reminded?:boolean; appUrl:string;
};

type Access = { allowed:boolean; admin:boolean; employee:Employee|null };
const API=(t:string)=>`https://api.telegram.org/bot${t}`;
const MAX_FILE=20*1024*1024, MAX_FILES=20, MIN_FILES=2, GPS_MAX=150;

export default {
  async fetch(req:Request, env:Env):Promise<Response> {
    const url=new URL(req.url), appUrl=norm(env.WEBAPP_URL||url.origin);
    if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/app')) return new Response(APP,{headers:sec('text/html; charset=utf-8')});
    if(req.method==='GET'&&url.pathname==='/health') return J({ok:true,service:'house-cleaning-control-v6',storage:'durable-object',telegram:!!env.TELEGRAM_BOT_TOKEN,admins:adminIds(env).length,state:!!env.STATE,now:new Date().toISOString()});
    if(req.method==='GET'&&url.pathname==='/setup') return setup(url,env,appUrl);
    if(req.method==='POST'&&url.pathname==='/webhook'){
      if(env.TELEGRAM_WEBHOOK_SECRET&&!safeEq(req.headers.get('X-Telegram-Bot-Api-Secret-Token')||'',env.TELEGRAM_WEBHOOK_SECRET)) return new Response('Unauthorized',{status:401});
      try{await handleUpdate(await req.json(),env,appUrl)}catch(e){console.error('webhook',e)}
      return new Response('OK');
    }
    if(url.pathname.startsWith('/api/')){
      const user=await requireUser(req,env); if(!user) return J({ok:false,error:'Сессия Telegram устарела. Откройте приложение заново через бота.'},401);
      const access=await getAccess(env,user.id); if(!access.allowed) return J({ok:false,error:'Доступ разрешён только сотрудникам House Cleaning.'},403);
      if(req.method==='GET'&&url.pathname==='/api/state') return J({ok:true,employee:access.employee||{id:user.id,name:displayName(user),role:access.admin?'admin':'cleaner'},admin:access.admin,job:await getJob(env,user.id)});
      if(req.method==='POST'&&url.pathname==='/api/session/start') return startJob(req,env,user,access.employee,appUrl);
      if(req.method==='POST'&&url.pathname==='/api/media/draft') return uploadDraft(req,env,user);
      if(req.method==='GET'&&url.pathname==='/api/media/drafts') return listDrafts(url,env,user);
      if(req.method==='POST'&&url.pathname==='/api/media/draft/delete') return deleteDraft(req,env,user);
      if(req.method==='POST'&&url.pathname==='/api/before') return submitBefore(req,env,user,appUrl);
      if(req.method==='POST'&&url.pathname==='/api/after') return submitAfter(req,env,user);
      if(req.method==='POST'&&url.pathname==='/api/problem') return reportProblem(req,env,user);
    }
    if(req.method==='OPTIONS') return new Response(null,{status:204,headers:sec()});
    return new Response('Not found',{status:404});
  }
};

async function setup(url:URL,env:Env,appUrl:string){
  if(!env.SETUP_SECRET||!safeEq(url.searchParams.get('key')||'',env.SETUP_SECRET)) return J({ok:false,error:'Unauthorized'},401);
  if(!env.TELEGRAM_BOT_TOKEN) return J({ok:false,error:'TELEGRAM_BOT_TOKEN is not configured'},500);
  const webhook=appUrl.replace(/\/$/,'')+'/webhook';
  const wb:any={url:webhook,drop_pending_updates:false,allowed_updates:['message']}; if(env.TELEGRAM_WEBHOOK_SECRET) wb.secret_token=env.TELEGRAM_WEBHOOK_SECRET;
  const [a,b,c]=await Promise.all([
    tg(env.TELEGRAM_BOT_TOKEN,'setWebhook',wb),
    tg(env.TELEGRAM_BOT_TOKEN,'setChatMenuButton',{menu_button:{type:'web_app',text:'Фотоотчёт',web_app:{url:appUrl}}}),
    tg(env.TELEGRAM_BOT_TOKEN,'setMyCommands',{commands:[{command:'start',description:'Открыть рабочий бот'},{command:'rules',description:'Правила фотоотчёта'},{command:'myid',description:'Мой Telegram ID'},{command:'admin',description:'Сотрудники (админ)'}]})
  ]);
  return J({ok:true,webhook,webapp:appUrl,telegram:{webhook:a,menu:b,commands:c}});
}

async function handleUpdate(update:any,env:Env,appUrl:string){
  const m=update?.message; if(!m?.chat?.id)return;
  const user:TgUser=m.from||{id:Number(m.chat.id)}, text=String(m.text||'').trim(), lower=text.toLowerCase(), admin=isAdmin(env,user.id), access=await getAccess(env,user.id);
  if(lower==='/myid') return send(env.TELEGRAM_BOT_TOKEN,m.chat.id,`Ваш Telegram ID: <code>${user.id}</code>`,{parse_mode:'HTML'});
  if(lower==='/rules'||text==='📋 Правила') return sendRules(env,m.chat.id,access.allowed||admin,appUrl);
  if(admin&&(lower==='/admin'||text==='👥 Сотрудники')) return adminMenu(env,m.chat.id);
  if(admin&&text==='📋 Список сотрудников') return sendEmployees(env,m.chat.id);
  if(admin&&text==='➕ Добавить сотрудника'){await setPending(env,user.id,'add');return send(env.TELEGRAM_BOT_TOKEN,m.chat.id,'Отправьте одним сообщением:\n<code>TELEGRAM_ID Имя Фамилия</code>\n\nНапример: <code>123456789 Анна Иванова</code>',{parse_mode:'HTML'});}
  if(admin&&text==='🚫 Заблокировать'){await setPending(env,user.id,'block');return send(env.TELEGRAM_BOT_TOKEN,m.chat.id,'Отправьте Telegram ID сотрудника для блокировки.');}
  if(admin&&text==='✅ Разблокировать'){await setPending(env,user.id,'unblock');return send(env.TELEGRAM_BOT_TOKEN,m.chat.id,'Отправьте Telegram ID сотрудника для разблокировки.');}
  if(admin&&text==='🗑 Удалить сотрудника'){await setPending(env,user.id,'remove');return send(env.TELEGRAM_BOT_TOKEN,m.chat.id,'Отправьте Telegram ID сотрудника для удаления.');}
  if(admin&&text==='⬅️ Назад') return sendStart(env,m.chat.id,user,access,appUrl);
  if(admin){const pending=await getPending(env,user.id);if(pending&&text&&!text.startsWith('/')){await clearPending(env,user.id);return applyPending(env,m.chat.id,pending,text)}}
  if(lower==='/start'||lower==='/menu'||lower==='/webapp'||text==='🏠 Главное меню') return sendStart(env,m.chat.id,user,access,appUrl);
}

async function sendStart(env:Env,chatId:string|number,user:TgUser,access:Access,appUrl:string){
  if(!access.allowed&&!access.admin) return send(env.TELEGRAM_BOT_TOKEN,chatId,`🔒 <b>Доступ закрыт</b>\n\nБот предназначен только для сотрудников House Cleaning.\n\nВаш Telegram ID: <code>${user.id}</code>\nПередайте его администратору.`,{parse_mode:'HTML'});
  const job=await getJob(env,user.id); const status=!job||job.stage==='done'?'Нет активной уборки':job.stage==='started'?'Нужно отправить ДО':'Фото ДО принято — ожидаются материалы ПОСЛЕ';
  const keyboard:any=[[{text:job?.stage==='before_sent'?'📷 Продолжить: ПОСЛЕ':'🧹 Открыть фотоотчёт',web_app:{url:appUrl}}],[{text:'📋 Правила'}]]; if(access.admin)keyboard.push([{text:'👥 Сотрудники'}]);
  return send(env.TELEGRAM_BOT_TOKEN,chatId,`🏠 <b>HOUSE CLEANING · РАБОЧИЙ БОТ</b>\n\n👤 <b>Сотрудник:</b> ${esc(access.employee?.name||displayName(user))}\n📌 <b>Статус:</b> ${esc(status)}\n\n<b>Как работать:</b>\n1️⃣ Введите клиента и адрес.\n2️⃣ Отправьте фото/видео ДО. Дефекты обязательно снимите там же.\n3️⃣ Выполните уборку по регламенту.\n4️⃣ Обязательно отправьте фото/видео ПОСЛЕ.\n\n⚠️ По внутреннему регламенту компании: первый пропуск обязательного фотоотчёта — штраф, повторный — расторжение договора.`,{parse_mode:'HTML',reply_markup:{keyboard,resize_keyboard:true,is_persistent:true}});
}

async function sendRules(env:Env,chatId:string|number,allowed:boolean,appUrl:string){
  const kb=allowed?{keyboard:[[{text:'🧹 Открыть фотоотчёт',web_app:{url:appUrl}}],[{text:'🏠 Главное меню'}]],resize_keyboard:true}:undefined;
  return send(env.TELEGRAM_BOT_TOKEN,chatId,`📋 <b>ПРАВИЛА ФОТООТЧЁТА</b>\n\n1️⃣ Фото/видео ДО отправляются до начала основной уборки.\n2️⃣ Если есть сколы, царапины, пятна или другие повреждения — снимите их вместе с ДО.\n3️⃣ После уборки обязательно отправьте фото/видео ПОСЛЕ.\n4️⃣ Материалы должны соответствовать реальному объекту и этапу.\n5️⃣ Время, сотрудник и геопозиция фиксируются автоматически.\n6️⃣ Незавершённая уборка сохраняется и восстанавливается после повторного открытия бота.\n\n⚠️ <b>Внутренний регламент:</b> первый пропуск обязательного фотоотчёта — штраф, повторный — расторжение договора.`,{parse_mode:'HTML',reply_markup:kb});
}

async function adminMenu(env:Env,chatId:string|number){return send(env.TELEGRAM_BOT_TOKEN,chatId,'👑 <b>УПРАВЛЕНИЕ СОТРУДНИКАМИ</b>\n\nВыберите действие кнопкой ниже.',{parse_mode:'HTML',reply_markup:{keyboard:[[{text:'➕ Добавить сотрудника'},{text:'📋 Список сотрудников'}],[{text:'🚫 Заблокировать'},{text:'✅ Разблокировать'}],[{text:'🗑 Удалить сотрудника'}],[{text:'⬅️ Назад'}]],resize_keyboard:true}})}
async function applyPending(env:Env,chatId:string|number,action:string,text:string){
  if(action==='add'){const p=text.split(/\s+/),id=Number(p.shift()),name=p.join(' ').trim();if(!Number.isSafeInteger(id)||!name)return send(env.TELEGRAM_BOT_TOKEN,chatId,'Неверный формат. Нажмите «➕ Добавить сотрудника» и попробуйте ещё раз.');const e:Employee={id,name:name.slice(0,100),role:'cleaner',status:'active',addedAt:Date.now()};await stateCall(env,'/employee','POST',{action:'upsert',employee:e});await send(env.TELEGRAM_BOT_TOKEN,chatId,`✅ Добавлен: <b>${esc(e.name)}</b> · <code>${id}</code>`,{parse_mode:'HTML'});await send(env.TELEGRAM_BOT_TOKEN,id,'✅ Вам открыт доступ к рабочему боту House Cleaning. Отправьте /start.',{}).catch(()=>null);return}
  const id=Number(text.trim());if(!Number.isSafeInteger(id))return send(env.TELEGRAM_BOT_TOKEN,chatId,'Нужен цифровой Telegram ID.');const r=await stateCall(env,'/employee','POST',{action,id});if(!r.ok)return send(env.TELEGRAM_BOT_TOKEN,chatId,'Сотрудник не найден.');const label=action==='block'?'заблокирован':action==='unblock'?'разблокирован':'удалён';return send(env.TELEGRAM_BOT_TOKEN,chatId,`✅ Сотрудник ${label}: <code>${id}</code>`,{parse_mode:'HTML'});
}
async function sendEmployees(env:Env,chatId:string|number){const r=await stateCall(env,'/employees');const a:Employee[]=r.employees||[];if(!a.length)return send(env.TELEGRAM_BOT_TOKEN,chatId,'Список сотрудников пуст.');return send(env.TELEGRAM_BOT_TOKEN,chatId,'👥 <b>СОТРУДНИКИ</b>\n\n'+a.map((x,i)=>`${i+1}. ${x.status==='active'?'🟢':'🔴'} <b>${esc(x.name)}</b> · <code>${x.id}</code>`).join('\n'),{parse_mode:'HTML'})}

async function startJob(req:Request,env:Env,user:TgUser,employee:Employee|null,appUrl:string){
  const current=await getJob(env,user.id); if(current&&current.stage!=='done') return J({ok:false,error:'У вас уже есть незавершённая уборка. Продолжите её.'},409);
  let x:any;try{x=await req.json()}catch{return J({ok:false,error:'Некорректные данные'},400)}
  const customer=clean(x.customer,100),address=clean(x.address,180),type=clean(x.cleaning_type,80)||'Не указан',lat=num(x.lat),lon=num(x.lon),accuracy=num(x.accuracy);
  if(!customer)return J({ok:false,error:'Укажите имя клиента.'},400);if(!address)return J({ok:false,error:'Укажите адрес.'},400);if(!coords(lat,lon))return J({ok:false,error:'Не удалось получить координаты.'},400);if(accuracy<=0||accuracy>GPS_MAX)return J({ok:false,error:`Геопозиция недостаточно точная (±${Math.round(accuracy)} м). Подойдите к окну или выйдите на улицу и повторите.`},400);
  const now=Date.now(),job:Job={id:'JOB-'+now.toString(36).toUpperCase()+'-'+String(user.id).slice(-4),userId:user.id,employeeName:employee?.name||displayName(user),employeeUsername:user.username||'',customer,address,type,stage:'started',startedAt:now,start_location:{lat,lon,accuracy},appUrl};
  await putJob(env,job);await clearDraftStage(env,user.id,'before');await clearDraftStage(env,user.id,'after');
  return J({ok:true,job});
}

async function uploadDraft(req:Request,env:Env,user:TgUser){
  const job=await getJob(env,user.id);if(!job||job.stage==='done')return J({ok:false,error:'Сначала начните уборку.'},409);
  let form:FormData;try{form=await req.formData()}catch{return J({ok:false,error:'Не удалось прочитать файл.'},400)}
  const stage=String(form.get('stage')||'');if(stage!=='before'&&stage!=='after')return J({ok:false,error:'Неизвестный этап.'},400);if(stage==='before'&&job.stage!=='started')return J({ok:false,error:'Этап ДО уже закрыт.'},409);if(stage==='after'&&job.stage!=='before_sent')return J({ok:false,error:'Сначала отправьте ДО.'},409);
  const f=form.get('media');if(!(f instanceof File))return J({ok:false,error:'Файл не найден.'},400);if(!f.type.startsWith('image/')&&!f.type.startsWith('video/'))return J({ok:false,error:'Разрешены только фото и видео.'},400);if(f.size<=0||f.size>MAX_FILE)return J({ok:false,error:'Максимальный размер одного файла — 20 МБ.'},400);
  const existing=await drafts(env,user.id,stage);if(existing.length>=MAX_FILES)return J({ok:false,error:`Максимум ${MAX_FILES} файлов на этап.`},400);
  const mediaType:'photo'|'video'=f.type.startsWith('video/')?'video':'photo';const saved=await saveTelegramDraft(env,user.id,f,mediaType);const item:MediaDraft={id:crypto.randomUUID(),type:mediaType,fileId:saved.fileId,name:clean(f.name,120)||(mediaType==='video'?'video.mp4':'photo.jpg'),size:f.size,addedAt:Date.now()};
  await stateCall(env,'/draft','POST',{action:'add',userId:user.id,stage,item});return J({ok:true,file:{id:item.id,type:item.type,name:item.name,size:item.size}});
}
async function saveTelegramDraft(env:Env,chatId:number,file:File,type:'photo'|'video'){const fd=new FormData();fd.append('chat_id',String(chatId));fd.append(type,file,file.name||(type==='video'?'video.mp4':'photo.jpg'));fd.append('disable_notification','true');const method=type==='video'?'sendVideo':'sendPhoto';const r=await fetch(`${API(env.TELEGRAM_BOT_TOKEN)}/${method}`,{method:'POST',body:fd});const x:any=await r.json();if(!r.ok||!x.ok)throw new Error('Telegram не смог сохранить файл. Попробуйте файл меньшего размера.');const msg=x.result;const fileId=type==='video'?msg?.video?.file_id:msg?.photo?.[msg.photo.length-1]?.file_id;if(!fileId)throw new Error('Не удалось сохранить файл.');if(msg?.message_id)await tg(env.TELEGRAM_BOT_TOKEN,'deleteMessage',{chat_id:chatId,message_id:msg.message_id}).catch(()=>null);return{fileId}}
async function listDrafts(url:URL,env:Env,user:TgUser){const stage=url.searchParams.get('stage')||'';if(stage!=='before'&&stage!=='after')return J({ok:false,error:'Неизвестный этап'},400);const a=await drafts(env,user.id,stage);return J({ok:true,files:a.map(x=>({id:x.id,type:x.type,name:x.name,size:x.size,addedAt:x.addedAt}))})}
async function deleteDraft(req:Request,env:Env,user:TgUser){let x:any;try{x=await req.json()}catch{return J({ok:false,error:'Некорректные данные'},400)}const stage=String(x.stage||''),id=String(x.id||'');if(!['before','after'].includes(stage)||!id)return J({ok:false,error:'Некорректные данные'},400);await stateCall(env,'/draft','POST',{action:'delete',userId:user.id,stage,id});return J({ok:true})}

async function submitBefore(req:Request,env:Env,user:TgUser,appUrl:string){
  const job=await getJob(env,user.id);if(!job||job.stage!=='started')return J({ok:false,error:'Этап ДО недоступен.'},409);let x:any;try{x=await req.json()}catch{x={}}const note=clean(x.defect_note,600);const files=await drafts(env,user.id,'before');if(files.length<MIN_FILES)return J({ok:false,error:`Добавьте минимум ${MIN_FILES} фото или видео ДО.`},400);const admins=adminIds(env);if(!admins.length)return J({ok:false,error:'Администратор ещё не настроен.'},503);
  const summary=`🟡 <b>ДО · УБОРКА НАЧАТА</b>\n\n🆔 <b>${esc(job.id)}</b>\n👤 <b>Клиент:</b> ${esc(job.customer)}\n📍 <b>Адрес:</b> ${esc(job.address)}\n🧽 <b>Тип:</b> ${esc(job.type)}\n🧑‍🔧 <b>Клинер:</b> ${esc(job.employeeName)}${job.employeeUsername?' (@'+esc(job.employeeUsername)+')':''}\n🔐 <b>Telegram ID:</b> <code>${user.id}</code>\n🕐 <b>Старт:</b> ${fmt(job.startedAt)}\n📌 <b>GPS:</b> ${job.start_location.lat.toFixed(6)}, ${job.start_location.lon.toFixed(6)} · ±${Math.round(job.start_location.accuracy)} м\n📷 <b>Материалов ДО:</b> ${files.length}${note?`\n⚠️ <b>Дефекты / замечания:</b> ${esc(note)}`:'\n✅ <b>Дефекты:</b> отдельно не указаны'}`;
  try{for(const a of admins){await send(env.TELEGRAM_BOT_TOKEN,a,summary,{parse_mode:'HTML'});await tg(env.TELEGRAM_BOT_TOKEN,'sendLocation',{chat_id:a,latitude:job.start_location.lat,longitude:job.start_location.lon});await sendMediaIds(env.TELEGRAM_BOT_TOKEN,a,files,'ДО · '+job.id)}}catch(e){console.error(e);return J({ok:false,error:'Не удалось доставить этап ДО администратору.'},502)}
  job.stage='before_sent';job.beforeSentAt=Date.now();job.beforeCount=files.length;job.defectNote=note;job.reminded=false;await putJob(env,job);await clearDraftStage(env,user.id,'before');await scheduleReminder(env);
  await send(env.TELEGRAM_BOT_TOKEN,user.id,`✅ <b>Фото/видео ДО принято</b>\n\nТеперь выполните уборку по регламенту:\n🧽 поверхности\n🧹 полы и плинтусы\n🚿 санузел / мокрые зоны\n🍽 кухонная зона\n👀 финальный осмотр\n\n⚠️ После завершения обязательно отправьте фото/видео <b>ПОСЛЕ</b>.`,{parse_mode:'HTML',reply_markup:{keyboard:[[{text:'📷 Продолжить: ПОСЛЕ',web_app:{url:appUrl}}],[{text:'📋 Правила'}]],resize_keyboard:true,is_persistent:true}}).catch(()=>null);
  return J({ok:true,job});
}

async function submitAfter(req:Request,env:Env,user:TgUser){
  const job=await getJob(env,user.id);if(!job||job.stage!=='before_sent')return J({ok:false,error:'Сначала отправьте этап ДО.'},409);let x:any;try{x=await req.json()}catch{return J({ok:false,error:'Некорректные данные'},400)}const lat=num(x.lat),lon=num(x.lon),accuracy=num(x.accuracy);if(!coords(lat,lon))return J({ok:false,error:'Не удалось получить финальные координаты.'},400);if(accuracy<=0||accuracy>GPS_MAX)return J({ok:false,error:`Геопозиция недостаточно точная (±${Math.round(accuracy)} м). Повторите определение места.`},400);const files=await drafts(env,user.id,'after');if(files.length<MIN_FILES)return J({ok:false,error:`Добавьте минимум ${MIN_FILES} фото или видео ПОСЛЕ.`},400);const admins=adminIds(env);if(!admins.length)return J({ok:false,error:'Администратор ещё не настроен.'},503);
  const now=Date.now(),dur=Math.max(0,now-job.startedAt),dist=Math.round(haversine(job.start_location.lat,job.start_location.lon,lat,lon)),flags:string[]=[];if(dur<15*60*1000)flags.push('слишком короткое время уборки');if(dist>1000)flags.push('старт и финиш дальше 1 км');if(job.start_location.accuracy>100||accuracy>100)flags.push('GPS средней точности');const reportId='HC-'+new Date(now).toISOString().slice(2,10).replace(/-/g,'')+'-'+String(user.id).slice(-4)+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
  const summary=`🟢 <b>ПОСЛЕ · УБОРКА ЗАВЕРШЕНА</b>\n\n🆔 <b>${esc(reportId)}</b>\n👤 <b>Клиент:</b> ${esc(job.customer)}\n📍 <b>Адрес:</b> ${esc(job.address)}\n🧑‍🔧 <b>Клинер:</b> ${esc(job.employeeName)}${job.employeeUsername?' (@'+esc(job.employeeUsername)+')':''}\n🔐 <b>Telegram ID:</b> <code>${user.id}</code>\n🕐 <b>Начало:</b> ${fmt(job.startedAt)}\n🏁 <b>Завершение:</b> ${fmt(now)}\n⏱ <b>Время работы:</b> ${durText(dur)}\n📌 <b>GPS финиша:</b> ${lat.toFixed(6)}, ${lon.toFixed(6)} · ±${Math.round(accuracy)} м\n📏 <b>Смещение:</b> ${dist} м\n📷 <b>ДО:</b> ${job.beforeCount||0} · <b>ПОСЛЕ:</b> ${files.length}\n${job.defectNote?`⚠️ <b>Замечания ДО:</b> ${esc(job.defectNote)}\n`:''}${flags.length?'🚩 <b>ПРОВЕРИТЬ:</b> '+esc(flags.join('; ')):'✅ <b>Автопроверка:</b> явных несоответствий нет'}`;
  try{for(const a of admins){await send(env.TELEGRAM_BOT_TOKEN,a,summary,{parse_mode:'HTML'});await tg(env.TELEGRAM_BOT_TOKEN,'sendLocation',{chat_id:a,latitude:lat,longitude:lon});await sendMediaIds(env.TELEGRAM_BOT_TOKEN,a,files,'ПОСЛЕ · '+reportId)}}catch(e){console.error(e);return J({ok:false,error:'Не удалось доставить этап ПОСЛЕ администратору.'},502)}
  job.stage='done';job.finishedAt=now;job.end_location={lat,lon,accuracy};job.afterCount=files.length;job.reportId=reportId;await putJob(env,job);await clearDraftStage(env,user.id,'after');
  await send(env.TELEGRAM_BOT_TOKEN,user.id,`✅ <b>Фотоотчёт завершён</b>\n\nКлиент: ${esc(job.customer)}\nВремя работы: <b>${durText(dur)}</b>\nID: <code>${reportId}</code>`,{parse_mode:'HTML'}).catch(()=>null);
  return J({ok:true,job,report_id:reportId,duration_text:durText(dur),distance_m:dist,flags});
}

async function reportProblem(req:Request,env:Env,user:TgUser){let x:any;try{x=await req.json()}catch{return J({ok:false,error:'Некорректные данные'},400)}const text=clean(x.text,500);if(!text)return J({ok:false,error:'Опишите проблему.'},400);const job=await getJob(env,user.id);for(const a of adminIds(env))await send(env.TELEGRAM_BOT_TOKEN,a,`🆘 <b>ПРОБЛЕМА У КЛИНЕРА</b>\n\n🧑‍🔧 ${esc(displayName(user))} · <code>${user.id}</code>${job?`\n👤 ${esc(job.customer)}\n📍 ${esc(job.address)}`:''}\n\n${esc(text)}`,{parse_mode:'HTML'}).catch(()=>null);return J({ok:true})}

async function sendMediaIds(token:string,chatId:string,items:MediaDraft[],label:string){for(let i=0;i<items.length;i+=10){const part=items.slice(i,i+10);if(part.length===1){const x=part[0],method=x.type==='video'?'sendVideo':'sendPhoto';await tg(token,method,{chat_id:chatId,[x.type]:x.fileId,caption:i?label+' · продолжение':label});continue}await tg(token,'sendMediaGroup',{chat_id:chatId,media:part.map((x,n)=>({type:x.type,media:x.fileId,...(n===0?{caption:i?label+' · продолжение':label}:{})}))})}}

async function requireUser(req:Request,env:Env){if(!env.TELEGRAM_BOT_TOKEN)return null;return auth(req.headers.get('X-Telegram-Init-Data')||'',env.TELEGRAM_BOT_TOKEN)}
async function getAccess(env:Env,id:number):Promise<Access>{const admin=isAdmin(env,id);const r=await stateCall(env,'/employee?id='+id);const e:Employee|null=r.employee||null;return{allowed:admin||!!(e&&e.status==='active'),admin,employee:e}}
function isAdmin(env:Env,id:number){return adminIds(env).includes(String(id))}function adminIds(env:Env){return String(env.ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)}
async function getJob(env:Env,id:number):Promise<Job|null>{const r=await stateCall(env,'/job?id='+id);return r.job||null}async function putJob(env:Env,job:Job){await stateCall(env,'/job','POST',{job})}async function drafts(env:Env,id:number,stage:string):Promise<MediaDraft[]>{const r=await stateCall(env,`/drafts?id=${id}&stage=${encodeURIComponent(stage)}`);return r.files||[]}async function clearDraftStage(env:Env,id:number,stage:string){await stateCall(env,'/draft','POST',{action:'clear',userId:id,stage})}
async function setPending(env:Env,id:number,action:string){await stateCall(env,'/pending','POST',{id,action})}async function getPending(env:Env,id:number){const r=await stateCall(env,'/pending?id='+id);return r.action||''}async function clearPending(env:Env,id:number){await stateCall(env,'/pending','POST',{id,action:''})}
async function scheduleReminder(env:Env){await stateCall(env,'/schedule','POST',{})}
async function stateCall(env:Env,path:string,method='GET',body?:unknown){const id=env.STATE.idFromName('global'),stub=env.STATE.get(id),init:any={method,headers:{'content-type':'application/json'}};if(body!==undefined)init.body=JSON.stringify(body);const r=await stub.fetch('https://state.local'+path,init);return await r.json() as any}

export class AppState {
  state:DurableObjectState;env:Env;constructor(state:DurableObjectState,env:Env){this.state=state;this.env=env}
  async fetch(req:Request){const u=new URL(req.url);if(u.pathname==='/employee'&&req.method==='GET'){const id=Number(u.searchParams.get('id'));return J({ok:true,employee:await this.state.storage.get<Employee>('employee:'+id)||null})}if(u.pathname==='/employees'){const all=await this.state.storage.list<Employee>({prefix:'employee:'});return J({ok:true,employees:[...all.values()]})}if(u.pathname==='/employee'&&req.method==='POST'){const x:any=await req.json();if(x.action==='upsert'){await this.state.storage.put('employee:'+x.employee.id,x.employee);return J({ok:true})}const k='employee:'+Number(x.id),e=await this.state.storage.get<Employee>(k);if(!e)return J({ok:false});if(x.action==='remove'){await this.state.storage.delete(k);return J({ok:true})}if(x.action==='block'||x.action==='unblock'){e.status=x.action==='block'?'blocked':'active';await this.state.storage.put(k,e);return J({ok:true})}return J({ok:false},400)}
    if(u.pathname==='/job'&&req.method==='GET'){const id=Number(u.searchParams.get('id'));return J({ok:true,job:await this.state.storage.get<Job>('job:'+id)||null})}if(u.pathname==='/job'&&req.method==='POST'){const x:any=await req.json();await this.state.storage.put('job:'+x.job.userId,x.job);return J({ok:true})}
    if(u.pathname==='/drafts'){const id=Number(u.searchParams.get('id')),stage=String(u.searchParams.get('stage')||'');return J({ok:true,files:await this.state.storage.get<MediaDraft[]>(`draft:${id}:${stage}`)||[]})}if(u.pathname==='/draft'&&req.method==='POST'){const x:any=await req.json(),k=`draft:${Number(x.userId)}:${String(x.stage)}`,a=await this.state.storage.get<MediaDraft[]>(k)||[];if(x.action==='add'){a.push(x.item);await this.state.storage.put(k,a);return J({ok:true})}if(x.action==='delete'){await this.state.storage.put(k,a.filter(v=>v.id!==x.id));return J({ok:true})}if(x.action==='clear'){await this.state.storage.delete(k);return J({ok:true})}return J({ok:false},400)}
    if(u.pathname==='/pending'&&req.method==='GET'){const id=Number(u.searchParams.get('id'));return J({ok:true,action:await this.state.storage.get<string>('pending:'+id)||''})}if(u.pathname==='/pending'&&req.method==='POST'){const x:any=await req.json();if(x.action)await this.state.storage.put('pending:'+x.id,String(x.action));else await this.state.storage.delete('pending:'+x.id);return J({ok:true})}
    if(u.pathname==='/schedule'&&req.method==='POST'){const current=await this.state.storage.getAlarm();const next=Date.now()+3*60*60*1000;if(!current||current>next)await this.state.storage.setAlarm(next);return J({ok:true})}
    return J({ok:false,error:'not found'},404)}
  async alarm(){const all=await this.state.storage.list<Job>({prefix:'job:'}),now=Date.now();let future:number|undefined;for(const [k,j] of all){if(j.stage!=='before_sent'||!j.beforeSentAt)continue;const due=j.beforeSentAt+3*60*60*1000;if(due<=now&&!j.reminded){await send(this.env.TELEGRAM_BOT_TOKEN,j.userId,`⏰ <b>Напоминание House Cleaning</b>\n\nПо объекту <b>${esc(j.customer)}</b> фото ДО уже принято. После завершения уборки обязательно отправьте фото/видео ПОСЛЕ.`,{parse_mode:'HTML',reply_markup:{keyboard:[[{text:'📷 Продолжить: ПОСЛЕ',web_app:{url:j.appUrl}}]],resize_keyboard:true}}).catch(()=>null);for(const a of adminIds(this.env))await send(this.env.TELEGRAM_BOT_TOKEN,a,`⏰ Клинер <b>${esc(j.employeeName)}</b> ещё не завершил фотоотчёт ПОСЛЕ.\nОбъект: ${esc(j.customer)} · ${esc(j.address)}`,{parse_mode:'HTML'}).catch(()=>null);j.reminded=true;await this.state.storage.put(k,j)}else if(!j.reminded)future=future===undefined?due:Math.min(future,due)}if(future)await this.state.storage.setAlarm(future)}
}

async function tg(token:string,method:string,body:any){const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),x:any=await r.json();if(!r.ok||!x.ok)throw new Error(x?.description||'Telegram API error');return x}async function send(token:string,chat:string|number,text:string,extra:any={}){return tg(token,'sendMessage',{chat_id:chat,text,...extra})}
async function auth(raw:string,token:string):Promise<TgUser|null>{if(!raw)return null;try{const p=new URLSearchParams(raw),hash=p.get('hash')||'',authDate=Number(p.get('auth_date')||0);if(!hash||!authDate||Math.abs(Date.now()/1000-authDate)>21600)return null;p.delete('hash');const pairs:Array<[string,string]>=[];p.forEach((v,k)=>pairs.push([k,v]));pairs.sort((a,b)=>a[0].localeCompare(b[0]));const data=pairs.map(([k,v])=>k+'='+v).join('\n');const secret=await hmac(new TextEncoder().encode('WebAppData'),new TextEncoder().encode(token));const expected=hex(await hmac(secret,new TextEncoder().encode(data)));if(!safeEq(expected,hash))return null;const u=JSON.parse(p.get('user')||'null');return u?.id?u:null}catch{return null}}
async function hmac(key:BufferSource,data:BufferSource){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data))}function hex(a:Uint8Array){return[...a].map(x=>x.toString(16).padStart(2,'0')).join('')}function safeEq(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function clean(v:any,max:number){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max)}function num(v:any){const n=Number(v);return Number.isFinite(n)?n:0}function coords(lat:number,lon:number){return lat>=-90&&lat<=90&&lon>=-180&&lon<=180&&(lat!==0||lon!==0)}function displayName(u:TgUser){return [u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||('ID '+u.id)}function norm(x:string){return x.replace(/\/$/,'')+'/'}function esc(x:any){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}function fmt(ms:number){return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}function durText(ms:number){const m=Math.floor(ms/60000),h=Math.floor(m/60);return h?`${h} ч ${m%60} мин`:`${m} мин`}function haversine(a:number,b:number,c:number,d:number){const R=6371000,r=(x:number)=>x*Math.PI/180,dp=r(c-a),dl=r(d-b),z=Math.sin(dp/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(z))}function sec(type?:string){const h:any={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','permissions-policy':'camera=(self), geolocation=(self), microphone=(self)'};if(type)h['content-type']=type;return h}function J(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:sec('application/json; charset=utf-8')})}
