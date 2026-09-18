import staffV4, { AppState as V4AppState } from './staff-v4';
import type { Env } from './staff-v4';
import { STAFF_V5_APP } from './staff-v5-ui';

export type { Env } from './staff-v4';

type BroadcastState = {
  phase:'waiting'|'confirm';
  chat_id?:number;
  message_id?:number;
  preview?:string;
  kind?:string;
  updated_at:number;
};

export class AppState extends V4AppState {
  async fetch(req:Request):Promise<Response>{
    const u=new URL(req.url);
    if(u.pathname==='/ops5/broadcast-state'&&req.method==='GET'){
      const id=positiveInt(u.searchParams.get('id'));
      return J({ok:true,state:id?await this.state.storage.get<BroadcastState>(`ops5:broadcast:${id}`)||null:null});
    }
    if(u.pathname==='/ops5/broadcast-state'&&req.method==='POST'){
      const x:any=await readBody(req),id=positiveInt(x.id);
      if(!id)return J({ok:false,error:'Некорректный Telegram ID'},400);
      const key=`ops5:broadcast:${id}`;
      if(x.action==='clear'){await this.state.storage.delete(key);return J({ok:true})}
      const phase=x.phase==='confirm'?'confirm':'waiting';
      const state:BroadcastState={phase,chat_id:positiveInt(x.chat_id)||undefined,message_id:positiveInt(x.message_id)||undefined,preview:clean(x.preview,300),kind:clean(x.kind,40),updated_at:Date.now()};
      await this.state.storage.put(key,state);
      return J({ok:true,state});
    }
    return super.fetch(req);
  }
}

const BUILD = 'staff-v5-registration-nav-2026-09-16-a';
type TgUser = { id: number; first_name?: string; last_name?: string; username?: string };

export default {
  async fetch(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const u = new URL(req.url);
    if (req.method === 'GET' && u.pathname === '/__hc_staff_version') return J({ ok: true, build: BUILD, staff: true, onboarding: true, notifications: true, forced_registration: true, modern_nav: true });
    if (req.method === 'GET' && ['/staff', '/staff/', '/admin'].includes(u.pathname)) return html(STAFF_V5_APP);
    if (req.method === 'POST' && u.pathname === '/webhook') return webhookV5(req, env, ctx);
    return staffV4.fetch(req, env, ctx as any);
  },
  async scheduled(controller: any, env: Env, ctx: ExecutionContext): Promise<void> {
    return staffV4.scheduled(controller, env, ctx);
  },
};

async function webhookV5(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const secret=String((env as any).TELEGRAM_WEBHOOK_SECRET||'');
  if(secret&&!safeEq(req.headers.get('X-Telegram-Bot-Api-Secret-Token')||'',secret))return new Response('Unauthorized',{status:401});

  const copy=req.clone();let up:any;try{up=await req.json()}catch{return staffV4.fetch(copy,env,ctx as any)}
  const m=up?.message,cb=up?.callback_query,user:TgUser|undefined=m?.from||cb?.from;
  if(!user?.id)return staffV4.fetch(copy,env,ctx as any);

  const admin=isAdmin(env,user.id);
  const chatId=Number(m?.chat?.id||cb?.message?.chat?.id||0);
  const text=String(m?.text||'').trim();
  const cmd=text.replace(/@\w+$/,'').toLowerCase();

  if(admin&&cb?.id){
    const data=String(cb.data||'');
    if(['v5:broadcast','v5:broadcast_send','v5:broadcast_cancel'].includes(data)){
      await tg(env,'answerCallbackQuery',{callback_query_id:cb.id}).catch(()=>null);
      if(data==='v5:broadcast')await showBroadcastPrompt(env,chatId,user,new URL(req.url).origin);
      else if(data==='v5:broadcast_send')await sendBroadcastState(env,chatId,user,new URL(req.url).origin);
      else await cancelBroadcast(env,chatId,user,new URL(req.url).origin);
      return new Response('OK');
    }
  }

  if(admin&&chatId){
    const state=await getBroadcastState(env,user.id);

    if(cmd==='/cancel'&&state){
      await clearBroadcastState(env,user.id);
      await sendAdminHome(env,chatId,user,new URL(req.url).origin,'Рассылка отменена.');
      return new Response('OK');
    }

    if(state?.phase==='waiting'&&m&&!text.startsWith('/')){
      await stateCall(env,'/ops5/broadcast-state','POST',{
        id:user.id,phase:'confirm',chat_id:chatId,message_id:Number(m.message_id),
        preview:broadcastPreview(m),kind:broadcastKind(m)
      });
      const ids=await broadcastRecipients(env,user.id);
      await tg(env,'sendMessage',{
        chat_id:chatId,
        text:`📣 <b>Проверьте рассылку</b>\n\nПолучателей: <b>${ids.length}</b>\nТип: <b>${esc(broadcastKind(m))}</b>${broadcastPreview(m)?`\nСодержимое: <i>${esc(broadcastPreview(m))}</i>`:''}\n\nОтправить это сообщение всем?`,
        parse_mode:'HTML',
        reply_markup:{inline_keyboard:[
          [{text:'✅ Отправить всем',callback_data:'v5:broadcast_send'}],
          [{text:'✏️ Изменить сообщение',callback_data:'v5:broadcast'}],
          [{text:'❌ Отмена',callback_data:'v5:broadcast_cancel'}]
        ]}
      });
      return new Response('OK');
    }

    if((cmd==='/broadcast'||text==='📣 Рассылка всем')){
      await showBroadcastPrompt(env,chatId,user,new URL(req.url).origin);
      return new Response('OK');
    }

    if(['/start','/menu'].includes(cmd)){
      await sendAdminHome(env,chatId,user,new URL(req.url).origin);
      return new Response('OK');
    }
  }

  if(!m?.chat?.id||!user?.id||!['/start','/menu'].includes(cmd)||admin)return staffV4.fetch(copy,env,ctx as any);

  const er=await stateCall(env,`/employee?id=${user.id}`).catch(()=>({employee:null})),employee=er.employee||null;
  if(!employee||employee.status!=='active')return staffV4.fetch(copy,env,ctx as any);
  const pr=await stateCall(env,`/ops3/employee?id=${user.id}`).catch(()=>({employee:null})),profile=pr.employee||null;
  if(profile?.source!=='legacy')return staffV4.fetch(copy,env,ctx as any);

  const launch=await signLaunch(user,String((env as any).TELEGRAM_BOT_TOKEN||''));
  const url=`${new URL(req.url).origin}/staff?launch=${encodeURIComponent(launch)}&onboarding=1`;
  await tg(env,'sendMessage',{
    chat_id:m.chat.id,
    text:`👋 <b>Обновление HOUSE CLEANING STAFF</b>\n\n${esc(profile?.name||displayName(user))}, теперь у каждого сотрудника единый рабочий профиль. Пройдите короткую регистрацию, затем регламент и обучение. Старые данные не удаляются.`,
    parse_mode:'HTML',
    reply_markup:{inline_keyboard:[[{text:'📝 Пройти регистрацию',web_app:{url}}]]},
  }).catch(()=>null);
  await tg(env,'setChatMenuButton',{chat_id:m.chat.id,menu_button:{type:'web_app',text:'HOUSE CLEANING STAFF',web_app:{url}}}).catch(()=>null);
  return new Response('OK');
}

