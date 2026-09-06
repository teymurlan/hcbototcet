import { APP } from './app-v9';
import photoV8 from './photo-v8';
import type { Env } from './photo-v8';
export { AppState } from './photo-v8';
export type { Env } from './photo-v8';

const API=(t:string)=>`https://api.telegram.org/bot${t}`;

export default {
  async fetch(req:Request, env:Env):Promise<Response>{
    const url=new URL(req.url);
    if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/app')){
      return new Response(APP,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
    }

    if(req.method==='POST'&&(url.pathname==='/api/session/start'||url.pathname==='/api/after')){
      let body:any;
      try{body=await req.clone().json()}catch{return photoV8.fetch(req,env)}
      const realAccuracy=Number(body?.accuracy||0);
      if(Number.isFinite(realAccuracy)&&realAccuracy>150&&realAccuracy<=10000){
        const adjusted={...body,accuracy:149};
        const forwarded=new Request(req.url,{method:'POST',headers:req.headers,body:JSON.stringify(adjusted)});
        const response=await photoV8.fetch(forwarded,env);
        let data:any;
        try{data=await response.clone().json()}catch{return response}
        if(response.ok&&data?.ok&&data?.job){
          if(url.pathname==='/api/session/start'&&data.job.start_location){
            data.job.start_location.accuracy=realAccuracy;
            data.job.gpsWarning=true;
            await saveJob(env,data.job).catch(()=>null);
            data.gps_warning=`GPS приблизительный: ±${Math.round(realAccuracy)} м`;
          }
          if(url.pathname==='/api/after'&&data.job.end_location){
            data.job.end_location.accuracy=realAccuracy;
            data.job.gpsWarning=true;
            await saveJob(env,data.job).catch(()=>null);
            data.flags=Array.isArray(data.flags)?data.flags:[];
            if(!data.flags.includes('низкая точность GPS'))data.flags.push('низкая точность GPS');
            await warnAdmins(env,data.job,realAccuracy).catch(()=>null);
          }
          return new Response(JSON.stringify(data),{status:response.status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
        }
        return response;
      }
    }

    return photoV8.fetch(req,env);
  }
};

async function saveJob(env:Env,job:any){
  const id=env.STATE.idFromName('global'),stub=env.STATE.get(id);
  await stub.fetch('https://state.local/job',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({job})});
}

async function warnAdmins(env:Env,job:any,accuracy:number){
  const admins=String(env.ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
  for(const a of admins){
    await tg(env.TELEGRAM_BOT_TOKEN,'sendMessage',{chat_id:a,text:`⚠️ <b>GPS НИЗКОЙ ТОЧНОСТИ</b>\n\nКлинер: <b>${esc(job.employeeName||job.userId)}</b>\nКлиент: <b>${esc(job.customer||'—')}</b>\nАдрес: ${esc(job.address||'—')}\nТочность финальной геопозиции: <b>±${Math.round(accuracy)} м</b>\n\nОтчёт принят, но местоположение требует внимания.`,parse_mode:'HTML'});
  }
}

async function tg(token:string,method:string,body:any){const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const x:any=await r.json();if(!r.ok||!x.ok)throw new Error(x?.description||'Telegram API error');return x}
function esc(x:any){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
