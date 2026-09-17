import clients, { AppState as ClientsAppState } from './staff-clients';
import type { Env } from './staff-clients';

export type { Env } from './staff-clients';

const BUILD='staff-control-center-2026-09-17-a';
const SETTINGS_KEY='opsnotify:settings';
const BROADCAST_PREFIX='opsnotify:broadcast:';
const MAX_HISTORY=80;

type NotifySettings={
  new_order:boolean;
  order_changed:boolean;
  order_cancelled:boolean;
  defects:boolean;
  finance_changes:boolean;
};

type BroadcastRecord={
  id:string;at:number;created_at:string;created_by:number;audience:string;title:string;body:string;
  requested:number;sent:number;failed:number;employee_ids:number[];
};

export class AppState extends ClientsAppState {
  async fetch(req:Request):Promise<Response>{
    const u=new URL(req.url);
    if(u.pathname==='/opsnotify/settings'&&req.method==='GET'){
      const stored=await this.state.storage.get<Partial<NotifySettings>>(SETTINGS_KEY)||{};
      return J({ok:true,settings:{...defaultSettings(),...stored}});
    }
    if(u.pathname==='/opsnotify/settings'&&req.method==='POST'){
      const x:any=await readBody(req),next=sanitizeSettings(x?.settings||x);
      await this.state.storage.put(SETTINGS_KEY,next);
      return J({ok:true,settings:next});
    }
    if(u.pathname==='/opsnotify/broadcast-history'&&req.method==='GET'){
      const rows=await this.state.storage.list<BroadcastRecord>({prefix:BROADCAST_PREFIX});
      const history=[...rows.values()].sort((a,b)=>b.at-a.at).slice(0,MAX_HISTORY);
      return J({ok:true,history});
    }
    if(u.pathname==='/opsnotify/broadcast-log'&&req.method==='POST'){
      const x:any=await readBody(req),at=Number(x.at||Date.now()),id=clean(x.id||crypto.randomUUID(),80);
      const row:BroadcastRecord={
        id,at,created_at:new Date(at).toISOString(),created_by:positiveInt(x.created_by),audience:clean(x.audience,30),
        title:clean(x.title,120),body:clean(x.body,1500),requested:smallInt(x.requested),sent:smallInt(x.sent),failed:smallInt(x.failed),
        employee_ids:Array.isArray(x.employee_ids)?x.employee_ids.map(positiveInt).filter(Boolean).slice(0,200):[],
      };
      await this.state.storage.put(`${BROADCAST_PREFIX}${String(at).padStart(13,'0')}:${id}`,row);
      const rows=await this.state.storage.list<BroadcastRecord>({prefix:BROADCAST_PREFIX});
      if(rows.size>MAX_HISTORY){
        const remove=[...rows.entries()].sort((a,b)=>a[1].at-b[1].at).slice(0,rows.size-MAX_HISTORY).map(v=>v[0]);
        if(remove.length)await this.state.storage.delete(remove);
      }
      return J({ok:true,record:row});
    }
    return super.fetch(req);
  }
}

export default {
  async fetch(req:Request,env:Env,ctx?:ExecutionContext):Promise<Response>{
    const u=new URL(req.url);
    if(req.method==='GET'&&u.pathname==='/__hc_staff_version'){
      const base=await clients.fetch(req,env,ctx as any).catch(()=>null);let info:any={};try{if(base)info=await base.json()}catch{}
      return J({...info,ok:true,build:BUILD,notification_control_center:true,manual_staff_broadcast:true,owner_notification_settings:true,logic_unchanged:true});
    }
    if(u.pathname==='/api/staff/notification-settings'){
      const auth=await ownerAuth(req,env,ctx);if(!auth.ok)return auth.response;
      if(req.method==='GET')return proxy(await stateRaw(env,'/opsnotify/settings'));
      if(req.method==='POST'){
        const body:any=await readBody(req),next=sanitizeSettings(body?.settings||body);
        return proxy(await stateRaw(env,'/opsnotify/settings','POST',{settings:next}));
      }
      return J({ok:false,error:'Method not allowed'},405);
    }
    if(u.pathname==='/api/staff/notification-broadcasts'&&req.method==='GET'){
      const auth=await ownerAuth(req,env,ctx);if(!auth.ok)return auth.response;
      return proxy(await stateRaw(env,'/opsnotify/broadcast-history'));
    }
    if(u.pathname==='/api/staff/notification-broadcast'&&req.method==='POST'){
      const auth=await ownerAuth(req,env,ctx);if(!auth.ok)return auth.response;
      return sendBroadcast(req,env,auth.userId,ctx);
    }
    return clients.fetch(req,env,ctx as any);
  },
  async scheduled(controller:any,env:Env,ctx:ExecutionContext):Promise<void>{return clients.scheduled(controller,env,ctx)}
};

