import staffV1, { AppState as BaseAppState } from './staff-v1';
import type { Env } from './staff-v1';

export type { Env } from './staff-v1';
export class AppState extends BaseAppState {}

type TgUser={id:number;first_name?:string;last_name?:string;username?:string};
type Employee={id:number;name:string;role?:string;status?:string};
const API=(t:string)=>`https://api.telegram.org/bot${t}`;
const BUILD='staff-v2-2026-09-16-a';

export default {
  async fetch(req:Request, env:Env, ctx?:ExecutionContext):Promise<Response>{
    const u=new URL(req.url);

    if(req.method==='GET' && u.pathname==='/__hc_staff_version'){
      return json({ok:true,build:BUILD,staff:true,entry:'/staff',legacy:'/legacy-admin'});
    }

    if(req.method==='POST' && u.pathname==='/webhook'){
      const secret=String((env as any).TELEGRAM_WEBHOOK_SECRET||'');
      if(secret&&!safeEq(req.headers.get('X-Telegram-Bot-Api-Secret-Token')||'',secret)) return new Response('Unauthorized',{status:401});
      const copy=req.clone();let up:any;try{up=await req.json()}catch{return staffV1.fetch(copy,env,ctx as any)}
      const m=up?.message,user:TgUser|undefined=m?.from;
      const cmd=String(m?.text||'').trim().replace(/@\w+$/,'').toLowerCase();
      if(user?.id&&m?.chat?.id&&(['/start','/menu'].includes(cmd))){
        const access=await accessFor(env,user.id);
        if(access.allowed){
          const launch=await signLaunch(user,String((env as any).TELEGRAM_BOT_TOKEN||''));
          const staffUrl=`${u.origin}/staff?launch=${encodeURIComponent(launch)}`;
          const reportsUrl=`${u.origin}/?launch=${encodeURIComponent(launch)}`;
          const label=access.admin?'Открыть кабинет руководителя':'Открыть рабочий кабинет';
          const text=access.admin
            ?'🏢 <b>HOUSE CLEANING STAFF</b>\n\nГлавный внутренний кабинет: заказы, сотрудники, фотоотчёты и контроль работы.'
            :'🧹 <b>HOUSE CLEANING STAFF</b>\n\nВаши задания, фотоотчёты и рабочий кабинет.';
          await tg(env,'sendMessage',{chat_id:m.chat.id,text,parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:`📲 ${label}`,web_app:{url:staffUrl}}],[{text:'📸 Фотоотчёты',web_app:{url:reportsUrl}}],[{text:'📋 Правила и регламент',callback_data:'v17:rules'}]]}}).catch(()=>null);
          await tg(env,'setChatMenuButton',{chat_id:m.chat.id,menu_button:{type:'web_app',text:'HOUSE CLEANING STAFF',web_app:{url:staffUrl}}}).catch(()=>null);
          return new Response('OK');
        }
      }
      return staffV1.fetch(copy,env,ctx as any);
    }

    return staffV1.fetch(req,env,ctx as any);
  }
};

async function accessFor(env:Env,id:number){const admin=adminIds(env).includes(String(id));const r=await stateCall(env,`/employee?id=${id}`).catch(()=>({employee:null}));const employee:Employee|null=(r as any).employee||null;return{admin,employee,allowed:admin||!!(employee&&employee.status==='active')}}
function adminIds(env:Env){return String((env as any).ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)}
async function stateCall(env:Env,path:string){const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id);const r=await stub.fetch('https://state.local'+path);return await r.json() as any}
async function tg(env:Env,method:string,body:any){const token=String((env as any).TELEGRAM_BOT_TOKEN||'');if(!token)return null;const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const x:any=await r.json().catch(()=>({}));if(!r.ok||!x.ok)throw new Error(x?.description||'Telegram API error');return x.result}
function safeEq(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
async function signLaunch(user:TgUser,token:string){const payload={id:user.id,first_name:user.first_name||'',last_name:user.last_name||'',username:user.username||'',exp:Math.floor(Date.now()/1000)+12*60*60},body=b64(new TextEncoder().encode(JSON.stringify(payload))),sig=hex(await hmac(new TextEncoder().encode(token),new TextEncoder().encode('launch:'+body)));return body+'.'+sig}
async function hmac(key:BufferSource,data:BufferSource){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data))}
function hex(a:Uint8Array){return[...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
function b64(a:Uint8Array){let s='';a.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function json(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
