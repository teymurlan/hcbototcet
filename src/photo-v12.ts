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

  // Only the two menu pages below are handled here. Everything else stays on v11.
  if(req.method==='GET'&&url.pathname==='/bot/rules')return rulesPage();
  if(req.method==='GET'&&url.pathname==='/bot/employees')return employeesPage(req,env);
  if(req.method==='POST'&&url.pathname==='/bot/employees/action')return employeesAction(req,env);

  if(req.method!=='POST'||url.pathname!=='/webhook')return photoV11.fetch(req,env);
  let update:any; try{update=await req.clone().json()}catch{return photoV11.fetch(req,env)}
  const cb=update?.callback_query;
  if(cb?.from?.id){
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
 const keyboard:any=[[{text:openText,web_app:{url:appUrl}}],[{text:'📋 Правила',url:`${origin}/bot/rules`}]];
 if(access.admin){const sig=await signAdminPage(user.id,env.TELEGRAM_BOT_TOKEN);keyboard.push([{text:'👥 Сотрудники',url:`${origin}/bot/employees?admin=${user.id}&sig=${encodeURIComponent(sig)}`}]);}
 return send(env.TELEGRAM_BOT_TOKEN,chatId,`🏠 <b>HOUSE CLEANING · РАБОЧИЙ БОТ</b>\n\n👤 <b>Сотрудник:</b> ${esc(employeeName)}\n📌 <b>Статус:</b> ${esc(status)}\n\n<b>Как работать:</b>\n1️⃣ Укажите клиента и адрес.\n2️⃣ Отправьте фото/видео ДО.\n3️⃣ Выполните уборку по регламенту.\n4️⃣ После завершения обязательно отправьте фото/видео ПОСЛЕ.\n\n⚠️ Первый пропуск обязательного фотоотчёта — штраф, повторный — расторжение договора.`,{parse_mode:'HTML',reply_markup:{inline_keyboard:keyboard}})
}

function rulesPage(){return html(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Правила House Cleaning</title>${pageCss()}</head><body><main><div class="card"><h1>📋 Правила фотоотчёта</h1><div class="rule">1️⃣ Фото/видео ДО отправляются до основной уборки.</div><div class="rule">2️⃣ Дефекты и повреждения обязательно фиксируются вместе с ДО.</div><div class="rule">3️⃣ После завершения уборки обязательно отправляются фото/видео ПОСЛЕ.</div><div class="rule">4️⃣ Время, сотрудник и GPS фиксируются автоматически.</div><div class="rule">5️⃣ Незавершённая уборка сохраняется и восстанавливается.</div><div class="warn">⚠️ Первый пропуск обязательного фотоотчёта — штраф, повторный — расторжение договора.</div></div></main></body></html>`)}

async function employeesPage(req:Request,env:Env){
 const u=new URL(req.url),admin=Number(u.searchParams.get('admin')),sig=u.searchParams.get('sig')||'';
 if(!Number.isSafeInteger(admin)||!isAdmin(env,admin)||!(await verifyAdminPage(admin,sig,env.TELEGRAM_BOT_TOKEN)))return html('<h2>🔒 Нет доступа</h2><p>Откройте раздел сотрудников заново через /start.</p>',403);
 const r=await stateCall(env,'/employees');const employees:Employee[]=r.employees||[];
 const rows=employees.length?employees.map(e=>`<div class="emp"><div><b>${escHtml(e.name)}</b><small>${e.id}</small></div><span class="${e.status==='active'?'on':'off'}">${e.status==='active'?'Активен':'Заблокирован'}</span></div>`).join(''):'<p>Сотрудников пока нет.</p>';
 const hidden=`<input type="hidden" name="admin" value="${admin}"><input type="hidden" name="sig" value="${escHtml(sig)}">`;
 return html(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Сотрудники</title>${pageCss()}</head><body><main><div class="card"><h1>👥 Сотрудники</h1>${rows}</div><div class="card"><h2>➕ Добавить</h2><form method="post" action="/bot/employees/action">${hidden}<input type="hidden" name="action" value="add"><input name="employee_id" inputmode="numeric" placeholder="Telegram ID" required><input name="name" placeholder="Имя Фамилия" required><button>Добавить сотрудника</button></form></div><div class="card"><h2>Управление</h2><form method="post" action="/bot/employees/action">${hidden}<input name="employee_id" inputmode="numeric" placeholder="Telegram ID" required><div class="actions"><button name="action" value="block">🚫 Заблокировать</button><button name="action" value="unblock">✅ Разблокировать</button><button class="danger" name="action" value="remove">🗑 Удалить</button></div></form></div></main></body></html>`)}

