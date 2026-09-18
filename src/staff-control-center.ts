import clients, { AppState as ClientsAppState } from './staff-clients';
import type { Env } from './staff-clients';

export type { Env } from './staff-clients';

const BUILD='staff-control-center-2026-09-18-d';
const SETTINGS_KEY='opsnotify:settings';
const TEMPLATES_KEY='opsnotify:templates';
const DASHBOARD_KEY='opsui:dashboard';
const BROADCAST_PREFIX='opsnotify:broadcast:';
const SUB_ALERT_KEY='opsnotify:subscription-alerts';
const MAX_HISTORY=80;
const STORE_NAME='house-cleaning-app-v1';

type NotifySettings={
  new_order:boolean;
  order_changed:boolean;
  order_cancelled:boolean;
  defects:boolean;
  finance_changes:boolean;
  subscriptions:boolean;
};
type TemplateKey='new_order'|'order_changed'|'order_cancelled'|'defects'|'finance_changes'|'subscriptions'|'broadcast';
type NotifyTemplates=Record<TemplateKey,string>;
type DashboardStyle='balanced'|'compact'|'focus';
type UiDensity='comfortable'|'compact';
type UiMotion='gentle'|'full'|'off';
type UiText='normal'|'large';
type UiNav='glass'|'compact';
type UiAccent='blue'|'graphite'|'mint';
type DashboardPreferences={style:DashboardStyle;density:UiDensity;motion:UiMotion;text:UiText;nav:UiNav;accent:UiAccent;updated_at:number};
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
    if(u.pathname==='/opsnotify/subscription-claim'&&req.method==='POST'){
      const x:any=await readBody(req),key=clean(x?.key,280);if(!key)return J({ok:false,error:'key required'},400);
      const now=Date.now(),stored=await this.state.storage.get<Record<string,number>>(SUB_ALERT_KEY)||{},last=Number(stored[key]||0);
      if(last>0)return J({ok:true,claimed:false,last});
      const next:Record<string,number>={};for(const [k,v] of Object.entries(stored)){if(now-Number(v||0)<90*86400000)next[k]=Number(v||0)}
      next[key]=now;await this.state.storage.put(SUB_ALERT_KEY,next);return J({ok:true,claimed:true,at:now});
    }
    if(u.pathname==='/opsnotify/templates'&&req.method==='GET'){
      const stored=await this.state.storage.get<Partial<NotifyTemplates>>(TEMPLATES_KEY)||{};
      return J({ok:true,templates:{...defaultTemplates(),...sanitizeTemplates(stored)},defaults:defaultTemplates(),placeholders:templatePlaceholders()});
    }
    if(u.pathname==='/opsnotify/templates'&&req.method==='POST'){
      const x:any=await readBody(req),next=sanitizeTemplates(x?.templates||x);
      await this.state.storage.put(TEMPLATES_KEY,next);
      return J({ok:true,templates:{...defaultTemplates(),...next},defaults:defaultTemplates(),placeholders:templatePlaceholders()});
    }
    if(u.pathname==='/opsui/dashboard'&&req.method==='GET'){
      const stored=await this.state.storage.get<Partial<DashboardPreferences>>(DASHBOARD_KEY)||{};
      return J({ok:true,preferences:sanitizeDashboard(stored)});
    }
    if(u.pathname==='/opsui/dashboard'&&req.method==='POST'){
      const x:any=await readBody(req),preferences=sanitizeDashboard(x?.preferences||x);
      await this.state.storage.put(DASHBOARD_KEY,preferences);
      return J({ok:true,preferences});
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
      return J({...info,ok:true,build:BUILD,notification_control_center:true,manual_staff_broadcast:true,owner_notification_settings:true,editable_notification_templates:true,notification_template_test:true,dashboard_style_picker:true,app_customization:true,stability_v6:true,automatic_manager_notification_settings:true,subscription_alerts:true,staff_v2:true,logic_unchanged:true});
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
    if(u.pathname==='/api/staff/notification-templates'){
      const auth=await ownerAuth(req,env,ctx);if(!auth.ok)return auth.response;
      if(req.method==='GET')return proxy(await stateRaw(env,'/opsnotify/templates'));
      if(req.method==='POST'){
        const body:any=await readBody(req),next=sanitizeTemplates(body?.templates||body);
        return proxy(await stateRaw(env,'/opsnotify/templates','POST',{templates:next}));
      }
      return J({ok:false,error:'Method not allowed'},405);
    }
    if(u.pathname==='/api/staff/dashboard-preferences'){
      const auth=await ownerAuth(req,env,ctx);if(!auth.ok)return auth.response;
      if(req.method==='GET')return proxy(await stateRaw(env,'/opsui/dashboard'));
      if(req.method==='POST'){
        const body:any=await readBody(req),preferences=sanitizeDashboard(body?.preferences||body);
        return proxy(await stateRaw(env,'/opsui/dashboard','POST',{preferences}));
      }
      return J({ok:false,error:'Method not allowed'},405);
    }
    if(u.pathname==='/api/staff/notification-template-test'&&req.method==='POST'){
      const auth=await ownerAuth(req,env,ctx);if(!auth.ok)return auth.response;
      return sendTemplateTest(req,env,auth.userId);
    }
    if(u.pathname==='/api/staff/notification-broadcasts'&&req.method==='GET'){
      const auth=await ownerAuth(req,env,ctx);if(!auth.ok)return auth.response;
      return proxy(await stateRaw(env,'/opsnotify/broadcast-history'));
    }
    if(u.pathname==='/api/staff/notification-broadcast'&&req.method==='POST'){
      const auth=await ownerAuth(req,env,ctx);if(!auth.ok)return auth.response;
      return sendBroadcast(req,env,auth.userId,ctx);
    }

    if(u.pathname==='/api/staff/payment-details'&&req.method==='POST'){
      const auth=await requestAuth(req,env,ctx);
      if(auth.ok&&!auth.admin){
        const response=await clients.fetch(req,suppressManagerRecipients(env,true),ctx as any);
        if(response.ok&&await managerNotificationEnabled(env,'finance_changes')){
          const who=clean(auth.data?.employee?.name||auth.data?.user?.first_name||auth.data?.employee?.phone||'Сотрудник',120);
          await sendManagerTemplate(env,'finance_changes',{employee:who},new URL(req.url).origin).catch(()=>{});
        }
        return response;
      }
    }

    // Defect delivery can contain a photo and caption produced by the photo flow itself.
    // Keep that delivery untouched when enabled; when disabled only the manager copy is muted.
    if(u.pathname==='/api/before'&&req.method==='POST'&&!await managerNotificationEnabled(env,'defects')){
      return clients.fetch(req,suppressManagerRecipients(env,true),ctx as any);
    }

    return clients.fetch(req,env,ctx as any);
  },

  async scheduled(controller:any,env:Env,ctx:ExecutionContext):Promise<void>{
    const started=Date.now(),waits:Promise<any>[]=[];
    const wrappedCtx:any={
      waitUntil(p:any){const q=Promise.resolve(p);waits.push(q);ctx.waitUntil(q)},
      passThroughOnException(){try{(ctx as any).passThroughOnException?.()}catch{}},
      props:(ctx as any).props,
    };
    await clients.scheduled(controller,suppressManagerRecipients(env,false),wrappedCtx);
    if(waits.length)await Promise.allSettled(waits);
    await deliverEnabledScheduledNotices(env,started).catch(e=>console.error('Manager notification delivery failed',e));
    await deliverSubscriptionAlerts(env).catch(e=>console.error('Subscription notification delivery failed',e));
  }
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

  const templates=await getTemplates(env),text=renderTemplate(templates.broadcast,{title,body,brand:'HOUSE CLEANING STAFF'});
  const origin=new URL(req.url).origin;
  const results=await Promise.allSettled(ids.map(id=>sendTg(env,id,text,origin)));
  const sent=results.filter(r=>r.status==='fulfilled'&&!!r.value).length,failed=ids.length-sent,at=Date.now(),id=crypto.randomUUID();
  const log={id,at,created_by:userId,audience,title,body,requested:ids.length,sent,failed,employee_ids:ids};
  await stateCall(env,'/opsnotify/broadcast-log','POST',log);
  await stateCall(env,'/opsfinal/notice','POST',{audience:'admin',level:failed?'warning':'success',title:'Рассылка отправлена',body:`${title} · доставлено ${sent} из ${ids.length}`,at});
  return J({ok:true,requested:ids.length,sent,failed});
}

