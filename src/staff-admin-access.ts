import operations, { AppState as OperationsAppState } from './staff-operations-safe';
import type { Env } from './staff-operations-safe';
import { STAFF_ADMIN_ACCESS_APP } from './staff-admin-access-ui';

export type { Env } from './staff-operations-safe';

const BUILD = 'staff-admin-access-2026-09-16-a';

type AdminGrant = {
  id:number;
  name:string;
  active:boolean;
  added_at:number;
  added_by:number;
  had_employee:boolean;
  previous_name?:string;
  previous_role?:string;
  previous_status?:string;
  previous_added_at?:number;
};

export class AppState extends OperationsAppState {
  async fetch(req:Request):Promise<Response> {
    const u=new URL(req.url);

    // One-time safety migration: old single-report drafts are moved to the
    // correct order-scoped bucket and then deleted, so they can never leak
    // into a second parallel report for the same lead cleaner.
    if (req.method==='GET' && ['/opsmulti/jobs','/opsmulti/job','/opsmulti/drafts'].includes(u.pathname)) {
      const id=positiveInt(u.searchParams.get('id'));
      if (id) await this.safeLegacyDraftMigration(id);
    }

    if (u.pathname==='/opsadmin/admins' && req.method==='GET') {
      const rows=await this.state.storage.list<AdminGrant>({prefix:'opsadmin:admin:'});
      const admins=[...rows.values()].filter(v=>v&&v.active!==false).sort((a,b)=>Number(a.added_at||0)-Number(b.added_at||0));
      return J({ok:true,admins});
    }

    if (u.pathname==='/opsadmin/admin' && req.method==='POST') {
      const x:any=await readBody(req),action=clean(x.action,20),id=positiveInt(x.id);
      if (!id) return J({ok:false,error:'Некорректный Telegram ID'},400);
      const key=`opsadmin:admin:${id}`;
      if (action==='grant') {
        const record:AdminGrant={
          id,
          name:clean(x.name,120)||`Admin ${id}`,
          active:true,
          added_at:Number(x.added_at||Date.now()),
          added_by:positiveInt(x.added_by),
          had_employee:!!x.had_employee,
          previous_name:clean(x.previous_name,120),
          previous_role:clean(x.previous_role,80),
          previous_status:clean(x.previous_status,30),
          previous_added_at:Number(x.previous_added_at||0)||undefined,
        };
        await this.state.storage.put(key,record);
        await this.writeAdminAudit('grant',record,positiveInt(x.added_by));
        return J({ok:true,admin:record});
      }
      if (action==='revoke') {
        const old=await this.state.storage.get<AdminGrant>(key)||null;
        await this.state.storage.delete(key);
        if (old) await this.writeAdminAudit('revoke',old,positiveInt(x.removed_by));
        return J({ok:true,admin:old});
      }
      return J({ok:false,error:'Неизвестное действие'},400);
    }

    return super.fetch(req);
  }

  private async safeLegacyDraftMigration(id:number) {
    const legacy:any=await this.state.storage.get(`job:${id}`);
    const order=clean(legacy?.booking_order_number,120);
    if (!legacy || legacy.stage==='done' || !order) return;
    const marker=`opsadmin:legacy-drafts-safe:${id}:${encodeURIComponent(order)}`;
    if (await this.state.storage.get(marker)) return;

    for (const stage of ['before','after']) {
      const oldKey=`draft:${id}:${stage}`;
      const scopedKey=`opsmulti:draft:${id}:${encodeURIComponent(order)}:${stage}`;
      const old=await this.state.storage.get<any[]>(oldKey)||[];
      const scoped=await this.state.storage.get<any[]>(scopedKey)||[];
      if (old.length && !scoped.length) await this.state.storage.put(scopedKey,old);
      if (old.length) {
        const verified=await this.state.storage.get<any[]>(scopedKey)||[];
        if (verified.length) await this.state.storage.delete(oldKey);
      }
    }
    await this.state.storage.put(marker,{order,job_id:clean(legacy.id,180),at:Date.now()});
  }

  private async writeAdminAudit(action:string,admin:AdminGrant,actor:number) {
    const at=Date.now(),key=`opsadmin:audit:${String(at).padStart(13,'0')}:${crypto.randomUUID()}`;
    await this.state.storage.put(key,{action,admin_id:admin.id,admin_name:admin.name,actor_id:actor,at,created_at:new Date(at).toISOString()});
  }
}

