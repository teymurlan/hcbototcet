import photoV17, { AppState as BaseAppState } from './photo-v17';
import type { Env } from './photo-v17';
export type { Env } from './photo-v17';
export class AppState extends BaseAppState {}

type TgUser={id:number;first_name?:string;last_name?:string;username?:string};
type Employee={id:number;name:string;role:string;status:'active'|'blocked';addedAt:number};
const API=(t:string)=>`https://api.telegram.org/bot${t}`;

export default{
  async fetch(req:Request,env:Env,ctx?:ExecutionContext):Promise<Response>{
    const u=new URL(req.url);
    if(req.method!=='POST'||u.pathname!=='/webhook')return photoV17.fetch(req,env,ctx);
    if(env.TELEGRAM_WEBHOOK_SECRET&&!safeEq(req.headers.get('X-Telegram-Bot-Api-Secret-Token')||'',env.TELEGRAM_WEBHOOK_SECRET))return new Response('Unauthorized',{status:401});
    const copy=req.clone();let up:any;try{up=await req.json()}catch{return photoV17.fetch(copy,env,ctx)}
    const m=up?.message,user:TgUser|undefined=m?.from;
    if(!m?.chat?.id||!user?.id)return photoV17.fetch(copy,env,ctx);
    const text=String(m.text||'').trim(),cmd=text.replace(/@\w+$/,'').toLowerCase();
    if(!(['/start','/menu','/webapp'].includes(cmd)||text==='🏠 Главное меню'))return photoV17.fetch(copy,env,ctx);
    try{
      await safeHome(env,m.chat.id,user,u.origin);
      await tgTimeout(env.TELEGRAM_BOT_TOKEN,'deleteMessage',{chat_id:m.chat.id,message_id:m.message_id},4000).catch(()=>null);
    }catch(e){
      console.error('start hotfix',e);
      await tgTimeout(env.TELEGRAM_BOT_TOKEN,'sendMessage',{chat_id:m.chat.id,text:'Не удалось открыть главное меню. Сообщение /start оставлено — попробуйте ещё раз через несколько секунд.'},5000).catch(()=>null);
    }
    return new Response('OK');
  }
};

async function safeHome(env:Env,chat:string|number,user:TgUser,origin:string){
  const access=await accessFor(env,user.id);
  if(!access.allowed){
    const text=`🔒 <b>Доступ закрыт</b>\n\nВаш Telegram ID: <code>${user.id}</code>\nПередайте его администратору House Cleaning.`;
    await sendFreshMenu(env,chat,user.id,text,{parse_mode:'HTML'});
    return;
  }
  const job=(await stateCall(env,'/job?id='+user.id)).job||null;
  const launch=await signLaunch(user,env.TELEGRAM_BOT_TOKEN),appUrl=`${origin}/?launch=${encodeURIComponent(launch)}`;
  const label=job&&job.stage!=='done'?'🧹 Открыть текущую уборку':'🧹 Начать фотоотчёт';
  const status=!job||job.stage==='done'?'Готов к новой уборке':job.stage==='started'?'Ожидаются фото ДО':'Уборка в процессе — ожидаются фото ПОСЛЕ';
  const keyboard:any=[[{text:label,web_app:{url:appUrl},style:'success'}],[{text:'📋 Правила и регламент',callback_data:'v17:rules',style:'primary'}]];
  if(access.admin)keyboard.push([{text:'👥 Сотрудники и админ-панель',callback_data:'v17:staff',style:'danger'}]);
  const text=`🏠 <b>HOUSE CLEANING · РАБОЧИЙ БОТ</b>\n\n👤 <b>${esc(access.employee?.name||displayName(user))}</b>\n📌 ${esc(status)}\n\n<b>Порядок работы:</b>\n1️⃣ Клиент и адрес\n2️⃣ Фото/видео ДО + фиксация дефектов\n3️⃣ Уборка по регламенту\n4️⃣ Фото/видео ПОСЛЕ и завершение\n\nВсе незавершённые данные сохраняются — если закрыли приложение, просто откройте его снова.`;
  await sendFreshMenu(env,chat,user.id,text,{parse_mode:'HTML',reply_markup:{inline_keyboard:keyboard}});
  void tgTimeout(env.TELEGRAM_BOT_TOKEN,'setChatMenuButton',{chat_id:chat,menu_button:{type:'web_app',text:'Фотоотчёты',web_app:{url:appUrl}}},6000).catch(()=>null);
}

async function sendFreshMenu(env:Env,chat:string|number,userId:number,text:string,extra:any){
  const old=Number((await getUi(env,userId))?.messageId||0);
  const x=await tgWithStyleFallback(env.TELEGRAM_BOT_TOKEN,'sendMessage',{chat_id:chat,text,...extra},6500);
  const id=Number(x?.result?.message_id||0);
  if(!id)throw new Error('Telegram did not return menu message id');
  await setUi(env,userId,id);
  if(old&&old!==id)await tgTimeout(env.TELEGRAM_BOT_TOKEN,'deleteMessage',{chat_id:chat,message_id:old},4000).catch(()=>null);
}

async function tgWithStyleFallback(token:string,method:string,body:any,ms:number){
  try{return await tgTimeout(token,method,body,ms)}catch(first){
    const cleanBody=stripStyles(structuredClone(body));
    try{return await tgTimeout(token,method,cleanBody,ms)}catch(second){throw second||first}
  }
}
function stripStyles(v:any):any{if(Array.isArray(v)){v.forEach(stripStyles);return v}if(v&&typeof v==='object'){delete v.style;Object.values(v).forEach(stripStyles)}return v}

async function accessFor(env:Env,id:number){const admin=isAdmin(env,id),r=await stateCall(env,'/employee?id='+id),employee:Employee|null=r.employee||null;return{allowed:admin||!!(employee&&employee.status==='active'),admin,employee}}
function adminIds(env:Env){return String(env.ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)}function isAdmin(env:Env,id:number){return adminIds(env).includes(String(id))}
async function stateCall(env:Env,path:string,method='GET',body?:unknown){const id=env.STATE.idFromName('global'),stub=env.STATE.get(id),init:any={method,headers:{'content-type':'application/json'}};if(body!==undefined)init.body=JSON.stringify(body);const r=await stub.fetch('https://state.local'+path,init);return await r.json() as any}
async function getUi(env:Env,id:number){return (await stateCall(env,'/ui?id='+id)).ui||null}async function setUi(env:Env,id:number,messageId:number){await stateCall(env,'/ui','POST',{id,messageId,screen:'menu'})}

async function tgTimeout(token:string,method:string,body:any,ms:number){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:c.signal}),x:any=await r.json();if(!r.ok||!x.ok)throw new Error(x?.description||'Telegram API error');return x}finally{clearTimeout(t)}}
function displayName(u:TgUser){return[u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||('ID '+u.id)}function esc(x:any){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
async function signLaunch(user:TgUser,token:string){const payload={id:user.id,first_name:user.first_name||'',last_name:user.last_name||'',username:user.username||'',exp:Math.floor(Date.now()/1000)+12*60*60},body=b64(new TextEncoder().encode(JSON.stringify(payload))),sig=hex(await hmac(new TextEncoder().encode(token),new TextEncoder().encode('launch:'+body)));return body+'.'+sig}async function hmac(key:BufferSource,data:BufferSource){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data))}function hex(a:Uint8Array){return[...a].map(x=>x.toString(16).padStart(2,'0')).join('')}function b64(a:Uint8Array){let s='';a.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}function safeEq(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