async function sendTemplateTest(req:Request,env:Env,userId:number){
  const x:any=await readBody(req),key=clean(x?.key,40) as TemplateKey;
  if(!Object.prototype.hasOwnProperty.call(defaultTemplates(),key))return J({ok:false,error:'Неизвестный шаблон'},400);
  const ids=await adminIds(env),target=userId||ids[0];if(!target)return J({ok:false,error:'Не найден Telegram руководителя'},400);
  const templates=await getTemplates(env),values:any={order:'Заказ #30',date:'18.09.2026',time:'14:30',address:'Санкт-Петербург, Невский проспект, 10',service:'Генеральная уборка',area:'65 м²',employee:'Тестовый сотрудник',client:'Анна',subscription:'Поддерживающая уборка',remaining:'1',title:'Тестовая рассылка',body:'Так будет выглядеть ваше сообщение.',brand:'HOUSE CLEANING STAFF'};
  const text=renderTemplate(templates[key]||defaultTemplates()[key],values);
  await sendTg(env,target,text,new URL(req.url).origin);
  return J({ok:true});
}

async function deliverEnabledScheduledNotices(env:Env,started:number){
  const data=await stateCall(env,'/opsfinal/notices').catch(()=>({notices:[]})),rows:any[]=Array.isArray(data.notices)?data.notices:[];
  const recent=rows.filter(n=>Number(n?.at||0)>=started&&noticeSettingKey(n));
  if(!recent.length)return;
  const settings=await getSettings(env),ids=await adminIds(env);
  if(!ids.length)return;
  for(const n of recent){
    const key=noticeSettingKey(n);if(!key||settings[key]===false)continue;
    const text=await managerNoticeText(env,n,key);
    await Promise.allSettled(ids.map(id=>sendTg(env,id,text,'https://hcbototcet.teymurlannn.workers.dev')));
  }
}

