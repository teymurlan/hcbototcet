import { APP as APP_V7 } from './app-v7';
import photoV6 from './photo-v6';
import type { Env } from './photo-v6';
export { AppState } from './photo-v6';
export type { Env } from './photo-v6';

type LaunchUser = { id:number; first_name?:string; last_name?:string; username?:string; exp:number };
const API=(t:string)=>`https://api.telegram.org/bot${t}`;

const APP = APP_V7
  .replace("(function(){var T=null,S={job:null,files:[],upload:0,stage:''};", "(function(){var T=null,LAUNCH=new URLSearchParams(location.search).get('launch')||'',S={job:null,files:[],upload:0,stage:''};")
  .replace("function H(){return{'X-Telegram-Init-Data':T&&T.initData?T.initData:''}}", "function H(){return{'X-Telegram-Init-Data':T&&T.initData?T.initData:'','X-App-Launch-Token':LAUNCH}}")
  .replace("if(!T||!T.initData){status('Нет Telegram-сессии'", "if((!T||!T.initData)&&!LAUNCH){status('Нет Telegram-сессии'");

export default {
  async fetch(req:Request, env:Env):Promise<Response>{
    const url=new URL(req.url);
    const origin=url.origin;

    if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/app')){
      return new Response(APP,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
    }

    if(req.method==='POST'&&url.pathname==='/webhook'){
      let update:any;
      try{update=await req.clone().json()}catch{return photoV6.fetch(req,env)}
      const u=update?.message?.from||update?.callback_query?.from;
      if(u?.id&&env.TELEGRAM_BOT_TOKEN){
        const launch=await signLaunch({id:Number(u.id),first_name:u.first_name,last_name:u.last_name,username:u.username,exp:Math.floor(Date.now()/1000)+12*60*60},env.TELEGRAM_BOT_TOKEN);
        const appUrl=`${origin}/?launch=${encodeURIComponent(launch)}`;
        if(update?.message?.chat?.id){
          await tg(env.TELEGRAM_BOT_TOKEN,'setChatMenuButton',{chat_id:update.message.chat.id,menu_button:{type:'web_app',text:'Фотоотчёты',web_app:{url:appUrl}}}).catch(()=>null);
        }
        const forwarded=new Request(req.url,{method:req.method,headers:req.headers,body:JSON.stringify(update)});
        return photoV6.fetch(forwarded,{...env,WEBAPP_URL:appUrl});
      }
      return photoV6.fetch(req,env);
    }

    if(url.pathname.startsWith('/api/')){
      const launch=req.headers.get('X-App-Launch-Token')||'';
      const init=req.headers.get('X-Telegram-Init-Data')||'';
      if(!init&&launch&&env.TELEGRAM_BOT_TOKEN){
        const user=await verifyLaunch(launch,env.TELEGRAM_BOT_TOKEN);
        if(user){
          const synthetic=await makeInitData(user,env.TELEGRAM_BOT_TOKEN);
          const h=new Headers(req.headers);h.set('X-Telegram-Init-Data',synthetic);
          const forwarded=new Request(req,{headers:h});
          const appUrl=`${origin}/?launch=${encodeURIComponent(launch)}`;
          return photoV6.fetch(forwarded,{...env,WEBAPP_URL:appUrl});
        }
      }
      return photoV6.fetch(req,env);
    }

    return photoV6.fetch(req,env);
  }
};

async function signLaunch(user:LaunchUser,token:string){const body=b64(new TextEncoder().encode(JSON.stringify(user)));const sig=hex(await hmac(new TextEncoder().encode(token),new TextEncoder().encode('launch:'+body)));return body+'.'+sig}
async function verifyLaunch(raw:string,token:string):Promise<LaunchUser|null>{try{const [body,sig]=raw.split('.');if(!body||!sig)return null;const expected=hex(await hmac(new TextEncoder().encode(token),new TextEncoder().encode('launch:'+body)));if(!safeEq(sig,expected))return null;const u=JSON.parse(new TextDecoder().decode(unb64(body))) as LaunchUser;if(!u?.id||!u.exp||u.exp<Math.floor(Date.now()/1000))return null;return u}catch{return null}}
async function makeInitData(u:LaunchUser,token:string){const authDate=String(Math.floor(Date.now()/1000));const user=JSON.stringify({id:u.id,first_name:u.first_name||'',last_name:u.last_name||'',username:u.username||''});const data=`auth_date=${authDate}\nuser=${user}`;const secret=await hmac(new TextEncoder().encode('WebAppData'),new TextEncoder().encode(token));const hash=hex(await hmac(secret,new TextEncoder().encode(data)));const p=new URLSearchParams();p.set('auth_date',authDate);p.set('user',user);p.set('hash',hash);return p.toString()}
async function tg(token:string,method:string,body:any){const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const x:any=await r.json();if(!r.ok||!x.ok)throw new Error(x?.description||'Telegram API error');return x}
async function hmac(key:BufferSource,data:BufferSource){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data))}
function hex(a:Uint8Array){return[...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
function safeEq(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function b64(a:Uint8Array){let s='';a.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64(s:string){const x=s.replace(/-/g,'+').replace(/_/g,'/'),p=x+'==='.slice((x.length+3)%4),bin=atob(p),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a}