export default {
  async fetch(req:Request,env:Env,ctx?:ExecutionContext):Promise<Response> {
    const u=new URL(req.url),effective=await withDelegatedAdmins(env);

    if (req.method==='GET' && u.pathname==='/__hc_staff_version') {
      return J({ok:true,build:BUILD,staff:true,parallel_reports:true,subscription_visit_cards:true,delegated_admins:true,owner_only_admin_management:true,legacy_draft_migration_safe:true});
    }
    if (req.method==='GET' && ['/staff','/staff/','/admin'].includes(u.pathname)) return html(STAFF_ADMIN_ACCESS_APP);
    if (req.method==='GET' && u.pathname==='/api/state') return stateWithRole(req,env,effective,ctx);
    if (u.pathname==='/api/staff/admins' && (req.method==='GET'||req.method==='POST')) return adminsApi(req,env,effective,ctx);

    return operations.fetch(req,effective,ctx as any);
  },

  async scheduled(controller:any,env:Env,ctx:ExecutionContext):Promise<void> {
    const effective=await withDelegatedAdmins(env);
    return operations.scheduled(controller,effective,ctx);
  }
};

async function withDelegatedAdmins(env:Env):Promise<Env> {
  const owners=ownerIds(env),data=await stateCall(env,'/opsadmin/admins').catch(()=>({admins:[]})),delegated=(data.admins||[]).filter((x:any)=>x&&x.active!==false).map((x:any)=>String(positiveInt(x.id))).filter((x:string)=>x!=='0');
  const ids=[...new Set(owners.concat(delegated))];
  return {...env,ADMIN_IDS:ids.join(',')} as Env;
}

async function stateWithRole(req:Request,original:Env,effective:Env,ctx?:ExecutionContext) {
  const r=await operations.fetch(req,effective,ctx as any);if(!r.ok)return r;
  const data:any=await r.json().catch(()=>({})),id=positiveInt(data?.employee?.id||data?.user?.id||data?.admin_id||userIdFromHeaders(req)),owner=ownerIds(original).includes(String(id));
  return J({...data,owner,access_role:owner?'owner':data?.admin?'admin':'employee',role_label:owner?'Руководитель':data?.admin?'Администратор':'Сотрудник'});
}

async function adminsApi(req:Request,original:Env,effective:Env,ctx?:ExecutionContext) {
  const auth=await authState(req,effective,ctx);if(!auth.ok)return auth.response;
  if(!auth.admin)return J({ok:false,error:'Раздел доступен только руководителю и администраторам'},403);
  const owner=ownerIds(original).includes(String(auth.userId));

  if(req.method==='GET') {
    const data=await listAdminAccess(original);
    return J({ok:true,owner,access_role:owner?'owner':'admin',...data});
  }

  if(!owner)return J({ok:false,error:'Назначать и снимать администраторов может только руководитель'},403);
  const x:any=await readBody(req),action=clean(x.action,20),target=positiveInt(x.telegram_id||x.id);
  if(!target)return J({ok:false,error:'Укажите корректный Telegram ID'},400);
  if(ownerIds(original).includes(String(target)))return J({ok:false,error:'Этот Telegram ID принадлежит руководителю. Его доступ нельзя изменить из приложения.'},409);

  const list=(await stateCall(original,'/opsadmin/admins').catch(()=>({admins:[]}))).admins||[],existing=list.find((a:any)=>Number(a.id)===target&&a.active!==false)||null;

  if(action==='grant') {
    const name=clean(x.name,120);if(name.length<2)return J({ok:false,error:'Укажите имя администратора'},400);
    if(existing)return J({ok:true,already_admin:true,admin:existing,notified:true});
    if(list.filter((a:any)=>a.active!==false).length>=20)return J({ok:false,error:'Достигнут лимит администраторов'},409);

    const oldData=await stateCall(original,`/employee?id=${target}`).catch(()=>({employee:null})),old=oldData.employee||null;
    const record={
      action:'grant',id:target,name,added_at:Date.now(),added_by:auth.userId,
      had_employee:!!old,previous_name:old?.name||'',previous_role:old?.role||'',previous_status:old?.status||'',previous_added_at:Number(old?.addedAt||0),
    };
    const saved=await stateCall(original,'/opsadmin/admin','POST',record);if(!saved.ok)return J(saved,400);
    const employee={...(old||{}),id:target,name,role:'admin',status:'active',addedAt:Number(old?.addedAt||Date.now())};
    await stateCall(original,'/employee','POST',{action:'upsert',employee});

    const notified=await notifyAdminGranted(original,target,name,new URL(req.url).origin).then(()=>true).catch(()=>false);
    return J({ok:true,admin:saved.admin,notified});
  }

  if(action==='revoke') {
    if(!existing)return J({ok:true,already_revoked:true});
    await stateCall(original,'/opsadmin/admin','POST',{action:'revoke',id:target,removed_by:auth.userId});
    if(existing.had_employee){
      const restored={id:target,name:clean(existing.previous_name,120)||existing.name,role:clean(existing.previous_role,80)||'Клинер',status:['active','blocked'].includes(String(existing.previous_status))?existing.previous_status:'active',addedAt:Number(existing.previous_added_at||Date.now())};
      await stateCall(original,'/employee','POST',{action:'upsert',employee:restored});
    }else{
      await stateCall(original,'/employee','POST',{action:'remove',id:target}).catch(()=>null);
    }
    ctx?.waitUntil?.(notifyAdminRevoked(original,target).catch(()=>null).then(()=>undefined));
    return J({ok:true});
  }

  return J({ok:false,error:'Неизвестное действие'},400);
}