function noticeSettingKey(n:any):keyof NotifySettings|null{
  const title=clean(n?.title,180).toLowerCase();
  if(title.includes('новая заявка'))return'new_order';
  if(title.includes('изменение заказа'))return'order_changed';
  if(title.includes('заказ отменён'))return'order_cancelled';
  if(title.includes('абонемент'))return'subscriptions';
  return null;
}

async function managerNoticeText(env:Env,n:any,key:keyof NotifySettings){
  const number=clean(n?.order_number,120),order=number?await bookingOrder(env,number):null,label=number?await displayOrderLabel(env,order||{order_number:number}):0;
  const short=label?`Заказ #${String(label).padStart(2,'0')}`:(number||'Заказ');
  const templates=await getTemplates(env),template=(templates as any)[key]||defaultTemplates()[key as TemplateKey]||'{body}';
  if(!order)return renderTemplate(template,{order:short,body:clean(n?.body||'Откройте STAFF для деталей.',900),date:'—',time:'—',address:'—',service:'—',area:'',employee:''});
  const date=dmy(order.date),time=clean(order.time,20)||'—',address=addressOf(order),service=clean(order.service_name,160)||'Уборка',area=Number(order.area||0);
  return renderTemplate(template,{order:short,body:clean(n?.body||'',900),date,time,address,service,area:area?`${area} м²`:'',employee:''});
}

async function sendManagerTemplate(env:Env,key:TemplateKey,values:Record<string,any>,origin:string){
  const templates=await getTemplates(env),ids=await adminIds(env);if(!ids.length)return;
  const text=renderTemplate(templates[key]||defaultTemplates()[key],values);
  await Promise.allSettled(ids.map(id=>sendTg(env,id,text,origin)));
}