async function sendAdminHome(env:Env,chatId:number,user:TgUser,origin:string,note=''){
  const launch=await signLaunch(user,String((env as any).TELEGRAM_BOT_TOKEN||''));
  const staffUrl=`${origin}/staff?launch=${encodeURIComponent(launch)}`;
  const reportsUrl=`${origin}/?launch=${encodeURIComponent(launch)}`;
  await tg(env,'setMyCommands',{scope:{type:'chat',chat_id:chatId},commands:[
    {command:'start',description:'Главное меню'},
    {command:'broadcast',description:'Рассылка всем пользователям'},
    {command:'admin',description:'Кабинет руководителя'},
    {command:'cancel',description:'Отменить текущее действие'}
  ]}).catch(()=>null);
  await tg(env,'sendMessage',{
    chat_id:chatId,
    text:`🏢 <b>HOUSE CLEANING STAFF</b>\n\nКабинет руководителя: заказы, сотрудники, фотоотчёты и контроль работы.${note?`\n\n✅ ${esc(note)}`:''}`,
    parse_mode:'HTML',
    reply_markup:{inline_keyboard:[
      [{text:'📣 Рассылка всем',callback_data:'v5:broadcast'}],
      [{text:'📲 Открыть кабинет руководителя',web_app:{url:staffUrl}}],
      [{text:'📸 Фотоотчёты',web_app:{url:reportsUrl}}],
      [{text:'📋 Правила и регламент',callback_data:'v17:rules'}]
    ]}
  }).catch(()=>null);
  await tg(env,'setChatMenuButton',{chat_id:chatId,menu_button:{type:'web_app',text:'HOUSE CLEANING STAFF',web_app:{url:staffUrl}}}).catch(()=>null);
}

async function showBroadcastPrompt(env:Env,chatId:number,user:TgUser,origin:string){
  await clearBroadcastState(env,user.id);
  await stateCall(env,'/ops5/broadcast-state','POST',{id:user.id,phase:'waiting'});
  const ids=await broadcastRecipients(env,user.id);
  await tg(env,'sendMessage',{
    chat_id:chatId,
    text:`📣 <b>Рассылка всем пользователям</b>\n\nПолучателей сейчас: <b>${ids.length}</b>\n\nОтправьте следующим сообщением текст, фото, видео или документ. Перед отправкой всем бот обязательно спросит подтверждение.`,
    parse_mode:'HTML',
    reply_markup:{inline_keyboard:[[{text:'❌ Отмена',callback_data:'v5:broadcast_cancel'}]]}
  }).catch(()=>null);
}