async function sendBroadcast(req:Request,env:Env,userId:number,ctx?:ExecutionContext){
  const x:any=await readBody(req),audience=clean(x.audience,30),title=clean(x.title,120),body=clean(x.body,1500);
  if(!['employees','admins','all_team','selected'].includes(audience))return J({ok:false,error:'Выберите получателей'},400);
  if(title.length<2)return J({ok:false,error:'Укажите заголовок рассылки'},400);
  if(body.length<2)return J({ok:false,error:'Напишите текст сообщения'},400);

  const employeesData=await stateCall(env,'/ops3/employees').catch(()=>({employees:[]})),employees:any[]=Array.isArray(employeesData.employees)?employeesData.employees:[];
  const activeEmployees=employees.filter(e=>e&&e.status==='active'&&positiveInt(e.id)).map(e=>positiveInt(e.id));
  const admins=await adminIds(env);
  const allowed=new Set<number>([...activeEmployees,...admins]);
  let ids:number[]=[];
  if(audience==='employees')ids=activeEmployees;
  else if(audience==='admins')ids=admins;
  else if(audience==='all_team')ids=[...activeEmployees,...admins];
  else ids=(Array.isArray(x.employee_ids)?x.employee_ids:[]).map(positiveInt).filter(id=>id&&allowed.has(id));
  ids=[...new Set(ids)].slice(0,200);
  if(!ids.length)return J({ok:false,error:'Нет доступных получателей для рассылки'},400);

  const text=`📣 <b>${esc(title)}</b>\n\n${esc(body)}\n\n<i>HOUSE CLEANING STAFF</i>`;
  const origin=new URL(req.url).origin;
  const results=await Promise.allSettled(ids.map(id=>sendTg(env,id,text,origin)));
  const sent=results.filter(r=>r.status==='fulfilled'&&!!r.value).length,failed=ids.length-sent,at=Date.now(),id=crypto.randomUUID();
  const log={id,at,created_by:userId,audience,title,body,requested:ids.length,sent,failed,employee_ids:ids};
  await stateCall(env,'/opsnotify/broadcast-log','POST',log);
  await stateCall(env,'/opsfinal/notice','POST',{audience:'admin',level:failed?'warning':'success',title:'Рассылка отправлена',body:`${title} · доставлено ${sent} из ${ids.length}`,at});
  return J({ok:true,requested:ids.length,sent,failed});
}

async function ownerAuth(req:Request,env:Env,ctx?:ExecutionContext){
  const u=new URL(req.url);u.pathname='/api/state';u.search='';
  const r=await clients.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env,ctx as any);
  let data:any;try{data=await r.clone().json()}catch{return{ok:false,userId:0,response:r}}
  const userId=positiveInt(data?.employee?.id||data?.user?.id||data?.admin_id);
  if(!r.ok||data?.ok===false)return{ok:false,userId,response:r};
  if(!data?.owner)return{ok:false,userId,response:J({ok:false,error:'Настройки уведомлений доступны только руководителю'},403)};
  return{ok:true,userId,response:J(data)};
}

async function adminIds(env:Env){
  const ids=String((env as any).ADMIN_IDS||'').split(/[;,\s]+/).map(positiveInt).filter(Boolean);
  const delegated=await stateCall(env,'/opsadmin/admins').catch(()=>({admins:[]}));
  for(const a of delegated.admins||[]){const id=positiveInt(a?.id);if(id)ids.push(id)}
  return[...new Set(ids)];
}
async function sendTg(env:Env,id:number,text:string,origin:string){
  const token=String((env as any).TELEGRAM_BOT_TOKEN||'');if(!token||!id)return null;
  const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:id,text,parse_mode:'HTML',disable_web_page_preview:true,reply_markup:{inline_keyboard:[[{text:'Открыть STAFF',web_app:{url:`${origin}/staff`}}]]}})});
  const out:any=await r.json().catch(()=>({}));if(!r.ok||!out.ok)throw Error(out?.description||'Telegram API error');return out.result;
}

function defaultSettings():NotifySettings{return{new_order:true,order_changed:true,order_cancelled:true,defects:true,finance_changes:true}}
function sanitizeSettings(v:any):NotifySettings{const d=defaultSettings();return{new_order:v?.new_order!==undefined?!!v.new_order:d.new_order,order_changed:v?.order_changed!==undefined?!!v.order_changed:d.order_changed,order_cancelled:v?.order_cancelled!==undefined?!!v.order_cancelled:d.order_cancelled,defects:v?.defects!==undefined?!!v.defects:d.defects,finance_changes:v?.finance_changes!==undefined?!!v.finance_changes:d.finance_changes}}
async function stateCall(env:Env,path:string,method='GET',body?:any){const r=await stateRaw(env,path,method,body);return await r.json().catch(()=>({}))}
async function stateRaw(env:Env,path:string,method='GET',body?:any){const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id);return stub.fetch('https://state.local'+path,{method,headers:body===undefined?undefined:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)})}
async function proxy(r:Response){const x=await r.text();return new Response(x,{status:r.status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function positiveInt(v:any){const n=Number(v);return Number.isInteger(n)&&n>0?n:0}
function smallInt(v:any){const n=Number(v);return Number.isFinite(n)&&n>=0?Math.round(n):0}
function clean(v:any,n=500){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n)}
function esc(v:any){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
async function readBody(req:Request){try{return await req.json()}catch{return{}}}
function J(v:any,status=200){return new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