async function deliverSubscriptionAlerts(env:Env){
  const settings=await getSettings(env);if(settings.subscriptions===false)return;
  const data:any=await stateCall(env,'/opsclients/list?summary=1').catch(()=>({clients:[]})),clientsRows:any[]=Array.isArray(data?.clients)?data.clients:[];
  const candidates:{key:string;client:string;subscription:string;remaining:string;address:string;body:string}[]=[];
  for(const client of clientsRows){
    const subs:any[]=Array.isArray(client?.subscription_snapshots)?client.subscription_snapshots:[];
    for(let i=0;i<subs.length;i++){
      const s=subs[i]||{},used=Number(s.used),total=Number(s.total),hasNumbers=Number.isFinite(used)&&Number.isFinite(total)&&total>=0,remaining=hasNumbers?Math.max(0,total-used):null;
      const review=!!(client?.needs_review||s?.needs_review);
      if(!review&&remaining!==0&&remaining!==1)continue;
      const clientName=clean(client?.name||'Клиент',120),subscription=clean(s?.service||s?.source_text||'Абонемент',180),address=clean(s?.address||client?.primary_address||'Адрес не указан',260);
      const state=review?'review':remaining===0?'empty':'one',fingerprint=[clean(client?.id,160),i,state,hasNumbers?used:'x',hasNumbers?total:'x'].join(':');
      candidates.push({key:fingerprint,client:clientName,subscription,remaining:review?'нужно проверить':String(remaining),address,body:review?'Нужно проверить данные абонемента.':remaining===0?'Абонемент закончился.':'Осталась 1 уборка.'});
    }
  }
  if(!candidates.length)return;
  const ids=await adminIds(env);if(!ids.length)return;
  const templates=await getTemplates(env),template=templates.subscriptions||defaultTemplates().subscriptions,origin='https://hcbototcet.teymurlannn.workers.dev';
  for(const a of candidates.slice(0,40)){
    const claim:any=await stateCall(env,'/opsnotify/subscription-claim','POST',{key:a.key}).catch(()=>({claimed:false}));if(!claim?.claimed)continue;
    const text=renderTemplate(template,{client:a.client,subscription:a.subscription,remaining:a.remaining,address:a.address,body:a.body});
    await Promise.allSettled(ids.map(id=>sendTg(env,id,text,origin)));
    await stateCall(env,'/opsfinal/notice','POST',{audience:'admin',level:'warning',title:'Абонемент требует внимания',body:`${a.client} · ${a.body}`,at:Date.now()}).catch(()=>null);
  }
}

async function displayOrderLabel(env:Env,order:any){
  const n=clean(order?.order_number,120);if(!n)return 0;
  const x=await stateCall(env,'/opshuman/ensure','POST',{orders:[{order_number:n,created_at:order?.created_at,createdAt:order?.createdAt,date:order?.date,time:order?.time}]}).catch(()=>({labels:{}}));
  return Number(x?.labels?.[n]||0);
}
async function bookingOrder(env:Env,n:string){
  const ns:any=(env as any).BOOKING_STORE;if(!ns)return null;const stub=ns.get(ns.idFromName(STORE_NAME)),r=await stub.fetch('https://booking.internal/orders');if(!r?.ok)return null;const x:any=await r.json().catch(()=>({}));return(Array.isArray(x.orders)?x.orders:[]).find((o:any)=>String(o?.order_number||'')===n)||null;
}
function dmy(v:any){const s=clean(v,20);const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);return m?`${m[3]}.${m[2]}.${m[1]}`:s||'—'}
function addressOf(o:any){return[o?.city,o?.address,o?.apartment?`кв./офис ${o.apartment}`:''].filter(Boolean).join(', ')||'Адрес не указан'}

async function requestAuth(req:Request,env:Env,ctx?:ExecutionContext){
  const u=new URL(req.url);u.pathname='/api/state';u.search='';const r=await clients.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env,ctx as any);let data:any;try{data=await r.clone().json()}catch{return{ok:false,admin:false,data:null}}return{ok:r.ok&&data?.ok!==false,admin:!!data?.admin,data};
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

async function getSettings(env:Env):Promise<NotifySettings>{const x=await stateCall(env,'/opsnotify/settings').catch(()=>({settings:{}}));return sanitizeSettings(x?.settings||{})}
async function getTemplates(env:Env):Promise<NotifyTemplates>{const x=await stateCall(env,'/opsnotify/templates').catch(()=>({templates:{}}));return{...defaultTemplates(),...sanitizeTemplates(x?.templates||{})}}
async function managerNotificationEnabled(env:Env,key:keyof NotifySettings){const s=await getSettings(env);return s[key]!==false}