async function listAdminAccess(env:Env) {
  const ownerList=ownerIds(env),data=await stateCall(env,'/opsadmin/admins').catch(()=>({admins:[]})),admins:any[]=(data.admins||[]).filter((a:any)=>a&&a.active!==false&&!ownerList.includes(String(a.id)));
  const owners=await Promise.all(ownerList.map(async raw=>{
    const id=positiveInt(raw),e=await stateCall(env,`/employee?id=${id}`).catch(()=>({employee:null}));
    return{id,name:clean(e.employee?.name,120)||'Руководитель',owner:true,immutable:true};
  }));
  return{owners,admins:admins.map(a=>({id:Number(a.id),name:a.name||`Администратор ${a.id}`,owner:false,added_at:Number(a.added_at||0),added_by:Number(a.added_by||0)}))};
}

async function authState(req:Request,env:Env,ctx?:ExecutionContext) {
  const u=new URL(req.url);u.pathname='/api/state';u.search='';
  const r=await operations.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env,ctx as any);
  let data:any;try{data=await r.clone().json()}catch{return{ok:false,admin:false,userId:0,data:null,response:r}}
  const userId=positiveInt(data?.employee?.id||data?.user?.id||data?.admin_id||userIdFromHeaders(req)),ok=r.ok&&data?.ok!==false&&(!!data?.admin||!!userId);
  return{ok,admin:!!data?.admin,userId,data,response:ok?J(data):r};
}

async function notifyAdminGranted(env:Env,id:number,name:string,origin:string) {
  const token=String((env as any).TELEGRAM_BOT_TOKEN||'');if(!token)return null;
  return tg(env,'sendMessage',{chat_id:id,text:`✅ <b>Вам выдан доступ администратора HOUSE CLEANING STAFF</b>\n\n${esc(name)}, теперь вы можете управлять заказами, сотрудниками, фотоотчётами, графиком и финансами.\n\nНазначать других администраторов может только руководитель.`,parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'📲 Открыть кабинет администратора',web_app:{url:`${origin}/staff`}}]]}});
}
async function notifyAdminRevoked(env:Env,id:number){const token=String((env as any).TELEGRAM_BOT_TOKEN||'');if(!token)return null;return tg(env,'sendMessage',{chat_id:id,text:'ℹ️ Административный доступ к HOUSE CLEANING STAFF снят руководителем.'})}
async function tg(env:Env,method:string,body:any){const token=String((env as any).TELEGRAM_BOT_TOKEN||'');if(!token)return null;const c=new AbortController(),tm=setTimeout(()=>c.abort(),9000);try{const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:c.signal}),x:any=await r.json().catch(()=>({}));if(!r.ok||!x.ok)throw Error(x.description||'Telegram API error');return x.result}finally{clearTimeout(tm)}}

async function stateCall(env:Env,path:string,method='GET',body?:any){const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id),init:RequestInit={method,headers:body===undefined?undefined:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)};const r=await stub.fetch('https://state.local'+path,init);return await r.json().catch(()=>({}))}
function ownerIds(env:Env){return String((env as any).ADMIN_IDS||'').split(',').map((x:string)=>x.trim()).filter(Boolean)}
function userIdFromHeaders(req:Request){const launch=req.headers.get('X-App-Launch-Token')||'';try{const p=launch.split('.')[0];if(p){const s=p.replace(/-/g,'+').replace(/_/g,'/'),j=JSON.parse(atob(s+'='.repeat((4-s.length%4)%4)));return positiveInt(j?.id)}const init=req.headers.get('X-Telegram-Init-Data')||'';return positiveInt(JSON.parse(new URLSearchParams(init).get('user')||'{}')?.id)}catch{return 0}}
function clean(v:any,n=500){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n)}
function positiveInt(v:any){const n=Number(v);return Number.isInteger(n)&&n>0?n:0}
function esc(v:any){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
async function readBody(req:Request){try{return await req.json()}catch{return{}}}
function J(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function html(s:string){return new Response(s,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer','permissions-policy':'camera=(self), geolocation=(self)'}})}
