import human, { AppState as HumanAppState } from './staff-human-orders';
import type { Env } from './staff-human-orders';

export type { Env } from './staff-human-orders';

const BUILD='staff-clients-2026-09-17-a';
const CLIENT_PREFIX='opsclient:record:';
const IMPORT_META='opsclient:legacy-import-meta';
const IMPORT_AUDIT_PREFIX='opsclient:import-audit:';
const MAX_CLIENTS=500;
const MAX_VISITS_PER_CLIENT=400;
const MAX_SUBSCRIPTIONS_PER_CLIENT=30;

type LegacyVisit={date:string;time:string;address:string;service:string;amount_text:string;amount_rub:number|null;note:string;source_sheet:string;future:boolean};
type SubscriptionSnapshot={address:string;service:string;used:number|null;total:number|null;status:string;as_of:string;source_text:string;needs_review:boolean};
type ClientRecord={
  id:string;name:string;phones:string[];primary_phone:string;addresses:string[];primary_address:string;
  first_visit:string;last_visit:string;visit_count:number;source:string;needs_review:boolean;
  subscription_snapshots:SubscriptionSnapshot[];visits:LegacyVisit[];manager_note:string;
  created_at:number;updated_at:number;imported_at:number;
};
type ImportMeta={source_file:string;schema:string;imported_at:number;imported_by:number;clients:number;created:number;updated:number;visits:number;subscriptions:number;needs_review:number};

export class AppState extends HumanAppState {
  async fetch(req:Request):Promise<Response>{
    const u=new URL(req.url);

    if(u.pathname==='/opsclients/list'&&req.method==='GET'){
      const rows=await this.state.storage.list<ClientRecord>({prefix:CLIENT_PREFIX});
      const clients=[...rows.values()].filter(Boolean).sort((a,b)=>String(b.last_visit||'').localeCompare(String(a.last_visit||''))||a.name.localeCompare(b.name,'ru'));
      const meta=await this.state.storage.get<ImportMeta>(IMPORT_META)||null;
      const summary=u.searchParams.get('summary')==='1';
      return J({ok:true,meta,clients:summary?clients.map(clientSummary):clients});
    }

    if(u.pathname==='/opsclients/get'&&req.method==='GET'){
      const id=cleanId(u.searchParams.get('id'));
      if(!id)return J({ok:false,error:'Клиент не указан'},400);
      const client=await this.state.storage.get<ClientRecord>(CLIENT_PREFIX+id)||null;
      return client?J({ok:true,client}):J({ok:false,error:'Клиент не найден'},404);
    }

    if(u.pathname==='/opsclients/import'&&req.method==='POST'){
      const body:any=await readBody(req),payload=body?.payload||body,actor=positiveInt(body?.actor);
      if(String(payload?.schema||'')!=='house-cleaning-legacy-clients-v1')return J({ok:false,error:'Неверный формат старой базы'},400);
      const sourceFile=clean(payload?.source_file,180)||'legacy.xlsx',raw=Array.isArray(payload?.clients)?payload.clients:[];
      if(!raw.length)return J({ok:false,error:'В файле нет клиентов'},400);
      if(raw.length>MAX_CLIENTS)return J({ok:false,error:'Слишком много клиентов в одном импорте'},413);

      let created=0,updated=0,visits=0,subscriptions=0,needsReview=0;
      const now=Date.now();
      for(const item of raw){
        const row=sanitizeClient(item,now);if(!row)continue;
        const key=CLIENT_PREFIX+row.id,old=await this.state.storage.get<ClientRecord>(key)||null;
        row.manager_note=clean(old?.manager_note,1000)||row.manager_note;
        row.created_at=Number(old?.created_at||now);row.updated_at=now;row.imported_at=now;
        await this.state.storage.put(key,row);
        if(old)updated++;else created++;
        visits+=row.visits.length;subscriptions+=row.subscription_snapshots.length;if(row.needs_review)needsReview++;
      }
      const meta:ImportMeta={source_file:sourceFile,schema:String(payload.schema),imported_at:now,imported_by:actor,clients:created+updated,created,updated,visits,subscriptions,needs_review:needsReview};
      await this.state.storage.put(IMPORT_META,meta);
      await this.state.storage.put(`${IMPORT_AUDIT_PREFIX}${String(now).padStart(13,'0')}:${crypto.randomUUID()}`,meta);
      return J({ok:true,meta});
    }

    if(u.pathname==='/opsclients/update'&&req.method==='POST'){
      const x:any=await readBody(req),id=cleanId(x.id);
      if(!id)return J({ok:false,error:'Клиент не указан'},400);
      const key=CLIENT_PREFIX+id,old=await this.state.storage.get<ClientRecord>(key);
      if(!old)return J({ok:false,error:'Клиент не найден'},404);
      const next:ClientRecord={...old};
      if(x.name!==undefined)next.name=clean(x.name,120)||old.name;
      if(x.primary_phone!==undefined){const p=phone(x.primary_phone);next.primary_phone=p;next.phones=p?[p,...old.phones.filter(v=>v!==p)].slice(0,4):old.phones}
      if(x.primary_address!==undefined){const a=clean(x.primary_address,260);next.primary_address=a||old.primary_address;if(a&&!next.addresses.includes(a))next.addresses=[a,...old.addresses].slice(0,12)}
      if(x.manager_note!==undefined)next.manager_note=clean(x.manager_note,1000);
      if(Array.isArray(x.subscription_snapshots))next.subscription_snapshots=x.subscription_snapshots.slice(0,MAX_SUBSCRIPTIONS_PER_CLIENT).map(sanitizeSubscription).filter(Boolean) as SubscriptionSnapshot[];
      next.needs_review=!!x.needs_review;next.updated_at=Date.now();
      await this.state.storage.put(key,next);
      return J({ok:true,client:next});
    }

    return super.fetch(req);
  }
}

