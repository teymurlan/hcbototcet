import defects, { AppState } from './staff-defects-performance';
import type { Env } from './staff-defects-performance';
import { STAFF_MIRA_STYLE_APP } from './staff-mira-style-ui';

export { AppState };
export type { Env } from './staff-defects-performance';

const BUILD='staff-mira-style-2026-09-16-a';

export default {
  async fetch(req:Request,env:Env,ctx?:ExecutionContext):Promise<Response>{
    const u=new URL(req.url);
    if(req.method==='GET'&&u.pathname==='/__hc_staff_version'){
      const base=await defects.fetch(req,env,ctx as any).catch(()=>null);
      let info:any={};
      try{if(base)info=await base.json()}catch{}
      return J({...info,ok:true,build:BUILD,visual_style:'mira-inspired',logic_unchanged:true,floating_nav:true});
    }
    if(req.method==='GET'&&['/staff','/staff/','/admin'].includes(u.pathname))return html(STAFF_MIRA_STYLE_APP);
    return defects.fetch(req,env,ctx as any);
  },
  async scheduled(controller:any,env:Env,ctx:ExecutionContext):Promise<void>{
    return defects.scheduled(controller,env,ctx);
  }
};

function J(v:any,status=200){return new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function html(s:string){return new Response(s,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})}