async function sendBroadcastState(env:Env,chatId:number,user:TgUser,origin:string){
  const state=await getBroadcastState(env,user.id);
  if(!state||state.phase!=='confirm'||!state.chat_id||!state.message_id){
    await showBroadcastPrompt(env,chatId,user,origin);
    return;
  }
  const ids=await broadcastRecipients(env,user.id);
  let sent=0,failed=0;
  await tg(env,'sendMessage',{chat_id:chatId,text:`📤 Отправляю рассылку… Получателей: ${ids.length}`}).catch(()=>null);
  const results=await Promise.allSettled(ids.map(id=>tg(env,'copyMessage',{chat_id:id,from_chat_id:state.chat_id,message_id:state.message_id})));
  for(const r of results){if(r.status==='fulfilled'&&r.value)sent++;else failed++}
  const at=Date.now();
  await stateCall(env,'/opsnotify/broadcast-log','POST',{
    id:crypto.randomUUID(),at,created_by:user.id,audience:'all_team',title:'Ручная рассылка из Telegram',
    body:state.preview||state.kind||'Сообщение',requested:ids.length,sent,failed,employee_ids:ids
  }).catch(()=>null);
  await clearBroadcastState(env,user.id);
  await tg(env,'sendMessage',{
    chat_id:chatId,
    text:`✅ <b>Рассылка завершена</b>\n\nПолучателей: <b>${ids.length}</b>\nДоставлено: <b>${sent}</b>\nОшибок: <b>${failed}</b>`,
    parse_mode:'HTML',
    reply_markup:{inline_keyboard:[
      [{text:'📣 Новая рассылка',callback_data:'v5:broadcast'}],
      [{text:'🏠 Главное меню',callback_data:'v5:broadcast_cancel'}]
    ]}
  }).catch(()=>null);
}

async function cancelBroadcast(env:Env,chatId:number,user:TgUser,origin:string){
  await clearBroadcastState(env,user.id);
  await sendAdminHome(env,chatId,user,origin,'Рассылка отменена.');
}

async function broadcastRecipients(env:Env,currentAdmin:number){
  const x=await stateCall(env,'/ops3/employees').catch(()=>({employees:[]})),rows:any[]=Array.isArray(x?.employees)?x.employees:[];
  const ids=rows.filter(e=>e&&e.status==='active').map(e=>positiveInt(e.id||e.telegram_id)).filter(Boolean);
  for(const raw of adminIds(env)){const id=positiveInt(raw);if(id)ids.push(id)}
  return [...new Set(ids)].filter(id=>id!==currentAdmin).slice(0,200);
}

async function getBroadcastState(env:Env,id:number){
  const x=await stateCall(env,`/ops5/broadcast-state?id=${id}`).catch(()=>({state:null}));
  return x?.state as BroadcastState|null;
}
async function clearBroadcastState(env:Env,id:number){await stateCall(env,'/ops5/broadcast-state','POST',{id,action:'clear'}).catch(()=>null)}
function broadcastPreview(m:any){return clean(m?.text||m?.caption||m?.document?.file_name||'',260)}
function broadcastKind(m:any){if(m?.photo)return'Фото';if(m?.video)return'Видео';if(m?.document)return'Документ';if(m?.animation)return'Анимация';if(m?.voice)return'Голосовое сообщение';if(m?.audio)return'Аудио';if(m?.sticker)return'Стикер';return m?.text?'Текст':'Сообщение'}


async function stateCall(env:Env,path:string,method='GET',body?:any){const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id),r=await stub.fetch('https://state.local'+path,{method,headers:body===undefined?undefined:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return await r.json().catch(()=>({})) as any}
function adminIds(env: Env) { return String((env as any).ADMIN_IDS || '').split(',').map(x => x.trim()).filter(Boolean); }
function isAdmin(env: Env, id: number) { return adminIds(env).includes(String(id)); }
async function tg(env: Env, method: string, body: any) { const token = String((env as any).TELEGRAM_BOT_TOKEN || ''); if (!token) return null; const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const x: any = await r.json().catch(() => ({})); if (!r.ok || !x.ok) throw new Error(x?.description || 'Telegram API error'); return x.result; }
async function signLaunch(user: TgUser, token: string) { const payload = { id: user.id, first_name: user.first_name || '', last_name: user.last_name || '', username: user.username || '', exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60 }, body = b64(new TextEncoder().encode(JSON.stringify(payload))), sig = hex(await hmac(new TextEncoder().encode(token), new TextEncoder().encode('launch:' + body))); return body + '.' + sig; }
async function hmac(key: BufferSource, data: BufferSource) { const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, data)); }
function b64(a: Uint8Array) { let s = ''; a.forEach(x => s += String.fromCharCode(x)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function hex(a: Uint8Array) { return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); }
function safeEq(a: string, b: string) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
function displayName(u: TgUser) { return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || `ID ${u.id}`; }
function esc(v: any) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)); }
function J(data: any, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function html(s: string) { return new Response(s, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, no-cache, must-revalidate', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' } }); }