export default {
  async fetch(req:Request,env:Env,ctx?:ExecutionContext):Promise<Response>{
    const u=new URL(req.url);

    if(req.method==='GET'&&u.pathname==='/__hc_staff_version'){
      const base=await human.fetch(req,env,ctx as any).catch(()=>null);let info:any={};try{if(base)info=await base.json()}catch{}
      return J({...info,ok:true,build:BUILD,client_database:true,legacy_client_import:true,legacy_source_private:true,owner_only_client_base:true,subscription_review:true,logic_unchanged:true});
    }

    if(req.method==='GET'&&['/staff','/staff/','/admin'].includes(u.pathname)){
      const r=await human.fetch(req,env,ctx as any);if(!r.ok)return r;
      return html(applyClientsUi(await r.text()));
    }

    if(u.pathname==='/api/staff/clients'&&req.method==='GET'){
      const auth=await ownerAuth(req,env,ctx);if(!auth.ok)return auth.response;
      const id=cleanId(u.searchParams.get('id'));
      if(id){const data=await stateCall(env,`/opsclients/get?id=${encodeURIComponent(id)}`);return J(data,data.ok?200:404)}
      const data=await stateCall(env,'/opsclients/list?summary=1');
      const q=clean(u.searchParams.get('q'),120).toLowerCase();
      if(q&&Array.isArray(data.clients))data.clients=data.clients.filter((c:any)=>[c.name,c.primary_phone,c.primary_address,...(c.addresses||[])].join(' ').toLowerCase().includes(q));
      return J(data);
    }

    if(u.pathname==='/api/staff/clients/import'&&req.method==='POST'){
      const auth=await ownerAuth(req,env,ctx);if(!auth.ok)return auth.response;
      const len=Number(req.headers.get('content-length')||0);if(len>2_000_000)return J({ok:false,error:'Файл импорта слишком большой'},413);
      const payload:any=await readBody(req);
      if(String(payload?.schema||'')!=='house-cleaning-legacy-clients-v1')return J({ok:false,error:'Выбран не тот файл базы'},400);
      const data=await stateCall(env,'/opsclients/import','POST',{payload,actor:auth.userId});
      return J(data,data.ok?200:400);
    }

    if(u.pathname==='/api/staff/clients/update'&&req.method==='POST'){
      const auth=await ownerAuth(req,env,ctx);if(!auth.ok)return auth.response;
      const x:any=await readBody(req),data=await stateCall(env,'/opsclients/update','POST',x);
      return J(data,data.ok?200:400);
    }

    return human.fetch(req,env,ctx as any);
  },
  async scheduled(controller:any,env:Env,ctx:ExecutionContext):Promise<void>{return human.scheduled(controller,env,ctx)}
};

