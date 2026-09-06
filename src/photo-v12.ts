import photoV11 from './photo-v11';
import type { Env } from './photo-v11';
export { AppState } from './photo-v11';
export type { Env } from './photo-v11';

const API=(t:string)=>`https://api.telegram.org/bot${t}`;
type TgUser={id:number;first_name?:string;last_name?:string;username?:string};
type Employee={id:number;name:string;role:string;status:'active'|'blocked';addedAt:number};

export default {
 async fetch(req:Request,env:Env):Promise<Response>{
  const url=new URL(req.url);
  if(req.method!=='POST'||url.pathname!=='/webhook')return photoV11.fetch(req,env);
  let update:any; try{update=await req.clone().json()}catch{return photoV11.fetch(req,env)}
  const cb=update?.callback_query;
  if(cb?.from?.id){
   // Acknowledge immediately so Telegram never shows an endless spinner.
   await tg(env.TELEGRAM_BOT_TOKEN,'answerCallbackQuery',{callback_query_id:cb.id}).catch(()=>null);
   await handleCallback(cb,env,url.origin).catch(async e=>{console.error('v12 callback',e);const chatId=cb.message?.chat?.id||cb.from.id;await send(env.TELEGRAM_BOT_TOKEN,chatId,'⚠️ Не удалось выполнить действие. Нажмите /start и попробуйте ещё раз.').catch(()=>null)});
   return new Response('OK');
  }
  const m=update?.message;
  if(!m?.chat?.id||!m?.from?.id)return photoV11.fetch(req,env);
  const user:TgUser=m.from,text=String(m.text||'').trim(),command=text.replace(/@\w+$/,'').toLowerCase();
  if(['/start','/menu','/webapp'].includes(command)||text==='🏠 Главное меню'){await sendStartV12(env,m.chat.id,user,url.origin);return new Response('OK')}
  if(command==='/rules'||text==='📋 Правила'){await sendRulesV12(env,m.chat.id);return new Response('OK')}
  if(command==='/admin'||text==='👥 Сотрудники'){if(isAdmin(env,user.id))await sendAdminV12(env,m.chat.id);else await send(env.TELEGRAM_BOT_TOKEN,m.chat.id,'🔒 Управление сотрудниками доступно только администратору.');return new Response('OK')}
  if(text==='🧹 Открыть фотоотчёт'||text==='📷 Продолжить: ПОСЛЕ'){await sendFreshOpenButton(env,m.chat.id,user,url.origin,text.includes('ПОСЛЕ'));return new Response('OK')}
  return photoV11.fetch(req,env);
 }
};

async function sendStartV12(env:Env,chatId:string|number,user:TgUser,origin:string){
 const access=await getAccess(env,user.id);
 if(!access.allowed){await removeOldKeyboard(env,chatId);return send(env.TELEGRAM_BOT_TOKEN,chatId,`🔒 <b>Доступ закрыт</b>\n\nБот доступен только сотрудникам House Cleaning.\n\nВаш Telegram ID: <code>${user.id}</code>\nПередайте этот ID администратору.`,{parse_mode:'HTML'})}
 const job=await getJob(env,user.id),launch=await signLaunch(user,env.TELEGRAM_BOT_TOKEN),appUrl=`${origin}/?launch=${encodeURIComponent(launch)}`;
 await tg(env.TELEGRAM_BOT_TOKEN,'setChatMenuButton',{chat_id:chatId,menu_button:{type:'web_app',text:'Фотоотчёты',web_app:{url:appUrl}}}).catch(()=>null); await removeOldKeyboard(env,chatId);
 const status=!job||job.stage==='done'?'Нет активной уборки':job.stage==='started'?'Нужно отправить фото/видео ДО':'Фото ДО принято — уборка в процессе',employeeName=access.employee?.name||displayName(user),openText=job?.stage==='before_sent'?'🧹 Открыть текущую уборку':'🧹 Открыть фотоотчёт';
 // Rules/admin are URL buttons to webhook-independent HTTP endpoints. No callback spinner possible.
 const keyboard:any=[[{text:openText,web_app:{url:appUrl}}],[{text:'📋 Правила',url:`${origin}/bot/rules`}]];
 if(access.admin)keyboard.push([{text:'👥 Сотрудники',url:`${origin}/bot/employees?admin=${user.id}`}]);
 return send(env.TELEGRAM_BOT_TOKEN,chatId,`🏠 <b>HOUSE CLEANING · РАБОЧИЙ БОТ</b>\n\n👤 <b>Сотрудник:</b> ${esc(employeeName)}\n📌 <b>Статус:</b> ${esc(status)}\n\n<b>Как работать:</b>\n1️⃣ Укажите клиента и адрес.\n2️⃣ Отправьте фото/видео ДО.\n3️⃣ Выполните уборку по регламенту.\n4️⃣ После завершения обязательно отправьте фото/видео ПОСЛЕ.\n\n⚠️ Первый пропуск обязательного фотоотчёта — штраф, повторный — расторжение договора.`,{parse_mode:'HTML',reply_markup:{inline_keyboard:keyboard}})
}

