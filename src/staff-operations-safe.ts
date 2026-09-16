import operations, { AppState as OperationsAppState } from './staff-operations';
import type { Env } from './staff-operations';
import { STAFF_OPERATIONS_SAFE_APP } from './staff-operations-safe-ui';

export type { Env } from './staff-operations';
export class AppState extends OperationsAppState {}

const BUILD = 'staff-operations-parallel-safe-2026-09-16-b';

export default {
  async fetch(req:Request, env:Env, ctx?:ExecutionContext):Promise<Response> {
    const u = new URL(req.url);
    if (req.method === 'GET' && u.pathname === '/__hc_staff_version') {
      return J({
        ok:true,
        build:BUILD,
        staff:true,
        parallel_reports:true,
        order_scoped_drafts:true,
        multipart_boundary_safe:true,
        idempotent_uploads:true,
        accepted_report_stats:true
      });
    }
    if (req.method === 'GET' && ['/staff','/staff/','/admin'].includes(u.pathname)) return html(STAFF_OPERATIONS_SAFE_APP);
    if (req.method === 'GET' && u.pathname === '/api/admin/jobs') return adminJobsSafe(req,env,ctx);
    return operations.fetch(req,env,ctx as any);
  },
  scheduled(controller:any, env:Env, ctx:ExecutionContext):Promise<void> {
    return operations.scheduled(controller,env,ctx);
  }
};

async function adminJobsSafe(req:Request,env:Env,ctx?:ExecutionContext) {
  const r = await operations.fetch(req,env,ctx as any);
  if (!r.ok) return r;
  const data:any = await r.json().catch(()=>({jobs:[]}));
  const jobs:any[] = Array.isArray(data.jobs) ? data.jobs : [];
  const metas = new Map<string,any>();

  await Promise.all(jobs.map(async j => {
    const n = clean(j?.booking_order_number,120);
    if (!n || metas.has(n)) return;
    const x = await stateCall(env,`/ops3/order-meta?number=${encodeURIComponent(n)}`).catch(()=>({meta:null}));
    metas.set(n,x?.meta||null);
  }));

  const enriched = jobs.map(j => {
    const n = clean(j?.booking_order_number,120), m = n ? metas.get(n) : null;
    if (!m) return j;
    const accepted = Number(m.verified_at||0) > 0;
    return {
      ...j,
      staff_verified: accepted || !!j.staff_verified,
      staff_review_status: accepted ? 'accepted' : (j.staff_review_status||''),
      verified_at: accepted ? Number(m.verified_at) : Number(j.verified_at||0)
    };
  });

  const stats = {
    ...(data.stats||{}),
    total: enriched.length,
    active: enriched.filter(j=>j.stage!=='done').length,
    done: enriched.filter(j=>j.stage==='done').length,
    review: enriched.filter(j=>j.stage==='done'&&!j.staff_verified).length
  };
  return J({...data,jobs:enriched,stats});
}

async function stateCall(env:Env,path:string) {
  const id=(env as any).STATE.idFromName('global'),stub=(env as any).STATE.get(id);
  const r=await stub.fetch('https://state.local'+path);
  return await r.json().catch(()=>({}));
}
function clean(v:any,n=500){return String(v??'').trim().slice(0,n)}
function J(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function html(s:string){return new Response(s,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer','permissions-policy':'camera=(self)'}})}