async function ownerAuth(req:Request,env:Env,ctx?:ExecutionContext){
  const u=new URL(req.url);u.pathname='/api/state';u.search='';
  const r=await human.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env,ctx as any);
  let data:any;try{data=await r.clone().json()}catch{return{ok:false,userId:0,response:r}}
  const userId=positiveInt(data?.employee?.id||data?.user?.id||data?.admin_id);
  if(!r.ok||data?.ok===false)return{ok:false,userId,response:r};
  if(!data?.owner)return{ok:false,userId,response:J({ok:false,error:'База клиентов пока доступна только руководителю'},403)};
  return{ok:true,userId,response:J(data)};
}

function sanitizeClient(v:any,now:number):ClientRecord|null{
  const id=cleanId(v?.id);if(!id)return null;
  const phones=uniq((Array.isArray(v?.phones)?v.phones:[]).map(phone).filter(Boolean)).slice(0,4),addresses=uniq((Array.isArray(v?.addresses)?v.addresses:[]).map((x:any)=>clean(x,260)).filter(Boolean)).slice(0,12);
  const visits=(Array.isArray(v?.visits)?v.visits:[]).slice(0,MAX_VISITS_PER_CLIENT).map(sanitizeVisit).filter(Boolean) as LegacyVisit[];
  const subscriptions=(Array.isArray(v?.subscription_snapshots)?v.subscription_snapshots:[]).slice(0,MAX_SUBSCRIPTIONS_PER_CLIENT).map(sanitizeSubscription).filter(Boolean) as SubscriptionSnapshot[];
  const primaryPhone=phone(v?.primary_phone)||phones[0]||'',primaryAddress=clean(v?.primary_address,260)||addresses[0]||'';
  return{id,name:clean(v?.name,120)||'Клиент без имени',phones,primary_phone:primaryPhone,addresses,primary_address:primaryAddress,first_visit:date(v?.first_visit),last_visit:date(v?.last_visit),visit_count:visits.length,source:clean(v?.source,180)||'legacy',needs_review:!!v?.needs_review,subscription_snapshots:subscriptions,visits,manager_note:clean(v?.manager_note,1000),created_at:now,updated_at:now,imported_at:now};
}
function sanitizeVisit(v:any):LegacyVisit|null{const d=date(v?.date);if(!d)return null;return{date:d,time:time(v?.time),address:clean(v?.address,260),service:clean(v?.service,220),amount_text:clean(v?.amount_text,180),amount_rub:money(v?.amount_rub),note:clean(v?.note,500),source_sheet:clean(v?.source_sheet,80),future:!!v?.future}}
function sanitizeSubscription(v:any):SubscriptionSnapshot|null{const asOf=date(v?.as_of);if(!asOf)return null;return{address:clean(v?.address,260),service:clean(v?.service,220),used:smallInt(v?.used),total:smallInt(v?.total),status:clean(v?.status,40)||'unknown',as_of:asOf,source_text:clean(v?.source_text,300),needs_review:!!v?.needs_review}}
function clientSummary(c:ClientRecord){return{id:c.id,name:c.name,primary_phone:c.primary_phone,primary_address:c.primary_address,addresses:c.addresses,first_visit:c.first_visit,last_visit:c.last_visit,visit_count:c.visit_count,needs_review:c.needs_review,subscription_snapshots:c.subscription_snapshots,manager_note:c.manager_note,updated_at:c.updated_at}}