async function sendFreshOpenButton(env:Env,chatId:string|number,user:TgUser,origin:string,forceAfter:boolean){const access=await getAccess(env,user.id);if(!access.allowed)return send(env.TELEGRAM_BOT_TOKEN,chatId,`🔒 Доступ закрыт. Ваш Telegram ID: <code>${user.id}</code>`,{parse_mode:'HTML'});const job=await getJob(env,user.id),launch=await signLaunch(user,env.TELEGRAM_BOT_TOKEN);let appUrl=`${origin}/?launch=${encodeURIComponent(launch)}`;if(forceAfter&&job?.stage==='before_sent')appUrl+='&after=1';return send(env.TELEGRAM_BOT_TOKEN,chatId,'🔐 Создана новая персональная кнопка входа:',{reply_markup:{inline_keyboard:[[{text:forceAfter?'📷 Перейти к фото ПОСЛЕ':'🧹 Открыть приложение',web_app:{url:appUrl}}]]}})}
async function sendRulesV12(env:Env,chatId:string|number){return send(env.TELEGRAM_BOT_TOKEN,chatId,`📋 <b>ПРАВИЛА ФОТООТЧЁТА</b>\n\n1️⃣ ДО отправляется до основной уборки.\n2️⃣ Все дефекты и повреждения фиксируются вместе с ДО.\n3️⃣ После уборки обязательно отправляется ПОСЛЕ.\n4️⃣ Время, сотрудник и GPS фиксируются автоматически.\n5️⃣ Незавершённая уборка сохраняется и восстанавливается.\n\n⚠️ Первый пропуск обязательного фотоотчёта — штраф, повторный — расторжение договора.`,{parse_mode:'HTML'})}
async function handleCallback(cb:any,env:Env,origin:string){const id=Number(cb.from.id),chatId=cb.message?.chat?.id||id,data=String(cb.data||'');if(['v12:rules','rules','show_rules'].includes(data))return sendRulesV12(env,chatId);if(['v12:admin','admin','employees','staff'].includes(data)){if(isAdmin(env,id))return sendAdminV12(env,chatId);return send(env.TELEGRAM_BOT_TOKEN,chatId,'🔒 Управление сотрудниками доступно только администратору.')}if(!isAdmin(env,id))return;if(['v12:employees','employee_list','list_employees'].includes(data))return sendEmployeesV12(env,chatId);if(data==='v12:add'){await setPending(env,id,'add');return send(env.TELEGRAM_BOT_TOKEN,chatId,'➕ Отправьте одним сообщением:\n<code>TELEGRAM_ID Имя Фамилия</code>',{parse_mode:'HTML'})}if(data==='v12:block'){await setPending(env,id,'block');return send(env.TELEGRAM_BOT_TOKEN,chatId,'🚫 Отправьте Telegram ID сотрудника для блокировки.')}if(data==='v12:unblock'){await setPending(env,id,'unblock');return send(env.TELEGRAM_BOT_TOKEN,chatId,'✅ Отправьте Telegram ID сотрудника для разблокировки.')}if(data==='v12:remove'){await setPending(env,id,'remove');return send(env.TELEGRAM_BOT_TOKEN,chatId,'🗑 Отправьте Telegram ID сотрудника для удаления.')}}
async function sendAdminV12(env:Env,chatId:string|number){return send(env.TELEGRAM_BOT_TOKEN,chatId,'👑 <b>УПРАВЛЕНИЕ СОТРУДНИКАМИ</b>\n\nВыберите действие:',{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'➕ Добавить сотрудника',callback_data:'v12:add'}],[{text:'📋 Список сотрудников',callback_data:'v12:employees'}],[{text:'🚫 Заблокировать',callback_data:'v12:block'},{text:'✅ Разблокировать',callback_data:'v12:unblock'}],[{text:'🗑 Удалить сотрудника',callback_data:'v12:remove'}]]}})}
async function sendEmployeesV12(env:Env,chatId:string|number){const r=await stateCall(env,'/employees');const a:Employee[]=r.employees||[];if(!a.length)return send(env.TELEGRAM_BOT_TOKEN,chatId,'Список сотрудников пуст.');return send(env.TELEGRAM_BOT_TOKEN,chatId,'👥 <b>СОТРУДНИКИ</b>\n\n'+a.map((x,i)=>`${i+1}. ${x.status==='active'?'🟢':'🔴'} <b>${esc(x.name)}</b> · <code>${x.id}</code>`).join('\n'),{parse_mode:'HTML'})}
async function removeOldKeyboard(env:Env,chatId:string|number){try{const x=await send(env.TELEGRAM_BOT_TOKEN,chatId,'Обновляем рабочее меню…',{reply_markup:{remove_keyboard:true}});const mid=x?.result?.message_id;if(mid)await tg(env.TELEGRAM_BOT_TOKEN,'deleteMessage',{chat_id:chatId,message_id:mid}).catch(()=>null)}catch{}}
async function getAccess(env:Env,id:number){const admin=isAdmin(env,id),r=await stateCall(env,'/employee?id='+id),employee:Employee|null=r.employee||null;return{allowed:admin||!!(employee&&employee.status==='active'),admin,employee}}
async function getJob(env:Env,id:number){const r=await stateCall(env,'/job?id='+id);return r.job||null}
async function setPending(env:Env,id:number,action:string){await stateCall(env,'/pending','POST',{id,action})}
async function stateCall(env:Env,path:string,method='GET',body?:unknown){const id=env.STATE.idFromName('global'),stub=env.STATE.get(id),init:any={method,headers:{'content-type':'application/json'}};if(body!==undefined)init.body=JSON.stringify(body);const r=await stub.fetch('https://state.local'+path,init);return await r.json() as any}
function isAdmin(env:Env,id:number){return String(env.ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean).includes(String(id))}
async function signLaunch(user:TgUser,token:string){const payload={id:user.id,first_name:user.first_name||'',last_name:user.last_name||'',username:user.username||'',exp:Math.floor(Date.now()/1000)+12*60*60};const body=b64(new TextEncoder().encode(JSON.stringify(payload)));const sig=hex(await hmac(new TextEncoder().encode(token),new TextEncoder().encode('launch:'+body)));return body+'.'+sig}
async function hmac(key:BufferSource,data:BufferSource){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data))}
function b64(a:Uint8Array){let s='';a.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function hex(a:Uint8Array){return[...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
function displayName(u:TgUser){return [u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||('ID '+u.id)}
function esc(x:any){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
async function tg(token:string,method:string,body:any){const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),x:any=await r.json();if(!r.ok||!x.ok)throw new Error(x?.description||'Telegram API error');return x}
async function send(token:string,chat:string|number,text:string,extra:any={}){return tg(token,'sendMessage',{chat_id:chat,text,...extra})}
