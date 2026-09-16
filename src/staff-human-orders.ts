import mira, { AppState as MiraAppState } from './staff-mira-style';
import type { Env } from './staff-mira-style';
import { STAFF_HUMAN_ORDER_APP } from './staff-human-orders-ui';
import { applyStaffMotionSystem } from './staff-motion-system';

export type { Env } from './staff-mira-style';

const BUILD='staff-human-orders-2026-09-16-e';
const STAFF_APP=applyStaffMotionSystem(STAFF_HUMAN_ORDER_APP);

type DisplayInput={order_number:string;created_at?:string;createdAt?:string;date?:string;time?:string};
type DisplayMap=Record<string,number>;

export class AppState extends MiraAppState {
  async fetch(req:Request):Promise<Response>{
    const u=new URL(req.url);
    if(u.pathname==='/opshuman/ensure'&&req.method==='POST'){
      const x:any=await readBody(req),raw=Array.isArray(x.orders)?x.orders:[],orders:DisplayInput[]=raw.map((o:any)=>({order_number:cleanOrder(o.order_number),created_at:clean(o.created_at,80),createdAt:clean(o.createdAt,80),date:clean(o.date,20),time:clean(o.time,20)})).filter((o:DisplayInput)=>!!o.order_number).slice(0,1000);
      const rows=await this.state.storage.list<number>({prefix:'opshuman:order:'});
      const out:DisplayMap={};
      let next=Number(await this.state.storage.get<number>('opshuman:next')||0);
      if(!next){for(const value of rows.values())next=Math.max(next,Number(value||0));}
      for(const [key,value] of rows.entries())out[key.slice('opshuman:order:'.length)]=Number(value||0);
      orders.sort((a,b)=>displaySortKey(a).localeCompare(displaySortKey(b))||a.order_number.localeCompare(b.order_number));
      for(const o of orders){
        if(out[o.order_number])continue;
        next+=1;
        out[o.order_number]=next;
        await this.state.storage.put(`opshuman:order:${o.order_number}`,next);
      }
      await this.state.storage.put('opshuman:next',next);
      const labels:DisplayMap={};for(const o of orders)labels[o.order_number]=out[o.order_number];
      return J({ok:true,labels,next});
    }
    return super.fetch(req);
  }
}

export default {
  async fetch(req:Request,env:Env,ctx?:ExecutionContext):Promise<Response>{
    const u=new URL(req.url);
    if(req.method==='GET'&&u.pathname==='/__hc_staff_version'){
      const base=await mira.fetch(req,env,ctx as any).catch(()=>null);let info:any={};try{if(base)info=await base.json()}catch{}
      return J({...info,ok:true,build:BUILD,human_order_numbers:true,compact_order_cards:true,stable_rerender_labels:true,stable_orders_screen:true,standards_motion:true,event_driven_ui:true,no_dom_polling:true,app_motion_system:true,moving_nav_indicator:true,native_toasts:true,screen_motion:true,sheet_motion:true,media_fade:true,reduced_motion:true,logic_unchanged:true});
    }
    if(req.method==='GET'&&['/staff','/staff/','/admin'].includes(u.pathname))return html(STAFF_APP);
    if(req.method==='GET'&&u.pathname==='/api/staff/orders')return enrichOrders(req,env,ctx);
    if(req.method==='GET'&&u.pathname==='/api/staff/order')return enrichOrder(req,env,ctx);
    if(req.method==='GET'&&u.pathname==='/api/staff/order-labels')return orderLabels(req,env,ctx);
    return mira.fetch(req,env,ctx as any);
  },
  async scheduled(controller:any,env:Env,ctx:ExecutionContext):Promise<void>{return mira.scheduled(controller,env,ctx)}
};

async function enrichOrders(req:Request,env:Env,ctx?:ExecutionContext){
  const r=await mira.fetch(req,env,ctx as any);if(!r.ok)return r;
  const data:any=await r.clone().json().catch(()=>null);if(!data||!Array.isArray(data.orders))return r;
  const labels=await ensureLabels(env,data.orders);
  return J({...data,orders:data.orders.map((o:any)=>({...o,display_number:Number(labels[String(o.order_number)]||0),display_customer_name:humanCustomerName(o)}))});
}
async function enrichOrder(req:Request,env:Env,ctx?:ExecutionContext){
  const r=await mira.fetch(req,env,ctx as any);if(!r.ok)return r;
  const data:any=await r.clone().json().catch(()=>null);if(!data||!data.order)return r;
  const labels=await ensureLabels(env,[data.order]);
  return J({...data,order:{...data.order,display_number:Number(labels[String(data.order.order_number)]||0),display_customer_name:humanCustomerName(data.order)}});
}
async function orderLabels(req:Request,env:Env,ctx?:ExecutionContext){
  const u=new URL(req.url);u.pathname='/api/staff/orders';u.search='';
  const r=await mira.fetch(new Request(u.toString(),{method:'GET',headers:req.headers}),env,ctx as any);if(!r.ok)return r;
  const data:any=await r.json().catch(()=>({})),orders=Array.isArray(data.orders)?data.orders:[],labels=await ensureLabels(env,orders);
  return J({ok:true,orders:orders.map((o:any)=>({order_number:String(o.order_number||''),display_number:Number(labels[String(o.order_number)]||0),customer_name:humanCustomerName(o),city:o.city||'',address:o.address||'',apartment:o.apartment||'',service_name:o.service_name||'',status:o.status||'',date:o.date||'',time:o.time||'',phone:o.phone||''}))});
}
async function ensureLabels(env:Env,orders:any[]):Promise<DisplayMap>{
  const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id),payload={orders:(orders||[]).map(o=>({order_number:o?.order_number,created_at:o?.created_at,createdAt:o?.createdAt,date:o?.date,time:o?.time}))};
  const r=await stub.fetch('https://state.local/opshuman/ensure',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),x:any=await r.json().catch(()=>({}));return x.labels||{};
}
function humanCustomerName(o:any){
  const candidates=[o?.customer_name,o?.client_name,o?.contact_name,o?.full_name,o?.customer?.name,o?.client?.name,o?.name];
  for(const value of candidates){const v=clean(value,180);if(v)return v}
  return 'Клиент';
}
function displaySortKey(o:DisplayInput){return clean(o.created_at||o.createdAt,80)||`${clean(o.date,20)}T${clean(o.time,20)}`||o.order_number}
function cleanOrder(v:any){const s=String(v??'').trim();return/^[A-Za-z0-9._-]{3,120}$/.test(s)?s:''}
function clean(v:any,n=500){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n)}
async function readBody(req:Request){try{return await req.json()}catch{return{}}}
function J(v:any,status=200){return new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function html(s:string){return new Response(s,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})}