function suppressManagerRecipients(env:Env,hideDelegated:boolean):Env{
  const base:any=env,next:any={...base,ADMIN_IDS:''};
  if(!hideDelegated||!base.STATE)return next as Env;
  const ns:any=base.STATE;
  next.STATE=new Proxy({}, {
    get(_target,prop:any){
      if(prop==='get')return(id:any)=>{
        const stub=ns.get(id);
        return new Proxy({}, {get(_s,p:any){
          if(p==='fetch')return(input:any,init?:any)=>{
            try{const raw=typeof input==='string'?input:input?.url||'';const u=new URL(raw);if(u.pathname==='/opsadmin/admins')return Promise.resolve(J({ok:true,admins:[]}))}catch{}
            return stub.fetch(input,init);
          };
          const value=stub[p];return typeof value==='function'?value.bind(stub):value;
        }});
      };
      const value=ns[prop];return typeof value==='function'?value.bind(ns):value;
    }
  });
  return next as Env;
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

function defaultSettings():NotifySettings{return{new_order:true,order_changed:true,order_cancelled:true,defects:true,finance_changes:true,subscriptions:true}}
function defaultTemplates():NotifyTemplates{return{
  new_order:'🔔 Новая заявка · {order}\n\n📅 {date} · {time}\n📍 {address}\n🧹 {service} · {area}',
  order_changed:'🔄 Заказ изменён · {order}\n\n📅 {date} · {time}\n📍 {address}\n🧹 {service} · {area}',
  order_cancelled:'❌ Заказ отменён · {order}\n\n📅 {date} · {time}\n📍 {address}\n🧹 {service} · {area}',
  defects:'⚠️ Дефект до уборки · {order}\n\n📍 {address}\nКомментарий: {comment}',
  finance_changes:'💳 Изменены реквизиты сотрудника\n\nСотрудник: {employee}\nОткройте STAFF для проверки.',
  subscriptions:'🎫 Абонемент · {client}\n\n{subscription}\nОстаток: {remaining}\n📍 {address}\n\n{body}',
  broadcast:'📣 {title}\n\n{body}\n\n{brand}',
}}
function templatePlaceholders(){return{new_order:['order','date','time','address','service','area','body'],order_changed:['order','date','time','address','service','area','body'],order_cancelled:['order','date','time','address','service','area','body'],defects:['order','address','comment'],finance_changes:['employee'],subscriptions:['client','subscription','remaining','address','body'],broadcast:['title','body','brand']}}
function sanitizeTemplates(v:any):Partial<NotifyTemplates>{const out:Partial<NotifyTemplates>={};for(const k of Object.keys(defaultTemplates()) as TemplateKey[]){if(v?.[k]!==undefined){const s=String(v[k]??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,1800);if(s)out[k]=s}}return out}
function renderTemplate(template:string,values:Record<string,any>){let out=esc(template);for(const [k,v] of Object.entries(values||{})){const safe=esc(v??'');out=out.split(`{${k}}`).join(safe)}return out.replace(/\s+·\s*$/gm,'').replace(/\n{3,}/g,'\n\n').trim()}
function sanitizeSettings(v:any):NotifySettings{const d=defaultSettings();return{new_order:v?.new_order!==undefined?!!v.new_order:d.new_order,order_changed:v?.order_changed!==undefined?!!v.order_changed:d.order_changed,order_cancelled:v?.order_cancelled!==undefined?!!v.order_cancelled:d.order_cancelled,defects:v?.defects!==undefined?!!v.defects:d.defects,finance_changes:v?.finance_changes!==undefined?!!v.finance_changes:d.finance_changes,subscriptions:v?.subscriptions!==undefined?!!v.subscriptions:d.subscriptions}}
function sanitizeDashboard(v:any):DashboardPreferences{const style:DashboardStyle=['balanced','compact','focus'].includes(String(v?.style))?v.style:'balanced',density:UiDensity=['comfortable','compact'].includes(String(v?.density))?v.density:'comfortable',motion:UiMotion=['gentle','full','off'].includes(String(v?.motion))?v.motion:'gentle',text:UiText=['normal','large'].includes(String(v?.text))?v.text:'normal',nav:UiNav=['glass','compact'].includes(String(v?.nav))?v.nav:'glass',accent:UiAccent=['blue','graphite','mint'].includes(String(v?.accent))?v.accent:'blue';return{style,density,motion,text,nav,accent,updated_at:Number(v?.updated_at||Date.now())}}
async function stateCall(env:Env,path:string,method='GET',body?:any){const r=await stateRaw(env,path,method,body);return await r.json().catch(()=>({}))}
async function stateRaw(env:Env,path:string,method='GET',body?:any){const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id);return stub.fetch('https://state.local'+path,{method,headers:body===undefined?undefined:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)})}
async function proxy(r:Response){const x=await r.text();return new Response(x,{status:r.status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function positiveInt(v:any){const n=Number(v);return Number.isInteger(n)&&n>0?n:0}
function smallInt(v:any){const n=Number(v);return Number.isFinite(n)&&n>=0?Math.round(n):0}
function clean(v:any,n=500){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n)}
function esc(v:any){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
async function readBody(req:Request){try{return await req.json()}catch{return{}}}
function J(v:any,status=200){return new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}