async function employeesAction(req:Request,env:Env){
 const fd=await req.formData();const admin=Number(fd.get('admin')),sig=String(fd.get('sig')||''),action=String(fd.get('action')||''),id=Number(fd.get('employee_id')),name=String(fd.get('name')||'').trim();
 if(!Number.isSafeInteger(admin)||!isAdmin(env,admin)||!(await verifyAdminPage(admin,sig,env.TELEGRAM_BOT_TOKEN)))return html('<h2>🔒 Нет доступа</h2>',403);
 if(!Number.isSafeInteger(id))return html('<h2>Некорректный Telegram ID</h2>',400);
 if(action==='add'){if(!name)return html('<h2>Укажите имя сотрудника</h2>',400);const employee:Employee={id,name,role:'cleaner',status:'active',addedAt:Date.now()};await stateCall(env,'/employee','POST',{action:'upsert',employee});}
 else if(['block','unblock','remove'].includes(action))await stateCall(env,'/employee','POST',{action,id});
 else return html('<h2>Неизвестное действие</h2>',400);
 const loc=`/bot/employees?admin=${admin}&sig=${encodeURIComponent(sig)}`;return new Response(null,{status:303,headers:{location:loc,'cache-control':'no-store'}})
}

function pageCss(){return `<style>:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d1420;color:#f8fafc}main{max-width:680px;margin:auto;padding:16px}.card{background:#141d2b;border:1px solid #273448;border-radius:20px;padding:18px;margin-bottom:14px}h1,h2{margin:0 0 14px}.rule,.emp{padding:13px;border:1px solid #273448;border-radius:14px;margin:9px 0;background:#101824}.warn{padding:14px;border-radius:14px;background:#3a2d0c;color:#ffe9a6;margin-top:14px}.emp{display:flex;align-items:center;justify-content:space-between;gap:12px}.emp small{display:block;color:#9ba7b6;margin-top:4px}.on{color:#32d583}.off{color:#f97066}input,button{width:100%;padding:14px;border-radius:13px;border:1px solid #344054;background:#101824;color:#fff;font:inherit;margin-top:9px}button{background:#079455;border:0;font-weight:800}.actions{display:grid;gap:8px}.danger{background:#b42318}</style>`}
function html(body:string,status=200){return new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}

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
async function signAdminPage(id:number,token:string){return hex(await hmac(new TextEncoder().encode(token),new TextEncoder().encode('admin-page:'+id)))}
async function verifyAdminPage(id:number,sig:string,token:string){if(!sig)return false;const expected=await signAdminPage(id,token);return safeEq(expected,sig)}
async function signLaunch(user:TgUser,token:string){const payload={id:user.id,first_name:user.first_name||'',last_name:user.last_name||'',username:user.username||'',exp:Math.floor(Date.now()/1000)+12*60*60};const body=b64(new TextEncoder().encode(JSON.stringify(payload)));const sig=hex(await hmac(new TextEncoder().encode(token),new TextEncoder().encode('launch:'+body)));return body+'.'+sig}
async function hmac(key:BufferSource,data:BufferSource){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data))}
function safeEq(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function b64(a:Uint8Array){let s='';a.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function hex(a:Uint8Array){return[...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
function displayName(u:TgUser){return [u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||('ID '+u.id)}
function esc(x:any){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
function escHtml(x:any){return esc(x)}
async function tg(token:string,method:string,body:any){const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),x:any=await r.json();if(!r.ok||!x.ok)throw new Error(x?.description||'Telegram API error');return x}
async function send(token:string,chat:string|number,text:string,extra:any={}){return tg(token,'sendMessage',{chat_id:chat,text,...extra})}