async function stateCall(env:Env,path:string,method='GET',body?:any){const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id),init:RequestInit={method,headers:body===undefined?undefined:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)},r=await stub.fetch('https://state.local'+path,init);return await r.json().catch(()=>({ok:false,error:'Ошибка базы клиентов'}))}
function clean(v:any,n=500){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n)}
function cleanId(v:any){const s=clean(v,80);return/^legacy_[a-f0-9]{8,32}$/i.test(s)?s:''}
function phone(v:any){let s=String(v??'').replace(/\D/g,'');if(s.length===11&&s[0]==='8')s='7'+s.slice(1);if(s.length===10)s='7'+s;return s.length===11&&s[0]==='7'?`+${s}`:''}
function date(v:any){const s=clean(v,20);return/^\d{4}-\d{2}-\d{2}$/.test(s)?s:''}
function time(v:any){const s=clean(v,10);return/^\d{1,2}:\d{2}$/.test(s)?s:''}
function money(v:any){const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=10_000_000?Math.round(n):null}
function smallInt(v:any){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isInteger(n)&&n>=0&&n<=500?n:null}
function positiveInt(v:any){const n=Number(v);return Number.isInteger(n)&&n>0?n:0}
function uniq<T>(xs:T[]){return[...new Set(xs)]}
async function readBody(req:Request){try{return await req.json()}catch{return{}}}
function J(v:any,status=200){return new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function html(s:string){return new Response(s,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})}

const CLIENT_CSS=String.raw`<style>
.hc-clients-entry{width:100%;margin:10px 0 2px;padding:13px 14px;border:1px solid rgba(181,205,236,.8);border-radius:17px;background:linear-gradient(145deg,rgba(255,255,255,.92),rgba(238,247,255,.88));box-shadow:0 6px 18px rgba(35,72,118,.06);display:flex;align-items:center;justify-content:space-between;gap:12px;color:#172235;text-align:left}.hc-clients-entry strong{display:block;font-size:14px}.hc-clients-entry span{display:block;margin-top:2px;color:#718198;font-size:11px}.hc-clients-entry i{font-style:normal;font-size:22px}
.hc-client-page{display:grid;gap:10px}.hc-client-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.hc-client-head h2{margin:0;font-size:22px}.hc-client-back{appearance:none;border:1px solid #d6e3f2;background:rgba(255,255,255,.82);min-height:39px;border-radius:14px;padding:8px 11px;font-weight:800;color:#25415f}.hc-client-actions{display:grid;grid-template-columns:1fr auto;gap:8px}.hc-client-search{min-height:43px;border:1.5px solid #d5e1ef;border-radius:14px;padding:10px 12px;background:#fff;font-size:13px}.hc-client-import{appearance:none;border:0;border-radius:14px;padding:9px 12px;background:linear-gradient(145deg,#3378ff,#2464e8);color:#fff;font-weight:850;font-size:12px}.hc-client-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.hc-client-stat{padding:10px;border-radius:15px;background:rgba(255,255,255,.86);border:1px solid #dbe7f5}.hc-client-stat b{display:block;font-size:18px}.hc-client-stat span{font-size:9.5px;color:#738198}.hc-client-list{display:grid;gap:7px}.hc-client-card{appearance:none;width:100%;text-align:left;padding:10px 11px;border-radius:16px;border:1px solid #dce7f4;background:rgba(255,255,255,.94);box-shadow:0 4px 14px rgba(37,72,116,.045);color:#172235}.hc-client-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.hc-client-card strong{font-size:14px}.hc-client-count{font-size:9.5px;color:#69809b;background:#f1f6fc;border-radius:999px;padding:4px 7px}.hc-client-meta{display:grid;gap:2px;margin-top:5px;font-size:11px;color:#617189;line-height:1.35}.hc-client-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.hc-client-tag{font-size:9px;font-weight:850;border-radius:999px;padding:4px 7px;background:#edf5ff;color:#2365de;border:1px solid #c7dcfb}.hc-client-tag.warn{background:#fff4e5;color:#a56608;border-color:#efd2a4}.hc-client-tag.green{background:#eaf8f1;color:#138453;border-color:#c4e7d4}.hc-client-empty{padding:26px 18px;text-align:center;color:#7a8798;background:rgba(255,255,255,.72);border:1px dashed #cfdeef;border-radius:18px}
.hc-client-sheet{position:fixed;inset:0;z-index:15000;background:rgba(17,29,47,.28);display:grid;align-items:end;opacity:0;pointer-events:none;transition:opacity .18s ease}.hc-client-sheet.on{opacity:1;pointer-events:auto}.hc-client-panel{width:min(720px,100%);max-height:88vh;overflow:auto;margin:auto 0 0;background:#f8fbff;border-radius:28px 28px 0 0;padding:12px 14px calc(20px + env(safe-area-inset-bottom));transform:translateY(18px);transition:transform .22s cubic-bezier(.2,.72,.24,1)}.hc-client-sheet.on .hc-client-panel{transform:none}.hc-client-handle{width:36px;height:4px;border-radius:99px;background:#c9d7e7;margin:0 auto 12px}.hc-client-panel h3{font-size:20px;margin:0}.hc-client-form{display:grid;gap:8px;margin-top:12px}.hc-client-form label{font-size:10px;font-weight:800;color:#687a91}.hc-client-form input,.hc-client-form textarea{width:100%;box-sizing:border-box;border:1.5px solid #d5e1ef;border-radius:13px;background:#fff;padding:9px 11px;font:inherit}.hc-client-form textarea{min-height:74px;resize:vertical}.hc-sub-edit{display:grid;grid-template-columns:1fr 72px 72px;gap:6px;align-items:end;padding:8px;border:1px solid #dce7f4;border-radius:14px;background:#fff}.hc-sub-edit small{display:block;color:#708096;font-size:9px}.hc-sub-edit input{min-width:0}.hc-client-save{min-height:42px;border:0;border-radius:14px;background:linear-gradient(145deg,#3378ff,#2464e8);color:#fff;font-weight:850}.hc-client-close{min-height:40px;border:1px solid #d5e1ef;border-radius:14px;background:#fff;color:#34475f;font-weight:800}
@media(max-width:390px){.hc-client-actions{grid-template-columns:1fr}.hc-client-import{min-height:40px}.hc-client-stats{gap:5px}.hc-client-stat{padding:9px}.hc-sub-edit{grid-template-columns:1fr 64px 64px}}
@media(prefers-reduced-motion:reduce){.hc-client-sheet,.hc-client-panel{transition:none!important}}
</style>`;

const CLIENT_JS=String.raw`<script>
(function(){
  var owner=null,clients=[],meta=null,detail=null;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function headers(){var h={'content-type':'application/json'},t=window.Telegram&&window.Telegram.WebApp;if(t&&t.initData)h['X-Telegram-Init-Data']=t.initData;return h}
  async function api(path,opt){opt=opt||{};var r=await fetch(path,{method:opt.method||'GET',headers:headers(),body:opt.body?JSON.stringify(opt.body):undefined,cache:'no-store'}),x=await r.json().catch(function(){return{ok:false,error:'Некорректный ответ'}});if(!r.ok||x.ok===false)throw Error(x.error||'Ошибка');return x}
  function toast(s,type){if(window.__hcToast)return window.__hcToast(s,type);try{window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.showAlert(s)}catch(e){}}
  function haptic(){try{window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.HapticFeedback&&window.Telegram.WebApp.HapticFeedback.impactOccurred('light')}catch(e){}}
  function isMore(){var on=document.querySelector('#nav button.on');return !!(on&&/Ещё/i.test(on.textContent||''))}
  async function ensureOwner(){if(owner!==null)return owner;try{var x=await api('/api/state');owner=!!x.owner}catch(e){owner=false}return owner}
  async function patchMore(){if(!isMore()||document.getElementById('hcClientsEntry'))return;if(!(await ensureOwner()))return;var main=document.getElementById('main');if(!main)return;var b=document.createElement('button');b.id='hcClientsEntry';b.className='hc-clients-entry';b.innerHTML='<span><strong>Клиенты и абонементы</strong><span>Старая база, история уборок и остатки абонементов</span></span><i>›</i>';main.appendChild(b)}
  function backMore(){var buttons=[].slice.call(document.querySelectorAll('#nav button')),b=buttons.find(function(x){return/Ещё/i.test(x.textContent||'')});if(b)b.click();else location.reload()}
  function fmtDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return s||'—';var p=s.split('-');return p[2]+'.'+p[1]+'.'+p[0]}
  function subTag(c){var s=(c.subscription_snapshots||[])[0];if(!s)return'';var text='Абонемент';if(s.used!=null&&s.total!=null)text+=' '+s.used+'/'+s.total;else if(s.used!=null)text+=' · '+s.used+' использовано';return'<span class="hc-client-tag '+(s.needs_review?'warn':'green')+'">'+esc(text)+'</span>'}
  function renderList(q){var box=document.getElementById('hcClientList');if(!box)return;var term=String(q||'').trim().toLowerCase(),rows=clients.filter(function(c){return!term||[c.name,c.primary_phone,c.primary_address].join(' ').toLowerCase().includes(term)});box.innerHTML=rows.length?rows.map(function(c){return'<button class="hc-client-card" data-client-id="'+esc(c.id)+'"><span class="hc-client-card-top"><strong>'+esc(c.name)+'</strong><span class="hc-client-count">'+Number(c.visit_count||0)+' уборок</span></span><span class="hc-client-meta"><span>'+esc(c.primary_phone||'Телефон не указан')+'</span><span>'+esc(c.primary_address||'Адрес не указан')+'</span><span>Последняя: '+esc(fmtDate(c.last_visit))+'</span></span><span class="hc-client-tags">'+subTag(c)+(c.needs_review?'<span class="hc-client-tag warn">Требует проверки</span>':'')+'</span></button>'}).join(''):'<div class="hc-client-empty">Клиенты не найдены</div>'}
  function renderStats(){var a=document.getElementById('hcClientStats');if(!a)return;var subs=clients.reduce(function(n,c){return n+(c.subscription_snapshots||[]).length},0),review=clients.filter(function(c){return c.needs_review||(c.subscription_snapshots||[]).some(function(s){return s.needs_review})}).length;a.innerHTML='<div class="hc-client-stat"><b>'+clients.length+'</b><span>клиентов</span></div><div class="hc-client-stat"><b>'+subs+'</b><span>абонементов</span></div><div class="hc-client-stat"><b>'+review+'</b><span>проверить</span></div>'}
  async function loadClients(){var list=document.getElementById('hcClientList');if(list)list.innerHTML='<div class="hc-client-empty">Загрузка базы…</div>';try{var x=await api('/api/staff/clients');clients=x.clients||[];meta=x.meta||null;renderStats();renderList(document.getElementById('hcClientSearch')&&document.getElementById('hcClientSearch').value)}catch(e){if(list)list.innerHTML='<div class="hc-client-empty">'+esc(e.message)+'</div>'}}
  function openClients(){haptic();var main=document.getElementById('main');if(!main)return;main.innerHTML='<div class="hc-client-page"><div class="hc-client-head"><button class="hc-client-back" id="hcClientBack">← Ещё</button><h2>Клиенты</h2></div><div class="hc-client-actions"><input id="hcClientSearch" class="hc-client-search" placeholder="Имя, телефон или адрес"><button class="hc-client-import" id="hcClientImport">Импорт старой базы</button><input type="file" id="hcClientFile" accept="application/json,.json" hidden></div><div class="hc-client-stats" id="hcClientStats"></div><div class="hc-client-list" id="hcClientList"></div></div>';try{document.dispatchEvent(new CustomEvent('hc:after-render'))}catch(e){}loadClients()}
  async function importFile(file){if(!file)return;try{var text=await file.text(),payload=JSON.parse(text);if(payload.schema!=='house-cleaning-legacy-clients-v1')throw Error('Это не файл старой базы HOUSE CLEANING');var count=Number(payload.client_count||(payload.clients||[]).length);if(!confirm('Импортировать '+count+' клиентов в STAFF? Существующие записи с теми же ID будут обновлены.'))return;var x=await api('/api/staff/clients/import',{method:'POST',body:payload});toast('Импортировано: '+Number(x.meta&&x.meta.clients||0)+' клиентов','success');await loadClients()}catch(e){toast(e.message||'Ошибка импорта','error')}}
  async function openDetail(id){try{var x=await api('/api/staff/clients?id='+encodeURIComponent(id));detail=x.client;showDetail(detail)}catch(e){toast(e.message,'error')}}
  function showDetail(c){var old=document.getElementById('hcClientSheet');if(old)old.remove();var subs=(c.subscription_snapshots||[]).map(function(s,i){return'<div class="hc-sub-edit" data-sub="'+i+'"><div><b>'+esc(s.address||'Абонемент')+'</b><small>'+esc(s.source_text||s.service||'')+'</small></div><label>Исп.<input type="number" min="0" max="500" data-used value="'+(s.used==null?'':s.used)+'"></label><label>Всего<input type="number" min="0" max="500" data-total value="'+(s.total==null?'':s.total)+'"></label></div>'}).join('')||'<div class="hc-client-empty">Абонементов в старой базе не найдено</div>';var el=document.createElement('div');el.id='hcClientSheet';el.className='hc-client-sheet';el.innerHTML='<div class="hc-client-panel"><div class="hc-client-handle"></div><h3>'+esc(c.name)+'</h3><div class="hc-client-form"><label>Имя<input id="hcEditName" value="'+esc(c.name)+'"></label><label>Телефон<input id="hcEditPhone" value="'+esc(c.primary_phone||'')+'"></label><label>Основной адрес<input id="hcEditAddress" value="'+esc(c.primary_address||'')+'"></label><label>Заметка руководителя<textarea id="hcEditNote">'+esc(c.manager_note||'')+'</textarea></label>'+subs+'<button class="hc-client-save" id="hcClientSave">Сохранить</button><button class="hc-client-close" id="hcClientClose">Закрыть</button></div></div>';document.body.appendChild(el);requestAnimationFrame(function(){el.classList.add('on')})}
  async function saveDetail(){if(!detail)return;var subs=[].slice.call(document.querySelectorAll('#hcClientSheet [data-sub]')).map(function(el){var i=Number(el.getAttribute('data-sub')),base=detail.subscription_snapshots[i]||{},u=el.querySelector('[data-used]').value,t=el.querySelector('[data-total]').value;return Object.assign({},base,{used:u===''?null:Number(u),total:t===''?null:Number(t),needs_review:t===''||u===''})});try{var x=await api('/api/staff/clients/update',{method:'POST',body:{id:detail.id,name:document.getElementById('hcEditName').value,primary_phone:document.getElementById('hcEditPhone').value,primary_address:document.getElementById('hcEditAddress').value,manager_note:document.getElementById('hcEditNote').value,subscription_snapshots:subs,needs_review:false}});detail=x.client;closeDetail();toast('Клиент сохранён','success');await loadClients()}catch(e){toast(e.message,'error')}}
  function closeDetail(){var el=document.getElementById('hcClientSheet');if(!el)return;el.classList.remove('on');setTimeout(function(){el.remove()},190)}
  document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('#hcClientsEntry,#hcClientBack,#hcClientImport,.hc-client-card,#hcClientSave,#hcClientClose');if(!t)return;if(t.id==='hcClientsEntry')openClients();else if(t.id==='hcClientBack')backMore();else if(t.id==='hcClientImport')document.getElementById('hcClientFile').click();else if(t.classList.contains('hc-client-card'))openDetail(t.getAttribute('data-client-id'));else if(t.id==='hcClientSave')saveDetail();else if(t.id==='hcClientClose')closeDetail()},true);
  document.addEventListener('input',function(e){if(e.target&&e.target.id==='hcClientSearch')renderList(e.target.value)},true);
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='hcClientFile'){var f=e.target.files&&e.target.files[0];e.target.value='';importFile(f)}},true);
  document.addEventListener('hc:after-render',function(){requestAnimationFrame(patchMore)},true);document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#nav button'))requestAnimationFrame(function(){requestAnimationFrame(patchMore)})},true);window.addEventListener('pageshow',function(){requestAnimationFrame(patchMore)});requestAnimationFrame(patchMore);
})();
</script>`;

function applyClientsUi(app:string){return app.replace('</head>',CLIENT_CSS+'</head>').replace('</body>',CLIENT_JS+'</body>')}
